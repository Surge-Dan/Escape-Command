const app = getApp()

// 按指令类别匹配的搞怪头衔
const TITLES_BY_CATEGORY = {
  social: ['社死担当', '羞耻已免疫', '路人震惊认证', '街头行为艺术家', '尴尬终结者', '社会性死亡幸存者'],
  roleplay: ['影帝/影后认证', '戏精本精', '今日不当自己', '身份窃贼', '平行宇宙体验官', '奥斯卡欠你一座'],
  fate: ['天命之子', '命运赌徒', '随机人生玩家', '硬币哲学家', '命运的舔狗', '随缘大师'],
  reverse: ['习惯破坏者', '反着来专业户', '今日镜像人生', '常规粉碎机', '叛逆期补课学员', '自己的陌生人'],
  endurance: ['意志力战士', '忍耐冠军', '自律体验官', '欲望驯兽师', '舒适区游击队', '今日苦行僧']
}
// 搞怪标语（按类别）
const SLOGANS_BY_CATEGORY = {
  social: [
    '你在陌生人面前做了一件谁都不会做的事——恭喜，社死的尽头是自由。',
    '路人震惊的表情值回票价——你活着走出了现场。',
    '你知道吗？90%的社死只发生在你脑子里，另外10%被你亲手完成了。'
  ],
  roleplay: [
    '你短暂地成为了另一个人——然后发现，做自己其实也挺好。',
    '扮演别人只需要15分钟，但这15分钟比当自己一整天还累。',
    '今天你偷了一段不属于你的人生。还回去的时候，记得说谢谢。'
  ],
  fate: [
    '你把选择权交给了命运——命运表示压力很大。',
    '随机的魅力在于：你永远不知道下一颗巧克力是什么味道的。',
    '今天你没有做决定——但结果是好的，这说明了什么？你自己品。'
  ],
  reverse: [
    '你和平时的自己反着来——然后发现，原来还有这种活法。',
    '习惯是牢笼，你今天翻墙出去透了口气。',
    '做了一件"不像你"的事——但做完之后，这件事也成了"你"的一部分。'
  ],
  endurance: [
    '你忍住了一件事——不是因为没有机会，而是因为你选择了忍住。',
    '意志力像肌肉，你今天练了一组。可能不太大，但确实练了。',
    '和自己对抗很难——但你赢了这一局。哪怕只是一小局。'
  ]
}
// 通用标语（任何类别都可能随机到）
const GENERIC_SLOGANS = [
  '你刚完成了一件不像你的事。恭喜，你不再是以前的你了。',
  '这件事你本来打死都不会做。现在你活得好好的。',
  '有时候不做自己，才是最好的自己。',
  '恭喜，你的舒适圈又扩大了一点点。',
  '刚才那一下，你比昨天的自己勇敢了一点点。'
]
// 累计成就称号
const ACHIEVEMENTS = [
  { label: '破圈萌新', min: 1, max: 2 },
  { label: '破圈入门', min: 3, max: 5 },
  { label: '破圈熟手', min: 6, max: 10 },
  { label: '破圈艺术家', min: 11, max: 20 },
  { label: '破圈传奇', min: 21, max: 999 }
]
// 鼓励语
const ENCOURAGEMENTS = [
  '继续保持，你已经开始不像你了！',
  '破圈之路，越走越宽！',
  '下一个破圈王者，就是你！',
  '今天的你，比昨天敢了一点点。',
  '破圈这件事，只有零次和无数次。'
]

/** 从指令id判断类别 */
function getCategoryFromId(id) {
  const num = parseInt((id || '').replace(/\D/g, ''), 10) || 0
  if (num <= 20) return 'social'
  if (num <= 40) return 'roleplay'
  if (num <= 60) return 'fate'
  if (num <= 80) return 'reverse'
  return 'endurance'
}

Page({
  data: {
    statusBarHeight: 20,
    navHeaderStyle: '',
    userName: '出逃者',
    commandTitle: '',
    shameLevel: 3,
    shameStars: '★★★☆☆',
    shameLabel: '破圈萌新',
    totalCount: 1,
    funTitle: '破圈成功',
    funSlogan: '',
    dateStr: '',
    cityName: '广州',
    isAnimating: false,
    showCrown: false
  },

  onLoad() {
    this.applyNavMetrics()
    const gd = app.globalData

    // 从最近一条破圈记录里取数据（避免被普通出逃记录覆盖）
    const records = gd.records || []
    const btRecords = records.filter(r => r.commandType === 'breakthrough')
    const totalCount = btRecords.length
    // 优先取最后一条破圈记录；没有则回退到 currentCommand（首次完成未落盘场景）
    const lastBtRecord = btRecords.length > 0 ? btRecords[btRecords.length - 1] : null
    const cmd = lastBtRecord || gd.currentCommand

    // 成就称号
    let ach = ACHIEVEMENTS.find(a => totalCount >= a.min && totalCount <= a.max) || ACHIEVEMENTS[0]
    const shameLabel = ach.label

    // 随机社死指数（基于总次数波动）
    const shameLevel = Math.min(5, Math.max(1, 1 + Math.floor(totalCount / 3)))
    const shameStars = '★'.repeat(shameLevel) + '☆'.repeat(5 - shameLevel)

    // 从指令id判断类别，匹配对应的搞怪头衔和标语
    const cmdId = cmd ? (cmd.commandId || cmd.id || '') : ''
    const category = getCategoryFromId(cmdId)
    const catTitles = TITLES_BY_CATEGORY[category] || TITLES_BY_CATEGORY.social
    const catSlogans = SLOGANS_BY_CATEGORY[category] || []

    const funTitle = catTitles[Math.floor(Math.random() * catTitles.length)]
    // 标语：80%概率用类别匹配，20%用通用
    const sloganPool = Math.random() < 0.8 && catSlogans.length
      ? catSlogans : GENERIC_SLOGANS
    const funSlogan = sloganPool[Math.floor(Math.random() * sloganPool.length)]

    const now = new Date()
    this.setData({
      userName: gd.escapeName || '出逃者',
      commandTitle: cmd ? (cmd.content || '完成了一项破圈挑战') : '完成了一项破圈挑战',
      shameLevel,
      shameStars,
      shameLabel,
      totalCount,
      funTitle,
      funSlogan,
      dateStr: `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')}`,
      cityName: cmd && cmd.locationName ? cmd.locationName : gd.currentCity || '广州',
      showCrown: totalCount >= 3
    })

    // 入场动画
    setTimeout(() => this.setData({ isAnimating: true }), 100)
  },

  onShow() {
    this.applyNavMetrics()
  },

  applyNavMetrics() {
    const nav = app.getNavMetrics ? app.getNavMetrics() : {}
    this.setData({
      statusBarHeight: nav.statusBarHeight || 20,
      navHeaderStyle: nav.navHeaderStyle || app.globalData.navHeaderStyle || ''
    })
  },

  goHome() {
    wx.switchTab({ url: '/pages/index/index' })
  },

  shareCertificate() {
    wx.showShareMenu({
      withShareTicket: false,
      menus: ['shareAppMessage', 'shareTimeline']
    })
  },

  onShareAppMessage() {
    return {
      title: `我刚在「出逃指令」完成了「${this.data.commandTitle}」😱 你敢来吗？`,
      path: '/pages/index/index'
    }
  }
})
