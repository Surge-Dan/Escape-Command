// tests/mutation/mutation-test.js
// 变异测试：对 group-room-store.js + generator-engine.js + record-builder.js + execution-progress.js + poi-command-builder.js + player-matcher.js + trust-score.js + player-trust-store.js + chat-store.js 注入变异，验证测试是否能捕获
// 运行: node tests/mutation/mutation-test.js
//
// 变异算子覆盖：
//   - 边界值变异（< → <=、> → >=、=== → ==）
//   - 常量变异（6 → 5、90 → 89、1.2 → 1.0）
//   - 逻辑反转（!x → x、&& → ||）
//   - 返回值变异（null → undefined、true → false）
//   - 数学运算变异（+ → -、* → /）
//
// 退出码：0 通过（变异分数 > 70%）/ 1 失败

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

const projectRoot = path.resolve(__dirname, '..', '..')

// ===== 变异算子定义 =====
// 每条变异：{ name, file, find, replace, expectKilled, firstOnly? }
// file: 相对路径；find/replace: 字符串替换；expectKilled: 期望被测试杀掉
const mutations = [
  // ===== group-room-store.js 变异（C-01~C-08）=====
  {
    name: 'M1: createRoom 主题长度判断 > 改为 >=',
    file: 'utils/group-room-store.js',
    find: 't.length > 20',
    replace: 't.length >= 20',
    test: 'node tests/unit/store.test.js',
    expectKilled: true
  },
  {
    name: 'M2: createRoom 人数下限 < 改为 <=',
    file: 'utils/group-room-store.js',
    find: 'maxMembers < 3',
    replace: 'maxMembers <= 3',
    test: 'node tests/unit/store.test.js',
    expectKilled: true
  },
  {
    name: 'M3: createRoom 人数上限 > 改为 >=',
    file: 'utils/group-room-store.js',
    find: 'maxMembers > 6',
    replace: 'maxMembers >= 6',
    test: 'node tests/unit/store.test.js',
    expectKilled: true
  },
  {
    name: 'M4: generateRoomId 长度 6 改为 5',
    file: 'utils/group-room-store.js',
    find: 'i < 6; i++',
    replace: 'i < 5; i++',
    test: 'node tests/unit/store.test.js',
    expectKilled: true
  },
  {
    name: 'M5: 满员判断 >= 改为 >',
    file: 'utils/group-room-store.js',
    find: 'room.members.length >= room.maxMembers',
    replace: 'room.members.length > room.maxMembers',
    test: 'node tests/unit/store.test.js',
    expectKilled: true
  },
  {
    name: 'M6: submitVote 类型检查 includes 改为 excludes',
    file: 'utils/group-room-store.js',
    find: "['time', 'budget', 'style'].includes(voteType)",
    replace: "!['time', 'budget', 'style'].includes(voteType)",
    test: 'node tests/unit/store.test.js',
    expectKilled: true
  },
  {
    name: 'M7: generateScript 完成状态 FINISHED 改为 VOTING',
    file: 'utils/group-room-store.js',
    find: 'room.status = ROOM_STATUS.FINISHED',
    replace: 'room.status = ROOM_STATUS.VOTING',
    test: 'node tests/unit/store.test.js',
    expectKilled: true
  },

  // ===== group-room-store.js 变异（C-P2 同频组局收尾：C-14~C-19）=====
  // 每条变异针对 C-P2 函数的关键边界/状态机/守卫，由 unit/property/adversarial 精确断言守护
  {
    name: 'CP2-01: buildRoles 移除 relax 兜底（非法 style 时 pool.length 抛错）',
    file: 'utils/group-room-store.js',
    find: 'const pool = ROLE_LIBRARY[style] || ROLE_LIBRARY.relax',
    replace: 'const pool = ROLE_LIBRARY[style]',
    test: 'node tests/unit/store.test.js && node tests/property/group-property.test.js',
    expectKilled: true
  },
  {
    name: 'CP2-02: buildRoles 索引 i % pool.length 改为 i + pool.length（越界返回 undefined）',
    file: 'utils/group-room-store.js',
    find: 'role: pool[i % pool.length]',
    replace: 'role: pool[i + pool.length]',
    test: 'node tests/unit/store.test.js && node tests/property/group-property.test.js',
    expectKilled: true
  },
  {
    name: 'CP2-03: assignRoles 状态守卫 !== 改为 ===（非 FINISHED 也能分配）',
    file: 'utils/group-room-store.js',
    find: "if (room.status !== ROOM_STATUS.FINISHED) {\n    return { ok: false, errCode: 'INVALID_STATUS', errMsg: '剧本未生成，无法分配角色' }",
    replace: "if (room.status === ROOM_STATUS.FINISHED) {\n    return { ok: false, errCode: 'INVALID_STATUS', errMsg: '剧本未生成，无法分配角色' }",
    test: 'node tests/unit/store.test.js',
    expectKilled: true
  },
  {
    name: 'CP2-04: buildClues 永远返回「自由发挥」（steps 被忽略）',
    file: 'utils/group-room-store.js',
    find: "clue: sList.length > 0 ? sList[i % sList.length] : '自由发挥'",
    replace: "clue: '自由发挥'",
    test: 'node tests/unit/store.test.js && node tests/property/group-property.test.js',
    expectKilled: true
  },
  {
    name: 'CP2-05: buildClues steps 非数组兜底移除（.length 抛错）',
    file: 'utils/group-room-store.js',
    find: 'const sList = Array.isArray(steps) ? steps : []',
    replace: 'const sList = steps',
    test: 'node tests/unit/store.test.js && node tests/property/group-property.test.js',
    expectKilled: true
  },
  {
    name: 'CP2-06: listPublicRooms visibility 检查反转（返回所有 private 房间）',
    file: 'utils/group-room-store.js',
    find: 'r.visibility === \'public\' &&',
    replace: 'r.visibility !== \'public\' &&',
    test: 'node tests/unit/store.test.js && node tests/property/group-property.test.js',
    expectKilled: true
  },
  {
    name: 'CP2-07: listPublicRooms FINISHED 排除反转（包含已完成房间）',
    file: 'utils/group-room-store.js',
    find: "r.status !== 'cancelled' &&\n    r.status !== ROOM_STATUS.FINISHED",
    replace: "r.status !== 'cancelled' &&\n    r.status === ROOM_STATUS.FINISHED",
    test: 'node tests/unit/store.test.js && node tests/property/group-property.test.js',
    expectKilled: true
  },
  {
    name: 'CP2-08: listPublicRooms 排序方向反转（升序而非倒序）',
    file: 'utils/group-room-store.js',
    find: '(b.createdAt || 0) - (a.createdAt || 0)',
    replace: '(a.createdAt || 0) - (b.createdAt || 0)',
    test: 'node tests/unit/store.test.js && node tests/property/group-property.test.js',
    expectKilled: true
  },
  {
    name: 'CP2-09: requestJoin visibility 守卫反转（非公开也能申请）',
    file: 'utils/group-room-store.js',
    find: "if (room.visibility !== 'public') {\n    return { ok: false, errCode: 'NOT_PUBLIC', errMsg: '仅公开组局可申请加入' }",
    replace: "if (room.visibility === 'public') {\n    return { ok: false, errCode: 'NOT_PUBLIC', errMsg: '仅公开组局可申请加入' }",
    test: 'node tests/unit/store.test.js && node tests/adversarial/group-attack.test.js',
    expectKilled: true
  },
  {
    name: 'CP2-10: requestJoin ALREADY_JOINED 守卫反转（已是成员可重复申请）',
    file: 'utils/group-room-store.js',
    find: "if (room.members.some(m => m.openId === openId)) {\n    return { ok: false, errCode: 'ALREADY_JOINED', errMsg: '你已在房间中' }",
    replace: "if (!room.members.some(m => m.openId === openId)) {\n    return { ok: false, errCode: 'ALREADY_JOINED', errMsg: '你已在房间中' }",
    test: 'node tests/unit/store.test.js && node tests/adversarial/group-attack.test.js',
    expectKilled: true
  },
  {
    name: 'CP2-11: requestJoin ROOM_FULL 边界 >= 改为 >（满员+1 才拒绝）',
    file: 'utils/group-room-store.js',
    find: "if (room.members.length >= room.maxMembers) {\n    return { ok: false, errCode: 'ROOM_FULL', errMsg: '房间已满' }",
    replace: "if (room.members.length > room.maxMembers) {\n    return { ok: false, errCode: 'ROOM_FULL', errMsg: '房间已满' }",
    test: 'node tests/unit/store.test.js',
    expectKilled: true
  },
  {
    name: 'CP2-12: approveJoin NOT_HOST 守卫反转（非房主也能审核）',
    file: 'utils/group-room-store.js',
    find: "if (room.hostOpenId !== openId) {\n    return { ok: false, errCode: 'NOT_HOST', errMsg: '只有发起人可以审核' }",
    replace: "if (room.hostOpenId === openId) {\n    return { ok: false, errCode: 'NOT_HOST', errMsg: '只有发起人可以审核' }",
    test: 'node tests/unit/store.test.js && node tests/adversarial/group-attack.test.js',
    expectKilled: true
  },
  {
    name: 'CP2-13: submitReview rating 上界 > 5 改为 >= 5（5 星被错误拒绝）',
    file: 'utils/group-room-store.js',
    find: 'review.rating < 1 || review.rating > 5',
    replace: 'review.rating < 1 || review.rating >= 5',
    test: 'node tests/unit/store.test.js && node tests/property/group-property.test.js',
    expectKilled: true
  },
  {
    name: 'CP2-14: submitReview ALREADY_REVIEWED 守卫反转（未评价者被拒）',
    file: 'utils/group-room-store.js',
    find: "if (reviews.some(r => r.openId === openId)) {\n    return { ok: false, errCode: 'ALREADY_REVIEWED', errMsg: '你已评价过' }",
    replace: "if (!reviews.some(r => r.openId === openId)) {\n    return { ok: false, errCode: 'ALREADY_REVIEWED', errMsg: '你已评价过' }",
    test: 'node tests/unit/store.test.js && node tests/adversarial/group-attack.test.js',
    expectKilled: true
  },
  {
    name: 'CP2-15: buildReviewSummary rating 上界 <= 5 改为 < 5（5 星被过滤）',
    file: 'utils/group-room-store.js',
    find: 'if (rating >= 1 && rating <= 5)',
    replace: 'if (rating >= 1 && rating < 5)',
    test: 'node tests/unit/store.test.js && node tests/property/group-property.test.js',
    expectKilled: true
  },

  // ===== generator-engine.js 变异（B-01~B-06）=====
  {
    name: 'G1: 90 天窗口 90 改为 89（边界）',
    file: 'utils/generator-engine.js',
    find: 'var ninetyDays = 90 * 24 * 60 * 60 * 1000',
    replace: 'var ninetyDays = 89 * 24 * 60 * 60 * 1000',
    test: 'node tests/unit/generator-engine.test.js && node tests/adversarial/generator-attack.test.js',
    expectKilled: true
  },
  {
    name: 'G2: 深夜判定 hour >= 22 改为 > 22',
    file: 'utils/generator-engine.js',
    find: 'var isLateNight = c.hour >= 22 || c.hour < 6',
    replace: 'var isLateNight = c.hour > 22 || c.hour < 6',
    test: 'node tests/unit/generator-engine.test.js',
    expectKilled: true
  },
  {
    name: 'G3: 加载文案 isNight 判定 >= 22 改为 > 22',
    file: 'utils/generator-engine.js',
    find: 'var isNight = hour >= 22 || hour < 6',
    replace: 'var isNight = hour > 22 || hour < 6',
    test: 'node tests/unit/generator-engine.test.js',
    expectKilled: true
  },
  {
    name: 'G4: buildTypeWeights top1 权重 1.5 改为 1.2（B-11 升级后）',
    file: 'utils/generator-engine.js',
    find: 'var tiers = [1.5, 1.2, 1.1]',
    replace: 'var tiers = [1.2, 1.2, 1.1]',
    test: 'node tests/property/generator-property.test.js',
    expectKilled: true
  },
  {
    name: 'G5: pickWeighted 非偏好权重 1 改为 0（偏好类型 100% 占据）',
    file: 'utils/generator-engine.js',
    find: 'var w = candidates[i] && weights[normalizeType(candidates[i].type)] ? weights[normalizeType(candidates[i].type)] : 1',
    replace: 'var w = candidates[i] && weights[normalizeType(candidates[i].type)] ? weights[normalizeType(candidates[i].type)] : 0',
    test: 'node tests/property/generator-property.test.js',
    expectKilled: true
  },
  {
    name: 'G6: cafe 营业时间起点 7 改为 8',
    file: 'utils/generator-engine.js',
    find: 'cafe: [7, 22]',
    replace: 'cafe: [8, 22]',
    test: 'node tests/unit/generator-engine.test.js',
    expectKilled: true
  },
  {
    name: 'G7: park 营业时间终点 21 改为 22',
    file: 'utils/generator-engine.js',
    find: 'park: [6, 21]',
    replace: 'park: [6, 22]',
    test: 'node tests/unit/generator-engine.test.js',
    expectKilled: true
  },
  {
    name: 'G8: nightSafe=false 户外深夜过滤被删（条件反转）',
    file: 'utils/generator-engine.js',
    find: 'if (isLateNight && cmd.nightSafe === false) return false',
    replace: 'if (isLateNight && cmd.nightSafe === false) return true',
    test: 'node tests/adversarial/generator-attack.test.js',
    expectKilled: true
  },
  {
    name: 'G9: 极端天气 outdoor !== false 改为 outdoor === false',
    file: 'utils/generator-engine.js',
    find: 'if (isExtreme && cmd.outdoor !== false) return false',
    replace: 'if (isExtreme && cmd.outdoor === false) return false',
    test: 'node tests/adversarial/generator-attack.test.js',
    expectKilled: true
  },
  {
    name: 'G10: type → face 映射 color: 1 改为 2',
    file: 'utils/generator-engine.js',
    find: 'color: 1,',
    replace: 'color: 2,',
    test: 'node tests/unit/generator-engine.test.js',
    expectKilled: true
  },
  {
    name: 'G11: type → face 映射 culture: 6 改为 5',
    file: 'utils/generator-engine.js',
    find: 'culture: 6',
    replace: 'culture: 5',
    test: 'node tests/unit/generator-engine.test.js',
    expectKilled: true
  },
  {
    name: 'G12: 兜底任务 fb001 id 改为 fbXXX',
    file: 'utils/generator-engine.js',
    find: "{ id: 'fb001',",
    replace: "{ id: 'fbXXX',",
    test: 'node tests/unit/generator-engine.test.js && node tests/property/generator-property.test.js',
    expectKilled: true
  },
  {
    name: 'G13: micro 模式 duration < 15 改为 <= 15',
    file: 'utils/generator-engine.js',
    find: "case 'micro':\n      return cmds.filter(function (c) { return c && c.duration < 15 })",
    replace: "case 'micro':\n      return cmds.filter(function (c) { return c && c.duration <= 15 })",
    test: 'node tests/unit/generator-engine.test.js',
    expectKilled: true
  },
  {
    name: 'G14: walk 模式 duration >= 20 改为 > 20',
    file: 'utils/generator-engine.js',
    find: "case 'walk':\n      return cmds.filter(function (c) { return c && c.outdoor !== false && c.duration >= 20 })",
    replace: "case 'walk':\n      return cmds.filter(function (c) { return c && c.outdoor !== false && c.duration > 20 })",
    test: 'node tests/unit/generator-engine.test.js',
    expectKilled: true
  },
  {
    name: 'G15: POI 可达性检查 nearbyPOI[poi] 取反',
    file: 'utils/generator-engine.js',
    find: 'if (!c.nearbyPOI[cmd.requirePOI]) return false',
    replace: 'if (c.nearbyPOI[cmd.requirePOI]) return false',
    test: 'node tests/unit/generator-engine.test.js',
    expectKilled: true
  },
  {
    name: 'G16: sameTypeCount 阈值 >= 2 改为 >= 3',
    file: 'utils/generator-engine.js',
    find: 'if (cmd.type && cmd.type === c.lastType && c.sameTypeCount >= 2) return false',
    replace: 'if (cmd.type && cmd.type === c.lastType && c.sameTypeCount >= 3) return false',
    test: 'node tests/adversarial/generator-attack.test.js',
    expectKilled: true
  },
  {
    name: 'G17: 营业时间半开区间 h < window[1] 改为 h <= window[1]',
    file: 'utils/generator-engine.js',
    find: 'return h >= window[0] && h < window[1]',
    replace: 'return h >= window[0] && h <= window[1]',
    test: 'node tests/unit/generator-engine.test.js',
    expectKilled: true
  },
  {
    name: 'G18: isValidHour hour < 24 改为 hour <= 24',
    file: 'utils/generator-engine.js',
    find: 'return typeof hour === \'number\' && Number.isFinite(hour) && hour >= 0 && hour < 24',
    replace: 'return typeof hour === \'number\' && Number.isFinite(hour) && hour >= 0 && hour <= 24',
    test: 'node tests/unit/generator-engine.test.js',
    expectKilled: true
  },

  // ===== generator-engine.js 变异（B-07~B-14 新函数）=====
  // 每条变异针对新函数的关键边界/阈值，由 unit/property/adversarial 精确断言守护
  {
    name: 'B07a: filterByWeather 高温阈值 > 32 改为 >= 32',
    file: 'utils/generator-engine.js',
    find: 'if (temp > 32 && cmd.outdoor !== false && (cmd.duration || 0) > 30) return false',
    replace: 'if (temp >= 32 && cmd.outdoor !== false && (cmd.duration || 0) > 30) return false',
    test: 'node tests/unit/generator-engine.test.js',
    expectKilled: true
  },
  {
    name: 'B07b: filterByWeather 低温阈值 < 5 改为 <= 5',
    file: 'utils/generator-engine.js',
    find: 'if (temp < 5 && cmd.outdoor === true && (cmd.duration || 0) > 30) return false',
    replace: 'if (temp <= 5 && cmd.outdoor === true && (cmd.duration || 0) > 30) return false',
    test: 'node tests/unit/generator-engine.test.js',
    expectKilled: true
  },
  {
    name: 'B07c: filterByWeather 高温 duration > 30 改为 >= 30',
    file: 'utils/generator-engine.js',
    find: 'if (temp > 32 && cmd.outdoor !== false && (cmd.duration || 0) > 30) return false',
    replace: 'if (temp > 32 && cmd.outdoor !== false && (cmd.duration || 0) >= 30) return false',
    test: 'node tests/unit/generator-engine.test.js',
    expectKilled: true
  },
  {
    name: 'B08a: filterByLocationDedup 24h 窗口 < dayMs 改为 <= dayMs',
    file: 'utils/generator-engine.js',
    find: 'if (typeof ts === \'number\' && (now - ts) < dayMs) return false',
    replace: 'if (typeof ts === \'number\' && (now - ts) <= dayMs) return false',
    test: 'node tests/unit/generator-engine.test.js',
    expectKilled: true
  },
  {
    name: 'B08b: filterByLocationDedup poi === \'null\' 改为 !== \'null\'',
    file: 'utils/generator-engine.js',
    find: 'if (!poi || poi === \'null\') return true',
    replace: 'if (!poi || poi !== \'null\') return true',
    test: 'node tests/unit/generator-engine.test.js',
    expectKilled: true
  },
  {
    name: 'B08c: filterByLocationDedup recentLocations 空检查反转',
    file: 'utils/generator-engine.js',
    find: 'if (!c.recentLocations.length) return cmds.slice()',
    replace: 'if (c.recentLocations.length) return cmds.slice()',
    test: 'node tests/unit/generator-engine.test.js',
    expectKilled: true
  },
  {
    name: 'B09a: filterBySimilar jaccard > 0.6 改为 < 0.6（反转）',
    file: 'utils/generator-engine.js',
    find: 'if (jaccard(cmdKw, recentKw[i]) > 0.6) return false',
    replace: 'if (jaccard(cmdKw, recentKw[i]) < 0.6) return false',
    test: 'node tests/property/generator-property.test.js',
    expectKilled: true
  },
  {
    name: 'B10a: computeDifficulty duration / 15 改为 / 16',
    file: 'utils/generator-engine.js',
    find: 'var score = Math.floor((cmd.duration || 0) / 15)',
    replace: 'var score = Math.floor((cmd.duration || 0) / 16)',
    test: 'node tests/unit/generator-engine.test.js',
    expectKilled: true
  },
  {
    name: 'B10b: computeDifficulty outdoor === true 改为 === false',
    file: 'utils/generator-engine.js',
    find: 'if (cmd.outdoor === true) score += 1',
    replace: 'if (cmd.outdoor === false) score += 1',
    test: 'node tests/unit/generator-engine.test.js',
    expectKilled: true
  },
  {
    name: 'B10c: computeDifficulty cost >= 30 改为 > 30',
    file: 'utils/generator-engine.js',
    find: 'if ((cmd.cost || 0) >= 30) score += 1',
    replace: 'if ((cmd.cost || 0) > 30) score += 1',
    test: 'node tests/unit/generator-engine.test.js',
    expectKilled: true
  },
  {
    name: 'B11a: normalizeType hasOwnProperty 改为 map[type] || type（原型链回退）',
    file: 'utils/generator-engine.js',
    find: 'return Object.prototype.hasOwnProperty.call(map, type) ? map[type] : type',
    replace: 'return map[type] || type',
    test: 'node tests/adversarial/generator-attack.test.js',
    expectKilled: true
  },
  {
    name: 'B12a: scoreCommand 兴趣 w >= 1.5 改为 > 1.5',
    file: 'utils/generator-engine.js',
    find: 'score += (w >= 1.5 ? 30 : (w >= 1.2 ? 24 : (w >= 1.1 ? 18 : 10)))',
    replace: 'score += (w > 1.5 ? 30 : (w >= 1.2 ? 24 : (w >= 1.1 ? 18 : 10)))',
    test: 'node tests/unit/generator-engine.test.js',
    expectKilled: true
  },
  {
    name: 'B12b: scoreCommand low 难度 d <= 2 改为 d <= 3',
    file: 'utils/generator-engine.js',
    find: 'if (c.userIntensity === \'low\') score += (d <= 2 ? 20 : 8)',
    replace: 'if (c.userIntensity === \'low\') score += (d <= 3 ? 20 : 8)',
    test: 'node tests/unit/generator-engine.test.js',
    expectKilled: true
  },
  {
    name: 'B12c: scoreCommand 新鲜度 fresh ? 20 : 6 改为 fresh ? 6 : 20',
    file: 'utils/generator-engine.js',
    find: 'score += (fresh ? 20 : 6)',
    replace: 'score += (fresh ? 6 : 20)',
    test: 'node tests/unit/generator-engine.test.js',
    expectKilled: true
  },
  {
    name: 'B12d: scoreCommand 类型平衡 === 改为 !==',
    file: 'utils/generator-engine.js',
    find: 'if (cmd.type && c.lastType && normalizeType(cmd.type) === normalizeType(c.lastType)) {',
    replace: 'if (cmd.type && c.lastType && normalizeType(cmd.type) !== normalizeType(c.lastType)) {',
    test: 'node tests/unit/generator-engine.test.js',
    expectKilled: true
  },
  {
    name: 'B12e: pickBestScored topN Math.min(3 改为 Math.min(4',
    file: 'utils/generator-engine.js',
    find: 'var topN = Math.min(3, scored.length)',
    replace: 'var topN = Math.min(4, scored.length)',
    test: 'node tests/unit/generator-engine.test.js',
    expectKilled: true
  },
  {
    name: 'B13a: buildExplanation 雨天室内 outdoor === false 改为 === true',
    file: 'utils/generator-engine.js',
    find: 'if (isRainy && cmd.outdoor === false) {',
    replace: 'if (isRainy && cmd.outdoor === true) {',
    test: 'node tests/unit/generator-engine.test.js',
    expectKilled: true
  },
  {
    name: 'B13b: buildExplanation 深夜安全 nightSafe === true 改为 === false',
    file: 'utils/generator-engine.js',
    find: '} else if (isLateNight && cmd.nightSafe === true) {',
    replace: '} else if (isLateNight && cmd.nightSafe === false) {',
    test: 'node tests/unit/generator-engine.test.js',
    expectKilled: true
  },
  {
    name: 'B13c: buildExplanation 偏好匹配 weights >= 1.2 改为 > 1.2',
    file: 'utils/generator-engine.js',
    find: '} else if (weights[nType] >= 1.2) {',
    replace: '} else if (weights[nType] > 1.2) {',
    test: 'node tests/unit/generator-engine.test.js',
    expectKilled: true
  },
  {
    name: 'B14a: fillVariables 早上 改为 清晨',
    file: 'utils/generator-engine.js',
    find: '? \'早上\' :',
    replace: '? \'清晨\' :',
    test: 'node tests/unit/generator-engine.test.js',
    expectKilled: true
  },
  {
    name: 'B14b: fillVariables 雨天 改为 晴天',
    file: 'utils/generator-engine.js',
    find: 'var weatherLabel = c.weather === \'rainy\' ? \'雨天\' :',
    replace: 'var weatherLabel = c.weather === \'rainy\' ? \'晴天\' :',
    test: 'node tests/unit/generator-engine.test.js',
    expectKilled: true
  },
  {
    name: 'B14c: fillVariables 附近 改为 这里',
    file: 'utils/generator-engine.js',
    find: '.replace(/\\{地点\\}/g, c.locationName || \'附近\')',
    replace: '.replace(/\\{地点\\}/g, c.locationName || \'这里\')',
    test: 'node tests/unit/generator-engine.test.js',
    expectKilled: true
  },

  // ===== record-builder.js 变异（完成流数据联动）=====
  // 每条变异对应一个精确断言，确保数据联动不变量被测试守护
  {
    name: 'R1: duration 下界 Math.max(1 改为 Math.max(0（now===startTime → 0）',
    file: 'utils/record-builder.js',
    find: 'Math.max(1, Math.round',
    replace: 'Math.max(0, Math.round',
    test: 'node tests/unit/record-builder.test.js',
    expectKilled: true
  },
  {
    name: 'R2: duration 取整 Math.round 改为 Math.floor（90 秒 → 1 而非 2）',
    file: 'utils/record-builder.js',
    find: 'Math.round((now - startTime) / 60000)',
    replace: 'Math.floor((now - startTime) / 60000)',
    test: 'node tests/unit/record-builder.test.js',
    expectKilled: true
  },
  {
    name: 'R3: photos 上限 slice(0, 9) 改为 slice(0, 8)',
    file: 'utils/record-builder.js',
    find: 'rd.photos.slice(0, 9)',
    replace: 'rd.photos.slice(0, 8)',
    test: 'node tests/unit/record-builder.test.js',
    expectKilled: true
  },
  {
    name: 'R4: feeling 截断 slice(0, 200) 改为 slice(0, 199)',
    file: 'utils/record-builder.js',
    find: 'rd.feeling.slice(0, 200)',
    replace: 'rd.feeling.slice(0, 199)',
    test: 'node tests/unit/record-builder.test.js',
    expectKilled: true
  },
  {
    name: 'R5: isGroup 判定 === true 改为 === false（扩展字段反向注入）',
    file: 'utils/record-builder.js',
    find: 'if (rd.isGroup === true)',
    replace: 'if (rd.isGroup === false)',
    test: 'node tests/unit/record-builder.test.js',
    expectKilled: true
  },
  {
    name: 'R6: location 优先级反转 rd>ctx 改为 ctx>rd',
    file: 'utils/record-builder.js',
    find: 'isLocObj(rd.location) ? rd.location : (isLocObj(x.location) ? x.location : null)',
    replace: 'isLocObj(x.location) ? x.location : (isLocObj(rd.location) ? rd.location : null)',
    test: 'node tests/unit/record-builder.test.js',
    expectKilled: true
  },
  {
    name: 'R7: isLocObj 移除数组排除（数组被当作 location）',
    file: 'utils/record-builder.js',
    find: 'return v && typeof v === \'object\' && !Array.isArray(v)',
    replace: 'return v && typeof v === \'object\'',
    test: 'node tests/unit/record-builder.test.js',
    expectKilled: true
  },
  {
    name: 'R8: title 兜底「出逃记忆」改为「出逃记录」',
    file: 'utils/record-builder.js',
    find: '|| \'出逃记忆\'',
    replace: '|| \'出逃记录\'',
    test: 'node tests/unit/record-builder.test.js',
    expectKilled: true
  },
  {
    name: 'R9: commandType 兜底 custom 改为 unknown',
    file: 'utils/record-builder.js',
    find: '? c.type : \'custom\'',
    replace: '? c.type : \'unknown\'',
    test: 'node tests/unit/record-builder.test.js',
    expectKilled: true
  },
  {
    name: 'R10: mood 兜底 calm 改为 neutral',
    file: 'utils/record-builder.js',
    find: 'rd.mood || \'calm\'',
    replace: 'rd.mood || \'neutral\'',
    test: 'node tests/unit/record-builder.test.js',
    expectKilled: true
  },
  {
    name: 'R11: groupId 非字符串兜底 空串 改为 unknown',
    file: 'utils/record-builder.js',
    find: 'typeof rd.groupId === \'string\' ? rd.groupId : \'\'',
    replace: 'typeof rd.groupId === \'string\' ? rd.groupId : \'unknown\'',
    test: 'node tests/unit/record-builder.test.js',
    expectKilled: true
  },
  {
    name: 'R12: filter 兜底 day 改为 night',
    file: 'utils/record-builder.js',
    find: 'rd.filter || \'day\'',
    replace: 'rd.filter || \'night\'',
    test: 'node tests/unit/record-builder.test.js',
    expectKilled: true
  },

  // ===== injectGroupFields 变异（同频字段自动注入）=====
  {
    name: 'IG1: r.isGroup !== true 改为 === true（rd 无 isGroup 时误判已注入，不注入）',
    file: 'utils/record-builder.js',
    find: 'if (r.isGroup !== true && c.isGroup === true)',
    replace: 'if (r.isGroup === true && c.isGroup === true)',
    test: 'node tests/unit/record-builder.test.js',
    expectKilled: true
  },
  {
    name: 'IG2: c.isGroup === true 改为 === false（cmd 有 isGroup 时不注入）',
    file: 'utils/record-builder.js',
    find: 'if (r.isGroup !== true && c.isGroup === true)',
    replace: 'if (r.isGroup !== true && c.isGroup === false)',
    test: 'node tests/unit/record-builder.test.js',
    expectKilled: true
  },
  {
    name: 'IG3: 注入 groupId: c.groupId 改为 c.steps（注入错误字段）',
    file: 'utils/record-builder.js',
    find: 'groupId: c.groupId,',
    replace: 'groupId: c.steps,',
    test: 'node tests/unit/record-builder.test.js',
    expectKilled: true
  },
  {
    name: 'IG4: 注入 isGroup: true 改为 false（同频标记反转）',
    file: 'utils/record-builder.js',
    find: 'isGroup: true,\n      groupId: c.groupId,',
    replace: 'isGroup: false,\n      groupId: c.groupId,',
    test: 'node tests/unit/record-builder.test.js',
    expectKilled: true
  },

  // ===== execution-progress.js 变异（进度持久化留痕）=====
  {
    name: 'E1: markStepDone 已完成不覆盖 改为覆盖（completedAt 可篡改）',
    file: 'utils/execution-progress.js',
    find: 'if (steps[index] && steps[index].done) return progress',
    replace: 'if (steps[index] && steps[index].done) {}',
    test: 'node tests/unit/execution-progress.test.js',
    expectKilled: true
  },
  {
    name: 'E2: 全完成 currentStep=最后一步 改为 -1',
    file: 'utils/execution-progress.js',
    find: 'var currentStep = next === -1 ? steps.length - 1 : next',
    replace: 'var currentStep = next === -1 ? -1 : next',
    test: 'node tests/unit/execution-progress.test.js',
    expectKilled: true
  },
  {
    name: 'E3: 越界检查 >= 改为 >（放行 index=length）',
    file: 'utils/execution-progress.js',
    find: 'if (!Number.isInteger(index) || index < 0 || index >= steps.length) return progress',
    replace: 'if (!Number.isInteger(index) || index < 0 || index > steps.length) return progress',
    test: 'node tests/unit/execution-progress.test.js',
    expectKilled: true
  },
  {
    name: 'E4: isAllDone 空 steps 返回 false 改为 true',
    file: 'utils/execution-progress.js',
    find: 'if (!progress || !Array.isArray(progress.steps) || progress.steps.length === 0) return false',
    replace: 'if (!progress || !Array.isArray(progress.steps)) return false',
    test: 'node tests/unit/execution-progress.test.js',
    expectKilled: true
  },
  {
    name: 'E5: initProgress done 初始 false 改为 true',
    file: 'utils/execution-progress.js',
    find: 'return { id: i + 1, text: text, done: false, completedAt: null }',
    replace: 'return { id: i + 1, text: text, done: true, completedAt: null }',
    test: 'node tests/unit/execution-progress.test.js',
    expectKilled: true
  },

  // ===== poi-command-builder.js 变异（POI 指令构建）=====
  {
    name: 'P1: mapType 未知默认 color 改为 food',
    file: 'utils/poi-command-builder.js',
    find: 'return \'color\'',
    replace: 'return \'food\'',
    test: 'node tests/unit/poi-command-builder.test.js',
    expectKilled: true,
    firstOnly: true
  },
  {
    name: 'P2: estimateDuration food 20 改为 25',
    file: 'utils/poi-command-builder.js',
    find: 'case \'food\': return 20',
    replace: 'case \'food\': return 25',
    test: 'node tests/unit/poi-command-builder.test.js',
    expectKilled: true
  },
  {
    name: 'P3: buildOne 无 name 返回 null 改为返回空对象',
    file: 'utils/poi-command-builder.js',
    find: 'if (!name) return null',
    replace: 'if (!name) return {}',
    test: 'node tests/unit/poi-command-builder.test.js',
    expectKilled: true
  },
  {
    name: 'P4: 上限 20 改为 10',
    file: 'utils/poi-command-builder.js',
    find: 'return result.slice(0, 20)',
    replace: 'return result.slice(0, 10)',
    test: 'node tests/unit/poi-command-builder.test.js',
    expectKilled: true
  },
  {
    name: 'P5: 排除 0,0 默认坐标 改为放行',
    file: 'utils/poi-command-builder.js',
    find: 'if (lat === 0 && lng === 0) return null',
    replace: 'if (lat === 0 && lng === 0) {}',
    test: 'node tests/unit/poi-command-builder.test.js',
    expectKilled: true
  },
  {
    name: 'P6: id 前缀 poi_ 改为 fb_',
    file: 'utils/poi-command-builder.js',
    find: 'id: \'poi_\' + poiId,',
    replace: 'id: \'fb_\' + poiId,',
    test: 'node tests/unit/poi-command-builder.test.js',
    expectKilled: true
  },

  // ===== player-matcher.js 变异（D5 真实玩家联动 · 混合模式匹配器）=====
  // 每条变异针对纯函数的关键不变量，由 unit/property/adversarial 精确断言守护
  {
    name: 'PM1: normalizePlayer isReal source === cloud 改为 === mock（真实玩家未标记）',
    file: 'utils/player-matcher.js',
    find: 'isReal: source === \'cloud\'',
    replace: 'isReal: source === \'mock\'',
    test: 'node tests/unit/player-matcher.test.js',
    expectKilled: true
  },
  {
    name: 'PM2: mergeAndPick real.concat(mock) 改为 mock.concat(real)（mock 优先）',
    file: 'utils/player-matcher.js',
    find: 'var merged = real.concat(mock)',
    replace: 'var merged = mock.concat(real)',
    test: 'node tests/unit/player-matcher.test.js && node tests/property/player-matcher-property.test.js',
    expectKilled: true
  },
  {
    name: 'PM3: mergeAndPick excludeOpenId 守卫反转（real 循环 === 改为 !==）',
    file: 'utils/player-matcher.js',
    find: 'if (excludeOpenId && p.openId === excludeOpenId) continue',
    replace: 'if (excludeOpenId && p.openId !== excludeOpenId) continue',
    test: 'node tests/unit/player-matcher.test.js && node tests/property/player-matcher-property.test.js',
    expectKilled: true
  },
  {
    name: 'PM4: mergeAndPick realOpenIds 去重反转（重复 openId 攻击）',
    file: 'utils/player-matcher.js',
    find: 'if (realOpenIds[mp.openId]) continue',
    replace: 'if (!realOpenIds[mp.openId]) continue',
    test: 'node tests/unit/player-matcher.test.js && node tests/property/player-matcher-property.test.js',
    expectKilled: true
  },
  {
    name: 'PM5: mergeAndPick slice count 改为 count + 1（返回超量）',
    file: 'utils/player-matcher.js',
    find: 'return merged.slice(0, Math.min(count, merged.length))',
    replace: 'return merged.slice(0, Math.min(count + 1, merged.length))',
    test: 'node tests/unit/player-matcher.test.js && node tests/property/player-matcher-property.test.js',
    expectKilled: true
  },
  {
    name: 'PM6: shouldFallback ok !== true 改为 === false（falsy ok 漏网，降级失效）',
    file: 'utils/player-matcher.js',
    find: 'if (result.ok !== true) return true',
    replace: 'if (result.ok === false) return true',
    test: 'node tests/adversarial/player-matcher-attack.test.js',
    expectKilled: true
  },
  {
    name: 'PM7: computePartnerCount cap < 0 兜底改为 cap = -1（负数上限漏网）',
    file: 'utils/player-matcher.js',
    find: 'if (cap < 0) cap = 0',
    replace: 'if (cap < 0) cap = -1',
    test: 'node tests/property/player-matcher-property.test.js && node tests/adversarial/player-matcher-attack.test.js',
    expectKilled: true
  },
  {
    name: 'PM8: computePartnerCount slots < 0 兜底改为 slots = -1（负数返回）',
    file: 'utils/player-matcher.js',
    find: 'if (slots < 0) slots = 0',
    replace: 'if (slots < 0) slots = -1',
    test: 'node tests/property/player-matcher-property.test.js',
    expectKilled: true
  },
  {
    name: 'PM9: computePartnerCount slots > cap 改为 slots = cap + 1（超上限）',
    file: 'utils/player-matcher.js',
    find: 'if (slots > cap) slots = cap',
    replace: 'if (slots > cap) slots = cap + 1',
    test: 'node tests/property/player-matcher-property.test.js',
    expectKilled: true
  },
  {
    name: 'PM10: rankByRelevance 排序方向反转（bScore - aScore 改为 aScore - bScore）',
    file: 'utils/player-matcher.js',
    find: 'return bScore - aScore',
    replace: 'return aScore - bScore',
    test: 'node tests/unit/player-matcher.test.js',
    expectKilled: true
  },
  {
    name: 'PM11: rankByRelevance null 守卫失效（aValid 恒 true，null 元素抛错）',
    file: 'utils/player-matcher.js',
    find: 'var aValid = a && typeof a === \'object\'',
    replace: 'var aValid = true',
    test: 'node tests/adversarial/player-matcher-attack.test.js',
    expectKilled: true
  },
  // PM12（hasTrust 数组排除移除）为等价变异：getTierWeight('normal')=1.0，
  // 数组当 trustMap 时所有 tier fallback 到 normal(权重 1.0)，得分与无 trust 路径一致，无法杀死，故不纳入

  // ===== C-P4 社交增强变异（trust-score + player-trust-store + chat-store）=====
  // 每条变异针对纯函数的关键不变量（分级阈值/边界/降级/去重），由 unit/property/adversarial 精确断言守护

  // --- trust-score.js 变异（信任分纯函数）---
  {
    name: 'CP4-TS1: computeTrustScore newbie 边界 count < 3 改为 <= 3（3条评价仍判新手）',
    file: 'utils/trust-score.js',
    find: 'if (count < 3) {',
    replace: 'if (count <= 3) {',
    test: 'node tests/unit/trust-score.test.js',
    expectKilled: true
  },
  {
    name: 'CP4-TS2: computeTrustScore gold 阈值 count >= 10 改为 >= 9（9条评价误升金牌）',
    file: 'utils/trust-score.js',
    find: 'avg >= 4.8 && count >= 10',
    replace: 'avg >= 4.8 && count >= 9',
    test: 'node tests/unit/trust-score.test.js',
    expectKilled: true
  },
  {
    name: 'CP4-TS3: computeTrustScore reliable 边界 avg >= 4.5 改为 > 4.5（4.5分误降普通）',
    file: 'utils/trust-score.js',
    find: 'avg >= 4.5',
    replace: 'avg > 4.5',
    test: 'node tests/unit/trust-score.test.js',
    expectKilled: true
  },
  {
    name: 'CP4-TS4: computeTrustScore watch 边界 avg < 3.0 改为 <= 3.0（3.0分误判待观察）',
    file: 'utils/trust-score.js',
    find: 'avg < 3.0',
    replace: 'avg <= 3.0',
    test: 'node tests/unit/trust-score.test.js',
    expectKilled: true
  },
  {
    name: 'CP4-TS5: computeTrustScore 非法 rating 善意 sum += 5 改为 sum += 0（非法评价拉低分数）',
    file: 'utils/trust-score.js',
    find: 'sum += 5',
    replace: 'sum += 0',
    test: 'node tests/unit/trust-score.test.js',
    expectKilled: true
  },
  {
    name: 'CP4-TS6: computeTrustScore score 保留一位小数 Math.round 改为 Math.floor（4.9→4.8 降级）',
    file: 'utils/trust-score.js',
    find: 'Math.round(avg * 10) / 10',
    replace: 'Math.floor(avg * 10) / 10',
    test: 'node tests/unit/trust-score.test.js',
    expectKilled: true
  },
  {
    name: 'CP4-TS7: getTierWeight 未知 tier 兜底 normal(1.0) 改为 watch(0.3)（未知玩家被降权）',
    file: 'utils/trust-score.js',
    find: 'return TRUST_TIER_WEIGHT.normal\n  }',
    replace: 'return TRUST_TIER_WEIGHT.watch\n  }',
    test: 'node tests/unit/trust-score.test.js',
    expectKilled: true
  },
  {
    name: 'CP4-TS8: isValidReview rating 下界 >= 1 改为 >= 0（0分评价通过校验）',
    file: 'utils/trust-score.js',
    find: 'rating >= 1 && rating <= 5',
    replace: 'rating >= 0 && rating <= 5',
    test: 'node tests/unit/trust-score.test.js',
    expectKilled: true
  },

  // --- player-trust-store.js 变异（信任数据层 + 降级协调）---
  {
    name: 'CP4-PT1: getTrustBatch 批量截断 ids.length < 20 改为 < 21（超量请求漏网）',
    file: 'utils/player-trust-store.js',
    find: 'ids.length < 20',
    replace: 'ids.length < 21',
    test: 'node tests/unit/player-trust-store.test.js',
    expectKilled: true
  },
  {
    name: 'CP4-PT2: buildReviewDoc comment 截断 slice(0, 100) 改为 slice(0, 99)',
    file: 'utils/player-trust-store.js',
    find: '.slice(0, 100)',
    replace: '.slice(0, 99)',
    test: 'node tests/unit/player-trust-store.test.js',
    expectKilled: true
  },
  {
    name: 'CP4-PT3: buildReviewDoc tags 上限 slice(0, 5) 改为 slice(0, 6)',
    file: 'utils/player-trust-store.js',
    find: '.slice(0, 5)',
    replace: '.slice(0, 6)',
    test: 'node tests/unit/player-trust-store.test.js',
    expectKilled: true
  },
  {
    name: 'CP4-PT4: reportPlayer 空 openId 守卫移除（空 ID 不再拒绝）',
    file: 'utils/player-trust-store.js',
    find: 'if (!targetOpenId) {',
    replace: 'if (false) {',
    test: 'node tests/unit/player-trust-store.test.js',
    expectKilled: true
  },
  {
    name: 'CP4-PT5: getTrustBatch 去重 indexOf === -1 改为 !== -1（重复 openId 攻击漏网）',
    file: 'utils/player-trust-store.js',
    find: 'ids.indexOf(id) === -1',
    replace: 'ids.indexOf(id) !== -1',
    test: 'node tests/unit/player-trust-store.test.js',
    expectKilled: true
  },
  {
    name: 'CP4-PT6: submitReview 成功后缓存 setCachedTrust 移除（信任分不缓存）',
    file: 'utils/player-trust-store.js',
    find: 'setCachedTrust(doc.targetOpenId, result.trust)',
    replace: '/* setCachedTrust(doc.targetOpenId, result.trust) */',
    test: 'node tests/unit/player-trust-store.test.js',
    expectKilled: true
  },
  {
    name: 'CP4-PT7: getTrustBatch 非数组守卫移除（null 输入抛 TypeError）',
    file: 'utils/player-trust-store.js',
    find: 'if (!Array.isArray(openIds) || openIds.length === 0) {',
    replace: 'if (false) {',
    test: 'node tests/unit/player-trust-store.test.js',
    expectKilled: true
  },
  {
    name: 'CP4-PT8: getTrustBatch 补齐未返回 openId 时移除本地缓存读取（merged[tid] = DEFAULT_TRUST）',
    file: 'utils/player-trust-store.js',
    find: 'merged[tid] = getCachedTrust(tid) || DEFAULT_TRUST',
    replace: 'merged[tid] = DEFAULT_TRUST',
    test: 'node tests/unit/player-trust-store.test.js',
    expectKilled: true
  },

  // --- chat-store.js 变异（聊天数据层 + 乐观更新 + 轮询）---
  {
    name: 'CP4-CS1: validateContent 超长边界 > MAX_CONTENT_LEN 改为 >=（200字消息被拒）',
    file: 'utils/chat-store.js',
    find: 'if (trimmed.length > MAX_CONTENT_LEN) {',
    replace: 'if (trimmed.length >= MAX_CONTENT_LEN) {',
    test: 'node tests/unit/chat-store.test.js',
    expectKilled: true
  },
  {
    name: 'CP4-CS2: sendMessage 乐观消息 isLocal: true 改为 false（乐观消息不标记）',
    file: 'utils/chat-store.js',
    find: "isLocal: true,\n    status: 'pending'",
    replace: "isLocal: false,\n    status: 'pending'",
    test: 'node tests/unit/chat-store.test.js',
    expectKilled: true
  },
  {
    name: 'CP4-CS3: dedupMessages 排序方向 ca - cb 改为 cb - ca（消息倒序）',
    file: 'utils/chat-store.js',
    find: 'if (ca !== cb) return ca - cb',
    replace: 'if (ca !== cb) return cb - ca',
    test: 'node tests/unit/chat-store.test.js',
    expectKilled: true
  },
  {
    name: 'CP4-CS4: dedupMessages 乐观消息替换逻辑移除（replaceKey 命中不跳过）',
    file: 'utils/chat-store.js',
    find: 'if (m.isLocal && tk && pendingKeys[tk]) {',
    replace: 'if (false && m.isLocal && tk && pendingKeys[tk]) {',
    test: 'node tests/unit/chat-store.test.js',
    expectKilled: true
  },
  {
    name: 'CP4-CS5: filterAfter 增量游标 > 改为 >=（已拉取消息重复返回）',
    file: 'utils/chat-store.js',
    find: 'list[i].createdAt > lastCreatedAt',
    replace: 'list[i].createdAt >= lastCreatedAt',
    test: 'node tests/unit/chat-store.test.js',
    expectKilled: true
  },
  {
    name: 'CP4-CS6: saveMessages tempKey 持久化移除（乐观消息替换匹配失效）',
    file: 'utils/chat-store.js',
    find: 'tempKey: typeof m.tempKey === \'string\' ? m.tempKey : \'\',',
    replace: "tempKey: '',",
    test: 'node tests/unit/chat-store.test.js',
    expectKilled: true
  },
  {
    name: 'CP4-CS7: sendMessage 云端降级 local_only 返回 ok: true 改为 ok: false（降级失效）',
    file: 'utils/chat-store.js',
    find: "ok: true,\n      source: 'local_only',",
    replace: "ok: false,\n      source: 'local_only',",
    test: 'node tests/unit/chat-store.test.js',
    expectKilled: true
  },
  {
    name: 'CP4-CS8: computeNewOnes 去重 seenIds[id] 改为 !seenIds[id]（已存在消息重复计入新增）',
    file: 'utils/chat-store.js',
    find: 'if (id && seenIds[id]) continue',
    replace: 'if (id && !seenIds[id]) continue',
    test: 'node tests/unit/chat-store.test.js',
    expectKilled: true
  },
  {
    name: 'CP4-CS9: startPolling 切换 room 时 stopPolling 移除（旧轮询不被停止）',
    file: 'utils/chat-store.js',
    find: '// 已有轮询先停止\n  stopPolling()',
    replace: '// 已有轮询先停止',
    test: 'node tests/unit/chat-store.test.js',
    expectKilled: true
  }
]

// ===== 执行 =====
let totalMutations = 0
let killedMutations = 0
let survivedMutations = 0
let skippedMutations = 0
const results = []
const fileCache = {}  // file → originalCode

function loadOriginal(filePath) {
  if (!fileCache[filePath]) {
    fileCache[filePath] = fs.readFileSync(filePath, 'utf-8')
  }
  return fileCache[filePath]
}

console.log('\n' + '='.repeat(60))
console.log('变异测试：group-room-store(C-01~C-19) + generator-engine + record-builder + execution-progress + poi-command-builder + player-matcher(D5) + C-P4社交增强(trust-score + player-trust-store + chat-store)')
console.log('='.repeat(60))

for (const mutation of mutations) {
  totalMutations++
  const fullPath = path.join(projectRoot, mutation.file)
  const originalCode = loadOriginal(fullPath)

  // 检查原始代码是否包含目标字符串
  if (!originalCode.includes(mutation.find)) {
    console.log(`\n  ⚠ ${mutation.name}: 目标代码不存在，跳过`)
    results.push({ name: mutation.name, status: 'skip' })
    skippedMutations++
    continue
  }

  // 应用变异
  let mutatedCode
  if (mutation.firstOnly) {
    mutatedCode = originalCode.replace(mutation.find, mutation.replace)
  } else {
    mutatedCode = originalCode.split(mutation.find).join(mutation.replace)
  }

  // 写入变异后的代码
  fs.writeFileSync(fullPath, mutatedCode)

  // 运行测试
  let testPassed = false
  try {
    execSync(mutation.test, {
      cwd: projectRoot,
      stdio: 'pipe',
      timeout: 60000
    })
    testPassed = true  // 测试通过 = 变异存活
  } catch (e) {
    testPassed = false  // 测试失败 = 变异被杀
  }

  // 恢复原始代码
  fs.writeFileSync(fullPath, originalCode)

  if (!testPassed) {
    killedMutations++
    console.log(`  ✓ KILLED: ${mutation.name}`)
    results.push({ name: mutation.name, status: 'killed' })
  } else {
    survivedMutations++
    console.log(`  ✗ SURVIVED: ${mutation.name}`)
    results.push({ name: mutation.name, status: 'survived' })
  }
}

// ===== 结果 =====
const effectiveMutations = totalMutations - skippedMutations
const mutationScore = effectiveMutations > 0
  ? (killedMutations / effectiveMutations * 100).toFixed(1)
  : 0
console.log('\n' + '='.repeat(60))
console.log(`变异测试结果: ${totalMutations} mutations (${skippedMutations} skipped), ${killedMutations} killed, ${survivedMutations} survived`)
console.log(`变异分数 (Mutation Score): ${mutationScore}%`)
if (survivedMutations > 0) {
  console.log('\n存活变异（测试盲点）:')
  results.filter(r => r.status === 'survived').forEach(r => console.log('  - ' + r.name))
}
console.log('='.repeat(60))

// 变异分数 > 70% 算通过
process.exit(survivedMutations > effectiveMutations * 0.3 ? 1 : 0)
