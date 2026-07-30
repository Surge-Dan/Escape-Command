Feature: C-P4 社交增强（room 聊天 + 玩家信任系统）
  覆盖 utils/trust-score.js + utils/player-trust-store.js + utils/chat-store.js + player-matcher trust 权重

  # ===== 信任分计算（computeTrustScore）=====

  Scenario: 新玩家默认信任分（无评价）
    Given 玩家没有任何评价
    When 计算信任分
    Then 信任分为 score 5.0 且 count 0 且 tier newbie 且 label 新手

  Scenario: 金牌搭子评级（≥10 评价且平均 ≥4.8）
    Given 玩家收到 10 条评价平均 5 分
    When 计算信任分
    Then tier 为 gold 且 label 为 金牌搭子

  Scenario: 低信任分降级（≥3 评价且平均 <3.0）
    Given 玩家收到 3 条评价平均 2 分
    When 计算信任分
    Then tier 为 watch 且 label 为 待观察

  Scenario: 非法评价按满分 5 处理不拉低分数
    Given 玩家收到 2 条合法 5 分评价和 1 条非法评价
    When 计算信任分
    Then count 为 3 且 score 为 5.0

  Scenario: tierFromScore 与 computeTrustScore 分级一致
    Given 分数 4.8 评价数 12
    When 调用 tierFromScore
    Then tierFromScore 结果为 gold

  Scenario: getTierWeight 未知 tier 返回 normal 基准 1.0
    Given 未知 tier 为 unknownTier
    When 查询权重
    Then 权重为 1.0

  # ===== 玩家评价（player-trust-store）=====

  Scenario: 成功提交玩家评价
    Given 云端可用且目标玩家在 finished 房间内
    When 提交评价 rating 5
    Then 返回 ok true 且包含更新后的 trust

  Scenario: 防重复评价
    Given 云端返回 ALREADY_REVIEWED 错误
    When 提交评价 rating 4
    Then 返回 ok false 且 errCode 为 ALREADY_REVIEWED

  Scenario: 云端不可用时评价降级
    Given 评价场景云端不可用
    When 提交评价 rating 5
    Then 返回 ok false 且 errCode 为 CLOUD_OFFLINE 且 trust 为默认新手

  Scenario: buildReviewDoc 截断评论 100 字且 tags 上限 5
    Given 评价 comment 超长 200 字且 tags 含 8 个标签
    When 构造评价文档
    Then comment 截断为 100 字且 tags 仅保留 5 个

  # ===== 信任分批量查询（getTrustBatch）=====

  Scenario: 批量查询信任分去重 openId
    Given openIds 含 2 个重复项共 4 项
    When 批量查询信任分
    Then 仅查询 3 个唯一 openId

  Scenario: 批量查询截断到 20 个
    Given openIds 含 25 项
    When 批量查询信任分
    Then 仅查询前 20 个

  Scenario: 云端异常返回默认值不 reject
    Given 云端 callFunction 抛出异常
    When 批量查询信任分
    Then 返回每个 openId 的默认 newbie 值

  # ===== 举报玩家（reportPlayer）=====

  Scenario: 成功举报玩家
    Given 云端可用且被举报者 openId 有效
    When 提交举报理由 垃圾广告
    Then 返回 ok true

  Scenario: 举报缺少被举报者
    Given 被举报者 openId 为空
    When 提交举报
    Then 返回 ok false 且 errCode 为 INVALID_PARAM

  Scenario: 云端不可用举报降级
    Given 举报场景云端不可用
    When 提交举报
    Then 返回 ok false 且 errCode 为 CLOUD_OFFLINE

  # ===== room 内嵌聊天（chat-store）=====

  Scenario: 发送消息乐观更新
    Given room room_1 本地无消息
    When 发送消息内容 你好搭子
    Then 本地缓存出现真实消息且 status sent

  Scenario: 云端不可用发送消息降级为本地
    Given room r_off 云端不可用
    When 发送消息内容 测试消息
    Then 返回 ok true 且 source 为 local_only

  Scenario: 消息内容超长拒绝
    Given 消息内容 250 字
    When 发送消息
    Then 返回 ok false 且 errCode 为 INVALID_PARAM

  Scenario: 空消息拒绝
    Given 消息内容为空字符串
    When 发送消息
    Then 返回 ok false 且 errCode 为 INVALID_PARAM

  Scenario: 增量拉取新消息按 createdAt 过滤
    Given 本地已有 2 条消息 createdAt 100 和 200
    When 增量拉取 lastCreatedAt 150
    Then 仅返回 createdAt 大于 150 的消息

  Scenario: 消息去重合并保持时间升序
    Given 已有消息含 _id m1 createdAt 200
    When 新消息 _id m2 createdAt 100 到达
    Then 合并后顺序为 m2 然后 m1

  Scenario: 乐观消息被真实消息替换
    Given 本地有乐观消息 tempKey local_x
    When 真实消息携带 replaceKey local_x 到达
    Then 乐观消息被删除且真实消息保留

  Scenario: 轮询启动后停止不再回调
    Given 轮询已启动 room room_poll
    When 停止轮询
    Then 轮询状态 active 为 false

  # ===== 信任分影响匹配优先级（player-matcher）=====

  Scenario: 金牌搭子优先匹配
    Given 候选池有 1 个 gold 玩家和 1 个 normal 玩家 district 相同
    When 按 trust 权重排序
    Then gold 玩家排在前面

  Scenario: watch 玩家降级到队尾
    Given 候选池有 1 个 watch 玩家和 1 个 normal 玩家
    When 按 trust 权重排序
    Then normal 玩家排在前面且 watch 玩家在队尾
