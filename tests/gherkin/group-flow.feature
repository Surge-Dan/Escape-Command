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

  # ===== C-14: 角色分配 =====
  Scenario: 剧本生成后自动分配角色
    Given 已存在一个所有人已投票的房间 3人
    When 发起人点击生成剧本
    Then 房间自动分配角色
    And 角色数等于成员数 3
    And 每个角色都在角色库中

  Scenario: 重新分配角色覆盖旧角色
    Given 已存在一个已生成剧本的房间 3人 风格 "social"
    When 发起人重新分配角色
    Then 房间自动分配角色
    And 角色来自 "social" 角色库

  Scenario: 非法 style 用 relax 兜底分配角色
    Given 一个 3 人房间剧本风格被篡改为 "未知风格"
    When 发起人重新分配角色
    Then 房间自动分配角色
    And 角色来自 "relax" 角色库

  Scenario: 未生成剧本不能分配角色
    Given 已存在一个房间 "未完成角色" 4人
    When 发起人重新分配角色
    Then 角色分配失败
    And 错误码为 "INVALID_STATUS"

  # ===== C-15: 独立线索 =====
  Scenario: 剧本生成后自动生成独立线索
    Given 已存在一个所有人已投票的房间 3人
    When 发起人点击生成剧本
    Then 房间自动生成线索
    And 线索数等于成员数 3

  Scenario: 成员数超过 steps 数时线索轮询
    Given 一个 5 人房间剧本 steps 仅 2 步
    When 发起人重新生成线索
    Then 房间自动生成线索
    And 线索数等于成员数 5
    And 第 3 个成员的线索与第 1 个相同

  Scenario: steps 为空时每人自由发挥
    Given 一个 3 人房间剧本 steps 为空
    When 发起人重新生成线索
    Then 房间自动生成线索
    And 每人线索为 "自由发挥"

  Scenario: 未生成剧本不能生成线索
    Given 已存在一个房间 "未完成线索" 4人
    When 发起人重新生成线索
    Then 线索生成失败
    And 错误码为 "INVALID_STATUS"

  # ===== C-16: 公开组局 =====
  Scenario: 创建公开房间
    Given 发起人填写主题 "公开出逃" 和人数 4
    When 发起人点击创建公开组局
    Then 房间创建成功
    And 房间 visibility 为 "public"

  Scenario: 默认创建私密房间
    Given 发起人填写主题 "默认私密" 和人数 4
    When 发起人点击创建组局
    Then 房间创建成功
    And 房间 visibility 为 "private"

  Scenario: 公开列表只返回活跃公开房间
    Given 已存在 2 个公开房间和 1 个私密房间
    When 查询公开房间列表
    Then 返回 2 个房间
    And 所有房间 visibility 为 "public"
    And 列表按创建时间倒序

  Scenario: 已完成和已取消房间不进公开列表
    Given 已存在 1 个公开房间和 1 个已完成的公开房间和 1 个已取消的公开房间
    When 查询公开房间列表
    Then 返回 1 个房间

  # ===== C-17: 申请加入 =====
  Scenario: 陌生人申请加入公开房间
    Given 已存在一个公开房间 "公开1" 4人 当前用户非成员
    When 陌生人申请加入
    Then 申请成功
    And 返回 requestId
    And 房间的待审核申请数为 1

  Scenario: 重复申请加入失败
    Given 已存在一个公开房间 "公开1" 4人 当前用户非成员
    When 陌生人申请加入
    And 陌生人再次申请加入
    Then 申请失败
    And 错误码为 "ALREADY_REQUESTED"

  Scenario: 私密房间不能申请
    Given 已存在一个私密房间 "私密1" 4人 当前用户非成员
    When 陌生人申请加入
    Then 申请失败
    And 错误码为 "NOT_PUBLIC"

  Scenario: 满员房间申请失败
    Given 已存在一个公开满员房间 4人 当前用户非成员
    When 陌生人申请加入
    Then 申请失败
    And 错误码为 "ROOM_FULL"

  # ===== C-18: 发起人审核 =====
  Scenario: 房主通过申请后申请人加入房间
    Given 已存在一个公开房间 "审核1" 4人 且有 1 个待审核申请
    When 房主通过申请
    Then 审核成功
    And 房间成员数为 2
    And 待审核申请数为 0

  Scenario: 房主拒绝申请后申请人不加入
    Given 已存在一个公开房间 "审核2" 4人 且有 1 个待审核申请
    When 房主拒绝申请
    Then 审核成功
    And 房间成员数仍为 1
    And 待审核申请数为 0

  Scenario: 非房主不能审核
    Given 已存在一个公开房间 "审核3" 4人 且有 1 个待审核申请 当前用户非房主
    When 当前用户通过申请
    Then 审核失败
    And 错误码为 "NOT_HOST"

  Scenario: 通过不存在的申请失败
    Given 已存在一个公开房间 "审核4" 4人
    When 房主通过申请 "req_notexist"
    Then 审核失败
    And 错误码为 "REQUEST_NOT_FOUND"

  # ===== C-19: 评价和举报 =====
  Scenario: 完成后成员可评价返回 summary
    Given 已存在一个所有人已投票的房间 3人
    When 发起人点击生成剧本
    And 发起人提交评价 5 星 "很棒"
    Then 评价成功
    And 评价 summary 平均分为 5
    And 评价 summary 总数为 1

  Scenario: 重复评价失败
    Given 已存在一个所有人已投票的房间 3人
    When 发起人点击生成剧本
    And 发起人提交评价 5 星 "很棒"
    And 发起人再次提交评价 4 星 "再评"
    Then 评价失败
    And 错误码为 "ALREADY_REVIEWED"

  Scenario: 任何用户可举报组局
    Given 已存在一个房间 "举报1" 4人
    When 当前用户举报 "垃圾广告"
    Then 举报成功
    And 房间 reported 为 true

  Scenario: 重复举报失败
    Given 已存在一个房间 "举报2" 4人
    When 当前用户举报 "理由1"
    And 当前用户再次举报 "理由2"
    Then 举报失败
    And 错误码为 "ALREADY_REPORTED"

  # ===== C-P3 任务大厅与搭子匹配 =====
  # 覆盖：入口分流 / 任务大厅 / 出逃大师 / 用户创建 / 摇骰子匹配 / 加入联动 / 广州数据 / 多用户关联 / group room 联动
  # 数据层：utils/task-hall-store.js（HallTask CRUD + diceMatch + 状态机）
  # 关联：通过 roomId 关联 group-room-store.js（C-01~C-19 房间系统）

  # ----- 入口分流 -----
  @c-p3 @entry
  Scenario: 同频骰子点击后弹出分流 Sheet
    Given 用户在首页点击同频骰子
    When 系统弹出底部 Sheet
    Then Sheet 包含「邀请好友组局」选项
    And Sheet 包含「进入任务大厅找搭子」选项

  @c-p3 @entry
  Scenario: 选择邀请好友组局
    Given 用户点击同频骰子并看到分流 Sheet
    When 用户选择「邀请好友组局」
    Then 跳转到 packageSync/pages/group/create 创建房间流程

  @c-p3 @entry
  Scenario: 选择进入任务大厅
    Given 用户点击同频骰子并看到分流 Sheet
    When 用户选择「进入任务大厅找搭子」
    Then 跳转到 packageSync/pages/group/hall 任务大厅页

  # ----- 任务大厅页面 -----
  @c-p3 @hall
  Scenario: 任务大厅展示出逃大师任务列表
    Given 任务大厅已初始化出逃大师任务模板
    When 用户进入任务大厅
    Then 显示至少 10 张任务卡片
    And 每张卡片显示主题、区域、POI、人数、发起人、标签
    And 出逃大师任务卡片有「官方」徽章

  @c-p3 @hall
  Scenario: 按区域筛选任务
    Given 任务大厅有天河区 6 个任务和越秀区 6 个任务
    When 用户筛选区域 = "天河区"
    Then 只显示天河区的 6 个任务

  @c-p3 @hall
  Scenario: 按主题分类筛选任务
    Given 任务大厅有"看展"类 5 个任务和"咖啡"类 3 个任务
    When 用户筛选主题 = "看展"
    Then 只显示看展类的 5 个任务

  # ----- 出逃大师官方任务 -----
  @c-p3 @master
  Scenario: 出逃大师任务卡片显示官方标识
    Given 出逃大师发布了"二沙岛艺术漫游"任务
    When 用户进入任务大厅
    Then 该任务卡片发起人显示为"出逃大师"
    And 卡片有"官方"标签徽章

  @c-p3 @master
  Scenario: 出逃大师任务详情展示完整信息
    Given 出逃大师任务"二沙岛艺术漫游"存在
    When 用户点击该任务卡片
    Then 显示任务详情
    And 包含主题描述、POI 名称+地址+坐标、建议时长、人数范围、任务步骤预览

  # ----- 用户创建任务 -----
  @c-p3 @create
  Scenario: 用户成功创建自定义任务
    Given 用户在任务大厅点击"创建任务"
    When 用户填写主题"周末咖啡探店"、选择区域"天河区"、选择 POI"假如咖啡馆"、人数 4 人
    Then 任务创建成功
    And 任务出现在大厅列表
    And 该任务发起人为当前用户昵称

  @c-p3 @create
  Scenario: 创建任务参数校验失败
    When 用户提交主题为空的任务
    Then 创建失败
    And 返回错误码 INVALID_PARAM

  @c-p3 @create
  Scenario: 创建任务人数越界校验
    When 用户提交人数为 2 的任务
    Then 创建失败
    And 返回错误码 INVALID_PARAM

  @c-p3 @create
  Scenario: 创建任务区域非法校验
    When 用户提交区域为"上海"的任务
    Then 创建失败
    And 返回错误码 INVALID_PARAM

  # ----- 搭子随机匹配 -----
  @c-p3 @dice
  Scenario: 摇骰子找搭子匹配成功
    Given 任务大厅有 5 个未满员任务和 mock 用户池有 8 人
    When 用户点击"摇骰子找搭子"
    Then 系统从任务池随机选一个匹配的任务
    And 自动为该任务匹配 2-4 个 mock 用户作为搭子
    And 跳转到该任务的房间页

  @c-p3 @dice
  Scenario: 摇骰子匹配池为空兜底
    Given 任务大厅无可用任务
    When 用户点击"摇骰子找搭子"
    Then 提示"暂无匹配任务，试试创建一个？"

  @c-p3 @dice
  Scenario: 摇骰子匹配后任务满员自动建房间
    Given 摇骰子匹配使任务达到人数上限
    Then 任务状态变为 ready
    And 系统自动创建 group room 并关联 roomId

  # ----- 任务加入与房间联动 -----
  @c-p3 @join
  Scenario: 用户加入出逃大师任务
    Given 出逃大师任务"美术馆看展"当前 2 人上限 4 人
    When 用户点击"加入"
    Then 任务成员数变为 3
    And 用户成为房间成员
    And 底层 group room 状态为 waiting_members

  @c-p3 @join
  Scenario: 任务满员自动转 ready
    Given 任务当前 3 人上限 4 人
    When 第 4 人加入
    Then 任务状态变为 ready
    And 弹出"人齐了，可以出发！"

  @c-p3 @join
  Scenario: 重复加入同一任务被拒
    Given 用户已加入任务 T001
    When 用户再次加入 T001
    Then 加入失败
    And 返回错误码 ALREADY_JOINED

  @c-p3 @join
  Scenario: 加入已满员任务被拒
    Given 任务 T001 已满员且状态为 ready
    When 用户尝试加入 T001
    Then 加入失败
    And 返回错误码 TASK_NOT_RECRUITING

  # ----- 广州城市数据 -----
  @c-p3 @data
  Scenario: 广州 POI 数据按区域查询
    Given 广州 POI 库含天河区 10 个 POI
    When 用户创建任务选择区域"天河区"
    Then POI 选项展示天河区的 10 个 POI
    And 每个 POI 含名称、地址、类型

  @c-p3 @data
  Scenario: 出逃大师任务绑定真实 POI
    Given 出逃大师任务"方所书店寻宝"绑定 POI"方所书店（太古汇店）"
    When 用户查看任务详情
    Then 显示 POI 名称、地址、坐标
    And 坐标可被地图页消费

  @c-p3 @data
  Scenario: 出逃大师任务模板覆盖 6 区
    Given 出逃大师模板库已加载
    Then 模板覆盖天河区、越秀区、海珠区、荔湾区、白云区、番禺区
    And 每个模板的 poiId 在广州 POI 库中存在

  # ----- 多用户数据关联 -----
  @c-p3 @multi-user
  Scenario: 多用户加入同一任务数据关联
    Given 出逃大师任务 T001 当前 1 人
    When mock 用户 A 和 mock 用户 B 依次加入 T001
    Then T001 的 members 数组含 3 个成员
    And 每个成员有独立 openId、nickname、joinedAt

  @c-p3 @multi-user
  Scenario: 任务数据本地持久化
    Given 用户加入任务 T001 后退出小程序
    When 重新进入任务大厅
    Then T001 仍显示该用户为成员
    And 任务状态保持一致

  # ----- group room 联动 -----
  @c-p3 @linkage
  Scenario: 房主开始出逃创建 group room
    Given 任务 T001 已满员状态为 ready
    When 房主点击"开始出逃"
    Then 系统创建 group room
    And roomId 写入 hall task
    And 任务状态变为 started
    And 跳转到 room 页

  @c-p3 @linkage
  Scenario: room 页读取 hall task POI 作为出逃地点
    Given 用户从任务大厅进入 room 页带 taskId
    When room 页加载
    Then 显示 hall task 的 POI 名称和地址
    And POI 坐标可被地图页消费

  @c-p3 @linkage
  Scenario: room 完成后回写 hall task 状态
    Given 用户在 room 页完成出逃生成剧本
    When room 状态变为 finished
    Then hall task 状态回写为 finished
