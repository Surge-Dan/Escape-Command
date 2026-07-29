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

  # ===== 完成流出逃记录数据联动（修复「去看看」跳转 + 地图无记录）=====
  # 验证同频出逃完成后：记录写入 records、结构对齐、location 可被地图消费、跳转地图页
  Scenario: 同频出逃完成后生成记录并写入 records
    Given 已存在一个所有人已投票的房间 3人
    When 发起人点击生成剧本
    And 全部步骤标记完成
    And 同频出逃调用 buildRecord 生成记录
    Then 记录写入 records 列表
    And 记录的 isGroup 为 true
    And 记录的 groupId 等于房间号
    And 记录包含剧本成员
    And 记录包含步骤文本
    And 记录的 commandType 为 "sync"
    And 记录的 duration 大于等于 1

  Scenario: 同频记录的 location 可被地图页消费
    Given 已存在一个所有人已投票的房间 3人
    And 当前定位为 "人民广场" 经纬度 31.23 121.47
    When 发起人点击生成剧本
    And 同频出逃调用 buildRecord 生成记录
    Then 记录的 location 含 latitude 和 longitude
    And 记录的 location 名称为 "人民广场"

  Scenario: 普通出逃与同频出逃记录结构对齐
    Given 一条普通出逃记录和一条同频出逃记录
    Then 两条记录共享相同的基础字段
    And 同频记录额外包含 isGroup/groupId/members/steps

  Scenario: 同频出逃完成后跳 record 拍照打卡页
    Given 同频出逃已完成全部步骤
    Then 完成后跳转 record 拍照打卡页
    And 完成流程不直接调用 completeCommand
    And record 页去地图按钮跳转地图页
    And 跳转目标不是个人页

  # ===== C-09: 到齐确认 =====
  Scenario: 发起人确认到齐 WAITING → READY
    Given 已存在一个房间 "到齐" 4人
    When 添加 1 个模拟成员
    And 发起人确认到齐
    Then 房间状态为 "ready"

  Scenario: 成员不足 2 人不能确认到齐
    Given 已存在一个房间 "人少" 4人
    When 发起人确认到齐
    Then 确认到齐失败
    And 错误码为 "NOT_ENOUGH_MEMBERS"

  Scenario: READY 后可开始投票
    Given 已存在一个房间 "到齐" 4人
    When 添加 1 个模拟成员
    And 发起人确认到齐
    And 发起人开始投票
    Then 房间状态为 "voting"

  # ===== C-10: 临时退出 =====
  Scenario: 房主退出房间则局散
    Given 已存在一个房间 "房主退" 4人
    When 添加 1 个模拟成员
    And 发起人退出房间
    Then 房间状态为 "cancelled"
    And 退出返回 hostLeft 为 true

  Scenario: 已生成剧本的房间不能退出
    Given 已存在一个所有人已投票的房间 3人
    When 发起人点击生成剧本
    And 发起人退出房间
    Then 退出失败
    And 错误码为 "INVALID_STATUS"

  # ===== C-11: 人数不足兜底 =====
  Scenario: 人数不足建议取消
    Given 已存在一个房间 "兜底" 4人
    When 检查人数兜底
    Then 兜底建议为 "cancel"
    And 人数不足 enough 为 false

  Scenario: 2 人小队模式
    Given 已存在一个房间 "小队" 4人
    When 添加 1 个模拟成员
    And 检查人数兜底
    Then 兜底建议为 "small_team"

  # ===== C-12: 共同记录摘要 =====
  Scenario: 同频记录摘要含成员与步骤留痕
    Given 一条已完成的同频记录
    When 提取共同记录摘要
    Then 摘要含成员列表
    And 摘要含步骤留痕
    And 摘要的 isGroup 为 true

  # ===== C-13: 共同城市底片 =====
  Scenario: 同频记录按 groupId 聚合为聚合 marker
    Given 多条同频记录属于同一组
    When 构建聚合 marker
    Then 聚合后只有 1 个 marker
    And 聚合 marker 含成员数

  Scenario: 同位置普通记录被聚合 marker 覆盖
    Given 一条普通记录和一条同频记录位置相同
    When 合并 marker
    Then 普通记录被覆盖
    And 合并后只有 1 个 marker
