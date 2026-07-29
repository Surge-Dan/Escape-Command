// tests/unit/record-builder.test.js
// record-builder 单元测试
// 运行: node tests/unit/record-builder.test.js
//
// 覆盖维度：
//   1. 普通出逃记录字段正确性（title/type/color/mood/filter 优先级）
//   2. 同频出逃扩展字段（isGroup/groupId/members/steps）
//   3. location 三级优先级（rd.location > ctx.location > null）
//   4. duration 计算 + 下界 1（变异 G-d1: Math.max(1)→Math.max(0)）
//   5. photos 上限 9（变异 G-p1: slice(0,9)→slice(0,8)）
//   6. feeling 截断 200（变异 G-f1: slice(0,200)→slice(0,199)）
//   7. now/startTime 归一化（缺省/NaN/Infinity/非数字）
//   8. 不变性：不污染入参、返回数组为拷贝
//   9. 边界：全入参缺失/null/字符串/数字不抛异常
//
// 测试设计目标：杀掉 mutation-test.js 中针对 record-builder 的全部变异算子。

'use strict'

const builder = require('../../utils/record-builder.js')
const buildRecord = builder.buildRecord
const I = builder._internal

// ===== 自定义测试框架（与 store.test.js / generator-engine.test.js 风格一致）=====
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

// 固定时间戳：2026-03-15 14:30:00（便于 date/time 断言可复现）
const FIXED_NOW = new Date(2026, 2, 15, 14, 30, 0).getTime()
// 30 分钟前开始
const START_30 = FIXED_NOW - 30 * 60 * 1000
// executionProgress 留痕用：步骤完成时间戳（startTime 之后、now 之前，单调递增）
const T1 = FIXED_NOW - 20 * 60 * 1000
const T2 = FIXED_NOW - 10 * 60 * 1000

// ============================================================
// 模块导出与内部工具
// ============================================================
describe('模块导出', function () {
  it('导出 buildRecord 函数', function () {
    assertEqual(typeof buildRecord, 'function', 'buildRecord 非函数')
  })
  it('_internal 导出 todayStr/timeStr/pad2/safeObj', function () {
    assertEqual(typeof I.todayStr, 'function')
    assertEqual(typeof I.timeStr, 'function')
    assertEqual(typeof I.pad2, 'function')
    assertEqual(typeof I.safeObj, 'function')
  })
})

describe('内部工具 pad2', function () {
  it('个位数补零', function () {
    assertEqual(I.pad2(0), '00')
    assertEqual(I.pad2(5), '05')
    assertEqual(I.pad2(9), '09')
  })
  it('两位数不补零', function () {
    assertEqual(I.pad2(10), '10')
    assertEqual(I.pad2(23), '23')
  })
})

describe('内部工具 todayStr/timeStr', function () {
  it('todayStr 基于 now 输出 YYYY-MM-DD', function () {
    // FIXED_NOW = 2026-03-15
    assertEqual(I.todayStr(FIXED_NOW), '2026-03-15')
  })
  it('timeStr 基于 now 输出 HH:MM', function () {
    assertEqual(I.timeStr(FIXED_NOW), '14:30')
  })
  it('now 非数字回退当前时间不抛异常', function () {
    const s = I.todayStr('abc')
    assert(/^\d{4}-\d{2}-\d{2}$/.test(s), 'todayStr 非数字入参格式错误: ' + s)
    const t = I.timeStr(null)
    assert(/^\d{2}:\d{2}$/.test(t), 'timeStr 非数字入参格式错误: ' + t)
  })
})

describe('内部工具 safeObj', function () {
  it('对象原样返回', function () {
    const o = { a: 1 }
    assert(I.safeObj(o) === o, 'safeObj 对象未原样返回')
  })
  it('null/undefined 返回空对象', function () {
    assertEqual(typeof I.safeObj(null), 'object')
    assertEqual(Object.keys(I.safeObj(null)).length, 0)
    assertEqual(Object.keys(I.safeObj(undefined)).length, 0)
  })
  it('数组/字符串/数字返回空对象', function () {
    assertEqual(Object.keys(I.safeObj([1, 2])).length, 0, 'safeObj 数组未归一化')
    assertEqual(Object.keys(I.safeObj('str')).length, 0)
    assertEqual(Object.keys(I.safeObj(42)).length, 0)
  })
})

// ============================================================
// 普通出逃记录字段正确性
// ============================================================
describe('普通记录字段', function () {
  const cmd = {
    id: 'c001',
    title: '找蓝色招牌',
    content: '在街区里寻找三处蓝色招牌',
    type: 'color',
    typeColor: '#3B82F6',
    startTime: START_30
  }
  const rd = {
    photos: ['p1.jpg', 'p2.jpg'],
    feeling: '今天阳光很好',
    mood: 'happy',
    filter: 'warm',
    stickers: ['🌟', '🌈']
  }
  const ctx = {
    location: { latitude: 31.23, longitude: 121.47, name: '人民广场' },
    weather: 'sunny',
    now: FIXED_NOW
  }

  it('id 为 r_ + now', function () {
    const r = buildRecord(cmd, rd, ctx)
    assertEqual(r.id, 'r_' + FIXED_NOW)
  })
  it('commandId 透传 cmd.id', function () {
    const r = buildRecord(cmd, rd, ctx)
    assertEqual(r.commandId, 'c001')
  })
  it('commandTitle 优先取 cmd.title', function () {
    const r = buildRecord(cmd, rd, ctx)
    assertEqual(r.commandTitle, '找蓝色招牌')
  })
  it('commandContent 优先取 cmd.content', function () {
    const r = buildRecord(cmd, rd, ctx)
    assertEqual(r.commandContent, '在街区里寻找三处蓝色招牌')
  })
  it('commandType 透传 cmd.type', function () {
    const r = buildRecord(cmd, rd, ctx)
    assertEqual(r.commandType, 'color')
  })
  it('typeColor 透传 cmd.typeColor', function () {
    const r = buildRecord(cmd, rd, ctx)
    assertEqual(r.typeColor, '#3B82F6')
  })
  it('duration 正确计算（30 分钟）', function () {
    const r = buildRecord(cmd, rd, ctx)
    assertEqual(r.duration, 30)
  })
  it('photos 透传并拷贝', function () {
    const r = buildRecord(cmd, rd, ctx)
    assertEqual(r.photos.length, 2)
    assertEqual(r.photos[0], 'p1.jpg')
    assert(r.photos !== rd.photos, 'photos 未拷贝（同一引用）')
  })
  it('feeling 透传', function () {
    const r = buildRecord(cmd, rd, ctx)
    assertEqual(r.feeling, '今天阳光很好')
  })
  it('mood 透传', function () {
    const r = buildRecord(cmd, rd, ctx)
    assertEqual(r.mood, 'happy')
  })
  it('location 从 ctx 取', function () {
    const r = buildRecord(cmd, rd, ctx)
    assert(r.location === ctx.location, 'location 未取 ctx.location')
  })
  it('weather 从 ctx 取', function () {
    const r = buildRecord(cmd, rd, ctx)
    assertEqual(r.weather, 'sunny')
  })
  it('date 基于 now', function () {
    const r = buildRecord(cmd, rd, ctx)
    assertEqual(r.date, '2026-03-15')
  })
  it('time 基于 now', function () {
    const r = buildRecord(cmd, rd, ctx)
    assertEqual(r.time, '14:30')
  })
  it('filter 透传', function () {
    const r = buildRecord(cmd, rd, ctx)
    assertEqual(r.filter, 'warm')
  })
  it('stickers 透传并拷贝', function () {
    const r = buildRecord(cmd, rd, ctx)
    assertEqual(r.stickers.length, 2)
    assertEqual(r.stickers[0], '🌟')
    assert(r.stickers !== rd.stickers, 'stickers 未拷贝')
  })
  it('rotation 范围 [-2, 2)', function () {
    // 多次采样确认范围
    let ok = true
    for (let i = 0; i < 50; i++) {
      const r = buildRecord(cmd, rd, ctx)
      if (r.rotation < -2 || r.rotation >= 2) { ok = false; break }
    }
    assert(ok, 'rotation 越界 [-2,2)')
  })
  it('普通记录不带 isGroup/groupId/members/steps 键', function () {
    const r = buildRecord(cmd, rd, ctx)
    assert(!('isGroup' in r), '普通记录不应有 isGroup')
    assert(!('groupId' in r), '普通记录不应有 groupId')
    assert(!('members' in r), '普通记录不应有 members')
    assert(!('steps' in r), '普通记录不应有 steps')
  })
})

// ============================================================
// title / content / type / mood / filter 优先级与兜底
// ============================================================
describe('字段优先级与兜底', function () {
  it('title 缺失时回退到 content', function () {
    const r = buildRecord({ id: 'x', content: '用 content 当标题' }, {}, { now: FIXED_NOW })
    assertEqual(r.commandTitle, '用 content 当标题')
  })
  it('title 与 content 都缺失时回退到「出逃记忆」', function () {
    const r = buildRecord({ id: 'x' }, {}, { now: FIXED_NOW })
    assertEqual(r.commandTitle, '出逃记忆')
  })
  it('content 缺失时 commandContent 回退到 title', function () {
    const r = buildRecord({ id: 'x', title: '只有标题' }, {}, { now: FIXED_NOW })
    assertEqual(r.commandContent, '只有标题')
  })
  it('content 与 title 都缺失时 commandContent 回退到「出逃记忆」', function () {
    const r = buildRecord({ id: 'x' }, {}, { now: FIXED_NOW })
    assertEqual(r.commandContent, '出逃记忆')
  })
  it('type 缺失或非字符串时回退 custom', function () {
    assertEqual(buildRecord({ id: 'x' }, {}, { now: FIXED_NOW }).commandType, 'custom')
    assertEqual(buildRecord({ id: 'x', type: '' }, {}, { now: FIXED_NOW }).commandType, 'custom')
    assertEqual(buildRecord({ id: 'x', type: 123 }, {}, { now: FIXED_NOW }).commandType, 'custom')
  })
  it('type 为字符串时透传', function () {
    assertEqual(buildRecord({ id: 'x', type: 'walk' }, {}, { now: FIXED_NOW }).commandType, 'walk')
  })
  it('typeColor 缺失时回退 #5CBF9E', function () {
    const r = buildRecord({ id: 'x' }, {}, { now: FIXED_NOW })
    assertEqual(r.typeColor, '#5CBF9E')
  })
  it('mood 缺失时回退 calm', function () {
    const r = buildRecord({ id: 'x' }, {}, { now: FIXED_NOW })
    assertEqual(r.mood, 'calm')
  })
  it('filter 缺失时回退 day', function () {
    const r = buildRecord({ id: 'x' }, {}, { now: FIXED_NOW })
    assertEqual(r.filter, 'day')
  })
  it('commandId 缺失时空字符串', function () {
    const r = buildRecord({}, {}, { now: FIXED_NOW })
    assertEqual(r.commandId, '')
  })
})

// ============================================================
// location 三级优先级
// ============================================================
describe('location 优先级', function () {
  const locRd = { latitude: 30, longitude: 120, name: 'rd 位置' }
  const locCtx = { latitude: 31, longitude: 121, name: 'ctx 位置' }

  it('rd.location 优先于 ctx.location', function () {
    const r = buildRecord({ id: 'x' }, { location: locRd }, { location: locCtx, now: FIXED_NOW })
    assert(r.location === locRd, '未优先 rd.location')
    assertEqual(r.location.name, 'rd 位置')
  })
  it('rd.location 缺失时取 ctx.location', function () {
    const r = buildRecord({ id: 'x' }, {}, { location: locCtx, now: FIXED_NOW })
    assert(r.location === locCtx, '未取 ctx.location')
    assertEqual(r.location.name, 'ctx 位置')
  })
  it('两者都缺失时为 null', function () {
    const r = buildRecord({ id: 'x' }, {}, { now: FIXED_NOW })
    assertEqual(r.location, null)
  })
  it('rd.location 为非对象（字符串）时回退 ctx.location', function () {
    const r = buildRecord({ id: 'x' }, { location: '不是对象' }, { location: locCtx, now: FIXED_NOW })
    assert(r.location === locCtx, 'rd.location 非对象未回退 ctx.location')
  })
  it('rd.location 为 null 时回退 ctx.location', function () {
    const r = buildRecord({ id: 'x' }, { location: null }, { location: locCtx, now: FIXED_NOW })
    assert(r.location === locCtx, 'rd.location=null 未回退 ctx.location')
  })
  it('rd.location 为数组时回退 ctx.location', function () {
    const r = buildRecord({ id: 'x' }, { location: [1, 2] }, { location: locCtx, now: FIXED_NOW })
    assert(r.location === locCtx, 'rd.location=数组 未回退 ctx.location')
  })
})

// ============================================================
// duration 计算与下界
// ============================================================
describe('duration 计算与下界', function () {
  it('startTime 早于 now 1 小时 → 60 分钟', function () {
    const r = buildRecord({ id: 'x', startTime: FIXED_NOW - 60 * 60 * 1000 }, {}, { now: FIXED_NOW })
    assertEqual(r.duration, 60)
  })
  it('startTime 缺失时 duration=1（回退 now）', function () {
    const r = buildRecord({ id: 'x' }, {}, { now: FIXED_NOW })
    assertEqual(r.duration, 1)
  })
  it('now === startTime 时 duration=1（下界）', function () {
    // 变异 G-d1: Math.max(1,...) → Math.max(0,...) 会让 0 出现
    const r = buildRecord({ id: 'x', startTime: FIXED_NOW }, {}, { now: FIXED_NOW })
    assertEqual(r.duration, 1)
  })
  it('now < startTime 时 duration=1（负数下界）', function () {
    const r = buildRecord({ id: 'x', startTime: FIXED_NOW + 10 * 60 * 1000 }, {}, { now: FIXED_NOW })
    assertEqual(r.duration, 1)
  })
  it('非整分钟数四舍五入（90 秒 → 2 分钟）', function () {
    const r = buildRecord({ id: 'x', startTime: FIXED_NOW - 90 * 1000 }, {}, { now: FIXED_NOW })
    assertEqual(r.duration, 2)
  })
  it('29.5 分钟 → 30 分钟（Math.round 四舍五入）', function () {
    const r = buildRecord({ id: 'x', startTime: FIXED_NOW - 29.5 * 60 * 1000 }, {}, { now: FIXED_NOW })
    assertEqual(r.duration, 30)
  })
})

// ============================================================
// photos 上限 9
// ============================================================
describe('photos 上限', function () {
  it('正好 9 张全保留', function () {
    const photos = []
    for (let i = 0; i < 9; i++) photos.push('p' + i + '.jpg')
    const r = buildRecord({ id: 'x' }, { photos }, { now: FIXED_NOW })
    assertEqual(r.photos.length, 9)
  })
  it('超过 9 张截断为 9（变异 G-p1: slice(0,9)→slice(0,8) 会让 8 出现）', function () {
    const photos = []
    for (let i = 0; i < 15; i++) photos.push('p' + i + '.jpg')
    const r = buildRecord({ id: 'x' }, { photos }, { now: FIXED_NOW })
    assertEqual(r.photos.length, 9)
    assertEqual(r.photos[8], 'p8.jpg')
  })
  it('非数组时为空数组', function () {
    assertEqual(buildRecord({ id: 'x' }, { photos: '不是数组' }, { now: FIXED_NOW }).photos.length, 0)
    assertEqual(buildRecord({ id: 'x' }, { photos: null }, { now: FIXED_NOW }).photos.length, 0)
    assertEqual(buildRecord({ id: 'x' }, { photos: 123 }, { now: FIXED_NOW }).photos.length, 0)
  })
  it('返回的 photos 是拷贝，修改不影响原数组', function () {
    const photos = ['a.jpg', 'b.jpg']
    const r = buildRecord({ id: 'x' }, { photos }, { now: FIXED_NOW })
    r.photos.push('c.jpg')
    assertEqual(photos.length, 2, '修改返回数组污染了原数组')
  })
})

// ============================================================
// feeling 截断 200
// ============================================================
describe('feeling 截断', function () {
  it('正好 200 字符全保留', function () {
    const s = 'a'.repeat(200)
    const r = buildRecord({ id: 'x' }, { feeling: s }, { now: FIXED_NOW })
    assertEqual(r.feeling.length, 200)
  })
  it('超过 200 字符截断为 200（变异 G-f1: slice(0,200)→slice(0,199) 会让 199 出现）', function () {
    const s = 'b'.repeat(250)
    const r = buildRecord({ id: 'x' }, { feeling: s }, { now: FIXED_NOW })
    assertEqual(r.feeling.length, 200)
  })
  it('非字符串时为空字符串', function () {
    assertEqual(buildRecord({ id: 'x' }, { feeling: 123 }, { now: FIXED_NOW }).feeling, '')
    assertEqual(buildRecord({ id: 'x' }, { feeling: null }, { now: FIXED_NOW }).feeling, '')
    assertEqual(buildRecord({ id: 'x' }, { feeling: ['arr'] }, { now: FIXED_NOW }).feeling, '')
  })
})

// ============================================================
// stickers 拷贝
// ============================================================
describe('stickers 拷贝', function () {
  it('数组透传并拷贝', function () {
    const stickers = ['🌟', '🌙']
    const r = buildRecord({ id: 'x' }, { stickers }, { now: FIXED_NOW })
    assertEqual(r.stickers.length, 2)
    assert(r.stickers !== stickers, 'stickers 未拷贝')
    r.stickers.push('x')
    assertEqual(stickers.length, 2, '修改返回 stickers 污染原数组')
  })
  it('非数组时为空数组', function () {
    assertEqual(buildRecord({ id: 'x' }, { stickers: 'str' }, { now: FIXED_NOW }).stickers.length, 0)
    assertEqual(buildRecord({ id: 'x' }, { stickers: null }, { now: FIXED_NOW }).stickers.length, 0)
  })
})

// ============================================================
// weather 归一化
// ============================================================
describe('weather 归一化', function () {
  it('ctx.weather 为字符串时透传', function () {
    const r = buildRecord({ id: 'x' }, {}, { weather: 'rainy', now: FIXED_NOW })
    assertEqual(r.weather, 'rainy')
  })
  it('ctx.weather 为 null 时透传 null', function () {
    const r = buildRecord({ id: 'x' }, {}, { weather: null, now: FIXED_NOW })
    assertEqual(r.weather, null)
  })
  it('ctx.weather 为 undefined 时为 null（缺省）', function () {
    const r = buildRecord({ id: 'x' }, {}, { now: FIXED_NOW })
    assertEqual(r.weather, null)
  })
})

// ============================================================
// now / startTime 归一化
// ============================================================
describe('now / startTime 归一化', function () {
  it('ctx.now 非数字时回退 Date.now()', function () {
    const r = buildRecord({ id: 'x' }, {}, { now: 'abc' })
    assert(/^r_\d+$/.test(r.id), 'now 非数字时 id 格式错误: ' + r.id)
  })
  it('ctx.now 为 NaN 时回退 Date.now()', function () {
    const r = buildRecord({ id: 'x' }, {}, { now: NaN })
    assert(/^r_\d+$/.test(r.id), 'now=NaN 时 id 格式错误')
  })
  it('ctx.now 为 Infinity 时回退 Date.now()', function () {
    const r = buildRecord({ id: 'x' }, {}, { now: Infinity })
    assert(/^r_\d+$/.test(r.id), 'now=Infinity 时 id 格式错误')
  })
  it('ctx 缺失时 now 回退 Date.now()', function () {
    const r = buildRecord({ id: 'x' }, {})
    assert(/^r_\d+$/.test(r.id), 'ctx 缺失时 id 格式错误')
  })
  it('startTime 为 NaN 时回退 now（duration=1）', function () {
    const r = buildRecord({ id: 'x', startTime: NaN }, {}, { now: FIXED_NOW })
    assertEqual(r.duration, 1)
  })
  it('startTime 为 Infinity 时回退 now（duration=1）', function () {
    const r = buildRecord({ id: 'x', startTime: Infinity }, {}, { now: FIXED_NOW })
    assertEqual(r.duration, 1)
  })
  it('startTime 为非数字字符串时回退 now（duration=1）', function () {
    const r = buildRecord({ id: 'x', startTime: 'abc' }, {}, { now: FIXED_NOW })
    assertEqual(r.duration, 1)
  })
})

// ============================================================
// 同频出逃扩展字段
// ============================================================
describe('同频记录扩展字段', function () {
  const groupCmd = {
    id: 'group_room123',
    title: '同频探店',
    content: '和朋友一起探店',
    type: 'sync',
    typeColor: '#5CBF9E',
    startTime: START_30
  }
  const groupRd = {
    isGroup: true,
    groupId: 'room123',
    members: ['Alice', 'Bob', 'Carol'],
    steps: ['集合', '探店', '合影'],
    mood: 'happy'
  }
  const groupCtx = { now: FIXED_NOW, location: { latitude: 31.2, longitude: 121.4, name: '探店点' } }

  it('isGroup=true 时注入 isGroup/groupId/members/steps', function () {
    const r = buildRecord(groupCmd, groupRd, groupCtx)
    assertEqual(r.isGroup, true)
    assertEqual(r.groupId, 'room123')
    assertEqual(r.members.length, 3)
    assertEqual(r.members[0], 'Alice')
    assertEqual(r.steps.length, 3)
    assertEqual(r.steps[2], '合影')
  })
  it('isGroup=false 时不注入扩展字段', function () {
    const r = buildRecord(groupCmd, Object.assign({}, groupRd, { isGroup: false }), groupCtx)
    assert(!('isGroup' in r), 'isGroup=false 仍注入了 isGroup')
    assert(!('groupId' in r))
    assert(!('members' in r))
    assert(!('steps' in r))
  })
  it('isGroup 缺失时不注入扩展字段', function () {
    const rd = Object.assign({}, groupRd)
    delete rd.isGroup
    const r = buildRecord(groupCmd, rd, groupCtx)
    assert(!('isGroup' in r), 'isGroup 缺失仍注入了扩展字段')
  })
  it('isGroup 非严格 true（如 1/"true"）不注入', function () {
    const r1 = buildRecord(groupCmd, Object.assign({}, groupRd, { isGroup: 1 }), groupCtx)
    assert(!('isGroup' in r1), 'isGroup=1 仍注入（应为严格 true）')
    const r2 = buildRecord(groupCmd, Object.assign({}, groupRd, { isGroup: 'true' }), groupCtx)
    assert(!('isGroup' in r2), 'isGroup="true" 仍注入')
  })
  it('isGroup=true 但 groupId 非字符串时为空串', function () {
    const r = buildRecord(groupCmd, Object.assign({}, groupRd, { groupId: 123 }), groupCtx)
    assertEqual(r.groupId, '')
  })
  it('isGroup=true 但 groupId 缺失时为空串', function () {
    const rd = Object.assign({}, groupRd)
    delete rd.groupId
    const r = buildRecord(groupCmd, rd, groupCtx)
    assertEqual(r.groupId, '')
  })
  it('isGroup=true 但 members 非数组时为空数组', function () {
    const r = buildRecord(groupCmd, Object.assign({}, groupRd, { members: 'Alice' }), groupCtx)
    assertEqual(Array.isArray(r.members), true)
    assertEqual(r.members.length, 0)
  })
  it('isGroup=true 但 steps 非数组时为空数组', function () {
    const r = buildRecord(groupCmd, Object.assign({}, groupRd, { steps: { a: 1 } }), groupCtx)
    assertEqual(Array.isArray(r.steps), true)
    assertEqual(r.steps.length, 0)
  })
  it('members/steps 是拷贝，修改不影响原数组', function () {
    const members = ['A', 'B']
    const steps = ['s1', 's2']
    const r = buildRecord(groupCmd, { isGroup: true, groupId: 'g', members, steps }, groupCtx)
    r.members.push('C')
    r.steps.push('s3')
    assertEqual(members.length, 2, 'members 拷贝失效')
    assertEqual(steps.length, 2, 'steps 拷贝失效')
  })
  it('同频记录仍带普通字段（location/photos/feeling）', function () {
    const r = buildRecord(groupCmd, groupRd, groupCtx)
    assertEqual(r.commandType, 'sync')
    assertEqual(r.mood, 'happy')
    assert(r.location === groupCtx.location, '同频记录 location 未取 ctx')
    assertEqual(r.duration, 30)
  })
})

// ============================================================
// 不变性：不污染入参
// ============================================================
describe('入参不变性', function () {
  it('不修改 cmd', function () {
    const cmd = { id: 'x', title: 't', type: 'walk', startTime: START_30 }
    const snapshot = JSON.stringify(cmd)
    buildRecord(cmd, { photos: ['a'] }, { now: FIXED_NOW })
    assertEqual(JSON.stringify(cmd), snapshot, 'cmd 被修改')
  })
  it('不修改 recordData', function () {
    const rd = { photos: ['a', 'b'], stickers: ['s'], feeling: 'f', isGroup: true, groupId: 'g', members: ['m'], steps: ['st'] }
    const snapshot = JSON.stringify(rd)
    buildRecord({ id: 'x' }, rd, { now: FIXED_NOW })
    assertEqual(JSON.stringify(rd), snapshot, 'recordData 被修改')
  })
  it('不修改 ctx', function () {
    const ctx = { location: { latitude: 1 }, weather: 'sunny', now: FIXED_NOW }
    const snapshot = JSON.stringify(ctx)
    buildRecord({ id: 'x' }, {}, ctx)
    assertEqual(JSON.stringify(ctx), snapshot, 'ctx 被修改')
  })
})

// ============================================================
// 边界：全入参缺失/异常类型不抛异常
// ============================================================
describe('边界容错', function () {
  it('所有入参为 null 不抛异常', function () {
    let r
    assert.doesNotThrow ? null : null
    try {
      r = buildRecord(null, null, null)
    } catch (e) {
      failCount++
      failures.push('buildRecord(null,null,null) 抛异常: ' + e.message)
      return
    }
    assert(r && typeof r === 'object', '返回非对象')
    assertEqual(r.commandType, 'custom')
    assertEqual(r.mood, 'calm')
    assertEqual(r.filter, 'day')
    assertEqual(r.location, null)
    assertEqual(r.weather, null)
    assertEqual(r.duration, 1)
  })
  it('所有入参为 undefined 不抛异常', function () {
    let r
    try {
      r = buildRecord(undefined, undefined, undefined)
    } catch (e) {
      failCount++
      failures.push('buildRecord(undefined,undefined,undefined) 抛异常: ' + e.message)
      return
    }
    assert(r && typeof r === 'object')
  })
  it('cmd 为字符串/数字时不抛异常', function () {
    try {
      const r1 = buildRecord('str', {}, { now: FIXED_NOW })
      assertEqual(r1.commandId, '')
      const r2 = buildRecord(42, {}, { now: FIXED_NOW })
      assertEqual(r2.commandType, 'custom')
    } catch (e) {
      failCount++
      failures.push('cmd 非对象抛异常: ' + e.message)
    }
  })
  it('recordData 为数组/字符串时不抛异常', function () {
    try {
      const r1 = buildRecord({ id: 'x' }, ['arr'], { now: FIXED_NOW })
      assertEqual(r1.photos.length, 0)
      const r2 = buildRecord({ id: 'x' }, 'str', { now: FIXED_NOW })
      assertEqual(r2.feeling, '')
    } catch (e) {
      failCount++
      failures.push('recordData 非对象抛异常: ' + e.message)
    }
  })
  it('ctx 为数组时不抛异常（now 回退 Date.now）', function () {
    try {
      const r = buildRecord({ id: 'x' }, {}, [1, 2])
      assert(/^r_\d+$/.test(r.id), 'ctx=数组时 id 格式错误')
      assertEqual(r.weather, null)
    } catch (e) {
      failCount++
      failures.push('ctx=数组抛异常: ' + e.message)
    }
  })
})

// ============================================================
// 数据联动一致性（普通 vs 同频结构对齐）
// ============================================================
describe('数据联动一致性', function () {
  it('普通与同频记录共享同一组基础字段', function () {
    const baseKeys = ['id', 'commandId', 'commandTitle', 'commandContent', 'commandType',
      'typeColor', 'duration', 'photos', 'feeling', 'mood', 'location', 'weather',
      'date', 'time', 'rotation', 'filter', 'stickers']
    const normal = buildRecord({ id: 'n', title: '普通' }, { mood: 'calm' }, { now: FIXED_NOW })
    const group = buildRecord({ id: 'g', title: '同频' }, { isGroup: true, groupId: 'r', members: [], steps: [] }, { now: FIXED_NOW })
    baseKeys.forEach(k => {
      assert(k in normal, '普通记录缺基础字段: ' + k)
      assert(k in group, '同频记录缺基础字段: ' + k)
    })
    // 同频额外 4 字段
    const groupExtra = ['isGroup', 'groupId', 'members', 'steps']
    groupExtra.forEach(k => {
      assert(!(k in normal), '普通记录不应有: ' + k)
      assert(k in group, '同频记录缺扩展字段: ' + k)
    })
  })
  it('同频记录的 location 可被地图页消费（含 latitude/longitude）', function () {
    const r = buildRecord(
      { id: 'g', title: '同频', startTime: START_30 },
      { isGroup: true, groupId: 'room1', members: ['A'], steps: ['s1'] },
      { now: FIXED_NOW, location: { latitude: 31.23, longitude: 121.47, name: '人民广场' } }
    )
    assert(r.location && typeof r.location.latitude === 'number', 'location.latitude 缺失')
    assert(r.location && typeof r.location.longitude === 'number', 'location.longitude 缺失')
  })
  it('同频记录 id 唯一性（基于 now）', function () {
    const r1 = buildRecord({ id: 'g1' }, { isGroup: true, groupId: 'r1', members: [], steps: [] }, { now: 1000 })
    const r2 = buildRecord({ id: 'g2' }, { isGroup: true, groupId: 'r2', members: [], steps: [] }, { now: 2000 })
    assert(r1.id !== r2.id, '同频记录 id 不唯一')
  })
})

// ============================================================
// executionProgress 留痕 steps（每步 completedAt 时间戳）
// ============================================================
describe('executionProgress 留痕 steps', function () {
  it('同频 + executionProgress → steps 升级为 [{text, completedAt}]', function () {
    const ep = {
      steps: [
        { id: 1, text: '出门', done: true, completedAt: T1 },
        { id: 2, text: '拍照', done: true, completedAt: T2 },
        { id: 3, text: '记录', done: false, completedAt: null }
      ]
    }
    const r = buildRecord(
      { id: 'g', title: '同频', startTime: START_30 },
      { isGroup: true, groupId: 'room1', members: ['A'], steps: ['出门', '拍照', '记录'], executionProgress: ep },
      { now: FIXED_NOW }
    )
    assert(Array.isArray(r.steps), 'steps 是数组')
    assertEqual(r.steps.length, 3, 'steps 长度')
    assertEqual(typeof r.steps[0], 'object', 'step0 是对象')
    assertEqual(r.steps[0].text, '出门', 'step0 text')
    assertEqual(r.steps[0].completedAt, T1, 'step0 completedAt 留痕')
    assertEqual(r.steps[1].completedAt, T2, 'step1 completedAt 留痕')
    assertEqual(r.steps[2].completedAt, null, 'step2 未完成 completedAt=null')
  })

  it('同频 + 无 executionProgress → steps 回退文本数组（向后兼容）', function () {
    const r = buildRecord(
      { id: 'g', title: '同频' },
      { isGroup: true, groupId: 'room1', members: [], steps: ['s1', 's2'] },
      { now: FIXED_NOW }
    )
    assertEqual(r.steps.length, 2, 'steps 长度')
    assertEqual(r.steps[0], 's1', 'step0 是文本字符串')
    assertEqual(typeof r.steps[0], 'string', '向后兼容为文本数组')
  })

  it('普通 + executionProgress → 也带留痕 steps', function () {
    const ep = {
      steps: [
        { id: 1, text: '出门', done: true, completedAt: T1 },
        { id: 2, text: '拍照', done: false, completedAt: null }
      ]
    }
    const r = buildRecord(
      { id: 'n', title: '普通' },
      { mood: 'calm', steps: ['出门', '拍照'], executionProgress: ep },
      { now: FIXED_NOW }
    )
    assert(Array.isArray(r.steps), '普通记录也带 steps')
    assertEqual(r.steps[0].completedAt, T1, 'step0 completedAt 留痕')
    assertEqual(r.steps[1].completedAt, null, 'step1 未完成 null')
  })

  it('普通 + 无 executionProgress → 无 steps 字段（保持结构干净）', function () {
    const r = buildRecord({ id: 'n', title: '普通' }, { mood: 'calm' }, { now: FIXED_NOW })
    assert(!('steps' in r), '普通记录无 executionProgress 时不应有 steps 字段')
  })

  it('text 优先用 rd.steps，兜底 ep.steps[i].text', function () {
    const ep = { steps: [{ text: '旧文本', done: true, completedAt: T1 }] }
    const r = buildRecord(
      { id: 'n', title: '普通' },
      { steps: ['最终文本'], executionProgress: ep },
      { now: FIXED_NOW }
    )
    assertEqual(r.steps[0].text, '最终文本', '优先用 rd.steps 的文本')
  })

  it('rd.steps 缺失时兜底 ep.steps[i].text', function () {
    const ep = { steps: [{ text: '兜底文本', done: true, completedAt: T1 }] }
    const r = buildRecord(
      { id: 'n', title: '普通' },
      { executionProgress: ep },
      { now: FIXED_NOW }
    )
    assertEqual(r.steps[0].text, '兜底文本', '兜底 ep 文本')
  })

  it('executionProgress 为空对象/无 steps → 不留痕（回退）', function () {
    const r1 = buildRecord({ id: 'n' }, { isGroup: true, groupId: 'r', members: [], steps: ['s1'], executionProgress: {} }, { now: FIXED_NOW })
    assertEqual(r1.steps[0], 's1', '空 ep 回退文本')
    const r2 = buildRecord({ id: 'n' }, { isGroup: true, groupId: 'r', members: [], steps: ['s1'], executionProgress: null }, { now: FIXED_NOW })
    assertEqual(r2.steps[0], 's1', 'null ep 回退文本')
  })

  it('_internal.buildTracedSteps 导出', function () {
    assert(typeof I.buildTracedSteps === 'function', 'buildTracedSteps 导出为函数')
    const traced = I.buildTracedSteps({ steps: ['A'], executionProgress: { steps: [{ text: 'A', completedAt: T1 }] } })
    assertEqual(traced[0].text, 'A', 'buildTracedSteps text')
    assertEqual(traced[0].completedAt, T1, 'buildTracedSteps completedAt')
    assertEqual(I.buildTracedSteps({}), null, '无 ep 返回 null')
  })
})

// ============================================================
// injectGroupFields：同频扩展字段自动注入（completeCommand 委托）
// 保证 record 页 onSave 只传基础字段时，同频记录 isGroup/groupId/members/steps 完整
// ============================================================
describe('injectGroupFields 同频字段自动注入', function () {
  const inject = builder.injectGroupFields

  it('导出为函数（顶层 + _internal）', function () {
    assertEqual(typeof inject, 'function', 'injectGroupFields 顶层导出')
    assertEqual(typeof I.injectGroupFields, 'function', 'injectGroupFields _internal 导出')
  })

  it('cmd.isGroup=true 且 rd 无 isGroup → 注入 isGroup/groupId/members/steps', function () {
    const cmd = { isGroup: true, groupId: 'R1', members: ['A', 'B'], steps: ['s1', 's2'] }
    const rd = { photos: [], feeling: 'x' }
    const out = inject(cmd, rd)
    assertEqual(out.isGroup, true, '注入 isGroup')
    assertEqual(out.groupId, 'R1', '注入 groupId')
    assertEqual(out.members.length, 2, '注入 members')
    assertEqual(out.steps.length, 2, '注入 steps')
    assertEqual(out.feeling, 'x', '保留原 rd 字段')
    assertEqual(out.photos.length, 0, '保留原 rd photos')
  })

  it('rd.isGroup=true 时不覆盖（rd 已显式传，优先级高）', function () {
    const cmd = { isGroup: true, groupId: 'R1', members: ['A'], steps: ['s1'] }
    const rd = { isGroup: true, groupId: 'OVERRIDE', members: ['X'], steps: ['y'] }
    const out = inject(cmd, rd)
    assertEqual(out.groupId, 'OVERRIDE', 'rd.groupId 优先')
    assertEqual(out.members[0], 'X', 'rd.members 优先')
    assertEqual(out.steps[0], 'y', 'rd.steps 优先')
  })

  it('cmd 无 isGroup → 不注入（普通出逃零影响）', function () {
    const cmd = { id: 'c1', type: 'walk' }
    const rd = { photos: [] }
    const out = inject(cmd, rd)
    assertEqual(out.isGroup, undefined, '不注入 isGroup')
    assertEqual(out.groupId, undefined, '不注入 groupId')
    assertEqual(out.members, undefined, '不注入 members')
    assertEqual(out.steps, undefined, '不注入 steps')
  })

  it('纯函数：注入时返回新对象，不修改入参 rd', function () {
    const cmd = { isGroup: true, groupId: 'R1', members: ['A'], steps: ['s1'] }
    const rd = { photos: [] }
    const out = inject(cmd, rd)
    assert(out !== rd, '注入时返回新对象')
    assertEqual(rd.isGroup, undefined, '入参 rd 未被修改')
    assertEqual(rd.groupId, undefined, '入参 rd.groupId 未被修改')
  })

  it('不注入时返回原 rd 引用（零拷贝）', function () {
    const cmd = { id: 'c1' }
    const rd = { photos: [] }
    const out = inject(cmd, rd)
    assert(out === rd, '不注入时返回原对象引用')
  })

  it('cmd 为 null → 不注入不抛异常', function () {
    const out = inject(null, { photos: [] })
    assertEqual(out.isGroup, undefined)
  })

  it('rd 为 null → safeObj 处理后注入', function () {
    const out = inject({ isGroup: true, groupId: 'R', members: [], steps: [] }, null)
    assertEqual(out.isGroup, true, 'rd=null 时仍注入')
    assertEqual(out.groupId, 'R')
  })
})

// ============================================================
// C-12: buildGroupSummary 共同记录摘要
// ============================================================
describe('C-12: buildGroupSummary', function () {
  const buildGroupSummary = builder.buildGroupSummary

  it('字符串成员数组 + 留痕 steps', function () {
    const record = {
      isGroup: true,
      groupId: 'g1',
      members: ['发起人', '阿月', '小林'],
      steps: [
        { text: '找咖啡馆', completedAt: 1700000000000 },
        { text: '点单', completedAt: 1700000600000 }
      ]
    }
    const s = buildGroupSummary(record)
    assertEqual(s.isGroup, true)
    assertEqual(s.members.length, 3)
    assertEqual(s.members[0], '发起人')
    assertEqual(s.stepTraces.length, 2)
    assertEqual(s.stepTraces[0].text, '找咖啡馆')
    assertEqual(s.stepTraces[0].completedAt, 1700000000000)
    assertEqual(s.stepTraces[1].text, '点单')
  })

  it('对象成员数组（含 nickname）', function () {
    const record = {
      isGroup: true,
      members: [{ nickname: '发起人' }, { nickname: '阿月' }],
      steps: []
    }
    const s = buildGroupSummary(record)
    assertEqual(s.members.length, 2)
    assertEqual(s.members[0], '发起人')
    assertEqual(s.members[1], '阿月')
  })

  it('文本 steps 数组 → completedAt=null', function () {
    const record = {
      isGroup: true,
      members: ['a'],
      steps: ['第一步', '第二步']
    }
    const s = buildGroupSummary(record)
    assertEqual(s.stepTraces.length, 2)
    assertEqual(s.stepTraces[0].text, '第一步')
    assertEqual(s.stepTraces[0].completedAt, null)
    assertEqual(s.stepTraces[1].completedAt, null)
  })

  it('非同频记录 → isGroup=false，members/steps 空', function () {
    const record = { commandTitle: '普通', steps: [{ text: 'x', completedAt: 1 }] }
    const s = buildGroupSummary(record)
    assertEqual(s.isGroup, false)
    assertEqual(s.members.length, 0)
    // steps 仍解析（普通记录可能有留痕），但调用方按 isGroup 判断不展示
    assertEqual(s.stepTraces.length, 1)
  })

  it('null 入参安全返回', function () {
    const s = buildGroupSummary(null)
    assertEqual(s.ok, true)
    assertEqual(s.isGroup, false)
    assertEqual(s.members.length, 0)
    assertEqual(s.stepTraces.length, 0)
  })

  it('undefined 入参安全返回', function () {
    const s = buildGroupSummary(undefined)
    assertEqual(s.isGroup, false)
    assertEqual(s.members.length, 0)
  })

  it('members 含 null/数字/对象混合 → 全部转字符串', function () {
    const record = {
      isGroup: true,
      members: ['a', null, 42, { nickname: 'b' }, undefined],
      steps: []
    }
    const s = buildGroupSummary(record)
    // null/undefined 被跳过（m != null 判断），a/42/b 保留
    assertEqual(s.members.length, 3)
    assertEqual(s.members[0], 'a')
    assertEqual(s.members[1], '42')
    assertEqual(s.members[2], 'b')
  })

  it('steps 含 null/数字/对象混合', function () {
    const record = {
      isGroup: true,
      members: [],
      steps: [null, '文本', 42, { text: '对象' }]
    }
    const s = buildGroupSummary(record)
    assertEqual(s.stepTraces.length, 4)
    assertEqual(s.stepTraces[0].text, '')
    assertEqual(s.stepTraces[0].completedAt, null)
    assertEqual(s.stepTraces[1].text, '文本')
    assertEqual(s.stepTraces[2].text, '42')
    assertEqual(s.stepTraces[3].text, '对象')
  })

  it('steps 非数组 → stepTraces 空', function () {
    const record = { isGroup: true, members: ['a'], steps: 'notarray' }
    const s = buildGroupSummary(record)
    assertEqual(s.stepTraces.length, 0)
  })

  it('入参不被修改（纯函数）', function () {
    const record = {
      isGroup: true,
      members: ['a', 'b'],
      steps: [{ text: 'x', completedAt: 1 }]
    }
    const snapshot = JSON.stringify(record)
    buildGroupSummary(record)
    assertEqual(JSON.stringify(record), snapshot, '入参不应被修改')
  })

  it('_internal.buildGroupSummary === buildGroupSummary', function () {
    assert(builder._internal.buildGroupSummary === buildGroupSummary, '应同一引用')
  })
})

// ===== 结果输出 =====
console.log('\n' + '='.repeat(50))
console.log('Record Builder 单元测试结果: ' + passCount + ' passed, ' + failCount + ' failed')
if (failures.length > 0) {
  console.log('\n失败项:')
  failures.forEach(f => console.log('  - ' + f))
}
console.log('='.repeat(50))
process.exit(failCount > 0 ? 1 : 0)
