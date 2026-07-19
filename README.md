# 出逃指令

「出逃指令」是一款微信小程序，用随机指令带你短暂逃离日常。打开它，你会收到一条 10～30 分钟的轻量任务：找一块蓝色招牌、听三分钟城市声音、走一条没走过的路……完成后留下照片与心情，地图会替你记住所有出逃记忆。

## 卫星地图 subkey 配置

### 什么是 subkey

项目地图页使用微信小程序原生 `<map>` 组件，并通过 `subkey` 调用 **高德地图（AMap）** 的底图能力。配置标准 Key 与卫星 Key 后，可在「普通 / 卫星 / 路线」三种地图模式间切换。

### 获取步骤

1. 打开 [高德开放平台控制台](https://console.amap.com/dev/key/app)。
2. 登录后新建「应用」，添加 Key：
   - **服务平台**选择「微信小程序」
   - 填写小程序的 **AppID**
   - 建议分别创建两个 Key：一个用于标准地图，一个用于卫星地图（也可共用同一个 Key，只要开通了卫星图权限）
3. 在 Key 管理中找到刚创建的 Key，申请开通 **「卫星图」** 能力（部分高级能力需企业认证或按量额度，具体以高德控制台提示为准）。
4. 在小程序合适的位置（如首次启动或地图页 `onLoad`）把 Key 写入本地存储：

```js
wx.setStorageSync('AMAP_STANDARD_KEY', '你的标准地图Key')
wx.setStorageSync('AMAP_SATELLITE_KEY', '你的卫星地图Key')
```

5. 重新进入「出逃地图」页，切换到「卫星」tab 即可生效。

### 代码示例

在 `pages/map/map.wxml` 中绑定 `subkey`：

```xml
<map
  id="escapeMap"
  class="map-native"
  latitude="{{mapCenter.latitude}}"
  longitude="{{mapCenter.longitude}}"
  scale="{{mapScale}}"
  markers="{{mapMarkers}}"
  subkey="{{mapSubkey}}"
  show-location
  enable-zoom
  enable-scroll
/>
```

在 `pages/map/map.js` 中从本地存储读取并切换：

```js
onLoad() {
  const standardKey = wx.getStorageSync('AMAP_STANDARD_KEY') || ''
  const satelliteKey = wx.getStorageSync('AMAP_SATELLITE_KEY') || ''
  this.setData({
    mapSubkey: standardKey,
    satelliteAvailable: !!satelliteKey
  })
}
```

### 降级说明

如果未配置 `AMAP_SATELLITE_KEY`，点击「卫星」tab 时会提示「请先配置卫星地图 subkey」，并继续停留在普通地图模式，不影响其他功能。

## 首页 Hero 字体配置

首页大标题使用思源宋体（Source Han Serif SC）本地 WOFF2 分片，文件位于 `assets/fonts/`。

- `pages/index/index.js` 在 `onLoad` 中通过 `wx.loadFontFace` 按顺序加载 9 个本地分片（`SourceHanSerifCN1..9`），全部成功后设置 `fontLoaded: true`。
- `pages/index/index.wxss` 在 `.font-loaded .hero-title-line` 中按分片顺序声明 `font-family`，未加载完成前使用系统宋体（`Songti SC` / `STSong` / `SimSun` / `Kaiti SC`）兜底，避免真机显示黑体或默认字体。
- 字体文件总大小约 0.93 MB，小于 1.5 MB 限制；覆盖首页 Hero 全部汉字（问候语、强调词、尾词、日期）。
- 本地字体属于小程序包内资源，**不需要**在「服务器域名」中配置 `downloadFile` 合法域名。
