# 出逃指令 v3.0 产品丰富化 — 验证清单

## A. 导航栏瘦身

- [ ] `app.wxss` 定义了公共 `.nav-header` 类（88rpx 高 + 1rpx 下边框）
- [ ] `.nav-header-title` 32rpx/700 居中
- [ ] `.nav-header-back` 64rpx 圆形按钮
- [ ] collection/badges/settings/member 四页使用 `.nav-header`
- [ ] 所有新页面使用 `.nav-header`
- [ ] 头部总高度 = statusBarHeight + 88rpx（无额外 padding）
- [ ] 无页面头部过高过宽

## B. 移除摇一摇与震动

- [ ] `pages/index/index.js` 无 `startShakeListener`/`stopShakeListener`
- [ ] 无 `wx.startAccelerometer`/`wx.onAccelerometerChange` 调用
- [ ] 全局无 `wx.vibrateShort`/`wx.vibrateLong`
- [ ] `app.js` 无 `shouldVibrate` 方法
- [ ] `settings` 对象无 `vibrationEnabled` 字段
- [ ] 设置页无"震动反馈"开关
- [ ] 首页文案为"点击卡片，开始出逃"（无"摇一摇"）

## C. 6 模式差异化

- [ ] `MODE_LIST` 含 6 项（smart/micro/walk/double/night/rainy）
- [ ] 每个模式有独立 `color`/`heroScene`/`desc`
- [ ] 智能匹配色 #5CBF9E，微出逃 #7BAE7F，城市漫游 #D98A5C，双人 #9B7BB8，深夜 #9B8EC4，雨天 #7EC8F5
- [ ] `rollCommand(mode)` 6 模式过滤正确
- [ ] 夜间模式（21:00-03:00）芯片自动高亮
- [ ] 首页 hero 区随模式切换过渡
- [ ] 每个模式至少 20 条专属指令

## D. 页面数量（30+）

- [ ] `app.json` 的 pages 数组含 30+ 路径
- [ ] mode-intro 页存在
- [ ] command-detail 页存在
- [ ] escape-prep 页存在
- [ ] photo-edit 页存在
- [ ] generating 页存在
- [ ] record-detail 页存在
- [ ] timeline 页存在
- [ ] year-review 页存在
- [ ] mood-journal 页存在
- [ ] city-progress 页存在
- [ ] collection-category 页存在
- [ ] daily-challenge 页存在
- [ ] theme-market 页存在
- [ ] community 页存在
- [ ] badge-detail 页存在
- [ ] achievements 页存在
- [ ] stats 页存在
- [ ] partner-list 页存在
- [ ] invite 页存在
- [ ] leaderboard 页存在
- [ ] profile-edit 页存在
- [ ] about 页存在
- [ ] help 页存在
- [ ] data-export 页存在
- [ ] map-route 页存在
- [ ] city-select 页存在

## E. 首页增强

- [ ] hero 区随模式切换（颜色+插画）
- [ ] 每日推荐 3 条卡片
- [ ] 推荐基于天气+时间+历史
- [ ] 雨天推荐含雨天指令
- [ ] 深夜推荐含夜间指令
- [ ] 快速入口 4 宫格（时间线/挑战/搭档/社区）
- [ ] 4 入口可跳转
- [ ] 无摇一摇文案
- [ ] 无震动反馈

## F. 执行页增强

- [ ] 每步有 SVG 插图
- [ ] 进度 50% 有里程碑提示
- [ ] 拍照后有即时预览缩略图
- [ ] 完成按钮无长震动

## G. 记录页增强

- [ ] 支持最多 9 张照片
- [ ] 6 种滤镜（日光/阴雨/闪光/复古/黑白/胶片）
- [ ] 贴纸库（心情+装饰）
- [ ] 位置标注显示
- [ ] 内联感受编辑（textarea 在卡片上）

## H. 地图页增强

- [ ] 热力图/标记点模式切换
- [ ] 时间范围筛选（本周/本月/全部）
- [ ] 点击标记跳 record-detail
- [ ] 路线模式按钮跳 map-route

## I. 数据层

- [ ] `data/commands.js` 含 150+ 条指令
- [ ] 指令含 mode/season/city/scene/checklist 字段
- [ ] `data/badges.js` 含 19 个徽章
- [ ] `data/challenges.js` 含 30+ 挑战
- [ ] `data/themes.js` 含 3 主题包

## J. 新功能验证

- [ ] 时间线页：按日期分组+筛选+跳详情
- [ ] 年度回顾：总次数+总时长+常用模式+心情分布+Top9
- [ ] 心情日记：趋势图+关联指令
- [ ] 城市进度：热力图+角落进度
- [ ] 每日挑战：领取+完成+奖励+庆祝
- [ ] 主题市集：预览+切换生效
- [ ] 社区：浏览+点赞+收藏
- [ ] 徽章详情：故事+解锁条件+动画重放
- [ ] 成就系统：里程碑+连击+统计
- [ ] 数据统计：时长分布+类型偏好+月度趋势
- [ ] 双人邀请：卡片预览+分享+二维码
- [ ] 搭档列表：历史搭档+合作次数
- [ ] 排行榜：周/月/全部切换
- [ ] 资料编辑：头像+代号+签名
- [ ] 关于页：产品故事+版本日志
- [ ] 帮助页：FAQ+新手引导
- [ ] 数据导出：长图+文本

## K. 我的页入口

- [ ] 时间线入口
- [ ] 每日挑战入口
- [ ] 社区入口
- [ ] 排行榜入口
- [ ] 成就系统入口
- [ ] 数据统计入口
- [ ] 城市进度入口
- [ ] 年度回顾入口
- [ ] 会员入口（二级菜单可见，不隐藏）

## L. 设置页

- [ ] 无震动开关
- [ ] 主题选择（3 种）
- [ ] 通知偏好（每日提醒+时间）
- [ ] 隐私说明入口
- [ ] 缓存管理

## M. 引导页

- [ ] 3 屏 swiper
- [ ] 第 1 屏产品理念
- [ ] 第 2 屏 6 模式介绍
- [ ] 第 3 屏首次出逃引导
- [ ] 滑动流畅

## N. 对抗式审查终检

- [ ] 无 vibrate 调用残留
- [ ] 无加速度传感器残留
- [ ] 无 shouldVibrate 残留
- [ ] 所有二级页面用 .nav-header
- [ ] 6 模式各摇 5 次返回正确子池
- [ ] 首页无摇一摇文案
- [ ] 设置页无震动开关
- [ ] 30+ 页面在 app.json 注册
- [ ] 所有入口可跳转
- [ ] 无 console.error
- [ ] 无 undefined 变量引用
- [ ] 导航栏高度一致（statusBar + 88rpx）
