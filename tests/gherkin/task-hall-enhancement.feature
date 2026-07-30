Feature: 任务大厅增强与真实玩家联动（D3 自定义分类 / D4 模板扩充 / D5 真实玩家联动）

  背景：
  D3 自定义分类允许用户创建 1-6 字的自定义主题分类，作为任务卡片标签展示。
  D4 官方任务模板扩充至 45 条，覆盖广州 11 区 × 10 类主题。
  D5 摇骰子找搭子支持混合模式：优先匹配云端真实玩家，不足时用本地 mock 用户兜底。
  D5 云端降级路径通过 shouldFallback + mergeAndPick 纯函数组合验证（与 matchPlayersAsync 内部逻辑同源）。

  # ===== D3: 自定义分类 =====

  @d3 @custom-category
  Scenario: 创建自定义分类任务成功
    Given 任务大厅已初始化出逃大师任务模板
    When 用户创建自定义分类任务"骑行"主题"周末骑行打卡"
    Then 任务创建成功
    And 任务出现在大厅列表
    And 任务卡片分类显示为"骑行"

  @d3 @custom-category
  Scenario: 自定义分类超过 6 字被拒绝
    Given 任务大厅已初始化出逃大师任务模板
    When 用户创建自定义分类任务"超过六个字的自定义分类"主题"测试"
    Then 创建失败
    And 返回错误码 INVALID_PARAM

  @d3 @custom-category
  Scenario: 自定义分类为空被拒绝
    Given 任务大厅已初始化出逃大师任务模板
    When 用户创建自定义分类任务""主题"测试"
    Then 创建失败
    And 返回错误码 INVALID_PARAM

  @d3 @custom-category
  Scenario: 自定义分类仅含空格被拒绝
    Given 任务大厅已初始化出逃大师任务模板
    When 用户创建自定义分类任务"   "主题"测试"
    Then 创建失败
    And 返回错误码 INVALID_PARAM

  @d3 @custom-category
  Scenario: 自定义分类恰好 6 字成功
    Given 任务大厅已初始化出逃大师任务模板
    When 用户创建自定义分类任务"户外摄影漫游"主题"周末活动"
    Then 任务创建成功
    And 任务卡片分类显示为"户外摄影漫游"

  @d3 @custom-category
  Scenario: 非自定义分类时 customCategory 字段被忽略
    Given 任务大厅已初始化出逃大师任务模板
    When 用户创建标准分类任务"art"主题"美术馆看展"
    Then 任务创建成功
    And 任务卡片分类显示为"看展"

  # ===== D4: 45 条模板覆盖性 =====

  @d4 @template-coverage
  Scenario: 官方任务模板共 45 条
    Given 出逃大师模板库已加载
    Then 模板总数为 45

  @d4 @template-coverage
  Scenario: 模板覆盖全部 11 个区
    Given 出逃大师模板库已加载
    Then 模板覆盖全部 11 个行政区

  @d4 @template-coverage
  Scenario: 模板覆盖全部 10 类主题
    Given 出逃大师模板库已加载
    Then 模板覆盖全部 10 类主题

  @d4 @template-coverage
  Scenario: 每条模板的 poiId 都存在于 POI 库
    Given 出逃大师模板库已加载
    Then 每个模板的 poiId 在广州 POI 库中存在

  @d4 @template-coverage
  Scenario: 模板的 templateId 无重复
    Given 出逃大师模板库已加载
    Then 模板的 templateId 无重复

  @d4 @template-coverage
  Scenario: 模板覆盖新增的 5 个区
    Given 出逃大师模板库已加载
    Then 模板覆盖黄埔区、花都区、从化区、增城区、南沙区

  # ===== D5: 真实玩家联动（纯函数契约）=====

  @d5 @real-player
  Scenario: 真实玩家档案标准化
    Given 一个云端真实玩家档案
    When 调用 normalizePlayer 标准化
    Then 标准化后的玩家 isReal 为 true
    And 标准化后的玩家含 openId 和 nickname
    And 标准化后的玩家 interests 为数组

  @d5 @real-player
  Scenario: mock 玩家档案标准化
    Given 一个 mock 玩家档案
    When 调用 normalizePlayer 标准化
    Then 标准化后的玩家 isReal 为 false

  @d5 @real-player
  Scenario: 真实玩家和 mock 玩家按相关性排序
    Given 3 个真实玩家和 2 个 mock 玩家
    When 按区域和兴趣相关性排序
    Then 同区且兴趣命中的玩家排最前
    And 排序不修改原数组

  @d5 @real-player
  Scenario: 真实玩家优先 mock 补齐
    Given 2 个真实玩家和 3 个 mock 玩家
    When 合并并选取 3 个搭子
    Then 返回 3 个搭子
    And 真实玩家排在前面
    And mock 玩家用于补齐

  @d5 @real-player
  Scenario: 真实和 mock 有相同 openId 时去重
    Given 1 个真实玩家 openId "dup_01"和 1 个 mock 玩家 openId "dup_01"
    When 合并并选取 2 个搭子
    Then 返回的搭子中 openId "dup_01" 只出现一次

  @d5 @real-player
  Scenario: 云端不可用时 shouldFallback 返回 true
    Given 云端返回 null
    When 调用 shouldFallback 判断
    Then shouldFallback 返回 true

  @d5 @real-player
  Scenario: 云端返回 ok=false 时 shouldFallback 返回 true
    Given 云端返回 ok=false
    When 调用 shouldFallback 判断
    Then shouldFallback 返回 true

  @d5 @real-player
  Scenario: 云端返回空 players 数组时 shouldFallback 返回 true
    Given 云端返回空 players 数组
    When 调用 shouldFallback 判断
    Then shouldFallback 返回 true

  @d5 @real-player
  Scenario: 云端返回有效 players 时 shouldFallback 返回 false
    Given 云端返回 2 个有效玩家
    When 调用 shouldFallback 判断
    Then shouldFallback 返回 false

  @d5 @real-player
  Scenario: 云端降级时全部用 mock 玩家补齐
    Given 云端降级且 mock 用户池有 4 人
    When 合并并选取 3 个搭子（云端降级）
    Then 返回 3 个搭子
    And 所有搭子标记为非真人

  @d5 @real-player
  Scenario: 云端返回 2 个真实玩家时混合补齐
    Given 云端返回 2 个有效玩家
    And mock 用户池有 4 人
    When 合并并选取 3 个搭子（混合模式）
    Then 返回 3 个搭子
    And 搭子中含真实玩家
    And 搭子中含 mock 玩家

  # ===== D5: diceMatchWithPartners 集成 =====

  @d5 @dice-integration
  Scenario: 预匹配搭子超过任务容量时截断
    Given 任务大厅有 1 个未满员任务和 mock 用户池有 8 人
    And 预匹配搭子 4 人
    When 用户点击"摇骰子找搭子"使用预匹配搭子
    Then 匹配结果 ok 为 true
    And 实际加入任务的搭子数不超过任务剩余容量

  @d5 @dice-integration
  Scenario: 预匹配搭子排除已是成员的用户
    Given 预匹配搭子包含已是该任务成员的用户
    When 用户点击"摇骰子找搭子"使用预匹配搭子
    Then 匹配结果 ok 为 true
    And 加入的搭子中不含已是成员的用户

  @d5 @dice-integration
  Scenario: 摇骰子匹配后任务满员自动转 ready
    Given 摇骰子匹配使任务达到人数上限
    Then 任务状态变为 ready
    And 系统自动创建 group room 并关联 roomId
