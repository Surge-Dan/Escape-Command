# 分包架构（subPackages）

> 状态：阶段 1.1（2026-07-31 实施）  
> Spec：`.trae/specs/main-bundle-splitting/`  
> 主包变化：2.47 MB → 2.18 MB（-290 KB）

## 为什么分包

微信小程序规定「单包（主包+任一分包）≤ 2 MB，整个小程序 ≤ 16 MB」。  
随着功能增长，主包 44 个 page + 数据/工具文件累积至 2.47 MB，超出 1.5 MB 工程红线，且逼近单包 2 MB 上限。

## 现有分包

### `packageSync/`（name: `sync`）— 同频组局业务

**预计节省**：~290 KB  
**构成**：

```
packageSync/
├── pages/group/
│   ├── create/                # 创建房间
│   ├── room/                  # 房间详情 + 聊天
│   ├── escape-record/         # 同频出逃完成页
│   └── hall/
│       ├── hall/              # 任务大厅
│       ├── detail/            # 任务详情
│       └── create-task/       # 发布任务
└── utils/
    ├── group-room-store.js    # 房间状态机
    ├── task-hall-store.js     # 任务大厅
    ├── chat-store.js          # 任务内聊天
    ├── player-matcher.js      # 搭子匹配
    ├── player-trust-store.js  # 信任分
    └── mock-user-pool.js      # 本地兜底玩家
```

**入口**：

- 主包 `pages/index/index.js`：
  - `onInviteFriendsTap` → `/packageSync/pages/group/create/create`
  - `onEnterHallTap` → `/packageSync/pages/group/hall/hall`

**依赖图**：

- 包内自包含：6 个 utils 仅被 pages/group/* 引用
- 跨包依赖：`app.globalData`（共享 records / location / userInfo / currentCommand / breakthroughPool）
- 云函数：`pages/group/*` 调用 `wx.cloud.callFunction({ name: 'createRoom' | 'matchPlayers' | 'sendMessage' | ... })`，跨包调用 OK（云函数独立部署）

**用户感知延迟**：

- 首次进入：微信开发者工具自动 `wx.loadSubpackage({ root: 'packageSync' })` 异步加载，约 100-300ms
- 二次进入：分包已驻留内存，零延迟

## 跨包跳转规则

| 起点             | 终点                        | URL 写法                                |
| ---------------- | --------------------------- | --------------------------------------- |
| 主包 page        | 分包 page                   | `/<subPackageRoot>/pages/...`           |
| 分包 page        | 主包 page                   | `/pages/...`                            |
| 分包 A page      | 分包 B page（不同 root）    | `/<otherRoot>/pages/...`                |
| 分包 A page      | 分包 A page（同 root）      | `/<rootA>/pages/...`（**也写完整路径**） |

**反模式**：在分包内写 `/pages/group/...` 会被微信认为走主包 pages，但 pages 已删除 → **页面找不到**。所有跳转必须以分包 root 开头。

## 跨包 require 规则

`require('./xxx')` 解析路径只跟**当前文件位置**有关，与分包无关。所以：

- 分包内 `require('../utils/xxx')` 解析到 `packageSync/utils/xxx` ✅
- 分包内 `require('../../utils/xxx')` 解析到 `packageSync/utils/xxx` ✅（巧合：相对深度与原 pages 相同）
- 主包 `require('./utils/xxx')` 解析到主包 `utils/xxx` ✅

**反模式**：不要从主包 `require('./packageSync/utils/xxx')`——会让主包把分包 utils 拉回主包，违背分包初衷。

## 测试隔离

`tests/` 和 `scripts/` 已在 `project.config.json` 的 `packOptions.ignore` 排除，**不进主包**。  
但测试 `require` 路径要随文件移动更新：

- `tests/unit/chat-store.test.js` → `require('../../packageSync/utils/chat-store.js')`
- `tests/gherkin/runner.js` 同理

## 后续阶段

| 阶段   | 名称                | 预计节省    | 状态         |
| ------ | ------------------- | ----------- | ------------ |
| 1.1    | 同频组局分包        | 290 KB      | ✅ 完成       |
| 1.2    | 破圈功能分包        | 161 KB      | ⏳ 计划中    |
| 1.3    | 低频业务分包        | 400 KB      | ⏳ 计划中    |
| 2      | 图片资源压缩        | 315 KB      | ⏳ 计划中    |
| 3      | 二级优化            | 100 KB+     | 🔜 可选      |

阶段 1.1 + 1.2 + 1.3 + 2 全做 → 主包预计 **1.3 MB**，达标。
