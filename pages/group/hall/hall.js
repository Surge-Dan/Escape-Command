// pages/group/hall/hall.js
// C-P3 任务大厅主页
//
// 职责：
//   - 展示出逃大师官方任务 + 用户自建任务卡片列表
//   - 提供区域 / 主题筛选（Tag 行）
//   - 入口：创建任务 / 摇骰子匹配搭子
//   - 摇骰子匹配成功后弹窗展示任务 + 搭子，"出发" 进入房间
//
// 数据层：utils/task-hall-store.js（本地存储 demo）
// 风格对齐 pages/group/create/create.js（nav-header + applyNavMetrics + onBackTap）

const app = getApp()
const hallStore = require('../../../utils/task-hall-store.js')
const roomStore = require('../../../utils/group-room-store.js')
const districtsData = require('../../../data/guangzhou-districts.js')
const poisData = require('../../../data/guangzhou-pois.js')

// 当前用户 openId 存储 key（与 group-room-store.js 同源）
const OPENID_KEY = 'localHostOpenId'

// 任务时间偏好展示文案
const SCHEDULED_TIME_LABELS = {
  weekday_evening: '工作日晚',
  weekend_morning: '周末上午',
  weekend_afternoon: '周末下午',
  weekend_evening: '周末晚',
  anytime: '时间不限'
}

// 6 主题顺序（与 POI_TYPES 对齐）
const CATEGORY_ORDER = ['art', 'cafe', 'book', 'park', 'market', 'salon']

Page({
  data: {
    statusBarHeight: 20,
    navHeaderStyle: '',
    tasks: [],
    districts: [],          // [{alias, name}]，首项为"全部"
    categories: [],         // [{key, label}]，首项为"全部"
    selectedDistrict: '',   // 空字符串 = 不筛选
    selectedCategory: '',   // 空字符串 = 不筛选
    // 骰子动画弹窗
    showDice: false,
    diceAnimating: false,
    dicing: false,           // 防止重复点击
    // 匹配结果弹窗
    matchResult: null,
    scheduledTimeLabels: SCHEDULED_TIME_LABELS
  },

  onLoad() {
    this.applyNavMetrics()
    this.prepareFilters()
    // 幂等：每次进入都调用，确保出逃大师任务就位
    try { hallStore.initHallFromTemplates() } catch (e) {
      console.warn('[hall] initHallFromTemplates 失败', e)
    }
    this.loadTasks()
  },

  // ===== 导航栏度量（与 create.js 一致）=====
  applyNavMetrics() {
    const nav = app.getNavMetrics ? app.getNavMetrics() : {}
    this.setData({
      statusBarHeight: nav.statusBarHeight || 20,
      navHeaderStyle: nav.navHeaderStyle || ''
    })
  },

  // ===== 筛选 Tag 数据准备 =====
  prepareFilters() {
    // 区域 Tag：全部 + 6 区
    const districtTags = [{ alias: '全部', name: '' }]
    const dlist = districtsData.GUANGZHOU_DISTRICTS || []
    for (let i = 0; i < dlist.length; i++) {
      districtTags.push({ alias: dlist[i].alias, name: dlist[i].name })
    }
    // 主题 Tag：全部 + 6 主题（从 POI_TYPES 取 label）
    const categoryTags = [{ key: '', label: '全部' }]
    const types = poisData.POI_TYPES || {}
    for (let i = 0; i < CATEGORY_ORDER.length; i++) {
      const t = types[CATEGORY_ORDER[i]]
      if (t && t.label) categoryTags.push({ key: CATEGORY_ORDER[i], label: t.label })
    }
    this.setData({ districts: districtTags, categories: categoryTags })
  },

  // ===== 任务列表加载（带筛选）=====
  loadTasks() {
    const filters = {}
    if (this.data.selectedDistrict) filters.district = this.data.selectedDistrict
    if (this.data.selectedCategory) filters.category = this.data.selectedCategory
    let tasks = []
    try {
      tasks = hallStore.listTasks(filters) || []
    } catch (e) {
      console.warn('[hall] listTasks 失败', e)
      tasks = []
    }
    this.setData({ tasks: tasks })
  },

  // ===== 导航 =====
  onBackTap() {
    wx.navigateBack({
      fail: () => wx.switchTab({ url: '/pages/index/index' })
    })
  },

  // ===== 筛选交互 =====
  onDistrictTap(e) {
    const name = e.currentTarget.dataset.name || ''
    this.setData({ selectedDistrict: name })
    this.loadTasks()
  },

  onCategoryTap(e) {
    const key = e.currentTarget.dataset.key || ''
    this.setData({ selectedCategory: key })
    this.loadTasks()
  },

  // ===== 任务卡片点击 → 详情页 =====
  onTaskTap(e) {
    const taskId = e.currentTarget.dataset.taskid
    if (!taskId) return
    wx.navigateTo({
      url: '/pages/group/hall/detail/detail?taskId=' + taskId
    })
  },

  // ===== 创建任务入口 =====
  onCreateTap() {
    wx.navigateTo({
      url: '/pages/group/hall/create-task/create-task'
    })
  },

  onEmptyCreateTap() {
    this.onCreateTap()
  },

  // ===== 摇骰子找搭子 =====
  onDiceTap() {
    if (this.data.dicing) return
    this.setData({ showDice: true, diceAnimating: true, dicing: true })
    // 800ms 旋转动画后执行匹配
    setTimeout(() => {
      this.runDiceMatch()
    }, 800)
  },

  runDiceMatch() {
    const user = this.getCurrentUser()
    const filters = {}
    if (this.data.selectedDistrict) filters.district = this.data.selectedDistrict
    if (this.data.selectedCategory) filters.category = this.data.selectedCategory

    let result = null
    try {
      result = hallStore.diceMatch(user, filters)
    } catch (e) {
      console.warn('[hall] diceMatch 异常', e)
      result = { ok: false, errCode: 'NO_MATCH', errMsg: '匹配失败，重试' }
    }

    this.setData({ diceAnimating: false })

    if (result && result.ok && result.task) {
      const partners = Array.isArray(result.partners) ? result.partners : []
      const members = Array.isArray(result.task.members) ? result.task.members : []
      let roomId = result.task.roomId || ''
      // C-P3 联动：满员（ready）且尚未关联房间 → 自动创建房间并关联
      if (result.task.status === 'ready' && !roomId) {
        try {
          const roomResult = roomStore.createRoom(result.task.topic, result.task.maxMembers, { visibility: 'public' })
          if (roomResult && roomResult.ok && roomResult.roomId) {
            roomId = roomResult.roomId
            try { hallStore.linkRoom(result.task.taskId, roomId) } catch (e) {
              console.warn('[hall] linkRoom 异常', e)
            }
          }
        } catch (e) {
          console.warn('[hall] createRoom 异常', e)
        }
      }
      const matchResult = {
        taskId: result.task.taskId,
        roomId: roomId,
        topic: result.task.topic,
        poiName: (result.task.poi && result.task.poi.name) || '',
        district: result.task.district,
        partners: partners,
        membersCount: members.length,
        maxMembers: result.task.maxMembers
      }
      // 关掉骰子弹窗，展示匹配结果
      this.setData({ matchResult: matchResult, showDice: false })
    } else {
      const errCode = result && result.errCode
      const msg = errCode === 'NO_MATCH'
        ? '暂无匹配任务，试试创建一个？'
        : (result && result.errMsg) || '匹配失败，重试'
      this.setData({ showDice: false, dicing: false })
      wx.showToast({ title: msg, icon: 'none' })
    }
  },

  // 获取当前用户 openId + 昵称
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

  // 骰子弹窗遮罩点击（动画中不响应）
  onDiceMaskTap() {
    if (this.data.diceAnimating) return
  },

  // ===== 匹配结果弹窗 =====
  onMatchClose() {
    this.setData({ matchResult: null, dicing: false })
  },

  onMatchGoTap() {
    const r = this.data.matchResult
    if (!r) return
    this.setData({ matchResult: null, dicing: false })
    // C-P3 联动：满员（有 roomId）→ 进房间；仍在招募 → 进详情页等更多人
    if (r.roomId) {
      wx.navigateTo({
        url: '/pages/group/room/room?roomId=' + r.roomId + '&taskId=' + r.taskId
      })
    } else {
      wx.navigateTo({
        url: '/pages/group/hall/detail/detail?taskId=' + r.taskId
      })
    }
  }
})
