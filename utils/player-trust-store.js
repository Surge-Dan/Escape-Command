// utils/player-trust-store.js
// C-P4 社交增强 · 玩家信任数据层（降级协调）
//
// 架构：优先调云函数，失败时降级到本地缓存 + 默认信任分
//   submitReview / getTrust / getTrustBatch / reportPlayer
//     → ctx.callFunction('submitPlayerReview' / 'getPlayerTrust' / 'reportPlayer')
//     → 云端失败/超时 → 本地缓存 + 默认 newbie
//
// 纯函数（零 wx 依赖，可 Node 直接 require 测试）：
//   getCachedTrust / setCachedTrust / clearTrustCache / buildReviewDoc
//
// 异步函数（依赖 wx.cloud.callFunction，通过 ctx 注入便于测试）：
//   submitReview / getTrust / getTrustBatch / reportPlayer
//
// 风格对齐 player-matcher.js：var + function，{ ok } 返回模式

'use strict'

var trustScore = require('./trust-score.js')
var computeTrustScore = trustScore.computeTrustScore
var DEFAULT_TRUST = trustScore.DEFAULT_TRUST

// 本地缓存键（按 openId 索引的对象）
var CACHE_KEY = 'playerTrustCache'

// 云端调用超时（ms）
var CLOUD_TIMEOUT = 4000

// ===== 本地缓存（纯函数，可测试）=====

/**
 * 读本地缓存的信任分
 * @param {string} openId
 * @returns {object|null} 信任分对象，未命中返回 null
 */
function getCachedTrust(openId) {
  if (typeof openId !== 'string' || !openId) return null
  var cache = {}
  try { cache = wx.getStorageSync(CACHE_KEY) || {} } catch (e) { cache = {} }
  if (!cache || typeof cache !== 'object') return null
  var t = cache[openId]
  if (!t || typeof t !== 'object') return null
  return {
    score: t.score,
    count: t.count,
    label: t.label,
    tier: t.tier
  }
}

/**
 * 写本地缓存信任分
 * @param {string} openId
 * @param {object} trust - { score, count, label, tier }
 */
function setCachedTrust(openId, trust) {
  if (typeof openId !== 'string' || !openId) return
  if (!trust || typeof trust !== 'object') return
  var cache = {}
  try { cache = wx.getStorageSync(CACHE_KEY) || {} } catch (e) { cache = {} }
  if (!cache || typeof cache !== 'object') cache = {}
  cache[openId] = {
    score: trust.score,
    count: trust.count,
    label: trust.label,
    tier: trust.tier
  }
  try { wx.setStorageSync(CACHE_KEY, cache) } catch (e) {}
}

/**
 * 清空信任分缓存（调试用）
 */
function clearTrustCache() {
  try { wx.removeStorageSync(CACHE_KEY) } catch (e) {}
}

/**
 * 构造评价文档（供 submitReview 用，纯函数便于测试）
 * @param {object} target - { openId, roomId, taskId, roomMembers, roomStatus }
 * @param {object} review - { rating, comment, tags }
 * @returns {object} 标准化后的评价文档
 */
function buildReviewDoc(target, review) {
  target = target || {}
  review = review || {}
  return {
    targetOpenId: typeof target.openId === 'string' ? target.openId.trim() : '',
    roomId: typeof target.roomId === 'string' ? target.roomId.trim() : '',
    taskId: typeof target.taskId === 'string' ? target.taskId.trim() : '',
    roomMembers: Array.isArray(target.roomMembers) ? target.roomMembers : [],
    roomStatus: typeof target.roomStatus === 'string' ? target.roomStatus : '',
    rating: review.rating,
    comment: typeof review.comment === 'string' ? review.comment.trim().slice(0, 100) : '',
    tags: Array.isArray(review.tags) ? review.tags.slice(0, 5) : []
  }
}

// ===== 异步函数（依赖 wx.cloud，通过 ctx 注入）=====

/**
 * 提交玩家评价
 * @param {object} target - { openId, roomId, taskId, roomMembers, roomStatus }
 * @param {object} review - { rating, comment, tags }
 * @param {object} ctx - { cloudReady, callFunction }
 * @returns {Promise<{ok:boolean, trust?:object, errCode?:string, errMsg?:string}>}
 */
function submitReview(target, review, ctx) {
  ctx = ctx || {}
  var doc = buildReviewDoc(target, review)

  // 云端不可用 → 降级：本地不存评价（无跨用户信任分），返回默认值
  if (!ctx.cloudReady || typeof ctx.callFunction !== 'function') {
    return Promise.resolve({
      ok: false,
      errCode: 'CLOUD_OFFLINE',
      errMsg: '云端不可用，评价已暂存本地',
      trust: DEFAULT_TRUST
    })
  }

  return new Promise(function (resolve) {
    var settled = false
    var timer = setTimeout(function () {
      if (settled) return
      settled = true
      resolve({
        ok: false,
        errCode: 'CLOUD_TIMEOUT',
        errMsg: '评价超时，请重试',
        trust: DEFAULT_TRUST
      })
    }, CLOUD_TIMEOUT)

    try {
      var promise = ctx.callFunction({
        name: 'submitPlayerReview',
        data: doc,
        timeout: CLOUD_TIMEOUT
      })

      if (promise && typeof promise.then === 'function') {
        promise.then(function (res) {
          if (settled) return
          settled = true
          clearTimeout(timer)
          var result = res && res.result
          if (result && result.ok) {
            // 成功 → 缓存更新后的信任分
            if (result.trust) {
              setCachedTrust(doc.targetOpenId, result.trust)
            }
            resolve({ ok: true, trust: result.trust || DEFAULT_TRUST })
          } else {
            // 业务错误（重复/非成员/未完成等）
            resolve({
              ok: false,
              errCode: (result && result.errCode) || 'UNKNOWN',
              errMsg: (result && result.errMsg) || '评价失败'
            })
          }
        }).catch(function () {
          if (settled) return
          settled = true
          clearTimeout(timer)
          resolve({
            ok: false,
            errCode: 'CLOUD_ERROR',
            errMsg: '网络异常，请重试',
            trust: DEFAULT_TRUST
          })
        })
      } else {
        if (!settled) {
          settled = true
          clearTimeout(timer)
          resolve({
            ok: false,
            errCode: 'CLOUD_ERROR',
            errMsg: '云调用返回格式异常',
            trust: DEFAULT_TRUST
          })
        }
      }
    } catch (e) {
      if (settled) return
      settled = true
      clearTimeout(timer)
      resolve({
        ok: false,
        errCode: 'CLOUD_ERROR',
        errMsg: '评价异常',
        trust: DEFAULT_TRUST
      })
    }
  })
}

/**
 * 查询单个玩家信任分
 * @param {string} openId
 * @param {object} ctx - { cloudReady, callFunction }
 * @returns {Promise<{score:number, count:number, label:string, tier:string}>}
 *   失败时返回默认 newbie，不 reject
 */
function getTrust(openId, ctx) {
  if (typeof openId !== 'string' || !openId) {
    return Promise.resolve(DEFAULT_TRUST)
  }
  ctx = ctx || {}

  // 云端不可用 → 读本地缓存，未命中返回默认值
  if (!ctx.cloudReady || typeof ctx.callFunction !== 'function') {
    var cached = getCachedTrust(openId)
    return Promise.resolve(cached || DEFAULT_TRUST)
  }

  return getTrustBatch([openId], ctx).then(function (res) {
    return res[openId] || DEFAULT_TRUST
  })
}

/**
 * 批量查询玩家信任分（player-matcher 用）
 * @param {string[]} openIds - 最多 20 个
 * @param {object} ctx - { cloudReady, callFunction }
 * @returns {Promise<{[openId]: {score, count, label, tier}}>}
 *   失败时返回每个 openId 对应的默认值，不 reject
 */
function getTrustBatch(openIds, ctx) {
  // 防御：非数组/空数组 → 空对象
  if (!Array.isArray(openIds) || openIds.length === 0) {
    return Promise.resolve({})
  }
  ctx = ctx || {}

  // 截断到 20 个
  var ids = []
  for (var i = 0; i < openIds.length && ids.length < 20; i++) {
    var id = openIds[i]
    if (typeof id === 'string' && id && ids.indexOf(id) === -1) {
      ids.push(id)
    }
  }
  if (ids.length === 0) return Promise.resolve({})

  // 云端不可用 → 读本地缓存，未命中返回默认值
  if (!ctx.cloudReady || typeof ctx.callFunction !== 'function') {
    var fallback = {}
    for (var f = 0; f < ids.length; f++) {
      fallback[ids[f]] = getCachedTrust(ids[f]) || DEFAULT_TRUST
    }
    return Promise.resolve(fallback)
  }

  return new Promise(function (resolve) {
    var settled = false
    var timer = setTimeout(function () {
      if (settled) return
      settled = true
      // 超时 → 本地缓存 + 默认值
      var timeoutRes = {}
      for (var t = 0; t < ids.length; t++) {
        timeoutRes[ids[t]] = getCachedTrust(ids[t]) || DEFAULT_TRUST
      }
      resolve(timeoutRes)
    }, CLOUD_TIMEOUT)

    try {
      var promise = ctx.callFunction({
        name: 'getPlayerTrust',
        data: { openIds: ids },
        timeout: CLOUD_TIMEOUT
      })

      if (promise && typeof promise.then === 'function') {
        promise.then(function (res) {
          if (settled) return
          settled = true
          clearTimeout(timer)
          var result = res && res.result
          var trusts = (result && result.trusts) || {}
          // 补齐未返回的 openId（用本地缓存或默认值）
          var merged = {}
          for (var m = 0; m < ids.length; m++) {
            var tid = ids[m]
            if (trusts[tid]) {
              merged[tid] = trusts[tid]
              setCachedTrust(tid, trusts[tid]) // 缓存
            } else {
              merged[tid] = getCachedTrust(tid) || DEFAULT_TRUST
            }
          }
          resolve(merged)
        }).catch(function () {
          if (settled) return
          settled = true
          clearTimeout(timer)
          var errRes = {}
          for (var e = 0; e < ids.length; e++) {
            errRes[ids[e]] = getCachedTrust(ids[e]) || DEFAULT_TRUST
          }
          resolve(errRes)
        })
      } else {
        if (!settled) {
          settled = true
          clearTimeout(timer)
          var badRes = {}
          for (var b = 0; b < ids.length; b++) {
            badRes[ids[b]] = getCachedTrust(ids[b]) || DEFAULT_TRUST
          }
          resolve(badRes)
        }
      }
    } catch (e) {
      if (settled) return
      settled = true
      clearTimeout(timer)
      var catchRes = {}
      for (var c = 0; c < ids.length; c++) {
        catchRes[ids[c]] = getCachedTrust(ids[c]) || DEFAULT_TRUST
      }
      resolve(catchRes)
    }
  })
}

/**
 * 举报玩家
 * @param {object} target - { openId, roomId }
 * @param {string} reason
 * @param {object} ctx - { cloudReady, callFunction }
 * @returns {Promise<{ok:boolean, flagged?:boolean, errCode?:string, errMsg?:string}>}
 */
function reportPlayer(target, reason, ctx) {
  target = target || {}
  ctx = ctx || {}
  var targetOpenId = typeof target.openId === 'string' ? target.openId.trim() : ''
  var roomId = typeof target.roomId === 'string' ? target.roomId.trim() : ''

  if (!targetOpenId) {
    return Promise.resolve({ ok: false, errCode: 'INVALID_PARAM', errMsg: '缺少被举报者' })
  }

  // 云端不可用 → 降级
  if (!ctx.cloudReady || typeof ctx.callFunction !== 'function') {
    return Promise.resolve({
      ok: false,
      errCode: 'CLOUD_OFFLINE',
      errMsg: '云端不可用，举报已暂存本地'
    })
  }

  return new Promise(function (resolve) {
    var settled = false
    var timer = setTimeout(function () {
      if (settled) return
      settled = true
      resolve({ ok: false, errCode: 'CLOUD_TIMEOUT', errMsg: '举报超时，请重试' })
    }, CLOUD_TIMEOUT)

    try {
      var promise = ctx.callFunction({
        name: 'reportPlayer',
        data: {
          targetOpenId: targetOpenId,
          roomId: roomId,
          reason: reason
        },
        timeout: CLOUD_TIMEOUT
      })

      if (promise && typeof promise.then === 'function') {
        promise.then(function (res) {
          if (settled) return
          settled = true
          clearTimeout(timer)
          var result = res && res.result
          if (result && result.ok) {
            resolve({ ok: true, flagged: !!result.flagged })
          } else {
            resolve({
              ok: false,
              errCode: (result && result.errCode) || 'UNKNOWN',
              errMsg: (result && result.errMsg) || '举报失败'
            })
          }
        }).catch(function () {
          if (settled) return
          settled = true
          clearTimeout(timer)
          resolve({ ok: false, errCode: 'CLOUD_ERROR', errMsg: '网络异常，请重试' })
        })
      } else {
        if (!settled) {
          settled = true
          clearTimeout(timer)
          resolve({ ok: false, errCode: 'CLOUD_ERROR', errMsg: '云调用返回格式异常' })
        }
      }
    } catch (e) {
      if (settled) return
      settled = true
      clearTimeout(timer)
      resolve({ ok: false, errCode: 'CLOUD_ERROR', errMsg: '举报异常' })
    }
  })
}

module.exports = {
  // 常量
  CACHE_KEY: CACHE_KEY,
  CLOUD_TIMEOUT: CLOUD_TIMEOUT,
  // 纯函数
  getCachedTrust: getCachedTrust,
  setCachedTrust: setCachedTrust,
  clearTrustCache: clearTrustCache,
  buildReviewDoc: buildReviewDoc,
  // 异步函数
  submitReview: submitReview,
  getTrust: getTrust,
  getTrustBatch: getTrustBatch,
  reportPlayer: reportPlayer
}
