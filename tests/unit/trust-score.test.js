// tests/unit/trust-score.test.js
// 单元测试：trust-score.js (C-P4 信任分纯函数计算)
// 运行: node tests/unit/trust-score.test.js
//
// 覆盖：computeTrustScore 5 tier 分级 + 边界 + 防御
//       isValidReview / tierFromScore / getTierWeight / getTierLabel / TRUST_TIER_WEIGHT

'use strict'

var assert = require('assert')

var trustScore = require('../../utils/trust-score.js')
var computeTrustScore = trustScore.computeTrustScore
var isValidReview = trustScore.isValidReview
var tierFromScore = trustScore.tierFromScore
var getTierWeight = trustScore.getTierWeight
var getTierLabel = trustScore.getTierLabel
var TRUST_TIER_WEIGHT = trustScore.TRUST_TIER_WEIGHT
var DEFAULT_TRUST = trustScore.DEFAULT_TRUST

// ===== 测试框架 =====

var passed = 0
var failed = 0
var failures = []

function test(name, fn) {
  try {
    fn()
    passed++
    console.log('  \u2713 ' + name)
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

function mkReviews(ratings) {
  return ratings.map(function (r) { return { rating: r } })
}

// ===== 测试用例 =====

console.log('=== trust-score.js 单元测试 ===')

// --- 常量 ---
section('常量导出')

test('TRUST_TIER_WEIGHT 导出 5 个 tier 权重', function () {
  eq(TRUST_TIER_WEIGHT.gold, 1.2)
  eq(TRUST_TIER_WEIGHT.reliable, 1.0)
  eq(TRUST_TIER_WEIGHT.normal, 1.0)
  eq(TRUST_TIER_WEIGHT.newbie, 0.8)
  eq(TRUST_TIER_WEIGHT.watch, 0.3)
})

test('DEFAULT_TRUST 是新手默认值', function () {
  eq(DEFAULT_TRUST.score, 5.0)
  eq(DEFAULT_TRUST.count, 0)
  eq(DEFAULT_TRUST.label, '新手')
  eq(DEFAULT_TRUST.tier, 'newbie')
})

// --- computeTrustScore: newbie tier ---
section('computeTrustScore · newbie tier（count < 3）')

test('空数组返回默认新手信任分', function () {
  var r = computeTrustScore([])
  deepEq(r, { score: 5.0, count: 0, label: '新手', tier: 'newbie' })
})

test('count=1 任何评分都是 newbie', function () {
  var r = computeTrustScore(mkReviews([5]))
  eq(r.tier, 'newbie')
  eq(r.label, '新手')
  eq(r.count, 1)
  eq(r.score, 5.0)
})

test('count=2 满分也是 newbie（count<3 优先）', function () {
  var r = computeTrustScore(mkReviews([5, 5]))
  eq(r.tier, 'newbie')
  eq(r.label, '新手')
  eq(r.count, 2)
  eq(r.score, 5.0)
})

test('count=2 低分也是 newbie', function () {
  var r = computeTrustScore(mkReviews([1, 1]))
  eq(r.tier, 'newbie')
  eq(r.count, 2)
  eq(r.score, 1.0)
})

// --- computeTrustScore: gold tier ---
section('computeTrustScore · gold tier（avg≥4.8 && count≥10）')

test('count=10 avg=5.0 是 gold 金牌搭子', function () {
  var r = computeTrustScore(mkReviews([5, 5, 5, 5, 5, 5, 5, 5, 5, 5]))
  eq(r.tier, 'gold')
  eq(r.label, '金牌搭子')
  eq(r.count, 10)
  eq(r.score, 5.0)
})

test('count=10 avg=4.8 是 gold（边界）', function () {
  var ratings = [5, 5, 5, 5, 5, 5, 5, 5, 5, 4] // sum=49, avg=4.9
  var r = computeTrustScore(mkReviews(ratings))
  eq(r.tier, 'gold')
  eq(r.score, 4.9)
})

test('count=9 avg=5.0 不是 gold（count<10）→ reliable', function () {
  var r = computeTrustScore(mkReviews([5, 5, 5, 5, 5, 5, 5, 5, 5]))
  eq(r.tier, 'reliable')
  eq(r.label, '靠谱')
})

// --- computeTrustScore: reliable tier ---
section('computeTrustScore · reliable tier（avg≥4.5）')

test('count=3 avg=5.0 是 reliable（count<10）', function () {
  var r = computeTrustScore(mkReviews([5, 5, 5]))
  eq(r.tier, 'reliable')
  eq(r.label, '靠谱')
  eq(r.count, 3)
})

test('count=3 avg=4.5 是 reliable（边界）', function () {
  var r = computeTrustScore(mkReviews([5, 4, 4])) // sum=13, avg≈4.33 → 不是 reliable
  // 修正：4.5 边界需要 sum/count >= 4.5
  var r2 = computeTrustScore(mkReviews([5, 5, 4])) // sum=14, avg≈4.67 → reliable
  eq(r.tier, 'normal') // avg≈4.33 < 4.5
  eq(r2.tier, 'reliable')
})

test('count=4 avg=4.5 是 reliable', function () {
  var r = computeTrustScore(mkReviews([5, 5, 4, 4])) // sum=18, avg=4.5
  eq(r.tier, 'reliable')
  eq(r.score, 4.5)
})

// --- computeTrustScore: normal tier ---
section('computeTrustScore · normal tier（3.0≤avg<4.5）')

test('count=3 avg=4.0 是 normal', function () {
  var r = computeTrustScore(mkReviews([4, 4, 4]))
  eq(r.tier, 'normal')
  eq(r.label, '普通')
  eq(r.score, 4.0)
})

test('count=3 avg=3.0 是 normal（边界）', function () {
  var r = computeTrustScore(mkReviews([3, 3, 3]))
  eq(r.tier, 'normal')
  eq(r.score, 3.0)
})

test('count=3 avg=4.49 是 normal（接近 reliable 边界）', function () {
  // avg=4.33
  var r = computeTrustScore(mkReviews([5, 4, 4]))
  eq(r.tier, 'normal')
})

// --- computeTrustScore: watch tier ---
section('computeTrustScore · watch tier（avg<3.0 && count≥3）')

test('count=3 avg=2.0 是 watch 待观察', function () {
  var r = computeTrustScore(mkReviews([2, 2, 2]))
  eq(r.tier, 'watch')
  eq(r.label, '待观察')
  eq(r.count, 3)
  eq(r.score, 2.0)
})

test('count=3 avg=2.99 是 watch（接近边界）', function () {
  // avg=3.0 是 normal，avg<3.0 是 watch
  var r = computeTrustScore(mkReviews([3, 3, 2])) // sum=8, avg≈2.67 → watch
  eq(r.tier, 'watch')
})

test('count=5 avg=1.0 是 watch', function () {
  var r = computeTrustScore(mkReviews([1, 1, 1, 1, 1]))
  eq(r.tier, 'watch')
  eq(r.score, 1.0)
})

// --- score 保留 1 位小数 ---
section('score 保留 1 位小数')

test('avg=4.85 → score=4.9（Math.round 四舍五入，区分 floor）', function () {
  // 20 个评价：17个5分 + 3个4分 = 97/20 = 4.85，round(48.5)=49→4.9, floor(48.5)=48→4.8
  var ratings = []
  for (var i = 0; i < 17; i++) ratings.push(5)
  for (var j = 0; j < 3; j++) ratings.push(4)
  var r = computeTrustScore(mkReviews(ratings))
  eq(r.score, 4.9)
})

test('avg=4.9 → score=4.9（整数 * 10 无小数，round=floor）', function () {
  // 10 个评价：9个5分 + 1个4分 = 49/10 = 4.9
  var r = computeTrustScore(mkReviews([5, 5, 5, 5, 5, 5, 5, 5, 5, 4]))
  eq(r.score, 4.9)
})

test('avg=4.333... → score=4.3', function () {
  var r = computeTrustScore(mkReviews([5, 4, 4])) // avg=4.333
  eq(r.score, 4.3)
})

// --- 防御性输入 ---
section('防御性输入')

test('非数组返回默认 newbie', function () {
  deepEq(computeTrustScore(null), { score: 5.0, count: 0, label: '新手', tier: 'newbie' })
  deepEq(computeTrustScore(undefined), { score: 5.0, count: 0, label: '新手', tier: 'newbie' })
  deepEq(computeTrustScore('notarray'), { score: 5.0, count: 0, label: '新手', tier: 'newbie' })
  deepEq(computeTrustScore(123), { score: 5.0, count: 0, label: '新手', tier: 'newbie' })
  deepEq(computeTrustScore({}), { score: 5.0, count: 0, label: '新手', tier: 'newbie' })
})

test('rating 非整数按 5 处理（善意）', function () {
  // rating='abc' 非法 → 按 5
  var r = computeTrustScore([{ rating: 'abc' }, { rating: 5 }, { rating: 5 }])
  eq(r.count, 3)
  // sum = 5(非法按5) + 5 + 5 = 15, avg=5.0
  eq(r.score, 5.0)
  eq(r.tier, 'reliable') // count=3, avg=5.0
})

test('rating 为 null/undefined 按 5 处理', function () {
  var r = computeTrustScore([{ rating: null }, { rating: undefined }, { rating: 5 }])
  eq(r.count, 3)
  eq(r.score, 5.0)
})

test('评价对象为 null/undefined 按 rating=5 处理', function () {
  var r = computeTrustScore([null, undefined, { rating: 5 }])
  eq(r.count, 3)
  eq(r.score, 5.0)
})

// --- isValidReview ---
section('isValidReview')

test('合法评价 rating 1-5 整数', function () {
  ok(isValidReview({ rating: 1 }))
  ok(isValidReview({ rating: 3 }))
  ok(isValidReview({ rating: 5 }))
})

test('非法 rating 被拒绝', function () {
  ok(!isValidReview({ rating: 0 }))
  ok(!isValidReview({ rating: 6 }))
  ok(!isValidReview({ rating: -1 }))
  ok(!isValidReview({ rating: 3.5 }))
  ok(!isValidReview({ rating: '3' }))
  ok(!isValidReview({ rating: NaN }))
  ok(!isValidReview({ rating: null }))
  ok(!isValidReview({ rating: undefined }))
})

test('非对象/空值被拒绝', function () {
  ok(!isValidReview(null))
  ok(!isValidReview(undefined))
  ok(!isValidReview('string'))
  ok(!isValidReview(123))
  ok(!isValidReview({}))
})

// --- tierFromScore ---
section('tierFromScore')

test('count<3 返回 newbie', function () {
  eq(tierFromScore(5.0, 0), 'newbie')
  eq(tierFromScore(5.0, 1), 'newbie')
  eq(tierFromScore(5.0, 2), 'newbie')
})

test('count≥10 avg≥4.8 返回 gold', function () {
  eq(tierFromScore(4.8, 10), 'gold')
  eq(tierFromScore(5.0, 20), 'gold')
})

test('count<10 avg≥4.5 返回 reliable', function () {
  eq(tierFromScore(4.5, 3), 'reliable')
  eq(tierFromScore(4.8, 9), 'reliable') // count<10 不够 gold
})

test('avg 3.0-4.5 返回 normal', function () {
  eq(tierFromScore(3.0, 3), 'normal')
  eq(tierFromScore(4.0, 5), 'normal')
  eq(tierFromScore(4.49, 3), 'normal')
})

test('avg<3.0 返回 watch', function () {
  eq(tierFromScore(2.0, 3), 'watch')
  eq(tierFromScore(2.99, 10), 'watch')
})

test('tierFromScore 防御非法输入', function () {
  // score 非法 → 默认 5.0，count=5 ≥ 3 且 5.0≥4.5 → reliable
  eq(tierFromScore(NaN, 5), 'reliable')
  // count 非法 → 默认 0 → newbie
  eq(tierFromScore(5.0, -1), 'newbie')
  // 两者都非法 → score=5.0, count=0 → newbie
  eq(tierFromScore('abc', 'x'), 'newbie')
  // score 非法但 count<3 → newbie 优先
  eq(tierFromScore(NaN, 2), 'newbie')
})

// --- getTierWeight ---
section('getTierWeight')

test('已知 tier 返回对应权重', function () {
  eq(getTierWeight('gold'), 1.2)
  eq(getTierWeight('reliable'), 1.0)
  eq(getTierWeight('normal'), 1.0)
  eq(getTierWeight('newbie'), 0.8)
  eq(getTierWeight('watch'), 0.3)
})

test('未知 tier 返回 normal 基准权重 1.0', function () {
  eq(getTierWeight('unknown'), 1.0)
  eq(getTierWeight(''), 1.0)
  eq(getTierWeight(null), 1.0)
  eq(getTierWeight(undefined), 1.0)
})

// --- getTierLabel ---
section('getTierLabel')

test('已知 tier 返回对应中文标签', function () {
  eq(getTierLabel('newbie'), '新手')
  eq(getTierLabel('gold'), '金牌搭子')
  eq(getTierLabel('reliable'), '靠谱')
  eq(getTierLabel('normal'), '普通')
  eq(getTierLabel('watch'), '待观察')
})

test('未知 tier 返回 普通', function () {
  eq(getTierLabel('unknown'), '普通')
  eq(getTierLabel(''), '普通')
  eq(getTierLabel(null), '普通')
})

// ===== 结果汇总 =====

console.log('\n========================================')
console.log('trust-score.test.js 结果：')
console.log('  通过: ' + passed)
console.log('  失败: ' + failed)
if (failures.length > 0) {
  console.log('  失败详情:')
  failures.forEach(function (f) { console.log('    - ' + f) })
}
console.log('========================================')

process.exit(failed > 0 ? 1 : 0)
