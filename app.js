const app = getApp()
const { normalizeType, getTypeMeta, getBreakthroughScene, MOODS, DEFAULT_STEPS, TYPE_STEPS } = require('./utils/constants.js')
const BADGES = require('./data/badges.js')
const challenges = require('./data/challenges.js')
const themes = require('./data/themes.js')
// 破圈指令池（124KB）改为按需加载：仅在用户进入破圈骰子/画像/证书时引入，避免启动时进主包
// v4: AI 场景插画 —— 启动时清理过期缓存
const aiImage = require('./utils/ai-image.js')
// B-02~B-06: 生成引擎（纯函数，零 wx 依赖）
const generatorEngine = require('./utils/generator-engine.js')
// 出逃记录构造器（普通 + 同频统一入口，纯函数零 wx 依赖）
const recordBuilder = require('./utils/record-builder.js')
// B4 激励体系：徽章解锁纯函数引擎（城市方向 + 阶段记录 + 全量规则）
const badgeEngine = require('./utils/badge-engine.js')
// B4 记忆回收：30 天前记录回访提醒（纯函数零 wx 依赖）
const memoryRevisit = require('./utils/memory-revisit.js')
// POI 指令构建器（真实周边商铺/打卡点 → 带具体地点的指令）—— 改为按需加载，避免启动时进主包
// const poiCommandBuilder = require('./utils/poi-command-builder.js')  // 见 lazyRequirePoiBuilder()

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
    avatarUrl: '/assets/avatar-default.webp',
    continuousDays: 0,
    lastCompleteDate: '',
    userPreferences: { mood: {}, type: {}, recent: [] },
    challenges: challenges,
    currentChallenge: null,
    theme: wx.getStorageSync('currentTheme') || 'default',
    currentCity: wx.getStorageSync('currentCity') || '',
    partnerRecords: wx.getStorageSync('partnerRecords') || [],
    // group-create-01: 云开发初始化状态
    cloudReady: false,
    // Henry: 破圈骰子状态（画像/每日次数/指令池）
    breakthroughProfile: null,
    breakthroughReRollCount: 5,
    breakthroughPool: [],
    // B4 记忆回收：30 天前记录回访提醒（null 表示无提醒）
    memoryRevisit: null,
    // v25: 思源宋体加载状态
    serifFontLoaded: false,
    serifFontFamily: '',
    version: 'v2.4.0'
  },

  onLaunch() {
    this.initCloud()
    this.initSystemInfo()
    this.loadLocalData()
    this.initCommandPool()
    this.checkLocation()
    this.checkDateReset()
    this.checkContinuousDays()
    // 预加载分包：首页引用的 packageDice 3D 骰子图、packageBt 场景图
    // 必须预加载才能在主包页面正常显示分包内的 image 资源
    this.preloadSubpackages()
    // v4: 清理过期 AI 场景插画缓存
    try { aiImage.clearExpiredCache() } catch (e) { console.warn('[app] AI 缓存清理失败：', e) }
    // v23: 真正加载思源宋体（解决 Android 上 fallback 到无衬线字体的"花体字"问题）
    this.loadSerifFont()
  },

  // v25: 用 wx.loadFontFace 加载思源宋体（本地子集字体，零网络依赖）
  // 根因修复：scopes 参数在部分基础库版本上导致加载失败，移除后纯 global 模式更稳定
  // 覆盖字符：出逃指令地图我编辑资料设置帮助关于成就徽章统计时间线年度回顾心情城市足迹搭子等
  // 未覆盖字符自动降级到系统 serif（iOS: Songti SC / STSong；Android: serif fallback）
  loadSerifFont() {
    if (typeof wx.loadFontFace !== 'function') return
    if (this.globalData.serifFontLoaded) return  // 已加载成功，不重复

    const FONT_BOLD = '/assets/fonts/noto-serif-sc-bold-titles.woff2'
    const FONT_REG = '/assets/fonts/noto-serif-sc-bold-subset.woff2'

    const notify = (ok, family) => {
      this.globalData.serifFontLoaded = ok
      this.globalData.serifFontFamily = ok ? family : ''
    }

    // Bold 字体：用于标题（global: true 全局生效）
    wx.loadFontFace({
      family: 'SourceHanSerifBold',
      source: FONT_BOLD,
      global: true,
      success: () => {
        console.log('[app] SourceHanSerifBold 加载成功（global）')
        notify(true, 'SourceHanSerifBold')
      },
      fail: (e) => {
        console.warn('[app] Bold 字体 global 加载失败，尝试页面级', e)
        // 降级：延迟 500ms 重试一次（页面级，不设 global）
        setTimeout(() => {
          wx.loadFontFace({
            family: 'SourceHanSerifBold',
            source: FONT_BOLD,
            success: () => {
              console.log('[app] SourceHanSerifBold 页面级加载成功')
              notify(true, 'SourceHanSerifBold')
            },
            fail: (e2) => {
              console.warn('[app] Bold 字体加载彻底失败，降级到系统 serif', e2)
              notify(false, '')
            }
          })
        }, 500)
      }
    })

    // Regular 字体：用于正文（global: true 全局生效）
    wx.loadFontFace({
      family: 'SourceHanSerif',
      source: FONT_REG,
      global: true,
      success: () => {
        console.log('[app] SourceHanSerif 加载成功（global）')
      },
      fail: (e) => {
        console.warn('[app] Regular 字体 global 加载失败，尝试页面级', e)
        setTimeout(() => {
          wx.loadFontFace({
            family: 'SourceHanSerif',
            source: FONT_REG,
            success: () => {
              console.log('[app] SourceHanSerif 页面级加载成功')
            },
            fail: (e2) => {
              console.warn('[app] Regular 字体加载彻底失败', e2)
            }
          })
        }, 800)
      }
    })
  },

  // 预加载首屏依赖的分包资源
  // image 标签引用分包内资源时必须预加载分包，否则首屏会显示空白
  preloadSubpackages() {
    if (typeof wx.loadSubpackage !== 'function') return
    // 骰子图片分包（首页3个3D骰子、骰子面缩放图等）
    wx.loadSubpackage({ root: 'packageDice' }).then(() => {
      console.log('[app] packageDice 预加载完成')
    }).catch((e) => {
      console.warn('[app] packageDice 预加载失败：', e)
    })
    // 破圈分包（25张场景图 + 画像/证书页），避免首次进入破圈页白屏
    wx.loadSubpackage({ root: 'packageBt' }).then(() => {
      console.log('[app] packageBt 预加载完成')
    }).catch((e) => {
      console.warn('[app] packageBt 预加载失败：', e)
    })
  },

  // group-create-01: 云开发初始化
  // env id 需要在微信开发者工具「云开发」控制台创建环境后回填
  // 当前为占位字符串，跑通前必须回填真实 env id
  initCloud() {
    if (!wx.cloud) {
      console.error('[app] 当前基础库不支持云开发，请更新微信开发者工具')
      this.globalData.cloudReady = false
      return
    }
    try {
      wx.cloud.init({
        env: 'dev1-d2gchwpba51a6091b',
        traceUser: true
      })
      this.globalData.cloudReady = true
    } catch (e) {
      console.error('[app] 云开发初始化失败：', e)
      this.globalData.cloudReady = false
    }
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
      gd.records = this._migrateRecords(wx.getStorageSync('records') || [])
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
      gd.avatarUrl = wx.getStorageSync('avatarUrl') || '/assets/avatar-default.webp'
      gd.onboarded = wx.getStorageSync('onboarded') || false
      gd.userPreferences = wx.getStorageSync('userPreferences') || gd.userPreferences
      gd.breakthroughProfile = wx.getStorageSync('breakthroughProfile') || null
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

  // 旧版本 records 字段迁移：补 commandType/timestamp/mode/double 等字段
  // 老用户从 v1.x 升级时 records 可能缺字段，导致 badge-engine 模式徽章/类型徽章失效
  _migrateRecords(list) {
    if (!Array.isArray(list)) return []
    let dirty = false
    const out = list.map(r => {
      if (!r || typeof r !== 'object') return null
      const fixed = Object.assign({}, r)
      // commandType：旧版用 type 字段，补齐到 commandType
      if (!fixed.commandType) {
        fixed.commandType = (typeof fixed.type === 'string' && fixed.type) ? fixed.type : 'custom'
        dirty = true
      }
      // timestamp：旧版无此字段，从 date 解析兜底
      if (typeof fixed.timestamp !== 'number' || !Number.isFinite(fixed.timestamp)) {
        const t = fixed.date ? new Date(fixed.date + 'T00:00:00+08:00').getTime() : Date.now()
        fixed.timestamp = isNaN(t) ? Date.now() : t
        dirty = true
      }
      // mode/double：旧版无此字段，无法恢复，给默认值避免 undefined
      if (fixed.mode === undefined) { fixed.mode = ''; dirty = true }
      if (fixed.double === undefined) { fixed.double = false; dirty = true }
      return fixed
    }).filter(Boolean)
    if (dirty) {
      try { wx.setStorageSync('records', out) } catch (e) {}
    }
    return out
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
    this.saveToLocal('breakthroughProfile', gd.breakthroughProfile)
    this.saveToLocal('partnerRecords', gd.partnerRecords)
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
    // 破圈指令池不在启动时加载（124KB），见 initBreakthroughPool() 按需懒加载
  },

  // 兼容旧调用：触发异步加载（不阻塞）。实际加载走 ensureBreakthroughPool。
  // 保留方法名避免外部调用方报错；内部不再同步 require，避免主包引用分包资源。
  initBreakthroughPool() {
    if (this._breakthroughPoolLoaded) return
    this.ensureBreakthroughPool(null)
  },

  // 异步加载破圈指令池（事件总线模式 + require.async 分包异步化）
  // 数据文件位于 data/ 目录（124KB），启动时不加载。
  // 多个调用方可并发注册回调，加载完成后统一触发；加载过程幂等（_btLoading 去重）。
  // 调用方：rollBreakthroughCommand / preloadBreakthroughPool / breakthrough-profile / bt-certificate
  ensureBreakthroughPool(cb) {
    // 已加载：直接回调
    if (this._breakthroughPoolLoaded) {
      if (typeof cb === 'function') cb(this.globalData.breakthroughPool)
      return
    }
    // 合并并发回调（事件总线）
    this._btCbs = this._btCbs || []
    if (typeof cb === 'function') this._btCbs.push(cb)
    // 加载中：只注册回调，不重复触发
    if (this._btLoading) return
    this._btLoading = true
    try {
      if (typeof require.async === 'function') {
        // 官方分包异步化方案（基础库 2.27.1+，当前 libVersion 2.33.0 支持）
        require.async('packageBt/data/breakthrough-commands.js').then((data) => {
          this._applyBreakthroughData(data)
        }).catch((e) => {
          console.error('[app] 异步加载破圈指令池失败', e)
          this._applyBreakthroughData({ BREAKTHROUGH_COMMANDS: [] }, true)
        })
      } else {
        // 降级：低版本基础库不支持 require.async，空池兜底（破圈骰子会提示"今天先休息一下"）
        console.warn('[app] 当前基础库不支持 require.async，破圈指令池为空')
        this._applyBreakthroughData({ BREAKTHROUGH_COMMANDS: [] }, true)
      }
    } catch (e) {
      console.error('[app] 加载破圈指令池异常', e)
      this._applyBreakthroughData({ BREAKTHROUGH_COMMANDS: [] }, true)
    }
  },

  // 内部：把原始数据归一化后写入 globalData，并触发所有挂起回调
  _applyBreakthroughData(data, failed) {
    const raw = (data && data.BREAKTHROUGH_COMMANDS) || []
    this.globalData.breakthroughPool = raw.map(cmd => this.normalizeCommand(cmd))
    // 失败时不标记已加载，允许下次重试（避免破圈骰子永久空池）
    if (!failed) this._breakthroughPoolLoaded = true
    this._btLoading = false
    const cbs = this._btCbs || []
    this._btCbs = []
    cbs.forEach(fn => {
      try { fn(this.globalData.breakthroughPool) } catch (e) { console.warn('[app] 破圈回调异常', e) }
    })
  },

  // 异步加载 POI 指令构建器：仅在云函数 poiSearch 回调时按需引入
  lazyRequirePoiBuilder() {
    if (this._poiBuilderCached) return this._poiBuilderCached
    try {
      this._poiBuilderCached = require('./utils/poi-command-builder.js')
    } catch (e) {
      console.error('加载 POI 构建器失败', e)
      this._poiBuilderCached = null
    }
    return this._poiBuilderCached
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
      illustration: type === 'breakthrough' ? getBreakthroughScene(cmd.id) : (cmd.illustration || meta.scene),
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
    // B-06: 委托给 generator-engine（保持原返回结构：normalizeCommand 包装）
    const ctx = this._buildEngineCtx()
    const fallback = generatorEngine.getFallbackCommands(ctx)
    return fallback.map(cmd => this.normalizeCommand(cmd))
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
        // 真实 POI 搜索：云函数 + 腾讯地图，获取周边商铺/打卡点生成新指令体系
        // 未配置 key / 云函数失败时降级到 scanNearbyPOI mock，主流程不挂
        this.fetchNearbyPOI(res.latitude, res.longitude)
      },
      fail: () => {
        this.globalData.location = null
        this.globalData.locationName = '未定位'
        this.fetchWeather()
      }
    })
  },

  // 真实 POI 搜索：调云函数 poiSearch（腾讯地图逆地理 + 周边搜索）
  // 成功：写 currentCity/locationName/nearbyPOI/nearbyPOIList，注入 POI 指令到 commandPool
  // 失败/无 key：降级到 scanNearbyPOI mock，主流程不挂
  fetchNearbyPOI(lat, lng) {
    if (!this.globalData.cloudReady || !wx.cloud || typeof wx.cloud.callFunction !== 'function') {
      this.scanNearbyPOI()
      return
    }
    wx.cloud.callFunction({
      name: 'poiSearch',
      data: { lat: lat, lng: lng },
      success: (res) => {
        const r = res && res.result
        if (!r || !r.ok) {
          this.scanNearbyPOI()
          return
        }
        // 城市信息（云函数逆地理，优先于客户端 reverseGeocode）
        if (r.locationName) this.globalData.locationName = r.locationName
        if (r.city) {
          this.globalData.currentCity = r.city
          this.saveToLocal('currentCity', r.city)
        }
        const pois = Array.isArray(r.pois) ? r.pois : []
        this.globalData.nearbyPOIList = pois
        // nearbyPOI 类型集合：真实 POI 类型 + mock 兜底（保证基础类型可达）
        const poiSet = {}
        pois.forEach(p => { if (p && p.type) poiSet[p.type] = true })
        this.globalData.nearbyPOI = Object.assign({
          market: true, cafe: true, park: true, bookstore: true,
          alley: true, lake: false, convenience: true
        }, poiSet)
        // 注入 POI 指令到 commandPool 头部
        this.injectPOICommands(pois)
      },
      fail: () => { this.scanNearbyPOI() }
    })
  },

  // 把真实 POI 转为指令并注入 commandPool 头部
  // POI 指令自带 location，完成后记录自动带坐标 → 地图标记闭环
  injectPOICommands(pois) {
    if (!Array.isArray(pois) || pois.length === 0) return
    const poiCommandBuilder = this.lazyRequirePoiBuilder()
    if (!poiCommandBuilder || typeof poiCommandBuilder.buildCommands !== 'function') {
      console.warn('[app] POI 构建器未加载，跳过 POI 指令注入')
      return
    }
    const ctx = {
      city: this.globalData.currentCity || '',
      hour: this.getCurrentHour(),
      weather: (this.globalData.weather && this.globalData.weather.condition) || 'sunny'
    }
    const poiCmds = poiCommandBuilder.buildCommands(pois, this.globalData.userPreferences || { type: {} }, ctx)
    if (!poiCmds.length) return
    // normalizeCommand 包装（与现有指令池结构一致），POI 指令的 location 字段保留
    const normalized = poiCmds.map(c => this.normalizeCommand(c))
    // 去重：移除 commandPool 中已有的同 id POI 指令（避免重复注入）
    const newIds = new Set(normalized.map(c => c.id))
    const filtered = this.globalData.commandPool.filter(c => !newIds.has(c.id))
    this.globalData.commandPool = normalized.concat(filtered)
    // 同步 offlineCommands（POI 指令 requirePOI=null，会进入 offlineCommands）
    this.globalData.offlineCommands = this.globalData.commandPool.filter(c => !c.requirePOI).slice(0, 100)
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
    // 与成功路径数据契约对齐：降级时 nearbyPOIList 为空数组，避免下游读 undefined 崩溃
    this.globalData.nearbyPOIList = []
  },

  getTodayStr() {
    // 统一用东八区（北京时间）取日期，避免海外用户本地时区导致连续打卡/重置错乱
    const now = new Date(Date.now() + 8 * 3600 * 1000)
    return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(now.getUTCDate()).padStart(2, '0')}`
  },

  getCurrentHour() {
    return new Date().getHours()
  },

  checkDateReset() {
    const today = this.getTodayStr()
    const savedDate = wx.getStorageSync('lastResetDate')
    if (savedDate !== today) {
      this.globalData.reRollCount = 3
      this.globalData.breakthroughReRollCount = 5
      this.saveToLocal('reRollData', { date: today, count: 3 })
      this.saveToLocal('breakthroughReRollData', { date: today, count: 5 })
      this.saveToLocal('lastResetDate', today)
    } else {
      // 从持久化恢复破圈次数
      const btData = wx.getStorageSync('breakthroughReRollData')
      if (btData && btData.date === today) {
        this.globalData.breakthroughReRollCount = btData.count
      } else {
        this.globalData.breakthroughReRollCount = 5
      }
    }
  },

  // B-02~B-06: 构造 generator-engine 上下文
  // 把 globalData + storage 的状态打包成纯函数入参
  // B-07~B-14: 追加 weatherDetail/recentLocations/recentLocationTimes/recentContents/userIntensity/targetDuration/locationName/season
  _buildEngineCtx(mode) {
    const completedIds = this.globalData.completedCommandIds || []
    const records = this.globalData.records || []
    // 已完成日期映射 {cmdId: dateStr}
    const completedDates = {}
    records.forEach(r => {
      if (r && r.commandId) completedDates[r.commandId] = r.date
    })
    // B-08/B-09: 从最近 5 次记录提取 requirePOI 列表 + 时间戳 + content 文本
    // 命令池建索引便于反查 requirePOI/content（记录本身只存 commandId + content 副本）
    const pool = this.globalData.commandPool || []
    const cmdMap = {}
    pool.forEach(c => { if (c && c.id) cmdMap[c.id] = c })
    const recentLocations = []
    const recentLocationTimes = []
    const recentContents = []
    records.slice(0, 5).forEach(r => {
      if (!r) return
      const cmd = r.commandId ? cmdMap[r.commandId] : null
      const poi = cmd && cmd.requirePOI && cmd.requirePOI !== 'null' ? cmd.requirePOI : null
      if (poi) {
        recentLocations.push(poi)
        // 时间戳：优先 completedAt → date 字符串解析 → now 兜底
        let ts = Date.now()
        if (r.completedAt) {
          const t = new Date(r.completedAt).getTime()
          if (!isNaN(t)) ts = t
        } else if (r.date) {
          const t = new Date(r.date).getTime()
          if (!isNaN(t)) ts = t
        }
        recentLocationTimes.push(ts)
      }
      // content 优先用 record 副本，缺失则从 command 反查
      const content = (typeof r.content === 'string' && r.content) ? r.content : (cmd && cmd.content) || ''
      if (content) recentContents.push(content)
    })
    // B-07: weatherDetail 从 globalData.weather 提取（当前 weather 无 visibility 字段，留空不过滤）
    const weather = this.globalData.weather || {}
    const weatherDetail = {
      temperature: Number.isFinite(weather.temperature) ? weather.temperature : null,
      visibility: '',
      condition: typeof weather.description === 'string' ? weather.description : ''
    }
    // B-10: userIntensity 从 userPreferences.intensity
    const userPrefs = this.globalData.userPreferences || { type: {} }
    const userIntensity = userPrefs.intensity === 'low' || userPrefs.intensity === 'high' ? userPrefs.intensity : 'medium'
    return {
      commandPool: pool,
      completedIds: completedIds,
      completedDates: completedDates,
      hour: this.getCurrentHour(),
      weather: (weather && weather.condition) || 'sunny',
      nearbyPOI: this.globalData.nearbyPOI || {},
      lastType: wx.getStorageSync('lastCommandType') || '',
      sameTypeCount: wx.getStorageSync('sameTypeCount') || 0,
      userPrefs: userPrefs,
      mode: mode || '',
      duration: 0,
      reduceMotion: !!wx.getStorageSync('reduceMotion'),
      // B-07 天气细筛
      weatherDetail: weatherDetail,
      // B-08 地点去重（最近 5 次 requirePOI + 时间戳）
      recentLocations: recentLocations,
      recentLocationTimes: recentLocationTimes,
      // B-09 历史体验去重（最近 5 次 content 文本）
      recentContents: recentContents,
      // B-10 难度匹配
      userIntensity: userIntensity,
      // B-12 时长匹配（mode 推算目标时长，0 表示不参与评分）
      targetDuration: this._modeTargetDuration(mode),
      // B-14 变量替换
      locationName: this.globalData.locationName || '',
      season: ''
    }
  },

  // B-12: mode → 目标时长映射，供 scoreCommand 时长匹配维度
  _modeTargetDuration(mode) {
    switch (mode) {
      case 'micro': return 10
      case 'walk': return 25
      case 'breakthrough': return 20
      case 'sync': return 30
      case 'night': return 15
      case 'rainy': return 15
      default: return 0
    }
  },

  checkContinuousDays() {
    const today = this.getTodayStr()
    const last = this.globalData.lastCompleteDate
    if (!last) return
    // 昨日按东八区计算，与 getTodayStr 时区策略一致
    const yesterday = new Date(Date.now() + 8 * 3600 * 1000)
    yesterday.setUTCDate(yesterday.getUTCDate() - 1)
    const yesterdayStr = `${yesterday.getUTCFullYear()}-${String(yesterday.getUTCMonth() + 1).padStart(2, '0')}-${String(yesterday.getUTCDate()).padStart(2, '0')}`
    if (last !== yesterdayStr && last !== today) this.globalData.continuousDays = 0
  },

  generateEscapeName() {
    const prefixes = ['周末', '迷路的', '踢影子的', '漫步的', '摘云的', '追风的', '捡落叶的']
    const suffixes = ['漫游者', '散步家', '观察员', '记录人', '探险家', '闲逛者']
    return prefixes[Math.floor(Math.random() * prefixes.length)] + suffixes[Math.floor(Math.random() * suffixes.length)]
  },

  // B-03/04/05: 委托给 generator-engine 三层过滤
  // 保持原返回结构：normalizeCommand 包装的候选数组
  getAvailableCommands() {
    const ctx = this._buildEngineCtx()
    const pool = this.globalData.commandPool
    // 三层过滤
    let candidates = generatorEngine.filterByConditions(pool, ctx)
    candidates = generatorEngine.filterByBusinessHours(candidates, ctx.hour)
    candidates = generatorEngine.filterBySafety(candidates, ctx)

    // 原兜底链：filtered → offline → pool → fallback
    if (!candidates.length) {
      candidates = this.globalData.offlineCommands.filter(cmd => !ctx.completedIds.includes(cmd.id))
    }
    if (!candidates.length) {
      candidates = pool.filter(c => !c.outdoor || !c.requirePOI)
    }
    if (!candidates.length) {
      candidates = this.getFallbackCommands()
    }
    return candidates.length ? candidates : this.getFallbackCommands()
  },

  getCompletedDate(cmdId) {
    const record = this.globalData.records.find(r => r.commandId === cmdId)
    return record ? record.date : null
  },

  // B-02~B-06: 委托给 generator-engine.generate
  // B-13: 消费 result.explanation 写入 cmd.explanation，供 generating/execution 页展示「为什么推荐它」
  // 保持原返回结构：单个 normalizeCommand 包装的 command
  rollCommand(mode) {
    const ctx = this._buildEngineCtx(mode)
    const result = generatorEngine.generate(ctx)
    if (!result || !result.ok || !result.command) {
      // 终极兜底
      const fb = this.getFallbackCommands()
      return fb[0] || null
    }
    const selected = result.command
    // normalizeCommand 包装（与原行为一致）
    const normalized = this.globalData.commandPool.find(c => c.id === selected.id) || selected
    const cmd = this.normalizeCommand(normalized)
    // B-13: 附加任务解释（reason/howto/tip），供 generating/execution 页展示
    if (result.explanation) cmd.explanation = result.explanation
    // B-12 标记 fallback（供前端区分「兜底推荐」与「正常推荐」）
    cmd.isFallback = !!result.fallback
    // 透传 roll 模式（micro/walk/night/rainy/sync）到 currentCommand → record，
    // 供 badge-engine 模式徽章判定（micro_master/night_master/rainy_master 等）
    if (mode) cmd.mode = mode
    this.rememberLastType(cmd.type)
    return cmd
  },

  // Henry: 破圈骰子独立摇取逻辑（100条专属指令池 + 画像推荐，不走 generator-engine）
  // v2: 改为异步（cb 回调），因破圈指令池通过 require.async 分包异步加载
  // 修复：原 Henry 版 candidates 为空时调 this.getFallbackCommands() 会返回微逃指令，
  // 破圈骰子可能摇出微逃任务，改为回退到破圈全池 pool
  rollBreakthroughCommand(cb) {
    // 未完成画像时不摇，由前端引导跳画像页（避免无画像优先推荐 + 业务规则模糊）
    if (!this.hasBreakthroughProfile()) {
      if (typeof cb === 'function') cb(null)
      return
    }
    this.ensureBreakthroughPool((pool) => {
      const selected = this._pickBreakthrough(pool)
      // 透传 mode='breakthrough' 到 currentCommand → record，供 badge-engine 判定
      if (selected) selected.mode = 'breakthrough'
      if (selected) this.rememberLastType(selected.type)
      if (typeof cb === 'function') cb(selected)
    })
  },

  // 纯函数：从破圈池中按「完成去重 + 深夜安全 + 反推荐过滤 + 画像优先」挑选一条
  // 抽出便于单元测试（零 wx 依赖，可直接在 Node 环境验证过滤链）
  _pickBreakthrough(pool) {
    pool = Array.isArray(pool) ? pool : []
    const completed = this.globalData.completedCommandIds || []
    const profile = this.globalData.breakthroughProfile
    const hour = this.getCurrentHour()
    const isLateNight = hour >= 22 || hour < 6
    // 将画像扁平化为 ["sport:often", "social:mid", ...] 方便匹配
    const profileTags = profile ? this.flattenProfile(profile) : []

    let candidates = pool.filter(cmd => {
      if (!cmd) return false
      if (completed.includes(cmd.id)) return false
      if (isLateNight && !cmd.nightSafe) return false
      // 反推荐：跳过用户日常已经做的事
      if (cmd.avoidTypes && profileTags.some(t => cmd.avoidTypes.includes(t))) return false
      return true
    })
    if (!candidates.length) candidates = pool // 无候选时回退全池（修复：不用 getFallbackCommands）
    // 优先推荐：匹配 recommendTypes 的指令权重更高
    if (profile && profileTags.length) {
      const preferred = candidates.filter(cmd => cmd.recommendTypes && cmd.recommendTypes.some(t => profileTags.includes(t)))
      if (preferred.length >= 1) candidates = preferred
    }
    if (!candidates.length) candidates = pool // 双重兜底：破圈池非空时一定有候选
    if (!candidates.length) return null // 三重兜底：pool 也为空（数据加载失败）时返回 null，避免 undefined.type 崩溃
    return candidates[Math.floor(Math.random() * candidates.length)]
  },

  // 后台预加载破圈指令池：进入首页 1.5s 后异步加载，避免首次点破圈骰子卡顿
  // 不阻塞启动主流程；v2 改用 ensureBreakthroughPool（require.async 分包异步化）
  preloadBreakthroughPool() {
    if (this._breakthroughPoolLoaded) return
    // 延迟 1500ms 让首页先渲染完，避免抢占启动资源
    setTimeout(() => {
      try {
        this.ensureBreakthroughPool(null)
      } catch (e) {}
    }, 1500)
  },

  // 将用户画像扁平化为 ["sport:often", "social:mid", ...] 标签数组
  flattenProfile(profile) {
    if (!profile || !profile.completed) return []
    const tags = []
    if (profile.sportFreq) tags.push('sport:' + profile.sportFreq)
    if (profile.socialTendency) tags.push('social:' + profile.socialTendency)
    if (profile.dailyRange) tags.push('range:' + profile.dailyRange)
    if (profile.hobbies && profile.hobbies.length) {
      profile.hobbies.forEach(h => tags.push('hobby:' + h))
    }
    return tags
  },

  // 检查用户是否已完成破圈画像
  hasBreakthroughProfile() {
    return !!(this.globalData.breakthroughProfile && this.globalData.breakthroughProfile.completed)
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

  useBreakthroughReroll() {
    if (this.globalData.breakthroughReRollCount <= 0) return false
    this.globalData.breakthroughReRollCount--
    this.saveToLocal('breakthroughReRollData', { date: this.getTodayStr(), count: this.globalData.breakthroughReRollCount })
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
    // 自动注入 executionProgress（普通出逃从 currentCommand 取，调用方无需显式传）
    // 确保 record.steps 升级为 [{text, completedAt}] 留痕，事后可追溯每步完成时间
    const rd = Object.assign({}, recordData || {})
    if (!rd.executionProgress && cmd.executionProgress) {
      rd.executionProgress = cmd.executionProgress
    }
    // POI 指令自带 location：调用方未传时用 cmd.location，确保记录带坐标落地图
    const isLoc = recordBuilder._internal.isLocObj
    if (!isLoc(rd.location) && isLoc(cmd.location)) {
      rd.location = cmd.location
    }
    // 同频出逃扩展字段自动注入（委托 record-builder 纯函数，便于单测/变异测试覆盖）
    // record 页 onSave 只传基础字段时，isGroup/groupId/members/steps 从 currentCommand 补齐
    // 普通出逃 cmd.isGroup 不存在，不注入，零影响
    Object.assign(rd, recordBuilder.injectGroupFields(cmd, rd))
    // 委托给 record-builder 纯函数构造记录（普通 + 同频统一入口）
    // 保证 location/stickers/group 扩展字段一致，下游 map/profile/badges 数据联动
    const record = recordBuilder.buildRecord(cmd, rd, {
      location: this.globalData.location,
      weather: this.globalData.weather,
      now: Date.now()
    })

    this.globalData.records.unshift(record)
    // records 裁剪上限避免 storage 超限（单 key 1MB / 总 10MB），保留最近 500 条
    if (this.globalData.records.length > 500) {
      this.globalData.records = this.globalData.records.slice(0, 500)
    }
    if (!this.globalData.completedCommandIds.includes(cmd.id)) this.globalData.completedCommandIds.push(cmd.id)
    this.updateContinuousDays()
    this.updatePreferences(record)
    // 同频出逃：从 record.members 反向聚合 partnerRecords（社交徽章 social_master 依赖）
    if (record.isGroup === true && Array.isArray(record.members)) {
      this._aggregatePartnerRecords(record.members, record)
    }
    this.checkBadges()
    this.globalData.currentCommand = null
    this.globalData.commandStatus = 'idle'
    this.saveCurrentCommand()
    this.saveAll()
    return record
  },

  // 同频出逃完成后，把成员（排除自己）聚合到 partnerRecords
  // 按 openId/nickname 去重，累加 count，更新 lastDate/favMode
  _aggregatePartnerRecords(members, record) {
    try {
      const gd = this.globalData
      const list = Array.isArray(gd.partnerRecords) ? gd.partnerRecords.slice() : []
      const me = gd.escapeName || ''
      members.forEach(m => {
        if (!m) return
        const name = (typeof m === 'object') ? (m.nickname || m.name || '') : String(m)
        if (!name || name === me) return
        const key = (m.openId) ? 'oid_' + m.openId : 'name_' + name
        let entry = list.find(p => p && p._key === key)
        if (!entry) {
          entry = { _key: key, nickname: name, openId: m.openId || '', count: 0, lastDate: '', favMode: '' }
          list.push(entry)
        }
        entry.count = (entry.count || 0) + 1
        entry.lastDate = record.date || ''
        if (record.mode) entry.favMode = record.mode
      })
      gd.partnerRecords = list
    } catch (e) {
      console.warn('[app] partnerRecords 聚合失败', e)
    }
  },

  updateContinuousDays() {
    const today = this.getTodayStr()
    if (this.globalData.lastCompleteDate === today) return
    // 昨日按东八区计算，与 getTodayStr 时区策略一致
    const y = new Date(Date.now() + 8 * 3600 * 1000)
    y.setUTCDate(y.getUTCDate() - 1)
    const yStr = `${y.getUTCFullYear()}-${String(y.getUTCMonth() + 1).padStart(2, '0')}-${String(y.getUTCDate()).padStart(2, '0')}`
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
    // B4: 委托给 badge-engine 纯函数引擎（规则表 + 增量检测）
    // 原 21 条散落判定 + B4 新增 9 条（阶段记录 4 + 城市方向 5）统一收敛到 RULES 表
    const records = this.globalData.records || []
    const ctx = {
      continuousDays: this.globalData.continuousDays || 0,
      partnerRecords: this.globalData.partnerRecords || [],
      collectedCommands: this.globalData.collectedCommands || [],
      challengeCount: wx.getStorageSync('challengeCompletedCount') || 0,
      unlockedIds: (this.globalData.badges || []).map(b => b.id),
      today: this.getTodayStr()
    }
    const result = badgeEngine.detectUnlocks(records, ctx, BADGES)
    if (result.metas.length > 0) {
      const unlocked = this.globalData.badges
      result.metas.forEach(meta => unlocked.push(meta))
      this.globalData.pendingBadges = result.metas.map(m => m.name)
      this.playSound('unlock')
      // B4 数据埋点：徽章解锁事件
      try {
        const tracker = require('./utils/tracker.js')
        tracker.track('badge_unlock', { ids: result.added.join(','), count: result.added.length })
      } catch (e) { /* tracker 加载失败不阻塞 */ }
    }
  },

  // B4 记忆回收：检查 30 天前的记录，生成回访提醒
  // onLaunch 时调用一次，当天已忽略则不重复提醒
  checkMemoryRevisit() {
    try {
      const dismissedKey = memoryRevisit.todayDismissedKey(Date.now())
      const dismissedIds = wx.getStorageSync(dismissedKey) || []
      if (Array.isArray(dismissedIds) && dismissedIds.length > 0 && dismissedIds[0] === '__all__') {
        // 当天已全局忽略
        return null
      }
      const result = memoryRevisit.findRevisitMemory(this.globalData.records || [], {
        nowTs: Date.now(),
        daysAgo: 30,
        windowDays: 1,
        dismissedIds: dismissedIds
      })
      if (result.hasRevisit) {
        this.globalData.memoryRevisit = result
      }
      return result
    } catch (e) {
      console.warn('[app] 记忆回访检查失败：', e)
      return null
    }
  },

  // B4 记忆回收：忽略指定记录 id（当天不再提醒该记录）
  dismissMemoryRevisit(recordId) {
    try {
      const key = memoryRevisit.todayDismissedKey(Date.now())
      const list = wx.getStorageSync(key) || []
      if (!list.includes(recordId)) {
        list.push(recordId)
        wx.setStorageSync(key, list)
      }
    } catch (e) { /* ignore */ }
  },

  // B4 记忆回收：当天全部忽略（用户点击「不再提醒」）
  dismissAllMemoryRevisit() {
    try {
      const key = memoryRevisit.todayDismissedKey(Date.now())
      wx.setStorageSync(key, ['__all__'])
      this.globalData.memoryRevisit = null
    } catch (e) { /* ignore */ }
  }
})
