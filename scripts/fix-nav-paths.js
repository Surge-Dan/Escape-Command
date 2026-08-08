#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const base = __dirname + '/..';

// 导航路径映射
const navMappings = {
  '/pages/group/create/create': '/packageGroup/pages/group/create/create',
  '/pages/group/room/room': '/packageGroup/pages/group/room/room',
  '/pages/group/escape-record/escape-record': '/packageGroup/pages/group/escape-record/escape-record',
  '/pages/group/hall/hall': '/packageGroup/pages/group/hall/hall',
  '/pages/group/hall/detail/detail': '/packageGroup/pages/group/hall/detail/detail',
  '/pages/group/hall/create-task/create-task': '/packageGroup/pages/group/hall/create-task/create-task',
  '/pages/breakthrough-profile/breakthrough-profile': '/packageBt/pages/breakthrough-profile/breakthrough-profile',
  '/pages/bt-certificate/bt-certificate': '/packageBt/pages/bt-certificate/bt-certificate',
};

function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['.git', 'node_modules', 'miniprogram_npm', '演示', '项目交接', 'scripts'].includes(e.name)) continue;
    const fp = path.join(dir, e.name);
    if (e.isDirectory()) walk(fp);
    else {
      const ext = path.extname(fp);
      if (['.js', '.wxml'].includes(ext)) {
        try {
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
        } catch(e) {}
      }
    }
  }
}

walk(base);
console.log('\n导航路径修复完成');