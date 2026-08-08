/**
 * 破圈骰子指令库（100条广州专属）
 * 每条指令包含 content（主指令）+ steps（4步出逃剧本）
 * 剧本 = 执行步骤，具体到交通、定位、动作、产出
 * 
 * 设计理念：破圈骰子不是"去一个新地方"（那是微出逃），
 * 而是"做一件平时不敢做的事"——核心是心理屏障。
 */

const BREAKTHROUGH_COMMANDS = [
  // ============================================================
  // 类别 1：街头社死（bt001-bt020）
  // 在公共场合做正常人不会做的事
  // ============================================================
  {
    id: 'bt001',
    content: '对世界大喊"我自由了"',
    type: 'breakthrough', typeColor: '#A55FA5', duration: 5,
    outdoor: true, nightSafe: false, rainy: true,
    requirePOI: null, cost: 0, double: false, mode: 'breakthrough',
    avoidTypes: ['social:extrovert'],
    recommendTypes: ['social:introvert', 'social:moderate'],
    tip: '为什么做：你有多久没有肆无忌惮地表达快乐了？在陌生人面前喊出这句话，是向"在意别人眼光"这个习惯宣战。完成后你会发现——其实没人会记住你，但你记住了那一刻的爽。选石牌桥站B口或区庄站C口，刷卡通过瞬间直接喊，不要停顿，喊完继续走。',
    steps: [
      '坐地铁到石牌桥站或区庄站，在出站闸机排队',
      '把羊城通或手机准备好，卡在闸机上的瞬间——深吸一口气',
      '刷卡通过闸机，在通过的那一刻大声喊出"我自由了！"——不要回头看',
      '保持正常步速走出地铁站，走出20米后停下来笑出声。你刚刚解锁了"地铁社死成就"'
    ]
  },
  {
    id: 'bt002',
    content: '在电梯里对自己说辛苦了',
    type: 'breakthrough', typeColor: '#A55FA5', duration: 5,
    outdoor: false, nightSafe: true, rainy: true,
    requirePOI: null, cost: 0, double: false, mode: 'breakthrough',
    avoidTypes: ['social:extrovert'],
    recommendTypes: ['social:introvert', 'range:fixed'],
    tip: '为什么做：我们每天都在对别人说辛苦了，却很少对自己说。在陌生人在场的电梯里做这件事，是"自我关怀"的一次公开练习——你值得被自己温柔对待。选天河城或正佳广场的观光电梯，等里面有1-2个陌生人时，对着镜子用日常语气说"嗯，今天辛苦了"。',
    steps: [
      '走进天河城或正佳广场的观光电梯，按你要去的楼层（随便选一个）',
      '等电梯门关上后，面朝电梯镜面，假装在调整衣领',
      '对着镜子里的自己，用一种"日常但不刻意"的语气说："嗯，今天辛苦了。"——音量要让旁边的人刚好能听到',
      '电梯到了，走出去。不管旁边的人什么表情，你刚刚对自己说了今天最温柔的一句话'
    ]
  },
  {
    id: 'bt003',
    content: '对橱窗模特说"这件很衬你"',
    type: 'breakthrough', typeColor: '#A55FA5', duration: 5,
    outdoor: true, nightSafe: false, rainy: false,
    requirePOI: null, cost: 0, double: false, mode: 'breakthrough',
    avoidTypes: ['social:extrovert', 'hobby:social'],
    recommendTypes: ['social:introvert', 'range:fixed'],
    tip: '为什么做：和不会回应的对象说话，是最高级的自我释放——你不需要任何人的反馈也能勇敢表达善意。选晚上8点后的上下九，找一家挂着模特假人的服装店橱窗，画完笑脸说"这件很衬你"，说完直接走，不要等反应。',
    steps: [
      '坐地铁6号线到文化公园站E口，走到上下九步行街的服装区',
      '找一家店门口有人体模特展示当季衣服的橱窗',
      '对着橱窗玻璃哈一口气，用手指在雾气上画一个笑脸，然后对模特说："你穿这件很衬你哦。"——语气像在夸一个朋友',
      '画完拍一张照片，不要回头，继续往前走。你刚刚对一个假人展现了善意'
    ]
  },
  {
    id: 'bt004',
    content: '在广州塔下竖大拇指等陌生人跟做',
    type: 'breakthrough', typeColor: '#A55FA5', duration: 5,
    outdoor: true, nightSafe: false, rainy: false,
    requirePOI: '广州塔', cost: 0, double: false, mode: 'breakthrough',
    avoidTypes: ['social:extrovert'],
    recommendTypes: ['social:introvert', 'range:fixed'],
    tip: '为什么做：莫名其妙的事会传染——你竖起大拇指的那一刻，周围人的快乐阈值被你拉低了。周末下午去广州塔下观景广场，站定、微笑、竖两个大拇指对天空，坚持30秒，大概率有人跟着做或拍照。',
    steps: [
      '坐APM线到广州塔站B口出，走到广州塔正下方的观景广场',
      '找一块空旷的位置，面朝广州塔站定，双脚与肩同宽',
      '双手同时竖起大拇指，指向天空，保持这个姿势——脸上带着真诚的微笑。不管身边经过的人怎么看你，坚持30秒',
      '30秒后放下手，观察有没有人因为看到你而微笑——如果有，冲TA比个心。你今天做的事叫"无理由快乐传播"'
    ]
  },
  {
    id: 'bt005',
    content: '对着喷泉大声说出你的愿望',
    type: 'breakthrough', typeColor: '#A55FA5', duration: 10,
    outdoor: true, nightSafe: true, rainy: false,
    requirePOI: null, cost: 0, double: false, mode: 'breakthrough',
    avoidTypes: ['social:extrovert'],
    recommendTypes: ['social:introvert', 'range:fixed'],
    tip: '为什么做：喷泉声是最好的掩护——你喊出来的愿望被水声带走，但那一刻的畅快属于你。选花城广场晚上音乐喷泉开始时，走到靠近喷泉的栏杆旁，趁着水声最大时喊出你今天最大的愿望。',
    steps: [
      '坐APM线到花城大道站B口出，走到花城广场的音乐喷泉区域',
      '等到傍晚喷泉开始喷水（通常19:00-21:00间），走到靠近喷泉的栏杆旁',
      '趁着水声最大的时候，对着喷泉的方向大声说出你今天最大的愿望——水声会帮你掩护，但你喊出口的那一刻仍然很爽',
      '喊完后深呼吸，在旁边的长椅上坐3分钟，看喷泉的水花——你的愿望被广州的夜空听到了'
    ]
  },
  {
    id: 'bt006',
    content: '让公交站牌决定你的下一站',
    type: 'breakthrough', typeColor: '#A55FA5', duration: 30,
    outdoor: true, nightSafe: false, rainy: false,
    requirePOI: null, cost: 2, double: false, mode: 'breakthrough',
    avoidTypes: ['range:fullcity'],
    recommendTypes: ['range:fixed', 'social:introvert', 'hobby:game'],
    tip: '为什么做：把选择交给命运，比自己做决定更轻松——你只是在执行，没有"选错"的压力。推荐体育中心或中山纪念堂公交站，对着站牌自言自语式地问"我该去哪里"，然后闭眼一指，指到哪条上哪条。',
    steps: [
      '到体育中心公交站或中山纪念堂公交站，站在线路牌前面',
      '用自言自语但不小的音量对着站牌说："这么多条路，你告诉我，我今天该去哪里？"',
      '闭眼，手指在线路牌上划一圈然后停下——睁眼，看你指到的是哪一路公交',
      '上那辆公交，坐3站下车，在那一站附近逛20分钟找一件有趣的东西拍照。这就是"命运公交"给你的答案'
    ]
  },
  {
    id: 'bt007',
    content: '用播音腔对收银员说谢谢',
    type: 'breakthrough', typeColor: '#A55FA5', duration: 5,
    outdoor: false, nightSafe: true, rainy: true,
    requirePOI: null, cost: 5, double: false, mode: 'breakthrough',
    avoidTypes: ['social:extrovert'],
    recommendTypes: ['social:introvert', 'range:fixed'],
    tip: '为什么做：一本正经地做奇怪的事，比搞笑更高级——你在用荒诞对抗平庸。选一家你不常去的7-11或全家便利店（推荐体育西路站内或广州东站内的），用播音腔对收银员说"您好，这个商品我拿走了，请您扫码"，全程端庄不笑场。',
    steps: [
      '走进一家你平时不会去的便利店（推荐：天河城附近的FamilyMart或珠江新城地铁站内的7-11）',
      '挑一件最普通的商品——一瓶水或一包薯片，拿着走到收银台',
      '把商品放在台上，用最字正腔圆的播音腔说："您好，这个商品，我拿走了。请您扫码，谢谢。"——全程保持端庄表情，不要笑场',
      '付完钱，走出便利店后——破功。你刚刚给便利店店员贡献了今天最难忘的一段回忆'
    ]
  },
  {
    id: 'bt008',
    content: '在天桥上对车流挥手致敬',
    type: 'breakthrough', typeColor: '#A55FA5', duration: 5,
    outdoor: true, nightSafe: false, rainy: false,
    requirePOI: null, cost: 0, double: false, mode: 'breakthrough',
    avoidTypes: ['social:extrovert'],
    recommendTypes: ['social:introvert', 'range:fixed'],
    tip: '为什么做：做一件"正常人不做的事"，会让你从路人变成主角——你不是在赶路的人，你是这条天桥上最自信的人。推荐下午4-5点去体育西路过街天桥，在天桥正中面朝车流，用标准且缓慢的方式挥手10下。',
    steps: [
      '坐地铁1号线或3号线到体育西路站，从C口出来走上体育西路过街天桥',
      '走到天桥正中间的位置停下，面朝下方川流不息的车流',
      '把手举到胸前高度，用一种"标准且缓慢"的方式对着下面的车流挥手——就像国家领导人在阅兵一样端庄',
      '挥10下后收手，继续走你的路。如果有路人看你，对他们微笑点头——你是这条天桥上最自信的人'
    ]
  },
  {
    id: 'bt009',
    content: '蹲下来对流浪猫做自我介绍',
    type: 'breakthrough', typeColor: '#A55FA5', duration: 10,
    outdoor: true, nightSafe: false, rainy: false,
    requirePOI: null, cost: 0, double: false, mode: 'breakthrough',
    avoidTypes: [],
    recommendTypes: ['social:introvert', 'hobby:outdoor'],
    tip: '为什么做：和动物说话比和人说话容易100倍——它们不会评判你，你也不用担心说错话。越秀公园南秀花苑附近猫最多，蹲下来保持平视，轻声对猫做自我介绍，说错了也没关系，猫不会纠正你。',
    steps: [
      '坐地铁2号线到越秀公园站B1口出，进越秀公园往韩国园方向走',
      '找到一只愿意停留在原地的流浪猫（通常在花坛边或长椅下）',
      '蹲下来，保持和猫平视的高度，认真地说："你好，我叫（你的名字），今天来这里想认识你。"然后用"喵"的变调和猫对话30秒',
      '站起来拍一张这只猫的照片，配文"今天认识了一个新朋友，它在越秀公园上班"'
    ]
  },
  {
    id: 'bt010',
    content: '对自助售票机说"今天辛苦了"',
    type: 'breakthrough', typeColor: '#A55FA5', duration: 5,
    outdoor: false, nightSafe: true, rainy: true,
    requirePOI: null, cost: 0, double: false, mode: 'breakthrough',
    avoidTypes: ['social:extrovert'],
    recommendTypes: ['social:introvert', 'range:fixed'],
    tip: '为什么做：对机器表达善意是为了提醒自己——善意不需要对象有"资格"才能给予。选客村站或公园前站的自动售票机，假装操作后拍拍机器顶部，用真诚的语气说"今天你也辛苦了"，有人看到就当没事发生。',
    steps: [
      '进地铁站后找一台自动售票机（推荐：公园前站的售票机区域）',
      '假装操作售票机——随便按几下屏幕，好像在买票',
      '操作完后，轻轻地拍拍售票机的顶部，用一种真诚的语气说："今天你也辛苦了，感谢你为大家服务。"',
      '然后若无其事地走开去坐地铁。你刚刚做了一件叫"对机器表达善意"的荒诞行为艺术'
    ]
  },
  {
    id: 'bt011',
    content: '趴看千年古道并吐槽古人加班',
    type: 'breakthrough', typeColor: '#A55FA5', duration: 10,
    outdoor: true, nightSafe: false, rainy: false,
    requirePOI: null, cost: 0, double: false, mode: 'breakthrough',
    avoidTypes: ['social:extrovert'],
    recommendTypes: ['social:introvert', 'range:fixed', 'hobby:art'],
    tip: '为什么做：在一座千年古城遗址上开玩笑，是把历史和当下连在一起的魔法——你会发现自己和宋朝人其实没什么不同。选北京路步行街中段的玻璃罩遗址，趴着看3分钟，然后对旁边的人说"宋朝人也在加班"，说完就走。',
    steps: [
      '坐地铁6号线到北京路站B口出，走到北京路步行街中段的千年古道遗址',
      '弯下腰或蹲下来，认真地透过玻璃罩看下面的宋代路面遗迹——看满3分钟',
      '站起来，转向你旁边最近的一个陌生人（游客或路人），用一种分享发现的语气说："你看，宋朝的人就在这条路上走来走去——我猜他们也在加班。"',
      '说完就转身走，不要等回应。你今天在步行街上演了一场"穿越时空的脱口秀"'
    ]
  },
  {
    id: 'bt012',
    content: '骑车对沙面的每只鸽子说你好',
    type: 'breakthrough', typeColor: '#A55FA5', duration: 20,
    outdoor: true, nightSafe: false, rainy: false,
    requirePOI: null, cost: 2, double: false, mode: 'breakthrough',
    avoidTypes: [],
    recommendTypes: ['hobby:outdoor', 'range:fixed'],
    tip: '为什么做：和动物说话比和人说话轻松多了——它们不会评判你，你也完全不用担心说错话。骑共享单车绕沙面岛一圈约2公里，在鸽子多的地方放慢车速，用温柔的语气对每只鸽子说"你好"，你会像童话里的人。',
    steps: [
      '坐地铁6号线或8号线到文化公园站E口出，走过人民桥到沙面岛',
      '扫一辆共享单车，从沙面东桥开始沿着沙面南街骑行',
      '骑到沙面公园附近的草坪区，放慢车速到几乎停止，对每只在你附近的鸽子说"你好"——用不同的语气和每一只说',
      '骑完一圈后在沙面教堂前自拍一张，配文："今天在沙面，我和所有鸽子都认识了。"'
    ]
  },
  {
    id: 'bt013',
    content: '翘小拇指像贵族一样喝美式',
    type: 'breakthrough', typeColor: '#A55FA5', duration: 30,
    outdoor: false, nightSafe: true, rainy: true,
    requirePOI: null, cost: 30, double: false, mode: 'breakthrough',
    avoidTypes: [],
    recommendTypes: ['social:introvert', 'range:fixed'],
    tip: '为什么做：越是荒诞的用法，越能把日常变有趣——你不是在喝咖啡，你是在演一场只有自己知道的喜剧。推荐沙面或中山三路的星巴克臻选店，环境更适合"装贵族"，全程不能笑场才有效果。',
    steps: [
      '去星巴克（推荐：沙面Starbacks或中山三路店）点一杯热美式',
      '拿到饮料后，不要用盖子直接喝——把盖子打开，双手捧起杯子，像端一个精致的英式茶杯',
      '翘起小拇指，小口啜饮，每喝一口发出"Ah——"的满足叹息。保持全套贵族姿态喝完半杯',
      '放下杯子，做一个满足的表情——然后拍一张你和"英式贵族下午茶"的合影，配文"今天的美式，我用茶杯喝的"'
    ]
  },
  {
    id: 'bt014',
    content: '用接头暗号在超市买薯片',
    type: 'breakthrough', typeColor: '#A55FA5', duration: 10,
    outdoor: false, nightSafe: true, rainy: true,
    requirePOI: null, cost: 10, double: false, mode: 'breakthrough',
    avoidTypes: ['social:extrovert'],
    recommendTypes: ['social:introvert', 'range:fixed', 'hobby:game'],
    tip: '为什么做：一本正经地"胡说八道"是最高级的幽默——你在给路人平淡的一天里埋一个"什么情况"的彩蛋。选天河城永旺或珠江新城blt超市的零食区，用低沉神秘的间谍语气对手机或朋友说话，说完拿包薯片淡定走开。',
    steps: [
      '去一家大超市的零食区（推荐：天河城永旺超市或珠江新城blt超市）',
      '如果和朋友一起，让TA在货架另一端等你；如果一个人，拿出手机假装在打电话',
      '对着手机（或对着朋友的方向）压低声音说："目标在货架第三排，品客酸奶油洋葱味。今晚20:00，我家客厅。行动代号——《薯片之夜》。完毕。"',
      '拿一包薯片放进购物车，若无其事地继续逛。旁边的路人可能会以为自己加入了什么秘密组织'
    ]
  },
  {
    id: 'bt015',
    content: '对玻璃倒影里的自己说真好看',
    type: 'breakthrough', typeColor: '#A55FA5', duration: 5,
    outdoor: true, nightSafe: true, rainy: false,
    requirePOI: null, cost: 0, double: false, mode: 'breakthrough',
    avoidTypes: ['social:extrovert'],
    recommendTypes: ['social:introvert', 'range:fixed'],
    tip: '为什么做：你每天都在给别人加油，却从没给自己说过一句肯定的话——今天做一次"自己的啦啦队长"。选珠江新城西塔或高德置地广场的玻璃幕墙外，傍晚倒影最清晰，对着倒影用诚恳的语气夸自己，说完微笑一下。',
    steps: [
      '坐地铁3号线或5号线到珠江新城站，走到高德置地春广场或西塔的玻璃幕墙外',
      '面朝玻璃幕墙，假装在整理衣服——拉拉衣领、捋捋头发、正正肩膀',
      '对着玻璃中自己的倒影，用诚恳的语气说："你今天看起来真不错。继续保持。"就好像在跟一个朋友说话',
      '说完微笑一下，然后转身走。你刚刚完成了"当自己的啦啦队长"这个成就'
    ]
  },
  {
    id: 'bt016',
    content: '在APM线不扶把手练平衡',
    type: 'breakthrough', typeColor: '#A55FA5', duration: 15,
    outdoor: false, nightSafe: true, rainy: true,
    requirePOI: null, cost: 2, double: false, mode: 'breakthrough',
    avoidTypes: ['sport:never'],
    recommendTypes: ['sport:occasional', 'range:fixed', 'hobby:game'],
    tip: '为什么做：把自己放在重心不稳的状态里，你才发现自己的身体比你以为的更有力量。APM线全程地下行驶比地面线路平稳，选非高峰时段（上午10点或下午2点），全程不扶把手站完，和人眼神对视时微笑就好。',
    steps: [
      '从APM线任意一站上车（推荐从广州塔站起到体育中心南站）',
      '走进车厢后站到中间位置，双手自然下垂——不抓扶手、不靠墙',
      '随着列车启动和刹车，用核心力量保持平衡。每次有人看你，就回以"我知道这很奇怪但我不在乎"的微笑',
      '坐完全程（约12分钟），下车后拍一张站台照片。你刚刚解锁了"APM平衡大师"成就'
    ]
  },
  {
    id: 'bt017',
    content: '对着珠江大喊今天最想吐槽的事',
    type: 'breakthrough', typeColor: '#A55FA5', duration: 10,
    outdoor: true, nightSafe: true, rainy: false,
    requirePOI: null, cost: 0, double: false, mode: 'breakthrough',
    avoidTypes: ['social:extrovert'],
    recommendTypes: ['social:introvert', 'range:fixed'],
    tip: '为什么做：把心里的垃圾倒给珠江，让风帮你带走——比憋着强100倍。选傍晚或入夜后的海珠桥人行道，车流声能掩护你的音量，对着江面大声说出今天最想吐槽的事，然后说"交给你了"，深呼吸后你会发现心情轻了。',
    steps: [
      '坐地铁2号线或6号线到海珠广场站A口出，走上解放桥或海珠桥的人行道',
      '走到桥面正中间，双手扶着栏杆面朝珠江',
      '对着江面大声说出今天最想吐槽的一件事——工作、生活、天气、什么都行。说完后停顿3秒，然后说："好了，交给你了，珠江。"',
      '深呼吸一次，感受风吹走你的负能量。拍一张珠江夜景的照片留作纪念——这时的心情应该已经变轻盈了'
    ]
  },
  {
    id: 'bt018',
    content: '用老派姿势在永庆坊自拍',
    type: 'breakthrough', typeColor: '#A55FA5', duration: 15,
    outdoor: true, nightSafe: false, rainy: false,
    requirePOI: null, cost: 0, double: false, mode: 'breakthrough',
    avoidTypes: [],
    recommendTypes: ['hobby:art', 'range:fixed'],
    tip: '为什么做：用你爸妈的口吻拍一张照，是在和"认真做自己"这件事和解——不用每次都又美又飒，老派也有老派的快乐。选永庆坊粤剧博物馆门口的月亮门或满洲窗，双手背在身后站直拍，配文也要学爸妈口吻。',
    steps: [
      '坐地铁1号线或6号线到黄沙站B口出，走路到永庆坊粤剧艺术博物馆附近',
      '找到粤剧博物馆正门外的月亮门（拱形门洞）或旁边巷子里的满洲窗',
      '用最标准的"老派游客"姿势拍照：双手背在身后、站得笔直、露出克制的微笑、身体正对镜头——就像80年代爸妈在景点拍的那种照片',
      '发朋友圈配文："今日游览永庆坊，风景秀丽，心情愉悦。"——用你爸妈的口吻写'
    ]
  },
  {
    id: 'bt019',
    content: '对着甜品站服务员说"要一份快乐"',
    type: 'breakthrough', typeColor: '#A55FA5', duration: 5,
    outdoor: false, nightSafe: true, rainy: true,
    requirePOI: null, cost: 5, double: false, mode: 'breakthrough',
    avoidTypes: ['social:extrovert'],
    recommendTypes: ['social:introvert', 'range:fixed', 'hobby:food'],
    tip: '为什么做：用最认真的表情说最不着调的话——你打破了"点单必须点具体商品"的社交规则，这种小小的越界会让你上瘾。选体育西路天河城一楼甜品站，排队人不多的时候，用"正在认真点单"的表情说"我要一份快乐"。',
    steps: [
      '去麦当劳甜品站前排队（推荐：体育西路天河城一楼的甜品站）',
      '轮到你了，看着服务员的眼睛，非常认真地说："你好，我想要一份快乐。"——停顿2秒',
      '不管服务员是困惑、微笑还是问你"什么"，你都继续说："就是能让我开心起来的那种——你们有卖吗？"然后突然笑起来说"开个玩笑，要一个甜筒"',
      '拿到甜筒后说谢谢，走到旁边拍一张咬第一口的照片。你让一个麦当劳服务员今天多了一个可以讲的故事'
    ]
  },
  {
    id: 'bt020',
    content: '在太古汇洗手间给自己一句夸奖',
    type: 'breakthrough', typeColor: '#A55FA5', duration: 5,
    outdoor: false, nightSafe: true, rainy: true,
    requirePOI: null, cost: 0, double: false, mode: 'breakthrough',
    avoidTypes: ['social:extrovert'],
    recommendTypes: ['social:introvert', 'range:fixed'],
    tip: '为什么做：你总是等着别人来夸你——但最该夸奖你的人，其实是你自己。太古汇的洗手间装修精致、灯光柔和，选一个人少的时段进去，用手机手电筒打侧光，对着镜子说一句你渴望听到的夸奖，说给自己听。',
    steps: [
      '去太古汇（石牌桥站D口直达），上二楼或三楼的洗手间',
      '走进洗手间，确认独立隔间或洗手台区域没有太多人',
      '打开手机手电筒，从侧面给自己打光，对着镜子认真地说一句你渴望听到的夸奖——比如"你做得已经很好了"或"你今天漂亮得不像话"——说给自己听',
      '说完后对着镜子笑一下，关掉手电筒。你刚刚当了3秒钟自己的最佳观众'
    ]
  },

  // ============================================================
  // 类别 2：身份偷窃（bt021-bt040）
  // 短暂成为另一个人
  // ============================================================
  {
    id: 'bt021',
    content: '在上下九假装一句中文都不会',
    type: 'breakthrough', typeColor: '#A55FA5', duration: 30,
    outdoor: true, nightSafe: false, rainy: false,
    requirePOI: null, cost: 10, double: false, mode: 'breakthrough',
    avoidTypes: [],
    recommendTypes: ['social:moderate', 'hobby:game', 'range:fixed'],
    tip: '为什么做：穿上另一个身份，你会发现"做自己"的包袱瞬间卸掉了——不会说中文就不需要假装很懂。去上下九服装档口，穿得像游客，全程用英语+手势砍价，老板大概率会配合你演戏。',
    steps: [
      '坐地铁6号线到文化公园站E口出，走到上下九步行街的服装档口区',
      '给自己设定角色——今天你是"来自巴西的自助旅行者Jose"，一句中文都不会',
      '走进一家卖T恤的档口，用英语+手势问价格："How much?"——老板伸出5根手指比划50，你瞪大眼睛夸张地说"Oh! Expensive!"然后比划"30"',
      '不管砍价成功与否，最后说"Thank you! You are so nice!"然后走出店门。在巷子里摘墨镜笑出声——你刚刚过了15秒的"异国人生"'
    ]
  },
  {
    id: 'bt022',
    content: '假装珠江新城的楼宇保安',
    type: 'breakthrough', typeColor: '#A55FA5', duration: 20,
    outdoor: true, nightSafe: true, rainy: false,
    requirePOI: null, cost: 0, double: false, mode: 'breakthrough',
    avoidTypes: [],
    recommendTypes: ['social:introvert', 'range:fixed', 'hobby:game'],
    tip: '为什么做：当你穿得足够像保安，别人就会把你当保安——这就是身份即服装的魔力。去珠江新城东塔楼下，穿深色上衣+墨镜，双手交叉站出"专业感"，一动不动站5分钟，至少3个人会以为你是安保。',
    steps: [
      '穿深色上衣+墨镜（有西装更好），坐地铁3号线或5号线到珠江新城站，走到东塔一楼平台',
      '在大堂正门外找一个不挡路的角落，双手交叉放在身前，双脚微开与肩同宽',
      '站定，保持"专业保安"的面无表情——视线看向前方但不要和任何人对视。站满5分钟',
      '时间到后，摸一下耳麦（可以没有，假装有），小声说"收工"，然后转身从容离开。你成功地让至少3个人以为你是这里的安保人员'
    ]
  },
  {
    id: 'bt023',
    content: '在陈家祠门口客串导游',
    type: 'breakthrough', typeColor: '#A55FA5', duration: 15,
    outdoor: true, nightSafe: false, rainy: false,
    requirePOI: '陈家祠', cost: 0, double: false, mode: 'breakthrough',
    avoidTypes: ['social:extrovert'],
    recommendTypes: ['social:introvert', 'range:fixed', 'hobby:art'],
    tip: '为什么做：当"业余导游"只需要3分钟准备——你用手机搜一句介绍词，就能在广场上体验"被人信任"的感觉。到陈家祠正门外广场，提前背一句介绍词，用带团语气对着空气（或一个路人）说，说完装作接到电话走人。',
    steps: [
      '坐地铁1号线或8号线到陈家祠站D口出，走到陈家祠正门外的广场',
      '拿出手机快速搜一句陈家祠的介绍词——比如"陈家祠是广东现存规模最大、保存最完整的祠堂建筑"',
      '站在广场上，对着空气（或者随机一位看起来在等人的游客），用一种"带团"的语气说："各位请看，这就是陈家祠——广东祠堂的天花板！门前的石鼓，是身份的象征。"',
      '说完后装作接到电话说"好，马上来"，然后挂断走人。你今天兼职当了2分钟的陈家祠导游'
    ]
  },
  {
    id: 'bt024',
    content: '穿人字拖逛太古汇奢侈品店',
    type: 'breakthrough', typeColor: '#A55FA5', duration: 20,
    outdoor: false, nightSafe: false, rainy: true,
    requirePOI: null, cost: 0, double: false, mode: 'breakthrough',
    avoidTypes: ['social:extrovert'],
    recommendTypes: ['social:introvert', 'range:fixed', 'hobby:game'],
    tip: '为什么做：最贵的店和最简单的穿搭之间的反差，就是你在对"消费主义"说——我不需要穿成什么样才配进这家店。穿人字拖+大背心走进太古汇的Gucci或LV，用"鉴赏家"的表情看价格标签，全程自信就好。',
    steps: [
      '坐地铁3号线到石牌桥站，从D口直达太古汇商场',
      '穿人字拖+大背心（或休闲短裤）——总之就是"我不属于这里"的穿搭',
      '走进一楼任意一家奢侈品牌店（Gucci/LV/Prada都行），用"鉴赏家"的表情看每一件商品——拿起价格标签认真看，点点头，再放下',
      '转一圈后从容走出店门，在门口拍一张自己"人字拖逛太古汇"的脚部特写。你用实际行动证明了——穿什么都可以逛街'
    ]
  },
  {
    id: 'bt025',
    content: '戴彩色假发坐地铁三站路',
    type: 'breakthrough', typeColor: '#A55FA5', duration: 30,
    outdoor: true, nightSafe: false, rainy: true,
    requirePOI: null, cost: 30, double: false, mode: 'breakthrough',
    avoidTypes: [],
    recommendTypes: ['social:moderate', 'hobby:game', 'range:fixed'],
    tip: '为什么做：换个发型就等于换一个人——在没人认识你的地铁里，你可以是任何人。去动漫星城负一层买一顶彩色假发当场戴上，坐3号线往体育西方向坐3站，你会发现其实根本没人盯着你看。',
    steps: [
      '坐地铁1号线或2号线到公园前站，从动漫星城出口进负一层',
      '找一家卖假发或夸张头饰的店（负一层中庭附近最多），挑一顶你平时绝对不会戴的假发买下来',
      '当场戴上——在店里镜子前整理好，不要摘下来。就这样走出动漫星城，进地铁站坐3号线往体育西方向坐3站',
      '到站下车后，在地铁站台自拍一张"新发型认证照"。你今天变成了另一个次元的人'
    ]
  },
  {
    id: 'bt026',
    content: '在二沙岛草坪上假装画家',
    type: 'breakthrough', typeColor: '#A55FA5', duration: 40,
    outdoor: true, nightSafe: false, rainy: false,
    requirePOI: null, cost: 0, double: false, mode: 'breakthrough',
    avoidTypes: [],
    recommendTypes: ['hobby:art', 'hobby:outdoor', 'range:fixed'],
    tip: '为什么做：当好画家的秘密不是画得好，而是画得投入——你认真的样子本身就是行为艺术。去二沙岛发展公园草坪，面朝广州塔，用硬纸板或笔记本当画板，像真正的画家一样眯眼、比手势、退后端详，画什么都行。',
    steps: [
      '坐地铁5号线到五羊邨站D口出，走路或骑共享单车到二沙岛发展公园草坪',
      '找到一块面对广州塔方向的好位置，铺开你的"画具"——可以用硬纸板或笔记本代替画板',
      '面朝广州塔坐下，认真开始"写生"——随便画什么都可以：火柴人、波浪线、写"到此一游"都行。关键是你的姿态要像一个真正的画家：眯眼看、比手势、退后几步端详',
      '"画"完后，把作品和广州塔拍一张合影。你成功扮演了30分钟的"二沙岛艺术家"'
    ]
  },
  {
    id: 'bt027',
    content: '穿汉服去猎德菜市场砍价',
    type: 'breakthrough', typeColor: '#A55FA5', duration: 30,
    outdoor: true, nightSafe: false, rainy: false,
    requirePOI: null, cost: 20, double: false, mode: 'breakthrough',
    avoidTypes: [],
    recommendTypes: ['hobby:game', 'hobby:food', 'range:fixed'],
    tip: '为什么做：穿上汉服的那一刻你就穿越了——平日被生活压着的"打工人"突然变成了古装剧里的主角。穿汉服去猎德菜市场，对档主说"这捆菜心多少银两"，比出古装剧手势，档主会笑着配合你。',
    steps: [
      '穿上汉服（或任何古风服装），坐地铁5号线到猎德站B口出，走去猎德菜市场',
      '在菜市场里逛一圈，找一个卖青菜的档口',
      '用一种古装剧的语气对档主说："老板，这捆菜心——多少银两？"然后比出古装剧里"五"的手势。档主大概率会笑着配合你',
      '买完菜后，在猎德村牌坊前拍一张"汉服买菜"的合影。你这是"古今穿越第一人"'
    ]
  },
  {
    id: 'bt028',
    content: '在地铁站问路人"这是广州吗"',
    type: 'breakthrough', typeColor: '#A55FA5', duration: 5,
    outdoor: false, nightSafe: true, rainy: true,
    requirePOI: null, cost: 0, double: false, mode: 'breakthrough',
    avoidTypes: ['social:extrovert'],
    recommendTypes: ['social:introvert', 'range:fixed', 'hobby:game'],
    tip: '为什么做：明知故问的问题能打破"社交自动导航"——让对方愣住的那一秒，就是你存在感最强的时刻。选早高峰过后的珠江新城站换乘通道，拉住一个路人用最真诚的表情问"这里是广州吗"，趁TA愣住时说谢谢走人。',
    steps: [
      '坐地铁到珠江新城站，走到3号线和5号线的换乘通道（人流量最大的区域）',
      '找一个快步走路但表情不算太赶的年轻人，快步迎上去',
      '用最真诚的困惑表情问："您好，不好意思打扰了——请问这里是广州吗？"（你明明在广州地铁站里）',
      '趁对方愣住或回答"是啊"的时候，你立刻露出恍然大悟的表情说"好的好的，谢谢！"然后转身走开。你今天成功地制造了一个让人"啊？"的瞬间'
    ]
  },
  {
    id: 'bt029',
    content: '戴安全帽在工地外假装监工',
    type: 'breakthrough', typeColor: '#A55FA5', duration: 15,
    outdoor: true, nightSafe: false, rainy: false,
    requirePOI: null, cost: 0, double: false, mode: 'breakthrough',
    avoidTypes: [],
    recommendTypes: ['social:introvert', 'range:fixed', 'hobby:game'],
    tip: '为什么做：你不需要真的懂工程，只需要一副安全帽和一张纸，就能体验"看起来很重要"的感觉。去琶洲或珠江新城附近在建工地外围，戴好安全帽拿一张叠好的A4纸当图纸，皱眉、点头、写写画画就行，千万别进工地。',
    steps: [
      '戴好安全帽和口罩（衣服穿朴素点），拿一张叠好的A4纸当图纸',
      '走到琶洲或珠江新城附近的一个在建工地外围（站在围挡外侧，不要进去）',
      '打开"图纸"认真看，皱眉头，然后抬头看工地，再低头看图纸——反复3次。时不时用笔在纸上画一下，点几下头，露出"嗯，进度不错"的表情',
      '"检查"5分钟后，收起图纸从容走开。你成功地体验了3分钟"工程项目经理"的人生'
    ]
  },
  {
    id: 'bt030',
    content: '穿睡衣拖鞋逛天环广场',
    type: 'breakthrough', typeColor: '#A55FA5', duration: 20,
    outdoor: true, nightSafe: false, rainy: false,
    requirePOI: null, cost: 0, double: false, mode: 'breakthrough',
    avoidTypes: [],
    recommendTypes: ['social:introvert', 'range:fixed', 'hobby:game'],
    tip: '为什么做：穿睡衣出门是一种宣言——"我舒服就好，不需要穿给谁看"。下午4点去天环广场，穿睡衣睡裤拖鞋，越居家越好，关键是要表现得"理所当然"，你越自然越没人觉得奇怪。',
    steps: [
      '换上睡衣睡裤和拖鞋（越居家越好），坐地铁1号线或3号线到体育西路站C口出',
      '直接走进天环广场的开放式街区入口，经过Apple Store往商场里面走',
      '在天环广场的B1层和1层正常逛一圈——经过那些精致的店铺时，你穿着睡衣和那些橱窗形成了一种"反差艺术品"般的画面',
      '在商场中庭找一个没人的角落自拍一张，配文"邻居说楼下新开了个商场，下来转转"'
    ]
  },
  {
    id: 'bt031',
    content: '在海珠湿地假装自然探险家',
    type: 'breakthrough', typeColor: '#A55FA5', duration: 60,
    outdoor: true, nightSafe: false, rainy: false,
    requirePOI: null, cost: 20, double: false, mode: 'breakthrough',
    avoidTypes: [],
    recommendTypes: ['hobby:outdoor', 'hobby:art', 'range:fixed'],
    tip: '为什么做：探险家不需要真的认识植物——只需要一根树枝和一颗好奇心，就能把散步变成冒险。去海珠湿地公园南门进绿心湖区域，捡一根树枝当探险手杖，遇到花就蹲下研究，随口说"这个品种在广州不常见"。',
    steps: [
      '坐地铁3号线到大塘站B口出，走路到海珠湿地公园南门，买票进去',
      '在南门的草坪上捡一根掉落的树枝当"探险手杖"',
      '沿着绿心湖步道走，每遇到一种颜色不同的花就停下来，蹲下，用树枝轻轻拨开花瓣，然后自言自语："有意思，这个品种在广州不常见。"——说得很认真',
      '走到湖边的观景台，用"探险手杖"指向水面，拍一张"探险家视察领地"的照片。你今天不是普通的游客，你是"海珠湿地发现者"'
    ]
  },
  {
    id: 'bt032',
    content: '穿西装在中大门口假装教授',
    type: 'breakthrough', typeColor: '#A55FA5', duration: 20,
    outdoor: true, nightSafe: false, rainy: false,
    requirePOI: null, cost: 0, double: false, mode: 'breakthrough',
    avoidTypes: [],
    recommendTypes: ['social:introvert', 'range:fixed', 'hobby:game'],
    tip: '为什么做：穿上西装的那一刻，你的气场会自动调成"教授模式"——外在形象真的能改变内在状态。去中山大学南门白色牌坊附近的公共区域，双手背在身后，对进出学生微笑点头，站10分钟后假装看表走人。',
    steps: [
      '穿一身正装（衬衫+西裤+皮鞋最佳），坐地铁8号线到中大站B口出',
      '走到中山大学南门（那个著名的白色牌坊大门）附近的公共区域',
      '站在校门口一侧，双手自然背在身后，对每一位进出校门的学生微笑点头——就像你是来开讲座的知名教授，认识每一个学生',
      '站10分钟后，假装看手表，露出"哎呀快迟到了"的表情快步走开。你今天在中山大学门口当了10分钟的"名誉教授"'
    ]
  },
  {
    id: 'bt033',
    content: '拿花在天河城门口等一个不会来的人',
    type: 'breakthrough', typeColor: '#A55FA5', duration: 15,
    outdoor: true, nightSafe: false, rainy: false,
    requirePOI: null, cost: 20, double: false, mode: 'breakthrough',
    avoidTypes: ['social:extrovert'],
    recommendTypes: ['social:introvert', 'range:fixed', 'hobby:art'],
    tip: '为什么做：一束花和一个微笑，就能在闹市中创作一部15分钟的默片——你成为了一部城市剧的主角。在天河城正门口侧边买一束向日葵或满天星，对每个和你有眼神接触的人淡淡微笑，像在等一个很重要的人。',
    steps: [
      '在体育西路附近的花店买一束小花（向日葵或雏菊都行，20元左右），不要包装太正式',
      '走到天河城正门口旁侧（不要挡路），拿着花站定',
      '对每一个路过的、和你有眼神接触的人——微笑。不是大笑，是一种"我知道你可能在看我"的淡淡微笑。就像你在等一个很重要的人',
      '站满15分钟后，拿着花从容走开。你刚刚在广州市中心创作了一部15分钟的无声电影，名字叫"等一个不会来的人"'
    ]
  },
  {
    id: 'bt034',
    content: '假装从海洋馆出来分享见闻',
    type: 'breakthrough', typeColor: '#A55FA5', duration: 10,
    outdoor: false, nightSafe: false, rainy: true,
    requirePOI: null, cost: 0, double: false, mode: 'breakthrough',
    avoidTypes: ['social:extrovert'],
    recommendTypes: ['social:introvert', 'range:fixed', 'hobby:game'],
    tip: '为什么做：不需要花钱买门票，只需要一个善意的谎言就能点亮一家人的期待——你的话可能让陌生人多了一分快乐。在正佳广场2楼海洋馆入口附近，假装刚看完出来，用"好感动"的表情对排队的人说"白鲸刚才跟我点头了"。',
    steps: [
      '坐地铁1号线到体育中心站D3口出，进正佳广场上2楼走到海洋馆入口',
      '在入口附近站着，假装你是刚出来的游客——表情带着"看完好感动"的余韵',
      '对正在排队入场的一家三口（挑和善的那种）说："你们一定会喜欢的——白鲸刚才在水里对我点头了，好像在说欢迎光临。"说完微笑点头离开',
      '走出20步后，奖励自己一杯奶茶。你今天给一家陌生人制造了入馆前的美好期待'
    ]
  },
  {
    id: 'bt035',
    content: '在美妆店假装博主录测评',
    type: 'breakthrough', typeColor: '#A55FA5', duration: 15,
    outdoor: false, nightSafe: true, rainy: true,
    requirePOI: null, cost: 0, double: false, mode: 'breakthrough',
    avoidTypes: [],
    recommendTypes: ['social:moderate', 'range:fixed', 'hobby:game'],
    tip: '选屈臣氏或丝芙兰（推荐太古汇店或天环广场店），这些店有试用装。打开手机录像模式（不用真录，打开相机假装在录就行），然后用专业美妆博主的语气点评任何一款产品——不需要是美妆，也可以点评剃须刀',
    steps: [
      '去一家有试用装的美妆店（推荐：天环广场的丝芙兰或太古汇的屈臣氏）',
      '拿起一支口红或任何产品，打开手机相机对准自己——假装正在录制测评视频',
      '用最专业的美妆博主语气说："宝贝们看这个——××牌新出的色号，我上嘴给你们看……很润，很丝滑，这个颜色黄皮也能hold住。"（不需要真的涂）',
      '"录"完后关掉手机，若无其事地离开。旁边的人以为你是个网红，只有你知道你刚刚在演一场只有自己知道的戏'
    ]
  },
  {
    id: 'bt036',
    content: '在沙面穿风衣扮侦探勘察',
    type: 'breakthrough', typeColor: '#A55FA5', duration: 30,
    outdoor: true, nightSafe: false, rainy: false,
    requirePOI: null, cost: 0, double: false, mode: 'breakthrough',
    avoidTypes: [],
    recommendTypes: ['hobby:art', 'hobby:reading', 'range:fixed'],
    tip: '为什么做：穿上风衣、拿起笔记本，沙面的旧领事馆就是你一个人的案发现场——你不需要破案，只需要像侦探一样走路。去沙面大街穿风衣戴帽子，在旧建筑前仰头观察、低头记录，写"东立面，拱形窗，疑似1920年代建"。',
    steps: [
      '坐地铁6号线到文化公园站E口出，走人民桥到沙面岛',
      '穿风衣/深色外套+帽子，带一本笔记本和笔，走到沙面大街的旧领事馆建筑群',
      '在一栋旧建筑前停下，仰头仔细观察3分钟，然后低头在笔记本上快速记录——"东立面，三层，拱形窗，疑似1920年代建"——写得越专业越好',
      '"勘察"完3栋建筑后，合上笔记本，点一下头，像破案了一样转身离开。你今天在沙面当了一集《名侦探柯南》的主角'
    ]
  },
  {
    id: 'bt037',
    content: '在天环摆摊收集快乐故事',
    type: 'breakthrough', typeColor: '#A55FA5', duration: 20,
    outdoor: true, nightSafe: false, rainy: false,
    requirePOI: null, cost: 0, double: false, mode: 'breakthrough',
    avoidTypes: ['social:extrovert'],
    recommendTypes: ['social:introvert', 'range:fixed', 'hobby:game'],
    tip: '为什么做：当你摆出"我愿意倾听"的姿态时，世界有时真的会回应你——哪怕没人坐下来，坐着的这20分钟本身已经是对"匆忙生活"的反抗。去天环广场Apple Store旁户外台阶，杯子前放纸写"不收钱，但可以告诉我一件开心的事"。',
    steps: [
      '坐地铁1号线或3号线到体育西路站C口出，走到天环广场Apple Store外的台阶区域',
      '找一张纸和一支笔，写上"不收钱——但如果你今天过得不错，可以告诉我一件开心的事"',
      '把一个杯子放在纸旁边，在台阶上坐下。不要玩手机——就静静坐着看行人。如果有人真的跟你说话，认真听TA说',
      '等20分钟，不管有没有人理你——你坐着的这20分钟，已经是在告诉世界"我愿意倾听"。拍一张台阶和广州蓝天的合影'
    ]
  },
  {
    id: 'bt038',
    content: '在天台模仿天气预报员播报',
    type: 'breakthrough', typeColor: '#A55FA5', duration: 10,
    outdoor: true, nightSafe: false, rainy: false,
    requirePOI: null, cost: 0, double: false, mode: 'breakthrough',
    avoidTypes: ['social:extrovert'],
    recommendTypes: ['social:introvert', 'range:fixed', 'hobby:game'],
    tip: '为什么做：用新闻主播的语气播报"热到融化"，你就不再是被天气欺负的人——你变成了天气的评论员。去中华广场顶楼天台，面朝越秀区天际线，打开手机相机假装录像，用最标准的播报语气说"广州体感温度——热到融化"。',
    steps: [
      '坐地铁1号线到烈士陵园站A口出，走到中华广场坐电梯到顶楼',
      '在天台层找到视野开阔的角落，面朝整个越秀区的城市天际线',
      '打开手机相机对准自己，用新闻主播的语气说："观众朋友们大家好，现在是北京时间2026年7月29日，我在广州中华广场为您发回现场报道——今天的广州，体感温度……热到融化！建议各位减少出门。"',
      '"播报"结束后，拍一张天台俯瞰广州的照片。你完成了今天份的"假想职业体验"'
    ]
  },
  {
    id: 'bt039',
    content: '蹲在路边像小学生一样吃冰淇淋',
    type: 'breakthrough', typeColor: '#A55FA5', duration: 10,
    outdoor: true, nightSafe: false, rainy: false,
    requirePOI: null, cost: 10, double: false, mode: 'breakthrough',
    avoidTypes: [],
    recommendTypes: ['social:introvert', 'range:fixed', 'hobby:food'],
    tip: '为什么做：长大的标志之一就是不再能蹲在路边吃冰淇淋——今天你做回小孩，哪怕只有10分钟。去万菱汇门口买一个甜筒，蹲在路边台阶上：双膝并拢、埋头专心舔、不玩手机不看路人，像小学生放学一样认真。',
    steps: [
      '坐地铁3号线到石牌桥站A口出，走到万菱汇正门口的广场',
      '在广场上的冰淇淋店买一个甜筒（选融得最快的那个）',
      '走到路边台阶或花坛边，蹲下来——像小学生一样：双膝并拢、身体前倾、埋头专注于手中的冰淇淋、不玩手机不看路人',
      '把整个冰淇淋吃完，站起来拍拍裤子。你刚刚在CBD核心区完完全全地"做了一回小孩"'
    ]
  },
  {
    id: 'bt040',
    content: '假装外卖员送奶茶到写字楼',
    type: 'breakthrough', typeColor: '#A55FA5', duration: 15,
    outdoor: true, nightSafe: false, rainy: false,
    requirePOI: null, cost: 15, double: false, mode: 'breakthrough',
    avoidTypes: ['social:extrovert'],
    recommendTypes: ['social:moderate', 'range:fixed', 'hobby:game'],
    tip: '为什么做：快跑进写字楼的那一刻你会体会到——外卖员的人生也有它的节奏和热血。在体育西路或珠江新城附近买一杯奶茶，快步走进高德置地或维多利广场大堂，用外卖员的急促语气对前台说"麻烦代收一下"，放下就走。',
    steps: [
      '在体育西路或珠江新城附近买一杯奶茶',
      '找一个对外开放的写字楼大堂（推荐：高德置地春广场一楼大堂或维多利广场）',
      '快步走进大堂，手里端着奶茶，用外卖员的急促语气对前台小姐姐说："您好，××的外卖，麻烦前台代收一下。"——语气要急但不凶',
      '说完把奶茶放在前台桌上，转身就走。走出大堂后你完成了"10分钟外卖员体验"——那杯奶茶就当是给前台小姐姐的惊喜了'
    ]
  },

  // ============================================================
  // 类别 3：随机命运（bt041-bt060）
  // 把决定权交给天命
  // ============================================================
  {
    id: 'bt041',
    content: '让地铁决定今天的终点站，坐到哪算哪',
    type: 'breakthrough', typeColor: '#A55FA5', duration: 90,
    outdoor: true, nightSafe: false, rainy: true,
    requirePOI: null, cost: 10, double: false, mode: 'breakthrough',
    avoidTypes: ['range:fullcity'],
    recommendTypes: ['range:fixed', 'hobby:game', 'social:introvert'],
    tip: '为什么做：把选择权交给命运，你会发现"去哪"不重要，"出发"本身才重要。当你不预设目的地，每一站都是惊喜。体育西路站是1号线和3号线的换乘站，两边都有不同方向。站台中间等，看哪一趟先关门出发就上哪趟。如果是3号线，你可能到机场北或番禺广场；如果是1号线，到广州东站或西朗',
    steps: [
      '坐任意地铁到体育西路站，走到1号线或3号线的站台中间位置',
      '站在两条轨道中间的区域（注意安全黄线内），左右张望——看哪一趟车先来',
      '先来的那趟车，直接上去。不管它往哪个方向——坐到终点站',
      '到终点站后出闸机呼吸一口"命运的新鲜空气"，拍一张站名照片，然后坐相反方向回来。你今天的选择权交给了"谁先来"'
    ]
  },
  {
    id: 'bt042',
    content: '闭眼截图定午餐，命运安排不能换',
    type: 'breakthrough', typeColor: '#A55FA5', duration: 60,
    outdoor: false, nightSafe: true, rainy: true,
    requirePOI: null, cost: 30, double: false, mode: 'breakthrough',
    avoidTypes: [],
    recommendTypes: ['hobby:food', 'range:fixed', 'hobby:game'],
    tip: '为什么做：选餐困难症的终极解药——与其纠结半小时，不如让命运帮你拍板。吃到意料之外的店，也许会发现新大陆。用美团或饿了么都行。打开APP到你附近的店铺列表，不要滑动，直接闭眼截图。截3次，第3次截图里的第一家店就是你今天的命运之选。如果截到一家你从不吃的店——恭喜你，天命在跟你开玩笑',
    steps: [
      '打开美团或饿了么APP，切换到"附近推荐"或"附近美食"列表',
      '闭上眼睛，把手机举到面前——手指随便滑几下屏幕（不要偷看），然后截一张图。重复3次',
      '睁开眼，看第3张截图——截图左上角出现的第1家店，就是今天中午的"命运指定餐厅"',
      '不管是什么店（烧烤/麻辣烫/粥粉面饭都行），下单点一个招牌菜。吃之前拍一张，配文"天命让我今天吃这个"'
    ]
  },
  {
    id: 'bt043',
    content: '用硬币决定每个路口的方向，走哪算哪',
    type: 'breakthrough', typeColor: '#A55FA5', duration: 30,
    outdoor: true, nightSafe: true, rainy: false,
    requirePOI: null, cost: 0, double: false, mode: 'breakthrough',
    avoidTypes: [],
    recommendTypes: ['range:fixed', 'hobby:game'],
    tip: '为什么做：平时每个路口都有目的地在等你，今天让一枚硬币带你去未知——你会发现"迷路"其实是"发现"的另一种说法。在你家或宿舍楼下的大门口扔硬币。正面=出大门后左转，反面=右转。今天所有路口的选择都由硬币决定——每次遇到岔路就再扔一次。走到不想走了就原路返回',
    steps: [
      '在大门口或宿舍楼下站定，拿出一枚硬币',
      '正面朝上=向左走，反面朝上=向右走。扔出硬币，看结果',
      '沿着硬币决定的方向走，每遇到一个岔路口就再扔一次——正面左转、反面右转、原地转圈是往前走',
      '走满30分钟或走累了停下，记录你最终到达的位置——你被一枚硬币带到了这个从没想过要去的地方'
    ]
  },
  {
    id: 'bt044',
    content: 'BRT随机下车，去最陌生的站探险',
    type: 'breakthrough', typeColor: '#A55FA5', duration: 60,
    outdoor: true, nightSafe: false, rainy: false,
    requirePOI: null, cost: 4, double: false, mode: 'breakthrough',
    avoidTypes: ['range:fullcity'],
    recommendTypes: ['range:fixed', 'hobby:game', 'hobby:outdoor'],
    tip: '为什么做：广州有你不认识的角落，BRT会带你找到它。在陌生站点下车，是你和这座城市之间的一次"盲盒约会"。广州BRT（体育中心-夏园段）线路密集、站点多。选一趟BRT（B1/B2/B3等），上车后看站牌——选一个你从没听过或从没去过的站名，在那站下。推荐B1上棠东到夏园之间的站',
    steps: [
      '坐地铁到体育中心站或石牌桥站，走到BRT站台（体育中心站或岗顶站）',
      '随便上一趟BRT（B1-B27任意），站在门边看站名播报',
      '仔细听每一站的站名——选一个你从未听过的站名，或者你完全没概念在哪里的站——到了立刻下车',
      '出站后在那附近逛40分钟：找一家店买瓶水、拍一张街景、和当地人聊两句——然后坐车回家。你发现了广州一个你不认识的角落'
    ]
  },
  {
    id: 'bt045',
    content: '去书店闭眼转圈，让命运选一本书',
    type: 'breakthrough', typeColor: '#A55FA5', duration: 60,
    outdoor: false, nightSafe: true, rainy: true,
    requirePOI: null, cost: 40, double: false, mode: 'breakthrough',
    avoidTypes: [],
    recommendTypes: ['hobby:reading', 'range:fixed', 'hobby:game'],
    tip: '为什么做：你永远只会拿起感兴趣的书——但命运推荐的那本，才是你真正需要的。拓宽阅读边界，从把选择权交给缘分开始。推荐广州的1200bookshop（体育东路店）或唐宁书店（广粤天地店）。书店里的书千千万万——闭眼旋转后手指到的那本，就是"命运推荐给你的书"。如果指到了一本你不感兴趣的，今天就是"拓宽阅读边界日"',
    steps: [
      '去一家有足够多书的书店（推荐：天河路1200bookshop或珠江新城唐宁书店）',
      '走到一个你平时不会靠近的书架前（如果你平时看文学，就去商业类书架）',
      '闭眼，原地转三圈，然后伸出食指——指到的第一本书，就是今天的"命运读本"',
      '买下它（或在店里找个角落坐下），翻到你生日对应的那一页，读完它。拍下那一页的内容发朋友圈——配文"书店的命运轮盘给我指了这本书"'
    ]
  },
  {
    id: 'bt046',
    content: '让骰子决定你今天运动KPI',
    type: 'breakthrough', typeColor: '#A55FA5', duration: 10,
    outdoor: true, nightSafe: false, rainy: false,
    requirePOI: null, cost: 0, double: false, mode: 'breakthrough',
    avoidTypes: ['sport:never'],
    recommendTypes: ['sport:occasional', 'range:fixed', 'hobby:game'],
    tip: '为什么做：让命运决定你的运动量，把"要不要运动"的选择焦虑交给骰子。掷到几就做几个，1点也是天命。随身带一个骰子，在公园草地或广场上掷骰子，掷到几就在原地做几个开合跳。别人以为你在健身，只有你知道这是命运的惩罚/奖励',
    steps: [
      '带一个骰子或打开手机骰子APP，去天河公园或越秀公园的广场空地',
      '在开阔的地方站定，把骰子掷到地面上（或手机上掷）',
      '看点数——掷出几点就做几个开合跳。注意：如果掷出1点，那也要做，命运没有"再来一次"的说法',
      '做完后对着公园的天空张开双臂说"天命已接受"。你刚刚被一个骰子安排了今天的运动KPI'
    ]
  },
  {
    id: 'bt047',
    content: '歌词里出现的地名，就是今天的目的地',
    type: 'breakthrough', typeColor: '#A55FA5', duration: 90,
    outdoor: true, nightSafe: false, rainy: false,
    requirePOI: null, cost: 5, double: false, mode: 'breakthrough',
    avoidTypes: ['range:fullcity'],
    recommendTypes: ['range:fixed', 'hobby:game', 'hobby:social'],
    tip: '为什么做：你歌单里藏着一座城市的名字——让音乐告诉你今天该去哪里。这不仅是一次出行，更是你和你最爱的旋律之间的默契。打开你的音乐APP歌单，开启随机播放。第一首歌如果提到了地名（比如"北京""东山""广州大道"等），今天就去那里。如果歌词里没有地名，就放下一首直到出现为止',
    steps: [
      '在手机上打开音乐APP，点开你的歌单，开启随机播放',
      '仔细听第一首歌的歌词——听歌词里有没有提到任何地名、街道名、城市名',
      '如果第一首没有，切到第二首继续听——直到出现一个地名。它就是你今天的"目的地"',
      '如果是广州本地能到的地方（比如"东山口""白云""天河"），直接出发去那里拍照打卡。如果是一个外地的城市，就在手机地图上搜那个城市的位置，截图发朋友圈说"歌单让我去这里"'
    ]
  },
  {
    id: 'bt048',
    content: '让店员推荐他们自己最爱的那杯',
    type: 'breakthrough', typeColor: '#A55FA5', duration: 15,
    outdoor: false, nightSafe: true, rainy: true,
    requirePOI: null, cost: 25, double: false, mode: 'breakthrough',
    avoidTypes: [],
    recommendTypes: ['hobby:food', 'range:fixed'],
    tip: '为什么做：招牌是给所有人喝的——店员最爱的那杯才是隐藏款。把选择交给一个懂行的人，你喝到的不只是饮料，还有ta的品味。推荐去一家你没去过的独立奶茶店——天河南一路那些小店或六运小区的宝藏茶饮店。走到柜台前，只能问一个人（第一个接待你的店员），TA说啥你买啥，不能反悔',
    steps: [
      '去天河南一路或六运小区找一家你从没喝过的奶茶店',
      '走到柜台前，看着店员的眼睛说："你好，我今天想喝一杯你最喜欢的——不是招牌，是你自己最喜欢的那杯。"',
      '店员告诉你之后，直接下单——不能问第二个人的意见，不能改单',
      '拿到饮料喝第一口的时候，不管好不好喝都拍一张照片。你喝的不是奶茶，是"一个陌生人的口味偏好"'
    ]
  },
  {
    id: 'bt049',
    content: '掷骰子决定今天探索广州哪个区',
    type: 'breakthrough', typeColor: '#A55FA5', duration: 120,
    outdoor: true, nightSafe: false, rainy: false,
    requirePOI: null, cost: 10, double: false, mode: 'breakthrough',
    avoidTypes: ['range:fullcity'],
    recommendTypes: ['range:fixed', 'hobby:game', 'hobby:outdoor'],
    tip: '为什么做：你总说"改天去XX区逛逛"——今天骰子帮你把"改天"变成"今天"。每个区都有你不知道的宝藏角落，让命运带你打开盲盒。用手机骰子APP或用实体骰子。掷出数字后对应的区域就是今天的"天命区域"。到了那个区域后：打开大众点评搜该区评分最高的小吃店，去吃它',
    steps: [
      '在家或出发前，用骰子决定今天的目的地区域：1越秀-2荔湾-3海珠-4天河-5白云-6番禺',
      '出了结果不能反悔——哪怕是番禺（坐地铁也就40分钟），也要出发',
      '到了目标区域后，打开大众点评搜该区域评分最高的"小吃快餐"类店铺，去那里吃一顿',
      '吃完后在店门口拍一张照片，配文"骰子让我今天来（区名）吃这个"'
    ]
  },
  {
    id: 'bt050',
    content: '微信掷骰子，5或6就联系老朋友',
    type: 'breakthrough', typeColor: '#A55FA5', duration: 5,
    outdoor: false, nightSafe: true, rainy: true,
    requirePOI: null, cost: 0, double: false, mode: 'breakthrough',
    avoidTypes: ['social:extrovert'],
    recommendTypes: ['social:introvert', 'social:moderate'],
    tip: '为什么做：你心里有不止一个"好久不见但很想念"的人，缺的只是一个理由。让骰子替你开口——它不只是命运，更是你给自己的勇气。用微信自带的骰子表情功能。在任意聊天窗口发一个骰子表情，不看点数——发出去后的点数是命运决定的。5或6就去执行，1-4就不做。如果不用做——松一口气的同时，也可以问问自己"我是不是在庆幸不用联系TA？"',
    steps: [
      '打开微信，进入任意一个聊天窗口（可以发给自己或文件传输助手）',
      '在表情面板里找到骰子表情，发送出去——等待它停下',
      '如果点数是5或6——打开通讯录，找到一位半年以上没联系的人，发一句"嘿，突然想到你了，最近好吗？"',
      '如果点数是1-4——关掉手机，你今天逃过了一劫。但下次掷到5或6的时候，你不能再逃了'
    ]
  },
  {
    id: 'bt051',
    content: '菜市场闭眼转圈，买到什么做什么',
    type: 'breakthrough', typeColor: '#A55FA5', duration: 20,
    outdoor: true, nightSafe: false, rainy: false,
    requirePOI: null, cost: 15, double: false, mode: 'breakthrough',
    avoidTypes: [],
    recommendTypes: ['hobby:food', 'range:fixed', 'hobby:game'],
    tip: '为什么做：你总买自己会做的菜——今天让命运给你出一道"厨艺考题"。不管买到什么，跟老板学一手，你就多了一道拿手菜。推荐去东山口菜市场或猎德菜市场，这两个市场的摊位分布比较随机。闭眼前深呼吸、原地转三圈。睁眼后不要调整——第一眼看到的摊位就是"命运摊"。买完后问老板这个菜最家常的做法',
    steps: [
      '去你最近的一个菜市场（推荐：东山口市场或体育西横街市场）',
      '在入口处站定，确认周围没有障碍物后——闭眼，原地转三圈',
      '睁开眼，视线定住——第一个看到的摊位在卖什么，就买什么。不管是芥蓝、鲈鱼还是豆腐——买一份就走',
      '买完后问老板"这个怎么做最好吃"，按老板教的回家做了它。不管好不好吃，拍一张成品图发朋友圈配文"菜市场给我安排的今日菜单"'
    ]
  },
  {
    id: 'bt052',
    content: '用今天的日期决定你做几个俯卧撑',
    type: 'breakthrough', typeColor: '#A55FA5', duration: 5,
    outdoor: false, nightSafe: true, rainy: true,
    requirePOI: null, cost: 0, double: false, mode: 'breakthrough',
    avoidTypes: ['sport:never'],
    recommendTypes: ['sport:occasional', 'range:fixed', 'hobby:game'],
    tip: '为什么做：把时间和运动串联起来，每做一个俯卧撑都是对今天的一次致敬。数字越大，成就感越强——命运不给你讨价还价的机会。7月29日是今年的第210天（平年）。如果你做不了210个俯卧撑，就用210除以10=21个——命运也是讲道理的。在客厅或公园空地上完成就行。做完后你比210天前的自己更强了一点',
    steps: [
      '翻开手机日历或撕一张实体日历——看今天是今年的第几天',
      '用这个数字除以10（取整）——比如第210天÷10=21个——这就是你今天要做俯卧撑或深蹲的数量',
      '找个空地（客厅/阳台/楼下公园都行），原地完成这个数量的动作',
      '做完后深呼吸，拍一张满头汗的自拍。你今天被日历安排了运动任务'
    ]
  },
  {
    id: 'bt053',
    content: '电梯闭眼按一层，探索命运楼层',
    type: 'breakthrough', typeColor: '#A55FA5', duration: 15,
    outdoor: false, nightSafe: true, rainy: true,
    requirePOI: null, cost: 0, double: false, mode: 'breakthrough',
    avoidTypes: [],
    recommendTypes: ['range:fixed', 'hobby:game', 'social:introvert'],
    tip: '为什么做：一栋楼里有几十层，你从来没去过其中大部分——让命运之手替你按一次，看看那层楼藏了什么风景。每个楼层都是一次小冒险。选一栋有10层以上的楼——推荐天河城写字楼或中华广场这种对外开放的大楼。进电梯后闭眼随便按一个楼层按钮。到那一层后不要坐电梯下去——走楼梯或换电梯探索',
    steps: [
      '找一栋高层公共建筑（推荐：天河城写字楼或中华广场，有公共电梯）',
      '走进电梯，不看楼层按钮——闭眼，随便戳一个',
      '电梯到层后，走出去——在这一层走到尽头，找到一幅装饰画、一块指示牌或一个有趣的视角',
      '拍下你发现的"命运楼层"的风景，发朋友圈配文"闭眼按了电梯——命运带我来这里"'
    ]
  },
  {
    id: 'bt054',
    content: '随机跳上一辆公交，坐三站下车',
    type: 'breakthrough', typeColor: '#A55FA5', duration: 40,
    outdoor: true, nightSafe: false, rainy: false,
    requirePOI: null, cost: 4, double: false, mode: 'breakthrough',
    avoidTypes: ['range:fullcity'],
    recommendTypes: ['range:fixed', 'hobby:game', 'hobby:outdoor'],
    tip: '为什么做：你习惯了地铁的固定路线——公交才是真正漫游城市的方式。坐三站下车，你永远不知道会被扔在哪个充满惊喜的街角。选一个有多条公交线路的站点（推荐：天河公交场总站或中山纪念堂站），来哪辆上哪辆。坐3站就下，在附近找三样东西拍照：一个路牌、一个陌生人（偷拍背影）、一个你自己',
    steps: [
      '去一个有多条公交线路的站点（推荐：天河公交场总站或动物园南门站）',
      '不看线路牌——第一辆进站的公交不管几路直接上，坐3站',
      '下车后，在附近完成"命运三连拍"：①拍一个路牌或地标 ②拍一个路人的背影 ③自拍一张你和"未知地点"的合影',
      '打开地图APP看看你被带到了哪里——这个地方不是你选的，是公交选的。发朋友圈"命运公交车把我扔在了这里"'
    ]
  },
  {
    id: 'bt055',
    content: '抽一个人设词，今天只用它回应一切',
    type: 'breakthrough', typeColor: '#A55FA5', duration: 480,
    outdoor: true, nightSafe: true, rainy: true,
    requirePOI: null, cost: 0, double: false, mode: 'breakthrough',
    avoidTypes: ['social:extrovert'],
    recommendTypes: ['social:introvert', 'hobby:game', 'range:fixed'],
    tip: '为什么做：你每天要说几百句话，但大多数都是"自动回复"。今天用一个词勒住自己的语言习惯——你会发现，词越少，对话越有趣，自己也越清醒。写6张纸条：①"有意思"②"确实"③"你说的对"④"我考虑一下"⑤"好家伙"⑥"随缘吧"。抽到哪个，今天所有社交场景的回答都用这个词开头。你会发现——词越少，对话越有趣',
    steps: [
      '准备6张小纸条，分别写上：有意思 / 确实 / 你说的对 / 我考虑一下 / 好家伙 / 随缘吧',
      '闭眼抽一张——抽中的就是你今天的"人设关键词"',
      '今天不管遇到什么事——同事问你吃什么、朋友约你出去玩、老板问你意见——先回答你的关键词再说别的',
      '睡前复盘：今天说了多少次这个词？有没有哪个时刻差点憋不住？记录最搞笑的一次对话'
    ]
  },
  {
    id: 'bt056',
    content: '在二沙岛转晕后，找到命运选中的红色',
    type: 'breakthrough', typeColor: '#A55FA5', duration: 20,
    outdoor: true, nightSafe: false, rainy: false,
    requirePOI: null, cost: 0, double: false, mode: 'breakthrough',
    avoidTypes: [],
    recommendTypes: ['hobby:outdoor', 'range:fixed', 'hobby:game'],
    tip: '为什么做：转晕后的世界是不受控制的——你走的每一步都是晕眩中的随机。让一个"红色"来截停你的脚步，看看命运把你带到了什么面前。二沙岛发展公园的大草坪视野开阔、没有障碍物，最适合闭眼走。转5圈会有点晕，所以走直线的时候会飘——这正是乐趣所在。红色东西可以是一朵花、一个人的衣服、一辆车——拍到就算完成',
    steps: [
      '坐地铁5号线到五羊邨站D口出，走到二沙岛发展公园的大草坪',
      '在草坪中央站定，确认前后10米内没有障碍物——闭眼，原地转5圈',
      '转完后睁开眼睛的瞬间会有点晕——就着这个感觉往前直走，直到视野里出现第一个红色的东西',
      '停下来，和那个红色的东西合影。不管它是什么——你被"命运的红色"引导到了这里'
    ]
  },
  {
    id: 'bt057',
    content: '便利店闭眼拿三样，今天必须用完',
    type: 'breakthrough', typeColor: '#A55FA5', duration: 60,
    outdoor: false, nightSafe: true, rainy: true,
    requirePOI: null, cost: 20, double: false, mode: 'breakthrough',
    avoidTypes: [],
    recommendTypes: ['hobby:food', 'range:fixed', 'hobby:game'],
    tip: '为什么做：你每次去便利店买的都是"老几样"——闭眼拿会让你被迫拆盲盒。拿到用不上的东西？那就创造需求——这才是真正的"打开思路"。选一家商品种类多的便利店（推荐：全家或7-11的较大门店，如体育西路站内的全家）。闭眼后在货架上随手拿3样——不要挑，随手抓。如果拿到3包同款薯片——今天你就吃3包薯片',
    steps: [
      '去一家商品丰富的便利店（推荐：天河城负一层的全家或珠江新城地铁站内的7-11）',
      '进店后闭上眼睛，在货架上随手拿3样商品——不准看、不准挑、不准放回去换',
      '睁开眼，看自己拿了什么——不管是什么全部买单，不接受反悔',
      '今天之内必须把这3样东西用掉或吃掉。如果是创可贴，找个"假装受伤"的理由贴上；如果是泡面，今天就吃它。发朋友圈展示"命运的便利店大冒险成果"'
    ]
  },
  {
    id: 'bt058',
    content: '选一个从没去过的地铁出口，开启15分钟冒险',
    type: 'breakthrough', typeColor: '#A55FA5', duration: 30,
    outdoor: true, nightSafe: false, rainy: false,
    requirePOI: null, cost: 3, double: false, mode: 'breakthrough',
    avoidTypes: ['range:fullcity'],
    recommendTypes: ['range:fixed', 'hobby:game', 'hobby:outdoor'],
    tip: '为什么做：每个地铁口通向的世界都不一样——一个编号就是一个平行宇宙。随便选一个没去过的出口，15分钟够你发现一个"如果不是今天永远不会来"的角落。找一个有多个出口的地铁站——推荐公园前站（有近10个出口）或体育西路站。到站后不看出口指示牌，直接选一个没去过的出口编号。出站后沿着那个方向走15分钟',
    steps: [
      '坐地铁到一个有多个出口的站（推荐：公园前站，有A到J共近10个出口）',
      '不看出口指示牌上写的"××路方向"——直接选一个编号最小的你没去过的出口',
      '出站后沿着出口面向的方向直走15分钟——不要看导航、不要转弯',
      '15分钟后停下来的位置，拍一张照片记录"命运的坐标"。然后开导航找到回家的路。你被一个出口编号带到了一个陌生的角落'
    ]
  },
  {
    id: 'bt059',
    content: '问路人"我该去哪"——TA说的就是下一站',
    type: 'breakthrough', typeColor: '#A55FA5', duration: 60,
    outdoor: true, nightSafe: true, rainy: false,
    requirePOI: '广州塔', cost: 5, double: false, mode: 'breakthrough',
    avoidTypes: ['social:extrovert', 'range:fullcity'],
    recommendTypes: ['social:moderate', 'range:fixed', 'hobby:game'],
    tip: '为什么做：你习惯了自己做决定——但一个陌生人的随口一句话，可能会把你带到从没想过的地方。这是"信任陌生人"的一次小练习，也是打破信息茧房的最好方式。在广州塔下的观景平台上找一个看起来悠闲的人——正在拍照的游客或坐在长椅上的本地人最合适。走上前问"您好，我刚到广州不知道去哪里——您能推荐一个地方吗？"TA口中说出的第一个地名就是你的命运目的地',
    steps: [
      '坐APM线到广州塔站B口出，走到广州塔下的观景平台',
      '找一个看起来不算太赶的陌生人——正在拍照或休息的最好',
      '用求助的语气问TA："您好，我刚到这里，不知道接下来该去哪里——您能告诉我一个地方吗？"不管TA说哪个地名，直接记下来',
      '打开导航去TA说的那个地方——到了之后拍一张照片，发朋友圈"广州塔下的陌生人让我来这"'
    ]
  },
  {
    id: 'bt060',
    content: '抽签决定今天"不做"哪件事',
    type: 'breakthrough', typeColor: '#A55FA5', duration: 480,
    outdoor: true, nightSafe: true, rainy: true,
    requirePOI: null, cost: 0, double: false, mode: 'breakthrough',
    avoidTypes: [],
    recommendTypes: ['social:introvert', 'hobby:game', 'range:fixed'],
    tip: '为什么做：习惯是最大的舒适区——而"不做"一件事比"做"一件事更需要勇气。剥夺一个小习惯，你会发现自己对它的依赖有多深。写6个"不做"签：①今天不走电梯只走楼梯 ②今天不说"谢谢"（用"爱你"代替）③今天不看手机地图 ④今天不喝凉水只喝热的 ⑤今天不拒绝任何人的请求 ⑥今天不坐（全程站着）。抽到哪个，今天就要打破这个习惯',
    steps: [
      '准备6张纸条，分别写：①不走电梯 ②不说谢谢 ③不看地图 ④不喝冷的 ⑤不拒绝 ⑥不坐下',
      '闭眼抽一张，抽中的就是今天"禁止做的事"',
      '如果抽到"不说谢谢"——今天就换成说"爱你"来表达感谢。如果抽到"不走电梯"——所有楼层都走楼梯',
      '睡前记录：今天打破习惯最难受的那一刻是什么？你有没有发现自己有多依赖这个习惯？'
    ]
  },

  // ============================================================
  // 类别 4：反向世界（bt061-bt080）
  // 和平时的自己反着来
  // ============================================================
  {
    id: 'bt061',
    content: '今天用非惯用手吃饭，掉了算赢',
    type: 'breakthrough', typeColor: '#A55FA5', duration: 30,
    outdoor: false, nightSafe: true, rainy: true,
    requirePOI: null, cost: 0, double: false, mode: 'breakthrough',
    avoidTypes: [],
    recommendTypes: ['hobby:food', 'range:fixed', 'hobby:game'],
    tip: '为什么做：你用惯用手吃饭了几十年——换一只手，你会发现连"把饭送到嘴里"都需要重新学习。这种笨拙感让你重新体会"学习"本身。选一顿你在家吃的饭来练习，不要第一次就在高级餐厅尝试。如果是在外面吃，点一份用勺子吃的食物（粥/饭/汤粉）降低难度。筷子掉地上不是失败——是节目效果',
    steps: [
      '在吃饭前确认：如果你是右撇子，今天三餐所有餐具都用左手',
      '第一口最难受——可能会夹不起来菜、喝汤会抖。坚持住，不要换回惯用手',
      '如果掉筷子或打翻东西——笑出声来，拍照记录这个"狼狈瞬间"',
      '吃完后录一段30秒的"非惯用手挑战感言"，发朋友圈展示你的"残障级别吃饭技术"'
    ]
  },
  {
    id: 'bt062',
    content: '找一个导购，认真夸TA一句',
    type: 'breakthrough', typeColor: '#A55FA5', duration: 5,
    outdoor: true, nightSafe: false, rainy: true,
    requirePOI: null, cost: 0, double: false, mode: 'breakthrough',
    avoidTypes: ['social:extrovert'],
    recommendTypes: ['social:introvert', 'range:fixed'],
    tip: '为什么做：你习惯了不说话——但一句真诚的夸奖可以点亮一个陌生人的一天，同时也会点亮你自己。夸人是不需要理由的，需要的是勇气。导购员是"接受夸奖训练有素"的职业——你夸TA，TA会更开心地回夸你。在天河城或正佳广场里，找一个看起来心情不错的导购（在整理衣服而不是玩手机的）。走过去，看着TA的眼睛说这句夸奖',
    steps: [
      '在天河城或正佳广场找一家服装或美妆店，选一个看起来不太忙的导购',
      '走到TA面前，不要看商品，直接看着TA的眼睛说："您好，我想跟您说——您今天的妆画得真好，很衬您。"（如果是男导购就夸穿搭）',
      '不管TA怎么回应——微笑道谢，然后说"没事我就是想告诉您一声，祝您今天开心"',
      '走出店门后——你刚刚把一个陌生人今天的心情点亮了。最重要的是，你做了"平时的你不会做的事"'
    ]
  },
  {
    id: 'bt063',
    content: '走路慢下来，每一步都踩在地砖格子里',
    type: 'breakthrough', typeColor: '#A55FA5', duration: 15,
    outdoor: true, nightSafe: false, rainy: false,
    requirePOI: null, cost: 0, double: false, mode: 'breakthrough',
    avoidTypes: [],
    recommendTypes: ['social:introvert', 'range:fixed', 'hobby:game'],
    tip: '为什么做：你走路永远在赶时间——慢下来你会发现这条走了几百次的路，你从未真正看过它。每一步踩进格子里，像回到小时候玩"不能踩缝"游戏。从体育西路地铁站C口走到天河城正门大约300米——平时走路3分钟，今天走15分钟。把每一步都踩在地砖的格子里，像小时候玩"不能踩缝"游戏一样。你会注意到平时完全忽略的街景',
    steps: [
      '从体育西路地铁站C口出站，面向天河城方向站定',
      '刻意放慢速度——用你平时散步速度的一半来走，每一步都踩在人行道地砖的格子里',
      '边走边观察三样平时从没注意过的东西：①头顶有什么招牌 ②地上有什么图案 ③身边的行人在做什么表情',
      '走到天河城门口后，在备忘录里记下刚才观察到的3个细节。你发现了吗？走慢的时候世界会露出更多细节'
    ]
  },
  {
    id: 'bt064',
    content: '平时不打扮？今天全妆出门逛东山口',
    type: 'breakthrough', typeColor: '#A55FA5', duration: 60,
    outdoor: true, nightSafe: false, rainy: false,
    requirePOI: null, cost: 0, double: false, mode: 'breakthrough',
    avoidTypes: [],
    recommendTypes: ['social:introvert', 'range:fixed', 'hobby:art'],
    tip: '为什么做：你不打扮不是因为不好看——是因为"没必要"。今天给自己一个"有必要"的理由，你会发现镜子里还有一个你没见过的自己。不用买新化妆品——找朋友借或去丝芙兰试妆。东山口有很多咖啡店和红砖老洋房，随便一站都是出片背景。重点不是"化得多好"，而是"我做了平时不会做的事"',
    steps: [
      '在家花30分钟做一件你平时不会做的事：女生可以化全妆（底妆+眼影+口红），男生可以抓头发+喷香水+穿衬衫',
      '坐地铁1号线或6号线到东山口站E口出，走到恤孤院路和培正路一带',
      '在东山口的老洋房和咖啡店之间逛30分钟——不要躲镜头，让朋友帮你拍几张"今天的我"',
      '发朋友圈对比"平时的我vs今天的我"。你会发现——不是"不好看"，只是"平时懒得"'
    ]
  },
  {
    id: 'bt065',
    content: '平时精致？今天素颜逛正佳',
    type: 'breakthrough', typeColor: '#A55FA5', duration: 30,
    outdoor: true, nightSafe: false, rainy: true,
    requirePOI: null, cost: 0, double: false, mode: 'breakthrough',
    avoidTypes: [],
    recommendTypes: ['social:moderate', 'range:fixed'],
    tip: '不化妆、不抓头发、不挑衣服——穿最舒服的那套旧衣服出门。正佳广场人多，没人会注意你今天穿什么。重点是体验"不被注视"的感觉——你会发现，原来不被看的时候，自己反而更轻松',
    steps: [
      '今天出门前不做任何"变美"动作——不化妆、不弄头发、穿最旧最舒服的那套衣服',
      '坐地铁到体育中心站D3口出，进正佳广场正常逛30分钟',
      '经过那些平时你会认真照镜子的玻璃橱窗时——不要躲，站定看一眼素颜的自己，笑一下',
      '30分钟后，记录一个感受：今天有人因为你"不够好看"而多看你一眼吗？大概率没有。你一直以为的"必须精致"——可能只是你自己的设定'
    ]
  },
  {
    id: 'bt066',
    content: '平时说方言？今天全天说普通话',
    type: 'breakthrough', typeColor: '#A55FA5', duration: 480,
    outdoor: true, nightSafe: true, rainy: true,
    requirePOI: null, cost: 0, double: false, mode: 'breakthrough',
    avoidTypes: [],
    recommendTypes: ['social:moderate', 'range:fixed', 'hobby:game'],
    tip: '为什么做：语言是你思维的外壳——换一种语言说话，你会发现自己的表达方式、甚至思考方式都在悄悄改变。这是一次"语言人格切换"实验。广东人平时说粤语/潮汕话/客家话的最适合这个挑战。今天所有的对话——包括和爸妈打电话、和菜市场老板砍价——都用标准普通话说。你会发现切换语言时脑子要转个弯',
    steps: [
      '早上醒来第一个念头就告诉自己：今天是"普通话日"，不切换任何方言',
      '如果平时和爸妈说家乡话——今天打电话也用普通话，看他们什么反应（大概率会笑你）',
      '和菜市场老板砍价时用标准普通话说："老板这个怎么卖？能不能便宜一点？"——老板可能会抬头多看你一眼',
      '睡前录一段语音，用方言说一遍今天发生的事——然后对比说普通话的自己。你发现了自己的"语言人格切换"'
    ]
  },
  {
    id: 'bt067',
    content: '平时说普通话？今天用粤语去砍价',
    type: 'breakthrough', typeColor: '#A55FA5', duration: 30,
    outdoor: true, nightSafe: false, rainy: false,
    requirePOI: null, cost: 20, double: false, mode: 'breakthrough',
    avoidTypes: ['social:extrovert'],
    recommendTypes: ['social:moderate', 'range:fixed', 'hobby:food'],
    tip: '为什么做：广州的灵魂藏在粤语里——用本地人的语言和档主交流，你不再是"游客"，而是"自己人"。发音不标准没关系，档主的笑容就是你的奖励。提前学三句粵语：①"几钱啊？"（多少钱）②"平D啦"（便宜点）③"好贵啊"（好贵啊）。上下九的档主听到你蹩脚的粤语会笑着配合你——这就是广州的包容',
    steps: [
      '提前用手机学三句粤语：①"几钱啊？"②"平D啦"③"好贵啊，平D啦老细"',
      '坐地铁6号线到文化公园站E口出，走到上下九步行街',
      '随便走进一家卖衣服或小吃的店，用你刚学的蹩脚粤语问价和砍价——不管发音标不标准，说出来就算赢',
      '砍价成功或失败都拍一张战利品照片。你今天用一门"刚学的语言"挑战了广州最会砍价的老板们'
    ]
  },
  {
    id: 'bt068',
    content: '主动和陌生人拼桌吃饭',
    type: 'breakthrough', typeColor: '#A55FA5', duration: 30,
    outdoor: false, nightSafe: false, rainy: true,
    requirePOI: null, cost: 35, double: false, mode: 'breakthrough',
    avoidTypes: ['social:extrovert'],
    recommendTypes: ['social:introvert', 'range:fixed'],
    tip: '为什么做：一个人吃饭很自在，但偶尔和陌生人拼一桌——你会发现"你好""慢用"这两句话，就是社交最舒适的距离。不一定要聊天，坐在一起吃饭本身就是一种陪伴。正佳广场B1层的大食代是"拼桌文化"最盛行的地方——饭点人多的时候，拼桌是常态而不是奇怪的事。找一桌只有2个人但有4个座位的桌子，对方大概率会说"没人，坐吧"',
    steps: [
      '在正佳广场B1大食代点一份套餐（约30-40元），端着餐盘找座位',
      '找一张4人桌但只有1-2个人坐的桌子，有礼貌地问："您好，这里有人吗？我可以坐这里吗？"',
      '坐下后正常吃饭——不用强行聊天，但如果对方先搭话就自然回应。重点是"你选择了坐在陌生人旁边"',
      '吃完后对同桌的人说一句"慢用"或"祝你好胃口"。你今天完成了一个"独食者"的社交突破'
    ]
  },
  {
    id: 'bt069',
    content: '主动帮陌生人做一件事',
    type: 'breakthrough', typeColor: '#A55FA5', duration: 10,
    outdoor: true, nightSafe: false, rainy: true,
    requirePOI: null, cost: 0, double: false, mode: 'breakthrough',
    avoidTypes: ['social:extrovert'],
    recommendTypes: ['social:introvert', 'range:fixed'],
    tip: '为什么做：你总怕"麻烦别人"，但帮别人不需要理由。一次主动帮助不会改变世界，但会改变你对自己的认知——"原来我也可以是被需要的人"。在地铁站或商场里最容易找到"可以帮的忙"：有人在看地图时上前问"您需要帮忙吗"、有人东西掉了帮TA捡、有人提着重物帮TA开门。关键是要"主动"——看到可能需要帮助的瞬间就要行动',
    steps: [
      '去一个人流量大的公共空间（推荐：体育西路地铁站内或天河城一楼中庭）',
      '观察3分钟——找那个看起来"可能需要帮助"的人：在看地图的游客、提着大包小包的人、推婴儿车的家长',
      '走上前问："您好，需要帮忙吗？"——如果TA说不用，就微笑说"好的，那祝您顺利"；如果说用，就帮TA',
      '帮完之后，在心里给自己加一分。你今天从"怕麻烦"变成了"主动帮忙"的人——哪怕只有一次'
    ]
  },
  {
    id: 'bt070',
    content: '能躺绝不坐？今天去跑200米',
    type: 'breakthrough', typeColor: '#A55FA5', duration: 10,
    outdoor: true, nightSafe: false, rainy: false,
    requirePOI: null, cost: 0, double: false, mode: 'breakthrough',
    avoidTypes: ['sport:never'],
    recommendTypes: ['sport:occasional', 'range:fixed', 'hobby:sport'],
    tip: '为什么做：你和"运动"之间的距离，不是体能，是"站起来"的那个动作。200米只需要45秒——你刷一条短视频的时间，足够跑完和惰性的第一次对决。天河体育中心的副田径场对外开放，跑道一圈400米。你只需要跑半圈——200米，正常人快走的速度都能在45秒内完成。跑完你可以在朋友圈写"今天我跑了200米，人生第一次主动跑步"',
    steps: [
      '坐地铁1号线到体育中心站C口出，走到天河体育中心副田径场',
      '在跑道起点站定，打开手机计时器——目标只有200米（标准跑道半圈）',
      '跑起来——不管多慢，不能停、不能走。200米后停下来，大口呼吸',
      '拍一张跑道照片，配文："200米，是今天我和惰性的距离。"——你可能从此发现跑步没有想象中那么可怕'
    ]
  },
  {
    id: 'bt071',
    content: '奶茶不离手？今天只喝白开水',
    type: 'breakthrough', typeColor: '#A55FA5', duration: 480,
    outdoor: true, nightSafe: true, rainy: true,
    requirePOI: null, cost: 0, double: false, mode: 'breakthrough',
    avoidTypes: [],
    recommendTypes: ['hobby:food', 'range:fixed', 'hobby:game'],
    tip: '为什么做：奶茶不是水，是液态甜品——你的身体可能已经忘了"真正的口渴"是什么感觉。24小时给味蕾放个假，你会重新尝到水的甜。不是让你戒奶茶一辈子——只是今天24小时不喝任何含糖饮料。想喝奶茶的时候，买一杯纯茶或无糖的乌龙茶。去奶茶店门口拍一张"我今天只喝水"的照片——会有种微妙的叛逆感',
    steps: [
      '今天早上出门前立下规矩：24小时内不喝任何奶茶、果汁、可乐等含糖饮料',
      '如果路过奶茶店想喝——走进去点一杯纯茶或无糖饮料，在店门口拍一张"今天的我"的照片',
      '当你的手习惯性想点外卖奶茶的时候——停下来喝一大口白开水',
      '睡前记录：今天省了多少糖？想喝奶茶的欲望来了几次？远离糖分的一天你的情绪有什么变化？'
    ]
  },
  {
    id: 'bt072',
    content: '平时不爱拍照？今天拍满50张',
    type: 'breakthrough', typeColor: '#A55FA5', duration: 60,
    outdoor: true, nightSafe: true, rainy: false,
    requirePOI: null, cost: 0, double: false, mode: 'breakthrough',
    avoidTypes: [],
    recommendTypes: ['social:introvert', 'hobby:art', 'range:fixed', 'hobby:game'],
    tip: '为什么做：不拍照不是因为"没什么好拍"——是因为你从没认真看过周围。当你逼自己凑满50张，你会从"寻找"变成"发现"——原来广州的每个角落都在对你讲故事。从广州塔沿着珠江走到花城广场大约1.5公里，沿途有足够的素材拍50张。拍什么都可以：地砖的纹理、路人的鞋、天空的云、建筑的倒影——重点是"数量"，不是质量',
    steps: [
      '从APM线广州塔站出站，沿着珠江步行道往花城广场方向走',
      '打开手机相机——拍任何你看到的东西：地面、天空、建筑、行人、灯光、自己的影子',
      '走完广州塔-花城广场这段路（约1.5公里），凑满50张。不要删——不好的也留着',
      '回家后从50张里选出最满意的3张发朋友圈，配文"今天我拍了50张照片，选出了3张——有些视角，不拍就永远不会看到"'
    ]
  },
  {
    id: 'bt073',
    content: '平时凌晨才睡？今晚9点关灯上床',
    type: 'breakthrough', typeColor: '#A55FA5', duration: 180,
    outdoor: false, nightSafe: true, rainy: true,
    requirePOI: null, cost: 0, double: false, mode: 'breakthrough',
    avoidTypes: [],
    recommendTypes: ['social:introvert', 'range:fixed'],
    tip: '为什么做：熬夜是你和"今天的自己"不想告别的表现——但早睡是你能给"明天的自己"最好的礼物。在黑暗中安静躺着，你会听到久违的自己的声音。这个挑战最难的不是"早睡"——而是"面对安静的房间和你自己的思绪"。21:00关灯后不碰手机，你会听到平时被忽略的声音：冰箱的嗡鸣、窗外的风声、你自己的呼吸声',
    steps: [
      '今晚20:30开始准备：洗澡、关掉大灯、调暗手机屏幕',
      '21:00整——关灯、把手机放到伸手够不到的地方、躺下',
      '如果睡不着——不要拿手机！盯着天花板，听窗外的声音。想想你今天做的事、明天想做的事。睡不着也没关系——躺着的本身就是挑战',
      '明天起床后记录：你几点睡着的？睡前想了些什么？你有多久没有在黑暗中安静地和自己待着了？'
    ]
  },
  {
    id: 'bt074',
    content: '平时拒绝社交？今天去参加免费活动',
    type: 'breakthrough', typeColor: '#A55FA5', duration: 60,
    outdoor: true, nightSafe: false, rainy: true,
    requirePOI: null, cost: 0, double: false, mode: 'breakthrough',
    avoidTypes: ['social:extrovert'],
    recommendTypes: ['social:introvert', 'range:fixed', 'hobby:reading'],
    tip: '为什么做：你拒绝的不是社交——是"被期待要和人说话"的压力。但参加活动不等于要社交，你只需要"出现在那里"。在人群中安静地待着，本身就是一种参与。在广州找免费活动很容易：方所或1200bookshop经常有免费讲座、广东省博物馆免费入馆、二沙岛周末早晨有公益晨练。选一个你感兴趣的——不用社交，你只需要"出现在那里"',
    steps: [
      '在大众点评或小红书上搜"广州 免费活动 今天"——找到任何一个免费的公开活动（展览/讲座/市集/晨练）',
      '出发去那个活动场地——推荐广东省博物馆（珠江新城）或方所书店（太古汇），这两个地方几乎每天都有免费活动',
      '到了之后不需要和任何人交谈——你只需要出现在那里，待满40分钟',
      '离开时在门口拍一张照片，配文"今天我去了一个全是陌生人的地方——我只是待在那里，就已经赢了"'
    ]
  },
  {
    id: 'bt075',
    content: '口头禅是"随便"？今天全部自己决定',
    type: 'breakthrough', typeColor: '#A55FA5', duration: 480,
    outdoor: true, nightSafe: true, rainy: true,
    requirePOI: null, cost: 0, double: false, mode: 'breakthrough',
    avoidTypes: ['social:extrovert'],
    recommendTypes: ['social:introvert', 'range:fixed'],
    tip: '为什么做："随便"不是随和，是逃避做决定。今天逼自己每次在3秒内给出答案——你会发现自己其实很有主见，只是太习惯让别人选了。今天无论谁问你"你想吃什么/去哪/看什么"——不准说"随便"或"你定"。你必须给出一个具体答案。如果不知道选什么，就选第一个跳进你脑子里的——不要犹豫、不要改',
    steps: [
      '今天立下规矩：绝不说"随便""都行""你定"这三个词',
      '如果有人问你意见——你必须在3秒内做出决定。问"吃什么"就说具体的菜名而不是"随便"',
      '连出门前穿什么、走哪条路到地铁站——都自己做决定，不许犹豫',
      '睡前写下"今天我做了哪些决定"。你会发现——原来做决定没有想象中那么可怕，而且"我选的"比"别人选的"吃起来更香'
    ]
  },
  {
    id: 'bt076',
    content: '平时坐地铁？今天从体育西走到广州塔',
    type: 'breakthrough', typeColor: '#A55FA5', duration: 40,
    outdoor: true, nightSafe: false, rainy: false,
    requirePOI: null, cost: 0, double: false, mode: 'breakthrough',
    avoidTypes: ['sport:never'],
    recommendTypes: ['sport:occasional', 'range:fixed', 'hobby:outdoor'],
    tip: '为什么做：你坐了几百次APM从体育西到广州塔，但从未看过这条线上的风景。有些路不是用来"到达"的，是用来"走"的——3.5公里，换一个视角看广州。从体育西路到广州塔约3.5公里——走APM线的路线，沿着花城广场一直往南。沿途经过天河城、花城广场、海心沙、珠江——这条路是广州最美的步行路线之一，你平时坐地铁完美错过了它',
    steps: [
      '从体育西路地铁站C口出发，往正佳广场方向走——今天不开导航，沿着花城广场一直往南走',
      '经过花城广场时停下来拍一张广州中轴线的全景——你平时坐地铁根本看不到这个视角',
      '经过海心沙时在江边站3分钟——看对岸的广州塔亮起来了',
      '走到广州塔站或广州塔底下拍一张终点照。你花了40分钟走的路，地铁只要6分钟——但在地铁里看不到的东西，今天你都看到了'
    ]
  },
  {
    id: 'bt077',
    content: '对每个服务人员微笑说谢谢',
    type: 'breakthrough', typeColor: '#A55FA5', duration: 480,
    outdoor: true, nightSafe: true, rainy: true,
    requirePOI: null, cost: 0, double: false, mode: 'breakthrough',
    avoidTypes: ['social:extrovert'],
    recommendTypes: ['social:introvert', 'range:fixed'],
    tip: '为什么做：情绪不外露不等于没有情绪——今天试着把温暖释放出来。对每一个服务你的人说谢谢，你给出去的不是礼貌，是一整天的好心情，包括你自己的。今天你就是"广州最礼貌的人"：对便利店收银员说谢谢、对地铁安检员点头微笑、对公交车司机说"师傅辛苦了"、对餐厅服务员说"菜很好吃"。一开始会觉得尴尬——多试几次就自然了',
    steps: [
      '早上出门就进入"超级礼貌模式"——对遇到的第一个服务人员（小区保安/早餐店老板）大声说"早上好！"',
      '今天对每个为你服务的人都说"谢谢"——不是敷衍的那种，是停下来看着对方眼睛说的那种',
      '对餐厅服务员加一句"今天的菜很好吃"，对出租车/网约车司机加一句"谢谢您，辛苦了"',
      '睡前统计：今天说了多少次谢谢？对方最惊喜的一次回应是什么？你发现了吗——让人开心的时候，你自己也会开心'
    ]
  },
  {
    id: 'bt078',
    content: '只喝热饮？今天点一杯加冰的',
    type: 'breakthrough', typeColor: '#A55FA5', duration: 10,
    outdoor: false, nightSafe: true, rainy: true,
    requirePOI: null, cost: 20, double: false, mode: 'breakthrough',
    avoidTypes: [],
    recommendTypes: ['hobby:food', 'range:fixed', 'hobby:game'],
    tip: '为什么做：你的保温杯里装的不只是热饮——是"我只喝热的一切"的习惯。打破它只需要一杯冰饮的钱，和一个"试试不一样"的决定。如果你平时只喝热饮（热水、热茶、热咖啡），今天彻底反过来——点一杯加冰的柠檬茶或冰美式。喝着冰饮料走在广州的夏天里，你会发现"原来冰的也挺好"',
    steps: [
      '在天河南一路或六运小区找一家你平时会去的奶茶/咖啡店',
      '点一杯你平时绝对不会点的冰饮——如果平时只喝热拿铁，今天就点冰拿铁；如果平时喝热茶，今天就点冻柠茶',
      '拿着冰饮穿过六运小区的巷子走回体育西路方向——感受冰凉的杯壁和广州闷热的空气之间的反差',
      '喝完后在店门口拍一张空杯照片，配文"我背叛了我的保温杯"'
    ]
  },
  {
    id: 'bt079',
    content: '只坐电梯？今天全程走楼梯',
    type: 'breakthrough', typeColor: '#A55FA5', duration: 10,
    outdoor: false, nightSafe: true, rainy: true,
    requirePOI: null, cost: 0, double: false, mode: 'breakthrough',
    avoidTypes: ['sport:never'],
    recommendTypes: ['sport:occasional', 'range:fixed', 'hobby:sport'],
    tip: '为什么做：你选电梯是因为"省力"——但你省下的那点力气，换来的是每天少得可怜的运动量。走楼梯快则快矣，还能让你在被动运动中找到"原来我不需要电梯"的自信。公园前站是1号线和2号线的换乘站，楼梯非常多。今天从站台到出口全程走楼梯——不坐扶梯、不坐垂直电梯。你会发现：走楼梯比等扶梯更快',
    steps: [
      '坐地铁到公园前站，走到1号线和2号线的换乘通道',
      '看到扶梯不要上——找到旁边的楼梯，走上去',
      '从站台到站厅全程走楼梯——出站也走楼梯。今天所有的垂直移动都靠自己的双腿',
      '出站后回头看一眼你爬上来的楼梯——你刚刚用"最原始的方式"完成了今天的运动量'
    ]
  },
  {
    id: 'bt080',
    content: '对每个经过的店员微笑点头',
    type: 'breakthrough', typeColor: '#A55FA5', duration: 20,
    outdoor: false, nightSafe: true, rainy: true,
    requirePOI: null, cost: 0, double: false, mode: 'breakthrough',
    avoidTypes: ['social:extrovert'],
    recommendTypes: ['social:introvert', 'range:fixed', 'hobby:art'],
    tip: '为什么做：你逛商场时总是"专心走路、目视前方"——今天试试把视线抬起来，对每个对上眼的店员微笑点头。你不需要买东西，但可以带走一整天的好心情——他们和你都是。K11是广州设计最艺术的商场，店员也相对年轻友好。今天你逛商场的目的不是买东西——是"散发善意"。对每个和你有眼神接触的店员点头微笑——不多做停留，微笑了就走',
    steps: [
      '坐地铁3号线或APM线到珠江新城站或花城大道站，走到K11购物艺术中心',
      '从大门进入后放慢脚步——不再像平时一样"目不斜视"地走过店铺',
      '经过每一家店时，如果和店员的视线对上了——停下来半秒，微笑点头。不需要说话，一个点头就够了',
      '逛完3层楼后离开。你今天的角色不是"消费者"——你是"微笑大使"。有人可能因为你这个点头而有了一天的好心情'
    ]
  },

  // ============================================================
  // 类别 5：极限忍耐（bt081-bt100）
  // 和自己对抗
  // ============================================================
  {
    id: 'bt081',
    content: '把所有吐槽换成"有意思"三个字说出来',
    type: 'breakthrough', typeColor: '#A55FA5', duration: 480,
    outdoor: true, nightSafe: true, rainy: true,
    requirePOI: null, cost: 0, double: false, mode: 'breakthrough',
    avoidTypes: [],
    recommendTypes: ['social:moderate', 'range:fixed', 'hobby:game'],
    tip: '为什么做：当坏事发生时换个词说出来，情绪真的会不一样。"有意思"这三个字有魔力——说多了，连你自己都会相信事情没那么糟。不管今天遇到什么破事——手机掉地上说"有意思"、地铁挤不上说"有意思"、外卖送晚了说"有意思"。你会发现：换一个词，情绪真的会不一样。嘴上说着"有意思"，心里慢慢也觉得"确实有点意思"',
    steps: [
      '今天设定一个规则：任何想吐槽、抱怨、骂人的瞬间——全部替换成"有意思"三个字',
      '早上通勤遇到第一件烦心事时，试着说一次"有意思"——感受一下和平时正常吐槽的差别',
      '每次想说"烦死了""好气啊""无语"的时候，都换成"有意思"——说得越多越顺',
      '睡前总结：今天说了多少次"有意思"？哪一次最难忍？你有没有发现——语言反过来在影响你的情绪'
    ]
  },
  {
    id: 'bt082',
    content: '把手机调到灰度模式用一天',
    type: 'breakthrough', typeColor: '#A55FA5', duration: 480,
    outdoor: true, nightSafe: true, rainy: true,
    requirePOI: null, cost: 0, double: false, mode: 'breakthrough',
    avoidTypes: ['hobby:game'],
    recommendTypes: ['hobby:reading', 'hobby:art', 'hobby:outdoor', 'range:fixed'],
    tip: '为什么做：去掉颜色的手机就像去掉滤镜的生活，你会发现自己刷手机的时长明显缩短——原来吸引你的不全是内容，还有色彩。iPhone路径：设置-辅助功能-显示与文字大小-色彩滤镜-灰度。安卓路径：设置-开发者选项-模拟色彩空间-全色盲。当你刷短视频时画面变黑白——你会发现内容本身才是吸引力的来源，不是颜色',
    steps: [
      '早上醒来第一件事：打开手机设置，把屏幕显示模式调成"灰度"',
      '今天一整天正常使用手机——但所有画面都是黑白的',
      '注意每次打开手机时你的第一反应——看照片没颜色、刷视频没颜色、点外卖看菜品的颜色被剥夺了',
      '睡前决定是否调回彩色。记录一下：今天你刷手机的时长变短了还是变长了？灰度模式是不是让你觉得"手机没那么好玩了"？'
    ]
  },
  {
    id: 'bt083',
    content: '一整天不刷短视频——抖音小红书全划走',
    type: 'breakthrough', typeColor: '#A55FA5', duration: 480,
    outdoor: true, nightSafe: true, rainy: true,
    requirePOI: null, cost: 0, double: false, mode: 'breakthrough',
    avoidTypes: ['hobby:game'],
    recommendTypes: ['hobby:reading', 'hobby:sport', 'hobby:art', 'hobby:outdoor'],
    tip: '为什么做：短视频刷走了你的时间，也刷走了你的注意力。今天试试不刷短视频，你会发现——原来一天可以这么长，原来专注的感觉这么好。不用卸载APP——就是"不刷"。刷到短视频页面就立刻划过，切换成长文章或图片内容。今天的娱乐时间只能用来看长内容：一篇公众号文章、一部电影、一本书。你可能会发现——你刷短视频只是因为"手指习惯"',
    steps: [
      '今天定一个规则：任何竖屏短视频内容都不能观看超过5秒',
      '每次打开抖音/小红书/B站时，如果自动播放了短视频——立刻划过或关掉',
      '想刷短视频的冲动来了怎么办？①打开一个播客 ②看一篇长文章 ③出门走5分钟',
      '睡前统计今天看短视频的总时长——目标是"0分钟"。如果做到了，奖励自己一件事；如果没做到，明天再挑战一次'
    ]
  },
  {
    id: 'bt084',
    content: '今天禁止说"但是"——全部换成"而且"',
    type: 'breakthrough', typeColor: '#A55FA5', duration: 480,
    outdoor: true, nightSafe: true, rainy: true,
    requirePOI: null, cost: 0, double: false, mode: 'breakthrough',
    avoidTypes: ['social:extrovert'],
    recommendTypes: ['social:introvert', 'social:moderate', 'range:fixed'],
    tip: '为什么做："但是"是沟通中的隐形墙，它否定了前面的一切。换成"而且"之后，你会发现对话从"对，但是……"变成了"对，而且……"——路越走越宽。今天每次想说"但是"的时候——停一秒，换成"而且"。',
    steps: [
      '今天立一个规矩：绝对不说"但是"这个词——一次都不行',
      '每次想说"但是"的时候——换成"而且"。比如"我想去，但是没时间"改成"我想去，而且我会找时间"',
      '如果对方说了"但是"——你也不要用，坚持用"而且"来回应',
      '睡前复盘：今天说了多少次"而且"？有没有哪个时刻特别想说"但是"？你发现了吗——换了一个词，好像所有的路都从"死路"变成了"还有可能"'
    ]
  },
  {
    id: 'bt085',
    content: '一整天不抱怨任何事',
    type: 'breakthrough', typeColor: '#A55FA5', duration: 480,
    outdoor: true, nightSafe: true, rainy: true,
    requirePOI: null, cost: 0, double: false, mode: 'breakthrough',
    avoidTypes: [],
    recommendTypes: ['social:moderate', 'range:fixed', 'hobby:game'],
    tip: '为什么做：抱怨不会让事情变好，但不抱怨会让你变强。今天遇到不顺心的事，要么解决它，要么接受它——就是不许说负能量的话。不准抱怨包括：不准说"好热""好累""好烦""恶心""无语""受不了"等所有负面表达。如果地铁挤——那就挤着，不要说话。如果天气热——那就出汗，不要说话。关键不是改变环境——是改变你对环境的反应',
    steps: [
      '今天的规则很简单——不说任何抱怨的话，包括语气词和叹气',
      '每次遇到让你想抱怨的事——深呼吸一次，然后要么动手解决它，要么闭嘴接受它',
      '如果实在憋不住——在心里默念"这就是生活"然后咽回去',
      '睡前记录：今天忍住了几次抱怨？有没有哪个瞬间你觉得"不抱怨好像也没那么糟"？你发现了吗——抱怨不会让事情变好，但不抱怨会让你变强'
    ]
  },
  {
    id: 'bt086',
    content: '在洗手间隔间里对着镜子练习微笑50次',
    type: 'breakthrough', typeColor: '#A55FA5', duration: 10,
    outdoor: false, nightSafe: true, rainy: true,
    requirePOI: null, cost: 0, double: false, mode: 'breakthrough',
    avoidTypes: ['social:extrovert'],
    recommendTypes: ['social:introvert', 'range:fixed', 'hobby:game'],
    tip: '为什么做：微笑是可以练习的。第10次和第40次的微笑一定不一样——在50次微笑里找到你最喜欢的那一个表情，记住它，以后真的笑不出来的时候就用它。太古汇的洗手间照明最好、私密性最强，最不容易被打扰。站在镜子前，微笑50次——不是"茄子"式假笑，而是尝试不同的角度、不同的弧度的微笑。第10次和第40次的笑一定不一样',
    steps: [
      '去太古汇的洗手间（推荐二楼或三楼，层数越高人越少）',
      '进入其中一个隔间，锁好门。站在镜子前（太古汇的洗手台很大），深呼吸',
      '开始数——1到50——每数一个数字就换一个微笑方式：露齿的、不露齿的、眯眼的、挑眉的、歪头的',
      '找到第50次微笑时你最喜欢的那一个表情——记住它。这就是你今天"练习微笑"的最大收获'
    ]
  },
  {
    id: 'bt087',
    content: '今天只喝白开水和无糖茶——戒糖饮一天',
    type: 'breakthrough', typeColor: '#A55FA5', duration: 480,
    outdoor: true, nightSafe: true, rainy: true,
    requirePOI: null, cost: 0, double: false, mode: 'breakthrough',
    avoidTypes: [],
    recommendTypes: ['hobby:food', 'range:fixed', 'hobby:sport'],
    tip: '为什么做：你的"糖瘾"通常会在下午3-4点发作。今天试试不碰含糖饮料，看看自己到底是被生理需要驱动，还是被习惯驱动。含糖饮料包括：奶茶、可乐、果汁、含糖咖啡、运动饮料。可以喝：白开水、无糖乌龙茶、无糖美式、气泡水。通常"糖瘾"会在下午3-4点发作——那时候最想点一杯奶茶',
    steps: [
      '今天所有的饮品选择标准只有一个——不加糖：白开水、矿泉水、无糖茶、无糖美式',
      '如果下午3点你的大脑开始发出"想喝甜的"信号——喝一大口白水，等5分钟再决定',
      '如果实在忍不住想喝——点一杯无糖的饮料（无糖柠檬茶或无糖拿铁），不要加代糖',
      '睡前记录：今天是"零糖"或者"近零糖"的一天。你有多久没有过"不摄入任何加工糖分"的一天了？'
    ]
  },
  {
    id: 'bt088',
    content: '一整天不吃零食——三餐之外嘴不能动',
    type: 'breakthrough', typeColor: '#A55FA5', duration: 480,
    outdoor: true, nightSafe: true, rainy: true,
    requirePOI: null, cost: 0, double: false, mode: 'breakthrough',
    avoidTypes: [],
    recommendTypes: ['hobby:food', 'hobby:sport', 'range:fixed'],
    tip: '为什么做：很多"想吃"其实是"嘴巴寂寞"而不是真的饿。今天三餐正常吃，三餐之外不吃任何零食——你会分清楚"饿"和"馋"的区别。三餐正常吃——吃饱。三餐之间除了白开水/无糖茶，不吃任何东西。薯片、饼干、坚果、水果（含糖）都算零食。如果你的手会习惯性地伸向零食袋——那就是"无聊式进食"在发作',
    steps: [
      '今天三餐正常吃、吃饱——但三餐之外不吃任何零食',
      '当你想伸手拿零食的时候——停下来问自己：我是饿了，还是只是嘴巴寂寞？',
      '如果只是嘴巴寂寞——喝一口水，或者站起来走一走。5分钟后那个"想吃"的冲动就会过去',
      '睡前记录：今天忍住了几次"想伸手拿零食"的冲动？空腹感vs嘴巴寂寞感——你今天分清楚了吗？'
    ]
  },
  {
    id: 'bt089',
    content: '一整天保持抬头挺胸不驼背',
    type: 'breakthrough', typeColor: '#A55FA5', duration: 480,
    outdoor: true, nightSafe: true, rainy: true,
    requirePOI: null, cost: 0, double: false, mode: 'breakthrough',
    avoidTypes: [],
    recommendTypes: ['sport:occasional', 'range:fixed'],
    tip: '为什么做：体态影响心态——抬头挺胸的时候，你连说话都更有底气。在手腕上套一根橡皮筋，每次发现驼背就弹一下，这是最有效的体态矫正方法。在手腕上套一根橡皮筋或发圈。每次发现自己在驼背——就轻轻弹一下手腕（不疼，但记得住）。这个叫"行为标记法"——用一个物理刺激提醒自己纠正姿势。第一天你可能要弹几十次',
    steps: [
      '在手腕上套一根橡皮筋或发圈——今天它是你的"体态警报器"',
      '今天每次发现自己驼背、耸肩、脖子前伸的时候——弹一下手腕上的橡皮筋',
      '同时立刻坐直或站直：下巴微收、肩膀后沉、挺胸、头顶向上延伸',
      '睡前看手腕上的橡皮筋痕迹——你今天"被提醒"了多少次？明天这个数字会不会少一点？'
    ]
  },
  {
    id: 'bt090',
    content: '一整天不"摸鱼"——严格执行番茄钟',
    type: 'breakthrough', typeColor: '#A55FA5', duration: 480,
    outdoor: true, nightSafe: true, rainy: true,
    requirePOI: null, cost: 0, double: false, mode: 'breakthrough',
    avoidTypes: [],
    recommendTypes: ['range:fixed', 'hobby:reading', 'hobby:game'],
    tip: '为什么做：25分钟专注+5分钟休息，这是被验证过最高效的工作节奏。试试看，专注的时候效率高得吓人——而那些"必须"的摸鱼时间，其实根本不必要。用手机上的番茄钟APP，设定25分钟专注+5分钟休息。专注期间不能碰手机、不能切网页、不能做任何和工作/学习无关的事。5分钟休息时可以站起来走走、喝水、看窗外',
    steps: [
      '早上开始工作时打开番茄钟APP，设定25分钟倒计时',
      '这25分钟内只做当前最重要的那一件事——不摸手机、不回微信、不刷网页',
      '25分钟到了——休息5分钟：站起来、喝水、看窗外、做几个伸展。然后开始下一个25分钟',
      '完成4个番茄钟（约2小时工作）后可以休息15-20分钟。今天的目标是完成至少8个番茄钟。睡前记录：你今天完成了多少个？专注的时候和摸鱼的时候——哪个效率更高？'
    ]
  },
  {
    id: 'bt091',
    content: '闹钟一响就起——不按贪睡按钮',
    type: 'breakthrough', typeColor: '#A55FA5', duration: 5,
    outdoor: false, nightSafe: false, rainy: true,
    requirePOI: null, cost: 0, double: false, mode: 'breakthrough',
    avoidTypes: [],
    recommendTypes: ['range:fixed', 'hobby:sport'],
    tip: '为什么做：按掉贪睡按钮的那一刻，你其实是在跟今天的自己说"我不重要"。把闹钟放到房间最远的地方，闹钟响就起来去关掉它——今天的第一场仗你已经赢了。把手机或闹钟放在离床最远的地方——你必须站起来才能关掉它。闹钟响的那一刻不要思考——思考会让你赖床。设置一个"起床仪式"：闹钟响→深呼吸→坐起来→站起来→去洗手间洗脸',
    steps: [
      '今晚睡前把手机/闹钟放到房间另一端——离床最远的地方',
      '明天闹钟一响——不要想"再睡5分钟"——你必须站起来走过去才能关掉它',
      '关掉闹钟后直接进洗手间用冷水洗脸——这个动作会切断"回床睡觉"的念头',
      '在镜子前对自己说："很好，你做到了。今天的第一场仗你赢了。"——你的大脑需要正向反馈来建立新的习惯'
    ]
  },
  {
    id: 'bt092',
    content: '今天不说任何脏话——用"好家伙"代替',
    type: 'breakthrough', typeColor: '#A55FA5', duration: 480,
    outdoor: true, nightSafe: true, rainy: true,
    requirePOI: null, cost: 0, double: false, mode: 'breakthrough',
    avoidTypes: [],
    recommendTypes: ['social:moderate', 'range:fixed', 'hobby:game'],
    tip: '为什么做：脏话是压力的出口但不一定是唯一出口。试试用"好家伙""哎呀""天哪"代替脏话——你会惊讶地发现，换一个词，情绪的烈度真的会下降。今天把脏话全部替换成无害的感叹词：把"靠"换成"哎呀"、把"卧槽"换成"好家伙"、把"妈的"换成"天哪"。每次说脏话的时候——你的大脑其实是在释放压力；改成无害词之后，压力释放的方式会更温和',
    steps: [
      '今天设定规则：零脏话——包括"靠""卧槽""妈的""cao""TMD"等所有形式',
      '提前准备好3个替代词：表示震惊用"好家伙"、表示无语用"哎呀"、表示愤怒用"天哪"',
      '如果今天不小心说出了一句脏话——在手机备忘录里记一笔"脏话账单"，然后继续挑战',
      '睡前看你的"脏话账单"——今天说了几次脏话？每次说脏话是因为什么？你有没有发现——有些脏话只是口头禅，根本没有实际意义'
    ]
  },
  {
    id: 'bt093',
    content: '今天"不等了"——想到就立刻去做',
    type: 'breakthrough', typeColor: '#A55FA5', duration: 480,
    outdoor: true, nightSafe: true, rainy: true,
    requirePOI: null, cost: 0, double: false, mode: 'breakthrough',
    avoidTypes: [],
    recommendTypes: ['range:fixed', 'hobby:game'],
    tip: '为什么做：拖延的阻力只存在于你站起来之前的那3秒。今天执行"3秒法则"——想到该做的事，3秒内就行动。你会发现90%的事做起来只需要3分钟。今天执行"3秒法则"——脑子里出现一个"该做的事"的念头，3秒内就行动。想回消息？现在就回。想收拾桌面？现在就收。想到了就做——不做计划、不列清单、不等"一会"。你会发现90%的事做起来只需要3分钟',
    steps: [
      '今天执行"3秒法则"：脑子里出现一个"该做的事"的念头——3秒内就动手',
      '不要列"待办清单"——想到什么立刻做。回微信、收拾桌子、洗杯子、给花浇水——想到了就站起来去做',
      '如果一件事超过3分钟还没做完（比如"整理衣柜"）——那就只做3分钟就停下。做3分钟比想"我要整理完整个衣柜"要好100倍',
      '睡前记录：今天用"不等了"模式完成了多少件小事？哪一件是你拖延最久的？你发现了吗——"去做"的阻力只存在于你站起来之前的那3秒'
    ]
  },
  {
    id: 'bt094',
    content: '一整天不使用任何社交媒体',
    type: 'breakthrough', typeColor: '#A55FA5', duration: 480,
    outdoor: true, nightSafe: true, rainy: true,
    requirePOI: null, cost: 0, double: false, mode: 'breakthrough',
    avoidTypes: ['social:extrovert', 'hobby:social'],
    recommendTypes: ['social:introvert', 'hobby:reading', 'hobby:outdoor', 'range:fixed'],
    tip: '为什么做：你每天在社交媒体上花的时间远超你的想象。今天不刷朋友圈、不刷抖音、不刷微博——把时间还给自己，看看多出来的时间能用来做什么。微信可以用来聊天和通话——但不能刷朋友圈。通知栏里的"发现"小红点不要点进去。你可以把微博/小红书/抖音等APP放到一个文件夹里取名叫"今天不看"——每次手滑点到的时候提醒自己',
    steps: [
      '今天所有社交媒体——不打开、不刷、不发帖、不评论',
      '如果手指肌肉记忆点开了小红书/抖音/微博——看到首页就立刻退出',
      '想"刷点什么"的时候——替换动作：打开一个记事本写字、打开一本书读一页、或者站起来走一圈',
      '睡前记录：今天你少了多少小时"无效刷屏"？这些多出来的时间你用来做了什么？你发现自己只是"习惯性打开"而不是"真正想看"了吗？'
    ]
  },
  {
    id: 'bt095',
    content: '今天所有有扶手的地方都不扶',
    type: 'breakthrough', typeColor: '#A55FA5', duration: 60,
    outdoor: true, nightSafe: false, rainy: false,
    requirePOI: null, cost: 0, double: false, mode: 'breakthrough',
    avoidTypes: ['sport:never'],
    recommendTypes: ['sport:occasional', 'range:fixed', 'hobby:game'],
    tip: '为什么做：不扶把手其实是核心力量训练——用腰腹对抗列车的晃动，每一站都是免费的健身课。选非高峰时段体验，从坐2-3站开始。这个挑战其实是"核心力量训练"——坐地铁不扶把手要求你用腰腹力量保持平衡。选非高峰时段（10:00-16:00）体验最佳，人太多的时候可能会挡住别人下车。从坐2-3站开始',
    steps: [
      '今天坐地铁时找一个不靠墙不靠门的位置站定',
      '双手自然下垂——不抓任何扶手、不靠车厢壁',
      '用腰腹和腿部的力量对抗列车的启动、刹车和转弯——你会发现核心肌群在发力',
      '坐3站后下车。你今天"不扶"的时间每多一站——你的核心力量就多练了一站。在月台上拍一张照片记录这个"平衡日"'
    ]
  },
  {
    id: 'bt096',
    content: '今天零消费——一分钱都不花',
    type: 'breakthrough', typeColor: '#A55FA5', duration: 480,
    outdoor: true, nightSafe: true, rainy: true,
    requirePOI: null, cost: 0, double: false, mode: 'breakthrough',
    avoidTypes: [],
    recommendTypes: ['range:fixed', 'hobby:game'],
    tip: '为什么做：很多消费根本不是"需要"，只是"习惯"。今天试试零消费——三餐吃家里存货、用已充值的交通卡、自带水杯。省钱的同时，你会看清哪些消费是真正的需求。今天不扫任何付款码、不刷任何卡、不转任何账。早餐吃家里的面包、午餐带便当或吃公司/学校食堂、晚餐用冰箱囤货解决。地铁用月卡或已经充值的交通卡',
    steps: [
      '今天的目标是"零消费"——从早到晚不花一分钱',
      '出门前检查：带好已经充值的交通卡（不用额外充值）、带好水杯（不用买水）',
      '每次手不自觉地想掏出手机扫码买东西时——停下来问自己："我是需要它，还是只是习惯了付钱？"',
      '睡前记录：今天省了多少钱？有没有哪个瞬间特别想花钱？你发现了吗——很多消费根本不是"需要"，只是"习惯"'
    ]
  },
  {
    id: 'bt097',
    content: '今天解锁手机不超过30次',
    type: 'breakthrough', typeColor: '#A55FA5', duration: 480,
    outdoor: true, nightSafe: true, rainy: true,
    requirePOI: null, cost: 0, double: false, mode: 'breakthrough',
    avoidTypes: [],
    recommendTypes: ['hobby:reading', 'hobby:outdoor', 'range:fixed'],
    tip: '为什么做：正常人每天解锁手机80-120次，其中大部分是"无意识解锁"。今天每次解锁前问自己"我要干什么"——如果答案不清楚，就不要解锁。30次足够你用一天了。每次想解锁手机前——停顿3秒问自己"我要干什么"。如果答案是"不知道"或"就想看看"——就不要解锁',
    steps: [
      '利用手机自带的屏幕使用时间功能或下载一个解锁计数APP',
      '每次拿起手机想解锁之前——停3秒，问自己："我打开手机要做什么具体的事？"',
      '如果答案不是具体的——"回XX消息""查XX信息""定XX闹钟"——就不要解锁。放下手机',
      '睡前看今天的解锁次数。如果超过30次——想一下哪几次是不必要的。如果低于30次——你今天抢回了至少1小时的注意力'
    ]
  },
  {
    id: 'bt098',
    content: '今天不说"等一下"——听到就立刻行动',
    type: 'breakthrough', typeColor: '#A55FA5', duration: 480,
    outdoor: true, nightSafe: true, rainy: true,
    requirePOI: null, cost: 0, double: false, mode: 'breakthrough',
    avoidTypes: [],
    recommendTypes: ['range:fixed', 'hobby:game'],
    tip: '为什么做："等一下"是拖延的借口，大多数被说"等一下"的事做起来不超过3分钟。今天不说明天，不等"等一下"——听到别人叫你或想到该做的事，现在就做。今天不管谁叫你、不管什么事要你做——如果3分钟内能搞定，现在就做。如果3分钟内搞不定，设定一个具体的"等多久"——比如"15分钟后我来处理"，然后设一个闹钟',
    steps: [
      '今天禁止说"等一下"——无论是对别人还是对自己',
      '如果别人叫你——3分钟内能做的事，现在就做。不能的话就说"我在XX分钟后处理"',
      '如果心里想"等一下再……"——立刻打断这个念头，要么现在就做，要么设一个5分钟计时器去做',
      '睡前记录：今天成功阻止了多少次"等一下"？你发现了吗——大多数被说"等一下"的事，其实做起来不超过3分钟'
    ]
  },
  {
    id: 'bt099',
    content: '今天不点外卖——吃店里或自己做',
    type: 'breakthrough', typeColor: '#A55FA5', duration: 480,
    outdoor: true, nightSafe: true, rainy: true,
    requirePOI: null, cost: 0, double: false, mode: 'breakthrough',
    avoidTypes: [],
    recommendTypes: ['hobby:food', 'range:fixed', 'hobby:game'],
    tip: '为什么做：点外卖是一种惯性而不是必需品。今天走出去吃饭——去店里坐下来慢慢吃，或者自己做一顿（哪怕只是煮面）。你会发现堂食比外卖更有"吃过饭了"的仪式感。不点外卖意味着：你得去店里吃或者自己做。早餐可以是冰箱里的面包+牛奶、午餐走去楼下的面馆吃、晚餐自己做一道简单的菜。你会发现——走出去吃饭比等外卖更让人有"我已经吃过饭了"的满足感',
    steps: [
      '今天三餐都不打开外卖APP——早餐吃家里的存货',
      '午餐走出去——找一家你公司/学校/家附近的店，坐下来吃一顿堂食',
      '晚餐要么自己做（哪怕只是煮个面+加个蛋），要么走去楼下吃',
      '睡前记录：今天走路去吃饭走了多少步？堂食和外卖相比——除了钱，你还多得到了什么？你发现了吗——"点外卖"也是一种惯性，而不是必需品'
    ]
  },
  {
    id: 'bt100',
    content: '今天不主动给任何人发消息',
    type: 'breakthrough', typeColor: '#A55FA5', duration: 480,
    outdoor: true, nightSafe: true, rainy: true,
    requirePOI: null, cost: 0, double: false, mode: 'breakthrough',
    avoidTypes: ['social:extrovert', 'hobby:social'],
    recommendTypes: ['social:introvert', 'range:fixed'],
    tip: '为什么做：我们主动联系别人的冲动，很多时候只是"想被关注"而不是"真的有事"。今天只回复不主动——如果有人找你，正常回复；如果没人找你，享受无人打扰的一天。今天你只回复、不主动。不回朋友圈、不主动找人聊天、不发消息问"在干嘛"。如果有人找你——正常回复；如果没人找你——那就享受没有人打扰的一天。你会发现：我们主动联系别人的冲动，很多时候只是"想被关注"',
    steps: [
      '今天立下规矩：不主动给任何人发微信、QQ、私信——不主动开启任何对话',
      '如果"想找某人聊天"的冲动来了——忍5分钟。5分钟后你大概率就不想聊了',
      '别人来找你的时候——正常回复，可以热情、可以简短，但不要借机主动开启新话题',
      '睡前记录：今天"想主动找人"的冲动来了几次？实际上有多少人主动找了你？你发现了吗——很多时候你想找别人，只是因为"你无聊了"，而不是"真的有事"'
    ]
  }
]

module.exports = { BREAKTHROUGH_COMMANDS }