const app = getApp()

Page({
  data: {
    statusBarHeight: 20,
    navHeaderStyle: '',
    form: {
      sportFreq: '',
      socialTendency: '',
      dailyRange: '',
      hobbies: [],
      wants: []
    },
    // 用于 WXML 判断选中状态的 map
    hobbyMap: {},
    wantMap: {},
    allDone: false,
    sportOpts: [
      { value: 'never', label: '几乎不运动' },
      { value: 'occasional', label: '偶尔运动' },
      { value: 'often', label: '经常运动' },
      { value: 'pro', label: '专业级别' }
    ],
    socialOpts: [
      { value: 'introvert', label: '社恐，能不社交就不社交' },
      { value: 'mid', label: '有点 i 人' },
      { value: 'extrovert', label: '有点 e 人' },
      { value: 'social-butterfly', label: '社牛' }
    ],
    rangeOpts: [
      { value: 'fixed', label: '家和公司两点一线' },
      { value: 'neighbourhood', label: '主要在固定街区' },
      { value: 'city', label: '常去不同区' },
      { value: 'fullcity', label: '全城跑' }
    ],
    hobbyOpts: [
      { value: 'sport', label: '运动' },
      { value: 'food', label: '美食' },
      { value: 'art', label: '艺术/展览' },
      { value: 'reading', label: '阅读' },
      { value: 'social', label: '社交' },
      { value: 'game', label: '游戏' },
      { value: 'outdoor', label: '户外' }
    ],
    wantOpts: [
      { value: 'social', label: '认识新的人' },
      { value: 'adventure', label: '做从没做过的事' },
      { value: 'culture', label: '探索文化/艺术' },
      { value: 'food', label: '吃没吃过的' },
      { value: 'body', label: '突破身体极限' }
    ],
    theme: 'default'
  },

  onLoad() {
    this.applyNavMetrics()
    const existing = app.globalData.breakthroughProfile
    if (existing && existing.completed) {
      const form = {
        sportFreq: existing.sportFreq || '',
        socialTendency: existing.socialTendency || '',
        dailyRange: existing.dailyRange || '',
        hobbies: existing.hobbies || [],
        wants: existing.wants || []
      }
      this.setData({
        form: form,
        hobbyMap: this.buildMap(form.hobbies),
        wantMap: this.buildMap(form.wants),
        allDone: this.calcAllDone(form)
      })
    }
  },

  onShow() {
    this.applyNavMetrics()
    this.setData({ theme: app.globalData.theme || 'default' })
  },

  applyNavMetrics() {
    const nav = app.getNavMetrics ? app.getNavMetrics() : {}
    this.setData({
      statusBarHeight: nav.statusBarHeight || 20,
      navHeaderStyle: nav.navHeaderStyle || app.globalData.navHeaderStyle || ''
    })
  },

  goBack() {
    wx.navigateBack({ delta: 1 })
  },

  buildMap(arr) {
    const m = {}
    if (arr && arr.length) arr.forEach(v => { m[v] = true })
    return m
  },

  calcAllDone(form) {
    return !!(form.sportFreq && form.socialTendency && form.dailyRange && form.hobbies.length && form.wants.length)
  },

  refreshAllDone() {
    this.setData({ allDone: this.calcAllDone(this.data.form) })
  },

  // 单选
  onSelect(e) {
    const field = e.currentTarget.dataset.field
    const value = e.currentTarget.dataset.value
    this.setData({ ['form.' + field]: value }, () => this.refreshAllDone())
  },

  // 多选（爱好）
  onToggleHobby(e) {
    const value = e.currentTarget.dataset.value
    let hobbies = this.data.form.hobbies.slice()
    const idx = hobbies.indexOf(value)
    if (idx >= 0) hobbies.splice(idx, 1)
    else if (hobbies.length < 3) hobbies.push(value)
    else {
      wx.showToast({ title: '最多选 3 个', icon: 'none' })
      return
    }
    this.setData({
      'form.hobbies': hobbies,
      hobbyMap: this.buildMap(hobbies)
    }, () => this.refreshAllDone())
  },

  // 多选（想破圈的方向）
  onToggleWant(e) {
    const value = e.currentTarget.dataset.value
    let wants = this.data.form.wants.slice()
    const idx = wants.indexOf(value)
    if (idx >= 0) wants.splice(idx, 1)
    else if (wants.length < 3) wants.push(value)
    else {
      wx.showToast({ title: '最多选 3 个', icon: 'none' })
      return
    }
    this.setData({
      'form.wants': wants,
      wantMap: this.buildMap(wants)
    }, () => this.refreshAllDone())
  },

  onSave() {
    if (!this.data.allDone) {
      wx.showToast({ title: '请回答全部 5 个问题', icon: 'none' })
      return
    }
    const profile = Object.assign({}, this.data.form, { completed: true })
    app.globalData.breakthroughProfile = profile
    app.saveToLocal('breakthroughProfile', profile)
    wx.showToast({ title: '画像已保存', icon: 'success' })
    setTimeout(() => {
      wx.navigateBack({ delta: 1 })
    }, 800)
  }
})
