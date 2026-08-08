#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const base = __dirname + '/..';

// 路径映射表：旧路径 -> 新路径
const mappings = {};

// 3D骰子 -> packageDice
const dice3dFiles = ['红色.png', '紫色.png', '绿色.png', '红色骰子3d.png', '绿色骰子3d.png', '紫色骰子3d.png', 'dice-purple-3d.png', 'dice-green-3d.png', 'dice-red-3d.png'];
dice3dFiles.forEach(f => {
  mappings[`/assets/images/${f}`] = `/packageDice/images/${f}`;
});

// 骰子JPG -> packageGroup
const diceJpgFiles = ['dice-purple.jpg', 'dice-green.jpg', 'dice-red.jpg', '紫色骰子.jpg', '绿色骰子.jpg', '红色骰子.jpg'];
diceJpgFiles.forEach(f => {
  mappings[`/assets/images/${f}`] = `/packageGroup/images/${f}`;
});

// 骰子面PNG -> packageAssets
for (const color of ['red', 'green', 'purple']) {
  for (let i = 1; i <= 6; i++) {
    const f = `dice-${color}-${i}.png`;
    mappings[`/assets/images/${f}`] = `/packageAssets/images/${f}`;
  }
}

// 场景图WebP -> packageBt
const sceneWebp = ['avatar.webp', 'coffee-shop.webp', 'collect-scene.webp', 'color-scene.webp', 'culture-scene.webp', 'empty-collection.webp', 'empty-first.webp', 'food-scene.webp', 'latte.webp', 'map-bg.webp', 'paper-texture.webp', 'sense-scene.webp', 'walk-scene.webp', 'walking-city.webp'];
sceneWebp.forEach(f => {
  mappings[`/assets/images/${f}`] = `/packageBt/images/${f}`;
});

// bt-* 图片 -> packageBt (之前已移动)
const btFiles = ['bt-endurance-1.jpg', 'bt-endurance-2.jpg', 'bt-endurance-3.jpg', 'bt-endurance-4.jpg', 'bt-endurance-5.jpg', 'bt-fate-1.jpg', 'bt-fate-2.jpg', 'bt-fate-3.jpg', 'bt-fate-4.jpg', 'bt-fate-5.jpg', 'bt-reverse-1.jpg', 'bt-reverse-2.jpg', 'bt-reverse-3.jpg', 'bt-reverse-4.jpg', 'bt-reverse-5.jpg', 'bt-role-1.jpg', 'bt-role-2.jpg', 'bt-role-3.jpg', 'bt-role-4.jpg', 'bt-role-5.jpg', 'bt-street-1.jpg', 'bt-street-2.jpg', 'bt-street-3.jpg', 'bt-street-4.jpg', 'bt-street-5.jpg'];
btFiles.forEach(f => {
  mappings[`/assets/images/${f}`] = `/packageBt/images/${f}`;
  // 也覆盖旧的 .png 引用
  mappings[`/assets/images/${f.replace('.jpg', '.png')}`] = `/packageBt/images/${f}`;
});

// 递归遍历所有可修改文件
function walk(dir) {
  const results = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['.git', 'node_modules', 'miniprogram_npm', '演示', '项目交接', 'assets'].includes(e.name)) continue;
    const fp = path.join(dir, e.name);
    if (e.isDirectory()) results.push(...walk(fp));
    else {
      const ext = path.extname(fp);
      if (['.js', '.wxml', '.wxss', '.json'].includes(ext)) {
        results.push(fp);
      }
    }
  }
  return results;
}

const files = walk(base);
let totalChanges = 0;

for (const fp of files) {
  const rel = path.relative(base, fp);
  try {
    let content = fs.readFileSync(fp, 'utf-8');
    let modified = false;
    let changes = 0;
    
    for (const [old, rep] of Object.entries(mappings)) {
      if (content.includes(old)) {
        const occurrences = content.split(old).length - 1;
        content = content.split(old).join(rep);
        modified = true;
        changes += occurrences;
      }
    }
    
    if (modified) {
      fs.writeFileSync(fp, content, 'utf-8');
      console.log(`修复 ${changes} 处: ${rel}`);
      totalChanges += changes;
    }
  } catch (e) {
    console.error(`错误 ${rel}: ${e.message}`);
  }
}

console.log(`\n总计修复 ${totalChanges} 处引用`);