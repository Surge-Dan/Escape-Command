# 项目记忆 — WXSS / WXML 兼容性经验

## 关键约束

### WXSS 不支持的 CSS 特性
- `> *` 子选择器中的通配符 → WXSS 编译报错
  - 例：`.category-card > * { z-index: 1; }` 报 `error at token "+"`
  - 修复：改用具体子元素类名（`.category-card .child-a, .category-card .child-b`）
- `:scope` 不支持
- `attr()` 在 WXSS 表达式中不支持

### WXML inline style 颜色
- 8 位 hex（含 alpha）`#RRGGBBAA` 在 WXML inline style 中部分小程序版本不识别
- 替代方案：CSS 变量 + data-* 属性选择器，或用 `rgba(r,g,b,a)` 替代
- 例：`style="background: {{color}}14"` → 改用 `data-color="{{color}}"` + `.foo[data-color="#5CBF9E"] { --accent: #5CBF9E; }`

### 必须配置的项目设置
- `app.json` 必须有 `"lazyCodeLoading": "requiredComponents"`（启用组件按需注入）
- `project.config.json` 的 `packOptions.ignore` 必须显式排除非代码文件：
  - `docs/`（PRD/UI/UX 文档）
  - `.trae/`（spec 目录）
  - `.vscode/`（编辑器配置）
  - `OPTIMIZATION-PROMPT.md` 等 markdown 文件

### 兼容选择器
- `:not(.class)` 支持
- `:last-child` 支持
- `::before` / `::after` 伪元素支持（用于装饰性背景）
- `[data-attr="value"]` 属性选择器支持
- `backdrop-filter` 需配合 `-webkit-backdrop-filter` 前缀
- `filter: blur(Nrpx)` 支持

## 决策记录
- v5 改用 `data-accent` + `::before` 伪元素实现分类卡 tint
- v5 nav-header 升级 72rpx + 毛玻璃 `backdrop-filter: blur(40px) saturate(2)`
- v5 TabBar 紧凑到 130rpx
