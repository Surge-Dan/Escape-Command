// challenges.js — 33 每日挑战定义
// 五大类：type 类型(10) / mode 模式(8) / time 时间(5) / mood 心情(5) / special 特殊(5)
// condition 是触发条件表达式字符串，由挑战系统在指令完成时求值
// reward 是徽章进度 key，rewardDesc 是给用户看的奖励文案
// difficulty: 1 简单 / 2 中等 / 3 困难

const challenges = [
  // ===== type 类型挑战（完成某一类型的指令）=====
  { id: 'ch001', title: '色彩猎人', desc: '今天完成一条颜色探索类指令', type: 'color', condition: 'command.type === "color"', reward: 'color_progress', rewardDesc: '颜色探索进度 +3', difficulty: 1 },
  { id: 'ch002', title: '感官觉醒', desc: '今天完成一条感官体验类指令', type: 'sense', condition: 'command.type === "sense"', reward: 'sense_progress', rewardDesc: '感官体验进度 +3', difficulty: 1 },
  { id: 'ch003', title: '漫步启程', desc: '今天完成一条漫步发现类指令', type: 'walk', condition: 'command.type === "walk"', reward: 'walk_progress', rewardDesc: '漫步发现进度 +3', difficulty: 1 },
  { id: 'ch004', title: '味蕾探险', desc: '今天完成一条美食探索类指令', type: 'food', condition: 'command.type === "food"', reward: 'food_progress', rewardDesc: '美食探索进度 +3', difficulty: 1 },
  { id: 'ch005', title: '收藏时刻', desc: '今天完成一条收藏拼贴类指令', type: 'collect', condition: 'command.type === "collect"', reward: 'collect_progress', rewardDesc: '收藏拼贴进度 +3', difficulty: 1 },
  { id: 'ch006', title: '文化漫步', desc: '今天完成一条文化类指令', type: 'culture', condition: 'command.type === "culture"', reward: 'culture_progress', rewardDesc: '文化漫游进度 +3', difficulty: 1 },
  { id: 'ch007', title: '色彩进阶', desc: '今天完成 3 条颜色探索类指令', type: 'color', condition: 'count(command.type === "color") >= 3', reward: 'color_progress', rewardDesc: '颜色探索进度 +5', difficulty: 2 },
  { id: 'ch008', title: '感官进阶', desc: '今天完成 3 条感官体验类指令', type: 'sense', condition: 'count(command.type === "sense") >= 3', reward: 'sense_progress', rewardDesc: '感官体验进度 +5', difficulty: 2 },
  { id: 'ch009', title: '美食双拼', desc: '今天完成 2 条美食探索类指令', type: 'food', condition: 'count(command.type === "food") >= 2', reward: 'food_progress', rewardDesc: '美食探索进度 +4', difficulty: 2 },
  { id: 'ch010', title: '收藏双子', desc: '今天完成 2 条收藏拼贴类指令', type: 'collect', condition: 'count(command.type === "collect") >= 2', reward: 'collect_progress', rewardDesc: '收藏拼贴进度 +4', difficulty: 2 },

  // ===== mode 模式挑战（完成某一模式的指令）=====
  { id: 'ch011', title: '微出逃日', desc: '今天用微出逃模式完成一条指令', type: 'mode', condition: 'command.mode === "micro"', reward: 'micro_progress', rewardDesc: '微出逃进度 +3', difficulty: 1 },
  { id: 'ch012', title: '漫游日', desc: '今天用城市漫游模式完成一条指令', type: 'mode', condition: 'command.mode === "walk"', reward: 'walk_mode_progress', rewardDesc: '城市漫游进度 +3', difficulty: 1 },
  { id: 'ch013', title: '双人时光', desc: '今天用双人出逃模式完成一条指令', type: 'mode', condition: 'command.mode === "double"', reward: 'double_progress', rewardDesc: '双人出逃进度 +3', difficulty: 2 },
  { id: 'ch014', title: '夜行客', desc: '今晚 20:00 后完成一条指令', type: 'mode', condition: 'command.mode === "night" || record.hour >= 20', reward: 'night_progress', rewardDesc: '夜行进度 +3', difficulty: 2 },
  { id: 'ch015', title: '雨天出门', desc: '今天在雨天完成一条指令', type: 'mode', condition: 'command.mode === "rainy" || weather.isRainy === true', reward: 'rainy_progress', rewardDesc: '雨天进度 +3', difficulty: 2 },
  { id: 'ch016', title: '微出逃三连', desc: '今天用微出逃模式完成 3 条指令', type: 'mode', condition: 'count(command.mode === "micro") >= 3', reward: 'micro_progress', rewardDesc: '微出逃进度 +5', difficulty: 3 },
  { id: 'ch017', title: '双人冒险', desc: '今天用双人出逃模式完成 2 条指令', type: 'mode', condition: 'count(command.mode === "double") >= 2', reward: 'double_progress', rewardDesc: '双人出逃进度 +5', difficulty: 3 },
  { id: 'ch018', title: '深夜连续', desc: '今晚连续完成 2 条指令', type: 'mode', condition: 'count(record.hour >= 20) >= 2', reward: 'night_progress', rewardDesc: '夜行进度 +5', difficulty: 3 },

  // ===== time 时间挑战（在特定时间段完成指令）=====
  { id: 'ch019', title: '清晨出逃', desc: '在上午 10 点前完成一条指令', type: 'time', condition: 'record.hour < 10', reward: 'time_progress', rewardDesc: '时间进度 +3', difficulty: 2 },
  { id: 'ch020', title: '夜晚出逃', desc: '在晚上 8 点后完成一条指令', type: 'time', condition: 'record.hour >= 20', reward: 'time_progress', rewardDesc: '时间进度 +3', difficulty: 1 },
  { id: 'ch021', title: '午休时光', desc: '在中午 12 点到 14 点之间完成一条指令', type: 'time', condition: 'record.hour >= 12 && record.hour < 14', reward: 'time_progress', rewardDesc: '时间进度 +3', difficulty: 1 },
  { id: 'ch022', title: '早起鸟', desc: '在上午 9 点前完成一条指令', type: 'time', condition: 'record.hour < 9', reward: 'time_progress', rewardDesc: '时间进度 +4', difficulty: 3 },
  { id: 'ch023', title: '深夜档', desc: '在晚上 9 点后完成一条指令', type: 'time', condition: 'record.hour >= 21', reward: 'time_progress', rewardDesc: '时间进度 +4', difficulty: 2 },

  // ===== mood 心情挑战（完成指令并记录某种心情）=====
  { id: 'ch024', title: '开心一刻', desc: '完成一条指令并记录心情为「开心」', type: 'mood', condition: 'record.mood === "happy"', reward: 'mood_progress', rewardDesc: '心情进度 +3', difficulty: 1 },
  { id: 'ch025', title: '平静时光', desc: '完成一条指令并记录心情为「平静」', type: 'mood', condition: 'record.mood === "calm"', reward: 'mood_progress', rewardDesc: '心情进度 +3', difficulty: 1 },
  { id: 'ch026', title: '惊喜发现', desc: '完成一条指令并记录心情为「惊喜」', type: 'mood', condition: 'record.mood === "surprise"', reward: 'mood_progress', rewardDesc: '心情进度 +3', difficulty: 2 },
  { id: 'ch027', title: '治愈瞬间', desc: '完成一条指令并记录心情为「治愈」', type: 'mood', condition: 'record.mood === "heal"', reward: 'mood_progress', rewardDesc: '心情进度 +3', difficulty: 2 },
  { id: 'ch028', title: '好玩时刻', desc: '完成一条指令并记录心情为「好玩」', type: 'mood', condition: 'record.mood === "fun"', reward: 'mood_progress', rewardDesc: '心情进度 +3', difficulty: 1 },

  // ===== special 特殊挑战 =====
  { id: 'ch029', title: '收藏家', desc: '今天收藏 3 条指令到收藏夹', type: 'special', condition: 'count(action.type === "collect_command") >= 3', reward: 'collect_progress', rewardDesc: '收藏进度 +5', difficulty: 1 },
  { id: 'ch030', title: '街头摄影师', desc: '今天完成指令时拍摄 5 张照片', type: 'special', condition: 'count(action.type === "take_photo") >= 5', reward: 'photo_progress', rewardDesc: '摄影进度 +5', difficulty: 2 },
  { id: 'ch031', title: '探索新境', desc: '今天去一个从没去过的区域完成指令', type: 'special', condition: 'record.isNewArea === true', reward: 'explore_progress', rewardDesc: '探索进度 +5', difficulty: 3 },
  { id: 'ch032', title: '数字排毒', desc: '完成一条指令期间不看手机（除拍照外）', type: 'special', condition: 'record.phoneFree === true', reward: 'special_progress', rewardDesc: '特殊进度 +5', difficulty: 3 },
  { id: 'ch033', title: '三连击', desc: '今天完成 3 条指令', type: 'special', condition: 'count(command.completed) >= 3', reward: 'challenge_count', rewardDesc: '挑战计数 +1，出逃进度 +6', difficulty: 3 }
]

module.exports = challenges
