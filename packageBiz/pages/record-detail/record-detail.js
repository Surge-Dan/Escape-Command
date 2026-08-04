const app = getApp()
const { MOODS, MODE_LIST, getTypeMeta } = require('../../../utils/constants.js')
const recordBuilder = require('../../../utils/record-builder.js')

Page({
  data: {
    statusBarHeight: 20,
    navHeaderStyle: '',
    record: null,
    notFound: false,
    photo: '',
    moodName: '',
    typeName: '',
    typeColor: '',
    modeName: '',
    weatherText: '',
    locationText: '未记录',
    dateText: '',
    timeText: '',
    isFavorite: false,
    // C-12: 同频记录展示摘要（成员 + 步骤留痕时间线）
    isGroup: false,
    groupSummary: null
  },

  onLoad(options) {
    const nav = app.getNavMetrics ? app.getNavMetrics() : {}
    const id = (options && options.id) ? options.id : ''
    const records = app.globalData.records || []
    const record = records.find(r => r.id === id)
    if (!record) {
      this.setData({
        statusBarHeight: nav.statusBarHeight || 20,
        navHeaderStyle: nav.navHeaderStyle || app.globalData.navHeaderStyle || '',
        notFound: true
      })
      return
    }
    const mood = MOODS.find(m => m.id === record.mood)
    const meta = getTypeMeta(record.commandType)
    // 尝试从指令池还原「模式」字段（记录本身不存 mode）。
    let modeName = ''
    const pool = app.globalData.commandPool || []
    const cmd = pool.find(c => c.id === record.commandId)
    if (cmd && cmd.mode) {
      const m = MODE_LIST.find(mm => mm.id === cmd.mode)
      modeName = m ? m.name : ''
    }
    const w = record.weather || {}
    const weatherText = w.description
      ? `${w.temperature !== undefined && w.temperature !== null ? w.temperature : ''}℃ ${w.description}`
      : (w.condition || '未记录')
    const locationText = record.location ? '已记录位置' : '未记录'
    const photo = (record.photos && record.photos.length) ? record.photos[0] : ''
    // C-12: 同频记录展示摘要（成员 + 步骤留痕时间线）
    const summary = recordBuilder.buildGroupSummary(record)
    const groupSummary = summary.isGroup ? this.formatGroupSummary(summary) : null
    this.setData({
      statusBarHeight: nav.statusBarHeight || 20,
      navHeaderStyle: nav.navHeaderStyle || app.globalData.navHeaderStyle || '',
      record,
      photo,
      moodName: mood ? mood.name : (record.mood || ''),
      typeName: meta.name || record.commandType || '',
      typeColor: record.typeColor || meta.color,
      modeName,
      weatherText,
      locationText,
      dateText: record.date || '',
      timeText: record.time || '',
      isFavorite: !!record.isFavorite,
      isGroup: summary.isGroup,
      groupSummary
    })
  },

  // C-12: 格式化同频摘要，completedAt 时间戳 → HH:MM 字符串供 wxml 展示
  formatGroupSummary(summary) {
    const stepTraces = (summary.stepTraces || []).map(s => ({
      text: s.text || '',
      time: s.completedAt ? this.formatTs(s.completedAt) : '',
      done: !!s.completedAt
    }))
    return { members: summary.members || [], stepTraces }
  },

  formatTs(ts) {
    const d = new Date(ts)
    if (isNaN(d.getTime())) return ''
    const h = String(d.getHours()).padStart(2, '0')
    const m = String(d.getMinutes()).padStart(2, '0')
    return h + ':' + m
  },

  goBack() { wx.navigateBack({ delta: 1 }) },

  // v6: 收藏切换，持久化到记录
  toggleFavorite() {
    const record = this.data.record
    if (!record) return
    const isFavorite = !this.data.isFavorite
    record.isFavorite = isFavorite
    const records = (app.globalData.records || []).map(r => r.id === record.id ? Object.assign({}, r, { isFavorite }) : r)
    app.globalData.records = records
    app.saveToLocal('records', records)
    this.setData({ isFavorite })
    wx.showToast({ title: isFavorite ? '已收藏' : '已取消', icon: 'none', duration: 1200 })
  },

  deleteRecord() {
    const record = this.data.record
    if (!record) return
    wx.showModal({
      title: '删除记录',
      content: '删除后无法恢复，确定要删掉这条出逃记录吗？',
      confirmText: '删除',
      cancelText: '留着',
      confirmColor: '#E05555',
      success: (res) => {
        if (!res.confirm) return
        const records = (app.globalData.records || []).filter(r => r.id !== record.id)
        app.globalData.records = records
        app.saveToLocal('records', records)
        wx.showToast({ title: '已删除', icon: 'none' })
        setTimeout(() => wx.navigateBack({ delta: 1 }), 400)
      }
    })
  },

  onShareAppMessage() {
    const r = this.data.record || {}
    return {
      title: r.feeling ? `出逃记录：${r.feeling}` : '我的出逃记录',
      path: '/pages/index/index'
    }
  }
})
