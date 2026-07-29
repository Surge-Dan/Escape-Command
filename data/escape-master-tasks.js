// data/escape-master-tasks.js
// C-P3 出逃大师官方任务模板（Task Hall · 出逃大师发布）
// 由虚拟角色「出逃大师」发布的官方出逃任务，每条绑定一个真实广州 POI
// 覆盖 6 区（天河/越秀/海珠/荔湾/白云/番禺）× 6 类主题（walk/art/salon/coffee/book/market）
// 主题分类与 POI type 对齐：walk→park、coffee→cafe，其余同名
// 纯数据模块，零 wx 依赖

'use strict'

// 出逃大师官方任务模板列表
// templateId 规则：em_ 前缀 + 3 位数字
// scheduledTime 可选值：weekday_evening / weekend_morning / weekend_afternoon / weekend_evening / anytime
var ESCAPE_MASTER_TEMPLATES = [
  // ===== 越秀区 =====
  {
    templateId: 'em_001',
    topic: '二沙岛艺术漫游',
    category: 'walk',
    district: '越秀区',
    poiId: 'gz_poi_yx_02',
    maxMembers: 5,
    scheduledTime: 'weekend_morning',
    tags: ['官方', 'city walk', '户外', '文艺'],
    description: '从星海音乐厅出发，沿二沙岛绿道漫游，路过广东美术馆与户外雕塑群，在珠江畔的草地上坐下，分享一首最近循环的歌和一段藏在歌里的心情。这是城市中轴线上最温柔的早晨，适合把节奏彻底交给风。',
    steps: ['在星海音乐厅门口集合', '沿绿道步行至广东美术馆', '在户外雕塑前合影', '找一片草地坐下分享感受']
  },
  {
    templateId: 'em_002',
    topic: '东山口洋楼看展',
    category: 'art',
    district: '越秀区',
    poiId: 'gz_poi_yx_05',
    maxMembers: 4,
    scheduledTime: 'weekend_afternoon',
    tags: ['官方', '看展', '文艺', '建筑'],
    description: '走进1922年的逵园洋楼，看一场青年艺术家的当代展。看完展沿恤孤院路慢慢走，数一数这条街上有多少栋民国老洋楼，挑一栋最想敲门进去的，听它讲一段旧时光。东山口的午后，连光影都带着旧故事的回声。',
    steps: ['逵园艺术馆门前集合', '入馆看展约一小时', '沿恤孤院路慢走数洋楼', '在咖啡馆分享最打动你的作品']
  },
  {
    templateId: 'em_003',
    topic: '东山口咖啡慢聊',
    category: 'coffee',
    district: '越秀区',
    poiId: 'gz_poi_yx_10',
    maxMembers: 4,
    scheduledTime: 'weekend_afternoon',
    tags: ['官方', '咖啡', '探店', '文艺'],
    description: '在洋楼里的复古咖啡馆点一杯手冲，跟咖啡师聊两句豆子的故事和产地。窗外是东山口的梧桐和老洋楼，一个下午只做一件事：把节奏放慢，听彼此讲一个最近被忽略的发现，把日常里的小停顿说出口。',
    steps: ['印象咖啡店内集合', '各自点一杯手冲', '与咖啡师聊豆子故事', '围坐分享一个最近的发现']
  },

  // ===== 荔湾区 =====
  {
    templateId: 'em_004',
    topic: '沙面欧式建筑漫步',
    category: 'walk',
    district: '荔湾区',
    poiId: 'gz_poi_lw_03',
    maxMembers: 5,
    scheduledTime: 'weekend_morning',
    tags: ['官方', 'city walk', '建筑', '拍照'],
    description: '珠江沙洲岛上的百年欧式建筑群，领事馆、教堂、洋行旧址静静立在榕树下。沿环岛步道走一圈，挑一栋最想住进去的楼，给它起个新名字，再想想如果住进去会过上怎样的一天。沙面的清晨，连脚步声都是慢的。',
    steps: ['沙面南街入口集合', '环岛步道步行一圈', '挑一栋建筑合影', '分享你给它的名字']
  },
  {
    templateId: 'em_005',
    topic: '永庆坊西关文化',
    category: 'salon',
    district: '荔湾区',
    poiId: 'gz_poi_lw_01',
    maxMembers: 6,
    scheduledTime: 'weekend_afternoon',
    tags: ['官方', '文化', '老广', '沙龙'],
    description: '从李小龙故居出发，穿过粤剧博物馆的园林，在骑楼下听一段粤剧选段。永庆坊是西关活化的样本，新旧在这里并排坐着，等你来认一认哪面墙更老，哪扇窗里藏着上一辈的故事。走完这条街，你也成了半个西关人。',
    steps: ['永庆坊入口集合', '参观李小龙故居', '走进粤剧博物馆', '在骑楼下听一段粤剧', '分享你对西关的印象']
  },
  {
    templateId: 'em_006',
    topic: '钟书阁镜面寻书',
    category: 'book',
    district: '荔湾区',
    poiId: 'gz_poi_lw_09',
    maxMembers: 4,
    scheduledTime: 'weekend_afternoon',
    tags: ['官方', '书店', '阅读', '网红'],
    description: '镜面穹顶的钟书阁藏在永庆坊的洋楼里，像是把整个西关倒映进了书架。挑一本讲广州或岭南的书，在咖啡区坐下读半小时，把书里最打动你的一句话抄在备忘录里，再和同伴交换抄下的句子，凑成一首新的小诗。',
    steps: ['钟书阁门口集合', '各自挑一本岭南主题书', '咖啡区静读半小时', '交换抄下的句子']
  },

  // ===== 天河区 =====
  {
    templateId: 'em_007',
    topic: '省博岭南探秘',
    category: 'art',
    district: '天河区',
    poiId: 'gz_poi_th_01',
    maxMembers: 5,
    scheduledTime: 'weekend_morning',
    tags: ['官方', '看展', '免费', '文化'],
    description: '走进珠江新城的省博，在广东历史文化陈列里找一件最想带回家的展品。木雕、端砚、广彩瓷，每一件都是岭南人留下的指纹。看完去负一层歇歇脚，和同伴说说你会把这件展品摆在房间哪个位置，为什么是它。',
    steps: ['省博正门集合领票', '参观广东历史文化陈列', '各自选一件最爱的展品', '在大堂分享你的选择']
  },
  {
    templateId: 'em_008',
    topic: '天环精品咖啡品鉴',
    category: 'coffee',
    district: '天河区',
    poiId: 'gz_poi_th_04',
    maxMembers: 4,
    scheduledTime: 'weekday_evening',
    tags: ['官方', '咖啡', '探店', '年轻'],
    description: '下班后到天环广场的Seesaw点一杯手冲，跟同伴各选一支不同产区的豆子，互相尝一口对方的那杯，聊聊为什么选它。把今晚的风味和心情一起记在备忘录里，留给下一次复购时翻出来对照。',
    steps: ['Seesaw天环店集合', '各自点不同产区手冲', '互换品尝', '记录今晚的风味笔记']
  },
  {
    templateId: 'em_009',
    topic: '方所美学漫游',
    category: 'book',
    district: '天河区',
    poiId: 'gz_poi_th_03',
    maxMembers: 5,
    scheduledTime: 'weekend_afternoon',
    tags: ['官方', '书店', '阅读', '文艺'],
    description: '太古汇负一层的方所是广州文化地标，3800㎡空间里书、衣、器、展并陈，像一座可以走进去的美学辞典。挑一本设计或生活美学的书，找一张椅子坐下翻完一个章节，再和同伴交换一句最想抄走的笔记。',
    steps: ['方所入口集合', '各自挑一本美学书', '在阅读区静读一个章节', '分享书中一个观点']
  },
  {
    templateId: 'em_010',
    topic: '琶醍夜市微醺',
    category: 'market',
    district: '天河区',
    poiId: 'gz_poi_th_08',
    maxMembers: 5,
    scheduledTime: 'weekend_evening',
    tags: ['官方', '市集', '夜生活', '江景'],
    description: '珠江啤酒厂改造的琶醍，精酿酒吧、露天市集、江景露台一字排开。黄昏入座，点一杯精酿看珠江两岸的灯一盏盏亮起来，逛一圈手作摊位淘一件小物，再回江边坐下聊到夜深，让江风把一周的疲惫吹散。',
    steps: ['琶醍入口集合', '点一杯精酿看江景', '逛手作市集', '回江边露台夜聊']
  },

  // ===== 海珠区 =====
  {
    templateId: 'em_011',
    topic: '海珠湿地观鸟漫步',
    category: 'walk',
    district: '海珠区',
    poiId: 'gz_poi_hz_07',
    maxMembers: 6,
    scheduledTime: 'weekend_morning',
    tags: ['官方', 'city walk', '自然', '观鸟'],
    description: '广州最大的城央湿地，花海、果园、观鸟屋串成一条慢线。带上相机或一双好走的鞋，在观鸟屋安静地等一只白鹭掠过水面，把这一刻的安静和鸟鸣一起记下来，带回城市里慢慢用。',
    steps: ['湿地北门集合', '沿花海步道步行', '在观鸟屋停留十分钟', '分享你看到的第一只鸟']
  },
  {
    templateId: 'em_012',
    topic: '江南西文创探店',
    category: 'salon',
    district: '海珠区',
    poiId: 'gz_poi_hz_06',
    maxMembers: 4,
    scheduledTime: 'weekend_afternoon',
    tags: ['官方', '沙龙', '创意', '探店'],
    description: '老社区里的文创聚集地，独立咖啡馆、手作店、小型画廊藏在街巷之间，需要弯进弄堂才会遇见。三人一组，各自找一家最想推荐的小店，互相带路完成一场小漫游，最后在咖啡馆汇总各自的发现。',
    steps: ['江南西地铁站集合', '各自找一家推荐小店', '互相带路探店', '在咖啡馆汇总感受']
  },
  {
    templateId: 'em_013',
    topic: '太古仓黄昏市集',
    category: 'market',
    district: '海珠区',
    poiId: 'gz_poi_hz_04',
    maxMembers: 5,
    scheduledTime: 'weekend_evening',
    tags: ['官方', '市集', '江景', '夜生活'],
    description: '百年码头改造的太古仓，黄昏江景像一张明信片。沿码头逛手作市集和餐厅，等太阳落到珠江水面以下，给同伴拍一张逆光的剪影，再一起坐下分享彼此镜头里最舍不得删的那一张。',
    steps: ['太古仓入口集合', '沿码头逛市集', '拍一张黄昏剪影', '江边坐下分享照片']
  },

  // ===== 白云区 =====
  {
    templateId: 'em_014',
    topic: '摩星岭看日落',
    category: 'walk',
    district: '白云区',
    poiId: 'gz_poi_by_08',
    maxMembers: 4,
    scheduledTime: 'weekend_afternoon',
    tags: ['官方', 'city walk', '户外', '爬山'],
    description: '白云山最高点382米，是俯瞰广州全景的天然看台。下午从南门上山，赶在日落前到摩星岭，看城市在天光下慢慢亮起灯，从一条线连成一片海。下山时只剩脚步声和虫鸣，把一整天的喧嚣都留在山顶。',
    steps: ['白云山南门集合', '徒步至摩星岭', '等日落看城市亮灯', '结伴下山']
  },
  {
    templateId: 'em_015',
    topic: '集装箱咖啡慢聊',
    category: 'coffee',
    district: '白云区',
    poiId: 'gz_poi_by_06',
    maxMembers: 3,
    scheduledTime: 'weekend_morning',
    tags: ['官方', '咖啡', '探店', '户外'],
    description: '飞翔公园里的集装箱咖啡馆，露台对着一片绿植，是藏在市区里的小绿洲。点一杯冰滴坐到露台，听风穿过叶子的声音，跟同伴聊一件最近让你停下脚步的小事，把早晨拉长，把节奏交还给呼吸。',
    steps: ['飞翔公园入口集合', '集装箱咖啡馆点单', '露台入座慢聊', '分享一件近期小事']
  },

  // ===== 番禺区 =====
  {
    templateId: 'em_016',
    topic: '紫泥堂旧厂艺术',
    category: 'art',
    district: '番禺区',
    poiId: 'gz_poi_py_05',
    maxMembers: 4,
    scheduledTime: 'weekend_afternoon',
    tags: ['官方', '看展', '创意', '拍照'],
    description: '沙湾紫泥村的旧糖厂改造成了艺术园区，斑驳厂房里藏着画廊、设计店和咖啡馆，旧机器还停在原处。挑一面最像电影海报的墙拍一张，在锈迹前想象它当年运转的样子，把新旧叠进同一张照片里。',
    steps: ['紫泥堂园区入口集合', '逛画廊与设计店', '找一面墙拍海报照', '在咖啡馆分享你的画面']
  },
  {
    templateId: 'em_017',
    topic: '沙湾古镇岭南寻根',
    category: 'salon',
    district: '番禺区',
    poiId: 'gz_poi_py_01',
    maxMembers: 6,
    scheduledTime: 'weekend_morning',
    tags: ['官方', '文化', '历史', '老广'],
    description: '八百年的岭南古镇，祠堂、蚝壳墙、飘色馆串起一条旧时光的线。在何氏大宗祠前坐一会，听一段广东音乐，找一面蚝壳墙摸一摸岁月的纹路，听老人讲一段沙湾的旧事，让古镇把它的故事说给你听。',
    steps: ['沙湾古镇游客中心集合', '参观何氏大宗祠', '寻访蚝壳墙', '在飘色馆听一段广东音乐', '分享你对古镇的印象']
  }
]

// 按行政区筛选出逃大师任务模板
function getTemplatesByDistrict(district) {
  if (typeof district !== 'string') return []
  return ESCAPE_MASTER_TEMPLATES.filter(function (t) { return t.district === district })
}

module.exports = {
  ESCAPE_MASTER_TEMPLATES: ESCAPE_MASTER_TEMPLATES,
  getTemplatesByDistrict: getTemplatesByDistrict
}
