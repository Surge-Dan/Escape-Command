// utils/generator-engine.js
// 出逃指令生成引擎（B-02~B-06）
//
// 纯函数模块，零 wx 依赖，context 全部入参传入，可在 Node 直接 require 测试。
// app.js 退化为薄委托层，调用本引擎。
//
// 覆盖：
//   B-02 getLoadingCopy      生成加载文案
//   B-03 filterByConditions  条件校验（已完成/重复类型/POI 可达）
//   B-04 filterByBusinessHours POI 营业时间窗
//   B-05 filterBySafety      安全风险（深夜/雨天/极端）
//   B-06 getFallbackCommands 兜底任务（12 条 + 偏好加权）
//   B-01 getFaceForType      骰子面映射（供 generating 页用）

'use strict'

// ===== B-04: POI 营业时间窗表（24h 制，[start, end) 半开区间）=====
// 保守策略：未知类型不过滤（返回 [0, 24]）
var POI_HOURS = {
  cafe: [7, 22],          // 咖啡馆 07:00-22:00
  park: [6, 21],          // 公园 06:00-21:00
  market: [6, 20],        // 菜市场 06:00-20:00
  convenience: [0, 24],   // 便利店 24h
  lake: [0, 24],          // 河湖边（户外公共空间，24h 可达）
  alley: [0, 24],         // 巷子（户外公共空间）
  culture: [9, 17],       // 文化场所（美术馆/博物馆）09:00-17:00
  null: [0, 24]           // 无 POI 要求
}

// ===== B-02: 加载文案库 =====
// 结构：{ mode: { durationRange: [copy] } }，按模式 + 时长分段
var LOADING_COPIES = {
  micro: {
    short: ['正在拼一份碎片出逃', '快速摇一个微指令', '马上就好，碎片时间也能出逃'],
    medium: ['正在调和你的微出逃', '摇骰中，小冒险在路上']
  },
  walk: {
    short: ['正在铺一条漫步路线', '摇骰中，准备慢慢走'],
    medium: ['正在编排深度漫游', '摇骰中，长路线生成中'],
    long: ['正在规划一场深度漫游', '长路线生成中，稍等一下']
  },
  breakthrough: {
    short: ['正在撕开舒适圈', '摇骰中，新鲜感在路上'],
    medium: ['正在编排破圈出逃', '新鲜路线生成中']
  },
  sync: {
    short: ['正在撮合同频出逃', '摇骰中，组局在路上'],
    medium: ['正在编排同频剧本', '组局生成中']
  },
  night: {
    any: ['夜色摇骰中', '正在生成夜行指令', '安静的夜晚，摇一个微指令']
  },
  rainy: {
    any: ['雨天摇骰中', '正在生成室内出逃', '雨声里摇一个微指令']
  },
  default: ['正在生成你的出逃记录', '摇骰中，马上就好', '正在为你挑一个出逃']
}

// ===== B-06: 兜底任务库（12 条，覆盖 6 种 type × 2 种时长）=====
// 字段与 data/commands.js 兼容；id 全部 'fb' 前缀，不污染主库
var FALLBACK_COMMANDS = [
  // color 颜色探索
  { id: 'fb001', content: '找一块蓝色招牌或路牌，和它合个影', type: 'color', duration: 15, outdoor: true, nightSafe: true, rainy: true, requirePOI: null, cost: 0, double: false, tip: '蓝色常常藏在路牌和店招里' },
  { id: 'fb002', content: '找一个圆形的东西，把它拍下来', type: 'color', duration: 10, outdoor: false, nightSafe: true, rainy: true, requirePOI: null, cost: 0, double: false, tip: '窨井盖、轮胎、路牌、碗——圆就在身边' },
  // sense 感官体验
  { id: 'fb003', content: '找个能坐下的地方，闭眼听3分钟，记下听到的5种声音', type: 'sense', duration: 10, outdoor: true, nightSafe: true, rainy: true, requirePOI: null, cost: 0, double: false, tip: '不要看，耳朵会打开新世界' },
  { id: 'fb004', content: '深呼吸5次，每次都闻闻空气里有什么味道', type: 'sense', duration: 5, outdoor: false, nightSafe: true, rainy: true, requirePOI: null, cost: 0, double: false, tip: '饭馆的香味、雨后的土味、桂花香' },
  // food 美食探索
  { id: 'fb005', content: '买一份热乎小吃，慢慢吃完', type: 'food', duration: 15, outdoor: true, nightSafe: false, rainy: true, requirePOI: null, cost: 10, double: false, tip: '把选择权交给今天的胃口' },
  { id: 'fb006', content: '去便利店，观察这个时间店里都有什么样的人', type: 'food', duration: 10, outdoor: false, nightSafe: true, rainy: true, requirePOI: 'convenience', cost: 10, double: false, tip: '深夜便利店是城市的缩影' },
  // walk 漫步发现
  { id: 'fb007', content: '走一条没走过的路，走15分钟', type: 'walk', duration: 20, outdoor: true, nightSafe: false, rainy: false, requirePOI: null, cost: 0, double: false, tip: '迷路了再导航回来' },
  { id: 'fb008', content: '出门左转，走到第一个路口再左转，看看能不能绕回来', type: 'walk', duration: 25, outdoor: true, nightSafe: false, rainy: false, requirePOI: null, cost: 0, double: false, tip: '左转左转左转左转，是个圈吗' },
  // collect 收藏拼贴
  { id: 'fb009', content: '带一个小袋子出门，捡起第一眼吸引你的小物', type: 'collect', duration: 15, outdoor: true, nightSafe: false, rainy: false, requirePOI: null, cost: 0, double: false, tip: '找个地方把它摆好，拍下来' },
  { id: 'fb010', content: '找一面有涂鸦或斑驳痕迹的墙，在前面拍一张影子', type: 'collect', duration: 15, outdoor: true, nightSafe: false, rainy: false, requirePOI: null, cost: 0, double: false, tip: '下午阳光斜照的时候影子最好看' },
  // culture 如实文化
  { id: 'fb011', content: '找一个文化场所的入口，走进去挑一件展品多看一会', type: 'culture', duration: 25, outdoor: false, nightSafe: false, rainy: true, requirePOI: 'culture', cost: 0, double: false, tip: '拍下它的细节' },
  { id: 'fb012', content: '找一个安静的角落，写下你此刻听到的一种声音', type: 'culture', duration: 10, outdoor: false, nightSafe: true, rainy: true, requirePOI: null, cost: 0, double: false, tip: '一句话就够' }
]

// ===== B-01: type → 骰子面映射（1-6）=====
// 稳定映射，未知 type fallback 到 1
var TYPE_FACE_MAP = {
  color: 1,
  sense: 2,
  food: 3,
  walk: 4,
  collect: 5,
  culture: 6
}

// ===== 工具函数 =====

// 防御性归一化 context，所有入参兜底
function normalizeCtx(ctx) {
  var c = ctx && typeof ctx === 'object' ? ctx : {}
  return {
    commandPool: Array.isArray(c.commandPool) ? c.commandPool : [],
    completedIds: Array.isArray(c.completedIds) ? c.completedIds : [],
    completedDates: c.completedDates && typeof c.completedDates === 'object' ? c.completedDates : {},
    hour: isValidHour(c.hour) ? Math.floor(c.hour) : safeHour(),
    weather: typeof c.weather === 'string' ? c.weather : 'sunny',
    nearbyPOI: c.nearbyPOI && typeof c.nearbyPOI === 'object' ? c.nearbyPOI : {},
    lastType: typeof c.lastType === 'string' ? c.lastType : '',
    sameTypeCount: Number.isFinite(c.sameTypeCount) ? c.sameTypeCount : 0,
    userPrefs: c.userPrefs && typeof c.userPrefs === 'object' ? c.userPrefs : { type: {} },
    mode: typeof c.mode === 'string' ? c.mode : '',
    duration: Number.isFinite(c.duration) ? c.duration : 0,
    reduceMotion: c.reduceMotion === true,
    // B-07 天气细筛：temperature/visibility/condition，均可选，未传则 filterByWeather 不过滤
    weatherDetail: c.weatherDetail && typeof c.weatherDetail === 'object' ? {
      temperature: Number.isFinite(c.weatherDetail.temperature) ? c.weatherDetail.temperature : null,
      visibility: typeof c.weatherDetail.visibility === 'string' ? c.weatherDetail.visibility : '',
      condition: typeof c.weatherDetail.condition === 'string' ? c.weatherDetail.condition : ''
    } : { temperature: null, visibility: '', condition: '' },
    // B-08 地点去重：最近 N 次出逃的 requirePOI 列表 + 对应时间戳（24h 窗口）
    recentLocations: Array.isArray(c.recentLocations) ? c.recentLocations : [],
    recentLocationTimes: Array.isArray(c.recentLocationTimes) ? c.recentLocationTimes : [],
    // B-09 历史体验去重：最近 N 次完成指令的 content 文本（相似度过滤）
    recentContents: Array.isArray(c.recentContents) ? c.recentContents : [],
    // B-10 难度匹配：用户强度偏好 low/medium/high，未传则 medium（全留）
    userIntensity: c.userIntensity === 'low' || c.userIntensity === 'high' ? c.userIntensity : 'medium',
    // B-12 时长匹配：目标时长，未传则 0（不参与评分）
    targetDuration: Number.isFinite(c.targetDuration) ? c.targetDuration : 0,
    // B-14 变量替换：地点名/季节，均可选
    locationName: typeof c.locationName === 'string' ? c.locationName : '',
    season: typeof c.season === 'string' ? c.season : '',
    // B-15 夜间距离限制：用户位置（可选），用于夜间户外指令距离过滤
    userLocation: c.userLocation && typeof c.userLocation === 'object' &&
      typeof c.userLocation.latitude === 'number' && typeof c.userLocation.longitude === 'number'
      ? { latitude: c.userLocation.latitude, longitude: c.userLocation.longitude }
      : null,
    // B-15 夜间最大允许距离（米），默认 1000
    nightMaxDistance: Number.isFinite(c.nightMaxDistance) && c.nightMaxDistance > 0 ? c.nightMaxDistance : 1000
  }
}

// B-11: type 归一化
// commands.js 的 type 值（sensory/market/moment）与 TYPE_FACE_MAP/偏好 key（sense/food/collect）不一致
// 统一归一化后再比对偏好/面映射，保证兴趣平衡与骰子面正确
function normalizeType(type) {
  if (typeof type !== 'string') return ''
  var map = { sensory: 'sense', market: 'food', moment: 'collect' }
  // 用 hasOwnProperty 避免 constructor/__proto__ 等原型链键污染
  return Object.prototype.hasOwnProperty.call(map, type) ? map[type] : type
}

// 取当前小时（0-23），用于 default
function safeHour() {
  try {
    var h = new Date().getHours()
    return (h >= 0 && h < 24) ? h : 12
  } catch (e) {
    return 12
  }
}

function isValidHour(hour) {
  return typeof hour === 'number' && Number.isFinite(hour) && hour >= 0 && hour < 24
}

// ===== B-01: type → 骰子面 =====
function getFaceForType(type) {
  if (typeof type !== 'string') return 1
  var face = TYPE_FACE_MAP[type]
  if (typeof face === 'number' && face >= 1 && face <= 6) return face
  return 1
}

// ===== B-02: 加载文案 =====
function getLoadingCopy(ctx) {
  var c = normalizeCtx(ctx)
  var mode = c.mode
  var duration = c.duration
  var hour = c.hour

  // 深夜/雨天优先（场景感强）
  var isNight = hour >= 22 || hour < 6
  if (isNight && (LOADING_COPIES.night && LOADING_COPIES.night.any)) {
    return pickRandom(LOADING_COPIES.night.any)
  }
  if ((c.weather === 'rainy' || c.weather === 'storm') && LOADING_COPIES.rainy && LOADING_COPIES.rainy.any) {
    return pickRandom(LOADING_COPIES.rainy.any)
  }

  // 按模式分段
  var modeBank = LOADING_COPIES[mode] || LOADING_COPIES.default
  if (modeBank.any) return pickRandom(modeBank.any)

  // 按 duration 选 short/medium/long
  var seg
  if (duration <= 15) seg = modeBank.short
  else if (duration <= 30) seg = modeBank.medium
  else seg = modeBank.long || modeBank.medium || modeBank.short

  if (seg && seg.length > 0) return pickRandom(seg)
  return pickRandom(LOADING_COPIES.default)
}

// ===== B-03: 条件校验过滤 =====
function filterByConditions(cmds, ctx) {
  if (!Array.isArray(cmds)) return []
  var c = normalizeCtx(ctx)
  var now = Date.now()
  var ninetyDays = 90 * 24 * 60 * 60 * 1000

  return cmds.filter(function (cmd) {
    // 必须是带 id 的对象，否则视为非法数据过滤掉
    if (!cmd || typeof cmd !== 'object' || !cmd.id) return false

    // 已完成 90 天内不重复
    if (c.completedIds.indexOf(cmd.id) >= 0) {
      var completedDate = c.completedDates[cmd.id]
      // 已完成但无日期 / 日期非法 → 保守过滤（视为近期完成）
      if (!completedDate) return false
      var diff = now - new Date(completedDate).getTime()
      if (isNaN(diff)) return false
      if (diff < ninetyDays) return false
    }

    // 重复类型抑制
    if (cmd.type && cmd.type === c.lastType && c.sameTypeCount >= 2) return false

    // POI 可达性
    if (cmd.requirePOI && cmd.requirePOI !== 'null') {
      if (!c.nearbyPOI[cmd.requirePOI]) return false
    }

    return true
  })
}

// ===== B-04: 营业时间过滤 =====
function filterByBusinessHours(cmds, hour) {
  if (!Array.isArray(cmds)) return []
  var h = isValidHour(hour) ? Math.floor(hour) : safeHour()

  return cmds.filter(function (cmd) {
    if (!cmd || typeof cmd !== 'object') return false
    var poi = cmd.requirePOI
    // 无 POI 要求 → 不过滤
    if (!poi || poi === 'null') return true
    // 未知 POI 类型 → 保守策略，不过滤
    var window = POI_HOURS[poi]
    if (!window) return true
    // [start, end) 半开区间
    return h >= window[0] && h < window[1]
  })
}

// ===== B-05: 安全风险过滤 =====
function filterBySafety(cmds, ctx) {
  if (!Array.isArray(cmds)) return []
  var c = normalizeCtx(ctx)
  var isLateNight = c.hour >= 22 || c.hour < 6
  var isRainy = c.weather === 'rainy' || c.weather === 'storm'
  var isExtreme = c.weather === 'storm' || c.weather === 'snow' || c.weather === 'extreme'

  return cmds.filter(function (cmd) {
    if (!cmd || typeof cmd !== 'object') return false

    // 深夜非 nightSafe 过滤
    if (isLateNight && cmd.nightSafe === false) return false

    // B-15: 夜间户外指令距离限制
    // 深夜 + 户外指令 + 有用户位置 + 指令有坐标 → 距离超过阈值则过滤
    if (isLateNight && cmd.outdoor !== false && c.userLocation &&
        cmd.location && typeof cmd.location.latitude === 'number' &&
        typeof cmd.location.longitude === 'number') {
      var dist = calcDistance(
        c.userLocation.latitude, c.userLocation.longitude,
        cmd.location.latitude, cmd.location.longitude
      )
      if (dist > c.nightMaxDistance) return false
    }

    // 雨天户外非雨天过滤
    if (isRainy && cmd.rainy === false && cmd.outdoor !== false) return false

    // 极端天气：只保留室内（过滤户外）
    if (isExtreme && cmd.outdoor !== false) return false

    return true
  })
}

// ===== B-11: 加权随机选择（多类型权重 + type 归一化）=====
// 偏好类型按计数排序：top1=1.5x, top2=1.2x, top3=1.1x, 其余 1x
// cmd.type 与偏好 key 都经 normalizeType 归一化后比对（修 sensory/market/moment 映射不一致）
function buildTypeWeights(userPrefs) {
  var prefs = userPrefs && userPrefs.type ? userPrefs.type : {}
  var weights = {}
  try {
    var entries = Object.keys(prefs).map(function (k) {
      return { type: normalizeType(k), count: prefs[k] || 0 }
    }).filter(function (e) { return e.type && e.count > 0 })
      .sort(function (a, b) { return b.count - a.count })
    var tiers = [1.5, 1.2, 1.1]  // top1/top2/top3 权重
    entries.forEach(function (e, i) {
      weights[e.type] = i < tiers.length ? tiers[i] : 1
    })
  } catch (e) {}
  return weights
}

function pickWeighted(candidates, userPrefs) {
  if (!Array.isArray(candidates) || candidates.length === 0) return null
  var weights = buildTypeWeights(userPrefs)

  var total = candidates.reduce(function (sum, cmd) {
    return sum + (cmd && weights[normalizeType(cmd.type)] ? weights[normalizeType(cmd.type)] : 1)
  }, 0)
  if (total <= 0) return candidates[0]

  var cursor = Math.random() * total
  for (var i = 0; i < candidates.length; i++) {
    var w = candidates[i] && weights[normalizeType(candidates[i].type)] ? weights[normalizeType(candidates[i].type)] : 1
    cursor -= w
    if (cursor <= 0) return candidates[i]
  }
  return candidates[Math.floor(Math.random() * candidates.length)]
}

// ===== B-06: 兜底任务 =====
function getFallbackCommands(ctx) {
  var c = normalizeCtx(ctx)
  var now = Date.now()
  var ninetyDays = 90 * 24 * 60 * 60 * 1000

  // 复制一份避免污染常量
  var list = FALLBACK_COMMANDS.map(function (cmd) {
    return Object.assign({}, cmd)
  })

  // Round 1 修复：过滤 90 天内已完成的 fallback（硬约束）
  // 避免终极兜底推荐用户刚完成的任务（getFallbackCommands 原本只过安全+营业时间，漏了 completed）
  var notCompleted = list.filter(function (cmd) {
    if (c.completedIds.indexOf(cmd.id) < 0) return true
    var d = c.completedDates[cmd.id]
    if (!d) return false  // 已完成但无日期 → 保守过滤
    var diff = now - new Date(d).getTime()
    if (isNaN(diff)) return false
    return diff >= ninetyDays
  })
  // 兜底不能空：全部刚完成则保留原 list（有总比没有好）
  if (notCompleted.length === 0) notCompleted = list

  // 偏好感知排序：顶层偏好类型排前（B-11: 用 normalizeType 归一化后比对）
  var weights = buildTypeWeights(c.userPrefs)
  var hasWeights = Object.keys(weights).length > 0
  if (hasWeights) {
    notCompleted.sort(function (a, b) {
      var wa = weights[normalizeType(a && a.type)] || 0
      var wb = weights[normalizeType(b && b.type)] || 0
      return wb - wa  // 权重高的排前
    })
  }

  // 应用安全过滤（兜底也要安全）
  var safe = filterBySafety(notCompleted, c)
  // 应用营业时间过滤
  var inHours = filterByBusinessHours(safe, c.hour)
  // 三层回退：营业时间内 → 安全 → 全部未完成（兜底不能为空）
  return inHours.length > 0 ? inHours : (safe.length > 0 ? safe : notCompleted)
}

// ===== B-10: 难度推算 + 难度过滤 =====
// 不改 commands.js，按 duration/outdoor/cost 算出 1-3 难度
function computeDifficulty(cmd) {
  if (!cmd || typeof cmd !== 'object') return 1
  var score = Math.floor((cmd.duration || 0) / 15)
  if (cmd.outdoor === true) score += 1
  if ((cmd.cost || 0) >= 30) score += 1
  if (score < 1) score = 1
  if (score > 3) score = 3
  return score
}

// 按 userIntensity 过滤：low 留 1-2，medium 全留，high 留 2-3
function filterByDifficulty(cmds, ctx) {
  if (!Array.isArray(cmds)) return []
  var c = normalizeCtx(ctx)
  if (c.userIntensity === 'medium') return cmds.slice()
  return cmds.filter(function (cmd) {
    if (!cmd) return false
    var d = computeDifficulty(cmd)
    if (c.userIntensity === 'low') return d <= 2
    if (c.userIntensity === 'high') return d >= 2
    return true
  })
}

// ===== B-07: 天气细筛 =====
// 依赖 ctx.weatherDetail（temperature/visibility），未提供则不过滤
function filterByWeather(cmds, ctx) {
  if (!Array.isArray(cmds)) return []
  var c = normalizeCtx(ctx)
  var wd = c.weatherDetail
  var hasDetail = wd.temperature !== null || wd.visibility !== '' || wd.condition !== ''
  if (!hasDetail) return cmds.slice()
  var temp = wd.temperature
  var visPoor = wd.visibility === 'poor' || wd.visibility === 'fog' || wd.visibility === 'haze'
  return cmds.filter(function (cmd) {
    if (!cmd) return false
    if (temp !== null && temp !== undefined) {
      if (temp > 32 && cmd.outdoor !== false && (cmd.duration || 0) > 30) return false
      if (temp < 5 && cmd.outdoor === true && (cmd.duration || 0) > 30) return false
    }
    if (visPoor && cmd.outdoor === true && (cmd.duration || 0) > 20) return false
    return true
  })
}

// ===== B-08: 地点去重 =====
// 同一 POI 类型 24h 内不重复推荐（无 requirePOI 的指令不受限）
function filterByLocationDedup(cmds, ctx) {
  if (!Array.isArray(cmds)) return []
  var c = normalizeCtx(ctx)
  if (!c.recentLocations.length) return cmds.slice()
  var now = Date.now()
  var dayMs = 24 * 60 * 60 * 1000
  return cmds.filter(function (cmd) {
    if (!cmd) return false
    var poi = cmd.requirePOI
    if (!poi || poi === 'null') return true
    for (var i = 0; i < c.recentLocations.length; i++) {
      if (c.recentLocations[i] === poi) {
        var ts = c.recentLocationTimes[i]
        if (typeof ts === 'number' && (now - ts) < dayMs) return false
        if (!ts) return false
      }
    }
    return true
  })
}

// ===== B-09: 历史体验去重（内容相似度）=====
// 2-gram 关键词 Jaccard 相似度 > 0.6 → 过滤，防"不同 id 但内容高度相似"
function extractKeywords(text) {
  if (typeof text !== 'string' || text.length < 2) return []
  var set = []
  for (var i = 0; i < text.length - 1; i++) {
    var gram = text.slice(i, i + 2)
    if (/[\s，。,.！!？?；;：:、0-9a-zA-Z]/.test(gram)) continue
    if (set.indexOf(gram) < 0) set.push(gram)
  }
  return set
}

function jaccard(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length === 0 || b.length === 0) return 0
  var inter = 0
  for (var i = 0; i < a.length; i++) {
    if (b.indexOf(a[i]) >= 0) inter++
  }
  var union = a.length + b.length - inter
  return union > 0 ? inter / union : 0
}

function filterBySimilar(cmds, ctx) {
  if (!Array.isArray(cmds)) return []
  var c = normalizeCtx(ctx)
  if (!c.recentContents.length) return cmds.slice()
  var recentKw = c.recentContents.map(extractKeywords)
  return cmds.filter(function (cmd) {
    if (!cmd || typeof cmd.content !== 'string') return true
    var cmdKw = extractKeywords(cmd.content)
    if (cmdKw.length === 0) return true
    for (var i = 0; i < recentKw.length; i++) {
      if (jaccard(cmdKw, recentKw[i]) > 0.6) return false
    }
    return true
  })
}

// ===== B-12: 结果质量评分 + top3 随机选择 =====
// 评分维度：兴趣30% + 难度20% + 新鲜度20% + 时长15% + 类型平衡15%
function scoreCommand(cmd, ctx) {
  if (!cmd || typeof cmd !== 'object' || Array.isArray(cmd)) return 0
  var c = normalizeCtx(ctx)
  var score = 0
  var nType = normalizeType(cmd.type)

  // 兴趣匹配 30%
  var weights = buildTypeWeights(c.userPrefs)
  var w = weights[nType] || 0
  score += (w >= 1.5 ? 30 : (w >= 1.2 ? 24 : (w >= 1.1 ? 18 : 10)))

  // 难度匹配 20%
  var d = computeDifficulty(cmd)
  if (c.userIntensity === 'low') score += (d <= 2 ? 20 : 8)
  else if (c.userIntensity === 'high') score += (d >= 2 ? 20 : 8)
  else score += 16

  // 新鲜度 20%
  var fresh = true
  if (typeof cmd.content === 'string' && c.recentContents.length) {
    var cmdKw = extractKeywords(cmd.content)
    if (cmdKw.length) {
      for (var i = 0; i < c.recentContents.length; i++) {
        if (jaccard(cmdKw, extractKeywords(c.recentContents[i])) > 0.6) { fresh = false; break }
      }
    }
  }
  if (fresh && cmd.requirePOI && c.recentLocations.indexOf(cmd.requirePOI) >= 0) fresh = false
  score += (fresh ? 20 : 6)

  // 时长匹配 15%
  if (c.targetDuration > 0 && cmd.duration) {
    var diff = Math.abs(cmd.duration - c.targetDuration)
    score += (diff <= 5 ? 15 : (diff <= 15 ? 10 : 5))
  } else {
    score += 10
  }

  // 类型平衡 15%
  if (cmd.type && c.lastType && normalizeType(cmd.type) === normalizeType(c.lastType)) {
    score += 4
  } else {
    score += 15
  }

  return score
}

// top3 内随机选，兼顾质量与多样性
function pickBestScored(candidates, ctx) {
  if (!Array.isArray(candidates) || candidates.length === 0) return null
  var c = normalizeCtx(ctx)
  var scored = candidates.map(function (cmd) {
    return { cmd: cmd, score: scoreCommand(cmd, c) }
  })
  scored.sort(function (a, b) { return b.score - a.score })
  var topN = Math.min(3, scored.length)
  var pick = scored[Math.floor(Math.random() * topN)]
  return pick ? pick.cmd : candidates[0]
}

// ===== B-13: 任务解释 + B-14: 变量替换 =====
var EXPLANATION_REASONS = {
  rainy_indoor: '下雨天，为你选了室内任务',
  night_safe: '这个时间，适合安静地做这件事',
  pref_match: '你最近喜欢{type}，这个很合你',
  hot_weather: '天气有点热，挑了个不那么累的',
  cold_weather: '天冷，选了不太受冻的',
  default: '骰子摇到了它，试试看'
}

function typeLabel(type) {
  var labels = { color: '色彩', sense: '感官', food: '美食', walk: '漫步', collect: '收藏', culture: '文化', micro: '微逃' }
  return labels[type] || type || '探索'
}

function seasonFromDate() {
  try {
    var m = new Date().getMonth() + 1
    if (m >= 3 && m <= 5) return '春天'
    if (m >= 6 && m <= 8) return '夏天'
    if (m >= 9 && m <= 11) return '秋天'
    return '冬天'
  } catch (e) { return '' }
}

// B-14: 通用变量替换 {时间}{天气}{地点}{季节}{type}
function fillVariables(text, ctx, extra) {
  if (typeof text !== 'string') return ''
  var c = normalizeCtx(ctx)
  var e = extra && typeof extra === 'object' ? extra : {}
  var hour = c.hour
  var timeLabel = (hour >= 5 && hour < 12) ? '早上' : (hour >= 12 && hour < 18) ? '下午' : (hour >= 18 && hour < 22) ? '晚上' : '深夜'
  var weatherLabel = c.weather === 'rainy' ? '雨天' : (c.weather === 'storm' ? '暴雨' : (c.weather === 'snow' ? '雪天' : '晴天'))
  var season = c.season || seasonFromDate()
  return text
    .replace(/\{时间\}/g, timeLabel)
    .replace(/\{天气\}/g, weatherLabel)
    .replace(/\{地点\}/g, c.locationName || '附近')
    .replace(/\{季节\}/g, season)
    .replace(/\{type\}/g, e.type || '')
}

// B-13: 生成任务解释 { reason, howto, tip }
function buildExplanation(cmd, ctx) {
  var c = normalizeCtx(ctx)
  if (!cmd || typeof cmd !== 'object') {
    return { reason: EXPLANATION_REASONS.default, howto: '', tip: '' }
  }
  var reason = EXPLANATION_REASONS.default
  var isLateNight = c.hour >= 22 || c.hour < 6
  var isRainy = c.weather === 'rainy' || c.weather === 'storm'
  var nType = normalizeType(cmd.type)
  var weights = buildTypeWeights(c.userPrefs)
  // 优先级：雨天室内 > 深夜安全 > 偏好匹配 > 天气温度 > 默认
  if (isRainy && cmd.outdoor === false) {
    reason = EXPLANATION_REASONS.rainy_indoor
  } else if (isLateNight && cmd.nightSafe === true) {
    reason = EXPLANATION_REASONS.night_safe
  } else if (weights[nType] >= 1.2) {
    reason = fillVariables(EXPLANATION_REASONS.pref_match, c, { type: typeLabel(nType) })
  } else if (c.weatherDetail.temperature !== null && c.weatherDetail.temperature > 32 && cmd.outdoor !== true) {
    reason = EXPLANATION_REASONS.hot_weather
  } else if (c.weatherDetail.temperature !== null && c.weatherDetail.temperature < 5 && cmd.outdoor !== true) {
    reason = EXPLANATION_REASONS.cold_weather
  }
  return {
    reason: reason,
    howto: typeof cmd.content === 'string' ? cmd.content : '',
    tip: typeof cmd.tip === 'string' ? cmd.tip : ''
  }
}

// ===== 主入口 =====
function generate(ctx) {
  var c = normalizeCtx(ctx)
  var pool = c.commandPool

  // B-03 + B-04 + B-05 三层过滤
  var filtered = filterByConditions(pool, c)
  filtered = filterByBusinessHours(filtered, c.hour)
  filtered = filterBySafety(filtered, c)
  // B-07/B-08/B-09/B-10 质量增强过滤（仅主链路，兜底链不追加避免过度过滤）
  filtered = filterByWeather(filtered, c)
  filtered = filterByLocationDedup(filtered, c)
  filtered = filterBySimilar(filtered, c)
  filtered = filterByDifficulty(filtered, c)

  // mode 过滤
  var candidates = applyModeFilter(filtered, c.mode)

  // 兜底链：放宽 mode → 放宽 POI + 营业时间 → 全 pool → fallback 任务库
  // 各步仍遵守 90 天不重复 + 安全风险，避免推荐已完成或深夜不安全任务
  // 1) mode 过滤空：放宽 mode 限制，用 filtered（已过条件/时间/安全）
  if (!candidates.length && filtered.length) candidates = filtered
  // 2) filtered 也空：用 pool 中无 POI 要求的（最易满足），仍过条件 + 安全
  if (!candidates.length) {
    candidates = pool.filter(function (cmd) {
      if (!cmd || !cmd.id) return false
      if (cmd.requirePOI && cmd.requirePOI !== 'null') return false
      return true
    })
    candidates = filterByConditions(candidates, c)
    candidates = filterBySafety(candidates, c)
  }
  // 3) 仍空：用全 pool（放宽 POI + 营业时间），仍过条件 + 安全
  if (!candidates.length) {
    candidates = filterByConditions(pool, c)
    candidates = filterBySafety(candidates, c)
  }
  // 4) 仍空（pool 全部完成 / 全不安全）：兜底任务库
  if (!candidates.length) {
    var fallback = getFallbackCommands(c)
    var picked = pickWeighted(fallback, c.userPrefs) || fallback[0]
    return { ok: true, command: picked, explanation: buildExplanation(picked, c), fallback: true }
  }

  // B-12: 候选 >= 3 用评分选 top3 随机；< 3 回退 pickWeighted
  var selected
  if (candidates.length >= 3) {
    selected = pickBestScored(candidates, c)
  } else {
    selected = pickWeighted(candidates, c.userPrefs)
  }
  if (!selected) {
    var fb = getFallbackCommands(c)
    return { ok: true, command: fb[0], explanation: buildExplanation(fb[0], c), fallback: true }
  }
  return { ok: true, command: selected, explanation: buildExplanation(selected, c), fallback: false }
}

// mode 过滤（独立函数便于测试）
function applyModeFilter(cmds, mode) {
  if (!Array.isArray(cmds)) return []
  if (!mode) return cmds.slice()
  switch (mode) {
    case 'micro':
      return cmds.filter(function (c) { return c && c.duration < 15 })
    case 'walk':
      return cmds.filter(function (c) { return c && c.outdoor !== false && c.duration >= 20 })
    case 'double':
      return cmds.filter(function (c) { return c && (c.double || c.social) })
    case 'night':
      return cmds.filter(function (c) { return c && c.nightSafe && (!c.mode || c.mode === 'night') })
    case 'rainy':
      return cmds.filter(function (c) { return c && c.rainy && (!c.mode || c.mode === 'rainy') })
    default:
      return cmds.slice()
  }
}

// ===== 工具：随机选一项（可种子化便于测试）=====
function pickRandom(arr) {
  if (!Array.isArray(arr) || arr.length === 0) return ''
  return arr[Math.floor(Math.random() * arr.length)]
}

// B-15: Haversine 距离计算（米），用于夜间户外指令距离限制
function calcDistance(lat1, lng1, lat2, lng2) {
  var R = 6371000
  var toRad = function (deg) { return deg * Math.PI / 180 }
  var dLat = toRad(lat2 - lat1)
  var dLng = toRad(lng2 - lng1)
  var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2)
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

// ===== 导出 =====
module.exports = {
  // B-01
  getFaceForType: getFaceForType,
  // B-02
  getLoadingCopy: getLoadingCopy,
  // B-03
  filterByConditions: filterByConditions,
  // B-04
  filterByBusinessHours: filterByBusinessHours,
  // B-05
  filterBySafety: filterBySafety,
  // B-06
  getFallbackCommands: getFallbackCommands,
  // 主入口
  generate: generate,
  // mode 过滤
  applyModeFilter: applyModeFilter,
  // 加权随机
  pickWeighted: pickWeighted,
  // B-07 天气细筛
  filterByWeather: filterByWeather,
  // B-08 地点去重
  filterByLocationDedup: filterByLocationDedup,
  // B-09 历史体验去重
  filterBySimilar: filterBySimilar,
  // B-10 难度推算 + 难度过滤
  computeDifficulty: computeDifficulty,
  filterByDifficulty: filterByDifficulty,
  // B-12 结果质量评分 + top3 随机
  scoreCommand: scoreCommand,
  pickBestScored: pickBestScored,
  // B-13 任务解释
  buildExplanation: buildExplanation,
  // B-14 变量替换
  fillVariables: fillVariables,
  // B-11 type 归一化
  normalizeType: normalizeType,
  // 内部导出供测试
  _internal: {
    POI_HOURS: POI_HOURS,
    FALLBACK_COMMANDS: FALLBACK_COMMANDS,
    LOADING_COPIES: LOADING_COPIES,
    TYPE_FACE_MAP: TYPE_FACE_MAP,
    EXPLANATION_REASONS: EXPLANATION_REASONS,
    normalizeCtx: normalizeCtx,
    normalizeType: normalizeType,
    isValidHour: isValidHour,
    safeHour: safeHour,
    pickRandom: pickRandom,
    applyModeFilter: applyModeFilter,
    buildTypeWeights: buildTypeWeights,
    extractKeywords: extractKeywords,
    jaccard: jaccard,
    computeDifficulty: computeDifficulty,
    scoreCommand: scoreCommand,
    buildExplanation: buildExplanation,
    fillVariables: fillVariables,
    seasonFromDate: seasonFromDate,
    typeLabel: typeLabel
  }
}
