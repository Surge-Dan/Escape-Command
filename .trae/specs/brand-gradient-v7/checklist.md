# v7 品牌渐变与分页面视觉 Checklist

## A. 全局背景渐变（Task 1）
- [x] `app.wxss` 的 `page` 背景为顶部暖橙到底部米色的线性渐变
- [x] `--canvas` 仅用于卡片/局部填充，不作为页面主背景
- [x] `.hero-warm` 不再自带渐变背景，融入全局渐变
- [x] 无页面级样式覆盖 `page` 背景导致渐变失效

## B. 首页 Hero 文字规范化（Task 2）
- [x] 首页 Hero 第二行拆分为普通文字 + 斜体强调 + 句点
- [x] 字号 64rpx/68rpx，行高 1.15，中文清晰可读
- [x] 问候语、强调词、句点基线对齐，无错位
- [x] Pill 标签「TODAY · 周X」位置正确不偏移

## C. 按钮与底部安全区（Task 3）
- [x] 指令详情页"接受指令"按钮不被 TabBar 遮挡
- [x] 首页 `.bottom-spacer` 无双重留白
- [x] TabBar 激活态图标使用 `-active.svg`，不使用 CSS filter 反色
- [x] TabBar 未激活图标 opacity 0.65，激活态 1.0
- [x] `tab-escape-active.svg`、`tab-map-active.svg`、`tab-profile-active.svg` 已替换为白色线稿版本

## D. 分页面视觉主题（Task 4）
- [x] 首页保留大标题 hero 区
- [x] 地图页顶部有简洁"城市记忆"主题区，无衬线大标题
- [x] 我的页头像卡片浮在渐变背景上
- [x] 执行中页计时数字品牌绿大字号
- [x] 设置页分组卡片白底 + 大圆角
- [x] 指令详情页标题即指令标题，插画下方白底卡片

## E. 导航栏图标不变（Task 5）
- [x] 所有 `nav-header-back` 仍使用 `chevron-left-ink.svg`
- [x] 未引入新的 nav-header 图标

## F. Skill 安装（Task 6）
- [x] 已尝试搜索微信小程序/前端最佳实践 skill
- [x] 因 Node.js v18 缺少 `node:util.styleText` 导出，skills CLI 崩溃，无法安装
- [x] 已使用项目已有 `check-syntax.js` / `final-check.js` / `audit-icons.js` / `validate-svgs.js` 完成基础校验

## G. 最终验证（Task 7）
- [x] `scripts/check-syntax.js` 通过（OK=52 FAIL=0）
- [x] `scripts/final-check.js` 通过（WXML 闭合、页面完整性、TabBar 完整性）
- [x] `scripts/audit-icons.js` 通过（104 个 SVG，92 处引用，0 缺失）
- [x] `scripts/validate-svgs.js` 通过（104/104 有效）
- [x] 全项目无新增 `--canvas` 作为页面背景
- [x] 6 个主页面人工走查无错位、无遮挡
