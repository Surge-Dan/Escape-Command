﻿﻿const app = getApp()
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
    draggingIndex: -1,
    dateStr: '',
    timeStr: '',
    weatherText: '',
    locationText: '',
    saving: false,
    saved: false,
    recordCount: 0,
    shareImagePath: '',
    // 同频出逃扩展（普通出逃为 false/[]）
    isGroup: false,
    members: []
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
      locationText,
      // 同频出逃识别（供分享卡绘制成员、默认文案选择）
      isGroup: cmd.isGroup === true,
      members: Array.isArray(cmd.members) ? cmd.members.slice() : [],
      // 破圈出逃识别（供分享卡绘制破圈证书入口、文案选择）
      isBreakthrough: cmd.type === 'breakthrough' || cmd.mode === 'breakthrough'
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

  // v3: 贴纸拖拽 —— 短按移除，拖动改变位置
  // touchstart 记录起点和贴纸索引，touchmove 实时更新百分比坐标，touchend 判断是否移动过
  onStickerTouchStart(e) {
    const index = e.currentTarget.dataset.index
    const touch = e.touches[0]
    this._stickerDrag = {
      index: index,
      startX: touch.clientX,
      startY: touch.clientY,
      moved: false,
      rect: null
    }
    // 异步查询照片区域的位置尺寸，用于将像素坐标转为百分比
    const query = wx.createSelectorQuery().in(this)
    query.select('.polaroid-photo-area').boundingClientRect()
    query.exec((res) => {
      if (this._stickerDrag && res && res[0]) {
        this._stickerDrag.rect = res[0]
      }
    })
  },

  onStickerTouchMove(e) {
    if (!this._stickerDrag) return
    const touch = e.touches[0]
    const dx = touch.clientX - this._stickerDrag.startX
    const dy = touch.clientY - this._stickerDrag.startY
    // 移动超过 5px 判定为拖拽（而非短按）
    if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
      if (!this._stickerDrag.moved) {
        this._stickerDrag.moved = true
        this.setData({ draggingIndex: this._stickerDrag.index })
      }
    }
    if (!this._stickerDrag.moved || !this._stickerDrag.rect) return

    const rect = this._stickerDrag.rect
    // 将触摸坐标转为相对于照片区域的百分比，clamp 在 5%~92% 防止贴纸飞出照片
    let newX = ((touch.clientX - rect.left) / rect.width) * 100
    let newY = ((touch.clientY - rect.top) / rect.height) * 100
    newX = Math.max(5, Math.min(92, newX))
    newY = Math.max(5, Math.min(92, newY))

    const stickers = this.data.selectedStickers.slice()
    if (stickers[this._stickerDrag.index]) {
      stickers[this._stickerDrag.index] = Object.assign({}, stickers[this._stickerDrag.index], {
        x: Math.round(newX),
        y: Math.round(newY)
      })
      this.setData({ selectedStickers: stickers })
    }
  },

  onStickerTouchEnd(e) {
    if (!this._stickerDrag) return
    if (!this._stickerDrag.moved) {
      // 短按 → 移除贴纸
      const index = this._stickerDrag.index
      const stickers = this.data.selectedStickers.slice()
      stickers.splice(index, 1)
      this.setData({ selectedStickers: stickers, draggingIndex: -1 })
    } else {
      // 拖拽结束 → 保留新位置
      this.setData({ draggingIndex: -1 })
    }
    this._stickerDrag = null
  },

  onSave() {
    if (this.data.saving || this.data.saved) return
    this.setData({ saving: true })
    // v3: 无振动，仅保留音效反馈
    // 同频出逃默认文案区分（completeCommand 自动注入 isGroup/groupId/members/steps）
    const defaultFeeling = this.data.isGroup ? '和朋友一起完成同频出逃' : '今天出去走了一小段。'
    const record = app.completeCommand({
      photos: this.data.photos.slice(),
      feeling: this.data.feeling || defaultFeeling,
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
      const photo = (record.photos && record.photos[0]) || cmd.illustration || cmd.scene || '/packageBt/images/empty-collection.webp'
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
    // 同频出逃：日期行下方画成员落款「和朋友一起：A、B、C 等 N 人」
    if (this.data.isGroup && Array.isArray(this.data.members) && this.data.members.length > 0) {
      const names = this.data.members.slice(0, 3).join('、')
      const suffix = this.data.members.length > 3 ? '等' + this.data.members.length + '人' : ''
      ctx.fillStyle = '#A8ADB5'
      ctx.font = '22px sans-serif'
      ctx.fillText('和朋友一起：' + names + suffix, 80, 815)
    }
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

  goNext() {
    if (this.data.isBreakthrough) {
      wx.redirectTo({ url: '/packageBt/pages/bt-certificate/bt-certificate' })
    } else {
      wx.switchTab({ url: '/pages/map/map' })
    }
  },

  onShareAppMessage() {
    return { title: '我的出逃记录', path: '/pages/index/index', imageUrl: this.data.shareImagePath || undefined }
  }
})
