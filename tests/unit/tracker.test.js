// tests/unit/tracker.test.js
// B3 数据埋点工具单元测试
// 运行: node tests/unit/tracker.test.js

'use strict'

const tracker = require('../../utils/tracker.js')

let passCount = 0
let failCount = 0
const failures = []

function test(name, fn) {
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

function assertEqual(a, b, msg) {
  if (a !== b) throw new Error(msg || 'expected=' + JSON.stringify(b) + ' actual=' + JSON.stringify(a))
}

function assertTrue(v, msg) { if (!v) throw new Error(msg || '应为 true') }
function assertFalse(v, msg) { if (v) throw new Error(msg || '应为 false') }

// ===== 内存版 ctx 工厂 =====
function makeCtx() {
  const store = {}
  let timeCounter = 1000
  return {
    storage: {
      get: function (k) { return Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null },
      set: function (k, v) { store[k] = v }
    },
    time: function () { return ++timeCounter },
    _store: store
  }
}

console.log('\n=== tracker 单元测试 ===\n')

// ============================================================
console.log('--- isValidEventName ---')
// ============================================================
test('合法事件名', function () {
  assertTrue(tracker.isValidEventName('click_btn'))
  assertTrue(tracker.isValidEventName('quick_match_enter'))
  assertTrue(tracker.isValidEventName('a'))
  assertTrue(tracker.isValidEventName('_start'))
})

test('非法事件名', function () {
  assertFalse(tracker.isValidEventName('Click'))   // 大写
  assertFalse(tracker.isValidEventName('1abc'))    // 数字开头
  assertFalse(tracker.isValidEventName('click-btn')) // 连字符
  assertFalse(tracker.isValidEventName('click.btn')) // 点
  assertFalse(tracker.isValidEventName('中文'))     // 中文
  assertFalse(tracker.isValidEventName(''))         // 空
  assertFalse(tracker.isValidEventName(null))
  assertFalse(tracker.isValidEventName(123))
  assertFalse(tracker.isValidEventName('a'.repeat(65))) // 超长
})

// ============================================================
console.log('\n--- sanitizeProps ---')
// ============================================================
test('剔除 function/undefined/symbol', function () {
  const sym = Symbol('x')
  const out = tracker.sanitizeProps({
    a: 1,
    b: 'str',
    c: function () {},
    d: undefined,
    e: sym,
    f: null,
    g: true
  })
  assertEqual(out.a, 1)
  assertEqual(out.b, 'str')
  assertTrue(!('c' in out), 'function 应被剔除')
  assertTrue(!('d' in out), 'undefined 应被剔除')
  assertTrue(!('e' in out), 'symbol 应被剔除')
  assertEqual(out.f, null)
  assertEqual(out.g, true)
})

test('嵌套对象浅拷贝', function () {
  const out = tracker.sanitizeProps({
    obj: { x: 1, y: function () {}, z: 'ok' },
    arr: [1, 2, function () {}, 3, undefined]
  })
  assertEqual(out.obj.x, 1)
  assertEqual(out.obj.z, 'ok')
  assertTrue(!('y' in out.obj), '嵌套 function 应被剔除')
  assertEqual(out.arr.length, 3)
  assertEqual(out.arr[0], 1)
  assertEqual(out.arr[2], 3)
})

test('非对象入参返回空对象', function () {
  assertEqual(Object.keys(tracker.sanitizeProps(null)).length, 0)
  assertEqual(Object.keys(tracker.sanitizeProps(undefined)).length, 0)
  assertEqual(Object.keys(tracker.sanitizeProps('str')).length, 0)
  assertEqual(Object.keys(tracker.sanitizeProps(123)).length, 0)
  assertEqual(Object.keys(tracker.sanitizeProps([1, 2])).length, 0)
})

test('嵌套对象字段数上限 50', function () {
  const big = {}
  for (var i = 0; i < 100; i++) big['k' + i] = i
  const out = tracker.sanitizeProps({ obj: big })
  assertEqual(Object.keys(out.obj).length, 50)
})

test('数组字段数上限 50', function () {
  const bigArr = []
  for (var i = 0; i < 100; i++) bigArr.push(i)
  const out = tracker.sanitizeProps({ arr: bigArr })
  assertEqual(out.arr.length, 50)
})

// ============================================================
console.log('\n--- buildEvent ---')
// ============================================================
test('构造合法事件', function () {
  const evt = tracker.buildEvent('click_btn', { x: 1 }, 1000, 'sid_abc')
  assertTrue(!!evt)
  assertEqual(evt.name, 'click_btn')
  assertEqual(evt.props.x, 1)
  assertEqual(evt.ts, 1000)
  assertEqual(evt.session_id, 'sid_abc')
  assertTrue(typeof evt.id === 'string' && evt.id.length > 0)
})

test('非法事件名返回 null', function () {
  const evt = tracker.buildEvent('BadName', {}, 1000, 'sid')
  assertEqual(evt, null)
})

test('事件 id 唯一性（同 ts 也能区分）', function () {
  const e1 = tracker.buildEvent('a', {}, 1000, 's')
  const e2 = tracker.buildEvent('a', {}, 1000, 's')
  assertTrue(e1.id !== e2.id, '同 ts 的 event id 应不同（含随机数）')
})

// ============================================================
console.log('\n--- truncate ---')
// ============================================================
test('FIFO 截断', function () {
  const arr = []
  for (var i = 0; i < 100; i++) arr.push({ i: i })
  const out = tracker.truncate(arr, 50)
  assertEqual(out.length, 50)
  assertEqual(out[0].i, 50)
  assertEqual(out[49].i, 99)
})

test('不超过上限时原样返回', function () {
  const arr = [{ a: 1 }, { a: 2 }]
  const out = tracker.truncate(arr, 50)
  assertEqual(out.length, 2)
})

test('默认上限 MAX_EVENTS=500', function () {
  const arr = []
  for (var i = 0; i < 600; i++) arr.push({ i: i })
  const out = tracker.truncate(arr)
  assertEqual(out.length, 500)
  assertEqual(out[0].i, 100)
})

test('非数组入参返回空数组', function () {
  assertEqual(tracker.truncate(null).length, 0)
  assertEqual(tracker.truncate('x').length, 0)
})

// ============================================================
console.log('\n--- track ---')
// ============================================================
test('track 写入 storage', function () {
  const ctx = makeCtx()
  const r = tracker.track('click_btn', { x: 1 }, ctx)
  assertTrue(r.ok)
  assertTrue(!!r.eventId)
  const events = tracker.getEvents(ctx)
  assertEqual(events.length, 1)
  assertEqual(events[0].name, 'click_btn')
  assertEqual(events[0].props.x, 1)
})

test('track 非法事件名返回错误', function () {
  const ctx = makeCtx()
  const r = tracker.track('BadName', {}, ctx)
  assertFalse(r.ok)
  assertEqual(r.errCode, 'INVALID_NAME')
})

test('track 多次写入累积', function () {
  const ctx = makeCtx()
  tracker.track('a', {}, ctx)
  tracker.track('b', {}, ctx)
  tracker.track('c', {}, ctx)
  const events = tracker.getEvents(ctx)
  assertEqual(events.length, 3)
  assertEqual(events[0].name, 'a')
  assertEqual(events[1].name, 'b')
  assertEqual(events[2].name, 'c')
})

test('track 超过上限自动截断', function () {
  const ctx = makeCtx()
  for (var i = 0; i < 550; i++) tracker.track('evt_' + i, {}, ctx)
  const events = tracker.getEvents(ctx)
  assertEqual(events.length, 500)
  // 前 50 个被丢弃
  assertEqual(events[0].name, 'evt_50')
  assertEqual(events[499].name, 'evt_549')
})

test('track 自动注入 session_id', function () {
  const ctx = makeCtx()
  tracker.track('a', {}, ctx)
  const events = tracker.getEvents(ctx)
  assertTrue(typeof events[0].session_id === 'string')
  assertTrue(events[0].session_id.length > 0)
})

test('track 自动注入 id 和 ts', function () {
  const ctx = makeCtx()
  const r = tracker.track('a', {}, ctx)
  const events = tracker.getEvents(ctx)
  assertEqual(events[0].id, r.eventId)
  assertEqual(events[0].ts, r.ts)
})

// ============================================================
console.log('\n--- trackBatch ---')
// ============================================================
test('trackBatch 批量写入', function () {
  const ctx = makeCtx()
  const r = tracker.trackBatch([
    { name: 'a', props: { x: 1 } },
    { name: 'b', props: { x: 2 } },
    { name: 'c', props: { x: 3 } }
  ], ctx)
  assertTrue(r.ok)
  assertEqual(r.added, 3)
  assertEqual(r.skipped, 0)
  assertEqual(tracker.getEvents(ctx).length, 3)
})

test('trackBatch 跳过非法项', function () {
  const ctx = makeCtx()
  const r = tracker.trackBatch([
    { name: 'a', props: {} },
    null,
    { name: 'BadName', props: {} },
    { name: 'b', props: {} },
    'not object'
  ], ctx)
  assertEqual(r.added, 2)
  assertEqual(r.skipped, 3)
})

test('trackBatch 非数组入参返回错误', function () {
  const ctx = makeCtx()
  const r = tracker.trackBatch('not array', ctx)
  assertFalse(r.ok)
  assertEqual(r.errCode, 'NOT_ARRAY')
})

test('trackBatch ts 递增（避免同 ts 冲突）', function () {
  const ctx = makeCtx()
  tracker.trackBatch([
    { name: 'a', props: {} },
    { name: 'b', props: {} },
    { name: 'c', props: {} }
  ], ctx)
  const events = tracker.getEvents(ctx)
  assertTrue(events[0].ts < events[1].ts)
  assertTrue(events[1].ts < events[2].ts)
})

// ============================================================
console.log('\n--- getEvents / clearEvents ---')
// ============================================================
test('getEvents 空存储返回空数组', function () {
  const ctx = makeCtx()
  assertEqual(tracker.getEvents(ctx).length, 0)
})

test('clearEvents 清空', function () {
  const ctx = makeCtx()
  tracker.track('a', {}, ctx)
  tracker.track('b', {}, ctx)
  const r = tracker.clearEvents(ctx)
  assertTrue(r.ok)
  assertEqual(tracker.getEvents(ctx).length, 0)
})

// ============================================================
console.log('\n--- getSessionId ---')
// ============================================================
test('getSessionId 首次生成并持久化', function () {
  const ctx = makeCtx()
  const s1 = tracker.getSessionId(ctx)
  const s2 = tracker.getSessionId(ctx)
  assertTrue(typeof s1 === 'string' && s1.length > 0)
  assertEqual(s1, s2, '同 ctx 下应返回相同 session_id')
})

// ============================================================
console.log('\n--- summarize ---')
// ============================================================
test('summarize 按 name 聚合', function () {
  const events = [
    { name: 'a', ts: 100 },
    { name: 'a', ts: 200 },
    { name: 'b', ts: 150 },
    { name: 'a', ts: 300 }
  ]
  const s = tracker.summarize(events)
  assertEqual(s.total, 4)
  assertEqual(s.byName.a, 3)
  assertEqual(s.byName.b, 1)
  assertEqual(s.firstTs, 100)
  assertEqual(s.lastTs, 300)
  assertEqual(s.spanMs, 200)
})

test('summarize 空数组', function () {
  const s = tracker.summarize([])
  assertEqual(s.total, 0)
  assertEqual(s.spanMs, 0)
})

test('summarize 非数组入参', function () {
  const s = tracker.summarize(null)
  assertEqual(s.total, 0)
})

test('summarize 跳过非法事件', function () {
  const events = [
    { name: 'a', ts: 100 },
    null,
    { name: 'b' },  // 无 ts
    'not object',
    { name: 'a', ts: 200 }
  ]
  const s = tracker.summarize(events)
  assertEqual(s.total, 3)
  assertEqual(s.byName.a, 2)
  assertEqual(s.byName.b, 1)
})

// ============================================================
console.log('\n--- defaultCtx ---')
// ============================================================
test('defaultCtx 在 Node 环境降级', function () {
  const ctx = tracker.defaultCtx()
  // Node 环境下 wx 不存在
  assertEqual(ctx.storage.get('any_key'), null)
  assertNoThrow(function () {
    ctx.storage.set('any_key', 'val')
  })
  assertTrue(typeof ctx.time() === 'number')
})

function assertNoThrow(fn, msg) {
  try { fn() } catch (e) { throw new Error(msg || '不应抛异常: ' + e.message) }
}

// ============================================================
console.log('\n' + '='.repeat(60))
console.log('  tracker 单元测试结果')
console.log('='.repeat(60))
console.log('  通过: ' + passCount + ' / 失败: ' + failCount)
if (failures.length > 0) {
  console.log('\n  失败项:')
  failures.forEach(function (f) { console.log('    ✗ ' + f) })
}
console.log('='.repeat(60))

process.exit(failCount > 0 ? 1 : 0)
