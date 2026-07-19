const app = getApp()
const { getTypeMeta, MODE_LIST } = require('../../utils/constants.js')

// 状态筛选 tab
const STATUS_FILTERS = [
  { key: 'all', name: '全部' },
  { key: 'want', name: '想去' },
  { key: 'done', name: '已完成' },
  { key: 'fav', name: '收藏' }
]

// 排序方式
const SORT_OPTIONS = [
  { key: 'newest', name: '最新' },
  { key: 'oldest', name: '最早' },
  { key: 'type', name: '类型' }
]

// 模式色映射
const MODE_COLOR_MAP = {}
MODE_LIST.forEach(m => { MODE_COLOR_MAP[m.id] = m.color })

Page({
  data: {
    statusBarHeight: 20,
    items: [],            // 渲染用列表（含筛选+排序结果）
    rawCount: 0,          // 收藏总数
    activeFilter: 'all',
    sortKey: 'newest',
    sortMenuOpen: false,
    batchMode: false,
    selectedIds: {},      // id → true
    selectedCount: 0,
    statusFilters: STATUS_FILTERS,
    sortOptions: SORT_OPTIONS
  },

  onLoad() {
    this.applyNavMetrics()
    this.loadCollections()
  },

  onShow() {
    this.applyNavMetrics()
    this.loadCollections()
  },

  applyNavMetrics() {
    const nav = app.getNavMetrics ? app.getNavMetrics() : {}
    this.setData({ statusBarHeight: nav.statusBarHeight || 20, navHeaderStyle: nav.navHeaderStyle || '' })
  },

  // 把 globalData.collectedCommands 适配为新的数据结构。
  // 兼容历史数据：旧版是 string[]（指令 id 数组）；新版是 { command, status, collectedAt }[]
  loadCollections() {
    const gd = app.globalData
    const pool = gd.commandPool || []
    const ugc = gd.ugcCommands || []
    const raw = gd.collectedCommands || []

    const items = []
    raw.forEach((entry, idx) => {
      // 兼容旧版（字符串 id）
      if (typeof entry === 'string') {
        const cmd = pool.find(c => c.id === entry) || ugc.find(c => c.id === entry)
        if (!cmd) return
        const meta = getTypeMeta(cmd.type)
        items.push(this.buildItem(cmd, meta, 'want', '', idx))
      } else if (entry && entry.command) {
        const cmd = entry.command
        const meta = getTypeMeta(cmd.type)
        items.push(this.buildItem(cmd, meta, entry.status || 'want', entry.collectedAt || '', idx))
      } else if (entry && entry.id) {
        const cmd = pool.find(c => c.id === entry.id) || ugc.find(c => c.id === entry.id)
        if (!cmd) return
        const meta = getTypeMeta(cmd.type)
        items.push(this.buildItem(cmd, meta, entry.status || 'want', entry.collectedAt || '', idx))
      }
    })

    this._allItems = items
    this.setData({ rawCount: items.length })
    this.applyFilterAndSort()
  },

  buildItem(cmd, meta, status, collectedAt, idx) {
    return {
      id: cmd.id,
      title: cmd.title || (cmd.content || '').slice(0, 18) || '出去走走',
      content: cmd.content || '',
      type: cmd.type,
      typeName: meta.name,
      typeColor: cmd.typeColor || meta.color,
      typeIcon: meta.icon,
      duration: cmd.duration || 30,
      distance: cmd.distance || '500m',
      people: cmd.people || '一个人',
      mode: cmd.mode || '',
      modeColor: MODE_COLOR_MAP[cmd.mode] || '',
      illustration: cmd.illustration || meta.scene,
      status,
      collectedAt,
      collectedAtText: this.formatDate(collectedAt),
      _idx: idx
    }
  },

  formatDate(str) {
    if (!str) return ''
    // 兼容 YYYY-MM-DD / 时间戳 / Date 字符串
    let d
    if (/^\d+$/.test(str)) d = new Date(Number(str))
    else d = new Date(str)
    if (isNaN(d.getTime())) return str
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  },

  applyFilterAndSort() {
    const { activeFilter, sortKey } = this.data
    let list = (this._allItems || []).slice()

    if (activeFilter !== 'all') {
      list = list.filter(it => it.status === activeFilter)
    }

    if (sortKey === 'newest') {
      list.sort((a, b) => this.compareTime(b.collectedAt, a.collectedAt) || (b._idx - a._idx))
    } else if (sortKey === 'oldest') {
      list.sort((a, b) => this.compareTime(a.collectedAt, b.collectedAt) || (a._idx - b._idx))
    } else if (sortKey === 'type') {
      list.sort((a, b) => (a.type > b.type ? 1 : a.type < b.type ? -1 : (a._idx - b._idx)))
    }

    this.setData({ items: list })
  },

  compareTime(a, b) {
    const ta = a ? new Date(a).getTime() : 0
    const tb = b ? new Date(b).getTime() : 0
    if (isNaN(ta) && isNaN(tb)) return 0
    return ta - tb
  },

  // ===== 顶部筛选 =====
  onFilterTap(e) {
    const key = e.currentTarget.dataset.key
    if (key === this.data.activeFilter) return
    this.setData({ activeFilter: key })
    this.applyFilterAndSort()
  },

  // ===== 排序 =====
  toggleSortMenu() {
    this.setData({ sortMenuOpen: !this.data.sortMenuOpen })
  },

  onSortTap(e) {
    const key = e.currentTarget.dataset.key
    const opt = SORT_OPTIONS.find(o => o.key === key)
    this.setData({ sortKey: key, sortMenuOpen: false })
    this.applyFilterAndSort()
    if (opt) wx.showToast({ title: `按${opt.name}排序`, icon: 'none', duration: 1000 })
  },

  closeSortMenu() {
    if (this.data.sortMenuOpen) this.setData({ sortMenuOpen: false })
  },

  // ===== 批量管理 =====
  toggleBatchMode() {
    const next = !this.data.batchMode
    this.setData({
      batchMode: next,
      selectedIds: {},
      selectedCount: 0
    })
  },

  onItemTap(e) {
    const id = e.currentTarget.dataset.id
    if (this.data.batchMode) {
      const selectedIds = Object.assign({}, this.data.selectedIds)
      if (selectedIds[id]) delete selectedIds[id]
      else selectedIds[id] = true
      this.setData({
        selectedIds,
        selectedCount: Object.keys(selectedIds).length
      })
      return
    }
    // 非批量模式：弹出快捷操作
    this.showItemActions(id)
  },

  showItemActions(id) {
    const item = this.data.items.find(it => it.id === id)
    if (!item) return
    wx.showActionSheet({
      itemList: ['标记完成', '取消收藏', '删除'],
      success: (res) => {
        if (res.tapIndex === 0) this.markDone(id)
        else if (res.tapIndex === 1) this.removeOne(id)
        else if (res.tapIndex === 2) this.removeOne(id, true)
      }
    })
  },

  markDone(id) {
    const raw = app.globalData.collectedCommands || []
    const next = raw.map(entry => {
      if (typeof entry === 'string') {
        return entry === id ? { command: { id: entry }, status: 'done', collectedAt: Date.now() } : entry
      }
      const entryId = entry && (entry.command && entry.command.id) || (entry && entry.id)
      if (entryId === id) return Object.assign({}, entry, { status: 'done' })
      return entry
    })
    app.globalData.collectedCommands = next
    app.saveToLocal('collectedCommands', next)
    this.loadCollections()
    wx.showToast({ title: '已标记完成', icon: 'success' })
  },

  removeOne(id, isDelete) {
    wx.showModal({
      title: isDelete ? '删除指令' : '取消收藏',
      content: isDelete ? '确定要从收藏中删除这条指令吗？' : '确定要取消收藏这条指令吗？',
      confirmText: isDelete ? '删除' : '移除',
      cancelText: '算了',
      confirmColor: '#E05555',
      success: (res) => {
        if (!res.confirm) return
        const raw = app.globalData.collectedCommands || []
        const next = raw.filter(entry => {
          if (typeof entry === 'string') return entry !== id
          const entryId = entry && (entry.command && entry.command.id) || (entry && entry.id)
          return entryId !== id
        })
        app.globalData.collectedCommands = next
        app.saveToLocal('collectedCommands', next)
        this.loadCollections()
        wx.showToast({ title: isDelete ? '已删除' : '已移除', icon: 'success' })
      }
    })
  },

  // 长按进入批量模式
  onLongPress(e) {
    const id = e.currentTarget.dataset.id
    if (!this.data.batchMode) {
      this.setData({ batchMode: true, selectedIds: { [id]: true }, selectedCount: 1 })
    }
  },

  // 批量删除
  onBatchDelete() {
    const ids = Object.keys(this.data.selectedIds)
    if (!ids.length) {
      wx.showToast({ title: '请先选择指令', icon: 'none' })
      return
    }
    wx.showModal({
      title: '批量删除',
      content: `确定要删除选中的 ${ids.length} 条指令吗？`,
      confirmText: '删除',
      cancelText: '取消',
      confirmColor: '#E05555',
      success: (res) => {
        if (!res.confirm) return
        const raw = app.globalData.collectedCommands || []
        const next = raw.filter(entry => {
          if (typeof entry === 'string') return !this.data.selectedIds[entry]
          const entryId = entry && (entry.command && entry.command.id) || (entry && entry.id)
          return !this.data.selectedIds[entryId]
        })
        app.globalData.collectedCommands = next
        app.saveToLocal('collectedCommands', next)
        this.setData({ batchMode: false, selectedIds: {}, selectedCount: 0 })
        this.loadCollections()
        wx.showToast({ title: '已删除', icon: 'success' })
      }
    })
  },

  onBatchCancel() {
    this.setData({ batchMode: false, selectedIds: {}, selectedCount: 0 })
  },

  // 行内右侧删除按钮
  onRemoveTap(e) {
    this.removeOne(e.currentTarget.dataset.id, true)
  },

  goHome() {
    wx.switchTab({ url: '/pages/index/index' })
  },

  goToIndex() {
    wx.switchTab({ url: '/pages/index/index' })
  },

  goBack() {
    wx.navigateBack({ delta: 1 })
  }
})
