# Tasks: group-create-01 — 创建出逃房间

> 实现任务清单。每完成一项打勾。

---

## Task 0: 前置条件（用户操作）

- [ ] Task 0.1: 在微信开发者工具「云开发」控制台创建环境，拿到 env id
- [ ] Task 0.2: 在云开发控制台手动创建 `rooms` 集合
- [ ] Task 0.3: 把 env id 回填到 spec.md 和后续 app.js 代码

## Task 1: 切分支

- [ ] Task 1.1: `git checkout Daniel && git pull origin Daniel`（确保 Daniel 分支最新）
- [ ] Task 1.2: 直接在 Daniel 分支开发（按团队规范，不再开 feature 分支）
- [ ] Task 1.3: 确认 `.gitignore` 包含 `cloudfunctions/*/node_modules/`（防止 npm install 后 node_modules 进包）

## Task 2: 云开发初始化

- [ ] Task 2.1: `app.js` onLaunch 加 `wx.cloud.init({ env: '<占位>', traceUser: true })`
- [ ] Task 2.2: 添加 try-catch 包裹，云开发 init 失败不阻塞 app 启动
- [ ] Task 2.3: 加 `globalData.cloudReady` flag，标记云开发是否初始化成功

## Task 3: createRoom 云函数

- [ ] Task 3.1: 创建目录 `cloudfunctions/createRoom/`
- [ ] Task 3.2: `cloudfunctions/createRoom/package.json`（name / version / main / dependencies 无）
- [ ] Task 3.3: `cloudfunctions/createRoom/index.js` 实现：
  - [ ] 3.3.1: 从 `wxContext.getWXContext()` 拿 `openid`，拿不到 return `{ ok: false, errCode: 'NO_AUTH' }`
  - [ ] 3.3.2: 校验 `topic`（1-20 字）和 `maxMembers`（3-6），不合法 return `{ ok: false, errCode: 'INVALID_PARAM' }`
  - [ ] 3.3.3: 循环 5 次生成 6 位 roomId（大写字母+数字），每次 `db.collection('rooms').where({roomId}).count()` 查重
  - [ ] 3.3.4: 5 次都重复 return `{ ok: false, errCode: 'ROOM_ID_COLLISION' }`
  - [ ] 3.3.5: `db.collection('rooms').add()` 写入完整文档
  - [ ] 3.3.6: add 失败 return `{ ok: false, errCode: 'DB_ERROR' }`
  - [ ] 3.3.7: 成功 return `{ ok: true, roomId }`
- [ ] Task 3.4: 部署云函数到云端（右键 cloudfunctions/createRoom → 上传并部署）

## Task 4: cancelRoom 云函数

- [ ] Task 4.1: 创建目录 `cloudfunctions/cancelRoom/`
- [ ] Task 4.2: `cloudfunctions/cancelRoom/package.json`
- [ ] Task 4.3: `cloudfunctions/cancelRoom/index.js` 实现：
  - [ ] 4.3.1: 拿 `openid`，拿不到 return `NO_AUTH`
  - [ ] 4.3.2: 查 `rooms.where({roomId}).get()`，查不到 return `ROOM_NOT_FOUND`
  - [ ] 4.3.3: 校验 `hostOpenId === openid`，不等 return `NOT_HOST`
  - [ ] 4.3.4: 校验 `status === 'cancelled'`，已取消 return `ALREADY_CANCELLED`
  - [ ] 4.3.5: `db.collection('rooms').doc(_id).update({ status: 'cancelled', updatedAt: Date.now() })`
  - [ ] 4.3.6: 成功 return `{ ok: true }`
- [ ] Task 4.4: 部署云函数到云端

## Task 5: 创建页 pages/group/create

- [ ] Task 5.1: 创建目录 `pages/group/create/`
- [ ] Task 5.2: `pages/group/create.json`：`{ "usingComponents": {}, "navigationBarTitleText": "创建出逃房间" }`
- [ ] Task 5.3: `pages/group/create.wxml` 实现：
  - [ ] 5.3.1: 复用 `nav-header` 顶部导航 + 返回箭头
  - [ ] 5.3.2: 主题 input（placeholder「比如：周末探店 / 周末出逃」+ maxlength=20）
  - [ ] 5.3.3: 人数 picker（range 3-6，默认 4）
  - [ ] 5.3.4: 创建按钮（loading 态 + disabled 态）
  - [ ] 5.3.5: 字数计数器 `{{topic.length}}/20`
- [ ] Task 5.4: `pages/group/create.wxss` 实现：
  - [ ] 5.4.1: 复用 home-page 的渐变背景 + nav-header 样式
  - [ ] 5.4.2: 表单卡片样式（白底 + 圆角 + shadow）
  - [ ] 5.4.3: 创建按钮主色（#5CBF9E）+ loading 转圈
- [ ] Task 5.5: `pages/group/create.js` 实现：
  - [ ] 5.5.1: data: `topic / maxMembers=4 / creating=false`
  - [ ] 5.5.2: `onTopicInput(e)` 更新 topic
  - [ ] 5.5.3: `onMemberChange(e)` 更新 maxMembers
  - [ ] 5.5.4: `onCreateTap()` 校验 → callFunction → redirectTo room
  - [ ] 5.5.5: 5 秒超时定时器 + 失败 toast + 按钮恢复
- [ ] Task 5.6: `app.json` pages 数组注册 `pages/group/create/create`

## Task 6: 房间内页骨架 pages/group/room

- [ ] Task 6.1: 创建目录 `pages/group/room/`
- [ ] Task 6.2: `pages/group/room.json`：`{ "usingComponents": {}, "navigationBarTitleText": "同频组局" }`
- [ ] Task 6.3: `pages/group/room.wxml` 实现：
  - [ ] 6.3.1: nav-header + 返回箭头
  - [ ] 6.3.2: roomId 大字号展示 + 「点击复制」副文案 + bindtap onCopyRoomId
  - [ ] 6.3.3: 主题 + 状态标签（绿点 + 「等待成员加入」）
  - [ ] 6.3.4: 成员位 wx:for 渲染（host 实心 + 占位虚线）
  - [ ] 6.3.5: 邀请朋友大按钮 + bindtap onInviteTap
  - [ ] 6.3.6: 取消组局文字按钮 + bindtap onCancelTap
  - [ ] 6.3.7: loading 骨架屏 wx:if="{{loading}}"
- [ ] Task 6.4: `pages/group/room.wxss` 实现：
  - [ ] 6.4.1: 复用 home-page 渐变背景 + nav-header 样式
  - [ ] 6.4.2: roomId 大字号（48rpx 粗体）+ 居中
  - [ ] 6.4.3: 成员位圆圈样式（host 实心绿 + 占位虚线灰）
  - [ ] 6.4.4: 邀请按钮主色样式
  - [ ] 6.4.5: 取消组局灰色文字按钮样式
  - [ ] 6.4.6: loading 骨架屏样式
- [ ] Task 6.5: `pages/group/room.js` 实现：
  - [ ] 6.5.1: onLoad 拿 `options.roomId`，调 `loadRoom(roomId)`
  - [ ] 6.5.2: `loadRoom(roomId)`：`wx.cloud.database().collection('rooms').where({roomId}).get()`
  - [ ] 6.5.3: 查不到 → toast「房间不存在」+ navigateBack
  - [ ] 6.5.4: 查到 → setData room / members 占位数组
  - [ ] 6.5.5: `onCopyRoomId()` → `wx.setClipboardData`
  - [ ] 6.5.6: `onInviteTap()` → `wx.showToast({ title: '邀请功能即将开放', icon: 'none' })`
  - [ ] 6.5.7: `onCancelTap()` → showModal 二次确认 → callFunction cancelRoom → navigateBack
- [ ] Task 6.6: `app.json` pages 数组注册 `pages/group/room/room`

## Task 7: 首页同频骰子跳转确认

- [ ] Task 7.1: `pages/index/index.js` 的 `routeDice` 方法里 `sync` 分支已经是 `wx.navigateTo({ url: '/pages/group/create' })`，确认无需修改
- [ ] Task 7.2: 真机点同频骰子 → 转动动画 → 进入创建页

## Task 8: 检查脚本

- [ ] Task 8.1: `node scripts/check-syntax.js` FAIL=0
- [ ] Task 8.2: `node scripts/final-check.js` WXML FAIL=0 / 页面 FAIL=0 / TabBar 完整
- [ ] Task 8.3: `node scripts/check-bundle.js --base=origin/Daniel` PR 资源检查通过
- [ ] Task 8.4: 微信开发者工具代码质量扫描全绿

## Task 9: 真机验证

- [ ] Task 9.1: 模拟器 iOS 验证创建房间 + 进入房间内页 + 取消组局
- [ ] Task 9.2: 模拟器 Android 验证同上
- [ ] Task 9.3: 真机至少一台验证 happy path
- [ ] Task 9.4: 截图：创建页 / 房间内页骨架 / 取消组局弹窗

## Task 10: 提交

- [ ] Task 10.1: `git add` 定向暂存（cloudfunctions/ + pages/group/ + app.js + app.json + .trae/specs/group-create-01/）
- [ ] Task 10.2: `git diff --cached` 不含 `project.private.config.json`
- [ ] Task 10.3: `git diff --cached` 不含云开发 env id 真实值（用占位字符串）
- [ ] Task 10.4: commit message: `feat(group): add create room page with cloud function`
- [ ] Task 10.5: push 到 `origin/Daniel`（不是 feature/group-01，按团队规范统一推 Daniel 分支）
- [ ] Task 10.6: 开 PR `Daniel → dev`，标题 `[C-01] 创建出逃房间 + 房间内页骨架`
- [ ] Task 10.7: PR 模板填写完整
