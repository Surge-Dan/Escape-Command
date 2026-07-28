# 同频骰子 33 Spec 推进路线图

> 立项日：2026-07-28
> 负责人：Daniel
> 分支基准：`origin/dev`（本地工作分支：`Daniel`）
> 模式：每细分功能 = 1 个 Spec + 1 个分支 + 1 次 PR
> 截止：30 号前可演示状态（不一定全部完成）

---

## 范围确认

共 33 个细分功能：

| 块 | 范围 | 数量 | 优先级分布 |
|---|---|---|---|
| A | 首页/启动（核心骰子入口、出逃方式选择） | 2 | P0×2 |
| B | 骰子生成系统 | 14 | P0×7 + P1×7 |
| C | 同频组局 | 19 | P1×13 + P2×6 |

不包含：
- 仓库级技术债（.gitignore、release-check 临时产物、私有配置）— 独立 PR
- 数据指标埋点（analytics-01）— 全员
- 与其他模块的同频项（地图类型筛选、徽章、隐私脱敏）— 跨模块，需先通知 owner

---

## 推进顺序（B 先于 A 与 C）

### 阶段 1：B 骰子生成引擎（14 Spec）
原因：生成引擎是 A 入口和 C 组局都依赖的内核。先把 B 打磨稳，后续都好接。

| Spec # | 分支 | 细分功能 | 优先级 | 状态 |
|---|---|---|---|---|
| B-01 | feature/generator-01 | 骰子动画 | P0 | **第一阶段，先做这个** |
| B-02 | feature/generator-02 | 生成加载文案 | P0 | |
| B-03 | feature/generator-03 | 条件校验 | P0 | |
| B-04 | feature/generator-05 | 营业时间校验 | P0 | |
| B-05 | feature/generator-11 | 安全风险过滤 | P0 | |
| B-06 | feature/generator-12 | 兜底任务 | P0 | |
| B-07 | feature/generator-04 | 天气校验 | P1 | |
| B-08 | feature/generator-06 | 地点去重 | P1 | |
| B-09 | feature/generator-07 | 历史体验去重 | P1 | |
| B-10 | feature/generator-08 | 难度匹配 | P1 | |
| B-11 | feature/generator-09 | 兴趣平衡 | P1 | |
| B-12 | feature/generator-10 | 结果质量评分 | P1 | |
| B-13 | feature/generator-13 | 任务解释 | P1 | |
| B-14 | feature/generator-14 | 个性化变量替换 | P1 | |

### 阶段 2：A 首页入口（2 Spec）
| Spec # | 分支 | 细分功能 | 优先级 | 状态 |
|---|---|---|---|---|
| A-01 | feature/home-02 | 核心骰子入口 | P0 | ✅ 合并到 `home-dice-entry-01` |
| A-02 | feature/home-04 | 出逃方式选择（微逃/破圈/同频） | P0 | ✅ 合并到 `home-dice-entry-01` |

### 阶段 3：C 同频组局（19 Spec）
依赖：云函数轮询实时机制 + B 的多人剧本生成。

| Spec # | 分支 | 细分功能 | 优先级 | 状态 |
|---|---|---|---|---|
| C-01 | feature/group-01 | 创建出逃房间 | P1 | |
| C-02 | feature/group-02 | 微信邀请 | P1 | |
| C-03 | feature/group-03 | 成员列表 | P1 | |
| C-04 | feature/group-04 | 匿名偏好提交 | P1 | |
| C-05 | feature/group-05 | 时间投票 | P1 | |
| C-06 | feature/group-06 | 预算投票 | P1 | |
| C-07 | feature/group-07 | 出逃风格投票 | P1 | |
| C-08 | feature/group-08 | 多人剧本生成 | P1 | |
| C-09 | feature/group-11 | 到齐确认 | P1 | |
| C-10 | feature/group-12 | 临时退出 | P1 | |
| C-11 | feature/group-13 | 人数不足兜底 | P1 | |
| C-12 | feature/group-14 | 共同记录 | P1 | |
| C-13 | feature/group-15 | 共同城市底片 | P1 | |
| C-14 | feature/group-09 | 角色分配 | P2 | |
| C-15 | feature/group-10 | 独立线索 | P2 | |
| C-16 | feature/group-16 | 公开组局 | P2 | |
| C-17 | feature/group-17 | 申请加入 | P2 | |
| C-18 | feature/group-18 | 发起人审核 | P2 | |
| C-19 | feature/group-19 | 评价和举报 | P2 | |

---

## 后端能力选型（已与 Daniel 确认）

- B 阶段：使用 **云函数**（生成引擎 1 个）+ **云数据库**（指令池、用户偏好）
- C 阶段：使用 **云函数**（房间、成员、投票、记录）+ **云数据库** + **云函数轮询**（实时同步 2-3 秒延迟）
- 不使用：WebSocket 云函数（成本高、调试难）、云数据库 watch（30号前不验证）

---

## 跨模块联动注意事项

执行 Spec 时要留意与其他模块 owner 沟通：

- `feature/city-map-06` 类型筛选（微逃/破圈/同频）— A-02 的"出逃方式"会写入偏好，要让地图 owner 读
- `feature/profile-08` 同频伙伴 — C 完成后才能给 profile 提供数据
- `feature/badges-06` 同频伙伴徽章 — C 完成后由徽章 owner 读
- `feature/security-08` 家庭公司地址脱敏 — C 阶段所有定位相关都要走脱敏
- `feature/analytics-01` 核心漏斗埋点 — 摇骰子、生成、接受都要打点

---

## 30 号里程碑

30 号前目标：
- 阶段 1 的 6 个 P0 全部完成 + 入库（generator-01/02/03/05/11/12）
- 阶段 2 的 2 个 P0 全部完成
- 阶段 3 的 C-01/02/03/04/05/06/07/08 完成（创建/邀请/列表/匿名/三种投票/多人剧本）
- 30 号演示能力：单人完整骰子出逃 + 多人房间内 3 人投票

---

## 包体与资源红线（硬性纪律，违反 = Spec 退件）

来源：协作规范 + 微信开发者工具代码质量检测 2026-07-28 报警。

| 项 | 阈值 | 触发动作 |
|---|---|---|
| 主包总体积 | < 1.5 MB（不含插件） | 超 1.5M = Spec 退件，必须先瘦身再合并 |
| 单张图片/音频资源 | ≤ 200 KB | 单张超 200K = 退件（压缩、webp、cdn 化、移到分包） |
| 单字体文件 | ≤ 200 KB | 超线 = 退件（必须 subset/分包/按需加载） |
| 单插件大小 | ≤ 200 KB | 选更轻量替代 |
| 新增依赖包 | 每次 ≤ 30 KB | 引 Lottie/lodash 这类大库前必须 brainstorming 评估 |
| 截图/录屏/xlsx/预览 | 放仓库外（D:/Temp/ 或共享文档） | 仓库内即使被 .gitignore 也会被 release-check 扫到 |

### 自动门禁脚本

- `node scripts/check-bundle.js` —— 全仓自检模式（报警不 fail）
- `node scripts/check-bundle.js --base=origin/dev` —— PR 硬卡口（违规 = 退出码 1）

输出含 4 项：① 全仓资源统计 ② 历史问题清单（>200KB 单文件）③ 主包估算（字体+tabBar图标+wxml/wxss 静态引用+app.js 启动引用）④ 本次 PR 资源增量。

### 每个 Spec 落地前必答

1. 这次新增/修改会引入新图片/音频/插件吗？是 → 列出文件路径和大小
2. 这次新增/修改的代码增量（净增）是多少 KB？
3. 主包剩余余量多少？余量 < 50KB 时禁止引入新资源
4. 是否能复用现有 SVG/图标/资源？优先复用，零新增

### 提交前 checklist 必含项

- [ ] `node scripts/check-bundle.js --base=origin/dev` PR 资源检查通过
- [ ] 本次 PR 资源增量 = 0（确认无新增图片/音频/字体/插件）
- [ ] 引用资源全部复用现有 SVG/webp，零新增

### 主包瘦身（独立技术债 Spec，待认领）

现状（2026-07-28 报警时，check-bundle.js 自检实测）：

- **主包估算 1.57 MB**（超红线 70KB）—— 字体占 1.37MB
- **唯一超 200KB 单文件**：`assets/fonts/source-han-serif-cn-bold.woff2` 459.5KB
- 其他 9 个 woff2 分片 71-151KB，单文件未超但累计过大
- 14 张 webp 总 725KB（10 张 80-100KB 区间，接近 200KB 上限）
- 210 个 SVG 总 717KB（每个 3-5KB，OK）

可选路径：
- 路径 A：把 illustrations/webp 资源移到分包（按需加载）
- 路径 B：webp 转码压缩（tinyjpg/在线工具）目标 50% 体积
- 路径 C：CDN 化（云存储 URL 引用，资源不进包）
- 路径 D：**字体子集化** —— `source-han-serif-cn-bold.woff2` 459KB 可以拆为 5-6 个常用字子集（每个 ≤ 80KB），按需 wx.loadFontFace（首页现有 9 个分片就是这个思路，可以继续拆）
- 路径 E：9 个 L1/L2 woff2 分片已经做子集化但仍然过大，评估是否真的需要 bold weight 单独一个文件

**建议**：本轮所有 P0 完成后，开一个独立的「主包瘦身 Spec」，先量化再选路径。**不与 home-dice-entry-01 混在一起**。

---

## 流程约定（每 Spec 一次循环）

1. **brainstorming** 1 个问题，澄清范围
2. 写 `spec.md` + `tasks.md` + `checklist.md` 到 `.trae/specs/<change-id>/`
3. 等用户确认
4. 用 writing-plans 出实现计划
5. 在 `feature/<change-id>` 分支实现
6. 跑三个检查脚本：check-syntax / final-check / release-check
7. 微信开发者工具真机/P0 真机一次
8. PR → Squash merge → 删除分支 → 同步 main

---

## 当前进度

### 阶段 0：首页入口改造（优先做，因为是 B/C 的可见入口）

| Spec # | 分支 | 范围 | 状态 |
|---|---|---|---|
| **home-dice-entry-01** | `feature/home-02` | 首页 3 骰子 Cover Flow + 微逃细分弹窗 + 智能推荐时长 + 点击分流（微逃弹窗/破圈跳generating/同频跳房间） | **Spec 已完成，待用户审核** |

> 备注：本 Spec 合并了功能表序号 15（核心骰子入口）+ 序号 17（出逃方式选择）+ 部分 generator-08/09（智能推荐逻辑）。
> 原 `dice-animation-01` Spec 保留（generating 页动画），与本 Spec 并行不冲突。

### 阶段 1：B 骰子生成引擎（14 Spec）
