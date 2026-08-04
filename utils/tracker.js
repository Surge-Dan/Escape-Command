// utils/tracker.js
// B3 数据埋点工具（offline-first）
//
// 设计：
//   1. 纯函数 + ctx 注入（storage 适配器通过 ctx 传入，便于 Node 测试）
//   2. 事件结构稳定：{ id, name, props, ts, session_id }
//   3. 容量上限 MAX_EVENTS=500，超出按 FIFO 截断
//   4. props 清洗：剔除 function/undefined/Symbol，避免序列化失败
//   5. 事件名校验：仅允许 [a-z_][a-z0-9_]*，防注入
//   6. session_id 一次启动周期内不变，便于行为序列分析
//
// 不依赖 wx：通过 ctx.storage（同步 get/set）+ ctx.time（返回 ms 时间戳）注入，
// 默认 ctx 走 wx.getStorageSync / wx.setStorageSync / Date.now。

'use strict'

var STORAGE_KEY = 'tracker_events'
var SESSION_KEY = 'tracker_session_id'
var MAX_EVENTS = 500
var NAME_RE = /^[a-z_][a-z0-9_]{0,63}$/

// ===== 默认 ctx：基于 wx 同步存储 =====
function defaultCtx() {
  var wxRef = (typeof wx !== 'undefined') ? wx : null
  return {
    storage: {
      get: function (key) {
        if (!wxRef) return null
        try { return wxRef.getStorageSync(key) } catch (e) { return null }
      },
      set: function (key, val) {
        if (!wxRef) return
        try { wxRef.setStorageSync(key, val) } catch (e) {}
      }
    },
    time: function () { return Date.now() }
  }
}

// ===== 事件名校验 =====
function isValidEventName(name) {
  return typeof name === 'string' && NAME_RE.test(name)
}

// ===== props 清洗 =====
function sanitizeProps(props) {
  if (!props || typeof props !== 'object' || Array.isArray(props)) return {}
  var out = {}
  var keys = Object.keys(props)
  for (var i = 0; i < keys.length; i++) {
    var k = keys[i]
    var v = props[k]
    if (typeof v === 'function' || typeof v === 'undefined' || typeof v === 'symbol') continue
    // 嵌套对象/数组做浅拷贝并清洗一层（避免引用污染）
    if (v !== null && typeof v === 'object') {
      if (Array.isArray(v)) {
        out[k] = v.filter(function (x) {
          return typeof x !== 'function' && typeof x !== 'undefined' && typeof x !== 'symbol'
        }).slice(0, 50)
      } else {
        var sub = {}
        var subKeys = Object.keys(v)
        for (var j = 0; j < subKeys.length && j < 50; j++) {
          var sk = subKeys[j]
          var sv = v[sk]
          if (typeof sv !== 'function' && typeof sv !== 'undefined' && typeof sv !== 'symbol') {
            sub[sk] = sv
          }
        }
        out[k] = sub
      }
    } else {
      out[k] = v
    }
  }
  return out
}

// ===== session_id 获取/生成 =====
function getSessionId(ctx) {
  var c = ctx || defaultCtx()
  var sid = c.storage.get(SESSION_KEY)
  if (typeof sid === 'string' && sid) return sid
  // 生成 8 位字母数字
  sid = 's_' + Date.now().toString(36) + '_' + Math.floor(Math.random() * 1e6).toString(36)
  c.storage.set(SESSION_KEY, sid)
  return sid
}

// ===== 生成事件 id =====
function genEventId(ts) {
  return 'e_' + ts.toString(36) + '_' + Math.floor(Math.random() * 1e6).toString(36)
}

// ===== 构造事件对象（纯函数）=====
function buildEvent(name, props, ts, sessionId) {
  if (!isValidEventName(name)) return null
  return {
    id: genEventId(ts),
    name: name,
    props: sanitizeProps(props),
    ts: ts,
    session_id: sessionId
  }
}

// ===== 读取已存储事件 =====
function getEvents(ctx) {
  var c = ctx || defaultCtx()
  var arr = c.storage.get(STORAGE_KEY)
  if (!Array.isArray(arr)) return []
  return arr
}

// ===== 清空事件 =====
function clearEvents(ctx) {
  var c = ctx || defaultCtx()
  c.storage.set(STORAGE_KEY, [])
  return { ok: true, cleared: true }
}

// ===== 截断到 MAX_EVENTS（FIFO）=====
function truncate(events, max) {
  var limit = (typeof max === 'number' && max > 0) ? max : MAX_EVENTS
  if (!Array.isArray(events)) return []
  if (events.length <= limit) return events.slice()
  return events.slice(events.length - limit)
}

// ===== 主入口：track =====
function track(name, props, ctx) {
  var c = ctx || defaultCtx()
  if (!isValidEventName(name)) {
    return { ok: false, errCode: 'INVALID_NAME', errMsg: '事件名仅允许 [a-z_][a-z0-9_]*' }
  }
  var ts = c.time()
  var sid = getSessionId(c)
  var evt = buildEvent(name, props, ts, sid)
  if (!evt) {
    return { ok: false, errCode: 'BUILD_FAILED', errMsg: '事件构造失败' }
  }
  var events = getEvents(c)
  events.push(evt)
  events = truncate(events, MAX_EVENTS)
  c.storage.set(STORAGE_KEY, events)
  return { ok: true, eventId: evt.id, ts: ts }
}

// ===== 批量 track（一次存储，减少 IO）=====
function trackBatch(items, ctx) {
  var c = ctx || defaultCtx()
  if (!Array.isArray(items)) return { ok: false, errCode: 'NOT_ARRAY', errMsg: 'items 必须是数组' }
  var events = getEvents(c)
  var sid = getSessionId(c)
  var ts = c.time()
  var added = 0
  var skipped = 0
  for (var i = 0; i < items.length; i++) {
    var it = items[i]
    if (!it || typeof it !== 'object') { skipped++; continue }
    var evt = buildEvent(it.name, it.props, ts + i, sid)
    if (!evt) { skipped++; continue }
    events.push(evt)
    added++
  }
  events = truncate(events, MAX_EVENTS)
  c.storage.set(STORAGE_KEY, events)
  return { ok: true, added: added, skipped: skipped }
}

// ===== 统计事件（按 name 聚合）=====
function summarize(events) {
  var arr = Array.isArray(events) ? events : []
  var map = {}
  var total = 0
  var firstTs = null
  var lastTs = null
  for (var i = 0; i < arr.length; i++) {
    var e = arr[i]
    if (!e || typeof e !== 'object') continue
    // 仅统计有效事件（必须有 name 字段）
    if (typeof e.name !== 'string') continue
    total++
    map[e.name] = (map[e.name] || 0) + 1
    if (typeof e.ts === 'number') {
      if (firstTs === null || e.ts < firstTs) firstTs = e.ts
      if (lastTs === null || e.ts > lastTs) lastTs = e.ts
    }
  }
  return {
    total: total,
    byName: map,
    firstTs: firstTs,
    lastTs: lastTs,
    spanMs: (firstTs !== null && lastTs !== null) ? (lastTs - firstTs) : 0
  }
}

module.exports = {
  // 常量
  STORAGE_KEY: STORAGE_KEY,
  SESSION_KEY: SESSION_KEY,
  MAX_EVENTS: MAX_EVENTS,
  // 纯函数
  isValidEventName: isValidEventName,
  sanitizeProps: sanitizeProps,
  buildEvent: buildEvent,
  truncate: truncate,
  summarize: summarize,
  getSessionId: getSessionId,
  genEventId: genEventId,
  // 主入口
  track: track,
  trackBatch: trackBatch,
  getEvents: getEvents,
  clearEvents: clearEvents,
  // ctx 工具
  defaultCtx: defaultCtx
}
