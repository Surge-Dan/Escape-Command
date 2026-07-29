// tests/mutation/mutation-test.js
// 变异测试：对 group-room-store.js + generator-engine.js + record-builder.js 注入变异，验证测试是否能捕获
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
console.log('变异测试：group-room-store + generator-engine + record-builder + execution-progress + poi-command-builder')
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
