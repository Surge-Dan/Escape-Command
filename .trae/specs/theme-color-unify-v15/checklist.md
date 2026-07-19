# Checklist

## 全局品牌色
- [x] `app.wxss` 中 `--brand` 改为 `#C8956E`
- [x] `app.wxss` 中 `--brand-dark` 改为 `#A87B52`
- [x] `app.wxss` 中 `--brand-strong` 改为 `#A87B52`
- [x] `app.wxss` 中 `--brand-tint` 改为 `#F5E6D8`
- [x] `app.wxss` 中 `--brand-weak` 改为 `#FAF3ED`
- [x] `app.wxss` 中 `--shadow-button` 改为棕褐色透明阴影
- [x] 全项目 `pages/**/*.wxss` + `app.wxss` 中无残留 `#5CBF9E` / `#45B08C` 用于按钮/背景/边框（装饰性图标除外）
  - 备注：`app.wxss:31` 保留 `--type-culture: #5CBF9E`，为“文化”类指令的语义类型色，非品牌色，不在本次统一范围内。

## 地图页绿色硬编码
- [x] `pages/map/map.wxss` 地图 Tab 激活态背景使用 `var(--brand)`
- [x] `pages/map/map.wxss` 地图 Tab 激活态边框使用 `var(--brand)`
- [x] `pages/map/map.wxss` 回到当前位置按钮颜色使用 `var(--brand)`
- [x] `pages/map/map.wxss` 设为家按钮颜色使用 `var(--brand)`

## 首页邀请朋友按钮
- [x] `pages/index/index.wxml` 中【邀请朋友】按钮移入 `.cmd-actions` 与【接受指令】并排
- [x] `pages/index/index.wxss` 中 `.invite-btn` 不再使用 `#9B7BB8` 紫色边框
- [x] `.invite-btn` 改为填充样式，颜色与暖色调协调
- [x] `.invite-btn` 高度、圆角、字号、字重与 `.action-btn` 一致
  - 修复：Task 4 将 `.invite-btn` 的 `min-height` 由 `88rpx` 调整为 `96rpx`，与 `.action-btn` 实际高度保持一致。
- [x] `.invite-btn` 与 `.action-btn.primary` 在 `.cmd-actions` 中空间分配合理

## 个人资料页及其他
- [x] `pages/profile/profile.wxss` 无硬编码绿色按钮
- [x] `pages/profile-edit/profile-edit.wxss` 保存按钮颜色随 `--brand` 生效
- [x] `custom-tab-bar/index.wxss` 选中色使用 `var(--brand)` 且生效

## 验证
- [x] `check-syntax.js` 通过，0 处失败
- [x] `final-check.js` 通过，0 处失败
- [x] 静态审查全项目无未预期绿色残留
