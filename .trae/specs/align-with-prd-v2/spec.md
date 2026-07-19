# 出逃指令 v2 全量对齐 PRD 修复 Spec

## Why

当前小程序与 `docs/PRD-v2.md` / `UX-SPEC-v2.md` / `UI-SPEC-v2.md` / `TASKS-v2.md` 存在系统性差距：三个核心出逃模式（微出逃 / 双人出逃 / 城市漫游）要么数据被颜色覆盖 bug 屏蔽、要么按 PRD 被隐藏但用户现要求开放；多个二级页面（收藏 / 徽章 / 设置）因 `navigationStyle` 配置错误导致原生非圆角导航栏与自定义圆角头部叠放，视觉割裂；收藏页布局存在硬编码高度、固定卡片高、双重头部等多重 bug；会员页 CSS 变量缺失、tab bar 占位高度不一致、微出逃 typeColor 被归一化覆盖、地图坐标硬编码、音效开关空功能等散落问题。本 spec 目标是**一次性把所有与 PRD 的差距和已知 bug 全部修平**，让小程序达到 PRD v2 描述的完整可测试状态。

## What Changes

### A. 三个出逃模式全部可见且可用
- **微出逃**：修复 `normalizeCommand` 把 micro 指令 typeColor 覆盖成 walk 橙色的 bug，恢复绿色 `#7BAE7F`；确认 `rollCommand('micro')` 过滤 `duration < 15`；首页模式芯片可见且高亮正常。
- **城市漫游**：确认 `rollCommand('walk')` 过滤 `outdoor !== false`；芯片可见；选中态图标缺失问题用 `footprints-white.svg` 复用或生成默认态。
- **双人出逃**：**BREAKING（覆盖 PRD §3.2 隐藏决策）**——按用户明确要求改为可见模式。芯片显示，过滤 `double === true || social === true`；指令详情卡新增"邀请朋友"按钮，触发 `wx.shareAppMessage` 邀请，分享 path 带 `mode=double&cmd=<id>` 参数；被邀请方打开时若 path 含该参数，自动定位到对应指令并显示"等待朋友一起出逃"状态。MVP 不做实时通信，仅做分享邀请 + 本地记录搭档。

### B. 导航栏圆角修复（双重头部 bug）
- `pages/collection/collection.json`、`pages/badges/badges.json`、`pages/settings/settings.json`、`pages/member/member.json` 的 `navigationStyle` 从 `default` 改为 `custom`，让原生导航栏不再出现，只保留自定义圆角头部。
- 同步修正各页 scroll-view 高度计算，从硬编码 `calc(100vh - 200rpx)` 改为基于 `app.globalData.navBarHeight` 动态计算。

### C. 我的收藏页布局重构
- 移除双重头部（见 B）。
- 卡片高度从固定 `280rpx` 改为 `min-height` + 内容自适应。
- 右侧图片宽高比统一为 4:3，`mode: aspectFill` 保留。
- 移除按钮触控区扩大到 88rpx × 88rpx。
- 空状态文案对齐 PRD：`♡ 还没有收藏任何指令`，引导按钮改为 `去首页摇一个`（PRD 已砍创建功能，原 `去创建专属指令` 文案冲突）。
- `onLongPress` 不再 hack 构造 event，直接调内部方法。
- scroll-view 高度动态计算。

### D. TabBar 与占位高度统一
- `app.wxss` 的 `.tabbar-placeholder` 与 `custom-tab-bar/index.wxss` 的占位高度统一为 `calc(180rpx + env(safe-area-inset-bottom))`（按实际浮岛高度 160rpx + 距底 40rpx）。
- 确认 TabBar 圆角浮岛形态符合 PRD（当前 `border-radius: 48rpx` 已符合，仅需修上面占位不一致）。

### E. 微出逃 typeColor 修复（数据层）
- `app.js:normalizeCommand` 不再强制用 `meta.color` 覆盖 `typeColor`，改为：若原始 `typeColor` 存在则保留，否则用 `meta.color` 兜底。
- 同时清理 `data/commands.js`、`utils/constants.js`、`app.js` 三处重复的 typeAlias / defaultSteps 逻辑，统一收敛到 `utils/constants.js`。

### F. 会员页 CSS 变量修复
- `app.wxss` 补充缺失变量：`--lemon-tint: #FFF4C7`、`--brand-strong: #45B08C`（即 `--brand-dark`，做别名）。
- 或 `member.wxss` 改用已有变量。采用前者（补变量）以减少回归。

### G. 地图页修复
- 默认坐标不再硬编码广州，改为：有 `globalData.location` 时用真实位置，无则用 `wx.getLocation` 失败后 fallback 广州。
- 移除 `Math.random()` 偏移生成坐标的逻辑：无 location 的 record 不在地图上落点（或显示在中心带"未知位置"标签）。
- 修复 `showMore` 中 `onShareAppMessage()` 死逻辑：改用 `wx.showShareMenu` 或直接调用 `this.onShareAppMessage()` 的返回值传给 `wx.showActionSheet` 后手动触发——MVP 改为直接 `wx.showShareMenu({ withShareTicket: true })`。

### H. 记录页 Canvas 单位修复
- `record.wxss` 的 canvas 从 `width: 600px; height: 900px; left: -9999rpx` 改为统一 rpx 或绝对 px 离屏定位（Canvas 2D 内部坐标系用 px，外层定位用 rpx 即可，但需明确注释）。

### I. 音效开关落地
- `app.js` 新增 `playSound(name)` 方法，用 `wx.createInnerAudioContext` 播放 `assets/audio/` 下音效（点击 / 摇骰 / 完成 / 解锁）。
- 若音效文件不存在，开关保留但 `playSound` 静默 fallback（不报错）。
- 在首页摇骰、执行页完成、记录页保存、徽章解锁四处接入。

### J. 死代码与硬编码清理
- `pages/map/map.js` 删除 `showMore` 死分享分支。
- `pages/profile/profile.js` 删除注释的 `goMember`/`openMember`（PRD 隐藏会员入口，但页面保留以备后用——此处仅清 profile 侧死代码，member 页面保留）。
- `pages/record/record.js` 的 `latte.webp` fallback 改为从指令 `scene` 字段取场景插画，无则用统一占位。
- `pages/collection/collection.wxml` 的 `coffee-shop.webp` fallback 同上。
- `pages/member/member.js` 的 `expireDate` 硬编码改为基于 `Date.now() + 365天` 计算。
- `app.js` 的 `escapeCode` 默认值与 PRD 一致。

### K. 问候语截断修复
- `pages/index/index.wxss` 问候语 `white-space: nowrap` 改为允许换行或缩字号，避免 `广州·天河 26℃ 晴` 被截断。

## Impact

- **Affected specs**: PRD-v2 §2.1（出逃模式）、§3.2（双人出逃隐藏决策——本次覆盖）、FR-1（首页）、FR-7（收藏）、FR-8（设置）、FR-6（徽章）、UI-SPEC §4.4（TabBar）、ASSETS-INVENTORY（模式芯片图标）。
- **Affected code**:
  - `app.js`（normalizeCommand、playSound、坐标 fallback）
  - `app.wxss`（CSS 变量补全、tabbar-placeholder 统一）
  - `app.json`（无变化）
  - `data/commands.js`（去重归一化逻辑）
  - `utils/constants.js`（收敛 typeAlias / DEFAULT_STEPS）
  - `custom-tab-bar/index.wxss`（占位高度统一）
  - `pages/index/index.{js,wxml,wxss}`（模式芯片、双人邀请、问候语）
  - `pages/collection/collection.{json,wxml,wxss,js}`（布局重构）
  - `pages/badges/badges.json`、`pages/settings/settings.json`、`pages/member/member.{json,wxss,js}`（导航修复 + 变量修复）
  - `pages/map/map.js`（坐标 + 死代码）
  - `pages/record/record.{wxss,js}`（Canvas + fallback）
  - `pages/executing/executing.js`（音效接入）
  - `pages/profile/profile.js`（死代码清理）

## ADDED Requirements

### Requirement: 双人出逃模式（覆盖 PRD §3.2 隐藏决策）

The system SHALL 提供双人出逃模式作为首页第四个模式芯片，可见且可选。

#### Scenario: 用户选择双人模式并摇出指令
- **WHEN** 用户在首页点击"双人出逃"芯片
- **THEN** 芯片高亮、震动反馈，`rollCommand('double')` 过滤 `double === true || social === true` 的指令池，摇出一条双人指令

#### Scenario: 邀请朋友
- **WHEN** 用户在双人指令详情卡点击"邀请朋友"按钮
- **THEN** 触发 `wx.shareAppMessage`，分享 path 为 `/pages/index/index?mode=double&cmd=<commandId>`，分享卡片标题含指令标题
- **AND** 本地记录该指令为"待执行搭档指令"

#### Scenario: 被邀请方打开
- **WHEN** 被邀请方通过分享卡片打开小程序，path 含 `mode=double&cmd=<id>`
- **THEN** 首页自动定位到双人模式，并直接展示该指令详情卡（不重新摇）
- **AND** 详情卡显示"来自朋友的邀请"标签 + "接受邀请"按钮

### Requirement: 音效播放

The system SHALL 在关键交互点播放音效，受设置页"音效"开关控制。

#### Scenario: 音效开启时摇骰
- **WHEN** 设置中 `soundEnabled === true` 且用户点击出逃触发
- **THEN** 播放摇骰音效

#### Scenario: 音效关闭或文件缺失
- **WHEN** `soundEnabled === false` 或音效文件不存在
- **THEN** 静默不报错

## MODIFIED Requirements

### Requirement: 微出逃模式

微出逃模式 SHALL 过滤 `duration < 15` 的指令，并以独立绿色 `#7BAE7F` 显示类型标签（不被 walk 橙色覆盖）。

#### Scenario: 微出逃指令颜色正确
- **WHEN** 用户选择微出逃模式并摇出 mi001-mi015 中的指令
- **THEN** 指令详情卡类型标签底色为绿色 `#7BAE7F`，标题"微出逃"或对应类型名

### Requirement: 城市漫游模式

城市漫游模式 SHALL 过滤 `outdoor !== false` 的指令，芯片可见且可选中。

#### Scenario: 选择城市漫游
- **WHEN** 用户点击"城市漫游"芯片
- **THEN** 芯片高亮，`rollCommand('walk')` 返回户外指令

### Requirement: 圆角导航栏（修复双重头部）

所有二级页面（收藏 / 徽章 / 设置 / 会员）SHALL 使用 `navigationStyle: custom`，仅显示自定义圆角头部，不出现原生直角导航栏。

#### Scenario: 进入收藏页
- **WHEN** 用户从首页或我的页进入收藏页
- **THEN** 顶部只显示一个圆角自定义头部（带返回按钮），无双层叠加

### Requirement: 我的收藏页布局

收藏页 SHALL 使用动态高度 scroll-view、自适应卡片高度、统一 4:3 配图比例、88rpx 触控区移除按钮。

#### Scenario: 长标题卡片
- **WHEN** 收藏的指令标题较长
- **THEN** 卡片高度自适应，标题 2 行 clamp 后省略，元信息正常显示

#### Scenario: 空状态
- **WHEN** 收藏列表为空
- **THEN** 居中显示 `♡ 还没有收藏任何指令` + `去首页摇一个` 按钮

### Requirement: TabBar 占位高度统一

`app.wxss` 与 `custom-tab-bar/index.wxss` 的 `.tabbar-placeholder` SHALL 统一为 `calc(180rpx + env(safe-area-inset-bottom))`。

### Requirement: 会员页 CSS 变量

`app.wxss` SHALL 定义 `--lemon-tint: #FFF4C7` 与 `--brand-strong: #45B08C`，会员页渐变正常显示。

### Requirement: 地图页坐标

地图页默认中心 SHALL 优先用真实定位，无定位时 fallback 广州；无 location 的 record 不使用 `Math.random()` 偏移。

### Requirement: 问候语不截断

首页问候语 SHALL 完整显示 `早啊，广州·天河 26℃ 晴`，不被 ellipsis 截断。

## REMOVED Requirements

### Requirement: 双人出逃隐藏

**Reason**: 用户明确要求开放双人模式，覆盖 PRD §3.2 的隐藏决策。
**Migration**: 双人指令数据 d001-d008 已存在，仅需开放芯片可见性 + 增加邀请流程。

## 对抗式审查（自检清单）

实现完成后 SHALL 执行以下对抗式审查，未通过则返工：

1. 三个模式芯片全部可见且可选，每个模式摇 5 次都能返回对应过滤后的指令。
2. 微出逃指令 typeColor 为绿色，不是橙色。
3. 收藏 / 徽章 / 设置 / 会员四页顶部只有一个圆角头部，无原生栏叠加。
4. 收藏页长标题卡片不溢出，短标题卡片不空旷。
5. TabBar 在所有 tab 页底部不遮挡内容（占位高度匹配）。
6. 会员页渐变背景显示正常（无透明 / 无继承色）。
7. 地图页首次打开定位到真实位置（授权后）。
8. 音效开关关闭时全静默，开启时摇骰有声音（或静默 fallback 不报错）。
9. 双人邀请分享卡片能正确带参打开并定位指令。
10. 全局无 console.error，无 undefined 变量引用。
