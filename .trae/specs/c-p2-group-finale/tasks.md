# C-P2 实现任务清单

## Phase 1: 角色分配 + 独立线索（C-14/C-15）
- [ ] 1.1 group-room-store.js 加 ROLE_LIBRARY（3 style × 6 角色）
- [ ] 1.2 实现 buildRoles(members, style) 纯函数 + _internal 导出
- [ ] 1.3 实现 assignRoles(roomId) 房间操作函数
- [ ] 1.4 实现 buildClues(members, steps) 纯函数 + _internal 导出
- [ ] 1.5 实现 generateClues(roomId) 房间操作函数
- [ ] 1.6 generateScript 末尾自动调 assignRoles + generateClues
- [ ] 1.7 module.exports 导出新函数

## Phase 2: 公开组局 + 申请加入（C-16/C-17）
- [ ] 2.1 createRoom 升级第三参 options.visibility（默认 private）
- [ ] 2.2 room 对象加 visibility 字段
- [ ] 2.3 实现 listPublicRooms()
- [ ] 2.4 实现 requestJoin(roomId, nickname)
- [ ] 2.5 room 对象加 joinRequests 字段

## Phase 3: 发起人审核（C-18）
- [ ] 3.1 实现 approveJoin(roomId, requestId)
- [ ] 3.2 实现 rejectJoin(roomId, requestId)
- [ ] 3.3 复用 joinRoom 成员构造逻辑

## Phase 4: 评价和举报（C-19）
- [ ] 4.1 实现 submitReview(roomId, review)
- [ ] 4.2 实现 reportRoom(roomId, reason)
- [ ] 4.3 实现 buildReviewSummary(reviews) 纯函数
- [ ] 4.4 room 对象加 reviews / reported 字段

## Phase 5: room 页接入
- [ ] 5.1 FINISHED 状态展示角色 + 线索
- [ ] 5.2 公开/私密标记
- [ ] 5.3 待审核列表 + 通过/拒绝按钮（房主视角）
- [ ] 5.4 申请加入按钮（非成员视角）
- [ ] 5.5 评价入口 + 评价展示
- [ ] 5.6 举报入口

## Phase 6: 7 层测试
- [ ] 6.1 unit/store.test.js 加 C-14~C-19 测试（+~180 case）
- [ ] 6.2 gherkin/group-flow.feature 加 24 scenario
- [ ] 6.3 property/generator-property.test.js 加不变式（+~3000 次）
- [ ] 6.4 adversarial/generator-attack.test.js 加 15 向量
- [ ] 6.5 mutation/mutation-test.js 加 15 变异点
- [ ] 6.6 coverage/coverage-report.js 覆盖新函数
- [ ] 6.7 qa/check.js 加契约检查
- [ ] 6.8 run-all.js 确认全 PASS

## Phase 7: 验证
- [ ] 7.1 node scripts/check-syntax.js → FAIL=0
- [ ] 7.2 node scripts/check-bundle.js → PR 资源 0 新增
- [ ] 7.3 node tests/run-all.js → 11/11 PASS
- [ ] 7.4 对抗式审查 3 轮
