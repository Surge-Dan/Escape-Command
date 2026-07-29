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
function executeStep(ctx, step) {
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
    const result = h.run(ctx, m, text)
    if (result !== null && result !== undefined) return result
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
// ===== 主执行循环 =====
// ============================================================
let totalScenarioPassed = 0
let totalScenarioFailed = 0

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
      const result = executeStep(ctx, step)
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
