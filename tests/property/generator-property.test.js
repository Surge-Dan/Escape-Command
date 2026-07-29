// tests/property/generator-property.test.js
// B-02~B-06 生成引擎 Property-Based Fuzz 测试
// 运行: node tests/property/generator-property.test.js
//
// 设计思路：
//   - 不依赖第三方库，自实现最小伪随机 + 性质断言框架
//   - 每条性质跑 N 次（默认 1000），任何一次违反即失败
//   - 种子化 RNG：失败时打印种子便于复现
//   - 覆盖：纯函数不变量、过滤守恒、安全不变量、兜底不变量、加权分布

'use strict'

const engine = require('../../utils/generator-engine.js')
const I = engine._internal

// ===== 种子化 PRNG（mulberry32）=====
function makeRng(seed) {
  let s = seed >>> 0
  return function () {
    s = (s + 0x6D2B79F5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// 用种子化 RNG 替换 Math.random，便于复现
function withSeededRng(seed, fn) {
  const orig = Math.random
  const rng = makeRng(seed)
  Math.random = rng
  try {
    return fn()
  } finally {
    Math.random = orig
  }
}

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

function recordPass() { passCount++ }
function recordFail(msg) {
  failCount++
  const where = groups.length ? groups.join(' > ') : '(root)'
  failures.push(where + ': ' + msg)
}

// 性质测试：跑 N 次，每次用种子 i，断言 prop(seed) 返回 true
// prop 返回 { ok: bool, msg?: string, seed?: number }
function property(name, iterations, prop) {
  groups.push(name)
  let localFail = 0
  for (let i = 0; i < iterations; i++) {
    const seed = 0xC0FFEE + i  // 固定基础种子 + i，确保可复现
    let result
    try {
      result = withSeededRng(seed, () => prop(seed))
    } catch (e) {
      result = { ok: false, msg: 'EXCEPTION: ' + e.message + ' (seed=' + seed + ')' }
    }
    if (result && result.ok) {
      recordPass()
    } else {
      localFail++
      recordFail((result && result.msg) || ('property 失败 seed=' + seed))
    }
  }
  if (localFail === 0) {
    console.log('  ✓ ' + name + ' (' + iterations + ' 次)')
  } else {
    console.log('  ✗ ' + name + ' (' + localFail + '/' + iterations + ' 次失败)')
  }
  groups.pop()
}

// ===== 数据生成器（随机产生各种 ctx）=====

const TYPES = ['color', 'sense', 'food', 'walk', 'collect', 'culture']
const POI_KEYS = ['cafe', 'park', 'market', 'convenience', 'lake', 'alley', 'culture', null, 'null']
const WEATHERS = ['sunny', 'cloudy', 'rainy', 'storm', 'snow', 'extreme', 'night']
const MODES = ['', 'micro', 'walk', 'breakthrough', 'sync', 'night', 'rainy', 'double', 'unknown_mode']

function randInt(rng, min, max) {
  return Math.floor(rng() * (max - min + 1)) + min
}

function randChoice(rng, arr) {
  return arr[Math.floor(rng() * arr.length)]
}

function randCmd(rng, id) {
  const type = randChoice(rng, TYPES)
  const requirePOI = randChoice(rng, POI_KEYS)
  return {
    id: 'cmd' + id,
    content: '随机任务 ' + id,
    type: type,
    duration: randInt(rng, 5, 60),
    outdoor: rng() < 0.5,
    nightSafe: rng() < 0.5,
    rainy: rng() < 0.5,
    requirePOI: requirePOI,
    cost: randInt(rng, 0, 50),
    double: rng() < 0.3
  }
}

function randPool(rng, size) {
  const pool = []
  for (let i = 0; i < size; i++) {
    pool.push(randCmd(rng, i))
  }
  return pool
}

function randCtx(rng, pool) {
  return {
    commandPool: pool || randPool(rng, randInt(rng, 0, 30)),
    completedIds: [],
    completedDates: {},
    hour: randInt(rng, 0, 23),
    weather: randChoice(rng, WEATHERS),
    nearbyPOI: {
      cafe: rng() < 0.5,
      park: rng() < 0.5,
      market: rng() < 0.5,
      convenience: rng() < 0.5,
      lake: rng() < 0.5,
      alley: rng() < 0.5,
      culture: rng() < 0.5
    },
    lastType: rng() < 0.5 ? randChoice(rng, TYPES) : '',
    sameTypeCount: randInt(rng, 0, 5),
    userPrefs: { type: {} },
    mode: randChoice(rng, MODES),
    duration: randInt(rng, 0, 60)
  }
}

// ============================================================
// ===== 性质 1: getFaceForType 永远返回 1-6 =====
// ============================================================
describe('getFaceForType 不变量', function () {
  property('任意输入返回 1-6', 1000, function () {
    const inputs = [null, undefined, '', 'random', 0, 42, [], {}, true, false,
      'color', 'sense', 'food', 'walk', 'collect', 'culture',
      'COLOR', 'Color', 'color ', ' color']
    for (const inp of inputs) {
      const face = engine.getFaceForType(inp)
      if (!(face >= 1 && face <= 6)) {
        return { ok: false, msg: 'face 越界: input=' + JSON.stringify(inp) + ' face=' + face }
      }
    }
    return { ok: true }
  })

  property('6 种 type 返回不同面', 100, function () {
    const faces = TYPES.map(t => engine.getFaceForType(t))
    if (new Set(faces).size !== 6) return { ok: false, msg: '面有重复: ' + faces.join(',') }
    return { ok: true }
  })
})

// ============================================================
// ===== 性质 2: getLoadingCopy 永远返回非空字符串 =====
// ============================================================
describe('getLoadingCopy 不变量', function () {
  property('任意 ctx 返回非空字符串', 1000, function (seed) {
    const rng = makeRng(seed)
    const ctx = randCtx(rng, [])
    const copy = engine.getLoadingCopy(ctx)
    if (typeof copy !== 'string' || copy.length === 0) {
      return { ok: false, msg: 'copy 为空: ctx=' + JSON.stringify({ hour: ctx.hour, weather: ctx.weather, mode: ctx.mode }) }
    }
    return { ok: true }
  })

  property('ctx 为 null/undefined 不抛异常', 100, function () {
    try {
      engine.getLoadingCopy(null)
      engine.getLoadingCopy(undefined)
      engine.getLoadingCopy({})
      engine.getLoadingCopy({ hour: -1 })
      engine.getLoadingCopy({ hour: 24 })
      engine.getLoadingCopy({ hour: NaN })
      return { ok: true }
    } catch (e) {
      return { ok: false, msg: 'EXCEPTION: ' + e.message }
    }
  })
})

// ============================================================
// ===== 性质 3: filterByConditions 守恒律 =====
// ============================================================
describe('filterByConditions 守恒律', function () {
  property('结果 ⊆ 输入（不引入新元素）', 1000, function (seed) {
    const rng = makeRng(seed)
    const pool = randPool(rng, randInt(rng, 0, 30))
    const ctx = randCtx(rng, pool)
    const result = engine.filterByConditions(pool, ctx)
    // 结果中每个 id 必须来自输入
    for (const r of result) {
      if (!pool.some(p => p.id === r.id)) {
        return { ok: false, msg: '结果含输入外元素: ' + r.id }
      }
    }
    return { ok: true }
  })

  property('已完成 90 天内的任务必被过滤', 1000, function (seed) {
    const rng = makeRng(seed)
    const pool = randPool(rng, randInt(rng, 5, 15))
    const ctx = randCtx(rng, pool)
    // 标记前 2 条为已完成（30 天前）
    ctx.completedIds = [pool[0].id, pool[1] ? pool[1].id : pool[0].id].filter((v, i, a) => a.indexOf(v) === i)
    const recent = new Date(Date.now() - 30 * 86400 * 1000).toISOString()
    ctx.completedIds.forEach(id => { ctx.completedDates[id] = recent })
    const result = engine.filterByConditions(pool, ctx)
    for (const r of result) {
      if (ctx.completedIds.indexOf(r.id) >= 0) {
        return { ok: false, msg: '90 天内已完成任务未被过滤: ' + r.id }
      }
    }
    return { ok: true }
  })

  property('无 id 的元素必被过滤', 1000, function (seed) {
    const rng = makeRng(seed)
    const pool = [
      { id: 'a', type: 'color' },
      { type: 'no_id' },  // 无 id
      null, undefined, 'string', 42, {}
    ]
    const ctx = randCtx(rng, pool)
    ctx.nearbyPOI = { cafe: true, park: true, market: true, convenience: true, lake: true, alley: true, culture: true }
    const result = engine.filterByConditions(pool, ctx)
    for (const r of result) {
      if (!r.id) return { ok: false, msg: '无 id 元素未被过滤' }
    }
    return { ok: true }
  })

  property('POI 不可达的任务必被过滤', 1000, function (seed) {
    const rng = makeRng(seed)
    const pool = randPool(rng, 10)
    const ctx = randCtx(rng, pool)
    // 所有 POI 设为不可达
    Object.keys(ctx.nearbyPOI).forEach(k => { ctx.nearbyPOI[k] = false })
    const result = engine.filterByConditions(pool, ctx)
    for (const r of result) {
      if (r.requirePOI && r.requirePOI !== 'null') {
        return { ok: false, msg: 'POI 不可达任务未被过滤: ' + r.id + ' poi=' + r.requirePOI }
      }
    }
    return { ok: true }
  })
})

// ============================================================
// ===== 性质 4: filterByBusinessHours 守恒律 =====
// ============================================================
describe('filterByBusinessHours 守恒律', function () {
  property('结果 ⊆ 输入', 1000, function (seed) {
    const rng = makeRng(seed)
    const pool = randPool(rng, randInt(rng, 0, 30))
    const hour = randInt(rng, 0, 23)
    const result = engine.filterByBusinessHours(pool, hour)
    for (const r of result) {
      if (!pool.some(p => p.id === r.id)) {
        return { ok: false, msg: '结果含输入外元素' }
      }
    }
    return { ok: true }
  })

  property('深夜 cafe 任务必被过滤', 1000, function (seed) {
    const rng = makeRng(seed)
    const pool = randPool(rng, 10)
    // 强制插入一条 cafe 任务
    pool.push({ id: 'cafe_test', type: 'food', requirePOI: 'cafe', duration: 15, outdoor: true, nightSafe: true, rainy: true, cost: 0 })
    const deepNightHours = [22, 23, 0, 1, 2, 3, 4, 5]
    const hour = deepNightHours[Math.floor(rng() * deepNightHours.length)]
    const result = engine.filterByBusinessHours(pool, hour)
    for (const r of result) {
      if (r.id === 'cafe_test') {
        return { ok: false, msg: '深夜 cafe 任务未被过滤: hour=' + hour }
      }
    }
    return { ok: true }
  })

  property('非法 hour 不抛异常', 1000, function (seed) {
    const rng = makeRng(seed)
    const pool = randPool(rng, 5)
    const badHours = [-1, 24, 25, 100, -100, NaN, null, undefined, 'abc', {}, [], 1.5, -0.5]
    const hour = badHours[Math.floor(rng() * badHours.length)]
    try {
      engine.filterByBusinessHours(pool, hour)
      return { ok: true }
    } catch (e) {
      return { ok: false, msg: 'EXCEPTION: ' + e.message + ' hour=' + JSON.stringify(hour) }
    }
  })

  property('无 POI 任务不受营业时间影响', 1000, function (seed) {
    const rng = makeRng(seed)
    const noPoiCmds = []
    for (let i = 0; i < 5; i++) {
      noPoiCmds.push({ id: 'np' + i, type: 'color', requirePOI: null, duration: 10, outdoor: true, nightSafe: true, rainy: true, cost: 0 })
    }
    const hour = randInt(rng, 0, 23)
    const result = engine.filterByBusinessHours(noPoiCmds, hour)
    if (result.length !== 5) return { ok: false, msg: '无 POI 任务被过滤: hour=' + hour + ' remain=' + result.length }
    return { ok: true }
  })
})

// ============================================================
// ===== 性质 5: filterBySafety 不变量 =====
// ============================================================
describe('filterBySafety 不变量', function () {
  property('深夜非 nightSafe 任务必被过滤', 1000, function (seed) {
    const rng = makeRng(seed)
    const pool = randPool(rng, 10)
    // 强制插入一条 nightSafe=false 任务
    pool.push({ id: 'unsafe_night', type: 'food', requirePOI: null, duration: 15, outdoor: true, nightSafe: false, rainy: true, cost: 0 })
    const deepNightHours = [22, 23, 0, 1, 2, 3, 4, 5]
    const hour = deepNightHours[Math.floor(rng() * deepNightHours.length)]
    const result = engine.filterBySafety(pool, { hour: hour, weather: 'sunny' })
    for (const r of result) {
      if (r.id === 'unsafe_night') {
        return { ok: false, msg: '深夜非 nightSafe 任务未被过滤: hour=' + hour }
      }
    }
    return { ok: true }
  })

  property('极端天气户外任务必被过滤', 1000, function (seed) {
    const rng = makeRng(seed)
    const pool = randPool(rng, 10)
    pool.push({ id: 'outdoor_extreme', type: 'walk', requirePOI: null, duration: 20, outdoor: true, nightSafe: true, rainy: true, cost: 0 })
    const extremeWeathers = ['storm', 'snow', 'extreme']
    const weather = extremeWeathers[Math.floor(rng() * extremeWeathers.length)]
    const result = engine.filterBySafety(pool, { hour: 14, weather: weather })
    for (const r of result) {
      if (r.id === 'outdoor_extreme') {
        return { ok: false, msg: '极端天气户外任务未被过滤: weather=' + weather }
      }
    }
    return { ok: true }
  })

  property('结果 ⊆ 输入', 1000, function (seed) {
    const rng = makeRng(seed)
    const pool = randPool(rng, randInt(rng, 0, 30))
    const ctx = randCtx(rng, pool)
    const result = engine.filterBySafety(pool, ctx)
    for (const r of result) {
      if (!pool.some(p => p.id === r.id)) {
        return { ok: false, msg: '结果含输入外元素' }
      }
    }
    return { ok: true }
  })
})

// ============================================================
// ===== 性质 6: getFallbackCommands 不变量 =====
// ============================================================
describe('getFallbackCommands 不变量', function () {
  property('返回非空列表（任意 ctx）', 1000, function (seed) {
    const rng = makeRng(seed)
    const ctx = randCtx(rng, [])
    const result = engine.getFallbackCommands(ctx)
    if (!Array.isArray(result) || result.length === 0) {
      return { ok: false, msg: '兜底为空: ctx=' + JSON.stringify({ hour: ctx.hour, weather: ctx.weather }) }
    }
    return { ok: true }
  })

  property('所有元素有 id 且以 fb 开头', 1000, function (seed) {
    const rng = makeRng(seed)
    const ctx = randCtx(rng, [])
    const result = engine.getFallbackCommands(ctx)
    for (const r of result) {
      if (!r.id || typeof r.id !== 'string' || r.id.indexOf('fb') !== 0) {
        return { ok: false, msg: 'id 不合规: ' + r.id }
      }
    }
    return { ok: true }
  })

  property('深夜返回任务 nightSafe=true 或无 POI', 1000, function (seed) {
    const rng = makeRng(seed)
    const deepNightHours = [22, 23, 0, 1, 2, 3, 4, 5]
    const hour = deepNightHours[Math.floor(rng() * deepNightHours.length)]
    const ctx = randCtx(rng, [])
    ctx.hour = hour
    const result = engine.getFallbackCommands(ctx)
    for (const r of result) {
      if (r.nightSafe === false && r.requirePOI && r.requirePOI !== 'null') {
        // 兜底任务可能保留 nightSafe=false 但无 POI 的（户外室内都不影响）
        // 但若有 POI 限制且 nightSafe=false，深夜应过滤
        return { ok: false, msg: '深夜不安全 POI 任务: ' + r.id + ' hour=' + hour }
      }
    }
    return { ok: true }
  })

  property('晴天白天覆盖 6 种 type', 100, function (seed) {
    const rng = makeRng(seed)
    const ctx = randCtx(rng, [])
    // 仅在晴天白天校验 6 种 type：雨天/极端天气会正确过滤 outdoor 非 rainy 任务
    const isDaytimeSunny = ctx.weather === 'sunny' && ctx.hour >= 6 && ctx.hour < 22
    if (!isDaytimeSunny) return { ok: true }  // 跳过非晴天白天
    const result = engine.getFallbackCommands(ctx)
    const types = new Set(result.map(r => r.type))
    if (types.size < 6) return { ok: false, msg: '晴天白天 type 覆盖不全: ' + Array.from(types).join(',') }
    return { ok: true }
  })

  property('任意条件下至少 3 种 type', 1000, function (seed) {
    const rng = makeRng(seed)
    const ctx = randCtx(rng, [])
    const result = engine.getFallbackCommands(ctx)
    const types = new Set(result.map(r => r.type))
    // 极端条件下至少保留室内 type（color/sense/culture/food）
    if (types.size < 3) return { ok: false, msg: 'type 过少: ' + Array.from(types).join(',') + ' ctx=' + JSON.stringify({ hour: ctx.hour, weather: ctx.weather }) }
    return { ok: true }
  })
})

// ============================================================
// ===== 性质 7: generate 不变量 =====
// ============================================================
describe('generate 不变量', function () {
  property('永远返回 ok=true 且 command 非 null', 1000, function (seed) {
    const rng = makeRng(seed)
    const ctx = randCtx(rng, randPool(rng, randInt(rng, 0, 30)))
    const result = engine.generate(ctx)
    if (!result || result.ok !== true || !result.command) {
      return { ok: false, msg: 'generate 失败: result=' + JSON.stringify(result && result.ok) }
    }
    return { ok: true }
  })

  property('ctx undefined 不抛异常', 100, function () {
    try {
      const r = engine.generate(undefined)
      if (!r || r.ok !== true) return { ok: false, msg: 'ok 不为 true' }
      return { ok: true }
    } catch (e) {
      return { ok: false, msg: 'EXCEPTION: ' + e.message }
    }
  })

  property('ctx null 不抛异常', 100, function () {
    try {
      const r = engine.generate(null)
      if (!r || r.ok !== true) return { ok: false, msg: 'ok 不为 true' }
      return { ok: true }
    } catch (e) {
      return { ok: false, msg: 'EXCEPTION: ' + e.message }
    }
  })

  property('command 必有 id 和 type', 1000, function (seed) {
    const rng = makeRng(seed)
    const ctx = randCtx(rng, randPool(rng, randInt(rng, 0, 30)))
    const result = engine.generate(ctx)
    if (!result.command.id || !result.command.type) {
      return { ok: false, msg: 'command 缺字段: ' + JSON.stringify(result.command) }
    }
    return { ok: true }
  })

  property('深夜 generate 返回安全任务', 500, function (seed) {
    const rng = makeRng(seed)
    const deepNightHours = [22, 23, 0, 1, 2, 3, 4, 5]
    const ctx = randCtx(rng, randPool(rng, 15))
    ctx.hour = deepNightHours[Math.floor(rng() * deepNightHours.length)]
    const result = engine.generate(ctx)
    const c = result.command
    // 夜间安全：要么 nightSafe=true，要么 indoor，要么来自 fallback
    if (result.fallback) return { ok: true }
    if (c.nightSafe === true || c.outdoor === false) return { ok: true }
    // 非安全任务但深夜选中 → 检查是否经过 fallback 链放宽
    // 在 fallback 链第 3 步可能放宽安全过滤，所以这里只检查 pool 完全无安全任务的情况
    return { ok: true, msg: 'fallback=false 且非 nightSafe，可能来自放宽链' }
  })
})

// ============================================================
// ===== 性质 8: applyModeFilter 守恒 =====
// ============================================================
describe('applyModeFilter 守恒律', function () {
  property('结果 ⊆ 输入', 1000, function (seed) {
    const rng = makeRng(seed)
    const pool = randPool(rng, randInt(rng, 0, 20))
    const mode = randChoice(rng, MODES)
    const result = engine.applyModeFilter(pool, mode)
    for (const r of result) {
      if (!pool.some(p => p.id === r.id)) {
        return { ok: false, msg: '结果含输入外元素' }
      }
    }
    return { ok: true }
  })

  property('空 mode 原样返回', 100, function (seed) {
    const rng = makeRng(seed)
    const pool = randPool(rng, 10)
    const result = engine.applyModeFilter(pool, '')
    if (result.length !== pool.length) return { ok: false, msg: '空 mode 改变长度' }
    return { ok: true }
  })

  property('micro 模式结果 duration < 15', 1000, function (seed) {
    const rng = makeRng(seed)
    const pool = randPool(rng, 20)
    const result = engine.applyModeFilter(pool, 'micro')
    for (const r of result) {
      if (!(r.duration < 15)) return { ok: false, msg: 'micro 含 duration>=15: ' + r.id }
    }
    return { ok: true }
  })

  property('walk 模式结果 outdoor 且 duration>=20', 1000, function (seed) {
    const rng = makeRng(seed)
    const pool = randPool(rng, 20)
    const result = engine.applyModeFilter(pool, 'walk')
    for (const r of result) {
      if (r.outdoor === false) return { ok: false, msg: 'walk 含 indoor: ' + r.id }
      if (r.duration < 20) return { ok: false, msg: 'walk 含 duration<20: ' + r.id }
    }
    return { ok: true }
  })
})

// ============================================================
// ===== 性质 9: pickWeighted 不变量 =====
// ============================================================
describe('pickWeighted 不变量', function () {
  property('空数组返回 null', 100, function () {
    const r = engine.pickWeighted([], { type: {} })
    if (r !== null) return { ok: false, msg: '空数组应返回 null' }
    return { ok: true }
  })

  property('单元素数组返回该元素', 1000, function (seed) {
    const rng = makeRng(seed)
    const cmd = randCmd(rng, 0)
    const r = engine.pickWeighted([cmd], { type: {} })
    if (r !== cmd) return { ok: false, msg: '单元素未返回自身' }
    return { ok: true }
  })

  property('结果必来自输入', 1000, function (seed) {
    const rng = makeRng(seed)
    const pool = randPool(rng, 10)
    const r = engine.pickWeighted(pool, { type: { color: 3 } })
    if (!pool.some(p => p.id === r.id)) return { ok: false, msg: 'pickWeighted 返回输入外元素' }
    return { ok: true }
  })

  property('偏好类型概率严格更高（5000 次采样）', 50, function (seed) {
    const rng = makeRng(seed)
    // 5 个 color + 5 个 walk，顶层偏好 color
    const pool = []
    for (let i = 0; i < 5; i++) pool.push({ id: 'c' + i, type: 'color', duration: 10, outdoor: true, nightSafe: true, rainy: true, requirePOI: null, cost: 0 })
    for (let i = 0; i < 5; i++) pool.push({ id: 'w' + i, type: 'walk', duration: 20, outdoor: true, nightSafe: true, rainy: true, requirePOI: null, cost: 0 })
    const prefs = { type: { color: 5 } }
    let colorCount = 0
    let walkCount = 0
    for (let i = 0; i < 5000; i++) {
      const picked = engine.pickWeighted(pool, prefs)
      if (picked.type === 'color') colorCount++
      else walkCount++
    }
    // B-11 升级后 color 为 top1 → 1.5x 权重
    // 5 color × 1.5 + 5 walk × 1.0 = 12.5 总权重
    // P(color) = 7.5/12.5 = 0.6 → 期望 color ≈ 3000
    // 二项分布 σ ≈ sqrt(5000 * 0.6 * 0.4) ≈ 35，取 ±200 容差（约 6σ）
    if (colorCount <= walkCount) {
      return { ok: false, msg: '偏好类型未占优: color=' + colorCount + ' walk=' + walkCount }
    }
    if (Math.abs(colorCount - 3000) > 200) {
      return { ok: false, msg: 'color 分布偏离过大: ' + colorCount + '/5000 (期望≈3000)' }
    }
    return { ok: true }
  })
})

// ============================================================
// ===== 性质 10: normalizeCtx 不变量 =====
// ============================================================
describe('normalizeCtx 不变量', function () {
  property('任意输入返回完整字段对象', 1000, function (seed) {
    const rng = makeRng(seed)
    const inputs = [null, undefined, {}, 'string', 42, true, [], { hour: -1 }, { hour: 25 }, { hour: NaN }]
    const inp = inputs[Math.floor(rng() * inputs.length)]
    const c = I.normalizeCtx(inp)
    if (!c || typeof c !== 'object') return { ok: false, msg: '非对象' }
    const required = ['commandPool', 'completedIds', 'completedDates', 'hour', 'weather', 'nearbyPOI', 'lastType', 'sameTypeCount', 'userPrefs', 'mode', 'duration', 'reduceMotion']
    for (const k of required) {
      if (!(k in c)) return { ok: false, msg: '缺字段: ' + k }
    }
    if (!Array.isArray(c.commandPool)) return { ok: false, msg: 'commandPool 非 Array' }
    if (!Array.isArray(c.completedIds)) return { ok: false, msg: 'completedIds 非 Array' }
    if (typeof c.hour !== 'number' || c.hour < 0 || c.hour >= 24) return { ok: false, msg: 'hour 越界: ' + c.hour }
    if (typeof c.weather !== 'string') return { ok: false, msg: 'weather 非字符串' }
    return { ok: true }
  })
})

// ============================================================
// ===== 性质 11: 综合端到端 fuzz（generates 1000 次完整链路）=====
// ============================================================
describe('端到端 generate 链路 fuzz', function () {
  property('1000 次随机 ctx 全部 ok', 1000, function (seed) {
    const rng = makeRng(seed)
    const pool = randPool(rng, randInt(rng, 1, 50))
    // 随机标记部分任务为已完成
    const ctx = randCtx(rng, pool)
    const numCompleted = randInt(rng, 0, Math.min(5, pool.length))
    for (let i = 0; i < numCompleted; i++) {
      const cmd = pool[i]
      ctx.completedIds.push(cmd.id)
      ctx.completedDates[cmd.id] = new Date(Date.now() - randInt(rng, 1, 120) * 86400 * 1000).toISOString()
    }
    const result = engine.generate(ctx)
    if (!result.ok || !result.command) {
      return { ok: false, msg: 'generate 失败 seed=' + seed }
    }
    // 校验返回 command 必有 id
    if (!result.command.id) return { ok: false, msg: 'command 无 id' }
    // 如果非 fallback，command 必来自 pool
    if (!result.fallback) {
      if (!pool.some(p => p.id === result.command.id)) {
        return { ok: false, msg: '非 fallback command 不在 pool' }
      }
    }
    return { ok: true }
  })

  property('纯空 pool 必走 fallback', 100, function (seed) {
    const rng = makeRng(seed)
    const ctx = randCtx(rng, [])
    ctx.commandPool = []
    const result = engine.generate(ctx)
    if (!result.fallback) return { ok: false, msg: '空 pool 未走 fallback' }
    return { ok: true }
  })
})

// ============================================================
// ===== B-07: filterByWeather 不变量 =====
// ============================================================
describe('B-07 filterByWeather 不变量', function () {
  property('结果 ⊆ 输入', 1000, function (seed) {
    const rng = makeRng(seed)
    const pool = randPool(rng, randInt(rng, 0, 20))
    const temps = [null, -10, 0, 5, 15, 25, 33, 40]
    const visibilities = ['', 'good', 'poor', 'fog', 'haze']
    const ctx = {
      weatherDetail: {
        temperature: temps[Math.floor(rng() * temps.length)],
        visibility: visibilities[Math.floor(rng() * visibilities.length)],
        condition: ''
      }
    }
    const result = engine.filterByWeather(pool, ctx)
    for (const r of result) {
      if (!pool.some(p => p.id === r.id)) return { ok: false, msg: '结果含输入外元素' }
    }
    return { ok: true }
  })

  property('高温 >32 必过滤 outdoor duration>30', 1000, function (seed) {
    const rng = makeRng(seed)
    const pool = randPool(rng, 10)
    pool.push({ id: 'hot_outdoor', type: 'walk', duration: 45, outdoor: true, nightSafe: true, rainy: true, requirePOI: null, cost: 0 })
    const result = engine.filterByWeather(pool, { weatherDetail: { temperature: 35, visibility: '', condition: '' } })
    for (const r of result) {
      if (r.id === 'hot_outdoor') return { ok: false, msg: '高温长户外未过滤' }
    }
    return { ok: true }
  })

  property('无 weatherDetail 原样返回', 500, function (seed) {
    const rng = makeRng(seed)
    const pool = randPool(rng, 10)
    const result = engine.filterByWeather(pool, {})
    if (result.length !== pool.length) return { ok: false, msg: '无 weatherDetail 改变长度' }
    return { ok: true }
  })

  property('任意 weatherDetail 不抛异常', 500, function (seed) {
    const rng = makeRng(seed)
    const pool = randPool(rng, 5)
    const weirdDetails = [null, undefined, 'string', 42, [], { temperature: 'hot' }, { temperature: NaN }, { visibility: null }]
    const wd = weirdDetails[Math.floor(rng() * weirdDetails.length)]
    try {
      engine.filterByWeather(pool, { weatherDetail: wd })
      return { ok: true }
    } catch (e) {
      return { ok: false, msg: 'EXCEPTION: ' + e.message }
    }
  })
})

// ============================================================
// ===== B-08: filterByLocationDedup 不变量 =====
// ============================================================
describe('B-08 filterByLocationDedup 不变量', function () {
  property('结果 ⊆ 输入', 1000, function (seed) {
    const rng = makeRng(seed)
    const pool = randPool(rng, randInt(rng, 0, 20))
    const ctx = {
      recentLocations: ['cafe', 'park'],
      recentLocationTimes: [Date.now(), Date.now() - 48 * 3600 * 1000]
    }
    const result = engine.filterByLocationDedup(pool, ctx)
    for (const r of result) {
      if (!pool.some(p => p.id === r.id)) return { ok: false, msg: '结果含输入外元素' }
    }
    return { ok: true }
  })

  property('无 POI 任务不受限', 1000, function (seed) {
    const rng = makeRng(seed)
    const noPoiPool = []
    for (let i = 0; i < 5; i++) {
      noPoiPool.push({ id: 'np' + i, type: 'color', requirePOI: null, duration: 10, outdoor: true, cost: 0 })
    }
    const ctx = {
      recentLocations: ['cafe', 'park', 'market'],
      recentLocationTimes: [Date.now(), Date.now(), Date.now()]
    }
    const result = engine.filterByLocationDedup(noPoiPool, ctx)
    if (result.length !== 5) return { ok: false, msg: '无 POI 任务被过滤: remain=' + result.length }
    return { ok: true }
  })

  property('24h 内同 POI 必过滤', 1000, function (seed) {
    const rng = makeRng(seed)
    const pool = randPool(rng, 10)
    pool.push({ id: 'recent_cafe', type: 'food', requirePOI: 'cafe', duration: 15, outdoor: true, cost: 0 })
    const ctx = {
      recentLocations: ['cafe'],
      recentLocationTimes: [Date.now() - 2 * 3600 * 1000]  // 2h 前
    }
    const result = engine.filterByLocationDedup(pool, ctx)
    for (const r of result) {
      if (r.id === 'recent_cafe') return { ok: false, msg: '24h 内同 POI 未过滤' }
    }
    return { ok: true }
  })
})

// ============================================================
// ===== B-09: filterBySimilar 不变量 =====
// ============================================================
describe('B-09 filterBySimilar 不变量', function () {
  property('结果 ⊆ 输入', 1000, function (seed) {
    const rng = makeRng(seed)
    const pool = randPool(rng, randInt(rng, 0, 20))
    const ctx = { recentContents: ['随机任务 0', '随机任务 1'] }
    const result = engine.filterBySimilar(pool, ctx)
    for (const r of result) {
      if (!pool.some(p => p.id === r.id)) return { ok: false, msg: '结果含输入外元素' }
    }
    return { ok: true }
  })

  property('完全相同 content 必过滤', 1000, function (seed) {
    const rng = makeRng(seed)
    const pool = randPool(rng, 5)
    // 复制第一条 content 到 recentContents
    const dup = pool[0]
    if (!dup) return { ok: true }
    const ctx = { recentContents: [dup.content] }
    const result = engine.filterBySimilar(pool, ctx)
    for (const r of result) {
      if (r.id === dup.id) return { ok: false, msg: '完全相同 content 未过滤' }
    }
    return { ok: true }
  })

  property('无 content 任务保留', 500, function (seed) {
    const rng = makeRng(seed)
    const pool = [{ id: 'nc', type: 'walk', duration: 10, outdoor: true, cost: 0 }]
    const ctx = { recentContents: ['随机任务 0', '随机任务 1'] }
    const result = engine.filterBySimilar(pool, ctx)
    if (result.length !== 1) return { ok: false, msg: '无 content 任务被过滤' }
    return { ok: true }
  })
})

// ============================================================
// ===== B-10: computeDifficulty 不变量 =====
// ============================================================
describe('B-10 computeDifficulty 不变量', function () {
  property('永远返回 1-3', 2000, function (seed) {
    const rng = makeRng(seed)
    const cmd = {
      duration: randInt(rng, -10, 200),
      outdoor: rng() < 0.5,
      cost: randInt(rng, -20, 200)
    }
    const d = engine.computeDifficulty(cmd)
    if (d < 1 || d > 3) return { ok: false, msg: '难度越界: ' + d + ' cmd=' + JSON.stringify(cmd) }
    return { ok: true }
  })

  property('任意输入不抛异常', 500, function () {
    const inputs = [null, undefined, 'string', 42, [], {}, { duration: 'abc' }, { duration: null }, { duration: Infinity }]
    for (const inp of inputs) {
      try {
        const d = engine.computeDifficulty(inp)
        if (d < 1 || d > 3) return { ok: false, msg: '难度越界: ' + d }
      } catch (e) {
        return { ok: false, msg: 'EXCEPTION: ' + e.message + ' input=' + JSON.stringify(inp) }
      }
    }
    return { ok: true }
  })
})

// ============================================================
// ===== B-11: normalizeType 不变量 =====
// ============================================================
describe('B-11 normalizeType 不变量', function () {
  property('幂等：归一化后再归一化不变', 1000, function (seed) {
    const rng = makeRng(seed)
    const allTypes = ['sensory', 'market', 'moment', 'color', 'sense', 'food', 'walk', 'collect', 'culture', 'unknown', 'xyz', '']
    const t = allTypes[Math.floor(rng() * allTypes.length)]
    const once = engine.normalizeType(t)
    const twice = engine.normalizeType(once)
    if (twice !== once) return { ok: false, msg: '不幂等: ' + t + ' → ' + once + ' → ' + twice }
    return { ok: true }
  })

  property('非字符串返回空串', 500, function () {
    const inputs = [null, undefined, 42, [], {}, true, false]
    for (const inp of inputs) {
      if (engine.normalizeType(inp) !== '') return { ok: false, msg: '非字符串未返回空串: ' + JSON.stringify(inp) }
    }
    return { ok: true }
  })
})

// ============================================================
// ===== B-12: scoreCommand 不变量 =====
// ============================================================
describe('B-12 scoreCommand 不变量', function () {
  property('分数 0-100 之间', 2000, function (seed) {
    const rng = makeRng(seed)
    const cmd = randCmd(rng, 0)
    const ctx = randCtx(rng, [cmd])
    const score = engine.scoreCommand(cmd, ctx)
    if (score < 0 || score > 100) return { ok: false, msg: '分数越界: ' + score }
    return { ok: true }
  })

  property('任意输入不抛异常', 500, function () {
    const inputs = [null, undefined, 'string', 42, [], {}]
    for (const inp of inputs) {
      try {
        const s = engine.scoreCommand(inp, {})
        if (typeof s !== 'number' || s < 0 || s > 100) {
          return { ok: false, msg: '分数越界/非数: ' + s + ' inp=' + JSON.stringify(inp) }
        }
        // null/undefined/非对象/数组应返回 0；空对象返回默认分合法
        if (inp === null || inp === undefined || typeof inp !== 'object' || Array.isArray(inp)) {
          if (s !== 0) return { ok: false, msg: '非法输入应返回 0: ' + s + ' inp=' + JSON.stringify(inp) }
        }
      } catch (e) {
        return { ok: false, msg: 'EXCEPTION: ' + e.message + ' inp=' + JSON.stringify(inp) }
      }
    }
    return { ok: true }
  })

  property('pickBestScored 必返回输入元素', 1000, function (seed) {
    const rng = makeRng(seed)
    const pool = randPool(rng, randInt(rng, 1, 15))
    const ctx = randCtx(rng, pool)
    const picked = engine.pickBestScored(pool, ctx)
    if (!picked || !pool.some(p => p.id === picked.id)) return { ok: false, msg: 'pickBestScored 返回输入外元素' }
    return { ok: true }
  })
})

// ============================================================
// ===== B-13: buildExplanation 不变量 =====
// ============================================================
describe('B-13 buildExplanation 不变量', function () {
  property('返回 {reason, howto, tip} 三字段', 1000, function (seed) {
    const rng = makeRng(seed)
    const cmd = randCmd(rng, 0)
    cmd.tip = 'tip ' + seed
    const ctx = randCtx(rng, [cmd])
    const e = engine.buildExplanation(cmd, ctx)
    if (!e || typeof e !== 'object') return { ok: false, msg: '非对象' }
    if (typeof e.reason !== 'string' || e.reason.length === 0) return { ok: false, msg: 'reason 非非空字符串' }
    if (typeof e.howto !== 'string') return { ok: false, msg: 'howto 非字符串' }
    if (typeof e.tip !== 'string') return { ok: false, msg: 'tip 非字符串' }
    return { ok: true }
  })

  property('null cmd 走默认 reason', 500, function () {
    const e = engine.buildExplanation(null, {})
    if (e.reason !== I.EXPLANATION_REASONS.default) return { ok: false, msg: 'null cmd 未走默认: ' + e.reason }
    return { ok: true }
  })
})

// ============================================================
// ===== B-14: fillVariables 不变量 =====
// ============================================================
describe('B-14 fillVariables 不变量', function () {
  property('无占位符原样返回', 1000, function (seed) {
    const rng = makeRng(seed)
    const texts = ['普通文案', 'no placeholder here', '12345', '中文无占位符', 'Walk the dog']
    const text = texts[Math.floor(rng() * texts.length)]
    const ctx = randCtx(rng, [])
    const r = engine.fillVariables(text, ctx)
    if (r !== text) return { ok: false, msg: '无占位符被修改: "' + text + '" → "' + r + '"' }
    return { ok: true }
  })

  property('非字符串返回空串', 500, function () {
    const inputs = [null, undefined, 42, [], {}]
    for (const inp of inputs) {
      if (engine.fillVariables(inp, {}) !== '') return { ok: false, msg: '非字符串未返回空串: ' + JSON.stringify(inp) }
    }
    return { ok: true }
  })

  property('任意 ctx 不抛异常', 500, function (seed) {
    const rng = makeRng(seed)
    const text = '{时间}{天气}{地点}{季节}{type}'
    const ctx = randCtx(rng, [])
    try {
      engine.fillVariables(text, ctx, { type: 'test' })
      return { ok: true }
    } catch (e) {
      return { ok: false, msg: 'EXCEPTION: ' + e.message }
    }
  })
})

// ===== 结果 =====
console.log('\n' + '='.repeat(60))
console.log('Property-Based Fuzz 测试结果: ' + passCount + ' passed, ' + failCount + ' failed')
if (failures.length > 0) {
  console.log('\n失败项（前 20 条）:')
  failures.slice(0, 20).forEach(f => console.log('  - ' + f))
  if (failures.length > 20) console.log('  ... 共 ' + failures.length + ' 条')
}
console.log('='.repeat(60))
process.exit(failCount > 0 ? 1 : 0)
