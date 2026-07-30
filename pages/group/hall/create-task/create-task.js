// pages/group/hall/create-task/create-task.js
// C-P3 任务大厅 - 创建出逃任务页
//
// 职责：
//   - 表单：同频主题 / 区域 / POI / 主题分类 / 人数上限 / 时间偏好 / 任务描述
//   - 调用 task-hall-store.createUserTask(creator, options) 创建用户任务
//   - 发布成功后 redirectTo 回任务大厅
//
// 风格对齐：
//   - pages/group/create/create.js（nav-header + applyNavMetrics + 自定义 picker）
//   - pages/group/hall/hall.js（getCurrentUser + onBackTap + Tag 数据准备）

const app = getApp()
const hallStore = require('../../../../utils/task-hall-store.js')
const districtsData = require('../../../../data/guangzhou-districts.js')
const poisData = require('../../../../data/guangzhou-pois.js')

// 当前用户 openId 存储 key（与 hall.js / group-room-store.js 同源）
const OPENID_KEY = 'localHostOpenId'

// 主题分类（与 task-hall-store.js VALID_CATEGORIES 对齐，custom 走自定义入口）
// 注意：POI_TYPES 的 'park' 在分类上对应 'walk'（散步），'cafe' 对应 'coffee'
const CATEGORY_DEFS = [
  { key: 'walk',   label: '散步', poiType: 'park' },
  { key: 'art',    label: '看展', poiType: 'art' },
  { key: 'salon',  label: '沙龙', poiType: 'salon' },
  { key: 'coffee', label: '咖啡', poiType: 'cafe' },
  { key: 'book',   label: '书店', poiType: 'book' },
  { key: 'market', label: '市集', poiType: 'market' },
  { key: 'sport',  label: '运动', poiType: 'sport' },
  { key: 'music',  label: '音乐', poiType: 'music' },
  { key: 'photo',  label: '摄影', poiType: 'photo' },
  { key: 'food',   label: '美食', poiType: 'food' }
]

// 自定义分类长度上限（与 task-hall-store.js CUSTOM_CATEGORY_MAX_LEN 对齐）
const CUSTOM_CATEGORY_MAX_LEN = 6

// 时间偏好 Tag
const TIME_OPTIONS = [
  { key: 'weekday_evening',    label: '工作日晚上' },
  { key: 'weekend_morning',    label: '周末上午' },
  { key: 'weekend_afternoon',  label: '周末下午' },
  { key: 'weekend_evening',    label: '周末晚上' },
  { key: 'anytime',            label: '随时' }
]

// POI 类型 → 中文标签（用于 POI 卡片角标显示）
function buildPoiTypeLabelMap() {
  const map = {}
  const types = poisData.POI_TYPES || {}
  Object.keys(types).forEach(function (k) {
    map[k] = types[k].label || k
  })
  // 分类映射：park 的展示标签补丁（任务分类叫散步，但 POI 类型叫公园）
  // POI 卡片上展示 POI 自身类型即可，无需转换
  return map
}

Page({
  data: {
    statusBarHeight: 20,
    navHeaderStyle: '',

    // 表单字段
    topic: '',
    selectedDistrict: '',     // 区名（如 '天河区'）
    selectedCategory: '',     // walk/art/salon/coffee/book/market/sport/music/photo/food/custom
    customCategory: '',       // 自定义分类文案（category === 'custom' 时有值，1-6 字）
    selectedPoiId: '',
    poiOptions: [],           // 当前区域下的 POI 列表
    maxMembers: 4,
    scheduledTime: 'weekend_afternoon',
    description: '',

    // 选项数据
    districts: [],            // [{name, alias}]
    categories: CATEGORY_DEFS,
    timeOptions: TIME_OPTIONS,
    poiTypeLabels: {},

    // 人数 picker（复用 create.js 的自定义底部弹层）
    memberOptions: [
      { value: 3, label: '3 人', desc: '含发起人，适合小团体' },
      { value: 4, label: '4 人', desc: '含发起人，轻松组局' },
      { value: 5, label: '5 人', desc: '含发起人，热闹氛围' },
      { value: 6, label: '6 人', desc: '含发起人，多人派对' }
    ],
    showPicker: false,
    tempMembers: 4,

    // 自定义分类弹层
    showCustomCategory: false,
    tempCustomCategory: '',
    customCategoryMaxLen: CUSTOM_CATEGORY_MAX_LEN,

    creating: false
  },

  onLoad() {
    this.applyNavMetrics()
    this.prepareDistricts()
    this.setData({ poiTypeLabels: buildPoiTypeLabelMap() })
  },

  // ===== 导航栏度量（与 create.js / hall.js 一致）=====
  applyNavMetrics() {
    const nav = app.getNavMetrics ? app.getNavMetrics() : {}
    this.setData({
      statusBarHeight: nav.statusBarHeight || 20,
      navHeaderStyle: nav.navHeaderStyle || ''
    })
  },

  // ===== 区域 Tag 数据准备（不带"全部"）=====
  prepareDistricts() {
    const list = districtsData.GUANGZHOU_DISTRICTS || []
    const arr = []
    for (let i = 0; i < list.length; i++) {
      arr.push({ name: list[i].name, alias: list[i].alias })
    }
    this.setData({ districts: arr })
  },

  // ===== 文本输入 =====
  onTopicInput(e) {
    this.setData({ topic: e.detail.value || '' })
  },

  onDescriptionInput(e) {
    this.setData({ description: e.detail.value || '' })
  },

  // ===== Tag 交互 =====
  onDistrictTagTap(e) {
    const name = e.currentTarget.dataset.name || ''
    if (!name) return
    // 切换区域时清空已选 POI，重新加载 POI 列表
    let poiOptions = []
    try {
      poiOptions = poisData.getPOIsByDistrict(name) || []
    } catch (err) {
      console.warn('[create-task] getPOIsByDistrict 失败', err)
      poiOptions = []
    }
    this.setData({
      selectedDistrict: name,
      selectedPoiId: '',
      poiOptions: poiOptions
    })
  },

  onCategoryTagTap(e) {
    const key = e.currentTarget.dataset.key || ''
    if (!key) return
    // 选择预定义分类时清空自定义分类文案
    this.setData({ selectedCategory: key, customCategory: '' })
  },

  // ===== 自定义分类入口 =====
  onCustomCategoryTap() {
    this.setData({
      showCustomCategory: true,
      tempCustomCategory: this.data.customCategory || ''
    })
  },

  onCustomCategoryClose() {
    this.setData({ showCustomCategory: false })
  },

  // 阻止弹层内部点击冒泡到 mask（必须有方法体，否则子树 bindtap 失效）
  onCustomCategoryPanelTap() {},

  onCustomCategoryInput(e) {
    this.setData({ tempCustomCategory: e.detail.value || '' })
  },

  onCustomCategoryConfirm() {
    const val = (this.data.tempCustomCategory || '').trim()
    if (!val || val.length > CUSTOM_CATEGORY_MAX_LEN) {
      wx.showToast({ title: '自定义分类需 1-6 字', icon: 'none' })
      return
    }
    this.setData({
      customCategory: val,
      selectedCategory: 'custom',
      showCustomCategory: false
    })
  },

  // 清除已选自定义分类（点击自定义 tag 上的 ✕）
  onCustomCategoryClear() {
    this.setData({ selectedCategory: '', customCategory: '' })
  },

  onPoiTap(e) {
    const id = e.currentTarget.dataset.id || ''
    if (!id) return
    this.setData({ selectedPoiId: id })
  },

  onTimeTagTap(e) {
    const key = e.currentTarget.dataset.key || ''
    if (!key) return
    this.setData({ scheduledTime: key })
  },

  // ===== 人数 picker（复用 create.js 模式）=====
  onPickerTap() {
    this.setData({
      showPicker: true,
      tempMembers: this.data.maxMembers
    })
  },

  onPickerClose() {
    this.setData({ showPicker: false })
  },

  // 阻止 picker-panel 内点击冒泡到 mask（空处理函数会导致子树 bindtap 失效，必须有方法体）
  onPickerPanelTap() {},

  onPickerOptionTap(e) {
    const value = Number(e.currentTarget.dataset.value)
    if (!value) return
    this.setData({ tempMembers: value })
  },

  onPickerConfirm() {
    this.setData({
      maxMembers: this.data.tempMembers,
      showPicker: false
    })
  },

  // ===== 返回 =====
  onBackTap() {
    wx.navigateBack({
      fail: () => wx.switchTab({ url: '/pages/index/index' })
    })
  },

  // ===== 发布 =====
  onPublishTap() {
    if (this.data.creating) return

    const topic = (this.data.topic || '').trim()
    const selectedDistrict = this.data.selectedDistrict
    const selectedCategory = this.data.selectedCategory
    const selectedPoiId = this.data.selectedPoiId
    const maxMembers = this.data.maxMembers
    const scheduledTime = this.data.scheduledTime
    const description = (this.data.description || '').trim()

    // 表单校验
    if (!topic || topic.length > 20) {
      wx.showToast({ title: '请填写 1-20 字主题', icon: 'none' })
      return
    }
    if (!selectedDistrict) {
      wx.showToast({ title: '请选择区域', icon: 'none' })
      return
    }
    if (!selectedCategory) {
      wx.showToast({ title: '请选择主题分类', icon: 'none' })
      return
    }
    // 自定义分类需 1-6 字
    if (selectedCategory === 'custom') {
      const cc = (this.data.customCategory || '').trim()
      if (!cc || cc.length > CUSTOM_CATEGORY_MAX_LEN) {
        wx.showToast({ title: '自定义分类需 1-6 字', icon: 'none' })
        return
      }
    }
    if (!selectedPoiId) {
      wx.showToast({ title: '请选择出逃地点', icon: 'none' })
      return
    }
    if (!maxMembers || maxMembers < 3 || maxMembers > 6) {
      wx.showToast({ title: '3-6 人组局', icon: 'none' })
      return
    }
    if (!scheduledTime) {
      wx.showToast({ title: '请选择时间偏好', icon: 'none' })
      return
    }

    // 取分类标签作为 tag（自定义分类用 customCategory 文案）
    let categoryLabel = ''
    if (selectedCategory === 'custom') {
      categoryLabel = (this.data.customCategory || '').trim()
    } else {
      for (let i = 0; i < CATEGORY_DEFS.length; i++) {
        if (CATEGORY_DEFS[i].key === selectedCategory) {
          categoryLabel = CATEGORY_DEFS[i].label
          break
        }
      }
    }

    this.setData({ creating: true })

    const user = this.getCurrentUser()
    let result = null
    try {
      result = hallStore.createUserTask(
        { openId: user.openId, nickname: user.nickname },
        {
          topic: topic,
          category: selectedCategory,
          customCategory: selectedCategory === 'custom' ? (this.data.customCategory || '').trim() : '',
          district: selectedDistrict,
          poiId: selectedPoiId,
          maxMembers: maxMembers,
          scheduledTime: scheduledTime,
          description: description,
          tags: categoryLabel ? [categoryLabel] : []
        }
      )
    } catch (err) {
      console.error('[create-task] createUserTask 异常', err)
      result = { ok: false, errCode: 'DB_ERROR', errMsg: '发布失败，重试' }
    }

    // 模拟轻微延迟让 loading 可见（本地存储是同步的）
    setTimeout(() => {
      if (result && result.ok) {
        wx.showToast({ title: '发布成功', icon: 'success' })
        setTimeout(() => {
          wx.redirectTo({ url: '/pages/group/hall/hall' })
        }, 600)
      } else {
        this.setData({ creating: false })
        const msg = this.mapErrMsg(result && result.errCode, result && result.errMsg)
        wx.showToast({ title: msg, icon: 'none' })
      }
    }, 400)
  },

  // 获取当前用户 openId + 昵称（与 hall.js 同源）
  getCurrentUser() {
    let openId = ''
    try { openId = wx.getStorageSync(OPENID_KEY) || '' } catch (e) {}
    if (!openId) {
      openId = 'local_' + Date.now() + '_' + Math.floor(Math.random() * 100000)
      try { wx.setStorageSync(OPENID_KEY, openId) } catch (e) {}
    }
    let nickname = ''
    try { nickname = (app.globalData && app.globalData.escapeName) || '' } catch (e) {}
    if (!nickname) nickname = '出逃者' + Math.floor(Math.random() * 1000)
    return { openId: openId, nickname: nickname }
  },

  mapErrMsg(errCode, errMsg) {
    if (errMsg) return errMsg
    switch (errCode) {
      case 'INVALID_PARAM':   return '请补全必填项'
      case 'TASK_NOT_FOUND':  return '任务不存在'
      case 'DB_ERROR':        return '发布失败，重试'
      default:                return '发布失败，重试'
    }
  }
})
