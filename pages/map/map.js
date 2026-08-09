const app = getApp()
const { getTypeMeta, MOODS } = require('../../utils/constants.js')
const markerBuilder = require('../../utils/map-marker-builder.js')
const revisitHelper = require('../../utils/revisit-helper.js')
const summaryBuilder = require('../../utils/summary-builder.js')
const imageFallback = require('../../utils/image-fallback.js')

// v4: 顶部模式 tab —— 三类：普通地图 / 卫星地图 / 路线模式
const MAP_TABS = [
  { key: 'standard', name: '地图' },
  { key: 'satellite', name: '卫星' },
  { key: 'route', name: '路线' }
]

// 时间筛选
const TIME_FILTERS = [
  { key: 'today', name: '今天' },
  { key: 'week', name: '本周' },
  { key: 'month', name: '本月' },
  { key: 'all', name: '全部' }
]

// B4-B: 类型筛选（全部/微逃/破圈/同频）
const TYPE_FILTERS = [
  { key: 'all', name: '全部' },
  { key: 'micro', name: '微逃' },
  { key: 'breakthrough', name: '破圈' },
  { key: 'sync', name: '同频' }
]

// 心情筛选（全部 + MOODS 5 项）
const MOOD_FILTERS = [{ key: 'all', name: '全部' }].concat(
  MOODS.map(function (m) { return { key: m.id, name: m.name } })
)

// 类型 → pin 图标
const TYPE_PIN_MAP = {
  color: '/assets/icons/pin-color.svg',
  sense: '/assets/icons/pin-sense.svg',
  food: '/assets/icons/pin-food.svg',
  culture: '/assets/icons/pin-culture.svg',
  walk: '/assets/icons/pin-walk.svg',
  collect: '/assets/icons/pin-collect.svg'
}

// 推导出逃模式名（微逃/破圈/同频）——产品文档 12.8「类型筛选（微逃、破圈、同频）」
function getModeName(record) {
  if (!record) return '微逃'
  if (record.isGroup === true) return '同频'
  if (record.commandType === 'breakthrough') return '破圈'
  return '微逃'
}

// 推导搭子文案
function getPartnersText(record) {
  if (!record) return '独行'
  if (record.isGroup === true) {
    var members = Array.isArray(record.members) ? record.members : []
    if (!members.length) return '同频组局'
    // 成员可能是字符串或对象，取昵称
    var names = members.map(function (m) {
      if (m && typeof m === 'object') return m.nickname || m.name || ''
      return typeof m === 'string' ? m : String(m)
    }).filter(function (n) { return n })
    if (!names.length) return '同频组局'
    return names.length > 2 ? names.slice(0, 2).join('、') + '等' + names.length + '人'
      : names.join('、')
  }
  if (record.commandType === 'breakthrough') return '独自破圈'
  return '独行'
}

// B4-B: mood id → 中文名映射（来自 constants.MOODS）
function buildMoodMeta() {
  var meta = {}
  for (var i = 0; i < MOODS.length; i++) {
    meta[MOODS[i].id] = MOODS[i].name
  }
  return meta
}

Page({
  data: {
    statusBarHeight: 20,
    navHeaderStyle: '',
    mapTabs: MAP_TABS,
    timeFilters: TIME_FILTERS,
    typeFilters: TYPE_FILTERS,
    moodFilters: MOOD_FILTERS,
    activeTab: 'standard',
    activeTime: 'all',
    activeType: 'all',      // B4-B: 类型筛选
    activeMood: 'all',      // B4-B: 情绪筛选
    showMoodRow: false,     // B4-B: 情绪筛选行折叠状态
    currentCity: '',
    // 原生地图状态
    mapCenter: { latitude: 35, longitude: 105 },
    hasLocation: false,
    mapScale: 12,
    mapHeight: 400,
    mapMarkers: [],
    mapPolyline: [],
    homePoint: null,
    filteredRecords: [],
    popupRecord: null,
    // 统计
    totalCount: 0,
    unlocatedCount: 0,
    uniquePlaces: 0,
    totalDistance: 0,
    cityCount: 0,
    theme: 'default',
    // B4-B: 城市关系总结（本月）
    citySummary: null,
    // B4-B: 重返此地弹窗
    revisitPopup: null
  },

  // 空方法：供 catchtap="noop" 拦截冒泡
  noop() {},

  // 图片加载失败兜底
  onImgError(e) { imageFallback.handle(e, this) },

  // 通过框架自动注入的 TabBar 实例控制显隐
  _setTabbarHidden(hidden) {
    const tabBar = typeof this.getTabBar === 'function' ? this.getTabBar() : null
    if (tabBar) tabBar.setData({ tabbarHidden: hidden })
  },

  onLoad() {
    const sys = app.globalData.systemInfo || wx.getSystemInfoSync()
    const nav = app.getNavMetrics ? app.getNavMetrics() : {}
    const statusBarHeight = nav.statusBarHeight || app.globalData.statusBarHeight || sys.statusBarHeight || 20
    // v15 修复：nav-header = height 80rpx + margin-bottom 16rpx = 96rpx（原计算漏了 16rpx margin）
    const navHeightPx = (80 + 16) * (sys.windowWidth / 750)
    // map-theme 实际高度：padding 28*2 + title 36*1.3 + gap 4 + sub 24*1.4 ≈ 142rpx
    const themeHeightPx = 142 * (sys.windowWidth / 750)
    const safeAreaBottom = sys.safeArea ? (sys.screenHeight - sys.safeArea.bottom) : 0
    // TabBar 占位：bottom 72rpx + 高 96rpx = 168rpx，加 safeAreaBottom
    const tabbarHeightPx = (72 + 96) * (sys.windowWidth / 750) + safeAreaBottom
    const mapHeight = sys.windowHeight - statusBarHeight - navHeightPx - themeHeightPx - tabbarHeightPx
    const homeRaw = wx.getStorageSync('homePoint') || app.globalData.homePoint || app.globalData.location || null
    this.setData({
      statusBarHeight,
      mapHeight: Math.max(300, Math.round(mapHeight)),
      navHeaderStyle: app.globalData.navHeaderStyle || '',
      homePoint: homeRaw ? {
        latitude: homeRaw.latitude,
        longitude: homeRaw.longitude,
        name: homeRaw.name || '家'
      } : null
    })
    this.loadCurrentCity()
    this.refresh()
    this.locateIfAvailable()
  },

  onShow() {
    this.setData({ theme: app.globalData.theme || 'default' })
    // 清除切后台前可能残留的弹窗，避免 TabBar 覆盖弹窗底部
    if (this.data.popupRecord) this.setData({ popupRecord: null })
    if (this.data.revisitPopup) this.setData({ revisitPopup: null })
    this.refresh()
    this.locateIfAvailable()
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 1, tabbarHidden: false })
    }
  },

  locateIfAvailable() {
    const loc = app.globalData.location
    if (loc && loc.latitude && loc.longitude) {
      this.setData({
        mapCenter: { latitude: loc.latitude, longitude: loc.longitude },
        hasLocation: true,
        mapScale: 14
      })
    }
  },

  loadCurrentCity() {
    const gd = app.globalData
    let city = gd.currentCity || ''
    if (!city && gd.locationName) {
      city = String(gd.locationName).split('·')[0] || gd.locationName
    }
    if (!city) city = '未定位'
    this.setData({ currentCity: city })
  },

  // ===== 数据刷新 =====
  refresh() {
    const allFiltered = this.filterRecords()
    const located = allFiltered.filter(r => r.location && r.location.latitude && r.location.longitude)
    let markers = []
    let polyline = []
    if (this.data.activeTab === 'standard' || this.data.activeTab === 'satellite') {
      markers = this.buildMarkers(located)
    } else if (this.data.activeTab === 'route') {
      markers = this.buildMarkers(located)
      polyline = this.buildPolyline(located)
    }
// fallback 链：真实定位 > 家 > 中性兜底
    const NEUTRAL_CENTER = { latitude: 35, longitude: 105 }
    const fallback = app.globalData.location || this.data.homePoint || NEUTRAL_CENTER
    const center = located[0] ? located[0].location : fallback
    const hasLocation = !!(app.globalData.location && app.globalData.location.latitude)
    // B4 修复：totalCount 用 located.length（有坐标记录数）作空状态判断；
    // 无坐标记录单独统计 unlocatedCount，避免「有计数无点位也无空状态」的灰色地带。

    // B4-B: 动态构建情绪选项（基于全部记录，不受时间/类型筛选影响，保证选项稳定）
    const moodMeta = buildMoodMeta()
    const allRecords = app.globalData.records || []
    const moodFilters = markerBuilder.buildMoodOptions(allRecords, moodMeta)

    // B4-B: 城市关系总结（本月）
    const citySummary = this.buildCitySummary(allRecords)

    this.setData({
      filteredRecords: located,
      mapMarkers: markers,
      mapPolyline: polyline,
      mapCenter: { latitude: center.latitude, longitude: center.longitude },
      hasLocation: hasLocation,
      totalCount: located.length,
      unlocatedCount: Math.max(0, allFiltered.length - located.length),
      uniquePlaces: this.countUniquePlaces(located),
      totalDistance: this.computeTotalDistance(located),
      cityCount: this.countCities(located),
      moodFilters: moodFilters,
      citySummary: citySummary
    })
  },

  // 组合筛选：时间 + 类型 + 心情
  filterRecords() {
    const records = app.globalData.records || []
    // B4-B: 组合筛选 = 时间 + 类型 + 情绪（纯函数链）
    return markerBuilder.filterRecords(records, {
      timeRange: this._mapTimeKey(this.data.activeTime),
      type: this.data.activeType,
      mood: this.data.activeMood
    })
  },

  // 把首页时间筛选 key 映射为 markerBuilder 支持的 range
  // today → 兜底为 all（markerBuilder 仅支持 week/month/all，today 暂归 all 避免空集）
  _mapTimeKey(key) {
    if (key === 'today') return 'all'
    return key  // week / month / all
  },

  // B4-B: 城市关系总结（本月）
  buildCitySummary(records) {
    try {
      const now = new Date()
      const s = summaryBuilder.buildMonthlySummary(records, now.getFullYear(), now.getMonth() + 1)
      if (!s || s.recordCount === 0) return null
      return {
        periodLabel: s.periodLabel,
        recordCount: s.recordCount,
        uniquePlaces: s.uniquePlaces,
        topCity: s.topCity,
        topMood: s.topMood,
        highlightDays: s.highlightDays,
        summary: s.summary
      }
    } catch (e) {
      return null
    }
  },

  // ===== 时间筛选 =====
  filterByTime(records, key) {
    if (key === 'all') return records.slice()
    const now = new Date()
    const today = this.toDateStr(now)
    const weekAgo = new Date(now)
    weekAgo.setDate(weekAgo.getDate() - 7)
    const weekStr = this.toDateStr(weekAgo)
    const monthAgo = new Date(now)
    monthAgo.setMonth(monthAgo.getMonth() - 1)
    const monthStr = this.toDateStr(monthAgo)

    return records.filter(r => {
      const d = r.date || ''
      if (key === 'today') return d === today
      if (key === 'week') return d >= weekStr && d <= today
      if (key === 'month') return d >= monthStr && d <= today
      return true
    })
  },

  // ===== 类型筛选（微逃/破圈/同频）=====
  filterByType(records, key) {
    if (key === 'all') return records.slice()
    return records.filter(r => getModeName(r) === this.typeKeyToName(key))
  },

  typeKeyToName(key) {
    if (key === 'micro') return '微逃'
    if (key === 'breakthrough') return '破圈'
    if (key === 'sync') return '同频'
    return ''
  },

  // ===== 心情筛选 =====
  filterByMood(records, key) {
    if (key === 'all') return records.slice()
    return records.filter(r => r.mood === key)
  },

  toDateStr(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  },

  // ===== 标记构建 =====
  buildMarkers(records) {
    const solo = markerBuilder.buildSoloMarkers(records)
    const group = markerBuilder.buildGroupMarkers(records)
    const merged = markerBuilder.mergeMarkers(solo, group)

    const markerRecords = []
    const markerGroups = []
    const markers = []
    let soloId = 0
    let groupId = 200000

    merged.markers.forEach(m => {
      if (m.kind === 'solo') {
        const id = soloId++
        markerRecords.push(m.data.record)
        markers.push({
          id,
          latitude: m.data.latitude,
          longitude: m.data.longitude,
          title: m.data.title,
          iconPath: TYPE_PIN_MAP[m.data.type] || TYPE_PIN_MAP.color,
          width: 32,
          height: 32,
          anchor: { x: 0.5, y: 1 },
          callout: {
            content: m.data.title,
            color: '#2E2F33',
            fontSize: 12,
            borderRadius: 8,
            padding: 8,
            bgColor: '#FFFFFF',
            display: 'BYCLICK'
          }
        })
      } else {
        const id = groupId++
        markerGroups.push(m.data)
        markers.push({
          id,
          latitude: m.data.latitude,
          longitude: m.data.longitude,
          title: m.data.title,
          iconPath: TYPE_PIN_MAP[m.data.primaryType] || TYPE_PIN_MAP.color,
          width: 36,
          height: 36,
          anchor: { x: 0.5, y: 1 },
          label: {
            content: m.data.memberCount + '人',
            color: '#fff',
            fontSize: 10,
            bgColor: '#5CBF9E',
            borderRadius: 20,
            padding: 4,
            anchorX: 18,
            anchorY: -8,
            textAlign: 'center'
          },
          callout: {
            content: m.data.title,
            color: '#2E2F33',
            fontSize: 12,
            borderRadius: 8,
            padding: 8,
            bgColor: '#FFFFFF',
            display: 'BYCLICK'
          }
        })
      }
    })

    this.markerRecords = markerRecords
    this.markerGroups = markerGroups

    if (this.data.activeTab === 'route' && this.data.homePoint) {
      const home = this.data.homePoint
      markers.push({
        id: 100000,
        latitude: home.latitude,
        longitude: home.longitude,
        title: home.name || '家',
        iconPath: TYPE_PIN_MAP.color,
        width: 32,
        height: 32,
        anchor: { x: 0.5, y: 1 },
        callout: {
          content: home.name || '家',
          color: '#2E2F33',
          fontSize: 12,
          borderRadius: 8,
          padding: 8,
          bgColor: '#FFFFFF',
          display: 'BYCLICK'
        }
      })
    }

    return markers
  },

  // 路线模式：按时间顺序连线；若存在 homePoint，则以家为固定起点
  buildPolyline(records) {
    const sorted = records
      .filter(r => r.location)
      .sort((a, b) => new Date(a.date || a.createdAt || 0) - new Date(b.date || b.createdAt || 0))
    const points = []
    if (this.data.homePoint) {
      points.push({
        latitude: this.data.homePoint.latitude,
        longitude: this.data.homePoint.longitude
      })
    }
    sorted.forEach(r => {
      points.push({
        latitude: r.location.latitude,
        longitude: r.location.longitude
      })
    })
    if (points.length < 2) return []
    return [{
      points,
      color: '#5CBF9E',
      width: 6,
      dottedLine: false,
      arrowLine: true,
      borderColor: '#45B08C',
      borderWidth: 2
    }]
  },

  // ===== 统计 =====
  countUniquePlaces(records) {
    const set = new Set()
    records.forEach(r => {
      if (!r.location) return
      const name = r.location.name || `${r.location.latitude.toFixed(2)},${r.location.longitude.toFixed(2)}`
      set.add(name)
    })
    return set.size
  },

  countCities(records) {
    const set = new Set()
    records.forEach(r => {
      if (!r.location) return
      const key = r.location.city || `${r.location.latitude.toFixed(1)},${r.location.longitude.toFixed(1)}`
      set.add(key)
    })
    return set.size
  },

  computeTotalDistance(records) {
    const sorted = records
      .filter(r => r.location)
      .sort((a, b) => new Date(a.date || a.createdAt || 0) - new Date(b.date || b.createdAt || 0))
    let total = 0
    for (let i = 1; i < sorted.length; i++) {
      total += this.haversine(sorted[i - 1].location, sorted[i].location)
    }
    return Math.round(total * 10) / 10
  },

  haversine(a, b) {
    if (!a || !b) return 0
    const R = 6371
    const dLat = (b.latitude - a.latitude) * Math.PI / 180
    const dLng = (b.longitude - a.longitude) * Math.PI / 180
    const lat1 = a.latitude * Math.PI / 180
    const lat2 = b.latitude * Math.PI / 180
    const h = Math.pow(Math.sin(dLat / 2), 2) + Math.cos(lat1) * Math.cos(lat2) * Math.pow(Math.sin(dLng / 2), 2)
    return 2 * R * Math.asin(Math.sqrt(h))
  },

  formatDateText(dateStr) {
    if (!dateStr) return ''
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return dateStr
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${m}月${day}日`
  },

  // 富化弹窗：出逃模式 / 搭子 / 时长 / 心情 / 天气 / 照片缩略图
  formatPopup(record) {
    if (!record) return null
    const meta = getTypeMeta(record.commandType)
    const dateText = this.formatDateText(record.date) + (record.time ? ' ' + record.time : '')
    const mood = MOODS.find(m => m.id === record.mood)
    const w = record.weather || {}
    const weatherText = w.description
      ? `${w.temperature !== undefined && w.temperature !== null ? w.temperature : ''}℃ ${w.description}`
      : (w.condition || '')
    const duration = record.duration
    const durationText = duration ? (duration >= 60 ? (Math.round(duration / 60 * 10) / 10) + ' 小时' : duration + ' 分钟') : ''
    const photoThumb = (record.photos && record.photos.length) ? record.photos[0] : ''
    // B4-B: 判断是否可重返（有坐标即可）
    const canRevisit = !!(record.location && record.location.latitude && record.location.longitude)
    return {
      id: record.id,
      typeColor: meta.color,
      typeName: meta.name,
      modeName: getModeName(record),
      commandTitle: record.commandTitle || record.commandContent || '出逃记忆',
      dateText,
      partnersText: getPartnersText(record),
      durationText,
      moodName: mood ? mood.name : (record.mood || ''),
      weatherText,
      photoThumb,
      isBreakthrough: record.commandType === 'breakthrough',
      isGroup: record.isGroup === true,
      canRevisit,
      moodText: this._moodLabel(record.mood)
    }
  },

  // B4-B: mood id → 中文名
  _moodLabel(mood) {
    if (!mood || typeof mood !== 'string') return ''
    for (let i = 0; i < MOODS.length; i++) {
      if (MOODS[i].id === mood) return MOODS[i].name
    }
    return mood
  },

  // B4-B: 重返此地 —— 弹出确认卡片
  onRevisitTap() {
    const popup = this.data.popupRecord
    if (!popup || !popup.canRevisit) return
    // 从 markerRecords 反查完整 record
    const record = (this.markerRecords || []).find(r => r && r.id === popup.id)
    if (!record) {
      wx.showToast({ title: '记录已失效', icon: 'none' })
      return
    }
    if (!revisitHelper.canRevisit(record)) {
      wx.showToast({ title: '该记录无坐标，无法重返', icon: 'none' })
      return
    }
    const summary = revisitHelper.buildRevisitSummary(record)
    this.setData({ revisitPopup: summary })
    this._setTabbarHidden(true)
  },

  closeRevisitPopup() {
    if (this.data.revisitPopup) {
      this.setData({ revisitPopup: null })
      this._setTabbarHidden(false)
    }
  },

  // B4-B: 确认重返 → 生成新指令种子并跳转执行页
  confirmRevisit() {
    const popup = this.data.popupRecord
    if (!popup) return
    const record = (this.markerRecords || []).find(r => r && r.id === popup.id)
    if (!record || !revisitHelper.canRevisit(record)) {
      this.setData({ revisitPopup: null })
      this._setTabbarHidden(false)
      wx.showToast({ title: '无法生成重返任务', icon: 'none' })
      return
    }
    const cmd = revisitHelper.buildRevisitCommand(record, { nowTs: Date.now() })
    if (!cmd) {
      this.setData({ revisitPopup: null })
      this._setTabbarHidden(false)
      wx.showToast({ title: '生成失败，请重试', icon: 'none' })
      return
    }
    // 写入 globalData 供执行页消费
    app.globalData.currentCommand = cmd
    // 数据埋点：重返此地
    try {
      const tracker = require('../../utils/tracker.js')
      tracker.track('revisit_place', { fromRecordId: record.id, type: cmd.type })
    } catch (e) { /* tracker 加载失败不阻塞 */ }
    this.setData({ revisitPopup: null, popupRecord: null })
    this._setTabbarHidden(false)
    wx.navigateTo({ url: '/pages/executing/executing?revisit=1' })
  },

  // ===== 交互 =====
  onTabTap(e) {
    const key = e.currentTarget.dataset.key
    if (key === this.data.activeTab) return
    // B1 修复：route 无 homePoint 时提示后不切换，与文案「路线将从这里开始」一致
    if (key === 'route' && !this.data.homePoint) {
      wx.showToast({ title: '先设置出发点，路线将从这里开始', icon: 'none' })
      return
    }
    this.setData({ activeTab: key, popupRecord: null })
    this.refresh()
  },

  onTimeTap(e) {
    const key = e.currentTarget.dataset.key
    if (key === this.data.activeTime) return
    this.setData({ activeTime: key, popupRecord: null })
    this.refresh()
  },

// B4-B: 类型筛选
  onTypeTap(e) {
    const key = e.currentTarget.dataset.key
    if (key === this.data.activeType) return
    this.setData({ activeType: key, popupRecord: null })
    this.refresh()
  },

  // B4-B: 情绪筛选
  onMoodTap(e) {
    const key = e.currentTarget.dataset.key
    if (key === this.data.activeMood) return
    this.setData({ activeMood: key, popupRecord: null })
    this.refresh()
  },

  // B4-B: 展开/收起情绪筛选行
  onToggleMoodRow() {
    this.setData({ showMoodRow: !this.data.showMoodRow })
  },

  onMarkerTap(e) {
    const markerId = e.detail.markerId
    // C-13: group 聚合 marker（id >= 200000）展示聚合弹窗
    if (markerId >= 200000) {
      const g = (this.markerGroups || [])[markerId - 200000]
      if (g) {
        // 同频聚合：也走富弹窗，成员数作为搭子文案
        this.setData({
          popupRecord: {
            id: g.groupId,
            typeColor: '#5CBF9E',
            typeName: '同频',
            modeName: '同频',
            commandTitle: g.title,
            dateText: '',
            partnersText: g.memberCount + ' 位朋友',
            durationText: '',
            moodName: '',
            weatherText: '',
            photoThumb: '',
            isBreakthrough: false,
            isGroup: true,
            isGroupAgg: true
          }
        })
        this._setTabbarHidden(true)
      }
      return
    }
    if (markerId === 100000) return
    const record = (this.markerRecords || [])[markerId]
    if (record) {
      this.setData({ popupRecord: this.formatPopup(record) })
      this._setTabbarHidden(true)
    }
  },

  closePopup() {
    if (this.data.popupRecord) {
      this.setData({ popupRecord: null })
      this._setTabbarHidden(false)
    }
  },

  // A2: 跳转 record-detail 详情页（复用已有页，参数 ?id= 与首页 goRecordDetail 一致）
  goRecordDetailFromMap() {
    const popup = this.data.popupRecord
    if (!popup || !popup.id || popup.isGroupAgg) {
      // 聚合 group 无单条 record id，不跳转
      if (popup && popup.isGroupAgg) {
        wx.showToast({ title: '同频记录请在「我的」查看', icon: 'none' })
      }
      return
    }
    this.setData({ popupRecord: null })
    wx.navigateTo({ url: '/pages/record-detail/record-detail?id=' + popup.id })
  },

  // v4: 定位 —— 用 mapContext.moveToLocation 平滑回正
  locate() {
    const mapCtx = wx.createMapContext('escapeMap', this)
    const loc = app.globalData.location
    if (loc) {
      this.setData({
        mapCenter: { latitude: loc.latitude, longitude: loc.longitude },
        mapScale: 14
      })
      if (mapCtx && mapCtx.moveToLocation) {
        try {
          mapCtx.moveToLocation({
            latitude: loc.latitude,
            longitude: loc.longitude,
            success: () => {
              try { wx.vibrateShort({ type: 'light' }) } catch (e) {}
            }
          })
        } catch (e) {}
      }
    } else {
      wx.showToast({ title: '未获取到定位', icon: 'none' })
    }
  },

  // v14: 调用微信原生地图选点设置固定出发点；不可用时 fallback 到手动输入
  setHomePoint() {
    if (typeof wx.chooseLocation !== 'function') {
      this.setHomePointFallback()
      return
    }
    wx.chooseLocation({
      success: (res) => {
        if (!res || !res.latitude || !res.longitude) return
        const homePoint = {
          latitude: res.latitude,
          longitude: res.longitude,
          name: res.name || '家'
        }
        wx.setStorageSync('homePoint', homePoint)
        app.globalData.homePoint = homePoint
        this.setData({ homePoint })
        this.refresh()
        wx.showToast({ title: '已设为出发点', icon: 'success' })
      },
      fail: (err) => {
        const msg = (err && err.errMsg) || ''
        if (/not\s*support/i.test(msg)) {
          this.setHomePointFallback()
        }
      }
    })
  },

  // B5 修复：fallback 优先用 globalData.location（真实定位），其次 mapCenter
  setHomePointFallback() {
    const loc = app.globalData.location
    const center = (loc && loc.latitude && loc.longitude)
      ? { latitude: loc.latitude, longitude: loc.longitude }
      : this.data.mapCenter
    if (!center || !center.latitude || !center.longitude) {
      wx.showToast({ title: '无法获取当前位置', icon: 'none' })
      return
    }
    const existingName = (this.data.homePoint && this.data.homePoint.name) || ''
    wx.showModal({
      title: '设置出发点',
      editable: true,
      placeholderText: existingName ? `当前：${existingName}` : '例如：家',
      content: existingName,
      success: (res) => {
        if (!res.confirm) return
        const name = (res.content || '').trim()
        if (!name) return
        const homePoint = {
          latitude: center.latitude,
          longitude: center.longitude,
          name
        }
        wx.setStorageSync('homePoint', homePoint)
        app.globalData.homePoint = homePoint
        this.setData({ homePoint })
        this.refresh()
        wx.showToast({ title: '已设为出发点', icon: 'success' })
      }
    })
  },

  goCitySelect() {
    wx.navigateTo({
      url: '/pages/city-select/city-select',
      fail: () => {
        wx.showToast({ title: '城市选择页未就绪', icon: 'none' })
      }
    })
  },

  openCitySelect() {
    this.goCitySelect()
  },

  goEscape() {
    wx.switchTab({ url: '/pages/index/index' })
  },

  onShareAppMessage() {
    // B4-D: 分享携带城市关系总结
    const s = this.data.citySummary
    let title = '我的城市记忆地图'
    if (s && s.recordCount > 0) {
      title = '这个月我出逃了 ' + s.recordCount + ' 次，走过 ' + s.uniquePlaces + ' 个角落'
    }
    return {
      title: title,
      path: '/pages/map/map',
      imageUrl: ''  // 走默认截图
    }
  }
})
