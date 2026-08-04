// tests/unit/player-trust-store.test.js
// 单元测试：player-trust-store.js (C-P4 玩家信任数据层)
// 运行: node tests/unit/player-trust-store.test.js
//
// 覆盖：buildReviewDoc / getCachedTrust / setCachedTrust / clearTrustCache /
//       submitReview / getTrust / getTrustBatch / reportPlayer（含降级）

'use strict'

var assert = require('assert')
var wx = require('../mock-wx.js')
global.wx = wx

var store = require('../../packageSync/utils/player-trust-store.js')

// ===== 测试框架（顺序执行 + 每个 test 内部 setup/teardown，确保异步隔离）=====

var passed = 0
var failed = 0
var failures = []
var testQueue = []   // { name, fn }：先收集，再顺序执行

function setup() {
  wx._reset()
  store.clearTrustCache()
}

function teardown() {
  wx._reset()
  store.clearTrustCache()
}

function test(name, fn) {
  testQueue.push({ name: name, fn: fn })
}

// 顺序执行所有测试（异步测试串行，避免 wx 存储互相干扰）
function runAll(done) {
  function next(i) {
    if (i >= testQueue.length) {
      done()
      return
    }
    var t = testQueue[i]
    setup()
    var ret
    try {
      ret = t.fn()
    } catch (e) {
      failed++
      failures.push(t.name + ' -> ' + e.message)
      console.log('  \u2717 ' + t.name + '\n      ' + (e.message || e))
      teardown()
      next(i + 1)
      return
    }
    if (ret && typeof ret.then === 'function') {
      ret.then(function () {
        passed++
        console.log('  \u2713 ' + t.name)
        teardown()
        next(i + 1)
      }).catch(function (e) {
        failed++
        failures.push(t.name + ' -> ' + (e.message || e))
        console.log('  \u2717 ' + t.name + '\n      ' + (e.message || e))
        teardown()
        next(i + 1)
      })
    } else {
      passed++
      console.log('  \u2713 ' + t.name)
      teardown()
      next(i + 1)
    }
  }
  next(0)
}

function section(name) {
  console.log('\n--- ' + name + ' ---')
}

function eq(actual, expected, msg) {
  assert.strictEqual(actual, expected, msg)
}
function ok(actual, msg) {
  assert.ok(actual, msg)
}
function deepEq(actual, expected, msg) {
  assert.deepStrictEqual(actual, expected, msg)
}

// ===== 辅助构造器 =====

function mkCtx(overrides) {
  return Object.assign({ cloudReady: true, callFunction: function () {} }, overrides || {})
}

// 构造成功返回的云调用 mock
function successCallFunction(result) {
  return function () {
    return Promise.resolve({ result: result })
  }
}

// 构造抛异常的云调用 mock
function rejectCallFunction(err) {
  return function () {
    return Promise.reject(err || new Error('cloud error'))
  }
}

// ===== 测试用例 =====

console.log('=== player-trust-store.js 单元测试 ===')

// --- buildReviewDoc（纯函数）---
section('buildReviewDoc')

test('buildReviewDoc 正常构造', function () {
  var doc = store.buildReviewDoc(
    { openId: ' u1 ', roomId: ' r1 ', taskId: ' t1 ', roomMembers: ['u1', 'u2'], roomStatus: 'finished' },
    { rating: 5, comment: ' 很准时 ', tags: ['准时', '友善'] }
  )
  eq(doc.targetOpenId, 'u1')   // trim
  eq(doc.roomId, 'r1')
  eq(doc.taskId, 't1')
  deepEq(doc.roomMembers, ['u1', 'u2'])
  eq(doc.roomStatus, 'finished')
  eq(doc.rating, 5)
  eq(doc.comment, '很准时')    // trim
  deepEq(doc.tags, ['准时', '友善'])
})

test('buildReviewDoc 缺失字段用默认值', function () {
  var doc = store.buildReviewDoc({}, {})
  eq(doc.targetOpenId, '')
  eq(doc.roomId, '')
  eq(doc.taskId, '')
  deepEq(doc.roomMembers, [])
  eq(doc.roomStatus, '')
  eq(doc.comment, '')
  deepEq(doc.tags, [])
})

test('buildReviewDoc tags 截断到 5 个', function () {
  var doc = store.buildReviewDoc(
    { openId: 'u1' },
    { rating: 5, tags: ['a', 'b', 'c', 'd', 'e', 'f', 'g'] }
  )
  eq(doc.tags.length, 5)
})

test('buildReviewDoc comment 截断到 100 字', function () {
  var longComment = new Array(120).join('字')
  var doc = store.buildReviewDoc({ openId: 'u1' }, { rating: 5, comment: longComment })
  eq(doc.comment.length, 100)
})

test('buildReviewDoc 非字符串 comment 安全处理', function () {
  var doc = store.buildReviewDoc({ openId: 'u1' }, { rating: 5, comment: null })
  eq(doc.comment, '')
})

// --- 本地缓存 ---
section('getCachedTrust / setCachedTrust / clearTrustCache')

test('空缓存 getCachedTrust 返回 null', function () {
  eq(store.getCachedTrust('u1'), null)
})

test('setCachedTrust 后 getCachedTrust 命中', function () {
  store.setCachedTrust('u1', { score: 4.5, count: 3, label: '靠谱', tier: 'reliable' })
  var t = store.getCachedTrust('u1')
  eq(t.score, 4.5)
  eq(t.count, 3)
  eq(t.label, '靠谱')
  eq(t.tier, 'reliable')
})

test('clearTrustCache 后缓存清空', function () {
  store.setCachedTrust('u1', { score: 4.5, count: 3, label: '靠谱', tier: 'reliable' })
  store.clearTrustCache()
  eq(store.getCachedTrust('u1'), null)
})

test('非法 openId getCachedTrust 返回 null', function () {
  eq(store.getCachedTrust(''), null)
  eq(store.getCachedTrust(null), null)
  eq(store.getCachedTrust(123), null)
})

test('非法 trust setCachedTrust 不写入', function () {
  store.setCachedTrust('u1', null)
  eq(store.getCachedTrust('u1'), null)
  store.setCachedTrust('u1', 'invalid')
  eq(store.getCachedTrust('u1'), null)
})

test('多玩家缓存互不干扰', function () {
  store.setCachedTrust('u1', { score: 5.0, count: 10, label: '金牌搭子', tier: 'gold' })
  store.setCachedTrust('u2', { score: 2.0, count: 3, label: '待观察', tier: 'watch' })
  eq(store.getCachedTrust('u1').tier, 'gold')
  eq(store.getCachedTrust('u2').tier, 'watch')
})

// --- submitReview（异步 + 降级）---
section('submitReview')

test('submitReview 云端不可用 → CLOUD_OFFLINE + 默认信任分', function () {
  var ctx = { cloudReady: false }
  return store.submitReview(
    { openId: 'u2', roomId: 'r1', roomMembers: ['u1', 'u2'], roomStatus: 'finished' },
    { rating: 5 },
    ctx
  ).then(function (res) {
    eq(res.ok, false)
    eq(res.errCode, 'CLOUD_OFFLINE')
    ok(res.trust, '应返回默认信任分')
    eq(res.trust.tier, 'newbie')
  })
})

test('submitReview 成功 → ok=true + trust 缓存', function () {
  var ctx = mkCtx({
    callFunction: successCallFunction({
      ok: true,
      trust: { score: 4.5, count: 3, label: '靠谱', tier: 'reliable' }
    })
  })
  return store.submitReview(
    { openId: 'u2', roomId: 'r1', roomMembers: ['u1', 'u2'], roomStatus: 'finished' },
    { rating: 5, comment: '不错', tags: ['准时'] },
    ctx
  ).then(function (res) {
    eq(res.ok, true)
    eq(res.trust.tier, 'reliable')
    // 验证缓存已写入
    var cached = store.getCachedTrust('u2')
    eq(cached.tier, 'reliable')
  })
})

test('submitReview 防重复 → ALREADY_REVIEWED', function () {
  var ctx = mkCtx({
    callFunction: successCallFunction({
      ok: false,
      errCode: 'ALREADY_REVIEWED',
      errMsg: '已评价过该搭子'
    })
  })
  return store.submitReview(
    { openId: 'u2', roomId: 'r1', roomMembers: ['u1', 'u2'], roomStatus: 'finished' },
    { rating: 5 },
    ctx
  ).then(function (res) {
    eq(res.ok, false)
    eq(res.errCode, 'ALREADY_REVIEWED')
  })
})

test('submitReview 云端抛异常 → CLOUD_ERROR + 默认信任分', function () {
  var ctx = mkCtx({
    callFunction: rejectCallFunction(new Error('network'))
  })
  return store.submitReview(
    { openId: 'u2', roomId: 'r1', roomMembers: ['u1', 'u2'], roomStatus: 'finished' },
    { rating: 5 },
    ctx
  ).then(function (res) {
    eq(res.ok, false)
    eq(res.errCode, 'CLOUD_ERROR')
    ok(res.trust)
    eq(res.trust.tier, 'newbie')
  })
})

test('submitReview callFunction 非函数 → 降级', function () {
  var ctx = { cloudReady: true, callFunction: null }
  return store.submitReview(
    { openId: 'u2', roomId: 'r1', roomMembers: ['u1', 'u2'], roomStatus: 'finished' },
    { rating: 5 },
    ctx
  ).then(function (res) {
    eq(res.ok, false)
    eq(res.errCode, 'CLOUD_OFFLINE')
  })
})

// --- getTrust（异步 + 降级）---
section('getTrust')

test('getTrust 空 openId → 默认 newbie', function () {
  return store.getTrust('', { cloudReady: true }).then(function (trust) {
    eq(trust.tier, 'newbie')
    eq(trust.score, 5.0)
  })
})

test('getTrust 云端不可用 → 读缓存', function () {
  // 先写缓存
  store.setCachedTrust('u1', { score: 4.8, count: 10, label: '金牌搭子', tier: 'gold' })
  return store.getTrust('u1', { cloudReady: false }).then(function (trust) {
    eq(trust.tier, 'gold')
    eq(trust.score, 4.8)
  })
})

test('getTrust 云端不可用且无缓存 → 默认 newbie', function () {
  return store.getTrust('u_unknown', { cloudReady: false }).then(function (trust) {
    eq(trust.tier, 'newbie')
    eq(trust.score, 5.0)
  })
})

test('getTrust 成功返回云端信任分', function () {
  var ctx = mkCtx({
    callFunction: successCallFunction({
      ok: true,
      trusts: { u1: { score: 4.5, count: 3, label: '靠谱', tier: 'reliable' } }
    })
  })
  return store.getTrust('u1', ctx).then(function (trust) {
    eq(trust.tier, 'reliable')
    eq(trust.score, 4.5)
    // 验证缓存
    eq(store.getCachedTrust('u1').tier, 'reliable')
  })
})

test('getTrust 云端成功但不含该 openId → 默认 newbie', function () {
  // 云端返回了其他用户但不含 u_unknown，getTrust 应返回 DEFAULT_TRUST
  var ctx = mkCtx({
    callFunction: successCallFunction({
      ok: true,
      trusts: { u_other: { score: 4.5, count: 3, label: '靠谱', tier: 'reliable' } }
    })
  })
  return store.getTrust('u_unknown', ctx).then(function (trust) {
    eq(trust.tier, 'newbie')
    eq(trust.score, 5.0)
  })
})

// --- getTrustBatch（异步 + 降级）---
section('getTrustBatch')

test('getTrustBatch 空数组 → 空对象', function () {
  return store.getTrustBatch([], { cloudReady: true }).then(function (res) {
    deepEq(res, {})
  })
})

test('getTrustBatch 非数组 → 空对象', function () {
  return store.getTrustBatch(null, { cloudReady: true }).then(function (res) {
    deepEq(res, {})
  })
})

test('getTrustBatch 云端不可用 → 缓存 + 默认值', function () {
  store.setCachedTrust('u1', { score: 5.0, count: 10, label: '金牌搭子', tier: 'gold' })
  return store.getTrustBatch(['u1', 'u2'], { cloudReady: false }).then(function (res) {
    eq(res.u1.tier, 'gold')   // 缓存命中
    eq(res.u2.tier, 'newbie') // 未命中 → 默认
  })
})

test('getTrustBatch 成功 → 批量返回 + 缓存', function () {
  var ctx = mkCtx({
    callFunction: successCallFunction({
      ok: true,
      trusts: {
        u1: { score: 4.5, count: 3, label: '靠谱', tier: 'reliable' },
        u2: { score: 2.0, count: 3, label: '待观察', tier: 'watch' }
      }
    })
  })
  return store.getTrustBatch(['u1', 'u2'], ctx).then(function (res) {
    eq(res.u1.tier, 'reliable')
    eq(res.u2.tier, 'watch')
    // 验证缓存
    eq(store.getCachedTrust('u1').tier, 'reliable')
    eq(store.getCachedTrust('u2').tier, 'watch')
  })
})

test('getTrustBatch 云端返回部分 → 补默认值', function () {
  var ctx = mkCtx({
    callFunction: successCallFunction({
      ok: true,
      trusts: { u1: { score: 5.0, count: 10, label: '金牌搭子', tier: 'gold' } }
      // u2 未返回
    })
  })
  return store.getTrustBatch(['u1', 'u2'], ctx).then(function (res) {
    eq(res.u1.tier, 'gold')
    eq(res.u2.tier, 'newbie') // 补默认
  })
})

test('getTrustBatch 云端未返回但本地有缓存 → 用缓存值', function () {
  // u2 本地已有 gold 缓存，云端不返回 u2 → 应返回缓存值而非默认 newbie
  store.setCachedTrust('u2', { score: 4.8, count: 10, label: '金牌搭子', tier: 'gold' })
  var ctx = mkCtx({
    callFunction: successCallFunction({
      ok: true,
      trusts: { u1: { score: 4.5, count: 3, label: '靠谱', tier: 'reliable' } }
      // u2 未返回
    })
  })
  return store.getTrustBatch(['u1', 'u2'], ctx).then(function (res) {
    eq(res.u1.tier, 'reliable')
    eq(res.u2.tier, 'gold') // 缓存命中，非默认
    eq(res.u2.score, 4.8)
  })
})

test('getTrustBatch 截断到 20 个', function () {
  var callCount = 0
  var ctx = mkCtx({
    callFunction: function (opts) {
      callCount++
      var trusts = {}
      var openIds = opts.data.openIds
      for (var i = 0; i < openIds.length; i++) {
        trusts[openIds[i]] = { score: 5.0, count: 1, label: '新手', tier: 'newbie' }
      }
      return Promise.resolve({ result: { ok: true, trusts: trusts } })
    }
  })
  var ids = []
  for (var i = 0; i < 25; i++) ids.push('u' + i)
  return store.getTrustBatch(ids, ctx).then(function (res) {
    eq(callCount, 1)
    // 只查了 20 个
    var keys = Object.keys(res)
    eq(keys.length, 20)
  })
})

test('getTrustBatch 去重 openId', function () {
  var ctx = mkCtx({
    callFunction: successCallFunction({
      ok: true,
      trusts: { u1: { score: 5.0, count: 10, label: '金牌搭子', tier: 'gold' } }
    })
  })
  return store.getTrustBatch(['u1', 'u1', 'u1'], ctx).then(function (res) {
    var keys = Object.keys(res)
    eq(keys.length, 1)
    eq(res.u1.tier, 'gold')
  })
})

test('getTrustBatch 过滤非法 openId', function () {
  var ctx = mkCtx({
    callFunction: successCallFunction({ ok: true, trusts: {} })
  })
  return store.getTrustBatch(['', null, 123, 'u1'], ctx).then(function (res) {
    var keys = Object.keys(res)
    eq(keys.length, 1)
    ok(keys.indexOf('u1') !== -1)
  })
})

test('getTrustBatch 云端异常 → 全默认值', function () {
  var ctx = mkCtx({
    callFunction: rejectCallFunction(new Error('cloud down'))
  })
  return store.getTrustBatch(['u1', 'u2'], ctx).then(function (res) {
    eq(res.u1.tier, 'newbie')
    eq(res.u2.tier, 'newbie')
  })
})

// --- reportPlayer（异步 + 降级）---
section('reportPlayer')

test('reportPlayer 空 openId → INVALID_PARAM', function () {
  return store.reportPlayer({ openId: '' }, '迟到', { cloudReady: true }).then(function (res) {
    eq(res.ok, false)
    eq(res.errCode, 'INVALID_PARAM')
  })
})

test('reportPlayer 云端不可用 → CLOUD_OFFLINE', function () {
  return store.reportPlayer({ openId: 'u2', roomId: 'r1' }, '迟到', { cloudReady: false }).then(function (res) {
    eq(res.ok, false)
    eq(res.errCode, 'CLOUD_OFFLINE')
  })
})

test('reportPlayer 成功 → ok=true + flagged', function () {
  var ctx = mkCtx({
    callFunction: successCallFunction({ ok: true, flagged: true })
  })
  return store.reportPlayer({ openId: 'u2', roomId: 'r1' }, '骚扰', ctx).then(function (res) {
    eq(res.ok, true)
    eq(res.flagged, true)
  })
})

test('reportPlayer 未达阈值 → flagged=false', function () {
  var ctx = mkCtx({
    callFunction: successCallFunction({ ok: true, flagged: false })
  })
  return store.reportPlayer({ openId: 'u2', roomId: 'r1' }, '迟到', ctx).then(function (res) {
    eq(res.ok, true)
    eq(res.flagged, false)
  })
})

test('reportPlayer 防重复 → ALREADY_REPORTED', function () {
  var ctx = mkCtx({
    callFunction: successCallFunction({
      ok: false,
      errCode: 'ALREADY_REPORTED',
      errMsg: '已举报过该搭子'
    })
  })
  return store.reportPlayer({ openId: 'u2', roomId: 'r1' }, '迟到', ctx).then(function (res) {
    eq(res.ok, false)
    eq(res.errCode, 'ALREADY_REPORTED')
  })
})

test('reportPlayer 云端异常 → CLOUD_ERROR', function () {
  var ctx = mkCtx({
    callFunction: rejectCallFunction(new Error('network'))
  })
  return store.reportPlayer({ openId: 'u2', roomId: 'r1' }, '迟到', ctx).then(function (res) {
    eq(res.ok, false)
    eq(res.errCode, 'CLOUD_ERROR')
  })
})

// ===== 主流程：顺序执行所有测试后输出结果 =====

runAll(function () {
  console.log('\n' + '='.repeat(50))
  console.log('player-trust-store.test.js 结果:')
  console.log('  通过: ' + passed)
  console.log('  失败: ' + failed)
  if (failed > 0) {
    console.log('\n  失败用例:')
    for (var i = 0; i < failures.length; i++) {
      console.log('    - ' + failures[i])
    }
  }
  console.log('='.repeat(50))
  process.exit(failed > 0 ? 1 : 0)
})
