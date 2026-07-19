# Checklist

## 设置出发点（wx.chooseLocation）
- [x] `pages/map/map.js` 的 `setHomePoint` 调用 `wx.chooseLocation`
- [x] 成功后取 `res.name` + 坐标写入 `homePoint`，不再弹 `wx.showModal`
- [x] 失败/取消时静默返回，无错误提示
- [x] `wx.chooseLocation` 不可用时 fallback 到原 `wx.showModal` 逻辑
- [x] `homePoint` 同步写入 `wx.setStorageSync('homePoint', ...)` 与 `app.globalData.homePoint`
- [x] 调用 `this.refresh()` 触发路线模式重绘
- [x] `app.json` 的 `requiredPrivateInfos` 包含 `chooseLocation`

## 首页 Hero 字体衬线
- [x] `.hero-title-line` 的 `font-family` 不再包含 `PingFang SC`、`Microsoft YaHei`、`Kaiti SC`
- [x] `.hero-italic` 的 `font-family` 不再包含上述无衬线字体
- [x] `.font-loaded .hero-title-line` 的 `font-family` 不再包含上述无衬线字体
- [x] `.font-loaded .hero-italic` 的 `font-family` 不再包含上述无衬线字体
- [x] 回退栈最终以 `serif` 收尾，且 `serif` 前无任何无衬线字体
- [x] `loadFontFace` 中 `SourceHanSerifBold` 的 `wx.loadFontFace` 调用含 `complete` 回调
- [x] `complete` 回调打印加载状态日志

## 验证
- [x] `check-syntax.js` 通过，0 处语法错误
- [x] `final-check.js` 通过，0 处失败
- [x] 静态审查 `setHomePoint` 逻辑与原 v12 行为无未预期回归（家标记、路线起点仍可用）
- [x] 静态审查字体回退栈，确认真机若 Bold 子集加载失败也会回退到 `Songti SC`/`STSong`/`SimSun`/`serif`，绝不会被无衬线字体截断
