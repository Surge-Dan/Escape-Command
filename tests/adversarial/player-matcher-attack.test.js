// tests/adversarial/player-matcher-attack.test.js
// D5 真实玩家联动对抗式攻击测试
// 运行: node tests/adversarial/player-matcher-attack.test.js
//
// 设计思路（红队视角）：
//   - 假设攻击者能完全控制玩家档案、云端返回、匹配参数
//   - 每个攻击向量代表一种恶意/异常输入模式
//   - 纯函数必须满足「不抛异常 + 返回合法结构 + 不污染原型链」三不变量
//   - 攻击向量覆盖：类型污染、原型链、超大输入、null/undefined 注入、重复 openId 攻击

'use strict'

var playerMatcher = require('../../utils/player-matcher.js')

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

// 异步攻击测试（收集后统一 await）
var asyncAttacks = []
function attackAsync(name, fn) {
  asyncAttacks.push({ name: name, fn: fn })
}

// 通用不变量校验器
function isObject(v) {
  return v !== null && typeof v === 'object' && !Array.isArray(v)
}

// ============================================================
// ===== 攻击组 1: normalizePlayer 类型污染 / 原型链攻击 =====
// ============================================================
describe('normalizePlayer 类型污染 / 原型链攻击', function () {
  attack('P01: normalizePlayer 入参含 __proto__ 注入', function () {
    var raw = { openId: 'p01', nickname: 'P01', __proto__: { polluted: true } }
    var result = playerMatcher.normalizePlayer(raw, 'cloud')
    if ({}.polluted) return { ok: false, msg: '原型链被污染' }
    if (!result || !result.openId) return { ok: false, msg: '未返回有效玩家' }
    return { ok: true }
  })

  attack('P02: normalizePlayer 入参为数组（伪装对象）', function () {
    var result = playerMatcher.normalizePlayer([1, 2, 3], 'cloud')
    if (result === null) return { ok: true }
    if (!isObject(result)) return { ok: false, msg: '应返回 null 或对象' }
    return { ok: true }
  })

  attack('P03: normalizePlayer source 含恶意字符串', function () {
    var result = playerMatcher.normalizePlayer({ openId: 'p03', nickname: 'P03' }, '__proto__')
    if (!result || !result.openId) return { ok: false, msg: '未返回有效玩家' }
    return { ok: true }
  })

  attack('P04: normalizePlayer interests 含 __proto__', function () {
    var raw = { openId: 'p04', nickname: 'P04', interests: ['food', '__proto__'] }
    var result = playerMatcher.normalizePlayer(raw, 'cloud')
    if ({}.polluted) return { ok: false, msg: '原型链被污染' }
    if (!Array.isArray(result.interests)) return { ok: false, msg: 'interests 应为数组' }
    return { ok: true }
  })
})

// ============================================================
// ===== 攻击组 2: normalizePlayer null/undefined/异常类型 =====
// ============================================================
describe('normalizePlayer null/undefined/异常类型', function () {
  attack('P05: normalizePlayer null 入参', function () {
    var result = playerMatcher.normalizePlayer(null, 'cloud')
    if (result !== null) return { ok: false, msg: 'null 入参应返回 null' }
    return { ok: true }
  })

  attack('P06: normalizePlayer undefined 入参', function () {
    var result = playerMatcher.normalizePlayer(undefined, 'mock')
    if (result !== null) return { ok: false, msg: 'undefined 入参应返回 null' }
    return { ok: true }
  })

  attack('P07: normalizePlayer 数字入参', function () {
    var result = playerMatcher.normalizePlayer(42, 'cloud')
    if (result !== null) return { ok: false, msg: '数字入参应返回 null' }
    return { ok: true }
  })

  attack('P08: normalizePlayer 字符串入参', function () {
    var result = playerMatcher.normalizePlayer('malicious_string', 'cloud')
    if (result !== null) return { ok: false, msg: '字符串入参应返回 null' }
    return { ok: true }
  })

  attack('P09: normalizePlayer interests 为字符串（非数组）', function () {
    var raw = { openId: 'p09', nickname: 'P09', interests: 'food,photo' }
    var result = playerMatcher.normalizePlayer(raw, 'cloud')
    if (!result) return { ok: false, msg: '应返回有效对象' }
    if (!Array.isArray(result.interests)) return { ok: false, msg: 'interests 应被规范化为数组' }
    return { ok: true }
  })

  attack('P10: normalizePlayer interests 为 null', function () {
    var raw = { openId: 'p10', nickname: 'P10', interests: null }
    var result = playerMatcher.normalizePlayer(raw, 'cloud')
    if (!result) return { ok: false, msg: '应返回有效对象' }
    if (!Array.isArray(result.interests)) return { ok: false, msg: 'interests 应被规范化为数组' }
    return { ok: true }
  })
})

// ============================================================
// ===== 攻击组 3: mergeAndPick 重复 openId / 排除攻击 =====
// ============================================================
describe('mergeAndPick 重复 openId / 排除攻击', function () {
  attack('P11: mergeAndPick real 和 mock 含相同 openId 时去重', function () {
    var real = [{ openId: 'same', nickname: 'R1', avatar: '', interests: [], district: '', bio: '' }]
    var mock = [{ openId: 'same', nickname: 'M1', avatar: '', interests: [], district: '', bio: '' }]
    var result = playerMatcher.mergeAndPick(real, mock, 5, { district: '', interests: [], excludeOpenId: '' })
    if (!Array.isArray(result)) return { ok: false, msg: '应返回数组' }
    // real 和 mock 有相同 openId 时，mock 被去重
    var count = 0
    for (var i = 0; i < result.length; i++) {
      if (result[i].openId === 'same') count++
    }
    if (count > 1) return { ok: false, msg: 'real/mock 相同 openId 应去重，实际出现 ' + count + ' 次' }
    return { ok: true }
  })

  attack('P12: mergeAndPick excludeOpenId 排除所有', function () {
    var real = [{ openId: 'all', nickname: 'R1', avatar: '', interests: [], district: '', bio: '' }]
    var mock = [{ openId: 'all', nickname: 'M1', avatar: '', interests: [], district: '', bio: '' }]
    var result = playerMatcher.mergeAndPick(real, mock, 5, { district: '', interests: [], excludeOpenId: 'all' })
    if (!Array.isArray(result)) return { ok: false, msg: '应返回数组' }
    if (result.length !== 0) return { ok: false, msg: '全部被排除后应返回空数组' }
    return { ok: true }
  })

  attack('P13: mergeAndPick 超大 count', function () {
    var real = [{ openId: 'r1', nickname: 'R1', avatar: '', interests: [], district: '', bio: '' }]
    var mock = [{ openId: 'm1', nickname: 'M1', avatar: '', interests: [], district: '', bio: '' }]
    var result = playerMatcher.mergeAndPick(real, mock, 999999, { district: '', interests: [], excludeOpenId: '' })
    if (!Array.isArray(result)) return { ok: false, msg: '应返回数组' }
    if (result.length > 2) return { ok: false, msg: '不应超过可用玩家数 2，实际 ' + result.length }
    return { ok: true }
  })

  attack('P14: mergeAndPick count 为 NaN', function () {
    var real = [{ openId: 'r1', nickname: 'R1', avatar: '', interests: [], district: '', bio: '' }]
    var result = playerMatcher.mergeAndPick(real, [], NaN, { district: '', interests: [], excludeOpenId: '' })
    if (!Array.isArray(result)) return { ok: false, msg: '应返回数组' }
    return { ok: true }
  })

  attack('P15: mergeAndPick count 为 Infinity', function () {
    var real = [{ openId: 'r1', nickname: 'R1', avatar: '', interests: [], district: '', bio: '' }]
    var mock = [{ openId: 'm1', nickname: 'M1', avatar: '', interests: [], district: '', bio: '' }]
    var result = playerMatcher.mergeAndPick(real, mock, Infinity, { district: '', interests: [], excludeOpenId: '' })
    if (!Array.isArray(result)) return { ok: false, msg: '应返回数组' }
    if (result.length > 2) return { ok: false, msg: '不应超过可用玩家数' }
    return { ok: true }
  })

  attack('P16: mergeAndPick real/mock 为 null', function () {
    var result = playerMatcher.mergeAndPick(null, null, 3, { district: '', interests: [], excludeOpenId: '' })
    if (!Array.isArray(result)) return { ok: false, msg: '应返回数组' }
    return { ok: true }
  })

  attack('P17: mergeAndPick filters 为 null', function () {
    var real = [{ openId: 'r1', nickname: 'R1', avatar: '', interests: [], district: '', bio: '' }]
    var result = playerMatcher.mergeAndPick(real, [], 1, null)
    if (!Array.isArray(result)) return { ok: false, msg: '应返回数组' }
    return { ok: true }
  })
})

// ============================================================
// ===== 攻击组 4: rankByRelevance 异常输入 =====
// ============================================================
describe('rankByRelevance 异常输入', function () {
  attack('P18: rankByRelevance 空数组', function () {
    var result = playerMatcher.rankByRelevance([], '天河区', ['food'])
    if (!Array.isArray(result) || result.length !== 0) return { ok: false, msg: '应返回空数组' }
    return { ok: true }
  })

  attack('P19: rankByRelevance null 入参', function () {
    var result = playerMatcher.rankByRelevance(null, '天河区', ['food'])
    if (!Array.isArray(result)) return { ok: false, msg: '应返回数组' }
    return { ok: true }
  })

  attack('P20: rankByRelevance players 含 null/undefined 元素', function () {
    var players = [null, undefined, { openId: 'p20', nickname: 'P20', interests: ['food'], district: '天河区' }]
    var result = playerMatcher.rankByRelevance(players, '天河区', ['food'])
    if (!Array.isArray(result)) return { ok: false, msg: '应返回数组' }
    return { ok: true }
  })

  attack('P21: rankByRelevance district 含 __proto__', function () {
    var players = [{ openId: 'p21', nickname: 'P21', interests: [], district: '天河区' }]
    var result = playerMatcher.rankByRelevance(players, '__proto__', ['food'])
    if ({}.polluted) return { ok: false, msg: '原型链被污染' }
    if (!Array.isArray(result)) return { ok: false, msg: '应返回数组' }
    return { ok: true }
  })

  attack('P22: rankByRelevance interests 为非数组', function () {
    var players = [{ openId: 'p22', nickname: 'P22', interests: 'food', district: '天河区' }]
    var result = playerMatcher.rankByRelevance(players, '天河区', 'food')
    if (!Array.isArray(result)) return { ok: false, msg: '应返回数组' }
    return { ok: true }
  })
})

// ============================================================
// ===== 攻击组 5: shouldFallback 边界攻击 =====
// ============================================================
describe('shouldFallback 边界攻击', function () {
  attack('P23: shouldFallback null', function () {
    var result = playerMatcher.shouldFallback(null)
    if (result !== true) return { ok: false, msg: 'null 应返回 true' }
    return { ok: true }
  })

  attack('P24: shouldFallback undefined', function () {
    var result = playerMatcher.shouldFallback(undefined)
    if (result !== true) return { ok: false, msg: 'undefined 应返回 true' }
    return { ok: true }
  })

  attack('P25: shouldFallback 数字', function () {
    var result = playerMatcher.shouldFallback(42)
    if (result !== true) return { ok: false, msg: '数字应返回 true' }
    return { ok: true }
  })

  attack('P26: shouldFallback 字符串', function () {
    var result = playerMatcher.shouldFallback('malicious')
    if (result !== true) return { ok: false, msg: '字符串应返回 true' }
    return { ok: true }
  })

  attack('P27: shouldFallback ok=falsy 字符串', function () {
    var result = playerMatcher.shouldFallback({ ok: '', players: [{ openId: 'p' }] })
    if (result !== true) return { ok: false, msg: 'ok 为空字符串（falsy）时应返回 true（降级）' }
    return { ok: true }
  })

  attack('P28: shouldFallback ok=0', function () {
    var result = playerMatcher.shouldFallback({ ok: 0, players: [{ openId: 'p' }] })
    if (result !== true) return { ok: false, msg: 'ok=0（falsy）时应返回 true（降级）' }
    return { ok: true }
  })

  attack('P29: shouldFallback players 含 null 元素', function () {
    var result = playerMatcher.shouldFallback({ ok: true, players: [null, undefined] })
    if (typeof result !== 'boolean') return { ok: false, msg: '应返回 boolean' }
    return { ok: true }
  })
})

// ============================================================
// ===== 攻击组 6: computePartnerCount 异常输入 =====
// ============================================================
describe('computePartnerCount 异常输入', function () {
  attack('P30: computePartnerCount null/null', function () {
    var result = playerMatcher.computePartnerCount(null, null)
    if (result !== 0) return { ok: false, msg: 'null/null 应返回 0' }
    return { ok: true }
  })

  attack('P31: computePartnerCount 负数入参', function () {
    var result = playerMatcher.computePartnerCount(-5, -3)
    if (typeof result !== 'number' || result < 0) return { ok: false, msg: '负数入参应返回非负数' }
    return { ok: true }
  })

  attack('P32: computePartnerCount 字符串入参', function () {
    var result = playerMatcher.computePartnerCount('6', '2')
    if (typeof result !== 'number') return { ok: false, msg: '应返回数字' }
    return { ok: true }
  })

  attack('P33: computePartnerCount NaN 入参', function () {
    var result = playerMatcher.computePartnerCount(NaN, NaN)
    if (typeof result !== 'number') return { ok: false, msg: '应返回数字' }
    return { ok: true }
  })

  attack('P34: computePartnerCount maxPartners 为负数', function () {
    var result = playerMatcher.computePartnerCount(6, 1, -1)
    if (typeof result !== 'number' || result < 0) return { ok: false, msg: '负数 maxPartners 应返回非负数，实际 ' + result }
    return { ok: true }
  })

  attack('P35: computePartnerCount maxPartners 为 NaN', function () {
    var result = playerMatcher.computePartnerCount(6, 1, NaN)
    if (typeof result !== 'number' || result < 0) return { ok: false, msg: 'NaN maxPartners 应返回非负数' }
    return { ok: true }
  })
})

// ============================================================
// ===== 攻击组 7: matchPlayersAsync 降级安全性（异步）=====
// ============================================================
describe('matchPlayersAsync 降级安全性（异步）', function () {
  attackAsync('P36: matchPlayersAsync null user 不抛异常', function () {
    return playerMatcher.matchPlayersAsync(null, 3, {}, { cloudReady: false }).then(function (res) {
      if (!res) return { ok: false, msg: '应返回结果对象' }
      return { ok: true }
    })
  })

  attackAsync('P37: matchPlayersAsync null ctx 降级到 mock', function () {
    return playerMatcher.matchPlayersAsync({ openId: 'u1', nickname: 'U1' }, 2, {}, null).then(function (res) {
      if (!res || res.ok !== true) return { ok: false, msg: '应返回 ok=true' }
      if (res.source !== 'cloud_offline') return { ok: false, msg: 'null ctx 应 source=cloud_offline' }
      return { ok: true }
    })
  })

  attackAsync('P38: matchPlayersAsync callFunction 抛同步异常', function () {
    var ctx = {
      cloudReady: true,
      callFunction: function () { throw new Error('sync throw') }
    }
    return playerMatcher.matchPlayersAsync({ openId: 'u1', nickname: 'U1' }, 2, {}, ctx).then(function (res) {
      if (!res || res.ok !== true) return { ok: false, msg: '应返回 ok=true（降级）' }
      return { ok: true }
    })
  })

  attackAsync('P39: matchPlayersAsync callFunction 返回 reject', function () {
    var ctx = {
      cloudReady: true,
      callFunction: function () {
        return new Promise(function (_, reject) {
          setTimeout(function () { reject(new Error('async reject')) }, 10)
        })
      }
    }
    return playerMatcher.matchPlayersAsync({ openId: 'u1', nickname: 'U1' }, 2, {}, ctx).then(function (res) {
      if (!res || res.ok !== true) return { ok: false, msg: '应返回 ok=true（降级）' }
      if (res.source !== 'cloud_error') return { ok: false, msg: '应 source=cloud_error' }
      return { ok: true }
    })
  })

  attackAsync('P40: matchPlayersAsync count 为 0 不抛异常', function () {
    return playerMatcher.matchPlayersAsync({ openId: 'u1', nickname: 'U1' }, 0, {}, { cloudReady: false }).then(function (res) {
      if (!res || res.ok !== true) return { ok: false, msg: '应返回 ok=true' }
      return { ok: true }
    })
  })
})

// ============================================================
// ===== 异步测试执行 + 最终结果 =====
// ============================================================
function runAsyncAttacks() {
  if (asyncAttacks.length === 0) {
    printFinalResult()
    return
  }
  console.log('\n=== matchPlayersAsync 异步攻击测试 ===')
  var next = asyncAttacks.shift()
  var result
  try {
    result = next.fn()
  } catch (e) {
    result = Promise.resolve({ ok: false, msg: 'THROW: ' + e.message })
  }
  Promise.resolve(result).then(function (res) {
    if (res && res.ok) {
      passCount++
      console.log('  \u2713 ' + next.name)
    } else {
      failCount++
      failures.push('matchPlayersAsync 异步 > ' + next.name + ': ' + (res && res.msg || '失败'))
      console.log('  \u2717 ' + next.name + ' — ' + (res && res.msg || '失败'))
    }
    runAsyncAttacks()
  }).catch(function (e) {
    failCount++
    failures.push('matchPlayersAsync 异步 > ' + next.name + ': UNHANDLED: ' + e.message)
    console.log('  \u2717 ' + next.name + ' — UNHANDLED: ' + e.message)
    runAsyncAttacks()
  })
}

function printFinalResult() {
  console.log('\n' + '='.repeat(60))
  console.log('player-matcher Adversarial Attack 总结果: ' + passCount + ' passed, ' + failCount + ' failed')
  if (failures.length > 0) {
    console.log('\n失败项:')
    failures.forEach(function (f) { console.log('  - ' + f) })
  }
  console.log('='.repeat(60))
  process.exit(failCount > 0 ? 1 : 0)
}

// 启动异步测试
runAsyncAttacks()
