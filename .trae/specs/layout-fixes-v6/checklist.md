# v6 全页面修复 Checklist (已验证通过)

## A. nav-header 胶囊适配（Task 1）✅
- [x] app.js onLaunch 调用 `wx.getMenuButtonBoundingClientRect()` 计算 navPaddingRight
- [x] globalData 注入 navHeaderStyle
- [x] 33 个 wxml 文件 nav-header 注入 `style="{{navHeaderStyle}}"`
- [x] nav-header-title 绝对定位居中（left:50% top:50% translate）
- [x] 标题不被胶囊遮挡

## B. scroll-view 88rpx → 72rpx（Task 2）✅
- [x] 25 个 wxml 文件已改
- [x] grep `88rpx);"` 在 scroll-view 上下文 = 0（除次要 tab/batch bar 保留项）
- [x] profile.wxss:9 复核通过（100vh - 72rpx）

## C. 按钮规范（Task 3）✅
- [x] .btn-primary 88rpx / 32rpx + box-shadow
- [x] .btn-secondary 88rpx / 30rpx
- [x] 12 个 wxss 文件的按钮 min-height 升级到 88rpx
- [x] 可点击区域 ≥ 88rpx × 88rpx

## D. 地图原生 map（Task 4）✅
- [x] pages/map/map.wxml 用原生 `<map>`
- [x] 悬浮 UI（tab/时间/定位/数据卡/弹窗）全用 cover-view/cover-image
- [x] all 模式 markers 按 type 着色（pin-*.svg）
- [x] heat 模式 markers 按密度 size(24-56px)+color(蓝/黄/红)
- [x] route 模式 polyline 连线（时间排序 + arrowLine）
- [x] mapHeight 计算 = windowHeight - statusBar - nav(72rpx) - tabbar(130rpx+safe)
- [x] onMarkerTap 弹窗正常
- [x] ⚠️ WARNING: marker iconPath 用 SVG，建议转 PNG（非阻塞）

## E. 边距 40rpx 统一（Task 5）✅
- [x] 6 主页面容器 padding 40rpx
- [x] profile.profile-body padding 24rpx 40rpx 0
- [x] categories-section 无额外 padding，与 user-card 对齐

## F. 分页面修复（Task 6）✅
- [x] 首页：问候行间距、模式芯片 64rpx、骰子 120rpx、cmd-meta gap 24rpx、tip-box 规范、action-btn 88rpx
- [x] 指令详情卡：tip-box padding 20rpx 24rpx + var(--canvas)
- [x] 执行中：卡片 padding 32rpx 40rpx、步骤序号、步骤分割线 2rpx、photo 4rpx dashed、finish-btn 88rpx
- [x] 我的页面：avatar 128rpx、edit-btn 56rpx circle、stats 36rpx、5 分类卡对齐
- [x] 指令详情独立页：scroll-view 72rpx、meta-grid 4 cell、3 按钮（收藏/分享/删除）flex:1

## G. v3/v4/v5 决策不变（回归）✅
- [x] 6 模式不变（smart/micro/walk/double/night/rainy）
- [x] 19 徽章不变（3+3+7+2+4）
- [x] 36 页注册不变
- [x] 无震动 / 无摇一摇（runtime code 0 匹配）
- [x] v4: z-index 999 / 模式芯片横向 / TabBar 130rpx / daily-section 160rpx
- [x] v5: nav-header 72rpx 毛玻璃 / 5 分类卡 / quick-grid 删除 / 8 位 hex = 0 / `> *` = 0

## H. 最终视觉 ✅
- [x] 33 页面 nav-header 不被胶囊遮挡
- [x] 0 个 scroll-view 错算 88rpx
- [x] 所有按钮统一 88rpx
- [x] 地图原生 map 3 模式差异化（all/heat/route）
- [x] 多机型适配正常（statusBarHeight + 72rpx nav + 130rpx tabbar + safe-area）

## I. WXSS 兼容性 ✅
- [x] `> *` 通配选择器 = 0
- [x] `:scope` / `attr()` = 0
- [x] 8 位 hex = 0
- [x] v5 PROJECT-MEMORY.md 记录的经验已应用

**最终判定：v6 全页面修复完成，12 项硬检查全部 PASS，1 项 WARNING（SVG marker 建议 PNG，非阻塞），零 v3/v4/v5 回归。**
