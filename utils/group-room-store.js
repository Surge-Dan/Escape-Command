// utils/group-room-store.js
// group-create-01 ~ group-08: 本地存储版本的房间数据层（demo 模式）
//
// 支持 C-01 创建/取消, C-02 成员加入, C-03 成员列表,
// C-04 匿名偏好, C-05/06/07 投票, C-08 多人剧本生成

const STORAGE_KEY = 'groupRooms'
const OPENID_KEY = 'localHostOpenId'

// ===== 房间状态机 =====
const ROOM_STATUS = {
  WAITING: 'waiting_members',    // 等待成员加入
  READY: 'ready',                // C-09: 人已到齐，等待房主开始投票
  VOTING: 'voting',              // 投票中
  GENERATING: 'generating',      // 剧本生成中
  FINISHED: 'finished'           // 剧本已生成
}

// C-11: 人数不足兜底常量（demo 友好，允许 2 人小队）
const MIN_MEMBERS = 2

// ===== 投票选项定义 =====
const VOTE_OPTIONS = {
  time: [
    { value: 'morning', label: '上午', icon: '☀️' },
    { value: 'afternoon', label: '下午', icon: '🌤' },
    { value: 'evening', label: '晚上', icon: '🌙' }
  ],
  budget: [
    { value: 'low', label: '省钱', desc: '0-50元' },
    { value: 'medium', label: '适中', desc: '50-200元' },
    { value: 'high', label: '任性', desc: '200元+' }
  ],
  style: [
    { value: 'relax', label: '放松', desc: '咖啡 闲逛 发呆' },
    { value: 'adventure', label: '探索', desc: '探店 打卡 冒险' },
    { value: 'social', label: '社交', desc: '聚餐 桌游 聊天' }
  ]
}

// ===== 偏好选项 =====
const PREFERENCE_OPTIONS = {
  interests: [
    { value: 'food', label: '美食' },
    { value: 'nature', label: '自然' },
    { value: 'culture', label: '文化' },
    { value: 'sport', label: '运动' },
    { value: 'photo', label: '拍照' },
    { value: 'shopping', label: '购物' }
  ],
  intensity: [
    { value: 'low', label: '轻松' },
    { value: 'medium', label: '适中' },
    { value: 'high', label: '硬核' }
  ]
}

// ===== C-14: 角色库（按 style 分类，每类 6 角色）=====
const ROLE_LIBRARY = {
  relax: ['咖啡探路者', '甜品鉴赏师', '光线观察员', '发呆顾问', '步速调节员', '氛围记录官'],
  adventure: ['线索采集员', '路线规划师', '风险预警员', '街景摄影师', '本地解码员', '挑战发起人'],
  social: ['气氛组组长', '话题引导员', '桌游裁判', '美食分配师', '合照导演', '时间管理员']
}

// ===== 剧本模板库（C-08）=====
const SCRIPT_TEMPLATES = [
  {
    match: { style: 'relax', budget: 'low' },
    title: '巷子里的慢午后',
    steps: ['找一家没去过的独立咖啡馆', '点一杯手冲 + 一块蛋糕', '坐窗边发呆30分钟', '拍一张咖啡拉花特写', '走路去最近的公园逛一圈'],
    duration: 90, budgetLabel: '30-50元', styleLabel: '放松'
  },
  {
    match: { style: 'relax', budget: 'medium' },
    title: '城市绿洲漫游',
    steps: ['去一家评分4.8+的甜品店', '点招牌甜品 + 饮品', '步行去附近的美术馆/画廊', '看一场当代艺术展', '在展馆咖啡区写三句话感受'],
    duration: 120, budgetLabel: '80-150元', styleLabel: '放松'
  },
  {
    match: { style: 'adventure', budget: 'low' },
    title: '街角探秘行动',
    steps: ['选一条从没走过的街道', '用脚步丈量1公里', '发现3个有趣的门牌/招牌', '在路边摊吃一份小吃', '给最有趣的发现拍3张照片'],
    duration: 60, budgetLabel: '10-30元', styleLabel: '探索'
  },
  {
    match: { style: 'adventure', budget: 'medium' },
    title: '隐藏菜单大冒险',
    steps: ['去一家大众点评4.5+的餐厅', '问店员推荐隐藏菜单', '点一道没吃过的菜', '拍下菜品发群里', '走路消食去附近的地标建筑打卡'],
    duration: 100, budgetLabel: '80-150元', styleLabel: '探索'
  },
  {
    match: { style: 'social', budget: 'medium' },
    title: '朋友局的正确打开方式',
    steps: ['约一家有桌游的咖啡馆', '选一款3-4人的桌游', '点饮料 + 小食拼盘', '玩两轮桌游分胜负', '输的人请下一轮'],
    duration: 150, budgetLabel: '60-120元', styleLabel: '社交'
  },
  {
    match: { style: 'social', budget: 'high' },
    title: '周末微旅行计划',
    steps: ['选一家网红餐厅预定午餐', '点招牌菜 + 网红甜点', '饭后步行去附近的文创街区', '逛3家有趣的小店', '在最有感觉的店拍合照'],
    duration: 180, budgetLabel: '200-400元', styleLabel: '社交'
  },
  {
    match: { style: 'relax', budget: 'high' },
    title: '仪式感的午后',
    steps: ['去一家精品酒店下午茶', '点三层塔 + 壶茶', '慢慢享用90分钟', '在酒店大堂/花园拍照', '步行去附近的艺术区'],
    duration: 150, budgetLabel: '200-350元', styleLabel: '放松'
  },
  {
    match: { style: 'adventure', budget: 'high' },
    title: '城市挑战赛',
    steps: ['选一个没去过的商圈', '用100元预算挑战一顿最特别的午餐', '在商圈里找到3个隐藏打卡点', '完成一个随机小任务（问路人一个问题）', '记录全程发小红书'],
    duration: 180, budgetLabel: '150-300元', styleLabel: '探索'
  },
  {
    match: { style: 'social', budget: 'low' },
    title: '马路边的友谊',
    steps: ['找一家路边小吃集合地', '每人选一道不同的小吃', '互相品尝对方选的', '边走边聊1小时', '在最有感觉的地方拍合照'],
    duration: 90, budgetLabel: '20-50元', styleLabel: '社交'
  }
]

// ===== 底层存储 =====
function getHostOpenId() {
  let id = ''
  try { id = wx.getStorageSync(OPENID_KEY) } catch (e) {}
  if (!id) {
    id = 'local_' + Date.now() + '_' + Math.floor(Math.random() * 100000)
    try { wx.setStorageSync(OPENID_KEY, id) } catch (e) {}
  }
  return id
}

function loadAllRooms() {
  try {
    const list = wx.getStorageSync(STORAGE_KEY)
    return Array.isArray(list) ? list : []
  } catch (e) {
    return []
  }
}

function saveAllRooms(list) {
  try { wx.setStorageSync(STORAGE_KEY, list) } catch (e) {}
}

function generateRoomId() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let s = ''
  for (let i = 0; i < 6; i++) {
    s += chars[Math.floor(Math.random() * chars.length)]
  }
  return s
}

function findRoomIndex(list, roomId) {
  return list.findIndex(r => r.roomId === roomId)
}

function touchRoom(room) {
  room.updatedAt = Date.now()
}

// ===== C-01/C-16: 创建房间（visibility 默认 private，向后兼容）=====
function createRoom(topic, maxMembers, options) {
  // 防御：topic 必须是字符串类型（非字符串一律拒绝，避免 (topic||'').trim 抛异常）
  if (typeof topic !== 'string') {
    return { ok: false, errCode: 'INVALID_PARAM', errMsg: '主题需 1-20 字' }
  }
  const t = topic.trim()
  if (!t || t.length > 20) {
    return { ok: false, errCode: 'INVALID_PARAM', errMsg: '主题需 1-20 字' }
  }
  if (!Number.isInteger(maxMembers) || maxMembers < 3 || maxMembers > 6) {
    return { ok: false, errCode: 'INVALID_PARAM', errMsg: '人数需 3-6 人' }
  }
  // C-16: visibility 校验，默认 private
  const opts = options || {}
  const visibility = (opts.visibility === 'public') ? 'public' : 'private'

  const list = loadAllRooms()
  let roomId = ''
  for (let i = 0; i < 5; i++) {
    const candidate = generateRoomId()
    if (!list.some(r => r.roomId === candidate)) {
      roomId = candidate
      break
    }
  }
  if (!roomId) {
    return { ok: false, errCode: 'ROOM_ID_COLLISION', errMsg: '系统繁忙，请重试' }
  }

  const now = Date.now()
  const openId = getHostOpenId()
  const room = {
    roomId,
    topic: t,
    maxMembers,
    hostOpenId: openId,
    members: [{
      openId,
      nickname: '发起人',
      joinedAt: now,
      isHost: true,
      preference: null,
      votes: { time: null, budget: null, style: null }
    }],
    status: ROOM_STATUS.WAITING,
    script: null,
    createdAt: now,
    updatedAt: now,
    // C-16: 公开/私密（默认 private，向后兼容旧房间无此字段按 private）
    visibility,
    // C-17: 待审核申请列表
    joinRequests: [],
    // C-19: 评价列表 + 举报标记
    reviews: [],
    reported: false
  }

  list.push(room)
  saveAllRooms(list)
  return { ok: true, roomId }
}

// ===== C-01: 加载房间 =====
function loadRoom(roomId) {
  if (!roomId) return { ok: false, errCode: 'INVALID_PARAM' }
  const list = loadAllRooms()
  const idx = findRoomIndex(list, roomId)
  if (idx === -1) return { ok: false, errCode: 'ROOM_NOT_FOUND' }
  return { ok: true, room: list[idx] }
}

// ===== C-01: 取消房间 =====
function cancelRoom(roomId) {
  if (!roomId) return { ok: false, errCode: 'INVALID_PARAM' }
  const list = loadAllRooms()
  const idx = findRoomIndex(list, roomId)
  if (idx === -1) return { ok: false, errCode: 'ROOM_NOT_FOUND', errMsg: '房间不存在' }

  const room = list[idx]
  const openId = getHostOpenId()
  if (room.hostOpenId !== openId) {
    return { ok: false, errCode: 'NOT_HOST', errMsg: '只有发起人可以取消组局' }
  }
  if (room.status === 'cancelled') {
    return { ok: false, errCode: 'ALREADY_CANCELLED', errMsg: '组局已取消' }
  }

  room.status = 'cancelled'
  touchRoom(room)
  list[idx] = room
  saveAllRooms(list)
  return { ok: true }
}

// ===== C-02/C-03: 成员加入 =====
function joinRoom(roomId, nickname) {
  if (!roomId) return { ok: false, errCode: 'INVALID_PARAM' }
  const list = loadAllRooms()
  const idx = findRoomIndex(list, roomId)
  if (idx === -1) return { ok: false, errCode: 'ROOM_NOT_FOUND' }

  const room = list[idx]
  if (room.status === 'cancelled') return { ok: false, errCode: 'ROOM_CANCELLED' }
  if (room.members.length >= room.maxMembers) return { ok: false, errCode: 'ROOM_FULL' }

  const openId = getHostOpenId()
  if (room.members.some(m => m.openId === openId)) {
    return { ok: false, errCode: 'ALREADY_JOINED' }
  }

  room.members.push({
    openId,
    nickname: nickname || '朋友' + room.members.length,
    joinedAt: Date.now(),
    isHost: false,
    preference: null,
    votes: { time: null, budget: null, style: null }
  })
  touchRoom(room)
  list[idx] = room
  saveAllRooms(list)
  return { ok: true, room }
}

// ===== C-03: demo 模式 - 添加假成员 =====
const MOCK_NICKNAMES = ['阿月', '小林', '大伟', '点点', '老张', 'Mia', '阿杰', '糖糖', '阿杰', '栗子']
const MOCK_INTERESTS = [['food', 'photo'], ['nature', 'sport'], ['culture', 'shopping'], ['food', 'culture'], ['photo', 'nature']]
const MOCK_INTENSITIES = ['low', 'medium', 'high']
const MOCK_VOTES_TIME = ['morning', 'afternoon', 'evening']
const MOCK_VOTES_BUDGET = ['low', 'medium', 'high']
const MOCK_VOTES_STYLE = ['relax', 'adventure', 'social']

function addMockMember(roomId) {
  if (!roomId) return { ok: false, errCode: 'INVALID_PARAM' }
  const list = loadAllRooms()
  const idx = findRoomIndex(list, roomId)
  if (idx === -1) return { ok: false, errCode: 'ROOM_NOT_FOUND' }

  const room = list[idx]
  if (room.status === 'cancelled') return { ok: false, errCode: 'ROOM_CANCELLED' }
  if (room.members.length >= room.maxMembers) return { ok: false, errCode: 'ROOM_FULL' }

  const memberCount = room.members.length
  const mockOpenId = 'mock_' + Date.now() + '_' + memberCount
  const nickname = MOCK_NICKNAMES[memberCount % MOCK_NICKNAMES.length]
  const interests = MOCK_INTERESTS[memberCount % MOCK_INTERESTS.length]
  const intensity = MOCK_INTENSITIES[memberCount % MOCK_INTENSITIES.length]
  const time = MOCK_VOTES_TIME[memberCount % MOCK_VOTES_TIME.length]
  const budget = MOCK_VOTES_BUDGET[memberCount % MOCK_VOTES_BUDGET.length]
  const style = MOCK_VOTES_STYLE[memberCount % MOCK_VOTES_STYLE.length]

  room.members.push({
    openId: mockOpenId,
    nickname,
    joinedAt: Date.now(),
    isHost: false,
    preference: { interests, intensity },
    votes: { time, budget, style }
  })
  touchRoom(room)
  list[idx] = room
  saveAllRooms(list)
  return { ok: true, room }
}

// ===== C-03: 一键填满假成员 =====
function fillMockMembers(roomId) {
  if (!roomId) return { ok: false, errCode: 'INVALID_PARAM' }
  const list = loadAllRooms()
  const idx = findRoomIndex(list, roomId)
  if (idx === -1) return { ok: false, errCode: 'ROOM_NOT_FOUND' }

  const room = list[idx]
  if (room.status === 'cancelled') return { ok: false, errCode: 'ROOM_CANCELLED' }

  while (room.members.length < room.maxMembers) {
    const memberCount = room.members.length
    const mockOpenId = 'mock_fill_' + Date.now() + '_' + memberCount
    const nickname = MOCK_NICKNAMES[memberCount % MOCK_NICKNAMES.length]
    const interests = MOCK_INTERESTS[memberCount % MOCK_INTERESTS.length]
    const intensity = MOCK_INTENSITIES[memberCount % MOCK_INTENSITIES.length]
    const time = MOCK_VOTES_TIME[memberCount % MOCK_VOTES_TIME.length]
    const budget = MOCK_VOTES_BUDGET[memberCount % MOCK_VOTES_BUDGET.length]
    const style = MOCK_VOTES_STYLE[memberCount % MOCK_VOTES_STYLE.length]

    room.members.push({
      openId: mockOpenId,
      nickname,
      joinedAt: Date.now(),
      isHost: false,
      preference: { interests, intensity },
      votes: { time, budget, style }
    })
  }
  touchRoom(room)
  list[idx] = room
  saveAllRooms(list)
  return { ok: true, room }
}

// ===== C-04: 提交匿名偏好 =====
function submitPreference(roomId, preference) {
  if (!roomId) return { ok: false, errCode: 'INVALID_PARAM' }
  if (!preference || !Array.isArray(preference.interests) || preference.interests.length === 0 || !preference.intensity) {
    return { ok: false, errCode: 'INVALID_PARAM', errMsg: '偏好数据不合法' }
  }
  const list = loadAllRooms()
  const idx = findRoomIndex(list, roomId)
  if (idx === -1) return { ok: false, errCode: 'ROOM_NOT_FOUND' }

  const room = list[idx]
  if (room.status === 'cancelled') return { ok: false, errCode: 'ROOM_CANCELLED' }

  const openId = getHostOpenId()
  const member = room.members.find(m => m.openId === openId)
  if (!member) return { ok: false, errCode: 'NOT_MEMBER' }

  member.preference = {
    interests: preference.interests,
    intensity: preference.intensity
  }
  touchRoom(room)
  list[idx] = room
  saveAllRooms(list)
  return { ok: true, room }
}

// ===== C-05/06/07: 提交投票 =====
function submitVote(roomId, voteType, voteValue) {
  if (!roomId || !voteType) return { ok: false, errCode: 'INVALID_PARAM' }
  if (!['time', 'budget', 'style'].includes(voteType)) {
    return { ok: false, errCode: 'INVALID_PARAM', errMsg: '投票类型不合法' }
  }
  const list = loadAllRooms()
  const idx = findRoomIndex(list, roomId)
  if (idx === -1) return { ok: false, errCode: 'ROOM_NOT_FOUND' }

  const room = list[idx]
  if (room.status === 'cancelled') return { ok: false, errCode: 'ROOM_CANCELLED' }

  const openId = getHostOpenId()
  const member = room.members.find(m => m.openId === openId)
  if (!member) return { ok: false, errCode: 'NOT_MEMBER' }

  member.votes[voteType] = voteValue
  touchRoom(room)
  list[idx] = room
  saveAllRooms(list)
  return { ok: true, room }
}

// ===== C-05/06/07: 获取投票统计 =====
function getVoteStats(roomId) {
  const result = loadRoom(roomId)
  if (!result.ok) return { ok: false, errCode: result.errCode }

  const room = result.room
  const stats = {
    time: {},
    budget: {},
    style: {},
    totalMembers: room.members.length,
    votedMembers: 0
  }

  // 统计每个选项的票数
  VOTE_OPTIONS.time.forEach(o => { stats.time[o.value] = 0 })
  VOTE_OPTIONS.budget.forEach(o => { stats.budget[o.value] = 0 })
  VOTE_OPTIONS.style.forEach(o => { stats.style[o.value] = 0 })

  let allVoted = true
  room.members.forEach(m => {
    if (m.votes.time) stats.time[m.votes.time]++
    else allVoted = false
    if (m.votes.budget) stats.budget[m.votes.budget]++
    else allVoted = false
    if (m.votes.style) stats.style[m.votes.style]++
    else allVoted = false
  })

  stats.allVoted = allVoted
  stats.votedMembers = room.members.filter(m =>
    m.votes.time && m.votes.budget && m.votes.style
  ).length

  // 找出每项的最高票
  stats.timeWinner = getWinner(stats.time, VOTE_OPTIONS.time)
  stats.budgetWinner = getWinner(stats.budget, VOTE_OPTIONS.budget)
  stats.styleWinner = getWinner(stats.style, VOTE_OPTIONS.style)

  return { ok: true, stats }
}

function getWinner(countMap, options) {
  let maxCount = 0
  let winners = []
  options.forEach(o => {
    const count = countMap[o.value] || 0
    if (count > maxCount) {
      maxCount = count
      winners = [o]
    } else if (count === maxCount && count > 0) {
      winners.push(o)
    }
  })
  return winners.length === 1 ? winners[0] : (winners.length > 1 ? winners : null)
}

// ===== C-08: 多人剧本生成 =====
function generateScript(roomId) {
  if (!roomId) return { ok: false, errCode: 'INVALID_PARAM' }
  const list = loadAllRooms()
  const idx = findRoomIndex(list, roomId)
  if (idx === -1) return { ok: false, errCode: 'ROOM_NOT_FOUND' }

  const room = list[idx]
  if (room.status === 'cancelled') return { ok: false, errCode: 'ROOM_CANCELLED' }

  const statsResult = getVoteStats(roomId)
  if (!statsResult.ok) return { ok: false, errCode: 'VOTE_STATS_ERROR' }
  const stats = statsResult.stats

  // 根据投票结果匹配剧本
  const style = stats.styleWinner ? stats.styleWinner.value : 'relax'
  const budget = stats.budgetWinner ? stats.budgetWinner.value : 'medium'

  // 找最匹配的模板
  let template = SCRIPT_TEMPLATES.find(t =>
    t.match.style === style && t.match.budget === budget
  )

  // 兜底：只匹配 style
  if (!template) {
    template = SCRIPT_TEMPLATES.find(t => t.match.style === style)
  }
  // 再兜底：取第一个
  if (!template) {
    template = SCRIPT_TEMPLATES[0]
  }

  // 根据成员偏好微调标题
  const allInterests = room.members
    .flatMap(m => (m.preference && m.preference.interests) || [])
  const topInterest = getMostFrequent(allInterests)

  let title = template.title
  if (topInterest === 'food') title = '吃货专属：' + title
  else if (topInterest === 'photo') title = '出片之旅：' + title
  else if (topInterest === 'nature') title = '自然漫游：' + title

  const script = {
    title,
    steps: template.steps,
    duration: template.duration,
    budgetLabel: template.budgetLabel,
    styleLabel: template.styleLabel,
    style,
    timeLabel: stats.timeWinner ? stats.timeWinner.label : '随时',
    members: room.members.map(m => m.nickname),
    generatedAt: Date.now()
  }

  room.script = script
  room.status = ROOM_STATUS.FINISHED
  // C-14/C-15: 剧本生成后自动分配角色 + 生成独立线索
  room.roles = buildRoles(room.members, style)
  room.clues = buildClues(room.members, script.steps)
  touchRoom(room)
  list[idx] = room
  saveAllRooms(list)
  return { ok: true, room, script }
}

function getMostFrequent(arr) {
  if (!arr || arr.length === 0) return null
  const count = {}
  let maxCount = 0
  let result = null
  arr.forEach(item => {
    count[item] = (count[item] || 0) + 1
    if (count[item] > maxCount) {
      maxCount = count[item]
      result = item
    }
  })
  return result
}

// ===== C-11: 人数不足兜底 =====
// 纯函数：检查房间人数是否满足最低要求，返回建议动作
//   current < min            → suggestion='cancel'（建议取消）
//   min <= current < 3       → suggestion='small_team'（小队模式，可继续）
//   current >= 3             → suggestion='ok'
// room 入参可为 room 对象或 { members }；非法入参保守返回 cancel
function checkQuorum(room) {
  const members = (room && Array.isArray(room.members)) ? room.members : []
  const current = members.length
  const min = MIN_MEMBERS
  let suggestion = 'ok'
  if (current < min) {
    suggestion = 'cancel'
  } else if (current < 3) {
    suggestion = 'small_team'
  }
  return { ok: true, enough: current >= min, current, min, suggestion }
}

// ===== C-09: 到齐确认 =====
// 仅房主可调，成员数 >= MIN_MEMBERS 时 WAITING → READY
// 兜底：成员数 < MIN_MEMBERS 返回 NOT_ENOUGH_MEMBERS
// 兼容：房主可跳过 READY 直接 WAITING → VOTING（保留 updateRoomStatus 路径）
function confirmReady(roomId) {
  if (!roomId) return { ok: false, errCode: 'INVALID_PARAM' }
  const list = loadAllRooms()
  const idx = findRoomIndex(list, roomId)
  if (idx === -1) return { ok: false, errCode: 'ROOM_NOT_FOUND' }

  const room = list[idx]
  if (room.status === 'cancelled') return { ok: false, errCode: 'ROOM_CANCELLED' }
  if (room.status !== ROOM_STATUS.WAITING) {
    return { ok: false, errCode: 'INVALID_STATUS', errMsg: '当前阶段无法确认到齐' }
  }

  const openId = getHostOpenId()
  if (room.hostOpenId !== openId) {
    return { ok: false, errCode: 'NOT_HOST', errMsg: '只有发起人可以确认到齐' }
  }

  if (!Array.isArray(room.members) || room.members.length < MIN_MEMBERS) {
    return { ok: false, errCode: 'NOT_ENOUGH_MEMBERS', errMsg: '至少 ' + MIN_MEMBERS + ' 人才能开始' }
  }

  room.status = ROOM_STATUS.READY
  touchRoom(room)
  list[idx] = room
  saveAllRooms(list)
  return { ok: true, room }
}

// ===== C-10: 临时退出 =====
// 非房主退出：从 members 移除自己，投票统计由 getVoteStats 实时重算
// 房主退出：转取消房间（房主走则局散），返回 hostLeft=true
// 状态限制：status ∈ {WAITING, READY, VOTING} 可退；{GENERATING, FINISHED} 不可退（剧本已生成）
// 退出后联动 checkQuorum，suggestion='cancel' 时返回值带 quorum 提示房主
function leaveRoom(roomId) {
  if (!roomId) return { ok: false, errCode: 'INVALID_PARAM' }
  const list = loadAllRooms()
  const idx = findRoomIndex(list, roomId)
  if (idx === -1) return { ok: false, errCode: 'ROOM_NOT_FOUND' }

  const room = list[idx]
  if (room.status === 'cancelled') return { ok: false, errCode: 'ROOM_CANCELLED' }

  // 状态限制：剧本已生成（GENERATING/FINISHED）不可退
  if (room.status === ROOM_STATUS.GENERATING || room.status === ROOM_STATUS.FINISHED) {
    return { ok: false, errCode: 'INVALID_STATUS', errMsg: '剧本已生成，无法退出' }
  }

  const openId = getHostOpenId()

  // 房主退出 → 转取消房间（房主走则局散）
  if (room.hostOpenId === openId) {
    room.status = 'cancelled'
    touchRoom(room)
    list[idx] = room
    saveAllRooms(list)
    return {
      ok: true, room, hostLeft: true,
      quorum: { suggestion: 'cancel', current: 0, min: MIN_MEMBERS }
    }
  }

  // 非房主退出：从 members 移除自己
  const beforeLen = room.members.length
  room.members = room.members.filter(m => m.openId !== openId)
  if (room.members.length === beforeLen) {
    return { ok: false, errCode: 'NOT_MEMBER', errMsg: '你不在房间中' }
  }
  touchRoom(room)
  list[idx] = room
  saveAllRooms(list)

  // 联动 C-11: 退出后检查人数兜底
  const quorum = checkQuorum(room)
  return {
    ok: true, room, hostLeft: false,
    quorum: { suggestion: quorum.suggestion, current: quorum.current, min: quorum.min }
  }
}

// ===== C-14: 角色分配 =====
// 纯函数：按 style 从角色库轮询分配，每人一个角色
// members 非数组 → 返回 []；style 非法 → 用 relax 兜底
function buildRoles(members, style) {
  const list = Array.isArray(members) ? members : []
  const pool = ROLE_LIBRARY[style] || ROLE_LIBRARY.relax
  return list.map((m, i) => ({
    openId: m.openId,
    nickname: m.nickname,
    role: pool[i % pool.length]
  }))
}

// 房间操作：仅 FINISHED 可调，幂等（覆盖重分配）
function assignRoles(roomId) {
  if (!roomId) return { ok: false, errCode: 'INVALID_PARAM' }
  const list = loadAllRooms()
  const idx = findRoomIndex(list, roomId)
  if (idx === -1) return { ok: false, errCode: 'ROOM_NOT_FOUND' }
  const room = list[idx]
  if (room.status === 'cancelled') return { ok: false, errCode: 'ROOM_CANCELLED' }
  if (room.status !== ROOM_STATUS.FINISHED) {
    return { ok: false, errCode: 'INVALID_STATUS', errMsg: '剧本未生成，无法分配角色' }
  }
  const style = (room.script && room.script.style) || 'relax'
  room.roles = buildRoles(room.members, style)
  touchRoom(room)
  list[idx] = room
  saveAllRooms(list)
  return { ok: true, room }
}

// ===== C-15: 独立线索 =====
// 纯函数：steps 轮询分配给成员，steps 为空则每人「自由发挥」
function buildClues(members, steps) {
  const mList = Array.isArray(members) ? members : []
  const sList = Array.isArray(steps) ? steps : []
  return mList.map((m, i) => ({
    openId: m.openId,
    nickname: m.nickname,
    clue: sList.length > 0 ? sList[i % sList.length] : '自由发挥'
  }))
}

// 房间操作：仅 FINISHED 可调，幂等
function generateClues(roomId) {
  if (!roomId) return { ok: false, errCode: 'INVALID_PARAM' }
  const list = loadAllRooms()
  const idx = findRoomIndex(list, roomId)
  if (idx === -1) return { ok: false, errCode: 'ROOM_NOT_FOUND' }
  const room = list[idx]
  if (room.status === 'cancelled') return { ok: false, errCode: 'ROOM_CANCELLED' }
  if (room.status !== ROOM_STATUS.FINISHED) {
    return { ok: false, errCode: 'INVALID_STATUS', errMsg: '剧本未生成，无法生成线索' }
  }
  const steps = (room.script && Array.isArray(room.script.steps)) ? room.script.steps : []
  room.clues = buildClues(room.members, steps)
  touchRoom(room)
  list[idx] = room
  saveAllRooms(list)
  return { ok: true, room }
}

// ===== C-16: 公开组局列表 =====
// 返回 visibility=public 且未完成/未取消的房间，按 createdAt 倒序，精简字段
function listPublicRooms() {
  const list = loadAllRooms()
  const active = list.filter(r =>
    r.visibility === 'public' &&
    r.status !== 'cancelled' &&
    r.status !== ROOM_STATUS.FINISHED
  )
  active.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
  const rooms = active.map(r => ({
    roomId: r.roomId,
    topic: r.topic,
    membersCount: Array.isArray(r.members) ? r.members.length : 0,
    maxMembers: r.maxMembers,
    status: r.status,
    createdAt: r.createdAt
  }))
  return { ok: true, rooms }
}

// ===== C-17: 申请加入（公开房间）=====
function generateRequestId() {
  return 'req_' + Date.now() + '_' + Math.floor(Math.random() * 100000)
}

// 仅 public + status∈{waiting,ready} 可申请；防重复（已成员/已申请）
function requestJoin(roomId, nickname) {
  if (!roomId) return { ok: false, errCode: 'INVALID_PARAM' }
  const list = loadAllRooms()
  const idx = findRoomIndex(list, roomId)
  if (idx === -1) return { ok: false, errCode: 'ROOM_NOT_FOUND' }
  const room = list[idx]
  if (room.status === 'cancelled') return { ok: false, errCode: 'ROOM_CANCELLED' }
  if (room.visibility !== 'public') {
    return { ok: false, errCode: 'NOT_PUBLIC', errMsg: '仅公开组局可申请加入' }
  }
  if (room.status === ROOM_STATUS.VOTING || room.status === ROOM_STATUS.GENERATING || room.status === ROOM_STATUS.FINISHED) {
    return { ok: false, errCode: 'INVALID_STATUS', errMsg: '当前阶段无法申请加入' }
  }
  const openId = getHostOpenId()
  if (room.members.some(m => m.openId === openId)) {
    return { ok: false, errCode: 'ALREADY_JOINED', errMsg: '你已在房间中' }
  }
  const reqs = Array.isArray(room.joinRequests) ? room.joinRequests : []
  if (reqs.some(r => r.openId === openId)) {
    return { ok: false, errCode: 'ALREADY_REQUESTED', errMsg: '你已申请加入，等待审核' }
  }
  if (room.members.length >= room.maxMembers) {
    return { ok: false, errCode: 'ROOM_FULL', errMsg: '房间已满' }
  }
  const requestId = generateRequestId()
  reqs.push({
    requestId,
    openId,
    nickname: nickname || '申请人',
    requestedAt: Date.now()
  })
  room.joinRequests = reqs
  touchRoom(room)
  list[idx] = room
  saveAllRooms(list)
  return { ok: true, requestId }
}

// ===== C-18: 发起人审核 =====
// 仅房主可调；approve 从 joinRequests 移除并加入 members
function approveJoin(roomId, requestId) {
  if (!roomId || !requestId) return { ok: false, errCode: 'INVALID_PARAM' }
  const list = loadAllRooms()
  const idx = findRoomIndex(list, roomId)
  if (idx === -1) return { ok: false, errCode: 'ROOM_NOT_FOUND' }
  const room = list[idx]
  if (room.status === 'cancelled') return { ok: false, errCode: 'ROOM_CANCELLED' }
  const openId = getHostOpenId()
  if (room.hostOpenId !== openId) {
    return { ok: false, errCode: 'NOT_HOST', errMsg: '只有发起人可以审核' }
  }
  if (room.status === ROOM_STATUS.VOTING || room.status === ROOM_STATUS.GENERATING || room.status === ROOM_STATUS.FINISHED) {
    return { ok: false, errCode: 'INVALID_STATUS', errMsg: '当前阶段无法审核' }
  }
  if (room.members.length >= room.maxMembers) {
    return { ok: false, errCode: 'ROOM_FULL', errMsg: '房间已满' }
  }
  const reqs = Array.isArray(room.joinRequests) ? room.joinRequests : []
  const reqIdx = reqs.findIndex(r => r.requestId === requestId)
  if (reqIdx === -1) {
    return { ok: false, errCode: 'REQUEST_NOT_FOUND', errMsg: '申请不存在' }
  }
  const req = reqs[reqIdx]
  room.joinRequests = reqs.filter(r => r.requestId !== requestId)
  room.members.push({
    openId: req.openId,
    nickname: req.nickname,
    joinedAt: Date.now(),
    isHost: false,
    preference: null,
    votes: { time: null, budget: null, style: null }
  })
  touchRoom(room)
  list[idx] = room
  saveAllRooms(list)
  return { ok: true, room }
}

// 仅房主可调；reject 仅移除申请
function rejectJoin(roomId, requestId) {
  if (!roomId || !requestId) return { ok: false, errCode: 'INVALID_PARAM' }
  const list = loadAllRooms()
  const idx = findRoomIndex(list, roomId)
  if (idx === -1) return { ok: false, errCode: 'ROOM_NOT_FOUND' }
  const room = list[idx]
  if (room.status === 'cancelled') return { ok: false, errCode: 'ROOM_CANCELLED' }
  const openId = getHostOpenId()
  if (room.hostOpenId !== openId) {
    return { ok: false, errCode: 'NOT_HOST', errMsg: '只有发起人可以审核' }
  }
  const reqs = Array.isArray(room.joinRequests) ? room.joinRequests : []
  const reqIdx = reqs.findIndex(r => r.requestId === requestId)
  if (reqIdx === -1) {
    return { ok: false, errCode: 'REQUEST_NOT_FOUND', errMsg: '申请不存在' }
  }
  room.joinRequests = reqs.filter(r => r.requestId !== requestId)
  touchRoom(room)
  list[idx] = room
  saveAllRooms(list)
  return { ok: true, room }
}

// ===== C-19: 评价和举报 =====
// 纯函数：算平均分 + 总数 + 分布
function buildReviewSummary(reviews) {
  const list = Array.isArray(reviews) ? reviews : []
  const total = list.length
  let sum = 0
  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
  list.forEach(r => {
    const rating = Number(r.rating)
    if (rating >= 1 && rating <= 5) {
      sum += rating
      distribution[rating] = (distribution[rating] || 0) + 1
    }
  })
  const average = total > 0 ? Math.round((sum / total) * 10) / 10 : 0
  return { total, average, distribution }
}

// 仅 FINISHED + 成员可评价；每人一次（ALREADY_REVIEWED）
function submitReview(roomId, review) {
  if (!roomId) return { ok: false, errCode: 'INVALID_PARAM' }
  if (!review || !Number.isInteger(review.rating) || review.rating < 1 || review.rating > 5) {
    return { ok: false, errCode: 'INVALID_PARAM', errMsg: '评价需 1-5 星' }
  }
  const comment = (review.comment || '').toString().slice(0, 100)
  const list = loadAllRooms()
  const idx = findRoomIndex(list, roomId)
  if (idx === -1) return { ok: false, errCode: 'ROOM_NOT_FOUND' }
  const room = list[idx]
  if (room.status === 'cancelled') return { ok: false, errCode: 'ROOM_CANCELLED' }
  if (room.status !== ROOM_STATUS.FINISHED) {
    return { ok: false, errCode: 'INVALID_STATUS', errMsg: '完成后才能评价' }
  }
  const openId = getHostOpenId()
  if (!room.members.some(m => m.openId === openId)) {
    return { ok: false, errCode: 'NOT_MEMBER', errMsg: '只有成员可以评价' }
  }
  const reviews = Array.isArray(room.reviews) ? room.reviews : []
  if (reviews.some(r => r.openId === openId)) {
    return { ok: false, errCode: 'ALREADY_REVIEWED', errMsg: '你已评价过' }
  }
  reviews.push({
    openId,
    rating: review.rating,
    comment,
    createdAt: Date.now()
  })
  room.reviews = reviews
  touchRoom(room)
  list[idx] = room
  saveAllRooms(list)
  return { ok: true, room, reviewSummary: buildReviewSummary(reviews) }
}

// 任何用户可举报；防重复（ALREADY_REPORTED）
function reportRoom(roomId, reason) {
  if (!roomId) return { ok: false, errCode: 'INVALID_PARAM' }
  const r = (reason || '').toString().trim()
  if (!r || r.length > 100) {
    return { ok: false, errCode: 'INVALID_PARAM', errMsg: '举报理由需 1-100 字' }
  }
  const list = loadAllRooms()
  const idx = findRoomIndex(list, roomId)
  if (idx === -1) return { ok: false, errCode: 'ROOM_NOT_FOUND' }
  const room = list[idx]
  const openId = getHostOpenId()
  if (room.reported) {
    return { ok: false, errCode: 'ALREADY_REPORTED', errMsg: '该组局已被举报' }
  }
  room.reported = true
  room.reportReason = r
  room.reportedBy = openId
  room.reportedAt = Date.now()
  touchRoom(room)
  list[idx] = room
  saveAllRooms(list)
  return { ok: true }
}

// ===== 状态转换 =====
function updateRoomStatus(roomId, status) {
  if (!roomId || !status) return { ok: false, errCode: 'INVALID_PARAM' }
  const list = loadAllRooms()
  const idx = findRoomIndex(list, roomId)
  if (idx === -1) return { ok: false, errCode: 'ROOM_NOT_FOUND' }

  const room = list[idx]
  if (room.status === 'cancelled') return { ok: false, errCode: 'ROOM_CANCELLED' }

  room.status = status
  touchRoom(room)
  list[idx] = room
  saveAllRooms(list)
  return { ok: true, room }
}

// ===== 清理测试数据（调试用）=====
function clearAllRooms() {
  try { wx.setStorageSync(STORAGE_KEY, []) } catch (e) {}
  return { ok: true }
}

module.exports = {
  // 常量
  ROOM_STATUS,
  VOTE_OPTIONS,
  PREFERENCE_OPTIONS,
  ROLE_LIBRARY,
  // C-01
  createRoom,
  loadRoom,
  cancelRoom,
  // C-02/C-03
  joinRoom,
  addMockMember,
  fillMockMembers,
  // C-04
  submitPreference,
  // C-05/06/07
  submitVote,
  getVoteStats,
  // C-08
  generateScript,
  // C-09 到齐确认 / C-10 临时退出 / C-11 人数不足兜底
  confirmReady,
  leaveRoom,
  checkQuorum,
  // C-14 角色分配 / C-15 独立线索
  assignRoles,
  generateClues,
  // C-16 公开组局 / C-17 申请加入 / C-18 发起人审核
  listPublicRooms,
  requestJoin,
  approveJoin,
  rejectJoin,
  // C-19 评价和举报
  submitReview,
  reportRoom,
  // 通用
  updateRoomStatus,
  clearAllRooms,
  // 内部导出（供测试用）
  _internal: { getMostFrequent, getWinner, generateRoomId, findRoomIndex, checkQuorum, MIN_MEMBERS, buildRoles, buildClues, buildReviewSummary, generateRequestId, ROLE_LIBRARY }
}
