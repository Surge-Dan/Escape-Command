// cloudfunctions/registerPlayer/index.js
// D5: 注册/更新真实玩家档案
// 入参：{ nickname, avatar, interests, district, bio }
// 出参：{ ok: true, player } 或 { ok: false, errCode }
//
// 玩家档案存储在 players 集合，以 openId 为主键
// 每次「摇骰子找搭子」前调用，刷新在线状态和档案

const cloud = require('wx-server-sdk')
cloud.init({ env: 'dev1-d2gchwpba51a6091b' })

const db = cloud.database()

// 兴趣合法取值（与 mock-user-pool 对齐）
var VALID_INTERESTS = ['food', 'nature', 'culture', 'sport', 'photo', 'shopping']

exports.main = async (event) => {
  const wxContext = cloud.getWXContext()
  const openId = wxContext && wxContext.OPENID

  if (!openId) {
    return { ok: false, errCode: 'NO_AUTH', errMsg: '无法获取用户身份' }
  }

  const nickname = (event && typeof event.nickname === 'string') ? event.nickname.trim() : ''
  const avatar = (event && typeof event.avatar === 'string') ? event.avatar : ''
  const district = (event && typeof event.district === 'string') ? event.district : ''
  const bio = (event && typeof event.bio === 'string') ? event.bio.slice(0, 100) : ''

  // 兴趣过滤
  let interests = []
  if (event && Array.isArray(event.interests)) {
    interests = event.interests.filter(function (i) {
      return typeof i === 'string' && VALID_INTERESTS.indexOf(i) !== -1
    }).slice(0, 6)
  }

  const now = Date.now()
  const playerDoc = {
    openId: openId,
    nickname: nickname || ('出逃者' + Math.floor(Math.random() * 10000)),
    avatar: avatar,
    interests: interests,
    district: district,
    bio: bio,
    online: true,
    lastActiveAt: now,
    updatedAt: now
  }

  try {
    // upsert：先查是否存在
    const existing = await db.collection('players').where({ openId: openId }).limit(1).get()
    if (existing.data && existing.data.length > 0) {
      // 更新
      const docId = existing.data[0]._id
      await db.collection('players').doc(docId).update({
        data: {
          nickname: playerDoc.nickname,
          avatar: playerDoc.avatar,
          interests: playerDoc.interests,
          district: playerDoc.district,
          bio: playerDoc.bio,
          online: true,
          lastActiveAt: now,
          updatedAt: now
        }
      })
      return { ok: true, player: playerDoc }
    } else {
      // 新建
      playerDoc.createdAt = now
      await db.collection('players').add({ data: playerDoc })
      return { ok: true, player: playerDoc }
    }
  } catch (e) {
    console.error('[registerPlayer] 写库失败', e)
    // 集合不存在时 add 会失败，返回 ok=false 让客户端降级
    return { ok: false, errCode: 'DB_ERROR', errMsg: '注册失败' }
  }
}
