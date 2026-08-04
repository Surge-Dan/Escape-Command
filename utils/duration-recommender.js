// home-dice-entry-01: 微出逃时长推荐器
// 根据历史 micro 模式记录推荐时长档位（10/20/30/60 分钟）
// 入参 records 结构参考 app.js completeCommand 生成的 record（含 mode/duration/id 等字段）

const TIERS = [10, 20, 30, 60]
const DEFAULT_TIER = 15  // 兜底值（无历史时不展示推荐，但保留给调用方兜底用）
const MIN_SAMPLES = 3
const RECENT_LIMIT = 10

/**
 * 从 record.id 中提取时间戳用于排序
 * id 格式: 'r_' + Date.now()
 * @param {string} id
 * @returns {number}
 */
function extractTimestamp(id) {
  if (typeof id !== 'string') return 0
  const ts = Number(id.replace(/^r_/, ''))
  return Number.isFinite(ts) ? ts : 0
}

/**
 * 计算中位数
 * 奇数个取中间一项，偶数个取中间两项的平均
 * @param {number[]} values 已升序排序的数组
 * @returns {number}
 */
function median(values) {
  const n = values.length
  if (n === 0) return 0
  const mid = Math.floor(n / 2)
  if (n % 2 === 1) return values[mid]
  return (values[mid - 1] + values[mid]) / 2
}

/**
 * 将中位数匹配到最近的档位
 * 采用「绝对差最小」原则，区间按 [a, b) 划分以消除边界歧义：
 *   median < 15        → 10
 *   15 ≤ median < 25   → 20
 *   25 ≤ median < 45   → 30
 *   median ≥ 45        → 60
 * @param {number} m
 * @returns {number}
 */
function matchTier(m) {
  if (m < 15) return 10
  if (m < 25) return 20
  if (m < 45) return 30
  return 60
}

/**
 * 根据 micro 模式历史记录推荐时长
 * 1. 过滤 mode==='micro' 的记录
 * 2. 按 record.id 倒序取最近 10 条
 * 3. 计算 duration 中位数
 * 4. 匹配到最近档位（10/20/30/60）
 * 5. micro 记录 < 3 条 / records 为空 → 返回默认档位 15，isRecommended=false
 * @param {Array<{mode?:string, duration?:number, id?:string}>} records
 * @returns {{duration:number, isRecommended:boolean}}
 */
function recommendDuration(records) {
  if (!Array.isArray(records) || records.length === 0) {
    return { duration: DEFAULT_TIER, isRecommended: false }
  }

  const microRecords = records.filter(r => r && r.mode === 'micro')
  if (microRecords.length < MIN_SAMPLES) {
    return { duration: DEFAULT_TIER, isRecommended: false }
  }

  // 按 id 倒序（id='r_'+Date.now()，越大越新）取最近 RECENT_LIMIT 条
  const sorted = microRecords
    .slice()
    .sort((a, b) => extractTimestamp(b.id) - extractTimestamp(a.id))
    .slice(0, RECENT_LIMIT)

  const durations = sorted
    .map(r => Number(r.duration))
    .filter(d => Number.isFinite(d))
    .sort((a, b) => a - b)

  if (durations.length === 0) {
    return { duration: DEFAULT_TIER, isRecommended: false }
  }

  const med = median(durations)
  return { duration: matchTier(med), isRecommended: true }
}

module.exports = {
  recommendDuration,
  extractTimestamp,
  median,
  matchTier,
  TIERS,
  DEFAULT_TIER,
  MIN_SAMPLES,
  RECENT_LIMIT
}
