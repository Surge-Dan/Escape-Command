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

// === Case A: 10 条 micro 记录，duration 中位数 20 → 推荐 20min ===
// 注：matchTier 区间边界为 15/25/45，median=20 落在 [15,25) → 档位 20
testCase('Case A: 10 条 micro 记录中位数 20', () => {
  const records = []
  for (let i = 0; i < 10; i++) {
    records.push({ id: 'r_' + (1000 + i), mode: 'micro', duration: 20 })
  }
  const result = recommendDuration(records)
  assert(result.duration === 20, '应推荐 20min，实际 ' + result.duration)
  assert(result.isRecommended === true, 'isRecommended 应为 true')
})

// === Case B: 2 条 micro 记录 → 推荐 15min（兜底），isRecommended=false ===
testCase('Case B: 2 条 micro 记录（不足 3 条）', () => {
  const records = [
    { id: 'r_100', mode: 'micro', duration: 10 },
    { id: 'r_101', mode: 'micro', duration: 20 }
  ]
  const result = recommendDuration(records)
  assert(result.duration === 15, '应推荐 15min（兜底），实际 ' + result.duration)
  assert(result.isRecommended === false, 'isRecommended 应为 false')
})

// === Case C: records 为空数组 → 推荐 15min，isRecommended=false ===
testCase('Case C: records 为空数组', () => {
  const result = recommendDuration([])
  assert(result.duration === 15, '应推荐 15min（兜底），实际 ' + result.duration)
  assert(result.isRecommended === false, 'isRecommended 应为 false')
})

// === Case D: 5 条记录中位数 12 → 推荐 10min ===
// durations [14,10,20,8,12] 升序 [8,10,12,14,20]，中位数=12，12<15 → 档位 10
testCase('Case D: 5 条 micro 记录中位数 12', () => {
  const records = [
    { id: 'r_1', mode: 'micro', duration: 14 },
    { id: 'r_2', mode: 'micro', duration: 10 },
    { id: 'r_3', mode: 'micro', duration: 20 },
    { id: 'r_4', mode: 'micro', duration: 8 },
    { id: 'r_5', mode: 'micro', duration: 12 }
  ]
  const result = recommendDuration(records)
  assert(result.duration === 10, '应推荐 10min，实际 ' + result.duration)
  assert(result.isRecommended === true, 'isRecommended 应为 true')
})

// === Case E: 5 条记录中位数 35 → 推荐 30min ===
// durations [40,30,35,25,30] 升序 [25,30,30,35,40]，中位数=30，25≤30<45 → 档位 30
testCase('Case E: 5 条 micro 记录中位数 30', () => {
  const records = [
    { id: 'r_1', mode: 'micro', duration: 40 },
    { id: 'r_2', mode: 'micro', duration: 30 },
    { id: 'r_3', mode: 'micro', duration: 35 },
    { id: 'r_4', mode: 'micro', duration: 25 },
    { id: 'r_5', mode: 'micro', duration: 30 }
  ]
  const result = recommendDuration(records)
  assert(result.duration === 30, '应推荐 30min，实际 ' + result.duration)
  assert(result.isRecommended === true, 'isRecommended 应为 true')
})

// === Case F: 5 条记录中位数 50 → 推荐 60min ===
testCase('Case F: 5 条 micro 记录中位数 50', () => {
  const records = [
    { id: 'r_1', mode: 'micro', duration: 45 },
    { id: 'r_2', mode: 'micro', duration: 50 },
    { id: 'r_3', mode: 'micro', duration: 55 },
    { id: 'r_4', mode: 'micro', duration: 60 },
    { id: 'r_5', mode: 'micro', duration: 50 }
  ]
  const result = recommendDuration(records)
  assert(result.duration === 60, '应推荐 60min，实际 ' + result.duration)
  assert(result.isRecommended === true, 'isRecommended 应为 true')
})

// === Case G: 混合模式记录，只算 micro ===
testCase('Case G: 混合模式记录，只过滤 micro', () => {
  const records = [
    { id: 'r_1', mode: 'walk', duration: 30 },
    { id: 'r_2', mode: 'micro', duration: 20 },
    { id: 'r_3', mode: 'breakthrough', duration: 25 },
    { id: 'r_4', mode: 'micro', duration: 20 },
    { id: 'r_5', mode: 'micro', duration: 20 }
  ]
  const result = recommendDuration(records)
  // 只算 3 条 micro：20/20/20，中位数 20
  assert(result.duration === 20, '应推荐 20min，实际 ' + result.duration)
  assert(result.isRecommended === true, 'isRecommended 应为 true')
})

// === Case H: null/undefined 输入 ===
testCase('Case H: null/undefined 输入', () => {
  assert(recommendDuration(null).duration === 15, 'null 输入应返回 15')
  assert(recommendDuration(undefined).duration === 15, 'undefined 输入应返回 15')
  assert(recommendDuration(null).isRecommended === false, 'null 输入 isRecommended 应为 false')
})

// === Case I: 11 条记录只取最近 10 条 ===
// id 倒序取最近 10 条：r_999 > r_9 > ... > r_1 > r_0，取前 10 = r_999,r_9,...,r_1（r_0 被排除）
// 这 10 条 duration: 20,10,10,10,10,10,10,10,10,10 → 升序 [10×9,20] → 中位数 (10+10)/2=10 → 档位 10
testCase('Case I: 11 条记录只取最近 10 条', () => {
  const records = []
  // 11 条，前 10 条 duration=10，最后 1 条（id 最大）duration=20
  for (let i = 0; i < 10; i++) {
    records.push({ id: 'r_' + i, mode: 'micro', duration: 10 })
  }
  records.push({ id: 'r_999', mode: 'micro', duration: 20 })
  const result = recommendDuration(records)
  assert(result.duration === 10, '应推荐 10min，实际 ' + result.duration)
  assert(result.isRecommended === true, 'isRecommended 应为 true')
})

console.log('\n==========')
console.log('Passed: ' + passed + ', Failed: ' + failed)
console.log('==========')
if (failed > 0) process.exit(1)
