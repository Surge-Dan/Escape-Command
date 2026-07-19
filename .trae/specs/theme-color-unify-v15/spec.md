# v15 全局主题色统一：浅绿改暖棕褐 + 邀请按钮重构 Spec

## Why

当前小程序大量使用薄荷绿（`#5CBF9E`）作为品牌主色，与整体暖米色/浅棕褐的视觉基调（`--canvas: #F5F3EF`、hero 暖橙渐变）冲突，显得突兀。同时首页【邀请朋友】按钮使用紫色边框样式，位置独立于【接受指令】之外，视觉层级与色彩都不协调。需要把品牌色统一到暖棕褐系，并把邀请按钮重构为与主按钮并排的填充样式。

## What Changes

### A. 全局品牌色改为暖棕褐系（P0）
- 修改 `app.wxss` 中的 CSS 变量：
  - `--brand` 由 `#5CBF9E` 改为 `#C8956E`（暖棕褐）
  - `--brand-dark` / `--brand-strong` 由 `#45B08C` 改为 `#A87B52`（深棕褐）
  - `--brand-tint` 由 `#E0F5EF` 改为 `#F5E6D8`（浅棕褐米）
  - `--brand-weak` 由 `#F0FAF6` 改为 `#FAF3ED`（更弱的暖米色）
  - `--shadow-button` 由绿色透明阴影改为棕褐色透明阴影 `0 4rpx 12rpx rgba(160, 110, 70, 0.25)`
- 修改 `pages/map/map.wxss` 中硬编码的绿色值 `#5CBF9E`：
  - 地图 Tab 激活态背景、边框
  - 回到当前位置按钮的 ring/center 颜色
  - 设为家按钮（+ 按钮）的颜色
  - 将上述硬编码替换为 `var(--brand)`，使地图页随全局品牌色变化

### B. 首页【邀请朋友】按钮重构（P0）
- 修改 `pages/index/index.wxss`：
  - `.invite-btn` 不再使用 `#9B7BB8` 紫色边框样式
  - 改为填充样式，背景使用 `var(--accent)`（`#D48A5A`，与品牌暖棕褐同系）或 `var(--brand)`，文字使用 `--white`
  - 高度、圆角、字号与 `.action-btn` 保持一致
- 修改 `pages/index/index.wxml`（如需要）：
  - 将【邀请朋友】按钮移入 `.cmd-actions` 容器内，与【接受指令】并排显示
  - 布局为：左侧【邀请朋友】（次级/填充浅色），右侧【接受指令】（主按钮/填充深色）；或左侧主按钮 + 右侧邀请按钮，根据视觉权重决定
  - 保持按钮间距 16rpx，与 `.cmd-actions` 现有 gap 一致

### C. 个人资料页及其他页面绿色按钮统一（P0）
- 修改 `pages/profile-edit/profile-edit.wxss`：保存按钮当前使用 `var(--brand)`，会随全局变量自动生效，但需检查是否有硬编码 `#5CBF9E`
- 修改 `pages/profile/profile.wxss`：检查并替换任何硬编码绿色按钮为 `var(--brand)`
- 全项目扫描 `pages/**/*.wxss` 中所有 `#5CBF9E` 和 `#45B08C` 硬编码，统一替换为 `var(--brand)` / `var(--brand-dark)`（保留图标/插画中的装饰绿除外）

## Impact

- 受影响 specs：`ui-fix-v14` 及之前所有涉及品牌绿色的 UI specs
- 受影响代码：
  - `app.wxss`（全局颜色 token）
  - `pages/map/map.wxss`（硬编码绿色）
  - `pages/index/index.wxss` + `pages/index/index.wxml`（邀请按钮）
  - `pages/profile/profile.wxss`、`pages/profile-edit/profile-edit.wxss`
  - 可能涉及的其他页面：collection、settings、record、executing 等（引用 `--brand` 的会自动生效）

## ADDED Requirements

### Requirement: 全局品牌色统一为暖棕褐系
#### Scenario: 用户打开任意页面
- **WHEN** 页面渲染使用 `--brand` / `--brand-dark` / `--brand-tint` 的组件
- **THEN** 颜色显示为暖棕褐色系，不再出现薄荷绿
- **AND** 按钮阴影、选中态、高亮态与新的品牌色一致

### Requirement: 邀请朋友按钮与接受指令并排显示
#### Scenario: 用户在首页抽到双人/社交类指令
- **WHEN** 指令详情卡展示【邀请朋友】和【接受指令】按钮
- **THEN** 两个按钮在同一行并排显示
- **AND** 邀请朋友按钮为填充样式，颜色与整体暖色调协调
- **AND** 按钮间距、高度、圆角保持一致

## MODIFIED Requirements

- v12 首页指令卡操作区只有【重摇/收藏/接受】 → 现在【邀请朋友】进入 `.cmd-actions` 并排
- v11 邀请朋友按钮为紫色边框 → 改为暖色填充
- v7/v8 品牌绿色 token → 改为暖棕褐 token

## REMOVED Requirements

- 无删除
