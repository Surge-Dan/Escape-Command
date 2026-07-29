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
  'utils/group-room-store.js',
  'utils/generator-engine.js',
  'utils/record-builder.js',
  'utils/execution-progress.js',
  'utils/poi-command-builder.js',
  'cloudfunctions/poiSearch/index.js',
  'cloudfunctions/poiSearch/package.json',
  'pages/group/create/create.js',
  'pages/group/create/create.wxml',
  'pages/group/create/create.wxss',
  'pages/group/room/room.js',
  'pages/group/room/room.wxml',
  'pages/group/room/room.wxss',
  'pages/group/escape-record/escape-record.js',
  'pages/group/escape-record/escape-record.wxml'
]
requiredFiles.forEach(f => {
  check('文件存在: ' + f, fs.existsSync(path.join(projectRoot, f)), 'error')
})

// ===== 2. 数据层函数完整性 =====
console.log('\n--- 2. 数据层函数完整性 ---')
const wx = require('../mock-wx.js')
global.wx = wx
const store = require('../../utils/group-room-store.js')
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

// ===== 3b. generator-engine 常量完整性（B-01~B-06）=====
console.log('\n--- 3b. generator-engine 常量完整性 ---')
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

// ===== 3c. record-builder 契约完整性（完成流数据联动）=====
console.log('\n--- 3c. record-builder 契约完整性 ---')
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

// ===== 3d. 完成流页面契约（escape-record + app 数据联动）=====
console.log('\n--- 3d. 完成流页面契约 ---')
const escapeRecordJs = fs.readFileSync(path.join(projectRoot, 'pages/group/escape-record/escape-record.js'), 'utf-8')
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

// ===== 3e. 进度持久化 + POI 指令体系契约 =====
console.log('\n--- 3e. 进度持久化 + POI 指令体系契约 ---')
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
const escapeRecordCode = fs.readFileSync(path.join(projectRoot, 'pages/group/escape-record/escape-record.js'), 'utf-8')
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
const roomJs = fs.readFileSync(path.join(projectRoot, 'pages/group/room/room.js'), 'utf-8')
check('room.js 有 onShareAppMessage (C-02)', roomJs.includes('onShareAppMessage'), 'error')
check('room.js 有 USE_LOCAL_MODE 开关', roomJs.includes('USE_LOCAL_MODE'), 'warn')
check('room.js 有 applyMockMemberView (C-02)', roomJs.includes('applyMockMemberView'), 'error')
check('room.js 有 onAddMockMember (C-03)', roomJs.includes('onAddMockMember'), 'error')
check('room.js 有 onSubmitPreference (C-04)', roomJs.includes('onSubmitPreference'), 'error')
check('room.js 有 doVote (C-05/06/07)', roomJs.includes('doVote'), 'error')
check('room.js 有 onGenerateScript (C-08)', roomJs.includes('onGenerateScript'), 'error')
check('room.js 有 onCancelTap (C-01)', roomJs.includes('onCancelTap'), 'error')

// 检查 room.wxml 是否有阶段渲染
const roomWxml = fs.readFileSync(path.join(projectRoot, 'pages/group/room/room.wxml'), 'utf-8')
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

// 检查 store.js 代码质量
const storeJs = fs.readFileSync(path.join(projectRoot, 'utils/group-room-store.js'), 'utf-8')
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

// ===== 结果 =====
console.log('\n' + '='.repeat(50))
console.log(`QA 检查结果: ${checks} checks, ${passed} passed, ${warnings} warnings, ${errors} errors`)
console.log('='.repeat(50))
process.exit(errors > 0 ? 1 : 0)
