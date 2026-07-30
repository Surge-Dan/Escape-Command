// cloudfunctions/getPlayerTrust/index.js
// C-P4: 查询玩家信任分
// 入参：{ targetOpenId } 单查 或 { openIds: [...] } 批量查（最多 20 个）
// 出参：{ ok: true, trusts: { [openId]: { score, count, label, tier } } }
//
// 逻辑：查 playerReviews 按 targetOpenId 过滤，调 computeTrustScore
// 防御：openIds 为空/非法/超 20 个截断返回空对象或前 20 个

const cloud = require('wx-server-sdk')
cloud.init({ env: 'dev1-d2gchwpba51a6091b' })

const db = cloud.database()
const _ = db.command

var MAX_BATCH = 20

exports.main = async (event) => {
  event = event || {}

  // 收集要查的 openId 列表
  var openIds = []
  if (Array.isArray(event.openIds)) {
    for (var i = 0; i < event.openIds.length && openIds.length < MAX_BATCH; i++) {
      var id = event.openIds[i]
      if (typeof id === 'string' && id && openIds.indexOf(id) === -1) {
        openIds.push(id)
      }
    }
  } else if (typeof event.targetOpenId === 'string' && event.targetOpenId) {
    openIds.push(event.targetOpenId)
  }

  // 防御：空列表返回空对象
  if (openIds.length === 0) {
    return { ok: true, trusts: {} }
  }

  try {
    // 批量查所有相关评价（用 in 查询）
    const res = await db.collection('playerReviews')
      .where({ targetOpenId: _.in(openIds) })
      .get()

    // 按 targetOpenId 分组
    var grouped = {}
    for (var k = 0; k < openIds.length; k++) {
      grouped[openIds[k]] = []
    }
    var data = res.data || []
    for (var j = 0; j < data.length; j++) {
      var review = data[j]
      var target = review.targetOpenId
      if (grouped.hasOwnProperty(target)) {
        grouped[target].push({ rating: review.rating })
      }
    }

    // 计算每个玩家的信任分
    var trusts = {}
    for (var key in grouped) {
      if (grouped.hasOwnProperty(key)) {
        trusts[key] = computeTrustScore(grouped[key])
      }
    }

    return { ok: true, trusts: trusts }
  } catch (e) {
    console.error('[getPlayerTrust] 查询失败', e)
    // 查询失败返回默认信任分，不阻断客户端匹配
    var fallback = {}
    for (var f = 0; f < openIds.length; f++) {
      fallback[openIds[f]] = { score: 5.0, count: 0, label: '新手', tier: 'newbie' }
    }
    return { ok: true, trusts: fallback }
  }
}

// ===== 信任分计算（与 utils/trust-score.js 同源）=====
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
