const app = getApp()
const roomStore = require('../../../utils/group-room-store.js')

// 开关：true = 本地存储 demo 模式，false = 云函数模式
// 与 create.js 保持一致，云开发修好后两个文件一起改成 false
const USE_LOCAL_MODE = true

Page({
  data: {
    statusBarHeight: 20,
    navHeaderStyle: '',
    roomId: '',
    room: null,
    memberSlots: [],
    membersCount: 0,
    statusText: '等待成员加入',
    loading: true,
    cancelling: false
  },

  onLoad(options) {
    this.applyNavMetrics()
    const roomId = (options && options.roomId) || ''
    this.setData({ roomId })
    if (roomId) {
      this.loadRoom(roomId)
    } else {
      this.setData({ loading: false, room: null })
    }
  },

  applyNavMetrics() {
    const nav = app.getNavMetrics ? app.getNavMetrics() : {}
    this.setData({
      statusBarHeight: nav.statusBarHeight || 20,
      navHeaderStyle: nav.navHeaderStyle || ''
    })
  },

  // 加载房间数据
  loadRoom(roomId) {
    if (USE_LOCAL_MODE) {
      this.loadRoomLocal(roomId)
    } else {
      this.loadRoomCloud(roomId)
    }
  },

  // ===== 本地存储模式（demo）=====
  loadRoomLocal(roomId) {
    // 模拟 500ms 网络延迟
    setTimeout(() => {
      const result = roomStore.loadRoom(roomId)
      if (result.ok && result.room) {
        this.applyRoom(result.room)
      } else {
        this.setData({ loading: false, room: null })
      }
    }, 500)
  },

  // ===== 云函数模式（云开发修好后启用）=====
  loadRoomCloud(roomId) {
    if (!app.globalData.cloudReady) {
      this.setData({ loading: false, room: null })
      wx.showToast({ title: '云开发未就绪', icon: 'none' })
      return
    }

    const db = wx.cloud.database()
    db.collection('rooms').where({ roomId }).limit(1).get({
      success: (res) => {
        const list = (res && res.data) || []
        if (list.length === 0) {
          this.setData({ loading: false, room: null })
          return
        }
        this.applyRoom(list[0])
      },
      fail: (err) => {
        console.error('[room] 查询失败', err)
        this.setData({ loading: false, room: null })
        wx.showToast({ title: '房间不存在', icon: 'none' })
      }
    })
  },

  // 渲染房间数据
  applyRoom(room) {
    const members = room.members || []
    const maxMembers = room.maxMembers || 4
    const slots = []
    for (let i = 0; i < maxMembers; i++) {
      if (i === 0) {
        // C-01 只展示 host，其他位都是占位
        slots.push({ isHost: true })
      } else {
        slots.push({ isHost: false })
      }
    }

    let statusText = '等待成员加入'
    if (room.status === 'cancelled') statusText = '已取消'
    else if (room.status === 'active') statusText = '出逃中'
    else if (room.status === 'finished') statusText = '已结束'

    this.setData({
      room,
      memberSlots: slots,
      membersCount: members.length,
      statusText,
      loading: false
    })
  },

  // 复制 roomId
  onCopyRoomId() {
    if (!this.data.room) return
    wx.setClipboardData({
      data: this.data.room.roomId,
      success: () => {
        wx.showToast({ title: '房间号已复制', icon: 'success' })
      }
    })
  },

  // 邀请朋友（C-01 占位）
  onInviteTap() {
    wx.showToast({ title: '邀请功能即将开放', icon: 'none' })
  },

  // 取消组局
  onCancelTap() {
    if (this.data.cancelling) return
    if (!this.data.room) return

    wx.showModal({
      title: '取消组局？',
      content: '成员将收到通知，房间会被关闭',
      confirmText: '取消组局',
      confirmColor: '#E07A5F',
      success: (res) => {
        if (!res.confirm) return
        this.doCancel()
      }
    })
  },

  doCancel() {
    this.setData({ cancelling: true })

    if (USE_LOCAL_MODE) {
      this.doCancelLocal()
    } else {
      this.doCancelCloud()
    }
  },

  // ===== 本地存储模式（demo）=====
  doCancelLocal() {
    setTimeout(() => {
      const result = roomStore.cancelRoom(this.data.room.roomId)
      if (result.ok) {
        wx.showToast({ title: '组局已取消', icon: 'success' })
        setTimeout(() => {
          wx.navigateBack({
            fail: () => wx.switchTab({ url: '/pages/index/index' })
          })
        }, 800)
      } else {
        this.setData({ cancelling: false })
        const msg = this.mapCancelErrMsg(result.errCode)
        wx.showToast({ title: msg, icon: 'none' })
      }
    }, 500)
  },

  // ===== 云函数模式（云开发修好后启用）=====
  doCancelCloud() {
    if (!app.globalData.cloudReady) {
      this.setData({ cancelling: false })
      wx.showToast({ title: '云开发未就绪', icon: 'none' })
      return
    }

    wx.cloud.callFunction({
      name: 'cancelRoom',
      data: { roomId: this.data.room.roomId },
      success: (res) => {
        const result = res && res.result
        if (result && result.ok) {
          wx.showToast({ title: '组局已取消', icon: 'success' })
          setTimeout(() => {
            wx.navigateBack({
              fail: () => wx.switchTab({ url: '/pages/index/index' })
            })
          }, 800)
        } else {
          this.setData({ cancelling: false })
          const msg = this.mapCancelErrMsg(result && result.errCode)
          wx.showToast({ title: msg, icon: 'none' })
        }
      },
      fail: (err) => {
        console.error('[room] cancelRoom 失败', err)
        this.setData({ cancelling: false })
        wx.showToast({ title: '网络不稳定，重试', icon: 'none' })
      }
    })
  },

  mapCancelErrMsg(errCode) {
    switch (errCode) {
      case 'NO_AUTH': return '请重新登录微信'
      case 'ROOM_NOT_FOUND': return '房间不存在'
      case 'NOT_HOST': return '只有发起人可以取消'
      case 'ALREADY_CANCELLED': return '组局已取消'
      case 'DB_ERROR': return '取消失败，重试'
      default: return '取消失败，重试'
    }
  },

  onBackTap() {
    wx.navigateBack({
      fail: () => wx.switchTab({ url: '/pages/index/index' })
    })
  }
})
