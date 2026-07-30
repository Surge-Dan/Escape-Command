// cloudfunctions/matchPlayers/index.js
// D5: 服务端匹配真实玩家
// 入参：{ user: { openId, nickname, interests?, district? }, count, filters: { district, interests } }
// 出参：{ ok: true, players: [] } 或 { ok: false, errCode }
//
// 匹配逻辑：
//   1. 查询在线玩家（30 分钟内活跃），排除当前用户
//   2. 按区 + 兴趣优先级排序
//   3. 截取 count 个返回
//   4. 不足 count 时如实返回（客户端用 mock 补齐）

const cloud = require('wx-server-sdk')
cloud.init({ env: 'dev1-d2gchwpba51a6091b' })

const db = cloud.database()
const _ = db.command

var ONLINE_TTL = 30 * 60 * 1000
var MAX_LIMIT = 20

// 兴趣交集判断
function hasInterestOverlap(a, b) {
  if (!a || !b || a.length === 0 || b.length === 0) return false
  for (var i = 0; i < b.length; i++) {
    if (a.indexOf(b[i]) !== -1) return true
  }
  return false
}

// 按相关性排序：district+interests > district > interests > 其他
function rankByRelevance(players, district, interests) {
  return players.sort(function (a, b) {
    var aD = (district && a.district === district) ? 1 : 0
    var bD = (district && b.district === district) ? 1 : 0
    var aI = (interests && interests.length > 0 && hasInterestOverlap(a.interests, interests)) ? 1 : 0
    var bI = (interests && interests.length > 0 && hasInterestOverlap(b.interests, interests)) ? 1 : 0
    return (bD * 2 + bI) - (aD * 2 + aI)
  })
}

exports.main = async (event) => {
  const wxContext = cloud.getWXContext()
  const callerOpenId = (event && event.user && event.user.openId) || (wxContext && wxContext.OPENID) || ''

  event = event || {}
  var filters = event.filters || {}
  var district = filters.district || (event.user && event.user.district) || ''
  var interests = Array.isArray(filters.interests) ? filters.interests : []
  var count = Math.min(Math.max(Number(event.count) || 4, 1), MAX_LIMIT)

  var now = Date.now()
  var onlineThreshold = now - ONLINE_TTL

  // 查询在线玩家（排除当前用户）
  var query = {
    online: true,
    lastActiveAt: _.gte(onlineThreshold)
  }
  if (callerOpenId) {
    query.openId = _.neq(callerOpenId)
  }

  try {
    // 先按区筛选（如果有），取足够多的候选
    var districtQuery = Object.assign({}, query)
    if (district) {
      districtQuery.district = district
    }

    var res = await db.collection('players')
      .where(districtQuery)
      .orderBy('lastActiveAt', 'desc')
      .limit(MAX_LIMIT)
      .get()

    var players = (res.data || []).map(function (p) {
      return {
        openId: p.openId || '',
        nickname: p.nickname || '',
        avatar: p.avatar || '',
        interests: Array.isArray(p.interests) ? p.interests : [],
        district: p.district || '',
        bio: p.bio || ''
      }
    })

    // 如果指定了区但结果不足，补充其他区的在线玩家
    if (district && players.length < count) {
      var otherQuery = Object.assign({}, query)
      delete otherQuery.district
      var otherRes = await db.collection('players')
        .where(otherQuery)
        .orderBy('lastActiveAt', 'desc')
        .limit(MAX_LIMIT)
        .get()
      var otherPlayers = (otherRes.data || []).map(function (p) {
        return {
          openId: p.openId || '',
          nickname: p.nickname || '',
          avatar: p.avatar || '',
          interests: Array.isArray(p.interests) ? p.interests : [],
          district: p.district || '',
          bio: p.bio || ''
        }
      })
      // 去重后合并
      var existingIds = {}
      players.forEach(function (p) { existingIds[p.openId] = true })
      otherPlayers.forEach(function (p) {
        if (!existingIds[p.openId]) {
          players.push(p)
          existingIds[p.openId] = true
        }
      })
    }

    // 按相关性排序
    players = rankByRelevance(players, district, interests)

    // 截取 count 个
    players = players.slice(0, count)

    return { ok: true, players: players }
  } catch (e) {
    console.error('[matchPlayers] 匹配失败', e)
    return { ok: false, errCode: 'DB_ERROR', errMsg: '匹配失败' }
  }
}
