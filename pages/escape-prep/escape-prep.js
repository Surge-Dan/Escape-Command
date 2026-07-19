const app = getApp()

// 根据指令属性和天气生成一份真实可用的物品清单，避免空话。
function buildChecklist(cmd, weather) {
  const list = ['手机（充满电）', '钥匙']
  if (cmd.outdoor !== false) list.push('防晒帽或墨镜')
  if (cmd.duration && cmd.duration > 20) list.push('一瓶水')
  if (cmd.cost && cmd.cost > 0) list.push('少量现金')
  if (cmd.type === 'food') list.push('装得下的小袋子')
  if (cmd.type === 'collect') list.push('一个小袋子或口袋')
  if (cmd.type === 'walk') list.push('一双舒服的鞋')
  if (weather && weather.condition === 'rainy') list.push('雨伞')
  if (weather && weather.condition === 'night') list.push('手电筒（或手机电筒）')
  return Array.from(new Set(list))
}

function weatherSuggestion(weather) {
  const cond = weather && weather.condition
  if (cond === 'rainy') return '有雨，记得带伞，也可以选室内指令'
  if (cond === 'night') return '夜间出行，注意安全，结伴更佳'
  if (cond === 'cloudy') return '阴天光线柔和，拍照很好看'
  if (cond === 'sunny') return '天气不错，适合出逃，记得防晒'
  return '出门前再确认一下天气'
}

const WEATHER_ICON = {
  sunny: '/assets/icons/sun-lemon.svg',
  rainy: '/assets/icons/cloud-rain-sky-fg.svg',
  cloudy: '/assets/icons/cloud-rain-sky-fg.svg',
  night: '/assets/icons/moon-gray.svg'
}

// 天气图标底色（取自设计系统的天气色 --sun/--rain/--cloud/--night，转 rgba 以带透明度）。
// 不能用 var(--x)26 拼接，CSS 变量不支持后缀 alpha。
const WEATHER_TINT = {
  sunny: 'rgba(255, 211, 107, 0.15)',
  rainy: 'rgba(126, 200, 245, 0.18)',
  cloudy: 'rgba(154, 168, 186, 0.18)',
  night: 'rgba(155, 142, 196, 0.18)'
}

Page({
  data: {
    statusBarHeight: 20,
    command: null,
    notFound: false,
    weather: null,
    weatherIcon: '',
    weatherTint: WEATHER_TINT.sunny,
    weatherSuggestion: '',
    checklist: [],
    checkedCount: 0,
    locationName: '当前位置'
  },

  onLoad(options) {
    const nav = app.getNavMetrics ? app.getNavMetrics() : {}
    const id = (options && options.id) ? options.id : ''
    const pool = app.globalData.commandPool || []
    let cmd = pool.find(c => c.id === id)
    if (!cmd) cmd = app.globalData.currentCommand
    if (!cmd) {
      this.setData({ statusBarHeight: nav.statusBarHeight || 20, navHeaderStyle: nav.navHeaderStyle || '', notFound: true })
      return
    }
    const weather = app.globalData.weather || { condition: 'sunny', temperature: 26, description: '晴' }
    const items = buildChecklist(cmd, weather)
    // 前两项（手机、钥匙）默认勾上，避免用户每次都要全点。
    const checklist = items.map((text, i) => ({ text, checked: i < 2 }))
    this.setData({
      statusBarHeight: nav.statusBarHeight || 20,
      navHeaderStyle: nav.navHeaderStyle || '',
      command: cmd,
      weather,
      weatherIcon: WEATHER_ICON[weather.condition] || WEATHER_ICON.sunny,
      weatherTint: WEATHER_TINT[weather.condition] || WEATHER_TINT.sunny,
      weatherSuggestion: weatherSuggestion(weather),
      checklist,
      checkedCount: checklist.filter(c => c.checked).length,
      locationName: app.globalData.locationName || '当前位置'
    })
  },

  goBack() { wx.navigateBack({ delta: 1 }) },

  toggleItem(e) {
    const idx = e.currentTarget.dataset.index
    const checklist = this.data.checklist.slice()
    if (!checklist[idx]) return
    checklist[idx] = Object.assign({}, checklist[idx], { checked: !checklist[idx].checked })
    this.setData({ checklist, checkedCount: checklist.filter(c => c.checked).length })
  },

  depart() {
    const cmd = this.data.command
    if (!cmd) return
    app.startCommand(cmd)
    wx.redirectTo({ url: '/pages/executing/executing' })
  }
})
