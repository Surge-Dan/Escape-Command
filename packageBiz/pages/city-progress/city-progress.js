const app = getApp()
const { TYPE_META } = require('../../../utils/constants.js')

const TYPE_NAME_CN = { color: '颜色探索', walk: '漫步发现', sense: '感官体验', collect: '收藏拼贴', food: '美食探索', culture: '如实文化' }
const GRID_ROWS = 6
const GRID_COLS = 8
const TOTAL_CELLS = GRID_ROWS * GRID_COLS
const MAX_BUCKETS_TARGET = 50 // 探索角落目标

Page({
  data: {
    statusBarHeight: 20,
    heatmap: [], // 6x8 grid
    exploredCount: 0,
    targetCount: MAX_BUCKETS_TARGET,
    progressPercent: 0,
    areaList: [], // 区域列表
    isEmpty: false,
    cityLabel: '你的城市',
    totalRecords: 0,
    hotAreas: [] // 高频角落 top3
  },

  onLoad() {
    const nav = app.getNavMetrics ? app.getNavMetrics() : {}
    this.setData({ statusBarHeight: nav.statusBarHeight || 20, navHeaderStyle: nav.navHeaderStyle || '' })
  },

  onShow() {
    this.refresh()
  },

  refresh() {
    const records = app.globalData.records || []
    const withLoc = records.filter(r => r.location && r.location.latitude && r.location.longitude)
    const cityLabel = this.deriveCityLabel(records)

    // 构造热力图：用 lat/lng 把记录分桶到 6x8 网格
    let buckets = []
    if (withLoc.length > 0) {
      buckets = this.bucketByGrid(withLoc)
    } else {
      // 没有定位：用记录数量生成模拟数据（演示效果）
      buckets = this.simulateBuckets(records)
    }

    const heatmap = this.buildHeatmap(buckets)
    const exploredCount = heatmap.filter(c => c.count > 0).length
    const progressPercent = Math.min(100, Math.round((exploredCount / MAX_BUCKETS_TARGET) * 100))

    // 区域列表
    const areaList = this.buildAreaList(buckets, records)
    const hotAreas = areaList.slice(0, 3)

    this.setData({
      heatmap,
      exploredCount,
      progressPercent,
      areaList,
      hotAreas,
      isEmpty: records.length === 0,
      cityLabel,
      totalRecords: records.length
    })
  },

  deriveCityLabel(records) {
    // 从 locationName 提取城市
    for (const r of records) {
      if (r.locationName && r.locationName.length > 0) {
        const parts = r.locationName.split('·')
        if (parts.length > 0 && parts[0]) return parts[0]
        return r.locationName
      }
    }
    const ln = app.globalData.locationName
    if (ln && ln !== '未定位') {
      const parts = ln.split('·')
      if (parts.length > 0 && parts[0]) return parts[0]
      return ln
    }
    return '你的城市'
  },

  // 把记录按 lat/lng 分桶到 6x8 网格
  bucketByGrid(records) {
    if (!records.length) return []
    const lats = records.map(r => r.location.latitude)
    const lngs = records.map(r => r.location.longitude)
    const minLat = Math.min(...lats), maxLat = Math.max(...lats)
    const minLng = Math.min(...lngs), maxLng = Math.max(...lngs)
    const latRange = Math.max(0.001, maxLat - minLat)
    const lngRange = Math.max(0.001, maxLng - minLng)

    const buckets = {} // key: row-col
    records.forEach(r => {
      const lat = r.location.latitude
      const lng = r.location.longitude
      // 行：纬度（高纬在上） → row 0 在北
      const row = Math.min(GRID_ROWS - 1, Math.floor(((maxLat - lat) / latRange) * GRID_ROWS))
      const col = Math.min(GRID_COLS - 1, Math.floor(((lng - minLng) / lngRange) * GRID_COLS))
      const key = `${row}-${col}`
      if (!buckets[key]) {
        buckets[key] = { row, col, count: 0, records: [], centerLat: 0, centerLng: 0 }
      }
      buckets[key].count++
      buckets[key].records.push(r)
      buckets[key].centerLat += lat
      buckets[key].centerLng += lng
    })

    return Object.values(buckets).map(b => {
      b.centerLat = b.centerLat / b.count
      b.centerLng = b.centerLng / b.count
      return b
    })
  },

  // 无定位时基于记录数量模拟热力图
  simulateBuckets(records) {
    const buckets = []
    if (!records.length) return buckets
    // 用伪随机种子（基于记录数）保证每次刷新一致
    const seed = records.length
    const rng = (i) => {
      const x = Math.sin(seed * 9301 + i * 49297) * 233280
      return x - Math.floor(x)
    }
    const usedCells = Math.min(TOTAL_CELLS, Math.max(3, Math.floor(records.length / 1.2)))
    const cells = []
    for (let i = 0; i < usedCells; i++) {
      const row = Math.floor(rng(i * 2) * GRID_ROWS)
      const col = Math.floor(rng(i * 2 + 1) * GRID_COLS)
      const key = `${row}-${col}`
      if (!cells.find(c => c.key === key)) {
        const count = 1 + Math.floor(rng(i * 3 + 7) * 4)
        cells.push({ key, row, col, count })
      }
    }
    return cells.map(c => ({
      row: c.row,
      col: c.col,
      count: c.count,
      records: [],
      centerLat: 0,
      centerLng: 0,
      simulated: true
    }))
  },

  buildHeatmap(buckets) {
    const map = {}
    buckets.forEach(b => {
      map[`${b.row}-${b.col}`] = b
    })
    const cells = []
    const maxCount = Math.max(1, ...buckets.map(b => b.count))
    for (let r = 0; r < GRID_ROWS; r++) {
      for (let c = 0; c < GRID_COLS; c++) {
        const b = map[`${r}-${c}`]
        const count = b ? b.count : 0
        // 不透明度：0 -> 0.04, max -> 1
        const opacity = count === 0 ? 0.06 : Math.min(1, 0.25 + (count / maxCount) * 0.75)
        const level = count === 0 ? 0 : (count >= maxCount * 0.66 ? 3 : count >= maxCount * 0.33 ? 2 : 1)
        cells.push({
          row: r,
          col: c,
          count,
          opacity,
          level,
          isHot: level === 3
        })
      }
    }
    return cells
  },

  buildAreaList(buckets, records) {
    if (!buckets.length) return []
    // 给每个 bucket 起个名字：使用 locationName 或「角落 R-C」
    const named = buckets.map((b, idx) => {
      let name = ''
      if (b.records && b.records.length > 0) {
        // 取该桶里第一条带 locationName 的
        const r = b.records.find(r => r.locationName)
        if (r && r.locationName) {
          name = r.locationName
        }
      }
      if (!name) {
        // 模拟一个文艺角落名
        name = this.simulatedAreaName(idx, b.row, b.col)
      }
      const lastDate = b.records && b.records.length > 0
        ? b.records.slice().sort((a, c) => {
            const ka = (a.date || '') + ' ' + (a.time || '')
            const kc = (c.date || '') + ' ' + (c.time || '')
            return kc.localeCompare(ka)
          })[0]
        : null
      return {
        id: `${b.row}-${b.col}`,
        name,
        count: b.count,
        row: b.row,
        col: b.col,
        lastDate: lastDate ? this.prettyDate(lastDate.date) : '',
        lastMood: lastDate ? (lastDate.mood || '') : '',
        simulated: !!b.simulated,
        heatLevel: b.count >= 4 ? 'hot' : b.count >= 2 ? 'warm' : 'cool'
      }
    })
    return named.sort((a, b) => b.count - a.count)
  },

  simulatedAreaName(idx, row, col) {
    const prefixes = ['北', '南', '东', '西', '中', '河', '街', '巷', '园', '桥']
    const suffixes = ['角', '口', '畔', '里', '边', '巷', '街', '区']
    const p = prefixes[(row + col) % prefixes.length]
    const s = suffixes[(row * 8 + col) % suffixes.length]
    return `${p}${s}·${row + 1}-${col + 1}`
  },

  prettyDate(dateStr) {
    if (!dateStr) return ''
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return dateStr
    const today = new Date()
    const todayStr = this.formatDate(today)
    const yest = new Date(today)
    yest.setDate(yest.getDate() - 1)
    const yestStr = this.formatDate(yest)
    if (dateStr === todayStr) return '今天'
    if (dateStr === yestStr) return '昨天'
    return `${d.getMonth() + 1}月${d.getDate()}日`
  },

  formatDate(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  },

  // ===== 交互 =====
  onCellTap(e) {
    const { row, col } = e.currentTarget.dataset
    const cell = this.data.heatmap.find(c => c.row == row && c.col == col)
    if (!cell || cell.count === 0) {
      wx.showToast({ title: '这个角落还没探索过', icon: 'none' })
      return
    }
    wx.showToast({ title: `${cell.count} 次出逃`, icon: 'none' })
  },

  onAreaTap(e) {
    const id = e.currentTarget.dataset.id
    const area = this.data.areaList.find(a => a.id === id)
    if (!area) return
    wx.showModal({
      title: area.name,
      content: `共出逃 ${area.count} 次\n最近一次：${area.lastDate || '暂无'}`,
      showCancel: false,
      confirmText: '好的'
    })
  },

  goHome() {
    wx.switchTab({ url: '/pages/index/index' })
  },

  goBack() {
    wx.navigateBack({ delta: 1 })
  }
})
