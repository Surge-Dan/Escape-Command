# tests/gherkin/quick-match-flow.feature
# B3 同频骰子 AI 快速匹配 BDD 场景
# 覆盖：主题推断、搭子数推断、任务生成、搭子匹配、降级策略、换一换

Feature: 同频骰子 AI 快速匹配
  作为出逃者
  我希望点击同频骰子后由 AI 秒级匹配任务/搭子/主题
  以便跳过繁琐的房间-邀请-投票流程，直接开始出逃

  # ===== 主题推断 =====
  Scenario: 偏好好 walk 推断为探索主题
    Given 用户偏好类型计数为 walk=5 color=2
    When 调用 inferThemeFromPrefs
    Then 主题为 adventure

  Scenario: 偏好好 color 推断为放松主题
    Given 用户偏好类型计数为 color=5 walk=1
    When 调用 inferThemeFromPrefs
    Then 主题为 relax

  Scenario: 空偏好兜底社交主题
    Given 用户偏好为空
    When 调用 inferThemeFromPrefs
    Then 主题为 social

  Scenario: 偏好全部为 breakthrough 兜底社交主题
    Given 用户偏好类型计数为 breakthrough=10
    When 调用 inferThemeFromPrefs
    Then 主题为 social

  # ===== 搭子数推断 =====
  Scenario: 15 分钟出逃匹配 1 位搭子
    When 调用 pickPartnerCount 时长 15 分钟
    Then 搭子数为 1

  Scenario: 60 分钟出逃匹配 2 位搭子
    When 调用 pickPartnerCount 时长 60 分钟
    Then 搭子数为 2

  Scenario: 120 分钟出逃匹配 3 位搭子
    When 调用 pickPartnerCount 时长 120 分钟
    Then 搭子数为 3

  Scenario: 非法时长兜底 30 分钟匹配 2 位搭子
    When 调用 pickPartnerCount 时长 -1 分钟
    Then 搭子数为 2

  # ===== 兴趣推断 =====
  Scenario: 从偏好推断 top3 兴趣
    Given 用户偏好类型计数为 walk=5 color=3 food=2 sense=1
    When 调用 inferInterestsFromPrefs
    Then 兴趣数量为 3
    And 兴趣列表包含 nature
    And 兴趣列表包含 photo
    And 兴趣列表包含 food

  Scenario: 多 type 映射同兴趣时去重
    Given 用户偏好类型计数为 walk=5 sense=3
    When 调用 inferInterestsFromPrefs
    Then 兴趣数量为 1
    And 兴趣列表包含 nature

  # ===== 快速匹配主流程 =====
  Scenario: 无 matcherCtx 也能返回任务
    Given 用户偏好类型计数为 walk=5
    And 指令池含 5 条任务
    When 调用 executeQuickMatch 时长 60 分钟
    Then 匹配结果为成功
    And 匹配结果有任务
    And 搭子数量为 0
    And 期望搭子数为 2

  Scenario: 空 commandPool 走 fallback 仍返回任务
    Given 用户偏好类型计数为 walk=5
    And 指令池为空
    When 调用 executeQuickMatch 时长 60 分钟
    Then 匹配结果为成功
    And 匹配结果有任务

  Scenario: 15 分钟任务期望搭子数为 1
    Given 用户偏好类型计数为 color=3
    And 指令池含 5 条任务
    When 调用 executeQuickMatch 时长 15 分钟
    Then 匹配结果为成功
    And 期望搭子数为 1
    And 主题为 relax

  # ===== 不变量 =====
  Scenario: 匹配结果主题必为 relax adventure social 之一
    Given 用户偏好类型计数为 walk=5
    And 指令池含 5 条任务
    When 调用 executeQuickMatch 时长 60 分钟
    Then 匹配结果为成功
    And 主题为有效值

  Scenario: 匹配结果 partnerCount 等于 partners 长度
    Given 用户偏好类型计数为 walk=5
    And 指令池含 5 条任务
    When 调用 executeQuickMatch 时长 60 分钟
    Then 匹配结果为成功
    And 搭子数量等于搭子数组长度

  Scenario: 50 次随机偏好匹配都不抛异常
    When 调用 50 次随机 executeQuickMatch
    Then 全部返回有效结果
