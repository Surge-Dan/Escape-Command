const app = getApp()
const { DEFAULT_STEPS, getTypeMeta } = require('../../utils/constants.js')
// 执行进度持久化（中途退出/锁屏/进程清除后可续，每步 completedAt 留痕）
const executionProgress = require('../../utils/execution-progress.js')
// 安全合规工具（B1：紧急退出/位置分享/紧急联系）
const safetyHelper = require('../../utils/safety-helper.js')
// 到达确认工具（B2：阶段感设计/隐藏任务解锁）
const arrivalHelper = require('../../utils/arrival-helper.js')

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
    isBreakthrough: false,
    // B2 阶段感设计
    arrived: false,           // 是否已到达
    phase: 'before',          // 'before' 出发前 / 'after' 到达后
    hiddenCount: 0,           // 隐藏任务数量
    showArriveBtn: false,     // 是否显示「我到了」按钮
    allSteps: [],             // 全部步骤（含隐藏）
    showCompleteAnim: false   // 完成仪式感动画
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
    // B2: 第 3-4 步标记为 hidden（到达后解锁）
    const rawSteps = (cmd.steps && cmd.steps.length ? cmd.steps : DEFAULT_STEPS).slice(0, 4)
    const steps = rawSteps.map((s, i) => {
      const isObj = (typeof s === 'object' && s !== null)
      const text = isObj ? (s.text || '') : String(s || '')
      const hint = isObj && s.details ? s.details : (isBT ? (STEP_HINTS[i] || '深呼吸，你可以的') : (STEP_HINTS[i] || '慢慢来，不着急'))
      // B2: 破圈模式不隐藏步骤（闯关感），微逃模式第 3-4 步隐藏
      const hidden = !isBT && i >= 2
      return { id: i + 1, text, hint, done: false, label: isBT ? (BT_STEP_LABELS[i] || '') : '', hidden: hidden }
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
    // B2: 阶段感设计 —— 初始化阶段视图
    const phaseView = arrivalHelper.buildPhaseView(merged.steps, false)
    this.setData({
      command: cmd,
      allSteps: merged.steps,       // 保存全部步骤
      steps: phaseView.steps,       // 当前展示的步骤（出发前仅展示非 hidden）
      photos: cmd.photos || [],
      typeColor,
      showStepCount,
      stepCount,
      isBreakthrough: isBT,
      currentStep: merged.currentStep,
      doneCount: merged.doneCount,
      allDone: merged.allDone,
      arrived: false,
      phase: phaseView.phase,
      hiddenCount: phaseView.hiddenCount,
      showArriveBtn: arrivalHelper.shouldShowArriveBtn(merged.steps, false)
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

  // ===== B1 安全合规：紧急退出 =====
  onEmergencyExit() {
    const cmd = app.globalData.currentCommand
    wx.showModal({
      title: '紧急退出',
      content: '将保存当前进度并返回首页。如遇紧急情况，请拨打110。',
      confirmText: '确认退出',
      cancelText: '继续出逃',
      confirmColor: '#E05555',
      success: (res) => {
        if (!res.confirm) return
        // 保存当前进度（不丢弃，可恢复）
        if (cmd && cmd.executionProgress) {
          app.saveCurrentCommand()
        }
        try { wx.vibrateShort({ type: 'heavy' }) } catch (e) {}
        wx.switchTab({ url: '/pages/index/index' })
      }
    })
  },

  // ===== B1 安全合规：分享位置给朋友 =====
  onShareLocation() {
    const cmd = app.globalData.currentCommand
    // 优先用指令自带位置，其次用用户当前位置
    const loc = (cmd && cmd.location) || app.globalData.location || null
    if (!loc || typeof loc.latitude !== 'number' || typeof loc.longitude !== 'number') {
      // 无位置信息时，尝试实时获取
      wx.getLocation({
        type: 'gcj02',
        success: (res) => {
          wx.openLocation({
            latitude: res.latitude,
            longitude: res.longitude,
            name: '我当前位置',
            scale: 16
          })
        },
        fail: () => {
          wx.showToast({ title: '无法获取位置，请检查定位权限', icon: 'none' })
        }
      })
      return
    }
    wx.openLocation({
      latitude: loc.latitude,
      longitude: loc.longitude,
      name: cmd.title || '出逃目的地',
      address: cmd.distance || '',
      scale: 16
    })
  },

  // ===== B1 安全合规：显示紧急联系信息 =====
  onShowEmergencyContacts() {
    const contacts = safetyHelper.getEmergencyContacts()
    const lines = [
      contacts.police.name + '：' + contacts.police.number + '（' + contacts.police.desc + '）',
      contacts.medical.name + '：' + contacts.medical.number + '（' + contacts.medical.desc + '）',
      contacts.fire.name + '：' + contacts.fire.number + '（' + contacts.fire.desc + '）',
      contacts.traffic.name + '：' + contacts.traffic.number + '（' + contacts.traffic.desc + '）'
    ]
    wx.showModal({
      title: '紧急联系',
      content: lines.join('\n\n'),
      showCancel: true,
      cancelText: '关闭',
      confirmText: '拨打110',
      confirmColor: '#E05555',
      success: (res) => {
        if (res.confirm) {
          wx.makePhoneCall({ phoneNumber: '110' })
        }
      }
    })
  },

  // ===== B2 阶段感：到达确认 =====
  onArriveConfirm() {
    const cmd = app.globalData.currentCommand
    const targetLoc = (cmd && cmd.location) || null

    // 无目标位置时，降级为手动确认
    if (!targetLoc || typeof targetLoc.latitude !== 'number') {
      this.unlockHiddenSteps()
      return
    }

    // 有目标位置时，尝试定位验证
    wx.getLocation({
      type: 'gcj02',
      success: (res) => {
        const result = arrivalHelper.isArrived(
          { latitude: res.latitude, longitude: res.longitude },
          { latitude: targetLoc.latitude, longitude: targetLoc.longitude },
          150 // 150米内算到达
        )
        if (result.arrived) {
          this.unlockHiddenSteps()
        } else {
          wx.showModal({
            title: '还未到达',
            content: '距离目的地约 ' + result.distance + ' 米，到了再确认吧',
            showCancel: true,
            cancelText: '稍后',
            confirmText: '我确实到了',
            success: (modalRes) => {
              if (modalRes.confirm) {
                this.unlockHiddenSteps()
              }
            }
          })
        }
      },
      fail: () => {
        // 定位失败，降级为手动确认
        wx.showModal({
          title: '确认到达',
          content: '无法获取定位，确认你已经到达目的地了吗？',
          showCancel: true,
          cancelText: '还没到',
          confirmText: '确认到达',
          success: (modalRes) => {
            if (modalRes.confirm) {
              this.unlockHiddenSteps()
            }
          }
        })
      }
    })
  },

  // B2: 解锁隐藏步骤
  unlockHiddenSteps() {
    const allSteps = this.data.allSteps.slice()
    const phaseView = arrivalHelper.buildPhaseView(allSteps, true)
    try { wx.vibrateShort({ type: 'medium' }) } catch (e) {}
    this.setData({
      arrived: true,
      phase: 'after',
      steps: phaseView.steps,
      hiddenCount: 0,
      showArriveBtn: false
    })
    wx.showToast({ title: '隐藏任务解锁！', icon: 'none', duration: 1500 })
  },

  // v4: 手动点击「完成」第 i 步
  // 持久化：标记 done 时同步写入 cmd.executionProgress（含 completedAt 时间戳），落盘可续
  // B2: 同步更新 allSteps，完成时触发仪式感
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
    // B2: 同步更新 allSteps
    const allSteps = this.data.allSteps.slice()
    const mergedAll = executionProgress.mergeProgress(allSteps, cmd.executionProgress)
    this.setData({
      steps: merged.steps,
      allSteps: mergedAll.steps,
      doneCount: merged.doneCount,
      allDone: merged.allDone,
      currentStep: merged.currentStep
    })
    try { wx.vibrateShort({ type: 'light' }) } catch (e) {}
    // B2: 全部完成时触发仪式感
    if (merged.allDone) {
      this.setData({ showCompleteAnim: true })
      try { wx.vibrateShort({ type: 'heavy' }) } catch (e) {}
      wx.showToast({ title: '🎉 全部完成，留下印记', icon: 'none', duration: 1500 })
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
