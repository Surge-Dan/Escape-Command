# 出逃指令 v2.0 — 实施计划

> 按 Phase 分阶段执行，每阶段完成后可独立验证。

---

## Phase 1：真实数据 + 指令池 + 模式简化（P0）

### 1.1 真实数据接入

- [ ] `app.js` `fetchWeather()` 接入和风天气免费 API
  - 替换硬编码 `{condition:'sunny', temperature:24}`
  - 缓存30分钟，避免频繁请求
  - 失败时降级为兜底数据
- [ ] `app.js` `scanNearbyPOI()` 接入真实周边搜索
  - 使用 `wx.getLocation` 获取真实坐标
  - 调用腾讯地图周边搜索（或微信内置API）
  - 失败时降级为默认POI
- [ ] `app.js` `checkLocation()` 存储真实位置到 `globalData.location`

### 1.2 指令池扩充

- [ ] `data/commands.js` 扩充到 50+ 条指令
  - 每种类型至少8条
  - 新增字段：`difficulty`, `energy`, `social`, `steps`
  - 每条指令有 `title`（标题）和 `content`（详细内容）
  - 每条指令配 `tip`（小贴士）
- [ ] `app.js` `getFallbackCommands()` 保留6条兜底，作为API失败时的后备

### 1.3 模式简化

- [ ] 首页模式从6个减少到3个：智能匹配、微出逃、城市漫游
- [ ] 雨天/深夜逻辑融入智能匹配的 `rollCommand()` 过滤
- [ ] 双人模式暂时隐藏（保留代码，注释掉）
- [ ] `pages/index/index.js` 更新 `modes` 数组
- [ ] `pages/index/index.wxml` 更新 mode-list 渲染

---

## Phase 2：执行页 + 分享卡片 + 记录页优化（P0）

### 2.1 执行页重构

- [ ] `pages/executing/executing.wxml` 新增步骤指示器
  - 4个步骤可视化
  - 已完成 → 打勾 + 绿色
  - 当前步骤 → 高亮 + 动画
  - 待完成 → 灰色
- [ ] 每步配简单插图（先占位，后续替换）
- [ ] "完成出逃"按钮改为大尺寸、全宽、品牌色
- [ ] 计时器改为友好文案："已探索 XX 分钟"
- [ ] 移除放弃按钮中的30秒冷却逻辑（改为直接返回）

### 2.2 分享卡片

- [ ] `pages/record/record.js` 保存后生成分享卡片
  - 使用 `canvas` 绘制卡片
  - 包含：照片、指令标题、日期、天气、心情贴纸
  - 生成临时图片路径
- [ ] 保存成功弹层新增"分享卡片"按钮
- [ ] 支持 `wx.showShareImageMenu` 或保存到相册

### 2.3 记录页优化

- [ ] 拍立得卡片默认显示用户拍的第一张照片
- [ ] 无照片时显示更好的占位图
- [ ] "一句话感受"输入框改为直接内联编辑（非弹窗）
- [ ] 保存按钮增加加载动画

---

## Phase 3：地图改造 + 徽章 + 首页精简（P1）

### 3.1 地图页改造

- [ ] 标记点使用手绘风格图标（6种类型，6种颜色）
  - 需要素材：`pin-color.svg`, `pin-walk.svg`, `pin-sense.svg`, `pin-collect.svg`, `pin-food.svg`, `pin-culture.svg`
- [ ] 底部数据卡改为"探索进度"展示
- [ ] 点击标记弹出小卡片，显示该次出逃的简要信息
- [ ] 地图默认显示用户当前位置为中心

### 3.2 徽章系统

- [ ] 删除 `pages/badge/badge` 旧页面
- [ ] 统一使用 `pages/badges/badges` 新页面
- [ ] 替换徽章图标为SVG（需要素材：9个徽章图标）
- [ ] 徽章解锁时弹出动画（缩放 + 光效）
- [ ] 徽章总数从硬编码20改为动态计算

### 3.3 首页精简

- [ ] 问候+天气+位置合并为一行
- [ ] 摇一摇图标从飞机改为骰子（已有素材）
- [ ] "放弃"按钮改为"关闭"（关闭卡片，不执行abandon）
- [ ] 移除"今日剩余 X 次"中的"分享可 +2"文字（分享功能未实现时误导用户）

---

## Phase 4：偏好学习 + 砍功能（P1）

### 4.1 偏好学习

- [ ] `app.js` 新增 `userPreferences` 字段
  - 记录最近10次完成的心情贴纸
  - 计算偏好权重
- [ ] `rollCommand()` 加入偏好加权逻辑
  - 偏好类型 +20% 概率
  - 非偏好类型正常概率

### 4.2 砍掉不需要的功能

- [ ] 隐藏 `pages/member/member` 页面入口（保留代码）
- [ ] 隐藏双人模式芯片（保留代码）
- [ ] 删除 `pages/create/create`（空页面）
- [ ] 简化 onboarding 为1屏
- [ ] `app.json` 移除不使用的页面路径

---

## 素材清单（已对齐）

| 素材 | 数量 | 用途 | 状态 |
|------|------|------|------|
| 场景插画 `.webp` | 6 | 指令详情+收藏页配图 | 待生成 |
| 徽章图标 `.svg` | 9 | 徽章页面 | 待生成 |
| 地图标记 `.svg` | 6 | 地图页标记点 | 待生成 |
| 执行步骤插图 `.webp` | 4 | 执行页步骤引导 | 待生成 |
| 分享卡片模板 | 1 | 记录分享 | 可先用canvas |

---

## 技术债务清理

- [ ] `app.js` 移除 `vibrateShort()` 和 `vibrateLong()` 包装函数，改用 `wx.vibrateShort()` 直调
- [ ] 统一各页面的 `statusBarHeight`/`capsuleTop` 计算逻辑到 `app.js` 公共方法
- [ ] 移除 `pages/index/index.js` 中未使用的 `menuBtnRight`/`menuBtnWidth` 数据字段
- [ ] 统一 `typeNameMap`/`typeColorMap`/`typeIconMap` 到单独的 `utils/constants.js` 文件
- [ ] 移除 `pages/badge` 目录