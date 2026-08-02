// pages/dice-micro-7d/dice-micro-7d.js
// 微逃骰子（7 维度版）- 条件选择页
// 纯前端本地实现，不依赖后端 / 云函数
// 风格对齐团队 pages/generating/generating.js：const/let + Page({ data, onLoad, 方法 })
// 指令池与生成逻辑统一由 utils/micro-escape-config.js 提供（去重，单一数据源）
const app = getApp()
const microConfig = require('../../utils/micro-escape-config.js')
const { Mood, Duration, Budget, Distance, Energy, PartySize, VenueType, DiceType } = microConfig

Page({
  data: {
    statusBarHeight: 20,
    navHeaderStyle: '',
    mood: '',
    duration: '',
    budget: '',
    distance: '',
    energy: '',
    partySize: PartySize.SOLO,
    venue: VenueType.ANY,

    district: 'tianhe',
    districtName: '天河区',

    moodOptions: [
      { value: Mood.BORED,       label: '无聊' },
      { value: Mood.TIRED,       label: '疲惫' },
      { value: Mood.LIVELY,      label: '想热闹' },
      { value: Mood.QUIET,       label: '想安静' },
      { value: Mood.CURIOUS,     label: '好奇' },
      { value: Mood.MELANCHOLY,  label: '低落' },
      { value: Mood.HAPPY,       label: '开心' },
      { value: Mood.RESTLESS,    label: '烦躁' }
    ],
    durationOptions: [
      { value: String(Duration.MIN_20),  label: '20 分钟' },
      { value: String(Duration.HOUR_1),  label: '1 小时' },
      { value: String(Duration.HALF_DAY), label: '半天' },
      { value: String(Duration.FULL_DAY), label: '一天' }
    ],
    budgetOptions: [
      { value: String(Budget.FREE),      label: '免费' },
      { value: String(Budget.UNDER_50),  label: '50 以内' },
      { value: String(Budget.UNDER_100), label: '100 以内' },
      { value: String(Budget.UNDER_200), label: '200 以内' }
    ],
    distanceOptions: [
      { value: Distance.DOWNSTAIRS, label: '楼下' },
      { value: Distance.NEARBY,     label: '附近' },
      { value: Distance.KM_3,       label: '3 公里内' },
      { value: Distance.CITY,       label: '全城' }
    ],
    energyOptions: [
      { value: Energy.GENTLE, label: '请温柔一点' },
      { value: Energy.NORMAL, label: '普通' },
      { value: Energy.BOLD,   label: '想大胆一点' }
    ],
    // 人数用原始数值（PartySize.SOLO/DUO/GROUP），与 data.partySize 数字类型对齐；
    // 此前用 String() 包裹导致 WXML「partySize === item.value」恒为 false（1 === '1'），
    // 选中态永远不亮、点击无视觉反馈。duration/budget 仍保留 String() 是因为
    // data.duration/data.budget 初始化为空字符串，字符串===字符串匹配正常。
    partyOptions: [
      { value: PartySize.SOLO,  label: '一个人' },
      { value: PartySize.DUO,  label: '两个人' },
      { value: PartySize.GROUP, label: '多人' }
    ],
    venueOptions: [
      { value: VenueType.INDOOR,  label: '室内' },
      { value: VenueType.OUTDOOR, label: '室外' },
      { value: VenueType.ANY,     label: '都行' }
    ],

    rolling: false,
    canRoll: false,
    loadingPhrase: '',
    errorMsg: ''
  },

  onLoad() {
    const nav = app.getNavMetrics ? app.getNavMetrics() : {}
    const district = (app.globalData && app.globalData.currentCity) || 'tianhe'
    const info = microConfig.getDistrict(district)
    this.setData({
      statusBarHeight: nav.statusBarHeight || 20,
      navHeaderStyle: nav.navHeaderStyle || '',
      district: district,
      districtName: info ? info.name : '天河区',
      partySize: PartySize.SOLO,
      venue: VenueType.ANY
    })
    this.updateCanRoll()
  },

  onSelect(e) {
    const { field, value } = e.currentTarget.dataset
    const parsed = field === 'partySize' ? Number(value) : value
    this.setData({ [field]: parsed }, this.updateCanRoll.bind(this))
  },

  updateCanRoll() {
    const d = this.data
    const canRoll = !!(d.mood && d.duration && d.budget && d.distance && d.energy)
    this.setData({ canRoll })
  },

  onRoll() {
    if (!this.data.canRoll || this.data.rolling) return
    this.setData({
      rolling: true,
      errorMsg: '',
      loadingPhrase: microConfig.getLoadingPhrase()
    })
    wx.vibrateShort({ type: 'medium' })

    const d = this.data
    const loc = microConfig.getLocationByDistrict(d.district)
    const req = {
      type: DiceType.MICRO,
      mood: d.mood,
      duration: Number(d.duration),
      budget: Number(d.budget),
      distance: d.distance,
      energy: d.energy,
      partySize: d.partySize,
      venuePreference: d.venue,
      city: microConfig.DEFAULT_CITY,
      location: loc,
      district: d.district
    }

    setTimeout(() => {
      try {
        const script = microConfig.generateLocalScript(req)
        wx.setStorageSync('dice_result_script', script)
        wx.setStorageSync('dice_result_request', req)
        this.setData({ rolling: false })
        wx.navigateTo({ url: '/pages/dice-result-7d/dice-result-7d' })
      } catch (err) {
        this.setData({ rolling: false })
        wx.showToast({ title: '生成失败，请重试', icon: 'none' })
      }
    }, 1200)
  },

  onBack() {
    wx.navigateBack({ delta: 1 })
  }
})
