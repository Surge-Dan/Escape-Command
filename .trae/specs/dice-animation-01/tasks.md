# Tasks: 骰子动画

## 任务列表

- [ ] Task 1: 准备 6 面 SVG 骰子资源
  - [ ] SubTask 1.1: 检查 `assets/icons/dice-5.svg` 等现有图标，看是否覆盖 1-6 面
  - [ ] SubTask 1.2: 缺失面（如 1/2/3/4/6）补齐，统一 stroke 风格与现有 dice-5.svg 保持一致
  - [ ] SubTask 1.3: 在 `assets/icons/` 命名 `dice-face-1.svg` ~ `dice-face-6.svg`

- [ ] Task 2: 在 generating 页面挂载骰子组件
  - [ ] SubTask 2.1: 读取 `pages/generating/generating.wxml` 现有结构
  - [ ] SubTask 2.2: 在中心位置增加 `<view class="dice-stage">` 容器
  - [ ] SubTask 2.3: 容器内根据 `currentFace` 变量动态渲染对应 dice-face-N
  - [ ] SubTask 2.4: 增加"摇"按钮 + "再摇一次"按钮（按现有 UI 规范）

- [ ] Task 3: 实现 CSS3 动画
  - [ ] SubTask 3.1: 在 `pages/generating/generating.wxss` 增加 `@keyframes dice-shake` (0.3s)
  - [ ] SubTask 3.2: 增加 `@keyframes dice-roll` (1.2s, 4 圈)
  - [ ] SubTask 3.3: 增加 `@keyframes dice-settle` (0.2s, 反弹)
  - [ ] SubTask 3.4: 为 `.dice.is-shaking`、`.dice.is-rolling`、`.dice.is-settled` 写状态样式
  - [ ] SubTask 3.5: 实现 `pixelRatio < 2` 时降级（关闭 `filter: drop-shadow`）

- [ ] Task 4: 实现状态机 + 防抖
  - [ ] SubTask 4.1: 在 `pages/generating/generating.js` 增加 `data: { diceState: 'idle', currentFace: 1, isAnimating: false }`
  - [ ] SubTask 4.2: 增加 `triggerRoll()` 方法，检查 `isAnimating` 防抖
  - [ ] SubTask 4.3: 状态机：setTimeout 链 idle→shaking→rolling→settled
  - [ ] SubTask 4.4: 接入 `wx.onAccelerometerChange`（摇一摇手势），同样走防抖
  - [ ] SubTask 4.5: 读取 `wx.getStorageSync('reduceMotion')` 缩短动画到 0.6s

- [ ] Task 5: 验收 + 提交
  - [ ] SubTask 5.1: 跑 `node scripts/check-syntax.js` 确认 FAIL=0
  - [ ] SubTask 5.2: 跑 `node scripts/final-check.js` 确认 WXML/页面/TabBar 三项 FAIL=0
  - [ ] SubTask 5.3: 跑 `node scripts/release-check.js` 确认通过
  - [ ] SubTask 5.4: 微信开发者工具编译，模拟器 iOS + Android 各一次
  - [ ] SubTask 5.5: 真机（P0）验证 happy path
  - [ ] SubTask 5.6: 截图（idle / shaking / rolling / settled 四态）
  - [ ] SubTask 5.7: `git add -- <指定文件>`，定向暂存，Conventional Commits 提交
  - [ ] SubTask 5.8: `git push -u origin feature/generator-01`
  - [ ] SubTask 5.9: 创建 PR，填写 PR 模板

# 任务依赖

- [Task 2] 依赖 [Task 1]（需要 SVG 资源）
- [Task 3] 依赖 [Task 2]（需要 wxml 容器）
- [Task 4] 依赖 [Task 2, Task 3]
- [Task 5] 依赖 [Task 1, Task 2, Task 3, Task 4]
