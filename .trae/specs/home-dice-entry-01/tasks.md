# Tasks: 首页 3 骰子入口

## 任务列表

- [ ] Task 1: 准备数据层
  - [ ] SubTask 1.1: 在 `utils/constants.js` 新增 `HOME_DICE_LIST` 导出（3 项：微逃/破圈/同频），每项含 id/name/icon/color/desc，参考现有 `SHEET_MODES` 结构
  - [ ] SubTask 1.2: 复用现有 SVG：微逃=sprout-brand-strong、破圈=footprints-coral、同频=dice-5-brand-strong（若需新 SVG 再补）
  - [ ] SubTask 1.3: 创建 `utils/duration-recommender.js`，导出 `recommendDuration(records)` 函数
  - [ ] SubTask 1.4: `recommendDuration` 实现：过滤 `mode==='micro'` 取最近 10 条 duration 求中位数，匹配到 5/10/15/20 档位；<3 条返回 `{duration:15, isRecommended:false}`

- [ ] Task 2: 删除旧交互（mode-tag + mode-sheet）
  - [ ] SubTask 2.1: grep 全项目 `onModeTagTap / onModeOptionTap / closeModeSheet / showModeSheet` 确认无外部引用
  - [ ] SubTask 2.2: 删除 `pages/index/index.wxml` 第 31-35 行 mode-tag DOM
  - [ ] SubTask 2.3: 删除 `pages/index/index.wxml` 第 169-192 行 mode-sheet-mask + mode-sheet DOM
  - [ ] SubTask 2.4: 删除 `pages/index/index.wxss` 中 mode-tag / mode-sheet 相关样式
  - [ ] SubTask 2.5: 删除 `pages/index/index.js` 中 `onModeTagTap / onModeOptionTap / closeModeSheet` 方法（保留 `applyModeChange` 若 generating 用到，否则一并删）

- [ ] Task 3: 实现 Cover Flow 布局
  - [ ] SubTask 3.1: `pages/index/index.js` 增加 data：`currentDiceIndex / isSliding / diceList / touchStartX`
  - [ ] SubTask 3.2: 替换 `pages/index/index.wxml` 第 26-47 行单骰子卡为 3 骰子 Cover Flow 结构（外层 swiper 或手动 touch 容器 + 3 个骰子 view）
  - [ ] SubTask 3.3: 中间骰子 scale=1.0 opacity=1，两侧 scale=0.7 opacity=0.5
  - [ ] SubTask 3.4: 底部 3 个圆点指示器，当前位高亮
  - [ ] SubTask 3.5: 中间骰子下方显示模式名 + 描述（读 `diceList[currentDiceIndex]`）
  - [ ] SubTask 3.6: `pages/index/index.wxss` 写 Cover Flow 样式（`transform: scale + translateX`，过渡 300ms）

- [ ] Task 4: 实现滑动切换状态机
  - [ ] SubTask 4.1: `bindtouchstart` 记录 `touchStartX`
  - [ ] SubTask 4.2: `bindtouchend` 计算偏移，>40px 触发切换，否则回弹
  - [ ] SubTask 4.3: 右滑 `currentDiceIndex++`（最大 2 不循环），左滑 `currentDiceIndex--`（最小 0 不循环）
  - [ ] SubTask 4.4: 滑动期间 `isSliding=true`，禁止点击；300ms 后 `isSliding=false`
  - [ ] SubTask 4.5: 切换后 `wx.setStorageSync('lastDiceIndex', currentDiceIndex)` 持久化
  - [ ] SubTask 4.6: onLoad 读取 `wx.getStorageSync('lastDiceIndex')` 恢复上次位置

- [ ] Task 5: 实现点击分流
  - [ ] SubTask 5.1: 骰子点击 `bindtap="onDiceTap"`，检查 `isSliding` 防抖
  - [ ] SubTask 5.2: `currentDiceIndex===0`（微逃）→ `showMicroSheet=true`
  - [ ] SubTask 5.3: `currentDiceIndex===1`（破圈）→ `wx.navigateTo({url:'/pages/generating?mode=breakthrough'})`
  - [ ] SubTask 5.4: `currentDiceIndex===2`（同频）→ `wx.navigateTo({url:'/pages/group/create', fail:()=>wx.showToast({title:'同频组局即将开放',icon:'none'})})`
  - [ ] SubTask 5.5: 点击区域 ≥ 88rpx

- [ ] Task 6: 实现微逃细分弹窗
  - [ ] SubTask 6.1: `pages/index/index.wxml` 新增底部 Sheet（复用原 mode-sheet 容器结构，换内容）
  - [ ] SubTask 6.2: 4 个时长档位：5/10/15/20 min，每个档位一个可点击卡片
  - [ ] SubTask 6.3: 「开始出逃」按钮，初始禁用，选中档位后启用
  - [ ] SubTask 6.4: `pages/index/index.js` 增加方法：`onMicroOptionTap`（选档位）、`onMicroStart`（跳 generating）、`onMicroCancel`（关弹窗）
  - [ ] SubTask 6.5: 弹窗打开时调用 `recommendDuration(records)` 计算推荐档位，默认选中

- [ ] Task 7: 顺手补 generating 页 url 参数解析
  - [ ] SubTask 7.1: 读 `pages/generating/generating.js` 现有 `onLoad`，看是否已解析 options
  - [ ] SubTask 7.2: 若未解析，补 `onLoad(options)` 读取 `mode` 和 `duration`，写入 data 供后续生成逻辑用
  - [ ] SubTask 7.3: 不修改 generating 页其他逻辑（动画归 `dice-animation-01` Spec）

- [ ] Task 8: 智能推荐逻辑单测
  - [ ] SubTask 8.1: 在 `utils/duration-recommender.js` 文件末尾或单独 `utils/__tests__/duration-recommender.test.js` 写 3 个 case
  - [ ] SubTask 8.2: Case A：10 条 micro 记录，duration 中位数 12 → 推荐 10min，isRecommended=true
  - [ ] SubTask 8.3: Case B：2 条 micro 记录 → 推荐 15min，isRecommended=false
  - [ ] SubTask 8.4: Case C：records 为空数组 → 推荐 15min，isRecommended=false
  - [ ] SubTask 8.5: `node utils/duration-recommender.js`（或 test 文件）跑通无报错

- [ ] Task 9: 验收 + 提交
  - [ ] SubTask 9.1: 跑 `node scripts/check-syntax.js` 确认 FAIL=0
  - [ ] SubTask 9.2: 跑 `node scripts/final-check.js` 确认 WXML/页面/TabBar 三项 FAIL=0
  - [ ] SubTask 9.3: 跑 `node scripts/release-check.js` 确认通过
  - [ ] SubTask 9.4: 微信开发者工具编译，模拟器 iOS + Android 各一次
  - [ ] SubTask 9.5: 真机（P0）验证 happy path：滑切 3 骰子 / 点微逃弹窗选档 / 点破圈跳转 / 点同频 toast
  - [ ] SubTask 9.6: 截图：3 骰子默认态 / 滑动中 / 微逃弹窗 / 推荐档位高亮
  - [ ] SubTask 9.7: `git add -- <指定文件>` 定向暂存（含 wxml/wxss/js/constants.js/duration-recommender.js）
  - [ ] SubTask 9.8: `git diff --cached` 不含 `project.private.config.json` / 密钥
  - [ ] SubTask 9.9: Conventional Commits：`feat(home): add 3-dice cover flow entry with micro duration sheet`
  - [ ] SubTask 9.10: `git push -u origin feature/home-02`
  - [ ] SubTask 9.11: 创建 PR，标题 `[EC-015][EC-017] 首页：3 骰子入口与出逃方式选择`，填完整 PR 模板

# 任务依赖

- [Task 2] 独立（先清理旧代码）
- [Task 1] 独立（准备数据）
- [Task 3] 依赖 [Task 1, Task 2]
- [Task 4] 依赖 [Task 3]
- [Task 5] 依赖 [Task 3]
- [Task 6] 依赖 [Task 1, Task 3]
- [Task 7] 独立（generating 页最小改动，可与 Task 1-6 并行）
- [Task 8] 依赖 [Task 1]
- [Task 9] 依赖 [Task 1-8 全部完成]

## 可并行

- Task 1 + Task 2 + Task 7 可三个 sub-agent 并行
- Task 8 在 Task 1 完成后可与 Task 3-6 并行
