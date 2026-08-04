const app = getApp()
const { TYPE_META, DEFAULT_STEPS } = require('../../utils/constants.js')

// 容器高宽比近似（500rpx 高 / ~670rpx 宽），用于把百分比坐标换算成视觉角度与线长。
const ASPECT_RATIO = 0.75

// 基于 record id 的简易确定性伪随机：同一条记录每次回放都是同一条路线。
function seededRand(seed) {
  let s = 0
  for (let i = 0; i < seed.length; i++) s = (s * 31 + seed.charCodeAt(i)) >>> 0
  return function () {
    s = (s * 1103515245 + 12345) & 0x7fffffff
    return s / 0x7fffffff
  }
}

// 把角度与线长换算成可在 WXML 里直接 style 的字段。
function buildLines(waypoints) {
  const lines = []
  for (let i = 0; i < waypoints.length - 1; i++) {
    const a = waypoints[i]
    const b = waypoints[i + 1]
    const dx = b.x - a.x
    const dy = b.y - a.y
    const dyScaled = dy * ASPECT_RATIO
    const angle = Math.atan2(dyScaled, dx) * 180 / Math.PI
    const length = Math.sqrt(dx * dx + dyScaled * dyScaled)
    lines.push({
      x1: a.x,
      y1: a.y,
      x2: b.x,
      y2: b.y,
      length: length.toFixed(2),
      angle: angle.toFixed(2)
    })
  }
  return lines
}

// 生成 4-6 个路点，首点为起点 S，末点为终点 E，中间为类型色点。
function buildWaypoints(rand, typeColor, count) {
  const n = Math.max(4, Math.min(6, count))
  const margin = 14
  const pts = []
  // 起点偏左下
  pts.push({ x: margin + rand() * 8, y: 70 + rand() * 12, role: 'start', label: 'S', color: '#5CBF9E' })
  // 中间路点呈之字形向右上展开
  for (let i = 1; i < n - 1; i++) {
    const t = i / (n - 1)
    const x = margin + 10 + t * (100 - 2 * margin - 20) + (rand() - 0.5) * 10
    const y = 70 - t * 50 + (rand() - 0.5) * 18
    pts.push({ x: Math.max(8, Math.min(88, x)), y: Math.max(12, Math.min(82, y)), role: 'mid', color: typeColor })
  }
  // 终点偏右上
  pts.push({ x: 100 - margin - rand() * 8, y: 18 + rand() * 10, role: 'end', label: 'E', color: '#E05555' })
  return pts
}

// 把记录的 steps 与时长切成时间轴节点。
function buildTimeline(record, steps) {
  const baseTime = record.time || '12:00'
  const [hh, mm] = baseTime.split(':').map(n => parseInt(n, 10) || 0)
  const dur = record.duration || 20
  const startTotal = hh * 60 + mm - dur
  const fmt = (total) => {
    const h = ((total % 1440) + 1440) % 1440
    return `${String(Math.floor(h / 60)).padStart(2, '0')}:${String(h % 60).padStart(2, '0')}`
  }
  const startName = record.locationName || app.globalData.locationName || '出发地'
  const timeline = [{
    time: fmt(startTotal),
    title: '出发',
    sub: startName,
    color: '#5CBF9E'
  }]
  steps.forEach((text, idx) => {
    const t = startTotal + Math.round(dur * (idx + 1) / (steps.length + 1))
    timeline.push({
      time: fmt(t),
      title: `Step ${idx + 1}：${text}`,
      color: record.typeColor || '#5B8FB9'
    })
  })
  timeline.push({
    time: baseTime,
    title: '完成',
    sub: '本次出逃终点',
    color: '#E05555'
  })
  return timeline
}

Page({
  data: {
    statusBarHeight: 20,
    record: null,
    waypoints: [],
    lines: [],
    timeline: [],
    stats: { distance: '0.0', duration: 0, steps: 0, photos: 0 },
    gridH: [20, 40, 60, 80],
    gridV: [16, 33, 50, 66, 83]
  },

  onLoad(options) {
    const nav = app.getNavMetrics ? app.getNavMetrics() : {}
    this.setData({ statusBarHeight: nav.statusBarHeight || 20, navHeaderStyle: nav.navHeaderStyle || '' })
    const id = options && options.id
    if (!id) {
      this.setData({ record: null })
      return
    }
    const records = (app.globalData && app.globalData.records) || []
    const record = records.find(r => r.id === id) || null
    if (!record) {
      this.setData({ record: null })
      return
    }
    this.buildRoute(record)
  },

  buildRoute(record) {
    const rand = seededRand(record.id + (record.date || ''))
    const typeColor = record.typeColor || (TYPE_META[record.commandType] && TYPE_META[record.commandType].color) || '#5B8FB9'

    // 步骤文案：优先 record.steps；否则退到 DEFAULT_STEPS。
    const steps = Array.isArray(record.steps) && record.steps.length
      ? record.steps
      : DEFAULT_STEPS

    const waypoints = buildWaypoints(rand, typeColor, steps.length + 2)
    const lines = buildLines(waypoints)
    const timeline = buildTimeline(record, steps)

    // mock 总距离 0.5-3km，按记录 id 钉死避免每次刷新都变。
    const distance = (0.5 + rand() * 2.5).toFixed(1)
    const photos = (record.photos && record.photos.length) || 0

    this.setData({
      record,
      waypoints,
      lines,
      timeline,
      stats: {
        distance,
        duration: record.duration || 0,
        steps: steps.length,
        photos
      }
    })
  },

  goDetail() {
    const id = this.data.record && this.data.record.id
    if (!id) return
    wx.navigateTo({
      url: `/pages/record-detail/record-detail?id=${id}`,
      fail: () => {
        // record-detail 尚未上线时，退回到上一页避免卡死。
        wx.showToast({ title: '记录详情即将上线', icon: 'none' })
      }
    })
  },

  goBack() { wx.navigateBack({ delta: 1 }) }
})
