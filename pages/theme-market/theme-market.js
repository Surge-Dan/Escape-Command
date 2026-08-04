const app = getApp()
const themes = require('../../data/themes.js')

Page({
  data: {
    statusBarHeight: 20,
    themes: [],
    currentTheme: 'default'
  },

  onLoad() {
    const nav = app.getNavMetrics ? app.getNavMetrics() : {}
    this.setData({ statusBarHeight: nav.statusBarHeight || 20, navHeaderStyle: nav.navHeaderStyle || '' })
    this.loadThemes()
  },

  onShow() {
    this.loadThemes()
  },

  loadThemes() {
    const currentTheme = wx.getStorageSync('currentTheme') || 'default'
    const enriched = themes.map(t => {
      const swatches = [
        { color: t.vars['--canvas'], label: '底色' },
        { color: t.vars['--brand'], label: '主色' },
        { color: t.vars['--brand-tint'], label: '点缀' },
        { color: t.vars['--brand-dark'], label: '深色' }
      ]
      return {
        id: t.id,
        name: t.name,
        desc: t.desc,
        preview: t.preview,
        vars: t.vars,
        swatches,
        isCurrent: t.id === currentTheme
      }
    })
    this.setData({ themes: enriched, currentTheme })
  },

  switchTheme(e) {
    const id = e.currentTarget.dataset.id
    if (id === this.data.currentTheme) return
    wx.setStorageSync('currentTheme', id)
    wx.showToast({ title: '主题已切换', icon: 'success' })
    this.loadThemes()
  },

  previewTheme(e) {
    const id = e.currentTarget.dataset.id
    const t = this.data.themes.find(x => x.id === id)
    if (!t) return
    wx.showModal({
      title: t.name,
      content: `${t.desc}\n\n底色 ${t.vars['--canvas']}\n主色 ${t.vars['--brand']}\n点缀 ${t.vars['--brand-tint']}`,
      showCancel: !t.isCurrent,
      cancelText: '关闭',
      confirmText: t.isCurrent ? '知道了' : '切换',
      success: (res) => {
        if (res.confirm && !t.isCurrent) {
          this.switchTheme({ currentTarget: { dataset: { id } } })
        }
      }
    })
  },

  goBack() {
    wx.navigateBack({ delta: 1 })
  }
})
