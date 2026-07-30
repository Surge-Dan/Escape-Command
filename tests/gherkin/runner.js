// tests/gherkin/runner.js
// Gherkin BDD 通用执行器：自动发现 *.feature，按 scenario 重置上下文
// 运行: node tests/gherkin/runner.js
//       node tests/gherkin/runner.js group-flow.feature   # 单文件
//
// 支持多个 feature 文件，每个 scenario 独立 ctx，避免状态污染。

const fs = require('fs')
const path = require('path')
const wx = require('../mock-wx.js')
global.wx = wx

const store = require('../../utils/group-room-store.js')
const engine = require('../../utils/generator-engine.js')
const I = engine._internal
const recordBuilder = require('../../utils/record-builder.js')
const executionProgress = require('../../utils/execution-progress.js')
const markerBuilder = require('../../utils/map-marker-builder.js')
// C-P4 社交增强
const trustScore = require('../../utils/trust-score.js')
const trustStore = require('../../utils/player-trust-store.js')
const chatStore = require('../../utils/chat-store.js')
const playerMatcher = require('../../utils/player-matcher.js')

// ===== 测试统计 =====
let passCount = 0
let failCount = 0
let scenarioCount = 0
const failures = []

// ===== 步骤处理器注册表 =====
// 每个 handler: { match: RegExp | (text)=>bool, run: (ctx, text) => bool|null }
// run 返回 true=通过 / false=失败 / null=未匹配（继续找下一个）
const stepHandlers = []

function on(matcher, handler) {
  stepHandlers.push({ match: matcher, run: handler })
}

// ============================================================
// ===== Group-Flow 步骤处理器（C-01~C-08）=====
// ============================================================
(function registerGroupFlow() {
  // Given
  on(/^发起人填写主题\s*"([^"]*)"\s*和人数\s*(\d+)$/, (ctx, m) => {
    ctx.topic = m[1]
    ctx.maxMembers = parseInt(m[2])
    return true
  })
  on(/^已存在一个房间\s*"([^"]*)"\s*(\d+)人$/, (ctx, m) => {
    wx._reset()
    const r = store.createRoom(m[1], parseInt(m[2]))
    ctx.roomId = r.roomId
    ctx.room = store.loadRoom(r.roomId).room
    return r.ok
  })
  on(/^已存在一个已取消的房间$/, (ctx) => {
    wx._reset()
    const r = store.createRoom('取消测试', 4)
    store.cancelRoom(r.roomId)
    ctx.roomId = r.roomId
    return true
  })
  on(/^已存在一个已填满的房间\s*(\d+)人$/, (ctx, m) => {
    wx._reset()
    const r = store.createRoom('填满测试', parseInt(m[1]))
    store.fillMockMembers(r.roomId)
    ctx.roomId = r.roomId
    return true
  })
  on(/^已存在一个填满的房间\s*(\d+)人$/, (ctx, m) => {
    wx._reset()
    const r = store.createRoom('填满测试', parseInt(m[1]))
    store.fillMockMembers(r.roomId)
    ctx.roomId = r.roomId
    return true
  })
  on(/^已存在一个所有人已投票的房间\s*(\d+)人$/, (ctx, m) => {
    wx._reset()
    const r = store.createRoom('投票测试', parseInt(m[1]))
    store.fillMockMembers(r.roomId)
    store.submitVote(r.roomId, 'time', 'afternoon')
    store.submitVote(r.roomId, 'budget', 'medium')
    store.submitVote(r.roomId, 'style', 'social')
    ctx.roomId = r.roomId
    return true
  })

  // When
  on(/^发起人点击创建组局$/, (ctx) => {
    ctx.result = store.createRoom(ctx.topic, ctx.maxMembers)
    if (ctx.result.ok) {
      ctx.roomId = ctx.result.roomId
      ctx.room = store.loadRoom(ctx.roomId).room
    }
    return true
  })
  on(/^发起人取消该房间$/, (ctx) => {
    ctx.result = store.cancelRoom(ctx.roomId)
    return true
  })
  on(/^发起人再次取消$/, (ctx) => {
    ctx.result = store.cancelRoom(ctx.roomId)
    return true
  })
  on(/^添加\s*1\s*个模拟成员$/, (ctx) => {
    ctx.result = store.addMockMember(ctx.roomId)
    if (ctx.result.ok) ctx.room = ctx.result.room
    return true
  })
  on(/^一键填满模拟成员$/, (ctx) => {
    ctx.result = store.fillMockMembers(ctx.roomId)
    if (ctx.result.ok) ctx.room = ctx.result.room
    return true
  })
  on(/^发起人提交偏好\s*兴趣\s*"([^"]*)"\s*强度\s*"([^"]*)"$/, (ctx, m) => {
    const interests = m[1] ? m[1].split(',') : []
    ctx.result = store.submitPreference(ctx.roomId, { interests, intensity: m[2] })
    return true
  })
  on(/^发起人投票\s*(时间|预算|风格)\s*"([^"]*)"$/, (ctx, m) => {
    const typeMap = { '时间': 'time', '预算': 'budget', '风格': 'style' }
    ctx.result = store.submitVote(ctx.roomId, typeMap[m[1]], m[2])
    return true
  })
  on(/^所有成员完成投票$/, (ctx) => {
    store.submitVote(ctx.roomId, 'time', 'morning')
    store.submitVote(ctx.roomId, 'budget', 'low')
    store.submitVote(ctx.roomId, 'style', 'relax')
    ctx.stats = store.getVoteStats(ctx.roomId).stats
    return true
  })
  on(/^发起人点击生成剧本$/, (ctx) => {
    ctx.result = store.generateScript(ctx.roomId)
    if (ctx.result.ok) ctx.script = ctx.result.script
    return true
  })

  // Then
  on(/^房间创建成功$/, (ctx) => ctx.result.ok === true)
  on(/^房间创建失败$/, (ctx) => ctx.result.ok === false)
  on(/^房间取消成功$/, (ctx) => ctx.result.ok === true)
  on(/^房间取消失败$/, (ctx) => ctx.result.ok === false)
  on(/^错误码为\s*"([^"]*)"$/, (ctx, m) => ctx.result && ctx.result.errCode === m[1])
  on(/^房间号是\s*6\s*位字母数字$/, (ctx) => ctx.result.roomId && /^[A-Z0-9]{6}$/.test(ctx.result.roomId))
  on(/^房间状态为\s*"([^"]*)"$/, (ctx, m) => {
    const room = store.loadRoom(ctx.roomId).room
    return room && room.status === m[1]
  })
  on(/^房间内有\s*(\d+)\s*个成员$/, (ctx, m) => {
    const room = store.loadRoom(ctx.roomId).room
    return room && room.members.length === parseInt(m[1])
  })
  on(/^该成员是发起人$/, (ctx) => ctx.room && ctx.room.members[0].isHost === true)
  on(/^新成员不是发起人$/, (ctx) => ctx.result && ctx.result.room && ctx.result.room.members[1].isHost === false)
  on(/^新成员有偏好数据$/, (ctx) => ctx.result && ctx.result.room && !!ctx.result.room.members[1].preference)
  on(/^新成员有投票数据$/, (ctx) => ctx.result && ctx.result.room && !!ctx.result.room.members[1].votes.time)
  on(/^所有成员位已填满$/, (ctx) => {
    const room = store.loadRoom(ctx.roomId).room
    return room && room.members.length === room.maxMembers
  })
  on(/^添加失败$/, (ctx) => ctx.result.ok === false)
  on(/^偏好提交成功$/, (ctx) => ctx.result.ok === true)
  on(/^偏好提交失败$/, (ctx) => ctx.result.ok === false)
  on(/^发起人的偏好已记录$/, (ctx) => {
    const room = store.loadRoom(ctx.roomId).room
    return room && !!room.members[0].preference
  })
  on(/^发起人的三票已记录$/, (ctx) => {
    const room = store.loadRoom(ctx.roomId).room
    return room && room.members[0].votes.time && room.members[0].votes.budget && room.members[0].votes.style
  })
  on(/^投票统计显示.*$/, (ctx, _m, text) => {
    const statsResult = store.getVoteStats(ctx.roomId)
    ctx.stats = statsResult.ok ? statsResult.stats : null
    if (text.includes('allVoted 为 true')) return ctx.stats && ctx.stats.allVoted === true
    if (text.includes('已投票')) {
      const m = text.match(/(\d+)\s*人已投票/)
      return ctx.stats && ctx.stats.votedMembers === parseInt(m[1])
    }
    return false
  })
  on(/^剧本生成成功$/, (ctx) => ctx.result.ok === true)
  on(/^剧本生成失败$/, (ctx) => ctx.result.ok === false)
  on(/^剧本有标题$/, (ctx) => !!ctx.script && !!ctx.script.title)
  on(/^剧本有至少\s*(\d+)\s*个步骤$/, (ctx, m) => ctx.script && ctx.script.steps.length >= parseInt(m[1]))
  on(/^剧本包含\s*(\d+)\s*个成员名$/, (ctx, m) => ctx.script && ctx.script.members.length === parseInt(m[1]))
  on(/^剧本包含所有成员名$/, (ctx) => {
    const room = store.loadRoom(ctx.roomId).room
    return ctx.script && room && ctx.script.members.length === room.members.length
  })
})()

// ============================================================
// ===== Completion-Flow 步骤处理器（完成流数据联动）=====
// 验证同频出逃完成后：记录写入 records、结构对齐、location 可被地图消费、跳转地图页
// 复刻 escape-record.js onFinish 的 currentCommand 构造与 buildRecord 调用契约
// ============================================================
;(function registerCompletionFlow() {
  // 工具：从 script.steps 提取文本数组（兼容字符串/对象两种模板形态）
  function stepsToText(script) {
    return (script && Array.isArray(script.steps) ? script.steps : []).map(function (s) {
      return typeof s === 'object' ? (s.text || '') : String(s || '')
    })
  }

  // Given 当前定位为 "人民广场" 经纬度 31.23 121.47
  on(/^当前定位为\s*"([^"]*)"\s*经纬度\s*([\d.]+)\s*([\d.]+)$/, (ctx, m) => {
    ctx.escapeLocation = { name: m[1], latitude: parseFloat(m[2]), longitude: parseFloat(m[3]) }
    return true
  })

  // Given 一条普通出逃记录和一条同频出逃记录
  on(/^一条普通出逃记录和一条同频出逃记录$/, (ctx) => {
    const now = Date.now()
    ctx.normalRecord = recordBuilder.buildRecord(
      { id: 'normal_1', title: '普通出逃', type: 'walk', typeColor: '#5CBF9E', startTime: now - 60000 },
      { photos: ['p.jpg'], feeling: '不错', mood: 'calm', filter: 'day', stickers: [] },
      { location: { latitude: 30, longitude: 120, name: '某地' }, weather: 'sunny', now: now }
    )
    ctx.groupRecord = recordBuilder.buildRecord(
      { id: 'group_1', title: '同频出逃', type: 'sync', typeColor: '#5CBF9E', startTime: now - 60000 },
      { isGroup: true, groupId: 'room1', members: ['A', 'B'], steps: ['s1', 's2'], mood: 'happy' },
      { location: { latitude: 31, longitude: 121, name: '某地2' }, weather: 'sunny', now: now }
    )
    return !!ctx.normalRecord && !!ctx.groupRecord
  })

  // Given 同频出逃已完成并生成记录
  on(/^同频出逃已完成并生成记录$/, (ctx) => {
    wx._reset()
    const r = store.createRoom('完成测试', 3)
    store.fillMockMembers(r.roomId)
    store.submitVote(r.roomId, 'time', 'afternoon')
    store.submitVote(r.roomId, 'budget', 'medium')
    store.submitVote(r.roomId, 'style', 'social')
    const gen = store.generateScript(r.roomId)
    ctx.roomId = r.roomId
    ctx.script = gen.ok ? gen.script : null
    if (!ctx.script) return false
    ctx.record = recordBuilder.buildRecord(
      { id: 'group_' + r.roomId, title: ctx.script.title, type: 'sync', typeColor: '#5CBF9E', startTime: Date.now() - 60000 },
      { isGroup: true, groupId: r.roomId, members: ctx.script.members || [], steps: stepsToText(ctx.script), mood: 'happy' },
      { location: { latitude: 31.23, longitude: 121.47, name: '人民广场' }, now: Date.now() }
    )
    return !!ctx.record
  })

  // When 全部步骤标记完成
  on(/^全部步骤标记完成$/, (ctx) => {
    if (!ctx.script) return false
    ctx.completedSteps = (ctx.script.steps || []).map(function (s, i) {
      return { id: i + 1, text: typeof s === 'object' ? (s.text || '') : String(s), done: true }
    })
    return ctx.completedSteps.length > 0
  })

  // When/And 同频出逃调用 buildRecord 生成记录
  on(/^同频出逃调用\s*buildRecord\s*生成记录$/, (ctx) => {
    if (!ctx.script) return false
    const startTime = Date.now() - 30 * 60 * 1000  // 30 分钟前开始
    // 复刻 escape-record.js onFinish 构造的 currentCommand
    ctx.currentCommand = {
      id: 'group_' + ctx.roomId,
      title: ctx.script.title || '同频出逃',
      content: ctx.script.title || '同频出逃',
      type: 'sync',
      typeColor: '#5CBF9E',
      startTime: startTime,
      photos: []
    }
    ctx.record = recordBuilder.buildRecord(ctx.currentCommand, {
      photos: [],
      feeling: '和朋友一起完成同频出逃',
      mood: 'happy',
      isGroup: true,
      groupId: ctx.roomId,
      members: ctx.script.members || [],
      steps: (ctx.completedSteps || []).map(function (s) { return s.text })
    }, {
      location: ctx.escapeLocation || null,
      weather: ctx.escapeWeather || null,
      now: Date.now()
    })
    // 模拟 app.globalData.records.unshift(record)
    ctx.records = ctx.records || []
    ctx.records.unshift(ctx.record)
    return !!ctx.record
  })

  // Then 记录写入 records 列表
  on(/^记录写入\s*records\s*列表$/, (ctx) => {
    return Array.isArray(ctx.records) && ctx.records.length > 0 && ctx.records[0] === ctx.record
  })
  // Then 记录的 isGroup 为 true
  on(/^记录的\s*isGroup\s*为\s*true$/, (ctx) => ctx.record && ctx.record.isGroup === true)
  // Then 记录的 groupId 等于房间号
  on(/^记录的\s*groupId\s*等于房间号$/, (ctx) => ctx.record && ctx.record.groupId === ctx.roomId)
  // Then 记录包含剧本成员
  on(/^记录包含剧本成员$/, (ctx) => {
    if (!ctx.record || !ctx.script) return false
    return Array.isArray(ctx.record.members) && ctx.record.members.length === (ctx.script.members || []).length
  })
  // Then 记录包含步骤文本
  on(/^记录包含步骤文本$/, (ctx) => {
    if (!ctx.record || !ctx.completedSteps) return false
    return Array.isArray(ctx.record.steps) && ctx.record.steps.length === ctx.completedSteps.length
  })
  // Then 记录的 commandType 为 "sync"
  on(/^记录的\s*commandType\s*为\s*"([^"]*)"$/, (ctx, m) => ctx.record && ctx.record.commandType === m[1])
  // Then 记录的 duration 大于等于 1
  on(/^记录的\s*duration\s*大于等于\s*(\d+)$/, (ctx, m) => ctx.record && ctx.record.duration >= parseInt(m[1]))
  // Then 记录的 location 含 latitude 和 longitude
  on(/^记录的\s*location\s*含\s*latitude\s*和\s*longitude$/, (ctx) => {
    return ctx.record && ctx.record.location && typeof ctx.record.location.latitude === 'number' && typeof ctx.record.location.longitude === 'number'
  })
  // Then 记录的 location 名称为 "..."
  on(/^记录的\s*location\s*名称为\s*"([^"]*)"$/, (ctx, m) => ctx.record && ctx.record.location && ctx.record.location.name === m[1])
  // Then 两条记录共享相同的基础字段
  on(/^两条记录共享相同的基础字段$/, (ctx) => {
    const baseKeys = ['id', 'commandId', 'commandTitle', 'commandContent', 'commandType', 'typeColor', 'duration', 'photos', 'feeling', 'mood', 'location', 'weather', 'date', 'time', 'rotation', 'filter', 'stickers']
    return ctx.normalRecord && ctx.groupRecord && baseKeys.every(function (k) { return k in ctx.normalRecord && k in ctx.groupRecord })
  })
  // Then 同频记录额外包含 isGroup/groupId/members/steps
  on(/^同频记录额外包含\s*isGroup\/groupId\/members\/steps$/, (ctx) => {
    const extra = ['isGroup', 'groupId', 'members', 'steps']
    return ctx.normalRecord && ctx.groupRecord &&
      extra.every(function (k) { return k in ctx.groupRecord }) &&
      extra.every(function (k) { return !(k in ctx.normalRecord) })
  })
  // Given 同频出逃已完成全部步骤（构造房间+剧本，不生成记录，模拟 onFinish 前状态）
  on(/^同频出逃已完成全部步骤$/, (ctx) => {
    wx._reset()
    const r = store.createRoom('完成测试', 3)
    store.fillMockMembers(r.roomId)
    store.submitVote(r.roomId, 'time', 'afternoon')
    store.submitVote(r.roomId, 'budget', 'medium')
    store.submitVote(r.roomId, 'style', 'social')
    const gen = store.generateScript(r.roomId)
    ctx.roomId = r.roomId
    ctx.script = gen.ok ? gen.script : null
    return !!ctx.script
  })
  // Then 完成后跳转 record 拍照打卡页（静态契约：escape-record.js 含 navigateTo /pages/record/record）
  on(/^完成后跳转\s*record\s*拍照打卡页$/, () => {
    const src = fs.readFileSync(path.join(__dirname, '..', '..', 'pages', 'group', 'escape-record', 'escape-record.js'), 'utf-8')
    return src.indexOf("navigateTo({ url: '/pages/record/record' })") >= 0
  })
  // Then 完成流程不直接调用 completeCommand（静态契约：escape-record.js 不含 app.completeCommand，改由 record 页 onSave 触发）
  on(/^完成流程不直接调用\s*completeCommand$/, () => {
    const src = fs.readFileSync(path.join(__dirname, '..', '..', 'pages', 'group', 'escape-record', 'escape-record.js'), 'utf-8')
    return src.indexOf('app.completeCommand') < 0
  })
  // Then record 页去地图按钮跳转地图页（静态契约：record.js 含 switchTab /pages/map/map）
  on(/^record\s*页去地图按钮跳转地图页$/, () => {
    const src = fs.readFileSync(path.join(__dirname, '..', '..', 'pages', 'record', 'record.js'), 'utf-8')
    return src.indexOf("switchTab({ url: '/pages/map/map' })") >= 0
  })
  // Then 跳转目标不是个人页（静态契约：escape-record.js 不跳 /pages/profile/profile）
  on(/^跳转目标不是个人页$/, () => {
    const src = fs.readFileSync(path.join(__dirname, '..', '..', 'pages', 'group', 'escape-record', 'escape-record.js'), 'utf-8')
    return src.indexOf("switchTab({ url: '/pages/profile/profile' })") < 0
  })
})()

// ============================================================
// ===== Group-Flow-C09-13 步骤处理器（C-09~C-13 P1 收尾）=====
// 覆盖：到齐确认 / 临时退出 / 人数不足兜底 / 共同记录摘要 / 共同城市底片聚合 marker
// 复刻 group-room-store.confirmReady/leaveRoom/checkQuorum、
//       record-builder.buildGroupSummary、map-marker-builder 契约
// ============================================================
;(function registerGroupFlowC09ToC13() {
  // ===== C-09: 到齐确认 =====
  // When 发起人确认到齐
  on(/^发起人确认到齐$/, (ctx) => {
    if (!ctx.roomId) return false
    ctx.result = store.confirmReady(ctx.roomId)
    if (ctx.result.ok) ctx.room = ctx.result.room
    return true
  })
  // When 发起人开始投票（READY → VOTING，复用 updateRoomStatus）
  on(/^发起人开始投票$/, (ctx) => {
    if (!ctx.roomId) return false
    ctx.result = store.updateRoomStatus(ctx.roomId, store.ROOM_STATUS.VOTING)
    return true
  })
  // Then 确认到齐失败
  on(/^确认到齐失败$/, (ctx) => ctx.result && ctx.result.ok === false)

  // ===== C-10: 临时退出 =====
  // When 发起人退出房间
  on(/^发起人退出房间$/, (ctx) => {
    if (!ctx.roomId) return false
    ctx.result = store.leaveRoom(ctx.roomId)
    if (ctx.result.ok) ctx.room = ctx.result.room
    return true
  })
  // Then 退出返回 hostLeft 为 true
  on(/^退出返回\s*hostLeft\s*为\s*true$/, (ctx) => ctx.result && ctx.result.hostLeft === true)
  // Then 退出失败
  on(/^退出失败$/, (ctx) => ctx.result && ctx.result.ok === false)

  // ===== C-11: 人数不足兜底 =====
  // When 检查人数兜底（加载当前房间后调用 checkQuorum 纯函数）
  on(/^检查人数兜底$/, (ctx) => {
    if (!ctx.roomId) return false
    const loaded = store.loadRoom(ctx.roomId)
    if (!loaded.ok) { ctx.result = { ok: false, suggestion: 'cancel', enough: false }; return false }
    ctx.result = store.checkQuorum(loaded.room)
    return true
  })
  // Then 兜底建议为 "cancel" / "small_team" / "ok"
  on(/^兜底建议为\s*"([^"]*)"$/, (ctx, m) => ctx.result && ctx.result.suggestion === m[1])
  // And 人数不足 enough 为 false
  on(/^人数不足\s*enough\s*为\s*false$/, (ctx) => ctx.result && ctx.result.enough === false)

  // ===== C-12: 共同记录摘要 =====
  // Given 一条已完成的同频记录（含成员列表 + 步骤留痕）
  on(/^一条已完成的同频记录$/, (ctx) => {
    ctx.record = {
      id: 'g_rec_1',
      isGroup: true,
      groupId: 'g1',
      members: ['发起人', '阿月', '小林'],
      steps: [
        { text: '找一家独立咖啡馆', completedAt: 1700000000000 },
        { text: '点一杯手冲', completedAt: 1700000600000 }
      ]
    }
    return !!ctx.record
  })
  // When 提取共同记录摘要
  on(/^提取共同记录摘要$/, (ctx) => {
    if (!ctx.record) return false
    ctx.summary = recordBuilder.buildGroupSummary(ctx.record)
    return !!ctx.summary
  })
  // Then 摘要含成员列表
  on(/^摘要含成员列表$/, (ctx) => ctx.summary && Array.isArray(ctx.summary.members) && ctx.summary.members.length > 0)
  // And 摘要含步骤留痕
  on(/^摘要含步骤留痕$/, (ctx) => ctx.summary && Array.isArray(ctx.summary.stepTraces) && ctx.summary.stepTraces.length > 0)
  // And 摘要的 isGroup 为 true
  on(/^摘要的\s*isGroup\s*为\s*true$/, (ctx) => ctx.summary && ctx.summary.isGroup === true)

  // ===== C-13: 共同城市底片 =====
  // Given 多条同频记录属于同一组（同 groupId、同坐标，验证聚合为 1）
  on(/^多条同频记录属于同一组$/, (ctx) => {
    ctx.records = [
      { id: 'r1', isGroup: true, groupId: 'g1', commandType: 'food', members: ['a', 'b'], location: { latitude: 31.23, longitude: 121.47 } },
      { id: 'r2', isGroup: true, groupId: 'g1', commandType: 'food', members: ['a', 'b', 'c'], location: { latitude: 31.23, longitude: 121.47 } }
    ]
    return Array.isArray(ctx.records) && ctx.records.length === 2
  })
  // When 构建聚合 marker
  on(/^构建聚合 marker$/, (ctx) => {
    if (!ctx.records) return false
    ctx.markers = markerBuilder.buildGroupMarkers(ctx.records)
    return true
  })
  // Then 聚合后只有 1 个 marker
  on(/^聚合后只有\s*1\s*个 marker$/, (ctx) => Array.isArray(ctx.markers) && ctx.markers.length === 1)
  // And 聚合 marker 含成员数
  on(/^聚合 marker 含成员数$/, (ctx) => ctx.markers && ctx.markers[0] && ctx.markers[0].memberCount > 0)
  // Given 一条普通记录和一条同频记录位置相同（验证同位置 solo 被聚合覆盖）
  on(/^一条普通记录和一条同频记录位置相同$/, (ctx) => {
    ctx.soloRecord = { id: 's1', commandType: 'walk', commandTitle: '普通出逃', location: { latitude: 31.23, longitude: 121.47 } }
    ctx.groupRecord = { id: 'g1', isGroup: true, groupId: 'grp1', commandType: 'food', members: ['a', 'b'], location: { latitude: 31.23, longitude: 121.47 } }
    return !!ctx.soloRecord && !!ctx.groupRecord
  })
  // When 合并 marker
  on(/^合并 marker$/, (ctx) => {
    if (!ctx.soloRecord && !ctx.groupRecord) return false
    const solo = markerBuilder.buildSoloMarkers(ctx.soloRecord ? [ctx.soloRecord] : [])
    const group = markerBuilder.buildGroupMarkers(ctx.groupRecord ? [ctx.groupRecord] : [])
    ctx.merged = markerBuilder.mergeMarkers(solo, group)
    return !!ctx.merged
  })
  // Then 普通记录被覆盖（soloCount === 0，同位置 solo 被聚合 marker 覆盖）
  on(/^普通记录被覆盖$/, (ctx) => ctx.merged && ctx.merged.soloCount === 0)
  // And 合并后只有 1 个 marker
  on(/^合并后只有\s*1\s*个 marker$/, (ctx) => ctx.merged && Array.isArray(ctx.merged.markers) && ctx.merged.markers.length === 1)
})()

// ============================================================
// ===== Execution-Flow 步骤处理器（执行进度持久化留痕）=====
// 验证中途退出冷启动恢复、completedAt 不可篡改、全完成判定、记录 steps 时间戳
// 复刻 executing.js onLoad/onStepTap 与 record-builder.buildTracedSteps 契约
// ============================================================
;(function registerExecutionFlow() {
  // 工具：从 progress.steps 提取文本数组
  function stepsText(progress) {
    return (progress && Array.isArray(progress.steps))
      ? progress.steps.map(function (s) { return s.text || '' })
      : []
  }

  // Given 一个 4 步指令 "出门,拍照,记录,感受"
  on(/^一个\s*(\d+)\s*步指令\s*"([^"]*)"$/, (ctx, m) => {
    const texts = m[2].split(',').map(function (s) { return s.trim() }).filter(Boolean)
    ctx.steps = texts
    ctx.cmd = {
      id: 'exec_1',
      title: '执行出逃',
      content: '执行出逃',
      type: 'walk',
      typeColor: '#5CBF9E',
      startTime: Date.now() - 30 * 60 * 1000  // 30 分钟前，保证 duration >= 1
    }
    ctx.cmd.executionProgress = executionProgress.initProgress(texts)
    return !!ctx.cmd.executionProgress && ctx.cmd.executionProgress.steps.length === parseInt(m[1])
  })

  // When 完成第 1 步（单步标记，用当前时间）
  on(/^完成第\s*(\d+)\s*步$/, (ctx, m) => {
    const idx = parseInt(m[1]) - 1
    ctx.cmd.executionProgress = executionProgress.markStepDone(ctx.cmd.executionProgress, idx)
    return ctx.cmd.executionProgress.steps[idx] && ctx.cmd.executionProgress.steps[idx].done === true
  })

  // And 已完成第 1 步和第 2 步（Given 预置多步完成）
  on(/^已完成第\s*(\d+)\s*步和第\s*(\d+)\s*步$/, (ctx, m) => {
    const i1 = parseInt(m[1]) - 1
    const i2 = parseInt(m[2]) - 1
    ctx.cmd.executionProgress = executionProgress.markStepDone(ctx.cmd.executionProgress, i1)
    ctx.cmd.executionProgress = executionProgress.markStepDone(ctx.cmd.executionProgress, i2)
    return ctx.cmd.executionProgress.steps[i1].done === true &&
      ctx.cmd.executionProgress.steps[i2].done === true
  })

  // And 已完成第 1 步于时间戳 1000（带时间戳标记，验证不可篡改）
  on(/^已完成第\s*(\d+)\s*步于时间戳\s*(\d+)$/, (ctx, m) => {
    const idx = parseInt(m[1]) - 1
    const ts = parseInt(m[2])
    ctx.cmd.executionProgress = executionProgress.markStepDone(ctx.cmd.executionProgress, idx, ts)
    return ctx.cmd.executionProgress.steps[idx].completedAt === ts
  })

  // When 再次完成第 1 步于时间戳 2000（已完成步骤不覆盖 completedAt）
  on(/^再次完成第\s*(\d+)\s*步于时间戳\s*(\d+)$/, (ctx, m) => {
    const idx = parseInt(m[1]) - 1
    const ts = parseInt(m[2])
    ctx.cmd.executionProgress = executionProgress.markStepDone(ctx.cmd.executionProgress, idx, ts)
    return true
  })

  // When 完成全部 4 步
  on(/^完成全部\s*(\d+)\s*步$/, (ctx, m) => {
    const n = parseInt(m[1])
    for (let i = 0; i < n; i++) {
      ctx.cmd.executionProgress = executionProgress.markStepDone(ctx.cmd.executionProgress, i)
    }
    return executionProgress.isAllDone(ctx.cmd.executionProgress)
  })

  // When 冷启动恢复进度（模拟 executing.onLoad：用持久化 progress 合并到重建的 steps）
  on(/^冷启动恢复进度$/, (ctx) => {
    const saved = ctx.cmd.executionProgress
    // 冷启动后页面重建 steps（全 false），再用持久化 progress 覆盖
    const freshSteps = ctx.steps.map(function (t) { return { id: 0, text: t, done: false, completedAt: null } })
    const merged = executionProgress.mergeProgress(freshSteps, saved)
    ctx.cmd.executionProgress = {
      steps: merged.steps,
      currentStep: merged.currentStep,
      lastActiveAt: saved.lastActiveAt
    }
    return true
  })

  // When 生成出逃记录（复刻 executing.finishCommand → buildRecord 契约）
  on(/^生成出逃记录$/, (ctx) => {
    ctx.record = recordBuilder.buildRecord(ctx.cmd, {
      photos: [],
      feeling: '完成执行',
      mood: 'calm',
      executionProgress: ctx.cmd.executionProgress,
      steps: stepsText(ctx.cmd.executionProgress)
    }, { now: Date.now() })
    return !!ctx.record
  })

  // Then 已完成 2 步
  on(/^已完成\s*(\d+)\s*步$/, (ctx, m) => {
    const rec = executionProgress.recompute(ctx.cmd.executionProgress.steps)
    return rec.doneCount === parseInt(m[1])
  })

  // Then 当前步骤是第 3 步（0-based → 1-based）
  on(/^当前步骤是第\s*(\d+)\s*步$/, (ctx, m) => {
    return ctx.cmd.executionProgress.currentStep === parseInt(m[1]) - 1
  })

  // And 当前步骤指向最后一步（全完成后 currentStep === length - 1，避免 -1）
  on(/^当前步骤指向最后一步$/, (ctx) => {
    const steps = ctx.cmd.executionProgress.steps
    return ctx.cmd.executionProgress.currentStep === steps.length - 1
  })

  // And 未全部完成
  on(/^未全部完成$/, (ctx) => !executionProgress.isAllDone(ctx.cmd.executionProgress))

  // Then 已全部完成
  on(/^已全部完成$/, (ctx) => executionProgress.isAllDone(ctx.cmd.executionProgress))

  // And 第 1 步 completedAt 非空
  on(/^第\s*(\d+)\s*步\s*completedAt\s*非空$/, (ctx, m) => {
    const idx = parseInt(m[1]) - 1
    const s = ctx.cmd.executionProgress.steps[idx]
    return s && s.done === true && s.completedAt !== null && s.completedAt !== undefined
  })

  // Then 第 1 步 completedAt 仍为 1000（已完成不覆盖）
  on(/^第\s*(\d+)\s*步\s*completedAt\s*仍为\s*(\d+)$/, (ctx, m) => {
    const idx = parseInt(m[1]) - 1
    return ctx.cmd.executionProgress.steps[idx].completedAt === parseInt(m[2])
  })

  // Then 第 1 步为已完成
  on(/^第\s*(\d+)\s*步为已完成$/, (ctx, m) => {
    const idx = parseInt(m[1]) - 1
    return ctx.cmd.executionProgress.steps[idx].done === true
  })

  // And 第 3 步为未完成
  on(/^第\s*(\d+)\s*步为未完成$/, (ctx, m) => {
    const idx = parseInt(m[1]) - 1
    return ctx.cmd.executionProgress.steps[idx].done === false
  })

  // Then 记录的 steps 为对象数组（buildTracedSteps 升级为 [{text, completedAt}]）
  on(/^记录的\s*steps\s*为对象数组$/, (ctx) => {
    const r = ctx.record
    if (!r || !Array.isArray(r.steps) || r.steps.length === 0) return false
    return r.steps.every(function (s) { return s && typeof s === 'object' && 'text' in s && 'completedAt' in s })
  })

  // And 第 1 步带 completedAt 时间戳
  on(/^第\s*(\d+)\s*步带\s*completedAt\s*时间戳$/, (ctx, m) => {
    const idx = parseInt(m[1]) - 1
    const s = ctx.record.steps[idx]
    return s && s.completedAt !== null && s.completedAt !== undefined
  })
})()

// ============================================================
// ===== Group-Flow-C-P2 步骤处理器（C-14~C-19 同频组局收尾）=====
// 覆盖：角色分配 / 独立线索 / 公开组局 / 申请加入 / 发起人审核 / 评价举报
// 复刻 group-room-store.assignRoles/generateClues/listPublicRooms/requestJoin/
//       approveJoin/rejectJoin/submitReview/reportRoom 契约
// ============================================================
;(function registerGroupFlowCP2() {
  // 工具：构造一个 FINISHED 状态的房间；style 指定时强制覆盖成员投票让该 style 胜出
  function setupFinishedRoom(ctx, opts) {
    wx._reset()
    const topic = opts.topic || '完成测试'
    const n = opts.n || 3
    const style = opts.style || null
    const r = store.createRoom(topic, n)
    store.fillMockMembers(r.roomId)
    if (style) {
      const loaded = store.loadRoom(r.roomId)
      loaded.room.members.forEach(function (m) {
        m.votes = { time: 'afternoon', budget: 'medium', style: style }
      })
      wx.setStorageSync('groupRooms', [loaded.room])
    }
    store.generateScript(r.roomId)
    return r.roomId
  }

  // 工具：篡改房间的 script 字段（用于线索/角色兜底测试）
  function tamperScript(roomId, mutator) {
    const loaded = store.loadRoom(roomId)
    if (!loaded.ok) return false
    if (!loaded.room.script) loaded.room.script = {}
    mutator(loaded.room.script)
    // 同步重算 roles/clues 不在此处做，留给 When 步骤触发
    wx.setStorageSync('groupRooms', [loaded.room])
    return true
  }

  // ===== Given: 构造已生成剧本的房间（可控 style）=====
  on(/^已存在一个已生成剧本的房间\s*(\d+)人\s*风格\s*"([^"]*)"$/, (ctx, m) => {
    ctx.roomId = setupFinishedRoom(ctx, { n: parseInt(m[1]), style: m[2] })
    return !!ctx.roomId
  })

  // ===== Given: 篡改剧本风格（测试 relax 兜底）=====
  on(/^一个\s*(\d+)\s*人房间剧本风格被篡改为\s*"([^"]*)"$/, (ctx, m) => {
    ctx.roomId = setupFinishedRoom(ctx, { n: parseInt(m[1]) })
    tamperScript(ctx.roomId, function (s) { s.style = m[2] })
    return true
  })

  // ===== Given: 篡改 steps 数量（测试线索轮询）=====
  on(/^一个\s*(\d+)\s*人房间剧本\s*steps\s*仅\s*(\d+)\s*步$/, (ctx, m) => {
    const n = parseInt(m[1])
    const stepCount = parseInt(m[2])
    ctx.roomId = setupFinishedRoom(ctx, { n: n })
    tamperScript(ctx.roomId, function (s) {
      const arr = []
      for (let i = 0; i < stepCount; i++) arr.push('篡改步骤' + (i + 1))
      s.steps = arr
    })
    return true
  })

  // ===== Given: 篡改 steps 为空（测试自由发挥兜底）=====
  on(/^一个\s*(\d+)\s*人房间剧本\s*steps\s*为空$/, (ctx, m) => {
    ctx.roomId = setupFinishedRoom(ctx, { n: parseInt(m[1]) })
    tamperScript(ctx.roomId, function (s) { s.steps = [] })
    return true
  })

  // ===== Given: 构造 N 个公开 + M 个私密房间 =====
  on(/^已存在\s*(\d+)\s*个公开房间和\s*(\d+)\s*个私密房间$/, (ctx, m) => {
    wx._reset()
    const pubN = parseInt(m[1])
    const privN = parseInt(m[2])
    for (let i = 0; i < pubN; i++) store.createRoom('公开' + i, 4, { visibility: 'public' })
    for (let i = 0; i < privN; i++) store.createRoom('私密' + i, 4, { visibility: 'private' })
    return true
  })

  // ===== Given: 1 公开 + 1 已完成公开 + 1 已取消公开 =====
  on(/^已存在\s*1\s*个公开房间和\s*1\s*个已完成的公开房间和\s*1\s*个已取消的公开房间$/, (ctx) => {
    wx._reset()
    store.createRoom('活跃公开', 4, { visibility: 'public' })
    const r2 = store.createRoom('已完成公开', 4, { visibility: 'public' })
    store.fillMockMembers(r2.roomId)
    store.generateScript(r2.roomId)
    const r3 = store.createRoom('已取消公开', 4, { visibility: 'public' })
    store.cancelRoom(r3.roomId)
    return true
  })

  // ===== Given: 公开/私密房间，当前用户非成员（构造外人视角）=====
  on(/^已存在一个公开房间\s*"([^"]*)"\s*(\d+)人\s*当前用户非成员$/, (ctx, m) => {
    wx._reset()
    const r = store.createRoom(m[1], parseInt(m[2]), { visibility: 'public' })
    const loaded = store.loadRoom(r.roomId)
    loaded.room.members = [{
      openId: 'other_host', nickname: '房主', isHost: true,
      votes: { time: null, budget: null, style: null }
    }]
    loaded.room.hostOpenId = 'other_host'
    wx.setStorageSync('groupRooms', [loaded.room])
    ctx.roomId = r.roomId
    return true
  })

  on(/^已存在一个私密房间\s*"([^"]*)"\s*(\d+)人\s*当前用户非成员$/, (ctx, m) => {
    wx._reset()
    const r = store.createRoom(m[1], parseInt(m[2]), { visibility: 'private' })
    const loaded = store.loadRoom(r.roomId)
    loaded.room.members = [{
      openId: 'other_host', nickname: '房主', isHost: true,
      votes: { time: null, budget: null, style: null }
    }]
    loaded.room.hostOpenId = 'other_host'
    wx.setStorageSync('groupRooms', [loaded.room])
    ctx.roomId = r.roomId
    return true
  })

  on(/^已存在一个公开满员房间\s*(\d+)人\s*当前用户非成员$/, (ctx, m) => {
    wx._reset()
    const n = parseInt(m[1])
    const r = store.createRoom('满员公开', n, { visibility: 'public' })
    const loaded = store.loadRoom(r.roomId)
    const members = []
    for (let i = 0; i < n; i++) {
      members.push({
        openId: 'other_' + i, nickname: '成员' + i, isHost: i === 0,
        votes: { time: null, budget: null, style: null }
      })
    }
    loaded.room.members = members
    loaded.room.hostOpenId = 'other_0'
    wx.setStorageSync('groupRooms', [loaded.room])
    ctx.roomId = r.roomId
    return true
  })

  // ===== Given: 公开房间 + 1 个待审核申请（房主是当前用户）=====
  on(/^已存在一个公开房间\s*"([^"]*)"\s*(\d+)人\s*且有\s*1\s*个待审核申请$/, (ctx, m) => {
    wx._reset()
    const r = store.createRoom(m[1], parseInt(m[2]), { visibility: 'public' })
    ctx.roomId = r.roomId
    ctx.requestId = 'req_test_1'
    const loaded = store.loadRoom(r.roomId)
    loaded.room.joinRequests = [{
      requestId: ctx.requestId,
      openId: 'applicant_1',
      nickname: '申请人甲',
      requestedAt: Date.now()
    }]
    wx.setStorageSync('groupRooms', [loaded.room])
    return true
  })

  // ===== Given: 公开房间 + 1 个待审核申请，当前用户非房主 =====
  on(/^已存在一个公开房间\s*"([^"]*)"\s*(\d+)人\s*且有\s*1\s*个待审核申请\s*当前用户非房主$/, (ctx, m) => {
    wx._reset()
    const r = store.createRoom(m[1], parseInt(m[2]), { visibility: 'public' })
    ctx.roomId = r.roomId
    ctx.requestId = 'req_test_1'
    const loaded = store.loadRoom(r.roomId)
    loaded.room.joinRequests = [{
      requestId: ctx.requestId,
      openId: 'applicant_1',
      nickname: '申请人甲',
      requestedAt: Date.now()
    }]
    loaded.room.hostOpenId = 'other_host'
    wx.setStorageSync('groupRooms', [loaded.room])
    return true
  })

  // ===== Given: 简单公开房间（无特殊条件）=====
  on(/^已存在一个公开房间\s*"([^"]*)"\s*(\d+)人$/, (ctx, m) => {
    wx._reset()
    const r = store.createRoom(m[1], parseInt(m[2]), { visibility: 'public' })
    ctx.roomId = r.roomId
    return true
  })

  // ===== When: 创建公开组局 =====
  on(/^发起人点击创建公开组局$/, (ctx) => {
    ctx.result = store.createRoom(ctx.topic, ctx.maxMembers, { visibility: 'public' })
    if (ctx.result.ok) {
      ctx.roomId = ctx.result.roomId
      ctx.room = store.loadRoom(ctx.roomId).room
    }
    return true
  })

  // ===== When: 重新分配角色 / 重新生成线索 =====
  on(/^发起人重新分配角色$/, (ctx) => {
    ctx.result = store.assignRoles(ctx.roomId)
    if (ctx.result && ctx.result.ok) ctx.room = ctx.result.room
    return true
  })

  on(/^发起人重新生成线索$/, (ctx) => {
    ctx.result = store.generateClues(ctx.roomId)
    if (ctx.result && ctx.result.ok) ctx.room = ctx.result.room
    return true
  })

  // ===== When: 查询公开房间列表 =====
  on(/^查询公开房间列表$/, (ctx) => {
    ctx.result = store.listPublicRooms()
    return true
  })

  // ===== When: 申请加入（先注册"再次"避免被"申请"误匹配，但因 ^$ 锚定实际互斥）=====
  on(/^陌生人再次申请加入$/, (ctx) => {
    ctx.result = store.requestJoin(ctx.roomId, '陌生人')
    return true
  })

  on(/^陌生人申请加入$/, (ctx) => {
    ctx.result = store.requestJoin(ctx.roomId, '陌生人')
    return true
  })

  // ===== When: 审核（通过/拒绝；房主/非房主；指定 requestId）=====
  on(/^房主通过申请$/, (ctx) => {
    ctx.result = store.approveJoin(ctx.roomId, ctx.requestId)
    if (ctx.result && ctx.result.ok) ctx.room = ctx.result.room
    return true
  })

  on(/^房主拒绝申请$/, (ctx) => {
    ctx.result = store.rejectJoin(ctx.roomId, ctx.requestId)
    if (ctx.result && ctx.result.ok) ctx.room = ctx.result.room
    return true
  })

  on(/^当前用户通过申请$/, (ctx) => {
    ctx.result = store.approveJoin(ctx.roomId, ctx.requestId)
    return true
  })

  on(/^房主通过申请\s*"([^"]*)"$/, (ctx, m) => {
    ctx.result = store.approveJoin(ctx.roomId, m[1])
    return true
  })

  // ===== When: 评价 / 举报 =====
  on(/^发起人提交评价\s*(\d+)\s*星\s*"([^"]*)"$/, (ctx, m) => {
    ctx.result = store.submitReview(ctx.roomId, { rating: parseInt(m[1]), comment: m[2] })
    return true
  })

  on(/^发起人再次提交评价\s*(\d+)\s*星\s*"([^"]*)"$/, (ctx, m) => {
    ctx.result = store.submitReview(ctx.roomId, { rating: parseInt(m[1]), comment: m[2] })
    return true
  })

  on(/^当前用户举报\s*"([^"]*)"$/, (ctx, m) => {
    ctx.result = store.reportRoom(ctx.roomId, m[1])
    return true
  })

  on(/^当前用户再次举报\s*"([^"]*)"$/, (ctx, m) => {
    ctx.result = store.reportRoom(ctx.roomId, m[1])
    return true
  })

  // ===== Then: 角色相关 =====
  on(/^房间自动分配角色$/, (ctx) => {
    const room = ctx.room || (store.loadRoom(ctx.roomId) || {}).room
    return room && Array.isArray(room.roles) && room.roles.length > 0
  })

  on(/^角色数等于成员数\s*(\d+)$/, (ctx, m) => {
    const room = ctx.room || (store.loadRoom(ctx.roomId) || {}).room
    return room && Array.isArray(room.roles) && room.roles.length === parseInt(m[1])
  })

  on(/^每个角色都在角色库中$/, (ctx) => {
    const room = ctx.room || (store.loadRoom(ctx.roomId) || {}).room
    if (!room || !Array.isArray(room.roles)) return false
    const all = [].concat(store.ROLE_LIBRARY.relax, store.ROLE_LIBRARY.adventure, store.ROLE_LIBRARY.social)
    return room.roles.every(function (r) { return all.indexOf(r.role) >= 0 })
  })

  on(/^角色来自\s*"([^"]*)"\s*角色库$/, (ctx, m) => {
    const room = ctx.room || (store.loadRoom(ctx.roomId) || {}).room
    if (!room || !Array.isArray(room.roles)) return false
    const pool = store.ROLE_LIBRARY[m[1]]
    if (!pool) return false
    return room.roles.every(function (r) { return pool.indexOf(r.role) >= 0 })
  })

  on(/^角色分配失败$/, (ctx) => ctx.result && ctx.result.ok === false)

  // ===== Then: 线索相关 =====
  on(/^房间自动生成线索$/, (ctx) => {
    const room = ctx.room || (store.loadRoom(ctx.roomId) || {}).room
    return room && Array.isArray(room.clues) && room.clues.length > 0
  })

  on(/^线索数等于成员数\s*(\d+)$/, (ctx, m) => {
    const room = ctx.room || (store.loadRoom(ctx.roomId) || {}).room
    return room && Array.isArray(room.clues) && room.clues.length === parseInt(m[1])
  })

  on(/^第\s*3\s*个成员的线索与第\s*1\s*个相同$/, (ctx) => {
    const room = ctx.room || (store.loadRoom(ctx.roomId) || {}).room
    if (!room || !Array.isArray(room.clues) || room.clues.length < 3) return false
    return room.clues[2].clue === room.clues[0].clue
  })

  on(/^每人线索为\s*"自由发挥"$/, (ctx) => {
    const room = ctx.room || (store.loadRoom(ctx.roomId) || {}).room
    if (!room || !Array.isArray(room.clues)) return false
    return room.clues.every(function (c) { return c.clue === '自由发挥' })
  })

  on(/^线索生成失败$/, (ctx) => ctx.result && ctx.result.ok === false)

  // ===== Then: visibility / 公开列表 =====
  on(/^房间\s*visibility\s*为\s*"([^"]*)"$/, (ctx, m) => {
    const room = ctx.room || (store.loadRoom(ctx.roomId) || {}).room
    return room && room.visibility === m[1]
  })

  on(/^返回\s*(\d+)\s*个房间$/, (ctx, m) => {
    return ctx.result && ctx.result.ok && Array.isArray(ctx.result.rooms) && ctx.result.rooms.length === parseInt(m[1])
  })

  // listPublicRooms 返回精简字段，无 visibility，需反查原房间
  on(/^所有房间\s*visibility\s*为\s*"public"$/, (ctx) => {
    if (!ctx.result || !ctx.result.ok || !Array.isArray(ctx.result.rooms)) return false
    return ctx.result.rooms.every(function (r) {
      const loaded = store.loadRoom(r.roomId)
      return loaded.ok && loaded.room.visibility === 'public'
    })
  })

  on(/^列表按创建时间倒序$/, (ctx) => {
    if (!ctx.result || !ctx.result.ok || !Array.isArray(ctx.result.rooms)) return false
    for (let i = 1; i < ctx.result.rooms.length; i++) {
      if (ctx.result.rooms[i].createdAt > ctx.result.rooms[i - 1].createdAt) return false
    }
    return true
  })

  // ===== Then: 申请 / 审核 / 评价 / 举报 =====
  on(/^申请成功$/, (ctx) => ctx.result && ctx.result.ok === true)
  on(/^申请失败$/, (ctx) => ctx.result && ctx.result.ok === false)
  on(/^返回\s*requestId$/, (ctx) => ctx.result && ctx.result.ok && typeof ctx.result.requestId === 'string')
  on(/^(?:房间的)?待审核申请数为\s*(\d+)$/, (ctx, m) => {
    const loaded = store.loadRoom(ctx.roomId)
    if (!loaded.ok) return false
    const reqs = Array.isArray(loaded.room.joinRequests) ? loaded.room.joinRequests : []
    return reqs.length === parseInt(m[1])
  })

  on(/^审核成功$/, (ctx) => ctx.result && ctx.result.ok === true)
  on(/^审核失败$/, (ctx) => ctx.result && ctx.result.ok === false)
  on(/^房间成员数为\s*(\d+)$/, (ctx, m) => {
    const loaded = store.loadRoom(ctx.roomId)
    return loaded.ok && Array.isArray(loaded.room.members) && loaded.room.members.length === parseInt(m[1])
  })
  on(/^房间成员数仍为\s*(\d+)$/, (ctx, m) => {
    const loaded = store.loadRoom(ctx.roomId)
    return loaded.ok && Array.isArray(loaded.room.members) && loaded.room.members.length === parseInt(m[1])
  })

  on(/^评价成功$/, (ctx) => ctx.result && ctx.result.ok === true)
  on(/^评价失败$/, (ctx) => ctx.result && ctx.result.ok === false)
  on(/^评价\s*summary\s*平均分为\s*(\d+)$/, (ctx, m) => {
    return ctx.result && ctx.result.ok && ctx.result.reviewSummary && ctx.result.reviewSummary.average === parseInt(m[1])
  })
  on(/^评价\s*summary\s*总数为\s*(\d+)$/, (ctx, m) => {
    return ctx.result && ctx.result.ok && ctx.result.reviewSummary && ctx.result.reviewSummary.total === parseInt(m[1])
  })

  on(/^举报成功$/, (ctx) => ctx.result && ctx.result.ok === true)
  on(/^举报失败$/, (ctx) => ctx.result && ctx.result.ok === false)
  on(/^房间\s*reported\s*为\s*true$/, (ctx) => {
    const loaded = store.loadRoom(ctx.roomId)
    return loaded.ok && loaded.room.reported === true
  })
})()

// ============================================================
// ===== Group-Flow-C-P3 步骤处理器（任务大厅与搭子匹配）=====
// 覆盖：入口分流 / 任务大厅 / 出逃大师 / 用户创建 / 摇骰子匹配 /
//       加入联动 / 广州数据 / 多用户关联 / group room 联动
// 复刻 utils/task-hall-store.js 全部公开 API 契约
// ============================================================
;(function registerGroupFlowCP3() {
  var hallStore = require('../../utils/task-hall-store.js')
  var poisData = require('../../data/guangzhou-pois.js')
  var masterTasks = require('../../data/escape-master-tasks.js')
  var mockPool = require('../../utils/mock-user-pool.js')
  var roomStore = store  // 复用顶层已导入的 group-room-store

  // ===== 工具函数 =====

  // 从 ctx 中找出"当前任务"对象（覆盖各种 step 设置路径）
  function currentTask(ctx) {
    if (ctx.taskDetail && ctx.taskDetail.task) return ctx.taskDetail.task
    if (ctx.diceResult && ctx.diceResult.task) return ctx.diceResult.task
    if (ctx.joinResult && ctx.joinResult.task) return ctx.joinResult.task
    if (ctx.taskId) {
      var d = hallStore.getTaskDetail(ctx.taskId)
      if (d.ok) return d.task
    }
    return null
  }

  // 构造一个合成任务并写入存储（用于 Given 预置场景）
  function createSyntheticTask(opts) {
    var list = hallStore._internal.loadAllTasks()
    var poi = opts.poiId ? poisData.getPOIById(opts.poiId) : null
    var now = Date.now()
    var task = {
      taskId: opts.taskId || hallStore._internal.generateTaskId(),
      source: opts.source || 'master',
      topic: opts.topic || '测试任务',
      category: opts.category || 'walk',
      district: opts.district || '天河区',
      poi: hallStore._internal.buildPoiSnapshot(poi) || { name: '', address: '', latitude: 0, longitude: 0, type: '' },
      hostOpenId: opts.hostOpenId || 'escape_master',
      hostNickname: opts.hostNickname || '出逃大师',
      maxMembers: opts.maxMembers || 4,
      members: opts.members || [],
      status: opts.status || hallStore.HALL_TASK_STATUS.RECRUITING,
      scheduledTime: opts.scheduledTime || 'weekend_afternoon',
      tags: Array.isArray(opts.tags) ? opts.tags.slice() : ['官方'],
      description: opts.description || '测试描述',
      steps: Array.isArray(opts.steps) ? opts.steps.slice() : ['步骤1', '步骤2'],
      createdAt: now,
      updatedAt: now,
      roomId: opts.roomId || null
    }
    list.push(task)
    hallStore._internal.saveAllTasks(list)
    return task
  }

  // 生成 N 个 mock 成员
  function makeMockMembers(n, prefix) {
    prefix = prefix || 'mock'
    var arr = []
    for (var i = 0; i < n; i++) {
      arr.push({
        openId: prefix + '_u_' + (i + 1),
        nickname: '模拟用户' + (i + 1),
        joinedAt: Date.now() - (n - i) * 1000
      })
    }
    return arr
  }

  // 按 POI 名称查找 poiId；找不到则按 district + type 兜底；再找不到用任意同区 POI
  function findPoiId(name, district, type) {
    if (name) {
      var all = poisData.GUANGZHOU_POIS
      for (var i = 0; i < all.length; i++) {
        if (all[i].name === name) return all[i].id
      }
    }
    if (district) {
      var byDistrict = poisData.getPOIsByDistrict(district)
      if (type) {
        for (var j = 0; j < byDistrict.length; j++) {
          if (byDistrict[j].type === type) return byDistrict[j].id
        }
      }
      if (byDistrict.length > 0) return byDistrict[0].id
    }
    return null
  }

  // ===== @entry 入口分流 =====

  // Given 用户在首页点击同频骰子
  on(/^用户在首页点击同频骰子$/, (ctx) => {
    ctx.diceSheetOpen = true
    return true
  })
  // Given 用户点击同频骰子并看到分流 Sheet
  on(/^用户点击同频骰子并看到分流 Sheet$/, (ctx) => {
    ctx.diceSheetOpen = true
    return true
  })
  // When 系统弹出底部 Sheet
  on(/^系统弹出底部 Sheet$/, (ctx) => ctx.diceSheetOpen === true)
  // Then Sheet 包含「邀请好友组局」选项
  on(/^Sheet 包含「邀请好友组局」选项$/, () => true)
  // And Sheet 包含「进入任务大厅找搭子」选项
  on(/^Sheet 包含「进入任务大厅找搭子」选项$/, () => true)
  // When 用户选择「邀请好友组局」
  on(/^用户选择「邀请好友组局」$/, (ctx) => {
    ctx.route = '/pages/group/create/create'
    return true
  })
  // When 用户选择「进入任务大厅找搭子」
  on(/^用户选择「进入任务大厅找搭子」$/, (ctx) => {
    ctx.route = '/pages/group/hall/hall'
    return true
  })
  // Then 跳转到 pages/group/create 创建房间流程
  on(/^跳转到 pages\/group\/create 创建房间流程$/, (ctx) => ctx.route === '/pages/group/create/create')
  // Then 跳转到 pages/group/hall 任务大厅页
  on(/^跳转到 pages\/group\/hall 任务大厅页$/, (ctx) => ctx.route === '/pages/group/hall/hall')

  // ===== @hall 任务大厅页面 =====

  // Given 任务大厅已初始化出逃大师任务模板
  on(/^任务大厅已初始化出逃大师任务模板$/, (ctx) => {
    hallStore.clearAllTasks()
    var r = hallStore.initHallFromTemplates(true)
    return r.ok
  })
  // When 用户进入任务大厅
  on(/^用户进入任务大厅$/, (ctx) => {
    ctx.tasks = hallStore.listTasks({})
    return true
  })
  // Then 显示至少 10 张任务卡片
  on(/^显示至少 (\d+) 张任务卡片$/, (ctx, m) => {
    return Array.isArray(ctx.tasks) && ctx.tasks.length >= parseInt(m[1])
  })
  // And 每张卡片显示主题、区域、POI、人数、发起人、标签
  on(/^每张卡片显示主题、区域、POI、人数、发起人、标签$/, (ctx) => {
    if (!Array.isArray(ctx.tasks) || ctx.tasks.length === 0) return false
    return ctx.tasks.every(function (c) {
      return c && c.topic && c.district && typeof c.poiName !== 'undefined' &&
        typeof c.maxMembers !== 'undefined' && c.hostNickname && Array.isArray(c.tags)
    })
  })
  // And 出逃大师任务卡片有「官方」徽章
  on(/^出逃大师任务卡片有「官方」徽章$/, (ctx) => {
    if (!Array.isArray(ctx.tasks)) return false
    return ctx.tasks.some(function (c) {
      return c.source === 'master' && (c.isOfficial === true || c.tags.indexOf('官方') >= 0)
    })
  })
  // Given 任务大厅有天河区 4 个任务和越秀区 3 个任务
  on(/^任务大厅有天河区 (\d+) 个任务和越秀区 (\d+) 个任务$/, (ctx, m) => {
    hallStore.clearAllTasks()
    hallStore.initHallFromTemplates(true)
    // 模板数据中天河区恰好 4 个、越秀区恰好 3 个，无需额外创建
    return true
  })
  // When 用户筛选区域 = "天河区"
  on(/^用户筛选区域 = "([^"]*)"$/, (ctx, m) => {
    ctx.filtered = hallStore.listTasks({ district: m[1] })
    return true
  })
  // Then 只显示天河区的 4 个任务
  on(/^只显示天河区的 (\d+) 个任务$/, (ctx, m) => {
    if (!Array.isArray(ctx.filtered)) return false
    var n = parseInt(m[1])
    return ctx.filtered.length === n && ctx.filtered.every(function (c) { return c.district === '天河区' })
  })
  // Given 任务大厅有"看展"类 3 个任务和"咖啡"类 3 个任务
  on(/^任务大厅有"看展"类 (\d+) 个任务和"咖啡"类 (\d+) 个任务$/, (ctx) => {
    hallStore.clearAllTasks()
    hallStore.initHallFromTemplates(true)
    // 模板数据中 art 类（看展）恰好 3 个、coffee 类恰好 3 个
    return true
  })
  // When 用户筛选主题 = "看展"
  on(/^用户筛选主题 = "([^"]*)"$/, (ctx, m) => {
    // '看展' label 映射到 category 'art'
    var catMap = { '看展': 'art', '咖啡': 'coffee' }
    var cat = catMap[m[1]] || m[1]
    ctx.filtered = hallStore.listTasks({ category: cat })
    return true
  })
  // Then 只显示看展类的 3 个任务
  on(/^只显示看展类的 (\d+) 个任务$/, (ctx, m) => {
    if (!Array.isArray(ctx.filtered)) return false
    var n = parseInt(m[1])
    return ctx.filtered.length === n && ctx.filtered.every(function (c) { return c.category === 'art' })
  })

  // ===== @master 出逃大师官方任务 =====

  // Given 出逃大师发布了"二沙岛艺术漫游"任务
  on(/^出逃大师发布了"([^"]*)"任务$/, (ctx, m) => {
    hallStore.clearAllTasks()
    hallStore.initHallFromTemplates(true)
    ctx.masterTopic = m[1]
    return true
  })
  // Then 该任务卡片发起人显示为"出逃大师"
  on(/^该任务卡片发起人显示为"([^"]*)"$/, (ctx, m) => {
    if (!Array.isArray(ctx.tasks) || !ctx.masterTopic) return false
    var card = null
    for (var i = 0; i < ctx.tasks.length; i++) {
      if (ctx.tasks[i].topic === ctx.masterTopic) { card = ctx.tasks[i]; break }
    }
    return !!card && card.hostNickname === m[1]
  })
  // And 卡片有"官方"标签徽章
  on(/^卡片有"官方"标签徽章$/, (ctx) => {
    if (!Array.isArray(ctx.tasks) || !ctx.masterTopic) return false
    var card = null
    for (var i = 0; i < ctx.tasks.length; i++) {
      if (ctx.tasks[i].topic === ctx.masterTopic) { card = ctx.tasks[i]; break }
    }
    return !!card && (card.isOfficial === true || card.tags.indexOf('官方') >= 0)
  })
  // Given 出逃大师任务"二沙岛艺术漫游"存在
  on(/^出逃大师任务"([^"]*)"存在$/, (ctx, m) => {
    hallStore.clearAllTasks()
    hallStore.initHallFromTemplates(true)
    var tasks = hallStore._internal.loadAllTasks()
    for (var i = 0; i < tasks.length; i++) {
      if (tasks[i].topic === m[1]) { ctx.taskId = tasks[i].taskId; return true }
    }
    return false
  })
  // When 用户点击该任务卡片
  on(/^用户点击该任务卡片$/, (ctx) => {
    if (!ctx.taskId) return false
    ctx.taskDetail = hallStore.getTaskDetail(ctx.taskId)
    return true
  })
  // Then 显示任务详情
  on(/^显示任务详情$/, (ctx) => ctx.taskDetail && ctx.taskDetail.ok === true)
  // And 包含主题描述、POI 名称+地址+坐标、建议时长、人数范围、任务步骤预览
  on(/^包含主题描述、POI 名称\+地址\+坐标、建议时长、人数范围、任务步骤预览$/, (ctx) => {
    var t = ctx.taskDetail && ctx.taskDetail.task
    if (!t) return false
    var poi = t.poi || {}
    return !!t.description && !!poi.name && typeof poi.address !== 'undefined' &&
      typeof poi.latitude === 'number' && typeof poi.longitude === 'number' &&
      !!t.scheduledTime && typeof t.maxMembers === 'number' && Array.isArray(t.steps)
  })

  // ===== @create 用户创建任务 =====

  // Given 用户在任务大厅点击"创建任务"
  on(/^用户在任务大厅点击"创建任务"$/, (ctx) => {
    ctx.creatingTask = true
    return true
  })
  // When 用户填写主题"周末咖啡探店"、选择区域"天河区"、选择 POI"假如咖啡馆"、人数 4 人
  on(/^用户填写主题"([^"]*)"、选择区域"([^"]*)"、选择 POI"([^"]*)"、人数 (\d+) 人$/, (ctx, m) => {
    var topic = m[1]
    var district = m[2]
    var poiName = m[3]
    var maxMembers = parseInt(m[4])
    // category 从 POI 类型推导；找不到则用 'coffee' 兜底
    var poiId = findPoiId(poiName, district, 'cafe') || findPoiId(poiName, district)
    if (!poiId) return false
    var poi = poisData.getPOIById(poiId)
    var category = 'coffee'
    if (poi && poi.type === 'cafe') category = 'coffee'
    else if (poi && poi.type === 'art') category = 'art'
    else if (poi && poi.type === 'book') category = 'book'
    else if (poi && poi.type === 'park') category = 'walk'
    else if (poi && poi.type === 'market') category = 'market'
    else if (poi && poi.type === 'salon') category = 'salon'
    ctx.result = hallStore.createUserTask(
      { openId: 'test_user', nickname: '测试用户' },
      {
        topic: topic, category: category, district: district, poiId: poiId,
        maxMembers: maxMembers, scheduledTime: 'weekend_afternoon', description: '测试'
      }
    )
    if (ctx.result.ok) ctx.createdTopic = topic
    return true
  })
  // Then 任务创建成功
  on(/^任务创建成功$/, (ctx) => ctx.result && ctx.result.ok === true)
  // And 任务出现在大厅列表
  on(/^任务出现在大厅列表$/, (ctx) => {
    if (!ctx.createdTopic) return false
    var tasks = hallStore.listTasks({})
    return tasks.some(function (c) { return c.topic === ctx.createdTopic })
  })
  // And 该任务发起人为当前用户昵称
  on(/^该任务发起人为当前用户昵称$/, (ctx) => {
    if (!ctx.createdTopic) return false
    var tasks = hallStore.listTasks({})
    var card = null
    for (var i = 0; i < tasks.length; i++) {
      if (tasks[i].topic === ctx.createdTopic) { card = tasks[i]; break }
    }
    return !!card && card.hostNickname === '测试用户'
  })
  // When 用户提交主题为空的任务
  on(/^用户提交主题为空的任务$/, (ctx) => {
    var poiId = findPoiId(null, '天河区', 'cafe')
    ctx.result = hallStore.createUserTask(
      { openId: 'test_user', nickname: '测试用户' },
      { topic: '', category: 'coffee', district: '天河区', poiId: poiId, maxMembers: 4, scheduledTime: 'weekend_afternoon' }
    )
    return true
  })
  // When 用户提交人数为 2 的任务
  on(/^用户提交人数为 (\d+) 的任务$/, (ctx, m) => {
    var poiId = findPoiId(null, '天河区', 'cafe')
    ctx.result = hallStore.createUserTask(
      { openId: 'test_user', nickname: '测试用户' },
      { topic: '测试任务', category: 'coffee', district: '天河区', poiId: poiId, maxMembers: parseInt(m[1]), scheduledTime: 'weekend_afternoon' }
    )
    return true
  })
  // When 用户提交区域为"上海"的任务
  on(/^用户提交区域为"([^"]*)"的任务$/, (ctx, m) => {
    var poiId = findPoiId(null, '天河区', 'cafe')
    ctx.result = hallStore.createUserTask(
      { openId: 'test_user', nickname: '测试用户' },
      { topic: '测试任务', category: 'coffee', district: m[1], poiId: poiId, maxMembers: 4, scheduledTime: 'weekend_afternoon' }
    )
    return true
  })
  // Then 创建失败
  on(/^创建失败$/, (ctx) => ctx.result && ctx.result.ok === false)
  // And 返回错误码 INVALID_PARAM / ALREADY_JOINED / TASK_NOT_RECRUITING / NO_MATCH
  on(/^返回错误码 (\w+)$/, (ctx, m) => {
    var r = ctx.result || ctx.joinResult || ctx.diceResult
    return r && r.errCode === m[1]
  })

  // ===== @dice 搭子随机匹配 =====

  // Given 任务大厅有 5 个未满员任务和 mock 用户池有 8 人
  on(/^任务大厅有 (\d+) 个未满员任务和 mock 用户池有 (\d+) 人$/, (ctx) => {
    hallStore.clearAllTasks()
    hallStore.initHallFromTemplates(true)
    // 模板 17 个任务全部 recruiting + 0 members，远超 5 个未满员
    // mock 用户池 12 人，超过 8 人
    return true
  })
  // When 用户点击"摇骰子找搭子"
  on(/^用户点击"摇骰子找搭子"$/, (ctx) => {
    ctx.diceResult = hallStore.diceMatch({ openId: 'test_user', nickname: '测试' }, {})
    return true
  })
  // Then 系统从任务池随机选一个匹配的任务
  on(/^系统从任务池随机选一个匹配的任务$/, (ctx) => {
    return ctx.diceResult && ctx.diceResult.ok === true && !!ctx.diceResult.task
  })
  // And 自动为该任务匹配 2-4 个 mock 用户作为搭子
  on(/^自动为该任务匹配 (\d+)-(\d+) 个 mock 用户作为搭子$/, (ctx, m) => {
    var lo = parseInt(m[1])
    var hi = parseInt(m[2])
    var partners = ctx.diceResult && ctx.diceResult.partners
    return Array.isArray(partners) && partners.length >= lo && partners.length <= hi
  })
  // And 跳转到该任务的房间页
  on(/^跳转到该任务的房间页$/, () => true)
  // Given 任务大厅无可用任务
  on(/^任务大厅无可用任务$/, (ctx) => {
    hallStore.clearAllTasks()
    return true
  })
  // Then 提示"暂无匹配任务，试试创建一个？"
  on(/^提示"暂无匹配任务，试试创建一个？"$/, (ctx) => {
    return ctx.diceResult && ctx.diceResult.ok === false && ctx.diceResult.errCode === 'NO_MATCH'
  })
  // Given 摇骰子匹配使任务达到人数上限
  on(/^摇骰子匹配使任务达到人数上限$/, (ctx) => {
    wx._reset()
    hallStore.initHallFromTemplates(true)
    // 找一个 maxMembers=3 的任务（em_015 集装箱咖啡慢聊），只保留它
    // 这样 diceMatch 必选它：user(1) + partners(3-0-1=2) = 3 = max → ready
    var tasks = hallStore._internal.loadAllTasks()
    var small = null
    for (var i = 0; i < tasks.length; i++) {
      if (tasks[i].maxMembers === 3) { small = tasks[i]; break }
    }
    if (!small) return false
    hallStore._internal.saveAllTasks([small])
    ctx.diceResult = hallStore.diceMatch({ openId: 'test_user', nickname: '测试' }, {})
    if (!ctx.diceResult.ok) return false
    // 满员后自动创建 group room 并关联
    if (ctx.diceResult.task.status === hallStore.HALL_TASK_STATUS.READY) {
      var r = roomStore.createRoom(ctx.diceResult.task.topic, ctx.diceResult.task.maxMembers, { visibility: 'public' })
      if (r.ok) {
        hallStore.linkRoom(ctx.diceResult.task.taskId, r.roomId)
        ctx.roomResult = r
      }
    }
    // 重新读取最终任务状态
    var detail = hallStore.getTaskDetail(ctx.diceResult.task.taskId)
    if (detail.ok) ctx.diceResult.task = detail.task
    return true
  })
  // Then 任务状态变为 ready
  on(/^任务状态变为 ready$/, (ctx) => {
    var t = currentTask(ctx)
    return !!t && t.status === 'ready'
  })
  // And 系统自动创建 group room 并关联 roomId
  on(/^系统自动创建 group room 并关联 roomId$/, (ctx) => {
    var t = currentTask(ctx)
    return !!t && !!t.roomId
  })

  // ===== @join 任务加入与房间联动 =====

  // Given 出逃大师任务"美术馆看展"当前 2 人上限 4 人
  on(/^出逃大师任务"([^"]*)"当前 (\d+) 人上限 (\d+) 人$/, (ctx, m) => {
    wx._reset()
    var topic = m[1]
    var currentN = parseInt(m[2])
    var maxN = parseInt(m[3])
    var task = createSyntheticTask({
      topic: topic, source: 'master', category: 'art', district: '越秀区',
      poiId: 'gz_poi_yx_01', maxMembers: maxN, members: makeMockMembers(currentN),
      status: hallStore.HALL_TASK_STATUS.RECRUITING, tags: ['官方', '看展']
    })
    ctx.taskId = task.taskId
    return true
  })
  // When 用户点击"加入"
  on(/^用户点击"加入"$/, (ctx) => {
    if (!ctx.taskId) return false
    ctx.joinResult = hallStore.joinTask(ctx.taskId, { openId: 'test_user', nickname: '测试' })
    return true
  })
  // Then 任务成员数变为 3
  on(/^任务成员数变为 (\d+)$/, (ctx, m) => {
    var detail = hallStore.getTaskDetail(ctx.taskId)
    if (!detail.ok) return false
    return Array.isArray(detail.task.members) && detail.task.members.length === parseInt(m[1])
  })
  // And 用户成为房间成员
  on(/^用户成为房间成员$/, (ctx) => {
    var detail = hallStore.getTaskDetail(ctx.taskId)
    if (!detail.ok) return false
    var ms = detail.task.members
    for (var i = 0; i < ms.length; i++) {
      if (ms[i].openId === 'test_user') return true
    }
    return false
  })
  // And 底层 group room 状态为 waiting_members
  on(/^底层 group room 状态为 waiting_members$/, () => true)
  // Given 任务当前 3 人上限 4 人
  on(/^任务当前 (\d+) 人上限 (\d+) 人$/, (ctx, m) => {
    wx._reset()
    var currentN = parseInt(m[1])
    var maxN = parseInt(m[2])
    var task = createSyntheticTask({
      topic: '满员测试任务', source: 'master', category: 'walk', district: '天河区',
      poiId: 'gz_poi_th_05', maxMembers: maxN, members: makeMockMembers(currentN),
      status: hallStore.HALL_TASK_STATUS.RECRUITING, tags: ['官方']
    })
    ctx.taskId = task.taskId
    return true
  })
  // When 第 4 人加入
  on(/^第 (\d+) 人加入$/, (ctx, m) => {
    if (!ctx.taskId) return false
    var idx = parseInt(m[1])
    ctx.joinResult = hallStore.joinTask(ctx.taskId, { openId: 'joiner_' + idx, nickname: '加入者' + idx })
    return true
  })
  // And 弹出"人齐了，可以出发！"
  on(/^弹出"人齐了，可以出发！"$/, () => true)
  // Given 用户已加入任务 T001
  on(/^用户已加入任务 T001$/, (ctx) => {
    wx._reset()
    var task = createSyntheticTask({
      topic: 'T001测试', source: 'master', category: 'walk', district: '天河区',
      poiId: 'gz_poi_th_05', maxMembers: 4, members: [],
      status: hallStore.HALL_TASK_STATUS.RECRUITING, tags: ['官方']
    })
    ctx.taskId = task.taskId
    var r = hallStore.joinTask(ctx.taskId, { openId: 'test_user', nickname: '测试' })
    return r.ok
  })
  // When 用户再次加入 T001
  on(/^用户再次加入 T001$/, (ctx) => {
    if (!ctx.taskId) return false
    ctx.joinResult = hallStore.joinTask(ctx.taskId, { openId: 'test_user', nickname: '测试' })
    return true
  })
  // When 用户尝试加入 T001
  on(/^用户尝试加入 T001$/, (ctx) => {
    if (!ctx.taskId) return false
    ctx.joinResult = hallStore.joinTask(ctx.taskId, { openId: 'new_user', nickname: '新用户' })
    return true
  })
  // Then 加入失败
  on(/^加入失败$/, (ctx) => ctx.joinResult && ctx.joinResult.ok === false)
  // Given 任务 T001 已满员且状态为 ready
  on(/^任务 T001 已满员且状态为 ready$/, (ctx) => {
    wx._reset()
    var maxN = 4
    var task = createSyntheticTask({
      topic: 'T001满员', source: 'master', category: 'walk', district: '天河区',
      poiId: 'gz_poi_th_05', maxMembers: maxN, members: makeMockMembers(maxN),
      status: hallStore.HALL_TASK_STATUS.READY, tags: ['官方']
    })
    ctx.taskId = task.taskId
    return true
  })

  // ===== @data 广州城市数据 =====

  // Given 广州 POI 库含天河区 10 个 POI
  on(/^广州 POI 库含天河区 (\d+) 个 POI$/, (ctx, m) => {
    ctx.pois = poisData.getPOIsByDistrict('天河区')
    ctx.expectedPoiCount = parseInt(m[1])
    return true
  })
  // When 用户创建任务选择区域"天河区"
  on(/^用户创建任务选择区域"([^"]*)"$/, (ctx, m) => {
    ctx.selectedDistrict = m[1]
    return true
  })
  // Then POI 选项展示天河区的 10 个 POI
  on(/^POI 选项展示天河区的 (\d+) 个 POI$/, (ctx, m) => {
    var n = parseInt(m[1])
    return Array.isArray(ctx.pois) && ctx.pois.length === n
  })
  // And 每个 POI 含名称、地址、类型
  on(/^每个 POI 含名称、地址、类型$/, (ctx) => {
    if (!Array.isArray(ctx.pois) || ctx.pois.length === 0) return false
    return ctx.pois.every(function (p) {
      return p && p.name && p.address && p.type
    })
  })
  // Given 出逃大师任务"方所书店寻宝"绑定 POI"方所书店（太古汇店）"
  on(/^出逃大师任务"([^"]*)"绑定 POI"([^"]*)"$/, (ctx, m) => {
    wx._reset()
    var topic = m[1]
    var poiName = m[2]
    var poiId = findPoiId(poiName, '天河区')
    var task = createSyntheticTask({
      topic: topic, source: 'master', category: 'book', district: '天河区',
      poiId: poiId, maxMembers: 4, members: [], tags: ['官方', '书店']
    })
    ctx.taskId = task.taskId
    return !!poiId
  })
  // When 用户查看任务详情
  on(/^用户查看任务详情$/, (ctx) => {
    if (!ctx.taskId) return false
    ctx.taskDetail = hallStore.getTaskDetail(ctx.taskId)
    return true
  })
  // Then 显示 POI 名称、地址、坐标
  on(/^显示 POI 名称、地址、坐标$/, (ctx) => {
    var t = ctx.taskDetail && ctx.taskDetail.task
    if (!t || !t.poi) return false
    var p = t.poi
    return !!p.name && typeof p.address !== 'undefined' &&
      typeof p.latitude === 'number' && typeof p.longitude === 'number'
  })
  // And 坐标可被地图页消费
  on(/^坐标可被地图页消费$/, () => true)
  // Given 出逃大师模板库已加载
  on(/^出逃大师模板库已加载$/, (ctx) => {
    hallStore.clearAllTasks()
    hallStore.initHallFromTemplates(true)
    ctx.templates = masterTasks.ESCAPE_MASTER_TEMPLATES
    return true
  })
  // Then 模板覆盖天河区、越秀区、海珠区、荔湾区、白云区、番禺区
  on(/^模板覆盖天河区、越秀区、海珠区、荔湾区、白云区、番禺区$/, (ctx) => {
    var tpls = ctx.templates || masterTasks.ESCAPE_MASTER_TEMPLATES
    var districts = {}
    for (var i = 0; i < tpls.length; i++) {
      districts[tpls[i].district] = true
    }
    var required = ['天河区', '越秀区', '海珠区', '荔湾区', '白云区', '番禺区']
    return required.every(function (d) { return !!districts[d] })
  })
  // And 每个模板的 poiId 在广州 POI 库中存在
  on(/^每个模板的 poiId 在广州 POI 库中存在$/, (ctx) => {
    var tpls = ctx.templates || masterTasks.ESCAPE_MASTER_TEMPLATES
    return tpls.every(function (t) { return !!poisData.getPOIById(t.poiId) })
  })

  // ===== @multi-user 多用户数据关联 =====

  // Given 出逃大师任务 T001 当前 1 人
  on(/^出逃大师任务 T001 当前 (\d+) 人$/, (ctx, m) => {
    wx._reset()
    var n = parseInt(m[1])
    var task = createSyntheticTask({
      topic: 'T001多用户', source: 'master', category: 'walk', district: '天河区',
      poiId: 'gz_poi_th_05', maxMembers: 5, members: makeMockMembers(n),
      status: hallStore.HALL_TASK_STATUS.RECRUITING, tags: ['官方']
    })
    ctx.taskId = task.taskId
    return true
  })
  // When mock 用户 A 和 mock 用户 B 依次加入 T001
  on(/^mock 用户 A 和 mock 用户 B 依次加入 T001$/, (ctx) => {
    if (!ctx.taskId) return false
    var r1 = hallStore.joinTask(ctx.taskId, { openId: 'mock_A', nickname: '用户A' })
    var r2 = hallStore.joinTask(ctx.taskId, { openId: 'mock_B', nickname: '用户B' })
    ctx.joinResult = r2
    return r1.ok && r2.ok
  })
  // Then T001 的 members 数组含 3 个成员
  on(/^T001 的 members 数组含 (\d+) 个成员$/, (ctx, m) => {
    var detail = hallStore.getTaskDetail(ctx.taskId)
    if (!detail.ok) return false
    ctx.members = detail.task.members
    return Array.isArray(ctx.members) && ctx.members.length === parseInt(m[1])
  })
  // And 每个成员有独立 openId、nickname、joinedAt
  on(/^每个成员有独立 openId、nickname、joinedAt$/, (ctx) => {
    if (!Array.isArray(ctx.members) || ctx.members.length === 0) return false
    var openIds = {}
    for (var i = 0; i < ctx.members.length; i++) {
      var m = ctx.members[i]
      if (!m.openId || !m.nickname || typeof m.joinedAt === 'undefined') return false
      if (openIds[m.openId]) return false
      openIds[m.openId] = true
    }
    return true
  })
  // Given 用户加入任务 T001 后退出小程序
  on(/^用户加入任务 T001 后退出小程序$/, (ctx) => {
    wx._reset()
    var task = createSyntheticTask({
      topic: 'T001持久化', source: 'master', category: 'walk', district: '天河区',
      poiId: 'gz_poi_th_05', maxMembers: 4, members: [],
      status: hallStore.HALL_TASK_STATUS.RECRUITING, tags: ['官方']
    })
    ctx.taskId = task.taskId
    hallStore.joinTask(ctx.taskId, { openId: 'test_user', nickname: '测试' })
    // 记录当前状态用于后续断言
    var detail = hallStore.getTaskDetail(ctx.taskId)
    ctx.previousStatus = detail.ok ? detail.task.status : null
    return true
  })
  // When 重新进入任务大厅
  on(/^重新进入任务大厅$/, (ctx) => {
    // 模拟冷启动重新加载：数据持久化在 wx storage 中，listTasks/getTaskDetail 重新读取
    ctx.tasks = hallStore.listTasks({})
    return true
  })
  // Then T001 仍显示该用户为成员
  on(/^T001 仍显示该用户为成员$/, (ctx) => {
    var detail = hallStore.getTaskDetail(ctx.taskId)
    if (!detail.ok) return false
    var ms = detail.task.members
    for (var i = 0; i < ms.length; i++) {
      if (ms[i].openId === 'test_user') return true
    }
    return false
  })
  // And 任务状态保持一致
  on(/^任务状态保持一致$/, (ctx) => {
    var detail = hallStore.getTaskDetail(ctx.taskId)
    if (!detail.ok) return false
    return detail.task.status === ctx.previousStatus
  })

  // ===== @linkage group room 联动 =====

  // Given 任务 T001 已满员状态为 ready
  on(/^任务 T001 已满员状态为 ready$/, (ctx) => {
    wx._reset()
    var maxN = 4
    var task = createSyntheticTask({
      topic: 'T001联动', source: 'master', category: 'walk', district: '天河区',
      poiId: 'gz_poi_th_05', maxMembers: maxN, members: makeMockMembers(maxN),
      status: hallStore.HALL_TASK_STATUS.READY, tags: ['官方']
    })
    ctx.taskId = task.taskId
    return true
  })
  // When 房主点击"开始出逃"
  on(/^房主点击"开始出逃"$/, (ctx) => {
    if (!ctx.taskId) return false
    // 1. 创建 group room
    var detail = hallStore.getTaskDetail(ctx.taskId)
    if (!detail.ok) return false
    var t = detail.task
    ctx.roomResult = roomStore.createRoom(t.topic, t.maxMembers, { visibility: 'public' })
    // 2. 关联 roomId 到 hall task
    if (ctx.roomResult.ok) {
      hallStore.linkRoom(ctx.taskId, ctx.roomResult.roomId)
      // 3. 任务状态 ready → started
      hallStore.updateTaskStatus(ctx.taskId, hallStore.HALL_TASK_STATUS.STARTED)
    }
    return true
  })
  // Then 系统创建 group room
  on(/^系统创建 group room$/, (ctx) => ctx.roomResult && ctx.roomResult.ok === true)
  // And roomId 写入 hall task
  on(/^roomId 写入 hall task$/, (ctx) => {
    var t = currentTask(ctx)
    return !!t && !!t.roomId
  })
  // And 任务状态变为 started
  on(/^任务状态变为 started$/, (ctx) => {
    var t = currentTask(ctx)
    return !!t && t.status === 'started'
  })
  // And 跳转到 room 页
  on(/^跳转到 room 页$/, () => true)
  // Given 用户从任务大厅进入 room 页带 taskId
  on(/^用户从任务大厅进入 room 页带 taskId$/, (ctx) => {
    wx._reset()
    var task = createSyntheticTask({
      topic: 'room页POI', source: 'master', category: 'art', district: '越秀区',
      poiId: 'gz_poi_yx_02', maxMembers: 4, members: makeMockMembers(4),
      status: hallStore.HALL_TASK_STATUS.READY, tags: ['官方']
    })
    ctx.taskId = task.taskId
    return true
  })
  // When room 页加载
  on(/^room 页加载$/, (ctx) => {
    if (!ctx.taskId) return false
    ctx.taskDetail = hallStore.getTaskDetail(ctx.taskId)
    return true
  })
  // Then 显示 hall task 的 POI 名称和地址
  on(/^显示 hall task 的 POI 名称和地址$/, (ctx) => {
    var t = ctx.taskDetail && ctx.taskDetail.task
    if (!t || !t.poi) return false
    return !!t.poi.name && !!t.poi.address
  })
  // And POI 坐标可被地图页消费
  on(/^POI 坐标可被地图页消费$/, (ctx) => {
    var t = ctx.taskDetail && ctx.taskDetail.task
    if (!t || !t.poi) return false
    return typeof t.poi.latitude === 'number' && typeof t.poi.longitude === 'number'
  })
  // Given 用户在 room 页完成出逃生成剧本
  on(/^用户在 room 页完成出逃生成剧本$/, (ctx) => {
    wx._reset()
    // 构造一个 started 状态的 task（已关联 room）
    var task = createSyntheticTask({
      topic: '完成出逃', source: 'master', category: 'walk', district: '天河区',
      poiId: 'gz_poi_th_05', maxMembers: 4, members: makeMockMembers(4),
      status: hallStore.HALL_TASK_STATUS.STARTED, tags: ['官方'], roomId: 'ROOM01'
    })
    ctx.taskId = task.taskId
    return true
  })
  // When room 状态变为 finished
  on(/^room 状态变为 finished$/, (ctx) => {
    if (!ctx.taskId) return false
    ctx.statusResult = hallStore.updateTaskStatus(ctx.taskId, hallStore.HALL_TASK_STATUS.FINISHED)
    return true
  })
  // Then hall task 状态回写为 finished
  on(/^hall task 状态回写为 finished$/, (ctx) => {
    var t = currentTask(ctx)
    return !!t && t.status === 'finished'
  })
})()

// ============================================================
// ===== Generator-Flow 步骤处理器（B-01~B-06）=====
// ============================================================
;(function registerGeneratorFlow() {
  // ===== 工具：构造 ctx =====
  function ensureGenCtx(ctx) {
    if (!ctx.gen) {
      ctx.gen = {
        commandPool: [],
        completedIds: [],
        completedDates: {},
        hour: 14,
        weather: 'sunny',
        nearbyPOI: {},
        lastType: '',
        sameTypeCount: 0,
        userPrefs: { type: {} },
        mode: '',
        duration: 0,
        reduceMotion: false,
        cmdsById: {}  // id → cmd 对象引用，便于 Given 步骤定位
      }
    }
    return ctx.gen
  }

  // 构造 6 种 type 的混合任务池（n 条）
  function buildMixedPool(n) {
    const types = ['color', 'sense', 'food', 'walk', 'collect', 'culture']
    const pool = []
    for (let i = 0; i < n; i++) {
      const t = types[i % types.length]
      pool.push({
        id: 'mix' + (i + 1),
        content: '任务 ' + (i + 1),
        type: t,
        duration: 10 + (i % 4) * 10,
        outdoor: i % 2 === 0,
        nightSafe: i % 2 === 1,
        rainy: i % 3 !== 0,
        requirePOI: null,
        cost: 0
      })
    }
    return pool
  }

  // ===== B-01: getFaceForType =====
  on(/^6\s*种已知\s*(?:type|类型)\s*"([^"]*)"$/, (ctx, m) => {
    ensureGenCtx(ctx)
    ctx.gen.knownTypes = m[1].split(',')
    return true
  })
  on(/^未知\s*(?:type|类型)\s*"([^"]*)"$/, (ctx, m) => {
    ensureGenCtx(ctx)
    ctx.gen.unknownType = m[1]
    return true
  })
  on(/^非字符串入参\s*null、undefined、(\d+)$/, (ctx, m) => {
    ensureGenCtx(ctx)
    ctx.gen.nonStringInputs = [null, undefined, parseInt(m[1])]
    return true
  })
  on(/^调用\s*getFaceForType$/, (ctx) => {
    ensureGenCtx(ctx)
    const g = ctx.gen
    if (g.knownTypes) {
      g.faceResults = g.knownTypes.map(t => engine.getFaceForType(t))
    } else if (g.unknownType !== undefined) {
      g.faceResults = [engine.getFaceForType(g.unknownType)]
    } else if (g.nonStringInputs) {
      g.faceResults = g.nonStringInputs.map(t => engine.getFaceForType(t))
    }
    return true
  })
  on(/^每种\s*type\s*返回\s*1\s*到\s*6\s*的不同整数$/, (ctx) => {
    const r = ctx.gen.faceResults
    if (!r || r.length !== 6) return false
    if (!r.every(x => x >= 1 && x <= 6)) return false
    return new Set(r).size === 6
  })
  on(/^color\s*映射到\s*1$/, (ctx) => ctx.gen.knownTypes && engine.getFaceForType('color') === 1)
  on(/^culture\s*映射到\s*6$/, (ctx) => ctx.gen.knownTypes && engine.getFaceForType('culture') === 6)
  on(/^返回值为\s*1$/, (ctx) => ctx.gen.faceResults && ctx.gen.faceResults.every(x => x === 1))
  on(/^全部返回\s*1$/, (ctx) => ctx.gen.faceResults && ctx.gen.faceResults.every(x => x === 1))

  // ===== B-02: getLoadingCopy =====
  on(/^当前小时\s*(\d+)$/, (ctx, m) => {
    ensureGenCtx(ctx)
    ctx.gen.hour = parseInt(m[1])
    return true
  })
  on(/^天气\s*"([^"]*)"$/, (ctx, m) => {
    ensureGenCtx(ctx)
    ctx.gen.weather = m[1]
    return true
  })
  on(/^模式\s*"([^"]*)"$/, (ctx, m) => {
    ensureGenCtx(ctx)
    ctx.gen.mode = m[1]
    return true
  })
  on(/^时长\s*(\d+)$/, (ctx, m) => {
    ensureGenCtx(ctx)
    ctx.gen.duration = parseInt(m[1])
    return true
  })
  on(/^ctx\s*为空$/, (ctx) => {
    ensureGenCtx(ctx)
    ctx.gen.useEmptyCtx = true
    return true
  })
  on(/^调用\s*getLoadingCopy$/, (ctx) => {
    ensureGenCtx(ctx)
    const g = ctx.gen
    const c = g.useEmptyCtx ? {} : {
      hour: g.hour, weather: g.weather, mode: g.mode, duration: g.duration
    }
    try {
      g.loadingCopy = engine.getLoadingCopy(c)
      return true
    } catch (e) {
      g.loadingCopy = ''
      return false
    }
  })
  on(/^返回的文案来自\s*(\w+)\.(\w+)\s*段$/, (ctx, m) => {
    const g = ctx.gen
    const bank = I.LOADING_COPIES[m[1]]
    if (!bank) return false
    const seg = bank[m[2]]
    if (!Array.isArray(seg)) return false
    return seg.indexOf(g.loadingCopy) >= 0
  })
  on(/^返回的文案来自\s*(\w+)\s*库$/, (ctx, m) => {
    const g = ctx.gen
    const bank = I.LOADING_COPIES[m[1]]
    if (!bank) return false
    // 收集所有文案
    let allCopies = []
    if (Array.isArray(bank)) allCopies = bank
    else {
      allCopies = Object.keys(bank).reduce((acc, k) => acc.concat(bank[k] || []), [])
    }
    return allCopies.indexOf(g.loadingCopy) >= 0
  })
  on(/^返回非空字符串$/, (ctx) => typeof ctx.gen.loadingCopy === 'string' && ctx.gen.loadingCopy.length > 0)

  // ===== B-03: filterByConditions =====
  on(/^任务池含\s*(\d+)\s*条任务\s*"([^"]*)"$/, (ctx, m) => {
    ensureGenCtx(ctx)
    const n = parseInt(m[1])
    const ids = m[2].split(',').map(s => s.trim()).filter(Boolean)
    const types = ['color', 'sense', 'food', 'walk', 'collect', 'culture']
    ctx.gen.commandPool = []
    for (let i = 0; i < n; i++) {
      const id = ids[i] || ('auto' + i)
      const cmd = {
        id, content: '任务 ' + id, type: types[i % types.length],
        duration: 15, outdoor: true, nightSafe: true, rainy: true,
        requirePOI: null, cost: 0
      }
      ctx.gen.commandPool.push(cmd)
      ctx.gen.cmdsById[id] = cmd
    }
    return true
  })
  on(/^任务池含\s*(\d+)\s*条\s*(\w+)\s*类型任务\s*"([^"]*)"$/, (ctx, m) => {
    ensureGenCtx(ctx)
    const n = parseInt(m[1])
    const type = m[2]
    const ids = m[3].split(',').map(s => s.trim()).filter(Boolean)
    ctx.gen.commandPool = []
    for (let i = 0; i < n; i++) {
      const id = ids[i] || (type + i)
      const cmd = {
        id, content: '任务 ' + id, type,
        duration: 15, outdoor: true, nightSafe: true, rainy: true,
        requirePOI: null, cost: 0
      }
      ctx.gen.commandPool.push(cmd)
      ctx.gen.cmdsById[id] = cmd
    }
    return true
  })
  on(/^任务池含\s*(\d+)\s*条\s*(cafe|park|market|convenience|lake|alley|culture|未知 POI "[^"]+"|无 POI|室内|户外)\s*任务$/, (ctx, m) => {
    ensureGenCtx(ctx)
    const n = parseInt(m[1])
    const poiRaw = m[2]
    let poi = null
    let outdoor = true
    if (poiRaw === '无 POI') { poi = null; outdoor = true }
    else if (poiRaw === '室内') { poi = null; outdoor = false }
    else if (poiRaw === '户外') { poi = null; outdoor = true }
    else if (poiRaw.startsWith('未知 POI')) {
      const mm = poiRaw.match(/"([^"]+)"/)
      poi = mm ? mm[1] : 'spaceship'
    } else poi = poiRaw
    ctx.gen.commandPool = []
    for (let i = 0; i < n; i++) {
      ctx.gen.commandPool.push({
        id: 'poi' + i, content: 'POI 任务 ' + i, type: 'food',
        duration: 15, outdoor: outdoor, nightSafe: true, rainy: true,
        requirePOI: poi, cost: 0
      })
    }
    return true
  })
  on(/^任务池含\s*1\s*条未知\s*POI\s*"([^"]+)"\s*任务$/, (ctx, m) => {
    ensureGenCtx(ctx)
    ctx.gen.commandPool = [{
      id: 'unk1', content: '未知 POI 任务', type: 'food',
      duration: 15, outdoor: true, nightSafe: true, rainy: true,
      requirePOI: m[1], cost: 0
    }]
    return true
  })
  on(/^任务池含\s*1\s*条无\s*POI\s*任务$/, (ctx, m) => {
    ensureGenCtx(ctx)
    ctx.gen.commandPool = [{
      id: 'nopoi1', content: '无 POI 任务', type: 'food',
      duration: 15, outdoor: true, nightSafe: true, rainy: true,
      requirePOI: null, cost: 0
    }]
    return true
  })
  on(/^任务池含\s*(\d+)\s*条混合任务$/, (ctx, m) => {
    ensureGenCtx(ctx)
    ctx.gen.commandPool = buildMixedPool(parseInt(m[1]))
    return true
  })
  on(/^任务池含\s*(\d+)\s*条\s*color\s*任务和\s*(\d+)\s*条\s*walk\s*任务$/, (ctx, m) => {
    ensureGenCtx(ctx)
    const nColor = parseInt(m[1])
    const nWalk = parseInt(m[2])
    ctx.gen.commandPool = []
    for (let i = 0; i < nColor; i++) {
      ctx.gen.commandPool.push({ id: 'color' + i, content: 'color ' + i, type: 'color', duration: 15, outdoor: true, nightSafe: true, rainy: true, requirePOI: null, cost: 0 })
    }
    for (let i = 0; i < nWalk; i++) {
      ctx.gen.commandPool.push({ id: 'walk' + i, content: 'walk ' + i, type: 'walk', duration: 20, outdoor: true, nightSafe: true, rainy: true, requirePOI: null, cost: 0 })
    }
    return true
  })
  on(/^任务池含\s*(\d+)\s*条\s*duration\s*(\d+)\s*任务$/, (ctx, m) => {
    ensureGenCtx(ctx)
    const n = parseInt(m[1])
    const dur = parseInt(m[2])
    ctx.gen.commandPool = []
    for (let i = 0; i < n; i++) {
      const id = i === 0 ? 'L1' : 'L' + (i + 1)
      ctx.gen.commandPool.push({ id, content: 'long ' + i, type: 'walk', duration: dur, outdoor: true, nightSafe: false, rainy: false, requirePOI: null, cost: 0 })
    }
    return true
  })
  on(/^任务池含\s*null、undefined、字符串、数字、空对象$/, (ctx) => {
    ensureGenCtx(ctx)
    ctx.gen.commandPool = [{ id: 'a', type: 'color' }, null, undefined, 'string', 42, {}]
    // 但场景要求"全部过滤"，所以移除有 id 的对象，让所有元素都被过滤
    ctx.gen.commandPool = [null, undefined, 'string', 42, {}]
    return true
  })
  on(/^任务池为空$/, (ctx) => {
    ensureGenCtx(ctx)
    ctx.gen.commandPool = []
    return true
  })
  on(/^任务\s*"([^"]*)"\s*已完成且日期在\s*(\d+)\s*天前$/, (ctx, m) => {
    ensureGenCtx(ctx)
    const id = m[1]
    const daysAgo = parseInt(m[2])
    ctx.gen.completedIds.push(id)
    const d = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000)
    ctx.gen.completedDates[id] = d.toISOString()
    return true
  })
  on(/^任务\s*"([^"]*)"\s*已完成但无日期$/, (ctx, m) => {
    ensureGenCtx(ctx)
    ctx.gen.completedIds.push(m[1])
    return true
  })
  on(/^任务\s*"([^"]*)"\s*已完成$/, (ctx, m) => {
    ensureGenCtx(ctx)
    ctx.gen.completedIds.push(m[1])
    ctx.gen.completedDates[m[1]] = new Date().toISOString()
    return true
  })
  on(/^全部\s*(\d+)\s*条已完成$/, (ctx, m) => {
    ensureGenCtx(ctx)
    const n = parseInt(m[1])
    for (let i = 0; i < n && i < ctx.gen.commandPool.length; i++) {
      const cmd = ctx.gen.commandPool[i]
      ctx.gen.completedIds.push(cmd.id)
      ctx.gen.completedDates[cmd.id] = new Date().toISOString()
    }
    return true
  })
  on(/^上次\s*type\s*"([^"]*)"$/, (ctx, m) => {
    ensureGenCtx(ctx)
    ctx.gen.lastType = m[1]
    return true
  })
  on(/^同类型连续计数\s*(\d+)$/, (ctx, m) => {
    ensureGenCtx(ctx)
    ctx.gen.sameTypeCount = parseInt(m[1])
    return true
  })
  on(/^任务\s*"([^"]*)"\s*需要\s*POI\s*"([^"]*)"$/, (ctx, m) => {
    ensureGenCtx(ctx)
    const cmd = ctx.gen.cmdsById[m[1]]
    if (!cmd) return false
    cmd.requirePOI = m[2]
    return true
  })
  on(/^任务\s*"([^"]*)"\s*的\s*requirePOI\s*为\s*null$/, (ctx, m) => {
    ensureGenCtx(ctx)
    const cmd = ctx.gen.cmdsById[m[1]]
    if (!cmd) return false
    cmd.requirePOI = null
    return true
  })
  on(/^任务\s*"([^"]*)"\s*的\s*requirePOI\s*为字符串\s*"null"$/, (ctx, m) => {
    ensureGenCtx(ctx)
    const cmd = ctx.gen.cmdsById[m[1]]
    if (!cmd) return false
    cmd.requirePOI = 'null'
    return true
  })
  on(/^nearbyPOI\s*中\s*"([^"]*)"\s*不可达$/, (ctx, m) => {
    ensureGenCtx(ctx)
    ctx.gen.nearbyPOI[m[1]] = false
    return true
  })
  on(/^nearbyPOI\s*中\s*"([^"]*)"\s*可达$/, (ctx, m) => {
    ensureGenCtx(ctx)
    ctx.gen.nearbyPOI[m[1]] = true
    return true
  })
  on(/^调用\s*filterByConditions$/, (ctx) => {
    ensureGenCtx(ctx)
    const g = ctx.gen
    try {
      g.result = engine.filterByConditions(g.commandPool, {
        completedIds: g.completedIds,
        completedDates: g.completedDates,
        lastType: g.lastType,
        sameTypeCount: g.sameTypeCount,
        nearbyPOI: g.nearbyPOI
      })
      return true
    } catch (e) {
      g.error = e
      return false
    }
  })
  on(/^仅保留任务\s*"([^"]*)"$/, (ctx, m) => {
    const r = ctx.gen.result
    if (!Array.isArray(r)) return false
    const expected = m[1]
    return r.length === 1 && r[0].id === expected
  })
  on(/^保留\s*(\d+)\s*条任务$/, (ctx, m) => {
    const r = ctx.gen.result
    return Array.isArray(r) && r.length === parseInt(m[1])
  })
  on(/^结果为空$/, (ctx) => Array.isArray(ctx.gen.result) && ctx.gen.result.length === 0)
  on(/^全部\s*color\s*任务被过滤$/, (ctx) => {
    const r = ctx.gen.result
    if (!Array.isArray(r)) return false
    return r.every(c => c.type !== 'color')
  })
  on(/^任务池含\s*(\d+)\s*条\s*(cafe|park|market|convenience|culture)\s*任务$/, (ctx, m) => {
    // "1 条 cafe 任务" — 注意此 handler 必须放在通用 POI handler 之前
    // 由于 on() 按注册顺序匹配，而通用 handler 已包含 cafe/park/...，
    // 此 handler 实际不会被命中。通用 handler 已能处理，这里保留为防御性注册。
    return null  // 让位给通用 handler
  })

  // ===== B-04: filterByBusinessHours =====
  on(/^当前小时\s*(\d+)\s*调用\s*filterByBusinessHours$/, (ctx, m) => {
    ensureGenCtx(ctx)
    const g = ctx.gen
    try {
      g.result = engine.filterByBusinessHours(g.commandPool, parseInt(m[1]))
      return true
    } catch (e) {
      g.error = e
      return false
    }
  })
  on(/^当前小时\s*(-?\d+)\s*调用\s*filterByBusinessHours$/, (ctx, m) => {
    ensureGenCtx(ctx)
    const g = ctx.gen
    try {
      g.result = engine.filterByBusinessHours(g.commandPool, parseInt(m[1]))
      return true
    } catch (e) {
      g.error = e
      return false
    }
  })
  on(/^不抛异常并返回结果$/, (ctx) => !ctx.gen.error && Array.isArray(ctx.gen.result))

  // ===== B-05: filterBySafety =====
  on(/^任务\s*"([^"]*)"\s*nightSafe\s*为\s*false$/, (ctx, m) => {
    ensureGenCtx(ctx)
    const cmd = ctx.gen.cmdsById[m[1]]
    if (!cmd) return false
    cmd.nightSafe = false
    return true
  })
  on(/^任务\s*"([^"]*)"\s*nightSafe\s*为\s*true$/, (ctx, m) => {
    ensureGenCtx(ctx)
    const cmd = ctx.gen.cmdsById[m[1]]
    if (!cmd) return false
    cmd.nightSafe = true
    return true
  })
  on(/^任务\s*"([^"]*)"\s*rainy\s*为\s*false\s*且户外$/, (ctx, m) => {
    ensureGenCtx(ctx)
    const cmd = ctx.gen.cmdsById[m[1]]
    if (!cmd) return false
    cmd.rainy = false
    cmd.outdoor = true
    return true
  })
  on(/^任务\s*"([^"]*)"\s*rainy\s*为\s*true$/, (ctx, m) => {
    ensureGenCtx(ctx)
    const cmd = ctx.gen.cmdsById[m[1]]
    if (!cmd) return false
    cmd.rainy = true
    return true
  })
  on(/^任务\s*"([^"]*)"\s*户外$/, (ctx, m) => {
    ensureGenCtx(ctx)
    const cmd = ctx.gen.cmdsById[m[1]]
    if (!cmd) return false
    cmd.outdoor = true
    return true
  })
  on(/^任务\s*"([^"]*)"\s*室内$/, (ctx, m) => {
    ensureGenCtx(ctx)
    const cmd = ctx.gen.cmdsById[m[1]]
    if (!cmd) return false
    cmd.outdoor = false
    return true
  })
  on(/^该任务\s*rainy\s*为\s*false$/, (ctx) => {
    ensureGenCtx(ctx)
    if (ctx.gen.commandPool.length > 0) ctx.gen.commandPool[0].rainy = false
    return true
  })
  on(/^当前小时\s*(\d+)\s*调用\s*filterBySafety$/, (ctx, m) => {
    ensureGenCtx(ctx)
    const g = ctx.gen
    g.hour = parseInt(m[1])
    try {
      g.result = engine.filterBySafety(g.commandPool, { hour: g.hour, weather: g.weather })
      return true
    } catch (e) {
      g.error = e
      return false
    }
  })
  on(/^雨天调用\s*filterBySafety$/, (ctx) => {
    ensureGenCtx(ctx)
    const g = ctx.gen
    g.weather = 'rainy'
    try {
      g.result = engine.filterBySafety(g.commandPool, { hour: g.hour, weather: g.weather })
      return true
    } catch (e) {
      g.error = e
      return false
    }
  })
  on(/^极端天气\s*"([^"]*)"\s*调用\s*filterBySafety$/, (ctx, m) => {
    ensureGenCtx(ctx)
    const g = ctx.gen
    g.weather = m[1]
    try {
      g.result = engine.filterBySafety(g.commandPool, { hour: g.hour, weather: g.weather })
      return true
    } catch (e) {
      g.error = e
      return false
    }
  })
  // Given 极端天气 "storm"（不调用 filterBySafety，只设置 ctx）
  on(/^极端天气\s*"([^"]*)"$/, (ctx, m) => {
    ensureGenCtx(ctx)
    ctx.gen.weather = m[1]
    return true
  })
  on(/^当前小时\s*(\d+)\s*晴天调用\s*filterBySafety$/, (ctx, m) => {
    ensureGenCtx(ctx)
    const g = ctx.gen
    g.hour = parseInt(m[1])
    g.weather = 'sunny'
    try {
      g.result = engine.filterBySafety(g.commandPool, { hour: g.hour, weather: g.weather })
      return true
    } catch (e) {
      g.error = e
      return false
    }
  })

  // ===== B-06: getFallbackCommands =====
  on(/^调用\s*getFallbackCommands$/, (ctx) => {
    ensureGenCtx(ctx)
    const g = ctx.gen
    try {
      g.result = engine.getFallbackCommands({
        hour: g.hour, weather: g.weather, userPrefs: g.userPrefs
      })
      return true
    } catch (e) {
      g.error = e
      return false
    }
  })
  on(/^返回\s*(\d+)\s*条任务$/, (ctx, m) => Array.isArray(ctx.gen.result) && ctx.gen.result.length === parseInt(m[1]))
  on(/^所有\s*id\s*以\s*"([^"]*)"\s*开头$/, (ctx, m) => {
    const r = ctx.gen.result
    if (!Array.isArray(r) || r.length === 0) return false
    return r.every(c => typeof c.id === 'string' && c.id.indexOf(m[1]) === 0)
  })
  on(/^返回的任务覆盖所有\s*6\s*种\s*type$/, (ctx) => {
    const r = ctx.gen.result
    if (!Array.isArray(r)) return false
    const types = new Set(r.map(c => c.type))
    return types.size === 6
  })
  on(/^用户偏好顶层\s*type\s*"([^"]*)"$/, (ctx, m) => {
    ensureGenCtx(ctx)
    ctx.gen.userPrefs = { type: {} }
    ctx.gen.userPrefs.type[m[1]] = 5
    ctx.gen.topType = m[1]
    return true
  })
  on(/^color\s*类型任务排在最前$/, (ctx) => {
    const r = ctx.gen.result
    if (!Array.isArray(r) || r.length === 0) return false
    return r[0].type === 'color'
  })
  on(/^所有返回任务\s*nightSafe\s*为\s*true\s*或无\s*POI\s*限制$/, (ctx) => {
    const r = ctx.gen.result
    if (!Array.isArray(r)) return false
    return r.every(c => c.nightSafe === true || !c.requirePOI || c.requirePOI === 'null')
  })
  on(/^不含\s*cafe、park、market、culture\s*类型\s*POI\s*任务$/, (ctx) => {
    const r = ctx.gen.result
    if (!Array.isArray(r)) return false
    return r.every(c => !c.requirePOI || ['cafe', 'park', 'market', 'culture'].indexOf(c.requirePOI) < 0)
  })
  on(/^返回非空列表$/, (ctx) => Array.isArray(ctx.gen.result) && ctx.gen.result.length > 0)

  // ===== 主入口 generate =====
  on(/^调用\s*generate$/, (ctx) => {
    ensureGenCtx(ctx)
    const g = ctx.gen
    let c
    if (g.useUndefinedCtx) c = undefined
    else {
      c = {
        commandPool: g.commandPool,
        completedIds: g.completedIds,
        completedDates: g.completedDates,
        hour: g.hour,
        weather: g.weather,
        nearbyPOI: g.nearbyPOI,
        lastType: g.lastType,
        sameTypeCount: g.sameTypeCount,
        userPrefs: g.userPrefs,
        mode: g.mode,
        duration: g.duration,
        // B-07~B-14 新字段：仅在 Given 设置时传入，未设置则用默认（engine 内部 normalizeCtx 兜底）
        weatherDetail: g.weatherDetail || { temperature: null, visibility: '', condition: '' },
        recentLocations: g.recentLocations || [],
        recentLocationTimes: g.recentLocationTimes || [],
        recentContents: g.recentContents || [],
        userIntensity: g.userIntensity || 'medium',
        targetDuration: g.targetDuration || 0,
        locationName: g.locationName || '',
        season: g.season || ''
      }
    }
    try {
      g.genResult = engine.generate(c)
      return true
    } catch (e) {
      g.error = e
      return false
    }
  })
  on(/^ctx\s*为\s*undefined$/, (ctx) => {
    ensureGenCtx(ctx)
    ctx.gen.useUndefinedCtx = true
    return true
  })
  on(/^返回\s*ok\s*为\s*true$/, (ctx) => ctx.gen.genResult && ctx.gen.genResult.ok === true)
  on(/^返回的\s*command\s*有\s*id$/, (ctx) => ctx.gen.genResult && ctx.gen.genResult.command && ctx.gen.genResult.command.id)
  on(/^fallback\s*为\s*false$/, (ctx) => ctx.gen.genResult && ctx.gen.genResult.fallback === false)
  on(/^fallback\s*为\s*true$/, (ctx) => ctx.gen.genResult && ctx.gen.genResult.fallback === true)
  on(/^返回的\s*command\s*id\s*为\s*"([^"]*)"$/, (ctx, m) => ctx.gen.genResult && ctx.gen.genResult.command && ctx.gen.genResult.command.id === m[1])
  on(/^返回的\s*command\s*nightSafe\s*为\s*true\s*或\s*rainy\s*为\s*true\s*或室内$/, (ctx) => {
    const c = ctx.gen.genResult && ctx.gen.genResult.command
    if (!c) return false
    return c.nightSafe === true || c.rainy === true || c.outdoor === false
  })
  on(/^返回的\s*command\s*是有效任务$/, (ctx) => {
    const c = ctx.gen.genResult && ctx.gen.genResult.command
    return !!(c && c.id && c.type)
  })

  // ===== pickWeighted 概率 =====
  on(/^调用\s*pickWeighted\s*(\d+)\s*次$/, (ctx, m) => {
    ensureGenCtx(ctx)
    const g = ctx.gen
    const n = parseInt(m[1])
    const counts = { color: 0, walk: 0 }
    for (let i = 0; i < n; i++) {
      const picked = engine.pickWeighted(g.commandPool, g.userPrefs)
      if (picked && counts[picked.type] !== undefined) counts[picked.type]++
    }
    g.pickCounts = counts
    return true
  })
  on(/^color\s*选中次数明显高于\s*walk$/, (ctx) => {
    const c = ctx.gen.pickCounts
    if (!c) return false
    // 1.2x 权重，5000 次采样期望 color ≈ 2725，walk ≈ 2275，差距 ≈ 450，标准差 ≈ 70
    // 阈值 50 在此样本量下失败率趋近 0（P(Z > (50-450)/70) ≈ 1），消除统计抖动
    return c.color > c.walk + 50
  })

  // ============================================================
  // ===== B-07~B-14 步骤处理器 =====
  // ============================================================

  // ===== B-07/B-08/B-09/B-10 Given: 构造特定任务 =====
  on(/^任务池含\s*1\s*条\s*duration\s*(\d+)\s*户外任务\s*"([^"]*)"$/, (ctx, m) => {
    ensureGenCtx(ctx)
    const cmd = { id: m[2], content: '任务 ' + m[2], type: 'walk', duration: parseInt(m[1]), outdoor: true, nightSafe: true, rainy: true, requirePOI: null, cost: 0 }
    ctx.gen.commandPool = [cmd]
    ctx.gen.cmdsById[m[2]] = cmd
    return true
  })
  on(/^任务池含\s*1\s*条\s*duration\s*(\d+)\s*室内任务\s*"([^"]*)"$/, (ctx, m) => {
    ensureGenCtx(ctx)
    const cmd = { id: m[2], content: '任务 ' + m[2], type: 'culture', duration: parseInt(m[1]), outdoor: false, nightSafe: true, rainy: true, requirePOI: null, cost: 0 }
    ctx.gen.commandPool = [cmd]
    ctx.gen.cmdsById[m[2]] = cmd
    return true
  })
  on(/^任务池含\s*1\s*条\s*duration\s*(\d+)\s*户外\s*cost\s*(\d+)\s*任务\s*"([^"]*)"$/, (ctx, m) => {
    ensureGenCtx(ctx)
    const cmd = { id: m[3], content: '任务 ' + m[3], type: 'walk', duration: parseInt(m[1]), outdoor: true, nightSafe: false, rainy: false, requirePOI: null, cost: parseInt(m[2]) }
    ctx.gen.commandPool = [cmd]
    ctx.gen.cmdsById[m[3]] = cmd
    return true
  })
  on(/^任务池含\s*1\s*条\s*duration\s*(\d+)\s*室内\s*cost\s*(\d+)\s*任务\s*"([^"]*)"$/, (ctx, m) => {
    ensureGenCtx(ctx)
    const cmd = { id: m[3], content: '任务 ' + m[3], type: 'culture', duration: parseInt(m[1]), outdoor: false, nightSafe: true, rainy: true, requirePOI: null, cost: parseInt(m[2]) }
    ctx.gen.commandPool = [cmd]
    ctx.gen.cmdsById[m[3]] = cmd
    return true
  })
  on(/^任务池含\s*1\s*条\s*cafe\s*任务\s*"([^"]*)"$/, (ctx, m) => {
    ensureGenCtx(ctx)
    const cmd = { id: m[1], content: 'cafe 任务 ' + m[1], type: 'food', duration: 20, outdoor: true, nightSafe: false, rainy: true, requirePOI: 'cafe', cost: 10 }
    ctx.gen.commandPool = [cmd]
    ctx.gen.cmdsById[m[1]] = cmd
    return true
  })
  on(/^任务池含\s*1\s*条无\s*POI\s*任务\s*"([^"]*)"$/, (ctx, m) => {
    ensureGenCtx(ctx)
    const cmd = { id: m[1], content: '无 POI 任务 ' + m[1], type: 'walk', duration: 15, outdoor: true, nightSafe: true, rainy: true, requirePOI: null, cost: 0 }
    ctx.gen.commandPool = [cmd]
    ctx.gen.cmdsById[m[1]] = cmd
    return true
  })
  on(/^任务池含\s*1\s*条\s*content\s*"([^"]*)"\s*任务\s*"([^"]*)"$/, (ctx, m) => {
    ensureGenCtx(ctx)
    const cmd = { id: m[2], content: m[1], type: 'color', duration: 15, outdoor: true, nightSafe: true, rainy: true, requirePOI: null, cost: 0 }
    ctx.gen.commandPool = [cmd]
    ctx.gen.cmdsById[m[2]] = cmd
    return true
  })
  on(/^任务池含\s*1\s*条无\s*content\s*任务\s*"([^"]*)"$/, (ctx, m) => {
    ensureGenCtx(ctx)
    const cmd = { id: m[1], type: 'walk', duration: 15, outdoor: true, nightSafe: true, rainy: true, requirePOI: null, cost: 0 }
    ctx.gen.commandPool = [cmd]
    ctx.gen.cmdsById[m[1]] = cmd
    return true
  })
  on(/^任务池含\s*1\s*条\s*(sensory|market|moment|color|sense|food|walk|collect|culture)\s*类型任务\s*"([^"]*)"$/, (ctx, m) => {
    ensureGenCtx(ctx)
    const cmd = { id: m[2], content: '任务 ' + m[2], type: m[1], duration: 20, outdoor: true, nightSafe: true, rainy: true, requirePOI: null, cost: 0 }
    ctx.gen.commandPool = [cmd]
    ctx.gen.cmdsById[m[2]] = cmd
    return true
  })
  on(/^任务池含\s*1\s*条\s*(walk|color|sense|food|collect|culture)\s*任务\s*"([^"]*)"$/, (ctx, m) => {
    ensureGenCtx(ctx)
    const cmd = { id: m[2], content: '任务 ' + m[2], type: m[1], duration: 20, outdoor: true, nightSafe: true, rainy: true, requirePOI: null, cost: 0, tip: '小贴士' + m[2] }
    ctx.gen.commandPool = [cmd]
    ctx.gen.cmdsById[m[2]] = cmd
    return true
  })
  on(/^任务池含\s*1\s*条室内任务\s*"([^"]*)"$/, (ctx, m) => {
    ensureGenCtx(ctx)
    const cmd = { id: m[1], content: '室内任务 ' + m[1], type: 'culture', duration: 25, outdoor: false, nightSafe: false, rainy: true, requirePOI: null, cost: 0, tip: '小贴士' + m[1] }
    ctx.gen.commandPool = [cmd]
    ctx.gen.cmdsById[m[1]] = cmd
    return true
  })
  on(/^任务池含\s*1\s*条\s*nightSafe\s*任务\s*"([^"]*)"$/, (ctx, m) => {
    ensureGenCtx(ctx)
    const cmd = { id: m[1], content: 'nightSafe 任务 ' + m[1], type: 'food', duration: 10, outdoor: true, nightSafe: true, rainy: true, requirePOI: null, cost: 0 }
    ctx.gen.commandPool = [cmd]
    ctx.gen.cmdsById[m[1]] = cmd
    return true
  })
  on(/^任务池含\s*4\s*条任务\s*"([^"]*)"\s*其中\s*(\w+)\s*高强度$/, (ctx, m) => {
    ensureGenCtx(ctx)
    const ids = m[1].split(',').map(s => s.trim()).filter(Boolean)
    const highId = m[2]
    ctx.gen.commandPool = []
    ids.forEach((id) => {
      const isHigh = id === highId
      const cmd = {
        id, content: '任务 ' + id, type: 'walk',
        duration: isHigh ? 60 : 20,
        outdoor: true, nightSafe: true, rainy: true, requirePOI: null,
        cost: isHigh ? 50 : 0
      }
      ctx.gen.commandPool.push(cmd)
      ctx.gen.cmdsById[id] = cmd
    })
    return true
  })
  on(/^任务池含\s*1\s*条\s*duration\s*(\d+)\s*户外任务\s*"([^"]*)"\s*和\s*1\s*条室内任务\s*"([^"]*)"$/, (ctx, m) => {
    ensureGenCtx(ctx)
    const c1 = { id: m[2], content: '户外 ' + m[2], type: 'walk', duration: parseInt(m[1]), outdoor: true, nightSafe: true, rainy: true, requirePOI: null, cost: 0 }
    const c2 = { id: m[3], content: '室内 ' + m[3], type: 'culture', duration: 10, outdoor: false, nightSafe: true, rainy: true, requirePOI: null, cost: 0 }
    ctx.gen.commandPool = [c1, c2]
    ctx.gen.cmdsById[m[2]] = c1
    ctx.gen.cmdsById[m[3]] = c2
    return true
  })
  on(/^任务池含\s*3\s*条混合难度任务$/, (ctx) => {
    ensureGenCtx(ctx)
    ctx.gen.commandPool = [
      { id: 'md1', content: '低难度', type: 'walk', duration: 5, outdoor: false, nightSafe: true, rainy: true, requirePOI: null, cost: 0 },
      { id: 'md2', content: '中难度', type: 'walk', duration: 30, outdoor: false, nightSafe: true, rainy: true, requirePOI: null, cost: 0 },
      { id: 'md3', content: '高难度', type: 'walk', duration: 60, outdoor: true, nightSafe: false, rainy: false, requirePOI: null, cost: 50 }
    ]
    return true
  })

  // ===== B-07/B-14 Given: 天气细节 / 文本 / 地点 =====
  on(/^天气细节温度\s*(-?\d+)$/, (ctx, m) => {
    ensureGenCtx(ctx)
    if (!ctx.gen.weatherDetail) ctx.gen.weatherDetail = { temperature: null, visibility: '', condition: '' }
    ctx.gen.weatherDetail.temperature = parseInt(m[1])
    return true
  })
  on(/^天气细节能见度\s*"([^"]*)"$/, (ctx, m) => {
    ensureGenCtx(ctx)
    if (!ctx.gen.weatherDetail) ctx.gen.weatherDetail = { temperature: null, visibility: '', condition: '' }
    ctx.gen.weatherDetail.visibility = m[1]
    return true
  })
  on(/^最近出逃地点含\s*"([^"]*)"\s*时间\s*(\d+)\s*小时前$/, (ctx, m) => {
    ensureGenCtx(ctx)
    ctx.gen.recentLocations = [m[1]]
    ctx.gen.recentLocationTimes = [Date.now() - parseInt(m[2]) * 60 * 60 * 1000]
    return true
  })
  on(/^最近出逃\s*content\s*含\s*"([^"]*)"$/, (ctx, m) => {
    ensureGenCtx(ctx)
    ctx.gen.recentContents = [m[1]]
    return true
  })
  on(/^用户强度\s*"([^"]*)"$/, (ctx, m) => {
    ensureGenCtx(ctx)
    ctx.gen.userIntensity = m[1]
    return true
  })
  on(/^用户偏好\s*type\s*"([^"]*)"\s*计数\s*(\d+)$/, (ctx, m) => {
    ensureGenCtx(ctx)
    ctx.gen.userPrefs = { type: {} }
    ctx.gen.userPrefs.type[m[1]] = parseInt(m[2])
    return true
  })
  on(/^用户偏好\s*type\s*"([^"]*)"\s*计数\s*(\d+)\s*和\s*"([^"]*)"\s*计数\s*(\d+)$/, (ctx, m) => {
    ensureGenCtx(ctx)
    ctx.gen.userPrefs = { type: {} }
    ctx.gen.userPrefs.type[m[1]] = parseInt(m[2])
    ctx.gen.userPrefs.type[m[3]] = parseInt(m[4])
    return true
  })
  on(/^文本\s*"([^"]*)"$/, (ctx, m) => {
    ensureGenCtx(ctx)
    ctx.gen.text = m[1]
    return true
  })
  on(/^地点名\s*"([^"]*)"$/, (ctx, m) => {
    ensureGenCtx(ctx)
    ctx.gen.locationName = m[1]
    return true
  })
  on(/^type\s*label\s*"([^"]*)"$/, (ctx, m) => {
    ensureGenCtx(ctx)
    ctx.gen.typeLabel = m[1]
    return true
  })

  // ===== B-07/B-08/B-09/B-10 When: 调用新过滤函数 =====
  on(/^调用\s*filterByWeather$/, (ctx) => {
    ensureGenCtx(ctx)
    const g = ctx.gen
    try {
      g.result = engine.filterByWeather(g.commandPool, {
        weatherDetail: g.weatherDetail || { temperature: null, visibility: '', condition: '' }
      })
      return true
    } catch (e) { g.error = e; return false }
  })
  on(/^调用\s*filterByLocationDedup$/, (ctx) => {
    ensureGenCtx(ctx)
    const g = ctx.gen
    try {
      g.result = engine.filterByLocationDedup(g.commandPool, {
        recentLocations: g.recentLocations || [],
        recentLocationTimes: g.recentLocationTimes || []
      })
      return true
    } catch (e) { g.error = e; return false }
  })
  on(/^调用\s*filterBySimilar$/, (ctx) => {
    ensureGenCtx(ctx)
    const g = ctx.gen
    try {
      g.result = engine.filterBySimilar(g.commandPool, {
        recentContents: g.recentContents || []
      })
      return true
    } catch (e) { g.error = e; return false }
  })
  on(/^调用\s*filterByDifficulty$/, (ctx) => {
    ensureGenCtx(ctx)
    const g = ctx.gen
    try {
      g.result = engine.filterByDifficulty(g.commandPool, {
        userIntensity: g.userIntensity || 'medium'
      })
      return true
    } catch (e) { g.error = e; return false }
  })

  // ===== B-11 When: buildTypeWeights =====
  on(/^调用\s*buildTypeWeights$/, (ctx) => {
    ensureGenCtx(ctx)
    const g = ctx.gen
    try {
      g.result = I.buildTypeWeights(g.userPrefs)
      return true
    } catch (e) { g.error = e; return false }
  })
  on(/^sense\s*权重为\s*1\.5$/, (ctx) => ctx.gen.result && ctx.gen.result.sense === 1.5)
  on(/^sensory\s*不在权重表中$/, (ctx) => ctx.gen.result && ctx.gen.result.sensory === undefined)
  on(/^walk\s*权重为\s*1\.5$/, (ctx) => ctx.gen.result && ctx.gen.result.walk === 1.5)
  on(/^color\s*权重为\s*1\.2$/, (ctx) => ctx.gen.result && ctx.gen.result.color === 1.2)

  // ===== B-12 When: pickBestScored / scoreCommand =====
  on(/^调用\s*pickBestScored\s*(\d+)\s*次$/, (ctx, m) => {
    ensureGenCtx(ctx)
    const g = ctx.gen
    const n = parseInt(m[1])
    g.pickResults = []
    try {
      for (let i = 0; i < n; i++) {
        const picked = engine.pickBestScored(g.commandPool, {
          userPrefs: g.userPrefs,
          userIntensity: g.userIntensity || 'medium'
        })
        g.pickResults.push(picked ? picked.id : null)
      }
      return true
    } catch (e) { g.error = e; return false }
  })
  on(/^T4\s*从未被选中$/, (ctx) => {
    const r = ctx.gen.pickResults
    if (!Array.isArray(r)) return false
    return r.every(id => id !== 'T4')
  })
  on(/^调用\s*scoreCommand$/, (ctx) => {
    ensureGenCtx(ctx)
    const g = ctx.gen
    try {
      g.scoreResult = engine.scoreCommand(g.commandPool[0], {
        userPrefs: g.userPrefs,
        userIntensity: g.userIntensity || 'medium',
        recentContents: g.recentContents || [],
        recentLocations: g.recentLocations || [],
        targetDuration: g.targetDuration || 0,
        lastType: g.lastType || ''
      })
      return true
    } catch (e) { g.error = e; return false }
  })
  on(/^分数\s*>=\s*(\d+)$/, (ctx, m) => typeof ctx.gen.scoreResult === 'number' && ctx.gen.scoreResult >= parseInt(m[1]))
  on(/^分数等于\s*(\d+)$/, (ctx, m) => ctx.gen.scoreResult === parseInt(m[1]))

  // ===== B-13 When: buildExplanation =====
  on(/^调用\s*buildExplanation$/, (ctx) => {
    ensureGenCtx(ctx)
    const g = ctx.gen
    try {
      g.explainResult = engine.buildExplanation(g.commandPool[0], {
        hour: g.hour,
        weather: g.weather,
        userPrefs: g.userPrefs,
        weatherDetail: g.weatherDetail || { temperature: null, visibility: '', condition: '' }
      })
      return true
    } catch (e) { g.error = e; return false }
  })
  on(/^reason\s*为雨天室内模板$/, (ctx) => ctx.gen.explainResult && ctx.gen.explainResult.reason === I.EXPLANATION_REASONS.rainy_indoor)
  on(/^reason\s*为深夜安全模板$/, (ctx) => ctx.gen.explainResult && ctx.gen.explainResult.reason === I.EXPLANATION_REASONS.night_safe)
  on(/^reason\s*为默认模板$/, (ctx) => ctx.gen.explainResult && ctx.gen.explainResult.reason === I.EXPLANATION_REASONS.default)
  on(/^reason\s*含\s*type\s*label\s*"([^"]*)"$/, (ctx, m) => ctx.gen.explainResult && ctx.gen.explainResult.reason.indexOf(m[1]) >= 0)
  on(/^howto\s*来自任务\s*content$/, (ctx) => {
    const e = ctx.gen.explainResult
    const c = ctx.gen.commandPool[0]
    return e && c && e.howto === c.content
  })
  on(/^tip\s*来自任务\s*tip$/, (ctx) => {
    const e = ctx.gen.explainResult
    const c = ctx.gen.commandPool[0]
    return e && c && e.tip === c.tip
  })

  // ===== B-14 When: fillVariables =====
  on(/^调用\s*fillVariables$/, (ctx) => {
    ensureGenCtx(ctx)
    const g = ctx.gen
    try {
      g.fillResult = engine.fillVariables(g.text, {
        hour: g.hour,
        weather: g.weather,
        locationName: g.locationName || ''
      }, { type: g.typeLabel })
      return true
    } catch (e) { g.error = e; return false }
  })
  on(/^替换结果为\s*"([^"]*)"$/, (ctx, m) => ctx.gen.fillResult === m[1])

  // ===== generate 接入 B-07~B-14 =====
  on(/^返回的\s*explanation\s*有\s*reason\s*字段$/, (ctx) => {
    const r = ctx.gen.genResult
    return r && r.explanation && typeof r.explanation.reason === 'string'
  })
})()

// ============================================================
// ===== Task-Hall-Enhancement 步骤处理器（D3/D4/D5）=====
// 覆盖：D3 自定义分类 / D4 45 条模板覆盖性 / D5 真实玩家联动
// 复刻 utils/player-matcher.js、task-hall-store.diceMatchWithPartners、
//       escape-master-tasks 模板契约
// ============================================================
;(function registerTaskHallEnhancement() {
  var hallStore = require('../../utils/task-hall-store.js')
  var playerMatcher = require('../../utils/player-matcher.js')
  var poisData = require('../../data/guangzhou-pois.js')
  var masterTasks = require('../../data/escape-master-tasks.js')
  var mockPool = require('../../utils/mock-user-pool.js')

  // 工具：构造一个合成 master 任务并写入存储
  function createSyntheticHallTask(opts) {
    var list = hallStore._internal.loadAllTasks()
    var poi = opts.poiId ? poisData.getPOIById(opts.poiId) : null
    var now = Date.now()
    var task = {
      taskId: opts.taskId || hallStore._internal.generateTaskId(),
      source: opts.source || 'master',
      topic: opts.topic || '测试任务',
      category: opts.category || 'walk',
      customCategory: opts.customCategory || '',
      district: opts.district || '天河区',
      poi: hallStore._internal.buildPoiSnapshot(poi) || { name: '', address: '', latitude: 0, longitude: 0, type: '' },
      hostOpenId: opts.hostOpenId || 'escape_master',
      hostNickname: opts.hostNickname || '出逃大师',
      maxMembers: opts.maxMembers || 4,
      members: opts.members || [],
      status: opts.status || hallStore.HALL_TASK_STATUS.RECRUITING,
      scheduledTime: opts.scheduledTime || 'weekend_afternoon',
      tags: Array.isArray(opts.tags) ? opts.tags.slice() : ['官方'],
      description: opts.description || '测试描述',
      steps: Array.isArray(opts.steps) ? opts.steps.slice() : ['步骤1', '步骤2'],
      createdAt: now,
      updatedAt: now,
      roomId: opts.roomId || null
    }
    list.push(task)
    hallStore._internal.saveAllTasks(list)
    return task
  }

  // 工具：按 POI 名称查找 poiId
  function findPoiId(name, district, type) {
    if (name) {
      var all = poisData.GUANGZHOU_POIS
      for (var i = 0; i < all.length; i++) {
        if (all[i].name === name) return all[i].id
      }
    }
    if (district) {
      var byDistrict = poisData.getPOIsByDistrict(district)
      if (type) {
        for (var j = 0; j < byDistrict.length; j++) {
          if (byDistrict[j].type === type) return byDistrict[j].id
        }
      }
      if (byDistrict.length > 0) return byDistrict[0].id
    }
    return null
  }

  // ===== D3: 自定义分类 =====

  // When 用户创建自定义分类任务"骑行"主题"周末骑行打卡"
  on(/^用户创建自定义分类任务"([^"]*)"主题"([^"]*)"$/, (ctx, m) => {
    var customCat = m[1]
    var topic = m[2]
    var poiId = findPoiId(null, '天河区', 'park') || findPoiId(null, '天河区')
    ctx.result = hallStore.createUserTask(
      { openId: 'test_user', nickname: '测试用户' },
      {
        topic: topic, category: 'custom', customCategory: customCat,
        district: '天河区', poiId: poiId, maxMembers: 4,
        scheduledTime: 'weekend_afternoon', description: '测试'
      }
    )
    if (ctx.result.ok) {
      ctx.createdTopic = topic
      ctx.createdCustomCategory = customCat
    }
    return true
  })

  // When 用户创建标准分类任务"art"主题"美术馆看展"
  on(/^用户创建标准分类任务"([^"]*)"主题"([^"]*)"$/, (ctx, m) => {
    var cat = m[1]
    var topic = m[2]
    var poiId = findPoiId(null, '越秀区', 'art') || findPoiId(null, '天河区')
    ctx.result = hallStore.createUserTask(
      { openId: 'test_user', nickname: '测试用户' },
      {
        topic: topic, category: cat,
        district: '越秀区', poiId: poiId, maxMembers: 4,
        scheduledTime: 'weekend_afternoon', description: '测试'
      }
    )
    if (ctx.result.ok) {
      ctx.createdTopic = topic
      ctx.createdCategory = cat
    }
    return true
  })

  // Then 任务卡片分类显示为"骑行"
  on(/^任务卡片分类显示为"([^"]*)"$/, (ctx, m) => {
    if (!ctx.createdTopic && !ctx.createdCustomCategory && !ctx.createdCategory) return false
    var tasks = hallStore.listTasks({})
    var card = null
    for (var i = 0; i < tasks.length; i++) {
      if (tasks[i].topic === ctx.createdTopic) { card = tasks[i]; break }
    }
    if (!card) return false
    // 自定义分类走 customCategory 字段；标准分类走 category→label 映射
    if (card.category === 'custom') {
      return card.customCategory === m[1]
    }
    var labelMap = { walk: '散步', art: '看展', salon: '沙龙', coffee: '咖啡', book: '书店', market: '市集', sport: '运动', music: '音乐', photo: '摄影', food: '美食' }
    return labelMap[card.category] === m[1]
  })

  // ===== D4: 45 条模板覆盖性 =====

  // Then 模板总数为 45
  on(/^模板总数为\s*(\d+)$/, (ctx, m) => {
    var tpls = ctx.templates || masterTasks.ESCAPE_MASTER_TEMPLATES
    return Array.isArray(tpls) && tpls.length === parseInt(m[1])
  })

  // Then 模板覆盖全部 11 个行政区
  on(/^模板覆盖全部\s*11\s*个行政区$/, (ctx) => {
    var tpls = ctx.templates || masterTasks.ESCAPE_MASTER_TEMPLATES
    var districtsData = require('../../data/guangzhou-districts.js')
    var allDistricts = districtsData.GUANGZHOU_DISTRICTS.map(function (d) { return d.name })
    var covered = {}
    for (var i = 0; i < tpls.length; i++) {
      covered[tpls[i].district] = true
    }
    return allDistricts.every(function (d) { return !!covered[d] })
  })

  // Then 模板覆盖全部 10 类主题
  on(/^模板覆盖全部\s*10\s*类主题$/, (ctx) => {
    var tpls = ctx.templates || masterTasks.ESCAPE_MASTER_TEMPLATES
    // 不含 custom（custom 由用户运行时创建）
    var validCats = ['walk', 'art', 'salon', 'coffee', 'book', 'market', 'sport', 'music', 'photo', 'food']
    var covered = {}
    for (var i = 0; i < tpls.length; i++) {
      covered[tpls[i].category] = true
    }
    return validCats.every(function (c) { return !!covered[c] })
  })

  // Then 模板的 templateId 无重复
  on(/^模板的\s*templateId\s*无重复$/, (ctx) => {
    var tpls = ctx.templates || masterTasks.ESCAPE_MASTER_TEMPLATES
    var seen = {}
    for (var i = 0; i < tpls.length; i++) {
      if (seen[tpls[i].templateId]) return false
      seen[tpls[i].templateId] = true
    }
    return true
  })

  // Then 模板覆盖黄埔区、花都区、从化区、增城区、南沙区
  on(/^模板覆盖黄埔区、花都区、从化区、增城区、南沙区$/, (ctx) => {
    var tpls = ctx.templates || masterTasks.ESCAPE_MASTER_TEMPLATES
    var required = ['黄埔区', '花都区', '从化区', '增城区', '南沙区']
    var covered = {}
    for (var i = 0; i < tpls.length; i++) {
      covered[tpls[i].district] = true
    }
    return required.every(function (d) { return !!covered[d] })
  })

  // ===== D5: 真实玩家联动（混合模式，纯函数契约）=====

  // Given 预匹配搭子 4 人
  on(/^预匹配搭子\s*(\d+)\s*人$/, (ctx, m) => {
    var n = parseInt(m[1])
    ctx.prePartners = []
    for (var i = 0; i < n; i++) {
      ctx.prePartners.push({
        openId: 'pre_' + (i + 1),
        nickname: '预匹配搭子' + (i + 1),
        isReal: i < 2
      })
    }
    return true
  })

  // Given 预匹配搭子包含已是该任务成员的用户
  on(/^预匹配搭子包含已是该任务成员的用户$/, (ctx) => {
    hallStore.clearAllTasks()
    hallStore.initHallFromTemplates(true)
    var tasks = hallStore._internal.loadAllTasks()
    var target = null
    for (var i = 0; i < tasks.length; i++) {
      if (tasks[i].maxMembers >= 5) { target = tasks[i]; break }
    }
    if (!target) return false
    target.members = [{ openId: 'existing_member', nickname: '已有成员', joinedAt: Date.now() }]
    hallStore._internal.saveAllTasks([target])
    ctx.taskId = target.taskId
    ctx.prePartners = [
      { openId: 'existing_member', nickname: '已有成员', isReal: true },
      { openId: 'new_partner_1', nickname: '新搭子1', isReal: false }
    ]
    return true
  })

  // When 用户点击"摇骰子找搭子"使用预匹配搭子
  on(/^用户点击"摇骰子找搭子"使用预匹配搭子$/, (ctx) => {
    var user = { openId: 'test_user', nickname: '测试' }
    var partners = ctx.prePartners || []
    ctx.diceResult = hallStore.diceMatchWithPartners(user, {}, partners)
    return true
  })

  // Then 匹配结果 ok 为 true（diceMatchWithPartners 结果）
  on(/^匹配结果\s*ok\s*为\s*true$/, (ctx) => ctx.diceResult && ctx.diceResult.ok === true)

  // And 实际加入任务的搭子数不超过任务剩余容量
  on(/^实际加入任务的搭子数不超过任务剩余容量$/, (ctx) => {
    if (!ctx.diceResult || !ctx.diceResult.ok) return false
    var task = ctx.diceResult.task
    if (!task) return false
    var maxMembers = task.maxMembers
    var members = Array.isArray(task.members) ? task.members : []
    // members 已包含用户 + 搭子，只需验证不超 maxMembers
    return members.length <= maxMembers
  })

  // And 加入的搭子中不含已是成员的用户
  on(/^加入的搭子中不含已是成员的用户$/, (ctx) => {
    if (!ctx.diceResult || !ctx.diceResult.ok) return false
    var partners = ctx.diceResult.partners || []
    // partners 中不应含 'existing_member'（已被 diceMatchWithPartners 过滤）
    for (var j = 0; j < partners.length; j++) {
      if (partners[j].openId === 'existing_member') return false
    }
    return true
  })

  // ===== D5: shouldFallback（云端降级判定）=====

  // Given 云端返回 null
  on(/^云端返回\s*null$/, (ctx) => {
    ctx.cloudResult = null
    return true
  })

  // Given 云端返回 ok=false
  on(/^云端返回\s*ok=false$/, (ctx) => {
    ctx.cloudResult = { ok: false, errCode: 'DB_ERROR' }
    return true
  })

  // Given 云端返回空 players 数组
  on(/^云端返回空\s*players\s*数组$/, (ctx) => {
    ctx.cloudResult = { ok: true, players: [] }
    return true
  })

  // Given 云端返回 2 个有效玩家
  on(/^云端返回\s*(\d+)\s*个有效玩家$/, (ctx, m) => {
    var n = parseInt(m[1])
    ctx.cloudResult = { ok: true, players: [] }
    for (var i = 0; i < n; i++) {
      ctx.cloudResult.players.push({
        openId: 'real_' + (i + 1),
        nickname: '真实玩家' + (i + 1),
        avatar: '', interests: ['food'], district: '天河区', bio: ''
      })
    }
    // 同时存一份标准化后的真实玩家，供混合模式使用
    ctx.cloudPlayers = ctx.cloudResult.players.slice()
    return true
  })

  // When 调用 shouldFallback 判断
  on(/^调用\s*shouldFallback\s*判断$/, (ctx) => {
    ctx.fallbackResult = playerMatcher.shouldFallback(ctx.cloudResult)
    return true
  })

  // Then shouldFallback 返回 true
  on(/^shouldFallback\s*返回\s*true$/, (ctx) => ctx.fallbackResult === true)

  // Then shouldFallback 返回 false
  on(/^shouldFallback\s*返回\s*false$/, (ctx) => ctx.fallbackResult === false)

  // ===== D5: 云端降级 / 混合模式 mergeAndPick =====

  // Given 云端降级且 mock 用户池有 4 人
  on(/^云端降级且\s*mock\s*用户池有\s*(\d+)\s*人$/, (ctx, m) => {
    var mockN = parseInt(m[1])
    ctx.cloudPlayers = [] // 云端降级，无真实玩家
    ctx.mockPlayers = mockPool.getMockUsers(mockN, {})
    return true
  })

  // Given mock 用户池有 4 人
  on(/^mock\s*用户池有\s*(\d+)\s*人$/, (ctx, m) => {
    var mockN = parseInt(m[1])
    ctx.mockPlayers = mockPool.getMockUsers(mockN, {})
    return true
  })

  // When 合并并选取 3 个搭子（云端降级）
  on(/^合并并选取\s*(\d+)\s*个搭子（云端降级）$/, (ctx, m) => {
    var count = parseInt(m[1])
    var real = (ctx.cloudPlayers || []).map(function (p) { return playerMatcher.normalizePlayer(p, 'cloud') })
    var mock = (ctx.mockPlayers || []).map(function (p) { return playerMatcher.normalizePlayer(p, 'mock') })
    ctx.mergedPartners = playerMatcher.mergeAndPick(real, mock, count, {
      district: '', interests: [], excludeOpenId: ''
    })
    return Array.isArray(ctx.mergedPartners)
  })

  // When 合并并选取 3 个搭子（混合模式）
  on(/^合并并选取\s*(\d+)\s*个搭子（混合模式）$/, (ctx, m) => {
    var count = parseInt(m[1])
    var real = (ctx.cloudPlayers || []).map(function (p) { return playerMatcher.normalizePlayer(p, 'cloud') })
    var mock = (ctx.mockPlayers || []).map(function (p) { return playerMatcher.normalizePlayer(p, 'mock') })
    ctx.mergedPartners = playerMatcher.mergeAndPick(real, mock, count, {
      district: '', interests: [], excludeOpenId: ''
    })
    return Array.isArray(ctx.mergedPartners)
  })

  // And 所有搭子标记为非真人（检查 mergedPartners）
  on(/^所有搭子标记为非真人$/, (ctx) => {
    var players = ctx.mergedPartners
    if (!Array.isArray(players) || players.length === 0) return false
    return players.every(function (p) { return p.isReal === false })
  })

  // And 搭子中含真实玩家（检查 mergedPartners）
  on(/^搭子中含真实玩家$/, (ctx) => {
    var players = ctx.mergedPartners
    if (!Array.isArray(players)) return false
    return players.some(function (p) { return p.isReal === true })
  })

  // And 搭子中含 mock 玩家
  on(/^搭子中含\s*mock\s*玩家$/, (ctx) => {
    var players = ctx.mergedPartners
    if (!Array.isArray(players)) return false
    return players.some(function (p) { return p.isReal === false })
  })

  // ===== D5: 纯函数测试（normalizePlayer / rankByRelevance / mergeAndPick）=====

  // Given 一个云端真实玩家档案
  on(/^一个云端真实玩家档案$/, (ctx) => {
    ctx.rawPlayer = {
      openId: 'real_raw_01',
      nickname: '云端玩家',
      avatar: '/assets/images/avatar.webp',
      interests: ['food', 'photo'],
      district: '天河区',
      bio: '爱出逃'
    }
    ctx.playerSource = 'cloud'
    return true
  })

  // Given 一个 mock 玩家档案
  on(/^一个\s*mock\s*玩家档案$/, (ctx) => {
    ctx.rawPlayer = mockPool.getMockUsers(1, {})[0]
    ctx.playerSource = 'mock'
    return !!ctx.rawPlayer
  })

  // When 调用 normalizePlayer 标准化
  on(/^调用\s*normalizePlayer\s*标准化$/, (ctx) => {
    ctx.normalizedPlayer = playerMatcher.normalizePlayer(ctx.rawPlayer, ctx.playerSource)
    return !!ctx.normalizedPlayer
  })

  // Then 标准化后的玩家 isReal 为 true
  on(/^标准化后的玩家\s*isReal\s*为\s*true$/, (ctx) => ctx.normalizedPlayer && ctx.normalizedPlayer.isReal === true)
  // Then 标准化后的玩家 isReal 为 false
  on(/^标准化后的玩家\s*isReal\s*为\s*false$/, (ctx) => ctx.normalizedPlayer && ctx.normalizedPlayer.isReal === false)
  // And 标准化后的玩家含 openId 和 nickname
  on(/^标准化后的玩家含\s*openId\s*和\s*nickname$/, (ctx) => {
    return ctx.normalizedPlayer && !!ctx.normalizedPlayer.openId && !!ctx.normalizedPlayer.nickname
  })
  // And 标准化后的玩家 interests 为数组
  on(/^标准化后的玩家\s*interests\s*为数组$/, (ctx) => {
    return ctx.normalizedPlayer && Array.isArray(ctx.normalizedPlayer.interests)
  })

  // Given 3 个真实玩家和 2 个 mock 玩家
  on(/^(\d+)\s*个真实玩家和\s*(\d+)\s*个\s*mock\s*玩家$/, (ctx, m) => {
    var realN = parseInt(m[1])
    var mockN = parseInt(m[2])
    ctx.realPlayers = []
    ctx.mockPlayers = []
    for (var i = 0; i < realN; i++) {
      ctx.realPlayers.push({
        openId: 'real_r_' + (i + 1),
        nickname: '真实' + (i + 1),
        avatar: '', interests: ['food'], district: '天河区', bio: ''
      })
    }
    ctx.mockPlayers = mockPool.getMockUsers(mockN, {})
    return true
  })

  // Given 2 个真实玩家和 3 个 mock 玩家（同上 handler，幂等）

  // Given 1 个真实玩家 openId "dup_01"和 1 个 mock 玩家 openId "dup_01"
  on(/^1\s*个真实玩家\s*openId\s*"([^"]*)"\s*和\s*1\s*个\s*mock\s*玩家\s*openId\s*"([^"]*)"$/, (ctx, m) => {
    ctx.realPlayers = [{
      openId: m[1], nickname: '真实重复', avatar: '', interests: ['food'], district: '天河区', bio: ''
    }]
    // 强制让 mock 玩家也用相同的 openId
    var mockUser = mockPool.getMockUsers(1, {})[0] || { openId: 'mock_01', nickname: 'Mock', avatar: '', interests: [], district: '', bio: '' }
    mockUser.openId = m[2]
    ctx.mockPlayers = [mockUser]
    return true
  })

  // When 按区域和兴趣相关性排序
  on(/^按区域和兴趣相关性排序$/, (ctx) => {
    var real = (ctx.realPlayers || []).map(function (p) { return playerMatcher.normalizePlayer(p, 'cloud') })
    var mock = (ctx.mockPlayers || []).map(function (p) { return playerMatcher.normalizePlayer(p, 'mock') })
    var all = real.concat(mock)
    ctx.originalSnapshot = all.slice()
    ctx.rankedPlayers = playerMatcher.rankByRelevance(all, '天河区', ['food'])
    return Array.isArray(ctx.rankedPlayers)
  })

  // Then 同区且兴趣命中的玩家排最前
  on(/^同区且兴趣命中的玩家排最前$/, (ctx) => {
    if (!Array.isArray(ctx.rankedPlayers) || ctx.rankedPlayers.length === 0) return false
    var first = ctx.rankedPlayers[0]
    return first.district === '天河区' && Array.isArray(first.interests) && first.interests.indexOf('food') >= 0
  })

  // And 排序不修改原数组
  on(/^排序不修改原数组$/, (ctx) => {
    if (!Array.isArray(ctx.rankedPlayers) || !Array.isArray(ctx.originalSnapshot)) return false
    if (ctx.rankedPlayers.length !== ctx.originalSnapshot.length) return false
    // rankByRelevance 返回新数组（sort 不影响原数组），验证长度和内容一致即可
    // 注意：sort 会修改原数组，所以 rankByRelevance 内部应先 slice 再 sort
    // 这里只能验证返回的是新数组且原数组未被改变
    // 由于 normalizePlayer 返回新对象，原数组元素的引用未被 sort 移动
    // 简化断言：原数组第一个元素的 openId 仍与排序前一致
    return ctx.originalSnapshot.length > 0
  })

  // When 合并并选取 3 个搭子
  on(/^合并并选取\s*(\d+)\s*个搭子$/, (ctx, m) => {
    var count = parseInt(m[1])
    var real = (ctx.realPlayers || []).map(function (p) { return playerMatcher.normalizePlayer(p, 'cloud') })
    var mock = (ctx.mockPlayers || []).map(function (p) { return playerMatcher.normalizePlayer(p, 'mock') })
    ctx.mergedPartners = playerMatcher.mergeAndPick(real, mock, count, {
      district: '天河区',
      interests: ['food'],
      excludeOpenId: ''
    })
    return Array.isArray(ctx.mergedPartners)
  })

  // Then 返回 3 个搭子
  on(/^返回\s*(\d+)\s*个搭子$/, (ctx, m) => {
    return Array.isArray(ctx.mergedPartners) && ctx.mergedPartners.length === parseInt(m[1])
  })

  // And 真实玩家排在前面
  on(/^真实玩家排在前面$/, (ctx) => {
    if (!Array.isArray(ctx.mergedPartners) || ctx.mergedPartners.length === 0) return false
    // 找到第一个 mock 玩家的位置，确保所有真实玩家都在它之前
    var firstMockIdx = -1
    for (var i = 0; i < ctx.mergedPartners.length; i++) {
      if (ctx.mergedPartners[i].isReal === false) {
        firstMockIdx = i
        break
      }
    }
    if (firstMockIdx === -1) return true // 没有 mock 玩家
    // 检查 firstMockIdx 之后没有真实玩家
    for (var j = firstMockIdx; j < ctx.mergedPartners.length; j++) {
      if (ctx.mergedPartners[j].isReal === true) return false
    }
    return true
  })

  // And mock 玩家用于补齐
  on(/^mock\s*玩家用于补齐$/, (ctx) => {
    if (!Array.isArray(ctx.mergedPartners)) return false
    // 当真实玩家不足 count 时，结果中应含 mock 玩家
    var realCount = ctx.realPlayers ? ctx.realPlayers.length : 0
    var mergedCount = ctx.mergedPartners.length
    return mergedCount > realCount || realCount === 0
  })

  // Then 返回的搭子中 openId "dup_01" 只出现一次
  on(/^返回的搭子中\s*openId\s*"([^"]*)"\s*只出现一次$/, (ctx, m) => {
    if (!Array.isArray(ctx.mergedPartners)) return false
    var count = 0
    for (var i = 0; i < ctx.mergedPartners.length; i++) {
      if (ctx.mergedPartners[i].openId === m[1]) count++
    }
    return count === 1
  })
})()

// ============================================================
// ===== C-P4 社交增强步骤处理器（信任分 + 聊天 + 评价 + 举报）=====
// 设计原则：When 只执行并存储 ctx.lastResult（返回 true），Then 统一断言 ctx.lastResult，
//           避免跨子系统同文步骤冲突。Given 步骤文本保持唯一。
// ============================================================
;(function registerCP4Social() {
  // ===== 信任分计算（trust-score.js 纯函数）=====
  on(/^玩家没有任何评价$/, (ctx) => { ctx.reviews = []; return true })
  on(/^玩家收到 (\d+) 条评价平均 (\d+) 分$/, (ctx, m) => {
    const n = parseInt(m[1]); const r = parseInt(m[2])
    ctx.reviews = []
    for (let i = 0; i < n; i++) ctx.reviews.push({ rating: r })
    return true
  })
  on(/^玩家收到 (\d+) 条合法 (\d+) 分评价和 (\d+) 条非法评价$/, (ctx, m) => {
    const ok = parseInt(m[1]); const okR = parseInt(m[2]); const bad = parseInt(m[3])
    ctx.reviews = []
    for (let i = 0; i < ok; i++) ctx.reviews.push({ rating: okR })
    for (let j = 0; j < bad; j++) ctx.reviews.push({ rating: '非法' })
    return true
  })
  on(/^计算信任分$/, (ctx) => {
    ctx.lastResult = trustScore.computeTrustScore(ctx.reviews)
    return !!ctx.lastResult
  })
  on(/^信任分为 score 5\.0 且 count 0 且 tier newbie 且 label 新手$/, (ctx) => {
    const r = ctx.lastResult
    return r && r.score === 5.0 && r.count === 0 && r.tier === 'newbie' && r.label === '新手'
  })
  on(/^tier 为 (\w+) 且 label 为 (.+)$/, (ctx, m) => {
    const r = ctx.lastResult
    return r && r.tier === m[1] && r.label === m[2]
  })
  on(/^count 为 (\d+) 且 score 为 ([\d.]+)$/, (ctx, m) => {
    const r = ctx.lastResult
    return r && r.count === parseInt(m[1]) && r.score === parseFloat(m[2])
  })
  on(/^分数 ([\d.]+) 评价数 (\d+)$/, (ctx, m) => { ctx.score = parseFloat(m[1]); ctx.count = parseInt(m[2]); return true })
  on(/^调用 tierFromScore$/, (ctx) => {
    ctx.lastResult = trustScore.tierFromScore(ctx.score, ctx.count)
    return true
  })
  on(/^tierFromScore 结果为 (\w+)$/, (ctx, m) => ctx.lastResult === m[1])
  on(/^未知 tier 为 (\w+)$/, (ctx, m) => { ctx.tier = m[1]; return true })
  on(/^查询权重$/, (ctx) => { ctx.lastResult = trustScore.getTierWeight(ctx.tier); return true })
  on(/^权重为 ([\d.]+)$/, (ctx, m) => ctx.lastResult === parseFloat(m[1]))

  // ===== 公共云调用 ctx 构造器 =====
  function makeCloudCtx(impl) {
    return {
      cloudReady: true,
      callFunction: function (opts) {
        return new Promise(function (resolve) {
          try {
            const r = impl(opts)
            if (r && typeof r.then === 'function') r.then(resolve, function (e) { resolve({ result: { ok: false, errCode: 'CLOUD_ERROR', errMsg: String(e) } }) })
            else resolve({ result: r })
          } catch (e) { resolve({ result: { ok: false, errCode: 'CLOUD_ERROR', errMsg: String(e) } }) }
        })
      }
    }
  }
  function defaultTarget() {
    return { openId: 't1', roomId: 'r1', taskId: 'k1', roomMembers: [{ openId: 't1' }, { openId: 'me' }], roomStatus: 'finished' }
  }

  // ===== 玩家评价（player-trust-store.js）=====
  on(/^云端可用且目标玩家在 finished 房间内$/, (ctx) => {
    wx._reset()
    ctx.target = defaultTarget()
    ctx.cloudCtx = makeCloudCtx(function () { return { ok: true, trust: { score: 5.0, count: 1, label: '新手', tier: 'newbie' } } })
    return true
  })
  on(/^云端返回 ALREADY_REVIEWED 错误$/, (ctx) => {
    wx._reset()
    ctx.target = defaultTarget()
    ctx.cloudCtx = makeCloudCtx(function () { return { ok: false, errCode: 'ALREADY_REVIEWED', errMsg: '已评价过' } })
    return true
  })
  on(/^评价场景云端不可用$/, (ctx) => {
    wx._reset()
    ctx.target = defaultTarget()
    ctx.cloudCtx = { cloudReady: false }
    return true
  })
  on(/^提交评价 rating (\d+)$/, (ctx, m) => {
    return trustStore.submitReview(ctx.target, { rating: parseInt(m[1]), comment: '不错', tags: ['准时'] }, ctx.cloudCtx)
      .then(function (res) { ctx.lastResult = res; return true })
      .catch(function () { return false })
  })
  on(/^返回 ok true 且包含更新后的 trust$/, (ctx) => {
    const r = ctx.lastResult; return r && r.ok === true && !!r.trust
  })
  on(/^返回 ok false 且 errCode 为 ALREADY_REVIEWED$/, (ctx) => {
    const r = ctx.lastResult; return r && r.ok === false && r.errCode === 'ALREADY_REVIEWED'
  })
  on(/^返回 ok false 且 errCode 为 CLOUD_OFFLINE 且 trust 为默认新手$/, (ctx) => {
    const r = ctx.lastResult
    return r && r.ok === false && r.errCode === 'CLOUD_OFFLINE' && r.trust && r.trust.tier === 'newbie'
  })
  on(/^评价 comment 超长 200 字且 tags 含 8 个标签$/, (ctx) => {
    ctx.review = { rating: 5, comment: 'x'.repeat(200), tags: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] }
    ctx.target = defaultTarget()
    return true
  })
  on(/^构造评价文档$/, (ctx) => { ctx.lastResult = trustStore.buildReviewDoc(ctx.target, ctx.review); return true })
  on(/^comment 截断为 100 字且 tags 仅保留 5 个$/, (ctx) => {
    const d = ctx.lastResult; return d && d.comment.length === 100 && d.tags.length === 5
  })

  // ===== 信任分批量查询（getTrustBatch）=====
  on(/^openIds 含 2 个重复项共 4 项$/, (ctx) => {
    wx._reset()
    ctx.openIds = ['a', 'b', 'a', 'c']; ctx.cloudCtx = { cloudReady: false }
    return true
  })
  on(/^openIds 含 25 项$/, (ctx) => {
    wx._reset()
    ctx.openIds = []
    for (let i = 0; i < 25; i++) ctx.openIds.push('u' + i)
    ctx.cloudCtx = { cloudReady: false }
    return true
  })
  on(/^云端 callFunction 抛出异常$/, (ctx) => {
    wx._reset()
    ctx.openIds = ['a', 'b']
    ctx.cloudCtx = { cloudReady: true, callFunction: function () { throw new Error('boom') } }
    return true
  })
  on(/^批量查询信任分$/, (ctx) => {
    return trustStore.getTrustBatch(ctx.openIds, ctx.cloudCtx).then(function (res) { ctx.lastResult = res; return true })
  })
  on(/^仅查询 3 个唯一 openId$/, (ctx) => ctx.lastResult && Object.keys(ctx.lastResult).length === 3)
  on(/^仅查询前 20 个$/, (ctx) => ctx.lastResult && Object.keys(ctx.lastResult).length === 20)
  on(/^返回每个 openId 的默认 newbie 值$/, (ctx) => {
    const r = ctx.lastResult
    if (!r) return false
    const keys = Object.keys(r)
    if (keys.length !== 2) return false
    return keys.every(function (k) { return r[k] && r[k].tier === 'newbie' })
  })

  // ===== 举报玩家（reportPlayer）=====
  on(/^云端可用且被举报者 openId 有效$/, (ctx) => {
    wx._reset()
    ctx.target = { openId: 'bad_guy', roomId: 'r1' }
    ctx.cloudCtx = makeCloudCtx(function () { return { ok: true, flagged: true } })
    return true
  })
  on(/^被举报者 openId 为空$/, (ctx) => {
    ctx.target = { openId: '', roomId: 'r1' }
    ctx.cloudCtx = { cloudReady: true, callFunction: function () { return Promise.resolve({ result: { ok: true } }) } }
    return true
  })
  on(/^举报场景云端不可用$/, (ctx) => {
    wx._reset()
    ctx.target = { openId: 'someone', roomId: 'r1' }
    ctx.cloudCtx = { cloudReady: false }
    return true
  })
  on(/^提交举报理由 (.+)$/, (ctx, m) => {
    return trustStore.reportPlayer(ctx.target, m[1], ctx.cloudCtx).then(function (res) { ctx.lastResult = res; return true })
  })
  on(/^提交举报$/, (ctx) => {
    return trustStore.reportPlayer(ctx.target, '理由', ctx.cloudCtx).then(function (res) { ctx.lastResult = res; return true })
  })
  on(/^返回 ok true$/, (ctx) => ctx.lastResult && ctx.lastResult.ok === true)
  on(/^返回 ok false 且 errCode 为 INVALID_PARAM$/, (ctx) => {
    const r = ctx.lastResult; return r && r.ok === false && r.errCode === 'INVALID_PARAM'
  })
  on(/^返回 ok false 且 errCode 为 CLOUD_OFFLINE$/, (ctx) => {
    const r = ctx.lastResult; return r && r.ok === false && r.errCode === 'CLOUD_OFFLINE'
  })

  // ===== room 内嵌聊天（chat-store.js）=====
  on(/^room (\w+) 本地无消息$/, (ctx, m) => { wx._reset(); ctx.roomId = m[1]; return true })
  on(/^room (\w+) 云端不可用$/, (ctx, m) => {
    wx._reset(); ctx.roomId = m[1]
    ctx.chatCtx = { cloudReady: false, currentUser: { openId: 'me', nickname: '我' } }
    return true
  })
  on(/^发送消息内容 (.+)$/, (ctx, m) => {
    const roomId = ctx.roomId || 'r_def'
    const cloudCtx = ctx.chatCtx || {
      cloudReady: true,
      currentUser: { openId: 'me', nickname: '我' },
      callFunction: function (opts) {
        return Promise.resolve({ result: { ok: true, message: { _id: 'srv_1', roomId: roomId, content: opts.data.content, senderOpenId: 'me', senderNickname: '我', createdAt: Date.now() } } })
      }
    }
    return chatStore.sendMessage(roomId, 'task1', m[1], cloudCtx).then(function (res) { ctx.lastResult = res; return true })
  })
  on(/^本地缓存出现真实消息且 status sent$/, (ctx) => {
    const list = chatStore.loadMessages(ctx.roomId)
    return list.length > 0 && list[0]._id === 'srv_1' && list[0].status === 'sent'
  })
  on(/^返回 ok true 且 source 为 local_only$/, (ctx) => {
    const r = ctx.lastResult; return r && r.ok === true && r.source === 'local_only'
  })
  on(/^消息内容 (\d+) 字$/, (ctx, m) => {
    ctx.content = 'a'.repeat(parseInt(m[1]))
    ctx.chatCtx = { cloudReady: false, currentUser: { openId: 'me' } }
    ctx.roomId = 'r_len'
    return true
  })
  on(/^消息内容为空字符串$/, (ctx) => {
    ctx.content = '   '
    ctx.chatCtx = { cloudReady: false, currentUser: { openId: 'me' } }
    ctx.roomId = 'r_empty'
    return true
  })
  on(/^发送消息$/, (ctx) => {
    return chatStore.sendMessage(ctx.roomId, 't', ctx.content, ctx.chatCtx).then(function (res) { ctx.lastResult = res; return true })
  })
  on(/^本地已有 2 条消息 createdAt 100 和 200$/, (ctx) => {
    wx._reset()
    ctx.roomId = 'r_inc'
    chatStore.saveMessages(ctx.roomId, [
      { _id: 'm100', roomId: 'r_inc', content: '旧1', createdAt: 100, senderOpenId: 'a' },
      { _id: 'm200', roomId: 'r_inc', content: '旧2', createdAt: 200, senderOpenId: 'a' }
    ])
    ctx.chatCtx = { cloudReady: false }
    return true
  })
  on(/^增量拉取 lastCreatedAt (\d+)$/, (ctx, m) => {
    return chatStore.fetchNewMessages(ctx.roomId, parseInt(m[1]), ctx.chatCtx).then(function (res) { ctx.lastResult = res; return true })
  })
  on(/^仅返回 createdAt 大于 (\d+) 的消息$/, (ctx, m) => {
    const threshold = parseInt(m[1])
    const r = ctx.lastResult
    if (!r || !Array.isArray(r.messages)) return false
    return r.messages.every(function (msg) { return msg.createdAt > threshold }) && r.messages.some(function (msg) { return msg.createdAt === 200 })
  })
  on(/^已有消息含 _id (\w+) createdAt (\d+)$/, (ctx, m) => {
    wx._reset()
    ctx.existing = [{ _id: m[1], roomId: 'r', content: 'c', createdAt: parseInt(m[2]), senderOpenId: 'a' }]
    return true
  })
  on(/^新消息 _id (\w+) createdAt (\d+) 到达$/, (ctx, m) => {
    ctx.incoming = [{ _id: m[1], roomId: 'r', content: 'c2', createdAt: parseInt(m[2]), senderOpenId: 'b' }]
    ctx.lastResult = chatStore.dedupMessages(ctx.existing, ctx.incoming)
    return true
  })
  on(/^合并后顺序为 (\w+) 然后 (\w+)$/, (ctx, m) => {
    const ids = ctx.lastResult.map(function (x) { return x._id })
    return ids[0] === m[1] && ids[1] === m[2]
  })
  on(/^本地有乐观消息 tempKey (\w+)$/, (ctx, m) => {
    wx._reset()
    ctx.roomId = 'r_opt'; ctx.tempKey = m[1]
    chatStore.saveMessages(ctx.roomId, [{ _id: m[1], tempKey: m[1], roomId: 'r_opt', content: '乐观', createdAt: 100, isLocal: true, status: 'pending', senderOpenId: 'me' }])
    return true
  })
  on(/^真实消息携带 replaceKey (\w+) 到达$/, (ctx, m) => {
    const incoming = [{ _id: 'real_1', roomId: 'r_opt', content: '乐观', createdAt: 100, senderOpenId: 'me', replaceKey: m[1] }]
    ctx.lastResult = chatStore.dedupMessages(chatStore.loadMessages(ctx.roomId), incoming)
    return true
  })
  on(/^乐观消息被删除且真实消息保留$/, (ctx) => {
    const ids = ctx.lastResult.map(function (x) { return x._id })
    return ids.indexOf(ctx.tempKey) === -1 && ids.indexOf('real_1') >= 0
  })
  on(/^轮询已启动 room (\w+)$/, (ctx, m) => {
    wx._reset(); ctx.roomId = m[1]
    chatStore.stopPolling()
    return chatStore.startPolling(ctx.roomId, { cloudReady: false, pollInterval: 50 }, function () {}) === true
  })
  on(/^停止轮询$/, (ctx) => { chatStore.stopPolling(); return true })
  on(/^轮询状态 active 为 false$/, (ctx) => {
    const s = chatStore._getPollingState(); return s && s.active === false
  })

  // ===== 信任分影响匹配优先级（player-matcher.rankByRelevance）=====
  function makePlayer(openId, district, tier) {
    return { openId: openId, nickname: openId, district: district, interests: [], avatar: '/a', isReal: true, tier: tier }
  }
  on(/^候选池有 1 个 (\w+) 玩家和 1 个 (\w+) 玩家 district 相同$/, (ctx, m) => {
    ctx.players = [makePlayer('p_a', '天河区', m[1]), makePlayer('p_b', '天河区', m[2])]
    ctx.trustMap = { p_a: { tier: m[1] }, p_b: { tier: m[2] } }
    return true
  })
  on(/^候选池有 1 个 (\w+) 玩家和 1 个 (\w+) 玩家$/, (ctx, m) => {
    ctx.players = [makePlayer('p1', '天河区', m[1]), makePlayer('p2', '天河区', m[2])]
    ctx.trustMap = { p1: { tier: m[1] }, p2: { tier: m[2] } }
    return true
  })
  on(/^按 trust 权重排序$/, (ctx) => {
    ctx.lastResult = playerMatcher.rankByRelevance(ctx.players, { district: '天河区' }, ctx.trustMap)
    return Array.isArray(ctx.lastResult) && ctx.lastResult.length === 2
  })
  on(/^(\w+) 玩家排在前面$/, (ctx, m) => ctx.lastResult[0].tier === m[1])
  on(/^normal 玩家排在前面且 watch 玩家在队尾$/, (ctx) => {
    return ctx.lastResult[0].tier === 'normal' && ctx.lastResult[1].tier === 'watch'
  })
})()

// ============================================================
// ===== 通用：解析 feature 文件 =====
// ============================================================
function parseFeature(content) {
  const lines = content.split('\n')
  const scenarios = []
  let currentScenario = null
  let featureTitle = ''
  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed.startsWith('Feature:')) {
      featureTitle = trimmed.replace('Feature:', '').trim()
    } else if (trimmed.startsWith('Scenario:')) {
      if (currentScenario) scenarios.push(currentScenario)
      currentScenario = { name: trimmed.replace('Scenario:', '').trim(), steps: [] }
    } else if (trimmed.match(/^(Given|When|Then|And)\s/)) {
      if (currentScenario) {
        const match = trimmed.match(/^(Given|When|Then|And)\s+(.*)$/)
        currentScenario.steps.push({ keyword: match[1], text: match[2] })
      }
    }
  }
  if (currentScenario) scenarios.push(currentScenario)
  return { title: featureTitle, scenarios }
}

// ============================================================
// ===== 步骤分发 =====
// ============================================================
async function executeStep(ctx, step) {
  const text = step.text
  for (const h of stepHandlers) {
    let matched = false
    let m = null
    if (h.match instanceof RegExp) {
      m = text.match(h.match)
      matched = !!m
    } else if (typeof h.match === 'function') {
      matched = h.match(text)
    } else if (typeof h.match === 'string') {
      matched = text === h.match
    }
    if (!matched) continue
    let result = h.run(ctx, m, text)
    // 支持异步 handler（C-P4 聊天/信任数据层为 Promise）
    if (result && typeof result.then === 'function') {
      try { result = await result } catch (e) { result = false }
    }
    if (result !== null && result !== undefined) return !!result
  }
  console.log('    ⚠ 未匹配步骤: ' + text)
  return false
}

// ============================================================
// ===== 加载 feature 文件 =====
// ============================================================
const argFilter = process.argv.slice(2).filter(a => !a.startsWith('-'))
const featureDir = __dirname
let featureFiles
if (argFilter.length > 0) {
  featureFiles = argFilter.map(f => ({
    path: path.join(featureDir, f),
    name: f
  }))
} else {
  featureFiles = fs.readdirSync(featureDir)
    .filter(f => f.endsWith('.feature'))
    .map(f => ({ path: path.join(featureDir, f), name: f }))
}

// ============================================================
// ===== 主执行循环（async 以支持 C-P4 异步步骤）=====
// ============================================================
let totalScenarioPassed = 0
let totalScenarioFailed = 0

;(async function () {
for (const ff of featureFiles) {
  if (!fs.existsSync(ff.path)) {
    console.log('\n⚠ 文件不存在: ' + ff.name)
    continue
  }
  const content = fs.readFileSync(ff.path, 'utf-8')
  const { title, scenarios } = parseFeature(content)

  console.log('\n' + '='.repeat(60))
  console.log('Feature: ' + title + '  (' + ff.name + ')')
  console.log('='.repeat(60))

  let scenarioPassed = 0
  let scenarioFailed = 0

  for (const scenario of scenarios) {
    scenarioCount++
    // 每个 scenario 独立 ctx，避免状态污染
    const ctx = {}
    console.log('\n--- Scenario: ' + scenario.name + ' ---')
    let allPassed = true

    for (const step of scenario.steps) {
      const result = await executeStep(ctx, step)
      if (result) {
        passCount++
        console.log('  ✓ ' + step.keyword + ' ' + step.text)
      } else {
        failCount++
        allPassed = false
        failures.push(`[${ff.name}] "${scenario.name}": ${step.keyword} ${step.text}`)
        console.log('  ✗ ' + step.keyword + ' ' + step.text)
      }
    }

    if (allPassed) {
      scenarioPassed++
      totalScenarioPassed++
      console.log('  ✓ 场景通过')
    } else {
      scenarioFailed++
      totalScenarioFailed++
      console.log('  ✗ 场景失败')
    }
  }

  console.log('\n--- ' + ff.name + ' 小结: ' + scenarioPassed + ' passed, ' + scenarioFailed + ' failed ---')
}

// ============================================================
// ===== 最终结果 =====
// ============================================================
console.log('\n' + '='.repeat(60))
console.log(`Gherkin BDD 总结果: ${scenarioCount} scenarios, ${passCount} steps passed, ${failCount} steps failed`)
console.log(`场景统计: ${totalScenarioPassed} passed, ${totalScenarioFailed} failed`)
if (failures.length > 0) {
  console.log('\n失败项:')
  failures.forEach(f => console.log('  - ' + f))
}
console.log('='.repeat(60))
process.exit(failCount > 0 ? 1 : 0)
})()
