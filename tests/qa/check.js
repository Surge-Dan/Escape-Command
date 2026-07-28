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
  'pages/group/create/create.js',
  'pages/group/create/create.wxml',
  'pages/group/create/create.wxss',
  'pages/group/room/room.js',
  'pages/group/room/room.wxml',
  'pages/group/room/room.wxss'
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
  check('导出函数: ' + fn, typeof store[fn] === 'function', 'error')
})

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
check('wxml 有 open-type=share 邀请按钮 (C-02)', roomWxml.includes('open-type="share"'), 'error')
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
