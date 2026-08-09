const app = getApp()
const { DEFAULT_STEPS, getTypeMeta } = require('../../utils/constants.js')
// 执行进度持久化（中途退出/锁屏/进程清除后可续，每步 completedAt 留痕）
const executionProgress = require('../../utils/execution-progress.js')
// B-安全: 安全与信任体系（PRD §15）—— 纯函数，零 wx 依赖
const safetyTip = require('../../utils/safety-tip.js')
// 安全合规工具（B1：紧急退出/位置分享/紧急联系）
const safetyHelper = require('../../utils/safety-helper.js')
// 到达确认工具（B2：阶段感设计/隐藏任务解锁）
const arrivalHelper = require('../../utils/arrival-helper.js')
const imageFallback = require('../../utils/image-fallback.js')

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
    // B-安全: 安全提示卡状态（PRD §15 基础安全原则）
    safety: {
      tip: { title: '', content: '', level: 'info', action: 'continue' },
      pause: { blocked: false, reason: '' },
      exit: { title: '紧急退出', hint: '', confirmText: '确认退出' }
    },
    // B2 阶段感设计
    arrived: false,
    phase: 'before',
    hiddenCount: 0,
    showArriveBtn: false,
    allSteps: [],
    showCompleteAnim: false
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
// B-安全: 综合时间/天气/任务类型/同频状态构造安全状态
    const safety = safetyTip.buildSafetyState({
      hour: app.getCurrentHour(),
      weather: app.globalData.weather || null,
      commandType: cmd.type,
      isGroup: cmd.isGroup === true,
      outdoor: cmd.outdoor !== false,
      partners: cmd.isGroup ? '同频成员' : '独自出逃',
      distanceKm: Number((cmd.distance || '').toString().replace(/[^0-9.]/g, '')) || 0
    })
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
      safety: safety,
      arrived: false,
      phase: phaseView.phase,
      hiddenCount: phaseView.hiddenCount,
      showArriveBtn: arrivalHelper.shouldShowArriveBtn(merged.steps, false)
    })
    this.startTimer()
    // 极端天气阻断：户外任务在极端天气下提示暂停（不强制关闭页面，给用户选择权）
    if (safety.pause.blocked) {
      wx.showModal({
        title: '安全提示',
        content: safety.pause.reason,
        showCancel: true,
        confirmText: '去室内',
        cancelText: '继续出逃',
        success: (res) => {
          if (res.confirm) this.emergencyExit()
        }
      })
    }
  },

  onUnload() {
    // 切后台/卸载前保存进度，应对进程被清除后冷启动恢复
    const cmd = app.globalData.currentCommand
    if (cmd && cmd.executionProgress) app.saveCurrentCommand()
    this.stopTimer()
  },

  // 切后台/锁屏时保存进度并停计时器（避免后台 setInterval 持续 setData 浪费性能）
  onHide() {
    const cmd = app.globalData.currentCommand
    if (cmd && cmd.executionProgress) app.saveCurrentCommand()
    this.stopTimer()
  },

  // 回前台：校验 currentCommand 是否还在，避免从 record 页返回后停留在已完成的执行页
  onShow() {
    const cmd = app.globalData.currentCommand
    if (!cmd) {
      // currentCommand 已被 completeCommand/abandonCommand 清空，跳回首页避免状态错乱
      wx.switchTab({ url: '/pages/index/index' })
      return
    }
    // 恢复计时器（onHide 已停止）
    this.startTimer()
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
    // startTime 兜底：个别入口（旧版骰子流程）可能未走 app.startCommand 注入 startTime，
    // 缺失时 Date.now()-undefined=NaN → 分钟显示 null。此处兜底为当前时间，保证计时不崩。
    const startTime = cmd.startTime || Date.now()
    const elapsed = Math.max(0, Math.floor((Date.now() - startTime) / 1000))
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

  onImgError(e) { imageFallback.handle(e, this) },

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
  },

  // B-安全: 紧急退出（PRD §15.1「支持一键结束任务」）
  // 二次确认，避免误触；执行后保留已完成的步骤（持久化在 storage），下次可继续
  emergencyExit() {
    const exit = this.data.safety.exit
    wx.showModal({
      title: exit.title,
      content: exit.hint,
      confirmText: exit.confirmText,
      cancelText: '再想想',
      confirmColor: '#E07A5F',
      success: (res) => {
        if (!res.confirm) return
        // 调用方页已有 progress 持久化，abandonCommand 只清 currentCommand/status
        // executionProgress 已落盘在 storage.currentCommand 内，下次相同 taskId 可恢复
        app.abandonCommand()
        try { wx.vibrateShort({ type: 'medium' }) } catch (e) {}
        wx.switchTab({ url: '/pages/index/index' })
      }
    })
  },

  // B-安全: 分享位置（PRD §15.1「支持分享位置」）
  // 优先用 wx.openLocation 展示当前位置；无定位时回退到 onShareAppMessage 文本分享
  shareLocation() {
    const cmd = app.globalData.currentCommand || {}
    const loc = (cmd.location && cmd.location.latitude && cmd.location.longitude)
      ? cmd.location
      : (app.globalData.location || null)
    if (loc && typeof loc.latitude === 'number') {
      const payload = safetyTip.buildShareLocationPayload(loc, app.globalData.escapeName)
      if (payload.ok && typeof wx.openLocation === 'function') {
        wx.openLocation({
          latitude: payload.payload.latitude,
          longitude: payload.payload.longitude,
          scale: payload.payload.scale,
          name: payload.payload.name,
          address: payload.payload.address,
          fail: () => {
            // 基础库不支持 openLocation 时回退到分享卡片
            wx.showToast({ title: '已生成分享卡片', icon: 'none' })
            this.shareToFriend()
          }
        })
        return
      }
    }
    // 无定位：触发右上角分享按钮提示
    wx.showToast({ title: '点击右上角 ··· 分享给朋友', icon: 'none', duration: 2000 })
  },

  // 内部：触发分享卡片（onShareAppMessage）
  shareToFriend() {
    if (wx.showShareMenu) {
      wx.showShareMenu({ withShareTicket: true, menus: ['shareAppMessage', 'shareTimeline'] })
    }
  },

  // B-安全: 转发分享卡片 —— 带 escapeName + 指令标题
  onShareAppMessage() {
    const cmd = this.data.command || {}
    const card = safetyTip.buildShareCardPayload(app.globalData.escapeName, cmd.title)
    return {
      title: card.payload.title,
      path: card.payload.path
    }
  }
})
