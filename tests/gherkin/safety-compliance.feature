# tests/gherkin/safety-compliance.feature
# 安全合规 BDD 场景（B1）
# 覆盖：夜间安全过滤、内容安全检查、紧急联系信息完整性、距离限制

Feature: 安全合规
  作为出逃者
  我希望在夜间出逃时受到安全保护、上传内容经过安全检查
  以便在享受出逃乐趣的同时保障人身安全

  Scenario: 夜间户外非 nightSafe 指令被过滤
    Given 当前时间是 23 点
    And 指令池含一条户外非 nightSafe 指令 "c1"
    When 执行夜间安全过滤
    Then 过滤结果为空

  Scenario: 夜间 nightSafe 指令保留
    Given 当前时间是 23 点
    And 指令池含一条 nightSafe 户外指令 "c2"
    When 执行夜间安全过滤
    Then 过滤结果含 1 条指令

  Scenario: 夜间室内指令保留
    Given 当前时间是 23 点
    And 指令池含一条室内非 nightSafe 指令 "c3"
    When 执行夜间安全过滤
    Then 过滤结果含 1 条指令

  Scenario: 白天不执行夜间过滤
    Given 当前时间是 14 点
    And 指令池含一条户外非 nightSafe 指令 "c4"
    When 执行夜间安全过滤
    Then 过滤结果含 1 条指令

  Scenario: 夜间超距户外指令被过滤
    Given 当前时间是 23 点
    And 用户位置为纬度 39.9 经度 116.4
    And 指令池含一条户外指令 "c5" 位于纬度 39.95 经度 116.4
    When 执行夜间安全过滤 最大距离 1000 米
    Then 过滤结果为空

  Scenario: 夜间近距户外指令保留
    Given 当前时间是 23 点
    And 用户位置为纬度 39.9 经度 116.4
    And 指令池含一条户外指令 "c6" 位于纬度 39.9005 经度 116.4
    When 执行夜间安全过滤 最大距离 1000 米
    Then 过滤结果含 1 条指令

  Scenario: 敏感词内容被检测
    Given 一段文本 "这里有暴力和武器"
    When 执行内容安全检查
    Then 检查结果为不安全
    And 匹配敏感词数量大于等于 2

  Scenario: 正常内容通过安全检查
    Given 一段文本 "今天去公园散步拍照"
    When 执行内容安全检查
    Then 检查结果为安全

  Scenario: 紧急联系信息完整
    When 获取紧急联系信息
    Then 包含报警电话 110
    And 包含急救电话 120
    And 包含消防电话 119
    And 包含交通事故电话 122

  Scenario: 隐私说明包含定位用途
    When 生成隐私说明
    Then 说明包含定位用途
    And 说明包含数据存储
    And 说明包含用户权利
