// utils/map-marker-builder.js
// C-13: 共同城市底片 —— 地图 marker 构建纯函数（零 wx 依赖）
//
// 把出逃记录拆分为两类 marker：
//   - 同频记录（isGroup=true）：按 groupId 聚合，每组 1 个聚合 marker（含成员数、主类型）
//   - 普通记录：各自独立 marker
// 合并时同位置的 solo marker 被聚合 marker 覆盖（聚合优先），避免重叠。
//
// 返回中间结构（不含 iconPath/callout 等微信字段），由 map.js 映射为原生 marker。
// 可在 Node 直接 require 测试，无需 mock wx。

'use strict'

// 判断记录是否含可消费的坐标
function hasLoc(r) {
  return !!(r && r.location && typeof r.location.latitude === 'number' && typeof r.location.longitude === 'number'
    && isFinite(r.location.latitude) && isFinite(r.location.longitude))
}

// 坐标键（精确到 5 位小数 ≈ 1m，用于同位置覆盖判断）
function locKey(m) {
  return Number(m.latitude).toFixed(5) + ',' + Number(m.longitude).toFixed(5)
}

// C-13: 同频记录按 groupId 聚合
// 每组返回 1 个聚合 marker 数据，位置取该组首条可定位记录
// 成员数取该组所有记录 members 长度的最大值（同一组不同记录成员可能不同）
function buildGroupMarkers(records) {
  if (!Array.isArray(records)) return []
  var groups = {}
  var order = []
  for (var i = 0; i < records.length; i++) {
    var r = records[i]
    if (!r || r.isGroup !== true || !r.groupId) continue
    if (!hasLoc(r)) continue
    if (!groups[r.groupId]) {
      groups[r.groupId] = {
        groupId: r.groupId,
        records: [],
        primaryType: r.commandType || ''
      }
      order.push(r.groupId)
    }
    groups[r.groupId].records.push(r)
  }

  var result = []
  for (var j = 0; j < order.length; j++) {
    var g = groups[order[j]]
    var recs = g.records
    var first = recs[0]
    var memberCount = 0
    for (var k = 0; k < recs.length; k++) {
      var len = Array.isArray(recs[k].members) ? recs[k].members.length : 0
      if (len > memberCount) memberCount = len
    }
    var count = recs.length
    result.push({
      groupId: g.groupId,
      latitude: first.location.latitude,
      longitude: first.location.longitude,
      memberCount: memberCount,
      recordCount: count,
      primaryType: g.primaryType,
      recordIds: recs.map(function (r) { return r.id }),
      title: count > 1 ? ('和朋友一起 · ' + count + '条记忆') : '和朋友一起'
    })
  }
  return result
}

// C-13: 普通记录各自 marker 数据（排除同频记录，同频走聚合）
function buildSoloMarkers(records) {
  if (!Array.isArray(records)) return []
  var result = []
  for (var i = 0; i < records.length; i++) {
    var r = records[i]
    if (!hasLoc(r)) continue
    if (r.isGroup === true) continue
    result.push({
      recordId: r.id,
      latitude: r.location.latitude,
      longitude: r.location.longitude,
      type: r.commandType || '',
      title: r.commandTitle || r.commandContent || '出逃记忆',
      record: r
    })
  }
  return result
}

// C-13: 合并 solo + group，同位置聚合 marker 优先（覆盖同坐标 solo marker）
// 返回 { markers: [{ kind: 'solo'|'group', data }], soloCount, groupCount }
function mergeMarkers(solo, group) {
  solo = Array.isArray(solo) ? solo : []
  group = Array.isArray(group) ? group : []
  var groupLocs = {}
  for (var i = 0; i < group.length; i++) {
    groupLocs[locKey(group[i])] = true
  }
  var markers = []
  var soloCount = 0
  for (var j = 0; j < solo.length; j++) {
    var s = solo[j]
    if (groupLocs[locKey(s)]) continue  // 被聚合 marker 覆盖
    markers.push({ kind: 'solo', data: s })
    soloCount++
  }
  for (var k = 0; k < group.length; k++) {
    markers.push({ kind: 'group', data: group[k] })
  }
  return { markers: markers, soloCount: soloCount, groupCount: group.length }
}

// ===== B4-04: 时间筛选（本周 / 本月 / 全部）=====
// range: 'week' | 'month' | 'all'
// now: 时间戳（便于测试可复现）
function filterByTimeRange(records, range, now) {
  if (!Array.isArray(records)) return []
  if (range === 'all' || !range) return records.slice()
  var ts = (typeof now === 'number' && isFinite(now) && now > 0) ? now : Date.now()
  var ref = new Date(ts)
  if (isNaN(ref.getTime())) ref = new Date()
  // 计算 range 起始时间戳
  var startTs
  if (range === 'week') {
    // 本周：从周一开始（中国习惯）
    var dayOfWeek = ref.getDay() || 7  // 周日=0 → 7
    var monday = new Date(ref)
    monday.setDate(ref.getDate() - dayOfWeek + 1)
    monday.setHours(0, 0, 0, 0)
    startTs = monday.getTime()
  } else if (range === 'month') {
    // 本月：从 1 号开始
    var firstDay = new Date(ref.getFullYear(), ref.getMonth(), 1, 0, 0, 0, 0)
    startTs = firstDay.getTime()
  } else {
    // 未知 range，兜底返回全部
    return records.slice()
  }

  return records.filter(function (r) {
    if (!r || typeof r !== 'object') return false
    // 优先用 startTime 时间戳；否则尝试从 date 字符串解析
    var rTs = null
    if (typeof r.startTime === 'number' && isFinite(r.startTime)) {
      rTs = r.startTime
    } else if (typeof r.date === 'string' && r.date) {
      var d = new Date(r.date + 'T00:00:00')
      if (!isNaN(d.getTime())) rTs = d.getTime()
    }
    if (rTs === null) return false
    return rTs >= startTs && rTs <= ts + 86400000  // 含今天全天
  })
}

// ===== B4-05: 城市筛选 =====
function filterByCity(records, city) {
  if (!Array.isArray(records)) return []
  if (!city || typeof city !== 'string') return records.slice()
  return records.filter(function (r) {
    if (!r || typeof r !== 'object') return false
    if (typeof r.city === 'string' && r.city === city) return true
    if (typeof r.locationName === 'string' && r.locationName.indexOf(city) === 0) return true
    if (r.location && typeof r.location === 'object' && r.location.city === city) return true
    return false
  })
}

// ===== B4-B: 类型筛选 =====
// typeKey: 'all' | 'micro' | 'breakthrough' | 'sync'
//   micro: 碎片时间出逃（mode==='micro' 或 duration<15）
//   breakthrough: 破圈行动（commandType==='breakthrough' 或 isBreakthrough===true）
//   sync: 同频组局（isGroup===true）
function filterByType(records, typeKey) {
  if (!Array.isArray(records)) return []
  if (!typeKey || typeKey === 'all') return records.slice()
  return records.filter(function (r) {
    if (!r || typeof r !== 'object') return false
    if (typeKey === 'micro') {
      return r.mode === 'micro' || (typeof r.duration === 'number' && r.duration < 15)
    }
    if (typeKey === 'breakthrough') {
      return r.commandType === 'breakthrough' || r.isBreakthrough === true
    }
    if (typeKey === 'sync') {
      return r.isGroup === true
    }
    return true
  })
}

// ===== B4-B: 情绪筛选 =====
// moodKey: 'all' | mood id（如 'happy' / 'calm'）
// 兼容 mood 字段（字符串）与 moods 字段（数组）两种存储形式
function filterByMood(records, moodKey) {
  if (!Array.isArray(records)) return []
  if (!moodKey || moodKey === 'all') return records.slice()
  return records.filter(function (r) {
    if (!r || typeof r !== 'object') return false
    if (typeof r.mood === 'string' && r.mood === moodKey) return true
    if (Array.isArray(r.moods) && r.moods.indexOf(moodKey) >= 0) return true
    return false
  })
}

// ===== B4-B: 从记录动态提取可用情绪选项 =====
// 返回 [{ key: 'all', name: '全部' }, { key: 'happy', name: '开心' }, ...]
// moodMeta：可选的 { id → name } 映射，用于把 id 翻译为中文名（来自 constants.MOODS）
function buildMoodOptions(records, moodMeta) {
  var meta = moodMeta || {}
  var counts = {}
  if (Array.isArray(records)) {
    for (var i = 0; i < records.length; i++) {
      var r = records[i]
      if (!r || typeof r !== 'object') continue
      if (typeof r.mood === 'string' && r.mood) {
        counts[r.mood] = (counts[r.mood] || 0) + 1
      }
      if (Array.isArray(r.moods)) {
        for (var j = 0; j < r.moods.length; j++) {
          var m = r.moods[j]
          if (typeof m === 'string' && m) counts[m] = (counts[m] || 0) + 1
        }
      }
    }
  }
  var options = [{ key: 'all', name: '全部' }]
  var keys = Object.keys(counts).sort()
  for (var k = 0; k < keys.length; k++) {
    var key = keys[k]
    options.push({ key: key, name: meta[key] || key, count: counts[key] })
  }
  return options
}

// ===== B4-06: 组合筛选（时间 + 城市 + 类型 + 情绪）=====
function filterRecords(records, options) {
  var opts = options || {}
  var filtered = records
  if (opts.timeRange) {
    filtered = filterByTimeRange(filtered, opts.timeRange, opts.now)
  }
  if (opts.city) {
    filtered = filterByCity(filtered, opts.city)
  }
  if (opts.type) {
    filtered = filterByType(filtered, opts.type)
  }
  if (opts.mood) {
    filtered = filterByMood(filtered, opts.mood)
  }
  return filtered
}

module.exports = {
  buildGroupMarkers: buildGroupMarkers,
  buildSoloMarkers: buildSoloMarkers,
  mergeMarkers: mergeMarkers,
  // B4 新增
  filterByTimeRange: filterByTimeRange,
  filterByCity: filterByCity,
  filterByType: filterByType,
  filterByMood: filterByMood,
  buildMoodOptions: buildMoodOptions,
  filterRecords: filterRecords,
  _internal: { hasLoc: hasLoc, locKey: locKey }
}
