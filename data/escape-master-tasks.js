// data/escape-master-tasks.js
// C-P3 出逃大师官方任务模板（Task Hall · 出逃大师发布）
// 由虚拟角色「出逃大师」发布的官方出逃任务，每条绑定一个真实广州 POI
// 覆盖 11 区（天河/越秀/海珠/荔湾/白云/番禺/黄埔/花都/从化/增城/南沙）× 10 类主题
// 主题分类与 POI type 映射：walk→park、coffee→cafe，其余同名或跨类型合理搭配
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
  },

  // ===== 黄埔区 =====
  {
    templateId: 'em_018',
    topic: '长洲岛江风骑行',
    category: 'walk',
    district: '黄埔区',
    poiId: 'gz_poi_hp_01',
    maxMembers: 5,
    scheduledTime: 'weekend_morning',
    tags: ['官方', 'city walk', '历史', '江景'],
    description: '珠江江心岛长洲岛，是辛亥革命的策源地，也是广州最安静的江岛之一。沿环岛绿道慢慢走，看渔船泊在岸边，黄埔军校的旧围墙就在榕树后面。在江风里找一个长椅坐下，跟同伴讲一段你最近读到的人物故事，让历史的回声和江水一起流过。',
    steps: ['长洲岛渡口集合', '沿环岛绿道步行', '远眺黄埔军校旧址', '江边长椅坐下分享故事']
  },
  {
    templateId: 'em_019',
    topic: '黄埔军校近代史沙龙',
    category: 'salon',
    district: '黄埔区',
    poiId: 'gz_poi_hp_02',
    maxMembers: 6,
    scheduledTime: 'weekend_afternoon',
    tags: ['官方', '沙龙', '历史', '免费'],
    description: '1924年孙中山创办的军官学校，走出了无数近代史里的名字。在校本部旧址慢慢看，找一间最让你驻足的教室，想象当年坐在这里的年轻人怀着怎样的心事。看完在院子里围坐，每人分享一位你最想对话的近代人物，和为什么。',
    steps: ['黄埔军校旧址门口集合', '参观校本部复原陈列', '在孙总理纪念碑前停留', '院内围坐分享近代人物']
  },
  {
    templateId: 'em_020',
    topic: '科学城电竞音乐夜',
    category: 'music',
    district: '黄埔区',
    poiId: 'gz_poi_hp_07',
    maxMembers: 5,
    scheduledTime: 'weekend_evening',
    tags: ['官方', '音乐', '电竞', '年轻'],
    description: '游戏游艺产业城里藏着Livehouse和电竞赛场，周末夜常有独立乐队演出。一起看一场Live，在间奏时跟同伴聊一首你最近单曲循环的歌，散场后在园区夜色里走一圈，把今晚最打动你的一句歌词记在备忘录里。',
    steps: ['产业城门口集合', '看一场Live演出', '间奏时聊单曲循环的歌', '园区夜走并记录一句歌词']
  },

  // ===== 花都区 =====
  {
    templateId: 'em_021',
    topic: '花都湖滨水漫步',
    category: 'walk',
    district: '花都区',
    poiId: 'gz_poi_hd_01',
    maxMembers: 5,
    scheduledTime: 'weekend_afternoon',
    tags: ['官方', 'city walk', '湖景', '户外'],
    description: '青石海水库改造成的滨水公园，环湖绿道六公里，湿地、花海、夜景串成一条线。黄昏沿湖走半圈，等灯光一盏盏亮起来，在栈桥上停下拍一张倒影，跟同伴说说如果搬来湖边住，最想要一间怎样的房子。',
    steps: ['花都湖公园入口集合', '沿环湖绿道步行', '在栈桥拍倒影', '分享你理想的湖畔居所']
  },
  {
    templateId: 'em_022',
    topic: '芙蓉嶂登山徒步',
    category: 'sport',
    district: '花都区',
    poiId: 'gz_poi_hd_02',
    maxMembers: 4,
    scheduledTime: 'weekend_morning',
    tags: ['官方', '运动', '爬山', '山水'],
    description: '花都最高峰芙蓉峰360米，沿途有瀑布、水库和徒步道，是广州北郊的天然氧吧。结伴慢慢登顶，在山顶找个开阔处坐下，喝口水看远处的山脊线，跟同伴约定下一次想一起爬的山，把今天的喘息和约定一起留在山顶。',
    steps: ['芙蓉嶂景区入口集合', '沿徒步道登山', '山顶休息看山脊线', '约定下一座想爬的山']
  },
  {
    templateId: 'em_023',
    topic: '石头记矿物探秘',
    category: 'art',
    district: '花都区',
    poiId: 'gz_poi_hd_04',
    maxMembers: 4,
    scheduledTime: 'weekend_afternoon',
    tags: ['官方', '看展', '矿物', '亲子'],
    description: '全球首座矿物主题公园，珍稀矿石、宝石、化石在灯光下闪着各自的光。挑一块最想带走的水晶或化石，想象它在地底沉睡了多少年。看完在出口处交换彼此的发现，给对方挑一块"最像你"的石头，说说为什么。',
    steps: ['石头记矿物园入口集合', '参观矿物与化石展区', '各自挑一块最爱的矿石', '交换"最像你"的石头']
  },

  // ===== 从化区 =====
  {
    templateId: 'em_024',
    topic: '流溪河森林漫步',
    category: 'walk',
    district: '从化区',
    poiId: 'gz_poi_ch_01',
    maxMembers: 6,
    scheduledTime: 'weekend_morning',
    tags: ['官方', 'city walk', '森林', '自然'],
    description: '广州首个国家森林公园，流溪河水库在山间舒展成一片湖，岛上有鹿、有梅、有森林步道。沿步道走进林子深处，找一棵最粗的树合抱一下，在水边安静地坐十分钟，听鸟鸣和水声把城市的噪音一层层洗掉。',
    steps: ['森林公园入口集合', '沿森林步道步行', '找一棵大树合抱', '水边静坐十分钟']
  },
  {
    templateId: 'em_025',
    topic: '石门红叶摄影采风',
    category: 'photo',
    district: '从化区',
    poiId: 'gz_poi_ch_02',
    maxMembers: 4,
    scheduledTime: 'weekend_morning',
    tags: ['官方', '摄影', '红叶', '秋景'],
    description: '广州最美的秋色在石门，红叶、天池花海、竹林溪流叠成一幅画。带上相机或手机，沿溪流找最好的光线，给同伴拍一张被红叶框住的半身像。结束时各自选一张最舍不得删的照片，交换背后的故事，凑成今日双拼。',
    steps: ['石门森林公园入口集合', '沿红叶溪流采风', '为同伴拍一张红叶框像', '交换最舍不得删的照片']
  },
  {
    templateId: 'em_026',
    topic: '千泷沟瀑布徒步',
    category: 'sport',
    district: '从化区',
    poiId: 'gz_poi_ch_07',
    maxMembers: 4,
    scheduledTime: 'weekend_morning',
    tags: ['官方', '运动', '瀑布', '徒步'],
    description: '落差80米的千泷沟大瀑布藏在竹海深处，沿途溪流、石阶、竹影一路相随。结伴走完全程，在瀑布前的观景台感受水雾扑面，闭上眼听一分钟水声轰鸣。下山时跟同伴分享一段你最近"放下"的事，让瀑布把重量一起带走。',
    steps: ['千泷沟景区入口集合', '沿竹海步道徒步', '瀑布前闭眼听水声一分钟', '下山分享一段放下的事']
  },

  // ===== 增城区 =====
  {
    templateId: 'em_027',
    topic: '白水寨天南第一梯',
    category: 'sport',
    district: '增城区',
    poiId: 'gz_poi_zc_01',
    maxMembers: 4,
    scheduledTime: 'weekend_morning',
    tags: ['官方', '运动', '爬山', '瀑布'],
    description: '中国大陆落差最大的瀑布428.5米，9999级登山步道叫"天南第一梯"。量力而行走到一个共同的终点，在瀑布前合影留念。下山后找个农庄坐下，每人说一件登山时脑子里冒出来的念头，把山里的清净带回到饭桌上。',
    steps: ['白水寨景区入口集合', '沿登山步道上行至约定终点', '瀑布前合影', '农庄吃饭分享山间念头']
  },
  {
    templateId: 'em_028',
    topic: '正果老街增城味道',
    category: 'food',
    district: '增城区',
    poiId: 'gz_poi_zc_04',
    maxMembers: 5,
    scheduledTime: 'weekend_afternoon',
    tags: ['官方', '美食', '老街', '老广'],
    description: '增江畔的千年古镇老街，正果云吞、迟菜心、腊味是这里的招牌。三人一组各找一家最想试的老字号，互相带路完成一场小吃接力。吃饱了在江边走走，跟同伴说一道"如果开店最想卖"的菜，把增城味道变成你的菜单灵感。',
    steps: ['正果老街牌坊集合', '各找一家老字号', '小吃接力互相带路', '江边散步分享开店灵感']
  },
  {
    templateId: 'em_029',
    topic: '1978文创园旧厂漫游',
    category: 'art',
    district: '增城区',
    poiId: 'gz_poi_zc_03',
    maxMembers: 4,
    scheduledTime: 'weekend_afternoon',
    tags: ['官方', '看展', '创意', '拍照'],
    description: '旧糖纸厂改造成的文创园，电影院、咖啡馆、艺术展、婚礼小镇并排坐着。挑一个最像电影场景的角落拍一张，在艺术展里找一件让你停下来的作品，跟同伴聊聊如果给这件作品配一段BGM，你会选哪首。',
    steps: ['1978文创园入口集合', '逛艺术展与设计店', '找电影感角落合影', '分享给作品配的BGM']
  },

  // ===== 南沙区 =====
  {
    templateId: 'em_030',
    topic: '南沙湿地观鸟漫步',
    category: 'walk',
    district: '南沙区',
    poiId: 'gz_poi_ns_02',
    maxMembers: 6,
    scheduledTime: 'weekend_morning',
    tags: ['官方', 'city walk', '湿地', '观鸟'],
    description: '广州最南端的滨海湿地，红树林、芦苇荡、观鸟屋串成一条安静的水线。带上一双好走的鞋，在观鸟屋安静地等一只候鸟掠过水面，把鸟的名字和飞行的方向一起记下来。走完跟同伴说说你最近一次"想远行"的念头。',
    steps: ['南沙湿地公园入口集合', '沿湿地步道步行', '在观鸟屋等一只候鸟', '分享一次想远行的念头']
  },
  {
    templateId: 'em_031',
    topic: '百万葵园花海摄影',
    category: 'photo',
    district: '南沙区',
    poiId: 'gz_poi_ns_03',
    maxMembers: 5,
    scheduledTime: 'weekend_morning',
    tags: ['官方', '摄影', '花海', '拍照'],
    description: '中国首个大型葵花主题公园，四季花海、薰衣草、玫瑰园一层层铺开。在花海里找一个最想要的光线，给同伴拍一张逆光的半身像，再互换角色。结束时各自挑一张今天最得意的照片，打印出来寄给彼此，留一份花香做纪念。',
    steps: ['百万葵园入口集合', '在花海找最佳光线', '互相拍逆光半身像', '挑选最得意照片互寄']
  },
  {
    templateId: 'em_032',
    topic: '十九涌渔港海鲜寻味',
    category: 'food',
    district: '南沙区',
    poiId: 'gz_poi_ns_07',
    maxMembers: 5,
    scheduledTime: 'weekend_afternoon',
    tags: ['官方', '美食', '海鲜', '滨海'],
    description: '广州最南端的渔人码头，渔船、海鲜市集、特产街一字排开。先逛市集挑今天最想吃的海鲜，找一家大排档加工，边吃边看渔船归港。饭后跟同伴聊聊如果只能留一道广州味道给未来的自己，你会选哪道。',
    steps: ['十九涌渔人码头集合', '逛海鲜市集挑食材', '大排档加工边吃边看船', '分享留给未来的一道广州味']
  },

  // ===== 天河区（补 sport / music）=====
  {
    templateId: 'em_033',
    topic: '天河公园环湖慢跑',
    category: 'sport',
    district: '天河区',
    poiId: 'gz_poi_th_05',
    maxMembers: 4,
    scheduledTime: 'weekday_evening',
    tags: ['官方', '运动', '慢跑', '户外'],
    description: '78万平方米的城市绿肺，湖泊、树林、步道是下班后最好的解压场。三人一组沿环湖步道慢跑两公里，跑完在草坪上拉伸，各自说一件今天想"丢进湖里"的烦心事，让汗水和湖水一起把它带走。',
    steps: ['天河公园南门集合', '环湖步道慢跑两公里', '草坪拉伸放松', '分享一件丢进湖里的烦心事']
  },
  {
    templateId: 'em_034',
    topic: '广州大剧院建筑音乐漫游',
    category: 'music',
    district: '天河区',
    poiId: 'gz_poi_th_02',
    maxMembers: 4,
    scheduledTime: 'weekend_afternoon',
    tags: ['官方', '音乐', '建筑', '文艺'],
    description: '扎哈·哈迪德设计的砾石形建筑，像一块被珠江冲刷过的巨石。先绕着大剧院走一圈，找最像"砾石纹理"的角度拍一张，再走进大厅听一段午后音乐会。散场后跟同伴分享一段你最想在大剧院里听到的旋律，和它背后的故事。',
    steps: ['广州大剧院门口集合', '绕建筑一圈找纹理角度', '听一段午后音乐会', '分享最想在这里听到的旋律']
  },

  // ===== 越秀区（补 photo / food）=====
  {
    templateId: 'em_035',
    topic: '东山口洋楼摄影漫步',
    category: 'photo',
    district: '越秀区',
    poiId: 'gz_poi_yx_04',
    maxMembers: 4,
    scheduledTime: 'weekend_afternoon',
    tags: ['官方', '摄影', '建筑', '文艺'],
    description: '民国时期的西洋别墅群，红砖、拱廊、爬山虎在午后光影里最有味道。三人一组各选一栋最想拍的洋楼，互相做模特和摄影师，用同一卷"胶片"拍出三种东山口。结束时在咖啡馆汇总，给今天的影集起一个名字。',
    steps: ['东山口恤孤院路集合', '各选一栋洋楼互拍', '在咖啡馆汇总照片', '给今日影集起名']
  },
  {
    templateId: 'em_036',
    topic: '北京路千年古道寻味',
    category: 'food',
    district: '越秀区',
    poiId: 'gz_poi_yx_06',
    maxMembers: 5,
    scheduledTime: 'weekend_evening',
    tags: ['官方', '美食', '老广', '夜生活'],
    description: '北京路步行街下面压着历代路面遗址，地面上是老字号和新小吃并排的夜市。三人一组各找一种最想试的街头味道，互相带路完成一场小吃接力。吃饱了在千年古道遗址玻璃前停下，跟同伴说说你心里最"广州"的一口味道。',
    steps: ['北京路步行街入口集合', '各找一种街头味道', '小吃接力互相带路', '在古道遗址前分享最广州的一口']
  },

  // ===== 海珠区（补 photo / food）=====
  {
    templateId: 'em_037',
    topic: '太古仓黄昏剪影摄影',
    category: 'photo',
    district: '海珠区',
    poiId: 'gz_poi_hz_04',
    maxMembers: 4,
    scheduledTime: 'weekend_evening',
    tags: ['官方', '摄影', '江景', '黄昏'],
    description: '百年码头改造的太古仓，黄昏江景像一张明信片。沿码头找一个逆光的角度，给同伴拍一张被夕阳勾出轮廓的剪影，再互换角色。等太阳落到珠江水面以下，在江边坐下，各自说一张今天"最舍不得删"的照片和它的故事。',
    steps: ['太古仓入口集合', '沿码头找逆光角度', '互相拍黄昏剪影', '江边坐下分享最舍不得删的照片']
  },
  {
    templateId: 'em_038',
    topic: '琶醍夜市美食微醺',
    category: 'food',
    district: '海珠区',
    poiId: 'gz_poi_hz_10',
    maxMembers: 5,
    scheduledTime: 'weekend_evening',
    tags: ['官方', '美食', '夜生活', '江景'],
    description: '珠江畔的露天市集，手作摊位、精酿啤酒、街头美食在夜色里一字排开。三人一组各找一种最想试的街头味道，互相带路完成一场夜宵接力。最后一杯举向江面，跟同伴说一件本周值得干杯的小事，让江风把微醺吹散。',
    steps: ['琶醍露天市集入口集合', '各找一种街头味道', '夜宵接力互相带路', '举杯向江面分享本周值得干杯的小事']
  },

  // ===== 荔湾区（补 food / photo）=====
  {
    templateId: 'em_039',
    topic: '泮塘路西关味道寻访',
    category: 'food',
    district: '荔湾区',
    poiId: 'gz_poi_lw_08',
    maxMembers: 5,
    scheduledTime: 'weekend_morning',
    tags: ['官方', '美食', '老广', '市井'],
    description: '泮塘路是老西关的美食脊梁，马蹄糕、艇仔粥、肠粉的老字号一字排开。三人一组各找一家最想试的老字号，互相带路完成一场早茶接力。吃饱了在荔湾湖边走走，跟同伴说一道你小时候最馋的广式味道，和它藏在记忆里的画面。',
    steps: ['泮塘路入口集合', '各找一家老字号', '早茶接力互相带路', '荔湾湖边分享小时候最馋的味道']
  },
  {
    templateId: 'em_040',
    topic: '沙面欧式建筑摄影',
    category: 'photo',
    district: '荔湾区',
    poiId: 'gz_poi_lw_03',
    maxMembers: 4,
    scheduledTime: 'weekend_morning',
    tags: ['官方', '摄影', '建筑', '历史'],
    description: '珠江沙洲岛上的百年欧式建筑群，领事馆、教堂、洋行旧址在榕树下静静立着。沿环岛步道走一圈，挑一栋最像欧洲明信片的建筑拍一张，再给同伴拍一张在拱廊下走过路的抓拍。结束时在岛上的咖啡馆汇总，给这组照片起一个"沙面系列"的名字。',
    steps: ['沙面南街入口集合', '环岛步道找明信片角度', '拱廊下互相抓拍', '咖啡馆汇总起系列名']
  },

  // ===== 白云区（补 sport / photo）=====
  {
    templateId: 'em_041',
    topic: '白云湖环湖骑行',
    category: 'sport',
    district: '白云区',
    poiId: 'gz_poi_by_04',
    maxMembers: 4,
    scheduledTime: 'weekend_morning',
    tags: ['官方', '运动', '骑行', '湖景'],
    description: '广州最大人工湖，环湖绿道十公里，是周末骑行解压的好去处。三人一组沿绿道骑半圈，在湖心亭停下喝水，看水面把天空翻倍。骑完在草坪上拉伸，跟同伴说一件最近让你"想踩下刹车停一停"的事，让湖风把它吹慢一点。',
    steps: ['白云湖公园入口集合', '沿环湖绿道骑行', '湖心亭停下喝水', '草坪拉伸分享想停下的事']
  },
  {
    templateId: 'em_042',
    topic: '云台花园四季花展摄影',
    category: 'photo',
    district: '白云区',
    poiId: 'gz_poi_by_02',
    maxMembers: 4,
    scheduledTime: 'weekend_afternoon',
    tags: ['官方', '摄影', '花园', '拍照'],
    description: '白云山脚的欧式花园，四季花展、玻璃温室、罗马柱廊是出片的三件套。在花展里找一个最像油画的角度，给同伴拍一张被花框住的半身像，再互换角色。结束时在罗马柱廊下汇总，各自挑一张今天最得意的作品，交换背后的取景思路。',
    steps: ['云台花园入口集合', '在花展找油画角度', '互相拍花框半身像', '罗马柱廊下交换取景思路']
  },

  // ===== 番禺区（补 sport / food）=====
  {
    templateId: 'em_043',
    topic: '大夫山森林骑行',
    category: 'sport',
    district: '番禺区',
    poiId: 'gz_poi_py_03',
    maxMembers: 5,
    scheduledTime: 'weekend_morning',
    tags: ['官方', '运动', '骑行', '自然'],
    description: '广州最大的郊野公园，环湖绿道加骑行道在林子里绕来绕去。三人一组沿骑行道慢骑两圈，在湖边长椅停下喝水，看水面把树影切成碎片。骑完在草坪上拉伸，跟同伴分享一段你最近"想骑远一点"的念头，和它要去的目的地。',
    steps: ['大夫山森林公园南门集合', '沿骑行道慢骑', '湖边长椅停下喝水', '草坪拉伸分享想骑远一点的念头']
  },
  {
    templateId: 'em_044',
    topic: '市桥老街番禺味道',
    category: 'food',
    district: '番禺区',
    poiId: 'gz_poi_py_08',
    maxMembers: 5,
    scheduledTime: 'weekend_afternoon',
    tags: ['官方', '美食', '老街', '市井'],
    description: '老番禺的市桥老街，老字号美食和传统市集藏在巷子深处。三人一组各找一种最想试的番禺味道，互相带路完成一场小吃接力。吃饱了在老街的长椅上坐下，跟同伴说一道你最想"教给下一代"的家常菜，和它背后的家传故事。',
    steps: ['市桥老街入口集合', '各找一种番禺味道', '小吃接力互相带路', '老街长椅上分享家传菜故事']
  },

  // ===== 越秀区（补 music）=====
  {
    templateId: 'em_045',
    topic: '星海音乐厅珠江乐夜',
    category: 'music',
    district: '越秀区',
    poiId: 'gz_poi_yx_03',
    maxMembers: 4,
    scheduledTime: 'weekend_evening',
    tags: ['官方', '音乐', '文艺', '江景'],
    description: '珠江畔的音乐地标，建筑像一台被江水冲刷的钢琴。先沿二沙岛走到音乐厅门口，看灯光在江面画出琴键的倒影，再走进大厅听一场周末音乐会。散场后在江边慢慢走，跟同伴分享一段今晚最想循环的旋律，和它勾起的一段旧事。',
    steps: ['二沙岛晴波路口集合', '步行至星海音乐厅', '听一场周末音乐会', '江边散步分享想循环的旋律']
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
