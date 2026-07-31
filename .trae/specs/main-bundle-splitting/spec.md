# Spec: 主包分包瘦身（subPackages + 按需加载 + 资源压缩）

## 背景

- **触发**：2026-07-31 微信开发者工具审查显示「主包大小」未通过（> 1.5MB），主包估算 2.95MB。
- **现状**（本 PR 优化后）：
  - 主包（微信 `packOptions.ignore` 排除后）：**2.53 MB**
  - 红线：**1.5 MB**
  - 缺口：**~1 MB**
- **根因**：
  1. 项目无 `subPackages` 分包，44 个 page + 1.45MB assets 全在主包
  2. `data/breakthrough-commands.js` (124KB) 启动时同步 require
  3. `utils/poi-command-builder.js` 启动时同步 require
  4. 7 个 `assets/images/*-scene.webp` 78-95KB 未压缩
  5. 多个低频 page 长期占主包（badge-detail, command-detail, settings, help 等）
- **教训**（2026-07-28）：`demo/` 6.25MB 未忽略导致 source size 7126KB 爆 2MB；本次又发现 `assets/icons-v3/` 363KB 100% 重复死代码、`tests/` 866KB + `scripts/` 79KB 未排除；说明 `check-bundle.js` 必须用微信 `packOptions.ignore` 真实口径估算。

## 目标

**主包从 2.53 MB 降到 ≤ 1.5 MB**（节省 ≥ 1 MB），分阶段实施，每阶段独立 PR。

## 实施阶段

### 阶段 1：分包（subPackages）— 最大杠杆 预计 1.0 MB 节省

#### 1.1 同频组局分包
**目录**：`pages/group/*` (186KB) + `utils/group-room-store.js` (35KB) + `utils/task-hall-store.js` (22KB) + `utils/chat-store.js` (21KB) + `utils/player-matcher.js` (16KB) + `utils/player-trust-store.js` (13KB) + `utils/mock-user-pool.js` (7KB) = **300KB**

- 移到 `packageSync/pages/group/*`、`packageSync/utils/*`
- app.json 新增 `subPackages` 配置
- 修改所有跳转 `wx.navigateTo({ url: '/pages/group/.../...' })` 保留 root（无需改 URL）
- 测试全功能：创建房间 / 加入 / 聊天 / 搭子匹配

#### 1.2 破圈功能分包
**目录**：`pages/breakthrough-profile/*` (17KB) + `pages/bt-certificate/*` (20KB) + `data/breakthrough-commands.js` (124KB) = **161KB**

- 移到 `packageBreakthrough/pages/*` + `packageBreakthrough/data/*`
- 跨包跳转：首页 → 画像 / 证书
- 注意：首页 `preloadBreakthroughPool()` 跨包 require 需调整为 `wx.loadSubpackage({ root: 'packageBreakthrough' })` 异步加载
- bt-certificate 读 `app.globalData.records` 无需 require 调整

#### 1.3 低频业务分包
**目录**（30+ page，约 400KB）：`badge-detail`、`command-detail`、`record-detail`、`timeline`、`year-review`、`mood-journal`、`city-progress`、`city-select`、`collection-category`、`daily-challenge`、`theme-market`、`community`、`achievements`、`stats`、`map-route`、`profile-edit`、`help`、`data-export`、`invite`、`partner-list`、`leaderboard`、`mode-intro`、`member`、`about`、`settings`、`badges`、`collection`

- 移到 `packageBiz/pages/*`
- tabBar 4 个 page（index/map/profile/record/executing）必须在主包
- 跨包跳转用 `wx.navigateTo({ url: '/packageBiz/pages/.../...' })`

**阶段 1 合计节省：~860KB → 主包 2.53MB → 1.67MB**

### 阶段 2：图片资源压缩 — 预计 315KB 节省

7 个 `assets/images/*-scene.webp` 当前 78-95KB，压缩到 50-60KB：
- `walk-scene.webp` 95.3 → 60KB
- `culture-scene.webp` 94.5 → 60KB
- `color-scene.webp` 89.6 → 55KB
- `food-scene.webp` 89.4 → 55KB
- `sense-scene.webp` 84.9 → 50KB
- `collect-scene.webp` 78.2 → 50KB
- `map-bg.webp` 57.3 → 40KB

工具：cwebp（-q 70-80）或 imagemin-webp。需在 CI 或本地压缩脚本中固化。

**阶段 2 合计节省：~315KB → 主包 1.67MB → 1.35MB** ✅ **达标**

### 阶段 3：二级优化（可选）

- `data/commands.js` (66KB) 拆分为 `commands-core.js` (40KB) + `commands-extension.js` (26KB)，核心按需 require
- `utils/generator-engine.js` (30KB) 按需加载
- `utils/record-builder.js` (8KB) 按需加载
- 单 page 内嵌 svg 提取为独立文件 + 复用
- `assets/icons/` 358KB 中 107 个 svg 去重检查（与设计资源表核对）

## 实施约束

- **每个子阶段独立 PR**：每阶段跑全 7 层测试（unit/gherkin/qa/mutation/coverage/run-all/check-bundle）
- **分包后必须跨包验证**：
  - 启动页 → 各分包首页的 navigateTo
  - 分包 → 分包的 navigateTo
  - 跨包 `wx.loadSubpackage` 异步加载
  - tabBar 4 个 page 必须在主包
  - custom-tab-bar 组件必须在主包
- **数据共享**：`app.globalData` 跨包共享 OK
- **资源目录**：分包可独立 `assets/`，但跨包复用资源需主包引入

## 验收

- [ ] `node scripts/check-bundle.js --base=origin/dev` 主包估算 ≤ 1.5 MB
- [ ] 微信开发者工具「主包大小」状态：已通过
- [ ] 微信开发者工具「图片和音频资源」状态：已通过
- [ ] `node tests/run-all.js` 23 套件全 PASS
- [ ] 变异测试 100% Mutation Score
- [ ] 所有跨包跳转跑通
- [ ] 启动首页 + tabBar 4 个 page 仍流畅

## 时间线

- 阶段 1.1（同频分包）：~1.5 小时
- 阶段 1.2（破圈分包）：~1 小时
- 阶段 1.3（业务分包）：~2 小时
- 阶段 2（图片压缩）：~30 分钟（含工具配置）
- 阶段 3（二级优化）：可选，~1 小时

总计 ~6 小时，2-3 个 PR 完成。

## 参考资料

- [check-bundle.js 升级 PR](file:///c:/Program%20Main/TRAEWork/Projects/出逃指令/escape-command/scripts/check-bundle.js)（本 PR）
- [project.config.json packOptions.ignore](file:///c:/Program%20Main/TRAEWork/Projects/出逃指令/escape-command/project.config.json)
- 微信官方：单包（主包+分包）≤ 2MB，整个小程序 ≤ 16MB（截至 2026-07）

## Lessons Learned（已记录到 project_memory.md）

1. **`check-bundle.js` 必须用微信 `packOptions.ignore` 真实口径**——之前的「按引用资源估算」漏算 1MB+，掩盖了主包超线
2. **`packOptions.ignore` 必须显式包含 `tests/` `scripts/` `*.mp4/mp3/wav`**——否则微信按全仓扫描，主包会爆
3. **历史重复资源（`assets/icons-v3/` 363KB）必须清理**——`grep` 引用前先 `diff -r` 同名文件大小
4. **同步 `require` 启动时数据文件**（如 `data/breakthrough-commands.js` 124KB）会**全量进主包**，即使按需 require 也**不能改变打包体积**，必须分包
5. **根目录大文件（产品文档 / 测试日志）必须 `packOptions.ignore` 或移走**——否则直接计入主包
