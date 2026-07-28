# Checklist: group-create-01 — 创建出逃房间

> 提交 PR 前必逐项打勾。FAIL=0 才能合并。

## 前置条件（用户操作）

- [ ] 在微信开发者工具「云开发」控制台创建环境，拿到 env id
- [ ] 在云开发控制台手动创建 `rooms` 集合
- [ ] env id 已回填到 `app.js` 的 `wx.cloud.init`

## 云开发初始化

- [ ] `app.js` onLaunch 调用 `wx.cloud.init`
- [ ] `env` 参数已回填真实 env id（不是占位字符串）
- [ ] `traceUser: true`
- [ ] init 失败有 try-catch，不阻塞 app 启动
- [ ] `globalData.cloudReady` flag 标记初始化状态

## createRoom 云函数

- [ ] `cloudfunctions/createRoom/index.js` 存在
- [ ] `cloudfunctions/createRoom/package.json` 存在（main: index.js）
- [ ] 从 `wxContext.getWXContext()` 拿 openid
- [ ] openid 拿不到 return `{ ok: false, errCode: 'NO_AUTH' }`
- [ ] 校验 topic（1-20 字）
- [ ] 校验 maxMembers（3-6）
- [ ] 不合法 return `{ ok: false, errCode: 'INVALID_PARAM' }`
- [ ] 6 位 roomId 生成函数（大写字母+数字）
- [ ] 循环 5 次查重（db.collection('rooms').where({roomId}).count()）
- [ ] 5 次都重复 return `ROOM_ID_COLLISION`
- [ ] add 文档含完整字段（roomId/topic/maxMembers/hostOpenId/members/status/createdAt/updatedAt）
- [ ] members[0] 含 openId/nickname/joinedAt，nickname 为空字符串
- [ ] add 失败 return `DB_ERROR`
- [ ] 成功 return `{ ok: true, roomId }`
- [ ] 云函数已上传部署到云端

## cancelRoom 云函数

- [ ] `cloudfunctions/cancelRoom/index.js` 存在
- [ ] `cloudfunctions/cancelRoom/package.json` 存在
- [ ] 拿 openid
- [ ] 查 rooms.where({roomId}).get()
- [ ] 查不到 return `ROOM_NOT_FOUND`
- [ ] `hostOpenId !== openid` return `NOT_HOST`
- [ ] `status === 'cancelled'` return `ALREADY_CANCELLED`
- [ ] update status: 'cancelled', updatedAt: Date.now()
- [ ] 成功 return `{ ok: true }`
- [ ] 云函数已上传部署到云端

## 创建页 pages/group/create

- [ ] `pages/group/create.{js,wxml,wxss,json}` 4 个文件齐全
- [ ] `app.json` pages 数组已注册 `pages/group/create/create`
- [ ] 复用 `nav-header` 顶部导航
- [ ] 主题 input 有 placeholder「比如：周末探店 / 周末出逃」
- [ ] 主题 input maxlength=20
- [ ] 字数计数器 `{{topic.length}}/20`
- [ ] 人数 picker range 3-6，默认 4
- [ ] 创建按钮 loading 态（创建中... + 转圈）
- [ ] 创建按钮 disabled 态（creating=true 时不可点）
- [ ] `onCreateTap` 校验主题非空 + ≤ 20 字
- [ ] `onCreateTap` 校验人数 3-6
- [ ] 校验失败 toast「请填写 1-20 字主题」/「3-6 人组局」
- [ ] 校验通过 callFunction createRoom
- [ ] 5 秒超时定时器
- [ ] 超时 toast「网络不稳定，重试」+ 按钮恢复
- [ ] 成功 wx.redirectTo /pages/group/room?roomId=xxx
- [ ] 失败按 errCode toast 对应文案 + 按钮恢复

## 房间内页骨架 pages/group/room

- [ ] `pages/group/room.{js,wxml,wxss,json}` 4 个文件齐全
- [ ] `app.json` pages 数组已注册 `pages/group/room/room`
- [ ] 复用 `nav-header` 顶部导航 + 返回箭头
- [ ] roomId 大字号（48rpx 粗体）居中展示
- [ ] roomId 点击 `onCopyRoomId` → `wx.setClipboardData`
- [ ] 主题展示（32rpx 粗体）
- [ ] 状态标签（绿点 + 「等待成员加入」）
- [ ] 成员位 wx:for 渲染 maxMembers 个圆圈
- [ ] 第 1 位（host）实心绿色 + check-white.svg + "你"字
- [ ] 其余位虚线灰边 + "?" 字符
- [ ] 邀请朋友大按钮（主色 #5CBF9E）
- [ ] 邀请按钮点击 toast「邀请功能即将开放」
- [ ] 取消组局灰色文字按钮
- [ ] 取消组局点击 showModal 二次确认
- [ ] 确认后 callFunction cancelRoom
- [ ] 成功 toast「组局已取消」+ navigateBack
- [ ] loading 骨架屏（loading=true 时显示）
- [ ] onLoad 拿 options.roomId
- [ ] loadRoom 调用 wx.cloud.database().collection('rooms').where({roomId}).get()
- [ ] 查不到 toast「房间不存在」+ navigateBack
- [ ] 查到 setData room 数据

## 首页跳转

- [ ] `pages/index/index.js` routeDice 的 sync 分支跳 `/pages/group/create`
- [ ] 真机点同频骰子 → 转动动画 → 进入创建页

## .gitignore

- [ ] `.gitignore` 包含 `cloudfunctions/*/node_modules/`
- [ ] `.gitignore` 包含 `cloudfunctions/*/.fun/`（如果用 fun 部署）

## 包体红线

- [ ] **包体红线自检**：本次 PR 资源增量 = 0（无新增图片/音频/字体/插件）
- [ ] 引用资源全部复用现有 SVG（check-white.svg / chevron-left-ink.svg / users-white.svg），零新增
- [ ] `node scripts/check-bundle.js --base=origin/Daniel` PR 资源检查通过

## 自动检查

- [ ] `node scripts/check-syntax.js` FAIL=0
- [ ] `node scripts/final-check.js` WXML FAIL=0 / 页面 FAIL=0 / TabBar 完整
- [ ] `node scripts/check-bundle.js --base=origin/Daniel` 通过

## 开发者工具

- [ ] 微信开发者工具重新编译通过
- [ ] Console 无新错误
- [ ] Network 无 404（云函数调用 200 OK）
- [ ] 代码质量扫描：主包 / 资源大小全绿
- [ ] 模拟器 iOS 验证一次
- [ ] 模拟器 Android 验证一次

## 真机

- [ ] P1 任务至少一台真机验证 happy path
- [ ] 截图：创建页 / 房间内页骨架 / 取消组局弹窗

## 提交

- [ ] `git add -- <指定文件>` 定向暂存
- [ ] `git diff --cached` 不含 `project.private.config.json`
- [ ] `git diff --cached` 不含云开发 env id 真实值（用占位字符串）
- [ ] `git diff --cached` 不含 API Key / 凭证
- [ ] Conventional Commits 信息：`feat(group): add create room page with cloud function`
- [ ] `git push origin Daniel`（按团队规范统一推 Daniel 分支）
- [ ] PR 标题 `[C-01] 创建出逃房间 + 房间内页骨架`
- [ ] PR 模板填写完整（任务ID/目的/范围/不含/验收/检查/工具/真机/视觉/数据兼容/风险/回滚/AI说明/Review结论）
