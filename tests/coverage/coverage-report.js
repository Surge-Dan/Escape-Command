// tests/coverage/coverage-report.js
// 覆盖率报告：统计 group-room-store.js 的函数级覆盖率
// 运行: node tests/coverage/coverage-report.js

const fs = require('fs')
const path = require('path')

const projectRoot = path.resolve(__dirname, '..', '..')
const storePath = path.join(projectRoot, 'utils', 'group-room-store.js')
const storeCode = fs.readFileSync(storePath, 'utf-8')

// ===== 提取所有导出的函数名 =====
const exportMatch = storeCode.match(/module\.exports\s*=\s*\{([^}]+)\}/)
const exportedNames = []
if (exportMatch) {
  const lines = exportMatch[1].split(',')
  lines.forEach(line => {
    const name = line.trim().split('//')[0].trim()
    if (name && !name.startsWith('//') && name !== '_internal') {
      exportedNames.push(name)
    }
  })
}

// ===== 提取所有 function 定义 =====
const functionRegex = /function\s+(\w+)\s*\(/g
const internalFunctions = []
let match
while ((match = functionRegex.exec(storeCode)) !== null) {
  internalFunctions.push(match[1])
}

// ===== 提取 _internal 导出的函数 =====
const internalMatch = storeCode.match(/_internal:\s*\{([^}]+)\}/)
const internalExported = []
if (internalMatch) {
  const parts = internalMatch[1].split(',')
  parts.forEach(p => {
    const name = p.trim().split('//')[0].trim()
    if (name) internalExported.push(name)
  })
}

// ===== 从测试文件中检查哪些函数被调用 =====
const testFiles = [
  'tests/unit/store.test.js',
  'tests/gherkin/runner.js',
  'tests/qa/check.js'
]
let allTestCode = ''
testFiles.forEach(f => {
  const fullPath = path.join(projectRoot, f)
  if (fs.existsSync(fullPath)) {
    allTestCode += fs.readFileSync(fullPath, 'utf-8') + '\n'
  }
})

// ===== 计算函数级覆盖率 =====
const allFunctions = [...exportedNames, ...internalExported]
const coveredFunctions = []
const uncoveredFunctions = []

for (const fn of allFunctions) {
  // 检查测试代码中是否有调用 store.fn 或 result.fn
  const patterns = [
    `store.${fn}`,
    `store._internal.${fn}`,
    `.${fn}(`
  ]
  const isCovered = patterns.some(p => allTestCode.includes(p))
  if (isCovered) {
    coveredFunctions.push(fn)
  } else {
    uncoveredFunctions.push(fn)
  }
}

// ===== 计算行级覆盖率（粗略）=====
const codeLines = storeCode.split('\n')
let executableLines = 0
let coveredLines = 0

for (let i = 0; i < codeLines.length; i++) {
  const line = codeLines[i].trim()
  // 跳过空行、注释、纯大括号
  if (!line || line.startsWith('//') || line.startsWith('/*') || line.startsWith('*') ||
      line === '{' || line === '}' || line === '},' || line.startsWith('module.exports')) {
    continue
  }
  executableLines++
  // 粗略判断：如果测试代码中包含该行的关键标识符
  const identifiers = line.match(/\b(\w+)\b/g) || []
  const hasMatch = identifiers.some(id => id.length > 3 && allTestCode.includes(id))
  if (hasMatch) coveredLines++
}

const functionCoverage = allFunctions.length > 0
  ? (coveredFunctions.length / allFunctions.length * 100).toFixed(1)
  : 0
const lineCoverage = executableLines > 0
  ? (coveredLines / executableLines * 100).toFixed(1)
  : 0

// ===== 输出报告 =====
console.log('\n' + '='.repeat(50))
console.log('覆盖率报告：group-room-store.js')
console.log('='.repeat(50))

console.log('\n--- 函数级覆盖率 ---')
console.log(`已覆盖: ${coveredFunctions.length} / ${allFunctions.length} (${functionCoverage}%)`)
console.log('\n已覆盖函数:')
coveredFunctions.forEach(fn => console.log('  ✓ ' + fn))
if (uncoveredFunctions.length > 0) {
  console.log('\n未覆盖函数:')
  uncoveredFunctions.forEach(fn => console.log('  ✗ ' + fn))
}

console.log('\n--- 行级覆盖率（粗略）---')
console.log(`已覆盖: ${coveredLines} / ${executableLines} (${lineCoverage}%)`)

console.log('\n--- 代码统计 ---')
console.log(`总行数: ${codeLines.length}`)
console.log(`可执行行: ${executableLines}`)
console.log(`函数总数: ${allFunctions.length}`)
console.log(`内部函数: ${internalFunctions.length}`)

console.log('\n' + '='.repeat(50))
const pass = parseFloat(functionCoverage) >= 80 && parseFloat(lineCoverage) >= 60
console.log(`覆盖率结论: ${pass ? 'PASS ✓' : 'FAIL ✗'}`)
console.log(`  函数覆盖 ${functionCoverage}% (要求 >= 80%)`)
console.log(`  行覆盖 ${lineCoverage}% (要求 >= 60%)`)
console.log('='.repeat(50))

process.exit(pass ? 0 : 1)
