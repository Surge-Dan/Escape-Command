# v7 品牌渐变与分页面视觉 Tasks

## Task 1: 全局背景渐变（P0）
- [x] SubTask 1.1: app.wxss `page` 背景改为 `linear-gradient(180deg, #FFF6F0 0%, #F5F3EF 60%, #F5F3EF 100%)`
- [x] SubTask 1.2: 调整 `--canvas` 语义：用于卡片底色，不再作为页面主背景
- [x] SubTask 1.3: 移除 index.wxss `.hero-warm` 的渐变背景，改为透明 + 光晕装饰
- [x] SubTask 1.4: 检查所有页面是否有局部覆盖 `page` 背景导致渐变失效的样式，统一清理

## Task 2: 首页 Hero 文字规范化（P0）
- [x] SubTask 2.1: index.wxml 拆分 hero 第二行为 `普通文字 + 斜体强调 + 句点` 三个 inline text
- [x] SubTask 2.2: index.wxss `.hero-title-line` 字号 72rpx→64rpx，行高 1.05→1.15
- [x] SubTask 2.3: index.wxss `.hero-italic` 字号 80rpx→68rpx，移除独立 line-height，跟随父行
- [x] SubTask 2.4: 验证首屏文字不换行溢出、基线对齐

## Task 3: 按钮与底部安全区修复（P0）
- [x] SubTask 3.1: index.wxss `.cmd-actions` padding-bottom 改为 `calc(var(--safe-bottom) + 12rpx)`
- [x] SubTask 3.2: index.wxss `.bottom-spacer` 改为与 `.tabbar-placeholder` 一致或移除（避免双重留白）
- [x] SubTask 3.3: custom-tab-bar/index.wxss 移除 `.tabbar-item.active .tabbar-icon-wrap` 的 `filter: brightness(0) invert(1)`
- [x] SubTask 3.4: custom-tab-bar/index.wxss 未激活图标 opacity 0.7→0.65，激活态 opacity 1.0
- [x] SubTask 3.5: 验证 `-active.svg` 文件存在且为白色/清晰版本（assets/icons/tab-*-active.svg）

## Task 4: 分页面视觉主题（P0）
- [x] SubTask 4.1: 首页 index：保留大标题 hero 区，融入全局渐变
- [x] SubTask 4.2: 地图 map：顶部加简洁主题区"城市记忆" + 副标题"你走过的角落"，不加衬线大标题
- [x] SubTask 4.3: 我的 profile：头像区卡片浮在渐变上，保持简洁标题
- [x] SubTask 4.4: 执行中 executing：计时数字品牌绿大字号，步骤卡片白底
- [x] SubTask 4.5: 设置 settings：分组卡片白底 + 大圆角，顶部简洁标题
- [x] SubTask 4.6: 指令详情 command-detail：顶部标题即指令标题，插画区下方白底卡片

## Task 5: 导航栏图标不变约束（P0）
- [x] SubTask 5.1: 复核所有 nav-header-back 仍使用 `chevron-left-ink.svg`
- [x] SubTask 5.2: 确认不引入新的 nav-header 图标

## Task 6: 安装微信小程序开发规范 skill（P1）
- [x] SubTask 6.1: 搜索微信小程序/前端最佳实践 skill
- [x] SubTask 6.2: 若找到合适 skill，执行安装
- [x] SubTask 6.3: 若未找到，记录原因并继续用已有脚本做基础校验

## Task 7: 最终验证
- [x] SubTask 7.1: 运行 `scripts/check-syntax.js` 通过
- [x] SubTask 7.2: 运行 `scripts/final-check.js` 通过
- [x] SubTask 7.3: 运行 `scripts/audit-icons.js` 通过
- [x] SubTask 7.4: 全项目 grep 检查无新增 `--canvas` 作为页面背景的情况
- [x] SubTask 7.5: 人工走查 6 个主页面，确认无错位、无遮挡

# Task Dependencies

- Task 1 独立（但影响全局）
- Task 2 依赖 Task 1（hero 区融入渐变后再调文字）
- Task 3 独立
- Task 4 依赖 Task 1（页面背景统一后分页面主题区才稳定）
- Task 5 独立
- Task 6 独立
- Task 7 依赖所有
