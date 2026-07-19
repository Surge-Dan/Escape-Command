// utils/ai-image.js
// AI 图像生成封装：调用微信小程序 AI 接口生成场景插画
// 接口参数待用户填写（详见 docs/AI-IMAGE-INTEGRATION.md）

const { buildScenePrompt } = require('./ai-prompt.js')

// ===== 待用户填写的参数 =====
const AI_IMAGE_CONFIG = {
  apiUrl: '',              // AI 服务接口地址（例如微信云函数 URL 或第三方 API）
  apiKey: '',              // API Key（如果有）
  model: '',               // 模型名（例如 'flux-1.1-pro' / 'dall-e-3' / 'midjourney-api'）
  // ===== 通用参数 =====
  defaultSize: '768x512',  // 3:2 横版
  defaultQuality: 85,      // 压缩质量
  timeout: 30000,          // 单次生成超时 30s
  enableCache: true,       // 本地缓存开关
  cacheMaxAge: 30 * 24 * 60 * 60 * 1000,  // 30 天
  cacheMaxCount: 50        // 最多缓存 50 张
}

/**
 * 是否启用 AI 生图（所有必填参数都已填写）
 */
function isEnabled() {
  return !!(AI_IMAGE_CONFIG.apiUrl && AI_IMAGE_CONFIG.model)
}

/**
 * 生成场景插画（按指令）
 * @param {Object} cmd 指令对象
 * @param {Object} ctx 上下文 { weather, hour }
 * @returns {Promise<{path: String, cached: Boolean} | null>}
 */
function generateSceneForCommand(cmd, ctx) {
  if (!isEnabled()) {
    return Promise.resolve(null)
  }
  const prompt = buildScenePrompt(cmd, ctx)
  const cacheKey = buildCacheKey(cmd)
  return generateImage({ prompt, cacheKey, size: AI_IMAGE_CONFIG.defaultSize })
}

/**
 * 通用文生图
 * @param {Object} opts { prompt, cacheKey, size, negativePrompt }
 * @returns {Promise<{path: String, cached: Boolean} | null>}
 */
function generateImage(opts) {
  if (!isEnabled()) return Promise.resolve(null)
  opts = opts || {}
  const cacheKey = opts.cacheKey || ('ai-img-' + Date.now())

  // 1. 查本地缓存
  if (AI_IMAGE_CONFIG.enableCache) {
    const cached = readCache(cacheKey)
    if (cached) {
      return Promise.resolve({ path: cached, cached: true })
    }
  }

  // 2. 调用 AI 接口
  return callAI(opts).then(remoteUrl => {
    if (!remoteUrl) return null
    // 3. 下载到本地
    return downloadAndSave(remoteUrl, cacheKey).then(localPath => {
      return { path: localPath, cached: false }
    })
  }).catch(err => {
    console.warn('[ai-image] 生成失败：', err && err.message)
    return null
  })
}

/**
 * 调用 AI 接口
 * @returns {Promise<String>} 远程图片 URL
 */
function callAI(opts) {
  const { prompt, size, negativePrompt } = opts
  return new Promise((resolve, reject) => {
    const task = wx.request({
      url: AI_IMAGE_CONFIG.apiUrl,
      method: 'POST',
      timeout: AI_IMAGE_CONFIG.timeout,
      header: {
        'Content-Type': 'application/json',
        'Authorization': AI_IMAGE_CONFIG.apiKey ? ('Bearer ' + AI_IMAGE_CONFIG.apiKey) : ''
      },
      data: {
        model: AI_IMAGE_CONFIG.model,
        prompt: prompt,
        size: size || AI_IMAGE_CONFIG.defaultSize,
        negative_prompt: negativePrompt || 'text, watermark, logo, UI, neon, harsh lines, low quality, blurry',
        // ===== 留空待用户填入额外参数 =====
        // 例如：signature / seed / style / num_inference_steps 等
      },
      success: (res) => {
        // 期望返回 { data: { url: 'https://...' } } 或 { url: '...' }
        const data = res.data || {}
        const url = (data.data && data.data.url) || data.url || (data.data && data.data[0] && data.data[0].url)
        if (url) resolve(url)
        else reject(new Error('AI 返回数据格式异常：未找到图片 URL'))
      },
      fail: (err) => reject(err)
    })
    // 超时兜底
    setTimeout(() => {
      try { task && task.abort && task.abort() } catch (e) {}
    }, AI_IMAGE_CONFIG.timeout + 5000)
  })
}

/**
 * 下载远程图片到本地并缓存
 */
function downloadAndSave(remoteUrl, cacheKey) {
  return new Promise((resolve, reject) => {
    wx.downloadFile({
      url: remoteUrl,
      success: (res) => {
        if (res.statusCode !== 200) {
          reject(new Error('下载失败 status=' + res.statusCode))
          return
        }
        const fs = wx.getFileSystemManager()
        const ext = (remoteUrl.match(/\.(webp|jpg|jpeg|png)$/i) || ['.webp'])[0]
        const savedPath = `${wx.env.USER_DATA_PATH}/${cacheKey}${ext}`
        fs.saveFile({
          tempFilePath: res.tempFilePath,
          filePath: savedPath,
          success: (r) => {
            // 写索引到 storage
            writeCacheIndex(cacheKey, r.savedFilePath || savedPath)
            resolve(r.savedFilePath || savedPath)
          },
          fail: (err) => reject(err)
        })
      },
      fail: (err) => reject(err)
    })
  })
}

/**
 * 构造缓存 key
 */
function buildCacheKey(cmd) {
  const id = (cmd && cmd.id) || 'unknown'
  const ver = (cmd && cmd.version) || 'v1'
  return `ai-scene-${id}-${ver}`
}

/**
 * 读取缓存索引
 */
function readCache(cacheKey) {
  try {
    const index = wx.getStorageSync('aiImageIndex') || {}
    const entry = index[cacheKey]
    if (!entry) return null
    // 检查过期
    if (Date.now() - entry.ts > AI_IMAGE_CONFIG.cacheMaxAge) {
      delete index[cacheKey]
      wx.setStorageSync('aiImageIndex', index)
      return null
    }
    // 检查文件是否存在
    const fs = wx.getFileSystemManager()
    try {
      fs.accessSync(entry.path)
      return entry.path
    } catch (e) {
      delete index[cacheKey]
      wx.setStorageSync('aiImageIndex', index)
      return null
    }
  } catch (e) {
    return null
  }
}

/**
 * 写入缓存索引
 */
function writeCacheIndex(cacheKey, path) {
  try {
    const index = wx.getStorageSync('aiImageIndex') || {}
    index[cacheKey] = { path, ts: Date.now() }
    // 超过上限时按 LRU 清理
    const keys = Object.keys(index)
    if (keys.length > AI_IMAGE_CONFIG.cacheMaxCount) {
      keys.sort((a, b) => index[a].ts - index[b].ts)
      const toRemove = keys.slice(0, keys.length - AI_IMAGE_CONFIG.cacheMaxCount)
      toRemove.forEach(k => {
        try {
          const fs = wx.getFileSystemManager()
          fs.unlinkSync(index[k].path)
        } catch (e) {}
        delete index[k]
      })
    }
    wx.setStorageSync('aiImageIndex', index)
  } catch (e) {
    console.warn('[ai-image] 写缓存索引失败：', e)
  }
}

/**
 * 清理过期缓存（app.onLaunch 时调用）
 */
function clearExpiredCache() {
  try {
    const index = wx.getStorageSync('aiImageIndex') || {}
    const now = Date.now()
    let changed = false
    Object.keys(index).forEach(k => {
      if (now - index[k].ts > AI_IMAGE_CONFIG.cacheMaxAge) {
        try {
          const fs = wx.getFileSystemManager()
          fs.unlinkSync(index[k].path)
        } catch (e) {}
        delete index[k]
        changed = true
      }
    })
    if (changed) wx.setStorageSync('aiImageIndex', index)
  } catch (e) {
    console.warn('[ai-image] 清理缓存失败：', e)
  }
}

module.exports = {
  config: AI_IMAGE_CONFIG,
  isEnabled,
  generateSceneForCommand,
  generateImage,
  clearExpiredCache
}
