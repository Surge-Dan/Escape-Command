# tests/gherkin/map-enhancement.feature
# B4-B 地图深化 BDD 场景
# 覆盖：类型筛选、情绪筛选、组合筛选、重返旧地点、城市关系总结

Feature: 地图深化
  作为出逃者
  我希望在地图页按类型/情绪筛选记录，并能重返旧地点
  以便回顾特定类型的出逃并基于旧地点生成新任务

  # ===== 类型筛选 =====
  Scenario: 筛选微逃类型记录
    Given 地图记录池含微逃 2 条 破圈 1 条 同频 1 条
    When 筛选类型为 micro
    Then 筛选结果为 2 条

  Scenario: 筛选破圈类型记录
    Given 地图记录池含微逃 2 条 破圈 1 条 同频 1 条
    When 筛选类型为 breakthrough
    Then 筛选结果为 1 条

  Scenario: 筛选同频类型记录
    Given 地图记录池含微逃 2 条 破圈 1 条 同频 1 条
    When 筛选类型为 sync
    Then 筛选结果为 1 条

  Scenario: 筛选全部类型返回所有记录
    Given 地图记录池含微逃 2 条 破圈 1 条 同频 1 条
    When 筛选类型为 all
    Then 筛选结果为 4 条

  # ===== 情绪筛选 =====
  Scenario: 筛选开心情绪记录
    Given 地图记录池含开心 3 条 平静 2 条
    When 筛选情绪为 happy
    Then 筛选结果为 3 条

  Scenario: 筛选平静情绪记录
    Given 地图记录池含开心 3 条 平静 2 条
    When 筛选情绪为 calm
    Then 筛选结果为 2 条

  Scenario: 筛选未出现的情绪返回空
    Given 地图记录池含开心 3 条 平静 2 条
    When 筛选情绪为 surprise
    Then 筛选结果为 0 条

  # ===== 组合筛选 =====
  Scenario: 类型+情绪组合筛选
    Given 地图记录池含微逃开心 2 条 微逃平静 1 条 破圈开心 1 条
    When 筛选类型为 micro
    And 筛选情绪为 happy
    Then 筛选结果为 2 条

  # ===== 情绪选项动态构建 =====
  Scenario: 从记录动态提取情绪选项
    Given 地图记录池含开心 3 条 平静 2 条 惊喜 1 条
    When 调用构建情绪选项
    Then 情绪选项数量为 4
    And 情绪选项首项为全部

  Scenario: 无情绪记录只有全部选项
    Given 地图记录池无情绪字段
    When 调用构建情绪选项
    Then 情绪选项数量为 1

  # ===== 重返旧地点 =====
  Scenario: 有坐标的旧记录可重返
    Given 一条有坐标的旧出逃记录
    When 调用重返判定
    Then 可重返为 true

  Scenario: 无坐标的旧记录不可重返
    Given 一条无坐标的旧出逃记录
    When 调用重返判定
    Then 可重返为 false

  Scenario: 重返指令复用旧地点坐标
    Given 一条有坐标的旧出逃记录
    When 调用构建重返指令
    Then 重返指令地点与旧记录一致
    And 重返指令标记 revisit 为 true

  Scenario: 重返总结含旧记录日期
    Given 一条有坐标且日期为 2026-07-01 的旧出逃记录
    When 调用构建重返总结
    Then 总结标题含 7月1日

  # ===== 城市关系总结 =====
  Scenario: 有记录时生成月度总结
    Given 本月有 5 条出逃记录
    When 调用构建月度总结
    Then 总结记录数为 5
    And 总结文案非空

  Scenario: 本月无记录不生成总结
    Given 本月有 0 条出逃记录
    When 调用构建月度总结
    Then 总结为空

  # ===== 异常输入 =====
  Scenario: 空记录池筛选不崩溃
    Given 地图记录池为空
    When 筛选类型为 micro
    Then 筛选结果为 0 条

  Scenario: null 记录筛选不崩溃
    Given 地图记录池为 null
    When 筛选类型为 micro
    Then 筛选结果为 0 条
