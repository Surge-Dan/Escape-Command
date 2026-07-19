# v5 综合修复 Spec

## Why

v4 完成后用户报告 5 个**新增/遗留**布局问题：

1. **首页底部有 4 个彩色图标被 TabBar 遮挡** —— 这是首页的 `quick-grid`（时间线/每日挑战/搭档/社区），位置在 "今日推荐" 之后，与个人页"全部功能"重复
2. **地图页没真实地图** —— 当前是 CSS 模拟 (`map-grid-bg` + 标记点)，用户希望"不同类型的地图应做好区分"
3. **个人页所有功能单列竖排** —— `entries-grid` 当前是单列，应分类网格化
4. **响应式差** —— 不同手机尺寸会错位
5. **导航栏丑且宽** —— 当前 88rpx + 单线 border，没毛玻璃效果

## What Changes

### A. 首页清理 quick-grid（与个人页重复）
- **删除** `pages/index/index.wxml` 的 `quick-grid` 整段（line 69-95）
- **删除** `pages/index/index.wxss` 的 `.quick-grid` / `.quick-item` / `.quick-icon` / `.quick-label` 相关样式
- **删除** `pages/index/index.js` 的 `goTimeline` / `goChallenge` / `goPartner` / `goCommunity` 4 个方法
- 首页"今日推荐"之后直接接 `bottom-spacer`，避免冗余

### B. 地图页 3 模式视觉差异化（CSS 模拟升级）
- **All 模式**：保留网格地图 + 标记点 pin，加渐变天空光 + 微动云朵
- **Heat 模式**：背景改为 6x6 暗色 grid，cell 用径向渐变 + 模糊发光，根据 intensity 显示不同颜色（蓝→黄→红）
- **Route 模式**：背景改为深色地图样式，路线用 SVG 风格曲线（点之间用贝塞尔曲线近似），加路径起点/终点标记
- 加 `map-mode-transition` 200ms 切换动画
- 顶部增加 "出逃地图" 大标题副标题（基于当前城市/统计）

### C. 个人页"全部功能"分类网格化
- 把 9 个 entry-card 重新组织为 4-5 个**分类卡片**
- 每个分类卡片：图标 + 标题 + 描述 + 2x2 内部子项
- 分类建议：
  1. **回顾**（时间线 / 年度回顾 / 心情日记 / 城市足迹）
  2. **互动**（搭档 / 邀请 / 排行榜 / 社区）
  3. **收藏**（我的收藏 / 收藏分类 / 数据导出 / 主题市场）
  4. **设置**（每日挑战 / 成就墙 / 个人资料 / 帮助 / 关于）
  5. **会员**（出逃会员）
- 每个分类卡高度约 200rpx，内部子项 4 个一排小图标
- 删除旧的单列 `entries-grid` 容器

### D. 响应式加固（多机兼容）
- **统一安全区**：所有页面顶部 padding 用 `env(safe-area-inset-top) + statusBarHeight`
- **统一底部间距**：scroll-view 底部加 `bottom-spacer` = 130rpx + env(safe-area-inset-bottom)
- **统一水平 padding**：40rpx（不写死 32rpx 混用）
- **统一卡片宽度**：`width: 100%`，左右 padding 通过父容器
- **统一栅格**：2 列 grid 用 `calc((100% - 24rpx) / 2)`，3 列用 `calc((100% - 40rpx) / 3)`
- **统一字号层级**：`.h1 44 / .h2 36 / .h3 30 / .body 28 / .caption 24 / .small 22`（不偏离全局）
- 审查 index/map/profile/badges/executing/record/collection 6 个主要页面的 wxss，对比是否一致
- 给常用 min-height 设 max-height fallback（防止超长屏拉伸）

### E. 导航栏毛玻璃 + 紧凑
- **高度**：从 88rpx 减到 72rpx
- **背景**：`rgba(245, 243, 239, 0.72)`（匹配 canvas 色） + `backdrop-filter: blur(40px) saturate(2)`
- **边框**：去掉 1rpx 底边线，改用内阴影或更低对比的 `0 1rpx 0 rgba(122,78,43,0.04)`
- **back 按钮**：从 64rpx 减到 56rpx
- **title 字号**：从 32rpx 减到 30rpx
- **right 区域**：紧凑 (gap 12rpx)
- **全页面统一样式**：在 app.wxss 升级 `.nav-header`
- 兼容 iOS notch / Android 异形屏（已经有 env safe-area）

### F. 视觉高级感
- **shadow 体系**：所有卡片用 `var(--shadow-card)` 或 `var(--shadow-elevated)`，统一阴影强度
- **glass-card 复用**：nav-header / popup / 部分列表用 `var(--white)0.82` + blur
- **圆角节奏**：xl 36 / lg 28 / md 20 / sm 12 / pill 100（不偏离）
- **hover/active 反馈**：所有可点击元素 `:active { transform: scale(0.97) }` + 颜色变化
- **动效曲线**：统一 `var(--ease-standard)` / `var(--ease-bounce)`

## Impact

- Affected code:
  - `pages/index/index.wxml` / `.wxss` / `.js`（A 节）
  - `pages/map/map.wxml` / `.wxss`（B 节）
  - `pages/profile/profile.wxml` / `.wxss` / `.js`（C 节）
  - 6 个主要页面的 wxss（D 节）
  - `app.wxss`（D + E + F 节，全局 nav-header/glass-card/层级）

- **No breaking changes** to:
  - 6 模式内容
  - 19 徽章
  - 36 已注册页面
  - 无震动/无摇一摇
  - v3 spec 任何 ADDED Requirements
  - v4 spec 已落地的 layout 修复

## ADDED Requirements

### Requirement: 首页无 quick-grid 重复入口
#### Scenario: 首页底部
- **WHEN** 首页渲染到 `!selectedCommand` 状态
- **THEN** "今日推荐" 之后直接接 `bottom-spacer`
- **AND** 没有任何彩色 quick-grid 图标
- **AND** 底部 TabBar 不遮挡任何首页内容

### Requirement: 地图页 3 模式视觉差异化
#### Scenario: 切换 all/heat/route
- **WHEN** 用户点击地图 tab
- **THEN** 200ms 平滑切换
- **AND** all 模式：浅色网格背景 + pin 标记
- **AND** heat 模式：6x6 暗色 grid + 蓝黄红径向发光
- **AND** route 模式：深色地图样式 + 路径曲线

### Requirement: 个人页 5 分类卡片
#### Scenario: 滚动到"全部功能"
- **WHEN** 用户看到个人页
- **THEN** 显示 4-5 个分类卡（回顾/互动/收藏/设置/会员）
- **AND** 每个分类卡内部 2-4 个子项网格排列
- **AND** 不再单列竖排
- **AND** 所有子项可点击 navigateTo 对应页面

### Requirement: 响应式一致性
#### Scenario: iPhone SE / iPhone 14 Pro Max / Android 6.5 寸
- **WHEN** 任何主要页面渲染
- **THEN** 顶部留出 `statusBarHeight + 8rpx`
- **AND** 底部留出 `130rpx + env(safe-area-inset-bottom)`
- **AND** 左右 padding 40rpx 一致
- **AND** 卡片宽度自适应父容器

### Requirement: 导航栏毛玻璃
#### Scenario: 任何有 nav-header 的页面
- **WHEN** nav-header 渲染
- **THEN** 高度 72rpx（不超 80rpx）
- **AND** 背景 `rgba(245, 243, 239, 0.72)` + `backdrop-filter: blur(40px)`
- **AND** title 字号 30rpx
- **AND** 无 1rpx 硬底边线

### Requirement: 视觉高级感统一
#### Scenario: 任何主页面
- **WHEN** 任何卡片/按钮渲染
- **THEN** 使用 var(--shadow-card) 或 var(--shadow-elevated) 阴影
- **AND** 圆角走 var(--radius-*)
- **AND** active 态有 scale(0.97) + 颜色变化
- **AND** 动效走 var(--ease-standard/bounce)

## MODIFIED Requirements

无。v3 + v4 spec 的所有 ADDED Requirements 保持不变。本 spec 只**附加**布局/视觉/分类修复。

## REMOVED Requirements

- 首页 `quick-grid` 4 个快捷入口（v3 残留，与个人页重复）

## 优先采纳项（与既有 spec 不冲突）

- ✅ 首页清理
- ✅ 地图 3 模式视觉差异化
- ✅ 个人页分类卡片
- ✅ 响应式
- ✅ 导航栏毛玻璃
- ✅ 视觉高级感
