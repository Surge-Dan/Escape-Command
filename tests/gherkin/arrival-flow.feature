# tests/gherkin/arrival-flow.feature
# 到达确认与阶段感设计 BDD 场景（B2）
# 覆盖：到达判定、阶段切换、隐藏任务解锁、按钮显示条件、降级策略

Feature: 到达确认与阶段感设计
  作为出逃者
  我希望在到达目的地后解锁隐藏任务
  以便获得阶段感、仪式感，并避免一上来就被全部步骤压垮

  # ===== 到达判定（距离）=====
  Scenario: 用户在 100 米内判定到达
    Given 用户位置为纬度 39.9 经度 116.4
    And 目标位置为纬度 39.9 经度 116.4001
    When 调用 isArrived 阈值 100 米
    Then 到达结果为 true
    And 到达距离小于等于 100 米

  Scenario: 用户在 200 米外判定未到达
    Given 用户位置为纬度 39.9 经度 116.4
    And 目标位置为纬度 39.902 经度 116.4
    When 调用 isArrived 阈值 100 米
    Then 到达结果为 false
    And 到达距离大于 100 米

  Scenario: 用户在目标点正上方判定到达
    Given 用户位置为纬度 39.9 经度 116.4
    And 目标位置为纬度 39.9 经度 116.4
    When 调用 isArrived 阈值 100 米
    Then 到达结果为 true
    And 到达距离为 0 米

  Scenario: 缺失目标位置时降级为手动确认
    Given 目标位置缺失
    When 调用 isArrived 阈值 100 米
    Then 到达结果为 false
    And 到达距离为 -1 米

  Scenario: 缺失用户位置时降级为手动确认
    Given 用户位置缺失
    And 目标位置为纬度 39.9 经度 116.4
    When 调用 isArrived 阈值 100 米
    Then 到达结果为 false
    And 到达距离为 -1 米

  Scenario: 阈值为 0 时使用默认阈值 100 米
    Given 用户位置为纬度 39.9 经度 116.4
    And 目标位置为纬度 39.9 经度 116.4
    When 调用 isArrived 阈值 0 米
    Then 到达结果为 true

  Scenario: 阈值为负数时使用默认阈值 100 米
    Given 用户位置为纬度 39.9 经度 116.4
    And 目标位置为纬度 39.9 经度 116.4
    When 调用 isArrived 阈值 -100 米
    Then 到达结果为 true

  # ===== 阶段切换（出发前 / 到达后）=====
  Scenario: 出发前仅展示非隐藏步骤
    Given 步骤列表含 4 步其中第 3 4 步为隐藏
    When 构建阶段视图 arrived 为 false
    Then 阶段为 before
    And 展示步骤数为 2
    And 隐藏步骤数为 2

  Scenario: 到达后展示全部步骤
    Given 步骤列表含 4 步其中第 3 4 步为隐藏
    When 构建阶段视图 arrived 为 true
    Then 阶段为 after
    And 展示步骤数为 4
    And 隐藏步骤数为 0

  Scenario: 破圈模式无隐藏步骤时阶段仍正确
    Given 步骤列表含 4 步无隐藏
    When 构建阶段视图 arrived 为 false
    Then 阶段为 before
    And 展示步骤数为 4
    And 隐藏步骤数为 0

  Scenario: 空步骤列表阶段为 before
    Given 步骤列表为空
    When 构建阶段视图 arrived 为 false
    Then 阶段为 before
    And 展示步骤数为 0
    And 隐藏步骤数为 0

  # ===== 隐藏任务解锁 =====
  Scenario: 用户点击到达后隐藏步骤被解锁
    Given 步骤列表含 4 步其中第 3 4 步为隐藏
    When 构建阶段视图 arrived 为 false
    Then 隐藏步骤数为 2
    When 构建阶段视图 arrived 为 true
    Then 隐藏步骤数为 0
    And 展示步骤数为 4

  Scenario: 全部隐藏步骤到达后解锁
    Given 步骤列表含 2 步全部隐藏
    When 构建阶段视图 arrived 为 false
    Then 展示步骤数为 0
    And 隐藏步骤数为 2
    When 构建阶段视图 arrived 为 true
    Then 展示步骤数为 2
    And 隐藏步骤数为 0

  # ===== 「我到了」按钮显示条件 =====
  Scenario: 未到达且有隐藏步骤时显示按钮
    Given 步骤列表含 4 步其中第 3 4 步为隐藏
    When 调用 shouldShowArriveBtn arrived 为 false
    Then 按钮显示为 true

  Scenario: 已到达时不显示按钮
    Given 步骤列表含 4 步其中第 3 4 步为隐藏
    When 调用 shouldShowArriveBtn arrived 为 true
    Then 按钮显示为 false

  Scenario: 无隐藏步骤时不显示按钮
    Given 步骤列表含 4 步无隐藏
    When 调用 shouldShowArriveBtn arrived 为 false
    Then 按钮显示为 false

  Scenario: 空步骤列表不显示按钮
    Given 步骤列表为空
    When 调用 shouldShowArriveBtn arrived 为 false
    Then 按钮显示为 false

  # ===== 不变量 =====
  Scenario: 到达后步骤数不少于出发前步骤数
    Given 步骤列表含 4 步其中第 3 4 步为隐藏
    When 构建阶段视图 arrived 为 false
    Then 展示步骤数为 2
    When 构建阶段视图 arrived 为 true
    Then 展示步骤数不少于 2

  Scenario: 步骤分组前后总数等于原长度
    Given 步骤列表含 4 步其中第 3 4 步为隐藏
    When 调用 splitSteps 分组
    Then 出发前步骤数为 2
    And 到达后步骤数为 2
    And 分组总数为 4
