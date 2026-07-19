# Tasks

按依赖顺序分阶段实施。每个 Task 完成后打勾。

## Phase 1: 基础重构（导航瘦身 + 移除摇一摇/震动 + 模式元数据）

- [ ] Task 1: 导航头部瘦身统一
  - [ ] 1.1 `app.wxss` 新增公共 `.nav-header` 类：`display:flex; align-items:center; height:88rpx; padding:0 32rpx; border-bottom: 1rpx solid var(--line); position:relative;`
  - [ ] 1.2 `.nav-header-title` 32rpx/700 居中；`.nav-header-back` 64rpx 圆形按钮绝对定位左侧
  - [ ] 1.3 改造 `pages/collection/collection.wxml` 头部用 `.nav-header`，移除原有 `.collection-header` 自定义样式
  - [ ] 1.4 改造 `pages/badges/badges.wxml`、`pages/settings/settings.wxml`、`pages/member/member.wxml` 头部
  - [ ] 1.5 改造所有新页面统一用 `.nav-header`（在创建时即使用）
  - [ ] 1.6 验证：所有二级页面头部高度一致（statusBar + 88rpx），无过高过宽

- [ ] Task 2: 移除摇一摇与震动
  - [ ] 2.1 `pages/index/index.js` 删除 `startShakeListener`/`stopShakeListener`/`_accelHandler` 全部加速度逻辑
  - [ ] 2.2 `pages/index/index.js` 的 `onLoad`/`onShow`/`onHide`/`onUnload` 移除 shake 监听调用
  - [ ] 2.3 全局 grep `wx.vibrateShort` / `wx.vibrateLong` 并全部移除（index、executing、record、app.js 等）
  - [ ] 2.4 `app.js` 删除 `shouldVibrate()` 方法，`settings` 对象移除 `vibrationEnabled` 字段
  - [ ] 2.5 `pages/settings/settings.wxml` + `.js` 移除"震动反馈"开关行
  - [ ] 2.6 `pages/index/index.wxml` 文案从"点击卡片 或 摇一摇手机"改为"点击卡片，开始出逃"
  - [ ] 2.7 验证：无 vibrate 调用、无加速度监听、设置页无震动开关

- [ ] Task 3: 6 模式元数据与数据层扩展
  - [ ] 3.1 `utils/constants.js` 的 `MODE_LIST` 扩展为 6 项（新增 night/rainy），每项含 `id/name/icon/activeIcon/color/heroScene/desc`
  - [ ] 3.2 `data/commands.js` 扩充到 150+ 条，每模式至少 20 条；新增 `mode`/`season`/`city`/`scene`/`checklist` 字段
  - [ ] 3.3 `app.js:rollCommand(mode)` 支持 6 模式过滤：night=`nightSafe&&当前时段`、rainy=`rainy&&当前雨天`
  - [ ] 3.4 `app.js:getAvailableCommands` 深夜/雨天不再强制过滤，改为按 mode 过滤
  - [ ] 3.5 验证：6 模式各摇 5 次返回对应子池指令

- [ ] Task 4: 数据文件新建
  - [ ] 4.1 新建 `data/badges.js`：19 个徽章定义（9 原有 + 6 模式达人 + 社交达人 + 收藏家 + 探索家 + 挑战王）
  - [ ] 4.2 新建 `data/challenges.js`：30+ 每日挑战定义
  - [ ] 4.3 新建 `data/themes.js`：3 个主题包（默认/暖橙/薰衣草）
  - [ ] 4.4 `app.js` 引入新数据文件，`globalData` 新增 `challenges`/`currentChallenge`/`theme`

## Phase 2: 首页与核心流程增强

- [ ] Task 5: 首页 hero 区与模式切换过渡
  - [ ] 5.1 `pages/index/index.wxml` 新增 hero 区：模式插画 + 主色渐变背景
  - [ ] 5.2 `pages/index/index.wxss` 模式切换时 hero 背景色 `transition: background 400ms`
  - [ ] 5.3 `pages/index/index.js` `selectMode` 时 setData hero 色和插画
  - [ ] 5.4 深夜模式（21:00-03:00）芯片自动高亮 + Toast"夜色正好"
  - [ ] 5.5 验证：6 模式切换 hero 平滑过渡

- [ ] Task 6: 首页每日推荐区
  - [ ] 6.1 `pages/index/index.wxml` 出逃卡片下方新增"今日推荐"区，3 张横向卡片
  - [ ] 6.2 `pages/index/index.js` `loadDailyRecommend()` 基于天气+时间+历史选 3 条
  - [ ] 6.3 推荐卡点击跳 `command-detail` 页
  - [ ] 6.4 验证：雨天推荐含雨天指令，深夜推荐含夜间指令

- [ ] Task 7: 首页快速入口区
  - [ ] 7.1 `pages/index/index.wxml` 新增 4 宫格快速入口：时间线/挑战/搭档/社区
  - [ ] 7.2 各入口 `navigateTo` 对应页面
  - [ ] 7.3 验证：4 入口可点击跳转

- [ ] Task 8: 指令详情完整页
  - [ ] 8.1 新建 `pages/command-detail/` 四件套
  - [ ] 8.2 页面内容：类型标签+标题+大图+完整步骤+checklist+小贴士+收藏/分享/不感兴趣操作
  - [ ] 8.3 首页指令 sheet 加"查看更多"按钮跳此页
  - [ ] 8.4 `app.json` 注册页面路径
  - [ ] 8.5 验证：从首页可进入详情页，内容完整

- [ ] Task 9: 出逃准备页
  - [ ] 9.1 新建 `pages/escape-prep/` 四件套
  - [ ] 9.2 内容：天气提示+物品清单（从 command.checklist）+路线预览（地图缩略图）+出发按钮
  - [ ] 9.3 执行页接受指令前可选跳此页（"准备一下"按钮）
  - [ ] 9.4 验证：准备页显示清单和天气

- [ ] Task 10: 执行页增强
  - [ ] 10.1 `pages/executing/executing.wxml` 每步加 SVG 插图
  - [ ] 10.2 进度 50% 时显示里程碑庆祝 Toast
  - [ ] 10.3 漫游模式显示步数统计（用计时估算，不使用加速度传感器）
  - [ ] 10.4 拍照后即时预览缩略图条
  - [ ] 10.5 完成按钮移除长震动
  - [ ] 10.6 验证：步骤有插图、50% 有提示、无震动

- [ ] Task 11: 拍照编辑页
  - [ ] 11.1 新建 `pages/photo-edit/` 四件套
  - [ ] 11.2 内容：照片裁剪+滤镜预览+贴纸选择
  - [ ] 11.3 执行页拍照后可选跳此页编辑
  - [ ] 11.4 验证：编辑后照片传入 record 页

- [ ] Task 12: 记录页增强
  - [ ] 12.1 `pages/record/record.wxml` 支持最多 9 张照片+横向滚动
  - [ ] 12.2 滤镜从 3 种扩到 6 种（日光/阴雨/闪光/复古/黑白/胶片）
  - [ ] 12.3 新增贴纸库（心情贴纸+装饰贴纸）
  - [ ] 12.4 新增位置标注显示
  - [ ] 12.5 感受编辑改内联（textarea 直接在卡片上）
  - [ ] 12.6 验证：9 图、6 滤镜、贴纸、内联编辑

- [ ] Task 13: 记录生成中过渡页
  - [ ] 13.1 新建 `pages/generating/generating` 四件套
  - [ ] 13.2 内容：进度条动画+拍立得图标旋转+完成跳转
  - [ ] 13.3 record 保存后跳此页，再跳 map 或 badges
  - [ ] 13.4 验证：过渡动画流畅

- [ ] Task 14: 记录详情页
  - [ ] 14.1 新建 `pages/record-detail/` 四件套
  - [ ] 14.2 内容：完整拍立得+大图+感受+位置+所有元信息+删除/分享操作
  - [ ] 14.3 从时间线/地图可跳此页
  - [ ] 14.4 验证：详情页内容完整

## Phase 3: 记录与回顾域

- [ ] Task 15: 出逃时间线页
  - [ ] 15.1 新建 `pages/timeline/` 四件套
  - [ ] 15.2 按日期分组的时间倒序列表，每条缩略图+标题+心情
  - [ ] 15.3 顶部筛选条：全部/按模式/按类型/按心情
  - [ ] 15.4 点击跳 record-detail
  - [ ] 15.5 验证：筛选正确、点击跳转

- [ ] Task 16: 年度回顾页
  - [ ] 16.1 新建 `pages/year-review/` 四件套
  - [ ] 16.2 内容：总次数+总时长+常用模式+心情分布+精选拍立得 Top9
  - [ ] 16.3 可切换月度/年度
  - [ ] 16.4 验证：数据正确、图表显示

- [ ] Task 17: 心情日记页
  - [ ] 17.1 新建 `pages/mood-journal/` 四件套
  - [ ] 17.2 内容：心情趋势折线图+心情关联指令列表
  - [ ] 17.3 验证：趋势图正确

- [ ] Task 18: 城市探索进度页
  - [ ] 18.1 新建 `pages/city-progress/` 四件套
  - [ ] 18.2 内容：热力图+角落收集进度+区域列表
  - [ ] 18.3 验证：热力图显示

## Phase 4: 收藏与发现域

- [ ] Task 19: 收藏页增强
  - [ ] 19.1 `pages/collection/collection.wxml` 顶部加筛选条（类型/心情/模式）
  - [ ] 19.2 加排序按钮（时间/时长）
  - [ ] 19.3 加批量管理模式（多选删除）
  - [ ] 19.4 验证：筛选/排序/批量管理

- [ ] Task 20: 收藏分类页
  - [ ] 20.1 新建 `pages/collection-category/` 四件套
  - [ ] 20.2 按分类展示收藏网格
  - [ ] 20.3 验证：分类正确

- [ ] Task 21: 每日挑战页
  - [ ] 21.1 新建 `pages/daily-challenge/` 四件套
  - [ ] 21.2 内容：当日挑战卡+完成状态+历史挑战列表+奖励说明
  - [ ] 21.3 `app.js` 新增 `getDailyChallenge()`/`checkChallenge()`
  - [ ] 21.4 完成挑战时徽章进度+1+庆祝动画
  - [ ] 21.5 验证：挑战领取/完成/奖励

- [ ] Task 22: 主题市集页
  - [ ] 22.1 新建 `pages/theme-market/` 四件套
  - [ ] 22.2 内容：主题包列表（预览+切换）
  - [ ] 22.3 切换主题时 `app.wxss` 动态注入 CSS 变量
  - [ ] 22.4 验证：主题切换生效

- [ ] Task 23: 指令社区页
  - [ ] 23.1 新建 `pages/community/` 四件套
  - [ ] 23.2 内容：指令信息流（内容+作者代号+点赞+收藏）
  - [ ] 23.3 本地模拟社区数据（`data/community.js`）
  - [ ] 23.4 点赞/收藏操作本地存储
  - [ ] 23.5 验证：浏览/点赞/收藏

## Phase 5: 徽章与成就域

- [ ] Task 24: 徽章页增强
  - [ ] 24.1 `pages/badges/badges.js` 从 `data/badges.js` 加载 19 个徽章
  - [ ] 24.2 `pages/badges/badges.wxml` 进度条改"X / 19"
  - [ ] 24.3 点击徽章跳 `badge-detail` 页
  - [ ] 24.4 验证：19 徽章显示、点击跳转

- [ ] Task 25: 徽章详情页
  - [ ] 25.1 新建 `pages/badge-detail/` 四件套
  - [ ] 25.2 内容：大徽章+故事+解锁条件+解锁日期+重放解锁动画按钮
  - [ ] 25.3 验证：故事显示、动画重放

- [ ] Task 26: 成就系统页
  - [ ] 26.1 新建 `pages/achievements/` 四件套
  - [ ] 26.2 内容：里程碑列表（首次/10次/50次/100次）+连击记录+统计数据
  - [ ] 26.3 验证：成就显示

- [ ] Task 27: 数据统计页
  - [ ] 27.1 新建 `pages/stats/` 四件套
  - [ ] 27.2 内容：时长分布饼图+类型偏好柱图+月度趋势折线+热力日历
  - [ ] 27.3 验证：图表正确

## Phase 6: 社交域

- [ ] Task 28: 双人邀请页
  - [ ] 28.1 新建 `pages/invite/` 四件套
  - [ ] 28.2 内容：邀请卡片预览（指令标题+双人插画+文案）+分享按钮+二维码
  - [ ] 28.3 `onShareAppMessage` 带 `mode=double&cmd=<id>`（已有，确认）
  - [ ] 28.4 二维码用 Canvas 生成（`wx.canvasToTempFilePath`）
  - [ ] 28.5 验证：邀请卡片预览正确

- [ ] Task 29: 出逃搭档列表页
  - [ ] 29.1 新建 `pages/partner-list/` 四件套
  - [ ] 29.2 内容：历史搭档列表（头像+代号+合作次数+最近合作日期）
  - [ ] 29.3 `app.js` 新增 `partnerRecords` 字段记录搭档
  - [ ] 29.4 验证：搭档列表显示

- [ ] Task 30: 排行榜页
  - [ ] 30.1 新建 `pages/leaderboard/` 四件套
  - [ ] 30.2 内容：周/月/全部切换+出逃次数/连续天数排序
  - [ ] 30.3 本地模拟排行榜数据（`data/leaderboard.js`）
  - [ ] 30.4 验证：排行切换

## Phase 7: 个人域

- [ ] Task 31: 我的页增强
  - [ ] 31.1 `pages/profile/profile.wxml` 增加入口列表：时间线/挑战/社区/排行/成就/数据统计/城市进度/年度回顾
  - [ ] 31.2 每个入口 `navigateTo` 对应页面
  - [ ] 31.3 会员入口从隐藏改为二级菜单可见
  - [ ] 31.4 验证：所有入口可跳转

- [ ] Task 32: 资料编辑页
  - [ ] 32.1 新建 `pages/profile-edit/` 四件套
  - [ ] 32.2 内容：头像选择+出逃代号编辑（12字）+个性签名（30字）
  - [ ] 32.3 保存到 `globalData` + storage
  - [ ] 32.4 验证：编辑保存生效

- [ ] Task 33: 设置页增强
  - [ ] 33.1 `pages/settings/settings.wxml` 移除震动开关（Task 2.5 已做，确认）
  - [ ] 33.2 新增主题选择行（默认/暖橙/薰衣草）
  - [ ] 33.3 新增通知偏好（每日提醒开关+时间选择）
  - [ ] 33.4 新增隐私说明行（跳关于页）
  - [ ] 33.5 新增缓存管理（显示缓存大小+清除）
  - [ ] 33.6 验证：新设置项生效

- [ ] Task 34: 关于页
  - [ ] 34.1 新建 `pages/about/` 四件套
  - [ ] 34.2 内容：产品故事+版本号+版本日志+联系方式+用户协议
  - [ ] 34.3 验证：内容显示

- [ ] Task 35: 帮助/FAQ 页
  - [ ] 35.1 新建 `pages/help/` 四件套
  - [ ] 35.2 内容：新手引导折叠面板+FAQ+使用技巧
  - [ ] 35.3 验证：折叠面板交互

- [ ] Task 36: 数据导出页
  - [ ] 36.1 新建 `pages/data-export/` 四件套
  - [ ] 36.2 内容：导出为长图（Canvas）+导出为文本
  - [ ] 36.3 验证：导出功能

## Phase 8: 地图域与引导

- [ ] Task 37: 地图页增强
  - [ ] 37.1 `pages/map/map.wxml` 增加热力图/标记点模式切换按钮
  - [ ] 37.2 增加时间范围筛选（本周/本月/全部）
  - [ ] 37.3 点击标记跳 `record-detail` 页
  - [ ] 37.4 新增"路线模式"按钮跳 `map-route`
  - [ ] 37.5 验证：模式切换、筛选、跳转

- [ ] Task 38: 路线回顾页
  - [ ] 38.1 新建 `pages/map-route/` 四件套
  - [ ] 38.2 内容：单次出逃的标记点连线+时间轴
  - [ ] 38.3 验证：路线显示

- [ ] Task 39: 城市选择页
  - [ ] 39.1 新建 `pages/city-select/` 四件套
  - [ ] 39.2 内容：城市列表（当前定位+热门城市）
  - [ ] 39.3 切换城市后 `globalData.currentCity` 更新
  - [ ] 39.4 验证：城市切换

- [ ] Task 40: 引导页改为 3 屏
  - [ ] 40.1 `pages/onboarding/onboarding.wxml` 改为 swiper 3 屏
  - [ ] 40.2 第 1 屏：产品理念+插画+"开始探索"按钮
  - [ ] 40.3 第 2 屏：6 模式介绍网格
  - [ ] 40.4 第 3 屏：首次出逃引导（点击卡片试一次）
  - [ ] 40.5 验证：3 屏滑动流畅

## Phase 9: 模式介绍页与收尾

- [ ] Task 41: 模式介绍页
  - [ ] 41.1 新建 `pages/mode-intro/` 四件套
  - [ ] 41.2 内容：模式插画+性格说明+专属指令示例+"试试这个模式"按钮
  - [ ] 41.3 首次选择某模式时 `redirectTo` 此页
  - [ ] 41.4 验证：首次进入显示，后续不显示

- [ ] Task 42: app.json 注册所有新页面
  - [ ] 42.1 `app.json` 的 `pages` 数组添加全部 20+ 新页面路径
  - [ ] 42.2 确认页面路径拼写正确
  - [ ] 42.3 验证：所有页面可访问

- [ ] Task 43: 全局对抗式审查
  - [ ] 43.1 无 `wx.vibrateShort`/`wx.vibrateLong` 残留
  - [ ] 43.2 无 `startAccelerometer`/`onAccelerometerChange` 残留
  - [ ] 43.3 无 `shouldVibrate` 残留
  - [ ] 43.4 所有二级页面用 `.nav-header`，高度一致
  - [ ] 43.5 6 模式各摇 5 次返回正确子池
  - [ ] 43.6 首页无"摇一摇"文案
  - [ ] 43.7 设置页无震动开关
  - [ ] 43.8 30+ 页面在 app.json 注册
  - [ ] 43.9 无 console.error
  - [ ] 43.10 所有入口可跳转

# Task Dependencies

- Task 1, 2, 3, 4 可并行（基础重构）
- Task 5, 6, 7 依赖 Task 3（模式元数据）
- Task 8-14 依赖 Task 1（导航组件）
- Task 15-23 依赖 Task 1, 4
- Task 24-27 依赖 Task 4（数据文件）
- Task 28-30 依赖 Task 1
- Task 31-36 依赖 Task 1
- Task 37-40 依赖 Task 1
- Task 41 依赖 Task 3
- Task 42 依赖所有页面创建
- Task 43 依赖所有

# 并行建议

- **并行组 1**（基础）：Task 1, 2, 3, 4
- **并行组 2**（首页+流程）：Task 5-14
- **并行组 3**（回顾域）：Task 15-18
- **并行组 4**（发现域）：Task 19-23
- **并行组 5**（成就域）：Task 24-27
- **并行组 6**（社交+个人）：Task 28-36
- **并行组 7**（地图+引导+收尾）：Task 37-43
