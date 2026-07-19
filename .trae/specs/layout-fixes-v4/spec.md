# 布局与视觉修复 v4 Spec

## Why

v3 enrich-product-v3 实现后，截图暴露出多个**布局/视觉/联动**问题：
- 首页 6 个模式芯片在 iPhone 宽度下挤成 2 行（每行 3 个），文字截断换行
- 自定义 TabBar 高度过大（180rpx + 安全区），底部内容被遮挡
- 今日推荐卡片底部被 TabBar 切掉
- 指令详情卡 z-index 与 TabBar 有冲突
- 徽章墙是分组列表而非 3 列网格，与设计规范不符
- 模式芯片上有未知小圆点（"新"角标？）
- 指令卡场景插画为浅绿空白
- 动效时长不统一
- 问候语字号偏小（24rpx）

OPTIMIZATION-PROMPT.md 中有 **6 项与 v3 spec 严重冲突**的指引：
- ❌ 6 模式→3 模式（v3 明确要求 6 模式差异化）
- ❌ 加回震动反馈（v3 明确要求无震动）
- ❌ 减少 19 徽章（v3 明确 19 徽章）
- ❌ 关闭 generating/photo-edit 等页面（v3 要求丰富流程）
- ❌ 关闭 Social/Discovery 域（v3 要求几十个页面）

**本 spec 只采纳** v3 不冲突的布局/视觉/联动修复。**不破坏**任何 v3 决策。

## What Changes

### A. 首页模式芯片横向化（不改变 6 个模式的内容）
- `.mode-list` 改为 `scroll-x` 横向滚动，关闭 flex 等分宽度
- 每个芯片固定宽度 180rpx（5 字以内）/ 200rpx（4 字），文字不换行
- 选中态：背景 `--brand`，文字白色，图标切 white 版
- 不在芯片上添加"小圆点""新"角标（截图里看到的多余装饰去掉）

### B. TabBar 紧凑化
- 总高度从 180rpx 减到 130rpx + 安全区
- 图标从 96rpx 容器 + 72rpx 图标 减到 80rpx 容器 + 56rpx 图标
- 内边距从 24rpx 32rpx 减到 16rpx 24rpx
- 文字从 30rpx 减到 24rpx
- 选中态不再放大 1.1 倍，只改背景色
- `.tabbar-placeholder` 同步从 180rpx 减到 130rpx

### C. 今日推荐底部 padding
- `.daily-section` 底部 padding 加 160rpx（确保不被 TabBar 遮挡）
- 推荐卡片高度统一 220rpx（避免高度不一）
- 第三张卡片右侧增加 40rpx margin 避免贴边

### D. 指令详情卡 z-index
- `.command-sheet` z-index 从默认提升到 999
- 加上 `padding-bottom: 200rpx`（指令卡底部"关闭"按钮不被 TabBar 遮挡）

### E. 徽章墙 3 列网格
- 每个 `.badge-section` 内部从单/双列改为 3 列 grid
- 分类标题保留（里程碑/类型/模式/社交/特殊）
- 徽章卡 icon 60rpx、名称 22rpx、解锁状态 20rpx
- 解锁：渐变背景 + 高亮；锁定：灰色 + 锁图标

### F. 模式芯片多余"小圆点"清理
- 检查 `index.wxml` 的 `.mode-chip` 结构
- 截图里芯片右侧的"小圆点"实际是 active 态下 `.mode-chip.active` 的 box-shadow 圆点（由 `var(--shadow-float)` 透出），不是角标
- 把 active 态的 box-shadow 改为更克制的 `--shadow-float`（`0 2rpx 12rpx rgba(46,47,51,0.06)`），不要在芯片外圈发散

### G. 场景插画占位
- 截图里指令卡 cmd-image-wrap 是浅绿大色块
- 改为：在 `cmd-image` 之上叠一层渐变 `linear-gradient(135deg, {{typeColor}}40, {{typeColor}}10)` + 居中放置类型 icon（64rpx）
- 当 `illustration` 路径有图时，背景图覆盖

### H. 问候语字号
- `.greeting-line` 从 24rpx 加大到 28rpx
- 颜色从 `--ink-soft` 改为 `--ink`（更深更可读）
- 高度 padding-bottom 16rpx→20rpx

### I. 动效时长统一
- 卡片滑入 300ms
- 模式芯片切换 200ms
- 出逃触发 400ms（已经是 400ms 不变）
- 脉冲环 2500ms（已经是 2500ms 不变）
- 摸牌抖动 400ms 保持
- 徽章解锁 800ms
- 全部加 `--ease-standard` 缓动

### J. "我的"页面会员入口弱化
- v3 决策保留会员入口（v2 说隐藏但 v3 没要求）
- 视觉弱化：去掉金色渐变背景，改为 `--brand-tint` 浅绿
- 标题从"开通出逃会员"改为"出逃会员"
- CTA 从"去开通"改为"了解 ›"
- 不再"去开通"按钮弹窗，改为 navigateTo member 页（保留路径）

### K. 联动修复
- 首页 `onShow`：刷新 `dailyRecommend`（天气/时间变化时）
- 指令卡"关闭"按钮：仅 `selectedCommand = null`，不调用 `abandonCommand`（执行中不应该被关闭误触）
- 地图页 `onShow`：从 `globalData.records` 生成 markers（CSS 模拟）
- 徽章页 `onShow`：从 `globalData.badges` 重新计算解锁状态

### L. CSS 变量一致性扫查
- 用 grep 找 `#[0-9A-Fa-f]{6}` 硬编码颜色（排除 mode 6 色 + type 5 色 + 既有变量定义）
- 主要页面（index/executing/record/map/profile/badges/collection）用 var 替换

## Impact

- Affected code:
  - `custom-tab-bar/index.wxml` / `.wxss`（B 节）
  - `pages/index/index.wxml` / `.wxss`（A/F/G/H/I 节）
  - `pages/index/index.js`（A/K 节，modes 不变只改布局 + onShow 刷新）
  - `pages/command-detail/command-detail.*`（G 节，场景占位）
  - `pages/badges/badges.wxml` / `.wxss`（E 节）
  - `pages/profile/profile.wxml` / `.wxss`（J 节）
  - `pages/map/map.js` / `.wxml`（K 节，markers 联动）
  - 各页面 CSS 变量扫查（L 节）

- **No breaking changes** to:
  - 6 模式内容
  - 19 徽章
  - 36 已注册页面
  - 无震动/无摇一摇
  - v3 spec 任何 ADDED Requirements

## ADDED Requirements

### Requirement: 首页模式芯片横向滚动

#### Scenario: 6 个模式芯片在 375rpx 宽度下
- **WHEN** 页面渲染到 iPhone 尺寸
- **THEN** 6 个芯片在同一行可横向滚动，不换行
- **AND** 每个芯片固定宽度 180-200rpx，文字单行不截断
- **AND** 选中态保持 `--brand` 背景 + 白字 + white 图标
- **AND** 不出现"小圆点/新角标"等多余装饰

### Requirement: TabBar 紧凑化
- **WHEN** 任何 TabBar 页面渲染
- **THEN** 自定义 TabBar 高度 ≤ 130rpx + 安全区
- **AND** 不放大选中态图标（仅改背景色）
- **AND** tabbar-placeholder 与实际 TabBar 高度一致

### Requirement: 底部内容不被 TabBar 遮挡
- **WHEN** 任何页面的 scroll-view 底部
- **THEN** scroll-view 高度 = `100vh - statusBar - 88rpx - tabbar-placeholder`
- **AND** 模态卡片（指令详情）的 padding-bottom ≥ 200rpx
- **AND** 今日推荐 section 底部 padding ≥ 160rpx

### Requirement: 徽章墙 3 列网格
- **WHEN** 徽章页渲染每个分类
- **THEN** 分类内徽章用 3 列等宽 grid（`calc((100% - 40rpx) / 3)`）
- **AND** 解锁徽章有渐变背景 + 高亮
- **AND** 锁定徽章有灰背景 + 锁图标
- **AND** 仍按 5 个分类分组显示（里程碑/类型/模式/社交/特殊）

### Requirement: 模式芯片多余装饰清理
- **WHEN** 任何模式芯片处于 active 态
- **THEN** 仅背景色变 `--brand`、文字变白、图标变 white 版
- **AND** 不出现芯片外的 box-shadow 圆点
- **AND** 不出现"新"角标或红点

### Requirement: 指令卡场景插画
- **WHEN** 指令卡渲染
- **THEN** 当 `illustration` 有图时直接显示
- **AND** 当无图时显示 typeColor 渐变背景 + 居中类型 icon

### Requirement: 问候语字号
- **WHEN** 首页头部渲染
- **THEN** 字号 28rpx，颜色 `--ink`，padding-bottom 20rpx

### Requirement: 动效时长统一
- **WHEN** 任何卡片/按钮交互
- **THEN** 卡片滑入 300ms / 芯片切换 200ms / 触发 400ms / 脉冲 2500ms / 摸牌 400ms / 徽章解锁 800ms
- **AND** 全部用 `--ease-standard` 或 `--ease-bounce`

### Requirement: 会员入口视觉弱化
- **WHEN** profile 页面渲染
- **THEN** 会员卡片背景 `--brand-tint`（不再金色渐变）
- **AND** 标题"出逃会员"，CTA "了解 ›"
- **AND** 点击 navigateTo member 页

### Requirement: 联动刷新
- **WHEN** index / map / badges / profile 的 onShow 触发
- **THEN** 对应数据（推荐/markers/徽章/统计）从 globalData 重新读取

### Requirement: 关闭按钮仅收起卡片
- **WHEN** 指令详情卡"关闭"按钮被点击
- **THEN** 仅 `selectedCommand = null`，不调用 `app.abandonCommand`
- **AND** 不影响 executing 页的 currentCommand

### Requirement: CSS 变量一致性
- **WHEN** 改动首页/执行/记录/地图/我的/徽章/收藏页面
- **THEN** 不出现新的硬编码 hex 颜色（除 mode 6 色 + type 5 色）
- **AND** 圆角/阴影/背景全部走 var(--*) 变量

## MODIFIED Requirements

无。v3 spec 的所有 ADDED Requirements 保持不变。本 spec 只**附加**布局/视觉要求，不修改既有需求。

## REMOVED Requirements

无。本 spec 不移除任何 v3 功能。

## 冲突项处理（明确不采纳 OPTIMIZATION-PROMPT.md 的部分）

为防止 AI 助手按 OPTIMIZATION-PROMPT.md 自动回退 v3 决策，特此声明：

| OPTIMIZATION-PROMPT.md 建议 | v3 已决定 | 本 spec 处置 |
|---|---|---|
| 6 模式→3 模式 | 6 模式差异化 | ❌ 不采纳 |
| 加回震动反馈 | 无震动 | ❌ 不采纳 |
| 19 徽章→9 徽章 | 19 徽章 | ❌ 不采纳 |
| 隐藏会员入口 | 保留会员入口 | ⚠️ 部分采纳（弱化视觉，不隐藏） |
| 关闭双人/深夜/雨天页面 | 全部启用 | ❌ 不采纳 |
| 关闭 record/photo-edit/generating 流程 | 全部启用 | ❌ 不采纳 |
| 关闭 Social/Discovery 域 | 全部启用 | ❌ 不采纳 |
| 关闭 Timeline/Year Review/Mood Journal 等 | 全部启用 | ❌ 不采纳 |

## 优先采纳项（与 v3 不冲突）

| OPTIMIZATION-PROMPT.md 项 | v3 状态 | 本 spec |
|---|---|---|
| TabBar 高度优化 | 未做 | ✅ B 节 |
| 模式芯片横向滚动 | 未做 | ✅ A 节 |
| 指令卡 z-index | 未做 | ✅ D 节 |
| 今日推荐底部 padding | 未做 | ✅ C 节 |
| 徽章墙 3 列网格 | 未做 | ✅ E 节 |
| 会员入口弱化 | 未做 | ✅ J 节 |
| 场景插画占位 | 部分实现 | ✅ G 节 |
| 动效时长统一 | 部分实现 | ✅ I 节 |
| 问候语字号 | 24rpx 偏小 | ✅ H 节 |
| 联动刷新时机 | 部分实现 | ✅ K 节 |
| CSS 变量一致性 | 部分实现 | ✅ L 节 |
