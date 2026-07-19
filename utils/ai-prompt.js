// utils/ai-prompt.js
// 动态拼装 AI 生图 prompt（按指令字段 + 类型 + 天气/时间）
// 与 docs/ICON-PROMPTS.md 的 L 类场景插画对齐

const TYPE_SCENE_BASE = {
  color: 'a person standing at a street corner looking up at a colorful mural on a building wall, blue tones dominant with orange and yellow accents',
  walk: 'a quiet tree-lined street with sycamore trees and a person walking leisurely in the distance, warm afternoon light filtering through leaves creating dappled shadows',
  sense: 'a person sitting on a park bench under a large tree with eyes closed in contemplation, warm purple and lavender tones with soft pink accents',
  collect: 'a small collection of found objects arranged on a wooden surface - a pretty leaf, a smooth stone, a small flower, a feather, golden and yellow tones with brown accents',
  food: 'a small cozy cafe interior with steam rising from a coffee cup on a wooden table and a plate of simple food nearby, warm brown and orange tones with cream accents',
  culture: 'a person standing in front of an old cultural building or museum entrance looking up at the facade, mint green and warm beige tones with gold accents'
}

// 通用风格底
const STYLE_BASE = 'Warm hand-drawn illustration, paper texture, soft brush strokes, cozy and healing atmosphere, rich details, layered composition, editorial quality, no text, no UI elements, no neon glow, no geometric perfection, hand-crafted feel, warm and inviting mood, 3:2 aspect ratio'

// 天气修饰
const WEATHER_MOD = {
  sunny: 'warm afternoon sunlight casting dappled shadows',
  cloudy: 'soft overcast light with gentle gray tones',
  rainy: 'gentle rain with small puddles reflecting light, soft misty atmosphere',
  snowy: 'quiet snow scene with soft white accumulation, warm window light glowing from buildings',
  foggy: 'soft morning fog creating layered depth, mysterious and quiet',
  night: 'evening with warm street lights glowing, deep blue sky with soft moonlight'
}

// 时间修饰
const TIME_MOD = {
  morning: 'early morning soft light, fresh atmosphere',
  noon: 'bright midday light with clear shadows',
  afternoon: 'warm golden afternoon light',
  evening: 'sunset with orange and pink sky tones',
  night: 'night scene with warm window lights and deep blue sky'
}

/**
 * 按指令字段拼装场景插画 prompt
 * @param {Object} cmd 指令对象，至少包含 type、title、content
 * @param {Object} ctx 上下文：{ weather, hour }
 * @returns {String} 完整 prompt
 */
function buildScenePrompt(cmd, ctx) {
  ctx = ctx || {}
  const type = cmd && cmd.type ? cmd.type : 'walk'
  const base = TYPE_SCENE_BASE[type] || TYPE_SCENE_BASE.walk

  // 指令特化描述：用 title/content 简化提取关键词
  let spec = ''
  if (cmd && cmd.title) {
    // 简单清洗：去掉特殊符号，取前 20 字
    const cleaned = String(cmd.title).replace(/[^\u4e00-\u9fa5a-zA-Z0-9\s]/g, ' ').trim().slice(0, 30)
    if (cleaned) {
      spec = `, themed around: ${cleaned}`
    }
  }

  // 天气/时间修饰
  const weatherKey = ctx.weather && ctx.weather.condition ? ctx.weather.condition : ''
  const weatherMod = WEATHER_MOD[weatherKey] || ''
  const hour = ctx.hour != null ? ctx.hour : (new Date().getHours())
  let timeKey = 'afternoon'
  if (hour >= 5 && hour < 11) timeKey = 'morning'
  else if (hour >= 11 && hour < 14) timeKey = 'noon'
  else if (hour >= 14 && hour < 18) timeKey = 'afternoon'
  else if (hour >= 18 && hour < 21) timeKey = 'evening'
  else timeKey = 'night'
  const timeMod = TIME_MOD[timeKey] || ''

  return `${base}${spec}, ${weatherMod}, ${timeMod}, ${STYLE_BASE}`
}

/**
 * 生成默认头像 prompt（保留固定，不动态生成）
 */
function buildAvatarPrompt() {
  return 'Warm hand-drawn illustration of a simple friendly avatar - a person with round face, soft smile, simple hair, warm mint and cream color palette, paper texture, soft brush strokes, cozy and inviting mood, 200x200, no text'
}

module.exports = {
  buildScenePrompt,
  buildAvatarPrompt,
  TYPE_SCENE_BASE,
  STYLE_BASE,
  WEATHER_MOD,
  TIME_MOD
}
