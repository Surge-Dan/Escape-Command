# 首页 3 骰子入口 Spec

> Spec ID: `home-dice-entry-01`
> 对应功能表：序号 15（核心骰子入口）+ 序号 17（出逃方式选择）
> 分支：`feature/home-02`（与功能表分支一致，PR 标题用 `[EC-015][EC-017] 首页：3 骰子入口与出逃方式选择`）
> 创建日：2026-07-28
> 负责人：Daniel

## Why

现状首页是「单骰子卡片 + 顶部模式 Tag 弹底部 Sheet 选模式」两层交互，用户要先点 Tag 再选模式再点骰子，路径长且模式藏在弹层里不直观。改造为「3 个骰子 Cover Flow 横滑切换」，让出逃方式直接可见可滑动，单次操作即达。同时微逃骰子下钻到时长档位弹窗，引入基于历史完成时长的智能推荐，让推荐时长贴合用户实际行为。

## What Changes

### 新增

- 首页核心区改为 **3 骰子 Cover Flow 横滑**（微逃 / 破圈 / 同频）
  - 中间骰子 scale=1.0 不透明，两侧 scale=0.7 透明度 0.5
  - 右滑切换下一骰子到中间位
  - 底部 3 个圆点指示当前位
  - 中间骰子下方显示模式名 + 描述
- **微逃细分弹窗**（底部 Sheet）：4 档时长（5/10/15/20min），高亮智能推荐档
- **智能推荐时长逻辑**：放 `utils/duration-recommender.js` 新文件
  - 读 `wx.getStorageSync('records')` 取最近 10 条 `mode==='micro'` 记录的 `duration`
  - 计算中位数，匹配到最近档位
  - 新用户（records 中 micro 模式 < 3 条）默认 15min
- 点击分流：
  - 微逃 → 弹微逃细分窗 → 选档位 → 跳 `/pages/generating?mode=micro&duration=<值>`
  - 破圈 → 跳 `/pages/generating?mode=breakthrough`
  - 同频 → 跳 `/pages/group/create`（同频组局 C 阶段入口，本轮仅占位跳转）

### 删除

- [pages/index/index.wxml](file:///c:/Program%20Main/TRAEWork/Projects/%E5%87%BA%E9%80%83%E6%8C%87%E4%BB%A4/escape-command/pages/index/index.wxml) 第 31-35 行顶部 mode-tag（icon + 名称 + 箭头）
- [pages/index/index.wxml](file:///c:/Program%20Main/TRAEWork/Projects/%E5%87%BA%E9%80%83%E6%8C%87%E4%BB%A4/escape-command/pages/index/index.wxml) 第 169-192 行底部 mode-sheet-mask + mode-sheet 弹层
- [pages/index/index.js](file:///c:/Program%20Main/TRAEWork/Projects/%E5%87%BA%E9%80%83%E6%8C%87%E4%BB%A4/escape-command/pages/index/index.js) 中 `showModeSheet / onModeTagTap / onModeOptionTap / closeModeSheet` 等方法（需先 grep 确认无其他页面引用）

### 不修改

- `app.js` 的 `rollCommand` 等生成逻辑（生成引擎 B 阶段另做）
- `pages/generating/*`（generating 页动画保留 `dice-animation-01` Spec 单独做）
- `utils/constants.js` 的 `SHEET_MODES` 和 `MODE_LIST`（不破坏其他引用，新增 `HOME_DICE_LIST` 并行）
- 同频组局 C 阶段所有页面（本轮只占位跳转）

## Impact

- Affected specs: `dice-animation-01`（generating 页动画，互不冲突，可并行开发）
- Affected code:
  - `pages/index/index.wxml`（核心区重构 + 删 mode-tag/mode-sheet）
  - `pages/index/index.wxss`（Cover Flow 样式 + 微逃弹窗样式 + 删 mode-tag/mode-sheet 样式）
  - `pages/index/index.js`（删 mode-tag 相关方法 + 加 Cover Flow 状态机 + 加微逃弹窗逻辑）
  - `utils/constants.js`（新增 `HOME_DICE_LIST` 导出，不动 `SHEET_MODES`/`MODE_LIST`）
  - `utils/duration-recommender.js`（**新增**）
- 不影响其他模块页面，回滚安全

## ADDED Requirements

### Requirement: 首页 3 骰子 Cover Flow 布局
系统 SHALL 在首页核心区以 Cover Flow 形式展示 3 个骰子（微逃/破圈/同频），中间骰子放大不透明，两侧骰子缩小半透明，支持右滑切换。

#### Scenario: 默认展示
- **WHEN** 用户进入首页且未选中指令
- **THEN** 核心区显示 3 个骰子横排
- **AND** 默认中间位是「微逃」骰子（`currentDiceIndex=0`）
- **AND** 两侧「破圈」「同频」骰子 scale=0.7、opacity=0.5
- **AND** 底部 3 个圆点指示当前位，第 1 个圆点高亮
- **AND** 中间骰子下方显示「微出逃」+「碎片时间，快速出逃」

#### Scenario: 右滑切换
- **WHEN** 用户在骰子区右滑（手势距离 > 40px）
- **THEN** `isSliding=true`，下一骰子滑入中间位
- **AND** 滑动动画持续 300ms，使用 `transform: translateX` + `scale` 过渡
- **AND** 滑动期间禁止点击
- **AND** 滑动结束后 `isSliding=false`，圆点指示器更新

#### Scenario: 边界回弹
- **WHEN** 当前已在最后一个骰子（同频，index=2）继续右滑
- **THEN** 骰子区轻微回弹后停在原位，不循环到第一个

#### Scenario: 左滑
- **WHEN** 用户左滑（手势距离 > 40px）
- **THEN** 上一骰子滑入中间位（与右滑对称）
- **AND** 在第一个骰子（index=0）左滑时回弹不循环

### Requirement: 点击骰子分流
系统 SHALL 根据当前中间骰子的类型分流到不同后续页面。

#### Scenario: 点击微逃骰子
- **WHEN** 中间骰子是「微逃」且用户点击
- **THEN** 弹出微逃细分弹窗（`showMicroSheet=true`）
- **AND** 弹窗内高亮显示智能推荐时长档位

#### Scenario: 点击破圈骰子
- **WHEN** 中间骰子是「破圈」且用户点击
- **THEN** 跳转 `/pages/generating?mode=breakthrough`
- **AND** 不经过弹窗

#### Scenario: 点击同频骰子
- **WHEN** 中间骰子是「同频」且用户点击
- **THEN** 尝试跳转 `/pages/group/create`
- **AND** 若该页未实现（C 阶段未启动），跳转 fail 时 toast「同频组局即将开放」并停留在首页
- **AND** 若该页已实现（C-01 完成后），正常跳转进入创建房间流程

#### Scenario: 滑动中点击
- **WHEN** `isSliding===true` 时用户点击骰子
- **THEN** 忽略点击

### Requirement: 微逃细分弹窗
系统 SHALL 在用户点击微逃骰子后弹出底部 Sheet，提供 4 个时长档位选择，并高亮智能推荐档位。

#### Scenario: 弹窗展示
- **WHEN** `showMicroSheet=true`
- **THEN** 底部 Sheet 从下滑入，含 4 个时长档位：5 / 10 / 15 / 20 分钟
- **AND** 智能推荐档位高亮（边框 + 「推荐」标签）
- **AND** 底部有「开始出逃」按钮，初始禁用，选中档位后启用

#### Scenario: 选择档位
- **WHEN** 用户点击某个档位
- **THEN** 该档位高亮，其他档位取消高亮
- **AND** 「开始出逃」按钮启用
- **AND** 默认选中推荐档位，弹窗打开即可直接点「开始」

#### Scenario: 确认开始
- **WHEN** 用户选中档位后点击「开始出逃」
- **THEN** 关闭弹窗
- **AND** 跳转 `/pages/generating?mode=micro&duration=<选中档位>`

#### Scenario: 取消
- **WHEN** 用户点击遮罩或「取消」
- **THEN** 关闭弹窗，停留在首页

### Requirement: 智能推荐时长
系统 SHALL 根据用户历史 micro 模式完成时长，推荐最贴合的档位。

#### Scenario: 有历史数据
- **WHEN** `wx.getStorageSync('records')` 中 `mode==='micro'` 的记录 ≥ 3 条
- **THEN** 取最近 10 条 micro 记录的 `duration` 字段
- **AND** 计算中位数
- **AND** 匹配到最近的档位（5/10/15/20）作为推荐档
- **AND** 该档位在弹窗中高亮并带「推荐」标签

#### Scenario: 新用户无足够历史
- **WHEN** micro 模式记录 < 3 条
- **THEN** 推荐档位默认为 15 分钟
- **AND** 不显示「推荐」标签（避免新用户被算法感干扰）

#### Scenario: 历史记录为空
- **WHEN** records 为空数组或不存在
- **THEN** 同新用户处理，推荐 15 分钟，不显示「推荐」标签

## MODIFIED Requirements

### Requirement: 首页核心出逃卡片
**原行为**：首页核心区显示 1 个骰子卡片，顶部有模式 Tag（点击弹底部 Sheet 选模式），点击卡片调用 `rollCommand`。

**新行为**：首页核心区显示 3 个骰子 Cover Flow，无顶部 Tag，无底部模式 Sheet。点击中间骰子按类型分流（微逃弹窗/破圈跳转/同频跳转），不再直接调用 `rollCommand`。

**迁移**：`rollCommand` 方法保留在 [pages/index/index.js](file:///c:/Program%20Main/TRAEWork/Projects/%E5%87%BA%E9%80%83%E6%8C%87%E4%BB%A4/escape-command/pages/index/index.js) 中供指令详情卡的「重摇」按钮使用，不受影响。

## REMOVED Requirements

### Requirement: 顶部模式 Tag
**Reason**：模式选择已下沉到 3 骰子 Cover Flow，Tag 冗余。
**Migration**：删除 [index.wxml#L31-L35](file:///c:/Program%20Main/TRAEWork/Projects/%E5%87%BA%E9%80%83%E6%8C%87%E4%BB%A4/escape-command/pages/index/index.wxml#L31-L35) 的 mode-tag DOM 和对应 wxss、js 方法。需先 grep 确认 `onModeTagTap` 无外部调用。

### Requirement: 底部模式选择 Sheet
**Reason**：被微逃细分弹窗（仅微逃）替代，不再承担跨模式选择职责。
**Migration**：删除 [index.wxml#L169-L192](file:///c:/Program%20Main/TRAEWork/Projects/%E5%87%BA%E9%80%83%E6%8C%87%E4%BB%A4/escape-command/pages/index/index.wxml#L169-L192) 的 mode-sheet-mask + mode-sheet DOM 和对应 wxss、js 方法。`SHEET_MODES` 常量保留不动。

---

## 验收标准（来自功能表）

序号 15（核心骰子入口）：
1. ✅ 页面中心展示出逃骰子（3 个 Cover Flow 形式）
2. ✅ 所需信息完整展示且与数据一致（模式名/描述/圆点指示器）
3. ✅ 加载、空态、失败态和长文本不破版
4. ✅ 点击区域不小于 88rpx

序号 17（出逃方式选择）：
1. ✅ 选项可选中、修改并持久化（当前骰子 index 写入 `wx.setStorageSync('lastDiceIndex')`，下次进入恢复）
2. ✅ 生成与推荐实际读取该值（generating 页通过 url 参数读取 mode/duration）
3. ✅ 空值、边界值和历史旧值均有兼容兜底（records 为空走新用户默认 15min）
4. ✅ 微逃弹窗高亮推荐档位

## 测试要求

- 微信开发者工具编译通过，Console 无新错误
- 模拟器：iOS 14（iPhone X 模拟）+ Android 10（Pixel 2 模拟）各一次
- 真机：P0 任务，至少一台真机过 happy path
- 三个脚本：`check-syntax FAIL=0`、`final-check WXML FAIL=0 / 页面 FAIL=0 / TabBar 完整`、`release-check 通过`
- 智能推荐逻辑单测：`utils/duration-recommender.js` 写 3 个 case（有历史/历史不足/空记录）

## 风险

- **包体**：3 个骰子 SVG 已存在（dice-5-white、sprout-brand-strong、footprints-coral），新增 ≤ 1KB（Cover Flow CSS）
- **兼容性**：Cover Flow 用 `transform: scale + translateX`，基础库 ≥ 2.0 全支持
- **联动**：删除 mode-tag 相关方法前必须 grep `onModeTagTap / onModeOptionTap / closeModeSheet / showModeSheet` 在全项目无外部引用
- **回滚**：改动集中在首页 + 新增 1 个 utils 文件，revert PR 即可

## 跨模块联动

- `pages/generating` 需要支持读取 url 参数 `mode=breakthrough` 和 `mode=micro&duration=N`（若 generating 当前未读取 url 参数，需在本 Spec 顺手补 `onLoad(options)` 解析，作为最小必要改动）
- `pages/group/create` 占位页：本轮若该页不存在，跳转 fail 时 toast 即可，C 阶段 Spec 再实现
- 不影响 map/profile/badges 等其他模块
