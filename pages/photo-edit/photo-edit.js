const app = getApp()

// 6 种滤镜：css 字符串供预览实时生效，tint 用于缩略图底色。
const FILTERS = [
  { id: 'day', name: '日光', css: 'brightness(1.05) saturate(1.1)', tint: '#FFF7DE' },
  { id: 'rain', name: '阴雨', css: 'saturate(0.8) contrast(0.95) brightness(0.96)', tint: '#EAF4FF' },
  { id: 'flash', name: '闪光', css: 'saturate(1.1) contrast(1.08) brightness(1.08)', tint: '#FFF0E6' },
  { id: 'vintage', name: '复古', css: 'sepia(0.4) saturate(1.1) contrast(0.95)', tint: '#F4E4D4' },
  { id: 'mono', name: '黑白', css: 'grayscale(1) contrast(1.05)', tint: '#E5E5E5' },
  { id: 'film', name: '胶片', css: 'sepia(0.2) contrast(1.1) brightness(0.95) saturate(1.15)', tint: '#FFE8C4' }
]

const STICKERS = ['😊', '😌', '😲', '🥰', '😄', '🌟', '🌸', '🍃', '☕', '📷']

Page({
  data: {
    statusBarHeight: 20,
    photo: '',
    notFound: false,
    filters: FILTERS,
    filterIndex: 0,
    selectedCss: FILTERS[0].css,
    stickers: STICKERS,
    placed: []
  },

  onLoad(options) {
    const nav = app.getNavMetrics ? app.getNavMetrics() : {}
    const raw = (options && options.photo) ? options.photo : ''
    // 允许传入已编码的路径
    const photo = raw ? decodeURIComponent(raw) : ''
    this.setData({
      statusBarHeight: nav.statusBarHeight || 20,
      navHeaderStyle: nav.navHeaderStyle || '',
      photo,
      notFound: !photo
    })
  },

  goBack() { wx.navigateBack({ delta: 1 }) },

  selectFilter(e) {
    const id = e.currentTarget.dataset.id
    const idx = this.data.filters.findIndex(f => f.id === id)
    if (idx < 0) return
    this.setData({ filterIndex: idx, selectedCss: this.data.filters[idx].css })
  },

  addSticker(e) {
    const emoji = e.currentTarget.dataset.emoji
    if (!emoji) return
    const placed = this.data.placed.slice()
    // 随机落点，避免完全重叠
    const x = 28 + Math.round(Math.random() * 50)
    const y = 26 + Math.round(Math.random() * 44)
    placed.push({ id: 'st_' + Date.now() + '_' + placed.length, emoji, x, y })
    this.setData({ placed })
  },

  removeSticker(e) {
    const id = e.currentTarget.dataset.id
    const placed = this.data.placed.filter(s => s.id !== id)
    this.setData({ placed })
  },

  clearStickers() {
    if (!this.data.placed.length) return
    this.setData({ placed: [] })
  },

  finish() {
    const filter = this.data.filters[this.data.filterIndex]
    const editResult = {
      photo: this.data.photo,
      filter: filter.id,
      filterName: filter.name,
      stickers: this.data.placed.slice()
    }
    // 把编辑结果挂到 globalData，记录页可按需消费。
    try { app.globalData.pendingPhotoEdit = editResult } catch (e) {}
    // 让记录页能看到这张照片：塞进 currentCommand.photos。
    try {
      const cmd = app.globalData.currentCommand
      if (cmd) {
        const photos = (cmd.photos || []).slice()
        if (!photos.includes(this.data.photo)) photos.unshift(this.data.photo)
        app.globalData.currentCommand.photos = photos
        app.saveCurrentCommand()
      }
    } catch (e) {}
    wx.redirectTo({ url: '/pages/record/record?from=edit' })
  }
})
