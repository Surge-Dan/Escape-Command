const app = getApp()
const challenges = require('../../data/challenges.js')
const { normalizeType } = require('../../utils/constants.js')

const TYPE_KEYS = ['color', 'walk', 'sense', 'collect', 'food', 'culture']

Page({
  data: {
    statusBarHeight: 20,
    todayChallenge: null,
    todayDate: '',
    isCompleted: false,
    completedCount: 0,
    progressToBadge: 0,
    historyChallenges: [],
    difficultyStars: [],
    badgeTotal: 7
  },

  onLoad() {
    const nav = app.getNavMetrics ? app.getNavMetrics() : {}
    this.setData({ statusBarHeight: nav.statusBarHeight || 20, navHeaderStyle: nav.navHeaderStyle || '' })
    this.loadChallenge()
  },

  onShow() {
    this.loadChallenge()
  },

  getTodayStr() {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  },

  formatDate(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  },

  getDailyChallenge() {
    if (typeof app.getDailyChallenge === 'function') return app.getDailyChallenge()
    const dayOfMonth = new Date().getDate()
    return challenges[dayOfMonth % challenges.length]
  },

  getChallengeForDate(dateStr) {
    const d = new Date(dateStr)
    const dayOfMonth = d.getDate()
    return challenges[dayOfMonth % challenges.length]
  },

  loadChallenge() {
    const today = this.getTodayStr()
    const todayChallenge = this.getDailyChallenge()
    const completion = wx.getStorageSync('challengeCompletion') || {}
    const isCompleted = completion[today] === todayChallenge.id

    let completedCount = 0
    const historyChallenges = []
    for (let i = 1; i <= 7; i++) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const dateStr = this.formatDate(d)
      const ch = this.getChallengeForDate(dateStr)
      const done = completion[dateStr] === ch.id
      if (done) completedCount++
      historyChallenges.push({
        date: dateStr,
        dayLabel: this.formatDayLabel(d),
        title: ch.title,
        desc: ch.desc,
        difficulty: ch.difficulty,
        completed: done
      })
    }

    const difficultyStars = []
    for (let i = 0; i < 3; i++) {
      difficultyStars.push(i < todayChallenge.difficulty)
    }

    this.setData({
      todayChallenge,
      todayDate: today,
      isCompleted,
      completedCount,
      progressToBadge: Math.min(completedCount, 7),
      historyChallenges,
      difficultyStars
    })
  },

  formatDayLabel(d) {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const target = new Date(d)
    target.setHours(0, 0, 0, 0)
    const diff = Math.round((today - target) / (24 * 60 * 60 * 1000))
    if (diff === 0) return '今天'
    if (diff === 1) return '昨天'
    if (diff === 2) return '前天'
    const weekDays = ['日', '一', '二', '三', '四', '五', '六']
    return `周${weekDays[d.getDay()]}`
  },

  startChallenge() {
    const ch = this.data.todayChallenge
    if (!ch || this.data.isCompleted) return
    const pool = app.globalData.commandPool || []
    let candidates = []

    if (TYPE_KEYS.indexOf(ch.type) >= 0) {
      candidates = pool.filter(c => normalizeType(c.type) === ch.type)
    } else if (ch.type === 'mode') {
      const modeMatch = ch.condition && ch.condition.match(/command\.mode\s*===\s*"([^"]+)"/)
      if (modeMatch) {
        candidates = pool.filter(c => c.mode === modeMatch[1])
      }
    }

    if (!candidates.length) candidates = pool.filter(c => !c.requirePOI)
    if (!candidates.length) candidates = pool
    if (!candidates.length) {
      wx.showToast({ title: '指令池为空', icon: 'none' })
      return
    }

    const cmd = candidates[Math.floor(Math.random() * candidates.length)]
    app.startCommand(cmd)
    wx.redirectTo({ url: '/pages/executing/executing' })
  },

  markCompleted() {
    // 调试用：手动标记今日挑战完成（实际完成指令时会自动写入）
    const completion = wx.getStorageSync('challengeCompletion') || {}
    completion[this.data.todayDate] = this.data.todayChallenge.id
    wx.setStorageSync('challengeCompletion', completion)
    this.loadChallenge()
    wx.showToast({ title: '挑战已完成', icon: 'success' })
  },

  goBack() {
    wx.navigateBack({ delta: 1 })
  }
})
