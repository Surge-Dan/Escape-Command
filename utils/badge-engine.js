// utils/badge-engine.js
// B4 激励体系 · 徽章解锁纯函数引擎（零 wx 依赖，可 Node 直接 require 测试）
//
// 设计目标：
//   把 app.js checkBadges 的散落判定逻辑收敛为「规则表 + 评估器」：
//   1. 每个徽章 id 对应一个 predicate(records, ctx) → boolean
//   2. detectUnlocks 增量返回新解锁徽章（幂等，已解锁跳过）
//   3. 新增 B4 城市方向徽章（东/南/西/北/中）与阶段记录徽章（10/30/50/100 次）
//
// 城市方向判定：
//   - 以用户全部可定位记录的「质心」作为城市中心
//   - 每条记录相对质心的方位角 → 8 方位收敛为 5 类：east/south/west/north/central
//   - 阈值 0.005°（≈500m）内视为 central
//
// 返回结构：
//   detectUnlocks → { added: [badgeId], metas: [{ id, name, desc, icon, ... }] }
//   buildDirectionStats → { east, south, west, north, central, total, centroid }

'use strict'

// ===== 方向阈值（度，1°≈111km，0.005°≈555m）=====
var CENTRAL_THRESHOLD = 0.005

// ===== 阶段记录徽章阈值 =====
var STAGE_THRESHOLDS = [
  { id: 'stage_explorer', count: 10 },
  { id: 'stage_familiar', count: 30 },
  { id: 'stage_detective', count: 50 },
  { id: 'stage_expert', count: 100 }
]

// ===== 城市方向徽章 =====
var DIRECTION_BADGES = {
  east: 'direction_east',
  south: 'direction_south',
  west: 'direction_west',
  north: 'direction_north',
  central: 'direction_central'
}

// 记录是否含可消费坐标
function hasLoc(r) {
  return !!(r && r.location && typeof r.location.latitude === 'number' &&
    typeof r.location.longitude === 'number' &&
    isFinite(r.location.latitude) && isFinite(r.location.longitude))
}

// 安全加固：过滤无效记录（对抗刷数量攻击）
// 有效记录定义：非 null/undefined、是对象、含有 id 字段
// 防止攻击者通过 push undefined/null/空对象 来膨胀 records.length 骗取阶段徽章
function filterValidRecords(records) {
  if (!Array.isArray(records)) return []
  var out = []
  for (var i = 0; i < records.length; i++) {
    var r = records[i]
    if (r && typeof r === 'object' && r.id) {
      out.push(r)
    }
  }
  return out
}

// 计算质心（所有可定位记录的平均坐标）
function computeCentroid(records) {
  if (!Array.isArray(records)) return null
  var sumLat = 0
  var sumLng = 0
  var n = 0
  for (var i = 0; i < records.length; i++) {
    var r = records[i]
    if (!hasLoc(r)) continue
    sumLat += r.location.latitude
    sumLng += r.location.longitude
    n++
  }
  if (n === 0) return null
  return { latitude: sumLat / n, longitude: sumLng / n, count: n }
}

// 方位角分类（8 方位收敛为 5 类，central 阈值内归 central）
// 返回 'east' | 'south' | 'west' | 'north' | 'central' | null
function classifyDirection(recLoc, centroid) {
  if (!recLoc || !centroid) return null
  if (typeof recLoc.latitude !== 'number' || typeof recLoc.longitude !== 'number') return null
  if (!isFinite(recLoc.latitude) || !isFinite(recLoc.longitude)) return null
  var dLat = recLoc.latitude - centroid.latitude
  var dLng = recLoc.longitude - centroid.longitude
  // 阈值内归 central
  if (Math.abs(dLat) < CENTRAL_THRESHOLD && Math.abs(dLng) < CENTRAL_THRESHOLD) return 'central'
  // 主方向：|dLat| vs |dLng| 更大者为主轴
  if (Math.abs(dLat) >= Math.abs(dLng)) {
    return dLat > 0 ? 'north' : 'south'
  }
  return dLng > 0 ? 'east' : 'west'
}

// B4-04: 构建方向统计
// 返回 { east, south, west, north, central, total, centroid, directionRecords }
function buildDirectionStats(records) {
  var stats = { east: 0, south: 0, west: 0, north: 0, central: 0, total: 0, centroid: null, directionRecords: [] }
  if (!Array.isArray(records)) return stats
  var centroid = computeCentroid(records)
  if (!centroid) return stats
  stats.centroid = centroid
  for (var i = 0; i < records.length; i++) {
    var r = records[i]
    if (!hasLoc(r)) continue
    var dir = classifyDirection(r.location, centroid)
    if (!dir) continue
    stats[dir]++
    stats.total++
    stats.directionRecords.push({ recordId: r.id, direction: dir })
  }
  return stats
}

// 从 record.time 字段（HH:MM）解析小时
function parseHour(record) {
  if (!record) return -1
  if (typeof record.hour === 'number' && record.hour >= 0 && record.hour <= 23) return record.hour
  if (typeof record.time !== 'string' || !record.time) return -1
  var h = parseInt(record.time.split(':')[0], 10)
  return (isNaN(h) || h < 0 || h > 23) ? -1 : h
}

// 判断是否夜间记录（22:00-06:00）
function isNightRecord(record) {
  var h = parseHour(record)
  if (h < 0) return false
  return h >= 22 || h < 6
}

// 统计独立位置（按 0.01° ≈ 1km 粒度去重）
function countUniqueLocations(records) {
  if (!Array.isArray(records)) return 0
  var seen = {}
  var count = 0
  for (var i = 0; i < records.length; i++) {
    var r = records[i]
    if (!hasLoc(r)) continue
    var key = (Math.round(r.location.latitude * 100) / 100) + ',' + (Math.round(r.location.longitude * 100) / 100)
    if (!seen[key]) {
      seen[key] = true
      count++
    }
  }
  return count
}

// 统计覆盖的类型数
function countTypeCoverage(records) {
  if (!Array.isArray(records)) return 0
  var set = {}
  for (var i = 0; i < records.length; i++) {
    var r = records[i]
    if (!r || typeof r !== 'object') continue
    var t = r.commandType
    if (typeof t === 'string' && t) set[t] = true
  }
  return Object.keys(set).length
}

// ===== 规则表：每个徽章 id → predicate(records, ctx) =====
// ctx 字段：continuousDays, partnerRecords, collectedCommands, challengeCount, weather
var RULES = {
  // milestone 里程碑
  first_escape: function (records) { return records.length >= 1 },
  seven_streak: function (records, ctx) { return (ctx.continuousDays || 0) >= 7 },
  thirty_streak: function (records, ctx) { return (ctx.continuousDays || 0) >= 30 },

  // type 类型
  color_hunter: function (records) { return records.filter(function (r) { return r.commandType === 'color' }).length >= 10 },
  market_regular: function (records) { return records.filter(function (r) { return r.commandType === 'food' }).length >= 5 },
  culture_lover: function (records) { return records.filter(function (r) { return r.commandType === 'culture' }).length >= 5 },

  // mode 模式
  night_walker: function (records) { return records.filter(isNightRecord).length >= 5 },
  rainy_walker: function (records, ctx) {
    return records.filter(function (r) { return r.weather && r.weather.condition === 'rainy' }).length >= 3
  },
  micro_master: function (records) {
    return records.filter(function (r) { return r.mode === 'micro' || (typeof r.duration === 'number' && r.duration < 15) }).length >= 10
  },
  walk_master: function (records) {
    return records.filter(function (r) { return r.mode === 'walk' || (typeof r.duration === 'number' && r.duration >= 30 && r.outdoor !== false) }).length >= 10
  },
  double_master: function (records) {
    return records.filter(function (r) { return r.mode === 'double' || r.double === true }).length >= 5
  },
  night_master: function (records) { return records.filter(function (r) { return r.mode === 'night' }).length >= 10 },
  rainy_master: function (records) { return records.filter(function (r) { return r.mode === 'rainy' }).length >= 10 },

  // social 社交
  social_master: function (records, ctx) { return (ctx.partnerRecords || []).length >= 3 },
  collector: function (records, ctx) { return (ctx.collectedCommands || []).length >= 20 },

  // special 特殊
  city_detective: function (records) { return countUniqueLocations(records) >= 50 },
  explorer: function (records) { return countTypeCoverage(records) >= 6 },
  challenge_king: function (records, ctx) { return (ctx.challengeCount || 0) >= 7 },

  // ===== B4 新增：阶段记录徽章 =====
  stage_explorer: function (records) { return records.length >= 10 },
  stage_familiar: function (records) { return records.length >= 30 },
  stage_detective: function (records) { return records.length >= 50 },
  stage_expert: function (records) { return records.length >= 100 },

  // ===== B4 新增：城市方向徽章（每个方向至少 3 条记录解锁）=====
  direction_east: function (records) { return buildDirectionStats(records).east >= 3 },
  direction_south: function (records) { return buildDirectionStats(records).south >= 3 },
  direction_west: function (records) { return buildDirectionStats(records).west >= 3 },
  direction_north: function (records) { return buildDirectionStats(records).north >= 3 },
  direction_central: function (records) { return buildDirectionStats(records).central >= 3 }
}

// ===== 主入口：增量检测解锁徽章 =====
// 参数：
//   records: 全部出逃记录
//   ctx: { continuousDays, partnerRecords, collectedCommands, challengeCount, unlockedIds }
//   badgesMeta: 徽章元数据数组（来自 data/badges.js）
// 返回：{ added: [id], metas: [{ id, name, desc, icon, gradient, color, category, date }] }
function detectUnlocks(records, ctx, badgesMeta) {
  var safeCtx = ctx || {}
  var unlockedIds = Array.isArray(safeCtx.unlockedIds) ? safeCtx.unlockedIds : []
  var unlockedSet = {}
  for (var i = 0; i < unlockedIds.length; i++) {
    unlockedSet[unlockedIds[i]] = true
  }
  var metaMap = {}
  var metaList = Array.isArray(badgesMeta) ? badgesMeta : []
  for (var j = 0; j < metaList.length; j++) {
    var m = metaList[j]
    if (m && m.id) metaMap[m.id] = m
  }

  var recs = filterValidRecords(records)
  var added = []
  var metas = []
  var today = safeCtx.today || _defaultToday()

  var ruleIds = Object.keys(RULES)
  for (var k = 0; k < ruleIds.length; k++) {
    var id = ruleIds[k]
    if (unlockedSet[id]) continue  // 幂等：已解锁跳过
    var meta = metaMap[id]
    if (!meta) continue  // 元数据缺失，跳过（不阻塞其他徽章）
    var predicate = RULES[id]
    var ok = false
    try {
      ok = !!predicate(recs, safeCtx)
    } catch (e) {
      ok = false  // 单条规则异常不阻塞其他徽章
    }
    if (ok) {
      added.push(id)
      metas.push(Object.assign({}, meta, { date: today }))
    }
  }
  return { added: added, metas: metas }
}

// 计算下一个阶段徽章的进度（用于 UI 展示「再出逃 N 次解锁 XX」）
// 返回 { nextBadgeId, currentCount, targetCount, remaining } 或 null
function nextStageProgress(records) {
  var recs = filterValidRecords(records)
  var count = recs.length
  for (var i = 0; i < STAGE_THRESHOLDS.length; i++) {
    var s = STAGE_THRESHOLDS[i]
    if (count < s.count) {
      return {
        nextBadgeId: s.id,
        currentCount: count,
        targetCount: s.count,
        remaining: s.count - count
      }
    }
  }
  return null  // 已全部解锁
}

// 计算方向徽章进度（用于雷达图展示）
// 返回 { east, south, west, north, central, total, unlockedDirs: [dir], nextDirs: [{dir, remaining}] }
function directionProgress(records, unlockedIds) {
  var stats = buildDirectionStats(records)
  var unlocked = Array.isArray(unlockedIds) ? unlockedIds : []
  var unlockedSet = {}
  for (var i = 0; i < unlocked.length; i++) unlockedSet[unlocked[i]] = true
  var unlockedDirs = []
  var nextDirs = []
  var dirs = ['east', 'south', 'west', 'north', 'central']
  for (var j = 0; j < dirs.length; j++) {
    var d = dirs[j]
    var badgeId = DIRECTION_BADGES[d]
    var cnt = stats[d] || 0
    if (unlockedSet[badgeId]) {
      unlockedDirs.push(d)
    } else if (cnt < 3) {
      nextDirs.push({ dir: d, current: cnt, target: 3, remaining: 3 - cnt })
    }
  }
  return {
    east: stats.east,
    south: stats.south,
    west: stats.west,
    north: stats.north,
    central: stats.central,
    total: stats.total,
    centroid: stats.centroid,
    unlockedDirs: unlockedDirs,
    nextDirs: nextDirs
  }
}

// 内部：默认今天日期字符串
function _defaultToday() {
  try {
    var d = new Date()
    var mm = d.getMonth() + 1 < 10 ? '0' + (d.getMonth() + 1) : '' + (d.getMonth() + 1)
    var dd = d.getDate() < 10 ? '0' + d.getDate() : '' + d.getDate()
    return d.getFullYear() + '-' + mm + '-' + dd
  } catch (e) {
    return ''
  }
}

module.exports = {
  // 主入口
  detectUnlocks: detectUnlocks,
  nextStageProgress: nextStageProgress,
  directionProgress: directionProgress,
  // 纯函数（便于单测）
  buildDirectionStats: buildDirectionStats,
  computeCentroid: computeCentroid,
  classifyDirection: classifyDirection,
  countUniqueLocations: countUniqueLocations,
  countTypeCoverage: countTypeCoverage,
  parseHour: parseHour,
  isNightRecord: isNightRecord,
  filterValidRecords: filterValidRecords,
  // 常量导出
  RULES: RULES,
  STAGE_THRESHOLDS: STAGE_THRESHOLDS,
  DIRECTION_BADGES: DIRECTION_BADGES,
  CENTRAL_THRESHOLD: CENTRAL_THRESHOLD,
  _internal: { hasLoc: hasLoc, _defaultToday: _defaultToday }
}
