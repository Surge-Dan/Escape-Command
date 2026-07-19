# v9 全局页面视觉统一与地图/城市选择器修正 Spec

## Why

v8 完成了首页字体、顶部渐变、导航对齐与城市数据扩展，但在真机预览中仍存在页面间设计语言不一致、部分组件尺寸/位置不合理的问题：
1. 各页面顶部状态栏/导航栏背景不统一，有的页面仍有白色条；
2. 地图页当前位置组件过大、顶部未使用渐变、底部统计横条与自定义 TabBar 样式/层级冲突；
3. 城市选择页热门城市实际渲染为单列，与 v8 设计的「一行两个」不符；
4. 我的页面顶部未应用渐变，分隔线位置未对齐小程序胶囊下方。

本轮目标是建立全局一致的顶部视觉规范，并修正地图与城市选择器的具体缺陷。

## What Changes

### A. 全局顶部视觉规范（P0）

**设计原则**：
- 所有页面的 `status-bar` + `nav-header` 区域统一使用顶部暖橙渐变背景，不再出现白色块。
- 导航栏标题（如「出逃指令」「出逃地图」「我的」）下方加一条细横线作为视觉分隔，横线颜色为暖色系的低透明度色值。
- 导航栏右侧按钮/组件统一使用小型 pill 样式，与小程序胶囊按钮保持同一垂直中线和右侧安全间距。
- 分隔线位置：在所有页面中，分隔线应位于标题文字下方；在「我的」页面，分隔线额外需要位于微信小程序自带胶囊按钮下方一点点。

**实现要点**：
- 在 `app.wxss` 中统一 `.nav-header` 与 `.status-bar` 样式：背景透明（由页面根容器提供渐变）或使用与页面一致的渐变背景。
- 新增 `.nav-header-divider` 组件或伪元素，标题下方绘制 1rpx 分隔线。
- 各页面根容器（`.home-page`、`.map-page`、`.profile-page`、`.collection-page` 等）分别设置顶部渐变背景，确保导航栏透明时下方有渐变透出。

**影响范围**：`app.wxss`、`pages/index/index.wxss`、`pages/map/map.wxss`、`pages/profile/profile.wxss`、`pages/collection/collection.wxss`

### B. 地图页当前位置组件缩小（P0）

**当前问题**：地图页右上角当前位置/城市选择组件体积过大，与收藏夹页「管理」按钮不协调。

**修复方案**：
- 将地图页 `nav-header-right` 中的城市选择器改为与收藏夹「管理」按钮一致的小型 pill：
  - 高度约 48-52rpx，padding 8rpx 16rpx
  - 圆角 pill（100rpx）
  - 背景使用浅灰/半透明（`var(--canvas)` 或 `rgba(255,255,255,0.6)`）
  - 图标 + 城市名，字号 24-26rpx
  - 去掉原有绿色大背景块

**影响范围**：`pages/map/map.wxml`、`pages/map/map.wxss`

### C. 地图页顶部与底部统计条（P0）

**当前问题**：
- 地图页顶部「城市记忆」区域背景为白色，未使用渐变。
- 底部统计横条（总出逃/地点/公里/城市）与自定义 TabBar 视觉冲突，且有遮挡感。

**修复方案**：
- 地图页 `.map-page` 根容器背景设置为与首页一致的顶部暖橙渐变。
- `.map-theme`（城市记忆标题区）背景改为透明，文字颜色保持可读。
- 底部统计条 `.map-stats-bar` 改为与自定义 TabBar 一致的悬浮胶囊风格：
  - 圆角 32rpx
  - 白底 + 细边框 + 柔和阴影
  - 位于地图内容区上方，但不再贴底，留出与 TabBar 一致的安全距离
  - 统计数字与标签保持清晰

**影响范围**：`pages/map/map.wxss`、`pages/map/map.wxml`

### D. 城市选择页热门城市 2 列布局（P0）

**当前问题**：v8 实现中热门城市卡片实际渲染为单列，与预期「一行两个」不符。

**修复方案**：
- 修正 `pages/city-select/city-select.wxss` 中 `.city-grid-large` 的 `display`、`grid-template-columns` 或 flex 布局，使每个大卡片占约 48-50% 宽度，gap 约 20rpx，一行两个。
- 确保 `.city-card-large` 内部元素（emoji、城市名、数量）在大卡片内垂直/水平居中。

**影响范围**：`pages/city-select/city-select.wxss`

### E. 我的页面顶部渐变与分隔线（P0）

**当前问题**：
- 我的页面顶部区域为白色/浅色块，未使用暖橙渐变。
- 用户头像/昵称区域与导航栏之间的分隔线位置偏高或偏低。

**修复方案**：
- `.profile-page` 根容器背景设置为顶部暖橙渐变。
- 用户信息卡 `.profile-card` 背景改为透明或半透明，与渐变背景融合。
- 在导航栏标题「我的」下方添加分隔线，并确保分隔线位于微信小程序胶囊按钮下方一点点（约 8-12rpx）。
- 保留原有的头像、昵称、出逃名、编辑图标布局，仅调整背景与分隔线。

**影响范围**：`pages/profile/profile.wxss`、`pages/profile/profile.wxml`、`app.wxss`

## Impact

- 受影响 specs：`ui-polish-v8`（已完成）作为前置实现，v9 对其中的城市选择器热门布局进行修正。
- 受影响代码：
  - `app.wxss`（全局导航栏、分隔线、右侧按钮规范）
  - `pages/index/index.wxss`（导航栏透明、分隔线）
  - `pages/map/map.wxml` / `map.wxss`（当前位置 pill、顶部渐变、底部统计条）
  - `pages/profile/profile.wxml` / `profile.wxss`（顶部渐变、分隔线）
  - `pages/city-select/city-select.wxss`（热门城市 2 列）
  - `pages/collection/collection.wxss`（作为右侧按钮对齐参考）

## ADDED Requirements

### Requirement: 全局顶部视觉统一
#### Scenario: 用户切换任意页面
- **WHEN** 用户从首页切换到地图/我的/收藏夹
- **THEN** 每个页面顶部状态栏 + 导航栏都显示暖橙渐变背景
- **AND** 导航栏标题下方有一条细横线作为分隔
- **AND** 右侧按钮/组件与小程序胶囊按钮保持对齐

### Requirement: 地图页组件协调
#### Scenario: 用户打开地图页
- **WHEN** 地图页渲染
- **THEN** 右上角当前位置组件为小尺寸 pill 样式
- **AND** 页面顶部「城市记忆」区域融入渐变背景
- **AND** 底部统计条为悬浮圆角卡片，不与 TabBar 重叠或冲突

### Requirement: 城市选择页热门城市双列
#### Scenario: 用户打开城市选择页
- **WHEN** 热门推荐区渲染
- **THEN** 每个热门城市卡片在一行中占据约一半宽度
- **AND** 一行显示两个热门城市卡片

### Requirement: 我的页面顶部渐变与分隔线
#### Scenario: 用户打开我的页面
- **WHEN** 我的页面渲染
- **THEN** 顶部区域显示暖橙渐变
- **AND** 标题「我的」下方有细横线分隔
- **AND** 分隔线位于微信小程序胶囊按钮下方约 8-12rpx

## MODIFIED Requirements

- v8 首页导航栏透明 → 所有页面导航栏统一透明/渐变
- v8 地图页当前位置绿色 pill → 改为小型中性 pill
- v8 城市选择页热门城市卡片宽度 → 改为 48-50% 双列
- v8 我的页面白色顶部 → 改为暖橙渐变顶部

## REMOVED Requirements

- 无删除
