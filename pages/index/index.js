const app = getApp()
const { MODE_LIST, SHEET_MODES, HOME_DICE_LIST, getTypeMeta } = require('../../utils/constants.js')

Page({
  data: {
    statusBarHeight: 20,
    capsuleTop: 26,
    navHeaderStyle: '',
    fontLoaded: false,
    selectedMode: 'smart',
    sheetModes: SHEET_MODES,
    currentModeMeta: SHEET_MODES[0],
    modes: MODE_LIST,
    rolling: false,
    isBouncing: false,
    selectedCommand: null,
    collected: false,
    greetingText: '早安',
    locationText: '当前位置附近',
    weatherText: '',
    heroEmphasis: '今天',
    heroTail: '出去走走',
    weekdayText: '周一',
    dateText: '今日',
    collectedCount: 0,
    remainCount: 3,
    showBadgeEarned: false,
    earnedBadges: [],
    invitedByFriend: false,
    friendRollHint: false,
    heroColor: '#5B8FB9',
    heroScene: '/packageBt/images/color-scene.webp',
    heroDesc: '选个时长，给城市一个随机出口',
    nightHint: false,
    dailyRecommend: [],
    lastRecord: null,
    recentRecords: [],
    diceList: [
      { id: 'micro',       name: '微出逃',   icon: '/assets/icons/sprout-brand-strong.svg',  color: '#7BAE7F', desc: '碎片时间，快速出逃', prefix: 'dice-red' },
      { id: 'sync',        name: '同频组局', icon: '/assets/icons/dice-5-brand-strong.svg', color: '#5CBF9E', desc: '约上朋友，一起出逃', prefix: 'dice-green' },
      { id: 'breakthrough', name: '破圈出逃', icon: '/assets/icons/breakthrough-dice-purple.svg', color: '#9B7BB8', desc: '做一件平时不会做的事', prefix: 'dice-purple' }
    ],
    currentDiceIndex: 0,
    isSliding: false,
    touchStartX: 0,
    isRolling: false,
    showMicroSheet: false,
    selectedDuration: 0,
    recommendedDuration: 0,
    isRecommended: false,
    showDiceSheet: false,
    // v16: 控制 TabBar 显隐，弹出骰子/任务弹窗时隐藏让弹窗可贴底
    tabbarHidden: false,
    showLegacyDice: false,
    breakthroughRemainCount: 5,
    isBreakthroughRolling: false,
    heroSubText: '用15分钟，给城市一个随机出口',
    theme: 'default',
    currentModeName: '微出逃',
    dicePositions: { micro: 'center', sync: 'right', breakthrough: 'left' },
    currentDiceFace: {
      // v2 风格：直接使用主包内的高清 3D 骰子（避免分包加载时序问题）
      micro: '/assets/dice/dice-red-3d.png',
      breakthrough: '/assets/dice/dice-purple-3d.png',
      sync: '/assets/dice/dice-green-3d.png'
    },
    _diceImgRetry: 0,
    _dicePkgReady: 0,
    _diceImgLoaded: {},
    // 备用：分包内的高清骰子（预加载完成后可使用）
    _diceFaceFallback: {
      micro: '/packageDice/images/dice-red-3d.png',
      breakthrough: '/packageDice/images/dice-purple-3d.png',
      sync: '/packageDice/images/dice-green-3d.png'
    }
  },

  _autoSwitchTimer: null,

  onLoad(options) {
    this.applyNavMetrics()
    // 首屏显示前先等待 3D 骰子分包预加载完成
    this._preloadDicePkg()
    const localOnboarded = wx.getStorageSync('onboarded')
    if (!localOnboarded && !app.globalData.onboarded) {
      app.globalData.onboarded = false
      this._redirecting = true
      setTimeout(() => {
        wx.reLaunch({
          url: '/pages/onboarding/onboarding',
          fail: () => {
            this._redirecting = false
            this.refreshState()
          }
        })
      }, 0)
      return
    }
    if (localOnboarded && !app.globalData.onboarded) {
      app.globalData.onboarded = true
    }
    this._redirecting = false
    this.checkNightMode()
    this.refreshState()
    this.updateDicePositions()
    this.startAutoSwitch()
    this.loadEscapeRecords()
    this.loadDailyRecommend()
    this.loadFontFace()
    this.restoreLastDiceIndex()
    if (app.preloadBreakthroughPool) app.preloadBreakthroughPool()
    if (options && options.mode === 'double' && options.cmd) this.applyInvitation(options.cmd)
    if (options && options.rollForFriend === '1' && options.cmd) {
      this.applyFriendRoll(options.cmd)
    }
  },

  // 预加载 3D 骰子分包（首屏显示前必须完成）
  _preloadDicePkg() {
    if (typeof wx.loadSubpackage !== 'function') return
    wx.loadSubpackage({ root: 'packageDice' }).then(() => {
      console.log('[index] packageDice 预加载完成')
      // 触发一次 setData 让 image 重新请求分包资源
      this.setData({ _dicePkgReady: Date.now() })
    }).catch((e) => {
      console.warn('[index] packageDice 预加载失败：', e)
    })
  },

  // 骰子图片加载成功（埋点用）
  onDiceImgLoad(e) {
    const diceId = e.currentTarget?.dataset?.diceId
    if (diceId) {
      this.setData({ [`_diceImgLoaded.${diceId}`]: true })
    }
  },

  // 骰子图片加载失败时降级到分包路径
  onDiceImgError(e) {
    const diceId = e.currentTarget?.dataset?.diceId
    console.warn('[index] 骰子图片加载失败，尝试降级：', diceId, e.detail?.errMsg)
    if (!diceId) return
    // 已经降级到分包路径了，不再降级
    const cur = this.data.currentDiceFace[diceId]
    const fallback = this.data._diceFaceFallback && this.data._diceFaceFallback[diceId]
    if (!fallback) return
    if (cur === fallback) {
      // 已经在分包路径了，记录日志不再降级
      console.error('[index] 骰子图片分包路径也加载失败：', diceId, fallback)
      return
    }
    // 第一次失败：降级到分包英文路径（兼容 iOS 中文路径解析问题）
    const next = Object.assign({}, this.data.currentDiceFace, { [diceId]: fallback })
    this.setData({ currentDiceFace: next, _diceImgRetry: Date.now() })
  },

  applyFriendRoll(cmdId) {
    const decodedId = decodeURIComponent(cmdId)
    const pool = app.globalData.commandPool || []
    const cmd = pool.find(c => c.id === decodedId)
    if (!cmd) {
      wx.showToast({ title: '朋友摇的指令已失效，自己摇一个吧', icon: 'none', duration: 2500 })
      return
    }
    const meta = getTypeMeta(cmd.type)
    this._setSelectedCommand(
      Object.assign({}, cmd, {
        typeName: meta.name,
        typeColor: cmd.typeColor || meta.color,
        typeIcon: meta.icon,
        illustration: cmd.illustration || meta.scene
      }),
      { friendRollHint: true }
    )
    try {
      const tracker = require('../../utils/tracker.js')
      tracker.track('friend_roll_receive', { cmdId: decodedId })
    } catch (e) {}
  },

  restoreLastDiceIndex() {
    try {
      const last = wx.getStorageSync('lastDiceIndex')
      const list = this.data.diceList || []
      if (typeof last === 'number' && last >= 0 && last < list.length) {
        this.setData({ currentDiceIndex: last }, () => {
          this.updateDicePositions()
          this.updateHeroByDice()
        })
      }
    } catch (e) {}
  },

  loadFontFace() {
    // 如果全局已加载成功，直接标记
    if (app.globalData.serifFontLoaded) {
      this.setData({ fontLoaded: true })
      return
    }
    // 全局未成功 → 页面级重试加载（不设 global，对当前页面生效）
    if (typeof wx.loadFontFace === 'function') {
      wx.loadFontFace({
        family: 'SourceHanSerifBold',
        source: 'url("/assets/fonts/noto-serif-sc-bold-titles.woff2")',
        success: () => {
          console.log('[index] SourceHanSerifBold 页面级加载成功')
          app.globalData.serifFontLoaded = true
          app.globalData.serifFontFamily = 'SourceHanSerifBold'
          this.setData({ fontLoaded: true })
        },
        fail: (e) => {
          console.warn('[index] 页面级字体加载失败，降级到系统 serif', e)
          this.setData({ fontLoaded: true })
        }
      })
    } else {
      this.setData({ fontLoaded: true })
    }
  },

  applyInvitation(cmdId) {
    const pool = app.globalData.commandPool || []
    const cmd = pool.find(c => c.id === cmdId)
    if (!cmd) return
    const meta = getTypeMeta(cmd.type)
    this._setSelectedCommand(
      Object.assign({}, cmd, {
        typeName: meta.name,
        typeColor: cmd.typeColor || meta.color,
        typeIcon: meta.icon,
        illustration: cmd.illustration || meta.scene
      }),
      { selectedMode: 'double', invitedByFriend: true }
    )
  },

  onShow() {
    if (this._redirecting) return
    this.applyNavMetrics()
    this.setData({ theme: app.globalData.theme || 'default' })
    this.refreshState()
    this.loadEscapeRecords()
    this.loadDailyRecommend()
    // 字体重试：onShow 时检查全局字体是否已加载，未加载则页面级重试
    if (!app.globalData.serifFontLoaded) this.loadFontFace()
    if (typeof this.getTabBar === 'function' && this.getTabBar()) this.getTabBar().setData({ selected: 0, tabbarHidden: false })
    if (this.data.selectedCommand && !app.globalData.currentCommand) {
      this._setSelectedCommand(null)
    }
    this.resetDiceFace()
    this.startAutoSwitch()
  },

  onHide() {
    this.stopAutoSwitch()
  },

  onUnload() {
    this.stopAutoSwitch()
  },

  applyNavMetrics() {
    const nav = app.getNavMetrics ? app.getNavMetrics() : {}
    this.setData({
      statusBarHeight: nav.statusBarHeight || 20,
      capsuleTop: nav.capsuleTop || 26,
      navHeaderStyle: nav.navHeaderStyle || ''
    })
  },

  refreshState() {
    const gd = app.globalData
    const greetingData = this.buildGreeting()
    this.setData({
      greetingText: greetingData.text,
      locationText: greetingData.location,
      weatherText: greetingData.weather,
      heroEmphasis: greetingData.emphasis,
      heroTail: greetingData.tail,
      weekdayText: greetingData.weekday,
      dateText: greetingData.dateText,
      collectedCount: (gd.collectedCommands || []).length,
      remainCount: gd.reRollCount,
      breakthroughRemainCount: gd.breakthroughReRollCount
    })
    this.updateHeroByDice()
  },

  buildGreeting() {
    const hour = app.getCurrentHour ? app.getCurrentHour() : new Date().getHours()
    const now = new Date()
    const month = now.getMonth() + 1
    const date = now.getDate()
    const weekdayNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
    const weekday = weekdayNames[now.getDay()]
    const dateText = `${month}月${date}日 · ${weekday}`

    let text = '你好'
    let emphasis = '今天'
    let tail = '出去走走'

    if (hour >= 6 && hour < 11) {
      text = '早安'; emphasis = '清晨'; tail = '适合出发'
    } else if (hour >= 11 && hour < 14) {
      text = '午安'; emphasis = '午后'; tail = '散个步吧'
    } else if (hour >= 14 && hour < 18) {
      text = '下午好'; emphasis = '离开'; tail = '工位一会儿'
    } else if (hour >= 18 && hour < 22) {
      text = '晚上好'; emphasis = '夜色'; tail = '正好漫游'
    } else {
      text = '晚安'; emphasis = '安静'; tail = '地晃一晃'
    }

    const weather = app.globalData.weather || {}
    const location = app.globalData.locationName || '当前位置附近'
    const temp = weather.temperature || 26
    const desc = weather.description || '晴'
    return { text, location, weather: `${temp}℃ ${desc}`, emphasis, tail, weekday, dateText }
  },

  checkNightMode() {
    const hour = app.getCurrentHour ? app.getCurrentHour() : new Date().getHours()
    const isNight = hour >= 21 || hour < 4
    this.setData({ nightHint: isNight })
  },

  noop() {},

  resetDiceFace() {
    // 固定显示透明3D斜角图，无需切换
  },

  updateDicePositions() {
    const idx = this.data.currentDiceIndex
    const list = this.data.diceList
    const positions = {}
    list.forEach((d, i) => {
      let pos = 'center'
      if (i === idx) pos = 'center'
      else if ((i - idx + list.length) % list.length === 1) pos = 'right'
      else pos = 'left'
      positions[d.id] = pos
    })
    this.setData({ dicePositions: positions })
  },

  updateHeroByDice() {
    const idx = this.data.currentDiceIndex
    const dice = this.data.diceList[idx]
    if (!dice) return
    let subText = ''
    let modeName = ''
    if (dice.id === 'micro') {
      subText = '用15分钟，给城市一个随机出口'
      modeName = '微出逃'
    } else if (dice.id === 'breakthrough') {
      subText = '做一件平时不会做的事'
      modeName = '破圈出逃'
    } else {
      subText = '约上朋友，一起出逃'
      modeName = '同频组局'
    }
    this.setData({ heroSubText: subText, currentModeName: modeName })
  },

  startAutoSwitch() {
    this.stopAutoSwitch()
    this._autoSwitchTimer = setInterval(() => {
      if (this.data.isRolling || this.data.isSliding || this.data.selectedCommand || this.data.showDiceSheet) return
      this.switchToNext()
    }, 3000)
  },

  stopAutoSwitch() {
    if (this._autoSwitchTimer) {
      clearInterval(this._autoSwitchTimer)
      this._autoSwitchTimer = null
    }
  },

  switchToNext() {
    const len = this.data.diceList.length
    const next = (this.data.currentDiceIndex + 1) % len
    this.setData({ currentDiceIndex: next, isSliding: true }, () => {
      this.updateDicePositions()
      this.updateHeroByDice()
      this.resetDiceFace()
      try { wx.setStorageSync('lastDiceIndex', next) } catch (e) {}
      setTimeout(() => this.setData({ isSliding: false }), 400)
    })
  },

  switchToPrev() {
    const len = this.data.diceList.length
    const prev = (this.data.currentDiceIndex - 1 + len) % len
    this.setData({ currentDiceIndex: prev, isSliding: true }, () => {
      this.updateDicePositions()
      this.updateHeroByDice()
      this.resetDiceFace()
      try { wx.setStorageSync('lastDiceIndex', prev) } catch (e) {}
      setTimeout(() => this.setData({ isSliding: false }), 400)
    })
  },

  onTouchStart(e) {
    if (!e.touches || !e.touches.length) return
    this.data.touchStartX = e.touches[0].clientX
    this._touchMoved = false
    this.stopAutoSwitch()
  },

  onTouchEnd(e) {
    this.startAutoSwitch()
    if (this.data.isSliding) return
    if (!e.changedTouches || !e.changedTouches.length) return
    const endX = e.changedTouches[0].clientX
    const dx = endX - this.data.touchStartX
    if (Math.abs(dx) < 50) return
    this._touchMoved = true
    this.setData({ isSliding: true })
    try { wx.vibrateShort({ type: 'light' }) } catch (e) {}
    if (dx < 0) {
      this.switchToNext()
    } else {
      this.switchToPrev()
    }
  },

  onDiceTap(e) {
    if (this._touchMoved) { this._touchMoved = false; return }
    if (this.data.isSliding) return
    if (this.data.isRolling) return
    const index = Number(e.currentTarget.dataset.index)
    const dice = this.data.diceList[index]
    if (!dice) return

    if (index === this.data.currentDiceIndex) {
      this.doRoll(dice)
    } else {
      this.stopAutoSwitch()
      this.setData({ currentDiceIndex: index, isSliding: true }, () => {
        this.updateDicePositions()
        this.updateHeroByDice()
        this.resetDiceFace()
        try { wx.setStorageSync('lastDiceIndex', index) } catch (e) {}
        try { wx.vibrateShort({ type: 'light' }) } catch (e) {}
        setTimeout(() => {
          this.setData({ isSliding: false })
          this.startAutoSwitch()
        }, 400)
      })
    }
  },

  onRollTap() {
    if (this._touchMoved) { this._touchMoved = false; return }
    if (this.data.isSliding) return
    if (this.data.isRolling) return
    const index = this.data.currentDiceIndex
    const dice = this.data.diceList[index]
    if (!dice) return
    this.doRoll(dice)
  },

  doRoll(dice) {
    this.stopAutoSwitch()
    try { wx.vibrateShort({ type: 'medium' }) } catch (e) {}
    this.routeDice(dice)
  },

  // v16: 统一管理骰子弹窗的显隐 + 同步 TabBar 显隐（通过 getTabBar 控制）
  _setDiceSheetVisible(visible, extra) {
    this.setData(Object.assign(
      { showDiceSheet: visible },
      extra || {}
    ))
    // 框架自动注入的 TabBar 实例，通过 getTabBar 控制
    const tabBar = typeof this.getTabBar === 'function' ? this.getTabBar() : null
    if (tabBar) tabBar.setData({ tabbarHidden: visible })
  },

  // v17: 统一管理指令卡(cmd-sheet)的显隐 + 同步 TabBar 显隐
  // cmd-sheet 是指令详情卡片（普通指令 / 破圈指令 / 朋友邀请共用），
  // 弹出时必须隐藏 TabBar，否则卡片会被遮挡
  _setSelectedCommand(cmd, extra) {
    const hasCmd = !!cmd
    this.setData(Object.assign(
      {
        selectedCommand: cmd,
        collected: false
      },
      extra || {}
    ))
    const tabBar = typeof this.getTabBar === 'function' ? this.getTabBar() : null
    if (tabBar) tabBar.setData({ tabbarHidden: hasCmd })
  },

  routeDice(dice) {
    if (dice.id === 'micro') {
      wx.navigateTo({ url: '/pages/dice-micro-7d/dice-micro-7d' })
    } else if (dice.id === 'breakthrough') {
      this.rollBreakthroughCommand()
    } else if (dice.id === 'sync') {
      this._setDiceSheetVisible(true)
    }
  },

  onDiceSheetMaskTap() {
    this._setDiceSheetVisible(false)
    this.resetDiceFace()
    this.startAutoSwitch()
  },

  onDiceSheetClose() {
    this._setDiceSheetVisible(false)
    this.resetDiceFace()
    this.startAutoSwitch()
  },

  onInviteFriendsTap() {
    this._setDiceSheetVisible(false)
    wx.navigateTo({ url: '/packageGroup/pages/group/create/create' })
  },

  onEnterHallTap() {
    this._setDiceSheetVisible(false)
    wx.navigateTo({ url: '/packageGroup/pages/group/hall/hall' })
  },

  onQuickMatchTap() {
    this._setDiceSheetVisible(false)
    wx.navigateTo({ url: '/pages/quick-match/quick-match' })
  },

  onDiceSwiperChange(e) {
    const index = e.detail.current
    this.setData({ currentDiceIndex: index }, () => {
      this.updateDicePositions()
      this.updateHeroByDice()
      this.refreshState()
    })
  },

  onDiceIndicatorTap(e) {
    const index = Number(e.currentTarget.dataset.index)
    if (index === this.data.currentDiceIndex) return
    this.stopAutoSwitch()
    this.setData({ currentDiceIndex: index, isSliding: true }, () => {
      this.updateDicePositions()
      this.updateHeroByDice()
      this.resetDiceFace()
      try { wx.setStorageSync('lastDiceIndex', index) } catch (e) {}
      try { wx.vibrateShort({ type: 'light' }) } catch (e) {}
      setTimeout(() => {
        this.setData({ isSliding: false })
        this.startAutoSwitch()
      }, 400)
    })
  },

  rollBreakthroughCommand() {
    if (this.data.rolling || this.data.selectedCommand || this.data.isBreakthroughRolling) return
    if (this.data.breakthroughRemainCount <= 0) {
      wx.showToast({ title: '今日破圈次数已用完，明天再来', icon: 'none', duration: 2000 })
      return
    }
    this.setData({ isBreakthroughRolling: true, isBouncing: true })
    try { wx.vibrateShort({ type: 'light' }) } catch (e) {}
    setTimeout(() => {
      app.rollBreakthroughCommand((cmd) => {
        if (!cmd) {
          this.setData({ isBreakthroughRolling: false, isBouncing: false })
          wx.showToast({ title: '今天先休息一下', icon: 'none' })
          return
        }
        app.useBreakthroughReroll()
        this.refreshState()
        const meta = getTypeMeta(cmd.type)
        this._setSelectedCommand(
          Object.assign({}, cmd, {
            typeName: meta.name,
            typeColor: cmd.typeColor || meta.color,
            typeIcon: meta.icon,
            illustration: cmd.illustration || meta.scene
          }),
          { rolling: false, isBouncing: false, isBreakthroughRolling: false }
        )
        if (app.playSound) app.playSound('shake')
        this.refreshState()
      })
    }, 300)
  },

  rollCommand() {
    if (this.data.rolling || this.data.selectedCommand) return
    this.setData({ rolling: true, isBouncing: true, collected: false })
    setTimeout(() => {
      const cmd = app.rollCommand(this.data.selectedMode)
      if (!cmd) {
        this.setData({ rolling: false, isBouncing: false })
        wx.showToast({ title: '今天先休息一下', icon: 'none' })
        return
      }
      const meta = getTypeMeta(cmd.type)
      this._setSelectedCommand(
        Object.assign({}, cmd, {
          typeName: meta.name,
          typeColor: cmd.typeColor || meta.color,
          typeIcon: meta.icon,
          illustration: cmd.illustration || meta.scene
        }),
        { rolling: false, isBouncing: false }
      )
      if (app.playSound) app.playSound('shake')
      this.refreshState()
    }, 200)
  },

  reroll(e) {
    if (e && e.stopPropagation) e.stopPropagation()
    const curDice = this.data.diceList[this.data.currentDiceIndex]
    if (curDice && curDice.id === 'breakthrough') {
      this._setSelectedCommand(null)
      this.rollBreakthroughCommand()
      return
    }
    if (!app.useReroll()) {
      wx.showModal({
        title: '自定义出逃',
        editable: true,
        placeholderText: '写一条你想完成的任务...',
        success: (res) => {
          if (res.confirm && res.content && res.content.trim()) {
            const cmd = this.createCustomCommand(res.content.trim())
            this._setSelectedCommand(cmd)
          }
        }
      })
      return
    }
    this._setSelectedCommand(null)
    this.rollCommand()
  },

  createCustomCommand(title) {
    return {
      id: 'custom_' + Date.now(),
      title,
      content: title,
      type: 'custom',
      typeName: '自定义',
      typeColor: '#E07A5F',
      typeIcon: '/assets/icons/pin-color.svg',
      illustration: '/packageBt/images/color-scene.webp',
      duration: 10,
      distance: '自定义',
      people: '1人',
      tip: '这是你自己定义的任务，按自己的节奏完成吧。',
      custom: true,
      steps: ['设定一个小目标', '按自己的节奏完成', '简单记录感受', '给自己一个肯定']
    }
  },

  closeCommand(e) {
    if (e && e.stopPropagation) e.stopPropagation()
    this._setSelectedCommand(null)
    this.resetDiceFace()
    this.startAutoSwitch()
  },

  collectCmd(e) {
    if (e && e.stopPropagation) e.stopPropagation()
    const cmd = this.data.selectedCommand
    if (!cmd) return
    let collected = app.globalData.collectedCommands || []
    const exists = collected.includes(cmd.id)
    collected = exists ? collected.filter(id => id !== cmd.id) : collected.concat(cmd.id)
    app.globalData.collectedCommands = collected
    app.saveToLocal('collectedCommands', collected)
    this.setData({ collected: !exists })
    wx.showToast({ title: exists ? '已取消收藏' : '已收藏', icon: 'none' })
  },

  startCommand(e) {
    if (e && e.stopPropagation) e.stopPropagation()
    if (!this.data.selectedCommand) return
    app.startCommand(this.data.selectedCommand)
    wx.navigateTo({ url: '/pages/executing/executing' })
  },

  goCollection() {
    wx.navigateTo({ url: '/pages/collection/collection' })
  },

  goCommandDetail(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: '/pages/command-detail/command-detail?id=' + id })
  },

  loadEscapeRecords() {
    const records = (app.globalData.records || []).slice()
    if (!records.length) {
      this.setData({ lastRecord: null, recentRecords: [] })
      return
    }
    records.sort((a, b) => {
      const ka = (a.date || '') + ' ' + (a.time || '')
      const kb = (b.date || '') + ' ' + (b.time || '')
      return kb.localeCompare(ka)
    })
    const lastRecord = this.decorateRecord(records[0])
    const recentRaw = records.slice(1, 6)
    const recentRecords = recentRaw.map(r => this.decorateRecord(r))
    this.setData({ lastRecord: lastRecord, recentRecords: recentRecords })
  },

  loadDailyRecommend() {
    const pool = (app.globalData.commandPool || []).filter(c => c && c.title)
    if (!pool.length) {
      this.setData({ dailyRecommend: [] })
      return
    }
    const today = this._todayStr()
    const cacheKey = 'daily_rec_' + today
    let pickedIds = []
    try {
      const cached = wx.getStorageSync(cacheKey)
      if (Array.isArray(cached) && cached.length) pickedIds = cached
    } catch (e) {}
    const hour = new Date().getHours()
    const isMorning = hour >= 6 && hour < 12
    const isAfternoon = hour >= 12 && hour < 18
    const isNight = hour >= 18 || hour < 6
    const weather = app.globalData.weather || {}
    const isRainy = /雨/.test(weather.description || '')
    const isHot = (weather.temperature || 25) > 30
    let scored = pool.map(cmd => {
      let score = Math.random() * 5
      const dur = Number(cmd.duration) || 15
      if (isMorning && dur <= 30) score += 3
      if (isNight && dur <= 60) score += 2
      if (isAfternoon && dur >= 30) score += 2
      if (isRainy && cmd.type === 'micro') score += 3
      if (isHot && cmd.type === 'micro') score += 2
      if (pickedIds.indexOf(cmd.id) >= 0) score += 10
      return { cmd, score }
    })
    scored.sort((a, b) => b.score - a.score)
    const picked = scored.slice(0, 3).map(s => s.cmd)
    const list = picked.map(cmd => {
      const meta = getTypeMeta(cmd.type)
      return {
        id: cmd.id,
        title: cmd.title || cmd.content,
        typeName: meta.name,
        typeColor: cmd.typeColor || meta.color,
        typeIcon: meta.icon,
        duration: Number(cmd.duration) || 15,
        distance: cmd.distance || '附近',
        illustration: cmd.illustration || meta.scene
      }
    })
    try {
      wx.setStorageSync(cacheKey, list.map(i => i.id))
    } catch (e) {}
    this.setData({ dailyRecommend: list })
  },

  onRecommendTap(e) {
    const id = e.currentTarget.dataset.id
    if (!id) return
    wx.navigateTo({ url: '/pages/command-detail/command-detail?id=' + id })
  },

  decorateRecord(r) {
    if (!r) return null
    const meta = getTypeMeta(r.commandType)
    const typeColor = r.typeColor || meta.color
    const rawDur = r.duration
    const dur = (rawDur != null && rawDur !== '' && !isNaN(Number(rawDur))) ? Number(rawDur) : 0
    let dateLabel = r.date || ''
    try {
      const today = this._todayStr()
      const yesterday = this._shiftDateStr(today, -1)
      const beforeY = this._shiftDateStr(today, -2)
      if (r.date === today) dateLabel = '今天'
      else if (r.date === yesterday) dateLabel = '昨天'
      else if (r.date === beforeY) dateLabel = '前天'
      else {
        const parts = String(r.date).split('-')
        if (parts.length === 3) dateLabel = (parseInt(parts[1], 10) || 0) + '月' + (parseInt(parts[2], 10) || 0) + '日'
      }
    } catch (e) {}
    return Object.assign({}, r, {
      typeName: meta.name,
      typeColor: typeColor,
      typeIcon: meta.icon,
      duration: dur,
      dateLabel: dateLabel
    })
  },

  _todayStr() {
    const d = new Date()
    const p = n => (n < 10 ? '0' + n : '' + n)
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate())
  },

  _shiftDateStr(dateStr, deltaDays) {
    const parts = String(dateStr).split('-')
    if (parts.length !== 3) return dateStr
    const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10))
    d.setDate(d.getDate() + deltaDays)
    const p = n => (n < 10 ? '0' + n : '' + n)
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate())
  },

  goRecordDetail(e) {
    const id = e.currentTarget.dataset.id
    if (!id) return
    wx.navigateTo({ url: '/pages/record-detail/record-detail?id=' + id })
  },

  onShareAppMessage(e) {
    const shareType = e && e.target && e.target.dataset && e.target.dataset.shareType
    if (shareType === 'friend') {
      const mode = this.data.selectedMode || 'smart'
      const cmd = app.rollCommand ? app.rollCommand(mode) : null
      if (cmd && cmd.id) {
        try {
          const tracker = require('../../utils/tracker.js')
          tracker.track('friend_roll_send', { cmdId: cmd.id, mode: mode })
        } catch (e) {}
        return {
          title: '我替你摇了一次出逃指令：' + (cmd.title || cmd.content || '去看看'),
          path: '/pages/index/index?rollForFriend=1&cmd=' + encodeURIComponent(cmd.id)
        }
      }
    }

    const cmd = this.data.selectedCommand
    const isDuo = cmd && (cmd.double || cmd.social)
    return {
      title: isDuo ? `邀你一起出逃：${cmd.title || cmd.content}` : '出逃指令 · 给城市一个随机出口',
      path: isDuo ? `/pages/index/index?mode=double&cmd=${cmd.id}` : '/pages/index/index'
    }
  }
})
