const app = getApp()
const { MOODS, TYPE_META } = require('../../utils/constants.js')

const MOOD_EMOJI = { happy: '😊', calm: '😌', surprise: '😲', heal: '🥰', fun: '😄' }
const TYPE_KEYS = ['color', 'walk', 'sense', 'collect', 'food', 'culture']
const TYPE_NAME_CN = { color: '颜色', walk: '漫步', sense: '感官', collect: '收藏', food: '美食', culture: '文化' }
const MONTH_LABELS = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']
const MODE_NAME_CN = { smart: '智能匹配', micro: '微出逃', walk: '城市漫游', double: '双人出逃', night: '深夜出逃', rainy: '雨天出逃' }

Page({
  data: {
    statusBarHeight: 20,
    activeTab: 'year', // year | month
    year: 2026,
    month: 7,
    yearLabel: '2026',
    monthLabel: '2026年7月',
    stats: [], // 4 cells
    moodBars: [], // 心情分布
    typeBars: [], // 类型偏好
    monthTrend: [], // 月度趋势 12 月
    top9: [], // 精选拍立得 Top9
    isEmpty: false,
    monthSelectorOpen: false,
    monthOptions: []
  },

  onLoad(options) {
    const nav = app.getNavMetrics ? app.getNavMetrics() : {}
    const now = new Date()
    const monthOptions = []
    for (let m = 1; m <= 12; m++) {
      monthOptions.push({ id: m, label: m + '月' })
    }
    this.setData({
      statusBarHeight: nav.statusBarHeight || 20,
      navHeaderStyle: nav.navHeaderStyle || '',
      year: now.getFullYear(),
      month: now.getMonth() + 1,
      monthOptions
    })
    this.refresh()
  },

  onShow() {
    this.refresh()
  },

  refresh() {
    const records = app.globalData.records || []
    const tab = this.data.activeTab
    const filtered = this.filterByRange(records, tab)
    this.computeStats(filtered)
    this.computeMoodBars(filtered)
    this.computeTypeBars(filtered, tab) // 类型偏好基于当前筛选区间
    this.computeMonthTrend(records, tab)
    this.computeTop9(filtered)
    this.setData({
      yearLabel: String(this.data.year),
      monthLabel: `${this.data.year}年${this.data.month}月`,
      isEmpty: filtered.length === 0
    })
  },

  filterByRange(records, tab) {
    const year = this.data.year
    if (tab === 'year') {
      return records.filter(r => {
        const d = new Date(r.date)
        return !isNaN(d.getTime()) && d.getFullYear() === year
      })
    }
    const month = this.data.month
    return records.filter(r => {
      const d = new Date(r.date)
      return !isNaN(d.getTime()) && d.getFullYear() === year && (d.getMonth() + 1) === month
    })
  },

  computeStats(records) {
    const total = records.length
    const totalDuration = records.reduce((s, r) => s + (r.duration || 0), 0)
    // 最常用模式
    const modeCount = {}
    records.forEach(r => {
      const m = r.mode || this.guessMode(r)
      modeCount[m] = (modeCount[m] || 0) + 1
    })
    let topMode = 'smart'
    let topCount = 0
    Object.keys(modeCount).forEach(k => {
      if (modeCount[k] > topCount) { topMode = k; topCount = modeCount[k] }
    })
    // 连续天数
    const dates = Array.from(new Set(records.map(r => r.date))).sort()
    const streak = this.calcMaxStreak(dates)
    this.setData({
      stats: [
        { label: '总次数', value: String(total), unit: '次' },
        { label: '总时长', value: String(totalDuration), unit: '分钟' },
        { label: '最常用模式', value: MODE_NAME_CN[topMode] || '智能', unit: '' },
        { label: '连续天数', value: String(streak), unit: '天' }
      ]
    })
  },

  guessMode(record) {
    const hour = parseInt((record.time || '12:00').split(':')[0], 10)
    if (hour >= 22 || hour < 6) return 'night'
    const w = record.weather && record.weather.condition
    if (w === 'rainy') return 'rainy'
    if (record.duration && record.duration <= 15) return 'micro'
    if (record.commandType === 'walk') return 'walk'
    return 'smart'
  },

  calcMaxStreak(dates) {
    if (!dates.length) return 0
    let max = 1
    let cur = 1
    for (let i = 1; i < dates.length; i++) {
      const prev = new Date(dates[i - 1])
      const curD = new Date(dates[i])
      const diff = Math.round((curD - prev) / (24 * 3600 * 1000))
      if (diff === 1) { cur++; max = Math.max(max, cur) }
      else if (diff === 0) { /* same day */ }
      else { cur = 1 }
    }
    return max
  },

  computeMoodBars(records) {
    const counts = {}
    records.forEach(r => { counts[r.mood || 'calm'] = (counts[r.mood || 'calm'] || 0) + 1 })
    const total = records.length || 1
    const bars = MOODS.map(m => {
      const c = counts[m.id] || 0
      return {
        id: m.id,
        name: m.name,
        emoji: MOOD_EMOJI[m.id] || '🙂',
        count: c,
        percent: Math.round((c / total) * 100),
        width: Math.max(2, Math.round((c / total) * 100)),
        color: m.fg,
        tint: m.tint
      }
    }).sort((a, b) => b.count - a.count)
    this.setData({ moodBars: bars })
  },

  computeTypeBars(records, tab) {
    const counts = {}
    records.forEach(r => { counts[r.commandType] = (counts[r.commandType] || 0) + 1 })
    const max = Math.max(1, ...TYPE_KEYS.map(k => counts[k] || 0))
    const bars = TYPE_KEYS.map(k => {
      const c = counts[k] || 0
      const meta = TYPE_META[k] || {}
      return {
        id: k,
        name: TYPE_NAME_CN[k] || k,
        count: c,
        color: meta.color || '#5CBF9E',
        height: Math.max(4, Math.round((c / max) * 100))
      }
    })
    this.setData({ typeBars: bars })
  },

  computeMonthTrend(records, tab) {
    // 年度：12 月柱状；月度：30 天柱状
    if (tab === 'year') {
      const counts = new Array(12).fill(0)
      records.forEach(r => {
        const d = new Date(r.date)
        if (!isNaN(d.getTime()) && d.getFullYear() === this.data.year) {
          counts[d.getMonth()]++
        }
      })
      const max = Math.max(1, ...counts)
      const bars = counts.map((c, i) => ({
        id: i,
        label: MONTH_LABELS[i],
        count: c,
        height: Math.max(2, Math.round((c / max) * 100))
      }))
      this.setData({ monthTrend: bars })
    } else {
      // 月度：当月每天
      const year = this.data.year
      const month = this.data.month
      const daysInMonth = new Date(year, month, 0).getDate()
      const counts = new Array(daysInMonth).fill(0)
      records.forEach(r => {
        const d = new Date(r.date)
        if (!isNaN(d.getTime()) && d.getFullYear() === year && (d.getMonth() + 1) === month) {
          counts[d.getDate() - 1]++
        }
      })
      const max = Math.max(1, ...counts)
      const bars = counts.map((c, i) => ({
        id: i,
        label: String(i + 1),
        count: c,
        height: Math.max(2, Math.round((c / max) * 100))
      }))
      this.setData({ monthTrend: bars })
    }
  },

  computeTop9(records) {
    const withPhotos = records.filter(r => r.photos && r.photos.length > 0)
    // 取最新的 9 张
    const top9 = []
    const sorted = withPhotos.slice().sort((a, b) => {
      const ka = (a.date || '') + ' ' + (a.time || '')
      const kb = (b.date || '') + ' ' + (b.time || '')
      return kb.localeCompare(ka)
    })
    for (const r of sorted) {
      if (top9.length >= 9) break
      const meta = TYPE_META[r.commandType] || {}
      top9.push({
        id: r.id,
        photo: r.photos[0],
        title: r.commandTitle,
        typeColor: r.typeColor || meta.color || '#5CBF9E',
        rotation: ((r.rotation || 0) + (top9.length % 2 === 0 ? 1 : -1) * 1.5)
      })
    }
    this.setData({ top9 })
  },

  // ===== 交互 =====
  onTabTap(e) {
    const tab = e.currentTarget.dataset.tab
    if (tab === this.data.activeTab) return
    this.setData({ activeTab: tab })
    this.refresh()
  },

  onPrevRange() {
    if (this.data.activeTab === 'year') {
      this.setData({ year: this.data.year - 1 })
    } else {
      let m = this.data.month - 1
      let y = this.data.year
      if (m < 1) { m = 12; y-- }
      this.setData({ month: m, year: y })
    }
    this.refresh()
  },

  onNextRange() {
    if (this.data.activeTab === 'year') {
      this.setData({ year: this.data.year + 1 })
    } else {
      let m = this.data.month + 1
      let y = this.data.year
      if (m > 12) { m = 1; y++ }
      this.setData({ month: m, year: y })
    }
    this.refresh()
  },

  toggleMonthSelector() {
    this.setData({ monthSelectorOpen: !this.data.monthSelectorOpen })
  },

  onMonthSelect(e) {
    const m = e.currentTarget.dataset.id
    this.setData({ month: m, monthSelectorOpen: false })
    this.refresh()
  },

  onTop9Tap(e) {
    const id = e.currentTarget.dataset.id
    if (!id) return
    wx.navigateTo({ url: '/pages/record-detail/record-detail?id=' + id })
  },

  goHome() {
    wx.switchTab({ url: '/pages/index/index' })
  },

  goBack() {
    wx.navigateBack({ delta: 1 })
  }
})
