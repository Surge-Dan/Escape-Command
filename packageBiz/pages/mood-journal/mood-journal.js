const app = getApp()
const { MOODS, TYPE_META } = require('../../../utils/constants.js')

const MOOD_EMOJI = { happy: '😊', calm: '😌', surprise: '😲', heal: '🥰', fun: '😄' }
const MOOD_SCORE = { happy: 5, fun: 4, surprise: 3, heal: 3, calm: 2 }
const TYPE_NAME_CN = { color: '颜色探索', walk: '漫步发现', sense: '感官体验', collect: '收藏拼贴', food: '美食探索', culture: '如实文化' }

Page({
  data: {
    statusBarHeight: 20,
    trendPoints: [], // 14 天折线点
    trendPath: '',   // SVG-like 路径（用 view 模拟）
    trendMaxY: 5,
    trendMinY: 1,
    trendHasData: false,
    trendStats: {
      avg: '0.0',
      best: '—',
      bestEmoji: '',
      days: 0
    },
    moodStats: [], // 5 张卡片
    moodGroups: [], // 心情关联指令
    isEmpty: false
  },

  onLoad() {
    const nav = app.getNavMetrics ? app.getNavMetrics() : {}
    this.setData({ statusBarHeight: nav.statusBarHeight || 20, navHeaderStyle: nav.navHeaderStyle || '' })
  },

  onShow() {
    this.refresh()
  },

  refresh() {
    const records = (app.globalData.records || []).slice().sort((a, b) => {
      const ka = (a.date || '') + ' ' + (a.time || '')
      const kb = (b.date || '') + ' ' + (b.time || '')
      return ka.localeCompare(kb)
    })

    this.computeTrend(records)
    this.computeMoodStats(records)
    this.computeMoodGroups(records)
    this.setData({ isEmpty: records.length === 0 })
  },

  // ===== 14 天心情趋势 =====
  computeTrend(records) {
    const today = new Date()
    const days = []
    for (let i = 13; i >= 0; i--) {
      const d = new Date(today)
      d.setDate(d.getDate() - i)
      const dateStr = this.formatDate(d)
      // 取当天最近一条记录的心情分
      const dayRecords = records.filter(r => r.date === dateStr)
      let score = 0
      let mood = ''
      if (dayRecords.length > 0) {
        // 取当天最后一条
        const last = dayRecords[dayRecords.length - 1]
        score = MOOD_SCORE[last.mood] || 0
        mood = last.mood
      }
      days.push({
        date: dateStr,
        dayLabel: i === 0 ? '今' : String(d.getDate()),
        weekday: ['日', '一', '二', '三', '四', '五', '六'][d.getDay()],
        score,
        mood,
        emoji: mood ? (MOOD_EMOJI[mood] || '') : '',
        isToday: i === 0
      })
    }

    // 构造折线点（用百分比定位）
    const hasData = days.some(d => d.score > 0)
    const maxScore = 5
    const minScore = 1
    // x 轴：14 等分；y 轴：1-5 → 反向映射
    const points = days.map((d, i) => {
      const x = (i / 13) * 100
      // 只有有数据的点显示
      if (d.score === 0) {
        return Object.assign({}, d, { x, y: 0, hasData: false })
      }
      // y: score=5 -> top 4%, score=1 -> top 92%
      const y = 96 - ((d.score - minScore) / (maxScore - minScore)) * 84
      return Object.assign({}, d, { x, y, hasData: true })
    })

    // 生成 svg path d — 用于 polyline 模拟（用 view 拼接，无 SVG）
    // 这里我们采用「连续线段」方案：每两个相邻有数据点之间画一根斜线（view + rotate）
    const segments = []
    for (let i = 0; i < points.length - 1; i++) {
      const p1 = points[i]
      const p2 = points[i + 1]
      if (!p1.hasData || !p2.hasData) continue
      const dx = p2.x - p1.x
      const dy = p2.y - p1.y
      const len = Math.sqrt(dx * dx + dy * dy)
      const angle = Math.atan2(dy, dx) * 180 / Math.PI
      segments.push({
        x1: p1.x,
        y1: p1.y,
        len: len,
        angle: angle
      })
    }

    // 统计
    const validScores = days.filter(d => d.score > 0).map(d => d.score)
    const avg = validScores.length ? (validScores.reduce((s, n) => s + n, 0) / validScores.length).toFixed(1) : '0.0'
    const bestMoodId = (() => {
      const counts = {}
      days.forEach(d => { if (d.mood) counts[d.mood] = (counts[d.mood] || 0) + 1 })
      let best = '', max = 0
      Object.keys(counts).forEach(k => { if (counts[k] > max) { max = counts[k]; best = k } })
      return best
    })()
    const bestMoodMeta = MOODS.find(m => m.id === bestMoodId)

    this.setData({
      trendPoints: points,
      trendSegments: segments,
      trendHasData: hasData,
      trendStats: {
        avg,
        best: bestMoodMeta ? bestMoodMeta.name : '—',
        bestEmoji: bestMoodId ? (MOOD_EMOJI[bestMoodId] || '') : '',
        days: validScores.length
      }
    })
  },

  // ===== 5 张心情卡片 =====
  computeMoodStats(records) {
    const total = records.length || 1
    const counts = {}
    records.forEach(r => { counts[r.mood || 'calm'] = (counts[r.mood || 'calm'] || 0) + 1 })
    const stats = MOODS.map(m => {
      const c = counts[m.id] || 0
      return {
        id: m.id,
        name: m.name,
        emoji: MOOD_EMOJI[m.id] || '🙂',
        count: c,
        percent: Math.round((c / total) * 100),
        color: m.fg,
        tint: m.tint,
        icon: m.icon
      }
    }).sort((a, b) => b.count - a.count)
    this.setData({ moodStats: stats })
  },

  // ===== 心情关联指令 =====
  computeMoodGroups(records) {
    const groups = MOODS.map(m => {
      const list = records.filter(r => (r.mood || 'calm') === m.id).slice().sort((a, b) => {
        const ka = (a.date || '') + ' ' + (a.time || '')
        const kb = (b.date || '') + ' ' + (b.time || '')
        return kb.localeCompare(ka)
      }).slice(0, 3).map(r => {
        const meta = TYPE_META[r.commandType] || {}
        return {
          id: r.id,
          title: r.commandTitle,
          date: this.prettyDate(r.date),
          time: r.time,
          typeName: TYPE_NAME_CN[r.commandType] || '出逃',
          typeColor: r.typeColor || meta.color || '#5CBF9E',
          duration: r.duration,
          feeling: r.feeling || ''
        }
      })
      return {
        id: m.id,
        name: m.name,
        emoji: MOOD_EMOJI[m.id] || '🙂',
        color: m.fg,
        tint: m.tint,
        count: records.filter(r => (r.mood || 'calm') === m.id).length,
        records: list
      }
    }).filter(g => g.count > 0)

    this.setData({ moodGroups: groups })
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
  onRecordTap(e) {
    const id = e.currentTarget.dataset.id
    if (!id) return
    wx.navigateTo({ url: '/packageBiz/pages/record-detail/record-detail?id=' + id })
  },

  goHome() {
    wx.switchTab({ url: '/pages/index/index' })
  },

  goBack() {
    wx.navigateBack({ delta: 1 })
  }
})
