#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const base = __dirname + '/..';

// 检查导航路径是否正确指向分包
const navPatterns = [
  { old: '/pages/group/hall/hall', new: '/packageGroup/pages/group/hall/hall' },
  { old: '/pages/group/room/room', new: '/packageGroup/pages/group/room/room' },
  { old: '/pages/group/create/create', new: '/packageGroup/pages/group/create/create' },
  { old: '/pages/group/hall/detail/detail', new: '/packageGroup/pages/group/hall/detail/detail' },
  { old: '/pages/group/hall/create-task/create-task', new: '/packageGroup/pages/group/hall/create-task/create-task' },
  { old: '/pages/group/escape-record/escape-record', new: '/packageGroup/pages/group/escape-record/escape-record' },
  { old: '/pages/breakthrough-profile/breakthrough-profile', new: '/packageBt/pages/breakthrough-profile/breakthrough-profile' },
  { old: '/pages/bt-certificate/bt-certificate', new: '/packageBt/pages/bt-certificate/bt-certificate' },
];

function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['.git', 'node_modules', 'miniprogram_npm', '演示', '项目交接', 'scripts'].includes(e.name)) continue;
    const fp = path.join(dir, e.name);
    if (e.isDirectory()) walk(fp);
    else {
      const ext = path.extname(fp);
      if (['.js', '.wxml'].includes(ext)) {
        try {
          const content = fs.readFileSync(fp, 'utf-8');
          const rel = fp.split(path.sep).join('/').replace(/^\.\//, '');
          let found = false;
          for (const p of navPatterns) {
            if (content.includes(p.old)) {
              console.log('⚠️ 旧路径: ' + rel + ' -> ' + p.old);
              found = true;
            }
          }
          if (!found) {
            // Check for new paths
            for (const p of navPatterns) {
              if (content.includes(p.new)) break;
            }
          }
        } catch(e) {}
      }
    }
  }
}

walk(base);
console.log('\n导航路径检查完成');