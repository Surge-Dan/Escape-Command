// cloudfunctions/poiSearch/index.js
// 真实定位 POI 搜索：腾讯地图 WebService（逆地理编码 + 周边搜索）
//
// 入参：{ lat, lng }
// 出参：{ ok:true, city, district, locationName, pois:[] } 或 { ok:false, errCode }
//
// 部署：上传并部署「云端安装依赖（不上传 node_modules）」
// 环境变量：TENCENT_MAP_KEY=<腾讯地图 WebService API key>
//   申请：https://lbs.qq.com/ 注册 → 创建应用 → 添加 key（产品选 WebService API）
//   配置：微信开发者工具 → 云开发控制台 → 云函数 poiSearch → 环境变量
//
// 未配置 key 时返回 NO_MAP_KEY，app.js 降级到 mock nearbyPOI + 抽象指令池，主流程不挂。

const cloud = require('wx-server-sdk')
const https = require('https')
cloud.init({ env: 'dev1-d2gchwpba51a6091b' })

// 周边搜索分类：腾讯地图 keyword → 指令 type
var POI_CATEGORIES = [
  { keyword: '咖啡', type: 'food' },
  { keyword: '美食', type: 'food' },
  { keyword: '公园', type: 'walk' },
  { keyword: '博物馆', type: 'culture' },
  { keyword: '书店', type: 'culture' },
  { keyword: '便利店', type: 'collect' },
  { keyword: '市场', type: 'collect' }
]

// 封装 https.get 为 Promise，超时/异常统一 resolve(null)，不抛错
function httpGet(url) {
  return new Promise(function (resolve) {
    var req = https.get(url, function (res) {
      var data = ''
      res.on('data', function (chunk) { data += chunk })
      res.on('end', function () {
        try { resolve(JSON.parse(data)) } catch (e) { resolve(null) }
      })
    })
    req.on('error', function () { resolve(null) })
    req.setTimeout(4000, function () { req.destroy(); resolve(null) })
  })
}

exports.main = async function (event) {
  var key = process.env.TENCENT_MAP_KEY
  if (!key) return { ok: false, errCode: 'NO_MAP_KEY' }

  var lat = Number(event && event.lat)
  var lng = Number(event && event.lng)
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return { ok: false, errCode: 'INVALID_PARAM' }
  }
  var loc = lat + ',' + lng

  // 1. 逆地理编码 → city / district
  var geoUrl = 'https://apis.map.qq.com/ws/geocoder/v1/?location=' + loc + '&key=' + key
  var geoRes = await httpGet(geoUrl)
  var city = ''
  var district = ''
  if (geoRes && geoRes.status === 0 && geoRes.result) {
    var comp = geoRes.result.address_component || {}
    city = comp.city || ''
    district = comp.district || ''
  }

  // 2. 多分类并发周边搜索（radius=1000m）
  var promises = POI_CATEGORIES.map(function (cat) {
    var url = 'https://apis.map.qq.com/ws/place/v1/explore?location=' + loc +
      '&key=' + key + '&keyword=' + encodeURIComponent(cat.keyword) +
      '&radius=1000&offset=10&page=1'
    return httpGet(url).then(function (res) {
      if (!res || res.status !== 0 || !Array.isArray(res.data)) return []
      return res.data.map(function (p) {
        return {
          id: p.id || '',
          name: p.title || '',
          address: p.address || '',
          latitude: p.location ? p.location.lat : 0,
          longitude: p.location ? p.location.lng : 0,
          category: cat.keyword,
          type: cat.type,
          distance: p._distance || 0
        }
      })
    })
  })
  var results = await Promise.all(promises)

  // 3. 合并去重（按 name，同名只保留距离最近的）
  var seen = {}
  var pois = []
  results.forEach(function (arr) {
    arr.forEach(function (p) {
      if (!p.name || !p.latitude || !p.longitude) return
      if (seen[p.name]) return
      seen[p.name] = true
      pois.push(p)
    })
  })

  // 4. 按距离升序排序
  pois.sort(function (a, b) { return (a.distance || 0) - (b.distance || 0) })

  return {
    ok: true,
    city: city,
    district: district,
    locationName: city && district ? (city + '·' + district) : (city || ''),
    pois: pois.slice(0, 40)
  }
}
