// tests/run-all.js
// 统一运行所有测试套件
// 运行: node tests/run-all.js
//
// 测试金字塔：
//   1. 单元测试（store + generator-engine + record-builder + execution-progress + poi-command-builder + task-hall-store + player-matcher）：函数级正确性
//   2. Gherkin BDD：业务流程场景
//   3. Property-Based Fuzz：1000+ 次随机输入不变量
//   4. Adversarial Attack：~336 攻击向量，安全不变量
//   5. QA 质量检查：文件/常量/代码规范
//   6. 覆盖率报告：函数 + 行级覆盖
//   7. 变异测试：90+ 变异算子，验证测试有效性

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
  { name: '单元测试 - task-hall-store (C-P3 任务大厅)', cmd: 'node tests/unit/task-hall-store.test.js', timeout: 30000 },
  { name: '单元测试 - player-matcher (D5 真实玩家联动)', cmd: 'node tests/unit/player-matcher.test.js', timeout: 30000 },
  { name: '单元测试 - trust-score (C-P4 信任分)', cmd: 'node tests/unit/trust-score.test.js', timeout: 30000 },
  { name: '单元测试 - player-trust-store (C-P4 信任数据层)', cmd: 'node tests/unit/player-trust-store.test.js', timeout: 30000 },
  { name: '单元测试 - chat-store (C-P4 聊天数据层)', cmd: 'node tests/unit/chat-store.test.js', timeout: 30000 },
  { name: '单元测试 - breakthrough (Henry 破圈骰子)', cmd: 'node tests/unit/breakthrough.test.js', timeout: 30000 },
  { name: '单元测试 - safety-helper (B1 安全合规)', cmd: 'node tests/unit/safety-helper.test.js', timeout: 30000 },
  { name: '单元测试 - arrival-helper (B2 阶段感设计)', cmd: 'node tests/unit/arrival-helper.test.js', timeout: 30000 },
  { name: '单元测试 - tracker (B3 数据埋点)', cmd: 'node tests/unit/tracker.test.js', timeout: 30000 },
  { name: '单元测试 - quick-match-engine (B3 AI 快速匹配)', cmd: 'node tests/unit/quick-match-engine.test.js', timeout: 30000 },
  { name: '单元测试 - badge-engine (B4 激励体系)', cmd: 'node tests/unit/badge-engine.test.js', timeout: 30000 },
  { name: '单元测试 - map-marker-builder (B4 地图筛选)', cmd: 'node tests/unit/map-marker-builder.test.js', timeout: 30000 },
  { name: '单元测试 - revisit-helper (B4 重返旧地点)', cmd: 'node tests/unit/revisit-helper.test.js', timeout: 30000 },
  { name: '单元测试 - style-profile (B4 风格画像)', cmd: 'node tests/unit/style-profile.test.js', timeout: 30000 },
  { name: '单元测试 - summary-builder (B4 总结生成)', cmd: 'node tests/unit/summary-builder.test.js', timeout: 30000 },
  { name: '单元测试 - memory-revisit (B4 记忆回访)', cmd: 'node tests/unit/memory-revisit.test.js', timeout: 30000 },
  // ===== BDD =====
  { name: 'Gherkin BDD (group + generator + completion + task-hall + c-p4-social + breakthrough + safety + arrival + quick-match + badge-growth + map-enhancement)', cmd: 'node tests/gherkin/runner.js', timeout: 60000 },
  // ===== Fuzz =====
  { name: 'Property Fuzz - generator (1000+ 次)', cmd: 'node tests/property/generator-property.test.js', timeout: 120000 },
  { name: 'Property Fuzz - group (C-14~C-19)', cmd: 'node tests/property/group-property.test.js', timeout: 120000 },
  { name: 'Property Fuzz - player-matcher (D5)', cmd: 'node tests/property/player-matcher-property.test.js', timeout: 120000 },
  { name: 'Property Fuzz - chat-trust (C-P4)', cmd: 'node tests/property/chat-trust-property.test.js', timeout: 120000 },
  // ===== 对抗式 =====
  { name: 'Adversarial - generator (45 攻击向量)', cmd: 'node tests/adversarial/generator-attack.test.js', timeout: 60000 },
  { name: 'Adversarial - group (49 攻击向量)', cmd: 'node tests/adversarial/group-attack.test.js', timeout: 60000 },
  { name: 'Adversarial - player-matcher (40 攻击向量)', cmd: 'node tests/adversarial/player-matcher-attack.test.js', timeout: 60000 },
  { name: 'Adversarial - chat-trust (C-P4)', cmd: 'node tests/adversarial/chat-trust-attack.test.js', timeout: 60000 },
  { name: 'Adversarial - safety (B1 安全合规 31 攻击向量)', cmd: 'node tests/adversarial/safety-attack.test.js', timeout: 60000 },
  { name: 'Adversarial - arrival (B2 阶段感设计 67 攻击向量)', cmd: 'node tests/adversarial/arrival-attack.test.js', timeout: 60000 },
  { name: 'Adversarial - quick-match (B3 AI 快速匹配 52 攻击向量)', cmd: 'node tests/adversarial/quick-match-attack.test.js', timeout: 60000 },
  { name: 'Adversarial - badge (B4 激励体系 52 攻击向量)', cmd: 'node tests/adversarial/badge-attack.test.js', timeout: 60000 },
  // ===== 质量与覆盖 =====
  { name: 'QA 质量检查', cmd: 'node tests/qa/check.js', timeout: 30000 },
  { name: '覆盖率报告', cmd: 'node tests/coverage/coverage-report.js', timeout: 30000 },
  // ===== 变异测试（最后跑，最慢）=====
  { name: '变异测试 (99+ C-P4 mutations)', cmd: 'node tests/mutation/mutation-test.js', timeout: 600000 }
]

let passCount = 0
let failCount = 0
const results = []

console.log('\n' + '='.repeat(60))
console.log('  出逃指令 全量测试套件（B + C + D 全功能）')
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
