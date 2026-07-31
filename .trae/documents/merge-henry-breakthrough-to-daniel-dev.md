# Henry 破圈骰子合并到 Daniel → dev 计划

## Context（背景）

项目是微信小程序「出逃指令」，团队两人分基于 `dev` 分支的同一基点 `e0531c9` 各自开发：

- **Daniel 分支**（主开发线）：已实现 C-01~C-P4、B 阶段生成引擎、D 阶段任务大厅+真实玩家联动，含 22 套严格测试体系（单元/Gherkin BDD/Property Fuzz/对抗/Mutation/Coverage/QA），主包 201.8KB。
- **Henry 分支**：实现了「破圈骰子」第二类骰子——100 条专属指令、画像推荐、搞怪证书页、首页 swiper 切换。仅 2 个业务提交 + 大量 `.trae/skills/` IDE 辅助文档。
- **dev 分支**：仍是初始空架子（`e0531c9`），落后两个分支一大截。

目标：把 Henry 的破圈骰子功能合并进来，充分审查+测试后，让 dev 获得全部功能。

### 关键设计冲突（已与用户确认）

1. **首页入口**：Daniel 已有 Cover Flow 3 骰子（微逃/破圈/同频，手势滑动 + `routeDice()` 分流，`_modeTargetDuration('breakthrough')=20` 已预留）；Henry 是 swiper 2 骰子（会丢同频入口）。
   - **决策**：保留 Daniel 的 Cover Flow 3 骰子架构，破圈分支改用 Henry 的 `rollBreakthroughCommand()` + 100 条专属指令 + 画像推荐。
2. **`.trae/skills/` 目录**：Henry 加了约 2 万行 Trae IDE 技能辅助文档，与业务无关。
   - **决策**：合并时排除，保持 dev 仓库干净。

## 合并策略总览

**Henry → Daniel（融合合并 + 冲突解决 + 全量测试）→ dev（fast-forward）**

理由：
- Daniel 有 22 套测试体系，合并后能立即 `node tests/run-all.js` 验证，确保不破坏现有功能
- dev 是空架子，Daniel → dev 是 fast-forward，干净利落
- 在 Daniel 上解决冲突有完整上下文（generator-engine/record-builder/execution-progress 等纯函数都在）

## 逐文件合并方案

### 1. 新增文件（直接接纳，无冲突）

| 文件 | 说明 |
|------|------|
| `data/breakthrough-commands.js` | Henry 的 100 条破圈指令数据（含 content/tip/steps/type/nightSafe/avoidTypes/recommendTypes） |
| `assets/icons/breakthrough-dice-purple.svg` | 破圈骰子紫色图标（96 行，约 2-3KB，check-bundle 30KB 增量红线内） |
| `pages/breakthrough-profile/` | 破圈画像页（身份/爱好/类型偏好，选填，驱动推荐） |
| `pages/bt-certificate/` | 破圈证书页（搞怪头衔+标语，按指令类别匹配，分享） |

**注意**：`pages/bt-certificate/bt-certificate.js` 从 `records[records.length-1]` 取最近记录——Daniel 的 `completeCommand` 用 `records.unshift(record)`，最近记录在 `records[0]` 而非末尾。**实施时需修正为 `records[0]`**，否则证书页读不到刚完成的破圈记录。

### 2. app.js（手动追加 Henry 的字段和方法到 Daniel 结构）

Daniel 的 app.js 已深度重构（委托 generator-engine/record-builder/poi-command-builder）。需追加：

- **顶部 require**：`const breakthroughCommandsData = require('./data/breakthrough-commands.js')`
- **globalData 追加**：`breakthroughReRollCount: 5`、`breakthroughProfile: null`、`breakthroughPool: []`
- **loadLocalData 追加**：`gd.breakthroughProfile = wx.getStorageSync('breakthroughProfile') || null`
- **saveAll 追加**：`this.saveToLocal('breakthroughProfile', gd.breakthroughProfile)`
- **initCommandPool 末尾追加**：`this.initBreakthroughPool()` 调用
- **新增方法**：`initBreakthroughPool()` / `rollBreakthroughCommand()` / `flattenProfile()` / `hasBreakthroughProfile()` / `useBreakthroughReroll()`（从 Henry 移植）
- **checkDateReset 扩展**：加 `breakthroughReRollCount = 5` 重置 + `breakthroughReRollData` 持久化恢复

**关键修复**：Henry 的 `rollBreakthroughCommand()` 里 `if (!candidates.length) candidates = this.getFallbackCommands()` —— Daniel 的 `getFallbackCommands()` 返回微逃 fallback，语义不符。**改为 `candidates = pool`（破圈全池兜底）**，避免破圈摇出微逃指令。

### 3. app.json（pages 数组追加 2 个页面）

Daniel 的 pages 数组末尾是 `pages/group/hall/create-task/create-task`。在其后追加：
```
"pages/breakthrough-profile/breakthrough-profile",
"pages/bt-certificate/bt-certificate"
```

### 4. utils/constants.js（追加 breakthrough 类型元数据）

- **TYPE_META** 加：`breakthrough: { name: '破圈行动', color: '#9B7BB8', icon: '/assets/icons/breakthrough-dice-purple.svg', pin: '/assets/icons/breakthrough-dice-purple.svg', scene: '/assets/images/sense-scene.webp' }`
- **MODE_LIST** 加：`{ id: 'breakthrough', name: '破圈骰子', icon: '/assets/icons/breakthrough-dice-purple.svg', activeIcon: '/assets/icons/breakthrough-dice-purple.svg', color: '#9B7BB8', heroScene: '/assets/images/sense-scene.webp', desc: '行为破圈，突破舒适区' }`
- **TYPE_STEPS** 加：`breakthrough: ['深呼吸，准备好迈出第一步', '做一件你平时不敢或不想做的事', '感受做完后的心理变化', '写一句你今天突破的感受']`
- **HOME_DICE_LIST**：Daniel 已有 breakthrough 入口（icon 用 `footprints-coral.svg`），**统一图标为 `breakthrough-dice-purple.svg`** 保持一致性

### 5. pages/index/index.js + .wxml + .wxss（保留 Daniel Cover Flow，整合 Henry 破圈流程）

**保留 Daniel 的 Cover Flow 3 骰子架构**（onTouchStart/onTouchEnd/onDiceTap/routeDice），不引入 Henry 的 swiper。

修改点：
- **data 追加**：`breakthroughRemainCount: 5`、`isBreakthroughRolling: false`
- **refreshState 追加**：同步 `breakthroughRemainCount: gd.breakthroughReRollCount`
- **routeDice(dice) 的 breakthrough 分支**：改为调用本页新增的 `rollBreakthroughCommand()` 方法（而非 `navigateTo generating?mode=breakthrough`），摇出指令后显示 `selectedCommand` 卡片，接受后 `startCommand` 进 executing 页
- **新增 `rollBreakthroughCommand()` 方法**：从 Henry 的 index.js 移植（消耗次数、调 `app.rollBreakthroughCommand()`、显示卡片），保留 Daniel 的 `selectedCommand` 卡片复用逻辑
- **reroll() 扩展**：当前 `currentDiceIndex===2`（破圈在 HOME_DICE_LIST 的索引）时走破圈重摇路径
- **wxml/wxss**：破圈骰子卡片显示剩余次数（`breakthroughRemainCount`），用紫色主题 + `breakthrough-dice-purple.svg` 图标。不改 Daniel 的 Cover Flow 容器结构，只在破圈卡片内部加次数显示

### 6. pages/executing/executing.js + .wxml + .wxss（Daniel 基础 + Henry 破圈模式分支）

**保留 Daniel 的 execution-progress 留痕逻辑**（initProgress/markStepDone/mergeProgress/计时器），破圈模式也走留痕。

修改点：
- **新增常量**：`BT_STEP_LABELS = ['🎬 上吧！', '😅 撑住别跑', '💪 已经回不去了', '🎉 破圈成功！']`
- **data 追加**：`isBreakthrough: false`
- **onLoad 计算 isBT**：`const isBT = cmd.type === 'breakthrough' || cmd.mode === 'breakthrough'`
- **steps 映射追加 label**：isBT 时加 `label: BT_STEP_LABELS[i]`，hint 用「深呼吸，你可以的」
- **typeColor**：isBT 时用 `#A55FA5`（紫色）
- **showStepCount**：isBT 时隐藏（`!isBT && (isWalk || duration >= 30)`）
- **wxml**：加 `wx:if="{{isBreakthrough}}"` 分支——破圈模式显示「勇气进度卡」（`bt-courage-card`）+ 竖向步骤布局（`bt-step-row`）；微逃模式保留 Daniel 原计时卡 + 横向步骤。标题/按钮文案按 isBreakthrough 切换
- **wxss**：追加 Henry 的破圈样式（勇气进度、步骤标签、紫色主题），保留 Daniel 原样式

### 7. pages/record/record.js + .wxml（保留 isGroup，加 isBreakthrough，goMap→goNext）

Daniel 已有 `isGroup/members`（同频出逃）。追加 Henry 的 isBreakthrough：

- **onLoad 追加**：`isBreakthrough: cmd.type === 'breakthrough' || cmd.mode === 'breakthrough'`
- **goMap() 重构为 goNext()**：
  ```js
  goNext() {
    if (this.data.isBreakthrough) {
      wx.redirectTo({ url: '/pages/bt-certificate/bt-certificate' })
    } else {
      wx.switchTab({ url: '/pages/map/map' })  // 微逃 + 同频都跳 map
    }
  }
  ```
- **wxml**：`goMap` 改 `goNext`，按钮文案 `{{isBreakthrough ? '去看看证书 ›' : '去地图看看 ›'}}`

### 8. pages/profile/profile.js（settings 分类加破圈画像入口）

在 `CATEGORIES` 的 `settings` 分类 items 数组，「资料」项后追加：
```js
{ label: '破圈画像', path: '/pages/breakthrough-profile/breakthrough-profile', icon: '/assets/icons/zap-coral.svg' }
```

### 9. project.private.config.json

保留 Daniel 的（Henry 改了 projectname 大小写，不重要，用 Daniel 的）。

## .trae/skills/ 排除方案

合并后用 `git checkout HEAD -- .trae/skills/`（或 `git rm -r --cached` 后恢复）排除 Henry 的 skills 文档。这些文件不进小程序主包（check-bundle 的 walk 会跳过 `.git` 但不跳过 `.trae`，不过 skills 是 .md/.py/.cjs，不是资源文件，不影响包体红线）。

排除理由：与业务无关，2 万行文档会让 dev 仓库膨胀。

## 测试与验证

### 1. 现有 22 套测试（确保不破坏 Daniel 功能）
```
node tests/run-all.js
```
重点观察：
- `generator-engine` 测试（breakthrough 数据是独立池，不应影响微逃指令过滤）
- `record-builder` 测试（破圈记录走同一 `completeCommand` 入口，`injectGroupFields` 不应被破坏）
- `coverage` 报告（player-matcher.js 行阈值 78，其他文件阈值不变）

### 2. 包体红线检查
```
node scripts/check-bundle.js --base=origin/dev
```
Henry 新增 `breakthrough-dice-purple.svg`（约 2-3KB）+ 2 个新页面（js/wxml/wxss 不算资源）→ PR 增量远低于 30KB 红线，应通过。

### 3. 为 Henry 代码补测试（符合项目严格测试规范）

新增 `tests/unit/breakthrough.test.js`：
- `breakthrough-commands.js` 数据完整性：100 条、id 唯一、字段齐全（content/steps/type/nightSafe）、5 个类别分布（bt001-020 social / bt021-040 roleplay / bt041-060 fate / bt061-080 reverse / bt081-100 endurance）
- `rollBreakthroughCommand` 逻辑：completed 过滤、nightSafe 深夜过滤、avoidTypes 反推荐、recommendTypes 优先、breakthroughReRollCount 扣减
- `flattenProfile` 标签扁平化正确性
- `getCategoryFromId`（证书页）类别判断：bt001→social、bt020→social、bt021→roleplay、bt100→endurance

新增 `tests/gherkin/breakthrough-flow.feature`：破圈摇骰→执行→证书页 BDD 场景。

接入 `tests/run-all.js` 套件列表。

### 4. 代码审查
用 `TRAE-code-review` skill 审查合并差异，重点：
- `rollBreakthroughCommand` 的 fallback 修复（不能返回微逃指令）
- `bt-certificate.js` 的 `records[0]` 修正（Daniel unshift，最近记录在头部）
- Cover Flow 入口与 Henry 数据流的衔接

### 5. 手动验证（微信开发者工具）
- [ ] 首页 Cover Flow 滑到破圈骰子，显示紫色卡片 + 剩余次数
- [ ] 点击破圈骰子摇出指令（非微逃指令），显示 selectedCommand 卡片
- [ ] 接受指令进 executing 页，显示勇气进度卡 + 竖向步骤 + 紫色主题
- [ ] 4 步逐步完成（验证 execution-progress 留痕在破圈模式也生效）
- [ ] 完成进 record 页，保存后跳证书页（非 map 页）
- [ ] 证书页显示搞怪头衔/标语/社死指数，按钮回首页
- [ ] profile 页「破圈画像」入口可进，填写保存后回退
- [ ] 微逃骰子 + 同频骰子功能不受影响
- [ ] 每日 5 次破圈次数，次日刷新

## 实施步骤

1. **创建临时合并分支**：`git checkout -b merge-henry Daniel`
2. **合并 Henry**：`git merge origin/Henry`（预期冲突：app.js/app.json/constants.js/index.*/executing.*/record.*/profile.js/project.private.config.json）
3. **解决冲突**：按上述逐文件方案手动合并（用 Edit 工具）
4. **排除 .trae/skills/**：`git checkout Daniel -- .trae/skills/`（恢复 Daniel 版本，丢弃 Henry 的 skills 文档）
5. **修正 2 个 bug**：`rollBreakthroughCommand` fallback + `bt-certificate.js` records[0]
6. **补测试**：新建 `tests/unit/breakthrough.test.js` + `tests/gherkin/breakthrough-flow.feature`，接入 run-all.js
7. **跑全量测试**：`node tests/run-all.js`（22+1 套全绿）
8. **跑包体检查**：`node scripts/check-bundle.js --base=origin/dev`（退出码 0）
9. **代码审查**：`TRAE-code-review` skill
10. **commit 到 merge-henry**：`fix(henry-merge): 融合 Henry 破圈骰子到 Daniel 架构`
11. **merge-henry → Daniel**：`git checkout Daniel && git merge merge-henry`（fast-forward）
12. **push origin Daniel**
13. **Daniel → dev**：`git checkout dev && git merge Daniel`（fast-forward，dev 是空架子）
14. **push origin dev**
15. **清理临时分支**：`git branch -d merge-henry`

## 风险点

1. **Henry 的 `rollBreakthroughCommand` 调 `this.getFallbackCommands()`**：Daniel 的 getFallbackCommands 返回微逃指令，会导致破圈摇出微逃指令。**必须修复为 `candidates = pool`**。
2. **`bt-certificate.js` 取 `records[records.length-1]`**：Daniel 用 `unshift`，最近记录在 `records[0]`。**必须修正为 `records[0]`**，否则证书页读不到刚完成的破圈记录。
3. **`normalizeType` 不识别 breakthrough**：Daniel 的 `normalizeType` 用 `TYPE_ALIASES`，breakthrough 不在别名表，会原样返回 `breakthrough`，`getTypeMeta('breakthrough')` 在 TYPE_META 加了 breakthrough 后能正确返回。OK。
4. **`record-builder.buildRecord` 的 `commandType`**：破圈记录的 `commandType='breakthrough'`，下游 map/badges 统计需确认能消费新类型（badges 里没有 breakthrough 专属徽章，不影响；map 按 location 聚合，breakthrough 指令 requirePOI=null 无 location，不出现在地图，符合预期）。
5. **`check-bundle` 主包估算**：新页面 wxml/wxss 引用的 `breakthrough-dice-purple.svg` 会被算进主包，约 2-3KB，主包从 201.8KB 增至 ~204KB，远低于 1.5MB。OK。
6. **测试覆盖**：Henry 代码无测试，若不补测试，mutation-test 不会覆盖 breakthrough 逻辑（但不影响现有 mutation 通过，因为 mutation 只变异已有文件）。补测试是规范要求，非阻塞。
