const app = getApp()

Page({
  data: {
    statusBarHeight: 20,
    version: '2.4.0',
    email: 'escape@command.app',
    wechat: '出逃指令',
    changelog: [
      { version: 'v2.4.0', date: '2026-08-09', note: 'UI细节打磨，启动页偏好收集与首页联动，活动选择高亮与衬线字体修复' },
      { version: 'v2.3.0', date: '2026-08-02', note: '新增主题换肤、每日挑战、城市进度、心情日记，破圈画像与证书' },
      { version: 'v2.2.0', date: '2026-07-25', note: '同频组局（任务大厅/房间/聊天），Canvas矢量分享卡，三维地图筛选' },
      { version: 'v2.1.0', date: '2026-07-18', note: '破圈骰子（100条指令），双人/深夜/雨天模式，安全防护体系' },
      { version: 'v2.0.0', date: '2026-07-01', note: '徽章系统、记忆地图、拍立得记录卡、指令引擎重写' },
      { version: 'v1.0.0', date: '2026-06-15', note: '初赛MVP：微出逃骰子、4步引导、简单记录' }
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
