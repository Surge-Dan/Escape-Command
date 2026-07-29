# C-P2 同频组局收尾 Spec

> Spec ID: `c-p2-group-finale`
> 对应功能表：C-14~C-19（6 个 P2），让同频组局从「可演示」走向「完整」
> 分支：`Daniel`（工作分支）
> 创建日：2026-07-29
> 依赖：C-01~C-13（P1）全部完成，`utils/group-room-store.js` 已就绪

## Why

C-P1（C-01~C-13）已让同频组局走通「创建→到齐→投票→剧本→执行→打卡」主线。但缺角色分配、独立线索、公开组局、申请加入、发起人审核、评价举报 6 项收尾，组局体验停留在「朋友拉群」阶段，无法支撑「公开组局→陌生人审核→完成评价」的完整社交闭环。

本 spec 在 demo 模式（本地存储 + room 入参）下，补齐 6 项 P2，让同频组局真正完整可演示。

## 范围确认

- **含**：6 个功能点的纯函数 + 房间操作 + room 页接入 + 7 层测试
- **不含**：真实云函数多端同步（独立 spec）、公开组局列表的推荐算法（仅按时间倒序）、举报后的人工审核后台（仅标记 + 自检）

## 关键设计决策（带理由）

| 决策点 | 选择 | 理由 |
|---|---|---|
| C-14 角色来源 | **角色库按 style 分类**（relax/adventure/social 各 6 角色） | 与剧本 style 联动，有情境感；角色库硬编码零资源 |
| C-15 线索拆分 | **剧本 steps 轮询分配给成员** | steps 数 ≥ 成员数时轮询，< 时循环补齐；保证每人有专属线索 |
| C-16 公开列表 | **新增 listPublicRooms + room.visibility 字段** | demo 模式本地存储即可；visibility 默认 private 不破坏现有 |
| C-17 申请加入 | **room.joinRequests 数组** | 与 members 分离，待审核态清晰；房主批量审核 |
| C-19 评价 | **room.reviews 数组 + 双向评价** | 每人可对组局打分（1-5 星 + 文字）；rating 聚合展示 |
| 新增资源 | **零**，全复用现有 SVG | 包体红线：PR 资源增量 = 0 |
| 测试规模 | **+~180 unit case / +~24 BDD scenario / +~15 mutation** | 延续 7 层体系，mutation score 维持 100% |

---

## C 组详细设计（C-14~C-19）

所有新增函数挂在 `utils/group-room-store.js`。demo 模式本地存储。

### C-14 角色分配 — `assignRoles(roomId)` + 纯函数 `buildRoles(members, style)`

**现状**：generateScript 生成剧本后，所有成员拿同一份 steps，无角色区分。

**新增**：
- 角色库 `ROLE_LIBRARY`（按 style 分类，每类 6 个角色）：
  - relax：`['咖啡探路者', '甜品鉴赏师', '光线观察员', '发呆顾问', '步速调节员', '氛围记录官']`
  - adventure：`['线索采集员', '路线规划师', '风险预警员', '街景摄影师', '本地解码员', '挑战发起人']`
  - social：`['气氛组组长', '话题引导员', '桌游裁判', '美食分配师', '合照导演', '时间管理员']`
- 纯函数 `buildRoles(members, style)`：
  - 入参：members 数组 + style 字符串
  - 按成员顺序从对应 style 角色库轮询分配
  - style 非法 → 用 relax 兜底
  - 返回 `[{ openId, nickname, role }]`
- `assignRoles(roomId)`：
  - 仅 FINISHED 状态可调（剧本已生成）
  - 调用 buildRoles，存 `room.roles`
  - 幂等：已分配则覆盖（允许重新分配）
- generateScript 末尾自动调用 assignRoles（让默认流程自带角色）

### C-15 独立线索 — `generateClues(roomId)` + 纯函数 `buildClues(members, steps)`

**现状**：剧本 steps 全员共享，无「每人专属任务」。

**新增**：
- 纯函数 `buildClues(members, steps)`：
  - 入参：members 数组 + steps 文本数组
  - steps 为空 → 每人返回 `clue: '自由发挥'`
  - 按 members 索引轮询 steps：`clue = steps[i % steps.length]`
  - 返回 `[{ openId, nickname, clue }]`
- `generateClues(roomId)`：
  - 仅 FINISHED 状态可调
  - 依赖 `room.script.steps` + `room.members`
  - 存 `room.clues`
  - 幂等：已生成则覆盖
- generateScript 末尾自动调用 generateClues
- room 页 FINISHED 状态展示「你的角色 + 你的专属线索」

### C-16 公开组局 — `createRoom` 升级 + `listPublicRooms()`

**现状**：createRoom 只创建私密房间，无公开列表。

**新增**：
- createRoom 签名升级：`createRoom(topic, maxMembers, options)`，options.visibility 默认 'private'
- room 新增 `visibility` 字段（'private' | 'public'），默认 'private'
- `listPublicRooms()`：
  - 返回 visibility='public' 且 status ∈ {waiting, ready, voting} 的房间（已完成/取消的不进列表）
  - 按 createdAt 倒序
  - 返回 `{ ok, rooms: [{ roomId, topic, membersCount, maxMembers, status, createdAt }] }`（精简字段，不含敏感数据）
- room 页展示 visibility 标记（公开/私密）

### C-17 申请加入 — `requestJoin(roomId, nickname)`

**现状**：joinRoom 直接加入，无申请审核流程。

**新增**：
- room 新增 `joinRequests: []`（待审核申请）
- `requestJoin(roomId, nickname)`：
  - 仅 visibility='public' 房间可申请（private 返回 NOT_PUBLIC）
  - status ∈ {waiting, ready} 可申请（投票中/已生成不可）
  - 防重复：同一 openId 已申请或已成员 → ALREADY_REQUESTED
  - 房间满员 → ROOM_FULL
  - 加入 joinRequests：`{ requestId, openId, nickname, requestedAt }`
  - 返回 `{ ok, requestId }`
- room 页：公开房间显示「申请加入」按钮（非成员视角）

### C-18 发起人审核 — `approveJoin(roomId, requestId)` + `rejectJoin(roomId, requestId)`

**现状**：无审核流程。

**新增**：
- `approveJoin(roomId, requestId)`：
  - 仅房主可调（NOT_HOST）
  - status ∈ {waiting, ready} 可审核
  - 房间满员 → ROOM_FULL
  - 审核通过 → 从 joinRequests 移除，加入 members（复用 joinRoom 的成员构造逻辑）
  - 返回 `{ ok, room }`
- `rejectJoin(roomId, requestId)`：
  - 仅房主可调
  - 从 joinRequests 移除
  - 返回 `{ ok, room }`
- room 页：房主视角显示待审核列表 + 通过/拒绝按钮

### C-19 评价和举报 — `submitReview(roomId, review)` + `reportRoom(roomId, reason)`

**现状**：完成后无评价机制。

**新增**：
- `submitReview(roomId, review)`：
  - review: `{ rating: 1-5, comment?: string }`
  - 仅 FINISHED 状态可评价
  - 仅成员可评价（NOT_MEMBER）
  - 防重复：同一 openId 已评价 → ALREADY_REVIEWED（每人一次）
  - 存 `room.reviews: [{ openId, rating, comment, createdAt }]`
  - 返回 `{ ok, room, reviewSummary }`，reviewSummary 含平均分 + 总数
- `reportRoom(roomId, reason)`：
  - reason: 非空字符串（≤100 字）
  - 任何成员可举报
  - 房间标记 `reported: true` + `reportReason`
  - 防重复举报：已举报 → ALREADY_REPORTED
  - 返回 `{ ok }`
- 纯函数 `buildReviewSummary(reviews)`：算平均分 + 总数 + 分布，供测试

---

## 数据契约不变量

1. createRoom 向后兼容：第三参 options 可选，不传则 visibility='private'（现有调用零影响）
2. generateScript 升级：末尾自动调 assignRoles + generateClues，返回结构不变（roles/clues 存 room 上）
3. ROOM_STATUS 不新增状态（C-P2 全部在现有状态内流转）
4. joinRequests / reviews / reported 为新增字段，旧房间无此字段时按 [] / [] / false 兜底
5. 所有新函数空输入返回 `{ok:false, errCode:'INVALID_PARAM'}`，不抛异常
6. 零新增资源：PR 资源增量 = 0

## 包体影响评估

| 项 | 增量 | 说明 |
|---|---|---|
| group-room-store.js | +~6KB | 6 组新函数 + 角色库 |
| room.wxml/wxss | +~4KB | 角色/线索/审核/评价展示块 |
| room.js | +~3KB | 接入新函数 |
| 资源 | 0 | 全复用现有 SVG |
| **主包净增** | **~13KB** | 199KB → ~212KB，远低于 1.5MB 红线 |

## 测试计划（7 层）

- **单元测试**：每个新函数 happy path + 边界 + 异常 + 幂等，预计 +~180 case
- **Gherkin BDD**：C-14~C-19 各 4 scenario，预计 +~24 scenario
- **Property Fuzz**：buildRoles/buildClues/buildReviewSummary 不变式（角色数=成员数、线索数=成员数、平均分∈[1,5]），预计 +~3000 次
- **Adversarial**：null/undefined/__proto__/极端 rating/超长 reason/重复申请，预计 +~15 向量
- **Mutation**：角色库轮询边界、线索取模、visibility 默认值、审核状态校验、评价防重复、举报防重复，预计 +~15 变异点
- **Coverage**：新函数函数覆盖率 ≥ 90% / 行 ≥ 85%
- **QA**：契约检查（createRoom 三参兼容、ROOM_STATUS 不变、零新增资源、generateScript 自动调角色+线索）

## 验收标准

1. 6 个功能点全部实现且接入 room 页
2. 7 层测试全 PASS，mutation score 维持 100%
3. check-syntax FAIL=0 / check-bundle PR 资源 0 新增
4. 主包 < 1.5MB
5. 向后兼容：现有 createRoom(topic, maxMembers) 调用零影响
6. 模拟器验证：剧本生成后有角色+线索；公开房间可申请；房主可审核；完成后可评价

## 风险与回滚

- **风险**：generateScript 末尾自动调 assignRoles/generateClues 可能影响现有 group-flow BDD → 新增字段可选，旧测试不断言 roles/clues，兼容
- **风险**：createRoom 签名升级破坏现有调用 → 第三参可选，旧调用零影响
- **回滚**：6 个功能点函数独立，generateScript 的自动调用可单独移除，room 页接入可逐个回滚

## 推进顺序（实现阶段）

1. C-14 buildRoles 纯函数 + assignRoles + 接入 generateScript
2. C-15 buildClues 纯函数 + generateClues + 接入 generateScript
3. C-16 createRoom 升级 visibility + listPublicRooms
4. C-17 requestJoin
5. C-18 approveJoin + rejectJoin
6. C-19 submitReview + reportRoom + buildReviewSummary
7. room 页接入 6 项展示
8. 7 层测试 + 全量回归
