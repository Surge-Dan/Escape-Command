// tests/unit/summary-builder.test.js
// B4 记忆回收 · summary-builder 单元测试
// 运行: node tests/unit/summary-builder.test.js

'use strict'

const summary = require('../../utils/summary-builder.js')

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
    id: 'r' + Math.random().toString(36).slice(2, 8),
    commandType: 'walk',
    commandTitle: '出逃',
    date: '2026-08-04',
    time: '10:00',
    duration: 20,
    mood: 'happy',
    location: { latitude: 31.23, longitude: 121.47 },
    city: '上海',
    photos: ['/p1.jpg']
  }, over || {})
}

// 固定时间戳便于测试：2026-08-15 12:00
const NOW = new Date('2026-08-15T12:00:00').getTime()

// ============================================================
// filterByMonth 月份筛选
// ============================================================
describe('filterByMonth', () => {
  it('筛选指定月份记录', () => {
    const records = [
      makeRecord({ id: 'r1', startTime: new Date('2026-08-04').getTime() }),
      makeRecord({ id: 'r2', startTime: new Date('2026-07-15').getTime() }),
      makeRecord({ id: 'r3', startTime: new Date('2026-08-20').getTime() })
    ]
    const aug = summary.filterByMonth(records, 2026, 8)
    assertEqual(aug.length, 2)
    assertEqual(aug[0].id, 'r1')
  })

  it('空数组返回空', () => {
    assertEqual(summary.filterByMonth([], 2026, 8).length, 0)
  })

  it('null 返回空', () => {
    assertEqual(summary.filterByMonth(null, 2026, 8).length, 0)
  })

  it('无效年份返回空', () => {
    const records = [makeRecord({ startTime: NOW })]
    assertEqual(summary.filterByMonth(records, 1999, 8).length, 0)
    assertEqual(summary.filterByMonth(records, 'abc', 8).length, 0)
  })

  it('无效月份返回空', () => {
    const records = [makeRecord({ startTime: NOW })]
    assertEqual(summary.filterByMonth(records, 2026, 0).length, 0)
    assertEqual(summary.filterByMonth(records, 2026, 13).length, 0)
  })

  it('date 字段记录也能被筛选', () => {
    const records = [makeRecord({ date: '2026-08-04', startTime: null })]
    const aug = summary.filterByMonth(records, 2026, 8)
    assertEqual(aug.length, 1)
  })
})

// ============================================================
// filterByQuarter 季度筛选
// ============================================================
describe('filterByQuarter', () => {
  it('Q3 包含 7-9 月', () => {
    const records = [
      makeRecord({ id: 'r1', startTime: new Date('2026-07-01').getTime() }),
      makeRecord({ id: 'r2', startTime: new Date('2026-08-15').getTime() }),
      makeRecord({ id: 'r3', startTime: new Date('2026-09-30').getTime() }),
      makeRecord({ id: 'r4', startTime: new Date('2026-06-30').getTime() })
    ]
    const q3 = summary.filterByQuarter(records, 2026, 3)
    assertEqual(q3.length, 3)
  })

  it('Q1 包含 1-3 月', () => {
    const records = [
      makeRecord({ id: 'r1', startTime: new Date('2026-01-15').getTime() }),
      makeRecord({ id: 'r2', startTime: new Date('2026-03-31').getTime() }),
      makeRecord({ id: 'r3', startTime: new Date('2026-04-01').getTime() })
    ]
    const q1 = summary.filterByQuarter(records, 2026, 1)
    assertEqual(q1.length, 2)
  })

  it('无效季度返回空', () => {
    assertEqual(summary.filterByQuarter([], 2026, 0).length, 0)
    assertEqual(summary.filterByQuarter([], 2026, 5).length, 0)
  })
})

// ============================================================
// countUniquePlaces 独立位置
// ============================================================
describe('countUniquePlaces', () => {
  it('相同坐标去重', () => {
    const records = [
      makeRecord({ location: { latitude: 31.234, longitude: 121.456 } }),
      makeRecord({ location: { latitude: 31.234, longitude: 121.456 } })
    ]
    assertEqual(summary.countUniquePlaces(records), 1)
  })
  it('无 location 跳过', () => {
    const records = [makeRecord({ location: null })]
    assertEqual(summary.countUniquePlaces(records), 0)
  })
  it('空数组返回 0', () => {
    assertEqual(summary.countUniquePlaces([]), 0)
  })
})

// ============================================================
// buildMonthlySummary 月度总结
// ============================================================
describe('buildMonthlySummary', () => {
  it('完整月度总结', () => {
    const records = [
      makeRecord({ id: 'r1', startTime: new Date('2026-08-04').getTime(), commandType: 'walk', mood: 'happy', city: '上海', duration: 30, photos: ['/p1.jpg'] }),
      makeRecord({ id: 'r2', startTime: new Date('2026-08-10').getTime(), commandType: 'color', mood: 'calm', city: '上海', duration: 20, photos: [] }),
      makeRecord({ id: 'r3', startTime: new Date('2026-08-15').getTime(), commandType: 'walk', mood: 'happy', city: '北京', duration: 40, photos: ['/p2.jpg', '/p3.jpg'] })
    ]
    const s = summary.buildMonthlySummary(records, 2026, 8)
    assertEqual(s.periodLabel, '2026年8月')
    assertEqual(s.recordCount, 3)
    assertEqual(s.topCity, '上海', '上海 2 条最多')
    assertEqual(s.topType, 'walk', 'walk 2 条最多')
    assertEqual(s.topMood, 'happy', 'happy 2 条最多')
    assertEqual(s.totalDuration, 90)
    assertEqual(s.photoCount, 3)
    assertEqual(s.highlightDays, 3, '3 个不同日子')
    assert(s.summary.length > 0, 'summary 文案非空')
  })

  it('无记录月份返回默认文案', () => {
    const s = summary.buildMonthlySummary([], 2026, 8)
    assertEqual(s.recordCount, 0)
    assert(s.summary.indexOf('还没有出逃记录') >= 0, '应含「还没有出逃记录」')
  })

  it('月度总结 period 字段', () => {
    const s = summary.buildMonthlySummary([], 2026, 8)
    assertEqual(s.period.type, 'month')
    assertEqual(s.period.year, 2026)
    assertEqual(s.period.month, 8)
  })

  it('moodDist 包含完整分布', () => {
    const records = [
      makeRecord({ startTime: new Date('2026-08-04').getTime(), mood: 'happy' }),
      makeRecord({ startTime: new Date('2026-08-05').getTime(), mood: 'happy' }),
      makeRecord({ startTime: new Date('2026-08-06').getTime(), mood: 'calm' })
    ]
    const s = summary.buildMonthlySummary(records, 2026, 8)
    assertEqual(s.moodDist.happy, 2)
    assertEqual(s.moodDist.calm, 1)
  })
})

// ============================================================
// buildQuarterlySummary 季度总结
// ============================================================
describe('buildQuarterlySummary', () => {
  it('季度总结 period 字段', () => {
    const s = summary.buildQuarterlySummary([], 2026, 3)
    assertEqual(s.period.type, 'quarter')
    assertEqual(s.periodLabel, '2026年Q3')
  })

  it('季度统计跨 3 个月', () => {
    const records = [
      makeRecord({ id: 'r1', startTime: new Date('2026-07-15').getTime() }),
      makeRecord({ id: 'r2', startTime: new Date('2026-08-15').getTime() }),
      makeRecord({ id: 'r3', startTime: new Date('2026-09-15').getTime() })
    ]
    const s = summary.buildQuarterlySummary(records, 2026, 3)
    assertEqual(s.recordCount, 3)
  })
})

// ============================================================
// buildYearlySummary 年度总结
// ============================================================
describe('buildYearlySummary', () => {
  it('年度总结 period 字段', () => {
    const s = summary.buildYearlySummary([], 2026)
    assertEqual(s.period.type, 'year')
    assertEqual(s.periodLabel, '2026年')
  })

  it('年度统计跨整年', () => {
    const records = [
      makeRecord({ id: 'r1', startTime: new Date('2026-01-15').getTime() }),
      makeRecord({ id: 'r2', startTime: new Date('2026-06-15').getTime() }),
      makeRecord({ id: 'r3', startTime: new Date('2026-12-15').getTime() }),
      makeRecord({ id: 'r4', startTime: new Date('2025-12-15').getTime() })  // 不计
    ]
    const s = summary.buildYearlySummary(records, 2026)
    assertEqual(s.recordCount, 3)
  })
})

// ============================================================
// lastMonthRange 上个月范围
// ============================================================
describe('lastMonthRange', () => {
  it('8 月 → 上个月 7 月', () => {
    const now = new Date('2026-08-15T12:00:00').getTime()
    const r = summary.lastMonthRange(now)
    assertEqual(r.year, 2026)
    assertEqual(r.month, 7)
    assertEqual(r.label, '2026年7月')
  })

  it('1 月 → 上个月去年 12 月', () => {
    const now = new Date('2026-01-15T12:00:00').getTime()
    const r = summary.lastMonthRange(now)
    assertEqual(r.year, 2025)
    assertEqual(r.month, 12)
  })
})

// ============================================================
// 文案生成
// ============================================================
describe('文案生成', () => {
  it('总结文案包含核心信息', () => {
    const records = [
      makeRecord({ startTime: new Date('2026-08-04').getTime(), city: '上海', mood: 'happy' })
    ]
    const s = summary.buildMonthlySummary(records, 2026, 8)
    assert(s.summary.indexOf('1 次出逃') >= 0, '文案含次数')
    assert(s.summary.indexOf('上海') >= 0, '文案含城市')
  })

  it('多角落文案含探索数', () => {
    const records = [
      makeRecord({ startTime: new Date('2026-08-04').getTime(), location: { latitude: 31.1, longitude: 121.1 } }),
      makeRecord({ startTime: new Date('2026-08-05').getTime(), location: { latitude: 31.2, longitude: 121.2 } })
    ]
    const s = summary.buildMonthlySummary(records, 2026, 8)
    assert(s.summary.indexOf('探索了 2 个新角落') >= 0, '文案含角落数')
  })
})

// ============================================================
// 异常输入
// ============================================================
describe('异常输入', () => {
  it('null records 不崩溃', () => {
    const s = summary.buildMonthlySummary(null, 2026, 8)
    assertEqual(s.recordCount, 0)
  })

  it('undefined records 不崩溃', () => {
    const s = summary.buildMonthlySummary(undefined, 2026, 8)
    assertEqual(s.recordCount, 0)
  })

  it('含 null 元素的记录数组', () => {
    const records = [null, undefined, makeRecord({ startTime: new Date('2026-08-04').getTime() })]
    const s = summary.buildMonthlySummary(records, 2026, 8)
    assertEqual(s.recordCount, 1)
  })
})

// ============================================================
// 最终报告
// ============================================================
console.log('\n' + '='.repeat(60))
console.log('  summary-builder 单元测试报告')
console.log('='.repeat(60))
console.log('  ✓ Pass: ' + passCount)
console.log('  ✗ Fail: ' + failCount)
if (failures.length > 0) {
  console.log('  失败列表:')
  failures.forEach(f => console.log('    - ' + f))
}
console.log('='.repeat(60))

process.exit(failCount > 0 ? 1 : 0)
