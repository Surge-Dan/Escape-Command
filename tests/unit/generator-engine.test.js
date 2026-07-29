// tests/unit/generator-engine.test.js
// B-02~B-06 出逃指令生成引擎单元测试
// 运行: node tests/unit/generator-engine.test.js
//
// 复用 store.test.js 的自定义测试框架风格（assert/describe/it）

'use strict'

const engine = require('../../utils/generator-engine.js')
const I = engine._internal

// ===== 自定义测试框架（与 store.test.js 风格一致）=====
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

// ===== 测试数据 =====
const SAMPLE_CMDS = [
  { id: 'c001', content: '找蓝色招牌', type: 'color', duration: 15, outdoor: true, nightSafe: false, rainy: false, requirePOI: null, cost: 0 },
  { id: 'c002', content: '听3分钟声音', type: 'sense', duration: 10, outdoor: true, nightSafe: true, rainy: true, requirePOI: null, cost: 0 },
  { id: 'c003', content: '买热乎小吃', type: 'food', duration: 15, outdoor: true, nightSafe: false, rainy: true, requirePOI: null, cost: 10 },
  { id: 'c004', content: '咖啡馆点单', type: 'food', duration: 25, outdoor: true, nightSafe: false, rainy: true, requirePOI: 'cafe', cost: 30 },
  { id: 'c005', content: '深夜便利店', type: 'food', duration: 10, outdoor: true, nightSafe: true, rainy: true, requirePOI: 'convenience', cost: 10 },
  { id: 'c006', content: '走一条没走过的路', type: 'walk', duration: 20, outdoor: true, nightSafe: false, rainy: false, requirePOI: null, cost: 0 },
  { id: 'c007', content: '公园漫步', type: 'walk', duration: 30, outdoor: true, nightSafe: false, rainy: false, requirePOI: 'park', cost: 0 },
  { id: 'c008', content: '室内看展', type: 'culture', duration: 25, outdoor: false, nightSafe: false, rainy: true, requirePOI: 'culture', cost: 0 }
]

// ============================================================
// B-01: getFaceForType
// ============================================================
describe('getFaceForType', function () {
  it('已知 type 返回 1-6', function () {
    assertEqual(engine.getFaceForType('color'), 1)
    assertEqual(engine.getFaceForType('sense'), 2)
    assertEqual(engine.getFaceForType('food'), 3)
    assertEqual(engine.getFaceForType('walk'), 4)
    assertEqual(engine.getFaceForType('collect'), 5)
    assertEqual(engine.getFaceForType('culture'), 6)
  })

  it('未知 type fallback 到 1', function () {
    assertEqual(engine.getFaceForType('unknown'), 1)
    assertEqual(engine.getFaceForType('xyz'), 1)
    assertEqual(engine.getFaceForType(''), 1)
  })

  it('非字符串 fallback 到 1', function () {
    assertEqual(engine.getFaceForType(null), 1)
    assertEqual(engine.getFaceForType(undefined), 1)
    assertEqual(engine.getFaceForType(123), 1)
    assertEqual(engine.getFaceForType([]), 1)
    assertEqual(engine.getFaceForType({}), 1)
  })

  it('返回值范围永远是 1-6', function () {
    const types = ['color', 'sense', 'food', 'walk', 'collect', 'culture', 'random', '', null, undefined, 0, 42]
    types.forEach(t => {
      const face = engine.getFaceForType(t)
      assert(face >= 1 && face <= 6, 'face 越界: ' + t + ' → ' + face)
    })
  })
})

// ============================================================
// B-02: getLoadingCopy
// ============================================================
describe('getLoadingCopy', function () {
  it('微逃短时返回非空文案', function () {
    const copy = engine.getLoadingCopy({ mode: 'micro', duration: 10, hour: 14 })
    assert(typeof copy === 'string' && copy.length > 0, '文案为空')
    assert(copy.length <= 30, '文案过长: ' + copy)
  })

  it('漫游长时返回非空文案', function () {
    const copy = engine.getLoadingCopy({ mode: 'walk', duration: 40, hour: 14 })
    assert(typeof copy === 'string' && copy.length > 0, '文案为空')
  })

  it('深夜时段返回夜语义文案', function () {
    const copy = engine.getLoadingCopy({ mode: 'micro', duration: 10, hour: 23 })
    assert(typeof copy === 'string' && copy.length > 0, '文案为空')
    // 深夜 bank 固定 3 条，都含"夜"或"安静"
    assert(copy.indexOf('夜') >= 0 || copy.indexOf('安静') >= 0, '深夜文案无夜语义: ' + copy)
  })

  it('22 点边界属于深夜（hour >= 22 触发 night 文案）', function () {
    // 变异 G3：hour >= 22 改为 > 22，会让 22 点不再走 night 库
    // 此测试确保 22 点命中 night 文案
    const copy = engine.getLoadingCopy({ mode: 'walk', duration: 30, hour: 22, weather: 'sunny' })
    assert(copy.indexOf('夜') >= 0 || copy.indexOf('安静') >= 0, '22 点未走 night 文案: ' + copy)
  })

  it('5 点边界属于深夜（hour < 6 触发 night 文案）', function () {
    const copy = engine.getLoadingCopy({ mode: 'walk', duration: 30, hour: 5, weather: 'sunny' })
    assert(copy.indexOf('夜') >= 0 || copy.indexOf('安静') >= 0, '5 点未走 night 文案: ' + copy)
  })

  it('6 点边界不再属于深夜', function () {
    // 6 点应走 mode bank 而非 night 库
    const copy = engine.getLoadingCopy({ mode: 'micro', duration: 10, hour: 6, weather: 'sunny' })
    // micro.short 不含"夜"或"安静"
    assert(!(copy.indexOf('夜') >= 0 && copy.indexOf('安静') >= 0), '6 点误走 night 库')
  })

  it('凌晨时段返回夜语义文案', function () {
    const copy = engine.getLoadingCopy({ mode: 'walk', duration: 30, hour: 3 })
    assert(copy.indexOf('夜') >= 0 || copy.indexOf('安静') >= 0, '凌晨文案无夜语义: ' + copy)
  })

  it('雨天返回雨语义文案', function () {
    const copy = engine.getLoadingCopy({ mode: 'micro', duration: 10, hour: 14, weather: 'rainy' })
    assert(copy.indexOf('雨') >= 0 || copy.indexOf('室内') >= 0, '雨天文案无雨语义: ' + copy)
  })

  it('ctx 缺失返回默认文案', function () {
    const copy = engine.getLoadingCopy(null)
    assert(typeof copy === 'string' && copy.length > 0, 'null ctx 文案为空')
  })

  it('未知 mode 返回默认文案', function () {
    const copy = engine.getLoadingCopy({ mode: 'unknown_mode', duration: 15, hour: 14 })
    assert(typeof copy === 'string' && copy.length > 0, '未知 mode 文案为空')
  })

  it('文案永远是字符串', function () {
    for (let i = 0; i < 50; i++) {
      const copy = engine.getLoadingCopy({
        mode: ['micro', 'walk', 'breakthrough', 'sync', 'night', 'rainy', 'unknown'][i % 7],
        duration: [5, 15, 25, 40][i % 4],
        hour: [3, 8, 14, 22, 23][i % 5],
        weather: ['sunny', 'rainy', 'storm'][i % 3]
      })
      assert(typeof copy === 'string' && copy.length > 0, 'iter ' + i + ' 文案非字符串')
    }
  })
})

// ============================================================
// B-03: filterByConditions
// ============================================================
describe('filterByConditions', function () {
  it('空池返回空数组', function () {
    assertEqual(engine.filterByConditions([], {}).length, 0)
    assertEqual(engine.filterByConditions(null, {}).length, 0)
    assertEqual(engine.filterByConditions(undefined, {}).length, 0)
  })

  it('非数组返回空数组', function () {
    assertEqual(engine.filterByConditions('string', {}).length, 0)
    assertEqual(engine.filterByConditions({}, {}).length, 0)
    assertEqual(engine.filterByConditions(42, {}).length, 0)
  })

  it('已完成 90 天内过滤', function () {
    const recent = new Date()
    recent.setDate(recent.getDate() - 30)  // 30 天前
    const ctx = { completedIds: ['c001'], completedDates: { c001: recent.toISOString().slice(0, 10) } }
    const result = engine.filterByConditions(SAMPLE_CMDS, ctx)
    assert(result.every(c => c.id !== 'c001'), '已完成 30 天内未被过滤')
  })

  it('已完成 90 天外保留', function () {
    const old = new Date()
    old.setDate(old.getDate() - 100)  // 100 天前
    const ctx = { completedIds: ['c001'], completedDates: { c001: old.toISOString().slice(0, 10) } }
    const result = engine.filterByConditions(SAMPLE_CMDS, ctx)
    assert(result.some(c => c.id === 'c001'), '已完成 100 天外被错误过滤')
  })

  it('已完成但无日期保守过滤', function () {
    const ctx = { completedIds: ['c001'], completedDates: {} }
    const result = engine.filterByConditions(SAMPLE_CMDS, ctx)
    assert(result.every(c => c.id !== 'c001'), '已完成无日期未保守过滤')
  })

  it('重复类型抑制（sameTypeCount >= 2）', function () {
    const ctx = { lastType: 'walk', sameTypeCount: 2 }
    const result = engine.filterByConditions(SAMPLE_CMDS, ctx)
    assert(result.every(c => c.type !== 'walk'), '重复类型 walk 未被抑制')
  })

  it('重复类型不抑制（sameTypeCount < 2）', function () {
    const ctx = { lastType: 'walk', sameTypeCount: 1 }
    const result = engine.filterByConditions(SAMPLE_CMDS, ctx)
    assert(result.some(c => c.type === 'walk'), 'sameTypeCount=1 错误抑制 walk')
  })

  it('POI 不可达过滤', function () {
    const ctx = { nearbyPOI: {} }  // 无任何 POI
    const result = engine.filterByConditions(SAMPLE_CMDS, ctx)
    assert(result.every(c => !c.requirePOI || c.requirePOI === 'null'), 'POI 不可达未过滤')
  })

  it('POI 可达保留', function () {
    const ctx = { nearbyPOI: { cafe: true } }
    const result = engine.filterByConditions(SAMPLE_CMDS, ctx)
    assert(result.some(c => c.id === 'c004'), 'cafe 可达但 c004 被过滤')
  })

  it('无任何过滤条件全保留', function () {
    // 提供完整 nearbyPOI，避免 POI 可达性误过滤
    const result = engine.filterByConditions(SAMPLE_CMDS, {
      nearbyPOI: { cafe: true, park: true, culture: true, convenience: true, lake: true, alley: true, market: true }
    })
    assertEqual(result.length, SAMPLE_CMDS.length, '无过滤条件数量不符')
  })

  it('无 nearbyPOI 时 POI 任务被过滤', function () {
    // 不提供 nearbyPOI，所有 requirePOI 任务应被过滤
    const result = engine.filterByConditions(SAMPLE_CMDS, {})
    const noPoiCount = SAMPLE_CMDS.filter(c => !c.requirePOI || c.requirePOI === 'null').length
    assertEqual(result.length, noPoiCount, 'POI 任务未过滤')
  })

  it('过滤掉非对象元素', function () {
    const mixed = [{ id: 'a', type: 'color' }, null, undefined, 'string', 42, {}]
    const result = engine.filterByConditions(mixed, {})
    assert(result.length === 1, '非对象未过滤干净: ' + result.length)
    assertEqual(result[0].id, 'a')
  })
})

// ============================================================
// B-04: filterByBusinessHours
// ============================================================
describe('filterByBusinessHours', function () {
  it('cafe 深夜过滤', function () {
    const result = engine.filterByBusinessHours([{ id: 'x', requirePOI: 'cafe' }], 23)
    assertEqual(result.length, 0, 'cafe 23点未过滤')
  })

  it('cafe 营业时间保留', function () {
    const result = engine.filterByBusinessHours([{ id: 'x', requirePOI: 'cafe' }], 14)
    assertEqual(result.length, 1, 'cafe 14点被错误过滤')
  })

  it('cafe 边界 7 点保留', function () {
    const result = engine.filterByBusinessHours([{ id: 'x', requirePOI: 'cafe' }], 7)
    assertEqual(result.length, 1, 'cafe 7点边界被过滤')
  })

  it('cafe 边界 22 点过滤（半开）', function () {
    const result = engine.filterByBusinessHours([{ id: 'x', requirePOI: 'cafe' }], 22)
    assertEqual(result.length, 0, 'cafe 22点边界未过滤')
  })

  it('convenience 凌晨保留（24h）', function () {
    const result = engine.filterByBusinessHours([{ id: 'x', requirePOI: 'convenience' }], 3)
    assertEqual(result.length, 1, 'convenience 3点被过滤')
  })

  it('park 21 点过滤', function () {
    const result = engine.filterByBusinessHours([{ id: 'x', requirePOI: 'park' }], 21)
    assertEqual(result.length, 0, 'park 21点未过滤')
  })

  it('market 20 点过滤', function () {
    const result = engine.filterByBusinessHours([{ id: 'x', requirePOI: 'market' }], 20)
    assertEqual(result.length, 0, 'market 20点未过滤')
  })

  it('无 POI 要求保留', function () {
    const result = engine.filterByBusinessHours([{ id: 'x', requirePOI: null }], 23)
    assertEqual(result.length, 1, '无 POI 要求被过滤')
  })

  it('未知 POI 类型保守保留', function () {
    const result = engine.filterByBusinessHours([{ id: 'x', requirePOI: 'unknown_type' }], 23)
    assertEqual(result.length, 1, '未知 POI 类型被过滤')
  })

  it('hour 越界不抛异常', function () {
    assertEqual(engine.filterByBusinessHours([{ id: 'x', requirePOI: 'cafe' }], -1).length, 1, 'hour=-1 抛异常或过滤错误')
    assertEqual(engine.filterByBusinessHours([{ id: 'x', requirePOI: 'cafe' }], 25).length, 1, 'hour=25 抛异常或过滤错误')
    assertEqual(engine.filterByBusinessHours([{ id: 'x', requirePOI: 'cafe' }], null).length, 1, 'hour=null 抛异常')
    assertEqual(engine.filterByBusinessHours([{ id: 'x', requirePOI: 'cafe' }], undefined).length, 1, 'hour=undefined 抛异常')
  })

  it('非数组 cmds 返回空数组', function () {
    assertEqual(engine.filterByBusinessHours(null, 14).length, 0)
    assertEqual(engine.filterByBusinessHours('string', 14).length, 0)
  })

  it('POI_HOURS 表完整', function () {
    const required = ['cafe', 'park', 'market', 'convenience', 'lake', 'alley', 'culture', 'null']
    required.forEach(poi => {
      const w = I.POI_HOURS[poi]
      assert(Array.isArray(w) && w.length === 2, 'POI_HOURS 缺 ' + poi)
      assert(w[0] >= 0 && w[0] <= 24 && w[1] >= 0 && w[1] <= 24, 'POI_HOURS ' + poi + ' 越界')
      assert(w[0] <= w[1], 'POI_HOURS ' + poi + ' start > end')
    })
  })
})

// ============================================================
// B-05: filterBySafety
// ============================================================
describe('filterBySafety', function () {
  it('深夜非 nightSafe 过滤', function () {
    const result = engine.filterBySafety(SAMPLE_CMDS, { hour: 23 })
    assert(result.every(c => c.nightSafe !== false), '深夜非 nightSafe 未过滤')
  })

  it('22 点边界属于深夜（hour >= 22 触发 nightSafe 过滤）', function () {
    // 变异 G2：hour >= 22 改为 > 22，会让 22 点不再过滤非 nightSafe
    const result = engine.filterBySafety(SAMPLE_CMDS, { hour: 22, weather: 'sunny' })
    assert(result.every(c => c.nightSafe !== false), '22 点非 nightSafe 未过滤')
  })

  it('21 点边界不属于深夜', function () {
    // 21 点不应触发 nightSafe 过滤
    const result = engine.filterBySafety(SAMPLE_CMDS, { hour: 21, weather: 'sunny' })
    // 应保留 nightSafe=false 的任务（c001、c003、c006 等）
    assert(result.some(c => c.nightSafe === false), '21 点误触发 nightSafe 过滤')
  })

  it('深夜 nightSafe 保留', function () {
    const result = engine.filterBySafety(SAMPLE_CMDS, { hour: 23 })
    assert(result.some(c => c.id === 'c002'), '深夜 nightSafe c002 被错误过滤')
  })

  it('凌晨非 nightSafe 过滤', function () {
    const result = engine.filterBySafety(SAMPLE_CMDS, { hour: 3 })
    assert(result.every(c => c.nightSafe !== false), '凌晨非 nightSafe 未过滤')
  })

  it('白天全保留（无 nightSafe 限制）', function () {
    const result = engine.filterBySafety(SAMPLE_CMDS, { hour: 14 })
    assertEqual(result.length, SAMPLE_CMDS.length, '白天错误过滤')
  })

  it('雨天户外非雨天过滤', function () {
    const result = engine.filterBySafety(SAMPLE_CMDS, { hour: 14, weather: 'rainy' })
    assert(result.every(c => c.rainy !== false || c.outdoor === false), '雨天户外非雨天未过滤')
  })

  it('雨天室内保留', function () {
    const result = engine.filterBySafety(SAMPLE_CMDS, { hour: 14, weather: 'rainy' })
    assert(result.some(c => c.id === 'c008'), '雨天室内 c008 被错误过滤')
  })

  it('极端天气只保留室内', function () {
    const result = engine.filterBySafety(SAMPLE_CMDS, { hour: 14, weather: 'storm' })
    assert(result.every(c => c.outdoor === false), '极端天气户外未过滤')
  })

  it('非数组 cmds 返回空数组', function () {
    assertEqual(engine.filterBySafety(null, {}).length, 0)
    assertEqual(engine.filterBySafety(undefined, {}).length, 0)
  })

  it('空 cmds 返回空数组', function () {
    assertEqual(engine.filterBySafety([], {}).length, 0)
  })
})

// ============================================================
// B-06: getFallbackCommands
// ============================================================
describe('getFallbackCommands', function () {
  it('返回 ≥ 8 条', function () {
    const result = engine.getFallbackCommands({})
    assert(result.length >= 8, '兜底数量不足: ' + result.length)
  })

  it('每条必有 id/type/content/duration', function () {
    const result = engine.getFallbackCommands({})
    result.forEach(cmd => {
      assert(typeof cmd.id === 'string' && cmd.id.length > 0, 'id 缺失')
      assert(typeof cmd.type === 'string', 'type 缺失')
      assert(typeof cmd.content === 'string' && cmd.content.length > 0, 'content 缺失')
      assert(typeof cmd.duration === 'number' && cmd.duration > 0, 'duration 缺失')
    })
  })

  it('所有 id 以 fb 前缀', function () {
    const result = engine.getFallbackCommands({})
    result.forEach(cmd => {
      assert(cmd.id.indexOf('fb') === 0, 'id 非 fb 前缀: ' + cmd.id)
    })
  })

  it('所有 id 唯一', function () {
    const result = engine.getFallbackCommands({})
    const ids = result.map(c => c.id)
    const unique = new Set(ids)
    assertEqual(ids.length, unique.size, '兜底 id 重复')
  })

  it('不污染常量（返回副本）', function () {
    const before = JSON.stringify(I.FALLBACK_COMMANDS)
    const result = engine.getFallbackCommands({})
    result[0].id = 'MUTATED'
    const after = JSON.stringify(I.FALLBACK_COMMANDS)
    assertEqual(before, after, '兜底常量被污染')
  })

  it('偏好感知排序（walk 顶层偏好排前）', function () {
    const result = engine.getFallbackCommands({ userPrefs: { type: { walk: 5, color: 1 } } })
    // 至少有一个 walk 类型在前半段
    const walkIndex = result.findIndex(c => c.type === 'walk')
    assert(walkIndex >= 0 && walkIndex < result.length / 2, 'walk 偏好未排前: index=' + walkIndex)
  })

  it('深夜过滤 nightSafe=false', function () {
    const result = engine.getFallbackCommands({ hour: 23 })
    assert(result.every(c => c.nightSafe !== false), '深夜兜底含 nightSafe=false')
    assert(result.length > 0, '深夜兜底为空')
  })

  it('空 ctx 不抛异常', function () {
    const result = engine.getFallbackCommands(null)
    assert(result.length > 0, 'null ctx 兜底为空')
  })
})

// ============================================================
// generate 主入口
// ============================================================
describe('generate', function () {
  it('正常生成返回 ok:true', function () {
    const result = engine.generate({ commandPool: SAMPLE_CMDS, hour: 14 })
    assertEqual(result.ok, true)
    assert(result.command && result.command.id, '生成 command 缺 id')
  })

  it('空池兜底返回 ok:true + fallback:true', function () {
    const result = engine.generate({ commandPool: [], hour: 14 })
    assertEqual(result.ok, true)
    assertEqual(result.fallback, true)
    assert(result.command && result.command.id, '兜底 command 缺 id')
  })

  it('null 池兜底', function () {
    const result = engine.generate({ commandPool: null, hour: 14 })
    assertEqual(result.ok, true)
    assertEqual(result.fallback, true)
  })

  it('null ctx 全兜底', function () {
    const result = engine.generate(null)
    assertEqual(result.ok, true)
    assert(result.command, 'null ctx 无 command')
  })

  it('undefined ctx 全兜底', function () {
    const result = engine.generate(undefined)
    assertEqual(result.ok, true)
  })

  it('micro 模式过滤 duration < 15', function () {
    // 全是长任务，micro 过滤后空 → 放宽 mode 用 filtered（仍含 1 条）→ 非 fallback
    const longCmds = [{ id: 'L1', content: 'long', type: 'walk', duration: 30, outdoor: true, nightSafe: false, rainy: false, requirePOI: null }]
    const result = engine.generate({ commandPool: longCmds, mode: 'micro', hour: 14 })
    assertEqual(result.ok, true)
    // micro 过滤空 → 兜底链第 1 步放宽 mode → 用 filtered（1 条）→ 选中 L1，非 fallback
    assertEqual(result.fallback, false)
    assertEqual(result.command.id, 'L1')
  })

  it('micro 模式全空时走 fallback 任务库', function () {
    // pool 完全为空，触发兜底任务库
    const result = engine.generate({ commandPool: [], mode: 'micro', hour: 14 })
    assertEqual(result.ok, true)
    assertEqual(result.fallback, true)
    assert(result.command && result.command.id, 'fallback command 应有 id')
  })

  it('walk 模式过滤 outdoor + duration >= 20', function () {
    const result = engine.generate({ commandPool: SAMPLE_CMDS, mode: 'walk', hour: 14 })
    assertEqual(result.ok, true)
    // walk 候选应来自 SAMPLE_CMDS 的 walk 类型
    if (!result.fallback) {
      assert(result.command.type === 'walk' || result.command.duration >= 20, 'walk 模式选了非 walk 任务')
    }
  })

  it('100 次随机 generate 永远 ok:true', function () {
    for (let i = 0; i < 100; i++) {
      const result = engine.generate({
        commandPool: i % 3 === 0 ? [] : SAMPLE_CMDS,
        hour: i % 24,
        weather: ['sunny', 'rainy', 'storm'][i % 3],
        mode: ['micro', 'walk', 'smart', ''][i % 4],
        userPrefs: { type: { walk: i % 2 } }
      })
      assert(result.ok === true && result.command, 'iter ' + i + ' 失败')
    }
  })
})

// ============================================================
// applyModeFilter
// ============================================================
describe('applyModeFilter', function () {
  it('micro 过滤 duration < 15', function () {
    const result = engine.applyModeFilter(SAMPLE_CMDS, 'micro')
    assert(result.every(c => c.duration < 15), 'micro 含长任务')
  })

  it('walk 过滤 outdoor + duration >= 20', function () {
    const result = engine.applyModeFilter(SAMPLE_CMDS, 'walk')
    assert(result.every(c => c.outdoor !== false && c.duration >= 20), 'walk 含非户外或短任务')
  })

  it('walk 边界 duration=20 必须保留（G14 守护：>=20 而非 >20）', function () {
    // 变异 G14：duration >= 20 改为 > 20，会让 c006(duration=20) 被错误排除
    // 此测试用精确边界值稳定杀掉该变异
    const result = engine.applyModeFilter(SAMPLE_CMDS, 'walk')
    assert(result.some(c => c.id === 'c006'), 'duration=20 边界 walk 任务被错误过滤')
    // 同时验证 duration=20 是入选下界
    assertEqual(Math.min.apply(null, result.map(c => c.duration)), 20, 'walk 最短时长应为 20')
  })

  it('double 过滤 double/social', function () {
    const result = engine.applyModeFilter(SAMPLE_CMDS, 'double')
    assert(result.every(c => c.double || c.social), 'double 含非双人任务')
  })

  it('空 mode 全保留', function () {
    const result = engine.applyModeFilter(SAMPLE_CMDS, '')
    assertEqual(result.length, SAMPLE_CMDS.length)
  })

  it('未知 mode 全保留', function () {
    const result = engine.applyModeFilter(SAMPLE_CMDS, 'unknown')
    assertEqual(result.length, SAMPLE_CMDS.length)
  })

  it('非数组返回空', function () {
    assertEqual(engine.applyModeFilter(null, 'micro').length, 0)
    assertEqual(engine.applyModeFilter(undefined, 'micro').length, 0)
  })
})

// ============================================================
// pickWeighted
// ============================================================
describe('pickWeighted', function () {
  it('空候选返回 null', function () {
    assertEqual(engine.pickWeighted([], {}), null)
    assertEqual(engine.pickWeighted(null, {}), null)
  })

  it('单候选返回该候选', function () {
    const cmd = { id: 'only', type: 'walk' }
    assertEqual(engine.pickWeighted([cmd], {}).id, 'only')
  })

  it('偏好类型被选中概率提升（统计）', function () {
    // 1000 次采样，walk 偏好应被选中 > 平均
    const candidates = [
      { id: 'A', type: 'walk' },
      { id: 'B', type: 'color' },
      { id: 'C', type: 'sense' }
    ]
    const prefs = { type: { walk: 10 } }
    let walkCount = 0
    for (let i = 0; i < 1000; i++) {
      if (engine.pickWeighted(candidates, prefs).id === 'A') walkCount++
    }
    // walk 权重 1.2 vs 其他 1+1=2，期望 ~36%
    assert(walkCount > 300, 'walk 偏好未提升: ' + walkCount + '/1000')
  })

  it('无偏好时三类型近似均匀', function () {
    const candidates = [
      { id: 'A', type: 'walk' },
      { id: 'B', type: 'color' },
      { id: 'C', type: 'sense' }
    ]
    const counts = { A: 0, B: 0, C: 0 }
    for (let i = 0; i < 900; i++) {
      counts[engine.pickWeighted(candidates, {}).id]++
    }
    // 每个应 ~300，容差 ±100
    assert(Math.abs(counts.A - 300) < 100, 'A 分布异常: ' + counts.A)
    assert(Math.abs(counts.B - 300) < 100, 'B 分布异常: ' + counts.B)
    assert(Math.abs(counts.C - 300) < 100, 'C 分布异常: ' + counts.C)
  })
})

// ============================================================
// _internal: normalizeCtx / isValidHour
// ============================================================
describe('_internal.normalizeCtx', function () {
  it('null ctx 返回完整默认对象', function () {
    const c = I.normalizeCtx(null)
    assert(Array.isArray(c.commandPool) && c.commandPool.length === 0)
    assert(Array.isArray(c.completedIds) && c.completedIds.length === 0)
    assert(typeof c.hour === 'number' && c.hour >= 0 && c.hour < 24)
    assert(typeof c.weather === 'string')
    assert(typeof c.mode === 'string')
    assert(c.userPrefs && typeof c.userPrefs === 'object')
  })

  it('undefined ctx 返回默认', function () {
    const c = I.normalizeCtx(undefined)
    assertEqual(c.commandPool.length, 0)
  })

  it('字符串 ctx 返回默认', function () {
    const c = I.normalizeCtx('string')
    assertEqual(c.commandPool.length, 0)
  })

  it('保留合法字段', function () {
    const c = I.normalizeCtx({ hour: 14, mode: 'micro', weather: 'rainy' })
    assertEqual(c.hour, 14)
    assertEqual(c.mode, 'micro')
    assertEqual(c.weather, 'rainy')
  })

  it('非法 hour 兜底', function () {
    const c1 = I.normalizeCtx({ hour: -1 })
    const c2 = I.normalizeCtx({ hour: 25 })
    const c3 = I.normalizeCtx({ hour: 'abc' })
    assert(c1.hour >= 0 && c1.hour < 24, 'hour=-1 未兜底')
    assert(c2.hour >= 0 && c2.hour < 24, 'hour=25 未兜底')
    assert(c3.hour >= 0 && c3.hour < 24, 'hour=abc 未兜底')
  })

  it('非数组 commandPool 兜底为空数组', function () {
    const c = I.normalizeCtx({ commandPool: 'not array' })
    assertEqual(c.commandPool.length, 0)
  })

  it('非对象 userPrefs 兜底', function () {
    const c = I.normalizeCtx({ userPrefs: 'string' })
    assert(c.userPrefs && typeof c.userPrefs === 'object')
  })
})

describe('_internal.isValidHour', function () {
  it('0-23 合法', function () {
    for (let h = 0; h < 24; h++) {
      assert(I.isValidHour(h) === true, 'hour=' + h + ' 应合法')
    }
  })

  it('负数非法', function () {
    assertEqual(I.isValidHour(-1), false)
    assertEqual(I.isValidHour(-0.5), false)
  })

  it('>= 24 非法', function () {
    assertEqual(I.isValidHour(24), false)
    assertEqual(I.isValidHour(25), false)
  })

  it('非数字非法', function () {
    assertEqual(I.isValidHour('14'), false)
    assertEqual(I.isValidHour(null), false)
    assertEqual(I.isValidHour(undefined), false)
    assertEqual(I.isValidHour(NaN), false)
    assertEqual(I.isValidHour(Infinity), false)
  })
})

// ============================================================
// _internal: 常量完整性
// ============================================================
describe('_internal 常量', function () {
  it('FALLBACK_COMMANDS >= 12 条', function () {
    assert(I.FALLBACK_COMMANDS.length >= 12, '兜底数量: ' + I.FALLBACK_COMMANDS.length)
  })

  it('FALLBACK_COMMANDS 含特定 id（fb001~fb012）', function () {
    // 变异 G12：fb001 改为 fbXXX，此测试确保所有原始 id 存在
    const ids = I.FALLBACK_COMMANDS.map(c => c.id)
    for (let i = 1; i <= 12; i++) {
      const expected = 'fb' + String(i).padStart(3, '0')
      assert(ids.indexOf(expected) >= 0, '缺 id: ' + expected)
    }
  })

  it('LOADING_COPIES 覆盖所有 mode', function () {
    const modes = ['micro', 'walk', 'breakthrough', 'sync', 'night', 'rainy', 'default']
    modes.forEach(m => {
      assert(I.LOADING_COPIES[m], 'LOADING_COPIES 缺 ' + m)
    })
  })

  it('TYPE_FACE_MAP 覆盖 6 种 type', function () {
    const types = ['color', 'sense', 'food', 'walk', 'collect', 'culture']
    types.forEach(t => {
      const f = I.TYPE_FACE_MAP[t]
      assert(f >= 1 && f <= 6, 'TYPE_FACE_MAP ' + t + ' 越界')
    })
  })
})

// ============================================================
// B-11: normalizeType
// ============================================================
describe('B-11 normalizeType', function () {
  it('sensory → sense', function () {
    assertEqual(engine.normalizeType('sensory'), 'sense')
  })
  it('market → food', function () {
    assertEqual(engine.normalizeType('market'), 'food')
  })
  it('moment → collect', function () {
    assertEqual(engine.normalizeType('moment'), 'collect')
  })
  it('已知归一 key 原样返回', function () {
    assertEqual(engine.normalizeType('color'), 'color')
    assertEqual(engine.normalizeType('sense'), 'sense')
    assertEqual(engine.normalizeType('food'), 'food')
    assertEqual(engine.normalizeType('walk'), 'walk')
    assertEqual(engine.normalizeType('collect'), 'collect')
    assertEqual(engine.normalizeType('culture'), 'culture')
  })
  it('未知字符串原样返回', function () {
    assertEqual(engine.normalizeType('unknown'), 'unknown')
    assertEqual(engine.normalizeType('xyz'), 'xyz')
    assertEqual(engine.normalizeType(''), '')
  })
  it('非字符串返回空串', function () {
    assertEqual(engine.normalizeType(null), '')
    assertEqual(engine.normalizeType(undefined), '')
    assertEqual(engine.normalizeType(123), '')
    assertEqual(engine.normalizeType([]), '')
    assertEqual(engine.normalizeType({}), '')
  })
  it('幂等：归一化后再归一化不变', function () {
    const types = ['sensory', 'market', 'moment', 'color', 'sense', 'food', 'walk', 'collect', 'culture', 'unknown']
    types.forEach(t => {
      const once = engine.normalizeType(t)
      const twice = engine.normalizeType(once)
      assertEqual(twice, once, 'normalizeType 不幂等: ' + t + ' → ' + once + ' → ' + twice)
    })
  })
})

// ============================================================
// B-11: buildTypeWeights
// ============================================================
describe('B-11 buildTypeWeights', function () {
  it('无偏好返回空对象', function () {
    const w = I.buildTypeWeights({})
    assertEqual(Object.keys(w).length, 0)
    const w2 = I.buildTypeWeights(null)
    assertEqual(Object.keys(w2).length, 0)
  })
  it('单类型偏好 top1 = 1.5x', function () {
    const w = I.buildTypeWeights({ type: { walk: 5 } })
    assertEqual(w.walk, 1.5)
  })
  it('双类型 top1=1.5 top2=1.2', function () {
    const w = I.buildTypeWeights({ type: { walk: 10, color: 5 } })
    assertEqual(w.walk, 1.5)
    assertEqual(w.color, 1.2)
  })
  it('三类型 top1=1.5 top2=1.2 top3=1.1', function () {
    const w = I.buildTypeWeights({ type: { walk: 10, color: 8, sense: 5 } })
    assertEqual(w.walk, 1.5)
    assertEqual(w.color, 1.2)
    assertEqual(w.sense, 1.1)
  })
  it('四类型 top4 起回归 1x', function () {
    const w = I.buildTypeWeights({ type: { walk: 10, color: 8, sense: 5, food: 3 } })
    assertEqual(w.walk, 1.5)
    assertEqual(w.color, 1.2)
    assertEqual(w.sense, 1.1)
    assertEqual(w.food, 1)
  })
  it('计数排序：高计数得高权重', function () {
    const w = I.buildTypeWeights({ type: { color: 1, walk: 100 } })
    assertEqual(w.walk, 1.5)
    assertEqual(w.color, 1.2)
  })
  it('sensory/market/moment 偏好 key 归一化', function () {
    // 偏好 key 用 commands 旧名，buildTypeWeights 应归一化后赋权
    const w = I.buildTypeWeights({ type: { sensory: 10 } })
    assertEqual(w.sense, 1.5)
    assertEqual(w.sensory, undefined)
  })
  it('count <= 0 不参与', function () {
    const w = I.buildTypeWeights({ type: { walk: 0, color: -1 } })
    assertEqual(Object.keys(w).length, 0)
  })
})

// ============================================================
// B-07: filterByWeather
// ============================================================
describe('B-07 filterByWeather', function () {
  it('空数组返回空', function () {
    assertEqual(engine.filterByWeather([], {}).length, 0)
    assertEqual(engine.filterByWeather(null, {}).length, 0)
    assertEqual(engine.filterByWeather(undefined, {}).length, 0)
  })
  it('weatherDetail 未提供 → 原样返回', function () {
    const ctx = { weatherDetail: { temperature: null, visibility: '', condition: '' } }
    const r = engine.filterByWeather(SAMPLE_CMDS, ctx)
    assertEqual(r.length, SAMPLE_CMDS.length)
  })
  it('weatherDetail 缺失 → 原样返回', function () {
    const r = engine.filterByWeather(SAMPLE_CMDS, {})
    assertEqual(r.length, SAMPLE_CMDS.length)
  })
  it('高温 >32℃ 过滤 duration>30 的纯户外', function () {
    const cmds = [
      { id: 'h1', content: '长户外', type: 'walk', duration: 45, outdoor: true },
      { id: 'h2', content: '短户外', type: 'walk', duration: 20, outdoor: true },
      { id: 'h3', content: '长室内', type: 'culture', duration: 45, outdoor: false }
    ]
    const ctx = { weatherDetail: { temperature: 35, visibility: '', condition: '' } }
    const r = engine.filterByWeather(cmds, ctx)
    const ids = r.map(c => c.id)
    assert(ids.indexOf('h1') < 0, '长户外高温应被过滤')
    assert(ids.indexOf('h2') >= 0, '短户外应保留')
    assert(ids.indexOf('h3') >= 0, '长室内应保留')
  })
  it('低温 <5℃ 过滤 duration>30 的户外', function () {
    const cmds = [
      { id: 'c1', content: '长户外', type: 'walk', duration: 45, outdoor: true },
      { id: 'c2', content: '短户外', type: 'walk', duration: 20, outdoor: true },
      { id: 'c3', content: '长室内', type: 'culture', duration: 45, outdoor: false }
    ]
    const ctx = { weatherDetail: { temperature: -2, visibility: '', condition: '' } }
    const r = engine.filterByWeather(cmds, ctx)
    const ids = r.map(c => c.id)
    assert(ids.indexOf('c1') < 0, '长户外低温应被过滤')
    assert(ids.indexOf('c2') >= 0, '短户外应保留')
    assert(ids.indexOf('c3') >= 0, '长室内应保留')
  })
  it('低能见度过滤 outdoor && duration>20', function () {
    const cmds = [
      { id: 'v1', content: '长户外', type: 'walk', duration: 25, outdoor: true },
      { id: 'v2', content: '短户外', type: 'walk', duration: 15, outdoor: true },
      { id: 'v3', content: '长室内', type: 'culture', duration: 25, outdoor: false }
    ]
    const ctx = { weatherDetail: { temperature: null, visibility: 'fog', condition: '' } }
    const r = engine.filterByWeather(cmds, ctx)
    const ids = r.map(c => c.id)
    assert(ids.indexOf('v1') < 0, '长户外雾天应被过滤')
    assert(ids.indexOf('v2') >= 0, '短户外应保留')
    assert(ids.indexOf('v3') >= 0, '长室内应保留')
  })
  it('霾/低能见度同样过滤', function () {
    const cmds = [{ id: 'hz1', content: '长户外', duration: 25, outdoor: true }]
    const r1 = engine.filterByWeather(cmds, { weatherDetail: { temperature: null, visibility: 'haze', condition: '' } })
    const r2 = engine.filterByWeather(cmds, { weatherDetail: { temperature: null, visibility: 'poor', condition: '' } })
    assertEqual(r1.length, 0)
    assertEqual(r2.length, 0)
  })
  it('边界：温度=32 不过滤，温度=33 过滤', function () {
    const cmds = [{ id: 'b1', content: '长户外', duration: 45, outdoor: true }]
    const r1 = engine.filterByWeather(cmds, { weatherDetail: { temperature: 32, visibility: '', condition: '' } })
    const r2 = engine.filterByWeather(cmds, { weatherDetail: { temperature: 33, visibility: '', condition: '' } })
    assertEqual(r1.length, 1, '温度=32 不应触发高温过滤')
    assertEqual(r2.length, 0, '温度=33 应触发高温过滤')
  })
  it('边界：温度=5 不过滤，温度=4 过滤', function () {
    const cmds = [{ id: 'b2', content: '长户外', duration: 45, outdoor: true }]
    const r1 = engine.filterByWeather(cmds, { weatherDetail: { temperature: 5, visibility: '', condition: '' } })
    const r2 = engine.filterByWeather(cmds, { weatherDetail: { temperature: 4, visibility: '', condition: '' } })
    assertEqual(r1.length, 1, '温度=5 不应触发低温过滤')
    assertEqual(r2.length, 0, '温度=4 应触发低温过滤')
  })
  it('边界：duration=30 不过滤，duration=31 过滤（高温）', function () {
    const cmds = [
      { id: 'd1', content: 'd30', duration: 30, outdoor: true },
      { id: 'd2', content: 'd31', duration: 31, outdoor: true }
    ]
    const r = engine.filterByWeather(cmds, { weatherDetail: { temperature: 35, visibility: '', condition: '' } })
    const ids = r.map(c => c.id)
    assert(ids.indexOf('d1') >= 0, 'duration=30 不应过滤')
    assert(ids.indexOf('d2') < 0, 'duration=31 应过滤')
  })
  it('null cmd 元素被过滤', function () {
    const cmds = [null, { id: 'x1', content: 'ok', duration: 10, outdoor: false }]
    const r = engine.filterByWeather(cmds, { weatherDetail: { temperature: 35, visibility: '', condition: '' } })
    assertEqual(r.length, 1)
  })
})

// ============================================================
// B-08: filterByLocationDedup
// ============================================================
describe('B-08 filterByLocationDedup', function () {
  it('空数组返回空', function () {
    assertEqual(engine.filterByLocationDedup([], {}).length, 0)
    assertEqual(engine.filterByLocationDedup(null, {}).length, 0)
  })
  it('recentLocations 空 → 原样返回', function () {
    const r = engine.filterByLocationDedup(SAMPLE_CMDS, {})
    assertEqual(r.length, SAMPLE_CMDS.length)
  })
  it('无 requirePOI 的指令不受限', function () {
    const ctx = {
      recentLocations: ['cafe'],
      recentLocationTimes: [Date.now()]
    }
    const noPoi = SAMPLE_CMDS.filter(c => !c.requirePOI)
    const r = engine.filterByLocationDedup(noPoi, ctx)
    assertEqual(r.length, noPoi.length)
  })
  it('24h 内同 POI → 过滤', function () {
    const ctx = {
      recentLocations: ['cafe'],
      recentLocationTimes: [Date.now()]
    }
    const r = engine.filterByLocationDedup(SAMPLE_CMDS, ctx)
    const ids = r.map(c => c.id)
    assert(ids.indexOf('c004') < 0, 'c004 cafe 24h 内应被过滤')
    assert(ids.indexOf('c005') >= 0, 'c005 convenience 不受影响')
  })
  it('24h 外同 POI → 保留', function () {
    const ctx = {
      recentLocations: ['cafe'],
      recentLocationTimes: [Date.now() - 25 * 60 * 60 * 1000]  // 25h 前
    }
    const r = engine.filterByLocationDedup(SAMPLE_CMDS, ctx)
    const ids = r.map(c => c.id)
    assert(ids.indexOf('c004') >= 0, 'c004 cafe 24h 外应保留')
  })
  it('边界：恰好 24h → 保留（半开区间）', function () {
    const ctx = {
      recentLocations: ['cafe'],
      recentLocationTimes: [Date.now() - 24 * 60 * 60 * 1000]
    }
    const r = engine.filterByLocationDedup(SAMPLE_CMDS, ctx)
    const ids = r.map(c => c.id)
    assert(ids.indexOf('c004') >= 0, 'c004 cafe 恰好 24h 应保留')
  })
  it('时间戳缺失 → 保守过滤', function () {
    const ctx = {
      recentLocations: ['cafe'],
      recentLocationTimes: []  // 缺时间戳
    }
    const r = engine.filterByLocationDedup(SAMPLE_CMDS, ctx)
    const ids = r.map(c => c.id)
    assert(ids.indexOf('c004') < 0, 'c004 cafe 无时间戳应保守过滤')
  })
  it('null cmd 元素被过滤', function () {
    const cmds = [null, { id: 'x1', requirePOI: null }]
    const r = engine.filterByLocationDedup(cmds, { recentLocations: ['cafe'], recentLocationTimes: [Date.now()] })
    assertEqual(r.length, 1)
  })
  it('requirePOI="null" 字符串不受限', function () {
    const cmds = [{ id: 'n1', requirePOI: 'null' }]
    const r = engine.filterByLocationDedup(cmds, { recentLocations: ['null'], recentLocationTimes: [Date.now()] })
    assertEqual(r.length, 1)
  })
  it('多 POI 同时去重', function () {
    const ctx = {
      recentLocations: ['cafe', 'park'],
      recentLocationTimes: [Date.now(), Date.now()]
    }
    const r = engine.filterByLocationDedup(SAMPLE_CMDS, ctx)
    const ids = r.map(c => c.id)
    assert(ids.indexOf('c004') < 0, 'cafe 应去重')
    assert(ids.indexOf('c007') < 0, 'park 应去重')
    assert(ids.indexOf('c005') >= 0, 'convenience 不受影响')
  })
})

// ============================================================
// B-09: extractKeywords + jaccard
// ============================================================
describe('B-09 extractKeywords', function () {
  it('正常中文文本提取 2-gram', function () {
    const kw = I.extractKeywords('找蓝色招牌')
    // 找蓝 / 蓝色 / 色招 / 招牌
    assert(kw.length >= 3, '2-gram 数量异常: ' + kw.length)
    assert(kw.indexOf('找蓝') >= 0, '缺 2-gram 找蓝')
    assert(kw.indexOf('蓝色') >= 0, '缺 2-gram 蓝色')
    assert(kw.indexOf('招牌') >= 0, '缺 2-gram 招牌')
  })
  it('短文本 <2 字符返回空', function () {
    assertEqual(I.extractKeywords('').length, 0)
    assertEqual(I.extractKeywords('A').length, 0)
  })
  it('过滤标点/数字/字母', function () {
    const kw = I.extractKeywords('找，5个A')
    // 「，」「5」「A」应被过滤，只留可组中文 gram
    assert(kw.indexOf('，5') < 0, '标点 2-gram 未过滤')
    assert(kw.indexOf('5个') < 0, '数字 2-gram 未过滤')
  })
  it('非字符串返回空', function () {
    assertEqual(I.extractKeywords(null).length, 0)
    assertEqual(I.extractKeywords(undefined).length, 0)
    assertEqual(I.extractKeywords(123).length, 0)
  })
  it('去重：相同 2-gram 只留一个', function () {
    const kw = I.extractKeywords('蓝蓝蓝')
    // 蓝蓝 只应出现一次
    assertEqual(kw.length, 1)
  })
})

describe('B-09 jaccard', function () {
  it('完全相同 = 1', function () {
    const a = ['找蓝', '蓝色', '招牌']
    assertEqual(I.jaccard(a, a), 1)
  })
  it('完全不同 = 0', function () {
    assertEqual(I.jaccard(['找蓝'], ['听声']), 0)
  })
  it('部分重叠 0-1 之间', function () {
    const a = ['找蓝', '蓝色', '招牌']
    const b = ['找蓝', '听声', '声音']
    // 交集 1（找蓝），并集 5
    assertEqual(I.jaccard(a, b), 1 / 5)
  })
  it('空集返回 0', function () {
    assertEqual(I.jaccard([], ['找蓝']), 0)
    assertEqual(I.jaccard(['找蓝'], []), 0)
    assertEqual(I.jaccard([], []), 0)
  })
  it('非数组返回 0', function () {
    assertEqual(I.jaccard(null, ['a']), 0)
    assertEqual(I.jaccard(['a'], 'x'), 0)
  })
})

describe('B-09 filterBySimilar', function () {
  it('空数组返回空', function () {
    assertEqual(engine.filterBySimilar([], {}).length, 0)
    assertEqual(engine.filterBySimilar(null, {}).length, 0)
  })
  it('recentContents 空 → 原样返回', function () {
    const r = engine.filterBySimilar(SAMPLE_CMDS, {})
    assertEqual(r.length, SAMPLE_CMDS.length)
  })
  it('高度相似 content (>0.6) → 过滤', function () {
    // c001 content '找蓝色招牌'，recentContents 用几乎相同文本
    const ctx = { recentContents: ['找蓝色招牌'] }
    const r = engine.filterBySimilar(SAMPLE_CMDS, ctx)
    const ids = r.map(c => c.id)
    assert(ids.indexOf('c001') < 0, 'c001 与 recent 高相似应过滤')
    assert(ids.indexOf('c002') >= 0, 'c002 不相似应保留')
  })
  it('低相似 content (<=0.6) → 保留', function () {
    const ctx = { recentContents: ['听3分钟声音'] }  // 与 c002 完全相同
    const r = engine.filterBySimilar(SAMPLE_CMDS, ctx)
    const ids = r.map(c => c.id)
    assert(ids.indexOf('c001') >= 0, 'c001 与 recent 不相似应保留')
    assert(ids.indexOf('c002') < 0, 'c002 与 recent 完全相同应过滤')
  })
  it('无 content 的指令保留', function () {
    const cmds = [{ id: 'nc', type: 'walk' }]
    const r = engine.filterBySimilar(cmds, { recentContents: ['找蓝色招牌'] })
    assertEqual(r.length, 1)
  })
  it('null cmd 元素被保留（无 content 视为不相似）', function () {
    // filterBySimilar 约定：无 content 的指令（含 null）保留，只过滤有 content 且相似的
    const cmds = [null, { id: 'x1', content: '正常文本' }]
    const r = engine.filterBySimilar(cmds, { recentContents: ['不同文本'] })
    assertEqual(r.length, 2)
  })
})

// ============================================================
// B-10: computeDifficulty
// ============================================================
describe('B-10 computeDifficulty', function () {
  it('null/非对象返回 1', function () {
    assertEqual(engine.computeDifficulty(null), 1)
    assertEqual(engine.computeDifficulty(undefined), 1)
    assertEqual(engine.computeDifficulty('x'), 1)
    assertEqual(engine.computeDifficulty([]), 1)
  })
  it('短时长无户外无花费 → 1', function () {
    assertEqual(engine.computeDifficulty({ duration: 10, outdoor: false, cost: 0 }), 1)
    assertEqual(engine.computeDifficulty({ duration: 5, outdoor: false, cost: 0 }), 1)
  })
  it('duration/15 向下取整', function () {
    // duration=15 → 1, duration=30 → 2, duration=45 → 3
    assertEqual(engine.computeDifficulty({ duration: 15, outdoor: false, cost: 0 }), 1)
    assertEqual(engine.computeDifficulty({ duration: 29, outdoor: false, cost: 0 }), 1)
    assertEqual(engine.computeDifficulty({ duration: 30, outdoor: false, cost: 0 }), 2)
    assertEqual(engine.computeDifficulty({ duration: 45, outdoor: false, cost: 0 }), 3)
  })
  it('户外 +1', function () {
    // duration=15 base=1, +outdoor=2
    assertEqual(engine.computeDifficulty({ duration: 15, outdoor: true, cost: 0 }), 2)
    // duration=30 base=2, +outdoor=3（封顶）
    assertEqual(engine.computeDifficulty({ duration: 30, outdoor: true, cost: 0 }), 3)
  })
  it('高花费 +1', function () {
    // duration=15 base=1, +cost=2
    assertEqual(engine.computeDifficulty({ duration: 15, outdoor: false, cost: 30 }), 2)
    assertEqual(engine.computeDifficulty({ duration: 15, outdoor: false, cost: 100 }), 2)
  })
  it('综合：长时长+户外+高花费 封顶 3', function () {
    assertEqual(engine.computeDifficulty({ duration: 60, outdoor: true, cost: 50 }), 3)
    assertEqual(engine.computeDifficulty({ duration: 1000, outdoor: true, cost: 999 }), 3)
  })
  it('clamp 下界 1', function () {
    assertEqual(engine.computeDifficulty({ duration: 0, outdoor: false, cost: 0 }), 1)
    assertEqual(engine.computeDifficulty({ duration: -5, outdoor: false, cost: -10 }), 1)
  })
  it('缺字段兜底', function () {
    assertEqual(engine.computeDifficulty({}), 1)
    assertEqual(engine.computeDifficulty({ duration: undefined }), 1)
  })
  it('边界：cost=29 不加，cost=30 加', function () {
    // duration=15 base=1，cost=29 不加 → 1，cost=30 +1 → 2
    assertEqual(engine.computeDifficulty({ duration: 15, outdoor: false, cost: 29 }), 1)
    assertEqual(engine.computeDifficulty({ duration: 15, outdoor: false, cost: 30 }), 2)
  })
})

describe('B-10 filterByDifficulty', function () {
  it('空数组返回空', function () {
    assertEqual(engine.filterByDifficulty([], {}).length, 0)
    assertEqual(engine.filterByDifficulty(null, {}).length, 0)
  })
  it('medium 全留', function () {
    const cmds = [
      { id: 'd1', duration: 5, outdoor: false, cost: 0 },    // diff 1
      { id: 'd2', duration: 30, outdoor: false, cost: 0 },   // diff 2
      { id: 'd3', duration: 45, outdoor: true, cost: 50 }    // diff 3
    ]
    const r = engine.filterByDifficulty(cmds, { userIntensity: 'medium' })
    assertEqual(r.length, 3)
  })
  it('low 留 1-2', function () {
    const cmds = [
      { id: 'd1', duration: 5, outdoor: false, cost: 0 },    // diff 1
      { id: 'd2', duration: 30, outdoor: false, cost: 0 },   // diff 2
      { id: 'd3', duration: 45, outdoor: true, cost: 50 }    // diff 3
    ]
    const r = engine.filterByDifficulty(cmds, { userIntensity: 'low' })
    const ids = r.map(c => c.id)
    assert(ids.indexOf('d1') >= 0, 'low 应留 diff 1')
    assert(ids.indexOf('d2') >= 0, 'low 应留 diff 2')
    assert(ids.indexOf('d3') < 0, 'low 应过滤 diff 3')
  })
  it('high 留 2-3', function () {
    const cmds = [
      { id: 'd1', duration: 5, outdoor: false, cost: 0 },    // diff 1
      { id: 'd2', duration: 30, outdoor: false, cost: 0 },   // diff 2
      { id: 'd3', duration: 45, outdoor: true, cost: 50 }    // diff 3
    ]
    const r = engine.filterByDifficulty(cmds, { userIntensity: 'high' })
    const ids = r.map(c => c.id)
    assert(ids.indexOf('d1') < 0, 'high 应过滤 diff 1')
    assert(ids.indexOf('d2') >= 0, 'high 应留 diff 2')
    assert(ids.indexOf('d3') >= 0, 'high 应留 diff 3')
  })
  it('userIntensity 未传 → medium 全留', function () {
    const r = engine.filterByDifficulty(SAMPLE_CMDS, {})
    assertEqual(r.length, SAMPLE_CMDS.length)
  })
  it('非法 userIntensity → medium 全留', function () {
    const r = engine.filterByDifficulty(SAMPLE_CMDS, { userIntensity: 'xxx' })
    assertEqual(r.length, SAMPLE_CMDS.length)
  })
  it('difficulty=2 三档都留', function () {
    const cmds = [{ id: 'm', duration: 30, outdoor: false, cost: 0 }]  // diff 2
    assertEqual(engine.filterByDifficulty(cmds, { userIntensity: 'low' }).length, 1)
    assertEqual(engine.filterByDifficulty(cmds, { userIntensity: 'medium' }).length, 1)
    assertEqual(engine.filterByDifficulty(cmds, { userIntensity: 'high' }).length, 1)
  })
})

// ============================================================
// B-12: scoreCommand
// ============================================================
describe('B-12 scoreCommand', function () {
  it('null/非对象返回 0', function () {
    assertEqual(engine.scoreCommand(null, {}), 0)
    assertEqual(engine.scoreCommand(undefined, {}), 0)
    assertEqual(engine.scoreCommand('x', {}), 0)
  })
  it('无偏好无上下文 → 基础分', function () {
    const cmd = { id: 's1', type: 'walk', duration: 20, outdoor: true, cost: 0, content: '走一段路' }
    const score = engine.scoreCommand(cmd, {})
    // 兴趣 10 + 难度 16（medium）+ 新鲜度 20 + 时长 10（无 target）+ 类型平衡 15 = 71
    assertEqual(score, 71)
  })
  it('偏好匹配 top1 加 30 分', function () {
    const cmd = { id: 's2', type: 'walk', duration: 20, outdoor: true, cost: 0, content: '走一段路' }
    const ctx = { userPrefs: { type: { walk: 10 } } }  // walk top1 = 1.5x
    const score = engine.scoreCommand(cmd, ctx)
    // 兴趣 30 + 难度 16 + 新鲜度 20 + 时长 10 + 类型平衡 15 = 91
    assertEqual(score, 91)
  })
  it('偏好匹配 top2 加 24 分', function () {
    const cmd = { id: 's3', type: 'walk', duration: 20, outdoor: true, cost: 0, content: '走一段路' }
    const ctx = { userPrefs: { type: { color: 10, walk: 5 } } }  // walk top2 = 1.2x
    const score = engine.scoreCommand(cmd, ctx)
    // 兴趣 24 + 难度 16 + 新鲜度 20 + 时长 10 + 类型平衡 15 = 85
    assertEqual(score, 85)
  })
  it('low intensity + 低难度 加 20', function () {
    const cmd = { id: 's4', type: 'walk', duration: 10, outdoor: false, cost: 0, content: '短任务' }  // diff 1
    const ctx = { userIntensity: 'low' }
    const score = engine.scoreCommand(cmd, ctx)
    // 兴趣 10 + 难度 20 + 新鲜度 20 + 时长 10 + 类型平衡 15 = 75
    assertEqual(score, 75)
  })
  it('low intensity + 高难度 加 8', function () {
    const cmd = { id: 's5', type: 'walk', duration: 60, outdoor: true, cost: 50, content: '高强度' }  // diff 3
    const ctx = { userIntensity: 'low' }
    const score = engine.scoreCommand(cmd, ctx)
    // 兴趣 10 + 难度 8 + 新鲜度 20 + 时长 10 + 类型平衡 15 = 63
    assertEqual(score, 63)
  })
  it('high intensity + 高难度 加 20', function () {
    const cmd = { id: 's6', type: 'walk', duration: 60, outdoor: true, cost: 50, content: '高强度' }
    const ctx = { userIntensity: 'high' }
    const score = engine.scoreCommand(cmd, ctx)
    // 兴趣 10 + 难度 20 + 新鲜度 20 + 时长 10 + 类型平衡 15 = 75
    assertEqual(score, 75)
  })
  it('新鲜度：与 recentContents 相似 → 降权 6 分', function () {
    const cmd = { id: 's7', type: 'walk', duration: 20, outdoor: true, cost: 0, content: '找蓝色招牌' }
    const ctx = { recentContents: ['找蓝色招牌'] }
    const score = engine.scoreCommand(cmd, ctx)
    // 兴趣 10 + 难度 16 + 新鲜度 6 + 时长 10 + 类型平衡 15 = 57
    assertEqual(score, 57)
  })
  it('新鲜度：requirePOI 在 recentLocations → 降权', function () {
    const cmd = { id: 's8', type: 'walk', duration: 20, outdoor: true, cost: 0, content: '走一段路', requirePOI: 'cafe' }
    const ctx = { recentLocations: ['cafe'], recentLocationTimes: [Date.now()] }
    const score = engine.scoreCommand(cmd, ctx)
    // 兴趣 10 + 难度 16 + 新鲜度 6 + 时长 10 + 类型平衡 15 = 57
    assertEqual(score, 57)
  })
  it('时长匹配：targetDuration 偏差 <=5 加 15', function () {
    const cmd = { id: 's9', type: 'walk', duration: 20, outdoor: true, cost: 0, content: '走一段路' }
    const ctx = { targetDuration: 22 }
    const score = engine.scoreCommand(cmd, ctx)
    // 兴趣 10 + 难度 16 + 新鲜度 20 + 时长 15 + 类型平衡 15 = 76
    assertEqual(score, 76)
  })
  it('时长匹配：偏差 <=15 加 10', function () {
    const cmd = { id: 's10', type: 'walk', duration: 20, outdoor: true, cost: 0, content: '走一段路' }
    const ctx = { targetDuration: 30 }
    const score = engine.scoreCommand(cmd, ctx)
    // 兴趣 10 + 难度 16 + 新鲜度 20 + 时长 10 + 类型平衡 15 = 71
    assertEqual(score, 71)
  })
  it('时长匹配：偏差 >15 加 5', function () {
    const cmd = { id: 's11', type: 'walk', duration: 20, outdoor: true, cost: 0, content: '走一段路' }
    const ctx = { targetDuration: 50 }
    const score = engine.scoreCommand(cmd, ctx)
    // 兴趣 10 + 难度 16 + 新鲜度 20 + 时长 5 + 类型平衡 15 = 66
    assertEqual(score, 66)
  })
  it('类型平衡：与 lastType 相同 → 4 分', function () {
    const cmd = { id: 's12', type: 'walk', duration: 20, outdoor: true, cost: 0, content: '走一段路' }
    const ctx = { lastType: 'walk' }
    const score = engine.scoreCommand(cmd, ctx)
    // 兴趣 10 + 难度 16 + 新鲜度 20 + 时长 10 + 类型平衡 4 = 60
    assertEqual(score, 60)
  })
  it('sensory type 归一化后匹配偏好', function () {
    const cmd = { id: 's13', type: 'sensory', duration: 20, outdoor: true, cost: 0, content: '感官任务' }
    const ctx = { userPrefs: { type: { sense: 10 } } }  // 偏好 key 是 sense
    const score = engine.scoreCommand(cmd, ctx)
    // sensory 归一化为 sense，匹配 top1 1.5x → 兴趣 30 + 16 + 20 + 10 + 15 = 91
    assertEqual(score, 91)
  })
})

describe('B-12 pickBestScored', function () {
  it('空候选返回 null', function () {
    assertEqual(engine.pickBestScored([], {}), null)
    assertEqual(engine.pickBestScored(null, {}), null)
  })
  it('单候选返回该候选', function () {
    const cmd = { id: 'only', type: 'walk' }
    assertEqual(engine.pickBestScored([cmd], {}).id, 'only')
  })
  it('必返回最高分之一（top3）', function () {
    // 构造 5 个候选，分数明确，pickBestScored 必在 top3 内
    const cmds = [
      { id: 'top1', type: 'walk', duration: 20, outdoor: true, cost: 0, content: '走一段路' },
      { id: 'top2', type: 'walk', duration: 20, outdoor: true, cost: 0, content: '另一段路' },
      { id: 'top3', type: 'walk', duration: 20, outdoor: true, cost: 0, content: '第三段路' },
      { id: 'low1', type: 'walk', duration: 60, outdoor: true, cost: 50, content: '高强度任务' },
      { id: 'low2', type: 'walk', duration: 5, outdoor: false, cost: 0, content: '太短任务' }
    ]
    // 用 walk 偏好让 top1-3 拿兴趣分，low1/low2 难度匹配差
    const ctx = { userPrefs: { type: { walk: 10 } }, userIntensity: 'medium' }
    for (let i = 0; i < 100; i++) {
      const picked = engine.pickBestScored(cmds, ctx)
      assert(['top1', 'top2', 'top3'].indexOf(picked.id) >= 0, 'pickBestScored 选出 top3 外: ' + picked.id)
    }
  })
  it('统计：top3 外的低分候选必不被选', function () {
    // 4 候选，low1 分数最低排第 4，不进 top3，pickBestScored 必不选 low1
    const cmds = [
      { id: 'top1', type: 'walk', duration: 20, outdoor: true, cost: 0, content: '走一段路' },
      { id: 'top2', type: 'walk', duration: 20, outdoor: true, cost: 0, content: '另一段' },
      { id: 'top3', type: 'walk', duration: 20, outdoor: true, cost: 0, content: '第三段' },
      { id: 'low1', type: 'walk', duration: 60, outdoor: true, cost: 50, content: '高强度' }
    ]
    const ctx = { userPrefs: { type: { walk: 10 } }, userIntensity: 'low' }
    let lowCount = 0
    for (let i = 0; i < 500; i++) {
      if (engine.pickBestScored(cmds, ctx).id === 'low1') lowCount++
    }
    assertEqual(lowCount, 0)
  })
})

// ============================================================
// B-13: buildExplanation
// ============================================================
describe('B-13 buildExplanation', function () {
  it('null cmd → default reason', function () {
    const e = engine.buildExplanation(null, {})
    assertEqual(e.reason, I.EXPLANATION_REASONS.default)
    assertEqual(e.howto, '')
    assertEqual(e.tip, '')
  })
  it('雨天室内 → rainy_indoor', function () {
    const cmd = { id: 'r1', content: '室内看展', type: 'culture', outdoor: false, tip: '慢慢看' }
    const ctx = { weather: 'rainy' }
    const e = engine.buildExplanation(cmd, ctx)
    assertEqual(e.reason, I.EXPLANATION_REASONS.rainy_indoor)
    assertEqual(e.howto, '室内看展')
    assertEqual(e.tip, '慢慢看')
  })
  it('暴雨室内 → rainy_indoor', function () {
    const cmd = { id: 'r2', content: '室内', type: 'culture', outdoor: false }
    const e = engine.buildExplanation(cmd, { weather: 'storm' })
    assertEqual(e.reason, I.EXPLANATION_REASONS.rainy_indoor)
  })
  it('深夜 nightSafe → night_safe', function () {
    const cmd = { id: 'n1', content: '深夜便利店', type: 'food', outdoor: true, nightSafe: true }
    const ctx = { hour: 23 }
    const e = engine.buildExplanation(cmd, ctx)
    assertEqual(e.reason, I.EXPLANATION_REASONS.night_safe)
  })
  it('凌晨 nightSafe → night_safe', function () {
    const cmd = { id: 'n2', content: '深夜任务', nightSafe: true }
    const ctx = { hour: 3 }
    const e = engine.buildExplanation(cmd, ctx)
    assertEqual(e.reason, I.EXPLANATION_REASONS.night_safe)
  })
  it('偏好匹配 → pref_match（含 type label）', function () {
    const cmd = { id: 'p1', content: '走一段路', type: 'walk', outdoor: true }
    const ctx = { userPrefs: { type: { walk: 10 } } }  // walk top1
    const e = engine.buildExplanation(cmd, ctx)
    assert(e.reason.indexOf('漫步') >= 0, 'pref_match 应含 type label「漫步」: ' + e.reason)
  })
  it('偏好匹配 top2(1.2x) → pref_match（边界：>=1.2 触发）', function () {
    const cmd = { id: 'p2', content: '走一段路', type: 'walk', outdoor: true }
    const ctx = { userPrefs: { type: { color: 10, walk: 5 } } }  // walk top2 = 1.2x
    const e = engine.buildExplanation(cmd, ctx)
    assert(e.reason.indexOf('漫步') >= 0, 'top2(1.2x) 应触发 pref_match: ' + e.reason)
  })
  it('高温非户外 → hot_weather', function () {
    const cmd = { id: 'h1', content: '室内', type: 'culture', outdoor: false }
    const ctx = { weatherDetail: { temperature: 35 } }
    const e = engine.buildExplanation(cmd, ctx)
    assertEqual(e.reason, I.EXPLANATION_REASONS.hot_weather)
  })
  it('低温非户外 → cold_weather', function () {
    const cmd = { id: 'c1', content: '室内', type: 'culture', outdoor: false }
    const ctx = { weatherDetail: { temperature: -2 } }
    const e = engine.buildExplanation(cmd, ctx)
    assertEqual(e.reason, I.EXPLANATION_REASONS.cold_weather)
  })
  it('无匹配条件 → default', function () {
    const cmd = { id: 'd1', content: '普通任务', type: 'walk', outdoor: true }
    const ctx = { hour: 14, weather: 'sunny' }
    const e = engine.buildExplanation(cmd, ctx)
    assertEqual(e.reason, I.EXPLANATION_REASONS.default)
  })
  it('优先级：雨天室内 > 深夜 > 偏好', function () {
    // 雨天深夜室内 nightSafe：应优先 rainy_indoor
    const cmd = { id: 'p0', content: '室内', type: 'culture', outdoor: false, nightSafe: true }
    const ctx = { weather: 'rainy', hour: 23, userPrefs: { type: { culture: 10 } } }
    const e = engine.buildExplanation(cmd, ctx)
    assertEqual(e.reason, I.EXPLANATION_REASONS.rainy_indoor)
  })
  it('howto = cmd.content，缺失则空串', function () {
    assertEqual(engine.buildExplanation({ id: 'x', content: '具体内容' }, {}).howto, '具体内容')
    assertEqual(engine.buildExplanation({ id: 'y' }, {}).howto, '')
  })
  it('tip 透传 cmd.tip，缺失则空串', function () {
    assertEqual(engine.buildExplanation({ id: 'x', tip: '小贴士' }, {}).tip, '小贴士')
    assertEqual(engine.buildExplanation({ id: 'y' }, {}).tip, '')
  })
})

// ============================================================
// B-14: fillVariables
// ============================================================
describe('B-14 fillVariables', function () {
  it('无占位符原样返回', function () {
    assertEqual(engine.fillVariables('普通文案', {}), '普通文案')
    assertEqual(engine.fillVariables('no placeholder', {}), 'no placeholder')
  })
  it('{时间} 按小时替换', function () {
    assertEqual(engine.fillVariables('{时间}好', { hour: 8 }), '早上好')
    assertEqual(engine.fillVariables('{时间}好', { hour: 14 }), '下午好')
    assertEqual(engine.fillVariables('{时间}好', { hour: 20 }), '晚上好')
    assertEqual(engine.fillVariables('{时间}好', { hour: 23 }), '深夜好')
  })
  it('{天气} 按 weather 替换', function () {
    assertEqual(engine.fillVariables('{天气}出逃', { weather: 'sunny' }), '晴天出逃')
    assertEqual(engine.fillVariables('{天气}出逃', { weather: 'rainy' }), '雨天出逃')
    assertEqual(engine.fillVariables('{天气}出逃', { weather: 'storm' }), '暴雨出逃')
    assertEqual(engine.fillVariables('{天气}出逃', { weather: 'snow' }), '雪天出逃')
  })
  it('{地点} 用 locationName', function () {
    assertEqual(engine.fillVariables('在{地点}走走', { locationName: '广州·天河' }), '在广州·天河走走')
    assertEqual(engine.fillVariables('在{地点}走走', {}), '在附近走走')
  })
  it('{季节} 用 season 或 seasonFromDate', function () {
    const r = engine.fillVariables('{季节}的任务', {})
    // 当前季节由 seasonFromDate 推算，结果应含「春/夏/秋/冬天」
    assert(r.indexOf('春天') === 0 || r.indexOf('夏天') === 0 || r.indexOf('秋天') === 0 || r.indexOf('冬天') === 0, 'season 未推算: ' + r)
    assertEqual(engine.fillVariables('{季节}的任务', { season: '初秋' }), '初秋的任务')
  })
  it('{type} 用 extra.type', function () {
    assertEqual(engine.fillVariables('你最近喜欢{type}', {}, { type: '漫步' }), '你最近喜欢漫步')
    assertEqual(engine.fillVariables('你最近喜欢{type}', {}), '你最近喜欢')
  })
  it('多占位符同时替换', function () {
    const text = '{时间}{天气}在{地点}做{type}的事'
    const r = engine.fillVariables(text, { hour: 14, weather: 'rainy', locationName: '广州' }, { type: '漫步' })
    assertEqual(r, '下午雨天在广州做漫步的事')
  })
  it('非字符串返回空串', function () {
    assertEqual(engine.fillVariables(null, {}), '')
    assertEqual(engine.fillVariables(undefined, {}), '')
    assertEqual(engine.fillVariables(123, {}), '')
    assertEqual(engine.fillVariables([], {}), '')
  })
  it('重复占位符全部替换', function () {
    assertEqual(engine.fillVariables('{时间}{时间}', { hour: 8 }), '早上早上')
  })
  it('extra 非对象兜底', function () {
    assertEqual(engine.fillVariables('{type}', {}, null), '')
    assertEqual(engine.fillVariables('{type}', {}, 'string'), '')
  })
})

// ============================================================
// generate 主入口（B-07~B-14 接入验证）
// ============================================================
describe('generate 接入 B-07~B-14', function () {
  it('返回结构含 ok/command/explanation', function () {
    const ctx = { commandPool: SAMPLE_CMDS, hour: 14, weather: 'sunny' }
    const r = engine.generate(ctx)
    assert(r.ok === true, 'ok 应为 true')
    assert(r.command && typeof r.command === 'object', 'command 应为对象')
    assert(r.explanation && typeof r.explanation === 'object', 'explanation 应为对象')
    assert(typeof r.explanation.reason === 'string', 'explanation.reason 应为字符串')
  })
  it('fallback 字段在走兜底时为 true', function () {
    // 所有指令已完成 → 走 fallback
    const ctx = {
      commandPool: SAMPLE_CMDS,
      completedIds: SAMPLE_CMDS.map(c => c.id),
      completedDates: SAMPLE_CMDS.reduce((m, c) => { m[c.id] = new Date().toISOString(); return m }, {}),
      hour: 14,
      weather: 'sunny'
    }
    const r = engine.generate(ctx)
    assert(r.ok === true)
    assert(r.fallback === true, 'fallback 应为 true')
    assert(r.command.id.indexOf('fb') === 0, '兜底 command 应是 fb 前缀: ' + r.command.id)
  })
  it('正常推荐 fallback 为 false', function () {
    const ctx = { commandPool: SAMPLE_CMDS, hour: 14, weather: 'sunny' }
    const r = engine.generate(ctx)
    assert(r.fallback === false, 'fallback 应为 false')
  })
  it('天气细筛接入：高温过滤长户外', function () {
    const cmds = [
      { id: 'w1', content: '长户外', type: 'walk', duration: 45, outdoor: true, cost: 0 },
      { id: 'w2', content: '短室内', type: 'culture', duration: 10, outdoor: false, cost: 0 }
    ]
    const ctx = { commandPool: cmds, hour: 14, weather: 'sunny', weatherDetail: { temperature: 35 } }
    // 100 次确保不抖动
    for (let i = 0; i < 100; i++) {
      const r = engine.generate(ctx)
      assert(r.command.id === 'w2', '高温应只推 w2: ' + r.command.id)
    }
  })
  it('地点去重接入：recentLocations 过滤同 POI', function () {
    const cmds = [
      { id: 'l1', content: '咖啡馆', type: 'food', duration: 20, outdoor: true, requirePOI: 'cafe', cost: 10 },
      { id: 'l2', content: '便利店', type: 'food', duration: 10, outdoor: true, requirePOI: 'convenience', cost: 10 }
    ]
    const ctx = {
      commandPool: cmds,
      hour: 14,
      weather: 'sunny',
      nearbyPOI: { cafe: true, convenience: true },
      recentLocations: ['cafe'],
      recentLocationTimes: [Date.now()]
    }
    for (let i = 0; i < 50; i++) {
      const r = engine.generate(ctx)
      assert(r.command.id === 'l2', 'cafe 24h 内应只推 l2: ' + r.command.id)
    }
  })
  it('历史体验去重接入：相似 content 过滤', function () {
    const cmds = [
      { id: 'sim1', content: '找蓝色招牌合影', type: 'color', duration: 15, outdoor: true, cost: 0 },
      { id: 'sim2', content: '听3分钟声音', type: 'sense', duration: 10, outdoor: true, cost: 0 }
    ]
    const ctx = {
      commandPool: cmds,
      hour: 14,
      weather: 'sunny',
      recentContents: ['找蓝色招牌合影']
    }
    for (let i = 0; i < 50; i++) {
      const r = engine.generate(ctx)
      assert(r.command.id === 'sim2', '相似 content 应只推 sim2: ' + r.command.id)
    }
  })
  it('难度匹配接入：low 过滤高难度', function () {
    const cmds = [
      { id: 'dif1', content: '高强度', type: 'walk', duration: 60, outdoor: true, cost: 50 },
      { id: 'dif2', content: '低强度', type: 'walk', duration: 10, outdoor: false, cost: 0 }
    ]
    const ctx = { commandPool: cmds, hour: 14, weather: 'sunny', userIntensity: 'low' }
    for (let i = 0; i < 50; i++) {
      const r = engine.generate(ctx)
      assert(r.command.id === 'dif2', 'low 应只推低强度: ' + r.command.id)
    }
  })
  it('空 commandPool 走 fallback', function () {
    const r = engine.generate({ commandPool: [], hour: 14, weather: 'sunny' })
    assert(r.ok === true)
    assert(r.fallback === true)
    assert(r.command.id.indexOf('fb') === 0)
  })
  it('explanation.tip 透传 cmd.tip', function () {
    const cmds = [{ id: 'et1', content: '任务', type: 'walk', duration: 20, outdoor: true, cost: 0, tip: '小贴士' }]
    const r = engine.generate({ commandPool: cmds, hour: 14, weather: 'sunny' })
    assertEqual(r.explanation.tip, '小贴士')
  })
})

// ===== 结果输出 =====
console.log('\n' + '='.repeat(50))
console.log('Generator Engine 单元测试结果: ' + passCount + ' passed, ' + failCount + ' failed')
if (failures.length > 0) {
  console.log('\n失败项:')
  failures.forEach(f => console.log('  - ' + f))
}
console.log('='.repeat(50))
process.exit(failCount > 0 ? 1 : 0)
