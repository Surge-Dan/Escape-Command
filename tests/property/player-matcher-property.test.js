// tests/property/player-matcher-property.test.js
// D5 真实玩家联动 Property-Based Fuzz 测试
// 运行: node tests/property/player-matcher-property.test.js
//
// 设计思路：
//   - 不依赖第三方库，自实现最小伪随机 + 性质断言框架
//   - 每条性质跑 N 次（默认 500），任何一次违反即失败
//   - 种子化 RNG：失败时打印种子便于复现
//   - 覆盖 normalizePlayer/rankByRelevance/mergeAndPick/shouldFallback/computePartnerCount 不变式

'use strict'

var playerMatcher = require('../../utils/player-matcher.js')

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

// ===== 数据生成器 =====
var OPENID_CHARS = 'abcdefghijklmnopqrstuvwxyz0123456789'
var NICKNAME_CHARS = '一二三四五六七八九十甲乙丙丁戊己abcXYZ'
var DISTRICTS = ['天河区', '越秀区', '海珠区', '荔湾区', '白云区', '番禺区', '黄埔区', '花都区', '从化区', '增城区', '南沙区', '', null, undefined]
var INTERESTS_POOL = ['food', 'nature', 'culture', 'sport', 'photo', 'shopping', '', 'unknown', null, 42]

function randInt(rng, min, max) {
  return Math.floor(rng() * (max - min + 1)) + min
}

function randChoice(rng, arr) {
  return arr[Math.floor(rng() * arr.length)]
}

function randString(rng, max) {
  var n = randInt(rng, 0, max)
  var s = ''
  for (var i = 0; i < n; i++) s += randChoice(rng, OPENID_CHARS.split(''))
  return s
}

function randNickname(rng) {
  var n = randInt(rng, 0, 10)
  var s = ''
  for (var i = 0; i < n; i++) s += randChoice(rng, NICKNAME_CHARS.split(''))
  return s
}

// 随机 openId（含异常形态：null/undefined/数字/空字符串）
function randOpenId(rng) {
  var r = rng()
  if (r < 0.05) return null
  if (r < 0.10) return undefined
  if (r < 0.15) return randInt(rng, 0, 999)
  if (r < 0.20) return ''
  return 'oid_' + randString(rng, 8)
}

// 随机 interests 数组（含异常形态）
function randInterests(rng) {
  var r = rng()
  if (r < 0.10) return null
  if (r < 0.20) return undefined
  if (r < 0.30) return 'food'
  var n = randInt(rng, 0, 5)
  var arr = []
  for (var i = 0; i < n; i++) {
    arr.push(randChoice(rng, INTERESTS_POOL))
  }
  return arr
}

// 随机 district（含异常形态）
function randDistrict(rng) {
  return randChoice(rng, DISTRICTS)
}

// 随机玩家档案
function randPlayer(rng) {
  var r = rng()
  // 5% 概率返回 null/undefined（测试 normalizePlayer 的防御性）
  if (r < 0.03) return null
  if (r < 0.06) return undefined
  if (r < 0.10) return randInt(rng, 0, 999)
  if (r < 0.15) return 'string_player'
  return {
    openId: randOpenId(rng),
    nickname: randNickname(rng),
    avatar: rng() < 0.2 ? '' : '/assets/images/avatar.webp',
    interests: randInterests(rng),
    district: randDistrict(rng),
    bio: rng() < 0.3 ? '' : randNickname(rng)
  }
}

// ============================================================
// ===== 性质 1: normalizePlayer 结果结构不变量 =====
// ============================================================
describe('normalizePlayer 不变量', function () {
  property('返回对象含 isReal 布尔值（或 null）', 500, function (seed) {
    var rng = makeRng(seed)
    var raw = randPlayer(rng)
    var source = rng() < 0.5 ? 'cloud' : 'mock'
    var normalized = playerMatcher.normalizePlayer(raw, source)
    if (normalized === null) {
      // null 只在 raw 为 null/undefined/非对象时返回
      return { ok: true }
    }
    if (typeof normalized !== 'object') {
      return { ok: false, msg: 'normalizePlayer 应返回对象或 null，实际返回 ' + typeof normalized }
    }
    if (typeof normalized.isReal !== 'boolean') {
      return { ok: false, msg: 'isReal 应为布尔值，实际为 ' + typeof normalized.isReal }
    }
    return { ok: true }
  })

  property('source=cloud 时 isReal=true，source=mock 时 isReal=false', 500, function (seed) {
    var rng = makeRng(seed)
    var raw = randPlayer(rng)
    // 确保是有效对象
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      return { ok: true } // 跳过无效输入
    }
    var cloudPlayer = playerMatcher.normalizePlayer(raw, 'cloud')
    var mockPlayer = playerMatcher.normalizePlayer(raw, 'mock')
    if (!cloudPlayer || cloudPlayer.isReal !== true) {
      return { ok: false, msg: 'source=cloud 时 isReal 应为 true' }
    }
    if (!mockPlayer || mockPlayer.isReal !== false) {
      return { ok: false, msg: 'source=mock 时 isReal 应为 false' }
    }
    return { ok: true }
  })

  property('interests 始终返回数组（不共享引用）', 500, function (seed) {
    var rng = makeRng(seed)
    var raw = randPlayer(rng)
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      return { ok: true }
    }
    var normalized = playerMatcher.normalizePlayer(raw, 'cloud')
    if (!normalized) return { ok: true }
    if (!Array.isArray(normalized.interests)) {
      return { ok: false, msg: 'interests 应为数组' }
    }
    // 验证不共享引用（修改 normalized.interests 不影响 raw.interests）
    if (Array.isArray(raw.interests) && raw.interests.length > 0) {
      var originalLen = raw.interests.length
      normalized.interests.push('test_hack')
      if (raw.interests.length !== originalLen) {
        return { ok: false, msg: 'interests 数组共享引用' }
      }
    }
    return { ok: true }
  })
})

// ============================================================
// ===== 性质 2: mergeAndPick 不变量 =====
// ============================================================
describe('mergeAndPick 不变量', function () {
  property('返回数组长度不超过 count', 500, function (seed) {
    var rng = makeRng(seed)
    var realN = randInt(rng, 0, 8)
    var mockN = randInt(rng, 0, 8)
    var real = []
    var mock = []
    for (var i = 0; i < realN; i++) {
      var p = randPlayer(rng)
      if (p && typeof p === 'object' && !Array.isArray(p)) {
        real.push(playerMatcher.normalizePlayer(p, 'cloud'))
      }
    }
    for (var j = 0; j < mockN; j++) {
      var mp = randPlayer(rng)
      if (mp && typeof mp === 'object' && !Array.isArray(mp)) {
        mock.push(playerMatcher.normalizePlayer(mp, 'mock'))
      }
    }
    real = real.filter(Boolean)
    mock = mock.filter(Boolean)
    var count = randInt(rng, 0, 10)
    var result = playerMatcher.mergeAndPick(real, mock, count, {
      district: randDistrict(rng),
      interests: [],
      excludeOpenId: ''
    })
    if (!Array.isArray(result)) {
      return { ok: false, msg: '应返回数组' }
    }
    if (result.length > count) {
      return { ok: false, msg: '返回长度 ' + result.length + ' 超过 count ' + count }
    }
    return { ok: true }
  })

  property('返回的搭子中无重复 openId', 500, function (seed) {
    var rng = makeRng(seed)
    var realN = randInt(rng, 0, 6)
    var mockN = randInt(rng, 0, 6)
    var real = []
    var mock = []
    for (var i = 0; i < realN; i++) {
      real.push({
        openId: 'real_' + i,
        nickname: '真实' + i,
        avatar: '', interests: [], district: '', bio: '',
        isReal: true
      })
    }
    for (var j = 0; j < mockN; j++) {
      mock.push({
        openId: 'mock_' + j,
        nickname: 'Mock' + j,
        avatar: '', interests: [], district: '', bio: '',
        isReal: false
      })
    }
    // 随机制造一些重复 openId
    if (real.length > 0 && mock.length > 0 && rng() < 0.5) {
      mock[0].openId = real[0].openId
    }
    var count = randInt(rng, 1, 10)
    var result = playerMatcher.mergeAndPick(real, mock, count, {
      district: '', interests: [], excludeOpenId: ''
    })
    var seen = {}
    for (var k = 0; k < result.length; k++) {
      if (result[k].openId && seen[result[k].openId]) {
        return { ok: false, msg: 'openId ' + result[k].openId + ' 出现多次' }
      }
      seen[result[k].openId] = true
    }
    return { ok: true }
  })

  property('excludeOpenId 被正确排除', 500, function (seed) {
    var rng = makeRng(seed)
    var excludeId = 'exclude_me'
    var real = [{
      openId: excludeId, nickname: '排除', avatar: '', interests: [], district: '', bio: ''
    }]
    var mock = [{
      openId: excludeId, nickname: '排除Mock', avatar: '', interests: [], district: '', bio: ''
    }]
    var realN = randInt(rng, 0, 4)
    var mockN = randInt(rng, 0, 4)
    for (var i = 0; i < realN; i++) {
      real.push({
        openId: 'real_other_' + i, nickname: '真实' + i,
        avatar: '', interests: [], district: '', bio: ''
      })
    }
    for (var j = 0; j < mockN; j++) {
      mock.push({
        openId: 'mock_other_' + j, nickname: 'Mock' + j,
        avatar: '', interests: [], district: '', bio: ''
      })
    }
    var count = randInt(rng, 1, 10)
    var result = playerMatcher.mergeAndPick(real, mock, count, {
      district: '', interests: [], excludeOpenId: excludeId
    })
    for (var k = 0; k < result.length; k++) {
      if (result[k].openId === excludeId) {
        return { ok: false, msg: 'excludeOpenId 未被排除' }
      }
    }
    return { ok: true }
  })

  property('count=0 或负数时返回空数组', 200, function (seed) {
    var rng = makeRng(seed)
    var real = [{ openId: 'r1', nickname: 'R1', avatar: '', interests: [], district: '', bio: '' }]
    var mock = [{ openId: 'm1', nickname: 'M1', avatar: '', interests: [], district: '', bio: '' }]
    var count = rng() < 0.5 ? 0 : -randInt(rng, 1, 10)
    var result = playerMatcher.mergeAndPick(real, mock, count, {
      district: '', interests: [], excludeOpenId: ''
    })
    if (!Array.isArray(result) || result.length !== 0) {
      return { ok: false, msg: 'count<=' + count + ' 时应返回空数组，实际长度 ' + (Array.isArray(result) ? result.length : '非数组') }
    }
    return { ok: true }
  })

  property('真实玩家优先于 mock 玩家', 500, function (seed) {
    var rng = makeRng(seed)
    var realN = randInt(rng, 1, 5)
    var mockN = randInt(rng, 1, 5)
    var real = []
    var mock = []
    for (var i = 0; i < realN; i++) {
      real.push({ openId: 'real_' + i, nickname: 'R' + i, avatar: '', interests: [], district: '', bio: '' })
    }
    for (var j = 0; j < mockN; j++) {
      mock.push({ openId: 'mock_' + j, nickname: 'M' + j, avatar: '', interests: [], district: '', bio: '' })
    }
    var count = randInt(rng, 1, realN + mockN)
    var result = playerMatcher.mergeAndPick(real, mock, count, {
      district: '', interests: [], excludeOpenId: ''
    })
    // 找到第一个 mock 的位置
    var firstMockIdx = -1
    for (var k = 0; k < result.length; k++) {
      if (result[k].isReal === false) {
        firstMockIdx = k
        break
      }
    }
    if (firstMockIdx === -1) return { ok: true } // 无 mock
    // firstMockIdx 之后不应有真实玩家
    for (var m = firstMockIdx; m < result.length; m++) {
      if (result[m].isReal === true) {
        return { ok: false, msg: 'mock 玩家之后出现真实玩家（位置 ' + m + '）' }
      }
    }
    return { ok: true }
  })
})

// ============================================================
// ===== 性质 3: rankByRelevance 不变量 =====
// ============================================================
describe('rankByRelevance 不变量', function () {
  property('返回数组长度等于输入长度', 500, function (seed) {
    var rng = makeRng(seed)
    var n = randInt(rng, 0, 10)
    var players = []
    for (var i = 0; i < n; i++) {
      players.push({
        openId: 'p_' + i,
        nickname: 'P' + i,
        avatar: '', interests: randInterests(rng),
        district: randDistrict(rng), bio: ''
      })
    }
    var ranked = playerMatcher.rankByRelevance(players, '天河区', ['food'])
    if (!Array.isArray(ranked)) {
      return { ok: false, msg: '应返回数组' }
    }
    if (ranked.length !== players.length) {
      return { ok: false, msg: '长度不一致：输入 ' + players.length + '，输出 ' + ranked.length }
    }
    return { ok: true }
  })

  property('同区+兴趣命中的玩家得分最高', 500, function (seed) {
    var rng = makeRng(seed)
    var players = []
    var hasTopPlayer = false
    for (var i = 0; i < 8; i++) {
      var p = {
        openId: 'p_' + i,
        nickname: 'P' + i,
        avatar: '',
        interests: [],
        district: randDistrict(rng),
        bio: ''
      }
      // 第一个玩家强制为同区+兴趣命中
      if (i === 0) {
        p.district = '天河区'
        p.interests = ['food']
        hasTopPlayer = true
      }
      players.push(p)
    }
    if (!hasTopPlayer) return { ok: true }
    var ranked = playerMatcher.rankByRelevance(players, '天河区', ['food'])
    if (ranked.length === 0) return { ok: true }
    var first = ranked[0]
    if (first.openId !== 'p_0') {
      return { ok: false, msg: '同区+兴趣命中的玩家应排第一，实际第一是 ' + first.openId }
    }
    return { ok: true }
  })

  property('空 filters 不改变数组内容', 200, function (seed) {
    var rng = makeRng(seed)
    var n = randInt(rng, 1, 6)
    var players = []
    for (var i = 0; i < n; i++) {
      players.push({
        openId: 'p_' + i,
        nickname: 'P' + i,
        avatar: '',
        interests: [],
        district: '',
        bio: ''
      })
    }
    var ranked = playerMatcher.rankByRelevance(players, '', [])
    // 空 filters 时所有玩家得分相同，顺序应保持稳定（不丢失元素）
    if (ranked.length !== players.length) {
      return { ok: false, msg: '元素丢失' }
    }
    var ids = ranked.map(function (p) { return p.openId }).sort()
    var origIds = players.map(function (p) { return p.openId }).sort()
    for (var k = 0; k < ids.length; k++) {
      if (ids[k] !== origIds[k]) {
        return { ok: false, msg: '元素不一致' }
      }
    }
    return { ok: true }
  })
})

// ============================================================
// ===== 性质 4: shouldFallback 不变量 =====
// ============================================================
describe('shouldFallback 不变量', function () {
  property('null/undefined/ok=false/空players → true', 500, function (seed) {
    var rng = makeRng(seed)
    var r = rng()
    var input
    if (r < 0.25) input = null
    else if (r < 0.50) input = undefined
    else if (r < 0.75) input = { ok: false, errCode: 'DB_ERROR' }
    else input = { ok: true, players: [] }

    var result = playerMatcher.shouldFallback(input)
    if (result !== true) {
      return { ok: false, msg: '应返回 true，实际 ' + result + ' (input=' + JSON.stringify(input) + ')' }
    }
    return { ok: true }
  })

  property('有 players 时返回 false', 500, function (seed) {
    var rng = makeRng(seed)
    var n = randInt(rng, 1, 5)
    var players = []
    for (var i = 0; i < n; i++) {
      players.push({ openId: 'p_' + i, nickname: 'P' + i })
    }
    var result = playerMatcher.shouldFallback({ ok: true, players: players })
    if (result !== false) {
      return { ok: false, msg: '有 ' + n + ' 个 players 时应返回 false' }
    }
    return { ok: true }
  })
})

// ============================================================
// ===== 性质 5: computePartnerCount 不变量 =====
// 注意：player-matcher.computePartnerCount 签名为 (maxMembers, currentMembers, maxPartners)
// 与 task-hall-store.computePartnerCount(task, currentMemberCount) 不同
// ============================================================
describe('computePartnerCount 不变量', function () {
  property('结果始终在 [0, 4] 范围内', 500, function (seed) {
    var rng = makeRng(seed)
    var maxMembers = randInt(rng, 3, 6)
    var currentMembers = randInt(rng, 0, maxMembers + 2) // 可能超过 maxMembers（异常场景）
    var result = playerMatcher.computePartnerCount(maxMembers, currentMembers)
    if (typeof result !== 'number' || result < 0 || result > 4) {
      return { ok: false, msg: '结果 ' + result + ' 不在 [0, 4] 范围内 (max=' + maxMembers + ', current=' + currentMembers + ')' }
    }
    return { ok: true }
  })

  property('结果 = min(maxMembers - current - 1, 4)，且不为负', 500, function (seed) {
    var rng = makeRng(seed)
    var maxMembers = randInt(rng, 3, 6)
    var currentMembers = randInt(rng, 0, maxMembers)
    var result = playerMatcher.computePartnerCount(maxMembers, currentMembers)
    var expected = maxMembers - currentMembers - 1
    if (expected < 0) expected = 0
    if (expected > 4) expected = 4
    if (result !== expected) {
      return { ok: false, msg: '期望 ' + expected + '，实际 ' + result + ' (max=' + maxMembers + ', current=' + currentMembers + ')' }
    }
    return { ok: true }
  })

  property('null/undefined maxMembers 返回 0', 200, function (seed) {
    var rng = makeRng(seed)
    var max = rng() < 0.5 ? null : undefined
    var result = playerMatcher.computePartnerCount(max, randInt(rng, 0, 10))
    if (result !== 0) {
      return { ok: false, msg: 'null/undefined maxMembers 应返回 0，实际 ' + result }
    }
    return { ok: true }
  })

  property('自定义 maxPartners 上限生效', 200, function (seed) {
    var rng = makeRng(seed)
    var maxMembers = randInt(rng, 10, 20)
    var currentMembers = randInt(rng, 0, 3)
    var cap = randInt(rng, 1, 3)
    var result = playerMatcher.computePartnerCount(maxMembers, currentMembers, cap)
    if (result > cap) {
      return { ok: false, msg: '结果 ' + result + ' 超过自定义上限 ' + cap }
    }
    return { ok: true }
  })

  property('负数 maxPartners 始终返回 0（cap<0 兜底为 0）', 200, function (seed) {
    var rng = makeRng(seed)
    var maxMembers = randInt(rng, 3, 10)
    var currentMembers = randInt(rng, 0, maxMembers)
    // 负数 maxPartners 应被兜底为 0，slots>0 必被截到 0
    var badCap = randChoice(rng, [-1, -5, -100, -2, -999])
    var result = playerMatcher.computePartnerCount(maxMembers, currentMembers, badCap)
    if (typeof result !== 'number' || !Number.isFinite(result) || result < 0) {
      return { ok: false, msg: '负数 maxPartners=' + badCap + ' 结果 ' + result + ' 应为非负有限数' }
    }
    if (result > 0) {
      return { ok: false, msg: '负数 maxPartners=' + badCap + ' 结果应为 0，实际 ' + result }
    }
    return { ok: true }
  })
})

// ============================================================
// ===== 最终结果 =====
// ============================================================
console.log('\n' + '='.repeat(60))
console.log('player-matcher Property Fuzz 总结果: ' + passCount + ' passed, ' + failCount + ' failed')
if (failures.length > 0) {
  console.log('\n失败项:')
  failures.forEach(function (f) { console.log('  - ' + f) })
}
console.log('='.repeat(60))
process.exit(failCount > 0 ? 1 : 0)
