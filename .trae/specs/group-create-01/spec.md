# Spec: group-create-01 — 创建出逃房间

> 创建日：2026-07-28
> 负责人：Daniel
> 分支：`Daniel`（基于 `origin/dev`，按团队规范统一推 `origin/Daniel`）
> 任务编号：C-01（同频组局 / 创建出逃房间）
> 优先级：P1
> 状态：待实现

---

## 背景

同频组局是「约上朋友一起出逃」的多人协作模式。C-01 是整个 C 阶段（19 Spec）的入口：host 在创建页填最小信息（主题 + 人数上限），调云函数生成 roomId，进入房间内页骨架。

后续 Spec 都在房间内页骨架上加东西：
- C-02 接管「邀请朋友」按钮 → 微信分享卡片
- C-03 接管「成员位」→ 实时轮询成员列表 + 昵称填写
- C-04 在成员位下加「匿名偏好提交」入口
- C-05/06/07 在房间内加三种投票卡片
- C-08 接管「开始出逃」按钮 → 多人剧本生成

## 范围

### 在范围内

1. `pages/group/create` 创建页：主题 input + 人数上限 picker + 创建按钮
2. `pages/group/room` 房间内页骨架：roomId 展示 + 主题 + 成员位静态展示 + 邀请按钮占位 + 取消组局
3. `cloudfunctions/createRoom` 云函数：生成 roomId + 写 rooms 集合
4. `cloudfunctions/cancelRoom` 云函数：host 取消组局
5. `app.js` 云开发初始化 `wx.cloud.init`
6. `app.json` 注册 group/create 和 group/room 两个页面

### 不在范围内（明确边界）

| 不做 | 后续 Spec |
|---|---|
| 微信分享卡片 / 邀请链接生成 | C-02 |
| 成员实时列表（轮询 2-3s）| C-03 |
| 成员昵称填写流程 | C-03 |
| 匿名偏好提交 | C-04 |
| 时间 / 预算 / 风格投票 | C-05/06/07 |
| 多人剧本生成 | C-08 |
| 成员临时退出 | C-10 |
| 人数不足兜底 | C-11 |
| 公开组局 / 申请加入 / 审核 | C-16/17/18 |
| 评价举报 | C-19 |
| 数据库安全规则细化（roomId in members）| C-02 |

---

## 架构

```
首页同频骰子点击掷骰 → wx.navigateTo /pages/group/create
                                          │
                                          ▼
                            创建页：主题 + 人数上限
                                          │ wx.cloud.callFunction('createRoom')
                                          ▼
                            cloudfunctions/createRoom/
                              ├─ index.js (生成 roomId + 写 rooms 集合)
                              └─ package.json
                                          │ 返回 { ok: true, roomId }
                                          ▼
                            wx.redirectTo /pages/group/room?roomId=xxx
                                          │
                                          ▼
                            房间内页骨架（onLoad 按 roomId 查库）
                              ├─ roomId 展示 + 点击复制
                              ├─ 主题 + 状态标签
                              ├─ 成员位静态展示（host 实心 + 虚线占位）
                              ├─ 邀请朋友大按钮（占位 toast）
                              └─ 取消组局 → cancelRoom 云函数
```

### 云开发初始化

`app.js` onLaunch 加：
```js
if (wx.cloud) {
  wx.cloud.init({
    env: 'escape-command-prod',  // 占位，由用户在云开发控制台创建后回填
    traceUser: true
  })
}
```

env id 由用户在微信开发者工具「云开发」控制台创建环境后，把真实 env id 回填到 spec 和代码。C-01 实现阶段先用占位字符串，跑通前必须回填。

---

## 数据结构

### `rooms` 集合 schema

```js
{
  _id: String,            // 云数据库自动生成
  roomId: String,         // 6 位大写字母+数字，云函数生成，查库防重
  topic: String,          // host 输入，1-20 字
  maxMembers: Number,     // 人数上限（含 host），3-6
  hostOpenId: String,     // 从云函数 context 拿，前端不传
  members: [              // C-01 时只有 host 一人
    {
      openId: String,
      nickname: String,   // 暂留空字符串，C-03 再做填昵称流程
      joinedAt: Number    // 毫秒时间戳
    }
  ],
  status: String,         // waiting / active / cancelled / finished
  createdAt: Number,      // 毫秒时间戳
  updatedAt: Number       // 毫秒时间戳
}
```

### 字段决策

1. **roomId 格式**：6 位大写字母+数字（如 `A3B7K9`）。云函数生成后查库防重，最多重试 5 次。
2. **nickname 留空**：`wx.getUserProfile` 已废弃，C-01 不解决昵称问题，members[0].nickname 留空字符串，房间内页显示「你」。
3. **status 状态机**：C-01 只用 `waiting`（创建后默认）和 `cancelled`（host 取消）。`active` / `finished` 留给后续 Spec。
4. **members 嵌套数组**：30 号演示前房间数 < 100，单文档读一次够用。性能瓶颈再拆独立 members 集合（YAGNI）。
5. **数据库权限**：C-01 暂用「仅创建者可读写」默认规则。C-02 邀请成员时再改安全规则。

---

## 创建房间主流程

```
[创建页] host 填主题 + 选人数
     │
     ▼ 点"创建组局"按钮
[前端] 表单校验
     │  ├─ 主题空 / > 20 字 → toast「请填写 1-20 字主题」return
     │  └─ 人数 < 3 或 > 6   → toast「3-6 人组局」return
     │
     ▼ 校验通过
[前端] 按钮进入 loading（disabled + 转圈，防重复点击）
[前端] wx.cloud.callFunction({
         name: 'createRoom',
         data: { topic, maxMembers }
       })
     │
     ▼ 5 秒超时
[云函数 createRoom]
     │  1. 从 context 拿 hostOpenId（拿不到 → errCode: NO_AUTH）
     │  2. 循环 5 次生成 6 位 roomId：
     │     - 生成 → db.collection('rooms').where({roomId}).count()
     │     - count=0 跳出，count>0 重试
     │  3. 5 次都重复 → errCode: ROOM_ID_COLLISION
     │  4. db.collection('rooms').add({ data: {...} })
     │  5. add 失败 → errCode: DB_ERROR
     │  6. return { ok: true, roomId }
     │
     ▼ 拿到 roomId
[前端] 按钮 loading 解除
[前端] wx.redirectTo('/pages/group/room?roomId=' + roomId)
```

### 失败处理矩阵

| 失败场景 | errCode | 前端表现 | 按钮状态 |
|---|---|---|---|
| 主题空 / 超 20 字 | — | toast「请填写 1-20 字主题」 | 不进 loading |
| 人数越界 | — | toast「3-6 人组局」 | 不进 loading |
| 网络超时（5s 无响应）| — | toast「网络不稳定，重试」 | 恢复可点 |
| openid 拿不到 | NO_AUTH | toast「请重新登录微信」 | 恢复可点 |
| roomId 5 次重复 | ROOM_ID_COLLISION | toast「系统繁忙，重试」 | 恢复可点 |
| 写库失败 | DB_ERROR | toast「创建失败，重试」 | 恢复可点 |
| 房间内页查不到房间 | — | toast「房间不存在」+ 返回首页 | — |

### 加载状态

- 创建按钮：点击后立即 `setData({ creating: true })`，按钮文案「创建中...」+ disabled
- 房间内页 onLoad：`setData({ loading: true })`，查库期间显示骨架屏
- 取消组局：点击后按钮 loading，防重复点击

---

## 取消组局流程

```
[房间内页] 底部"取消组局"文字按钮
     │
     ▼ 点击
[前端] wx.showModal({ title: '取消组局？', content: '成员将收到通知，房间会被关闭' })
     │  ├─ 取消 → 什么都不做
     │  └─ 确认 ↓
     │
     ▼
[前端] wx.cloud.callFunction({ name: 'cancelRoom', data: { roomId } })
     │
     ▼
[云函数 cancelRoom]
     │  1. 拿 context.openid
     │  2. 查 rooms.where({roomId}).get()
     │  3. 查不到 → errCode: ROOM_NOT_FOUND
     │  4. rooms.hostOpenId !== openid → errCode: NOT_HOST
     │  5. rooms.status === 'cancelled' → errCode: ALREADY_CANCELLED
     │  6. 更新 status: 'cancelled', updatedAt: now
     │  7. return { ok: true }
     │
     ▼
[前端] toast「组局已取消」+ wx.navigateBack 回首页
```

**为什么取消组局放 C-01**：host 创建后必然要有"反悔"出口。C-10 临时退出是"成员中途退出"，不是 host 取消整局，是两件事。

---

## 房间内页骨架 UI

```
┌─────────────────────────────────┐
│  ← 同频组局                      │ nav-header（复用现有样式）
├─────────────────────────────────┤
│                                 │
│         A3B7K9                  │ roomId 48rpx 粗体居中
│      （点击复制）                │ wx.setClipboardData
│                                 │
│      「周末探店」                │ 主题 32rpx 粗体
│      3-6 人 · 等待成员加入       │ 人数 + 状态标签（绿点）
│                                 │
│   ┌───┐  ┌───┐  ┌───┐  ┌───┐  │ 成员位（host 实心 + 虚线占位）
│   │ ✓ │  │ ? │  │ ? │  │ ? │  │ host: 绿色 + check-white.svg + "你"
│   │你 │  │   │  │   │  │   │  │ 占位: 灰虚线边 + ? 字符
│   └───┘  └───┘  └───┘  └───┘  │
│                                 │
│      等待朋友加入...            │ Loading 三点动画
│                                 │
│   ┌───────────────────────┐    │
│   │  邀请朋友              │    │ 大按钮（占位 toast）
│   └───────────────────────┘    │
│                                 │
│      取消组局                   │ 灰色文字按钮
│                                 │
└─────────────────────────────────┘
```

### 成员位渲染规则

- 总位数 = `maxMembers`
- 第 1 位（host）：实心绿色圆 + check-white.svg + "你"字
- 其余位：虚线灰边圆 + "?" 字符
- 这是静态展示，C-01 不轮询不更新

### 邀请按钮占位

C-01 点击 `wx.showToast({ title: '邀请功能即将开放', icon: 'none' })`。按钮样式做好，C-02 直接接管。

---

## 包体红线自检

1. **新增图片/音频/字体/插件？** 无。全部复用现有 SVG 图标：
   - 成员位 host ✓ → `check-white.svg` 或 `users-white.svg`
   - 成员位占位 ? → 用 CSS `border: 2rpx dashed` + `?` 字符
   - 返回箭头 → `chevron-left-ink.svg`
   - 邀请按钮 → `users-white.svg`
2. **代码增量估算**：~15-20 KB（2 个页面 × 4 文件 + 2 个云函数）
3. **主包余量**：当前 201.8 KB，红线 1.5 MB，余量 1.3 MB，远超 50 KB 阈值
4. **复用资源**：100% 复用现有 SVG，零新增

---

## 验收标准

### 功能验收

- [ ] host 在创建页填主题 + 选人数，点创建按钮
- [ ] 5 秒内进入房间内页，看到 roomId + 主题 + 等待状态
- [ ] 点 roomId 可复制到剪贴板
- [ ] 点邀请朋友按钮 toast「邀请功能即将开放」
- [ ] 点取消组局 → 二次确认 → 返回首页
- [ ] 重新进房间（用复制后的 roomId 直接打开 room?roomId=xxx）能加载到房间数据
- [ ] 取消组局后，再次进入同一 roomId 显示「房间已取消」或跳回首页

### 失败场景验收

- [ ] 主题空 → toast「请填写 1-20 字主题」
- [ ] 主题 21 字 → toast「请填写 1-20 字主题」
- [ ] 人数越界（前端 picker 应该限制，但绕过也要校验）→ toast
- [ ] 创建按钮 loading 期间不可重复点击
- [ ] 取消组局二次确认弹窗

### 质量验收

- [ ] 微信开发者工具代码质量扫描：主包 / 资源大小全绿
- [ ] `node scripts/check-syntax.js` FAIL=0
- [ ] `node scripts/final-check.js` WXML FAIL=0 / 页面 FAIL=0
- [ ] `node scripts/check-bundle.js --base=origin/Daniel` PR 资源检查通过
- [ ] 真机验证至少一台（iOS 或 Android）

---

## 依赖

- **云开发环境**：用户需在微信开发者工具「云开发」控制台创建环境，把 env id 回填到 `app.js`
- **rooms 集合**：用户需在云开发控制台手动创建 `rooms` 集合（云函数 add 时如果集合不存在会报错）

## 风险

1. **云开发环境未开通**：C-01 实现完无法跑通。**缓解**：spec 里标注为前置条件，跑通前必须确认 env id 已回填
2. **openid 在开发者工具模拟器拿不到**：模拟器有时拿不到 openid，云函数会返回 NO_AUTH。**缓解**：开发者工具开启「不校验合法域名」+ 真机调试
3. **roomId 5 次重复**：6 位字母+数字组合空间 = 36^6 ≈ 21 亿，5 次重复概率极低。**缓解**：失败 toast 提示重试即可
