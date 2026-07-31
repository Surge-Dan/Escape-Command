# tests/gherkin/breakthrough-flow.feature
# 破圈骰子 BDD 场景
# 覆盖：摇骰子 → 画像匹配 → 深夜过滤 → 已完成过滤 → 兜底回退 → 完成记录 → 证书页

Feature: 破圈骰子
  作为想要突破舒适区的用户
  我希望摇出"做一件平时不会做的事"的指令
  以便在心理屏障上迈出一步

  Background:
    Given 破圈指令池已初始化 100 条指令

  Scenario: 白天无画像摇骰子
    Given 当前时段为白天
    And 用户画像为空
    When 用户点击破圈骰子
    Then 应返回一条 breakthrough 类型指令
    And 该指令应在 bt001 到 bt100 范围内

  Scenario: 深夜只摇出 nightSafe 指令
    Given 当前时段为深夜
    And 用户画像为空
    When 用户点击破圈骰子
    Then 应返回一条 nightSafe=true 的指令
    And 该指令应在 bt001 到 bt100 范围内

  Scenario: 已完成的指令不再摇出
    Given 用户已完成指令 bt001 和 bt002
    And 当前时段为白天
    When 用户点击破圈骰子 50 次
    Then 每次返回的指令都不在已完成列表中

  Scenario: 画像匹配 avoidTypes 时排除对应指令
    Given 用户画像包含 social:extrovert
    When 用户点击破圈骰子 100 次
    Then 返回的指令 avoidTypes 都不包含 social:extrovert

  Scenario: 画像匹配 recommendTypes 时优先推荐
    Given 用户画像包含 social:introvert
    When 用户点击破圈骰子 30 次
    Then 返回的指令 recommendTypes 都包含 social:introvert

  Scenario: 所有指令已完成时回退全池
    Given 用户已完成全部 100 条破圈指令
    When 用户点击破圈骰子
    Then 应回退全池返回一条 breakthrough 类型指令
    And 不应返回 undefined

  Scenario: 今日破圈次数耗尽时拒绝摇骰
    Given 今日破圈剩余次数为 0
    When 用户点击破圈骰子
    Then 应提示"今日破圈次数已用完"
    And 不应消耗任何指令

  Scenario: 摇骰后剩余次数减 1
    Given 今日破圈剩余次数为 5
    When 用户点击破圈骰子
    Then 今日破圈剩余次数应为 4

  Scenario: 破圈完成后生成 breakthrough 记录
    Given 用户完成了一条破圈指令 bt001
    When 记录入库
    Then 记录的 commandType 应为 breakthrough
    And 记录应包含 4 步 steps

  Scenario: 证书页读取最近一条破圈记录
    Given 用户已完成 3 条破圈指令
    And 用户又完成了一条普通出逃指令
    When 用户进入破圈证书页
    Then 证书页应显示破圈总数 3
    And 证书页应读取最后一条破圈记录作为当前指令
    And 不应误读普通出逃记录作为破圈数据
