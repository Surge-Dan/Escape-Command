# v6 全页面修复 Spec

## Why

v5 落地后用户给出详细修复规格，暴露 3 类问题：
1. **地图页根本没原生 map**：当前 `<view class="map-canvas">` 是 CSS 模拟，用户明确要求"修复地图组件不显示，确保原生map组件正常渲染、全屏展示"
2. **scroll-view 高度全部错算 16rpx**：v5 把 nav-header 从 88rpx 改到 72rpx，但 12+ 个页面的 `scroll-view style="height: calc(100vh - {{statusBarHeight}}px - 88rpx);"` 没同步更新
3. **nav-header 没避开微信胶囊**：当前 `position: relative; padding: 0 32rpx`，右侧没动态计算胶囊左边缘，标题可能被胶囊遮挡

## What Changes

### A. 全局：nav-header 胶囊安全区适配（P0）

**当前问题**：nav-header 用固定 `padding: 0 32rpx`，标题居中时可能被右上角胶囊按钮遮挡。

**修复方案**：
- `app.js` onLaunch 调用 `wx.getMenuButtonBoundingClientRect()` 获取胶囊位置
- 计算 `navPaddingRight = screenWidth - capsuleLeft + 8rpx`
- `navHeaderStyle` 注入到所有页面的 nav-header：`style="padding-right: {{navPaddingRight}}px;"`
- 标题 `nav-header-title` 改用绝对定位居中（避免 padding 影响居中）
- nav-header 总高度规范：`statusBarHeight + 44px`（即状态栏 + 标准导航高度）

**影响范围**：app.js + 所有有 nav-header 的页面（30+ 页）

### B. 全局：scroll-view 88rpx → 72rpx 批量修复（P0）

12+ 个页面的 scroll-view height calc 用了旧的 88rpx，与 v5 的 72rpx nav-header 不匹配。

**修复**：全项目 grep `88rpx);"` 在 wxml 里，逐一改为 `72rpx);"`。
- `pages/badges/badges.wxml:11`
- `pages/badge-detail/badge-detail.wxml:11`
- `pages/achievements/achievements.wxml:11`
- `pages/city-progress/city-progress.wxml:14`
- `pages/community/community.wxml:26`
- `pages/collection/collection.wxml:50`
- `pages/city-select/city-select.wxml:11`
- `pages/help/help.wxml:11`
- `pages/mode-intro/mode-intro.wxml:10`
- `pages/command-detail/command-detail.wxml:10`
- `pages/collection-category/collection-category.wxml:29`
- `pages/data-export/data-export.wxml:11`
- `pages/leaderboard/leaderboard.wxml:18`
- `pages/year-review/year-review.wxml:14`
- `pages/profile/profile.wxss:9`（已修，但需复核）

### C. 全局：按钮规范升级（P0）

当前 `.btn-primary` 80rpx、`.btn-secondary` 64rpx，用户要求统一 88rpx。

**修复 app.wxss**：
- `.btn-primary` min-height 80rpx → 88rpx，font-size 28rpx → 32rpx
- `.btn-secondary` min-height 64rpx → 88rpx，font-size 28rpx → 30rpx
- 全项目 grep `min-height: 80rpx|min-height: 64rpx` 在按钮上下文，统一到 88rpx
- 可点击区域 < 88rpx × 88rpx 的全部放大

### D. 地图页：切原生 map + cover-view 叠加（P0，大改）

**用户明确要求**："修复地图组件不显示，确保原生map组件正常渲染、全屏展示；地图叠加的悬浮元素使用 cover-view / cover-image 实现"

**方案**：
- `pages/map/map.wxml` 把 `<view class="map-canvas mode-{{activeTab}}">` 替换为 `<map class="map-native" ...>` + `<cover-view class="map-overlay">` 结构
- 原生 map 属性：`latitude / longitude / scale / markers / polyline / show-location`
- 3 模式差异化通过 markers/polyline 配置实现：
  - **all 模式**：显示所有 markers（pin 图标按 type 着色）
  - **heat 模式**：markers 改用 callout 形式，按密度调整 size + color（蓝/黄/红）
  - **route 模式**：markers + polyline 连线（按时间顺序）
- 所有悬浮 UI（模式 tab、时间筛选、定位按钮、底部数据卡）用 `<cover-view>` / `<cover-image>` 包裹
- 保留 v5 的视觉差异化思路，但实现层从 CSS 切到 map 组件配置
- 地图高度：`calc(100vh - {{statusBarHeight}}px - 72rpx - {{mapControlsHeight}}rpx)`

**降级方案**：如果原生 map 在某些场景渲染异常，保留 v5 CSS 模拟作为 `<cover-view wx:if="{{mapError}}">` 降级

### E. 全局：边距体系统一 40rpx（保留 v5 决策）

用户规格要求 32rpx，但 v4/v5 已落地 40rpx。**保留 40rpx**（视觉更舒展，返工量最小）。

**修复**：全项目 grep `padding: .* 32rpx|padding-left: 32rpx|padding-right: 32rpx` 在页面级容器，统一到 40rpx。仅修页面容器，不动 nav-header（32rpx 合理）和卡片内边距。

### F. 全局：TabBar 保留 130rpx + 安全区（保留 v4 决策）

用户规格要求 100rpx，但 v4 已落地 130rpx + safe-area。**保留 130rpx**（紧凑但留呼吸空间，且已验证不错位）。

**修复**：复核所有 tabbar-placeholder / bottom-spacer 一致性（v5 已修，复核即可）。

### G. 分页面修复（P1）

按用户规格逐页核查：

1. **首页**：问候行间距、模式芯片 64rpx 高度全圆角、算法懂你提示条、主操作卡片骰子尺寸、收藏入口卡片边距、今日推荐卡片高度
2. **指令详情弹出卡**：3:2 场景插画、元信息标签间距、底部 3 按钮统一
3. **执行中页面**：计时/步数卡片、出逃步骤序号、拍照占位框虚线、完成按钮全宽
4. **地图页**（D 节已覆盖）
5. **我的页面**：5 分类卡左右边距对齐用户卡/统计卡（v5 已做，复核）、圆形底图标统一、模块间距
6. **指令详情独立页**：元信息栏 4 项均匀、完成步骤折叠箭头、底部 3 按钮均分

## Impact

- **大改**：pages/map/map.wxml + .wxss + .js（切原生 map）
- **批量改**：14 个 wxml 的 scroll-view 88rpx → 72rpx
- **全局改**：app.wxss 按钮规范、app.js 胶囊计算、nav-header padding-right
- **复核**：6 个主页面边距/按钮/卡片一致性
- **不破坏**：v3 6模式/19徽章/39页/无震动；v4 z-index/模式芯片/TabBar 130rpx；v5 nav-header 72rpx毛玻璃/5分类卡/quick-grid 删除

## ADDED Requirements

### Requirement: nav-header 胶囊安全区
#### Scenario: 任何有 nav-header 的页面
- **WHEN** nav-header 渲染
- **THEN** 右侧 padding = 屏幕宽 - 胶囊左边缘 + 8rpx
- **AND** 标题绝对居中，不被胶囊遮挡
- **AND** 总高度 = statusBarHeight + 44px

### Requirement: scroll-view 高度匹配 nav-header
#### Scenario: 任何有 scroll-view 的页面
- **WHEN** scroll-view 计算 height
- **THEN** 用 `100vh - statusBarHeight - 72rpx`（不再用 88rpx）

### Requirement: 按钮统一 88rpx
#### Scenario: 任何主/次按钮
- **WHEN** 按钮渲染
- **THEN** min-height 88rpx
- **AND** 主按钮字号 32rpx，次按钮 30rpx
- **AND** 可点击区域 ≥ 88rpx × 88rpx

### Requirement: 地图页原生 map
#### Scenario: 用户进入地图页
- **WHEN** 地图渲染
- **THEN** 使用原生 `<map>` 组件
- **AND** 悬浮 UI 用 cover-view/cover-image
- **AND** 3 模式通过 markers/polyline 配置差异化
- **AND** 底部预留 TabBar 高度

## MODIFIED Requirements

- v5 `.nav-header` 增加 `padding-right` 动态注入（其他属性不变）
- v5 `.btn-primary` / `.btn-secondary` 升级到 88rpx

## REMOVED Requirements

- v5 `.map-canvas` CSS 模拟（替换为原生 map）—— 保留作为降级方案
