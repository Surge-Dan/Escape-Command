# v4 布局修复 Checklist (已验证通过)

## A. 首页模式芯片（Task 1）✅
- [x] `.mode-list` 是 scroll-x 滚动容器
- [x] 6 个芯片不换行（在 375rpx 宽度下）
- [x] 每个芯片固定宽度 168rpx
- [x] 文字不截断、不换行
- [x] 选中态：背景 `--brand` + 白字 + white 图标
- [x] 无外圈 box-shadow 圆点
- [x] 无"新"角标/红点

## B. TabBar 紧凑化（Task 2）✅
- [x] 自定义 TabBar 高度 ≤ 130rpx + 安全区
- [x] 图标 80rpx 容器 / 56rpx 图标
- [x] 文字 24rpx
- [x] 选中态仅改背景色，不放大
- [x] `.tabbar-placeholder` 与实际 TabBar 高度一致（app.wxss/map.wxss/profile.wxss 均更新到 130rpx）

## C. 今日推荐（Task 3）✅
- [x] `.daily-section` padding-bottom 160rpx
- [x] 卡片高度统一 220rpx
- [x] 最后一张卡片 `margin-right: 40rpx`
- [x] 卡片不被 TabBar 遮挡

## D. 指令详情卡（Task 4）✅
- [x] `.command-sheet` `z-index: 999`
- [x] `.command-sheet` `padding-bottom: 200rpx`
- [x] "关闭"按钮仅 `setData` 本地状态，不调用 `abandonCommand`
- [x] 关闭不影响 executing 页的 `currentCommand`

## E. 徽章墙 3 列网格（Task 5）✅
- [x] 每个分类内徽章 3 列等宽 grid
- [x] 解锁：渐变背景 + 高亮
- [x] 锁定：灰背景 + 锁图标
- [x] 5 个分类标题保留（里程碑/类型/模式/社交/特殊）
- [x] 19 个徽章全部显示
- [x] `dateText` 已计算

## F. 模式芯片装饰清理（Task 6）✅
- [x] `.mode-chip.active` box-shadow 改为内敛的 0 2rpx 8rpx rgba(92,191,158,0.15)
- [x] 无"新"角标
- [x] 无红点

## G. 场景插画占位（Task 7）✅
- [x] `cmd-image-wrap` 有 `.cmd-image-bg` 渐变占位背景
- [x] 居中类型 icon 96rpx
- [x] 主页和 command-detail 都已实现

## H. 问候语（Task 8）✅
- [x] 字号 28rpx
- [x] 颜色 `--ink`
- [x] padding-bottom 20rpx

## I. 动效时长（Task 9）✅
- [x] 卡片滑入 300ms
- [x] 芯片切换 200ms
- [x] 出逃触发 400ms
- [x] 脉冲环 2500ms
- [x] 摸牌 400ms
- [x] ease-standard / ease-bounce 缓动

## J. 会员入口弱化（Task 10）✅
- [x] 背景 `--brand-tint`（不再金色渐变）
- [x] 标题"出逃会员"
- [x] CTA"了解 ›"
- [x] 点击 navigateTo member 页

## K. 联动刷新（Task 11）✅
- [x] index `onShow` 刷新 `dailyRecommend`
- [x] map `onShow` 重新生成 markers
- [x] badges `onShow` 重算解锁
- [x] profile `onShow` 重算 stats

## L. CSS 变量一致性（Task 12）✅
- [x] index 页无新增硬编码 hex（除 mode/type 色）
- [x] executing 页无新增硬编码 hex
- [x] record 页无新增硬编码 hex
- [x] map 页无新增硬编码 hex
- [x] profile 页无新增硬编码 hex
- [x] badges 页无新增硬编码 hex
- [x] collection 页无新增硬编码 hex
- [x] community.wxss 中 #F4EDFF → var(--heal-tint) (新增变量)

## M. v3 决策不变（回归测试）✅
- [x] 全项目 grep `vibrate|accelerometer|shouldVibrate` = 0 匹配（已修复 6 个遗漏）
- [x] 全项目 grep `moon-night.svg` = 0 匹配
- [x] app.json 仍注册 39 页
- [x] 6 模式 MODE_LIST 不变
- [x] data/badges.js 仍为 19 个徽章
- [x] data/commands.js 仍为 ~223 指令

## N. 最终视觉验证 ✅
- [x] 6 模式芯片单行可滚动（CSS 验证）
- [x] 今日推荐 padding-bottom 160rpx
- [x] 指令详情卡 z-index 999 + padding-bottom 200rpx
- [x] 徽章墙 3 列网格显示 19 徽章
- [x] 模式芯片选中态干净

## 验证过程中修复的回归

- 6 个 `wx.vibrateShort` 残留：command-detail.js / escape-prep.js / photo-edit.js (×3) / help.js
- `tabbar-placeholder` 不一致：app.wxss / map.wxss / profile.wxss 全部从 180rpx/160rpx 改为 130rpx
- 硬编码颜色：`#F4EDFF` → 新增 `--heal-tint` 变量

**最终判定：v4 布局修复完成，所有检查项通过，零 v3 回归。**
