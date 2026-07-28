// utils/group-room-store.js
// group-create-01: 本地存储版本的房间数据层（demo 模式）
//
// 设计目的：
// 30 号演示前云开发环境配置有问题，先用本地存储跑通 UI 流程。
// 云开发修好后，把 create.js / room.js 里的 USE_LOCAL_MODE 改成 false 即可切回云函数。
// 云函数代码（cloudfunctions/createRoom、cancelRoom）原样保留，不删除。

const STORAGE_KEY = 'groupRooms'
const OPENID_KEY = 'localHostOpenId'

// 生成本地伪 openid（每个设备一个固定值，模拟云函数 context.OPENID）
function getHostOpenId() {
  let id = ''
  try { id = wx.getStorageSync(OPENID_KEY) } catch (e) {}
  if (!id) {
    id = 'local_' + Date.now() + '_' + Math.floor(Math.random() * 100000)
    try { wx.setStorageSync(OPENID_KEY, id) } catch (e) {}
  }
  return id
}

// 读取所有房间
function loadAllRooms() {
  try {
    const list = wx.getStorageSync(STORAGE_KEY)
    return Array.isArray(list) ? list : []
  } catch (e) {
    return []
  }
}

// 保存所有房间
function saveAllRooms(list) {
  try { wx.setStorageSync(STORAGE_KEY, list) } catch (e) {}
}

// 生成 6 位 roomId（大写字母+数字）
function generateRoomId() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let s = ''
  for (let i = 0; i < 6; i++) {
    s += chars[Math.floor(Math.random() * chars.length)]
  }
  return s
}

// 创建房间
// 入参: { topic: string, maxMembers: number }
// 出参: { ok: true, roomId } 或 { ok: false, errCode, errMsg }
function createRoom(topic, maxMembers) {
  const t = (topic || '').trim()
  if (!t || t.length > 20) {
    return { ok: false, errCode: 'INVALID_PARAM', errMsg: '主题需 1-20 字' }
  }
  if (!Number.isInteger(maxMembers) || maxMembers < 3 || maxMembers > 6) {
    return { ok: false, errCode: 'INVALID_PARAM', errMsg: '人数需 3-6 人' }
  }

  const list = loadAllRooms()

  // roomId 查重（最多 5 次）
  let roomId = ''
  for (let i = 0; i < 5; i++) {
    const candidate = generateRoomId()
    if (!list.some(r => r.roomId === candidate)) {
      roomId = candidate
      break
    }
  }
  if (!roomId) {
    return { ok: false, errCode: 'ROOM_ID_COLLISION', errMsg: '系统繁忙，请重试' }
  }

  const now = Date.now()
  const openId = getHostOpenId()
  const room = {
    roomId,
    topic: t,
    maxMembers,
    hostOpenId: openId,
    members: [
      { openId, nickname: '', joinedAt: now }
    ],
    status: 'waiting',
    createdAt: now,
    updatedAt: now
  }

  list.push(room)
  saveAllRooms(list)
  return { ok: true, roomId }
}

// 加载房间
// 入参: { roomId: string }
// 出参: { ok: true, room } 或 { ok: false, errCode }
function loadRoom(roomId) {
  if (!roomId) return { ok: false, errCode: 'INVALID_PARAM' }
  const list = loadAllRooms()
  const room = list.find(r => r.roomId === roomId)
  if (!room) return { ok: false, errCode: 'ROOM_NOT_FOUND' }
  return { ok: true, room }
}

// 取消房间（只有 host 能取消）
// 入参: { roomId: string }
// 出参: { ok: true } 或 { ok: false, errCode, errMsg }
function cancelRoom(roomId) {
  if (!roomId) return { ok: false, errCode: 'INVALID_PARAM' }
  const list = loadAllRooms()
  const idx = list.findIndex(r => r.roomId === roomId)
  if (idx === -1) return { ok: false, errCode: 'ROOM_NOT_FOUND', errMsg: '房间不存在' }

  const room = list[idx]
  const openId = getHostOpenId()
  if (room.hostOpenId !== openId) {
    return { ok: false, errCode: 'NOT_HOST', errMsg: '只有发起人可以取消组局' }
  }
  if (room.status === 'cancelled') {
    return { ok: false, errCode: 'ALREADY_CANCELLED', errMsg: '组局已取消' }
  }

  room.status = 'cancelled'
  room.updatedAt = Date.now()
  list[idx] = room
  saveAllRooms(list)
  return { ok: true }
}

module.exports = {
  createRoom,
  loadRoom,
  cancelRoom
}
