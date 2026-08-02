const app = getApp()

// 5 分类卡片
const CATEGORIES = [
  {
    id: 'review',
    title: '回忆',
    subtitle: '重温你的出逃轨迹',
    icon: '/assets/icons/clock-brand.svg',
    accentColor: '#5CBF9E',
    items: [
      { label: '时间线', path: '/pages/timeline/timeline', icon: '/assets/icons/clock-brand.svg' },
      { label: '年度回顾', path: '/pages/year-review/year-review', icon: '/assets/icons/star-lemon.svg' },
      { label: '心情日记', path: '/pages/mood-journal/mood-journal', icon: '/assets/icons/heart-lavender.svg' },
      { label: '城市足迹', path: '/pages/city-progress/city-progress', icon: '/assets/icons/map-pin-brand.svg' }
    ]
  },
  {
    id: 'social',
    title: '互动',
    subtitle: '和朋友一起出逃',
    icon: '/assets/icons/users-lavender.svg',
    accentColor: '#9B7BB8',
    items: [
      { label: '搭档', path: '/pages/partner-list/partner-list', icon: '/assets/icons/users-lavender.svg' },
      { label: '邀请', path: '/pages/invite/invite', icon: '/assets/icons/send.svg' },
      { label: '排行榜', path: '/pages/leaderboard/leaderboard', icon: '/assets/icons/crown-lemon.svg' },
      { label: '社区', path: '/pages/community/community', icon: '/assets/icons/heart-lavender.svg' }
    ]
  },
  {
    id: 'collection',
    title: '收藏',
    subtitle: '整理你的指令库',
    icon: '/assets/icons/bookmark-brand.svg',
    accentColor: '#D98A5C',
    items: [
      { label: '我的收藏', path: '/pages/collection/collection', icon: '/assets/icons/bookmark-brand.svg' },
      { label: '分类', path: '/pages/collection-category/collection-category', icon: '/assets/icons/layers.svg' },
      { label: '破圈画像', path: '/pages/breakthrough-profile/breakthrough-profile', icon: '/assets/icons/zap-coral.svg' },
      { label: '导出', path: '/pages/data-export/data-export', icon: '/assets/icons/share-2.svg' }
    ]
  },
  {
    id: 'growth',
    title: '成长',
    subtitle: '徽章、挑战、统计',
    icon: '/assets/icons/award-lemon.svg',
    accentColor: '#C9B037',
    items: [
      { label: '每日挑战', path: '/pages/daily-challenge/daily-challenge', icon: '/assets/icons/zap-coral.svg' },
      { label: '成就墙', path: '/pages/achievements/achievements', icon: '/assets/icons/award-lemon.svg' },
      { label: '徽章', path: '/pages/badges/badges', icon: '/assets/icons/award-brand-strong.svg' },
      { label: '统计', path: '/pages/stats/stats', icon: '/assets/icons/target.svg' }
    ]
  },
  {
    id: 'settings',
    title: '设置',
    subtitle: '个人资料、帮助、关于',
    icon: '/assets/icons/settings-brand.svg',
    accentColor: '#6B7280',
    items: [
      { label: '资料', path: '/pages/profile-edit/profile-edit', icon: '/assets/icons/user-brand.svg' },
      { label: '设置', path: '/pages/settings/settings', icon: '/assets/icons/settings-brand.svg' },
      { label: '帮助', path: '/pages/help/help', icon: '/assets/icons/compass.svg' },
      { label: '关于', path: '/pages/about/about', icon: '/assets/icons/compass-ink-faint.svg' }
    ]
  }
]

Page({
  data: {
    statusBarHeight: 20,
    navHeaderStyle: '',
    userName: '',
    escapeCode: '',
    avatarUrl: '/assets/images/avatar.webp',
    stats: [],
    categories: CATEGORIES,
    isMember: false,
    theme: 'default'
  },

  onLoad() {
    this.applyNavMetrics()
  },

  onShow() {
    this.applyNavMetrics()
    this.loadUserData()
    this.setData({ theme: app.globalData.theme || 'default' })
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 2 })
    }
  },

  applyNavMetrics() {
    const nav = app.getNavMetrics ? app.getNavMetrics() : {}
    this.setData({
      statusBarHeight: nav.statusBarHeight || 20,
      navHeaderStyle: nav.navHeaderStyle || app.globalData.navHeaderStyle || ''
    })
  },

  loadUserData() {
    const gd = app.globalData
    const records = gd.records || []
    const badges = gd.badges || []

    // 城市覆盖（按经纬度粗略聚合）
    const citySet = new Set()
    records.forEach(r => {
      if (r.location && r.location.latitude) {
        // 粗粒度：0.1 度 ≈ 11km，作为城市级别近似
        citySet.add(Math.round(r.location.latitude * 10) + ',' + Math.round(r.location.longitude * 10))
      }
    })

    this.setData({
      userName: gd.escapeName || '出逃者',
      escapeCode: gd.escapeCode || '给城市留一点空白',
      avatarUrl: gd.avatarUrl || '/assets/images/avatar.webp',
      isMember: !!(gd.memberStatus && gd.memberStatus.isMember),
      stats: [
        { label: '累计出逃', value: String(records.length), unit: '次' },
        { label: '最长连续', value: String(gd.continuousDays || 0), unit: '天' },
        { label: '解锁徽章', value: String(badges.length), unit: '枚' },
        { label: '城市覆盖', value: String(citySet.size), unit: '个' }
      ]
    })
  },

  onCategoryItemTap(e) {
    const path = e.currentTarget.dataset.path
    if (!path) return
    wx.navigateTo({
      url: path,
      fail: () => {
        wx.showToast({ title: '页面未就绪', icon: 'none' })
      }
    })
  },

  goProfileEdit() {
    wx.navigateTo({
      url: '/pages/profile-edit/profile-edit',
      fail: () => {
        // 兜底：用旧的内联编辑
        this.changeName()
      }
    })
  },

  changeName() {
    wx.showModal({
      title: '修改出逃代号',
      editable: true,
      placeholderText: '给自己取一个名字吧',
      content: this.data.escapeCode,
      success: (res) => {
        if (res.confirm && res.content) {
          const code = res.content.trim().slice(0, 12)
          if (code.length > 0) {
            app.globalData.escapeCode = code
            app.saveToLocal && app.saveToLocal('escapeCode', code)
            this.setData({ escapeCode: code })
            wx.showToast({ title: '代号已更新', icon: 'success' })
          }
        }
      }
    })
  },

  goMember() {
    wx.navigateTo({ url: '/pages/member/member' })
  },

  onShareAppMessage() {
    return {
      title: '我在「出逃指令」里记录了' + (this.data.stats[0] ? this.data.stats[0].value : '0') + '次城市漫游',
      path: '/pages/index/index'
    }
  }
})
