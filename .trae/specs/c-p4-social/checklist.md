# Checklist

> change-id：`c-p4-social`
> 设计文档：`docs/superpowers/specs/2026-07-30-c-p4-social-design.md`

## 信任分数据层
- [x] `utils/trust-score.js` 存在且导出 `computeTrustScore` 函数 + `TRUST_TIER_WEIGHT` 常量
- [x] `computeTrustScore([])` 返回 `{ score: 5.0, count: 0, label: '新手', tier: 'newbie' }`
- [x] 5 tier 分级正确：newbie（count<3）/ gold（avg≥4.8 && count≥10）/ reliable（avg≥4.5）/ normal / watch（avg<3.0 && count≥3）
- [x] score 保留 1 位小数（`Math.round(avg*10)/10`）
- [x] rating 非整数时按 5 处理
- [x] TRUST_TIER_WEIGHT：gold 1.2 / reliable 1.0 / normal 1.0 / newbie 0.8 / watch 0.3
- [x] 零 wx 依赖（纯函数，可 Node 直接 require）
- [x] `utils/player-trust-store.js` 存在且导出 `submitReview` / `getTrust` / `getTrustBatch` / `reportPlayer` / `getCachedTrust`
- [x] 降级：cloudReady=false / 云函数超时 → 返回默认 newbie 信任分，不阻断主流程
- [x] 本地缓存键 `playerTrustCache`（按 openId 索引）
- [x] getTrustBatch 最多查 20 个 openId
- [x] 单元测试 `tests/unit/trust-score.test.js` 全通过（38 项，5 tier 边界 + 防御）
- [x] 单元测试 `tests/unit/player-trust-store.test.js` 全通过（37 项，正向 + 降级 + flagged 累计）

## 云函数（信任）
- [x] `cloudfunctions/submitPlayerReview/` 存在且导出 handler
- [x] 校验 rating 1-5 整数 / comment ≤100 字 / tags 每项 ≤6 字最多 5 个
- [x] 校验 reviewer 与 target 是同一 room 成员
- [x] 校验 room 状态为 finished（非 finished → ROOM_NOT_FINISHED）
- [x] 防自评（SELF_REVIEW_FORBIDDEN）
- [x] 防重复（ALREADY_REVIEWED）
- [x] 写入 playerReviews 集合，返回更新后的 trust
- [x] `cloudfunctions/getPlayerTrust/` 存在且导出 handler
- [x] 支持单个 `{ targetOpenId }` 和批量 `{ openIds: [...] }` 查询
- [x] 批量最多 20 个，超出截断
- [x] openIds 为空/非法返回空对象
- [x] `cloudfunctions/reportPlayer/` 存在且导出 handler
- [x] 写入 playerReports 集合
- [x] 累计 3 次举报标记 flagged
- [x] 防重复举报（ALREADY_REPORTED）
- [x] 返回 `{ ok: true, flagged: bool }`

## player-matcher 改造
- [x] `rankByRelevance` 加入 trust tier 权重
- [x] 权重矩阵：district+interests 双命中 × trust 权重（gold 1.44 / reliable 1.2 / normal 1.2）
- [x] watch tier 降级到队尾（权重 0.3，不过滤）
- [x] `matchPlayersAsync` 先批量查信任分再排序
- [x] 信任分查询失败用默认 newbie，不阻断匹配
- [x] 向后兼容：trust 字段缺失按 normal（权重 1.0）处理
- [x] 现有 49 个单元测试全量回归通过
- [x] 新增 gold 优先 / watch 降级测试通过

## 聊天数据层
- [x] `utils/chat-store.js` 存在且导出 `loadMessages` / `fetchNewMessages` / `sendMessage` / `startPolling` / `stopPolling` / `clearLocalMessages`
- [x] 轮询用 `setInterval(2500)`，每次 fetchNewMessages
- [x] 消息去重：按 `_id` 去重
- [x] 降级：cloudReady=false / 云函数失败 → 消息只存本地，不阻断 UI
- [x] sendMessage 乐观更新：先显示，云函数失败回滚 + toast
- [x] 本地缓存键 `chatMessages_<roomId>`
- [x] 单元测试 `tests/unit/chat-store.test.js` 全通过（53 项，轮询 + 去重 + 降级 + 乐观更新）

## 云函数（聊天）
- [x] `cloudfunctions/sendMessage/` 存在且导出 handler
- [x] 校验 content 1-200 字，trim 后非空，typeof string
- [x] 校验 senderOpenId 是 room 成员
- [x] 校验 room 状态非 finished（finished → ROOM_CLOSED）
- [x] 写入 messages 集合，含 senderNickname 冗余
- [x] 错误码：INVALID_PARAM / NOT_ROOM_MEMBER / ROOM_CLOSED
- [x] `cloudfunctions/fetchMessages/` 存在且导出 handler
- [x] 支持 `{ roomId, lastCreatedAt? }` 增量游标
- [x] 按 createdAt 升序，截取最近 50 条
- [x] 返回 `{ ok: true, messages: [...], hasMore: bool }`
- [x] roomId 缺失返回空数组，不抛异常

## room 页面改造
- [x] `pages/group/room/room.wxml` 剧本生成后有 Tab 切换（成员/聊天/记录）
- [x] Tab 栏样式：圆角胶囊，品牌色高亮当前
- [x] `room.js` `activeTab` 状态切换（默认 'members'）
- [x] 现有 C-01~C-19 流程不受影响（剧本生成/投票/记录入口保留）
- [x] 聊天区消息气泡：自己靠右（`--brand` + 白字），对方靠左（白底 + 深字）
- [x] 头像复用 `/assets/images/avatar.webp`
- [x] 昵称 22rpx ink-soft（仅对方消息显示）
- [x] 输入框固定底部，圆角 16rpx
- [x] 发送按钮 `--brand` 填充，圆角 16rpx
- [x] 消息上限每次渲染最近 50 条
- [x] onLoad 启动轮询，onHide/onUnload 停止轮询

## 评价弹窗
- [x] room 状态 finished 时成员 Tab 下方显示「评价搭子」入口
- [x] 评价弹窗复用 modal 模式
- [x] 选择搭子：成员列表（除自己外）
- [x] 星级评分：5 颗星点击选择（1-5）
- [x] 预设标签：多选 chip（准时/友善/有趣/靠谱/会聊天/懂拍照）
- [x] 文字评价：textarea，≤100 字
- [x] 举报按钮：独立入口
- [x] 提交 → 调 submitReview → 成功 toast + 关闭弹窗

## 信任标签展示
- [x] `pages/group/hall/hall.js` 匹配结果搭子头像旁显示信任标签
- [x] `pages/group/hall/hall.wxml` 匹配结果弹窗加信任标签节点
- [x] `pages/group/hall/detail/detail.js` 加载成员时批量查信任分
- [x] `pages/group/hall/detail/detail.wxml` 成员头像旁显示信任标签
- [x] 标签样式：圆角 10rpx，背景 `--brand-tint`，文字 `--brand-dark`，22rpx
- [x] 降级：信任分查询失败不显示标签（不阻断页面）

## 测试（7 层）
- [x] `tests/unit/trust-score.test.js` 全通过（38 项，5 tier 边界 + 防御 + round/floor 区分）
- [x] `tests/unit/player-trust-store.test.js` 全通过（37 项，正向 + 降级 + flagged + 缓存补齐）
- [x] `tests/unit/chat-store.test.js` 全通过（53 项，轮询 + 去重 + 降级 + 乐观更新 + filterAfter 边界）
- [x] `tests/unit/player-matcher.test.js` 全量回归（49 项）+ 新增 trust 测试通过
- [x] `tests/gherkin/c-p4-social.feature` BDD 场景全通过（聊天/评价/信任标签/举报/匹配优先级）
- [x] Property Fuzz：`tests/property/chat-trust-property.test.js` 任意输入不崩
- [x] Adversarial：`tests/adversarial/chat-trust-attack.test.js` content 注入 / rating 越界 / 自评 / 非成员评价全拦截
- [x] Mutation：新增 25 个 C-P4 变异算子（TS1~TS8 + PT1~PT8 + CS1~CS9），mutation score **100%**（25/25 killed）
- [x] Coverage：trust-score 函数 100%/行 96.3% ✓ | player-trust-store 函数 100%/行 76.1% ✓ | chat-store 函数 100%/行 79.8% ✓
- [x] `tests/qa/check.js` 新增 C-P4 契约检查全通过（8a~8h 节，80+ 项）
- [x] 现有 C-P3 / C-01~C-19 全量回归无破坏

## 路由与包体
- [x] `app.json` 无需新增页面路由（room/hall/detail 已存在，仅改造）
- [x] 新增云函数目录 5 个（sendMessage/fetchMessages/submitPlayerReview/getPlayerTrust/reportPlayer）
- [x] 新增资源增量 = 0（无新图片/字体/音频，复用现有 SVG/avatar.webp + emoji）
- [x] 新增纯 JS 代码增量 < 15KB
- [x] 主包增量可控，远低于 1.5MB 红线

## 降级与容错
- [x] cloudReady=false：聊天只存本地，评价存本地，匹配用默认信任分
- [x] 云函数超时（>4s）：聊天显示"发送中..."可重试，评价静默失败 toast 提示
- [x] 轮询失败：静默重试，不影响 room 主流程
- [x] 评价冲突（重复/非成员/未完成）：返回 errCode，toast 提示具体原因
- [x] 信任分查询失败：用默认 newbie，不阻断匹配
- [x] 网络断开：聊天走本地缓存，评价走本地缓存，匹配正常
