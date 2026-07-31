// 图片压缩脚本 —— 用 sharp 压缩 webp 图片
// 目标：7 个 scene webp 从 78-95KB 压缩到 50-60KB
// 用法：node scripts/compress-images.js
const sharp = require('sharp')
const fs = require('fs')
const path = require('path')

const root = path.join(__dirname, '..')

const targets = [
  { file: 'assets/images/walk-scene.webp', quality: 72 },
  { file: 'assets/images/culture-scene.webp', quality: 72 },
  { file: 'assets/images/color-scene.webp', quality: 70 },
  { file: 'assets/images/food-scene.webp', quality: 70 },
  { file: 'assets/images/sense-scene.webp', quality: 68 },
  { file: 'assets/images/collect-scene.webp', quality: 68 },
  { file: 'assets/images/map-bg.webp', quality: 65 }
]

async function compress() {
  console.log('=== 图片压缩 ===\n')
  let totalBefore = 0
  let totalAfter = 0
  for (const t of targets) {
    const fp = path.join(root, t.file)
    if (!fs.existsSync(fp)) {
      console.log(`  ⚠ ${t.file} 不存在，跳过`)
      continue
    }
    const before = fs.statSync(fp).size
    // sharp 输出到 .compressed.webp，再用 PowerShell Move-Item -Force 覆盖原文件
    // （微信开发者工具锁定原文件，Node writeFileSync 会 EBUSY/UNKNOWN）
    const tmp = fp + '.compressed'
    await sharp(fp).webp({ quality: t.quality }).toFile(tmp)
    const after = fs.statSync(tmp).size
    const { execSync } = require('child_process')
    try {
      execSync(`Move-Item -LiteralPath '${tmp.replace(/'/g, "''")}' -Destination '${fp.replace(/'/g, "''")}' -Force`, { shell: 'powershell' })
    } catch (e) {
      // PowerShell 也失败时，保留 .compressed 文件，提示用户手动替换
      console.log(`  ⚠ ${t.file} 原文件被锁定，压缩版已存到 ${path.basename(tmp)}，请关闭微信开发者工具后手动替换`)
      totalBefore += before
      totalAfter += after
      continue
    }
    totalBefore += before
    totalAfter += after
    const pct = ((1 - after / before) * 100).toFixed(1)
    console.log(`  ${t.file.padEnd(40)} ${(before / 1024).toFixed(1)}KB → ${(after / 1024).toFixed(1)}KB  (-${pct}%)  q=${t.quality}`)
  }
  console.log(`\n合计: ${(totalBefore / 1024).toFixed(1)}KB → ${(totalAfter / 1024).toFixed(1)}KB  (节省 ${((totalBefore - totalAfter) / 1024).toFixed(1)}KB)`)
}

compress().catch(e => { console.error(e); process.exit(1) })
