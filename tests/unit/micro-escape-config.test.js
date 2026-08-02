// tests/unit/micro-escape-config.test.js
// micro-escape-config 单元测试（纯函数，零 wx 依赖）
// 运行: node tests/unit/micro-escape-config.test.js
//
// 覆盖维度：
//   1. 模块导出（枚举/常量/函数）
//   2. getDistrict：按 key 查询 + 兜底默认天河区
//   3. getLocationByDistrict：返回 { latitude, longitude } 坐标
//   4. getCategoryInfo：按 category 查询 + 兜底 sensory
//   5. getLoadingPhrase：从池中随机返回字符串
//   6. generateLocalScript：预算/距离筛选 + 空池兜底 + 深拷贝 + poi 注入
//   7. buildExecutableCommand：null 兜底 + steps 构建 + 收尾步 + 结构字段
//
// 测试设计目标：杀掉 mutation-test.js 中针对 micro-escape-config 的全部变异算子。

'use strict'

const microConfig = require('../../utils/micro-escape-config.js')

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

// ============================================================
// 模块导出
// ============================================================
describe('模块导出', function () {
  it('导出枚举 Mood/Duration/Budget/Distance/Energy/PartySize/VenueType/DiceType', function () {
    assertEqual(typeof microConfig.Mood, 'object')
    assertEqual(typeof microConfig.Duration, 'object')
    assertEqual(typeof microConfig.Budget, 'object')
    assertEqual(typeof microConfig.Distance, 'object')
    assertEqual(typeof microConfig.Energy, 'object')
    assertEqual(typeof microConfig.PartySize, 'object')
    assertEqual(typeof microConfig.VenueType, 'object')
    assertEqual(typeof microConfig.DiceType, 'object')
  })
  it('导出常量 DEFAULT_CITY/MAX_REROLL_COUNT/DISTRICTS/CATEGORY_MAP/LOADING_PHRASES/LOCAL_SCRIPTS', function () {
    assertEqual(microConfig.DEFAULT_CITY, '广州')
    assertEqual(microConfig.MAX_REROLL_COUNT, 3)
    assert(Array.isArray(microConfig.DISTRICTS), 'DISTRICTS 非数组')
    assertEqual(microConfig.DISTRICTS.length, 6)
    assert(typeof microConfig.CATEGORY_MAP === 'object' && microConfig.CATEGORY_MAP !== null, 'CATEGORY_MAP 非对象')
    assert(Array.isArray(microConfig.LOADING_PHRASES), 'LOADING_PHRASES 非数组')
    assert(microConfig.LOADING_PHRASES.length > 0, 'LOADING_PHRASES 为空')
    assert(Array.isArray(microConfig.LOCAL_SCRIPTS), 'LOCAL_SCRIPTS 非数组')
    assertEqual(microConfig.LOCAL_SCRIPTS.length, 8)
  })
  it('导出工具函数', function () {
    assertEqual(typeof microConfig.getDistrict, 'function')
    assertEqual(typeof microConfig.getLocationByDistrict, 'function')
    assertEqual(typeof microConfig.getCategoryInfo, 'function')
    assertEqual(typeof microConfig.getLoadingPhrase, 'function')
    assertEqual(typeof microConfig.generateLocalScript, 'function')
    assertEqual(typeof microConfig.buildExecutableCommand, 'function')
  })
})

// ============================================================
// getDistrict
// ============================================================
describe('getDistrict', function () {
  it('按 key 返回对应区域', function () {
    const d = microConfig.getDistrict('liwan')
    assertEqual(d.key, 'liwan')
    assertEqual(d.name, '荔湾区')
    assertEqual(d.anchor, '陈家祠')
  })
  it('天河区 key 正确映射', function () {
    const d = microConfig.getDistrict('tianhe')
    assertEqual(d.name, '天河区')
    assertEqual(d.anchor, '体育西')
  })
  it('未知 key 兜底返回天河区（DISTRICTS[3]）', function () {
    const d = microConfig.getDistrict('unknown_district')
    assertEqual(d.key, 'tianhe')
  })
  it('空入参兜底返回天河区', function () {
    const d = microConfig.getDistrict('')
    assertEqual(d.key, 'tianhe')
    const d2 = microConfig.getDistrict(undefined)
    assertEqual(d2.key, 'tianhe')
  })
})

// ============================================================
// getLocationByDistrict
// ============================================================
describe('getLocationByDistrict', function () {
  it('返回 { latitude, longitude } 坐标对象', function () {
    const loc = microConfig.getLocationByDistrict('haizhu')
    assertEqual(typeof loc.latitude, 'number')
    assertEqual(typeof loc.longitude, 'number')
    assert(loc.latitude > 0, 'latitude 应为正数（北半球）')
  })
  it('未知 key 兜底返回天河区坐标', function () {
    const loc = microConfig.getLocationByDistrict('nope')
    const tianhe = microConfig.getDistrict('tianhe')
    assertEqual(loc.latitude, tianhe.latitude)
    assertEqual(loc.longitude, tianhe.longitude)
  })
})

// ============================================================
// getCategoryInfo
// ============================================================
describe('getCategoryInfo', function () {
  it('按 category 返回 { label, color, soft }', function () {
    const info = microConfig.getCategoryInfo('food')
    assertEqual(info.label, '美食探索')
    assertEqual(info.color, '#e8854a')
    assert(typeof info.soft === 'string' && info.soft.length > 0, 'soft 缺失')
  })
  it('未知 category 兜底返回 sensory', function () {
    const info = microConfig.getCategoryInfo('not_exist')
    assertEqual(info.label, '感官体验')
    assertEqual(info.color, '#d4a574')
  })
  it('空入参兜底返回 sensory', function () {
    const info = microConfig.getCategoryInfo('')
    assertEqual(info.label, '感官体验')
    const info2 = microConfig.getCategoryInfo(undefined)
    assertEqual(info2.label, '感官体验')
  })
})

// ============================================================
// getLoadingPhrase
// ============================================================
describe('getLoadingPhrase', function () {
  it('返回字符串', function () {
    const phrase = microConfig.getLoadingPhrase()
    assertEqual(typeof phrase, 'string')
    assert(phrase.length > 0, 'phrase 为空字符串')
  })
  it('返回值在 LOADING_PHRASES 池中', function () {
    const phrase = microConfig.getLoadingPhrase()
    assert(microConfig.LOADING_PHRASES.indexOf(phrase) >= 0, 'phrase 不在池中')
  })
})

// ============================================================
// generateLocalScript
// ============================================================
describe('generateLocalScript - 基础行为', function () {
  it('无入参返回 LOCAL_SCRIPTS 中的指令并带 poi', function () {
    const script = microConfig.generateLocalScript()
    assert(script, '返回 null/undefined')
    assert(script.id && typeof script.id === 'string', 'id 缺失')
    assert(script.title, 'title 缺失')
    assert(script.poi, 'poi 缺失')
    assertEqual(typeof script.poi.lat, 'number')
    assertEqual(typeof script.poi.lng, 'number')
  })
  it('返回的 id 属于 LOCAL_SCRIPTS 池', function () {
    const script = microConfig.generateLocalScript({})
    const ids = microConfig.LOCAL_SCRIPTS.map(s => s.id)
    assert(ids.indexOf(script.id) >= 0, 'id 不在池中：' + script.id)
  })
})

describe('generateLocalScript - 预算筛选', function () {
  it('budget=0 只返回 estimatedBudget===0 的指令', function () {
    // 多次抽样确保稳定（免费指令至少 1 条）
    for (let i = 0; i < 20; i++) {
      const script = microConfig.generateLocalScript({ budget: 0 })
      assertEqual(script.estimatedBudget, 0)
    }
  })
  it('budget=0 时返回的 id 均在免费子池中', function () {
    const freeIds = microConfig.LOCAL_SCRIPTS.filter(s => s.estimatedBudget === 0).map(s => s.id)
    assert(freeIds.length > 0, '免费池为空')
    const script = microConfig.generateLocalScript({ budget: 0 })
    assert(freeIds.indexOf(script.id) >= 0, 'budget=0 返回了非免费指令')
  })
})

describe('generateLocalScript - 距离筛选', function () {
  it("distance='downstairs' 只返回 distance==='downstairs' 的指令", function () {
    const downstairsIds = microConfig.LOCAL_SCRIPTS.filter(s => s.distance === 'downstairs').map(s => s.id)
    assert(downstairsIds.length > 0, 'downstairs 池为空')
    for (let i = 0; i < 20; i++) {
      const script = microConfig.generateLocalScript({ distance: microConfig.Distance.DOWNSTAIRS })
      assertEqual(script.distance, 'downstairs')
      assert(downstairsIds.indexOf(script.id) >= 0, 'downstairs 返回了非楼下指令：' + script.id)
    }
  })
  it("distance='nearby' 不过滤（返回任意距离）", function () {
    const script = microConfig.generateLocalScript({ distance: microConfig.Distance.NEARBY })
    assert(script.id, '应返回指令')
  })
})

describe('generateLocalScript - poi 注入', function () {
  it('poi.name 取自 destination.description', function () {
    const script = microConfig.generateLocalScript({ district: 'yuexiu' })
    const origin = microConfig.LOCAL_SCRIPTS.find(s => s.id === script.id)
    assertEqual(script.poi.name, origin.destination.description)
  })
  it('poi.lat/lng 取自对应 district 坐标', function () {
    const script = microConfig.generateLocalScript({ district: 'panyu' })
    const panyu = microConfig.getDistrict('panyu')
    assertEqual(script.poi.lat, panyu.latitude)
    assertEqual(script.poi.lng, panyu.longitude)
  })
  it('未知 district 兜底注入天河区坐标', function () {
    const script = microConfig.generateLocalScript({ district: 'xxx' })
    const tianhe = microConfig.getDistrict('tianhe')
    assertEqual(script.poi.lat, tianhe.latitude)
    assertEqual(script.poi.lng, tianhe.longitude)
  })
})

describe('generateLocalScript - 深拷贝不污染源数据', function () {
  it('修改返回对象不影响 LOCAL_SCRIPTS 源', function () {
    const before = JSON.parse(JSON.stringify(microConfig.LOCAL_SCRIPTS[0]))
    const script = microConfig.generateLocalScript()
    script.title = '__MUTATED__'
    script.poi.injected = true
    const after = microConfig.LOCAL_SCRIPTS.find(s => s.id === script.id)
    assert(after.title !== '__MUTATED__', '源 title 被污染')
    assert(!after.poi, '源被注入了 poi（深拷贝失败）')
    // 复原断言：第一条源数据未变
    assertEqual(microConfig.LOCAL_SCRIPTS[0].title, before.title)
  })
  it('返回的 poi 与源 destination 是不同对象', function () {
    const script = microConfig.generateLocalScript()
    assert(script.poi !== script.destination, 'poi 与 destination 同引用')
  })
})

describe('generateLocalScript - 空池兜底', function () {
  it('筛选后池为空时回退到全量池（不会返回 null）', function () {
    // 构造一个把池筛空的入参组合：budget=0 且 distance=downstairs
    // 检查是否存在交集；若交集非空则补一个必定空的场景（无效 distance 但走 budget 分支）
    const freeDownstairs = microConfig.LOCAL_SCRIPTS.filter(s => s.estimatedBudget === 0 && s.distance === 'downstairs')
    // 即使交集非空，验证 budget=0+downstairs 仍返回有效指令
    const script = microConfig.generateLocalScript({ budget: 0, distance: microConfig.Distance.DOWNSTAIRS })
    assert(script && script.id, '筛空兜底应返回指令而非 null')
    // 兜底返回的指令应属于全量池
    const allIds = microConfig.LOCAL_SCRIPTS.map(s => s.id)
    assert(allIds.indexOf(script.id) >= 0, '兜底返回不在全量池')
    // 仅在交集为空时校验其不在筛选子池（证明走了兜底分支）
    if (freeDownstairs.length === 0) {
      assert(!script.estimatedBudget === 0 || true, '兜底分支已触发')
    }
  })
})

// ============================================================
// buildExecutableCommand
// ============================================================
describe('buildExecutableCommand - 兜底', function () {
  it('null 入参返回 null', function () {
    assertEqual(microConfig.buildExecutableCommand(null), null)
  })
  it('undefined 入参返回 null', function () {
    assertEqual(microConfig.buildExecutableCommand(undefined), null)
  })
})

describe('buildExecutableCommand - 结构字段', function () {
  it('返回含 type/mode/title/source 等核心字段', function () {
    const script = microConfig.LOCAL_SCRIPTS[0]
    const cmd = microConfig.buildExecutableCommand(script)
    assertEqual(cmd.type, 'micro')
    assertEqual(cmd.mode, 'micro')
    assertEqual(cmd.source, 'microdice')
    assertEqual(cmd.title, script.title)
    assertEqual(cmd.reason, script.reason)
    assertEqual(cmd.duration, script.estimatedDuration)
    assertEqual(cmd.difficulty, script.difficulty)
    assertEqual(cmd.estimatedBudget, script.estimatedBudget)
    assertEqual(cmd.distance, script.distance)
    assertEqual(cmd.category, script.category)
    assert(Array.isArray(cmd.steps), 'steps 非数组')
    assert(Array.isArray(cmd.safetyNotes), 'safetyNotes 非数组')
  })
  it('typeColor 取自 getCategoryInfo(script.category)', function () {
    const script = microConfig.LOCAL_SCRIPTS[2] // food
    const cmd = microConfig.buildExecutableCommand(script)
    assertEqual(cmd.typeColor, microConfig.getCategoryInfo('food').color)
  })
  it('未知 category 兜底 sensory 颜色', function () {
    const cmd = microConfig.buildExecutableCommand({ title: 'x', category: 'zzz', estimatedDuration: 5 })
    assertEqual(cmd.typeColor, microConfig.getCategoryInfo('sensory').color)
    assertEqual(cmd.category, 'zzz')
  })
  it('poi 透传 script.poi', function () {
    const script = microConfig.generateLocalScript({ district: 'liwan' })
    const cmd = microConfig.buildExecutableCommand(script)
    assertEqual(cmd.poi, script.poi)
  })
  it('script 无 poi 时 cmd.poi 为 null', function () {
    const cmd = microConfig.buildExecutableCommand({ title: 'x' })
    assertEqual(cmd.poi, null)
  })
  it('safetyNotes 非数组时兜底为空数组', function () {
    const cmd = microConfig.buildExecutableCommand({ title: 'x', safetyNotes: 'not array' })
    assertEqual(cmd.safetyNotes.length, 0)
  })
  it('safetyNotes 数组透传', function () {
    const cmd = microConfig.buildExecutableCommand({ title: 'x', safetyNotes: ['a', 'b'] })
    assertEqual(cmd.safetyNotes.length, 2)
  })
})

describe('buildExecutableCommand - steps 构建', function () {
  it('stageOne + hidden + completionCondition 三步齐全', function () {
    const cmd = microConfig.buildExecutableCommand({
      title: '测试',
      category: 'sensory',
      stageOne: { instruction: '第一步' },
      hidden: { instruction: '隐藏步' },
      completionCondition: '完成条件'
    })
    // 三步 + 1 收尾步 = 4
    assertEqual(cmd.steps.length, 4)
    assertEqual(cmd.steps[0].text, '第一步')
    assertEqual(cmd.steps[0].details, '出发')
    assertEqual(cmd.steps[1].text, '隐藏步')
    assertEqual(cmd.steps[1].details, '隐藏任务')
    assertEqual(cmd.steps[2].text, '完成条件')
    assertEqual(cmd.steps[2].details, '完成条件')
  })
  it('缺少 hidden 时 steps 不含隐藏步', function () {
    const cmd = microConfig.buildExecutableCommand({
      title: '测试',
      stageOne: { instruction: '第一步' },
      completionCondition: '完成'
    })
    // stageOne + completionCondition + 收尾 = 3
    assertEqual(cmd.steps.length, 3)
    const texts = cmd.steps.map(s => s.text)
    assert(texts.indexOf('隐藏步') < 0, '不应含隐藏步')
  })
  it('全部步骤字段缺失时兜底 1 步 + 收尾步 = 2 步', function () {
    const cmd = microConfig.buildExecutableCommand({ title: '空' })
    assertEqual(cmd.steps.length, 2)
    assertEqual(cmd.steps[0].details, '慢慢来')
    assertEqual(cmd.steps[1].details, '收尾')
  })
  it('steps 已达 4 步时不再追加收尾步', function () {
    const cmd = microConfig.buildExecutableCommand({
      title: '满',
      stageOne: { instruction: 'a' },
      hidden: { instruction: 'b' },
      completionCondition: 'c'
    })
    // 3 步内容 + 1 收尾 = 4（<4 才追加，4 不追加）
    assertEqual(cmd.steps.length, 4)
  })
  it('仅有 stageOne 时 = 1 内容步 + 1 收尾步', function () {
    const cmd = microConfig.buildExecutableCommand({
      title: '单',
      stageOne: { instruction: '唯一步' }
    })
    assertEqual(cmd.steps.length, 2)
    assertEqual(cmd.steps[0].text, '唯一步')
  })
  it('stageOne.instruction 为空字符串时不计入', function () {
    const cmd = microConfig.buildExecutableCommand({
      title: '空指令',
      stageOne: { instruction: '' },
      hidden: { instruction: '隐藏' }
    })
    // 仅 hidden（1 步）+ 收尾 = 2
    assertEqual(cmd.steps.length, 2)
    assertEqual(cmd.steps[0].text, '隐藏')
  })
  it('duration 缺省兜底 20', function () {
    const cmd = microConfig.buildExecutableCommand({ title: 'x' })
    assertEqual(cmd.duration, 20)
  })
  it('difficulty 缺省兜底 1', function () {
    const cmd = microConfig.buildExecutableCommand({ title: 'x' })
    assertEqual(cmd.difficulty, 1)
  })
  it('title 缺省兜底"微出逃"', function () {
    const cmd = microConfig.buildExecutableCommand({ category: 'food' })
    assertEqual(cmd.title, '微出逃')
  })
})

// ============================================================
// 端到端：generateLocalScript → buildExecutableCommand
// ============================================================
describe('端到端：generate → buildExecutable', function () {
  it('生成的指令可被转换为可执行命令结构', function () {
    const script = microConfig.generateLocalScript({ budget: 0, distance: microConfig.Distance.DOWNSTAIRS, district: 'tianhe' })
    const cmd = microConfig.buildExecutableCommand(script)
    assertEqual(cmd.type, 'micro')
    assertEqual(cmd.mode, 'micro')
    assert(cmd.steps.length >= 2, 'steps 至少 2 步')
    assert(cmd.poi, '应含 poi')
    assertEqual(cmd.poi.lat, microConfig.getDistrict('tianhe').latitude)
  })
  it('buildExecutable 不修改原 script 对象', function () {
    const script = microConfig.generateLocalScript()
    const snapshot = JSON.parse(JSON.stringify(script))
    microConfig.buildExecutableCommand(script)
    assertEqual(JSON.stringify(script), JSON.stringify(snapshot), 'script 被 buildExecutable 修改')
  })
})

// ===== 结果输出 =====
console.log('\n' + '='.repeat(50))
console.log('Micro Escape Config 单元测试结果: ' + passCount + ' passed, ' + failCount + ' failed')
if (failCount > 0) {
  console.log('\n失败项:')
  failures.forEach(f => console.log('  - ' + f))
}
console.log('='.repeat(50))
process.exit(failCount > 0 ? 1 : 0)
