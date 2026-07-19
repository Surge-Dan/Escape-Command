# Tasks

## Task 1: 全局品牌色改为暖棕褐系（P0）
- [x] SubTask 1.1: 修改 `app.wxss` 中的品牌色 token
  - `--brand` → `#C8956E`
  - `--brand-dark` → `#A87B52`
  - `--brand-strong` → `#A87B52`
  - `--brand-tint` → `#F5E6D8`
  - `--brand-weak` → `#FAF3ED`
  - `--shadow-button` → `0 4rpx 12rpx rgba(160, 110, 70, 0.25)`
- [x] SubTask 1.2: 修改 `pages/map/map.wxss` 中的硬编码绿色
  - 地图 Tab 激活态背景、边框 `#5CBF9E` → `var(--brand)`
  - 回到当前位置按钮的 `.locate-ring` border-color 和 `.locate-center` background-color `#5CBF9E` → `var(--brand)`
  - 设为家按钮（+ 按钮）相关颜色 `#5CBF9E` → `var(--brand)`
  - 检查是否有遗漏的 `#45B08C` 硬编码并替换
- [x] SubTask 1.3: 全项目扫描 `#5CBF9E` / `#45B08C` 硬编码
  - 使用 Grep 扫描 `pages/**/*.wxss` 和 `app.wxss`
  - 将按钮/背景/边框相关的硬编码替换为 `var(--brand)` / `var(--brand-dark)`
  - 保留纯装饰性插画/图标中的绿色（如有明确非按钮用途可保留）

## Task 2: 首页邀请朋友按钮重构（P0）
- [x] SubTask 2.1: 修改 `pages/index/index.wxml`
  - 将 `<button class="invite-btn">` 从 `.cmd-actions` 外部移入 `.cmd-actions` 内部
  - 与【接受指令】按钮并排：建议左侧为【邀请朋友】，右侧为【接受指令】
  - 保持 `.cmd-actions` 的 flex gap=16rpx
- [x] SubTask 2.2: 修改 `pages/index/index.wxss`
  - `.invite-btn` 移除 `#9B7BB8` 紫色边框样式
  - 改为填充样式：`background: var(--accent); color: var(--white);`（`--accent: #D48A5A` 与品牌暖棕褐同系）
  - 高度、圆角、字号、字重与 `.action-btn` 一致（min-height 88rpx，border-radius var(--radius-md)，font-size 28rpx，font-weight 600）
  - active 态保持轻微缩放和颜色加深
  - 若 `.action-btn.primary` 当前宽度为 flex:1，需要与邀请按钮分配空间（例如各 50% 或主按钮 60% / 邀请 40%）

## Task 3: 检查个人资料页及相关页面（P0）
- [x] SubTask 3.1: 检查 `pages/profile/profile.wxss`
  - 查找硬编码绿色按钮，替换为 `var(--brand)`
- [x] SubTask 3.2: 检查 `pages/profile-edit/profile-edit.wxss`
  - 保存按钮应已随 `--brand` 变量生效，确认无硬编码绿色
- [x] SubTask 3.3: 检查 `custom-tab-bar/index.wxss`
  - TabBar 选中色使用 `var(--brand)`，确认改色后效果正常
## Task 4: 验证与自测
- [x] SubTask 4.1: 运行 `check-syntax.js` 验证 JS/WXML 语法
- [x] SubTask 4.2: 运行 `final-check.js` 综合校验
- [x] SubTask 4.3: 静态审查首页邀请按钮布局与颜色、地图页绿色硬编码、全局 token 是否统一
- [x] SubTask 4.4: 真机预览建议：检查首页、地图页、个人资料页按钮颜色是否统一为暖棕褐

# Task Dependencies

- Task 1 与 Task 2 互相独立，可并行实施
- Task 3 依赖 Task 1（全局变量已生效）
- Task 4 依赖 Task 1、Task 2、Task 3 全部完成
