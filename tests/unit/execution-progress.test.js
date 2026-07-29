// tests/unit/execution-progress.test.js
// execution-progress 单元测试
// 运行: node tests/unit/execution-progress.test.js
//
// 覆盖维度：
//   1. initProgress：初始化 steps 全 done=false/completedAt=null，currentStep=0
//   2. markStepDone：写 completedAt；已完成不覆盖（留痕不可篡改）；越界原样返回；currentStep 更新
//   3. mergeProgress：合并 done 状态；无 progress 返回全 false；保留 hint 等页面字段
//   4. recompute：统计 doneCount/allDone；全完成 currentStep=最后一步（避免 -1）
//   5. isAllDone：全完成 true；空/false
//   6. 不变性：不污染入参；completedAt 单调递增
//
// 测试设计目标：杀掉 mutation-test.js 中针对 execution-progress 的全部变异算子。

'use strict'

const ep = require('../../utils/execution-progress.js')

// ===== 自定义测试框架（与 record-builder.test.js 风格一致）=====
let passCount = 0
let failCount = 0
const failures = []
const groups = []

function assert(cond, msg) {
  if (cond) {
    passCount++
  } else {
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

// 固定时间戳序列（便于 completedAt 断言可复现、单调递增）
const T0 = 1700000000000
const T1 = T0 + 1000
const T2 = T0 + 2000
const T3 = T0 + 3000

// ============================================================
// initProgress
// ============================================================
describe('initProgress', function () {
  it('字符串数组初始化为 {id,text,done,completedAt}', function () {
    const p = ep.initProgress(['出门', '拍照', '记录'])
    assertEqual(p.steps.length, 3, 'steps 长度')
    assertEqual(p.steps[0].text, '出门', 'step0 text')
    assertEqual(p.steps[0].id, 1, 'step0 id')
    assertEqual(p.steps[0].done, false, 'step0 done')
    assertEqual(p.steps[0].completedAt, null, 'step0 completedAt')
    assertEqual(p.currentStep, 0, 'currentStep')
    assert(typeof p.lastActiveAt === 'number', 'lastActiveAt 是数字')
  })

  it('对象数组初始化取 text 字段', function () {
    const p = ep.initProgress([{ text: 'A' }, { text: 'B' }])
    assertEqual(p.steps[0].text, 'A', '取 text')
    assertEqual(p.steps[1].text, 'B', '取 text2')
  })

  it('空数组/非数组兜底', function () {
    assertEqual(ep.initProgress([]).steps.length, 0, '空数组')
    assertEqual(ep.initProgress(null).steps.length, 0, 'null')
    assertEqual(ep.initProgress(undefined).steps.length, 0, 'undefined')
    assertEqual(ep.initProgress('abc').steps.length, 0, '字符串')
  })
})

// ============================================================
// markStepDone
// ============================================================
describe('markStepDone', function () {
  it('标记第 0 步完成写 completedAt', function () {
    const p = ep.initProgress(['A', 'B', 'C'])
    const p2 = ep.markStepDone(p, 0, T1)
    assertEqual(p2.steps[0].done, true, 'step0 done')
    assertEqual(p2.steps[0].completedAt, T1, 'step0 completedAt')
    assertEqual(p2.steps[1].done, false, 'step1 未完成')
    assertEqual(p2.currentStep, 1, 'currentStep 指向下一个未完成')
    assertEqual(p2.lastActiveAt, T1, 'lastActiveAt 更新')
  })

  it('已完成不覆盖 completedAt（留痕不可篡改）', function () {
    const p = ep.initProgress(['A', 'B'])
    const p2 = ep.markStepDone(p, 0, T1)
    const p3 = ep.markStepDone(p2, 0, T2)
    assertEqual(p3.steps[0].done, true, '仍 done')
    assertEqual(p3.steps[0].completedAt, T1, 'completedAt 保持 T1 不被 T2 覆盖')
  })

  it('completedAt 单调递增（多步依次完成）', function () {
    const p = ep.initProgress(['A', 'B', 'C'])
    const p2 = ep.markStepDone(p, 0, T1)
    const p3 = ep.markStepDone(p2, 1, T2)
    const p4 = ep.markStepDone(p3, 2, T3)
    assert(p4.steps[0].completedAt < p4.steps[1].completedAt, '0<1')
    assert(p4.steps[1].completedAt < p4.steps[2].completedAt, '1<2')
  })

  it('全完成时 currentStep 指向最后一步（非 -1）', function () {
    const p = ep.initProgress(['A', 'B'])
    let cur = p
    cur = ep.markStepDone(cur, 0, T1)
    cur = ep.markStepDone(cur, 1, T2)
    assertEqual(ep.isAllDone(cur), true, '全完成')
    assertEqual(cur.currentStep, 1, 'currentStep=最后一步索引（length-1）')
    assert(cur.currentStep >= 0, 'currentStep 非负')
  })

  it('越界 index 原样返回（防御）', function () {
    const p = ep.initProgress(['A', 'B'])
    assert(ep.markStepDone(p, -1, T1) === p, '负 index 原样返回')
    assert(ep.markStepDone(p, 5, T1) === p, '超长 index 原样返回')
    assert(ep.markStepDone(p, 2, T1) === p, '边界 index=length 原样返回')
  })

  it('非整数 index 原样返回', function () {
    const p = ep.initProgress(['A'])
    assert(ep.markStepDone(p, 0.5, T1) === p, '小数 index 原样返回')
    assert(ep.markStepDone(p, 'x', T1) === p, '字符串 index 原样返回')
  })

  it('null/非对象 progress 原样返回', function () {
    assert(ep.markStepDone(null, 0, T1) === null, 'null')
    assert(ep.markStepDone(undefined, 0, T1) === undefined, 'undefined')
  })

  it('now 缺省时用 Date.now()', function () {
    const p = ep.initProgress(['A'])
    const before = Date.now()
    const p2 = ep.markStepDone(p, 0)
    const after = Date.now()
    assert(p2.steps[0].completedAt >= before && p2.steps[0].completedAt <= after, 'completedAt 在合理区间')
  })

  it('不污染入参（返回新对象）', function () {
    const p = ep.initProgress(['A', 'B'])
    const snapshot = JSON.stringify(p)
    ep.markStepDone(p, 0, T1)
    assertEqual(JSON.stringify(p), snapshot, '入参未被修改')
  })
})

// ============================================================
// mergeProgress
// ============================================================
describe('mergeProgress', function () {
  it('合并持久化 done 状态到新 steps', function () {
    const steps = [
      { id: 1, text: 'A', hint: 'h1', done: false },
      { id: 2, text: 'B', hint: 'h2', done: false }
    ]
    const progress = ep.initProgress(['A', 'B'])
    const marked = ep.markStepDone(progress, 0, T1)
    const merged = ep.mergeProgress(steps, marked)
    assertEqual(merged.steps[0].done, true, 'step0 恢复 done')
    assertEqual(merged.steps[0].completedAt, T1, 'step0 恢复 completedAt')
    assertEqual(merged.steps[0].hint, 'h1', '保留 hint 字段')
    assertEqual(merged.steps[1].done, false, 'step1 未完成')
    assertEqual(merged.doneCount, 1, 'doneCount')
    assertEqual(merged.currentStep, 1, 'currentStep')
  })

  it('无 progress 返回全 false', function () {
    const steps = [{ id: 1, text: 'A', done: false }]
    const m1 = ep.mergeProgress(steps, null)
    assertEqual(m1.steps[0].done, false, 'null progress')
    const m2 = ep.mergeProgress(steps, undefined)
    assertEqual(m2.steps[0].done, false, 'undefined progress')
    const m3 = ep.mergeProgress(steps, {})
    assertEqual(m3.steps[0].done, false, '空对象 progress')
  })

  it('全完成恢复 allDone=true', function () {
    const steps = [{ id: 1, text: 'A' }, { id: 2, text: 'B' }]
    let p = ep.initProgress(['A', 'B'])
    p = ep.markStepDone(p, 0, T1)
    p = ep.markStepDone(p, 1, T2)
    const merged = ep.mergeProgress(steps, p)
    assertEqual(merged.allDone, true, 'allDone')
    assertEqual(merged.doneCount, 2, 'doneCount=2')
  })

  it('不污染入参 steps', function () {
    const steps = [{ id: 1, text: 'A', done: false }]
    const progress = ep.markStepDone(ep.initProgress(['A']), 0, T1)
    const snapshot = JSON.stringify(steps)
    ep.mergeProgress(steps, progress)
    assertEqual(JSON.stringify(steps), snapshot, 'steps 未被修改')
  })
})

// ============================================================
// recompute
// ============================================================
describe('recompute', function () {
  it('统计 doneCount/allDone/currentStep', function () {
    const r = ep.recompute([
      { done: true }, { done: false }, { done: true }
    ])
    assertEqual(r.doneCount, 2, 'doneCount')
    assertEqual(r.allDone, false, 'allDone')
    assertEqual(r.currentStep, 1, 'currentStep=第一个未完成')
  })

  it('全完成 currentStep=最后一步', function () {
    const r = ep.recompute([{ done: true }, { done: true }])
    assertEqual(r.allDone, true, 'allDone')
    assertEqual(r.currentStep, 1, 'currentStep=最后一步')
    assert(r.currentStep >= 0, '非负')
  })

  it('空数组 allDone=false', function () {
    const r = ep.recompute([])
    assertEqual(r.allDone, false, '空 allDone=false')
    assertEqual(r.doneCount, 0, '空 doneCount=0')
  })
})

// ============================================================
// isAllDone
// ============================================================
describe('isAllDone', function () {
  it('全完成 true', function () {
    let p = ep.initProgress(['A', 'B'])
    p = ep.markStepDone(p, 0, T1)
    p = ep.markStepDone(p, 1, T2)
    assertEqual(ep.isAllDone(p), true, '全完成')
  })

  it('部分完成 false', function () {
    let p = ep.initProgress(['A', 'B'])
    p = ep.markStepDone(p, 0, T1)
    assertEqual(ep.isAllDone(p), false, '部分完成')
  })

  it('空/null false', function () {
    assertEqual(ep.isAllDone(null), false, 'null')
    assertEqual(ep.isAllDone({ steps: [] }), false, '空 steps')
    assertEqual(ep.isAllDone({}), false, '无 steps')
  })
})

// ============================================================
// 冷启动恢复模拟（端到端）
// ============================================================
describe('冷启动恢复端到端', function () {
  it('执行第2步后退出 → 冷启动恢复 → 第1/2步已完成', function () {
    // 模拟 executing.onLoad 首次初始化
    const rawSteps = ['出门', '拍照', '记录']
    let cmd = { steps: rawSteps }
    cmd.executionProgress = ep.initProgress(rawSteps)
    // 完成第 0、1 步
    cmd.executionProgress = ep.markStepDone(cmd.executionProgress, 0, T1)
    cmd.executionProgress = ep.markStepDone(cmd.executionProgress, 1, T2)
    // 模拟 saveCurrentCommand 落盘后冷启动（cmd 从 storage 恢复，含 executionProgress）
    const restored = JSON.parse(JSON.stringify(cmd))
    // 冷启动后 onLoad 重建 steps
    const pageSteps = rawSteps.map(function (s, i) {
      return { id: i + 1, text: s, hint: 'h' + i, done: false }
    })
    const merged = ep.mergeProgress(pageSteps, restored.executionProgress)
    assertEqual(merged.steps[0].done, true, 'step0 恢复完成')
    assertEqual(merged.steps[1].done, true, 'step1 恢复完成')
    assertEqual(merged.steps[2].done, false, 'step2 仍待完成')
    assertEqual(merged.doneCount, 2, 'doneCount=2')
    assertEqual(merged.currentStep, 2, 'currentStep=2（下一个未完成）')
    assertEqual(merged.steps[0].completedAt, T1, 'step0 completedAt 留痕')
    assertEqual(merged.steps[1].completedAt, T2, 'step1 completedAt 留痕')
  })
})

// ============================================================
// 结果
// ============================================================
console.log('\n' + '='.repeat(60))
if (failCount === 0) {
  console.log('Execution Progress 单元测试结果: ' + passCount + ' passed, 0 failed')
} else {
  console.log('Execution Progress 单元测试结果: ' + passCount + ' passed, ' + failCount + ' failed')
  console.log('失败用例:')
  failures.forEach(function (f) { console.log('  ✗ ' + f) })
}
console.log('='.repeat(60))
process.exit(failCount > 0 ? 1 : 0)
