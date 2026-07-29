// tests/adversarial/generator-attack.test.js
// B-02~B-06 生成引擎对抗式攻击测试
// 运行: node tests/adversarial/generator-attack.test.js
//
// 设计思路（红队视角）：
//   - 假设攻击者能完全控制 ctx（commandPool / completedIds / hour / weather / ...）
//   - 每个攻击向量代表一种恶意/异常输入模式
//   - 引擎必须满足「不抛异常 + 不返回 undefined + 不返回非法 command」三不变量
//   - 安全敏感场景（深夜/雨天/极端）必须不能返回危险任务
//   - 攻击向量 ~30 个，覆盖：类型污染、原型链、超大输入、循环引用、Unicode 注入等

'use strict'

const engine = require('../../utils/generator-engine.js')
const I = engine._internal

// ===== 测试统计 =====
let passCount = 0
let failCount = 0
const failures = []
const groups = []

function describe(name, fn) {
  groups.push(name)
  console.log('\n=== ' + name + ' ===')
  fn()
  groups.pop()
}

function attack(name, fn) {
  groups.push(name)
  let result
  try {
    result = fn()
  } catch (e) {
    result = { ok: false, msg: 'THROW: ' + e.message }
  }
  if (result && result.ok) {
    passCount++
    console.log('  ✓ ' + name)
  } else {
    failCount++
    const where = groups.join(' > ')
    failures.push(where + ': ' + (result && result.msg || '失败'))
    console.log('  ✗ ' + name + ' — ' + (result && result.msg || '失败'))
  }
  groups.pop()
}

// ===== 通用不变量校验器 =====
// 引擎结果必须满足：不抛异常 + ok=true + command 是带 id 的对象
function checkGenerateResult(result) {
  if (!result) return { ok: false, msg: 'result 为 null/undefined' }
  if (result.ok !== true) return { ok: false, msg: 'ok 不为 true' }
  if (!result.command) return { ok: false, msg: 'command 为 null/undefined' }
  if (typeof result.command !== 'object') return { ok: false, msg: 'command 非对象' }
  if (!result.command.id) return { ok: false, msg: 'command 无 id' }
  return { ok: true }
}

// 安全不变量：深夜不能选 nightSafe=false 户外任务
function checkNightSafety(result, hour) {
  const c = result.command
  const isNight = hour >= 22 || hour < 6
  if (!isNight) return { ok: true }
  if (result.fallback) return { ok: true }  // fallback 任务库本身已经过安全过滤
  if (c.nightSafe === false && c.outdoor !== false) {
    return { ok: false, msg: '深夜选中户外不安全任务: ' + c.id + ' nightSafe=' + c.nightSafe + ' outdoor=' + c.outdoor }
  }
  return { ok: true }
}

// ============================================================
// ===== 攻击组 1: 类型污染 / 原型链攻击 =====
// ============================================================
describe('类型污染 / 原型链攻击', function () {
  attack('A01: commandPool 含 __proto__ 注入', function () {
    const pool = [
      { id: 'normal', type: 'color', duration: 15, outdoor: true, nightSafe: true, rainy: true, requirePOI: null, cost: 0 },
      { id: '__proto__', type: 'color', duration: 15, outdoor: true, nightSafe: true, rainy: true, requirePOI: null, cost: 0 }
    ]
    const r = engine.generate({ commandPool: pool, hour: 14, weather: 'sunny' })
    return checkGenerateResult(r)
  })

  attack('A02: completedIds 含 prototype/constructor', function () {
    const pool = [{ id: 'constructor', type: 'color', duration: 15, outdoor: true, nightSafe: true, rainy: true, requirePOI: null, cost: 0 }]
    const r = engine.generate({
      commandPool: pool,
      completedIds: ['constructor', 'prototype', '__proto__'],
      hour: 14, weather: 'sunny'
    })
    // constructor 被标记为 completed → 应走兜底链
    return checkGenerateResult(r)
  })

  attack('A03: ctx 上挂载 constructor 属性', function () {
    const ctx = { commandPool: [], hour: 14, weather: 'sunny' }
    ctx.constructor = 'evil'
    const r = engine.generate(ctx)
    return checkGenerateResult(r)
  })

  attack('A04: completedDates 含 __proto__ 键', function () {
    const r = engine.generate({
      commandPool: [{ id: 'a', type: 'color', duration: 15, outdoor: true, nightSafe: true, rainy: true, requirePOI: null, cost: 0 }],
      completedIds: ['a'],
      completedDates: { __proto__: 'evil', a: new Date().toISOString() },
      hour: 14, weather: 'sunny'
    })
    return checkGenerateResult(r)
  })

  attack('A05: nearbyPOI 含 prototype 污染键', function () {
    const r = engine.filterByConditions(
      [{ id: 'a', type: 'color', requirePOI: 'cafe', duration: 15, outdoor: true, nightSafe: true, rainy: true, cost: 0 }],
      { nearbyPOI: { cafe: true, __proto__: 'evil' } }
    )
    if (!Array.isArray(r)) return { ok: false, msg: '非数组' }
    return { ok: true }
  })
})

// ============================================================
// ===== 攻击组 2: 极端值 / 边界 =====
// ============================================================
describe('极端值 / 边界攻击', function () {
  attack('A06: commandPool 巨大（10000 条）', function () {
    const pool = []
    for (let i = 0; i < 10000; i++) {
      pool.push({ id: 'c' + i, type: 'color', duration: 15, outdoor: true, nightSafe: true, rainy: true, requirePOI: null, cost: 0 })
    }
    const start = Date.now()
    const r = engine.generate({ commandPool: pool, hour: 14, weather: 'sunny' })
    const elapsed = Date.now() - start
    if (elapsed > 200) return { ok: false, msg: '耗时过长: ' + elapsed + 'ms' }
    return checkGenerateResult(r)
  })

  attack('A07: duration 极大值 (Number.MAX_SAFE_INTEGER)', function () {
    const r = engine.getLoadingCopy({ hour: 14, weather: 'sunny', mode: 'walk', duration: Number.MAX_SAFE_INTEGER })
    if (typeof r !== 'string' || r.length === 0) return { ok: false, msg: '返回空' }
    return { ok: true }
  })

  attack('A08: duration 负数', function () {
    const r = engine.getLoadingCopy({ hour: 14, weather: 'sunny', mode: 'walk', duration: -100 })
    if (typeof r !== 'string' || r.length === 0) return { ok: false, msg: '返回空' }
    return { ok: true }
  })

  attack('A09: duration NaN', function () {
    const r = engine.getLoadingCopy({ hour: 14, weather: 'sunny', mode: 'walk', duration: NaN })
    if (typeof r !== 'string' || r.length === 0) return { ok: false, msg: '返回空' }
    return { ok: true }
  })

  attack('A10: hour 边界 0 / 23 / 24 / -1', function () {
    for (const h of [0, 23, 24, -1, 0.5, -0.5]) {
      const r = engine.filterByBusinessHours(
        [{ id: 'a', requirePOI: 'cafe', duration: 15, outdoor: true, nightSafe: true, rainy: true, cost: 0 }],
        h
      )
      if (!Array.isArray(r)) return { ok: false, msg: 'hour=' + h + ' 非数组' }
    }
    return { ok: true }
  })

  attack('A11: hour Infinity / -Infinity / NaN', function () {
    for (const h of [Infinity, -Infinity, NaN, null, undefined, 'abc', {}, []]) {
      const r = engine.filterByBusinessHours(
        [{ id: 'a', requirePOI: 'cafe', duration: 15, outdoor: true, nightSafe: true, rainy: true, cost: 0 }],
        h
      )
      if (!Array.isArray(r)) return { ok: false, msg: 'hour=' + JSON.stringify(h) + ' 非数组' }
    }
    return { ok: true }
  })

  attack('A12: weather 含特殊字符 / SQL / 脚本', function () {
    const evilWeathers = [
      "'; DROP TABLE--;",
      '<script>alert(1)</script>',
      '${jndi:ldap://evil}',
      '{{constructor}}',
      'rainy\';rm -rf /',
      'sunny\u0000null',
      'a'.repeat(10000)
    ]
    for (const w of evilWeathers) {
      const r = engine.filterBySafety(
        [{ id: 'a', type: 'color', nightSafe: true, rainy: true, outdoor: false, duration: 10, requirePOI: null, cost: 0 }],
        { hour: 14, weather: w }
      )
      if (!Array.isArray(r)) return { ok: false, msg: 'weather=' + w.slice(0, 30) + ' 非数组' }
    }
    return { ok: true }
  })

  attack('A13: mode 含脚本注入', function () {
    const r = engine.getLoadingCopy({ hour: 14, weather: 'sunny', mode: '<script>alert(1)</script>', duration: 15 })
    if (typeof r !== 'string' || r.length === 0) return { ok: false, msg: '返回空' }
    return { ok: true }
  })
})

// ============================================================
// ===== 攻击组 3: 字段类型错乱 =====
// ============================================================
describe('字段类型错乱攻击', function () {
  attack('A14: cmd.id 是数字 / 对象 / 数组', function () {
    const pool = [
      { id: 123, type: 'color', duration: 15, outdoor: true, nightSafe: true, rainy: true, requirePOI: null, cost: 0 },
      { id: { evil: true }, type: 'color', duration: 15, outdoor: true, nightSafe: true, rainy: true, requirePOI: null, cost: 0 },
      { id: [1, 2, 3], type: 'color', duration: 15, outdoor: true, nightSafe: true, rainy: true, requirePOI: null, cost: 0 }
    ]
    const r = engine.filterByConditions(pool, {})
    // 数字 id 是 truthy，可能保留；对象/数组 id 也会通过 !cmd.id 检查（因为它们是 truthy）
    // 关键是不能抛异常
    if (!Array.isArray(r)) return { ok: false, msg: '非数组' }
    return { ok: true }
  })

  attack('A15: cmd.id 是空字符串 / 0 / false', function () {
    const pool = [
      { id: '', type: 'color', duration: 15, outdoor: true, nightSafe: true, rainy: true, requirePOI: null, cost: 0 },
      { id: 0, type: 'color', duration: 15, outdoor: true, nightSafe: true, rainy: true, requirePOI: null, cost: 0 },
      { id: false, type: 'color', duration: 15, outdoor: true, nightSafe: true, rainy: true, requirePOI: null, cost: 0 },
      { id: 'valid', type: 'color', duration: 15, outdoor: true, nightSafe: true, rainy: true, requirePOI: null, cost: 0 }
    ]
    const r = engine.filterByConditions(pool, {})
    // 空 id / 0 / false 应被过滤（!cmd.id 为 true）
    // 只保留 'valid'
    if (r.length !== 1 || r[0].id !== 'valid') {
      return { ok: false, msg: '空 id 未过滤干净: ' + r.length }
    }
    return { ok: true }
  })

  attack('A16: cmd.requirePOI 是数字 / 对象 / 布尔', function () {
    const pool = [
      { id: 'a', requirePOI: 42, type: 'color', duration: 15, outdoor: true, nightSafe: true, rainy: true, cost: 0 },
      { id: 'b', requirePOI: { evil: true }, type: 'color', duration: 15, outdoor: true, nightSafe: true, rainy: true, cost: 0 },
      { id: 'c', requirePOI: true, type: 'color', duration: 15, outdoor: true, nightSafe: true, rainy: true, cost: 0 }
    ]
    const r = engine.filterByBusinessHours(pool, 14)
    // 未知 POI 类型保守不过滤
    if (!Array.isArray(r)) return { ok: false, msg: '非数组' }
    return { ok: true }
  })

  attack('A17: cmd.nightSafe 是 truthy 非 boolean ("false" 字符串)', function () {
    const r = engine.filterBySafety(
      [{ id: 'a', nightSafe: 'false', rainy: 'true', outdoor: 'true', duration: 10, requirePOI: null, cost: 0 }],
      { hour: 23, weather: 'sunny' }
    )
    // 'false' 字符串是 truthy，引擎只检查 === false，所以会保留
    if (!Array.isArray(r)) return { ok: false, msg: '非数组' }
    return { ok: true }
  })

  attack('A18: nearbyPOI 是数组 / 字符串 / 数字', function () {
    const r = engine.filterByConditions(
      [{ id: 'a', requirePOI: 'cafe', duration: 15, outdoor: true, nightSafe: true, rainy: true, cost: 0 }],
      { nearbyPOI: [true, true], lastType: '', sameTypeCount: 0, completedIds: [], completedDates: {} }
    )
    if (!Array.isArray(r)) return { ok: false, msg: '非数组' }
    return { ok: true }
  })

  attack('A19: userPrefs.type 是数组 / null / 字符串', function () {
    const pool = [{ id: 'a', type: 'color', duration: 15, outdoor: true, nightSafe: true, rainy: true, requirePOI: null, cost: 0 }]
    for (const t of [null, undefined, 'color', [], 42]) {
      const r = engine.pickWeighted(pool, { type: t })
      if (!r || r.id !== 'a') return { ok: false, msg: 'userPrefs.type=' + JSON.stringify(t) + ' 选错' }
    }
    return { ok: true }
  })
})

// ============================================================
// ===== 攻击组 4: 安全不变量（深夜/雨天/极端）=====
// ============================================================
describe('安全不变量攻击', function () {
  attack('A20: 深夜 + 全部户外不安全 → 必走 fallback', function () {
    const pool = [
      { id: 'unsafe1', type: 'walk', duration: 20, outdoor: true, nightSafe: false, rainy: true, requirePOI: null, cost: 0 },
      { id: 'unsafe2', type: 'food', duration: 15, outdoor: true, nightSafe: false, rainy: true, requirePOI: null, cost: 0 }
    ]
    const r = engine.generate({ commandPool: pool, hour: 23, weather: 'sunny' })
    const baseCheck = checkGenerateResult(r)
    if (!baseCheck.ok) return baseCheck
    if (!r.fallback) return { ok: false, msg: '深夜全不安全未走 fallback' }
    return { ok: true }
  })

  attack('A21: 深夜 generate 不返回户外 nightSafe=false 任务', function () {
    const pool = [
      { id: 'safe1', type: 'food', duration: 15, outdoor: true, nightSafe: true, rainy: true, requirePOI: null, cost: 0 },
      { id: 'unsafe1', type: 'walk', duration: 20, outdoor: true, nightSafe: false, rainy: true, requirePOI: null, cost: 0 },
      { id: 'unsafe2', type: 'food', duration: 15, outdoor: true, nightSafe: false, rainy: true, requirePOI: null, cost: 0 }
    ]
    // 跑 100 次（pickWeighted 随机），每次都不能选 unsafe
    for (let i = 0; i < 100; i++) {
      const r = engine.generate({ commandPool: pool, hour: 23, weather: 'sunny' })
      if (!r.ok) return { ok: false, msg: 'ok=false' }
      const c = r.command
      if (!r.fallback && c.nightSafe === false && c.outdoor !== false) {
        return { ok: false, msg: '深夜选了 unsafe 户外任务: ' + c.id }
      }
    }
    return { ok: true }
  })

  attack('A22: 极端天气不返回户外任务', function () {
    const pool = [
      { id: 'outdoor1', type: 'walk', duration: 20, outdoor: true, nightSafe: true, rainy: true, requirePOI: null, cost: 0 },
      { id: 'outdoor2', type: 'food', duration: 15, outdoor: true, nightSafe: true, rainy: true, requirePOI: null, cost: 0 },
      { id: 'indoor1', type: 'culture', duration: 25, outdoor: false, nightSafe: true, rainy: true, requirePOI: null, cost: 0 }
    ]
    for (let i = 0; i < 100; i++) {
      const r = engine.generate({ commandPool: pool, hour: 14, weather: 'storm' })
      if (!r.ok) return { ok: false, msg: 'ok=false' }
      const c = r.command
      if (!r.fallback && c.outdoor !== false) {
        return { ok: false, msg: '极端天气选了户外任务: ' + c.id }
      }
    }
    return { ok: true }
  })

  attack('A23: 雨天不返回户外非雨天任务', function () {
    const pool = [
      { id: 'rainy_safe', type: 'walk', duration: 20, outdoor: true, nightSafe: true, rainy: true, requirePOI: null, cost: 0 },
      { id: 'non_rainy_outdoor', type: 'walk', duration: 20, outdoor: true, nightSafe: true, rainy: false, requirePOI: null, cost: 0 }
    ]
    for (let i = 0; i < 100; i++) {
      const r = engine.generate({ commandPool: pool, hour: 14, weather: 'rainy' })
      if (!r.ok) return { ok: false, msg: 'ok=false' }
      const c = r.command
      if (!r.fallback && c.id === 'non_rainy_outdoor') {
        return { ok: false, msg: '雨天选了非雨天户外任务' }
      }
    }
    return { ok: true }
  })

  attack('A24: 全部 90 天内完成 → fallback 不能给出已完成任务', function () {
    const pool = [
      { id: 'done1', type: 'color', duration: 15, outdoor: true, nightSafe: true, rainy: true, requirePOI: null, cost: 0 },
      { id: 'done2', type: 'sense', duration: 15, outdoor: true, nightSafe: true, rainy: true, requirePOI: null, cost: 0 }
    ]
    const today = new Date().toISOString()
    const r = engine.generate({
      commandPool: pool,
      completedIds: ['done1', 'done2'],
      completedDates: { done1: today, done2: today },
      hour: 14, weather: 'sunny'
    })
    if (!r.ok) return { ok: false, msg: 'ok=false' }
    if (!r.fallback) return { ok: false, msg: '应走 fallback' }
    // fallback command id 必以 fb 开头（不在原 pool 中）
    if (r.command.id.indexOf('fb') !== 0) {
      return { ok: false, msg: 'fallback 给了已完成任务: ' + r.command.id }
    }
    return { ok: true }
  })
})

// ============================================================
// ===== 攻击组 5: 资源耗尽 / DoS =====
// ============================================================
describe('资源耗尽 / DoS 攻击', function () {
  attack('A25: completedIds 巨大数组 (100k)', function () {
    const completedIds = []
    for (let i = 0; i < 100000; i++) completedIds.push('c' + i)
    const start = Date.now()
    const r = engine.filterByConditions(
      [{ id: 'target', type: 'color', duration: 15, outdoor: true, nightSafe: true, rainy: true, requirePOI: null, cost: 0 }],
      { completedIds, completedDates: {} }
    )
    const elapsed = Date.now() - start
    if (elapsed > 100) return { ok: false, msg: '耗时过长: ' + elapsed + 'ms（indexOf O(n)）' }
    if (!Array.isArray(r)) return { ok: false, msg: '非数组' }
    return { ok: true }
  })

  attack('A26: completedDates 巨大对象 (100k 键)', function () {
    const completedDates = {}
    for (let i = 0; i < 100000; i++) completedDates['c' + i] = new Date().toISOString()
    const r = engine.filterByConditions(
      [{ id: 'target', type: 'color', duration: 15, outdoor: true, nightSafe: true, rainy: true, requirePOI: null, cost: 0 }],
      { completedIds: [], completedDates }
    )
    if (!Array.isArray(r)) return { ok: false, msg: '非数组' }
    return { ok: true }
  })

  attack('A27: 深度嵌套对象 cmd', function () {
    let cmd = { id: 'deep', type: 'color', duration: 15, outdoor: true, nightSafe: true, rainy: true, requirePOI: null, cost: 0 }
    let cur = cmd
    for (let i = 0; i < 100; i++) {
      cur.child = { id: 'deep' + i, type: 'color' }
      cur = cur.child
    }
    const r = engine.filterByConditions([cmd], {})
    if (!Array.isArray(r)) return { ok: false, msg: '非数组' }
    return { ok: true }
  })

  attack('A28: cmd 含循环引用', function () {
    const cmd = { id: 'cycle', type: 'color', duration: 15, outdoor: true, nightSafe: true, rainy: true, requirePOI: null, cost: 0 }
    cmd.self = cmd
    // 注意：JSON.stringify 会抛异常，但引擎不应使用 JSON.stringify
    const r = engine.filterByConditions([cmd], {})
    if (!Array.isArray(r)) return { ok: false, msg: '非数组' }
    return { ok: true }
  })
})

// ============================================================
// ===== 攻击组 6: Unicode / 编码攻击 =====
// ============================================================
describe('Unicode / 编码攻击', function () {
  attack('A29: cmd.id 含 Unicode / 控制字符', function () {
    const ids = ['\u0000null', 'id\u200Bzero', 'id\u202Ertl', '🏫emoji', 'id with space', 'id\nnewline', 'id\ttab']
    const pool = ids.map(id => ({ id, type: 'color', duration: 15, outdoor: true, nightSafe: true, rainy: true, requirePOI: null, cost: 0 }))
    const r = engine.filterByConditions(pool, {})
    if (!Array.isArray(r)) return { ok: false, msg: '非数组' }
    if (r.length !== ids.length) return { ok: false, msg: 'Unicode id 误过滤: ' + r.length + '/' + ids.length }
    return { ok: true }
  })

  attack('A30: weather 含 Unicode / emoji', function () {
    const weathers = ['🌞sunny', '🌧️rainy', '🌧rainy', '晴', '雨', '⛈️storm']
    for (const w of weathers) {
      const r = engine.filterBySafety(
        [{ id: 'a', type: 'color', nightSafe: true, rainy: true, outdoor: false, duration: 10, requirePOI: null, cost: 0 }],
        { hour: 14, weather: w }
      )
      if (!Array.isArray(r)) return { ok: false, msg: 'weather=' + w + ' 非数组' }
    }
    return { ok: true }
  })

  attack('A31: completedDates 含未来日期', function () {
    // 未来 100 年后完成 — 应视为已完成（diff 是负数，< ninetyDays，会被过滤）
    const future = new Date(Date.now() + 100 * 365 * 86400 * 1000).toISOString()
    const r = engine.filterByConditions(
      [
        { id: 'future_done', type: 'color', duration: 15, outdoor: true, nightSafe: true, rainy: true, requirePOI: null, cost: 0 },
        { id: 'untouched', type: 'color', duration: 15, outdoor: true, nightSafe: true, rainy: true, requirePOI: null, cost: 0 }
      ],
      { completedIds: ['future_done'], completedDates: { future_done: future } }
    )
    if (!Array.isArray(r)) return { ok: false, msg: '非数组' }
    // 未来日期 diff < ninetyDays → 应被过滤
    if (r.length !== 1 || r[0].id !== 'untouched') {
      return { ok: false, msg: '未来日期未正确过滤: r.length=' + r.length }
    }
    return { ok: true }
  })

  attack('A32: completedDates 含非法日期字符串', function () {
    // 引擎契约：日期非法 → 保守过滤；空值（''/null/undefined）→ 保守过滤
    // 注意：数字 42 是合法 timestamp（1970+42ms，距今 > 90 天），不应过滤
    const badDates = ['not-a-date', '', null, undefined, {}, [], '2026-13-45', 'NaN-NaN-NaN']
    for (const d of badDates) {
      const r = engine.filterByConditions(
        [{ id: 'a', type: 'color', duration: 15, outdoor: true, nightSafe: true, rainy: true, requirePOI: null, cost: 0 }],
        { completedIds: ['a'], completedDates: { a: d } }
      )
      // 已完成但日期非法 → 保守过滤
      if (!Array.isArray(r)) return { ok: false, msg: 'date=' + JSON.stringify(d) + ' 非数组' }
      if (r.length !== 0) return { ok: false, msg: 'date=' + JSON.stringify(d) + ' 应保守过滤' }
    }
    return { ok: true }
  })

  attack('A32b: 数字 timestamp 视为合法日期（>90 天则保留）', function () {
    // 42ms = 1970-01-01T00:00:00.042Z，距今 >> 90 天 → 应保留
    const r = engine.filterByConditions(
      [{ id: 'a', type: 'color', duration: 15, outdoor: true, nightSafe: true, rainy: true, requirePOI: null, cost: 0 }],
      { completedIds: ['a'], completedDates: { a: 42 } }
    )
    if (r.length !== 1) return { ok: false, msg: '数字 timestamp 误过滤' }
    return { ok: true }
  })
})

// ============================================================
// ===== 攻击组 7: 逻辑攻击 / 业务不变量 =====
// ============================================================
describe('逻辑攻击 / 业务不变量', function () {
  attack('A33: 90 天边界精确测试（89/90/91 天）', function () {
    const pool = [{ id: 'edge', type: 'color', duration: 15, outdoor: true, nightSafe: true, rainy: true, requirePOI: null, cost: 0 }]
    const cases = [
      { days: 89, shouldFilter: true },   // 89 天 < 90 → 过滤
      { days: 91, shouldFilter: false }   // 91 天 > 90 → 保留
    ]
    for (const tc of cases) {
      const date = new Date(Date.now() - tc.days * 86400 * 1000).toISOString()
      const r = engine.filterByConditions(pool, {
        completedIds: ['edge'],
        completedDates: { edge: date }
      })
      const filtered = r.length === 0
      if (filtered !== tc.shouldFilter) {
        return { ok: false, msg: 'days=' + tc.days + ' 期望过滤=' + tc.shouldFilter + ' 实际=' + filtered }
      }
    }
    return { ok: true }
  })

  attack('A34: sameTypeCount 边界（1 / 2 / 3）', function () {
    const pool = [
      { id: 'c1', type: 'color', duration: 15, outdoor: true, nightSafe: true, rainy: true, requirePOI: null, cost: 0 },
      { id: 'c2', type: 'color', duration: 15, outdoor: true, nightSafe: true, rainy: true, requirePOI: null, cost: 0 }
    ]
    // sameTypeCount=1 → 不过滤；=2 → 过滤
    const r1 = engine.filterByConditions(pool, { lastType: 'color', sameTypeCount: 1 })
    if (r1.length !== 2) return { ok: false, msg: 'sameTypeCount=1 误过滤' }
    const r2 = engine.filterByConditions(pool, { lastType: 'color', sameTypeCount: 2 })
    if (r2.length !== 0) return { ok: false, msg: 'sameTypeCount=2 未过滤' }
    return { ok: true }
  })

  attack('A35: 加权选择不能偏向某个固定索引', function () {
    // 1000 次采样，每个 cmd 应被选中至少一次（10 个 cmd，无偏好）
    const pool = []
    for (let i = 0; i < 10; i++) {
      pool.push({ id: 'u' + i, type: 'color', duration: 15, outdoor: true, nightSafe: true, rainy: true, requirePOI: null, cost: 0 })
    }
    const counts = {}
    for (let i = 0; i < 1000; i++) {
      const r = engine.pickWeighted(pool, { type: {} })
      counts[r.id] = (counts[r.id] || 0) + 1
    }
    // 至少 8/10 个 cmd 被选中（避免完全偏向某一索引）
    const selectedCount = Object.keys(counts).length
    if (selectedCount < 8) return { ok: false, msg: '加权偏向严重: ' + selectedCount + '/10 被选中' }
    return { ok: true }
  })

  attack('A36: filterByConditions 不修改原数组', function () {
    const pool = [
      { id: 'a', type: 'color', duration: 15, outdoor: true, nightSafe: true, rainy: true, requirePOI: null, cost: 0 },
      { id: 'b', type: 'sense', duration: 15, outdoor: true, nightSafe: true, rainy: true, requirePOI: null, cost: 0 }
    ]
    const poolCopy = pool.map(c => Object.assign({}, c))
    engine.filterByConditions(pool, { completedIds: ['a'], completedDates: { a: new Date().toISOString() } })
    // 原数组长度不变
    if (pool.length !== 2) return { ok: false, msg: '原数组被修改: length=' + pool.length }
    // 原数组元素 id 不变
    if (pool[0].id !== 'a' || pool[1].id !== 'b') return { ok: false, msg: '原数组元素被改' }
    return { ok: true }
  })

  attack('A37: getFallbackCommands 不修改 FALLBACK_COMMANDS 常量', function () {
    const before = JSON.stringify(I.FALLBACK_COMMANDS.map(c => c.id))
    engine.getFallbackCommands({ hour: 14, weather: 'sunny', userPrefs: { type: { color: 5 } } })
    engine.getFallbackCommands({ hour: 23, weather: 'storm' })
    const after = JSON.stringify(I.FALLBACK_COMMANDS.map(c => c.id))
    if (before !== after) return { ok: false, msg: 'FALLBACK_COMMANDS 被修改' }
    return { ok: true }
  })

  attack('A38: 多次调用 generate 无状态泄漏', function () {
    // 连续调用 100 次，每次结果都应有效
    const pool = [{ id: 'a', type: 'color', duration: 15, outdoor: true, nightSafe: true, rainy: true, requirePOI: null, cost: 0 }]
    for (let i = 0; i < 100; i++) {
      const r = engine.generate({ commandPool: pool, hour: 14, weather: 'sunny' })
      const chk = checkGenerateResult(r)
      if (!chk.ok) return { ok: false, msg: '第 ' + i + ' 次调用失败: ' + chk.msg }
    }
    return { ok: true }
  })
})

// ============================================================
// ===== 攻击组 8: 综合 / 边缘 =====
// ============================================================
describe('综合 / 边缘攻击', function () {
  attack('A39: ctx 是函数', function () {
    const ctx = function () { return 'evil' }
    ctx.commandPool = []
    const r = engine.generate(ctx)
    return checkGenerateResult(r)
  })

  attack('A40: ctx.commandPool 是函数 / 字符串 / 数字', function () {
    for (const p of [function () {}, 'string', 42, true]) {
      const r = engine.generate({ commandPool: p, hour: 14, weather: 'sunny' })
      const chk = checkGenerateResult(r)
      if (!chk.ok) return { ok: false, msg: 'pool=' + typeof p + ': ' + chk.msg }
    }
    return { ok: true }
  })

  attack('A41: commandPool 含 null/undefined 元素混合', function () {
    const r = engine.generate({
      commandPool: [null, undefined, 'string', 42, false, { id: 'valid', type: 'color', duration: 15, outdoor: true, nightSafe: true, rainy: true, requirePOI: null, cost: 0 }],
      hour: 14, weather: 'sunny'
    })
    return checkGenerateResult(r)
  })

  attack('A42: 所有 cmd 字段缺失（仅 id）', function () {
    const r = engine.generate({
      commandPool: [{ id: 'bare' }],
      hour: 14, weather: 'sunny'
    })
    return checkGenerateResult(r)
  })

  attack('A43: reduceMotion 字段不影响生成', function () {
    const r1 = engine.generate({ commandPool: [], hour: 14, weather: 'sunny', reduceMotion: false })
    const r2 = engine.generate({ commandPool: [], hour: 14, weather: 'sunny', reduceMotion: true })
    if (!r1.ok || !r2.ok) return { ok: false, msg: 'reduceMotion 影响 ok' }
    return { ok: true }
  })

  attack('A44: getFaceForType 对原型链上的 type 不放行', function () {
    // 攻击者可能通过 toString/constructor 等访问内置 type
    const r1 = engine.getFaceForType('toString')
    const r2 = engine.getFaceForType('constructor')
    const r3 = engine.getFaceForType('hasOwnProperty')
    if (r1 < 1 || r1 > 6) return { ok: false, msg: 'toString 越界' }
    if (r2 < 1 || r2 > 6) return { ok: false, msg: 'constructor 越界' }
    if (r3 < 1 || r3 > 6) return { ok: false, msg: 'hasOwnProperty 越界' }
    // 这三个都不在 TYPE_FACE_MAP，应返回 1
    if (r1 !== 1 || r2 !== 1 || r3 !== 1) {
      return { ok: false, msg: '原型链 type 未兜底为 1' }
    }
    return { ok: true }
  })
})

// ============================================================
// ===== 攻击组 9: Round 2 新增攻击面 =====
// ============================================================
describe('Round 2 新增攻击面', function () {
  attack('A45: getFallbackCommands 过滤 90 天内已完成的 fb 任务', function () {
    // Round 1 修复验证：fallback 库本身也要过滤 completed
    const today = new Date().toISOString()
    const r = engine.getFallbackCommands({
      completedIds: ['fb001', 'fb002'],
      completedDates: { fb001: today, fb002: today },
      hour: 14, weather: 'sunny'
    })
    if (!Array.isArray(r)) return { ok: false, msg: '非数组' }
    // fb001/fb002 应被过滤（90 天内已完成）
    if (r.some(c => c.id === 'fb001' || c.id === 'fb002')) {
      return { ok: false, msg: '已完成 fb 任务未过滤: ' + r.map(c => c.id).join(',') }
    }
    // 过滤后仍非空（其他 fb 保留）
    if (r.length === 0) return { ok: false, msg: '过滤后空' }
    return { ok: true }
  })

  attack('A45b: getFallbackCommands 90 天外已完成 fb 保留', function () {
    const old = new Date(Date.now() - 100 * 86400 * 1000).toISOString()
    const r = engine.getFallbackCommands({
      completedIds: ['fb001'],
      completedDates: { fb001: old },
      hour: 14, weather: 'sunny'
    })
    if (!r.some(c => c.id === 'fb001')) return { ok: false, msg: '90 天外 fb001 被错误过滤' }
    return { ok: true }
  })

  attack('A46: pickWeighted userPrefs.type 含原型链键 __proto__/constructor', function () {
    const pool = [
      { id: 'a', type: 'color', duration: 15, outdoor: true, nightSafe: true, rainy: true, requirePOI: null, cost: 0 },
      { id: 'b', type: 'sense', duration: 15, outdoor: true, nightSafe: true, rainy: true, requirePOI: null, cost: 0 }
    ]
    // 用 Object.defineProperty 制造真自有 __proto__ 属性（绕过字面量语法）
    const evilPrefs = { type: {} }
    Object.defineProperty(evilPrefs.type, '__proto__', { value: 5, enumerable: true, configurable: true })
    Object.defineProperty(evilPrefs.type, 'constructor', { value: 99, enumerable: true, configurable: true })
    for (let i = 0; i < 50; i++) {
      const r = engine.pickWeighted(pool, evilPrefs)
      if (!r || !r.id) return { ok: false, msg: '返回空/无 id' }
    }
    return { ok: true }
  })

  attack('A47: applyModeFilter mode 非字符串（数字/对象/函数/null）不抛异常', function () {
    const pool = [{ id: 'a', type: 'color', duration: 15, outdoor: true, nightSafe: true, rainy: true, requirePOI: null, cost: 0 }]
    for (const m of [123, {}, [], function () {}, null, undefined, true, Symbol('x')]) {
      try {
        const r = engine.applyModeFilter(pool, m)
        if (!Array.isArray(r)) return { ok: false, msg: 'mode=' + String(m) + ' 非数组' }
      } catch (e) {
        return { ok: false, msg: 'mode=' + String(m) + ' 抛异常: ' + e.message }
      }
    }
    return { ok: true }
  })

  attack('A48: getLoadingCopy mode 为原型链键 constructor/__proto__/toString 不崩', function () {
    for (const m of ['constructor', '__proto__', 'toString', 'hasOwnProperty', 'valueOf']) {
      const r = engine.getLoadingCopy({ mode: m, duration: 15, hour: 14, weather: 'sunny' })
      if (typeof r !== 'string' || r.length === 0) return { ok: false, msg: 'mode=' + m + ' 返回空' }
    }
    return { ok: true }
  })

  attack('A49: filterByBusinessHours poi 为原型链键 constructor/toString/__proto__ 不崩', function () {
    const pois = ['constructor', 'toString', '__proto__', 'hasOwnProperty', 'valueOf']
    for (const poi of pois) {
      try {
        const r = engine.filterByBusinessHours(
          [{ id: 'x', requirePOI: poi, duration: 15, outdoor: true, nightSafe: true, rainy: true, cost: 0 }],
          14
        )
        if (!Array.isArray(r)) return { ok: false, msg: 'poi=' + poi + ' 非数组' }
      } catch (e) {
        return { ok: false, msg: 'poi=' + poi + ' 抛异常: ' + e.message }
      }
    }
    return { ok: true }
  })

  attack('A50: getFallbackCommands 全部 fb 已完成 → 仍非空（兜底不能空）', function () {
    const today = new Date().toISOString()
    const allFbIds = I.FALLBACK_COMMANDS.map(c => c.id)
    const completedDates = {}
    allFbIds.forEach(id => { completedDates[id] = today })
    const r = engine.getFallbackCommands({
      completedIds: allFbIds,
      completedDates,
      hour: 14, weather: 'sunny'
    })
    if (!Array.isArray(r) || r.length === 0) return { ok: false, msg: '全完成兜底为空' }
    return { ok: true }
  })
})

// ============================================================
// ===== 攻击组 10: B-07~B-14 新函数对抗向量（Round 3）=====
// ============================================================
describe('B-07~B-14 新函数对抗攻击', function () {
  var baseCmd = { id: 'a', type: 'color', duration: 15, outdoor: true, nightSafe: true, rainy: true, requirePOI: null, cost: 0 }

  // --- B-07 filterByWeather ---
  attack('A51: filterByWeather weatherDetail 是 null/undefined/数组/字符串/数字', function () {
    var evilWds = [null, undefined, [], 'hot', 42, function () {}, true]
    for (var i = 0; i < evilWds.length; i++) {
      var r = engine.filterByWeather([baseCmd], { weatherDetail: evilWds[i] })
      if (!Array.isArray(r)) return { ok: false, msg: 'wd=' + JSON.stringify(evilWds[i]) + ' 非数组' }
    }
    return { ok: true }
  })

  attack('A52: filterByWeather temperature 是 NaN/Infinity/-Infinity/字符串/布尔', function () {
    var evilTemps = [NaN, Infinity, -Infinity, '35', true, null, [], {}]
    for (var i = 0; i < evilTemps.length; i++) {
      var r = engine.filterByWeather([baseCmd], { weatherDetail: { temperature: evilTemps[i] } })
      if (!Array.isArray(r)) return { ok: false, msg: 'temp=' + JSON.stringify(evilTemps[i]) + ' 非数组' }
    }
    return { ok: true }
  })

  attack('A53: filterByWeather visibility 含原型链键/特殊字符不崩', function () {
    var evilVis = ['__proto__', 'constructor', 'toString', '<script>', '', 'a'.repeat(10000)]
    for (var i = 0; i < evilVis.length; i++) {
      var r = engine.filterByWeather([baseCmd], { weatherDetail: { visibility: evilVis[i] } })
      if (!Array.isArray(r)) return { ok: false, msg: 'vis=' + evilVis[i].slice(0, 20) + ' 非数组' }
    }
    return { ok: true }
  })

  attack('A54: 高温 35℃ 必过滤 outdoor duration>30 任务（安全不变量）', function () {
    var hotCmd = { id: 'hot1', type: 'walk', duration: 45, outdoor: true, nightSafe: true, rainy: true, requirePOI: null, cost: 0 }
    var r = engine.filterByWeather([hotCmd, baseCmd], { weatherDetail: { temperature: 35 } })
    for (var i = 0; i < r.length; i++) {
      if (r[i].id === 'hot1') return { ok: false, msg: '高温未过滤长户外任务' }
    }
    return { ok: true }
  })

  attack('A55: 低温 -10℃ 必过滤 outdoor duration>30 任务（安全不变量）', function () {
    var coldCmd = { id: 'cold1', type: 'walk', duration: 45, outdoor: true, nightSafe: true, rainy: true, requirePOI: null, cost: 0 }
    var r = engine.filterByWeather([coldCmd, baseCmd], { weatherDetail: { temperature: -10 } })
    for (var i = 0; i < r.length; i++) {
      if (r[i].id === 'cold1') return { ok: false, msg: '低温未过滤长户外任务' }
    }
    return { ok: true }
  })

  // --- B-08 filterByLocationDedup ---
  attack('A56: filterByLocationDedup recentLocations 含 __proto__/constructor 原型链键', function () {
    var r = engine.filterByLocationDedup([baseCmd], {
      recentLocations: ['cafe', '__proto__', 'constructor', 'toString'],
      recentLocationTimes: [Date.now(), Date.now(), Date.now(), Date.now()]
    })
    if (!Array.isArray(r)) return { ok: false, msg: '非数组' }
    return { ok: true }
  })

  attack('A57: filterByLocationDedup recentLocationTimes 含 NaN/负数/未来/超大数', function () {
    var evilTimes = [NaN, -1, Date.now() + 1e15, Infinity, 'abc', null, [], {}]
    for (var i = 0; i < evilTimes.length; i++) {
      var r = engine.filterByLocationDedup([baseCmd], {
        recentLocations: ['cafe'],
        recentLocationTimes: [evilTimes[i]]
      })
      if (!Array.isArray(r)) return { ok: false, msg: 'time=' + JSON.stringify(evilTimes[i]) + ' 非数组' }
    }
    return { ok: true }
  })

  attack('A58: filterByLocationDedup recentLocations 与 times 长度不一致不崩', function () {
    var r = engine.filterByLocationDedup([baseCmd], {
      recentLocations: ['cafe', 'park', 'market'],
      recentLocationTimes: [Date.now()]  // 只有 1 个时间戳，3 个地点
    })
    if (!Array.isArray(r)) return { ok: false, msg: '非数组' }
    return { ok: true }
  })

  // --- B-09 filterBySimilar ---
  attack('A59: filterBySimilar recentContents 含非字符串/null/对象/原型链键', function () {
    var evilContents = [null, undefined, 42, [], {}, '__proto__', 'constructor', function () {}]
    var r = engine.filterBySimilar([baseCmd], { recentContents: evilContents })
    if (!Array.isArray(r)) return { ok: false, msg: '非数组' }
    return { ok: true }
  })

  attack('A60: filterBySimilar cmd.content 超长字符串（100k）不崩', function () {
    var longCmd = { id: 'long', type: 'color', duration: 15, outdoor: true, nightSafe: true, rainy: true, requirePOI: null, cost: 0, content: 'a'.repeat(100000) }
    var start = Date.now()
    var r = engine.filterBySimilar([longCmd], { recentContents: ['b'.repeat(100000)] })
    var elapsed = Date.now() - start
    if (elapsed > 200) return { ok: false, msg: '耗时过长: ' + elapsed + 'ms' }
    if (!Array.isArray(r)) return { ok: false, msg: '非数组' }
    return { ok: true }
  })

  // --- B-10/B-11 computeDifficulty + normalizeType ---
  attack('A61: computeDifficulty 字段 NaN/Infinity/负数/字符串/布尔 永远返回 1-3', function () {
    var evilCmds = [
      { duration: NaN, outdoor: true, cost: 30 },
      { duration: Infinity, outdoor: 'true', cost: Infinity },
      { duration: -50, outdoor: null, cost: -10 },
      { duration: '15', outdoor: 1, cost: '30' },
      { duration: null, outdoor: undefined, cost: false },
      {}
    ]
    for (var i = 0; i < evilCmds.length; i++) {
      var d = engine.computeDifficulty(evilCmds[i])
      if (d < 1 || d > 3) return { ok: false, msg: '难度越界: ' + d + ' cmd=' + JSON.stringify(evilCmds[i]) }
    }
    return { ok: true }
  })

  attack('A62: normalizeType 原型链键 constructor/__proto__/toString 返回字符串不污染', function () {
    var evilTypes = ['constructor', '__proto__', 'toString', 'hasOwnProperty', 'valueOf']
    for (var i = 0; i < evilTypes.length; i++) {
      var n = engine.normalizeType(evilTypes[i])
      if (typeof n !== 'string') return { ok: false, msg: '返回非字符串: ' + typeof n + ' type=' + evilTypes[i] }
      // 不能是 Object 函数或 Object.prototype
      if (typeof n === 'function') return { ok: false, msg: '返回函数: ' + evilTypes[i] }
    }
    return { ok: true }
  })

  // --- B-12 scoreCommand + pickBestScored ---
  attack('A63: scoreCommand ctx 是 null/undefined/函数/原型链 返回 0-100 不抛异常', function () {
    var evilCtxs = [null, undefined, function () {}, [], 'string', 42, { __proto__: 'evil' }]
    for (var i = 0; i < evilCtxs.length; i++) {
      var s = engine.scoreCommand(baseCmd, evilCtxs[i])
      if (typeof s !== 'number' || s < 0 || s > 100) return { ok: false, msg: '分数越界: ' + s + ' ctx=' + JSON.stringify(evilCtxs[i]) }
    }
    return { ok: true }
  })

  attack('A64: pickBestScored candidates 含 null/undefined/非对象混合 不抛异常', function () {
    var mixed = [null, undefined, 'string', 42, false, baseCmd, { id: 'b', type: 'walk' }]
    var r = engine.pickBestScored(mixed, {})
    if (r === undefined) return { ok: false, msg: '返回 undefined' }
    // 必返回输入中某个元素（非 null/undefined 的）
    if (r !== null && typeof r === 'object' && !r.id) return { ok: false, msg: '返回非合法元素' }
    return { ok: true }
  })

  attack('A65: pickBestScored 空数组/null/undefined 返回 null，单元素返回自身', function () {
    var r1 = engine.pickBestScored([], {})
    if (r1 !== null) return { ok: false, msg: '空数组应返回 null' }
    var r2 = engine.pickBestScored(null, {})
    if (r2 !== null) return { ok: false, msg: 'null 应返回 null' }
    var r3 = engine.pickBestScored(undefined, {})
    if (r3 !== null) return { ok: false, msg: 'undefined 应返回 null' }
    var single = { id: 'only', type: 'color', duration: 15, outdoor: true, nightSafe: true, rainy: true, requirePOI: null, cost: 0 }
    var r4 = engine.pickBestScored([single], {})
    if (r4 !== single) return { ok: false, msg: '单元素未返回自身' }
    return { ok: true }
  })

  // --- B-13 buildExplanation ---
  attack('A66: buildExplanation cmd 是 null/undefined/数组/字符串 走默认 reason 返回三字段', function () {
    var evilCmds = [null, undefined, [], 'string', 42, function () {}]
    for (var i = 0; i < evilCmds.length; i++) {
      var e = engine.buildExplanation(evilCmds[i], {})
      if (!e || typeof e !== 'object') return { ok: false, msg: '非对象 cmd=' + JSON.stringify(evilCmds[i]) }
      if (typeof e.reason !== 'string' || typeof e.howto !== 'string' || typeof e.tip !== 'string') {
        return { ok: false, msg: '缺三字段: ' + JSON.stringify(e) }
      }
    }
    return { ok: true }
  })

  attack('A67: buildExplanation ctx 含脚本注入/原型链 不抛异常', function () {
    var evilCtxs = [
      { __proto__: 'evil' },
      { constructor: 'evil' },
      { weather: '<script>alert(1)</script>' },
      { locationName: "';rm -rf /" },
      { userPrefs: { type: { __proto__: 5, constructor: 99 } } }
    ]
    for (var i = 0; i < evilCtxs.length; i++) {
      var e = engine.buildExplanation(baseCmd, evilCtxs[i])
      if (!e || typeof e !== 'object') return { ok: false, msg: '非对象 ctx=' + JSON.stringify(evilCtxs[i]) }
    }
    return { ok: true }
  })

  // --- B-14 fillVariables ---
  attack('A68: fillVariables text 含 {__proto__}/{constructor} 占位符不污染', function () {
    var evilTexts = ['{__proto__}', '{constructor}', '{toString}', '{__proto__}{constructor}', '{时间}{__proto__}']
    for (var i = 0; i < evilTexts.length; i++) {
      var r = engine.fillVariables(evilTexts[i], {})
      if (typeof r !== 'string') return { ok: false, msg: '返回非字符串: ' + typeof r }
      // {时间} 应被替换，{__proto__} 应原样保留（非已知占位符）
      if (evilTexts[i].indexOf('{时间}') >= 0 && r.indexOf('{时间}') >= 0) {
        return { ok: false, msg: '{时间} 未替换' }
      }
    }
    return { ok: true }
  })

  attack('A69: fillVariables text 超长 + 大量占位符 不抛异常', function () {
    var longText = '{时间}{天气}{地点}{季节}'.repeat(10000)
    var start = Date.now()
    var r = engine.fillVariables(longText, { hour: 14, weather: 'sunny', locationName: '广场', season: '夏' })
    var elapsed = Date.now() - start
    if (elapsed > 200) return { ok: false, msg: '耗时过长: ' + elapsed + 'ms' }
    if (typeof r !== 'string') return { ok: false, msg: '非字符串' }
    // 占位符应全部被替换
    if (r.indexOf('{') >= 0) return { ok: false, msg: '仍有未替换占位符' }
    return { ok: true }
  })

  attack('A70: fillVariables ctx 是 null/undefined/原型链 不抛异常', function () {
    var evilCtxs = [null, undefined, [], 'string', 42, function () {}, { __proto__: 'evil' }]
    for (var i = 0; i < evilCtxs.length; i++) {
      var r = engine.fillVariables('{时间}{天气}{地点}{季节}', evilCtxs[i])
      if (typeof r !== 'string') return { ok: false, msg: '非字符串 ctx=' + JSON.stringify(evilCtxs[i]) }
    }
    return { ok: true }
  })
})

// ===== 结果 =====
console.log('\n' + '='.repeat(60))
console.log('Adversarial Attack 测试结果: ' + passCount + ' passed, ' + failCount + ' failed')
if (failures.length > 0) {
  console.log('\n失败项:')
  failures.forEach(f => console.log('  - ' + f))
}
console.log('='.repeat(60))
process.exit(failCount > 0 ? 1 : 0)
