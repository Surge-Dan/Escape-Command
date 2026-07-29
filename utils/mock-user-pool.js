// utils/mock-user-pool.js
// C-P3 任务大厅 · 虚拟用户池
// 用于「摇骰子找搭子」的 mock 用户：无云后端，全部本地数据
// 纯数据 + 工具模块，零 wx 依赖（仅静态用户池，不涉及存储）

'use strict'

// ===== Mock 用户池（12 个，覆盖广州 6 区，每区 2 个）=====
// 兴趣取值约束：food / nature / culture / sport / photo / shopping
// （参考 group-room-store.js 的 PREFERENCE_OPTIONS.interests）
var MOCK_USERS = [
  // ---- 天河区 ----
  {
    openId: 'mock_u_001',
    nickname: '阿月',
    avatar: '/assets/images/avatar.webp',
    interests: ['food', 'culture'],
    district: '天河区',
    bio: '咖啡探店爱好者，周末常驻天河，太古汇到天河公园一线通杀'
  },
  {
    openId: 'mock_u_002',
    nickname: 'Mia',
    avatar: '/assets/images/avatar.webp',
    interests: ['shopping', 'photo'],
    district: '天河区',
    bio: '天河CBD打工人，下班爱逛太古汇，橱窗光线下必出片'
  },
  // ---- 越秀区 ----
  {
    openId: 'mock_u_003',
    nickname: '小林',
    avatar: '/assets/images/avatar.webp',
    interests: ['culture', 'photo'],
    district: '越秀区',
    bio: '东山口洋楼控，胶片摄影爱好者，老城光影收集者'
  },
  {
    openId: 'mock_u_004',
    nickname: '阿杰',
    avatar: '/assets/images/avatar.webp',
    interests: ['food', 'sport'],
    district: '越秀区',
    bio: '越秀老城漫游者，二沙岛晨跑常客，北京路宵夜活地图'
  },
  // ---- 海珠区 ----
  {
    openId: 'mock_u_005',
    nickname: '糖糖',
    avatar: '/assets/images/avatar.webp',
    interests: ['food', 'photo'],
    district: '海珠区',
    bio: '江南西甜品猎人，琶醍日落拍摄达人，江边慢生活代表'
  },
  {
    openId: 'mock_u_006',
    nickname: '栗子',
    avatar: '/assets/images/avatar.webp',
    interests: ['nature', 'culture'],
    district: '海珠区',
    bio: '海珠湿地观鸟爱好者，TIT 创意园常驻，市井与文艺两头跑'
  },
  // ---- 荔湾区 ----
  {
    openId: 'mock_u_007',
    nickname: '老张',
    avatar: '/assets/images/avatar.webp',
    interests: ['food', 'culture'],
    district: '荔湾区',
    bio: '老广吃货，荔湾泮塘觅食十年，西关老字号如数家珍'
  },
  {
    openId: 'mock_u_008',
    nickname: '大伟',
    avatar: '/assets/images/avatar.webp',
    interests: ['photo', 'culture'],
    district: '荔湾区',
    bio: '西关风情摄影爱好者，永庆坊扫街达人，沙面日落收藏家'
  },
  // ---- 白云区 ----
  {
    openId: 'mock_u_009',
    nickname: '点点',
    avatar: '/assets/images/avatar.webp',
    interests: ['nature', 'sport'],
    district: '白云区',
    bio: '白云山徒步爱好者，周末必爬摩星岭，山脊线行走者'
  },
  {
    openId: 'mock_u_010',
    nickname: '阿May',
    avatar: '/assets/images/avatar.webp',
    interests: ['sport', 'nature'],
    district: '白云区',
    bio: '户外骑行达人，白云山脚晨骑常客，市郊绿道活地图'
  },
  // ---- 番禺区 ----
  {
    openId: 'mock_u_011',
    nickname: '小川',
    avatar: '/assets/images/avatar.webp',
    interests: ['food', 'culture'],
    district: '番禺区',
    bio: '番禺沙湾古镇美食探索者，老番禺味道收集者，姜埋奶重度爱好者'
  },
  {
    openId: 'mock_u_012',
    nickname: '核桃',
    avatar: '/assets/images/avatar.webp',
    interests: ['photo', 'culture'],
    district: '番禺区',
    bio: '岭南古建筑摄影爱好者，余荫山房取景常客，祠堂砖雕考据派'
  }
]

// ===== 工具函数 =====

// Fisher-Yates 洗牌（原地打乱，调用方需传入已复制数组）
function shuffleInPlace(arr) {
  for (var i = arr.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1))
    var tmp = arr[i]
    arr[i] = arr[j]
    arr[j] = tmp
  }
  return arr
}

// 兴趣是否有交集
function hasInterestOverlap(userInterests, targetInterests) {
  if (!targetInterests || targetInterests.length === 0) return false
  for (var i = 0; i < targetInterests.length; i++) {
    if (userInterests.indexOf(targetInterests[i]) !== -1) return true
  }
  return false
}

/**
 * 按条件筛选并随机取 N 个 mock 用户（不含当前用户）
 * @param {number} count - 期望数量
 * @param {object} [filter] - 筛选条件
 *   {string} [excludeOpenId] - 排除该 openId（避免匹配到自己）
 *   {string} [district] - 优先返回该区用户（不足则补其他区）
 *   {string[]} [interests] - 优先返回有交集兴趣的用户（不足则补其他）
 * @returns {Array} mock 用户数组，长度 = min(count, 可用数量)
 */
function getMockUsers(count, filter) {
  // 防御性：count 非整数/负数 → 空数组
  if (typeof count !== 'number' || !isFinite(count) || count <= 0 || Math.floor(count) !== count) {
    return []
  }
  filter = filter || {}

  // 1. 先排除 excludeOpenId
  var pool = MOCK_USERS.filter(function (u) {
    return !filter.excludeOpenId || u.openId !== filter.excludeOpenId
  })

  // 2. 按优先级分组：district + interests 命中 > district 命中 > interests 命中 > 其他
  var district = filter.district
  var interests = filter.interests

  var tierBoth = []    // 区 + 兴趣双命中
  var tierDistrict = [] // 仅区命中
  var tierInterest = [] // 仅兴趣命中
  var tierOther = []    // 其他

  for (var i = 0; i < pool.length; i++) {
    var u = pool[i]
    var districtHit = district && u.district === district
    var interestHit = interests && interests.length > 0 && hasInterestOverlap(u.interests, interests)
    if (districtHit && interestHit) tierBoth.push(u)
    else if (districtHit) tierDistrict.push(u)
    else if (interestHit) tierInterest.push(u)
    else tierOther.push(u)
  }

  // 3. 各层内部先洗牌（保证同优先级下随机），再按优先级拼接
  shuffleInPlace(tierBoth)
  shuffleInPlace(tierDistrict)
  shuffleInPlace(tierInterest)
  shuffleInPlace(tierOther)

  var ranked = tierBoth.concat(tierDistrict).concat(tierInterest).concat(tierOther)

  // 4. 截取前 count 个
  var result = ranked.slice(0, Math.min(count, ranked.length))

  // 5. 最终再洗牌一次（避免结果总是按优先级顺序展示，更接近「随机匹配」体感）
  return shuffleInPlace(result.slice())
}

/**
 * 返回单个随机搭子（便捷函数）
 * @param {string} [excludeOpenId] - 排除该 openId
 * @returns {object|null} mock 用户，池为空时返回 null
 */
function getRandomPartner(excludeOpenId) {
  var list = getMockUsers(1, { excludeOpenId: excludeOpenId })
  return list.length > 0 ? list[0] : null
}

/**
 * 获取全部用户（调试用，返回副本）
 * @returns {Array}
 */
function getAllMockUsers() {
  return MOCK_USERS.slice()
}

module.exports = {
  MOCK_USERS: MOCK_USERS,
  getMockUsers: getMockUsers,
  getRandomPartner: getRandomPartner,
  getAllMockUsers: getAllMockUsers
}
