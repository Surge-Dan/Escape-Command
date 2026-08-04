// badges.js — 19 徽章定义
// 9 个迁移自 utils/constants.js 的 BADGES + 10 个新增徽章
// 每个徽章含 category 字段用于 UI 分组：
//   milestone（里程碑）/ type（类型）/ mode（模式）/ social（社交）/ special（特殊）

const badges = [
  // ===== milestone 里程碑 =====
  { id: 'first_escape', name: '初次出逃', desc: '完成了第一次出逃', icon: '/assets/icons/badge-first-escape.svg', gradient: 'linear-gradient(135deg, #FFE4B5, #FFD700)', color: '#D4A017', category: 'milestone' },
  { id: 'seven_streak', name: '七连胜', desc: '连续 7 天完成出逃', icon: '/assets/icons/badge-seven-streak.svg', gradient: 'linear-gradient(135deg, #C9E8E3, #5CBF9E)', color: '#3A8C6F', category: 'milestone' },
  { id: 'thirty_streak', name: '月度漫游家', desc: '连续 30 天完成出逃', icon: '/assets/icons/badge-thirty-streak.svg', gradient: 'linear-gradient(135deg, #E8D5F5, #9B7BB8)', color: '#6B4F8A', category: 'milestone' },

  // ===== type 类型 =====
  { id: 'color_hunter', name: '蓝色猎人', desc: '完成 10 次颜色探索指令', icon: '/assets/icons/badge-color-hunter.svg', gradient: 'linear-gradient(135deg, #D4E8FF, #5B8FB9)', color: '#3A6D96', category: 'type' },
  { id: 'market_regular', name: '菜市场熟客', desc: '完成 5 次市井美食相关指令', icon: '/assets/icons/badge-market-regular.svg', gradient: 'linear-gradient(135deg, #FFE8D6, #D98A5C)', color: '#A8603A', category: 'type' },
  { id: 'culture_lover', name: '文化漫游者', desc: '完成 5 次文化类指令', icon: '/assets/icons/badge-culture-lover.svg', gradient: 'linear-gradient(135deg, #D4EDFF, #5CBF9E)', color: '#3A8C6F', category: 'type' },

  // ===== mode 模式 =====
  { id: 'night_walker', name: '夜行者', desc: '深夜完成 5 次出逃', icon: '/assets/icons/badge-night-walker.svg', gradient: 'linear-gradient(135deg, #E2E4F0, #6B7280)', color: '#4A5060', category: 'mode' },
  { id: 'rainy_walker', name: '雨天漫步者', desc: '雨天完成 3 次出逃', icon: '/assets/icons/badge-rainy-walker.svg', gradient: 'linear-gradient(135deg, #D4EDFF, #7EC8F5)', color: '#3A8AB5', category: 'mode' },
  { id: 'micro_master', name: '微出逃达人', desc: '完成 10 次微出逃', icon: '/assets/icons/badge-micro-master.svg', gradient: 'linear-gradient(135deg, #D4EDFF, #7BAE7F)', color: '#5A8E5E', category: 'mode' },
  { id: 'walk_master', name: '漫游达人', desc: '完成 10 次城市漫游', icon: '/assets/icons/badge-walk-master.svg', gradient: 'linear-gradient(135deg, #FFE8D6, #D98A5C)', color: '#A8603A', category: 'mode' },
  { id: 'double_master', name: '双人冒险家', desc: '完成 5 次双人出逃', icon: '/assets/icons/badge-double-master.svg', gradient: 'linear-gradient(135deg, #E8D5F5, #9B7BB8)', color: '#6B4F8A', category: 'mode' },
  { id: 'night_master', name: '深夜诗人', desc: '完成 10 次深夜出逃', icon: '/assets/icons/badge-night-master.svg', gradient: 'linear-gradient(135deg, #D4D0E8, #9B8EC4)', color: '#5A4A8A', category: 'mode' },
  { id: 'rainy_master', name: '雨天诗人', desc: '完成 10 次雨天出逃', icon: '/assets/icons/badge-rainy-master.svg', gradient: 'linear-gradient(135deg, #D4EDFF, #7EC8F5)', color: '#3A8AB5', category: 'mode' },

  // ===== social 社交 =====
  { id: 'social_master', name: '社交达人', desc: '邀请 3 位朋友完成双人出逃', icon: '/assets/icons/badge-social-master.svg', gradient: 'linear-gradient(135deg, #FFE4B5, #D48A5A)', color: '#A8603A', category: 'social' },
  { id: 'collector', name: '收藏家', desc: '收藏 20 条指令', icon: '/assets/icons/badge-collector.svg', gradient: 'linear-gradient(135deg, #FFF0D4, #C9B037)', color: '#8A7620', category: 'social' },

  // ===== special 特殊 =====
  { id: 'city_detective', name: '城市侦探', desc: '探索过 50 个不同角落', icon: '/assets/icons/badge-city-detective.svg', gradient: 'linear-gradient(135deg, #FFF0D4, #C9B037)', color: '#8A7620', category: 'special' },
  { id: 'member_pro', name: '出逃会员', desc: '会员功能暂不展示', icon: '/assets/icons/badge-member-pro.svg', gradient: 'linear-gradient(135deg, #2E2F33, #1A1B1E)', color: '#C9B037', category: 'special' },
  { id: 'explorer', name: '探索家', desc: '完成 6 种类型的指令', icon: '/assets/icons/badge-explorer.svg', gradient: 'linear-gradient(135deg, #D4E8FF, #5B8FB9)', color: '#3A6D96', category: 'special' },
  { id: 'challenge_king', name: '挑战王', desc: '完成 7 个每日挑战', icon: '/assets/icons/badge-challenge-king.svg', gradient: 'linear-gradient(135deg, #FFE4B5, #FF6B6B)', color: '#A04040', category: 'special' },

  // ===== B4 milestone 阶段记录（出逃次数里程碑）=====
  { id: 'stage_explorer', name: '初探者', desc: '完成 10 次出逃', icon: '/assets/icons/badge-stage-explorer.svg', gradient: 'linear-gradient(135deg, #D4EDFF, #7BAE7F)', color: '#5A8E5E', category: 'milestone' },
  { id: 'stage_familiar', name: '熟路人', desc: '完成 30 次出逃', icon: '/assets/icons/badge-stage-familiar.svg', gradient: 'linear-gradient(135deg, #FFE8D6, #D98A5C)', color: '#A8603A', category: 'milestone' },
  { id: 'stage_detective', name: '城市侦探', desc: '完成 50 次出逃', icon: '/assets/icons/badge-stage-detective.svg', gradient: 'linear-gradient(135deg, #FFF0D4, #C9B037)', color: '#8A7620', category: 'milestone' },
  { id: 'stage_expert', name: '城市专家', desc: '完成 100 次出逃', icon: '/assets/icons/badge-stage-expert.svg', gradient: 'linear-gradient(135deg, #E8D5F5, #9B7BB8)', color: '#6B4F8A', category: 'milestone' },

  // ===== B4 special 城市方向收集（基于坐标相对质心方位）=====
  { id: 'direction_east', name: '东征', desc: '在城市东侧完成 3 次出逃', icon: '/assets/icons/badge-direction-east.svg', gradient: 'linear-gradient(135deg, #FFE4B5, #FFD700)', color: '#D4A017', category: 'special' },
  { id: 'direction_south', name: '南探', desc: '在城市南侧完成 3 次出逃', icon: '/assets/icons/badge-direction-south.svg', gradient: 'linear-gradient(135deg, #D4EDFF, #7EC8F5)', color: '#3A8AB5', category: 'special' },
  { id: 'direction_west', name: '西行', desc: '在城市西侧完成 3 次出逃', icon: '/assets/icons/badge-direction-west.svg', gradient: 'linear-gradient(135deg, #FFE8D6, #D98A5C)', color: '#A8603A', category: 'special' },
  { id: 'direction_north', name: '北游', desc: '在城市北侧完成 3 次出逃', icon: '/assets/icons/badge-direction-north.svg', gradient: 'linear-gradient(135deg, #E8D5F5, #9B7BB8)', color: '#6B4F8A', category: 'special' },
  { id: 'direction_central', name: '中枢', desc: '在城市中心完成 3 次出逃', icon: '/assets/icons/badge-direction-central.svg', gradient: 'linear-gradient(135deg, #C9E8E3, #5CBF9E)', color: '#3A8C6F', category: 'special' }
]

module.exports = badges
