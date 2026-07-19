# Tasks

- [x] Task 1: 修复首页 Hero 中文字体在真机显示宋体/思源宋体
  - [x] SubTask 1.1: 在 `assets/fonts/` 放置本地思源宋体 WOFF2 子集（控制在 1.5MB 以内）
  - [x] SubTask 1.2: 修改 `pages/index/index.js` 的 `loadFontFace`，优先加载本地字体 `/assets/fonts/source-han-serif-cn.woff2`
  - [x] SubTask 1.3: 优化 `pages/index/index.wxss` 字体回退栈，加载失败时仍优雅显示系统宋体
  - [x] SubTask 1.4: 更新 `README.md` 字体配置说明

- [x] Task 2: 地图页「当前位置」下移到「城市记忆」右侧
  - [x] SubTask 2.1: 从 `pages/map/map.wxml` 的 `.nav-header-right` 移除当前位置选择器
  - [x] SubTask 2.2: 在 `.map-theme` 区域右侧添加当前位置 pill，使用 flex 左右排列
  - [x] SubTask 2.3: 调整 `pages/map/map.wxss`，保持 pill 与收藏夹「管理」按钮一致的胶囊样式
  - [x] SubTask 2.4: 确保点击 pill 仍触发 `openCitySelect`

- [x] Task 3: 顶部导航栏分隔线下移
  - [x] SubTask 3.1: 调整 `app.wxss` 中 `.nav-header` 或 `.nav-header-title` 的 padding，使分隔线下移 8-12rpx
  - [x] SubTask 3.2: 确保分隔线不贴胶囊按钮，也不侵入页面内容区

- [x] Task 4: 其他页面设计规范统一性检查
  - [x] SubTask 4.1: 检查首页、地图页、我的页、收藏夹页、城市选择页顶部渐变与导航栏结构
  - [x] SubTask 4.2: 检查各页面右侧按钮/组件是否与胶囊按钮对齐且不贴边
  - [x] SubTask 4.3: 修复任何未统一的细节（如分隔线、内边距、圆角等）

# Task Dependencies

- Task 3 可被 Task 2 依赖（地图页导航栏结构调整前先确定分隔线位置）
- Task 4 依赖于 Task 1、Task 2、Task 3 完成后进行回归检查
