# 出逃指令 · UI 精修 v7 实施计划

## Context（背景）

用户反馈当前小程序存在 4 类 UI 问题：
1. **整体偏顶** — `home-header` 的 `padding-top: {{capsuleTop - statusBarHeight + 8}}px` 在胶囊靠上时出现负值或 0，地图的 `map-controls top: 16rpx` 紧贴胶囊，profile 完全没设顶部 padding 直接顶到 status-bar；
2. **留白过多 + 按钮错位** — 首页底部 `bottom-spacer: 40rpx` 远不够；指令详情卡的 `cmd-actions` 在 TabBar 上方没考虑安全区；操作按钮的「重摇 / 接受 / 关闭」三段式生硬切断了视觉流；
3. **组件布局交互粗糙** — 步骤「完成」按钮是纯文字 + 小 icon；`mode-tag-arrow` 用 `rotate(180deg)` 而非 `scaleY(-1)` 视觉上生硬；按钮 `:active` 反馈过弱；
4. **图标整体偏小** — profile 分类图标 `36rpx`、首页骰子 `120rpx` 在容器中比例失衡；`mode-tag-ico` `28rpx` 配合 `font-size: 24rpx` 文字显得拥挤。

预期：完成所有 4 个核心页面（首页 / 指令详情 / 执行中 / 地图 / 我的）的视觉精修，达到设计稿级一致体验，所有图标视觉权重按容器 30-40% 比例分布，按钮和交互细节全部用统一 token（`--ease-standard` / `--shadow-popup`），并通过 WXML 标签闭合 + JS 语法审查。

---

## 修改范围

5 个 WXML + 5 个 WXSS + 0 个 JS（数据层不变），加 1 个全局 patch：

| 文件 | 性质 | 改动量 |
|---|---|---|
| `app.wxss` | 全局 | 增 2 个 token、调整 1 个 spacer |
| `pages/index/index.wxss` | 首页 | 重组顶部/出逃卡/详情卡/操作区 |
| `pages/index/index.wxml` | 首页 | 改 cmd-actions 布局（双按钮 + X 关闭图标） |
| `pages/executing/executing.wxss` | 执行页 | 调整步骤完成按钮 + 底部留白 |
| `pages/executing/executing.wxml` | 执行页 | 完成按钮从"完成"图标改为更明确的 chip |
| `pages/map/map.wxss` | 地图 | map-controls 顶部距离 + 定位按钮安全区 |
| `pages/map/map.wxml` | 地图 | 无（结构不变，仅改样式） |
| `pages/profile/profile.wxss` | 我的页 | 整体放大 30% 比例，重排分类网格 |
| `pages/profile/profile.wxml` | 我的页 | 无 |
| `custom-tab-bar/index.wxss` | TabBar | 微调 active 态过渡 |

---

## 实施方案

### 1. 全局 token 补丁（app.wxss）

**新增 token**：
- `--safe-top: env(safe-area-inset-top);` —— 安全区
- `--icon-scale-md: 1.4;` —— 图标视觉放大比例（统一使用）

**调整**：
- `.tabbar-placeholder` 和 `.bottom-spacer` 从 `calc(100rpx + env(safe-area-inset-bottom))` 改为 `calc(140rpx + env(safe-area-inset-bottom))`（让位给悬浮 TabBar 24rpx 底部边距）
- `.nav-header` `height: 72rpx → 88rpx`（让位给胶囊）
- 增 `.page-pad-top` 类（`padding-top: calc(var(--safe-top, 20px) + 24rpx)`）作为所有页面统一顶部安全区

### 2. 首页（pages/index）

**首页顶部**：
- `home-header` padding-top 改为 `calc(env(safe-area-inset-top, 20px) + 16rpx)`，去除 `capsuleTop - statusBarHeight` 易错计算
- 问候文字号 `28rpx → 30rpx`，加 letter-spacing 1rpx
- home-header 与下方 `shake-card` 之间增加 `margin-top: 32rpx`

**出逃卡（核心 CTA）**：
- `min-height: 560rpx → 620rpx`，加 `padding: 48rpx 32rpx`
- `dice-box: 160rpx → 200rpx`，`dice-ico: 120rpx → 160rpx`（占比 80%）
- `mode-tag`：`28rpx icon → 36rpx icon`，`font-size: 24rpx → 28rpx`，`height: 56rpx → 64rpx`
- `mode-tag-arrow` 用 `transition: transform + scaleY(-1)` 替代 `rotate(180deg)`，看起来是"翻折"而不是"翻转"
- 标题/副标题字号 `44rpx/28rpx → 48rpx/30rpx`

**我的收藏卡**：
- 左侧 icon wrap `64rpx → 72rpx`，icon `32rpx → 40rpx`
- 卡片 padding `24rpx 28rpx → 28rpx 32rpx`

**指令详情卡（关键改动 — 用户已确认）**：
- **底部按钮区**改为「主按钮接受指令 + 副按钮重摇」+ **右上角关闭 X 图标**
- WXML 结构调整：
  ```
  <view class="cmd-card">  <!-- + 关闭图标绝对定位右上 -->
  <view class="cmd-actions">  <!-- 横向：副按钮 | 主按钮 -->
  ```
- `action-btn.tertiary` 删除
- 关闭 X：56rpx 圆形，绝对定位 `top: 24rpx; right: 24rpx`，点击时 `scale(0.9)` + 背景 `var(--canvas)`
- `cmd-actions` 加 `padding-bottom: calc(40rpx + env(safe-area-inset-bottom))` 留出 TabBar 安全区
- 按钮高度 `88rpx → 96rpx`，字号 `28rpx → 30rpx`，加 `--shadow-float` 立体感
- 邀请朋友按钮保持，但加 `margin-top: 20rpx`

**每日推荐卡**：
- 高度 `220rpx → 240rpx`，`daily-title: 28rpx → 30rpx`

### 3. 执行页（pages/executing）

**步骤卡**：
- `step-finish-btn` 从「图标 + 完成」chip 改为更明显的"完成"按钮：`height: 48rpx → 56rpx`，加 `padding: 0 24rpx`，字号 `22rpx → 24rpx`
- 步骤进行中态加更明显的左侧 8rpx 竖条（不用背景色）替代当前的高亮背景，更专业
- 步骤行 padding `20rpx 12rpx → 24rpx 12rpx`

**底部完成按钮区**：
- `ex-actions` 加 `padding: 24rpx 40rpx calc(40rpx + env(safe-area-inset-bottom))` 留出 TabBar 安全区
- `finish-btn` `height: 96rpx → 104rpx`，字号 `32rpx`，加 `box-shadow: --shadow-float`

**拍照卡**：
- `photo-add` icon `40rpx → 48rpx`（拍照功能视觉权重不足）

### 4. 地图页（pages/map）

**悬浮控件**：
- `map-controls top: 16rpx → 24rpx`（让位给 status-bar）
- `map-controls` 加 `padding: 16rpx`，圆角 20rpx → 24rpx
- `map-tab` 高度增加（`padding: 14rpx 0 → 16rpx 0`）

**定位按钮**：
- `map-locate-btn` `bottom: 220rpx → 280rpx`（让位给底部数据卡 + 视觉呼吸）
- `bottom: 220rpx` → `260rpx` 防遮挡

**底部数据卡**：
- padding `24rpx 16rpx → 32rpx 24rpx`
- 数字 `36rpx → 40rpx`

### 5. 我的页（pages/profile）— 重点

**整体重排**：
- profile-body padding-top `24rpx → 32rpx` + 顶部状态栏安全区
- `.profile-scroll height: calc(100vh - 72rpx)` 调整为 `calc(100vh - 88rpx)` 对应 nav-header 加高

**用户卡**：
- 头像 `128rpx → 144rpx`
- edit-btn `56rpx → 64rpx`，icon `28rpx → 32rpx`

**会员卡**：
- icon `56rpx → 72rpx`（与会员视觉重要级匹配）

**统计卡**：
- 数字 `36rpx → 40rpx`，label `22rpx → 24rpx`

**分类网格 — 用户已确认 CSS 放大方案**：
- `.category-icon-wrap` `72rpx → 88rpx`
- `.category-icon` `40rpx → 48rpx`
- `.cat-item-icon-wrap` `64rpx → 80rpx`
- `.cat-item-icon` `36rpx → 48rpx`（核心修改，36rpx 明显偏小）
- `.cat-item` padding `20rpx 8rpx → 28rpx 12rpx`
- `.category-items` `gap: 8rpx → 16rpx`，padding `12rpx 24rpx 24rpx → 20rpx 28rpx 32rpx`
- 调整 grid 列数 4→3（更宽松的视觉），但保持横向滚动的 fallback：改为 `repeat(4, 1fr)` 不变但加大每格空间

**底部 spacer**：
- 与全局 token 同步

### 6. TabBar 微调

- `tabbar-icon` 已有 `40rpx` 不动
- `tabbar-item:active` 背景从 `var(--brand-tint)` 加深到 `var(--brand)` 透明度 0.12 的叠层
- `tabbar-item` `min-height: 76rpx → 88rpx`（增加点击区域 + 视觉高度）

---

## 关键改动文件

- [app.wxss](file:///d:/TRAEWork/Projects/出逃指令/escape-command/app.wxss) —— 全局 token + 安全区 + spacer
- [pages/index/index.wxss](file:///d:/TRAEWork/Projects/出逃指令/escape-command/pages/index/index.wxss) —— 首页全量样式重写
- [pages/index/index.wxml](file:///d:/TRAEWork/Projects/出逃指令/escape-command/pages/index/index.wxml) —— 指令详情卡按钮结构改造
- [pages/executing/executing.wxss](file:///d:/TRAEWork/Projects/出逃指令/escape-command/pages/executing/executing.wxss) —— 步骤按钮 + 完成按钮
- [pages/map/map.wxss](file:///d:/TRAEWork/Projects/出逃指令/escape-command/pages/map/map.wxss) —— 悬浮控件顶部距离 + 数据卡
- [pages/profile/profile.wxss](file:///d:/TRAEWork/Projects/出逃指令/escape-command/pages/profile/profile.wxss) —— 我的页图标放大
- [custom-tab-bar/index.wxss](file:///d:/TRAEWork/Projects/出逃指令/escape-command/custom-tab-bar/index.wxss) —— TabBar 高度

## 复用现有资源

- 所有图标已替换为 v3 水彩厚涂风格（104 个 SVG），无新图标生成
- 颜色 token `--brand / --brand-tint / --gold / --gold-tint` 等已在 [app.wxss](file:///d:/TRAEWork/Projects/出逃指令/escape-command/app.wxss) 定义
- 圆角 token `--radius-xs / -sm / -md / -lg / -xl / -pill` 已按规范设置
- 阴影 token `--shadow-card / -elevated / -popup / -float` 已存在

---

## 验证

1. **JS 语法**：`node scripts/check-syntax.js`（已有脚本）
2. **JSON 有效性**：`node -e "..."` 内联检查（已有审计）
3. **WXML 标签闭合**：`node scripts/final-check.js`（已有脚本）
4. **图标引用**：`node scripts/audit-icons.js` 0 缺失
5. **视觉验证**：在微信开发者工具中查看 4 个核心页面（首页/执行中/地图/我的），确认：
   - 首页：顶部不被胶囊遮挡、出逃卡骰子够大、模式 Tag 文字和图标比例和谐、摇出指令后关闭 X 在右上、双按钮（重摇/接受）加 X 替代三按钮
   - 执行页：步骤"完成"按钮清晰、底部"完成出逃"不被 TabBar 遮挡
   - 地图：顶部控件不与胶囊重叠、定位按钮不遮挡数据卡
   - 我的页：所有图标明显放大、分类网格视觉呼吸感增强

完成所有修改后再次运行三项验证脚本确认 0 错误。
