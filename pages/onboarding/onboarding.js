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
    const next = Math.min(2, this.data.current + 1)
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
      app.globalData.onboarded = true
    } catch (e) { console.warn('[onboarding] saveToLocal failed', e) }
    wx.reLaunch({ url: '/pages/index/index' })
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
