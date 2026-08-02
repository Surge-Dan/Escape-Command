// tests/unit/safety-tip.test.js
// safety-tip 单元测试
// 运行: node tests/unit/safety-tip.test.js
//
// 覆盖维度（PRD §15 安全与信任体系）：
//   1. getTip: 7 分支
//      - 极端天气阻断户外（暴雨/雷/雪/高温/严寒）
//      - 深夜独自 + 户外（距离 >1.5 / <=1.5 分支）
//      - 深夜同频 + 户外
//      - 夜晚（19-22）独自户外
//      - 破圈模式
//      - 同频出逃
//      - 默认普通出逃
//   2. shouldPauseOutdoorTask:
//      - 室内任务永不阻断
//      - 户外极端天气阻断
//      - 户外正常天气不阻断
//   3. emergencyExitHint:
//      - 同频模式文案 vs 独自文案
//   4. buildShareLocationPayload:
//      - 完整 location → ok=true + location payload
//      - 缺 latitude/longitude → ok=false
//      - 非 object → ok=false
//      - 缺 name/address 时兜底文案
//   5. buildShareCardPayload:
//      - 完整 escapeName + commandTitle
//      - 缺 escapeName 时兜底
//   6. buildSafetyState:
//      - 综合返回 tip/pause/exit/level/action
//   7. 不变性：纯函数，不污染入参
//   8. 边界：全入参缺失/null/字符串不抛异常

'use strict'

const safety = require('../../utils/safety-tip.js')
const getTip = safety.getTip
const shouldPauseOutdoorTask = safety.shouldPauseOutdoorTask
const emergencyExitHint = safety.emergencyExitHint
const buildShareLocationPayload = safety.buildShareLocationPayload
const buildShareCardPayload = safety.buildShareCardPayload
const buildSafetyState = safety.buildSafetyState
const I = safety._internal

// ===== 自定义测试框架（与 record-builder.test.js / store.test.js 风格一致）=====
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
// 模块导出与内部工具
// ============================================================
describe('模块导出', function () {
  it('导出 LEVEL 常量', function () {
    assertEqual(safety.LEVEL.INFO, 'info')
    assertEqual(safety.LEVEL.WARN, 'warn')
    assertEqual(safety.LEVEL.DANGER, 'danger')
  })
  it('导出顶层 5 个函数', function () {
    assertEqual(typeof getTip, 'function')
    assertEqual(typeof shouldPauseOutdoorTask, 'function')
    assertEqual(typeof emergencyExitHint, 'function')
    assertEqual(typeof buildShareLocationPayload, 'function')
    assertEqual(typeof buildShareCardPayload, 'function')
    assertEqual(typeof buildSafetyState, 'function')
  })
  it('_internal 导出 4 个判定函数', function () {
    assertEqual(typeof I.periodOfDay, 'function')
    assertEqual(typeof I.isExtremeWeather, 'function')
    assertEqual(typeof I.isNight, 'function')
    assertEqual(typeof I.isLateNight, 'function')
  })
})

// ============================================================
// 内部判定函数
// ============================================================
describe('内部判定 - periodOfDay', function () {
  it('早晨 6-10', function () {
    assertEqual(I.periodOfDay(8), 'morning')
  })
  it('白天 10-17', function () {
    assertEqual(I.periodOfDay(14), 'daytime')
  })
  it('黄昏 17-19', function () {
    assertEqual(I.periodOfDay(18), 'dusk')
  })
  it('夜晚 19-22', function () {
    assertEqual(I.periodOfDay(20), 'night')
  })
  it('深夜 22-6', function () {
    assertEqual(I.periodOfDay(23), 'lateNight')
    assertEqual(I.periodOfDay(2), 'lateNight')
  })
  it('非数字兜底为 daytime', function () {
    assertEqual(I.periodOfDay('abc'), 'daytime')
    assertEqual(I.periodOfDay(NaN), 'daytime')
    assertEqual(I.periodOfDay(undefined), 'daytime')
  })
})

describe('内部判定 - isExtremeWeather', function () {
  it('雷/暴雨阻断', function () {
    assert(I.isExtremeWeather({ description: '雷阵雨' }), '雷阵雨应判为极端')
    assert(I.isExtremeWeather({ description: '暴雨' }), '暴雨应判为极端')
    assert(I.isExtremeWeather({ condition: 'storm' }), 'storm 应判为极端')
  })
  it('大雪/暴雪阻断', function () {
    assert(I.isExtremeWeather({ description: '大雪' }))
    assert(I.isExtremeWeather({ description: '暴雪' }))
  })
  it('大风/台风阻断', function () {
    assert(I.isExtremeWeather({ description: '大风' }))
    assert(I.isExtremeWeather({ description: '台风' }))
  })
  it('高温 ≥38 阻断', function () {
    assert(I.isExtremeWeather({ temperature: 39, description: '晴' }))
    assert(I.isExtremeWeather({ temperature: 38 }))
  })
  it('严寒 ≤-5 阻断', function () {
    assert(I.isExtremeWeather({ temperature: -5 }))
    assert(I.isExtremeWeather({ temperature: -10 }))
  })
  it('正常天气不阻断', function () {
    assert(!I.isExtremeWeather({ temperature: 26, description: '晴' }))
    assert(!I.isExtremeWeather({ description: '多云' }))
    assert(!I.isExtremeWeather({ temperature: 15 }))
  })
  it('空入参不阻断', function () {
    assert(!I.isExtremeWeather(null))
    assert(!I.isExtremeWeather(undefined))
    assert(!I.isExtremeWeather({}))
  })
})

describe('内部判定 - isNight / isLateNight', function () {
  it('isNight: 19-6', function () {
    assert(I.isNight(19))
    assert(I.isNight(22))
    assert(I.isNight(2))
    assert(!I.isNight(18))
    assert(!I.isNight(8))
  })
  it('isLateNight: 22-6', function () {
    assert(I.isLateNight(22))
    assert(I.isLateNight(2))
    assert(!I.isLateNight(19))
    assert(!I.isLateNight(21))
  })
  it('非数字返回 false', function () {
    assert(!I.isNight('abc'))
    assert(!I.isLateNight(NaN))
  })
})

// ============================================================
// getTip - 7 分支
// ============================================================
describe('getTip - 极端天气阻断', function () {
  it('暴雨户外 → DANGER + pause', function () {
    const r = getTip({ hour: 14, weather: { description: '暴雨' }, outdoor: true })
    assertEqual(r.level, safety.LEVEL.DANGER)
    assertEqual(r.action, 'pause')
    assert(/暂停/.test(r.title), 'title 应含暂停')
  })
  it('暴雨室内 → 不阻断，落到其他分支', function () {
    const r = getTip({ hour: 14, weather: { description: '暴雨' }, outdoor: false })
    assert(r.action !== 'pause', '室内任务不应 pause')
  })
})

describe('getTip - 深夜独自 + 户外', function () {
  it('距离 > 1.5km 提示缩短', function () {
    const r = getTip({ hour: 23, weather: {}, outdoor: true, isGroup: false, distanceKm: 3 })
    assertEqual(r.level, safety.LEVEL.WARN)
    assertEqual(r.action, 'caution')
    assert(/缩短/.test(r.content), '应提示缩短距离')
    assert(/3\s*km/.test(r.content), '应含距离数字')
  })
  it('距离 <= 1.5km 提示避免偏僻', function () {
    const r = getTip({ hour: 2, weather: {}, outdoor: true, isGroup: false, distanceKm: 1 })
    assertEqual(r.level, safety.LEVEL.WARN)
    assert(/偏僻/.test(r.content), '应提示避免偏僻')
  })
})

describe('getTip - 深夜同频 + 户外', function () {
  it('同频组局深夜 → WARN caution', function () {
    const r = getTip({ hour: 23, weather: {}, outdoor: true, isGroup: true, partners: '阿明、小红' })
    assertEqual(r.level, safety.LEVEL.WARN)
    assert(/同频成员|阿明|小红/.test(r.content), '应含成员名')
  })
})

describe('getTip - 夜晚（19-22）独自 + 户外', function () {
  it('夜晚 INFO continue', function () {
    const r = getTip({ hour: 20, weather: {}, outdoor: true, isGroup: false })
    assertEqual(r.level, safety.LEVEL.INFO)
    assertEqual(r.action, 'continue')
    assert(/夜色|钥匙/.test(r.content))
  })
})

describe('getTip - 破圈模式', function () {
  it('破圈类型 → INFO continue + 边界文案', function () {
    const r = getTip({ hour: 14, weather: {}, commandType: 'breakthrough', outdoor: true })
    assertEqual(r.level, safety.LEVEL.INFO)
    assert(/破圈|不适|中止/.test(r.content), '应含破圈边界提示')
  })
})

describe('getTip - 同频出逃', function () {
  it('同频白天 → INFO continue + 互评文案', function () {
    const r = getTip({ hour: 14, weather: {}, isGroup: true, partners: '小红' })
    assertEqual(r.level, safety.LEVEL.INFO)
    assert(/互评|公共场所/.test(r.content), '应含互评/公共场所提示')
  })
})

describe('getTip - 默认普通出逃', function () {
  it('默认 → INFO continue + 通用文案', function () {
    const r = getTip({ hour: 14, weather: {}, commandType: 'walk' })
    assertEqual(r.level, safety.LEVEL.INFO)
    assertEqual(r.action, 'continue')
    assert(r.content.length > 0, '应有文案')
  })
})

// ============================================================
// shouldPauseOutdoorTask
// ============================================================
describe('shouldPauseOutdoorTask', function () {
  it('室内任务永不阻断', function () {
    const r = shouldPauseOutdoorTask({ weather: { description: '暴雨' }, outdoor: false })
    assertEqual(r.blocked, false)
    assertEqual(r.reason, '')
  })
  it('户外极端天气阻断', function () {
    const r = shouldPauseOutdoorTask({ weather: { description: '雷暴' }, outdoor: true })
    assertEqual(r.blocked, true)
    assert(r.reason.length > 0, '应有 reason')
  })
  it('户外正常天气不阻断', function () {
    const r = shouldPauseOutdoorTask({ weather: { description: '晴' }, outdoor: true })
    assertEqual(r.blocked, false)
  })
  it('默认 outdoor=true（无 outdoor 字段）', function () {
    const r = shouldPauseOutdoorTask({ weather: { description: '台风' } })
    assertEqual(r.blocked, true)
  })
})

// ============================================================
// emergencyExitHint
// ============================================================
describe('emergencyExitHint', function () {
  it('同频模式提示通知成员', function () {
    const r = emergencyExitHint({ isGroup: true })
    assert(/通知/.test(r.hint), '同频退出应提示通知成员')
    assertEqual(r.confirmText, '确认退出')
  })
  it('独自模式不提通知', function () {
    const r = emergencyExitHint({ isGroup: false })
    assert(!/通知同频/.test(r.hint), '独自退出不应提示通知同频成员')
    assertEqual(r.confirmText, '确认退出')
  })
  it('空 ctx 兜底为独自', function () {
    const r = emergencyExitHint(null)
    assertEqual(r.title, '紧急退出')
  })
})

// ============================================================
// buildShareLocationPayload
// ============================================================
describe('buildShareLocationPayload', function () {
  it('完整 location → ok=true + 位置 payload', function () {
    const loc = { latitude: 23.13, longitude: 113.27, name: '人民公园', address: '广州越秀' }
    const r = buildShareLocationPayload(loc, '周末漫游者')
    assertEqual(r.ok, true)
    assertEqual(r.type, 'location')
    assertEqual(r.payload.latitude, 23.13)
    assertEqual(r.payload.longitude, 113.27)
    assertEqual(r.payload.name, '人民公园')
    assertEqual(r.payload.address, '广州越秀')
    assertEqual(r.payload.scale, 16)
  })
  it('缺 name → 兜底「我的出逃位置」', function () {
    const r = buildShareLocationPayload({ latitude: 1, longitude: 2 }, '')
    assertEqual(r.ok, true)
    assertEqual(r.payload.name, '我的出逃位置')
  })
  it('缺 address → 用 escapeName 兜底', function () {
    const r = buildShareLocationPayload({ latitude: 1, longitude: 2 }, '踢影子的散步家')
    assertEqual(r.ok, true)
    assert(/踢影子/.test(r.payload.address), 'address 应含 escapeName')
  })
  it('缺 address + 缺 escapeName → 默认文案', function () {
    const r = buildShareLocationPayload({ latitude: 1, longitude: 2 }, '')
    assertEqual(r.ok, true)
    assert(/出逃指令/.test(r.payload.address), '应有默认品牌文案')
  })
  it('缺 latitude/longitude → ok=false', function () {
    assertEqual(buildShareLocationPayload({ name: 'x' }, 'a').ok, false)
    assertEqual(buildShareLocationPayload({ latitude: 1 }, 'a').ok, false)
  })
  it('非 object 入参 → ok=false', function () {
    assertEqual(buildShareLocationPayload(null, 'a').ok, false)
    assertEqual(buildShareLocationPayload(undefined, 'a').ok, false)
    assertEqual(buildShareLocationPayload('string', 'a').ok, false)
    assertEqual(buildShareLocationPayload(123, 'a').ok, false)
  })
  it('latitude 是字符串 → ok=false（类型校验）', function () {
    assertEqual(buildShareLocationPayload({ latitude: '23', longitude: 113 }, 'a').ok, false)
  })
})

// ============================================================
// buildShareCardPayload
// ============================================================
describe('buildShareCardPayload', function () {
  it('完整 escapeName + commandTitle', function () {
    const r = buildShareCardPayload('周末漫游者', '寻找蓝色出口')
    assertEqual(r.ok, true)
    assertEqual(r.type, 'message')
    assert(/周末漫游者/.test(r.payload.title))
    assert(/寻找蓝色出口/.test(r.payload.title))
    assertEqual(r.payload.path, '/pages/index/index')
  })
  it('缺 escapeName → 默认品牌前缀', function () {
    const r = buildShareCardPayload('', '寻找蓝色出口')
    assert(/出逃指令/.test(r.payload.title))
    assert(/寻找蓝色出口/.test(r.payload.title))
  })
  it('缺 commandTitle → 默认文案', function () {
    const r = buildShareCardPayload('', '')
    assert(/城市微冒险/.test(r.payload.title), '应有默认副标题')
  })
})

// ============================================================
// buildSafetyState
// ============================================================
describe('buildSafetyState - 综合状态', function () {
  it('返回 tip/pause/exit/level/action 五字段', function () {
    const r = buildSafetyState({ hour: 14, weather: {}, outdoor: true })
    assert(typeof r.tip === 'object', '应有 tip')
    assert(typeof r.pause === 'object', '应有 pause')
    assert(typeof r.exit === 'object', '应有 exit')
    assertEqual(typeof r.level, 'string')
    assertEqual(typeof r.action, 'string')
  })
  it('极端天气 → level=DANGER action=pause', function () {
    const r = buildSafetyState({ hour: 14, weather: { description: '雷暴' }, outdoor: true })
    assertEqual(r.level, safety.LEVEL.DANGER)
    assertEqual(r.action, 'pause')
    assertEqual(r.pause.blocked, true)
  })
  it('深夜独自户外 → level=WARN action=caution', function () {
    const r = buildSafetyState({ hour: 23, weather: {}, outdoor: true, isGroup: false })
    assertEqual(r.level, safety.LEVEL.WARN)
    assertEqual(r.action, 'caution')
  })
})

// ============================================================
// 不变性 + 边界
// ============================================================
describe('不变性 - 纯函数不污染入参', function () {
  it('getTip 不修改 ctx', function () {
    const ctx = { hour: 23, weather: {}, outdoor: true, isGroup: false, distanceKm: 3 }
    const snapshot = JSON.stringify(ctx)
    getTip(ctx)
    assertEqual(JSON.stringify(ctx), snapshot, 'getTip 修改了入参')
  })
  it('buildSafetyState 不修改 ctx', function () {
    const ctx = { hour: 14, weather: { description: '雷暴' }, outdoor: true }
    const snapshot = JSON.stringify(ctx)
    buildSafetyState(ctx)
    assertEqual(JSON.stringify(ctx), snapshot, 'buildSafetyState 修改了入参')
  })
  it('buildShareLocationPayload 不修改 location', function () {
    const loc = { latitude: 1, longitude: 2, name: 'x', address: 'y' }
    const snapshot = JSON.stringify(loc)
    buildShareLocationPayload(loc, 'a')
    assertEqual(JSON.stringify(loc), snapshot, 'location 被修改')
  })
})

describe('边界 - 非法入参不抛异常', function () {
  it('getTip(null) 不抛', function () {
    let err = null
    try { getTip(null) } catch (e) { err = e }
    assertEqual(err, null)
  })
  it('getTip(undefined) 不抛', function () {
    let err = null
    try { getTip(undefined) } catch (e) { err = e }
    assertEqual(err, null)
  })
  it('getTip(字符串) 不抛', function () {
    let err = null
    try { getTip('abc') } catch (e) { err = e }
    assertEqual(err, null)
  })
  it('shouldPauseOutdoorTask(数字) 不抛', function () {
    let err = null
    try { shouldPauseOutdoorTask(123) } catch (e) { err = e }
    assertEqual(err, null)
  })
  it('buildSafetyState(空对象) 不抛', function () {
    let err = null
    try { buildSafetyState({}) } catch (e) { err = e }
    assertEqual(err, null)
  })
})

// ============================================================
// 最终报告
// ============================================================
console.log('\n' + '='.repeat(60))
console.log('  safety-tip.test.js 最终报告')
console.log('='.repeat(60))
console.log('  ✓ passed: ' + passCount)
console.log('  ✗ failed: ' + failCount)
if (failures.length) {
  console.log('\n  失败列表：')
  failures.forEach(f => console.log('    - ' + f))
}
console.log('='.repeat(60))
process.exit(failCount > 0 ? 1 : 0)
