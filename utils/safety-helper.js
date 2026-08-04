// utils/safety-helper.js
// 安全合规工具函数（B1 安全合规）
//
// 纯函数模块，零 wx 依赖，context 全部入参传入，可在 Node 直接 require 测试。
// 覆盖：
//   SH-01 isNightTime          判断是否夜间时段（21:00-06:00）
//   SH-02 filterNightSafety    夜间安全过滤（nightSafe + 距离限制）
//   SH-03 checkContentSafety   基础内容安全检查（敏感词过滤）
//   SH-04 getEmergencyContacts 返回紧急联系信息
//   SH-05 shouldLimitDistance  判断是否需要距离限制（夜间+户外）
//   SH-06 buildPrivacySummary  生成隐私授权说明摘要

'use strict'

// ===== SH-01: 夜间时段判定 =====
// 夜间定义：21:00-06:00（含 21，不含 6）
// hour 为 0-23 整数
function isNightTime(hour) {
  if (typeof hour !== 'number' || isNaN(hour) || hour < 0 || hour > 23) {
    // 非法输入保守返回 true（夜间更安全）
    return true
  }
  return hour >= 21 || hour < 6
}

// ===== SH-02: 夜间安全过滤 =====
// 夜间仅保留 nightSafe:true 的指令，或距离 < maxDistance 的指令
// commands: 指令数组
// hour: 当前小时 0-23
// maxDistance: 夜间最大允许距离（米），默认 1000
// userLocation: { latitude, longitude } 可选，无则不做距离判断
function filterNightSafety(commands, hour, maxDistance, userLocation) {
  if (!Array.isArray(commands)) return []
  if (!isNightTime(hour)) return commands.slice()
  var limit = (typeof maxDistance === 'number' && maxDistance > 0) ? maxDistance : 1000
  return commands.filter(function (cmd) {
    // nightSafe 标记的指令夜间可用
    if (cmd && cmd.nightSafe === true) return true
    // 有用户位置且指令有坐标时，按距离过滤
    if (userLocation && cmd && cmd.location &&
        typeof cmd.location.latitude === 'number' &&
        typeof cmd.location.longitude === 'number' &&
        typeof userLocation.latitude === 'number' &&
        typeof userLocation.longitude === 'number') {
      var dist = calcDistance(
        userLocation.latitude, userLocation.longitude,
        cmd.location.latitude, cmd.location.longitude
      )
      return dist <= limit
    }
    // 无位置信息时，夜间不推荐户外指令
    if (cmd && cmd.outdoor === false) return true
    return false
  })
}

// ===== SH-03: 基础内容安全检查 =====
// 敏感词基础词库（生产环境应接入微信内容安全 API）
// 返回 { safe: boolean, matched: string[] }
var SENSITIVE_WORDS = [
  // 暴力相关
  '杀', '砍', '打人', '暴力', '武器', '刀', '枪',
  // 违法相关
  '赌博', '毒品', '走私', '诈骗', '传销',
  // 色情相关
  '色情', '裸体', '性服务',
  // 政治敏感（简略，生产环境需完整词库）
  '反动', '颠覆',
  // 其他
  '自杀', '自残', '毒品'
]

function checkContentSafety(text) {
  if (typeof text !== 'string' || !text.length) {
    return { safe: true, matched: [] }
  }
  var lower = text.toLowerCase()
  var matched = []
  for (var i = 0; i < SENSITIVE_WORDS.length; i++) {
    var word = SENSITIVE_WORDS[i]
    if (lower.indexOf(word) !== -1) {
      matched.push(word)
    }
  }
  return { safe: matched.length === 0, matched: matched }
}

// ===== SH-04: 紧急联系信息 =====
// 返回通用紧急联系信息（不依赖定位，生产环境可接入附近派出所查询）
function getEmergencyContacts() {
  return {
    police: { name: '报警', number: '110', desc: '遇到人身安全威胁时拨打' },
    medical: { name: '急救', number: '120', desc: '遇到医疗紧急情况时拨打' },
    fire: { name: '消防', number: '119', desc: '遇到火灾时拨打' },
    traffic: { name: '交通事故', number: '122', desc: '遇到交通事故时拨打' }
  }
}

// ===== SH-05: 是否需要距离限制 =====
// 夜间 + 户外指令需要距离限制
function shouldLimitDistance(cmd, hour) {
  if (!cmd) return false
  if (!isNightTime(hour)) return false
  // 户外指令（outdoor !== false）在夜间需要距离限制
  return cmd.outdoor !== false
}

// ===== SH-06: 隐私授权说明摘要 =====
// 生成隐私授权说明文本，用于 onboarding 和 settings 页展示
function buildPrivacySummary() {
  return {
    title: '隐私与安全说明',
    sections: [
      {
        title: '定位用途',
        desc: '我们使用你的位置信息来生成附近的出逃任务，并记录你的城市足迹。位置信息仅存储在你的设备本地，不会上传到服务器。'
      },
      {
        title: '数据存储',
        desc: '你的出逃记录、徽章、设置等数据均存储在微信小程序本地缓存中。清除小程序缓存将删除所有数据，且无法恢复。'
      },
      {
        title: '你的权利',
        desc: '你可以随时在「设置」中关闭定位、清除数据或退出小程序。关闭定位后，我们将不再生成基于位置的任务推荐。'
      },
      {
        title: '内容安全',
        desc: '你上传的文字和图片内容会经过安全检查。请勿上传违法、暴力、色情等不良内容。'
      }
    ]
  }
}

// ===== 工具函数：Haversine 距离计算 =====
// 返回两点间距离（米）
function calcDistance(lat1, lng1, lat2, lng2) {
  var R = 6371000 // 地球半径（米）
  var toRad = function (deg) { return deg * Math.PI / 180 }
  var dLat = toRad(lat2 - lat1)
  var dLng = toRad(lng2 - lng1)
  var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2)
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

module.exports = {
  isNightTime: isNightTime,
  filterNightSafety: filterNightSafety,
  checkContentSafety: checkContentSafety,
  getEmergencyContacts: getEmergencyContacts,
  shouldLimitDistance: shouldLimitDistance,
  buildPrivacySummary: buildPrivacySummary,
  calcDistance: calcDistance,
  // 内部导出供测试
  _internal: {
    SENSITIVE_WORDS: SENSITIVE_WORDS
  }
}
