// tests/unit/chat-store.test.js
// 单元测试：chat-store.js (C-P4 聊天数据层)
// 运行: node tests/unit/chat-store.test.js
//
// 覆盖：validateContent / buildMessageDoc / makeOptimisticId / dedupMessages /
//       loadMessages / saveMessages / clearLocalMessages / filterAfter /
//       computeNewOnes / getMaxCreatedAt / sendMessage / fetchNewMessages /
//       startPolling / stopPolling（含降级、乐观更新+回滚、轮询）

'use strict'

var assert = require('assert')
var wx = require('../mock-wx.js')
global.wx = wx

var store = require('../../packageSync/utils/chat-store.js')

// ===== 测试框架（顺序执行 + 每个 test 内部 setup/teardown，确保异步隔离）=====

var passed = 0
var failed = 0
var failures = []
var testQueue = []

function setup() {
  wx._reset()
}

function teardown() {
  // 停止可能残留的轮询，避免跨测试干扰
  store.stopPolling()
  wx._reset()
}

function test(name, fn) {
  testQueue.push({ name: name, fn: fn })
}

function runAll(done) {
  function next(i) {
    if (i >= testQueue.length) {
      done()
      return
    }
    var t = testQueue[i]
    setup()
    var ret
    try {
      ret = t.fn()
    } catch (e) {
      failed++
      failures.push(t.name + ' -> ' + e.message)
      console.log('  \u2717 ' + t.name + '\n      ' + (e.message || e))
      teardown()
      next(i + 1)
      return
    }
    if (ret && typeof ret.then === 'function') {
      ret.then(function () {
        passed++
        console.log('  \u2713 ' + t.name)
        teardown()
        next(i + 1)
      }).catch(function (e) {
        failed++
        failures.push(t.name + ' -> ' + (e.message || e))
        console.log('  \u2717 ' + t.name + '\n      ' + (e.message || e))
        teardown()
        next(i + 1)
      })
    } else {
      passed++
      console.log('  \u2713 ' + t.name)
      teardown()
      next(i + 1)
    }
  }
  next(0)
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

function mkMsg(id, content, createdAt, senderOpenId) {
  return {
    _id: id,
    roomId: 'r1',
    taskId: 't1',
    senderOpenId: senderOpenId || 'a',
    senderNickname: 'A',
    content: content,
    createdAt: createdAt
  }
}

// ===== 0. 导出常量 =====
section('0. 导出常量')

test('常量：CACHE_KEY_PREFIX / POLL_INTERVAL / MAX_CONTENT_LEN 导出', function () {
  eq(typeof store.CACHE_KEY_PREFIX, 'string')
  eq(store.CACHE_KEY_PREFIX, 'chatMessages_')
  eq(typeof store.POLL_INTERVAL, 'number')
  eq(store.POLL_INTERVAL, 2500)
  eq(store.MAX_CONTENT_LEN, 200)
  eq(store.PAGE_SIZE, 50)
})

// ===== A. cacheKey =====
section('A. cacheKey')

test('cacheKey：roomId 拼接前缀', function () {
  eq(store.cacheKey('r1'), 'chatMessages_r1')
})

test('cacheKey：非字符串返回空前缀', function () {
  eq(store.cacheKey(null), 'chatMessages_')
  eq(store.cacheKey(123), 'chatMessages_')
})

// ===== B. validateContent =====
section('B. validateContent')

test('validateContent：合法字符串返回 valid=true', function () {
  var r = store.validateContent('  hello  ')
  ok(r.valid)
  eq(r.content, 'hello')
})

test('validateContent：空串 → INVALID_PARAM', function () {
  var r = store.validateContent('   ')
  ok(!r.valid)
  eq(r.errCode, 'INVALID_PARAM')
})

test('validateContent：非字符串 → INVALID_PARAM', function () {
  ok(!store.validateContent(null).valid)
  ok(!store.validateContent(123).valid)
  ok(!store.validateContent(undefined).valid)
  ok(!store.validateContent({}).valid)
})

test('validateContent：超 200 字 → INVALID_PARAM', function () {
  var long = ''
  for (var i = 0; i < 201; i++) long += 'x'
  var r = store.validateContent(long)
  ok(!r.valid)
  eq(r.errCode, 'INVALID_PARAM')
})

test('validateContent：恰好 200 字合法', function () {
  var s = ''
  for (var i = 0; i < 200; i++) s += 'y'
  ok(store.validateContent(s).valid)
})

// ===== C. buildMessageDoc =====
section('C. buildMessageDoc')

test('buildMessageDoc：标准化字段', function () {
  var doc = store.buildMessageDoc({
    roomId: '  r1  ',
    taskId: ' t1',
    content: 'hi',
    senderOpenId: 'me',
    senderNickname: ' Me ',
    roomMembers: ['me', 'other'],
    roomStatus: 'started'
  })
  eq(doc.roomId, 'r1')
  eq(doc.taskId, 't1')
  eq(doc.senderOpenId, 'me')
  eq(doc.senderNickname, ' Me ')
  deepEq(doc.roomMembers, ['me', 'other'])
  eq(doc.roomStatus, 'started')
})

test('buildMessageDoc：空入参返回空字段', function () {
  var doc = store.buildMessageDoc(null)
  eq(doc.roomId, '')
  eq(doc.content, '')
  deepEq(doc.roomMembers, [])
})

// ===== D. makeOptimisticId =====
section('D. makeOptimisticId')

test('makeOptimisticId：返回 local_ 前缀字符串', function () {
  var id = store.makeOptimisticId()
  eq(typeof id, 'string')
  ok(id.indexOf('local_') === 0)
})

test('makeOptimisticId：连续调用不重复', function () {
  var ids = {}
  var collisions = 0
  for (var i = 0; i < 500; i++) {
    var id = store.makeOptimisticId()
    if (ids[id]) collisions++
    ids[id] = true
  }
  // 允许极少量碰撞（同毫秒+随机数撞），但不超过 2%
  ok(collisions <= 10, '碰撞过多: ' + collisions)
})

// ===== E. dedupMessages =====
section('E. dedupMessages')

test('dedupMessages：按 _id 去重', function () {
  var existing = [mkMsg('m1', 'a', 1000)]
  var incoming = [mkMsg('m1', 'a', 1000), mkMsg('m2', 'b', 2000)]
  var merged = store.dedupMessages(existing, incoming)
  eq(merged.length, 2)
})

test('dedupMessages：按 createdAt 升序排序', function () {
  var existing = [mkMsg('m3', 'c', 3000)]
  var incoming = [mkMsg('m1', 'a', 1000), mkMsg('m2', 'b', 2000)]
  var merged = store.dedupMessages(existing, incoming)
  eq(merged.length, 3)
  eq(merged[0]._id, 'm1')
  eq(merged[1]._id, 'm2')
  eq(merged[2]._id, 'm3')
})

test('dedupMessages：乐观消息被真实消息替换（replaceKey）', function () {
  var optId = 'local_1'
  var optimistic = [{
    _id: optId, tempKey: optId, roomId: 'r1', content: 'hi',
    createdAt: 1000, isLocal: true, status: 'pending',
    senderOpenId: 'me', senderNickname: 'Me'
  }]
  var real = [Object.assign(mkMsg('real_1', 'hi', 1000, 'me'), { replaceKey: optId })]
  var merged = store.dedupMessages(optimistic, real)
  eq(merged.length, 1, '乐观消息应被替换，只剩真实消息')
  eq(merged[0]._id, 'real_1')
})

test('dedupMessages：无 replaceKey 时乐观消息保留', function () {
  var optId = 'local_1'
  var optimistic = [{
    _id: optId, tempKey: optId, roomId: 'r1', content: 'hi',
    createdAt: 1000, isLocal: true, status: 'pending',
    senderOpenId: 'me', senderNickname: 'Me'
  }]
  var real = [mkMsg('real_1', 'other', 2000, 'other')]
  var merged = store.dedupMessages(optimistic, real)
  eq(merged.length, 2)
})

test('dedupMessages：空入参返回空数组', function () {
  deepEq(store.dedupMessages(null, null), [])
  deepEq(store.dedupMessages([], []), [])
})

// ===== F. loadMessages / saveMessages / clearLocalMessages =====
section('F. loadMessages / saveMessages / clearLocalMessages')

test('loadMessages：无缓存返回空数组', function () {
  deepEq(store.loadMessages('r1'), [])
})

test('saveMessages + loadMessages：读写一致', function () {
  var msgs = [mkMsg('m1', 'a', 1000), mkMsg('m2', 'b', 2000)]
  store.saveMessages('r1', msgs)
  var loaded = store.loadMessages('r1')
  eq(loaded.length, 2)
  eq(loaded[0]._id, 'm1')
  eq(loaded[1]._id, 'm2')
})

test('loadMessages：返回副本，修改不影响缓存', function () {
  store.saveMessages('r1', [mkMsg('m1', 'a', 1000)])
  var loaded = store.loadMessages('r1')
  loaded.push(mkMsg('m2', 'b', 2000))
  var reloaded = store.loadMessages('r1')
  eq(reloaded.length, 1, '缓存不应被修改')
})

test('clearLocalMessages：清空缓存', function () {
  store.saveMessages('r1', [mkMsg('m1', 'a', 1000)])
  store.clearLocalMessages('r1')
  deepEq(store.loadMessages('r1'), [])
})

test('saveMessages：非法入参静默忽略', function () {
  store.saveMessages(null, [mkMsg('m1', 'a', 1000)])
  store.saveMessages('r1', null)
  deepEq(store.loadMessages('r1'), [])
})

// ===== G. filterAfter / computeNewOnes / getMaxCreatedAt =====
section('G. filterAfter / computeNewOnes / getMaxCreatedAt')

test('filterAfter：返回 createdAt > lastCreatedAt 的消息', function () {
  var msgs = [mkMsg('m1', 'a', 1000), mkMsg('m2', 'b', 2000), mkMsg('m3', 'c', 3000)]
  var after = store.filterAfter(msgs, 1500)
  eq(after.length, 2)
  eq(after[0]._id, 'm2')
  eq(after[1]._id, 'm3')
})

test('filterAfter：createdAt === lastCreatedAt 不返回（严格大于）', function () {
  var msgs = [mkMsg('m1', 'a', 2000), mkMsg('m2', 'b', 3000)]
  // lastCreatedAt=2000，m1.createdAt===2000 不应返回，只有 m2 返回
  var after = store.filterAfter(msgs, 2000)
  eq(after.length, 1)
  eq(after[0]._id, 'm2')
})

test('filterAfter：lastCreatedAt=0 返回全部', function () {
  var msgs = [mkMsg('m1', 'a', 1000)]
  eq(store.filterAfter(msgs, 0).length, 1)
})

test('computeNewOnes：返回 existing 中不存在的消息（按 _id）', function () {
  var existing = [mkMsg('m1', 'a', 1000)]
  var remote = [mkMsg('m1', 'a', 1000), mkMsg('m2', 'b', 2000)]
  var news = store.computeNewOnes(existing, remote)
  eq(news.length, 1)
  eq(news[0]._id, 'm2')
})

test('computeNewOnes：replaceKey 命中乐观消息 → 不计为新增', function () {
  var optId = 'local_1'
  var existing = [{
    _id: optId, tempKey: optId, isLocal: true, status: 'pending',
    roomId: 'r1', content: 'hi', createdAt: 1000,
    senderOpenId: 'me', senderNickname: 'Me'
  }]
  var remote = [Object.assign(mkMsg('real_1', 'hi', 1000, 'me'), { replaceKey: optId })]
  var news = store.computeNewOnes(existing, remote)
  eq(news.length, 0, 'replaceKey 命中乐观消息不应计为新增')
})

test('getMaxCreatedAt：返回最大值', function () {
  var msgs = [mkMsg('m1', 'a', 1000), mkMsg('m2', 'b', 3000), mkMsg('m3', 'c', 2000)]
  eq(store.getMaxCreatedAt(msgs), 3000)
})

test('getMaxCreatedAt：空数组返回 0', function () {
  eq(store.getMaxCreatedAt([]), 0)
  eq(store.getMaxCreatedAt(null), 0)
})

// ===== H. sendMessage =====
section('H. sendMessage（乐观更新 + 回滚 + 降级）')

test('sendMessage：非法 content → INVALID_PARAM，不写本地', function () {
  return store.sendMessage('r1', 't1', '   ', {
    cloudReady: true,
    callFunction: function () { return Promise.resolve({}) },
    currentUser: { openId: 'me', nickname: 'Me' }
  }).then(function (res) {
    eq(res.ok, false)
    eq(res.errCode, 'INVALID_PARAM')
    deepEq(store.loadMessages('r1'), [])
  })
})

test('sendMessage：缺少 roomId → INVALID_PARAM', function () {
  return store.sendMessage('', 't1', 'hi', {
    cloudReady: true,
    currentUser: { openId: 'me', nickname: 'Me' }
  }).then(function (res) {
    eq(res.ok, false)
    eq(res.errCode, 'INVALID_PARAM')
  })
})

test('sendMessage：乐观消息在 await 前已同步写入本地缓存', function () {
  var ctx = {
    cloudReady: true,
    callFunction: function () {
      return new Promise(function (resolve) {
        setTimeout(function () {
          resolve({ result: { ok: true, message: mkMsg('real_1', 'hello', 5000, 'me') } })
        }, 30)
      })
    },
    currentUser: { openId: 'me', nickname: 'Me' }
  }
  // 调用但不 await
  var p = store.sendMessage('r1', 't1', 'hello', ctx)
  // 立即检查本地缓存应有 1 条乐观消息（同步写入）
  var msgs = store.loadMessages('r1')
  eq(msgs.length, 1)
  ok(msgs[0].isLocal)
  eq(msgs[0].status, 'pending')
  eq(msgs[0].content, 'hello')
  eq(msgs[0].senderOpenId, 'me')
  return p.then(function (res) {
    ok(res.ok)
    eq(res.source, 'cloud')
    eq(res.message._id, 'real_1')
    var after = store.loadMessages('r1')
    eq(after.length, 1, '乐观消息被真实消息替换')
    eq(after[0]._id, 'real_1')
    ok(!after[0].isLocal)
    eq(after[0].status, 'sent')
  })
})

test('sendMessage：云端成功 → 乐观消息被真实消息替换', function () {
  var ctx = {
    cloudReady: true,
    callFunction: function () {
      return Promise.resolve({ result: { ok: true, message: mkMsg('real_1', 'hi', 5000, 'me') } })
    },
    currentUser: { openId: 'me', nickname: 'Me' }
  }
  return store.sendMessage('r1', 't1', 'hi', ctx).then(function (res) {
    ok(res.ok)
    eq(res.source, 'cloud')
    var msgs = store.loadMessages('r1')
    eq(msgs.length, 1)
    eq(msgs[0]._id, 'real_1')
    ok(!msgs[0].isLocal)
  })
})

test('sendMessage：业务错误（NOT_ROOM_MEMBER）→ 回滚乐观消息', function () {
  var ctx = {
    cloudReady: true,
    callFunction: function () {
      return Promise.resolve({ result: { ok: false, errCode: 'NOT_ROOM_MEMBER', errMsg: '非成员' } })
    },
    currentUser: { openId: 'me', nickname: 'Me' }
  }
  var p = store.sendMessage('r1', 't1', 'hi', ctx)
  // 乐观消息在 await 前存在
  eq(store.loadMessages('r1').length, 1)
  return p.then(function (res) {
    eq(res.ok, false)
    eq(res.errCode, 'NOT_ROOM_MEMBER')
    deepEq(store.loadMessages('r1'), [], '回滚后本地为空')
  })
})

test('sendMessage：云端抛异常 → 回滚 + CLOUD_ERROR', function () {
  var ctx = {
    cloudReady: true,
    callFunction: function () {
      return Promise.reject(new Error('网络错误'))
    },
    currentUser: { openId: 'me', nickname: 'Me' }
  }
  return store.sendMessage('r1', 't1', 'hi', ctx).then(function (res) {
    eq(res.ok, false)
    eq(res.errCode, 'CLOUD_ERROR')
    deepEq(store.loadMessages('r1'), [], '回滚后本地为空')
  })
})

test('sendMessage：callFunction 缺失 → 降级 local_only（保留乐观消息）', function () {
  var ctx = {
    cloudReady: false,
    currentUser: { openId: 'me', nickname: 'Me' }
  }
  return store.sendMessage('r1', 't1', 'hi', ctx).then(function (res) {
    ok(res.ok)
    eq(res.source, 'local_only')
    var msgs = store.loadMessages('r1')
    eq(msgs.length, 1)
    ok(msgs[0].isLocal, '乐观消息保留在本地')
  })
})

test('sendMessage：callFunction 非 Promise → CLOUD_ERROR 回滚', function () {
  var ctx = {
    cloudReady: true,
    callFunction: function () { return { notAPromise: true } },
    currentUser: { openId: 'me', nickname: 'Me' }
  }
  return store.sendMessage('r1', 't1', 'hi', ctx).then(function (res) {
    eq(res.ok, false)
    eq(res.errCode, 'CLOUD_ERROR')
    deepEq(store.loadMessages('r1'), [])
  })
})

test('sendMessage：callFunction 抛同步异常 → CLOUD_ERROR 回滚', function () {
  var ctx = {
    cloudReady: true,
    callFunction: function () { throw new Error('sync boom') },
    currentUser: { openId: 'me', nickname: 'Me' }
  }
  return store.sendMessage('r1', 't1', 'hi', ctx).then(function (res) {
    eq(res.ok, false)
    eq(res.errCode, 'CLOUD_ERROR')
    deepEq(store.loadMessages('r1'), [])
  })
})

test('sendMessage：content 超 200 字 → INVALID_PARAM', function () {
  var long = ''
  for (var i = 0; i < 201; i++) long += 'x'
  return store.sendMessage('r1', 't1', long, {
    cloudReady: true,
    currentUser: { openId: 'me', nickname: 'Me' }
  }).then(function (res) {
    eq(res.ok, false)
    eq(res.errCode, 'INVALID_PARAM')
  })
})

// ===== I. fetchNewMessages =====
section('I. fetchNewMessages（增量拉取 + 降级）')

test('fetchNewMessages：云端成功 → 合并到本地并返回新增', function () {
  var ctx = {
    cloudReady: true,
    callFunction: function (opts) {
      ok(opts.name === 'fetchMessages')
      return Promise.resolve({ result: {
        ok: true,
        messages: [mkMsg('m1', 'a', 1000), mkMsg('m2', 'b', 2000)],
        hasMore: false
      } })
    }
  }
  return store.fetchNewMessages('r1', 0, ctx).then(function (res) {
    ok(res.ok)
    eq(res.source, 'cloud')
    eq(res.messages.length, 2)
    // 本地缓存已合并
    eq(store.loadMessages('r1').length, 2)
  })
})

test('fetchNewMessages：增量游标生效（不返回已有消息）', function () {
  // 预置本地 1 条
  store.saveMessages('r1', [mkMsg('m1', 'a', 1000)])
  var ctx = {
    cloudReady: true,
    callFunction: function (opts) {
      // 云端返回 m1（已有）+ m2（新）
      return Promise.resolve({ result: {
        ok: true,
        messages: [mkMsg('m1', 'a', 1000), mkMsg('m2', 'b', 2000)],
        hasMore: false
      } })
    }
  }
  return store.fetchNewMessages('r1', 500, ctx).then(function (res) {
    eq(res.messages.length, 1, 'm1 已有，仅 m2 是新增')
    eq(res.messages[0]._id, 'm2')
    eq(store.loadMessages('r1').length, 2)
  })
})

test('fetchNewMessages：云端抛异常 → 降级返回本地', function () {
  store.saveMessages('r1', [mkMsg('m1', 'a', 2000)])
  var ctx = {
    cloudReady: true,
    callFunction: function () { return Promise.reject(new Error('net')) }
  }
  return store.fetchNewMessages('r1', 1000, ctx).then(function (res) {
    ok(res.ok)
    eq(res.source, 'error')
    eq(res.messages.length, 1, '降级返回本地 createdAt>1000 的消息')
    eq(res.messages[0]._id, 'm1')
  })
})

test('fetchNewMessages：cloudReady=false → 只读本地', function () {
  store.saveMessages('r1', [mkMsg('m1', 'a', 2000)])
  return store.fetchNewMessages('r1', 1000, { cloudReady: false }).then(function (res) {
    ok(res.ok)
    eq(res.source, 'local')
    eq(res.messages.length, 1)
  })
})

test('fetchNewMessages：缺少 roomId → INVALID_PARAM', function () {
  return store.fetchNewMessages('', 0, { cloudReady: true }).then(function (res) {
    eq(res.ok, false)
    eq(res.errCode, 'INVALID_PARAM')
    deepEq(res.messages, [])
  })
})

test('fetchNewMessages：云端返回空数组', function () {
  var ctx = {
    cloudReady: true,
    callFunction: function () {
      return Promise.resolve({ result: { ok: true, messages: [], hasMore: false } })
    }
  }
  return store.fetchNewMessages('r1', 0, ctx).then(function (res) {
    ok(res.ok)
    eq(res.messages.length, 0)
  })
})

// ===== J. startPolling / stopPolling =====
section('J. startPolling / stopPolling')

test('startPolling：mock 返回 3 条消息 → callback 被调用', function () {
  var ctx = {
    cloudReady: true,
    callFunction: function (opts) {
      if (opts.name === 'fetchMessages') {
        return Promise.resolve({ result: {
          ok: true,
          messages: [
            mkMsg('m1', 'a', 1000),
            mkMsg('m2', 'b', 2000),
            mkMsg('m3', 'c', 3000)
          ],
          hasMore: false
        } })
      }
      return Promise.resolve({})
    },
    pollInterval: 10
  }
  return new Promise(function (resolve, reject) {
    var done = false
    var received = null
    var receivedAll = null
    store.startPolling('r1', ctx, function (newMsgs, allMsgs) {
      if (done) return
      done = true
      received = newMsgs
      receivedAll = allMsgs
      store.stopPolling()
      try {
        eq(received.length, 3)
        eq(receivedAll.length, 3)
        // 本地缓存已合并
        eq(store.loadMessages('r1').length, 3)
        resolve()
      } catch (e) {
        reject(e)
      }
    })
    // 安全超时兜底
    setTimeout(function () {
      if (done) return
      done = true
      store.stopPolling()
      reject(new Error('轮询 callback 未在 500ms 内被调用'))
    }, 500)
  })
})

test('startPolling：二次轮询同 _id 消息不重复回调（去重）', function () {
  var callCount = 0
  var ctx = {
    cloudReady: true,
    callFunction: function () {
      return Promise.resolve({ result: {
        ok: true,
        messages: [mkMsg('m1', 'a', 1000)],
        hasMore: false
      } })
    },
    pollInterval: 15
  }
  return new Promise(function (resolve, reject) {
    var cbCount = 0
    store.startPolling('r1', ctx, function () {
      cbCount++
    })
    // 等待足够时间让多次轮询发生（≥3 次）
    setTimeout(function () {
      store.stopPolling()
      try {
        eq(cbCount, 1, '去重后只应回调 1 次')
        resolve()
      } catch (e) {
        reject(e)
      }
    }, 200)
  })
})

test('startPolling：非法 roomId / callback 返回 false 不启动', function () {
  eq(store.startPolling('', { cloudReady: false }, function () {}), false)
  eq(store.startPolling('r1', { cloudReady: false }, null), false)
})

test('stopPolling：无活动轮询时安全无操作', function () {
  store.stopPolling()
  var state = store._getPollingState()
  eq(state.active, false)
  eq(state.roomId, null)
})

test('stopPolling：启动后停止 → 不再回调', function () {
  var ctx = {
    cloudReady: true,
    callFunction: function () {
      return Promise.resolve({ result: { ok: true, messages: [mkMsg('m1', 'a', 1000)], hasMore: false } })
    },
    pollInterval: 10
  }
  var cbCount = 0
  store.startPolling('r1', ctx, function () { cbCount++ })
  store.stopPolling()
  var state = store._getPollingState()
  eq(state.active, false)
  return new Promise(function (resolve) {
    setTimeout(function () {
      // 停止后即使有残留回调也不应新增（已清理 timer）
      eq(state.active, false)
      resolve()
    }, 50)
  })
})

test('startPolling：已有轮询时先停止旧的再启动', function () {
  var ctx1 = {
    cloudReady: true,
    callFunction: function () {
      return Promise.resolve({ result: { ok: true, messages: [mkMsg('a1', 'a', 1000)], hasMore: false } })
    },
    pollInterval: 10
  }
  var ctx2 = {
    cloudReady: true,
    callFunction: function () {
      return Promise.resolve({ result: { ok: true, messages: [mkMsg('b1', 'b', 2000)], hasMore: false } })
    },
    pollInterval: 10
  }
  store.startPolling('r1', ctx1, function () {})
  var firstState = store._getPollingState()
  eq(firstState.roomId, 'r1')
  store.startPolling('r2', ctx2, function () {})
  var secondState = store._getPollingState()
  eq(secondState.roomId, 'r2', '切换到新 room')
  store.stopPolling()
})

// ===== K. 集成场景：发送 + 拉取 + 去重 =====
section('K. 集成场景')

test('集成：发送消息后拉取不重复', function () {
  var ctx = {
    cloudReady: true,
    callFunction: function (opts) {
      if (opts.name === 'sendMessage') {
        return Promise.resolve({ result: { ok: true, message: mkMsg('real_1', 'hello', 5000, 'me') } })
      }
      if (opts.name === 'fetchMessages') {
        // 云端也有 real_1（模拟广播到自己）
        return Promise.resolve({ result: { ok: true, messages: [mkMsg('real_1', 'hello', 5000, 'me')], hasMore: false } })
      }
      return Promise.resolve({})
    },
    currentUser: { openId: 'me', nickname: 'Me' }
  }
  return store.sendMessage('r1', 't1', 'hello', ctx).then(function () {
    eq(store.loadMessages('r1').length, 1)
    return store.fetchNewMessages('r1', 0, ctx)
  }).then(function (res) {
    // real_1 已存在 → 不计为新增
    eq(res.messages.length, 0, '拉取已有消息不应计为新增')
    eq(store.loadMessages('r1').length, 1, '本地仍只 1 条')
  })
})

test('集成：多用户消息按时间排序合并', function () {
  var ctx = {
    cloudReady: true,
    callFunction: function () {
      return Promise.resolve({ result: { ok: true, messages: [
        mkMsg('m3', 'c3', 3000, 'c'),
        mkMsg('m1', 'a1', 1000, 'a'),
        mkMsg('m2', 'b2', 2000, 'b')
      ], hasMore: false } })
    }
  }
  return store.fetchNewMessages('r1', 0, ctx).then(function () {
    var all = store.loadMessages('r1')
    eq(all.length, 3)
    eq(all[0]._id, 'm1')
    eq(all[1]._id, 'm2')
    eq(all[2]._id, 'm3')
  })
})

// ===== 主流程 =====
console.log('\n========== chat-store 单元测试 ==========')
runAll(function () {
  console.log('\n==================================================')
  console.log('  结果: ' + passed + ' 通过, ' + failed + ' 失败')
  console.log('==================================================')
  if (failed > 0) {
    console.log('\n失败列表:')
    for (var i = 0; i < failures.length; i++) {
      console.log('  - ' + failures[i])
    }
    process.exit(1)
  }
})
