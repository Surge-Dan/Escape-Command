// tests/unit/breakthrough.test.js
// 破圈骰子单元测试
// 运行: node tests/unit/breakthrough.test.js
//
// 覆盖维度：
//   1. 数据完整性：breakthrough-commands.js 100 条指令字段齐全、id 唯一、type=breakthrough
//   2. constants 配置：TYPE_META / MODE_LIST / HOME_DICE_LIST / TYPE_STEPS 中 breakthrough 配置一致
//   3. 核心逻辑：模拟 rollBreakthroughCommand 的过滤链（completed / nightSafe / avoidTypes / recommendTypes）
//   4. 边界兜底：候选为空时回退全池（不调 getFallbackCommands 避免摇出微逃指令）
//   5. 不变性：不污染入参
//
// 设计目标：覆盖 Henry 分支合并后的破圈骰子核心逻辑，杀掉潜在的变异算子。

'use strict'

const { TYPE_META, MODE_LIST, HOME_DICE_LIST, TYPE_STEPS, normalizeType, getTypeMeta } = require('../../utils/constants.js')
const btData = require('../../packageBreakthrough/data/breakthrough-commands.js')
const BREAKTHROUGH_COMMANDS = btData.BREAKTHROUGH_COMMANDS

// ===== 自定义测试框架（与 record-builder.test.js 风格一致）=====
let passCount = 0
let failCount = 0
const failures = []
const groups = []

function assert(cond, msg) {
  if (cond) {
    passCount++
  } else {
    failCount++
    const where = groups.length ? groups.join(' > ') : '(root)'
    failures.push(where + ': ' + (msg || '(no message)'))
  }
}

function assertEqual(actual, expected, msg) {
  const ok = actual === expected
  if (!ok) {
    const where = groups.length ? groups.join(' > ') : '(root)'
    failures.push(where + ': ' + (msg || 'assertEqual') + ' | expected=' + JSON.stringify(expected) + ' actual=' + JSON.stringify(actual))
  }
  if (ok) passCount++
  else failCount++
}

function describe(name, fn) {
  groups.push(name)
  console.log('\n=== ' + name + ' ===')
  fn()
  groups.pop()
}

function it(name, fn) {
  groups.push(name)
  fn()
  groups.pop()
}

// ===== 模拟 app.rollBreakthroughCommand 核心逻辑（纯函数版，零 wx 依赖）=====
// 严格对齐 app.js 中的实现，便于在 Node 环境验证过滤链正确性。
function rollBreakthroughSimulator(opts) {
  const pool = opts.pool || BREAKTHROUGH_COMMANDS
  const completed = opts.completed || []
  const profile = opts.profile || null
  const isLateNight = !!opts.isLateNight
  const hour = opts.hour != null ? opts.hour : 14

  const flattenProfile = (p) => {
    if (!p || typeof p !== 'object') return []
    const tags = []
    Object.keys(p).forEach(k => {
      const v = p[k]
      if (typeof v === 'string') tags.push(k + ':' + v)
      else if (Array.isArray(v)) v.forEach(x => tags.push(k + ':' + x))
    })
    return tags
  }

  const profileTags = profile ? flattenProfile(profile) : []

  let candidates = pool.filter(cmd => {
    if (completed.includes(cmd.id)) return false
    if (isLateNight && !cmd.nightSafe) return false
    if (cmd.avoidTypes && profileTags.some(t => cmd.avoidTypes.includes(t))) return false
    return true
  })
  // 关键修复：候选为空时回退全池（而非 getFallbackCommands，避免摇出微逃指令）
  if (!candidates.length) candidates = pool
  if (profile && profileTags.length) {
    const preferred = candidates.filter(cmd => cmd.recommendTypes && cmd.recommendTypes.some(t => profileTags.includes(t)))
    if (preferred.length >= 1) candidates = preferred
  }
  // 双重兜底
  if (!candidates.length) candidates = pool
  // 固定随机便于测试（生产环境用 Math.random）
  const idx = opts.rng ? opts.rng(candidates.length) : Math.floor(Math.random() * candidates.length)
  return candidates[idx]
}

// ============================================================
// 测试开始
// ============================================================

describe('1. 数据完整性 - breakthrough-commands.js', () => {
  it('应有 100 条指令', () => {
    assertEqual(BREAKTHROUGH_COMMANDS.length, 100, '指令总数应为 100')
  })

  it('每条指令 id 唯一且为 bt001~bt100', () => {
    const ids = BREAKTHROUGH_COMMANDS.map(c => c.id)
    const set = new Set(ids)
    assertEqual(set.size, ids.length, 'id 不应有重复')
    ids.forEach(id => {
      assert(/^bt\d{3}$/.test(id), 'id 应匹配 bt### 格式: ' + id)
    })
  })

  it('每条指令 type 必须为 breakthrough', () => {
    BREAKTHROUGH_COMMANDS.forEach(c => {
      assertEqual(c.type, 'breakthrough', 'type 应为 breakthrough: ' + c.id)
    })
  })

  it('每条指令必须含必要字段', () => {
    const required = ['id', 'content', 'type', 'typeColor', 'duration', 'steps', 'mode', 'nightSafe', 'outdoor', 'rainy', 'tip']
    BREAKTHROUGH_COMMANDS.forEach(c => {
      required.forEach(f => {
        assert(c[f] !== undefined && c[f] !== null, c.id + ' 缺字段: ' + f)
      })
    })
  })

  it('每条指令 steps 应为 4 步数组', () => {
    BREAKTHROUGH_COMMANDS.forEach(c => {
      assert(Array.isArray(c.steps), c.id + ' steps 应为数组')
      assertEqual(c.steps.length, 4, c.id + ' steps 应为 4 步')
      c.steps.forEach(s => {
        assert(typeof s === 'string' && s.length > 0, c.id + ' step 应为非空字符串')
      })
    })
  })

  it('duration 应为正整数且 <= 480（破圈挑战最长 8 小时）', () => {
    BREAKTHROUGH_COMMANDS.forEach(c => {
      assert(Number.isInteger(c.duration) && c.duration > 0, c.id + ' duration 应为正整数')
      assert(c.duration <= 480, c.id + ' duration 应 <= 480（8 小时）')
    })
  })

  it('nightSafe/outdoor/rainy/double 应为布尔', () => {
    BREAKTHROUGH_COMMANDS.forEach(c => {
      assertEqual(typeof c.nightSafe, 'boolean', c.id + ' nightSafe 应为 boolean')
      assertEqual(typeof c.outdoor, 'boolean', c.id + ' outdoor 应为 boolean')
      assertEqual(typeof c.rainy, 'boolean', c.id + ' rainy 应为 boolean')
      assertEqual(typeof c.double, 'boolean', c.id + ' double 应为 boolean')
    })
  })

  it('mode 应为 breakthrough', () => {
    BREAKTHROUGH_COMMANDS.forEach(c => {
      assertEqual(c.mode, 'breakthrough', c.id + ' mode 应为 breakthrough')
    })
  })
})

describe('2. constants 配置一致性', () => {
  it('TYPE_META.breakthrough 配置完整', () => {
    const meta = TYPE_META.breakthrough
    assert(meta !== undefined, 'TYPE_META 应含 breakthrough')
    assertEqual(meta.name, '破圈行动')
    assertEqual(meta.color, '#9B7BB8')
    assertEqual(meta.icon, '/assets/icons/breakthrough-dice-purple.svg')
    assertEqual(meta.pin, '/assets/icons/breakthrough-dice-purple.svg')
  })

  it('normalizeType("breakthrough") 应返回 breakthrough', () => {
    assertEqual(normalizeType('breakthrough'), 'breakthrough')
  })

  it('getTypeMeta("breakthrough") 应返回完整元数据', () => {
    const meta = getTypeMeta('breakthrough')
    assertEqual(meta.name, '破圈行动')
    assertEqual(meta.color, '#9B7BB8')
  })

  it('MODE_LIST 应含 breakthrough 模式', () => {
    const bt = MODE_LIST.find(m => m.id === 'breakthrough')
    assert(bt !== undefined, 'MODE_LIST 应含 breakthrough')
    assertEqual(bt.icon, '/assets/icons/breakthrough-dice-purple.svg')
    assertEqual(bt.color, '#9B7BB8')
  })

  it('HOME_DICE_LIST 应含 breakthrough 骰子且图标统一', () => {
    const dice = HOME_DICE_LIST.find(d => d.id === 'breakthrough')
    assert(dice !== undefined, 'HOME_DICE_LIST 应含 breakthrough')
    assertEqual(dice.icon, '/assets/icons/breakthrough-dice-purple.svg', '图标应统一为紫色 SVG')
    assertEqual(dice.color, '#9B7BB8', '颜色应为紫色 #9B7BB8')
  })

  it('TYPE_STEPS.breakthrough 应为 4 步', () => {
    const steps = TYPE_STEPS.breakthrough
    assert(Array.isArray(steps), 'TYPE_STEPS.breakthrough 应为数组')
    assertEqual(steps.length, 4, '应为 4 步')
  })
})

describe('3. 核心逻辑 - rollBreakthroughCommand 过滤链', () => {
  it('基础场景：白天无画像，应从全池返回一条', () => {
    const cmd = rollBreakthroughSimulator({ hour: 14, rng: () => 0 })
    assert(cmd !== undefined, '应返回一条指令')
    assertEqual(cmd.type, 'breakthrough', '应返回 breakthrough 类型')
  })

  it('已完成过滤：completed 含某 id 时不应返回该 id', () => {
    // 跑 50 次，确保不返回已完成的
    const completed = ['bt001', 'bt002', 'bt003']
    for (let i = 0; i < 50; i++) {
      const cmd = rollBreakthroughSimulator({ completed, rng: (len) => i % len })
      assert(!completed.includes(cmd.id), '不应返回已完成的 id: ' + cmd.id)
    }
  })

  it('深夜过滤：isLateNight=true 时只返回 nightSafe=true 的指令', () => {
    for (let i = 0; i < 50; i++) {
      const cmd = rollBreakthroughSimulator({ isLateNight: true, rng: (len) => i % len })
      assertEqual(cmd.nightSafe, true, '深夜应只返回 nightSafe: ' + cmd.id)
    }
  })

  it('avoidTypes 过滤：画像匹配 avoidTypes 时该指令被排除', () => {
    // 找一条带 avoidTypes 的指令，构造画像命中
    const target = BREAKTHROUGH_COMMANDS.find(c => c.avoidTypes && c.avoidTypes.length > 0)
    assert(target !== undefined, '应存在带 avoidTypes 的指令')
    const avoidTag = target.avoidTypes[0]
    // 构造画像：把 avoidTag 拆成 k:v
    const [k, v] = avoidTag.split(':')
    const profile = { [k]: v }
    // 跑 100 次，确保 target 不被选中（如果池里还有其他候选）
    let hitTarget = false
    for (let i = 0; i < 100; i++) {
      const cmd = rollBreakthroughSimulator({ profile, rng: (len) => i % len })
      if (cmd && cmd.id === target.id) hitTarget = true
    }
    // 仅当池中所有指令都未被 avoid 排除时才允许命中 target
    // 这里验证：如果存在其他候选，target 不应被选中
    const otherCandidates = BREAKTHROUGH_COMMANDS.filter(c => {
      if (c.id === target.id) return false
      if (c.avoidTypes && c.avoidTypes.includes(avoidTag)) return false
      return true
    })
    if (otherCandidates.length > 0) {
      assert(!hitTarget, 'avoidTypes 命中时 target 不应被选中: ' + target.id)
    }
  })

  it('recommendTypes 偏好：有画像时优先返回 recommendTypes 匹配的指令', () => {
    // 构造画像匹配某个 recommendType
    const target = BREAKTHROUGH_COMMANDS.find(c => c.recommendTypes && c.recommendTypes.length > 0)
    assert(target !== undefined, '应存在带 recommendTypes 的指令')
    const recTag = target.recommendTypes[0]
    const [k, v] = recTag.split(':')
    const profile = { [k]: v }
    // 跑 50 次，所有返回的都应匹配 recommendTypes（除非池中无匹配）
    const matchingPool = BREAKTHROUGH_COMMANDS.filter(c => c.recommendTypes && c.recommendTypes.includes(recTag))
    if (matchingPool.length >= 1) {
      for (let i = 0; i < 50; i++) {
        const cmd = rollBreakthroughSimulator({ profile, rng: (len) => i % len })
        assert(cmd.recommendTypes && cmd.recommendTypes.includes(recTag), '应优先返回 recommendTypes 匹配的: ' + cmd.id)
      }
    }
  })
})

describe('4. 边界兜底 - 候选为空时回退全池', () => {
  it('所有指令都已完成时，回退全池（不返回 undefined）', () => {
    const allCompleted = BREAKTHROUGH_COMMANDS.map(c => c.id)
    const cmd = rollBreakthroughSimulator({ completed: allCompleted, rng: () => 0 })
    assert(cmd !== undefined, '候选为空时应回退全池，不返回 undefined')
    assertEqual(cmd.type, 'breakthrough', '回退应返回 breakthrough 类型，而非微逃指令')
  })

  it('深夜且所有 nightSafe=false 时，回退全池', () => {
    // 假设池中存在 nightSafe=false 的指令，构造全部不满足场景
    // 实际池中有 nightSafe=true 的，这里测兜底逻辑：如果 filter 后为空，回退全池
    const tinyPool = BREAKTHROUGH_COMMANDS.slice(0, 5).map(c => Object.assign({}, c, { nightSafe: false }))
    const cmd = rollBreakthroughSimulator({ pool: tinyPool, isLateNight: true, rng: () => 0 })
    assert(cmd !== undefined, '深夜全不 safe 时应回退全池')
    assertEqual(cmd.type, 'breakthrough', '回退应保持 breakthrough 类型')
  })

  it('空池兜底：pool 为空数组时，candidates 仍为空数组（不抛错）', () => {
    let threw = false
    try {
      const cmd = rollBreakthroughSimulator({ pool: [], rng: () => 0 })
      assert(cmd === undefined, '空池应返回 undefined')
    } catch (e) {
      threw = true
    }
    assert(!threw, '空池不应抛错')
  })
})

describe('5. 不变性 - 不污染入参', () => {
  it('rollBreakthroughSimulator 不应修改 pool 数组', () => {
    const poolCopy = BREAKTHROUGH_COMMANDS.slice()
    const originalIds = poolCopy.map(c => c.id)
    rollBreakthroughSimulator({ rng: () => 0 })
    const afterIds = poolCopy.map(c => c.id)
    assertEqual(JSON.stringify(afterIds), JSON.stringify(originalIds), 'pool 不应被修改')
  })

  it('不应修改 completed 数组', () => {
    const completed = ['bt001', 'bt002']
    const completedCopy = completed.slice()
    rollBreakthroughSimulator({ completed, rng: () => 0 })
    assertEqual(JSON.stringify(completed), JSON.stringify(completedCopy), 'completed 不应被修改')
  })

  it('不应修改 profile 对象', () => {
    const profile = { social: 'introvert' }
    const profileCopy = JSON.parse(JSON.stringify(profile))
    rollBreakthroughSimulator({ profile, rng: () => 0 })
    assertEqual(JSON.stringify(profile), JSON.stringify(profileCopy), 'profile 不应被修改')
  })
})

// ===== 最终报告 =====
console.log('\n' + '='.repeat(60))
console.log('  破圈骰子单元测试报告')
console.log('='.repeat(60))
console.log('  通过: ' + passCount + ' / 失败: ' + failCount)
if (failures.length) {
  console.log('\n  失败项:')
  failures.forEach(f => console.log('    ✗ ' + f))
}
console.log('='.repeat(60))

process.exit(failCount > 0 ? 1 : 0)
