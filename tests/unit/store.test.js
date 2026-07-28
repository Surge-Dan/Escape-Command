// tests/unit/store.test.js
// 单元测试：group-room-store.js 全函数覆盖
// 运行: node tests/unit/store.test.js

const wx = require('../mock-wx.js')
// 注入 wx 到全局
global.wx = wx

const store = require('../../utils/group-room-store.js')

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

// ===== 结果 =====
console.log('\n' + '='.repeat(50))
console.log(`单元测试结果: ${passCount} passed, ${failCount} failed`)
if (failures.length > 0) {
  console.log('\n失败项:')
  failures.forEach(f => console.log('  - ' + f))
}
console.log('='.repeat(50))
process.exit(failCount > 0 ? 1 : 0)
