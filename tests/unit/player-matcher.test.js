// tests/unit/player-matcher.test.js
// 单元测试：player-matcher.js (D5 真实玩家联动 · 混合模式匹配器)
// 运行: node tests/unit/player-matcher.test.js
//
// 覆盖：normalizePlayer / rankByRelevance / mergeAndPick / shouldFallback /
//       computePartnerCount / matchPlayersAsync（含降级）
//
// 注意：matchPlayersAsync 是异步函数，测试用 asyncCollect 收集 Promise，
// 在主流程末尾 await 全部完成后再输出结果。

'use strict'

var assert = require('assert')

var matcher = require('../../utils/player-matcher.js')

// ===== 测试框架（支持同步 + 异步）=====

var passed = 0
var failed = 0
var failures = []
var asyncTests = [] // { name, promise }

function test(name, fn) {
  try {
    var ret = fn()
    // 如果返回 Promise，收集到异步队列
    if (ret && typeof ret.then === 'function') {
      asyncTests.push({
        name: name,
        promise: ret.then(
          function () { passed++; console.log('  \u2713 ' + name) },
          function (e) { failed++; failures.push(name + ' -> ' + (e.message || e)); console.log('  \u2717 ' + name); console.log('      ' + (e.message || e)) }
        )
      })
    } else {
      passed++
      console.log('  \u2713 ' + name)
    }
  } catch (e) {
    failed++
    failures.push(name + ' -> ' + e.message)
    console.log('  \u2717 ' + name)
    console.log('      ' + (e.message || e))
  }
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

function mkRealPlayer(openId, nickname, opts) {
  return Object.assign({
    openId: openId,
    nickname: nickname,
    avatar: '/packageBt/images/avatar.webp',
    interests: ['food'],
    district: '天河区',
    bio: '测试玩家'
  }, opts || {})
}

function mkMockPlayer(openId, nickname) {
  return {
    openId: openId,
    nickname: nickname,
    avatar: '/packageBt/images/avatar.webp',
    interests: ['culture'],
    district: '越秀区',
    bio: 'Mock 玩家'
  }
}

// ===== 0. 导出常量 =====
section('0. 导出常量')

test('DEFAULT_AVATAR：导出为非空字符串', function () {
  eq(typeof matcher.DEFAULT_AVATAR, 'string')
  ok(matcher.DEFAULT_AVATAR.length > 0, 'DEFAULT_AVATAR 不应为空串')
})

test('CLOUD_TIMEOUT：导出为合理超时数值（>=1000ms）', function () {
  eq(typeof matcher.CLOUD_TIMEOUT, 'number')
  ok(matcher.CLOUD_TIMEOUT >= 1000, 'CLOUD_TIMEOUT 应 >= 1000ms，实际 ' + matcher.CLOUD_TIMEOUT)
  ok(matcher.CLOUD_TIMEOUT <= 10000, 'CLOUD_TIMEOUT 应 <= 10000ms，实际 ' + matcher.CLOUD_TIMEOUT)
})

// ===== A. normalizePlayer =====
section('A. normalizePlayer')

test('normalizePlayer：cloud 来源标记 isReal=true', function () {
  var p = matcher.normalizePlayer(mkRealPlayer('r_01', '真实'), 'cloud')
  eq(p.openId, 'r_01')
  eq(p.nickname, '真实')
  eq(p.isReal, true)
})

test('normalizePlayer：mock 来源标记 isReal=false', function () {
  var p = matcher.normalizePlayer(mkMockPlayer('m_01', 'Mock'), 'mock')
  eq(p.openId, 'm_01')
  eq(p.isReal, false)
})

test('normalizePlayer：空对象返回 null', function () {
  eq(matcher.normalizePlayer(null, 'cloud'), null)
  eq(matcher.normalizePlayer(undefined, 'mock'), null)
  eq(matcher.normalizePlayer('string', 'cloud'), null)
})

test('normalizePlayer：缺字段时填充默认值', function () {
  var p = matcher.normalizePlayer({ openId: 'r_02' }, 'cloud')
  eq(p.openId, 'r_02')
  eq(p.nickname, '')
  eq(p.avatar, matcher.DEFAULT_AVATAR)
  deepEq(p.interests, [])
  eq(p.district, '')
  eq(p.bio, '')
  eq(p.isReal, true)
})

test('normalizePlayer：interests 数组被复制（不共享引用）', function () {
  var raw = { openId: 'r_03', interests: ['food', 'sport'] }
  var p = matcher.normalizePlayer(raw, 'cloud')
  p.interests.push('photo')
  eq(raw.interests.length, 2, '原数组不应被修改')
  eq(p.interests.length, 3)
})

// ===== B. rankByRelevance =====
section('B. rankByRelevance')

test('rankByRelevance：district+interests 命中排最前', function () {
  var players = [
    matcher.normalizePlayer({ openId: 'a', district: '越秀区', interests: ['photo'] }, 'cloud'),
    matcher.normalizePlayer({ openId: 'b', district: '天河区', interests: ['food'] }, 'cloud'),
    matcher.normalizePlayer({ openId: 'c', district: '天河区', interests: ['photo'] }, 'cloud')
  ]
  var ranked = matcher.rankByRelevance(players, { district: '天河区', interests: ['food'] })
  eq(ranked[0].openId, 'b', 'district+interests 双命中应排第一')
})

test('rankByRelevance：仅 district > 仅 interests > 无命中', function () {
  var players = [
    matcher.normalizePlayer({ openId: 'none', district: '越秀区', interests: ['photo'] }, 'cloud'),
    matcher.normalizePlayer({ openId: 'both', district: '天河区', interests: ['food'] }, 'cloud'),
    matcher.normalizePlayer({ openId: 'dist', district: '天河区', interests: ['photo'] }, 'cloud'),
    matcher.normalizePlayer({ openId: 'intr', district: '越秀区', interests: ['food'] }, 'cloud')
  ]
  var ranked = matcher.rankByRelevance(players, { district: '天河区', interests: ['food'] })
  eq(ranked[0].openId, 'both', '双命中第一')
  eq(ranked[1].openId, 'dist', '仅 district 第二')
  eq(ranked[2].openId, 'intr', '仅 interests 第三')
  eq(ranked[3].openId, 'none', '无命中最后')
})

test('rankByRelevance：空 filters 不改变顺序', function () {
  var players = [
    matcher.normalizePlayer({ openId: 'x1' }, 'cloud'),
    matcher.normalizePlayer({ openId: 'x2' }, 'cloud')
  ]
  var ranked = matcher.rankByRelevance(players, {})
  eq(ranked[0].openId, 'x1')
  eq(ranked[1].openId, 'x2')
})

test('rankByRelevance：不修改原数组', function () {
  var players = [
    matcher.normalizePlayer({ openId: 'a', district: 'B' }, 'cloud'),
    matcher.normalizePlayer({ openId: 'b', district: 'A' }, 'cloud')
  ]
  matcher.rankByRelevance(players, { district: 'A' })
  eq(players[0].openId, 'a', '原数组顺序不变')
})

// ===== C. mergeAndPick =====
section('C. mergeAndPick')

test('mergeAndPick：真实玩家优先，不足用 mock 补齐', function () {
  var real = [mkRealPlayer('r_01', '真实A'), mkRealPlayer('r_02', '真实B')]
  var mock = [mkMockPlayer('m_01', 'MockA'), mkMockPlayer('m_02', 'MockB')]
  var result = matcher.mergeAndPick(real, mock, 3, { district: '天河区' })
  eq(result.length, 3)
  eq(result[0].isReal, true, '第一个应是真实玩家')
  eq(result[1].isReal, true, '第二个应是真实玩家')
  eq(result[2].isReal, false, '第三个应是 mock 玩家')
})

test('mergeAndPick：真实玩家足够时不取 mock', function () {
  var real = [mkRealPlayer('r_01', 'A'), mkRealPlayer('r_02', 'B'), mkRealPlayer('r_03', 'C')]
  var mock = [mkMockPlayer('m_01', 'Mock')]
  var result = matcher.mergeAndPick(real, mock, 2, {})
  eq(result.length, 2)
  eq(result[0].isReal, true)
  eq(result[1].isReal, true)
})

test('mergeAndPick：无真实玩家时全部用 mock', function () {
  var mock = [mkMockPlayer('m_01', 'A'), mkMockPlayer('m_02', 'B')]
  var result = matcher.mergeAndPick([], mock, 2, {})
  eq(result.length, 2)
  eq(result[0].isReal, false)
  eq(result[1].isReal, false)
})

test('mergeAndPick：排除 excludeOpenId', function () {
  var real = [mkRealPlayer('me', '我自己'), mkRealPlayer('r_01', '别人')]
  var mock = [mkMockPlayer('m_01', 'Mock')]
  var result = matcher.mergeAndPick(real, mock, 3, { excludeOpenId: 'me' })
  for (var i = 0; i < result.length; i++) {
    ok(result[i].openId !== 'me', '不应包含被排除的 openId')
  }
})

test('mergeAndPick：真实和 mock 有相同 openId 时去重', function () {
  var real = [mkRealPlayer('dup', '真实Dup')]
  var mock = [mkMockPlayer('dup', 'MockDup'), mkMockPlayer('m_01', '唯一')]
  var result = matcher.mergeAndPick(real, mock, 3, {})
  var ids = {}
  for (var i = 0; i < result.length; i++) {
    ok(!ids[result[i].openId], 'openId 不应重复: ' + result[i].openId)
    ids[result[i].openId] = true
  }
})

test('mergeAndPick：count=0 返回空数组', function () {
  var result = matcher.mergeAndPick([mkRealPlayer('r', 'A')], [], 0, {})
  eq(result.length, 0)
})

test('mergeAndPick：count 负数返回空数组', function () {
  var result = matcher.mergeAndPick([mkRealPlayer('r', 'A')], [], -1, {})
  eq(result.length, 0)
})

test('mergeAndPick：总量不足 count 时返回全部可用', function () {
  var real = [mkRealPlayer('r_01', 'A')]
  var mock = [mkMockPlayer('m_01', 'B')]
  var result = matcher.mergeAndPick(real, mock, 5, {})
  eq(result.length, 2, '只有 2 个可用，返回 2')
})

// ===== D. shouldFallback =====
section('D. shouldFallback')

test('shouldFallback：null/undefined → true', function () {
  eq(matcher.shouldFallback(null), true)
  eq(matcher.shouldFallback(undefined), true)
})

test('shouldFallback：ok=false → true', function () {
  eq(matcher.shouldFallback({ ok: false }), true)
})

test('shouldFallback：players 非数组 → true', function () {
  eq(matcher.shouldFallback({ ok: true, players: null }), true)
  eq(matcher.shouldFallback({ ok: true, players: 'not array' }), true)
})

test('shouldFallback：players 空数组 → true', function () {
  eq(matcher.shouldFallback({ ok: true, players: [] }), true)
})

test('shouldFallback：players 有数据 → false', function () {
  eq(matcher.shouldFallback({ ok: true, players: [{ openId: 'x' }] }), false)
})

// ===== E. computePartnerCount =====
section('E. computePartnerCount')

test('computePartnerCount：maxMembers=4, current=1 → 2', function () {
  eq(matcher.computePartnerCount(4, 1), 2)
})

test('computePartnerCount：maxMembers=6, current=0 → 4（上限）', function () {
  eq(matcher.computePartnerCount(6, 0), 4)
})

test('computePartnerCount：maxMembers=3, current=2 → 0', function () {
  eq(matcher.computePartnerCount(3, 2), 0)
})

test('computePartnerCount：负数入参 → 0', function () {
  eq(matcher.computePartnerCount(0, 0), 0)
  eq(matcher.computePartnerCount(-1, 0), 0)
})

// ===== F. matchPlayersAsync（降级测试）=====
section('F. matchPlayersAsync（降级测试）')

test('matchPlayersAsync：cloudReady=false → 直接 mock', function () {
  var user = { openId: 'u_01', nickname: '测试' }
  return matcher.matchPlayersAsync(user, 2, {}, { cloudReady: false }).then(function (res) {
    ok(res.ok, '应返回 ok=true')
    eq(res.source, 'cloud_offline', 'source 应为 cloud_offline')
    eq(res.players.length, 2, '应返回 2 个 mock 玩家')
    for (var i = 0; i < res.players.length; i++) {
      eq(res.players[i].isReal, false, '应全是 mock 玩家')
    }
  })
})

test('matchPlayersAsync：callFunction 缺失 → 直接 mock', function () {
  var user = { openId: 'u_02', nickname: '测试' }
  return matcher.matchPlayersAsync(user, 1, {}, { cloudReady: true }).then(function (res) {
    ok(res.ok)
    eq(res.source, 'cloud_offline')
    eq(res.players.length, 1)
  })
})

test('matchPlayersAsync：云端返回真实玩家 → source=cloud', function () {
  var user = { openId: 'u_03', nickname: '测试' }
  var ctx = {
    cloudReady: true,
    callFunction: function () {
      return Promise.resolve({
        result: {
          ok: true,
          players: [mkRealPlayer('r_01', '真实A'), mkRealPlayer('r_02', '真实B')]
        }
      })
    }
  }
  return matcher.matchPlayersAsync(user, 2, {}, ctx).then(function (res) {
    ok(res.ok)
    eq(res.source, 'cloud', 'source 应为 cloud')
    eq(res.players.length, 2)
    eq(res.players[0].isReal, true)
  })
})

test('matchPlayersAsync：云端返回不足 → mock 补齐 → source=mixed', function () {
  var user = { openId: 'u_04', nickname: '测试' }
  var ctx = {
    cloudReady: true,
    callFunction: function () {
      return Promise.resolve({
        result: {
          ok: true,
          players: [mkRealPlayer('r_01', '唯一真实')]
        }
      })
    }
  }
  return matcher.matchPlayersAsync(user, 3, {}, ctx).then(function (res) {
    ok(res.ok)
    eq(res.source, 'mixed', 'source 应为 mixed')
    eq(res.players.length, 3)
    eq(res.players[0].isReal, true, '第一个是真实玩家')
    var hasMock = false
    for (var i = 0; i < res.players.length; i++) {
      if (!res.players[i].isReal) hasMock = true
    }
    ok(hasMock, '应包含 mock 玩家')
  })
})

test('matchPlayersAsync：云端返回空 → 全 mock → source=mock', function () {
  var user = { openId: 'u_05', nickname: '测试' }
  var ctx = {
    cloudReady: true,
    callFunction: function () {
      return Promise.resolve({
        result: { ok: true, players: [] }
      })
    }
  }
  return matcher.matchPlayersAsync(user, 2, {}, ctx).then(function (res) {
    ok(res.ok)
    eq(res.source, 'mock')
    eq(res.players.length, 2)
    eq(res.players[0].isReal, false)
  })
})

test('matchPlayersAsync：云端失败 → 降级 mock → source=cloud_error', function () {
  var user = { openId: 'u_06', nickname: '测试' }
  var ctx = {
    cloudReady: true,
    callFunction: function () {
      return Promise.reject(new Error('网络错误'))
    }
  }
  return matcher.matchPlayersAsync(user, 2, {}, ctx).then(function (res) {
    ok(res.ok, '降级后应 ok=true')
    eq(res.source, 'cloud_error')
    eq(res.players.length, 2)
    eq(res.players[0].isReal, false)
  })
})

test('matchPlayersAsync：excludeOpenId 生效', function () {
  var user = { openId: 'u_07', nickname: '测试' }
  var ctx = { cloudReady: false }
  return matcher.matchPlayersAsync(user, 10, { excludeOpenId: 'u_07' }, ctx).then(function (res) {
    for (var i = 0; i < res.players.length; i++) {
      ok(res.players[i].openId !== 'u_07', '不应包含被排除的 openId')
    }
  })
})

// ===== G. C-P4 信任分权重 =====
section('G. C-P4 信任分权重')

// rankByRelevance + trustMap
test('rankByRelevance：无 trustMap 时向后兼容（原始排序）', function () {
  var players = [
    mkRealPlayer('r_a', 'A', { district: '天河区', interests: ['food'] }),
    mkRealPlayer('r_b', 'B', { district: '越秀区', interests: ['photo'] })
  ]
  var ranked = matcher.rankByRelevance(players, { district: '天河区' })
  // 不传 trustMap → 和原来一样
  eq(ranked[0].openId, 'r_a', '区命中排前')
})

test('rankByRelevance：gold 玩家优先于 normal（同区同兴趣）', function () {
  var players = [
    mkRealPlayer('r_normal', '普通', { district: '天河区', interests: ['food'] }),
    mkRealPlayer('r_gold', '金牌', { district: '天河区', interests: ['food'] })
  ]
  var trustMap = {
    r_gold: { tier: 'gold' },
    r_normal: { tier: 'normal' }
  }
  // 同 baseScore，gold 权重 1.2 > normal 1.0
  var ranked = matcher.rankByRelevance(players, { district: '天河区', interests: ['food'] }, trustMap)
  eq(ranked[0].openId, 'r_gold', 'gold 应排前')
})

test('rankByRelevance：gold 弥补区劣势（gold+非命中 vs normal+命中）', function () {
  var players = [
    mkRealPlayer('r_normal_hit', '普通命中', { district: '天河区', interests: ['food'] }),
    mkRealPlayer('r_gold_miss', '金牌未命中', { district: '越秀区', interests: ['photo'] })
  ]
  var trustMap = {
    r_gold_miss: { tier: 'gold' },
    r_normal_hit: { tier: 'normal' }
  }
  // normal_hit baseScore=3, weight=1.0 → 3.0
  // gold_miss baseScore=0, weight=1.2 → 0
  // normal 仍排前（baseScore 差距大于权重影响）
  var ranked = matcher.rankByRelevance(players, { district: '天河区', interests: ['food'] }, trustMap)
  eq(ranked[0].openId, 'r_normal_hit', 'baseScore 差距大时 normal 命中仍排前')
})

test('rankByRelevance：watch 玩家降级到队尾', function () {
  var players = [
    mkRealPlayer('r_watch', '待观察', { district: '天河区', interests: ['food'] }),
    mkRealPlayer('r_normal', '普通', { district: '越秀区', interests: ['photo'] })
  ]
  var trustMap = {
    r_watch: { tier: 'watch' },
    r_normal: { tier: 'normal' }
  }
  // watch 即使区+兴趣双命中(baseScore=3)，也应排到 normal(baseScore=0) 之后
  var ranked = matcher.rankByRelevance(players, { district: '天河区', interests: ['food'] }, trustMap)
  eq(ranked[0].openId, 'r_normal', 'normal 排前，watch 降级到队尾')
  eq(ranked[1].openId, 'r_watch')
})

test('rankByRelevance：trustMap 中缺失的玩家按 normal 处理', function () {
  var players = [
    mkRealPlayer('r_known', '已知', { district: '天河区' }),
    mkRealPlayer('r_unknown', '未知', { district: '天河区' })
  ]
  var trustMap = {
    r_known: { tier: 'newbie' }  // r_unknown 不在 trustMap 中
  }
  // 同 baseScore，newbie 权重 0.8 < normal(默认) 1.0
  var ranked = matcher.rankByRelevance(players, { district: '天河区' }, trustMap)
  eq(ranked[0].openId, 'r_unknown', '缺失 trust → normal → 排前')
})

test('rankByRelevance：newbie 善意降权（0.8）', function () {
  var players = [
    mkRealPlayer('r_newbie', '新手', { district: '天河区' }),
    mkRealPlayer('r_normal', '普通', { district: '天河区' })
  ]
  var trustMap = {
    r_newbie: { tier: 'newbie' },
    r_normal: { tier: 'normal' }
  }
  // 同 baseScore=2, newbie 2*0.8=1.6 < normal 2*1.0=2.0
  var ranked = matcher.rankByRelevance(players, { district: '天河区' }, trustMap)
  eq(ranked[0].openId, 'r_normal', 'normal 排前')
  eq(ranked[1].openId, 'r_newbie')
})

// mergeAndPick + trustMap
test('mergeAndPick：trustMap 传入影响真实玩家排序', function () {
  var real = [
    mkRealPlayer('r_watch', '待观察', { district: '天河区', interests: ['food'] }),
    mkRealPlayer('r_gold', '金牌', { district: '天河区', interests: ['food'] })
  ]
  var trustMap = {
    r_gold: { tier: 'gold' },
    r_watch: { tier: 'watch' }
  }
  var result = matcher.mergeAndPick(real, [], 2, { district: '天河区', interests: ['food'] }, trustMap)
  eq(result[0].openId, 'r_gold', 'gold 排前')
  eq(result[1].openId, 'r_watch', 'watch 降级到第二')
})

// extractRealOpenIds
test('extractRealOpenIds：从云端结果提取 openId', function () {
  var res = { result: { ok: true, players: [
    { openId: 'a', nickname: 'A' },
    { openId: 'b', nickname: 'B' },
    { openId: 'a', nickname: 'A dup' }  // 去重
  ] } }
  var ids = matcher._internal.extractRealOpenIds(res)
  eq(ids.length, 2)
  eq(ids[0], 'a')
  eq(ids[1], 'b')
})

test('extractRealOpenIds：fallback 结果返回空数组', function () {
  var res = { result: { ok: false } }
  var ids = matcher._internal.extractRealOpenIds(res)
  deepEq(ids, [])
})

test('extractRealOpenIds：空玩家列表返回空数组', function () {
  var res = { result: { ok: true, players: [] } }
  var ids = matcher._internal.extractRealOpenIds(res)
  deepEq(ids, [])
})

// matchPlayersAsync + trustLoader
test('matchPlayersAsync：trustLoader 查询成功 → trust 加权生效', function () {
  var user = { openId: 'u_me', nickname: '我' }
  var ctx = {
    cloudReady: true,
    callFunction: function (opts) {
      if (opts.name === 'matchPlayers') {
        return Promise.resolve({ result: {
          ok: true,
          players: [
            { openId: 'r_watch', nickname: '待观察', district: '天河区', interests: ['food'] },
            { openId: 'r_gold', nickname: '金牌', district: '天河区', interests: ['food'] }
          ]
        } })
      }
      return Promise.resolve({})
    },
    trustLoader: function (openIds) {
      return Promise.resolve({
        r_gold: { tier: 'gold' },
        r_watch: { tier: 'watch' }
      })
    }
  }
  return matcher.matchPlayersAsync(user, 2, { district: '天河区', interests: ['food'] }, ctx).then(function (res) {
    ok(res.ok)
    eq(res.players.length, 2)
    // gold 排前，watch 降级
    eq(res.players[0].openId, 'r_gold', 'gold 应排前')
    eq(res.players[1].openId, 'r_watch', 'watch 降级')
  })
})

test('matchPlayersAsync：trustLoader 失败 → 降级到无 trust 加权', function () {
  var user = { openId: 'u_me', nickname: '我' }
  var ctx = {
    cloudReady: true,
    callFunction: function (opts) {
      return Promise.resolve({ result: {
        ok: true,
        players: [
          { openId: 'r_01', nickname: 'A', district: '天河区' },
          { openId: 'r_02', nickname: 'B', district: '天河区' }
        ]
      } })
    },
    trustLoader: function () {
      return Promise.reject(new Error('trust query failed'))
    }
  }
  return matcher.matchPlayersAsync(user, 2, { district: '天河区' }, ctx).then(function (res) {
    ok(res.ok, 'trust 失败不阻断匹配')
    eq(res.players.length, 2)
    // 无 trust 加权，按原始 baseScore 排序（都同区，保持原顺序）
    eq(res.players[0].openId, 'r_01')
    eq(res.players[1].openId, 'r_02')
  })
})

test('matchPlayersAsync：无 trustLoader → 向后兼容', function () {
  var user = { openId: 'u_me', nickname: '我' }
  var ctx = {
    cloudReady: true,
    callFunction: function (opts) {
      return Promise.resolve({ result: {
        ok: true,
        players: [{ openId: 'r_01', nickname: 'A', district: '天河区' }]
      } })
    }
    // 无 trustLoader
  }
  return matcher.matchPlayersAsync(user, 1, { district: '天河区' }, ctx).then(function (res) {
    ok(res.ok)
    eq(res.players.length, 1)
    eq(res.players[0].openId, 'r_01')
  })
})

test('matchPlayersAsync：trust 字段缺失按 normal 处理', function () {
  var user = { openId: 'u_me', nickname: '我' }
  var ctx = {
    cloudReady: true,
    callFunction: function (opts) {
      return Promise.resolve({ result: {
        ok: true,
        players: [
          { openId: 'r_01', nickname: 'A', district: '天河区' },
          { openId: 'r_02', nickname: 'B', district: '天河区' }
        ]
      } })
    },
    trustLoader: function (openIds) {
      // 只返回 r_01 的 trust，r_02 缺失
      return Promise.resolve({ r_01: { tier: 'newbie' } })
    }
  }
  return matcher.matchPlayersAsync(user, 2, { district: '天河区' }, ctx).then(function (res) {
    ok(res.ok)
    eq(res.players.length, 2)
    // r_01 newbie(0.8), r_02 缺失→normal(1.0) → r_02 排前
    eq(res.players[0].openId, 'r_02', '缺失 trust → normal → 排前')
    eq(res.players[1].openId, 'r_01')
  })
})

// ===== 主流程：等待异步测试完成后输出结果 =====
Promise.all(asyncTests.map(function (t) { return t.promise })).then(function () {
  console.log('\n' + '='.repeat(50))
  console.log('  结果: ' + passed + ' 通过, ' + failed + ' 失败')
  if (failed > 0) {
    console.log('\n  失败用例:')
    for (var i = 0; i < failures.length; i++) {
      console.log('    - ' + failures[i])
    }
  }
  console.log('='.repeat(50))
  process.exit(failed > 0 ? 1 : 0)
})
