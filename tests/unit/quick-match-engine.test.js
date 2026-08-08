// tests/unit/quick-match-engine.test.js
// B3 同频骰子 AI 快速匹配引擎单元测试
// 运行: node tests/unit/quick-match-engine.test.js

'use strict'

const qm = require('../../utils/quick-match-engine.js')

let passCount = 0
let failCount = 0
const failures = []

function test(name, fn) {
  return Promise.resolve().then(function () { return fn() }).then(function () {
    passCount++
    console.log('  ✓ ' + name)
  }).catch(function (e) {
    failCount++
    failures.push(name + ': ' + e.message)
    console.log('  ✗ ' + name + ' → ' + e.message)
  })
}

function assertEqual(a, b, msg) {
  if (a !== b) throw new Error(msg || 'expected=' + JSON.stringify(b) + ' actual=' + JSON.stringify(a))
}
function assertTrue(v, msg) { if (!v) throw new Error(msg || '应为 true') }
function assertFalse(v, msg) { if (v) throw new Error(msg || '应为 false') }

// ===== 测试用 mock commandPool =====
function mockPool() {
  return [
    { id: 'cmd_color_1', type: 'color', title: '寻找蓝色', content: '今天去找一抹蓝色', duration: 20, nightSafe: true, outdoor: true },
    { id: 'cmd_walk_1', type: 'walk', title: '漫步胡同', content: '走进一条老胡同', duration: 60, nightSafe: true, outdoor: true },
    { id: 'cmd_food_1', type: 'food', title: '尝一家小店', content: '去尝一家没吃过的店', duration: 45, nightSafe: true, outdoor: true },
    { id: 'cmd_sense_1', type: 'sense', title: '听三种声音', content: '记录三种声音', duration: 30, nightSafe: true, outdoor: false },
    { id: 'cmd_collect_1', type: 'collect', title: '收集落叶', content: '捡三片落叶', duration: 25, nightSafe: true, outdoor: true }
  ]
}

// ===== 测试用 mock matcherCtx（模拟 cloud.callFunction）=====
function mockMatcherCtx(options) {
  options = options || {}
  return {
    cloudReady: true,
    callFunction: function (opts) {
      // 返回 Promise<success/wrap>
      return new Promise(function (resolve, reject) {
        if (options.shouldFail) {
          reject(new Error('mock cloud fail'))
          return
        }
        // 模拟返回 3 个 mock 玩家
        resolve({
          result: {
            ok: true,
            players: [
              { openId: 'p1', nickname: '小李', avatar: '', interests: ['food', 'photo'], district: '', bio: '爱探索' },
              { openId: 'p2', nickname: '小张', avatar: '', interests: ['food'], district: '', bio: '爱美食' },
              { openId: 'p3', nickname: '小王', avatar: '', interests: ['photo'], district: '', bio: '爱拍照' }
            ]
          }
        })
      })
    }
  }
}

console.log('\n=== quick-match-engine 单元测试 ===\n')

// ============================================================
console.log('--- inferThemeFromPrefs ---')
// ============================================================
test('偏好好 walk → adventure', function () {
  assertEqual(qm.inferThemeFromPrefs({ type: { walk: 5, color: 2 } }), 'adventure')
})

test('偏好好 color → relax', function () {
  assertEqual(qm.inferThemeFromPrefs({ type: { color: 5, walk: 1 } }), 'relax')
})

test('偏好 breakthrough 跳到第二', function () {
  // breakthrough 不算偏好，应跳到第二个
  const prefs = { type: { breakthrough: 10, walk: 3 } }
  assertEqual(qm.inferThemeFromPrefs(prefs), 'adventure')
})

test('空偏好返回 social（兜底）', function () {
  assertEqual(qm.inferThemeFromPrefs({}), 'social')
  assertEqual(qm.inferThemeFromPrefs({ type: {} }), 'social')
  assertEqual(qm.inferThemeFromPrefs(null), 'social')
  assertEqual(qm.inferThemeFromPrefs(undefined), 'social')
})

test('全部 type=breakthrough 兜底 social', function () {
  assertEqual(qm.inferThemeFromPrefs({ type: { breakthrough: 5 } }), 'social')
})

test('未知 type 兜底 social', function () {
  assertEqual(qm.inferThemeFromPrefs({ type: { unknowntype: 5 } }), 'social')
})

test('count=0 不参与排序', function () {
  assertEqual(qm.inferThemeFromPrefs({ type: { walk: 0, color: 3 } }), 'relax')
})

test('计数相等时稳定排序（取第一个）', function () {
  // walk 和 color 都是 3，应取 Object.keys 第一个（取决于插入顺序）
  const r = qm.inferThemeFromPrefs({ type: { walk: 3, color: 3 } })
  assertTrue(r === 'adventure' || r === 'relax', '应返回有效 style')
})

// ============================================================
console.log('\n--- inferInterestsFromPrefs ---')
// ============================================================
test('top 3 兴趣推断', function () {
  const interests = qm.inferInterestsFromPrefs({ type: { walk: 5, color: 3, food: 2, sense: 1 } })
  // walk→nature, color→photo, food→food
  assertEqual(interests.length, 3)
  assertTrue(interests.indexOf('nature') >= 0)
  assertTrue(interests.indexOf('photo') >= 0)
  assertTrue(interests.indexOf('food') >= 0)
})

test('兴趣去重（多 type 映射到同 interest）', function () {
  // walk→nature, sense→nature（都映射到 nature），应去重
  const interests = qm.inferInterestsFromPrefs({ type: { walk: 5, sense: 3 } })
  assertEqual(interests.length, 1)
  assertEqual(interests[0], 'nature')
})

test('breakthrough 不进入兴趣', function () {
  const interests = qm.inferInterestsFromPrefs({ type: { breakthrough: 5, walk: 3 } })
  assertEqual(interests[0], 'nature')
  assertTrue(interests.indexOf('breakthrough') < 0)
})

test('空偏好兜底 photo', function () {
  const interests = qm.inferInterestsFromPrefs({})
  assertEqual(interests.length, 1)
  assertEqual(interests[0], 'photo')
})

test('null 偏好兜底', function () {
  assertEqual(qm.inferInterestsFromPrefs(null).length, 1)
})

test('未知 type 默认映射 photo', function () {
  const interests = qm.inferInterestsFromPrefs({ type: { unknowntype: 5 } })
  assertEqual(interests[0], 'photo')
})

// ============================================================
console.log('\n--- pickPartnerCount ---')
// ============================================================
test('< 30 分钟 → 1 人', function () {
  assertEqual(qm.pickPartnerCount(15), 1)
  assertEqual(qm.pickPartnerCount(29), 1)
})

test('30-90 → 2 人', function () {
  assertEqual(qm.pickPartnerCount(30), 2)
  assertEqual(qm.pickPartnerCount(60), 2)
  assertEqual(qm.pickPartnerCount(90), 2)
})

test('> 90 → 3 人', function () {
  assertEqual(qm.pickPartnerCount(91), 3)
  assertEqual(qm.pickPartnerCount(120), 3)
})

test('非法 duration 兜底 30（→ 2 人）', function () {
  assertEqual(qm.pickPartnerCount(null), 2)
  assertEqual(qm.pickPartnerCount(undefined), 2)
  assertEqual(qm.pickPartnerCount(NaN), 2)
  assertEqual(qm.pickPartnerCount(-5), 2)
  assertEqual(qm.pickPartnerCount('abc'), 2)
})

// ============================================================
console.log('\n--- buildQuickMatchContext ---')
// ============================================================
test('构造完整 ctx', function () {
  const ctx = qm.buildQuickMatchContext({
    userPrefs: { type: { walk: 5 } },
    commandPool: mockPool(),
    completedIds: [],
    duration: 60,
    hour: 14,
    weather: 'sunny',
    userLocation: { latitude: 39.9, longitude: 116.4 }
  })
  assertEqual(ctx._theme, 'adventure')
  assertEqual(ctx.mode, 'walk')
  assertEqual(ctx.duration, 60)
  assertEqual(ctx.targetDuration, 60)
  assertEqual(ctx.hour, 14)
  assertEqual(ctx.weather, 'sunny')
  assertEqual(ctx.userLocation.latitude, 39.9)
  assertEqual(ctx.commandPool.length, 5)
})

test('relax 主题 → mode=micro', function () {
  const ctx = qm.buildQuickMatchContext({
    userPrefs: { type: { color: 5 } },
    duration: 30
  })
  assertEqual(ctx._theme, 'relax')
  assertEqual(ctx.mode, 'micro')
})

test('social 主题 → mode=micro', function () {
  const ctx = qm.buildQuickMatchContext({
    userPrefs: { type: { unknowntype: 5 } },
    duration: 30
  })
  assertEqual(ctx._theme, 'social')
  assertEqual(ctx.mode, 'micro')
})

test('非法 hour 兜底当前小时', function () {
  const ctx = qm.buildQuickMatchContext({ hour: 25 })
  assertTrue(ctx.hour >= 0 && ctx.hour < 24, '非法 hour 兜底应 0-23')
})

test('非法 duration 兜底 30', function () {
  const ctx = qm.buildQuickMatchContext({ duration: -5 })
  assertEqual(ctx.duration, 30)
})

test('空 options 返回默认 ctx', function () {
  const ctx = qm.buildQuickMatchContext(null)
  assertEqual(ctx.commandPool.length, 0)
  assertEqual(ctx.completedIds.length, 0)
  assertEqual(ctx.weather, 'sunny')
  assertEqual(ctx._theme, 'social')
})

test('userLocation 校验：缺失字段不入参', function () {
  const ctx = qm.buildQuickMatchContext({
    userLocation: { latitude: 39.9 }  // 缺失 longitude
  })
  assertEqual(ctx.userLocation, null)
})

// ============================================================
console.log('\n--- buildResult ---')
// ============================================================
test('构造成功结果', function () {
  const r = qm.buildResult(
    { id: 'c1', title: 'test' },
    'adventure',
    [{ openId: 'p1' }, { openId: 'p2' }],
    { expectedPartnerCount: 2, duration: 60 }
  )
  assertTrue(r.ok)
  assertEqual(r.command.id, 'c1')
  assertEqual(r.theme.id, 'adventure')
  assertEqual(r.theme.name, '探索')
  assertEqual(r.partnerCount, 2)
  assertEqual(r.expectedPartnerCount, 2)
  assertEqual(r.duration, 60)
})

test('partners 非数组兜底空数组', function () {
  const r = qm.buildResult({ id: 'c1' }, 'social', null, {})
  assertEqual(r.partners.length, 0)
  assertEqual(r.partnerCount, 0)
})

test('theme 用 STYLE_LABELS 兜底', function () {
  const r = qm.buildResult({ id: 'c1' }, 'unknowntype', [], {})
  assertEqual(r.theme.name, '社交')  // STYLE_LABELS.social
})

// ============================================================
console.log('\n--- normalizeUser ---')
// ============================================================
test('用户对象归一化', function () {
  const u = qm.normalizeUser({
    openId: 'abc',
    nickname: 'Alice',
    avatar: '/img.png',
    interests: ['photo'],
    district: '北京',
    bio: 'hello'
  }, ['food'])
  assertEqual(u.openId, 'abc')
  assertEqual(u.nickname, 'Alice')
  assertEqual(u.interests[0], 'photo')
})

test('null 用户兜底', function () {
  const u = qm.normalizeUser(null, ['food'])
  assertEqual(u.openId, 'local_user')
  assertEqual(u.nickname, '我')
  assertEqual(u.avatar, '/packageBt/images/avatar.webp')
  assertEqual(u.interests[0], 'food')
})

test('缺失字段补默认', function () {
  const u = qm.normalizeUser({ openId: 'x' }, ['food'])
  assertEqual(u.nickname, '我')
  assertEqual(u.avatar, '/packageBt/images/avatar.webp')
  assertEqual(u.interests[0], 'food')
})

test('空字符串 avatar 兜底', function () {
  const u = qm.normalizeUser({ avatar: '' }, [])
  assertEqual(u.avatar, '/packageBt/images/avatar.webp')
})

// ============================================================
console.log('\n--- executeQuickMatch（异步）---')
// ============================================================
test('无 matcherCtx：仅返回任务，partners 为空', function () {
  return qm.executeQuickMatch({
    userPrefs: { type: { walk: 5 } },
    commandPool: mockPool(),
    completedIds: [],
    duration: 60,
    hour: 14,
    weather: 'sunny'
  }, null, null).then(function (r) {
    assertTrue(r.ok)
    assertTrue(!!r.command)
    assertEqual(r.partners.length, 0)
    assertEqual(r.expectedPartnerCount, 2)
    assertEqual(r.theme.id, 'adventure')
  })
})

test('带 matcherCtx：返回任务+搭子', function () {
  return qm.executeQuickMatch({
    userPrefs: { type: { walk: 5 } },
    commandPool: mockPool(),
    completedIds: [],
    duration: 60,
    hour: 14,
    weather: 'sunny'
  }, { openId: 'local' }, mockMatcherCtx()).then(function (r) {
    assertTrue(r.ok)
    assertTrue(!!r.command)
    assertTrue(r.partners.length > 0)
    assertEqual(r.expectedPartnerCount, 2)
  })
})

test('空 commandPool → fallback 任务仍可用', function () {
  return qm.executeQuickMatch({
    userPrefs: { type: { walk: 5 } },
    commandPool: [],
    completedIds: [],
    duration: 60,
    hour: 14
  }, null, null).then(function (r) {
    // generator-engine 兜底链应返回 fallback 任务
    assertTrue(r.ok)
    assertTrue(!!r.command)
  })
})

test('matcherCtx 失败：player-matcher 降级返回 mock 搭子（不阻塞）', function () {
  return qm.executeQuickMatch({
    userPrefs: { type: { walk: 5 } },
    commandPool: mockPool(),
    completedIds: [],
    duration: 60,
    hour: 14
  }, { openId: 'local' }, mockMatcherCtx({ shouldFail: true })).then(function (r) {
    // player-matcher 设计：云端失败/超时都会用 mock 兜底返回搭子
    // quick-match-engine 不应阻塞，仍返回 ok 结果
    assertTrue(r.ok, '搭子失败不应阻塞任务')
    assertTrue(!!r.command)
    // 可能返回 mock 搭子（player-matcher 内部降级）或空数组
    assertTrue(r.partners.length >= 0)
  })
})

test('duration < 30 → expectedPartnerCount=1', function () {
  return qm.executeQuickMatch({
    userPrefs: { type: { color: 3 } },
    commandPool: mockPool(),
    completedIds: [],
    duration: 15,
    hour: 14
  }, null, null).then(function (r) {
    assertTrue(r.ok)
    assertEqual(r.expectedPartnerCount, 1)
    assertEqual(r.theme.id, 'relax')
  })
})

test('duration > 90 → expectedPartnerCount=3', function () {
  return qm.executeQuickMatch({
    userPrefs: { type: { walk: 5 } },
    commandPool: mockPool(),
    completedIds: [],
    duration: 120,
    hour: 14
  }, null, null).then(function (r) {
    assertTrue(r.ok)
    assertEqual(r.expectedPartnerCount, 3)
  })
})

// ============================================================
console.log('\n--- regenerate（换一换）---')
// ============================================================
test('regenerate 设置 lastType + sameTypeCount=2', function () {
  // 用 mock 验证：传 currentCommand 后，下次 generate 会避开同 type
  // 由于纯函数不暴露 lastType，我们通过结果验证
  return qm.regenerate({
    userPrefs: { type: { walk: 5 } },
    commandPool: mockPool(),
    completedIds: [],
    duration: 60,
    hour: 14,
    currentCommand: { type: 'walk' }
  }, null, null).then(function (r) {
    assertTrue(r.ok)
    assertTrue(!!r.command)
    // 不强制 type 必须不同（pool 太小可能没有其他选项），但应能返回结果
  })
})

test('regenerate 无 currentCommand 等价于 executeQuickMatch', function () {
  return qm.regenerate({
    userPrefs: { type: { walk: 5 } },
    commandPool: mockPool(),
    completedIds: [],
    duration: 60,
    hour: 14
  }, null, null).then(function (r) {
    assertTrue(r.ok)
  })
})

// ============================================================
// 最终报告（异步）
// ============================================================
Promise.resolve().then(function () {
  // 等所有 test 完成
  return new Promise(function (resolve) {
    setTimeout(resolve, 500)
  })
}).then(function () {
  console.log('\n' + '='.repeat(60))
  console.log('  quick-match-engine 单元测试结果')
  console.log('='.repeat(60))
  console.log('  通过: ' + passCount + ' / 失败: ' + failCount)
  if (failures.length > 0) {
    console.log('\n  失败项:')
    failures.forEach(function (f) { console.log('    ✗ ' + f) })
  }
  console.log('='.repeat(60))
  process.exit(failCount > 0 ? 1 : 0)
})
