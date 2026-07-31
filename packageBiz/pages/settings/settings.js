const app = getApp()
const themes = require('../../data/themes.js')

Page({
  data: {
    soundEnabled: true,
    notificationEnabled: true,
    notificationTime: '18:00',
    locationMode: 'fuzzy',
    locationModes: [
      { id: 'fuzzy', name: '模糊定位', desc: '大概位置即可，保护隐私' },
      { id: 'precise', name: '精确定位', desc: '更准确的足迹记录' }
    ],
    themeList: themes,
    currentTheme: 'default',
    currentThemeName: '',
    cacheSize: '0 KB',
    cacheKeys: 0,
    statusBarHeight: 20,
    capsuleTop: 26,
    hasHomePoint: false
  },

  onLoad() {
    this.applyNavMetrics()
    this.loadSettings()
    this.refreshCacheInfo()
  },

  onShow() {
    // 缓存大小可能因其它页面写入而变化，每次展示时刷新
    this.refreshCacheInfo()
    this.loadHomePointStatus()
  },

  applyNavMetrics() {
    const nav = app.getNavMetrics ? app.getNavMetrics() : {}
    this.setData({
      statusBarHeight: nav.statusBarHeight || 20,
      capsuleTop: nav.capsuleTop || 26,
      navHeaderStyle: nav.navHeaderStyle || ''
    })
  },

  loadSettings() {
    const settings = app.globalData.settings || {}
    const currentTheme = wx.getStorageSync('currentTheme') || (app.globalData.theme || 'default')
    const themeMeta = themes.find(t => t.id === currentTheme) || themes[0]
    this.setData({
      soundEnabled: settings.soundEnabled !== false,
      notificationEnabled: settings.notificationEnabled !== false,
      notificationTime: wx.getStorageSync('notificationTime') || '18:00',
      locationMode: app.globalData.locationMode || 'fuzzy',
      currentTheme: currentTheme,
      currentThemeName: themeMeta ? themeMeta.name : ''
    })
    this.loadHomePointStatus()
  },

  loadHomePointStatus() {
    const homePoint = wx.getStorageSync('homePoint') || app.globalData.homePoint || null
    this.setData({ hasHomePoint: !!homePoint })
  },

  toggleSound(e) {
    const val = e.detail.value
    this.setData({ soundEnabled: val })
    app.globalData.settings.soundEnabled = val
    app.saveToLocal('settings', app.globalData.settings)
    wx.showToast({ title: val ? '音效已开启' : '音效已关闭', icon: 'none' })
  },

  toggleNotification(e) {
    const val = e.detail.value
    this.setData({ notificationEnabled: val })
    app.globalData.settings.notificationEnabled = val
    app.saveToLocal('settings', app.globalData.settings)
    wx.showToast({ title: val ? '通知已开启' : '通知已关闭', icon: 'none' })
  },

  onNotificationTimeChange(e) {
    const time = e.detail.value
    this.setData({ notificationTime: time })
    app.saveToLocal('notificationTime', time)
    wx.showToast({ title: `提醒时间已设为 ${time}`, icon: 'none' })
  },

  switchTheme(e) {
    const themeId = e.currentTarget.dataset.id
    if (!themeId) return
    const themeMeta = themes.find(t => t.id === themeId)
    if (!themeMeta) return
    this.setData({ currentTheme: themeId, currentThemeName: themeMeta.name })
    app.globalData.theme = themeId
    app.saveToLocal('currentTheme', themeId)
    wx.showToast({ title: `已切换为${themeMeta.name}`, icon: 'none' })
  },

  selectLocationMode(e) {
    const mode = e.currentTarget.dataset.mode
    this.setData({ locationMode: mode })
    app.globalData.locationMode = mode
    app.saveToLocal('locationMode', mode)
    wx.showToast({ title: '定位模式已切换', icon: 'success' })
  },

  refreshCacheInfo() {
    try {
      const info = wx.getStorageInfoSync()
      const sizeKB = info.currentSize || 0
      this.setData({
        cacheSize: sizeKB >= 1024 ? `${(sizeKB / 1024).toFixed(2)} MB` : `${sizeKB} KB`,
        cacheKeys: info.keys ? info.keys.length : 0
      })
    } catch (e) {
      this.setData({ cacheSize: '0 KB', cacheKeys: 0 })
    }
  },

  clearCache() {
    const self = this
    wx.showModal({
      title: '清理缓存',
      content: `当前缓存 ${this.data.cacheSize}（共 ${this.data.cacheKeys} 项），清理不会影响你的出逃记录、徽章和设置。`,
      confirmText: '清理',
      cancelText: '取消',
      success: (res) => {
        if (!res.confirm) return
        // 保留核心数据 key，仅清除缓存类 key
        const protectedKeys = [
          'records', 'completedCommandIds', 'badges', 'collectedCommands', 'ugcCommands',
          'settings', 'locationMode', 'memberStatus', 'continuousDays', 'lastCompleteDate',
          'escapeName', 'escapeCode', 'avatarUrl', 'onboarded', 'userPreferences',
          'currentTheme', 'currentCity', 'partnerRecords', 'notificationTime',
          'lastResetDate', 'reRollData', 'lastCommandType', 'sameTypeCount',
          'challengeCompletedCount'
        ]
        let cleared = 0
        try {
          const info = wx.getStorageInfoSync()
          ;(info.keys || []).forEach(key => {
            if (!protectedKeys.includes(key)) {
              try { wx.removeStorageSync(key); cleared++ } catch (e) {}
            }
          })
        } catch (e) {}
        self.refreshCacheInfo()
        wx.showToast({ title: `已清理 ${cleared} 项缓存`, icon: 'success' })
      }
    })
  },

  navigateToAbout() {
    wx.navigateTo({ url: '/packageBiz/pages/about/about' })
  },

  showAbout() {
    wx.showModal({
      title: '关于出逃指令',
      content: '版本 3.0.0\n\n给周末一个出口\n\n用随机的小冒险，填满城市里的空白时光。',
      showCancel: false,
      confirmText: '知道了'
    })
  },

  // v7: 重新查看引导 —— 清除 onboarded 标记并 reLaunch 到 onboarding
  replayOnboarding() {
    wx.showModal({
      title: '重新查看引导',
      content: '将重新进入新手引导，不影响你的出逃记录和设置。',
      confirmText: '查看',
      cancelText: '取消',
      success: (res) => {
        if (!res.confirm) return
        try {
          app.saveToLocal('onboarded', false)
          app.globalData.onboarded = false
        } catch (e) { console.warn('[settings] replayOnboarding save failed', e) }
        wx.reLaunch({ url: '/pages/onboarding/onboarding' })
      }
    })
  },

  clearData() {
    wx.showModal({
      title: '清空所有数据',
      content: '这将删除所有出逃记录、徽章和设置，且无法恢复，确定吗？',
      confirmText: '确认清空',
      cancelText: '再想想',
      confirmColor: '#E05555',
      success: (res) => {
        if (res.confirm) {
          wx.clearStorageSync()
          app.globalData.records = []
          app.globalData.badges = []
          app.globalData.completedCommandIds = []
          app.globalData.collectedCommands = []
          app.globalData.continuousDays = 0
          wx.showToast({ title: '数据已清空', icon: 'success' })
          setTimeout(() => {
            wx.reLaunch({ url: '/pages/index/index' })
          }, 1000)
        }
      }
    })
  },

  clearHomePoint() {
    wx.showModal({
      title: '清除家位置',
      content: '清除后路线模式将不再以家为固定出发点，确定吗？',
      confirmText: '清除',
      cancelText: '取消',
      confirmColor: '#E05555',
      success: (res) => {
        if (!res.confirm) return
        try {
          wx.removeStorageSync('homePoint')
          app.globalData.homePoint = null
        } catch (e) { console.warn('[settings] clearHomePoint failed', e) }
        this.setData({ hasHomePoint: false })
        wx.showToast({ title: '已清除家位置', icon: 'success' })
      }
    })
  },

  goBack() {
    wx.navigateBack()
  }
})
