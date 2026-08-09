const app = getApp()

Page({
  data: {
    statusBarHeight: 20,
    navHeaderStyle: '',
    guide: [
      { q: '如何开始第一次出逃？', a: '打开首页，点击中间的出逃卡片，系统会为你随机匹配一条指令。如果不喜欢，可以重新摇一次（每天 3 次机会）。看到心仪的指令后，点击「开始出逃」进入执行页，跟着步骤走就行。', open: true },
      { q: '3 种出逃模式有什么区别？', a: '', open: false },
      { q: '如何收藏喜欢的指令？', a: '在指令详情页点击书签图标，即可收藏到「我的收藏」。收藏的指令随时可以再次出逃，且不会消耗每日次数。长按收藏列表中的卡片可快速取消收藏。', open: false },
      { q: '徽章怎么解锁？', a: '完成特定条件自动解锁，比如完成第一次出逃解锁「初次出逃」、连续 7 天出逃解锁「七连胜」、破圈出逃 5 次解锁「破圈者」。每个徽章都有专属图标和故事。', open: false }
    ],
    modes: [
      { id: 'micro', name: '微出逃', desc: '碎片时间，5-15 分钟快速出逃，适合午休/通勤/等人', icon: '/assets/icons/sprout-brand-strong.svg', color: '#7BAE7F' },
      { id: 'breakthrough', name: '破圈出逃', desc: '突破舒适区的小挑战，100 条专属指令，5 大类别', icon: '/assets/icons/breakthrough-dice-purple.svg', color: '#9B7BB8' },
      { id: 'sync', name: '同频组局', desc: '邀请朋友或匹配同频搭子一起出逃，实时位置共享', icon: '/assets/icons/dice-5-brand-strong.svg', color: '#5CBF9E' }
    ],
    faq: [
      { q: '出逃次数用完了怎么办？', a: '微出逃每天 3 次，破圈骰子每天 5 次，凌晨自动重置。第二天回来继续即可，不用焦虑，留点期待给明天。', open: false },
      { q: '破圈骰子为什么要先填画像？', a: '破圈骰子会根据你的运动习惯、社交倾向、兴趣方向等画像匹配任务，让挑战更贴合你。每天 5 次，可在「我的-破圈画像」填写，约 1 分钟完成。', open: false },
      { q: '可以自定义指令吗？', a: '当前版本暂不支持自定义指令，后续版本会开放 UGC 创作入口，让你也能设计出逃任务。', open: false },
      { q: '数据会丢失吗？', a: '所有数据保存在本地（微信小程序存储），不会上传服务器。卸载小程序或清理微信缓存会删除数据，且无法恢复，更换设备需重新开始。', open: false },
      { q: '为什么有些指令看不到？', a: '部分指令受天气、时间、位置限制——比如深夜不出现在白天、雨天优先推荐室内、需要便利店的指令在附近没有时不会推荐。这是为了让指令更贴你的当下。', open: false }
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

  // 重新进入启动页 / 新手引导
  replayOnboarding() {
    wx.showModal({
      title: '启动页 / 新手引导',
      content: '将重新进入新手引导页，不影响你的出逃记录和设置。',
      confirmText: '去体验',
      cancelText: '取消',
      success: (res) => {
        if (!res.confirm) return
        try {
          app.saveToLocal('onboarded', false)
          app.globalData.onboarded = false
        } catch (e) { console.warn('[help] replayOnboarding save failed', e) }
        wx.reLaunch({ url: '/pages/onboarding/onboarding' })
      }
    })
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
