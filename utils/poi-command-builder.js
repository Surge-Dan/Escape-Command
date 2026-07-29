// utils/poi-command-builder.js
// POI → 出逃指令构建器（纯函数，零 wx 依赖）
//
// 把云函数 poiSearch 返回的真实周边商铺/打卡点 POI 列表，
// 转换为带具体地点的出逃指令（如「去「XX咖啡馆」打卡」）。
//
// 与 data/commands.js 的 223 条抽象指令池并存：
//   - POI 指令注入 commandPool 头部，引擎既有过滤逻辑（90 天去重/类型抑制/营业时间）继续生效
//   - POI 指令自带 location，完成后记录自动带坐标 → 地图标记闭环
//   - requirePOI 置 null，避免被 engine.filterByConditions 的 POI 可达性校验误杀
//
// 可在 Node 直接 require 测试，无需 mock wx。

'use strict'

// 腾讯地图 category 关键字 → 指令 type 映射
// 顺序敏感：先匹配更具体的（如「咖啡馆」优先于「咖啡」）
var POI_TYPE_MAP = {
  '咖啡': 'food',
  '茶': 'food',
  '美食': 'food',
  '餐厅': 'food',
  '小吃': 'food',
  '公园': 'walk',
  '广场': 'walk',
  '景点': 'walk',
  '湖泊': 'walk',
  '博物馆': 'culture',
  '美术馆': 'culture',
  '展览': 'culture',
  '书店': 'culture',
  '图书馆': 'culture',
  '便利店': 'collect',
  '市场': 'collect',
  '超市': 'collect',
  '影剧院': 'sense',
  '剧场': 'sense',
  '音乐': 'sense'
}

// category → type，未命中默认 color（颜色探索，对地点无依赖）
function mapType(category) {
  if (typeof category !== 'string' || !category) return 'color'
  var keys = Object.keys(POI_TYPE_MAP)
  for (var i = 0; i < keys.length; i++) {
    if (category.indexOf(keys[i]) >= 0) return POI_TYPE_MAP[keys[i]]
  }
  return 'color'
}

// type → 估算时长（分钟），与 engine FALLBACK_COMMANDS 风格对齐
function estimateDuration(type) {
  switch (type) {
    case 'food': return 20
    case 'walk': return 25
    case 'culture': return 30
    case 'collect': return 15
    case 'sense': return 20
    case 'color': return 15
    default: return 15
  }
}

// 构建单条 POI 指令
function buildOne(poi, ctx) {
  if (!poi || typeof poi !== 'object') return null
  var name = typeof poi.name === 'string' ? poi.name : ''
  if (!name) return null
  var lat = Number(poi.latitude)
  var lng = Number(poi.longitude)
  // 无有效坐标的 POI 无法落到地图，丢弃
  // Number.isFinite(0)=true，但业务上 0,0 是未初始化默认值（中国大陆坐标均非 0），需额外排除
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  if (lat === 0 && lng === 0) return null
  var type = mapType(poi.category)
  var poiId = poi.id || (lat + '_' + lng)
  return {
    id: 'poi_' + poiId,
    poiId: poiId,
    content: '去「' + name + '」打卡',
    title: name,
    type: type,
    duration: estimateDuration(type),
    outdoor: type === 'walk' || type === 'collect',
    nightSafe: type !== 'food' && type !== 'walk',
    rainy: type !== 'walk',
    requirePOI: null,  // 已带地点，不再校验 nearbyPOI 可达性
    cost: type === 'food' ? 30 : 0,
    double: false,
    tip: '到了拍一张，留下你的出逃痕迹',
    location: {
      latitude: lat,
      longitude: lng,
      name: name,
      address: typeof poi.address === 'string' ? poi.address : '',
      city: (ctx && ctx.city) || ''
    }
  }
}

// 主入口：批量构建 + 偏好加权 + 多样性保证
//   pois: 云函数返回的 POI 数组
//   prefs: { type: {color:n, food:n, ...} } 用户偏好（顶层类型加权）
//   ctx: { city, hour, weather }
function buildCommands(pois, prefs, ctx) {
  if (!Array.isArray(pois) || pois.length === 0) return []
  var c = ctx && typeof ctx === 'object' ? ctx : {}
  var prefMap = (prefs && prefs.type && typeof prefs.type === 'object') ? prefs.type : {}

  // 顶层偏好类型
  var topType = ''
  try {
    topType = Object.keys(prefMap).sort(function (a, b) {
      return (prefMap[b] || 0) - (prefMap[a] || 0)
    })[0] || ''
  } catch (e) {
    topType = ''
  }

  // 构建并按 id 去重
  var seen = {}
  var list = []
  for (var i = 0; i < pois.length; i++) {
    var cmd = buildOne(pois[i], c)
    if (!cmd) continue
    if (seen[cmd.id]) continue
    seen[cmd.id] = true
    list.push(cmd)
  }

  // 偏好加权排序：顶层偏好类型排前
  if (topType) {
    list.sort(function (a, b) {
      var aTop = a.type === topType ? -1 : 0
      var bTop = b.type === topType ? -1 : 0
      return aTop - bTop
    })
  }

  // 多样性保证：每类型至少 1 条入选
  var byType = {}
  list.forEach(function (cmd) {
    if (!byType[cmd.type]) byType[cmd.type] = []
    byType[cmd.type].push(cmd)
  })
  var result = []
  Object.keys(byType).forEach(function (t) {
    if (byType[t][0]) result.push(byType[t][0])
  })
  // 剩余按加权顺序补齐
  list.forEach(function (cmd) {
    if (result.indexOf(cmd) < 0) result.push(cmd)
  })

  // 上限 20 条
  return result.slice(0, 20)
}

module.exports = {
  buildCommands: buildCommands,
  buildOne: buildOne,
  mapType: mapType,
  estimateDuration: estimateDuration,
  _internal: {
    POI_TYPE_MAP: POI_TYPE_MAP
  }
}
