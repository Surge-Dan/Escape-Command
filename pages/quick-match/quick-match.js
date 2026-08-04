// packageSync/pages/quick-match/quick-match.js
// B3 同频骰子 AI 快速匹配结果页
//
// 流程：
//   1. onLoad：从 globalData 读取用户偏好/位置/天气，调用 quick-match-engine
//   2. 加载中：骨架屏 + 文案「正在为你匹配最合适的任务和搭子...」
//   3. 加载完成：展示任务卡 + 搭子卡 + 主题标签
//   4. 操作：「换一换」（regenerate）/「开始出逃」（写入 currentCommand → 跳 executing）/「返回」
//   5. 数据埋点：进入/匹配成功/匹配失败/换一换/开始出逃/返回

const app = getApp()
const quickMatch = require('../../utils/quick-match-engine.js')
const tracker = require('../../utils/tracker.js')

Page({
  data: {
    statusBarHeight: 20,
    capsuleTop: 26,
    capsuleHeight: 32,
    navHeaderStyle: '',
    // 状态：loading / success / error
    status: 'loading',
    loadingText: '正在为你匹配最合适的任务和搭子…',
    // 匹配结果
    command: null,
    theme: null,
    partners: [],
    partnerCount: 0,
    expectedPartnerCount: 0,
    duration: 30,
    // 任务卡展示
    typeName: '',
    typeColor: '#5CBF9E',
    typeIcon: '',
    // 搭子卡展示
    partnersDisplay: [],
    // 错误信息
    errMsg: '',
    // 防重复点击
    isStarting: false,
    isRegenerating: false,
    // 匹配耗时
    matchDuration: 0,
    matchDurationLabel: '0ms'  // WXML 不支持 JS 表达式，在 JS 里预算
  },

  onLoad() {
    this.applyNavMetrics()
    tracker.track('quick_match_enter', { source: 'sync_dice' })
    this._startTime = Date.now()
    this.runMatch()
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

  // ===== 主匹配流程 =====
  runMatch(isRegenerate) {
    this.setData({
      status: 'loading',
      loadingText: isRegenerate ? '正在为你换一个任务…' : '正在为你匹配最合适的任务和搭子…',
      isRegenerating: !!isRegenerate
    })

    const gd = app.globalData
    const options = {
      userPrefs: gd.userPreferences || { type: {} },
      commandPool: gd.commandPool || [],
      completedIds: gd.completedCommandIds || [],
      duration: 30,
      hour: new Date().getHours(),
      weather: gd.weather || 'sunny',
      userLocation: gd.location || null,
      locationName: gd.locationName || '',
      nearbyPOI: gd.nearbyPOI || {}
    }

    // 当前用户（占位，云开发未启用时用本地身份）
    const user = {
      openId: gd.escapeCode || 'local_user',
      nickname: gd.escapeName || '我',
      avatar: gd.avatarUrl || '/assets/images/avatar.webp',
      interests: quickMatch.inferInterestsFromPrefs(gd.userPreferences),
      district: gd.currentCity || ''
    }

    // matcherCtx：云开发启用时注入 callFunction
    const matcherCtx = gd.cloudReady ? {
      callFunction: function (opts) {
        return wx.cloud.callFunction(opts)
      }
    } : null

    // 上一次 command（regenerate 时用于 lastType 去重）
    if (isRegenerate && this.data.command) {
      options.currentCommand = this.data.command
    }

    quickMatch.executeQuickMatch(options, user, matcherCtx)
      .then((result) => {
        const elapsed = Date.now() - this._startTime
        if (!result || !result.ok) {
          this.handleMatchFail(result, elapsed, isRegenerate)
          return
        }
        this.handleMatchSuccess(result, elapsed, isRegenerate)
      })
      .catch((err) => {
        const elapsed = Date.now() - this._startTime
        this.handleMatchFail({ errCode: 'EXCEPTION', errMsg: String(err) }, elapsed, isRegenerate)
      })
  },

  handleMatchSuccess(result, elapsed, isRegenerate) {
    const cmd = result.command
    const meta = this.getTypeMeta(cmd.type)
    const partnersDisplay = (result.partners || []).map((p, i) => ({
      openId: p.openId || ('p_' + i),
      nickname: p.nickname || '神秘搭子',
      avatar: p.avatar || '/assets/images/avatar.webp',
      bio: p.bio || '',
      isReal: !!p.isReal,
      index: i
    }))

    this.setData({
      status: 'success',
      command: cmd,
      theme: result.theme,
      partners: result.partners || [],
      partnersDisplay: partnersDisplay,
      partnerCount: result.partnerCount,
      expectedPartnerCount: result.expectedPartnerCount,
      duration: result.duration,
      typeName: meta.name,
      typeColor: cmd.typeColor || meta.color,
      typeIcon: meta.icon,
      matchDuration: elapsed,
      isRegenerating: false
    })

    tracker.track('quick_match_success', {
      command_id: cmd.id,
      command_type: cmd.type,
      theme: result.theme ? result.theme.id : '',
      partner_count: result.partnerCount,
      expected_partner_count: result.expectedPartnerCount,
      duration: result.duration,
      fallback: result.fallback === true,
      match_ms: elapsed,
      is_regenerate: !!isRegenerate
    })
  },

  handleMatchFail(result, elapsed, isRegenerate) {
    this.setData({
      status: 'error',
      errMsg: (result && result.errMsg) || '匹配失败，请重试',
      matchDuration: elapsed,
      matchDurationLabel: this.formatDuration(elapsed),
      isRegenerating: false
    })
    tracker.track('quick_match_fail', {
      err_code: result ? result.errCode : 'UNKNOWN',
      match_ms: elapsed,
      is_regenerate: !!isRegenerate
    })
  },

  // WXML 不支持 JS 表达式，把耗时预算成字符串
  formatDuration(ms) {
    const n = Number(ms) || 0
    if (n < 1000) return n + 'ms'
    return (n / 1000).toFixed(1) + 's'
  },

  // 兼容 constants.js 的 getTypeMeta
  getTypeMeta(type) {
    try {
      const { getTypeMeta } = require('../../utils/constants.js')
      return getTypeMeta(type)
    } catch (e) {
      return { name: '出逃', color: '#5CBF9E', icon: '/assets/icons/dice-5-brand-strong.svg' }
    }
  },

  // ===== 用户操作 =====
  onRegenerate() {
    if (this.data.isRegenerating || this.data.status !== 'success') return
    tracker.track('quick_match_regenerate', {
      command_id: this.data.command ? this.data.command.id : ''
    })
    this.runMatch(true)
  },

  onStartEscape() {
    if (this.data.isStarting || this.data.status !== 'success') return
    if (!this.data.command) return

    this.setData({ isStarting: true })
    tracker.track('quick_match_start_escape', {
      command_id: this.data.command.id,
      partner_count: this.data.partnerCount,
      theme: this.data.theme ? this.data.theme.id : ''
    })

    // 写入 currentCommand，复用 executing 页
    const cmd = Object.assign({}, this.data.command, {
      mode: 'quick_match',
      partners: this.data.partners,
      theme: this.data.theme,
      startTime: Date.now()
    })
    app.globalData.currentCommand = cmd
    app.saveCurrentCommand()

    wx.navigateTo({
      url: '/pages/executing/executing',
      fail: () => {
        this.setData({ isStarting: false })
        wx.showToast({ title: '跳转失败，请重试', icon: 'none' })
      }
    })
  },

  onRetry() {
    if (this.data.status === 'error') {
      this.runMatch(false)
    }
  },

  onBack() {
    tracker.track('quick_match_back', {
      status: this.data.status,
      match_ms: this.data.matchDuration
    })
    wx.navigateBack({
      fail: () => wx.switchTab({ url: '/pages/index/index' })
    })
  },

  onPartnerTap(e) {
    const idx = e.currentTarget.dataset.index
    const p = this.data.partnersDisplay[idx]
    if (!p) return
    tracker.track('quick_match_partner_tap', {
      partner_open_id: p.openId,
      is_real: p.isReal
    })
    wx.showToast({
      title: p.nickname + (p.isReal ? ' · 真实玩家' : ' · AI 搭子'),
      icon: 'none',
      duration: 1500
    })
  }
})
