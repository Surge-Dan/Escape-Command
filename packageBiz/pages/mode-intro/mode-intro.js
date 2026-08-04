const app = getApp()
const { MODE_LIST } = require('../../../utils/constants.js')

// v2 模式人格：每个模式的「性格」由 3-4 条具体描述构成，避免空话。
const MODE_PERSONALITY = {
  smart: ['算法懂你，但不替你做决定', '会避开最近刚做过的类型', '兼顾你的心情和当下的天气', '不知道选什么就选它'],
  micro: ['全部指令 15 分钟内能完成', '碎片时间也能出逃', '不用走远，楼下就够了', '适合午休、等人的间隙'],
  walk: ['鼓励户外长线漫步', '可以迷路，迷路也是风景', '深度探索一个街区', '记得穿一双舒服的鞋'],
  double: ['需要两个人一起完成', '考验默契，也考验信任', '适合朋友、伴侣、家人', '一个人时可以发起邀请'],
  night: ['22:00 之后才会出现', '专属于夜行者的安静', '夜色里城市是另一副面孔', '注意安全，结伴更佳'],
  rainy: ['雨天才会解锁的模式', '撑伞漫步或室内躲雨皆可', '听雨声也算一种出逃', '雨后会遇到不一样的细节']
}

Page({
  data: {
    statusBarHeight: 20,
    mode: null,
    personality: [],
    samples: []
  },

  onLoad(options) {
    const nav = app.getNavMetrics ? app.getNavMetrics() : {}
    const modeId = (options && options.mode) ? options.mode : 'smart'
    const mode = MODE_LIST.find(m => m.id === modeId) || MODE_LIST[0]
    const personality = MODE_PERSONALITY[modeId] || MODE_PERSONALITY.smart
    const pool = (app.globalData.commandPool || []).filter(c => c.mode === modeId)
    const samples = (pool.length ? pool : (app.globalData.commandPool || [])).slice(0, 3)
    this.setData({
      statusBarHeight: nav.statusBarHeight || 20,
      navHeaderStyle: nav.navHeaderStyle || '',
      mode,
      personality,
      samples
    })
  },

  goBack() { wx.navigateBack({ delta: 1 }) },

  tryMode() {
    // best-effort handshake: write to globalData so a future index.js update could pick it up.
    try { app.globalData.pendingMode = this.data.mode && this.data.mode.id } catch (e) {}
    wx.navigateBack({
      delta: 1,
      fail: () => { wx.switchTab({ url: '/pages/index/index' }) }
    })
  },

  onShareAppMessage() {
    const m = this.data.mode || {}
    return { title: `出逃指令 · ${m.name || ''}模式`, path: '/pages/index/index' }
  }
})
