// tests/unit/badge-engine.test.js
// B4 激励体系 · badge-engine 单元测试
// 运行: node tests/unit/badge-engine.test.js
//
// 覆盖：
//   - 城市方向分类（8 方位收敛为 5 类）
//   - 质心计算
//   - 阶段记录徽章（10/30/50/100 次）
//   - 城市方向徽章（东/南/西/北/中 各 3 条）
//   - 增量检测（幂等性）
//   - 全部 24 条规则覆盖
//   - 边界值与异常输入

'use strict'

const engine = require('../../utils/badge-engine.js')
const BADGES = require('../../data/badges.js')

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

// 测试辅助：构造记录
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

// ============================================================
// computeCentroid 质心计算
// ============================================================
describe('computeCentroid', () => {
  it('单条记录返回该坐标', () => {
    const r = makeRecord({ location: { latitude: 31.0, longitude: 121.0 } })
    const c = engine.computeCentroid([r])
    assertEqual(c.latitude, 31.0)
    assertEqual(c.longitude, 121.0)
    assertEqual(c.count, 1)
  })

  it('多条记录取平均', () => {
    const records = [
      makeRecord({ location: { latitude: 30.0, longitude: 120.0 } }),
      makeRecord({ location: { latitude: 32.0, longitude: 122.0 } })
    ]
    const c = engine.computeCentroid(records)
    assertEqual(c.latitude, 31.0)
    assertEqual(c.longitude, 121.0)
    assertEqual(c.count, 2)
  })

  it('无坐标记录跳过', () => {
    const records = [
      makeRecord({ location: null }),
      makeRecord({ location: { latitude: 31.0, longitude: 121.0 } })
    ]
    const c = engine.computeCentroid(records)
    assertEqual(c.count, 1)
    assertEqual(c.latitude, 31.0)
  })

  it('空数组返回 null', () => {
    assertEqual(engine.computeCentroid([]), null)
  })

  it('null/undefined 返回 null', () => {
    assertEqual(engine.computeCentroid(null), null)
    assertEqual(engine.computeCentroid(undefined), null)
  })

  it('全部无坐标返回 null', () => {
    const records = [makeRecord({ location: null }), makeRecord({ location: undefined })]
    assertEqual(engine.computeCentroid(records), null)
  })
})

// ============================================================
// classifyDirection 方向分类
// ============================================================
describe('classifyDirection', () => {
  const centroid = { latitude: 31.0, longitude: 121.0 }

  it('东侧（lng 更大且超出阈值）', () => {
    assertEqual(engine.classifyDirection({ latitude: 31.0, longitude: 121.02 }, centroid), 'east')
  })
  it('西侧（lng 更小且超出阈值）', () => {
    assertEqual(engine.classifyDirection({ latitude: 31.0, longitude: 120.98 }, centroid), 'west')
  })
  it('北侧（lat 更大且为主轴）', () => {
    assertEqual(engine.classifyDirection({ latitude: 31.02, longitude: 121.0 }, centroid), 'north')
  })
  it('南侧（lat 更小且为主轴）', () => {
    assertEqual(engine.classifyDirection({ latitude: 30.98, longitude: 121.0 }, centroid), 'south')
  })
  it('中心区（阈值内归 central）', () => {
    assertEqual(engine.classifyDirection({ latitude: 31.002, longitude: 121.002 }, centroid), 'central')
  })

  it('主轴判定：lat 变化更大时取南北', () => {
    // lat 变 0.02，lng 变 0.01，主轴为 lat
    assertEqual(engine.classifyDirection({ latitude: 31.02, longitude: 121.01 }, centroid), 'north')
  })
  it('主轴判定：lng 变化更大时取东西', () => {
    // lat 变 0.01，lng 变 0.02，主轴为 lng
    assertEqual(engine.classifyDirection({ latitude: 31.01, longitude: 121.02 }, centroid), 'east')
  })

  it('null 输入返回 null', () => {
    assertEqual(engine.classifyDirection(null, centroid), null)
    assertEqual(engine.classifyDirection({ latitude: 31, longitude: 121 }, null), null)
  })

  it('非数字坐标返回 null', () => {
    assertEqual(engine.classifyDirection({ latitude: 'a', longitude: 121 }, centroid), null)
    assertEqual(engine.classifyDirection({ latitude: NaN, longitude: 121 }, centroid), null)
    assertEqual(engine.classifyDirection({ latitude: Infinity, longitude: 121 }, centroid), null)
  })
})

// ============================================================
// buildDirectionStats 方向统计
// ============================================================
describe('buildDirectionStats', () => {
  it('统计各方向记录数', () => {
    // 质心约为 (31, 121)
    const records = [
      makeRecord({ id: 'r1', location: { latitude: 31.05, longitude: 121.0 } }),  // north
      makeRecord({ id: 'r2', location: { latitude: 30.95, longitude: 121.0 } }),  // south
      makeRecord({ id: 'r3', location: { latitude: 31.0, longitude: 121.05 } }),  // east
      makeRecord({ id: 'r4', location: { latitude: 31.0, longitude: 120.95 } })   // west
    ]
    const stats = engine.buildDirectionStats(records)
    assertEqual(stats.north, 1)
    assertEqual(stats.south, 1)
    assertEqual(stats.east, 1)
    assertEqual(stats.west, 1)
    assertEqual(stats.central, 0)
    assertEqual(stats.total, 4)
    assert(!!stats.centroid, '质心存在')
  })

  it('central 阈值内归 central', () => {
    const records = [
      makeRecord({ id: 'r1', location: { latitude: 31.001, longitude: 121.001 } }),
      makeRecord({ id: 'r2', location: { latitude: 31.002, longitude: 121.002 } }),
      makeRecord({ id: 'r3', location: { latitude: 31.003, longitude: 121.003 } })
    ]
    const stats = engine.buildDirectionStats(records)
    assert(stats.central >= 2, '至少 2 条归 central')
  })

  it('空数组返回零值结构', () => {
    const stats = engine.buildDirectionStats([])
    assertEqual(stats.east, 0)
    assertEqual(stats.total, 0)
    assertEqual(stats.centroid, null)
  })

  it('null 输入返回零值结构', () => {
    const stats = engine.buildDirectionStats(null)
    assertEqual(stats.total, 0)
    assertEqual(stats.centroid, null)
  })

  it('directionRecords 包含 recordId 和 direction', () => {
    // 单条记录质心=自身会归 central，加锚点拉低质心使 r1 归 north
    const records = [
      makeRecord({ id: 'anchor', location: { latitude: 30.90, longitude: 121.0 } }),
      makeRecord({ id: 'r1', location: { latitude: 31.10, longitude: 121.0 } })
    ]
    const stats = engine.buildDirectionStats(records)
    assertEqual(stats.directionRecords.length, 2)
    const r1Entry = stats.directionRecords.find(d => d.recordId === 'r1')
    assert(!!r1Entry, 'r1 存在于 directionRecords')
    assertEqual(r1Entry.direction, 'north')
  })
})

// ============================================================
// countUniqueLocations 独立位置计数
// ============================================================
describe('countUniqueLocations', () => {
  it('相同坐标去重', () => {
    const records = [
      makeRecord({ location: { latitude: 31.234, longitude: 121.456 } }),
      makeRecord({ location: { latitude: 31.234, longitude: 121.456 } })
    ]
    assertEqual(engine.countUniqueLocations(records), 1)
  })

  it('不同坐标各自计数', () => {
    const records = [
      makeRecord({ location: { latitude: 31.234, longitude: 121.456 } }),
      makeRecord({ location: { latitude: 31.235, longitude: 121.457 } })
    ]
    assertEqual(engine.countUniqueLocations(records), 2)
  })

  it('0.01° 内去重（1km 粒度）', () => {
    const records = [
      makeRecord({ location: { latitude: 31.231, longitude: 121.451 } }),
      makeRecord({ location: { latitude: 31.234, longitude: 121.454 } }),  // 0.003° 差，round 到 0.01 后相同
      makeRecord({ location: { latitude: 31.241, longitude: 121.461 } })   // 0.01° 差，round 后不同
    ]
    // round(31.231*100)/100 = 31.23, round(31.234*100)/100 = 31.23, round(31.241*100)/100 = 31.24
    assertEqual(engine.countUniqueLocations(records), 2)
  })

  it('空数组返回 0', () => {
    assertEqual(engine.countUniqueLocations([]), 0)
  })

  it('null 返回 0', () => {
    assertEqual(engine.countUniqueLocations(null), 0)
  })
})

// ============================================================
// countTypeCoverage 类型覆盖
// ============================================================
describe('countTypeCoverage', () => {
  it('统计不同类型数', () => {
    const records = [
      makeRecord({ commandType: 'color' }),
      makeRecord({ commandType: 'walk' }),
      makeRecord({ commandType: 'color' })
    ]
    assertEqual(engine.countTypeCoverage(records), 2)
  })

  it('空字符串类型不计', () => {
    const records = [
      makeRecord({ commandType: 'color' }),
      makeRecord({ commandType: '' }),
      makeRecord({ commandType: null })
    ]
    assertEqual(engine.countTypeCoverage(records), 1)
  })

  it('空数组返回 0', () => {
    assertEqual(engine.countTypeCoverage([]), 0)
  })
})

// ============================================================
// parseHour / isNightRecord
// ============================================================
describe('parseHour / isNightRecord', () => {
  it('parseHour 从 time 字段解析', () => {
    assertEqual(engine.parseHour({ time: '22:30' }), 22)
    assertEqual(engine.parseHour({ time: '06:00' }), 6)
    assertEqual(engine.parseHour({ time: '00:00' }), 0)
  })

  it('parseHour 优先使用 hour 字段', () => {
    assertEqual(engine.parseHour({ hour: 23, time: '10:00' }), 23)
  })

  it('parseHour 无效输入返回 -1', () => {
    assertEqual(engine.parseHour({}), -1)
    assertEqual(engine.parseHour({ time: '' }), -1)
    assertEqual(engine.parseHour({ time: 'invalid' }), -1)
    assertEqual(engine.parseHour({ time: '25:00' }), -1)
    assertEqual(engine.parseHour(null), -1)
  })

  it('isNightRecord 22:00-06:00 为夜间', () => {
    assert(engine.isNightRecord({ time: '22:00' }) === true, '22:00 夜间')
    assert(engine.isNightRecord({ time: '23:30' }) === true, '23:30 夜间')
    assert(engine.isNightRecord({ time: '00:00' }) === true, '00:00 夜间')
    assert(engine.isNightRecord({ time: '05:59' }) === true, '05:59 夜间')
    assert(engine.isNightRecord({ time: '06:00' }) === false, '06:00 非夜间')
    assert(engine.isNightRecord({ time: '21:59' }) === false, '21:59 非夜间')
    assert(engine.isNightRecord({ time: '12:00' }) === false, '12:00 非夜间')
  })

  it('isNightRecord 无效时间返回 false', () => {
    assertEqual(engine.isNightRecord({}), false)
    assertEqual(engine.isNightRecord({ time: '' }), false)
  })
})

// ============================================================
// detectUnlocks 增量检测
// ============================================================
describe('detectUnlocks', () => {
  it('首次出逃徽章（1 条记录）', () => {
    const records = [makeRecord()]
    const ctx = { unlockedIds: [], continuousDays: 0, partnerRecords: [], collectedCommands: [], challengeCount: 0 }
    const result = engine.detectUnlocks(records, ctx, BADGES)
    assert(result.added.indexOf('first_escape') >= 0, '应解锁 first_escape')
    assert(result.metas.length >= 1, 'metas 非空')
  })

  it('阶段徽章 10 次（stage_explorer）', () => {
    const records = []
    for (let i = 0; i < 10; i++) records.push(makeRecord({ id: 'r' + i }))
    const ctx = { unlockedIds: ['first_escape'], continuousDays: 0, partnerRecords: [], collectedCommands: [], challengeCount: 0 }
    const result = engine.detectUnlocks(records, ctx, BADGES)
    assert(result.added.indexOf('stage_explorer') >= 0, '应解锁 stage_explorer')
  })

  it('阶段徽章 30 次（stage_familiar）', () => {
    const records = []
    for (let i = 0; i < 30; i++) records.push(makeRecord({ id: 'r' + i }))
    const ctx = { unlockedIds: ['first_escape', 'stage_explorer'], continuousDays: 0, partnerRecords: [], collectedCommands: [], challengeCount: 0 }
    const result = engine.detectUnlocks(records, ctx, BADGES)
    assert(result.added.indexOf('stage_familiar') >= 0, '应解锁 stage_familiar')
  })

  it('阶段徽章 50 次（stage_detective）', () => {
    const records = []
    for (let i = 0; i < 50; i++) records.push(makeRecord({ id: 'r' + i }))
    const ctx = { unlockedIds: ['first_escape', 'stage_explorer', 'stage_familiar'], continuousDays: 0, partnerRecords: [], collectedCommands: [], challengeCount: 0 }
    const result = engine.detectUnlocks(records, ctx, BADGES)
    assert(result.added.indexOf('stage_detective') >= 0, '应解锁 stage_detective')
  })

  it('阶段徽章 100 次（stage_expert）', () => {
    const records = []
    for (let i = 0; i < 100; i++) records.push(makeRecord({ id: 'r' + i }))
    const ctx = { unlockedIds: ['first_escape', 'stage_explorer', 'stage_familiar', 'stage_detective'], continuousDays: 0, partnerRecords: [], collectedCommands: [], challengeCount: 0 }
    const result = engine.detectUnlocks(records, ctx, BADGES)
    assert(result.added.indexOf('stage_expert') >= 0, '应解锁 stage_expert')
  })

  it('城市方向徽章（北侧 3 条）', () => {
    // 质心会随记录移动，需加南侧锚点记录拉低质心，使北侧记录被正确分类
    const records = [
      makeRecord({ id: 'anchor1', location: { latitude: 30.90, longitude: 121.0 } }),
      makeRecord({ id: 'anchor2', location: { latitude: 30.90, longitude: 121.0 } }),
      makeRecord({ id: 'r1', location: { latitude: 31.10, longitude: 121.0 } }),
      makeRecord({ id: 'r2', location: { latitude: 31.12, longitude: 121.0 } }),
      makeRecord({ id: 'r3', location: { latitude: 31.14, longitude: 121.0 } })
    ]
    const ctx = { unlockedIds: ['first_escape'], continuousDays: 0, partnerRecords: [], collectedCommands: [], challengeCount: 0 }
    const result = engine.detectUnlocks(records, ctx, BADGES)
    assert(result.added.indexOf('direction_north') >= 0, '应解锁 direction_north')
  })

  it('幂等性：已解锁徽章不重复返回', () => {
    const records = [makeRecord()]
    const ctx = { unlockedIds: ['first_escape'], continuousDays: 0, partnerRecords: [], collectedCommands: [], challengeCount: 0 }
    const result = engine.detectUnlocks(records, ctx, BADGES)
    assert(result.added.indexOf('first_escape') < 0, '已解锁不再返回')
  })

  it('连续 7 天（seven_streak）', () => {
    const records = [makeRecord()]
    const ctx = { unlockedIds: [], continuousDays: 7, partnerRecords: [], collectedCommands: [], challengeCount: 0 }
    const result = engine.detectUnlocks(records, ctx, BADGES)
    assert(result.added.indexOf('seven_streak') >= 0, '应解锁 seven_streak')
  })

  it('连续 30 天（thirty_streak）', () => {
    const records = [makeRecord()]
    const ctx = { unlockedIds: ['first_escape', 'seven_streak'], continuousDays: 30, partnerRecords: [], collectedCommands: [], challengeCount: 0 }
    const result = engine.detectUnlocks(records, ctx, BADGES)
    assert(result.added.indexOf('thirty_streak') >= 0, '应解锁 thirty_streak')
  })

  it('颜色探索 10 次（color_hunter）', () => {
    const records = []
    for (let i = 0; i < 10; i++) records.push(makeRecord({ id: 'r' + i, commandType: 'color' }))
    const ctx = { unlockedIds: ['first_escape'], continuousDays: 0, partnerRecords: [], collectedCommands: [], challengeCount: 0 }
    const result = engine.detectUnlocks(records, ctx, BADGES)
    assert(result.added.indexOf('color_hunter') >= 0, '应解锁 color_hunter')
  })

  it('社交达人（3 个 partnerRecords）', () => {
    const records = [makeRecord()]
    const ctx = { unlockedIds: ['first_escape'], continuousDays: 0, partnerRecords: [{}, {}, {}], collectedCommands: [], challengeCount: 0 }
    const result = engine.detectUnlocks(records, ctx, BADGES)
    assert(result.added.indexOf('social_master') >= 0, '应解锁 social_master')
  })

  it('收藏家（20 条收藏）', () => {
    const records = [makeRecord()]
    const collected = []
    for (let i = 0; i < 20; i++) collected.push('c' + i)
    const ctx = { unlockedIds: ['first_escape'], continuousDays: 0, partnerRecords: [], collectedCommands: collected, challengeCount: 0 }
    const result = engine.detectUnlocks(records, ctx, BADGES)
    assert(result.added.indexOf('collector') >= 0, '应解锁 collector')
  })

  it('探索家（6 种类型）', () => {
    const types = ['color', 'walk', 'sense', 'collect', 'food', 'culture']
    const records = types.map((t, i) => makeRecord({ id: 'r' + i, commandType: t }))
    const ctx = { unlockedIds: ['first_escape'], continuousDays: 0, partnerRecords: [], collectedCommands: [], challengeCount: 0 }
    const result = engine.detectUnlocks(records, ctx, BADGES)
    assert(result.added.indexOf('explorer') >= 0, '应解锁 explorer')
  })

  it('metas 含元数据字段', () => {
    const records = [makeRecord()]
    const ctx = { unlockedIds: [], continuousDays: 0, partnerRecords: [], collectedCommands: [], challengeCount: 0 }
    const result = engine.detectUnlocks(records, ctx, BADGES)
    const meta = result.metas.find(m => m.id === 'first_escape')
    assert(!!meta, 'meta 存在')
    assertEqual(meta.name, '初次出逃')
    assert(!!meta.icon, 'icon 存在')
    assert(!!meta.date, 'date 存在')
  })

  it('空记录返回空 added', () => {
    const result = engine.detectUnlocks([], { unlockedIds: [] }, BADGES)
    assertEqual(result.added.length, 0)
    assertEqual(result.metas.length, 0)
  })

  it('null 记录返回空 added', () => {
    const result = engine.detectUnlocks(null, { unlockedIds: [] }, BADGES)
    assertEqual(result.added.length, 0)
  })

  it('null ctx 不崩溃', () => {
    const records = [makeRecord()]
    const result = engine.detectUnlocks(records, null, BADGES)
    assert(result.added.indexOf('first_escape') >= 0, 'null ctx 仍能检测 first_escape')
  })

  it('null badgesMeta 返回空', () => {
    const records = [makeRecord()]
    const result = engine.detectUnlocks(records, { unlockedIds: [] }, null)
    assertEqual(result.added.length, 0, '无元数据则不解锁')
  })

  it('城市侦探（50 个独立位置）', () => {
    const records = []
    for (let i = 0; i < 50; i++) {
      records.push(makeRecord({ id: 'r' + i, location: { latitude: 31 + i * 0.01, longitude: 121 + i * 0.01 } }))
    }
    const ctx = { unlockedIds: ['first_escape'], continuousDays: 0, partnerRecords: [], collectedCommands: [], challengeCount: 0 }
    const result = engine.detectUnlocks(records, ctx, BADGES)
    assert(result.added.indexOf('city_detective') >= 0, '应解锁 city_detective')
  })
})

// ============================================================
// nextStageProgress 阶段进度
// ============================================================
describe('nextStageProgress', () => {
  it('0 条记录 → 下一阶段 stage_explorer', () => {
    const p = engine.nextStageProgress([])
    assertEqual(p.nextBadgeId, 'stage_explorer')
    assertEqual(p.currentCount, 0)
    assertEqual(p.targetCount, 10)
    assertEqual(p.remaining, 10)
  })

  it('5 条记录 → 下一阶段 stage_explorer', () => {
    const records = []
    for (let i = 0; i < 5; i++) records.push(makeRecord({ id: 'r' + i }))
    const p = engine.nextStageProgress(records)
    assertEqual(p.nextBadgeId, 'stage_explorer')
    assertEqual(p.currentCount, 5)
    assertEqual(p.remaining, 5)
  })

  it('10 条记录 → 下一阶段 stage_familiar', () => {
    const records = []
    for (let i = 0; i < 10; i++) records.push(makeRecord({ id: 'r' + i }))
    const p = engine.nextStageProgress(records)
    assertEqual(p.nextBadgeId, 'stage_familiar')
    assertEqual(p.targetCount, 30)
    assertEqual(p.remaining, 20)
  })

  it('100+ 条记录 → 全部解锁返回 null', () => {
    const records = []
    for (let i = 0; i < 100; i++) records.push(makeRecord({ id: 'r' + i }))
    const p = engine.nextStageProgress(records)
    assertEqual(p, null)
  })

  it('null 记录返回 stage_explorer 进度', () => {
    const p = engine.nextStageProgress(null)
    assertEqual(p.nextBadgeId, 'stage_explorer')
    assertEqual(p.currentCount, 0)
  })
})

// ============================================================
// directionProgress 方向进度
// ============================================================
describe('directionProgress', () => {
  it('统计各方向进度', () => {
    const records = [
      makeRecord({ id: 'r1', location: { latitude: 31.05, longitude: 121.0 } }),  // north
      makeRecord({ id: 'r2', location: { latitude: 30.95, longitude: 121.0 } })   // south
    ]
    const p = engine.directionProgress(records, [])
    console.log('    DEBUG: north=' + p.north + ' south=' + p.south + ' total=' + p.total + ' records=' + records.length)
    assertEqual(p.north, 1)
    assertEqual(p.south, 1)
    assertEqual(p.total, 2)
    assertEqual(p.unlockedDirs.length, 0, '未达 3 条不解锁')
  })

  it('已解锁方向加入 unlockedDirs', () => {
    const records = [
      makeRecord({ id: 'r1', location: { latitude: 31.05, longitude: 121.0 } }),
      makeRecord({ id: 'r2', location: { latitude: 31.06, longitude: 121.0 } }),
      makeRecord({ id: 'r3', location: { latitude: 31.07, longitude: 121.0 } })
    ]
    const p = engine.directionProgress(records, ['direction_north'])
    assertEqual(p.unlockedDirs.length, 1)
    assertEqual(p.unlockedDirs[0], 'north')
  })

  it('未达 3 条的方向加入 nextDirs', () => {
    // 加南侧锚点拉低质心，使北侧 1 条记录被正确分类为 north
    const records = [
      makeRecord({ id: 'anchor1', location: { latitude: 30.90, longitude: 121.0 } }),
      makeRecord({ id: 'anchor2', location: { latitude: 30.90, longitude: 121.0 } }),
      makeRecord({ id: 'r1', location: { latitude: 31.10, longitude: 121.0 } })
    ]
    const p = engine.directionProgress(records, [])
    const northNext = p.nextDirs.find(d => d.dir === 'north')
    assert(!!northNext, 'north 在 nextDirs')
    assertEqual(northNext.current, 1)
    assertEqual(northNext.remaining, 2)
  })
})

// ============================================================
// 规则表完整性
// ============================================================
describe('RULES 规则表', () => {
  it('所有 B4 新增徽章都有规则', () => {
    const b4Ids = ['stage_explorer', 'stage_familiar', 'stage_detective', 'stage_expert',
                   'direction_east', 'direction_south', 'direction_west', 'direction_north', 'direction_central']
    b4Ids.forEach(id => {
      assert(typeof engine.RULES[id] === 'function', 'RULES[' + id + '] 应为函数')
    })
  })

  it('所有 badges.js 中的徽章都有规则（除 member_pro）', () => {
    BADGES.forEach(b => {
      if (b.id === 'member_pro') return  // 会员徽章不自动解锁
      assert(typeof engine.RULES[b.id] === 'function', 'RULES[' + b.id + '] 应存在')
    })
  })
})

// ============================================================
// 最终报告
// ============================================================
console.log('\n' + '='.repeat(60))
console.log('  badge-engine 单元测试报告')
console.log('='.repeat(60))
console.log('  ✓ Pass: ' + passCount)
console.log('  ✗ Fail: ' + failCount)
if (failures.length > 0) {
  console.log('  失败列表:')
  failures.forEach(f => console.log('    - ' + f))
}
console.log('='.repeat(60))

process.exit(failCount > 0 ? 1 : 0)
