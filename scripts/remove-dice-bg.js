// 抠除斜角骰子渲染图(dice-*.jpg)白底，输出透明PNG
const sharp = require('sharp')
const fs = require('fs')
const path = require('path')

const root = path.join(__dirname, '..')
const imgDir = path.join(root, 'assets/images')

const sources = [
  { file: 'dice-red.jpg',    out: 'dice-red-3d.png' },
  { file: 'dice-purple.jpg', out: 'dice-purple-3d.png' },
  { file: 'dice-green.jpg',  out: 'dice-green-3d.png' }
]

function floodFillRemoveBg(data, width, height) {
  const visited = new Uint8Array(width * height)
  const queueX = new Int32Array(width * height)
  const queueY = new Int32Array(width * height)
  let head = 0, tail = 0
  const tol = 30 // 斜角图背景纯白，容差略大，抗压缩伪影

  function tryEnqueue(x, y) {
    if (x < 0 || x >= width || y < 0 || y >= height) return
    const vi = y * width + x
    if (visited[vi]) return
    const idx = vi * 4
    const r = data[idx], g = data[idx + 1], b = data[idx + 2]
    // 接近白色的像素视为背景
    if (r >= 255 - tol && g >= 255 - tol && b >= 255 - tol) {
      visited[vi] = 1
      queueX[tail] = x
      queueY[tail] = y
      tail++
    }
  }

  // 从四周边缘开始泛洪
  for (let x = 0; x < width; x++) {
    tryEnqueue(x, 0)
    tryEnqueue(x, height - 1)
  }
  for (let y = 0; y < height; y++) {
    tryEnqueue(0, y)
    tryEnqueue(width - 1, y)
  }

  while (head < tail) {
    const x = queueX[head]
    const y = queueY[head]
    head++
    const idx = (y * width + x) * 4
    data[idx + 3] = 0
    tryEnqueue(x + 1, y)
    tryEnqueue(x - 1, y)
    tryEnqueue(x, y + 1)
    tryEnqueue(x, y - 1)
  }

  // 边缘抗锯齿柔化
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = (y * width + x) * 4
      if (data[idx + 3] === 0) continue
      const r = data[idx], g = data[idx + 1], b = data[idx + 2]
      let adjTransparent = false
      for (let dy = -1; dy <= 1 && !adjTransparent; dy++) {
        for (let dx = -1; dx <= 1 && !adjTransparent; dx++) {
          if (dx === 0 && dy === 0) continue
          const nIdx = ((y + dy) * width + (x + dx)) * 4
          if (data[nIdx + 3] === 0) adjTransparent = true
        }
      }
      if (adjTransparent && r >= 220 && g >= 220 && b >= 220) {
        const minCh = Math.min(r, g, b)
        const alpha = Math.round(((255 - minCh) / 35) * 255)
        data[idx + 3] = Math.max(0, Math.min(255, alpha))
      }
    }
  }
}

async function processSource(src) {
  const filePath = path.join(imgDir, src.file)
  if (!fs.existsSync(filePath)) {
    console.log(`  ⚠ ${src.file} 不存在，跳过`)
    return
  }

  const { data, info } = await sharp(filePath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })

  console.log(`  处理 ${src.file} (${info.width}x${info.height})...`)
  floodFillRemoveBg(data, info.width, info.height)

  const outPath = path.join(imgDir, src.out)
  await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
    .png()
    .toFile(outPath)
  console.log(`  ✓ ${src.out}`)
}

async function main() {
  console.log('=== 斜角骰子抠白底 ===\n')
  for (const src of sources) {
    await processSource(src)
  }
  console.log('\n=== 完成 ===')
}

main().catch(e => { console.error(e); process.exit(1) })
