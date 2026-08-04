// tests/unit/style-profile.test.js
// B4 激励体系 · style-profile 单元测试
// 运行: node tests/unit/style-profile.test.js

'use strict'

const profile = require('../../utils/style-profile.js')

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
    time: '10:00',
    duration: 20,
    mood: 'happy',
    date: '2026-08-04',
    location: { latitude: 31.23, longitude: 121.47 },
    photos: []
  }, over || {})
}

// ============================================================
// analyzeDistance 距离偏好
// ============================================================
describe('analyzeDistance', () => {
  it('near (<15min)', () => {
    const records = [makeRecord({ duration: 10 })]
    const r = profile.analyzeDistance(records)
    assertEqual(r.map.near, 1)
    assertEqual(r.dominant, 'near')
  })
  it('mid (15-30min)', () => {
    const records = [makeRecord({ duration: 20 })]
    const r = profile.analyzeDistance(records)
    assertEqual(r.map.mid, 1)
    assertEqual(r.dominant, 'mid')
  })
  it('far (>30min)', () => {
    const records = [makeRecord({ duration: 45 })]
    const r = profile.analyzeDistance(records)
    assertEqual(r.map.far, 1)
    assertEqual(r.dominant, 'far')
  })
  it('混合记录取最大计数', () => {
    const records = [
      makeRecord({ duration: 10 }),
      makeRecord({ duration: 10 }),
      makeRecord({ duration: 45 })
    ]
    const r = profile.analyzeDistance(records)
    assertEqual(r.map.near, 2)
    assertEqual(r.map.far, 1)
    assertEqual(r.dominant, 'near')
  })
  it('无 duration 记录跳过', () => {
    const records = [makeRecord({ duration: null }), makeRecord({ duration: 'abc' })]
    const r = profile.analyzeDistance(records)
    assertEqual(r.map.near + r.map.mid + r.map.far, 0)
    assertEqual(r.dominant, null)
  })
  it('空数组返回 null dominant', () => {
    const r = profile.analyzeDistance([])
    assertEqual(r.dominant, null)
  })
})

// ============================================================
// analyzeTime 时间偏好
// ============================================================
describe('analyzeTime', () => {
  it('morning (5-11)', () => {
    const r = profile.analyzeTime([makeRecord({ time: '08:00' })])
    assertEqual(r.map.morning, 1)
    assertEqual(r.dominant, 'morning')
  })
  it('noon (11-17)', () => {
    const r = profile.analyzeTime([makeRecord({ time: '14:00' })])
    assertEqual(r.map.noon, 1)
    assertEqual(r.dominant, 'noon')
  })
  it('evening (17-22)', () => {
    const r = profile.analyzeTime([makeRecord({ time: '19:00' })])
    assertEqual(r.map.evening, 1)
    assertEqual(r.dominant, 'evening')
  })
  it('night (22-5)', () => {
    const r = profile.analyzeTime([makeRecord({ time: '23:00' })])
    assertEqual(r.map.night, 1)
    assertEqual(r.dominant, 'night')
  })
  it('边界值 5 点为 morning', () => {
    assertEqual(profile.analyzeTime([makeRecord({ time: '05:00' })]).map.morning, 1)
  })
  it('边界值 22 点为 night', () => {
    assertEqual(profile.analyzeTime([makeRecord({ time: '22:00' })]).map.night, 1)
  })
  it('无 time 字段跳过', () => {
    const r = profile.analyzeTime([makeRecord({ time: '' })])
    assertEqual(r.dominant, null)
  })
  it('hour 字段优先', () => {
    const r = profile.analyzeTime([makeRecord({ hour: 9, time: '20:00' })])
    assertEqual(r.map.morning, 1)
  })
})

// ============================================================
// analyzeType 类型偏好
// ============================================================
describe('analyzeType', () => {
  it('统计类型分布', () => {
    const records = [
      makeRecord({ commandType: 'walk' }),
      makeRecord({ commandType: 'walk' }),
      makeRecord({ commandType: 'color' })
    ]
    const r = profile.analyzeType(records)
    assertEqual(r.map.walk, 2)
    assertEqual(r.map.color, 1)
    assertEqual(r.dominant, 'walk')
  })
  it('并列时取字典序最小', () => {
    const records = [
      makeRecord({ commandType: 'walk' }),
      makeRecord({ commandType: 'color' })
    ]
    const r = profile.analyzeType(records)
    assertEqual(r.dominant, 'color', 'color < walk')
  })
})

// ============================================================
// analyzeSocial 社交偏好
// ============================================================
describe('analyzeSocial', () => {
  it('solo（无 isGroup/double）', () => {
    const r = profile.analyzeSocial([makeRecord({})])
    assertEqual(r.map.solo, 1)
    assertEqual(r.dominant, 'solo')
  })
  it('duo（double 模式 2 人）', () => {
    const r = profile.analyzeSocial([makeRecord({ mode: 'double', members: ['a', 'b'] })])
    assertEqual(r.map.duo, 1)
    assertEqual(r.dominant, 'duo')
  })
  it('group（isGroup 3+ 人）', () => {
    const r = profile.analyzeSocial([makeRecord({ isGroup: true, members: ['a', 'b', 'c'] })])
    assertEqual(r.map.group, 1)
    assertEqual(r.dominant, 'group')
  })
  it('double 模式但无 members 按 duo 算', () => {
    const r = profile.analyzeSocial([makeRecord({ mode: 'double' })])
    assertEqual(r.map.duo, 1)
  })
})

// ============================================================
// analyzePace 节奏偏好
// ============================================================
describe('analyzePace', () => {
  const NOW = new Date('2026-08-04T12:00:00').getTime()

  it('fast（30 天内 ≥10 次）', () => {
    const records = []
    for (let i = 0; i < 12; i++) {
      records.push(makeRecord({ startTime: NOW - i * 24 * 60 * 60 * 1000 }))
    }
    const r = profile.analyzePace(records, NOW)
    assertEqual(r.recentCount, 12)
    assertEqual(r.dominant, 'fast')
  })
  it('steady（30 天内 4-10 次）', () => {
    const records = []
    for (let i = 0; i < 5; i++) {
      records.push(makeRecord({ startTime: NOW - i * 24 * 60 * 60 * 1000 }))
    }
    const r = profile.analyzePace(records, NOW)
    assertEqual(r.recentCount, 5)
    assertEqual(r.dominant, 'steady')
  })
  it('slow（30 天内 <4 次）', () => {
    const records = [makeRecord({ startTime: NOW - 10 * 24 * 60 * 60 * 1000 })]
    const r = profile.analyzePace(records, NOW)
    assertEqual(r.recentCount, 1)
    assertEqual(r.dominant, 'slow')
  })
  it('30 天前的记录不计入', () => {
    const records = [makeRecord({ startTime: NOW - 40 * 24 * 60 * 60 * 1000 })]
    const r = profile.analyzePace(records, NOW)
    assertEqual(r.recentCount, 0)
    assertEqual(r.dominant, 'slow')
  })
  it('无 startTime 用 date 字段', () => {
    const records = [makeRecord({ date: '2026-08-01', startTime: null })]
    const r = profile.analyzePace(records, NOW)
    assertEqual(r.recentCount, 1)
  })
})

// ============================================================
// buildProfile 主入口
// ============================================================
describe('buildProfile', () => {
  it('空记录返回默认描述', () => {
    const p = profile.buildProfile([])
    assertEqual(p.recordCount, 0)
    assert(p.description.indexOf('还没有出逃记录') >= 0, '描述应含「还没有出逃记录」')
    assertEqual(p.tags.length, 0)
  })

  it('完整画像生成', () => {
    const records = [
      makeRecord({ time: '19:00', commandType: 'walk', duration: 35, mode: 'double', members: ['a', 'b'] }),
      makeRecord({ time: '19:30', commandType: 'walk', duration: 40 }),
      makeRecord({ time: '20:00', commandType: 'walk', duration: 30 })
    ]
    const p = profile.buildProfile(records)
    assertEqual(p.recordCount, 3)
    assertEqual(p.dimensions.time, 'evening')
    assertEqual(p.dimensions.type, 'walk')
    assertEqual(p.dimensions.distance, 'far')
    assert(p.description.length > 0, '描述非空')
    assert(p.tags.length > 0, 'tags 非空')
  })

  it('dominantStyle 优先取 time', () => {
    const records = [makeRecord({ time: '19:00' })]
    const p = profile.buildProfile(records)
    assertEqual(p.dominantStyle, 'evening')
  })

  it('null 记录返回默认描述', () => {
    const p = profile.buildProfile(null)
    assertEqual(p.recordCount, 0)
    assert(p.description.length > 0)
  })

  it('detailMaps 包含完整分布', () => {
    const records = [makeRecord({ time: '08:00', commandType: 'color', duration: 10 })]
    const p = profile.buildProfile(records)
    assert(!!p.detailMaps.distance, 'detailMaps.distance 存在')
    assert(!!p.detailMaps.time, 'detailMaps.time 存在')
    assert(!!p.detailMaps.type, 'detailMaps.type 存在')
    assertEqual(p.detailMaps.distance.near, 1)
  })
})

// ============================================================
// buildDescription 文案生成
// ============================================================
describe('buildDescription', () => {
  it('含时间定语', () => {
    const desc = profile.buildDescription({ time: 'evening' })
    assert(desc.indexOf('傍晚') >= 0, '应含「傍晚」')
    assert(desc.indexOf('黄昏漫步者') >= 0, '应含「黄昏漫步者」')
  })
  it('含类型偏好', () => {
    const desc = profile.buildDescription({ type: 'walk' })
    assert(desc.indexOf('城市漫游') >= 0, '应含「城市漫游」')
  })
  it('含社交偏好', () => {
    const desc = profile.buildDescription({ social: 'solo' })
    assert(desc.indexOf('独自') >= 0, '应含「独自」')
  })
  it('空维度返回默认文案', () => {
    const desc = profile.buildDescription({})
    assert(desc.indexOf('神秘的出逃者') >= 0, '应含「神秘的出逃者」')
  })
})

// ============================================================
// 最终报告
// ============================================================
console.log('\n' + '='.repeat(60))
console.log('  style-profile 单元测试报告')
console.log('='.repeat(60))
console.log('  ✓ Pass: ' + passCount)
console.log('  ✗ Fail: ' + failCount)
if (failures.length > 0) {
  console.log('  失败列表:')
  failures.forEach(f => console.log('    - ' + f))
}
console.log('='.repeat(60))

process.exit(failCount > 0 ? 1 : 0)
