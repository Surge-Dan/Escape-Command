# Tasks: 主包分包瘦身

## 阶段 1：分包（subPackages）

- [x] **1.1 同频组局分包**（预计 300KB 节省）✅ 2026-07-31 完成
  - [x] 创建 `packageSync/` 目录
  - [x] 移动 `pages/group/*` → `packageSync/pages/group/*`
  - [x] 移动 `utils/group-room-store.js` + `task-hall-store.js` + `chat-store.js` + `player-matcher.js` + `player-trust-store.js` + `mock-user-pool.js` + `trust-score.js` → `packageSync/utils/*`
  - [x] 移动 `data/guangzhou-districts.js` + `guangzhou-pois.js` + `escape-master-tasks.js` → `packageSync/data/*`（让分包自包含）
  - [x] app.json 新增 `subPackages` 配置
  - [x] 验证首页 `wx.navigateTo({ url: '/packageSync/pages/group/.../...' })` 跳转 + 分包内 9 处跳转改跨包路径
  - [x] 升级 check-bundle.js 读取 `subPackages` 估算主包体积
  - [x] 更新 tests/ 下所有 require 路径和静态路径（runner.js / check.js / coverage-report.js / mutation-test.js）
  - [x] 7 层测试通过（unit/gherkin/property/adversarial/qa/coverage/mutation）
  - [ ] commit + push origin/Daniel
  - **效果**：主包 2.47MB → 2.11MB（节省 360KB，符合 spec 预期 300KB）

- [x] **1.2 破圈功能分包**（预计 161KB 节省）✅ 2026-07-31 完成
  - [x] 创建 `packageBreakthrough/` 目录
  - [x] 移动 `pages/breakthrough-profile/*` + `pages/bt-certificate/*` → `packageBreakthrough/pages/*`
  - [x] 移动 `data/breakthrough-commands.js` → `packageBreakthrough/data/*`（124KB 出主包）
  - [x] app.json 追加 `packageBreakthrough` subPackages 配置
  - [x] app.js 重构破圈加载为事件总线 + `require.async` 分包异步化（基础库 2.27.1+）
  - [x] `rollBreakthroughCommand(cb)` 改异步，核心选择逻辑抽为纯函数 `_pickBreakthrough(pool)`
  - [x] index.js 破圈骰子改异步回调（300ms 动画后回调更新 UI）
  - [x] 分包页面 breakthrough-profile/bt-certificate 不涉及指令池，无需适配
  - [x] 跑 23 套件测试 + check-bundle
  - [ ] commit + push origin/Daniel
  - **效果**：主包 1.53MB → 1.41MB（节省 120KB，破圈数据 124KB 完全出主包）

- [x] **1.3 低频业务分包**（预计 400KB 节省）✅ 2026-07-31 完成
  - [x] 创建 `packageBiz/` 目录
  - [x] 移动 27 个低频 page → `packageBiz/pages/*`（about/achievements/badge-detail/badges/city-progress/city-select/collection-category/collection/command-detail/community/daily-challenge/data-export/help/invite/leaderboard/map-route/member/mode-intro/mood-journal/partner-list/profile-edit/record-detail/settings/stats/theme-market/timeline/year-review）
  - [x] app.json 追加 `packageBiz` subPackages 配置
  - [x] 验证所有跨包跳转（含 tabBar 3 page 内的 navigateTo）
  - [x] 跑 23 套件测试 + check-bundle
  - [ ] commit + push origin/Daniel

## 阶段 2：图片资源压缩

- [x] **2.1 安装 webp 压缩工具**✅ 使用 sharp 库（scripts/compress-images.js）
- [x] **2.2 压缩 7 个 scene-*.webp** ✅ 节省 182.5KB
  - [x] walk-scene.webp / culture-scene.webp / color-scene.webp / food-scene.webp / sense-scene.webp / collect-scene.webp / map-bg.webp
- [x] **2.3 视觉对比确认无明显质量损失**（quality=72，肉眼无差异）
- [x] **2.4 跑 23 套件测试 + check-bundle**
- [ ] **2.5 commit + push**

## 阶段 3：二级优化（可选，暂不执行）

- [ ] **3.1 data/commands.js 拆分**（66KB → 40KB 核心 + 26KB 扩展按需）
- [ ] **3.2 utils/generator-engine.js 按需加载**（30KB）
- [ ] **3.3 utils/record-builder.js 按需加载**（8KB）
- [ ] **3.4 assets/icons/ 资源复用核对**
- [ ] **3.5 跑 23 套件测试 + check-bundle**
- [ ] **3.6 commit + push**

## 最终验收

- [x] 主包估算 ≤ 1.5 MB（实测 1.41MB，base=origin/dev 口径 1.34MB）
- [x] check-bundle.js PR 资源检查通过（未新增图片/音频/字体/插件）
- [x] 23 套件测试全 PASS
- [x] 变异测试 100% Mutation Score（125 mutations，111 killed，14 skipped）
- [ ] 启动页 + tabBar 3 page 流畅（待真机预览验证）
- [ ] 所有跨包跳转跑通（待真机预览验证）
