// 裁剪骰子3D图片的透明留白（trim），让骰子填满画布
const sharp = require('sharp')
const path = require('path')

const imgDir = path.join(__dirname, '..', 'assets/images')

const files = [
  { src: '红色骰子3d.png', dst: 'dice-red-final.png' },
  { src: '紫色骰子3d.png', dst: 'dice-purple-final.png' },
  { src: '绿色骰子3d.png', dst: 'dice-green-final.png' }
]

async function trim(file) {
  const srcPath = path.join(imgDir, file.src)
  const { data, info } = await sharp(srcPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const { width: w, height: h, channels: c } = info

  let minX = w, minY = h, maxX = 0, maxY = 0
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const a = data[(y * w + x) * c + 3]
      if (a > 5) {
        if (x < minX) minX = x
        if (y < minY) minY = y
        if (x > maxX) maxX = x
        if (y > maxY) maxY = y
      }
    }
  }
  // 留一点padding避免切到边缘阴影
  const pad = 30
  minX = Math.max(0, minX - pad)
  minY = Math.max(0, minY - pad)
  maxX = Math.min(w - 1, maxX + pad)
  maxY = Math.min(h - 1, maxY + pad)
  const cropW = maxX - minX + 1
  const cropH = maxY - minY + 1

  console.log(`${file.src}: ${w}x${h} → 裁剪区域(${minX},${minY}) ${cropW}x${cropH}`)
  // 输出到-trim后缀文件，不覆盖原图
  await sharp(srcPath)
    .extract({ left: minX, top: minY, width: cropW, height: cropH })
    .png()
    .toFile(path.join(imgDir, file.dst))
}

;(async () => {
  console.log('=== 裁剪骰子透明留白 ===\n')
  for (const f of files) await trim(f)
  console.log('\n=== 完成 ===')
})()
