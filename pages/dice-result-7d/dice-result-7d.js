// pages/dice-result-7d/dice-result-7d.js
// 微逃骰子（7 维度版）- 结果页
// 展示生成的指令、POI 小地图、改条件重摇
// 纯前端本地实现，不依赖后端 / 云函数
const microConfig = require('../../utils/micro-escape-config.js')
const {
  Mood, Duration, Budget, Distance, Energy, PartySize, VenueType
} = microConfig

// 标签展示用的 label 映射
const DifficultyLabel = { 1: '轻松', 2: '稍挑战', 3: '挑战' }
const DurationLabel = {
  20: '20 分钟', 60: '1 小时', 180: '半天', 480: '一天'
}
const BudgetLabel = {
  0: '免费', 50: '50 以内', 100: '100 以内', 200: '200 以内'
}
const DistanceLabel = {
  downstairs: '楼下', nearby: '附近', '3km': '3 公里内', city: '全城'
}

// 从 script 提取 POI 地图信息
function extractPoi(script) {
  const poi = (script && script.poi) || (script && script.destination)
  if (!poi) return { hasPoi: false }
  const lat = poi.lat != null ? poi.lat : poi.latitude
  const lng = poi.lng != null ? poi.lng : poi.longitude
  const name = poi.name || (script && script.poiName) || ''
  if (!lat || !lng) return { hasPoi: false }
  return {
    hasPoi: true,
    poiName: name,
    poiLat: lat,
    poiLng: lng,
    markers: [{
      id: 1,
      latitude: lat,
      longitude: lng,
      title: name,
      width: 30,
      height: 30
    }]
  }
}

// 从 script 提取类别信息
function extractCategory(script) {
  const cat = (script && script.category) || 'sensory'
  const info = microConfig.getCategoryInfo(cat)
  return {
    categoryLabel: info.label,
    categoryColor: info.color,
    categorySoft: info.soft
  }
}

Page({
  data: {
    loading: false,
    rolling: false,
    loadingPhrase: '',
    script: null,
    errorMsg: '',

    // 标签展示
    difficultyLabel: '',
    durationLabel: '',
    budgetLabel: '',
    distanceLabel: '',

    // 类别 + 颜色
    categoryLabel: '',
    categoryColor: '',
    categorySoft: '',

    // POI 小地图
    hasPoi: false,
    poiName: '',
    poiLat: 0,
    poiLng: 0,
    markers: [],

    // 修改条件面板
    showModify: false,
    rerollCount: 0,
    selectedMap: {},
    modifyGroups: [
      {
        field: 'mood', label: '此刻的心情',
        options: [
          { value: Mood.BORED, label: '无聊' },
          { value: Mood.TIRED, label: '疲惫' },
          { value: Mood.LIVELY, label: '想热闹' },
          { value: Mood.QUIET, label: '想安静' },
          { value: Mood.CURIOUS, label: '好奇' },
          { value: Mood.MELANCHOLY, label: '低落' },
          { value: Mood.HAPPY, label: '开心' },
          { value: Mood.RESTLESS, label: '烦躁' }
        ]
      },
      {
        field: 'duration', label: '能拿出多少时间',
        options: [
          { value: String(Duration.MIN_20), label: '20 分钟' },
          { value: String(Duration.HOUR_1), label: '1 小时' },
          { value: String(Duration.HALF_DAY), label: '半天' },
          { value: String(Duration.FULL_DAY), label: '一天' }
        ]
      },
      {
        field: 'budget', label: '愿意花多少',
        options: [
          { value: String(Budget.FREE), label: '免费' },
          { value: String(Budget.UNDER_50), label: '50 以内' },
          { value: String(Budget.UNDER_100), label: '100 以内' },
          { value: String(Budget.UNDER_200), label: '200 以内' }
        ]
      },
      {
        field: 'distance', label: '能走多远',
        options: [
          { value: Distance.DOWNSTAIRS, label: '楼下' },
          { value: Distance.NEARBY, label: '附近' },
          { value: Distance.KM_3, label: '3 公里内' },
          { value: Distance.CITY, label: '全城' }
        ]
      },
      {
        field: 'energy', label: '今天的能量',
        options: [
          { value: Energy.GENTLE, label: '请温柔一点' },
          { value: Energy.NORMAL, label: '普通' },
          { value: Energy.BOLD, label: '想大胆一点' }
        ]
      },
      {
        field: 'partySize', label: '几个人',
        options: [
          { value: String(PartySize.SOLO), label: '一个人' },
          { value: String(PartySize.DUO), label: '两个人' },
          { value: String(PartySize.GROUP), label: '多人' }
        ]
      },
      {
        field: 'venue', label: '室内还是室外',
        options: [
          { value: VenueType.INDOOR, label: '室内' },
          { value: VenueType.OUTDOOR, label: '室外' },
          { value: VenueType.ANY, label: '都行' }
        ]
      }
    ],

    requestParams: null
  },

  phraseTimer: null,

  onLoad() {
    // 从 storage 读取摇骰子结果和请求参数（由 dice-micro-7d 页面写入）
    const script = wx.getStorageSync('dice_result_script')
    const requestParams = wx.getStorageSync('dice_result_request')

    if (!script) {
      this.setData({ errorMsg: '没有摇骰子结果，请返回重试' })
      return
    }

    this.setData({
      script,
      requestParams: requestParams || null,
      loading: false,
      rolling: false,
      difficultyLabel: DifficultyLabel[(script && script.difficulty)] || '',
      durationLabel: DurationLabel[(script && script.estimatedDuration)] || '',
      budgetLabel: BudgetLabel[(script && script.estimatedBudget)] || '',
      distanceLabel: DistanceLabel[(script && script.distance)] || '',
      ...extractCategory(script),
      ...extractPoi(script)
    })
  },

  onUnload() {
    if (this.phraseTimer) clearInterval(this.phraseTimer)
  },

  /** 启动加载态（文案轮播） */
  startLoading() {
    this.setData({
      loading: true,
      rolling: true,
      errorMsg: '',
      loadingPhrase: microConfig.getLoadingPhrase()
    })
    if (this.phraseTimer) clearInterval(this.phraseTimer)
    this.phraseTimer = setInterval(() => {
      this.setData({ loadingPhrase: microConfig.getLoadingPhrase() })
    }, 1800)
  },

  /** 应用新生成的 script 到 data */
  applyScript(script) {
    this.setData({
      loading: false,
      rolling: false,
      script,
      difficultyLabel: DifficultyLabel[script.difficulty] || '',
      durationLabel: DurationLabel[script.estimatedDuration] || '',
      budgetLabel: BudgetLabel[script.estimatedBudget] || '',
      distanceLabel: DistanceLabel[script.distance] || '',
      ...extractCategory(script),
      ...extractPoi(script)
    })

    if (this.phraseTimer) {
      clearInterval(this.phraseTimer)
      this.phraseTimer = null
    }

    // 更新 storage 中的 script
    wx.setStorageSync('dice_result_script', script)
    wx.vibrateShort({ type: 'light' })
  },

  /** 本地重摇生成新指令（不依赖后端） */
  generateLocalScript(params) {
    // 复用 dice-micro-7d 的逻辑（这里独立实现一份，保持页面独立）
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

    let pool = LOCAL_SCRIPTS
    if (Number(params.budget) === 0) {
      pool = pool.filter(s => s.estimatedBudget === 0)
    }
    if (params.distance === Distance.DOWNSTAIRS) {
      pool = pool.filter(s => s.distance === 'downstairs')
    }
    if (pool.length === 0) pool = LOCAL_SCRIPTS

    const script = JSON.parse(JSON.stringify(pool[Math.floor(Math.random() * pool.length)]))
    const loc = microConfig.getLocationByDistrict(params.district)
    script.poi = {
      name: script.destination.description,
      lat: loc.latitude,
      lng: loc.longitude
    }
    return script
  },

  /** 接受指令 → 跳转到执行页 */
  onAccept() {
    const { script } = this.data
    if (!script) return
    // 通过 storage 暂存 script，执行页读取
    wx.setStorageSync('pending_script', script)
    wx.redirectTo({ url: '/pages/executing/executing' })
  },

  /** 修改一个条件重新摇 */
  onShowModify() {
    if (this.data.rerollCount >= microConfig.MAX_REROLL_COUNT) {
      wx.showToast({ title: '已经改过太多次啦', icon: 'none' })
      return
    }
    const selectedMap = this.buildSelectedMap()
    this.setData({
      showModify: true,
      selectedMap
    })
  },

  /** 从 requestParams 提取每个字段当前已选的值 */
  buildSelectedMap() {
    const p = this.data.requestParams || {}
    return {
      mood: String(p.mood || ''),
      duration: String(p.duration || ''),
      budget: String(p.budget || ''),
      distance: String(p.distance || ''),
      energy: String(p.energy || ''),
      partySize: String(p.partySize || ''),
      venue: String(p.venuePreference || p.venue || '')
    }
  },

  onCloseModify() {
    this.setData({ showModify: false })
  },

  /** 点击子选项：应用具体值并重摇 */
  onTapSubOption(e) {
    const { field, value } = e.currentTarget.dataset
    this.applyModify(field, value)
  },

  /** 应用修改条件并重摇 */
  applyModify(field, value) {
    const { requestParams, rerollCount } = this.data
    if (!requestParams) return

    if (rerollCount >= microConfig.MAX_REROLL_COUNT) {
      wx.showToast({ title: '已经改过太多次啦', icon: 'none' })
      return
    }

    const newParams = JSON.parse(JSON.stringify(requestParams))

    if (field === 'mood') {
      newParams.mood = value
    } else if (field === 'duration') {
      newParams.duration = Number(value)
    } else if (field === 'budget') {
      newParams.budget = Number(value)
    } else if (field === 'distance') {
      newParams.distance = value
    } else if (field === 'energy') {
      newParams.energy = value
    } else if (field === 'partySize') {
      newParams.partySize = Number(value)
    } else if (field === 'venue') {
      newParams.venuePreference = value
    }

    this.setData({
      showModify: false,
      requestParams: newParams,
      rerollCount: rerollCount + 1,
      script: null
    })

    this.startLoading()

    const self = this
    setTimeout(() => {
      try {
        const script = self.generateLocalScript(newParams)
        self.applyScript(script)
      } catch (err) {
        self.setData({
          loading: false,
          rolling: false,
          errorMsg: '生成失败，请重试'
        })
      }
    }, 1500)
  },

  /** 暂不出逃 */
  onSkip() {
    wx.showModal({
      title: '今天先不出逃?',
      content: '这条指令不会保留。下次想出发时再来。',
      confirmText: '先不了',
      cancelText: '再想想',
      success: (res) => {
        if (res.confirm) {
          wx.navigateBack({ delta: 2 })
        }
      }
    })
  },

  /** 重试 */
  onRetry() {
    const { requestParams } = this.data
    if (!requestParams) {
      wx.navigateBack({ delta: 1 })
      return
    }
    this.startLoading()
    const self = this
    setTimeout(() => {
      try {
        const script = self.generateLocalScript(requestParams)
        self.applyScript(script)
      } catch (err) {
        self.setData({
          loading: false,
          rolling: false,
          errorMsg: '生成失败，请重试'
        })
      }
    }, 1500)
  }
})
