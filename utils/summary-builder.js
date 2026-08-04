// utils/summary-builder.js
// B4 记忆回收 · 阶段总结生成纯函数（零 wx 依赖，可 Node 直接 require 测试）
//
// 设计目标：
//   生成月度/季度阶段性探索总结，用于时间线、年度回顾页展示。
//   总结结构：{ period, recordCount, topCity, topType, topMood, moodDist,
//              totalDuration, photoCount, uniquePlaces, highlightDays, summary }
//
// 文案示例：
//   「这个月你探索了 5 个新角落，最常去的是朝阳区，留下了 8 条记忆。」

'use strict'

function pad2(n) {
  return n < 10 ? '0' + n : '' + n
}

// 内部：从记录提取时间戳
function extractTs(r) {
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

// 内部：从记录推断城市
function inferCity(record) {
  if (!record || typeof record !== 'object') return null
  if (typeof record.city === 'string' && record.city) return record.city
  if (typeof record.locationName === 'string' && record.locationName) {
    return record.locationName.split('·')[0].trim() || record.locationName
  }
  if (record.location && typeof record.location === 'object' &&
      typeof record.location.city === 'string' && record.location.city) {
    return record.location.city
  }
  return null
}

// 取最大计数的 key（并列时字典序最小，保证稳定）
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

// 统计独立位置数（0.01° ≈ 1km 粒度去重）
function countUniquePlaces(records) {
  if (!Array.isArray(records)) return 0
  var seen = {}
  var count = 0
  for (var i = 0; i < records.length; i++) {
    var r = records[i]
    if (!r || !r.location) continue
    var lat = r.location.latitude
    var lng = r.location.longitude
    if (typeof lat !== 'number' || typeof lng !== 'number') continue
    var key = (Math.round(lat * 100) / 100) + ',' + (Math.round(lng * 100) / 100)
    if (!seen[key]) {
      seen[key] = true
      count++
    }
  }
  return count
}

// 筛选指定月份的记录
// year: 4 位年（如 2026）
// month: 1-12
// 返回过滤后的记录数组（按时间倒序）
function filterByMonth(records, year, month) {
  if (!Array.isArray(records)) return []
  if (typeof year !== 'number' || !isFinite(year) || year < 2000) return []
  if (typeof month !== 'number' || month < 1 || month > 12) return []
  var result = []
  var ymPrefix = year + '-' + pad2(month)
  for (var i = 0; i < records.length; i++) {
    var r = records[i]
    if (!r || typeof r !== 'object') continue
    var ts = extractTs(r)
    if (ts === null) continue
    var d = new Date(ts)
    if (isNaN(d.getTime())) continue
    if (d.getFullYear() === year && (d.getMonth() + 1) === month) {
      result.push(r)
    }
  }
  return result
}

// 筛选指定季度的记录
// quarter: 1-4（Q1=1-3月, Q2=4-6月, Q3=7-9月, Q4=10-12月）
function filterByQuarter(records, year, quarter) {
  if (!Array.isArray(records)) return []
  if (typeof year !== 'number' || !isFinite(year) || year < 2000) return []
  if (typeof quarter !== 'number' || quarter < 1 || quarter > 4) return []
  var startMonth = (quarter - 1) * 3 + 1
  var endMonth = startMonth + 2
  var result = []
  for (var i = 0; i < records.length; i++) {
    var r = records[i]
    if (!r || typeof r !== 'object') continue
    var ts = extractTs(r)
    if (ts === null) continue
    var d = new Date(ts)
    if (isNaN(d.getTime())) continue
    if (d.getFullYear() === year) {
      var m = d.getMonth() + 1
      if (m >= startMonth && m <= endMonth) result.push(r)
    }
  }
  return result
}

// ===== 主入口 1：构建月度总结 =====
// 参数：
//   records: 全部出逃记录
//   year: 4 位年
//   month: 1-12
// 返回：{ period, periodLabel, recordCount, topCity, topType, topMood, moodDist,
//        totalDuration, photoCount, uniquePlaces, highlightDays, summary }
function buildMonthlySummary(records, year, month) {
  var monthRecords = filterByMonth(records, year, month)
  var period = { type: 'month', year: year, month: month }
  var periodLabel = year + '年' + month + '月'

  return _buildSummary(monthRecords, period, periodLabel)
}

// ===== 主入口 2：构建季度总结 =====
function buildQuarterlySummary(records, year, quarter) {
  var qRecords = filterByQuarter(records, year, quarter)
  var period = { type: 'quarter', year: year, quarter: quarter }
  var periodLabel = year + '年Q' + quarter

  return _buildSummary(qRecords, period, periodLabel)
}

// ===== 主入口 3：构建年度总结 =====
function buildYearlySummary(records, year) {
  var yearRecords = (Array.isArray(records) ? records : []).filter(function (r) {
    if (!r || typeof r !== 'object') return false
    var ts = extractTs(r)
    if (ts === null) return false
    var d = new Date(ts)
    return !isNaN(d.getTime()) && d.getFullYear() === year
  })
  var period = { type: 'year', year: year }
  var periodLabel = year + '年'

  return _buildSummary(yearRecords, period, periodLabel)
}

// 内部：构建总结结构
function _buildSummary(periodRecords, period, periodLabel) {
  var recordCount = periodRecords.length

  // 城市分布
  var cityMap = {}
  var typeMap = {}
  var moodMap = {}
  var totalDuration = 0
  var photoCount = 0
  var daySet = {}

  for (var i = 0; i < periodRecords.length; i++) {
    var r = periodRecords[i]
    if (!r || typeof r !== 'object') continue

    var city = inferCity(r)
    if (city) cityMap[city] = (cityMap[city] || 0) + 1

    if (typeof r.commandType === 'string' && r.commandType) {
      typeMap[r.commandType] = (typeMap[r.commandType] || 0) + 1
    }
    if (typeof r.mood === 'string' && r.mood) {
      moodMap[r.mood] = (moodMap[r.mood] || 0) + 1
    }
    if (typeof r.duration === 'number' && isFinite(r.duration) && r.duration > 0) {
      totalDuration += r.duration
    }
    if (Array.isArray(r.photos)) photoCount += r.photos.length

    // 日期去重（统计有出逃的天数）
    var ts = extractTs(r)
    if (ts !== null) {
      var d = new Date(ts)
      if (!isNaN(d.getTime())) {
        var dayKey = d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate())
        daySet[dayKey] = true
      }
    }
  }

  var topCity = pickDominant(cityMap)
  var topType = pickDominant(typeMap)
  var topMood = pickDominant(moodMap)
  var uniquePlaces = countUniquePlaces(periodRecords)
  var highlightDays = Object.keys(daySet).length

  // 生成文案
  var summary = _buildSummaryText(periodLabel, recordCount, uniquePlaces, topCity, topMood, highlightDays)

  return {
    period: period,
    periodLabel: periodLabel,
    recordCount: recordCount,
    topCity: topCity,
    topType: topType,
    topMood: topMood,
    moodDist: moodMap,
    cityDist: cityMap,
    typeDist: typeMap,
    totalDuration: totalDuration,
    photoCount: photoCount,
    uniquePlaces: uniquePlaces,
    highlightDays: highlightDays,
    summary: summary,
    records: periodRecords.slice()
  }
}

// 生成总结文案
function _buildSummaryText(periodLabel, recordCount, uniquePlaces, topCity, topMood, highlightDays) {
  if (recordCount === 0) {
    return periodLabel + '还没有出逃记录，下个月摇一次骰子开启你的城市出逃吧。'
  }
  var parts = []
  parts.push(periodLabel + '你完成了 ' + recordCount + ' 次出逃')
  if (uniquePlaces > 0) parts.push('探索了 ' + uniquePlaces + ' 个新角落')
  if (topCity) parts.push('最常去的是 ' + topCity)
  if (highlightDays > 0) parts.push('在 ' + highlightDays + ' 个日子里留下了足迹')
  if (topMood) parts.push('主要心情是 ' + topMood)
  return parts.join('，') + '。'
}

// ===== 取最近的月份总结（用于「上个月回顾」入口）=====
// 返回 { year, month, label } 或 null
function lastMonthRange(nowTs) {
  var now = (typeof nowTs === 'number' && isFinite(nowTs) && nowTs > 0) ? nowTs : Date.now()
  var d = new Date(now)
  if (isNaN(d.getTime())) return null
  // 上个月
  var lm = new Date(d.getFullYear(), d.getMonth() - 1, 1)
  if (isNaN(lm.getTime())) return null
  return {
    year: lm.getFullYear(),
    month: lm.getMonth() + 1,
    label: lm.getFullYear() + '年' + (lm.getMonth() + 1) + '月'
  }
}

module.exports = {
  // 主入口
  buildMonthlySummary: buildMonthlySummary,
  buildQuarterlySummary: buildQuarterlySummary,
  buildYearlySummary: buildYearlySummary,
  lastMonthRange: lastMonthRange,
  // 纯函数（便于单测）
  filterByMonth: filterByMonth,
  filterByQuarter: filterByQuarter,
  countUniquePlaces: countUniquePlaces,
  pickDominant: pickDominant,
  inferCity: inferCity,
  extractTs: extractTs,
  _internal: { _buildSummary: _buildSummary, _buildSummaryText: _buildSummaryText, pad2: pad2 }
}
