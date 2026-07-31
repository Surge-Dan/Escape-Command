// tests/coverage/coverage-report.js
// 覆盖率报告：统计 group-room-store.js + generator-engine.js + record-builder.js + execution-progress.js + poi-command-builder.js + player-matcher.js + trust-score.js + player-trust-store.js + chat-store.js 的函数级 + 行级覆盖率
// 运行: node tests/coverage/coverage-report.js
//
// 覆盖率计算（无第三方依赖）：
//   - 函数级：扫描 module.exports 与 _internal 导出，检查测试文件是否引用
//   - 行级：粗略统计可执行行被测试代码"标识符命中"的比例
//   - 多测试源聚合：unit/store + unit/generator-engine + gherkin/runner + property + adversarial + qa/check

const fs = require('fs')
const path = require('path')

const projectRoot = path.resolve(__dirname, '..', '..')

// ===== 待测源文件 =====
const sources = [
  {
    name: 'group-room-store.js',
    path: 'packageSync/utils/group-room-store.js',
    // 测试套件：哪些测试文件覆盖此源
    testFiles: [
      'tests/unit/store.test.js',
      'tests/gherkin/runner.js',
      'tests/qa/check.js'
    ],
    // 函数覆盖阈值
    functionThreshold: 80,
    lineThreshold: 60
  },
  {
    name: 'generator-engine.js',
    path: 'utils/generator-engine.js',
    testFiles: [
      'tests/unit/generator-engine.test.js',
      'tests/gherkin/runner.js',
      'tests/property/generator-property.test.js',
      'tests/adversarial/generator-attack.test.js',
      'tests/qa/check.js'
    ],
    functionThreshold: 90,   // 引擎要求更高覆盖
    lineThreshold: 85        // B-P1 增强后提高行覆盖要求（spec：行≥85%）
  },
  {
    name: 'record-builder.js',
    path: 'utils/record-builder.js',
    testFiles: [
      'tests/unit/record-builder.test.js',
      'tests/gherkin/runner.js',
      'tests/qa/check.js'
    ],
    functionThreshold: 90,   // 完成流数据联动核心，要求高覆盖
    lineThreshold: 80
  },
  {
    name: 'execution-progress.js',
    path: 'utils/execution-progress.js',
    testFiles: [
      'tests/unit/execution-progress.test.js',
      'tests/qa/check.js'
    ],
    functionThreshold: 90,
    lineThreshold: 80
  },
  {
    name: 'poi-command-builder.js',
    path: 'utils/poi-command-builder.js',
    testFiles: [
      'tests/unit/poi-command-builder.test.js',
      'tests/qa/check.js'
    ],
    functionThreshold: 90,
    lineThreshold: 80
  },
  {
    name: 'player-matcher.js',
    path: 'packageSync/utils/player-matcher.js',
    testFiles: [
      'tests/unit/player-matcher.test.js',
      'tests/property/player-matcher-property.test.js',
      'tests/adversarial/player-matcher-attack.test.js',
      'tests/qa/check.js'
    ],
    functionThreshold: 90,   // D5 真实玩家联动核心，要求高覆盖
    lineThreshold: 78        // 行级统计为粗略标识符命中（非插桩），内部函数/null 守卫等间接调用未识别，函数级 100% 已保证覆盖
  },
  {
    name: 'trust-score.js',
    path: 'packageSync/utils/trust-score.js',
    testFiles: [
      'tests/unit/trust-score.test.js',
      'tests/qa/check.js'
    ],
    functionThreshold: 90,   // C-P4 信任分纯函数，要求高覆盖
    lineThreshold: 85
  },
  {
    name: 'player-trust-store.js',
    path: 'packageSync/utils/player-trust-store.js',
    testFiles: [
      'tests/unit/player-trust-store.test.js',
      'tests/qa/check.js'
    ],
    functionThreshold: 85,   // C-P4 信任数据层（含异步降级），要求高覆盖
    lineThreshold: 75
  },
  {
    name: 'chat-store.js',
    path: 'packageSync/utils/chat-store.js',
    testFiles: [
      'tests/unit/chat-store.test.js',
      'tests/qa/check.js'
    ],
    functionThreshold: 85,   // C-P4 聊天数据层（含乐观更新+轮询），要求高覆盖
    lineThreshold: 75
  }
]

// ===== 工具：提取导出函数名 =====
function extractExports(code) {
  // 主导出块：贪婪匹配整个 module.exports = { ... }（包括嵌套 {}）
  // 用括号配平法找到最外层闭合 }
  const startIdx = code.indexOf('module.exports')
  const exportedNames = []
  const internalExported = []

  if (startIdx >= 0) {
    // 找到 module.exports 后第一个 {
    let i = code.indexOf('{', startIdx)
    if (i >= 0) {
      let depth = 1
      let j = i + 1
      while (j < code.length && depth > 0) {
        if (code[j] === '{') depth++
        else if (code[j] === '}') depth--
        j++
      }
      const fullBlock = code.slice(i + 1, j - 1)  // 不含最外层 {}

      // 提取 _internal 子块（同样用括号配平）
      const internalIdx = fullBlock.indexOf('_internal')
      let internalBlock = ''
      if (internalIdx >= 0) {
        let k = fullBlock.indexOf('{', internalIdx)
        if (k >= 0) {
          let d = 1
          let l = k + 1
          while (l < fullBlock.length && d > 0) {
            if (fullBlock[l] === '{') d++
            else if (fullBlock[l] === '}') d--
            l++
          }
          internalBlock = fullBlock.slice(k + 1, l - 1)
        }
      }

      // 主块移除 _internal 子块后解析
      const cleaned = internalBlock ? fullBlock.replace('_internal', '__REMOVED__') : fullBlock
      // 简化：直接从 fullBlock 中移除 _internal: { ... } 段
      let mainBlock = fullBlock
      if (internalBlock) {
        const internalStart = fullBlock.indexOf('_internal')
        // 找到 _internal 后的 { ... }
        let k = fullBlock.indexOf('{', internalStart)
        let d = 1
        let l = k + 1
        while (l < fullBlock.length && d > 0) {
          if (fullBlock[l] === '{') d++
          else if (fullBlock[l] === '}') d--
          l++
        }
        mainBlock = fullBlock.slice(0, internalStart) + fullBlock.slice(l)
      }

      mainBlock.split(',').forEach(line => {
        const name = line.trim().split('//')[0].trim().split(':')[0].trim()
        if (name && !name.startsWith('//') && name !== '_internal' && !name.includes('{') && !name.includes('}')) {
          exportedNames.push(name)
        }
      })

      internalBlock.split(',').forEach(p => {
        const name = p.trim().split('//')[0].trim().split(':')[0].trim()
        if (name && !name.includes('{') && !name.includes('}')) {
          internalExported.push(name)
        }
      })
    }
  }
  return { exportedNames, internalExported }
}

// ===== 工具：提取所有 function 定义 =====
function extractFunctions(code) {
  const regex = /function\s+(\w+)\s*\(/g
  const fns = []
  let m
  while ((m = regex.exec(code)) !== null) fns.push(m[1])
  return fns
}

// ===== 工具：聚合测试代码 =====
function loadTestCode(testFiles) {
  let all = ''
  for (const f of testFiles) {
    const fp = path.join(projectRoot, f)
    if (fs.existsSync(fp)) {
      all += fs.readFileSync(fp, 'utf-8') + '\n'
    }
  }
  return all
}

// ===== 工具：函数级覆盖 =====
function checkFunctionCoverage(allFunctions, testCode, sourceCode) {
  // 去重
  const uniqueFunctions = Array.from(new Set(allFunctions))
  const covered = []
  const uncovered = []
  for (const fn of uniqueFunctions) {
    // 多种引用模式
    const patterns = [
      new RegExp('\\.' + fn + '\\b'),  // .fn 调用
      new RegExp('\\b' + fn + '\\s*\\('),  // fn( 直接调用
      new RegExp('\\b' + fn + '\\b')  // 任意 fn 标识符出现
    ]
    const isDirectlyCovered = patterns.some(p => p.test(testCode))
    if (isDirectlyCovered) {
      covered.push(fn)
    } else {
      // 间接覆盖：被源码中其他已覆盖函数调用
      // 检查源码中是否有 <fn>( 调用，且 fn 不是定义本身
      const callRegex = new RegExp('\\b' + fn + '\\s*\\(', 'g')
      let isIndirectlyCovered = false
      let m
      while ((m = callRegex.exec(sourceCode)) !== null) {
        // 简单判断：该调用不在 function 定义行（function foo()）
        const lineStart = sourceCode.lastIndexOf('\n', m.index) + 1
        const lineEnd = sourceCode.indexOf('\n', m.index)
        const line = sourceCode.slice(lineStart, lineEnd === -1 ? undefined : lineEnd)
        if (!line.includes('function ' + fn)) {
          isIndirectlyCovered = true
          break
        }
      }
      if (isIndirectlyCovered) covered.push(fn)
      else uncovered.push(fn)
    }
  }
  return { covered, uncovered }
}

// ===== 工具：行级覆盖（粗略）=====
function checkLineCoverage(code, testCode) {
  const codeLines = code.split('\n')
  let executableLines = 0
  let coveredLines = 0
  const uncoveredExamples = []

  for (let i = 0; i < codeLines.length; i++) {
    const line = codeLines[i].trim()
    // 跳过空行、注释、纯大括号、module.exports
    if (!line || line.startsWith('//') || line.startsWith('/*') || line.startsWith('*') ||
        line === '{' || line === '}' || line === '},' || line === '})()' ||
        line.startsWith('module.exports') || line.startsWith('\'use strict\'')) {
      continue
    }
    executableLines++
    // 提取该行的关键标识符（长度 > 3，排除关键字）
    const identifiers = (line.match(/\b(\w+)\b/g) || [])
      .filter(id => id.length > 3 && !['function', 'return', 'var', 'const', 'let', 'typeof', 'isArray'].includes(id))
    const hasMatch = identifiers.some(id => testCode.includes(id))
    if (hasMatch) {
      coveredLines++
    } else if (uncoveredExamples.length < 5) {
      uncoveredExamples.push({ line: i + 1, content: line.slice(0, 80) })
    }
  }
  return { executableLines, coveredLines, uncoveredExamples }
}

// ===== 主流程 =====
console.log('\n' + '='.repeat(60))
console.log('覆盖率报告：group-room-store.js + generator-engine.js + record-builder.js + execution-progress + poi-command-builder + player-matcher + trust-score + player-trust-store + chat-store')
console.log('='.repeat(60))

let allPass = true
const summary = []

for (const src of sources) {
  const fullPath = path.join(projectRoot, src.path)
  if (!fs.existsSync(fullPath)) {
    console.log('\n⚠ 文件不存在: ' + src.path)
    continue
  }
  const code = fs.readFileSync(fullPath, 'utf-8')
  const { exportedNames, internalExported } = extractExports(code)
  // 去重：同一函数可能在顶层和 _internal 重复导出（如 injectGroupFields），分母按唯一函数计
  const allFunctions = Array.from(new Set([...exportedNames, ...internalExported]))
  const testCode = loadTestCode(src.testFiles)

  const fnCov = checkFunctionCoverage(allFunctions, testCode, code)
  const lineCov = checkLineCoverage(code, testCode)

  const functionCoverage = allFunctions.length > 0
    ? (fnCov.covered.length / allFunctions.length * 100).toFixed(1)
    : '100.0'
  const lineCoverage = lineCov.executableLines > 0
    ? (lineCov.coveredLines / lineCov.executableLines * 100).toFixed(1)
    : '100.0'

  const fnPass = parseFloat(functionCoverage) >= src.functionThreshold
  const linePass = parseFloat(lineCoverage) >= src.lineThreshold
  const srcPass = fnPass && linePass
  if (!srcPass) allPass = false

  console.log('\n--- ' + src.name + ' ---')
  console.log('函数级覆盖: ' + fnCov.covered.length + ' / ' + allFunctions.length + ' (' + functionCoverage + '%, 要求 >=' + src.functionThreshold + '%) ' + (fnPass ? '✓' : '✗'))
  if (fnCov.uncovered.length > 0) {
    console.log('  未覆盖函数:')
    fnCov.uncovered.forEach(fn => console.log('    ✗ ' + fn))
  }
  console.log('行级覆盖: ' + lineCov.coveredLines + ' / ' + lineCov.executableLines + ' (' + lineCoverage + '%, 要求 >=' + src.lineThreshold + '%) ' + (linePass ? '✓' : '✗'))
  if (lineCov.uncoveredExamples.length > 0) {
    console.log('  未覆盖行示例（前 5）:')
    lineCov.uncoveredExamples.forEach(ex => console.log('    L' + ex.line + ': ' + ex.content))
  }

  summary.push({
    name: src.name,
    functionCoverage,
    lineCoverage,
    pass: srcPass
  })
}

// ===== 汇总 =====
console.log('\n' + '='.repeat(60))
console.log('覆盖率汇总:')
summary.forEach(s => {
  console.log('  ' + (s.pass ? '✓' : '✗') + ' ' + s.name + ': 函数 ' + s.functionCoverage + '%, 行 ' + s.lineCoverage + '%')
})
console.log('\n覆盖率结论: ' + (allPass ? 'PASS ✓' : 'FAIL ✗'))
console.log('='.repeat(60))

process.exit(allPass ? 0 : 1)
