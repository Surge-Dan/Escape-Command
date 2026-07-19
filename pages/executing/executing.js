const app = getApp()
const { DEFAULT_STEPS, getTypeMeta } = require('../../utils/constants.js')

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
    capsuleTop: 26,
    capsuleHeight: 32,
    navHeaderStyle: '',
    command: {},
    // v4: 步骤改为对象数组，包含 {id, text, done, hint}
    steps: [],
    currentStep: 0,
    doneCount: 0,
    allDone: false,
    elapsedMinutes: 0,
    progressPct: 0,
    remainMin: 0,
    photos: [],
    // v3: 类型色（驱动步骤编号 + 进度条着色）
    typeColor: '#5CBF9E',
    // v3: 步数统计（漫步模式或时长 >= 30 分钟）
    showStepCount: false,
    stepCount: 0
  },

  onLoad() {
    this.applyNavMetrics()
    this._milestoneShown = false
    const cmd = app.globalData.currentCommand
    if (!cmd) {
      wx.switchTab({ url: '/pages/index/index' })
      return
    }
    // v4: 步骤改造 —— 转对象数组，含 id/text/done/hint
    const rawSteps = (cmd.steps && cmd.steps.length ? cmd.steps : DEFAULT_STEPS).slice(0, 4)
    const steps = rawSteps.map((s, i) => {
      const isObj = (typeof s === 'object' && s !== null)
      const text = isObj ? (s.text || '') : String(s || '')
      const hint = isObj && s.details ? s.details : (STEP_HINTS[i] || '慢慢来，不着急')
      return { id: i + 1, text, hint, done: false }
    })
    const typeMeta = getTypeMeta(cmd.type)
    const typeColor = (typeMeta && typeMeta.color) || '#5CBF9E'
    const isWalk = cmd.mode === 'walk' || cmd.type === 'walk'
    const duration = cmd.duration || 20
    const showStepCount = isWalk || duration >= 30
    const stepCount = duration * 100
    this.setData({
      command: cmd,
      steps,
      photos: cmd.photos || [],
      typeColor,
      showStepCount,
      stepCount,
      currentStep: 0,
      doneCount: 0,
      allDone: false
    })
    this.startTimer()
  },

  onUnload() { this.stopTimer() },

  applyNavMetrics() {
    const nav = app.getNavMetrics ? app.getNavMetrics() : {}
    this.setData({
      statusBarHeight: nav.statusBarHeight || 20,
      capsuleTop: nav.capsuleTop || 26,
      capsuleHeight: nav.capsuleHeight || 32,
      navHeaderStyle: nav.navHeaderStyle || app.globalData.navHeaderStyle || ''
    })
  },

  startTimer() {
    this.stopTimer()
    this.tickTimer()
    this.timer = setInterval(() => this.tickTimer(), 1000)
  },

  tickTimer() {
    const cmd = app.globalData.currentCommand
    if (!cmd) return
    const elapsed = Math.max(0, Math.floor((Date.now() - cmd.startTime) / 1000))
    const durationSec = Math.max(1, (cmd.duration || 20) * 60)
    const pct = Math.min(100, Math.round(elapsed / durationSec * 100))
    this.setData({
      elapsedMinutes: Math.floor(elapsed / 60),
      progressPct: pct,
      remainMin: Math.max(0, Math.ceil((durationSec - elapsed) / 60))
    })
    if (pct >= 50 && !this._milestoneShown) {
      this._milestoneShown = true
      wx.showToast({ title: '已完成一半，继续加油！', icon: 'none', duration: 1800 })
    }
  },

  stopTimer() {
    if (this.timer) clearInterval(this.timer)
    this.timer = null
  },

  goBack() {
    app.abandonCommand()
    wx.switchTab({ url: '/pages/index/index' })
  },

  // v4: 手动点击「完成」第 i 步
  onStepTap(e) {
    const index = Number(e.currentTarget.dataset.index)
    const steps = this.data.steps.slice()
    if (!steps[index] || steps[index].done) return
    steps[index] = Object.assign({}, steps[index], { done: true })
    this.recomputeProgress(steps)
    try { wx.vibrateShort({ type: 'light' }) } catch (e) {}
    // 全部完成时给一个轻提示
    if (this.data.allDone) {
      wx.showToast({ title: '全部完成，可以出逃了', icon: 'none', duration: 1200 })
    }
  },

  // 重新计算 currentStep / doneCount / allDone
  recomputeProgress(steps) {
    const doneCount = steps.filter(s => s.done).length
    const allDone = doneCount === steps.length
    // currentStep = 第一个未完成索引
    let currentStep = steps.findIndex(s => !s.done)
    if (currentStep === -1) currentStep = steps.length - 1
    this.setData({ steps, doneCount, allDone, currentStep })
  },

  takePhoto() {
    if (this.data.photos.length >= 3) {
      wx.showToast({ title: '最多拍 3 张', icon: 'none' })
      return
    }
    wx.chooseMedia({
      count: 3 - this.data.photos.length,
      mediaType: ['image'],
      sourceType: ['camera', 'album'],
      sizeType: ['compressed'],
      success: (res) => {
        const photos = this.data.photos.concat(res.tempFiles.map(f => f.tempFilePath)).slice(0, 3)
        this.setData({ photos })
        app.globalData.currentCommand.photos = photos
        app.saveCurrentCommand()
      }
    })
  },

  removePhoto(e) {
    const index = e.currentTarget.dataset.index
    const photos = this.data.photos.slice()
    photos.splice(index, 1)
    this.setData({ photos })
    app.globalData.currentCommand.photos = photos
    app.saveCurrentCommand()
  },

  finishCommand() {
    // v4: 必须 4 步全部完成才能提交
    if (!this.data.allDone) {
      wx.showToast({ title: '先把所有步骤完成再出逃', icon: 'none', duration: 1500 })
      return
    }
    if (app.playSound) app.playSound('complete')
    wx.navigateTo({ url: '/pages/record/record' })
  }
})
