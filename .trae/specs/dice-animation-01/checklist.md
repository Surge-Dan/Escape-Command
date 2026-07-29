# Checklist: 骰子动画

> 提交 PR 前必逐项打勾。FAIL=0 才能合并。

## 资源

- [ ] `assets/icons/dice-face-1.svg` 存在
- [ ] `assets/icons/dice-face-2.svg` 存在
- [ ] `assets/icons/dice-face-3.svg` 存在
- [ ] `assets/icons/dice-face-4.svg` 存在
- [ ] `assets/icons/dice-face-5.svg` 存在（已有）
- [ ] `assets/icons/dice-face-6.svg` 存在
- [ ] 6 个 SVG 风格统一（stroke / fill / 圆角一致）

## 页面

- [ ] `pages/generating/generating.wxml` 增加 `.dice-stage` 容器
- [ ] 容器内有动态渲染骰子面的逻辑
- [ ] "摇"按钮 + "再摇一次"按钮存在
- [ ] 点击区域 ≥ 88rpx

## 样式

- [ ] `pages/generating/generating.wxss` 增加 `dice-shake` keyframes
- [ ] `pages/generating/generating.wxss` 增加 `dice-roll` keyframes
- [ ] `pages/generating/generating.wxss` 增加 `dice-settle` keyframes
- [ ] `.dice.is-shaking / is-rolling / is-settled` 状态样式存在
- [ ] pixelRatio < 2 降级样式存在
- [ ] reduceMotion 减少动效样式存在

## 逻辑

- [ ] `pages/generating/generating.js` `data` 含 `diceState / currentFace / isAnimating`
- [ ] `triggerRoll()` 实现防抖（`isAnimating` 检查）
- [ ] 状态机顺序执行 idle → shaking → rolling → settled
- [ ] `wx.onAccelerometerChange` 摇一摇手势接入，同样走防抖
- [ ] `wx.getStorageSync('reduceMotion')` 读取并缩短动画到 0.6s
- [ ] 离开页面时 `wx.offAccelerometerChange` 解绑

## 验收（功能表）

- [ ] 动画首尾状态完整
- [ ] 操作期间不可重复触发
- [ ] 结束状态与业务结果一致
- [ ] 低端机无明显卡顿（pixelRatio < 2 模拟器验证）
- [ ] 支持减少动效

## 自动检查

- [ ] `node scripts/check-syntax.js` FAIL=0
- [ ] `node scripts/final-check.js` WXML FAIL=0 / 页面 FAIL=0 / TabBar 完整
- [ ] `node scripts/release-check.js` 通过（退出码 0）

## 开发者工具

- [ ] 微信开发者工具重新编译通过
- [ ] Console 无新错误
- [ ] Network 无 404
- [ ] 模拟器 iOS 验证一次
- [ ] 模拟器 Android 验证一次

## 真机

- [ ] P0 任务至少一台真机验证 happy path
- [ ] 截图：idle / shaking / rolling / settled 四态

## 提交

- [ ] `git add -- <指定文件>` 定向暂存
- [ ] `git diff --cached` 不含 `project.private.config.json`
- [ ] `git diff --cached` 不含 API Key / 凭证
- [ ] Conventional Commits 信息（如 `feat(generating): add dice rotation animation`）
- [ ] `git push -u origin feature/generator-01`
- [ ] 创建 PR 填写完整模板（任务 ID、变更目的、范围、验收、检查证据、真机证据、风险、回滚、AI 使用说明）
