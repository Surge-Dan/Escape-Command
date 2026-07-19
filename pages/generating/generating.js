const app = getApp()

Page({
  data: {
    statusBarHeight: 20
  },

  onLoad() {
    const nav = app.getNavMetrics ? app.getNavMetrics() : {}
    this.setData({ statusBarHeight: nav.statusBarHeight || 20 })
    this.timer = setTimeout(() => this.advance(), 1500)
  },

  onUnload() {
    if (this.timer) clearTimeout(this.timer)
  },

  goBack() { wx.navigateBack({ delta: 1 }) },

  // 1500ms 后：若有新解锁徽章则去徽章页，否则去地图页。
  advance() {
    const pending = app.globalData.pendingBadges
    if (pending && pending.length > 0) {
      wx.redirectTo({
        url: '/pages/badges/badges',
        fail: () => wx.switchTab({ url: '/pages/map/map' })
      })
    } else {
      // map 是 tabbar 页，必须用 switchTab。
      wx.switchTab({
        url: '/pages/map/map',
        fail: () => wx.redirectTo({ url: '/pages/badges/badges' })
      })
    }
  }
})
