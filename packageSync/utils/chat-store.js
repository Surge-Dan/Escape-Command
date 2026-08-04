// utils/chat-store.js
// C-P4 社交增强 · 聊天数据层（轮询+缓存+降级）
//
// 架构：优先调云函数，失败时降级到本地缓存
//   sendMessage  → ctx.callFunction('sendMessage')   乐观更新 + 失败回滚
//   fetchNewMessages → ctx.callFunction('fetchMessages')  增量拉取
//   startPolling / stopPolling → setInterval(2500) 轮询增量拉取
//
// 纯函数（零 wx 依赖，可 Node 直接 require 测试）：
//   loadMessages / saveMessages / dedupMessages / clearLocalMessages /
//   validateContent / buildMessageDoc / makeOptimisticId
//
// 异步函数（依赖 wx.cloud.callFunction，通过 ctx 注入便于测试）：
//   sendMessage / fetchNewMessages
//
// 风格对齐 player-trust-store.js：var + function 声明，{ ok } 返回模式

'use strict'

// 本地缓存键前缀：chatMessages_<roomId>
var CACHE_KEY_PREFIX = 'chatMessages_'

// 轮询间隔（ms），默认 2.5s，可通过 ctx.pollInterval 覆盖（测试用）
var POLL_INTERVAL = 2500

// 云端调用超时（ms）
var CLOUD_TIMEOUT = 4000

// 消息长度上限（与云函数一致）
var MAX_CONTENT_LEN = 200

// 单次拉取上限（与云函数一致）
var PAGE_SIZE = 50

// ===== 本地缓存（纯函数，可测试）=====

/**
 * 构造某 room 的本地缓存键
 * @param {string} roomId
 * @returns {string}
 */
function cacheKey(roomId) {
  return CACHE_KEY_PREFIX + (typeof roomId === 'string' ? roomId : '')
}

/**
 * 从本地缓存读历史消息（按 createdAt 升序）
 * @param {string} roomId
 * @returns {Array} 消息数组，无缓存返回 []
 */
function loadMessages(roomId) {
  if (typeof roomId !== 'string' || !roomId) return []
  var list = []
  try { list = wx.getStorageSync(cacheKey(roomId)) || [] } catch (e) { list = [] }
  if (!Array.isArray(list)) return []
  // 复制避免外部修改污染缓存
  var copy = []
  for (var i = 0; i < list.length; i++) {
    if (list[i] && typeof list[i] === 'object') copy.push(list[i])
  }
  return copy
}

/**
 * 写本地缓存消息（覆盖式）
 * @param {string} roomId
 * @param {Array} messages
 */
function saveMessages(roomId, messages) {
  if (typeof roomId !== 'string' || !roomId) return
  var list = Array.isArray(messages) ? messages : []
  // 仅存可序列化的标准字段
  var safe = []
  for (var i = 0; i < list.length; i++) {
    var m = list[i]
    if (!m || typeof m !== 'object') continue
    safe.push({
      _id: m._id || '',
      // tempKey 用于乐观消息 ↔ 真实消息的替换匹配，必须持久化
      tempKey: typeof m.tempKey === 'string' ? m.tempKey : '',
      roomId: m.roomId || roomId,
      taskId: m.taskId || '',
      senderOpenId: m.senderOpenId || '',
      senderNickname: m.senderNickname || '',
      content: m.content || '',
      createdAt: typeof m.createdAt === 'number' ? m.createdAt : Date.now(),
      isLocal: !!m.isLocal,
      status: m.status || 'sent'
    })
  }
  try { wx.setStorageSync(cacheKey(roomId), safe) } catch (e) {}
}

/**
 * 按 _id 去重并合并（新消息覆盖同 _id 的旧消息，保持顺序）
 * 乐观消息（isLocal=true）按 tempKey 与真实消息合并：
 *   - 真实消息到达后，删除对应乐观消息（通过 pendingReplaceKey 关联）
 * @param {Array} existing - 已有消息
 * @param {Array} incoming - 新消息
 * @returns {Array} 合并去重后的数组（按 createdAt 升序）
 */
function dedupMessages(existing, incoming) {
  var ex = Array.isArray(existing) ? existing.slice() : []
  var inc = Array.isArray(incoming) ? incoming.slice() : []

  // 收集乐观消息的 pendingReplaceKey（待被真实消息替换）
  var pendingKeys = {}
  for (var p = 0; p < ex.length; p++) {
    if (ex[p] && ex[p].isLocal && ex[p].tempKey) {
      pendingKeys[ex[p].tempKey] = true
    }
  }

  var merged = []
  var seenIds = {}
  var seenTempKeys = {}

  // 先放已有（跳过将被真实消息替换的乐观消息）
  for (var i = 0; i < ex.length; i++) {
    var m = ex[i]
    if (!m) continue
    var id = m._id || ''
    var tk = m.tempKey || ''
    // 若该乐观消息有对应真实消息到达 → 跳过（被替换）
    if (m.isLocal && tk && pendingKeys[tk]) {
      var hasRealMatch = false
      for (var j = 0; j < inc.length; j++) {
        if (inc[j] && inc[j].replaceKey === tk) { hasRealMatch = true; break }
      }
      if (hasRealMatch) continue
    }
    if (id && seenIds[id]) continue
    if (tk && seenTempKeys[tk]) continue
    merged.push(m)
    if (id) seenIds[id] = true
    if (tk) seenTempKeys[tk] = true
  }

  // 再放新消息（去重）
  for (var k = 0; k < inc.length; k++) {
    var nm = inc[k]
    if (!nm) continue
    var nid = nm._id || ''
    var ntk = nm.tempKey || ''
    if (nid && seenIds[nid]) continue
    if (ntk && seenTempKeys[ntk]) continue
    merged.push(nm)
    if (nid) seenIds[nid] = true
    if (ntk) seenTempKeys[ntk] = true
  }

  // 按 createdAt 升序稳定排序（无 createdAt 的乐观消息排末尾）
  merged.sort(function (a, b) {
    var ca = typeof a.createdAt === 'number' ? a.createdAt : Number.MAX_SAFE_INTEGER
    var cb = typeof b.createdAt === 'number' ? b.createdAt : Number.MAX_SAFE_INTEGER
    if (ca !== cb) return ca - cb
    return 0
  })
  return merged
}

/**
 * 清空某 room 的本地缓存（调试用）
 * @param {string} roomId
 */
function clearLocalMessages(roomId) {
  if (typeof roomId !== 'string' || !roomId) return
  try { wx.removeStorageSync(cacheKey(roomId)) } catch (e) {}
}

// ===== 消息构造（纯函数）=====

/**
 * 生成乐观消息的本地唯一 _id / tempKey
 * @returns {string}
 */
function makeOptimisticId() {
  return 'local_' + Date.now() + '_' + Math.floor(Math.random() * 1000000)
}

/**
 * 校验消息内容（与云函数一致）
 * @param {string} content
 * @returns {{valid:boolean, errCode?:string, errMsg?:string, content?:string}}
 */
function validateContent(content) {
  if (typeof content !== 'string') {
    return { valid: false, errCode: 'INVALID_PARAM', errMsg: '消息内容需为字符串' }
  }
  var trimmed = content.trim()
  if (!trimmed) {
    return { valid: false, errCode: 'INVALID_PARAM', errMsg: '消息内容不能为空' }
  }
  if (trimmed.length > MAX_CONTENT_LEN) {
    return { valid: false, errCode: 'INVALID_PARAM', errMsg: '消息不能超过 ' + MAX_CONTENT_LEN + ' 字' }
  }
  return { valid: true, content: trimmed }
}

/**
 * 构造消息文档（供 sendMessage 用，纯函数便于测试）
 * @param {object} params - { roomId, taskId, content, senderOpenId, senderNickname }
 * @returns {object} 标准化后的消息文档（不含 _id，由云端生成）
 */
function buildMessageDoc(params) {
  params = params || {}
  return {
    roomId: typeof params.roomId === 'string' ? params.roomId.trim() : '',
    taskId: typeof params.taskId === 'string' ? params.taskId.trim() : '',
    content: typeof params.content === 'string' ? params.content : '',
    senderOpenId: typeof params.senderOpenId === 'string' ? params.senderOpenId : '',
    senderNickname: typeof params.senderNickname === 'string' ? params.senderNickname : '',
    roomMembers: Array.isArray(params.roomMembers) ? params.roomMembers : [],
    roomStatus: typeof params.roomStatus === 'string' ? params.roomStatus : ''
  }
}

// ===== 异步函数（依赖 wx.cloud，通过 ctx 注入）=====

/**
 * 发送消息（乐观更新 + 失败回滚）
 * 流程：
 *   1. 本地校验 content
 *   2. 同步追加乐观消息到本地缓存（isLocal=true, status=pending）
 *   3. 调云函数 sendMessage
 *   4. 成功：删除乐观消息，追加真实消息，标记 status=sent
 *   5. 失败：删除乐观消息（回滚），返回错误码供 UI toast
 *
 * @param {string} roomId
 * @param {string} taskId
 * @param {string} content
 * @param {object} ctx - { cloudReady, callFunction, currentUser, roomMembers, roomStatus }
 * @returns {Promise<{ok:boolean, message?:object, optimisticId?:string, errCode?:string, errMsg?:string}>}
 *   注意：乐观消息在 Promise 返回前已同步写入本地缓存
 */
function sendMessage(roomId, taskId, content, ctx) {
  ctx = ctx || {}
  var currentUser = ctx.currentUser || {}
  var senderOpenId = typeof currentUser.openId === 'string' ? currentUser.openId : ''
  var senderNickname = typeof currentUser.nickname === 'string' ? currentUser.nickname : ''

  // 1. 本地校验
  var check = validateContent(content)
  if (!check.valid) {
    return Promise.resolve({ ok: false, errCode: check.errCode, errMsg: check.errMsg })
  }

  if (typeof roomId !== 'string' || !roomId) {
    return Promise.resolve({ ok: false, errCode: 'INVALID_PARAM', errMsg: '缺少房间号' })
  }

  // 2. 构造乐观消息（同步写入，调用方可在 await 前观察到）
  var optimisticId = makeOptimisticId()
  var optimisticMsg = {
    _id: optimisticId,
    tempKey: optimisticId,
    roomId: roomId,
    taskId: typeof taskId === 'string' ? taskId : '',
    senderOpenId: senderOpenId,
    senderNickname: senderNickname,
    content: check.content,
    createdAt: Date.now(),
    isLocal: true,
    status: 'pending'
  }
  var existing = loadMessages(roomId)
  var withOptimistic = existing.concat([optimisticMsg])
  saveMessages(roomId, withOptimistic)

  // 3. 云端不可用 → 降级：保留乐观消息（仅本地可见），返回成功
  if (!ctx.cloudReady || typeof ctx.callFunction !== 'function') {
    // 标记为本地已存（不删除），source 标记 local
    return Promise.resolve({
      ok: true,
      source: 'local_only',
      message: optimisticMsg,
      optimisticId: optimisticId
    })
  }

  // 4. 调云函数
  var doc = buildMessageDoc({
    roomId: roomId,
    taskId: taskId,
    content: check.content,
    senderOpenId: senderOpenId,
    senderNickname: senderNickname,
    roomMembers: ctx.roomMembers,
    roomStatus: ctx.roomStatus
  })

  return new Promise(function (resolve) {
    var settled = false
    var timer = setTimeout(function () {
      if (settled) return
      settled = true
      // 超时回滚
      rollbackOptimistic(roomId, optimisticId)
      resolve({
        ok: false,
        errCode: 'CLOUD_TIMEOUT',
        errMsg: '发送超时，请重试',
        optimisticId: optimisticId
      })
    }, CLOUD_TIMEOUT)

    try {
      var promise = ctx.callFunction({
        name: 'sendMessage',
        data: doc,
        timeout: CLOUD_TIMEOUT
      })

      if (promise && typeof promise.then === 'function') {
        promise.then(function (res) {
          if (settled) return
          settled = true
          clearTimeout(timer)
          var result = res && res.result
          if (result && result.ok && result.message) {
            // 成功：用真实消息替换乐观消息
            var realMsg = result.message
            // 关联替换：让 dedupMessages 用 replaceKey 删除乐观消息
            realMsg.replaceKey = optimisticId
            var cur = loadMessages(roomId)
            var merged = dedupMessages(cur, [realMsg])
            // 清掉 replaceKey 字段（不需要持久化）
            for (var i = 0; i < merged.length; i++) {
              if (merged[i] && merged[i]._id === realMsg._id) {
                delete merged[i].replaceKey
                merged[i].isLocal = false
                merged[i].status = 'sent'
              }
            }
            saveMessages(roomId, merged)
            resolve({ ok: true, source: 'cloud', message: realMsg, optimisticId: optimisticId })
          } else {
            // 业务错误（非成员/房间已关闭等）→ 回滚
            rollbackOptimistic(roomId, optimisticId)
            resolve({
              ok: false,
              errCode: (result && result.errCode) || 'UNKNOWN',
              errMsg: (result && result.errMsg) || '发送失败',
              optimisticId: optimisticId
            })
          }
        }).catch(function () {
          if (settled) return
          settled = true
          clearTimeout(timer)
          rollbackOptimistic(roomId, optimisticId)
          resolve({
            ok: false,
            errCode: 'CLOUD_ERROR',
            errMsg: '网络异常，请重试',
            optimisticId: optimisticId
          })
        })
      } else {
        if (!settled) {
          settled = true
          clearTimeout(timer)
          rollbackOptimistic(roomId, optimisticId)
          resolve({
            ok: false,
            errCode: 'CLOUD_ERROR',
            errMsg: '云调用返回格式异常',
            optimisticId: optimisticId
          })
        }
      }
    } catch (e) {
      if (settled) return
      settled = true
      clearTimeout(timer)
      rollbackOptimistic(roomId, optimisticId)
      resolve({
        ok: false,
        errCode: 'CLOUD_ERROR',
        errMsg: '发送异常',
        optimisticId: optimisticId
      })
    }
  })
}

/**
 * 回滚乐观消息（从本地缓存删除指定 _id 的消息）
 * @param {string} roomId
 * @param {string} optimisticId
 */
function rollbackOptimistic(roomId, optimisticId) {
  var cur = loadMessages(roomId)
  var filtered = []
  for (var i = 0; i < cur.length; i++) {
    if (cur[i] && cur[i]._id === optimisticId) continue
    filtered.push(cur[i])
  }
  saveMessages(roomId, filtered)
}

/**
 * 增量拉取新消息
 * @param {string} roomId
 * @param {number} [lastCreatedAt] - 增量游标（拉取 createdAt > lastCreatedAt 的消息）
 * @param {object} ctx - { cloudReady, callFunction }
 * @returns {Promise<{ok:boolean, messages?:Array, source?:string, errCode?:string}>}
 */
function fetchNewMessages(roomId, lastCreatedAt, ctx) {
  if (typeof roomId !== 'string' || !roomId) {
    return Promise.resolve({ ok: false, errCode: 'INVALID_PARAM', errMsg: '缺少房间号', messages: [] })
  }
  ctx = ctx || {}

  // 云端不可用 → 只返回本地缓存
  if (!ctx.cloudReady || typeof ctx.callFunction !== 'function') {
    var local = loadMessages(roomId)
    var localNew = filterAfter(local, lastCreatedAt)
    return Promise.resolve({ ok: true, source: 'local', messages: localNew })
  }

  return new Promise(function (resolve) {
    var settled = false
    var timer = setTimeout(function () {
      if (settled) return
      settled = true
      // 超时降级：返回本地缓存
      var fallback = filterAfter(loadMessages(roomId), lastCreatedAt)
      resolve({ ok: true, source: 'timeout', messages: fallback })
    }, CLOUD_TIMEOUT)

    try {
      var promise = ctx.callFunction({
        name: 'fetchMessages',
        data: {
          roomId: roomId,
          lastCreatedAt: typeof lastCreatedAt === 'number' ? lastCreatedAt : 0
        },
        timeout: CLOUD_TIMEOUT
      })

      if (promise && typeof promise.then === 'function') {
        promise.then(function (res) {
          if (settled) return
          settled = true
          clearTimeout(timer)
          var result = res && res.result
          var remoteMessages = (result && Array.isArray(result.messages)) ? result.messages : []
          // 合并到本地缓存（去重）
          var cur = loadMessages(roomId)
          var merged = dedupMessages(cur, remoteMessages)
          saveMessages(roomId, merged)
          // 返回本次拉取新增的（过滤掉已有的）
          var newOnes = computeNewOnes(cur, remoteMessages)
          resolve({ ok: true, source: 'cloud', messages: newOnes })
        }).catch(function () {
          if (settled) return
          settled = true
          clearTimeout(timer)
          var fallback = filterAfter(loadMessages(roomId), lastCreatedAt)
          resolve({ ok: true, source: 'error', messages: fallback })
        })
      } else {
        if (!settled) {
          settled = true
          clearTimeout(timer)
          var fallback2 = filterAfter(loadMessages(roomId), lastCreatedAt)
          resolve({ ok: true, source: 'error', messages: fallback2 })
        }
      }
    } catch (e) {
      if (settled) return
      settled = true
      clearTimeout(timer)
      var fallback3 = filterAfter(loadMessages(roomId), lastCreatedAt)
      resolve({ ok: true, source: 'error', messages: fallback3 })
    }
  })
}

/**
 * 过滤 createdAt > lastCreatedAt 的消息（纯函数）
 */
function filterAfter(messages, lastCreatedAt) {
  if (typeof lastCreatedAt !== 'number' || lastCreatedAt <= 0) {
    return Array.isArray(messages) ? messages.slice() : []
  }
  var out = []
  var list = Array.isArray(messages) ? messages : []
  for (var i = 0; i < list.length; i++) {
    if (list[i] && typeof list[i].createdAt === 'number' && list[i].createdAt > lastCreatedAt) {
      out.push(list[i])
    }
  }
  return out
}

/**
 * 计算本次拉取相对已有缓存的新增消息（按 _id 去重）
 */
function computeNewOnes(existing, remote) {
  var ex = Array.isArray(existing) ? existing : []
  var seenIds = {}
  var seenTempKeys = {}
  for (var i = 0; i < ex.length; i++) {
    if (ex[i] && ex[i]._id) seenIds[ex[i]._id] = true
    if (ex[i] && ex[i].tempKey) seenTempKeys[ex[i].tempKey] = true
  }
  var out = []
  var inc = Array.isArray(remote) ? remote : []
  for (var j = 0; j < inc.length; j++) {
    var m = inc[j]
    if (!m) continue
    var id = m._id || ''
    // 真实消息若与某乐观消息同 content+sender+相近时间，也视为替换（不重复计入新增）
    if (id && seenIds[id]) continue
    // 若真实消息由本端乐观消息转化而来（replaceKey 命中），也不计入新增
    if (m.replaceKey && seenTempKeys[m.replaceKey]) continue
    out.push(m)
  }
  return out
}

// ===== 轮询 =====

// 轮询状态（模块级单例，同时只轮询一个 room）
var pollingTimer = null
var pollingRoomId = null
var pollingLastCreatedAt = 0

/**
 * 启动轮询
 * @param {string} roomId
 * @param {object} ctx - { cloudReady, callFunction, pollInterval? }
 * @param {function} callback - (newMessages, allMessages) => void
 * @returns {boolean} 是否成功启动（已有轮询时先停止旧的再启动）
 */
function startPolling(roomId, ctx, callback) {
  if (typeof roomId !== 'string' || !roomId) return false
  if (typeof callback !== 'function') return false
  ctx = ctx || {}

  // 已有轮询先停止
  stopPolling()

  pollingRoomId = roomId
  // 初始化游标为当前本地缓存最大 createdAt
  pollingLastCreatedAt = getMaxCreatedAt(loadMessages(roomId))

  var interval = typeof ctx.pollInterval === 'number' && ctx.pollInterval > 0 ? ctx.pollInterval : POLL_INTERVAL

  pollingTimer = setInterval(function () {
    fetchNewMessages(pollingRoomId, pollingLastCreatedAt, ctx).then(function (res) {
      if (!res || !res.ok) return
      var newMsgs = Array.isArray(res.messages) ? res.messages : []
      if (newMsgs.length === 0) return
      // 更新游标
      pollingLastCreatedAt = getMaxCreatedAt(newMsgs.concat([pollingLastCreatedAt]))
      // 更新到本轮最大值
      var maxNew = getMaxCreatedAt(newMsgs)
      if (maxNew > pollingLastCreatedAt) pollingLastCreatedAt = maxNew
      // 回调通知 UI
      var all = loadMessages(pollingRoomId)
      try { callback(newMsgs, all) } catch (e) {}
    }).catch(function () {
      // 轮询失败静默，下次重试
    })
  }, interval)

  return true
}

/**
 * 停止轮询
 */
function stopPolling() {
  if (pollingTimer) {
    try { clearInterval(pollingTimer) } catch (e) {}
    pollingTimer = null
  }
  pollingRoomId = null
  pollingLastCreatedAt = 0
}

/**
 * 获取消息数组中的最大 createdAt（纯函数）
 */
function getMaxCreatedAt(messages) {
  var list = Array.isArray(messages) ? messages : []
  var max = 0
  for (var i = 0; i < list.length; i++) {
    if (list[i] && typeof list[i].createdAt === 'number' && list[i].createdAt > max) {
      max = list[i].createdAt
    }
  }
  return max
}

module.exports = {
  // 常量
  CACHE_KEY_PREFIX: CACHE_KEY_PREFIX,
  POLL_INTERVAL: POLL_INTERVAL,
  CLOUD_TIMEOUT: CLOUD_TIMEOUT,
  MAX_CONTENT_LEN: MAX_CONTENT_LEN,
  PAGE_SIZE: PAGE_SIZE,
  // 纯函数
  cacheKey: cacheKey,
  loadMessages: loadMessages,
  saveMessages: saveMessages,
  dedupMessages: dedupMessages,
  clearLocalMessages: clearLocalMessages,
  validateContent: validateContent,
  buildMessageDoc: buildMessageDoc,
  makeOptimisticId: makeOptimisticId,
  filterAfter: filterAfter,
  computeNewOnes: computeNewOnes,
  getMaxCreatedAt: getMaxCreatedAt,
  // 异步函数
  sendMessage: sendMessage,
  fetchNewMessages: fetchNewMessages,
  // 轮询
  startPolling: startPolling,
  stopPolling: stopPolling,
  // 测试辅助
  _rollbackOptimistic: rollbackOptimistic,
  _getPollingState: function () {
    return {
      roomId: pollingRoomId,
      lastCreatedAt: pollingLastCreatedAt,
      active: pollingTimer !== null
    }
  }
}
