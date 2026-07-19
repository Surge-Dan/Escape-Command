# v10 首页字体真机修复、地图当前位置下移与分隔线位置微调 Spec

## Why

v9 完成了全局顶部渐变与页面视觉统一，但真机预览中仍有 4 处未达预期：
1. 首页 Hero 中文字体在手机上仍无法显示宋体/思源宋体效果，继续回退为系统默认黑体；
2. 地图页「当前位置」组件放在导航栏右上角，遮挡了顶部地图/卫星/路线切换 tab，需要下放到「城市记忆」右侧；
3. 顶部导航栏分隔线位置偏高，几乎贴到微信小程序胶囊按钮，需要再往下挪；
4. 需要系统检查其他页面是否保持统一的设计规范。

## What Changes

### A. 首页 Hero 字体真机可稳定显示宋体（P0）

**当前问题**：v8 使用 `wx.loadFontFace` 加载远程 CDN 字体，但真机中常因域名未加入 download 白名单、CDN 不稳定或 URL 失效导致加载失败，回退后仍为系统默认黑体。

**修复方案**：
- **优先方案**：在项目中引入本地字体文件（如 Source Han Serif CN Regular 的 WOFF2 子集），放在 `assets/fonts/` 目录，使用 `wx.loadFontFace` 加载本地路径 `/assets/fonts/source-han-serif-cn.woff2`。
  - 优点：不依赖外部 CDN，不受白名单限制。
  - 风险：字体文件体积较大，需控制在 1.5MB 以内或拆分子集。
- **备选方案**：若本地字体体积过大，改用更稳定的国内 CDN（如 阿里云 OSS / 字体家 / 有字库 等），并在 README 中明确告知用户需将 CDN 域名加入 `downloadFile` 合法域名。
- **兜底方案**：优化系统字体回退栈，确保在字体加载失败时仍显示优雅的系统字体，而非默认黑体：
  - iOS：`"Songti SC", "STSong", "Kaiti SC"`
  - Android：`"Source Han Serif SC", "Noto Serif CJK SC", "STSong", "SimSun"`
  - 通用：`"PingFang SC", "Microsoft YaHei", serif`
- 在 `index.js` 中同时尝试本地字体和系统字体，加载失败时打印日志但不阻塞页面。

**影响范围**：`pages/index/index.js`、`pages/index/index.wxss`、`assets/fonts/`、`README.md`

### B. 地图页「当前位置」下移到「城市记忆」右侧（P0）

**当前问题**：当前位置 pill 位于导航栏右上角，遮挡了地图/卫星/路线切换 tab 的上方空间。

**修复方案**：
- 从 `pages/map/map.wxml` 的 `.nav-header-right` 中移除当前位置选择器。
- 在 `.map-theme` 区域右侧添加当前位置选择器：
  - 结构：`<view class="map-theme"><text class="map-theme-title">城市记忆</text><view class="map-city-pill">...</view></view>`
  - `.map-theme` 使用 `display: flex; justify-content: space-between; align-items: center;`
  - 当前位置 pill 保持小型胶囊样式（与收藏夹「管理」一致）
  - pill 内包含：定位图标 + 城市名 + 下拉箭头
- 确保点击 pill 仍能打开城市选择页（`bindtap="openCitySelect"`）。

**影响范围**：`pages/map/map.wxml`、`pages/map/map.wxss`

### C. 顶部导航栏分隔线位置下移（P0）

**当前问题**：分隔线位于导航栏底部，视觉上贴近小程序胶囊按钮，显得拥挤。

**修复方案**：
- 在 `app.wxss` 中调整 `.nav-header` 的 `padding-bottom` 或 `.nav-header-title` 的 `padding-bottom`。
- 将分隔线从导航栏最底部往下移动约 8-12rpx，使分隔线与胶囊按钮之间留出呼吸空间。
- 同时确保分隔线不会侵入页面内容区太多。

**影响范围**：`app.wxss`

### D. 其他页面统一设计规范检查（P0）

**检查项**：
- 首页、地图页、我的页、收藏夹页、城市选择页是否都使用统一顶部渐变。
- 各页面导航栏标题下方是否有分隔线。
- 各页面右侧按钮/组件是否与胶囊按钮对齐且不贴边。
- 城市选择页热门城市是否保持双列。
- 地图页底部统计条是否保持悬浮胶囊样式。

**修复方案**：
- 遍历所有页面 wxml/wxss，修复任何未统一的细节。
- 特别关注城市选择页和收藏夹页是否有回归。

**影响范围**：所有页面 wxss/wxml

## Impact

- 受影响 specs：`ui-unify-v9`（已完成）作为前置实现。
- 受影响代码：
  - `pages/index/index.js` / `index.wxss`（字体加载与回退）
  - `pages/map/map.wxml` / `map.wxss`（当前位置下移）
  - `app.wxss`（分隔线位置）
  - 其他页面 wxml/wxss（统一规范检查）
- 可能新增：`assets/fonts/source-han-serif-cn.woff2`

## ADDED Requirements

### Requirement: 首页 Hero 字体在真机显示宋体
#### Scenario: 用户进入首页
- **WHEN** 首页 Hero 区渲染
- **THEN** 中文字体优先使用加载成功的宋体/思源宋体
- **AND** 字体加载失败时回退到系统宋体或优雅字体，不出现默认黑体
- **AND** 字体加载不阻塞页面首次渲染

### Requirement: 地图页当前位置不遮挡顶部 Tab
#### Scenario: 用户打开地图页
- **WHEN** 地图页渲染
- **THEN** 顶部「地图/卫星/路线」tab 上方无当前位置组件
- **AND** 「当前位置」选择器位于「城市记忆」标题右侧
- **AND** 点击该选择器仍可打开城市选择页

### Requirement: 分隔线不贴胶囊按钮
#### Scenario: 用户查看任意页面顶部
- **WHEN** 导航栏渲染
- **THEN** 标题下方分隔线与微信小程序胶囊按钮之间有明显间距（约 8-12rpx）

## MODIFIED Requirements

- v9 地图页当前位置在导航栏右上角 → 下移到「城市记忆」右侧
- v9 导航栏分隔线贴底 → 下移约 8-12rpx

## REMOVED Requirements

- 无删除
