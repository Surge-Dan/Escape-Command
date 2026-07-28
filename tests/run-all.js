// tests/run-all.js
// 统一运行所有测试套件
// 运行: node tests/run-all.js

const { execSync } = require('child_process')
const path = require('path')

const projectRoot = path.resolve(__dirname, '..')
const testSuites = [
  { name: '单元测试', cmd: 'node tests/unit/store.test.js' },
  { name: 'Gherkin BDD', cmd: 'node tests/gherkin/runner.js' },
  { name: 'QA 质量检查', cmd: 'node tests/qa/check.js' },
  { name: '覆盖率报告', cmd: 'node tests/coverage/coverage-report.js' },
  { name: '变异测试', cmd: 'node tests/mutation/mutation-test.js' }
]

let passCount = 0
let failCount = 0
const results = []

console.log('\n' + '='.repeat(60))
console.log('  同频组局 C-02~C-08 全量测试套件')
console.log('='.repeat(60))

for (const suite of testSuites) {
  console.log('\n' + '-'.repeat(60))
  console.log('  >> ' + suite.name)
  console.log('-'.repeat(60))

  try {
    const output = execSync(suite.cmd, {
      cwd: projectRoot,
      stdio: 'pipe',
      timeout: 60000,
      encoding: 'utf-8'
    })
    // 输出最后几行
    const lines = output.trim().split('\n')
    lines.slice(-5).forEach(l => console.log('  ' + l))
    passCount++
    results.push({ name: suite.name, status: 'PASS' })
    console.log('  ✓ ' + suite.name + ' 通过')
  } catch (e) {
    const output = (e.stdout || '') + (e.stderr || '')
    const lines = output.trim().split('\n').filter(l => l.trim())
    lines.slice(-8).forEach(l => console.log('  ' + l))
    failCount++
    results.push({ name: suite.name, status: 'FAIL' })
    console.log('  ✗ ' + suite.name + ' 失败')
  }
}

// ===== 最终报告 =====
console.log('\n' + '='.repeat(60))
console.log('  最终测试报告')
console.log('='.repeat(60))
results.forEach(r => {
  console.log('  ' + (r.status === 'PASS' ? '✓' : '✗') + ' ' + r.name + ': ' + r.status)
})
console.log('\n  总计: ' + passCount + ' passed, ' + failCount + ' failed')
console.log('='.repeat(60))

process.exit(failCount > 0 ? 1 : 0)
