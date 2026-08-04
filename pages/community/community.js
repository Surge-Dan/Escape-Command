const app = getApp()
const community = require('../../data/community.js')
const { normalizeType, getTypeMeta } = require('../../utils/constants.js')  // 保留在主包 utils 中

Page({
  data: {
    statusBarHeight: 20,
    activeTab: 'hot',
    feed: [],
    likedCommands: [],
    collectedIds: []
  },

  onLoad() {
    const nav = app.getNavMetrics ? app.getNavMetrics() : {}
    this.setData({ statusBarHeight: nav.statusBarHeight || 20, navHeaderStyle: nav.navHeaderStyle || '' })
    this.loadFeed()
  },

  onShow() {
    this.loadFeed()
  },

  onPullDownRefresh() {
    this.loadFeed()
    wx.stopPullDownRefresh()
    wx.showToast({ title: '已刷新', icon: 'none', duration: 800 })
  },

  loadFeed() {
    const liked = wx.getStorageSync('likedCommands') || []
    const collectedIds = app.globalData.collectedCommands || []

    const commands = community.map(cmd => {
      const type = normalizeType(cmd.type)
      const meta = getTypeMeta(type)
      const isLiked = liked.indexOf(cmd.id) >= 0
      return {
        id: cmd.id,
        content: cmd.content,
        type,
        typeName: meta.name,
        typeColor: cmd.typeColor || meta.color,
        typeIcon: meta.icon,
        duration: cmd.duration || 15,
        author: cmd.author,
        authorAvatar: cmd.authorAvatar,
        createdAt: cmd.createdAt,
        tags: cmd.tags || [],
        featured: !!cmd.featured,
        baseLikes: cmd.likes || 0,
        liked: isLiked,
        likeCount: (cmd.likes || 0) + (isLiked ? 1 : 0),
        isCollected: collectedIds.indexOf(cmd.id) >= 0
      }
    })

    let sorted = []
    if (this.data.activeTab === 'hot') {
      sorted = commands.slice().sort((a, b) => b.likeCount - a.likeCount)
    } else if (this.data.activeTab === 'new') {
      sorted = commands.slice().sort((a, b) => {
        const ta = new Date(a.createdAt).getTime()
        const tb = new Date(b.createdAt).getTime()
        if (tb !== ta) return tb - ta
        return b.likeCount - a.likeCount
      })
    }
    // following tab -> empty state, no feed

    this.setData({
      feed: sorted,
      likedCommands: liked,
      collectedIds
    })
  },

  switchTab(e) {
    const tab = e.currentTarget.dataset.tab
    if (tab === this.data.activeTab) return
    this.setData({ activeTab: tab })
    this.loadFeed()
  },

  toggleLike(e) {
    const id = e.currentTarget.dataset.id
    let liked = this.data.likedCommands.slice()
    const wasLiked = liked.indexOf(id) >= 0
    if (wasLiked) {
      liked = liked.filter(x => x !== id)
    } else {
      liked.push(id)
    }
    wx.setStorageSync('likedCommands', liked)

    const feed = this.data.feed.map(cmd => {
      if (cmd.id !== id) return cmd
      const newLiked = !cmd.liked
      return {
        ...cmd,
        liked: newLiked,
        likeCount: newLiked ? cmd.likeCount + 1 : cmd.likeCount - 1
      }
    })

    this.setData({ feed, likedCommands: liked })
  },

  collectCommand(e) {
    const id = e.currentTarget.dataset.id
    let collected = app.globalData.collectedCommands || []
    if (collected.indexOf(id) >= 0) {
      wx.showToast({ title: '已经在收藏里了', icon: 'none' })
      return
    }
    collected.push(id)
    app.globalData.collectedCommands = collected
    app.saveToLocal('collectedCommands', collected)

    const feed = this.data.feed.map(cmd => {
      if (cmd.id !== id) return cmd
      return { ...cmd, isCollected: true }
    })
    this.setData({ feed, collectedIds: collected })
    wx.showToast({ title: '已收藏到我的收藏', icon: 'success' })
  },

  shareCommand(e) {
    const id = e.currentTarget.dataset.id
    const cmd = this.data.feed.find(c => c.id === id)
    if (!cmd) return
    wx.setClipboardData({
      data: `「出逃指令」${cmd.content} —— ${cmd.author}`,
      success: () => {
        wx.showToast({ title: '已复制分享文案', icon: 'none' })
      }
    })
  },

  goBrowse() {
    wx.switchTab({ url: '/pages/index/index' })
  },

  goBack() {
    wx.navigateBack({ delta: 1 })
  }
})
