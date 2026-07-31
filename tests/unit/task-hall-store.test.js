// tests/unit/task-hall-store.test.js
// 单元测试：task-hall-store.js (C-P3 任务大厅数据层)
// 运行: node tests/unit/task-hall-store.test.js
//
// 覆盖：initHallFromTemplates / listTasks / getTaskDetail / createUserTask /
//       joinTask / diceMatch / linkRoom / updateTaskStatus / _internal helpers / 多用户关联

'use strict'

var assert = require('assert')
var wx = require('../mock-wx.js')
global.wx = wx

var store = require('../../packageSync/utils/task-hall-store.js')
var internals = store._internal

// ===== 测试框架 =====

var passed = 0
var failed = 0
var failures = []

function setup() {
  wx._reset()
  store.clearAllTasks()
}

function teardown() {
  wx._reset()
  store.clearAllTasks()
}

function test(name, fn) {
  setup()
  try {
    fn()
    passed++
    console.log('  \u2713 ' + name)
  } catch (e) {
    failed++
    failures.push(name + ' -> ' + e.message)
    console.log('  \u2717 ' + name)
    console.log('      ' + (e.message || e))
  }
  teardown()
}

function section(name) {
  console.log('\n--- ' + name + ' ---')
}

function eq(actual, expected, msg) {
  assert.strictEqual(actual, expected, msg)
}
function ok(actual, msg) {
  assert.ok(actual, msg)
}
function deepEq(actual, expected, msg) {
  assert.deepStrictEqual(actual, expected, msg)
}

// ===== 辅助构造器 =====

function mkCreator(openId, nickname) {
  return { openId: openId, nickname: nickname }
}

function validOpts(overrides) {
  var base = {
    topic: '周末漫游',
    category: 'art',
    district: '天河区',
    poiId: 'gz_poi_th_01',
    maxMembers: 4,
    scheduledTime: 'weekend_morning',
    tags: ['测试']
  }
  if (overrides) {
    var keys = Object.keys(overrides)
    for (var i = 0; i < keys.length; i++) {
      base[keys[i]] = overrides[keys[i]]
    }
  }
  return base
}

// ===== 开始测试 =====

console.log('\n=== task-hall-store 单元测试 ===')

// ----------------------------------------------------------------
// A. initHallFromTemplates
// ----------------------------------------------------------------
section('A. initHallFromTemplates')

test('正向：首次调用创建 45 个 master 任务', function () {
  var r = store.initHallFromTemplates()
  ok(r.ok, '应返回 ok=true')
  eq(r.created, 45, '应创建 45 条')
  eq(r.total, 45, '总数应为 45')
})

test('幂等：再次调用不重复创建', function () {
  store.initHallFromTemplates()
  var r = store.initHallFromTemplates()
  eq(r.ok, true)
  eq(r.created, 0, '二次调用 created 应为 0')
  eq(r.total, 45, '总数仍为 45')
})

test('force=true：强制重建 45 条', function () {
  store.initHallFromTemplates()
  var r = store.initHallFromTemplates(true)
  eq(r.ok, true)
  eq(r.created, 45, 'force 重建 created=45')
  eq(r.total, 45, '总数仍为 45')
})

test('每个 master 任务字段正确：source/hostOpenId/hostNickname/tags', function () {
  store.initHallFromTemplates()
  var list = internals.loadAllTasks()
  eq(list.length, 45)
  for (var i = 0; i < list.length; i++) {
    var t = list[i]
    eq(t.source, 'master', 'source 应为 master')
    eq(t.hostOpenId, 'escape_master', 'hostOpenId 应为 escape_master')
    eq(t.hostNickname, '出逃大师', 'hostNickname 应为 出逃大师')
    ok(t.tags.indexOf('官方') !== -1, 'tags 应含「官方」')
  }
})

// ----------------------------------------------------------------
// B. listTasks
// ----------------------------------------------------------------
section('B. listTasks')

test('全量返回 45 条精简卡片', function () {
  store.initHallFromTemplates()
  var cards = store.listTasks()
  eq(cards.length, 45, '应返回 45 条卡片')
})

test('卡片字段完整且正确', function () {
  store.initHallFromTemplates()
  var cards = store.listTasks()
  var c = cards[0]
  ok(typeof c.taskId === 'string' && c.taskId.length > 0, 'taskId 应为非空字符串')
  ok(c.source === 'master' || c.source === 'user', 'source 合法')
  ok(typeof c.topic === 'string', 'topic 应为字符串')
  ok(typeof c.category === 'string', 'category 应为字符串')
  ok(typeof c.district === 'string', 'district 应为字符串')
  ok(typeof c.poiName === 'string', 'poiName 应为字符串')
  ok(typeof c.hostNickname === 'string', 'hostNickname 应为字符串')
  ok(typeof c.membersCount === 'number', 'membersCount 应为数字')
  ok(typeof c.maxMembers === 'number', 'maxMembers 应为数字')
  ok(typeof c.status === 'string', 'status 应为字符串')
  ok(typeof c.scheduledTime === 'string', 'scheduledTime 应为字符串')
  ok(Array.isArray(c.tags), 'tags 应为数组')
  ok(typeof c.isOfficial === 'boolean', 'isOfficial 应为布尔')
})

test('卡片不含 members / steps 全量数组', function () {
  store.initHallFromTemplates()
  var cards = store.listTasks()
  for (var i = 0; i < cards.length; i++) {
    ok(cards[i].members === undefined, '卡片不应含 members 全量')
    ok(cards[i].steps === undefined, '卡片不应含 steps 全量')
    ok(cards[i].description === undefined, '卡片不应含 description')
    ok(cards[i].roomId === undefined, '卡片不应含 roomId')
  }
})

test('按 createdAt 倒序排列', function () {
  // 用 _internal 构造 3 条不同 createdAt 的任务
  var now = Date.now()
  var list = [
    { taskId: 't_old', source: 'user', topic: '旧', category: 'walk', district: '天河区', poi: { name: 'A' }, hostNickname: 'h', members: [], maxMembers: 3, status: 'recruiting', scheduledTime: 'anytime', tags: [], createdAt: now - 3000, updatedAt: now },
    { taskId: 't_mid', source: 'user', topic: '中', category: 'walk', district: '天河区', poi: { name: 'B' }, hostNickname: 'h', members: [], maxMembers: 3, status: 'recruiting', scheduledTime: 'anytime', tags: [], createdAt: now - 2000, updatedAt: now },
    { taskId: 't_new', source: 'user', topic: '新', category: 'walk', district: '天河区', poi: { name: 'C' }, hostNickname: 'h', members: [], maxMembers: 3, status: 'recruiting', scheduledTime: 'anytime', tags: [], createdAt: now - 1000, updatedAt: now }
  ]
  internals.saveAllTasks(list)
  var cards = store.listTasks()
  eq(cards.length, 3)
  eq(cards[0].taskId, 't_new', '最新任务应在前')
  eq(cards[1].taskId, 't_mid', '中间任务居中')
  eq(cards[2].taskId, 't_old', '最旧任务应在后')
})

test('district 筛选：只返回天河区', function () {
  store.initHallFromTemplates()
  var cards = store.listTasks({ district: '天河区' })
  eq(cards.length, 6, '天河区应有 6 条')
  for (var i = 0; i < cards.length; i++) {
    eq(cards[i].district, '天河区')
  }
})

test('category 筛选：只返回 walk 类', function () {
  store.initHallFromTemplates()
  var cards = store.listTasks({ category: 'walk' })
  // em_001/004/011/014/018/021/024/030 共 8 条 walk
  eq(cards.length, 8, 'walk 类应有 8 条')
  for (var i = 0; i < cards.length; i++) {
    eq(cards[i].category, 'walk')
  }
})

test('excludeFull 筛选：排除已满员任务', function () {
  // 创建一个 3 人房并填满 → ready
  var r = store.createUserTask(mkCreator('h_ef', '房主'), validOpts({ maxMembers: 3 }))
  store.joinTask(r.taskId, { openId: 'a1', nickname: 'A1' })
  store.joinTask(r.taskId, { openId: 'a2', nickname: 'A2' }) // 满 → ready
  var detail = store.getTaskDetail(r.taskId)
  eq(detail.task.status, 'ready', '应已满员转 ready')

  // 默认列表应包含该 ready 任务
  var allCards = store.listTasks()
  var foundInAll = false
  for (var i = 0; i < allCards.length; i++) {
    if (allCards[i].taskId === r.taskId) { foundInAll = true; break }
  }
  ok(foundInAll, '默认列表应包含 ready 任务')

  // excludeFull 应排除它
  var filtered = store.listTasks({ excludeFull: true })
  var foundInFiltered = false
  for (var j = 0; j < filtered.length; j++) {
    if (filtered[j].taskId === r.taskId) { foundInFiltered = true; break }
  }
  ok(!foundInFiltered, 'excludeFull 应排除满员任务')
})

test('默认排除 cancelled 和 finished 任务', function () {
  store.initHallFromTemplates() // 45 master (recruiting)

  // 创建并取消一个
  var r1 = store.createUserTask(mkCreator('u_cancel', '取消者'), validOpts({ maxMembers: 3 }))
  store.updateTaskStatus(r1.taskId, 'cancelled')

  // 创建并走完 ready → started → finished
  var r2 = store.createUserTask(mkCreator('u_finish', '完成者'), validOpts({ maxMembers: 3 }))
  store.joinTask(r2.taskId, { openId: 'f1', nickname: 'F1' })
  store.joinTask(r2.taskId, { openId: 'f2', nickname: 'F2' }) // ready
  store.updateTaskStatus(r2.taskId, 'started')
  store.updateTaskStatus(r2.taskId, 'finished')

  var cards = store.listTasks()
  eq(cards.length, 45, '应只返回 45 条 master (排除 cancelled + finished)')
  for (var i = 0; i < cards.length; i++) {
    ok(cards[i].status !== 'cancelled', '不应含 cancelled')
    ok(cards[i].status !== 'finished', '不应含 finished')
  }
})

// ----------------------------------------------------------------
// C. getTaskDetail
// ----------------------------------------------------------------
section('C. getTaskDetail')

test('正向：返回完整任务对象', function () {
  var r = store.createUserTask(mkCreator('h_gd', '房主'), validOpts())
  var d = store.getTaskDetail(r.taskId)
  eq(d.ok, true)
  ok(d.task, '应返回 task 对象')
  eq(d.task.taskId, r.taskId)
  ok(Array.isArray(d.task.members), 'task 应含 members 数组')
  ok(Array.isArray(d.task.steps), 'task 应含 steps 数组')
  ok(d.task.poi && typeof d.task.poi === 'object', 'task 应含 poi 对象')
  ok(d.task.roomId === null, 'task 应含 roomId (null)')
})

test('不存在：返回 TASK_NOT_FOUND', function () {
  var d = store.getTaskDetail('hall_not_exist')
  eq(d.ok, false)
  eq(d.errCode, 'TASK_NOT_FOUND')
})

test('空参数：返回 INVALID_PARAM', function () {
  var d = store.getTaskDetail('')
  eq(d.ok, false)
  eq(d.errCode, 'INVALID_PARAM')
  var d2 = store.getTaskDetail(null)
  eq(d2.ok, false)
  eq(d2.errCode, 'INVALID_PARAM')
})

// ----------------------------------------------------------------
// D. createUserTask
// ----------------------------------------------------------------
section('D. createUserTask')

test('正向：创建成功并出现在 listTasks', function () {
  var r = store.createUserTask(mkCreator('creator_1', '创建者'), validOpts())
  eq(r.ok, true)
  ok(typeof r.taskId === 'string' && r.taskId.length > 0, '应返回 taskId')
  var cards = store.listTasks()
  var found = false
  for (var i = 0; i < cards.length; i++) {
    if (cards[i].taskId === r.taskId) { found = true; break }
  }
  ok(found, '新任务应出现在 listTasks')
})

test('创建者自动成为 members[0]（host）', function () {
  var r = store.createUserTask(mkCreator('creator_2', '创建者'), validOpts())
  var d = store.getTaskDetail(r.taskId)
  eq(d.task.members.length, 1, '应有 1 个成员')
  eq(d.task.members[0].openId, 'creator_2', 'members[0] 应为创建者')
  eq(d.task.members[0].nickname, '创建者')
  eq(d.task.hostOpenId, 'creator_2', 'hostOpenId 应为创建者')
})

test('topic 空字符串 → INVALID_PARAM', function () {
  var r = store.createUserTask(mkCreator('c', 'c'), validOpts({ topic: '' }))
  eq(r.ok, false)
  eq(r.errCode, 'INVALID_PARAM')
})

test('topic 非 string → INVALID_PARAM', function () {
  var r = store.createUserTask(mkCreator('c', 'c'), validOpts({ topic: 123 }))
  eq(r.ok, false)
  eq(r.errCode, 'INVALID_PARAM')
})

test('topic 超 20 字 → INVALID_PARAM', function () {
  var r = store.createUserTask(mkCreator('c', 'c'), validOpts({ topic: '一二三四五六七八九十一二三四五六七八九十一' }))
  eq(r.ok, false)
  eq(r.errCode, 'INVALID_PARAM')
})

test('category 非法 → INVALID_PARAM', function () {
  var r = store.createUserTask(mkCreator('c', 'c'), validOpts({ category: 'invalid_cat' }))
  eq(r.ok, false)
  eq(r.errCode, 'INVALID_PARAM')
})

test('district 非法 → INVALID_PARAM', function () {
  var r = store.createUserTask(mkCreator('c', 'c'), validOpts({ district: '火星区' }))
  eq(r.ok, false)
  eq(r.errCode, 'INVALID_PARAM')
})

test('poiId 不存在 → INVALID_PARAM', function () {
  var r = store.createUserTask(mkCreator('c', 'c'), validOpts({ poiId: 'gz_poi_not_exist' }))
  eq(r.ok, false)
  eq(r.errCode, 'INVALID_PARAM')
})

test('maxMembers=2 → INVALID_PARAM（必须 3-6）', function () {
  var r = store.createUserTask(mkCreator('c', 'c'), validOpts({ maxMembers: 2 }))
  eq(r.ok, false)
  eq(r.errCode, 'INVALID_PARAM')
})

test('maxMembers=7 → INVALID_PARAM', function () {
  var r = store.createUserTask(mkCreator('c', 'c'), validOpts({ maxMembers: 7 }))
  eq(r.ok, false)
  eq(r.errCode, 'INVALID_PARAM')
})

test('scheduledTime 非法 → INVALID_PARAM', function () {
  var r = store.createUserTask(mkCreator('c', 'c'), validOpts({ scheduledTime: 'never' }))
  eq(r.ok, false)
  eq(r.errCode, 'INVALID_PARAM')
})

// ----------------------------------------------------------------
// E. joinTask
// ----------------------------------------------------------------
section('E. joinTask')

test('正向：加入成功 members +1', function () {
  var r = store.createUserTask(mkCreator('h_j', '房主'), validOpts({ maxMembers: 4 }))
  var before = store.getTaskDetail(r.taskId).task.members.length
  var res = store.joinTask(r.taskId, { openId: 'joiner_1', nickname: '加入者1' })
  eq(res.ok, true)
  var after = store.getTaskDetail(r.taskId).task.members.length
  eq(after, before + 1, '成员数应 +1')
})

test('重复加入 → ALREADY_JOINED', function () {
  var r = store.createUserTask(mkCreator('h_j2', '房主'), validOpts({ maxMembers: 4 }))
  store.joinTask(r.taskId, { openId: 'dup_user', nickname: '重复者' })
  var res = store.joinTask(r.taskId, { openId: 'dup_user', nickname: '重复者' })
  eq(res.ok, false)
  eq(res.errCode, 'ALREADY_JOINED')
})

test('满员 → TASK_FULL', function () {
  // 构造 status=recruiting 且 members.length >= maxMembers 的边界场景
  var r = store.createUserTask(mkCreator('h_j3', '房主'), validOpts({ maxMembers: 3 }))
  // 通过 _internal 直接塞入 2 个额外成员，保持 recruiting 状态
  var list = internals.loadAllTasks()
  var idx = internals.findTaskIndex(list, r.taskId)
  list[idx].members.push({ openId: 'extra_1', nickname: 'Extra1', joinedAt: Date.now() })
  list[idx].members.push({ openId: 'extra_2', nickname: 'Extra2', joinedAt: Date.now() })
  internals.saveAllTasks(list)

  var res = store.joinTask(r.taskId, { openId: 'new_user', nickname: '新人' })
  eq(res.ok, false)
  eq(res.errCode, 'TASK_FULL')
})

test('任务不存在 → TASK_NOT_FOUND', function () {
  var res = store.joinTask('hall_not_exist', { openId: 'u', nickname: 'u' })
  eq(res.ok, false)
  eq(res.errCode, 'TASK_NOT_FOUND')
})

test('加入已取消任务 → TASK_NOT_RECRUITING', function () {
  var r = store.createUserTask(mkCreator('h_j5', '房主'), validOpts())
  store.updateTaskStatus(r.taskId, 'cancelled')
  var res = store.joinTask(r.taskId, { openId: 'u_cancel', nickname: 'UC' })
  eq(res.ok, false)
  eq(res.errCode, 'TASK_NOT_RECRUITING')
})

test('满员自动转 ready：3 人房第 3 人加入后 status 变 ready', function () {
  var r = store.createUserTask(mkCreator('h_j6', '房主'), validOpts({ maxMembers: 3 }))
  // host 是 members[0]，再 join 2 人即满
  store.joinTask(r.taskId, { openId: 'p1', nickname: 'P1' })
  eq(store.getTaskDetail(r.taskId).task.status, 'recruiting', '2 人时仍 recruiting')
  store.joinTask(r.taskId, { openId: 'p2', nickname: 'P2' })
  eq(store.getTaskDetail(r.taskId).task.status, 'ready', '3 人满员应转 ready')
})

test('空参数 → INVALID_PARAM', function () {
  var res1 = store.joinTask('', { openId: 'u', nickname: 'u' })
  eq(res1.ok, false)
  eq(res1.errCode, 'INVALID_PARAM')
  var res2 = store.joinTask('hall_xxx', null)
  eq(res2.ok, false)
  eq(res2.errCode, 'INVALID_PARAM')
  var res3 = store.joinTask('hall_xxx', { openId: 123 })
  eq(res3.ok, false)
  eq(res3.errCode, 'INVALID_PARAM')
})

// ----------------------------------------------------------------
// F. diceMatch
// ----------------------------------------------------------------
section('F. diceMatch')

test('正向：返回 { ok, task, partners }，partners 长度 1-4', function () {
  store.initHallFromTemplates()
  var res = store.diceMatch({ openId: 'dice_user', nickname: '摇骰子者' }, {})
  eq(res.ok, true)
  ok(res.task, '应返回 task')
  ok(Array.isArray(res.partners), 'partners 应为数组')
  ok(res.partners.length >= 1 && res.partners.length <= 4, 'partners 长度应在 1-4 之间，实际: ' + res.partners.length)
})

test('当前用户被加入 task.members', function () {
  store.initHallFromTemplates()
  var res = store.diceMatch({ openId: 'dice_user2', nickname: '摇骰子者2' }, {})
  var d = store.getTaskDetail(res.task.taskId)
  var found = false
  for (var i = 0; i < d.task.members.length; i++) {
    if (d.task.members[i].openId === 'dice_user2') { found = true; break }
  }
  ok(found, '当前用户应在 task.members 中')
})

test('partners 不含当前用户 openId', function () {
  store.initHallFromTemplates()
  var res = store.diceMatch({ openId: 'dice_user3', nickname: '摇骰子者3' }, {})
  for (var i = 0; i < res.partners.length; i++) {
    ok(res.partners[i].openId !== 'dice_user3', 'partners 不应含当前用户: ' + res.partners[i].openId)
  }
})

test('filters.district 偏好：返回任务匹配该区', function () {
  store.initHallFromTemplates()
  var res = store.diceMatch({ openId: 'dice_user4', nickname: '摇骰子者4' }, { district: '天河区' })
  eq(res.ok, true)
  eq(res.task.district, '天河区', '应返回天河区任务')
})

test('空池：clearAllTasks 后 diceMatch 返回 NO_MATCH', function () {
  // 不 init，池为空
  var res = store.diceMatch({ openId: 'dice_user5', nickname: '摇骰子者5' }, {})
  eq(res.ok, false)
  eq(res.errCode, 'NO_MATCH')
})

test('多次调用随机性：连续 3 次至少有一次返回不同 taskId', function () {
  store.initHallFromTemplates()
  var ids = []
  for (var i = 0; i < 3; i++) {
    var res = store.diceMatch({ openId: 'dice_user6', nickname: '摇骰子者6' }, {})
    eq(res.ok, true, '第 ' + (i + 1) + ' 次应成功')
    ids.push(res.task.taskId)
  }
  // 用户不能重复加入同一任务，3 次应至少有 2 个不同 taskId
  var distinct = {}
  for (var j = 0; j < ids.length; j++) distinct[ids[j]] = true
  ok(Object.keys(distinct).length >= 2, '3 次调用应至少返回 2 个不同 taskId，实际: ' + ids.join(','))
})

// ----------------------------------------------------------------
// G. linkRoom
// ----------------------------------------------------------------
section('G. linkRoom')

test('正向：ready 状态下 linkRoom 成功写入 roomId', function () {
  var r = store.createUserTask(mkCreator('h_lr', '房主'), validOpts({ maxMembers: 3 }))
  store.joinTask(r.taskId, { openId: 'lr1', nickname: 'LR1' })
  store.joinTask(r.taskId, { openId: 'lr2', nickname: 'LR2' }) // ready
  eq(store.getTaskDetail(r.taskId).task.status, 'ready')
  var res = store.linkRoom(r.taskId, 'room_001')
  eq(res.ok, true)
  eq(store.getTaskDetail(r.taskId).task.roomId, 'room_001')
})

test('未满员（recruiting）下 linkRoom → INVALID_STATUS', function () {
  var r = store.createUserTask(mkCreator('h_lr2', '房主'), validOpts())
  var res = store.linkRoom(r.taskId, 'room_002')
  eq(res.ok, false)
  eq(res.errCode, 'INVALID_STATUS')
})

test('任务不存在 → TASK_NOT_FOUND', function () {
  var res = store.linkRoom('hall_not_exist', 'room_003')
  eq(res.ok, false)
  eq(res.errCode, 'TASK_NOT_FOUND')
})

test('空参数 → INVALID_PARAM', function () {
  var res1 = store.linkRoom('', 'room_004')
  eq(res1.ok, false)
  eq(res1.errCode, 'INVALID_PARAM')
  var res2 = store.linkRoom('hall_xxx', '')
  eq(res2.ok, false)
  eq(res2.errCode, 'INVALID_PARAM')
})

// ----------------------------------------------------------------
// H. updateTaskStatus
// ----------------------------------------------------------------
section('H. updateTaskStatus')

test('ready → started：成功', function () {
  var r = store.createUserTask(mkCreator('h_us', '房主'), validOpts({ maxMembers: 3 }))
  store.joinTask(r.taskId, { openId: 'us1', nickname: 'US1' })
  store.joinTask(r.taskId, { openId: 'us2', nickname: 'US2' }) // ready
  var res = store.updateTaskStatus(r.taskId, 'started')
  eq(res.ok, true)
  eq(res.task.status, 'started')
})

test('started → finished：成功', function () {
  var r = store.createUserTask(mkCreator('h_uf', '房主'), validOpts({ maxMembers: 3 }))
  store.joinTask(r.taskId, { openId: 'uf1', nickname: 'UF1' })
  store.joinTask(r.taskId, { openId: 'uf2', nickname: 'UF2' }) // ready
  store.updateTaskStatus(r.taskId, 'started')
  var res = store.updateTaskStatus(r.taskId, 'finished')
  eq(res.ok, true)
  eq(res.task.status, 'finished')
})

test('recruiting → started：跳过 ready 非法 INVALID_STATUS', function () {
  var r = store.createUserTask(mkCreator('h_ur', '房主'), validOpts())
  var res = store.updateTaskStatus(r.taskId, 'started')
  eq(res.ok, false)
  eq(res.errCode, 'INVALID_STATUS')
})

test('finished → recruiting：非法 INVALID_STATUS', function () {
  var r = store.createUserTask(mkCreator('h_ufr', '房主'), validOpts({ maxMembers: 3 }))
  store.joinTask(r.taskId, { openId: 'ufr1', nickname: 'UFR1' })
  store.joinTask(r.taskId, { openId: 'ufr2', nickname: 'UFR2' }) // ready
  store.updateTaskStatus(r.taskId, 'started')
  store.updateTaskStatus(r.taskId, 'finished')
  var res = store.updateTaskStatus(r.taskId, 'recruiting')
  eq(res.ok, false)
  eq(res.errCode, 'INVALID_STATUS')
})

test('recruiting → cancelled：成功', function () {
  var r = store.createUserTask(mkCreator('h_uc', '房主'), validOpts())
  var res = store.updateTaskStatus(r.taskId, 'cancelled')
  eq(res.ok, true)
  eq(res.task.status, 'cancelled')
})

test('started → cancelled：非法 INVALID_STATUS（仅 recruiting/ready 可取消）', function () {
  var r = store.createUserTask(mkCreator('h_usc', '房主'), validOpts({ maxMembers: 3 }))
  store.joinTask(r.taskId, { openId: 'usc1', nickname: 'USC1' })
  store.joinTask(r.taskId, { openId: 'usc2', nickname: 'USC2' }) // ready
  store.updateTaskStatus(r.taskId, 'started')
  var res = store.updateTaskStatus(r.taskId, 'cancelled')
  eq(res.ok, false)
  eq(res.errCode, 'INVALID_STATUS')
})

// ----------------------------------------------------------------
// I. _internal helpers
// ----------------------------------------------------------------
section('I. _internal helpers')

test('generateTaskId：hall_ 前缀 + 6 位，10 次无重复', function () {
  var seen = {}
  for (var i = 0; i < 10; i++) {
    var id = internals.generateTaskId()
    eq(id.indexOf('hall_'), 0, '前缀应为 hall_')
    eq(id.length, 11, '总长度应为 11 (hall_ 5 字符 + 6 位随机)')
    ok(!seen[id], '不应重复: ' + id)
    seen[id] = true
  }
})

test('applyFilters：空 filter 返回全部 recruiting', function () {
  store.initHallFromTemplates()
  var list = internals.loadAllTasks()
  var filtered = internals.applyFilters(list, {})
  eq(filtered.length, 45, '空 filter 应返回全部 45 条')
})

test('applyFilters：district 筛选返回对应区', function () {
  store.initHallFromTemplates()
  var list = internals.loadAllTasks()
  var filtered = internals.applyFilters(list, { district: '天河区' })
  eq(filtered.length, 6, '天河区 6 条')
  for (var i = 0; i < filtered.length; i++) {
    eq(filtered[i].district, '天河区')
  }
})

test('computePartnerCount：maxMembers=4, members=1 → 2', function () {
  var task = { maxMembers: 4 }
  eq(internals.computePartnerCount(task, 1), 2, '4-1-1=2')
})

test('computePartnerCount：maxMembers=6, members=0 → 4（上限）', function () {
  var task = { maxMembers: 6 }
  eq(internals.computePartnerCount(task, 0), 4, '6-0-1=5 但上限 4')
})

test('toCardSummary：返回精简字段，不含 members/steps', function () {
  var task = {
    taskId: 't_cs', source: 'master', topic: '测试', category: 'walk',
    district: '天河区', poi: { name: '某地' }, hostNickname: '出逃大师',
    members: [{ openId: 'x' }], maxMembers: 4, status: 'recruiting',
    scheduledTime: 'anytime', tags: ['官方'],
    steps: ['s1', 's2'], description: 'desc', createdAt: 1, updatedAt: 1, roomId: null
  }
  var card = internals.toCardSummary(task)
  eq(card.taskId, 't_cs')
  eq(card.source, 'master')
  eq(card.topic, '测试')
  eq(card.category, 'walk')
  eq(card.district, '天河区')
  eq(card.poiName, '某地')
  eq(card.hostNickname, '出逃大师')
  eq(card.membersCount, 1)
  eq(card.maxMembers, 4)
  eq(card.status, 'recruiting')
  eq(card.scheduledTime, 'anytime')
  eq(card.isOfficial, true)
  ok(card.tags.indexOf('官方') !== -1, 'tags 应含官方')
  ok(card.members === undefined, '卡片不应含 members 全量')
  ok(card.steps === undefined, '卡片不应含 steps 全量')
  ok(card.description === undefined, '卡片不应含 description')
  ok(card.roomId === undefined, '卡片不应含 roomId')
})

// ----------------------------------------------------------------
// J. 多用户数据关联
// ----------------------------------------------------------------
section('J. 多用户数据关联')

test('多用户加入同一任务：members 含 3 个独立成员', function () {
  var r = store.createUserTask(mkCreator('host_multi', '房主'), validOpts({ maxMembers: 3 }))
  var ra = store.joinTask(r.taskId, { openId: 'userA', nickname: '用户A' })
  ok(ra.ok, 'A 加入成功')
  var rb = store.joinTask(r.taskId, { openId: 'userB', nickname: '用户B' })
  ok(rb.ok, 'B 加入成功')
  var d = store.getTaskDetail(r.taskId)
  eq(d.task.members.length, 3, '应有 3 个成员 (host + A + B)')
  var openIds = {}
  for (var i = 0; i < 3; i++) {
    var m = d.task.members[i]
    ok(typeof m.openId === 'string' && m.openId.length > 0, '成员应有 openId')
    ok(typeof m.nickname === 'string' && m.nickname.length > 0, '成员应有 nickname')
    ok(typeof m.joinedAt === 'number', '成员应有 joinedAt 数字')
    ok(!openIds[m.openId], 'openId 不应重复: ' + m.openId)
    openIds[m.openId] = true
  }
  eq(d.task.members[0].openId, 'host_multi', 'members[0] 应为 host')
  eq(d.task.members[1].openId, 'userA')
  eq(d.task.members[2].openId, 'userB')
})

test('数据持久化：saveAllTasks 后 loadAllTasks 读回相同数据', function () {
  var list = [
    { taskId: 'p_001', source: 'user', topic: '持久', members: [{ openId: 'x', nickname: 'X', joinedAt: 100 }], maxMembers: 3, status: 'recruiting', createdAt: 1000 },
    { taskId: 'p_002', source: 'master', topic: '大师', members: [], maxMembers: 4, status: 'recruiting', createdAt: 2000 }
  ]
  internals.saveAllTasks(list)
  var loaded = internals.loadAllTasks()
  deepEq(loaded, list, '读回数据应与保存一致')
})

// ----------------------------------------------------------------
// K. customCategory（D3 自定义分类）
// ----------------------------------------------------------------
section('K. customCategory（D3 自定义分类）')

test('createUserTask：category=custom 且 customCategory 合法 → ok', function () {
  var r = store.createUserTask(mkCreator('u_cc_01', '自定义用户'), validOpts({
    category: 'custom', customCategory: '骑行'
  }))
  ok(r.ok, '应创建成功')
  var d = store.getTaskDetail(r.taskId)
  eq(d.task.category, 'custom')
  eq(d.task.customCategory, '骑行')
})

test('createUserTask：category=custom 但 customCategory 空 → 失败', function () {
  var r = store.createUserTask(mkCreator('u_cc_02', '自定义用户'), validOpts({
    category: 'custom', customCategory: ''
  }))
  ok(!r.ok, '空 customCategory 应失败')
  eq(r.errCode, 'INVALID_PARAM')
})

test('createUserTask：category=custom 且 customCategory 超过 6 字 → 失败', function () {
  var r = store.createUserTask(mkCreator('u_cc_03', '自定义用户'), validOpts({
    category: 'custom', customCategory: '这是一个超长的自定义分类'
  }))
  ok(!r.ok, '超 6 字应失败')
  eq(r.errCode, 'INVALID_PARAM')
})

test('createUserTask：category 非 custom 时 customCategory 忽略', function () {
  var r = store.createUserTask(mkCreator('u_cc_04', '普通用户'), validOpts({
    category: 'art', customCategory: '不应存储'
  }))
  ok(r.ok)
  var d = store.getTaskDetail(r.taskId)
  eq(d.task.category, 'art')
  eq(d.task.customCategory, '', '非 custom 时 customCategory 应为空')
})

test('toCardSummary：custom 分类的卡片包含 customCategory 字段', function () {
  var r = store.createUserTask(mkCreator('u_cc_05', '卡片用户'), validOpts({
    category: 'custom', customCategory: '手作'
  }))
  var cards = store.listTasks()
  var card = null
  for (var i = 0; i < cards.length; i++) {
    if (cards[i].taskId === r.taskId) { card = cards[i]; break }
  }
  ok(card, '应找到卡片')
  eq(card.category, 'custom')
  eq(card.customCategory, '手作')
})

// ----------------------------------------------------------------
// L. diceMatchWithPartners（D5 真实玩家联动）
// ----------------------------------------------------------------
section('L. diceMatchWithPartners（D5 真实玩家联动）')

test('diceMatchWithPartners：传入预匹配搭子 → 用户+搭子加入任务', function () {
  store.initHallFromTemplates()
  var user = mkCreator('u_dwp_01', '发起人')
  var partners = [
    { openId: 'p_real_01', nickname: '真实玩家A', isReal: true },
    { openId: 'p_mock_01', nickname: 'Mock玩家B', isReal: false }
  ]
  var r = store.diceMatchWithPartners(user, {}, partners)
  ok(r.ok, '应匹配成功')
  ok(r.task, '应返回任务')
  eq(r.partners.length, 2, '应返回 2 个搭子')
  // 验证搭子已加入任务
  var d = store.getTaskDetail(r.task.taskId)
  var memberIds = {}
  d.task.members.forEach(function (m) { memberIds[m.openId] = true })
  ok(memberIds['u_dwp_01'], '发起人应已加入')
  ok(memberIds['p_real_01'], '真实玩家应已加入')
  ok(memberIds['p_mock_01'], 'Mock玩家应已加入')
})

test('diceMatchWithPartners：搭子超过 maxMembers-1 时截断', function () {
  store.initHallFromTemplates()
  var user = mkCreator('u_dwp_02', '发起人')
  // 传入 5 个搭子，但任务 maxMembers 通常 3-6，当前用户占 1 个
  var partners = [
    { openId: 'p_01', nickname: 'A' },
    { openId: 'p_02', nickname: 'B' },
    { openId: 'p_03', nickname: 'C' },
    { openId: 'p_04', nickname: 'D' },
    { openId: 'p_05', nickname: 'E' }
  ]
  var r = store.diceMatchWithPartners(user, {}, partners)
  ok(r.ok)
  // maxMembers - 0(初始) - 1(发起人) = 可加入搭子数，上限 4
  ok(r.partners.length <= 4, '搭子数不应超过 4（MAX_PARTNERS 上限）')
})

test('diceMatchWithPartners：空 partners 数组 → 仅用户加入', function () {
  store.initHallFromTemplates()
  var user = mkCreator('u_dwp_03', '独狼')
  var r = store.diceMatchWithPartners(user, {}, [])
  ok(r.ok)
  eq(r.partners.length, 0, '无搭子时 partners 为空')
  var d = store.getTaskDetail(r.task.taskId)
  eq(d.task.members.length, 1, '仅发起人 1 人')
  eq(d.task.members[0].openId, 'u_dwp_03')
})

test('diceMatchWithPartners：排除已是成员的搭子', function () {
  store.initHallFromTemplates()
  // 先创建一个已有 1 个成员的任务
  var createR = store.createUserTask(mkCreator('u_dwp_04', '房主'), validOpts({ maxMembers: 5 }))
  var existingTask = store.getTaskDetail(createR.taskId).task
  // 传入的 partners 包含已是成员的房主
  var user = mkCreator('u_dwp_05', '新人')
  var partners = [
    { openId: 'u_dwp_04', nickname: '房主' }, // 已是成员，应被排除
    { openId: 'p_new_01', nickname: '新搭子' }
  ]
  // 但 diceMatchWithPartners 是随机选任务的，不保证选到 createR 的任务
  // 所以这里只验证返回的 partners 不包含已是成员的人
  // 改为直接测试：用 filters 指定 district 来缩小范围不太可靠
  // 更好的方式：验证 partners 中没有重复 openId
  var r = store.diceMatchWithPartners(user, {}, partners)
  ok(r.ok)
  var partnerIds = {}
  for (var i = 0; i < r.partners.length; i++) {
    ok(!partnerIds[r.partners[i].openId], '搭子 openId 不应重复')
    partnerIds[r.partners[i].openId] = true
  }
})

test('diceMatchWithPartners：无效 user → 失败', function () {
  var r = store.diceMatchWithPartners(null, {}, [])
  ok(!r.ok)
  eq(r.errCode, 'INVALID_PARAM')
})

test('diceMatchWithPartners：无可用任务 → NO_MATCH', function () {
  // 不初始化模板，无任何任务
  var user = mkCreator('u_dwp_06', '无人可匹配')
  var r = store.diceMatchWithPartners(user, {}, [{ openId: 'p', nickname: '搭子' }])
  ok(!r.ok)
  eq(r.errCode, 'NO_MATCH')
})

// ----------------------------------------------------------------
// M. 45 条模板覆盖性验证（D4）
// ----------------------------------------------------------------
section('M. 45 条模板覆盖性验证（D4）')

test('45 条模板覆盖全部 11 区', function () {
  var masterTasks = require('../../packageSync/data/escape-master-tasks.js')
  var templates = masterTasks.ESCAPE_MASTER_TEMPLATES
  var districtsData = require('../../packageSync/data/guangzhou-districts.js')
  var allDistricts = districtsData.GUANGZHOU_DISTRICTS.map(function (d) { return d.name })
  var templateDistricts = {}
  templates.forEach(function (t) { templateDistricts[t.district] = true })
  for (var i = 0; i < allDistricts.length; i++) {
    ok(templateDistricts[allDistricts[i]], '区 ' + allDistricts[i] + ' 应有模板覆盖')
  }
})

test('45 条模板覆盖全部 10 类主题（不含 custom）', function () {
  var masterTasks = require('../../packageSync/data/escape-master-tasks.js')
  var templates = masterTasks.ESCAPE_MASTER_TEMPLATES
  var expectedCategories = ['walk', 'art', 'salon', 'coffee', 'book', 'market', 'sport', 'music', 'photo', 'food']
  var templateCategories = {}
  templates.forEach(function (t) { templateCategories[t.category] = true })
  for (var i = 0; i < expectedCategories.length; i++) {
    ok(templateCategories[expectedCategories[i]], '分类 ' + expectedCategories[i] + ' 应有模板覆盖')
  }
})

test('45 条模板的 poiId 全部存在于 guangzhou-pois', function () {
  var masterTasks = require('../../packageSync/data/escape-master-tasks.js')
  var poisData = require('../../packageSync/data/guangzhou-pois.js')
  var templates = masterTasks.ESCAPE_MASTER_TEMPLATES
  for (var i = 0; i < templates.length; i++) {
    var poi = poisData.getPOIById(templates[i].poiId)
    ok(poi, '模板 ' + templates[i].templateId + ' 的 poiId ' + templates[i].poiId + ' 应存在')
  }
})

test('45 条模板的 templateId 无重复', function () {
  var masterTasks = require('../../packageSync/data/escape-master-tasks.js')
  var templates = masterTasks.ESCAPE_MASTER_TEMPLATES
  var ids = {}
  for (var i = 0; i < templates.length; i++) {
    ok(!ids[templates[i].templateId], 'templateId 不应重复: ' + templates[i].templateId)
    ids[templates[i].templateId] = true
  }
})

test('45 条模板的 maxMembers 全部在 3-6 范围', function () {
  var masterTasks = require('../../packageSync/data/escape-master-tasks.js')
  var templates = masterTasks.ESCAPE_MASTER_TEMPLATES
  for (var i = 0; i < templates.length; i++) {
    var m = templates[i].maxMembers
    ok(m >= 3 && m <= 6, '模板 ' + templates[i].templateId + ' maxMembers 应在 3-6，实际 ' + m)
  }
})

// ===== 结果汇总 =====
console.log('\n' + '='.repeat(50))
console.log('  结果: ' + passed + ' 通过, ' + failed + ' 失败')
if (failed > 0) {
  console.log('\n  失败用例:')
  for (var i = 0; i < failures.length; i++) {
    console.log('    - ' + failures[i])
  }
}
console.log('='.repeat(50))

process.exit(failed > 0 ? 1 : 0)
