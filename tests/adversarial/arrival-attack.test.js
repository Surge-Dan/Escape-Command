// tests/adversarial/arrival-attack.test.js
// arrival-helper 对抗式测试（B2 执行页阶段感设计 / 到达确认）
// 运行: node tests/adversarial/arrival-attack.test.js
//
// 攻击向量覆盖：
//   1. 距离计算（非法坐标/极端值/NaN/Infinity/类型混淆）
//   2. 到达判定（伪造位置/越界阈值/原型链污染）
//   3. 步骤分组（伪造 hidden/类型混淆/空对象/原型链）
//   4. 阶段视图（一致性不变量/到达状态切换/空数组）
//   5. 按钮显示（伪造 arrived/篡改 steps/边界攻击）
//   6. 不变量：到达后步骤数 ≥ 出发前步骤数；阶段视图永不返回 undefined

'use strict'

const arrival = require('../../utils/arrival-helper.js')

let passCount = 0
let failCount = 0
const failures = []

function attack(name, fn) {
  try {
    fn()
    passCount++
    console.log('  ✓ ' + name)
  } catch (e) {
    failCount++
    failures.push(name + ': ' + e.message)
    console.log('  ✗ ' + name + ' → ' + e.message)
  }
}

function assertThrow(fn, msg) {
  let threw = false
  try { fn() } catch (e) { threw = true }
  if (!threw) throw new Error(msg || '应抛异常但未抛')
}

function assertNoThrow(fn, msg) {
  try { fn() } catch (e) { throw new Error(msg || '不应抛异常: ' + e.message) }
}

function assertEqual(a, b, msg) {
  if (a !== b) throw new Error(msg || 'expected=' + JSON.stringify(b) + ' actual=' + JSON.stringify(a))
}

function assertTrue(v, msg) {
  if (!v) throw new Error(msg || '应为 true')
}

function assertFalse(v, msg) {
  if (v) throw new Error(msg || '应为 false')
}

console.log('\n=== arrival-attack 对抗式测试 ===\n')

// ============================================================
// 1. 距离计算（非法坐标/极端值/NaN/Infinity/类型混淆）
// ============================================================
console.log('--- 1. 距离计算攻击 ---')

attack('calcDistance NaN 坐标', function () {
  assertNoThrow(function () {
    const d = arrival.calcDistance(NaN, NaN, NaN, NaN)
    assertTrue(isNaN(d) || typeof d === 'number', '应返回数值')
  }, 'NaN 坐标不应抛异常')
})

attack('calcDistance Infinity 经度', function () {
  assertNoThrow(function () {
    arrival.calcDistance(39.9, Infinity, 31.2, 121.5)
  }, 'Infinity 不应抛异常')
})

attack('calcDistance 字符串坐标', function () {
  const d = arrival.calcDistance('39.9', '116.4', '31.2', '121.5')
  // 字符串参与算术运算被隐式转换，仍可得到数值
  assertTrue(typeof d === 'number', '应返回数值')
})

attack('calcDistance null 坐标', function () {
  // null 在算术运算中转为 0，calcDistance 不抛异常但结果可能无意义
  assertNoThrow(function () {
    arrival.calcDistance(null, null, null, null)
  }, 'null 不应抛异常')
})

attack('calcDistance undefined 坐标', function () {
  assertNoThrow(function () {
    arrival.calcDistance(undefined, undefined, undefined, undefined)
  }, 'undefined 不应抛异常')
})

attack('calcDistance 极端坐标 90,180,-90,-180', function () {
  const d = arrival.calcDistance(90, 180, -90, -180)
  assertTrue(d >= 0 && isFinite(d), '极端坐标应返回有限非负数值')
})

attack('calcDistance 相同坐标返回 0', function () {
  const d = arrival.calcDistance(39.9, 116.4, 39.9, 116.4)
  assertEqual(Math.round(d), 0, '相同点距离应为 0')
})

attack('calcDistance 对称性：A→B == B→A', function () {
  const d1 = arrival.calcDistance(39.9, 116.4, 31.2, 121.5)
  const d2 = arrival.calcDistance(31.2, 121.5, 39.9, 116.4)
  // 对称性是 Haversine 的不变量
  assertTrue(Math.abs(d1 - d2) < 1, 'Haversine 应满足对称性')
})

attack('calcDistance 超大数值 1e300', function () {
  assertNoThrow(function () {
    arrival.calcDistance(1e300, 1e300, 1e300, 1e300)
  }, '超大数值不应抛异常')
})

attack('calcDistance 数组入参', function () {
  assertNoThrow(function () {
    arrival.calcDistance([39.9], [116.4], [31.2], [121.5])
  }, '数组入参不应抛异常')
})

// ============================================================
// 2. 到达判定（伪造位置/越界阈值/原型链污染）
// ============================================================
console.log('\n--- 2. 到达判定攻击 ---')

attack('isArrived null 位置', function () {
  const r = arrival.isArrived(null, null, 100)
  assertFalse(r.arrived, 'null 位置不应判定到达')
  assertEqual(r.distance, -1, 'null 位置 distance 应为 -1')
})

attack('isArrived undefined 位置', function () {
  const r = arrival.isArrived(undefined, undefined, 100)
  assertFalse(r.arrived, 'undefined 不应判定到达')
  assertEqual(r.distance, -1, 'undefined distance 应为 -1')
})

attack('isArrived 缺失 latitude', function () {
  const r = arrival.isArrived({ longitude: 116.4 }, { latitude: 39.9, longitude: 116.4 }, 100)
  assertFalse(r.arrived, '缺失 latitude 不应判定到达')
})

attack('isArrived 缺失 longitude', function () {
  const r = arrival.isArrived({ latitude: 39.9 }, { latitude: 39.9, longitude: 116.4 }, 100)
  assertFalse(r.arrived, '缺失 longitude 不应判定到达')
})

attack('isArrived NaN 纬度', function () {
  const r = arrival.isArrived({ latitude: NaN, longitude: 116.4 }, { latitude: 39.9, longitude: 116.4 }, 100)
  assertFalse(r.arrived, 'NaN 纬度不应判定到达')
  assertEqual(r.distance, -1, 'NaN 纬度 distance 应为 -1')
})

attack('isArrived Infinity 经度', function () {
  const r = arrival.isArrived({ latitude: 39.9, longitude: Infinity }, { latitude: 39.9, longitude: 116.4 }, 100)
  assertFalse(r.arrived, 'Infinity 经度不应判定到达')
})

attack('isArrived 字符串坐标（应被严格类型校验拒绝）', function () {
  const r = arrival.isArrived({ latitude: '39.9', longitude: '116.4' }, { latitude: '39.9', longitude: '116.4' }, 100)
  assertFalse(r.arrived, '字符串坐标应被拒绝')
  assertEqual(r.distance, -1, '字符串坐标 distance 应为 -1')
})

attack('isArrived 阈值 0 应使用默认值', function () {
  // 阈值 0 不是有效正数，应回退到默认 100
  const r = arrival.isArrived({ latitude: 39.9, longitude: 116.4 }, { latitude: 39.9, longitude: 116.4 }, 0)
  assertTrue(r.arrived, '相同点 + 阈值 0 应使用默认阈值后判定到达')
})

attack('isArrived 负数阈值应使用默认值', function () {
  const r = arrival.isArrived({ latitude: 39.9, longitude: 116.4 }, { latitude: 39.9, longitude: 116.4 }, -100)
  assertTrue(r.arrived, '负数阈值应回退默认后判定到达')
})

attack('isArrived NaN 阈值应使用默认值', function () {
  const r = arrival.isArrived({ latitude: 39.9, longitude: 116.4 }, { latitude: 39.9, longitude: 116.4 }, NaN)
  assertTrue(r.arrived, 'NaN 阈值应回退默认后判定到达')
})

attack('isArrived 字符串阈值 "100" 应使用默认值', function () {
  // typeof '100' !== 'number'，应回退默认 100
  const r = arrival.isArrived({ latitude: 39.9, longitude: 116.4 }, { latitude: 39.9, longitude: 116.4 }, '100')
  assertTrue(r.arrived, '字符串阈值应回退默认')
})

attack('isArrived 超大阈值 1e10 应放行远距离', function () {
  const r = arrival.isArrived({ latitude: 39.9, longitude: 116.4 }, { latitude: 31.2, longitude: 121.5 }, 1e10)
  assertTrue(r.arrived, '超大阈值应放行')
})

attack('isArrived 原型链污染 __proto__', function () {
  const malicious = JSON.parse('{"__proto__": {"latitude": 39.9}}')
  const r = arrival.isArrived(malicious, { latitude: 39.9, longitude: 116.4 }, 100)
  assertNoThrow(function () {}, '不应抛异常')
  // 不通过原型链获取 latitude，应被拒绝
  assertFalse(r.arrived, '不应通过 __proto__ 获取 latitude')
})

attack('isArrived 原型 constructor', function () {
  const malicious = { constructor: { prototype: { latitude: 39.9 } } }
  const r = arrival.isArrived(malicious, { latitude: 39.9, longitude: 116.4 }, 100)
  assertNoThrow(function () {}, '不应抛异常')
  assertFalse(r.arrived, '不应通过 constructor 篡改')
})

attack('isArrived 150m 边界：149m 到达 / 151m 未到达', function () {
  // 北京纬度附近，经度每 0.001 约 85m，0.00176 ≈ 150m
  const r1 = arrival.isArrived(
    { latitude: 39.9, longitude: 116.4 },
    { latitude: 39.9, longitude: 116.4 + 0.00170 },
    150
  )
  const r2 = arrival.isArrived(
    { latitude: 39.9, longitude: 116.4 },
    { latitude: 39.9, longitude: 116.4 + 0.00180 },
    150
  )
  assertTrue(r1.arrived, '149m 内应到达')
  assertFalse(r2.arrived, '151m 外不应到达')
})

attack('isArrived distance 返回值为整数', function () {
  const r = arrival.isArrived(
    { latitude: 39.9, longitude: 116.4 },
    { latitude: 39.9001, longitude: 116.4001 },
    1000
  )
  assertEqual(r.distance % 1, 0, 'distance 应为四舍五入的整数')
})

// ============================================================
// 3. 步骤分组（伪造 hidden/类型混淆/空对象/原型链）
// ============================================================
console.log('\n--- 3. 步骤分组攻击 ---')

attack('splitSteps null 入参', function () {
  const r = arrival.splitSteps(null)
  assertEqual(r.beforeArrival.length, 0, 'null 应返回空 before')
  assertEqual(r.afterArrival.length, 0, 'null 应返回空 after')
})

attack('splitSteps undefined 入参', function () {
  const r = arrival.splitSteps(undefined)
  assertEqual(r.beforeArrival.length, 0, 'undefined 应返回空')
  assertEqual(r.afterArrival.length, 0, 'undefined 应返回空')
})

attack('splitSteps 字符串入参', function () {
  const r = arrival.splitSteps('not an array')
  assertEqual(r.beforeArrival.length, 0, '字符串应返回空')
})

attack('splitSteps 数字入参', function () {
  const r = arrival.splitSteps(12345)
  assertEqual(r.beforeArrival.length, 0, '数字应返回空')
})

attack('splitSteps 含 null 元素', function () {
  const r = arrival.splitSteps([null, { id: 'a', hidden: true }, undefined, { id: 'b' }])
  // null/undefined 应进入 before（非 hidden 分支）
  assertEqual(r.beforeArrival.length, 3, 'null/undefined 应进 before')
  assertEqual(r.afterArrival.length, 1, 'hidden:true 进 after')
})

attack('splitSteps 伪造 hidden:"true"（字符串）', function () {
  const r = arrival.splitSteps([{ id: 'a', hidden: 'true' }])
  // 严格 === true，字符串 'true' 不通过
  assertEqual(r.afterArrival.length, 0, '字符串 hidden 不应进 after')
  assertEqual(r.beforeArrival.length, 1, '应进 before')
})

attack('splitSteps 伪造 hidden:1（数字）', function () {
  const r = arrival.splitSteps([{ id: 'a', hidden: 1 }])
  assertEqual(r.afterArrival.length, 0, '数字 hidden 不应进 after')
})

attack('splitSteps 伪造 hidden:{}（对象）', function () {
  const r = arrival.splitSteps([{ id: 'a', hidden: {} }])
  assertEqual(r.afterArrival.length, 0, '对象 hidden 不应进 after')
})

attack('splitSteps 空对象元素', function () {
  const r = arrival.splitSteps([{}, {}, {}])
  assertEqual(r.beforeArrival.length, 3, '空对象应进 before')
  assertEqual(r.afterArrival.length, 0, '无 hidden 应不进 after')
})

attack('splitSteps 全部 hidden', function () {
  const r = arrival.splitSteps([{ id: 'a', hidden: true }, { id: 'b', hidden: true }])
  assertEqual(r.beforeArrival.length, 0, '全 hidden 时 before 应为空')
  assertEqual(r.afterArrival.length, 2, '应全部进 after')
})

attack('splitSteps 原型链污染 __proto__', function () {
  const malicious = JSON.parse('[{"id":"a","__proto__":{"hidden":true}}]')
  const r = arrival.splitSteps(malicious)
  assertNoThrow(function () {}, '不应抛异常')
  assertEqual(r.afterArrival.length, 0, '不应通过原型链获取 hidden')
})

attack('splitSteps 超大数组 10000', function () {
  const arr = []
  for (var i = 0; i < 10000; i++) arr.push({ id: i, hidden: i % 2 === 0 })
  const r = arrival.splitSteps(arr)
  assertEqual(r.beforeArrival.length, 5000, '一半应进 before')
  assertEqual(r.afterArrival.length, 5000, '一半应进 after')
})

// ============================================================
// 4. 阶段视图（一致性不变量/到达状态切换/空数组）
// ============================================================
console.log('\n--- 4. 阶段视图攻击 ---')

attack('buildPhaseView null 入参', function () {
  const r = arrival.buildPhaseView(null, false)
  assertEqual(r.steps.length, 0, 'null 应返回空 steps')
  assertEqual(r.phase, 'before', '默认 phase=before')
  assertEqual(r.hiddenCount, 0, 'hiddenCount=0')
})

attack('buildPhaseView 字符串入参', function () {
  const r = arrival.buildPhaseView('not an array', false)
  assertEqual(r.steps.length, 0, '字符串应返回空')
  assertEqual(r.phase, 'before', 'phase=before')
})

attack('buildPhaseView 空数组 arrived=false', function () {
  const r = arrival.buildPhaseView([], false)
  assertEqual(r.steps.length, 0, '空数组应返回空')
  assertEqual(r.phase, 'before', 'phase=before')
  assertEqual(r.hiddenCount, 0, 'hiddenCount=0')
})

attack('buildPhaseView 空数组 arrived=true', function () {
  const r = arrival.buildPhaseView([], true)
  assertEqual(r.steps.length, 0, '空数组到达后也应返回空')
  assertEqual(r.phase, 'after', 'phase=after')
  assertEqual(r.hiddenCount, 0, 'hiddenCount=0')
})

attack('buildPhaseView 不变量：到达后步骤数 ≥ 出发前步骤数', function () {
  const steps = [
    { id: 1 }, { id: 2 },
    { id: 3, hidden: true }, { id: 4, hidden: true }
  ]
  const before = arrival.buildPhaseView(steps, false)
  const after = arrival.buildPhaseView(steps, true)
  assertTrue(after.steps.length >= before.steps.length, '到达后步骤数应 ≥ 出发前')
  assertEqual(after.steps.length, 4, '到达后应展示全部 4 步')
  assertEqual(before.steps.length, 2, '出发前应仅展示 2 步')
  assertEqual(before.hiddenCount, 2, 'hiddenCount=2')
  assertEqual(after.hiddenCount, 0, '到达后 hiddenCount=0')
})

attack('buildPhaseView 到达状态切换一致性', function () {
  const steps = [{ id: 1 }, { id: 2, hidden: true }]
  const r1 = arrival.buildPhaseView(steps, false)
  const r2 = arrival.buildPhaseView(steps, true)
  assertEqual(r1.phase, 'before', '初始 phase=before')
  assertEqual(r2.phase, 'after', '到达后 phase=after')
  // 同一输入下，beforeCount + afterCount 应等于总长度
  assertEqual(r1.beforeCount + r1.afterCount, 2, 'before+after=total')
  assertEqual(r2.beforeCount + r2.afterCount, 2, 'before+after=total')
})

attack('buildPhaseView 全部 hidden arrived=false', function () {
  const steps = [{ id: 1, hidden: true }, { id: 2, hidden: true }]
  const r = arrival.buildPhaseView(steps, false)
  assertEqual(r.steps.length, 0, '全部 hidden 出发前应返回空 steps')
  assertEqual(r.hiddenCount, 2, 'hiddenCount=2')
})

attack('buildPhaseView 全部 hidden arrived=true', function () {
  const steps = [{ id: 1, hidden: true }, { id: 2, hidden: true }]
  const r = arrival.buildPhaseView(steps, true)
  assertEqual(r.steps.length, 2, '到达后应展示全部')
  assertEqual(r.hiddenCount, 0, 'hiddenCount=0')
})

attack('buildPhaseView 伪造 arrived:"true"（字符串）', function () {
  // 字符串 'true' 是 truthy，会被当作 true 处理
  const steps = [{ id: 1 }, { id: 2, hidden: true }]
  const r = arrival.buildPhaseView(steps, 'true')
  assertEqual(r.phase, 'after', '字符串 truthy 应被当作 arrived=true')
  assertEqual(r.steps.length, 2, '应展示全部')
})

attack('buildPhaseView 伪造 arrived:0（数字 0 应为 falsy）', function () {
  const steps = [{ id: 1 }, { id: 2, hidden: true }]
  const r = arrival.buildPhaseView(steps, 0)
  assertEqual(r.phase, 'before', '0 应为 falsy')
  assertEqual(r.steps.length, 1, '应仅展示非 hidden')
})

attack('buildPhaseView 不返回 undefined/null', function () {
  // 关键不变量：任何输入都不应返回 undefined/null
  const inputs = [null, undefined, [], [{}], [{ hidden: true }], 'x', 123]
  for (var i = 0; i < inputs.length; i++) {
    const r1 = arrival.buildPhaseView(inputs[i], false)
    const r2 = arrival.buildPhaseView(inputs[i], true)
    assertTrue(r1 && typeof r1 === 'object', 'arrived=false 不应返回 undefined')
    assertTrue(r2 && typeof r2 === 'object', 'arrived=true 不应返回 undefined')
    assertTrue(Array.isArray(r1.steps), 'steps 必须是数组')
    assertTrue(Array.isArray(r2.steps), 'steps 必须是数组')
  }
})

// ============================================================
// 5. 按钮显示（伪造 arrived/篡改 steps/边界攻击）
// ============================================================
console.log('\n--- 5. 按钮显示攻击 ---')

attack('shouldShowArriveBtn arrived=true 时一律返回 false', function () {
  // 即使有 hidden 步骤，arrived=true 也不应显示按钮
  const steps = [{ id: 1, hidden: true }, { id: 2, hidden: true }]
  assertFalse(arrival.shouldShowArriveBtn(steps, true), 'arrived=true 不应显示')
})

attack('shouldShowArriveBtn arrived="truthy" 应返回 false', function () {
  // truthy 字符串 'yes' 会被当作 arrived=true
  const steps = [{ id: 1, hidden: true }]
  assertFalse(arrival.shouldShowArriveBtn(steps, 'yes'), 'truthy arrived 不应显示')
})

attack('shouldShowArriveBtn 无 hidden 步骤应返回 false', function () {
  const steps = [{ id: 1 }, { id: 2 }]
  assertFalse(arrival.shouldShowArriveBtn(steps, false), '无 hidden 不应显示')
})

attack('shouldShowArriveBtn null steps', function () {
  assertFalse(arrival.shouldShowArriveBtn(null, false), 'null steps 不应显示')
})

attack('shouldShowArriveBtn undefined steps', function () {
  assertFalse(arrival.shouldShowArriveBtn(undefined, false), 'undefined 不应显示')
})

attack('shouldShowArriveBtn 字符串 steps', function () {
  assertFalse(arrival.shouldShowArriveBtn('not array', false), '字符串不应显示')
})

attack('shouldShowArriveBtn 数字 steps', function () {
  assertFalse(arrival.shouldShowArriveBtn(123, false), '数字不应显示')
})

attack('shouldShowArriveBtn 伪造 hidden:"true"', function () {
  // 严格 === true，字符串 'true' 不应触发显示
  assertFalse(arrival.shouldShowArriveBtn([{ hidden: 'true' }], false), '字符串 hidden 不应触发')
})

attack('shouldShowArriveBtn 伪造 hidden:1', function () {
  assertFalse(arrival.shouldShowArriveBtn([{ hidden: 1 }], false), '数字 hidden 不应触发')
})

attack('shouldShowArriveBtn 含 null 元素', function () {
  // null 元素不应触发（s && s.hidden === true 守卫）
  assertFalse(arrival.shouldShowArriveBtn([null, undefined], false), 'null 元素不应触发')
})

attack('shouldShowArriveBtn 原型链污染', function () {
  const malicious = JSON.parse('[{"__proto__":{"hidden":true}}]')
  assertFalse(arrival.shouldShowArriveBtn(malicious, false), '不应通过原型链触发')
})

attack('shouldShowArriveBtn 超大数组', function () {
  const arr = []
  for (var i = 0; i < 10000; i++) arr.push({ id: i, hidden: i === 9999 })
  assertTrue(arrival.shouldShowArriveBtn(arr, false), '含 hidden 应触发显示')
})

attack('shouldShowArriveBtn 全 false hidden', function () {
  const arr = [{ hidden: false }, { hidden: false }, { hidden: false }]
  assertFalse(arrival.shouldShowArriveBtn(arr, false), '全 false 不应触发')
})

// ============================================================
// 6. 不变量：到达后步骤数 ≥ 出发前步骤数；阶段视图永不返回 undefined
// ============================================================
console.log('\n--- 6. 不变量校验 ---')

attack('不变量：任意合法输入到达后步骤数 ≥ 出发前', function () {
  // 100 组随机输入验证
  for (var t = 0; t < 100; t++) {
    const len = Math.floor(Math.random() * 20)
    const steps = []
    for (var i = 0; i < len; i++) {
      steps.push({ id: i, hidden: Math.random() < 0.5 })
    }
    const before = arrival.buildPhaseView(steps, false)
    const after = arrival.buildPhaseView(steps, true)
    if (after.steps.length < before.steps.length) {
      throw new Error('到达后步骤数 < 出发前: ' + JSON.stringify({ before: before.steps.length, after: after.steps.length }))
    }
  }
})

attack('不变量：beforeCount + afterCount = total', function () {
  for (var t = 0; t < 50; t++) {
    const len = Math.floor(Math.random() * 20)
    const steps = []
    for (var i = 0; i < len; i++) {
      steps.push({ id: i, hidden: Math.random() < 0.5 })
    }
    const r = arrival.buildPhaseView(steps, false)
    if (r.beforeCount + r.afterCount !== len) {
      throw new Error('before+after != total: ' + JSON.stringify({ ba: r.beforeCount, aa: r.afterCount, total: len }))
    }
  }
})

attack('不变量：到达后 hiddenCount 必为 0', function () {
  for (var t = 0; t < 50; t++) {
    const len = Math.floor(Math.random() * 20)
    const steps = []
    for (var i = 0; i < len; i++) {
      steps.push({ id: i, hidden: Math.random() < 0.5 })
    }
    const r = arrival.buildPhaseView(steps, true)
    if (r.hiddenCount !== 0) throw new Error('到达后 hiddenCount != 0')
  }
})

attack('不变量：isArrived 失败时 distance 必为 -1', function () {
  // 参数校验失败的所有路径都应返回 distance=-1
  const badInputs = [
    [null, null, 100],
    [undefined, undefined, 100],
    [{}, {}, 100],
    [{ latitude: 'x' }, { latitude: 1, longitude: 2 }, 100],
    [{ latitude: NaN, longitude: 1 }, { latitude: 1, longitude: 2 }, 100],
    [{ latitude: 1, longitude: Infinity }, { latitude: 1, longitude: 2 }, 100]
  ]
  for (var i = 0; i < badInputs.length; i++) {
    const r = arrival.isArrived(badInputs[i][0], badInputs[i][1], badInputs[i][2])
    if (r.distance !== -1) throw new Error('参数失败 distance 应为 -1，实际=' + r.distance)
    if (r.arrived !== false) throw new Error('参数失败 arrived 应为 false')
  }
})

attack('不变量：shouldShowArriveBtn 永不抛异常', function () {
  const badInputs = [null, undefined, 'x', 123, [], [null], [{ hidden: 'x' }], [{ hidden: 1 }]]
  for (var i = 0; i < badInputs.length; i++) {
    assertNoThrow(function () {
      arrival.shouldShowArriveBtn(badInputs[i], false)
      arrival.shouldShowArriveBtn(badInputs[i], true)
    }, '任何输入都不应抛异常')
  }
})

// ============================================================
// 最终报告
// ============================================================
console.log('\n' + '='.repeat(60))
console.log('  arrival-attack 对抗式测试结果')
console.log('='.repeat(60))
console.log('  通过: ' + passCount + ' / 失败: ' + failCount)
if (failures.length > 0) {
  console.log('\n  失败项:')
  failures.forEach(function (f) { console.log('    ✗ ' + f) })
}
console.log('='.repeat(60))

process.exit(failCount > 0 ? 1 : 0)
