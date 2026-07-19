# v14 出发点地图选点 + 首页字体衬线修复 Spec

## Why

v13 后两个根因仍未闭环：
1. 设置出发点用 `wx.showModal` 手动输入名称，坐标取地图中心——用户无法精确选择实际位置，交互笨重且不准确。应调用微信原生地图选点能力。
2. 首页 Hero 中文仍不显示衬线字体——根因是 CSS 回退栈中混入了无衬线字体（`PingFang SC`、`Microsoft YaHei`），排在 `serif` 前面。当本地 `SourceHanSerifBold` 真机加载失败、且系统不识别 `Songti SC` 时，浏览器匹配到 `PingFang SC`（无衬线），不会跳到最后的 `serif`（衬线）。

## What Changes

### A. 设置出发点改用 wx.chooseLocation（P0）
- 修改 `pages/map/map.js` 的 `setHomePoint`：
  - 调用 `wx.chooseLocation`，让用户在微信原生地图上搜索或拖动选点；
  - 返回 `{ name, address, latitude, longitude }`，直接取 `name` 和坐标作为 `homePoint`；
  - 失败/取消时不报错，静默返回；
  - 如果 `wx.chooseLocation` 不可用，fallback 到当前 `wx.showModal` 逻辑。
- 在 `app.json` 的 `requiredPrivateInfos` 中确保已声明 `chooseLocation`（如未声明需补充）。

### B. 首页 Hero 字体回退栈清理（P0）
- 修改 `pages/index/index.wxss`：
  - `.hero-title-line`、`.hero-italic`、`.font-loaded .hero-title-line/hero-italic` 的 `font-family` 回退栈中**移除** `PingFang SC`、`Microsoft YaHei`、`Kaiti SC`（楷体不是宋体）；
  - 回退栈精简为纯衬线序列：`'SourceHanSerifBold', "Source Han Serif SC", "Noto Serif SC", "Songti SC", "STSong", "SimSun", serif`；
  - 确保 `serif` 是最终兜底，不被无衬线字体截断。
- 在 `pages/index/index.js` 的 `loadFontFace` 中为 `SourceHanSerifBold` 添加 `complete` 回调，打印加载状态便于真机调试。

## Impact

- 受影响 specs：`ui-fix-v13`（setHomePoint 逻辑修正）、`ui-refine-v12`（字体回退栈修正）。
- 受影响代码：
  - `pages/map/map.js`（`setHomePoint` 重构）
  - `pages/index/index.wxss`（字体回退栈清理）
  - `pages/index/index.js`（`loadFontFace` 添加 `complete` 回调）
  - `app.json`（`requiredPrivateInfos` 可能补充 `chooseLocation`）

## ADDED Requirements

### Requirement: 设置出发点调用微信原生地图选点
#### Scenario: 用户点击 + 按钮设置出发点
- **WHEN** 用户点击右下 + 按钮
- **THEN** 调起微信原生地图选点页面
- **AND** 用户可搜索地址或拖动地图精确选点
- **AND** 确认后该点成为路线模式的固定起点

### Requirement: 首页 Hero 中文显示带衬线字体
#### Scenario: 用户打开首页
- **WHEN** 首页 Hero 区渲染
- **THEN** 中文字体显示为带衬线的宋体
- **AND** 即使本地字体加载失败，系统也回退到 `serif`（衬线）而非无衬线字体

## MODIFIED Requirements

- v13 `setHomePoint` 用 `wx.showModal` 输入名称 → 改用 `wx.chooseLocation` 地图选点
- v12 字体回退栈含无衬线字体 → 清理为纯衬线序列

## REMOVED Requirements

- 无删除
