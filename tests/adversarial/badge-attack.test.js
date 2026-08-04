// tests/adversarial/badge-attack.test.js
// badge-engine 对抗式测试（B4 激励体系安全）
// 运行: node tests/adversarial/badge-attack.test.js
//
// 攻击向量覆盖（46 个）：
//   1. 数量篡改攻击（刷 undefined/null/空对象骗取阶段徽章）
//   2. 坐标伪造攻击（相同坐标/精度攻击骗取方向徽章和城市侦探）
//   3. 质心漂移攻击（极端坐标拉偏质心）
//   4. 字段篡改攻击（篡改 commandType/time/weather 骗取类型/模式徽章）
//   5. ctx 篡改攻击（篡改 continuousDays/partnerRecords/collectedCommands）
//   6. 幂等性攻击（重复调用不重复解锁）
//   7. 边界值攻击（恰好阈值 vs 差1）
//   8. 异常输入攻击（null/undefined/循环引用/原型链污染/超大数组）
//   9. 元数据完整性攻击（缺失元数据/规则异常不阻塞）

'use strict'

const engine = require('../../utils/badge-engine.js')
const BADGES = require('../../data/badges.js')

let passCount = 0
let failCount = 0
const failures = []

function attack(name, fn) {
  try {
    fn()
    passCount++
    console.log('  ✓ ' + name)
  } catch (e) {
    failCount++
    failures.push(name + ': ' + e.message)
    console.log('  ✗ ' + name + ' → ' + e.message)
  }
}

function assertEqual(a, b, msg) {
  if (a !== b) throw new Error(msg || 'expected=' + JSON.stringify(b) + ' actual=' + JSON.stringify(a))
}
function assertTrue(v, msg) { if (!v) throw new Error(msg || '应为 true') }
function assertFalse(v, msg) { if (v) throw new Error(msg || '应为 false') }
function assertNoThrow(fn, msg) {
  try { fn() } catch (e) { throw new Error(msg || '不应抛异常: ' + e.message) }
}

// 测试辅助
function makeRecord(over) {
  return Object.assign({
    id: 'r' + Math.random().toString(36).slice(2, 8),
    commandType: 'walk',
    commandTitle: '出逃',
    date: '2026-08-04',
    time: '10:00',
    duration: 20,
    location: { latitude: 31.23, longitude: 121.47 },
    photos: [],
    mood: 'happy'
  }, over || {})
}
function baseCtx(over) {
  return Object.assign({
    unlockedIds: [],
    continuousDays: 0,
    partnerRecords: [],
    collectedCommands: [],
    challengeCount: 0
  }, over || {})
}

console.log('\n=== badge-attack 对抗式测试 ===\n')

// ============================================================
// 1. 数量篡改攻击（刷无效记录骗取阶段徽章）
// ============================================================
console.log('--- 1. 数量篡改攻击 ---')

attack('A01: 10 个 undefined 不应解锁 stage_explorer', function () {
  const records = new Array(10).fill(undefined)
  const result = engine.detectUnlocks(records, baseCtx(), BADGES)
  assertTrue(result.added.indexOf('stage_explorer') < 0, '刷 undefined 不应解锁阶段徽章')
})

attack('A02: 10 个 null 不应解锁 stage_explorer', function () {
  const records = new Array(10).fill(null)
  const result = engine.detectUnlocks(records, baseCtx(), BADGES)
  assertTrue(result.added.indexOf('stage_explorer') < 0, '刷 null 不应解锁阶段徽章')
})

attack('A03: 10 个空对象（无 id）不应解锁 stage_explorer', function () {
  const records = new Array(10).fill({})
  const result = engine.detectUnlocks(records, baseCtx(), BADGES)
  assertTrue(result.added.indexOf('stage_explorer') < 0, '刷空对象不应解锁阶段徽章')
})

attack('A04: 100 个 undefined 不应解锁 stage_expert', function () {
  const records = new Array(100).fill(undefined)
  const result = engine.detectUnlocks(records, baseCtx(), BADGES)
  assertTrue(result.added.indexOf('stage_expert') < 0, '刷 undefined 不应解锁 100 次徽章')
  assertTrue(result.added.indexOf('stage_detective') < 0, '刷 undefined 不应解锁 50 次徽章')
})

attack('A05: 混合有效+无效记录只计有效数', function () {
  const records = [
    makeRecord({ id: 'v1' }), null, undefined, {}, makeRecord({ id: 'v2' }),
    null, makeRecord({ id: 'v3' }), undefined, {}, makeRecord({ id: 'v4' })
  ]
  const result = engine.detectUnlocks(records, baseCtx({ unlockedIds: ['first_escape'] }), BADGES)
  // 有效记录只有 4 条，不应解锁 stage_explorer（需 10 条）
  assertTrue(result.added.indexOf('stage_explorer') < 0, '4 条有效记录不应解锁 stage_explorer')
})

attack('A06: first_escape 不应被空数组解锁', function () {
  const result = engine.detectUnlocks([], baseCtx(), BADGES)
  assertTrue(result.added.indexOf('first_escape') < 0, '空数组不应解锁首次出逃')
})

attack('A07: nextStageProgress 不应被 undefined 刷数量', function () {
  const records = new Array(100).fill(undefined)
  const p = engine.nextStageProgress(records)
  assertEqual(p.nextBadgeId, 'stage_explorer')
  assertEqual(p.currentCount, 0, '无效记录不应计入进度')
})

attack('A08: nextStageProgress 混合记录只计有效', function () {
  const records = [makeRecord({ id: 'v1' }), null, undefined, {}, makeRecord({ id: 'v2' }), makeRecord({ id: 'v3' })]
  const p = engine.nextStageProgress(records)
  assertEqual(p.currentCount, 3, '应只计 3 条有效记录')
  assertEqual(p.remaining, 7)
})

// ============================================================
// 2. 坐标伪造攻击
// ============================================================
console.log('--- 2. 坐标伪造攻击 ---')

attack('A09: 50 条相同坐标不应解锁 city_detective', function () {
  const records = []
  for (let i = 0; i < 50; i++) {
    records.push(makeRecord({ id: 'r' + i, location: { latitude: 31.23, longitude: 121.47 } }))
  }
  const result = engine.detectUnlocks(records, baseCtx({ unlockedIds: ['first_escape'] }), BADGES)
  assertTrue(result.added.indexOf('city_detective') < 0, '相同坐标去重后只算1个，不应解锁城市侦探')
})

attack('A10: 坐标精度攻击 0.0049° 归 central', function () {
  const centroid = { latitude: 31.0, longitude: 121.0 }
  const dir = engine.classifyDirection({ latitude: 31.0049, longitude: 121.0049 }, centroid)
  assertEqual(dir, 'central', '0.0049° < 0.005° 阈值应归 central')
})

attack('A11: 坐标精度攻击 0.0051° 不归 central', function () {
  const centroid = { latitude: 31.0, longitude: 121.0 }
  const dir = engine.classifyDirection({ latitude: 31.0051, longitude: 121.0 }, centroid)
  assertEqual(dir, 'north', '0.0051° > 0.005° 阈值不应归 central')
})

attack('A12: 坐标越界 lat=91 不应崩溃', function () {
  const centroid = { latitude: 31.0, longitude: 121.0 }
  assertNoThrow(function () {
    engine.classifyDirection({ latitude: 91, longitude: 121 }, centroid)
  }, 'lat=91 不应崩溃')
})

attack('A13: NaN 坐标应返回 null', function () {
  const centroid = { latitude: 31.0, longitude: 121.0 }
  const dir = engine.classifyDirection({ latitude: NaN, longitude: 121 }, centroid)
  assertEqual(dir, null, 'NaN 坐标应返回 null')
})

attack('A14: Infinity 坐标应返回 null', function () {
  const centroid = { latitude: 31.0, longitude: 121.0 }
  const dir = engine.classifyDirection({ latitude: Infinity, longitude: 121 }, centroid)
  assertEqual(dir, null, 'Infinity 坐标应返回 null')
})

attack('A15: 字符串坐标应返回 null', function () {
  const centroid = { latitude: 31.0, longitude: 121.0 }
  const dir = engine.classifyDirection({ latitude: '31.1', longitude: '121.1' }, centroid)
  assertEqual(dir, null, '字符串坐标应返回 null')
})

attack('A16: 全部相同坐标归 central（质心=自身）', function () {
  const records = []
  for (let i = 0; i < 5; i++) {
    records.push(makeRecord({ id: 'r' + i, location: { latitude: 31.0, longitude: 121.0 } }))
  }
  const stats = engine.buildDirectionStats(records)
  assertEqual(stats.central, 5, '全部相同坐标质心=自身，归 central')
  assertEqual(stats.total, 5)
})

// ============================================================
// 3. 质心漂移攻击
// ============================================================
console.log('--- 3. 质心漂移攻击 ---')

attack('A17: 极端坐标拉偏质心不影响方向统计正确性', function () {
  // 1 条极端坐标 lat=85，9 条正常坐标 lat=31
  const records = []
  records.push(makeRecord({ id: 'extreme', location: { latitude: 85.0, longitude: 121.0 } }))
  for (let i = 0; i < 9; i++) {
    records.push(makeRecord({ id: 'r' + i, location: { latitude: 31.0, longitude: 121.0 } }))
  }
  const stats = engine.buildDirectionStats(records)
  // 质心 lat = (85 + 31*9) / 10 = 36.4
  // 极端记录 lat=85 > 36.4 → north；正常记录 lat=31 < 36.4 → south
  assertEqual(stats.north, 1, '极端坐标归 north')
  assertEqual(stats.south, 9, '正常坐标归 south')
  assertEqual(stats.total, 10)
})

attack('A18: 3 条相同引用记录不产生 3 个独立方向', function () {
  const one = makeRecord({ id: 'same', location: { latitude: 31.10, longitude: 121.0 } })
  const records = [one, one, one]
  const stats = engine.buildDirectionStats(records)
  // 质心 = (31.10, 121.0)，记录也在 (31.10, 121.0)，归 central
  assertEqual(stats.central, 3)
  assertEqual(stats.north, 0)
})

// ============================================================
// 4. 字段篡改攻击
// ============================================================
console.log('--- 4. 字段篡改攻击 ---')

attack('A19: 篡改 commandType 为空字符串不应解锁 color_hunter', function () {
  const records = []
  for (let i = 0; i < 10; i++) {
    records.push(makeRecord({ id: 'r' + i, commandType: '' }))
  }
  const result = engine.detectUnlocks(records, baseCtx({ unlockedIds: ['first_escape'] }), BADGES)
  assertTrue(result.added.indexOf('color_hunter') < 0, '空 commandType 不应解锁 color_hunter')
})

attack('A20: 篡改 time 为非法值不应解锁 night_walker', function () {
  const records = []
  for (let i = 0; i < 5; i++) {
    records.push(makeRecord({ id: 'r' + i, time: 'invalid' }))
  }
  const result = engine.detectUnlocks(records, baseCtx({ unlockedIds: ['first_escape'] }), BADGES)
  assertTrue(result.added.indexOf('night_walker') < 0, '非法 time 不应解锁 night_walker')
})

attack('A21: 篡改 time 为 25:00 不应解锁 night_walker', function () {
  const records = []
  for (let i = 0; i < 5; i++) {
    records.push(makeRecord({ id: 'r' + i, time: '25:00' }))
  }
  const result = engine.detectUnlocks(records, baseCtx({ unlockedIds: ['first_escape'] }), BADGES)
  assertTrue(result.added.indexOf('night_walker') < 0, '25:00 是非法时间不应解锁 night_walker')
})

attack('A22: 篡改 weather 缺 condition 不应解锁 rainy_walker', function () {
  const records = []
  for (let i = 0; i < 3; i++) {
    records.push(makeRecord({ id: 'r' + i, weather: { temp: 20 } }))
  }
  const result = engine.detectUnlocks(records, baseCtx({ unlockedIds: ['first_escape'] }), BADGES)
  assertTrue(result.added.indexOf('rainy_walker') < 0, '无 condition 字段不应解锁 rainy_walker')
})

attack('A23: commandType 注入特殊字符不应崩溃', function () {
  const records = [
    makeRecord({ id: 'r1', commandType: '<script>alert(1)</script>' }),
    makeRecord({ id: 'r2', commandType: 'color\'; DROP TABLE--' })
  ]
  assertNoThrow(function () {
    engine.detectUnlocks(records, baseCtx(), BADGES)
  }, '特殊字符 commandType 不应崩溃')
})

attack('A24: parseHour hour 非法时回退 time 字段', function () {
  // hour=25 不满足 0-23 范围，应回退 time='10:00' → 10
  const h = engine.parseHour({ hour: 25, time: '10:00' })
  assertEqual(h, 10, 'hour=25 非法应回退 time 字段解析')
  // hour 和 time 都非法时返回 -1
  const h2 = engine.parseHour({ hour: 25, time: 'invalid' })
  assertEqual(h2, -1, 'hour 和 time 都非法应返回 -1')
})

// ============================================================
// 5. ctx 篡改攻击
// ============================================================
console.log('--- 5. ctx 篡改攻击 ---')

attack('A25: 篡改 continuousDays 为负数不应解锁 seven_streak', function () {
  const records = [makeRecord()]
  const result = engine.detectUnlocks(records, baseCtx({ continuousDays: -7 }), BADGES)
  assertTrue(result.added.indexOf('seven_streak') < 0, '负数 continuousDays 不应解锁')
})

attack('A26: 篡改 continuousDays 为字符串不应崩溃', function () {
  const records = [makeRecord()]
  assertNoThrow(function () {
    engine.detectUnlocks(records, baseCtx({ continuousDays: '7' }), BADGES)
  }, '字符串 continuousDays 不应崩溃')
})

attack('A27: 篡改 partnerRecords 为非数组不应崩溃', function () {
  const records = [makeRecord()]
  assertNoThrow(function () {
    engine.detectUnlocks(records, baseCtx({ partnerRecords: 'not-array' }), BADGES)
  }, '非数组 partnerRecords 不应崩溃')
})

attack('A28: 篡改 collectedCommands 为超大数组不应崩溃', function () {
  const records = [makeRecord()]
  const collected = new Array(100000).fill('c')
  assertNoThrow(function () {
    engine.detectUnlocks(records, baseCtx({ collectedCommands: collected }), BADGES)
  }, '超大数组不应崩溃')
})

attack('A29: unlockedIds 含非字符串元素不应崩溃', function () {
  const records = [makeRecord()]
  assertNoThrow(function () {
    engine.detectUnlocks(records, baseCtx({ unlockedIds: [null, 123, {}, 'first_escape'] }), BADGES)
  }, 'unlockedIds 含非字符串不应崩溃')
})

// ============================================================
// 6. 幂等性攻击
// ============================================================
console.log('--- 6. 幂等性攻击 ---')

attack('A30: 重复调用 detectUnlocks 不重复解锁 first_escape', function () {
  const records = [makeRecord()]
  const r1 = engine.detectUnlocks(records, baseCtx(), BADGES)
  assertTrue(r1.added.indexOf('first_escape') >= 0, '首次应解锁')

  const r2 = engine.detectUnlocks(records, baseCtx({ unlockedIds: r1.added }), BADGES)
  assertTrue(r2.added.indexOf('first_escape') < 0, '二次调用不应重复解锁')
})

attack('A31: 已解锁徽章即使条件再次满足也不返回', function () {
  const records = []
  for (let i = 0; i < 10; i++) records.push(makeRecord({ id: 'r' + i }))
  const ctx = baseCtx({ unlockedIds: ['first_escape', 'stage_explorer'] })
  const result = engine.detectUnlocks(records, ctx, BADGES)
  assertTrue(result.added.indexOf('stage_explorer') < 0, '已解锁 stage_explorer 不应重复返回')
  assertTrue(result.added.indexOf('first_escape') < 0, '已解锁 first_escape 不应重复返回')
})

attack('A32: 连续两次 detectUnlocks added 之和等于第一次', function () {
  const records = []
  for (let i = 0; i < 30; i++) records.push(makeRecord({ id: 'r' + i }))
  const r1 = engine.detectUnlocks(records, baseCtx(), BADGES)
  const r2 = engine.detectUnlocks(records, baseCtx({ unlockedIds: r1.added }), BADGES)
  // 第二次不应有任何新增（所有可解锁的都在第一次解锁了）
  assertEqual(r2.added.length, 0, '第二次调用不应有新增')
})

// ============================================================
// 7. 边界值攻击
// ============================================================
console.log('--- 7. 边界值攻击 ---')

attack('A33: 9 条记录不应解锁 stage_explorer', function () {
  const records = []
  for (let i = 0; i < 9; i++) records.push(makeRecord({ id: 'r' + i }))
  const result = engine.detectUnlocks(records, baseCtx({ unlockedIds: ['first_escape'] }), BADGES)
  assertTrue(result.added.indexOf('stage_explorer') < 0, '9 条不应解锁 stage_explorer')
})

attack('A34: 10 条记录应解锁 stage_explorer', function () {
  const records = []
  for (let i = 0; i < 10; i++) records.push(makeRecord({ id: 'r' + i }))
  const result = engine.detectUnlocks(records, baseCtx({ unlockedIds: ['first_escape'] }), BADGES)
  assertTrue(result.added.indexOf('stage_explorer') >= 0, '10 条应解锁 stage_explorer')
})

attack('A35: 2 条方向记录不应解锁方向徽章', function () {
  // 加南侧锚点拉低质心，使 r1/r2 归 north
  const records = [
    makeRecord({ id: 'anchor1', location: { latitude: 30.90, longitude: 121.0 } }),
    makeRecord({ id: 'anchor2', location: { latitude: 30.90, longitude: 121.0 } }),
    makeRecord({ id: 'r1', location: { latitude: 31.10, longitude: 121.0 } }),
    makeRecord({ id: 'r2', location: { latitude: 31.12, longitude: 121.0 } })
  ]
  const result = engine.detectUnlocks(records, baseCtx({ unlockedIds: ['first_escape'] }), BADGES)
  assertTrue(result.added.indexOf('direction_north') < 0, '2 条 north 不应解锁方向徽章')
})

attack('A36: 3 条方向记录应解锁方向徽章', function () {
  const records = [
    makeRecord({ id: 'anchor1', location: { latitude: 30.90, longitude: 121.0 } }),
    makeRecord({ id: 'anchor2', location: { latitude: 30.90, longitude: 121.0 } }),
    makeRecord({ id: 'r1', location: { latitude: 31.10, longitude: 121.0 } }),
    makeRecord({ id: 'r2', location: { latitude: 31.12, longitude: 121.0 } }),
    makeRecord({ id: 'r3', location: { latitude: 31.14, longitude: 121.0 } })
  ]
  const result = engine.detectUnlocks(records, baseCtx({ unlockedIds: ['first_escape'] }), BADGES)
  assertTrue(result.added.indexOf('direction_north') >= 0, '3 条 north 应解锁方向徽章')
})

attack('A37: 49 个独立位置不应解锁 city_detective', function () {
  const records = []
  for (let i = 0; i < 49; i++) {
    records.push(makeRecord({ id: 'r' + i, location: { latitude: 31 + i * 0.01, longitude: 121 + i * 0.01 } }))
  }
  const result = engine.detectUnlocks(records, baseCtx({ unlockedIds: ['first_escape'] }), BADGES)
  assertTrue(result.added.indexOf('city_detective') < 0, '49 个位置不应解锁城市侦探')
})

attack('A38: 50 个独立位置应解锁 city_detective', function () {
  const records = []
  for (let i = 0; i < 50; i++) {
    records.push(makeRecord({ id: 'r' + i, location: { latitude: 31 + i * 0.01, longitude: 121 + i * 0.01 } }))
  }
  const result = engine.detectUnlocks(records, baseCtx({ unlockedIds: ['first_escape'] }), BADGES)
  assertTrue(result.added.indexOf('city_detective') >= 0, '50 个位置应解锁城市侦探')
})

attack('A39: 5 种类型不应解锁 explorer（需 6 种）', function () {
  const types = ['color', 'walk', 'sense', 'collect', 'food']
  const records = types.map((t, i) => makeRecord({ id: 'r' + i, commandType: t }))
  const result = engine.detectUnlocks(records, baseCtx({ unlockedIds: ['first_escape'] }), BADGES)
  assertTrue(result.added.indexOf('explorer') < 0, '5 种类型不应解锁 explorer')
})

attack('A40: 6 种类型应解锁 explorer', function () {
  const types = ['color', 'walk', 'sense', 'collect', 'food', 'culture']
  const records = types.map((t, i) => makeRecord({ id: 'r' + i, commandType: t }))
  const result = engine.detectUnlocks(records, baseCtx({ unlockedIds: ['first_escape'] }), BADGES)
  assertTrue(result.added.indexOf('explorer') >= 0, '6 种类型应解锁 explorer')
})

// ============================================================
// 8. 异常输入攻击
// ============================================================
console.log('--- 8. 异常输入攻击 ---')

attack('A41: null records 不应崩溃', function () {
  assertNoThrow(function () {
    engine.detectUnlocks(null, baseCtx(), BADGES)
  }, 'null records 不应崩溃')
})

attack('A42: null ctx 不应崩溃', function () {
  const records = [makeRecord()]
  assertNoThrow(function () {
    engine.detectUnlocks(records, null, BADGES)
  }, 'null ctx 不应崩溃')
})

attack('A43: null badgesMeta 返回空 added', function () {
  const records = [makeRecord()]
  const result = engine.detectUnlocks(records, baseCtx(), null)
  assertEqual(result.added.length, 0, 'null badgesMeta 不应解锁任何徽章')
})

attack('A44: 循环引用对象不应崩溃', function () {
  const cyclic = makeRecord({ id: 'cyclic' })
  cyclic.self = cyclic
  assertNoThrow(function () {
    engine.detectUnlocks([cyclic], baseCtx(), BADGES)
  }, '循环引用不应崩溃')
})

attack('A45: 原型链污染不应注入恶意徽章', function () {
  const maliciousMeta = [{ id: '__proto__', name: '恶意徽章', icon: 'x', category: 'special' }]
  const result = engine.detectUnlocks([makeRecord()], baseCtx(), maliciousMeta)
  assertTrue(result.added.indexOf('__proto__') < 0, '不应注入 __proto__ 徽章')
  assertTrue(result.added.indexOf('constructor') < 0, '不应注入 constructor 徽章')
})

attack('A46: Object.create(null) 记录不应崩溃', function () {
  const noProto = Object.create(null)
  noProto.id = 'noproto'
  noProto.commandType = 'walk'
  noProto.location = { latitude: 31.0, longitude: 121.0 }
  assertNoThrow(function () {
    engine.detectUnlocks([noProto], baseCtx(), BADGES)
  }, '无原型对象不应崩溃')
})

attack('A47: 超大 records 数组（10000 条）不应崩溃', function () {
  const records = []
  for (let i = 0; i < 10000; i++) {
    records.push(makeRecord({ id: 'r' + i }))
  }
  assertNoThrow(function () {
    engine.detectUnlocks(records, baseCtx({ unlockedIds: ['first_escape', 'stage_explorer', 'stage_familiar', 'stage_detective'] }), BADGES)
  }, '10000 条记录不应崩溃')
})

attack('A48: filterValidRecords 过滤混合记录', function () {
  const mixed = [
    makeRecord({ id: 'valid1' }),
    null,
    undefined,
    {},
    makeRecord({ id: 'valid2' }),
    { id: 'valid3', commandType: 'walk' }
  ]
  const valid = engine.filterValidRecords(mixed)
  assertEqual(valid.length, 3, '应只保留 3 条有效记录')
})

attack('A49: filterValidRecords 边界输入', function () {
  assertEqual(engine.filterValidRecords([]).length, 0)
  assertEqual(engine.filterValidRecords(null).length, 0)
  assertEqual(engine.filterValidRecords(undefined).length, 0)
  assertEqual(engine.filterValidRecords('string').length, 0)
})

// ============================================================
// 9. 元数据完整性攻击
// ============================================================
console.log('--- 9. 元数据完整性攻击 ---')

attack('A50: 缺失元数据的徽章不应解锁', function () {
  const partialMeta = [{ id: 'first_escape', name: '初次出逃', icon: 'x', category: 'milestone' }]
  const records = []
  for (let i = 0; i < 10; i++) records.push(makeRecord({ id: 'r' + i }))
  const result = engine.detectUnlocks(records, baseCtx(), partialMeta)
  assertTrue(result.added.indexOf('first_escape') >= 0, 'first_escape 有元数据应解锁')
  assertTrue(result.added.indexOf('stage_explorer') < 0, 'stage_explorer 无元数据不应解锁')
})

attack('A51: 规则异常不阻塞其他徽章', function () {
  const origRule = engine.RULES.color_hunter
  engine.RULES.color_hunter = function () { throw new Error('模拟异常') }
  const records = []
  for (let i = 0; i < 10; i++) records.push(makeRecord({ id: 'r' + i, commandType: 'color' }))
  try {
    const result = engine.detectUnlocks(records, baseCtx({ unlockedIds: ['first_escape'] }), BADGES)
    assertTrue(result.added.indexOf('stage_explorer') >= 0, '异常规则不应阻塞其他徽章')
    assertTrue(result.added.indexOf('color_hunter') < 0, '异常规则不应解锁')
  } finally {
    engine.RULES.color_hunter = origRule
  }
})

attack('A52: badgesMeta 含 null 元素不应崩溃', function () {
  const mixedMeta = [null, { id: 'first_escape', name: '初次出逃', icon: 'x', category: 'milestone' }, undefined]
  assertNoThrow(function () {
    engine.detectUnlocks([makeRecord()], baseCtx(), mixedMeta)
  }, 'null 元素不应崩溃')
})

// ============================================================
// 最终报告
// ============================================================
console.log('\n' + '='.repeat(60))
console.log('  badge-attack 对抗式测试报告')
console.log('='.repeat(60))
console.log('  ✓ Pass: ' + passCount)
console.log('  ✗ Fail: ' + failCount)
if (failures.length > 0) {
  console.log('  失败列表:')
  failures.forEach(f => console.log('    - ' + f))
}
console.log('='.repeat(60))

process.exit(failCount > 0 ? 1 : 0)
