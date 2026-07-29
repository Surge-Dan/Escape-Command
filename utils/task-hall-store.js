// utils/task-hall-store.js
// C-P3 任务大厅数据层（demo 模式，本地存储）
//
// 职责：
//   - HallTask CRUD（出逃大师官方任务 + 用户自建任务）
//   - 搭子匹配（摇骰子 diceMatch，联动 mock-user-pool）
//   - 任务状态机：recruiting → ready → started → finished / cancelled
//   - 通过 roomId 关联 group-room-store.js（C-01~C-19 房间系统）
//
// 存储约定：
//   - wx.getStorageSync / wx.setStorageSync，无云后端
//   - 存储 key：'taskHall'，值为 HallTask 数组
//
// 风格对齐 group-room-store.js：
//   - var + function 声明，无箭头函数、无 ES6 class
//   - 错误返回 { ok: false, errCode, errMsg }
//   - 防御性编码（typeof / Array.isArray 兜底）
//   - _internal 导出供单元测试

'use strict'

var poisData = require('../data/guangzhou-pois.js')
var getPOIById = poisData.getPOIById

var districtsData = require('../data/guangzhou-districts.js')
var GUANGZHOU_DISTRICTS = districtsData.GUANGZHOU_DISTRICTS

var masterTasks = require('../data/escape-master-tasks.js')
var ESCAPE_MASTER_TEMPLATES = masterTasks.ESCAPE_MASTER_TEMPLATES

var mockPool = require('./mock-user-pool.js')
var getMockUsers = mockPool.getMockUsers

// ===== 存储键 =====
var STORAGE_KEY = 'taskHall'

// ===== 任务状态机 =====
// recruiting → ready（满员）→ started（房主开始）→ finished（完成）
// 任意状态 → cancelled（仅 recruiting/ready 可取消）
var HALL_TASK_STATUS = {
  RECRUITING: 'recruiting',
  READY: 'ready',
  STARTED: 'started',
  FINISHED: 'finished',
  CANCELLED: 'cancelled'
}

// ===== 合法取值集合 =====
// 与 escape-master-tasks.js 模板字段对齐
var VALID_CATEGORIES = ['walk', 'art', 'salon', 'coffee', 'book', 'market']

// 从 guangzhou-districts.js 派生，保证与城市数据同源
var VALID_DISTRICTS = (function () {
  var arr = []
  for (var i = 0; i < GUANGZHOU_DISTRICTS.length; i++) {
    arr.push(GUANGZHOU_DISTRICTS[i].name)
  }
  return arr
})()

var VALID_SCHEDULED_TIMES = [
  'weekday_evening',
  'weekend_morning',
  'weekend_afternoon',
  'weekend_evening',
  'anytime'
]

// 摇骰子最多匹配的搭子数上限
var MAX_PARTNERS = 4

// ===== 底层存储 =====
function loadAllTasks() {
  try {
    var list = wx.getStorageSync(STORAGE_KEY)
    return Array.isArray(list) ? list : []
  } catch (e) {
    return []
  }
}

function saveAllTasks(list) {
  try { wx.setStorageSync(STORAGE_KEY, list) } catch (e) {}
}

function findTaskIndex(list, taskId) {
  if (!Array.isArray(list)) return -1
  for (var i = 0; i < list.length; i++) {
    if (list[i] && list[i].taskId === taskId) return i
  }
  return -1
}

function touchTask(task) {
  task.updatedAt = Date.now()
}

// ===== 工具函数 =====
// 生成 hall_ 前缀 + 6 位随机字符（小写字母+数字）
function generateTaskId() {
  var chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  var s = ''
  for (var i = 0; i < 6; i++) {
    s += chars[Math.floor(Math.random() * chars.length)]
  }
  return 'hall_' + s
}

// 从 POI 实体复制快照（仅保留卡片/详情需要的字段，避免存冗余数据）
function buildPoiSnapshot(poi) {
  if (!poi || typeof poi !== 'object') return null
  return {
    name: poi.name || '',
    address: poi.address || '',
    latitude: typeof poi.latitude === 'number' ? poi.latitude : 0,
    longitude: typeof poi.longitude === 'number' ? poi.longitude : 0,
    type: poi.type || ''
  }
}

// 过滤逻辑：默认排除 cancelled/finished；支持 district/category/source/status/excludeFull
function applyFilters(tasks, filters) {
  filters = filters || {}
  var list = Array.isArray(tasks) ? tasks : []
  var result = []
  for (var i = 0; i < list.length; i++) {
    var t = list[i]
    if (!t) continue
    // status 过滤：显式指定则按指定值；未指定则默认排除 cancelled/finished
    if (filters.status) {
      if (t.status !== filters.status) continue
    } else {
      if (t.status === HALL_TASK_STATUS.CANCELLED || t.status === HALL_TASK_STATUS.FINISHED) continue
    }
    if (filters.district && t.district !== filters.district) continue
    if (filters.category && t.category !== filters.category) continue
    if (filters.source && t.source !== filters.source) continue
    if (filters.excludeFull) {
      var members = Array.isArray(t.members) ? t.members : []
      if (members.length >= t.maxMembers) continue
    }
    result.push(t)
  }
  return result
}

// 从候选任务池随机选一个（Math.random）
function pickRandomTask(tasks) {
  var list = Array.isArray(tasks) ? tasks : []
  if (list.length === 0) return null
  var idx = Math.floor(Math.random() * list.length)
  return list[idx]
}

// 计算需要匹配的搭子数 = min(maxMembers - currentMembers - 1, 4)
//   -1 是当前用户占一个名额；上限 4 防止一次性塞满大房间
function computePartnerCount(task, currentMemberCount) {
  if (!task) return 0
  var max = task.maxMembers || 0
  var current = currentMemberCount || 0
  var slots = max - current - 1
  if (slots < 0) slots = 0
  if (slots > MAX_PARTNERS) slots = MAX_PARTNERS
  return slots
}

// 任务卡片精简字段（不含 members 全量、不含 steps 全量）
function toCardSummary(task) {
  if (!task) return null
  var members = Array.isArray(task.members) ? task.members : []
  var poi = (task.poi && typeof task.poi === 'object') ? task.poi : {}
  return {
    taskId: task.taskId,
    source: task.source,
    topic: task.topic,
    category: task.category,
    district: task.district,
    poiName: poi.name || '',
    hostNickname: task.hostNickname || '',
    membersCount: members.length,
    maxMembers: task.maxMembers,
    status: task.status,
    scheduledTime: task.scheduledTime,
    tags: Array.isArray(task.tags) ? task.tags.slice() : [],
    isOfficial: task.source === 'master'
  }
}

// ===== 1. 从模板初始化出逃大师任务（幂等）=====
function initHallFromTemplates(force) {
  var list = loadAllTasks()
  var hasMaster = false
  for (var i = 0; i < list.length; i++) {
    if (list[i] && list[i].source === 'master') { hasMaster = true; break }
  }
  // 幂等：已有 master 任务且非 force，跳过
  if (hasMaster && force !== true) {
    return { ok: true, created: 0, total: list.length }
  }
  // force 模式：先清掉旧 master 任务再重建
  if (force === true) {
    var kept = []
    for (var k = 0; k < list.length; k++) {
      if (list[k] && list[k].source === 'master') continue
      kept.push(list[k])
    }
    list = kept
  }

  var now = Date.now()
  var created = 0
  for (var j = 0; j < ESCAPE_MASTER_TEMPLATES.length; j++) {
    var tpl = ESCAPE_MASTER_TEMPLATES[j]
    var poi = getPOIById(tpl.poiId)
    var task = {
      taskId: generateTaskId(),
      source: 'master',
      topic: tpl.topic,
      category: tpl.category,
      district: tpl.district,
      poi: buildPoiSnapshot(poi),
      hostOpenId: 'escape_master',
      hostNickname: '出逃大师',
      maxMembers: tpl.maxMembers,
      members: [], // 出逃大师自己是发起人，不算成员
      status: HALL_TASK_STATUS.RECRUITING,
      scheduledTime: tpl.scheduledTime,
      tags: Array.isArray(tpl.tags) ? tpl.tags.slice() : [],
      description: tpl.description || '',
      steps: Array.isArray(tpl.steps) ? tpl.steps.slice() : [],
      createdAt: now,
      updatedAt: now,
      roomId: null
    }
    list.push(task)
    created++
  }
  saveAllTasks(list)
  return { ok: true, created: created, total: list.length }
}

// ===== 2. 任务列表（精简卡片）=====
function listTasks(filters) {
  var list = loadAllTasks()
  var filtered = applyFilters(list, filters || {})
  // 按 createdAt 倒序（新任务在前）
  filtered.sort(function (a, b) {
    return (b.createdAt || 0) - (a.createdAt || 0)
  })
  var cards = []
  for (var i = 0; i < filtered.length; i++) {
    cards.push(toCardSummary(filtered[i]))
  }
  return cards
}

// ===== 3. 任务详情（完整对象）=====
function getTaskDetail(taskId) {
  if (!taskId) return { ok: false, errCode: 'INVALID_PARAM', errMsg: 'taskId 不能为空' }
  var list = loadAllTasks()
  var idx = findTaskIndex(list, taskId)
  if (idx === -1) return { ok: false, errCode: 'TASK_NOT_FOUND', errMsg: '任务不存在' }
  return { ok: true, task: list[idx] }
}

// ===== 4. 用户自建任务 =====
function createUserTask(creator, options) {
  if (!creator || typeof creator !== 'object') {
    return { ok: false, errCode: 'INVALID_PARAM', errMsg: '创建者信息不合法' }
  }
  if (!creator.openId || typeof creator.openId !== 'string') {
    return { ok: false, errCode: 'INVALID_PARAM', errMsg: '创建者 openId 不合法' }
  }
  if (!creator.nickname || typeof creator.nickname !== 'string') {
    return { ok: false, errCode: 'INVALID_PARAM', errMsg: '创建者昵称不合法' }
  }
  var opts = options || {}

  // topic：1-20 字
  if (typeof opts.topic !== 'string') {
    return { ok: false, errCode: 'INVALID_PARAM', errMsg: '主题需 1-20 字' }
  }
  var topic = opts.topic.trim()
  if (!topic || topic.length > 20) {
    return { ok: false, errCode: 'INVALID_PARAM', errMsg: '主题需 1-20 字' }
  }
  // category
  if (VALID_CATEGORIES.indexOf(opts.category) === -1) {
    return { ok: false, errCode: 'INVALID_PARAM', errMsg: '任务分类不合法' }
  }
  // district
  if (VALID_DISTRICTS.indexOf(opts.district) === -1) {
    return { ok: false, errCode: 'INVALID_PARAM', errMsg: '行政区不合法' }
  }
  // poiId 必须存在于 guangzhou-pois
  if (typeof opts.poiId !== 'string' || !opts.poiId) {
    return { ok: false, errCode: 'INVALID_PARAM', errMsg: 'POI 不合法' }
  }
  var poi = getPOIById(opts.poiId)
  if (!poi) {
    return { ok: false, errCode: 'INVALID_PARAM', errMsg: 'POI 不存在' }
  }
  // maxMembers：3-6 整数
  if (!Number.isInteger(opts.maxMembers) || opts.maxMembers < 3 || opts.maxMembers > 6) {
    return { ok: false, errCode: 'INVALID_PARAM', errMsg: '人数需 3-6 人' }
  }
  // scheduledTime
  if (VALID_SCHEDULED_TIMES.indexOf(opts.scheduledTime) === -1) {
    return { ok: false, errCode: 'INVALID_PARAM', errMsg: '时间偏好不合法' }
  }

  var now = Date.now()
  var task = {
    taskId: generateTaskId(),
    source: 'user',
    topic: topic,
    category: opts.category,
    district: opts.district,
    poi: buildPoiSnapshot(poi),
    hostOpenId: creator.openId,
    hostNickname: creator.nickname,
    maxMembers: opts.maxMembers,
    members: [{
      openId: creator.openId,
      nickname: creator.nickname,
      joinedAt: now
    }], // members[0] 即 host
    status: HALL_TASK_STATUS.RECRUITING,
    scheduledTime: opts.scheduledTime,
    tags: Array.isArray(opts.tags) ? opts.tags.slice() : [],
    description: typeof opts.description === 'string' ? opts.description : '',
    steps: [], // 用户任务默认无步骤预览
    createdAt: now,
    updatedAt: now,
    roomId: null
  }

  var list = loadAllTasks()
  list.push(task)
  saveAllTasks(list)
  return { ok: true, taskId: task.taskId }
}

// ===== 5. 加入任务 =====
function joinTask(taskId, user) {
  if (!taskId) return { ok: false, errCode: 'INVALID_PARAM', errMsg: 'taskId 不能为空' }
  if (!user || typeof user !== 'object' || !user.openId || typeof user.openId !== 'string') {
    return { ok: false, errCode: 'INVALID_PARAM', errMsg: '用户信息不合法' }
  }
  var list = loadAllTasks()
  var idx = findTaskIndex(list, taskId)
  if (idx === -1) return { ok: false, errCode: 'TASK_NOT_FOUND', errMsg: '任务不存在' }

  var task = list[idx]
  if (task.status !== HALL_TASK_STATUS.RECRUITING) {
    return { ok: false, errCode: 'TASK_NOT_RECRUITING', errMsg: '任务不在招募中' }
  }
  var members = Array.isArray(task.members) ? task.members : []
  if (members.length >= task.maxMembers) {
    return { ok: false, errCode: 'TASK_FULL', errMsg: '任务已满员' }
  }
  for (var i = 0; i < members.length; i++) {
    if (members[i].openId === user.openId) {
      return { ok: false, errCode: 'ALREADY_JOINED', errMsg: '已加入该任务' }
    }
  }

  members.push({
    openId: user.openId,
    nickname: user.nickname || '出逃者' + (members.length + 1),
    joinedAt: Date.now()
  })
  task.members = members
  // 满员自动转 ready
  if (members.length >= task.maxMembers) {
    task.status = HALL_TASK_STATUS.READY
  }
  touchTask(task)
  list[idx] = task
  saveAllTasks(list)
  return { ok: true, task: task }
}

// ===== 6. 摇骰子匹配 =====
function diceMatch(user, filters) {
  if (!user || typeof user !== 'object' || !user.openId || typeof user.openId !== 'string') {
    return { ok: false, errCode: 'INVALID_PARAM', errMsg: '用户信息不合法' }
  }
  filters = filters || {}

  // 1. 筛选未满员任务（按 filters 优先匹配）
  var list = loadAllTasks()
  var candidates = applyFilters(list, {
    district: filters.district,
    category: filters.category,
    excludeFull: true
  })
  // 排除当前用户已加入的任务
  var pool = []
  for (var i = 0; i < candidates.length; i++) {
    var t = candidates[i]
    var ms = Array.isArray(t.members) ? t.members : []
    var joined = false
    for (var m = 0; m < ms.length; m++) {
      if (ms[m].openId === user.openId) { joined = true; break }
    }
    if (!joined) pool.push(t)
  }
  if (pool.length === 0) {
    return { ok: false, errCode: 'NO_MATCH', errMsg: '暂无匹配任务，试试创建一个？' }
  }

  // 2. 随机选一个任务
  var task = pickRandomTask(pool)

  // 3. 计算需要匹配的搭子数（当前用户占 1 个名额）
  var currentMembers = Array.isArray(task.members) ? task.members : []
  var partnerCount = computePartnerCount(task, currentMembers.length)

  // 4. 从 mock-user-pool 取搭子（优先同区，排除当前用户）
  var existingOpenIds = {}
  for (var e = 0; e < currentMembers.length; e++) {
    existingOpenIds[currentMembers[e].openId] = true
  }
  existingOpenIds[user.openId] = true
  var rawPartners = partnerCount > 0
    ? getMockUsers(partnerCount, { excludeOpenId: user.openId, district: task.district })
    : []
  // 过滤掉已是成员的搭子，避免重复加入
  var partners = []
  for (var p = 0; p < rawPartners.length; p++) {
    if (!existingOpenIds[rawPartners[p].openId]) {
      partners.push(rawPartners[p])
      existingOpenIds[rawPartners[p].openId] = true
    }
  }

  // 5. 当前用户加入
  var joinResult = joinTask(task.taskId, { openId: user.openId, nickname: user.nickname })
  if (!joinResult.ok) {
    return { ok: false, errCode: joinResult.errCode, errMsg: joinResult.errMsg || '加入任务失败' }
  }
  // 6. 搭子加入（joinTask 内部会校验状态/满员/重复，失败则跳过该搭子）
  for (var j = 0; j < partners.length; j++) {
    joinTask(task.taskId, { openId: partners[j].openId, nickname: partners[j].nickname })
  }

  // 7. 重新读取任务最终状态
  var detail = getTaskDetail(task.taskId)
  var finalTask = detail.ok ? detail.task : joinResult.task
  return { ok: true, task: finalTask, partners: partners }
}

// ===== 7. 关联 group room =====
function linkRoom(taskId, roomId) {
  if (!taskId || !roomId) return { ok: false, errCode: 'INVALID_PARAM', errMsg: '参数不能为空' }
  var list = loadAllTasks()
  var idx = findTaskIndex(list, taskId)
  if (idx === -1) return { ok: false, errCode: 'TASK_NOT_FOUND', errMsg: '任务不存在' }
  var task = list[idx]
  // 仅满员（ready）可开房间
  if (task.status !== HALL_TASK_STATUS.READY) {
    return { ok: false, errCode: 'INVALID_STATUS', errMsg: '任务未满员，无法关联房间' }
  }
  task.roomId = roomId
  touchTask(task)
  list[idx] = task
  saveAllTasks(list)
  return { ok: true }
}

// ===== 8. 状态机转换 =====
function updateTaskStatus(taskId, newStatus) {
  if (!taskId || !newStatus) return { ok: false, errCode: 'INVALID_PARAM', errMsg: '参数不能为空' }
  var list = loadAllTasks()
  var idx = findTaskIndex(list, taskId)
  if (idx === -1) return { ok: false, errCode: 'TASK_NOT_FOUND', errMsg: '任务不存在' }
  var task = list[idx]
  var current = task.status

  // 同状态幂等
  if (current === newStatus) {
    return { ok: true, task: task }
  }

  var valid = false
  // recruiting → ready
  if (current === HALL_TASK_STATUS.RECRUITING && newStatus === HALL_TASK_STATUS.READY) valid = true
  // ready → started
  if (current === HALL_TASK_STATUS.READY && newStatus === HALL_TASK_STATUS.STARTED) valid = true
  // started → finished
  if (current === HALL_TASK_STATUS.STARTED && newStatus === HALL_TASK_STATUS.FINISHED) valid = true
  // cancelled：仅 recruiting/ready 可取消
  if (newStatus === HALL_TASK_STATUS.CANCELLED &&
      (current === HALL_TASK_STATUS.RECRUITING || current === HALL_TASK_STATUS.READY)) {
    valid = true
  }

  if (!valid) {
    return { ok: false, errCode: 'INVALID_STATUS', errMsg: '不允许的状态转换：' + current + ' → ' + newStatus }
  }

  task.status = newStatus
  touchTask(task)
  list[idx] = task
  saveAllTasks(list)
  return { ok: true, task: task }
}

// ===== 9. 清空存储（调试用）=====
function clearAllTasks() {
  try { wx.setStorageSync(STORAGE_KEY, []) } catch (e) {}
  return { ok: true }
}

module.exports = {
  // 常量
  HALL_TASK_STATUS: HALL_TASK_STATUS,
  VALID_CATEGORIES: VALID_CATEGORIES,
  VALID_DISTRICTS: VALID_DISTRICTS,
  VALID_SCHEDULED_TIMES: VALID_SCHEDULED_TIMES,
  // 公开 API
  initHallFromTemplates: initHallFromTemplates,
  listTasks: listTasks,
  getTaskDetail: getTaskDetail,
  createUserTask: createUserTask,
  joinTask: joinTask,
  diceMatch: diceMatch,
  linkRoom: linkRoom,
  updateTaskStatus: updateTaskStatus,
  clearAllTasks: clearAllTasks,
  // 内部导出（供测试用）
  _internal: {
    STORAGE_KEY: STORAGE_KEY,
    HALL_TASK_STATUS: HALL_TASK_STATUS,
    VALID_CATEGORIES: VALID_CATEGORIES,
    VALID_DISTRICTS: VALID_DISTRICTS,
    VALID_SCHEDULED_TIMES: VALID_SCHEDULED_TIMES,
    generateTaskId: generateTaskId,
    loadAllTasks: loadAllTasks,
    saveAllTasks: saveAllTasks,
    findTaskIndex: findTaskIndex,
    buildPoiSnapshot: buildPoiSnapshot,
    applyFilters: applyFilters,
    pickRandomTask: pickRandomTask,
    computePartnerCount: computePartnerCount,
    toCardSummary: toCardSummary
  }
}
