// pages/dice-result-7d/dice-result-7d.js
// 微逃骰子（7 维度版）- 结果页
// 展示生成的指令、POI 小地图、改条件重摇
// 纯前端本地实现，不依赖后端 / 云函数
// 指令池与生成逻辑统一由 utils/micro-escape-config.js 提供（去重，单一数据源）
const app = getApp()
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
    // 顶部 nav-header 安全区（避开右上角胶囊按钮）
    statusBarHeight: 20,
    navHeaderStyle: '',
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
    // 顶部 nav-header 安全区：与 dice-micro-7d / index 保持统一顶部规范
    const nav = app.getNavMetrics ? app.getNavMetrics() : {}
    // 从 storage 读取摇骰子结果和请求参数（由 dice-micro-7d 页面写入）
    const script = wx.getStorageSync('dice_result_script')
    const requestParams = wx.getStorageSync('dice_result_request')

    if (!script) {
      this.setData({
        statusBarHeight: nav.statusBarHeight || 20,
        navHeaderStyle: nav.navHeaderStyle || '',
        errorMsg: '没有摇骰子结果，请返回重试'
      })
      return
    }

    this.setData({
      statusBarHeight: nav.statusBarHeight || 20,
      navHeaderStyle: nav.navHeaderStyle || '',
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

  /** 接受指令 → 转成 executing 能消费的 currentCommand，跳转执行页 */
  onAccept() {
    const { script } = this.data
    if (!script) return
    // 将 7D script 转换为 executing.onLoad 期望的 currentCommand 结构
    const cmd = microConfig.buildExecutableCommand(script)
    if (!cmd) {
      wx.showToast({ title: '指令异常，请重摇', icon: 'none' })
      return
    }
    // 统一走 app.startCommand：它会 normalizeCommand + 注入 startTime + 落盘。
    // 此前直接赋值 currentCommand 缺 startTime，导致 executing 的 tickTimer
    // 计算 (Date.now() - undefined) = NaN → 分钟数显示 null。
    app.startCommand(cmd)
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
        const script = microConfig.generateLocalScript(newParams)
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
        const script = microConfig.generateLocalScript(requestParams)
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
