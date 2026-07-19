const app = getApp()

Page({
  data: {
    statusBarHeight: 20,
    version: '3.0.0',
    email: 'escape@command.app',
    wechat: '出逃指令',
    changelog: [
      { version: 'v3.0.0', date: '2026-07-08', note: '全新 6 模式体验，30+ 页面重构，每日挑战，社区分享' },
      { version: 'v2.0.0', date: '2026-07-01', note: '简化模式，优化导航，新增徽章系统' },
      { version: 'v1.0.0', date: '2026-06-15', note: '首次发布，10 个核心页面' }
    ]
  },

  onLoad() {
    const nav = app.getNavMetrics ? app.getNavMetrics() : {}
    this.setData({ statusBarHeight: nav.statusBarHeight || 20, navHeaderStyle: nav.navHeaderStyle || '' })
  },

  copyEmail() {
    wx.setClipboardData({
      data: this.data.email,
      success: () => wx.showToast({ title: '邮箱已复制', icon: 'none' })
    })
  },

  copyWechat() {
    wx.setClipboardData({
      data: this.data.wechat,
      success: () => wx.showToast({ title: '公众号已复制', icon: 'none' })
    })
  },

  openFeedback() {
    wx.showModal({
      title: '反馈建议',
      editable: true,
      placeholderText: '说说你想看到什么，或哪里不够好',
      success: (res) => {
        if (res.confirm && res.content && res.content.trim()) {
          wx.showToast({ title: '感谢你的反馈', icon: 'success' })
        }
      }
    })
  },

  openAgreement() {
    wx.showToast({ title: '即将开放', icon: 'none' })
  },

  openPrivacy() {
    wx.showToast({ title: '即将开放', icon: 'none' })
  },

  goBack() {
    wx.navigateBack({ delta: 1 })
  }
})
