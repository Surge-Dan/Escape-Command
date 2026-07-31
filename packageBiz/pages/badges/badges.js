const app = getApp()
const BADGES = require('../../../data/badges.js')

// 徽章分组配置：category → 中文标题
const CATEGORY_ORDER = [
  { key: 'milestone', title: '里程碑徽章' },
  { key: 'type', title: '类型徽章' },
  { key: 'mode', title: '模式徽章' },
  { key: 'social', title: '社交徽章' },
  { key: 'special', title: '特殊徽章' }
]

Page({
  data: {
    statusBarHeight: 20,
    sections: [],
    unlockedCount: 0,
    totalCount: BADGES.length
  },

  onLoad() {
    this.applyNavMetrics()
    this.loadBadges()
  },

  onShow() {
    this.applyNavMetrics()
    this.loadBadges()
  },

  applyNavMetrics() {
    const nav = app.getNavMetrics ? app.getNavMetrics() : {}
    this.setData({ statusBarHeight: nav.statusBarHeight || 20, navHeaderStyle: nav.navHeaderStyle || '' })
  },

  loadBadges() {
    const unlocked = app.globalData.badges || []
    const unlockedMap = {}
    unlocked.forEach(b => { unlockedMap[b.id] = b })

    // 给每枚徽章附加解锁状态/解锁日期，并按 category 分组
    const grouped = {}
    BADGES.forEach(badge => {
      const found = unlockedMap[badge.id]
      const rawDate = found ? found.date : ''
      const item = Object.assign({}, badge, {
        unlocked: !!found,
        date: rawDate,
        dateText: rawDate ? this.formatBadgeDate(rawDate) : '',
        // 锁定态下 icon 可能缺失，提供兜底
        icon: badge.icon || '/assets/icons/award.svg'
      })
      if (!grouped[badge.category]) grouped[badge.category] = []
      grouped[badge.category].push(item)
    })

    const sections = CATEGORY_ORDER.map(sec => ({
      key: sec.key,
      title: sec.title,
      badges: grouped[sec.key] || []
    })).filter(sec => sec.badges.length > 0)

    this.setData({
      sections,
      unlockedCount: unlocked.length,
      totalCount: BADGES.length
    })
  },

  formatBadgeDate(dateStr) {
    if (!dateStr) return ''
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return String(dateStr)
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  },

  onBadgeTap(e) {
    const id = e.currentTarget.dataset.id
    let target = null
    for (const sec of this.data.sections) {
      const found = sec.badges.find(b => b.id === id)
      if (found) { target = found; break }
    }
    if (!target) return

    if (!target.unlocked) {
      wx.showToast({ title: target.desc || '继续出逃解锁这枚徽章', icon: 'none', duration: 1800 })
      return
    }
    wx.navigateTo({
      url: `/packageBiz/pages/badge-detail/badge-detail?id=${target.id}`,
      fail: () => {
        // 兜底：badge-detail 页未就绪时弹窗展示
        wx.showModal({
          title: target.name,
          content: `${target.desc}${target.date ? '\n获得于 ' + target.date : ''}`,
          showCancel: false,
          confirmText: '好的'
        })
      }
    })
  },

  goBack() { wx.navigateBack({ delta: 1 }) }
})
