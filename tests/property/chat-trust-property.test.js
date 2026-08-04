// tests/property/chat-trust-property.test.js
// C-P4 社交增强 Property-Based Fuzz 测试
// 运行: node tests/property/chat-trust-property.test.js
//
// 设计思路：
//   - 自实现种子化 PRNG（mulberry32），失败时打印种子便于复现
//   - 每条性质跑 N 次，任何一次违反即失败
//   - 覆盖 trust-score（computeTrustScore/tierFromScore/getTierWeight 不变式）
//     与 chat-store（dedupMessages/validateContent/save+load 往返 不变式）

'use strict'

var wx = require('../mock-wx.js')
global.wx = wx

var trustScore = require('../../packageSync/utils/trust-score.js')
var chatStore = require('../../packageSync/utils/chat-store.js')

// ===== 种子化 PRNG（mulberry32）=====
function makeRng(seed) {
  var s = seed >>> 0
  return function () {
    s = (s + 0x6D2B79F5) >>> 0
    var t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function randInt(rng, min, max) {
  return Math.floor(rng() * (max - min + 1)) + min
}
function randChoice(rng, arr) {
  return arr[Math.floor(rng() * arr.length)]
}

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

function recordPass() { passCount++ }
function recordFail(msg) {
  failCount++
  var where = groups.length ? groups.join(' > ') : '(root)'
  failures.push(where + ': ' + msg)
}

function property(name, iterations, prop) {
  groups.push(name)
  var localFail = 0
  for (var i = 0; i < iterations; i++) {
    var seed = 0xC0FFEE + i
    var result
    try {
      result = prop(seed)
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
    console.log('  \u2713 ' + name + ' (' + iterations + ' 次)')
  } else {
    console.log('  \u2717 ' + name + ' (' + localFail + '/' + iterations + ' 次失败)')
  }
  groups.pop()
}

// ============================================================
// ===== trust-score 不变式 =====
// ============================================================
describe('trust-score computeTrustScore 不变式', function () {
  property('score 始终在 [1,5] 且保留一位小数', 500, function (seed) {
    var rng = makeRng(seed)
    var n = randInt(rng, 0, 30)
    var reviews = []
    for (var i = 0; i < n; i++) {
      reviews.push({ rating: randInt(rng, 1, 5) })
    }
    var r = trustScore.computeTrustScore(reviews)
    if (!r || typeof r.score !== 'number') return { ok: false, msg: 'score 非数字' }
    if (r.score < 1 || r.score > 5) return { ok: false, msg: 'score=' + r.score + ' 越界 [1,5]' }
    // 保留一位小数：score*10 应为整数
    if (Math.round(r.score * 10) !== r.score * 10) return { ok: false, msg: 'score 未保留一位小数: ' + r.score }
    return { ok: true }
  })

  property('count 始终等于 reviews.length（含非法评价）', 500, function (seed) {
    var rng = makeRng(seed)
    var n = randInt(rng, 0, 20)
    var reviews = []
    for (var i = 0; i < n; i++) {
      // 随机注入非法 rating
      if (rng() < 0.3) reviews.push({ rating: randChoice(rng, [null, 'x', 0, 6, 3.5, undefined, NaN]) })
      else reviews.push({ rating: randInt(rng, 1, 5) })
    }
    var r = trustScore.computeTrustScore(reviews)
    if (!r) return { ok: false, msg: '返回 null' }
    if (r.count !== n) return { ok: false, msg: 'count=' + r.count + ' 期望 ' + n }
    return { ok: true }
  })

  property('tier 属于已知 5 集合且 label 与 tier 对应', 500, function (seed) {
    var rng = makeRng(seed)
    var n = randInt(rng, 0, 30)
    var reviews = []
    for (var i = 0; i < n; i++) reviews.push({ rating: randInt(rng, 1, 5) })
    var r = trustScore.computeTrustScore(reviews)
    var validTiers = ['newbie', 'gold', 'reliable', 'normal', 'watch']
    if (validTiers.indexOf(r.tier) < 0) return { ok: false, msg: '未知 tier=' + r.tier }
    if (r.label !== trustScore.TIER_LABELS[r.tier]) return { ok: false, msg: 'tier=' + r.tier + ' label=' + r.label + ' 不匹配' }
    return { ok: true }
  })

  property('非数组输入返回默认新手（count 0）', 500, function (seed) {
    var rng = makeRng(seed)
    var input = randChoice(rng, [null, undefined, 'abc', 123, {}, true, 0])
    var r = trustScore.computeTrustScore(input)
    if (!r) return { ok: false, msg: '返回 null' }
    if (r.tier !== 'newbie' || r.score !== 5.0 || r.count !== 0) {
      return { ok: false, msg: '非数组应返回默认新手: ' + JSON.stringify(r) }
    }
    return { ok: true }
  })

  property('空数组返回默认新手（count 0）', 100, function () {
    var r = trustScore.computeTrustScore([])
    if (!r || r.tier !== 'newbie' || r.score !== 5.0 || r.count !== 0) {
      return { ok: false, msg: '空数组应返回默认新手: ' + JSON.stringify(r) }
    }
    return { ok: true }
  })

  property('全 5 分 ≥10 条必为 gold', 200, function (seed) {
    var rng = makeRng(seed)
    var n = randInt(rng, 10, 50)
    var reviews = []
    for (var i = 0; i < n; i++) reviews.push({ rating: 5 })
    var r = trustScore.computeTrustScore(reviews)
    if (r.tier !== 'gold') return { ok: false, msg: '全5分 ' + n + ' 条 tier=' + r.tier + ' 应为 gold' }
    if (r.score !== 5.0) return { ok: false, msg: 'score=' + r.score }
    return { ok: true }
  })

  property('computeTrustScore 幂等（同输入两次结果相等）', 300, function (seed) {
    var rng = makeRng(seed)
    var n = randInt(rng, 0, 15)
    var reviews = []
    for (var i = 0; i < n; i++) reviews.push({ rating: randInt(rng, 1, 5) })
    var a = trustScore.computeTrustScore(reviews)
    var b = trustScore.computeTrustScore(reviews)
    if (a.score !== b.score || a.tier !== b.tier || a.count !== b.count) {
      return { ok: false, msg: '不幂等' }
    }
    return { ok: true }
  })
})

describe('trust-score tierFromScore / getTierWeight 不变式', function () {
  property('tierFromScore 返回已知 tier', 500, function (seed) {
    var rng = makeRng(seed)
    var score = +(rng() * 5).toFixed(1) + 0 // 0.0~5.0
    if (score < 0) score = 0
    var count = randInt(rng, 0, 50)
    var tier = trustScore.tierFromScore(score, count)
    var validTiers = ['newbie', 'gold', 'reliable', 'normal', 'watch']
    if (validTiers.indexOf(tier) < 0) return { ok: false, msg: '未知 tier=' + tier }
    return { ok: true }
  })

  property('getTierWeight 已知 tier 返回正数 weight', 500, function (seed) {
    var rng = makeRng(seed)
    var tier = randChoice(rng, ['gold', 'reliable', 'normal', 'newbie', 'watch'])
    var w = trustScore.getTierWeight(tier)
    if (typeof w !== 'number' || w <= 0 || !Number.isFinite(w)) return { ok: false, msg: 'weight=' + w }
    return { ok: true }
  })

  property('getTierWeight 未知 tier 返回 1.0', 300, function (seed) {
    var rng = makeRng(seed)
    var tier = 'tier_' + randInt(rng, 0, 9999)
    var w = trustScore.getTierWeight(tier)
    if (w !== 1.0) return { ok: false, msg: '未知 tier weight=' + w + ' 应为 1.0' }
    return { ok: true }
  })

  property('gold 权重 > watch 权重', 100, function () {
    var g = trustScore.getTierWeight('gold')
    var w = trustScore.getTierWeight('watch')
    if (g <= w) return { ok: false, msg: 'gold=' + g + ' watch=' + w }
    return { ok: true }
  })
})

// ============================================================
// ===== chat-store 不变式 =====
// ============================================================
describe('chat-store validateContent 不变式', function () {
  property('超长内容被拒（>200 字）', 300, function (seed) {
    var rng = makeRng(seed)
    var len = randInt(rng, 201, 500)
    var content = 'a'.repeat(len)
    var r = chatStore.validateContent(content)
    if (r.valid) return { ok: false, msg: 'len=' + len + ' 应被拒' }
    if (r.errCode !== 'INVALID_PARAM') return { ok: false, msg: 'errCode=' + r.errCode }
    return { ok: true }
  })

  property('1-200 字非空内容通过', 500, function (seed) {
    var rng = makeRng(seed)
    var len = randInt(rng, 1, 200)
    var content = '测'.repeat(len)
    var r = chatStore.validateContent(content)
    if (!r.valid) return { ok: false, msg: 'len=' + len + ' 应通过 errCode=' + r.errCode }
    if (r.content.length !== len) return { ok: false, msg: '内容长度被改变' }
    return { ok: true }
  })

  property('非字符串输入被拒', 300, function (seed) {
    var rng = makeRng(seed)
    var input = randChoice(rng, [null, undefined, 123, [], {}, true])
    var r = chatStore.validateContent(input)
    if (r.valid) return { ok: false, msg: '非字符串应被拒' }
    return { ok: true }
  })

  property('纯空白被拒', 200, function (seed) {
    var rng = makeRng(seed)
    var content = ' '.repeat(randInt(rng, 1, 50))
    var r = chatStore.validateContent(content)
    if (r.valid) return { ok: false, msg: '纯空白应被拒' }
    return { ok: true }
  })
})

describe('chat-store dedupMessages 不变式', function () {
  function randMsg(rng, idPool) {
    return {
      _id: randChoice(rng, idPool),
      roomId: 'r',
      content: 'c' + randInt(rng, 0, 99),
      createdAt: randInt(rng, 1, 100000),
      senderOpenId: 'u' + randInt(rng, 0, 5)
    }
  }

  property('结果无重复 _id', 500, function (seed) {
    var rng = makeRng(seed)
    var ids = ['a', 'b', 'c', 'd', 'e', 'f', 'g']
    var existing = []
    for (var i = 0; i < randInt(rng, 0, 8); i++) existing.push(randMsg(rng, ids))
    var incoming = []
    for (var j = 0; j < randInt(rng, 0, 8); j++) incoming.push(randMsg(rng, ids))
    var merged = chatStore.dedupMessages(existing, incoming)
    var seen = {}
    for (var k = 0; k < merged.length; k++) {
      if (merged[k]._id && seen[merged[k]._id]) return { ok: false, msg: '重复 _id=' + merged[k]._id }
      seen[merged[k]._id] = true
    }
    return { ok: true }
  })

  property('结果按 createdAt 升序', 500, function (seed) {
    var rng = makeRng(seed)
    var ids = ['a', 'b', 'c', 'd']
    var existing = []
    for (var i = 0; i < randInt(rng, 0, 6); i++) existing.push(randMsg(rng, ids))
    var incoming = []
    for (var j = 0; j < randInt(rng, 0, 6); j++) incoming.push(randMsg(rng, ids))
    var merged = chatStore.dedupMessages(existing, incoming)
    for (var k = 1; k < merged.length; k++) {
      var prev = typeof merged[k - 1].createdAt === 'number' ? merged[k - 1].createdAt : Number.MAX_SAFE_INTEGER
      var cur = typeof merged[k].createdAt === 'number' ? merged[k].createdAt : Number.MAX_SAFE_INTEGER
      if (prev > cur) return { ok: false, msg: '未升序: ' + prev + ' > ' + cur }
    }
    return { ok: true }
  })

  property('结果长度 ≤ existing.length + incoming.length', 500, function (seed) {
    var rng = makeRng(seed)
    var ids = ['a', 'b', 'c']
    var existing = []
    for (var i = 0; i < randInt(rng, 0, 6); i++) existing.push(randMsg(rng, ids))
    var incoming = []
    for (var j = 0; j < randInt(rng, 0, 6); j++) incoming.push(randMsg(rng, ids))
    var merged = chatStore.dedupMessages(existing, incoming)
    if (merged.length > existing.length + incoming.length) {
      return { ok: false, msg: 'merged=' + merged.length + ' > ' + (existing.length + incoming.length) }
    }
    return { ok: true }
  })

  property('乐观消息被同 tempKey 真实消息替换', 300, function (seed) {
    var rng = makeRng(seed)
    var tk = 'local_' + seed
    var existing = [{ _id: tk, tempKey: tk, roomId: 'r', content: 'c', createdAt: 100, isLocal: true, status: 'pending', senderOpenId: 'me' }]
    var realId = 'real_' + seed
    var incoming = [{ _id: realId, roomId: 'r', content: 'c', createdAt: 100, senderOpenId: 'me', replaceKey: tk }]
    var merged = chatStore.dedupMessages(existing, incoming)
    var ids = merged.map(function (x) { return x._id })
    if (ids.indexOf(tk) !== -1) return { ok: false, msg: '乐观消息未被删除' }
    if (ids.indexOf(realId) === -1) return { ok: false, msg: '真实消息未保留' }
    return { ok: true }
  })
})

describe('chat-store save/load 往返不变式', function () {
  property('save 后 load 返回相同消息（仅安全字段）', 300, function (seed) {
    wx._reset()
    var rng = makeRng(seed)
    var roomId = 'room_' + seed
    var msgs = []
    for (var i = 0; i < randInt(rng, 1, 10); i++) {
      msgs.push({
        _id: 'm' + i + '_' + seed,
        tempKey: 'tk' + i,
        roomId: roomId,
        content: 'c' + i,
        createdAt: randInt(rng, 1, 100000),
        senderOpenId: 'u' + randInt(rng, 0, 3),
        senderNickname: 'n' + i,
        isLocal: rng() < 0.5,
        status: 'sent'
      })
    }
    chatStore.saveMessages(roomId, msgs)
    var loaded = chatStore.loadMessages(roomId)
    if (loaded.length !== msgs.length) return { ok: false, msg: '长度不等 ' + loaded.length + ' vs ' + msgs.length }
    // 按 _id 校验内容
    var byId = {}
    loaded.forEach(function (m) { byId[m._id] = m })
    for (var j = 0; j < msgs.length; j++) {
      var got = byId[msgs[j]._id]
      if (!got) return { ok: false, msg: '丢失 _id=' + msgs[j]._id }
      if (got.content !== msgs[j].content) return { ok: false, msg: 'content 不一致' }
      if (got.tempKey !== msgs[j].tempKey) return { ok: false, msg: 'tempKey 丢失' }
    }
    return { ok: true }
  })

  property('loadMessages 非法 roomId 返回空数组', 200, function (seed) {
    var rng = makeRng(seed)
    var bad = randChoice(rng, ['', null, undefined, 123, [], {}])
    var r = chatStore.loadMessages(bad)
    if (!Array.isArray(r) || r.length !== 0) return { ok: false, msg: '应返回空数组' }
    return { ok: true }
  })
})

// ============================================================
// ===== 最终结果 =====
// ============================================================
console.log('\n' + '='.repeat(60))
console.log('chat-trust Property Fuzz 总结果: ' + passCount + ' passed, ' + failCount + ' failed')
if (failures.length > 0) {
  console.log('\n失败项:')
  failures.forEach(function (f) { console.log('  - ' + f) })
}
console.log('='.repeat(60))
process.exit(failCount > 0 ? 1 : 0)
