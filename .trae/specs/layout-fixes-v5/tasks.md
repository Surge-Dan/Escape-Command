# v5 Tasks

## Task 1: 首页清理 quick-grid（A 节）
- [ ] SubTask 1.1: `pages/index/index.wxml` 删除 `quick-grid` 整段（line 69-95）
- [ ] SubTask 1.2: `pages/index/index.wxss` 删除 `.quick-grid` / `.quick-item` / `.quick-icon` / `.quick-label` 相关样式
- [ ] SubTask 1.3: `pages/index/index.js` 删除 `goTimeline` / `goChallenge` / `goPartner` / `goCommunity` 4 个方法

## Task 2: 地图页 3 模式视觉差异化（B 节）
- [ ] SubTask 2.1: `pages/map/map.wxml` 在 `map-canvas` 上加 `mode-{{activeTab}}` class 用于切换样式
- [ ] SubTask 2.2: `pages/map/map.wxss` 新增 `.map-canvas.mode-all`（浅色网格 + 渐变天空 + 微动云朵）
- [ ] SubTask 2.3: `pages/map/map.wxss` 新增 `.map-canvas.mode-heat`（6x6 暗色 grid + 径向发光 cell）
- [ ] SubTask 2.4: `pages/map/map.wxss` 新增 `.map-canvas.mode-route`（深色地图 + 路线粗细变化）
- [ ] SubTask 2.5: `pages/map/map.wxss` 加 `transition: background 300ms var(--ease-standard)` 到 `.map-canvas`
- [ ] SubTask 2.6: heat-cell 颜色按 intensity 渐变：低 → `--rain`、中 → `--accent`、高 → `--danger`
- [ ] SubTask 2.7: route 模式的路线 segments 视觉：从 4rpx 细线到 8rpx 粗线（带阴影）

## Task 3: 个人页 5 分类卡片（C 节）
- [ ] SubTask 3.1: `pages/profile/profile.wxml` 替换 `entries-grid` 为 `category-grid`
- [ ] SubTask 3.2: `pages/profile/profile.wxml` 新增 4-5 个 `category-card`，每个含标题 + 子项网格
- [ ] SubTask 3.3: `pages/profile/profile.wxss` 新增 `.category-grid` / `.category-card` / `.category-head` / `.category-items` 样式
- [ ] SubTask 3.4: 分类 1: 回顾 (时间线/年度回顾/心情日记/城市足迹)
- [ ] SubTask 3.5: 分类 2: 互动 (搭档/邀请/排行榜/社区)
- [ ] SubTask 3.6: 分类 3: 收藏 (我的收藏/收藏分类/数据导出/主题市场)
- [ ] SubTask 3.7: 分类 4: 设置 (每日挑战/成就墙/个人资料/帮助/关于)
- [ ] SubTask 3.8: 分类 5: 会员（单独样式，已弱化）
- [ ] SubTask 3.9: `pages/profile/profile.js` 把 `entries` 改为 `categories`，每个 category 含 `items` 数组
- [ ] SubTask 3.10: 点击子项调用 `onCategoryItemTap` navigateTo 对应 path

## Task 4: 响应式加固（D 节）
- [ ] SubTask 4.1: 在 `app.wxss` 升级 `.bottom-spacer`：`height: calc(130rpx + env(safe-area-inset-bottom))`
- [ ] SubTask 4.2: 审查 6 个主要页面 (index/map/profile/badges/executing/record/collection) 的左右 padding 是否一致 40rpx
- [ ] SubTask 4.3: 审查顶部 padding 是否用 `statusBarHeight + 8rpx`
- [ ] SubTask 4.4: 审查 min-height 是否有 max-height fallback
- [ ] SubTask 4.5: 修复发现的不一致

## Task 5: 导航栏毛玻璃 + 紧凑（E 节）
- [ ] SubTask 5.1: `app.wxss` 升级 `.nav-header`：height 88rpx → 72rpx
- [ ] SubTask 5.2: 加 `background: rgba(245, 243, 239, 0.72); backdrop-filter: blur(40px) saturate(2)` 到 `.nav-header`
- [ ] SubTask 5.3: 去掉 `border-bottom`，加 `box-shadow: 0 1rpx 0 rgba(122,78,43,0.04)`
- [ ] SubTask 5.4: `.nav-header-back` 64rpx → 56rpx
- [ ] SubTask 5.5: `.nav-header-title` font-size 32rpx → 30rpx
- [ ] SubTask 5.6: `.nav-header-right` gap 16rpx → 12rpx
- [ ] SubTask 5.7: 验证所有使用 nav-header 的页面 (collection/badges/record/settings/about/member/mode-intro/command-detail/escape-prep/photo-edit/generating/record-detail/timeline/year-review/mood-journal/city-progress/collection-category/daily-challenge/theme-market/community/badge-detail/achievements/stats/map-route/city-select/profile-edit/help/data-export/invite/partner-list/leaderboard/map)

## Task 6: 视觉高级感（F 节）
- [ ] SubTask 6.1: 审查主要页面的 shadow 使用，统一 var(--shadow-*) 引用
- [ ] SubTask 6.2: 审查 active 态 transform: scale 是否一致 (0.97-0.98)
- [ ] SubTask 6.3: 审查 ease 缓动是否统一
- [ ] SubTask 6.4: 修复发现的不一致

## Task 7: 最终验证
- [ ] SubTask 7.1: 首页底部无 quick-grid 4 个图标
- [ ] SubTask 7.2: 地图页 all/heat/route 3 模式视觉不同
- [ ] SubTask 7.3: 个人页 4-5 个分类卡片
- [ ] SubTask 7.4: 模拟不同屏幕尺寸 (320/375/414/480) 验证布局
- [ ] SubTask 7.5: 导航栏毛玻璃 + 72rpx
- [ ] SubTask 7.6: 全项目 grep `quick-grid` = 0 匹配
- [ ] SubTask 7.7: v3 6 模式 + 19 徽章 + 39 页不变
- [ ] SubTask 7.8: v4 z-index / daily-section / 模式芯片 / TabBar 不回退

# Task Dependencies

- Task 1 独立
- Task 2 依赖 Task 5 (map 的 nav-header 也要升级)
- Task 3 独立
- Task 4 独立
- Task 5 独立
- Task 6 独立
- Task 7 依赖所有 Task
