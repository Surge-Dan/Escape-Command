# tests/gherkin/generator-flow.feature
# 出逃指令生成引擎 B-02~B-06 完整流程 BDD 场景
# 覆盖：加载文案 / 条件过滤 / 营业时间 / 安全风险 / 兜底任务 / 主入口 generate

Feature: 出逃指令生成引擎
  作为出逃者
  我想要根据时间、天气、偏好、POI 等条件
  生成一条安全、可达、不重复的出逃指令
  以便完成一次即兴出逃

  # ===== B-01: type → 骰子面映射 =====
  Scenario: 6 种 type 各自映射到唯一骰子面
    Given 6 种已知 type "color,sense,food,walk,collect,culture"
    When 调用 getFaceForType
    Then 每种 type 返回 1 到 6 的不同整数
    And color 映射到 1
    And culture 映射到 6

  Scenario: 未知 type 兜底为 1
    Given 未知 type "unknown"
    When 调用 getFaceForType
    Then 返回值为 1

  Scenario: 非字符串入参兜底为 1
    Given 非字符串入参 null、undefined、42
    When 调用 getFaceForType
    Then 全部返回 1

  # ===== B-02: 加载文案 =====
  Scenario: 深夜优先返回夜色文案
    Given 当前小时 23
    And 天气 "sunny"
    When 调用 getLoadingCopy
    Then 返回的文案来自 night 库

  Scenario: 凌晨也属于深夜时段
    Given 当前小时 3
    And 天气 "sunny"
    When 调用 getLoadingCopy
    Then 返回的文案来自 night 库

  Scenario: 雨天返回雨天文案
    Given 当前小时 14
    And 天气 "rainy"
    When 调用 getLoadingCopy
    Then 返回的文案来自 rainy 库

  Scenario: 晴朗白天按 mode + duration 选段
    Given 当前小时 14
    And 天气 "sunny"
    And 模式 "walk"
    And 时长 40
    When 调用 getLoadingCopy
    Then 返回的文案来自 walk.long 段

  Scenario: micro 模式短时长走 short 段
    Given 当前小时 14
    And 天气 "sunny"
    And 模式 "micro"
    And 时长 10
    When 调用 getLoadingCopy
    Then 返回的文案来自 micro.short 段

  Scenario: 未知 mode 走 default 库
    Given 当前小时 14
    And 天气 "sunny"
    And 模式 "unknown_mode"
    When 调用 getLoadingCopy
    Then 返回的文案来自 default 库

  Scenario: ctx 为空时也能返回文案
    Given ctx 为空
    When 调用 getLoadingCopy
    Then 返回非空字符串

  # ===== B-03: 条件过滤 =====
  Scenario: 已完成 90 天内的任务被过滤
    Given 任务池含 2 条任务 "A,B"
    And 任务 "A" 已完成且日期在 30 天前
    When 调用 filterByConditions
    Then 仅保留任务 "B"

  Scenario: 已完成超过 90 天的任务可再次出现
    Given 任务池含 2 条任务 "A,B"
    And 任务 "A" 已完成且日期在 100 天前
    When 调用 filterByConditions
    Then 保留 2 条任务

  Scenario: 已完成但无日期保守过滤
    Given 任务池含 2 条任务 "A,B"
    And 任务 "A" 已完成但无日期
    When 调用 filterByConditions
    Then 仅保留任务 "B"

  Scenario: 连续 2 次同类型触发类型抑制
    Given 任务池含 3 条 color 类型任务 "C1,C2,C3"
    And 上次 type "color"
    And 同类型连续计数 2
    When 调用 filterByConditions
    Then 全部 color 任务被过滤

  Scenario: POI 不可达的任务被过滤
    Given 任务池含 2 条任务 "A,B"
    And 任务 "A" 需要 POI "cafe"
    And nearbyPOI 中 "cafe" 不可达
    When 调用 filterByConditions
    Then 仅保留任务 "B"

  Scenario: POI 可达的任务被保留
    Given 任务池含 2 条任务 "A,B"
    And 任务 "A" 需要 POI "cafe"
    And nearbyPOI 中 "cafe" 可达
    When 调用 filterByConditions
    Then 保留 2 条任务

  Scenario: null POI 不触发过滤
    Given 任务池含 1 条任务 "A"
    And 任务 "A" 的 requirePOI 为 null
    When 调用 filterByConditions
    Then 保留 1 条任务

  Scenario: 字符串 null POI 不触发过滤
    Given 任务池含 1 条任务 "A"
    And 任务 "A" 的 requirePOI 为字符串 "null"
    When 调用 filterByConditions
    Then 保留 1 条任务

  Scenario: 非对象元素被过滤
    Given 任务池含 null、undefined、字符串、数字、空对象
    When 调用 filterByConditions
    Then 结果为空

  # ===== B-04: 营业时间过滤 =====
  Scenario: cafe 深夜 23 点过滤
    Given 任务池含 1 条 cafe 任务
    When 当前小时 23 调用 filterByBusinessHours
    Then 结果为空

  Scenario: cafe 上午 9 点保留
    Given 任务池含 1 条 cafe 任务
    When 当前小时 9 调用 filterByBusinessHours
    Then 保留 1 条任务

  Scenario: park 边界 21 点过滤（半开区间）
    Given 任务池含 1 条 park 任务
    When 当前小时 21 调用 filterByBusinessHours
    Then 结果为空

  Scenario: park 6 点保留（含起点）
    Given 任务池含 1 条 park 任务
    When 当前小时 6 调用 filterByBusinessHours
    Then 保留 1 条任务

  Scenario: 便利店 24h 任意时段保留
    Given 任务池含 1 条 convenience 任务
    When 当前小时 3 调用 filterByBusinessHours
    Then 保留 1 条任务

  Scenario: 未知 POI 类型保守不过滤
    Given 任务池含 1 条未知 POI "spaceship" 任务
    When 当前小时 23 调用 filterByBusinessHours
    Then 保留 1 条任务

  Scenario: 无 POI 任务不受营业时间影响
    Given 任务池含 1 条无 POI 任务
    When 当前小时 23 调用 filterByBusinessHours
    Then 保留 1 条任务

  Scenario: 非法小时走兜底当前小时
    Given 任务池含 1 条 cafe 任务
    When 当前小时 -1 调用 filterByBusinessHours
    Then 不抛异常并返回结果

  # ===== B-05: 安全风险过滤 =====
  Scenario: 深夜非 nightSafe 任务过滤
    Given 任务池含 2 条任务 "A,B"
    And 任务 "A" nightSafe 为 false
    And 任务 "B" nightSafe 为 true
    When 当前小时 23 调用 filterBySafety
    Then 仅保留任务 "B"

  Scenario: 雨天户外非雨天任务过滤
    Given 任务池含 2 条任务 "A,B"
    And 任务 "A" rainy 为 false 且户外
    And 任务 "B" rainy 为 true
    When 雨天调用 filterBySafety
    Then 仅保留任务 "B"

  Scenario: 雨天室内任务保留
    Given 任务池含 1 条室内任务
    And 该任务 rainy 为 false
    When 雨天调用 filterBySafety
    Then 保留 1 条任务

  Scenario: 极端天气只保留室内
    Given 任务池含 2 条任务 "A,B"
    And 任务 "A" 户外
    And 任务 "B" 室内
    When 极端天气 "storm" 调用 filterBySafety
    Then 仅保留任务 "B"

  Scenario: 晴朗白天全保留
    Given 任务池含 4 条混合任务
    When 当前小时 14 晴天调用 filterBySafety
    Then 保留 4 条任务

  # ===== B-06: 兜底任务 =====
  Scenario: 兜底任务库共 12 条
    When 调用 getFallbackCommands
    Then 返回 12 条任务
    And 所有 id 以 "fb" 开头

  Scenario: 兜底任务覆盖 6 种 type
    When 调用 getFallbackCommands
    Then 返回的任务覆盖所有 6 种 type

  Scenario: 偏好类型排在兜底任务前面
    Given 用户偏好顶层 type "color"
    When 调用 getFallbackCommands
    Then color 类型任务排在最前

  Scenario: 兜底任务应用安全过滤
    Given 当前小时 23
    When 调用 getFallbackCommands
    Then 所有返回任务 nightSafe 为 true 或无 POI 限制

  Scenario: 兜底任务应用营业时间过滤
    Given 当前小时 23
    When 调用 getFallbackCommands
    Then 不含 cafe、park、market、culture 类型 POI 任务

  Scenario: 全过滤后兜底不能为空
    Given 极端天气 "storm"
    And 当前小时 3
    When 调用 getFallbackCommands
    Then 返回非空列表

  # ===== 主入口 generate =====
  Scenario: 正常生成返回 ok
    Given 任务池含 5 条混合任务
    And 当前小时 14
    And 天气 "sunny"
    When 调用 generate
    Then 返回 ok 为 true
    And 返回的 command 有 id
    And fallback 为 false

  Scenario: 空池走兜底
    Given 任务池为空
    When 调用 generate
    Then 返回 ok 为 true
    And fallback 为 true

  Scenario: 全部完成走兜底
    Given 任务池含 3 条任务 "A,B,C"
    And 全部 3 条已完成
    When 调用 generate
    Then 返回 ok 为 true
    And fallback 为 true

  Scenario: micro 模式过滤后放宽 mode
    Given 任务池含 1 条 duration 30 任务
    And 模式 "micro"
    When 调用 generate
    Then 返回 ok 为 true
    And fallback 为 false
    And 返回的 command id 为 "L1"

  Scenario: ctx 为 undefined 不抛异常
    Given ctx 为 undefined
    When 调用 generate
    Then 返回 ok 为 true

  Scenario: 加权随机选中偏好类型概率更高
    Given 任务池含 10 条 color 任务和 10 条 walk 任务
    And 用户偏好顶层 type "color"
    When 调用 pickWeighted 5000 次
    Then color 选中次数明显高于 walk

  # ===== 完整链路：B-03 + B-04 + B-05 + B-06 =====
  Scenario: 深夜雨天生成仍返回安全任务
    Given 任务池含 10 条混合任务
    And 当前小时 23
    And 天气 "rainy"
    When 调用 generate
    Then 返回 ok 为 true
    And 返回的 command nightSafe 为 true 或 rainy 为 true 或室内

  Scenario: 偏好影响最终选择
    Given 任务池含 5 条 color 任务和 5 条 walk 任务
    And 当前小时 14
    And 用户偏好顶层 type "color"
    When 调用 generate
    Then 返回 ok 为 true
    And 返回的 command 是有效任务

  # ===== B-07: 天气细筛 =====
  Scenario: 高温过滤长户外任务
    Given 任务池含 1 条 duration 45 户外任务 "H1"
    And 天气细节温度 35
    When 调用 filterByWeather
    Then 结果为空

  Scenario: 高温保留室内任务
    Given 任务池含 1 条 duration 45 室内任务 "H2"
    And 天气细节温度 35
    When 调用 filterByWeather
    Then 保留 1 条任务

  Scenario: 低温过滤长户外任务
    Given 任务池含 1 条 duration 45 户外任务 "C1"
    And 天气细节温度 -2
    When 调用 filterByWeather
    Then 结果为空

  Scenario: 雾天过滤长户外任务
    Given 任务池含 1 条 duration 25 户外任务 "F1"
    And 天气细节能见度 "fog"
    When 调用 filterByWeather
    Then 结果为空

  Scenario: 无天气细节原样返回
    Given 任务池含 3 条混合任务
    When 调用 filterByWeather
    Then 保留 3 条任务

  # ===== B-08: 地点去重 =====
  Scenario: 24h 内同 POI 被过滤
    Given 任务池含 1 条 cafe 任务 "L1"
    And 最近出逃地点含 "cafe" 时间 1 小时前
    When 调用 filterByLocationDedup
    Then 结果为空

  Scenario: 24h 外同 POI 保留
    Given 任务池含 1 条 cafe 任务 "L2"
    And 最近出逃地点含 "cafe" 时间 25 小时前
    When 调用 filterByLocationDedup
    Then 保留 1 条任务

  Scenario: 无 POI 任务不受地点去重影响
    Given 任务池含 1 条无 POI 任务 "L3"
    And 最近出逃地点含 "cafe" 时间 1 小时前
    When 调用 filterByLocationDedup
    Then 保留 1 条任务

  # ===== B-09: 历史体验去重 =====
  Scenario: 高相似 content 被过滤
    Given 任务池含 1 条 content "找蓝色招牌" 任务 "S1"
    And 最近出逃 content 含 "找蓝色招牌"
    When 调用 filterBySimilar
    Then 结果为空

  Scenario: 不相似 content 保留
    Given 任务池含 1 条 content "听3分钟声音" 任务 "S2"
    And 最近出逃 content 含 "找蓝色招牌"
    When 调用 filterBySimilar
    Then 保留 1 条任务

  Scenario: 无 content 任务保留
    Given 任务池含 1 条无 content 任务 "S3"
    And 最近出逃 content 含 "找蓝色招牌"
    When 调用 filterBySimilar
    Then 保留 1 条任务

  # ===== B-10: 难度匹配 =====
  Scenario: low 强度过滤高难度
    Given 任务池含 1 条 duration 60 户外 cost 50 任务 "D1"
    And 用户强度 "low"
    When 调用 filterByDifficulty
    Then 结果为空

  Scenario: low 强度保留低难度
    Given 任务池含 1 条 duration 10 室内 cost 0 任务 "D2"
    And 用户强度 "low"
    When 调用 filterByDifficulty
    Then 保留 1 条任务

  Scenario: high 强度过滤低难度
    Given 任务池含 1 条 duration 10 室内 cost 0 任务 "D3"
    And 用户强度 "high"
    When 调用 filterByDifficulty
    Then 结果为空

  Scenario: medium 强度全保留
    Given 任务池含 3 条混合难度任务
    And 用户强度 "medium"
    When 调用 filterByDifficulty
    Then 保留 3 条任务

  # ===== B-11: 兴趣平衡（type 归一化）=====
  Scenario: sensory type 归一化为 sense 后匹配偏好
    Given 任务池含 1 条 sensory 类型任务 "N1"
    And 用户偏好 type "sense" 计数 10
    When 调用 buildTypeWeights
    Then sense 权重为 1.5
    And sensory 不在权重表中

  Scenario: 多类型偏好按计数排序赋权
    Given 用户偏好 type "walk" 计数 10 和 "color" 计数 5
    When 调用 buildTypeWeights
    Then walk 权重为 1.5
    And color 权重为 1.2

  # ===== B-12: 结果质量评分 =====
  Scenario: 候选 >= 3 用评分选 top3
    Given 任务池含 4 条任务 "T1,T2,T3,T4" 其中 T4 高强度
    And 用户偏好 type "walk" 计数 10
    And 用户强度 "low"
    When 调用 pickBestScored 100 次
    Then T4 从未被选中

  Scenario: 评分匹配偏好类型得分更高
    Given 任务池含 1 条 walk 任务 "P1"
    And 用户偏好 type "walk" 计数 10
    When 调用 scoreCommand
    Then 分数 >= 90

  Scenario: 无偏好基础分
    Given 任务池含 1 条 walk 任务 "P2"
    When 调用 scoreCommand
    Then 分数等于 71

  # ===== B-13: 任务解释 =====
  Scenario: 雨天室内任务解释
    Given 任务池含 1 条室内任务 "E1"
    And 天气 "rainy"
    When 调用 buildExplanation
    Then reason 为雨天室内模板
    And howto 来自任务 content
    And tip 来自任务 tip

  Scenario: 深夜 nightSafe 任务解释
    Given 任务池含 1 条 nightSafe 任务 "E2"
    And 当前小时 23
    When 调用 buildExplanation
    Then reason 为深夜安全模板

  Scenario: 偏好匹配任务解释含 type label
    Given 任务池含 1 条 walk 任务 "E3"
    And 用户偏好 type "walk" 计数 10
    When 调用 buildExplanation
    Then reason 含 type label "漫步"

  Scenario: 无匹配条件走默认解释
    Given 任务池含 1 条 walk 任务 "E4"
    And 当前小时 14
    And 天气 "sunny"
    When 调用 buildExplanation
    Then reason 为默认模板

  # ===== B-14: 变量替换 =====
  Scenario: 时间占位符按小时替换
    Given 文本 "{时间}好"
    And 当前小时 8
    When 调用 fillVariables
    Then 替换结果为 "早上好"

  Scenario: 地点占位符替换为地点名
    Given 文本 "在{地点}走走"
    And 地点名 "广州·天河"
    When 调用 fillVariables
    Then 替换结果为 "在广州·天河走走"

  Scenario: 多占位符同时替换
    Given 文本 "{时间}{天气}在{地点}做{type}的事"
    And 当前小时 14
    And 天气 "rainy"
    And 地点名 "广州"
    And type label "漫步"
    When 调用 fillVariables
    Then 替换结果为 "下午雨天在广州做漫步的事"

  Scenario: 无占位符原样返回
    Given 文本 "普通文案无占位符"
    When 调用 fillVariables
    Then 替换结果为 "普通文案无占位符"

  # ===== generate 接入 B-07~B-14 =====
  Scenario: generate 返回 explanation 字段
    Given 任务池含 5 条混合任务
    And 当前小时 14
    And 天气 "sunny"
    When 调用 generate
    Then 返回 ok 为 true
    And 返回的 explanation 有 reason 字段

  Scenario: generate 高温过滤后只推室内
    Given 任务池含 1 条 duration 45 户外任务 "G1" 和 1 条室内任务 "G2"
    And 当前小时 14
    And 天气 "sunny"
    And 天气细节温度 35
    When 调用 generate
    Then 返回 ok 为 true
    And 返回的 command id 为 "G2"
