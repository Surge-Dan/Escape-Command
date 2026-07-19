# Tasks

- [x] Task 1: 地图主题区移除 navHeaderStyle，让 pill 真正贴右
  - [x] SubTask 1.1: 修改 `pages/map/map.wxml`，从 `.map-theme` 移除 `style="{{navHeaderStyle}}"`
  - [x] SubTask 1.2: 确认 `.map-theme` 的 padding 为 `32rpx 24rpx 32rpx 40rpx`（右侧 24rpx 贴边）
  - [x] SubTask 1.3: 运行 `node scripts/final-check.js` 并通过

- [x] Task 2: 悬浮按钮图标改用 CSS 绘制
  - [x] SubTask 2.1: 修改 `pages/map/map.wxml`：移除 + 按钮的 `<cover-image src="plus-brand.svg">`，替换为 `<cover-view class="plus-icon"></cover-view>`
  - [x] SubTask 2.2: 修改 `pages/map/map.wxml`：移除定位按钮的 `<cover-image src="locate-current.svg">` 和兜底 `<cover-view class="locate-fallback">`，替换为 `<cover-view class="locate-icon"></cover-view>`
  - [x] SubTask 2.3: 修改 `pages/map/map.wxss`：新增 `.plus-icon`（用 ::before/::after 或 border 画加号）、`.locate-icon`（用 border + 定位画十字）样式，颜色使用品牌色
  - [x] SubTask 2.4: 修改 `pages/map/map.js`：移除 `locateError` data 字段与 `onLocateIcoError` 方法
  - [x] SubTask 2.5: 运行 `node scripts/check-syntax.js`、`node scripts/final-check.js` 并通过

# Task Dependencies

- Task 1 和 Task 2 改动同一文件，建议串行执行避免冲突
