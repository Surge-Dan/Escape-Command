# C-P4 社交增强：任务内聊天 + 玩家信任系统 设计文档

> 日期：2026-07-30
> 范围：room 内嵌实时聊天（轮询） + 玩家级评价/举报/信任分（影响匹配优先级）
> 前置：C-P3 任务大厅 + D1-D5 增强（commit `7e76176`），player-matcher.js 混合匹配 + 3 云函数已就位
> change-id：`c-p4-social`

## 一、已确认决策

| # | 决策点 | 选择 | 理由 |
|---|--------|------|------|
| 1 | Spec 结构 | 合并为 `c-p4-social` | 两模块联动设计一次到位 |
| 2 | 聊天场景 | room 页面内嵌，任务内协调 | MVP 最小，与现有 room 流程紧耦合 |
| 3 | 聊天技术 | 云数据库 messages + 轮询 2.5s | 与 heartbeat 模式一致，成本可控 |
| 4 | 信任分作用 | 影响 player-matcher 匹配优先级 | 闭环质量信号 |
| 5 | 评价时机 | 仅任务 finished 后可评价 | 复用 C-19 模式，防滥用 |

## 二、架构总览

```
┌─ room 页面 ─────────────────────────────────┐
│  现有：成员/投票/剧本/记录                    │
│  新增：聊天区（Tab 切换：成员/聊天/记录）      │
│        评价入口（finished 后显示）            │
└─────────────────────────────────────────────┘
        │                          │
        ▼                          ▼
┌─ 聊天云函数 ─────┐    ┌─ 信任数据层 ──────┐
│ sendMessage     │    │ player-trust-store │
│ fetchMessages   │    │ + trust-score.js   │
│ (messages 集合) │    │ (本地+云端混合)    │
└─────────────────┘    └─────────┬──────────┘
                                 │
                                 ▼
                       ┌─ player-matcher.js ─┐
                       │ rankByRelevance 增强  │
                       │ 加入 trustScore 权重   │
                       └──────────────────────┘
```

## 三、实时聊天设计

### 3.1 数据模型（云数据库 `messages` 集合）

```js
{
  _id: 自动,
  roomId: 'ABC123',        // 关联的 group room
  taskId: 'hall_xxx',      // 关联的 hall task
  senderOpenId: 'xxx',     // 发送者
  senderNickname: '阿月',   // 发送者昵称（冗余存储，避免联表）
  content: '下午3点二沙岛集合',  // 消息内容（1-200 字，trim 后非空）
  msgType: 'text',         // MVP 只支持 text
  createdAt: Date          // 时间戳，用于排序和增量拉取
}
```

权限：所有用户可读（room 内成员拉消息），仅创建者可写自己的消息记录。

### 3.2 云函数

**`cloudfunctions/sendMessage/index.js`**
- 入参：`{ roomId, taskId, content }`（openId 从云函数上下文取）
- 逻辑：
  1. 校验 content：1-200 字，trim 后非空，typeof string
  2. 校验 senderOpenId 是 room 成员（查 group-room-store 或本地缓存）
  3. 写入 messages 集合，含 senderNickname 冗余
- 返回：`{ ok: true, message: {...} }` 或 `{ ok: false, errCode }`
- 错误码：`INVALID_PARAM` / `NOT_ROOM_MEMBER` / `ROOM_CLOSED`

**`cloudfunctions/fetchMessages/index.js`**
- 入参：`{ roomId, lastCreatedAt? }`（可选增量游标）
- 逻辑：
  1. 查 messages 集合按 roomId 过滤
  2. 若有 lastCreatedAt，只拉该时间之后的（增量）
  3. 按 createdAt 升序，截取最近 50 条
- 返回：`{ ok: true, messages: [...], hasMore: bool }`
- 防御：roomId 缺失返回空数组，不抛异常

### 3.3 客户端接入层

**新增 `utils/chat-store.js`**（纯函数 + 降级协调层）

```js
// 关键 API
function loadMessages(roomId)              // 从本地缓存读历史消息
function fetchNewMessages(roomId, last)    // 调云函数拉新消息（增量）
function sendMessage(roomId, taskId, content)  // 调云函数发消息
function startPolling(roomId, callback)    // 启动 2.5s 轮询
function stopPolling()                     // 停止轮询
function clearLocalMessages(roomId)        // 调试：清空本地缓存
```

设计要点：
- 轮询用 `setInterval(2500)`，每次 fetchNewMessages
- 降级：`cloudReady=false` 或云函数失败 → 消息只存本地（demo 模式），不阻断 UI
- `sendMessage` 乐观更新：先 setData 显示，云函数失败回滚并 toast 提示
- 消息去重：按 `_id` 去重（云函数返回的可能与本地缓存重叠）

### 3.4 room 页面改造

**UI 布局**：剧本生成后，room 页面下方改为 Tab 切换：
- Tab 1「成员」：现有成员列表（默认）
- Tab 2「聊天」：消息列表 + 输入框
- Tab 3「记录」：现有 escape-record 入口

**聊天区 UI**：
- 消息气泡：自己的消息靠右（品牌色 `--brand` 背景 + 白字），对方靠左（白底 + 深字）
- 头像：复用 `/assets/images/avatar.webp`
- 昵称：22rpx ink-soft（仅对方消息显示）
- 时间戳：20rpx ink-faint，间隔 >5min 才显示
- 输入框：固定聊天区底部，高 80rpx，圆角 16rpx
- 发送按钮：`--brand` 填充，圆角 16rpx，高 80rpx
- 消息上限：每次渲染最近 50 条，上滑加载更多

**生命周期**：
- onLoad：启动轮询 `startPolling(roomId, onUpdate)`
- onUnload：`stopPolling()`，保存最后消息时间到本地
- 轮询回调：setData 更新 `messages` 数组

## 四、评价/信任系统设计

### 4.1 数据模型

**云数据库 `playerReviews` 集合**：
```js
{
  _id: 自动,
  reviewerOpenId: 'xxx',     // 评价者
  targetOpenId: 'xxx',       // 被评价者
  roomId: 'ABC123',          // 关联 room（校验同 room）
  taskId: 'hall_xxx',        // 关联 hall task
  rating: 5,                 // 1-5 整数
  comment: '很准时，人很好',   // ≤100 字
  tags: ['准时', '友善'],     // 预设标签多选
  createdAt: Date
}
```

权限：所有用户可读（信任分计算需要查他人评价），仅评价者可写自己的评价记录。

**云数据库 `playerReports` 集合**（举报，独立）：
```js
{
  _id: 自动,
  reporterOpenId: 'xxx',
  targetOpenId: 'xxx',
  roomId: 'ABC123',
  reason: '迟到/爽约/骚扰/其他',  // 预设理由
  createdAt: Date
}
```

### 4.2 信任分计算（纯函数 `utils/trust-score.js`）

```js
function computeTrustScore(reviews) {
  if (!Array.isArray(reviews) || reviews.length === 0) {
    return { score: 5.0, count: 0, label: '新手', tier: 'newbie' }
  }
  const count = reviews.length
  const sum = reviews.reduce((s, r) => s + (Number.isInteger(r.rating) ? r.rating : 5), 0)
  const avg = sum / count
  
  // 分级（tier 用于 player-matcher 权重）
  let label = '普通', tier = 'normal'
  if (count < 3) { label = '新手'; tier = 'newbie' }
  else if (avg >= 4.8 && count >= 10) { label = '金牌搭子'; tier = 'gold' }
  else if (avg >= 4.5) { label = '靠谱'; tier = 'reliable' }
  else if (avg < 3.0) { label = '待观察'; tier = 'watch' }
  
  return { score: Math.round(avg * 10) / 10, count, label, tier }
}
```

**信任标签规则**：
| 条件 | label | tier | 匹配权重 |
|------|-------|------|---------|
| count < 3 | 新手 | newbie | 0.8（善意降权，但不歧视） |
| count ≥ 3, avg ≥ 4.8 | 金牌搭子 | gold | 1.2（加权） |
| count ≥ 3, avg ≥ 4.5 | 靠谱 | reliable | 1.0（基准） |
| count ≥ 3, avg ≥ 3.0, < 4.5 | 普通 | normal | 1.0 |
| count ≥ 3, avg < 3.0 | 待观察 | watch | 0.5（降级，不过滤） |

**低信任分处理**：降级排序（不过滤），给改进机会。tier=watch 的玩家排在匹配队列末尾，但仍可被匹配到。

### 4.3 云函数

**`cloudfunctions/submitPlayerReview/index.js`**
- 入参：`{ targetOpenId, roomId, taskId, rating, comment, tags }`
- 校验：
  1. rating 是 1-5 整数
  2. comment 是字符串，trim 后 ≤100 字
  3. tags 是数组，每项 ≤6 字，最多 5 个
  4. **reviewerOpenId 与 targetOpenId 必须是同一 room 的成员**
  5. **room 状态必须为 finished**（查本地 group-room-store 或云端 room 记录）
  6. **防重复**：同一 reviewer 对同一 target 在同一 room 只能评价一次
- 写入 playerReviews 集合
- 返回：`{ ok: true, trust: computeTrustScore(...) }`
- 错误码：`INVALID_PARAM` / `NOT_ROOM_MEMBER` / `ROOM_NOT_FINISHED` / `ALREADY_REVIEWED` / `SELF_REVIEW_FORBIDDEN`

**`cloudfunctions/getPlayerTrust/index.js`**
- 入参：`{ targetOpenId }` 或 `{ openIds: [...] }`（批量查，最多 20 个）
- 逻辑：查 playerReviews 按 targetOpenId 过滤，调 computeTrustScore
- 返回：`{ ok: true, trusts: { [openId]: { score, count, label, tier } } }`
- 防御：openIds 为空或非法返回空对象

**`cloudfunctions/reportPlayer/index.js`**
- 入参：`{ targetOpenId, roomId, reason }`
- 逻辑：写入 playerReports 集合，累计同一 target 3 次举报后标记 `flagged`（影响匹配，等同 watch tier）
- 返回：`{ ok: true, flagged: bool }`
- 防重复：同一 reporter 对同一 target 在同一 room 只能举报一次

### 4.4 客户端接入层

**新增 `utils/player-trust-store.js`**（纯函数 + 降级）

```js
function submitReview(target, review, cloudImpl)   // 调云函数，降级走本地
function getTrust(openId, cloudImpl)               // 单个查信任分
function getTrustBatch(openIds, cloudImpl)         // 批量查（player-matcher 用）
function reportPlayer(target, reason, cloudImpl)   // 举报
function getCachedTrust(openId)                    // 读本地缓存
```

降级原则（与 player-matcher 一致）：
- cloudReady=false → 走本地缓存，返回默认信任分 `{ score: 5.0, label: '新手', tier: 'newbie' }`
- 云函数超时 → 同上
- 不阻断主流程（评价失败 toast 提示，匹配失败用默认值）

### 4.5 player-matcher.js 改造

**`rankByRelevance` 函数增强**：

原优先级：
```
district+interests 双命中 > district 命中 > interests 命中 > 其他
```

新优先级（加入 trust 权重）：
```
district+interests 双命中 + trust gold   (权重 1.2 × 1.2 = 1.44)
district+interests 双命中 + trust reliable (1.2 × 1.0 = 1.2)
district+interests 双命中 + trust normal   (1.2 × 1.0 = 1.2)
district 命中 + trust gold                  (1.0 × 1.2 = 1.2)
district 命中 + trust reliable              (1.0 × 1.0 = 1.0)
interests 命中 + trust gold                 (1.0 × 1.2 = 1.2)
interests 命中 + trust reliable             (1.0 × 1.0 = 1.0)
其他 + trust gold                           (0.5 × 1.2 = 0.6)
其他 + trust normal                         (0.5 × 1.0 = 0.5)
trust watch                                 (降级到队尾，权重 0.3)
```

**`matchPlayersAsync` 改造**：
1. 先从云函数 `getPlayerTrust` 批量查候选玩家的信任分
2. 调用增强版 `rankByRelevance` 排序
3. 按排序结果截取 count 个
4. 信任分查询失败 → 用默认值（newbie tier），不阻断匹配

### 4.6 评价 UI

**room 页评价入口**：
- room 状态为 finished 时，成员 Tab 下方显示「评价搭子」按钮
- 点击弹出评价弹窗（复用 picker-panel 模式）

**评价弹窗**：
- 选择搭子：横向头像列表（除自己外的成员）
- 星级评分：5 颗星，点击选择（1-5）
- 预设标签：多选 chip（准时 / 友善 / 有趣 / 靠谱 / 会聊天 / 懂拍照）
- 文字评价：textarea，≤100 字，带计数器
- 举报按钮：独立入口，点击弹出理由选择（迟到/爽约/骚扰/其他）
- 提交按钮：`--brand` 填充

**信任标签展示**：
- hall.js 匹配结果弹窗：每个搭子头像旁显示 tier 对应的信任标签（「金牌搭子」/「靠谱」/「新手」）
- detail.js 成员列表：成员头像旁显示信任标签
- 标签样式：圆角 10rpx，背景 `--brand-tint`，文字 `--brand-dark`，22rpx

## 五、降级与容错

| 场景 | 聊天行为 | 评价/信任行为 |
|------|----------|--------------|
| cloudReady=false | 消息只存本地，demo 模式 | 评价存本地，匹配用默认信任分 |
| 云函数超时（>3s） | 显示"发送中..."，可重试 | 静默失败，toast 提示重试 |
| 轮询失败 | 静默重试，不影响 room 主流程 | N/A |
| 评价冲突（重复/非成员/未完成） | N/A | 返回 errCode，toast 提示具体原因 |
| 信任分查询失败 | N/A | 用默认值 newbie，不阻断匹配 |
| 网络断开 | 走本地缓存，UI 不崩 | 走本地缓存，匹配正常 |

## 六、测试策略（7 层）

| 层 | 聊天覆盖 | 信任覆盖 |
|----|----------|---------|
| 单元测试 | chat-store 轮询/缓存/降级/去重 | trust-score 计算（5 tier）、player-trust-store 降级 |
| Gherkin BDD | room 内发消息/拉消息/任务结束关闭轮询 | 评价流程/信任标签展示/举报/重复评价拦截 |
| Property Fuzz | 任意 content/roomId/lastCreatedAt 组合不崩 | 任意 rating/reviews/tags 组合不崩 |
| Adversarial | content 注入 `__proto__`、超长、非字符串、非成员发送 | rating 越界（0/6/-1/NaN）、自评、非成员评价、非 finished 评价 |
| Mutation | 轮询启动/停止、消息排序、增量游标 | 信任分计算、tier 阈值、降级排序、getTrustBatch |
| Coverage | chat-store ≥90%/行 ≥85% | trust-score/player-trust-store ≥90%/行 ≥85% |
| QA 契约 | 云函数导出、room 页聊天区存在、Tab 切换 | 评价入口、信任标签、player-matcher 改造、云函数导出 |

**关键测试设计**：
- `trust-score` tier 边界：count=2 (newbie) vs count=3 avg=4.8 (gold)
- `player-matcher` 降级排序：注入 2 个 watch tier 玩家，验证排在队尾
- `chat-store` 轮询：注入 mock callFunction 返回 3 条消息，验证 setData 被调用
- `submitPlayerReview` 防重复：同一 reviewer+target+room 第二次返回 ALREADY_REVIEWED

## 七、实施顺序与依赖

```
阶段 1：信任分数据层（独立，先做，player-matcher 改造依赖）
  ├─ utils/trust-score.js（纯函数）
  ├─ utils/player-trust-store.js（降级协调）
  └─ 3 云函数：submitPlayerReview / getPlayerTrust / reportPlayer
        ↓
阶段 2：player-matcher 改造（依赖阶段1）
  └─ rankByRelevance 加 trust 权重 + matchPlayersAsync 预加载信任分
        ↓
阶段 3：聊天数据层（可与阶段1-2并行，独立）
  ├─ utils/chat-store.js
  └─ 2 云函数：sendMessage / fetchMessages
        ↓
阶段 4：页面接入（依赖1-3）
  ├─ room 页：Tab 切换 + 聊天区 + 评价弹窗
  ├─ hall 页：匹配结果搭子头像加信任标签
  └─ detail 页：成员列表加信任标签
        ↓
阶段 5：7 层测试接入 + 全量回归
```

**工作量估算**：
- 阶段 1：3h（纯函数 + 3 云函数）
- 阶段 2：1.5h（player-matcher 改造 + 测试更新）
- 阶段 3：2h（chat-store + 2 云函数）
- 阶段 4：3h（room Tab + 聊天 UI + 评价弹窗 + 信任标签）
- 阶段 5：3h（7 层测试接入）
- 合计：~12.5h

## 八、包体与资源影响

- 新增纯 JS：~15KB（chat-store ~5KB + trust-score ~2KB + player-trust-store ~5KB + player-matcher 改造增量 ~3KB）
- 新增云函数：5 个（sendMessage / fetchMessages / submitPlayerReview / getPlayerTrust / reportPlayer）
- **资源增量 = 0**（无新图片/字体/音频，UI 复用现有 SVG/avatar.webp + emoji）
- 主包增量可控，远低于 1.5MB 红线

## 九、不在本批次范围（YAGNI）

- 聊天支持图片/语音/视频（MVP 只文字+emoji）
- 聊天历史云端可查（任务结束即归档，不提供跨任务历史查询）
- 评价人工审核流程（MVP 自动计算信任分，举报累计 3 次自动标记）
- 信任分时间衰减算法（按时间衰减，后续迭代）
- 跨任务聊天会话（只限当前 room，任务结束聊天关闭）
- 评价回复/申诉机制（后续迭代）
- 信任分隐私控制（MVP 默认所有玩家可见）

## 十、风险与约束

1. **云函数部署**：5 个新云函数需用户在开发者工具部署（公司电脑无法部署）
2. **轮询成本**：2.5s 轮询会产生云函数调用量，建议生产环境改为 5s 或按需轮询（页面可见时）
3. **评价冷启动**：新玩家无评价，用 newbie tier（权重 0.8），可能影响初期匹配体验
4. **信任分滥用**：恶意差评风险，MVP 用"仅 finished 后可评价 + 防重复"缓解，后续加评价者信用加权
5. **player-matcher 改造回归**：现有 35 个单元测试需全量回归，确保不破坏 D5 的混合匹配逻辑
6. **room 页 Tab 改造**：现有 room 页结构较大改动，需确保 C-01~C-19 流程不受影响
