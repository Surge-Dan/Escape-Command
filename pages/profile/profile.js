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
      { label: '邀请', path: '/packageMe/pages/invite/invite', icon: '/assets/icons/send.svg' },
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
      { label: '破圈画像', path: '/packageBt/pages/breakthrough-profile/breakthrough-profile', icon: '/assets/icons/zap-coral.svg' },
      { label: '导出', path: '/packageMe/pages/data-export/data-export', icon: '/assets/icons/share-2.svg' }
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
    subtitle: '帮助、关于、主题',
    icon: '/assets/icons/settings-brand.svg',
    accentColor: '#6B7280',
    items: [
      { label: '设置', path: '/pages/settings/settings', icon: '/assets/icons/settings-brand.svg' },
      { label: '破圈画像', path: '/packageBt/pages/breakthrough-profile/breakthrough-profile', icon: '/assets/icons/zap-coral.svg' },
      { label: '帮助', path: '/packageMe/pages/help/help', icon: '/assets/icons/compass.svg' },
      { label: '关于', path: '/packageMe/pages/about/about', icon: '/assets/icons/compass-ink-faint.svg' }
    ]
  }
]

Page({
  data: {
    statusBarHeight: 20,
    navHeaderStyle: '',
    userName: '',
    escapeCode: '',
    avatarUrl: '/assets/avatar-default.webp',
    stats: [],
    categories: CATEGORIES,
    isMember: false,
    theme: 'default',
    showEditTip: true,
    tabbarHidden: false
  },

  onLoad() {
    this.applyNavMetrics()
  },

  onShow() {
    this.applyNavMetrics()
    this.loadUserData()
    this.setData({ theme: app.globalData.theme || 'default' })
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 2, tabbarHidden: false })
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
    // 累计距离
    let totalDistance = 0
    // 本月出逃次数（按东八区年月判定，与 app.getTodayStr 时区策略一致）
    const bjNow = new Date(Date.now() + 8 * 3600 * 1000)
    const bjYear = bjNow.getUTCFullYear()
    const bjMonth = bjNow.getUTCMonth() + 1
    let monthCount = 0
    // 出逃日期集合（用 r.date 字符串，YYYY-MM-DD，避免 timestamp 时区漂移）
    const daySet = new Set()

    records.forEach(r => {
      if (!r) return
      if (r.location && r.location.latitude) {
        citySet.add(Math.round(r.location.latitude * 10) + ',' + Math.round(r.location.longitude * 10))
      }
      if (r.distance) totalDistance += Number(r.distance) || 0
      // 优先用 r.date 字符串（YYYY-MM-DD），兜底从 timestamp 解析
      let dateStr = ''
      if (typeof r.date === 'string' && r.date) {
        dateStr = r.date
      } else if (typeof r.timestamp === 'number' && Number.isFinite(r.timestamp)) {
        const d = new Date(r.timestamp + 8 * 3600 * 1000)
        dateStr = d.getUTCFullYear() + '-' + String(d.getUTCMonth() + 1).padStart(2, '0') + '-' + String(d.getUTCDate()).padStart(2, '0')
      }
      if (dateStr) {
        daySet.add(dateStr)
        const parts = dateStr.split('-')
        if (parts.length === 3 && Number(parts[0]) === bjYear && Number(parts[1]) === bjMonth) {
          monthCount++
        }
      }
    })

    // 计算最长连续天数：从排序后的唯一日期序列中找最长连续段
    const sortedDays = Array.from(daySet).sort()
    let maxStreak = 0
    let curStreak = 0
    let prevTime = null
    for (let i = 0; i < sortedDays.length; i++) {
      const t = new Date(sortedDays[i] + 'T00:00:00+08:00').getTime()
      if (isNaN(t)) continue
      if (prevTime !== null && (t - prevTime) === 86400000) {
        curStreak++
      } else {
        curStreak = 1
      }
      if (curStreak > maxStreak) maxStreak = curStreak
      prevTime = t
    }

    this.setData({
      userName: gd.escapeName || '出逃者',
      escapeCode: gd.escapeCode || '给城市留一点空白',
      avatarUrl: gd.avatarUrl || '/assets/avatar-default.webp',
      isMember: !!(gd.memberStatus && gd.memberStatus.isMember),
      stats: [
        { label: '累计出逃', value: String(records.length), unit: '次' },
        { label: '本月', value: String(monthCount), unit: '次' },
        { label: '最长连续', value: String(maxStreak), unit: '天' },
        { label: '城市覆盖', value: String(citySet.size), unit: '个' }
      ],
      version: gd.version || 'v3.0'
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

  // 头像加载失败：清空 avatarUrl，让 image 隐藏，露出 CSS 渐变 + emoji 背景
  onAvatarError() {
    console.warn('[profile] avatar 加载失败，使用 CSS 背景兜底')
    this.setData({ avatarUrl: '' })
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
    wx.showToast({ title: '会员功能开发中，请耐心等待~', icon: 'none', duration: 2000 })
  },

  onShareAppMessage() {
    return {
      title: '我在「出逃指令」里记录了' + (this.data.stats[0] ? this.data.stats[0].value : '0') + '次城市漫游',
      path: '/pages/index/index'
    }
  }
})
