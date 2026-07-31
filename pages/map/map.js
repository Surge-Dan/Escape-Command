const app = getApp()
const { getTypeMeta } = require('../../utils/constants.js')
const markerBuilder = require('../../utils/map-marker-builder.js')

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

// 类型 → pin 图标
const TYPE_PIN_MAP = {
  color: '/assets/icons/pin-color.svg',
  sense: '/assets/icons/pin-sense.svg',
  food: '/assets/icons/pin-food.svg',
  culture: '/assets/icons/pin-culture.svg',
  walk: '/assets/icons/pin-walk.svg',
  collect: '/assets/icons/pin-collect.svg'
}

Page({
  data: {
    statusBarHeight: 20,
    navHeaderStyle: '',
    mapTabs: MAP_TABS,
    timeFilters: TIME_FILTERS,
    activeTab: 'standard',
    activeTime: 'all',
    currentCity: '',
    // 原生地图状态
    // 去掉北京硬编码：优先用真实定位，无定位时用中性兜底（中国中部）+ hasLocation=false 空状态引导
    mapCenter: { latitude: 35, longitude: 105 },
    hasLocation: false,
    mapScale: 12,
    mapHeight: 400,  // px，onLoad 中按系统信息计算
    mapMarkers: [],
    mapPolyline: [],
    // 路线模式固定出发点（家）
    homePoint: null,
    // 过滤后含坐标的记录
    filteredRecords: [],
    // 标记弹窗
    popupRecord: null,
    // 统计
    totalCount: 0,
    uniquePlaces: 0,
    totalDistance: 0,
    cityCount: 0
  },

  onLoad() {
    const sys = app.globalData.systemInfo || wx.getSystemInfoSync()
    const nav = app.getNavMetrics ? app.getNavMetrics() : {}
    const statusBarHeight = nav.statusBarHeight || app.globalData.statusBarHeight || sys.statusBarHeight || 20
    const navHeightPx = 80 * (sys.windowWidth / 750)
    const themeHeightPx = 136 * (sys.windowWidth / 750)
    const safeAreaBottom = sys.safeArea ? (sys.screenHeight - sys.safeArea.bottom) : 0
    const tabbarHeightPx = 100 * (sys.windowWidth / 750) + safeAreaBottom
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
    // 首次进入若已有真实定位，立即以真实定位为中心（修复「默认北京」）
    this.locateIfAvailable()
  },

  onShow() {
    this.refresh()
    // 后台返回时若拿到新定位，平滑回正到真实位置
    this.locateIfAvailable()
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 1 })
    }
  },

  // 有真实定位时把地图中心设为真实位置（避免显示北京/中性兜底）
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
    // fallback 链：真实定位 > 家 > 中性兜底（中国中部，避免硬编码北京）
    const NEUTRAL_CENTER = { latitude: 35, longitude: 105 }
    const fallback = app.globalData.location || this.data.homePoint || NEUTRAL_CENTER
    const center = located[0] ? located[0].location : fallback
    const hasLocation = !!(app.globalData.location && app.globalData.location.latitude)
    this.setData({
      filteredRecords: located,
      mapMarkers: markers,
      mapPolyline: polyline,
      mapCenter: { latitude: center.latitude, longitude: center.longitude },
      hasLocation: hasLocation,
      totalCount: allFiltered.length,
      uniquePlaces: this.countUniquePlaces(located),
      totalDistance: this.computeTotalDistance(located),
      cityCount: this.countCities(located)
    })
  },

  filterRecords() {
    const records = app.globalData.records || []
    return this.filterByTime(records, this.data.activeTime)
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

  toDateStr(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  },

  // ===== 标记构建 =====
  // C-13: 同频记录按 groupId 聚合为聚合 marker（成员数角标），普通记录各自 marker
  // solo marker id: 0..n-1（反查 this.markerRecords）
  // group marker id: 200000..（反查 this.markerGroups），避开「家」marker id 100000
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
        // C-13: 聚合 marker —— 复用现有 pin 图标，成员数用 label 文字渲染（不新增图片资源）
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

    // 保存反查表（实例属性，不进 data 避免渲染开销）
    this.markerRecords = markerRecords
    this.markerGroups = markerGroups

    // 路线模式下额外标记固定出发点「家」
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

  formatPopup(record) {
    if (!record) return null
    const meta = getTypeMeta(record.commandType)
    const dateText = this.formatDateText(record.date) + (record.time ? ' ' + record.time : '')
    return {
      id: record.id,
      typeColor: meta.color,
      typeName: meta.name,
      commandTitle: record.commandTitle || record.commandContent || '出逃记忆',
      dateText
    }
  },

  // ===== 交互 =====
  onTabTap(e) {
    const key = e.currentTarget.dataset.key
    if (key === this.data.activeTab) return
    if (key === 'route' && !this.data.homePoint) {
      wx.showToast({ title: '先设置出发点，路线将从这里开始', icon: 'none' })
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

  onMarkerTap(e) {
    const markerId = e.detail.markerId
    // C-13: group 聚合 marker（id >= 200000）展示聚合弹窗
    if (markerId >= 200000) {
      const g = (this.markerGroups || [])[markerId - 200000]
      if (g) {
        this.setData({
          popupRecord: {
            id: g.groupId,
            typeColor: '#5CBF9E',
            typeName: '同频',
            commandTitle: g.title,
            dateText: g.memberCount + ' 位朋友'
          }
        })
      }
      return
    }
    // 家 marker（id === 100000）不弹记录窗
    if (markerId === 100000) return
    // solo marker：反查 this.markerRecords
    const record = (this.markerRecords || [])[markerId]
    if (record) {
      this.setData({ popupRecord: this.formatPopup(record) })
    }
  },

  closePopup() {
    if (this.data.popupRecord) {
      this.setData({ popupRecord: null })
    }
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
    // 不支持 chooseLocation 时直接走 fallback
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
        // 取消或失败：仅在不支持时 fallback 到手动输入；其余情况（用户取消、权限拒绝）静默返回
        const msg = (err && err.errMsg) || ''
        if (/not\s*support/i.test(msg)) {
          this.setHomePointFallback()
        }
      }
    })
  },

  // fallback：原 v12 基于地图中心 + showModal 手动输入名称（兜底）
  setHomePointFallback() {
    const center = this.data.mapCenter
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
      url: '/packageBiz/pages/city-select/city-select',
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
    return { title: '我的城市记忆地图', path: '/pages/map/map' }
  }
})
