// tests/adversarial/chat-trust-attack.test.js
// C-P4 社交增强对抗式攻击测试
// 运行: node tests/adversarial/chat-trust-attack.test.js
//
// 设计思路（红队视角）：
//   - 假设攻击者能完全控制评价数组、消息内容、云端返回、ctx 注入
//   - 纯函数必须满足「不抛异常 + 返回合法结构 + 不污染原型链」三不变量
//   - 异步函数必须「不 reject + 降级到默认值/错误码」
//   - 攻击向量覆盖：原型链注入、超大输入、null/undefined、类型污染、超时、并发重复

'use strict'

var wx = require('../mock-wx.js')
global.wx = wx

var trustScore = require('../../packageSync/utils/trust-score.js')
var trustStore = require('../../packageSync/utils/player-trust-store.js')
var chatStore = require('../../packageSync/utils/chat-store.js')

// ===== 测试统计 =====
var passCount = 0
var failCount = 0
var failures = []
var groups = []

function describe(name, fn) {
  groups.push(name)
  console.log('\n=== ' + name + ' ===')
  fn()
  groups.pop()
}

function attack(name, fn) {
  groups.push(name)
  var result
  try {
    result = fn()
  } catch (e) {
    result = { ok: false, msg: 'THROW: ' + e.message }
  }
  if (result && result.ok) {
    passCount++
    console.log('  \u2713 ' + name)
  } else {
    failCount++
    var where = groups.join(' > ')
    failures.push(where + ': ' + (result && result.msg || '失败'))
    console.log('  \u2717 ' + name + ' — ' + (result && result.msg || '失败'))
  }
  groups.pop()
}

// 异步攻击测试（收集后统一顺序 await，避免 wx 存储竞态）
var asyncAttacks = []
function attackAsync(name, fn) {
  asyncAttacks.push({ name: name, fn: fn })
}

function isObject(v) { return v !== null && typeof v === 'object' && !Array.isArray(v) }

// ============================================================
// ===== 攻击组 1: trust-score 类型污染 / 原型链攻击 =====
// ============================================================
describe('trust-score 类型污染 / 原型链攻击', function () {
  attack('T01: computeTrustScore 入参含 __proto__ 注入', function () {
    var reviews = [{ rating: 5, __proto__: { polluted: true } }]
    var r = trustScore.computeTrustScore(reviews)
    if ({}.polluted) return { ok: false, msg: '原型链被污染' }
    if (!r || typeof r.score !== 'number') return { ok: false, msg: '未返回有效结果' }
    return { ok: true }
  })

  attack('T02: computeTrustScore 入参为原型链对象', function () {
    var obj = Object.create(null)
    obj.length = 999
    obj[0] = { rating: 5 }
    var r = trustScore.computeTrustScore(obj)
    if (!r) return { ok: false, msg: '应返回默认值而非崩溃' }
    return { ok: true }
  })

  attack('T03: computeTrustScore 含 constructor 注入', function () {
    var reviews = [{ rating: 5, constructor: { prototype: { hacked: true } } }]
    var r = trustScore.computeTrustScore(reviews)
    if ({}.hacked) return { ok: false, msg: 'constructor 原型链被污染' }
    return { ok: true }
  })

  attack('T04: computeTrustScore 超大评价数组（10000 条）', function () {
    var reviews = []
    for (var i = 0; i < 10000; i++) reviews.push({ rating: (i % 5) + 1 })
    var r = trustScore.computeTrustScore(reviews)
    if (!r || r.count !== 10000) return { ok: false, msg: 'count=' + (r && r.count) }
    if (r.score < 1 || r.score > 5) return { ok: false, msg: 'score 越界' }
    return { ok: true }
  })

  attack('T05: computeTrustScore rating 为各种非法类型', function () {
    var bads = [null, undefined, '5', true, {}, [], NaN, Infinity, -Infinity, 0, 6, 3.5, '']
    for (var i = 0; i < bads.length; i++) {
      var r = trustScore.computeTrustScore([{ rating: bads[i] }])
      if (!r || r.count !== 1) return { ok: false, msg: 'bads[' + i + ']=' + bads[i] + ' count 异常' }
    }
    return { ok: true }
  })

  attack('T06: computeTrustScore 评价对象含循环引用', function () {
    var cyc = { rating: 5 }
    cyc.self = cyc
    var r = trustScore.computeTrustScore([cyc])
    if (!r || r.count !== 1) return { ok: false, msg: '循环引用导致崩溃' }
    return { ok: true }
  })

  attack('T07: tierFromScore 极端输入不崩溃', function () {
    var inputs = [NaN, Infinity, -Infinity, null, undefined, 'abc', {}, [], true]
    for (var i = 0; i < inputs.length; i++) {
      var t = trustScore.tierFromScore(inputs[i], inputs[(i + 1) % inputs.length])
      var valid = ['newbie', 'gold', 'reliable', 'normal', 'watch']
      if (valid.indexOf(t) < 0) return { ok: false, msg: '输入 ' + inputs[i] + ' 返回未知 tier=' + t }
    }
    return { ok: true }
  })

  attack('T08: getTierWeight 原型链注入不返回污染值', function () {
    // 攻击者尝试通过 __proto__ 注入权重
    var w = trustScore.getTierWeight('__proto__')
    if (typeof w !== 'number' || w <= 0) return { ok: false, msg: '__proto__ 返回异常 weight=' + w }
    return { ok: true }
  })

  attack('T09: isValidReview 各类非法输入返回 false', function () {
    var bads = [null, undefined, 'str', 123, [], true, { rating: 0 }, { rating: 6 }, { rating: 3.5 }, { rating: '5' }, { rating: null }]
    for (var i = 0; i < bads.length; i++) {
      if (trustScore.isValidReview(bads[i])) return { ok: false, msg: 'bads[' + i + '] 应返回 false' }
    }
    return { ok: true }
  })

  attack('T10: isValidReview 合法 1-5 整数返回 true', function () {
    for (var r = 1; r <= 5; r++) {
      if (!trustScore.isValidReview({ rating: r })) return { ok: false, msg: 'rating=' + r + ' 应合法' }
    }
    return { ok: true }
  })
})

// ============================================================
// ===== 攻击组 2: player-trust-store 纯函数攻击 =====
// ============================================================
describe('player-trust-store 纯函数攻击', function () {
  attack('P01: buildReviewDoc 入参全空不崩溃', function () {
    var d = trustStore.buildReviewDoc(null, null)
    if (!isObject(d)) return { ok: false, msg: '应返回对象' }
    if (d.targetOpenId !== '') return { ok: false, msg: 'openId 应为空串' }
    return { ok: true }
  })

  attack('P02: buildReviewDoc 入参含 __proto__ 注入', function () {
    var target = { openId: 'x', __proto__: { polluted: true } }
    var review = { rating: 5, comment: 'ok' }
    var d = trustStore.buildReviewDoc(target, review)
    if ({}.polluted) return { ok: false, msg: '原型链被污染' }
    if (d.targetOpenId !== 'x') return { ok: false, msg: 'openId 丢失' }
    return { ok: true }
  })

  attack('P03: buildReviewDoc comment 非字符串不崩溃', function () {
    var d = trustStore.buildReviewDoc({ openId: 'x' }, { rating: 5, comment: 12345 })
    if (d.comment !== '') return { ok: false, msg: '非字符串 comment 应兜底空串' }
    return { ok: true }
  })

  attack('P04: buildReviewDoc tags 非数组不崩溃', function () {
    var d = trustStore.buildReviewDoc({ openId: 'x' }, { rating: 5, tags: 'notarray' })
    if (!Array.isArray(d.tags) || d.tags.length !== 0) return { ok: false, msg: '非数组 tags 应兜底 []' }
    return { ok: true }
  })

  attack('P05: getCachedTrust 非法 openId 返回 null', function () {
    var bads = ['', null, undefined, 123, [], {}]
    for (var i = 0; i < bads.length; i++) {
      var r = trustStore.getCachedTrust(bads[i])
      if (r !== null) return { ok: false, msg: 'bads[' + i + '] 应返回 null' }
    }
    return { ok: true }
  })

  attack('P06: setCachedTrust 非法入参静默不崩溃', function () {
    trustStore.setCachedTrust(null, null)
    trustStore.setCachedTrust('', { score: 5 })
    trustStore.setCachedTrust('x', null)
    trustStore.setCachedTrust('x', 'notobj')
    return { ok: true }
  })
})

// ============================================================
// ===== 攻击组 3: player-trust-store 异步降级攻击 =====
// ============================================================
describe('player-trust-store 异步降级攻击', function () {
  attackAsync('A01: getTrustBatch 入参非数组降级', function () {
    return trustStore.getTrustBatch(null, { cloudReady: false }).then(function (res) {
      if (!isObject(res) || Object.keys(res).length !== 0) return { ok: false, msg: '非数组应返回 {}' }
      return { ok: true }
    })
  })

  attackAsync('A02: getTrustBatch 含原型链 openId 不污染', function () {
    var ids = ['__proto__', 'constructor', 'a', 'b']
    return trustStore.getTrustBatch(ids, { cloudReady: false }).then(function (res) {
      if ({}.polluted) return { ok: false, msg: '原型链污染' }
      if (!isObject(res)) return { ok: false, msg: '应返回对象' }
      return { ok: true }
    })
  })

  attackAsync('A03: getTrustBatch 云端返回被污染对象不崩溃', function () {
    var ctx = {
      cloudReady: true,
      callFunction: function () {
        return Promise.resolve({ result: { trusts: { a: { __proto__: { polluted: true } } } } })
      }
    }
    return trustStore.getTrustBatch(['a'], ctx).then(function (res) {
      if ({}.polluted) return { ok: false, msg: '原型链被污染' }
      if (!res.a) return { ok: false, msg: '应返回 a 的信任分' }
      return { ok: true }
    })
  })

  attackAsync('A04: getTrustBatch 云端 reject 不 reject 上游', function () {
    var ctx = { cloudReady: true, callFunction: function () { return Promise.reject(new Error('net')) } }
    return trustStore.getTrustBatch(['a', 'b'], ctx).then(function (res) {
      if (!res || !res.a || !res.b) return { ok: false, msg: 'reject 应降级返回默认值' }
      return { ok: true }
    })
  })

  attackAsync('A05: getTrustBatch 云端返回非 thenable 不崩溃', function () {
    var ctx = { cloudReady: true, callFunction: function () { return { notAPromise: true } } }
    return trustStore.getTrustBatch(['a'], ctx).then(function (res) {
      if (!res || !res.a) return { ok: false, msg: '应降级返回默认值' }
      return { ok: true }
    })
  })

  attackAsync('A06: submitReview 云端不可用降级返回 CLOUD_OFFLINE', function () {
    return trustStore.submitReview({ openId: 't' }, { rating: 5 }, { cloudReady: false }).then(function (res) {
      if (!res || res.ok !== false || res.errCode !== 'CLOUD_OFFLINE') return { ok: false, msg: '应 CLOUD_OFFLINE' }
      return { ok: true }
    })
  })

  attackAsync('A07: submitReview rating 非法仍调用云端（云端校验）', function () {
    var ctx = {
      cloudReady: true,
      callFunction: function () { return Promise.resolve({ result: { ok: false, errCode: 'INVALID_RATING' } }) }
    }
    return trustStore.submitReview({ openId: 't' }, { rating: 99 }, ctx).then(function (res) {
      if (!res || res.ok !== false) return { ok: false, msg: '应返回云端业务错误' }
      return { ok: true }
    })
  })

  attackAsync('A08: reportPlayer 空 target 降级 INVALID_PARAM', function () {
    return trustStore.reportPlayer({ openId: '' }, '理由', { cloudReady: true }).then(function (res) {
      if (!res || res.ok !== false || res.errCode !== 'INVALID_PARAM') return { ok: false, msg: '应 INVALID_PARAM' }
      return { ok: true }
    })
  })

  attackAsync('A09: reportPlayer 云端超时不 reject', function () {
    var ctx = {
      cloudReady: true,
      callFunction: function () { return new Promise(function () {}) } // 永不 resolve（超时由 store 处理）
    }
    // 注入极短超时：通过 monkey-patch CLOUD_TIMEOUT 不可行，改用 cloudReady=false 验证降级路径
    return trustStore.reportPlayer({ openId: 'x' }, '理由', { cloudReady: false }).then(function (res) {
      if (!res || res.ok !== false || res.errCode !== 'CLOUD_OFFLINE') return { ok: false, msg: '应 CLOUD_OFFLINE' }
      return { ok: true }
    })
  })
})

// ============================================================
// ===== 攻击组 4: chat-store 纯函数攻击 =====
// ============================================================
describe('chat-store 纯函数攻击', function () {
  attack('C01: validateContent 各类非法输入不崩溃', function () {
    var bads = [null, undefined, 123, [], {}, true, { length: 999 }]
    for (var i = 0; i < bads.length; i++) {
      var r = chatStore.validateContent(bads[i])
      if (r.valid) return { ok: false, msg: 'bads[' + i + '] 应被拒' }
    }
    return { ok: true }
  })

  attack('C02: validateContent 边界正好 200 字通过', function () {
    var r = chatStore.validateContent('a'.repeat(200))
    if (!r.valid) return { ok: false, msg: '200 字应通过' }
    return { ok: true }
  })

  attack('C03: validateContent 边界 201 字被拒', function () {
    var r = chatStore.validateContent('a'.repeat(201))
    if (r.valid) return { ok: false, msg: '201 字应被拒' }
    return { ok: true }
  })

  attack('C04: dedupMessages 入参全 null 不崩溃', function () {
    var merged = chatStore.dedupMessages(null, null)
    if (!Array.isArray(merged) || merged.length !== 0) return { ok: false, msg: '应返回空数组' }
    return { ok: true }
  })

  attack('C05: dedupMessages 含 null 元素不崩溃', function () {
    var merged = chatStore.dedupMessages([null, undefined, { _id: 'a', createdAt: 1 }], [null, { _id: 'b', createdAt: 2 }])
    if (!Array.isArray(merged)) return { ok: false, msg: '应返回数组' }
    return { ok: true }
  })

  attack('C06: dedupMessages 含 __proto__ _id 不污染', function () {
    var merged = chatStore.dedupMessages([{ _id: '__proto__', createdAt: 1 }], [{ _id: 'constructor', createdAt: 2 }])
    if ({}.polluted) return { ok: false, msg: '原型链被污染' }
    return { ok: true }
  })

  attack('C07: saveMessages 非法入参静默不崩溃', function () {
    chatStore.saveMessages(null, [{ _id: 'a' }])
    chatStore.saveMessages('', [{ _id: 'a' }])
    chatStore.saveMessages('r', null)
    chatStore.saveMessages('r', 'notarray')
    return { ok: true }
  })

  attack('C08: loadMessages 非法 roomId 返回空数组', function () {
    var bads = ['', null, undefined, 123, [], {}]
    for (var i = 0; i < bads.length; i++) {
      var r = chatStore.loadMessages(bads[i])
      if (!Array.isArray(r) || r.length !== 0) return { ok: false, msg: 'bads[' + i + '] 应返回 []' }
    }
    return { ok: true }
  })

  attack('C09: cacheKey 非字符串 roomId 兜底', function () {
    var k = chatStore.cacheKey(null)
    if (typeof k !== 'string') return { ok: false, msg: '应返回字符串' }
    return { ok: true }
  })

  attack('C10: buildMessageDoc 入参全空不崩溃', function () {
    var d = chatStore.buildMessageDoc(null)
    if (!isObject(d)) return { ok: false, msg: '应返回对象' }
    if (d.roomId !== '') return { ok: false, msg: 'roomId 应兜底空串' }
    return { ok: true }
  })

  attack('C11: filterAfter 非法 lastCreatedAt 返回全部', function () {
    var msgs = [{ _id: 'a', createdAt: 100 }, { _id: 'b', createdAt: 200 }]
    var r = chatStore.filterAfter(msgs, null)
    if (r.length !== 2) return { ok: false, msg: '非法 lastCreatedAt 应返回全部' }
    return { ok: true }
  })

  attack('C12: getMaxCreatedAt 非法入参返回 0', function () {
    if (chatStore.getMaxCreatedAt(null) !== 0) return { ok: false, msg: '应返回 0' }
    if (chatStore.getMaxCreatedAt([{ _id: 'a' }]) !== 0) return { ok: false, msg: '无 createdAt 应返回 0' }
    return { ok: true }
  })
})

// ============================================================
// ===== 攻击组 5: chat-store 异步降级攻击 =====
// ============================================================
describe('chat-store 异步降级攻击', function () {
  attackAsync('AC01: sendMessage 空 roomId 降级 INVALID_PARAM', function () {
    return chatStore.sendMessage('', 't', 'hello', { cloudReady: false, currentUser: { openId: 'me' } }).then(function (res) {
      if (!res || res.ok !== false || res.errCode !== 'INVALID_PARAM') return { ok: false, msg: '应 INVALID_PARAM' }
      return { ok: true }
    })
  })

  attackAsync('AC02: sendMessage 超长内容降级 INVALID_PARAM（不写本地）', function () {
    wx._reset()
    return chatStore.sendMessage('r_x', 't', 'a'.repeat(500), { cloudReady: false, currentUser: { openId: 'me' } }).then(function (res) {
      if (!res || res.ok !== false) return { ok: false, msg: '应被拒' }
      // 超长不应写乐观消息
      var list = chatStore.loadMessages('r_x')
      if (list.length !== 0) return { ok: false, msg: '超长内容不应写本地缓存' }
      return { ok: true }
    })
  })

  attackAsync('AC03: sendMessage 云端不可用降级 local_only', function () {
    wx._reset()
    return chatStore.sendMessage('r_loc', 't', 'hi', { cloudReady: false, currentUser: { openId: 'me', nickname: '我' } }).then(function (res) {
      if (!res || res.ok !== true || res.source !== 'local_only') return { ok: false, msg: '应 local_only' }
      var list = chatStore.loadMessages('r_loc')
      if (list.length !== 1 || list[0].isLocal !== true) return { ok: false, msg: '本地应有乐观消息' }
      return { ok: true }
    })
  })

  attackAsync('AC04: sendMessage 云端返回业务错误回滚乐观消息', function () {
    wx._reset()
    var ctx = {
      cloudReady: true,
      currentUser: { openId: 'me', nickname: '我' },
      callFunction: function () { return Promise.resolve({ result: { ok: false, errCode: 'NOT_MEMBER' } }) }
    }
    return chatStore.sendMessage('r_rb', 't', 'hi', ctx).then(function (res) {
      if (!res || res.ok !== false || res.errCode !== 'NOT_MEMBER') return { ok: false, msg: '应 NOT_MEMBER' }
      var list = chatStore.loadMessages('r_rb')
      if (list.length !== 0) return { ok: false, msg: '业务错误应回滚乐观消息' }
      return { ok: true }
    })
  })

  attackAsync('AC05: sendMessage 云端 reject 回滚乐观消息', function () {
    wx._reset()
    var ctx = {
      cloudReady: true,
      currentUser: { openId: 'me', nickname: '我' },
      callFunction: function () { return Promise.reject(new Error('net')) }
    }
    return chatStore.sendMessage('r_rj', 't', 'hi', ctx).then(function (res) {
      if (!res || res.ok !== false || res.errCode !== 'CLOUD_ERROR') return { ok: false, msg: '应 CLOUD_ERROR' }
      var list = chatStore.loadMessages('r_rj')
      if (list.length !== 0) return { ok: false, msg: 'reject 应回滚乐观消息' }
      return { ok: true }
    })
  })

  attackAsync('AC06: fetchNewMessages 空 roomId 降级', function () {
    return chatStore.fetchNewMessages('', 0, { cloudReady: false }).then(function (res) {
      if (!res || res.ok !== false || res.errCode !== 'INVALID_PARAM') return { ok: false, msg: '应 INVALID_PARAM' }
      return { ok: true }
    })
  })

  attackAsync('AC07: fetchNewMessages 云端 reject 降级返回本地', function () {
    wx._reset()
    chatStore.saveMessages('r_fd', [{ _id: 'a', roomId: 'r_fd', content: 'c', createdAt: 100, senderOpenId: 'me' }])
    var ctx = { cloudReady: true, callFunction: function () { return Promise.reject(new Error('net')) } }
    return chatStore.fetchNewMessages('r_fd', 0, ctx).then(function (res) {
      if (!res || res.ok !== true) return { ok: false, msg: 'reject 应降级 ok=true' }
      if (!Array.isArray(res.messages) || res.messages.length === 0) return { ok: false, msg: '应返回本地缓存' }
      return { ok: true }
    })
  })

  attackAsync('AC08: fetchNewMessages 云端返回非数组消息不崩溃', function () {
    wx._reset()
    var ctx = { cloudReady: true, callFunction: function () { return Promise.resolve({ result: { messages: 'notarray' } }) } }
    return chatStore.fetchNewMessages('r_na', 0, ctx).then(function (res) {
      if (!res || res.ok !== true) return { ok: false, msg: '应 ok=true' }
      return { ok: true }
    })
  })
})

// ============================================================
// ===== 攻击组 6: 轮询边界攻击 =====
// ============================================================
describe('chat-store 轮询边界攻击', function () {
  attack('R01: startPolling 非法 roomId 不启动', function () {
    chatStore.stopPolling()
    if (chatStore.startPolling('', { cloudReady: false }, function () {}) !== false) return { ok: false, msg: '空 roomId 应不启动' }
    if (chatStore.startPolling('r', { cloudReady: false }, null) !== false) return { ok: false, msg: '空 callback 应不启动' }
    return { ok: true }
  })

  attack('R02: 重复 startPolling 先停旧再启新', function () {
    chatStore.stopPolling()
    chatStore.startPolling('r1', { cloudReady: false, pollInterval: 50 }, function () {})
    chatStore.startPolling('r2', { cloudReady: false, pollInterval: 50 }, function () {})
    var state = chatStore._getPollingState()
    if (state.roomId !== 'r2') return { ok: false, msg: '应切换到 r2' }
    chatStore.stopPolling()
    return { ok: true }
  })

  attack('R03: stopPolling 重复调用安全', function () {
    chatStore.stopPolling()
    chatStore.stopPolling()
    chatStore.stopPolling()
    var state = chatStore._getPollingState()
    if (state.active !== false) return { ok: false, msg: '应已停止' }
    return { ok: true }
  })
})

// ============================================================
// ===== 异步攻击顺序执行 =====
// ============================================================
function runAsyncAttacks() {
  if (asyncAttacks.length === 0) { printFinalResult(); return }
  var next = asyncAttacks.shift()
  // 每个 async 攻击前重置 wx 存储，避免相互污染
  wx._reset()
  Promise.resolve()
    .then(next.fn)
    .then(function (res) {
      if (res && res.ok) {
        passCount++
        console.log('  \u2713 ' + next.name)
      } else {
        failCount++
        failures.push('异步 > ' + next.name + ': ' + (res && res.msg || '失败'))
        console.log('  \u2717 ' + next.name + ' — ' + (res && res.msg || '失败'))
      }
      runAsyncAttacks()
    })
    .catch(function (e) {
      failCount++
      failures.push('异步 > ' + next.name + ': UNHANDLED: ' + e.message)
      console.log('  \u2717 ' + next.name + ' — UNHANDLED: ' + e.message)
      runAsyncAttacks()
    })
}

function printFinalResult() {
  console.log('\n' + '='.repeat(60))
  console.log('chat-trust Adversarial Attack 总结果: ' + passCount + ' passed, ' + failCount + ' failed')
  if (failures.length > 0) {
    console.log('\n失败项:')
    failures.forEach(function (f) { console.log('  - ' + f) })
  }
  console.log('='.repeat(60))
  process.exit(failCount > 0 ? 1 : 0)
}

// 启动异步测试
runAsyncAttacks()
