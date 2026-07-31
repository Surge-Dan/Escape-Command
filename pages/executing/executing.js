const app = getApp()
const { DEFAULT_STEPS, getTypeMeta } = require('../../utils/constants.js')
// 执行进度持久化（中途退出/锁屏/进程清除后可续，每步 completedAt 留痕）
const executionProgress = require('../../utils/execution-progress.js')

// 每步的实用小贴士（兜底，cmd 自带 steps.details 时优先用 cmd 的）。
const STEP_HINTS = [
  '出门前看一眼天气，带好手机和钥匙就够',
  '不用急着完成，慢慢走、慢慢看',
  '拍照时多换几个角度，挑一张最喜欢的',
  '感受不用写很长，一句话就够'
]

// 破圈模式步骤标题（搞怪版）
const BT_STEP_LABELS = [
  '🎬 上吧！',
  '😅 撑住别跑',
  '💪 已经回不去了',
  '🎉 破圈成功！'
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
    stepCount: 0,
    // 破圈模式专属
    isBreakthrough: false
  },

  onLoad() {
    this.applyNavMetrics()
    this._milestoneShown = false
    const cmd = app.globalData.currentCommand
    if (!cmd) {
      wx.switchTab({ url: '/pages/index/index' })
      return
    }
    const isBT = cmd.type === 'breakthrough' || cmd.mode === 'breakthrough'
    // v4: 步骤改造 —— 转对象数组，含 id/text/done/hint
    const rawSteps = (cmd.steps && cmd.steps.length ? cmd.steps : DEFAULT_STEPS).slice(0, 4)
    const steps = rawSteps.map((s, i) => {
      const isObj = (typeof s === 'object' && s !== null)
      const text = isObj ? (s.text || '') : String(s || '')
      const hint = isObj && s.details ? s.details : (isBT ? (STEP_HINTS[i] || '深呼吸，你可以的') : (STEP_HINTS[i] || '慢慢来，不着急'))
      return { id: i + 1, text, hint, done: false, label: isBT ? (BT_STEP_LABELS[i] || '') : '' }
    })
    // 进度持久化：冷启动恢复 done 状态 + completedAt 留痕
    // 首次进入初始化 executionProgress 挂到 currentCommand，复用 saveCurrentCommand 落盘
    if (!cmd.executionProgress) {
      cmd.executionProgress = executionProgress.initProgress(rawSteps)
      app.saveCurrentCommand()
    }
    const merged = executionProgress.mergeProgress(steps, cmd.executionProgress)
    const typeMeta = getTypeMeta(cmd.type)
    // 破圈模式用 TYPE_META.breakthrough.color（#9B7BB8），其他模式从指令/元数据取色
    const typeColor = isBT ? (typeMeta.color || '#9B7BB8') : (cmd.typeColor || typeMeta.color || '#5CBF9E')
    const isWalk = cmd.mode === 'walk' || cmd.type === 'walk'
    const duration = cmd.duration || 20
    const showStepCount = !isBT && (isWalk || duration >= 30)
    const stepCount = duration * 100
    this.setData({
      command: cmd,
      steps: merged.steps,
      photos: cmd.photos || [],
      typeColor,
      showStepCount,
      stepCount,
      isBreakthrough: isBT,
      currentStep: merged.currentStep,
      doneCount: merged.doneCount,
      allDone: merged.allDone
    })
    this.startTimer()
  },

  onUnload() {
    // 切后台/卸载前保存进度，应对进程被清除后冷启动恢复
    const cmd = app.globalData.currentCommand
    if (cmd && cmd.executionProgress) app.saveCurrentCommand()
    this.stopTimer()
  },

  // 切后台/锁屏时保存进度（onHide 在 onUnload 之前触发，覆盖切应用/锁屏场景）
  onHide() {
    const cmd = app.globalData.currentCommand
    if (cmd && cmd.executionProgress) app.saveCurrentCommand()
  },

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
  // 持久化：标记 done 时同步写入 cmd.executionProgress（含 completedAt 时间戳），落盘可续
  onStepTap(e) {
    const index = Number(e.currentTarget.dataset.index)
    const cmd = app.globalData.currentCommand
    if (!cmd) return
    const steps = this.data.steps.slice()
    if (!steps[index] || steps[index].done) return
    // 更新持久化进度（写 completedAt，已完成不覆盖，保证留痕单调递增）
    cmd.executionProgress = executionProgress.markStepDone(cmd.executionProgress, index)
    app.saveCurrentCommand()
    // 合并到 page data（保留 hint 等页面字段，覆盖 done/completedAt）
    const merged = executionProgress.mergeProgress(steps, cmd.executionProgress)
    this.setData({
      steps: merged.steps,
      doneCount: merged.doneCount,
      allDone: merged.allDone,
      currentStep: merged.currentStep
    })
    try { wx.vibrateShort({ type: 'light' }) } catch (e) {}
    // 全部完成时给一个轻提示
    if (merged.allDone) {
      wx.showToast({ title: '全部完成，可以出逃了', icon: 'none', duration: 1200 })
    }
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
