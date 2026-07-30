# Henry 分支变更说明

> 用于合并到 `dev` 分支。本文档供下一个 Trae AI 或开发者阅读，了解本分支所做的全部改动。

---

## 功能概述

本分支实现了 **破圈骰子** 功能，作为项目的第二类骰子（区别于微逃骰子的城市探索），核心定位是**做一件平时不会做的事**。

### 核心特性

- **100条指令**，覆盖5个类别：街头社死、身份偷窃、随机命运、反向世界、极限忍耐
- 首页**左右滑动切换**骰子（微逃骰子 / 破圈骰子）
- 每日**5次**破圈机会，次日刷新
- 独立的**破圈指令池**，与微逃骰子指令隔离
- **破圈画像**：用户可选填身份/爱好/类型，用于推荐更精准的指令
- **破圈证书**：完成指令后生成搞怪证书，头衔和标语按指令类别匹配

### 使用流程

```
首页滑到破圈骰子 → 摇取指令 → 看到指令标题+贴士
  → 接受 → 查看4步剧本 → 逐步完成 → 拍照记录
  → 保存 → 生成搞怪证书 → 回到首页
```

---

## 文件变更清单

### 新增文件（业务代码）

| 文件 | 说明 |
|------|------|
| `data/breakthrough-commands.js` | 100条破圈指令数据（含content/tip/steps） |
| `assets/icons/breakthrough-dice-purple.svg` | 破圈骰子图标（紫色碎裂风格） |
| `pages/breakthrough-profile/` | 破圈画像页（填写身份/爱好/类型偏好，选填） |
| `pages/bt-certificate/` | 破圈证书页（搞怪头衔+标语展示、分享功能） |

### 变更文件

| 文件 | 变更内容 |
|------|---------|
| `app.js` | 新增 `breakthroughPool` 指令池、`breakthroughReRollCount` 计次、`rollBreakthroughCommand()`/`useBreakthroughReroll()`/`initBreakthroughPool()` 方法、`breakthroughProfile` 存储、`saveProfile()` 保存逻辑 |
| `app.json` | 注册 `pages/breakthrough-profile` 和 `pages/bt-certificate` 页面路径 |
| `utils/constants.js` | 新增 `breakthrough` 类型元数据（颜色、图标、默认步骤模板） |
| `pages/index/index.js` | 新增破圈骰子滑动切换、`rollBreakthroughCommand()`、`breakthroughRemainCount` 状态管理、从证书页返回状态清理 |
| `pages/index/index.wxml` | 新增破圈骰子swiper卡片、骰子切换指示器、破圈剩余次数显示 |
| `pages/index/index.wxss` | 破圈骰子卡片样式（脉冲动画、碎裂图标、紫色主题） |
| `pages/executing/executing.js` | 破圈模式步骤标题（🎬上吧→😅撑住→💪回不去→🎉破圈成功）、破圈模式判断 |
| `pages/executing/executing.wxml` | 破圈模式勇气进度卡、竖向步骤布局（标签+文案+全宽完成按钮） |
| `pages/executing/executing.wxss` | 破圈专属样式（勇气进度、步骤标签、紫色主题） |
| `pages/record/record.js` | 破圈记录保存后跳转证书页（而非地图页） |
| `pages/record/record.wxml` | 破圈记录标识展示 |
| `pages/profile/profile.js` | 添加破圈画像入口跳转 |

### Trae AI 技能文件（可忽略）

`.trae/skills/` 目录下的文件是开发过程中 Trae IDE 自动下载的技能辅助文件，**与业务逻辑无关**，合并时可跳过。

---

## 合并注意事项

1. **先合并 `.trae/skills/`**（或直接忽略）
2. **检查 `app.js` 冲突** — `onLaunch` 中新增了 `initBreakthroughPool()` 调用，`globalData` 新增了 `breakthroughPool`/`breakthroughReRollCount`/`breakthroughProfile` 等字段
3. **检查 `app.json` 冲突** — 新增了两个页面路径
4. **检查 `utils/constants.js` 冲突** — 新增了 `breakthrough` 类型元数据
5. **检查 `pages/index/index.js` 冲突** — 新增了骰子滑动切换、破圈摇取逻辑
6. **检查 `pages/executing/executing.js` 冲突** — 新增了破圈模式步骤
7. **检查 `pages/record/record.js` 冲突** — 保存后跳转逻辑变更

---

## 验证清单

合并后验证以下功能正常：

- [ ] 首页可左右滑动切换微逃骰子和破圈骰子
- [ ] 破圈骰子可摇取指令，显示指令内容+贴士
- [ ] 每日5次，刷新后重置
- [ ] 破圈指令不混入微逃指令池
- [ ] 接受指令后进入执行页，破圈模式显示勇气进度卡
- [ ] 4步剧本逐步完成
- [ ] 完成后跳转破圈证书页，头衔按类别匹配
- [ ] 证书页按钮跳转回首页
- [ ] 微逃骰子原有功能不受影响
