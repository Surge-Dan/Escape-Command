// utils/revisit-helper.js
// B4-B 地图深化 · 重返旧地点纯函数（零 wx 依赖，可 Node 直接 require 测试）
//
// 设计目标：
//   点击地图标记 → 「重返此地」→ 基于旧地点生成一条新出逃指令种子。
//   不直接调用 generator-engine（避免 POI/营业时间等复杂上下文），
//   而是构造一个轻量 command 种子交由 executing 页消费，地点复用旧记录坐标。
//
// 业务规则：
//   1. 复用旧记录的 location / locationName
//   2. 内容基于旧记录类型 + 「重返」语境生成（不与上次完全重复）
//   3. 无坐标的旧记录拒绝重返（返回 null）
//   4. 文案带仪式感：「上次在这里XX，这次再来看看」

'use strict'

// 重返指令模板：按 commandType 分组，每组 3 条候选，随机挑 1 条
var REVISIT_TEMPLATES = {
  color: [
    '换一双眼睛，重新找一次今天的颜色',
    '看看上次那个颜色，此刻是不是还在这',
    '找一个和上次不同的颜色，拍下来'
  ],
  walk: [
    '换一条路线，绕回这个角落',
    '反向走一次上次的路线',
    '在这里停留 5 分钟，再决定下一步'
  ],
  sense: [
    '闭上眼，重新听一次这里的声响',
    '换个季节/时段，感受这里的不同',
    '找一个能坐下的位置，重新体验这里'
  ],
  collect: [
    '在这里再找一件小物，和上次的并排',
    '拍一张和上次角度不同的照片',
    '收集这里此刻的一个细节'
  ],
  food: [
    '换一家附近的店，尝尝不同的味道',
    '再去一次上次那家，点一份不同的',
    '在这里附近找一个能坐下的角落'
  ],
  culture: [
    '换个展品多看一会',
    '重新走进这里，挑一个上次没注意的细节',
    '在这里写下一句此刻的感受'
  ],
  breakthrough: [
    '在这里再做一件平时不会做的事',
    '换一种方式重新体验这个角落',
    '在这里尝试一个上次没敢做的动作'
  ],
  custom: [
    '回到这里，给自己一个新的小任务',
    '在这里停留一会，重新看看',
    '换一种心情，再走一次这里'
  ]
}

// 默认模板（未知类型兜底）
var DEFAULT_TEMPLATES = [
  '回到这里，重新看看这个角落',
  '换一种方式再体验一次',
  '在这里停留 5 分钟，感受变化'
]

// 类型中文名（与 constants.TYPE_META 对齐，但本模块零依赖，故内置）
var TYPE_NAME = {
  color: '颜色探索',
  walk: '漫步发现',
  sense: '感官体验',
  collect: '收藏拼贴',
  food: '美食探索',
  culture: '如实文化',
  breakthrough: '破圈行动',
  custom: '自定义'
}

// 旧记录是否可重返（必须有可消费坐标）
function canRevisit(record) {
  if (!record || typeof record !== 'object') return false
  var loc = record.location
  if (!loc || typeof loc !== 'object') return false
  if (typeof loc.latitude !== 'number' || typeof loc.longitude !== 'number') return false
  if (!isFinite(loc.latitude) || !isFinite(loc.longitude)) return false
  return true
}

// 简单确定性伪随机：基于 seed 取 [0, n)
function _pick(seed, arr) {
  if (!Array.isArray(arr) || arr.length === 0) return ''
  var s = (typeof seed === 'number' && isFinite(seed)) ? Math.abs(Math.floor(seed)) : 0
  return arr[s % arr.length]
}

// 从记录提取种子（id 字符串 hash 或时间戳）
function _seedOf(record) {
  if (!record) return 0
  if (typeof record.id === 'string' && record.id) {
    var h = 0
    for (var i = 0; i < record.id.length; i++) {
      h = (h * 31 + record.id.charCodeAt(i)) | 0
    }
    return Math.abs(h)
  }
  if (typeof record.startTime === 'number') return Math.abs(Math.floor(record.startTime))
  return 0
}

// ===== 主入口：构建重返指令种子 =====
// 参数：
//   oldRecord: 旧出逃记录（需含 location）
//   options.nowTs: 当前时间戳（用于生成新 id）
// 返回：command 种子 或 null（不可重返）
//   {
//     id, content, type, duration, outdoor, nightSafe,
//     location, locationName, revisit: true,
//     revisitFrom: oldRecord.id, tip, steps
//   }
function buildRevisitCommand(oldRecord, options) {
  if (!canRevisit(oldRecord)) return null
  var opts = options || {}
  var now = (typeof opts.nowTs === 'number' && isFinite(opts.nowTs) && opts.nowTs > 0) ? opts.nowTs : Date.now()
  var type = (typeof oldRecord.commandType === 'string' && oldRecord.commandType) ? oldRecord.commandType : 'walk'
  var templates = REVISIT_TEMPLATES[type] || DEFAULT_TEMPLATES
  var seed = _seedOf(oldRecord)
  var content = _pick(seed, templates)
  var tip = _buildTip(oldRecord)
  var steps = _buildSteps(type)

  return {
    id: 'revisit_' + now + '_' + (oldRecord.id || 'x'),
    content: content,
    title: content,
    type: type,
    typeName: TYPE_NAME[type] || '漫步发现',
    duration: 20,
    outdoor: true,
    nightSafe: type === 'sense' || type === 'color',
    cost: 0,
    double: false,
    location: {
      latitude: oldRecord.location.latitude,
      longitude: oldRecord.location.longitude,
      name: oldRecord.location.name || oldRecord.locationName || ''
    },
    locationName: oldRecord.locationName || oldRecord.location.name || '',
    revisit: true,
    revisitFrom: oldRecord.id || '',
    revisitDate: _formatDate(oldRecord),
    tip: tip,
    steps: steps
  }
}

// 构建仪式感提示文案
function _buildTip(record) {
  var parts = []
  var dateStr = _formatDate(record)
  if (dateStr) {
    parts.push('上次在 ' + dateStr + ' 你来过这里')
  }
  var title = record.commandTitle || record.commandContent
  if (title) {
    parts.push('当时完成了「' + title + '」')
  }
  if (parts.length === 0) {
    return '回到一个熟悉的地方，看看它此刻的样子。'
  }
  return parts.join('，') + '。这次，换一种方式重新感受。'
}

// 构建步骤（与 TYPE_STEPS 对齐但加重返语境）
function _buildSteps(type) {
  var base = {
    color: ['回到那个角落', '找一个和上次不同的颜色', '把它拍下来', '写一句它此刻给你的感觉'],
    walk: ['回到起点', '换一条没走过的路线', '走 10 分钟再停', '拍下停下来的地方'],
    sense: ['找个位置坐下', '闭眼 30 秒', '记下此刻听到的 3 种声音', '给这段安静写一句话'],
    collect: ['看看上次捡的小物', '再找一件新的', '把它们摆在一起', '拍下这张收藏'],
    food: ['回到那家店附近', '换一份不同的', '慢慢吃完', '记下这次的味道'],
    culture: ['走进去，挑一件上次没看的', '多看一会', '拍下它的细节', '写一句它让你想到的事'],
    breakthrough: ['深呼吸', '做一件上次没做的', '感受做完后的变化', '写一句今天的突破'],
    custom: ['回到这里', '给自己一个新的小目标', '按自己的节奏完成', '记下此刻的感受']
  }
  return base[type] || base.walk
}

// 格式化旧记录日期为「M月D日」
function _formatDate(record) {
  if (!record) return ''
  var dateStr = ''
  if (typeof record.date === 'string' && record.date) {
    dateStr = record.date
  } else if (typeof record.startTime === 'number' && isFinite(record.startTime)) {
    var d = new Date(record.startTime)
    if (!isNaN(d.getTime())) {
      dateStr = d.getFullYear() + '-' + _pad2(d.getMonth() + 1) + '-' + _pad2(d.getDate())
    }
  }
  if (!dateStr) return ''
  var parts = dateStr.split('-')
  if (parts.length < 3) return dateStr
  var m = parseInt(parts[1], 10)
  var d = parseInt(parts[2], 10)
  if (isNaN(m) || isNaN(d)) return dateStr
  return m + '月' + d + '日'
}

function _pad2(n) {
  return n < 10 ? '0' + n : '' + n
}

// 构建重返总结卡片文案（用于弹窗展示）
// 返回 { title, subtitle, actionText }
function buildRevisitSummary(oldRecord) {
  if (!oldRecord || typeof oldRecord !== 'object') {
    return { title: '重返此地', subtitle: '换一种方式重新感受', actionText: '生成新任务' }
  }
  var dateStr = _formatDate(oldRecord)
  var title = '重返此地'
  if (dateStr) title = '重返 · ' + dateStr
  var subtitle = ''
  var name = oldRecord.locationName || (oldRecord.location && oldRecord.location.name)
  if (name) {
    subtitle = '上次在「' + name + '」出逃过'
  }
  var ct = oldRecord.commandTitle || oldRecord.commandContent
  if (ct) {
    subtitle = subtitle ? subtitle + '，完成了「' + ct + '」' : '完成了「' + ct + '」'
  }
  if (!subtitle) subtitle = '换一种方式重新感受这个角落'
  return { title: title, subtitle: subtitle, actionText: '生成新任务' }
}

module.exports = {
  buildRevisitCommand: buildRevisitCommand,
  buildRevisitSummary: buildRevisitSummary,
  canRevisit: canRevisit,
  // 常量导出
  TYPE_NAME: TYPE_NAME,
  _internal: { _pick: _pick, _seedOf: _seedOf, _buildTip: _buildTip, _buildSteps: _buildSteps, _formatDate: _formatDate, _pad2: _pad2 }
}
