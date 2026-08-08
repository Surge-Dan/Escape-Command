#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const groupUtils = ['chat-store.js', 'group-room-store.js', 'player-trust-store.js', 'task-hall-store.js', 'execution-progress.js'];

const mainRefs = {};
function findMainRefs(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['.git', 'node_modules', '演示', '项目交接', 'packageGroup', 'packageBt', 'packageDice', 'packageAssets', 'packageBiz', 'scripts', 'tests', 'docs', 'miniprogram_npm'].includes(e.name)) continue;
    const fp = path.join(dir, e.name);
    if (e.isDirectory()) findMainRefs(fp);
    else {
      const ext = path.extname(fp);
      if (['.js'].includes(ext)) {
        try {
          const content = fs.readFileSync(fp, 'utf-8');
          groupUtils.forEach(u => {
            const regex = new RegExp("require\\(['\"]\\.+/+" + u.replace('.js', '').replace(/\./g, '\\.') + "\\.js", 'g');
            if (content.match(regex)) {
              if (!mainRefs[u]) mainRefs[u] = [];
              mainRefs[u].push(fp);
            }
          });
        } catch(e) {}
      }
    }
  }
}

findMainRefs('pages');
findMainRefs('utils');
// app.js 文件单独检查
try {
  const content = fs.readFileSync('app.js', 'utf-8');
  groupUtils.forEach(u => {
    if (content.includes(u.replace('.js', ''))) {
      if (!mainRefs[u]) mainRefs[u] = [];
      mainRefs[u].push('app.js');
    }
  });
} catch(e) {}

console.log('主包对 groupUtils 的引用:');
for (const [u, refs] of Object.entries(mainRefs)) {
  console.log('  ' + u + ': ' + refs.length + ' 处');
  refs.forEach(r => console.log('    ' + r));
}
console.log('\n未引用的:');
for (const u of groupUtils) {
  if (!mainRefs[u]) console.log('  ' + u);
}