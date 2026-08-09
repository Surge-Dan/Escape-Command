// utils/record-builder.js
// 出逃记录构造器（纯函数，零 wx 依赖）
//
// 普通出逃（executing → record）与同频出逃（group/escape-record）共用此构造器，
// 保证两条流程写入 globalData.records 的字段结构完全一致，下游 map/profile/badges/
// collection 等模块的数据联动统一。
//
// 覆盖：
//   - 普通记录：photos/feeling/mood/filter/stickers + location/weather/date/time
//   - 同频扩展：isGroup/groupId/members/steps（仅 recordData.isGroup=true 时注入）
//   - location 优先级：recordData.location > ctx.location > null
//   - duration 由 startTime..now 计算，下界 1 分钟
//
// 可在 Node 直接 require 测试，无需 mock wx。

'use strict'

function pad2(n) {
  return n < 10 ? '0' + n : '' + n
}

// 取日期字符串 YYYY-MM-DD（基于传入 now，便于测试可复现）
function todayStr(now) {
  var d = (typeof now === 'number' && now >= 0) ? new Date(now) : new Date()
  if (isNaN(d.getTime())) d = new Date()
  return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate())
}

// 取时间字符串 HH:MM
function timeStr(now) {
  var d = (typeof now === 'number' && now >= 0) ? new Date(now) : new Date()
  if (isNaN(d.getTime())) d = new Date()
  return pad2(d.getHours()) + ':' + pad2(d.getMinutes())
}

// 防御性归一化对象入参
function safeObj(v) {
  return (v && typeof v === 'object' && !Array.isArray(v)) ? v : {}
}

// 判断是否为「可消费的」location 对象（排除数组/null/原始值）
// 下游 map.js 依赖 r.location.latitude/longitude，数组虽 typeof==='object' 但无此属性
function isLocObj(v) {
  return v && typeof v === 'object' && !Array.isArray(v)
}

// 留痕 steps：executionProgress 存在时升级为 [{text, completedAt}] 对象数组
// 用于事后追溯每步完成时间（时间线/记录详情页可展示「第几步何时完成」）
//   rd.steps: 外部传入的最终文本数组（优先取，保证文本是用户看到的最终版）
//   rd.executionProgress.steps: 持久化的 {text, done, completedAt}
// 无 executionProgress 时返回 null（调用方回退到原 steps 文本数组）
function buildTracedSteps(rd) {
  var ep = rd && rd.executionProgress
  if (!ep || !Array.isArray(ep.steps) || ep.steps.length === 0) return null
  var textArr = Array.isArray(rd.steps) ? rd.steps : []
  return ep.steps.map(function (s, i) {
    var text = (textArr[i] != null) ? String(textArr[i]) : (s.text || '')
    return { text: text, completedAt: s.completedAt || null }
  })
}

// 构造出逃记录
//   cmd: { id, title, content, type, typeColor, startTime, photos }
//   recordData: { photos, feeling, mood, filter, stickers, location, isGroup, groupId, members, steps }
//   ctx: { location, weather, now }
function buildRecord(cmd, recordData, ctx) {
  var c = safeObj(cmd)
  var rd = safeObj(recordData)
  var x = safeObj(ctx)
  var now = (typeof x.now === 'number' && Number.isFinite(x.now)) ? x.now : Date.now()
  var startTime = (typeof c.startTime === 'number' && Number.isFinite(c.startTime)) ? c.startTime : now
  // duration 下界 1 分钟，避免 0 或负数（下游 progress/统计依赖）
  var duration = Math.max(1, Math.round((now - startTime) / 60000))

  // location 优先级：recordData.location > ctx.location > null
  // 用 isLocObj 排除数组（数组无 latitude/longitude，下游 map 无法消费）
  var loc = isLocObj(rd.location) ? rd.location : (isLocObj(x.location) ? x.location : null)

  var title = c.title || c.content || '出逃记忆'
  // 留痕 steps：executionProgress 存在时升级为 [{text, completedAt}]，否则 null
  var tracedSteps = buildTracedSteps(rd)
  var record = {
    // id 加随机后缀避免 1ms 内并发/双击撞 id（下游 find/去重/memory-revisit 依赖 id 唯一）
    id: 'r_' + now + '_' + Math.random().toString(36).slice(2, 8),
    commandId: c.id || '',
    commandTitle: title,
    commandContent: c.content || title,
    commandType: typeof c.type === 'string' && c.type ? c.type : 'custom',
    // mode/double 供 badge-engine 模式徽章判定（micro_master/walk_master/double_master/night_master/rainy_master）
    // mode 来自 rollCommand 的入参（roll 模式），与 commandType（主题类型）是两个维度
    mode: typeof c.mode === 'string' ? c.mode : '',
    double: !!(c.double || c.social),
    // timestamp 供 profile/时间线按时间戳排序与计算最长连续天数
    timestamp: now,
    typeColor: c.typeColor || '#5CBF9E',
    duration: duration,
    photos: Array.isArray(rd.photos) ? rd.photos.slice(0, 9) : [],
    feeling: typeof rd.feeling === 'string' ? rd.feeling.slice(0, 200) : '',
    mood: rd.mood || 'calm',
    location: loc,
    weather: x.weather !== undefined ? x.weather : null,
    date: todayStr(now),
    time: timeStr(now),
    rotation: Math.random() * 4 - 2,
    filter: rd.filter || 'day',
    stickers: Array.isArray(rd.stickers) ? rd.stickers.slice() : []
  }

  // 同频出逃扩展字段（仅 isGroup=true 注入，普通记录不带这些键，保持结构干净）
  if (rd.isGroup === true) {
    record.isGroup = true
    record.groupId = typeof rd.groupId === 'string' ? rd.groupId : ''
    record.members = Array.isArray(rd.members) ? rd.members.slice() : []
    // 留痕优先：有 executionProgress 用 [{text, completedAt}]，否则回退文本数组
    record.steps = tracedSteps || (Array.isArray(rd.steps) ? rd.steps.slice() : [])
  } else if (tracedSteps) {
    // 普通出逃：executionProgress 存在时也带留痕 steps（事后可追溯每步完成时间）
    record.steps = tracedSteps
  }

  return record
}

// 自动注入同频扩展字段：cmd 有 isGroup 且 rd 未显式传时，从 cmd 补齐
// record 页 onSave 只传基础字段（photos/feeling/mood/filter/stickers）时，
// 同频记录的 isGroup/groupId/members/steps 从 currentCommand 补齐
// 普通出逃 cmd.isGroup 不存在，不注入，零影响
// 纯函数：不修改入参，注入时返回新对象，不注入时返回原 rd
function injectGroupFields(cmd, rd) {
  var c = safeObj(cmd)
  var r = safeObj(rd)
  if (r.isGroup !== true && c.isGroup === true) {
    return Object.assign({}, r, {
      isGroup: true,
      groupId: c.groupId,
      members: c.members,
      steps: c.steps
    })
  }
  return r
}

// C-12: 共同记录展示摘要
// 从同频记录提取成员名 + 每步完成时间，供 record-detail 页渲染
//   record.members: 字符串数组（昵称）或对象数组（含 nickname）
//   record.steps:   [{text, completedAt}] 留痕数组 或 文本数组（无留痕时回退）
// 返回 { ok, isGroup, members:[string], stepTraces:[{text, completedAt}] }
// 非同频记录返回空 members + 空 stepTraces（调用方按 isGroup 判断是否展示）
// 纯函数：零 wx 依赖，不修改入参
function buildGroupSummary(record) {
  var r = safeObj(record)
  var isGroup = r.isGroup === true
  var rawMembers = Array.isArray(r.members) ? r.members : []
  var members = []
  for (var i = 0; i < rawMembers.length; i++) {
    var m = rawMembers[i]
    if (m && typeof m === 'object' && !Array.isArray(m)) {
      members.push(String(m.nickname || m.name || ''))
    } else if (typeof m === 'string') {
      members.push(m)
    } else if (m != null) {
      members.push(String(m))
    }
  }
  var steps = r.steps
  var stepTraces = []
  if (Array.isArray(steps)) {
    for (var j = 0; j < steps.length; j++) {
      var s = steps[j]
      if (s && typeof s === 'object' && !Array.isArray(s)) {
        stepTraces.push({ text: String(s.text || ''), completedAt: s.completedAt || null })
      } else {
        stepTraces.push({ text: String(s == null ? '' : s), completedAt: null })
      }
    }
  }
  return { ok: true, isGroup: isGroup, members: members, stepTraces: stepTraces }
}

module.exports = {
  buildRecord: buildRecord,
  injectGroupFields: injectGroupFields,
  buildGroupSummary: buildGroupSummary,
  _internal: {
    todayStr: todayStr,
    timeStr: timeStr,
    pad2: pad2,
    safeObj: safeObj,
    isLocObj: isLocObj,
    buildTracedSteps: buildTracedSteps,
    injectGroupFields: injectGroupFields,
    buildGroupSummary: buildGroupSummary
  }
}
