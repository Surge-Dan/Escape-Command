// data/guangzhou-pois.js
// 广州 POI 数据库（C-P3 任务大厅城市数据）
// 6 区共约 60 个真实 POI，覆盖 art/cafe/book/park/market/salon 六类
// 纯数据模块，零 wx 依赖

'use strict'

// POI 类型定义
var POI_TYPES = {
  art: { label: '看展', icon: '🎨' },
  cafe: { label: '咖啡', icon: '☕' },
  book: { label: '书店', icon: '📚' },
  park: { label: '公园', icon: '🌳' },
  market: { label: '市集', icon: '🏪' },
  salon: { label: '沙龙', icon: '🎪' },
  sport: { label: '运动', icon: '🏃' },
  music: { label: '音乐', icon: '🎵' },
  photo: { label: '摄影', icon: '📷' },
  food: { label: '美食', icon: '🍜' }
}

var GUANGZHOU_POIS = [
  // ===== 天河区（10 个）=====
  { id: 'gz_poi_th_01', name: '广东省博物馆', district: '天河区', address: '天河区珠江新城珠江东路2号', latitude: 23.1199, longitude: 113.3263, type: 'art', businessHours: [9, 17], tags: ['看展', '免费', '室内', '文艺'], description: '省级综合性博物馆，常设广东历史文化陈列，免费开放需预约' },
  { id: 'gz_poi_th_02', name: '广州大剧院', district: '天河区', address: '天河区珠江西路1号', latitude: 23.1193, longitude: 113.3218, type: 'art', businessHours: [9, 22], tags: ['看展', '建筑', '文艺'], description: '扎哈·哈迪德设计地标建筑，外形如砾石，可参观可观演' },
  { id: 'gz_poi_th_03', name: '方所书店（太古汇店）', district: '天河区', address: '天河路383号太古汇负一层', latitude: 23.1318, longitude: 113.3255, type: 'book', businessHours: [10, 22], tags: ['书店', '文艺', '阅读'], description: '美学生活书店，3800㎡空间含图书/服饰/咖啡/展览，广州文化地标' },
  { id: 'gz_poi_th_04', name: 'Seesaw咖啡（天环店）', district: '天河区', address: '天河路218号天环广场L122', latitude: 23.1345, longitude: 113.3242, type: 'cafe', businessHours: [8, 22], tags: ['咖啡', '探店', '年轻'], description: '精品咖啡品牌，手冲单品和特调饮品，适合安静工作或朋友小聚' },
  { id: 'gz_poi_th_05', name: '天河公园', district: '天河区', address: '天河区黄埔大道888号', latitude: 23.1258, longitude: 113.3592, type: 'park', businessHours: [6, 22], tags: ['公园', '户外', '散步', '自然'], description: '78万平方米城市绿肺，湖泊+树林+步道，适合周末慢跑野餐' },
  { id: 'gz_poi_th_06', name: 'K11购物艺术中心', district: '天河区', address: '珠江新城猎德大道与珠江东路交汇处', latitude: 23.1186, longitude: 113.3239, type: 'art', businessHours: [10, 22], tags: ['看展', '购物', '文艺'], description: '融合艺术与商业空间，常设当代艺术展和pop-up快闪店' },
  { id: 'gz_poi_th_07', name: '树德生活馆（K11店）', district: '天河区', address: '珠江东路6号K11负一层', latitude: 23.1186, longitude: 113.3239, type: 'book', businessHours: [10, 22], tags: ['书店', '生活', '设计'], description: '设计书店+生活馆，选书偏设计与生活方式，有阅读座位区' },
  { id: 'gz_poi_th_08', name: '琶醍啤酒文化创意艺术区', district: '天河区', address: '阅江西路磨碟沙隧道入口', latitude: 23.1075, longitude: 113.3268, type: 'market', businessHours: [11, 24], tags: ['市集', '夜生活', '江景'], description: '珠江啤酒厂改造，含精酿酒吧/餐厅/市集/江景露天位' },
  { id: 'gz_poi_th_09', name: '猎德村祠堂群', district: '天河区', address: '天河区猎德大道猎德村内', latitude: 23.1188, longitude: 113.3298, type: 'salon', businessHours: [8, 18], tags: ['沙龙', '文化', '老广', '历史'], description: 'CBD里的宗祠群，岭南建筑活化石，适合文化主题沙龙和分享会' },
  { id: 'gz_poi_th_10', name: '扶光书店（保利中盈店）', district: '天河区', address: '天河区黄埔大道中保利中盈广场', latitude: 23.1282, longitude: 113.3421, type: 'book', businessHours: [10, 22], tags: ['书店', '阅读', '文艺'], description: '独立书店，含阅读区和咖啡区，常办读书分享会' },

  // ===== 越秀区（10 个）=====
  { id: 'gz_poi_yx_01', name: '广州美术馆', district: '越秀区', address: '越秀区麓湖路13号', latitude: 23.1497, longitude: 113.2644, type: 'art', businessHours: [9, 17], tags: ['看展', '免费', '室内', '文艺'], description: '广州市属公益性美术馆，常设岭南画派作品和当代艺术展' },
  { id: 'gz_poi_yx_02', name: '二沙岛艺术公园', district: '越秀区', address: '越秀区二沙岛', latitude: 23.1238, longitude: 113.3002, type: 'park', businessHours: [0, 24], tags: ['公园', '户外', '散步', '艺术'], description: '珠江中轴岛屿，含星海音乐厅、广东美术馆、户外雕塑群，city walk首选' },
  { id: 'gz_poi_yx_03', name: '星海音乐厅', district: '越秀区', address: '越秀区二沙岛晴波路33号', latitude: 23.1235, longitude: 113.3015, type: 'art', businessHours: [9, 22], tags: ['看展', '音乐', '文艺'], description: '珠江畔音乐地标，建筑如钢琴，可参观可听音乐会' },
  { id: 'gz_poi_yx_04', name: '东山口洋楼群', district: '越秀区', address: '越秀区东山口恤孤院路一带', latitude: 23.1288, longitude: 113.2925, type: 'salon', businessHours: [0, 24], tags: ['沙龙', '文化', '建筑', '拍照'], description: '民国时期西洋别墅群，现多改造为独立书店/咖啡馆/艺术空间，适合文化漫游' },
  { id: 'gz_poi_yx_05', name: '逵园艺术馆', district: '越秀区', address: '越秀区恤孤院路9号', latitude: 23.1291, longitude: 113.2928, type: 'art', businessHours: [11, 18], tags: ['看展', '免费', '文艺', '建筑'], description: '1922年洋楼改造的独立艺术馆，常设当代艺术展，东山口文化地标' },
  { id: 'gz_poi_yx_06', name: '北京路步行街', district: '越秀区', address: '越秀区北京路', latitude: 23.1287, longitude: 113.2631, type: 'market', businessHours: [10, 22], tags: ['市集', '逛街', '美食'], description: '千年古道商业步行街，地下有历代路面遗址展示' },
  { id: 'gz_poi_yx_07', name: '联合书店（北京路店）', district: '越秀区', address: '越秀区北京路314号', latitude: 23.1292, longitude: 113.2638, type: 'book', businessHours: [10, 22], tags: ['书店', '阅读', '文艺'], description: '五层独立书店，含港台书/文创/展览空间，北京路文化据点' },
  { id: 'gz_poi_yx_08', name: '越秀公园', district: '越秀区', address: '越秀区解放北路988号', latitude: 23.1408, longitude: 113.2572, type: 'park', businessHours: [6, 22], tags: ['公园', '户外', '历史', '散步'], description: '广州最大综合性公园，五羊雕塑所在地，含镇海楼/明代城墙遗址' },
  { id: 'gz_poi_yx_09', name: 'ART23当代艺术馆', district: '越秀区', address: '越秀区东山口启明横路11号', latitude: 23.1285, longitude: 113.2918, type: 'art', businessHours: [11, 19], tags: ['看展', '当代艺术', '文艺'], description: '独立当代艺术空间，聚焦青年艺术家，东山口艺术据点之一' },
  { id: 'gz_poi_yx_10', name: '印象咖啡（东山口店）', district: '越秀区', address: '越秀区恤孤院路12号', latitude: 23.1290, longitude: 113.2930, type: 'cafe', businessHours: [9, 21], tags: ['咖啡', '探店', '文艺', '老广'], description: '洋楼里的独立咖啡馆，复古装潢，适合慢聊和阅读' },

  // ===== 海珠区（10 个）=====
  { id: 'gz_poi_hz_01', name: 'TIT创意园', district: '海珠区', address: '海珠区新港中路397号', latitude: 23.0938, longitude: 113.3235, type: 'market', businessHours: [0, 24], tags: ['市集', '创意', '文艺', '拍照'], description: '广州纺织机械厂改造，含咖啡馆/设计工作室/艺术空间，文艺青年聚集地' },
  { id: 'gz_poi_hz_02', name: '十香园纪念馆', district: '海珠区', address: '海珠区江南大道中怀德大街3号', latitude: 23.0828, longitude: 113.2698, type: 'art', businessHours: [9, 17], tags: ['看展', '免费', '历史', '岭南'], description: '岭南画派发源地之一，居巢居廉故居，庭院式纪念馆' },
  { id: 'gz_poi_hz_03', name: '琶洲塔公园', district: '海珠区', address: '海珠区新港东路琶洲塔公园', latitude: 23.0945, longitude: 113.3582, type: 'park', businessHours: [6, 22], tags: ['公园', '户外', '历史'], description: '明代琶洲塔所在，珠江畔绿地，可登塔远眺珠江' },
  { id: 'gz_poi_hz_04', name: '太古仓码头', district: '海珠区', address: '海珠区革新路124号', latitude: 23.0952, longitude: 113.2438, type: 'market', businessHours: [10, 24], tags: ['市集', '江景', '夜生活'], description: '百年码头改造，含影院/餐厅/酒吧/市集，黄昏江景绝美' },
  { id: 'gz_poi_hz_05', name: '学而优书店（新港店）', district: '海珠区', address: '海珠区新港西路93号', latitude: 23.0958, longitude: 113.2985, type: 'book', businessHours: [9, 22], tags: ['书店', '阅读', '大学城'], description: '中山大学旁学术书店，选书偏人文社科，常办学者讲座' },
  { id: 'gz_poi_hz_06', name: '江南西文创街区', district: '海珠区', address: '海珠区江南西路一带', latitude: 23.0845, longitude: 113.2708, type: 'salon', businessHours: [10, 22], tags: ['沙龙', '创意', '美食', '年轻'], description: '老社区里的文创聚集地，含独立咖啡馆/手作店/小型画廊' },
  { id: 'gz_poi_hz_07', name: '海珠湿地公园', district: '海珠区', address: '海珠区新滘中路168号', latitude: 23.0658, longitude: 113.3245, type: 'park', businessHours: [7, 18], tags: ['公园', '自然', '户外', '观鸟'], description: '广州最大城央湿地，含花海/果园/观鸟屋，城市生态绿洲' },
  { id: 'gz_poi_hz_08', name: 'B.I.G海珠湾艺术区', district: '海珠区', address: '海珠区沥滘路12号', latitude: 23.0582, longitude: 113.3085, type: 'art', businessHours: [10, 22], tags: ['看展', '创意', '拍照'], description: '旧厂房改造艺术园区，含当代艺术展/设计店/咖啡' },
  { id: 'gz_poi_hz_09', name: '玫瑰园咖啡', district: '海珠区', address: '海珠区工业大道南428号', latitude: 23.0782, longitude: 113.2658, type: 'cafe', businessHours: [9, 21], tags: ['咖啡', '探店', '花园'], description: '花园里的独立咖啡馆，露台位可看花，适合周末慢聊' },
  { id: 'gz_poi_hz_10', name: '琶醍露天市集', district: '海珠区', address: '海珠区阅江西路磨碟沙隧道入口', latitude: 23.1075, longitude: 113.3268, type: 'market', businessHours: [16, 24], tags: ['市集', '夜生活', '江景', '美食'], description: '珠江畔露天市集，含手作摊位/精酿啤酒/街头美食，周末夜场最热闹' },

  // ===== 荔湾区（10 个）=====
  { id: 'gz_poi_lw_01', name: '永庆坊', district: '荔湾区', address: '荔湾区恩宁路99号', latitude: 23.1198, longitude: 113.2385, type: 'salon', businessHours: [0, 24], tags: ['沙龙', '文化', '老广', '拍照'], description: '西关历史街区活化标杆，含李小龙故居/粤剧博物馆/文创小店/咖啡馆' },
  { id: 'gz_poi_lw_02', name: '粤剧艺术博物馆', district: '荔湾区', address: '荔湾区恩宁路127号', latitude: 23.1202, longitude: 113.2378, type: 'art', businessHours: [9, 17], tags: ['看展', '免费', '文化', '岭南'], description: '岭南园林式博物馆，含粤剧历史展/戏台/实景演出' },
  { id: 'gz_poi_lw_03', name: '沙面岛', district: '荔湾区', address: '荔湾区沙面', latitude: 23.1078, longitude: 113.2382, type: 'park', businessHours: [0, 24], tags: ['公园', '建筑', '拍照', '历史'], description: '珠江沙洲岛，百年欧式建筑群，含领事馆旧址/教堂/咖啡馆' },
  { id: 'gz_poi_lw_04', name: '上下九步行街', district: '荔湾区', address: '荔湾区下九路', latitude: 23.1185, longitude: 113.2428, type: 'market', businessHours: [10, 22], tags: ['市集', '美食', '老广', '逛街'], description: '西关传统商业步行街，老字号美食和骑楼建筑聚集地' },
  { id: 'gz_poi_lw_05', name: '陈家祠', district: '荔湾区', address: '荔湾区中山七路恩龙里34号', latitude: 23.1262, longitude: 113.2468, type: 'art', businessHours: [8, 18], tags: ['看展', '历史', '建筑', '岭南'], description: '清代宗祠建筑，岭南建筑装饰艺术集大成者，木雕/砖雕/陶塑绝美' },
  { id: 'gz_poi_lw_06', name: '荔湾湖公园', district: '荔湾区', address: '荔湾区龙津西路155号', latitude: 23.1158, longitude: 113.2342, type: 'park', businessHours: [6, 22], tags: ['公园', '户外', '老广', '散步'], description: '岭南园林式公园，泮塘水乡风情，含茶楼和湖心亭' },
  { id: 'gz_poi_lw_07', name: '1200书店（荔湾湖店）', district: '荔湾区', address: '荔湾区龙津西路122号', latitude: 23.1162, longitude: 113.2348, type: 'book', businessHours: [10, 22], tags: ['书店', '阅读', '文艺'], description: '24小时书店品牌荔湾分店，临湖阅读区，常办文化沙龙' },
  { id: 'gz_poi_lw_08', name: '泮塘路美食街', district: '荔湾区', address: '荔湾区泮塘路', latitude: 23.1152, longitude: 113.2358, type: 'market', businessHours: [7, 22], tags: ['美食', '市集', '老广'], description: '老西关美食聚集地，马蹄糕/艇仔粥/肠粉老字号云集' },
  { id: 'gz_poi_lw_09', name: '钟书阁（永庆坊店）', district: '荔湾区', address: '荔湾区恩宁路永庆坊17号', latitude: 23.1198, longitude: 113.2388, type: 'book', businessHours: [10, 22], tags: ['书店', '阅读', '文艺', '网红'], description: '镜面穹顶网红书店，西关洋楼里，含咖啡区和阅读区' },
  { id: 'gz_poi_lw_10', name: '泮溪酒家', district: '荔湾区', address: '荔湾区龙津西路151号', latitude: 23.1155, longitude: 113.2345, type: 'salon', businessHours: [7, 21], tags: ['沙龙', '美食', '老广', '园林'], description: '园林式老字号茶楼，湖畔饮茶，适合广式早茶沙龙聚会' },

  // ===== 白云区（8 个）=====
  { id: 'gz_poi_by_01', name: '白云山南门', district: '白云区', address: '白云区广园中路801号', latitude: 23.1688, longitude: 113.2985, type: 'park', businessHours: [6, 22], tags: ['公园', '户外', '爬山', '自然'], description: '广州城市绿肺南入口，可徒步至摩星岭观广州全景' },
  { id: 'gz_poi_by_02', name: '云台花园', district: '白云区', address: '白云区广园中路801号白云山南门旁', latitude: 23.1668, longitude: 113.2972, type: 'park', businessHours: [8, 18], tags: ['公园', '花园', '拍照'], description: '白云山脚欧式花园，四季花展，含玻璃温室和罗马柱廊' },
  { id: 'gz_poi_by_03', name: '广州市儿童公园', district: '白云区', address: '白云区机场路561号', latitude: 23.1582, longitude: 113.2658, type: 'park', businessHours: [8, 18], tags: ['公园', '户外', '亲子'], description: '大型儿童主题公园，含沙池/攀爬/戏水区，亲子出逃首选' },
  { id: 'gz_poi_by_04', name: '白云湖公园', district: '白云区', address: '白云区石井街石沙路', latitude: 23.1825, longitude: 113.2258, type: 'park', businessHours: [6, 22], tags: ['公园', '湖景', '户外', '骑行'], description: '广州最大人工湖，环湖绿道10公里，适合骑行野餐' },
  { id: 'gz_poi_by_05', name: '时光公园', district: '白云区', address: '白云区黄边北路146号', latitude: 23.1882, longitude: 113.2745, type: 'salon', businessHours: [10, 22], tags: ['沙龙', '创意', '文艺'], description: '黄边设计产业园内创意空间，含艺术展/手作坊/咖啡馆' },
  { id: 'gz_poi_by_06', name: '飞翔公园咖啡', district: '白云区', address: '白云区机场路飞翔公园内', latitude: 23.1625, longitude: 113.2682, type: 'cafe', businessHours: [8, 20], tags: ['咖啡', '探店', '户外'], description: '公园里的集装箱咖啡馆，露台位可看绿植，适合周末慢聊' },
  { id: 'gz_poi_by_07', name: '黄边菜市场', district: '白云区', address: '白云区黄边北路', latitude: 23.1875, longitude: 113.2752, type: 'market', businessHours: [6, 20], tags: ['市集', '美食', '市井', '老广'], description: '老广州菜市场，可逛可买可吃，体验最地道的市井烟火气' },
  { id: 'gz_poi_by_08', name: '白云山摩星岭', district: '白云区', address: '白云区白云山摩星岭', latitude: 23.1758, longitude: 113.2952, type: 'park', businessHours: [6, 22], tags: ['公园', '户外', '爬山', '日出'], description: '白云山最高点382米，可俯瞰广州全景，看日出日落绝佳' },

  // ===== 番禺区（8 个）=====
  { id: 'gz_poi_py_01', name: '沙湾古镇', district: '番禺区', address: '番禺区沙湾大街道古街', latitude: 22.9782, longitude: 113.3358, type: 'salon', businessHours: [9, 18], tags: ['沙龙', '文化', '历史', '老广'], description: '800年岭南古镇，含祠堂/蚝壳墙/飘色馆，岭南文化活化石' },
  { id: 'gz_poi_py_02', name: '余荫山房', district: '番禺区', address: '番禺区南村镇北大街', latitude: 23.0085, longitude: 113.3428, type: 'park', businessHours: [8, 18], tags: ['公园', '园林', '历史', '岭南'], description: '清代岭南四大名园之一，玲珑精巧的私家园林' },
  { id: 'gz_poi_py_03', name: '大夫山森林公园', district: '番禺区', address: '番禺区禺山西路688号', latitude: 22.9882, longitude: 113.3085, type: 'park', businessHours: [6, 22], tags: ['公园', '户外', '骑行', '自然'], description: '广州最大郊野公园，环湖绿道+骑行道，适合周末户外骑行野餐' },
  { id: 'gz_poi_py_04', name: '番禺万达广场', district: '番禺区', address: '番禺区汉溪大道东688号', latitude: 23.0128, longitude: 113.3285, type: 'market', businessHours: [10, 22], tags: ['市集', '逛街', '美食'], description: '番禺商业综合体，含购物/餐饮/影院，周末家庭出逃常去' },
  { id: 'gz_poi_py_05', name: '紫泥堂文化创意园', district: '番禺区', address: '番禺区沙湾紫泥村', latitude: 22.9758, longitude: 113.3258, type: 'art', businessHours: [10, 22], tags: ['看展', '创意', '文艺'], description: '旧糖厂改造艺术园区，含画廊/设计店/咖啡馆，文艺拍照圣地' },
  { id: 'gz_poi_py_06', name: '宝墨园', district: '番禺区', address: '番禺区沙湾镇紫坭村', latitude: 22.9765, longitude: 113.3262, type: 'park', businessHours: [8, 18], tags: ['公园', '园林', '历史', '岭南'], description: '清代包公庙扩建的岭南园林，含锦鲤池/古建筑/雕塑' },
  { id: 'gz_poi_py_07', name: '西坊大院文化创意园', district: '番禺区', address: '番禺区市桥街环城西路222号', latitude: 22.9425, longitude: 113.3642, type: 'salon', businessHours: [10, 22], tags: ['沙龙', '创意', '文艺'], description: '旧厂房改造文创园，含独立书店/咖啡馆/手作工作室' },
  { id: 'gz_poi_py_08', name: '市桥老街', district: '番禺区', address: '番禺区市桥街', latitude: 22.9388, longitude: 113.3628, type: 'market', businessHours: [6, 22], tags: ['市集', '美食', '老广', '市井'], description: '老番禺市桥老街，含老字号美食/传统市集，体验老番禺生活气息' },

  // ===== 黄埔区（7 个）=====
  { id: 'gz_poi_hp_01', name: '长洲岛', district: '黄埔区', address: '黄埔区长洲岛', latitude: 23.0856, longitude: 113.4280, type: 'park', businessHours: [0, 24], tags: ['公园', '历史', '户外', '江景'], description: '珠江江心岛，黄埔军校所在地，辛亥革命策源地之一，适合历史漫游与江边骑行' },
  { id: 'gz_poi_hp_02', name: '黄埔军校旧址纪念馆', district: '黄埔区', address: '黄埔区长洲军校路170号', latitude: 23.0872, longitude: 113.4315, type: 'salon', businessHours: [9, 17], tags: ['沙龙', '历史', '文化', '免费'], description: '1924年孙中山创办的军官学校旧址，含校本部、孙总理纪念碑，爱国主义教育示范基地' },
  { id: 'gz_poi_hp_03', name: '南海神庙', district: '黄埔区', address: '黄埔区庙头旭日街22号', latitude: 23.0838, longitude: 113.4395, type: 'art', businessHours: [9, 17], tags: ['看展', '历史', '海丝', '文化'], description: '中国古代四大海神庙之一，海上丝绸之路发源地，含历代碑刻，国家级文保单位' },
  { id: 'gz_poi_hp_04', name: '科学城绿轴公园', district: '黄埔区', address: '黄埔区科学城开泰大道', latitude: 23.1185, longitude: 113.4762, type: 'park', businessHours: [0, 24], tags: ['公园', '户外', '现代', '散步'], description: '科学城核心绿地，现代城市景观与生态结合，含步道/广场/艺术装置，适合慢跑散步' },
  { id: 'gz_poi_hp_05', name: '萝岗香雪公园', district: '黄埔区', address: '黄埔区萝岗街萝峰路', latitude: 23.1288, longitude: 113.5085, type: 'park', businessHours: [6, 22], tags: ['公园', '自然', '梅花', '拍照'], description: '羊城八景之一「萝岗香雪」，冬至前后梅花盛开如雪，广州赏梅首选地' },
  { id: 'gz_poi_hp_06', name: '黄埔古港', district: '黄埔区', address: '黄埔区长洲岛金洲北路', latitude: 23.0830, longitude: 113.4250, type: 'market', businessHours: [8, 20], tags: ['市集', '历史', '美食', '老广'], description: '清代广州外贸大港，含哥德堡号沉船纪念，周边老字号小吃云集，体验海丝文化' },
  { id: 'gz_poi_hp_07', name: '广东游戏游艺产业城', district: '黄埔区', address: '黄埔区科学城科丰路', latitude: 23.1200, longitude: 113.4700, type: 'music', businessHours: [10, 22], tags: ['音乐', '创意', '科技', '年轻'], description: '游戏游艺产业聚集地，含电竞赛事/音乐演出/创意市集，年轻文化体验地' },

  // ===== 花都区（7 个）=====
  { id: 'gz_poi_hd_01', name: '花都湖公园', district: '花都区', address: '花都区新华街花都湖', latitude: 23.3985, longitude: 113.2208, type: 'park', businessHours: [0, 24], tags: ['公园', '湖景', '户外', '散步'], description: '由青石海水库改造的城市滨水公园，环湖绿道6公里，含湿地/花海/夜景观赏' },
  { id: 'gz_poi_hd_02', name: '芙蓉嶂风景区', district: '花都区', address: '花都区芙蓉镇芙蓉嶂', latitude: 23.4500, longitude: 113.1800, type: 'sport', businessHours: [7, 18], tags: ['运动', '爬山', '山水', '户外'], description: '花都最高峰芙蓉峰360米，含瀑布/水库/徒步道，登山徒步和自然探索首选' },
  { id: 'gz_poi_hd_03', name: '九龙湖度假区', district: '花都区', address: '花都区花东镇九龙湖', latitude: 23.4250, longitude: 113.1550, type: 'park', businessHours: [8, 19], tags: ['公园', '度假', '湖景', '亲子'], description: '欧洲小镇风情度假区，含人工湖/高尔夫/徒步道，适合周末度假和家庭出逃' },
  { id: 'gz_poi_hd_04', name: '石头记矿物园', district: '花都区', address: '花都区珠宝城大观路1号', latitude: 23.3850, longitude: 113.2300, type: 'art', businessHours: [9, 17], tags: ['看展', '矿物', '文化', '亲子'], description: '全球首座矿物主题公园，含珍稀矿物/宝石/化石展览，国家4A级景区' },
  { id: 'gz_poi_hd_05', name: '圆玄道观', district: '花都区', address: '花都区新华街迎宾大道西38号', latitude: 23.3900, longitude: 113.2150, type: 'salon', businessHours: [8, 17], tags: ['沙龙', '文化', '道教', '建筑'], description: '广东最大道教建筑群，含三清殿/元辰殿，岭南道教文化中心，适合文化沙龙' },
  { id: 'gz_poi_hd_06', name: '洪秀全故居纪念馆', district: '花都区', address: '花都区官禄布村', latitude: 23.4100, longitude: 113.1950, type: 'salon', businessHours: [9, 17], tags: ['沙龙', '历史', '文化', '免费'], description: '太平天国领袖洪秀全诞生地，含故居复原/生平陈列，近代史研学基地' },
  { id: 'gz_poi_hd_07', name: '花都人民公园', district: '花都区', address: '花都区公益路2号', latitude: 23.3950, longitude: 113.2250, type: 'park', businessHours: [6, 22], tags: ['公园', '户外', '散步', '市井'], description: '花都中心城区综合公园，含湖泊/树林/广场，周边居民晨练散步聚集地' },

  // ===== 从化区（7 个）=====
  { id: 'gz_poi_ch_01', name: '流溪河国家森林公园', district: '从化区', address: '从化区良口镇流溪河林场', latitude: 23.7150, longitude: 113.6450, type: 'park', businessHours: [7, 18], tags: ['公园', '森林', '自然', '户外'], description: '广州首个国家森林公园，含流溪河水库/岛屿/森林步道，观鹿赏梅徒步胜地' },
  { id: 'gz_poi_ch_02', name: '石门国家森林公园', district: '从化区', address: '从化区大岭山林场', latitude: 23.6800, longitude: 113.6200, type: 'photo', businessHours: [8, 17], tags: ['摄影', '红叶', '自然', '秋景'], description: '广州最美秋色观赏地，石门红叶/天池花海/竹林溪流，摄影爱好者必到' },
  { id: 'gz_poi_ch_03', name: '从化温泉镇', district: '从化区', address: '从化区温泉镇温泉东路', latitude: 23.5650, longitude: 113.5850, type: 'salon', businessHours: [0, 24], tags: ['沙龙', '温泉', '度假', '康养'], description: '世界珍稀温泉低氡小苏打泉，含多个温泉度假村，岭南温泉文化代表，适合康养慢聊' },
  { id: 'gz_poi_ch_04', name: '溪头村', district: '从化区', address: '从化区良口镇溪头村', latitude: 23.6200, longitude: 113.6000, type: 'market', businessHours: [8, 19], tags: ['市集', '古村', '美食', '徒步'], description: '「广州最美乡村」，溪水环绕的古村落，含农家美食/山货市集/徒步起点' },
  { id: 'gz_poi_ch_05', name: '阿婆六村', district: '从化区', address: '从化区良口镇阿婆六村', latitude: 23.6500, longitude: 113.6300, type: 'photo', businessHours: [0, 24], tags: ['摄影', '星空', '观星', '自然'], description: '广州海拔最高的村庄之一700米，光污染极低，广州观星/星空摄影圣地' },
  { id: 'gz_poi_ch_06', name: '流溪河水库', district: '从化区', address: '从化区良口镇流溪河水库', latitude: 23.7000, longitude: 113.6400, type: 'sport', businessHours: [8, 17], tags: ['运动', '水上', '骑行', '户外'], description: '广州最大人工湖，含环湖骑行道/皮划艇/垂钓，水上运动和环湖骑行首选' },
  { id: 'gz_poi_ch_07', name: '千泷沟大瀑布', district: '从化区', address: '从化区良口镇千泷沟', latitude: 23.6300, longitude: 113.5800, type: 'sport', businessHours: [8, 17], tags: ['运动', '瀑布', '徒步', '自然'], description: '广州最大瀑布群，含竹海/溪流/瀑布徒步道，落差80米，徒步探险胜地' },

  // ===== 增城区（7 个）=====
  { id: 'gz_poi_zc_01', name: '白水寨', district: '增城区', address: '增城区派潭镇白水寨', latitude: 23.3900, longitude: 113.8150, type: 'sport', businessHours: [8, 17], tags: ['运动', '瀑布', '爬山', '户外'], description: '中国大陆落差最大瀑布428.5米，含9999级登山步道「天南第一梯」，徒步登山首选' },
  { id: 'gz_poi_zc_02', name: '增江画廊', district: '增城区', address: '增城区增江两岸', latitude: 23.3100, longitude: 113.8200, type: 'park', businessHours: [0, 24], tags: ['公园', '绿道', '骑行', '江景'], description: '增江两岸滨水绿道，含湿地/花海/艺术装置，骑行慢跑和江景散步胜地' },
  { id: 'gz_poi_zc_03', name: '1978文化创意园', district: '增城区', address: '增城区增江街1978文创园', latitude: 23.2950, longitude: 113.8150, type: 'art', businessHours: [10, 22], tags: ['看展', '创意', '文艺', '拍照'], description: '旧糖纸厂改造文创园，含电影院/咖啡馆/艺术展/婚礼小镇，文艺青年聚集地' },
  { id: 'gz_poi_zc_04', name: '正果老街', district: '增城区', address: '增城区正果镇正果老街', latitude: 23.3500, longitude: 113.8600, type: 'food', businessHours: [7, 21], tags: ['美食', '老街', '老广', '市井'], description: '增江畔千年古镇老街，正果云吞/迟菜心/腊味等增城美食聚集地，吃货必到' },
  { id: 'gz_poi_zc_05', name: '湖心岛', district: '增城区', address: '增城区正果镇湖心岛', latitude: 23.3300, longitude: 113.8400, type: 'park', businessHours: [8, 18], tags: ['公园', '竹海', '江景', '自然'], description: '增江中游江心岛，含乌榄园/竹海/沙滩，竹海漫步和江景野餐胜地' },
  { id: 'gz_poi_zc_06', name: '增城广场', district: '增城区', address: '增城区荔城街增城广场', latitude: 23.2900, longitude: 113.8100, type: 'market', businessHours: [0, 24], tags: ['市集', '夜景', '市井', '年轻'], description: '增城中心城区广场，含音乐喷泉/夜市/街头表演，夜间散步和市井体验地' },
  { id: 'gz_poi_zc_07', name: '何仙姑家庙', district: '增城区', address: '增城区小楼镇小楼墟', latitude: 23.3200, longitude: 113.7800, type: 'salon', businessHours: [8, 17], tags: ['沙龙', '文化', '历史', '道教'], description: '八仙之一何仙姑故乡，含家庙/仙桃树，岭南道教文化传说地，适合文化寻访' },

  // ===== 南沙区（7 个）=====
  { id: 'gz_poi_ns_01', name: '南沙天后宫', district: '南沙区', address: '南沙区天后路88号', latitude: 22.7700, longitude: 113.5900, type: 'salon', businessHours: [8, 17], tags: ['沙龙', '文化', '妈祖', '滨海'], description: '东南亚最大妈祖庙，滨海而建含天后圣像/钟楼鼓楼，岭南妈祖文化中心' },
  { id: 'gz_poi_ns_02', name: '南沙湿地公园', district: '南沙区', address: '南沙区万顷沙镇新港桥', latitude: 22.6500, longitude: 113.5800, type: 'park', businessHours: [9, 17], tags: ['公园', '湿地', '观鸟', '自然'], description: '广州最大滨海湿地，候鸟迁徙停歇地，含观鸟屋/红树林/芦苇荡，生态观鸟胜地' },
  { id: 'gz_poi_ns_03', name: '百万葵园', district: '南沙区', address: '南沙区万顷沙镇新垦15涌', latitude: 22.7300, longitude: 113.5600, type: 'photo', businessHours: [9, 17], tags: ['摄影', '花海', '拍照', '亲子'], description: '中国首个大型葵花主题公园，四季花海+薰衣草+玫瑰园，摄影和亲子出逃首选' },
  { id: 'gz_poi_ns_04', name: '蕉门河绿道', district: '南沙区', address: '南沙区蕉门河两岸', latitude: 22.7700, longitude: 113.5300, type: 'sport', businessHours: [0, 24], tags: ['运动', '骑行', '绿道', '江景'], description: '南沙城市绿轴，沿蕉门河两岸绿道8公里，含花海/廊桥，骑行慢跑胜地' },
  { id: 'gz_poi_ns_05', name: '南沙游艇会', district: '南沙区', address: '南沙区虎门大桥南侧游艇会', latitude: 22.7500, longitude: 113.6000, type: 'sport', businessHours: [9, 21], tags: ['运动', '游艇', '滨海', '高端'], description: '广州唯一游艇会，含游艇租赁/帆船体验/滨海餐厅，高端水上运动体验地' },
  { id: 'gz_poi_ns_06', name: '南沙天后宫沙滩', district: '南沙区', address: '南沙区天后宫滨海沙滩', latitude: 22.7650, longitude: 113.5950, type: 'park', businessHours: [0, 24], tags: ['公园', '沙滩', '滨海', '拍照'], description: '天后宫旁滨海沙滩，可赶海/看日落/散步，广州最近的天然沙滩，黄昏摄影佳地' },
  { id: 'gz_poi_ns_07', name: '南沙十九涌渔人码头', district: '南沙区', address: '南沙区万顷沙镇十九涌', latitude: 22.6700, longitude: 113.5700, type: 'food', businessHours: [9, 21], tags: ['美食', '海鲜', '市集', '滨海'], description: '广州最南端渔港，海鲜市集/渔船码头/特产街，吃海鲜观渔港的滨海美食地' }
]

function getPOIsByDistrict(district) {
  if (typeof district !== 'string') return []
  return GUANGZHOU_POIS.filter(function (p) { return p.district === district })
}

function getPOIsByType(type) {
  if (typeof type !== 'string') return []
  return GUANGZHOU_POIS.filter(function (p) { return p.type === type })
}

function getPOIById(id) {
  if (typeof id !== 'string') return null
  for (var i = 0; i < GUANGZHOU_POIS.length; i++) {
    if (GUANGZHOU_POIS[i].id === id) return GUANGZHOU_POIS[i]
  }
  return null
}

module.exports = {
  POI_TYPES: POI_TYPES,
  GUANGZHOU_POIS: GUANGZHOU_POIS,
  getPOIsByDistrict: getPOIsByDistrict,
  getPOIsByType: getPOIsByType,
  getPOIById: getPOIById
}
