# v8 UI 打磨与城市选择器 Checklist

## A. 首页 Hero 字体（Task 1）
- [x] `pages/index/index.js` 中使用 `wx.loadFontFace` 加载网络字体
- [x] 加载成功后应用 `.font-loaded` 类，失败时仍有系统字体回退
- [x] 真机预览首页 Hero 中文字体显示为宋体/思源宋体风格，而非默认黑体

## B. Hero 句号移除（Task 2）
- [x] `pages/index/index.wxml` 中 `{{heroTail}}.` 后无句号
- [x] 首页 Hero 第二行渲染为「出门透口气」无句点

## C. 顶部渐变无白条（Task 3）
- [x] 首页 `status-bar` 与 `nav-header` 背景融入暖橙渐变，无白色条
- [x] 导航栏毛玻璃效果不破坏渐变观感
- [x] 其他页面导航栏不受首页渐变影响

## D. 导航栏右侧对齐（Task 4）
- [x] 地图页右上角「当前城市」与小程序胶囊按钮垂直对齐、水平安全间距充足
- [x] 收藏夹页右上角「管理」与小程序胶囊按钮垂直对齐、水平安全间距充足
- [x] 右侧按钮点击区域不与胶囊按钮重叠

## E. 城市选择器（Task 5）
- [x] 城市数据覆盖全国所有地级市/直辖市辖区
- [x] 热门推荐城市以大卡片展示（2 列或横向滚动）
- [x] 其他城市按省份分组，使用紧凑小卡片（每行 3-4 个）
- [x] 省份标题清晰，分组滚动流畅
- [x] 选中城市、当前城市标记、专属指令、确认切换功能正常

## F. 卫星地图 Subkey 文档（Task 6）
- [x] 文档中包含腾讯 LBS Key 申请与开启卫星图能力的步骤
- [x] `pages/map/map.js` 中 `mapSubkey` 读取路径清晰

## G. 最终验证（Task 7）
- [x] `scripts/check-syntax.js` 通过
- [x] `scripts/final-check.js` 通过
- [x] `scripts/audit-icons.js` 通过
- [x] `scripts/validate-svgs.js` 通过
- [x] 真机预览确认问题 1-5 全部解决
