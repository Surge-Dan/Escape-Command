// cloudfunctions/cancelRoom/index.js
// group-create-01: host 取消同频组局房间
// 入参：{ roomId: string }
// 出参：{ ok: true } 或 { ok: false, errCode }

const cloud = require('wx-server-sdk')
cloud.init({ env: 'dev1-d2gchwpba51a6091b' })

const db = cloud.database()

exports.main = async (event) => {
  const wxContext = cloud.getWXContext()
  const openId = wxContext && wxContext.OPENID

  if (!openId) {
    return { ok: false, errCode: 'NO_AUTH', errMsg: '无法获取用户身份' }
  }

  const roomId = (event && event.roomId) || ''
  if (typeof roomId !== 'string' || roomId.length === 0) {
    return { ok: false, errCode: 'INVALID_PARAM', errMsg: '缺少 roomId' }
  }

  // 查房间
  let roomList
  try {
    const res = await db.collection('rooms').where({ roomId }).limit(1).get()
    roomList = res && res.data
  } catch (e) {
    console.error('[cancelRoom] 查询失败', e)
    return { ok: false, errCode: 'DB_ERROR', errMsg: '查询失败' }
  }

  if (!roomList || roomList.length === 0) {
    return { ok: false, errCode: 'ROOM_NOT_FOUND', errMsg: '房间不存在' }
  }

  const room = roomList[0]
  if (room.hostOpenId !== openId) {
    return { ok: false, errCode: 'NOT_HOST', errMsg: '只有发起人可以取消组局' }
  }
  if (room.status === 'cancelled') {
    return { ok: false, errCode: 'ALREADY_CANCELLED', errMsg: '组局已取消' }
  }

  // 更新状态
  try {
    await db.collection('rooms').doc(room._id).update({
      data: {
        status: 'cancelled',
        updatedAt: Date.now()
      }
    })
    return { ok: true }
  } catch (e) {
    console.error('[cancelRoom] 更新失败', e)
    return { ok: false, errCode: 'DB_ERROR', errMsg: '取消失败，请重试' }
  }
}
