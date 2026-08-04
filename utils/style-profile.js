// utils/style-profile.js
// B4 激励体系 · 出逃风格画像纯函数（零 wx 依赖，可 Node 直接 require 测试）
//
// 设计目标：
//   基于历史记录分析用户的出逃风格，生成可读的画像描述文案。
//   维度：距离偏好、时间偏好、类型偏好、社交偏好、节奏偏好
//   生成结果：{ dimensions, dominantStyle, description, tags }
//
// 画像维度结构：
//   { distance: 'near'|'mid'|'far', time: 'morning'|'noon'|'evening'|'night',
//     type: 'color'|'walk'|..., social: 'solo'|'duo'|'group', pace: 'fast'|'steady'|'slow' }
//
// 文案示例：
//   「你是一个喜欢在傍晚漫步的观察者，偏爱城市漫游，常常独自出门。」

'use strict'

// ===== 维度阈值 =====
var DISTANCE_NEAR_MAX = 15      // duration < 15min 视为近距离
var DISTANCE_FAR_MIN = 30       // duration > 30min 视为远距离
var TIME_MORNING_END = 11       // 5-11 点为早晨
var TIME_NOON_END = 17          // 11-17 点为午后
var TIME_EVENING_END = 22       // 17-22 点为傍晚

// 记录是否含可消费坐标
function hasLoc(r) {
  return !!(r && r.location && typeof r.location.latitude === 'number' &&
    typeof r.location.longitude === 'number' &&
    isFinite(r.location.latitude) && isFinite(r.location.longitude))
}

// 从 record.time 字段（HH:MM）解析小时
function parseHour(record) {
  if (!record) return -1
  if (typeof record.hour === 'number' && record.hour >= 0 && record.hour <= 23) return record.hour
  if (typeof record.time !== 'string' || !record.time) return -1
  var h = parseInt(record.time.split(':')[0], 10)
  return (isNaN(h) || h < 0 || h > 23) ? -1 : h
}

// 统计最大计数的 key（并列时字典序最小，保证稳定）
function pickDominant(countMap) {
  if (!countMap || typeof countMap !== 'object') return null
  var keys = Object.keys(countMap)
  if (keys.length === 0) return null
  var maxCount = 0
  var dominant = null
  for (var i = 0; i < keys.length; i++) {
    var k = keys[i]
    var c = countMap[k] || 0
    if (c > maxCount || (c === maxCount && (dominant === null || k < dominant))) {
      maxCount = c
      dominant = k
    }
  }
  if (maxCount === 0) return null
  return dominant
}

// 维度 1：距离偏好（基于 duration 分布）
// near: <15min, mid: 15-30min, far: >30min
function analyzeDistance(records) {
  var map = { near: 0, mid: 0, far: 0 }
  if (!Array.isArray(records)) return { dominant: null, map: map }
  for (var i = 0; i < records.length; i++) {
    var r = records[i]
    if (!r || typeof r !== 'object') continue
    var d = r.duration
    if (typeof d !== 'number' || !isFinite(d) || d <= 0) continue
    if (d < DISTANCE_NEAR_MAX) map.near++
    else if (d > DISTANCE_FAR_MIN) map.far++
    else map.mid++
  }
  return { dominant: pickDominant(map), map: map }
}

// 维度 2：时间偏好（基于 hour 分布）
// morning: 5-11, noon: 11-17, evening: 17-22, night: 22-5
function analyzeTime(records) {
  var map = { morning: 0, noon: 0, evening: 0, night: 0 }
  if (!Array.isArray(records)) return { dominant: null, map: map }
  for (var i = 0; i < records.length; i++) {
    var r = records[i]
    if (!r || typeof r !== 'object') continue
    var h = parseHour(r)
    if (h < 0) continue
    if (h >= 5 && h < TIME_MORNING_END) map.morning++
    else if (h >= TIME_MORNING_END && h < TIME_NOON_END) map.noon++
    else if (h >= TIME_NOON_END && h < TIME_EVENING_END) map.evening++
    else map.night++
  }
  return { dominant: pickDominant(map), map: map }
}

// 维度 3：类型偏好（基于 commandType 分布）
function analyzeType(records) {
  var map = {}
  if (!Array.isArray(records)) return { dominant: null, map: map }
  for (var i = 0; i < records.length; i++) {
    var r = records[i]
    if (!r || typeof r !== 'object') continue
    var t = r.commandType
    if (typeof t === 'string' && t) map[t] = (map[t] || 0) + 1
  }
  return { dominant: pickDominant(map), map: map }
}

// 维度 4：社交偏好（基于 isGroup/double/members 分布）
// solo: 一个人, duo: 双人, group: 多人（3+）
function analyzeSocial(records) {
  var map = { solo: 0, duo: 0, group: 0 }
  if (!Array.isArray(records)) return { dominant: null, map: map }
  for (var i = 0; i < records.length; i++) {
    var r = records[i]
    if (!r || typeof r !== 'object') continue
    var members = Array.isArray(r.members) ? r.members.length : 0
    if (r.isGroup === true || r.mode === 'double' || r.double === true) {
      if (members >= 3) map.group++
      else if (members === 2) map.duo++
      else map.duo++  // double 模式但未记录成员数，按双人算
    } else {
      map.solo++
    }
  }
  return { dominant: pickDominant(map), map: map }
}

// 维度 5：节奏偏好（基于出逃频率，最近 30 天）
// fast: >10 次/30天, steady: 4-10 次/30天, slow: <4 次/30天
function analyzePace(records, nowTs) {
  var map = { fast: 0, steady: 0, slow: 0 }
  if (!Array.isArray(records)) return { dominant: null, map: map }
  var now = (typeof nowTs === 'number' && isFinite(nowTs) && nowTs > 0) ? nowTs : Date.now()
  var thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000
  var recentCount = 0
  for (var i = 0; i < records.length; i++) {
    var r = records[i]
    if (!r || typeof r !== 'object') continue
    var ts = _extractTs(r)
    if (ts !== null && ts >= thirtyDaysAgo && ts <= now) recentCount++
  }
  // pace 直接由 recentCount 映射（0-3 也算 slow，保证无记录时仍可归类）
  var dominant
  if (recentCount >= 10) {
    dominant = 'fast'
    map.fast = recentCount
  } else if (recentCount >= 4) {
    dominant = 'steady'
    map.steady = recentCount
  } else {
    dominant = 'slow'
    map.slow = recentCount
  }
  return { dominant: dominant, map: map, recentCount: recentCount }
}

// 内部：从记录提取时间戳
function _extractTs(r) {
  if (!r) return null
  if (typeof r.startTime === 'number' && isFinite(r.startTime) && r.startTime > 0) return r.startTime
  if (typeof r.completedAt === 'number' && isFinite(r.completedAt) && r.completedAt > 0) return r.completedAt
  if (typeof r.date === 'string' && r.date) {
    try {
      var d = new Date(r.date + 'T00:00:00')
      if (!isNaN(d.getTime())) return d.getTime()
    } catch (e) { return null }
  }
  return null
}

// ===== 文案生成 =====
var TIME_LABEL = {
  morning: '清晨',
  noon: '午后',
  evening: '傍晚',
  night: '深夜'
}
var DISTANCE_LABEL = {
  near: '短途',
  mid: '中途',
  far: '远途'
}
var TYPE_LABEL = {
  color: '颜色探索',
  walk: '城市漫游',
  sense: '感官体验',
  collect: '收藏拼贴',
  food: '美食探索',
  culture: '文化漫游',
  breakthrough: '破圈行动',
  custom: '自定义'
}
var SOCIAL_LABEL = {
  solo: '独自',
  duo: '结伴',
  group: '组队'
}
var PACE_LABEL = {
  fast: '高频',
  steady: '稳定',
  slow: '随性'
}

// 生成风格描述文案
// 「你是一个喜欢在傍晚漫步的观察者，偏爱城市漫游，常常独自出门。」
function buildDescription(dims) {
  var parts = []
  // 主语
  var subject = '出逃者'
  // 时间 + 角色定语
  if (dims.time) {
    var timeWord = TIME_LABEL[dims.time] || ''
    var roleWord = _roleForTime(dims.time)
    if (timeWord && roleWord) {
      parts.push('喜欢在' + timeWord + '出逃的' + roleWord)
    } else if (timeWord) {
      parts.push('喜欢在' + timeWord + '出逃')
    }
  }
  // 类型偏好
  if (dims.type) {
    var typeWord = TYPE_LABEL[dims.type] || dims.type
    parts.push('偏爱' + typeWord)
  }
  // 社交偏好
  if (dims.social) {
    var socialWord = SOCIAL_LABEL[dims.social] || ''
    if (dims.social === 'solo') socialWord = '常常独自出门'
    else if (dims.social === 'duo') socialWord = '喜欢和朋友同行'
    else if (dims.social === 'group') socialWord = '热衷组队出逃'
    if (socialWord) parts.push(socialWord)
  }
  // 距离偏好（附加）
  if (dims.distance) {
    var distWord = DISTANCE_LABEL[dims.distance] || ''
    if (distWord) parts.push('偏爱' + distWord + '路线')
  }

  if (parts.length === 0) return '你是一个神秘的出逃者，还在探索自己的风格。'
  return '你是一个' + parts.join('、') + '。'
}

// 时间 → 角色词
function _roleForTime(time) {
  switch (time) {
    case 'morning': return '早起鸟'
    case 'noon': return '日光客'
    case 'evening': return '黄昏漫步者'
    case 'night': return '夜行者'
    default: return ''
  }
}

// 生成标签数组（用于 UI 展示）
function buildTags(dims) {
  var tags = []
  if (dims.time) tags.push(TIME_LABEL[dims.time] || dims.time)
  if (dims.type) tags.push(TYPE_LABEL[dims.type] || dims.type)
  if (dims.social) tags.push(SOCIAL_LABEL[dims.social] || dims.social)
  if (dims.distance) tags.push(DISTANCE_LABEL[dims.distance] || dims.distance)
  if (dims.pace) tags.push(PACE_LABEL[dims.pace] || dims.pace)
  return tags
}

// ===== 主入口：构建风格画像 =====
// 参数：
//   records: 全部出逃记录
//   options.nowTs: 当前时间戳（便于测试可复现）
// 返回：{ dimensions, dominantStyle, description, tags, recordCount }
function buildProfile(records, options) {
  var opts = options || {}
  var recs = Array.isArray(records) ? records : []

  var distance = analyzeDistance(recs)
  var time = analyzeTime(recs)
  var type = analyzeType(recs)
  var social = analyzeSocial(recs)
  var pace = analyzePace(recs, opts.nowTs)

  var dims = {
    distance: distance.dominant,
    time: time.dominant,
    type: type.dominant,
    social: social.dominant,
    pace: pace.dominant
  }

  // 至少有 1 条有效记录才生成描述
  if (recs.length === 0) {
    return {
      dimensions: dims,
      dominantStyle: null,
      description: '还没有出逃记录，摇一次骰子开启你的城市出逃吧。',
      tags: [],
      recordCount: 0,
      detailMaps: { distance: distance.map, time: time.map, type: type.map, social: social.map, pace: pace.map }
    }
  }

  var description = buildDescription(dims)
  var tags = buildTags(dims)

  // dominantStyle：取最显著维度（time 优先，因为最有人格色彩）
  var dominantStyle = dims.time || dims.type || dims.social || dims.distance || dims.pace || null

  return {
    dimensions: dims,
    dominantStyle: dominantStyle,
    description: description,
    tags: tags,
    recordCount: recs.length,
    detailMaps: {
      distance: distance.map,
      time: time.map,
      type: type.map,
      social: social.map,
      pace: pace.map
    }
  }
}

module.exports = {
  // 主入口
  buildProfile: buildProfile,
  buildDescription: buildDescription,
  buildTags: buildTags,
  // 维度分析纯函数
  analyzeDistance: analyzeDistance,
  analyzeTime: analyzeTime,
  analyzeType: analyzeType,
  analyzeSocial: analyzeSocial,
  analyzePace: analyzePace,
  // 工具函数
  parseHour: parseHour,
  pickDominant: pickDominant,
  // 常量
  THRESHOLDS: {
    DISTANCE_NEAR_MAX: DISTANCE_NEAR_MAX,
    DISTANCE_FAR_MIN: DISTANCE_FAR_MIN,
    TIME_MORNING_END: TIME_MORNING_END,
    TIME_NOON_END: TIME_NOON_END,
    TIME_EVENING_END: TIME_EVENING_END
  },
  LABELS: {
    TIME: TIME_LABEL,
    DISTANCE: DISTANCE_LABEL,
    TYPE: TYPE_LABEL,
    SOCIAL: SOCIAL_LABEL,
    PACE: PACE_LABEL
  },
  _internal: { hasLoc: hasLoc, _extractTs: _extractTs, _roleForTime: _roleForTime }
}
