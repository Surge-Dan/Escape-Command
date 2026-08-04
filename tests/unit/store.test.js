// tests/unit/store.test.js
// 单元测试：group-room-store.js 全函数覆盖
// 运行: node tests/unit/store.test.js

const wx = require('../mock-wx.js')
// 注入 wx 到全局
global.wx = wx

const store = require('../../packageSync/utils/group-room-store.js')

let passCount = 0
let failCount = 0
const failures = []

function assert(condition, message) {
  if (condition) {
    passCount++
  } else {
    failCount++
    failures.push(message)
    console.log('  ✗ FAIL: ' + message)
  }
}

function assertEqual(actual, expected, message) {
  const pass = JSON.stringify(actual) === JSON.stringify(expected)
  if (pass) {
    passCount++
  } else {
    failCount++
    failures.push(message + ` (expected: ${JSON.stringify(expected)}, actual: ${JSON.stringify(actual)})`)
    console.log(`  ✗ FAIL: ${message}`)
    console.log(`    expected: ${JSON.stringify(expected)}`)
    console.log(`    actual:   ${JSON.stringify(actual)}`)
  }
}

function describe(name, fn) {
  console.log('\n=== ' + name + ' ===')
  fn()
}

function it(name, fn) {
  console.log('  > ' + name)
  fn()
}

function reset() {
  wx._reset()
}

// ===== 开始测试 =====

describe('C-01: createRoom', () => {
  beforeEach: reset()

  it('正常创建房间', () => {
    reset()
    const result = store.createRoom('周末探店', 4)
    assert(result.ok === true, '应返回 ok=true')
    assert(typeof result.roomId === 'string', 'roomId 应是字符串')
    assert(result.roomId.length === 6, 'roomId 应是 6 位')
  })

  it('主题正好 20 字应成功（边界值）', () => {
    reset()
    const result = store.createRoom('一二三四五六七八九十一二三四五六七八九十', 4)
    assert(result.ok === true, '20 字主题应成功')
  })

  it('人数正好 3 应成功（边界值）', () => {
    reset()
    const result = store.createRoom('测试', 3)
    assert(result.ok === true, '3 人应成功')
  })

  it('人数正好 6 应成功（边界值）', () => {
    reset()
    const result = store.createRoom('测试', 6)
    assert(result.ok === true, '6 人应成功')
  })

  it('创建后可加载', () => {
    reset()
    const created = store.createRoom('测试', 3)
    const loaded = store.loadRoom(created.roomId)
    assert(loaded.ok === true, '应能加载刚创建的房间')
    assertEqual(loaded.room.topic, '测试', '主题应匹配')
    assertEqual(loaded.room.maxMembers, 3, '人数应匹配')
    assertEqual(loaded.room.members.length, 1, '初始应有 1 个成员(host)')
    assertEqual(loaded.room.members[0].isHost, true, '第一个成员应是 host')
    assertEqual(loaded.room.status, 'waiting_members', '初始状态应为 waiting_members')
  })

  it('主题为空应失败', () => {
    reset()
    const result = store.createRoom('', 4)
    assert(result.ok === false, '空主题应返回 ok=false')
    assertEqual(result.errCode, 'INVALID_PARAM', 'errCode 应为 INVALID_PARAM')
  })

  it('主题超 20 字应失败', () => {
    reset()
    const result = store.createRoom('一二三四五六七八九十一二三四五六七八九十一', 4)
    assert(result.ok === false, '超 20 字主题应失败')
  })

  it('主题需 trim', () => {
    reset()
    const result = store.createRoom('  周末探店  ', 4)
    assert(result.ok === true, 'trim 后主题应可用')
    const loaded = store.loadRoom(result.roomId)
    assertEqual(loaded.room.topic, '周末探店', '主题应被 trim')
  })

  it('人数小于 3 应失败', () => {
    reset()
    const result = store.createRoom('测试', 2)
    assert(result.ok === false, '人数 < 3 应失败')
  })

  it('人数大于 6 应失败', () => {
    reset()
    const result = store.createRoom('测试', 7)
    assert(result.ok === false, '人数 > 6 应失败')
  })

  it('人数非整数应失败', () => {
    reset()
    const result = store.createRoom('测试', 4.5)
    assert(result.ok === false, '非整数人数应失败')
  })

  it('人数为 null 应失败', () => {
    reset()
    const result = store.createRoom('测试', null)
    assert(result.ok === false, 'null 人数应失败')
  })
})

describe('C-01: loadRoom', () => {
  it('加载不存在的房间', () => {
    reset()
    const result = store.loadRoom('NOTEXISTS')
    assert(result.ok === false, '不存在的房间应返回 ok=false')
    assertEqual(result.errCode, 'ROOM_NOT_FOUND', 'errCode 应为 ROOM_NOT_FOUND')
  })

  it('roomId 为空应失败', () => {
    reset()
    const result = store.loadRoom('')
    assert(result.ok === false, '空 roomId 应失败')
  })

  it('roomId 为 null 应失败', () => {
    reset()
    const result = store.loadRoom(null)
    assert(result.ok === false, 'null roomId 应失败')
  })
})

describe('C-01: cancelRoom', () => {
  it('正常取消房间', () => {
    reset()
    const created = store.createRoom('测试', 4)
    const result = store.cancelRoom(created.roomId)
    assert(result.ok === true, '应能取消自己的房间')
    const loaded = store.loadRoom(created.roomId)
    assertEqual(loaded.room.status, 'cancelled', '状态应变为 cancelled')
  })

  it('取消不存在的房间', () => {
    reset()
    const result = store.cancelRoom('NOTEXISTS')
    assert(result.ok === false, '取消不存在的房间应失败')
    assertEqual(result.errCode, 'ROOM_NOT_FOUND', 'errCode 应为 ROOM_NOT_FOUND')
  })

  it('重复取消应失败', () => {
    reset()
    const created = store.createRoom('测试', 4)
    store.cancelRoom(created.roomId)
    const result = store.cancelRoom(created.roomId)
    assert(result.ok === false, '重复取消应失败')
    assertEqual(result.errCode, 'ALREADY_CANCELLED', 'errCode 应为 ALREADY_CANCELLED')
  })
})

describe('C-02/C-03: addMockMember', () => {
  it('正常添加假成员', () => {
    reset()
    const created = store.createRoom('测试', 4)
    const result = store.addMockMember(created.roomId)
    assert(result.ok === true, '应能添加假成员')
    assertEqual(result.room.members.length, 2, '成员数应为 2')
    assertEqual(result.room.members[1].isHost, false, '新成员 isHost 应为 false')
    assert(!!result.room.members[1].nickname, '新成员应有昵称')
    assert(!!result.room.members[1].preference, '假成员应有偏好')
    assert(!!result.room.members[1].votes.time, '假成员应有投票')
  })

  it('填满房间后添加应失败', () => {
    reset()
    const created = store.createRoom('测试', 3)
    store.addMockMember(created.roomId)  // 2
    store.addMockMember(created.roomId)  // 3 = 满
    const result = store.addMockMember(created.roomId)  // 4 = 满
    assert(result.ok === false, '满员后添加应失败')
    assertEqual(result.errCode, 'ROOM_FULL', 'errCode 应为 ROOM_FULL')
  })

  it('取消的房间不能添加成员', () => {
    reset()
    const created = store.createRoom('测试', 4)
    store.cancelRoom(created.roomId)
    const result = store.addMockMember(created.roomId)
    assert(result.ok === false, '取消的房间不能添加成员')
    assertEqual(result.errCode, 'ROOM_CANCELLED', 'errCode 应为 ROOM_CANCELLED')
  })
})

describe('C-03: fillMockMembers', () => {
  it('一键填满', () => {
    reset()
    const created = store.createRoom('测试', 5)
    const result = store.fillMockMembers(created.roomId)
    assert(result.ok === true, '一键填满应成功')
    assertEqual(result.room.members.length, 5, '成员数应为 5')
  })

  it('已经满员再填满不影响', () => {
    reset()
    const created = store.createRoom('测试', 3)
    store.fillMockMembers(created.roomId)
    const result = store.fillMockMembers(created.roomId)
    assert(result.ok === true, '满员再填满应仍然 ok')
    assertEqual(result.room.members.length, 3, '成员数应仍为 3')
  })
})

describe('C-04: submitPreference', () => {
  it('正常提交偏好', () => {
    reset()
    const created = store.createRoom('测试', 4)
    const result = store.submitPreference(created.roomId, {
      interests: ['food', 'photo'],
      intensity: 'medium'
    })
    assert(result.ok === true, '应能提交偏好')
    assertEqual(result.room.members[0].preference.interests, ['food', 'photo'], '兴趣应匹配')
    assertEqual(result.room.members[0].preference.intensity, 'medium', '强度应匹配')
  })

  it('兴趣为空应失败', () => {
    reset()
    const created = store.createRoom('测试', 4)
    const result = store.submitPreference(created.roomId, {
      interests: [],
      intensity: 'medium'
    })
    assert(result.ok === false, '空兴趣应失败')
  })

  it('强度为空应失败', () => {
    reset()
    const created = store.createRoom('测试', 4)
    const result = store.submitPreference(created.roomId, {
      interests: ['food'],
      intensity: ''
    })
    assert(result.ok === false, '空强度应失败')
  })

  it('preference 为 null 应失败', () => {
    reset()
    const created = store.createRoom('测试', 4)
    const result = store.submitPreference(created.roomId, null)
    assert(result.ok === false, 'null preference 应失败')
  })

  it('不存在的房间应失败', () => {
    reset()
    const result = store.submitPreference('NOTEXISTS', {
      interests: ['food'],
      intensity: 'low'
    })
    assert(result.ok === false, '不存在的房间应失败')
  })
})

describe('C-05/06/07: submitVote', () => {
  it('正常提交时间投票', () => {
    reset()
    const created = store.createRoom('测试', 4)
    const result = store.submitVote(created.roomId, 'time', 'morning')
    assert(result.ok === true, '应能提交时间投票')
    assertEqual(result.room.members[0].votes.time, 'morning', '时间投票应匹配')
  })

  it('正常提交预算投票', () => {
    reset()
    const created = store.createRoom('测试', 4)
    const result = store.submitVote(created.roomId, 'budget', 'medium')
    assert(result.ok === true, '应能提交预算投票')
    assertEqual(result.room.members[0].votes.budget, 'medium', '预算投票应匹配')
  })

  it('正常提交风格投票', () => {
    reset()
    const created = store.createRoom('测试', 4)
    const result = store.submitVote(created.roomId, 'style', 'relax')
    assert(result.ok === true, '应能提交风格投票')
    assertEqual(result.room.members[0].votes.style, 'relax', '风格投票应匹配')
  })

  it('无效投票类型应失败', () => {
    reset()
    const created = store.createRoom('测试', 4)
    const result = store.submitVote(created.roomId, 'invalid_type', 'value')
    assert(result.ok === false, '无效投票类型应失败')
  })

  it('覆盖投票（改票）', () => {
    reset()
    const created = store.createRoom('测试', 4)
    store.submitVote(created.roomId, 'time', 'morning')
    const result = store.submitVote(created.roomId, 'time', 'evening')
    assert(result.ok === true, '改票应成功')
    assertEqual(result.room.members[0].votes.time, 'evening', '应更新为新值')
  })
})

describe('C-05/06/07: getVoteStats', () => {
  it('统计投票结果', () => {
    reset()
    const created = store.createRoom('测试', 3)
    // host 投票
    store.submitVote(created.roomId, 'time', 'morning')
    store.submitVote(created.roomId, 'budget', 'low')
    store.submitVote(created.roomId, 'style', 'relax')
    // 加 2 个假成员（带投票）
    store.addMockMember(created.roomId)
    store.addMockMember(created.roomId)

    const result = store.getVoteStats(created.roomId)
    assert(result.ok === true, '应能获取统计')
    assertEqual(result.stats.totalMembers, 3, '总成员应为 3')
    assertEqual(result.stats.allVoted, true, '所有人都应已投票')
    assertEqual(result.stats.votedMembers, 3, '已投票人数应为 3')
  })

  it('部分投票时 allVoted 为 false', () => {
    reset()
    const created = store.createRoom('测试', 3)
    store.submitVote(created.roomId, 'time', 'morning')
    // 只投了 time，没投 budget 和 style
    store.addMockMember(created.roomId)
    store.addMockMember(created.roomId)

    const result = store.getVoteStats(created.roomId)
    assertEqual(result.stats.allVoted, false, '部分投票时 allVoted 应为 false')
  })

  it('找出投票获胜者', () => {
    reset()
    const created = store.createRoom('测试', 4)
    store.submitVote(created.roomId, 'time', 'morning')
    store.addMockMember(created.roomId)  // afternoon
    store.addMockMember(created.roomId)  // evening
    store.addMockMember(created.roomId)  // morning (index 3 % 3 = 0)

    const result = store.getVoteStats(created.roomId)
    assert(result.stats.timeWinner !== null, '应有获胜者')
    assertEqual(result.stats.timeWinner.value, 'morning', '获胜者应为 morning (2票)')
  })
})

describe('C-08: generateScript', () => {
  it('正常生成剧本', () => {
    reset()
    const created = store.createRoom('测试', 3)
    // host 投票
    store.submitVote(created.roomId, 'time', 'afternoon')
    store.submitVote(created.roomId, 'budget', 'medium')
    store.submitVote(created.roomId, 'style', 'relax')
    // 填满假成员
    store.fillMockMembers(created.roomId)

    const result = store.generateScript(created.roomId)
    assert(result.ok === true, '应能生成剧本')
    assert(!!result.script, '应有剧本')
    assert(!!result.script.title, '剧本应有标题')
    assert(Array.isArray(result.script.steps), '剧本应有步骤数组')
    assert(result.script.steps.length > 0, '步骤不应为空')
    assertEqual(result.room.status, 'finished', '房间状态应变为 finished')
  })

  it('剧本根据投票风格匹配', () => {
    reset()
    const created = store.createRoom('测试', 3)
    store.submitVote(created.roomId, 'style', 'adventure')
    store.submitVote(created.roomId, 'budget', 'low')
    store.submitVote(created.roomId, 'time', 'morning')
    store.fillMockMembers(created.roomId)

    const result = store.generateScript(created.roomId)
    assert(result.ok === true, '应能生成剧本')
    // adventure + low 应匹配 "街角探秘行动"
    assert(result.script.title.indexOf('探秘') >= 0 || result.script.styleLabel === '探索',
      '冒险+省钱应匹配探索类剧本')
  })

  it('取消的房间不能生成剧本', () => {
    reset()
    const created = store.createRoom('测试', 3)
    store.cancelRoom(created.roomId)
    const result = store.generateScript(created.roomId)
    assert(result.ok === false, '取消的房间不能生成剧本')
    assertEqual(result.errCode, 'ROOM_CANCELLED', 'errCode 应为 ROOM_CANCELLED')
  })
})

describe('状态机: updateRoomStatus', () => {
  it('正常转换状态', () => {
    reset()
    const created = store.createRoom('测试', 4)
    const result = store.updateRoomStatus(created.roomId, 'voting')
    assert(result.ok === true, '应能转换状态')
    assertEqual(result.room.status, 'voting', '状态应变为 voting')
  })

  it('取消的房间不能转换状态', () => {
    reset()
    const created = store.createRoom('测试', 4)
    store.cancelRoom(created.roomId)
    const result = store.updateRoomStatus(created.roomId, 'voting')
    assert(result.ok === false, '取消的房间不能转换状态')
  })
})

describe('_internal: getMostFrequent', () => {
  it('找出最频繁元素', () => {
    const result = store._internal.getMostFrequent(['a', 'b', 'a', 'c', 'a', 'b'])
    assertEqual(result, 'a', '最频繁应为 a')
  })

  it('空数组返回 null', () => {
    const result = store._internal.getMostFrequent([])
    assertEqual(result, null, '空数组应返回 null')
  })

  it('null 输入返回 null', () => {
    const result = store._internal.getMostFrequent(null)
    assertEqual(result, null, 'null 应返回 null')
  })

  it('单个元素', () => {
    const result = store._internal.getMostFrequent(['only'])
    assertEqual(result, 'only', '单元素应返回该元素')
  })
})

describe('_internal: getWinner', () => {
  it('明确获胜者', () => {
    const options = [{ value: 'a' }, { value: 'b' }, { value: 'c' }]
    const counts = { a: 3, b: 1, c: 0 }
    const winner = store._internal.getWinner(counts, options)
    assertEqual(winner.value, 'a', '获胜者应为 a')
  })

  it('平票返回数组', () => {
    const options = [{ value: 'a' }, { value: 'b' }]
    const counts = { a: 2, b: 2 }
    const winner = store._internal.getWinner(counts, options)
    assert(Array.isArray(winner), '平票应返回数组')
    assertEqual(winner.length, 2, '应有 2 个获胜者')
  })

  it('全零返回 null', () => {
    const options = [{ value: 'a' }, { value: 'b' }]
    const counts = { a: 0, b: 0 }
    const winner = store._internal.getWinner(counts, options)
    assertEqual(winner, null, '全零应返回 null')
  })
})

describe('_internal: generateRoomId', () => {
  it('生成 6 位 ID', () => {
    for (let i = 0; i < 20; i++) {
      const id = store._internal.generateRoomId()
      assertEqual(id.length, 6, `第 ${i} 次：roomId 应为 6 位 (${id})`)
      assert(/^[A-Z0-9]{6}$/.test(id), `roomId 应为大写字母+数字 (${id})`)
    }
  })
})

// ===== 完整流程集成测试 =====
describe('集成测试: 完整流程（C-01→C-08）', () => {
  it('从创建到生成剧本的完整流程', () => {
    reset()
    // C-01 创建
    const created = store.createRoom('周末出逃', 4)
    assert(created.ok, '创建应成功')

    // C-03 填满成员
    const filled = store.fillMockMembers(created.roomId)
    assertEqual(filled.room.members.length, 4, '应有 4 个成员')

    // C-04 host 提交偏好
    const pref = store.submitPreference(created.roomId, {
      interests: ['food', 'photo'],
      intensity: 'medium'
    })
    assert(pref.ok, '偏好提交应成功')

    // C-05/06/07 host 投票
    store.submitVote(created.roomId, 'time', 'afternoon')
    store.submitVote(created.roomId, 'budget', 'medium')
    store.submitVote(created.roomId, 'style', 'social')

    // 检查投票统计
    const stats = store.getVoteStats(created.roomId)
    assert(stats.ok, '统计应成功')
    assert(stats.stats.allVoted, '所有人都应已投票')

    // C-08 生成剧本
    const script = store.generateScript(created.roomId)
    assert(script.ok, '剧本生成应成功')
    assert(!!script.script.title, '剧本应有标题')
    assert(script.script.steps.length >= 3, '剧本至少 3 个步骤')
    assertEqual(script.room.status, 'finished', '状态应为 finished')

    // 验证剧本包含成员
    assertEqual(script.script.members.length, 4, '剧本应包含 4 个成员名')
  })

  it('多次创建互不干扰', () => {
    reset()
    const r1 = store.createRoom('房间1', 3)
    const r2 = store.createRoom('房间2', 5)
    assert(r1.roomId !== r2.roomId, '两个房间 ID 应不同')

    store.addMockMember(r1.roomId)
    const l1 = store.loadRoom(r1.roomId)
    const l2 = store.loadRoom(r2.roomId)
    assertEqual(l1.room.members.length, 2, '房间1 应有 2 成员')
    assertEqual(l2.room.members.length, 1, '房间2 应有 1 成员')
  })
})

// ============================================================
// C-09: confirmReady 到齐确认
// ============================================================
describe('C-09: confirmReady', () => {
  it('正常到齐确认 WAITING → READY', () => {
    reset()
    const r = store.createRoom('到齐测试', 4)
    store.addMockMember(r.roomId)  // 2 人
    const result = store.confirmReady(r.roomId)
    assert(result.ok === true, '应返回 ok=true')
    assertEqual(result.room.status, 'ready', '状态应为 ready')
  })

  it('成员 < 2 不能确认到齐', () => {
    reset()
    const r = store.createRoom('人少', 4)  // 仅 1 人（发起人）
    const result = store.confirmReady(r.roomId)
    assert(result.ok === false, '1 人应失败')
    assertEqual(result.errCode, 'NOT_ENOUGH_MEMBERS', '错误码')
  })

  it('非 WAITING 状态不能确认到齐', () => {
    reset()
    const r = store.createRoom('状态', 4)
    store.addMockMember(r.roomId)
    store.confirmReady(r.roomId)  // → READY
    const result = store.confirmReady(r.roomId)  // READY 再确认
    assert(result.ok === false, 'READY 状态应失败')
    assertEqual(result.errCode, 'INVALID_STATUS', '错误码')
  })

  it('房间不存在', () => {
    reset()
    const result = store.confirmReady('NOTEXIST')
    assert(result.ok === false, '应失败')
    assertEqual(result.errCode, 'ROOM_NOT_FOUND', '错误码')
  })

  it('roomId 为空', () => {
    reset()
    const result = store.confirmReady('')
    assert(result.ok === false, '空 roomId 应失败')
    assertEqual(result.errCode, 'INVALID_PARAM', '错误码')
  })

  it('取消的房间不能确认到齐', () => {
    reset()
    const r = store.createRoom('取消', 4)
    store.addMockMember(r.roomId)
    store.cancelRoom(r.roomId)
    const result = store.confirmReady(r.roomId)
    assert(result.ok === false, '取消的房间应失败')
    assertEqual(result.errCode, 'ROOM_CANCELLED', '错误码')
  })

  it('READY 后可开始投票 → VOTING', () => {
    reset()
    const r = store.createRoom('投票', 4)
    store.addMockMember(r.roomId)
    store.confirmReady(r.roomId)  // → READY
    const result = store.updateRoomStatus(r.roomId, store.ROOM_STATUS.VOTING)
    assert(result.ok === true, 'READY → VOTING 应成功')
    assertEqual(result.room.status, 'voting', '状态应为 voting')
  })
})

// ============================================================
// C-10: leaveRoom 临时退出
// ============================================================
describe('C-10: leaveRoom', () => {
  it('房主退出 → 转取消房间 hostLeft=true', () => {
    reset()
    const r = store.createRoom('房主退', 4)
    store.addMockMember(r.roomId)
    const result = store.leaveRoom(r.roomId)
    assert(result.ok === true, '应返回 ok=true')
    assert(result.hostLeft === true, 'hostLeft 应为 true')
    assertEqual(result.room.status, 'cancelled', '房间应已取消')
    assertEqual(result.quorum.suggestion, 'cancel', 'quorum 建议 cancel')
  })

  it('FINISHED 状态不能退出', () => {
    reset()
    const r = store.createRoom('已完成', 3)
    store.fillMockMembers(r.roomId)
    // 全员投票
    const room = store.loadRoom(r.roomId).room
    room.members.forEach((m, i) => {
      store.submitVote(r.roomId, 'time', ['morning', 'afternoon', 'evening'][i % 3])
      // 注意 submitVote 只记 host 一票，mock 成员票在 addMockMember 已带
    })
    store.generateScript(r.roomId)  // → FINISHED
    const result = store.leaveRoom(r.roomId)
    assert(result.ok === false, 'FINISHED 应失败')
    assertEqual(result.errCode, 'INVALID_STATUS', '错误码')
  })

  it('READY 状态可以退出', () => {
    reset()
    const r = store.createRoom('READY退', 4)
    store.addMockMember(r.roomId)
    store.confirmReady(r.roomId)  // → READY
    const result = store.leaveRoom(r.roomId)
    assert(result.ok === true, 'READY 状态应可退')
    assert(result.hostLeft === true, '房主退 → hostLeft')
  })

  it('房间不存在', () => {
    reset()
    const result = store.leaveRoom('NOTEXIST')
    assert(result.ok === false, '应失败')
    assertEqual(result.errCode, 'ROOM_NOT_FOUND', '错误码')
  })

  it('roomId 为空', () => {
    reset()
    const result = store.leaveRoom('')
    assert(result.ok === false, '空 roomId 应失败')
    assertEqual(result.errCode, 'INVALID_PARAM', '错误码')
  })

  it('取消的房间不能退出', () => {
    reset()
    const r = store.createRoom('已取消', 4)
    store.cancelRoom(r.roomId)
    const result = store.leaveRoom(r.roomId)
    assert(result.ok === false, '取消的房间应失败')
    assertEqual(result.errCode, 'ROOM_CANCELLED', '错误码')
  })
})

// ============================================================
// C-11: checkQuorum 人数不足兜底
// ============================================================
describe('C-11: checkQuorum', () => {
  it('current=1 → suggestion=cancel', () => {
    const result = store.checkQuorum({ members: ['a'] })
    assertEqual(result.current, 1)
    assertEqual(result.min, 2)
    assertEqual(result.enough, false)
    assertEqual(result.suggestion, 'cancel')
  })

  it('current=2 → suggestion=small_team', () => {
    const result = store.checkQuorum({ members: ['a', 'b'] })
    assertEqual(result.current, 2)
    assertEqual(result.enough, true)
    assertEqual(result.suggestion, 'small_team')
  })

  it('current=3 → suggestion=ok', () => {
    const result = store.checkQuorum({ members: ['a', 'b', 'c'] })
    assertEqual(result.current, 3)
    assertEqual(result.suggestion, 'ok')
  })

  it('current=0 → suggestion=cancel', () => {
    const result = store.checkQuorum({ members: [] })
    assertEqual(result.current, 0)
    assertEqual(result.enough, false)
    assertEqual(result.suggestion, 'cancel')
  })

  it('null 入参保守返回 cancel', () => {
    const result = store.checkQuorum(null)
    assertEqual(result.current, 0)
    assertEqual(result.suggestion, 'cancel')
    assertEqual(result.ok, true)
  })

  it('undefined 入参保守返回 cancel', () => {
    const result = store.checkQuorum(undefined)
    assertEqual(result.current, 0)
    assertEqual(result.suggestion, 'cancel')
  })

  it('members 非数组保守返回 cancel', () => {
    const result = store.checkQuorum({ members: 'notarray' })
    assertEqual(result.current, 0)
    assertEqual(result.suggestion, 'cancel')
  })

  it('_internal.checkQuorum === checkQuorum', () => {
    assert(store._internal.checkQuorum === store.checkQuorum, '应同一引用')
  })

  it('leaveRoom 后联动 checkQuorum（房主退出 → cancel）', () => {
    reset()
    const r = store.createRoom('联动', 4)
    store.addMockMember(r.roomId)
    const result = store.leaveRoom(r.roomId)
    assertEqual(result.quorum.suggestion, 'cancel', '房主退出后建议 cancel')
  })

  it('MIN_MEMBERS 常量为 2', () => {
    assertEqual(store._internal.MIN_MEMBERS, 2)
  })
})

// 辅助：建一个 FINISHED 房间（含剧本/角色/线索）
function setupFinishedRoom(topic, maxMembers) {
  reset()
  const r = store.createRoom(topic || 'C-P2测试', maxMembers || 4)
  store.fillMockMembers(r.roomId)
  store.generateScript(r.roomId)
  return r.roomId
}

describe('C-14: 角色分配 buildRoles/assignRoles', () => {
  it('buildRoles 正常分配每人一个角色', () => {
    const members = [{ openId: 'a', nickname: 'A' }, { openId: 'b', nickname: 'B' }]
    const roles = store._internal.buildRoles(members, 'relax')
    assertEqual(roles.length, 2)
    assert(roles[0].role === '咖啡探路者', '第一个角色应是咖啡探路者')
    assert(roles[1].role === '甜品鉴赏师', '第二个角色应是甜品鉴赏师')
  })

  it('buildRoles style 非法用 relax 兜底', () => {
    const roles = store._internal.buildRoles([{ openId: 'a', nickname: 'A' }], 'unknown_style')
    assert(roles[0].role === '咖啡探路者', '非法 style 应兜底 relax')
  })

  it('buildRoles members 非数组返回 []', () => {
    assertEqual(store._internal.buildRoles(null, 'relax').length, 0)
    assertEqual(store._internal.buildRoles(undefined, 'relax').length, 0)
  })

  it('buildRoles 成员数超过角色库轮询', () => {
    const members = []
    for (let i = 0; i < 8; i++) members.push({ openId: 'a' + i, nickname: 'N' + i })
    const roles = store._internal.buildRoles(members, 'adventure')
    assertEqual(roles.length, 8)
    assert(roles[0].role === roles[6].role, '第 0 和第 6 应相同（6 角色轮询）')
  })

  it('generateScript 自动生成 roles', () => {
    reset()
    const r = store.createRoom('自动角色', 4)
    store.fillMockMembers(r.roomId)
    const result = store.generateScript(r.roomId)
    assert(result.ok === true, '生成剧本应成功')
    assert(Array.isArray(result.room.roles), '应自动生成 roles')
    assertEqual(result.room.roles.length, 4)
  })

  it('assignRoles 正常重分配', () => {
    const roomId = setupFinishedRoom('重分配', 4)
    const result = store.assignRoles(roomId)
    assert(result.ok === true, '应成功')
    assertEqual(result.room.roles.length, 4)
    assert(typeof result.room.roles[0].role === 'string', '角色应是字符串')
  })

  it('assignRoles 幂等（重复调用覆盖）', () => {
    const roomId = setupFinishedRoom('幂等', 4)
    store.assignRoles(roomId)
    const result = store.assignRoles(roomId)
    assert(result.ok === true, '重复调用应成功')
    assertEqual(result.room.roles.length, 4)
  })

  it('assignRoles 非 FINISHED 失败', () => {
    reset()
    const r = store.createRoom('未完成', 4)
    const result = store.assignRoles(r.roomId)
    assert(result.ok === false, '非 FINISHED 应失败')
    assertEqual(result.errCode, 'INVALID_STATUS')
  })

  it('assignRoles 房间不存在', () => {
    const result = store.assignRoles('NOTEXIST')
    assert(result.ok === false)
    assertEqual(result.errCode, 'ROOM_NOT_FOUND')
  })

  it('assignRoles 空 roomId', () => {
    const result = store.assignRoles('')
    assert(result.ok === false)
    assertEqual(result.errCode, 'INVALID_PARAM')
  })

  it('ROLE_LIBRARY 三类各 6 角色', () => {
    assertEqual(store.ROLE_LIBRARY.relax.length, 6)
    assertEqual(store.ROLE_LIBRARY.adventure.length, 6)
    assertEqual(store.ROLE_LIBRARY.social.length, 6)
  })
})

describe('C-15: 独立线索 buildClues/generateClues', () => {
  it('buildClues 正常分配', () => {
    const members = [{ openId: 'a', nickname: 'A' }, { openId: 'b', nickname: 'B' }]
    const steps = ['步骤一', '步骤二', '步骤三']
    const clues = store._internal.buildClues(members, steps)
    assertEqual(clues.length, 2)
    assertEqual(clues[0].clue, '步骤一')
    assertEqual(clues[1].clue, '步骤二')
  })

  it('buildClues steps 为空返回自由发挥', () => {
    const clues = store._internal.buildClues([{ openId: 'a', nickname: 'A' }], [])
    assertEqual(clues[0].clue, '自由发挥')
  })

  it('buildClues steps 非数组返回自由发挥', () => {
    const clues = store._internal.buildClues([{ openId: 'a', nickname: 'A' }], null)
    assertEqual(clues[0].clue, '自由发挥')
  })

  it('buildClues members 非数组返回 []', () => {
    assertEqual(store._internal.buildClues(null, ['s']).length, 0)
  })

  it('buildClues 成员数超过 steps 数轮询', () => {
    const members = [{ openId: 'a', nickname: 'A' }, { openId: 'b', nickname: 'B' }, { openId: 'c', nickname: 'C' }]
    const steps = ['仅一个步骤']
    const clues = store._internal.buildClues(members, steps)
    assertEqual(clues[2].clue, '仅一个步骤', '第 3 个应轮询到 steps[0]')
  })

  it('generateScript 自动生成 clues', () => {
    reset()
    const r = store.createRoom('自动线索', 4)
    store.fillMockMembers(r.roomId)
    const result = store.generateScript(r.roomId)
    assert(Array.isArray(result.room.clues), '应自动生成 clues')
    assertEqual(result.room.clues.length, 4)
  })

  it('generateClues 正常重新生成', () => {
    const roomId = setupFinishedRoom('重生成线索', 4)
    const result = store.generateClues(roomId)
    assert(result.ok === true)
    assertEqual(result.room.clues.length, 4)
  })

  it('generateClues 幂等', () => {
    const roomId = setupFinishedRoom('线索幂等', 4)
    store.generateClues(roomId)
    const result = store.generateClues(roomId)
    assert(result.ok === true)
  })

  it('generateClues 非 FINISHED 失败', () => {
    reset()
    const r = store.createRoom('未完成线索', 4)
    const result = store.generateClues(r.roomId)
    assert(result.ok === false)
    assertEqual(result.errCode, 'INVALID_STATUS')
  })

  it('generateClues 空 roomId', () => {
    const result = store.generateClues('')
    assert(result.ok === false)
    assertEqual(result.errCode, 'INVALID_PARAM')
  })
})

describe('C-16: 公开组局 listPublicRooms', () => {
  it('createRoom 默认 private', () => {
    reset()
    const r = store.createRoom('默认', 4)
    const loaded = store.loadRoom(r.roomId)
    assertEqual(loaded.room.visibility, 'private')
  })

  it('createRoom visibility=public', () => {
    reset()
    const r = store.createRoom('公开', 4, { visibility: 'public' })
    const loaded = store.loadRoom(r.roomId)
    assertEqual(loaded.room.visibility, 'public')
  })

  it('createRoom visibility 非法值兜底 private', () => {
    reset()
    const r = store.createRoom('非法', 4, { visibility: 'hack' })
    const loaded = store.loadRoom(r.roomId)
    assertEqual(loaded.room.visibility, 'private')
  })

  it('createRoom 向后兼容（两参调用）', () => {
    reset()
    const r = store.createRoom('兼容', 3)
    assert(r.ok === true, '两参调用应成功')
  })

  it('listPublicRooms 只返回 public 活跃房间', () => {
    reset()
    store.createRoom('私密', 4)
    store.createRoom('公开1', 4, { visibility: 'public' })
    store.createRoom('公开2', 4, { visibility: 'public' })
    const result = store.listPublicRooms()
    assert(result.ok === true)
    assertEqual(result.rooms.length, 2)
    assert(result.rooms.every(r => r.topic.startsWith('公开')), '应只含公开房间')
  })

  it('listPublicRooms 按 createdAt 倒序', () => {
    reset()
    store.createRoom('早', 4, { visibility: 'public' })
    store.createRoom('晚', 4, { visibility: 'public' })
    const result = store.listPublicRooms()
    assert(result.rooms[0].createdAt >= result.rooms[1].createdAt, '应倒序')
  })

  it('listPublicRooms 精简字段不含 members', () => {
    reset()
    store.createRoom('精简', 4, { visibility: 'public' })
    const result = store.listPublicRooms()
    const r = result.rooms[0]
    assert(r.members === undefined, '不应含 members')
    assert(r.membersCount !== undefined, '应含 membersCount')
    assert(r.roomId !== undefined)
    assert(r.topic !== undefined)
  })

  it('listPublicRooms 不返回已完成房间', () => {
    reset()
    const r = store.createRoom('已完成', 4, { visibility: 'public' })
    store.fillMockMembers(r.roomId)
    store.generateScript(r.roomId)
    const result = store.listPublicRooms()
    assertEqual(result.rooms.length, 0, '已完成不应进列表')
  })

  it('listPublicRooms 不返回已取消房间', () => {
    reset()
    const r = store.createRoom('已取消', 4, { visibility: 'public' })
    store.cancelRoom(r.roomId)
    const result = store.listPublicRooms()
    assertEqual(result.rooms.length, 0)
  })

  it('旧房间无 visibility 字段不进公开列表（兼容）', () => {
    reset()
    // 手动塞一个无 visibility 的旧房间
    wx.setStorageSync('groupRooms', [{ roomId: 'OLD001', topic: '旧', members: [], status: 'waiting_members', createdAt: 1 }])
    const result = store.listPublicRooms()
    assertEqual(result.rooms.length, 0, '无 visibility 字段不应进公开列表')
  })
})

describe('C-17: 申请加入 requestJoin', () => {
  // 辅助：构造一个公开房间，当前 openId 不在 members 中（可申请视角）
  function setupJoinablePublicRoom(status, membersCount, maxMembers) {
    reset()
    const r = store.createRoom('公开', maxMembers || 4, { visibility: 'public' })
    const loaded = store.loadRoom(r.roomId)
    // 填充 mock 成员（不含当前 openId）：用一个不同的 openId 占位
    const members = []
    for (let i = 0; i < (membersCount || 0); i++) {
      members.push({ openId: 'other_' + i, nickname: '成员' + i, isHost: i === 0, votes: { time: null, budget: null, style: null } })
    }
    loaded.room.members = members
    loaded.room.hostOpenId = 'other_0' // 把房主身份也转走，当前 openId 完全是外人
    loaded.room.status = status || store.ROOM_STATUS.WAITING
    wx.setStorageSync('groupRooms', [loaded.room])
    return r.roomId
  }

  it('正常申请返回 requestId', () => {
    const roomId = setupJoinablePublicRoom(store.ROOM_STATUS.WAITING, 1, 4)
    const result = store.requestJoin(roomId, '申请人')
    assert(result.ok === true, '应成功')
    assert(typeof result.requestId === 'string', '应返回 requestId')
  })

  it('申请后 joinRequests 含记录', () => {
    const roomId = setupJoinablePublicRoom(store.ROOM_STATUS.WAITING, 1, 4)
    store.requestJoin(roomId, '申请人')
    const loaded = store.loadRoom(roomId)
    assertEqual(loaded.room.joinRequests.length, 1)
    assertEqual(loaded.room.joinRequests[0].nickname, '申请人')
  })

  it('重复申请失败 ALREADY_REQUESTED', () => {
    const roomId = setupJoinablePublicRoom(store.ROOM_STATUS.WAITING, 1, 4)
    store.requestJoin(roomId, '申请人')
    const result = store.requestJoin(roomId, '再次申请')
    assert(result.ok === false)
    assertEqual(result.errCode, 'ALREADY_REQUESTED')
  })

  it('private 房间申请失败 NOT_PUBLIC', () => {
    reset()
    const r = store.createRoom('私密', 4)
    // 把当前 openId 移出 members 让它能申请
    const loaded = store.loadRoom(r.roomId)
    loaded.room.members = []
    loaded.room.hostOpenId = 'other'
    wx.setStorageSync('groupRooms', [loaded.room])
    const result = store.requestJoin(r.roomId, '申请人')
    assert(result.ok === false)
    assertEqual(result.errCode, 'NOT_PUBLIC')
  })

  it('已成员申请返回 ALREADY_JOINED', () => {
    reset()
    const r = store.createRoom('公开', 4, { visibility: 'public' })
    const result = store.requestJoin(r.roomId, '发起人')
    assert(result.ok === false)
    assertEqual(result.errCode, 'ALREADY_JOINED')
  })

  it('VOTING 状态申请失败 INVALID_STATUS', () => {
    const roomId = setupJoinablePublicRoom(store.ROOM_STATUS.VOTING, 1, 4)
    const result = store.requestJoin(roomId, '申请人')
    assert(result.ok === false)
    assertEqual(result.errCode, 'INVALID_STATUS')
  })

  it('FINISHED 状态申请失败', () => {
    const roomId = setupJoinablePublicRoom(store.ROOM_STATUS.FINISHED, 1, 4)
    const result = store.requestJoin(roomId, '申请人')
    assert(result.ok === false)
    assertEqual(result.errCode, 'INVALID_STATUS')
  })

  it('满员申请失败 ROOM_FULL', () => {
    const roomId = setupJoinablePublicRoom(store.ROOM_STATUS.WAITING, 4, 4)
    const result = store.requestJoin(roomId, '新人')
    assert(result.ok === false)
    assertEqual(result.errCode, 'ROOM_FULL')
  })

  it('房间不存在', () => {
    const result = store.requestJoin('NOTEXIST', '申请人')
    assert(result.ok === false)
    assertEqual(result.errCode, 'ROOM_NOT_FOUND')
  })

  it('空 roomId', () => {
    const result = store.requestJoin('', '申请人')
    assert(result.ok === false)
    assertEqual(result.errCode, 'INVALID_PARAM')
  })

  it('nickname 默认申请人', () => {
    const roomId = setupJoinablePublicRoom(store.ROOM_STATUS.WAITING, 1, 4)
    store.requestJoin(roomId, '')
    const loaded = store.loadRoom(roomId)
    assertEqual(loaded.room.joinRequests[0].nickname, '申请人')
  })
})

describe('C-18: 发起人审核 approveJoin/rejectJoin', () => {
  it('approve 正常通过（members+1, joinRequests-1）', () => {
    reset()
    const r = store.createRoom('审核', 4, { visibility: 'public' })
    const loaded = store.loadRoom(r.roomId)
    loaded.room.joinRequests = [{ requestId: 'req1', openId: 'newuser', nickname: '新人', requestedAt: 1 }]
    wx.setStorageSync('groupRooms', [loaded.room])
    const beforeMembers = loaded.room.members.length
    const result = store.approveJoin(r.roomId, 'req1')
    assert(result.ok === true, '应成功')
    assertEqual(result.room.joinRequests.length, 0)
    assertEqual(result.room.members.length, beforeMembers + 1)
    assertEqual(result.room.members[result.room.members.length - 1].nickname, '新人')
  })

  it('approve 非房主失败 NOT_HOST', () => {
    reset()
    const r = store.createRoom('审核', 4, { visibility: 'public' })
    const loaded = store.loadRoom(r.roomId)
    loaded.room.hostOpenId = 'other_host'
    loaded.room.joinRequests = [{ requestId: 'req1', openId: 'u', nickname: 'n', requestedAt: 1 }]
    wx.setStorageSync('groupRooms', [loaded.room])
    const result = store.approveJoin(r.roomId, 'req1')
    assert(result.ok === false)
    assertEqual(result.errCode, 'NOT_HOST')
  })

  it('approve 不存在 requestId 失败', () => {
    reset()
    const r = store.createRoom('审核', 4, { visibility: 'public' })
    const result = store.approveJoin(r.roomId, 'req_notexist')
    assert(result.ok === false)
    assertEqual(result.errCode, 'REQUEST_NOT_FOUND')
  })

  it('approve 满员失败 ROOM_FULL', () => {
    reset()
    const r = store.createRoom('满', 3, { visibility: 'public' })
    store.fillMockMembers(r.roomId)
    // 直接塞一个假申请
    const loaded = store.loadRoom(r.roomId)
    loaded.room.joinRequests = [{ requestId: 'req1', openId: 'newuser', nickname: '新人', requestedAt: 1 }]
    wx.setStorageSync('groupRooms', [loaded.room])
    const result = store.approveJoin(r.roomId, 'req1')
    assert(result.ok === false)
    assertEqual(result.errCode, 'ROOM_FULL')
  })

  it('reject 正常移除申请', () => {
    reset()
    const r = store.createRoom('拒绝', 4, { visibility: 'public' })
    const loaded = store.loadRoom(r.roomId)
    loaded.room.joinRequests = [{ requestId: 'req1', openId: 'newuser', nickname: '新人', requestedAt: 1 }]
    wx.setStorageSync('groupRooms', [loaded.room])
    const result = store.rejectJoin(r.roomId, 'req1')
    assert(result.ok === true)
    assertEqual(result.room.joinRequests.length, 0)
  })

  it('reject 不存在 requestId', () => {
    reset()
    const r = store.createRoom('拒绝', 4, { visibility: 'public' })
    const result = store.rejectJoin(r.roomId, 'req_notexist')
    assert(result.ok === false)
    assertEqual(result.errCode, 'REQUEST_NOT_FOUND')
  })

  it('reject 非房主失败 NOT_HOST（构造非房主场景）', () => {
    reset()
    const r = store.createRoom('拒绝', 4, { visibility: 'public' })
    // host 固定，构造一个 hostOpenId 不同的房间
    const loaded = store.loadRoom(r.roomId)
    loaded.room.hostOpenId = 'other_host'
    loaded.room.joinRequests = [{ requestId: 'req1', openId: 'u', nickname: 'n', requestedAt: 1 }]
    wx.setStorageSync('groupRooms', [loaded.room])
    const result = store.rejectJoin(r.roomId, 'req1')
    assert(result.ok === false)
    assertEqual(result.errCode, 'NOT_HOST')
  })

  it('空参数', () => {
    assert(store.approveJoin('', 'req').ok === false)
    assert(store.approveJoin('room', '').ok === false)
    assert(store.rejectJoin('', 'req').ok === false)
    assert(store.rejectJoin('room', '').ok === false)
  })
})

describe('C-19: 评价和举报 submitReview/reportRoom/buildReviewSummary', () => {
  it('buildReviewSummary 正常', () => {
    const reviews = [{ rating: 5 }, { rating: 4 }, { rating: 3 }]
    const s = store._internal.buildReviewSummary(reviews)
    assertEqual(s.total, 3)
    assertEqual(s.average, 4)
    assertEqual(s.distribution[5], 1)
    assertEqual(s.distribution[4], 1)
    assertEqual(s.distribution[3], 1)
  })

  it('buildReviewSummary 空数组', () => {
    const s = store._internal.buildReviewSummary([])
    assertEqual(s.total, 0)
    assertEqual(s.average, 0)
  })

  it('buildReviewSummary 非数组', () => {
    const s = store._internal.buildReviewSummary(null)
    assertEqual(s.total, 0)
    assertEqual(s.average, 0)
  })

  it('buildReviewSummary 平均分保留一位小数', () => {
    const s = store._internal.buildReviewSummary([{ rating: 5 }, { rating: 4 }])
    assertEqual(s.average, 4.5)
  })

  it('submitReview 正常评价返回 summary', () => {
    const roomId = setupFinishedRoom('评价', 4)
    const result = store.submitReview(roomId, { rating: 5, comment: '很棒' })
    assert(result.ok === true, '应成功')
    assertEqual(result.reviewSummary.total, 1)
    assertEqual(result.reviewSummary.average, 5)
  })

  it('submitReview 重复评价失败 ALREADY_REVIEWED', () => {
    const roomId = setupFinishedRoom('重复评', 4)
    store.submitReview(roomId, { rating: 5 })
    const result = store.submitReview(roomId, { rating: 4 })
    assert(result.ok === false)
    assertEqual(result.errCode, 'ALREADY_REVIEWED')
  })

  it('submitReview rating 非法失败', () => {
    const roomId = setupFinishedRoom('非法评分', 4)
    assert(store.submitReview(roomId, { rating: 0 }).ok === false)
    assert(store.submitReview(roomId, { rating: 6 }).ok === false)
    assert(store.submitReview(roomId, { rating: 3.5 }).ok === false)
    assert(store.submitReview(roomId, {}).ok === false)
  })

  it('submitReview 非 FINISHED 失败', () => {
    reset()
    const r = store.createRoom('未完成', 4)
    const result = store.submitReview(r.roomId, { rating: 5 })
    assert(result.ok === false)
    assertEqual(result.errCode, 'INVALID_STATUS')
  })

  it('submitReview comment 超长截断', () => {
    const roomId = setupFinishedRoom('长评论', 4)
    const longComment = 'a'.repeat(200)
    const result = store.submitReview(roomId, { rating: 5, comment: longComment })
    assert(result.ok === true)
    const loaded = store.loadRoom(roomId)
    assertEqual(loaded.room.reviews[0].comment.length, 100)
  })

  it('reportRoom 正常举报', () => {
    reset()
    const r = store.createRoom('举报', 4)
    const result = store.reportRoom(r.roomId, '垃圾广告')
    assert(result.ok === true)
    const loaded = store.loadRoom(r.roomId)
    assertEqual(loaded.room.reported, true)
    assertEqual(loaded.room.reportReason, '垃圾广告')
  })

  it('reportRoom 重复举报失败 ALREADY_REPORTED', () => {
    reset()
    const r = store.createRoom('重复举报', 4)
    store.reportRoom(r.roomId, '理由1')
    const result = store.reportRoom(r.roomId, '理由2')
    assert(result.ok === false)
    assertEqual(result.errCode, 'ALREADY_REPORTED')
  })

  it('reportRoom 空理由失败', () => {
    reset()
    const r = store.createRoom('空理由', 4)
    assert(store.reportRoom(r.roomId, '').ok === false)
    assert(store.reportRoom(r.roomId, '   ').ok === false)
  })

  it('reportRoom 超长理由失败', () => {
    reset()
    const r = store.createRoom('超长', 4)
    const result = store.reportRoom(r.roomId, 'a'.repeat(101))
    assert(result.ok === false)
    assertEqual(result.errCode, 'INVALID_PARAM')
  })

  it('reportRoom 房间不存在', () => {
    const result = store.reportRoom('NOTEXIST', '理由')
    assert(result.ok === false)
    assertEqual(result.errCode, 'ROOM_NOT_FOUND')
  })
})

// ===== 结果 =====
console.log('\n' + '='.repeat(50))
console.log(`单元测试结果: ${passCount} passed, ${failCount} failed`)
if (failures.length > 0) {
  console.log('\n失败项:')
  failures.forEach(f => console.log('  - ' + f))
}
console.log('='.repeat(50))
process.exit(failCount > 0 ? 1 : 0)
