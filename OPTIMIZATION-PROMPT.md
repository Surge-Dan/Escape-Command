# 出逃指令 v2.0 — 全面优化 Prompt

> 本文档基于当前版本截图与 PRD v2.0 / UI-SPEC v2.0 / UX-SPEC v2.0 的逐项对比分析，整理出所有需要修复的问题。
> **使用方式：将本 Prompt 直接提供给 AI（如 Cursor / Claude / ChatGPT），让其逐项修复代码。**

---

## 一、全局性问题（影响所有页面）

### 1.1 自定义 TabBar 高度过大 — 【最高优先级】

**现状：** 当前自定义 TabBar（custom-tab-bar）占据屏幕底部约 180-200rpx + 安全区域，视觉占比过大，严重挤压内容区域。从截图看，TabBar 的高度几乎相当于半个卡片的高度。

**设计规范要求：**
- TabBar 高度应为 `160rpx + env(safe-area-inset-bottom)`
- 图标尺寸 48×48px，文字 22rpx
- 整体紧凑，不抢内容的风头

**修复方案：**
```
1. 减少 TabBar 容器的 padding-top/padding-bottom，目标总高度控制在 120rpx + 安全区
2. 图标从当前尺寸缩小到 44×44px（或保持 48px 但减少间距）
3. 文字字号确认是 22rpx，行高紧缩
4. 图标与文字之间的间距从当前的 ~16rpx 减少到 ~8rpx
5. 移除不必要的 margin/padding
6. 如果悬浮实现有性能/体验问题，改为 fixed 定位固定在最底部
7. 确保非 TabBar 页面（执行中、收藏夹、徽章墙等）不显示自定义 TabBar
8. 指令详情卡弹出时，TabBar 应被遮盖或不显示（z-index 层级管理）
```

**关键文件：**
- `custom-tab-bar/index.wxml`
- `custom-tab-bar/index.wxss`
- `custom-tab-bar/index.js`
- `app.json`（确认 `"tabBar": "custom"` 配置）

---

### 1.2 CSS 变量体系未统一生效

**现状：** 多个页面的样式可能没有正确引用 `app.wxss` 中定义的 CSS 变量，导致颜色、圆角、阴影不一致。

**修复方案：**
```css
/* 确认 app.wxss 中 page 选择器包含所有变量 */
page {
  /* 主色调 */
  --brand: #5CBF9E;
  --brand-dark: #45B08C;
  --brand-tint: #E0F5EF;
  --brand-weak: #F0FAF6;

  /* 中性色 */
  --canvas: #F5F3EF;
  --white: #FFFFFF;
  --ink: #2E2F33;
  --ink-soft: #6B7280;
  --ink-faint: #A8ADB5;
  --line: rgba(122, 78, 43, 0.06);

  /* 语义色 */
  --accent: #D48A5A;
  --accent-tint: #FFF0E6;
  --danger: #E05555;
  --danger-tint: #FFECEC;
  --gold: #C9B037;
  --gold-tint: #FFF0D4;

  /* 圆角 */
  --radius-sm: 12rpx;
  --radius-md: 20rpx;
  --radius-lg: 28rpx;
  --radius-xl: 36rpx;
  --radius-pill: 100rpx;

  /* 阴影 */
  --shadow-card: 0 2rpx 16rpx rgba(46, 47, 51, 0.04);
  --shadow-elevated: 0 4rpx 24rpx rgba(46, 47, 51, 0.08);
  --shadow-popup: 0 8rpx 40rpx rgba(46, 47, 51, 0.12);
  --shadow-float: 0 2rpx 12rpx rgba(46, 47, 51, 0.06);

  /* 边框 */
  --border: 2rpx solid rgba(122, 78, 43, 0.06);

  /* 缓动 */
  --ease-standard: cubic-bezier(0.25, 0.1, 0.25, 1.0);
  --ease-bounce: cubic-bezier(0.34, 1.56, 0.64, 1.0);
  --ease-out: cubic-bezier(0.0, 0.0, 0.2, 1.0);
}
```

**检查清单：**
- [ ] 所有页面的 wxss 是否使用了 `var(--brand)` 等变量而非硬编码颜色
- [ ] 卡片圆角是否使用 `var(--radius-xl)`
- [ ] 阴影是否使用 `var(--shadow-card)`
- [ ] 背景色是否使用 `var(--canvas)`

---

## 二、首页（pages/index）问题

### 2.1 模式芯片仍为 6 个 —【P0 必须修复】

**现状：** 截图显示模式选择区仍有 6 个芯片：`智能匹配`、`微出逃`、`城市漫游`、`双人出逃`、`深夜出逃`、`雨天出逃`

**PRD 要求：** 简化为 3 个——智能匹配（默认）、微出逃、城市漫游

**雨天/深夜逻辑应融入智能匹配的自动过滤，不再作为独立模式；双人模式暂时隐藏**

**修复方案：**
```javascript
// pages/index/index.js
// 修改 modes 数组，只保留 3 个
const modes = [
  { id: 'smart', name: '智能匹配', icon: 'dice-5-brand-strong', iconWhite: 'dice-5-white' },
  { id: 'quick', name: '微出逃', icon: 'sprout-brand-strong', iconWhite: 'sprout-white' },
  { id: 'roam', name: '城市漫游', icon: 'footprints-coral', iconWhite: 'footprints-white' },
];
// 双人/深夜/雨天的代码保留但注释掉，不要删除
```

```xml
<!-- pages/index/index.wxml -->
<!-- mode-list 区域只渲染 3 个芯片 -->
<view class="mode-list">
  <view
    wx:for="{{modes}}"
    wx:key="id"
    class="mode-chip {{currentMode === item.id ? 'active' : ''}}"
    bindtap="selectMode"
    data-id="{{item.id}}"
  >
    <image src="/assets/icons/{{currentMode === item.id ? item.iconWhite : item.icon}}" mode="aspectFit" />
    <text>{{item.name}}</text>
  </view>
</view>
```

**同时修复：**
- [ ] 芯片选中态：背景变 `--brand`，文字变白色，图标切换为 white 版本
- [ ] 点击芯片时触发 `wx.vibrateShort({ type: 'medium' })`
- [ ] 显示 Toast 提示模式名称（如 `"已切换到 微出逃 模式"`）
- [ ] 芯片高度 64rpx，圆角 `--radius-pill`

---

### 2.2 问候语+天气+位置 信息层级

**现状：** 截图显示为 `"下午好，当前位置附近 26℃ 晴"` 一行，这已经符合 PRD 的"合并为一行"要求。

**但仍需检查和优化：**
- [ ] 这一行的高度是否过大？目标是在状态栏下方紧凑排列
- [ ] 字号应该是 Body 28rpx，颜色 `--ink-soft`
- [ ] 时间段适配是否生效？（早/上午/午安/下午/傍晚/晚上/夜深）
- [ ] 天气数据是否仍是硬编码？需要接入真实 API（Phase 1 任务）

**布局参考：**
```
状态栏（动态高度，约 44-56px）
───────────────
padding: 20rpx 40rpx
"下午好，广州·天河 26℃ 晴"   ← 28rpx / --ink-soft / 单行
padding-bottom: 16rpx
```

---

### 2.3 出逃触发卡片区域

**现状基本正确**，但需确认以下细节：

**检查清单：**
- [ ] 图标是骰子（dice）不是飞机 ✅（截图已显示骰子）
- [ ] 标题是"出逃一下"不是"摇一摇" ✅
- [ ] 副标题是"点击卡片，开始出逃"——PRD 要求写"点击卡片 或 摇一摇手机"
- [ ] 有脉冲环动画暗示可点击（idle 态持续播放）
- [ ] 点击触发的延迟是否已从 600ms 减少到 200ms？
- [ ] "今日剩余 X 次"的文案——数字用等宽字体，绿色高亮
- [ ] 卡片整体圆角 `--radius-xl`，阴影 `--shadow-card`

**动画规范确认：**
```css
/* 呼吸缩放动画 - idle 态持续 */
@keyframes breathe {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.04); }
}
.dice-icon { animation: breathe 2s ease-in-out infinite; }

/* 脉冲环 - idle 态提示 */
@keyframes pulse-ring {
  0% { transform: scale(0.96); opacity: 0; }
  50% { transform: scale(1.04); opacity: 0.5; }
  100% { transform: scale(0.96); opacity: 0; }
}
.pulse-ring { animation: pulse-ring 2.5s ease-in-out infinite; }

/* 触发动效 */
@keyframes dice-roll {
  0% { transform: scale(0.85); }
  50% { transform: scale(1.05); }
  70% { transform: scale(0.98); }
  100% { transform: scale(1); }
}
```

---

### 2.4 指令详情卡（弹出态）

**现状问题（截图4）：**

| 问题 | 严重程度 | 说明 |
|------|---------|------|
| 指令卡弹出时 TabBar 仍在底部 | **高** | 造成 z-index 冲突，指令卡应该覆盖在 TabBar 之上，或者隐藏 TabBar |
| 场景插画区域是空白浅绿色 | **中** | 需要加载对应的场景 WebP 图片，或显示类型色的渐变占位 |
| 操作按钮布局 | **低** | `[重摇]` `[接受指令]` `[关闭]` 三个按钮的间距和对齐需要调整 |

**修复方案：**

```css
/* 指令详情卡的 z-index 必须高于 TabBar */
.command-card {
  position: fixed;  /* 或 absolute */
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 999;  /* 确保高于 custom-tab-bar 的 z-index */
  border-radius: var(--radius-xl) var(--radius-xl) 0 0;
  animation: slideUp 300ms var(--ease-bounce) forwards;
}

@keyframes slideUp {
  from { transform: translateY(40rpx); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}
```

```xml
<!-- 指令详情卡结构 -->
<view class="command-card" wx:if="{{showCommandCard}}">
  <!-- 类型标签 -->
  <view class="command-tag" style="background: {{command.typeColor}}15; color: {{command.typeColor}}">
    {{command.typeName}}
  </view>

  <!-- 标题 -->
  <text class="command-title">{{command.title}}</text>

  <!-- 场景插画 -->
  <image
    class="command-scene"
    src="{{command.sceneImage || '/assets/images/default-scene.webp'}}"
    mode="aspectFill"
  />
  <!-- 如果没有图片，显示渐变色块占位 -->
  <view class="command-scene-placeholder" wx:if="{{!command.sceneImage}}"
        style="background: linear-gradient(135deg, {{command.typeColor}}30, {{command.typeColor}}10)">
    <image class="scene-type-icon" src="{{command.typeIcon}}" mode="aspectFit" />
  </view>

  <!-- 元信息 -->
  <view class="command-meta">
    <text>⏱ 约{{command.duration}}分钟</text>
    <text>📍 {{command.distance || ' nearby'}}</text>
    <text>👤 {{command.social ? '多人' : '一个人'}}</text>
  </view>

  <!-- 小贴士 -->
  <view class="command-tip">
    <text class="tip-dot">💡</text>
    <text>{{command.tip}}</text>
  </view>

  <!-- 操作按钮组 -->
  <view class="command-actions">
    <button class="btn-secondary" bindtap="reRoll">重摇</button>
    <button class="btn-primary" bindtap="acceptCommand">接受指令</button>
    <button class="btn-text" bindtap="closeCommand">关闭</button>
  </view>
</view>
```

**按钮交互：**
- [ ] "重摇"：消耗换卡次数，重新 roll，带震动反馈
- [ ] "接受指令"：跳转执行页 `navigateTo executing`
- [ ] "关闭"：收起卡片，回到首页空闲态（**注意：PRD 明确说"放弃"改为"关闭"，不再调用空函数 stopProp**）

---

### 2.5 我的收藏区域

**截图显示：**
- 标题 "我的收藏" + "0 条指令"
- 右侧箭头指示可点击

**检查清单：**
- [ ] 收藏区域的图标应该是书签/收藏图标（`bookmark.svg`）
- [ ] 点击后 `navigateTo` 到 `pages/collection/collection`
- [ ] 收藏数 > 0 时，显示最近 1-2 条收藏预览

---

### 2.6 今日推荐区域

**截图显示：**
- 标题 "今日推荐 基于" + 天气和时间
- 横向滚动的推荐卡片列表
- 卡片被截断（底部被 TabBar 遮挡）

**问题：**
1. 推荐列表的底部 padding 不够，没有考虑 TabBar 高度
2. 卡片信息不完整（标题截断）

**修复：**
```css
/* 今日推荐区域 */
.recommend-section {
  padding-bottom: calc(200rpx + env(safe-area-inset-bottom)); /* 为 TabBar 留空间 */
}

/* 推荐卡片横向滚动 */
.recommend-scroll {
  white-space: nowrap;
  padding: 0 40rpx 20rpx;
}
.recommend-card {
  display: inline-block;
  width: 280rpx;
  margin-right: 20rpx;
  vertical-align: top;
}
/* 最后一张卡片不需要右边距 */
.recommend-card:last-child {
  margin-right: 40rpx; /* 保持右边距 */
}
```

---

## 三、执行页（pages/executing）问题

### 3.1 步骤引导 — 已实现但需验证细节

**截图5显示步骤引导已经实现了**，看起来不错！但需要验证：

**检查清单：**
- [ ] 已完成步骤：✅ 绿色勾 + 绿色文字
- [ ] 当前步骤：● 高亮 + 品牌色 + 脉冲动画提示
- [ ] 待完成步骤：○ 灰色 + 灰色文字
- [ ] 步骤编号（第1步、第2步...）字号 Caption 24rpx
- [ ] 步骤标题字号 Body 28rpx
- [ ] 步骤之间有连接线（已完成部分为绿色实线，待完成部分为灰色虚线）
- [ ] 步骤数据来自 `currentCommand.steps` 数组，有兜底默认值

**步骤引导动效：**
```css
/* 当前步骤脉冲 */
.step-current .step-circle {
  animation: step-pulse 1.5s ease-in-out infinite;
}
@keyframes step-pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(92, 191, 158, 0.4); }
  50% { box-shadow: 0 0 0 12rpx rgba(92, 191, 158, 0); }
}
```

---

### 3.2 计时器与进度条

**检查清单：**
- [ ] 文案："已探索 XX 分钟"（友好文案）✅
- [ ] 进度条基于 command.duration 计算百分比
- [ ] 进度条颜色 `--brand`，背景 `--brand-weak`
- [ ] 进度条圆角 `--radius-pill`
- [ ] 下方显示 "预计还需 XX 分钟"

---

### 3.3 拍照记录区域

**检查清单：**
- [ ] 最多 3 张照片
- [ ] 缩略图横向排列
- [ ] 计数显示 "X / 3"
- [ ] 点击拍照调用 `wx.chooseMedia`
- [ ] 空态显示一个拍照入口（相机图标 + "拍照"文字）

---

### 3.4 完成出逃按钮

**截图显示已基本正确：**
- 全宽、品牌色、圆角按钮 ✅

**确认：**
- [ ] 高度 80rpx
- [ ] 圆角 `--radius-pill`
- [ ] 字号 28rpx / 600
- [ ] 点击后长震动 + `navigateTo` 到记录页
- [ ] 按钮距离底部有足够间距（不被遮挡）

---

### 3.5 小贴士展示

**截图显示页面底部有小贴士区块：**
- "小贴士"标签 + 内容文字
- 浅黄色/米色背景

**确认样式：**
```css
.tip-card {
  background: var(--gold-tint);
  border-radius: var(--radius-md);
  padding: 20rpx 24rpx;
  margin-top: 20rpx;
}
.tip-label {
  color: var(--gold);
  font-size: 22rpx;
  font-weight: 500;
}
.tip-content {
  color: var(--ink);
  font-size: 28rpx;
  line-height: 1.5;
}
```

---

## 四、地图页（pages/map）问题

### 4.1 地图内容为空

**现状：** 截图6显示地图区域几乎是空白的（只有极淡的网格），只有一个橙色定位标记在右上角。

**这是最严重的问题之一。**

**原因分析与修复方向：**

1. **地图组件初始化问题**
```xml
<!-- map.wxml -->
<map
  id="escapeMap"
  latitude="{{latitude}}"
  longitude="{{longitude}}"
  scale="{{scale}}"
  show-location
  markers="{{markers}}"
  bindmarkertap="onMarkerTap"
  bindregionchange="onRegionChange"
  style="width: 100%; height: 100%;"
/>
```

2. **markers 数据未正确传递**
```javascript
// pages/map/map.js
// 需要从 globalData.records 生成 markers 数据
Page({
  data: {
    latitude: 23.1291,  // 默认广州，获取定位后更新
    longitude: 113.2644,
    scale: 15,
    markers: [],
  },

  onShow() {
    this.loadLocation();
    this.loadMarkers();
  },

  loadMarkers() {
    const records = getApp().globalData.records || [];
    const markers = records
      .filter(r => r.location)  // 只有没有位置信息的记录
      .map((record, index) => ({
        id: index,
        latitude: record.location.latitude,
        longitude: record.location.longitude,
        title: record.commandContent,
        // 使用手绘风格的 callout 或自定义 callout
        callout: {
          content: record.commandContent.substring(0, 10),
          display: 'BY_CLICK',
          borderRadius: 12,
          padding: 8,
        },
        // 自定义 marker 图标（按类型）
        iconPath: `/assets/icons/pin-${this.getTypeKey(record.typeColor)}.svg`,
        width: 32,
        height: 32,
      }));
    this.setData({ markers });
  },
});
```

3. **如果确实没有记录数据，显示空状态**
```xml
<view class="map-empty" wx:if="{{markers.length === 0 && !loading}}">
  <image src="/assets/icons/empty-map.svg" mode="aspectFit" class="empty-icon" />
  <text class="empty-title">还没有出逃记录</text>
  <text class="empty-desc">完成出逃指令后，这里会标记你的足迹</text>
  <button class="btn-primary" bindtap="goHome">去摇一摇</button>
</view>
```

---

### 4.2 地图页顶部控件

**截图显示：**
- 标题 "出逃地图"
- Tab 切换：全部 | 热力图 | 路线模式
- 时间筛选：今天 | 本周 | 本月 | 全部

**问题：**
1. 顶部筛选栏占用空间过多
2. 热力图/路线模式功能可能未实现（不应展示不可用的功能）

**修复建议：**
- [ ] 热力图和路线模式如果没实现就先隐藏或置灰
- [ ] 时间筛选用更紧凑的设计（横排胶囊）
- [ ] 定位按钮和刷新按钮放在地图右下角悬浮

---

### 4.3 底部数据卡

**PRD 要求底部有数据卡：** 出逃次数 / 探索角落 / 徽章数 / 连续天数

**截图底部只显示了日期 "07月05日 1条"**，不符合规范。

**修复：**
```xml
<!-- 底部数据统计卡 -->
<view class="map-stats-card">
  <view class="stat-item">
    <text class="stat-value">{{stats.totalCount}}次</text>
    <text class="stat-label">出逃</text>
  </view>
  <view class="stat-item">
    <text class="stat-value">{{stats.placeCount}}个</text>
    <text class="stat-label">角落</text>
  </view>
  <view class="stat-item">
    <text class="stat-value">{{stats.badgeCount}}枚</text>
    <text class="stat-label">徽章</text>
  </view>
  <view class="stat-item">
    <text class="stat-value}}{{stats.streakDays}}天</text>
    <text class="stat-label">连续</text>
  </view>
</view>
```

---

## 五、"我的"页面（pages/profile）问题

### 5.1 会员入口未隐藏

**截图7清晰显示有 "开通出逃会员" 卡片和 "去开通" 按钮。**

**PRD 3.2 明确指出会员系统白痴指数 10/10，要求暂时隐藏。**

**修复：**
```xml
<!-- pages/profile/profile.wxml -->
<!-- 注释掉或 wx:if="{{false}}" 隐藏会员卡片 -->
<!-- <view class="member-card" wx:if="{{false}}">
  ...
</view> -->
```

---

### 5.2 用户信息区域

**截图显示基本正确：**
- 头像 + 昵称 + 出逃代号 + 编辑按钮 ✅

**检查：**
- [ ] 头像尺寸 108rpx，圆形，边框 `3rpx solid rgba(92,191,158,0.2)` ✅
- [ ] 编辑按钮使用 `pencil-brand.svg` 图标
- [ ] 点击编辑弹出修改代号弹窗（限制12字）

---

### 5.3 数据统计区域

**截图显示：** 3次累计出逃 | 0天最长连续 | 1枚解锁徽章 | 1个城市覆盖

**PRD 要求：** 出逃次数 / 步行公里 / 连续天数 / 探索角落

**差异：**
- 当前是"解锁徽章"和"城市覆盖"，PRD 要的是"步行公里"和"探索角落"
- 需要确认数据字段对齐

---

### 5.4 功能列表

**截图显示的功能入口：**
- 时间线 → 出逃记录回顾
- 年度回顾 → 这一年的出逃
- 心情日记 → 心情趋势变化
- 城市足迹 → 探索覆盖进度
- 成就墙 → 星程碑与造击

**问题：**
1. 这些功能中有多少是已实现的？未实现的入口不应该展示
2. 截面底部被截断（"已解锁徽章"只露出一半）
3. 列表项的右侧箭头图标是否统一？

**修复：**
- [ ] 未实现的页面入口隐藏或标注"即将上线"
- [ ] 底部留足 TabBar 的安全距离
- [ ] 统一使用 `chevron-right-faint.svg` 作为右箭头

---

### 5.5 徽章墙预览

**截图显示在功能列表上方有 "开通出逃会员" 卡片**（应隐藏），没有看到徽章预览区。

**PRD 要求：** 最近 4 个徽章预览，点击进入完整徽章页

**修复：**
```xml
<!-- 徽章墙预览 -->
<view class="badge-preview-section">
  <view class="section-header">
    <text class="section-title">徽章墙</text>
    <text class="section-action" bindtap="goBadges">查看全部 {{badges.length}} 枚 ›</text>
  </view>
  <scroll-view class="badge-scroll" scroll-x enable-flex>
    <view class="badge-item" wx:for="{{recentBadges}}" wx:key="id">
      <image class="badge-icon" src="{{item.unlocked ? item.icon : '/assets/icons/lock-coral.svg'}}" />
      <text class="badge-name">{{item.name}}</text>
    </view>
  </scroll-view>
</view>
```

---

## 六、收藏页（pages/collection）问题

### 6.1 空状态 — 已实现 ✅

**截图2显示空状态正常：**
- 占位图标 + "还没有收藏任何指令" + "去发现更多出逃指令" 按钮 ✅

**只需确认：**
- [ ] 按钮点击跳转到首页
- [ ] 按钮品牌色 `--brand`

---

### 6.2 筛选标签

**截图显示：** 全部 | 想去 | 已完成 | 收藏 | 最新

**问题：**
- 5 个标签在一行可能拥挤
- "最新" 后面的排序图标是否可用？

**修复：**
```css
.filter-scroll {
  white-space: nowrap;
  padding: 16rpx 0;
}
.filter-tag {
  display: inline-block;
  padding: 10rpx 28rpx;
  margin-right: 16rpx;
  font-size: 26rpx;
  border-radius: var(--radius-pill);
  /* 默认态 */
  background: var(--white);
  color: var(--ink-soft);
  border: var(--border);
  /* 选中态 */
  &.active {
    background: var(--brand);
    color: var(--white);
    border: none;
  }
}
```

---

## 七、徽章墙页（pages/badges）问题

### 7.1 布局列数

**截图8显示徽章是单列或双列布局**，每个徽章卡片很大。

**PRD 要求 3 列网格布局。**

**修复：**
```css
.badge-grid {
  display: flex;
  flex-wrap: wrap;
  padding: 24rpx 20rpx;
  gap: 20rpx;
}
.badge-item {
  width: calc((100% - 40rpx) / 3);  /* 3列等分 */
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20rpx 8rpx;
  background: var(--white);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-card);
}
.badge-icon-wrap {
  width: 120rpx;
  height: 120rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 12rpx;
  /* 已解锁：渐变背景 */
  &.unlocked {
    background: {{badge.gradient}};
    box-shadow: var(--shadow-elevated);
  }
  /* 未锁定：灰色 */
  &.locked {
    background: #F0F0F0;
  }
}
.badge-icon {
  width: 64rpx;
  height: 64rpx;
}
.badge-name {
  font-size: 24rpx;
  font-weight: 600;
  color: var(--ink);
  text-align: center;
}
.badge-date {
  font-size: 20rpx;
  color: var(--ink-faint);
  margin-top: 4rpx;
}
.badge-status {
  font-size: 20rpx;
  color: var(--ink-faint);
  margin-top: 4rpx;
}
```

---

### 7.2 进度条

**截图显示：** "已解锁 1/19" + 进度条 ✅

**确认：**
- [ ] 总数 19 还是应该是 PRD 的其他数字？（PRD 提到多种数量）
- [ ] 进度条颜色 `--brand`，背景 `--brand-weak`
- [ ] 百分比文字显示

---

### 7.3 分类标题

**截图显示：** "里程碑徽章 (3)" 和 "类型徽章 (3)" — 分组显示很好 ✅

**确认分类逻辑：**
- 里程碑徽章：初次出逃、七连胜、月度漫游家...
- 类型徽章：蓝色猎人、雨天漫步者、菜市场熟客...

---

### 7.4 徽章图标

**当前可能是 Unicode 字符或简单图标。** PRD 要求替换为 SVG 手绘风格图标。

**ASSETS-INVENTORY.md 定义了 9 个徽章 SVG 图标：**
- badge-first-escape.svg（金色五角星）✅ 截图已显示金色圆形
- badge-seven-streak.svg（薄荷绿 7）
- badge-thirty-streak.svg（紫色花环）
- badge-color-hunter.svg（蓝色眼睛）
- badge-night-walker.svg（灰色月亮）
- badge-rainy-walker.svg（蓝色雨伞）
- badge-market-regular.svg（橙色菜篮）
- badge-city-detective.svg（金色放大镜）
- badge-member-pro.svg（深灰皇冠）

**未解锁的徽章应显示 lock-coral.svg（锁图标）。**

---

## 八、交互联动问题

### 8.1 首页 → 执行页 → 记录页 流转

**完整流程检查：**

```
首页(点击/摇一摇) → 弹出指令详情卡 → [接受指令]
  → navigateTo 执行页
  → 执行页：计时 + 步骤 + 拍照
  → [完成出逃] → navigateTo 记录页
  → 记录页：滤镜 + 心情 + 感受
  → [保存记录] → navigateTo generating 页（过渡动画）
  → 保存成功弹层 → [分享] / [保存相册] / [返回首页]
```

**需要验证的联动点：**
- [ ] 指令数据是否通过 globalData.currentCommand 正确传递？
- [ ] 执行页计时器是否自动开始？返回时是否暂停？
- [ ] 拍照的临时路径是否正确传递到记录页？
- [ ] 记录保存后是否写入 globalData.records？
- [ ] 保存后是否触发徽章检查？
- [ ] generating 过渡动画页是否存在并正常工作？

---

### 8.2 TabBar 状态同步

**问题：** 自定义 TabBar 在某些场景下可能不同步。

**确保以下行为：**
- [ ] 在首页时，"出逃" Tab 为 active 态（绿色图标）
- [ ] 在地图页时，"地图" Tab 为 active 态
- [ ] 在"我的"页面时，"我的" Tab 为 active 态
- [ ] 非 TabBar 页面（执行、记录、收藏、徽章、设置）不显示 TabBar
- [ ] 每次 `onShow` 时调用 `this.getTabBar().setData({ selected: 'xxx' })`

---

### 8.3 数据刷新时机

**需要在以下时机刷新数据：**
- [ ] 首页 `onShow`：刷新天气、位置、剩余次数
- [ ] 地图页 `onShow`：刷新 markers
- [ ] "我的"页面 `onShow`：刷新统计数据、徽章数据
- [ ] 徽章墙页 `onShow`：刷新徽章解锁状态
- [ ] 从执行页返回首页时：重置指令状态为 idle

---

## 九、动效与反馈问题

### 9.1 震动反馈清单

| 交互 | 震动类型 | 当前状态 |
|------|---------|---------|
| 点击模式芯片 | `vibrateShort({type:'medium'})` | 需确认 |
| 摇一摇触发 | `vibrateShort({type:'heavy'})` | 需确认 |
| 重摇 | `vibrateShort({type:'light'})` | 需确认 |
| 接受指令 | `vibrateLong()` | 需确认 |
| 完成出逃 | `vibrateLong()` | 需确认 |
| 保存记录 | `vibrateShort({type:'medium'})` | 需确认 |
| 解锁徽章 | `vibrateLong()` | 需确认 |

**注意：** PRD 技术债务提到要移除包装函数，改用 `wx.vibrateShort()` 直调。

---

### 9.2 动画完整性检查

| 动画 | 时长 | 缓动 | 当前状态 |
|------|------|------|---------|
| 出逃触发（骰子弹跳+呼吸） | 400ms | bounce | 需确认是否 400ms（原 600ms） |
| 脉冲环（idle 态循环） | 2500ms | ease-in-out | 需确认 |
| 指令卡片滑入 | 300ms | bounce | 需确认 |
| 模式芯片切换 | 200ms | standard | 需确认 |
| 徽章解锁弹出 | 800ms | bounce | 需确认 |
| 拍立得保存 | 500ms | bounce | 需确认 |
| 页面转场 | 250ms | standard | 可能在 app.json 配置 |

---

## 十、文案一致性检查

### 10.1 按钮文案

| 位置 | 正确文案 | 错误文案 |
|------|---------|---------|
| 首页触发卡 | "出逃一下" | "摇一摇" ❌ |
| 指令卡操作1 | "重摇" | "换一个" ❌ |
| 指令卡操作2 | "接受指令" | "开始"/"GO" ❌ |
| 指令卡操作3 | "关闭" | "放弃"/"取消" ❌ |
| 执行页完成 | "完成出逃" | "Finish"/"结束" ❌ |
| 记录页保存 | "保存记录" | "Save"/"提交" ❌ |

### 10.2 问候语文案

根据时间段自动切换：
```
05:00-08:59 → "早啊，早起的人有风景看"
09:00-11:59 → "上午好，今天天气不错，出去走走？"
12:00-13:59 → "午安，午饭后散散步吧"
14:00-16:59 → "下午好，给下午一个小冒险"
17:00-18:59 → "傍晚好，日落前出去走走"
19:00-21:59 → "晚上好，周五了，想好周末去哪了吗？"（需根据星期几动态化）
22:00-04:59 → "夜深了，睡不着就起来透透气"
```

---

## 十一、技术债务清理清单

来自 TASKS-v2.md Phase 4：

- [ ] `app.js` 移除 `vibrateShort()` 和 `vibrateLong()` 包装函数，改用 `wx.vibrateShort()` 直调
- [ ] 统一各页面的 `statusBarHeight`/`capsuleTop` 计算逻辑到 `app.js` 公共方法
- [ ] 移除 `pages/index/index.js` 中未使用的 `menuBtnRight`/`menuBtnWidth` 数据字段
- [ ] 统一 `typeNameMap`/`typeColorMap`/`typeIconMap` 到单独的 `utils/constants.js` 文件
- [ ] 移除 `pages/badge` 目录（旧徽章页）
- [ ] 隐藏 `pages/member/member` 入口
- [ ] 隐藏双人模式芯片
- [ ] 删除 `pages/create/create`（空页面）
- [ ] `app.json` 移除不使用的页面路径

---

## 十二、优先级排序总结

### P0 — 必须立即修复（影响核心体验）

| # | 问题 | 影响 |
|---|------|------|
| 1 | **TabBar 高度过大** | 所有 TabBar 页面内容区被严重压缩 |
| 2 | **模式芯片 6→3 简化** | 首页信息过载，违背 PRD 核心决策 |
| 3 | **指令卡与 TabBar z-index 冲突** | 指令详情卡弹出时体验混乱 |
| 4 | **地图页空白** | 地图页完全不可用 |
| 5 | **"我的"页面会员入口未隐藏** | 违背产品决策，误导用户 |
| 6 | **"放弃"按钮改为"关闭"** | 功能性 bug（调用空函数） |

### P1 — 重要优化（影响品质感）

| # | 问题 | 影响 |
|---|------|------|
| 7 | 徽章墙布局改为 3 列网格 | 与 UI-SPEC 不符 |
| 8 | 首页底部内容被 TabBar 遮挡 | 布局溢出 |
| 9 | 地图页底部数据卡缺失 | 功能不完整 |
| 10 | 徽章墙预览区域缺失 | "我的"页面缺少重要模块 |
| 11 | 动效时长不一致（触发响应目标 200ms） | 体验不够流畅 |
| 12 | 震动反馈未全覆盖 | 交互反馈缺失 |

### P2 — 完善细节（打磨体验）

| # | 问题 | 影响 |
|---|------|------|
| 13 | 场景插画缺失（使用占位） | 视觉品质 |
| 14 | 徽章图标未替换为 SVG | 视觉品质 |
| 15 | 今日推荐卡片截断 | 布局细节 |
| 16 | "我的"页面底部截断 | 布局细节 |
| 17 | 筛选标签可能拥挤 | 适配问题 |
| 18 | 技术债务清理 | 代码健康度 |
| 19 | 数据刷新时机完善 | 数据一致性 |
| 20 | 文案全量校验 | 品牌一致性 |

---

## 十三、给 AI 的最终指令模板

> 将以下内容直接复制给 AI（Cursor / Claude Code / 其他编码助手）：

```
你是一个微信小程序开发专家。请根据以下需求对"出逃指令"小程序进行全面的代码优化。

## 项目概况
这是一个名为"出逃指令"的城市随机探索工具微信小程序。
技术栈：微信小程序原生框架（WXML/WXSS/JS/JSON）
项目路径：你的项目根目录

## 设计规范摘要
- 品牌色：#5CBF9E（薄荷绿）
- 背景色：#F5F3EF（暖白）
- 主文字：#2E2F33（墨黑）
- 圆角：sm 12rpx / md 20rpx / lg 28rpx / xl 36rpx / pill 100rpx
- 风格：手绘温暖风 × 杂志排版 × 反AI化
- 所有样式必须使用 app.wxss 中定义的 CSS 变量

## 请按以下优先级依次修复所有问题：

### 第一步：P0 紧急修复（6项）
1. 自定义 TabBar 高度优化：从当前约 200rpx 减少到 120rpx+ 安全区
2. 首页模式芯片从 6 个简化为 3 个（保留双人/深夜/雨天代码但注释隐藏）
3. 指令详情卡 z-index 修复（确保覆盖 TabBar）
4. 地图页数据绑定修复（markers 从 globalData.records 生成）
5. "我的"页面隐藏会员入口卡片
6. 指令卡"放弃"按钮改为"关闭"（关闭卡片，不执行 abandon 逻辑）

### 第二步：P1 重要优化（6项）
7. 徽章墙改为 3 列网格布局
8. 首页今日推荐区域增加底部 padding（适配 TabBar）
9. 地图页添加底部数据统计卡
10. "我的"页面添加徽章墙预览区（最近 4 个）
11. 动效时长统一（触发 200ms，卡片出现 300ms，pulse 2500ms）
12. 所有交互点补充震动反馈

### 第三步：P2 细节打磨（8项）
13-20. 见上述 P2 清单

## 关键约束
- 不要破坏现有功能
- 每次修改后确认该页面可以正常打开和操作
- 所有颜色/圆角/阴影必须使用 CSS 变量
- 保持代码整洁，删除注释掉的死代码
- 修改完每个页面后在微信开发者工具中预览确认效果

## 输出要求
请逐个文件列出你做了哪些修改，以及为什么这样改。
对于每个 P0 问题，修改后附上关键代码片段说明。
```

---

*本文档基于 2026-07-08 版本截图分析生成，对应 PRD v2.0 / UI-SPEC v2.0 / UX-SPEC v2.0 / ASSETS-INVENTORY v3.0*
