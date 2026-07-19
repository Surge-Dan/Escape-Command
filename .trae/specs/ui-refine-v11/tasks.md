# Tasks

- [x] Task 1: 首页 Hero 宋体加粗
  - [x] SubTask 1.1: 检查 `assets/fonts/` 现有分片是否包含 Bold 字重信息，确认是否需追加 Source Han Serif Bold 子集
  - [x] SubTask 1.2: 修改 `pages/index/index.wxss`，将 `.hero-title-line` / `.hero-italic` 字重提升至 700/600，并调整回退栈保证真机粗体效果
  - [x] SubTask 1.3: 真机预览验证 Hero 中文显示为粗宋体

- [x] Task 2: 地图路线模式固定出发点
  - [x] SubTask 2.1: 在 `pages/map/map.js` 中读取/写入 `wx.getStorageSync('homePoint')`，默认使用当前定位填充
  - [x] SubTask 2.2: 修改 `buildPolyline`，将 `homePoint` 作为路线第一个点，再按时间顺序连接记录地点
  - [x] SubTask 2.3: 在地图页增加「设置出发点」入口（推荐在定位按钮旁或主题区右侧）
  - [x] SubTask 2.4: 在 `pages/settings/settings` 中增加「清除家位置」或「重新设置家位置」选项（可选）
  - [x] SubTask 2.5: 当无 homePoint 时给出友好提示，引导用户设置

- [x] Task 3: 地图页当前位置 pill 右对齐
  - [x] SubTask 3.1: 调整 `pages/map/map.wxss` 中 `.map-theme` / `.map-city-pill` 的对齐与间距，使 pill 贴右
  - [x] SubTask 3.2: 确保 pill 与小程序胶囊按钮保持统一 `padding-right` 避让

- [x] Task 4: 全局中文双引号统一
  - [x] SubTask 4.1: 扫描所有 `.wxml` 文件，将 UI 文案中的英文双引号 `"..."` 替换为中文双引号 `“...”`
  - [x] SubTask 4.2: 扫描所有 `.js` 文件中的展示字符串，做同样替换（注意避开 JSON key、文件路径、CSS 值）
  - [x] SubTask 4.3: 运行 `check-syntax.js` 与 `final-check.js` 确认无语法/结构破坏

- [x] Task 5: 指令卡片收藏/关闭按钮统一
  - [x] SubTask 5.1: 修改 `pages/index/index.wxml`，调整 `.cmd-close` 与 `.favorite-toggle` 结构，使二者同层或对称分布
  - [x] SubTask 5.2: 修改 `pages/index/index.wxss`，统一两个按钮外框尺寸（64rpx × 64rpx）、圆角（统一圆形或统一圆角方形）、图标大小（32-36rpx）
  - [x] SubTask 5.3: 移除 `.favorite-toggle` 的 `margin-right: 64rpx`，确保不重叠、不贴边

- [x] Task 6: 重摇次数耗尽后支持自定义任务
  - [x] SubTask 6.1: 修改 `pages/index/index.js` 的 `reroll` 方法，当 `app.useReroll()` 失败时展示自定义任务输入面板/弹窗
  - [x] SubTask 6.2: 在 `pages/index/index.wxml` 新增自定义任务输入 UI（可复用 sheet 或 wx.showModal）
  - [x] SubTask 6.3: 实现 `createCustomCommand(title)`，生成类型为 `custom` 的指令对象，字段与普通指令兼容
  - [x] SubTask 6.4: 验证自定义任务可接受、完成、写入记录、显示在地图与收藏中

# Task Dependencies

- Task 2 依赖于 Task 3 完成后再做最终视觉验收（地图页改动集中在同一文件）
- Task 4 可在其他 Task 间隙并行执行，但需在所有 Task 完成后做最终回归检查
- Task 6 可在 Task 5 之后进行，避免同时改动首页卡片 UI 造成冲突
