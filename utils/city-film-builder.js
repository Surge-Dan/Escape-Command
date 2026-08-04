// utils/city-film-builder.js
// B4 记忆回收 · 城市底片聚合器
//
// 设计目标：
//   把分散的出逃记录按「城市」聚合为「城市底片」结构，用于：
//   - 年度总结（year-review）的城市维度展示
//   - 个人画像的足迹地图
//   - 分享卡片的城市封面
//
// 城市底片结构：
//   { city, recordCount, photoCount, moodDominant, topTypes, firstDate, lastDate,
//     duration, topLocations, records }
//
// 纯函数（零 wx 依赖，可 Node 直接 require 测试）：
//   buildCityFilms / buildCityFilm / aggregateMoods / aggregateTypes / pickDominant

'use strict'

function pad2(n) {
  return n < 10 ? '0' + n : '' + n
}

function safeDateStr(ts) {
  if (typeof ts !== 'number' || !isFinite(ts) || ts < 0) return null
  try {
    var d = new Date(ts)
    if (isNaN(d.getTime())) return null
    return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate())
  } catch (e) {
    return null
  }
}

// 从记录推断城市名
// 优先级：record.city > record.locationName > record.location.city > null
function inferCity(record) {
  if (!record || typeof record !== 'object') return null
  if (typeof record.city === 'string' && record.city) return record.city
  if (typeof record.locationName === 'string' && record.locationName) {
    // locationName 形如 "北京市·朝阳区"，取首段
    return record.locationName.split('·')[0].trim() || record.locationName
  }
  if (record.location && typeof record.location === 'object' &&
      typeof record.location.city === 'string' && record.location.city) {
    return record.location.city
  }
  return null
}

// 聚合 mood：返回 { mood: count }，按 count 降序
function aggregateMoods(records) {
  var map = {}
  if (!Array.isArray(records)) return map
  for (var i = 0; i < records.length; i++) {
    var r = records[i]
    if (!r || typeof r !== 'object') continue
    var m = r.mood
    if (typeof m === 'string' && m) {
      map[m] = (map[m] || 0) + 1
    }
  }
  return map
}

// 聚合 type：返回 [{ type, count }]，按 count 降序
function aggregateTypes(records) {
  var map = {}
  if (!Array.isArray(records)) return []
  for (var i = 0; i < records.length; i++) {
    var r = records[i]
    if (!r || typeof r !== 'object') continue
    var t = r.commandType
    if (typeof t === 'string' && t) {
      map[t] = (map[t] || 0) + 1
    }
  }
  return Object.keys(map).map(function (k) {
    return { type: k, count: map[k] }
  }).sort(function (a, b) { return b.count - a.count })
}

// 取最大计数的 key（并列时取字典序第一个，保证稳定）
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

// 计算总时长（分钟）
function sumDuration(records) {
  if (!Array.isArray(records)) return 0
  var total = 0
  for (var i = 0; i < records.length; i++) {
    var r = records[i]
    if (!r || typeof r !== 'object') continue
    var d = r.duration
    if (typeof d === 'number' && isFinite(d) && d > 0) {
      total += d
    }
  }
  return total
}

// 统计照片数
function countPhotos(records) {
  if (!Array.isArray(records)) return 0
  var total = 0
  for (var i = 0; i < records.length; i++) {
    var r = records[i]
    if (!r || typeof r !== 'object') continue
    if (Array.isArray(r.photos)) total += r.photos.length
  }
  return total
}

// 取前 N 个独立位置（用于 topLocations）
function pickTopLocations(records, maxN) {
  var limit = (typeof maxN === 'number' && maxN > 0) ? maxN : 3
  if (!Array.isArray(records)) return []
  var seen = {}
  var result = []
  for (var i = 0; i < records.length && result.length < limit; i++) {
    var r = records[i]
    if (!r || !r.location) continue
    var lat = r.location.latitude
    var lng = r.location.longitude
    if (typeof lat !== 'number' || typeof lng !== 'number') continue
    var key = lat.toFixed(3) + ',' + lng.toFixed(3)
    if (seen[key]) continue
    seen[key] = true
    result.push({
      latitude: lat,
      longitude: lng,
      title: r.commandTitle || '',
      date: r.date || ''
    })
  }
  return result
}

// 取首尾日期
function pickDateRange(records) {
  if (!Array.isArray(records) || records.length === 0) {
    return { firstDate: null, lastDate: null }
  }
  var first = null
  var last = null
  for (var i = 0; i < records.length; i++) {
    var r = records[i]
    if (!r || typeof r !== 'object') continue
    // 优先用 date 字段（YYYY-MM-DD 字符串），否则用 startTime 时间戳
    var d = null
    if (typeof r.date === 'string' && r.date) {
      d = r.date
    } else if (typeof r.startTime === 'number') {
      d = safeDateStr(r.startTime)
    }
    if (!d) continue
    if (first === null || d < first) first = d
    if (last === null || d > last) last = d
  }
  return { firstDate: first, lastDate: last }
}

// ===== B4-01: 构建单个城市的底片 =====
function buildCityFilm(city, records) {
  if (typeof city !== 'string' || !city) return null
  if (!Array.isArray(records) || records.length === 0) return null

  var moodMap = aggregateMoods(records)
  var typeList = aggregateTypes(records)
  var dateRange = pickDateRange(records)

  return {
    city: city,
    recordCount: records.length,
    photoCount: countPhotos(records),
    moodDominant: pickDominant(moodMap),
    moodMap: moodMap,
    topTypes: typeList.slice(0, 3),
    firstDate: dateRange.firstDate,
    lastDate: dateRange.lastDate,
    duration: sumDuration(records),
    topLocations: pickTopLocations(records, 3),
    records: records.slice()
  }
}

// ===== B4-02: 把所有记录聚合为城市底片数组 =====
// 返回 { films: [], totalCities: N, totalRecords: N, unmatchedRecords: N }
// films 按 recordCount 降序；同 count 时按城市名字典序（稳定排序）
function buildCityFilms(records) {
  if (!Array.isArray(records)) {
    return { films: [], totalCities: 0, totalRecords: 0, unmatchedRecords: 0 }
  }

  var groups = {}
  var order = []
  var unmatchedCount = 0

  for (var i = 0; i < records.length; i++) {
    var r = records[i]
    if (!r || typeof r !== 'object') {
      unmatchedCount++
      continue
    }
    var city = inferCity(r)
    if (!city) {
      unmatchedCount++
      continue
    }
    if (!groups[city]) {
      groups[city] = []
      order.push(city)
    }
    groups[city].push(r)
  }

  var films = []
  for (var j = 0; j < order.length; j++) {
    var c = order[j]
    var film = buildCityFilm(c, groups[c])
    if (film) films.push(film)
  }

  // 排序：recordCount 降序；并列时 city 字典序
  films.sort(function (a, b) {
    if (b.recordCount !== a.recordCount) return b.recordCount - a.recordCount
    return a.city < b.city ? -1 : (a.city > b.city ? 1 : 0)
  })

  return {
    films: films,
    totalCities: films.length,
    totalRecords: records.length - unmatchedCount,
    unmatchedRecords: unmatchedCount
  }
}

// ===== B4-03: 取足迹摘要（用于分享卡片）=====
// 一句话摘要：「走过 N 座城市 · 留下 M 条记忆 · X 张照片」
function buildFootprintSummary(records) {
  var result = buildCityFilms(records)
  var totalPhotos = 0
  var totalDuration = 0
  for (var i = 0; i < result.films.length; i++) {
    totalPhotos += result.films[i].photoCount
    totalDuration += result.films[i].duration
  }
  return {
    cities: result.totalCities,
    records: result.totalRecords,
    photos: totalPhotos,
    durationMin: totalDuration,
    durationHours: Math.round(totalDuration / 60 * 10) / 10,
    summary: '走过 ' + result.totalCities + ' 座城市 · 留下 ' + result.totalRecords + ' 条记忆 · ' + totalPhotos + ' 张照片'
  }
}

module.exports = {
  // 纯函数
  inferCity: inferCity,
  aggregateMoods: aggregateMoods,
  aggregateTypes: aggregateTypes,
  pickDominant: pickDominant,
  sumDuration: sumDuration,
  countPhotos: countPhotos,
  pickTopLocations: pickTopLocations,
  pickDateRange: pickDateRange,
  safeDateStr: safeDateStr,
  // 主入口
  buildCityFilm: buildCityFilm,
  buildCityFilms: buildCityFilms,
  buildFootprintSummary: buildFootprintSummary
}
