// v2 core constants: keep type, mood, badge and asset mapping in one place.
const TYPE_ALIASES = {
  sensory: 'sense',
  market: 'food',
  moment: 'collect',
  micro: 'walk'
}

// v4 场景插画：运行时由 AI 接口生成（见 utils/ai-image.js）。
// TYPE_META.scene 作为「AI 未启用 / 生成失败 / 首次加载」时的兜底占位图。
// 当 ai-image.isEnabled()=false 时，command-detail 会直接使用此路径。
const TYPE_META = {
  color: { name: '颜色探索', color: '#5B8FB9', icon: '/assets/icons/droplet.svg', pin: '/assets/icons/pin-color.svg', scene: '/assets/images/color-scene.webp' },
  walk: { name: '漫步发现', color: '#D98A5C', icon: '/assets/icons/footprints-coral.svg', pin: '/assets/icons/pin-walk.svg', scene: '/assets/images/walk-scene.webp' },
  sense: { name: '感官体验', color: '#9B7BB8', icon: '/assets/icons/sparkles.svg', pin: '/assets/icons/pin-sense.svg', scene: '/assets/images/sense-scene.webp' },
  collect: { name: '收藏拼贴', color: '#C9B037', icon: '/assets/icons/bookmark.svg', pin: '/assets/icons/pin-collect.svg', scene: '/assets/images/collect-scene.webp' },
  food: { name: '美食探索', color: '#A67C52', icon: '/assets/icons/coffee.svg', pin: '/assets/icons/pin-food.svg', scene: '/assets/images/food-scene.webp' },
  culture: { name: '如实文化', color: '#5CBF9E', icon: '/assets/icons/compass-brand.svg', pin: '/assets/icons/pin-culture.svg', scene: '/assets/images/culture-scene.webp' },
  custom: { name: '自定义', color: '#E07A5F', icon: '/assets/icons/pin-color.svg', pin: '/assets/icons/pin-color.svg', scene: '/assets/images/color-scene.webp' }
}

const MODE_LIST = [
  { id: 'smart', name: '智能匹配', icon: '/assets/icons/dice-5-brand-strong.svg', activeIcon: '/assets/icons/dice-5-white.svg', color: '#5CBF9E', heroScene: '/assets/images/color-scene.webp', desc: '算法懂你，随机推荐' },
  { id: 'micro', name: '微出逃', icon: '/assets/icons/sprout-brand-strong.svg', activeIcon: '/assets/icons/sprout-white.svg', color: '#7BAE7F', heroScene: '/assets/images/sense-scene.webp', desc: '碎片时间，快速出逃' },
  { id: 'walk', name: '城市漫游', icon: '/assets/icons/footprints-coral.svg', activeIcon: '/assets/icons/footprints-white.svg', color: '#D98A5C', heroScene: '/assets/images/walk-scene.webp', desc: '户外长线，深度探索' },
  { id: 'double', name: '双人出逃', icon: '/assets/icons/users-lavender.svg', activeIcon: '/assets/icons/users-white.svg', color: '#9B7BB8', heroScene: '/assets/images/sense-scene.webp', desc: '邀请朋友，一起冒险' },
  { id: 'night', name: '深夜出逃', icon: '/assets/icons/moon-gray.svg', activeIcon: '/assets/icons/moon-white.svg', color: '#9B8EC4', heroScene: '/assets/images/sense-scene.webp', desc: '夜色独白，安静漫步' },
  { id: 'rainy', name: '雨天出逃', icon: '/assets/icons/cloud-rain-sky-fg.svg', activeIcon: '/assets/icons/cloud-rain-white.svg', color: '#7EC8F5', heroScene: '/assets/images/sense-scene.webp', desc: '雨中漫步，室内寻觅' }
]

// v3.1: 模式选择 Sheet 仅展示 3 个（智能 / 微 / 漫游）；双人/深夜/雨天 留作加权状态
const SHEET_MODES = [
  { id: 'smart', name: '智能匹配', icon: '/assets/icons/dice-5-brand-strong.svg', color: '#5CBF9E', desc: '算法懂你，随机推荐' },
  { id: 'micro', name: '微出逃',   icon: '/assets/icons/sprout-brand-strong.svg',  color: '#7BAE7F', desc: '碎片时间，快速出逃' },
  { id: 'walk',  name: '城市漫游', icon: '/assets/icons/footprints-coral.svg',    color: '#D98A5C', desc: '户外长线，深度探索' }
]

const FILTERS = [
  { id: 'day', name: '日光', tint: '#FFF7DE', fg: '#B98A1E', icon: '/assets/icons/sun-lemon-fg.svg' },
  { id: 'rain', name: '阴雨天', tint: '#EAF4FF', fg: '#5B8FB9', icon: '/assets/icons/cloud-rain-sky-fg.svg' },
  { id: 'flash', name: '闪光灯', tint: '#FFF0E6', fg: '#D98A5C', icon: '/assets/icons/zap-coral.svg' }
]

const MOODS = [
  { id: 'happy', name: '开心', weightType: 'walk', tint: '#FFF7DE', fg: '#E0A92E', icon: '/assets/icons/smile-lemon.svg' },
  { id: 'calm', name: '平静', weightType: 'sense', tint: '#E5F5EF', fg: '#5CBF9E', icon: '/assets/icons/meh-brand.svg' },
  { id: 'surprise', name: '惊喜', weightType: 'color', tint: '#FFF0E6', fg: '#D98A5C', icon: '/assets/icons/sparkles-coral.svg' },
  { id: 'heal', name: '治愈', weightType: 'collect', tint: '#F4EDFF', fg: '#9B7BB8', icon: '/assets/icons/heart-lavender.svg' },
  { id: 'fun', name: '好玩', weightType: 'food', tint: '#EAF4FF', fg: '#5B8FB9', icon: '/assets/icons/laugh-sky.svg' }
]

const BADGES = [
  { id: 'first_escape', name: '初次出逃', desc: '完成了第一次出逃', icon: '/assets/icons/badge-first-escape.svg', gradient: 'linear-gradient(135deg, #FFE4B5, #FFD700)', color: '#D4A017' },
  { id: 'seven_streak', name: '七连胜', desc: '连续 7 天完成出逃', icon: '/assets/icons/badge-seven-streak.svg', gradient: 'linear-gradient(135deg, #C9E8E3, #5CBF9E)', color: '#3A8C6F' },
  { id: 'thirty_streak', name: '月度漫游家', desc: '连续 30 天完成出逃', icon: '/assets/icons/badge-thirty-streak.svg', gradient: 'linear-gradient(135deg, #E8D5F5, #9B7BB8)', color: '#6B4F8A' },
  { id: 'color_hunter', name: '蓝色猎人', desc: '完成 10 次颜色探索指令', icon: '/assets/icons/badge-color-hunter.svg', gradient: 'linear-gradient(135deg, #D4E8FF, #5B8FB9)', color: '#3A6D96' },
  { id: 'night_walker', name: '夜行者', desc: '深夜完成 5 次出逃', icon: '/assets/icons/badge-night-walker.svg', gradient: 'linear-gradient(135deg, #E2E4F0, #6B7280)', color: '#4A5060' },
  { id: 'rainy_walker', name: '雨天漫步者', desc: '雨天完成 3 次出逃', icon: '/assets/icons/badge-rainy-walker.svg', gradient: 'linear-gradient(135deg, #D4EDFF, #7EC8F5)', color: '#3A8AB5' },
  { id: 'market_regular', name: '菜市场熟客', desc: '完成 5 次市井美食相关指令', icon: '/assets/icons/badge-market-regular.svg', gradient: 'linear-gradient(135deg, #FFE8D6, #D98A5C)', color: '#A8603A' },
  { id: 'city_detective', name: '城市侦探', desc: '探索过 50 个不同角落', icon: '/assets/icons/badge-city-detective.svg', gradient: 'linear-gradient(135deg, #FFF0D4, #C9B037)', color: '#8A7620' },
  { id: 'member_pro', name: '出逃会员', desc: '会员功能暂不展示', icon: '/assets/icons/badge-member-pro.svg', gradient: 'linear-gradient(135deg, #2E2F33, #1A1B1E)', color: '#C9B037' }
]

const DEFAULT_STEPS = ['走出家门，深呼吸一次', '找到今天的目标线索', '拍下一个具体发现', '写下一句话感受']

// v2 fix: 每种类型一组差异化引导步骤，避免所有指令千篇一律。
// 当 cmd 自带 steps 时仍优先使用 cmd.steps；以下仅作为该类型的默认兜底。
const TYPE_STEPS = {
  color: ['带上眼睛出门', '找到今天定下的那个颜色', '把它拍下来，凑近一点', '写一句它给你的感觉'],
  walk: ['选一个方向开始走', '遇到岔路就凭直觉选', '走够 10 分钟再停下', '拍下停下来的地方'],
  sense: ['找一个能坐下的角落', '闭上眼睛 30 秒', '记下你听到的 3 种声音', '给这段安静写一句话'],
  collect: ['带一个小袋子出门', '捡起第一眼吸引你的小物', '找个地方把它摆好', '拍下这张小小收藏'],
  food: ['走进一家没去过的店', '点一份今天想吃的', '慢慢吃完，不要刷手机', '记下这家店的味道'],
  culture: ['找一个文化场所的入口', '走进去，挑一件展品多看一会', '拍下它的细节', '写一句它让你想到的事']
}

function normalizeType(type) {
  return TYPE_ALIASES[type] || type || 'walk'
}

function getTypeMeta(type) {
  return TYPE_META[normalizeType(type)] || TYPE_META.walk
}

module.exports = { TYPE_ALIASES, TYPE_META, MODE_LIST, SHEET_MODES, FILTERS, MOODS, BADGES, DEFAULT_STEPS, TYPE_STEPS, normalizeType, getTypeMeta }
