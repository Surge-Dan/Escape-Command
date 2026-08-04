# Checklist: 主包分包瘦身

## PR 提交前

- [ ] **主包估算**：`node scripts/check-bundle.js --base=origin/dev` 主包 ≤ 1.5 MB
- [ ] **单文件资源**：无单文件 > 200KB（除 `docs/` 下的参考视频）
- [ ] **packOptions.ignore 完整**：`docs/` `tests/` `scripts/` `demo/` `.trae/` `.vscode/` `*.mp4/mp3/wav` `project.private.config.json`
- [ ] **7 层测试通过**：`node tests/run-all.js` → 23 套件 PASS
- [ ] **变异测试**：100% Mutation Score
- [ ] **覆盖率报告**：PASS
- [ ] **QA 质量检查**：PASS
- [ ] **包体检查**：PR 资源无新增/修改（`check-bundle.js --base`）

## 跨包跳转验证

- [ ] **启动页**（主包 index）→ 破圈骰子卡片：同包 OK
- [ ] **启动页**（主包 index）→ 同频骰子入口：同包 OK
- [ ] **启动页**（主包 index）→ 微逃 → generating：同包 OK
- [ ] **同频分组**（分组 home）→ 创建房间：跨包 OK
- [ ] **同频分组**（分组 home）→ 任务大厅：跨包 OK
- [ ] **破圈骰子**（分组）→ 画像：跨包 OK
- [ ] **破圈骰子**（分组）→ 证书：跨包 OK
- [ ] **tabBar 4 page**：index/map/profile 都在主包，OK
- [ ] **custom-tab-bar**：在主包 OK
- [ ] **分包的 wx.loadSubpackage 异步加载**：不阻塞主流程

## 性能验证

- [ ] **首屏冷启动**：≤ 2.5s
- [ ] **首页→破圈骰子摇取**：≤ 500ms（首次需 `loadSubpackage`）
- [ ] **首页→同频骰子入口**：≤ 300ms（首次需 `loadSubpackage`）
- [ ] **分包预加载**：`preloadRule` 配置后体验

## 兼容性

- [ ] 微信基础库 2.33.0（项目当前 libVersion）
- [ ] iOS / Android 模拟器均能加载分包
- [ ] 体验版/正式版审核通过
- [ ] 老用户 localStorage 数据无丢失

## Lessons Learned 同步

- [ ] 更新 `project_memory.md` 记录分包架构决策
- [ ] 更新 `check-bundle.js` 文档（已在本 PR 完成）
- [ ] 写一份 `docs/ARCHITECTURE.md` 记录分包结构和跨包 require 规则
