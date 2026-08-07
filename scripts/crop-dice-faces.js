// 裁剪骰子六面图 + 边缘泛洪填充抠白底 v2
// 简化流程：sharp管道裁剪→resize到工作尺寸→raw数据flood fill→直接输出PNG
const sharp = require('sharp')
const fs = require('fs')
const path = require('path')

const root = path.join(__dirname, '..')
const imgDir = path.join(root, 'assets/images')

const sources = [
  { file: '红色.png', color: 'red' },
  { file: '紫色.png', color: 'purple' },
  { file: '绿色.png', color: 'green' }
]

const faceNames = ['1', '2', '3', '4', '5', '6']
const OUTPUT_SIZE = 480 // 输出正方形边长，手机屏够用

function floodFillRemoveBg(data, width, height) {
  const visited = new Uint8Array(width * height)
  const queueX = new Int32Array(width * height)
  const queueY = new Int32Array(width * height)
  let head = 0, tail = 0
  const tol = 20

  function tryEnqueue(x, y) {
    if (x < 0 || x >= width || y < 0 || y >= height) return
    const vi = y * width + x
    if (visited[vi]) return
    const idx = vi * 4
    if (data[idx] >= 255 - tol && data[idx + 1] >= 255 - tol && data[idx + 2] >= 255 - tol) {
      visited[vi] = 1
      queueX[tail] = x
      queueY[tail] = y
      tail++
    }
  }

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

  // 边缘抗锯齿
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
      if (adjTransparent && r >= 230 && g >= 230 && b >= 230) {
        const minCh = Math.min(r, g, b)
        const alpha = Math.round(((255 - minCh) / 25) * 255)
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

  const meta = await sharp(filePath).metadata()
  const { width, height } = meta
  const cellW = Math.floor(width / 3)
  const cellH = Math.floor(height / 2)

  console.log(`\n=== ${src.color} (${width}x${height}), cell=${cellW}x${cellH} ===`)

  for (let face = 0; face < 6; face++) {
    const row = Math.floor(face / 3)
    const col = face % 3
    // 单元格区域
    const startX = col * cellW
    const startY = row * cellH
    // 居中裁剪正方形（取cell的短边，居中）
    const cellShort = Math.min(cellW, cellH)
    const cropX = startX + Math.floor((cellW - cellShort) / 2)
    const cropY = startY + Math.floor((cellH - cellShort) / 2)

    // 用sharp管道：提取→resize→加alpha→输出raw
    const { data, info } = await sharp(filePath)
      .extract({ left: cropX, top: cropY, width: cellShort, height: cellShort })
      .resize(OUTPUT_SIZE, OUTPUT_SIZE, { fit: 'cover', kernel: sharp.kernel.lanczos3 })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true })

    // Flood fill 抠白底
    floodFillRemoveBg(data, info.width, info.height)

    // 输出PNG
    const outName = `dice-${src.color}-${faceNames[face]}.png`
    const outPath = path.join(imgDir, outName)
    await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
      .png()
      .toFile(outPath)
    console.log(`  ✓ ${outName} (${info.width}x${info.height})`)
  }
}

async function main() {
  console.log('=== 骰子裁剪 v2 ===\n')
  for (const src of sources) {
    await processSource(src)
  }
  console.log('\n=== 完成 ===')
}

main().catch(e => { console.error(e); process.exit(1) })
