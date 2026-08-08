#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const base = __dirname + '/..';

// 修复 packageGroup 分包内的 require 路径
// 文件从 pages/group/xxx/yyy.js 移到 packageGroup/pages/group/xxx/yyy.js
// 原来的 ../../../ 需要增加一级变成 ../../../../ 
// 对于更深的目录 (hall/create-task, hall/detail)，需要增加两级

const fixes = [
  // packageGroup/pages/group/create/ 和 escape-record/ 和 room/ (3级 -> 4级)
  { dir: 'packageGroup/pages/group/create', old: '../../../utils/', new: '../../../../utils/' },
  { dir: 'packageGroup/pages/group/create', old: '../../../data/', new: '../../../../data/' },
  { dir: 'packageGroup/pages/group/escape-record', old: '../../../utils/', new: '../../../../utils/' },
  { dir: 'packageGroup/pages/group/escape-record', old: '../../../data/', new: '../../../../data/' },
  { dir: 'packageGroup/pages/group/room', old: '../../../utils/', new: '../../../../utils/' },
  { dir: 'packageGroup/pages/group/room', old: '../../../data/', new: '../../../../data/' },
  { dir: 'packageGroup/pages/group/hall', old: '../../../utils/', new: '../../../../utils/' },
  { dir: 'packageGroup/pages/group/hall', old: '../../../data/', new: '../../../../data/' },
  // packageGroup/pages/group/hall/create-task/ 和 detail/ (3级 -> 5级)
  { dir: 'packageGroup/pages/group/hall/create-task', old: '../../../utils/', new: '../../../../../utils/' },
  { dir: 'packageGroup/pages/group/hall/create-task', old: '../../../data/', new: '../../../../../data/' },
  { dir: 'packageGroup/pages/group/hall/detail', old: '../../../utils/', new: '../../../../../utils/' },
  { dir: 'packageGroup/pages/group/hall/detail', old: '../../../data/', new: '../../../../../data/' },
];

let totalFixes = 0;
for (const fix of fixes) {
  const dirPath = path.join(base, fix.dir);
  if (!fs.existsSync(dirPath)) continue;
  
  for (const e of fs.readdirSync(dirPath)) {
    const fp = path.join(dirPath, e);
    if (path.extname(fp) !== '.js') continue;
    
    let content = fs.readFileSync(fp, 'utf-8');
    if (content.includes(fix.old)) {
      content = content.split(fix.old).join(fix.new);
      fs.writeFileSync(fp, content, 'utf-8');
      const rel = fp.split(path.sep).join('/').replace(base.split(path.sep).join('/') + '/', '');
      console.log('修复: ' + rel + ' (' + fix.old + ' -> ' + fix.new + ')');
      totalFixes++;
    }
  }
}

console.log('\n共修复 ' + totalFixes + ' 处 require 路径');