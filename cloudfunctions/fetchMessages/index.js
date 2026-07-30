// cloudfunctions/fetchMessages/index.js
// C-P4: 拉取 room 内聊天消息（支持增量游标）
// 入参：{ roomId, lastCreatedAt? }
//   lastCreatedAt: 可选，增量游标；提供时只返回 createdAt > lastCreatedAt 的消息
// 出参：{ ok: true, messages: [...], hasMore: bool } 或 { ok: false, errCode }
//
// 逻辑：
//   - 按 roomId 过滤 messages 集合
//   - 有 lastCreatedAt → 增量拉取（createdAt > lastCreatedAt）
//   - 按 createdAt 升序，截取最近 PAGE_SIZE 条
//   - hasMore：是否还有更早的历史（本次增量不足时为 false）

const cloud = require('wx-server-sdk')
cloud.init({ env: 'dev1-d2gchwpba51a6091b' })

const db = cloud.database()
const _ = db.command

var PAGE_SIZE = 50

exports.main = async (event) => {
  event = event || {}
  const roomId = (typeof event.roomId === 'string') ? event.roomId.trim() : ''
  const lastCreatedAt = (typeof event.lastCreatedAt === 'number' && event.lastCreatedAt > 0) ? event.lastCreatedAt : 0

  // 防御：roomId 缺失返回空数组，不抛异常
  if (!roomId) {
    return { ok: true, messages: [], hasMore: false }
  }

  try {
    let query = db.collection('messages').where({ roomId: roomId })

    // 增量游标
    if (lastCreatedAt > 0) {
      query = db.collection('messages').where({
        roomId: roomId,
        createdAt: _.gt(lastCreatedAt)
      })
    }

    const res = await query.orderBy('createdAt', 'asc').limit(PAGE_SIZE).get()
    const messages = (res && Array.isArray(res.data)) ? res.data : []

    return {
      ok: true,
      messages: messages,
      hasMore: messages.length >= PAGE_SIZE
    }
  } catch (e) {
    // 集合不存在等异常 → 返回空数组，不阻断 UI
    console.warn('[fetchMessages] 查询失败', e)
    return { ok: true, messages: [], hasMore: false }
  }
}
