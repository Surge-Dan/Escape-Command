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

- [ ] **1.2 破圈功能分包**（预计 161KB 节省）
  - [ ] 创建 `packageBreakthrough/` 目录
  - [ ] 移动 `pages/breakthrough-profile/*` + `pages/bt-certificate/*` → `packageBreakthrough/pages/*`
  - [ ] 移动 `data/breakthrough-commands.js` → `packageBreakthrough/data/*`
  - [ ] app.json 追加 `subPackages` 配置
  - [ ] 首页 `preloadBreakthroughPool()` 改为 `wx.loadSubpackage({ root: 'packageBreakthrough' })`
  - [ ] 验证首页 → 破圈骰子 → 摇取 → 证书全流程
  - [ ] 跑 23 套件测试 + check-bundle
  - [ ] commit + push

- [ ] **1.3 低频业务分包**（预计 400KB 节省）
  - [ ] 创建 `packageBiz/` 目录
  - [ ] 移动 30+ 低频 page → `packageBiz/pages/*`
  - [ ] app.json 追加 `subPackages` 配置
  - [ ] 验证所有跨包跳转（含 tabBar 4 page 内的 navigateTo）
  - [ ] 跑 23 套件测试 + check-bundle
  - [ ] commit + push

## 阶段 2：图片资源压缩

- [ ] **2.1 安装 webp 压缩工具**（cwebp 或 imagemin-webp）
- [ ] **2.2 压缩 7 个 scene-*.webp**
  - [ ] walk-scene.webp 95.3 → 60KB
  - [ ] culture-scene.webp 94.5 → 60KB
  - [ ] color-scene.webp 89.6 → 55KB
  - [ ] food-scene.webp 89.4 → 55KB
  - [ ] sense-scene.webp 84.9 → 50KB
  - [ ] collect-scene.webp 78.2 → 50KB
  - [ ] map-bg.webp 57.3 → 40KB
- [ ] **2.3 视觉对比确认无明显质量损失**
- [ ] **2.4 跑 23 套件测试 + check-bundle**
- [ ] **2.5 commit + push**

## 阶段 3：二级优化（可选）

- [ ] **3.1 data/commands.js 拆分**（66KB → 40KB 核心 + 26KB 扩展按需）
- [ ] **3.2 utils/generator-engine.js 按需加载**（30KB）
- [ ] **3.3 utils/record-builder.js 按需加载**（8KB）
- [ ] **3.4 assets/icons/ 资源复用核对**
- [ ] **3.5 跑 23 套件测试 + check-bundle**
- [ ] **3.6 commit + push**

## 最终验收

- [ ] 主包估算 ≤ 1.5 MB
- [ ] 微信开发者工具「主包大小」+「图片音频资源」双通过
- [ ] 23 套件测试全 PASS
- [ ] 变异测试 100% Mutation Score
- [ ] 启动页 + tabBar 4 page 流畅
- [ ] 所有跨包跳转跑通
