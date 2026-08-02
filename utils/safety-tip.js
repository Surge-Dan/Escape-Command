// utils/safety-tip.js
// 安全与信任体系（PRD §15）—— 纯函数，零 wx 依赖
//
// 设计目标：
//   - 执行页安全提示卡：根据时间/天气/任务类型生成上下文相关安全提示
//   - 极端条件阻断：夜间偏僻、极端天气等场景返回 shouldPause，提示用户暂停户外任务
//   - 紧急退出与位置分享：为 executing 页提供 shareLocationPayload 与 emergencyExitHint
//
// 纯函数边界：
//   - 不调用 wx.* API（openLocation / shareAppMessage 由调用方执行）
//   - 不读 storage / globalData（数据由调用方通过 ctx 注入）
//   - 不修改入参，不维护状态
//
// 覆盖 PRD §15.1 基础安全原则：
//   - 夜间任务默认限制距离
//   - 极端天气自动暂停户外任务
//   - 不推荐偏僻、照明差或风险高的地点
//   - 支持一键结束任务（emergencyExitHint）
//   - 支持分享位置（buildShareLocationPayload）
//   - 医疗、法律和人身安全相关内容不由 AI 自由生成（这里只给兜底文案，不调 AI）

'use strict'

// 安全等级：info 普通提示 / warn 警示 / danger 阻断
var LEVEL = { INFO: 'info', WARN: 'warn', DANGER: 'danger' }

// 时段判定：6-10 早晨 / 10-17 白天 / 17-19 黄昏 / 19-22 夜晚 / 22-6 深夜
function periodOfDay(hour) {
  if (typeof hour !== 'number' || isNaN(hour)) hour = 12
  if (hour < 6 || hour >= 22) return 'lateNight'
  if (hour < 10) return 'morning'
  if (hour < 17) return 'daytime'
  if (hour < 19) return 'dusk'
  return 'night'
}

// 天气是否极端（暴雨/大雪/雷暴/大风/高温）
function isExtremeWeather(weather) {
  if (!weather) return false
  var cond = (weather.condition || weather.description || '').toString().toLowerCase()
  var temp = Number(weather.temperature)
  if (/雷|storm|thunder/.test(cond)) return true
  if (/暴雨|大雨|heavy\s*rain/.test(cond)) return true
  if (/大雪|暴雪|blizzard|heavy\s*snow/.test(cond)) return true
  if (/大风|台风|gale|typhoon/.test(cond)) return true
  if (!isNaN(temp) && temp >= 38) return true // 高温
  if (!isNaN(temp) && temp <= -5) return true // 严寒
  return false
}

// 是否夜间（19:00-6:00）
function isNight(hour) {
  if (typeof hour !== 'number' || isNaN(hour)) return false
  return hour >= 19 || hour < 6
}

// 是否深夜（22:00-6:00）
function isLateNight(hour) {
  if (typeof hour !== 'number' || isNaN(hour)) return false
  return hour >= 22 || hour < 6
}

// 安全提示卡 —— 综合时间/天气/任务类型/人数返回提示
//   ctx: { hour, weather, commandType, isGroup, outdoor, partners, distanceKm }
//   返回: { title, content, level, action: 'continue' | 'caution' | 'pause' }
function getTip(ctx) {
  var c = ctx && typeof ctx === 'object' ? ctx : {}
  var hour = typeof c.hour === 'number' ? c.hour : 12
  var weather = c.weather || {}
  var cmdType = c.commandType || 'walk'
  var isGroup = c.isGroup === true
  var outdoor = c.outdoor !== false // 默认户外
  var partners = c.partners || (isGroup ? '同频组局' : '独自出逃')
  var distanceKm = Number(c.distanceKm) || 0

  // 1. 极端天气优先级最高 —— 阻断户外任务
  if (outdoor && isExtremeWeather(weather)) {
    return {
      title: '极端天气，建议暂停',
      content: '当前天气条件不适合户外出逃。可以等天气好转，或选择室内任务。',
      level: LEVEL.DANGER,
      action: 'pause'
    }
  }

  // 2. 深夜 + 户外 + 独自 —— 警示
  if (isLateNight(hour) && outdoor && !isGroup) {
    var lateContent = '深夜独自出逃请注意安全：选择照明良好的路段，'
    if (distanceKm > 1.5) {
      lateContent += '当前路线偏长（' + distanceKm + ' km），建议缩短至 1 km 以内。'
    } else {
      lateContent += '避免进入偏僻巷弄或公园深处。'
    }
    return {
      title: '深夜出逃安全提醒',
      content: lateContent,
      level: LEVEL.WARN,
      action: 'caution'
    }
  }

  // 3. 深夜 + 户外 + 同频 —— 轻警示（多人更安全）
  if (isLateNight(hour) && outdoor && isGroup) {
    return {
      title: '深夜同频出逃',
      content: '已和' + partners + '组队，请在公共场所活动，互相照应。如有人中途离开，记得告知其他成员。',
      level: LEVEL.WARN,
      action: 'caution'
    }
  }

  // 4. 夜晚（19-22）+ 独自 + 户外 —— 普通提示
  if (isNight(hour) && outdoor && !isGroup) {
    return {
      title: '夜色温柔，注意脚下',
      content: '选择熟悉或照明良好的路线。带上手机和钥匙，告诉朋友你的去向。',
      level: LEVEL.INFO,
      action: 'continue'
    }
  }

  // 5. 破圈模式 —— 提醒边界感
  if (cmdType === 'breakthrough') {
    return {
      title: '破圈但不出界',
      content: '挑战自己，但不要让自己陷入不适。任何时刻都可以选择中止。',
      level: LEVEL.INFO,
      action: 'continue'
    }
  }

  // 6. 同频出逃 —— 互评与照应
  if (isGroup) {
    return {
      title: '同频出逃小贴士',
      content: '公共场所见面，活动结束后可互评。如遇不适，可随时退出并举报。',
      level: LEVEL.INFO,
      action: 'continue'
    }
  }

  // 7. 默认 —— 一般出逃提示
  return {
    title: '出逃小贴士',
    content: '留意周遭，慢慢走，慢慢看。出逃是温柔的事，不一定要赶时间。',
    level: LEVEL.INFO,
    action: 'continue'
  }
}

// 任务阻断检查 —— 用于「是否应该暂停户外任务」决策
//   ctx: { hour, weather, outdoor }
//   返回: { blocked: boolean, reason: string }
function shouldPauseOutdoorTask(ctx) {
  var c = ctx && typeof ctx === 'object' ? ctx : {}
  var outdoor = c.outdoor !== false
  if (!outdoor) return { blocked: false, reason: '' }
  if (isExtremeWeather(c.weather)) {
    return {
      blocked: true,
      reason: '极端天气，户外任务已暂停，请等待天气好转或选择室内任务'
    }
  }
  return { blocked: false, reason: '' }
}

// 紧急退出提示文案 —— 「一键结束任务」按钮旁的辅助说明
function emergencyExitHint(ctx) {
  var c = ctx && typeof ctx === 'object' ? ctx : {}
  var isGroup = c.isGroup === true
  if (isGroup) {
    return {
      title: '紧急退出',
      hint: '退出将中止本次出逃，并通知同频成员。已完成的步骤会保留，下次可继续。',
      confirmText: '确认退出'
    }
  }
  return {
    title: '紧急退出',
    hint: '退出将中止本次出逃。已完成的步骤会保留，下次可继续。',
    confirmText: '确认退出'
  }
}

// 分享位置 payload —— 供 wx.openLocation / onShareAppMessage 使用
//   location: { latitude, longitude, name, address }（缺失时返回 null，调用方降级）
//   escapeName: 用户出逃代号（用于分享卡片标题）
//   返回: { ok, type: 'location'|'message', payload } 或 { ok:false }
function buildShareLocationPayload(location, escapeName) {
  if (!location || typeof location !== 'object') return { ok: false }
  if (typeof location.latitude !== 'number' || typeof location.longitude !== 'number') {
    return { ok: false }
  }
  var name = (typeof location.name === 'string' && location.name) ? location.name : '我的出逃位置'
  var address = (typeof location.address === 'string' && location.address)
    ? location.address
    : (escapeName ? escapeName + ' 在这里出逃' : '出逃指令 · 实时位置')
  return {
    ok: true,
    type: 'location',
    payload: {
      latitude: location.latitude,
      longitude: location.longitude,
      scale: 16,
      name: name,
      address: address
    }
  }
}

// 分享卡片 payload —— 当无定位时，回退到 onShareAppMessage 文本分享
function buildShareCardPayload(escapeName, commandTitle) {
  var title = escapeName
    ? (escapeName + ' 正在出逃：' + (commandTitle || '一段未知的城市微冒险'))
    : ('出逃指令 · ' + (commandTitle || '一段未知的城市微冒险'))
  return {
    ok: true,
    type: 'message',
    payload: {
      title: title,
      path: '/pages/index/index'
    }
  }
}

// 综合安全状态 —— 用于 executing 页 data.safety
//   一次返回提示卡 + 阻断状态 + 紧急退出文案，减少页面调用
function buildSafetyState(ctx) {
  var tip = getTip(ctx)
  var pause = shouldPauseOutdoorTask(ctx)
  var exit = emergencyExitHint(ctx)
  return {
    tip: tip,
    pause: pause,
    exit: exit,
    level: tip.level,
    action: tip.action
  }
}

module.exports = {
  LEVEL: LEVEL,
  getTip: getTip,
  shouldPauseOutdoorTask: shouldPauseOutdoorTask,
  emergencyExitHint: emergencyExitHint,
  buildShareLocationPayload: buildShareLocationPayload,
  buildShareCardPayload: buildShareCardPayload,
  buildSafetyState: buildSafetyState,
  _internal: {
    periodOfDay: periodOfDay,
    isExtremeWeather: isExtremeWeather,
    isNight: isNight,
    isLateNight: isLateNight
  }
}
