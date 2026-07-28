// cloudfunctions/createRoom/index.js
// group-create-01: 创建同频组局房间
// 入参：{ topic: string, maxMembers: number }
// 出参：{ ok: true, roomId } 或 { ok: false, errCode }

const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

const ROOM_ID_LENGTH = 6
const ROOM_ID_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
const MAX_RETRY = 5

function generateRoomId() {
  let s = ''
  for (let i = 0; i < ROOM_ID_LENGTH; i++) {
    s += ROOM_ID_CHARS[Math.floor(Math.random() * ROOM_ID_CHARS.length)]
  }
  return s
}

exports.main = async (event) => {
  const wxContext = cloud.getWXContext()
  const openId = wxContext && wxContext.OPENID

  if (!openId) {
    return { ok: false, errCode: 'NO_AUTH', errMsg: '无法获取用户身份' }
  }

  const topic = (event && event.topic) || ''
  const maxMembers = Number(event && event.maxMembers)

  // 参数校验
  if (typeof topic !== 'string' || topic.trim().length === 0 || topic.length > 20) {
    return { ok: false, errCode: 'INVALID_PARAM', errMsg: '主题需 1-20 字' }
  }
  if (!Number.isInteger(maxMembers) || maxMembers < 3 || maxMembers > 6) {
    return { ok: false, errCode: 'INVALID_PARAM', errMsg: '人数需 3-6 人' }
  }

  // roomId 生成 + 查重（最多 5 次）
  let roomId = ''
  for (let i = 0; i < MAX_RETRY; i++) {
    const candidate = generateRoomId()
    try {
      const countRes = await db.collection('rooms').where({ roomId: candidate }).count()
      if (countRes.total === 0) {
        roomId = candidate
        break
      }
    } catch (e) {
      // 集合不存在或查询失败，直接用这个 candidate（首次创建集合时 count 会失败）
      roomId = candidate
      break
    }
  }

  if (!roomId) {
    return { ok: false, errCode: 'ROOM_ID_COLLISION', errMsg: '系统繁忙，请重试' }
  }

  const now = Date.now()
  const roomDoc = {
    roomId,
    topic: topic.trim(),
    maxMembers,
    hostOpenId: openId,
    members: [
      {
        openId,
        nickname: '',  // C-01 暂留空，C-03 再做填昵称流程
        joinedAt: now
      }
    ],
    status: 'waiting',
    createdAt: now,
    updatedAt: now
  }

  try {
    await db.collection('rooms').add({ data: roomDoc })
    return { ok: true, roomId }
  } catch (e) {
    console.error('[createRoom] 写库失败', e)
    return { ok: false, errCode: 'DB_ERROR', errMsg: '创建失败，请重试' }
  }
}
