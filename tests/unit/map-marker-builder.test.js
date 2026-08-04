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

// ============================================================
// B4-B: filterByType 类型筛选
// ============================================================
describe('filterByType', () => {
  const records = [
    REC({ id: 'r1', mode: 'micro', duration: 10 }),           // micro
    REC({ id: 'r2', duration: 25 }),                            // 非 micro
    REC({ id: 'r3', commandType: 'breakthrough', isBreakthrough: true }),  // breakthrough
    REC({ id: 'r4', isGroup: true, groupId: 'g1' }),           // sync
    REC({ id: 'r5', mode: 'micro', duration: 8 })              // micro
  ]

  it('all 返回全部', () => {
    assertEqual(builder.filterByType(records, 'all').length, 5)
    assertEqual(builder.filterByType(records, '').length, 5)
    assertEqual(builder.filterByType(records, null).length, 5)
  })

  it('micro 筛选 mode=micro 或 duration<15', () => {
    const r = builder.filterByType(records, 'micro')
    assertEqual(r.length, 2)
    assertEqual(r[0].id, 'r1')
    assertEqual(r[1].id, 'r5')
  })

  it('breakthrough 筛选', () => {
    const r = builder.filterByType(records, 'breakthrough')
    assertEqual(r.length, 1)
    assertEqual(r[0].id, 'r3')
  })

  it('sync 筛选 isGroup', () => {
    const r = builder.filterByType(records, 'sync')
    assertEqual(r.length, 1)
    assertEqual(r[0].id, 'r4')
  })

  it('duration<15 但无 mode 也算 micro', () => {
    const r = builder.filterByType([REC({ id: 'x', duration: 5 })], 'micro')
    assertEqual(r.length, 1)
  })

  it('未知 typeKey 兜底返回全部', () => {
    const r = builder.filterByType(records, 'unknown')
    assertEqual(r.length, 5)
  })

  it('空数组返回空', () => {
    assertEqual(builder.filterByType([], 'micro').length, 0)
  })

  it('null 输入返回空', () => {
    assertEqual(builder.filterByType(null, 'micro').length, 0)
    assertEqual(builder.filterByType(undefined, 'micro').length, 0)
  })

  it('过滤掉 null 元素', () => {
    const r = builder.filterByType([null, undefined, REC({ id: 'x', mode: 'micro' })], 'micro')
    assertEqual(r.length, 1)
  })
})

// ============================================================
// B4-B: filterByMood 情绪筛选
// ============================================================
describe('filterByMood', () => {
  const records = [
    REC({ id: 'r1', mood: 'happy' }),
    REC({ id: 'r2', mood: 'calm' }),
    REC({ id: 'r3', mood: 'happy' }),
    REC({ id: 'r4', moods: ['happy', 'surprise'] }),  // 数组形式
    REC({ id: 'r5', mood: '' })
  ]

  it('all 返回全部', () => {
    assertEqual(builder.filterByMood(records, 'all').length, 5)
    assertEqual(builder.filterByMood(records, '').length, 5)
  })

  it('happy 筛选（含字符串与数组形式）', () => {
    const r = builder.filterByMood(records, 'happy')
    assertEqual(r.length, 3)  // r1, r3, r4
    const ids = r.map(x => x.id).sort()
    assertEqual(ids.join(','), 'r1,r3,r4')
  })

  it('calm 筛选', () => {
    const r = builder.filterByMood(records, 'calm')
    assertEqual(r.length, 1)
    assertEqual(r[0].id, 'r2')
  })

  it('surprise 筛选（仅数组形式）', () => {
    const r = builder.filterByMood(records, 'surprise')
    assertEqual(r.length, 1)
    assertEqual(r[0].id, 'r4')
  })

  it('未出现的 mood 返回空', () => {
    assertEqual(builder.filterByMood(records, 'nonexistent').length, 0)
  })

  it('空数组返回空', () => {
    assertEqual(builder.filterByMood([], 'happy').length, 0)
  })

  it('null 输入返回空', () => {
    assertEqual(builder.filterByMood(null, 'happy').length, 0)
  })

  it('过滤掉 null 元素', () => {
    const r = builder.filterByMood([null, REC({ id: 'x', mood: 'happy' })], 'happy')
    assertEqual(r.length, 1)
  })
})

// ============================================================
// B4-B: buildMoodOptions 情绪选项构建
// ============================================================
describe('buildMoodOptions', () => {
  it('从记录动态提取情绪', () => {
    const records = [
      REC({ mood: 'happy' }),
      REC({ mood: 'calm' }),
      REC({ mood: 'happy' })
    ]
    const opts = builder.buildMoodOptions(records)
    assertEqual(opts.length, 3)  // all + happy + calm
    assertEqual(opts[0].key, 'all')
    assertEqual(opts[0].name, '全部')
    // 后面按 key 字典序：calm, happy
    assertEqual(opts[1].key, 'calm')
    assertEqual(opts[2].key, 'happy')
    assertEqual(opts[2].count, 2)
  })

  it('moodMeta 翻译中文名', () => {
    const records = [REC({ mood: 'happy' })]
    const opts = builder.buildMoodOptions(records, { happy: '开心' })
    assertEqual(opts[1].name, '开心')
  })

  it('无 moodMeta 用 key 作 name', () => {
    const records = [REC({ mood: 'happy' })]
    const opts = builder.buildMoodOptions(records)
    assertEqual(opts[1].name, 'happy')
  })

  it('moods 数组形式也统计', () => {
    const records = [REC({ moods: ['happy', 'surprise'] })]
    const opts = builder.buildMoodOptions(records)
    assertEqual(opts.length, 3)  // all + happy + surprise
  })

  it('空数组只有 all', () => {
    const opts = builder.buildMoodOptions([])
    assertEqual(opts.length, 1)
    assertEqual(opts[0].key, 'all')
  })

  it('null 输入只有 all', () => {
    const opts = builder.buildMoodOptions(null)
    assertEqual(opts.length, 1)
  })

  it('空 mood 字符串不计', () => {
    const records = [REC({ mood: '' }), REC({ mood: null })]
    const opts = builder.buildMoodOptions(records)
    assertEqual(opts.length, 1)  // 仅 all
  })
})

// ============================================================
// B4-B: filterRecords 组合筛选
// ============================================================
describe('filterRecords (组合)', () => {
  const records = [
    REC({ id: 'r1', mode: 'micro', mood: 'happy', date: '2026-08-01' }),
    REC({ id: 'r2', mood: 'calm', date: '2026-08-02' }),
    REC({ id: 'r3', mode: 'micro', mood: 'happy', isGroup: true, groupId: 'g1' })
  ]

  it('type + mood 组合', () => {
    const r = builder.filterRecords(records, { type: 'micro', mood: 'happy' })
    assertEqual(r.length, 2)  // r1, r3
  })

  it('type=sync + mood=calm 无交集', () => {
    const r = builder.filterRecords(records, { type: 'sync', mood: 'calm' })
    assertEqual(r.length, 0)
  })

  it('空 options 返回全部', () => {
    assertEqual(builder.filterRecords(records, {}).length, 3)
    assertEqual(builder.filterRecords(records, null).length, 3)
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
