# 出逃指令 v2 全量对齐 PRD 修复 — 验证清单

实现完成后逐项打勾。任一未通过则返工。

## A. 三个出逃模式

- [x] 微出逃芯片可见且可选
- [x] 城市漫游芯片可见且可选
- [x] 双人出逃芯片可见且可选（覆盖 PRD 隐藏决策）
- [x] 智能匹配芯片可见且为默认选中
- [x] 微出逃模式摇 5 次返回的指令 `duration < 15`
- [x] 城市漫游模式摇 5 次返回的指令 `outdoor !== false`
- [x] 双人出逃模式摇 5 次返回的指令 `double === true || social === true`
- [x] 微出逃指令 typeColor 为绿色 `#7BAE7F`，不被 walk 橙色覆盖

## B. 双人邀请流程

- [x] 双人指令详情卡显示"邀请朋友"按钮（`<button open-type="share">`）
- [x] `onShareAppMessage` 返回的 path 含 `mode=double&cmd=<id>`
- [x] 被邀请方通过分享卡片打开后自动选中双人模式
- [x] 被邀请方打开后直接展示对应指令详情卡（不重新摇）
- [x] 详情卡显示"来自朋友的邀请"标签

## C. 导航栏圆角（双重头部修复）

- [x] `pages/collection/collection.json` 的 `navigationStyle` 为 `custom`
- [x] `pages/badges/badges.json` 的 `navigationStyle` 为 `custom`
- [x] `pages/settings/settings.json` 的 `navigationStyle` 为 `custom`
- [x] `pages/member/member.json` 的 `navigationStyle` 为 `custom`
- [x] 收藏页顶部只有一个圆角自定义头部
- [x] 徽章页顶部只有一个圆角自定义头部
- [x] 设置页顶部只有一个圆角自定义头部
- [x] 会员页顶部只有一个圆角自定义头部

## D. 收藏页布局

- [x] 卡片高度自适应（`min-height`，非固定 `280rpx`）
- [x] 右侧图片宽高比 4:3
- [x] 移除按钮触控区 ≥ 88rpx × 88rpx
- [x] `onLongPress` 直接调 `removeCollection`，不构造假 event
- [x] 空状态文案为 `♡ 还没有收藏任何指令`
- [x] 空状态按钮为 `去首页摇一个`，点击跳首页
- [x] scroll-view 高度动态计算，底部不被截
- [x] 长标题卡片不溢出
- [x] 短标题卡片不空旷
- [x] `coffee-shop.webp` 硬编码已移除

## E. TabBar 占位

- [x] `app.wxss` 的 `.tabbar-placeholder` 为 `calc(180rpx + env(safe-area-inset-bottom))`
- [x] `custom-tab-bar/index.wxss` 的占位高度同上
- [x] 首页底部内容不被 tab bar 遮挡
- [x] 地图页底部内容不被 tab bar 遮挡
- [x] 我的页底部内容不被 tab bar 遮挡

## F. 会员页

- [x] `app.wxss` 定义了 `--lemon-tint: #FFF4C7`
- [x] `app.wxss` 定义了 `--brand-strong: #45B08C`
- [x] 会员页渐变背景正常显示（无透明 / 无继承色）
- [x] `expireDate` 基于 `Date.now() + 365天` 计算，非硬编码

## G. 地图页

- [x] 默认坐标优先用真实定位
- [x] 无定位时 fallback 广州
- [x] 无 location 的 record 不使用 `Math.random()` 偏移
- [x] `showMore` 死分享分支已删除
- [x] 首次打开授权后定位到真实位置

## H. 记录页

- [x] canvas 离屏定位单位统一（px 离屏）
- [x] `latte.webp` 硬编码已移除，改用 `currentCommand.scene`
- [x] 分享卡片能正常生成

## I. 音效

- [x] `app.js` 实现 `playSound(name)` 方法
- [x] 音效关闭时全静默
- [x] 音效开启且文件存在时摇骰有声音
- [x] 音效开启但文件缺失时不报错（静默 fallback）
- [x] 摇骰 / 完成 / 保存 / 解锁四处接入

## J. 问候语

- [x] `早啊，广州·天河 26℃ 晴` 完整显示不截断

## K. 死代码与硬编码

- [x] `pages/profile/profile.js` 的 `goMember`/`openMember` 注释已删
- [x] `app.js` 的 `escapeCode` 默认值与 PRD 一致
- [x] `data/commands.js` 末尾重复归一化逻辑已删
- [x] `utils/constants.js` 是 typeAlias / DEFAULT_STEPS 唯一来源
- [x] 全局无 `console.error`
- [x] 全局无 undefined 变量引用

## L. 对抗式审查终检

- [x] 三个模式芯片全部可见且可选
- [x] 微出逃 typeColor 为绿色
- [x] 收藏 / 徽章 / 设置 / 会员四页无双头
- [x] 收藏页长标题不溢出、短标题不空旷
- [x] TabBar 不遮挡内容
- [x] 会员页渐变正常
- [x] 地图页定位真实
- [x] 音效开关生效
- [x] 双人邀请全流程通
- [x] 全局无 console.error / undefined
