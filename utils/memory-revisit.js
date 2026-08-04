// utils/memory-revisit.js
// B4 记忆回收 · 记忆回访提醒纯函数（零 wx 依赖，可 Node 直接 require 测试）
//
// 设计目标：
//   启动时检查 30 天前的记录，生成「一个月前的今天，你在这里出逃过」提醒。
//   结构：{ hasRevisit, records: [record], title, description, dateLabel }
//
// 业务规则：
//   1. 仅检查 30 天前 ±1 天的记录（避免同一天多条记录刷屏）
//   2. 优先返回带照片的记录（视觉效果更好）
//   3. 无照片时返回第一条记录
//   4. 已展示过的记忆当天不重复提醒（通过 storage key 去重）

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

// 格式化日期标签：YYYY-MM-DD → "M月D日"
// 语义：null → null（保留 null 语义便于上游判空）；空串 → 空串；非日期字符串原样返回
function formatDateLabel(dateStr) {
  if (dateStr === null) return null
  if (typeof dateStr !== 'string' || !dateStr) return ''
  var parts = dateStr.split('-')
  if (parts.length < 3) return dateStr
  var m = parseInt(parts[1], 10)
  var d = parseInt(parts[2], 10)
  if (isNaN(m) || isNaN(d)) return dateStr
  return m + '月' + d + '日'
}

// 计算目标日期字符串（now - 30 天）
// 返回 { dateStr: 'YYYY-MM-DD', ts: number }
function targetDateRange(nowTs, daysAgo) {
  var now = (typeof nowTs === 'number' && isFinite(nowTs) && nowTs > 0) ? nowTs : Date.now()
  var days = (typeof daysAgo === 'number' && daysAgo > 0) ? daysAgo : 30
  var targetTs = now - days * 24 * 60 * 60 * 1000
  var d = new Date(targetTs)
  if (isNaN(d.getTime())) return null
  return {
    dateStr: d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()),
    ts: targetTs
  }
}

// ===== 主入口：查找可回访的记忆 =====
// 参数：
//   records: 全部出逃记录
//   options.nowTs: 当前时间戳（便于测试可复现）
//   options.daysAgo: 回溯天数（默认 30）
//   options.windowDays: 窗口天数（默认 1，即 ±1 天）
//   options.dismissedIds: 已忽略的记录 id 数组（当天不再提醒）
// 返回：{ hasRevisit, records: [record], title, description, dateLabel, targetDateStr }
function findRevisitMemory(records, options) {
  var opts = options || {}
  var recs = Array.isArray(records) ? records : []
  var now = (typeof opts.nowTs === 'number' && isFinite(opts.nowTs) && opts.nowTs > 0) ? opts.nowTs : Date.now()
  var daysAgo = (typeof opts.daysAgo === 'number' && opts.daysAgo > 0) ? opts.daysAgo : 30
  var windowDays = (typeof opts.windowDays === 'number' && opts.windowDays >= 0) ? opts.windowDays : 1
  var dismissedIds = Array.isArray(opts.dismissedIds) ? opts.dismissedIds : []
  var dismissedSet = {}
  for (var i = 0; i < dismissedIds.length; i++) dismissedSet[dismissedIds[i]] = true

  // 目标时间窗口：[now - (daysAgo + windowDays) 天, now - (daysAgo - windowDays) 天]
  var lowerTs = now - (daysAgo + windowDays) * 24 * 60 * 60 * 1000
  var upperTs = now - (daysAgo - windowDays) * 24 * 60 * 60 * 1000

  var candidates = []
  for (var j = 0; j < recs.length; j++) {
    var r = recs[j]
    if (!r || typeof r !== 'object') continue
    if (dismissedSet[r.id]) continue
    var ts = extractTs(r)
    if (ts === null) continue
    if (ts >= lowerTs && ts <= upperTs) {
      candidates.push(r)
    }
  }

  if (candidates.length === 0) {
    return { hasRevisit: false, records: [], title: '', description: '', dateLabel: '', targetDateStr: '' }
  }

  // 优先返回带照片的记录
  var withPhotos = candidates.filter(function (r) {
    return Array.isArray(r.photos) && r.photos.length > 0
  })
  var chosen = withPhotos.length > 0 ? withPhotos[0] : candidates[0]

  // 取所有候选记录（用于「查看更多」）
  var sortedCandidates = candidates.slice().sort(function (a, b) {
    var ta = extractTs(a) || 0
    var tb = extractTs(b) || 0
    return tb - ta  // 倒序
  })

  var targetRange = targetDateRange(now, daysAgo)
  var targetDateStr = targetRange ? targetRange.dateStr : ''
  var dateLabel = formatDateLabel(targetDateStr)

  var title = '一个月前的今天'
  if (dateLabel) title = '一个月前的' + dateLabel

  var desc = _buildDescription(chosen, dateLabel)

  return {
    hasRevisit: true,
    records: sortedCandidates,
    chosenRecord: chosen,
    title: title,
    description: desc,
    dateLabel: dateLabel,
    targetDateStr: targetDateStr,
    candidateCount: candidates.length
  }
}

// 内部：构建回访描述文案
function _buildDescription(record, dateLabel) {
  if (!record || typeof record !== 'object') {
    return '你在这一天出逃过，去看看当时留下了什么。'
  }
  var parts = []
  var title = record.commandTitle || record.commandContent || '出逃'
  parts.push('你在' + (dateLabel || '那一天') + '完成了「' + title + '」')

  if (record.locationName) {
    parts.push('地点是 ' + record.locationName)
  }
  if (record.feeling) {
    parts.push('当时写下了「' + _truncate(record.feeling, 30) + '」')
  }
  var photoCount = Array.isArray(record.photos) ? record.photos.length : 0
  if (photoCount > 0) {
    parts.push('留下了 ' + photoCount + ' 张照片')
  }
  return parts.join('，') + '。'
}

// 内部：截断文本
function _truncate(text, maxLen) {
  if (typeof text !== 'string') return ''
  if (text.length <= maxLen) return text
  return text.slice(0, maxLen) + '...'
}

// 判断今天是否已展示过回访提醒
// storage key: memoryRevisit_dismissed_{YYYY-MM-DD}
function todayDismissedKey(nowTs) {
  var now = (typeof nowTs === 'number' && isFinite(nowTs) && nowTs > 0) ? nowTs : Date.now()
  var d = new Date(now)
  if (isNaN(d.getTime())) return ''
  return 'memoryRevisit_dismissed_' + d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate())
}

module.exports = {
  // 主入口
  findRevisitMemory: findRevisitMemory,
  targetDateRange: targetDateRange,
  todayDismissedKey: todayDismissedKey,
  formatDateLabel: formatDateLabel,
  // 纯函数
  extractTs: extractTs,
  _internal: { _buildDescription: _buildDescription, _truncate: _truncate, pad2: pad2 }
}
