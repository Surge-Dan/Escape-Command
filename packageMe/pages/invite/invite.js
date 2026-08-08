const app = getApp()

// 简单确定性哈希 → 0..1 的伪随机流，保证同一 escapeCode 渲染同样的二维码
function makeRng(seed) {
  let s = (seed >>> 0) || 1
  return function () {
    s = (s * 1664525 + 1013904223) >>> 0
    return (s >>> 8) / 0xFFFFFF
  }
}

function hashStr(str) {
  let h = 2166136261 >>> 0
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619) >>> 0
  }
  return h
}

// 12×12 极简二维码占位（polaroid 用）
function buildMiniGrid(code) {
  const rng = makeRng(hashStr(code))
  const cells = []
  for (let i = 0; i < 144; i++) cells.push(rng() > 0.5 ? 1 : 0)
  return cells
}

// 21×21 模拟二维码（含三个角的 finder pattern）
function buildQRGrid(code) {
  const size = 21
  const rng = makeRng(hashStr(code) ^ 0x9E3779B9)
  const cells = []
  for (let i = 0; i < size * size; i++) cells.push(rng() > 0.5 ? 1 : 0)

  const setFinder = (sr, sc) => {
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        const onRing = (r === 0 || r === 6 || c === 0 || c === 6)
        const onInner = (r >= 2 && r <= 4 && c >= 2 && c <= 4)
        const idx = (sr + r) * size + (sc + c)
        if (sr + r < size && sc + c < size) cells[idx] = (onRing || onInner) ? 1 : 0
      }
    }
  }
  setFinder(0, 0)
  setFinder(0, size - 7)
  setFinder(size - 7, 0)

  // 留白分隔 finder pattern
  const clearBorder = (sr, sc) => {
    for (let r = -1; r <= 7; r++) {
      for (let c = -1; c <= 7; c++) {
        const rr = sr + r, cc = sc + c
        if (rr < 0 || cc < 0 || rr >= size || cc >= size) continue
        if (r >= 0 && r <= 6 && c >= 0 && c <= 6) continue
        cells[rr * size + cc] = 0
      }
    }
  }
  clearBorder(0, 0)
  clearBorder(0, size - 7)
  clearBorder(size - 7, 0)

  return cells
}

Page({
  data: {
    statusBarHeight: 20,
    escapeName: '',
    escapeCode: '',
    sampleCommand: '找一条都没走过的巷子，互相拍一张背影',
    invitedCount: 0,
    escapeCount: 0,
    qrMiniGrid: [],
    qrGrid: []
  },

  onLoad() {
    const nav = app.getNavMetrics ? app.getNavMetrics() : {}
    const gd = app.globalData || {}
    const escapeName = gd.escapeName || '出逃者'
    const escapeCode = gd.escapeCode || '给城市留一点空白'

    const stats = wx.getStorageSync('inviteStats') || {}
    const invitedCount = Number(stats.invited) || 0
    const escapeCount = Number(stats.escaped) || 0

    this.setData({
      statusBarHeight: nav.statusBarHeight || 20,
      navHeaderStyle: nav.navHeaderStyle || '',
      escapeName,
      escapeCode,
      invitedCount,
      escapeCount,
      qrMiniGrid: buildMiniGrid(escapeCode),
      qrGrid: buildQRGrid(escapeCode)
    })
  },

  goBack() { wx.navigateBack({ delta: 1 }) },

  copyInviteCode() {
    wx.setClipboardData({
      data: this.data.escapeCode,
      success: () => wx.showToast({ title: '邀请码已复制', icon: 'none' })
    })
  },

  generatePoster() {
    wx.showLoading({ title: '海报生成中...', mask: true })
    setTimeout(() => {
      wx.hideLoading()
      wx.showToast({ title: '已保存到相册', icon: 'success' })
    }, 800)
  },

  onShareAppMessage() {
    return {
      title: '一起来出逃吧',
      path: '/pages/index/index'
    }
  }
})
