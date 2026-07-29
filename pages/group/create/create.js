const app = getApp()
const roomStore = require('../../../utils/group-room-store.js')

// 开关：true = 本地存储 demo 模式，false = 云函数模式
// 云开发环境修好后，把这个改成 false 即可切回云函数
const USE_LOCAL_MODE = true

Page({
  data: {
    statusBarHeight: 20,
    navHeaderStyle: '',
    topic: '',
    // 人数选项（v11: 改为对象数组，自定义 picker 用）
    memberOptions: [
      { value: 3, label: '3 人', desc: '含发起人，适合小团体' },
      { value: 4, label: '4 人', desc: '含发起人，轻松组局' },
      { value: 5, label: '5 人', desc: '含发起人，热闹氛围' },
      { value: 6, label: '6 人', desc: '含发起人，多人派对' }
    ],
    maxMembers: 4,  // 默认 4 人
    // v11: 自定义 picker 状态
    showPicker: false,
    tempMembers: 4,
    creating: false
  },

  onLoad() {
    this.applyNavMetrics()
  },

  applyNavMetrics() {
    const nav = app.getNavMetrics ? app.getNavMetrics() : {}
    this.setData({
      statusBarHeight: nav.statusBarHeight || 20,
      navHeaderStyle: nav.navHeaderStyle || ''
    })
  },

  onTopicInput(e) {
    this.setData({ topic: e.detail.value || '' })
  },

  // v11: 自定义 picker - 打开
  onPickerTap() {
    this.setData({
      showPicker: true,
      tempMembers: this.data.maxMembers
    })
  },

  // v11: 自定义 picker - 关闭（取消或点遮罩）
  onPickerClose() {
    this.setData({ showPicker: false })
  },

  // v11: 自定义 picker - 选择选项
  onPickerOptionTap(e) {
    const value = Number(e.currentTarget.dataset.value)
    if (!value) return
    this.setData({ tempMembers: value })
  },

  // v11: 自定义 picker - 确认
  onPickerConfirm() {
    this.setData({
      maxMembers: this.data.tempMembers,
      showPicker: false
    })
  },

  onBackTap() {
    wx.navigateBack({
      fail: () => wx.switchTab({ url: '/pages/index/index' })
    })
  },

  onCreateTap() {
    if (this.data.creating) return

    const topic = (this.data.topic || '').trim()
    const maxMembers = this.data.maxMembers

    // 表单校验
    if (!topic) {
      wx.showToast({ title: '请填写 1-20 字主题', icon: 'none' })
      return
    }
    if (topic.length > 20) {
      wx.showToast({ title: '请填写 1-20 字主题', icon: 'none' })
      return
    }
    if (!maxMembers || maxMembers < 3 || maxMembers > 6) {
      wx.showToast({ title: '3-6 人组局', icon: 'none' })
      return
    }

    this.setData({ creating: true })

    if (USE_LOCAL_MODE) {
      this.createRoomLocal(topic, maxMembers)
    } else {
      this.createRoomCloud(topic, maxMembers)
    }
  },

  // ===== 本地存储模式（demo）=====
  createRoomLocal(topic, maxMembers) {
    // 模拟 800ms 网络延迟，让 loading 效果可见
    setTimeout(() => {
      const result = roomStore.createRoom(topic, maxMembers)
      if (result.ok && result.roomId) {
        wx.redirectTo({
          url: '/pages/group/room/room?roomId=' + result.roomId
        })
      } else {
        this.setData({ creating: false })
        const msg = this.mapErrMsg(result.errCode)
        wx.showToast({ title: msg, icon: 'none' })
      }
    }, 800)
  },

  // ===== 云函数模式（云开发修好后启用）=====
  createRoomCloud(topic, maxMembers) {
    if (!app.globalData.cloudReady) {
      this.setData({ creating: false })
      wx.showToast({ title: '云开发未就绪，请稍后', icon: 'none' })
      return
    }

    let timeoutHit = false
    const timer = setTimeout(() => {
      timeoutHit = true
      this.setData({ creating: false })
      wx.showToast({ title: '网络不稳定，重试', icon: 'none' })
    }, 5000)

    wx.cloud.callFunction({
      name: 'createRoom',
      data: { topic, maxMembers },
      success: (res) => {
        if (timeoutHit) return
        clearTimeout(timer)
        const result = res && res.result
        if (result && result.ok && result.roomId) {
          wx.redirectTo({
            url: '/pages/group/room/room?roomId=' + result.roomId
          })
        } else {
          this.setData({ creating: false })
          const msg = this.mapErrMsg(result && result.errCode)
          wx.showToast({ title: msg, icon: 'none' })
        }
      },
      fail: (err) => {
        if (timeoutHit) return
        clearTimeout(timer)
        console.error('[create] callFunction 失败', err)
        this.setData({ creating: false })
        wx.showToast({ title: '网络不稳定，重试', icon: 'none' })
      }
    })
  },

  mapErrMsg(errCode) {
    switch (errCode) {
      case 'NO_AUTH': return '请重新登录微信'
      case 'INVALID_PARAM': return '请填写 1-20 字主题'
      case 'ROOM_ID_COLLISION': return '系统繁忙，重试'
      case 'DB_ERROR': return '创建失败，重试'
      default: return '创建失败，重试'
    }
  }
})
