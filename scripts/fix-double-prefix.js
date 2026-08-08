#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const base = __dirname + '/..';

// 双重/三重前缀修复
const fixes = [
  { old: '/packageGroup/packageGroup/', rep: '/packageGroup/' },
  { old: '/packageBt/packageBt/', rep: '/packageBt/' },
  { old: '/packageBt/packageBt/packageBt/', rep: '/packageBt/' },
  { old: '/packageDice/packageDice/', rep: '/packageDice/' },
  { old: '/packageAssets/packageAssets/', rep: '/packageAssets/' },
];

function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['.git', 'node_modules', 'miniprogram_npm', '演示', '项目交接', 'scripts'].includes(e.name)) continue;
    const fp = path.join(dir, e.name);
    if (e.isDirectory()) walk(fp);
    else {
      const ext = path.extname(fp);
      if (['.js', '.wxml', '.wxss'].includes(ext)) {
        try {
          let content = fs.readFileSync(fp, 'utf-8');
          let modified = false;
          let changes = 0;
          
          // 先修复三重，再修复双重
          for (const [old, rep] of fixes) {
            if (content.includes(old)) {
              const occurrences = content.split(old).length - 1;
              content = content.split(old).join(rep);
              modified = true;
              changes += occurrences;
            }
          }
          
          if (modified) {
            fs.writeFileSync(fp, content, 'utf-8');
            const rel = fp.split(path.sep).join('/').replace(/^\.\//, '');
            console.log('修复 ' + changes + ' 处: ' + rel);
          }
        } catch(e) {}
      }
    }
  }
}

walk(base);
console.log('\n双重前缀修复完成');