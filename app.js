const { normalizeType, getTypeMeta, MOODS, DEFAULT_STEPS, TYPE_STEPS } = require('./utils/constants.js')
const BADGES = require('./data/badges.js')
const challenges = require('./data/challenges.js')
const themes = require('./data/themes.js')
// v4: AI 场景插画 —— 启动时清理过期缓存
const aiImage = require('./utils/ai-image.js')

App({
  globalData: {
    userInfo: null,
    systemInfo: null,
    statusBarHeight: 20,
    capsule: null,
    navBarHeight: 88,
    navPaddingRight: 0,
    navHeaderStyle: '',
    currentCommand: null,
    commandStatus: 'idle',
    location: null,
    locationName: '',
    locationMode: 'fuzzy',
    weather: null,
    reRollCount: 3,
    records: [],
    completedCommandIds: [],
    badges: [],
    pendingBadges: [],
    collectedCommands: [],
    ugcCommands: [],
    memberStatus: { isMember: false, expireDate: null },
    settings: { soundEnabled: false, notificationEnabled: true, voiceReminderEnabled: false },
    commandPool: [],
    offlineCommands: [],
    onboarded: false,
    escapeName: '',
    escapeCode: '',
    avatarUrl: '/assets/images/avatar.webp',
    continuousDays: 0,
    lastCompleteDate: '',
    userPreferences: { mood: {}, type: {}, recent: [] },
    challenges: challenges,
    currentChallenge: null,
    theme: wx.getStorageSync('currentTheme') || 'default',
    currentCity: wx.getStorageSync('currentCity') || '',
    partnerRecords: wx.getStorageSync('partnerRecords') || []
  },

  onLaunch() {
    this.initSystemInfo()
    this.loadLocalData()
    this.initCommandPool()
    this.checkLocation()
    this.checkDateReset()
    this.checkContinuousDays()
    // v4: 清理过期 AI 场景插画缓存
    try { aiImage.clearExpiredCache() } catch (e) { console.warn('[app] AI 缓存清理失败：', e) }
  },

  onShow() {
    this.checkDateReset()
  },

  // v2 core change: one shared status/capsule calculator for every custom nav page.
  // v6: also derive navHeaderStyle (padding-right) to avoid WeChat capsule overlap.
  initSystemInfo() {
    try {
      const sys = wx.getSystemInfoSync()
      let capsule = null
      try { capsule = wx.getMenuButtonBoundingClientRect() } catch (e) {}
      const statusBarHeight = sys.statusBarHeight || 20
      this.globalData.systemInfo = sys
      this.globalData.statusBarHeight = statusBarHeight
      this.globalData.capsule = capsule
      this.globalData.navBarHeight = capsule ? (capsule.bottom + (capsule.top - statusBarHeight)) : 88
      this.globalData.screenWidth = sys.screenWidth
      this.globalData.screenHeight = sys.screenHeight
      this.globalData.pixelRatio = sys.pixelRatio
      // v6: nav-header right padding to avoid capsule.
      // capsuleRightGap = 屏幕宽 - 胶囊左边缘 + 8rpx(转px) ，给标题/操作让出胶囊宽度。
      let navHeaderStyle = ''
      let navPaddingRight = 0
      if (capsule && sys.windowWidth) {
        // rpx→px scale: 750rpx 对应 windowWidth
        const gapRpx = 8
        const gapPx = (gapRpx / 750) * sys.windowWidth
        navPaddingRight = sys.windowWidth - capsule.left + gapPx
        navHeaderStyle = `padding-right: ${navPaddingRight}px;`
      }
      this.globalData.navPaddingRight = navPaddingRight
      this.globalData.navHeaderStyle = navHeaderStyle
    } catch (e) {
      this.globalData.navHeaderStyle = ''
      this.globalData.navPaddingRight = 0
      console.error('获取系统信息失败', e)
    }
  },

  getNavMetrics() {
    const sys = this.globalData.systemInfo || {}
    const capsule = this.globalData.capsule
    const statusBarHeight = this.globalData.statusBarHeight || sys.statusBarHeight || 20
    return {
      statusBarHeight,
      navBarHeight: this.globalData.navBarHeight || 88,
      capsuleTop: capsule ? capsule.top : statusBarHeight + 6,
      capsuleHeight: capsule ? capsule.height : 32,
      capsuleRight: capsule && sys.windowWidth ? sys.windowWidth - capsule.right : 16,
      capsuleWidth: capsule ? capsule.width : 88,
      // v6: nav-header 右侧 padding style 字符串（避开胶囊）
      navHeaderStyle: this.globalData.navHeaderStyle || '',
      navPaddingRight: this.globalData.navPaddingRight || 0
    }
  },

  playSound(name) {
    if (!this.globalData.settings || !this.globalData.settings.soundEnabled) return
    try {
      const audio = wx.createInnerAudioContext()
      audio.src = `/assets/audio/${name}.mp3`
      audio.autoplay = true
      audio.onError(() => {})
      audio.onEnded(() => { audio.destroy() })
    } catch (e) {}
  },

  loadLocalData() {
    try {
      const gd = this.globalData
      gd.records = wx.getStorageSync('records') || []
      gd.completedCommandIds = wx.getStorageSync('completedCommandIds') || []
      gd.badges = wx.getStorageSync('badges') || []
      gd.collectedCommands = wx.getStorageSync('collectedCommands') || []
      gd.ugcCommands = wx.getStorageSync('ugcCommands') || []
      gd.locationMode = wx.getStorageSync('locationMode') || 'fuzzy'
      gd.memberStatus = wx.getStorageSync('memberStatus') || gd.memberStatus
      gd.continuousDays = wx.getStorageSync('continuousDays') || 0
      gd.lastCompleteDate = wx.getStorageSync('lastCompleteDate') || ''
      gd.escapeName = wx.getStorageSync('escapeName') || this.generateEscapeName()
      gd.escapeCode = wx.getStorageSync('escapeCode') || '给城市留一点空白'
      gd.avatarUrl = wx.getStorageSync('avatarUrl') || '/assets/images/avatar.webp'
      gd.onboarded = wx.getStorageSync('onboarded') || false
      gd.userPreferences = wx.getStorageSync('userPreferences') || gd.userPreferences
      const settings = wx.getStorageSync('settings')
      if (settings) gd.settings = Object.assign({}, gd.settings, settings)

      const reRollData = wx.getStorageSync('reRollData') || {}
      gd.reRollCount = reRollData.date === this.getTodayStr() ? reRollData.count : 3
      const currentCommand = wx.getStorageSync('currentCommand')
      const commandStatus = wx.getStorageSync('commandStatus') || 'idle'
      if (currentCommand && commandStatus === 'executing') {
        gd.currentCommand = currentCommand
        gd.commandStatus = 'executing'
      }
    } catch (e) {
      console.error('加载本地数据失败', e)
    }
  },

  saveToLocal(key, data) {
    try { wx.setStorageSync(key, data) } catch (e) { console.error('保存本地数据失败', key, e) }
  },

  saveAll() {
    const gd = this.globalData
    this.saveToLocal('records', gd.records)
    this.saveToLocal('completedCommandIds', gd.completedCommandIds)
    this.saveToLocal('badges', gd.badges)
    this.saveToLocal('collectedCommands', gd.collectedCommands)
    this.saveToLocal('ugcCommands', gd.ugcCommands)
    this.saveToLocal('settings', gd.settings)
    this.saveToLocal('locationMode', gd.locationMode)
    this.saveToLocal('memberStatus', gd.memberStatus)
    this.saveToLocal('continuousDays', gd.continuousDays)
    this.saveToLocal('lastCompleteDate', gd.lastCompleteDate)
    this.saveToLocal('escapeName', gd.escapeName)
    this.saveToLocal('escapeCode', gd.escapeCode)
    this.saveToLocal('avatarUrl', gd.avatarUrl)
    this.saveToLocal('onboarded', gd.onboarded)
    this.saveToLocal('userPreferences', gd.userPreferences)
  },

  saveCurrentCommand() {
    this.saveToLocal('currentCommand', this.globalData.currentCommand)
    this.saveToLocal('commandStatus', this.globalData.commandStatus)
  },

  initCommandPool() {
    try {
      const commands = require('./data/commands.js')
      const raw = Array.isArray(commands) ? commands : (commands.default || [])
      this.globalData.commandPool = raw.map(cmd => this.normalizeCommand(cmd))
    } catch (e) {
      console.error('加载指令池失败', e)
      this.globalData.commandPool = this.getFallbackCommands()
    }
    this.globalData.offlineCommands = this.globalData.commandPool.filter(c => !c.requirePOI).slice(0, 100)
  },

  normalizeCommand(cmd) {
    const type = normalizeType(cmd.type)
    const meta = getTypeMeta(type)
    const title = cmd.title || this.buildTitle(cmd.content)
    return Object.assign({}, cmd, {
      type,
      title,
      content: cmd.content || title,
      typeColor: cmd.typeColor || meta.color,
      typeName: meta.name,
      typeIcon: meta.icon,
      illustration: meta.scene,
      distance: cmd.distance || (cmd.duration <= 15 ? '300m' : '1km'),
      people: cmd.people || (cmd.social || cmd.double ? '一人或朋友' : '一个人'),
      difficulty: cmd.difficulty || 1,
      energy: cmd.energy || (cmd.duration > 25 ? 'medium' : 'low'),
      social: !!(cmd.social || cmd.double),
      // v2 fix: 指令自带 steps 优先；否则按类型取差异化模板；最后兜底 DEFAULT_STEPS。
      steps: Array.isArray(cmd.steps) && cmd.steps.length ? cmd.steps.slice(0, 4) : (TYPE_STEPS[type] || DEFAULT_STEPS)
    })
  },

  buildTitle(content) {
    if (!content) return '出去走走'
    return content.replace(/[，。,.].*$/, '').slice(0, 18)
  },

  getFallbackCommands() {
    return [
      this.normalizeCommand({ id: 'fb001', title: '找一块蓝色招牌', content: '抬头找一块蓝色招牌或路牌，和它合个影', type: 'color', duration: 15, outdoor: true, nightSafe: true, rainy: true, requirePOI: null, tip: '蓝色常常藏在路牌和店招里' }),
      this.normalizeCommand({ id: 'fb002', title: '听三分钟城市声音', content: '找个能坐下的地方，闭眼听 3 分钟，记下 5 种声音', type: 'sense', duration: 10, outdoor: true, nightSafe: true, rainy: true, requirePOI: null, tip: '不要急着判断，只听见就好' }),
      this.normalizeCommand({ id: 'fb003', title: '买一份热乎小吃', content: '去最近的小店买一个你很久没吃过的零食', type: 'food', duration: 15, outdoor: true, nightSafe: false, rainy: true, requirePOI: null, tip: '把选择权交给今天的胃口' }),
      this.normalizeCommand({ id: 'fb004', title: '走一条没走过的路', content: '沿着一条没走过的路走 15 分钟', type: 'walk', duration: 20, outdoor: true, nightSafe: false, rainy: false, requirePOI: null, tip: '迷路了再导航回来' })
    ]
  },

  checkLocation() {
    wx.getLocation({
      type: 'gcj02',
      success: (res) => {
        this.globalData.location = { latitude: res.latitude, longitude: res.longitude, accuracy: res.accuracy }
        this.globalData.locationName = this.globalData.locationMode === 'precise' ? `${res.latitude.toFixed(3)}, ${res.longitude.toFixed(3)}` : '当前位置附近'
        // v2 fix: 接入腾讯地图逆地理编码，将 locationName 从「当前位置附近」升级为「城市·行政区」（PRD §1.1 示例）。
        // 未配置 key 时优雅降级到「当前位置附近」，不影响主流程。
        this.reverseGeocode(res.latitude, res.longitude)
        this.fetchWeather()
        this.scanNearbyPOI()
      },
      fail: () => {
        this.globalData.location = null
        this.globalData.locationName = '未定位'
        this.fetchWeather()
      }
    })
  },

  // v2 fix: 腾讯地图 WebService 逆地理编码，结果形如「广州·天河」写入 globalData.locationName。
  reverseGeocode(lat, lng) {
    const key = wx.getStorageSync('TENCENT_MAP_KEY') || ''
    if (!key) return
    wx.request({
      url: 'https://apis.map.qq.com/ws/geocoder/v1/',
      data: { location: `${lat},${lng}`, key },
      timeout: 4000,
      success: (res) => {
        const comp = res.data && res.data.result && res.data.result.address_component
        if (comp && comp.city && comp.district) {
          this.globalData.locationName = `${comp.city}·${comp.district}`
        }
      },
      fail: () => { /* 保持「当前位置附近」兜底 */ }
    })
  },

  // v2 core change: real request hook with 30-minute cache and local fallback.
  fetchWeather() {
    const cached = wx.getStorageSync('weatherCache')
    if (cached && Date.now() - cached.time < 30 * 60 * 1000) {
      this.globalData.weather = cached.data
      return
    }
    const loc = this.globalData.location
    const fallback = this.getFallbackWeather()
    if (!loc) {
      this.globalData.weather = fallback
      return
    }
    const key = wx.getStorageSync('HEFENG_WEATHER_KEY') || ''
    if (!key) {
      this.globalData.weather = fallback
      return
    }
    wx.request({
      url: 'https://devapi.qweather.com/v7/weather/now',
      data: { location: `${loc.longitude},${loc.latitude}`, key },
      timeout: 5000,
      success: (res) => {
        const now = res.data && res.data.now
        if (!now) {
          this.globalData.weather = fallback
          return
        }
        const weather = { condition: this.mapWeatherCondition(now.text), temperature: Number(now.temp), description: now.text || '天气适宜' }
        this.globalData.weather = weather
        this.saveToLocal('weatherCache', { time: Date.now(), data: weather })
      },
      fail: () => { this.globalData.weather = fallback }
    })
  },

  getFallbackWeather() {
    const hour = this.getCurrentHour()
    return { condition: hour >= 22 || hour < 6 ? 'night' : 'sunny', temperature: 26, description: hour >= 22 || hour < 6 ? '夜间' : '晴' }
  },

  mapWeatherCondition(text) {
    if (/雨|雪|雷|阵雨|storm/i.test(text)) return 'rainy'
    if (/阴|云|雾|霾|cloud/i.test(text)) return 'cloudy'
    return 'sunny'
  },

  scanNearbyPOI() {
    // External POI keys can be added later; local defaults keep command matching useful offline.
    this.globalData.nearbyPOI = { market: true, cafe: true, park: true, bookstore: true, alley: true, lake: false, convenience: true }
  },

  getTodayStr() {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  },

  getCurrentHour() {
    return new Date().getHours()
  },

  checkDateReset() {
    const today = this.getTodayStr()
    const savedDate = wx.getStorageSync('lastResetDate')
    if (savedDate !== today) {
      this.globalData.reRollCount = 3
      this.saveToLocal('reRollData', { date: today, count: 3 })
      this.saveToLocal('lastResetDate', today)
    }
  },

  checkContinuousDays() {
    const today = this.getTodayStr()
    const last = this.globalData.lastCompleteDate
    if (!last) return
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`
    if (last !== yesterdayStr && last !== today) this.globalData.continuousDays = 0
  },

  generateEscapeName() {
    const prefixes = ['周末', '迷路的', '踢影子的', '漫步的', '摘云的', '追风的', '捡落叶的']
    const suffixes = ['漫游者', '散步家', '观察员', '记录人', '探险家', '闲逛者']
    return prefixes[Math.floor(Math.random() * prefixes.length)] + suffixes[Math.floor(Math.random() * suffixes.length)]
  },

  getAvailableCommands() {
    const pool = this.globalData.commandPool
    const completed = this.globalData.completedCommandIds
    const hour = this.getCurrentHour()
    const weather = (this.globalData.weather && this.globalData.weather.condition) || 'sunny'
    const isLateNight = hour >= 22 || hour < 6
    const isRainy = weather === 'rainy' || weather === 'storm'
    const nearby = this.globalData.nearbyPOI || {}
    const lastType = wx.getStorageSync('lastCommandType') || ''
    const sameTypeCount = wx.getStorageSync('sameTypeCount') || 0

    let candidates = pool.filter(cmd => {
      if (completed.includes(cmd.id)) {
        const completedDate = this.getCompletedDate(cmd.id)
        if (completedDate && Date.now() - new Date(completedDate).getTime() < 90 * 24 * 60 * 60 * 1000) return false
      }
      if (isLateNight && !cmd.nightSafe) return false
      if (isRainy && !cmd.rainy && cmd.outdoor) return false
      if (cmd.requirePOI && !nearby[cmd.requirePOI]) return false
      if (cmd.type === lastType && sameTypeCount >= 2) return false
      return true
    })

    if (!candidates.length) candidates = this.globalData.offlineCommands.filter(cmd => !completed.includes(cmd.id))
    if (!candidates.length) candidates = pool.filter(c => !c.outdoor || !c.requirePOI)
    return candidates.length ? candidates : this.getFallbackCommands()
  },

  getCompletedDate(cmdId) {
    const record = this.globalData.records.find(r => r.commandId === cmdId)
    return record ? record.date : null
  },

  rollCommand(mode) {
    let candidates = this.getAvailableCommands()
    if (mode === 'micro') candidates = candidates.filter(c => c.duration < 15)
    if (mode === 'walk') candidates = candidates.filter(c => c.outdoor !== false && c.duration >= 20)
    if (mode === 'double') candidates = candidates.filter(c => c.double || c.social)
    if (mode === 'night') candidates = candidates.filter(c => c.nightSafe && (c.mode === 'night' || !c.mode))
    if (mode === 'rainy') candidates = candidates.filter(c => c.rainy && (c.mode === 'rainy' || !c.mode))
    // smart mode: no filter, use all candidates (weighted recommendation)
    if (!candidates.length) candidates = this.getAvailableCommands()
    if (!candidates.length) candidates = this.globalData.offlineCommands
    if (!candidates.length) candidates = this.globalData.commandPool
    if (!candidates.length) candidates = this.getFallbackCommands()
    const selected = this.pickWeightedCommand(candidates)
    this.rememberLastType(selected.type)
    return selected
  },

  // v2 core change: preferred types get a 20% probability lift.
  pickWeightedCommand(candidates) {
    const typePrefs = (this.globalData.userPreferences && this.globalData.userPreferences.type) || {}
    const topType = Object.keys(typePrefs).sort((a, b) => typePrefs[b] - typePrefs[a])[0] || ''
    const total = candidates.reduce((sum, cmd) => sum + (cmd.type === topType ? 1.2 : 1), 0)
    let cursor = Math.random() * total
    for (let i = 0; i < candidates.length; i++) {
      cursor -= candidates[i].type === topType ? 1.2 : 1
      if (cursor <= 0) return candidates[i]
    }
    return candidates[Math.floor(Math.random() * candidates.length)]
  },

  rememberLastType(type) {
    const lastType = wx.getStorageSync('lastCommandType') || ''
    const sameTypeCount = wx.getStorageSync('sameTypeCount') || 0
    wx.setStorageSync('lastCommandType', type)
    wx.setStorageSync('sameTypeCount', lastType === type ? sameTypeCount + 1 : 1)
  },

  useReroll() {
    if (this.globalData.reRollCount <= 0) return false
    this.globalData.reRollCount--
    this.saveToLocal('reRollData', { date: this.getTodayStr(), count: this.globalData.reRollCount })
    return true
  },

  startCommand(command) {
    this.globalData.currentCommand = Object.assign({}, this.normalizeCommand(command), { startTime: Date.now(), photos: command.photos || [] })
    this.globalData.commandStatus = 'executing'
    this.saveCurrentCommand()
  },

  abandonCommand() {
    this.globalData.currentCommand = null
    this.globalData.commandStatus = 'idle'
    this.saveCurrentCommand()
  },

  completeCommand(recordData) {
    const cmd = this.globalData.currentCommand
    if (!cmd) return null
    const now = new Date()
    const record = {
      id: 'r_' + Date.now(),
      commandId: cmd.id,
      commandTitle: cmd.title || cmd.content,
      commandContent: cmd.content,
      commandType: cmd.type,
      typeColor: cmd.typeColor,
      duration: Math.max(1, Math.round((Date.now() - cmd.startTime) / 60000)),
      photos: recordData.photos || [],
      feeling: (recordData.feeling || '').slice(0, 200),
      mood: recordData.mood || 'calm',
      location: recordData.location || this.globalData.location || null,
      weather: this.globalData.weather,
      date: this.getTodayStr(),
      time: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`,
      rotation: Math.random() * 4 - 2,
      filter: recordData.filter || 'day'
    }

    this.globalData.records.unshift(record)
    if (!this.globalData.completedCommandIds.includes(cmd.id)) this.globalData.completedCommandIds.push(cmd.id)
    this.updateContinuousDays()
    this.updatePreferences(record)
    this.checkBadges()
    this.globalData.currentCommand = null
    this.globalData.commandStatus = 'idle'
    this.saveCurrentCommand()
    this.saveAll()
    return record
  },

  updateContinuousDays() {
    const today = this.getTodayStr()
    if (this.globalData.lastCompleteDate === today) return
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const yStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`
    this.globalData.continuousDays = this.globalData.lastCompleteDate === yStr ? this.globalData.continuousDays + 1 : 1
    this.globalData.lastCompleteDate = today
  },

  updatePreferences(record) {
    const prefs = this.globalData.userPreferences || { mood: {}, type: {}, recent: [] }
    prefs.mood[record.mood] = (prefs.mood[record.mood] || 0) + 1
    prefs.type[record.commandType] = (prefs.type[record.commandType] || 0) + 1
    const moodMeta = MOODS.find(m => m.id === record.mood)
    if (moodMeta && moodMeta.weightType) prefs.type[moodMeta.weightType] = (prefs.type[moodMeta.weightType] || 0) + 1
    prefs.recent = [{ mood: record.mood, type: record.commandType, date: record.date }].concat(prefs.recent || []).slice(0, 10)
    this.globalData.userPreferences = prefs
  },

  checkBadges() {
    const unlocked = this.globalData.badges
    const records = this.globalData.records
    const addBadge = (id) => {
      if (unlocked.find(b => b.id === id)) return false
      const meta = BADGES.find(b => b.id === id)
      if (!meta) return false
      unlocked.push(Object.assign({}, meta, { date: this.getTodayStr() }))
      return true
    }
    const added = []
    // existing 9 badges
    if (records.length >= 1 && addBadge('first_escape')) added.push('初次出逃')
    if (this.globalData.continuousDays >= 7 && addBadge('seven_streak')) added.push('七连胜')
    if (this.globalData.continuousDays >= 30 && addBadge('thirty_streak')) added.push('月度漫游家')
    if (records.filter(r => r.commandType === 'color').length >= 10 && addBadge('color_hunter')) added.push('蓝色猎人')
    if (records.filter(r => { const h = parseInt((r.time || '00:00').split(':')[0]); return h >= 22 || h < 6 }).length >= 5 && addBadge('night_walker')) added.push('夜行者')
    if (records.filter(r => r.weather && r.weather.condition === 'rainy').length >= 3 && addBadge('rainy_walker')) added.push('雨天漫步者')
    if (records.filter(r => r.commandType === 'food').length >= 5 && addBadge('market_regular')) added.push('菜市场熟客')
    const uniqueLocations = new Set(records.filter(r => r.location).map(r => `${Math.round(r.location.latitude * 100) / 100},${Math.round(r.location.longitude * 100) / 100}`))
    if (uniqueLocations.size >= 50 && addBadge('city_detective')) added.push('城市侦探')
    // 10 new badges
    if (records.filter(r => r.mode === 'micro' || r.duration < 15).length >= 10 && addBadge('micro_master')) added.push('微出逃达人')
    if (records.filter(r => r.mode === 'walk' || (r.duration >= 30 && r.outdoor !== false)).length >= 10 && addBadge('walk_master')) added.push('漫游达人')
    if (records.filter(r => r.mode === 'double' || r.double).length >= 5 && addBadge('double_master')) added.push('双人冒险家')
    if (records.filter(r => r.mode === 'night').length >= 10 && addBadge('night_master')) added.push('深夜诗人')
    if (records.filter(r => r.mode === 'rainy').length >= 10 && addBadge('rainy_master')) added.push('雨天诗人')
    if ((this.globalData.partnerRecords || []).length >= 3 && addBadge('social_master')) added.push('社交达人')
    if ((this.globalData.collectedCommands || []).length >= 20 && addBadge('collector')) added.push('收藏家')
    const typesCovered = new Set(records.map(r => r.commandType))
    if (typesCovered.size >= 6 && addBadge('explorer')) added.push('探索家')
    if ((wx.getStorageSync('challengeCompletedCount') || 0) >= 7 && addBadge('challenge_king')) added.push('挑战王')
    if (records.filter(r => r.commandType === 'culture').length >= 5 && addBadge('culture_lover')) added.push('文化漫游者')
    if (added.length) {
      this.globalData.pendingBadges = added
      this.playSound('unlock')
    }
  }
})
