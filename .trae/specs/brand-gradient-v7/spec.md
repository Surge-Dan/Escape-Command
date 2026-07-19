# 出逃指令 v7 品牌渐变与分页面视觉 Spec

## Why

v6 修复了全页面布局、nav-header、scroll-view、按钮规范和原生 map 后，用户引入了一个参考的冥想类 App 设计风格，但在落地过程中暴露了新问题：
1. **渐变只在一个盒子内**（hero-warm），不是全局背景，视觉上割裂
2. **文字和按钮错位**——大字号衬线标题没有正确换行、按钮安全区留白与 TabBar 冲突
3. **顶部 hero 文字风格被硬套到所有页面**——用户明确要求该风格仅用于首页，其他页面应有自己的视觉主题
4. **导航栏图标不应改动**——顶部 nav-header 的返回/菜单等图标保持原样
5. 需要引入**微信小程序开发规范 skill**辅助审查，避免"改一次崩一次"

## What Changes

### A. 全局背景渐变（P0）

**当前问题**：`page` 背景是纯色 `--canvas: #F5F3EF`；首页只有 `.hero-warm` 盒子内部有渐变，与下方米色背景硬切。

**修复方案**：
- `app.wxss` 的 `page` 背景改为**线性渐变**：从顶部暖橙（`#FFF6F0`）平滑过渡到底部米色（`#F5F3EF`），实现"整个小程序背景是渐变的"效果。
- 移除 `.hero-warm` 自身的渐变背景，改为**透明或仅保留光晕装饰**，让它融入全局渐变。
- 保留 `--canvas` token 用于卡片底色/局部填充，不作为页面主背景。

**影响范围**：`app.wxss`、`pages/index/index.wxss`

### B. 首页 Hero 文字规范化（P0）

**当前问题**：大字号衬线标题 `.hero-title-line` 内嵌套了另一个 `.hero-title-line`，行内 text 与 block 混用，导致文字错位、基线不齐。

**修复方案**：
- `.hero-title-wrap` 改用两个独立的块级行
- 第二行拆为：**普通文字 span** + **斜体强调 span** + **句点**，全部行内 `display: inline` 或统一 `display: block`
- 字号从 72rpx/80rpx 适度回收到 **64rpx/68rpx**，避免中文笔画在小程序渲染中糊成一团
- 行高从 1.05 调整到 **1.15**，确保中文多行不拥挤
- `.hero-italic` 保持 `font-style: italic` + 暖橙色，但不再单独设置 line-height/size，统一跟随父行

**影响范围**：`pages/index/index.wxml`、`pages/index/index.wxss`

### C. 按钮与底部安全区修复（P0）

**当前问题**：
- 指令详情页的 `cmd-actions` 底部按钮 `padding-bottom` 只算了安全区，没留 TabBar 高度，导致"接受指令"按钮与悬浮 TabBar 重叠
- `.bottom-spacer` 由 40rpx 改为 token 后，与 `.tabbar-placeholder` 重复，造成双重留白
- TabBar 激活态从绿色改为黑色后，图标被 `filter: invert(1)` 变白，但部分 SVG 本身带透明/彩色细节，导致视觉发虚

**修复方案**：
- `cmd-actions` 的 `padding-bottom` 改为 `calc(var(--safe-bottom) + 12rpx)`，按钮不再被 TabBar 遮挡（TabBar 本身已脱离文档流）
- 首页 `.bottom-spacer` 恢复到统一 `var(--page-pad-bottom)` 或**移除**（如果 TabBar 已自带 placeholder）
- TabBar 激活态图标改为**单独的白色版本 iconActive**（已存在 `tab-xxx-active.svg`），不再使用 CSS filter 反色，保证清晰度
- 未激活态图标降低透明度至 0.65，激活态 1.0

**影响范围**：`pages/index/index.wxss`、`custom-tab-bar/index.wxss`

### D. 分页面视觉主题（P0）

**当前问题**：v8 的 hero 区只改了首页，但其他页面也应"有自己的效果"，而不是统一模板。

**修复方案**（每个页面一个主题卡片/顶部区）：

| 页面 | 主题 | 视觉处理 |
|------|------|----------|
| 首页 index | 晨间出逃 | 保留大标题 + 暖橙 Pill + 衬线斜体 |
| 地图 map | 城市足迹 | 顶部小标题"城市记忆" + 副标题"你走过的角落"，不加 hero 大标题，保持地图沉浸 |
| 我的 profile | 个人档案 | 顶部简洁标题"我的"，头像区加半透明白色卡片浮在渐变上 |
| 执行中 executing | 专注状态 | 顶部标题"执行中"，计时数字用品牌绿大字号，下方步骤卡片用白底 |
| 设置 settings | 偏好中心 | 顶部标题"设置"，分组卡片用白底 + 大圆角 |
| 指令详情 command-detail | 指令档案 | 顶部标题即指令标题，插画区下方加白底卡片 |

**原则**：
- 顶部文字风格**只保留在首页**
- 其他页面保持 nav-header 标题简洁，核心内容各自用卡片/插图表达
- 不再新增衬线大标题组件到其他页面

**影响范围**：`pages/map/map.wxss`、`pages/profile/profile.wxss`、`pages/executing/executing.wxss`、`pages/settings/settings.wxss`、`pages/command-detail/command-detail.wxss` 等（局部主题区）

### E. 导航栏图标保持不变（P0）

**当前问题**：用户担心导航栏图标被改动。

**确认**：
- `nav-header-back` 的返回箭头图标保持 `/assets/icons/chevron-left-ink.svg`
- `nav-header-title` 保持居中
- 不引入新的导航栏图标，不改动胶囊避让逻辑

**影响范围**：无文件改动，仅约束后续修改

### F. 安装微信小程序开发规范 skill（P1）

**目的**：作为代码审查和布局校验的辅助工具，减少"改一次崩一次"的问题。

**方案**：
- 搜索并安装一个微信小程序/前端最佳实践 skill（如 `vercel-labs/agent-skills` 中的前端规范，或社区 mini-program 相关 skill）
- 在后续代码修改后，使用该 skill 进行规范检查
- 若找不到合适的 skill，则明确告知用户，并继续用已有的 `scripts/check-syntax.js`、`scripts/final-check.js`、`scripts/audit-icons.js` 保证基础质量

**影响范围**：开发工作流

## Impact

- 受影响 specs：v6 layout-fixes（已完成）作为基础
- 受影响代码：
  - `app.wxss`（全局渐变背景）
  - `pages/index/index.wxml` + `index.wxss`（hero 规范化）
  - `custom-tab-bar/index.wxss`（图标不 filter 反色）
  - `pages/map/map.wxss`（地图页顶部主题区）
  - `pages/profile/profile.wxss`（个人档案主题区）
  - `pages/executing/executing.wxss`（专注状态主题区）
  - `pages/settings/settings.wxss`、`pages/command-detail/command-detail.wxss` 等局部微调
- 不影响：v6 nav-header 胶囊适配、scroll-view 高度、按钮 88rpx 规范、原生 map

## ADDED Requirements

### Requirement: 全局渐变背景
#### Scenario: 用户进入任意页面
- **WHEN** 页面渲染
- **THEN** 页面背景呈现从顶部暖橙到底部米色的平滑渐变
- **AND** 卡片仍保持白底或 `--canvas` 底色，与渐变背景有明确层次

### Requirement: 首页 Hero 文字不错位
#### Scenario: 首页顶部
- **WHEN** 首页 Hero 区渲染
- **THEN** 问候语、斜体强调词、句点三行/三段文字基线对齐
- **AND** 字号适中（64-68rpx），行高 1.15，中文清晰可读
- **AND** Pill 标签「TODAY · 周X」居中或左对齐不偏移

### Requirement: 底部按钮不被 TabBar 遮挡
#### Scenario: 指令详情页
- **WHEN** 用户摇出指令并显示"接受指令"按钮
- **THEN** 按钮底部与 TabBar 顶部有清晰间距
- **AND** 滚动到底部时按钮仍可见

### Requirement: TabBar 图标保持清晰
#### Scenario: TabBar 激活态
- **WHEN** 用户位于当前 Tab
- **THEN** 激活图标使用对应的 `-active.svg` 文件
- **AND** 不使用 CSS filter 反色导致发虚

### Requirement: 分页面视觉差异化
#### Scenario: 首页 / 地图 / 我的 / 执行中 / 设置
- **WHEN** 用户切换页面
- **THEN** 首页显示大标题 hero 区
- **AND** 其他页面使用各自的主题卡片/简洁标题，不复制首页 hero

## MODIFIED Requirements

- v8 hero-warm 渐变背景移除，改为融入全局渐变
- v8 TabBar 激活态图标渲染方式从 filter 反色改为 active SVG
- v8 `.bottom-spacer` / `.cmd-actions padding-bottom` 重新计算

## REMOVED Requirements

- 无删除，仅约束：不再把首页 hero 大标题风格套用到其他页面
