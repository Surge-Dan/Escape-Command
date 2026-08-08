#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const base = __dirname + '/..';
const srcUtils = path.join(base, 'utils');
const dstUtils = path.join(base, 'packageGroup', 'utils');

// 需要复制到 packageGroup/utils/ 的文件
const groupUtils = [
  'chat-store.js',
  'group-room-store.js',
  'player-trust-store.js',
  'task-hall-store.js',
  'player-matcher.js',
  'execution-progress.js',
];

fs.mkdirSync(dstUtils, { recursive: true });

let totalSize = 0;
for (const f of groupUtils) {
  const src = path.join(srcUtils, f);
  const dst = path.join(dstUtils, f);
  if (!fs.existsSync(src)) {
    console.log('  Skip: ' + f);
    continue;
  }
  fs.copyFileSync(src, dst);
  const size = fs.statSync(dst).size;
  totalSize += size;
  console.log('  Copied: ' + f + ' (' + (size/1024).toFixed(1) + ' KB)');
}

console.log('\n总复制: ' + (totalSize/1024).toFixed(1) + ' KB');

// 现在修复 packageGroup 内页面 require 路径
// 原来的 ../../../../utils/xxx (3级目录) -> ../../../utils/xxx (指向 packageGroup/utils/)
// 原来的 ../../../../../utils/xxx (4级目录) -> ../../../../utils/xxx
const fileFixes = [
  // 3 级深度：pages/group/xxx/yyy.js -> ../../../utils/
  { dirs: ['packageGroup/pages/group/create', 'packageGroup/pages/group/escape-record', 'packageGroup/pages/group/room', 'packageGroup/pages/group/hall'], old: '../../../../utils/', new: '../../../utils/' },
  // 4 级深度：pages/group/hall/xxx/yyy.js -> ../../../../utils/
  { dirs: ['packageGroup/pages/group/hall/create-task', 'packageGroup/pages/group/hall/detail'], old: '../../../../../utils/', new: '../../../../utils/' },
  // 同样修复 data/
  { dirs: ['packageGroup/pages/group/hall', 'packageGroup/pages/group/hall/create-task'], old: '../../../../data/', new: '../../../data/' },
  { dirs: ['packageGroup/pages/group/hall/create-task'], old: '../../../../../data/', new: '../../../../data/' },
];

let pathFixes = 0;
for (const fix of fileFixes) {
  for (const dir of fix.dirs) {
    const dirPath = path.join(base, dir);
    if (!fs.existsSync(dirPath)) continue;
    for (const e of fs.readdirSync(dirPath)) {
      if (path.extname(e) !== '.js') continue;
      const fp = path.join(dirPath, e);
      let content = fs.readFileSync(fp, 'utf-8');
      if (content.includes(fix.old)) {
        content = content.split(fix.old).join(fix.new);
        fs.writeFileSync(fp, content, 'utf-8');
        pathFixes++;
        const rel = fp.split(path.sep).join('/').replace(/^\.\//, '');
        console.log('  修复路径: ' + rel);
      }
    }
  }
}

console.log('\n路径修复: ' + pathFixes + ' 处');