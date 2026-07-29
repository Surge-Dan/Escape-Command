// tests/unit/poi-command-builder.test.js
// poi-command-builder 单元测试
// 运行: node tests/unit/poi-command-builder.test.js
//
// 覆盖维度：
//   1. mapType：腾讯 category → 指令 type；未知默认 color
//   2. estimateDuration：各 type 时长
//   3. buildOne：POI→指令；无 name/无坐标返回 null；location 字段正确
//   4. buildCommands：批量构建；id 去重；偏好加权；多样性（每类型至少 1 条）；上限 20；空返回空
//   5. 不变性：不污染入参
//
// 测试设计目标：杀掉 mutation-test.js 中针对 poi-command-builder 的全部变异算子。

'use strict'

const pcb = require('../../utils/poi-command-builder.js')

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

// 样例 POI（模拟云函数 poiSearch 返回结构）
function samplePOIs() {
  return [
    { id: 'p1', name: '星巴克', address: '天河路1号', latitude: 23.1, longitude: 113.26, category: '咖啡', type: 'food', distance: 100 },
    { id: 'p2', name: '天河公园', address: '天河路2号', latitude: 23.11, longitude: 113.27, category: '公园', type: 'walk', distance: 200 },
    { id: 'p3', name: '省博物馆', address: '天河路3号', latitude: 23.12, longitude: 113.28, category: '博物馆', type: 'culture', distance: 300 },
    { id: 'p4', name: '711便利店', address: '天河路4号', latitude: 23.13, longitude: 113.29, category: '便利店', type: 'collect', distance: 150 },
    { id: 'p5', name: '未知类别店', address: '天河路5号', latitude: 23.14, longitude: 113.30, category: '其他', type: 'color', distance: 400 }
  ]
}

// ============================================================
// mapType
// ============================================================
describe('mapType', function () {
  it('咖啡/茶/美食/餐厅/小吃 → food', function () {
    assertEqual(pcb.mapType('咖啡'), 'food', '咖啡')
    assertEqual(pcb.mapType('茶餐厅'), 'food', '茶')
    assertEqual(pcb.mapType('美食'), 'food', '美食')
    assertEqual(pcb.mapType('餐厅'), 'food', '餐厅')
    assertEqual(pcb.mapType('小吃街'), 'food', '小吃')
  })

  it('公园/广场/景点/湖泊 → walk', function () {
    assertEqual(pcb.mapType('公园'), 'walk', '公园')
    assertEqual(pcb.mapType('城市广场'), 'walk', '广场')
    assertEqual(pcb.mapType('景点'), 'walk', '景点')
  })

  it('博物馆/美术馆/书店/图书馆 → culture', function () {
    assertEqual(pcb.mapType('博物馆'), 'culture', '博物馆')
    assertEqual(pcb.mapType('美术馆'), 'culture', '美术馆')
    assertEqual(pcb.mapType('书店'), 'culture', '书店')
  })

  it('便利店/市场/超市 → collect', function () {
    assertEqual(pcb.mapType('便利店'), 'collect', '便利店')
    assertEqual(pcb.mapType('菜市场'), 'collect', '市场')
    assertEqual(pcb.mapType('超市'), 'collect', '超市')
  })

  it('未知/空 → color（默认）', function () {
    assertEqual(pcb.mapType('其他'), 'color', '未知类别')
    assertEqual(pcb.mapType(''), 'color', '空字符串')
    assertEqual(pcb.mapType(null), 'color', 'null')
    assertEqual(pcb.mapType(undefined), 'color', 'undefined')
    assertEqual(pcb.mapType(123), 'color', '非字符串')
  })
})

// ============================================================
// estimateDuration
// ============================================================
describe('estimateDuration', function () {
  it('各 type 时长正确', function () {
    assertEqual(pcb.estimateDuration('food'), 20, 'food')
    assertEqual(pcb.estimateDuration('walk'), 25, 'walk')
    assertEqual(pcb.estimateDuration('culture'), 30, 'culture')
    assertEqual(pcb.estimateDuration('collect'), 15, 'collect')
    assertEqual(pcb.estimateDuration('sense'), 20, 'sense')
    assertEqual(pcb.estimateDuration('color'), 15, 'color')
    assertEqual(pcb.estimateDuration('unknown'), 15, '未知兜底15')
  })
})

// ============================================================
// buildOne
// ============================================================
describe('buildOne', function () {
  it('POI → 指令字段正确', function () {
    const cmd = pcb.buildOne(samplePOIs()[0], { city: '广州' })
    assertEqual(cmd.id, 'poi_p1', 'id 前缀 poi_')
    assertEqual(cmd.poiId, 'p1', 'poiId')
    assertEqual(cmd.content, '去「星巴克」打卡', 'content')
    assertEqual(cmd.title, '星巴克', 'title')
    assertEqual(cmd.type, 'food', 'type')
    assertEqual(cmd.duration, 20, 'duration')
    assertEqual(cmd.requirePOI, null, 'requirePOI=null（不校验可达性）')
    assertEqual(cmd.location.latitude, 23.1, 'location.latitude')
    assertEqual(cmd.location.longitude, 113.26, 'location.longitude')
    assertEqual(cmd.location.name, '星巴克', 'location.name')
    assertEqual(cmd.location.city, '广州', 'location.city')
  })

  it('无 name 返回 null', function () {
    assertEqual(pcb.buildOne({ id: 'x', latitude: 23, longitude: 113, category: '咖啡' }, {}), null, '无 name')
    assertEqual(pcb.buildOne({ id: 'x', name: '', latitude: 23, longitude: 113 }, {}), null, '空 name')
  })

  it('无有效坐标返回 null', function () {
    assertEqual(pcb.buildOne({ id: 'x', name: '店', latitude: 0, longitude: 0 }, {}), null, '0,0 无效')
    assertEqual(pcb.buildOne({ id: 'x', name: '店', latitude: 'abc', longitude: 113 }, {}), null, '非数字坐标')
    assertEqual(pcb.buildOne({ id: 'x', name: '店' }, {}), null, '缺坐标')
  })

  it('无 id 用坐标生成 id', function () {
    const cmd = pcb.buildOne({ name: '店', latitude: 23.1, longitude: 113.26, category: '咖啡' }, {})
    assert(cmd.id === 'poi_23.1_113.26', '坐标生成 id: ' + cmd.id)
  })

  it('非对象/ null 返回 null', function () {
    assertEqual(pcb.buildOne(null, {}), null, 'null')
    assertEqual(pcb.buildOne(undefined, {}), null, 'undefined')
    assertEqual(pcb.buildOne('abc', {}), null, '字符串')
  })
})

// ============================================================
// buildCommands
// ============================================================
describe('buildCommands', function () {
  it('批量构建并返回指令数组', function () {
    const cmds = pcb.buildCommands(samplePOIs(), {}, { city: '广州' })
    assert(cmds.length > 0, '非空')
    assert(cmds.every(function (c) { return c.id.indexOf('poi_') === 0 }), '所有 id 前缀 poi_')
    assert(cmds.every(function (c) { return c.location && c.location.latitude }), '所有指令带 location')
  })

  it('按 id 去重', function () {
    const pois = [
      { id: 'p1', name: '店A', latitude: 23.1, longitude: 113.26, category: '咖啡' },
      { id: 'p1', name: '店A重复', latitude: 23.1, longitude: 113.26, category: '咖啡' }
    ]
    const cmds = pcb.buildCommands(pois, {}, {})
    assertEqual(cmds.length, 1, '同 id 去重为 1')
  })

  it('偏好加权：顶层偏好类型排前', function () {
    const pois = samplePOIs()
    const prefs = { type: { walk: 10, food: 1 } }
    const cmds = pcb.buildCommands(pois, prefs, {})
    // walk 类型应排第一（多样性首轮也会取，但 walk 偏好最高）
    assertEqual(cmds[0].type, 'walk', '偏好 walk 排首位')
  })

  it('多样性：每类型至少 1 条入选', function () {
    const cmds = pcb.buildCommands(samplePOIs(), {}, {})
    const types = new Set(cmds.map(function (c) { return c.type }))
    // 样例含 food/walk/culture/collect/color 五种
    assert(types.size >= 5, '至少 5 种类型入选，实际: ' + types.size)
  })

  it('上限 20 条', function () {
    const pois = []
    for (var i = 0; i < 50; i++) {
      pois.push({ id: 'p' + i, name: '店' + i, latitude: 23 + i * 0.01, longitude: 113 + i * 0.01, category: '咖啡' })
    }
    const cmds = pcb.buildCommands(pois, {}, {})
    assertEqual(cmds.length, 20, '上限 20')
  })

  it('空/非数组返回空数组', function () {
    assertEqual(pcb.buildCommands([], {}, {}).length, 0, '空数组')
    assertEqual(pcb.buildCommands(null, {}, {}).length, 0, 'null')
    assertEqual(pcb.buildCommands(undefined, {}, {}).length, 0, 'undefined')
  })

  it('过滤无效 POI（无 name/无坐标）', function () {
    const pois = [
      { id: 'p1', name: '有效店', latitude: 23.1, longitude: 113.26, category: '咖啡' },
      { id: 'p2', name: '', latitude: 23, longitude: 113, category: '咖啡' },
      { id: 'p3', name: '无坐标店', latitude: 0, longitude: 0, category: '咖啡' },
      null
    ]
    const cmds = pcb.buildCommands(pois, {}, {})
    assertEqual(cmds.length, 1, '仅 1 条有效')
    assertEqual(cmds[0].title, '有效店', '有效店入选')
  })

  it('不污染入参 pois', function () {
    const pois = samplePOIs()
    const snapshot = JSON.stringify(pois)
    pcb.buildCommands(pois, {}, {})
    assertEqual(JSON.stringify(pois), snapshot, 'pois 未被修改')
  })

  it('ctx.city 写入 location.city', function () {
    const cmds = pcb.buildCommands([samplePOIs()[0]], {}, { city: '深圳' })
    assertEqual(cmds[0].location.city, '深圳', 'city 写入')
  })

  it('无 ctx 不报错', function () {
    const cmds = pcb.buildCommands([samplePOIs()[0]], {}, null)
    assertEqual(cmds.length, 1, 'null ctx 不报错')
    assertEqual(cmds[0].location.city, '', 'city 兜底空串')
  })
})

// ============================================================
// _internal 导出
// ============================================================
describe('_internal 导出', function () {
  it('POI_TYPE_MAP 导出', function () {
    assert(!!pcb._internal, '_internal 存在')
    assert(!!pcb._internal.POI_TYPE_MAP, 'POI_TYPE_MAP 存在')
    assertEqual(pcb._internal.POI_TYPE_MAP['咖啡'], 'food', '咖啡映射 food')
  })
})

// ============================================================
// 结果
// ============================================================
console.log('\n' + '='.repeat(60))
if (failCount === 0) {
  console.log('POI Command Builder 单元测试结果: ' + passCount + ' passed, 0 failed')
} else {
  console.log('POI Command Builder 单元测试结果: ' + passCount + ' passed, ' + failCount + ' failed')
  console.log('失败用例:')
  failures.forEach(function (f) { console.log('  ✗ ' + f) })
}
console.log('='.repeat(60))
process.exit(failCount > 0 ? 1 : 0)
