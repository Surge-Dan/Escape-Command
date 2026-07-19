# v6 Tasks

## Task 1: nav-header 胶囊安全区适配（P0）
- [ ] SubTask 1.1: app.js onLaunch 加 `wx.getMenuButtonBoundingClientRect()` 计算 `navPaddingRight`
- [ ] SubTask 1.2: globalData 加 `navHeaderStyle` 字符串
- [ ] SubTask 1.3: 所有 30+ 页面 nav-header 注入 `style="{{navHeaderStyle}}"`
- [ ] SubTask 1.4: nav-header-title 改绝对定位居中
- [ ] SubTask 1.5: 验证标题不被胶囊遮挡

## Task 2: scroll-view 88rpx → 72rpx 批量修复（P0）
- [ ] SubTask 2.1: 14 个 wxml 文件逐一改 `88rpx);"` → `72rpx);"`
- [ ] SubTask 2.2: 复核 profile.wxss:9（已修）
- [ ] SubTask 2.3: grep 全项目确认 0 个 `88rpx);"` 残留（在 scroll-view height 上下文）

## Task 3: 按钮规范升级（P0）
- [ ] SubTask 3.1: app.wxss .btn-primary 80rpx → 88rpx，字号 28rpx → 32rpx
- [ ] SubTask 3.2: app.wxss .btn-secondary 64rpx → 88rpx，字号 28rpx → 30rpx
- [ ] SubTask 3.3: grep 全项目按钮 min-height < 88rpx 的，逐一升级
- [ ] SubTask 3.4: 验证可点击区域 ≥ 88rpx × 88rpx

## Task 4: 地图页切原生 map（P0，大改）
- [ ] SubTask 4.1: pages/map/map.wxml 替换 map-canvas 为原生 <map>
- [ ] SubTask 4.2: 悬浮 UI（tab/时间/定位/数据卡）用 cover-view/cover-image 包裹
- [ ] SubTask 4.3: pages/map/map.js 配置 markers（all 模式，按 type 着色）
- [ ] SubTask 4.4: pages/map/map.js 配置 heat markers（按密度 size + color）
- [ ] SubTask 4.5: pages/map/map.js 配置 polyline（route 模式，按时间顺序）
- [ ] SubTask 4.6: pages/map/map.wxss 保留 v5 视觉差异化作为降级样式
- [ ] SubTask 4.7: 底部预留 TabBar 高度

## Task 5: 边距体系统一 40rpx（保留 v5 决策）
- [ ] SubTask 5.1: grep 页面容器 `padding: .* 32rpx` 统一到 40rpx
- [ ] SubTask 5.2: 复核 6 主页面边距一致

## Task 6: 分页面修复（P1）
- [ ] SubTask 6.1: 首页 6 项修复（问候/芯片/提示条/骰子/收藏入口/今日推荐）
- [ ] SubTask 6.2: 指令详情弹出卡 5 项修复
- [ ] SubTask 6.3: 执行中页面 6 项修复
- [ ] SubTask 6.4: 我的页面 5 项修复
- [ ] SubTask 6.5: 指令详情独立页 5 项修复

## Task 7: 最终验证
- [ ] SubTask 7.1: 30+ 页面 nav-header 不被胶囊遮挡
- [ ] SubTask 7.2: 0 个 scroll-view 88rpx 残留
- [ ] SubTask 7.3: 所有按钮 ≥ 88rpx
- [ ] SubTask 7.4: 地图原生 map 正常渲染 + 3 模式差异化
- [ ] SubTask 7.5: v3/v4/v5 决策零回归

# Task Dependencies

- Task 1 独立（但影响所有页面）
- Task 2 独立
- Task 3 独立
- Task 4 独立（大改，单独 agent）
- Task 5 依赖 Task 1（nav-header 改完后页面容器边距再统一）
- Task 6 依赖 Task 1-3（按钮/边距/scroll-view 规范就位后修分页面）
- Task 7 依赖所有
