# Tasks: 出逃指令生成引擎

## 任务列表

### Phase 1: 引擎实现

- [ ] Task 1: 新建 `utils/generator-engine.js`
  - [ ] 1.1 定义常量：`POI_HOURS`、`FALLBACK_COMMANDS`(12 条)、`LOADING_COPIES`
  - [ ] 1.2 实现 `normalizeCtx(ctx)` — 防御性归一化所有入参
  - [ ] 1.3 实现 `isValidHour(hour)` — 0-23 合法性
  - [ ] 1.4 实现 `getFaceForType(type)` — type → 1-6 映射
  - [ ] 1.5 实现 `getLoadingCopy(ctx)` — B-02 文案
  - [ ] 1.6 实现 `filterByConditions(cmds, ctx)` — B-03
  - [ ] 1.7 实现 `filterByBusinessHours(cmds, hour)` — B-04
  - [ ] 1.8 实现 `filterBySafety(cmds, ctx)` — B-05
  - [ ] 1.9 实现 `pickWeighted(candidates, prefs)` — 加权随机
  - [ ] 1.10 实现 `getFallbackCommands(ctx)` — B-06
  - [ ] 1.11 实现 `generate(ctx)` — 主入口
  - [ ] 1.12 导出 `module.exports` + `_internal`

### Phase 2: app.js 委托

- [ ] Task 2: 改造 `app.js`
  - [ ] 2.1 `require('./utils/generator-engine.js')`
  - [ ] 2.2 `getAvailableCommands()` 委托 engine 三层 filter
  - [ ] 2.3 `rollCommand(mode)` 委托 engine.generate
  - [ ] 2.4 `getFallbackCommands()` 委托 engine.getFallbackCommands
  - [ ] 2.5 跑 store.test.js 回归验证

### Phase 3: 测试套件

- [ ] Task 3: 单元测试 `tests/unit/generator-engine.test.js`
  - [ ] 3.1 测试框架复用 store.test.js 风格（自定义 assert/describe/it）
  - [ ] 3.2 每函数 happy path + 3 边界 + 3 异常 = ~100 case
  - [ ] 3.3 覆盖所有 `_internal` 导出

- [ ] Task 4: Gherkin `tests/gherkin/generator-flow.feature`
  - [ ] 4.1 ~20 scenario 覆盖 B-02~B-06 全链路
  - [ ] 4.2 扩展 `runner.js` 加 generator step matchers

- [ ] Task 5: Property `tests/property/generator-property.test.js`
  - [ ] 5.1 1000 次随机 ctx
  - [ ] 5.2 不变式：generate 永远 ok:true 且返回合法 command
  - [ ] 5.3 不变式：filterBySafety 深夜必过滤 nightSafe=false
  - [ ] 5.4 不变式：filterByBusinessHours 不抛异常

- [ ] Task 6: Adversarial `tests/adversarial/generator-attack.test.js`
  - [ ] 6.1 原型链污染（__proto__/constructor）
  - [ ] 6.2 类型混淆（type=undefined/0/[]/{}）
  - [ ] 6.3 极端值（hour=-1/25, duration=0/99999）
  - [ ] 6.4 资源耗尽（completedIds 10000 项, commandPool 0 项）
  - [ ] 6.5 字符串注入（content 含 <script>/__proto__/JSON）

- [ ] Task 7: 扩展现有测试基础设施
  - [ ] 7.1 `tests/mutation/mutation-test.js` 加 12 个 engine 变异点
  - [ ] 7.2 `tests/coverage/coverage-report.js` 覆盖 engine.js
  - [ ] 7.3 `tests/qa/check.js` 加 engine 函数完整性 + 修 v11 open-type=share 断言
  - [ ] 7.4 `tests/run-all.js` 加 property + adversarial suite

### Phase 4: B-01 骰子动画（依赖 engine.getFaceForType）

- [ ] Task 8: `pages/generating/generating.wxml` 加 dice-stage
- [ ] Task 9: `pages/generating/generating.wxss` 加 CSS 6 面 + keyframes
- [ ] Task 10: `pages/generating/generating.js` 加状态机 + 防抖 + 接入 engine

### Phase 5: 对抗式审查 + 验证

- [ ] Task 11: Round 1 实现者自审
- [ ] Task 12: Round 2 攻击者视角
- [ ] Task 13: Round 3 QA 视角（补测试到 mutation ≥ 90% / 行覆盖 ≥ 85%）
- [ ] Task 14: 全量验证（check-syntax/final-check/check-bundle/run-all）

## 任务依赖

- Task 2 依赖 Task 1
- Task 3-7 依赖 Task 1
- Task 8-10 依赖 Task 1（getFaceForType）+ Task 2（rollCommand）
- Task 11-14 依赖 Task 1-10 全部完成
