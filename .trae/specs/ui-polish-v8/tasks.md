# v8 UI 打磨与城市选择器 Tasks

## Task 1: 首页 Hero 字体真机稳定渲染
- [x] SubTask 1.1: 在 `pages/index/index.js onLoad` 中调用 `wx.loadFontFace` 加载思源宋体（或选定网络字体），设置 `global: true`
- [x] SubTask 1.2: 加载成功后给页面根节点加 `font-loaded` class；失败时保持现有系统字体回退
- [x] SubTask 1.3: 在 `pages/index/index.wxss` 中定义 `.font-loaded .hero-title-line` / `.font-loaded .hero-italic` 使用加载后的字体
- [x] SubTask 1.4: 验证字体文件/链接可访问，真机预览时字体生效

## Task 2: 去掉 Hero 第二行末尾句号
- [x] SubTask 2.1: 修改 `pages/index/index.wxml`，移除 `{{heroTail}}.` 后的句点 `<text>`
- [x] SubTask 2.2: 验证 WXML 标签闭合与渲染结果

## Task 3: 顶部状态栏与导航栏融入首页渐变
- [x] SubTask 3.1: 修改 `pages/index/index.wxss`，让 `.status-bar` 与 `.nav-header` 背景透明或复制 `.home-page` 顶部渐变色
- [x] SubTask 3.2: 确保 `.nav-header` 的 backdrop-filter 不破坏渐变观感
- [x] SubTask 3.3: 真机预览确认顶部无白色条

## Task 4: 导航栏右侧元素与小程序胶囊按钮对齐
- [x] SubTask 4.1: 在 `app.wxss` 中统一 `.nav-header-right` 的 flex 布局与垂直居中
- [x] SubTask 4.2: 调整 `.nav-header-right` 右侧安全间距，使其避开胶囊按钮
- [x] SubTask 4.3: 调整 `pages/map/map.wxss` 中城市选择器的 padding/gap，视觉居中于导航栏
- [x] SubTask 4.4: 调整 `pages/collection/collection.wxml` / `collection.wxss`，让「管理」按钮使用 `.nav-header-right` 并正确对齐
- [x] SubTask 4.5: 真机验证地图页、收藏夹页导航栏右侧按钮不与胶囊重叠

## Task 5: 城市选择器数据扩展与布局重构
- [x] SubTask 5.1: 在 `pages/city-select/city-select.js` 中引入完整全国省市数据（约 300 地级市）
- [x] SubTask 5.2: 定义热门城市列表（12-16 个），其余城市按省份分组
- [x] SubTask 5.3: 重构 `pages/city-select/city-select.wxml`：
  - 当前城市卡保持不变
  - 新增「热门推荐」横向/双列大卡片区
  - 新增按省份分组的紧凑小卡片区（省份 sticky header + 3-4 列网格）
- [x] SubTask 5.4: 重构 `pages/city-select/city-select.wxss`，实现大小卡片分区样式
- [x] SubTask 5.5: 保持选中、当前城市、专属指令、确认切换逻辑不变
- [x] SubTask 5.6: 验证长列表滚动流畅，无性能问题

## Task 6: 文档与配置
- [x] SubTask 6.1: 在 README 或 `docs/` 中补充卫星地图 `subkey` 获取步骤（腾讯 LBS Key 申请流程）
- [x] SubTask 6.2: 确认 `pages/map/map.js` 中 `mapSubkey` 的读取来源（app.globalData / project config）

## Task 7: 最终验证
- [x] SubTask 7.1: 运行 `scripts/check-syntax.js` 通过
- [x] SubTask 7.2: 运行 `scripts/final-check.js` 通过
- [x] SubTask 7.3: 运行 `scripts/audit-icons.js` 通过
- [x] SubTask 7.4: 运行 `scripts/validate-svgs.js` 通过
- [x] SubTask 7.5: 真机预览首页、地图页、收藏夹页、城市选择页，确认问题 1-5 全部解决

# Task Dependencies

- Task 1、Task 2、Task 3 可并行
- Task 4 依赖 Task 3（顶部渐变完成后再细调对齐）
- Task 5 独立
- Task 6 独立
- Task 7 依赖所有 Task
