# 出逃指令 · UI 精细化与体验补齐 — 设计文档

> **日期**: 2026-07-11
> **版本**: v1（已批准）
> **范围**: 首页 / 指令详情卡 / 执行页 / 地图页 / 自定义 TabBar
> **关联文档**: `docs/PRD-v2.md`、`docs/UI-SPEC-v2.md`、`docs/UX-SPEC-v2.md`、`docs/ASSETS-INVENTORY.md`、`OPTIMIZATION-PROMPT.md`

---

## 一、目标

根据用户截图与文字反馈，针对以下三类问题进行一次精细化修复：

1. **首页**：模式选择位置与反馈、每日推荐差异化、导航栏高度
2. **任务/执行**：按钮与卡片圆角、图标体系、步骤完成机制
3. **地图**：地图类型（普通 / 卫星 / 路线）、回到定位

不引入新功能，只对现有功能做视觉与交互补齐。

---

## 二、决策记录（已通过 brainstorming 确认）

| # | 决策点 | 结论 | 替代方案 |
|---|--------|------|----------|
| 1 | 出逃步骤完成机制 | **用户主动点击 + 进度条作参考**，必须 4 步全部完成才能点「完成出逃」 | 计时驱动 / 纯手动无参考 |
| 2 | 首页模式选择样式 | 顶部 6 模式横向胶囊**删除**，改为「出逃一下」大卡上挂一个「当前模式 Tag」+ 点 Tag 弹出底部 Sheet（24rpx 上圆角，3 个模式：智能 / 微 / 漫游） | 保留 3 模式胶囊 + 强反馈 |
| 3 | 卫星地图实现 | **改用高德地图 subkey 接口**；高德标准 key 与卫星 key 分别从 `wx.getStorageSync('AMAP_STANDARD_KEY')` / `AMAP_SATELLITE_KEY` 读取；缺失时降级为提示 | 用腾讯卫星 subkey / 不做卫星 |
| 4 | 圆角尺度 | **小圆角**：按钮 16rpx / 卡片 20rpx / 标签 10rpx / 表 6rpx | 中圆角 / 只调 card |
| 5 | 图标体系 | **续用 ASSETS-INVENTORY.md 现有体系**（彩色面性风 / 圆形底渐变 / 高光），只新增 3 个：check-brand / chevron-right-brand / chevron-down-ink | 全部重设手绘风 |
| 6 | 每日推荐差异化 | 每次 `onShow` 用 `Date.now()` 做种子 + 与 `lastDailyIds`（storage）对比，相同则重洗，保证每次不同 | 算法分层（保留） |
| 7 | 导航栏（自定义 TabBar） | 总高从 130rpx → 约 100rpx，icon 56rpx → 40rpx，padding 16/24 → 12/20 | 不动 |

---

## 三、文件变更总览

| 路径 | 改动类型 | 说明 |
|------|----------|------|
| `app.wxss` | 改 | 新增 `--radius-{xs,sm,md,lg,xl}`，调整 `--radius-pill` 仅用于 TabBar |
| `app.js` | 改 | 新增高德 key 存储；新增 `rollCommandForMode()` 暴露给页面 |
| `pages/index/index.wxml` | 改 | 删顶部模式胶囊；新增「当前模式 Tag」+ 模式选择 Sheet 结构 |
| `pages/index/index.wxss` | 改 | 圆角调整；新增 `.mode-tag` `.mode-sheet` `.mode-option` 样式 |
| `pages/index/index.js` | 改 | `loadDailyRecommend` 加随机种子与 `lastDailyIds` 防重；`selectMode` 改为 `onModeTagTap` / `onModeOptionTap` |
| `pages/command-detail/command-detail.wxml` | 改 | 步骤行展开图标换 `chevron-down-faint`；底部 action-bar 紧凑化 |
| `pages/command-detail/command-detail.wxss` | 改 | 圆角调整；`.action-bar` 高度收紧 |
| `pages/executing/executing.wxml` | 改 | 步骤行新增「完成 →」按钮；步骤编号圆变 16rpx 圆角矩形；删除 stepIcons |
| `pages/executing/executing.wxss` | 改 | 圆角调整；新增 `.step-finish-btn` `.step-row.finished .step-mark` |
| `pages/executing/executing.js` | 改 | `data.steps` 从 `string[]` → `{id,text,done}[]`；新增 `onStepTap`；`currentStep` = 第一个未完成索引；`progressPct` = `doneCount/total` |
| `pages/map/map.wxml` | 改 | 三类 tab：普通 / 卫星 / 路线；时间筛选保留；定位按钮保留 |
| `pages/map/map.wxss` | 改 | 圆角调整；定位按钮加 `:active` 反馈 |
| `pages/map/map.js` | 改 | `MAP_TABS` 重构；`mapSubkey` 动态切换；`locate()` 用 `mapContext.moveToLocation()`；处理 key 缺失降级 |
| `custom-tab-bar/index.wxml` | 改 | 标签字号 24rpx → 22rpx，容器缩小 |
| `custom-tab-bar/index.wxss` | 改 | padding 12/20，min-height 76rpx，icon 40rpx，整体高度收紧 |
| `app.wxss`（`.tabbar-placeholder`） | 改 | 130rpx → 100rpx |
| `assets/icons/check-brand.svg` | 新 | 品牌色对勾（绿色背景白色对勾）|
| `assets/icons/chevron-right-brand.svg` | 新 | 品牌色右箭头 |
| `assets/icons/chevron-down-ink.svg` | 新 | 深灰向下展开箭头 |
| `utils/constants.js` | 改 | `MODE_LIST` 缩减为 3 个：smart / micro / walk；保留 6 个 modeId 给 app.js 加权使用 |

---

## 四、全局设计令牌

### 圆角尺度（修改 `app.wxss` 的 `:page` 块）

```css
page {
  /* 新增 / 调整 */
  --radius-xs: 6rpx;     /* 表/小元素 */
  --radius-sm: 10rpx;    /* 标签/芯片/小按钮 (旧 12) */
  --radius-md: 16rpx;    /* 主操作按钮/小卡 (旧 20) */
  --radius-lg: 20rpx;    /* 标准卡/区块 (旧 28) */
  --radius-xl: 24rpx;    /* 大型容器/弹层 (旧 36) */
  --radius-pill: 100rpx; /* 仅保留给：自定义 TabBar 胶囊外型 */
}
```

### 圆角映射对照表

| 元素 | 旧 | 新 | 说明 |
|------|-----|-----|------|
| `.btn-primary` `.btn-secondary` | 100rpx | 16rpx | 主/次按钮 |
| `.action-btn` (重摇/接受/关闭) | 100rpx / 无 | 16rpx / 无 | 16rpx 应用 88rpx 高度的按钮 |
| `.solid-card` `.glass-card` | 36rpx | 20rpx | 卡片 |
| `.nav-header` | 0 | 0 | 顶部 72rpx 直角条（保持）|
| `.mode-tag` | 100rpx | 10rpx | 出逃卡上的当前模式 |
| `.mode-sheet` 上圆角 | — | 24rpx | 模式选择弹层 |
| `.daily-card` `.collect-entry-card` | 36rpx | 20rpx | 卡片 |
| `.cmd-card` 指令详情 | 36rpx | 20rpx | 卡片 |
| `.step-mark` 步骤编号 | 50% 圆形 | 16rpx | 圆角矩形 |
| `.favorite-toggle` 收藏切换 | 50% 圆形 | 12rpx | 圆角矩形 |
| `.cmd-image-wrap` 场景插画 | 28rpx | 20rpx | 容器 |
| `.photo-thumb` `.photo-add` | 20rpx | 12rpx | 缩略图 |
| `.custom-tabbar` 整体 | 48rpx | 32rpx | TabBar 胶囊 |
| `.tabbar-item` 最小高 | 90rpx | 76rpx | |
| `.tabbar-icon-wrap` 宽高 | 80rpx | 56rpx | |
| `.tabbar-icon` 宽高 | 56rpx | 40rpx | |
| `.tabbar-label` 字号 | 24rpx | 22rpx | |
| `.map-locate-btn` 定位 | 50% 圆形 | 50% 圆形 | 唯一保留的圆形（方向感） |
| `.map-data-card` | 36rpx | 20rpx | 底部统计 |
| `.map-empty` `.map-popup` | 36rpx | 20rpx | 浮层 |
| `.meta-item` 元信息胶囊 | 12rpx | 10rpx | 小标签 |
| `.tip-box` `.tip-card` | 20rpx | 20rpx | 小贴士（保持） |

---

## 五、首页（pages/index）

### 5.1 顶部结构变化

**删除**：`.mode-list`（6 个横向滚动模式胶囊）。

**新增**：「出逃一下」大卡顶部、骰子上方，一个 `当前模式 Tag`：

```xml
<!-- pages/index/index.wxml -->
<view wx:if="{{!selectedCommand}}" class="shake-card" bindtap="rollCommand">
  <view class="pulse-ring"></view>
  <view class="pulse-ring pulse-ring-delay"></view>

  <!-- 新增：模式 Tag -->
  <view class="mode-tag" catchtap="onModeTagTap">
    <image class="mode-tag-ico" src="{{currentModeMeta.icon}}" mode="aspectFit"></image>
    <text class="mode-tag-text">{{currentModeMeta.name}}</text>
    <image class="mode-tag-arrow {{showModeSheet ? 'up' : ''}}"
           src="/assets/icons/chevron-down-ink.svg" mode="aspectFit"></image>
  </view>

  <view class="dice-box {{isBouncing ? 'dice-bounce' : ''}}">
    <image class="dice-ico" src="/assets/icons/dice-5-white.svg" mode="aspectFit"></image>
  </view>
  <text class="shake-title">出逃一下</text>
  <text class="shake-sub">点击卡片，开始出逃</text>
  <view class="remain-row">
    <text>今日剩余 </text>
    <text class="remain-num font-mono">{{remainCount}}</text>
    <text> 次</text>
  </view>
</view>
```

**模式选择 Sheet**（底部弹层）：

```xml
<view wx:if="{{showModeSheet}}" class="mode-sheet-mask" bindtap="closeModeSheet">
  <view class="mode-sheet" catchtap="">
    <view class="mode-sheet-handle"></view>
    <text class="mode-sheet-title">选择出逃模式</text>
    <view class="mode-sheet-list">
      <view wx:for="{{sheetModes}}" wx:key="id"
            class="mode-option {{selectedMode === item.id ? 'active' : ''}}"
            data-id="{{item.id}}"
            bindtap="onModeOptionTap">
        <view class="mode-option-ico-wrap" style="background: {{item.color}}1A;">
          <image class="mode-option-ico" src="{{item.icon}}" mode="aspectFit"></image>
        </view>
        <view class="mode-option-text">
          <text class="mode-option-name">{{item.name}}</text>
          <text class="mode-option-desc">{{item.desc}}</text>
        </view>
        <view wx:if="{{selectedMode === item.id}}" class="mode-option-check">
          <image src="/assets/icons/check-brand.svg" mode="aspectFit"></image>
        </view>
      </view>
    </view>
    <view class="mode-sheet-cancel" bindtap="closeModeSheet">取消</view>
  </view>
</view>
```

### 5.2 `currentModeMeta` 派生

```js
// pages/index/index.js
data: {
  selectedMode: 'smart',
  sheetModes: SHEET_MODES,  // 3 个：smart / micro / walk
  showModeSheet: false,
  currentModeMeta: SHEET_MODES[0],
  // ...其他
},

onLoad() {
  // ...
  this.setData({ currentModeMeta: this.resolveModeMeta('smart') })
},

resolveModeMeta(id) {
  return this.data.sheetModes.find(m => m.id === id) || this.data.sheetModes[0]
},

onModeTagTap() {
  this.setData({ showModeSheet: true })
},

closeModeSheet() {
  this.setData({ showModeSheet: false })
},

onModeOptionTap(e) {
  const id = e.currentTarget.dataset.id
  this.setData({
    selectedMode: id,
    currentModeMeta: this.resolveModeMeta(id),
    showModeSheet: false
  })
  wx.vibrateShort({ type: 'light' })
  wx.showToast({ title: '已切换到 ' + this.resolveModeMeta(id).name, icon: 'none', duration: 900 })
}
```

### 5.3 每日推荐差异化

```js
loadDailyRecommend() {
  const pool = app.globalData.commandPool || []
  if (!pool.length) { this.setData({ dailyRecommend: [] }); return }

  // 构造候选
  let candidates = pool.filter(c => !c.requirePOI)
  if (!candidates.length) candidates = pool.slice()

  // 简单 Fisher-Yates 洗牌（按时间种子保证每次不同）
  const seed = Date.now()
  const shuffled = this.shuffleWithSeed(candidates, seed)

  // 与上次对比，保证不同
  const lastIds = wx.getStorageSync('lastDailyIds') || []
  let picked = shuffled.slice(0, 3)
  const overlap = picked.filter(c => lastIds.includes(c.id)).length
  if (overlap >= 2) {
    // 重新洗一次
    const shuffled2 = this.shuffleWithSeed(candidates, seed + 1)
    picked = shuffled2.slice(0, 3)
  }

  // 补足 3 条
  while (picked.length < 3 && pool.length > picked.length) {
    const c = pool[Math.floor(Math.random() * pool.length)]
    if (!picked.find(p => p.id === c.id)) picked.push(c)
  }

  // 写存储
  wx.setStorageSync('lastDailyIds', picked.map(c => c.id))

  const withMeta = picked.slice(0, 3).map(c => {
    const meta = getTypeMeta(c.type)
    return Object.assign({}, c, { typeName: meta.name, typeColor: c.typeColor || meta.color })
  })
  this.setData({ dailyRecommend: withMeta })
},

shuffleWithSeed(arr, seed) {
  // 简易 LCG
  let s = seed % 2147483647
  if (s <= 0) s += 2147483646
  const rand = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646 }
  const a = arr.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}
```

### 5.4 模式选择 Sheet 样式

```css
/* pages/index/index.wxss 新增 */
.mode-tag {
  display: inline-flex;
  align-items: center;
  gap: 8rpx;
  height: 56rpx;
  padding: 0 18rpx 0 14rpx;
  background: rgba(255, 255, 255, 0.7);
  border: var(--border);
  border-radius: var(--radius-sm);
  margin-bottom: 24rpx;
  z-index: 2;
  transition: all 200ms var(--ease-standard);
}
.mode-tag:active { transform: scale(0.97); }
.mode-tag-ico { width: 28rpx; height: 28rpx; }
.mode-tag-text { font-size: 24rpx; color: var(--ink); font-weight: 600; }
.mode-tag-arrow { width: 20rpx; height: 20rpx; transition: transform 200ms var(--ease-standard); }
.mode-tag-arrow.up { transform: rotate(180deg); }

.shake-card { border-radius: var(--radius-lg); } /* 20rpx */

.mode-sheet-mask {
  position: fixed; inset: 0;
  background: rgba(46, 47, 51, 0.4);
  z-index: 999;
  display: flex; align-items: flex-end;
  animation: maskIn 200ms var(--ease-out);
}
@keyframes maskIn { from { opacity: 0; } to { opacity: 1; } }
.mode-sheet {
  width: 100%;
  background: var(--white);
  border-radius: var(--radius-xl) var(--radius-xl) 0 0;
  padding: 16rpx 32rpx calc(40rpx + env(safe-area-inset-bottom));
  animation: sheetUp 300ms var(--ease-bounce);
}
@keyframes sheetUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
.mode-sheet-handle {
  width: 56rpx; height: 6rpx;
  background: var(--line);
  border-radius: var(--radius-xs);
  margin: 0 auto 24rpx;
}
.mode-sheet-title {
  display: block; text-align: center;
  font-size: 32rpx; font-weight: 700;
  color: var(--ink); margin-bottom: 24rpx;
}
.mode-sheet-list { display: flex; flex-direction: column; gap: 12rpx; }
.mode-option {
  display: flex; align-items: center; gap: 20rpx;
  padding: 20rpx; border-radius: var(--radius-md);
  background: var(--canvas);
  transition: all 150ms var(--ease-standard);
}
.mode-option.active { background: var(--brand-tint); }
.mode-option-ico-wrap {
  width: 72rpx; height: 72rpx;
  border-radius: var(--radius-md);
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.mode-option-ico { width: 40rpx; height: 40rpx; }
.mode-option-text { flex: 1; display: flex; flex-direction: column; gap: 4rpx; }
.mode-option-name { font-size: 30rpx; font-weight: 600; color: var(--ink); }
.mode-option-desc { font-size: 24rpx; color: var(--ink-soft); }
.mode-option-check { width: 36rpx; height: 36rpx; }
.mode-option-check image { width: 100%; height: 100%; }
.mode-sheet-cancel {
  margin-top: 16rpx; height: 88rpx;
  display: flex; align-items: center; justify-content: center;
  background: var(--canvas);
  border-radius: var(--radius-md);
  font-size: 30rpx; color: var(--ink);
  font-weight: 600;
}
```

### 5.5 每日推荐间距修复

```css
.daily-section { margin-top: 24rpx; padding-bottom: 24rpx; }
.daily-card { margin-right: 16rpx; }
.daily-card:last-child { margin-right: 40rpx; }
.section-header { margin-bottom: 16rpx; }
```

### 5.6 `utils/constants.js` 调整

```js
// 仅保留 3 个 Sheet 可见模式；其他 3 个在 app.rollCommand 加权
const SHEET_MODES = [
  { id: 'smart', name: '智能匹配', icon: '/assets/icons/dice-5-brand-strong.svg', color: '#5CBF9E', desc: '算法懂你，随机推荐' },
  { id: 'micro', name: '微出逃',   icon: '/assets/icons/sprout-brand-strong.svg',  color: '#7BAE7F', desc: '碎片时间，快速出逃' },
  { id: 'walk',  name: '城市漫游', icon: '/assets/icons/footprints-coral.svg',    color: '#D98A5C', desc: '户外长线，深度探索' }
]
module.exports.SHEET_MODES = SHEET_MODES
```

---

## 六、指令详情卡（pages/index 内嵌 + pages/command-detail）

### 6.1 三个操作按钮

```xml
<view class="cmd-actions">
  <view class="action-btn secondary" catchtap="reroll">
    <image src="/assets/icons/refresh-cw-ink-soft.svg" mode="aspectFit"></image>
    <text>重摇</text>
  </view>
  <view class="action-btn primary" catchtap="startCommand">
    <image src="/assets/icons/check-white.svg" mode="aspectFit"></image>
    <text>接受指令</text>
  </view>
  <view class="action-btn tertiary" catchtap="closeCommand">
    <text>关闭</text>
  </view>
</view>
```

```css
.cmd-actions { display: flex; gap: 12rpx; margin-top: 24rpx; align-items: stretch; }
.action-btn {
  height: 88rpx;
  border-radius: var(--radius-md);
  display: flex; align-items: center; justify-content: center;
  gap: 8rpx; font-size: 28rpx; font-weight: 600;
  transition: all 150ms var(--ease-standard);
}
.action-btn.secondary {
  flex: 0 0 144rpx;
  background: var(--white);
  color: var(--brand);
  border: 2rpx solid var(--brand);
}
.action-btn.secondary:active { transform: scale(0.97); background: var(--brand-tint); }
.action-btn.primary { flex: 1; background: var(--brand); color: var(--white); }
.action-btn.primary:active { background: var(--brand-dark); transform: scale(0.97); }
.action-btn.tertiary { flex: 0 0 96rpx; color: var(--ink-soft); background: transparent; }
.action-btn.tertiary:active { color: var(--ink); }
.action-btn image { width: 32rpx; height: 32rpx; }
```

### 6.2 卡片与圆角

```css
.cmd-card { border-radius: var(--radius-lg); padding: 32rpx; }
.cmd-image-wrap { border-radius: var(--radius-lg); }
.cmd-type, .meta-item { border-radius: var(--radius-sm); }  /* 10rpx */
.favorite-toggle { border-radius: 12rpx; width: 64rpx; height: 64rpx; }
.invite-btn { border-radius: var(--radius-md); }
```

### 6.3 command-detail 页面同步

```css
/* pages/command-detail/command-detail.wxss */
.step-num { border-radius: var(--radius-md); width: 56rpx; height: 56rpx; }
.action-bar { padding: 12rpx 24rpx calc(24rpx + env(safe-area-inset-bottom)); }
.action-btn { border-radius: var(--radius-md); }
```

---

## 七、执行页（pages/executing）

### 7.1 数据结构调整

```js
// pages/executing/executing.js
data: {
  // ... 保持
  steps: [],          // [{id, text, done}], 不再是 string[]
  currentStep: 0,
  progressPct: 0,
  // stepIcons 删除（不再使用）
}
```

### 7.2 步骤初始化

```js
onLoad() {
  this.applyNavMetrics()
  this._milestoneShown = false
  const cmd = app.globalData.currentCommand
  if (!cmd) { wx.switchTab({ url: '/pages/index/index' }); return }

  const rawSteps = (cmd.steps && cmd.steps.length ? cmd.steps : DEFAULT_STEPS).slice(0, 4)
  const steps = rawSteps.map((s, i) => {
    const isObj = (typeof s === 'object' && s !== null)
    const text = isObj ? (s.text || '') : String(s || '')
    return { id: 's' + i, text, done: false }
  })

  const typeMeta = getTypeMeta(cmd.type)
  const typeColor = (typeMeta && typeMeta.color) || '#5CBF9E'
  const isWalk = cmd.mode === 'walk' || cmd.type === 'walk'
  const duration = cmd.duration || 20
  const showStepCount = isWalk || duration >= 30
  const stepCount = duration * 100
  this.setData({ command: cmd, steps, photos: cmd.photos || [], typeColor, showStepCount, stepCount })
  this.startTimer()
}
```

### 7.3 步骤点击 / 进度计算

```js
onStepTap(e) {
  const id = e.currentTarget.dataset.id
  const steps = this.data.steps.map(s => s.id === id ? Object.assign({}, s, { done: true }) : s)
  if (steps.every(s => s.done)) {
    wx.vibrateShort({ type: 'medium' })
  } else {
    wx.vibrateShort({ type: 'light' })
  }
  // 同步到 app 全局，供 record 页使用
  if (app.globalData.currentCommand) {
    app.globalData.currentCommand.steps = steps
    app.saveCurrentCommand()
  }
  this.recomputeProgress(steps)
},

recomputeProgress(steps) {
  const total = steps.length
  const doneCount = steps.filter(s => s.done).length
  const allDone = doneCount === total
  const remainingCount = total - doneCount
  const firstUndone = steps.findIndex(s => !s.done)
  const currentStep = firstUndone === -1 ? Math.max(0, total - 1) : firstUndone
  const progressPct = Math.round((doneCount / total) * 100)
  this.setData({ steps, currentStep, progressPct, allDone, remainingCount })
},

startTimer() {
  this.stopTimer()
  this.tickTimer()
  this.timer = setInterval(() => this.tickTimer(), 1000)
},

tickTimer() {
  const cmd = app.globalData.currentCommand
  if (!cmd) return
  const elapsed = Math.max(0, Math.floor((Date.now() - cmd.startTime) / 1000))
  const durationSec = Math.max(1, (cmd.duration || 20) * 60)
  // 总时长参考（用「已用/共」显示）
  const elapsedMin = Math.floor(elapsed / 60)
  const totalMin = cmd.duration || 20
  this.setData({ elapsedMinutes: elapsedMin, totalMin })
  // 不再覆盖 progressPct（由手动完成驱动）
  // 50% 里程碑（仅一次）
  const elapsedPct = Math.round((elapsed / durationSec) * 100)
  if (elapsedPct >= 50 && !this._milestoneShown) {
    this._milestoneShown = true
    wx.showToast({ title: '已用时过半，继续加油！', icon: 'none', duration: 1800 })
  }
}
```

### 7.4 完成按钮校验

```js
finishCommand() {
  if (!this.data.steps.every(s => s.done)) {
    const remain = this.data.steps.filter(s => !s.done).length
    wx.showToast({ title: `还有 ${remain} 步未完成`, icon: 'none' })
    wx.vibrateShort({ type: 'heavy' })
    return
  }
  if (app.playSound) app.playSound('complete')
  wx.navigateTo({ url: '/pages/record/record' })
}
```

### 7.5 WXML

```xml
<view class="step-card">
  <text class="step-card-title">出逃步骤</text>
  <view wx:for="{{steps}}" wx:key="id"
        class="step-row {{item.done ? 'finished' : ''}} {{!item.done && index === currentStep ? 'current' : ''}}">
    <view class="step-mark" style="--step-color: {{typeColor}};">
      <image wx:if="{{item.done}}" src="/assets/icons/check-brand.svg" mode="aspectFit"></image>
      <text wx:else>{{index + 1}}</text>
    </view>
    <view class="step-content">
      <text class="step-label">第 {{index + 1}} 步</text>
      <text class="step-text">{{item.text}}</text>
    </view>
    <view wx:if="{{!item.done}}" class="step-finish-btn"
          data-id="{{item.id}}" catchtap="onStepTap"
          style="border-color: {{typeColor}}; color: {{typeColor}};">
      <text>完成</text>
      <image src="/assets/icons/chevron-right-brand.svg" mode="aspectFit"></image>
    </view>
  </view>
</view>

<view class="ex-actions">
  <view class="finish-btn {{allDone ? 'active' : 'disabled'}}" bindtap="finishCommand">
    <image src="/assets/icons/check-white.svg" mode="aspectFit"></image>
    <text>{{allDone ? '完成出逃' : '还有 ' + remainingCount + ' 步未完成'}}</text>
  </view>
</view>
```

### 7.6 WXSS

```css
.step-mark {
  width: 48rpx; height: 48rpx;
  border-radius: var(--radius-md);
  background: var(--white);
  color: var(--ink-faint);
  border: 2rpx solid var(--line);
  display: flex; align-items: center; justify-content: center;
  font-size: 24rpx; font-weight: 700;
  font-family: "SF Mono", "Menlo", "Consolas", monospace;
  flex-shrink: 0;
  transition: all 200ms var(--ease-standard);
}
.step-mark image { width: 32rpx; height: 32rpx; }
.step-row.finished .step-mark {
  background: var(--step-color, var(--brand));
  border-color: var(--step-color, var(--brand));
  color: var(--white);
}
.step-row.current .step-mark {
  border-color: var(--step-color, var(--brand));
  color: var(--step-color, var(--brand));
  animation: stepPulse 1400ms ease-in-out infinite;
}
@keyframes stepPulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(92, 191, 158, 0.3); }
  50% { box-shadow: 0 0 0 12rpx rgba(92, 191, 158, 0); }
}

.step-finish-btn {
  display: inline-flex; align-items: center; gap: 4rpx;
  height: 56rpx; padding: 0 14rpx;
  border: 2rpx solid;
  border-radius: var(--radius-sm);
  font-size: 24rpx; font-weight: 600;
  flex-shrink: 0;
  transition: all 150ms var(--ease-standard);
}
.step-finish-btn:active { transform: scale(0.96); opacity: 0.8; }
.step-finish-btn image { width: 20rpx; height: 20rpx; }

.step-row.finished .step-text { color: var(--ink-soft); text-decoration: line-through; }
.step-row.current .step-text { color: var(--brand-dark); font-weight: 600; }
.step-row.current {
  background: var(--brand-weak);
  border-radius: var(--radius-md);
  margin: 0 -8rpx;
  padding: 20rpx 16rpx;
}

.finish-btn.disabled { background: var(--ink-faint); opacity: 0.5; }
.finish-btn.disabled:active { transform: none; }
```

### 7.7 拍照/小贴士卡圆角

```css
.timer-card, .step-card, .photo-card, .tip-card, .step-count-card {
  border-radius: var(--radius-lg);
  padding: 28rpx 32rpx;
  margin-bottom: 20rpx;
}
.photo-thumb, .photo-add { border-radius: var(--radius-sm); }
.photo-add { border: 1rpx dashed var(--ink-faint); }
.step-count-card .step-count-icon-wrap { border-radius: var(--radius-md); width: 64rpx; height: 64rpx; }
```

---

## 八、地图页（pages/map）

### 8.1 三类地图 tab

```js
// pages/map/map.js
const MAP_TABS = [
  { key: 'standard', name: '普通' },
  { key: 'satellite', name: '卫星' },
  { key: 'route', name: '路线' }
]

data: {
  mapTabs: MAP_TABS,
  activeMapType: 'standard',
  mapSubkey: wx.getStorageSync('AMAP_STANDARD_KEY') || '',
  // ...其他
}

onLoad() {
  // ...existing
  this.setData({ mapSubkey: this.getMapSubkey('standard') })
}

getMapSubkey(type) {
  if (type === 'satellite') {
    const k = wx.getStorageSync('AMAP_SATELLITE_KEY')
    if (!k) return ''
    return k
  }
  return wx.getStorageSync('AMAP_STANDARD_KEY') || ''
}

onTabTap(e) {
  const key = e.currentTarget.dataset.key
  if (key === this.data.activeMapType) return
  if (key === 'satellite' && !this.getMapSubkey('satellite')) {
    wx.showToast({ title: '请先在小程序后台配置 AMAP_SATELLITE_KEY', icon: 'none', duration: 2200 })
    return
  }
  this.setData({
    activeMapType: key,
    mapSubkey: this.getMapSubkey(key),
    popupRecord: null
  })
  this.refresh()
}
```

### 8.2 WXML

```xml
<map
  id="escapeMap"
  class="map-native"
  subkey="{{mapSubkey}}"
  latitude="{{mapCenter.latitude}}"
  longitude="{{mapCenter.longitude}}"
  scale="{{mapScale}}"
  markers="{{mapMarkers}}"
  polyline="{{mapPolyline}}"
  show-location
  enable-zoom
  enable-scroll
  bindmarkertap="onMarkerTap"
  bindtap="closePopup"
  style="width: 100%; height: {{mapHeight}}px;"
>
  <cover-view class="map-controls">
    <cover-view class="map-tabs">
      <cover-view wx:for="{{mapTabs}}" wx:key="key"
                  class="map-tab {{activeMapType === item.key ? 'active' : ''}}"
                  data-key="{{item.key}}" bindtap="onTabTap">
        <cover-view class="map-tab-text">{{item.name}}</cover-view>
      </cover-view>
    </cover-view>
    <cover-view class="time-chips">
      <cover-view wx:for="{{timeFilters}}" wx:key="key"
                  class="time-chip {{activeTime === item.key ? 'active' : ''}}"
                  data-key="{{item.key}}" bindtap="onTimeTap">
        <cover-view class="time-chip-text">{{item.name}}</cover-view>
      </cover-view>
    </cover-view>
  </cover-view>

  <cover-view class="map-locate-btn" bindtap="locate">
    <cover-image class="locate-ico" src="/assets/icons/target.svg"></cover-image>
  </cover-view>
  <!-- 其余不变 -->
</map>
```

### 8.3 回到定位

```js
locate() {
  const loc = app.globalData.location
  if (!loc) {
    wx.showToast({ title: '请先在设置中开启定位权限', icon: 'none' })
    return
  }
  // 微信 mapContext 平滑移动
  const mapCtx = wx.createMapContext('escapeMap', this)
  mapCtx.moveToLocation({
    latitude: loc.latitude,
    longitude: loc.longitude,
    success: () => {
      this.setData({
        mapCenter: { latitude: loc.latitude, longitude: loc.longitude },
        mapScale: Math.max(this.data.mapScale, 15)
      })
      wx.vibrateShort({ type: 'light' })
    },
    fail: () => {
      // 兜底：直接 setData
      this.setData({ mapCenter: { latitude: loc.latitude, longitude: loc.longitude } })
    }
  })
}
```

### 8.4 圆角调整

```css
.map-controls { border-radius: var(--radius-lg); }  /* 20rpx */
.map-data-card { border-radius: var(--radius-lg); }
.map-empty { border-radius: var(--radius-lg); }
.map-popup { border-radius: var(--radius-lg); }
.map-tab { border-radius: var(--radius-pill); }     /* 仍胶囊：内嵌在容器内 */
.map-locate-btn { width: 80rpx; height: 80rpx; border-radius: 50%; }  /* 保留圆形 */
.map-locate-btn:active { background-color: var(--brand-tint); }
```

### 8.5 `refresh()` 行为变化

```js
refresh() {
  const located = this.filterRecords().filter(r => r.location && r.location.latitude && r.location.longitude)
  let markers = []
  let polyline = []
  if (this.data.activeMapType === 'route') {
    markers = this.buildMarkers(located)
    polyline = this.buildPolyline(located)
  } else {
    markers = this.buildMarkers(located)
  }
  // ... 其余不变
}
```

---

## 九、自定义 TabBar（custom-tab-bar）

### 9.1 调整

```css
.custom-tabbar {
  position: fixed;
  bottom: calc(24rpx + env(safe-area-inset-bottom));
  left: 40rpx; right: 40rpx;
  z-index: 500;
  display: flex; align-items: center; justify-content: space-around;
  background: rgba(255, 255, 255, 0.96);
  backdrop-filter: blur(60px) saturate(2);
  -webkit-backdrop-filter: blur(60px) saturate(2);
  border-radius: 32rpx;
  padding: 12rpx 20rpx;
  box-shadow: 0 4rpx 24rpx rgba(46, 47, 51, 0.08), 0 1rpx 4rpx rgba(46, 47, 51, 0.04);
  border: var(--border);
}
.tabbar-item {
  display: flex; flex: 1; flex-direction: column;
  align-items: center; gap: 2rpx;
  padding: 6rpx 8rpx;
  border-radius: var(--radius-pill);
  transition: all 0.25s var(--ease-standard);
  min-height: 76rpx;
}
.tabbar-item.active { background: var(--brand-tint); }
.tabbar-icon-wrap {
  width: 56rpx; height: 56rpx;
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  transition: all 0.25s var(--ease-standard);
}
.tabbar-icon { width: 40rpx; height: 40rpx; }
.tabbar-label { font-size: 22rpx; font-weight: 600; color: var(--ink-faint); transition: all 0.25s var(--ease-standard); }
.tabbar-item.active .tabbar-label { font-weight: 700; color: var(--brand); }
.tabbar-placeholder { height: calc(100rpx + env(safe-area-inset-bottom)); }
```

### 9.2 `app.wxss` 同步

```css
.tabbar-placeholder, .bottom-spacer {
  height: calc(100rpx + env(safe-area-inset-bottom));
}
```

---

## 十、新增图标（3 个，由设计师提供）

| 文件 | 用途 | 关键要求 |
|------|------|----------|
| `assets/icons/check-brand.svg` | 品牌色对勾，48×48 画布 | 圆形薄荷绿底渐变 + 白色对勾，与 `check-white.svg` 同体系但底色为薄荷绿 |
| `assets/icons/chevron-right-brand.svg` | 品牌色右箭头，48×48 画布 | 浅薄荷底（透明或 10% 不透明）+ 品牌色箭头，线粗 3px |
| `assets/icons/chevron-down-ink.svg` | 深灰向下箭头，48×48 画布 | 浅灰圆形底 + 深灰箭头 |

每个 SVG 必须：
- `viewBox="0 0 48 48"`
- 内嵌 `<defs>` + `<linearGradient>` 或 `<radialGradient>`
- 主图标用面性填充（fill）
- 右上角加白色半透明高光弧（opacity 0.3-0.4）

---

## 十一、数据流

```
[首页 onShow]
  ├─ applyNavMetrics
  ├─ refreshState（读 weather/location/reRollCount/collectedCommands）
  ├─ loadDailyRecommend（随机种子 + 防重）
  ├─ setData currentModeMeta
  └─ getTabBar().setData({ selected: 0 })

[用户点击模式 Tag]
  ├─ onModeTagTap → setData showModeSheet = true
  └─ 弹层 + 震动

[用户选模式]
  ├─ onModeOptionTap → setData selectedMode + showModeSheet = false
  ├─ Toast 提示
  └─ 后续 rollCommand 用新 mode

[用户点击「出逃一下」]
  ├─ rollCommand() → app.rollCommand(selectedMode) 走加权算法
  ├─ 写 selectedCommand
  └─ dice bounce 动画

[用户点「重摇」]
  ├─ app.useReroll() 减 1
  └─ rollCommand()

[用户点「接受指令」]
  ├─ app.startCommand(cmd) → 写 currentCommand, commandStatus
  └─ navigateTo executing

[执行页 onLoad]
  ├─ 读 currentCommand
  ├─ 解析 steps: cmd.steps → TYPE_STEPS[type] → DEFAULT_STEPS
  └─ startTimer

[用户点步骤「完成」]
  ├─ onStepTap → 切 done=true
  ├─ recomputeProgress（currentStep = 第一个未完成索引）
  └─ app.saveCurrentCommand

[用户点「完成出逃」]
  ├─ 校验全部完成
  └─ navigateTo record

[记录页保存]
  ├─ app.completeCommand() → 写 records, badges, saveAll
  └─ navigateTo generating → 首页
```

---

## 十二、错误处理矩阵

| 场景 | 行为 |
|------|------|
| 用户未授权定位 | `locationName = '未定位'`；地图默认中心 (39.9042, 116.4074) |
| 高德标准 key 缺失 | `<map subkey="">` 仍然能渲染（高德允许匿名访问基础底图） |
| 高德卫星 key 缺失 | 切到「卫星」tab 时 toast「请在小程序后台配置 AMAP_SATELLITE_KEY」+ 不切换 + 维持普通 |
| `markers` 为空 | 显示 `.map-empty` 空状态 |
| `currentCommand` 为空访问执行页 | `wx.switchTab index` 兜底 |
| 步骤未完成点完成出逃 | toast「还有 X 步未完成」+ 震动 + 不跳转 |
| 倒计时异常 | `elapsed = max(0, now - startTime)` |
| 照片 `tempFilePath` 失效 | 拍照时即用 `wx.getFileSystemManager().saveFile` 持久化 |
| 模式 Sheet 重复触发 | `if (showModeSheet) return` |
| iPhone X+ 安全区 | `env(safe-area-inset-bottom)` 已在 TabBar 与 Sheet 使用 |

---

## 十三、对抗式自测清单

实现完成后，**我必须自己以「找茬」模式逐项跑一遍**：

### 首页
- [ ] 进首页 → 大卡顶部出现「当前模式 Tag（智能匹配 ▼）」
- [ ] 点 Tag → 底部弹层滑入，3 个模式选项（智能 / 微 / 漫游）
- [ ] 选「微出逃」→ Tag 文字变「微出逃」+ 关闭弹层 + Toast
- [ ] 重摇「出逃一下」→ 选出的指令 `duration < 15`
- [ ] 退出小程序再进 → 每日推荐 3 条 ID 与上次不同（重复 3 次确认）
- [ ] 圆角：shake-card 20rpx、mode-tag 10rpx、卡片 20rpx

### 指令详情
- [ ] 重摇 / 接受 / 关闭 三个按钮 88rpx 等高、圆角 16rpx
- [ ] 场景插画：有 `illustration` 字段显示图片；无则显示渐变 + 类型图标 fallback
- [ ] 收藏按钮（top-right）圆角 12rpx 而非圆形
- [ ] 元信息 3 个胶囊 10rpx 圆角

### 执行页
- [ ] 进入时 4 步均为「待完成」，每步右侧有「完成 →」按钮
- [ ] 点步骤 1 完成 → 步骤 1 数字变绿勾（check-brand）+ 步骤 2 高亮 + 进度条 25%
- [ ] 必须 4 步全完成，「完成出逃」按钮才能跳转
- [ ] 步骤 3 仍为「待完成」时点「完成出逃」→ toast「还有 1 步未完成」+ 不跳转
- [ ] 步骤编号圆 16rpx 圆角矩形

### 地图
- [ ] 进地图 → 默认「普通」tab 高亮
- [ ] 切到「卫星」→ 若未配 key 则 toast 提示并保持「普通」
- [ ] 切到「路线」→ 出现 polyline（绿线 + 箭头）
- [ ] 点定位按钮 → 平滑移到当前位置 + 震动反馈
- [ ] 未授权定位时点 → toast「请先在设置中开启定位权限」

### TabBar
- [ ] 高度从 130rpx 减到约 100rpx（视觉判断）
- [ ] 三个 Tab 在 3 个页面均能切换
- [ ] 激活态：背景 `--brand-tint` + 文字 `--brand`

### 通用
- [ ] 圆角全局：按钮 16rpx / 卡片 20rpx / 标签 10rpx
- [ ] 所有页面 padding 一致，状态栏 + nav-header 高度正确
- [ ] 点击交互有 150-200ms transition
- [ ] 控制台无 error / warning

### 视觉一致性
- [ ] 三个新图标 check-brand / chevron-right-brand / chevron-down-ink 已就位
- [ ] 任何 `<image>` 引用 `refresh-cw-ink-soft.svg` 等保留文件，未丢失引用
- [ ] 模式下拉 Sheet 在 iPhone X+ 底部不被安全区遮挡

### 兼容性
- [ ] iOS 真机 / 模拟器
- [ ] Android 真机 / 模拟器
- [ ] 微信开发者工具「真机调试」

---

## 十四、风险与回退

| 风险 | 缓解 | 回退 |
|------|------|------|
| 高德 subkey 配置不及时 | 缺 key 时降级 + 提示 | 切回腾讯 subkey 模式 |
| 步骤改为手动完成，用户不点「完成」卡住 | 「完成出逃」按钮始终可点（仅校验后跳 toast） | 加 24h 后自动 abandon |
| 圆角变化对老用户造成视觉不适 | 全部页面同时改 | 灰度发布（先 10% 用户）|
| 图标重设后体积变化 | 复用现有 99% 图标 | 设计师只需提供 3 个 |

---

*本文档为 v1 批准稿，2026-07-11。下一阶段：进入 writing-plans 写实现计划。*
