const app = getApp()
const { MODE_LIST } = require('../../utils/constants.js')

Page({
  data: {
    statusBarHeight: 20,
    ready: false,
    current: 0,
    modeList: MODE_LIST,
    navHeaderStyle: ''
  },

  onLoad() {
    const sys = app.globalData.systemInfo || wx.getSystemInfoSync()
    const nav = app.getNavMetrics ? app.getNavMetrics() : {}
    this.setData({
      statusBarHeight: (sys && sys.statusBarHeight) || 20,
      ready: true,
      modeList: MODE_LIST,
      navHeaderStyle: nav.navHeaderStyle || ''
    })
  },

  // v3: swiper 切换
  swiperChange(e) {
    this.setData({ current: e.detail.current })
  },

  // v3: 进入下一屏
  goNext() {
    const next = Math.min(3, this.data.current + 1)
    this.setData({ current: next })
  },

  // v7: 跳过 onboarding —— 直接写入 localStorage + globalData 并跳到首页
  skipOnboarding() {
    this.finishOnboarding()
  },

  // v7: 统一收尾方法
  finishOnboarding() {
    try {
      app.saveToLocal('onboarded', true)
      app.saveToLocal('privacyAgreed', true)
      app.globalData.onboarded = true
      app.globalData.privacyAgreed = true
    } catch (e) { console.warn('[onboarding] saveToLocal failed', e) }
    wx.reLaunch({ url: '/pages/index/index' })
  },

  // 隐私授权同意 —— 触发定位授权后完成引导
  onAgreePrivacy() {
    // 先尝试获取定位授权（用户可拒绝，不阻塞引导完成）
    wx.getLocation({
      type: 'gcj02',
      success: (res) => {
        try {
          app.saveToLocal('userLocation', {
            latitude: res.latitude,
            longitude: res.longitude
          })
          app.globalData.location = {
            latitude: res.latitude,
            longitude: res.longitude
          }
        } catch (e) {}
        this.finishOnboarding()
      },
      fail: () => {
        // 用户拒绝定位授权，仍然完成引导（定位非必须）
        this.finishOnboarding()
      }
    })
  },

  // v3: 完成引导，进入首页
  startEscape() {
    this.finishOnboarding()
  },

  onShareAppMessage() {
    return {
      title: '出逃指令 · 摇一下，给周末一个出口',
      path: '/pages/index/index'
    }
  }
})
