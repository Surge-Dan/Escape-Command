const app = getApp()

// v2 与 app.js generateEscapeName 保持一致的词库
const NAME_PREFIXES = ['周末', '迷路的', '踢影子的', '漫步的', '摘云的', '追风的', '捡落叶的']
const NAME_SUFFIXES = ['漫游者', '散步家', '观察员', '记录人', '探险家', '闲逛者']

Page({
  data: {
    statusBarHeight: 20,
    escapeName: '',
    escapeCode: '',
    avatarUrl: '/assets/avatar-default.webp',
    nameCount: 0,
    codeCount: 0
  },

  onLoad() {
    const nav = app.getNavMetrics ? app.getNavMetrics() : {}
    const gd = app.globalData
    const name = gd.escapeName || ''
    const code = gd.escapeCode || ''
    this.setData({
      statusBarHeight: nav.statusBarHeight || 20,
      navHeaderStyle: nav.navHeaderStyle || '',
      escapeName: name,
      escapeCode: code,
      avatarUrl: gd.avatarUrl || '/assets/avatar-default.webp',
      nameCount: name.length,
      codeCount: code.length
    })
  },

  onNameInput(e) {
    const val = e.detail.value || ''
    this.setData({ escapeName: val, nameCount: val.length })
  },

  onCodeInput(e) {
    const val = e.detail.value || ''
    this.setData({ escapeCode: val, codeCount: val.length })
  },

  randomName() {
    const name = NAME_PREFIXES[Math.floor(Math.random() * NAME_PREFIXES.length)] +
      NAME_SUFFIXES[Math.floor(Math.random() * NAME_SUFFIXES.length)]
    // 保险裁切到 12 字以内
    const safe = name.slice(0, 12)
    this.setData({ escapeName: safe, nameCount: safe.length })
  },

  // 头像加载失败：回退到默认头像（带防重试保护，避免无限循环）
  onAvatarError() {
    if (this._avatarErrorCount >= 2) return  // 最多重试 2 次，避免无限循环
    this._avatarErrorCount = (this._avatarErrorCount || 0) + 1
    console.warn('[profile-edit] avatar 加载失败，回退默认头像，重试次数：' + this._avatarErrorCount)
    this.setData({ avatarUrl: '/assets/avatar-default.webp' })
  },

  chooseAvatar() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      sizeType: ['compressed'],
      success: (res) => {
        const file = res.tempFiles && res.tempFiles[0]
        if (file && file.tempFilePath) {
          this._avatarErrorCount = 0  // 重置错误计数
          this.setData({ avatarUrl: file.tempFilePath })
        }
      },
      fail: () => {
        // 兼容老版本
        wx.chooseImage({
          count: 1,
          sizeType: ['compressed'],
          sourceType: ['album', 'camera'],
          success: (img) => {
            if (img.tempFilePaths && img.tempFilePaths[0]) {
              this.setData({ avatarUrl: img.tempFilePaths[0] })
            }
          }
        })
      }
    })
  },

  save() {
    const name = (this.data.escapeName || '').trim()
    if (!name) {
      wx.showToast({ title: '出逃代号不能为空', icon: 'none' })
      return
    }
    const code = (this.data.escapeCode || '').trim()
    app.globalData.escapeName = name
    app.globalData.escapeCode = code
    app.globalData.avatarUrl = this.data.avatarUrl
    if (app.saveAll) app.saveAll()
    wx.showToast({ title: '已保存', icon: 'success' })
    setTimeout(() => {
      wx.navigateBack({ delta: 1 })
    }, 600)
  },

  goBack() {
    wx.navigateBack({ delta: 1 })
  }
})
