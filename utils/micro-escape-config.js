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
  // 工具函数
  getDistrict: getDistrict,
  getLocationByDistrict: getLocationByDistrict,
  getCategoryInfo: getCategoryInfo,
  getLoadingPhrase: getLoadingPhrase
}
