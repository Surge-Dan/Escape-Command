// 图片加载失败兜底工具
// 统一处理 <image binderror> 事件，避免破图
//
// 用法（WXML）：
//   单字段：  <image src="{{avatarUrl}}" binderror="onImgError" data-field="avatarUrl" data-fallback="/assets/avatar-default.webp"></image>
//   列表项：  <image src="{{item.avatar}}" binderror="onImgError" data-list="partners" data-index="{{index}}" data-key="avatar" data-fallback="/assets/avatar-default.webp"></image>
//
// 用法（JS）：
//   const imageFallback = require('../../utils/image-fallback.js')
//   Page({
//     onImgError(e) { imageFallback.handle(e, this) },
//     ...
//   })
//
// 兜底图必须是主包 /assets/ 下资源（onLaunch 后必然可用），避免二次失败循环

const DEFAULT_AVATAR = '/assets/avatar-default.webp'
const DEFAULT_PHOTO = '/assets/icons/empty-collection.svg'

// 按点路径读取嵌套值（如 'podium.first.avatar'）
function getByPath(obj, path) {
  if (!path || !obj) return undefined
  const parts = String(path).split('.')
  let cur = obj
  for (let i = 0; i < parts.length; i++) {
    if (cur == null) return undefined
    cur = cur[parts[i]]
  }
  return cur
}

function handle(e, page) {
  const ds = (e && e.currentTarget && e.currentTarget.dataset) || {}
  const fallback = ds.fallback || DEFAULT_AVATAR
  try {
    // 任意 setData 路径场景（如 'podium.first.avatar'）
    if (ds.path) {
      // 已是兜底图则不再触发，防循环
      if (getByPath(page.data, ds.path) === fallback) return
      page.setData({ [ds.path]: fallback })
      return
    }
    // 单字段场景
    if (ds.field) {
      // 已是兜底图则不再触发，防循环
      if (page.data[ds.field] === fallback) return
      page.setData({ [ds.field]: fallback })
      return
    }
    // 列表场景
    if (ds.list && ds.index !== undefined) {
      const list = page.data[ds.list]
      if (!Array.isArray(list)) return
      const idx = parseInt(ds.index, 10)
      if (isNaN(idx) || idx < 0 || idx >= list.length) return
      // 无 key：列表项本身就是 url（字符串数组），直接替换该项
      if (!ds.key) {
        if (list[idx] === fallback) return
        const itemPath = ds.list + '[' + idx + ']'
        page.setData({ [itemPath]: fallback })
        return
      }
      // 有 key：列表项是对象，替换其属性
      const item = list[idx]
      if (!item || item[ds.key] === fallback) return
      const keyPath = ds.list + '[' + idx + '].' + ds.key
      page.setData({ [keyPath]: fallback })
    }
  } catch (err) {
    console.warn('[image-fallback] 处理失败：', err)
  }
}

module.exports = {
  handle,
  DEFAULT_AVATAR,
  DEFAULT_PHOTO
}
