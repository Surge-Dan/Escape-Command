#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const navMappings = {
  '/pages/invite/invite': '/packageMe/pages/invite/invite',
  '/pages/member/member': '/packageMe/pages/member/member',
  '/pages/about/about': '/packageMe/pages/about/about',
  '/pages/help/help': '/packageMe/pages/help/help',
  '/pages/photo-edit/photo-edit': '/packageMe/pages/photo-edit/photo-edit',
  '/pages/data-export/data-export': '/packageMe/pages/data-export/data-export',
};

function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['.git', 'node_modules', '演示', '项目交接', 'scripts', 'tests', 'docs', 'miniprogram_npm', 'packageMe', 'packageGroup', 'packageBt', 'packageDice', 'packageAssets'].includes(e.name)) continue;
    const fp = path.join(dir, e.name);
    if (e.isDirectory()) walk(fp);
    else {
      if (['.js', '.wxml'].includes(path.extname(fp))) {
        let content = fs.readFileSync(fp, 'utf-8');
        let modified = false;
        let changes = 0;
        for (const [old, rep] of Object.entries(navMappings)) {
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
      }
    }
  }
}

walk('.');
console.log('完成');