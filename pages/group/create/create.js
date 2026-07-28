const app = getApp()

Page({
  data: {
    statusBarHeight: 20,
    navHeaderStyle: '',
    topic: '',
    memberOptions: [3, 4, 5, 6],
    memberIndex: 1,  // 默认 4 人
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

  onMemberChange(e) {
    this.setData({ memberIndex: Number(e.detail.value) })
  },

  onBackTap() {
    wx.navigateBack({
      fail: () => wx.switchTab({ url: '/pages/index/index' })
    })
  },

  onCreateTap() {
    if (this.data.creating) return

    const topic = (this.data.topic || '').trim()
    const maxMembers = this.data.memberOptions[this.data.memberIndex]

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

    // 云开发就绪检查
    if (!app.globalData.cloudReady) {
      wx.showToast({ title: '云开发未就绪，请稍后', icon: 'none' })
      return
    }

    this.setData({ creating: true })

    // 5 秒超时
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
          const errCode = result && result.errCode
          const msg = this.mapErrMsg(errCode)
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
