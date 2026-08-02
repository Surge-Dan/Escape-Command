// utils/micro-escape-config.js
// 微逃骰子（7 维度版）专属配置：6 区虚拟坐标 + 分类映射 + 枚举常量 + 工具函数
// 纯前端本地数据，不依赖后端 / 云函数
// 风格对齐团队 utils/generator-engine.js：'use strict' + var + function 声明
'use strict'

// ============ 枚举常量 ============

// 心情（字符串枚举）
var Mood = {
  BORED: 'bored',
  TIRED: 'tired',
  LIVELY: 'lively',
  QUIET: 'quiet',
  CURIOUS: 'curious',
  MELANCHOLY: 'melancholy',
  HAPPY: 'happy',
  RESTLESS: 'restless'
}

// 时长（数字枚举，单位：分钟）
var Duration = {
  MIN_20: 20,
  HOUR_1: 60,
  HALF_DAY: 180,
  FULL_DAY: 480
}

// 预算（数字枚举，单位：元）
var Budget = {
  FREE: 0,
  UNDER_50: 50,
  UNDER_100: 100,
  UNDER_200: 200
}

// 距离（字符串枚举）
var Distance = {
  DOWNSTAIRS: 'downstairs',
  NEARBY: 'nearby',
  KM_3: '3km',
  CITY: 'city'
}

// 能量（字符串枚举）
var Energy = {
  GENTLE: 'gentle',
  NORMAL: 'normal',
  BOLD: 'bold'
}

// 人数（数字枚举）
var PartySize = {
  SOLO: 1,
  DUO: 2,
  GROUP: 3
}

// 室内外（字符串枚举）
var VenueType = {
  INDOOR: 'indoor',
  OUTDOOR: 'outdoor',
  ANY: 'any'
}

// 骰子类型
var DiceType = {
  MICRO: 'micro'
}

// ============ 业务常量 ============

var DEFAULT_CITY = '广州'
var MAX_REROLL_COUNT = 3

// 广州 6 区虚拟坐标（不依赖真实用户定位，按区域筛选 POI）
var DISTRICTS = [
  { key: 'liwan',   name: '荔湾区', anchor: '陈家祠',   latitude: 23.1400, longitude: 113.2470 },
  { key: 'yuexiu',  name: '越秀区', anchor: '北京路',   latitude: 23.1308, longitude: 113.2644 },
  { key: 'haizhu',  name: '海珠区', anchor: '江南西',   latitude: 23.0890, longitude: 113.2700 },
  { key: 'tianhe',  name: '天河区', anchor: '体育西',   latitude: 23.1341, longitude: 113.3242 },
  { key: 'baiyun',  name: '白云区', anchor: '白云公园', latitude: 23.1834, longitude: 113.2689 },
  { key: 'panyu',   name: '番禺区', anchor: '市桥',     latitude: 23.0034, longitude: 113.3489 }
]

// 分类 → 中文标签 + 颜色映射（与微逃骰子指令池 category 字段对齐）
// 风格对齐团队 utils/constants.js 的 TYPE_META
var CATEGORY_MAP = {
  sensory:  { label: '感官体验', color: '#d4a574', soft: 'rgba(212,165,116,0.15)' },
  walking:  { label: '城市漫游', color: '#7eb8a2', soft: 'rgba(126,184,162,0.15)' },
  culture:  { label: '文化探索', color: '#b5a8d8', soft: 'rgba(181,168,216,0.15)' },
  food:     { label: '美食探索', color: '#e8854a', soft: 'rgba(232,133,74,0.15)' },
  nature:   { label: '自然公园', color: '#9bd0ba', soft: 'rgba(155,208,186,0.15)' },
  night:    { label: '夜间活动', color: '#7b8ec4', soft: 'rgba(123,142,196,0.15)' },
  observe:  { label: '街角观察', color: '#a8a8a8', soft: 'rgba(168,168,168,0.15)' },
  transit:  { label: '公共交通', color: '#6bb8c4', soft: 'rgba(107,184,196,0.15)' },
  social:   { label: '微社交',   color: '#d89bc4', soft: 'rgba(216,155,196,0.15)' },
  seasonal: { label: '季节限定', color: '#e8b864', soft: 'rgba(232,184,100,0.15)' }
}

// 加载态文案池（结果页 / 摇骰子过程中轮播展示）
var LOADING_PHRASES = [
  '正在替你打开一个出口……',
  '正在收集城市的低语……',
  '正在避开所有熟悉的路……',
  '正在和陌生人交换一个眼神……',
  '正在摸一摸不同的树皮……',
  '正在数 5 种颜色……',
  '正在听 3 分钟城市的声音……',
  '正在左转左转再左转……'
]

// ============ 本地指令池（微逃骰子专属，单一数据源）============
// 由 dice-micro-7d（入口页）与 dice-result-7d（结果页重摇）共用，避免重复定义

var LOCAL_SCRIPTS = [
  {
    id: 'ms7d_001', category: 'sensory', title: '闭眼听三分钟',
    reason: '给耳朵放个假，城市的声音比想象中丰富',
    destination: { description: '最近的公园长椅或路边长椅' },
    stageOne: { instruction: '找到长椅坐下，闭眼听 3 分钟，记下 5 种声音' },
    hidden: { instruction: '把听到的声音画成一张"声音地图"' },
    completionCondition: '记录下至少 5 种不同声音',
    safetyNotes: ['注意随身物品'],
    difficulty: 1, estimatedDuration: 10, estimatedBudget: 0, distance: 'nearby'
  },
  {
    id: 'ms7d_002', category: 'walking', title: '左转左转再左转',
    reason: '用规则打破惯性，迷路是最好的向导',
    destination: { description: '任意路口' },
    stageOne: { instruction: '出门左转，每个路口都左转，走 15 分钟' },
    hidden: { instruction: '拍下你停下来的那个瞬间' },
    completionCondition: '走够 15 分钟并拍一张照片',
    safetyNotes: ['注意交通安全'],
    difficulty: 1, estimatedDuration: 15, estimatedBudget: 0, distance: 'nearby'
  },
  {
    id: 'ms7d_003', category: 'food', title: '让老板给你挑',
    reason: '把选择权交出去，会有惊喜',
    destination: { description: '最近的水果店或小吃店' },
    stageOne: { instruction: '走进去跟老板说"给我挑一个最好吃的"' },
    hidden: { instruction: '问老板今天什么卖得最好' },
    completionCondition: '买到并尝一口',
    safetyNotes: [],
    difficulty: 1, estimatedDuration: 15, estimatedBudget: 20, distance: 'downstairs'
  },
  {
    id: 'ms7d_004', category: 'observe', title: '数 5 种颜色',
    reason: '放慢脚步，颜色就在身边',
    destination: { description: '任意街道' },
    stageOne: { instruction: '走 10 分钟，找到 5 种不同颜色的东西' },
    hidden: { instruction: '把 5 种颜色按彩虹顺序排好' },
    completionCondition: '拍一张包含 5 种颜色的照片',
    safetyNotes: [],
    difficulty: 1, estimatedDuration: 15, estimatedBudget: 0, distance: 'nearby'
  },
  {
    id: 'ms7d_005', category: 'nature', title: '摸 3 种树皮',
    reason: '用手感受城市的另一面',
    destination: { description: '最近的公园或绿化带' },
    stageOne: { instruction: '找到 3 棵不同的树，闭眼摸树皮 30 秒' },
    hidden: { instruction: '给每棵树起一个名字' },
    completionCondition: '摸够 3 种树皮',
    safetyNotes: ['注意不要摸到带刺植物'],
    difficulty: 1, estimatedDuration: 20, estimatedBudget: 0, distance: '3km'
  },
  {
    id: 'ms7d_006', category: 'culture', title: '逛一家从没进过的店',
    reason: '打破日常路线，发现身边的可能',
    destination: { description: '路边任意你没进过的店' },
    stageOne: { instruction: '走进去逛 5 分钟，不一定要买' },
    hidden: { instruction: '问店主一个问题' },
    completionCondition: '逛完 5 分钟',
    safetyNotes: [],
    difficulty: 1, estimatedDuration: 15, estimatedBudget: 0, distance: 'downstairs'
  },
  {
    id: 'ms7d_007', category: 'night', title: '深夜便利店观察',
    reason: '深夜的便利店是城市的缩影',
    destination: { description: '最近的便利店' },
    stageOne: { instruction: '进去观察 10 分钟，看都有什么人' },
    hidden: { instruction: '买一样你从没买过的东西' },
    completionCondition: '观察 10 分钟',
    safetyNotes: ['注意夜间安全'],
    difficulty: 1, estimatedDuration: 15, estimatedBudget: 10, distance: 'downstairs'
  },
  {
    id: 'ms7d_008', category: 'social', title: '对陌生人微笑',
    reason: '一个小小的连接，可能改变一天',
    destination: { description: '人不太多的街道' },
    stageOne: { instruction: '对路过的人微笑点头，试 3 次' },
    hidden: { instruction: '如果有人回应，说一句"今天真好"' },
    completionCondition: '完成 3 次微笑',
    safetyNotes: ['不要打扰赶路的人'],
    difficulty: 2, estimatedDuration: 10, estimatedBudget: 0, distance: 'downstairs'
  }
]

// ============ 工具函数 ============

// 根据 district key 获取区域信息
function getDistrict(key) {
  for (var i = 0; i < DISTRICTS.length; i++) {
    if (DISTRICTS[i].key === key) return DISTRICTS[i]
  }
  // 默认返回天河区
  return DISTRICTS[3]
}

// 根据 district key 获取虚拟坐标 { latitude, longitude }
function getLocationByDistrict(key) {
  var d = getDistrict(key)
  return { latitude: d.latitude, longitude: d.longitude }
}

// 根据 category key 获取分类信息 { label, color, soft }
function getCategoryInfo(cat) {
  var info = CATEGORY_MAP[cat]
  if (!info) {
    // 默认返回 sensory 分类
    return CATEGORY_MAP.sensory
  }
  return info
}

// 随机获取一条加载态文案
function getLoadingPhrase() {
  var idx = Math.floor(Math.random() * LOADING_PHRASES.length)
  return LOADING_PHRASES[idx]
}

// 本地生成微逃指令（不依赖后端）
// 入口页(onRoll)与结果页(重摇)共用，保证筛选规则一致
// params: { budget, distance, district, ... }
function generateLocalScript(params) {
  params = params || {}
  var pool = LOCAL_SCRIPTS
  // 按预算筛选：免费档只保留 estimatedBudget === 0
  if (Number(params.budget) === 0) {
    pool = pool.filter(function (s) { return s.estimatedBudget === 0 })
  }
  // 按距离筛选：楼下档只保留 distance === 'downstairs'
  if (params.distance === Distance.DOWNSTAIRS) {
    pool = pool.filter(function (s) { return s.distance === 'downstairs' })
  }
  // 兜底：筛空则用全量池
  if (pool.length === 0) pool = LOCAL_SCRIPTS
  // 随机选一个并深拷贝，避免污染源数据
  var script = JSON.parse(JSON.stringify(pool[Math.floor(Math.random() * pool.length)]))
  // 注入 POI 信息（从 6 区虚拟坐标）
  var loc = getLocationByDistrict(params.district)
  script.poi = {
    name: script.destination.description,
    lat: loc.latitude,
    lng: loc.longitude
  }
  return script
}

// 将微逃 script 转换为执行页(executing)能消费的 currentCommand 结构
// executing.onLoad 读 app.globalData.currentCommand，需含 type/mode/steps/duration/typeColor 等
function buildExecutableCommand(script) {
  if (!script) return null
  var cat = script.category || 'sensory'
  var info = getCategoryInfo(cat)
  var steps = []
  if (script.stageOne && script.stageOne.instruction) {
    steps.push({ text: script.stageOne.instruction, details: '出发' })
  }
  if (script.hidden && script.hidden.instruction) {
    steps.push({ text: script.hidden.instruction, details: '隐藏任务' })
  }
  if (script.completionCondition) {
    steps.push({ text: script.completionCondition, details: '完成条件' })
  }
  // 兜底补齐到至少 1 步（executing 用 DEFAULT_STEPS 兜底，但显式给更稳）
  if (steps.length === 0) {
    steps.push({ text: '完成这次微出逃', details: '慢慢来' })
  }
  // 收尾留痕步（executing 最多取 4 步，控制在 4 步内）
  if (steps.length < 4) {
    steps.push({ text: '记录此刻的感受，给这次出逃留个记号', details: '收尾' })
  }
  return {
    type: 'micro',
    mode: 'micro',
    title: script.title || '微出逃',
    reason: script.reason || '',
    category: cat,
    steps: steps,
    duration: script.estimatedDuration || 20,
    typeColor: info.color,
    poi: script.poi || null,
    difficulty: script.difficulty || 1,
    estimatedBudget: script.estimatedBudget || 0,
    distance: script.distance || 'nearby',
    safetyNotes: Array.isArray(script.safetyNotes) ? script.safetyNotes : [],
    source: 'microdice'
  }
}

// ============ 导出 ============

module.exports = {
  // 枚举
  Mood: Mood,
  Duration: Duration,
  Budget: Budget,
  Distance: Distance,
  Energy: Energy,
  PartySize: PartySize,
  VenueType: VenueType,
  DiceType: DiceType,
  // 常量
  DEFAULT_CITY: DEFAULT_CITY,
  MAX_REROLL_COUNT: MAX_REROLL_COUNT,
  DISTRICTS: DISTRICTS,
  CATEGORY_MAP: CATEGORY_MAP,
  LOADING_PHRASES: LOADING_PHRASES,
  LOCAL_SCRIPTS: LOCAL_SCRIPTS,
  // 工具函数
  getDistrict: getDistrict,
  getLocationByDistrict: getLocationByDistrict,
  getCategoryInfo: getCategoryInfo,
  getLoadingPhrase: getLoadingPhrase,
  generateLocalScript: generateLocalScript,
  buildExecutableCommand: buildExecutableCommand
}
