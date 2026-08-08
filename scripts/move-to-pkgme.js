#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const base = __dirname + '/..';

// 目标页面
const targetPages = ['invite', 'member', 'about', 'help', 'photo-edit', 'data-export'];

// 创建新分包
const pkgRoot = 'packageMe';
const pkgPages = pkgRoot + '/pages';

for (const p of targetPages) {
  const src = path.join(base, 'pages', p);
  const dst = path.join(base, pkgPages, p);
  if (fs.existsSync(src)) {
    fs.mkdirSync(dst, { recursive: true });
    // 移动文件
    for (const e of fs.readdirSync(src)) {
      const sfp = path.join(src, e);
      const dfp = path.join(dst, e);
      fs.renameSync(sfp, dfp);
    }
    fs.rmdirSync(src);
    console.log('Moved pages/' + p + ' -> ' + pkgPages + '/' + p);
  }
}

console.log('\n所有页面已移动到 ' + pkgRoot);
console.log('需要手动更新：');
console.log('  1. app.json 添加 ' + pkgRoot + ' subPackages');
console.log('  2. 修复所有导航路径从 /pages/' + targetPages.join('|/pages/') + '/ -> /' + pkgRoot + '/pages/xxx/');