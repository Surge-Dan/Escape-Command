const app = getApp()

// 生成稳定的非热门城市 id：省前缀 + 城市名去后缀。
function cityId(province, city) {
  const p = province.replace(/(省|市|自治区|特别行政区)/g, '')
  const c = city.replace(/(市|地区|盟|自治州|自治县|自治旗|州|区|县|旗)/g, '')
  return `${p}_${c}`
}

// 非热门城市的通用构造器，count/emoji 按索引钉死，保证稳定。
function makeGenericCity(name, province, index) {
  const emojis = ['🏙️', '🌆', '🏘️', '🌇', '🏞️', '🏔️', '🌊', '🌳', '⛩️', '🛕']
  const count = (index * 7 + 3) % 21
  return {
    id: cityId(province, name),
    name,
    emoji: emojis[index % emojis.length],
    desc: '探索这座城市的角落',
    count,
    commands: [
      `去${name}的老城区找一条没走过的小巷`,
      `在${name}的街头找一个有故事的路牌`,
      `去${name}的本地市场，发现一种没见过的食材`
    ]
  }
}

// ==================== 热门城市 ====================
const HOT_CITIES = [
  {
    id: 'beijing', name: '北京', emoji: '🏯',
    desc: '皇城根下，胡同里有最慢的时光',
    count: 18,
    commands: [
      '去北京的胡同里找四合院的门墩，拍下门墩上的纹样',
      '去北京的什刹海看大爷下棋，记下三步妙手',
      '去北京的南锣鼓巷找一家没去过的杂货铺'
    ]
  },
  {
    id: 'shanghai', name: '上海', emoji: '🌆',
    desc: '梧桐树影里，藏着最洋气的市井',
    count: 16,
    commands: [
      '去上海的武康路拍梧桐树下的光斑',
      '去上海的田子坊找一家没去过的咖啡馆',
      '去上海的外滩听一次海关大楼的钟声'
    ]
  },
  {
    id: 'guangzhou', name: '广州', emoji: '🍵',
    desc: '骑楼街角，一碗糖水能换一下午',
    count: 14,
    commands: [
      '去广州的永庆坊找粤剧元素',
      '去广州的沙面拍欧式建筑',
      '去广州的西关老巷找一家老字号糖水铺'
    ]
  },
  {
    id: 'shenzhen', name: '深圳', emoji: '🏙️',
    desc: '海边创意园，新城也长出了苔藓',
    count: 12,
    commands: [
      '去深圳的华侨城创意园找涂鸦',
      '去深圳的深圳湾看候鸟',
      '去深圳的大鹏所城摸一段老城墙'
    ]
  },
  {
    id: 'chengdu', name: '成都', emoji: '🐼',
    desc: '茶馆与酒馆之间，时间被泡软了',
    count: 17,
    commands: [
      '去成都的宽窄巷子找茶馆',
      '去成都的玉林路找小酒馆',
      '去成都的浣花溪畔读一句杜甫'
    ]
  },
  {
    id: 'hangzhou', name: '杭州', emoji: '🌿',
    desc: '西湖有雾，龙井有香，皆可入诗',
    count: 13,
    commands: [
      '去杭州的西湖边找断桥残雪',
      '去杭州的龙井村品一杯新茶',
      '去杭州的小河直街迷一次路'
    ]
  },
  {
    id: 'xian', name: '西安', emoji: '🏛️',
    desc: '城墙根下，秦腔和泡馍一样滚烫',
    count: 15,
    commands: [
      '去西安的城墙根下听秦腔',
      '去西安的回民街找最老的羊肉泡馍',
      '去西安的大雁塔下数一遍雁影'
    ]
  },
  {
    id: 'chongqing', name: '重庆', emoji: '🌉',
    desc: '山城步道，每级楼梯都是夜景',
    count: 19,
    commands: [
      '去重庆的洪崖洞拍夜景',
      '去重庆的山城步道爬楼梯',
      '去重庆的十八梯找一家老茶馆'
    ]
  },
  {
    id: 'nanjing', name: '南京', emoji: '🏮',
    desc: '六朝烟水，梧桐一叶知秋',
    count: 16,
    commands: [
      '去南京的夫子庙看一次秦淮灯会',
      '去南京的中山陵走一条林荫路',
      '去南京的老门东尝一碗鸭血粉丝汤'
    ]
  },
  {
    id: 'wuhan', name: '武汉', emoji: '🌸',
    desc: '两江三镇，过早可以吃一个月不重样',
    count: 15,
    commands: [
      '去武汉的江汉路找一栋老租界建筑',
      '去武汉的东湖绿道骑一段路',
      '去武汉的粮道街过一次早'
    ]
  },
  {
    id: 'suzhou', name: '苏州', emoji: '🌸',
    desc: '园林深处，评弹软糯如水',
    count: 14,
    commands: [
      '去苏州的平江路听一段评弹',
      '去苏州的拙政园找一扇花窗',
      '去苏州的山塘街坐一次夜船'
    ]
  },
  {
    id: 'changsha', name: '长沙', emoji: '🌶️',
    desc: '湘江烟火，辣味里藏着江湖气',
    count: 13,
    commands: [
      '去长沙的橘子洲头看一场焰火',
      '去长沙的太平街找一家口味虾',
      '去长沙的岳麓书院读一句对联'
    ]
  },
  {
    id: 'tianjin', name: '天津', emoji: '🎡',
    desc: '九河下梢，相声与煎饼果子一样耐嚼',
    count: 12,
    commands: [
      '去天津的五大道骑一次单车',
      '去天津的古文化街听一场相声',
      '去天津的海河边看一次摩天轮'
    ]
  },
  {
    id: 'qingdao', name: '青岛', emoji: '🍺',
    desc: '红瓦绿树，碧海蓝天配啤酒',
    count: 13,
    commands: [
      '去青岛的栈桥看一次海鸥',
      '去青岛的八大关找一栋德式建筑',
      '去青岛的啤酒街喝一杯原浆'
    ]
  },
  {
    id: 'xiamen', name: '厦门', emoji: '🌴',
    desc: '鼓浪声声，海风把日子吹得缓慢',
    count: 12,
    commands: [
      '去厦门的鼓浪屿找一条无人小巷',
      '去厦门的环岛路骑一段海边',
      '去厦门的沙坡尾看一次日落'
    ]
  },
  {
    id: 'kunming', name: '昆明', emoji: '🌷',
    desc: '四季如春，花香是城市的底色',
    count: 11,
    commands: [
      '去昆明的翠湖看一次红嘴鸥',
      '去昆明的滇池边等一场落日',
      '去昆明的斗南花市买一束花'
    ]
  }
]

// ==================== 省份数据（34 个省级行政区） ====================
const RAW_PROVINCES = [
  {
    province: '北京市',
    cities: ['北京', '东城区', '西城区', '朝阳区', '丰台区', '石景山区', '海淀区', '门头沟区', '房山区', '通州区', '顺义区', '昌平区', '大兴区', '怀柔区', '平谷区', '密云区', '延庆区']
  },
  {
    province: '天津市',
    cities: ['天津', '和平区', '河东区', '河西区', '南开区', '河北区', '红桥区', '东丽区', '西青区', '津南区', '北辰区', '武清区', '宝坻区', '滨海新区', '宁河区', '静海区', '蓟州区']
  },
  {
    province: '河北省',
    cities: ['石家庄', '唐山', '秦皇岛', '邯郸', '邢台', '保定', '张家口', '承德', '沧州', '廊坊', '衡水']
  },
  {
    province: '山西省',
    cities: ['太原', '大同', '阳泉', '长治', '晋城', '朔州', '晋中', '运城', '忻州', '临汾', '吕梁']
  },
  {
    province: '内蒙古自治区',
    cities: ['呼和浩特', '包头', '乌海', '赤峰', '通辽', '鄂尔多斯', '呼伦贝尔', '巴彦淖尔', '乌兰察布', '兴安盟', '锡林郭勒盟', '阿拉善盟']
  },
  {
    province: '辽宁省',
    cities: ['沈阳', '大连', '鞍山', '抚顺', '本溪', '丹东', '锦州', '营口', '阜新', '辽阳', '盘锦', '铁岭', '朝阳', '葫芦岛']
  },
  {
    province: '吉林省',
    cities: ['长春', '吉林', '四平', '辽源', '通化', '白山', '松原', '白城', '延边朝鲜族自治州']
  },
  {
    province: '黑龙江省',
    cities: ['哈尔滨', '齐齐哈尔', '鸡西', '鹤岗', '双鸭山', '大庆', '伊春', '佳木斯', '七台河', '牡丹江', '黑河', '绥化', '大兴安岭地区']
  },
  {
    province: '上海市',
    cities: ['上海', '黄浦区', '徐汇区', '长宁区', '静安区', '普陀区', '虹口区', '杨浦区', '闵行区', '宝山区', '嘉定区', '浦东新区', '金山区', '松江区', '青浦区', '奉贤区', '崇明区']
  },
  {
    province: '江苏省',
    cities: ['南京', '无锡', '徐州', '常州', '苏州', '南通', '连云港', '淮安', '盐城', '扬州', '镇江', '泰州', '宿迁']
  },
  {
    province: '浙江省',
    cities: ['杭州', '宁波', '温州', '嘉兴', '湖州', '绍兴', '金华', '衢州', '舟山', '台州', '丽水']
  },
  {
    province: '安徽省',
    cities: ['合肥', '芜湖', '蚌埠', '淮南', '马鞍山', '淮北', '铜陵', '安庆', '黄山', '滁州', '阜阳', '宿州', '六安', '亳州', '池州', '宣城']
  },
  {
    province: '福建省',
    cities: ['福州', '厦门', '莆田', '三明', '泉州', '漳州', '南平', '龙岩', '宁德']
  },
  {
    province: '江西省',
    cities: ['南昌', '景德镇', '萍乡', '九江', '新余', '鹰潭', '赣州', '吉安', '宜春', '抚州', '上饶']
  },
  {
    province: '山东省',
    cities: ['济南', '青岛', '淄博', '枣庄', '东营', '烟台', '潍坊', '济宁', '泰安', '威海', '日照', '临沂', '德州', '聊城', '滨州', '菏泽']
  },
  {
    province: '河南省',
    cities: ['郑州', '开封', '洛阳', '平顶山', '安阳', '鹤壁', '新乡', '焦作', '濮阳', '许昌', '漯河', '三门峡', '南阳', '商丘', '信阳', '周口', '驻马店']
  },
  {
    province: '湖北省',
    cities: ['武汉', '黄石', '十堰', '宜昌', '襄阳', '鄂州', '荆门', '孝感', '荆州', '黄冈', '咸宁', '随州', '恩施土家族苗族自治州']
  },
  {
    province: '湖南省',
    cities: ['长沙', '株洲', '湘潭', '衡阳', '邵阳', '岳阳', '常德', '张家界', '益阳', '郴州', '永州', '怀化', '娄底', '湘西土家族苗族自治州']
  },
  {
    province: '广东省',
    cities: ['广州', '韶关', '深圳', '珠海', '汕头', '佛山', '江门', '湛江', '茂名', '肇庆', '惠州', '梅州', '汕尾', '河源', '阳江', '清远', '东莞', '中山', '潮州', '揭阳', '云浮']
  },
  {
    province: '广西壮族自治区',
    cities: ['南宁', '柳州', '桂林', '梧州', '北海', '防城港', '钦州', '贵港', '玉林', '百色', '贺州', '河池', '来宾', '崇左']
  },
  {
    province: '海南省',
    cities: ['海口', '三亚', '三沙', '儋州']
  },
  {
    province: '重庆市',
    cities: ['重庆', '万州区', '涪陵区', '渝中区', '大渡口区', '江北区', '沙坪坝区', '九龙坡区', '南岸区', '北碚区', '綦江区', '大足区', '渝北区', '巴南区', '黔江区', '长寿区', '江津区', '合川区', '永川区', '南川区', '璧山区', '铜梁区', '潼南区', '荣昌区', '开州区', '梁平区', '武隆区', '城口县', '丰都县', '垫江县', '忠县', '云阳县', '奉节县', '巫山县', '巫溪县', '石柱土家族自治县', '秀山土家族苗族自治县', '酉阳土家族苗族自治县', '彭水苗族土家族自治县']
  },
  {
    province: '四川省',
    cities: ['成都', '自贡', '攀枝花', '泸州', '德阳', '绵阳', '广元', '遂宁', '内江', '乐山', '南充', '眉山', '宜宾', '广安', '达州', '雅安', '巴中', '资阳', '阿坝藏族羌族自治州', '甘孜藏族自治州', '凉山彝族自治州']
  },
  {
    province: '贵州省',
    cities: ['贵阳', '六盘水', '遵义', '安顺', '毕节', '铜仁', '黔西南布依族苗族自治州', '黔东南苗族侗族自治州', '黔南布依族苗族自治州']
  },
  {
    province: '云南省',
    cities: ['昆明', '曲靖', '玉溪', '保山', '昭通', '丽江', '普洱', '临沧', '楚雄彝族自治州', '红河哈尼族彝族自治州', '文山壮族苗族自治州', '西双版纳傣族自治州', '大理白族自治州', '德宏傣族景颇族自治州', '怒江傈僳族自治州', '迪庆藏族自治州']
  },
  {
    province: '西藏自治区',
    cities: ['拉萨', '日喀则', '昌都', '林芝', '山南', '那曲', '阿里地区']
  },
  {
    province: '陕西省',
    cities: ['西安', '铜川', '宝鸡', '咸阳', '渭南', '延安', '汉中', '榆林', '安康', '商洛']
  },
  {
    province: '甘肃省',
    cities: ['兰州', '嘉峪关', '金昌', '白银', '天水', '武威', '张掖', '平凉', '酒泉', '庆阳', '定西', '陇南', '临夏回族自治州', '甘南藏族自治州']
  },
  {
    province: '青海省',
    cities: ['西宁', '海东', '海北藏族自治州', '黄南藏族自治州', '海南藏族自治州', '果洛藏族自治州', '玉树藏族自治州', '海西蒙古族藏族自治州']
  },
  {
    province: '宁夏回族自治区',
    cities: ['银川', '石嘴山', '吴忠', '固原', '中卫']
  },
  {
    province: '新疆维吾尔自治区',
    cities: ['乌鲁木齐', '克拉玛依', '吐鲁番', '哈密', '昌吉回族自治州', '博尔塔拉蒙古自治州', '巴音郭楞蒙古自治州', '阿克苏地区', '克孜勒苏柯尔克孜自治州', '喀什地区', '和田地区', '伊犁哈萨克自治州', '塔城地区', '阿勒泰地区', '石河子', '阿拉尔', '图木舒克', '五家渠', '北屯', '铁门关', '双河', '可克达拉', '昆玉', '胡杨河', '新星']
  },
  {
    province: '台湾省',
    cities: ['台北', '新北', '桃园', '台中', '台南', '高雄', '基隆', '新竹', '嘉义']
  },
  {
    province: '香港特别行政区',
    cities: ['香港', '中西区', '湾仔区', '东区', '南区', '油尖旺区', '深水埗区', '九龙城区', '黄大仙区', '观塘区', '荃湾区', '屯门区', '元朗区', '北区', '大埔区', '西贡区', '沙田区', '葵青区', '离岛区']
  },
  {
    province: '澳门特别行政区',
    cities: ['澳门', '花地玛堂区', '圣安多尼堂区', '大堂区', '望德堂区', '风顺堂区', '嘉模堂区', '圣方济各堂区', '路氹城']
  }
]

const PROVINCE_GROUPS = RAW_PROVINCES.map((group, gIndex) => ({
  province: group.province,
  cities: group.cities.map((name, cIndex) => makeGenericCity(name, group.province, gIndex * 100 + cIndex))
}))

const ALL_CITIES = [...HOT_CITIES, ...PROVINCE_GROUPS.flatMap(g => g.cities)]

// 把 locationName（形如「广州·天河」）匹配到所有城市中的某一项；匹配不到则默认广州。
function resolveCurrentCity(locationName) {
  if (!locationName) return HOT_CITIES[2]
  const head = locationName.split('·')[0].trim()
  const found = ALL_CITIES.find(c => head.indexOf(c.name) > -1 || c.name.indexOf(head) > -1)
  return found || HOT_CITIES[2]
}

Page({
  data: {
    statusBarHeight: 20,
    hotCities: HOT_CITIES,
    provinceGroups: PROVINCE_GROUPS,
    currentCity: HOT_CITIES[2],
    selectedCity: null,
    cityCommands: []
  },

  onLoad() {
    const nav = app.getNavMetrics ? app.getNavMetrics() : {}
    const locationName = (app.globalData && app.globalData.locationName) || ''
    const current = resolveCurrentCity(locationName)
    this.setData({
      statusBarHeight: nav.statusBarHeight || 20,
      navHeaderStyle: nav.navHeaderStyle || '',
      currentCity: current
    })
  },

  selectCity(e) {
    const id = e.currentTarget.dataset.id
    const city = ALL_CITIES.find(c => c.id === id)
    if (!city) return
    this.setData({
      selectedCity: city,
      cityCommands: city.commands
    })
  },

  confirmSwitch() {
    const city = this.data.selectedCity
    if (!city) return
    if (app.globalData) {
      app.globalData.currentCity = city.name
      app.globalData.locationName = `${city.name}·专属`
    }
    try { wx.setStorageSync('currentCity', city.name) } catch (e) {}
    wx.showToast({ title: `已切换到 ${city.name}`, icon: 'success', duration: 1200 })
    setTimeout(() => {
      wx.navigateBack({ delta: 1 })
    }, 800)
  },

  goBack() { wx.navigateBack({ delta: 1 }) }
})
