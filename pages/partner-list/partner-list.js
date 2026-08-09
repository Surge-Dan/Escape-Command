const app = getApp()
const imageFallback = require('../../utils/image-fallback.js')

const MODE_COLORS = {
  smart: '#5CBF9E',
  micro: '#7BAE7F',
  walk: '#D98A5C',
  double: '#9B7BB8',
  night: '#9B8EC4',
  rainy: '#7EC8F5'
}

const DEFAULT_AVATAR = '/assets/avatar-default.webp'

// globalData.partnerRecords 为空时使用的兜底 mock
const MOCK_PARTNERS = [
  { name: '周末漫游者', avatar: DEFAULT_AVATAR, count: 3, lastDate: '2026-07-05', favMode: 'walk' },
  { name: '追风的散步家', avatar: DEFAULT_AVATAR, count: 2, lastDate: '2026-06-29', favMode: 'micro' },
  { name: '摘云的观察员', avatar: DEFAULT_AVATAR, count: 1, lastDate: '2026-06-22', favMode: 'sense' },
  { name: '捡落叶的探险家', avatar: DEFAULT_AVATAR, count: 1, lastDate: '2026-06-15', favMode: 'collect' }
]

const RANK_BADGES = ['gold', 'silver', 'bronze']

function decorate(partners) {
  // 按合作次数倒序，前 3 名加金银铜徽章
  const sorted = partners.slice().sort((a, b) => (b.count || 0) - (a.count || 0))
  return sorted.map((p, i) => ({
    name: p.name,
    avatar: p.avatar || DEFAULT_AVATAR,
    count: p.count || 0,
    lastDate: p.lastDate || '',
    favMode: p.favMode || 'smart',
    favModeColor: MODE_COLORS[p.favMode] || MODE_COLORS.smart,
    rank: i + 1,
    rankBadge: i < 3 ? RANK_BADGES[i] : ''
  }))
}

Page({
  data: {
    statusBarHeight: 20,
    partners: [],
    totalCount: 0,
    totalCollab: 0,
    topPartnerName: '—',
    isEmpty: false
  },

  onLoad() {
    const nav = app.getNavMetrics ? app.getNavMetrics() : {}
    const gd = app.globalData || {}
    const raw = Array.isArray(gd.partnerRecords) && gd.partnerRecords.length
      ? gd.partnerRecords
      : MOCK_PARTNERS

    const decorated = decorate(raw)
    const totalCount = decorated.length
    const totalCollab = decorated.reduce((s, p) => s + (p.count || 0), 0)
    const topPartnerName = totalCount ? decorated[0].name : '—'

    this.setData({
      statusBarHeight: nav.statusBarHeight || 20,
      navHeaderStyle: nav.navHeaderStyle || '',
      partners: decorated,
      totalCount,
      totalCollab,
      topPartnerName,
      isEmpty: totalCount === 0
    })
  },

  goBack() { wx.navigateBack({ delta: 1 }) },

  onImgError(e) { imageFallback.handle(e, this) },

  tapPartner(e) {
    const name = e.currentTarget.dataset.name
    wx.showToast({ title: '即将开放搭档详情', icon: 'none' })
  },

  goDoubleMode() {
    wx.switchTab({ url: '/pages/index/index' })
  }
})
