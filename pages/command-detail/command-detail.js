const app = getApp()
const aiImage = require('../../utils/ai-image.js')
const imageFallback = require('../../utils/image-fallback.js')

// 每步的实用小贴士（兜底，cmd 自带 steps.details 时优先用 cmd 的）。
const STEP_HINTS = [
  '出门前看一眼天气，带好手机和钥匙就够',
  '不用急着完成，慢慢走、慢慢看',
  '拍照时多换几个角度，挑一张最喜欢的',
  '感受不用写很长，一句话就够'
]

Page({
  data: {
    statusBarHeight: 20,
    command: null,
    notFound: false,
    steps: [],
    collected: false,
    costText: '免费',
    // v4: AI 场景插画状态
    sceneUrl: '',           // 当前展示的图片 URL（占位 or AI 生成结果）
    sceneReady: false,      // AI 生成完成？
    sceneGenerating: false  // 是否正在生成中
  },

  onLoad(options) {
    const nav = app.getNavMetrics ? app.getNavMetrics() : {}
    const id = (options && options.id) ? options.id : ''
    const pool = app.globalData.commandPool || []
    let cmd = pool.find(c => c.id === id)
    if (!cmd) cmd = (app.globalData.ugcCommands || []).find(c => c.id === id)
    if (!cmd) {
      this.setData({ statusBarHeight: nav.statusBarHeight || 20, navHeaderStyle: nav.navHeaderStyle || '', notFound: true })
      return
    }
    const rawSteps = (cmd.steps && cmd.steps.length ? cmd.steps : []).slice(0, 4)
    const steps = rawSteps.map((s, i) => {
      const isObj = (typeof s === 'object' && s !== null)
      const text = isObj ? (s.text || '') : String(s || '')
      const hint = isObj && s.details ? s.details : (STEP_HINTS[i] || '慢慢来，不着急')
      return { text, hint, expanded: false }
    })
    const collectedIds = app.globalData.collectedCommands || []
    const cost = cmd.cost || 0
    this.setData({
      statusBarHeight: nav.statusBarHeight || 20,
      navHeaderStyle: nav.navHeaderStyle || '',
      command: cmd,
      steps,
      collected: collectedIds.includes(cmd.id),
      costText: cost > 0 ? `约 ¥${cost}` : '免费',
      // v4: 占位图先上（TYPE_META.scene）
      sceneUrl: cmd.illustration || '',
      sceneReady: false,
      sceneGenerating: false
    })

    // v4: 异步触发 AI 场景插画生成
    this.generateScene(cmd)
  },

  // v4: 调用 AI 接口生成场景插画
  generateScene(cmd) {
    if (!aiImage.isEnabled()) {
      // 未启用 AI 接口 → 保持占位图
      this.setData({ sceneReady: true })
      return
    }
    this.setData({ sceneGenerating: true })
    const ctx = {
      weather: app.globalData.weather,
      hour: app.getCurrentHour ? app.getCurrentHour() : new Date().getHours()
    }
    aiImage.generateSceneForCommand(cmd, ctx).then(result => {
      if (!result || !result.path) {
        // 生成失败 → 保持占位图
        this.setData({ sceneReady: true, sceneGenerating: false })
        return
      }
      this.setData({
        sceneUrl: result.path,
        sceneReady: true,
        sceneGenerating: false
      })
    }).catch(() => {
      this.setData({ sceneReady: true, sceneGenerating: false })
    })
  },

  goBack() { wx.navigateBack({ delta: 1 }) },

  onImgError(e) { imageFallback.handle(e, this) },

  toggleStep(e) {
    const idx = e.currentTarget.dataset.index
    const steps = this.data.steps.slice()
    if (!steps[idx]) return
    steps[idx] = Object.assign({}, steps[idx], { expanded: !steps[idx].expanded })
    this.setData({ steps })
  },

  toggleCollect() {
    const cmd = this.data.command
    if (!cmd) return
    let collected = app.globalData.collectedCommands || []
    const exists = collected.includes(cmd.id)
    collected = exists ? collected.filter(x => x !== cmd.id) : collected.concat(cmd.id)
    app.globalData.collectedCommands = collected
    app.saveToLocal('collectedCommands', collected)
    this.setData({ collected: !exists })
    wx.showToast({ title: exists ? '已取消收藏' : '已收藏', icon: 'none' })
  },

  dismiss() {
    wx.showToast({ title: '已减少推荐', icon: 'none' })
    setTimeout(() => wx.navigateBack({ delta: 1 }), 600)
  },

  onShareAppMessage() {
    const cmd = this.data.command || {}
    return {
      title: `出逃指令：${cmd.title || cmd.content || '出去走走'}`,
      path: '/pages/index/index'
    }
  }
})
