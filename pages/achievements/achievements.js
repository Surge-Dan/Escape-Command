const app = getApp()
const BADGES = require('../../data/badges.js')

// 里程碑定义
const MILESTONES = [
  { id: 'first_escape',  title: '初次出逃',   desc: '完成你的第一次出逃，迈出第一步。',     target: 1,   scope: 'records' },
  { id: 'ten_escapes',   title: '十次出逃',   desc: '累计完成 10 次出逃，开始有了节奏。',   target: 10,  scope: 'records' },
  { id: 'fifty_escapes', title: '五十次出逃', desc: '累计完成 50 次出逃，城市开始向你展开。', target: 50,  scope: 'records' },
  { id: 'hundred_escapes', title: '百次出逃', desc: '累计完成 100 次出逃，已是出逃老朋友。', target: 100, scope: 'records' },
  { id: 'thousand_days', title: '千日漫步',   desc: '连续 100 天完成出逃，把出逃过成生活。', target: 100, scope: 'streak' }
]

const DAY_LABELS = ['日', '一', '二', '三', '四', '五', '六']

Page({
  data: {
    statusBarHeight: 20,
    recordsCount: 0,
    continuousDays: 0,
    maxStreak: 0,
    unlockedBadges: 0,
    milestones: [],
    milestoneUnlocked: 0,
    weekView: [],
    theme: 'default',
    stats: {
      totalEscapes: 0,
      totalHours: 0,
      totalMinutes: 0,
      collected: 0,
      badgesUnlocked: 0,
      badgesTotal: 19
    }
  },

  onLoad() {
    const nav = app.getNavMetrics ? app.getNavMetrics() : {}
    this.setData({ statusBarHeight: nav.statusBarHeight || 20, navHeaderStyle: nav.navHeaderStyle || '' })
    this.loadAll()
  },

  onShow() {
    this.setData({ theme: app.globalData.theme || 'default' })
    this.loadAll()
  },

  loadAll() {
    const records = app.globalData.records || []
    const continuousDays = app.globalData.continuousDays || 0
    const collected = app.globalData.collectedCommands || []
    const unlockedBadges = app.globalData.badges || []
    const completedCommandIds = app.globalData.completedCommandIds || []

    // 里程碑计算
    const milestones = MILESTONES.map(m => {
      let current = 0
      if (m.scope === 'records') current = records.length
      else if (m.scope === 'streak') current = continuousDays
      const unlocked = current >= m.target
      const percent = unlocked ? 100 : Math.min(99, Math.round(current / m.target * 100))
      const date = unlocked ? this.findMilestoneDate(m, records) : ''
      return Object.assign({}, m, {
        unlocked,
        current,
        currentText: current,
        percent,
        date
      })
    })
    const milestoneUnlocked = milestones.filter(m => m.unlocked).length

    // 最长连击：从 storage 取，没有就计算
    let maxStreak = wx.getStorageSync('maxStreak') || 0
    if (!maxStreak && records.length) {
      maxStreak = this.computeMaxStreak(records)
      wx.setStorageSync('maxStreak', maxStreak)
    }
    // 当前连击不应超过 maxStreak
    if (continuousDays > maxStreak) {
      maxStreak = continuousDays
      wx.setStorageSync('maxStreak', maxStreak)
    }

    // 总探索时长
    const totalMin = records.reduce((sum, r) => sum + (r.duration || 0), 0)
    const totalHours = Math.floor(totalMin / 60)
    const totalMinutes = totalMin % 60

    // 7 天视图
    const weekView = this.buildWeekView(records)

    this.setData({
      recordsCount: records.length,
      continuousDays,
      maxStreak,
      unlockedBadges: unlockedBadges.length,
      milestones,
      milestoneUnlocked,
      weekView,
      stats: {
        totalEscapes: records.length,
        totalHours,
        totalMinutes,
        collected: collected.length,
        badgesUnlocked: unlockedBadges.length,
        badgesTotal: BADGES.length
      }
    })
  },

  findMilestoneDate(milestone, records) {
    if (milestone.scope === 'records') {
      // 第 N 次出逃的日期：records 是按时间倒序 unshift 的，所以第 N 次是倒数第 N 条
      const idx = records.length - milestone.target
      if (idx >= 0 && idx < records.length && records[idx]) {
        return records[idx].date || ''
      }
    } else if (milestone.scope === 'streak') {
      // 连击达成的近似日期：取最新一条记录的日期
      if (records.length) return records[0].date || ''
    }
    return ''
  },

  computeMaxStreak(records) {
    if (!records.length) return 0
    // 取所有 date 字符串，去重后排序
    const dates = Array.from(new Set(records.map(r => r.date).filter(Boolean))).sort()
    let max = 1
    let cur = 1
    for (let i = 1; i < dates.length; i++) {
      const prev = new Date(dates[i - 1])
      const now = new Date(dates[i])
      const diff = (now - prev) / (1000 * 60 * 60 * 24)
      if (Math.round(diff) === 1) {
        cur++
        if (cur > max) max = cur
      } else if (Math.round(diff) === 0) {
        // 同一天，跳过
      } else {
        cur = 1
      }
    }
    return max
  },

  buildWeekView(records) {
    // 最近 7 天，每天一个圆点，有出逃就点亮
    const today = new Date()
    const dateSet = new Set(records.map(r => r.date).filter(Boolean))
    const list = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today)
      d.setDate(d.getDate() - i)
      const y = d.getFullYear()
      const m = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      const dateStr = `${y}-${m}-${day}`
      list.push({
        key: dateStr,
        label: DAY_LABELS[d.getDay()],
        has: dateSet.has(dateStr)
      })
    }
    return list
  },

  goBack() { wx.navigateBack({ delta: 1 }) }
})
