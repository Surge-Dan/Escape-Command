const app = getApp()
const { getTypeMeta, BADGES } = require('../../../utils/constants.js')

Page({
  data: {
    statusBarHeight: 20,
    records: [],
    recent: [],
    stats: {
      total: 0,
      durationText: '0 分钟',
      badges: 0,
      badgeTotal: BADGES.length,
      collected: 0
    },
    exportingImage: false
  },

  onLoad() {
    const nav = app.getNavMetrics ? app.getNavMetrics() : {}
    this.setData({ statusBarHeight: nav.statusBarHeight || 20, navHeaderStyle: nav.navHeaderStyle || '' })
    this.loadData()
  },

  onShow() {
    this.loadData()
  },

  loadData() {
    const gd = app.globalData
    const records = gd.records || []
    const totalMinutes = records.reduce((sum, r) => sum + (r.duration || 0), 0)
    const badges = (gd.badges || []).length
    const collected = (gd.collectedCommands || []).length

    // 最近 5 条用于预览拼贴
    const recent = records.slice(0, 5).map(r => {
      const meta = getTypeMeta(r.commandType)
      const thumb = (r.photos && r.photos[0]) || meta.scene || '/assets/images/empty-collection.webp'
      return {
        id: r.id,
        thumb,
        date: r.date || '',
        rotation: r.rotation != null ? r.rotation : (Math.random() * 6 - 3)
      }
    })

    this.setData({
      records,
      recent,
      stats: {
        total: records.length,
        durationText: this.formatDuration(totalMinutes),
        badges,
        badgeTotal: BADGES.length,
        collected
      }
    })
  },

  formatDuration(minutes) {
    const m = Math.max(0, Math.round(minutes || 0))
    if (m < 60) return m + ' 分钟'
    const h = Math.floor(m / 60)
    const rest = m % 60
    return rest ? `${h} 小时 ${rest} 分钟` : `${h} 小时`
  },

  exportText() {
    const records = this.data.records
    const stats = this.data.stats
    const lines = []
    lines.push('出逃指令 · 我的出逃记录')
    lines.push('========================')
    lines.push(`总出逃次数：${stats.total} 次`)
    lines.push(`总探索时长：${stats.durationText}`)
    lines.push(`解锁徽章：${stats.badges} / ${stats.badgeTotal}`)
    lines.push(`收藏指令：${stats.collected} 条`)
    lines.push('')
    lines.push('最近 5 次出逃：')
    records.slice(0, 5).forEach((r, i) => {
      const meta = getTypeMeta(r.commandType)
      const title = r.commandTitle || r.commandContent || '出逃'
      lines.push(`${i + 1}. [${meta.name}] ${title} - ${r.date || ''}`)
    })

    wx.setClipboardData({
      data: lines.join('\n'),
      success: () => wx.showToast({ title: '已复制到剪贴板', icon: 'success' }),
      fail: () => wx.showToast({ title: '复制失败', icon: 'none' })
    })
  },

  exportImage() {
    if (this.data.exportingImage) return
    this.setData({ exportingImage: true })

    const query = wx.createSelectorQuery()
    query.select('#exportCanvas').fields({ node: true, size: true }).exec((res) => {
      const canvas = res && res[0] && res[0].node
      if (!canvas) {
        this.setData({ exportingImage: false })
        wx.showToast({ title: '画布初始化失败', icon: 'none' })
        return
      }
      try {
        this.drawLongImage(canvas)
      } catch (e) {
        this.setData({ exportingImage: false })
        wx.showToast({ title: '生成失败', icon: 'none' })
      }
    })
  },

  drawLongImage(canvas) {
    const dpr = (app.globalData.pixelRatio || 2)
    const width = 600
    const records = this.data.records
    const stats = this.data.stats
    // 高度按记录条数动态计算，留出标题与统计区
    const headHeight = 360
    const rowHeight = 90
    const footerHeight = 120
    const listCount = Math.min(records.length, 5)
    const height = headHeight + rowHeight * listCount + footerHeight + 40

    canvas.width = width * dpr
    canvas.height = height * dpr
    const ctx = canvas.getContext('2d')
    ctx.scale(dpr, dpr)

    // 背景
    ctx.fillStyle = '#F5F3EF'
    ctx.fillRect(0, 0, width, height)

    // 主卡片
    const cardX = 40
    const cardY = 40
    const cardW = width - 80
    const cardH = height - 80
    this.roundRect(ctx, cardX, cardY, cardW, cardH, 28)
    ctx.fillStyle = '#FFFFFF'
    ctx.fill()

    // 顶部品牌色条
    this.roundRect(ctx, cardX, cardY, cardW, 16, { tl: 28, tr: 28, bl: 0, br: 0 })
    ctx.fillStyle = '#5CBF9E'
    ctx.fill()

    // 标题
    ctx.fillStyle = '#2E2F33'
    ctx.font = 'bold 40px sans-serif'
    ctx.textBaseline = 'top'
    ctx.fillText('我的出逃记录', cardX + 36, cardY + 48)

    // 副标题
    ctx.fillStyle = '#A8ADB5'
    ctx.font = '24px sans-serif'
    ctx.fillText('出逃指令 · ' + stats.total + ' 次城市漫游', cardX + 36, cardY + 104)

    // 统计行
    const statY = cardY + 168
    const statCells = [
      { label: '出逃次数', value: stats.total + '' },
      { label: '探索时长', value: stats.durationText },
      { label: '解锁徽章', value: stats.badges + '/' + stats.badgeTotal },
      { label: '收藏指令', value: stats.collected + '' }
    ]
    const cellW = cardW / 4
    statCells.forEach((c, i) => {
      const cx = cardX + cellW * i + cellW / 2
      ctx.fillStyle = '#2E2F33'
      ctx.font = 'bold 36px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(c.value, cx, statY)
      ctx.fillStyle = '#A8ADB5'
      ctx.font = '22px sans-serif'
      ctx.fillText(c.label, cx, statY + 48)
    })
    ctx.textAlign = 'left'

    // 分隔线
    const divY = statY + 96
    ctx.strokeStyle = 'rgba(122, 78, 43, 0.08)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(cardX + 36, divY)
    ctx.lineTo(cardX + cardW - 36, divY)
    ctx.stroke()

    // 最近出逃列表
    ctx.fillStyle = '#2E2F33'
    ctx.font = 'bold 28px sans-serif'
    ctx.fillText('最近 ' + listCount + ' 次出逃', cardX + 36, divY + 24)

    const listStartY = divY + 72
    records.slice(0, listCount).forEach((r, i) => {
      const y = listStartY + i * rowHeight
      const meta = getTypeMeta(r.commandType)
      // 类型色块
      this.roundRect(ctx, cardX + 36, y + 8, 12, 40, 6)
      ctx.fillStyle = meta.color || '#5CBF9E'
      ctx.fill()
      // 标题
      ctx.fillStyle = '#2E2F33'
      ctx.font = '26px sans-serif'
      const title = (r.commandTitle || r.commandContent || '出逃').slice(0, 18)
      ctx.fillText('[' + meta.name + '] ' + title, cardX + 64, y + 10)
      // 日期
      ctx.fillStyle = '#A8ADB5'
      ctx.font = '22px sans-serif'
      ctx.fillText(r.date || '', cardX + 64, y + 44)
    })

    // 页脚
    ctx.fillStyle = '#A8ADB5'
    ctx.font = '22px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('用一些随机，换一些可能 · © 2026 出逃指令', width / 2, height - 70)
    ctx.textAlign = 'left'

    // 导出图片
    wx.canvasToTempFilePath({
      canvas,
      success: (file) => this.saveToAlbum(file.tempFilePath),
      fail: () => {
        this.setData({ exportingImage: false })
        wx.showToast({ title: '图片生成失败', icon: 'none' })
      }
    })
  },

  saveToAlbum(filePath) {
    wx.saveImageToPhotosAlbum({
      filePath,
      success: () => {
        this.setData({ exportingImage: false })
        wx.showToast({ title: '图片已保存到相册', icon: 'success' })
      },
      fail: (err) => {
        this.setData({ exportingImage: false })
        if (err && /auth|deny/i.test(err.errMsg || '')) {
          wx.showModal({
            title: '需要相册权限',
            content: '保存图片需要授权访问相册，是否前往设置开启？',
            confirmText: '去设置',
            cancelText: '算了',
            success: (res) => {
              if (res.confirm) wx.openSetting()
            }
          })
        } else {
          wx.showToast({ title: '保存失败', icon: 'none' })
        }
      }
    })
  },

  roundRect(ctx, x, y, w, h, r) {
    let radii = r
    if (typeof r === 'number') {
      radii = { tl: r, tr: r, bl: r, br: r }
    } else if (r && typeof r === 'object') {
      radii = Object.assign({ tl: 0, tr: 0, bl: 0, br: 0 }, r)
    } else {
      radii = { tl: 0, tr: 0, bl: 0, br: 0 }
    }
    ctx.beginPath()
    ctx.moveTo(x + radii.tl, y)
    ctx.lineTo(x + w - radii.tr, y)
    ctx.arcTo(x + w, y, x + w, y + radii.tr, radii.tr)
    ctx.lineTo(x + w, y + h - radii.br)
    ctx.arcTo(x + w, y + h, x + w - radii.br, y + h, radii.br)
    ctx.lineTo(x + radii.bl, y + h)
    ctx.arcTo(x, y + h, x, y + h - radii.bl, radii.bl)
    ctx.lineTo(x, y + radii.tl)
    ctx.arcTo(x, y, x + radii.tl, y, radii.tl)
    ctx.closePath()
  },

  goHome() {
    wx.switchTab({ url: '/pages/index/index' })
  },

  goBack() {
    wx.navigateBack({ delta: 1 })
  }
})
