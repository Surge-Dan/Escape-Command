# tests/gherkin/badge-growth.feature
# B4 激励体系 · 徽章成长 BDD 场景
# 覆盖：阶段记录徽章、城市方向徽章、增量检测幂等性、进度计算

Feature: 徽章成长体系
  作为出逃者
  我希望随着出逃次数和探索方向积累，解锁相应徽章
  以便获得阶段成就感并激励持续探索

  # ===== 阶段记录徽章 =====
  Scenario: 完成 1 次出逃解锁「初次出逃」
    Given 已有 1 条出逃记录且无已解锁徽章
    When 调用徽章解锁检测
    Then 新解锁徽章包含 first_escape

  Scenario: 完成 10 次出逃解锁「初探者」
    Given 已有 10 条出逃记录且已解锁 first_escape
    When 调用徽章解锁检测
    Then 新解锁徽章包含 stage_explorer

  Scenario: 完成 30 次出逃解锁「熟路人」
    Given 已有 30 条出逃记录且已解锁 first_escape 和 stage_explorer
    When 调用徽章解锁检测
    Then 新解锁徽章包含 stage_familiar

  Scenario: 完成 50 次出逃解锁「城市侦探」阶段徽章
    Given 已有 50 条出逃记录且已解锁 first_escape 和 stage_explorer 和 stage_familiar
    When 调用徽章解锁检测
    Then 新解锁徽章包含 stage_detective

  Scenario: 完成 100 次出逃解锁「城市专家」
    Given 已有 100 条出逃记录且已解锁 first_escape 和 stage_explorer 和 stage_familiar 和 stage_detective
    When 调用徽章解锁检测
    Then 新解锁徽章包含 stage_expert

  # ===== 增量检测幂等性 =====
  Scenario: 已解锁徽章不重复解锁
    Given 已有 10 条出逃记录且已解锁 first_escape 和 stage_explorer
    When 调用徽章解锁检测
    Then 新解锁徽章不包含 stage_explorer

  Scenario: 已解锁全部阶段徽章后无新增
    Given 已有 100 条出逃记录且已解锁 first_escape 和 stage_explorer 和 stage_familiar 和 stage_detective 和 stage_expert
    When 调用徽章解锁检测
    Then 新解锁徽章不包含 stage_expert

  # ===== 城市方向徽章 =====
  Scenario: 城市北侧 3 次出逃解锁「北游」
    Given 城市北侧有 3 条出逃记录
    When 调用徽章解锁检测
    Then 新解锁徽章包含 direction_north

  Scenario: 城市东侧 3 次出逃解锁「东征」
    Given 城市东侧有 3 条出逃记录
    When 调用徽章解锁检测
    Then 新解锁徽章包含 direction_east

  Scenario: 不足 3 次不解锁方向徽章
    Given 城市南侧有 2 条出逃记录
    When 调用徽章解锁检测
    Then 新解锁徽章不包含 direction_south

  # ===== 阶段进度计算 =====
  Scenario: 5 次出逃后下一阶段为初探者还需 5 次
    Given 已有 5 条出逃记录
    When 调用阶段进度计算
    Then 下一阶段徽章为 stage_explorer
    And 下一阶段目标为 10 次
    And 距离解锁还需 5 次

  Scenario: 100 次出逃后无下一阶段
    Given 已有 100 条出逃记录
    When 调用阶段进度计算
    Then 无下一阶段徽章

  # ===== 方向进度计算 =====
  Scenario: 方向进度包含已解锁与待解锁方向
    Given 城市北侧有 3 条出逃记录且已解锁 direction_north
    When 调用方向进度计算
    Then 已解锁方向包含 north
    And 待解锁方向列表非空

  # ===== 异常输入 =====
  Scenario: 空记录仅解锁首次出逃徽章
    Given 已有 0 条出逃记录且无已解锁徽章
    When 调用徽章解锁检测
    Then 新解锁徽章数量为 0

  Scenario: 篡改记录无效字段不影响方向判定
    Given 城市北侧有 3 条出逃记录但其中 1 条坐标被篡改为非法值
    When 调用徽章解锁检测
    Then 新解锁徽章不包含 direction_north
