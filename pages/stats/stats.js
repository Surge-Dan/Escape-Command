const app = getApp()

// 类型元信息（与 utils/constants.js 的 TYPE_META 对齐，避免引入 utils 依赖）
const TYPE_META = {
  color:   { name: '颜色',   color: '#5B8FB9' },
  walk:    { name: '漫步',   color: '#D98A5C' },
  sense:   { name: '感官',   color: '#9B7BB8' },
  collect: { name: '收藏',   color: '#C9B037' },
  food:    { name: '美食',   color: '#A67C52' },
  culture: { name: '文化',   color: '#5CBF9E' }
}
const TYPE_ORDER = ['color', 'walk', 'sense', 'collect', 'food', 'culture']

// 时长分桶
const DURATION_BUCKETS = [
  { label: '< 10 分钟', min: 0,   max: 10 },
  { label: '10-20 分钟', min: 10, max: 20 },
  { label: '20-30 分钟', min: 20, max: 30 },
  { label: '30-60 分钟', min: 30, max: 60 },
  { label: '60 分钟+',  min: 60, max: Infinity }
]

const MONTH_LABELS = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']

Page({
  data: {
    statusBarHeight: 20,
    isEmpty: true,
    totalEscapes: 0,
    totalHours: 0,
    totalMinutes: 0,
    totalLocations: 0,
    durationBuckets: [],
    typeBars: [],
    typeMaxCount: 0,
    typeMidCount: 0,
    monthBars: [],
    monthMaxCount: 0,
    monthMidCount: 0,
    heatmap: []
  },

  onLoad() {
    const nav = app.getNavMetrics ? app.getNavMetrics() : {}
    this.setData({ statusBarHeight: nav.statusBarHeight || 20, navHeaderStyle: nav.navHeaderStyle || '' })
    this.loadAll()
  },

  onShow() {
    this.loadAll()
  },

  loadAll() {
    const records = app.globalData.records || []
    if (records.length < 3) {
      this.setData({ isEmpty: true })
      return
    }

    // 顶部总览
    const totalMin = records.reduce((sum, r) => sum + (r.duration || 0), 0)
    const totalHours = Math.floor(totalMin / 60)
    const totalMinutes = totalMin % 60
    const locationSet = new Set(records.filter(r => r.location).map(r => `${Math.round(r.location.latitude * 100) / 100},${Math.round(r.location.longitude * 100) / 100}`))
    const totalLocations = locationSet.size

    // 1. 时长分布
    const durationCounts = DURATION_BUCKETS.map(b => records.filter(r => {
      const d = r.duration || 0
      return d >= b.min && d < b.max
    }).length)
    const durationMax = Math.max(1, ...durationCounts)
    const durationBuckets = DURATION_BUCKETS.map((b, i) => ({
      label: b.label,
      count: durationCounts[i],
      percent: durationCounts[i] === 0 ? 0 : Math.max(8, Math.round(durationCounts[i] / durationMax * 100)),
      color: 'var(--brand)'
    }))

    // 2. 类型偏好
    const typeCounts = {}
    TYPE_ORDER.forEach(t => { typeCounts[t] = 0 })
    records.forEach(r => {
      const t = r.commandType
      if (typeCounts[t] !== undefined) typeCounts[t]++
    })
    const typeMax = Math.max(1, ...Object.values(typeCounts))
    const typeBars = TYPE_ORDER.map(t => ({
      id: t,
      name: TYPE_META[t].name,
      color: TYPE_META[t].color,
      count: typeCounts[t],
      height: typeCounts[t] === 0 ? 0 : Math.max(6, Math.round(typeCounts[t] / typeMax * 100))
    }))

    // 3. 月度趋势
    const currentYear = new Date().getFullYear()
    const currentMonth = new Date().getMonth()
    const monthCounts = new Array(12).fill(0)
    records.forEach(r => {
      if (!r.date) return
      const parts = r.date.split('-')
      if (parts.length < 2) return
      const y = parseInt(parts[0])
      const m = parseInt(parts[1]) - 1
      if (y === currentYear) monthCounts[m]++
    })
    const monthMax = Math.max(1, ...monthCounts)
    const monthBars = monthCounts.map((count, i) => ({
      month: i,
      label: MONTH_LABELS[i],
      count,
      current: i === currentMonth,
      height: count === 0 ? 0 : Math.max(6, Math.round(count / monthMax * 100))
    }))

    // 4. 热力日历（最近 12 周 × 7 天 = 84 格，按列优先填充）
    const heatmap = this.buildHeatmap(records)

    this.setData({
      isEmpty: false,
      totalEscapes: records.length,
      totalHours,
      totalMinutes,
      totalLocations,
      durationBuckets,
      typeBars,
      typeMaxCount: typeMax,
      typeMidCount: Math.round(typeMax / 2),
      monthBars,
      monthMaxCount: monthMax,
      monthMidCount: Math.round(monthMax / 2),
      heatmap
    })
  },

  buildHeatmap(records) {
    // 把每个 record 的 date 字符串转成 YYYY-MM-DD 的 Date 对象
    const dateCounts = {}
    records.forEach(r => {
      if (!r.date) return
      dateCounts[r.date] = (dateCounts[r.date] || 0) + 1
    })

    // 今天作为终点，向前推 12*7 = 84 天
    // 每一列代表一周，列内 7 行代表 周一~周日（或 日~六）
    // 这里采用 周一为一周起点：先把今天对齐到所在周的周一
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // 找到今天所在周的周日（如果是周一为起点，则向前走到周一）
    // 我们用 周日为一周起点（与 DAY_LABELS 中「日」放第一位一致）
    const dayOfWeek = today.getDay() // 0=周日, 1=周一...
    // 让 today 所在的列是最后一列：最后一列的周日 = today 减去 dayOfWeek 天
    const lastSunday = new Date(today)
    lastSunday.setDate(today.getDate() - dayOfWeek)
    // 第一列的周日 = lastSunday - (11 * 7) 天
    const firstSunday = new Date(lastSunday)
    firstSunday.setDate(lastSunday.getDate() - 11 * 7)

    const cells = []
    for (let col = 0; col < 12; col++) {
      for (let row = 0; row < 7; row++) {
        const d = new Date(firstSunday)
        d.setDate(firstSunday.getDate() + col * 7 + row)
        const y = d.getFullYear()
        const m = String(d.getMonth() + 1).padStart(2, '0')
        const day = String(d.getDate()).padStart(2, '0')
        const dateStr = `${y}-${m}-${day}`
        const count = dateCounts[dateStr] || 0
        // 强度等级：0 -> 0 (faint), 1 -> 1 (light), 2 -> 2 (mid), 3+ -> 3 (dark)
        let level = 0
        if (count >= 3) level = 3
        else if (count === 2) level = 2
        else if (count === 1) level = 1
        // 未来日期用 -1（CSS 中显示为透明）
        const isFuture = d > today
        cells.push({
          key: `${col}-${row}`,
          level: isFuture ? -1 : level,
          count: isFuture ? 0 : count
        })
      }
    }
    return cells
  },

  goBack() { wx.navigateBack({ delta: 1 }) }
})
