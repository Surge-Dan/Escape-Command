// tests/mutation/mutation-test.js
// 变异测试：对 group-room-store.js 注入变异，验证测试是否能捕获
// 运行: node tests/mutation/mutation-test.js

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

const projectRoot = path.resolve(__dirname, '..', '..')
const storePath = path.join(projectRoot, 'utils', 'group-room-store.js')
const originalCode = fs.readFileSync(storePath, 'utf-8')

// ===== 变异算子定义 =====
const mutations = [
  {
    name: 'M1: createRoom 主题长度判断 > 改为 >=',
    find: 't.length > 20',
    replace: 't.length >= 20',
    expectKilled: true
  },
  {
    name: 'M2: createRoom 人数下限 < 改为 <=',
    find: 'maxMembers < 3',
    replace: 'maxMembers <= 3',
    expectKilled: true
  },
  {
    name: 'M3: createRoom 人数上限 > 改为 >=',
    find: 'maxMembers > 6',
    replace: 'maxMembers >= 6',
    expectKilled: true
  },
  {
    name: 'M4: generateRoomId 长度 6 改为 5',
    find: 'i < 6; i++',
    replace: 'i < 5; i++',
    expectKilled: true
  },
  {
    name: 'M5: 满员判断 >= 改为 >',
    find: 'room.members.length >= room.maxMembers',
    replace: 'room.members.length > room.maxMembers',
    expectKilled: true
  },
  {
    name: 'M6: submitVote 类型检查 includes 改为 excludes',
    find: "['time', 'budget', 'style'].includes(voteType)",
    replace: "!['time', 'budget', 'style'].includes(voteType)",
    expectKilled: true
  },
  {
    name: 'M7: getMostFrequent 空数组返回 null 改为返回 undefined',
    find: 'if (!arr || arr.length === 0) return null',
    replace: 'if (!arr || arr.length === 0) return undefined',
    expectKilled: true
  },
  {
    name: 'M8: generateScript 完成状态 FINISHED 改为 VOTING',
    find: 'room.status = ROOM_STATUS.FINISHED',
    replace: 'room.status = ROOM_STATUS.VOTING',
    expectKilled: true
  }
]

let totalMutations = 0
let killedMutations = 0
let survivedMutations = 0
const results = []

console.log('\n' + '='.repeat(50))
console.log('变异测试：group-room-store.js')
console.log('='.repeat(50))

for (const mutation of mutations) {
  totalMutations++

  // 检查原始代码是否包含目标字符串
  if (!originalCode.includes(mutation.find)) {
    console.log(`\n  ⚠ ${mutation.name}: 目标代码不存在，跳过`)
    results.push({ name: mutation.name, status: 'skip' })
    continue
  }

  // 处理 firstOnly（只替换第一个匹配）
  let mutatedCode
  if (mutation.firstOnly) {
    mutatedCode = originalCode.replace(mutation.find, mutation.replace)
  } else {
    mutatedCode = originalCode.split(mutation.find).join(mutation.replace)
  }

  // 写入变异后的代码
  fs.writeFileSync(storePath, mutatedCode)

  // 运行单元测试
  let testPassed = false
  try {
    execSync('node tests/unit/store.test.js', {
      cwd: projectRoot,
      stdio: 'pipe',
      timeout: 30000
    })
    testPassed = true  // 测试通过 = 变异存活
  } catch (e) {
    testPassed = false  // 测试失败 = 变异被杀
  }

  // 恢复原始代码
  fs.writeFileSync(storePath, originalCode)

  if (!testPassed) {
    killedMutations++
    console.log(`  ✓ KILLED: ${mutation.name}`)
    results.push({ name: mutation.name, status: 'killed' })
  } else {
    survivedMutations++
    console.log(`  ✗ SURVIVED: ${mutation.name}`)
    results.push({ name: mutation.name, status: 'survived' })
  }
}

// ===== 结果 =====
const mutationScore = totalMutations > 0 ? (killedMutations / totalMutations * 100).toFixed(1) : 0
console.log('\n' + '='.repeat(50))
console.log(`变异测试结果: ${totalMutations} mutations, ${killedMutations} killed, ${survivedMutations} survived`)
console.log(`变异分数 (Mutation Score): ${mutationScore}%`)
console.log('='.repeat(50))

// 变异分数 > 70% 算通过
process.exit(survivedMutations > totalMutations * 0.3 ? 1 : 0)
