const app = getApp()
const { HOME_DICE_LIST } = require('../../utils/constants.js')

// v22: 偏好收集选项（活动类型 + 出行人数 + 时长偏好）
const ACTIVITY_OPTIONS = [
  { id: 'walk',    name: '城市漫步', icon: '🚶', color: '#D98A5C' },
  { id: 'cafe',    name: '咖啡探店', icon: '☕', color: '#A67C52' },
  { id: 'art',     name: '展览艺术', icon: '🎨', color: '#9B7BB8' },
  { id: 'food',    name: '美食寻味', icon: '🍜', color: '#E07A5F' },
  { id: 'park',    name: '公园自然', icon: '🌳', color: '#7BAE7F' },
  { id: 'culture', name: '文化古迹', icon: '🏛', color: '#5CBF9E' },
  { id: 'book',    name: '书店阅读', icon: '📚', color: '#5B8FB9' },
  { id: 'night',   name: '夜景夜游', icon: '🌃', color: '#9B8EC4' }
]

const PEOPLE_OPTIONS = [
  { id: 1, name: '1 人', desc: '独自探索' },
  { id: 2, name: '2 人', desc: '朋友/情侣' },
  { id: 3, name: '3-4 人', desc: '小聚' },
  { id: 5, name: '5+ 人', desc: '组团出逃' }
]

const DURATION_OPTIONS = [
  { id: 15,  name: '15 分钟内', desc: '碎片时间' },
  { id: 30,  name: '半小时左右', desc: '短出逃' },
  { id: 60,  name: '1-2 小时',  desc: '深度游' },
  { id: 180, name: '半日以上',  desc: '全天漫游' }
]

Page({
  data: {
    statusBarHeight: 20,
    ready: false,
    current: 0,
    modeList: HOME_DICE_LIST,
    navHeaderStyle: '',
    // v22: 模式介绍弹窗状态
    modeDetailVisible: false,
    currentModeDetail: null,
    // v22: 偏好收集（活动类型 / 人数 / 时长）
    activityOptions: ACTIVITY_OPTIONS,
    peopleOptions: PEOPLE_OPTIONS,
    durationOptions: DURATION_OPTIONS,
    selectedActivities: [],
    selectedActivityMap: {},
    selectedPeople: null,
    selectedDuration: null,
    prefStep: 1
  },

  onLoad() {
    const sys = app.globalData.systemInfo || wx.getSystemInfoSync()
    const nav = app.getNavMetrics ? app.getNavMetrics() : {}
    this.setData({
      statusBarHeight: (sys && sys.statusBarHeight) || 20,
      ready: true,
      modeList: HOME_DICE_LIST,
      navHeaderStyle: nav.navHeaderStyle || '',
      // v24: 显式重置偏好为未选状态，确保每次进入引导页都从空白开始
      // （防止 previous session 的状态污染或 localStorage 残留干扰）
      selectedActivities: [],
      selectedActivityMap: {},
      selectedPeople: null,
      selectedDuration: null,
      prefStep: 1
    })
  },

  onShow() {
    // v24: 兜底重置，确保从其他页面返回时偏好回到未选状态
    // （避免 onLoad 未触发时仍残留勾选状态）
    if (this.data.ready && this.data.prefStep === 1 && (!this.data.selectedActivities || this.data.selectedActivities.length === 0)) {
      this.setData({
        selectedActivities: []
      })
    }
  },

  // v3: swiper 切换
  swiperChange(e) {
    this.setData({ current: e.detail.current })
  },

  // v3: 进入下一屏
  goNext() {
    const next = Math.min(3, this.data.current + 1)
    this.setData({ current: next })
  },

  // v7: 跳过 onboarding —— 直接写入 localStorage + globalData 并跳到首页
  skipOnboarding() {
    this.finishOnboarding()
  },

  // v7: 统一收尾方法
  finishOnboarding() {
    try {
      app.saveToLocal('onboarded', true)
      app.saveToLocal('privacyAgreed', true)
      app.globalData.onboarded = true
      app.globalData.privacyAgreed = true
    } catch (e) { console.warn('[onboarding] saveToLocal failed', e) }
    wx.reLaunch({ url: '/pages/index/index' })
  },

  // 隐私授权同意 —— 触发定位授权后完成引导
  onAgreePrivacy() {
    // 先尝试获取定位授权（用户可拒绝，不阻塞引导完成）
    wx.getLocation({
      type: 'gcj02',
      success: (res) => {
        try {
          app.saveToLocal('userLocation', {
            latitude: res.latitude,
            longitude: res.longitude
          })
          app.globalData.location = {
            latitude: res.latitude,
            longitude: res.longitude
          }
        } catch (e) {}
        this.finishOnboarding()
      },
      fail: () => {
        // 用户拒绝定位授权，仍然完成引导（定位非必须）
        this.finishOnboarding()
      }
    })
  },

  // v3: 完成引导，进入首页
  startEscape() {
    this.finishOnboarding()
  },

  // v8: 中间卡片点击 —— 完成 onboarding 并跳到首页
  onMockCardTap() {
    this.finishOnboarding()
  },

  // v22: 模式卡片点击 —— 弹出模式介绍弹窗（而不是直接跳转）
  onModeCardTap(e) {
    const modeId = (e && e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.modeId) || ''
    if (!modeId) return
    const mode = (this.data.modeList || []).find(m => m.id === modeId)
    if (!mode) return
    this.setData({
      modeDetailVisible: true,
      currentModeDetail: mode
    })
  },

  // v22: 关闭模式介绍弹窗
  onModeDetailClose() {
    this.setData({
      modeDetailVisible: false,
      currentModeDetail: null
    })
  },

  // v22: 弹窗内「试试这个模式」按钮 —— 记录偏好并完成 onboarding
  onModeDetailConfirm() {
    const mode = this.data.currentModeDetail
    if (mode && mode.id) {
      try {
        app.saveToLocal('preferredMode', mode.id)
        app.globalData.preferredMode = mode.id
      } catch (err) { console.warn('[onboarding] save preferredMode failed', err) }
    }
    this.setData({
      modeDetailVisible: false,
      currentModeDetail: null
    })
    this.finishOnboarding()
  },

  _buildSelectedMap(ids) {
    const map = {}
    ;(ids || []).forEach(id => { map[id] = true })
    return map
  },

  // v22: 偏好收集 —— 活动类型多选（v23 增强：容错 + 调试日志）
  onToggleActivity(e) {
    const id = (e && e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.id) || ''
    if (!id) {
      console.warn('[onboarding] onToggleActivity: 缺少 data-id', e)
      return
    }
    const cur = this.data.selectedActivities || []
    const idx = cur.indexOf(id)
    const next = idx === -1 ? [...cur, id] : cur.filter(x => x !== id)
    this.setData({ selectedActivities: next, selectedActivityMap: this._buildSelectedMap(next) })
    console.log('[onboarding] 活动类型切换:', id, '→ 当前已选:', next)
  },

  // v22: 偏好收集 —— 人数单选（v23 增强：兼容字符串/数字 ID）
  onSelectPeople(e) {
    const id = (e && e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.id)
    if (id == null || id === '') {
      console.warn('[onboarding] onSelectPeople: 缺少 data-id', e)
      return
    }
    this.setData({ selectedPeople: Number(id) })
    console.log('[onboarding] 人数选择:', id)
  },

  // v22: 偏好收集 —— 时长单选（v23 增强：兼容字符串/数字 ID）
  onSelectDuration(e) {
    const id = (e && e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.id)
    if (id == null || id === '') {
      console.warn('[onboarding] onSelectDuration: 缺少 data-id', e)
      return
    }
    this.setData({ selectedDuration: Number(id) })
    console.log('[onboarding] 时长选择:', id)
  },

  // v22: 偏好收集 —— 进入下一步
  onPrefNext() {
    const step = this.data.prefStep || 1
    if (step === 1 && (this.data.selectedActivities || []).length === 0) {
      wx.showToast({ title: '至少选 1 个活动类型', icon: 'none' })
      return
    }
    if (step === 2 && (this.data.selectedPeople == null || this.data.selectedPeople === '')) {
      wx.showToast({ title: '请选择出行人数', icon: 'none' })
      return
    }
    if (step === 3 && (this.data.selectedDuration == null || this.data.selectedDuration === '')) {
      wx.showToast({ title: '请选择时长偏好', icon: 'none' })
      return
    }
    if (step >= 3) {
      this.savePreferences()
      this.goNext()
      return
    }
    this.setData({ prefStep: step + 1 })
  },

  // v22: 偏好收集 —— 上一步
  onPrefPrev() {
    const step = this.data.prefStep || 1
    if (step > 1) {
      this.setData({ prefStep: step - 1 })
    }
  },

  // v22: 保存偏好到本地 + globalData
  savePreferences() {
    const prefs = {
      activities: this.data.selectedActivities || [],
      people: this.data.selectedPeople || 1,
      duration: this.data.selectedDuration || 30,
      collectedAt: Date.now()
    }
    try {
      app.saveToLocal('userPreferences', prefs)
      app.globalData.userPreferences = prefs
    } catch (e) { console.warn('[onboarding] save preferences failed', e) }
  },

  // v22: 阻止弹窗内容点击冒泡到遮罩
  noop() {},

  onShareAppMessage() {
    return {
      title: '出逃指令 · 摇一下，给周末一个出口',
      path: '/pages/index/index'
    }
  }
})
