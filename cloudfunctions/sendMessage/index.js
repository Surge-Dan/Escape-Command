// cloudfunctions/sendMessage/index.js
// C-P4: 发送 room 内聊天消息
// 入参：{ roomId, taskId, content, senderNickname, roomMembers, roomStatus }
//   openId 从云函数上下文取（cloud.getWXContext().OPENID）
// 出参：{ ok: true, message: {...} } 或 { ok: false, errCode, errMsg }
//
// 校验链：
//   1. content 是 1-200 字符串，trim 后非空
//   2. senderOpenId 非空（已登录）
//   3. senderOpenId 是 room 成员（roomMembers 由客户端传入，MVP 软校验）
//   4. room 状态非 finished（roomStatus 由客户端传入，MVP 软校验）
//
// 写入 messages 集合，含 senderNickname 冗余（避免联表）

const cloud = require('wx-server-sdk')
cloud.init({ env: 'dev1-d2gchwpba51a6091b' })

const db = cloud.database()

var MAX_CONTENT_LEN = 200

exports.main = async (event) => {
  const wxContext = cloud.getWXContext()
  const senderOpenId = wxContext && wxContext.OPENID

  if (!senderOpenId) {
    return { ok: false, errCode: 'NO_AUTH', errMsg: '无法获取用户身份' }
  }

  event = event || {}
  const roomId = (typeof event.roomId === 'string') ? event.roomId.trim() : ''
  const taskId = (typeof event.taskId === 'string') ? event.taskId.trim() : ''
  const content = (typeof event.content === 'string') ? event.content : ''
  const senderNickname = (typeof event.senderNickname === 'string') ? event.senderNickname.trim().slice(0, 20) : ''
  const roomMembers = Array.isArray(event.roomMembers) ? event.roomMembers : []
  const roomStatus = (typeof event.roomStatus === 'string') ? event.roomStatus : ''

  // ===== 校验链 =====

  // 1. roomId 非空
  if (!roomId) {
    return { ok: false, errCode: 'INVALID_PARAM', errMsg: '缺少房间号' }
  }

  // 2. content 校验：字符串、trim 后非空、≤200 字
  if (typeof content !== 'string') {
    return { ok: false, errCode: 'INVALID_PARAM', errMsg: '消息内容需为字符串' }
  }
  const trimmedContent = content.trim()
  if (!trimmedContent) {
    return { ok: false, errCode: 'INVALID_PARAM', errMsg: '消息内容不能为空' }
  }
  if (trimmedContent.length > MAX_CONTENT_LEN) {
    return { ok: false, errCode: 'INVALID_PARAM', errMsg: '消息不能超过 ' + MAX_CONTENT_LEN + ' 字' }
  }

  // 3. 同 room 成员校验（MVP 软校验：客户端传 roomMembers）
  if (roomMembers.indexOf(senderOpenId) === -1) {
    return { ok: false, errCode: 'NOT_ROOM_MEMBER', errMsg: '非该房间成员，无法发送消息' }
  }

  // 4. room 状态校验（finished 后禁止发言）
  if (roomStatus === 'finished' || roomStatus === 'cancelled') {
    return { ok: false, errCode: 'ROOM_CLOSED', errMsg: '任务已结束，聊天已关闭' }
  }

  // ===== 写入消息 =====
  const now = Date.now()
  const messageDoc = {
    _id: 'msg_' + now + '_' + Math.floor(Math.random() * 1000000),
    roomId: roomId,
    taskId: taskId,
    senderOpenId: senderOpenId,
    senderNickname: senderNickname,
    content: trimmedContent,
    createdAt: now
  }

  try {
    await db.collection('messages').add({ data: messageDoc })
  } catch (e) {
    console.error('[sendMessage] 写库失败', e)
    return { ok: false, errCode: 'DB_ERROR', errMsg: '发送失败' }
  }

  return { ok: true, message: messageDoc }
}
