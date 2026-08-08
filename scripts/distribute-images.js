#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const base = __dirname + '/..';
const srcDir = path.join(base, 'packageAssets', 'images');

// 分配方案
const plan = {
  'packageBt/images': [],      // 场景图
  'packageGroup/images': [],   // 骰子JPG
  'packageAssets/images': [],  // 骰子面PNG
  'packageDice/images': [],    // 3D骰子
};

const allFiles = fs.readdirSync(srcDir);

const dice3dNames = ['红色.png', '紫色.png', '绿色.png', '红色骰子3d.png', '绿色骰子3d.png', '紫色骰子3d.png', 'dice-purple-3d.png', 'dice-green-3d.png', 'dice-red-3d.png'];
const diceJpgNames = allFiles.filter(f => /\.jpg$/.test(f));
const diceFaceNames = allFiles.filter(f => /^dice-(red|green|purple)-\d+\.png$/.test(f));
const sceneNames = allFiles.filter(f => /\.webp$/.test(f));

dice3dNames.forEach(n => { if (fs.existsSync(path.join(srcDir, n))) plan['packageDice/images'].push(n); });
diceJpgNames.forEach(n => plan['packageGroup/images'].push(n));
diceFaceNames.forEach(n => plan['packageAssets/images'].push(n));
sceneNames.forEach(n => plan['packageBt/images'].push(n));

console.log('图片分配方案:');
for (const [dest, files] of Object.entries(plan)) {
  let total = 0;
  files.forEach(f => { total += fs.statSync(path.join(srcDir, f)).size; });
  console.log(`  ${dest}: ${files.length} files, ${(total/1024).toFixed(1)} KB`);
  files.forEach(f => console.log(`    ${f}`));
}

// 执行移动
console.log('\n移动文件...');
for (const [dest, files] of Object.entries(plan)) {
  const destDir = path.join(base, dest);
  fs.mkdirSync(destDir, { recursive: true });
  for (const f of files) {
    const src = path.join(srcDir, f);
    const dst = path.join(destDir, f);
    if (fs.existsSync(src)) {
      fs.renameSync(src, dst);
      console.log(`  ${f} -> ${dest}/`);
    }
  }
}

// 创建 packageDice 占位页
const dicePageDir = path.join(base, 'packageDice', 'pages', 'placeholder');
fs.mkdirSync(dicePageDir, { recursive: true });
fs.writeFileSync(path.join(dicePageDir, 'placeholder.wxml'), '<view></view>');
fs.writeFileSync(path.join(dicePageDir, 'placeholder.wxss'), '');
fs.writeFileSync(path.join(dicePageDir, 'placeholder.js'), 'Page({})');
fs.writeFileSync(path.join(dicePageDir, 'placeholder.json'), JSON.stringify({ usingComponents: {} }, null, 2));

// 清理空的 packageAssets/images
if (fs.existsSync(srcDir)) {
  const remaining = fs.readdirSync(srcDir);
  if (remaining.length === 0) {
    fs.rmSync(srcDir, { recursive: true });
    console.log('\n已删除空的 packageAssets/images/');
  }
}

console.log('\n分配完成!');