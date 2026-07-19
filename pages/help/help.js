const app = getApp()

Page({
  data: {
    statusBarHeight: 20,
    guide: [
      { q: '如何开始第一次出逃？', a: '打开首页，点击中间的出逃卡片，系统会为你随机匹配一条指令。如果不喜欢，可以重新摇一次（每天 3 次机会）。看到心仪的指令后，点击「开始出逃」进入执行页，跟着步骤走就行。', open: true },
      { q: '6 个模式有什么区别？', a: '', open: false },
      { q: '如何收藏喜欢的指令？', a: '在指令详情页点击书签图标，即可收藏到「我的收藏」。收藏的指令随时可以再次出逃，且不会消耗每日次数。长按收藏列表中的卡片可快速取消收藏。', open: false },
      { q: '徽章怎么解锁？', a: '完成特定条件自动解锁，比如完成第一次出逃解锁「初次出逃」、连续 7 天出逃解锁「七连胜」、深夜出逃 5 次解锁「夜行者」。每个徽章都有专属图标和故事。', open: false }
    ],
    modes: [
      { id: 'smart', name: '智能匹配', desc: '算法懂你，根据你的偏好随机推荐', icon: '/assets/icons/dice-5-brand-strong.svg', color: '#5CBF9E' },
      { id: 'micro', name: '微出逃', desc: '碎片时间，15 分钟以内的快速出逃', icon: '/assets/icons/sprout-brand-strong.svg', color: '#7BAE7F' },
      { id: 'walk', name: '城市漫游', desc: '户外长线，深度探索街区', icon: '/assets/icons/footprints-coral.svg', color: '#D98A5C' },
      { id: 'double', name: '双人出逃', desc: '邀请朋友一起完成的指令', icon: '/assets/icons/users-lavender.svg', color: '#9B7BB8' },
      { id: 'night', name: '深夜出逃', desc: '夜色独白，适合夜晚的安静漫步', icon: '/assets/icons/moon-gray.svg', color: '#9B8EC4' },
      { id: 'rainy', name: '雨天出逃', desc: '雨中漫步或室内寻觅的专属指令', icon: '/assets/icons/cloud-rain-sky.svg', color: '#7EC8F5' }
    ],
    faq: [
      { q: '出逃次数用完了怎么办？', a: '每天凌晨自动重置为 3 次。第二天回来继续即可，不用焦虑，留点期待给明天。', open: false },
      { q: '可以自定义指令吗？', a: 'v3.0 暂不支持自定义指令，后续版本会开放 UGC 创作入口，让你也能设计出逃任务。', open: false },
      { q: '数据会丢失吗？', a: '所有数据保存在本地（微信小程序存储），不会上传服务器。卸载小程序或清理微信缓存会删除数据，且无法恢复，更换设备需重新开始。', open: false },
      { q: '双人出逃怎么玩？', a: '选择双人模式，邀请朋友一起完成指令。指令会包含需要协作或互动的步骤，适合和朋友、伴侣一起给城市制造一点小回忆。', open: false },
      { q: '为什么有些指令看不到？', a: '部分指令受天气、时间、位置限制——比如深夜不出现在白天、雨天不出现在晴天、需要便利店的指令在附近没有时不会推荐。这是为了让指令更贴你的当下。', open: false }
    ],
    tips: [
      { icon: '/assets/icons/layers-ink-soft.svg', tint: '#E0F5EF', title: '多尝试不同模式', desc: '每个模式有专属指令池，换一种模式可能遇见完全不同的城市' },
      { icon: '/assets/icons/camera-ink-soft.svg', tint: '#FFF0E6', title: '记得拍照记录', desc: '拍立得会保存在地图和时间线，慢慢拼成你的城市记忆' },
      { icon: '/assets/icons/award-brand-strong.svg', tint: '#FFF0D4', title: '完成每日挑战', desc: '获得额外徽章进度，连续出逃解锁稀有徽章' }
    ]
  },

  onLoad() {
    const nav = app.getNavMetrics ? app.getNavMetrics() : {}
    this.setData({ statusBarHeight: nav.statusBarHeight || 20, navHeaderStyle: nav.navHeaderStyle || '' })
  },

  toggle(e) {
    const { group, index } = e.currentTarget.dataset
    const list = this.data[group].slice()
    list[index] = Object.assign({}, list[index], { open: !list[index].open })
    this.setData({ [group]: list })
  },

  openFeedback() {
    wx.showModal({
      title: '反馈建议',
      editable: true,
      placeholderText: '遇到问题了？还是想要新功能？都告诉我们',
      success: (res) => {
        if (res.confirm && res.content && res.content.trim()) {
          wx.showToast({ title: '感谢你的反馈', icon: 'success' })
        }
      }
    })
  },

  goBack() {
    wx.navigateBack({ delta: 1 })
  }
})
