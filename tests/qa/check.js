// tests/qa/check.js
// QA 质量检查：代码质量 + 包体红线 + 资源检查 + 最佳实践
// 运行: node tests/qa/check.js

const fs = require('fs')
const path = require('path')

const projectRoot = path.resolve(__dirname, '..', '..')
let checks = 0
let passed = 0
let warnings = 0
let errors = 0

function check(name, condition, level) {
  checks++
  if (condition) {
    passed++
    console.log('  ✓ ' + name)
  } else {
    if (level === 'error') errors++
    else if (level === 'warn') warnings++
    console.log('  ' + (level === 'error' ? '✗' : '⚠') + ' ' + name)
  }
}

console.log('\n' + '='.repeat(50))
console.log('QA 质量检查')
console.log('='.repeat(50))

// ===== 1. 文件存在性检查 =====
console.log('\n--- 1. 文件存在性 ---')
const requiredFiles = [
  'packageSync/utils/group-room-store.js',
  'utils/generator-engine.js',
  'utils/record-builder.js',
  'utils/execution-progress.js',
  'utils/poi-command-builder.js',
  'cloudfunctions/poiSearch/index.js',
  'cloudfunctions/poiSearch/package.json',
  'packageSync/pages/group/create/create.js',
  'packageSync/pages/group/create/create.wxml',
  'packageSync/pages/group/create/create.wxss',
  'packageSync/pages/group/room/room.js',
  'packageSync/pages/group/room/room.wxml',
  'packageSync/pages/group/room/room.wxss',
  'packageSync/pages/group/escape-record/escape-record.js',
  'packageSync/pages/group/escape-record/escape-record.wxml'
]
requiredFiles.forEach(f => {
  check('文件存在: ' + f, fs.existsSync(path.join(projectRoot, f)), 'error')
})

// ===== 2. 数据层函数完整性 =====
console.log('\n--- 2. 数据层函数完整性 ---')
const wx = require('../mock-wx.js')
global.wx = wx
const store = require('../../packageSync/utils/group-room-store.js')
const requiredFunctions = [
  'createRoom', 'loadRoom', 'cancelRoom',
  'joinRoom', 'addMockMember', 'fillMockMembers',
  'submitPreference', 'submitVote', 'getVoteStats',
  'generateScript', 'updateRoomStatus', 'clearAllRooms'
]
requiredFunctions.forEach(fn => {
  check('store 导出函数: ' + fn, typeof store[fn] === 'function', 'error')
})

// ===== 2b. generator-engine 函数完整性（B-01~B-06）=====
console.log('\n--- 2b. generator-engine 函数完整性 ---')
const engine = require('../../utils/generator-engine.js')
const engineFunctions = [
  'getFaceForType',       // B-01
  'getLoadingCopy',       // B-02
  'filterByConditions',   // B-03
  'filterByBusinessHours',// B-04
  'filterBySafety',       // B-05
  'getFallbackCommands',  // B-06
  'generate',             // 主入口
  'applyModeFilter',
  'pickWeighted',
  'filterByWeather',      // B-07
  'filterByLocationDedup',// B-08
  'filterBySimilar',      // B-09
  'computeDifficulty',    // B-10
  'filterByDifficulty',   // B-10
  'scoreCommand',         // B-12
  'pickBestScored',       // B-12
  'buildExplanation',     // B-13
  'fillVariables',        // B-14
  'normalizeType'         // B-11
]
engineFunctions.forEach(fn => {
  check('engine 导出函数: ' + fn, typeof engine[fn] === 'function', 'error')
})
check('engine._internal 导出', !!engine._internal, 'error')
check('engine._internal.POI_HOURS', !!engine._internal.POI_HOURS, 'error')
check('engine._internal.FALLBACK_COMMANDS', Array.isArray(engine._internal.FALLBACK_COMMANDS), 'error')
check('engine._internal.LOADING_COPIES', !!engine._internal.LOADING_COPIES, 'error')
check('engine._internal.TYPE_FACE_MAP', !!engine._internal.TYPE_FACE_MAP, 'error')
check('engine._internal.normalizeCtx', typeof engine._internal.normalizeCtx === 'function', 'error')
// B-07~B-14 新增 _internal 导出
check('engine._internal.EXPLANATION_REASONS', !!engine._internal.EXPLANATION_REASONS, 'error')
check('engine._internal.normalizeType', typeof engine._internal.normalizeType === 'function', 'error')
check('engine._internal.buildTypeWeights', typeof engine._internal.buildTypeWeights === 'function', 'error')
check('engine._internal.extractKeywords', typeof engine._internal.extractKeywords === 'function', 'error')
check('engine._internal.jaccard', typeof engine._internal.jaccard === 'function', 'error')
check('engine._internal.computeDifficulty', typeof engine._internal.computeDifficulty === 'function', 'error')
check('engine._internal.scoreCommand', typeof engine._internal.scoreCommand === 'function', 'error')
check('engine._internal.buildExplanation', typeof engine._internal.buildExplanation === 'function', 'error')
check('engine._internal.fillVariables', typeof engine._internal.fillVariables === 'function', 'error')

// ===== 2c. record-builder 函数完整性（完成流数据联动）=====
console.log('\n--- 2c. record-builder 函数完整性 ---')
const recordBuilder = require('../../utils/record-builder.js')
check('recordBuilder 导出 buildRecord', typeof recordBuilder.buildRecord === 'function', 'error')
check('recordBuilder._internal 导出', !!recordBuilder._internal, 'error')
check('recordBuilder._internal.todayStr', typeof recordBuilder._internal.todayStr === 'function', 'error')
check('recordBuilder._internal.timeStr', typeof recordBuilder._internal.timeStr === 'function', 'error')
check('recordBuilder._internal.pad2', typeof recordBuilder._internal.pad2 === 'function', 'error')
check('recordBuilder._internal.safeObj', typeof recordBuilder._internal.safeObj === 'function', 'error')
check('recordBuilder._internal.isLocObj', typeof recordBuilder._internal.isLocObj === 'function', 'error')

// ===== 3. 常量完整性 =====
console.log('\n--- 3. 常量完整性 ---')
check('ROOM_STATUS 导出', !!store.ROOM_STATUS, 'error')
check('VOTE_OPTIONS 导出', !!store.VOTE_OPTIONS, 'error')
check('PREFERENCE_OPTIONS 导出', !!store.PREFERENCE_OPTIONS, 'error')
check('ROOM_STATUS.WAITING 值正确', store.ROOM_STATUS.WAITING === 'waiting_members', 'error')
check('ROOM_STATUS.VOTING 值正确', store.ROOM_STATUS.VOTING === 'voting', 'error')
check('ROOM_STATUS.FINISHED 值正确', store.ROOM_STATUS.FINISHED === 'finished', 'error')
check('VOTE_OPTIONS.time 有 3 项', store.VOTE_OPTIONS.time.length === 3, 'error')
check('VOTE_OPTIONS.budget 有 3 项', store.VOTE_OPTIONS.budget.length === 3, 'error')
check('VOTE_OPTIONS.style 有 3 项', store.VOTE_OPTIONS.style.length === 3, 'error')
check('PREFERENCE_OPTIONS.interests 有 6 项', store.PREFERENCE_OPTIONS.interests.length === 6, 'error')
check('PREFERENCE_OPTIONS.intensity 有 3 项', store.PREFERENCE_OPTIONS.intensity.length === 3, 'error')

// ===== 3a. C-P2 同频组局收尾函数 + 契约完整性（C-14~C-19）=====
console.log('\n--- 3a. C-P2 同频组局收尾函数 + 契约完整性 ---')
const storeJs = fs.readFileSync(path.join(projectRoot, 'packageSync/utils/group-room-store.js'), 'utf-8')
// 函数导出
;['assignRoles', 'generateClues', 'listPublicRooms', 'requestJoin', 'approveJoin', 'rejectJoin', 'submitReview', 'reportRoom'].forEach(fn => {
  check('store 导出 C-P2 函数: ' + fn, typeof store[fn] === 'function', 'error')
})
// _internal 导出（供测试/变异测试使用）
;['buildRoles', 'buildClues', 'buildReviewSummary', 'generateRequestId'].forEach(fn => {
  check('store._internal 导出: ' + fn, typeof store._internal[fn] === 'function', 'error')
})
check('store._internal 导出 ROLE_LIBRARY', !!store._internal.ROLE_LIBRARY, 'error')
check('store 顶层导出 ROLE_LIBRARY', !!store.ROLE_LIBRARY, 'error')

// ROLE_LIBRARY 完整性（C-14）
check('ROLE_LIBRARY 含 relax', Array.isArray(store.ROLE_LIBRARY.relax) && store.ROLE_LIBRARY.relax.length > 0, 'error')
check('ROLE_LIBRARY 含 adventure', Array.isArray(store.ROLE_LIBRARY.adventure) && store.ROLE_LIBRARY.adventure.length > 0, 'error')
check('ROLE_LIBRARY 含 social', Array.isArray(store.ROLE_LIBRARY.social) && store.ROLE_LIBRARY.social.length > 0, 'error')
check('ROLE_LIBRARY relax 至少 3 个角色', store.ROLE_LIBRARY.relax.length >= 3, 'error')

// buildRoles 契约（C-14）
check('buildRoles 使用 relax 兜底', storeJs.includes('ROLE_LIBRARY[style] || ROLE_LIBRARY.relax'), 'error')
check('buildRoles 使用轮询 i % pool.length', storeJs.includes('pool[i % pool.length]'), 'error')
check('buildRoles members 非数组兜底 []', storeJs.includes('Array.isArray(members) ? members : []'), 'error')

// buildClues 契约（C-15）
check('buildClues 使用轮询 i % sList.length', storeJs.includes('sList[i % sList.length]'), 'error')
check('buildClues steps 为空兜底「自由发挥」', storeJs.includes("'自由发挥'"), 'error')
check('buildClues steps 非数组兜底 []', storeJs.includes('Array.isArray(steps) ? steps : []'), 'error')

// assignRoles/generateClues 状态守卫（C-14/C-15）
check('assignRoles 仅 FINISHED 可调', storeJs.includes("room.status !== ROOM_STATUS.FINISHED") && storeJs.includes('剧本未生成，无法分配角色'), 'error')
check('generateClues 仅 FINISHED 可调', storeJs.includes('剧本未生成，无法生成线索'), 'error')

// listPublicRooms 契约（C-16）
check('listPublicRooms 过滤 visibility === public', storeJs.includes("r.visibility === 'public'"), 'error')
check('listPublicRooms 排除 cancelled', storeJs.includes("r.status !== 'cancelled'"), 'error')
check('listPublicRooms 排除 FINISHED', storeJs.includes('r.status !== ROOM_STATUS.FINISHED'), 'error')
check('listPublicRooms 按 createdAt 倒序', storeJs.includes('(b.createdAt || 0) - (a.createdAt || 0)'), 'error')
check('listPublicRooms 精简字段 membersCount', storeJs.includes('membersCount:'), 'error')
check('listPublicRooms 精简字段不含 members 数组', !storeJs.includes('membersCount: r.members'), 'warn')
check('createRoom 支持 options.visibility', storeJs.includes("opts.visibility === 'public'"), 'error')
check('createRoom 默认 visibility private', storeJs.includes("'private'"), 'error')

// requestJoin 契约（C-17）
check('requestJoin 仅 public 可申请 (NOT_PUBLIC)', storeJs.includes("room.visibility !== 'public'") && storeJs.includes("'NOT_PUBLIC'"), 'error')
check('requestJoin 防已是成员 (ALREADY_JOINED)', storeJs.includes("'ALREADY_JOINED'"), 'error')
check('requestJoin 防重复申请 (ALREADY_REQUESTED)', storeJs.includes("'ALREADY_REQUESTED'"), 'error')
check('requestJoin 房间满检查 (ROOM_FULL)', storeJs.includes("'ROOM_FULL'"), 'error')
check('requestJoin 拒绝 VOTING/GENERATING/FINISHED', storeJs.includes("room.status === ROOM_STATUS.VOTING || room.status === ROOM_STATUS.GENERATING || room.status === ROOM_STATUS.FINISHED"), 'error')
check('requestJoin 返回 requestId', storeJs.includes('return { ok: true, requestId }'), 'error')

// approveJoin/rejectJoin 契约（C-18）
check('approveJoin 仅房主可调 (NOT_HOST)', storeJs.includes("'NOT_HOST'") && storeJs.includes('只有发起人可以审核'), 'error')
check('approveJoin 从 joinRequests 移除', storeJs.includes("reqs.filter(r => r.requestId !== requestId)"), 'error')
check('approveJoin 加入 members', storeJs.includes('room.members.push({'), 'error')
check('approveJoin 新成员 isHost=false', storeJs.includes('isHost: false'), 'error')
check('approveJoin 房间满检查 (ROOM_FULL)', storeJs.includes("'ROOM_FULL'") && storeJs.includes('房间已满'), 'error')
check('approveJoin 申请不存在 (REQUEST_NOT_FOUND)', storeJs.includes("'REQUEST_NOT_FOUND'"), 'error')
check('rejectJoin 仅房主可调', (storeJs.match(/rejectJoin[\s\S]{0,600}NOT_HOST/) || []).length > 0, 'error')

// submitReview 契约（C-19）
check('submitReview rating 整数校验 Number.isInteger', storeJs.includes('Number.isInteger(review.rating)'), 'error')
check('submitReview rating 范围 1-5', storeJs.includes('review.rating < 1 || review.rating > 5'), 'error')
check('submitReview comment 截断 100 字', storeJs.includes('.slice(0, 100)'), 'error')
check('submitReview 仅 FINISHED 可评价', storeJs.includes('完成后才能评价'), 'error')
check('submitReview 仅成员可评价 (NOT_MEMBER)', storeJs.includes("'NOT_MEMBER'"), 'error')
check('submitReview 防重复 (ALREADY_REVIEWED)', storeJs.includes("'ALREADY_REVIEWED'"), 'error')
check('submitReview 返回 reviewSummary', storeJs.includes('reviewSummary: buildReviewSummary(reviews)'), 'error')

// buildReviewSummary 契约（C-19 纯函数）
check('buildReviewSummary rating 范围 [1,5]', storeJs.includes('rating >= 1 && rating <= 5'), 'error')
check('buildReviewSummary average 保留一位小数', storeJs.includes('Math.round((sum / total) * 10) / 10'), 'error')
check('buildReviewSummary 空数组 average=0', storeJs.includes('total > 0 ?'), 'error')
check('buildReviewSummary distribution 含 1-5', storeJs.includes('distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }'), 'error')

// reportRoom 契约（C-19）
check('reportRoom 理由范围 1-100 字', storeJs.includes('r.length > 100'), 'error')
check('reportRoom 防重复 (ALREADY_REPORTED)', storeJs.includes("'ALREADY_REPORTED'"), 'error')
check('reportRoom 函数存在', typeof store.reportRoom === 'function', 'error')
check('reportRoom 记录 reportedBy + reportedAt', storeJs.includes('room.reportedBy') && storeJs.includes('room.reportedAt'), 'error')

// room 数据结构字段（C-16~C-19 扩展字段）
check('createRoom 初始化 visibility 字段', storeJs.includes('visibility,'), 'error')
check('createRoom 初始化 joinRequests 字段', storeJs.includes('joinRequests: []'), 'error')
check('createRoom 初始化 reviews 字段', storeJs.includes('reviews: []'), 'error')
check('createRoom 初始化 reported 字段', storeJs.includes('reported: false'), 'error')
check('generateScript 自动分配 roles', storeJs.includes('room.roles = buildRoles'), 'error')
check('generateScript 自动生成 clues', storeJs.includes('room.clues = buildClues'), 'error')

// C-P2 安全性：无 eval/Function 注入
check('store.js 无 eval() (C-P2)', !storeJs.includes('eval('), 'error')
check('store.js 无 new Function() (C-P2)', !storeJs.includes('new Function('), 'error')

// ===== 3b. C-P3 任务大厅与搭子匹配契约完整性 =====
console.log('\n--- 3b. C-P3 任务大厅数据层契约 ---')
// A. 数据文件存在性（注意：同频业务已分包到 packageSync/data/）
check('guangzhou-districts.js 存在', fs.existsSync(path.join(projectRoot, 'packageSync/data/guangzhou-districts.js')), 'error')
check('guangzhou-pois.js 存在', fs.existsSync(path.join(projectRoot, 'packageSync/data/guangzhou-pois.js')), 'error')
check('escape-master-tasks.js 存在', fs.existsSync(path.join(projectRoot, 'packageSync/data/escape-master-tasks.js')), 'error')
check('mock-user-pool.js 存在', fs.existsSync(path.join(projectRoot, 'packageSync/utils/mock-user-pool.js')), 'error')
check('task-hall-store.js 存在', fs.existsSync(path.join(projectRoot, 'packageSync/utils/task-hall-store.js')), 'error')

// B. 数据文件导出与完整性
const districts = require('../../packageSync/data/guangzhou-districts.js')
const pois = require('../../packageSync/data/guangzhou-pois.js')
const templates = require('../../packageSync/data/escape-master-tasks.js')
const userPool = require('../../packageSync/utils/mock-user-pool.js')

// 广州区域
check('GUANGZHOU_DISTRICTS 导出', Array.isArray(districts.GUANGZHOU_DISTRICTS), 'error')
check('GUANGZHOU_DISTRICTS 11 区', districts.GUANGZHOU_DISTRICTS.length === 11, 'error')
check('getDistrictByName 导出', typeof districts.getDistrictByName === 'function', 'error')
check('getDistrictById 导出', typeof districts.getDistrictById === 'function', 'error')

// 广州 POI
check('GUANGZHOU_POIS 导出', Array.isArray(pois.GUANGZHOU_POIS), 'error')
check('GUANGZHOU_POIS ≥50 个', pois.GUANGZHOU_POIS.length >= 50, 'error')
check('POI_TYPES 导出', !!pois.POI_TYPES, 'error')
check('getPOIsByDistrict 导出', typeof pois.getPOIsByDistrict === 'function', 'error')
check('getPOIsByType 导出', typeof pois.getPOIsByType === 'function', 'error')
check('getPOIById 导出', typeof pois.getPOIById === 'function', 'error')
// POI 字段完整性（抽查第一个）
const samplePoi = pois.GUANGZHOU_POIS[0]
check('POI 含 id 字段', !!samplePoi.id, 'error')
check('POI 含 name 字段', !!samplePoi.name, 'error')
check('POI 含 district 字段', !!samplePoi.district, 'error')
check('POI 含 latitude 字段', typeof samplePoi.latitude === 'number', 'error')
check('POI 含 longitude 字段', typeof samplePoi.longitude === 'number', 'error')
check('POI 含 type 字段', !!samplePoi.type, 'error')

// 出逃大师模板
check('ESCAPE_MASTER_TEMPLATES 导出', Array.isArray(templates.ESCAPE_MASTER_TEMPLATES), 'error')
check('ESCAPE_MASTER_TEMPLATES ≥10 条', templates.ESCAPE_MASTER_TEMPLATES.length >= 10, 'error')
check('getTemplatesByDistrict 导出', typeof templates.getTemplatesByDistrict === 'function', 'error')
// 模板字段完整性
const sampleTpl = templates.ESCAPE_MASTER_TEMPLATES[0]
check('Template 含 templateId', !!sampleTpl.templateId, 'error')
check('Template 含 topic', !!sampleTpl.topic, 'error')
check('Template 含 poiId', !!sampleTpl.poiId, 'error')
check('Template 含 steps 数组', Array.isArray(sampleTpl.steps), 'error')
check('Template tags 含官方', sampleTpl.tags.includes('官方'), 'error')
// POI 引用一致性（所有模板的 poiId 必须在 POI 库中存在）
const invalidPoiTemplates = templates.ESCAPE_MASTER_TEMPLATES.filter(t => !pois.getPOIById(t.poiId))
check('Template poiId 引用一致性', invalidPoiTemplates.length === 0, 'error')

// mock 用户池
check('MOCK_USERS 导出', Array.isArray(userPool.MOCK_USERS), 'error')
check('MOCK_USERS ≥8 个', userPool.MOCK_USERS.length >= 8, 'error')
check('getMockUsers 导出', typeof userPool.getMockUsers === 'function', 'error')
check('getRandomPartner 导出', typeof userPool.getRandomPartner === 'function', 'error')
check('Mock 用户 avatar 复用', userPool.MOCK_USERS.every(u => u.avatar === '/assets/images/avatar.webp'), 'error')

// C. task-hall-store 函数导出
const hallStore = require('../../packageSync/utils/task-hall-store.js')
;['initHallFromTemplates', 'listTasks', 'getTaskDetail', 'createUserTask', 'joinTask', 'diceMatch', 'linkRoom', 'updateTaskStatus', 'clearAllTasks'].forEach(fn => {
  check('hallStore 导出函数: ' + fn, typeof hallStore[fn] === 'function', 'error')
})
check('hallStore 导出 HALL_TASK_STATUS', !!hallStore.HALL_TASK_STATUS, 'error')
check('hallStore 导出 VALID_CATEGORIES', Array.isArray(hallStore.VALID_CATEGORIES), 'error')
check('hallStore 导出 VALID_DISTRICTS', Array.isArray(hallStore.VALID_DISTRICTS), 'error')
check('hallStore._internal 导出', !!hallStore._internal, 'error')
;['generateTaskId', 'loadAllTasks', 'saveAllTasks', 'applyFilters', 'pickRandomTask', 'computePartnerCount', 'toCardSummary'].forEach(fn => {
  check('hallStore._internal 导出: ' + fn, typeof hallStore._internal[fn] === 'function', 'error')
})

// D. task-hall-store 契约（read source file）
const hallStoreJs = fs.readFileSync(path.join(projectRoot, 'packageSync/utils/task-hall-store.js'), 'utf-8')
check('task-hall 使用 STORAGE_KEY taskHall', hallStoreJs.includes("'taskHall'") || hallStoreJs.includes('"taskHall"'), 'error')
check('listTasks 默认排除 cancelled', hallStoreJs.includes("'cancelled'"), 'error')
check('listTasks 精简字段 membersCount', hallStoreJs.includes('membersCount'), 'error')
check('createUserTask 校验 topic 类型', hallStoreJs.includes("typeof opts.topic !== 'string'"), 'error')
check('createUserTask 校验 maxMembers 3-6', hallStoreJs.includes('maxMembers < 3') && hallStoreJs.includes('maxMembers > 6'), 'error')
check('joinTask 满员自动转 ready', hallStoreJs.includes("'ready'"), 'error')
check('diceMatch 返回 partners', hallStoreJs.includes('partners'), 'error')
check('diceMatch 空池 NO_MATCH', hallStoreJs.includes("'NO_MATCH'"), 'error')
check('linkRoom 仅 ready 状态可调', hallStoreJs.includes("INVALID_STATUS"), 'error')
check('initHallFromTemplates 幂等 force 参数', hallStoreJs.includes('force'), 'error')

// ===== 3c. C-P3 任务大厅页面契约 =====
console.log('\n--- 3c. C-P3 任务大厅页面契约 ---')
// E. 页面文件存在性
const pageFiles = [
  'packageSync/pages/group/hall/hall.js',
  'packageSync/pages/group/hall/hall.wxml',
  'packageSync/pages/group/hall/hall.wxss',
  'packageSync/pages/group/hall/hall.json',
  'packageSync/pages/group/hall/detail/detail.js',
  'packageSync/pages/group/hall/detail/detail.wxml',
  'packageSync/pages/group/hall/detail/detail.wxss',
  'packageSync/pages/group/hall/detail/detail.json',
  'packageSync/pages/group/hall/create-task/create-task.js',
  'packageSync/pages/group/hall/create-task/create-task.wxml',
  'packageSync/pages/group/hall/create-task/create-task.wxss',
  'packageSync/pages/group/hall/create-task/create-task.json'
]
pageFiles.forEach(f => {
  check('页面文件存在: ' + f, fs.existsSync(path.join(projectRoot, f)), 'error')
})

// F. 页面契约（read source files）
const hallJs = fs.readFileSync(path.join(projectRoot, 'packageSync/pages/group/hall/hall.js'), 'utf-8')
const hallWxml = fs.readFileSync(path.join(projectRoot, 'packageSync/pages/group/hall/hall.wxml'), 'utf-8')
const detailJs = fs.readFileSync(path.join(projectRoot, 'packageSync/pages/group/hall/detail/detail.js'), 'utf-8')
const createTaskJs = fs.readFileSync(path.join(projectRoot, 'packageSync/pages/group/hall/create-task/create-task.js'), 'utf-8')
const indexJs = fs.readFileSync(path.join(projectRoot, 'pages/index/index.js'), 'utf-8')

// hall 页
check('hall.js 导入 task-hall-store', hallJs.includes('task-hall-store'), 'error')
check('hall.js 调用 initHallFromTemplates', hallJs.includes('initHallFromTemplates'), 'error')
check('hall.js 调用 listTasks', hallJs.includes('listTasks'), 'error')
check('hall.js 调用 diceMatch', hallJs.includes('diceMatch'), 'error')
check('hall.js 含 nav-header', hallWxml.includes('nav-header'), 'error')
check('hall.wxml 含筛选 Tag', hallWxml.includes('scroll-x'), 'error')
check('hall.wxml 含任务卡片', hallWxml.includes('task-card') || hallWxml.includes('hall-card'), 'error')
check('hall.wxml 含摇骰子按钮', hallWxml.includes('摇骰子') || hallWxml.includes('dice'), 'error')

// detail 页
check('detail.js 调用 getTaskDetail', detailJs.includes('getTaskDetail'), 'error')
check('detail.js 调用 joinTask', detailJs.includes('joinTask'), 'error')
check('detail.js 调用 linkRoom', detailJs.includes('linkRoom'), 'error')
check('detail.js 含 members[0] host 检查', detailJs.includes('members[0]'), 'error')

// create-task 页
check('create-task.js 调用 createUserTask', createTaskJs.includes('createUserTask'), 'error')
check('create-task.js 调用 getPOIsByDistrict', createTaskJs.includes('getPOIsByDistrict'), 'error')

// 首页入口分流
check('index.js 含 showDiceSheet', indexJs.includes('showDiceSheet'), 'error')
check('index.js 含 onInviteFriendsTap', indexJs.includes('onInviteFriendsTap'), 'error')
check('index.js 含 onEnterHallTap', indexJs.includes('onEnterHallTap'), 'error')
check('index.js 跳转 hall 路由', indexJs.includes('/packageSync/pages/group/hall/hall'), 'error')

// G. 路由注册（主包 pages + subPackages.pages 合并判断）
const hallAppJson = JSON.parse(fs.readFileSync(path.join(projectRoot, 'app.json'), 'utf-8'))
const allRegisteredPages = (hallAppJson.pages || []).concat(
  (hallAppJson.subPackages || []).flatMap(sp => (sp.pages || []).map(p => sp.root + '/' + p))
)
;['packageSync/pages/group/hall/hall', 'packageSync/pages/group/hall/detail/detail', 'packageSync/pages/group/hall/create-task/create-task'].forEach(route => {
  check('app.json 注册路由: ' + route, allRegisteredPages.includes(route), 'error')
})

// H. group room 联动
const hallRoomJs = fs.readFileSync(path.join(projectRoot, 'packageSync/pages/group/room/room.js'), 'utf-8')
check('room.js 导入 task-hall-store', hallRoomJs.includes('task-hall-store'), 'error')
check('room.js onLoad 接收 taskId', /onLoad[\s\S]{0,500}taskId/.test(hallRoomJs), 'error')
check('room.js 回写 hall task finished', hallRoomJs.includes('updateTaskStatus') && hallRoomJs.includes('finished'), 'error')
check('hall.js 导入 group-room-store', hallJs.includes('group-room-store'), 'error')
check('hall.js diceMatch 后 createRoom', hallJs.includes('createRoom'), 'error')
check('hall.js diceMatch 后 linkRoom', hallJs.includes('linkRoom'), 'error')

// ===== 3c-bis. D3 自定义分类 / D4 模板扩充 / D5 真实玩家联动 =====
console.log('\n--- 3c-bis. D3 自定义分类 / D4 模板扩充 / D5 真实玩家联动 ---')

// D3: 自定义分类
check('D3 VALID_CATEGORIES 含 custom（共 11 类）', hallStore.VALID_CATEGORIES.indexOf('custom') >= 0 && hallStore.VALID_CATEGORIES.length === 11, 'error')
check('D3 task-hall-store 支持 customCategory 字段', hallStoreJs.includes('customCategory'), 'error')
check('D3 task-hall-store 校验 customCategory 长度', hallStoreJs.includes('CUSTOM_CATEGORY_MAX_LEN'), 'error')
check('D3 task-hall-store toCardSummary 含 customCategory', hallStoreJs.includes('customCategory'), 'error')
check('D3 create-task.js 含 onCustomCategoryTap', createTaskJs.includes('onCustomCategoryTap'), 'error')
check('D3 create-task.js 含 onCustomCategoryConfirm', createTaskJs.includes('onCustomCategoryConfirm'), 'error')
check('D3 create-task.js 含 onCustomCategoryClear', createTaskJs.includes('onCustomCategoryClear'), 'error')
check('D3 create-task.js 含 showCustomCategory 弹层', createTaskJs.includes('showCustomCategory'), 'error')
const createTaskWxml = fs.readFileSync(path.join(projectRoot, 'packageSync/pages/group/hall/create-task/create-task.wxml'), 'utf-8')
check('D3 create-task.wxml 含自定义分类入口', createTaskWxml.includes('tag-custom'), 'error')
check('D3 create-task.wxml 含自定义分类弹层', createTaskWxml.includes('custom-category-panel'), 'error')
// 自定义分类创建后落到 task 字段
check('D3 createUserTask 接收 customCategory 参数', hallStoreJs.includes("opts.customCategory") || hallStoreJs.includes('opts.customCategory'), 'error')
// detail 页展示自定义分类
check('D3 detail.js 支持 custom 分类展示', detailJs.includes('customCategory') || detailJs.includes("category === 'custom'"), 'error')

// D4: 官方任务模板扩充
check('D4 ESCAPE_MASTER_TEMPLATES 扩充至 45 条', templates.ESCAPE_MASTER_TEMPLATES.length === 45, 'error')
// 覆盖 11 区
const templateDistricts = new Set(templates.ESCAPE_MASTER_TEMPLATES.map(t => t.district))
check('D4 模板覆盖 11 个区', templateDistricts.size === 11, 'error')
check('D4 模板含新增区 增城区', templateDistricts.has('增城区'), 'error')
check('D4 模板含新增区 花都区', templateDistricts.has('花都区'), 'error')
check('D4 模板含新增区 南沙区', templateDistricts.has('南沙区'), 'error')
check('D4 模板含新增区 从化区', templateDistricts.has('从化区'), 'error')
check('D4 模板含新增区 黄埔区', templateDistricts.has('黄埔区'), 'error')
// 覆盖 10 类主题（不含 custom）
const templateCategories = new Set(templates.ESCAPE_MASTER_TEMPLATES.map(t => t.category))
check('D4 模板覆盖 sport 主题', templateCategories.has('sport'), 'error')
check('D4 模板覆盖 music 主题', templateCategories.has('music'), 'error')
check('D4 模板覆盖 photo 主题', templateCategories.has('photo'), 'error')
check('D4 模板覆盖 food 主题', templateCategories.has('food'), 'error')

// D5: 真实玩家联动
check('D5 player-matcher.js 存在', fs.existsSync(path.join(projectRoot, 'packageSync/utils/player-matcher.js')), 'error')
const playerMatcher = require('../../packageSync/utils/player-matcher.js')
;['normalizePlayer', 'rankByRelevance', 'mergeAndPick', 'shouldFallback', 'computePartnerCount', 'matchPlayersAsync'].forEach(fn => {
  check('D5 player-matcher 导出: ' + fn, typeof playerMatcher[fn] === 'function', 'error')
})
check('D5 player-matcher 导出 DEFAULT_AVATAR', typeof playerMatcher.DEFAULT_AVATAR === 'string', 'error')
check('D5 player-matcher 导出 CLOUD_TIMEOUT', typeof playerMatcher.CLOUD_TIMEOUT === 'number', 'error')
check('D5 player-matcher _internal.handleCloudResult', typeof playerMatcher._internal.handleCloudResult === 'function', 'error')
check('D5 hall.js 导入 player-matcher', hallJs.includes('player-matcher'), 'error')
check('D5 hall.js 调用 matchPlayersAsync', hallJs.includes('matchPlayersAsync'), 'error')
check('D5 hall.js 含 registerPlayerToCloud', hallJs.includes('registerPlayerToCloud') || hallJs.includes('registerPlayer'), 'error')
check('D5 hall.js 含 buildMatchCtx', hallJs.includes('buildMatchCtx'), 'error')
check('D5 task-hall-store 含 diceMatchWithPartners', hallStoreJs.includes('diceMatchWithPartners'), 'error')
check('D5 task-hall-store 导出 diceMatchWithPartners', typeof hallStore.diceMatchWithPartners === 'function', 'error')
// 云函数
check('D5 云函数 registerPlayer 存在', fs.existsSync(path.join(projectRoot, 'cloudfunctions/registerPlayer/index.js')), 'error')
check('D5 云函数 getOnlinePlayers 存在', fs.existsSync(path.join(projectRoot, 'cloudfunctions/getOnlinePlayers/index.js')), 'error')
check('D5 云函数 matchPlayers 存在', fs.existsSync(path.join(projectRoot, 'cloudfunctions/matchPlayers/index.js')), 'error')
// hall.wxml 真人徽章
check('D5 hall.wxml 含真人徽章 partner-real-badge', hallWxml.includes('partner-real-badge'), 'error')
check('D5 hall.wxml 含 isReal 判断', hallWxml.includes('item.isReal'), 'error')
// hall.js 主题分类与 task-hall-store 对齐（10 主题，不含 custom）
check('D5 hall.js CATEGORY_ORDER 10 主题', hallJs.includes("CATEGORY_ORDER") && hallJs.includes("'food'"), 'error')

// ===== 3d. generator-engine 常量完整性（B-01~B-06）=====
console.log('\n--- 3d. generator-engine 常量完整性 ---')
check('FALLBACK_COMMANDS 共 12 条', engine._internal.FALLBACK_COMMANDS.length === 12, 'error')
check('FALLBACK_COMMANDS 所有 id 以 fb 开头',
  engine._internal.FALLBACK_COMMANDS.every(c => typeof c.id === 'string' && c.id.indexOf('fb') === 0), 'error')
check('FALLBACK_COMMANDS 覆盖 6 种 type',
  new Set(engine._internal.FALLBACK_COMMANDS.map(c => c.type)).size === 6, 'error')
check('TYPE_FACE_MAP 共 6 个映射', Object.keys(engine._internal.TYPE_FACE_MAP).length === 6, 'error')
check('TYPE_FACE_MAP 值为 1-6',
  Object.values(engine._internal.TYPE_FACE_MAP).every(v => v >= 1 && v <= 6), 'error')
check('TYPE_FACE_MAP 值唯一',
  new Set(Object.values(engine._internal.TYPE_FACE_MAP)).size === 6, 'error')
check('POI_HOURS 含 cafe/park/convenience', !!engine._internal.POI_HOURS.cafe && !!engine._internal.POI_HOURS.park && !!engine._internal.POI_HOURS.convenience, 'error')
check('LOADING_COPIES 含 night/rainy/default', !!engine._internal.LOADING_COPIES.night && !!engine._internal.LOADING_COPIES.rainy && !!engine._internal.LOADING_COPIES.default, 'error')
// 90 天窗口常量
const engineCode = fs.readFileSync(path.join(projectRoot, 'utils/generator-engine.js'), 'utf-8')
check('90 天不重复窗口', engineCode.includes('90 * 24 * 60 * 60 * 1000'), 'error')
check('纯函数零 wx 依赖', !engineCode.includes('wx.') && !engineCode.includes('wx.cloud') && !engineCode.includes('wx.getStorage'), 'error')
check('使用 strict mode', engineCode.includes('\'use strict\'') || engineCode.includes('"use strict"'), 'warn')

// ===== 3e. record-builder 契约完整性（完成流数据联动）=====
console.log('\n--- 3e. record-builder 契约完整性 ---')
const rbCode = fs.readFileSync(path.join(projectRoot, 'utils/record-builder.js'), 'utf-8')
check('buildRecord 纯函数零 wx 依赖', !rbCode.includes('wx.') && !rbCode.includes('wx.cloud') && !rbCode.includes('wx.getStorage'), 'error')
check('使用 strict mode', rbCode.includes('\'use strict\'') || rbCode.includes('"use strict"'), 'warn')
// 数据联动关键不变量（变异测试对应点）
check('duration 下界 1（Math.max(1,...)）', rbCode.includes('Math.max(1, Math.round'), 'error')
check('photos 上限 9（slice(0, 9)）', rbCode.includes('.slice(0, 9)'), 'error')
check('feeling 截断 200（slice(0, 200)）', rbCode.includes('.slice(0, 200)'), 'error')
check('location 优先级 rd > ctx > null', rbCode.includes('isLocObj(rd.location)') && rbCode.includes('isLocObj(x.location)'), 'error')
check('isLocObj 排除数组', rbCode.includes('!Array.isArray(v)'), 'error')
check('同频扩展字段仅 isGroup=true 注入', rbCode.includes('if (rd.isGroup === true)'), 'error')
check('id 前缀 r_', rbCode.includes("'r_' + now"), 'error')
check('commandType 兜底 custom', rbCode.includes("'custom'"), 'error')
check('mood 兜底 calm', rbCode.includes("'calm'"), 'error')
check('filter 兜底 day', rbCode.includes("'day'"), 'error')
check('title 兜底 出逃记忆', rbCode.includes('出逃记忆'), 'error')
check('无 eval/Function 注入', !rbCode.includes('eval(') && !rbCode.includes('new Function('), 'error')

// ===== 3f. 完成流页面契约（escape-record + app 数据联动）=====
console.log('\n--- 3f. 完成流页面契约 ---')
const escapeRecordJs = fs.readFileSync(path.join(projectRoot, 'packageSync/pages/group/escape-record/escape-record.js'), 'utf-8')
check('escape-record 完成后跳 record 拍照打卡页', escapeRecordJs.includes("navigateTo({ url: '/pages/record/record' })"), 'error')
check('escape-record 完成流程不直接调 completeCommand（改由 record 页 onSave 触发）', !escapeRecordJs.includes('app.completeCommand'), 'error')
check('escape-record 不跳个人页', !escapeRecordJs.includes("switchTab({ url: '/pages/profile/profile' })"), 'error')
check('escape-record 构造 currentCommand', escapeRecordJs.includes('app.globalData.currentCommand'), 'error')
check('escape-record 传 isGroup:true', escapeRecordJs.includes('isGroup: true'), 'error')
check('escape-record 传 groupId', escapeRecordJs.includes('groupId:'), 'error')
check('escape-record 传 members/steps', escapeRecordJs.includes('members:') && escapeRecordJs.includes('steps:'), 'error')
const appJs = fs.readFileSync(path.join(projectRoot, 'app.js'), 'utf-8')
check('app.js 引入 record-builder', appJs.includes('require(\'./utils/record-builder.js\')'), 'error')
check('app.completeCommand 委托 buildRecord', appJs.includes('recordBuilder.buildRecord'), 'error')
check('app.completeCommand 写入 records', appJs.includes('records.unshift'), 'error')
check('app.completeCommand 更新连续天数', appJs.includes('updateContinuousDays'), 'error')
check('app.completeCommand 解锁徽章', appJs.includes('checkBadges'), 'error')

// ===== 3g. 进度持久化 + POI 指令体系契约 =====
console.log('\n--- 3g. 进度持久化 + POI 指令体系契约 ---')
const executionProgressMod = require('../../utils/execution-progress.js')
;['initProgress', 'markStepDone', 'mergeProgress', 'recompute', 'isAllDone'].forEach(fn => {
  check('executionProgress 导出: ' + fn, typeof executionProgressMod[fn] === 'function', 'error')
})
const epCode = fs.readFileSync(path.join(projectRoot, 'utils/execution-progress.js'), 'utf-8')
check('executionProgress 纯函数零 wx 依赖', !epCode.includes('wx.') && !epCode.includes('wx.cloud'), 'error')
check('executionProgress 使用 strict mode', epCode.includes('\'use strict\''), 'warn')
check('executionProgress 已完成不覆盖 completedAt', epCode.includes('steps[index].done') && epCode.includes('return progress'), 'error')
check('executionProgress 全完成 currentStep=最后一步', epCode.includes('steps.length - 1'), 'error')

const poiBuilderMod = require('../../utils/poi-command-builder.js')
;['buildCommands', 'buildOne', 'mapType', 'estimateDuration'].forEach(fn => {
  check('poiCommandBuilder 导出: ' + fn, typeof poiBuilderMod[fn] === 'function', 'error')
})
check('poiCommandBuilder._internal.POI_TYPE_MAP', !!poiBuilderMod._internal.POI_TYPE_MAP, 'error')
const pcbCode = fs.readFileSync(path.join(projectRoot, 'utils/poi-command-builder.js'), 'utf-8')
check('poiCommandBuilder 纯函数零 wx 依赖', !pcbCode.includes('wx.') && !pcbCode.includes('wx.cloud'), 'error')
check('poiCommandBuilder id 前缀 poi_', pcbCode.includes('\'poi_\''), 'error')
check('poiCommandBuilder requirePOI=null（不校验可达性）', pcbCode.includes('requirePOI: null'), 'error')
check('poiCommandBuilder 多样性保证 byType', pcbCode.includes('byType'), 'error')
check('poiCommandBuilder 上限 20 slice(0, 20)', pcbCode.includes('slice(0, 20)'), 'error')
check('poiCommandBuilder 排除 0,0 默认坐标', pcbCode.includes('lat === 0 && lng === 0'), 'error')

// app.json 定位授权（getLocation 是定位失败根因修复）
const appJson = JSON.parse(fs.readFileSync(path.join(projectRoot, 'app.json'), 'utf-8'))
check('app.json requiredPrivateInfos 含 getLocation', Array.isArray(appJson.requiredPrivateInfos) && appJson.requiredPrivateInfos.includes('getLocation'), 'error')
check('app.json requiredPrivateInfos 含 chooseLocation', appJson.requiredPrivateInfos.includes('chooseLocation'), 'error')

// executing.js 进度持久化
const executingJs = fs.readFileSync(path.join(projectRoot, 'pages/executing/executing.js'), 'utf-8')
check('executing.js require execution-progress', executingJs.includes('utils/execution-progress.js'), 'error')
check('executing.js 有 onHide 保存进度', executingJs.includes('onHide') && executingJs.includes('saveCurrentCommand'), 'error')
check('executing.js onLoad 恢复进度 mergeProgress', executingJs.includes('mergeProgress'), 'error')
check('executing.js onStepTap 持久化 markStepDone', executingJs.includes('markStepDone'), 'error')
check('executing.js 初始化 executionProgress initProgress', executingJs.includes('initProgress'), 'error')

// escape-record.js 同步持久化
const escapeRecordCode = fs.readFileSync(path.join(projectRoot, 'packageSync/pages/group/escape-record/escape-record.js'), 'utf-8')
check('escape-record require execution-progress', escapeRecordCode.includes('utils/execution-progress.js'), 'error')
check('escape-record 持久化 currentGroupScript', escapeRecordCode.includes('setStorageSync(\'currentGroupScript\''), 'error')
check('escape-record 完成后清理 storage', escapeRecordCode.includes('removeStorageSync(\'currentGroupScript\''), 'error')
check('escape-record 传 executionProgress 给 completeCommand', escapeRecordCode.includes('executionProgress:'), 'error')
check('escape-record applyScript 恢复进度 prevProgress', escapeRecordCode.includes('prevProgress'), 'error')

// app.js POI 指令体系
check('app.js require poi-command-builder', appJs.includes('utils/poi-command-builder.js'), 'error')
check('app.js 有 fetchNearbyPOI', appJs.includes('fetchNearbyPOI'), 'error')
check('app.js 有 injectPOICommands', appJs.includes('injectPOICommands'), 'error')
check('app.js checkLocation 调 fetchNearbyPOI', appJs.includes('this.fetchNearbyPOI'), 'error')
check('app.js completeCommand 自动注入 executionProgress', appJs.includes('rd.executionProgress') && appJs.includes('cmd.executionProgress'), 'error')
check('app.js completeCommand 注入 cmd.location', appJs.includes('cmd.location'), 'error')
check('app.js completeCommand 注入同频字段（injectGroupFields）', appJs.includes('injectGroupFields'), 'error')
check('record-builder 导出 injectGroupFields', rbCode.includes('injectGroupFields'), 'error')

// map.js 去北京硬编码
const mapJs = fs.readFileSync(path.join(projectRoot, 'pages/map/map.js'), 'utf-8')
check('map.js 无北京硬编码 39.9042', !mapJs.includes('39.9042'), 'error')
check('map.js 有 hasLocation 空状态标记', mapJs.includes('hasLocation'), 'error')
check('map.js 有 locateIfAvailable', mapJs.includes('locateIfAvailable'), 'error')

// record-builder 留痕扩展
check('record-builder 有 buildTracedSteps', rbCode.includes('buildTracedSteps'), 'error')
check('record-builder 有 executionProgress 处理', rbCode.includes('executionProgress'), 'error')
check('recordBuilder._internal.buildTracedSteps 导出', typeof recordBuilder._internal.buildTracedSteps === 'function', 'error')

// 云函数 poiSearch
const poiSearchCode = fs.readFileSync(path.join(projectRoot, 'cloudfunctions/poiSearch/index.js'), 'utf-8')
check('poiSearch 读 TENCENT_MAP_KEY 环境变量', poiSearchCode.includes('process.env.TENCENT_MAP_KEY'), 'error')
check('poiSearch 无 key 返回 NO_MAP_KEY', poiSearchCode.includes('NO_MAP_KEY'), 'error')
check('poiSearch 逆地理 geocoder', poiSearchCode.includes('geocoder/v1'), 'error')
check('poiSearch 周边搜索 explore', poiSearchCode.includes('place/v1/explore'), 'error')
check('poiSearch 无 eval/Function 注入', !poiSearchCode.includes('eval(') && !poiSearchCode.includes('new Function('), 'error')

// ===== 4. 包体红线检查 =====
console.log('\n--- 4. 包体红线 ---')
function getDirSize(dirPath) {
  let total = 0
  if (!fs.existsSync(dirPath)) return 0
  const items = fs.readdirSync(dirPath)
  for (const item of items) {
    const fullPath = path.join(dirPath, item)
    const stat = fs.statSync(fullPath)
    if (stat.isDirectory()) {
      total += getDirSize(fullPath)
    } else {
      total += stat.size
    }
  }
  return total
}

// 检查新增资源文件
const newAssetsDir = path.join(projectRoot, 'assets')
let hasNewLargeFile = false
function checkLargeFiles(dirPath, threshold) {
  if (!fs.existsSync(dirPath)) return
  const items = fs.readdirSync(dirPath)
  for (const item of items) {
    const fullPath = path.join(dirPath, item)
    const stat = fs.statSync(fullPath)
    if (stat.isDirectory()) {
      checkLargeFiles(fullPath, threshold)
    } else if (stat.size > threshold) {
      console.log('    大文件: ' + path.relative(projectRoot, fullPath) + ' (' + Math.round(stat.size / 1024) + 'KB)')
    }
  }
}
checkLargeFiles(path.join(projectRoot, 'assets'), 200 * 1024)

// ===== 5. 代码质量检查 =====
console.log('\n--- 5. 代码质量 ---')

// 检查 room.js 是否有 onShareAppMessage
const roomJs = fs.readFileSync(path.join(projectRoot, 'packageSync/pages/group/room/room.js'), 'utf-8')
check('room.js 有 onShareAppMessage (C-02)', roomJs.includes('onShareAppMessage'), 'error')
check('room.js 有 USE_LOCAL_MODE 开关', roomJs.includes('USE_LOCAL_MODE'), 'warn')
check('room.js 有 applyMockMemberView (C-02)', roomJs.includes('applyMockMemberView'), 'error')
check('room.js 有 onAddMockMember (C-03)', roomJs.includes('onAddMockMember'), 'error')
check('room.js 有 onSubmitPreference (C-04)', roomJs.includes('onSubmitPreference'), 'error')
check('room.js 有 doVote (C-05/06/07)', roomJs.includes('doVote'), 'error')
check('room.js 有 onGenerateScript (C-08)', roomJs.includes('onGenerateScript'), 'error')
check('room.js 有 onCancelTap (C-01)', roomJs.includes('onCancelTap'), 'error')

// 检查 room.wxml 是否有阶段渲染
const roomWxml = fs.readFileSync(path.join(projectRoot, 'packageSync/pages/group/room/room.wxml'), 'utf-8')
check('wxml 有 waiting_members 阶段', roomWxml.includes("status === 'waiting_members'"), 'error')
check('wxml 有 voting 阶段', roomWxml.includes("status === 'voting'"), 'error')
check('wxml 有 finished 阶段', roomWxml.includes("status === 'finished'"), 'error')
// 项目记忆：未认证微信个人小程序不支持 open-type="share"，改用邀请弹窗
check('wxml 有邀请弹窗 (C-02)', roomWxml.includes('invitePopup') || roomWxml.includes('invite-popup') || roomWxml.includes('showInvite'), 'error')
check('wxml 有成员位渲染 (C-03)', roomWxml.includes('memberSlots'), 'error')
check('wxml 有偏好选择 (C-04)', roomWxml.includes('preferenceOptions'), 'error')
check('wxml 有投票卡片 (C-05/06/07)', roomWxml.includes('voteOptions'), 'error')
check('wxml 有剧本展示 (C-08)', roomWxml.includes('script-title'), 'error')
check('wxml 有自定义导航栏', roomWxml.includes('nav-header'), 'error')

// 检查 store.js 代码质量（storeJs 在 3a 节已定义）
check('store.js 有状态机常量', storeJs.includes('ROOM_STATUS'), 'error')
check('store.js 有剧本模板库', storeJs.includes('SCRIPT_TEMPLATES'), 'error')
check('store.js 有错误码', storeJs.includes('errCode'), 'error')
check('store.js 有 touchRoom 时间戳更新', storeJs.includes('touchRoom'), 'warn')
check('store.js 剧本模板 >= 5 个', (storeJs.match(/match:\s*{/g) || []).length >= 5, 'warn')

// 检查 generator-engine.js 代码质量（B-01~B-06）
check('engine.js 有 B-01 type→face 映射', engineCode.includes('TYPE_FACE_MAP'), 'error')
check('engine.js 有 B-02 加载文案库', engineCode.includes('LOADING_COPIES'), 'error')
check('engine.js 有 B-03 条件过滤', engineCode.includes('filterByConditions'), 'error')
check('engine.js 有 B-04 营业时间', engineCode.includes('POI_HOURS') && engineCode.includes('filterByBusinessHours'), 'error')
check('engine.js 有 B-05 安全风险', engineCode.includes('filterBySafety') && engineCode.includes('nightSafe'), 'error')
check('engine.js 有 B-06 兜底任务', engineCode.includes('FALLBACK_COMMANDS') && engineCode.includes('getFallbackCommands'), 'error')
check('engine.js 有 normalizeCtx 防御性归一化', engineCode.includes('normalizeCtx'), 'error')
check('engine.js 有 pickWeighted 偏好加权', engineCode.includes('pickWeighted'), 'error')
check('engine.js 半开区间营业时间', engineCode.includes('h >= window[0] && h < window[1]'), 'error')
check('engine.js 兜底链含 fallback 标记', engineCode.includes('fallback: true'), 'error')
check('engine.js 无 eval/Function 注入', !engineCode.includes('eval(') && !engineCode.includes('new Function('), 'error')

// ===== 6. 安全性检查 =====
console.log('\n--- 6. 安全性 ---')
check('无硬编码密钥', !roomJs.includes('secret') && !roomJs.includes('password'), 'warn')
check('无 eval() 调用', !storeJs.includes('eval('), 'error')
check('无 new Function() 调用', !storeJs.includes('new Function('), 'error')

// ===== 7. 状态机完整性 =====
console.log('\n--- 7. 状态机完整性 ---')
const validStatuses = ['waiting_members', 'voting', 'generating', 'finished', 'cancelled']
validStatuses.forEach(status => {
  check('状态值存在: ' + status, storeJs.includes(status) || roomJs.includes(status), 'warn')
})

// ===== 8. C-P4 社交增强契约完整性（信任分 + 聊天 + 评价 + 举报）=====
console.log('\n--- 8. C-P4 社交增强契约 ---')

// 8a. trust-score.js 纯函数 + 常量
check('C-P4 trust-score.js 存在', fs.existsSync(path.join(projectRoot, 'packageSync/utils/trust-score.js')), 'error')
const trustScoreMod = require('../../packageSync/utils/trust-score.js')
;['computeTrustScore', 'tierFromScore', 'getTierWeight', 'getTierLabel', 'isValidReview'].forEach(fn => {
  check('C-P4 trust-score 导出: ' + fn, typeof trustScoreMod[fn] === 'function', 'error')
})
check('C-P4 trust-score 导出 TRUST_TIER_WEIGHT', !!trustScoreMod.TRUST_TIER_WEIGHT, 'error')
check('C-P4 trust-score 导出 DEFAULT_TRUST', !!trustScoreMod.DEFAULT_TRUST, 'error')
check('C-P4 trust-score 导出 TIER_LABELS', !!trustScoreMod.TIER_LABELS, 'error')
check('C-P4 TRUST_TIER_WEIGHT 含 5 tier', Object.keys(trustScoreMod.TRUST_TIER_WEIGHT).length === 5, 'error')
check('C-P4 gold 权重 1.2', trustScoreMod.TRUST_TIER_WEIGHT.gold === 1.2, 'error')
check('C-P4 watch 权重 0.3', trustScoreMod.TRUST_TIER_WEIGHT.watch === 0.3, 'error')
check('C-P4 newbie 权重 0.8', trustScoreMod.TRUST_TIER_WEIGHT.newbie === 0.8, 'error')
check('C-P4 DEFAULT_TRUST score 5.0', trustScoreMod.DEFAULT_TRUST.score === 5.0, 'error')
check('C-P4 DEFAULT_TRUST tier newbie', trustScoreMod.DEFAULT_TRUST.tier === 'newbie', 'error')
check('C-P4 TIER_LABELS 5 项', Object.keys(trustScoreMod.TIER_LABELS).length === 5, 'error')
const trustScoreJs = fs.readFileSync(path.join(projectRoot, 'packageSync/utils/trust-score.js'), 'utf-8')
check('C-P4 trust-score 纯函数零 wx 依赖', !trustScoreJs.includes('wx.') && !trustScoreJs.includes('wx.cloud'), 'error')
check('C-P4 trust-score 使用 strict mode', trustScoreJs.includes('use strict'), 'warn')
check('C-P4 trust-score 无 eval/Function 注入', !trustScoreJs.includes('eval(') && !trustScoreJs.includes('new Function('), 'error')
// 分级规则契约（spec ADDED Requirements）
check('C-P4 gold 需 count>=10 且 avg>=4.8', trustScoreJs.includes('avg >= 4.8 && count >= 10'), 'error')
check('C-P4 watch 需 avg < 3.0', trustScoreJs.includes('avg < 3.0'), 'error')
check('C-P4 非法 rating 按 5 处理', trustScoreJs.includes('sum += 5'), 'error')
check('C-P4 score 保留一位小数', trustScoreJs.includes('Math.round(avg * 10) / 10'), 'error')
check('C-P4 count<3 返回 newbie', trustScoreJs.includes('count < 3'), 'error')

// 8b. player-trust-store.js 数据层
check('C-P4 player-trust-store.js 存在', fs.existsSync(path.join(projectRoot, 'packageSync/utils/player-trust-store.js')), 'error')
const trustStore = require('../../packageSync/utils/player-trust-store.js')
;['submitReview', 'getTrust', 'getTrustBatch', 'reportPlayer', 'getCachedTrust', 'setCachedTrust', 'clearTrustCache', 'buildReviewDoc'].forEach(fn => {
  check('C-P4 player-trust-store 导出: ' + fn, typeof trustStore[fn] === 'function', 'error')
})
check('C-P4 player-trust-store 导出 CACHE_KEY', typeof trustStore.CACHE_KEY === 'string', 'error')
check('C-P4 player-trust-store 导出 CLOUD_TIMEOUT', typeof trustStore.CLOUD_TIMEOUT === 'number', 'error')
const trustStoreJs = fs.readFileSync(path.join(projectRoot, 'packageSync/utils/player-trust-store.js'), 'utf-8')
check('C-P4 player-trust-store submitReview 降级 CLOUD_OFFLINE', trustStoreJs.includes("'CLOUD_OFFLINE'"), 'error')
check('C-P4 player-trust-store submitReview 超时 CLOUD_TIMEOUT', trustStoreJs.includes("'CLOUD_TIMEOUT'"), 'error')
check('C-P4 player-trust-store submitReview 云异常 CLOUD_ERROR', trustStoreJs.includes("'CLOUD_ERROR'"), 'error')
check('C-P4 player-trust-store getTrustBatch 截断 20', trustStoreJs.includes('ids.length < 20'), 'error')
check('C-P4 player-trust-store reportPlayer 空 openId INVALID_PARAM', trustStoreJs.includes("'INVALID_PARAM'"), 'error')
check('C-P4 player-trust-store buildReviewDoc comment 截断 100', trustStoreJs.includes('.slice(0, 100)'), 'error')
check('C-P4 player-trust-store buildReviewDoc tags 上限 5', trustStoreJs.includes('.slice(0, 5)'), 'error')
check('C-P4 player-trust-store 调用 submitPlayerReview 云函数', trustStoreJs.includes("'submitPlayerReview'"), 'error')
check('C-P4 player-trust-store 调用 getPlayerTrust 云函数', trustStoreJs.includes("'getPlayerTrust'"), 'error')
check('C-P4 player-trust-store 调用 reportPlayer 云函数', trustStoreJs.includes("'reportPlayer'"), 'error')
check('C-P4 player-trust-store 成功后缓存信任分 setCachedTrust', trustStoreJs.includes('setCachedTrust(doc.targetOpenId'), 'error')

// 8c. chat-store.js 聊天数据层
check('C-P4 chat-store.js 存在', fs.existsSync(path.join(projectRoot, 'packageSync/utils/chat-store.js')), 'error')
const chatStoreMod = require('../../packageSync/utils/chat-store.js')
;['sendMessage', 'fetchNewMessages', 'startPolling', 'stopPolling', 'loadMessages', 'saveMessages', 'dedupMessages', 'validateContent', 'buildMessageDoc', 'makeOptimisticId'].forEach(fn => {
  check('C-P4 chat-store 导出: ' + fn, typeof chatStoreMod[fn] === 'function', 'error')
})
check('C-P4 chat-store 导出 POLL_INTERVAL', typeof chatStoreMod.POLL_INTERVAL === 'number', 'error')
check('C-P4 chat-store POLL_INTERVAL 为 2500ms', chatStoreMod.POLL_INTERVAL === 2500, 'error')
check('C-P4 chat-store 导出 MAX_CONTENT_LEN', chatStoreMod.MAX_CONTENT_LEN === 200, 'error')
check('C-P4 chat-store 导出 PAGE_SIZE', chatStoreMod.PAGE_SIZE === 50, 'error')
check('C-P4 chat-store 导出 _rollbackOptimistic（测试辅助）', typeof chatStoreMod._rollbackOptimistic === 'function', 'error')
check('C-P4 chat-store 导出 _getPollingState（测试辅助）', typeof chatStoreMod._getPollingState === 'function', 'error')
const chatStoreJs = fs.readFileSync(path.join(projectRoot, 'packageSync/utils/chat-store.js'), 'utf-8')
check('C-P4 chat-store validateContent 超长拒绝', chatStoreJs.includes('MAX_CONTENT_LEN'), 'error')
check('C-P4 chat-store sendMessage 乐观更新 isLocal', chatStoreJs.includes('isLocal: true') && chatStoreJs.includes('status: \'pending\''), 'error')
check('C-P4 chat-store sendMessage 失败回滚 rollbackOptimistic', chatStoreJs.includes('rollbackOptimistic(roomId, optimisticId)'), 'error')
check('C-P4 chat-store sendMessage 降级 local_only', chatStoreJs.includes("'local_only'"), 'error')
check('C-P4 chat-store dedupMessages 按 createdAt 升序', chatStoreJs.includes('ca - cb'), 'error')
check('C-P4 chat-store dedupMessages 乐观消息替换 replaceKey', chatStoreJs.includes('replaceKey'), 'error')
check('C-P4 chat-store startPolling 已有轮询先停', chatStoreJs.includes('stopPolling()') && chatStoreJs.includes('pollingRoomId = roomId'), 'error')
check('C-P4 chat-store 调用 sendMessage 云函数', chatStoreJs.includes("name: 'sendMessage'"), 'error')
check('C-P4 chat-store 调用 fetchMessages 云函数', chatStoreJs.includes("name: 'fetchMessages'"), 'error')
check('C-P4 chat-store 无 eval/Function 注入', !chatStoreJs.includes('eval(') && !chatStoreJs.includes('new Function('), 'error')

// 8d. player-matcher trust 权重集成
const playerMatcherJs = fs.readFileSync(path.join(projectRoot, 'packageSync/utils/player-matcher.js'), 'utf-8')
check('C-P4 player-matcher 引入 trust-score', playerMatcherJs.includes('trust-score'), 'error')
check('C-P4 player-matcher rankByRelevance 使用 trustMap', playerMatcherJs.includes('trustMap'), 'error')
check('C-P4 player-matcher watch 玩家降级队尾', playerMatcherJs.includes("tier === 'watch'") || playerMatcherJs.includes("'watch'"), 'error')
check('C-P4 player-matcher getTierWeight 调用', playerMatcherJs.includes('getTierWeight'), 'error')

// 8e. 云函数存在性 + 契约
;['sendMessage', 'fetchMessages', 'submitPlayerReview', 'getPlayerTrust', 'reportPlayer'].forEach(cf => {
  check('C-P4 云函数存在: ' + cf, fs.existsSync(path.join(projectRoot, 'cloudfunctions/' + cf + '/index.js')), 'error')
})
const sendMessageCode = fs.readFileSync(path.join(projectRoot, 'cloudfunctions/sendMessage/index.js'), 'utf-8')
check('C-P4 sendMessage 取 OPENID 上下文', sendMessageCode.includes('OPENID'), 'error')
check('C-P4 sendMessage 内容长度校验 200', sendMessageCode.includes('200'), 'error')
const fetchMessagesCode = fs.readFileSync(path.join(projectRoot, 'cloudfunctions/fetchMessages/index.js'), 'utf-8')
check('C-P4 fetchMessages 按 roomId 过滤', fetchMessagesCode.includes('roomId'), 'error')
check('C-P4 fetchMessages 按 lastCreatedAt 增量', fetchMessagesCode.includes('lastCreatedAt'), 'error')
const submitReviewCode = fs.readFileSync(path.join(projectRoot, 'cloudfunctions/submitPlayerReview/index.js'), 'utf-8')
check('C-P4 submitPlayerReview rating 整数校验', submitReviewCode.includes('Number.isInteger'), 'error')
check('C-P4 submitPlayerReview 防自评 SELF_REVIEW_FORBIDDEN', submitReviewCode.includes('SELF_REVIEW_FORBIDDEN'), 'error')
check('C-P4 submitPlayerReview 防重复 ALREADY_REVIEWED', submitReviewCode.includes('ALREADY_REVIEWED'), 'error')
const getPlayerTrustCode = fs.readFileSync(path.join(projectRoot, 'cloudfunctions/getPlayerTrust/index.js'), 'utf-8')
check('C-P4 getPlayerTrust 调 computeTrustScore', getPlayerTrustCode.includes('computeTrustScore'), 'error')
check('C-P4 getPlayerTrust 批量截断', getPlayerTrustCode.includes('MAX_BATCH') || getPlayerTrustCode.includes('20'), 'error')
const reportPlayerCode = fs.readFileSync(path.join(projectRoot, 'cloudfunctions/reportPlayer/index.js'), 'utf-8')
check('C-P4 reportPlayer 累计 3 次标记 flagged', reportPlayerCode.includes('3') && reportPlayerCode.includes('flagged'), 'error')
check('C-P4 reportPlayer 防重复 ALREADY_REPORTED', reportPlayerCode.includes('ALREADY_REPORTED'), 'error')

// 8f. room 页面 Tab + 聊天 + 评价 UI 集成
const roomJsCp4 = fs.readFileSync(path.join(projectRoot, 'packageSync/pages/group/room/room.js'), 'utf-8')
const roomWxmlCp4 = fs.readFileSync(path.join(projectRoot, 'packageSync/pages/group/room/room.wxml'), 'utf-8')
check('C-P4 room.js 导入 chat-store', roomJsCp4.includes('chat-store'), 'error')
check('C-P4 room.js 导入 player-trust-store', roomJsCp4.includes('player-trust-store'), 'error')
check('C-P4 room.js 含 activeTab 状态', roomJsCp4.includes('activeTab'), 'error')
check('C-P4 room.js 含 onTabTap 切换', roomJsCp4.includes('onTabTap'), 'error')
check('C-P4 room.js 含 onSendTap 发送', roomJsCp4.includes('onSendTap'), 'error')
check('C-P4 room.js 含 refreshChatState', roomJsCp4.includes('refreshChatState'), 'error')
check('C-P4 room.js 含 loadMemberTrust', roomJsCp4.includes('loadMemberTrust'), 'error')
check('C-P4 room.js 含 showReviewModal', roomJsCp4.includes('showReviewModal'), 'error')
check('C-P4 room.js 调 chatStore.startPolling', roomJsCp4.includes('chatStore.startPolling'), 'error')
check('C-P4 room.js onHide 调 chatStore.stopPolling', roomJsCp4.includes('chatStore.stopPolling'), 'error')
check('C-P4 room.wxml 含 Tab 切换区', roomWxmlCp4.includes('cp4-tab') || roomWxmlCp4.includes('tab-bar'), 'warn')
check('C-P4 room.wxml 含聊天面板', roomWxmlCp4.includes('chat'), 'warn')
check('C-P4 room.wxml 含评价弹窗', roomWxmlCp4.includes('review') || roomWxmlCp4.includes('cp4-modal'), 'warn')

// 8g. hall / detail 信任标签展示
const hallJsCp4 = fs.readFileSync(path.join(projectRoot, 'packageSync/pages/group/hall/hall.js'), 'utf-8')
const hallWxmlCp4 = fs.readFileSync(path.join(projectRoot, 'packageSync/pages/group/hall/hall.wxml'), 'utf-8')
check('C-P4 hall.js 导入 player-trust-store', hallJsCp4.includes('player-trust-store'), 'error')
check('C-P4 hall.js 含 loadMatchPartnerTrust', hallJsCp4.includes('loadMatchPartnerTrust'), 'error')
check('C-P4 hall.js 含 matchPartnerTrustMap', hallJsCp4.includes('matchPartnerTrustMap'), 'error')
check('C-P4 hall.wxml 含信任标签 partner-trust-tag', hallWxmlCp4.includes('partner-trust-tag') || hallWxmlCp4.includes('trust-tag'), 'warn')
const detailJsCp4 = fs.readFileSync(path.join(projectRoot, 'packageSync/pages/group/hall/detail/detail.js'), 'utf-8')
const detailWxmlCp4 = fs.readFileSync(path.join(projectRoot, 'packageSync/pages/group/hall/detail/detail.wxml'), 'utf-8')
check('C-P4 detail.js 导入 player-trust-store', detailJsCp4.includes('player-trust-store'), 'error')
check('C-P4 detail.js 含 loadMemberTrust', detailJsCp4.includes('loadMemberTrust'), 'error')
check('C-P4 detail.js 含 memberTrustMap', detailJsCp4.includes('memberTrustMap'), 'error')
check('C-P4 detail.wxml 含成员信任标签', detailWxmlCp4.includes('member-trust-tag') || detailWxmlCp4.includes('trust'), 'warn')

// 8h. 测试套件存在性
;[
  'tests/unit/trust-score.test.js',
  'tests/unit/player-trust-store.test.js',
  'tests/unit/chat-store.test.js',
  'tests/gherkin/c-p4-social.feature',
  'tests/property/chat-trust-property.test.js',
  'tests/adversarial/chat-trust-attack.test.js'
].forEach(tf => {
  check('C-P4 测试文件存在: ' + tf, fs.existsSync(path.join(projectRoot, tf)), 'error')
})

// ===== 结果 =====
console.log('\n' + '='.repeat(50))
console.log(`QA 检查结果: ${checks} checks, ${passed} passed, ${warnings} warnings, ${errors} errors`)
console.log('='.repeat(50))
process.exit(errors > 0 ? 1 : 0)
