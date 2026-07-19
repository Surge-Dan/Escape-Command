# v17 完整移植版 HTML Demo Spec

## Why

v16 Demo 仅实现了核心 7 页流程，用户要求「把小程序完整的功能和设计都搬到 html 里」。需要创建一个覆盖全部 36 页、支持 localStorage 持久化、丝滑交互的单文件 HTML Demo，完整复刻小程序的所有功能与设计。

## What Changes

### A. 创建完整版单文件 HTML Demo（P0）
- 覆盖 `demo/index.html`（覆盖 v16）
- **单文件**：HTML + CSS + JS 全部内联，仅依赖 Google Fonts CDN（Noto Serif SC）
- **响应式**：桌面端 375×812 手机框居中；移动端全屏自适应
- **36 页全覆盖**：完整复刻小程序所有页面
- **localStorage 持久化**：收藏、出逃记录、徽章解锁、设置、连续天数等状态刷新后保留
- **丝滑交互**：所有 Sheet 弹出、页面切换、按钮反馈都有过渡动画

### B. 架构设计（P0）
- **SPA 路由**：用 hash 路由（`#/index`、`#/map`、`#/profile` 等）切换页面
- **全局状态**：`window.appState` 对象，镜像小程序 `app.globalData` 结构
- **localStorage 持久化层**：`Storage` 对象封装 get/set/sync，关键字段自动持久化
- **组件化渲染**：用 JS 模板函数生成重复 UI（导航栏、TabBar、Sheet、卡片、徽章等）
- **事件系统**：统一 `bindtap` 替代方案，用 `data-action` 属性 + 事件委托

### C. 视觉系统（P0）
- **配色**：与小程序 v15 主题统一（暖棕褐 `#C8956E` 主色）
- **字体**：标题用 Noto Serif SC 衬线宋体（700），正文用系统 sans
- **圆角规范**：6/10/16/20/24/100px
- **Hero 渐变**：3 层径向渐变叠加
- **动画**：骰子摇动、脉冲环、Sheet 弹出、步骤勾选、徽章解锁、页面切换

### D. 36 页功能清单（P0）

#### L1 核心流程页（6 页）
1. **onboarding**：引导页，3 步滑动介绍 + 进入按钮
2. **index**：首页，Hero + 模式 Tag + 出逃卡 + 今日推荐 + 指令详情卡
3. **command-detail**：指令详情独立页（从收藏/推荐进入）
4. **executing**：出逃执行，4 步勾选 + 完成按钮 + 徽章解锁
5. **escape-prep**：出逃准备清单
6. **generating**：生成中动画页

#### L2 导航页（7 页）
7. **map**：地图主页，3 模式 Tab + 标记点 + 统计 + 设为家 + 定位
8. **map-route**：路线模式详情
9. **profile**：个人资料，用户卡片 + 统计 + 徽章墙 + 设置入口
10. **profile-edit**：编辑资料，头像 + 昵称 + 签名
11. **settings**：设置，声音/通知/主题/数据导出
12. **collection**：收藏列表，筛选 + 排序
13. **collection-category**：收藏分类视图

#### L3 成就页（8 页）
14. **badges**：徽章墙
15. **badge-detail**：徽章详情 + 解锁条件
16. **achievements**：成就列表
17. **stats**：统计图表
18. **timeline**：时间线
19. **year-review**：年度回顾
20. **leaderboard**：排行榜
21. **daily-challenge**：每日挑战

#### L4 社交页（5 页）
22. **community**：社区动态
23. **partner-list**：伙伴列表
24. **invite**：邀请页
25. **member**：会员页
26. **mood-journal**：心情日记

#### L5 工具页（10 页）
27. **city-select**：城市选择
28. **city-progress**：城市进度
29. **mode-intro**：模式介绍
30. **theme-market**：主题市场
31. **about**：关于
32. **help**：帮助
33. **record**：出逃记录列表
34. **record-detail**：记录详情
35. **photo-edit**：照片编辑
36. **data-export**：数据导出

### E. 数据迁移（P0）
- **指令池**：从 `data/commands.js` 提取全部 ~150 条指令
- **徽章**：从 `data/badges.js` 提取全部徽章
- **主题**：从 `data/themes.js` 提取主题
- **挑战**：从 `data/challenges.js` 提取每日挑战
- **常量**：从 `utils/constants.js` 提取 TYPE_META、MODE_LIST、SHEET_MODES、MOODS、BADGES、TYPE_STEPS

## Impact

- 受影响 specs：`ui-fix-v14`、`theme-color-unify-v15`、`interactive-html-demo-v16`（v17 覆盖 v16 的 demo/index.html）
- 受影响代码：
  - 新建/覆盖 `demo/index.html`（单文件）
  - 不修改任何小程序源码

## ADDED Requirements

### Requirement: 36 页全覆盖
#### Scenario: 用户浏览任意页面
- **WHEN** 用户通过 TabBar、按钮、链接导航到任意页面
- **THEN** 该页面渲染且功能可用
- **AND** 页面间跳转有过渡动画

### Requirement: localStorage 持久化
#### Scenario: 用户刷新浏览器
- **WHEN** 用户完成出逃、收藏指令、解锁徽章后刷新页面
- **THEN** 收藏列表、出逃记录、徽章解锁状态、设置项全部保留
- **AND** 连续天数统计正确

### Requirement: 丝滑交互
#### Scenario: 用户操作 Demo
- **WHEN** 用户点击按钮、弹出 Sheet、切换页面
- **THEN** 有过渡动画（opacity/transform）
- **AND** 按钮 :active 有缩放反馈
- **AND** 页面切换有滑入/淡入效果

### Requirement: 视觉一致性
#### Scenario: 用户对比 Demo 和小程序
- **WHEN** 用户查看任意页面
- **THEN** 配色为暖棕褐系（`#C8956E` 主色）
- **AND** Hero/大标题为衬线宋体
- **AND** 圆角规范与小程序一致

## MODIFIED Requirements

- v16 的 7 页 Demo → v17 的 36 页完整版

## REMOVED Requirements

- 无
