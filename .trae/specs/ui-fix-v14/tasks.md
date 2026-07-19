# Tasks

## Task 1: 设置出发点改用 wx.chooseLocation（P0）
- [x] SubTask 1.1: 修改 `pages/map/map.js` 的 `setHomePoint` 方法
  - 移除当前基于 `wx.showModal` 的手动输入逻辑
  - 调用 `wx.chooseLocation` 调起微信原生地图选点
  - 成功回调中取 `res.name` + `res.latitude`/`res.longitude` 组装为 `homePoint`
  - 失败/取消时静默返回（不报错、不弹 toast）
  - 若 `wx.chooseLocation` 不存在或 fail 为 "not supported"，fallback 到原 `wx.showModal` 逻辑
  - 保留 `wx.setStorageSync('homePoint', ...)` 与 `app.globalData.homePoint` 同步
  - 保留 `this.refresh()` 调用以触发路线模式重绘
- [x] SubTask 1.2: 在 `app.json` 的 `requiredPrivateInfos` 中声明 `chooseLocation`
  - 检查 `requiredPrivateInfos` 是否已存在 `chooseLocation`
  - 若不存在则追加，确保通过审核

## Task 2: 首页 Hero 字体回退栈清理（P0）
- [x] SubTask 2.1: 修改 `pages/index/index.wxss` 字体回退栈
  - `.hero-title-line` 的 `font-family`：移除 `PingFang SC`、`Microsoft YaHei`、`Kaiti SC`
  - `.hero-italic` 的 `font-family`：同上移除无衬线字体
  - `.font-loaded .hero-title-line` 与 `.font-loaded .hero-italic` 的 `font-family`：移除 `PingFang SC`、`Microsoft YaHei`、`Kaiti SC`
  - 最终回退栈精简为：`'SourceHanSerifBold', 'SourceHanSerifCN1'...CN9', "Source Han Serif SC", "Noto Serif SC", "Songti SC", "STSong", "SimSun", serif`
  - 确保 `serif` 是最终兜底，且其前无任何无衬线字体
- [x] SubTask 2.2: 在 `pages/index/index.js` 的 `loadFontFace` 添加 `complete` 回调
  - 为 `SourceHanSerifBold` 的 `wx.loadFontFace` 调用添加 `complete` 回调
  - 在 `complete` 中打印加载状态日志（便于真机调试）

## Task 3: 验证与自测
- [x] SubTask 3.1: 运行 `check-syntax.js` 验证 JS 语法
- [x] SubTask 3.2: 运行 `final-check.js` 综合校验
- [x] SubTask 3.3: 静态审查 `setHomePoint` 与字体回退栈逻辑无回归

# Task Dependencies

- Task 1 与 Task 2 互相独立，可并行实施
- Task 3 依赖 Task 1 与 Task 2 全部完成
