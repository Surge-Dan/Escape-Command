#!/usr/bin/env node
// 用 sharp 将 3D 骰子 PNG 转为 WebP（透明 + 极致压缩）
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const imgDir = path.join(__dirname, '..', 'packageDice', 'images');

const targets = ['红色.png', '紫色.png', '绿色.png', '红色骰子3d.png', '紫色骰子3d.png', '绿色骰子3d.png'];

let origTotal = 0, newTotal = 0;

(async () => {
  for (const name of targets) {
    const pngPath = path.join(imgDir, name);
    if (!fs.existsSync(pngPath)) {
      console.log('  Skip:', name);
      continue;
    }
    const origSize = fs.statSync(pngPath).size;
    const newName = name.replace('.png', '.webp');
    const webpPath = path.join(imgDir, newName);

    try {
      await sharp(pngPath)
        .webp({ quality: 85, alphaQuality: 90, lossless: false })
        .toFile(webpPath);

      const newSize = fs.statSync(webpPath).size;
      fs.unlinkSync(pngPath);

      const savings = ((1 - newSize / origSize) * 100).toFixed(0);
      origTotal += origSize;
      newTotal += newSize;
      console.log('  ' + name.padEnd(20) + (origSize/1024).toFixed(1).padStart(8) + ' -> ' + (newSize/1024).toFixed(1).padStart(7) + ' KB  (-' + savings + '%)  ' + newName);
    } catch (e) {
      console.error('  ERROR ' + name + ': ' + e.message.substring(0, 200));
    }
  }

  console.log('\nTotal: ' + (origTotal/1024/1024).toFixed(2) + ' -> ' + (newTotal/1024/1024).toFixed(2) + ' MB');
})();