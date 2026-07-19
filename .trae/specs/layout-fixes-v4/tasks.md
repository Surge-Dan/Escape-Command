# v4 布局修复 Tasks

## Task 1: 首页模式芯片横向滚动 + 关闭按钮修复（Tasks A/F/K.part）
- [ ] SubTask 1.1: `pages/index/index.wxml` 把 `.mode-list` 容器从 `display:flex` 改为 `scroll-x` 滚动容器
- [ ] SubTask 1.2: `.mode-chip` 固定宽度 180rpx/200rpx，`flex: 0 0 auto`，文字 `white-space: nowrap`
- [ ] SubTask 1.3: `pages/index/index.wxss` 移除 `.mode-chip.active` 的外圈 box-shadow 圆点
- [ ] SubTask 1.4: `pages/index/index.js` `closeCommand` 仅 `selectedCommand = null`，移除 `abandonCommand` 调用
- [ ] SubTask 1.5: `pages/index/index.js` `onShow` 调用 `loadDailyRecommend()` 刷新

## Task 2: TabBar 紧凑化（Task B）
- [ ] SubTask 2.1: `custom-tab-bar/index.wxss` 容器从 180rpx 减到 130rpx + 安全区
- [ ] SubTask 2.2: `.tabbar-icon-wrap` 96rpx→80rpx，`.tabbar-icon` 72rpx→56rpx
- [ ] SubTask 2.3: `.tabbar-item` 移除 active 态 `transform: scale(1.1)`
- [ ] SubTask 2.4: 文字 30rpx→24rpx，padding 16rpx 12rpx
- [ ] SubTask 2.5: 验证各 tab 页面 `.tabbar-placeholder` 一致

## Task 3: 今日推荐底部 padding + 卡片高度统一（Task C）
- [ ] SubTask 3.1: `pages/index/index.wxml` `.daily-section` 加 padding-bottom 160rpx
- [ ] SubTask 3.2: `.daily-card` 固定高度 220rpx，避免高度不一
- [ ] SubTask 3.3: 最后一张卡片 `margin-right: 40rpx` 避免贴边

## Task 4: 指令详情卡 z-index + 关闭按钮（Task D + K.part）
- [ ] SubTask 4.1: `pages/index/index.wxss` `.command-sheet` 加 `z-index: 999`
- [ ] SubTask 4.2: `.command-sheet` 加 `padding-bottom: 200rpx`
- [ ] SubTask 4.3: `pages/index/index.js` `closeCommand` 验证不调用 abandonCommand

## Task 5: 徽章墙 3 列网格（Task E）
- [ ] SubTask 5.1: `pages/badges/badges.wxml` 把每个 `.badge-section` 内的徽章列表改为 3 列 grid
- [ ] SubTask 5.2: `pages/badges/badges.wxss` `.badge-item` `width: calc((100% - 40rpx) / 3)`，3 列等分
- [ ] SubTask 5.3: 解锁/锁定视觉保持（gradient bg / gray bg + lock icon）
- [ ] SubTask 5.4: 验证 19 徽章全显示，按 5 分类（里程碑/类型/模式/社交/特殊）

## Task 6: 模式芯片多余装饰清理（Task F）
- [ ] SubTask 6.1: 检查 `.mode-chip.active` 的 box-shadow 是否外圈发散
- [ ] SubTask 6.2: 改为 `--shadow-float`（不外圈发散）或移除
- [ ] SubTask 6.3: 确认无"新"角标/红点

## Task 7: 场景插画占位（Task G）
- [ ] SubTask 7.1: `pages/command-detail/command-detail.wxml` 和 `pages/index/index.wxml` 的 `.cmd-image-wrap` 内部加渐变背景
- [ ] SubTask 7.2: 当 `illustration` 缺失时显示 typeColor 渐变 + 居中类型 icon
- [ ] SubTask 7.3: 验证 `data/commands.js` 每条指令都有 illustration 路径

## Task 8: 问候语字号（Task H）
- [ ] SubTask 8.1: `pages/index/index.wxss` `.greeting-line` 字号 24rpx→28rpx
- [ ] SubTask 8.2: 颜色 `--ink-soft`→`--ink`
- [ ] SubTask 8.3: `.home-header` padding-bottom 16rpx→20rpx

## Task 9: 动效时长统一（Task I）
- [ ] SubTask 9.1: `pages/index/index.wxss` 卡片/芯片动画确认 200ms/300ms/400ms/2500ms
- [ ] SubTask 9.2: 验证 ease-standard/ease-bounce 缓动应用

## Task 10: "我的"页面会员入口弱化（Task J）
- [ ] SubTask 10.1: `pages/profile/profile.wxss` `.member-card` 背景从金色渐变改为 `--brand-tint`
- [ ] SubTask 10.2: `pages/profile/profile.wxml` 标题"开通出逃会员"→"出逃会员"
- [ ] SubTask 10.3: CTA "去开通"→"了解 ›"
- [ ] SubTask 10.4: 点击事件确认 navigateTo member 页（不弹窗）

## Task 11: 联动刷新（Task K）
- [ ] SubTask 11.1: `pages/map/map.js` `onShow` 重新从 `globalData.records` 生成 markers
- [ ] SubTask 11.2: `pages/badges/badges.js` `onShow` 重新从 `globalData.badges` 计算解锁状态
- [ ] SubTask 11.3: `pages/profile/profile.js` `onShow` 重新计算 stats

## Task 12: CSS 变量一致性扫查（Task L）
- [ ] SubTask 12.1: Grep 硬编码 hex 颜色（除 mode 6 色 + type 5 色）在 index/executing/record/map/profile/badges/collection 页面
- [ ] SubTask 12.2: 替换为 var(--*) 变量

## Task 13: 最终验证
- [ ] SubTask 13.1: 在 iPhone 13/14 尺寸下截图验证 6 个模式芯片单行可滚动
- [ ] SubTask 13.2: 验证 TabBar 高度 ≤ 130rpx + 安全区
- [ ] SubTask 13.3: 验证今日推荐卡片不被 TabBar 遮挡
- [ ] SubTask 13.4: 验证指令卡 z-index 高于 TabBar
- [ ] SubTask 13.5: 验证徽章墙 3 列网格显示 19 徽章
- [ ] SubTask 13.6: grep 全项目 `vibrate|accelerometer|shake` 仍为 0 匹配
- [ ] SubTask 13.7: grep 全项目 `moon-night.svg` 仍为 0 匹配
- [ ] SubTask 13.8: app.json 仍是 39 页注册

# Task Dependencies

- Task 1 独立
- Task 2 独立
- Task 3 独立
- Task 4 依赖 Task 1（closeCommand 修复）
- Task 5 独立
- Task 6 依赖 Task 1（模式芯片）
- Task 7 独立
- Task 8 独立
- Task 9 独立
- Task 10 独立
- Task 11 独立
- Task 12 独立
- Task 13 依赖所有 Task
