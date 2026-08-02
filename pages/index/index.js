const app = getApp()
const { MODE_LIST, SHEET_MODES, HOME_DICE_LIST, getTypeMeta } = require('../../utils/constants.js')

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
    // v3 每日推荐（即"推荐出逃任务"）
    dailyRecommend: [],
    // C-P8: 出逃记录板块（上次 + 最近）
    lastRecord: null,
    recentRecords: [],
    // home-dice-entry-01: 3 骰子 Cover Flow 状态机
    diceList: HOME_DICE_LIST,
    currentDiceIndex: 0,
    isSliding: false,
    touchStartX: 0,
    // home-dice-entry-01: 点击掷骰转动动画
    isRolling: false,
    // sync-dice-sheet: 同频骰子入口选择弹层（邀请好友组局 / 进入任务大厅）
    showDiceSheet: false,
    // v18 破圈骰子
    showLegacyDice: false,
    breakthroughRemainCount: 5,
    isBreakthroughRolling: false,
    // v18: Hero 副标题（随选中骰子切换）
    heroSubText: '用 15 分钟，给城市一个随机出口',
    theme: 'default'
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
    this.loadEscapeRecords()
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
    this.setData({ theme: app.globalData.theme || 'default' })
    this.refreshState()
    this.loadDailyRecommend()
    this.loadEscapeRecords()
    if (typeof this.getTabBar === 'function' && this.getTabBar()) this.getTabBar().setData({ selected: 0 })
    // 从完成页返回时清除已过期的指令显示
    if (this.data.selectedCommand && !app.globalData.currentCommand) {
      this.setData({ selectedCommand: null })
    }
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
    const subText = this.data.currentDiceIndex === 0
      ? '用 15 分钟，给城市一个随机出口'
      : '破圈骰子 · 做一件平时不会做的事'
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
      breakthroughRemainCount: gd.breakthroughReRollCount,
      heroSubText: subText
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

  // ===== home-dice-entry-01: 骰子点击分流（先转动再路由） =====
  onDiceTap(e) {
    if (this.data.isSliding) return
    if (this.data.isRolling) return  // 转动中禁止重复点击
    const index = this.data.currentDiceIndex
    const dice = this.data.diceList[index]
    if (!dice) return

    // 触发酷炫转动动画
    this.setData({ isRolling: true })
    try { wx.vibrateShort({ type: 'medium' }) } catch (e) {}

    // 800ms 动画结束后执行分流
    setTimeout(() => {
      this.setData({ isRolling: false })
      this.routeDice(dice)
    }, 800)
  },

  // 实际路由逻辑（转动动画结束后调用）
  routeDice(dice) {
    if (dice.id === 'micro') {
      // 微逃7D：跳条件选择页（替换老的时长细分弹窗）
      wx.navigateTo({ url: '/pages/dice-micro-7d/dice-micro-7d' })
    } else if (dice.id === 'breakthrough') {
      // 破圈骰子：在首页直接摇取并展示指令卡（插画/小贴士/接受-重摇），
      // 走 rollBreakthroughCommand → selectedCommand → 首页 command-sheet 卡片。
      // 不再跳 generating 页：generating 的生成引擎没有 breakthrough 分支，
      // 会从普通池抽普通指令（type≠breakthrough），导致 executing 无勇气进度、
      // record 不识别破圈 → 误跳地图页，且永远到不了 bt-certificate。
      this.rollBreakthroughCommand()
    } else if (dice.id === 'sync') {
      // sync-dice-sheet: 不再直达创建页，先弹底部 Sheet 让用户选择出逃方式
      this.setData({ showDiceSheet: true })
    }
  },

  // ===== sync-dice-sheet: 同频骰子入口 Sheet =====
  onDiceSheetMaskTap() {
    this.setData({ showDiceSheet: false })
  },

  onDiceSheetClose() {
    this.setData({ showDiceSheet: false })
  },

  onInviteFriendsTap() {
    this.setData({ showDiceSheet: false })
    wx.navigateTo({ url: '/pages/group/create/create' })
  },

  onEnterHallTap() {
    this.setData({ showDiceSheet: false })
    wx.navigateTo({ url: '/pages/group/hall/hall' })
  },

  // 微逃细分弹窗已移除：改用 dice-micro-7d 7维条件选择页（见 routeDice micro 分支）

  // v18 左右滑动切换骰子
  onDiceSwiperChange(e) {
    const index = e.detail.current
    this.setData({ currentDiceIndex: index }, () => this.refreshState())
  },

  // v18 点击指示器切换骰子
  onDiceIndicatorTap(e) {
    const index = Number(e.currentTarget.dataset.index)
    if (index === this.data.currentDiceIndex) return
    this.setData({ currentDiceIndex: index }, () => this.refreshState())
  },

  rollBreakthroughCommand() {
    if (this.data.rolling || this.data.selectedCommand || this.data.isBreakthroughRolling) return
    // 无剩余次数时禁止摇取
    if (this.data.breakthroughRemainCount <= 0) {
      wx.showToast({ title: '今日破圈次数已用完，明天再来', icon: 'none', duration: 2000 })
      return
    }
    // 无画像时仍然可摇，只是随机推荐；有画像则更精准
    this.setData({ isBreakthroughRolling: true, isBouncing: true })
    try { wx.vibrateShort({ type: 'light' }) } catch (e) {}
    setTimeout(() => {
      const cmd = app.rollBreakthroughCommand()
      if (!cmd) {
        this.setData({ isBreakthroughRolling: false, isBouncing: false })
        wx.showToast({ title: '今天先休息一下', icon: 'none' })
        return
      }
      // 每次摇取消耗 1 次（含首次）
      app.useBreakthroughReroll()
      this.refreshState()
      const meta = getTypeMeta(cmd.type)
      this.setData({
        selectedCommand: Object.assign({}, cmd, {
          typeName: meta.name,
          typeColor: cmd.typeColor || meta.color,
          typeIcon: meta.icon,
          illustration: cmd.illustration || meta.scene
        }),
        rolling: false,
        isBouncing: false,
        isBreakthroughRolling: false
      })
      if (app.playSound) app.playSound('shake')
      this.refreshState()
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
    // 破圈骰子重摇：rollBreakthroughCommand 内部已处理扣次
    if (this.data.currentDiceIndex === 1) {
      this.setData({ selectedCommand: null }, () => {
        this.rollBreakthroughCommand()
      })
      return
    }
    // 微逃骰子重摇（原有逻辑）
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

  // C-P8: 加载出逃记录（上次 + 最近）—— 从 globalData.records 按时间倒序取
  // records 字段：id, commandTitle, commandType, typeColor, duration, date, time, mood, location
  loadEscapeRecords() {
    const records = (app.globalData.records || []).slice()
    if (!records.length) {
      this.setData({ lastRecord: null, recentRecords: [] })
      return
    }
    // 按 date+time 字符串倒序（YYYY-MM-DD HH:MM 字符串比较等价时间比较）
    records.sort((a, b) => {
      const ka = (a.date || '') + ' ' + (a.time || '')
      const kb = (b.date || '') + ' ' + (b.time || '')
      return kb.localeCompare(ka)
    })
    const lastRecord = this.decorateRecord(records[0])
    // 最近出逃：取前 5 条（不含已被选作 lastRecord 的首条以避免重复展示）
    const recentRaw = records.slice(1, 6)
    const recentRecords = recentRaw.map(r => this.decorateRecord(r))
    this.setData({ lastRecord: lastRecord, recentRecords: recentRecords })
  },

  // 给记录补展示用元数据（类型名/颜色/日期摘要）—— 纯函数，不改原对象
  decorateRecord(r) {
    if (!r) return null
    const meta = getTypeMeta(r.commandType)
    const typeColor = r.typeColor || meta.color
    // duration 防御：历史/破圈记录可能缺字段，统一归一为数字（0 表示未记录），
    // 避免 WXML {{duration}} 渲染成 "null 分钟" / "null分钟"
    const rawDur = r.duration
    const dur = (rawDur != null && rawDur !== '' && !isNaN(Number(rawDur))) ? Number(rawDur) : 0
    // 日期摘要：今天/昨天/前天/具体日期
    let dateLabel = r.date || ''
    try {
      const today = this._todayStr()
      const yesterday = this._shiftDateStr(today, -1)
      const beforeY = this._shiftDateStr(today, -2)
      if (r.date === today) dateLabel = '今天'
      else if (r.date === yesterday) dateLabel = '昨天'
      else if (r.date === beforeY) dateLabel = '前天'
      else {
        // M月D日
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

  // C-P8: 跳转记录详情
  goRecordDetail(e) {
    const id = e.currentTarget.dataset.id
    if (!id) return
    wx.navigateTo({ url: '/pages/record-detail/record-detail?id=' + id })
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
