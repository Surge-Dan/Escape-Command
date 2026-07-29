# tests/gherkin/execution-flow.feature
# 执行进度持久化与留痕 BDD 场景
# 覆盖：中途退出冷启动恢复、completedAt 留痕不可篡改、全完成判定、记录 steps 时间戳

Feature: 执行进度持久化留痕
  作为出逃者
  我希望中途退出后进度可恢复、每步完成时间可追溯
  以便全程留痕不丢失

  Scenario: 完成 2 步后进度正确
    Given 一个 4 步指令 "出门,拍照,记录,感受"
    When 完成第 1 步
    And 完成第 2 步
    Then 已完成 2 步
    And 当前步骤是第 3 步
    And 未全部完成
    And 第 1 步 completedAt 非空

  Scenario: 冷启动恢复进度
    Given 一个 4 步指令 "出门,拍照,记录,感受"
    And 已完成第 1 步和第 2 步
    When 冷启动恢复进度
    Then 第 1 步为已完成
    And 第 2 步为已完成
    And 第 3 步为未完成
    And 第 4 步为未完成
    And 已完成 2 步

  Scenario: 已完成步骤不覆盖 completedAt
    Given 一个 4 步指令 "出门,拍照,记录,感受"
    And 已完成第 1 步于时间戳 1000
    When 再次完成第 1 步于时间戳 2000
    Then 第 1 步 completedAt 仍为 1000

  Scenario: 全部完成后 isAllDone 为 true
    Given 一个 4 步指令 "出门,拍照,记录,感受"
    When 完成全部 4 步
    Then 已全部完成
    And 当前步骤指向最后一步

  Scenario: 完成出逃后记录含步骤时间戳
    Given 一个 4 步指令 "出门,拍照,记录,感受"
    And 已完成第 1 步和第 2 步
    When 生成出逃记录
    Then 记录的 steps 为对象数组
    And 第 1 步带 completedAt 时间戳
