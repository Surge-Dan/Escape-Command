# tests/gherkin/group-flow.feature
# 同频组局完整流程 BDD 场景
# 覆盖 C-01 到 C-08

Feature: 同频组局完整流程
  作为发起人
  我想要创建房间、邀请朋友、投票、生成剧本
  以便完成一次同频出逃

  # ===== C-01: 创建房间 =====
  Scenario: 发起人创建房间
    Given 发起人填写主题 "周末探店" 和人数 4
    When 发起人点击创建组局
    Then 房间创建成功
    And 房间号是 6 位字母数字
    And 房间状态为 "waiting_members"
    And 房间内有 1 个成员
    And 该成员是发起人

  Scenario: 主题为空不能创建
    Given 发起人填写主题 "" 和人数 4
    When 发起人点击创建组局
    Then 房间创建失败
    And 错误码为 "INVALID_PARAM"

  Scenario: 人数超出范围不能创建
    Given 发起人填写主题 "测试" 和人数 2
    When 发起人点击创建组局
    Then 房间创建失败
    And 错误码为 "INVALID_PARAM"

  # ===== C-01: 取消房间 =====
  Scenario: 发起人取消组局
    Given 已存在一个房间 "周末探店" 4人
    When 发起人取消该房间
    Then 房间取消成功
    And 房间状态为 "cancelled"

  Scenario: 重复取消组局
    Given 已存在一个已取消的房间
    When 发起人再次取消
    Then 房间取消失败
    And 错误码为 "ALREADY_CANCELLED"

  # ===== C-03: 成员加入 =====
  Scenario: 模拟成员加入
    Given 已存在一个房间 "周末探店" 4人
    When 添加 1 个模拟成员
    Then 房间内有 2 个成员
    And 新成员不是发起人
    And 新成员有偏好数据
    And 新成员有投票数据

  Scenario: 一键填满成员
    Given 已存在一个房间 "周末探店" 3人
    When 一键填满模拟成员
    Then 房间内有 3 个成员
    And 所有成员位已填满

  Scenario: 满员后不能继续添加
    Given 已存在一个已填满的房间 3人
    When 添加 1 个模拟成员
    Then 添加失败
    And 错误码为 "ROOM_FULL"

  # ===== C-04: 匿名偏好 =====
  Scenario: 提交匿名偏好
    Given 已存在一个房间 "测试" 4人
    When 发起人提交偏好 兴趣 "food,photo" 强度 "medium"
    Then 偏好提交成功
    And 发起人的偏好已记录

  Scenario: 空兴趣不能提交偏好
    Given 已存在一个房间 "测试" 4人
    When 发起人提交偏好 兴趣 "" 强度 "medium"
    Then 偏好提交失败

  # ===== C-05/06/07: 投票 =====
  Scenario: 发起人投出三票
    Given 已存在一个房间 "测试" 4人
    When 发起人投票 时间 "afternoon"
    And 发起人投票 预算 "medium"
    And 发起人投票 风格 "relax"
    Then 发起人的三票已记录
    And 投票统计显示 1 人已投票

  Scenario: 所有人投票完成后可生成剧本
    Given 已存在一个填满的房间 3人
    When 所有成员完成投票
    Then 投票统计显示 allVoted 为 true
    And 投票统计显示 3 人已投票

  # ===== C-08: 剧本生成 =====
  Scenario: 生成多人剧本
    Given 已存在一个所有人已投票的房间 3人
    When 发起人点击生成剧本
    Then 剧本生成成功
    And 剧本有标题
    And 剧本有至少 3 个步骤
    And 剧本包含所有成员名
    And 房间状态为 "finished"

  Scenario: 取消的房间不能生成剧本
    Given 已存在一个已取消的房间
    When 发起人点击生成剧本
    Then 剧本生成失败
    And 错误码为 "ROOM_CANCELLED"

  # ===== 完整流程 =====
  Scenario: 完整流程：创建到生成
    Given 发起人填写主题 "周末出逃" 和人数 4
    When 发起人点击创建组局
    And 一键填满模拟成员
    And 发起人提交偏好 兴趣 "food,photo" 强度 "medium"
    And 发起人投票 时间 "afternoon"
    And 发起人投票 预算 "medium"
    And 发起人投票 风格 "social"
    And 所有成员完成投票
    And 发起人点击生成剧本
    Then 剧本生成成功
    And 剧本包含 4 个成员名
    And 房间状态为 "finished"
