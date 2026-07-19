# 出逃指令 · AI 配图方案与接口接入

> **日期**: 2026-07-11
> **目标**: 把 6 张固定场景插画（`*.webp`）改为运行时调用微信小程序 AI 接口动态生成
> **关联文档**: `docs/ICON-PROMPTS.md`、`docs/ASSETS-INVENTORY.md`

---

## 一、改造范围与策略

### 1.1 配图分类决策

| 配图类型 | 数量 | 处理方式 | 原因 |
|----------|------|----------|------|
| **场景插画（L 类）** | 6 | ✅ 改为 AI 生成 | 每条指令内容不同，场景插画应与指令标题/内容/天气联动，差异化体验 |
| **默认头像（avatar）** | 1 | ⚪ 固定 | 用户可自定义上传，默认头像只需一个 |
| **纸张纹理（paper-texture）** | 1 | ⚪ 固定 | 纯背景纹理，无需差异化 |
| **收藏空状态大图** | 1 | ⚪ 固定 | 空状态固定提示图，不需要差异化 |
| **SVG 图标（67 个）** | 67 | ⚪ 固定 | 由设计师按 ICON-PROMPTS.md 一次性生成替换 |

### 1.2 生成策略：按需生成 + 本地缓存

```
用户进入指令详情卡
  ↓
检查本地缓存（key = cmd.id + '-' + cmd.version）
  ↓
  ├─ 有缓存 → 直接用缓存的图片路径
  └─ 无缓存 →
        ├─ 先显示「类型色渐变底 + 类型图标」占位（不阻塞 UI）
        └─ 后台调用 AI 接口生成
              ↓
              ├─ 成功 → 下载到本地，写缓存，下次秒开
              └─ 失败 → 保持占位图（不影响功能）
```

### 1.3 Prompt 动态拼装策略

每条指令生成场景插画时，prompt 由以下部分拼装：

```
[基础风格底] + [类型场景底] + [指令特化描述] + [天气/时间修饰] + [统一收尾]
```

例如指令「找一个蓝色的门」：

```
Warm hand-drawn illustration of finding a blue colored door on an old city street,
warm afternoon sunlight, blue tones with orange accents, paper texture, soft brush
strokes, cozy and healing atmosphere, rich details, editorial quality, no text, no
UI elements, hand-crafted feel, 3:2 aspect ratio
```

---

## 二、接口设计

### 2.1 微信小程序 AI 接口封装

新建文件 [utils/ai-image.js](file:///d:/TRAEWork/Projects/出逃指令/escape-command/utils/ai-image.js) 封装 AI 图像生成能力。

**接口参数（待用户填写）**：

```js
// utils/ai-image.js
const AI_IMAGE_CONFIG = {
  // ===== 待用户填写的参数 =====
  apiUrl: '',              // AI 服务接口地址（例如微信云函数 URL 或第三方 API）
  apiKey: '',              // API Key（如果有）
  model: '',               // 模型名（例如 'flux-1.1-pro' / 'dall-e-3' / 'midjourney-api'）
  // ===== 通用参数 =====
  defaultSize: '768x512',  // 3:2 横版
  defaultQuality: 85,      // WebP 压缩质量
  timeout: 30000,          // 单次生成超时 30s
  enableCache: true        // 本地缓存开关
}
```

### 2.2 核心方法签名

```js
// 生成场景插画（按指令）
aiImage.generateSceneForCommand(cmd) → Promise<{tempFilePath, cached}>

// 通用文生图
aiImage.generateImage({ prompt, size, negativePrompt }) → Promise<tempFilePath>

// 清理过期缓存
aiImage.clearExpiredCache(maxAgeMs) → Promise<number>
```

### 2.3 缓存策略

- **缓存 key**: `ai-img-${cmd.id}-${cmd.version || 'v1'}`
- **存储位置**: `wx.getFileSystemManager().saveFile()` 保存到本地永久目录
- **过期策略**: 30 天内未访问的清理（在 `app.js` onLaunch 触发）
- **缓存上限**: 50 张（超过时按 LRU 清理）

---

## 三、代码改造清单

### 3.1 新增文件

| 文件 | 用途 |
|------|------|
| `utils/ai-image.js` | AI 图像生成封装（接口调用 + 缓存 + 降级） |
| `utils/ai-prompt.js` | Prompt 动态拼装（按 cmd 字段生成场景插画 prompt） |

### 3.2 修改文件

| 文件 | 改动 |
|------|------|
| `utils/constants.js` | TYPE_META.scene 保留作为兜底占位图（当 AI 生成失败时用） |
| `pages/command-detail/command-detail.js` | onLoad 时异步调用 ai-image 生成场景插画 |
| `pages/command-detail/command-detail.wxml` | 场景插画加 loading 态（淡入动画） |
| `pages/command-detail/command-detail.wxss` | 加 `.scene-loading` / `.scene-fade-in` 样式 |
| `app.js` | onLaunch 时清理过期 AI 缓存；读取 AI 配置参数 |
| `app.json` | 无需改动 |

### 3.3 数据流

```
[command-detail.onLoad]
  ├─ 1. 同步 setData(command, sceneUrl=TYPE_META.scene 占位)
  ├─ 2. 异步 aiImage.generateSceneForCommand(cmd)
  │     ├─ 拼 prompt（ai-prompt.js）
  │     ├─ 查本地缓存
  │     │   ├─ 命中 → 返回 cachedPath
  │     │   └─ 未命中 → 调用 AI 接口
  │     │         ├─ 成功 → 下载到本地 → 写缓存 → 返回 path
  │     │         └─ 失败 → 返回 null（保持占位）
  │     └─ 返回 {tempFilePath, cached}
  └─ 3. setData({ sceneUrl: tempFilePath, sceneReady: true })
        ↓ UI 触发淡入动画
```

---

## 四、其他可考虑 AI 能力扩展点

除了场景插画，出逃指令小程序还有以下场景可以用 AI 增强。**用户可勾选需要的能力**：

| # | 能力 | 当前状态 | AI 增强方案 | 优先级 |
|---|------|---------|------------|--------|
| 1 | **指令生成** | 固定池 100 条 | 用户输入心情/天气/位置 → AI 生成个性化指令 | ⭐⭐⭐ |
| 2 | **小贴士文案** | 固定 4 条/类型 | AI 根据指令内容 + 天气生成定制贴士 | ⭐⭐ |
| 3 | **出逃感受模板** | 用户手写 | AI 根据照片 + 指令生成感受草稿，用户可改 | ⭐⭐ |
| 4 | **路线规划** | 起终点连线 | AI 推荐沿途有趣的小路/店铺作为途径点 | ⭐ |
| 5 | **每日推荐** | 随机洗牌 | AI 根据用户历史偏好打分排序 | ⭐ |
| 6 | **照片描述** | 无 | 用户拍的照片 → AI 生成一段诗意描述 | ⭐ |
| 7 | **语音陪伴** | 无 | AI 生成一段语音引导（类似冥想 App） | ⭐ |
| 8 | **徽章寄语** | 固定 desc | 解锁徽章时 AI 生成专属寄语 | ⭐ |

---

## 五、实施步骤

### Step 1：填写 AI 配置参数

用户需在 `utils/ai-image.js` 顶部填入以下参数：

```js
const AI_IMAGE_CONFIG = {
  apiUrl: '<待填>',        // AI 服务接口地址
  apiKey: '<待填>',        // API Key
  model: '<待填>',         // 模型名
  defaultSize: '768x512',
  defaultQuality: 85,
  timeout: 30000,
  enableCache: true
}
```

### Step 2：部署代码

```
新增 utils/ai-image.js
新增 utils/ai-prompt.js
修改 pages/command-detail/command-detail.{js,wxml,wxss}
修改 utils/constants.js（添加注释，scene 改为兜底）
修改 app.js（加缓存清理）
```

### Step 3：真机测试

1. 打开任意指令详情 → 看到 loading → 几秒后场景插画淡入
2. 退出再进入同一指令 → 立即显示（缓存命中）
3. 关掉网络进入 → 显示兜底占位图（降级正常）

---

## 六、降级与容错

| 场景 | 处理 |
|------|------|
| AI 接口超时 | 30s 超时，保持占位图 |
| AI 接口返回错误 | 保持占位图，下次进入重试 |
| 网络断开 | 跳过 AI 调用，直接用占位图 |
| 缓存目录满 | 清理最旧缓存后重试 |
| 用户关闭 AI 功能 | `enableCache=false` 且不调用接口，纯占位 |
