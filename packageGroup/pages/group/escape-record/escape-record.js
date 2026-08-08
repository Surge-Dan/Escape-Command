// pages/group/escape-record/escape-record.js
// v11: 多人剧本执行页 —— 承接房间页「确认剧本，开始出逃」后的完整流程
// 功能：展示剧本步骤、计时器、手动完成每步、底部「完成出逃」按钮

const app = getApp()
const roomStore = require('../../../utils/group-room-store.js')
// execution-progress.js 是主包文件（executing 页也用），分包通过相对路径退到主包根 require
// 修复：原 '../../../utils/execution-progress.js' 指向 packageSync/utils/（无此文件）导致 require 失败页面白屏
const executionProgress = require('../../../utils/execution-progress.js')

Page({
  data: {
    statusBarHeight: 20,
    navHeaderStyle: '',
    roomId: '',
    script: null,
    startTime: 0,
    duration: 60,
    // 步骤（v11: 同 executing 页 —— {id, text, done}）
    steps: [],
    currentStep: 0,
    doneCount: 0,
    allDone: false,
    // 计时
    elapsedMinutes: 0,
    progressPct: 0,
    remainMin: 0,
    timer: null,
    isHostView: true
  },

  onLoad(options) {
    this.applyNavMetrics()
    const roomId = (options && options.roomId) || ''
    this.setData({ roomId })
    if (roomId) {
      this.loadScript(roomId)
    } else {
      // 没有 roomId —— 从 storage 取全局 currentGroupScript
      this.loadFromGlobal()
    }
  },

  onUnload() {
    // 切后台/卸载前保存进度，应对进程被清除后冷启动恢复
    const cg = app.globalData.currentGroupScript
    if (cg) { try { wx.setStorageSync('currentGroupScript', cg) } catch (e) {} }
    this.stopTimer()
  },

  // 切后台/锁屏时保存进度（覆盖切应用/锁屏场景，冷启动可续）
  onHide() {
    const cg = app.globalData.currentGroupScript
    if (cg) { try { wx.setStorageSync('currentGroupScript', cg) } catch (e) {} }
  },

  applyNavMetrics() {
    const nav = app.getNavMetrics ? app.getNavMetrics() : {}
    this.setData({
      statusBarHeight: nav.statusBarHeight || 20,
      navHeaderStyle: nav.navHeaderStyle || ''
    })
  },

  // ===== 加载剧本 =====
  loadScript(roomId) {
    const result = roomStore.loadRoom(roomId)
    if (result.ok && result.room && result.room.script) {
      this.applyScript(result.room.script, result.room)
    } else {
      this.loadFromGlobal()
    }
  },

  loadFromGlobal() {
    // 优先从 app 全局取（房间页跳转前写入）；冷启动 globalData 丢失则从 storage 恢复
    let data = app.globalData.currentGroupScript
    if (!data || !data.script) {
      try { data = wx.getStorageSync('currentGroupScript') } catch (e) { data = null }
    }
    if (data && data.script) {
      // 传入持久化的 executionProgress + startTime，实现断点续做
      this.applyScript(data.script, data.room || null, data.executionProgress, data.startTime)
    } else {
      // 兜底：currentGroupScript 已清空（完成出逃后从 record 页返回），回首页避免空白
      wx.switchTab({ url: '/pages/index/index' })
    }
  },

  applyScript(script, room, prevProgress, prevStartTime) {
    const steps = (script.steps || []).map((s, i) => ({
      id: i + 1,
      text: typeof s === 'object' ? (s.text || '') : String(s || ''),
      done: false
    }))
    // 进度持久化：有匹配的 prevProgress 则恢复，否则初始化
    let progress
    if (prevProgress && Array.isArray(prevProgress.steps) && prevProgress.steps.length === steps.length) {
      progress = prevProgress
    } else {
      progress = executionProgress.initProgress(script.steps || [])
    }
    const merged = executionProgress.mergeProgress(steps, progress)
    // startTime 持久化：断点续做时保留首次开始时间，计时连续不重置
    const startTime = (typeof prevStartTime === 'number' && prevStartTime > 0) ? prevStartTime : Date.now()
    const duration = script.duration || 60
    const isHostView = !room || (room.members && room.members[0] && room.members[0].isHost !== false)
    this.setData({
      script,
      steps: merged.steps,
      currentStep: merged.currentStep,
      doneCount: merged.doneCount,
      allDone: merged.allDone,
      startTime,
      duration,
      isHostView
    })
    // 落盘到 app 全局 + storage，冷启动可续
    app.globalData.currentGroupScript = { script, room, executionProgress: progress, startTime }
    try { wx.setStorageSync('currentGroupScript', app.globalData.currentGroupScript) } catch (e) {}
    this.startTimer()
  },

  // ===== 计时器 =====
  startTimer() {
    this.stopTimer()
    this.tickTimer()
    this.timer = setInterval(() => this.tickTimer(), 1000)
  },

  stopTimer() {
    if (this.timer) clearInterval(this.timer)
    this.timer = null
  },

  tickTimer() {
    const elapsed = Math.max(0, Math.floor((Date.now() - this.data.startTime) / 1000))
    const durationSec = Math.max(1, this.data.duration * 60)
    const pct = Math.min(100, Math.round(elapsed / durationSec * 100))
    this.setData({
      elapsedMinutes: Math.floor(elapsed / 60),
      progressPct: pct,
      remainMin: Math.max(0, Math.ceil((durationSec - elapsed) / 60))
    })
  },

  // ===== 步骤操作 =====
  // 持久化：标记 done 时同步写入 currentGroupScript.executionProgress（含 completedAt），落盘可续
  onStepTap(e) {
    const index = Number(e.currentTarget.dataset.index)
    const steps = this.data.steps.slice()
    if (!steps[index] || steps[index].done) return
    const cg = app.globalData.currentGroupScript
    if (!cg) return
    cg.executionProgress = executionProgress.markStepDone(cg.executionProgress, index)
    try { wx.setStorageSync('currentGroupScript', cg) } catch (e) {}
    const merged = executionProgress.mergeProgress(steps, cg.executionProgress)
    this.setData({
      steps: merged.steps,
      doneCount: merged.doneCount,
      allDone: merged.allDone,
      currentStep: merged.currentStep
    })
    try { wx.vibrateShort({ type: 'light' }) } catch (e) {}
    if (merged.allDone) {
      wx.showToast({ title: '全部完成，可以出逃了', icon: 'none', duration: 1200 })
    }
  },

  // ===== 完成出逃 =====
  // v12: 改跳 record 拍照打卡页（与普通出逃一致），补齐「拍照打卡」环节
  // 原实现直接 completeCommand + 弹窗，绕过了 record 页，导致用户反馈「拍照打卡页面不见了」
  // 现在构造 currentCommand（同频扩展字段挂在 cmd 上）→ 跳 record 页 → record 页 onSave 触发 completeCommand
  onFinish() {
    if (!this.data.allDone) {
      wx.showToast({ title: '先把所有步骤完成再出逃', icon: 'none', duration: 1500 })
      return
    }
    this.stopTimer()
    const script = this.data.script || {}
    const startTime = this.data.startTime || Date.now()
    const cg = app.globalData.currentGroupScript
    // 构造 currentCommand：同频扩展字段挂在 cmd 上，completeCommand 自动注入到 record
    // 与普通出逃走同一 record 页入口，确保 globalData.records / 连续天数 / 徽章 / 偏好 / 地图联动一致
    app.globalData.currentCommand = {
      id: 'group_' + (this.data.roomId || Date.now()),
      title: script.title || '同频出逃',
      content: script.title || '同频出逃',
      type: 'sync',
      typeColor: '#5CBF9E',
      duration: Math.max(1, Math.round((Date.now() - startTime) / 60000)),
      startTime: startTime,
      photos: [],
      // 同频扩展字段（record 页 onSave 调 completeCommand 时自动注入）
      isGroup: true,
      groupId: this.data.roomId,
      members: script.members || [],
      steps: (this.data.steps || []).map(s => s.text),
      // 留痕：每步 completedAt，供 buildRecord 生成 [{text, completedAt}]
      executionProgress: (cg && cg.executionProgress) || null
    }
    app.globalData.commandStatus = 'executing'
    // 清空同频临时数据（record 页不依赖 currentGroupScript，冷启动也不再续做）
    try { app.globalData.currentGroupScript = null } catch (e) {}
    try { wx.removeStorageSync('currentGroupScript') } catch (e) {}
    // 跳 record 拍照打卡页（与普通出逃一致），由 record 页 onSave 触发 completeCommand
    wx.navigateTo({ url: '/pages/record/record' })
  },

  // ===== 返回 =====
  onBackTap() {
    wx.showModal({
      title: '还在出逃中，确定离开？',
      content: '当前进度不会保存',
      confirmText: '离开',
      cancelText: '继续出逃',
      confirmColor: '#D98A5C',
      success: (res) => {
        if (res.confirm) {
          this.stopTimer()
          wx.switchTab({ url: '/pages/index/index' })
        }
      }
    })
  },

  getTodayStr() {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  },

  getTimeStr() {
    const d = new Date()
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  }
})
