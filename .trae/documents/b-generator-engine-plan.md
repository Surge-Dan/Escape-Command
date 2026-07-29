# Plan: B-01~B-06 骰子生成引擎 + 极严格测试体系

## Context

**为什么做这个**：roadmap 阶段 1（B 骰子生成引擎）的 6 个 P0 Spec 是 30 号演示前最大的缺口。当前 `pages/generating/generating` 只是 1.5s 拍立得动画后跳转地图页，**没有骰子动画、没有可测试的生成逻辑**。生成逻辑散落在 `app.js` 的 `getAvailableCommands`/`rollCommand`/`getFallbackCommands`，无法被现有 5 层测试体系覆盖。

**目标**：
1. B-01：在 generating 页实现 idle → shaking → rolling → settled 状态机骰子动画
2. B-02~B-06：把生成逻辑抽成 `utils/generator-engine.js` 纯函数模块，覆盖加载文案、条件校验、营业时间、安全风险、兜底任务
3. 把现有 5 层测试体系（unit/Gherkin/QA/coverage/mutation）扩展到覆盖新引擎，并新增 property-based + adversarial 两层
4. 修复 v11 遗留的 QA 检查失败（`open-type=share` 断言过时）

**不做**：
- 不改 `data/commands.js` 任务库（只读消费）
- 不改云函数（B 引擎纯前端）
- 不新增图片/字体/音频资源（骰子面用纯 CSS 实现，符合 project_memory 零资源增量规则）

---

## 架构设计

### 核心决策

| 决策点 | 选择 | 理由 |
|---|---|---|
| 骰子面渲染 | **纯 CSS（6 面 × 圆点定位）** | 零新增资源，符合 project_memory；CSS < 2KB 满足 B-01 spec "新增 ≤ 2KB" |
| 引擎抽取 | **新建 `utils/generator-engine.js`，`app.js` 改为薄委托** | 纯函数可测；app.js API 保持稳定，不破坏现有调用方 |
| 引擎依赖 | **零 wx 依赖**（context 全部入参传入） | 可直接在 Node 跑测试，不必 mock wx |
| B-04 营业时间 | **POI 类型 → 营业时间窗表**（cafe 07-22, park 06-21, market 06-20, convenience 24h...） | 比单纯 nightSafe 更准；表格化可测 |
| B-06 兜底 | **扩到 12 条 + 偏好感知**（按 userPreferences.type 加权） | 现有 4 条太少；偏好感知让兜底不那么"随机" |

### 模块边界

```
utils/generator-engine.js  (NEW — 纯函数，零 wx 依赖)
├── getFaceForType(type)                    // B-01: type → 1-6
├── getLoadingCopy(ctx)                     // B-02: 按模式/时长/时段返回文案
├── filterByConditions(cmds, ctx)           // B-03: 已完成/重复类型/POI 可达性
├── filterByBusinessHours(cmds, hour)       // B-04: POI 营业时间窗
├── filterBySafety(cmds, ctx)               // B-05: 夜间/雨天/极端天气
├── getFallbackCommands(ctx)                // B-06: 12 条兜底 + 偏好加权
├── generate(ctx)                           // 主入口: 全链路 filter → pick → fallback
└── _internal: { POI_HOURS, pickWeighted, ... }  // 导出供测试
```

`app.js` 改造：`getAvailableCommands`/`rollCommand`/`getFallbackCommands` 改为调用 engine，保持返回结构不变。

### B-01 状态机（generating 页）

```
idle ──tap/shake──► shaking(300ms) ──► rolling(1200ms) ──► settled
                       │                    │                │
                       └─ isAnimating=true (防抖) ─┘          └─ currentFace=getFaceForType(cmd.type)
```

- `pixelRatio < 2` → 关 `drop-shadow`，保留旋转
- `reduceMotion` → 时长缩到 600ms，跳过 shaking
- 骰子面：CSS 6 面（`.dice-face[data-face="1"~"6"]`），圆点用 `::before/::after` + grid 定位

---

## 实施步骤

### Phase 1: B-02~B-06 引擎 + 测试（先做，B-01 依赖 engine.getFaceForType）

**Step 1.1** — 新建 `.trae/specs/generator-engine-01/{spec,tasks,checklist}.md`（覆盖 B-02~B-06）

**Step 1.2** — 新建 `utils/generator-engine.js`：
- 6 个公开函数 + `_internal` 导出
- 零 wx 依赖，context 入参：`{ hour, weather, nearbyPOI, completedIds, lastType, sameTypeCount, userPrefs, mode }`
- POI_HOURS 表：`{ cafe:[7,22], park:[6,21], market:[6,20], convenience:[0,24], lake:[0,24], alley:[0,24], null:[0,24] }`
- 12 条兜底任务（覆盖 6 种 type × 2 种时长）

**Step 1.3** — 改造 `app.js`：
- `getAvailableCommands()` → 调 `engine.filterByConditions` + `engine.filterBySafety` + `engine.filterByBusinessHours`
- `rollCommand(mode)` → 调 `engine.generate`
- `getFallbackCommands()` → 调 `engine.getFallbackCommands`
- 保持原返回结构（`normalizeCommand` 不动）

**Step 1.4** — 新建测试套件：
- `tests/unit/generator-engine.test.js` — ~100 个 case（每函数 happy path + 边界 + 异常 + 错误码）
- `tests/gherkin/generator-flow.feature` — ~20 个 Scenario（B-02~B-06 全链路）
- 扩展 `tests/gherkin/runner.js` — 加 generator step matchers
- `tests/property/generator-property.test.js` — 随机 fuzz 1000 次（不变式：generate 永远返回非空数组；filterBySafety 在深夜必过滤 nightSafe=false）
- `tests/adversarial/generator-attack.test.js` — 注入 null/undefined/超长字符串/原型链污染/__proto__/非预期 type
- 扩展 `tests/mutation/mutation-test.js` — 加 12 个 engine 变异点
- 扩展 `tests/coverage/coverage-report.js` — 覆盖 engine.js
- 扩展 `tests/qa/check.js` — 加 engine 函数完整性 + 修复 v11 `open-type=share` 断言（改为检查 invite popup）
- 扩展 `tests/run-all.js` — 加 property + adversarial 两个 suite

### Phase 2: B-01 骰子动画

**Step 2.1** — `pages/generating/generating.wxml`：
- 保留拍立得作为辅助元素
- 中心加 `<view class="dice-stage">` + 6 面 `<view class="dice-face" data-face="N">`
- 加"再摇一次"按钮（settled 后显示）

**Step 2.2** — `pages/generating/generating.wxss`：
- 6 面 CSS（圆点 grid 定位，颜色用 `--brand`/`--ink`）
- `@keyframes dice-shake`（300ms 小幅晃动）
- `@keyframes dice-roll`（1200ms 旋转 4 圈 + 缩放）
- `@keyframes dice-settle`（200ms 反弹）
- `.dice.is-shaking/.is-rolling/.is-settled` 状态样式
- `@media (prefers-reduced-motion: reduce)` 降级
- pixelRatio<2 用 class 标记关投影（在 js 里 setData）

**Step 2.3** — `pages/generating/generating.js`：
- `data: { diceState:'idle', currentFace:1, isAnimating:false, loadingCopy:'', lowEnd:false }`
- `triggerRoll()` — 防抖 + 状态机 setTimeout 链
- `onAccelerometerChange` — 摇一摇手势（同防抖）
- `onLoad` 读 `reduceMotion` + `pixelRatio`，调 `engine.getFaceForType` + `engine.getLoadingCopy`
- 真实接入 `app.rollCommand(mode)` 替代当前的 1.5s 空等

### Phase 3: 对抗式审查（3 轮）

**Round 1 — 实现者自审**（correctness）：
- 每函数走 happy path + 3 个边界
- 检查所有 `Array.prototype` 调用是否有 null 防御
- 检查所有 `Math.random()` 是否有种子化（测试可复现）

**Round 2 — 攻击者视角**（adversarial）：
- 原型链污染：`__proto__`、`constructor`、`prototype` 注入
- 类型混淆：`type=undefined`、`type=0`、`type=[]`、`type={}`
- 极端值：`hour=-1`、`hour=25`、`duration=0`、`duration=99999`
- 竞态：`triggerRoll` 在 settled 前 1ms 再次触发
- 资源耗尽：`completedIds` 10000 项、`commandPool` 0 项

**Round 3 — QA 视角**（coverage gaps）：
- 跑 coverage 报告，找未覆盖分支
- 跑 mutation，找存活变异
- 补测试直到 mutation score ≥ 90% + line coverage ≥ 85%

### Phase 4: 验证 + 提交

- `node scripts/check-syntax.js` → FAIL=0
- `node scripts/final-check.js` → WXML/页面/TabBar 全 OK
- `node scripts/check-bundle.js --base=origin/dev` → PR 资源 0 新增（CSS 不算资源）
- `node tests/run-all.js` → 7 个 suite 全 PASS
- 微信开发者工具编译 → 模拟器 iOS+Android 各一次
- 截图 4 态（idle/shaking/rolling/settled）
- Conventional Commits + PR

---

## 关键文件清单

**新增**：
- `utils/generator-engine.js`
- `tests/unit/generator-engine.test.js`
- `tests/gherkin/generator-flow.feature`
- `tests/property/generator-property.test.js`
- `tests/adversarial/generator-attack.test.js`
- `.trae/specs/generator-engine-01/{spec,tasks,checklist}.md`

**修改**：
- `app.js` — 3 个函数委托给 engine（[app.js:384](file:///c:/Program%20Main/TRAEWork/Projects/%E5%87%BA%E9%80%83%E6%8C%87%E4%BB%A4/escape-command/app.js#L384) `getAvailableCommands`、[app.js:417](file:///c:/Program%20Main/TRAEWork/Projects/%E5%87%BA%E9%80%83%E6%8C%87%E4%BB%A4/escape-command/app.js#L417) `rollCommand`、[app.js:250](file:///c:/Program%20Main/TRAEWork/Projects/%E5%87%BA%E9%80%83%E6%8C%87%E4%BB%A4/escape-command/app.js#L250) `getFallbackCommands`）
- `pages/generating/generating.{js,wxml,wxss}` — B-01 骰子动画
- `tests/gherkin/runner.js` — 加 generator step matchers
- `tests/mutation/mutation-test.js` — 加 engine 变异点
- `tests/coverage/coverage-report.js` — 覆盖 engine
- `tests/qa/check.js` — 加 engine 检查 + 修 v11 断言
- `tests/run-all.js` — 加 property + adversarial suite

**复用**：
- `utils/constants.js` 的 `normalizeType`/`getTypeMeta`/`TYPE_STEPS`（[constants.js:84](file:///c:/Program%20Main/TRAEWork/Projects/%E5%87%BA%E9%80%83%E6%8C%87%E4%BB%A4/escape-command/utils/constants.js#L84)）
- `data/commands.js` 任务库（只读）
- `tests/mock-wx.js` mock 基础设施

---

## 测试体系最终形态（7 层）

| 层 | 文件 | 规模 | 红线 |
|---|---|---|---|
| 1. 单元测试 | `tests/unit/generator-engine.test.js` + `store.test.js` | ~100 + 142 | 0 fail |
| 2. Gherkin BDD | `generator-flow.feature` + `group-flow.feature` | ~20 + 14 scenarios | 0 fail |
| 3. Property/Fuzz | `tests/property/generator-property.test.js` | 1000 次随机 | 不变式全成立 |
| 4. Adversarial | `tests/adversarial/generator-attack.test.js` | ~30 攻击向量 | 0 crash + 0 异常逃逸 |
| 5. Mutation | `tests/mutation/mutation-test.js` | 8 (store) + 12 (engine) | score ≥ 90% |
| 6. Coverage | `tests/coverage/coverage-report.js` | store + engine | 函数 ≥ 90% / 行 ≥ 85% |
| 7. QA | `tests/qa/check.js` | 60+ checks | 0 error |

`tests/run-all.js` 统一编排，exit code 非 0 即失败。

---

## 验证方式

```bash
# 1. 语法
node scripts/check-syntax.js                    # 期望: FAIL=0

# 2. WXML + 页面完整性
node scripts/final-check.js                     # 期望: 全 OK

# 3. 包体（PR 增量硬卡口）
node scripts/check-bundle.js --base=origin/dev  # 期望: PR 资源 0 新增

# 4. 全量测试（7 层）
node tests/run-all.js                           # 期望: 7/7 PASS

# 5. 微信开发者工具
#    - 编译无 error
#    - 模拟器 iOS 14 + Android 10 各跑一次 generating 页
#    - 验证 4 态动画 + 防抖 + reduceMotion + 低端机降级
#    - 真机 Android happy path
```

---

## 风险与缓解

| 风险 | 缓解 |
|---|---|
| app.js 抽取破坏现有调用 | 保持原 API（函数名 + 返回结构）不变；先加 engine 再逐函数替换；跑 store.test.js 回归 |
| CSS 骰子在不同机型渲染不一致 | 用 rpx + grid 布局；6 面静态结构，不依赖 transform 3D；模拟器 iOS+Android 验证 |
| 测试时间过长（property 1000 次） | property 单独 suite，timeout 60s；mutation 并行；run-all.js 总 timeout 5min |
| 变异测试漏杀 | Round 3 QA 审查补变异点直到 score ≥ 90% |
