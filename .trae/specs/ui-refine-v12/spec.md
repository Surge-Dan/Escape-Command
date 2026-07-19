# v12 首页字体彻底修复、详情按钮位置、地图起点编辑与定位图标修复 Spec

## Why

v11 上线后真机验证仍有 4 个核心体验问题：
1. 首页 Hero 中文字体虽然变粗，但依旧未稳定渲染为宋体/思源宋体，必须彻底解决跨端字体回退；
2. 出逃详情卡（点击卡片后展开的指令面板）中，「关闭」与「收藏」按钮全部挤在右上角，用户希望调整位置；
3. 地图页「当前位置」pill 仍未达到用户预期的右对齐效果；右下两个悬浮按钮功能混乱：第一个「设为家」应改为「添加/编辑出发点」（+），第二个定位按钮在真机上不显示图标；底部统计条位置偏上。

## What Changes

### A. 首页 Hero 中文字体彻底解决（P0）
- 放弃依赖可变字体 Regular 合成粗体，改为引入一份**Source Han Serif CN Bold 子集 WOFF2**，覆盖首页 Hero 区所有可能出现的汉字；
- 子集文件控制在 2MB 以内，放在 `assets/fonts/source-han-serif-cn-bold.woff2`；
- 在 `pages/index/index.js` 的 `loadFontFace` 中新增/替换为一个 Bold family（如 `SourceHanSerifBold`）加载该文件；
- `pages/index/index.wxss` 中 Hero 文字统一使用 `font-family: 'SourceHanSerifBold', "Source Han Serif SC", "Songti SC", "STSong", "SimSun", serif;`，字重 700；
- 删除 v10/v11 中多段 Regular 分片回退逻辑（或保留作为 Regular 兜底，但 Bold 优先）；
- 真机预览验证：Hero 中文必须显示为粗宋体。

### B. 出逃详情卡按钮位置调整（P0）
- 将 `pages/index/index.wxml` 中 `.cmd-actions-top` 的「关闭」与「收藏」按钮拆分：
  - **关闭按钮** 移到卡片**左上角**；
  - **收藏按钮** 保持在卡片**右上角**；
- 调整 `pages/index/index.wxss`：
  - 左上角关闭按钮距离上/左边缘 24rpx；
  - 右上角收藏按钮距离上/右边缘 24rpx；
  - 两者尺寸保持 64rpx 圆形、32rpx 图标、canvas 背景不变；
  - 标题 `.cmd-title` 增加顶部安全间距，避免与左上角关闭按钮重叠。

### C. 地图页「当前位置」pill 真正右对齐（P0）
- 调整 `pages/map/map.wxss`：
  - `.map-theme` 右侧基础 padding 从 40rpx 收紧到 24rpx，由 `navHeaderStyle` 动态负责胶囊按钮避让；
  - `.map-city-pill` 保持 `margin-left: auto`；
  - `.city-name` 的 `max-width` 从 120rpx 放宽到 200rpx，避免长城市名被截断后导致 pill 视觉不居右；
  - 确保 `.map-theme` 宽度撑满可用空间。

### D. 地图右下悬浮按钮改造（P0）
- 第一个按钮由「设为家」改为「添加/编辑出发点」：
  - 图标从文字替换为 `+`（新增 `assets/icons/plus-brand.svg` 或 `plus-ink.svg`）；
  - 点击后弹出 `wx.showModal`（可编辑），用户可输入出发点名称（默认「家」）并自动使用当前地图中心坐标；
  - 若已存在出发点，再次点击则预填充名称，支持修改；
  - 保存到 `homePoint` storage，并立即刷新路线。
- 第二个定位按钮修复：
  - 调查真机不显示图标的原因；
  - 若判定为 SVG 在 `cover-image` 真机渲染问题，将图标改为简单矢量路径（无渐变、无滤镜）或改用 `cover-view` + `text` 兜底显示「定位」二字；
  - 调整 `.map-locate-btn` 的 `z-index` 确保在最上层。
- 两个按钮垂直间距调整：
  - 添加/编辑按钮位于定位按钮上方，间距 16rpx；
  - 因底部统计条下移，需同步调整按钮 `bottom` 值，避免被统计条遮挡。

### E. 地图底部统计条下移（P0）
- 调整 `pages/map/map.wxss` 中 `.map-stats-bar` 的 `bottom` 值：
  - 从 `var(--page-pad-bottom)` 改为 `calc(var(--page-pad-bottom) + 16rpx)`；
  - 同步调整右下悬浮按钮 `bottom`：定位按钮 `calc(var(--page-pad-bottom) + 148rpx)`，添加按钮 `calc(var(--page-pad-bottom) + 252rpx)`（具体数值以不重叠为准）。

## Impact

- 受影响 specs：`ui-refine-v10`、`ui-refine-v11`。
- 受影响代码：
  - `pages/index/index.js`、`pages/index/index.wxss`、`pages/index/index.wxml`
  - `pages/map/map.js`、`pages/map/map.wxml`、`pages/map/map.wxss`
  - `assets/fonts/source-han-serif-cn-bold.woff2`（新增）
  - `assets/icons/plus-brand.svg`（新增）
  - `assets/icons/locate-current.svg`（可能替换）

## ADDED Requirements

### Requirement: 首页 Hero 中文字体在真机稳定显示粗宋体
#### Scenario: 用户打开首页
- **WHEN** 首页 Hero 区渲染
- **THEN** 中文字体显示为 Source Han Serif Bold / 粗宋体
- **AND** 真机、开发者工具、预览版三者一致

### Requirement: 出逃详情卡关闭按钮位于左上角、收藏按钮位于右上角
#### Scenario: 用户点击卡片打开详情
- **WHEN** 详情卡展开
- **THEN** 关闭按钮在卡片左上角，收藏按钮在卡片右上角
- **AND** 两者尺寸、样式一致，不与标题重叠

### Requirement: 地图页当前位置 pill 靠右对齐
#### Scenario: 用户打开地图页
- **WHEN** 主题区渲染
- **THEN** 「当前位置」pill 紧贴右边缘，与胶囊按钮保持标准避让
- **AND** 城市名称完整显示（截断时显示省略号）

### Requirement: 地图支持添加/编辑出发点
#### Scenario: 用户点击右下 + 按钮
- **WHEN** 点击 + 按钮
- **THEN** 弹出输入框，可输入出发点名称
- **AND** 保存后该点成为路线模式的固定起点
- **AND** 已存在出发点时支持编辑

### Requirement: 地图定位按钮图标在真机正常显示
#### Scenario: 用户打开地图页
- **WHEN** 地图页渲染
- **THEN** 右下角定位按钮显示清晰图标或兜底文字
- **AND** 点击可回到当前位置

### Requirement: 地图底部统计条位置下移
#### Scenario: 用户打开地图页
- **WHEN** 地图页渲染
- **THEN** 统计条与地图底部、TabBar 保持更舒适的呼吸距离

## MODIFIED Requirements

- v11 首页 Hero 使用可变字体 Regular 合成粗体 → 改为专用 Source Han Serif Bold 子集
- v11 出逃详情卡两个按钮都在右上角 → 关闭移到左上角，收藏保留右上角
- v11 地图「设为家」文字按钮 → 改为 + 按钮并支持添加/编辑出发点
- v10/v11 地图定位 SVG 图标 → 修复真机显示

## REMOVED Requirements

- 无删除
