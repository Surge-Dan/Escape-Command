# 出逃指令 产品优化改造方案

## Context

对照《功能评审与优化建议》，当前小程序完成度约 75%，存在安全合规缺失、首页信息过载、执行页缺乏阶段感、同频随机度过高、激励体系薄弱、地图深度不足等问题。用户要求在 1-2 周内完成 P0+P1+P2 全部优化（排除配图部分，由队友 Henry 负责）。本方案分 4 批交付，每批配套严格测试（单元测试 + Gherkin BDD + 对抗式测试 + QA 检查）。

---

## 批次总览

| 批次 | 内容 | 优先级 | 预计工作量 |
|------|------|--------|-----------|
| Batch 1 | 安全合规 + 首页简化 | P0 | 2-3天 |
| Batch 2 | 执行页阶段感设计 | P0 | 2天 |
| Batch 3 | 同频双轨制 + 数据埋点 | P1 | 2-3天 |
| Batch 4 | 激励体系 + 地图深化 + 记忆回收 + 分享 | P2 | 3-4天 |

---

## Batch 1：安全合规 + 首页简化

### 1A. 安全合规基础功能

#### 新增：隐私授权说明页
- **文件**：`pages/onboarding/onboarding.wxml` / `.js` / `.wxss`
- **内容**：在现有 3 屏引导后增加第 4 屏「隐私与安全说明」
  - 说明定位用途（生成附近任务、记录足迹）
  - 说明数据存储（本地存储，不上传服务器）
  - 说明用户权利（可随时清除数据、关闭定位）
  - 同意按钮 → 触发 `wx.getLocation` 授权
- **改动**：`onboarding.js` 新增 `onAgreePrivacy` 方法，授权后写入 `onboarded=true`

#### 新增：紧急退出功能
- **文件**：`pages/executing/executing.wxml` / `.js` / `.wxss`
- **内容**：执行页右上角添加「紧急退出」按钮
  - 点击后弹窗确认 → 保存当前进度 → 返回首页
  - 显示安全提示（附近派出所/出租车电话）
- **纯函数**：新增 `utils/safety-helper.js`
  - `getEmergencyContacts()` 返回紧急联系信息
  - `filterNightDistance(commands, hour, maxDistance)` 夜间距离过滤
  - `checkContentSafety(text)` 基础内容安全检查（关键词过滤）

#### 新增：位置分享功能
- **文件**：`pages/executing/executing.wxml` / `.js`
- **内容**：执行页添加「分享位置给朋友」按钮
  - 调用 `wx.openLocation` 打开微信内置地图分享
  - 或调用 `wx.shareAppMessage` 携带位置信息

#### 增强：夜间任务距离限制
- **文件**：`utils/generator-engine.js`
- **内容**：`filterBySafety` 增加夜间（21:00-06:00）距离限制逻辑
  - 夜间仅推荐 `nightSafe: true` 或距离 < 1km 的指令
  - 现有 `filterBySafety` 已有深夜过滤基础，补充距离维度

#### 增强：内容安全过滤
- **文件**：`utils/safety-helper.js`（新建）
- **内容**：用户上传文字/图片时的基础安全检查
  - 文字：敏感词过滤（基础词库）
  - 图片：调用 `wx.cloud.uploadFile` + 内容安全 API（如可用）
  - 降级：关键词过滤无法覆盖时，标记为待审核

### 1B. 首页简化

#### 删除：每日推荐模块
- **文件**：`pages/index/index.wxml` / `.js` / `.wxss`
- **内容**：删除 `daily-section` 模块（wxml L111-L125）
- **清理**：`index.js` 中 `loadDailyRecommend`、`shuffleWithSeed`、`dailyRecommend` data 字段

#### 删除：收藏入口
- **文件**：`pages/index/index.wxml` / `.js` / `.wxss`
- **内容**：删除 `collect-entry-mini` 和 `collect-entry-card` 模块（wxml L94-L108）
- **清理**：`index.js` 中 `goCollection`、`collectedCount` 相关逻辑（保留 `collectCmd` 功能）

#### 增强：骰子视觉占比
- **文件**：`pages/index/index.wxss`
- **内容**：调整 `dice-stage` 区域占比从 40% → 55%
- **注意**：不改动骰子配图（Henry 负责），仅调整布局尺寸

### Batch 1 测试要求

| 测试类型 | 文件 | 覆盖内容 |
|----------|------|----------|
| 单元测试 | `tests/unit/safety-helper.test.js` | 夜间距离过滤、内容安全检查、紧急联系信息 |
| 单元测试 | `tests/unit/generator-engine.test.js`（扩展） | 夜间距离限制场景 |
| Gherkin BDD | `tests/gherkin/safety-compliance.feature` | 隐私授权流程、紧急退出流程、夜间安全过滤 |
| 对抗式测试 | `tests/adversarial/safety-attack.test.js` | 恶意内容输入、夜间危险任务、位置越界 |
| QA 检查 | `tests/qa/check.js`（扩展） | 检查 onboarding 隐私页存在性、首页无 daily-section |

---

## Batch 2：执行页阶段感设计

### 2A. 到达确认机制

#### 新增：到达确认逻辑
- **文件**：`pages/executing/executing.wxml` / `.js` / `.wxss`
- **内容**：
  - 步骤区分为「出发前阶段」和「到达后阶段」
  - 出发前：仅展示第一阶段指令（步骤 1-2）
  - 添加「我到了」按钮 → 触发到达确认
  - 到达确认：优先定位验证（100m 内），降级为手动确认
  - 确认后解锁隐藏任务（步骤 3-4）
- **纯函数**：新增 `utils/arrival-helper.js`
  - `calcDistance(lat1, lng1, lat2, lng2)` 距离计算（Haversine）
  - `isArrived(userLoc, targetLoc, threshold)` 到达判定
  - `splitSteps(steps)` 将步骤分为出发前/到达后两组

### 2B. 隐藏任务解锁

#### 新增：隐藏任务机制
- **文件**：`utils/constants.js`（扩展步骤结构）
- **内容**：步骤对象新增 `hidden: true` 字段标记隐藏任务
  - `DEFAULT_STEPS` / `TYPE_STEPS` 中第 3-4 步标记为 hidden
  - 执行页初始渲染时过滤 hidden 步骤
  - 到达确认后显示全部步骤

### 2C. 完成仪式感

#### 增强：完成动画
- **文件**：`pages/executing/executing.wxml` / `.wxss` / `.js`
- **内容**：
  - 全部步骤完成时，展示完成动画（粒子效果/光效）
  - 完成按钮文案变为仪式感文案（如「🎉 完成出逃，留下印记」）
  - 完成时触发振动反馈

### Batch 2 测试要求

| 测试类型 | 文件 | 覆盖内容 |
|----------|------|----------|
| 单元测试 | `tests/unit/arrival-helper.test.js` | 距离计算、到达判定、步骤分组 |
| 单元测试 | `tests/unit/execution-progress.test.js`（扩展） | 隐藏任务解锁后进度合并 |
| Gherkin BDD | `tests/gherkin/execution-flow.feature`（扩展） | 到达确认→解锁隐藏任务→完成全流程 |
| 对抗式测试 | `tests/adversarial/arrival-attack.test.js` | 距离越界、伪造到达、步骤篡改 |
| 变异测试 | `tests/mutation/mutation-test.js`（扩展） | arrival-helper 变异算子 |

---

## Batch 3：同频双轨制 + 数据埋点

### 3A. 同频双轨制

#### 新增：快速匹配入口
- **文件**：`pages/index/index.wxml` / `.js`
- **内容**：同频骰子弹窗（`showDiceSheet`）新增第三个选项「⚡ AI快速匹配」
  - 现有两个选项：邀请好友组局、进入任务大厅
  - 新增：AI快速匹配 → 跳转新页面

#### 新增：AI推荐任务页
- **文件**：`packageSync/pages/group/quick-match/`（新建目录）
  - `quick-match.wxml` / `.js` / `.json` / `.wxss`
- **内容**：
  - 分析用户画像（历史偏好、出逃风格）
  - 结合实时状态（位置、时间、天气）
  - 推荐 3 个候选任务（含地点、时间、预算）
  - 用户选择后直接进入执行页（跳过投票）
  - 「换一个」按钮重新生成
- **纯函数**：新增 `utils/quick-match-engine.js`
  - `analyzeProfile(records, preferences)` 用户画像分析
  - `recommendTasks(profile, ctx, count)` 推荐候选任务
  - `rerollTask(profile, ctx, excludeIds)` 重新推荐
- **注册**：`app.json` 的 packageSync pages 中添加新页面路径

### 3B. 数据埋点系统

#### 新增：埋点工具
- **文件**：`utils/analytics.js`（新建）
- **内容**：
  - `trackEvent(name, data)` 事件埋点
  - `trackFunnel(stage, data)` 漏斗埋点
  - 本地存储 + 批量上传（云开发可用时）
  - 事件类型：`dice_tap`、`command_accept`、`command_reroll`、`escape_start`、`escape_arrive`、`escape_complete`、`record_save`、`share`
- **接入点**：
  - `pages/index/index.js`：骰子点击、指令接受/重摇
  - `pages/executing/executing.js`：到达确认、完成
  - `pages/record/record.js`：记录保存、分享

### Batch 3 测试要求

| 测试类型 | 文件 | 覆盖内容 |
|----------|------|----------|
| 单元测试 | `tests/unit/quick-match-engine.test.js` | 画像分析、推荐逻辑、去重、reroll |
| 单元测试 | `tests/unit/analytics.test.js` | 事件埋点、漏斗记录、本地存储 |
| Gherkin BDD | `tests/gherkin/quick-match-flow.feature` | 快速匹配全流程 |
| Gherkin BDD | `tests/gherkin/analytics-funnel.feature` | 核心漏斗埋点验证 |
| 对抗式测试 | `tests/adversarial/quick-match-attack.test.js` | 空画像、空记录池、恶意输入 |
| 属性测试 | `tests/property/quick-match-property.test.js` | 1000+ 次推荐不变量 |

---

## Batch 4：激励体系 + 地图深化 + 记忆回收 + 分享

### 4A. 激励体系完善

#### 新增：城市方向收集
- **文件**：`utils/badge-engine.js`（新建或扩展）
- **内容**：
  - 统计用户探索的城区方向（东/南/西/北/中）
  - 解锁「东征」「南探」「西行」「北游」「中枢」徽章
  - 基于记录的 location 坐标计算方向

#### 新增：阶段记录
- **文件**：`data/badges.js`（扩展）
- **内容**：
  - 10 次出逃 →「初探者」
  - 30 次出逃 →「熟路人」
  - 50 次出逃 →「城市侦探」
  - 100 次出逃 →「城市专家」

#### 新增：出逃风格画像
- **文件**：`utils/style-profile.js`（新建）
- **内容**：
  - 基于历史记录分析用户出逃风格
  - 维度：距离偏好（近/中/远）、时间偏好（晨/午/晚/夜）、类型偏好、社交偏好
  - 生成风格描述文案（如「你是一个喜欢在傍晚漫步的观察者」）
- **展示**：`packageBiz/pages/achievements/` 或新建 `style-profile` 页面

### 4B. 城市关系地图深化

#### 新增：类型筛选
- **文件**：`pages/map/map.wxml` / `.js`
- **内容**：时间筛选旁新增类型筛选（全部/微逃/破圈/同频）

#### 新增：情绪筛选
- **文件**：`pages/map/map.wxml` / `.js`
- **内容**：按记录的 mood 字段筛选（开心/平静/勇敢等）

#### 新增：城市关系总结
- **文件**：`packageBiz/pages/city-progress/city-progress.js`（扩展）
- **内容**：
  - 生成阶段性探索总结（每月/每季）
  - 文案如「这个月你探索了 5 个新角落，最常去的是XX」
  - 可分享

#### 新增：重返旧地点
- **文件**：`pages/map/map.js`
- **内容**：点击地图标记 → 弹窗新增「重返此地」按钮 → 基于旧地点生成新任务

### 4C. 记忆回收深化

#### 新增：记忆回访提醒
- **文件**：`app.js` / `utils/memory-revisit.js`（新建）
- **内容**：
  - 启动时检查 30 天前的记录
  - 弹出「一个月前的今天，你在这里出逃过」提醒
  - 可查看旧记录详情

#### 新增：阶段总结
- **文件**：`utils/summary-builder.js`（新建）
- **内容**：
  - `buildMonthlySummary(records, month)` 生成月度总结
  - 包含：出逃次数、最常去地点、最常用类型、情绪分布
  - 可在时间线/年度回顾页展示

### 4D. 分享机制丰富

#### 新增：替朋友摇一次
- **文件**：`pages/index/index.js` / `onShareAppMessage`
- **内容**：
  - 分享卡片携带「替朋友摇」参数
  - 朋友打开后直接显示一条推荐指令
  - 增加「这是XX替你摇的」提示

#### 新增：城市关系图分享
- **文件**：`packageBiz/pages/city-progress/city-progress.js`
- **内容**：
  - 生成城市探索雷达图（方向分布）
  - 可保存为图片分享

### Batch 4 测试要求

| 测试类型 | 文件 | 覆盖内容 |
|----------|------|----------|
| 单元测试 | `tests/unit/badge-engine.test.js`（扩展） | 城市方向收集、阶段记录判定 |
| 单元测试 | `tests/unit/style-profile.test.js` | 风格画像分析 |
| 单元测试 | `tests/unit/summary-builder.test.js` | 月度总结生成 |
| 单元测试 | `tests/unit/memory-revisit.test.js` | 记忆回访逻辑 |
| Gherkin BDD | `tests/gherkin/badge-growth.feature` | 徽章解锁全流程 |
| Gherkin BDD | `tests/gherkin/map-enhancement.feature` | 地图筛选、重返旧地点 |
| 对抗式测试 | `tests/adversarial/badge-attack.test.js` | 篡改记录骗徽章、边界值 |
| 属性测试 | `tests/property/style-profile-property.test.js` | 风格画像不变量 |

---

## 通用测试规范

### 测试运行
- 入口：`node tests/run-all.js`
- 单独运行：`node tests/unit/xxx.test.js`
- 新增测试需注册到 `tests/run-all.js` 的 `testSuites` 数组

### 测试编写规范（遵循现有模式）
- 自定义 `assert` / `assertEqual` / `describe` / `it` 函数
- 纯函数模块零 wx 依赖，可直接在 Node require
- 需要 wx 环境的测试使用 `tests/mock-wx.js`
- 每个 `.test.js` 文件输出 `passCount` / `failCount`，`process.exit(failCount > 0 ? 1 : 0)`

### 质量门槛
- 新增纯函数模块：单元测试覆盖率 ≥ 90%
- 安全相关函数：对抗式测试 ≥ 20 攻击向量
- 核心业务流程：Gherkin BDD 覆盖主路径 + 异常路径
- 所有新增模块：QA 检查（文件规范、常量使用、导出完整性）

---

## 文件清单总览

### 新增文件
| 文件 | 批次 | 用途 |
|------|------|------|
| `utils/safety-helper.js` | B1 | 安全合规工具函数 |
| `utils/arrival-helper.js` | B2 | 到达确认工具函数 |
| `utils/quick-match-engine.js` | B3 | 快速匹配推荐引擎 |
| `utils/analytics.js` | B3 | 数据埋点工具 |
| `utils/style-profile.js` | B4 | 出逃风格画像 |
| `utils/summary-builder.js` | B4 | 阶段总结生成 |
| `utils/memory-revisit.js` | B4 | 记忆回访逻辑 |
| `packageSync/pages/group/quick-match/*` | B3 | AI推荐任务页 |
| `tests/unit/safety-helper.test.js` | B1 | 安全工具测试 |
| `tests/unit/arrival-helper.test.js` | B2 | 到达确认测试 |
| `tests/unit/quick-match-engine.test.js` | B3 | 快速匹配测试 |
| `tests/unit/analytics.test.js` | B3 | 埋点测试 |
| `tests/gherkin/safety-compliance.feature` | B1 | 安全合规BDD |
| `tests/gherkin/quick-match-flow.feature` | B3 | 快速匹配BDD |
| `tests/adversarial/safety-attack.test.js` | B1 | 安全对抗测试 |
| `tests/adversarial/arrival-attack.test.js` | B2 | 到达确认对抗测试 |
| `tests/adversarial/quick-match-attack.test.js` | B3 | 快速匹配对抗测试 |

### 修改文件
| 文件 | 批次 | 改动内容 |
|------|------|----------|
| `pages/onboarding/onboarding.wxml/.js` | B1 | 新增隐私授权第4屏 |
| `pages/index/index.wxml/.js/.wxss` | B1 | 删除每日推荐+收藏入口，调整骰子占比 |
| `pages/executing/executing.wxml/.js/.wxss` | B1+B2 | 紧急退出+位置分享+到达确认+隐藏任务+完成动画 |
| `utils/generator-engine.js` | B1 | 夜间距离限制 |
| `pages/index/index.js` | B3 | 同频快速匹配入口 |
| `app.js` | B3+B4 | 埋点接入+记忆回访检查 |
| `app.json` | B3 | 注册 quick-match 页面 |
| `pages/map/map.wxml/.js` | B4 | 类型筛选+情绪筛选+重返旧地点 |
| `data/badges.js` | B4 | 新增阶段记录徽章 |
| `tests/run-all.js` | 全部 | 注册新测试套件 |

---

## 验证方案

### 每批完成后验证
1. `node tests/run-all.js` 全量通过
2. 微信开发者工具中手动验证核心流程
3. 检查主包体积未超 1.5MB

### 最终验收
1. 全量测试套件通过（单元+BDD+对抗+属性+变异+覆盖率+QA）
2. 核心闭环验证：摇骰子→生成→接受→执行→到达确认→解锁隐藏任务→完成→记录→地图
3. 安全合规验证：隐私授权页→紧急退出→夜间过滤→内容安全
4. 同频双轨验证：熟人组局流程正常 + 快速匹配流程正常
5. 数据埋点验证：核心漏斗事件正确记录
