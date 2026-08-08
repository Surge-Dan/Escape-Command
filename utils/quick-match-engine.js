// utils/quick-match-engine.js
// B3 同频骰子 AI 快速匹配引擎
//
// 设计目标：
//   解决「同频骰子任务/搭子/主题都太随机」的体验问题：
//   用户点同频骰子 → AI 基于历史偏好自动选任务/搭子/主题，3 秒内出结果
//   - 任务：复用 generator-engine.generate（已有完整的偏好加权 + 安全过滤 + 评分）
//   - 主题：从 userPrefs.type 计数推断 relax/adventure/social
//   - 搭子：复用 player-matcher.matchPlayersAsync（云端优先 + mock 兜底）
//
// 架构：
//   - 纯函数部分（零 wx 依赖，可 Node 直接 require 测试）：
//       inferThemeFromPrefs / inferInterestsFromPrefs / pickPartnerCount /
//       buildQuickMatchContext / buildResult / regenerate
//   - 异步部分（依赖 matcherCtx.callFunction，通过 ctx 注入便于测试）：
//       executeQuickMatch
//
// 失败降级：
//   - 任务生成失败 → 返回 { ok: false, errCode: 'NO_COMMAND' }
//   - 搭子匹配失败 → 不阻塞，partners=[]，still ok=true
//   - 任何异常都被捕获，返回 { ok: false, errCode, errMsg }

'use strict'

var generatorEngine = require('./generator-engine.js')
var playerMatcher = require('./player-matcher.js')  // player-matcher 已在 packageSync/utils/

// type → style 映射（与 group-room-store.ROLE_LIBRARY 对齐）
// relax: sense/color/collect（内省向）
// adventure: walk/food（外向探索）
// social: 其他（社交向，含 custom）
var TYPE_TO_STYLE = {
  sense: 'relax',
  color: 'relax',
  collect: 'relax',
  walk: 'adventure',
  food: 'adventure',
  culture: 'adventure',
  custom: 'social',
  breakthrough: 'adventure'
}

// style → 主题文案
var STYLE_LABELS = {
  relax: { name: '放松', desc: '咖啡 闲逛 发呆', icon: '☕' },
  adventure: { name: '探索', desc: '探店 打卡 冒险', icon: '🧭' },
  social: { name: '社交', desc: '聚餐 桌游 聊天', icon: '🎉' }
}

// type → interest 映射（与 group-room-store.PREFERENCE_OPTIONS.interests 对齐）
var TYPE_TO_INTEREST = {
  sense: 'nature',
  color: 'photo',
  collect: 'culture',
  walk: 'nature',
  food: 'food',
  culture: 'culture',
  custom: 'photo'
}

// ===== QM-01: 从 userPrefs 推断主题（style）=====
// userPrefs.type: { color: 3, walk: 5, sense: 2 }
// 取 top1 type → 映射到 style
// breakthrough 不算偏好，全部过滤；过滤后空则兜底 social
function inferThemeFromPrefs(userPrefs) {
  var prefs = userPrefs && userPrefs.type ? userPrefs.type : {}
  var entries = Object.keys(prefs).map(function (k) {
    return { type: k, count: prefs[k] || 0 }
  }).filter(function (e) { return e.count > 0 && e.type !== 'breakthrough' })
    .sort(function (a, b) { return b.count - a.count })

  if (entries.length === 0) return 'social' // 兜底
  var topType = entries[0].type
  return TYPE_TO_STYLE[topType] || 'social'
}

// ===== QM-02: 从 userPrefs 推断 interests 数组（最多 3 个）=====
function inferInterestsFromPrefs(userPrefs) {
  var prefs = userPrefs && userPrefs.type ? userPrefs.type : {}
  var entries = Object.keys(prefs).map(function (k) {
    return { type: k, count: prefs[k] || 0 }
  }).filter(function (e) { return e.count > 0 && e.type !== 'breakthrough' })
    .sort(function (a, b) { return b.count - a.count })
    .slice(0, 3)

  var interests = []
  var seen = {}
  for (var i = 0; i < entries.length; i++) {
    var intr = TYPE_TO_INTEREST[entries[i].type] || 'photo'
    if (!seen[intr]) {
      seen[intr] = true
      interests.push(intr)
    }
  }
  // 兜底：无偏好时给一个默认
  if (interests.length === 0) interests = ['photo']
  return interests
}

// ===== QM-03: 根据 duration 推断搭子数 =====
// < 30 分钟 → 1 人（轻量）
// 30-90 → 2 人
// > 90 → 3 人
// 非法 duration（非数字/NaN/负数/0）兜底 30 → 2 人
function pickPartnerCount(duration) {
  var d = (typeof duration === 'number' && isFinite(duration) && duration > 0) ? duration : 30
  if (d < 30) return 1
  if (d <= 90) return 2
  return 3
}

// ===== QM-04: 构造 generator-engine 上下文 =====
function buildQuickMatchContext(options) {
  var opts = options || {}
  var userPrefs = opts.userPrefs && typeof opts.userPrefs === 'object' ? opts.userPrefs : { type: {} }
  var duration = (typeof opts.duration === 'number' && isFinite(opts.duration) && opts.duration > 0) ? opts.duration : 30
  var hour = (typeof opts.hour === 'number' && isFinite(opts.hour) && opts.hour >= 0 && opts.hour < 24) ? Math.floor(opts.hour) : safeHour()
  var weather = typeof opts.weather === 'string' && opts.weather ? opts.weather : 'sunny'

  // 主题由偏好推断
  var theme = inferThemeFromPrefs(userPrefs)
  // mode：adventure → walk；relax → micro；social → micro（社交向短平快）
  var mode = (theme === 'adventure') ? 'walk' : 'micro'

  return {
    commandPool: Array.isArray(opts.commandPool) ? opts.commandPool : [],
    completedIds: Array.isArray(opts.completedIds) ? opts.completedIds : [],
    completedDates: opts.completedDates && typeof opts.completedDates === 'object' ? opts.completedDates : {},
    hour: hour,
    weather: weather,
    nearbyPOI: opts.nearbyPOI && typeof opts.nearbyPOI === 'object' ? opts.nearbyPOI : {},
    lastType: typeof opts.lastType === 'string' ? opts.lastType : '',
    sameTypeCount: Number.isFinite(opts.sameTypeCount) ? opts.sameTypeCount : 0,
    userPrefs: userPrefs,
    mode: mode,
    duration: duration,
    targetDuration: duration,
    userIntensity: opts.userIntensity === 'low' || opts.userIntensity === 'high' ? opts.userIntensity : 'medium',
    locationName: typeof opts.locationName === 'string' ? opts.locationName : '',
    season: typeof opts.season === 'string' ? opts.season : '',
    userLocation: opts.userLocation && typeof opts.userLocation === 'object' &&
      typeof opts.userLocation.latitude === 'number' && typeof opts.userLocation.longitude === 'number'
      ? { latitude: opts.userLocation.latitude, longitude: opts.userLocation.longitude }
      : null,
    nightMaxDistance: Number.isFinite(opts.nightMaxDistance) && opts.nightMaxDistance > 0 ? opts.nightMaxDistance : 1000,
    // 快速匹配专属
    _theme: theme,
    _duration: duration
  }
}

function safeHour() {
  try {
    var h = new Date().getHours()
    return (h >= 0 && h < 24) ? h : 12
  } catch (e) {
    return 12
  }
}

// ===== QM-05: 构造最终结果（纯函数）=====
function buildResult(command, theme, partners, options) {
  var opts = options || {}
  var label = STYLE_LABELS[theme] || STYLE_LABELS.social
  return {
    ok: true,
    command: command,
    theme: {
      id: theme,
      name: label.name,
      desc: label.desc,
      icon: label.icon
    },
    partners: Array.isArray(partners) ? partners : [],
    partnerCount: Array.isArray(partners) ? partners.length : 0,
    expectedPartnerCount: opts.expectedPartnerCount || 0,
    matchedAt: typeof opts.matchedAt === 'number' ? opts.matchedAt : Date.now(),
    duration: opts.duration || 0,
    fallback: opts.fallback === true
  }
}

// ===== QM-06: 异步执行快速匹配（主入口）=====
// options: { userPrefs, commandPool, completedIds, duration, hour, weather, userLocation, ... }
// matcherCtx: player-matcher 需要的 ctx（含 callFunction），传 null 则跳过搭子匹配
// user: { openId, nickname, avatar, interests, district } 当前用户
function executeQuickMatch(options, user, matcherCtx) {
  var ctx = buildQuickMatchContext(options || {})
  var theme = ctx._theme
  var duration = ctx._duration

  // 1. 同步生成任务
  var genResult
  try {
    genResult = generatorEngine.generate(ctx)
  } catch (e) {
    return Promise.resolve({
      ok: false,
      errCode: 'GENERATE_FAILED',
      errMsg: '任务生成异常: ' + (e && e.message ? e.message : String(e))
    })
  }

  if (!genResult || !genResult.ok || !genResult.command) {
    return Promise.resolve({
      ok: false,
      errCode: 'NO_COMMAND',
      errMsg: '没有可用的任务'
    })
  }

  var command = genResult.command
  var expectedPartnerCount = pickPartnerCount(duration)

  // 2. 异步匹配搭子
  if (!matcherCtx || typeof matcherCtx.callFunction !== 'function') {
    // 无 matcherCtx：跳过搭子匹配，返回仅任务的 ok 结果
    return Promise.resolve(buildResult(command, theme, [], {
      expectedPartnerCount: expectedPartnerCount,
      duration: duration,
      fallback: genResult.fallback === true
    }))
  }

  // 构造匹配参数
  var interests = inferInterestsFromPrefs(options.userPrefs)
  var filters = {
    interests: interests,
    district: (options.userLocation && options.userLocation.district) || ''
  }

  return new Promise(function (resolve) {
    try {
      var matcher = require('./player-matcher.js')
      var userObj = normalizeUser(user, interests)
      matcher.matchPlayersAsync(userObj, expectedPartnerCount, filters, matcherCtx)
        .then(function (matchResult) {
          var partners = (matchResult && matchResult.ok && Array.isArray(matchResult.players))
            ? matchResult.players
            : []
          resolve(buildResult(command, theme, partners, {
            expectedPartnerCount: expectedPartnerCount,
            duration: duration,
            fallback: genResult.fallback === true
          }))
        })
        .catch(function (err) {
          // 搭子匹配失败：不阻塞，返回空搭子
          resolve(buildResult(command, theme, [], {
            expectedPartnerCount: expectedPartnerCount,
            duration: duration,
            fallback: genResult.fallback === true,
            partnerError: err && err.message ? err.message : String(err)
          }))
        })
    } catch (e) {
      // matcher 加载失败：不阻塞
      resolve(buildResult(command, theme, [], {
        expectedPartnerCount: expectedPartnerCount,
        duration: duration,
        fallback: genResult.fallback === true,
        partnerError: e && e.message ? e.message : String(e)
      }))
    }
  })
}

// ===== QM-07: 用户对象归一化 =====
function normalizeUser(user, interests) {
  if (!user || typeof user !== 'object') {
    return {
      openId: 'local_user',
      nickname: '我',
      avatar: '/assets/avatar-default.webp',
      interests: interests || [],
      district: '',
      bio: ''
    }
  }
  return {
    openId: typeof user.openId === 'string' ? user.openId : 'local_user',
    nickname: typeof user.nickname === 'string' ? user.nickname : '我',
    avatar: typeof user.avatar === 'string' && user.avatar ? user.avatar : '/assets/avatar-default.webp',
    interests: Array.isArray(user.interests) ? user.interests : (interests || []),
    district: typeof user.district === 'string' ? user.district : '',
    bio: typeof user.bio === 'string' ? user.bio : ''
  }
}

// ===== QM-08: 换一换（强制 lastType=当前 type 以触发去重）=====
function regenerate(options, user, matcherCtx) {
  var opts = options || {}
  // 取当前 command 的 type 作为 lastType，强制 generator 选不同类型
  if (opts.currentCommand && opts.currentCommand.type) {
    opts.lastType = opts.currentCommand.type
    opts.sameTypeCount = 2 // 触发同类型抑制
  }
  return executeQuickMatch(opts, user, matcherCtx)
}

module.exports = {
  // 常量
  TYPE_TO_STYLE: TYPE_TO_STYLE,
  TYPE_TO_INTEREST: TYPE_TO_INTEREST,
  STYLE_LABELS: STYLE_LABELS,
  // 纯函数
  inferThemeFromPrefs: inferThemeFromPrefs,
  inferInterestsFromPrefs: inferInterestsFromPrefs,
  pickPartnerCount: pickPartnerCount,
  buildQuickMatchContext: buildQuickMatchContext,
  buildResult: buildResult,
  normalizeUser: normalizeUser,
  // 异步主入口
  executeQuickMatch: executeQuickMatch,
  regenerate: regenerate
}
