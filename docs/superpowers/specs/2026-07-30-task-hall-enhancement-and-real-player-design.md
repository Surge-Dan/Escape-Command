# 任务大厅增强 + 真实玩家联动 设计文档

> 日期：2026-07-30
> 范围：C-P3 任务大厅 5 项增强（人数 bug / 广州 11 区 / 自定义主题 / 官方任务扩充 / 真实玩家联动）
> 前置：C-P3 任务大厅已上线（commit `c38ab20`），本地 demo 模式 + mock-user-pool 12 个虚拟用户

## 一、需求与现状

| # | 需求 | 现状 | 根因 |
|---|------|------|------|
| 1 | 人数选择器无法选择，只能固定 4 人 | `create-task.wxml:169` `catchtap=""` 空处理函数 | 微信小程序空字符串事件处理函数会让 `picker-panel` 整个子树的 `bindtap` 失效，点选项无响应 |
| 2 | 广州区域不全，缺增城/花都/南沙/从化/黄埔 | `guangzhou-districts.js` 仅 6 区 | 数据缺失，`guangzhou-pois.js` 也只覆盖 6 区 |
| 3 | 主题分类要支持自定义 | `VALID_CATEGORIES` 写死 6 类，`createUserTask` 拦截非法分类 | 无自定义入口，无扩展字段 |
| 4 | 官方出逃任务要多，涵盖各类 | `escape-master-tasks.js` 17 条，白云/番禺仅 2 条，无 sport/music/photo/food | 数据不足，类型覆盖窄 |
| 5 | 摇骰子找搭子要支持真实玩家联动 | `diceMatch` 只从 `mock-user-pool` 取 12 个虚拟用户 | 无云端真实玩家数据层 |

## 二、方案总览

5 项需求分两层：
- **数据/UI 层**（需求 1-4）：纯前端改动，无云端依赖，可纯函数测试
- **联动层**（需求 5）：新增云开发真实玩家层，混合模式（真实优先 + mock 兜底）

### 架构图（需求 5 混合模式）

```
hall.js runDiceMatch
  ↓
player-matcher.matchPartners(count, filter)   ← 新增协调层（纯函数 + 降级）
  ├─ 优先：cloudPartnerStore.matchOnlinePartners()  ← 云函数 matchPartners
  │        └─ 云数据库 users 集合（真实玩家档案 + 在线状态）
  └─ 降级：mock-user-pool.getMockUsers()  ← 现有 mock 兜底（云端不可用/不足时）
```

**降级原则**（与项目既定哲学一致，参考 poiSearch 云函数）：
- 云函数调用超时 3s 或返回不足 → 用 mock 补足到目标数量
- 云开发环境不可用（`cloudReady=false`）→ 直接走 mock，主流程不挂
- 真实玩家和 mock 搭子可在同一局共存（真实优先填充）

---

## 三、详细设计

### D1：人数选择器 bug 修复（需求 1）

**根因**：`create-task.wxml:169` 的 `<view class="picker-panel" catchtap="">` 用了空字符串事件处理函数。微信小程序基础库对空处理函数的处理不一致，部分版本会吞掉整个子树的 tap 事件，导致 `picker-option` 的 `bindtap="onPickerOptionTap"` 不触发。

**修复**：
- `create-task.wxml`：`catchtap=""` → `catchtap="onPickerPanelTap"`
- `create-task.js`：新增空方法 `onPickerPanelTap() {}`（仅阻止冒泡到 mask，无业务逻辑）
- 同步检查 `pages/group/create/create.wxml` 是否有相同模式（若有一并修）

**验证**：真机点击 3/5/6 选项，`tempMembers` 切换，确认后 `maxMembers` 正确更新。

### D2：广州 11 区补全（需求 2）

**当前**：天河/越秀/海珠/荔湾/白云/番禺（6 区）
**新增**：黄埔区、花都区、从化区、增城区、南沙区（5 区）→ 共 11 区

**改动**：
- `data/guangzhou-districts.js`：`GUANGZHOU_DISTRICTS` 加 5 个区对象（id/name/alias/color/tags/description）
- `data/guangzhou-pois.js`：为 5 个新区各补 6-8 个真实 POI（含新类型），共 ~35 个
- `VALID_DISTRICTS` 自动从 `GUANGZHOU_DISTRICTS` 派生（已实现，无需改 task-hall-store）

**新区 POI 规划**（每区 6-8 个，覆盖多类型）：
- 黄埔区：长洲岛、南海神庙、黄埔军校旧址、科学城绿轴、萝岗香雪公园等
- 花都区：花都湖公园、九龙湖、芙蓉嶂、石头记矿物园、圆玄道观等
- 从化区：流溪河国家森林公园、石门国家森林公园、温泉镇、溪头村、阿婆六村等
- 增城区：白水寨、增江画廊、1978文化创意园、正果老街、湖心岛等
- 南沙区：南沙天后宫、南沙湿地公园、百万葵园、蕉门河绿道、南沙游艇会等

**约束**：POI 经纬度需真实（用于地图标记），`businessHours` 用 `[开, 关]` 24 小时制，单 POI 数据 < 1KB。

### D3：主题分类支持自定义（需求 3）

**分类体系扩展**（与需求 4 联动）：

| 分类 key | 标签 | POI type | 状态 |
|----------|------|----------|------|
| walk | 散步 | park | 原有 |
| art | 看展 | art | 原有 |
| salon | 沙龙 | salon | 原有 |
| coffee | 咖啡 | cafe | 原有 |
| book | 书店 | book | 原有 |
| market | 市集 | market | 原有 |
| **sport** | 运动 | sport | **新增** |
| **music** | 音乐 | music | **新增** |
| **photo** | 摄影 | photo | **新增** |
| **food** | 美食 | food | **新增** |
| **custom** | 自定义 | null | **新增** |

**改动**：
- `guangzhou-pois.js` `POI_TYPES` 加 sport/music/photo/food 4 类（label + icon）
- `task-hall-store.js` `VALID_CATEGORIES` 加上述 4 类 + `'custom'`
- `create-task.js` `CATEGORY_DEFS` 加 4 类 + 末尾"自定义"入口
- `create-task.wxml` 主题分类 Tag 行末尾加"+ 自定义"按钮，点击弹出**底部弹层**（复用人数选择器的 `picker-panel` 模式，内含 input 输入框 + 确认/取消），与人数选择器交互一致

**自定义分类存储**：
- 任务对象新增字段 `customCategory: string`（仅 `category === 'custom'` 时有值）
- `createUserTask` 校验：`category === 'custom'` 时 `customCategory` 必填，1-6 字，trim 后非空
- 卡片展示（`toCardSummary`）：`custom` 时 `categoryLabel = customCategory`，否则取预设标签
- hall.js 筛选：`custom` 作为独立分类可筛选

**输入约束**：
- 长度 1-6 字（中文/英文/数字）
- 前端 trim，禁用纯空格
- 不做敏感词过滤（YAGNI，后续按需加）

### D4：官方出逃任务扩充（需求 4）

**目标**：从 17 条扩到 ~45 条，11 区每区 3-5 条，覆盖 10 类分类。

**改动**：
- `data/escape-master-tasks.js` `ESCAPE_MASTER_TEMPLATES` 新增 ~28 条模板
- 新模板需绑定真实 POI（`poiId` 引用 `guangzhou-pois.js`），新区新类型优先补

**模板结构**（沿用现有）：
```
{ templateId, topic, category, district, poiId, maxMembers, scheduledTime, tags, description, steps }
```

**覆盖矩阵**（每区至少 3 条，新类型至少 2 条）：
- 11 区 × 平均 4 条 ≈ 44 条
- 新类型 sport/music/photo/food 各至少 2 条（共 8+ 条）
- 新区（黄埔/花都/从化/增城/南沙）每区 3-4 条

**质量要求**：
- `description` 80-150 字，有场景感（沿用现有文风）
- `steps` 4-5 步，可执行
- `tags` 含「官方」+ 3-4 个主题标签
- `maxMembers` 3-6，`scheduledTime` 取合法值

**包体影响**：~28 条 × ~400 字节 ≈ 11KB，`escape-master-tasks.js` 总计 ~20KB，远低于 200KB 红线。

### D5：真实玩家联动（需求 5 · 混合模式）

这是本批次最复杂的改动。核心目标：**摇骰子找搭子时，能匹配到真实在线玩家，而非仅 mock 用户**。

#### 5.1 云端数据模型

**云数据库集合：`players`**
```js
{
  _openid: string,        // 微信 openid（云函数自动获取，唯一键）
  nickname: string,       // 昵称
  avatar: string,         // 头像路径
  interests: string[],    // 兴趣（food/nature/culture/sport/photo/shopping）
  district: string,       // 常驻区（如 '天河区'）
  bio: string,            // 一句话简介
  onlineStatus: 'online' | 'offline',
  lastActiveAt: Date,     // 心跳时间戳（超时判离线）
  createdAt: Date,
  updatedAt: Date
}
```

**权限**：所有用户可读（匹配需要查他人档案），仅创建者可写自己记录。

#### 5.2 云函数

**`cloudfunctions/registerPlayer/index.js`**
- 入参：`{ nickname, avatar, interests, district, bio }`（openId 从云函数上下文取）
- 逻辑：upsert 到 `players` 集合（按 `_openid` 去重），标记 `onlineStatus='online'`，更新 `lastActiveAt`
- 返回：`{ ok: true, player }` 或 `{ ok: false, errCode }`

**`cloudfunctions/matchPartners/index.js`**
- 入参：`{ count, excludeOpenIds[], district?, interests? }`
- 逻辑：
  1. 查 `players` 集合 `onlineStatus='online'` 且 `_openid` 不在 `excludeOpenIds` 的记录
  2. 按优先级排序：district+interests 双命中 > district 命中 > interests 命中 > 其他
  3. 各层内 `lastActiveAt` 倒序（最近活跃优先）
  4. 截取前 `count` 个
- 返回：`{ ok: true, partners: [...] }` 或 `{ ok: false, errCode }`
- 防御：count 非法返回空数组，不抛异常

**`cloudfunctions/heartbeat/index.js`**
- 入参：无（openId 从上下文取）
- 逻辑：更新当前用户 `lastActiveAt` 和 `onlineStatus='online'`
- 调用时机：进入大厅时 register，之后每 60s 心跳一次；离开大厅 `onUnload` 标记 offline

#### 5.3 客户端接入层

**新增 `utils/player-matcher.js`**（纯函数 + 降级协调层）

```js
// 伪代码
function matchPartners(count, filter, cloudImpl) {
  // 1. 尝试云端
  if (cloudImpl && cloudImpl.available) {
    try {
      var cloudResult = cloudImpl.matchOnlinePartners(count, filter)  // 同步包装 wx.cloud.callFunction
      if (cloudResult.ok && cloudResult.partners.length >= count) {
        return { ok: true, partners: cloudResult.partners, source: 'cloud' }
      }
      // 2. 不足 → mock 补足
      var shortage = count - cloudResult.partners.length
      var mockFill = mockPool.getMockUsers(shortage, filter)
      return { ok: true, partners: cloudResult.partners.concat(mockFill), source: 'mixed' }
    } catch (e) {
      // 3. 云端异常 → 全 mock
    }
  }
  // 4. 降级：全 mock
  return { ok: true, partners: mockPool.getMockUsers(count, filter), source: 'mock' }
}
```

**关键设计**：
- `cloudImpl` 作为依赖注入（可 mock），保证 `player-matcher.js` 本身是纯函数，可 Node 直接 require 测试
- `matchPartners` 同步签名（云函数调用用 `wx.cloud.callFunction` 的同步包装或 Promise，页面层 await）
- 返回 `source` 字段（cloud/mixed/mock）便于调试和埋点
- 真实玩家和 mock 搭子数据结构对齐（都有 openId/nickname/avatar/interests/district/bio）

**`task-hall-store.diceMatch` 改造**：
- 原 `getMockUsers(partnerCount, ...)` → 改调 `playerMatcher.matchPartners(partnerCount, filter, getCloudImpl())`
- `getCloudImpl()` 从 `app.js` 注入：`cloudReady` 为 true 且云函数可用时返回真实 impl，否则返回 null
- 其余流程（joinTask/linkRoom）不变

#### 5.4 页面接入

**`hall.js`**：
- `onLoad`：调 `registerPlayer` 注册当前用户到云端（失败静默，不阻断）
- `onUnload`：调 `heartbeat` 标记 offline（失败静默）
- `runDiceMatch`：不变（仍调 `hallStore.diceMatch`，内部走 player-matcher）
- 匹配结果弹窗：`partners` 展示时，真实玩家和 mock 视觉上不区分（都显示昵称/头像），但可加小角标「真人」便于调试（后续可去掉）

#### 5.5 降级与容错

| 场景 | 行为 |
|------|------|
| `cloudReady=false`（基础库不支持/未初始化） | 直接 mock，不调云函数 |
| 云函数调用超时（>3s） | 走 mock，记录 console.warn |
| 云端返回 0 个在线真实玩家 | 全 mock 补足 |
| 云端返回不足 | 真实 + mock 混合 |
| `players` 集合不存在 | 云函数返回空，走 mock |
| 网络断开 | 走 mock，主流程不挂 |

#### 5.6 真实玩家"数据交互"范围

本批次实现的最小可行联动：
- ✅ 真实玩家档案注册到云端（昵称/兴趣/区域可见）
- ✅ diceMatch 能匹配到真实在线玩家（看到对方昵称/头像/兴趣）
- ✅ 真实玩家能加入同一任务（joinTask 写本地 + 云端可选同步）
- ⏳ 实时聊天/状态同步（不在本批次，后续 C-P4）
- ⏳ 真实玩家发布的任务云端可见（本批次大厅列表仍读本地，云端任务同步留后续）

> 说明：混合模式下，任务列表（hall task）仍以本地存储为主，真实玩家联动聚焦在"匹配搭子"环节。这样既满足"真实玩家数据交互"的核心诉求，又不破坏现有 demo。云端任务大厅全量同步作为后续迭代。

---

## 四、测试策略（7 层，极严格）

沿用项目既定 7 层测试体系，新增模块全部接入：

| 层 | 覆盖内容 | 新增点 |
|----|----------|--------|
| 单元测试 | 纯函数逻辑 | `player-matcher.js`（降级/mixed/mock 三分支）、`task-hall-store` 自定义分类校验、`guangzhou-districts` 11 区完整性、`escape-master-tasks` 模板字段完整性 |
| Gherkin BDD | 端到端场景 | 人数选择器交互、自定义分类创建、真实玩家匹配+降级、11 区筛选 |
| Property Fuzz | 随机输入不崩 | player-matcher 任意 count/filter/cloudImpl 组合、自定义分类任意输入 |
| Adversarial | 对抗攻击 | 云函数注入 __proto__、customCategory 超长/脚本注入、count 负数/NaN |
| Mutation | 变异测试 | 降级分支、count 计算、openId 排除、customCategory 截断、11 区派生 |
| Coverage | 覆盖率 | player-matcher 函数 ≥90%/行 ≥85%、task-hall-store 新分支 |
| QA | 契约检查 | 11 区×10 类覆盖矩阵、POI 引用完整性、自定义分类字段一致性 |

**关键测试设计**：
- `player-matcher` 降级测试：注入 `cloudImpl.available=false` / `cloudImpl.matchOnlinePartners` 抛异常 / 返回不足，验证 mock 补足
- 真实玩家匹配：注入 mock cloudImpl 返回 2 个真实玩家，count=4，验证结果 2 真 + 2 mock
- 自定义分类：`category='custom'` + `customCategory='运动'`，验证卡片展示和筛选
- 11 区完整性：`GUANGZHOU_DISTRICTS.length === 11`，每个区有 `getDistrictByName` 命中
- POI 引用：每条 master template 的 `poiId` 都能在 `guangzhou-pois.js` 找到

**云函数测试**：
- 云函数代码用 `mock-wx` 测试（注入 mock cloud 数据库）
- 真机部署验证留给用户（公司电脑无法部署云函数）

---

## 五、实施顺序与依赖

```
D1 人数 bug（独立，最先做，解锁真机验证）
  ↓
D2 11 区 + POI（D4 依赖）
  ↓
D3 分类扩展（D4 依赖）
  ↓
D4 官方任务扩充（依赖 D2 POI + D3 分类）
  ↓
D5 真实玩家联动（独立于 D1-D4，可并行）
  ↓
7 层测试接入 + 全量回归
```

**工作量估算**：
- D1：0.5h（单点修复）
- D2：2h（5 区数据 + 35 POI）
- D3：1.5h（分类扩展 + 自定义入口 + 校验）
- D4：2h（28 条模板编写）
- D5：4h（3 云函数 + player-matcher + 页面接入 + 降级测试）
- 测试：3h（7 层接入）
- 合计：~13h

## 六、风险与约束

1. **云函数部署**：公司电脑无法部署云函数，D5 的真机验证需用户在开发者工具操作（部署 `registerPlayer`/`matchPartners`/`heartbeat` 三个云函数）
2. **未认证个人小程序限制**：`wx.cloud.callFunction` 需要云开发环境，当前 env `dev1-d2gchwpba51a6091b` 已就位，但真实玩家注册需多设备测试
3. **包体红线**：D2+D4 新增数据 ~30KB，主包估算从 210KB → ~240KB，仍远低于 1.5MB 红线
4. **mock 与真实玩家混合**：同一局可能有真实玩家 + mock 搭子，需确保 `joinTask` 逻辑对两者一致（已对齐数据结构）
5. **自定义分类筛选**：hall.js 筛选 Tag 行会变长（10 类 + 自定义），需横向滚动 + "全部"首项（已实现 scroll-x）

## 七、不在本批次范围（YAGNI）

- 真实玩家实时聊天/状态同步（留 C-P4）
- 云端任务大厅全量同步（留后续）
- 自定义分类敏感词过滤（按需加）
- 真实玩家评价/信任系统（留后续）
- 跨城市扩展（当前聚焦广州 11 区）
