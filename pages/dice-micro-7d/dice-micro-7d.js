// pages/dice-micro-7d/dice-micro-7d.js
// 微逃骰子（7 维度版）- 条件选择页
// 纯前端本地实现，不依赖后端 / 云函数
// 风格对齐团队 pages/generating/generating.js：const/let + Page({ data, onLoad, 方法 })
const app = getApp()
const microConfig = require('../../utils/micro-escape-config.js')
const { Mood, Duration, Budget, Distance, Energy, PartySize, VenueType, DiceType } = microConfig

// 本地指令池（微逃骰子专属，不依赖后端）
const LOCAL_SCRIPTS = [
  {
    id: 'ms7d_001', category: 'sensory', title: '闭眼听三分钟',
    reason: '给耳朵放个假，城市的声音比想象中丰富',
    destination: { description: '最近的公园长椅或路边长椅' },
    stageOne: { instruction: '找到长椅坐下，闭眼听 3 分钟，记下 5 种声音' },
    hidden: { instruction: '把听到的声音画成一张"声音地图"' },
    completionCondition: '记录下至少 5 种不同声音',
    safetyNotes: ['注意随身物品'],
    difficulty: 1, estimatedDuration: 10, estimatedBudget: 0, distance: 'nearby'
  },
  {
    id: 'ms7d_002', category: 'walking', title: '左转左转再左转',
    reason: '用规则打破惯性，迷路是最好的向导',
    destination: { description: '任意路口' },
    stageOne: { instruction: '出门左转，每个路口都左转，走 15 分钟' },
    hidden: { instruction: '拍下你停下来的那个瞬间' },
    completionCondition: '走够 15 分钟并拍一张照片',
    safetyNotes: ['注意交通安全'],
    difficulty: 1, estimatedDuration: 15, estimatedBudget: 0, distance: 'nearby'
  },
  {
    id: 'ms7d_003', category: 'food', title: '让老板给你挑',
    reason: '把选择权交出去，会有惊喜',
    destination: { description: '最近的水果店或小吃店' },
    stageOne: { instruction: '走进去跟老板说"给我挑一个最好吃的"' },
    hidden: { instruction: '问老板今天什么卖得最好' },
    completionCondition: '买到并尝一口',
    safetyNotes: [],
    difficulty: 1, estimatedDuration: 15, estimatedBudget: 20, distance: 'downstairs'
  },
  {
    id: 'ms7d_004', category: 'observe', title: '数 5 种颜色',
    reason: '放慢脚步，颜色就在身边',
    destination: { description: '任意街道' },
    stageOne: { instruction: '走 10 分钟，找到 5 种不同颜色的东西' },
    hidden: { instruction: '把 5 种颜色按彩虹顺序排好' },
    completionCondition: '拍一张包含 5 种颜色的照片',
    safetyNotes: [],
    difficulty: 1, estimatedDuration: 15, estimatedBudget: 0, distance: 'nearby'
  },
  {
    id: 'ms7d_005', category: 'nature', title: '摸 3 种树皮',
    reason: '用手感受城市的另一面',
    destination: { description: '最近的公园或绿化带' },
    stageOne: { instruction: '找到 3 棵不同的树，闭眼摸树皮 30 秒' },
    hidden: { instruction: '给每棵树起一个名字' },
    completionCondition: '摸够 3 种树皮',
    safetyNotes: ['注意不要摸到带刺植物'],
    difficulty: 1, estimatedDuration: 20, estimatedBudget: 0, distance: '3km'
  },
  {
    id: 'ms7d_006', category: 'culture', title: '逛一家从没进过的店',
    reason: '打破日常路线，发现身边的可能',
    destination: { description: '路边任意你没进过的店' },
    stageOne: { instruction: '走进去逛 5 分钟，不一定要买' },
    hidden: { instruction: '问店主一个问题' },
    completionCondition: '逛完 5 分钟',
    safetyNotes: [],
    difficulty: 1, estimatedDuration: 15, estimatedBudget: 0, distance: 'downstairs'
  },
  {
    id: 'ms7d_007', category: 'night', title: '深夜便利店观察',
    reason: '深夜的便利店是城市的缩影',
    destination: { description: '最近的便利店' },
    stageOne: { instruction: '进去观察 10 分钟，看都有什么人' },
    hidden: { instruction: '买一样你从没买过的东西' },
    completionCondition: '观察 10 分钟',
    safetyNotes: ['注意夜间安全'],
    difficulty: 1, estimatedDuration: 15, estimatedBudget: 10, distance: 'downstairs'
  },
  {
    id: 'ms7d_008', category: 'social', title: '对陌生人微笑',
    reason: '一个小小的连接，可能改变一天',
    destination: { description: '人不太多的街道' },
    stageOne: { instruction: '对路过的人微笑点头，试 3 次' },
    hidden: { instruction: '如果有人回应，说一句"今天真好"' },
    completionCondition: '完成 3 次微笑',
    safetyNotes: ['不要打扰赶路的人'],
    difficulty: 2, estimatedDuration: 10, estimatedBudget: 0, distance: 'downstairs'
  }
]

Page({
  data: {
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
    partyOptions: [
      { value: String(PartySize.SOLO),  label: '一个人' },
      { value: String(PartySize.DUO),  label: '两个人' },
      { value: String(PartySize.GROUP), label: '多人' }
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
    const district = (app.globalData && app.globalData.currentCity) || 'tianhe'
    const info = microConfig.getDistrict(district)
    this.setData({
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

  // 本地生成指令（不依赖后端）
  generateLocalScript(params) {
    let pool = LOCAL_SCRIPTS
    // 按预算筛选
    if (Number(params.budget) === 0) {
      pool = pool.filter(s => s.estimatedBudget === 0)
    }
    // 按距离筛选
    if (params.distance === Distance.DOWNSTAIRS) {
      pool = pool.filter(s => s.distance === 'downstairs')
    }
    if (pool.length === 0) pool = LOCAL_SCRIPTS
    // 随机选一个
    const script = JSON.parse(JSON.stringify(pool[Math.floor(Math.random() * pool.length)]))
    // 注入 POI 信息（从 6 区虚拟坐标）
    const loc = microConfig.getLocationByDistrict(params.district)
    script.poi = {
      name: script.destination.description,
      lat: loc.latitude,
      lng: loc.longitude
    }
    return script
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
        const script = this.generateLocalScript(req)
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
