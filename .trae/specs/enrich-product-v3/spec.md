# 出逃指令 v3.0 — 产品体验全面丰富化 Spec

## Why

v2 走了"简化"路线（6→3 模式、隐藏双人、砍创建），结果是产品变得"正确但无聊"——用户反馈"看着都不想用"。当前只有 10 个页面、4 个模式芯片但模式间无实质差异、导航栏过高过宽、摇一摇和震动是多余的交互负担。v3 的目标是对 v2 简化教条的**反向修正**：把产品从"能用"升级到"好玩"，从"10 页"扩展到"30+ 页"，让每个模式有独立的性格和专属体验，让出逃这件事真正有仪式感和探索感。

## What Changes

### A. 导航栏瘦身重构（**BREAKING**）
- 当前自定义头部 `status-bar + padding-top: capsuleTop - statusBarHeight + 8px + 16rpx padding` 导致头部过高。v3 改为**紧凑型头部**：status-bar + 44px 单行标题栏（含返回按钮），总高度不再叠加额外 padding。
- 头部宽度满屏（不再有过大左右边距感），圆角仅保留在 TabBar 浮岛，二级页面头部用直角下边框分隔（1rpx line），视觉更利落。
- 标题字号从 36rpx 降到 32rpx，header-back 按钮从 72rpx 降到 64rpx。
- 所有页面的 `.xxx-header` 统一收敛为一个公共组件样式 `.nav-header`（在 app.wxss 定义），各页面不再各自定义。

### B. 移除摇一摇与震动（**BREAKING**）
- **移除** `pages/index/index.js` 的 `startShakeListener` / `stopShakeListener` / `onAccelerometerChange` 全部加速度传感器逻辑。
- **移除** 全局所有 `wx.vibrateShort()` / `wx.vibrateLong()` 调用（index 模式选择、rollCommand、executing 完成、record 保存、checkBadges 解锁等处）。
- **移除** `app.js` 的 `shouldVibrate()` 方法和 `settings.vibrationEnabled` 字段。
- **移除** 设置页的"震动反馈"开关行。
- 触发方式仅保留**点击**。首页文案从"点击卡片 或 摇一摇"改为"点击卡片，开始出逃"。

### C. 模式差异化重构（6 个独立模式，每个有专属性格）
v3 把模式从"过滤芯片"升级为"独立体验通道"。6 个模式：

| 模式 | 性格 | 专属色 | 时长范围 | 专属元素 |
|------|------|--------|---------|---------|
| 智能匹配 | 算法懂你 | 薄荷绿 #5CBF9E | 全时段 | 基于天气/时间/心情/历史推荐 |
| 微出逃 | 碎片时间 | 嫩芽绿 #7BAE7F | <15min | 办公室/午休场景，快速完成 |
| 城市漫游 | 户外长线 | 珊瑚橙 #D98A5C | 30-120min | 路线感、步数追踪、角落收集 |
| 双人出逃 | 社交冒险 | 薰衣草紫 #9B7BB8 | 任意 | 邀请流程、搭档记录、双人任务 |
| 深夜出逃 | 夜色独白 | 深紫 #9B8EC4 | 21:00-03:00 | 夜间安全指令、夜间专属插画 |
| 雨天出逃 | 雨中漫步 | 天蓝 #7EC8F5 | 雨天 | 室内/雨中指令、雨声氛围 |

- 每个模式有**专属首页 hero 视觉**（不同插画 + 不同主色调底）。
- 每个模式有**专属指令子池**（数据层加 mode 标签或过滤规则）。
- 模式切换时首页 hero 平滑过渡（颜色渐变 + 插画切换）。

### D. 页面大幅扩展（10 页 → 30+ 页）

#### 新增页面清单（按功能域分组）

**出逃流程域**（核心路径深化）
- `pages/mode-intro/mode-intro` — 模式介绍页（首次选择某模式时展示性格说明）
- `pages/command-detail/command-detail` — 指令完整详情页（从首页 sheet 可"查看更多"跳转）
- `pages/escape-prep/escape-prep` — 出逃准备页（天气提示、物品清单、路线预览）
- `pages/executing` — 已有，增强（见 MODIFIED）
- `pages/photo-edit/photo-edit` — 拍照后编辑页（裁剪、滤镜预览、贴纸）
- `pages/record` — 已有，增强（见 MODIFIED）
- `pages/generating/generating` — 记录生成中过渡动画页（PRD 提到但未实现）
- `pages/record-detail/record-detail` — 单条记录详情查看页（从地图/时间线点入）

**记录与回顾域**
- `pages/timeline/timeline` — 出逃时间线页（按时间倒序展示所有出逃记录）
- `pages/year-review/year-review` — 年度/月度回顾页（数据可视化、精选记录）
- `pages/mood-journal/mood-journal` — 心情日记页（心情趋势图、心情关联指令）
- `pages/city-progress/city-progress` — 城市探索进度页（区域覆盖热力图、角落收集进度）

**收藏与发现域**
- `pages/collection` — 已有，增强（见 MODIFIED）
- `pages/collection-category/collection-category` — 收藏分类页（按类型/心情/季节筛选）
- `pages/daily-challenge/daily-challenge` — 每日挑战页（限定任务 + 奖励）
- `pages/theme-market/theme-market` — 主题市集页（季节主题、城市主题包）
- `pages/community/community` — 指令社区页（用户分享的指令，浏览/点赞/收藏）

**徽章与成就域**
- `pages/badges` — 已有，增强（见 MODIFIED）
- `pages/badge-detail/badge-detail` — 单个徽章详情页（故事、解锁条件、解锁动画重放）
- `pages/achievements/achievements` — 成就系统页（里程碑、连击记录、统计数据）
- `pages/stats/stats` — 数据统计页（详细图表：出逃时长分布、类型偏好、月度趋势）

**社交域**
- `pages/partner-list/partner-list` — 出逃搭档列表页（双人出逃的历史搭档）
- `pages/invite/invite` — 邀请朋友页（生成邀请卡片、分享预览、二维码）
- `pages/leaderboard/leaderboard` — 排行榜页（周/月/全部，出逃次数/连续天数）

**个人域**
- `pages/profile` — 已有，增强（见 MODIFIED）
- `pages/profile-edit/profile-edit` — 资料编辑页（头像、出逃代号、个性签名）
- `pages/settings` — 已有，增强（见 MODIFIED）
- `pages/about/about` — 关于页（产品故事、版本日志、联系方式）
- `pages/help/help` — 帮助/FAQ 页（新手引导、常见问题、使用技巧）
- `pages/data-export/data-export` — 数据导出页（导出记录为图片/文本）

**地图域**
- `pages/map` — 已有，增强（见 MODIFIED）
- `pages/map-route/map-route` — 路线回顾页（单次出逃的轨迹回放）
- `pages/city-select/city-select` — 城市选择页（切换探索城市，城市专属指令）

#### 已有页面增强（MODIFIED）

- **index**：模式切换 hero 过渡、每日推荐卡、快速入口区（时间线/挑战/搭档）
- **executing**：步骤插图、里程碑提示、步数统计（漫游模式）、拍照后即时预览
- **record**：多图轮播、位置标注、更丰富滤镜（6 种）、贴纸库
- **map**：热力图模式、路线模式、时间筛选、点击标记进 record-detail
- **profile**：增加入口（时间线/挑战/社区/排行/成就/数据统计/城市进度）
- **badges**：解锁动画重放、徽章故事、进度详情
- **collection**：分类筛选、排序、批量管理
- **settings**：移除震动开关、增加（主题选择/通知偏好/隐私说明/缓存管理）
- **onboarding**：3 屏引导（产品理念 → 模式介绍 → 首次出逃引导）
- **member**：保留但入口在 profile 二级菜单（不隐藏）

### E. 数据层扩展
- `data/commands.js` 从当前 ~85 条扩充到 **150+ 条**，每个模式至少 20 条专属指令。
- 新增字段：`mode`（专属模式标签）、`season`（季节）、`city`（城市限定）、`scene`（场景插画 key）、`checklist`（准备清单）。
- 徽章从 9 个扩到 **19 个**（9 原有 + 6 模式达人 + 社交达人 + 收藏家 + 探索家 + 挑战王）。徽章定义从 `utils/constants.js` 的 `BADGES` **迁移**到 `data/badges.js`（单一来源，constants.js 不再导出 BADGES，app.js/checkBadges 改为从 data/badges.js 导入）。
- 新增 `data/challenges.js` 每日挑战池（30+ 条）。
- 新增 `data/themes.js` 主题包定义。
- 新增 `data/community.js` 社区指令模拟数据。

### F. 前置依赖（图表/素材/导航栈）
- **数据可视化页面**（stats/year-review/mood-journal/city-progress）需要图表能力。MVP 方案：使用纯 CSS + Canvas 2D 手绘简单图表（柱图/折线/进度环），不引入第三方图表库（避免包体积）。复杂图表（热力图）用 grid 布局 + 透明度模拟。
- **新页面素材**：6 模式 hero 插画、19 徽章 SVG、步骤插图、贴纸库等。MVP 方案：复用现有 assets/icons 中的 SVG + CSS 渐变占位，缺失素材用类型色块 + 文字标签替代，不阻塞页面开发。
- **导航栈管理**：核心出逃流程 command-detail→escape-prep→executing→photo-edit→record→generating 最深 6 层（从 index 算 7 层），接近微信 10 层上限。关键节点用 `redirectTo` 替换栈：escape-prep→executing 用 redirectTo（准备页不入栈）、photo-edit→record 用 redirectTo（编辑页不入栈）、record→generating 用 redirectTo。

### G. 交互细节丰富化
- 首页"每日推荐"：每天 3 条精选指令，基于天气+时间+历史。
- 指令详情卡支持"收藏""分享""不感兴趣"三个操作。
- 执行页步骤可点击展开详细说明。
- 记录页支持多图（最多 9 张）+ 拖拽排序。
- 地图页支持"回忆路线"模式——连点出逃轨迹。
- 所有列表支持下拉刷新。
- 徽章解锁全屏动画 + 可重放。
- 双人出逃邀请卡片可预览。

### H. 跨模式安全规则
- 深夜模式（night）独立时，其他模式（smart/micro/walk）在 21:00-03:00 时段仍**保留** `nightSafe` 过滤（不向用户推荐夜间不安全的指令），但不再强制切换到 night 模式。
- 雨天模式（rainy）独立时，其他模式在雨天仍**保留** `rainy` 适配优先（雨天不适合的指令降权但不完全过滤）。
- 即：night/rainy 作为**独立模式**时是专属子池；作为**环境条件**时是对其他模式的过滤/降权。

## Impact

- **Affected specs**: PRD-v2（全面覆盖，v3 反转简化路线）、UX-SPEC-v2（导航/动效/交互全面修改）、UI-SPEC-v2（头部组件/页面数大幅扩展）、ASSETS-INVENTORY（需大量新素材）。
- **Affected code**:
  - `app.js`（移除 vibrate、扩展 globalData、新增模式元数据）
  - `app.wxss`（统一 .nav-header、移除震动相关、新增大量组件样式）
  - `app.json`（pages 列表从 10 扩到 30+）
  - `data/commands.js`（扩充到 150+）
  - `data/badges.js`（新文件，19 个徽章）
  - `data/challenges.js`（新文件）
  - `data/themes.js`（新文件）
  - `utils/constants.js`（6 模式元数据、新类型映射）
  - `pages/index/*`（hero 过渡、每日推荐、移除摇一摇）
  - `pages/*/`（所有已有页面增强 + 20+ 新页面）
  - `custom-tab-bar/*`（不变）

## ADDED Requirements

### Requirement: 紧凑型导航头部
The system SHALL 在所有二级页面使用统一的紧凑型头部组件 `.nav-header`，总高度 = statusBarHeight + 44px，标题 32rpx，返回按钮 64rpx，下边框 1rpx line 分隔。

#### Scenario: 进入任意二级页面
- **WHEN** 用户进入收藏/徽章/设置/时间线等任意二级页面
- **THEN** 顶部显示紧凑头部：状态栏占位 + 单行标题栏（左侧返回按钮 64rpx + 居中标题 32rpx），无额外 padding，无原生导航栏叠加

### Requirement: 纯点击触发
The system SHALL 仅通过点击触发出逃，不使用加速度传感器，不产生任何震动反馈。

#### Scenario: 用户触发出逃
- **WHEN** 用户点击首页出逃卡片
- **THEN** 骰子动画播放后展示指令，无震动，无摇一摇监听

#### Scenario: 设置页无震动选项
- **WHEN** 用户打开设置页
- **THEN** 不显示"震动反馈"开关（已移除）

### Requirement: 6 模式差异化
The system SHALL 提供 6 个出逃模式，每个模式有独立主色、专属指令子池、专属首页 hero 视觉。

#### Scenario: 切换模式时首页变化
- **WHEN** 用户从智能匹配切换到城市漫游
- **THEN** 首页 hero 区主色从薄荷绿渐变到珊瑚橙，插画切换为户外场景，出逃卡片副标题显示"户外长线探索"

#### Scenario: 深夜模式自动可见
- **WHEN** 当前时间在 21:00-03:00
- **THEN** 深夜出逃模式芯片自动高亮提示"夜色正好"

### Requirement: 每日推荐
The system SHALL 在首页展示每日 3 条精选指令卡片，基于天气、时间、用户历史推荐。

#### Scenario: 雨天推荐
- **WHEN** 当前天气为雨天
- **THEN** 每日推荐含至少 1 条雨天适配指令，卡片带雨滴图标

### Requirement: 出逃时间线
The system SHALL 提供时间线页面，按时间倒序展示所有出逃记录，支持按模式/类型/心情筛选。

#### Scenario: 查看时间线
- **WHEN** 用户从我的页进入"出逃时间线"
- **THEN** 显示按日期分组的时间倒序列表，每条含拍立得缩略图+指令标题+日期+心情

### Requirement: 每日挑战
The system SHALL 每日提供一个限定挑战任务，完成后奖励额外徽章进度。

#### Scenario: 完成每日挑战
- **WHEN** 用户完成当日挑战指定的指令
- **THEN** 挑战页显示"挑战完成"，徽章进度 +1，弹出庆祝动画

### Requirement: 指令社区
The system SHALL 提供社区页面展示用户分享的指令，支持浏览/点赞/收藏到自己的列表。

#### Scenario: 浏览社区
- **WHEN** 用户进入社区页
- **THEN** 显示热门指令信息流，每条含指令内容+作者代号+点赞数+收藏按钮

### Requirement: 双人邀请流程
The system SHALL 提供独立邀请页，生成可预览的邀请卡片，支持微信分享和二维码。

#### Scenario: 生成邀请
- **WHEN** 用户在双人指令详情点击"邀请朋友"
- **THEN** 跳转邀请页，显示邀请卡片预览（含指令标题+双人插画+邀请文案），底部有"分享给朋友"和"生成二维码"按钮

### Requirement: 年度回顾
The system SHALL 提供年度/月度回顾页，以数据可视化展示出逃统计和精选记录。

#### Scenario: 查看年度回顾
- **WHEN** 用户进入年度回顾页
- **THEN** 显示总出逃次数、总时长、最常去区域、最常用模式、心情分布图、精选拍立得 Top 9

### Requirement: 城市探索进度
The system SHALL 提供城市进度页，以热力图展示用户在城市各区域的探索覆盖度。

#### Scenario: 查看城市进度
- **WHEN** 用户进入城市进度页
- **THEN** 显示城市地图热力图（已探索区域高亮）+ 角落收集进度（如"已探索 12 个角落"）+ 区域列表

## MODIFIED Requirements

### Requirement: 首页（index）
首页 SHALL 包含：紧凑问候栏 + 6 模式芯片（带专属色）+ 模式专属 hero 区（插画+主色）+ 出逃卡片（纯点击触发）+ 每日推荐 3 条 + 快速入口区（时间线/挑战/搭档/社区）+ 收藏入口。不再有摇一摇文案和震动反馈。

### Requirement: 执行页（executing）
执行页 SHALL 增加：步骤插图（每步配 SVG）、里程碑提示（完成 50% 庆祝）、漫游模式步数统计、拍照后即时预览缩略图。完成按钮不再有长震动。

### Requirement: 记录页（record）
记录页 SHALL 支持：最多 9 张照片+拖拽排序、6 种滤镜（日光/阴雨/闪光/复古/黑白/胶片）、贴纸库（心情+装饰）、位置标注、内联感受编辑。

### Requirement: 地图页（map）
地图页 SHALL 增加：热力图模式切换、路线模式（连点轨迹）、时间范围筛选、点击标记跳转 record-detail 页。

### Requirement: 我的页（profile）
我的页 SHALL 增加入口：出逃时间线、每日挑战、指令社区、排行榜、成就系统、数据统计、城市进度、年度回顾。

### Requirement: 收藏页（collection）
收藏页 SHALL 增加：分类筛选（按类型/心情/模式）、排序（时间/时长）、批量管理（多选删除）。

### Requirement: 徽章页（badges）
徽章页 SHALL 扩展到 19 个徽章，每个可点击进 badge-detail 页查看故事和解锁条件，解锁动画可重放。

### Requirement: 设置页（settings）
设置页 SHALL 移除"震动反馈"开关，增加：主题选择（默认/暖橙/薰衣草）、通知偏好（每日提醒时间）、隐私说明、缓存管理。

### Requirement: 引导页（onboarding）
引导页 SHALL 从 1 屏改为 3 屏：①产品理念 ②6 模式介绍 ③首次出逃引导（点击触发）。

## REMOVED Requirements

### Requirement: 摇一摇触发
**Reason**: 用户明确要求移除，只保留点击。
**Migration**: 移除加速度传感器监听，首页文案改为"点击卡片，开始出逃"。

### Requirement: 震动反馈
**Reason**: 用户明确要求移除震动效果。
**Migration**: 移除所有 vibrate 调用和 shouldVibrate 方法，设置页移除震动开关。

### Requirement: v2 模式简化（6→3）
**Reason**: v3 恢复并扩展到 6 个独立模式，每个有专属性格。
**Migration**: 恢复深夜/雨天为独立模式，新增专属指令池和 hero 视觉。
