# B-P1 生成引擎增强 + C-P1 同频组局收尾 Spec

> Spec ID: `b-p1-c-p1-batch`
> 对应功能表：B-07~B-14（8 个 P1）+ C-09~C-13（5 个 P1），共 13 个细分功能点
> 分支：`feature/b-p1-c-p1-batch`（基于 `Daniel` 工作分支）
> 创建日：2026-07-29
> 模式：用户要求两组一起做，一个 spec + 一个分支 + 一次 PR

## Why

B 阶段 P0（B-01~B-06）已让生成引擎可用，但候选选择仍是"过滤 + 1.2x 加权随机"，缺天气细筛/去重/难度/兴趣/评分/解释/变量 7 项增强；C 阶段 P1 的 C-01~C-08 已让同频组局走通"创建→投票→剧本→执行→打卡"，但缺到齐确认/临时退出/人数兜底/共同记录展示/共同城市底片 5 项收尾。

30 号里程碑已达成（单人完整出逃 + 多人房间 3 人投票）。本 spec 让生成质量可感知、同频流程闭环可演示。

## 范围确认

- **不含**：真实天气 API 接入（Phase 1.1，独立 spec）、真实云函数多端同步（C 阶段后续）、主包瘦身（独立技术债 spec）
- **含**：在现有 demo 模式（本地存储 + ctx 入参）下，13 个功能点的纯函数 + 页面接入 + 7 层测试

## 关键设计决策（带理由）

| 决策点 | 选择 | 理由 |
|---|---|---|
| B-10 difficulty 来源 | **算法推算**（duration+outdoor+cost→1/2/3） | 零包体影响（不改 commands.js 150 条），纯函数可测可复现 |
| B-12 选择算法 | **新增 scoreCommand + pickBestScored（top3 随机）**，pickWeighted 保留兜底 | 评分选 top3 兼顾质量与多样性；pickWeighted 保留作评分无候选时的回退，不破坏现有测试 |
| B-14 变量替换 | **fillVariables 通用函数，被 B-13 调用**，不改 commands.js 正文 | 正文无占位符，改正文 150 条风险大且增包体；通用函数 + explanation 调用最稳 |
| type 映射不一致 | **新增 normalizeType**（sensory→sense/market→food/moment→collect） | commands.js 的 type 值与 TYPE_FACE_MAP key 不一致，B-11 兴趣平衡必须先归一化 |
| C-09~C-13 多端协同 | **demo 单端可演示版**，延续 C-01~C-08 本地存储模式 | 真实多端同步依赖云函数轮询，不在本 batch；单端可演示已满足 30 号后推进 |
| C-12 共同记录 | **展示层增强**（record-detail 页对 isGroup 记录展示成员 + 留痕 steps） | 同频打卡页已写记录（isGroup/groupId/members/steps），C-12 补展示而非重写存储 |
| 新增资源 | **零**，全部复用现有 SVG/webp | 包体红线：主包 201.8KB，PR 资源增量必须为 0 |

---

## B 组详细设计（B-07~B-14 生成引擎增强）

所有新增函数挂在 `utils/generator-engine.js`，纯函数零 wx 依赖，ctx 全部入参传入。

### B-07 天气校验 — `filterByWeather(cmds, ctx)`

**现状**：`filterBySafety` 只做 rainy/storm/extreme 粗过滤。

**新增**：细化天气维度，不依赖真实 API（ctx.weatherDetail 传入，未传则不过滤）。

- ctx 扩展 `weatherDetail: { temperature, visibility, condition }`（均可选）
- 高温（>32℃）：过滤 duration > 30 的纯户外任务（防中暑）
- 低温（<5℃）：过滤 duration > 30 的户外任务（防冻）
- 低能见度（visibility='poor'，雾/霾）：过滤 outdoor && duration>20
- 保留 `filterBySafety` 作粗过滤兜底，`filterByWeather` 在其后追加

**generate 链路**：filterByConditions → filterByBusinessHours → filterBySafety → filterByWeather → applyModeFilter → ...

### B-08 地点去重 — `filterByLocationDedup(cmds, ctx)`

**现状**：只有 id 去重（B-03），无地点去重。

**新增**：同一 POI 类型 24h 内不重复推荐。

- ctx 新增 `recentLocations: ['cafe','park',...]`（最近 5 次出逃的 requirePOI 列表）
- ctx 新增 `recentLocationTimes: [ts, ts, ...]`（对应时间戳，用于 24h 窗口）
- 规则：cmd.requirePOI 在 recentLocations 中且对应时间 < 24h → 过滤
- 无 requirePOI 的指令不受限
- app.js 从 `globalData.records` 提取 recentLocations 传入（薄委托）

### B-09 历史体验去重 — `filterBySimilar(cmds, ctx)`

**现状**：B-03 已有 90 天 id 去重 + sameTypeCount≥2 抑制。

**新增**：内容相似度去重，防"不同 id 但内容高度相似"。

- ctx 新增 `recentContents: ['找一块蓝色招牌...', '...']`（最近 5 次 content 文本）
- 简化相似度：提取关键词（去停用词后的 2-4 字片段），Jaccard 相似度 > 0.6 → 过滤
- 纯函数 `extractKeywords(text)` + `jaccard(a, b)` 在 `_internal` 导出
- 与 B-03 互补：B-03 防"同一任务"，B-09 防"相似任务"

### B-10 难度匹配 — `computeDifficulty(cmd)` + `filterByDifficulty(cmds, ctx)`

**现状**：commands.js 无 difficulty 字段。

**新增**：算法推算，不改 commands.js。

- `computeDifficulty(cmd)` 纯函数：
  - 基础分：duration / 15（向下取整，封顶 3）
  - 户外 +1：outdoor === true
  - 花费 +1：cost >= 30
  - 综合 clamp 到 1-3
- `filterByDifficulty(cmds, ctx)`：按 ctx.userIntensity 过滤
  - low：只留 difficulty 1-2
  - medium：1-3 全留
  - high：2-3（排除太轻松）
- ctx.userIntensity 从 userPrefs.intensity 取（C-04 偏好已有 intensity 字段）

### B-11 兴趣平衡 — 升级 `pickWeighted` + 新增 `normalizeType`

**现状**：pickWeighted 只对顶层偏好类型 1.2x 权重；type 映射不一致（commands 用 sensory/market/moment，TYPE_FACE_MAP 用 sense/food/collect）。

**升级**：
- 新增 `normalizeType(type)`：sensory→sense, market→food, moment→collect, 其余原样
- pickWeighted 内部统一用 normalizeType 归一化后再比对偏好
- 多类型权重：userPrefs.type 计数排序，top1=1.5x, top2=1.2x, top3=1.1x, 其余 1x
- 签名不变（向后兼容），行为更均衡

### B-12 结果质量评分 — `scoreCommand(cmd, ctx)` + `pickBestScored(candidates, ctx)`

**现状**：pickWeighted 纯随机加权。

**新增**：
- `scoreCommand(cmd, ctx)` 返回 0-100 分：
  - 兴趣匹配 30%（cmd.type 归一化后在偏好 top3 加分）
  - 难度匹配 20%（computeDifficulty 与 userIntensity 匹配度）
  - 新鲜度 20%（不在 recentContents/recentLocations 中满分，在则降权）
  - 时长匹配 15%（cmd.duration 与 ctx.targetDuration 偏差越小越好）
  - 类型平衡 15%（cmd.type !== lastType 加分）
- `pickBestScored(candidates, ctx)`：按分数降序，top3 内随机选（保多样性）
- `generate` 主入口：候选 ≥ 3 时用 pickBestScored；候选 < 3 时回退 pickWeighted；空候选走 fallback

### B-13 任务解释 — `buildExplanation(cmd, ctx)`

**现状**：cmd 有 tip 字段，无"为什么推荐"解释。

**新增**：
- 输出 `{ reason, howto, tip }`
- `reason` 模板库（按 ctx 维度生成"为什么推荐它"）：
  - 雨天 + indoor → "下雨天，为你选了室内任务"
  - 深夜 + nightSafe → "这个时间，适合安静地做这件事"
  - 偏好匹配 → "你最近喜欢{type}，这个很合你"
  - 默认 → "骰子摇到了它，试试看"
- `howto`：从 cmd.content 提取（当前 content 即指引，直接用）
- `tip`：透传 cmd.tip
- 纯函数，reason 模板库在 `_internal.EXPLANATION_REASONS` 导出

### B-14 个性化变量替换 — `fillVariables(text, ctx)`

**新增**：通用变量替换函数，被 B-13 调用，不改 commands.js。

- 占位符：`{时间}` `{天气}` `{地点}` `{季节}`
- ctx 提供：hour→时段文案（早/午/晚）、weather→天气文案、locationName→地点名、season→季节
- 无占位符的 text 原样返回
- B-13 的 reason/howto 可调用 fillVariables 注入实时信息
- 纯函数，`_internal` 导出

---

## C 组详细设计（C-09~C-13 同频组局收尾）

所有新增函数挂在 `utils/group-room-store.js`（C-09~C-11）+ `utils/record-builder.js`（C-12）+ `utils/map-marker-builder.js`（C-13 新增）。demo 模式本地存储。

### C-09 到齐确认 — `confirmReady(roomId)`

**现状**：joinRoom 直接加成员，状态 WAITING→VOTING 无房主确认环节。

**新增**：
- 状态机扩展：`WAITING → READY → VOTING`（新增 READY 状态）
- `confirmReady(roomId)`：仅房主可调，成员数 ≥ 2 时 WAITING→READY
- READY 状态下房主点"开始投票"→ READY→VOTING（复用现有 updateRoomStatus）
- room.wxml：WAITING 状态显示"人齐了，开始"按钮（房主可见，members.length>=2）
- 兜底：members.length < 2 时按钮禁用 + 提示"至少 2 人"
- 兼容：房主也可跳过 READY 直接 WAITING→VOTING（保留原路径）

### C-10 临时退出 — `leaveRoom(roomId)`

**现状**：无 leaveRoom。

**新增**：
- 非房主退出：从 members 移除自己，重算投票统计（getVoteStats 已实时算）
- 房主退出：转 cancelRoom（房主走则局散）
- 状态限制：status ∈ {WAITING, READY, VOTING} 可退；{GENERATING, FINISHED} 不可退（剧本已生成）
- 退出后投票若已 allVoted，需重新校验（少一人可能不再 allVoted）

### C-11 人数不足兜底 — `checkQuorum(room)` + 联动

**新增纯函数**：
- `checkQuorum(room)`：返回 `{ ok, enough, current, min, suggestion }`
- `minMembers = 2`（demo 友好，允许 2 人小队）
- current < min → suggestion='cancel'（建议取消）
- min <= current < 3 → suggestion='small_team'（小队模式，可继续）
- current >= 3 → suggestion='ok'
- C-10 leaveRoom 后自动 checkQuorum，suggestion='cancel' 时提示房主

### C-12 共同记录 — record-detail 页展示层增强

**现状**：同频打卡页已写记录（isGroup/groupId/members/steps/executionProgress 留痕）。

**新增**（展示层，不改存储）：
- `record-builder.js` 新增 `buildGroupSummary(record)` 纯函数：从 record 提取成员名 + 每步完成时间，返回 `{ members, stepTraces }`
- record-detail 页：isGroup 记录额外渲染"和朋友一起"区块（成员昵称列表）+ 步骤留痕时间线（每步 completedAt）
- room 页 FINISHED 状态：展示"本次出逃记录"入口（跳 record-detail）
- 复用现有 record-detail 页结构，新增条件渲染块

### C-13 共同城市底片 — `utils/map-marker-builder.js` + map 页接入

**现状**：map 页只读 globalData.records，无同频特殊展示。

**新增**：
- `utils/map-marker-builder.js`（新文件，纯函数零 wx 依赖）：
  - `buildGroupMarkers(records)`：把 isGroup 记录按 groupId 聚合，每组返回 1 个聚合 marker（含成员数、主类型颜色）
  - `buildSoloMarkers(records)`：普通记录各自 marker
  - `mergeMarkers(solo, group)`：合并，同位置聚合 marker 优先
- map.js 调用 buildGroupMarkers，对聚合 marker 用特殊样式（复用现有 SVG，多色叠加 + 成员数角标用文字渲染）
- 不新增图片资源，成员数用文字渲染

---

## 数据契约不变量

1. **B 组**：generate 返回结构升级为 `{ ok, command, explanation, fallback? }`（explanation 由 buildExplanation 生成，可选）
2. **B 组**：所有新过滤函数空输入返回 []，不抛异常（延续 B-03 约定）
3. **B 组**：commands.js 只读消费，不改一字段
4. **C 组**：ROOM_STATUS 新增 READY，不破坏现有 WAITING/VOTING/GENERATING/FINISHED/cancelled
5. **C 组**：leaveRoom 不影响已 FINISHED 房间的 script
6. **C 组**：同频记录仍走 `completeCommand → buildRecord` 统一入口（不绕过）
7. **零新增资源**：PR 资源增量 = 0

## 包体影响评估

| 项 | 增量 | 说明 |
|---|---|---|
| commands.js | 0 | 不改 |
| generator-engine.js | +~12KB | 8 个新函数 + 模板库 |
| group-room-store.js | +~3KB | 3 个新函数 |
| map-marker-builder.js | +~2KB | 新文件 |
| record-builder.js | +~1KB | buildGroupSummary |
| 页面 wxml/wxss | +~3KB | record-detail/map/room 展示块 |
| 资源 | 0 | 全复用现有 SVG |
| **主包净增** | **~21KB** | 201.8KB → ~223KB，远低于 1.5MB 红线 |

## 测试计划（7 层，延续现有体系）

- **单元测试**：每个新函数 happy path + 边界 + 异常，预计 +~150 case
- **Gherkin BDD**：B-07~B-14 + C-09~C-13 各 3-5 scenario，预计 +~50 scenario
- **Property Fuzz**：generate 不变式（永远 ok:true）、computeDifficulty ∈ [1,3]、normalizeType 幂等、fillVariables 无占位符时原样返回，预计 +~5000 次
- **Adversarial**：null/undefined/__proto__/原型链/极端天气/空成员/负数，预计 +~20 向量
- **Mutation**：每个新函数边界算子（相似度阈值 0.6、难度 clamp、权重 1.5x、24h 窗口、minMembers=2），预计 +~30 变异点
- **Coverage**：generator-engine 函数 ≥ 90% / 行 ≥ 85%；group-room-store 同；map-marker-builder 函数 100%
- **QA**：契约检查（generate 返回结构、ROOM_STATUS 含 READY、零新增资源）

## 验收标准

1. 13 个功能点全部实现且接入页面
2. 7 层测试全 PASS，mutation score ≥ 95%
3. check-syntax FAIL=0 / final-check 全 OK / check-bundle PR 资源 0 新增
4. 主包 < 1.5MB
5. commands.js 零改动
6. 模拟器验证：单人摇骰子能看到 explanation；同频房间能到齐确认/退出/兜底；记录详情能看成员；地图能看同频聚合 marker

## 风险与回滚

- **风险**：B-12 改 generate 主选择算法可能影响现有 generator-flow.feature 的加权随机场景 → 保留 pickWeighted 兜底 + 调整 BDD 阈值（参考之前 5000 次采样经验）
- **风险**：B-11 normalizeType 改变 pickWeighted 行为，影响 property fuzz 的权重断言 → 归一化只增不减兼容，fuzz 用大样本
- **风险**：C-09 新增 READY 状态影响现有 room-flow 场景 → READY 是 WAITING 后的可选中间态，房主可跳过，兼容
- **回滚**：B 组新函数独立，generate 里逐个启用；C 组新函数独立，room 页逐个接入。可按功能点单独回滚

## 推进顺序（实现阶段）

1. B-11 normalizeType + pickWeighted 升级（修 type 映射，后续 B 组依赖）
2. B-10 computeDifficulty + filterByDifficulty
3. B-07/B-08/B-09 三个过滤函数
4. B-12 scoreCommand + pickBestScored + generate 接入
5. B-13 buildExplanation + B-14 fillVariables
6. B 组 7 层测试
7. C-09/C-10/C-11 group-room-store 三个函数 + room 页接入
8. C-12 record-detail 展示增强
9. C-13 map-marker-builder + map 页接入
10. C 组 7 层测试 + 全量回归
