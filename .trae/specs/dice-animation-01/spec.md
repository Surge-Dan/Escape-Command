# 骰子动画 Spec

> Spec ID: `dice-animation-01`
> 对应功能表：序号 30，模块「骰子生成系统」，细分功能「骰子动画」
> 分支：`feature/generator-01`
> 创建日：2026-07-28

## Why

用户在首页点击"摇一摇"或"出逃"按钮时，骰子旋转动画是整个出逃动作的**视觉心跳**。功能表 P0 级，影响用户对产品的第一感受，也是后续所有"生成"流程可见化的基础。本 Spec 不实现"生成逻辑"本身，只负责摇动、旋转、落点的视觉表现与状态机。

## What Changes

- 在 `pages/generating/generating` 页面（生成中页）中心位置增加一个骰子组件
- 骰子使用 **SVG 6 面**（项目已有 `assets/icons/dice-5.svg` 等图标，可复用或重制）
- 使用 **CSS3 @keyframes** 实现旋转 + 缩放动效
- 状态机：`idle → shaking → rolling → settled`，每个状态有独立视觉
- "摇"指令触发后：旋转 1.2 秒（90 度 × 4 次 = 3-4 圈），落点保持正面朝用户
- 期间不可重复触发（按钮 / 摇一摇手势 防抖）
- 低端机自适应：检测 `wx.getSystemInfoSync().platform` 与 `pixelRatio`，pixelRatio < 2 时关闭投影

不修改：
- 生成逻辑（生成器业务逻辑在 `app.js` 的 `rollCommand`，本 Spec 不动）
- 任何业务数据存储
- 任何其他模块的页面

## Impact

- Affected specs: 无
- Affected code:
  - `pages/generating/generating.wxml`（增加骰子组件 slot）
  - `pages/generating/generating.wxss`（增加动画 keyframes）
  - `pages/generating/generating.js`（增加状态机 + 防抖）
  - `assets/icons/dice-*.svg`（复用现有图标，必要时新增 `dice-face-1..6.svg`）
  - 不需要新增云函数

## ADDED Requirements

### Requirement: 骰子旋转动画
系统 SHALL 在 generating 页面提供可视化的骰子旋转动画。

#### Scenario: 触发摇动
- **WHEN** 用户在 generating 页面点击"开始"或"再摇一次"按钮
- **THEN** 骰子从 idle 状态进入 shaking 状态（持续 0.3 秒小幅度晃动）
- **AND THEN** 自动进入 rolling 状态（持续 1.2 秒主旋转）
- **AND THEN** 进入 settled 状态（停在新指令对应的点数上）

#### Scenario: 防抖
- **WHEN** 动画在 rolling 状态中
- **THEN** 用户再次点击按钮不触发新动画
- **AND** 摇一摇手势（`wx.onAccelerometerChange`）也不触发新动画

#### Scenario: 低端机降级
- **WHEN** 设备 pixelRatio < 2
- **THEN** 关闭骰子投影 / blur 滤镜
- **AND** 仍保留旋转动画

#### Scenario: 减少动效偏好
- **WHEN** 系统设置"减少动效"开启（读 wx.getStorageSync('reduceMotion')）
- **THEN** 动画时长缩短到 0.6 秒
- **AND** 不使用 shake 状态

#### Scenario: 状态终态正确
- **WHEN** settled 状态显示
- **THEN** 骰子正面点数（currentFace 1-6）由 `command.type` 通过 `getFaceForType(type)` 函数映射得出
- **AND** 若 `command.type` 缺失或未知，fallback 到 `currentFace = 1` 并保留可执行性
- **AND** settled 状态保持可见，不可被其他动画覆盖

## MODIFIED Requirements

无（这是新增功能，不修改现有需求）

## REMOVED Requirements

无

---

## 验收标准（来自功能表）

1. ✅ 动画首尾状态完整：idle → shaking → rolling → settled 顺序执行，无跳变
2. ✅ 操作期间不可重复触发：rolling 状态中按钮和手势都无响应
3. ✅ 结束状态与业务结果一致：settled 显示的点数对应生成的指令 type
4. ✅ 低端机无明显卡顿：pixelRatio < 2 设备在模拟器中验证帧率 ≥ 50fps
5. ✅ 支持减少动效：开启后动画时长 ≤ 0.6s

## 测试要求（PR 提交时必填）

- 微信开发者工具编译通过，Console 无新错误
- 模拟器：iOS 14（iPhone X 模拟）+ Android 10（Pixel 2 模拟）各一次
- 真机：P0 任务，至少一台真机过 happy path（推荐 Android）
- 三个脚本：`check-syntax FAIL=0`、`final-check WXML FAIL=0 / 页面 FAIL=0 / TabBar 完整`、`release-check 通过`

## 风险

- 包体：仅使用现有 SVG 资源，新增 ≤ 2KB（CSS keyframes 不增体积）
- 兼容性：CSS3 @keyframes 在微信小程序基础库 ≥ 2.0 全部支持
- 性能：旋转动画使用 `transform: rotate()` 触发 GPU 合成，无重排

## 回滚

本 Spec 改动集中在 `pages/generating/*`，可直接 revert PR 的 squash commit，不影响其他模块。
