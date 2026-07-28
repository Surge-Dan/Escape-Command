const app = getApp()
const { MODE_LIST, SHEET_MODES, HOME_DICE_LIST, getTypeMeta } = require('../../utils/constants.js')
const { recommendDuration } = require('../../utils/duration-recommender.js')

Page({
  data: {
    statusBarHeight: 20,
    capsuleTop: 26,
    navHeaderStyle: '',
    fontLoaded: false,
    // v4: 模式选择 —— 仅展示 3 个核心模式 Sheet
    selectedMode: 'smart',
    sheetModes: SHEET_MODES,
    currentModeMeta: SHEET_MODES[0],
    // 保留 6 个 MODE_LIST 给 hero / 双人 / 雨天等状态切换使用
    modes: MODE_LIST,
    rolling: false,
    isBouncing: false,
    selectedCommand: null,
    collected: false,
    greetingText: '早啊',
    locationText: '当前位置附近',
    weatherText: '26℃ 晴',
    // v8: 参考风格 hero —— 强调词 + 真实日期 + 副标题
    heroEmphasis: '出去走走',
    heroTail: '换个节奏',
    weekdayText: '周一',
    dateText: '今日',
    collectedCount: 0,
    remainCount: 3,
    showBadgeEarned: false,
    earnedBadges: [],
    invitedByFriend: false,
    // v3 Hero 区：随选中模式切换
    heroColor: '#5CBF9E',
    heroScene: '/assets/images/color-scene.webp',
    heroDesc: '算法懂你，随机推荐',
    nightHint: false,
    // v3 每日推荐
    dailyRecommend: [],
    // home-dice-entry-01: 3 骰子 Cover Flow 状态机
    diceList: HOME_DICE_LIST,
    currentDiceIndex: 0,
    isSliding: false,
    touchStartX: 0,
    // home-dice-entry-01: 微逃细分弹窗
    showMicroSheet: false,
    selectedDuration: 0,
    recommendedDuration: 15,
    isRecommended: false
  },

  onLoad(options) {
    this.applyNavMetrics()
    // v7: onboarding 检测 —— 双重保险（localStorage + globalData），仅首次未完成才弹
    const localOnboarded = wx.getStorageSync('onboarded')
    if (!localOnboarded && !app.globalData.onboarded) {
      // 同步把 globalData 也更新一下，避免后续页面读错
      app.globalData.onboarded = false
      // v7 guard：设置 flag，阻止 onShow 在 redirect 期间执行逻辑
      this._redirecting = true
      // 立即跳转（reLaunch 更稳妥，关闭所有页面栈避免竞态）
      setTimeout(() => {
        wx.reLaunch({
          url: '/pages/onboarding/onboarding',
          fail: () => {
            // 跳转失败时恢复状态，避免 onShow 永远被跳过
            this._redirecting = false
            this.refreshState()
            this.loadDailyRecommend()
          }
        })
      }, 0)
      return
    }
    // 修正：storage 里有 true 但 globalData 可能是初始 false，同步一下
    if (localOnboarded && !app.globalData.onboarded) {
      app.globalData.onboarded = true
    }
    this._redirecting = false
    this.checkNightMode()
    this.refreshState()
    this.loadDailyRecommend()
    this.loadFontFace()
    // home-dice-entry-01: 恢复上次选中的骰子位置
    this.restoreLastDiceIndex()
    if (options && options.mode === 'double' && options.cmd) this.applyInvitation(options.cmd)
  },

  // home-dice-entry-01: 读取持久化的骰子 index，兼容旧值与越界
  restoreLastDiceIndex() {
    try {
      const last = wx.getStorageSync('lastDiceIndex')
      const list = this.data.diceList || []
      if (typeof last === 'number' && last >= 0 && last < list.length) {
        this.setData({ currentDiceIndex: last })
      }
    } catch (e) {}
  },

  loadFontFace() {
    // 包体瘦身（2026-07-28）：fonts/ 已从仓库移走（主包减重 1.4MB）。
    // 字体文件目前走系统字体兜底（见 index.wxss 字体栈）。
    // TODO 后续 Spec：将字体放到云存储 / CDN，改为远程 URL：
    //   source: 'url("https://your-cdn.example.com/fonts/source-han-serif-cn-bold.woff2")'
    // 当前实现：直接跳过 wx.loadFontFace，避免 console 噪音。
    this.setData({ fontLoaded: true })

    // 历史 v10/v11/v12 实现（暂时禁用，保留作为恢复参考）
    // wx.loadFontFace({
    //   family: 'SourceHanSerifBold',
    //   source: 'url("/assets/fonts/source-han-serif-cn-bold.woff2")',
    //   ...
    // })
  },

  applyInvitation(cmdId) {
    const pool = app.globalData.commandPool || []
    const cmd = pool.find(c => c.id === cmdId)
    if (!cmd) return
    const meta = getTypeMeta(cmd.type)
    this.setData({
      selectedMode: 'double',
      invitedByFriend: true,
      selectedCommand: Object.assign({}, cmd, {
        typeName: meta.name,
        typeColor: cmd.typeColor || meta.color,
        typeIcon: meta.icon,
        illustration: cmd.illustration || meta.scene
      })
    })
  },

  onShow() {
    // v7 guard：onLoad 已决定 redirect 到 onboarding，跳过本页逻辑避免竞态
    if (this._redirecting) return
    this.applyNavMetrics()
    this.refreshState()
    this.loadDailyRecommend()
    if (typeof this.getTabBar === 'function' && this.getTabBar()) this.getTabBar().setData({ selected: 0 })
  },

  onHide() {},
  onUnload() {},

  applyNavMetrics() {
    const nav = app.getNavMetrics ? app.getNavMetrics() : {}
    this.setData({
      statusBarHeight: nav.statusBarHeight || 20,
      capsuleTop: nav.capsuleTop || 26,
      navHeaderStyle: nav.navHeaderStyle || ''
    })
  },

  // v2 修正：问候语单行「问候，地点 温度 天气」
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
      remainCount: gd.reRollCount
    })
  },

  buildGreeting() {
    const hour = app.getCurrentHour ? app.getCurrentHour() : new Date().getHours()
    const now = new Date()
    const month = now.getMonth() + 1
    const date = now.getDate()
    const weekdayNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
    const weekday = weekdayNames[now.getDay()]
    // 真实日期「7月12日 周一」
    const dateText = `${month}月${date}日 · ${weekday}`

    let text = '你好'
    let emphasis = '出去走走'
    let tail = '换个节奏'
    if (hour >= 5 && hour < 9) { text = '早啊'; emphasis = '慢慢'; tail = '醒来' }
    else if (hour < 12) { text = '上午好'; emphasis = '出门'; tail = '透口气' }
    else if (hour < 14) { text = '午安'; emphasis = '散个步'; tail = '再回去' }
    else if (hour < 17) { text = '下午好'; emphasis = '离开'; tail = '工位' }
    else if (hour < 19) { text = '傍晚好'; emphasis = '赶上'; tail = '日落' }
    else if (hour < 22) { text = '晚上好'; emphasis = '夜游'; tail = '这座城' }
    else { text = '夜深了'; emphasis = '安静地'; tail = '晃一晃' }

    const weather = app.globalData.weather || {}
    const location = app.globalData.locationName || '当前位置附近'
    const temp = weather.temperature || 26
    const desc = weather.description || '晴'
    return { text, location, weather: `${temp}℃ ${desc}`, emphasis, tail, weekday, dateText }
  },

  // v3 夜色模式自动高亮（21:00-03:00）
  checkNightMode() {
    const hour = app.getCurrentHour ? app.getCurrentHour() : new Date().getHours()
    const isNight = hour >= 21 || hour < 4
    this.setData({ nightHint: isNight })
  },

  // ===== home-dice-entry-01: Cover Flow 滑动状态机 =====
  onTouchStart(e) {
    if (!e.touches || !e.touches.length) return
    this.data.touchStartX = e.touches[0].clientX
  },

  onTouchEnd(e) {
    if (this.data.isSliding) return
    if (!e.changedTouches || !e.changedTouches.length) return
    const endX = e.changedTouches[0].clientX
    const dx = endX - this.data.touchStartX
    // 小于阈值不触发，避免误触
    if (Math.abs(dx) < 40) return
    this.setData({ isSliding: true })
    let newIndex = this.data.currentDiceIndex
    if (dx < 0) {
      // 手指向左滑：下一骰子
      newIndex = Math.min(this.data.currentDiceIndex + 1, this.data.diceList.length - 1)
    } else {
      // 手指向右滑：上一骰子
      newIndex = Math.max(this.data.currentDiceIndex - 1, 0)
    }
    if (newIndex !== this.data.currentDiceIndex) {
      this.setData({ currentDiceIndex: newIndex })
      try { wx.setStorageSync('lastDiceIndex', newIndex) } catch (e) {}
      try { wx.vibrateShort({ type: 'light' }) } catch (e) {}
    }
    setTimeout(() => this.setData({ isSliding: false }), 300)
  },

  // ===== home-dice-entry-01: 骰子点击分流 =====
  onDiceTap(e) {
    if (this.data.isSliding) return
    const index = this.data.currentDiceIndex
    const dice = this.data.diceList[index]
    if (!dice) return
    if (dice.id === 'micro') {
      // 微逃：弹细分窗，并按历史推荐时长
      let records = []
      try { records = wx.getStorageSync('records') || [] } catch (e) {}
      const rec = recommendDuration(records)
      this.setData({
        showMicroSheet: true,
        recommendedDuration: rec.duration,
        isRecommended: rec.isRecommended,
        selectedDuration: rec.duration
      })
    } else if (dice.id === 'breakthrough') {
      wx.navigateTo({ url: '/pages/generating/generating?mode=breakthrough' })
    } else if (dice.id === 'sync') {
      wx.navigateTo({
        url: '/pages/group/create',
        fail: () => wx.showToast({ title: '同频组局即将开放', icon: 'none' })
      })
    }
  },

  // ===== home-dice-entry-01: 微逃细分弹窗 =====
  onMicroOptionTap(e) {
    this.setData({ selectedDuration: e.currentTarget.dataset.duration })
  },

  onMicroStart() {
    if (!this.data.selectedDuration) return
    const duration = this.data.selectedDuration
    this.setData({ showMicroSheet: false })
    wx.navigateTo({ url: `/pages/generating/generating?mode=micro&duration=${duration}` })
  },

  onMicroCancel() {
    this.setData({ showMicroSheet: false })
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
      this.setData({
        selectedCommand: Object.assign({}, cmd, {
          typeName: meta.name,
          typeColor: cmd.typeColor || meta.color,
          typeIcon: meta.icon,
          illustration: cmd.illustration || meta.scene
        }),
        rolling: false,
        isBouncing: false
      })
      if (app.playSound) app.playSound('shake')
      this.refreshState()
    }, 200)
  },

  reroll(e) {
    if (e && e.stopPropagation) e.stopPropagation()
    if (!app.useReroll()) {
      wx.showModal({
        title: '自定义出逃',
        editable: true,
        placeholderText: '写一条你想完成的任务...',
        success: (res) => {
          if (res.confirm && res.content && res.content.trim()) {
            const cmd = this.createCustomCommand(res.content.trim())
            this.setData({ selectedCommand: cmd, collected: false })
          }
        }
      })
      return
    }
    this.setData({ selectedCommand: null }, () => this.rollCommand())
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
      illustration: '/assets/images/color-scene.webp',
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
    this.setData({ selectedCommand: null, collected: false })
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

  // v4: 每日推荐 —— 每次进入随机且与上次不同
  loadDailyRecommend() {
    const pool = app.globalData.commandPool || []
    if (!pool.length) {
      this.setData({ dailyRecommend: [] })
      return
    }
    const weather = (app.globalData.weather && app.globalData.weather.condition) || 'sunny'
    const hour = app.getCurrentHour ? app.getCurrentHour() : new Date().getHours()
    // 优先不需 POI 的轻量指令
    let candidates = pool.filter(c => !c.requirePOI)
    if (!candidates.length) candidates = pool.slice()
    // 雨天优先推荐适配雨天的指令
    if (weather === 'rainy') {
      const rainy = candidates.filter(c => c.rainy)
      candidates = rainy.concat(candidates)
    }
    // 深夜优先推荐 nightSafe 指令
    if (hour >= 21 || hour < 6) {
      const nightSafe = candidates.filter(c => c.nightSafe)
      candidates = nightSafe.concat(candidates)
    }

    // v4: 随机种子洗牌 + 与上次对比防重
    const seed = Date.now()
    let shuffled = this.shuffleWithSeed(candidates, seed)
    let picked = shuffled.slice(0, 3)

    // 与上次推荐对比，>=2 条重叠则重洗
    const lastIds = (() => {
      try { return wx.getStorageSync('lastDailyIds') || [] } catch (e) { return [] }
    })()
    const overlap = picked.filter(c => lastIds.includes(c.id)).length
    if (overlap >= 2) {
      const shuffled2 = this.shuffleWithSeed(candidates, seed + 1)
      picked = shuffled2.slice(0, 3)
    }

    // 不足 3 条时从总池补充
    if (picked.length < 3) {
      const seen = new Set(picked.map(c => c.id))
      while (picked.length < 3 && pool.length > seen.size) {
        const c = pool[Math.floor(Math.random() * pool.length)]
        if (c && !seen.has(c.id)) { seen.add(c.id); picked.push(c) }
      }
    }

    // 写存储，供下次对比
    try { wx.setStorageSync('lastDailyIds', picked.slice(0, 3).map(c => c.id)) } catch (e) {}

    // 附加展示用元数据
    const withMeta = picked.slice(0, 3).map(c => {
      const meta = getTypeMeta(c.type)
      return Object.assign({}, c, {
        typeName: meta.name,
        typeColor: c.typeColor || meta.color
      })
    })
    this.setData({ dailyRecommend: withMeta })
  },

  // 简易 LCG 随机数（按时间种子，保证每次不同）
  shuffleWithSeed(arr, seed) {
    let s = (seed % 2147483647) || 1
    if (s <= 0) s += 2147483646
    const rand = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646 }
    const a = arr.slice()
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1))
      const tmp = a[i]; a[i] = a[j]; a[j] = tmp
    }
    return a
  },

  // v3 快速入口导航
  goCommandDetail(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: '/pages/command-detail/command-detail?id=' + id })
  },

  onShareAppMessage() {
    const cmd = this.data.selectedCommand
    const isDuo = cmd && (cmd.double || cmd.social)
    return {
      title: isDuo ? `邀你一起出逃：${cmd.title || cmd.content}` : '出逃指令 · 给城市一个随机出口',
      path: isDuo ? `/pages/index/index?mode=double&cmd=${cmd.id}` : '/pages/index/index'
    }
  }
})
