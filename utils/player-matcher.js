// utils/player-matcher.js
// D5: 真实玩家联动 · 混合模式匹配器
//
// 架构：优先匹配云端真实玩家，不足时用本地 mock 用户兜底
//   matchPlayersAsync(user, count, filters, ctx)
//     → ctx.callFunction('matchPlayers', {...})  // 云端真实玩家
//     → 不足 count → mock-user-pool 补齐           // 本地兜底
//     → 云端失败/超时 → 全部用 mock               // 降级
//
// 纯函数（零 wx 依赖，可 Node 直接 require 测试）：
//   normalizePlayer / rankByRelevance / mergeAndPick / shouldFallback / computePartnerCount
//
// 异步函数（依赖 wx.cloud.callFunction，通过 ctx 注入便于测试）：
//   matchPlayersAsync
//
// 风格对齐 mock-user-pool.js / task-hall-store.js：
//   var + function 声明，错误返回 { ok: false, errCode, errMsg }

'use strict'

var mockPool = require('./mock-user-pool.js')
var getMockUsers = mockPool.getMockUsers

// C-P4: 信任分权重（gold 1.2 / reliable 1.0 / normal 1.0 / newbie 0.8 / watch 0.3）
var trustScore = require('./trust-score.js')
var getTierWeight = trustScore.getTierWeight

// 默认头像（与 mock-user-pool 对齐）
var DEFAULT_AVATAR = '/assets/images/avatar.webp'

// 云端调用超时（ms）
var CLOUD_TIMEOUT = 4000

// ===== 纯函数 =====

/**
 * 标准化玩家对象（云端 / mock 统一结构）
 * @param {object} raw - 原始玩家对象
 * @param {string} source - 'cloud' | 'mock'
 * @returns {object} 标准化后的玩家 { openId, nickname, avatar, interests, district, bio, isReal }
 */
function normalizePlayer(raw, source) {
  if (!raw || typeof raw !== 'object') return null
  return {
    openId: typeof raw.openId === 'string' ? raw.openId : '',
    nickname: typeof raw.nickname === 'string' ? raw.nickname : '',
    avatar: typeof raw.avatar === 'string' && raw.avatar ? raw.avatar : DEFAULT_AVATAR,
    interests: Array.isArray(raw.interests) ? raw.interests.slice() : [],
    district: typeof raw.district === 'string' ? raw.district : '',
    bio: typeof raw.bio === 'string' ? raw.bio : '',
    isReal: source === 'cloud'
  }
}

/**
 * 兴趣是否有交集
 */
function hasInterestOverlap(userInterests, targetInterests) {
  if (!targetInterests || targetInterests.length === 0) return false
  if (!userInterests || userInterests.length === 0) return false
  for (var i = 0; i < targetInterests.length; i++) {
    if (userInterests.indexOf(targetInterests[i]) !== -1) return true
  }
  return false
}

/**
 * 按区/兴趣优先级给玩家排序（不洗牌，稳定排序）
 * 优先级：district+interests > district > interests > 其他
 * 同优先级内保持原始顺序（调用方如需随机可先洗牌）
 *
 * C-P4: 可选 trustMap 叠加信任分权重
 *   - gold（1.2）/ reliable（1.0）/ normal（1.0）/ newbie（0.8）→ baseScore × weight
 *   - watch（0.3）→ 降级到队尾（不过滤，给改进机会）
 *   - trustMap 未提供或玩家不在其中 → 按 normal（1.0）处理，向后兼容
 *
 * @param {Array} players - 标准化玩家数组
 * @param {object} filters - { district, interests }
 * @param {object} [trustMap] - { [openId]: { tier } }（可选）
 * @returns {Array} 排序后的新数组（不改原数组）
 */
function rankByRelevance(players, filters, trustMap) {
  filters = filters || {}
  var district = filters.district
  var interests = filters.interests
  var list = Array.isArray(players) ? players.slice() : []
  // trustMap 必须是纯对象，排除数组（数组 typeof==='object' 但不是信任映射）
  var hasTrust = trustMap && typeof trustMap === 'object' && !Array.isArray(trustMap)

  list.sort(function (a, b) {
    // null/undefined/非对象元素排到队尾，不参与评分（防御性，避免 .district/.openId 抛错）
    var aValid = a && typeof a === 'object'
    var bValid = b && typeof b === 'object'
    if (!aValid && !bValid) return 0
    if (!aValid) return 1   // a 无效 → 排后面
    if (!bValid) return -1  // b 无效 → 排后面

    var aD = district && a.district === district ? 1 : 0
    var bD = district && b.district === district ? 1 : 0
    var aI = interests && interests.length > 0 && hasInterestOverlap(a.interests, interests) ? 1 : 0
    var bI = interests && interests.length > 0 && hasInterestOverlap(b.interests, interests) ? 1 : 0
    var aBase = aD * 2 + aI
    var bBase = bD * 2 + bI

    // 无 trustMap → 原始逻辑（向后兼容）
    if (!hasTrust) {
      return bBase - aBase
    }

    // 查 trust tier（缺失按 normal 处理）
    var aTrust = a.openId && trustMap[a.openId]
    var bTrust = b.openId && trustMap[b.openId]
    var aTier = (aTrust && aTrust.tier) || 'normal'
    var bTier = (bTrust && bTrust.tier) || 'normal'

    // watch tier 降级到队尾（不管 baseScore）
    var aWatch = aTier === 'watch'
    var bWatch = bTier === 'watch'
    if (aWatch !== bWatch) {
      return aWatch ? 1 : -1 // watch 排后面
    }

    // 非 watch：baseScore × trustWeight
    var aScore = aBase * getTierWeight(aTier)
    var bScore = bBase * getTierWeight(bTier)
    return bScore - aScore
  })
  return list
}

/**
 * 合并真实 + mock 玩家，按优先级截取 count 个
 * 策略：真实玩家优先（按相关性排序），不足时用 mock 补齐
 * @param {Array} realPlayers - 云端真实玩家（原始结构）
 * @param {Array} mockPlayers - mock 玩家（原始结构，已由 getMockUsers 返回）
 * @param {number} count - 需要的玩家数
 * @param {object} filters - { district, interests, excludeOpenId }
 * @param {object} [trustMap] - C-P4 信任分映射 { [openId]: { tier } }（可选）
 * @returns {Array} 标准化玩家数组，长度 = min(count, 可用总量)
 */
function mergeAndPick(realPlayers, mockPlayers, count, filters, trustMap) {
  if (typeof count !== 'number' || !isFinite(count) || count <= 0 || Math.floor(count) !== count) {
    return []
  }
  filters = filters || {}
  var excludeOpenId = filters.excludeOpenId

  // 1. 标准化真实玩家，排除当前用户 + 去 openId 空
  var real = []
  if (Array.isArray(realPlayers)) {
    for (var i = 0; i < realPlayers.length; i++) {
      var p = normalizePlayer(realPlayers[i], 'cloud')
      if (!p || !p.openId) continue
      if (excludeOpenId && p.openId === excludeOpenId) continue
      real.push(p)
    }
  }
  // 真实玩家按相关性排序（C-P4: 含 trust 权重）
  real = rankByRelevance(real, filters, trustMap)

  // 2. 标准化 mock 玩家，排除真实玩家已有的 openId（避免重复）
  var realOpenIds = {}
  for (var r = 0; r < real.length; r++) {
    realOpenIds[real[r].openId] = true
  }
  var mock = []
  if (Array.isArray(mockPlayers)) {
    for (var m = 0; m < mockPlayers.length; m++) {
      var mp = normalizePlayer(mockPlayers[m], 'mock')
      if (!mp || !mp.openId) continue
      if (excludeOpenId && mp.openId === excludeOpenId) continue
      if (realOpenIds[mp.openId]) continue
      mock.push(mp)
    }
  }

  // 3. 真实优先，mock 补齐
  var merged = real.concat(mock)
  return merged.slice(0, Math.min(count, merged.length))
}

/**
 * 判断云端匹配结果是否需要降级到 mock
 * 降级条件：result 为空 / ok 非显式 true / players 不是数组 / players 为空数组
 * 注意：只有 ok === true 才视为成功；ok='' / ok=0 / ok=undefined 等任何 falsy 值都降级（防御性）
 * @param {object} result - 云端返回
 * @returns {boolean} true = 需要降级
 */
function shouldFallback(result) {
  if (!result || typeof result !== 'object') return true
  if (result.ok !== true) return true
  if (!Array.isArray(result.players)) return true
  if (result.players.length === 0) return true
  return false
}

/**
 * 计算需要匹配的搭子数
 * = min(maxMembers - currentMembers - 1, maxPartners)
 * -1 是当前用户占一个名额
 * @param {number} maxMembers - 房间最大人数
 * @param {number} currentMembers - 当前已有人数
 * @param {number} [maxPartners=4] - 单次匹配上限
 * @returns {number}
 */
function computePartnerCount(maxMembers, currentMembers, maxPartners) {
  var max = maxMembers || 0
  var current = currentMembers || 0
  var cap = typeof maxPartners === 'number' ? maxPartners : 4
  if (cap < 0) cap = 0
  var slots = max - current - 1
  if (slots < 0) slots = 0
  if (slots > cap) slots = cap
  return slots
}

// ===== 异步函数（依赖 wx.cloud，通过 ctx 注入）=====

/**
 * 混合模式匹配玩家：云端优先，mock 兜底
 * @param {object} user - { openId, nickname, interests?, district? }
 * @param {number} count - 需要的搭子数
 * @param {object} filters - { district, interests, excludeOpenId }
 * @param {object} ctx - 注入上下文 { cloudReady, callFunction }
 *   ctx.cloudReady: boolean - 云开发是否就绪
 *   ctx.callFunction: function({name, data, timeout}) => Promise - wx.cloud.callFunction 的包装
 * @returns {Promise<{ok:boolean, players:Array, source:string}>}
 *   source: 'cloud' | 'mock' | 'mixed'（有真实+mock）/ 'cloud_offline'（云不可用）
 */
function matchPlayersAsync(user, count, filters, ctx) {
  filters = filters || {}
  ctx = ctx || {}

  var excludeOpenId = (user && user.openId) || filters.excludeOpenId || ''
  var mergedFilters = {
    district: filters.district || '',
    interests: Array.isArray(filters.interests) ? filters.interests : [],
    excludeOpenId: excludeOpenId
  }

  // 云端不可用 → 直接 mock
  if (!ctx.cloudReady || typeof ctx.callFunction !== 'function') {
    var mockOnly = getMockUsers(count, mergedFilters)
    return Promise.resolve({
      ok: true,
      players: mergeAndPick([], mockOnly, count, mergedFilters),
      source: 'cloud_offline'
    })
  }

  // 云端可用 → 先调云函数匹配
  return new Promise(function (resolve) {
    var settled = false

    // 超时兜底
    var timer = setTimeout(function () {
      if (settled) return
      settled = true
      var mockFallback = getMockUsers(count, mergedFilters)
      resolve({
        ok: true,
        players: mergeAndPick([], mockFallback, count, mergedFilters),
        source: 'cloud_timeout'
      })
    }, CLOUD_TIMEOUT)

    try {
      var promise = ctx.callFunction({
        name: 'matchPlayers',
        data: {
          user: user,
          count: count,
          filters: {
            district: mergedFilters.district,
            interests: mergedFilters.interests
          }
        },
        timeout: CLOUD_TIMEOUT
      })

      // ctx.callFunction 可能返回 Promise 或 { success/fail } 回调风格
      if (promise && typeof promise.then === 'function') {
        promise.then(function (res) {
          if (settled) return
          // C-P4: 查询真实玩家信任分（可选，失败降级到无 trust 加权）
          var realOpenIds = extractRealOpenIds(res)
          if (ctx.trustLoader && typeof ctx.trustLoader === 'function' && realOpenIds.length > 0) {
            // trust 查询独立超时 2s，不阻塞主流程
            var trustDone = false
            var trustTimer = setTimeout(function () {
              if (settled || trustDone) return
              trustDone = true
              settled = true
              clearTimeout(timer)
              resolve(handleCloudResult(res, count, mergedFilters, null))
            }, 2000)
            try {
              Promise.resolve(ctx.trustLoader(realOpenIds)).then(function (trustMap) {
                if (settled || trustDone) return
                trustDone = true
                settled = true
                clearTimeout(trustTimer)
                clearTimeout(timer)
                resolve(handleCloudResult(res, count, mergedFilters, trustMap || null))
              }).catch(function () {
                if (settled || trustDone) return
                trustDone = true
                settled = true
                clearTimeout(trustTimer)
                clearTimeout(timer)
                resolve(handleCloudResult(res, count, mergedFilters, null))
              })
            } catch (e) {
              if (settled || trustDone) return
              trustDone = true
              settled = true
              clearTimeout(trustTimer)
              clearTimeout(timer)
              resolve(handleCloudResult(res, count, mergedFilters, null))
            }
          } else {
            settled = true
            clearTimeout(timer)
            resolve(handleCloudResult(res, count, mergedFilters, null))
          }
        }).catch(function () {
          if (settled) return
          settled = true
          clearTimeout(timer)
          var mockFallback = getMockUsers(count, mergedFilters)
          resolve({
            ok: true,
            players: mergeAndPick([], mockFallback, count, mergedFilters),
            source: 'cloud_error'
          })
        })
      } else {
        // 回调风格不支持的兜底
        if (!settled) {
          settled = true
          clearTimeout(timer)
          var mockFallback2 = getMockUsers(count, mergedFilters)
          resolve({
            ok: true,
            players: mergeAndPick([], mockFallback2, count, mergedFilters),
            source: 'cloud_error'
          })
        }
      }
    } catch (e) {
      if (settled) return
      settled = true
      clearTimeout(timer)
      var mockFallback3 = getMockUsers(count, mergedFilters)
      resolve({
        ok: true,
        players: mergeAndPick([], mockFallback3, count, mergedFilters),
        source: 'cloud_error'
      })
    }
  })
}

// 处理云端返回结果
function handleCloudResult(res, count, filters, trustMap) {
  var result = res && res.result
  if (shouldFallback(result)) {
    // 云端无匹配 → 全 mock
    var mockOnly = getMockUsers(count, filters)
    return {
      ok: true,
      players: mergeAndPick([], mockOnly, count, filters),
      source: 'mock'
    }
  }

  var realPlayers = result.players
  // 真实玩家可能不足 count → mock 补齐
  var mockNeeded = Math.max(0, count - realPlayers.length)
  var mockPlayers = mockNeeded > 0 ? getMockUsers(mockNeeded, filters) : []

  var merged = mergeAndPick(realPlayers, mockPlayers, count, filters, trustMap)

  // 判断 source
  var hasReal = false
  var hasMock = false
  for (var i = 0; i < merged.length; i++) {
    if (merged[i].isReal) hasReal = true
    else hasMock = true
  }
  var source = (hasReal && hasMock) ? 'mixed' : (hasReal ? 'cloud' : 'mock')

  return { ok: true, players: merged, source: source }
}

/**
 * C-P4: 从云端返回结果中提取真实玩家 openId 列表（供 trust 查询）
 * @param {object} res - 云函数返回
 * @returns {string[]} openId 列表
 */
function extractRealOpenIds(res) {
  var result = res && res.result
  if (shouldFallback(result)) return []
  var players = result.players
  if (!Array.isArray(players)) return []
  var ids = []
  for (var i = 0; i < players.length; i++) {
    var p = players[i]
    if (p && typeof p.openId === 'string' && p.openId && ids.indexOf(p.openId) === -1) {
      ids.push(p.openId)
    }
  }
  return ids
}

module.exports = {
  // 常量
  DEFAULT_AVATAR: DEFAULT_AVATAR,
  CLOUD_TIMEOUT: CLOUD_TIMEOUT,
  // 纯函数
  normalizePlayer: normalizePlayer,
  hasInterestOverlap: hasInterestOverlap,
  rankByRelevance: rankByRelevance,
  mergeAndPick: mergeAndPick,
  shouldFallback: shouldFallback,
  computePartnerCount: computePartnerCount,
  // 异步函数
  matchPlayersAsync: matchPlayersAsync,
  // 内部导出（供测试）
  _internal: {
    handleCloudResult: handleCloudResult,
    extractRealOpenIds: extractRealOpenIds
  }
}
