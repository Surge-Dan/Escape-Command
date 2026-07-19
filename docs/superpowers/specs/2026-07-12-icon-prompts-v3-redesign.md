# ICON-PROMPTS v3 重构设计

> **日期**: 2026-07-12
> **状态**: 已批准，开始执行
> **目标**: 把 ICON-PROMPTS.md 从 v2（八要素·扁平3D）升级为 v3（11要素·手绘水彩厚涂），解决图标简单/不完整的问题
> **改动文件**: `docs/ICON-PROMPTS.md`

---

## 1. 问题诊断

### 1.1 现状（v2）
- 八要素 prompt 模板：风格、主体、光影、配色、容器、构图、负面、后缀
- 风格定位："立体手绘插画风"，参考 Notion / Headway / Things 3
- 单图 prompt 长度：约 60 词

### 1.2 实际生成结果（图1/图2）
- **简单**：主体只有 1 个核心元素（如只有"门"、只有"咖啡杯"），无装饰物、无配件、无点缀
- **不完整**：边缘残缺、形状断裂、构图溢出、细节缺失
- **缺立体感**：虽有 3D extrusion 关键词，但实际渲染平面化、无笔触、无肌理

### 1.3 目标（图3）
- **精致感**：主体被 6-8 个细节元素包裹，每个细节有独立材质/光影
- **水彩厚涂**：可见的笔触、纸纹、颜色叠加、晕染
- **手绘温度**：边缘不完美、留白有节奏、有"画出来"的痕迹

---

## 2. 设计决策（已批准）

| 维度 | 决策 |
|------|------|
| 风格 | 手绘水彩厚涂（Hand-painted Watercolor Impasto） |
| 主体结构 | 75% 主体 + 15% 装饰 + 10% 微缩环境 |
| 装饰元素 | 每图 3-4 个微配件（叶/羽/星/水溅/丝带/麻绳/小植物/贴纸） |
| 容器 | 微缩叙事环境（窗台/木桌/阁楼面板/木抽屉/藤编托盘） |
| 笔触比例 | 湿笔 60% + 干笔 30% + 厚涂 10% |
| 不完美 | 手绘边缘 0.5-1px 抖动 + 2-3 处水彩晕染溢出 |
| 配色 | 双主调 + 1 高光色，明度-10%、饱和度-15% |
| 艺术家锚点 | April Kuan / Anne Marie Zanetti / Heidi Willis 水彩作品集 |

---

## 3. v3 十一要素模板

```
[1 技法]    Hand-painted watercolor impasto illustration on 300gsm cold-press
            cotton paper. Visible brush strokes (wet-on-wet 60%, dry brush 30%,
            impasto 10%), paper texture showing through, color bleeding at
            edges. NEVER flat, NEVER vector, NEVER digital rendering.

[2 主体]    [底层材质] + [上层质感] + [微配件3-4个] + [动态状态/表情] + [环境点亮]
            五要素缺一不可，主体周围必须围绕 3-4 个微配件

[3 光影]    Three-point lighting: warm key light (4500K gold) from top-left,
            cool fill light (6500K blue) from top-right, warm rim light
            (3200K orange) from back-bottom. Soft drop shadow (offset 3px,
            blur 6px, color #00000018). Gentle inner highlight on top edges
            with 0.4 opacity white. Subtle ambient occlusion where elements
            meet the container.

[4 配色]    Two-tone main palette + one highlight color. ALL colors: -10%
            brightness, -15% saturation vs default. No neon, no pure black,
            no pure white. Reference April Kuan's muted earthy palette.

[5 容器]    Micro-narrative container: [windowsill | wooden desk | attic panel
            | drawer | rattan tray | marble shelf | wicker basket].
            Container has hand-sketched edges with 0.5-1px wobble, subtle
            wood grain or material texture, soft outer shadow.

[6 构图]    Centered subject occupies 75% of container area. 15% reserved
            for floating micro-accessories around the subject. 10% for
            container edge atmosphere. Slight elevation 2-3px from base.

[7 笔触]    Brush stroke vocabulary:
            - Wet-on-wet: soft color bleeding at intersection points
            - Dry brush: visible bristle marks on textured surfaces
            - Impasto: thick paint buildup on highlights and edges
            - Splatter: 2-3 micro droplets of complementary color
            - Bleed: 1-2 areas where pigment seeps beyond the line

[8 装饰]    Floating micro-accessories (randomly draw 3-4 per icon):
            pressed leaf, feather, sparkle star, watercolor droplet, ribbon,
            twine knot, tiny plant sprig, washi tape strip, paper clip,
            ink stamp, postmark, vintage label, thread loop, seed, pebble,
            petal, paper crane, button, thread spool

[9 不完美]  Hand-drawn imperfections: 0.5-1px edge wobble, slightly
            incomplete closures (2-3 spots), 2-3 intentional watercolor
            bleeds beyond the line, asymmetric proportions for organic feel.

[10 负面]   negative prompt: flat 2D, vector art, geometric, minimalist,
            abstract, symbol, icon, pictogram, line art, wireframe, sketch,
            digital, photorealistic, 3D render, plastic, glossy, neon,
            oversaturated, low quality, blurry, pixelated, jpeg artifacts,
            text, watermark, logo, signature, frame, border, gradient mesh

[11 后缀]   perfect watercolor painting, no clipping, no floating fragments,
            hand-crafted feel, painted with real brushes on cotton paper,
            reference work by April Kuan / Anne Marie Zanetti / Heidi Willis
            watercolor illustration portfolio, trending on Behance watercolor
            tag, featured in Communication Arts Illustration annual
```

---

## 4. 模板升级对照

| 要素 | v2（八要素） | v3（十一要素） |
|------|-------------|---------------|
| 风格 | 立体手绘 + 软体积 | **手绘水彩厚涂 + 笔触分布** |
| 主体 | 类型+材质+细节+状态 (4) | **底层+上层+微配件3-4个+动态+环境** (5) |
| 光影 | 单顶光 | **三光源（主+补+轮廓）** |
| 容器 | 圆角矩形 | **微缩叙事环境（窗台/桌/抽屉/托盘）** |
| 笔触 | 无 | **湿笔+干笔+厚涂+溅+晕染（5种笔触）** |
| 装饰 | 单主体 | **3-4 个微配件 + 7 种随机源** |
| 不完美 | 无 | **边缘抖动 + 不闭合 + 晕染溢出** |
| 负面 | 11 词 | **20+ 词穷举** |
| 后缀 | 1 行 | **3 行（质量+艺术家+平台）** |

---

## 5. 实施范围

- 67 个 SVG 图标（A-K + 附加）
- 6 个 WebP 场景插画
- 3 个固定配图
- 总计 76 个 prompt 全部重写

每个 prompt 从 60 词 → 180-220 词，5 要素主体描述，3-4 个微配件指定。

---

## 6. 验收标准

- [ ] 每个图标有 3-4 个微配件（不是单一主体）
- [ ] 主体周围有笔触/水彩溅/晕染
- [ ] 容器是叙事环境（窗台/桌/抽屉）而非抽象圆角矩形
- [ ] 色彩不饱和、有叠加
- [ ] 边缘有 0.5-1px 抖动
- [ ] 整体有"画出来"的温度感
