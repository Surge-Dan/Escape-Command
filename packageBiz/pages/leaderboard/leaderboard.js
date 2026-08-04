const app = getApp()

const NAME_PREFIXES = ['周末', '迷路的', '踢影子的', '漫步的', '摘云的', '追风的', '捡落叶的', '清晨的', '黄昏的', '夜行的', '雨后的', '午后的']
const NAME_SUFFIXES = ['漫游者', '散步家', '观察员', '记录人', '探险家', '闲逛者', '拾光人', '追风人']

const MODE_COLORS = {
  smart: '#5CBF9E',
  micro: '#7BAE7F',
  walk: '#D98A5C',
  double: '#9B7BB8',
  night: '#9B8EC4',
  rainy: '#7EC8F5'
}
const MODE_IDS = ['smart', 'micro', 'walk', 'double', 'night', 'rainy']

const TABS = [
  { id: 'week', name: '本周', scale: 0.18 },
  { id: 'month', name: '本月', scale: 0.55 },
  { id: 'all', name: '总榜', scale: 1.0 }
]

const DEFAULT_AVATAR = '/assets/images/avatar.webp'

// 确定性 PRNG，保证同 tab 切换时榜单数据稳定
function makeRng(seed) {
  let s = (seed >>> 0) || 1
  return function () {
    s = (s * 1664525 + 1013904223) >>> 0
    return (s >>> 8) / 0xFFFFFF
  }
}

function buildEntries(scale, userCount, userName, userAvatar) {
  const rng = makeRng(Math.round(scale * 100000) + 7919)
  const total = 20
  const list = []
  for (let i = 0; i < total; i++) {
    const prefix = NAME_PREFIXES[Math.floor(rng() * NAME_PREFIXES.length)]
    const suffix = NAME_SUFFIXES[Math.floor(rng() * NAME_SUFFIXES.length)]
    const name = prefix + suffix
    // 倒序：128 → 12 区间
    const baseCount = Math.round((128 - i * 6) * scale)
    const jitter = Math.floor(rng() * 4)
    const count = Math.max(8, baseCount - jitter)
    const mode = MODE_IDS[Math.floor(rng() * MODE_IDS.length)]
    list.push({
      name,
      count,
      mode,
      modeColor: MODE_COLORS[mode],
      avatar: DEFAULT_AVATAR,
      isMe: false
    })
  }

  // 用当前用户替换一条 mock，位置取决于用户实际出逃次数
  const myCount = Number(userCount) || 0
  const myEntry = {
    name: userName || '我',
    count: myCount,
    mode: 'smart',
    modeColor: MODE_COLORS.smart,
    avatar: userAvatar || DEFAULT_AVATAR,
    isMe: true
  }

  // 在 0..19 中选一个位置插入用户（替换原本那一项），位置由 myCount 决定
  // myCount 越大，位置越靠前；myCount=0 则替换第 19 位
  let insertIdx = 19
  for (let i = 0; i < list.length; i++) {
    if (myCount >= list[i].count) { insertIdx = i; break }
  }
  list[insertIdx] = myEntry

  // 倒序排序并赋予排名
  list.sort((a, b) => b.count - a.count)
  list.forEach((p, i) => { p.rank = i + 1 })

  return list
}

function splitPodiumAndList(list) {
  const podium = {
    first: list.find(p => p.rank === 1) || null,
    second: list.find(p => p.rank === 2) || null,
    third: list.find(p => p.rank === 3) || null
  }
  const rest = list.filter(p => p.rank >= 4)
  return { podium, rest }
}

Page({
  data: {
    statusBarHeight: 20,
    tabs: TABS,
    activeTab: 'week',
    podium: { first: null, second: null, third: null },
    rest: [],
    myRank: 0,
    myCount: 0,
    myName: ''
  },

  onLoad() {
    const nav = app.getNavMetrics ? app.getNavMetrics() : {}
    this.setData({ statusBarHeight: nav.statusBarHeight || 20, navHeaderStyle: nav.navHeaderStyle || '' })
    this.refreshBoard('week')
  },

  goBack() { wx.navigateBack({ delta: 1 }) },

  switchTab(e) {
    const id = e.currentTarget.dataset.id
    if (id === this.data.activeTab) return
    this.setData({ activeTab: id })
    this.refreshBoard(id)
  },

  refreshBoard(tabId) {
    const tab = TABS.find(t => t.id === tabId) || TABS[0]
    const gd = app.globalData || {}
    const userName = gd.escapeName || '我'
    const userAvatar = gd.avatarUrl || DEFAULT_AVATAR
    const userCount = (Array.isArray(gd.records) ? gd.records.length : 0)

    const list = buildEntries(tab.scale, userCount, userName, userAvatar)
    const { podium, rest } = splitPodiumAndList(list)
    const me = list.find(p => p.isMe)

    this.setData({
      podium,
      rest,
      myRank: me ? me.rank : 0,
      myCount: me ? me.count : 0,
      myName: userName
    })
  },

  tapRow() {
    wx.showToast({ title: 'TA的出逃故事即将开放', icon: 'none' })
  },

  scrollToMe() {
    wx.showToast({ title: '我的排名 #' + this.data.myRank, icon: 'none' })
  }
})
