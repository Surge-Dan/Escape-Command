const app = getApp()
const { TYPE_META, MOODS, getTypeMeta, normalizeType } = require('../../../utils/constants.js')

const TYPE_ORDER = ['color', 'walk', 'sense', 'collect', 'food', 'culture']
const SEASONS = [
  { id: 'spring', name: '春', desc: '万物萌发的时节', tint: '#E8F5E9' },
  { id: 'summer', name: '夏', desc: '阳光炽热的日子', tint: '#FFF4C7' },
  { id: 'autumn', name: '秋', desc: '落叶铺满街道', tint: '#FFE8D6' },
  { id: 'winter', name: '冬', desc: '冷冽安静的时光', tint: '#EAF4FF' }
]

Page({
  data: {
    statusBarHeight: 20,
    activeTab: 'type',
    typeSections: [],
    moodSections: [],
    seasonSections: [],
    totalCollected: 0,
    hasMoodRecords: false
  },

  onLoad() {
    const nav = app.getNavMetrics ? app.getNavMetrics() : {}
    this.setData({ statusBarHeight: nav.statusBarHeight || 20, navHeaderStyle: nav.navHeaderStyle || '' })
    this.loadCategories()
  },

  onShow() {
    this.loadCategories()
  },

  loadCategories() {
    const collectedIds = app.globalData.collectedCommands || []
    const pool = app.globalData.commandPool || []
    const ugc = app.globalData.ugcCommands || []
    const records = app.globalData.records || []

    const collected = []
    collectedIds.forEach(id => {
      const cmd = pool.find(c => c.id === id) || ugc.find(c => c.id === id)
      if (!cmd) return
      const type = normalizeType(cmd.type)
      const meta = getTypeMeta(type)
      collected.push({
        id: cmd.id,
        title: cmd.title || (cmd.content || '').replace(/[，。,.].*$/, '').slice(0, 18),
        content: cmd.content,
        type,
        typeName: meta.name,
        typeColor: cmd.typeColor || meta.color,
        typeIcon: meta.icon,
        duration: cmd.duration || 30,
        season: cmd.season || this.guessSeason(cmd)
      })
    })

    const typeSections = TYPE_ORDER.map(type => {
      const meta = TYPE_META[type]
      const commands = collected.filter(c => c.type === type)
      return {
        id: type,
        name: meta.name,
        color: meta.color,
        icon: meta.icon,
        count: commands.length,
        commands
      }
    })

    const moodSections = MOODS.map(mood => {
      const matchingRecords = records.filter(r => r.mood === mood.id)
      const cmdIds = []
      matchingRecords.forEach(r => {
        if (r.commandId && !cmdIds.includes(r.commandId)) cmdIds.push(r.commandId)
      })
      const commands = cmdIds.map(id => {
        const cmd = pool.find(c => c.id === id) || ugc.find(c => c.id === id)
        if (!cmd) return null
        const type = normalizeType(cmd.type)
        const meta = getTypeMeta(type)
        return {
          id: cmd.id,
          title: cmd.title || (cmd.content || '').replace(/[，。,.].*$/, '').slice(0, 18),
          content: cmd.content,
          type,
          typeName: meta.name,
          typeColor: cmd.typeColor || meta.color,
          typeIcon: meta.icon,
          duration: cmd.duration || 30
        }
      }).filter(Boolean)
      return {
        id: mood.id,
        name: mood.name,
        color: mood.fg,
        tint: mood.tint,
        icon: mood.icon,
        count: commands.length,
        commands
      }
    })

    const seasonSections = SEASONS.map(season => {
      const commands = collected.filter(c => c.season === season.id)
      return {
        id: season.id,
        name: season.name,
        desc: season.desc,
        tint: season.tint,
        count: commands.length,
        commands
      }
    })

    const hasMoodRecords = moodSections.some(s => s.commands.length > 0)

    this.setData({
      typeSections,
      moodSections,
      seasonSections,
      totalCollected: collected.length,
      hasMoodRecords
    })
  },

  guessSeason(cmd) {
    const text = ((cmd.content || '') + (cmd.title || ''))
    if (/落叶|秋天|秋|银杏|梧桐|桂花/.test(text)) return 'autumn'
    if (/雪|冬|冷|炉|火锅/.test(text)) return 'winter'
    if (/热|夏|冰|暑|蝉|西瓜/.test(text)) return 'summer'
    if (/春|花|嫩|发芽|樱花|新绿/.test(text)) return 'spring'
    return null
  },

  switchTab(e) {
    const tab = e.currentTarget.dataset.tab
    if (tab === this.data.activeTab) return
    this.setData({ activeTab: tab })
  },

  onCommandTap(e) {
    const id = e.currentTarget.dataset.id
    const find = (sections) => {
      for (const s of sections) {
        const found = s.commands.find(c => c.id === id)
        if (found) return found
      }
      return null
    }
    const cmd = find(this.data.typeSections) || find(this.data.moodSections) || find(this.data.seasonSections)
    if (!cmd) return
    wx.showModal({
      title: cmd.typeName || '出逃指令',
      content: cmd.content,
      confirmText: '就这条了',
      cancelText: '再看看',
      success: (res) => {
        if (!res.confirm) return
        const pool = app.globalData.commandPool || []
        const ugc = app.globalData.ugcCommands || []
        const full = pool.find(c => c.id === id) || ugc.find(c => c.id === id)
        if (!full) {
          wx.showToast({ title: '指令已失效', icon: 'none' })
          return
        }
        app.startCommand(full)
        wx.redirectTo({ url: '/pages/executing/executing' })
      }
    })
  },

  goBrowse() {
    wx.switchTab({ url: '/pages/index/index' })
  },

  goBack() {
    wx.navigateBack({ delta: 1 })
  }
})
