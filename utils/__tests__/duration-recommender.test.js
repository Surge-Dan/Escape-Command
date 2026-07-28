// 测试 utils/duration-recommender.js
const { recommendDuration } = require('../duration-recommender.js')

let passed = 0
let failed = 0

function assert(condition, msg) {
  if (condition) {
    console.log('  ✓ ' + msg)
    passed++
  } else {
    console.log('  ✗ ' + msg)
    failed++
  }
}

function testCase(name, fn) {
  console.log('\n[Case] ' + name)
  fn()
}

// === Case A: 10 条 micro 记录，duration 中位数 15 → 推荐 15min ===
// 注：matchTier 区间边界为 7.5/12.5/17.5，median=15 落在 [12.5,17.5) → 档位 15
testCase('Case A: 10 条 micro 记录中位数 15', () => {
  const records = []
  for (let i = 0; i < 10; i++) {
    records.push({ id: 'r_' + (1000 + i), mode: 'micro', duration: 15 })
  }
  const result = recommendDuration(records)
  assert(result.duration === 15, '应推荐 15min，实际 ' + result.duration)
  assert(result.isRecommended === true, 'isRecommended 应为 true')
})

// === Case B: 2 条 micro 记录 → 推荐 15min，isRecommended=false ===
testCase('Case B: 2 条 micro 记录（不足 3 条）', () => {
  const records = [
    { id: 'r_100', mode: 'micro', duration: 10 },
    { id: 'r_101', mode: 'micro', duration: 20 }
  ]
  const result = recommendDuration(records)
  assert(result.duration === 15, '应推荐 15min，实际 ' + result.duration)
  assert(result.isRecommended === false, 'isRecommended 应为 false')
})

// === Case C: records 为空数组 → 推荐 15min，isRecommended=false ===
testCase('Case C: records 为空数组', () => {
  const result = recommendDuration([])
  assert(result.duration === 15, '应推荐 15min，实际 ' + result.duration)
  assert(result.isRecommended === false, 'isRecommended 应为 false')
})

// === 额外 Case D: 5 条记录中位数 11 → 推荐 10min ===
// durations [12,10,14,8,11] 升序 [8,10,11,12,14]，中位数=11，11<12.5 → 档位 10
testCase('Case D: 5 条 micro 记录中位数 11', () => {
  const records = [
    { id: 'r_1', mode: 'micro', duration: 12 },
    { id: 'r_2', mode: 'micro', duration: 10 },
    { id: 'r_3', mode: 'micro', duration: 14 },
    { id: 'r_4', mode: 'micro', duration: 8 },
    { id: 'r_5', mode: 'micro', duration: 11 }
  ]
  const result = recommendDuration(records)
  assert(result.duration === 10, '应推荐 10min，实际 ' + result.duration)
  assert(result.isRecommended === true, 'isRecommended 应为 true')
})

// === 额外 Case E: 混合模式记录，只算 micro ===
testCase('Case E: 混合模式记录，只过滤 micro', () => {
  const records = [
    { id: 'r_1', mode: 'walk', duration: 30 },
    { id: 'r_2', mode: 'micro', duration: 10 },
    { id: 'r_3', mode: 'breakthrough', duration: 25 },
    { id: 'r_4', mode: 'micro', duration: 15 },
    { id: 'r_5', mode: 'micro', duration: 20 }
  ]
  const result = recommendDuration(records)
  // 只算 3 条 micro：10/15/20，中位数 15
  assert(result.duration === 15, '应推荐 15min，实际 ' + result.duration)
  assert(result.isRecommended === true, 'isRecommended 应为 true')
})

// === 额外 Case F: null/undefined 输入 ===
testCase('Case F: null/undefined 输入', () => {
  assert(recommendDuration(null).duration === 15, 'null 输入应返回 15')
  assert(recommendDuration(undefined).duration === 15, 'undefined 输入应返回 15')
  assert(recommendDuration(null).isRecommended === false, 'null 输入 isRecommended 应为 false')
})

// === 额外 Case G: 11 条记录只取最近 10 条 ===
// id 倒序取最近 10 条：r_999 > r_9 > ... > r_1 > r_0，取前 10 = r_999,r_9,...,r_1（r_0 被排除）
// 这 10 条 duration: 20,5,5,5,5,5,5,5,5,5 → 升序 [5×9,20] → 中位数 (5+5)/2=5 → 档位 5
testCase('Case G: 11 条记录只取最近 10 条', () => {
  const records = []
  // 11 条，前 10 条 duration=5，最后 1 条（id 最大）duration=20
  for (let i = 0; i < 10; i++) {
    records.push({ id: 'r_' + i, mode: 'micro', duration: 5 })
  }
  records.push({ id: 'r_999', mode: 'micro', duration: 20 })
  const result = recommendDuration(records)
  assert(result.duration === 5, '应推荐 5min，实际 ' + result.duration)
  assert(result.isRecommended === true, 'isRecommended 应为 true')
})

console.log('\n==========')
console.log('Passed: ' + passed + ', Failed: ' + failed)
console.log('==========')
if (failed > 0) process.exit(1)
