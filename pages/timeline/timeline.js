const app = getApp()
const { MOODS, TYPE_META, MODE_LIST } = require('../../utils/constants.js')
const imageFallback = require('../../utils/image-fallback.js')

const MOOD_EMOJI = { happy: '😊', calm: '😌', surprise: '😲', heal: '🥰', fun: '😄' }
const TYPE_NAME_CN = { color: '颜色探索', walk: '漫步发现', sense: '感官体验', collect: '收藏拼贴', food: '美食探索', culture: '如实文化' }
const MODE_NAME_CN = { smart: '智能匹配', micro: '微出逃', walk: '城市漫游', double: '双人出逃', night: '深夜出逃', rainy: '雨天出逃' }

Page({
  data: {
    statusBarHeight: 20,
    activeFilter: 'all',
    filterChips: [
      { id: 'all', label: '全部' },
      { id: 'mode', label: '按模式' },
      { id: 'type', label: '按类型' },
      { id: 'mood', label: '按心情' }
    ],
    // 二级筛选
    subFilters: [],
    activeSubFilter: '',
    subPanelOpen: false,
    // 分组列表
    dateGroups: [],
    totalCount: 0,
    isEmpty: false
  },

  onLoad(options) {
    const nav = app.getNavMetrics ? app.getNavMetrics() : {}
    this.setData({ statusBarHeight: nav.statusBarHeight || 20, navHeaderStyle: nav.navHeaderStyle || '' })
    this.initialFilter = (options && options.filter) || 'all'
  },

  onShow() {
    this.setData({ activeFilter: this.initialFilter || 'all' })
    this.applyFilter()
    this.initialFilter = 'all'
  },

  // ===== 主筛选切换 =====
  onFilterTap(e) {
    const id = e.currentTarget.dataset.id
    if (id === this.data.activeFilter && this.data.subPanelOpen) {
      // 再次点击同一个 → 收起
      this.setData({ subPanelOpen: false })
      return
    }
    if (id === 'all') {
      this.setData({ activeFilter: 'all', subPanelOpen: false, activeSubFilter: '' })
      this.applyFilter()
      return
    }
    const sub = this.buildSubFilters(id)
    this.setData({
      activeFilter: id,
      subFilters: sub,
      subPanelOpen: true,
      activeSubFilter: ''
    })
    // 默认全部，等待用户选择
    this.applyFilter()
  },

  onSubFilterTap(e) {
    const id = e.currentTarget.dataset.id
    this.setData({ activeSubFilter: id })
    this.applyFilter()
  },

  closeSubPanel() {
    this.setData({ subPanelOpen: false })
  },

  buildSubFilters(kind) {
    if (kind === 'mode') {
      return MODE_LIST.map(m => ({ id: m.id, label: m.name, color: m.color }))
    }
    if (kind === 'type') {
      return Object.keys(TYPE_NAME_CN).map(k => ({
        id: k,
        label: TYPE_NAME_CN[k],
        color: (TYPE_META[k] || {}).color || '#5CBF9E'
      }))
    }
    if (kind === 'mood') {
      return MOODS.map(m => ({ id: m.id, label: (MOOD_EMOJI[m.id] || '') + ' ' + m.name, color: m.fg }))
    }
    return []
  },

  // ===== 数据筛选与分组 =====
  applyFilter() {
    const records = (app.globalData.records || []).slice().sort((a, b) => {
      // 倒序：日期 + 时间
      const ka = (a.date || '') + ' ' + (a.time || '')
      const kb = (b.date || '') + ' ' + (b.time || '')
      return kb.localeCompare(ka)
    })

    const filter = this.data.activeFilter
    const sub = this.data.activeSubFilter
    let filtered = records
    if (filter !== 'all' && sub) {
      if (filter === 'mode') {
        // 模式来自指令元数据，存于 record.commandId 末尾或单独 mode 字段；这里通过 _mode 兜底
        filtered = records.filter(r => (r.mode || this.guessMode(r)) === sub)
      } else if (filter === 'type') {
        filtered = records.filter(r => r.commandType === sub)
      } else if (filter === 'mood') {
        filtered = records.filter(r => r.mood === sub)
      }
    }

    const dateGroups = this.groupByDate(filtered)
    this.setData({
      dateGroups,
      totalCount: filtered.length,
      isEmpty: filtered.length === 0
    })
  },

  guessMode(record) {
    // 简易推断：依据天气/时段/类型给出 demo 模式
    const hour = parseInt((record.time || '12:00').split(':')[0], 10)
    if (hour >= 22 || hour < 6) return 'night'
    const w = record.weather && record.weather.condition
    if (w === 'rainy') return 'rainy'
    if (record.duration && record.duration <= 15) return 'micro'
    if (record.commandType === 'walk') return 'walk'
    return 'smart'
  },

  groupByDate(records) {
    const map = {}
    records.forEach(r => {
      const d = r.date || '未知日期'
      if (!map[d]) map[d] = []
      map[d].push(this.decorateRecord(r))
    })
    const today = this.formatDate(new Date())
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const yStr = this.formatDate(yesterday)

    return Object.keys(map).sort((a, b) => b.localeCompare(a)).map(date => {
      let label = ''
      if (date === today) label = '今天'
      else if (date === yStr) label = '昨天'
      else {
        // 本周/本月/更早
        const d = new Date(date)
        const diffDays = Math.floor((Date.now() - d.getTime()) / (24 * 3600 * 1000))
        if (diffDays < 7) label = '本周'
        else if (diffDays < 30) label = '本月'
        else label = '更早'
      }
      return {
        date,
        dateLabel: this.prettyDate(date),
        relLabel: label,
        records: map[date],
        count: map[date].length
      }
    })
  },

  decorateRecord(r) {
    const moodMeta = MOODS.find(m => m.id === r.mood) || {}
    const typeMeta = TYPE_META[r.commandType] || {}
    return Object.assign({}, r, {
      moodEmoji: MOOD_EMOJI[r.mood] || '🙂',
      moodName: moodMeta.name || '平静',
      moodFg: moodMeta.fg || '#5CBF9E',
      moodTint: moodMeta.tint || '#E5F5EF',
      typeName: typeMeta.name || TYPE_NAME_CN[r.commandType] || '出逃',
      typeColor: r.typeColor || typeMeta.color || '#5CBF9E',
      coverPhoto: (r.photos && r.photos[0]) || '',
      rotationStr: (r.rotation || 0).toFixed(2) + 'deg'
    })
  },

  prettyDate(dateStr) {
    if (!dateStr) return ''
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return dateStr
    return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`
  },

  formatDate(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  },

  // ===== 卡片交互 =====
  onRecordTap(e) {
    const id = e.currentTarget.dataset.id
    if (!id) return
    wx.navigateTo({ url: '/pages/record-detail/record-detail?id=' + id })
  },

  goHome() {
    wx.switchTab({ url: '/pages/index/index' })
  },

  goBack() {
    wx.navigateBack({ delta: 1 })
  },

  onImgError(e) { imageFallback.handle(e, this) }
})
