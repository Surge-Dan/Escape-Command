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

module.exports = {
  buildGroupMarkers: buildGroupMarkers,
  buildSoloMarkers: buildSoloMarkers,
  mergeMarkers: mergeMarkers,
  _internal: { hasLoc: hasLoc, locKey: locKey }
}
