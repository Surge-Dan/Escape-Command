// tests/unit/map-marker-builder.test.js
// C-13: 共同城市底片 map-marker-builder 单元测试
// 运行: node tests/unit/map-marker-builder.test.js

'use strict'

const builder = require('../../utils/map-marker-builder.js')

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
    console.log('  ✗ FAIL: ' + (msg || 'assertEqual'))
  }
}
function describe(name, fn) { console.log('\n=== ' + name + ' ==='); fn() }
function it(name, fn) { console.log('  > ' + name); fn() }

const REC = (over) => Object.assign({
  id: 'r1',
  commandType: 'food',
  commandTitle: '出逃',
  location: { latitude: 31.23, longitude: 121.47 }
}, over || {})

// ============================================================
// buildGroupMarkers
// ============================================================
describe('buildGroupMarkers', () => {
  it('同 groupId 聚合为 1 个 marker', () => {
    const records = [
      REC({ id: 'r1', isGroup: true, groupId: 'g1', members: ['a', 'b'] }),
      REC({ id: 'r2', isGroup: true, groupId: 'g1', members: ['a', 'b', 'c'] })
    ]
    const r = builder.buildGroupMarkers(records)
    assertEqual(r.length, 1)
    assertEqual(r[0].groupId, 'g1')
    assertEqual(r[0].recordCount, 2)
    assertEqual(r[0].memberCount, 3, '成员数取最大')
    assertEqual(r[0].recordIds.length, 2)
    assertEqual(r[0].title, '和朋友一起 · 2条记忆')
  })

  it('单条同频记录 title 不带条数', () => {
    const records = [REC({ id: 'r1', isGroup: true, groupId: 'g1', members: ['a'] })]
    const r = builder.buildGroupMarkers(records)
    assertEqual(r.length, 1)
    assertEqual(r[0].title, '和朋友一起')
    assertEqual(r[0].memberCount, 1)
  })

  it('不同 groupId 各自聚合', () => {
    const records = [
      REC({ id: 'r1', isGroup: true, groupId: 'g1', members: ['a'] }),
      REC({ id: 'r2', isGroup: true, groupId: 'g2', members: ['b', 'c'] })
    ]
    const r = builder.buildGroupMarkers(records)
    assertEqual(r.length, 2)
  })

  it('非同频记录跳过', () => {
    const records = [REC({ id: 'r1', isGroup: false, groupId: 'g1' })]
    const r = builder.buildGroupMarkers(records)
    assertEqual(r.length, 0)
  })

  it('无坐标跳过', () => {
    const records = [REC({ id: 'r1', isGroup: true, groupId: 'g1', location: null })]
    const r = builder.buildGroupMarkers(records)
    assertEqual(r.length, 0)
  })

  it('primaryType 取首条', () => {
    const records = [
      REC({ id: 'r1', isGroup: true, groupId: 'g1', commandType: 'walk' }),
      REC({ id: 'r2', isGroup: true, groupId: 'g1', commandType: 'food' })
    ]
    const r = builder.buildGroupMarkers(records)
    assertEqual(r[0].primaryType, 'walk')
  })

  it('空数组返回空', () => {
    assertEqual(builder.buildGroupMarkers([]).length, 0)
  })

  it('null/undefined 返回空', () => {
    assertEqual(builder.buildGroupMarkers(null).length, 0)
    assertEqual(builder.buildGroupMarkers(undefined).length, 0)
  })

  it('位置取首条可定位记录', () => {
    const records = [
      REC({ id: 'r1', isGroup: true, groupId: 'g1', location: { latitude: 30, longitude: 120 } }),
      REC({ id: 'r2', isGroup: true, groupId: 'g1', location: { latitude: 31, longitude: 121 } })
    ]
    const r = builder.buildGroupMarkers(records)
    assertEqual(r[0].latitude, 30)
    assertEqual(r[0].longitude, 120)
  })
})

// ============================================================
// buildSoloMarkers
// ============================================================
describe('buildSoloMarkers', () => {
  it('普通记录各自 marker', () => {
    const records = [
      REC({ id: 'r1', commandType: 'food' }),
      REC({ id: 'r2', commandType: 'walk', location: { latitude: 32, longitude: 122 } })
    ]
    const r = builder.buildSoloMarkers(records)
    assertEqual(r.length, 2)
    assertEqual(r[0].recordId, 'r1')
    assertEqual(r[1].recordId, 'r2')
    assertEqual(r[0].type, 'food')
  })

  it('同频记录跳过', () => {
    const records = [REC({ id: 'r1', isGroup: true, groupId: 'g1' })]
    const r = builder.buildSoloMarkers(records)
    assertEqual(r.length, 0)
  })

  it('无坐标跳过', () => {
    const records = [REC({ id: 'r1', location: null })]
    const r = builder.buildSoloMarkers(records)
    assertEqual(r.length, 0)
  })

  it('title 兜底', () => {
    const records = [REC({ id: 'r1', commandTitle: '', commandContent: '内容' })]
    const r = builder.buildSoloMarkers(records)
    assertEqual(r[0].title, '内容')
  })

  it('空数组/null 返回空', () => {
    assertEqual(builder.buildSoloMarkers([]).length, 0)
    assertEqual(builder.buildSoloMarkers(null).length, 0)
  })

  it('record 字段保留原对象', () => {
    const rec = REC({ id: 'r1', custom: 'x' })
    const r = builder.buildSoloMarkers([rec])
    assertEqual(r[0].record.custom, 'x')
  })
})

// ============================================================
// mergeMarkers
// ============================================================
describe('mergeMarkers', () => {
  it('同位置 solo 被 group 覆盖', () => {
    const solo = [{ recordId: 's1', latitude: 31.23, longitude: 121.47, type: 'food', title: 'solo' }]
    const group = [{ groupId: 'g1', latitude: 31.23, longitude: 121.47, memberCount: 3, recordCount: 1, primaryType: 'food', recordIds: ['g1r1'], title: '和朋友一起' }]
    const m = builder.mergeMarkers(solo, group)
    assertEqual(m.groupCount, 1)
    assertEqual(m.soloCount, 0, '同位置 solo 被覆盖')
    assertEqual(m.markers.length, 1)
    assertEqual(m.markers[0].kind, 'group')
  })

  it('不同位置 solo 保留', () => {
    const solo = [{ recordId: 's1', latitude: 30, longitude: 120, type: 'food', title: 'solo' }]
    const group = [{ groupId: 'g1', latitude: 31, longitude: 121, memberCount: 2, recordCount: 1, primaryType: 'food', recordIds: ['g'], title: 'group' }]
    const m = builder.mergeMarkers(solo, group)
    assertEqual(m.soloCount, 1)
    assertEqual(m.groupCount, 1)
    assertEqual(m.markers.length, 2)
  })

  it('空输入', () => {
    const m = builder.mergeMarkers([], [])
    assertEqual(m.markers.length, 0)
    assertEqual(m.soloCount, 0)
    assertEqual(m.groupCount, 0)
  })

  it('null 输入安全', () => {
    const m = builder.mergeMarkers(null, null)
    assertEqual(m.markers.length, 0)
  })

  it('仅 solo', () => {
    const solo = [
      { recordId: 's1', latitude: 30, longitude: 120, type: 'food', title: 'a' },
      { recordId: 's2', latitude: 31, longitude: 121, type: 'walk', title: 'b' }
    ]
    const m = builder.mergeMarkers(solo, [])
    assertEqual(m.soloCount, 2)
    assertEqual(m.groupCount, 0)
    assertEqual(m.markers.length, 2)
  })

  it('仅 group', () => {
    const group = [{ groupId: 'g1', latitude: 31, longitude: 121, memberCount: 2, recordCount: 1, primaryType: 'food', recordIds: ['g'], title: 'group' }]
    const m = builder.mergeMarkers([], group)
    assertEqual(m.groupCount, 1)
    assertEqual(m.markers.length, 1)
  })

  it('坐标精度 5 位判断同位置', () => {
    // 31.23000 vs 31.23001 → toFixed(5) 后不同（31.23000 vs 31.23001），不覆盖
    const solo = [{ recordId: 's1', latitude: 31.23000, longitude: 121.47000, type: 'food', title: 'solo' }]
    const group = [{ groupId: 'g1', latitude: 31.23001, longitude: 121.47000, memberCount: 2, recordCount: 1, primaryType: 'food', recordIds: ['g'], title: 'group' }]
    const m = builder.mergeMarkers(solo, group)
    assertEqual(m.soloCount, 1, '精度 5 位不同位置应保留 solo')
  })
})

// ============================================================
// _internal
// ============================================================
describe('_internal', () => {
  it('hasLoc 有效坐标', () => {
    assert(builder._internal.hasLoc({ location: { latitude: 31, longitude: 121 } }) === true)
  })
  it('hasLoc 无效坐标', () => {
    assert(builder._internal.hasLoc({ location: null }) === false)
    assert(builder._internal.hasLoc({ location: { latitude: 'x', longitude: 121 } }) === false)
    assert(builder._internal.hasLoc(null) === false)
  })
  it('hasLoc NaN/Infinity 排除', () => {
    assert(builder._internal.hasLoc({ location: { latitude: NaN, longitude: 121 } }) === false)
    assert(builder._internal.hasLoc({ location: { latitude: Infinity, longitude: 121 } }) === false)
  })
  it('locKey 一致性', () => {
    const k1 = builder._internal.locKey({ latitude: 31.23, longitude: 121.47 })
    const k2 = builder._internal.locKey({ latitude: 31.23, longitude: 121.47 })
    assertEqual(k1, k2)
  })
})

// ===== 结果 =====
console.log('\n' + '='.repeat(50))
console.log('Map Marker Builder 单元测试结果: ' + passCount + ' passed, ' + failCount + ' failed')
if (failures.length > 0) {
  console.log('\n失败项:')
  failures.forEach(f => console.log('  - ' + f))
}
console.log('='.repeat(50))
process.exit(failCount > 0 ? 1 : 0)
