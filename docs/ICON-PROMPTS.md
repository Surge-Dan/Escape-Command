# 出逃指令 · 全套图标 Prompt 清单 v3

> **日期**: 2026-07-12
> **版本**: v3（**手绘水彩厚涂 · 11 要素 · 微缩叙事容器**）
> **目标工具**: Recraft v3（首选） / Midjourney v6.1 / GPT-4o（备选） / 即梦 AI（国内）
> **总素材数**: 76 张（67 SVG 图标 + 6 WebP 场景插画 + 3 固定配图）
> **关键变化（对比 v2）**: 八要素 → 十一要素；扁平 3D → 手绘水彩厚涂；圆角矩形 → 微缩叙事容器（窗台/木桌/抽屉/托盘）；单主体 → 主体 + 3-4 微配件；硬边 → 手绘抖动边缘
> **关联文档**: `docs/ASSETS-INVENTORY.md`、`docs/AI-IMAGE-INTEGRATION.md`、`docs/superpowers/specs/2026-07-12-icon-prompts-v3-redesign.md`

---

## 〇、通用设计规范

### 0.1 视觉风格定义

> **核心**: **手绘水彩厚涂**（Hand-painted Watercolor Impasto）
> 不是扁平 3D（v2 风格），不是真实 3D 渲染（避免冷感），不是矢量图标（避免机器感），而是水彩纸上用真实画笔画出来的厚涂插画。
>
> **参考艺术家**: April Kuan（柔和厚涂）、Anne Marie Zanetti（自然水彩）、Heidi Willis（叙事水彩）、Lisbeth Zwerger（手绘温度）
>
> **触觉目标**: 让人感觉"这是一位插画师花了 2 小时在棉浆纸上画出来的"。

### 0.2 十一要素 Prompt 模板（必带）

每个图标的 prompt **严格**遵循以下 11 要素结构，缺一项就会回到 v2 的"简单不完整"问题：

```
[1 技法]    Hand-painted watercolor impasto illustration on 300gsm cold-press
            cotton paper. Visible brush strokes (wet-on-wet 60%, dry brush
            30%, impasto 10%), paper texture showing through, color bleeding
            at edges. NEVER flat, NEVER vector, NEVER digital rendering.
            Painted with real brushes on cotton paper.

[2 主体]    [底层材质] + [上层质感] + [微配件3-4个] + [动态状态/表情] + [环境点亮]
            五要素缺一不可，主体周围必须围绕 3-4 个微配件

[3 光影]    Three-point lighting: warm key light (4500K gold) from top-left,
            cool fill light (6500K blue) from top-right, warm rim light
            (3200K orange) from back-bottom. Soft drop shadow (offset 3px,
            blur 6px, color #00000018). Gentle inner highlight on top edges
            with 0.4 opacity white. Subtle ambient occlusion where elements
            meet the container base.

[4 配色]    Two-tone main palette + one highlight color. ALL colors: -10%
            brightness, -15% saturation vs default. No neon, no pure black,
            no pure white. Reference April Kuan's muted earthy palette.

[5 容器]    Micro-narrative container: pick one of
            [wooden windowsill | aged wooden desk | attic wood panel |
            open drawer | rattan tray | marble shelf | wicker basket |
            brass tray | linen-covered table | leather-bound journal page]
            Container has hand-sketched edges with 0.5-1px wobble, subtle
            wood grain or material texture, soft outer shadow.

[6 构图]    Centered subject occupies 75% of container area. 15% reserved
            for floating micro-accessories around the subject. 10% for
            container edge atmosphere. Slight elevation 2-3px from base
            creating a soft floating feel. Asymmetric balance preferred
            over perfect symmetry.

[7 笔触]    Brush stroke vocabulary (all 5 must appear across the icon):
            - Wet-on-wet (60%): soft color bleeding at intersection points
            - Dry brush (30%): visible bristle marks on textured surfaces
            - Impasto (10%): thick paint buildup on highlights and edges
            - Splatter: 2-3 micro droplets of complementary color scattered
            - Bleed: 1-2 areas where pigment seeps beyond the drawn line

[8 装饰]    Floating micro-accessories (pick 3-4 per icon from this pool):
            pressed leaf, feather, sparkle star, watercolor droplet,
            ribbon, twine knot, tiny plant sprig, washi tape strip,
            paper clip, ink stamp, postmark, vintage label, thread loop,
            seed, pebble, petal, paper crane, button, thread spool,
            coffee bean, herb sprig, cinnamon stick, dried flower, ear
            of wheat, postage stamp, torn paper edge, masking tape

[9 不完美]  Hand-drawn imperfections: 0.5-1px edge wobble throughout,
            2-3 slightly incomplete closures (where lines almost meet),
            2-3 intentional watercolor bleeds beyond the line, slightly
            asymmetric proportions for organic feel. NEVER mechanical.

[10 负面]   negative prompt: flat 2D, vector art, geometric, minimalist,
            abstract, symbol, icon, pictogram, line art, wireframe, sketch,
            digital, photorealistic, 3D render, plastic, glossy, neon,
            oversaturated, low quality, blurry, pixelated, jpeg artifacts,
            text, watermark, logo, signature, frame, border, gradient mesh,
            AI generated, midjourney style, dalle style, stable diffusion

[11 后缀]   perfect watercolor painting, no clipping, no floating fragments,
            hand-crafted feel, painted with real brushes on cotton paper,
            reference work by April Kuan / Anne Marie Zanetti / Heidi
            Willis watercolor illustration portfolio, trending on Behance
            watercolor tag, featured in Communication Arts Illustration
            annual, gallery-quality children's book illustration
```

### 0.3 尺寸规范

| 类型 | 画布 | 容器 | 主体占比 | 装饰 | 容器边缘 |
|------|------|------|---------|------|---------|
| 普通图标 | 48×48px | 44×44px 微缩场景 | 75% | 15% | 10% |
| 徽章 | 64×64px | 60×60px 微缩场景 | 75% | 15% | 10% |
| 场景插画 | 750×400px | 无容器，3:2 横版 | 80% | 15% | 5% |

### 0.4 色彩系统

#### 通用画纸（v3 改造：真实水彩纸感）

| 元素 | 颜色 | 用途 |
|------|------|------|
| 纸纹底 | `#F4EFE3` 棉浆冷压纸 | 容器底色 |
| 纸纹纤维 | `#E8DFC9` opacity 0.3 | 随机散布的纤维点 |
| 边缘晕染 | `#D4C9A8` opacity 0.4 | 容器边 1-2px 软晕 |
| 高光留白 | `#FFFFFF` opacity 0.6, top edges | 笔触高光 |

#### 主体类型色（v3 调整：双主调 + 1 高光色，所有色 -10% 明度 -15% 饱和）

| 类型 | 主色1 | 主色2 | 高光色 | 适用 |
|------|------|------|--------|------|
| 颜色探索 | `#5B8FB9` 雾霾蓝 | `#8FB5D1` 浅蓝 | `#F5C28A` 暖橙 | 视觉艺术、颜色 |
| 漫步发现 | `#D98A5C` 暖珊瑚 | `#A8C97F` 薄荷绿 | `#F5D88A` 柔黄 | 户外、行走 |
| 感官体验 | `#9B7BB8` 薰衣草 | `#BFA5D1` 浅紫 | `#F5E6C8` 米黄 | 听觉、嗅觉 |
| 收藏拼贴 | `#C9B037` 暖金 | `#8B7B5C` 复古棕 | `#E8B5A0` 蜜桃粉 | 收集、拼贴 |
| 美食探索 | `#A67C52` 大地棕 | `#E8B5A0` 蜜桃粉 | `#F5E6C8` 米黄 | 咖啡、市井 |
| 如实文化 | `#5CBF9E` 薄荷绿 | `#86D4B8` 浅薄荷 | `#F5E6C8` 米黄 | 文化、建筑 |

#### 状态色（v3 调整：水彩层叠感）

| 状态 | 容器 | 主体 | 用途 |
|------|------|------|------|
| 默认 | `#F4EFE3` 纸纹 + 1-2px 边缘晕 | 主色 70% 饱和 | 普通态 |
| 选中 | `#FFF7E0` 纸纹 + `#C9B037` 2px 描边 | 主色 100% 饱和 + 1 处厚涂高光 | 高亮态 |
| 禁用 | `#EDE8DA` 纸纹 | `#B5B0A4` 单色 | 灰态 |

---

## A. TabBar 图标（6 张 SVG）⭐ 高优先级

> **位置**: `/assets/icons/` ｜ **画布**: 48×48px ｜ **容器**: 微缩叙事容器
> **引用**: `custom-tab-bar/index.js`

### 通用要求
- **默认态**：棉浆纸底 + 主体 70% 饱和度 + 2-3 处水彩晕染
- **选中态**：暖白底 + 暖金描边 + 主体 100% 饱和度 + 1 处厚涂高光
- 6 个图标视觉风格完全一致，仅内容不同
- 主体必须完整，主体周围必有 3-4 个微配件

### A1. tab-escape.svg — 出逃（默认）
```
Hand-painted watercolor impasto illustration on 300gsm cold-press cotton paper,
visible brush strokes (wet-on-wet 60%, dry brush 30%, impasto 10%),
paper texture showing through, color bleeding at edges, painted with
real brushes on cotton paper. Subject: a half-open aged oak door with
deeply visible wood grain texture and a slightly tarnished brass door
handle with verdigris patina, a small braided jute welcome mat at the
threshold, warm amber light glowing through the door gap with two visible
floating dust particles, a small fallen leaf resting on the mat, a piece
of twine tied to the handle trailing a tiny pressed maple leaf. Three-point
lighting: warm key light (4500K gold) from top-left, cool fill light
(6500K blue) from top-right, warm rim light (3200K orange) from back-bottom,
soft drop shadow (offset 3px, blur 6px, color #00000018). Two-tone palette
of warm beige wood tones (#A67C52) and brass (#C9B037) with amber light
highlight (#F5C28A), all colors -10% brightness -15% saturation. Container:
aged wooden windowsill with hand-sketched edges with 0.5-1px wobble,
visible wood grain texture, soft outer shadow. Centered composition
with door occupying 75% of container area, micro-accessories occupying
15%, container edge atmosphere 10%, slight 2-3px elevation. Brush strokes:
wet-on-wet color bleeding between door and light, dry brush bristle marks
on wood grain, impasto buildup on brass handle highlight, 2-3 watercolor
splatter droplets in amber, 1-2 pigment bleeds beyond the door outline.
Hand-drawn imperfections: 0.5-1px edge wobble throughout, 2 slightly
incomplete line closures on door frame, 1 intentional bleed beyond mat
edge, asymmetric handle position. Negative prompt: flat 2D, vector art,
geometric, minimalist, abstract, symbol, icon, pictogram, line art,
wireframe, sketch, digital, photorealistic, 3D render, plastic, glossy,
neon, oversaturated, low quality, blurry, pixelated, jpeg artifacts,
text, watermark, logo, signature, frame, border, gradient mesh, AI
generated. Suffix: perfect watercolor painting, no clipping, no floating
fragments, hand-crafted feel, painted with real brushes on cotton paper,
reference work by April Kuan and Anne Marie Zanetti watercolor portfolio,
trending on Behance watercolor tag, gallery-quality children's book
illustration.
```

### A2. tab-escape-active.svg — 出逃（选中）
```
Hand-painted watercolor impasto illustration on 300gsm cold-press cotton paper,
visible brush strokes, paper texture showing through, color bleeding at edges.
Subject: a half-open aged oak door with rich deep wood grain texture, polished
brass door handle with prominent warm reflection, a small braided jute
welcome mat with visible weave texture, warm golden light streaming through
the door gap with three visible floating dust particles catching the light,
a small maple leaf resting on the mat, a piece of twine tied to the handle
trailing a pressed leaf, a tiny gold key glinting under the mat edge.
Three-point lighting with stronger 4500K key and warm 3200K rim creating
dramatic glow on door edges, soft drop shadow. Two-tone palette of rich
amber wood tones (#A67C52) and vibrant brass (#C9B037) with luminous gold
highlight (#FFD93D), 100% saturation. Container: cream-warm windowsill
with 2px warm gold outline (#C9B037), hand-sketched edges, visible wood
grain. Composition: door occupies 75%, 5 micro-accessories in 15%, 10%
container edge. Brush strokes: impasto highlights on door edges and brass
handle, wet-on-wet color bleeding in the light beam, dry brush on wood
grain, 2-3 amber splatter droplets around the door, 1-2 bleeds. Hand-drawn
imperfections: edge wobble, 2 incomplete closures, 1 bleed. Negative prompt:
flat 2D, vector art, geometric, minimalist, abstract, symbol, icon, line
art, photorealistic, 3D render, plastic, neon, oversaturated, low quality,
blurry, jpeg artifacts, text, watermark, AI generated. Suffix: perfect
watercolor painting, hand-crafted, reference April Kuan and Heidi Willis
watercolor portfolio, trending on Behance watercolor tag, featured in
Communication Arts Illustration annual.
```

### A3. tab-map.svg — 地图（默认）
```
Hand-painted watercolor impasto illustration on 300gsm cold-press cotton paper.
Subject: a hand-folded aged paper map with visible fold creases, soft yellowed
paper edges, a small mint green water-drop location pin (3D with glossy
enamel surface, white highlight on top) standing on the map surface, a
hand-drawn dashed path in burnt sienna between two points ending in a small
arrow, tiny illustrated trees and a river drawn in muted ink, a small
brass compass rose in the corner, a dried pressed flower resting on the
map edge, a tiny paper clip holding one fold. Three-point lighting with
4500K key, 6500K fill, 3200K rim, soft drop shadow. Two-tone palette of
cream paper (#F5E6C8) and mint pin (#5CBF9E) with burnt sienna path
accent (#A67C52), all -10% brightness -15% saturation. Container: aged
wooden desk surface with hand-sketched edges, visible wood grain, soft
outer shadow. Composition: map 75%, micro-accessories 15% (pressed flower,
paper clip, tiny postcard stamp visible), desk edge 10%. Brush strokes:
wet-on-wet color bleeding on map edges, dry brush on paper folds, impasto
on pin highlight, 2-3 splatter droplets in mint, 1-2 bleeds beyond map.
Hand-drawn imperfections: 0.5-1px edge wobble, 2 incomplete closures on
map outline, 1 bleed on paper edge. Negative prompt: flat 2D, vector art,
geometric, minimalist, abstract, symbol, icon, line art, photorealistic,
3D render, plastic, neon, oversaturated, low quality, blurry, jpeg
artifacts, text, watermark, AI generated. Suffix: perfect watercolor
painting, hand-crafted, reference April Kuan and Anne Marie Zanetti,
trending on Behance watercolor tag, gallery-quality children's book
illustration.
```

### A4. tab-map-active.svg — 地图（选中）
```
Hand-painted watercolor impasto illustration on 300gsm cold-press cotton paper.
Subject: a hand-folded cream paper map with deep warm fold creases casting
subtle shadows, a prominent mint green water-drop pin (3D glossy enamel,
bright white highlight) standing tall, a hand-drawn dashed burnt sienna
path with arrow leading to the pin, tiny illustrated landmarks (a tree,
a small house, a river), a vibrant brass compass rose, a pressed lavender
flower, a small postcard stamp, a tiny gold coin. Three-point lighting
with stronger warm key creating dramatic shadows in folds. Two-tone palette
of rich cream paper and vibrant mint pin with burnt sienna and lavender
accents, 100% saturation. Container: cream-warm desk with 2px warm gold
outline. Composition: map 75%, 5 micro-accessories 15%, container 10%.
Brush strokes: impasto on pin highlight and gold coin, wet-on-wet on map,
dry brush on paper texture, splatter and bleeds. Hand-drawn imperfections
throughout. Negative prompt: flat 2D, vector art, geometric, minimalist,
abstract, icon, photorealistic, plastic, neon, oversaturated, low quality,
text, watermark, AI generated. Suffix: perfect watercolor painting,
hand-crafted, reference Anne Marie Zanetti, trending on Behance watercolor
tag, featured in Communication Arts Illustration annual.
```

### A5. tab-profile.svg — 我的（默认）
```
Hand-painted watercolor impasto illustration on 300gsm cold-press cotton paper.
Subject: a friendly human bust portrait with rounded soft head, gentle
peach-skin tones with subtle warm blush on cheeks, soft shoulders, a soft
cream linen sweater with visible weave texture, a single pressed lavender
flower tucked behind the ear, a delicate twine necklace with a tiny brass
leaf pendant, a small watercolor earring. Three-point lighting with warm
4500K key, cool 6500K fill, 3200K rim creating soft jaw shadow, drop
shadow on shoulders. Two-tone palette of warm peach skin (#E8B5A0) and
cream linen (#F5E6C8) with brass pendant highlight (#C9B037), -10%
brightness -15% saturation. Container: aged wooden windowsill with
hand-sketched edges, wood grain texture. Composition: bust 75%, micro-
accessories 15% (pressed flower, twine necklace, earring, a small soft
glow particle), container 10%. Brush strokes: wet-on-wet on cheeks
blush, dry brush on linen weave, impasto on pendant, 2-3 lavender
splatter droplets, 1-2 bleeds beyond bust edge. Hand-drawn imperfections:
edge wobble, 2 incomplete closures on sweater collar, 1 bleed. Negative
prompt: flat 2D, vector art, geometric, minimalist, abstract, icon,
line art, photorealistic, 3D render, plastic, neon, oversaturated, low
quality, blurry, jpeg artifacts, text, watermark, AI generated. Suffix:
perfect watercolor painting, hand-crafted, reference Heidi Willis
watercolor portrait portfolio, trending on Behance watercolor tag,
gallery-quality children's book illustration.
```

### A6. tab-profile-active.svg — 我的（选中）
```
Hand-painted watercolor impasto illustration on 300gsm cold-press cotton paper.
Subject: a friendly human bust portrait with warm bright smile, glowing
peach skin with prominent warm blush, soft cream linen sweater with
visible weave, a pressed wildflower tucked behind ear, a delicate twine
necklace with a tiny brass leaf pendant, a small watercolor earring, a
faint gold shimmer particle. Three-point lighting with stronger warm key
creating luminous skin glow. Two-tone palette of rich peach and cream
with brass and lavender accents, 100% saturation. Container: cream-warm
windowsill with 2px warm gold outline. Composition: bust 75%, 4 micro-
accessories 15%, container 10%. Brush strokes: impasto on cheek highlight
and pendant, wet-on-wet on blush, dry brush on linen, splatter and
bleeds. Hand-drawn imperfections throughout. Negative prompt: flat 2D,
vector art, geometric, icon, photorealistic, plastic, neon, oversaturated,
low quality, text, watermark, AI generated. Suffix: perfect watercolor
painting, hand-crafted, reference Heidi Willis, trending on Behance
watercolor tag, featured in Communication Arts Illustration annual.
```

---

## B. 导航与操作图标（18 张 SVG）⭐ 高优先级

> **位置**: `/assets/icons/` ｜ **画布**: 48×48px ｜ **容器**: 微缩叙事容器

### B1. chevron-left-ink.svg — 返回按钮
```
Hand-painted watercolor impasto on 300gsm cotton paper. Subject: a thick
left-pointing chevron arrow with rounded caps, painted as if with a single
soft brush load of muted ink color, a tiny pressed leaf drifting beside
the arrow, a small watercolor splatter dot trailing, a faint pencil
underline. Three-point lighting, soft drop shadow. Two-tone palette of
ink gray (#4A5568) and warm cream (#F5E6C8) with a subtle brass accent
on the leaf, -10% brightness -15% saturation. Container: aged wooden
desk surface with hand-sketched edges, wood grain. Composition: arrow
75%, micro-accessories 15%, desk 10%. Brush strokes: dry brush bristle
marks on arrow, wet-on-wet color shift along arrow shaft, impasto on
arrow tip highlight, 2-3 ink splatter droplets, 1-2 bleeds. Hand-drawn
imperfections: edge wobble, 1 incomplete closure, 1 bleed. Negative
prompt: flat 2D, vector, geometric, minimalist, abstract, icon, line
art, photorealistic, 3D render, plastic, neon, oversaturated, low quality,
text, watermark, AI generated. Suffix: perfect watercolor painting,
hand-crafted, reference April Kuan, trending on Behance.
```

### B2. chevron-right-faint.svg — 列表箭头
```
Hand-painted watercolor impasto on 300gsm cotton paper. Subject: a thin
right-pointing chevron arrow with rounded caps in soft warm gray, a tiny
dried herb sprig beside it, a faint watercolor droplet trailing, a soft
pencil mark. Three-point lighting, soft drop shadow. Two-tone palette
of light warm gray (#A8ADB5) and cream with a sage green herb accent.
Container: aged wooden desk with hand-sketched edges. Composition: arrow
75%, micro-accessories 15%, desk 10%. Brush strokes: dry brush on arrow,
wet-on-wet color shift, impasto on tip, 2 splatter, 1 bleed. Hand-drawn
imperfections throughout. Negative prompt: flat 2D, vector, geometric,
icon, line art, photorealistic, plastic, neon, oversaturated, low quality,
text, watermark, AI generated. Suffix: perfect watercolor painting,
hand-crafted, reference April Kuan, trending on Behance.
```

### B3. check-white.svg — 完成/确认
```
Hand-painted watercolor impasto on 300gsm cotton paper. Subject: a thick
check mark with rounded caps painted in vibrant mint green with glossy
wet highlights, a tiny twine bow tied to the top of the check, a small
pressed mint leaf, a watercolor droplet dot, a soft golden glow particle.
Three-point lighting, drop shadow. Two-tone palette of mint green (#5CBF9E)
and cream with gold accent (#FFD93D), -10% -15%. Container: aged wooden
windowsill. Composition: check 75%, accessories 15%, container 10%. Brush
strokes: wet-on-wet on check, impasto on highlights, dry brush on twine,
splatter and bleeds. Hand-drawn imperfections throughout. Negative prompt:
flat 2D, vector, geometric, icon, line art, photorealistic, plastic,
neon, oversaturated, low quality, text, watermark, AI generated. Suffix:
perfect watercolor painting, hand-crafted, reference April Kuan, trending
on Behance.
```

### B4. x-ink-faint.svg — 关闭/删除
```
Hand-painted watercolor impasto on 300gsm cotton paper. Subject: an X
cross mark with rounded caps in soft warm gray, a tiny dried leaf beside
it, a small watercolor splatter dot, a faint pencil eraser mark. Three-
point lighting, soft drop shadow. Two-tone palette of light warm gray
and cream with a sage green leaf accent. Container: aged wooden desk.
Composition: X 75%, accessories 15%, desk 10%. Brush strokes throughout.
Hand-drawn imperfections throughout. Negative prompt: flat 2D, vector,
icon, line art, photorealistic, plastic, neon, oversaturated, low quality,
text, watermark, AI generated. Suffix: perfect watercolor painting,
hand-crafted, reference April Kuan, trending on Behance.
```

### B5. refresh-cw-ink-soft.svg — 刷新/重摇
```
Hand-painted watercolor impasto on 300gsm cotton paper. Subject: two
curved arrows forming a circular refresh cycle with rounded caps, painted
in soft sky blue with glossy wet highlights, a tiny pebble inside the
cycle, a small water droplet beside one arrow, a soft gold particle.
Three-point lighting, drop shadow. Two-tone palette of sky blue (#7EC8F5)
and cream with brass accent, -10% -15%. Container: rattan tray with
hand-sketched edges, visible weave. Composition: cycle 75%, accessories
15%, tray 10%. Brush strokes: wet-on-wet, impasto on highlights, dry
brush, splatter and bleeds. Hand-drawn imperfections. Negative prompt:
flat 2D, vector, icon, line art, photorealistic, plastic, neon, oversaturated,
low quality, text, watermark, AI generated. Suffix: perfect watercolor
painting, hand-crafted, reference April Kuan, trending on Behance.
```

### B6. more-horizontal-ink.svg — 更多菜单
```
Hand-painted watercolor impasto on 300gsm cotton paper. Subject: three
small horizontal dots with subtle 3D watercolor wash shape, each with
a tiny water droplet above, a small pressed leaf, a soft pencil mark
trail. Three-point lighting, drop shadow. Two-tone palette of ink gray
and cream with sage accent. Container: aged wooden desk. Composition:
dots 75%, accessories 15%, desk 10%. Brush strokes throughout. Hand-drawn
imperfections. Negative prompt: flat 2D, vector, icon, line art, photorealistic,
plastic, neon, oversaturated, low quality, text, watermark, AI generated.
Suffix: perfect watercolor painting, hand-crafted, reference April Kuan.
```

### B7. target-ink.svg — 设置入口
```
Hand-painted watercolor impasto on 300gsm cotton paper. Subject: a target
with three concentric watercolor wash rings and a center dot, each ring
with a tiny pressed leaf resting on it, a small arrow stuck at the center,
a soft watercolor droplet splatter. Three-point lighting, drop shadow.
Two-tone palette of warm ink gray and cream with sage green leaves.
Container: aged wooden desk. Composition: target 75%, accessories 15%,
desk 10%. Brush strokes: wet-on-wet on rings, dry brush, impasto on center
dot, splatter and bleeds. Hand-drawn imperfections. Negative prompt:
flat 2D, vector, icon, line art, photorealistic, plastic, neon, oversaturated,
low quality, text, watermark, AI generated. Suffix: perfect watercolor
painting, hand-crafted, reference April Kuan.
```

### B8. settings-brand.svg — 设置页
```
Hand-painted watercolor impasto on 300gsm cotton paper. Subject: a gear
with 8 teeth, center hole, visible watercolor depth on teeth, mint green
with glossy highlights, a tiny brass screw at the center, a small pressed
mint leaf, a watercolor droplet. Three-point lighting, drop shadow. Two-
tone palette of mint green and cream with brass accent, -10% -15%.
Container: aged wooden desk with hand-sketched edges. Composition: gear
75%, accessories 15%, desk 10%. Brush strokes throughout. Hand-drawn
imperfections. Negative prompt: flat 2D, vector, icon, line art, photorealistic,
plastic, neon, oversaturated, low quality, text, watermark, AI generated.
Suffix: perfect watercolor painting, hand-crafted, reference April Kuan,
trending on Behance.
```

### B9. pencil-brand.svg — 编辑代号
```
Hand-painted watercolor impasto on 300gsm cotton paper. Subject: a
sharpened yellow pencil with visible wood grain on the cone, pink eraser
with metal ferrule, graphite tip, three small stroke marks beside it
suggesting writing, a tiny eraser shaving curl, a small pressed leaf,
a watercolor droplet. Three-point lighting, drop shadow. Two-tone palette
of warm yellow pencil and pink eraser with cream, -10% -15%. Container:
aged wooden desk. Composition: pencil 75%, accessories 15%, desk 10%.
Brush strokes throughout. Hand-drawn imperfections. Negative prompt: flat
2D, vector, icon, line art, photorealistic, plastic, neon, oversaturated,
low quality, text, watermark, AI generated. Suffix: perfect watercolor
painting, hand-crafted, reference Anne Marie Zanetti, trending on Behance.
```

### B10. camera-ink-soft.svg — 拍照
```
Hand-painted watercolor impasto on 300gsm cotton paper. Subject: a
vintage compact camera with rounded body, prominent circular lens with
glass reflection, small viewfinder bump, soft flash glow on top-right,
leather texture on body, visible camera strap loop, a tiny polaroid photo
peeking out, a small dried flower, a soft watercolor droplet. Three-point
lighting, drop shadow. Two-tone palette of warm brown leather and chrome
lens with cream, -10% -15%. Container: linen-covered table with hand-
sketched edges, visible linen weave. Composition: camera 75%, accessories
15%, linen 10%. Brush strokes throughout. Hand-drawn imperfections.
Negative prompt: flat 2D, vector, icon, line art, photorealistic, plastic,
neon, oversaturated, low quality, text, watermark, AI generated. Suffix:
perfect watercolor painting, hand-crafted, reference April Kuan, trending
on Behance.
```

### B11. navigation-brand.svg — 定位
```
Hand-painted watercolor impasto on 300gsm cotton paper. Subject: a
compass needle with diamond-shaped north pointer (vibrant red) and south
pointer (cream), circular dial face with subtle degree marks, soft drop
shadow, a tiny brass center pivot, a small dried flower, a watercolor
droplet, a soft golden particle. Three-point lighting. Two-tone palette
of sky blue dial and red/cream needle with brass accent, -10% -15%.
Container: aged wooden desk. Composition: compass 75%, accessories 15%,
desk 10%. Brush strokes throughout. Hand-drawn imperfections. Negative
prompt: flat 2D, vector, icon, line art, photorealistic, plastic, neon,
oversaturated, low quality, text, watermark, AI generated. Suffix: perfect
watercolor painting, hand-crafted, reference April Kuan, trending on
Behance.
```

### B12. map-brand.svg — 地图标题
```
Hand-painted watercolor impasto on 300gsm cotton paper. Subject: a
folded paper map with three visible panels, crease lines casting subtle
shadows, tiny illustrated trees and roads on the surface, small compass
rose in corner, a tiny postcard stamp, a small pressed lavender, a
dried herb sprig, a soft watercolor droplet. Three-point lighting. Two-
tone palette of cream paper and mint accents with lavender, -10% -15%.
Container: aged wooden desk. Composition: map 75%, accessories 15%,
desk 10%. Brush strokes throughout. Hand-drawn imperfections. Negative
prompt: flat 2D, vector, icon, line art, photorealistic, plastic, neon,
oversaturated, low quality, text, watermark, AI generated. Suffix: perfect
watercolor painting, hand-crafted, reference Anne Marie Zanetti, trending
on Behance.
```

### B13. map-pin-brand.svg — 位置标记
```
Hand-painted watercolor impasto on 300gsm cotton paper. Subject: a 3D
water-drop map pin (rounded top, pointed bottom) with glossy mint green
surface and bright white highlight on top curve, small circular hole in
center, a tiny pressed leaf beside, a small twine bow tied to the pin
base, a watercolor droplet, a soft gold particle. Three-point lighting.
Two-tone palette of mint green and cream with sage accent, -10% -15%.
Container: aged wooden windowsill. Composition: pin 75%, accessories
15%, sill 10%. Brush strokes throughout. Hand-drawn imperfections.
Negative prompt: flat 2D, vector, icon, line art, photorealistic, plastic,
neon, oversaturated, low quality, text, watermark, AI generated. Suffix:
perfect watercolor painting, hand-crafted, reference April Kuan, trending
on Behance.
```

### B14. clock-brand.svg — 时长
```
Hand-painted watercolor impasto on 300gsm cotton paper. Subject: a round
wall clock with thick rounded hands pointing to 10:10, visible hour
markers (12, 3, 6, 9), small dots for other hours, glossy mint green
bezel, cream dial face, dark hands, a tiny brass center pivot, a small
pressed leaf, a watercolor droplet, a soft gold particle. Three-point
lighting. Two-tone palette of mint green bezel and cream dial with brass,
-10% -15%. Container: aged wooden desk. Composition: clock 75%, accessories
15%, desk 10%. Brush strokes throughout. Hand-drawn imperfections.
Negative prompt: flat 2D, vector, icon, line art, photorealistic, plastic,
neon, oversaturated, low quality, text, watermark, AI generated. Suffix:
perfect watercolor painting, hand-crafted, reference April Kuan, trending
on Behance.
```

### B15. user-brand.svg — 人数
```
Hand-painted watercolor impasto on 300gsm cotton paper. Subject: a
friendly human bust silhouette with rounded head, soft shoulders, neutral
expression, soft cream sweater with visible weave, a tiny pressed lavender
flower tucked behind ear, a delicate twine necklace with brass leaf
pendant, a small watercolor earring, a faint gold particle. Three-point
lighting. Two-tone palette of peach skin and cream with mint background
and brass accent, -10% -15%. Container: aged wooden windowsill. Composition:
bust 75%, accessories 15%, sill 10%. Brush strokes throughout. Hand-drawn
imperfections. Negative prompt: flat 2D, vector, icon, line art, photorealistic,
plastic, neon, oversaturated, low quality, text, watermark, AI generated.
Suffix: perfect watercolor painting, hand-crafted, reference Heidi Willis,
trending on Behance.
```

### B16. bookmark.svg — 未收藏
```
Hand-painted watercolor impasto on 300gsm cotton paper. Subject: a
bookmark outline (unfilled) with rounded top corners and triangular notch
at bottom, subtle watercolor depth showing through, paper texture on
surface, a tiny twine bow tied at top, a small dried herb sprig, a soft
pencil underline mark, a watercolor droplet. Three-point lighting. Two-
tone palette of light warm gray outline and cream paper with sage green
twine, -10% -15%. Container: aged wooden desk. Composition: bookmark
75%, accessories 15%, desk 10%. Brush strokes throughout. Hand-drawn
imperfections. Negative prompt: flat 2D, vector, icon, line art, photorealistic,
plastic, neon, oversaturated, low quality, text, watermark, AI generated.
Suffix: perfect watercolor painting, hand-crafted, reference April Kuan,
trending on Behance.
```

### B17. bookmark-brand.svg — 已收藏
```
Hand-painted watercolor impasto on 300gsm cotton paper. Subject: a solid
filled bookmark with rounded top corners and triangular notch at bottom,
vibrant warm orange with glossy enamel surface and impasto highlight on
top, a tiny twine bow tied at top, a small pressed leaf, a watercolor
droplet, a soft gold particle. Three-point lighting. Two-tone palette of
warm orange and cream with sage accent, -10% -15%. Container: aged wooden
desk. Composition: bookmark 75%, accessories 15%, desk 10%. Brush strokes
throughout. Hand-drawn imperfections. Negative prompt: flat 2D, vector,
icon, line art, photorealistic, plastic, neon, oversaturated, low quality,
text, watermark, AI generated. Suffix: perfect watercolor painting,
hand-crafted, reference April Kuan, trending on Behance.
```

### B18. lock-coral.svg — 未解锁锁
```
Hand-painted watercolor impasto on 300gsm cotton paper. Subject: a
padlock with U-shaped shackle on top, rounded body with keyhole, visible
watercolor depth on shackle and body, glossy coral pink surface with
impasto highlight, a tiny brass keyhole rim, a small pressed rose petal,
a watercolor droplet, a soft gold particle. Three-point lighting. Two-
tone palette of coral pink and cream with brass shackle accent, -10%
-15%. Container: aged wooden desk. Composition: lock 75%, accessories
15%, desk 10%. Brush strokes throughout. Hand-drawn imperfections.
Negative prompt: flat 2D, vector, icon, line art, photorealistic, plastic,
neon, oversaturated, low quality, text, watermark, AI generated. Suffix:
perfect watercolor painting, hand-crafted, reference April Kuan, trending
on Behance.
```

---

## C. 6 种类型图标（6 张 SVG）⭐ 高优先级

> **位置**: `/assets/icons/` ｜ **画布**: 48×48px ｜ **容器**: 微缩叙事容器 ｜ **引用**: `utils/constants.js`（TYPE_META.icon）

### C1. droplet.svg — 颜色探索
```
Hand-painted watercolor impasto on 300gsm cotton paper. Subject: an
artist paint palette (wooden, kidney-shaped) with thumb hole, three
colorful paint blobs (cobalt blue, cadmium yellow, vermilion red) on
the palette surface as soft watercolor pools, a small watercolor brush
with wooden handle and brass ferrule resting on the palette edge, a
tiny squeezed paint tube beside it, a small pressed leaf, a watercolor
droplet splatter, a soft gold particle. Three-point lighting. Two-tone
palette of warm wooden palette and vibrant paint blobs, -10% -15%.
Container: aged wooden desk with hand-sketched edges, visible wood
grain. Composition: palette 75%, accessories 15%, desk 10%. Brush
strokes: wet-on-wet color bleeding between paint blobs, dry brush on
wooden palette, impasto on paint highlights, splatter and bleeds.
Hand-drawn imperfections throughout. Negative prompt: flat 2D, vector,
icon, line art, photorealistic, plastic, neon, oversaturated, low
quality, text, watermark, AI generated. Suffix: perfect watercolor
painting, hand-crafted, reference April Kuan and Anne Marie Zanetti,
trending on Behance.
```

### C2. footprints-coral.svg — 漫步发现
```
Hand-painted watercolor impasto on 300gsm cotton paper. Subject: two
human footprints side by side on soft sandy ground, each showing five
distinct toe pads and arch detail with watercolor depth, soft drop
shadow, sandy texture around the prints, a tiny pressed beach grass
blade, a small pebble beside one print, a watercolor droplet, a soft
gold particle. Three-point lighting. Two-tone palette of warm coral
orange footprints and sand texture with sage accent, -10% -15%. Container:
rattan tray with hand-sketched edges, visible weave texture. Composition:
footprints 75%, accessories 15%, tray 10%. Brush strokes throughout.
Hand-drawn imperfections. Negative prompt: flat 2D, vector, icon, line
art, photorealistic, plastic, neon, oversaturated, low quality, text,
watermark, AI generated. Suffix: perfect watercolor painting, hand-
crafted, reference April Kuan, trending on Behance.
```

### C3. sparkles.svg — 感官体验
```
Hand-painted watercolor impasto on 300gsm cotton paper. Subject: three
four-pointed sparkle stars of varying sizes (one large, two small) clustered
together, each star with soft watercolor depth, glossy surface with white
impasto highlight on top point, a tiny pressed lavender flower, a small
feather, a watercolor droplet, a soft gold shimmer particle. Three-point
lighting. Two-tone palette of lavender sparkles and golden yellow accent
stars, -10% -15%. Container: aged wooden windowsill. Composition: stars
75%, accessories 15%, sill 10%. Brush strokes throughout. Hand-drawn
imperfections. Negative prompt: flat 2D, vector, icon, line art, photorealistic,
plastic, neon, oversaturated, low quality, text, watermark, AI generated.
Suffix: perfect watercolor painting, hand-crafted, reference Heidi Willis,
trending on Behance.
```

### C4. coffee.svg — 美食探索
```
Hand-painted watercolor impasto on 300gsm cotton paper. Subject: a
ceramic coffee cup with visible saucer underneath, rich brown coffee
liquid with cream latte art (small heart shape) on the surface, two
steam swirls rising from the cup with watercolor bleeding, soft drop
shadow on the saucer, glossy ceramic surface with impasto highlight on
cup edge, a tiny cinnamon stick beside the saucer, a small pressed coffee
bean, a watercolor droplet, a soft gold particle. Three-point lighting.
Two-tone palette of warm cream ceramic and rich brown coffee with cinnamon
accent, -10% -15%. Container: linen-covered table with hand-sketched
edges, visible linen weave. Composition: cup 75%, accessories 15%, linen
10%. Brush strokes: wet-on-wet on steam swirls, dry brush on ceramic,
impasto on highlight, splatter and bleeds. Hand-drawn imperfections.
Negative prompt: flat 2D, vector, icon, line art, photorealistic, plastic,
neon, oversaturated, low quality, text, watermark, AI generated. Suffix:
perfect watercolor painting, hand-crafted, reference Anne Marie Zanetti,
trending on Behance.
```

### C5. compass-brand.svg — 如实文化
```
Hand-painted watercolor impasto on 300gsm cotton paper. Subject: a
vintage brass compass with round case, glass cover with visible reflection,
four cardinal points (N, S, E, W) marked around the dial, magnetic needle
pointing north (vibrant red) and south (cream), small brass anchor at
center pivot, a tiny dried flower beside it, a small pressed leaf, a
watercolor droplet, a soft gold particle. Three-point lighting. Two-tone
palette of brass case and cream dial with red/white needle, -10% -15%.
Container: aged wooden desk. Composition: compass 75%, accessories 15%,
desk 10%. Brush strokes throughout. Hand-drawn imperfections. Negative
prompt: flat 2D, vector, icon, line art, photorealistic, plastic, neon,
oversaturated, low quality, text, watermark, AI generated. Suffix: perfect
watercolor painting, hand-crafted, reference April Kuan, trending on
Behance.
```

### C6. bookmark.svg — 收藏拼贴
```
Hand-painted watercolor impasto on 300gsm cotton paper. Subject: a solid
filled bookmark with rounded top corners and triangular notch at bottom,
vibrant warm golden yellow with glossy surface and impasto highlight on
top, a tiny twine bow tied at top, a small pressed maple leaf, a watercolor
droplet, a soft gold particle, a torn paper edge visible. Three-point
lighting. Two-tone palette of warm golden yellow and cream with brass
accent, -10% -15%. Container: leather-bound journal page with hand-sketched
edges, visible leather texture. Composition: bookmark 75%, accessories
15%, journal 10%. Brush strokes throughout. Hand-drawn imperfections.
Negative prompt: flat 2D, vector, icon, line art, photorealistic, plastic,
neon, oversaturated, low quality, text, watermark, AI generated. Suffix:
perfect watercolor painting, hand-crafted, reference Anne Marie Zanetti,
trending on Behance.
```

---

## D. 模式芯片图标（5 张 SVG）⭐ 中优先级

> **位置**: `/assets/icons/` ｜ **画布**: 48×48px ｜ **设计要点**: strong 态 = 主体类型色，white 态 = 主体类型色但无容器底（透明底）

### D1. dice-5-brand-strong.svg — 智能匹配（默认）
```
Hand-painted watercolor impasto on 300gsm cotton paper. Subject: a 3D-
perspective dice showing 5 dots on top face (4 corners + 1 center), rounded
corners, subtle watercolor wood grain texture on dice surface, glossy
mint green with impasto highlight on top edge, a tiny pressed leaf beside,
a small watercolor droplet, a soft gold particle, a twine knot detail.
Three-point lighting. Two-tone palette of mint green dice and white dots
with sage accent, -10% -15%. Container: aged wooden desk. Composition:
dice 75%, accessories 15%, desk 10%. Brush strokes throughout. Hand-drawn
imperfections. Negative prompt: flat 2D, vector, icon, line art, photorealistic,
plastic, neon, oversaturated, low quality, text, watermark, AI generated.
Suffix: perfect watercolor painting, hand-crafted, reference April Kuan.
```

### D2. dice-5-white.svg — 智能匹配（选中）
```
Hand-painted watercolor impasto on 300gsm cotton paper. Subject: a 3D-
perspective dice showing 5 dots, rounded corners, watercolor wood grain
texture, glossy rich mint green with bright impasto highlight, a tiny
pressed leaf, a small watercolor droplet, a soft gold shimmer particle.
Three-point lighting with stronger warm key. Two-tone palette of vibrant
mint green and white dots, 100% saturation. Transparent background, no
container. Composition: dice 75%, accessories 15%, 10% paper edge.
Brush strokes throughout. Hand-drawn imperfections. Negative prompt: flat
2D, vector, icon, line art, photorealistic, plastic, neon, oversaturated,
low quality, text, watermark, AI generated. Suffix: perfect watercolor
painting, hand-crafted, reference April Kuan, trending on Behance.
```

### D3. sprout-brand-strong.svg — 微出逃（默认）
```
Hand-painted watercolor impasto on 300gsm cotton paper. Subject: a young
sprout with two small heart-shaped leaves growing from a tiny soil mound,
visible root detail in the soil, soft drop shadow, glossy leaf surface
with white impasto highlight on each leaf, a tiny pressed clover beside,
a small pebble, a watercolor droplet, a soft gold particle. Three-point
lighting. Two-tone palette of mint green sprout and brown soil with sage
accent, -10% -15%. Container: aged wooden windowsill. Composition: sprout
75%, accessories 15%, sill 10%. Brush strokes throughout. Hand-drawn
imperfections. Negative prompt: flat 2D, vector, icon, line art, photorealistic,
plastic, neon, oversaturated, low quality, text, watermark, AI generated.
Suffix: perfect watercolor painting, hand-crafted, reference April Kuan.
```

### D4. sprout-white.svg — 微出逃（选中）
```
Hand-painted watercolor impasto on 300gsm cotton paper. Subject: a young
sprout with two heart-shaped leaves, soil mound, visible roots, glossy
vibrant mint green leaves with bright impasto highlight, a tiny pressed
clover, a small pebble, a watercolor droplet, a soft gold shimmer particle.
Three-point lighting with stronger warm key. Two-tone palette of vibrant
mint green and brown soil, 100% saturation. Transparent background, no
container. Composition: sprout 75%, accessories 15%, 10% paper edge.
Brush strokes throughout. Hand-drawn imperfections. Negative prompt: flat
2D, vector, icon, line art, photorealistic, plastic, neon, oversaturated,
low quality, text, watermark, AI generated. Suffix: perfect watercolor
painting, hand-crafted, reference April Kuan, trending on Behance.
```

### D5. footprints-white.svg — 漫步（选中）
```
Hand-painted watercolor impasto on 300gsm cotton paper. Subject: two
human footprints side by side on soft sandy ground, each with five distinct
toe pads and arch detail, soft drop shadow, sandy texture, a tiny pressed
beach grass blade, a small pebble, a watercolor droplet, a soft gold
particle. Three-point lighting with stronger warm key. Two-tone palette
of vibrant coral orange and sand, 100% saturation. Transparent background,
no container. Composition: footprints 75%, accessories 15%, 10% paper
edge. Brush strokes throughout. Hand-drawn imperfections. Negative prompt:
flat 2D, vector, icon, line art, photorealistic, plastic, neon, oversaturated,
low quality, text, watermark, AI generated. Suffix: perfect watercolor
painting, hand-crafted, reference April Kuan, trending on Behance.
```

---

## E. 滤镜图标（3 张 SVG）⭐ 中优先级

> **位置**: `/assets/icons/` ｜ **画布**: 48×48px ｜ **容器**: 微缩叙事容器

### E1. sun-lemon-fg.svg — 日光
```
Hand-painted watercolor impasto on 300gsm cotton paper. Subject: a sun
with smiling face (closed curved eyes and gentle smile) and 8 radiating
light rays of varying lengths, soft watercolor depth on the sun body,
glossy surface with warm impasto highlight, a tiny pressed sunflower
petal, a small watercolor droplet, a soft gold particle, a faint pencil
underline. Three-point lighting. Two-tone palette of warm golden yellow
sun and orange rays, -10% -15%. Container: aged wooden windowsill.
Composition: sun 75%, accessories 15%, sill 10%. Brush strokes throughout.
Hand-drawn imperfections. Negative prompt: flat 2D, vector, icon, line
art, photorealistic, plastic, neon, oversaturated, low quality, text,
watermark, AI generated. Suffix: perfect watercolor painting, hand-
crafted, reference April Kuan, trending on Behance.
```

### E2. cloud-rain-sky-fg.svg — 阴雨天
```
Hand-painted watercolor impasto on 300gsm cotton paper. Subject: a fluffy
cloud with two layers (lighter back layer, darker front layer for depth)
and three raindrops falling beneath, each raindrop with 3D water drop
shape, glossy surface with impasto highlight, soft drop shadow below
the cloud, a tiny pressed leaf, a small watercolor droplet, a soft blue
particle. Three-point lighting. Two-tone palette of soft white cloud
and sky blue raindrops, -10% -15%. Container: aged wooden desk. Composition:
cloud 75%, accessories 15%, desk 10%. Brush strokes: wet-on-wet on cloud
layers, dry brush on edges, impasto on raindrop highlights, splatter
and bleeds. Hand-drawn imperfections. Negative prompt: flat 2D, vector,
icon, line art, photorealistic, plastic, neon, oversaturated, low quality,
text, watermark, AI generated. Suffix: perfect watercolor painting,
hand-crafted, reference April Kuan, trending on Behance.
```

### E3. zap-coral.svg — 闪光灯
```
Hand-painted watercolor impasto on 300gsm cotton paper. Subject: a
lightning bolt with zigzag shape, watercolor depth giving thickness,
glossy surface with bright yellow impasto highlight on the center suggesting
electric energy, small sparkle stars around the bolt, a tiny pressed
leaf, a small watercolor droplet, a soft gold particle. Three-point
lighting. Two-tone palette of warm white bolt with coral pink edges and
yellow electric core, -10% -15%. Container: aged wooden desk. Composition:
bolt 75%, accessories 15%, desk 10%. Brush strokes throughout. Hand-drawn
imperfections. Negative prompt: flat 2D, vector, icon, line art, photorealistic,
plastic, neon, oversaturated, low quality, text, watermark, AI generated.
Suffix: perfect watercolor painting, hand-crafted, reference April Kuan,
trending on Behance.
```

---

## F. 心情贴纸图标（5 张 SVG）⭐ 中优先级

> **位置**: `/assets/icons/` ｜ **画布**: 48×48px ｜ **容器**: 微缩叙事容器
> **设计要点**: 笑脸精致有腮红（粉色小圆点），心形有高光

### F1. smile-lemon.svg — 开心
```
Hand-painted watercolor impasto on 300gsm cotton paper. Subject: a round
smiley face with two closed curved happy eyes (like ^^), big open smile
showing teeth, two pink blush dots on cheeks, soft watercolor depth on
the face sphere, glossy surface with impasto highlight on top, a tiny
pressed daisy beside, a small watercolor droplet, a soft gold particle,
a faint sparkle star. Three-point lighting. Two-tone palette of warm
golden yellow face and pink blush, -10% -15%. Container: aged wooden
windowsill. Composition: face 75%, accessories 15%, sill 10%. Brush
strokes throughout. Hand-drawn imperfections. Negative prompt: flat 2D,
vector, icon, line art, photorealistic, plastic, neon, oversaturated,
low quality, text, watermark, AI generated. Suffix: perfect watercolor
painting, hand-crafted, reference Heidi Willis, trending on Behance.
```

### F2. meh-brand.svg — 平静
```
Hand-painted watercolor impasto on 300gsm cotton paper. Subject: a round
neutral face with two small dot eyes and a straight line mouth, calm
expression, soft watercolor depth on the face sphere, glossy surface with
subtle impasto highlight, a tiny pressed sage leaf, a small watercolor
droplet, a soft gold particle, a faint pencil underline. Three-point
lighting. Two-tone palette of warm mint green face and dark gray features,
-10% -15%. Container: aged wooden desk. Composition: face 75%, accessories
15%, desk 10%. Brush strokes throughout. Hand-drawn imperfections.
Negative prompt: flat 2D, vector, icon, line art, photorealistic, plastic,
neon, oversaturated, low quality, text, watermark, AI generated. Suffix:
perfect watercolor painting, hand-crafted, reference April Kuan.
```

### F3. sparkles-coral.svg — 惊喜
```
Hand-painted watercolor impasto on 300gsm cotton paper. Subject: a round
face with two large round wide-open eyes and small O-shaped surprised
mouth, two small sparkle stars beside the head indicating surprise,
soft watercolor depth, glossy surface with impasto highlight, a tiny
pressed wildflower, a small watercolor droplet, a soft gold particle.
Three-point lighting. Two-tone palette of warm coral pink face and dark
eyes with yellow sparkle stars, -10% -15%. Container: aged wooden
windowsill. Composition: face 75%, accessories 15%, sill 10%. Brush
strokes throughout. Hand-drawn imperfections. Negative prompt: flat 2D,
vector, icon, line art, photorealistic, plastic, neon, oversaturated,
low quality, text, watermark, AI generated. Suffix: perfect watercolor
painting, hand-crafted, reference Heidi Willis, trending on Behance.
```

### F4. heart-lavender.svg — 治愈
```
Hand-painted watercolor impasto on 300gsm cotton paper. Subject: a 3D
heart shape with rounded top lobes and pointed bottom, glossy lavender
surface with white impasto highlight arc on top-left lobe, soft drop
shadow, subtle watercolor volume suggesting depth, a tiny pressed lavender
flower, a small feather, a watercolor droplet, a soft gold particle.
Three-point lighting. Two-tone palette of warm lavender heart and cream
with sage accent, -10% -15%. Container: aged wooden desk. Composition:
heart 75%, accessories 15%, desk 10%. Brush strokes throughout. Hand-
drawn imperfections. Negative prompt: flat 2D, vector, icon, line art,
photorealistic, plastic, neon, oversaturated, low quality, text, watermark,
AI generated. Suffix: perfect watercolor painting, hand-crafted, reference
Heidi Willis, trending on Behance.
```

### F5. laugh-sky.svg — 好玩
```
Hand-painted watercolor impasto on 300gsm cotton paper. Subject: a round
laughing face with two closed squinted happy eyes and big open mouth
laughing (visible tongue), two pink blush dots on cheeks, soft watercolor
depth on the face sphere, glossy surface with impasto highlight, a tiny
pressed daisy, a small watercolor droplet, a soft gold particle, a faint
sparkle star. Three-point lighting. Two-tone palette of warm sky blue
face and pink blush, -10% -15%. Container: aged wooden windowsill.
Composition: face 75%, accessories 15%, sill 10%. Brush strokes throughout.
Hand-drawn imperfections. Negative prompt: flat 2D, vector, icon, line
art, photorealistic, plastic, neon, oversaturated, low quality, text,
watermark, AI generated. Suffix: perfect watercolor painting, hand-
crafted, reference Heidi Willis, trending on Behance.
```

---

## G. 徽章图标（9 张 SVG）⭐ 高优先级

> **位置**: `/assets/icons/` ｜ **画布**: 64×64px ｜ **容器**: 微缩叙事容器（**比普通图标大，圆角更柔和**）
> **设计要点**: 整体要有**奖牌/勋章质感**——金属高光、水彩层叠、3px 描边、装饰丝带

### G1. badge-first-escape.svg — 初次出逃
```
Hand-painted watercolor impasto on 300gsm cotton paper. Subject: a
five-pointed gold star medal with slightly asymmetric hand-craft feel,
visible watercolor depth (3px thick), small embossed center dot, polished
metallic gold surface with bright impasto highlight on top points, soft
drop shadow, decorative ribbon banner at the bottom with "V1" inscribed
in watercolor, a tiny pressed leaf on the ribbon, a small twine bow at
the medal top, a watercolor droplet, a soft gold shimmer particle. Three-
point lighting with stronger 4500K key. Two-tone palette of rich gold
star and cream with brass accent, -10% -15%. Container: aged wooden
windowsill with hand-sketched edges. Composition: medal 75%, accessories
15%, sill 10%. Brush strokes: impasto on star points and ribbon highlight,
wet-on-wet on medal body, dry brush on ribbon texture, splatter and
bleeds. Hand-drawn imperfections throughout. Negative prompt: flat 2D,
vector, icon, line art, photorealistic, plastic, neon, oversaturated,
low quality, text, watermark, AI generated. Suffix: perfect watercolor
painting, hand-crafted, reference April Kuan, trending on Behance.
```

### G2. badge-seven-streak.svg — 七连胜
```
Hand-painted watercolor impasto on 300gsm cotton paper. Subject: a mint
green circular medal with prominent embossed numeral "7" in the center,
two curved laurel leaf branches flanking the number, watercolor embossed
relief effect on the number and leaves, polished metallic surface with
impasto highlight, decorative ribbon at the top with twine bow, a tiny
pressed clover on the ribbon, a small watercolor droplet, a soft gold
particle. Three-point lighting. Two-tone palette of mint green medal and
white "7" with sage leaves, -10% -15%. Container: aged wooden desk.
Composition: medal 75%, accessories 15%, desk 10%. Brush strokes
throughout. Hand-drawn imperfections. Negative prompt: flat 2D, vector,
icon, line art, photorealistic, plastic, neon, oversaturated, low quality,
text, watermark, AI generated. Suffix: perfect watercolor painting,
hand-crafted, reference April Kuan, trending on Behance.
```

### G3. badge-thirty-streak.svg — 月度漫游家
```
Hand-painted watercolor impasto on 300gsm cotton paper. Subject: a
circular medal with an open laurel wreath forming an arc, each laurel
leaf showing watercolor vein detail and embossed relief, small central
star at the bottom of the wreath, polished metallic surface with bright
impasto highlight, decorative ribbon at the top, a tiny pressed sage
leaf on the ribbon, a small watercolor droplet, a soft gold particle.
Three-point lighting. Two-tone palette of rich lavender medal and white
wreath with gold center star, -10% -15%. Container: aged wooden windowsill.
Composition: medal 75%, accessories 15%, sill 10%. Brush strokes
throughout. Hand-drawn imperfections. Negative prompt: flat 2D, vector,
icon, line art, photorealistic, plastic, neon, oversaturated, low quality,
text, watermark, AI generated. Suffix: perfect watercolor painting,
hand-crafted, reference April Kuan, trending on Behance.
```

### G4. badge-color-hunter.svg — 蓝色猎人
```
Hand-painted watercolor impasto on 300gsm cotton paper. Subject: a
circular medal with embossed eye in the center, complete with iris
(blue), pupil, upper and lower eyelashes, watercolor embossed relief on
the eye giving sculpted feel, polished metallic surface with impasto
highlight, decorative ribbon at the top, a tiny pressed bluebell, a
small watercolor droplet, a soft gold particle. Three-point lighting.
Two-tone palette of rich sky blue medal and white eye with blue iris,
-10% -15%. Container: aged wooden desk. Composition: medal 75%, accessories
15%, desk 10%. Brush strokes throughout. Hand-drawn imperfections.
Negative prompt: flat 2D, vector, icon, line art, photorealistic, plastic,
neon, oversaturated, low quality, text, watermark, AI generated. Suffix:
perfect watercolor painting, hand-crafted, reference Heidi Willis.
```

### G5. badge-night-walker.svg — 夜行者
```
Hand-painted watercolor impasto on 300gsm cotton paper. Subject: a
circular medal with embossed crescent moon and a small twinkling star
beside it, both with watercolor embossed relief, polished metallic
surface with starry night feel (subtle glitter), decorative ribbon at
the top, a tiny pressed evening primrose, a small watercolor droplet,
a soft gold particle. Three-point lighting. Two-tone palette of rich
deep gray medal and white moon with yellow star, -10% -15%. Container:
aged wooden windowsill. Composition: medal 75%, accessories 15%, sill
10%. Brush strokes throughout. Hand-drawn imperfections. Negative prompt:
flat 2D, vector, icon, line art, photorealistic, plastic, neon, oversaturated,
low quality, text, watermark, AI generated. Suffix: perfect watercolor
painting, hand-crafted, reference Heidi Willis, trending on Behance.
```

### G6. badge-rainy-walker.svg — 雨天漫步者
```
Hand-painted watercolor impasto on 300gsm cotton paper. Subject: a
circular medal with embossed open umbrella (showing curved ribs and
handle) and three raindrops falling beneath, each with watercolor embossed
relief, polished metallic surface with impasto highlight, decorative
ribbon at the top, a tiny pressed fern, a small watercolor droplet, a
soft blue particle. Three-point lighting. Two-tone palette of rich sky
blue medal and white umbrella with blue raindrops, -10% -15%. Container:
aged wooden desk. Composition: medal 75%, accessories 15%, desk 10%.
Brush strokes throughout. Hand-drawn imperfections. Negative prompt:
flat 2D, vector, icon, line art, photorealistic, plastic, neon, oversaturated,
low quality, text, watermark, AI generated. Suffix: perfect watercolor
painting, hand-crafted, reference April Kuan, trending on Behance.
```

### G7. badge-market-regular.svg — 菜市场熟客
```
Hand-painted watercolor impasto on 300gsm cotton paper. Subject: a
circular medal with embossed woven basket (showing weave pattern) containing
a carrot with green leaves and a small radish, all with watercolor
embossed relief, polished metallic surface with warm impasto highlight,
decorative ribbon at the top, a tiny dried herb sprig on the ribbon, a
small pressed leaf, a watercolor droplet, a soft gold particle. Three-
point lighting. Two-tone palette of rich coral orange medal and cream
basket with orange carrot and green leaves, -10% -15%. Container: rattan
tray. Composition: medal 75%, accessories 15%, tray 10%. Brush strokes
throughout. Hand-drawn imperfections. Negative prompt: flat 2D, vector,
icon, line art, photorealistic, plastic, neon, oversaturated, low quality,
text, watermark, AI generated. Suffix: perfect watercolor painting,
hand-crafted, reference Anne Marie Zanetti, trending on Behance.
```

### G8. badge-city-detective.svg — 城市侦探
```
Hand-painted watercolor impasto on 300gsm cotton paper. Subject: a
circular medal with embossed magnifying glass (showing frame, lens, angled
handle) and a small simplified house visible inside the lens, all with
watercolor embossed relief, polished metallic surface with bright impasto
highlight, decorative ribbon at the top, a tiny pressed clover on the
ribbon, a small watercolor droplet, a soft gold particle. Three-point
lighting. Two-tone palette of rich gold medal and cream magnifier with
tiny red house, -10% -15%. Container: aged wooden desk. Composition:
medal 75%, accessories 15%, desk 10%. Brush strokes throughout. Hand-
drawn imperfections. Negative prompt: flat 2D, vector, icon, line art,
photorealistic, plastic, neon, oversaturated, low quality, text, watermark,
AI generated. Suffix: perfect watercolor painting, hand-crafted, reference
April Kuan, trending on Behance.
```

### G9. badge-member-pro.svg — 出逃会员
```
Hand-painted watercolor impasto on 300gsm cotton paper. Subject: a
circular medal with embossed royal crown (three points, middle tallest)
topped with a small round gem, watercolor embossed relief on each crown
point, polished metallic surface with luxurious impasto highlight, decorative
ribbon at the top, a tiny pressed sage leaf on the ribbon, a small
watercolor droplet, a soft gold particle. Three-point lighting. Two-tone
palette of rich dark charcoal medal and gold crown with yellow gem, -10%
-15%. Container: aged wooden windowsill. Composition: medal 75%, accessories
15%, sill 10%. Brush strokes throughout. Hand-drawn imperfections.
Negative prompt: flat 2D, vector, icon, line art, photorealistic, plastic,
neon, oversaturated, low quality, text, watermark, AI generated. Suffix:
perfect watercolor painting, hand-crafted, reference April Kuan, trending
on Behance.
```

---

## H. 地图标记图标（6 张 SVG）⭐ 中优先级

> **位置**: `/assets/icons/` ｜ **画布**: 48×48px ｜ **容器**: 微缩叙事容器
> **设计要点**: 水滴形外框，有水彩晕染渐变，顶部白色厚涂高光点

### H1. pin-color.svg — 颜色探索
```
Hand-painted watercolor impasto on 300gsm cotton paper. Subject: a 3D
water-drop map pin (rounded top, pointed bottom) with watercolor gradient
from top light to bottom dark, glossy sky blue surface with white impasto
highlight on top curve, small circular hole in center showing a tiny
artist palette, a small pressed leaf beside the pin, a watercolor droplet,
a soft gold particle, a twine bow at the pin base. Three-point lighting.
Two-tone palette of rich sky blue and cream with sage accent, -10% -15%.
Container: aged wooden windowsill. Composition: pin 75%, accessories
15%, sill 10%. Brush strokes throughout. Hand-drawn imperfections.
Negative prompt: flat 2D, vector, icon, line art, photorealistic, plastic,
neon, oversaturated, low quality, text, watermark, AI generated. Suffix:
perfect watercolor painting, hand-crafted, reference April Kuan.
```

### H2. pin-walk.svg — 漫步发现
```
Hand-painted watercolor impasto on 300gsm cotton paper. Subject: a 3D
water-drop map pin with watercolor gradient, glossy coral orange surface
with white impasto highlight, small circular hole showing a tiny footprint,
a small pressed beach grass blade, a watercolor droplet, a soft gold
particle, a twine bow at the pin base. Three-point lighting. Two-tone
palette of rich coral orange and cream with sand accent, -10% -15%.
Container: rattan tray. Composition: pin 75%, accessories 15%, tray 10%.
Brush strokes throughout. Hand-drawn imperfections. Negative prompt: flat
2D, vector, icon, line art, photorealistic, plastic, neon, oversaturated,
low quality, text, watermark, AI generated. Suffix: perfect watercolor
painting, hand-crafted, reference April Kuan, trending on Behance.
```

### H3. pin-sense.svg — 感官体验
```
Hand-painted watercolor impasto on 300gsm cotton paper. Subject: a 3D
water-drop map pin with watercolor gradient, glossy lavender surface with
white impasto highlight, small circular hole showing a tiny music note,
a small pressed lavender, a watercolor droplet, a soft gold particle, a
twine bow at the pin base. Three-point lighting. Two-tone palette of
rich lavender and cream with sage accent, -10% -15%. Container: aged
wooden desk. Composition: pin 75%, accessories 15%, desk 10%. Brush
strokes throughout. Hand-drawn imperfections. Negative prompt: flat 2D,
vector, icon, line art, photorealistic, plastic, neon, oversaturated,
low quality, text, watermark, AI generated. Suffix: perfect watercolor
painting, hand-crafted, reference Heidi Willis, trending on Behance.
```

### H4. pin-collect.svg — 收藏拼贴
```
Hand-painted watercolor impasto on 300gsm cotton paper. Subject: a 3D
water-drop map pin with watercolor gradient, glossy warm gold surface
with white impasto highlight, small circular hole showing a tiny bookmark,
a small pressed maple leaf, a watercolor droplet, a soft gold particle,
a twine bow at the pin base. Three-point lighting. Two-tone palette of
rich warm gold and cream with brass accent, -10% -15%. Container: aged
wooden desk. Composition: pin 75%, accessories 15%, desk 10%. Brush
strokes throughout. Hand-drawn imperfections. Negative prompt: flat 2D,
vector, icon, line art, photorealistic, plastic, neon, oversaturated,
low quality, text, watermark, AI generated. Suffix: perfect watercolor
painting, hand-crafted, reference April Kuan, trending on Behance.
```

### H5. pin-food.svg — 美食探索
```
Hand-painted watercolor impasto on 300gsm cotton paper. Subject: a 3D
water-drop map pin with watercolor gradient, glossy earth brown surface
with white impasto highlight, small circular hole showing a tiny coffee
cup, a small cinnamon stick, a pressed coffee bean, a watercolor droplet,
a soft gold particle. Three-point lighting. Two-tone palette of rich earth
brown and cream with cinnamon accent, -10% -15%. Container: linen-covered
table. Composition: pin 75%, accessories 15%, linen 10%. Brush strokes
throughout. Hand-drawn imperfections. Negative prompt: flat 2D, vector,
icon, line art, photorealistic, plastic, neon, oversaturated, low quality,
text, watermark, AI generated. Suffix: perfect watercolor painting,
hand-crafted, reference Anne Marie Zanetti, trending on Behance.
```

### H6. pin-culture.svg — 如实文化
```
Hand-painted watercolor impasto on 300gsm cotton paper. Subject: a 3D
water-drop map pin with watercolor gradient, glossy mint green surface
with white impasto highlight, small circular hole showing a tiny building
with columns, a small pressed sage leaf, a watercolor droplet, a soft
gold particle, a twine bow at the pin base. Three-point lighting. Two-
tone palette of rich mint green and cream with sage accent, -10% -15%.
Container: aged wooden windowsill. Composition: pin 75%, accessories
15%, sill 10%. Brush strokes throughout. Hand-drawn imperfections.
Negative prompt: flat 2D, vector, icon, line art, photorealistic, plastic,
neon, oversaturated, low quality, text, watermark, AI generated. Suffix:
perfect watercolor painting, hand-crafted, reference April Kuan, trending
on Behance.
```

---

## I. 执行步骤图标（4 张 SVG）⭐ 中优先级

> **位置**: `/assets/icons/` ｜ **画布**: 48×48px ｜ **容器**: 微缩叙事容器

### I1. step-leave.svg — 出发
```
Hand-painted watercolor impasto on 300gsm cotton paper. Subject: a wooden
door (slightly ajar, showing warm light through the gap) with brass handle
and a small mint green arrow icon beside it pointing outward, soft drop
shadow, glossy wood surface with visible grain, a tiny pressed leaf on
the threshold, a small watercolor droplet, a soft gold particle, a twine
bow on the door handle. Three-point lighting. Two-tone palette of warm
beige wood and brass with mint green arrow, -10% -15%. Container: aged
wooden windowsill. Composition: door 75%, accessories 15%, sill 10%.
Brush strokes throughout. Hand-drawn imperfections. Negative prompt: flat
2D, vector, icon, line art, photorealistic, plastic, neon, oversaturated,
low quality, text, watermark, AI generated. Suffix: perfect watercolor
painting, hand-crafted, reference April Kuan, trending on Behance.
```

### I2. step-explore.svg — 探索
```
Hand-painted watercolor impasto on 300gsm cotton paper. Subject: a radar
dish (curved dish on a small base) emitting concentric circular wave
lines, with one bright yellow sweep line indicating active scan, small
dot at the center showing emission source, a tiny pressed leaf beside
the dish, a small watercolor droplet, a soft gold particle, a brass
screw detail. Three-point lighting. Two-tone palette of sky blue radar
dish and yellow sweep line with brass accent, -10% -15%. Container: aged
wooden desk. Composition: radar 75%, accessories 15%, desk 10%. Brush
strokes throughout. Hand-drawn imperfections. Negative prompt: flat 2D,
vector, icon, line art, photorealistic, plastic, neon, oversaturated,
low quality, text, watermark, AI generated. Suffix: perfect watercolor
painting, hand-crafted, reference April Kuan, trending on Behance.
```

### I3. step-discover.svg — 发现
```
Hand-painted watercolor impasto on 300gsm cotton paper. Subject: a
magnifying glass (round lens with gold frame, angled wooden handle) with
a small sparkle star inside the lens indicating a discovery, soft drop
shadow, glossy glass surface with impasto reflection, a tiny pressed
leaf beside the handle, a small watercolor droplet, a soft gold particle,
a faint sparkle star. Three-point lighting. Two-tone palette of warm
gold frame and wooden handle with yellow sparkle, -10% -15%. Container:
aged wooden desk. Composition: magnifier 75%, accessories 15%, desk
10%. Brush strokes throughout. Hand-drawn imperfections. Negative prompt:
flat 2D, vector, icon, line art, photorealistic, plastic, neon, oversaturated,
low quality, text, watermark, AI generated. Suffix: perfect watercolor
painting, hand-crafted, reference Heidi Willis, trending on Behance.
```

### I4. step-record.svg — 记录
```
Hand-painted watercolor impasto on 300gsm cotton paper. Subject: an open
spiral notebook showing two cream pages with three hand-written lines,
a pencil resting on the right page diagonally, soft drop shadow, visible
spiral binding on the left, a tiny pressed sage leaf as a bookmark, a
small watercolor droplet, a soft gold particle, an eraser shaving curl.
Three-point lighting. Two-tone palette of cream pages and brown spiral
binding with warm yellow pencil, -10% -15%. Container: aged wooden
windowsill. Composition: notebook 75%, accessories 15%, sill 10%. Brush
strokes throughout. Hand-drawn imperfections. Negative prompt: flat 2D,
vector, icon, line art, photorealistic, plastic, neon, oversaturated,
low quality, text, watermark, AI generated. Suffix: perfect watercolor
painting, hand-crafted, reference Anne Marie Zanetti, trending on Behance.
```

---

## J. 会员页图标（3 张 SVG）⭐ 低优先级

> **位置**: `/assets/icons/` ｜ **画布**: 48×48px ｜ **容器**: 微缩叙事容器

### J1. users-lavender.svg — 双人出逃
```
Hand-painted watercolor impasto on 300gsm cotton paper. Subject: two
friendly human bust silhouettes slightly overlapping (one slightly behind
the other), each with rounded head and soft shoulders, both smiling
gently, visible neckline of soft sweaters (one lavender, one cream), a
tiny pressed lavender flower, a delicate twine necklace with brass leaf
pendant, a small watercolor earring, a faint gold particle. Three-point
lighting. Two-tone palette of warm skin tones and lavender/cream sweaters
with brass accent, -10% -15%. Container: aged wooden desk. Composition:
busts 75%, accessories 15%, desk 10%. Brush strokes throughout. Hand-
drawn imperfections. Negative prompt: flat 2D, vector, icon, line art,
photorealistic, plastic, neon, oversaturated, low quality, text, watermark,
AI generated. Suffix: perfect watercolor painting, hand-crafted, reference
Heidi Willis, trending on Behance.
```

### J2. award-lemon.svg — 专属徽章
```
Hand-painted watercolor impasto on 300gsm cotton paper. Subject: a
circular medal with embossed star in the center, two decorative ribbon
tails flowing from the bottom of the medal, watercolor embossed relief
on the star, polished metallic surface with bright impasto highlight, a
tiny pressed daisy on the ribbon, a small watercolor droplet, a soft
gold particle, a twine bow at the medal top. Three-point lighting. Two-
tone palette of warm golden yellow medal and cream ribbons, -10% -15%.
Container: aged wooden windowsill. Composition: medal 75%, accessories
15%, sill 10%. Brush strokes throughout. Hand-drawn imperfections.
Negative prompt: flat 2D, vector, icon, line art, photorealistic, plastic,
neon, oversaturated, low quality, text, watermark, AI generated. Suffix:
perfect watercolor painting, hand-crafted, reference April Kuan.
```

### J3. cloud-rain-sky.svg — 云端备份
```
Hand-painted watercolor impasto on 300gsm cotton paper. Subject: a fluffy
cloud (two layers for depth) with a downward-pointing arrow inside the
cloud, three small dots beside the arrow suggesting data flow, soft drop
shadow, glossy cloud surface with impasto highlight, a tiny pressed leaf,
a small watercolor droplet, a soft blue particle, a faint sparkle star.
Three-point lighting. Two-tone palette of soft white cloud and sky blue
arrow, -10% -15%. Container: aged wooden desk. Composition: cloud 75%,
accessories 15%, desk 10%. Brush strokes throughout. Hand-drawn imperfections.
Negative prompt: flat 2D, vector, icon, line art, photorealistic, plastic,
neon, oversaturated, low quality, text, watermark, AI generated. Suffix:
perfect watercolor painting, hand-crafted, reference April Kuan.
```

---

## K. 空状态图标（2 张 SVG）⭐ 低优先级

> **位置**: `/assets/icons/` ｜ **画布**: 48×48px ｜ **容器**: 微缩叙事容器
> **设计要点**: 空状态图标色调偏淡（不抢眼），饱和度进一步降低

### K1. empty-collection.svg — 收藏页空
```
Hand-painted watercolor impasto on 300gsm cotton paper, with reduced
saturation for empty-state mood. Subject: an empty polaroid photo frame
(white border, soft gray center area where photo would be) with a small
pencil resting beside it diagonally, soft drop shadow, paper texture on
the polaroid border, a tiny pressed sage leaf, a small watercolor droplet,
a faint pencil underline, a soft gold particle. Three-point lighting
with reduced intensity. Two-tone palette of pale light gray polaroid
and pencil with sage green leaf, -25% -20% (extra faded). Container: aged
wooden windowsill. Composition: frame 75%, accessories 15%, sill 10%.
Brush strokes throughout. Hand-drawn imperfections. Negative prompt: flat
2D, vector, icon, line art, photorealistic, plastic, neon, oversaturated,
saturated, low quality, text, watermark, AI generated. Suffix: perfect
watercolor painting, hand-crafted, reference April Kuan, faded and
unobtrusive, trending on Behance.
```

### K2. empty-map.svg — 地图页空
```
Hand-painted watercolor impasto on 300gsm cotton paper, with reduced
saturation for empty-state mood. Subject: a folded paper map (three
panels) with a small location pin marker beside it (no specific location),
visible crease lines between panels, soft drop shadow, paper texture, a
tiny pressed leaf, a small watercolor droplet, a soft blue particle, a
faint pencil mark. Three-point lighting with reduced intensity. Two-tone
palette of faded pale blue map and light gray pin, -25% -20% (extra
faded). Container: aged wooden desk. Composition: map 75%, accessories
15%, desk 10%. Brush strokes throughout. Hand-drawn imperfections. Negative
prompt: flat 2D, vector, icon, line art, photorealistic, plastic, neon,
oversaturated, saturated, low quality, text, watermark, AI generated.
Suffix: perfect watercolor painting, hand-crafted, reference April Kuan,
faded and unobtrusive, trending on Behance.
```

---

## L. 场景插画（6 张 WebP）⭐ 高优先级 → **改为 AI 运行时生成**

> **位置**: `/assets/images/` ｜ **格式**: WebP 质量 85% ｜ **尺寸**: 750×400px（3:2 横版）
> **引用**: `utils/constants.js`（TYPE_META.scene）
> **改造**: 由固定 webp 改为运行时调用 AI 接口生成（详见 [AI-IMAGE-INTEGRATION.md](file:///d:/TRAEWork/Projects/出逃指令/escape-command/docs/AI-IMAGE-INTEGRATION.md)）
> **下方 prompt 是兜底占位图，运行时由 utils/ai-prompt.js 动态拼装**

### L1. color-scene — 颜色探索
```
A wide-aspect hand-painted watercolor impasto illustration on 300gsm
cold-press cotton paper. Scene: a person standing at a street corner
looking up at a colorful mural on a building wall, warm afternoon sunlight
casting dappled shadows, blue tones dominant with orange and yellow
accents, a small pressed leaf falling, a watercolor droplet, a soft
gold particle, a tiny piece of torn poster. Three-point lighting with
strong 4500K key, visible brush strokes (wet-on-wet 60%, dry brush 30%,
impasto 10%), paper texture showing through, color bleeding at edges,
impasto highlights on the mural paint, 2-3 splatter droplets, 1-2 bleeds.
Hand-drawn imperfections: edge wobble, 2 incomplete closures, 1 bleed.
Cozy and healing atmosphere, rich details, layered composition with depth,
editorial illustration quality, no text, no UI elements, hand-crafted feel,
warm and inviting mood, 3:2 aspect ratio. Reference April Kuan and Anne
Marie Zanetti watercolor portfolio. Trending on Behance watercolor tag.
Negative prompt: flat 2D, vector art, geometric, minimalist, abstract,
photorealistic, 3D render, plastic, neon, oversaturated, low quality,
text, watermark, AI generated.
```

### L2. walk-scene — 漫步发现
```
A wide-aspect hand-painted watercolor impasto illustration on 300gsm
cold-press cotton paper. Scene: a quiet tree-lined street with sycamore
trees, a person walking leisurely in the distance, old buildings on both
sides with visible window details, warm afternoon light filtering through
leaves creating dappled shadows on the ground, a tiny pressed leaf
falling, a small watercolor droplet, a soft gold particle, a small pebble
on the path. Three-point lighting, visible brush strokes, paper texture,
color bleeding at edges, impasto on sunlight spots, splatter and bleeds.
Hand-drawn imperfections. Cozy and healing atmosphere, rich details,
layered composition with depth, editorial quality, no text, no UI elements,
hand-crafted feel, 3:2 aspect ratio. Reference Anne Marie Zanetti and
Heidi Willis. Trending on Behance watercolor tag.
```

### L3. sense-scene — 感官体验
```
A wide-aspect hand-painted watercolor impasto illustration on 300gsm
cold-press cotton paper. Scene: a person sitting on a park bench under a
large tree with eyes closed in contemplation, soft breeze suggested by
gently moving leaves with subtle watercolor sway, distant birds and quiet
atmosphere, warm purple and lavender tones with soft pink accents, a tiny
pressed lavender flower, a small feather falling, a watercolor droplet,
a soft gold particle. Three-point lighting, visible brush strokes, paper
texture, color bleeding, impasto on the tree trunk, splatter and bleeds.
Hand-drawn imperfections. Cozy and healing mood, layered composition with
depth, editorial quality, no text, no UI elements, hand-crafted feel, 3:2
aspect ratio. Reference Heidi Willis. Trending on Behance watercolor tag.
```

### L4. collect-scene — 收藏拼贴
```
A wide-aspect hand-painted watercolor impasto illustration on 300gsm
cold-press cotton paper. Scene: a small collection of found objects
arranged on a wooden surface - a pretty leaf, a smooth stone, a small
flower, a feather, with subtle watercolor volume on each object, soft
warm lighting from a nearby window casting soft shadows, a tiny postcard
stamp, a small pressed maple leaf, a watercolor droplet, a soft gold
particle, a piece of twine. Golden and yellow tones with brown accents,
visible brush strokes, paper texture, color bleeding, impasto on object
highlights, splatter and bleeds. Hand-drawn imperfections. Cozy and
healing atmosphere, rich details, editorial quality, no text, no UI
elements, hand-crafted feel, 3:2 aspect ratio. Reference Anne Marie
Zanetti. Trending on Behance watercolor tag.
```

### L5. food-scene — 美食探索
```
A wide-aspect hand-painted watercolor impasto illustration on 300gsm
cold-press cotton paper. Scene: a small cozy cafe interior with steam
rising from a coffee cup on a wooden table, a plate of simple food nearby
with subtle watercolor volume, soft window light, warm brown and orange
tones with cream accents, a tiny cinnamon stick, a small pressed coffee
bean, a watercolor droplet, a soft gold particle, a piece of sugar cube.
Visible brush strokes, paper texture, color bleeding, impasto on coffee
highlight and steam, splatter and bleeds. Hand-drawn imperfections. Cozy
and inviting atmosphere, rich details, editorial quality, no text, no UI
elements, hand-crafted feel, 3:2 aspect ratio. Reference Anne Marie
Zanetti. Trending on Behance watercolor tag.
```

### L6. culture-scene — 如实文化
```
A wide-aspect hand-painted watercolor impasto illustration on 300gsm
cold-press cotton paper. Scene: a person standing in front of an old
cultural building or museum entrance looking up at the facade, warm golden
afternoon light, classical architecture with subtle watercolor volume on
columns and ornaments, mint green and warm beige tones with gold accents,
a tiny pressed sage leaf, a small watercolor droplet, a soft gold particle,
a small piece of broken column fragment. Three-point lighting, visible
brush strokes, paper texture, color bleeding, impasto on column highlights,
splatter and bleeds. Hand-drawn imperfections. Cozy and contemplative
atmosphere, rich details, editorial quality, no text, no UI elements,
hand-crafted feel, 3:2 aspect ratio. Reference April Kuan. Trending on
Behance watercolor tag.
```

---

## M. 其他配图（3 张 WebP）⭐ **保留固定**

> **位置**: `/assets/images/` ｜ **保留原因**: 这些是功能性图片，不需要差异化

### M1. avatar.webp — 默认头像
```
A hand-painted watercolor impasto illustration on 300gsm cotton paper, a
simple friendly avatar - a person with round face, soft smile, simple
hair with subtle watercolor volume, warm mint and cream color palette, a
tiny pressed sage leaf, a small watercolor droplet, a soft gold particle,
a faint sparkle star. Visible brush strokes, paper texture, color
bleeding, impasto on cheek highlight, splatter and bleeds. Hand-drawn
imperfections throughout. Cozy and inviting mood, no text, 200x200 px.
Reference Heidi Willis. Trending on Behance watercolor tag.
```

### M2. paper-texture.webp — 纸张纹理
```
A seamless tileable hand-painted watercolor paper texture on 300gsm
cotton paper, warm off-white color (#F4EFE3) with subtle warm gradient,
delicate fiber and grain details, soft hand-crafted feel, visible brush
stroke texture, subtle color bleeding at edges, no illustrations, no
text, 256x256 px tileable. Reference April Kuan paper texture work.
```

### M3. empty-collection.webp — 收藏空状态大图
```
A wide hand-painted watercolor impasto illustration on 300gsm cotton
paper, an empty open photo album with scattered polaroid frames waiting
to be filled, a small pen lying beside, a tiny pressed sage leaf, a small
watercolor droplet, a soft gold particle, a piece of twine. Warm cream
and beige tones, paper texture, soft brush strokes with subtle watercolor
volume on each polaroid, color bleeding at edges, impasto on pen highlight,
splatter and bleeds. Hand-drawn imperfections. Cozy and inviting mood,
no text, 600x400 px. Reference Anne Marie Zanetti. Trending on Behance
watercolor tag.
```

---

## 附加：v4 新增的 3 张图标

> 在上一轮 UI 精细化中已创建占位文件，按 v3 规范重设

### check-brand.svg — 品牌色对勾
```
Hand-painted watercolor impasto on 300gsm cotton paper. Subject: a thick
checkmark with rounded caps, vibrant mint green with bright impasto
highlight on top edge, a tiny twine bow tied to the top, a small pressed
mint leaf, a watercolor droplet, a soft gold particle. Three-point
lighting. Two-tone palette of mint green and cream with gold accent,
-10% -15%. Container: aged wooden windowsill. Composition: check 75%,
accessories 15%, sill 10%. Brush strokes throughout. Hand-drawn imperfections.
Negative prompt: flat 2D, vector, icon, line art, photorealistic, plastic,
neon, oversaturated, low quality, text, watermark, AI generated. Suffix:
perfect watercolor painting, hand-crafted, reference April Kuan, trending
on Behance.
```

### chevron-right-brand.svg — 品牌色右箭头
```
Hand-painted watercolor impasto on 300gsm cotton paper. Subject: a thick
right-pointing chevron arrow with rounded caps, vibrant mint green with
white impasto highlight, a tiny pressed leaf, a small watercolor droplet,
a soft gold particle, a twine knot detail. Three-point lighting. Two-
tone palette of mint green and cream with sage accent, -10% -15%. Container:
aged wooden desk. Composition: arrow 75%, accessories 15%, desk 10%.
Brush strokes throughout. Hand-drawn imperfections. Negative prompt: flat
2D, vector, icon, line art, photorealistic, plastic, neon, oversaturated,
low quality, text, watermark, AI generated. Suffix: perfect watercolor
painting, hand-crafted, reference April Kuan, trending on Behance.
```

### chevron-down-ink.svg — 深灰向下展开箭头
```
Hand-painted watercolor impasto on 300gsm cotton paper. Subject: a thick
down-pointing chevron arrow with rounded caps, dark warm gray with white
impasto highlight, a tiny pressed sage leaf, a small watercolor droplet,
a soft gold particle, a faint pencil underline. Three-point lighting.
Two-tone palette of dark warm gray and cream with sage accent, -10%
-15%. Container: aged wooden desk. Composition: arrow 75%, accessories
15%, desk 10%. Brush strokes throughout. Hand-drawn imperfections.
Negative prompt: flat 2D, vector, icon, line art, photorealistic, plastic,
neon, oversaturated, low quality, text, watermark, AI generated. Suffix:
perfect watercolor painting, hand-crafted, reference April Kuan.
```

---

## 工具推荐与批量生成流程

### 推荐工具组合

| 工具 | 用途 | 优势 |
|------|------|------|
| **Recraft v3** ⭐首选 | 67 个 SVG 图标 | 风格锁定、矢量输出、批量生成 |
| **Midjourney v6.1** | 6 张场景插画 | 插画质量最佳、风格化强 |
| **GPT-4o / DALL-E 3** | 备选生成 | 提示词理解力强 |
| **即梦 AI / 可灵** | 国内备用 | 中文提示词友好 |

### Recraft v3 风格锁定技巧

1. 先生成**最满意的 1 个图标**（如 A1 出逃默认态，prompt 已含完整 11 要素）
2. 点击生成的图 → "Use as style reference"
3. 后续所有图标都基于这个 style reference 生成
4. 容器和构图会自动保持一致

### 批量生成顺序（保证视觉一致）

1. **第 1 批（4 张基准）**：A1 tab-escape、A3 tab-map、A5 tab-profile、C1 droplet
   → 确定水彩厚涂主调性，验证 11 要素 prompt 有效性
2. **第 2 批（6 张类型）**：C1-C6 → 类型色统一
3. **第 3 批（6 张 TabBar）**：A1-A6 → TabBar 完整
4. **第 4 批（18 张导航/操作）**：B1-B18 → 复用 B1-B3 风格
5. **第 5 批（9 张徽章）**：G1-G9 → 徽章特殊规格
6. **第 6 批（剩余）**：D, E, F, H, I, J, K + 附加 3 张

### 质量自检清单（v3 升级）

每张生成后对照：

- [ ] **技法**：可见笔触（湿笔/干笔/厚涂）+ 纸纹 + 颜色晕染 ✓
- [ ] **主体完整性**：能一眼认出是什么（不是抽象）✓
- [ ] **微配件**：主体周围有 3-4 个装饰元素（叶、羽、星、水溅等）✓
- [ ] **立体感**：有可见的水彩层叠、明暗变化、笔触厚度 ✓
- [ ] **容器**：是微缩叙事环境（窗台/木桌/抽屉/托盘），有手绘边缘 ✓
- [ ] **笔触分布**：5 种笔触至少出现 3 种 ✓
- [ ] **手绘温度**：边缘 0.5-1px 抖动、不闭合、晕染溢出 ✓
- [ ] **配色**：双主调 + 1 高光，明度-10%、饱和度-15% ✓
- [ ] **风格统一**：与第 1 批主调一致 ✓
- [ ] **无 AI 痕迹**：没有 AI generated / vector / flat 2D 标签词 ✓

### 常见问题解决

| 问题 | v3 解决方案 |
|------|-----------|
| 主体残缺/断裂 | 在 prompt 加 "perfect closed shapes, no clipping" + "2 slightly incomplete closures (organic feel)" |
| 容器缺失/变形 | 明确"micro-narrative container: aged wooden windowsill"，强化"hand-sketched edges" |
| 风格不统一 | 用 Recraft style reference；所有图保持相同 seed 词 |
| 立体感不足 | 加"impasto highlight"+"watercolor depth"+"three-point lighting" |
| 太抽象/符号化 | 加具体物件描述（"twin braised jute mat"+"brass handle with verdigris patina"+"pressed maple leaf"） |
| 颜色饱和度过高 | 加"-10% brightness -15% saturation"+"muted earthy palette" |
| 缺少温度感 | 加"hand-drawn imperfections"+"0.5-1px edge wobble"+"2-3 watercolor bleeds" |
| 缺少笔触 | 加"wet-on-wet 60%, dry brush 30%, impasto 10%"+"visible brush strokes" |
| 缺少装饰 | 强制要求"3-4 micro-accessories"+"pick from [叶/羽/星/水溅/丝带/麻绳...]" |

---

## v3 vs v2 关键对比

| 维度 | v2（八要素） | v3（十一要素） |
|------|-------------|---------------|
| 技法 | 立体手绘 + 软体积 | **手绘水彩厚涂** + 5 种笔触分布 |
| 主体 | 类型+材质+细节+状态 (4) | **底层+上层+微配件3-4个+动态+环境** (5) |
| 光影 | 单顶光 | **三光源**（主+补+轮廓） |
| 容器 | 圆角矩形暖白底 | **微缩叙事环境**（窗台/木桌/抽屉/托盘） |
| 笔触 | 无 | **湿笔+干笔+厚涂+溅+晕染**（5 种） |
| 装饰 | 单主体 | **3-4 个微配件** + 28 种随机源 |
| 不完美 | 无 | **边缘抖动 + 不闭合 + 晕染溢出** |
| 负面 prompt | 11 词 | **27 词穷举** |
| 后缀 | 1 行 | **3 行**（质量+艺术家+平台） |
| 配色 | 普通饱和 | **明度-10%、饱和度-15%** |
| 单图 prompt 长度 | 60 词 | **180-220 词** |
| 整体感受 | 矢量感、机器感 | **画出来的、温度感强** |

---

## 待办

- [ ] 设计师/AI 工具按 v3 prompt 生成全部 76 张素材
- [ ] 6 张场景插画改为 AI 运行时生成（见 [AI-IMAGE-INTEGRATION.md](file:///d:/TRAEWork/Projects/出逃指令/escape-command/docs/AI-IMAGE-INTEGRATION.md)）
- [ ] 替换现有素材到 `assets/icons/` 和 `assets/images/`
- [ ] 真机预览验证视觉一致性
- [ ] 按 v3 质量自检清单逐张验收
- [ ] 若首批评测不通过，针对性补充"笔触关键词"和"艺术家引用"

---

**v3 变更总结**:
- 风格：立体手绘 → **手绘水彩厚涂**
- 容器：圆角矩形 → **微缩叙事环境**
- 主体：4 要素 → **5 要素 + 3-4 微配件**
- 光影：单顶光 → **三光源**
- 笔触：无 → **5 种笔触分布**
- 装饰：单主体 → **3-4 微配件 + 28 种随机源**
- 不完美：无 → **手绘抖动 + 不闭合 + 晕染**
- 负面 prompt：11 词 → **27 词**
- 后缀：1 行 → **3 行**（质量+艺术家+平台）
- prompt 长度：60 词 → **180-220 词**
