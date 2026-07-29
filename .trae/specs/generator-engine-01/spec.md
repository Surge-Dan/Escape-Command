# 出逃指令生成引擎 Spec

> Spec ID: `generator-engine-01`
> 对应功能表：B-02 生成加载文案 / B-03 条件校验 / B-04 营业时间校验 / B-05 安全风险过滤 / B-06 兜底任务
> 分支：`feature/generator-engine-01`
> 创建日：2026-07-29

## Why

`app.js` 中的 `getAvailableCommands` / `rollCommand` / `getFallbackCommands` 把生成逻辑、过滤逻辑、兜底逻辑、加权逻辑全揉在一起，且强耦合 `wx.getStorageSync` 与 `this.globalData`，**完全无法被现有 5 层测试体系覆盖**。30 号演示前需要：

1. 把生成逻辑抽成纯函数模块 `utils/generator-engine.js`，零 wx 依赖，context 全部入参传入
2. 覆盖 B-02~B-06 五个 P0 子能力：加载文案、条件校验、营业时间、安全风险、兜底任务
3. 让 `app.js` 退化为薄委托层，保持原 API 不变
4. 配套 7 层测试（unit/Gherkin/property/adversarial/mutation/coverage/QA）

## What Changes

### 新增 `utils/generator-engine.js`（纯函数，零 wx 依赖）

公开 6 个函数 + `_internal` 导出：

- `getFaceForType(type)` — B-01 辅助：type → 1-6 骰子面
- `getLoadingCopy(ctx)` — B-02：按 mode/duration/hour 返回加载文案
- `filterByConditions(cmds, ctx)` — B-03：已完成过滤 + 重复类型抑制 + POI 可达性
- `filterByBusinessHours(cmds, hour)` — B-04：POI 类型营业时间窗
- `filterBySafety(cmds, ctx)` — B-05：深夜/雨天/极端天气
- `getFallbackCommands(ctx)` — B-06：12 条兜底 + 偏好加权
- `generate(ctx)` — 主入口：filter → pick → fallback 全链路

`_internal` 导出：`POI_HOURS`、`FALLBACK_COMMANDS`、`pickWeighted`、`LOADING_COPIES`、`isValidHour`、`normalizeCtx`

### 修改 `app.js`

- `getAvailableCommands()` → 委托 `engine.filterByConditions` + `engine.filterBySafety` + `engine.filterByBusinessHours`
- `rollCommand(mode)` → 委托 `engine.generate`
- `getFallbackCommands()` → 委托 `engine.getFallbackCommands`
- 函数签名 + 返回结构保持不变，`normalizeCommand` 不动

### 不修改

- `data/commands.js`（任务库只读消费）
- `utils/constants.js`（复用 `normalizeType`/`getTypeMeta`）
- 云函数（B 引擎纯前端）

## Impact

- Affected specs: `dice-animation-01`（B-01 依赖 `engine.getFaceForType`）
- Affected code:
  - `utils/generator-engine.js`（新增）
  - `app.js`（3 个函数改造，[app.js:384](file:///c:/Program%20Main/TRAEWork/Projects/%E5%87%BA%E9%80%83%E6%8C%87%E4%BB%A4/escape-command/app.js#L384) / [app.js:417](file:///c:/Program%20Main/TRAEWork/Projects/%E5%87%BA%E9%80%83%E6%8C%87%E4%BB%A4/escape-command/app.js#L417) / [app.js:250](file:///c:/Program%20Main/TRAEWork/Projects/%E5%87%BA%E9%80%83%E6%8C%87%E4%BB%A4/escape-command/app.js#L250)）
  - 7 个测试文件（5 改 2 新）

## ADDED Requirements

### Requirement: B-02 生成加载文案
系统 SHALL 在 generating 页根据上下文返回差异化的加载文案。

#### Scenario: 微逃模式短时
- **WHEN** mode='micro' 且 duration ≤ 15
- **THEN** 返回包含"快速"或"碎片"语义的文案
- **AND** 文案长度 6-20 字

#### Scenario: 漫游模式长时
- **WHEN** mode='walk' 且 duration ≥ 30
- **THEN** 返回包含"慢慢"或"深度"语义的文案

#### Scenario: 深夜时段
- **WHEN** hour ∈ [22, 6)
- **THEN** 返回包含"夜"或"安静"语义的文案

#### Scenario: 默认兜底
- **WHEN** ctx 缺失或 mode 未知
- **THEN** 返回通用文案"正在生成你的出逃记录"

### Requirement: B-03 条件校验
系统 SHALL 按上下文过滤候选任务。

#### Scenario: 已完成 90 天内不重复
- **WHEN** cmd.id 在 completedIds 中且完成日期 < 90 天
- **THEN** 该 cmd 被过滤

#### Scenario: 重复类型抑制
- **WHEN** cmd.type === lastType 且 sameTypeCount ≥ 2
- **THEN** 该 cmd 被过滤

#### Scenario: POI 不可达过滤
- **WHEN** cmd.requirePOI 不为 null 且 nearbyPOI[cmd.requirePOI] 为 falsy
- **THEN** 该 cmd 被过滤

#### Scenario: 空输入兜底
- **WHEN** cmds 为 null/undefined/非数组
- **THEN** 返回空数组 []，不抛异常

### Requirement: B-04 营业时间校验
系统 SHALL 按 POI 类型营业时间窗过滤。

#### Scenario: 咖啡馆深夜过滤
- **WHEN** cmd.requirePOI='cafe' 且 hour=23
- **THEN** 该 cmd 被过滤（cafe 营业 07-22）

#### Scenario: 便利店不过滤
- **WHEN** cmd.requirePOI='convenience' 且 hour=3
- **THEN** 该 cmd 保留（24h 营业）

#### Scenario: 无 POI 要求不过滤
- **WHEN** cmd.requirePOI 为 null/undefined
- **THEN** 该 cmd 保留

#### Scenario: 未知 POI 类型不过滤
- **WHEN** cmd.requirePOI='unknown_type'
- **THEN** 该 cmd 保留（保守策略，不过滤未知）

#### Scenario: hour 越界兜底
- **WHEN** hour < 0 或 hour ≥ 24
- **THEN** 不抛异常，按 0 处理

### Requirement: B-05 安全风险过滤
系统 SHALL 按安全约束过滤。

#### Scenario: 深夜非 nightSafe 过滤
- **WHEN** hour ∈ [22, 6) 且 cmd.nightSafe=false
- **THEN** 该 cmd 被过滤

#### Scenario: 雨天户外非雨天过滤
- **WHEN** weather ∈ ['rainy','storm'] 且 cmd.rainy=false 且 cmd.outdoor=true
- **THEN** 该 cmd 被过滤

#### Scenario: 室内任务雨天保留
- **WHEN** weather='rainy' 且 cmd.outdoor=false
- **THEN** 该 cmd 保留

### Requirement: B-06 兜底任务
系统 SHALL 在所有候选耗尽时返回兜底任务。

#### Scenario: 兜底数量
- **WHEN** 调用 getFallbackCommands(ctx)
- **THEN** 返回 ≥ 8 条任务
- **AND** 每条必有 id/type/content/duration 字段

#### Scenario: 偏好感知
- **WHEN** ctx.userPrefs.type 顶层偏好为 'walk'
- **THEN** walk 类型兜底任务排序靠前

#### Scenario: 兜底 ID 唯一
- **WHEN** 返回兜底列表
- **THEN** 所有 id 以 'fb' 前缀且唯一

### Requirement: generate 主入口
系统 SHALL 串联 B-03/04/05/06 提供完整生成。

#### Scenario: 正常生成
- **WHEN** 调用 generate(ctx) 且 ctx 含合法 commandPool
- **THEN** 返回 { ok:true, command } 单个任务

#### Scenario: 全过滤后兜底
- **WHEN** 所有候选被过滤
- **THEN** 返回 { ok:true, command, fallback:true } 兜底任务

#### Scenario: 空池兜底
- **WHEN** ctx.commandPool 为空数组
- **THEN** 返回 { ok:true, command, fallback:true }

#### Scenario: mode 过滤
- **WHEN** mode='micro'
- **THEN** 候选先按 duration < 15 过滤

## MODIFIED Requirements

无（这是新增模块，不修改现有需求；app.js 仅内部委托改造，外部行为不变）

## REMOVED Requirements

无

---

## 验收标准

1. ✅ `utils/generator-engine.js` 零 wx 依赖，可在 Node 直接 require
2. ✅ `app.js` 三个函数改造后，`tests/unit/store.test.js` 142 case 全绿
3. ✅ 7 层测试全 PASS（unit/Gherkin/property/adversarial/mutation/coverage/QA）
4. ✅ mutation score ≥ 90%
5. ✅ 行覆盖率 ≥ 85%，函数覆盖率 ≥ 90%
6. ✅ `check-syntax FAIL=0` / `final-check 全 OK` / `check-bundle PR 资源 0 新增`

## 测试要求

- 单元测试 ~100 case，每函数 happy path + 边界 + 异常
- Gherkin ~20 scenario，B-02~B-06 全链路
- Property 1000 次随机 fuzz，不变式：generate 永远返回 ok:true
- Adversarial ~30 攻击向量：null/undefined/__proto__/原型链/极端值/竞态
- Mutation 12 个变异点，score ≥ 90%
- Coverage 函数 ≥ 90% / 行 ≥ 85%

## 风险

- app.js 抽取破坏现有调用 → 保持 API 不变 + store.test.js 回归
- 兜底任务与 commands.js 重复 → 兜底用 'fb' 前缀 ID，不污染主库
- POI_HOURS 表不准确 → 保守策略：未知类型不过滤

## 回滚

引擎独立文件 + app.js 委托点清晰，revert 后 app.js 自动回退到内联实现。
