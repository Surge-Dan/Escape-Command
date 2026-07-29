# Checklist: 出逃指令生成引擎

## Phase 1: 引擎实现

- [ ] `utils/generator-engine.js` 存在且 `node --check` 通过
- [ ] 零 wx 依赖（grep 'wx\.' 无命中）
- [ ] 6 个公开函数全部导出
- [ ] `_internal` 导出 POI_HOURS / FALLBACK_COMMANDS / pickWeighted / LOADING_COPIES
- [ ] POI_HOURS 覆盖 cafe/park/market/convenience/lake/alley/null
- [ ] FALLBACK_COMMANDS ≥ 12 条，id 全 'fb' 前缀且唯一
- [ ] normalizeCtx 对 null/undefined/缺字段全部兜底
- [ ] 所有 Array.prototype 调用前有 Array.isArray 防御

## Phase 2: app.js 委托

- [ ] app.js require generator-engine
- [ ] getAvailableCommands 委托 engine
- [ ] rollCommand 委托 engine.generate
- [ ] getFallbackCommands 委托 engine.getFallbackCommands
- [ ] normalizeCommand 未改动
- [ ] `node tests/unit/store.test.js` 142 case 全绿（回归）

## Phase 3: 测试套件

### 单元测试
- [ ] tests/unit/generator-engine.test.js 存在
- [ ] case 数 ≥ 80
- [ ] 0 fail
- [ ] 覆盖所有 6 个公开函数 + _internal

### Gherkin
- [ ] tests/gherkin/generator-flow.feature 存在
- [ ] scenario 数 ≥ 15
- [ ] runner.js 扩展 generator step matchers
- [ ] 0 fail

### Property
- [ ] tests/property/generator-property.test.js 存在
- [ ] 1000 次随机迭代
- [ ] 不变式全成立
- [ ] 0 fail

### Adversarial
- [ ] tests/adversarial/generator-attack.test.js 存在
- [ ] 攻击向量 ≥ 25
- [ ] 0 crash / 0 异常逃逸
- [ ] 0 fail

### Mutation
- [ ] mutation-test.js 加 12 个 engine 变异点
- [ ] mutation score ≥ 90%

### Coverage
- [ ] coverage-report.js 覆盖 engine.js
- [ ] 函数覆盖 ≥ 90%
- [ ] 行覆盖 ≥ 85%

### QA
- [ ] qa/check.js 加 engine 函数完整性检查
- [ ] 修复 v11 open-type=share 断言（改为 invite popup 检查）
- [ ] 0 error

### Run-all
- [ ] run-all.js 加 property + adversarial suite
- [ ] 7 个 suite 全 PASS

## Phase 4: B-01 骰子动画

- [ ] generating.wxml 有 dice-stage + 6 面
- [ ] generating.wxss 有 @keyframes dice-shake/roll/settle
- [ ] generating.wxss 有 6 面 CSS（圆点定位）
- [ ] generating.js 有 diceState 状态机
- [ ] generating.js 有 triggerRoll 防抖
- [ ] generating.js 接入 engine.getFaceForType
- [ ] generating.js 接入 engine.getLoadingCopy
- [ ] pixelRatio<2 降级（关 drop-shadow）
- [ ] reduceMotion 降级（时长 ≤ 600ms）

## Phase 5: 验证

- [ ] `node scripts/check-syntax.js` FAIL=0
- [ ] `node scripts/final-check.js` WXML/页面/TabBar 全 OK
- [ ] `node scripts/check-bundle.js --base=origin/dev` PR 资源 0 新增
- [ ] `node tests/run-all.js` 7/7 PASS
- [ ] 微信开发者工具编译无 error
- [ ] 模拟器 iOS + Android 各一次 generating 页 4 态

## PR 资源检查

```bash
node scripts/check-bundle.js --base=origin/dev
```
- [ ] 零新增图片/音频/字体/插件
- [ ] CSS 骰子面 < 2KB（不计入资源）
