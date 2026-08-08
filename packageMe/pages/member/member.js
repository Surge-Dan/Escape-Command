const app = getApp()

Page({
  data: {
    isMember: false,
    expireDate: '',
    statusBarHeight: 20,
    capsuleTop: 26,
    selectedPlan: 0,
    plans: [
      { id: 0, price: '3', unit: '首月', original: '12', desc: '首月特惠', tag: '体验' },
      { id: 1, price: '12', unit: '/月', desc: '连续包月，随时取消', tag: '推荐' },
      { id: 2, price: '68', unit: '/年', desc: '平均5.7元/月', tag: '超值' }
    ],
    benefits: [
      { icon: '/assets/icons/users-lavender.svg', title: '双人出逃', desc: '解锁双人模式，和朋友一起冒险' },
      { icon: '/assets/icons/refresh-cw-ink-soft.svg', title: '无限重摇', desc: '不喜欢？摇到满意为止' },
      { icon: '/assets/icons/award-lemon.svg', title: '专属徽章', desc: '会员限定金色徽章' },
      { icon: '/assets/icons/pencil-brand.svg', title: '自定义指令', desc: '创建无限条专属指令' },
      { icon: '/assets/icons/bookmark-brand.svg', title: '实体手账折扣', desc: '定制印刷手账享8折优惠' },
      { icon: '/assets/icons/cloud-rain-sky.svg', title: '云端备份', desc: '记录永不丢失' }
    ]
  },

  onLoad() {
    this.applyNavMetrics()
    const ms = app.globalData.memberStatus || {}
    this.setData({
      isMember: ms.isMember || false,
      expireDate: ms.expireDate || ''
    })
  },

  applyNavMetrics() {
    const nav = app.getNavMetrics ? app.getNavMetrics() : {}
    this.setData({
      statusBarHeight: nav.statusBarHeight || 20,
      capsuleTop: nav.capsuleTop || 26,
      navHeaderStyle: nav.navHeaderStyle || ''
    })
  },

  goBack() {
    wx.navigateBack()
  },

  selectPlan(e) {
    const id = e.currentTarget.dataset.id
    this.setData({ selectedPlan: id })
  },

  subscribe() {
    const plan = this.data.plans[this.data.selectedPlan]
    wx.showModal({
      title: '确认开通',
      content: '开通会员 ¥' + plan.price + plan.unit + '，支持微信自动续费，可随时取消',
      confirmText: '确认开通',
      cancelText: '再想想',
      success: (res) => {
        if (res.confirm) {
          this.doSubscribe()
        }
      }
    })
  },

  doSubscribe() {
    wx.showLoading({ title: '处理中...' })
    setTimeout(() => {
      wx.hideLoading()
      const expireDate = new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString().slice(0, 10)
      app.globalData.memberStatus = {
        isMember: true,
        expireDate: expireDate
      }
      app.saveToLocal('memberStatus', app.globalData.memberStatus)
      this.setData({ isMember: true, expireDate: expireDate })
      wx.showToast({ title: '欢迎成为会员！', icon: 'success' })
      setTimeout(() => {
        wx.navigateBack()
      }, 1500)
    }, 1000)
  },

  restorePurchase() {
    wx.showToast({ title: '正在检查购买记录...', icon: 'none' })
  },

  viewAgreement() {
    wx.showModal({
      title: '会员服务协议',
      content: '会员权益仅供账号本人使用，不可转让。自动续费可随时在微信支付中取消。',
      showCancel: false,
      confirmText: '知道了'
    })
  }
})
