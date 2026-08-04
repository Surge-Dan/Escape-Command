// pages/group/hall/detail/detail.js
// C-P3 任务详情页
//
// 职责：
//   - 展示任务完整信息（主题 / POI / 成员 / 描述 / 步骤 / 标签）
//   - 招募中：加入任务 / 邀请朋友
//   - 人已齐：房主可「开始出逃」→ 创建房间 + 关联任务 + 跳转房间页
//   - 已出发 / 已完成：查看房间
//
// 数据层：utils/task-hall-store.js（getTaskDetail / joinTask / linkRoom / updateTaskStatus）
// 房间层：utils/group-room-store.js（createRoom）
// 风格对齐 pages/group/hall/hall.js（nav-header + applyNavMetrics + onBackTap + getCurrentUser）

const app = getApp()
const hallStore = require('../../../../utils/task-hall-store.js')
const roomStore = require('../../../../utils/group-room-store.js')
const trustStore = require('../../../../utils/player-trust-store.js')

// 当前用户 openId 存储 key（与 group-room-store.js / hall.js 同源）
const OPENID_KEY = 'localHostOpenId'

// 时间偏好展示文案（与 hall.js 对齐，按详情页口径补全）
const SCHEDULED_TIME_LABELS = {
  weekday_evening: '工作日晚上',
  weekend_morning: '周末上午',
  weekend_afternoon: '周末下午',
  weekend_evening: '周末晚上',
  anytime: '随时'
}

// 状态展示文案
const STATUS_LABELS = {
  recruiting: '招募中',
  ready: '人已齐',
  started: '已出发',
  finished: '已完成',
  cancelled: '已取消'
}

// 分类展示文案（与 task-hall-store VALID_CATEGORIES 对齐，custom 走 customCategory 字段）
const CATEGORY_LABELS = {
  walk: '散步',
  art: '看展',
  salon: '沙龙',
  coffee: '咖啡',
  book: '书店',
  market: '市集',
  sport: '运动',
  music: '音乐',
  photo: '摄影',
  food: '美食'
}

Page({
  data: {
    statusBarHeight: 20,
    navHeaderStyle: '',
    taskId: '',
    task: null,
    isJoined: false,      // 当前用户是否已加入
    isFull: false,        // 任务是否满员
    isHost: false,        // 当前用户是否为房主（members[0]）
    scheduledTimeLabel: '',
    statusLabel: '',
    categoryLabel: '',
    // C-P4: 成员信任标签 { [openId]: { tier, label } }
    memberTrustMap: {}
  },

  onLoad(query) {
    this.applyNavMetrics()
    const taskId = (query && query.taskId) ? query.taskId : ''
    if (!taskId) {
      wx.showToast({ title: '任务不存在', icon: 'none' })
      wx.navigateBack({ fail: () => wx.switchTab({ url: '/pages/index/index' }) })
      return
    }
    this.setData({ taskId: taskId })
    this.loadTask()
  },

  // ===== 导航栏度量（与 hall.js / create.js 一致）=====
  applyNavMetrics() {
    const nav = app.getNavMetrics ? app.getNavMetrics() : {}
    this.setData({
      statusBarHeight: nav.statusBarHeight || 20,
      navHeaderStyle: nav.navHeaderStyle || ''
    })
  },

  // ===== 加载任务详情 =====
  loadTask() {
    const taskId = this.data.taskId
    let result
    try {
      result = hallStore.getTaskDetail(taskId)
    } catch (e) {
      console.warn('[detail] getTaskDetail 异常', e)
      result = { ok: false }
    }
    if (!result || !result.ok || !result.task) {
      wx.showToast({ title: '任务不存在', icon: 'none' })
      wx.navigateBack({ fail: () => wx.switchTab({ url: '/pages/index/index' }) })
      return
    }
    const task = result.task
    const user = this.getCurrentUser()
    const members = Array.isArray(task.members) ? task.members : []
    const isJoined = members.some(function (m) { return m.openId === user.openId })
    const isFull = members.length >= (task.maxMembers || 0)
    // 房主 = members[0]；出逃大师任务 members 为空时回退到 hostOpenId
    const hostOpenId = members.length > 0 ? members[0].openId : (task.hostOpenId || '')
    const isHost = hostOpenId === user.openId

    // 自定义分类优先使用 customCategory 文案
    var catLabel = ''
    if (task.category === 'custom') {
      catLabel = task.customCategory || '自定义'
    } else {
      catLabel = CATEGORY_LABELS[task.category] || task.category || ''
    }

    this.setData({
      task: task,
      isJoined: isJoined,
      isFull: isFull,
      isHost: isHost,
      scheduledTimeLabel: SCHEDULED_TIME_LABELS[task.scheduledTime] || task.scheduledTime || '',
      statusLabel: STATUS_LABELS[task.status] || task.status || '',
      categoryLabel: catLabel,
      memberTrustMap: {}
    })
    // C-P4: 异步加载成员信任标签（不阻断页面）
    this.loadMemberTrust(members)
  },

  // C-P4: 批量查询成员信任分（mock 玩家用默认 newbie，查询失败不阻断页面）
  loadMemberTrust(members) {
    const list = Array.isArray(members) ? members : []
    const openIds = list.map(m => m && m.openId).filter(id => id && typeof id === 'string' && id.indexOf('mock_') !== 0)
    if (openIds.length === 0) {
      const map = {}
      list.forEach(m => { if (m && m.openId) map[m.openId] = { tier: 'newbie', label: '新手', score: 5.0, count: 0 } })
      this.setData({ memberTrustMap: map })
      return
    }
    const ctx = { cloudReady: !!(app.globalData && app.globalData.cloudReady) }
    try {
      trustStore.getTrustBatch(openIds, ctx).then((trusts) => {
        const map = Object.assign({}, trusts)
        list.forEach(m => {
          if (m && m.openId && !map[m.openId]) {
            map[m.openId] = { tier: 'newbie', label: '新手', score: 5.0, count: 0 }
          }
        })
        this.setData({ memberTrustMap: map })
      }).catch(() => {})
    } catch (e) {}
  },

  // ===== 返回 =====
  onBackTap() {
    wx.navigateBack({
      fail: () => wx.switchTab({ url: '/pages/index/index' })
    })
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

  // ===== 加入任务 =====
  onJoinTap() {
    const taskId = this.data.taskId
    const user = this.getCurrentUser()
    let result
    try {
      result = hallStore.joinTask(taskId, { openId: user.openId, nickname: user.nickname })
    } catch (e) {
      console.warn('[detail] joinTask 异常', e)
      wx.showToast({ title: '加入失败', icon: 'none' })
      return
    }
    if (!result || !result.ok) {
      const errCode = result && result.errCode
      let msg = '加入失败'
      if (errCode === 'ALREADY_JOINED') msg = '你已加入'
      else if (errCode === 'TASK_FULL') msg = '人已满'
      else if (errCode === 'TASK_NOT_RECRUITING') msg = '任务已停止招募'
      else if (result && result.errMsg) msg = result.errMsg
      wx.showToast({ title: msg, icon: 'none' })
      return
    }
    // 成功：满员则提示「人齐了」，否则「加入成功」
    const task = result.task
    const becameReady = task && task.status === 'ready'
    if (becameReady) {
      wx.showToast({ title: '人齐了，可以出发！', icon: 'success' })
    } else {
      wx.showToast({ title: '加入成功', icon: 'success' })
    }
    this.loadTask()
  },

  // ===== 邀请朋友（复制简短文案到剪贴板，便于分享）=====
  onInviteTap() {
    const topic = this.data.task ? this.data.task.topic : ''
    wx.setClipboardData({
      data: '出逃指令：一起来完成「' + topic + '」任务吧！',
      success: function () {
        wx.showToast({ title: '已复制，去分享给朋友', icon: 'none' })
      },
      fail: function () {
        wx.showToast({ title: '复制失败，重试', icon: 'none' })
      }
    })
  },

  // ===== 开始出逃（仅房主）=====
  onStartEscapeTap() {
    const task = this.data.task
    if (!task) return
    const user = this.getCurrentUser()
    const members = Array.isArray(task.members) ? task.members : []
    const hostOpenId = members.length > 0 ? members[0].openId : (task.hostOpenId || '')

    if (hostOpenId !== user.openId) {
      wx.showToast({ title: '只有发起人能开始出逃', icon: 'none' })
      return
    }
    if (task.status !== 'ready') {
      wx.showToast({ title: '人未齐，无法出发', icon: 'none' })
      return
    }

    // 1. 创建房间（公开，便于搭子后续加入）
    let roomResult
    try {
      roomResult = roomStore.createRoom(task.topic, task.maxMembers, { visibility: 'public' })
    } catch (e) {
      console.warn('[detail] createRoom 异常', e)
      wx.showToast({ title: '创建房间失败', icon: 'none' })
      return
    }
    if (!roomResult || !roomResult.ok || !roomResult.roomId) {
      const msg = (roomResult && roomResult.errMsg) || '创建房间失败'
      wx.showToast({ title: msg, icon: 'none' })
      return
    }
    const roomId = roomResult.roomId

    // 2. 关联房间到任务
    try {
      hallStore.linkRoom(task.taskId, roomId)
    } catch (e) {
      console.warn('[detail] linkRoom 异常', e)
    }

    // 3. 任务状态 → started
    try {
      hallStore.updateTaskStatus(task.taskId, 'started')
    } catch (e) {
      console.warn('[detail] updateTaskStatus 异常', e)
    }

    // 4. 跳转房间页
    wx.redirectTo({
      url: '/pages/group/room/room?roomId=' + roomId + '&taskId=' + task.taskId
    })
  },

  // ===== 查看房间（started / finished）=====
  onViewRoomTap() {
    const task = this.data.task
    if (!task || !task.roomId) {
      wx.showToast({ title: '房间未创建', icon: 'none' })
      return
    }
    wx.navigateTo({
      url: '/pages/group/room/room?roomId=' + task.roomId + '&taskId=' + task.taskId
    })
  }
})
