# 出逃指令 v2.0 — 视觉素材完整清单

> 版本：3.0
> 日期：2026-07-06
> 用途：交给设计师/AI画图工具生成所有视觉素材，替换现有素材
> 代码路径已全部对齐，替换文件后直接生效

---

## 一、风格总则

### 核心设计理念

> **温暖手绘 × 精致质感 × 颜色丰富 × 风格统一**
>
> 所有图标和配图必须成套设计，从导航栏到图标到配图，视觉语言完全一致。
> 拒绝简单线描、拒绝单色扁平、拒绝AI感的渐变堆砌。
> 追求有温度、有质感、有设计感的精致视觉。

| 项目 | 规范 |
|------|------|
| **图标格式** | SVG（内嵌颜色，非 currentColor） |
| **图标风格** | **彩色面性风**：双色/多色填充，有圆形底容器，有微渐变质感，有高光细节，精致有设计感 |
| **图标容器** | 每个图标统一带 **圆形背景底**（彩色柔和渐变），图标主体居中，风格统一 |
| **图标画布** | 48×48px（徽章为 64×64px），圆形底直径 40px，居中 |
| **配图格式** | WebP，质量 85% |
| **配图风格** | **手绘温暖风**：有纸张质感、手绘笔触纹理、温暖治愈色调、细节丰富、有光影层次 |
| **统一底色** | 暖白底 #F5F3EF |
| **主色** | 薄荷绿 #5CBF9E |
| **中性色** | #2E2F33（墨黑）/ #6B7280（柔灰）/ #A8ADB5（淡灰） |

### SVG 技术要求

```xml
viewBox="0 0 48 48"  <!-- 徽章用 viewBox="0 0 64 64" -->

<!-- 图标结构示例 -->
<!-- 1. 圆形背景底（彩色柔和渐变） -->
<circle cx="24" cy="24" r="20" fill="url(#bg-gradient)"/>
<!-- 2. 图标主体（彩色填充，非纯线描） -->
<path d="..." fill="#5CBF9E"/>
<!-- 3. 高光细节（白色半透明） -->
<path d="..." fill="white" opacity="0.3"/>
```

**关键要求：**
- 每个SVG内嵌 `<defs>` 定义渐变（`<linearGradient>` / `<radialGradient>`）
- 圆形底使用柔和的双色渐变（如薄荷绿→浅薄荷绿）
- 图标主体使用 **面性填充**（fill），不是纯描边（stroke）
- 适当添加白色半透明高光，增加立体感和质感
- 线条粗细 2px，圆角端点（round cap/join）
- 所有图标圆形底风格完全一致，仅底色和图标内容不同
- 颜色丰富但色调统一，不超过3种主色

### 配图统一风格提示词（给 AI 画图工具）

> warm hand-drawn illustration, rich details, paper texture, soft brush strokes, cozy and healing atmosphere, warm color palette with multiple tones, gentle lighting and shadows, layered composition, editorial quality, no text, no UI elements, hand-crafted feel, avoiding AI-synthetic aesthetics, no neon glow, no geometric perfection, warm and inviting mood

### 色彩系统

**图标圆形底渐变配色（按功能分组）：**

| 分组 | 渐变色对 | 用途 |
|------|----------|------|
| 品牌主色 | #5CBF9E → #A8E6CF | 核心功能、品牌相关 |
| 暖橙 | #FFB87A → #FFE0C7 | 收藏、编辑、记录 |
| 天蓝 | #7EC8F5 → #C7E7FF | 定位、地图、天气 |
| 柠檬黄 | #FFD93D → #FFF4C7 | 滤镜、心情、会员 |
| 薰衣草紫 | #B8A4E0 → #E8DEF8 | 感官、治愈 |
| 珊瑚粉 | #FF9AAA → #FFD0D8 | 心情、社交 |
| 深灰墨 | #4A5568 → #A0AEC0 | 导航、关闭、辅助操作 |

---

## 二、总览

| 类别 | 数量 | 格式 | 用途 |
|------|------|------|------|
| A. TabBar 图标 | 6 | SVG | 底部导航栏 |
| B. 导航与操作图标 | 18 | SVG | 全局导航、按钮、操作 |
| C. 6 种类型图标 | 6 | SVG | 类型标签、详情卡 |
| D. 模式芯片图标 | 5 | SVG | 首页模式选择 |
| E. 滤镜图标 | 3 | SVG | 保存记录页 |
| F. 心情贴纸图标 | 5 | SVG | 保存记录页 |
| G. 徽章图标 | 9 | SVG | 徽章墙 |
| H. 地图标记图标 | 6 | SVG | 地图 POI 标记 |
| I. 执行步骤图标 | 4 | SVG | 执行页步骤引导 |
| J. 会员页图标 | 3 | SVG | 会员权益 |
| K. 空状态图标 | 2 | SVG | 空状态占位 |
| L. 场景插画 | 6 | WebP | 指令详情卡大图 |
| M. 其他配图 | 3 | WebP | 头像、背景纹理、空状态 |
| **合计** | **76** | — | — |

---

## A. TabBar 图标（6张 SVG）⭐ 高优先级

> **位置：** `/assets/icons/`
> **画布：** 48×48px
> **风格：** 彩色面性风，圆形底容器，双色渐变，有高光质感
> **引用文件：** `custom-tab-bar/index.js`

| 序号 | 文件名 | 内容描述 | 默认态圆形底 | 选中态圆形底 | 图标主色 |
|------|--------|----------|-------------|-------------|---------|
| A1 | `tab-escape.svg` | 半开的门，门缝有光透出 | 灰渐变 #E2E5EA→#F0F2F5 | 薄荷渐变 #5CBF9E→#A8E6CF | 白色填充 |
| A2 | `tab-escape-active.svg` | 同上，选中态 | — | 薄荷渐变 #5CBF9E→#A8E6CF | 白色填充 |
| A3 | `tab-map.svg` | 水滴形地图标记+内部小圆 | 灰渐变 #E2E5EA→#F0F2F5 | 薄荷渐变 #5CBF9E→#A8E6CF | 白色填充 |
| A4 | `tab-map-active.svg` | 同上，选中态 | — | 薄荷渐变 #5CBF9E→#A8E6CF | 白色填充 |
| A5 | `tab-profile.svg` | 人形剪影，圆头+肩膀 | 灰渐变 #E2E5EA→#F0F2F5 | 薄荷渐变 #5CBF9E→#A8E6CF | 白色填充 |
| A6 | `tab-profile-active.svg` | 同上，选中态 | — | 薄荷渐变 #5CBF9E→#A8E6CF | 白色填充 |

**设计要点：**
- 默认态：灰色圆形底 + 白色图标，低饱和度
- 选中态：薄荷绿圆形底 + 白色图标，有微渐变和高光
- 选中态圆形底略大或加阴影，增强选中感
- 门/标记/人形用面性填充，不要纯线条
- 所有6个图标视觉风格完全一致

---

## B. 导航与操作图标（18张 SVG）⭐ 高优先级

> **位置：** `/assets/icons/`
> **画布：** 48×48px
> **风格：** 彩色面性风，圆形底容器
> **引用文件：** 各页面 wxml

| 序号 | 文件名 | 用途 | 图形描述 | 圆形底渐变 | 图标主色 |
|------|--------|------|----------|-----------|---------|
| B1 | `chevron-left-ink.svg` | 返回按钮 | 左箭头（粗） | 深灰 #4A5568→#A0AEC0 | 白色 |
| B2 | `chevron-right-faint.svg` | 列表箭头 | 右箭头 | 浅灰 #E2E5EA→#F0F2F5 | 灰色 #A8ADB5 |
| B3 | `check-white.svg` | 完成/确认 | 对勾 | 薄荷 #5CBF9E→#A8E6CF | 白色 |
| B4 | `x-ink-faint.svg` | 关闭/删除 | X叉 | 浅灰 #E2E5EA→#F0F2F5 | 灰色 #A8ADB5 |
| B5 | `refresh-cw-ink-soft.svg` | 刷新/重摇 | 循环箭头 | 天蓝 #7EC8F5→#C7E7FF | 白色 |
| B6 | `more-horizontal-ink.svg` | 更多菜单 | 三个横点 | 深灰 #4A5568→#A0AEC0 | 白色 |
| B7 | `target-ink.svg` | 设置入口 | 同心圆准心 | 深灰 #4A5568→#A0AEC0 | 白色 |
| B8 | `settings-brand.svg` | 设置页 | 齿轮 | 薄荷 #5CBF9E→#A8E6CF | 白色 |
| B9 | `pencil-brand.svg` | 编辑代号 | 铅笔 | 暖橙 #FFB87A→#FFE0C7 | 白色 |
| B10 | `camera-ink-soft.svg` | 拍照 | 相机 | 暖橙 #FFB87A→#FFE0C7 | 白色 |
| B11 | `navigation-brand.svg` | 定位 | 指北箭头 | 天蓝 #7EC8F5→#C7E7FF | 白色 |
| B12 | `map-brand.svg` | 地图标题 | 折叠地图 | 薄荷 #5CBF9E→#A8E6CF | 白色 |
| B13 | `map-pin-brand.svg` | 位置标记 | 水滴定位针 | 薄荷 #5CBF9E→#A8E6CF | 白色 |
| B14 | `clock-brand.svg` | 时长 | 手绘时钟 | 薄荷 #5CBF9E→#A8E6CF | 白色 |
| B15 | `user-brand.svg` | 人数 | 人形剪影 | 薄荷 #5CBF9E→#A8E6CF | 白色 |
| B16 | `bookmark.svg` | 未收藏 | 书签轮廓 | 浅灰 #E2E5EA→#F0F2F5 | 灰色 #A8ADB5 |
| B17 | `bookmark-brand.svg` | 已收藏 | 书签实心 | 暖橙 #FFB87A→#FFE0C7 | 白色 |
| B18 | `lock-coral.svg` | 未解锁锁 | 挂锁 | 珊瑚粉 #FF9AAA→#FFD0D8 | 白色 |

**设计要点：**
- 每个图标都有圆形底容器，风格统一
- 功能相关图标使用相同色系（如所有品牌色操作用薄荷绿底）
- 图标主体用面性填充，加白色半透明高光增加立体感
- 箭头/对勾等使用粗线条（3px）面性表达

---

## C. 6 种类型图标（6张 SVG）⭐ 高优先级

> **位置：** `/assets/icons/`
> **画布：** 48×48px
> **风格：** 彩色面性风，圆形底容器，每个类型有独特的渐变色
> **引用文件：** `utils/constants.js`（TYPE_META.icon）

| 序号 | 文件名 | 类型 | 图形描述 | 圆形底渐变 | 图标主色 |
|------|--------|------|----------|-----------|---------|
| C1 | `droplet.svg` | 颜色探索 | 调色板+水滴 | 天蓝 #7EC8F5→#C7E7FF | 白色+蓝色点缀 |
| C2 | `footprints-coral.svg` | 漫步发现 | 脚印 | 珊瑚 #FF9AAA→#FFD0D8 | 白色 |
| C3 | `sparkles.svg` | 感官体验 | 星光闪烁 | 薰衣草 #B8A4E0→#E8DEF8 | 白色+黄色星 |
| C4 | `coffee.svg` | 美食探索 | 咖啡杯+蒸汽 | 暖橙 #FFB87A→#FFE0C7 | 白色+棕色杯 |
| C5 | `compass-brand.svg` | 如实文化 | 指南针 | 薄荷 #5CBF9E→#A8E6CF | 白色 |
| C6 | `bookmark.svg` | 收藏拼贴 | 书签 | 柠檬黄 #FFD93D→#FFF4C7 | 白色 |

**设计要点：**
- 每个类型图标使用专属的渐变色圆形底，与类型色一致
- 图标主体可以有2-3种颜色（如咖啡杯：白色杯+棕色液体+白色蒸汽）
- 增加高光和阴影细节，提升精致感
- 所有6个图标视觉风格完全一致，仅颜色和内容不同

---

## D. 模式芯片图标（5张 SVG）⭐ 中优先级

> **位置：** `/assets/icons/`
> **画布：** 48×48px
> **风格：** 彩色面性风，圆形底容器
> **引用文件：** `utils/constants.js`（MODE_LIST）

| 序号 | 文件名 | 模式 | 图形描述 | 圆形底渐变 | 图标主色 |
|------|--------|------|----------|-----------|---------|
| D1 | `dice-5-brand-strong.svg` | 智能匹配-默认 | 骰子点5 | 薄荷 #5CBF9E→#A8E6CF | 白色 |
| D2 | `dice-5-white.svg` | 智能匹配-选中 | 同上 | 透明 | 薄荷 #5CBF9E |
| D3 | `sprout-brand-strong.svg` | 微出逃-默认 | 嫩芽 | 薄荷 #5CBF9E→#A8E6CF | 白色 |
| D4 | `sprout-white.svg` | 微出逃-选中 | 同上 | 透明 | 薄荷 #5CBF9E |
| D5 | `footprints-white.svg` | 漫步-选中 | 脚印 | 透明 | 薄荷 #5CBF9E |

**设计要点：**
- 默认态（strong）：有圆形底渐变 + 白色图标
- 选中态（white）：透明底 + 品牌色图标（因为在绿色芯片内）
- 骰子要画出点数细节，嫩芽要有两片叶子，脚印要画两只

---

## E. 滤镜图标（3张 SVG）⭐ 中优先级

> **位置：** `/assets/icons/`
> **画布：** 48×48px
> **风格：** 彩色面性风，圆形底容器
> **引用文件：** `utils/constants.js`（FILTER_LIST）

| 序号 | 文件名 | 滤镜 | 图形描述 | 圆形底渐变 | 图标主色 |
|------|--------|------|----------|-----------|---------|
| E1 | `sun-lemon-fg.svg` | 日光 | 太阳+光线 | 柠檬黄 #FFD93D→#FFF4C7 | 白色+橙色光 |
| E2 | `cloud-rain-sky-fg.svg` | 阴雨天 | 云+雨滴 | 天蓝 #7EC8F5→#C7E7FF | 白色云+蓝色雨 |
| E3 | `zap-coral.svg` | 闪光灯 | 闪电 | 珊瑚 #FF9AAA→#FFD0D8 | 白色+黄色光 |

**设计要点：**
- 太阳要有光芒线细节
- 云要有层次（深浅两色）
- 闪电要有发光感（黄色高光）

---

## F. 心情贴纸图标（5张 SVG）⭐ 中优先级

> **位置：** `/assets/icons/`
> **画布：** 48×48px
> **风格：** 彩色面性风，圆形底容器，每个心情有独特颜色
> **引用文件：** `utils/constants.js`（MOOD_LIST）

| 序号 | 文件名 | 心情 | 图形描述 | 圆形底渐变 | 图标主色 |
|------|--------|------|----------|-----------|---------|
| F1 | `smile-lemon.svg` | 开心 | 笑脸（弯眼+大笑嘴） | 柠檬黄 #FFD93D→#FFF4C7 | 白色 |
| F2 | `meh-brand.svg` | 平静 | 平淡脸（一线嘴） | 薄荷 #5CBF9E→#A8E6CF | 白色 |
| F3 | `sparkles-coral.svg` | 惊喜 | 闪光+圆眼 | 珊瑚 #FF9AAA→#FFD0D8 | 白色+黄色星 |
| F4 | `heart-lavender.svg` | 治愈 | 心形 | 薰衣草 #B8A4E0→#E8DEF8 | 白色 |
| F5 | `laugh-sky.svg` | 好玩 | 大笑脸（眯眼+大笑） | 天蓝 #7EC8F5→#C7E7FF | 白色 |

**设计要点：**
- 笑脸表情要精致，有腮红（粉色小圆点）
- 心形要有高光（左上角白色弧形）
- 闪光要有多个星角，大小不一

---

## G. 徽章图标（9张 SVG）⭐ 高优先级

> **位置：** `/assets/icons/`
> **画布：** 64×64px
> **风格：** 精致面性风，有丰富细节、高光、渐变质感
> **颜色：** 内嵌颜色，不用 currentColor
> **引用文件：** `utils/constants.js`（BADGE_LIST）

### 通用设计要求

- 徽章为 64×64px，圆形底直径 56px
- 圆形底使用 **双色径向渐变**（`<radialGradient>`），模拟光泽质感
- 圆形底边缘有 **2px 白色描边**，增加精致感
- 圆形底右上角有 **白色高光弧**（opacity 0.4），模拟3D球体光泽
- 图标主体居中，使用白色填充 + 局部点缀色
- 整体要有 **奖牌/勋章质感**，不是简单平面图标

### G1. 初次出逃 — `badge-first-escape.svg`

**图标内容：** 一颗五角星，星角不对称（手绘感），星星中心有小圆点
**圆形底渐变：** `radial-gradient(circle at 30% 30%, #FFE4B5, #FFD700)`
**图标主色：** #FFFFFF 白色 + #D4A017 金色描边
**设计要点：** 星星要有立体感，中心高光，边缘略暗

---

### G2. 七连胜 — `badge-seven-streak.svg`

**图标内容：** 数字"7"手写体 + 下方两片月桂叶
**圆形底渐变：** `radial-gradient(circle at 30% 30%, #C9E8E3, #5CBF9E)`
**图标主色：** #FFFFFF 白色
**设计要点：** 数字7要粗壮有力，月桂叶用弧线表示

---

### G3. 月度漫游家 — `badge-thirty-streak.svg`

**图标内容：** 月桂花环（两片叶子围绕的弧形），中间空心
**圆形底渐变：** `radial-gradient(circle at 30% 30%, #E8D5F5, #9B7BB8)`
**图标主色：** #FFFFFF 白色
**设计要点：** 花环不对称，叶子有叶脉细节

---

### G4. 蓝色猎人 — `badge-color-hunter.svg`

**图标内容：** 一只眼睛，眼球是蓝色圆点，有睫毛
**圆形底渐变：** `radial-gradient(circle at 30% 30%, #D4E8FF, #5B8FB9)`
**图标主色：** #FFFFFF 白色眼 + #5B8FB9 蓝色瞳孔
**设计要点：** 眼睛要精致，有上下睫毛，瞳孔有高光

---

### G5. 夜行者 — `badge-night-walker.svg`

**图标内容：** 一弯月牙 + 旁边一颗小星星
**圆形底渐变：** `radial-gradient(circle at 30% 30%, #E2E4F0, #6B7280)`
**图标主色：** #FFFFFF 白色 + #FFD93D 黄色星
**设计要点：** 月牙要有弧度变化，小星星在右上方

---

### G6. 雨天漫步者 — `badge-rainy-walker.svg`

**图标内容：** 撑开的雨伞 + 下方3滴雨
**圆形底渐变：** `radial-gradient(circle at 30% 30%, #D4EDFF, #7EC8F5)`
**图标主色：** #FFFFFF 白色伞 + #7EC8F5 蓝色雨
**设计要点：** 伞面有弧度细节，伞柄有弯曲，雨滴是水滴形

---

### G7. 菜市场熟客 — `badge-market-regular.svg`

**图标内容：** 菜篮子 + 胡萝卜 + 叶子
**圆形底渐变：** `radial-gradient(circle at 30% 30%, #FFE8D6, #D98A5C)`
**图标主色：** #FFFFFF 白色篮 + #D98A5C 橙色胡萝卜 + #5CBF9E 绿色叶
**设计要点：** 篮子有编织纹理，胡萝卜有纹理线

---

### G8. 城市侦探 — `badge-city-detective.svg`

**图标内容：** 放大镜 + 镜片内小房子
**圆形底渐变：** `radal-gradient(circle at 30% 30%, #FFF0D4, #C9B037)`
**图标主色：** #FFFFFF 白色框 + #C9B037 金色镜片
**设计要点：** 放大镜手柄有角度，镜片内小房子简化为2-3个形状

---

### G9. 出逃会员 — `badge-member-pro.svg`

**图标内容：** 皇冠（三尖角，中间最高）+ 顶部小宝石
**圆形底渐变：** `radial-gradient(circle at 30% 30%, #3A3D45, #1A1B1E)`
**图标主色：** #C9B037 金色皇冠 + #FFD93D 黄色宝石
**设计要点：** 皇冠有3个尖角，每个尖角顶部有小圆点，中间尖角有宝石

---

## H. 地图标记图标（6张 SVG）⭐ 中优先级

> **位置：** `/assets/icons/`
> **画布：** 48×48px
> **风格：** 彩色面性风，水滴形外框 + 内部类型图标
> **颜色：** 内嵌颜色
> **引用文件：** `utils/constants.js`（TYPE_META.pin）

| 序号 | 文件名 | 类型 | 内部图标 | 水滴色 | 内部图标色 |
|------|--------|------|----------|--------|-----------|
| H1 | `pin-color.svg` | 颜色探索 | 调色板 | #5B8FB9 | 白色 |
| H2 | `pin-walk.svg` | 漫步发现 | 脚印 | #D98A5C | 白色 |
| H3 | `pin-sense.svg` | 感官体验 | 音符 | #9B7BB8 | 白色 |
| H4 | `pin-collect.svg` | 收藏拼贴 | 书签 | #C9B037 | 白色 |
| H5 | `pin-food.svg` | 美食探索 | 咖啡杯 | #A67C52 | 白色 |
| H6 | `pin-culture.svg` | 如实文化 | 建筑 | #5CBF9E | 白色 |

**设计要点：**
- 水滴形外框统一，仅内部图标和颜色不同
- 水滴形有径向渐变（顶部亮→底部暗），增加立体感
- 水滴形顶部有白色高光点
- 尖端朝下，底部圆弧
- 内部图标居中，白色填充

---

## I. 执行步骤图标（4张 SVG）⭐ 中优先级

> **位置：** `/assets/icons/`
> **画布：** 48×48px
> **风格：** 彩色面性风，圆形底容器
> **引用文件：** `pages/executing/executing.js`

| 序号 | 文件名 | 步骤 | 图形描述 | 圆形底渐变 | 图标主色 |
|------|--------|------|----------|-----------|---------|
| I1 | `step-leave.svg` | 出发 | 门+箭头向外 | 薄荷 #5CBF9E→#A8E6CF | 白色 |
| I2 | `step-explore.svg` | 探索 | 雷达+扫描线 | 天蓝 #7EC8F5→#C7E7FF | 白色 |
| I3 | `step-discover.svg` | 发现 | 放大镜+星 | 柠檬黄 #FFD93D→#FFF4C7 | 白色+橙色星 |
| I4 | `step-record.svg` | 记录 | 笔记本+笔 | 暖橙 #FFB87A→#FFE0C7 | 白色 |

**设计要点：**
- 每个步骤使用不同色系，区分步骤阶段
- 门要有打开的透视感，箭头要粗壮
- 雷达要有同心圆+扫描线
- 放大镜要有发光感
- 笔记本要有线条细节

---

## J. 会员页图标（3张 SVG）⭐ 低优先级

> **位置：** `/assets/icons/`
> **画布：** 48×48px
> **风格：** 彩色面性风，圆形底容器
> **引用文件：** `pages/member/member.js`

| 序号 | 文件名 | 功能 | 图形描述 | 圆形底渐变 | 图标主色 |
|------|--------|------|----------|-----------|---------|
| J1 | `users-lavender.svg` | 双人出逃 | 两个人形重叠 | 薰衣草 #B8A4E0→#E8DEF8 | 白色 |
| J2 | `award-lemon.svg` | 专属徽章 | 奖牌+丝带 | 柠檬黄 #FFD93D→#FFF4C7 | 白色+金色 |
| J3 | `cloud-rain-sky.svg` | 云端备份 | 云+向下箭头 | 天蓝 #7EC8F5→#C7E7FF | 白色 |

---

## K. 空状态图标（2张 SVG）⭐ 低优先级

> **位置：** `/assets/icons/`
> **画布：** 48×48px
> **风格：** 彩色面性风，但色调偏淡（空状态感）
> **引用文件：** `pages/collection/collection.wxml`、`pages/map/map.wxml`

| 序号 | 文件名 | 用途 | 图形描述 | 圆形底渐变 | 图标主色 |
|------|--------|------|----------|-----------|---------|
| K1 | `empty-collection.svg` | 收藏页空 | 空拍立得框+笔 | 浅灰 #E2E5EA→#F0F2F5 | 灰色 #A8ADB5 |
| K2 | `empty-map.svg` | 地图页空 | 空地图+定位针 | 浅蓝 #C7E7FF→#E8F4FF | 灰色 #A8ADB5 |

**设计要点：**
- 空状态图标色调偏淡，不抢眼
- 拍立得框要画出边框细节，旁边有支笔
- 地图要画出折叠纹理，定位针在右上方

---

## L. 场景插画（6张 WebP）⭐ 高优先级

> **位置：** `/assets/images/`
> **格式：** `.webp`，质量 85%
> **尺寸：** 750×400px（3:2 横版）
> **风格：** 手绘温暖风，有纸张质感、笔触纹理、丰富细节、温暖治愈色调
> **引用文件：** `utils/constants.js`（TYPE_META.scene）

### L1. 颜色探索 — `color-scene.webp`

**场景：** 一个人站在街角，抬头看建筑外墙上的彩色涂鸦。阳光从侧面照过来，在墙上投下斑驳的光影。涂鸦以蓝色系为主，但混有橙色和黄色的点缀。
**类型色：** #5B8FB9 天空蓝
**情绪：** 好奇、发现、明亮
**色调：** 偏暖的蓝，不要冷蓝

**参考提示词：**
> Warm hand-drawn illustration of a person standing at a street corner looking up at a colorful mural on a building wall, warm afternoon sunlight casting dappled shadows, blue tones dominant with orange and yellow accents, paper texture, soft brush strokes, cozy and healing atmosphere, rich details, layered composition, editorial quality, no text, no UI elements, hand-crafted feel, warm and inviting mood, 3:2 aspect ratio

---

### L2. 漫步发现 — `walk-scene.webp`

**场景：** 一条安静的街道，两旁是梧桐树，一个人正沿着街道散步。远处有老房子的轮廓和一个小小的路口。阳光透过树叶洒在地上。
**类型色：** #D98A5C 珊瑚橙
**情绪：** 悠闲、探索、温暖

**参考提示词：**
> Warm hand-drawn illustration of a quiet tree-lined street with sycamore trees, a person walking leisurely in the distance, old buildings on both sides, warm afternoon light filtering through leaves creating dappled shadows on the ground, paper texture, soft brush strokes, cozy atmosphere, rich details, warm orange and earth tones, layered composition, hand-crafted feel, 3:2 aspect ratio, editorial illustration quality

---

### L3. 感官体验 — `sense-scene.webp`

**场景：** 一个人坐在公园长椅上，闭着眼睛，微风吹过，树叶在飘动。旁边有一杯咖啡放在长椅上。画面安静、放松。
**类型色：** #9B7BB8 薰衣草紫
**情绪：** 安静、正念、放松
**注意：** 不要画成瑜伽/冥想的样子，保持日常感

**参考提示词：**
> Warm hand-drawn illustration of a person sitting on a park bench with eyes closed, gentle breeze blowing through leaves, a cup of coffee resting on the bench beside them, peaceful and relaxing atmosphere, paper texture, soft brush strokes, cozy and healing mood, rich details, soft lavender and green tones, warm light, layered composition, hand-crafted feel, 3:2 aspect ratio, editorial illustration quality

---

### L4. 收藏拼贴 — `collect-scene.webp`

**场景：** 一张木桌上散落着旅行纪念品——拍立得照片、干花、票根、手写便签、一片枫叶。从上方俯拍的视角，像一本打开的手账。
**类型色：** #C9B037 复古金
**情绪：** 怀旧、收集、温暖
**注意：** 俯拍视角，自然散落，不要摆得太整齐

**参考提示词：**
> Warm hand-drawn illustration of a wooden table top with scattered travel mementos — polaroid photos, dried flowers, ticket stubs, handwritten notes, a maple leaf, viewed from above like an open journal, paper texture, soft brush strokes, cozy and nostalgic atmosphere, rich details, warm golden tones, layered composition, hand-crafted feel, 3:2 aspect ratio, editorial illustration quality

---

### L5. 美食探索 — `food-scene.webp`

**场景：** 街角的一家小面馆或面包店，暖黄的灯光从窗户透出来，门口有一个人正推门进去。蒸汽从门口飘出，街道上有傍晚的暖光。
**类型色：** #A67C52 焦糖棕
**情绪：** 温暖、烟火气、治愈
**注意：** 不要画成连锁店/快餐店，要有社区小店的质感

**参考提示词：**
> Warm hand-drawn illustration of a small neighborhood bakery at street corner, warm yellow light glowing from the window, steam rising from the entrance, a person about to enter, evening golden light, paper texture, soft brush strokes, cozy and inviting atmosphere, rich details, warm brown and amber tones, layered composition, hand-crafted feel, community neighborhood feel, 3:2 aspect ratio, editorial illustration quality

---

### L6. 如实文化 — `culture-scene.webp`

**场景：** 一条老城区的街道，有骑楼建筑、老书店的橱窗、街头艺人正在表演。阳光从骑楼的廊柱间穿过，形成有节奏的光影。
**类型色：** #5CBF9E 薄荷绿
**情绪：** 在地、文化、有故事
**注意：** 要有在地感，不能画成欧洲街景，可以融入岭南/江南元素

**参考提示词：**
> Warm hand-drawn illustration of an old city street with traditional Chinese arcade architecture (qilou), a vintage bookstore window display, a street performer nearby, sunlight filtering through colonnade pillars creating rhythmic shadows, paper texture, soft brush strokes, cozy and cultural atmosphere, rich details, warm green and earth tones, layered composition, hand-crafted feel, Chinese old town atmosphere, 3:2 aspect ratio, editorial illustration quality

---

## M. 其他配图（3张 WebP）⭐ 低优先级

> **位置：** `/assets/images/`

### M1. 默认头像 — `avatar.webp`

**尺寸：** 200×200px（正方形）
**用途：** 个人页默认头像
**描述：** 手绘风人物侧脸剪影，暖色调，有纸张质感和笔触纹理

**参考提示词：**
> Warm hand-drawn illustration of a person's profile silhouette, warm tones, paper texture, soft brush strokes, cozy and healing atmosphere, simple but detailed, square format, editorial illustration quality, hand-crafted feel

---

### M2. 纸张纹理 — `paper-texture.webp`

**尺寸：** 200×200px（可平铺）
**用途：** 全局背景纹理，叠加在 `#F5F3EF` 背景色上
**描述：** 极淡的纸张纤维纹理，几乎不可见，但有微妙的质感

**设计要点：**
- 非常淡，透明度约 5-8%
- 纸张纤维纹理，不是噪点
- 可平铺（tileable）
- 颜色：暖白色，与 `#F5F3EF` 背景协调

**参考提示词：**
> Very subtle paper fiber texture, warm white, almost invisible, seamless tileable, 200x200px, watercolor paper texture, extremely faint, 5% opacity feel

---

### M3. 收藏空状态（可选） — `empty-collection.webp`

**尺寸：** 300×300px（正方形）
**用途：** 收藏页空状态（当前使用 SVG 替代，可选用 WebP 提升质感）
**描述：** 一个空白的相框或拍立得，旁边有一支笔，等待被填充

**参考提示词：**
> Warm hand-drawn illustration of an empty polaroid frame with a pen beside it on a wooden table, waiting to be filled, paper texture, soft brush strokes, cozy atmosphere, warm tones, simple but detailed composition, square format, editorial illustration quality, quiet anticipation, hand-crafted feel

---

## 交付清单

| 序号 | 文件名 | 类别 | 尺寸 | 格式 | 优先级 |
|------|--------|------|------|------|--------|
| 1 | `tab-escape.svg` | A.TabBar | 48×48 | SVG | 高 |
| 2 | `tab-escape-active.svg` | A.TabBar | 48×48 | SVG | 高 |
| 3 | `tab-map.svg` | A.TabBar | 48×48 | SVG | 高 |
| 4 | `tab-map-active.svg` | A.TabBar | 48×48 | SVG | 高 |
| 5 | `tab-profile.svg` | A.TabBar | 48×48 | SVG | 高 |
| 6 | `tab-profile-active.svg` | A.TabBar | 48×48 | SVG | 高 |
| 7 | `chevron-left-ink.svg` | B.导航操作 | 48×48 | SVG | 高 |
| 8 | `chevron-right-faint.svg` | B.导航操作 | 48×48 | SVG | 高 |
| 9 | `check-white.svg` | B.导航操作 | 48×48 | SVG | 高 |
| 10 | `x-ink-faint.svg` | B.导航操作 | 48×48 | SVG | 高 |
| 11 | `refresh-cw-ink-soft.svg` | B.导航操作 | 48×48 | SVG | 高 |
| 12 | `more-horizontal-ink.svg` | B.导航操作 | 48×48 | SVG | 高 |
| 13 | `target-ink.svg` | B.导航操作 | 48×48 | SVG | 高 |
| 14 | `settings-brand.svg` | B.导航操作 | 48×48 | SVG | 高 |
| 15 | `pencil-brand.svg` | B.导航操作 | 48×48 | SVG | 高 |
| 16 | `camera-ink-soft.svg` | B.导航操作 | 48×48 | SVG | 高 |
| 17 | `navigation-brand.svg` | B.导航操作 | 48×48 | SVG | 高 |
| 18 | `map-brand.svg` | B.导航操作 | 48×48 | SVG | 高 |
| 19 | `map-pin-brand.svg` | B.导航操作 | 48×48 | SVG | 高 |
| 20 | `clock-brand.svg` | B.导航操作 | 48×48 | SVG | 高 |
| 21 | `user-brand.svg` | B.导航操作 | 48×48 | SVG | 高 |
| 22 | `bookmark.svg` | B.导航操作 | 48×48 | SVG | 高 |
| 23 | `bookmark-brand.svg` | B.导航操作 | 48×48 | SVG | 高 |
| 24 | `lock-coral.svg` | B.导航操作 | 48×48 | SVG | 高 |
| 25 | `droplet.svg` | C.类型图标 | 48×48 | SVG | 高 |
| 26 | `footprints-coral.svg` | C.类型图标 | 48×48 | SVG | 高 |
| 27 | `sparkles.svg` | C.类型图标 | 48×48 | SVG | 高 |
| 28 | `coffee.svg` | C.类型图标 | 48×48 | SVG | 高 |
| 29 | `compass-brand.svg` | C.类型图标 | 48×48 | SVG | 高 |
| 30 | `dice-5-brand-strong.svg` | D.模式芯片 | 48×48 | SVG | 中 |
| 31 | `dice-5-white.svg` | D.模式芯片 | 48×48 | SVG | 中 |
| 32 | `sprout-brand-strong.svg` | D.模式芯片 | 48×48 | SVG | 中 |
| 33 | `sprout-white.svg` | D.模式芯片 | 48×48 | SVG | 中 |
| 34 | `footprints-white.svg` | D.模式芯片 | 48×48 | SVG | 中 |
| 35 | `sun-lemon-fg.svg` | E.滤镜 | 48×48 | SVG | 中 |
| 36 | `cloud-rain-sky-fg.svg` | E.滤镜 | 48×48 | SVG | 中 |
| 37 | `zap-coral.svg` | E.滤镜 | 48×48 | SVG | 中 |
| 38 | `smile-lemon.svg` | F.心情贴纸 | 48×48 | SVG | 中 |
| 39 | `meh-brand.svg` | F.心情贴纸 | 48×48 | SVG | 中 |
| 40 | `sparkles-coral.svg` | F.心情贴纸 | 48×48 | SVG | 中 |
| 41 | `heart-lavender.svg` | F.心情贴纸 | 48×48 | SVG | 中 |
| 42 | `laugh-sky.svg` | F.心情贴纸 | 48×48 | SVG | 中 |
| 43 | `badge-first-escape.svg` | G.徽章 | 64×64 | SVG | 高 |
| 44 | `badge-seven-streak.svg` | G.徽章 | 64×64 | SVG | 高 |
| 45 | `badge-thirty-streak.svg` | G.徽章 | 64×64 | SVG | 高 |
| 46 | `badge-color-hunter.svg` | G.徽章 | 64×64 | SVG | 高 |
| 47 | `badge-night-walker.svg` | G.徽章 | 64×64 | SVG | 高 |
| 48 | `badge-rainy-walker.svg` | G.徽章 | 64×64 | SVG | 高 |
| 49 | `badge-market-regular.svg` | G.徽章 | 64×64 | SVG | 高 |
| 50 | `badge-city-detective.svg` | G.徽章 | 64×64 | SVG | 高 |
| 51 | `badge-member-pro.svg` | G.徽章 | 64×64 | SVG | 高 |
| 52 | `pin-color.svg` | H.地图标记 | 48×48 | SVG | 中 |
| 53 | `pin-walk.svg` | H.地图标记 | 48×48 | SVG | 中 |
| 54 | `pin-sense.svg` | H.地图标记 | 48×48 | SVG | 中 |
| 55 | `pin-collect.svg` | H.地图标记 | 48×48 | SVG | 中 |
| 56 | `pin-food.svg` | H.地图标记 | 48×48 | SVG | 中 |
| 57 | `pin-culture.svg` | H.地图标记 | 48×48 | SVG | 中 |
| 58 | `step-leave.svg` | I.执行步骤 | 48×48 | SVG | 中 |
| 59 | `step-explore.svg` | I.执行步骤 | 48×48 | SVG | 中 |
| 60 | `step-discover.svg` | I.执行步骤 | 48×48 | SVG | 中 |
| 61 | `step-record.svg` | I.执行步骤 | 48×48 | SVG | 中 |
| 62 | `users-lavender.svg` | J.会员页 | 48×48 | SVG | 低 |
| 63 | `award-lemon.svg` | J.会员页 | 48×48 | SVG | 低 |
| 64 | `cloud-rain-sky.svg` | J.会员页 | 48×48 | SVG | 低 |
| 65 | `empty-collection.svg` | K.空状态 | 48×48 | SVG | 低 |
| 66 | `empty-map.svg` | K.空状态 | 48×48 | SVG | 低 |
| 67 | `color-scene.webp` | L.场景插画 | 750×400 | WebP | 高 |
| 68 | `walk-scene.webp` | L.场景插画 | 750×400 | WebP | 高 |
| 69 | `sense-scene.webp` | L.场景插画 | 750×400 | WebP | 高 |
| 70 | `collect-scene.webp` | L.场景插画 | 750×400 | WebP | 高 |
| 71 | `food-scene.webp` | L.场景插画 | 750×400 | WebP | 高 |
| 72 | `culture-scene.webp` | L.场景插画 | 750×400 | WebP | 高 |
| 73 | `avatar.webp` | M.其他配图 | 200×200 | WebP | 低 |
| 74 | `paper-texture.webp` | M.其他配图 | 200×200 | WebP | 低 |
| 75 | `empty-collection.webp` | M.其他配图 | 300×300 | WebP | 低 |

**总计：75 个文件（高优先级 30 个 + 中优先级 30 个 + 低优先级 15 个）**

---

## 给 AI 画图工具的说明

### 图标生成要点

1. **统一容器：** 所有图标必须带圆形底容器，风格完全一致
2. **彩色面性：** 图标主体用填充（fill）而非纯描边（stroke），颜色丰富
3. **渐变质感：** 圆形底使用双色柔和渐变（`<linearGradient>` 或 `<radialGradient>`）
4. **高光细节：** 每个图标右上角加白色半透明高光弧，增加立体感
5. **内嵌颜色：** SVG 内嵌具体颜色值，不用 currentColor
6. **风格统一：** 所有图标的圆形底大小、位置、渐变方向完全一致
7. **颜色丰富：** 图标主体可有2-3种颜色搭配，但色调统一

### 配图生成要点

1. **手绘温暖风：** 有纸张质感、手绘笔触纹理，温暖治愈
2. **细节丰富：** 场景中要有丰富的细节元素，不要空旷
3. **光影层次：** 有柔和的光影变化，增加画面层次感
4. **暖色调：** 使用暖色调，饱和度适中（50-70%），不要太低
5. **成套统一：** 6张场景插画风格完全一致，只是场景和色调不同
6. **无文字：** 不包含任何文字、UI 元素、按钮
7. **无AI痕迹：** 避免霓虹光、完美对称、过度平滑

### 通用要求

1. **统一尺寸：** 严格按照表格中的尺寸生成
2. **WebP 压缩：** 配图生成后压缩为 WebP 格式，质量 85%
3. **替换即生效：** 所有文件路径已在代码中对齐，替换同名文件后直接生效
