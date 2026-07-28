# Checklist: 首页 3 骰子入口

> 提交 PR 前必逐项打勾。FAIL=0 才能合并。

## 数据层

- [ ] `utils/constants.js` 导出 `HOME_DICE_LIST`（3 项：micro/breakthrough/sync）
- [ ] `HOME_DICE_LIST` 每项含 id/name/icon/color/desc
- [ ] `HOME_DICE_LIST` 未修改 `SHEET_MODES` 和 `MODE_LIST`
- [ ] `utils/duration-recommender.js` 文件存在
- [ ] `recommendDuration(records)` 函数导出
- [ ] 过滤 `mode==='micro'` 取最近 10 条
- [ ] 中位数匹配档位 5/10/15/20
- [ ] <3 条返回 `{duration:15, isRecommended:false}`
- [ ] 空数组返回 `{duration:15, isRecommended:false}`

## 旧代码清理

- [ ] grep `onModeTagTap / onModeOptionTap / closeModeSheet / showModeSheet` 全项目无外部引用
- [ ] `pages/index/index.wxml` mode-tag DOM 已删除
- [ ] `pages/index/index.wxml` mode-sheet DOM 已删除
- [ ] `pages/index/index.wxss` mode-tag 样式已删除
- [ ] `pages/index/index.wxss` mode-sheet 样式已删除
- [ ] `pages/index/index.js` 相关方法已删除
- [ ] `SHEET_MODES` 常量保留未删（其他地方可能引用）

## Cover Flow 布局

- [ ] `pages/index/index.wxml` 3 骰子结构存在
- [ ] 中间骰子 scale=1.0 opacity=1
- [ ] 两侧骰子 scale=0.7 opacity=0.5
- [ ] 底部 3 个圆点指示器
- [ ] 当前位圆点高亮
- [ ] 中间骰子下方显示模式名 + 描述
- [ ] `pages/index/index.wxss` Cover Flow 样式存在
- [ ] `transform: scale + translateX` 过渡 300ms

## 滑动状态机

- [ ] `data.currentDiceIndex` 存在，默认 0
- [ ] `data.isSliding` 存在，默认 false
- [ ] `bindtouchstart` 记录起始 X
- [ ] `bindtouchend` 偏移 >40px 触发切换
- [ ] 右滑 index++（最大 2 不循环）
- [ ] 左滑 index--（最小 0 不循环）
- [ ] 滑动期间 `isSliding=true` 禁止点击
- [ ] 300ms 后 `isSliding=false`
- [ ] `wx.setStorageSync('lastDiceIndex', index)` 持久化
- [ ] onLoad 读取 `lastDiceIndex` 恢复

## 点击分流

- [ ] `bindtap="onDiceTap"` 绑定
- [ ] `isSliding===true` 时忽略点击
- [ ] 微逃（index=0）→ `showMicroSheet=true`
- [ ] 破圈（index=1）→ `wx.navigateTo /pages/generating?mode=breakthrough`
- [ ] 同频（index=2）→ `wx.navigateTo /pages/group/create`，fail 时 toast
- [ ] 点击区域 ≥ 88rpx

## 微逃细分弹窗

- [ ] `pages/index/index.wxml` 底部 Sheet 存在
- [ ] 4 个时长档位卡片：5/10/15/20 min
- [ ] 「开始出逃」按钮初始禁用
- [ ] 选中档位后按钮启用
- [ ] 推荐档位高亮 + 「推荐」标签
- [ ] `isRecommended=false` 时不显示「推荐」标签
- [ ] `onMicroOptionTap` 方法存在
- [ ] `onMicroStart` 方法存在，跳 `/pages/generating?mode=micro&duration=N`
- [ ] `onMicroCancel` 方法存在，关闭弹窗
- [ ] 弹窗打开时调用 `recommendDuration`

## generating 页 url 参数解析

- [ ] `pages/generating/generating.js` `onLoad(options)` 读取 mode
- [ ] `pages/generating/generating.js` `onLoad(options)` 读取 duration
- [ ] 未修改 generating 页其他逻辑

## 智能推荐单测

- [ ] Case A：10 条 micro 记录中位数 12 → 推荐 10min，isRecommended=true
- [ ] Case B：2 条 micro 记录 → 推荐 15min，isRecommended=false
- [ ] Case C：records 为空 → 推荐 15min，isRecommended=false
- [ ] `node utils/duration-recommender.js` 跑通无报错

## 验收（功能表序号 15）

- [ ] 页面中心展示 3 个出逃骰子
- [ ] 所需信息完整展示且与数据一致
- [ ] 加载、空态、失败态和长文本不破版
- [ ] 点击区域不小于 88rpx

## 验收（功能表序号 17）

- [ ] 选项可选中、修改并持久化（lastDiceIndex）
- [ ] 生成与推荐实际读取该值（generating 通过 url 参数）
- [ ] 空值、边界值和历史旧值均有兼容兜底
- [ ] 微逃弹窗高亮推荐档位

## 自动检查

- [ ] `node scripts/check-syntax.js` FAIL=0
- [ ] `node scripts/final-check.js` WXML FAIL=0 / 页面 FAIL=0 / TabBar 完整
- [ ] `node scripts/check-bundle.js --base=origin/dev` PR 资源检查通过（新增/修改资源单文件 ≤ 200KB，累计 ≤ 30KB）
- [ ] `node scripts/release-check.js` 通过（退出码 0）

## 开发者工具

- [ ] 微信开发者工具重新编译通过
- [ ] Console 无新错误
- [ ] Network 无 404
- [ ] 模拟器 iOS 验证一次
- [ ] 模拟器 Android 验证一次

## 真机

- [ ] P0 任务至少一台真机验证 happy path
- [ ] 截图：3 骰子默认态 / 滑动中 / 微逃弹窗 / 推荐档位高亮

## 提交

- [ ] **包体红线自检**：本次 PR 资源增量 = 0（确认无新增图片/音频/字体/插件）
- [ ] 引用资源全部复用现有 SVG/webp，零新增
- [ ] `git add -- <指定文件>` 定向暂存
- [ ] `git diff --cached` 不含 `project.private.config.json`
- [ ] `git diff --cached` 不含 API Key / 凭证
- [ ] Conventional Commits 信息：`feat(home): add 3-dice cover flow entry with micro duration sheet`
- [ ] `git push -u origin feature/home-02`
- [ ] PR 标题 `[EC-015][EC-017] 首页：3 骰子入口与出逃方式选择`
- [ ] PR 模板 15 项全部填写（任务ID/目的/范围/不含/验收/检查/工具/真机/视觉/数据兼容/风险/回滚/AI说明/Review结论）
