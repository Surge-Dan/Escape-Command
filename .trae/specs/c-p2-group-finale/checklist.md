# C-P2 验证清单

## 功能完整性
- [ ] C-14 角色分配：剧本生成后每人有角色，角色库按 style 匹配
- [ ] C-15 独立线索：每人有专属线索，steps 轮询分配
- [ ] C-16 公开组局：createRoom 支持 visibility，listPublicRooms 返回公开房间
- [ ] C-17 申请加入：公开房间可申请，防重复，状态限制
- [ ] C-18 发起人审核：房主可通过/拒绝，仅房主可调
- [ ] C-19 评价举报：完成后可评价（1-5 星），可举报，防重复

## 向后兼容
- [ ] createRoom(topic, maxMembers) 旧调用零影响（visibility 默认 private）
- [ ] generateScript 返回结构不变（roles/clues 存 room 上，不破坏现有断言）
- [ ] ROOM_STATUS 无新增状态
- [ ] 旧房间无 joinRequests/reviews/reported 字段时兜底 [] / [] / false

## 数据契约
- [ ] 所有新函数空输入返回 {ok:false, errCode:'INVALID_PARAM'}，不抛异常
- [ ] assignRoles/generateClues 幂等（重复调用覆盖）
- [ ] approveJoin 从 joinRequests 移除并加入 members
- [ ] submitReview 每人一次（ALREADY_REVIEWED）
- [ ] reportRoom 防重复（ALREADY_REPORTED）

## 测试
- [ ] unit +~180 case 全 PASS
- [ ] gherkin +~24 scenario 全 PASS
- [ ] property +~3000 次不变式成立
- [ ] adversarial +~15 向量 0 crash
- [ ] mutation +~15 点全 killed（score 100%）
- [ ] coverage 新函数 ≥ 90% / 行 ≥ 85%
- [ ] qa 契约检查全 PASS
- [ ] run-all.js 11/11 PASS

## 包体
- [ ] check-bundle PR 资源 0 新增
- [ ] 主包 < 1.5MB
- [ ] 零新增图片/音频/字体

## 对抗式审查
- [ ] Round 1 自审：每函数 happy + 3 边界
- [ ] Round 2 攻击者：原型链/类型混淆/极端值/竞态
- [ ] Round 3 QA：coverage gap + mutation 存活
