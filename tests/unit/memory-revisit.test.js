// tests/unit/memory-revisit.test.js
// B4 记忆回收 · memory-revisit 单元测试
// 运行: node tests/unit/memory-revisit.test.js

'use strict'

const revisit = require('../../utils/memory-revisit.js')

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
    date: '2026-07-04',
    time: '10:00',
    duration: 20,
    mood: 'happy',
    location: { latitude: 31.23, longitude: 121.47 },
    locationName: '上海·徐汇',
    feeling: '今天走了一段路',
    photos: ['/p1.jpg']
  }, over || {})
}

// 固定时间戳便于测试：2026-08-04 12:00
const NOW = new Date('2026-08-04T12:00:00').getTime()
const THIRTY_DAYS_AGO = NOW - 30 * 24 * 60 * 60 * 1000  // 2026-07-05

// ============================================================
// targetDateRange 目标日期
// ============================================================
describe('targetDateRange', () => {
  it('30 天前日期', () => {
    const r = revisit.targetDateRange(NOW, 30)
    assertEqual(r.dateStr, '2026-07-05')
    assert(typeof r.ts === 'number')
  })

  it('默认 daysAgo=30', () => {
    const r = revisit.targetDateRange(NOW)
    assertEqual(r.dateStr, '2026-07-05')
  })

  it('自定义 daysAgo', () => {
    const r = revisit.targetDateRange(NOW, 7)
    // 7 天前
    const expected = new Date(NOW - 7 * 24 * 60 * 60 * 1000)
    const expectedStr = expected.getFullYear() + '-' +
      String(expected.getMonth() + 1).padStart(2, '0') + '-' +
      String(expected.getDate()).padStart(2, '0')
    assertEqual(r.dateStr, expectedStr)
  })
})

// ============================================================
// formatDateLabel 日期标签
// ============================================================
describe('formatDateLabel', () => {
  it('YYYY-MM-DD → M月D日', () => {
    assertEqual(revisit.formatDateLabel('2026-07-05'), '7月5日')
    assertEqual(revisit.formatDateLabel('2026-12-25'), '12月25日')
  })
  it('无效输入返回原值', () => {
    assertEqual(revisit.formatDateLabel(''), '')
    assertEqual(revisit.formatDateLabel('invalid'), 'invalid')
    assertEqual(revisit.formatDateLabel(null), null)
  })
})

// ============================================================
// findRevisitMemory 主入口
// ============================================================
describe('findRevisitMemory', () => {
  it('找到 30 天前的记录', () => {
    const records = [
      makeRecord({ id: 'r1', startTime: THIRTY_DAYS_AGO })
    ]
    const result = revisit.findRevisitMemory(records, { nowTs: NOW })
    assert(result.hasRevisit === true, '应找到回访记忆')
    assertEqual(result.records.length, 1)
    assertEqual(result.chosenRecord.id, 'r1')
  })

  it('优先返回带照片的记录', () => {
    const records = [
      makeRecord({ id: 'r1', startTime: THIRTY_DAYS_AGO, photos: [] }),
      makeRecord({ id: 'r2', startTime: THIRTY_DAYS_AGO, photos: ['/p1.jpg'] })
    ]
    const result = revisit.findRevisitMemory(records, { nowTs: NOW })
    assertEqual(result.chosenRecord.id, 'r2', '应选带照片的 r2')
  })

  it('窗口范围 ±1 天', () => {
    // 31 天前、29 天前都应被命中
    const records = [
      makeRecord({ id: 'r1', startTime: NOW - 31 * 24 * 60 * 60 * 1000 }),
      makeRecord({ id: 'r2', startTime: NOW - 29 * 24 * 60 * 60 * 1000 })
    ]
    const result = revisit.findRevisitMemory(records, { nowTs: NOW })
    assert(result.hasRevisit === true)
    assertEqual(result.records.length, 2)
  })

  it('32 天前不在窗口内', () => {
    const records = [
      makeRecord({ id: 'r1', startTime: NOW - 32 * 24 * 60 * 60 * 1000 })
    ]
    const result = revisit.findRevisitMemory(records, { nowTs: NOW })
    assert(result.hasRevisit === false, '32 天前不在窗口')
  })

  it('28 天前不在窗口内', () => {
    const records = [
      makeRecord({ id: 'r1', startTime: NOW - 28 * 24 * 60 * 60 * 1000 })
    ]
    const result = revisit.findRevisitMemory(records, { nowTs: NOW })
    assert(result.hasRevisit === false, '28 天前不在窗口')
  })

  it('无记录返回 hasRevisit=false', () => {
    const result = revisit.findRevisitMemory([], { nowTs: NOW })
    assert(result.hasRevisit === false)
    assertEqual(result.records.length, 0)
  })

  it('空数组返回 hasRevisit=false', () => {
    const result = revisit.findRevisitMemory([], { nowTs: NOW })
    assert(result.hasRevisit === false)
  })

  it('null 记录不崩溃', () => {
    const result = revisit.findRevisitMemory(null, { nowTs: NOW })
    assert(result.hasRevisit === false)
  })

  it('dismissedIds 排除记录', () => {
    const records = [
      makeRecord({ id: 'r1', startTime: THIRTY_DAYS_AGO })
    ]
    const result = revisit.findRevisitMemory(records, { nowTs: NOW, dismissedIds: ['r1'] })
    assert(result.hasRevisit === false, 'r1 已忽略应不再返回')
  })

  it('title 含日期标签', () => {
    const records = [makeRecord({ id: 'r1', startTime: THIRTY_DAYS_AGO })]
    const result = revisit.findRevisitMemory(records, { nowTs: NOW })
    assert(result.title.indexOf('一个月前的') >= 0, 'title 含「一个月前的」')
  })

  it('description 含记录标题', () => {
    const records = [makeRecord({ id: 'r1', startTime: THIRTY_DAYS_AGO, commandTitle: '测试出逃' })]
    const result = revisit.findRevisitMemory(records, { nowTs: NOW })
    assert(result.description.indexOf('测试出逃') >= 0, 'description 含记录标题')
  })

  it('description 含照片数', () => {
    const records = [makeRecord({ id: 'r1', startTime: THIRTY_DAYS_AGO, photos: ['/p1.jpg', '/p2.jpg'] })]
    const result = revisit.findRevisitMemory(records, { nowTs: NOW })
    assert(result.description.indexOf('2 张照片') >= 0, 'description 含照片数')
  })

  it('description 含地点', () => {
    const records = [makeRecord({ id: 'r1', startTime: THIRTY_DAYS_AGO, locationName: '上海·徐汇' })]
    const result = revisit.findRevisitMemory(records, { nowTs: NOW })
    assert(result.description.indexOf('上海·徐汇') >= 0, 'description 含地点')
  })

  it('date 字段记录也能被命中', () => {
    const records = [makeRecord({ id: 'r1', date: '2026-07-05', startTime: null })]
    const result = revisit.findRevisitMemory(records, { nowTs: NOW })
    assert(result.hasRevisit === true, 'date 字段记录应被命中')
  })
})

// ============================================================
// todayDismissedKey 当天忽略 key
// ============================================================
describe('todayDismissedKey', () => {
  it('返回 memoryRevisit_dismissed_YYYY-MM-DD', () => {
    const key = revisit.todayDismissedKey(NOW)
    assertEqual(key, 'memoryRevisit_dismissed_2026-08-04')
  })

  it('默认使用当前时间', () => {
    const key = revisit.todayDismissedKey()
    assert(key.indexOf('memoryRevisit_dismissed_') === 0, 'key 前缀正确')
  })
})

// ============================================================
// 异常输入
// ============================================================
describe('异常输入', () => {
  it('含 null 元素的记录数组', () => {
    const records = [null, undefined, makeRecord({ id: 'r1', startTime: THIRTY_DAYS_AGO })]
    const result = revisit.findRevisitMemory(records, { nowTs: NOW })
    assert(result.hasRevisit === true)
    assertEqual(result.records.length, 1)
  })

  it('无时间戳记录跳过', () => {
    const records = [makeRecord({ id: 'r1', startTime: null, date: '', completedAt: null })]
    const result = revisit.findRevisitMemory(records, { nowTs: NOW })
    assert(result.hasRevisit === false)
  })

  it('options 为 null 不崩溃', () => {
    const records = [makeRecord({ id: 'r1', startTime: THIRTY_DAYS_AGO })]
    const result = revisit.findRevisitMemory(records, null)
    // nowTs 默认 Date.now()，30 天前的记录可能不在窗口内
    assert(typeof result.hasRevisit === 'boolean')
  })
})

// ============================================================
// 最终报告
// ============================================================
console.log('\n' + '='.repeat(60))
console.log('  memory-revisit 单元测试报告')
console.log('='.repeat(60))
console.log('  ✓ Pass: ' + passCount)
console.log('  ✗ Fail: ' + failCount)
if (failures.length > 0) {
  console.log('  失败列表:')
  failures.forEach(f => console.log('    - ' + f))
}
console.log('='.repeat(60))

process.exit(failCount > 0 ? 1 : 0)
