# Tasks

## 阶段 0：数据层（广州 mock 数据 + 虚拟用户池）
- [x] Task 1: 创建广州区域数据 `data/guangzhou-districts.js`
  - [x] 6 区（天河/越秀/海珠/荔湾/白云/番禺）+ 每区标签/简介/代表色
  - [x] 导出 `GUANGZHOU_DISTRICTS` 数组，每项含 `id/name/alias/color/tags/description`
- [x] Task 2: 创建广州 POI 数据 `data/guangzhou-pois.js`
  - [x] 每区 8-12 个真实 POI，共约 60 个（实际 56 个）
  - [x] 类型覆盖：art（美术馆/画廊）、cafe（咖啡馆）、book（书店）、park（公园）、salon（沙龙空间）、market（市集）
  - [x] 每项含 `id/name/district/address/latitude/longitude/type/businessHours/tags/description`
  - [x] 导出 `GUANGZHOU_POIS` 数组 + `getPOIsByDistrict(district)` / `getPOIsByType(type)` 辅助函数
- [x] Task 3: 创建出逃大师任务模板 `data/escape-master-tasks.js`
  - [x] 10+ 条官方任务模板（实际 17 条），覆盖 6 区和 6 种主题
  - [x] 每条含 `templateId/topic/category/district/poiId/maxMembers/scheduledTime/tags/description/steps`
  - [x] 导出 `ESCAPE_MASTER_TEMPLATES` 数组 + `getTemplatesByDistrict(district)` 辅助函数
- [x] Task 4: 创建虚拟用户池 `utils/mock-user-pool.js`
  - [x] 12 个 mock 用户，含 `openId/nickname/avatar/interests/district/bio`
  - [x] 导出 `getMockUsers(count, filter)` 函数（按区域/兴趣筛选随机取 N 个）
  - [x] 导出 `getRandomPartner()` 函数（返回单个随机搭子）

## 阶段 1：任务大厅数据层
- [x] Task 5: 创建任务大厅存储 `utils/task-hall-store.js`
  - [x] 数据模型：HallTask 结构（taskId/source/topic/category/district/poi/hostOpenId/members/status/tags/roomId）
  - [x] `initHallFromTemplates()`：启动时从 escape-master-tasks 初始化出逃大师任务到大厅
  - [x] `listTasks(filters)`：按 district/category/status 筛选，返回精简卡片字段
  - [x] `getTaskDetail(taskId)`：返回完整任务详情
  - [x] `createUserTask(creator, { topic, category, district, poiId, maxMembers, scheduledTime, description })`：用户创建任务
  - [x] `joinTask(taskId, user)`：加入任务，返回更新后成员列表
  - [x] `diceMatch(user, { district, category })`：随机匹配任务 + 随机搭子，返回 { task, partners }
  - [x] `linkRoom(taskId, roomId)`：满员后关联 group room
  - [x] 状态机：recruiting → ready → started → finished
  - [x] 本地存储键 `taskHall`（数组），含 `clearAllTasks()` 调试用
- [x] Task 6: 任务大厅数据层单元测试 `tests/unit/task-hall-store.test.js`
  - [x] 覆盖 listTasks/getTaskDetail/createUserTask/joinTask/diceMatch/linkRoom 正向 + 边界 + 异常
  - [x] 覆盖状态机转换非法路径
  - [x] 覆盖多用户加入同一任务的数据关联（57 个测试用例全部通过）

## 阶段 2：任务大厅页面
- [x] Task 7: 创建任务大厅页面 `pages/group/hall/`
  - [x] `hall.wxml`：顶部筛选条（区域 Tag + 主题 Tag）+ 任务卡片列表 + 底部"创建任务"/"摇骰子找搭子"双按钮
  - [x] `hall.wxss`：卡片样式（复用 group room 卡片风格 + 暖棕褐品牌色），官方任务卡片有"出逃大师"徽章
  - [x] `hall.js`：onLoad 调 `initHallFromTemplates` + `listTasks`；筛选交互；点击卡片跳详情；底部按钮分流
  - [x] `hall.json`：自定义导航栏 nav-header（与 create/room 页一致）
- [x] Task 8: 创建任务详情页 `pages/group/hall/detail/`
  - [x] 展示：主题、描述、POI 名称+地址、时间偏好、人数、发起人、标签、任务步骤预览
  - [x] "加入任务"按钮 → 调 `joinTask` → 成功后跳 `pages/group/room`
  - [x] 已满员时按钮置灰显示"人已满"
- [x] Task 9: 创建任务创建页 `pages/group/hall/create-task/`
  - [x] 表单：主题输入、区域选择（6 区 Tag）、POI 选择（按区域联动）、主题分类、人数滑块（3-6）、时间偏好、描述
  - [x] 提交 → 调 `createUserTask` → 成功后返回大厅列表

## 阶段 3：摇骰子找搭子匹配
- [x] Task 10: 搭子匹配交互
  - [x] 大厅页"摇骰子找搭子"按钮 → 触发骰子动画（CSS 旋转 800ms）
  - [x] 动画结束后调 `diceMatch(user, filters)` → 返回匹配任务 + 搭子
  - [x] 展示匹配结果弹窗：任务名 + 搭子头像列表 + "出发"按钮
  - [x] 点击"出发"→ 创建/更新 group room → 跳 `pages/group/room`（满员时）或详情页（未满员时）
  - [x] 匹配池为空时的兜底提示

## 阶段 4：入口分流 + 路由
- [x] Task 11: 修改首页同频骰子入口分流
  - [x] `pages/index/` 点击同频骰子 → 弹出底部 Sheet（复用首页模式选择 Sheet 样式）
  - [x] 选项 1「邀请好友组局」→ 跳 `pages/group/create`
  - [x] 选项 2「进入任务大厅找搭子」→ 跳 `pages/group/hall`
- [x] Task 12: 注册路由 + app.json
  - [x] `app.json` pages 数组新增 `pages/group/hall/hall`、`pages/group/hall/detail/detail`、`pages/group/hall/create-task/create-task`
  - [x] 确认包体增量（纯 JS 数据 + wxml，预估 < 30KB，不触发红线）

## 阶段 5：联动与测试
- [x] Task 13: group room 联动
  - [x] 任务满员后 `linkRoom(taskId, roomId)` 创建 group room（hall.js runDiceMatch 内自动调用）
  - [x] room 页读取 hall task 的 POI 作为出逃地点（room.js onLoad 接收 taskId，加载 POI 显示）
  - [x] room 完成后回写 hall task 状态为 finished（room.js syncHallTaskFinished）
- [x] Task 14: QA 契约检查扩展 `tests/qa/check.js`
  - [x] 检查 task-hall-store 函数导出完整性
  - [x] 检查广州数据文件存在 + 字段完整性
  - [x] 检查出逃大师任务模板数量 + POI 引用一致性
  - [x] 检查 hall 页面 nav-header + 筛选条 + 卡片结构
  - [x] 检查首页入口分流 Sheet 存在（新增 104 项 C-P3 契约检查，全部通过）
- [x] Task 15: Gherkin BDD 场景 `tests/gherkin/group-flow.feature` 追加 C-P3 场景
  - [x] 出逃大师任务展示、按区域筛选、用户创建任务、摇骰子匹配、加入任务联动 room（新增 27 个场景 + 67 个步骤处理器，全部通过）

# Task Dependencies
- [Task 5] depends on [Task 1, 2, 3, 4]（数据层先建）
- [Task 6] depends on [Task 5]
- [Task 7, 8, 9] depend on [Task 5, 6]（页面依赖数据层）
- [Task 10] depends on [Task 7, 5]（匹配交互依赖页面 + 数据层）
- [Task 11, 12] depend on [Task 7]（入口路由依赖大厅页）
- [Task 13] depends on [Task 5, 7]（联动依赖数据层 + 页面）
- [Task 14, 15] depend on [Task 5~13 全部完成]
- [Task 1, 2, 3, 4] 可并行
- [Task 7, 8, 9] 可并行（三个独立页面）

# 最终验证结果
- task-hall-store 单元测试：57 通过, 0 失败
- store 回归测试：323 passed, 0 failed
- QA 契约检查：382 checks, 382 passed, 0 errors
- Gherkin BDD：161 scenarios, 700 steps passed, 0 failed
