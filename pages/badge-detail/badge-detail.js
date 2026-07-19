const app = getApp()
const BADGES = require('../../data/badges.js')

// 每个徽章的诗意故事（2-3 段）
const BADGE_STORIES = {
  first_escape: [
    '每一个出逃者都有自己的第一次。也许是个寻常的下午，你忽然推开门，决定让风穿过自己。',
    '那一次你也许只是绕了远路、买了一份热乎的小吃、又或者只是抬头看了一眼云。但当你回头时，你会发现：你已经不再是那个被困在原地的人。',
    '这枚徽章属于那一步。属于所有「终于出发了」的瞬间。'
  ],
  seven_streak: [
    '一周很短，也足够养成一个习惯。七天里，你重复地选择「出去」而非「留下」，选择「看见」而非「滑过」。',
    '也许中间有几天你并不想动，但你依然走了出去。城市在你脚下慢慢铺开，像一张只画了一半的地图。',
    '这枚徽章属于这份连续的温柔——你和自己达成了一个七天的约定。'
  ],
  thirty_streak: [
    '三十天，足够让一个动作变成一种生活方式。月升月落之间，你已经把「出逃」写进了日常的呼吸。',
    '你大概已经记不清每一个具体的瞬间，但城市记得。它记得你绕过的巷子，记得你停留过的店招，记得你抬头看过的每一片天。',
    '这枚徽章属于这个月，属于那个正在认真生活着的你。'
  ],
  color_hunter: [
    '你开始用颜色重新读这座城市。蓝色的招牌、蓝色的栅栏、蓝色的天空倒映在玻璃幕墙里——你像猎人一样追踪它们。',
    '十次颜色探索之后，你会发现蓝色其实无处不在，只是过去你从来没有真正看过它。世界因为一种颜色的反复出现，而变得安静而清晰。',
    '这枚徽章属于那个学会「看见」的你。'
  ],
  market_regular: [
    '菜市场的烟火气是城市最诚实的部分。摊位上的吆喝、油锅里的滋响、塑料袋被风吹起的窸窣——你一次次走进这里。',
    '五次之后，老板开始认得你。你会知道哪家的葱最鲜、哪家的豆腐最早卖完。这不是攻略上的推荐，是你自己一条条走出来的经验。',
    '这枚徽章属于这份慢慢长出来的「熟」。'
  ],
  culture_lover: [
    '文化场所是城市里被刻意保留的安静。你走进书店、博物馆、旧剧场——那些让人放慢脚步的地方。',
    '五次文化漫游之后，你大概已经找到一两个属于自己的角落。也许是一本翻了一半的书，也许是一件让你停下看了很久的展品。',
    '这枚徽章属于这份对「慢」的偏爱。'
  ],
  night_walker: [
    '夜色里的城市换了一副面孔。霓虹比白天更亮，街道比白天更空，连风都比白天更轻。',
    '你选择在深夜走出去，五次。也许是为了避开人群，也许只是失眠。无论哪种，你都看见了一个别人看不到的城市。',
    '这枚徽章属于夜色，也属于夜色里那个更安静的你。'
  ],
  rainy_walker: [
    '下雨天，大多数人选择留下。你却撑着伞，走进湿漉漉的街道，听雨打在伞面的声音。',
    '三次雨天出逃之后，你会发现雨中的城市有种特别的温柔：颜色被洗得更深，声音被压得更轻，连脚步都变得格外清晰。',
    '这枚徽章属于那份愿意在雨里慢慢走的耐心。'
  ],
  micro_master: [
    '不是所有出逃都需要很久。十分钟、一段楼梯、一个拐角——微出逃是你给日常开的「小差」。',
    '十次微出逃之后，你会发现生活里到处都是可以「逃」出去的小缝隙。一杯咖啡的时间、等红绿灯的间隙、午休的二十分钟。',
    '这枚徽章属于那些被你捡回来的碎片时间。'
  ],
  walk_master: [
    '你用脚步丈量这座城市。一次十公里，又一次十公里——你越走越远，也越走越近。',
    '十次城市漫游之后，你脚下的地图渐渐连成了网。某条街你走过两次，某个转角你已经认得。城市开始对你露出它熟悉的一面。',
    '这枚徽章属于那双不知疲倦的脚。'
  ],
  double_master: [
    '一个人出逃是和自己对话，两个人出逃是和另一个灵魂一起看见世界。',
    '五次双人出逃之后，你们大概已经有了默契的路线、共同的小秘密、只有你们懂的某个瞬间。出逃变成了一种关系，不只是动作。',
    '这枚徽章属于那个愿意陪你走出去的人。'
  ],
  night_master: [
    '深夜十次，你已经是这座城市夜晚的常客。你大概知道哪家便利店凌晨两点还亮着灯，哪个路口的猫会在三点准时出现。',
    '深夜的诗意不属于热闹，属于那些独自醒着的人。你在最安静的时刻听见了城市最真实的心跳。',
    '这枚徽章属于那些被你守过的深夜。'
  ],
  rainy_master: [
    '十次雨天，你和这座城市的雨已经熟识。你知道哪种雨适合漫步，哪种雨需要躲进咖啡馆，哪种雨会带来彩虹。',
    '雨天的城市有一种被原谅过的柔软。你愿意一次次走进去，本身就是一种诗意。',
    '这枚徽章属于那个不躲雨的你。'
  ],
  social_master: [
    '出逃原本可以是一个人的事，但你选择了分享。你邀请朋友一起走出去，把独属于自己的瞬间，变成了共同的故事。',
    '三位朋友、三次双人出逃——你们之间的连接不止于聊天框，而是真实的、并排走着的脚步。',
    '这枚徽章属于那份愿意「一起」的勇气。'
  ],
  collector: [
    '你开始把指令一条条收藏起来。也许是为了将来再做一次，也许只是舍不得让它消失在长长的列表里。',
    '二十条收藏之后，你其实已经攒下了一份属于自己的「出逃清单」。每一条都是某个时刻打动过你的小线索。',
    '这枚徽章属于这份慢慢积累的「想要」。'
  ],
  city_detective: [
    '你像侦探一样在城市里搜集角落。五十个不同的地方，五十次不同的停留——你的足迹已经织成了一张密密的网。',
    '也许你自己都没察觉，但这座城市已经因为你而多了一些「被看见」的角落。它们因为你而被记住。',
    '这枚徽章属于那双不肯放过细节的眼睛。'
  ],
  member_pro: [
    '这枚徽章属于愿意为「出逃」付出更多的人。你选择成为会员，让这件事能走得更远。',
    '感谢你的支持。出逃指令会因为有你的存在，而继续生长下去。',
    '愿你出逃的路上，永远有新的光。'
  ],
  explorer: [
    '六种类型的指令，你都试过了。颜色、漫步、感官、收藏、美食、文化——你没有把自己局限在某一种偏好里。',
    '正因为如此，你看见的城市是立体的。你不只是走过它，你从六个不同的角度看见了它。',
    '这枚徽章属于那个好奇的你。'
  ],
  challenge_king: [
    '每日挑战是出逃指令的小考。你完成了七个，一周的挑战你都接住了。',
    '每一个挑战都是一次主动的选择——不是被动地等待推荐，而是迎上去。这种主动性会慢慢渗透进生活的其它角落。',
    '这枚徽章属于那个愿意接招的你。'
  ]
}

// 徽章分类标签
const CATEGORY_LABELS = {
  milestone: '里程碑',
  type: '类型探索',
  mode: '出逃模式',
  social: '社交',
  special: '特殊'
}

// 解锁条件扩展文案 + 进度计算规则
const CONDITION_META = {
  first_escape:    { text: '完成你的第一次出逃。任何一条指令都算，从最简单的开始就好。', target: 1, scope: 'all' },
  seven_streak:    { text: '连续 7 天完成出逃。中间断一天就要重新计数，慢一点没关系，关键是不停下。', target: 7, scope: 'streak' },
  thirty_streak:   { text: '连续 30 天完成出逃。这是一个长一点的习惯，需要你和时间一起配合。', target: 30, scope: 'streak' },
  color_hunter:    { text: '在首页出逃中，完成 10 条标记为「颜色探索」的指令。颜色是城市最容易被忽略的语言。', target: 10, scope: 'type', type: 'color' },
  market_regular:  { text: '在首页出逃中，完成 5 条标记为「美食探索」的指令。菜市场和小店都算。', target: 5, scope: 'type', type: 'food' },
  culture_lover:   { text: '在首页出逃中，完成 5 条标记为「如实文化」的指令。书店、博物馆、旧街巷都算。', target: 5, scope: 'type', type: 'culture' },
  night_walker:    { text: '在 22:00 - 06:00 之间完成 5 次出逃。夜色里的城市会换一副面孔。', target: 5, scope: 'night' },
  rainy_walker:    { text: '在雨天完成 3 次出逃。撑伞走出去的人，会看到别人看不到的城市。', target: 3, scope: 'rainy' },
  micro_master:    { text: '完成 10 次微出逃模式。微出逃是给日常开的小差，每次不超过 15 分钟。', target: 10, scope: 'micro' },
  walk_master:     { text: '完成 10 次城市漫游模式。户外长线，慢慢走，慢慢看。', target: 10, scope: 'walk' },
  double_master:   { text: '完成 5 次双人出逃模式。邀请一个朋友，把出逃变成共同的故事。', target: 5, scope: 'double' },
  night_master:    { text: '完成 10 次深夜出逃模式。在最安静的时刻，听城市最真实的心跳。', target: 10, scope: 'night' },
  rainy_master:    { text: '完成 10 次雨天出逃模式。雨中的城市有种被原谅过的柔软。', target: 10, scope: 'rainy' },
  social_master:   { text: '邀请 3 位朋友一起完成双人出逃。出逃可以是一个人的事，也可以是一段关系。', target: 3, scope: 'social' },
  collector:       { text: '收藏 20 条指令。每一条收藏，都是某个时刻打动过你的小线索。', target: 20, scope: 'collect' },
  city_detective:  { text: '探索过 50 个不同的城市角落。你的足迹会织成一张密密的网。', target: 50, scope: 'locations' },
  member_pro:      { text: '成为出逃会员。这枚徽章属于愿意为「出逃」付出更多的人。', target: 0, scope: 'member' },
  explorer:        { text: '完成 6 种类型的指令。颜色、漫步、感官、收藏、美食、文化——每一种都试一次。', target: 6, scope: 'types' },
  challenge_king:  { text: '完成 7 个每日挑战。每一个挑战都是一次主动的选择。', target: 7, scope: 'challenge' }
}

const PROGRESS_HINTS = {
  all: '每一次出逃都算',
  streak: '连续天数会自动统计',
  type: '同类型的指令会被累加',
  night: '22:00 - 06:00 完成的出逃会被统计',
  rainy: '雨天完成的出逃会被统计',
  micro: '微出逃模式会被单独统计',
  walk: '城市漫游模式会被单独统计',
  double: '双人出逃模式会被单独统计',
  social: '每个朋友只算一次',
  collect: '收藏夹中的指令数量',
  locations: '不同位置会被去重统计',
  member: '会员功能暂未开放',
  types: '六种类型各算一次',
  challenge: '每日挑战会被单独统计'
}

Page({
  data: {
    statusBarHeight: 20,
    badge: null,
    unlocked: false,
    unlockedDate: '',
    categoryLabel: '',
    story: [],
    conditionText: '',
    showProgress: false,
    currentCount: 0,
    targetCount: 0,
    progressPercent: 0,
    progressHint: '',
    replayClass: ''
  },

  onLoad(options) {
    const nav = app.getNavMetrics ? app.getNavMetrics() : {}
    this.setData({ statusBarHeight: nav.statusBarHeight || 20, navHeaderStyle: nav.navHeaderStyle || '' })
    this.loadBadge(options.id)
  },

  onShow() {
    // 从徽章墙返回时刷新解锁状态
    if (this.data.badge) this.loadBadge(this.data.badge.id)
  },

  loadBadge(id) {
    const badge = BADGES.find(b => b.id === id)
    if (!badge) {
      this.setData({ badge: null })
      return
    }
    const unlockedList = app.globalData.badges || []
    const found = unlockedList.find(b => b.id === id)
    const unlocked = !!found

    const story = BADGE_STORIES[id] || ['这枚徽章的故事还在被你慢慢写下。', '继续出逃，故事就会继续生长。']
    const categoryLabel = CATEGORY_LABELS[badge.category] || '徽章'
    const meta = CONDITION_META[id] || { text: badge.desc, target: 0, scope: 'all' }

    const progress = this.computeProgress(badge, meta)
    const showProgress = meta.target > 0 && meta.scope !== 'member'
    const progressPercent = showProgress ? Math.min(100, Math.round(progress.current / meta.target * 100)) : 0

    this.setData({
      badge,
      unlocked,
      unlockedDate: found ? found.date : '',
      categoryLabel,
      story,
      conditionText: meta.text,
      showProgress,
      currentCount: progress.current,
      targetCount: meta.target,
      progressPercent,
      progressHint: PROGRESS_HINTS[meta.scope] || ''
    })
  },

  computeProgress(badge, meta) {
    if (meta.target <= 0) return { current: 0 }
    const records = app.globalData.records || []
    switch (meta.scope) {
      case 'all':         return { current: records.length }
      case 'streak':      return { current: app.globalData.continuousDays || 0 }
      case 'type':        return { current: records.filter(r => r.commandType === meta.type).length }
      case 'night':       return { current: records.filter(r => { const h = parseInt((r.time || '00:00').split(':')[0]); return h >= 22 || h < 6 }).length }
      case 'rainy':       return { current: records.filter(r => r.weather && r.weather.condition === 'rainy').length }
      case 'micro':       return { current: records.filter(r => r.duration && r.duration <= 15).length }
      case 'walk':        return { current: records.filter(r => r.commandType === 'walk').length }
      case 'double':      return { current: records.filter(r => r.commandType === 'walk').length } // 双人出逃记录近似
      case 'social':      return { current: 0 } // 社交邀请数据未持久化，无法准确统计
      case 'collect':     return { current: (app.globalData.collectedCommands || []).length }
      case 'locations': {
        const set = new Set(records.filter(r => r.location).map(r => `${Math.round(r.location.latitude * 100) / 100},${Math.round(r.location.longitude * 100) / 100}`))
        return { current: set.size }
      }
      case 'types': {
        const set = new Set(records.map(r => r.commandType))
        return { current: set.size }
      }
      case 'challenge':   return { current: 0 } // 挑战记录未持久化
      default:            return { current: 0 }
    }
  },

  replayUnlock() {
    // 触发重放动画：先清除 class，下一帧再添加，确保动画重新触发
    this.setData({ replayClass: '' }, () => {
      setTimeout(() => this.setData({ replayClass: 'replay' }), 30)
      setTimeout(() => this.setData({ replayClass: '' }), 1200)
    })
  },

  goBack() { wx.navigateBack({ delta: 1 }) }
})
