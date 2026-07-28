// tests/gherkin/runner.js
// Gherkin BDD 执行器：解析 .feature 文件并执行场景
// 运行: node tests/gherkin/runner.js

const fs = require('fs')
const path = require('path')
const wx = require('../mock-wx.js')
global.wx = wx

const store = require('../../utils/group-room-store.js')

let passCount = 0
let failCount = 0
let scenarioCount = 0
const failures = []

// ===== 读取 feature 文件 =====
const featurePath = path.join(__dirname, 'group-flow.feature')
const featureContent = fs.readFileSync(featurePath, 'utf-8')

// ===== 解析 feature 文件 =====
const lines = featureContent.split('\n')
const scenarios = []
let currentScenario = null
let featureTitle = ''

for (const line of lines) {
  const trimmed = line.trim()
  if (trimmed.startsWith('Feature:')) {
    featureTitle = trimmed.replace('Feature:', '').trim()
  } else if (trimmed.startsWith('Scenario:')) {
    if (currentScenario) scenarios.push(currentScenario)
    currentScenario = {
      name: trimmed.replace('Scenario:', '').trim(),
      steps: []
    }
  } else if (trimmed.match(/^(Given|When|Then|And)\s/)) {
    if (currentScenario) {
      const match = trimmed.match(/^(Given|When|Then|And)\s+(.*)$/)
      currentScenario.steps.push({
        keyword: match[1],
        text: match[2]
      })
    }
  }
}
if (currentScenario) scenarios.push(currentScenario)

// ===== 测试上下文（场景间共享状态）=====
const ctx = {
  roomId: null,
  room: null,
  result: null,
  script: null,
  stats: null
}

// ===== 步骤执行器 =====
function executeStep(step) {
  const text = step.text

  // Given
  if (text.startsWith('发起人填写主题')) {
    const m = text.match(/主题\s*"([^"]*)"\s*和人数\s*(\d+)/)
    ctx.topic = m[1]
    ctx.maxMembers = parseInt(m[2])
    return true
  }
  if (text.startsWith('已存在一个房间')) {
    const m = text.match(/"([^"]*)"\s*(\d+)人/)
    wx._reset()
    const r = store.createRoom(m[1], parseInt(m[2]))
    ctx.roomId = r.roomId
    ctx.room = store.loadRoom(r.roomId).room
    return r.ok
  }
  if (text.startsWith('已存在一个已取消的房间')) {
    wx._reset()
    const r = store.createRoom('取消测试', 4)
    store.cancelRoom(r.roomId)
    ctx.roomId = r.roomId
    return true
  }
  if (text.startsWith('已存在一个已填满的房间')) {
    const m = text.match(/(\d+)人/)
    wx._reset()
    const r = store.createRoom('填满测试', parseInt(m[1]))
    store.fillMockMembers(r.roomId)
    ctx.roomId = r.roomId
    return true
  }
  if (text.startsWith('已存在一个填满的房间')) {
    const m = text.match(/(\d+)人/)
    wx._reset()
    const r = store.createRoom('填满测试', parseInt(m[1]))
    store.fillMockMembers(r.roomId)
    ctx.roomId = r.roomId
    return true
  }
  if (text.startsWith('已存在一个所有人已投票的房间')) {
    const m = text.match(/(\d+)人/)
    wx._reset()
    const r = store.createRoom('投票测试', parseInt(m[1]))
    store.fillMockMembers(r.roomId)
    store.submitVote(r.roomId, 'time', 'afternoon')
    store.submitVote(r.roomId, 'budget', 'medium')
    store.submitVote(r.roomId, 'style', 'social')
    ctx.roomId = r.roomId
    return true
  }

  // When
  if (text === '发起人点击创建组局') {
    ctx.result = store.createRoom(ctx.topic, ctx.maxMembers)
    if (ctx.result.ok) {
      ctx.roomId = ctx.result.roomId
      ctx.room = store.loadRoom(ctx.roomId).room
    }
    return true
  }
  if (text === '发起人取消该房间') {
    ctx.result = store.cancelRoom(ctx.roomId)
    return true
  }
  if (text === '发起人再次取消') {
    ctx.result = store.cancelRoom(ctx.roomId)
    return true
  }
  if (text === '添加 1 个模拟成员') {
    ctx.result = store.addMockMember(ctx.roomId)
    if (ctx.result.ok) ctx.room = ctx.result.room
    return true
  }
  if (text === '一键填满模拟成员') {
    ctx.result = store.fillMockMembers(ctx.roomId)
    if (ctx.result.ok) ctx.room = ctx.result.room
    return true
  }
  if (text.startsWith('发起人提交偏好')) {
    const m = text.match(/兴趣\s*"([^"]*)"\s*强度\s*"([^"]*)"/)
    const interests = m[1] ? m[1].split(',') : []
    ctx.result = store.submitPreference(ctx.roomId, {
      interests: interests,
      intensity: m[2]
    })
    return true
  }
  if (text.startsWith('发起人投票')) {
    const m = text.match(/(时间|预算|风格)\s*"([^"]*)"/)
    const typeMap = { '时间': 'time', '预算': 'budget', '风格': 'style' }
    const voteType = typeMap[m[1]]
    ctx.result = store.submitVote(ctx.roomId, voteType, m[2])
    return true
  }
  if (text === '所有成员完成投票') {
    // 假成员已有投票，确保 host 也投了
    store.submitVote(ctx.roomId, 'time', 'morning')
    store.submitVote(ctx.roomId, 'budget', 'low')
    store.submitVote(ctx.roomId, 'style', 'relax')
    ctx.stats = store.getVoteStats(ctx.roomId).stats
    return true
  }
  if (text === '发起人点击生成剧本') {
    ctx.result = store.generateScript(ctx.roomId)
    if (ctx.result.ok) ctx.script = ctx.result.script
    return true
  }

  // Then
  if (text === '房间创建成功') return ctx.result.ok === true
  if (text === '房间创建失败') return ctx.result.ok === false
  if (text === '房间取消成功') return ctx.result.ok === true
  if (text === '房间取消失败') return ctx.result.ok === false
  if (text.startsWith('错误码为')) {
    const m = text.match(/"([^"]*)"/)
    return ctx.result.errCode === m[1]
  }
  if (text.startsWith('房间号是 6 位字母数字')) {
    return ctx.result.roomId && /^[A-Z0-9]{6}$/.test(ctx.result.roomId)
  }
  if (text.startsWith('房间状态为')) {
    const m = text.match(/"([^"]*)"/)
    const room = store.loadRoom(ctx.roomId).room
    return room.status === m[1]
  }
  if (text.startsWith('房间内有')) {
    const m = text.match(/(\d+)\s*个成员/)
    const room = store.loadRoom(ctx.roomId).room
    return room.members.length === parseInt(m[1])
  }
  if (text === '该成员是发起人') {
    return ctx.room.members[0].isHost === true
  }
  if (text === '新成员不是发起人') {
    return ctx.result.room.members[1].isHost === false
  }
  if (text === '新成员有偏好数据') {
    return !!ctx.result.room.members[1].preference
  }
  if (text === '新成员有投票数据') {
    return !!ctx.result.room.members[1].votes.time
  }
  if (text === '所有成员位已填满') {
    const room = store.loadRoom(ctx.roomId).room
    return room.members.length === room.maxMembers
  }
  if (text === '添加失败') return ctx.result.ok === false
  if (text === '偏好提交成功') return ctx.result.ok === true
  if (text === '偏好提交失败') return ctx.result.ok === false
  if (text === '发起人的偏好已记录') {
    const room = store.loadRoom(ctx.roomId).room
    return !!room.members[0].preference
  }
  if (text === '发起人的三票已记录') {
    const room = store.loadRoom(ctx.roomId).room
    return room.members[0].votes.time && room.members[0].votes.budget && room.members[0].votes.style
  }
  if (text.startsWith('投票统计显示')) {
    // 自动获取最新投票统计
    const statsResult = store.getVoteStats(ctx.roomId)
    ctx.stats = statsResult.ok ? statsResult.stats : null
    if (text.includes('allVoted 为 true')) return ctx.stats && ctx.stats.allVoted === true
    if (text.includes('已投票')) {
      const m = text.match(/(\d+)\s*人已投票/)
      return ctx.stats && ctx.stats.votedMembers === parseInt(m[1])
    }
    return false
  }
  if (text === '剧本生成成功') return ctx.result.ok === true
  if (text === '剧本生成失败') return ctx.result.ok === false
  if (text === '剧本有标题') return !!ctx.script.title
  if (text.startsWith('剧本有至少')) {
    const m = text.match(/(\d+)\s*个步骤/)
    return ctx.script.steps.length >= parseInt(m[1])
  }
  if (text.startsWith('剧本包含') && text !== '剧本包含所有成员名') {
    const m = text.match(/(\d+)\s*个成员名/)
    if (!m) return false
    return ctx.script.members.length === parseInt(m[1])
  }
  if (text === '剧本包含所有成员名') {
    const room = store.loadRoom(ctx.roomId).room
    return ctx.script.members.length === room.members.length
  }

  // And（复用 Then 逻辑）
  if (step.keyword === 'And') {
    return executeStep({ keyword: 'Then', text })
  }

  console.log('    ⚠ 未匹配步骤: ' + text)
  return false
}

// ===== 执行所有场景 =====
console.log('\n' + '='.repeat(50))
console.log('Feature: ' + featureTitle)
console.log('='.repeat(50))

for (const scenario of scenarios) {
  scenarioCount++
  console.log('\n--- Scenario: ' + scenario.name + ' ---')
  let scenarioPassed = true

  for (const step of scenario.steps) {
    const result = executeStep(step)
    if (result) {
      passCount++
      console.log('  ✓ ' + step.keyword + ' ' + step.text)
    } else {
      failCount++
      scenarioPassed = false
      failures.push(`Scenario "${scenario.name}": ${step.keyword} ${step.text}`)
      console.log('  ✗ ' + step.keyword + ' ' + step.text)
    }
  }

  if (scenarioPassed) {
    console.log('  ✓ 场景通过')
  } else {
    console.log('  ✗ 场景失败')
  }
}

// ===== 结果 =====
console.log('\n' + '='.repeat(50))
console.log(`Gherkin BDD 结果: ${scenarioCount} scenarios, ${passCount} steps passed, ${failCount} steps failed`)
if (failures.length > 0) {
  console.log('\n失败项:')
  failures.forEach(f => console.log('  - ' + f))
}
console.log('='.repeat(50))
process.exit(failCount > 0 ? 1 : 0)
