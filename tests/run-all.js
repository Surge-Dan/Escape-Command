// tests/run-all.js
// 统一运行所有测试套件
// 运行: node tests/run-all.js
//
// 测试金字塔：
//   1. 单元测试（store + generator-engine）：函数级正确性
//   2. Gherkin BDD：业务流程场景
//   3. Property-Based Fuzz：1000 次随机输入不变量
//   4. Adversarial Attack：~45 攻击向量，安全不变量
//   5. QA 质量检查：文件/常量/代码规范
//   6. 覆盖率报告：函数 + 行级覆盖
//   7. 变异测试：18+ 变异算子，验证测试有效性

const { execSync } = require('child_process')
const path = require('path')

const projectRoot = path.resolve(__dirname, '..')
const testSuites = [
  // ===== 单元测试 =====
  { name: '单元测试 - store (C-01~C-08)', cmd: 'node tests/unit/store.test.js', timeout: 30000 },
  { name: '单元测试 - generator-engine (B-01~B-06)', cmd: 'node tests/unit/generator-engine.test.js', timeout: 30000 },
  { name: '单元测试 - record-builder (完成流数据联动)', cmd: 'node tests/unit/record-builder.test.js', timeout: 30000 },
  { name: '单元测试 - execution-progress (进度持久化留痕)', cmd: 'node tests/unit/execution-progress.test.js', timeout: 30000 },
  { name: '单元测试 - poi-command-builder (POI 指令构建)', cmd: 'node tests/unit/poi-command-builder.test.js', timeout: 30000 },
  // ===== BDD =====
  { name: 'Gherkin BDD (group + generator + completion)', cmd: 'node tests/gherkin/runner.js', timeout: 60000 },
  // ===== Fuzz =====
  { name: 'Property-Based Fuzz (1000+ 次)', cmd: 'node tests/property/generator-property.test.js', timeout: 120000 },
  // ===== 对抗式 =====
  { name: 'Adversarial Attack (45 攻击向量)', cmd: 'node tests/adversarial/generator-attack.test.js', timeout: 60000 },
  // ===== 质量与覆盖 =====
  { name: 'QA 质量检查', cmd: 'node tests/qa/check.js', timeout: 30000 },
  { name: '覆盖率报告', cmd: 'node tests/coverage/coverage-report.js', timeout: 30000 },
  // ===== 变异测试（最后跑，最慢）=====
  { name: '变异测试 (48 mutations)', cmd: 'node tests/mutation/mutation-test.js', timeout: 300000 }
]

let passCount = 0
let failCount = 0
const results = []

console.log('\n' + '='.repeat(60))
console.log('  出逃指令 全量测试套件（B + C 全功能）')
console.log('='.repeat(60))

for (const suite of testSuites) {
  console.log('\n' + '-'.repeat(60))
  console.log('  >> ' + suite.name)
  console.log('-'.repeat(60))

  try {
    const output = execSync(suite.cmd, {
      cwd: projectRoot,
      stdio: 'pipe',
      timeout: suite.timeout || 60000,
      encoding: 'utf-8'
    })
    // 输出最后 5 行
    const lines = output.trim().split('\n')
    lines.slice(-5).forEach(l => console.log('  ' + l))
    passCount++
    results.push({ name: suite.name, status: 'PASS' })
    console.log('  ✓ ' + suite.name + ' 通过')
  } catch (e) {
    const output = (e.stdout || '') + (e.stderr || '')
    const lines = output.trim().split('\n').filter(l => l.trim())
    lines.slice(-10).forEach(l => console.log('  ' + l))
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
