# v11 宋体加粗、路线起点、城市 Pill 右对齐、引号统一与自定义任务 Spec

## Why

v10 修复了首页 Hero 字体加载与地图组件位置，但真机预览和交互细节上仍有 6 处可优化：
1. 首页 Hero 中文字体在开发者工具显示正常，真机仍偏细，用户希望改为更粗的宋体/思源宋体；
2. 地图「路线」模式当前按记录时间顺序连线，缺少固定的「出发点/家」概念，用户期望以固定起点（如家）串联出逃终点；
3. 地图页「当前位置」pill 视觉上应更靠右，与右侧胶囊按钮对齐，而非居中；
4. 全局文案中英文双引号混用，需统一为中文双引号；
5. 首页指令卡片的「收藏」与「关闭」按钮大小、形状不统一，图标偏小；
6. 重摇次数耗尽后用户无退路，应支持自定义输入一条出逃任务，提升灵活性。

## What Changes

### A. 首页 Hero 宋体加粗（P0）
- 将 `pages/index/index.wxss` 中 `.hero-title-line`、`.hero-italic` 的字重从 `500/400` 提升至 `700/600`；
- 检查本地字体分片是否支持 Bold/Regular 混合回退，必要时增加 Source Han Serif Bold 子集或依赖系统粗体；
- 确保开发者工具与真机预览均显示为粗宋体。

### B. 地图路线模式固定出发点（P0）
- 在 `pages/map/map.js` 中新增 `homePoint` 概念：用户可设置一个固定出发点（默认使用当前定位或上一次设置的家位置）；
- 路线模式下，polyline 第一个点为 `homePoint`，后续按记录时间顺序连接出逃地点；
- 在地图页增加「设置出发点」入口（如定位按钮旁的小房子图标或主题区右侧），支持：
  - 以当前位置设为家；
  - 在地图上长按选择家位置；
  - 在设置页中清除/修改家位置。
- 将家位置持久化到 `wx.setStorageSync('homePoint')`。

### C. 地图页当前位置 pill 右对齐（P0）
- 调整 `pages/map/map.wxss` 中 `.map-city-pill` 的父级对齐方式，使 pill 贴右并与胶囊按钮保持统一避让；
- 保持 pill 与「城市记忆」标题在同一行，但视觉上明显右对齐。

### D. 全局中文双引号统一（P0）
- 扫描所有 `.wxml` 与 `.js` 文件中的用户可见文案，将英文双引号 `"..."` 替换为中文双引号 `“...”`；
- 仅替换 UI 文案，不改动代码字符串（如 JSON key、文件路径、CSS 属性值、wxml 属性引号）。

### E. 指令卡片收藏/关闭按钮统一（P0）
- 调整 `pages/index/index.wxss` 中 `.cmd-close` 与 `.favorite-toggle`：
  - 两者外框尺寸统一（如 64rpx × 64rpx）；
  - 统一为圆形（`border-radius: 50%`）或统一为圆角方形（按项目规范取 `--radius-md` 或 `--radius-lg`）；
  - 内部图标放大到 32rpx-36rpx，保证视觉比例一致；
  - 移除 `.favorite-toggle` 的 `margin-right: 64rpx`，改为与关闭按钮对称分布或同一行右侧。
- 调整 WXML 结构，使两个按钮在视觉上对齐且不重叠。

### F. 重摇次数耗尽后支持自定义任务（P0）
- 在 `pages/index/index.js` 的 `reroll` 逻辑中，当 `app.useReroll()` 返回 false 时，不再仅 toast「换卡次数用完了」；
- 弹出轻量输入框（或展开自定义任务面板），允许用户输入一句话任务描述；
- 用户确认后生成一条「自定义任务」卡片，字段与普通指令一致（类型为 `custom`、颜色使用品牌色、无插画时显示默认图标）；
- 自定义任务可正常被接受、完成、记录到地图与收藏。

## Impact

- 受影响 specs：`ui-refine-v10`（已完成）作为前置实现。
- 受影响代码：
  - `pages/index/index.wxss`、`pages/index/index.js`、`pages/index/index.wxml`（字体、按钮、自定义任务）
  - `pages/map/map.js`、`pages/map/map.wxml`、`pages/map/map.wxss`（路线起点、城市 pill 对齐）
  - `pages/settings/settings.wxml` / `.wxss` / `.js`（可能增加家位置管理入口）
  - 全局 `.wxml` / `.js` 文案引号
- 可能新增：`assets/fonts/` Bold 子集、`utils/custom-command.js`。

## ADDED Requirements

### Requirement: 首页 Hero 中文字体在真机显示粗宋体
#### Scenario: 用户进入首页
- **WHEN** 首页 Hero 区渲染
- **THEN** 中文字体显示为加粗宋体/思源宋体
- **AND** 真机与开发者工具视觉效果一致

### Requirement: 地图路线模式有固定出发点
#### Scenario: 用户切换到路线模式
- **WHEN** 地图页「路线」tab 激活
- **THEN** 路线从用户设定的「家/出发点」开始
- **AND** 依次连接所有出逃记录地点
- **AND** 家位置可设置、可修改、可清除

### Requirement: 地图页当前位置 pill 右对齐
#### Scenario: 用户打开地图页
- **WHEN** 地图页渲染
- **THEN** 「当前位置」pill 位于「城市记忆」右侧，靠近屏幕右边缘并与胶囊按钮避让

### Requirement: 全局文案使用中文双引号
#### Scenario: 用户浏览任意页面
- **WHEN** 页面中出现引用、提示等文案
- **THEN** 使用中文双引号 `“...”`，不出现英文双引号 `"..."`

### Requirement: 指令卡片收藏与关闭按钮视觉统一
#### Scenario: 用户打开指令详情卡
- **WHEN** 卡片显示
- **THEN** 关闭按钮与收藏按钮外框尺寸、圆角、图标比例一致
- **AND** 两个按钮不重叠、不贴边

### Requirement: 重摇次数耗尽后可自定义任务
#### Scenario: 用户点击重摇但次数为 0
- **WHEN** 用户点击重摇按钮
- **THEN** 弹出输入框让用户输入自定义出逃任务
- **AND** 确认后生成可执行的自定义任务卡片
- **AND** 自定义任务可接受、完成、记录

## MODIFIED Requirements

- v10 首页 Hero 字重 500/400 → 700/600
- v10 地图「路线」模式仅按记录连线 → 增加固定出发点
- v10 地图页城市 pill 与标题 space-between →  stronger right alignment / capsule avoid
- v9 重摇次数耗尽仅提示 → 增加自定义任务入口

## REMOVED Requirements

- 无删除
