// tests/unit/safety-helper.test.js
// safety-helper 单元测试（B1 安全合规）
// 运行: node tests/unit/safety-helper.test.js
//
// 覆盖维度：
//   1. isNightTime 夜间时段判定（边界值/非法输入）
//   2. filterNightSafety 夜间安全过滤（nightSafe/距离/户外）
//   3. checkContentSafety 内容安全检查（敏感词/空输入/大小写）
//   4. getEmergencyContacts 紧急联系信息完整性
//   5. shouldLimitDistance 距离限制判定
//   6. buildPrivacySummary 隐私说明结构
//   7. calcDistance Haversine 距离计算正确性
//   8. 不变性：不污染入参
//   9. 边界：全入参缺失/null/非法类型不抛异常

'use strict'

const safety = require('../../utils/safety-helper.js')

// ===== 自定义测试框架 =====
let passCount = 0
let failCount = 0
const failures = []
const groups = []

function assert(cond, msg) {
  if (cond) {
    passCount++
  } else {
    failCount++
    const where = groups.length ? groups.join(' > ') : '(root)'
    failures.push(where + ': ' + (msg || '(no message)'))
  }
}

function assertEqual(actual, expected, msg) {
  const ok = actual === expected
  if (!ok) {
    const where = groups.length ? groups.join(' > ') : '(root)'
    failures.push(where + ': ' + (msg || 'assertEqual') + ' | expected=' + JSON.stringify(expected) + ' actual=' + JSON.stringify(actual))
  }
  if (ok) passCount++
  else failCount++
}

function describe(name, fn) {
  groups.push(name)
  console.log('\n=== ' + name + ' ===')
  fn()
  groups.pop()
}

function it(name, fn) {
  groups.push(name)
  fn()
  groups.pop()
}

// ============================================================
// 1. isNightTime 夜间时段判定
// ============================================================
describe('isNightTime 夜间时段判定', function () {
  it('21:00 返回 true', function () {
    assertEqual(safety.isNightTime(21), true)
  })
  it('23:00 返回 true', function () {
    assertEqual(safety.isNightTime(23), true)
  })
  it('00:00 返回 true', function () {
    assertEqual(safety.isNightTime(0), true)
  })
  it('05:00 返回 true', function () {
    assertEqual(safety.isNightTime(5), true)
  })
  it('06:00 返回 false（不含6）', function () {
    assertEqual(safety.isNightTime(6), false)
  })
  it('20:00 返回 false', function () {
    assertEqual(safety.isNightTime(20), false)
  })
  it('12:00 返回 false', function () {
    assertEqual(safety.isNightTime(12), false)
  })
  it('非法输入 -1 保守返回 true', function () {
    assertEqual(safety.isNightTime(-1), true)
  })
  it('非法输入 24 保守返回 true', function () {
    assertEqual(safety.isNightTime(24), true)
  })
  it('非法输入 NaN 保守返回 true', function () {
    assertEqual(safety.isNightTime(NaN), true)
  })
  it('非法输入 null 保守返回 true', function () {
    assertEqual(safety.isNightTime(null), true)
  })
  it('非法输入 undefined 保守返回 true', function () {
    assertEqual(safety.isNightTime(undefined), true)
  })
})

// ============================================================
// 2. filterNightSafety 夜间安全过滤
// ============================================================
describe('filterNightSafety 夜间安全过滤', function () {
  const commands = [
    { id: 'c1', nightSafe: true, outdoor: true },
    { id: 'c2', nightSafe: false, outdoor: true },
    { id: 'c3', nightSafe: false, outdoor: false },
    { id: 'c4', nightSafe: true, outdoor: false }
  ]

  it('白天不过滤，全部保留', function () {
    const result = safety.filterNightSafety(commands, 14, 1000)
    assertEqual(result.length, 4)
  })
  it('夜间保留 nightSafe:true 或室内指令（outdoor:false）', function () {
    const result = safety.filterNightSafety(commands, 22, 1000)
    // c1(nightSafe:true,outdoor:true) + c3(nightSafe:false,outdoor:false) + c4(nightSafe:true,outdoor:false)
    // c2(nightSafe:false,outdoor:true) 被过滤
    assertEqual(result.length, 3)
    assertEqual(result[0].id, 'c1')
    assertEqual(result[1].id, 'c3')
    assertEqual(result[2].id, 'c4')
  })
  it('夜间 + 室内指令保留（outdoor:false）', function () {
    const indoorCmds = [
      { id: 'i1', nightSafe: false, outdoor: false },
      { id: 'i2', nightSafe: false, outdoor: false }
    ]
    const result = safety.filterNightSafety(indoorCmds, 23, 1000)
    assertEqual(result.length, 2)
  })
  it('夜间 + 有用户位置 + 距离内保留', function () {
    const cmds = [
      { id: 'n1', nightSafe: false, outdoor: true, location: { latitude: 39.9, longitude: 116.4 } }
    ]
    const userLoc = { latitude: 39.9, longitude: 116.4 }
    const result = safety.filterNightSafety(cmds, 23, 1000, userLoc)
    assertEqual(result.length, 1)
  })
  it('夜间 + 有用户位置 + 距离外过滤', function () {
    const cmds = [
      { id: 'n2', nightSafe: false, outdoor: true, location: { latitude: 40.0, longitude: 116.5 } }
    ]
    const userLoc = { latitude: 39.9, longitude: 116.4 }
    const result = safety.filterNightSafety(cmds, 23, 1000, userLoc)
    assertEqual(result.length, 0)
  })
  it('非数组输入返回空数组', function () {
    assertEqual(safety.filterNightSafety(null, 22, 1000).length, 0)
    assertEqual(safety.filterNightSafety(undefined, 22, 1000).length, 0)
    assertEqual(safety.filterNightSafety('abc', 22, 1000).length, 0)
  })
  it('不污染入参数组', function () {
    const original = commands.slice()
    safety.filterNightSafety(commands, 22, 1000)
    assertEqual(commands.length, original.length)
    assertEqual(commands[0].id, original[0].id)
  })
})

// ============================================================
// 3. checkContentSafety 内容安全检查
// ============================================================
describe('checkContentSafety 内容安全检查', function () {
  it('正常文本返回 safe:true', function () {
    const result = safety.checkContentSafety('今天天气真好，去公园散步')
    assertEqual(result.safe, true)
    assertEqual(result.matched.length, 0)
  })
  it('包含敏感词返回 safe:false', function () {
    const result = safety.checkContentSafety('这里有暴力和武器')
    assertEqual(result.safe, false)
    assert(result.matched.length >= 2, '应匹配至少2个敏感词')
  })
  it('空字符串返回 safe:true', function () {
    const result = safety.checkContentSafety('')
    assertEqual(result.safe, true)
  })
  it('null 返回 safe:true', function () {
    const result = safety.checkContentSafety(null)
    assertEqual(result.safe, true)
  })
  it('undefined 返回 safe:true', function () {
    const result = safety.checkContentSafety(undefined)
    assertEqual(result.safe, true)
  })
  it('数字输入返回 safe:true', function () {
    const result = safety.checkContentSafety(12345)
    assertEqual(result.safe, true)
  })
  it('匹配单个敏感词', function () {
    const result = safety.checkContentSafety('这里有赌博内容')
    assertEqual(result.safe, false)
    assertEqual(result.matched[0], '赌博')
  })
})

// ============================================================
// 4. getEmergencyContacts 紧急联系信息
// ============================================================
describe('getEmergencyContacts 紧急联系信息', function () {
  it('返回对象包含 police/medical/fire/traffic', function () {
    const contacts = safety.getEmergencyContacts()
    assert(contacts.police, '缺少 police')
    assert(contacts.medical, '缺少 medical')
    assert(contacts.fire, '缺少 fire')
    assert(contacts.traffic, '缺少 traffic')
  })
  it('police 号码为 110', function () {
    const contacts = safety.getEmergencyContacts()
    assertEqual(contacts.police.number, '110')
  })
  it('medical 号码为 120', function () {
    const contacts = safety.getEmergencyContacts()
    assertEqual(contacts.medical.number, '120')
  })
  it('fire 号码为 119', function () {
    const contacts = safety.getEmergencyContacts()
    assertEqual(contacts.fire.number, '119')
  })
  it('traffic 号码为 122', function () {
    const contacts = safety.getEmergencyContacts()
    assertEqual(contacts.traffic.number, '122')
  })
  it('每个联系都有 name/number/desc', function () {
    const contacts = safety.getEmergencyContacts()
    Object.keys(contacts).forEach(function (key) {
      assert(contacts[key].name, key + ' 缺少 name')
      assert(contacts[key].number, key + ' 缺少 number')
      assert(contacts[key].desc, key + ' 缺少 desc')
    })
  })
})

// ============================================================
// 5. shouldLimitDistance 距离限制判定
// ============================================================
describe('shouldLimitDistance 距离限制判定', function () {
  it('夜间 + 户外指令 → true', function () {
    assertEqual(safety.shouldLimitDistance({ outdoor: true }, 22), true)
  })
  it('夜间 + 室内指令 → false', function () {
    assertEqual(safety.shouldLimitDistance({ outdoor: false }, 22), false)
  })
  it('白天 + 户外指令 → false', function () {
    assertEqual(safety.shouldLimitDistance({ outdoor: true }, 14), false)
  })
  it('夜间 + 无 outdoor 标记 → true（保守）', function () {
    assertEqual(safety.shouldLimitDistance({ id: 'c1' }, 22), true)
  })
  it('null 指令 → false', function () {
    assertEqual(safety.shouldLimitDistance(null, 22), false)
  })
})

// ============================================================
// 6. buildPrivacySummary 隐私说明结构
// ============================================================
describe('buildPrivacySummary 隐私说明结构', function () {
  it('返回对象包含 title 和 sections', function () {
    const summary = safety.buildPrivacySummary()
    assert(typeof summary.title === 'string', 'title 应为字符串')
    assert(Array.isArray(summary.sections), 'sections 应为数组')
    assert(summary.sections.length >= 3, '至少3个section')
  })
  it('每个 section 包含 title 和 desc', function () {
    const summary = safety.buildPrivacySummary()
    summary.sections.forEach(function (s, i) {
      assert(typeof s.title === 'string', 'section[' + i + '] 缺少 title')
      assert(typeof s.desc === 'string', 'section[' + i + '] 缺少 desc')
    })
  })
})

// ============================================================
// 7. calcDistance Haversine 距离计算
// ============================================================
describe('calcDistance Haversine 距离计算', function () {
  it('相同点距离为 0', function () {
    const d = safety.calcDistance(39.9, 116.4, 39.9, 116.4)
    assert(d < 1, '距离应 < 1米，实际 ' + d)
  })
  it('北京到上海约 1000+ km', function () {
    const d = safety.calcDistance(39.9, 116.4, 31.2, 121.5)
    assert(d > 1000000, '距离应 > 1000km，实际 ' + d)
    assert(d < 1200000, '距离应 < 1200km，实际 ' + d)
  })
  it('近距离约 100m', function () {
    // 约 0.001 度 ≈ 111m
    const d = safety.calcDistance(39.9, 116.4, 39.901, 116.4)
    assert(d > 80 && d < 130, '距离应 80-130m，实际 ' + d)
  })
  it('距离对称性', function () {
    const d1 = safety.calcDistance(39.9, 116.4, 31.2, 121.5)
    const d2 = safety.calcDistance(31.2, 121.5, 39.9, 116.4)
    assert(Math.abs(d1 - d2) < 0.01, '距离应对称')
  })
})

// ============================================================
// 最终报告
// ============================================================
console.log('\n' + '='.repeat(60))
console.log('  safety-helper 单元测试结果')
console.log('='.repeat(60))
console.log('  通过: ' + passCount + ' / 失败: ' + failCount)
if (failures.length > 0) {
  console.log('\n  失败项:')
  failures.forEach(function (f) { console.log('    ✗ ' + f) })
}
console.log('='.repeat(60))

process.exit(failCount > 0 ? 1 : 0)
