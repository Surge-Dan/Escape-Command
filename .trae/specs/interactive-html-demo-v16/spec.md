# v16 交互式 HTML Demo Spec

## Why

「出逃指令」小程序已迭代至 v15，但缺少一个对外可分享、可独立运行的演示载体。需要一个单文件 HTML 交互 Demo，让产品/设计/合作方在浏览器中即可体验核心出逃流程，无需安装微信开发者工具或扫码。

## What Changes

### A. 创建单文件交互式 HTML Demo（P0）
- 新建 `demo/index.html`（项目根目录下新建 `demo/` 文件夹）
- **单文件**：HTML + CSS + JS 全部内联，不依赖外部资源（除 Google Fonts CDN）
- **响应式**：在桌面浏览器中以 iPhone 比例（375×812）居中显示手机框；移动端访问则全屏自适应
- **核心交互流程**：
  1. **启动页**（简化 onboarding）：一句 slogan「给城市一个随机出口」+ 进入按钮
  2. **首页**：
     - 顶部 Hero：问候语「上午好，出门透口气」（宋体衬线，暖色渐变背景）+ 日期标签
     - 模式 Tag（点击展开 Sheet，3 个模式：智能匹配/微出逃/城市漫游）
     - 出逃卡：骰子图标 + 「摇一摇，出个指令」文案 + 脉冲环动画
     - 今日推荐：3 条精选指令卡片
  3. **摇骰子 → 指令详情卡**（弹出 Sheet）：
     - 类型标签、指令标题、时长/距离/人数元信息
     - 小贴士
     - 操作区：收藏 + 邀请朋友（双人模式才显示） + 接受指令
  4. **执行页**：
     - 4 步出逃步骤（可点击完成）
     - 全部完成后显示「完成出逃」按钮 + 徽章解锁动画
  5. **底部 TabBar**：出逃 / 地图 / 我的（可切换）
     - 地图页：简化版，展示标记点 + 模式切换
     - 我的页：用户卡片 + 徽章墙 + 统计数据

### B. 视觉设计方向（P0）
- **美学定位**：Editorial Magazine + Organic Natural
  - 像一本生活方式杂志的交互版本
  - 衬线字体大标题 + 留白 + 暖色调 + 手绘风插画
- **配色**（与小程序 v15 主题统一）：
  - 主品牌色：`#C8956E`（暖棕褐）
  - 深品牌色：`#A87B52`
  - 背景米色：`#F5F3EF`
  - Hero 渐变：`#FFF0E4 → #FFF6F0 → #F5F3EF`
  - 文字深棕：`#2E2F33`
  - 强调橙：`#D48A5A`
  - 卡片白：`#FFFFFF`
- **字体**：
  - 标题：`"Noto Serif SC", "Songti SC", serif`（衬线宋体，呼应小程序 Hero 字体）
  - 正文：`-apple-system, "PingFang SC", "Helvetica Neue", sans-serif`
- **插画**：用内联 SVG 绘制简化手绘风图标（骰子、地图针、徽章等）
- **动画**：
  - 骰子摇动动画（CSS keyframes）
  - 指令卡 Sheet 弹出（translateY + opacity）
  - 步骤完成勾选（scale + opacity）
  - 徽章解锁（旋转 + 缩放）

### C. 数据内容（P0）
- 从 `data/commands.js` 精选 12 条指令作为 Demo 数据池（覆盖 6 种类型）
- 类型元数据来自 `utils/constants.js` 的 `TYPE_META`
- 模式数据来自 `SHEET_MODES`（3 个核心模式）
- 徽章数据来自 `BADGES`（精选 6 个）
- 步骤模板来自 `TYPE_STEPS`

## Impact

- 受影响 specs：无（新增独立 Demo，不修改小程序代码）
- 受影响代码：
  - 新建 `demo/index.html`（单文件）
  - 不修改任何小程序源码

## ADDED Requirements

### Requirement: 单文件可运行
#### Scenario: 用户在浏览器打开 Demo
- **WHEN** 用户双击 `demo/index.html` 在浏览器打开
- **THEN** 页面以手机框形式居中显示
- **AND** 无需任何依赖安装即可交互
- **AND** 仅依赖 Google Fonts CDN 加载 Noto Serif SC 字体

### Requirement: 核心出逃流程可体验
#### Scenario: 用户完整体验出逃流程
- **WHEN** 用户点击「摇一摇」
- **THEN** 骰子动画播放后弹出指令详情卡
- **AND** 用户可收藏、接受指令
- **AND** 进入执行页后可逐步完成 4 步
- **AND** 全部完成后解锁徽章并显示完成反馈

### Requirement: 底部 Tab 可切换
#### Scenario: 用户切换底部 Tab
- **WHEN** 用户点击底部「地图」或「我的」
- **THEN** 页面切换到对应视图
- **AND** 当前 Tab 高亮显示（暖棕褐色）
- **AND** 切换有平滑过渡动画

### Requirement: 视觉风格与小程序一致
#### Scenario: 用户对比 Demo 和小程序
- **WHEN** 用户查看 Demo 的颜色、字体、布局
- **THEN** 配色为暖棕褐系（`#C8956E` 主色）
- **AND** Hero 标题为衬线宋体
- **AND** 圆角规范与小程序一致（小 6rpx、卡 20rpx、按钮 16rpx、TabBar 100rpx）

## MODIFIED Requirements

- 无（新增 Demo）

## REMOVED Requirements

- 无
