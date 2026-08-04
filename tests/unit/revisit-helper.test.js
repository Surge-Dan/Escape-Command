// tests/unit/revisit-helper.test.js
// B4-B 地图深化 · revisit-helper 单元测试
// 运行: node tests/unit/revisit-helper.test.js
//
// 覆盖：
//   - canRevisit 坐标校验
//   - buildRevisitCommand 指令种子生成（各类型）
//   - buildRevisitSummary 总结卡片文案
//   - 确定性（同输入同输出）
//   - 边界值与异常输入

'use strict'

const helper = require('../../utils/revisit-helper.js')

let passCount = 0
let failCount = 0
const failures = []

function assert(cond, msg) {
  if (cond) { passCount++ } else {
    failCount++
    failures.push(msg || 'fail')
    console.log('  ✗ FAIL: ' + (msg || 'fail'))
  }
}
function assertEqual(actual, expected, msg) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected)
  if (ok) { passCount++ } else {
    failCount++
    failures.push((msg || 'assertEqual') + ' | expected=' + JSON.stringify(expected) + ' actual=' + JSON.stringify(actual))
    console.log('  ✗ FAIL: ' + (msg || 'assertEqual') + ' | expected=' + JSON.stringify(expected) + ' actual=' + JSON.stringify(actual))
  }
}
function describe(name, fn) { console.log('\n=== ' + name + ' ==='); fn() }
function it(name, fn) { console.log('  > ' + name); fn() }

function makeRecord(over) {
  return Object.assign({
    id: 'r1',
    commandType: 'walk',
    commandTitle: '漫步徐汇',
    date: '2026-07-01',
    time: '10:00',
    location: { latitude: 31.23, longitude: 121.47, name: '徐汇' },
    locationName: '上海·徐汇',
    mood: 'happy'
  }, over || {})
}

// ============================================================
// canRevisit
// ============================================================
describe('canRevisit', () => {
  it('有坐标可重返', () => {
    assert(helper.canRevisit(makeRecord()) === true)
  })
  it('无坐标不可重返', () => {
    assert(helper.canRevisit(makeRecord({ location: null })) === false)
    assert(helper.canRevisit(makeRecord({ location: {} })) === false)
  })
  it('非数字坐标不可重返', () => {
    assert(helper.canRevisit(makeRecord({ location: { latitude: 'a', longitude: 121 } })) === false)
    assert(helper.canRevisit(makeRecord({ location: { latitude: NaN, longitude: 121 } })) === false)
    assert(helper.canRevisit(makeRecord({ location: { latitude: Infinity, longitude: 121 } })) === false)
  })
  it('null/undefined 不可重返', () => {
    assert(helper.canRevisit(null) === false)
    assert(helper.canRevisit(undefined) === false)
    assert(helper.canRevisit({}) === false)
  })
})

// ============================================================
// buildRevisitCommand 主入口
// ============================================================
describe('buildRevisitCommand', () => {
  it('返回指令种子结构', () => {
    const cmd = helper.buildRevisitCommand(makeRecord(), { nowTs: 1700000000000 })
    assert(!!cmd, '应返回指令')
    assertEqual(cmd.id, 'revisit_1700000000000_r1')
    assertEqual(cmd.type, 'walk')
    assertEqual(cmd.typeName, '漫步发现')
    assertEqual(cmd.duration, 20)
    assertEqual(cmd.revisit, true)
    assertEqual(cmd.revisitFrom, 'r1')
    assertEqual(cmd.location.latitude, 31.23)
    assertEqual(cmd.location.longitude, 121.47)
    assertEqual(cmd.locationName, '上海·徐汇')
    assert(typeof cmd.content === 'string' && cmd.content.length > 0, 'content 非空')
    assert(typeof cmd.tip === 'string' && cmd.tip.length > 0, 'tip 非空')
    assert(Array.isArray(cmd.steps) && cmd.steps.length === 4, 'steps 4 步')
  })

  it('无坐标返回 null', () => {
    assertEqual(helper.buildRevisitCommand(makeRecord({ location: null }), { nowTs: 1700000000000 }), null)
  })
  it('null 输入返回 null', () => {
    assertEqual(helper.buildRevisitCommand(null, { nowTs: 1700000000000 }), null)
    assertEqual(helper.buildRevisitCommand(undefined, { nowTs: 1700000000000 }), null)
  })

  it('各类型都有对应模板', () => {
    const types = ['color', 'walk', 'sense', 'collect', 'food', 'culture', 'breakthrough', 'custom']
    for (const t of types) {
      const cmd = helper.buildRevisitCommand(makeRecord({ commandType: t }), { nowTs: 1700000000000 })
      assert(!!cmd, t + ' 应返回指令')
      assertEqual(cmd.type, t)
      assert(typeof cmd.content === 'string' && cmd.content.length > 0, t + ' content 非空')
      assert(Array.isArray(cmd.steps) && cmd.steps.length === 4, t + ' steps 4 步')
    }
  })

  it('未知类型兜底为 walk 模板', () => {
    const cmd = helper.buildRevisitCommand(makeRecord({ commandType: 'unknown_type' }), { nowTs: 1700000000000 })
    assert(!!cmd, '未知类型应兜底返回指令')
    assert(typeof cmd.content === 'string' && cmd.content.length > 0, '未知类型 content 非空')
  })

  it('nightSafe 按类型设置', () => {
    assertEqual(helper.buildRevisitCommand(makeRecord({ commandType: 'sense' }), { nowTs: 1 }).nightSafe, true, 'sense nightSafe=true')
    assertEqual(helper.buildRevisitCommand(makeRecord({ commandType: 'color' }), { nowTs: 1 }).nightSafe, true, 'color nightSafe=true')
    assertEqual(helper.buildRevisitCommand(makeRecord({ commandType: 'walk' }), { nowTs: 1 }).nightSafe, false, 'walk nightSafe=false')
  })

  it('tip 含日期与标题', () => {
    const cmd = helper.buildRevisitCommand(makeRecord({ commandTitle: '测试出逃', date: '2026-07-01' }), { nowTs: 1 })
    assert(cmd.tip.indexOf('7月1日') >= 0, 'tip 含日期')
    assert(cmd.tip.indexOf('测试出逃') >= 0, 'tip 含标题')
  })

  it('revisitDate 格式为 M月D日', () => {
    const cmd = helper.buildRevisitCommand(makeRecord({ date: '2026-12-25' }), { nowTs: 1 })
    assertEqual(cmd.revisitDate, '12月25日')
  })

  it('startTime 时间戳也能提取日期', () => {
    const cmd = helper.buildRevisitCommand(makeRecord({ date: '', startTime: new Date('2026-06-15').getTime() }), { nowTs: 1 })
    assertEqual(cmd.revisitDate, '6月15日')
  })
})

// ============================================================
// 确定性：同输入同输出
// ============================================================
describe('确定性', () => {
  it('同 record 同种子产生同 content', () => {
    const rec = makeRecord({ id: 'deterministic1', commandType: 'walk' })
    const c1 = helper.buildRevisitCommand(rec, { nowTs: 1000 })
    const c2 = helper.buildRevisitCommand(rec, { nowTs: 2000 })
    assertEqual(c1.content, c2.content, '同 record content 应相同（仅 id 时间戳不同）')
  })

  it('不同 id 可能产生不同 content', () => {
    const c1 = helper.buildRevisitCommand(makeRecord({ id: 'aaa', commandType: 'walk' }), { nowTs: 1 })
    const c2 = helper.buildRevisitCommand(makeRecord({ id: 'zzz', commandType: 'walk' }), { nowTs: 1 })
    // 不强制必须不同（hash 可能碰撞），但至少验证不抛异常
    assert(typeof c1.content === 'string')
    assert(typeof c2.content === 'string')
  })
})

// ============================================================
// buildRevisitSummary
// ============================================================
describe('buildRevisitSummary', () => {
  it('返回标题/副标题/按钮文案', () => {
    const s = helper.buildRevisitSummary(makeRecord({ commandTitle: '测试', date: '2026-07-01', locationName: '徐汇' }))
    assert(s.title.indexOf('重返') >= 0, 'title 含重返')
    assert(s.subtitle.indexOf('徐汇') >= 0, 'subtitle 含地点')
    assert(s.subtitle.indexOf('测试') >= 0, 'subtitle 含标题')
    assertEqual(s.actionText, '生成新任务')
  })

  it('无日期时 title 兜底', () => {
    const s = helper.buildRevisitSummary(makeRecord({ date: '', startTime: null }))
    assertEqual(s.title, '重返此地')
  })

  it('无 locationName 用 location.name', () => {
    const s = helper.buildRevisitSummary(makeRecord({ locationName: '', location: { latitude: 31, longitude: 121, name: '某地' } }))
    assert(s.subtitle.indexOf('某地') >= 0, 'subtitle 用 location.name')
  })

  it('null 输入兜底默认文案', () => {
    const s = helper.buildRevisitSummary(null)
    assertEqual(s.title, '重返此地')
    assertEqual(s.actionText, '生成新任务')
  })

  it('空 record 兜底默认文案', () => {
    const s = helper.buildRevisitSummary({})
    assertEqual(s.title, '重返此地')
    assert(typeof s.subtitle === 'string' && s.subtitle.length > 0)
  })
})

// ============================================================
// 异常输入
// ============================================================
describe('异常输入', () => {
  it('options 为 null 不崩溃', () => {
    const cmd = helper.buildRevisitCommand(makeRecord(), null)
    assert(!!cmd, 'options=null 应仍返回指令')
    assert(typeof cmd.id === 'string' && cmd.id.indexOf('revisit_') === 0)
  })

  it('options.nowTs 非法兜底', () => {
    const cmd = helper.buildRevisitCommand(makeRecord(), { nowTs: -1 })
    assert(!!cmd)
    const cmd2 = helper.buildRevisitCommand(makeRecord(), { nowTs: NaN })
    assert(!!cmd2)
    const cmd3 = helper.buildRevisitCommand(makeRecord(), { nowTs: 'abc' })
    assert(!!cmd3)
  })

  it('record 无 id 用 startTime 作种子', () => {
    const cmd = helper.buildRevisitCommand(makeRecord({ id: '', startTime: 1700000000000 }), { nowTs: 1 })
    assert(!!cmd, '无 id 应仍返回指令')
    assert(typeof cmd.content === 'string' && cmd.content.length > 0)
  })

  it('record 无 id 无 startTime 不崩溃', () => {
    const cmd = helper.buildRevisitCommand(makeRecord({ id: '', startTime: null, date: '' }), { nowTs: 1 })
    assert(!!cmd, '应仍返回指令（种子为 0）')
    assert(typeof cmd.content === 'string')
  })
})

// ============================================================
// 最终报告
// ============================================================
console.log('\n' + '='.repeat(60))
console.log('  revisit-helper 单元测试报告')
console.log('='.repeat(60))
console.log('  ✓ Pass: ' + passCount)
console.log('  ✗ Fail: ' + failCount)
if (failures.length > 0) {
  console.log('  失败列表:')
  failures.forEach(f => console.log('    - ' + f))
}
console.log('='.repeat(60))

process.exit(failCount > 0 ? 1 : 0)
