// cloudfunctions/submitPlayerReview/index.js
// C-P4: 提交玩家评价
// 入参：{ targetOpenId, roomId, taskId, rating, comment, tags, roomMembers, roomStatus }
// 出参：{ ok: true, trust: {...} } 或 { ok: false, errCode }
//
// 校验链：
//   1. rating 是 1-5 整数
//   2. comment 字符串，trim 后 ≤100 字
//   3. tags 数组，每项 ≤6 字，最多 5 个
//   4. 防自评（targetOpenId === reviewerOpenId）
//   5. reviewer 与 target 是同一 room 成员（roomMembers 由客户端传入，MVP 软校验）
//   6. room 状态为 finished（roomStatus 由客户端传入，MVP 软校验）
//   7. 防重复（同 reviewer+target+room 只能评价一次，服务端硬校验）
//
// 写入 playerReviews 集合，返回更新后的信任分

const cloud = require('wx-server-sdk')
cloud.init({ env: 'dev1-d2gchwpba51a6091b' })

const db = cloud.database()

// 预设评价标签（与 room 页评价 UI 对齐）
var VALID_TAGS = ['准时', '友善', '有趣', '靠谱', '会聊天', '懂拍照']
// 单字数限制
var MAX_TAG_LEN = 6
var MAX_TAGS = 5
var MAX_COMMENT_LEN = 100

exports.main = async (event) => {
  const wxContext = cloud.getWXContext()
  const reviewerOpenId = wxContext && wxContext.OPENID

  if (!reviewerOpenId) {
    return { ok: false, errCode: 'NO_AUTH', errMsg: '无法获取用户身份' }
  }

  event = event || {}
  const targetOpenId = (typeof event.targetOpenId === 'string') ? event.targetOpenId.trim() : ''
  const roomId = (typeof event.roomId === 'string') ? event.roomId.trim() : ''
  const taskId = (typeof event.taskId === 'string') ? event.taskId.trim() : ''
  const rating = event.rating
  const comment = (typeof event.comment === 'string') ? event.comment.trim().slice(0, MAX_COMMENT_LEN) : ''
  const roomMembers = Array.isArray(event.roomMembers) ? event.roomMembers : []
  const roomStatus = (typeof event.roomStatus === 'string') ? event.roomStatus : ''

  // 校验 tags
  var tags = []
  if (Array.isArray(event.tags)) {
    for (var i = 0; i < event.tags.length && tags.length < MAX_TAGS; i++) {
      var t = event.tags[i]
      if (typeof t === 'string' && t.length <= MAX_TAG_LEN && t.trim()) {
        tags.push(t.trim())
      }
    }
  }

  // ===== 校验链 =====

  // 1. rating 1-5 整数
  if (typeof rating !== 'number' || !Number.isInteger(rating) || rating < 1 || rating > 5) {
    return { ok: false, errCode: 'INVALID_PARAM', errMsg: '评分需为 1-5 整数' }
  }

  // 2. targetOpenId 非空
  if (!targetOpenId) {
    return { ok: false, errCode: 'INVALID_PARAM', errMsg: '缺少被评价者' }
  }

  // 3. 防自评
  if (targetOpenId === reviewerOpenId) {
    return { ok: false, errCode: 'SELF_REVIEW_FORBIDDEN', errMsg: '不能评价自己' }
  }

  // 4. 同 room 成员校验（MVP 软校验：客户端传 roomMembers）
  var reviewerInRoom = roomMembers.indexOf(reviewerOpenId) !== -1
  var targetInRoom = roomMembers.indexOf(targetOpenId) !== -1
  if (!reviewerInRoom || !targetInRoom) {
    return { ok: false, errCode: 'NOT_ROOM_MEMBER', errMsg: '评价者或被评价者不在该房间' }
  }

  // 5. room 状态校验（MVP 软校验：客户端传 roomStatus）
  if (roomStatus !== 'finished') {
    return { ok: false, errCode: 'ROOM_NOT_FINISHED', errMsg: '任务未完成，暂不可评价' }
  }

  // 6. 防重复（服务端硬校验：查 playerReviews 集合）
  try {
    const existing = await db.collection('playerReviews')
      .where({
        reviewerOpenId: reviewerOpenId,
        targetOpenId: targetOpenId,
        roomId: roomId
      })
      .limit(1)
      .get()

    if (existing.data && existing.data.length > 0) {
      return { ok: false, errCode: 'ALREADY_REVIEWED', errMsg: '已评价过该搭子' }
    }
  } catch (e) {
    // 集合不存在时 where 会失败，继续尝试 add（add 时若集合不存在也会失败，最终返回 DB_ERROR）
    console.warn('[submitPlayerReview] 查重失败', e)
  }

  // ===== 写入评价 =====
  const now = Date.now()
  const reviewDoc = {
    reviewerOpenId: reviewerOpenId,
    targetOpenId: targetOpenId,
    roomId: roomId,
    taskId: taskId,
    rating: rating,
    comment: comment,
    tags: tags,
    createdAt: now
  }

  try {
    await db.collection('playerReviews').add({ data: reviewDoc })
  } catch (e) {
    console.error('[submitPlayerReview] 写库失败', e)
    return { ok: false, errCode: 'DB_ERROR', errMsg: '评价失败' }
  }

  // ===== 计算被评价者更新后的信任分 =====
  try {
    const allReviews = await db.collection('playerReviews')
      .where({ targetOpenId: targetOpenId })
      .get()

    const reviews = (allReviews.data || []).map(function (r) {
      return { rating: r.rating }
    })
    const trust = computeTrustScore(reviews)
    return { ok: true, trust: trust }
  } catch (e) {
    // 信任分计算失败不影响评价写入，返回默认值
    console.warn('[submitPlayerReview] 信任分计算失败', e)
    return { ok: true, trust: { score: 5.0, count: 0, label: '新手', tier: 'newbie' } }
  }
}

// ===== 信任分计算（与 utils/trust-score.js 同源，云函数内联避免 require 客户端代码）=====
function computeTrustScore(reviews) {
  if (!Array.isArray(reviews) || reviews.length === 0) {
    return { score: 5.0, count: 0, label: '新手', tier: 'newbie' }
  }
  var count = reviews.length
  var sum = 0
  for (var i = 0; i < reviews.length; i++) {
    var r = reviews[i]
    if (r && typeof r.rating === 'number' && Number.isInteger(r.rating) && r.rating >= 1 && r.rating <= 5) {
      sum += r.rating
    } else {
      sum += 5
    }
  }
  var avg = sum / count
  var label = '普通', tier = 'normal'
  if (count < 3) { label = '新手'; tier = 'newbie' }
  else if (avg >= 4.8 && count >= 10) { label = '金牌搭子'; tier = 'gold' }
  else if (avg >= 4.5) { label = '靠谱'; tier = 'reliable' }
  else if (avg < 3.0) { label = '待观察'; tier = 'watch' }
  return { score: Math.round(avg * 10) / 10, count: count, label: label, tier: tier }
}
