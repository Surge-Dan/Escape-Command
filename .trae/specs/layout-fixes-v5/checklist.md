# v5 综合修复 Checklist (已验证通过)

## A. 首页清理 quick-grid（Task 1）✅
- [x] `pages/index/index.wxml` 无 `quick-grid` 元素
- [x] `pages/index/index.wxss` 无 `.quick-grid` / `.quick-item` 样式
- [x] `pages/index/index.js` 无 `goTimeline` / `goChallenge` / `goPartner` / `goCommunity`
- [x] 首页底部只有 `bottom-spacer` 接 TabBar
- [x] 不再有 4 个彩色图标被 TabBar 遮挡

## B. 地图页 3 模式视觉差异化（Task 2）✅
- [x] all 模式：浅色网格 + 渐变天空 + pin 标记
- [x] heat 模式：6x6 暗色 grid + 径向发光（蓝→黄→红）
- [x] route 模式：深色地图 + 路线 glow 阴影
- [x] heat cells 带 `data-intensity` 标签
- [x] 切换 tab 200-300ms 平滑过渡
- [x] 标记点 pin 仍然可点击 + 弹窗

## C. 个人页 5 分类卡片（Task 3）✅
- [x] 5 分类：回忆/互动/收藏/成长/设置
- [x] 每分类 4 个子项网格排列
- [x] 子项点击 navigateTo 对应页面
- [x] 用 `data-accent` + CSS var 替代 8 位 hex
- [x] `::before` 伪元素实现分类色 tint
- [x] 9 个缺失 icon 全部替换为已存在的图标
- [x] 不再单列竖排

## D. 响应式加固（Task 4）✅
- [x] 全局 `.bottom-spacer` = 130rpx + safe-area
- [x] `profile.wxss` line 9 修正：100vh - 72rpx
- [x] 全项目无 `100vh - 88rpx`
- [x] 各页面 local `.bottom-spacer` 与全局一致

## E. 导航栏毛玻璃（Task 5）✅
- [x] `.nav-header` 高度 72rpx
- [x] 背景 `rgba(245, 243, 239, 0.72)` + `backdrop-filter: blur(40px) saturate(2)`
- [x] 无 1rpx 硬底边线，替换为 hairline shadow
- [x] title 字号 30rpx
- [x] back 按钮 56rpx
- [x] right gap 12rpx

## F. 视觉高级感（Task 6）✅
- [x] 阴影统一用 var(--shadow-*)
- [x] 圆角统一用 var(--radius-*)
- [x] active 态 scale(0.97-0.99)
- [x] 动效用 var(--ease-*)

## G. v3 + v4 决策不变（回归）✅
- [x] 6 模式不变
- [x] 19 徽章不变
- [x] 36 页注册不变
- [x] 无震动 / 无摇一摇
- [x] v4 决策：daily-section 160rpx / z-index 999 / 模式芯片横向 / TabBar 130rpx / 19 徽章 3 列 / 会员弱化
- [x] v3 决策：moon-gray 替代 moon-night

## H. 最终视觉 ✅
- [x] 首页无底部重复入口
- [x] 地图页 3 模式视觉不同
- [x] 个人页 5 分类卡片整齐
- [x] 导航栏毛玻璃高级感
- [x] 全项目 0 个 8 位 hex 颜色
- [x] 全项目 0 个震动 API 调用

**最终判定：v5 综合修复完成，所有 13 项检查通过，零 v3/v4 回归。**
