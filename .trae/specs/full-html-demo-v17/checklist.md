# Checklist

## 骨架与架构
- [ ] `demo/index.html` 单文件存在
- [ ] 引入 Google Fonts Noto Serif SC（400/700）
- [ ] CSS 变量与 v15 主题统一（`#C8956E` 主色）
- [ ] 手机框容器居中（375×812）
- [ ] appState 全局状态对象
- [ ] Storage localStorage 封装
- [ ] hash 路由系统可用
- [ ] 组件化渲染函数（navHeader/tabBar/sheet/toast）

## L1 核心流程页（6 页）
- [ ] onboarding 引导页（3 步滑动 + 进入按钮）
- [ ] index 首页（Hero + 模式 Tag + 出逃卡 + 详情卡 + 今日推荐）
- [ ] command-detail 指令详情独立页
- [ ] executing 出逃执行页（4 步 + 完成 + 徽章解锁）
- [ ] escape-prep 出逃准备页
- [ ] generating 生成中页

## L2 导航页（7 页）
- [ ] map 地图主页（3 模式 Tab + 标记 + 统计）
- [ ] map-route 路线详情页
- [ ] profile 个人资料页（用户卡 + 统计 + 徽章墙 + 入口列表）
- [ ] profile-edit 编辑资料页
- [ ] settings 设置页
- [ ] collection 收藏列表页
- [ ] collection-category 收藏分类页

## L3 成就页（8 页）
- [ ] badges 徽章墙
- [ ] badge-detail 徽章详情
- [ ] achievements 成就
- [ ] stats 统计图表
- [ ] timeline 时间线
- [ ] year-review 年度回顾
- [ ] leaderboard 排行榜
- [ ] daily-challenge 每日挑战

## L4 社交页（5 页）
- [ ] community 社区动态
- [ ] partner-list 伙伴列表
- [ ] invite 邀请页
- [ ] member 会员页
- [ ] mood-journal 心情日记

## L5 工具页（10 页）
- [ ] city-select 城市选择
- [ ] city-progress 城市进度
- [ ] mode-intro 模式介绍
- [ ] theme-market 主题市场
- [ ] about 关于
- [ ] help 帮助
- [ ] record 出逃记录列表
- [ ] record-detail 记录详情
- [ ] photo-edit 照片编辑
- [ ] data-export 数据导出

## 数据迁移
- [ ] ~150 条指令数据内联
- [ ] 全部徽章数据内联
- [ ] 主题数据内联
- [ ] 每日挑战数据内联
- [ ] TYPE_META/MODE_LIST/SHEET_MODEMS/MOODS/TYPE_STEPS 常量内联

## 交互与持久化
- [ ] 摇骰子 → 指令卡 → 执行 → 完成 → 徽章解锁全流程走通
- [ ] 收藏状态可切换并 localStorage 持久化
- [ ] 出逃记录写入 localStorage
- [ ] 徽章解锁状态持久化
- [ ] 设置项持久化
- [ ] 连续天数统计正确
- [ ] Tab 切换有过渡动画
- [ ] Sheet 弹出有动画
- [ ] 按钮 :active 有反馈

## 验证
- [ ] 浏览器中所有 36 页可访问
- [ ] 核心流程走通
- [ ] localStorage 刷新后保留
- [ ] 桌面端手机框居中
- [ ] 移动端全屏自适应
- [ ] 配色为暖棕褐系
- [ ] Hero 标题为衬线宋体
- [ ] 圆角规范一致
