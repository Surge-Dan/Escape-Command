// tests/unit/arrival-helper.test.js
// arrival-helper 单元测试（B2 执行页阶段感设计）
// 运行: node tests/unit/arrival-helper.test.js
//
// 覆盖维度：
//   1. calcDistance Haversine 距离计算正确性
//   2. isArrived 到达判定（距离阈值/非法输入）
//   3. splitSteps 步骤分组（hidden 标记）
//   4. buildPhaseView 阶段视图构建（出发前/到达后）
//   5. shouldShowArriveBtn 按钮显示判定
//   6. 不变性：不污染入参
//   7. 边界：空数组/null/非法类型不抛异常

'use strict'

const arrival = require('../../utils/arrival-helper.js')

let passCount = 0
let failCount = 0
const failures = []
const groups = []

function assert(cond, msg) {
  if (cond) { passCount++ } else {
    failCount++
    const where = groups.length ? groups.join(' > ') : '(root)'
    failures.push(where + ': ' + (msg || '(no message)'))
  }
}

function assertEqual(actual, expected, msg) {
  const ok = actual === expected
  if (!ok) {
    const where = groups.length ? groups.join(' > ') : '(root)'
    failures.push(where + ': ' + (msg || 'assertEqual') + ' | expected=' + JSON.stringify(expected) + ' actual=' + JSON.stringify(actual))
  }
  if (ok) passCount++
  else failCount++
}

function describe(name, fn) {
  groups.push(name)
  console.log('\n=== ' + name + ' ===')
  fn()
  groups.pop()
}

function it(name, fn) {
  groups.push(name)
  fn()
  groups.pop()
}

// ============================================================
// 1. calcDistance 距离计算
// ============================================================
describe('calcDistance 距离计算', function () {
  it('相同点距离为 0', function () {
    const d = arrival.calcDistance(39.9, 116.4, 39.9, 116.4)
    assert(d < 1, '距离应 < 1米')
  })
  it('近距离约 111m（0.001度）', function () {
    const d = arrival.calcDistance(39.9, 116.4, 39.901, 116.4)
    assert(d > 80 && d < 130, '距离应 80-130m，实际 ' + d)
  })
  it('距离对称性', function () {
    const d1 = arrival.calcDistance(39.9, 116.4, 31.2, 121.5)
    const d2 = arrival.calcDistance(31.2, 121.5, 39.9, 116.4)
    assert(Math.abs(d1 - d2) < 0.01, '距离应对称')
  })
})

// ============================================================
// 2. isArrived 到达判定
// ============================================================
describe('isArrived 到达判定', function () {
  it('距离内返回 arrived:true', function () {
    const r = arrival.isArrived(
      { latitude: 39.9, longitude: 116.4 },
      { latitude: 39.9, longitude: 116.4 },
      100
    )
    assertEqual(r.arrived, true)
    assertEqual(r.distance, 0)
  })
  it('距离外返回 arrived:false', function () {
    const r = arrival.isArrived(
      { latitude: 39.9, longitude: 116.4 },
      { latitude: 39.95, longitude: 116.4 },
      100
    )
    assertEqual(r.arrived, false)
    assert(r.distance > 100, '距离应 > 100m')
  })
  it('默认阈值 100m', function () {
    const r = arrival.isArrived(
      { latitude: 39.9, longitude: 116.4 },
      { latitude: 39.9005, longitude: 116.4 }
    )
    assertEqual(r.arrived, true, '约55m应在100m内')
  })
  it('自定义阈值 150m', function () {
    const r = arrival.isArrived(
      { latitude: 39.9, longitude: 116.4 },
      { latitude: 39.901, longitude: 116.4 },
      150
    )
    assertEqual(r.arrived, true, '约111m应在150m内')
  })
  it('null userLoc 返回 arrived:false', function () {
    const r = arrival.isArrived(null, { latitude: 39.9, longitude: 116.4 }, 100)
    assertEqual(r.arrived, false)
    assertEqual(r.distance, -1)
  })
  it('null targetLoc 返回 arrived:false', function () {
    const r = arrival.isArrived({ latitude: 39.9, longitude: 116.4 }, null, 100)
    assertEqual(r.arrived, false)
  })
  it('NaN 坐标返回 arrived:false', function () {
    const r = arrival.isArrived(
      { latitude: NaN, longitude: 116.4 },
      { latitude: 39.9, longitude: 116.4 },
      100
    )
    assertEqual(r.arrived, false)
  })
  it('Infinity 坐标返回 arrived:false', function () {
    const r = arrival.isArrived(
      { latitude: 39.9, longitude: 116.4 },
      { latitude: Infinity, longitude: 116.4 },
      100
    )
    assertEqual(r.arrived, false)
  })
})

// ============================================================
// 3. splitSteps 步骤分组
// ============================================================
describe('splitSteps 步骤分组', function () {
  const steps = [
    { id: 1, text: 'step1', hidden: false },
    { id: 2, text: 'step2', hidden: false },
    { id: 3, text: 'step3', hidden: true },
    { id: 4, text: 'step4', hidden: true }
  ]

  it('正确分组 before/after', function () {
    const r = arrival.splitSteps(steps)
    assertEqual(r.beforeArrival.length, 2)
    assertEqual(r.afterArrival.length, 2)
    assertEqual(r.beforeArrival[0].id, 1)
    assertEqual(r.afterArrival[0].id, 3)
  })
  it('无 hidden 步骤时 afterArrival 为空', function () {
    const noHidden = [
      { id: 1, hidden: false },
      { id: 2, hidden: false }
    ]
    const r = arrival.splitSteps(noHidden)
    assertEqual(r.beforeArrival.length, 2)
    assertEqual(r.afterArrival.length, 0)
  })
  it('全部 hidden 时 beforeArrival 为空', function () {
    const allHidden = [
      { id: 1, hidden: true },
      { id: 2, hidden: true }
    ]
    const r = arrival.splitSteps(allHidden)
    assertEqual(r.beforeArrival.length, 0)
    assertEqual(r.afterArrival.length, 2)
  })
  it('无 hidden 标记的步骤归入 beforeArrival', function () {
    const noMark = [{ id: 1, text: 'a' }, { id: 2, text: 'b' }]
    const r = arrival.splitSteps(noMark)
    assertEqual(r.beforeArrival.length, 2)
    assertEqual(r.afterArrival.length, 0)
  })
  it('非数组输入返回空分组', function () {
    assertEqual(arrival.splitSteps(null).beforeArrival.length, 0)
    assertEqual(arrival.splitSteps(undefined).beforeArrival.length, 0)
    assertEqual(arrival.splitSteps('abc').beforeArrival.length, 0)
  })
  it('不污染入参', function () {
    const original = steps.slice()
    arrival.splitSteps(steps)
    assertEqual(steps.length, original.length)
  })
})

// ============================================================
// 4. buildPhaseView 阶段视图
// ============================================================
describe('buildPhaseView 阶段视图', function () {
  const steps = [
    { id: 1, hidden: false },
    { id: 2, hidden: false },
    { id: 3, hidden: true },
    { id: 4, hidden: true }
  ]

  it('未到达时仅展示非 hidden 步骤', function () {
    const r = arrival.buildPhaseView(steps, false)
    assertEqual(r.phase, 'before')
    assertEqual(r.steps.length, 2)
    assertEqual(r.hiddenCount, 2)
  })
  it('到达后展示全部步骤', function () {
    const r = arrival.buildPhaseView(steps, true)
    assertEqual(r.phase, 'after')
    assertEqual(r.steps.length, 4)
    assertEqual(r.hiddenCount, 0)
  })
  it('无 hidden 步骤时出发前展示全部', function () {
    const noHidden = [{ id: 1, hidden: false }, { id: 2, hidden: false }]
    const r = arrival.buildPhaseView(noHidden, false)
    assertEqual(r.steps.length, 2)
    assertEqual(r.hiddenCount, 0)
  })
  it('非数组输入返回空视图', function () {
    const r = arrival.buildPhaseView(null, false)
    assertEqual(r.steps.length, 0)
    assertEqual(r.phase, 'before')
  })
})

// ============================================================
// 5. shouldShowArriveBtn 按钮显示判定
// ============================================================
describe('shouldShowArriveBtn 按钮显示判定', function () {
  it('有 hidden 步骤 + 未到达 → true', function () {
    const steps = [{ id: 1, hidden: false }, { id: 2, hidden: true }]
    assertEqual(arrival.shouldShowArriveBtn(steps, false), true)
  })
  it('有 hidden 步骤 + 已到达 → false', function () {
    const steps = [{ id: 1, hidden: false }, { id: 2, hidden: true }]
    assertEqual(arrival.shouldShowArriveBtn(steps, true), false)
  })
  it('无 hidden 步骤 + 未到达 → false', function () {
    const steps = [{ id: 1, hidden: false }, { id: 2, hidden: false }]
    assertEqual(arrival.shouldShowArriveBtn(steps, false), false)
  })
  it('空数组 → false', function () {
    assertEqual(arrival.shouldShowArriveBtn([], false), false)
  })
  it('null → false', function () {
    assertEqual(arrival.shouldShowArriveBtn(null, false), false)
  })
})

// ============================================================
// 最终报告
// ============================================================
console.log('\n' + '='.repeat(60))
console.log('  arrival-helper 单元测试结果')
console.log('='.repeat(60))
console.log('  通过: ' + passCount + ' / 失败: ' + failCount)
if (failures.length > 0) {
  console.log('\n  失败项:')
  failures.forEach(function (f) { console.log('    ✗ ' + f) })
}
console.log('='.repeat(60))

process.exit(failCount > 0 ? 1 : 0)
