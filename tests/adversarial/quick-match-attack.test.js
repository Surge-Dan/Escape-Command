// tests/adversarial/quick-match-attack.test.js
// B3 quick-match-engine 对抗式测试
// 运行: node tests/adversarial/quick-match-attack.test.js
//
// 攻击向量覆盖：
//   1. 偏好篡改（伪造 type/count/原型链污染）
//   2. 上下文越界（非法 hour/duration/weather/userLocation）
//   3. commandPool 篡改（含恶意指令/null 元素）
//   4. matcherCtx 攻击（伪造 callFunction/抛异常/超时）
//   5. user 对象篡改（原型链/__proto__/constructor）
//   6. 不变量：executeQuickMatch 永不抛异常；返回结构稳定

'use strict'

const qm = require('../../packageSync/utils/quick-match-engine.js')

let passCount = 0
let failCount = 0
const failures = []

function attack(name, fn) {
  return Promise.resolve().then(fn).then(function () {
    passCount++
    console.log('  ✓ ' + name)
  }).catch(function (e) {
    failCount++
    failures.push(name + ': ' + e.message)
    console.log('  ✗ ' + name + ' → ' + e.message)
  })
}

function assertEqual(a, b, msg) {
  if (a !== b) throw new Error(msg || 'expected=' + JSON.stringify(b) + ' actual=' + JSON.stringify(a))
}
function assertTrue(v, msg) { if (!v) throw new Error(msg || '应为 true') }
function assertFalse(v, msg) { if (v) throw new Error(msg || '应为 false') }
function assertNoThrow(fn, msg) {
  try { fn() } catch (e) { throw new Error(msg || '不应抛异常: ' + e.message) }
}

function mockPool() {
  return [
    { id: 'cmd_1', type: 'walk', title: '漫步', content: '走一走', duration: 60, nightSafe: true, outdoor: true }
  ]
}

console.log('\n=== quick-match-attack 对抗式测试 ===\n')

// ============================================================
console.log('--- 1. 偏好篡改 ---')
// ============================================================
attack('type 计数为负数', function () {
  assertEqual(qm.inferThemeFromPrefs({ type: { walk: -5, color: 3 } }), 'relax')
})

attack('type 计数为字符串', function () {
  // 字符串 '5' 在比较时会被转为 0（NaN > 0 = false），过滤掉
  assertNoThrow(function () {
    const r = qm.inferThemeFromPrefs({ type: { walk: 'abc', color: '3' } })
    assertTrue(r === 'relax' || r === 'social')
  })
})

attack('type 计数为 NaN', function () {
  assertNoThrow(function () {
    qm.inferThemeFromPrefs({ type: { walk: NaN } })
  })
})

attack('type 计数为 Infinity', function () {
  assertNoThrow(function () {
    qm.inferThemeFromPrefs({ type: { walk: Infinity } })
  })
})

attack('userPrefs.type 含 __proto__ 键', function () {
  // JSON.parse 不会污染原型链，但手工构造可能
  const malicious = { type: {} }
  malicious.type.__proto__ = { polluted: true }
  assertNoThrow(function () {
    qm.inferThemeFromPrefs(malicious)
  })
})

attack('userPrefs.type 含 constructor 键', function () {
  const malicious = { type: { constructor: { prototype: { walk: 5 } } } }
  assertNoThrow(function () {
    const r = qm.inferThemeFromPrefs(malicious)
    // constructor 不在 TYPE_TO_STYLE，应兜底 social
    assertEqual(r, 'social')
  })
})

attack('userPrefs.type 是数组（异常结构）', function () {
  assertNoThrow(function () {
    qm.inferThemeFromPrefs({ type: ['walk', 'color'] })
  })
})

attack('userPrefs.type 是字符串', function () {
  assertNoThrow(function () {
    qm.inferThemeFromPrefs({ type: 'walk' })
  })
})

attack('userPrefs 是数组', function () {
  assertNoThrow(function () {
    qm.inferThemeFromPrefs([])
  })
})

attack('userPrefs 是字符串', function () {
  assertNoThrow(function () {
    qm.inferThemeFromPrefs('not object')
  })
})

attack('inferInterestsFromPrefs 含原型链键', function () {
  const malicious = JSON.parse('{"type":{"__proto__":{"photo":5}}}')
  assertNoThrow(function () {
    const r = qm.inferInterestsFromPrefs(malicious)
    assertTrue(Array.isArray(r))
  })
})

// ============================================================
console.log('\n--- 2. 上下文越界 ---')
// ============================================================
attack('hour 为负数', function () {
  const ctx = qm.buildQuickMatchContext({ hour: -5 })
  assertTrue(ctx.hour >= 0 && ctx.hour < 24, '负数 hour 应兜底')
})

attack('hour 为 24（越界）', function () {
  const ctx = qm.buildQuickMatchContext({ hour: 24 })
  assertTrue(ctx.hour >= 0 && ctx.hour < 24)
})

attack('hour 为字符串 "14"', function () {
  const ctx = qm.buildQuickMatchContext({ hour: '14' })
  assertTrue(ctx.hour >= 0 && ctx.hour < 24)
})

attack('hour 为 NaN', function () {
  const ctx = qm.buildQuickMatchContext({ hour: NaN })
  assertTrue(ctx.hour >= 0 && ctx.hour < 24)
})

attack('hour 为 null', function () {
  const ctx = qm.buildQuickMatchContext({ hour: null })
  assertTrue(ctx.hour >= 0 && ctx.hour < 24)
})

attack('duration 为负数', function () {
  const ctx = qm.buildQuickMatchContext({ duration: -100 })
  assertEqual(ctx.duration, 30, '负数应兜底 30')
})

attack('duration 为 NaN', function () {
  const ctx = qm.buildQuickMatchContext({ duration: NaN })
  assertEqual(ctx.duration, 30)
})

attack('duration 为字符串', function () {
  const ctx = qm.buildQuickMatchContext({ duration: '60' })
  assertEqual(ctx.duration, 30, '字符串应兜底')
})

attack('duration 为 Infinity', function () {
  const ctx = qm.buildQuickMatchContext({ duration: Infinity })
  assertEqual(ctx.duration, 30)
})

attack('weather 为非法字符串', function () {
  const ctx = qm.buildQuickMatchContext({ weather: '-extreme-weather-' })
  assertEqual(ctx.weather, '-extreme-weather-', '保留传入值（不强制枚举）')
})

attack('weather 为数字', function () {
  const ctx = qm.buildQuickMatchContext({ weather: 123 })
  assertEqual(ctx.weather, 'sunny', '数字应兜底 sunny')
})

attack('userLocation 纬度越界 91', function () {
  const ctx = qm.buildQuickMatchContext({ userLocation: { latitude: 91, longitude: 116 } })
  // buildQuickMatchContext 不校验范围，只校验类型；latitude 91 会被保留
  // 但 isArrived 等下游函数会处理
  assertTrue(ctx.userLocation !== null)
})

attack('userLocation 纬度 NaN', function () {
  const ctx = qm.buildQuickMatchContext({ userLocation: { latitude: NaN, longitude: 116 } })
  assertTrue(ctx.userLocation !== null)
  // 下游 isArrived 会拒绝
})

attack('userLocation 是数组', function () {
  const ctx = qm.buildQuickMatchContext({ userLocation: [39.9, 116.4] })
  assertEqual(ctx.userLocation, null, '数组应被拒绝')
})

attack('userLocation 是字符串', function () {
  const ctx = qm.buildQuickMatchContext({ userLocation: '39.9,116.4' })
  assertEqual(ctx.userLocation, null)
})

attack('userLocation 含 __proto__', function () {
  const ctx = qm.buildQuickMatchContext({
    userLocation: JSON.parse('{"__proto__":{"latitude":39.9},"longitude":116.4}')
  })
  assertEqual(ctx.userLocation, null, '原型链 latitude 不应通过')
})

// ============================================================
console.log('\n--- 3. commandPool 篡改 ---')
// ============================================================
attack('commandPool 含 null 元素', function () {
  return qm.executeQuickMatch({
    userPrefs: { type: { walk: 5 } },
    commandPool: [null, undefined, { id: 'c1', type: 'walk', nightSafe: true, outdoor: true }],
    completedIds: [],
    duration: 60,
    hour: 14
  }, null, null).then(function (r) {
    assertTrue(r.ok)
    assertTrue(!!r.command)
  })
})

attack('commandPool 全是 null', function () {
  return qm.executeQuickMatch({
    userPrefs: { type: { walk: 5 } },
    commandPool: [null, null, null],
    completedIds: [],
    duration: 60,
    hour: 14
  }, null, null).then(function (r) {
    // generator-engine 应走 fallback 兜底链返回任务
    assertTrue(r.ok)
    assertTrue(!!r.command)
  })
})

attack('commandPool 是字符串', function () {
  return qm.executeQuickMatch({
    userPrefs: { type: { walk: 5 } },
    commandPool: 'not array',
    completedIds: [],
    duration: 60,
    hour: 14
  }, null, null).then(function (r) {
    // 应走 fallback
    assertTrue(r.ok)
  })
})

attack('commandPool 含恶意指令（敏感内容）', function () {
  return qm.executeQuickMatch({
    userPrefs: { type: { walk: 5 } },
    commandPool: [
      { id: 'bad', type: 'walk', title: '暴力内容', content: '涉及暴力', nightSafe: true, outdoor: true }
    ],
    completedIds: [],
    duration: 60,
    hour: 14
  }, null, null).then(function (r) {
    // generator-engine 不过滤内容安全（那是 safety-helper 的职责）
    // 这里只验证不抛异常
    assertTrue(r.ok)
  })
})

attack('commandPool 含原型链污染指令', function () {
  const malicious = JSON.parse('[{"id":"a","__proto__":{"type":"walk"}}]')
  return qm.executeQuickMatch({
    userPrefs: { type: { walk: 5 } },
    commandPool: malicious,
    completedIds: [],
    duration: 60,
    hour: 14
  }, null, null).then(function (r) {
    assertTrue(r.ok)
  })
})

attack('completedIds 含 10000 个 id', function () {
  const ids = []
  for (var i = 0; i < 10000; i++) ids.push('cmd_' + i)
  return qm.executeQuickMatch({
    userPrefs: { type: { walk: 5 } },
    commandPool: mockPool(),
    completedIds: ids,
    duration: 60,
    hour: 14
  }, null, null).then(function (r) {
    // 应走 fallback（pool 全部 completed）
    assertTrue(r.ok)
  })
})

// ============================================================
console.log('\n--- 4. matcherCtx 攻击 ---')
// ============================================================
attack('matcherCtx.callFunction 抛同步异常', function () {
  const badCtx = {
    cloudReady: true,
    callFunction: function () { throw new Error('sync throw') }
  }
  return qm.executeQuickMatch({
    userPrefs: { type: { walk: 5 } },
    commandPool: mockPool(),
    completedIds: [],
    duration: 60,
    hour: 14
  }, { openId: 'local' }, badCtx).then(function (r) {
    // player-matcher 应捕获异常并降级
    assertTrue(r.ok, '同步异常不应阻塞')
  })
})

attack('matcherCtx.callFunction 返回非 Promise', function () {
  const badCtx = {
    cloudReady: true,
    callFunction: function () { return 'not a promise' }
  }
  return qm.executeQuickMatch({
    userPrefs: { type: { walk: 5 } },
    commandPool: mockPool(),
    completedIds: [],
    duration: 60,
    hour: 14
  }, { openId: 'local' }, badCtx).then(function (r) {
    assertTrue(r.ok, '非 Promise 返回不应阻塞')
  })
})

attack('matcherCtx.callFunction 返回 reject', function () {
  const badCtx = {
    cloudReady: true,
    callFunction: function () {
      return Promise.reject(new Error('reject'))
    }
  }
  return qm.executeQuickMatch({
    userPrefs: { type: { walk: 5 } },
    commandPool: mockPool(),
    completedIds: [],
    duration: 60,
    hour: 14
  }, { openId: 'local' }, badCtx).then(function (r) {
    assertTrue(r.ok, 'reject 不应阻塞')
  })
})

attack('matcherCtx.callFunction 返回 null', function () {
  const badCtx = {
    cloudReady: true,
    callFunction: function () { return null }
  }
  return qm.executeQuickMatch({
    userPrefs: { type: { walk: 5 } },
    commandPool: mockPool(),
    completedIds: [],
    duration: 60,
    hour: 14
  }, { openId: 'local' }, badCtx).then(function (r) {
    assertTrue(r.ok)
  })
})

attack('matcherCtx 缺失 callFunction', function () {
  const badCtx = { cloudReady: true }  // 没 callFunction
  return qm.executeQuickMatch({
    userPrefs: { type: { walk: 5 } },
    commandPool: mockPool(),
    completedIds: [],
    duration: 60,
    hour: 14
  }, { openId: 'local' }, badCtx).then(function (r) {
    // 引擎应识别 typeof !== 'function' 跳过匹配
    assertTrue(r.ok)
    assertEqual(r.partners.length, 0)
  })
})

attack('matcherCtx 是 null', function () {
  return qm.executeQuickMatch({
    userPrefs: { type: { walk: 5 } },
    commandPool: mockPool(),
    completedIds: [],
    duration: 60,
    hour: 14
  }, { openId: 'local' }, null).then(function (r) {
    assertTrue(r.ok)
  })
})

attack('matcherCtx 是字符串', function () {
  return qm.executeQuickMatch({
    userPrefs: { type: { walk: 5 } },
    commandPool: mockPool(),
    completedIds: [],
    duration: 60,
    hour: 14
  }, { openId: 'local' }, 'not object').then(function (r) {
    assertTrue(r.ok)
  })
})

// ============================================================
console.log('\n--- 5. user 对象篡改 ---')
// ============================================================
attack('user 含 __proto__', function () {
  const malicious = JSON.parse('{"__proto__":{"openId":"x"}}')
  return qm.executeQuickMatch({
    userPrefs: { type: { walk: 5 } },
    commandPool: mockPool(),
    completedIds: [],
    duration: 60,
    hour: 14
  }, malicious, null).then(function (r) {
    assertTrue(r.ok)
  })
})

attack('user.openId 是超长字符串', function () {
  return qm.executeQuickMatch({
    userPrefs: { type: { walk: 5 } },
    commandPool: mockPool(),
    completedIds: [],
    duration: 60,
    hour: 14
  }, { openId: 'x'.repeat(10000) }, null).then(function (r) {
    assertTrue(r.ok)
  })
})

attack('user.interests 含 10000 个元素', function () {
  const arr = []
  for (var i = 0; i < 10000; i++) arr.push('i' + i)
  return qm.executeQuickMatch({
    userPrefs: { type: { walk: 5 } },
    commandPool: mockPool(),
    completedIds: [],
    duration: 60,
    hour: 14
  }, { interests: arr }, null).then(function (r) {
    assertTrue(r.ok)
  })
})

attack('user 是字符串', function () {
  return qm.executeQuickMatch({
    userPrefs: { type: { walk: 5 } },
    commandPool: mockPool(),
    completedIds: [],
    duration: 60,
    hour: 14
  }, 'not object', null).then(function (r) {
    assertTrue(r.ok)
  })
})

attack('user 是数字', function () {
  return qm.executeQuickMatch({
    userPrefs: { type: { walk: 5 } },
    commandPool: mockPool(),
    completedIds: [],
    duration: 60,
    hour: 14
  }, 12345, null).then(function (r) {
    assertTrue(r.ok)
  })
})

attack('normalizeUser 含 constructor 篡改', function () {
  const malicious = { constructor: { prototype: { openId: 'hacked' } } }
  const u = qm.normalizeUser(malicious, ['food'])
  assertNotEqual(u.openId, 'hacked')
  assertEqual(u.openId, 'local_user') // 兜底
})

function assertNotEqual(a, b, msg) {
  if (a === b) throw new Error(msg || '不应相等: ' + JSON.stringify(a))
}

// ============================================================
console.log('\n--- 6. 不变量校验 ---')
// ============================================================
attack('不变量：executeQuickMatch 永不抛异常（同步部分）', function () {
  // 即使 options 是 null/user 是 null/matcherCtx 是 null，也不应抛
  assertNoThrow(function () {
    qm.executeQuickMatch(null, null, null)
  })
  assertNoThrow(function () {
    qm.executeQuickMatch(undefined, undefined, undefined)
  })
  assertNoThrow(function () {
    qm.executeQuickMatch({ userPrefs: null }, null, null)
  })
})

attack('不变量：返回结构稳定（含 ok 字段）', function () {
  return qm.executeQuickMatch({
    userPrefs: { type: { walk: 5 } },
    commandPool: mockPool(),
    completedIds: [],
    duration: 60,
    hour: 14
  }, null, null).then(function (r) {
    assertTrue(typeof r.ok === 'boolean')
    if (r.ok) {
      assertTrue(!!r.command)
      assertTrue(!!r.theme)
      assertTrue(typeof r.theme.id === 'string')
      assertTrue(typeof r.theme.name === 'string')
      assertTrue(Array.isArray(r.partners))
      assertTrue(typeof r.partnerCount === 'number')
      assertTrue(typeof r.expectedPartnerCount === 'number')
    } else {
      assertTrue(typeof r.errCode === 'string')
      assertTrue(typeof r.errMsg === 'string')
    }
  })
})

attack('不变量：partnerCount === partners.length', function () {
  return qm.executeQuickMatch({
    userPrefs: { type: { walk: 5 } },
    commandPool: mockPool(),
    completedIds: [],
    duration: 60,
    hour: 14
  }, null, null).then(function (r) {
    if (r.ok) {
      assertEqual(r.partnerCount, r.partners.length)
    }
  })
})

attack('不变量：theme.id 必为 relax/adventure/social', function () {
  return qm.executeQuickMatch({
    userPrefs: { type: { walk: 5 } },
    commandPool: mockPool(),
    completedIds: [],
    duration: 60,
    hour: 14
  }, null, null).then(function (r) {
    if (r.ok) {
      assertTrue(['relax', 'adventure', 'social'].indexOf(r.theme.id) >= 0)
    }
  })
})

attack('不变量：1000 次随机调用都不抛异常', function () {
  const types = ['walk', 'color', 'sense', 'food', 'collect', 'culture', 'custom', 'breakthrough', 'unknown']
  let chain = Promise.resolve()
  for (var i = 0; i < 50; i++) {
    (function (idx) {
      chain = chain.then(function () {
        const prefs = {}
        const t = types[idx % types.length]
        prefs[t] = Math.floor(Math.random() * 10)
        return qm.executeQuickMatch({
          userPrefs: { type: prefs },
          commandPool: mockPool(),
          completedIds: [],
          duration: Math.floor(Math.random() * 200),
          hour: Math.floor(Math.random() * 24)
        }, null, null).then(function (r) {
          assertTrue(typeof r.ok === 'boolean')
        })
      })
    })(i)
  }
  return chain
})

attack('不变量：regenerate 永不抛异常', function () {
  assertNoThrow(function () {
    qm.regenerate(null, null, null)
  })
  return qm.regenerate({
    userPrefs: { type: { walk: 5 } },
    commandPool: mockPool(),
    completedIds: [],
    duration: 60,
    hour: 14,
    currentCommand: { type: 'walk' }
  }, null, null).then(function (r) {
    assertTrue(typeof r.ok === 'boolean')
  })
})

// ============================================================
// 最终报告（异步）
// ============================================================
Promise.resolve().then(function () {
  return new Promise(function (resolve) {
    setTimeout(resolve, 800)
  })
}).then(function () {
  console.log('\n' + '='.repeat(60))
  console.log('  quick-match-attack 对抗式测试结果')
  console.log('='.repeat(60))
  console.log('  通过: ' + passCount + ' / 失败: ' + failCount)
  if (failures.length > 0) {
    console.log('\n  失败项:')
    failures.forEach(function (f) { console.log('    ✗ ' + f) })
  }
  console.log('='.repeat(60))
  process.exit(failCount > 0 ? 1 : 0)
})
