# 同频出逃补「拍照打卡」页设计

## 背景

普通出逃与同频出逃的完成流程不一致：

- **普通出逃**（`pages/executing/executing.js`）：完成步骤 → `finishCommand` 跳 `pages/record/record`（拍照/滤镜/贴纸/心情/分享卡）→ `onSave` 调 `app.completeCommand` → 分享卡 → 去地图。✅ 有完整拍照打卡环节。
- **同频出逃**（`pages/group/escape-record/escape-record.js`）：`onFinish` **直接** `app.completeCommand` + `wx.showModal` 弹窗结束，**绕过** record 页。❌ 缺拍照打卡环节。

用户反馈「完成出逃后拍照打卡页面不见了」，确认指同频出逃缺打卡页。`pages/photo-edit` 页孤立未接入，本次不动。

## 方案

**方案A：复用现有 record 页 + 分享卡加成员**。同频出逃完成后跳 record 页，走与普通出逃一致的拍照打卡流程；`completeCommand` 自动注入同频扩展字段；分享卡额外绘制成员信息，让同频出逃有专属感。

## 细分功能点

### F1. escape-record.onFinish 改造（跳 record 页）
- 校验 `allDone`（不变）
- `stopTimer`
- 构造 `app.globalData.currentCommand`：
  - `id: 'group_' + roomId`、`type: 'sync'`、`typeColor: '#5CBF9E'`
  - `startTime`、`duration`、`photos: []`
  - 同频扩展：`isGroup: true`、`groupId`、`members`、`steps`（文本数组）
  - `executionProgress`（从 `currentGroupScript` 取，供 buildRecord 生成留痕 steps）
- `commandStatus = 'executing'`
- 清空 `currentGroupScript`（globalData + storage），record 页不依赖它
- `wx.navigateTo({ url: '/pages/record/record' })`
- **删除**原 `completeCommand` 直接调用 + `showModal` 弹窗（改由 record 页 onSave 承接）

### F2. completeCommand 自动注入同频字段（app.js）
在现有 `executionProgress` / `location` 自动注入之后，增加：
```js
if (rd.isGroup !== true && cmd.isGroup === true) {
  rd.isGroup = true
  rd.groupId = cmd.groupId
  rd.members = cmd.members
  rd.steps = cmd.steps
}
```
- 保证 record.js `onSave` 只传 `photos/feeling/mood/filter/stickers` 时，同频字段也能进 record
- 普通出逃 `cmd.isGroup` 不存在，不注入，零影响
- 契约不变量：同频记录仍走 `completeCommand → buildRecord` 统一入口

### F3. record 页识别同频出逃（record.js onLoad）
- `onLoad` 读 `cmd.isGroup`，存 `isGroup`、`members` 到 data
- 分享卡标题用 `cmd.title`（同频出逃已是剧本标题，无需改）

### F4. record 页默认感受文案适配（record.js onSave）
- `onSave` 时 `feeling` 为空，按 `isGroup` 选默认值：
  - 同频：`和朋友一起完成同频出逃`
  - 普通：`今天出去走了一小段。`（不变）

### F5. 分享卡绘制成员（record.js drawShareText）
- 在感受文字（y≈680）与日期行（y≈780）之间，y≈725 画一行：
  - `和朋友一起：成员A、成员B、成员C`（最多 3 个，超 3 显示「等 N 人」）
- 字号 22px，颜色 `#A8ADB5`（与日期行一致，不抢视觉）
- 仅 `isGroup === true` 时绘制；普通出逃不画

### F6. 导航栈兜底（escape-record.js onLoad）
- `onLoad` 检测：无 `roomId` 且 `currentGroupScript` 空（从 record 页返回的已完成态）→ `wx.switchTab` 首页，避免空白
- 正常进入流程不受影响（有 roomId 或 currentGroupScript）

### F7. 测试同步
- **单元测试**：`completeCommand` 自动注入同频字段（新增 case：cmd.isGroup=true 且 rd 未传 → record 含 isGroup/groupId/members/steps）
- **BDD**（group-flow.feature）：新增场景「同频出逃完成后进入 record 页」
  -静态契约：escape-record.js 含 `navigateTo` 到 `/pages/record/record`，不再含直接 `completeCommand` 调用
- **变异测试**：针对 F2 自动注入逻辑加算子（如 `cmd.isGroup === true` 改为 `=== false`）
- **现有测试不破坏**：group-flow「同频出逃完成后生成记录」场景需调整（记录生成改由 record 页 onSave 触发，不再 onFinish 直接调）

## 数据契约不变量

1. 同频记录仍走 `completeCommand → buildRecord` 统一入口（不绕过）
2. 记录含 `isGroup/groupId/members/steps/executionProgress` 留痕
3. `location` 优先级不变（rd > ctx > null）
4. 普通出逃零影响（`cmd.isGroup` 不存在则不注入）
5. `executionProgress` 留痕 steps 升级为 `[{text, completedAt}]` 不变

## 风险与回滚

- **风险**：escape-record 跳 record 页后，用户从 record 页系统返回会回到 escape-record（已通过 F6 兜底）
- **风险**：completeCommand 自动注入改变契约，影响其他调用方 → 仅 `cmd.isGroup === true` 时注入，普通出逃不受影响
- **回滚**：F1-F7 各自独立，可单独回滚；F1 回滚即恢复原 onFinish 直接 completeCommand
