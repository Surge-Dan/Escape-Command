# Tasks

> change-id：`c-p4-social`
> 设计文档：`docs/superpowers/specs/2026-07-30-c-p4-social-design.md`
> 前置：C-P3 任务大厅 + D1-D5 增强（commit `7e76176`），player-matcher.js 混合匹配 + 3 云函数已就位

## 阶段 1：信任分数据层（独立，player-matcher 改造依赖）✅ 已完成
> trust-score.js（37 测试）+ player-trust-store.js（35 测试）+ submitPlayerReview/getPlayerTrust/reportPlayer 云函数 全部就位
- [ ] Task 1: 创建信任分纯函数 `utils/trust-score.js`
  - [ ] `computeTrustScore(reviews)`：输入评价数组，输出 `{ score, count, label, tier }`
  - [ ] 5 tier 分级：newbie（count<3）/ gold（avg≥4.8 && count≥10）/ reliable（avg≥4.5）/ normal / watch（avg<3.0 && count≥3）
  - [ ] score 保留 1 位小数（`Math.round(avg*10)/10`）
  - [ ] 防御：reviews 非数组或空数组返回 `{ score: 5.0, count: 0, label: '新手', tier: 'newbie' }`
  - [ ] rating 非整数时按 5 处理（`Number.isInteger` 校验）
  - [ ] 导出 `TRUST_TIER_WEIGHT` 常量（gold 1.2 / reliable 1.0 / normal 1.0 / newbie 0.8 / watch 0.3）
  - [ ] 零 wx 依赖（纯函数，可 Node 直接 require 测试）
- [ ] Task 2: 创建信任数据层 `utils/player-trust-store.js`（降级协调）
  - [ ] `submitReview(target, review, cloudImpl)`：调云函数，降级走本地
  - [ ] `getTrust(openId, cloudImpl)`：单个查信任分，降级返回默认 newbie
  - [ ] `getTrustBatch(openIds, cloudImpl)`：批量查（player-matcher 用，最多 20 个）
  - [ ] `reportPlayer(target, reason, cloudImpl)`：举报，累计 3 次标记 flagged
  - [ ] `getCachedTrust(openId)`：读本地缓存（`wx.getStorageSync`）
  - [ ] 降级：cloudReady=false / 云函数超时 → 返回默认信任分，不阻断主流程
  - [ ] 本地缓存键 `playerTrustCache`（按 openId 索引的对象）
- [ ] Task 3: 创建云函数 `cloudfunctions/submitPlayerReview/`
  - [ ] 入参：`{ targetOpenId, roomId, taskId, rating, comment, tags }`（openId 从上下文取）
  - [ ] 校验：rating 1-5 整数 / comment trim 后 ≤100 字 / tags 数组每项 ≤6 字最多 5 个
  - [ ] 校验：reviewerOpenId 与 targetOpenId 是同一 room 成员（查 group-room-store 或本地缓存）
  - [ ] 校验：room 状态必须为 finished
  - [ ] 校验：防自评（targetOpenId === reviewerOpenId → SELF_REVIEW_FORBIDDEN）
  - [ ] 校验：防重复（同 reviewer+target+room → ALREADY_REVIEWED）
  - [ ] 写入 `playerReviews` 集合，返回 `{ ok: true, trust: computeTrustScore(...) }`
  - [ ] 错误码：INVALID_PARAM / NOT_ROOM_MEMBER / ROOM_NOT_FINISHED / ALREADY_REVIEWED / SELF_REVIEW_FORBIDDEN
  - [ ] 入口 `index.js` 导出 `handler`，含 mock-wx 测试支持
- [ ] Task 4: 创建云函数 `cloudfunctions/getPlayerTrust/`
  - [ ] 入参：`{ targetOpenId }` 或 `{ openIds: [...] }`（批量，最多 20 个）
  - [ ] 逻辑：查 playerReviews 按 targetOpenId 过滤，调 computeTrustScore
  - [ ] 返回：`{ ok: true, trusts: { [openId]: { score, count, label, tier } } }`
  - [ ] 防御：openIds 为空/非法/超 20 个截断返回空对象或前 20 个
- [ ] Task 5: 创建云函数 `cloudfunctions/reportPlayer/`
  - [ ] 入参：`{ targetOpenId, roomId, reason }`
  - [ ] 写入 `playerReports` 集合
  - [ ] 累计同一 target 3 次举报 → 标记 flagged（影响匹配，等同 watch tier）
  - [ ] 防重复：同 reporter+target+room → ALREADY_REPORTED
  - [ ] 返回：`{ ok: true, flagged: bool }`
- [ ] Task 6: 信任分数据层单元测试 `tests/unit/trust-score.test.js`
  - [ ] 覆盖 5 tier 边界（count=2 newbie / count=3 avg=4.8 gold / count=10 avg=4.5 reliable / avg=3.5 normal / avg=2.9 watch）
  - [ ] 覆盖防御：空数组、非数组、rating 非整数、null/undefined 输入
  - [ ] 覆盖 score 保留 1 位小数
  - [ ] 覆盖 TRUST_TIER_WEIGHT 常量导出
- [ ] Task 7: player-trust-store 单元测试 `tests/unit/player-trust-store.test.js`
  - [ ] 覆盖 submitReview/getTrust/getTrustBatch/reportPlayer 正向 + 降级
  - [ ] 覆盖 cloudImpl 注入（mock cloudImpl.available=false / 抛异常 / 返回不足）
  - [ ] 覆盖本地缓存读写
  - [ ] 覆盖 flagged 标记累计

## 阶段 2：player-matcher 改造（依赖阶段 1）✅ 已完成
> rankByRelevance 加 trust 权重（gold 1.2/watch 降级队尾），matchPlayersAsync 预加载信任分；player-matcher 49 测试全过（含 13 个新增 trust 用例）
- [ ] Task 8: 修改 `utils/player-matcher.js` 加入 trust 权重
  - [ ] `rankByRelevance` 增强：原 district/interests 优先级叠加 trust tier 权重
  - [ ] 权重矩阵：district+interests 双命中 × trust 权重（gold 1.2×1.2=1.44 / reliable 1.2×1.0 / normal 1.2×1.0）
  - [ ] watch tier 降级到队尾（权重 0.3，不过滤）
  - [ ] `matchPlayersAsync` 改造：先批量查候选玩家信任分（调 getPlayerTrust），再排序截取
  - [ ] 信任分查询失败 → 用默认值 newbie tier，不阻断匹配
  - [ ] 保持向后兼容：trust 字段缺失时按 normal tier（权重 1.0）处理
- [ ] Task 9: player-matcher 回归测试更新 `tests/unit/player-matcher.test.js`
  - [ ] 全量回归现有 35 个单元测试（确保 D5 混合匹配逻辑不破坏）
  - [ ] 新增：gold 玩家优先于 normal 玩家被匹配
  - [ ] 新增：watch 玩家降级到队尾
  - [ ] 新增：信任分查询失败时用默认值不崩
  - [ ] 新增：trust 字段缺失时按 normal 处理

## 阶段 3：聊天数据层（可与阶段 1-2 并行，独立）✅ 已完成
> chat-store.js（乐观更新+回滚+降级+轮询+去重，52 测试）+ sendMessage/fetchMessages 云函数（校验链/增量游标/防御）就位
- [ ] Task 10: 创建聊天数据层 `utils/chat-store.js`（纯函数 + 降级）
  - [ ] `loadMessages(roomId)`：从本地缓存读历史消息
  - [ ] `fetchNewMessages(roomId, lastCreatedAt)`：调云函数增量拉取
  - [ ] `sendMessage(roomId, taskId, content)`：调云函数发消息（乐观更新）
  - [ ] `startPolling(roomId, callback)`：启动 2.5s 轮询（`setInterval(2500)`）
  - [ ] `stopPolling()`：停止轮询
  - [ ] `clearLocalMessages(roomId)`：调试用清空本地缓存
  - [ ] 消息去重：按 `_id` 去重（云函数返回与本地缓存重叠时）
  - [ ] 降级：cloudReady=false / 云函数失败 → 消息只存本地，不阻断 UI
  - [ ] sendMessage 失败回滚 + toast 提示
  - [ ] 本地缓存键 `chatMessages_<roomId>`
- [ ] Task 11: 创建云函数 `cloudfunctions/sendMessage/`
  - [ ] 入参：`{ roomId, taskId, content }`（openId 从上下文取）
  - [ ] 校验：content 1-200 字，trim 后非空，typeof string
  - [ ] 校验：senderOpenId 是 room 成员（查 group-room-store 或本地缓存）
  - [ ] 校验：room 状态非 finished（finished 后 ROOM_CLOSED）
  - [ ] 写入 `messages` 集合，含 senderNickname 冗余（避免联表）
  - [ ] 返回：`{ ok: true, message: {...} }` 或错误码
  - [ ] 错误码：INVALID_PARAM / NOT_ROOM_MEMBER / ROOM_CLOSED
- [ ] Task 12: 创建云函数 `cloudfunctions/fetchMessages/`
  - [ ] 入参：`{ roomId, lastCreatedAt? }`（可选增量游标）
  - [ ] 逻辑：查 messages 按 roomId 过滤，有 lastCreatedAt 则增量拉取
  - [ ] 按 createdAt 升序，截取最近 50 条
  - [ ] 返回：`{ ok: true, messages: [...], hasMore: bool }`
  - [ ] 防御：roomId 缺失返回空数组，不抛异常
- [ ] Task 13: chat-store 单元测试 `tests/unit/chat-store.test.js`
  - [ ] 覆盖 loadMessages/fetchNewMessages/sendMessage/startPolling/stopPolling
  - [ ] 覆盖轮询：注入 mock callFunction 返回 3 条消息，验证 callback 被调用
  - [ ] 覆盖消息去重（按 _id）
  - [ ] 覆盖降级：cloudReady=false / 云函数抛异常 → 只存本地
  - [ ] 覆盖 sendMessage 乐观更新 + 失败回滚

## 阶段 4：页面接入（依赖阶段 1-3）
- [ ] Task 14: 修改 room 页面 `pages/group/room/room.*` 加 Tab 切换
  - [ ] `room.wxml`：剧本生成后下方改 Tab 切换（成员/聊天/记录）
  - [ ] `room.wxss`：Tab 栏样式（圆角 100rpx 胶囊，品牌色高亮当前）
  - [ ] `room.js`：`activeTab` 状态切换（默认 'members'）
  - [ ] 保持现有 C-01~C-19 流程不受影响（剧本生成/投票/记录入口保留）
- [ ] Task 15: room 聊天区 UI
  - [ ] 消息气泡：自己靠右（`--brand` 背景 + 白字），对方靠左（白底 + 深字）
  - [ ] 头像：复用 `/assets/images/avatar.webp`
  - [ ] 昵称：22rpx ink-soft（仅对方消息显示）
  - [ ] 时间戳：20rpx ink-faint，间隔 >5min 才显示
  - [ ] 输入框：固定聊天区底部，高 80rpx，圆角 16rpx
  - [ ] 发送按钮：`--brand` 填充，圆角 16rpx，高 80rpx
  - [ ] 消息上限：每次渲染最近 50 条
  - [ ] onLoad 启动轮询，onUnload 停止轮询
- [ ] Task 16: room 评价弹窗
  - [ ] room 状态 finished 时，成员 Tab 下方显示「评价搭子」按钮
  - [ ] 评价弹窗（复用 picker-panel 模式）：选择搭子（横向头像列表，除自己）
  - [ ] 星级评分：5 颗星点击选择（1-5）
  - [ ] 预设标签：多选 chip（准时/友善/有趣/靠谱/会聊天/懂拍照）
  - [ ] 文字评价：textarea，≤100 字，带计数器
  - [ ] 举报按钮：独立入口，点击弹出理由选择（迟到/爽约/骚扰/其他）
  - [ ] 提交 → 调 `submitReview` → 成功 toast + 关闭弹窗
- [ ] Task 17: hall 页匹配结果信任标签
  - [ ] `hall.js` runDiceMatch 匹配结果搭子头像旁显示信任标签
  - [ ] `hall.wxml` 匹配结果弹窗加信任标签节点
  - [ ] 标签样式：圆角 10rpx，背景 `--brand-tint`，文字 `--brand-dark`，22rpx
- [ ] Task 18: detail 页成员列表信任标签
  - [ ] `detail.js` 加载成员时批量查信任分（调 getTrustBatch）
  - [ ] `detail.wxml` 成员头像旁显示信任标签
  - [ ] 降级：信任分查询失败不显示标签（不阻断页面）

## 阶段 5：7 层测试接入 + 全量回归
- [ ] Task 19: Gherkin BDD 场景 `tests/gherkin/group-flow.feature` 追加 C-P4 场景
  - [ ] room 内发消息/拉消息/任务结束关闭轮询
  - [ ] 评价流程（成功/防重复/非 finished 拒绝/防自评）
  - [ ] 信任标签展示（hall 匹配结果 + detail 成员列表）
  - [ ] 举报流程 + 防重复举报
  - [ ] player-matcher 信任优先级（gold 优先 / watch 降级）
- [ ] Task 20: Property Fuzz 测试
  - [ ] trust-score：任意 rating/reviews/tags 组合不崩
  - [ ] chat-store：任意 content/roomId/lastCreatedAt 组合不崩
  - [ ] player-matcher：任意 count/filter/cloudImpl/trust 组合不崩
- [ ] Task 21: Adversarial 对抗测试
  - [ ] content 注入 `__proto__` / 超长 / 非字符串 / 非成员发送
  - [ ] rating 越界（0/6/-1/NaN）、自评、非成员评价、非 finished 评价
  - [ ] customCategory 超长 / 脚本注入
- [ ] Task 22: Mutation 变异测试 `tests/mutation/mutation-test.js` 追加 C-P4 算子
  - [ ] trust-score 计算变异（tier 阈值边界）
  - [ ] chat-store 轮询启动/停止、消息排序、增量游标变异
  - [ ] player-matcher trust 权重变异、降级排序变异
  - [ ] player-trust-store getTrustBatch 变异
- [ ] Task 23: Coverage 覆盖率检查
  - [ ] trust-score 函数 ≥90% / 行 ≥85%
  - [ ] chat-store 函数 ≥90% / 行 ≥85%
  - [ ] player-trust-store 函数 ≥90% / 行 ≥85%
  - [ ] player-matcher 新分支覆盖
- [ ] Task 24: QA 契约检查扩展 `tests/qa/check.js`
  - [ ] 检查 trust-score/player-trust-store/chat-store 函数导出完整性
  - [ ] 检查 5 个云函数导出 handler
  - [ ] 检查 room 页 Tab 切换 + 聊天区 + 评价入口存在
  - [ ] 检查 hall/detail 信任标签节点存在
  - [ ] 检查 player-matcher rankByRelevance 含 trust 权重
  - [ ] 新增 C-P4 契约检查（预估 80+ 项）

# Task Dependencies
- [Task 2, 3, 4, 5] depend on [Task 1]（信任数据层依赖纯函数）
- [Task 6, 7] depend on [Task 1, 2]（测试依赖实现）
- [Task 8] depends on [Task 1, 2]（player-matcher 改造依赖信任分）
- [Task 9] depends on [Task 8]
- [Task 10, 11, 12] 独立可并行（聊天数据层）
- [Task 13] depends on [Task 10]
- [Task 14, 15, 16] depend on [Task 10, 2]（room 页依赖聊天层 + 信任层）
- [Task 17, 18] depend on [Task 2]（信任标签依赖信任数据层）
- [Task 19~24] depend on [Task 1~18 全部完成]
- [Task 1, 10] 可并行（纯函数层独立）
- [Task 3, 4, 5] 可并行（3 个云函数独立）
- [Task 11, 12] 可并行（2 个聊天云函数独立）
- [Task 17, 18] 可并行（hall/detail 信任标签独立）

# 工作量估算
- 阶段 1：3h（纯函数 + 3 云函数）
- 阶段 2：1.5h（player-matcher 改造 + 测试更新）
- 阶段 3：2h（chat-store + 2 云函数）
- 阶段 4：3h（room Tab + 聊天 UI + 评价弹窗 + 信任标签）
- 阶段 5：3h（7 层测试接入）
- 合计：~12.5h
