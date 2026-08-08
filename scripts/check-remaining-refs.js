#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['.git', 'node_modules', 'miniprogram_npm', '演示', '项目交接'].includes(e.name)) continue;
    const fp = path.join(dir, e.name);
    if (e.isDirectory()) walk(fp);
    else {
      const ext = path.extname(fp);
      if (['.js', '.wxml', '.wxss'].includes(ext)) {
        try {
          const content = fs.readFileSync(fp, 'utf-8');
          const oldRefs = content.match(/\/assets\/images\/[^\s"'<>)]+/g);
          if (oldRefs) {
            const rel = fp.replace(/\\/g, '/');
            console.log(rel + ':');
            [...new Set(oldRefs)].forEach(r => console.log('  ' + r));
          }
        } catch(e) {}
      }
    }
  }
}

walk('.');
console.log('\n检查完成');