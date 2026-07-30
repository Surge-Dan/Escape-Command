// cloudfunctions/getOnlinePlayers/index.js
// D5: 获取在线真实玩家列表
// 入参：{ district, interests, excludeOpenId, limit }
// 出参：{ ok: true, players: [] } 或 { ok: false, errCode }
//
// 查询 players 集合中 online=true 的玩家，支持区/兴趣筛选
// 30 分钟内未活跃的玩家视为离线（lastActiveAt < now - 30min）

const cloud = require('wx-server-sdk')
cloud.init({ env: 'dev1-d2gchwpba51a6091b' })

const db = cloud.database()
const _ = db.command

// 在线超时：30 分钟
var ONLINE_TTL = 30 * 60 * 1000
// 单次查询上限
var MAX_LIMIT = 20

exports.main = async (event) => {
  const wxContext = cloud.getWXContext()
  const callerOpenId = wxContext && wxContext.OPENID

  event = event || {}
  const district = (typeof event.district === 'string') ? event.district : ''
  const interests = (Array.isArray(event.interests)) ? event.interests : []
  const excludeOpenId = event.excludeOpenId || callerOpenId || ''
  const limit = Math.min(Math.max(Number(event.limit) || 10, 1), MAX_LIMIT)

  const now = Date.now()
  const onlineThreshold = now - ONLINE_TTL

  // 构建查询条件
  var query = {
    online: true,
    lastActiveAt: _.gte(onlineThreshold)
  }
  if (excludeOpenId) {
    query.openId = _.neq(excludeOpenId)
  }
  if (district) {
    query.district = district
  }

  try {
    var res = await db.collection('players')
      .where(query)
      .orderBy('lastActiveAt', 'desc')
      .limit(limit)
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

    // 兴趣筛选（云端 where 不支持数组交集，在 JS 层过滤）
    if (interests.length > 0) {
      players = players.filter(function (p) {
        if (!Array.isArray(p.interests) || p.interests.length === 0) return false
        for (var i = 0; i < interests.length; i++) {
          if (p.interests.indexOf(interests[i]) !== -1) return true
        }
        return false
      })
    }

    return { ok: true, players: players }
  } catch (e) {
    console.error('[getOnlinePlayers] 查询失败', e)
    return { ok: false, errCode: 'DB_ERROR', errMsg: '查询失败' }
  }
}
