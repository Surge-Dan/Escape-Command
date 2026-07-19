# v13 地图 pill 贴右与悬浮按钮图标真机可见 Spec

## Why

v12 上线后真机验证暴露两个根因未闭环的问题：
1. 地图页「当前位置」pill 仍不贴右——根因是 `.map-theme` 错误应用了 `style="{{navHeaderStyle}}"`，导致 padding-right 被设置成约 100px（胶囊避让宽度），把 pill 推离右边缘；主题区位于导航栏下方，根本不需要避让胶囊按钮。
2. 右下两个悬浮按钮（+ 和定位）真机只显示白色圆圈，看不到图标——根因是 `plus-brand.svg` 仅含 `<line>` 元素、`locate-current.svg` 含 `<circle stroke>` + `<line>`，cover-image 真机对 SVG 基础形状渲染支持极差；且 `binderror` 仅在资源加载失败时触发，SVG "加载成功但元素不渲染"时不触发，导致兜底文字永远不显示。

## What Changes

### A. 地图主题区移除错误的 navHeaderStyle（P0）
- 从 `pages/map/map.wxml` 的 `.map-theme` 移除 `style="{{navHeaderStyle}}"`；
- 保持 `.map-theme` 自身的 `padding: 32rpx 24rpx 32rpx 40rpx`（右侧 24rpx，贴右边缘）；
- `.map-city-pill` 已有 `margin-left: auto`，移除 navHeaderStyle 后即可真正贴右。

### B. 悬浮按钮图标改用 CSS 绘制，放弃 cover-image + SVG（P0）
- **+ 按钮**：移除 `<cover-image src="plus-brand.svg">`，改用 `<cover-view class="plus-icon">` + CSS 伪元素 / border 绘制加号；
- **定位按钮**：移除 `<cover-image src="locate-current.svg">` 和兜底文字逻辑，改用 `<cover-view class="locate-icon">` + CSS 绘制定位十字图标；
- CSS 绘制方案在 cover-view 真机渲染 100% 可见，不依赖 SVG 解析；
- 移除 `locateError` / `onLocateIcoError` 相关逻辑（不再需要兜底）。

## Impact

- 受影响 specs：`ui-refine-v12`（Task 3-6 的部分改动被修正）。
- 受影响代码：
  - `pages/map/map.wxml`（移除 navHeaderStyle、替换 cover-image）
  - `pages/map/map.wxss`（新增 CSS 图标样式、调整 padding）
  - `pages/map/map.js`（移除 locateError / onLocateIcoError）

## ADDED Requirements

### Requirement: 地图页当前位置 pill 真正贴右
#### Scenario: 用户打开地图页
- **WHEN** 主题区渲染
- **THEN** 「当前位置」pill 紧贴右边缘，距离约 24rpx
- **AND** 不受胶囊按钮避让影响

### Requirement: 地图右下悬浮按钮图标在真机可见
#### Scenario: 用户打开地图页
- **WHEN** 地图页渲染
- **THEN** + 按钮显示清晰的加号图标
- **AND** 定位按钮显示清晰的定位十字图标
- **AND** 不依赖 SVG cover-image 渲染

## MODIFIED Requirements

- v12 `.map-theme` 应用 navHeaderStyle → 移除该属性
- v12 cover-image + SVG 图标 → 改用 cover-view + CSS 绘制

## REMOVED Requirements

### Requirement: cover-image SVG 图标与 binderror 兜底
**Reason**: cover-image 真机对 SVG 基础形状渲染不稳定，binderror 无法捕获"加载成功但元素不渲染"
**Migration**: 改用 cover-view + CSS 绘制，100% 真机可见
