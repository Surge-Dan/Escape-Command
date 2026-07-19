# Tasks

按依赖顺序拆分。每完成一项打勾并提交验证。

- [x] Task 1: 数据层修复——微出逃 typeColor 与归一化收敛
  - [x] 1.1 修改 `app.js:normalizeCommand`：若原始 `typeColor` 存在则保留，否则用 `meta.color` 兜底（不再强制覆盖）
  - [x] 1.2 把 `data/commands.js` 末尾的 typeAlias / defaultSteps 重复逻辑删除，改为从 `utils/constants.js` 导入
  - [x] 1.3 确认 `utils/constants.js` 的 `TYPE_ALIASES`、`DEFAULT_STEPS`、`TYPE_META` 是唯一来源
  - [x] 1.4 验证：mi001-mi015 的 typeColor 为 `#7BAE7F`（绿色），不被 walk 橙色覆盖

- [x] Task 2: 双人出逃模式开放
  - [x] 2.1 `pages/index/index.js` 确认 `MODE_LIST` 含 `double` 项，不在隐藏列表中
  - [x] 2.2 `pages/index/index.wxml` 确认双人芯片渲染（如被 v-if 隐藏则移除条件）
  - [x] 2.3 `app.js:rollCommand('double')` 过滤逻辑确认 `c.double === true || c.social === true`
  - [x] 2.4 `pages/index/index.wxml` 指令详情卡：当 `command.double || command.social` 时显示"邀请朋友"按钮
  - [x] 2.5 `pages/index/index.js` 新增 `onInviteFriend` 方法，调 `wx.shareAppMessage`（实际由 `onShareAppMessage` 返回值触发，按钮需是 `<button open-type="share">`）
  - [x] 2.6 `pages/index/index.js` 的 `onShareAppMessage` 返回 path 含 `mode=double&cmd=<commandId>`
  - [x] 2.7 `pages/index/index.js` 的 `onLoad` 解析 query：若 `mode=double&cmd=<id>`，自动选中双人模式 + 直接展示该指令详情卡 + 显示"来自朋友的邀请"标签
  - [x] 2.8 验证：从分享卡片打开能定位指令，详情卡显示邀请标签

- [x] Task 3: 三个模式芯片可见性与选中态
  - [x] 3.1 `pages/index/index.wxml` 确认 4 个芯片（智能匹配 / 微出逃 / 城市漫游 / 双人出逃）全部渲染
  - [x] 3.2 城市漫游默认态图标缺失：用 `footprints-white.svg` 反色或用 `tab-map.svg` 临时复用，加 TODO 注释
  - [x] 3.3 验证每个模式摇 5 次返回对应过滤后的指令

- [x] Task 4: 双重头部修复（导航栏圆角）
  - [x] 4.1 `pages/collection/collection.json`：`navigationStyle` 改 `custom`
  - [x] 4.2 `pages/badges/badges.json`：`navigationStyle` 改 `custom`
  - [x] 4.3 `pages/settings/settings.json`：`navigationStyle` 改 `custom`
  - [x] 4.4 `pages/member/member.json`：`navigationStyle` 改 `custom`，并在 wxml 补自定义头部（与其他页一致）
  - [x] 4.5 验证四页顶部只有一个圆角自定义头部

- [x] Task 5: 收藏页布局重构
  - [x] 5.1 `pages/collection/collection.wxss`：`command-card` 从 `height: 280rpx` 改 `min-height: 240rpx` + 内容自适应
  - [x] 5.2 右侧图片容器宽高比统一 4:3（如 `width: 220rpx; height: 165rpx`）
  - [x] 5.3 移除按钮触控区扩大到 88rpx × 88rpx（容器尺寸，可视圆 64rpx）
  - [x] 5.4 `collection.js` 的 `onLongPress` 直接调 `this.removeCollection(id)`，不构造假 event
  - [x] 5.5 `collection.wxml` 空状态文案改 `♡ 还没有收藏任何指令`，按钮改 `去首页摇一个`，点击 `switchTab` 到 index
  - [x] 5.6 `collection.js` 的 `collection-scroll` 高度改为动态：`style="height: calc(100vh - {{navBarHeight}}px - 40rpx)"` 或用 flex 布局
  - [x] 5.7 `collection.wxml` 的 `coffee-shop.webp` fallback 改为从指令 `scene` 字段取场景插画，无则用统一占位 `empty-collection.svg`
  - [x] 5.8 验证长标题不溢出、短标题不空旷、空状态居中

- [x] Task 6: TabBar 占位高度统一
  - [x] 6.1 `app.wxss` 的 `.tabbar-placeholder` 改为 `calc(180rpx + env(safe-area-inset-bottom))`
  - [x] 6.2 `custom-tab-bar/index.wxss` 的 `.tabbar-placeholder` 同步为 `calc(180rpx + env(safe-area-inset-bottom))`
  - [x] 6.3 验证 profile / index / map 三页底部内容不被 tab bar 遮挡

- [x] Task 7: 会员页 CSS 变量修复
  - [x] 7.1 `app.wxss` 新增 `--lemon-tint: #FFF4C7` 和 `--brand-strong: #45B08C`
  - [x] 7.2 `pages/member/member.js` 的 `expireDate` 改为基于 `Date.now() + 365*24*3600*1000` 计算
  - [x] 7.3 验证会员页渐变背景正常显示

- [x] Task 8: 地图页修复
  - [x] 8.1 `pages/map/map.js` 默认坐标：优先 `app.globalData.location`，无则 `wx.getLocation`，失败 fallback 广州
  - [x] 8.2 移除 `Math.random()` 偏移：无 location 的 record 不落点（过滤掉）
  - [x] 8.3 删除 `showMore` 中 `onShareAppMessage()` 死分支，改为 `wx.showShareMenu({ withShareTicket: true })`
  - [x] 8.4 验证首次打开定位到真实位置（授权后）

- [x] Task 9: 记录页 Canvas 单位与 fallback 修复
  - [x] 9.1 `pages/record/record.wxss` canvas 定位改为统一：`position: fixed; left: -9999px; top: -9999px;`（px 离屏），canvas 内部宽高保持 px（Canvas 2D 规范）
  - [x] 9.2 `pages/record/record.js` 的 `latte.webp` fallback 改为从 `currentCommand.scene` 取场景插画
  - [x] 9.3 验证分享卡片能正常生成

- [x] Task 10: 音效开关落地
  - [x] 10.1 `app.js` 新增 `playSound(name)` 方法：检查 `settings.soundEnabled`，用 `wx.createInnerAudioContext`，src 为 `/assets/audio/<name>.mp3`，try-catch 静默 fallback
  - [x] 10.2 `pages/index/index.js` 摇骰成功时调 `app.playSound('shake')`
  - [x] 10.3 `pages/executing/executing.js` 完成出逃时调 `app.playSound('complete')`
  - [x] 10.4 `pages/record/record.js` 保存成功时调 `app.playSound('save')`
  - [x] 10.5 `app.js:checkBadges` 解锁时调 `app.playSound('unlock')`
  - [x] 10.6 验证音效关闭时全静默，开启时不报错（文件不存在时静默）

- [x] Task 11: 问候语截断修复
  - [x] 11.1 `pages/index/index.wxss` 问候语 `white-space: nowrap` 改为 `white-space: nowrap; max-width: 100%; text-overflow: ellipsis` 仅在超长时省略，或缩字号到 24rpx
  - [x] 11.2 验证 `早啊，广州·天河 26℃ 晴` 完整显示

- [x] Task 12: 死代码与硬编码清理
  - [x] 12.1 `pages/profile/profile.js` 删除注释的 `goMember`/`openMember`
  - [x] 12.2 `pages/map/map.js` 确认 `showMore` 死分支已删（Task 8.3）
  - [x] 12.3 `app.js` 的 `escapeCode` 默认值与 PRD 一致
  - [x] 12.4 全局 grep 确认无未定义变量引用、无 console.error

- [x] Task 13: 对抗式审查与回归测试
  - [x] 13.1 按 spec.md 的 10 项自检清单逐项验证
  - [x] 13.2 三个模式各摇 5 次，确认过滤正确
  - [x] 13.3 收藏 / 徽章 / 设置 / 会员四页确认无双头
  - [x] 13.4 双人邀请分享 → 被邀请方打开 → 定位指令 全流程
  - [x] 13.5 全局无 console.error
  - [x] 13.6 未通过项返工，回到对应 Task

# Task Dependencies

- Task 1 → Task 3（颜色修复后才能验证芯片选中态）
- Task 2 → Task 13.4（双人流程依赖 Task 2 完成）
- Task 4 ↔ Task 5（收藏页双头修复与布局重构可并行，但都改 collection.* 需串行合并）
- Task 6 独立
- Task 7 独立
- Task 8 独立
- Task 9 独立
- Task 10 独立
- Task 11 独立
- Task 12 依赖 Task 8.3
- Task 13 依赖所有其他 Task

# 可并行任务（建议分组）

- **并行组 A**（数据 + 模式）：Task 1, Task 2, Task 3
- **并行组 B**（页面布局）：Task 4, Task 5, Task 6, Task 7, Task 11
- **并行组 C**（功能修复）：Task 8, Task 9, Task 10
- **串行**：Task 12 → Task 13
