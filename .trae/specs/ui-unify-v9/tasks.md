# v9 全局页面视觉统一与地图/城市选择器修正 Tasks

## Task 1: 全局顶部渐变 + 标题分隔线
- [x] SubTask 1.1: 在 `app.wxss` 中统一 `.nav-header` 背景为透明，并添加 `.nav-header-divider` 标题下分隔线样式
- [x] SubTask 1.2: 在 `app.wxss` 中统一 `.status-bar` 背景为透明
- [x] SubTask 1.3: 修改 `pages/index/index.wxss`：确保 `.home-page` 顶部渐变覆盖 status-bar + nav-header 区域，导航栏透明
- [x] SubTask 1.4: 修改 `pages/map/map.wxss`：`.map-page` 设置顶部暖橙渐变，`.nav-header` 透明，分隔线可见
- [x] SubTask 1.5: 修改 `pages/profile/profile.wxss`：`.profile-page` 设置顶部暖橙渐变，`.nav-header` 透明，分隔线位于胶囊下方
- [x] SubTask 1.6: 修改 `pages/collection/collection.wxss`：`.collection-page` 设置顶部暖橙渐变，`.nav-header` 透明
- [x] SubTask 1.7: 更新所有页面 wxml，在 `.nav-header-title` 下方插入 `.nav-header-divider`（或使用伪元素实现）
- [x] SubTask 1.8: 验证所有页面顶部无白色条

## Task 2: 地图页当前位置组件小型化
- [x] SubTask 2.1: 修改 `pages/map/map.wxml`：城市选择器结构改为小型 pill（图标 + 城市名 + 箭头）
- [x] SubTask 2.2: 修改 `pages/map/map.wxss`：移除绿色大背景，改为高 48-52rpx、圆角 pill、浅灰/半透明背景
- [x] SubTask 2.3: 调整 `.nav-header-right` 内城市选择器的 padding/gap，与收藏夹「管理」按钮视觉一致
- [x] SubTask 2.4: 真机验证城市选择器与胶囊按钮对齐且不重叠

## Task 3: 地图页顶部区域与底部统计条
- [x] SubTask 3.1: 修改 `pages/map/map.wxss`：`.map-theme`（城市记忆区）背景改为透明，文字颜色保持可读
- [x] SubTask 3.2: 修改 `pages/map/map.wxss`：`.map-stats-bar` 改为悬浮胶囊卡片样式（圆角 32rpx、白底、细边框、柔和阴影）
- [x] SubTask 3.3: 调整 `.map-stats-bar` 位置，使其不贴底、不被 TabBar 遮挡，且与自定义 TabBar 风格统一
- [x] SubTask 3.4: 真机验证底部统计条与 TabBar 无重叠

## Task 4: 城市选择页热门城市双列修复
- [x] SubTask 4.1: 修改 `pages/city-select/city-select.wxss`：`.city-grid-large` 改为 `display: grid; grid-template-columns: repeat(2, 1fr); gap: 20rpx`
- [x] SubTask 4.2: 调整 `.city-card-large` 内部布局，确保 emoji、城市名、数量居中且不自适应成单列
- [x] SubTask 4.3: 验证热门城市一行两个，无单列情况

## Task 5: 我的页面顶部渐变与分隔线
- [x] SubTask 5.1: 修改 `pages/profile/profile.wxss`：`.profile-page` 根容器设置顶部暖橙渐变
- [x] SubTask 5.2: `.profile-card` 背景改为透明/半透明，与渐变融合
- [x] SubTask 5.3: 在「我的」标题下方添加分隔线，并确保分隔线位于胶囊按钮下方约 8-12rpx
- [x] SubTask 5.4: 真机验证我的页面顶部渐变自然、分隔线位置正确

## Task 6: 全局右侧按钮对齐检查
- [x] SubTask 6.1: 检查所有页面的 `.nav-header-right` 或右侧按钮是否与胶囊按钮保持对齐
- [x] SubTask 6.2: 修复任何未对齐的右侧按钮

## Task 7: 最终验证
- [x] SubTask 7.1: 运行 `scripts/check-syntax.js` 通过
- [x] SubTask 7.2: 运行 `scripts/final-check.js` 通过
- [x] SubTask 7.3: 运行 `scripts/audit-icons.js` 通过
- [x] SubTask 7.4: 运行 `scripts/validate-svgs.js` 通过
- [x] SubTask 7.5: 真机预览首页、地图页、城市选择页、我的页、收藏夹页，确认 v9 所有问题修复

# Task Dependencies

- Task 1 为全局基础，优先完成
- Task 2、Task 3 依赖 Task 1（地图页顶部渐变）
- Task 4 独立，可并行
- Task 5 依赖 Task 1（全局分隔线规范）
- Task 6 依赖 Task 1、Task 2
- Task 7 依赖所有 Task
