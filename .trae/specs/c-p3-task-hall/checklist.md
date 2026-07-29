# Checklist

## 数据层
- [x] `data/guangzhou-districts.js` 存在且导出 `GUANGZHOU_DISTRICTS`（6 区）
- [x] `data/guangzhou-pois.js` 存在且导出 `GUANGZHOU_POIS`（≥50 个 POI，实际 56 个）+ `getPOIsByDistrict` / `getPOIsByType` 函数
- [x] `data/escape-master-tasks.js` 存在且导出 `ESCAPE_MASTER_TEMPLATES`（≥10 条，实际 17 条）+ `getTemplatesByDistrict` 函数
- [x] `utils/mock-user-pool.js` 存在且导出 `getMockUsers` / `getRandomPartner` 函数
- [x] 广州 POI 每项含 id/name/district/address/latitude/longitude/type/businessHours/tags
- [x] 出逃大师任务模板的 poiId 在广州 POI 库中存在（引用一致性 100%）
- [x] 所有数据文件为纯数据模块（`module.exports`，零 wx 依赖）

## 任务大厅数据层
- [x] `utils/task-hall-store.js` 存在且导出 `listTasks` / `getTaskDetail` / `createUserTask` / `joinTask` / `diceMatch` / `linkRoom` / `initHallFromTemplates` / `updateTaskStatus` / `clearAllTasks`
- [x] `initHallFromTemplates()` 能从 escape-master-tasks 初始化出逃大师任务到大厅（幂等）
- [x] `listTasks({ district, category })` 筛选正确，返回精简卡片字段（不含 members 全量）
- [x] `createUserTask` 校验主题非空 / 人数 3-6 / 区域存在，非法返回 `INVALID_PARAM`
- [x] `joinTask` 加入后成员数 +1，满员后状态变 `ready`
- [x] `diceMatch` 随机返回任务 + 2-4 个 mock 搭子
- [x] `linkRoom` 关联 roomId 后 hall task 与 group room 数据一致
- [x] 本地存储键 `taskHall`，含 `clearAllTasks()` 调试函数
- [x] 纯函数层（过滤/匹配/校验）零 wx 依赖，存储层仅 `wx.getStorageSync` / `wx.setStorageSync`
- [x] 单元测试 `tests/unit/task-hall-store.test.js` 全通过（57 用例：正向 + 边界 + 异常 + 多用户关联）

## 任务大厅页面
- [x] `pages/group/hall/hall.js/wxml/wxss/json` 存在
- [x] hall 页含 nav-header（与 create/room 页结构一致）
- [x] hall 页顶部有区域筛选 Tag + 主题筛选 Tag
- [x] hall 页任务卡片显示主题/区域/POI/人数/发起人/标签
- [x] 出逃大师任务卡片有"出逃大师"徽章 + "官方"标签
- [x] hall 页底部有"创建任务" + "摇骰子找搭子"双按钮
- [x] 点击任务卡片能展开/跳转任务详情
- [x] "加入任务"按钮在满员时置灰
- [x] `pages/group/hall/create-task/` 创建表单含区域联动 POI 选择
- [x] 卡片圆角遵循规范（小元素 6rpx，标签 10rpx，按钮 16rpx，卡片 20rpx）

## 摇骰子找搭子
- [x] 点"摇骰子找搭子"触发骰子动画（CSS 旋转 800ms）
- [x] 匹配成功后展示任务名 + 搭子头像列表 + "出发"按钮
- [x] 点击"出发"跳转到 group room 页（满员时）或详情页（未满员时）
- [x] 匹配池为空时显示兜底提示（NO_MATCH）

## 入口分流
- [x] 首页点击同频骰子弹出底部 Sheet（"邀请好友组局"/"进入任务大厅找搭子"）
- [x] Sheet 样式复用首页模式选择 Sheet 风格（暖棕褐品牌色）
- [x] "邀请好友组局"跳 `pages/group/create`
- [x] "进入任务大厅找搭子"跳 `pages/group/hall`

## 路由与包体
- [x] `app.json` pages 数组含 `pages/group/hall/hall`、`pages/group/hall/detail/detail` 和 `pages/group/hall/create-task/create-task`
- [x] 新增资源增量 = 0（无新图片/音频/字体，复用现有 SVG/品牌色/emoji）
- [x] 新增纯 JS 代码增量 < 30KB（数据文件预估 20KB + 逻辑 8KB）

## 联动
- [x] 任务满员后 group room 创建成功，roomId 写入 hall task（hall.js runDiceMatch 自动 createRoom + linkRoom）
- [x] room 页能读取 hall task 的 POI 作为出逃地点（room.js onLoad 接收 taskId，显示 POI 名称+地址）
- [x] room 完成后 hall task 状态回写为 finished（room.js syncHallTaskFinished，处理 ready→started→finished 状态机补全）
- [x] 出逃大师任务的 hostOpenId 为 `escape_master`，成员可正常加入（members[0] 作为房主）

## 测试
- [x] `tests/qa/check.js` 新增 C-P3 契约检查全通过（104 项新增，382 项总计全通过）
- [x] `tests/gherkin/group-flow.feature` 新增 C-P3 场景全通过（27 个场景 + 67 个步骤处理器，161 个总计全通过）
- [x] 现有 C-01~C-19 全量回归无破坏（323 个 store 单元测试通过）
