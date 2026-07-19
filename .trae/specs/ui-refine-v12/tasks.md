# Tasks

- [x] Task 1: 首页 Hero 字体彻底解决
  - [x] SubTask 1.1: 提取首页 Hero 区所有可能出现的汉字（包括问候语、推荐标题、按钮文案等）
  - [x] SubTask 1.2: 使用 FontTools 或 cn-fontsource 生成 Source Han Serif CN Bold 子集 WOFF2，覆盖上述汉字，文件 <2MB，命名为 `source-han-serif-cn-bold.woff2`
  - [x] SubTask 1.3: 将字体文件放入 `assets/fonts/`
  - [x] SubTask 1.4: 修改 `pages/index/index.js` 的 `loadFontFace`，加载 `SourceHanSerifBold` family
  - [x] SubTask 1.5: 修改 `pages/index/index.wxss`，Hero 文字统一使用 `SourceHanSerifBold` 优先，字重 700
  - [x] SubTask 1.6: 运行 `node scripts/check-syntax.js` 并通过

- [x] Task 2: 出逃详情卡按钮位置调整
  - [x] SubTask 2.1: 修改 `pages/index/index.wxml`，将关闭按钮移到卡片左上角，收藏按钮保留右上角
  - [x] SubTask 2.2: 修改 `pages/index/index.wxss`，调整按钮定位、标题安全间距、卡片内边距
  - [x] SubTask 2.3: 运行 `node scripts/check-syntax.js` 与 `node scripts/final-check.js` 并通过

- [x] Task 3: 地图页当前位置 pill 真正右对齐
  - [x] SubTask 3.1: 修改 `pages/map/map.wxss`：收紧 `.map-theme` 右侧 padding、确保 pill `margin-left: auto`、放宽 `.city-name` max-width
  - [x] SubTask 3.2: 运行 `node scripts/final-check.js` 并通过

- [x] Task 4: 地图右下 + 按钮与出发点编辑
  - [x] SubTask 4.1: 新增 `assets/icons/plus-brand.svg`（扁平无滤镜）
  - [x] SubTask 4.2: 修改 `pages/map/map.wxml`：将「设为家」按钮改为 + 图标按钮
  - [x] SubTask 4.3: 修改 `pages/map/map.js`：新增/改造 `setHomePoint` 为弹出 `wx.showModal` 输入名称，预填充已有名称，保存到 storage 并刷新
  - [x] SubTask 4.4: 运行 `node scripts/check-syntax.js` 并通过

- [x] Task 5: 地图定位按钮真机图标修复
  - [x] SubTask 5.1: 检查 `assets/icons/locate-current.svg` 结构，确认无滤镜/渐变
  - [x] SubTask 5.2: 若仍无法显示，重绘为更简单的扁平 SVG 或改用 `cover-view` + `text` 兜底
  - [x] SubTask 5.3: 调整 `.map-locate-btn` z-index 与点击区域
  - [x] SubTask 5.4: 运行 `node scripts/validate-svgs.js` 并通过

- [x] Task 6: 地图底部统计条与按钮垂直位置调整
  - [x] SubTask 6.1: 修改 `pages/map/map.wxss`，将 `.map-stats-bar` 的 `bottom` 下移 16rpx
  - [x] SubTask 6.2: 同步调整 `.map-locate-btn` 与 `.map-home-btn`（+ 按钮）的 `bottom`，确保不与统计条重叠且间距 16rpx
  - [x] SubTask 6.3: 运行 `node scripts/final-check.js` 并通过

# Task Dependencies

- Task 1 可独立并行
- Task 2 可独立并行
- Task 3、Task 4、Task 5、Task 6 均改动地图页，建议按 3 → 6 → 4/5 顺序串行，避免同一文件冲突
