// cloudfunctions/reportPlayer/index.js
// C-P4: 举报玩家
// 入参：{ targetOpenId, roomId, reason }
// 出参：{ ok: true, flagged: bool } 或 { ok: false, errCode }
//
// 逻辑：
//   1. 写入 playerReports 集合
//   2. 累计同一 target 3 次举报 → 标记 flagged（影响匹配，等同 watch tier）
//   3. 防重复：同一 reporter 对同一 target 在同一 room 只能举报一次
//
// 防御：reason 非法时默认 '其他'

const cloud = require('wx-server-sdk')
cloud.init({ env: 'dev1-d2gchwpba51a6091b' })

const db = cloud.database()

// 预设举报理由
var VALID_REASONS = ['迟到', '爽约', '骚扰', '其他']
// 累计举报阈值
var FLAG_THRESHOLD = 3

exports.main = async (event) => {
  const wxContext = cloud.getWXContext()
  const reporterOpenId = wxContext && wxContext.OPENID

  if (!reporterOpenId) {
    return { ok: false, errCode: 'NO_AUTH', errMsg: '无法获取用户身份' }
  }

  event = event || {}
  const targetOpenId = (typeof event.targetOpenId === 'string') ? event.targetOpenId.trim() : ''
  const roomId = (typeof event.roomId === 'string') ? event.roomId.trim() : ''
  var reason = (typeof event.reason === 'string') ? event.reason.trim() : ''
  if (VALID_REASONS.indexOf(reason) === -1) {
    reason = '其他'
  }

  // ===== 校验 =====
  if (!targetOpenId) {
    return { ok: false, errCode: 'INVALID_PARAM', errMsg: '缺少被举报者' }
  }

  // 防自举报
  if (targetOpenId === reporterOpenId) {
    return { ok: false, errCode: 'SELF_REPORT_FORBIDDEN', errMsg: '不能举报自己' }
  }

  // 防重复（同 reporter+target+room 只能举报一次）
  try {
    const existing = await db.collection('playerReports')
      .where({
        reporterOpenId: reporterOpenId,
        targetOpenId: targetOpenId,
        roomId: roomId
      })
      .limit(1)
      .get()

    if (existing.data && existing.data.length > 0) {
      return { ok: false, errCode: 'ALREADY_REPORTED', errMsg: '已举报过该搭子' }
    }
  } catch (e) {
    console.warn('[reportPlayer] 查重失败', e)
  }

  // ===== 写入举报 =====
  const now = Date.now()
  const reportDoc = {
    reporterOpenId: reporterOpenId,
    targetOpenId: targetOpenId,
    roomId: roomId,
    reason: reason,
    createdAt: now
  }

  try {
    await db.collection('playerReports').add({ data: reportDoc })
  } catch (e) {
    console.error('[reportPlayer] 写库失败', e)
    return { ok: false, errCode: 'DB_ERROR', errMsg: '举报失败' }
  }

  // ===== 统计累计举报数，判断是否标记 flagged =====
  var flagged = false
  try {
    const allReports = await db.collection('playerReports')
      .where({ targetOpenId: targetOpenId })
      .count()

    var totalCount = (allReports && allReports.total) || 0
    if (totalCount >= FLAG_THRESHOLD) {
      flagged = true
      // 写入 flagged 标记到 players 集合（若存在该玩家档案）
      try {
        const playerRes = await db.collection('players')
          .where({ openId: targetOpenId })
          .limit(1)
          .get()
        if (playerRes.data && playerRes.data.length > 0) {
          await db.collection('players').doc(playerRes.data[0]._id).update({
            data: { flagged: true, flaggedAt: now }
          })
        }
      } catch (e2) {
        // players 集合不存在或更新失败不影响举报成功
        console.warn('[reportPlayer] 标记 flagged 失败', e2)
      }
    }
  } catch (e) {
    // count 失败不影响举报成功，只是无法判断 flagged
    console.warn('[reportPlayer] 统计举报数失败', e)
  }

  return { ok: true, flagged: flagged }
}
