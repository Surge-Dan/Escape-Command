# C-P3 任务大厅与搭子匹配 Spec

## Why

当前同频骰子（C-01~C-19）仅支持"邀请熟人 → 投票 → 生成剧本"的封闭房间模式，功能太简单。用户的真实诉求是：点击同频骰子后，除了邀请好友，还能进入一个**任务大厅**——像找搭子一样，选择或随机匹配一个出逃任务（如沙龙活动、美术馆看展、city walk），人齐了就出发。这对应产品总纲第 10.3 节"同频骰子"第二/三阶段演进（半开放组局 → 平台匹配），但以"任务大厅"为产品形态落地，比原 PRD 的"公开组局列表"更丰富、更可演示。

## What Changes

### 入口分流
- 点击同频骰子 → 弹出选择 Sheet：「邀请好友组局」（走现有 C-01 流程）/「进入任务大厅找搭子」（新流程）

### 任务大厅（新页面 `pages/group/hall/`）
- 展示可加入的出逃任务卡片列表，按区域/主题/时间筛选
- 三类任务来源：**出逃大师官方任务**（系统内置）、**用户创建任务**、**骰子随机匹配**
- 任务卡片含：主题、区域、POI 名称、时间、当前人数/上限、发起人（出逃大师 or 用户昵称）、标签

### 出逃大师（系统虚拟发起人）
- 内置虚拟角色"出逃大师"，作为官方任务的 hostOpenId
- 官方任务模板覆盖：沙龙活动、美术馆看展、city walk、咖啡探店、书店寻宝 等
- 官方任务预绑定广州真实 POI（如广州美术馆、方所书店、二沙岛等）

### 搭子随机匹配
- 用户在任务大厅点"摇骰子找搭子"→ 系统从任务池随机抽一个匹配的任务 → 自动加入并匹配其他 solo 用户（mock）→ 人齐后进入房间
- 匹配池：同区域/同时段偏好优先，mock 其他用户 2-5 人

### 用户创建任务
- 用户可创建自定义出逃任务：主题、区域、POI（从广州 POI 库选）、时间偏好、人数（3-6）
- 创建后进入任务大厅列表，等待其他用户申请加入（复用 C-17/C-18 申请+审核流程）

### 广州城市 mock 数据（新 `data/` 文件）
- `data/guangzhou-districts.js`：广州 6 区（天河/越秀/海珠/荔湾/白云/番禺）+ 区域标签
- `data/guangzhou-pois.js`：每区 8-12 个真实 POI（咖啡馆、美术馆、书店、公园、沙龙空间等），含名称、坐标、类型、营业时间、标签
- `data/escape-master-tasks.js`：出逃大师官方任务模板 10+ 条，每条绑定一个广州 POI

### 多用户数据关联
- 新建 `utils/task-hall-store.js`：管理大厅任务 CRUD + 匹配池，基于 `wx.getStorageSync` 本地存储
- 任务参与记录写入 `groupRooms`（复用现有 room 结构），通过 `taskId` 关联大厅任务
- mock 用户池（`utils/mock-user-pool.js`）：8-12 个虚拟用户，含昵称/头像/偏好/区域，用于模拟搭子匹配

## Impact

- **Affected specs**:
  - `home-dice-entry-01`：首页同频骰子入口需增加"邀请好友/任务大厅"分流
  - `c-p2-group-finale`（C-16 公开组局）：任务大厅的"用户创建任务"是 C-16 公开组局的演进形态，复用 listPublicRooms 数据结构
  - `sync-dice-roadmap`：C 块从 19 项扩展到 C-P3 子阶段
- **Affected code**:
  - `pages/group/hall/`（新建：任务大厅页）
  - `pages/group/create/create.js`（修改：增加出逃大师/自定义任务创建路径）
  - `utils/task-hall-store.js`（新建：大厅数据层）
  - `utils/mock-user-pool.js`（新建：虚拟用户池）
  - `data/guangzhou-districts.js`、`data/guangzhou-pois.js`、`data/escape-master-tasks.js`（新建：广州数据）
  - `pages/index/`（修改：同频骰子点击分流）
  - `app.json`（修改：注册新页面路由）

## ADDED Requirements

### Requirement: 同频骰子入口分流
点击首页同频骰子后，系统 SHALL 弹出底部 Sheet，提供两个选项：「邀请好友组局」和「进入任务大厅找搭子」。

#### Scenario: 选择邀请好友
- **WHEN** 用户点击同频骰子 → 选择「邀请好友组局」
- **THEN** 跳转到现有 `pages/group/create` 创建房间流程

#### Scenario: 选择任务大厅
- **WHEN** 用户点击同频骰子 → 选择「进入任务大厅找搭子」
- **THEN** 跳转到 `pages/group/hall` 任务大厅页

### Requirement: 任务大厅页面
系统 SHALL 提供任务大厅页面，展示所有可加入的出逃任务卡片列表。

#### Scenario: 展示任务列表
- **GIVEN** 任务大厅有 3 个出逃大师任务 + 2 个用户创建任务（均未满员）
- **WHEN** 用户进入任务大厅
- **THEN** 显示 5 张任务卡片，按创建时间倒序排列
- **AND** 每张卡片显示主题、区域、POI、当前人数/上限、发起人、标签

#### Scenario: 按区域筛选
- **GIVEN** 任务大厅有天河区 3 个任务 + 越秀区 2 个任务
- **WHEN** 用户筛选区域 = "天河区"
- **THEN** 只显示天河区的 3 个任务

#### Scenario: 按主题筛选
- **GIVEN** 任务大厅有"看展"2 个 + "city walk"3 个
- **WHEN** 用户筛选主题 = "看展"
- **THEN** 只显示看展类 2 个任务

### Requirement: 出逃大师官方任务
系统 SHALL 内置虚拟角色"出逃大师"，发布预定义的官方出逃任务，绑定广州真实 POI。

#### Scenario: 出逃大师任务展示
- **GIVEN** 出逃大师发布了"二沙岛艺术漫游"任务（越秀区，3-5 人，绑定二沙岛 POI）
- **WHEN** 用户进入任务大厅
- **THEN** 该任务卡片发起人显示为"出逃大师"
- **AND** 卡片有"官方"标签徽章

#### Scenario: 出逃大师任务详情
- **WHEN** 用户点击出逃大师任务卡片
- **THEN** 显示任务详情：主题描述、POI 名称+地址+坐标、建议时长、人数范围、任务步骤预览

### Requirement: 用户创建任务
用户 SHALL 能在任务大厅创建自定义出逃任务，发布到大厅供其他用户加入。

#### Scenario: 创建任务
- **GIVEN** 用户在任务大厅点击"创建任务"
- **WHEN** 填写主题"周末咖啡探店"、选择区域"天河区"、选择 POI"假如咖啡馆"、人数 4 人
- **THEN** 任务创建成功，出现在大厅列表
- **AND** 该任务发起人为当前用户昵称

#### Scenario: 创建任务校验
- **WHEN** 用户提交主题为空 / 人数不在 3-6 / 未选择区域
- **THEN** 创建失败，返回对应错误码 `INVALID_PARAM`

### Requirement: 搭子随机匹配
用户 SHALL 能在任务大厅点击"摇骰子找搭子"，系统随机匹配一个任务 + 随机搭子。

#### Scenario: 随机匹配成功
- **GIVEN** 任务大厅有 5 个未满员任务，mock 用户池有 8 人
- **WHEN** 用户点击"摇骰子找搭子"
- **THEN** 系统从任务池随机选一个匹配的任务
- **AND** 自动为该任务匹配 2-4 个 mock 用户作为搭子
- **AND** 跳转到该任务的房间页（复用 `pages/group/room`）

#### Scenario: 任务池为空
- **GIVEN** 任务大厅无可用任务
- **WHEN** 用户点击"摇骰子找搭子"
- **THEN** 提示"暂无匹配任务，试试创建一个？"

### Requirement: 任务加入与房间联动
用户加入任务大厅的任一任务后，系统 SHALL 创建对应的 group room（复用 C-01~C-19 流程）。

#### Scenario: 加入出逃大师任务
- **GIVEN** 出逃大师任务"美术馆看展"当前 2 人，上限 4 人
- **WHEN** 用户点击"加入"
- **THEN** 任务成员数变为 3，用户成为房间成员
- **AND** 底层创建/更新 group room，状态为 `waiting_members`

#### Scenario: 任务满员自动开始
- **GIVEN** 任务当前 3 人（上限 4），最后 1 人加入
- **WHEN** 第 4 人加入
- **THEN** 任务状态变为 `ready`，弹出"人齐了，可以出发！"
- **AND** 发起人可点击"开始出逃"进入剧本生成流程（复用 C-08）

### Requirement: 广州城市 mock 数据
系统 SHALL 内置广州 6 区的 POI 数据和出逃大师任务模板。

#### Scenario: POI 数据查询
- **GIVEN** 广州 POI 库含天河区 10 个 POI
- **WHEN** 用户创建任务选择区域"天河区"
- **THEN** POI 选项展示天河区的 10 个 POI（名称 + 地址 + 类型）

#### Scenario: 出逃大师任务绑定 POI
- **GIVEN** 出逃大师任务"方所书店寻宝"绑定 POI"方所书店（太古汇店）"
- **WHEN** 用户查看任务详情
- **THEN** 显示 POI 名称、地址、坐标（可被地图页消费）

### Requirement: 多用户数据关联
系统 SHALL 通过 `taskId` 关联任务大厅任务与 group room，支持多用户共享任务状态。

#### Scenario: 多用户加入同一任务
- **GIVEN** 出逃大师任务 T001 当前 1 人
- **WHEN** mock 用户 A 和 mock 用户 B 依次加入 T001
- **THEN** T001 的 members 数组含 3 个成员（含当前用户）
- **AND** 每个成员有独立 openId、nickname、joinedAt

#### Scenario: 任务数据持久化
- **GIVEN** 用户加入任务 T001 后退出小程序
- **WHEN** 重新进入任务大厅
- **THEN** T001 仍显示该用户为成员
- **AND** 任务状态保持一致

## MODIFIED Requirements

### Requirement: 首页同频骰子入口（原 home-dice-entry-01）
点击同频骰子后，原直接跳转创建房间，现改为先弹出分流 Sheet：「邀请好友组局」/「进入任务大厅找搭子」。

## REMOVED Requirements
（无移除项，本 Spec 为纯新增）

## 数据模型设计

### HallTask 结构（task-hall-store.js）
```
{
  taskId: 'hall_xxxxxx',          // 大厅任务 ID（hall_ 前缀）
  source: 'master' | 'user' | 'dice',  // 任务来源
  topic: '二沙岛艺术漫游',         // 主题
  category: 'walk',               // 主题分类：walk/art/salon/coffee/book/market
  district: '越秀区',             // 广州区域
  poi: { name, address, latitude, longitude, type },  // 绑定 POI
  hostOpenId: 'escape_master' | 'u_xxx',  // 发起人（出逃大师 or 用户）
  hostNickname: '出逃大师' | '用户昵称',
  maxMembers: 4,                  // 人数上限（3-6）
  members: [{ openId, nickname, joinedAt }],  // 已加入成员
  status: 'recruiting' | 'ready' | 'started' | 'finished',  // 大厅任务状态
  scheduledTime: 'weekend_afternoon',  // 时间偏好
  tags: ['官方', '看展', '户外'],
  description: '...',             // 任务描述
  createdAt: 1234567890,
  roomId: null | 'ABC123'         // 关联的 group roomId（满员后创建）
}
```

### GuangzhouPOI 结构（data/guangzhou-pois.js）
```
{
  id: 'gz_poi_001',
  name: '广州美术馆',
  district: '越秀区',
  address: '越秀区麓湖路13号',
  latitude: 23.1497,
  longitude: 113.2644,
  type: 'art',                    // art/cafe/book/park/market/salon
  businessHours: [9, 17],         // 营业时间
  tags: ['看展', '室内', '文艺'],
  description: '广州市属公益性美术馆'
}
```

### EscapeMasterTask 模板（data/escape-master-tasks.js）
```
{
  templateId: 'em_001',
  topic: '二沙岛艺术漫游',
  category: 'walk',
  district: '越秀区',
  poiId: 'gz_poi_010',            // 引用 guangzhou-pois
  maxMembers: 4,
  scheduledTime: 'weekend_morning',
  tags: ['官方', 'city walk', '户外', '文艺'],
  description: '从星海音乐厅出发，沿二沙岛步道漫游，途经多座户外雕塑...',
  steps: ['在星海音乐厅集合', '沿绿道步行至广东美术馆', '在雕塑前合影', '分享感受']
}
```
