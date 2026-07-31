// tests/property/group-property.test.js
// C-14~C-19 同频组局 Property-Based Fuzz 测试
// 运行: node tests/property/group-property.test.js
//
// 设计思路：
//   - 不依赖第三方库，自实现最小伪随机 + 性质断言框架
//   - 每条性质跑 N 次（默认 500），任何一次违反即失败
//   - 种子化 RNG：失败时打印种子便于复现
//   - 覆盖 buildRoles/buildClues/buildReviewSummary 不变式 + 端到端联动

'use strict'

const wx = require('../mock-wx.js')
global.wx = wx

const store = require('../../packageSync/utils/group-room-store.js')
const I = store._internal

// ===== 种子化 PRNG（mulberry32）=====
function makeRng(seed) {
  let s = seed >>> 0
  return function () {
    s = (s + 0x6D2B79F5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// ===== 测试统计 =====
let passCount = 0
let failCount = 0
const failures = []
const groups = []

function describe(name, fn) {
  groups.push(name)
  console.log('\n=== ' + name + ' ===')
  fn()
  groups.pop()
}

function recordPass() { passCount++ }
function recordFail(msg) {
  failCount++
  const where = groups.length ? groups.join(' > ') : '(root)'
  failures.push(where + ': ' + msg)
}

function property(name, iterations, prop) {
  groups.push(name)
  let localFail = 0
  for (let i = 0; i < iterations; i++) {
    const seed = 0xC0FFEE + i
    let result
    try {
      result = prop(seed)
    } catch (e) {
      result = { ok: false, msg: 'EXCEPTION: ' + e.message + ' (seed=' + seed + ')' }
    }
    if (result && result.ok) {
      recordPass()
    } else {
      localFail++
      recordFail((result && result.msg) || ('property 失败 seed=' + seed))
    }
  }
  if (localFail === 0) {
    console.log('  ✓ ' + name + ' (' + iterations + ' 次)')
  } else {
    console.log('  ✗ ' + name + ' (' + localFail + '/' + iterations + ' 次失败)')
  }
  groups.pop()
}

// ===== 数据生成器 =====
const STYLES = ['relax', 'adventure', 'social', '', 'unknown', 'RELAX', '杂项', null, undefined, 42]
const INTERESTS_POOL = ['food', 'nature', 'culture', 'sport', 'photo', 'shopping']
const INTENSITIES = ['low', 'medium', 'high']
const NICKNAME_CHARS = '一二三四五六七八九十甲乙丙丁戊己庚辛壬癸abcXYZ'

function randInt(rng, min, max) {
  return Math.floor(rng() * (max - min + 1)) + min
}

function randChoice(rng, arr) {
  return arr[Math.floor(rng() * arr.length)]
}

function randString(rng, max) {
  const n = randInt(rng, 0, max)
  let s = ''
  for (let i = 0; i < n; i++) s += randChoice(rng, NICKNAME_CHARS.split(''))
  return s
}

// 随机成员（含异常形态：null openId、空 nickname、非字符串 nickname）
function randMembers(rng, size) {
  const list = []
  for (let i = 0; i < size; i++) {
    const member = {
      openId: rng() < 0.1 ? null : 'u_' + i + '_' + randInt(rng, 0, 99999),
      nickname: rng() < 0.1 ? '' : randString(rng, 8)
    }
    list.push(member)
  }
  return list
}

// 随机 steps（含异常形态：null/数字/对象）
function randSteps(rng, size) {
  const list = []
  for (let i = 0; i < size; i++) {
    const r = rng()
    if (r < 0.15) list.push(null)
    else if (r < 0.3) list.push(randInt(rng, 0, 999))
    else if (r < 0.45) list.push({ text: 'obj' + i })
    else list.push('步骤_' + i + '_' + randString(rng, 6))
  }
  return list
}

// 随机 reviews（含异常 rating：0/6/-1/小数/字符串/undefined）
function randReviews(rng, size) {
  const list = []
  const ratings = [1, 2, 3, 4, 5, 0, 6, -1, 3.5, '5', null, undefined, NaN]
  for (let i = 0; i < size; i++) {
    list.push({
      rating: randChoice(rng, ratings),
      comment: rng() < 0.3 ? '' : randString(rng, 50)
    })
  }
  return list
}

// ============================================================
// ===== 性质 1: buildRoles 结果长度恒等于 members 长度 =====
// ============================================================
describe('buildRoles 不变量', function () {
  property('结果长度 === members 长度（任意 style）', 500, function (seed) {
    const rng = makeRng(seed)
    const size = randInt(rng, 0, 20)
    const members = randMembers(rng, size)
    const style = randChoice(rng, STYLES)
    const roles = I.buildRoles(members, style)
    if (!Array.isArray(roles)) return { ok: false, msg: '非数组' }
    if (roles.length !== members.length) {
      return { ok: false, msg: '长度不等: ' + roles.length + ' vs ' + members.length + ' (seed=' + seed + ')' }
    }
    return { ok: true }
  })

  property('每个角色都来自角色库（合法 style）', 500, function (seed) {
    const rng = makeRng(seed)
    const size = randInt(rng, 1, 12)
    const members = randMembers(rng, size)
    const style = randChoice(rng, ['relax', 'adventure', 'social'])
    const roles = I.buildRoles(members, style)
    const pool = I.ROLE_LIBRARY[style]
    for (let i = 0; i < roles.length; i++) {
      if (pool.indexOf(roles[i].role) < 0) {
        return { ok: false, msg: '角色不在 ' + style + ' 库: ' + roles[i].role }
      }
    }
    return { ok: true }
  })

  property('非法 style 用 relax 兜底（角色来自 relax 库）', 500, function (seed) {
    const rng = makeRng(seed)
    const size = randInt(rng, 1, 8)
    const members = randMembers(rng, size)
    const invalidStyle = randChoice(rng, ['', 'unknown', 'RELAX', '杂项', null, undefined, 42, 'relax2'])
    const roles = I.buildRoles(members, invalidStyle)
    const pool = I.ROLE_LIBRARY.relax
    for (let i = 0; i < roles.length; i++) {
      if (pool.indexOf(roles[i].role) < 0) {
        return { ok: false, msg: '兜底角色不在 relax 库: ' + roles[i].role + ' (style=' + invalidStyle + ')' }
      }
    }
    return { ok: true }
  })

  property('成员数 > 6 时轮询（i % 6 关系）', 500, function (seed) {
    const rng = makeRng(seed)
    const size = randInt(rng, 7, 30)
    const members = randMembers(rng, size)
    const style = randChoice(rng, ['relax', 'adventure', 'social'])
    const roles = I.buildRoles(members, style)
    const pool = I.ROLE_LIBRARY[style]
    for (let i = 0; i < roles.length; i++) {
      if (roles[i].role !== pool[i % pool.length]) {
        return { ok: false, msg: '位置 ' + i + ' 应为 ' + pool[i % pool.length] + ' 实为 ' + roles[i].role }
      }
    }
    return { ok: true }
  })

  property('openId/nickname 与原成员一一对应', 500, function (seed) {
    const rng = makeRng(seed)
    const size = randInt(rng, 1, 15)
    const members = randMembers(rng, size)
    const style = randChoice(rng, ['relax', 'adventure', 'social'])
    const roles = I.buildRoles(members, style)
    for (let i = 0; i < roles.length; i++) {
      if (roles[i].openId !== members[i].openId) {
        return { ok: false, msg: 'openId 不匹配 at ' + i }
      }
      if (roles[i].nickname !== members[i].nickname) {
        return { ok: false, msg: 'nickname 不匹配 at ' + i }
      }
    }
    return { ok: true }
  })

  property('members 非数组返回空数组', 500, function (seed) {
    const rng = makeRng(seed)
    const bad = randChoice(rng, [null, undefined, 'string', 42, {}, true])
    const roles = I.buildRoles(bad, 'relax')
    if (!Array.isArray(roles) || roles.length !== 0) {
      return { ok: false, msg: '非数组入参应返回 []' }
    }
    return { ok: true }
  })
})

// ============================================================
// ===== 性质 2: buildClues 不变量 =====
// ============================================================
describe('buildClues 不变量', function () {
  property('结果长度 === members 长度', 500, function (seed) {
    const rng = makeRng(seed)
    const mSize = randInt(rng, 0, 20)
    const sSize = randInt(rng, 0, 10)
    const members = randMembers(rng, mSize)
    const steps = randSteps(rng, sSize)
    const clues = I.buildClues(members, steps)
    if (!Array.isArray(clues)) return { ok: false, msg: '非数组' }
    if (clues.length !== members.length) {
      return { ok: false, msg: '长度不等: ' + clues.length + ' vs ' + members.length }
    }
    return { ok: true }
  })

  property('steps 非空时 clue === steps[i % steps.length]', 500, function (seed) {
    const rng = makeRng(seed)
    const mSize = randInt(rng, 1, 15)
    const sSize = randInt(rng, 1, 8)
    const members = randMembers(rng, mSize)
    const steps = randSteps(rng, sSize)
    const clues = I.buildClues(members, steps)
    for (let i = 0; i < clues.length; i++) {
      const expected = steps[i % steps.length]
      if (clues[i].clue !== expected) {
        return { ok: false, msg: '位置 ' + i + ' clue 应为 ' + expected + ' 实为 ' + clues[i].clue }
      }
    }
    return { ok: true }
  })

  property('steps 为空数组时每人「自由发挥」', 500, function (seed) {
    const rng = makeRng(seed)
    const mSize = randInt(rng, 1, 10)
    const members = randMembers(rng, mSize)
    const clues = I.buildClues(members, [])
    for (let i = 0; i < clues.length; i++) {
      if (clues[i].clue !== '自由发挥') {
        return { ok: false, msg: '位置 ' + i + ' 应为 自由发挥 实为 ' + clues[i].clue }
      }
    }
    return { ok: true }
  })

  property('steps 非数组时每人「自由发挥」', 500, function (seed) {
    const rng = makeRng(seed)
    const mSize = randInt(rng, 1, 10)
    const members = randMembers(rng, mSize)
    const badSteps = randChoice(rng, [null, undefined, 'string', 42, {}, true])
    const clues = I.buildClues(members, badSteps)
    for (let i = 0; i < clues.length; i++) {
      if (clues[i].clue !== '自由发挥') {
        return { ok: false, msg: '位置 ' + i + ' 应为 自由发挥 实为 ' + clues[i].clue }
      }
    }
    return { ok: true }
  })

  property('members 非数组返回空数组', 500, function (seed) {
    const rng = makeRng(seed)
    const bad = randChoice(rng, [null, undefined, 'string', 42, {}, true])
    const clues = I.buildClues(bad, ['s1', 's2'])
    if (!Array.isArray(clues) || clues.length !== 0) {
      return { ok: false, msg: '非数组入参应返回 []' }
    }
    return { ok: true }
  })

  property('openId/nickname 与原成员一一对应', 500, function (seed) {
    const rng = makeRng(seed)
    const mSize = randInt(rng, 1, 12)
    const sSize = randInt(rng, 0, 5)
    const members = randMembers(rng, mSize)
    const steps = randSteps(rng, sSize)
    const clues = I.buildClues(members, steps)
    for (let i = 0; i < clues.length; i++) {
      if (clues[i].openId !== members[i].openId) return { ok: false, msg: 'openId 不匹配 at ' + i }
      if (clues[i].nickname !== members[i].nickname) return { ok: false, msg: 'nickname 不匹配 at ' + i }
    }
    return { ok: true }
  })
})

// ============================================================
// ===== 性质 3: buildReviewSummary 不变量 =====
// ============================================================
describe('buildReviewSummary 不变量', function () {
  property('average ∈ [0, 5]', 500, function (seed) {
    const rng = makeRng(seed)
    const size = randInt(rng, 0, 30)
    const reviews = randReviews(rng, size)
    const s = I.buildReviewSummary(reviews)
    if (typeof s.average !== 'number' || !Number.isFinite(s.average)) {
      return { ok: false, msg: 'average 非有限数: ' + s.average }
    }
    if (s.average < 0 || s.average > 5) {
      return { ok: false, msg: 'average 越界: ' + s.average }
    }
    return { ok: true }
  })

  property('空数组 average=0 total=0', 500, function (seed) {
    const rng = makeRng(seed)
    const s = I.buildReviewSummary(randChoice(rng, [[], null, undefined, 'string', 42, {}]))
    if (s.total !== 0) return { ok: false, msg: 'total 应为 0，实为 ' + s.total }
    if (s.average !== 0) return { ok: false, msg: 'average 应为 0，实为 ' + s.average }
    return { ok: true }
  })

  property('distribution[1..5] 总数 <= total（非法 rating 不进 1-5 bin）', 500, function (seed) {
    const rng = makeRng(seed)
    const size = randInt(rng, 0, 30)
    const reviews = randReviews(rng, size)
    const s = I.buildReviewSummary(reviews)
    let distSum = 0
    for (let r = 1; r <= 5; r++) distSum += s.distribution[r] || 0
    if (distSum > s.total) {
      return { ok: false, msg: '分布总数 ' + distSum + ' > total ' + s.total }
    }
    return { ok: true }
  })

  property('全合法整数 rating 时 distribution[1..5] 总数 === total', 500, function (seed) {
    const rng = makeRng(seed)
    const size = randInt(rng, 0, 30)
    const reviews = []
    for (let i = 0; i < size; i++) reviews.push({ rating: randInt(rng, 1, 5) })
    const s = I.buildReviewSummary(reviews)
    let distSum = 0
    for (let r = 1; r <= 5; r++) distSum += s.distribution[r] || 0
    if (distSum !== s.total) {
      return { ok: false, msg: '分布总数 ' + distSum + ' ≠ total ' + s.total }
    }
    return { ok: true }
  })

  property('average 保留一位小数（× 10 是整数）', 500, function (seed) {
    const rng = makeRng(seed)
    const size = randInt(rng, 1, 30)
    const reviews = randReviews(rng, size)
    const s = I.buildReviewSummary(reviews)
    const scaled = s.average * 10
    if (Math.abs(scaled - Math.round(scaled)) > 1e-9) {
      return { ok: false, msg: 'average 未保留一位小数: ' + s.average }
    }
    return { ok: true }
  })

  property('全 5 星时 average=5', 500, function (seed) {
    const rng = makeRng(seed)
    const size = randInt(rng, 1, 20)
    const reviews = []
    for (let i = 0; i < size; i++) reviews.push({ rating: 5 })
    const s = I.buildReviewSummary(reviews)
    if (s.average !== 5) return { ok: false, msg: '全 5 星 average 应为 5，实为 ' + s.average }
    if (s.distribution[5] !== size) return { ok: false, msg: '5 星分布应为 ' + size + ' 实为 ' + s.distribution[5] }
    return { ok: true }
  })

  property('total === reviews.length（含非法 rating 也计入 total）', 500, function (seed) {
    const rng = makeRng(seed)
    const size = randInt(rng, 0, 30)
    const reviews = randReviews(rng, size)
    const s = I.buildReviewSummary(reviews)
    if (s.total !== reviews.length) {
      return { ok: false, msg: 'total ' + s.total + ' ≠ length ' + reviews.length }
    }
    return { ok: true }
  })
})

// ============================================================
// ===== 性质 4: 端到端联动 - generateScript 自动生成 roles/clues =====
// ============================================================
describe('generateScript 端到端联动不变量', function () {
  property('生成剧本后 roles.length === members.length', 500, function (seed) {
    const rng = makeRng(seed)
    wx._reset()
    const n = randInt(rng, 3, 6)
    const r = store.createRoom('property' + seed, n)
    if (!r.ok) return { ok: false, msg: 'createRoom 失败' }
    store.fillMockMembers(r.roomId)
    // 强制设置 style 让投票有结果
    const loaded = store.loadRoom(r.roomId)
    const style = randChoice(rng, ['relax', 'adventure', 'social'])
    loaded.room.members.forEach(function (m) {
      m.votes = { time: 'afternoon', budget: 'medium', style: style }
    })
    wx.setStorageSync('groupRooms', [loaded.room])

    const gen = store.generateScript(r.roomId)
    if (!gen.ok) return { ok: false, msg: 'generateScript 失败' }

    const room = store.loadRoom(r.roomId).room
    if (!Array.isArray(room.roles) || room.roles.length !== room.members.length) {
      return { ok: false, msg: 'roles 长度 ≠ members 长度: ' + (room.roles ? room.roles.length : 'null') + ' vs ' + room.members.length }
    }
    if (!Array.isArray(room.clues) || room.clues.length !== room.members.length) {
      return { ok: false, msg: 'clues 长度 ≠ members 长度' }
    }
    return { ok: true }
  })

  property('生成剧本后 roles 来自投票胜出 style 的角色库', 500, function (seed) {
    const rng = makeRng(seed)
    wx._reset()
    const n = randInt(rng, 3, 6)
    const r = store.createRoom('style' + seed, n)
    store.fillMockMembers(r.roomId)
    const loaded = store.loadRoom(r.roomId)
    const style = randChoice(rng, ['relax', 'adventure', 'social'])
    loaded.room.members.forEach(function (m) {
      m.votes = { time: 'afternoon', budget: 'medium', style: style }
    })
    wx.setStorageSync('groupRooms', [loaded.room])

    const gen = store.generateScript(r.roomId)
    if (!gen.ok) return { ok: false, msg: 'generateScript 失败' }

    const room = store.loadRoom(r.roomId).room
    const pool = I.ROLE_LIBRARY[style]
    for (let i = 0; i < room.roles.length; i++) {
      if (pool.indexOf(room.roles[i].role) < 0) {
        return { ok: false, msg: '角色 ' + room.roles[i].role + ' 不在 ' + style + ' 库' }
      }
    }
    return { ok: true }
  })

  property('生成剧本后 clues 与 script.steps 轮询对齐', 500, function (seed) {
    const rng = makeRng(seed)
    wx._reset()
    const n = randInt(rng, 3, 6)
    const r = store.createRoom('clue' + seed, n)
    store.fillMockMembers(r.roomId)
    const loaded = store.loadRoom(r.roomId)
    loaded.room.members.forEach(function (m) {
      m.votes = { time: 'afternoon', budget: 'medium', style: 'social' }
    })
    wx.setStorageSync('groupRooms', [loaded.room])

    const gen = store.generateScript(r.roomId)
    if (!gen.ok) return { ok: false, msg: 'generateScript 失败' }

    const room = store.loadRoom(r.roomId).room
    const steps = room.script.steps
    for (let i = 0; i < room.clues.length; i++) {
      const expected = steps[i % steps.length]
      if (room.clues[i].clue !== expected) {
        return { ok: false, msg: '位置 ' + i + ' clue 应为 ' + expected + ' 实为 ' + room.clues[i].clue }
      }
    }
    return { ok: true }
  })
})

// ============================================================
// ===== 性质 5: listPublicRooms 过滤不变量 =====
// ============================================================
describe('listPublicRooms 过滤不变量', function () {
  property('只返回 public 且未完成/未取消的房间', 500, function (seed) {
    const rng = makeRng(seed)
    wx._reset()
    // 随机塞入若干房间（public/private × 各种 status）
    const allRooms = []
    const statuses = ['waiting_members', 'ready', 'voting', 'generating', 'finished', 'cancelled']
    const visibilities = ['public', 'private', undefined, 'hack']
    const N = randInt(rng, 0, 15)
    for (let i = 0; i < N; i++) {
      allRooms.push({
        roomId: 'R' + i,
        topic: 'topic' + i,
        members: [{ openId: 'host' }],
        maxMembers: 4,
        status: randChoice(rng, statuses),
        visibility: randChoice(rng, visibilities),
        createdAt: randInt(rng, 1, 100000)
      })
    }
    wx.setStorageSync('groupRooms', allRooms)

    const result = store.listPublicRooms()
    if (!result.ok) return { ok: false, msg: 'listPublicRooms 失败' }

    // 期望集合：visibility=public 且 status ∉ {finished, cancelled}
    const expected = allRooms.filter(function (r) {
      return r.visibility === 'public' && r.status !== 'finished' && r.status !== 'cancelled'
    })
    if (result.rooms.length !== expected.length) {
      return { ok: false, msg: '返回数 ' + result.rooms.length + ' ≠ 期望 ' + expected.length }
    }
    // 每个返回的 roomId 应该在期望集合中
    for (let i = 0; i < result.rooms.length; i++) {
      if (!expected.some(function (e) { return e.roomId === result.rooms[i].roomId })) {
        return { ok: false, msg: '返回了不该返回的房间: ' + result.rooms[i].roomId }
      }
    }
    return { ok: true }
  })

  property('返回字段精简（不含 members/hostOpenId/visibility 等敏感字段）', 500, function (seed) {
    const rng = makeRng(seed)
    wx._reset()
    store.createRoom('p1', 4, { visibility: 'public' })
    const result = store.listPublicRooms()
    if (!result.ok || result.rooms.length === 0) return { ok: false, msg: 'setup 失败' }
    const r = result.rooms[0]
    const allowedKeys = ['roomId', 'topic', 'membersCount', 'maxMembers', 'status', 'createdAt']
    const keys = Object.keys(r)
    for (let i = 0; i < keys.length; i++) {
      if (allowedKeys.indexOf(keys[i]) < 0) {
        return { ok: false, msg: '包含非精简字段: ' + keys[i] }
      }
    }
    return { ok: true }
  })

  property('按 createdAt 倒序', 500, function (seed) {
    const rng = makeRng(seed)
    wx._reset()
    const N = randInt(rng, 2, 10)
    for (let i = 0; i < N; i++) {
      store.createRoom('order' + i, 4, { visibility: 'public' })
    }
    const result = store.listPublicRooms()
    if (!result.ok) return { ok: false, msg: '失败' }
    for (let i = 1; i < result.rooms.length; i++) {
      if (result.rooms[i].createdAt > result.rooms[i - 1].createdAt) {
        return { ok: false, msg: '非倒序 at ' + i }
      }
    }
    return { ok: true }
  })
})

// ===== 结果 =====
console.log('\n' + '='.repeat(60))
console.log('Property-Based Fuzz 测试结果: ' + passCount + ' passed, ' + failCount + ' failed')
if (failures.length > 0) {
  console.log('\n失败项（前 20 条）:')
  failures.slice(0, 20).forEach(function (f) { console.log('  - ' + f) })
  if (failures.length > 20) console.log('  ... 共 ' + failures.length + ' 条')
}
console.log('='.repeat(60))
process.exit(failCount > 0 ? 1 : 0)
