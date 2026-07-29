# 地图真实定位 + 新指令体系 + 执行进度持久化

## Context（为什么做这个改动）

用户反馈两个问题：

1. **地图页显示在北京，而非用户实际位置（广州）**。根因有三：① `app.json` 的 `requiredPrivateInfos` 只声明了 `chooseLocation`，**缺 `getLocation`**，导致新版基础库下 `wx.getLocation` 静默失败，`globalData.location` 恒为 null；② `pages/map/map.js` 把 `mapCenter` 硬编码成北京坐标 (39.9042, 116.4074)；③ `scanNearbyPOI()` 返回的是全硬编码 mock，与真实位置无关，指令推荐是「拟定的抽象系统指令」而非基于真实城市/周边商铺/打卡点。
2. **执行指令页中途退出/锁屏/进程被清除后步骤进度丢失**。根因：`executing.js` 的 `onStepTap` 只改 page data 的 `done` 状态，从不持久化；`onLoad` 重建步骤全为 `done:false`；`onUnload/onHide` 不存进度。同频执行页 `group/escape-record.js` 同样问题。

目标：获取真实定位（全国各省市通用）、新增基于真实周边商铺/打卡点的指令推荐体系（云函数+腾讯地图）、执行进度全程留痕可追溯（步骤状态+完成时间戳，冷启动可续）。

已确认决策：POI 数据源用**云函数+腾讯地图 WebService**（key 藏云函数环境变量）；腾讯地图 key 用户**尚未申请**（方案含申请步骤+无 key 降级）；持久化做**步骤 done 状态 + currentStep + 计时 + 每步完成时间戳**。

---

## 需求1：真实定位 + 新指令体系

### 1.1 修复定位授权配置（根因修复）
**文件**：`app.json`
- `requiredPrivateInfos` 从 `["chooseLocation"]` 改为 `["chooseLocation", "getLocation"]`（行80-82）
- `permission.scope.userLocation` 已存在（行75-79），无需改

这一步是定位失败的直接根因，不加 `getLocation` 声明，新版基础库下 `wx.getLocation` 必失败。

### 1.2 新建云函数 `cloudfunctions/poiSearch/`
复用 `cloudfunctions/createRoom/` 的结构（wx-server-sdk + cloud.init + exports.main），用 Node 内置 `https` 模块调腾讯地图（不引第三方 http 库，免 node_modules 上传问题）。

**文件**：
- `cloudfunctions/poiSearch/index.js`
- `cloudfunctions/poiSearch/package.json`（依赖仅 `wx-server-sdk`）
- `cloudfunctions/poiSearch/config.json`（如需）

**index.js 逻辑**：
```
exports.main = async (event) => {
  // 入参：{ lat, lng, categories? }
  // 1. 读 process.env.TENCENT_MAP_KEY，无则 return { ok:false, errCode:'NO_MAP_KEY' }
  // 2. 逆地理：GET https://apis.map.qq.com/ws/geocoder/v1/?location=lat,lng&key=KEY
  //    → 取 city, district → 组装 locationName = `${city}·${district}`
  // 3. 周边搜索：GET https://apis.map.qq.com/ws/place/v1/explore
  //    ?location=lat,lng&key=KEY&category=<分类>&radius=1000&offset=10&page=1
  //    对多分类（美食:咖啡 / 公园 / 文化:博物馆 / 便利店 / 书店 / 市场）并发请求
  //    → 每条取 name/address/location/_distance/category
  // 4. 合并去重（按 name+坐标），按 _distance 排序
  // 5. return { ok:true, city, district, locationName, pois: [...] }
  //    降级：任一请求失败仍返回已拿到的部分；全失败 return { ok:false, errCode:'MAP_API_FAIL' }
}
```
POI 输出结构：`{ id, name, address, latitude, longitude, category, distance, type }`（`type` 映射到指令类型 color/sense/food/walk/collect/culture）。

**部署**：上传并部署：云端安装依赖（不上传 node_modules）。云函数环境变量配 `TENCENT_MAP_KEY`。

### 1.3 新建纯函数 `utils/poi-command-builder.js`
零 wx 依赖，Node 可直接 require 测试（参考 `utils/record-builder.js` 模式）。把真实 POI 列表转成带具体地点的指令。

```
buildCommands(pois, prefs, ctx) -> Command[]
// ctx: { hour, weather, mode }
// 每条 POI → 一条指令：
//   { id:'poi_<poiId>', content:`去「${name}」打卡`, type: mapType(poi.category),
//     duration: estimateDuration(type), outdoor:true, nightSafe:..., rainy:...,
//     requirePOI:null, location:{latitude,longitude,name,address}, poiId, cost:... }
// 加权：prefs.type 偏好的类型 POI 排前
// 过滤：营业时间(复用 engine POI_HOURS)、安全(复用 engine filterBySafety 思路)
// 返回最多 N 条（如 20），保证多样性（每类型至少 1 条）
```
与现有 223 条抽象指令池**并存**：POI 指令注入 `commandPool` 头部，引擎既有过滤逻辑（90 天去重、类型抑制、营业时间）继续生效。POI 指令因带 `location`，完成后记录自动带坐标 → 地图标记，闭环。

### 1.4 app.js 改造
- `checkLocation()`（行261-279）成功回调：保留 `reverseGeocode`（客户端逆地理，有 key 时快），**新增调云函数** `fetchNearbyPOI(lat,lng)`：
  - `wx.cloud.callFunction({ name:'poiSearch', data:{lat,lng} })`
  - 成功：`globalData.nearbyPOI` = 真实 POI 类型集合（替换行348 mock）；`globalData.currentCity` = 云函数返回 city；`globalData.locationName` = `${city}·${district}`；`globalData.nearbyPOIList` = POI 数组
  - 失败/无 key：保持现有 mock `nearbyPOI`（行348）+ locationName「当前位置附近」降级，主流程不挂
- 新增 `fetchNearbyPOI(lat,lng)` 方法，参考 `fetchWeather()`（行300-333）的降级模式
- `initCommandPool()`（行215-225）：加载 POI 指令——若 `globalData.nearbyPOIList` 有值，调 `poi-command-builder.buildCommands()` 注入 commandPool 头部
- `_buildEngineCtx()`（行372-393）：`nearbyPOI` 用真实数据（已是 globalData）

### 1.5 map.js 改造
- 行39：`mapCenter` 初始值改为 `null`（去掉北京硬编码）
- `refresh()`（行110-116）：fallback 链调整为 `globalData.location || homePoint || (有记录取首条) || 提示定位`
- `onShow`：若 `globalData.location` 存在且 mapCenter 为 null，设为中心并 `mapCtx.moveToLocation()`
- 无定位且无记录时：展示「开启定位，查看你的出逃地图」空状态，不显示北京
- `loadCurrentCity()`（行88-96）：用 `globalData.currentCity`（云函数逆地理写入），不再回退「未定位」

### 1.6 腾讯地图 key 申请与配置（写进方案，用户自行申请）
1. 申请：https://lbs.qq.com/ 注册 → 创建应用 → 添加 key（产品选「WebService API」，勾选所需产品）
2. 配置：微信开发者工具 → 云开发控制台 → 云函数 `poiSearch` → 环境变量 → 添加 `TENCENT_MAP_KEY=<你的key>`
3. 重新部署 `poiSearch` 云函数
4. key 未配置前：云函数返回 `NO_MAP_KEY`，app.js 降级到 mock nearbyPOI + 抽象指令池，主流程可用但不带真实 POI 推荐

---

## 需求2：执行进度持久化（全程留痕可追溯）

### 2.1 数据结构
进度挂在 `currentCommand.executionProgress`（复用 `saveCurrentCommand`，无需新 storage key）：
```
currentCommand.executionProgress = {
  steps: [{ id, text, done, completedAt }],  // completedAt = 时间戳，未完成时为 null
  currentStep: number,
  lastActiveAt: number                        // 最近一次操作时间，用于断点续做提示
}
```
冷启动恢复链路已存在：`loadLocalData()`（行176-180）恢复 currentCommand → executing `onLoad` 从 `cmd.executionProgress` 恢复 steps done 状态。

### 2.2 executing.js 改造
- `onLoad`（行44-67）：构建 steps 后，若 `cmd.executionProgress` 存在，用其 `steps[].done` 覆盖本地 steps 的 done 状态、`currentStep`、`doneCount`；无则全 false（现状）
- `onStepTap`（行117-128）：标记 done 时同步写入 `cmd.executionProgress.steps[index].done = true` + `completedAt = Date.now()`，更新 `currentStep`/`lastActiveAt`，调 `app.saveCurrentCommand()` 持久化（参考行153 `takePhoto` 的持久化模式）
- 新增 `onHide()`：调 `app.saveCurrentCommand()` 保存当前进度（应对切后台/锁屏）
- `onUnload`（行71）：在 `stopTimer()` 前补 `app.saveCurrentCommand()`
- `tickTimer`（行89-104）：不变（startTime 在 cmd，已持久化，冷启动后 elapsed 自动续算）

### 2.3 group/escape-record.js 改造
同步改造：`onStepTap`（行119-129）持久化 done+completedAt 到 `app.globalData.currentGroupScript.executionProgress`；`applyScript`（行71-92）恢复进度；`onUnload`（行41-43）保存。因同频剧本不在 currentCommand，需把 executionProgress 存到 `currentGroupScript` 并额外 `wx.setStorageSync('currentGroupScript', ...)` 持久化（冷启动恢复同频进度）。

### 2.4 完成时留痕写入记录
`utils/record-builder.js` 的 `buildRecord`：同频记录已有 `steps` 字段（文本数组）。扩展：当 `recordData.executionProgress` 存在时，把 `steps` 升级为 `[{text, completedAt}]` 对象数组写入 record，实现事后可追溯每步完成时间。普通记录同样处理。最终 record 带 steps 时间戳 → 时间线/记录详情页可展示「第几步何时完成」。

---

## 测试方案（接入现有 7 层体系）

### 新增纯函数测试
- `tests/unit/poi-command-builder.test.js`：覆盖 POI→指令映射、类型加权、营业时间过滤、多样性保证、边界（空 POI/异常 POI）、不变性（不污染入参）。参考 `tests/unit/record-builder.test.js` 风格
- `tests/unit/record-builder.test.js` 扩展：executionProgress → steps 时间戳留痕的用例

### 持久化测试
- `tests/unit/execution-progress.test.js`：新建纯函数 `utils/execution-progress.js` 封装进度初始化/标记完成/恢复逻辑（零 wx 依赖，便于测试）。覆盖：初始化、标记第 N 步完成写 completedAt、恢复 done 状态、全完成判定、时间戳递增
- Gherkin 场景（`tests/gherkin/group-flow.feature` 或新 `execution-flow.feature`）：「执行第2步后退出 → 冷启动恢复 → 第1/2步已完成」「每步 completedAt 递增」「全部完成后 record 含步骤时间戳」

### 云函数测试
- 云函数无法 Node 直测，写 `tests/unit/poi-search-mock.test.js`：mock https 响应，验证解析/去重/降级逻辑（把云函数的解析函数抽成可导出的纯函数测试）
- QA 检查 `tests/qa/check.js` 加：`requiredPrivateInfos` 含 getLocation、`cloudfunctions/poiSearch/index.js` 存在、`utils/poi-command-builder.js` 导出、`utils/execution-progress.js` 导出、executing.js 含 onHide/saveCurrentCommand、executionProgress 字段契约

### 变异测试 + 覆盖率
- `tests/mutation/mutation-test.js` 加 poi-command-builder / execution-progress 的变异算子（类型映射、加权、completedAt 时间戳、恢复逻辑）
- `tests/coverage/coverage-report.js` 的 sources 数组加两个新纯函数
- `tests/run-all.js` 加新测试套件

### 关键文件清单
**新建**：
- `cloudfunctions/poiSearch/index.js` + `package.json`
- `utils/poi-command-builder.js`（纯函数）
- `utils/execution-progress.js`（纯函数）
- `tests/unit/poi-command-builder.test.js`
- `tests/unit/execution-progress.test.js`

**修改**：
- `app.json`（requiredPrivateInfos 加 getLocation）
- `app.js`（fetchNearbyPOI、initCommandPool 注入 POI 指令、checkLocation 调云函数）
- `pages/map/map.js`（去北京默认、用真实定位作中心、loadCurrentCity 用真实城市）
- `pages/executing/executing.js`（onLoad 恢复、onStepTap 持久化、onHide/onUnload 保存）
- `pages/group/escape-record/escape-record.js`（同步持久化）
- `utils/record-builder.js`（executionProgress → steps 时间戳）
- `tests/qa/check.js`、`tests/mutation/mutation-test.js`、`tests/coverage/coverage-report.js`、`tests/run-all.js`、`tests/gherkin/*.feature`

---

## 验证方式

1. **定位**：开发者工具 → 模拟器 → 选择位置（如广州天河）→ 打开地图页，确认中心在广州、城市名显示「广州·天河」而非北京/未定位
2. **POI 指令**：配置 `TENCENT_MAP_KEY` 云函数环境变量并部署 poiSearch → 摇骰子，确认出现「去「XX咖啡馆」打卡」类带具体地点的指令；未配 key 时降级到抽象指令池不报错
3. **进度持久化**：执行页完成第 2 步 → 切后台/锁屏/清进程 → 重进小程序 → 首页提示「继续未完成出逃」→ 进入执行页，确认第 1/2 步已完成、计时连续
4. **留痕**：完成出逃 → 记录详情/时间线，确认 steps 带每步完成时间戳
5. **测试**：`node tests/run-all.js` 全绿（含新套件）；`node scripts/check-bundle.js --base=origin/dev` 零新增资源；`node scripts/check-syntax.js` + `node scripts/final-check.js` 通过
6. **真机**：iOS/Android 真机验证定位授权弹窗、后台返回进度恢复（模拟器无法完全模拟进程清除）

## 实施顺序建议
1. app.json 修 requiredPrivateInfos（1 行，立即修好定位根因）
2. 执行进度持久化（需求2，独立闭环，先做）→ executing.js + execution-progress.js + record-builder + 测试
3. 云函数 poiSearch + 腾讯地图 key 申请指引
4. poi-command-builder + app.js 注入 + map.js 改造（需求1 主体）
5. 全量测试接入 + 验证
