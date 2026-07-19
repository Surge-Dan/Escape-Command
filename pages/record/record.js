const app = getApp()
const { MOODS } = require('../../utils/constants.js')

// v3: 6 滤镜本地定义（不修改 utils/constants.js）。css 字段直接作用于照片预览。
const FILTERS = [
  { id: 'day', name: '日光', css: 'none', tint: '#FFF7DE', icon: '/assets/icons/sun-lemon-fg.svg' },
  { id: 'rain', name: '阴雨', css: 'hue-rotate(200deg) saturate(0.8)', tint: '#EAF4FF', icon: '/assets/icons/cloud-rain-sky-fg.svg' },
  { id: 'flash', name: '闪光', css: 'brightness(1.3) contrast(1.1)', tint: '#FFF0E6', icon: '/assets/icons/zap-coral.svg' },
  { id: 'vintage', name: '复古', css: 'sepia(0.5)', tint: '#E8D5B7', icon: '/assets/icons/sun-lemon-fg.svg' },
  { id: 'bw', name: '黑白', css: 'grayscale(1)', tint: '#D8D8D8', icon: '/assets/icons/droplet.svg' },
  { id: 'film', name: '胶片', css: 'contrast(1.2) saturate(1.1)', tint: '#F0E6D2', icon: '/assets/icons/camera-ink-soft.svg' }
]

// v3: emoji 贴纸库（单组横滑）—— 按设计规范
const STICKERS = ['😊', '😌', '😲', '🥰', '😄', '🌟', '🌸', '🍃', '☕', '📷']

Page({
  data: {
    statusBarHeight: 20,
    capsuleTop: 26,
    command: null,
    photos: [],
    mainPhoto: 0,
    feeling: '',
    mood: 'happy',
    moodIndex: 0,
    moods: MOODS,
    filter: 'day',
    filterIndex: 0,
    filters: FILTERS,
    stickers: STICKERS,
    selectedStickers: [],
    dateStr: '',
    timeStr: '',
    weatherText: '',
    locationText: '',
    saving: false,
    saved: false,
    recordCount: 0,
    shareImagePath: ''
  },

  onLoad() {
    this.applyNavMetrics()
    const cmd = app.globalData.currentCommand
    if (!cmd) {
      wx.switchTab({ url: '/pages/index/index' })
      return
    }
    const now = new Date()
    const weather = app.globalData.weather || {}
    // v3: 位置显示，无定位时显示「未标注位置」
    const locName = app.globalData.locationName
    const locationText = (!locName || locName === '未定位') ? '未标注位置' : locName
    this.setData({
      command: cmd,
      photos: (cmd.photos || []).slice(),
      feeling: '',
      dateStr: `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')}`,
      timeStr: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`,
      weatherText: `${weather.temperature || 26}℃ ${weather.description || '晴'}`,
      locationText
    })
  },

  applyNavMetrics() {
    const nav = app.getNavMetrics ? app.getNavMetrics() : {}
    this.setData({ statusBarHeight: nav.statusBarHeight || 20, capsuleTop: nav.capsuleTop || 26, navHeaderStyle: nav.navHeaderStyle || '' })
  },

  goBack() {
    wx.navigateBack()
  },

  // v3: 支持最多 9 张照片
  addPhoto() {
    if (this.data.photos.length >= 9) {
      wx.showToast({ title: '最多 9 张', icon: 'none' })
      return
    }
    wx.chooseMedia({
      count: 9 - this.data.photos.length,
      mediaType: ['image'],
      sourceType: ['camera', 'album'],
      sizeType: ['compressed'],
      success: (res) => {
        const photos = this.data.photos.concat(res.tempFiles.map(f => f.tempFilePath)).slice(0, 9)
        this.setData({ photos })
      }
    })
  },

  removePhoto(e) {
    const index = e.currentTarget.dataset.index
    const photos = this.data.photos.slice()
    photos.splice(index, 1)
    const mainPhoto = Math.min(this.data.mainPhoto, Math.max(0, photos.length - 1))
    this.setData({ photos, mainPhoto })
  },

  selectMainPhoto(e) {
    const index = e.currentTarget.dataset.index
    this.setData({ mainPhoto: index })
  },

  onFeelingInput(e) {
    this.setData({ feeling: (e.detail.value || '').slice(0, 200) })
  },

  // v3: 滤镜选择（无振动反馈）
  selectFilter(e) {
    const id = e.currentTarget.dataset.id
    const idx = this.data.filters.findIndex(f => f.id === id)
    this.setData({ filter: id, filterIndex: idx })
  },

  selectMood(e) {
    const id = e.currentTarget.dataset.id
    const idx = this.data.moods.findIndex(m => m.id === id)
    this.setData({ mood: id, moodIndex: idx })
  },

  // v3: 添加贴纸到主照片（默认放置于中部偏上位置）
  addSticker(e) {
    const emoji = e.currentTarget.dataset.emoji
    const stickers = this.data.selectedStickers.slice()
    const x = 30 + Math.floor(Math.random() * 40) // 30%–70%
    const y = 25 + Math.floor(Math.random() * 35) // 25%–60%
    stickers.push({ emoji, x, y })
    this.setData({ selectedStickers: stickers })
  },

  // v3: 点击已添加的贴纸移除
  removeSticker(e) {
    const index = e.currentTarget.dataset.index
    const stickers = this.data.selectedStickers.slice()
    stickers.splice(index, 1)
    this.setData({ selectedStickers: stickers })
  },

  onSave() {
    if (this.data.saving || this.data.saved) return
    this.setData({ saving: true })
    // v3: 无振动，仅保留音效反馈
    const record = app.completeCommand({
      photos: this.data.photos.slice(),
      feeling: this.data.feeling || '今天出去走了一小段。',
      mood: this.data.mood,
      filter: this.data.filter,
      stickers: this.data.selectedStickers.slice()
    })
    this.generateShareCard(record || {})
  },

  // v2 core change: Canvas 2D share card, generated immediately after record save.
  generateShareCard(record) {
    const query = wx.createSelectorQuery()
    query.select('#shareCanvas').fields({ node: true, size: true }).exec((res) => {
      const canvas = res && res[0] && res[0].node
      if (!canvas) {
        this.showSaved('')
        return
      }
      const width = 600
      const height = 900
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      ctx.fillStyle = '#F5F3EF'
      ctx.fillRect(0, 0, width, height)
      ctx.fillStyle = '#FFFFFF'
      this.roundRect(ctx, 48, 48, 504, 804, 28)
      ctx.fill()

      const cmd = this.data.command || {}
      const photo = (record.photos && record.photos[0]) || cmd.illustration || cmd.scene || '/assets/images/empty-collection.webp'
      const img = canvas.createImage()
      img.onload = () => {
        ctx.save()
        this.roundRect(ctx, 80, 80, 440, 440, 18)
        ctx.clip()
        ctx.drawImage(img, 80, 80, 440, 440)
        ctx.restore()
        this.drawShareText(ctx, record)
        wx.canvasToTempFilePath({
          canvas,
          success: (file) => this.showSaved(file.tempFilePath),
          fail: () => this.showSaved('')
        })
      }
      img.onerror = () => {
        this.drawShareText(ctx, record)
        wx.canvasToTempFilePath({
          canvas,
          success: (file) => this.showSaved(file.tempFilePath),
          fail: () => this.showSaved('')
        })
      }
      img.src = photo
    })
  },

  drawShareText(ctx, record) {
    const mood = this.data.moods[this.data.moodIndex]
    ctx.fillStyle = '#2E2F33'
    ctx.font = 'bold 34px sans-serif'
    this.fillWrapText(ctx, record.commandTitle || (this.data.command && this.data.command.title) || '出逃一下', 80, 585, 440, 46)
    ctx.fillStyle = '#6B7280'
    ctx.font = '24px sans-serif'
    this.fillWrapText(ctx, this.data.feeling || '今天出去走了一小段。', 80, 680, 440, 36)
    ctx.fillStyle = '#A8ADB5'
    ctx.font = '22px sans-serif'
    ctx.fillText(`${this.data.dateStr} ${this.data.timeStr}  ${this.data.weatherText}`, 80, 780)
    // v2 fix: 心情以贴纸形式（圆形底色+居中文字）渲染，符合 PRD §4.3.4「心情贴纸」要求。
    const stickerX = 460
    const stickerY = 110
    const stickerR = 48
    ctx.beginPath()
    ctx.arc(stickerX, stickerY, stickerR, 0, Math.PI * 2)
    ctx.closePath()
    ctx.fillStyle = mood.tint
    ctx.fill()
    ctx.fillStyle = mood.fg
    ctx.font = 'bold 26px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(mood.name, stickerX, stickerY)
    ctx.textAlign = 'start'
    ctx.textBaseline = 'alphabetic'
  },

  fillWrapText(ctx, text, x, y, maxWidth, lineHeight) {
    let line = ''
    let lineCount = 0
    for (let i = 0; i < text.length; i++) {
      const next = line + text[i]
      if (ctx.measureText(next).width > maxWidth && line) {
        ctx.fillText(line, x, y + lineCount * lineHeight)
        line = text[i]
        lineCount++
        if (lineCount >= 2) break
      } else {
        line = next
      }
    }
    if (lineCount < 3) ctx.fillText(line, x, y + lineCount * lineHeight)
  },

  roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath()
    ctx.moveTo(x + r, y)
    ctx.arcTo(x + w, y, x + w, y + h, r)
    ctx.arcTo(x + w, y + h, x, y + h, r)
    ctx.arcTo(x, y + h, x, y, r)
    ctx.arcTo(x, y, x + w, y, r)
    ctx.closePath()
  },

  showSaved(path) {
    this.setData({
      saving: false,
      saved: true,
      shareImagePath: path,
      recordCount: (app.globalData.records || []).length
    })
    if (app.playSound) app.playSound('save')
  },

  saveShareImage() {
    if (!this.data.shareImagePath) {
      wx.showToast({ title: '分享卡片生成失败', icon: 'none' })
      return
    }
    wx.saveImageToPhotosAlbum({
      filePath: this.data.shareImagePath,
      success: () => wx.showToast({ title: '已保存到相册', icon: 'success' }),
      fail: () => wx.showToast({ title: '请允许保存到相册', icon: 'none' })
    })
  },

  goMap() {
    wx.switchTab({ url: '/pages/map/map' })
  },

  onShareAppMessage() {
    return { title: '我的出逃记录', path: '/pages/index/index', imageUrl: this.data.shareImagePath || undefined }
  }
})
