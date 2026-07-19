# v8 首页字体、顶部渐变、导航对齐与城市选择器完善 Spec

## Why

v7 完成了全局渐变与分页面视觉后，用户在真机预览中继续发现以下问题：
1. 首页 Hero 中文字体（思源宋体/宋体栈）在部分手机上无法显示，回落后效果不佳；
2. Hero 第二行末尾句号需要去掉；
3. 地图页卫星地图需要 `subkey`，用户不清楚如何获取；
4. 顶部状态栏/导航栏仍是白色条，与首页暖橙背景割裂，且地图页「当前城市」、收藏夹页「管理」未与小程序胶囊按钮精确对齐；
5. 城市选择页城市数量太少、卡片默认两列竖排显单调，需要覆盖全部省市，并以「热门大卡片 + 其他小卡片」分区展示。

## What Changes

### A. 首页 Hero 字体可稳定渲染（P0）

**当前问题**：`font-family` 只依赖系统字体，iOS/Android 对 `Source Han Serif SC` / `Noto Serif SC` / `Songti SC` 的支持不一致，真机经常回退到默认黑体。

**修复方案**：
- 引入 `wx.loadFontFace` 在 `index.js onLoad` 中异步加载思源宋体网络字体（使用国内可访问 CDN，如 阿里巴巴普惠体/思源字体 CDN，或项目本地字体文件）。
- 加载成功后，通过 CSS 类 `font-serif-loaded` 应用该字体；加载失败仍保留系统字体回退栈。
- 字体文件需做 subset/压缩，或仅加载 Regular 字重，控制包体积。

**影响范围**：`pages/index/index.js`、`pages/index/index.wxss`

### B. 去掉 Hero 第二行末尾句号（P0）

**修复方案**：
- `index.wxml` 中移除 `{{heroTail}}.` 后面的句点 text 节点。

**影响范围**：`pages/index/index.wxml`

### C. 地图卫星地图 `subkey` 获取说明（P0 / 文档）

**说明**：
- 微信小程序 `<map>` 组件的 `subkey` 是腾讯位置服务（LBS）Key，用于开启个性化地图、卫星图等高级能力。
- 获取路径：
  1. 访问 [腾讯位置服务控制台](https://lbs.qq.com/) 或微信 MP 后台 →「开发」→「开发管理」→「地图」。
  2. 申请/绑定腾讯 LBS Key（选择「微信小程序」平台）。
  3. 在 Key 配置中开启「卫星图」能力（部分能力需企业认证或额度）。
  4. 将 Key 写入项目配置或 `app.js` 的 `mapSubkey`，供 `pages/map/map.wxml` 的 `<map subkey="{{mapSubkey}}">` 使用。
- 如仅使用基础地图，也可尝试移除 `subkey` 并依赖 `show-satellite`（若基础组件支持）。

**影响范围**：文档 + 可能调整 `pages/map/map.js` / `app.js` 的 subkey 读取方式。

### D. 顶部状态栏/导航栏融入暖橙渐变 + 胶囊对齐（P0）

**当前问题**：
- 首页 `status-bar` 与 `nav-header` 背景为白/半透白，与 `.home-page` 暖橙渐变形成「白色条」。
- 地图页 `nav-header-right` 的城市选择器、收藏夹页「管理」按钮未与右上角胶囊按钮保持同一垂直中线/右侧安全间距。

**修复方案**：
- 首页：让 `status-bar` 与 `nav-header` 背景继承/匹配 `.home-page` 顶部渐变（可改为透明，或复制渐变背景）。
- 全局 `.nav-header-right` 的右侧间距改为响应 `navHeaderStyle` 的 `padding-right`，确保与胶囊按钮左边缘留有安全距离；垂直方向与标题同中线。
- 地图页 `nav-header-right` 的城市选择器保持 flex，调整 `gap`/`padding` 使其视觉居中于导航栏高度。
- 收藏夹页「管理」按钮使用 `.nav-header-right`，复用全局对齐逻辑。

**影响范围**：`pages/index/index.wxss`、`app.wxss`、`pages/map/map.wxss`、`pages/collection/collection.wxml/wxss`

### E. 城市选择器覆盖全部省市 + 热门城市大卡片（P0）

**当前问题**：
- `pages/city-select/city-select.js` 只内置 8 个热门城市；
- 卡片默认 `width: 50%` 两列，城市少时显得竖向堆叠；
- 用户需要全国各省市全部市。

**修复方案**：
- 在 `pages/city-select/city-select.js` 中引入完整省市数据：
  - 热门城市（约 12-16 个，如北上广深杭成渝等）作为「推荐城市」；
  - 其余城市按省份分组，每个省份下列出全部地级市/直辖市辖区。
- UI 分区：
  - **推荐区**：大卡片，单列或双列大尺寸（约占屏幕 45-50% 宽度），带 emoji + 城市名 + 指令数，横向可滚动或 2 列网格；
  - **省市区**：省份作为 sticky section header，城市用紧凑 chip/grid 小卡片（约 25% 宽度或横向 flow），一行可放 3-4 个。
- 保持当前「当前城市卡」「城市专属指令」「确认切换」交互不变。
- 性能：城市总数约 300，WXML 列表渲染无压力；如省份多，保留 `scroll-view` 纵向滚动。

**影响范围**：`pages/city-select/city-select.js`、`pages/city-select/city-select.wxml`、`pages/city-select/city-select.wxss`

## Impact

- 受影响 specs：`brand-gradient-v7`（已完成）作为视觉基础。
- 受影响代码：
  - `pages/index/index.wxml` / `index.js` / `index.wxss`（字体、句号、顶部渐变）
  - `app.wxss`（导航栏对齐、胶囊避让）
  - `pages/map/map.wxss`（地图页城市选择器对齐）
  - `pages/collection/collection.wxml` / `collection.wxss`（管理按钮对齐）
  - `pages/city-select/city-select.js` / `wxml` / `wxss`（完整城市数据 + 新布局）
- 外部依赖：可能需要一个可访问的思源宋体 CDN 或本地字体文件。

## ADDED Requirements

### Requirement: Hero 字体在真机可稳定显示
#### Scenario: 用户进入首页
- **WHEN** 首页 Hero 区渲染
- **THEN** 中文字体应优先使用加载成功的思源宋体/指定网络字体
- **AND** 加载失败时优雅回退到系统宋体/黑体，不出现系统默认无衬线黑体
- **AND** 字体加载不应阻塞页面首次渲染

### Requirement: 城市选择器覆盖全国
#### Scenario: 用户打开地图页城市切换
- **WHEN** 城市选择页渲染
- **THEN** 顶部显示当前定位城市
- **AND** 下方先展示 12-16 个热门推荐城市（大卡片）
- **AND** 再按省份分组展示全国所有地级市
- **AND** 选中城市后仍保留「专属指令」与「确认切换」交互

## MODIFIED Requirements

- v7 Hero 第二行末尾保留句号 → 去掉句号
- v7 顶部状态栏/导航栏为白/半透明 → 改为与首页暖橙渐变一致
- v7 城市选择器仅 8 个城市、统一两列卡片 → 热门大卡片 + 省份分组小卡片

## REMOVED Requirements

- 无删除，仅约束：不再依赖纯系统字体实现首页 Hero 中文字体效果
