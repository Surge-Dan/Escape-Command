// utils/trust-score.js
// C-P4 社交增强 · 信任分纯函数计算
//
// 职责：
//   - 基于玩家收到的评价数组计算信任分
//   - 输出 5 tier 分级（newbie/gold/reliable/normal/watch）
//   - 供 player-matcher 排序加权 + UI 标签展示使用
//
// 纯函数（零 wx 依赖，可 Node 直接 require 测试）：
//   computeTrustScore / tierFromScore / isValidReview
//
// 风格对齐 player-matcher.js / mock-user-pool.js：
//   var + function 声明，防御性校验

'use strict'

// ===== 常量 =====

/**
 * 信任 tier 对应的匹配权重（player-matcher rankByRelevance 用）
 * - gold: 1.2（加权，金牌搭子优先匹配）
 * - reliable: 1.0（靠谱，基准）
 * - normal: 1.0（普通，基准）
 * - newbie: 0.8（新手善意降权，但不歧视）
 * - watch: 0.3（待观察，降级到队尾不过滤）
 */
var TRUST_TIER_WEIGHT = {
  gold: 1.2,
  reliable: 1.0,
  normal: 1.0,
  newbie: 0.8,
  watch: 0.3
}

// 默认信任分（无评价时）
var DEFAULT_TRUST = {
  score: 5.0,
  count: 0,
  label: '新手',
  tier: 'newbie'
}

// tier → label 映射（供反查）
var TIER_LABELS = {
  newbie: '新手',
  gold: '金牌搭子',
  reliable: '靠谱',
  normal: '普通',
  watch: '待观察'
}

// ===== 纯函数 =====

/**
 * 校验单条评价是否合法（rating 是 1-5 整数）
 * @param {object} review - { rating, comment?, tags? }
 * @returns {boolean}
 */
function isValidReview(review) {
  if (!review || typeof review !== 'object') return false
  var rating = review.rating
  return typeof rating === 'number' && Number.isInteger(rating) && rating >= 1 && rating <= 5
}

/**
 * 基于评价数组计算信任分
 *
 * 分级规则（tier 用于 player-matcher 权重）：
 *   count < 3                      → newbie  (新手)
 *   count >= 3 && avg >= 4.8 && count >= 10 → gold    (金牌搭子)
 *   count >= 3 && avg >= 4.5        → reliable (靠谱)
 *   count >= 3 && avg >= 3.0 && avg < 4.5 → normal  (普通)
 *   count >= 3 && avg < 3.0        → watch   (待观察)
 *
 * @param {Array} reviews - 评价数组，每项 { rating: 1-5 整数, ... }
 * @returns {{score: number, count: number, label: string, tier: string}}
 *   score 保留 1 位小数；count 为合法评价数；tier 见 TRUST_TIER_WEIGHT
 */
function computeTrustScore(reviews) {
  // 防御：非数组或空数组 → 默认新手
  if (!Array.isArray(reviews) || reviews.length === 0) {
    return {
      score: DEFAULT_TRUST.score,
      count: 0,
      label: DEFAULT_TRUST.label,
      tier: DEFAULT_TRUST.tier
    }
  }

  // 只统计合法评价（rating 1-5 整数），非法 rating 按 5 处理（善意）
  var count = reviews.length
  var sum = 0
  for (var i = 0; i < reviews.length; i++) {
    var r = reviews[i]
    if (isValidReview(r)) {
      sum += r.rating
    } else {
      sum += 5 // 非法 rating 按满分 5 处理（不拉低分数）
    }
  }
  var avg = sum / count

  // 分级（tier 用于 player-matcher 权重）
  var label = TIER_LABELS.normal
  var tier = 'normal'
  if (count < 3) {
    label = TIER_LABELS.newbie
    tier = 'newbie'
  } else if (avg >= 4.8 && count >= 10) {
    label = TIER_LABELS.gold
    tier = 'gold'
  } else if (avg >= 4.5) {
    label = TIER_LABELS.reliable
    tier = 'reliable'
  } else if (avg < 3.0) {
    label = TIER_LABELS.watch
    tier = 'watch'
  }
  // else 保持 normal

  return {
    score: Math.round(avg * 10) / 10,
    count: count,
    label: label,
    tier: tier
  }
}

/**
 * 根据 score + count 反查 tier（用于无评价详情、只知分数的场景）
 * 与 computeTrustScore 分级规则一致
 * @param {number} score - 平均分
 * @param {number} count - 评价数
 * @returns {string} tier
 */
function tierFromScore(score, count) {
  if (typeof count !== 'number' || !isFinite(count) || count < 0) {
    count = 0
  }
  if (typeof score !== 'number' || !isFinite(score)) {
    score = 5.0
  }
  if (count < 3) return 'newbie'
  if (score >= 4.8 && count >= 10) return 'gold'
  if (score >= 4.5) return 'reliable'
  if (score < 3.0) return 'watch'
  return 'normal'
}

/**
 * 获取 tier 对应的匹配权重
 * @param {string} tier
 * @returns {number} 权重值，未知 tier 返回 1.0（normal 基准）
 */
function getTierWeight(tier) {
  if (typeof tier !== 'string' || !TRUST_TIER_WEIGHT.hasOwnProperty(tier)) {
    return TRUST_TIER_WEIGHT.normal
  }
  return TRUST_TIER_WEIGHT[tier]
}

/**
 * 获取 tier 对应的展示标签
 * @param {string} tier
 * @returns {string} 标签，未知 tier 返回 '普通'
 */
function getTierLabel(tier) {
  if (typeof tier !== 'string' || !TIER_LABELS.hasOwnProperty(tier)) {
    return TIER_LABELS.normal
  }
  return TIER_LABELS[tier]
}

module.exports = {
  // 常量
  TRUST_TIER_WEIGHT: TRUST_TIER_WEIGHT,
  DEFAULT_TRUST: DEFAULT_TRUST,
  TIER_LABELS: TIER_LABELS,
  // 纯函数
  computeTrustScore: computeTrustScore,
  tierFromScore: tierFromScore,
  getTierWeight: getTierWeight,
  getTierLabel: getTierLabel,
  isValidReview: isValidReview
}
