# C-P4 社交增强 Spec

> 设计文档：`docs/superpowers/specs/2026-07-30-c-p4-social-design.md`（完整设计，363 行）
> change-id：`c-p4-social`
> 前置：C-P3 任务大厅 + D1-D5 增强（commit `7e76176`）

## Why

C-P3/D5 的玩家匹配已完成，但存在两个体验断点：
1. 搭子匹配后无法在 room 内沟通（集合地点、时间协调），只能靠外部微信沟通
2. 匹配没有质量信号——无法识别靠谱搭子，低质量玩家会反复被匹配到

本 Spec 通过 **room 内嵌聊天（轮询）+ 玩家信任系统（评价/举报/信任分影响匹配优先级）** 补齐社交闭环。

## What Changes

### 新增模块
- `utils/trust-score.js`：信任分纯函数计算（5 tier 分级）
- `utils/player-trust-store.js`：评价/信任数据层（云+本地降级）
- `utils/chat-store.js`：聊天数据层（轮询+缓存+降级）
- 5 个云函数：`sendMessage` / `fetchMessages` / `submitPlayerReview` / `getPlayerTrust` / `reportPlayer`
- 2 个云数据库集合：`messages` / `playerReviews` + `playerReports`

### 修改模块
- `utils/player-matcher.js`：`rankByRelevance` 加 trust 权重，`matchPlayersAsync` 预加载信任分
- `pages/group/room/room.*`：Tab 切换（成员/聊天/记录）+ 聊天区 UI + 评价弹窗
- `pages/group/hall/hall.*`：匹配结果搭子头像加信任标签
- `pages/group/hall/detail/detail.*`：成员列表加信任标签

### 不改动的模块（向后兼容）
- `utils/group-room-store.js`：C-19 房间级评价保留，玩家级评价是新独立系统
- `utils/task-hall-store.js`：大厅任务流程不变
- `data/*`：广州数据不变

## Impact

- 受影响 spec：C-P3（hall/detail 页面 UI 增强）、D5（player-matcher 改造）
- 受影响代码：`utils/player-matcher.js`、`pages/group/room/`、`pages/group/hall/`
- 回归风险：player-matcher 改造需全量回归 35 个单元测试 + D5 混合匹配逻辑
- 包体影响：新增纯 JS ~15KB，资源增量 0

## ADDED Requirements

### Requirement: room 内嵌实时聊天
系统 SHALL 在 room 页面提供 Tab 切换的聊天区，支持文字消息（≤200 字）+ 系统表情，通过 2.5s 轮询同步云端消息。

#### Scenario: 发送消息
- **WHEN** 用户在 room 聊天区输入文字并点击发送
- **THEN** 消息立即显示在气泡列表（乐观更新）
- **AND** 云函数 sendMessage 写入 messages 集合
- **AND** 失败时回滚并 toast 提示

#### Scenario: 拉取新消息
- **WHEN** 轮询触发（每 2.5s）
- **THEN** 调 fetchMessages 云函数按 lastCreatedAt 增量拉取
- **AND** 新消息追加到列表底部，按 _id 去重

#### Scenario: 任务结束关闭聊天
- **WHEN** room 状态变为 finished 或用户离开 room 页
- **THEN** 停止轮询，保存最后消息时间到本地

#### Scenario: 云端不可用降级
- **WHEN** cloudReady=false 或云函数超时
- **THEN** 消息只存本地，UI 不崩，显示已发送的消息

### Requirement: 玩家信任分计算
系统 SHALL 基于玩家收到的评价计算信任分，分为 5 个 tier（newbie/gold/reliable/normal/watch），影响匹配优先级。

#### Scenario: 新玩家默认信任分
- **WHEN** 玩家没有任何评价（count=0）
- **THEN** 信任分为 { score: 5.0, count: 0, label: '新手', tier: 'newbie' }

#### Scenario: 金牌搭子评级
- **WHEN** 玩家有 ≥10 条评价且平均 ≥4.8
- **THEN** tier='gold'，label='金牌搭子'，匹配权重 1.2

#### Scenario: 低信任分降级
- **WHEN** 玩家有 ≥3 条评价且平均 < 3.0
- **THEN** tier='watch'，label='待观察'，匹配时降级到队尾（不过滤）

### Requirement: 玩家评价
系统 SHALL 允许玩家在 room finished 后评价同 room 的其他成员（1-5 星 + 标签 + 评论），防重复。

#### Scenario: 成功评价
- **WHEN** room=finished，评价者与被评价者是同 room 成员，未重复评价
- **THEN** 写入 playerReviews 集合，返回更新后的 trust

#### Scenario: 防重复评价
- **WHEN** 同一 reviewer 对同一 target 在同一 room 再次评价
- **THEN** 返回 ALREADY_REVIEWED 错误

#### Scenario: 非 finished 拒绝
- **WHEN** room 状态非 finished 时尝试评价
- **THEN** 返回 ROOM_NOT_FINISHED 错误

#### Scenario: 防自评
- **WHEN** targetOpenId === reviewerOpenId
- **THEN** 返回 SELF_REVIEW_FORBIDDEN 错误

### Requirement: 信任分影响匹配优先级
系统 SHALL 在 player-matcher 的 rankByRelevance 中加入 trust tier 权重，高信任分玩家优先匹配。

#### Scenario: 金牌搭子优先匹配
- **GIVEN** 候选池有 1 个 gold 玩家和 1 个 normal 玩家，district/interests 相同
- **WHEN** matchPlayersAsync(count=1)
- **THEN** gold 玩家排在前面被优先匹配

#### Scenario: watch 玩家降级
- **GIVEN** 候选池有 1 个 watch 玩家和 1 个 normal 玩家
- **WHEN** matchPlayersAsync(count=1)
- **THEN** normal 玩家排在前面，watch 玩家降级到队尾

### Requirement: 举报玩家
系统 SHALL 允许玩家举报同 room 的其他成员，累计 3 次举报后标记 flagged（等同 watch tier）。

#### Scenario: 提交举报
- **WHEN** 玩家提交举报（targetOpenId, roomId, reason）
- **THEN** 写入 playerReports 集合
- **AND** 若累计达 3 次，标记 target flagged

#### Scenario: 防重复举报
- **WHEN** 同一 reporter 对同一 target 在同一 room 再次举报
- **THEN** 返回 ALREADY_REPORTED 错误

## MODIFIED Requirements

### Requirement: player-matcher 排序逻辑
`rankByRelevance` 函数在原 district/interests 优先级基础上，叠加 trust tier 权重（gold 1.2 / reliable 1.0 / normal 1.0 / newbie 0.8 / watch 0.3），watch tier 降级到队尾不过滤。

### Requirement: room 页面布局
room 页面剧本生成后，下方改为 Tab 切换（成员/聊天/记录），finished 后成员 Tab 下方显示「评价搭子」入口。

### Requirement: hall/detail 信任标签展示
hall.js 匹配结果弹窗和 detail.js 成员列表的搭子头像旁 SHALL 显示信任标签（金牌搭子/靠谱/新手/待观察）。
