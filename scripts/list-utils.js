#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const base = __dirname + '/..';

// 这些 utils 只被 packageGroup 分包使用，应该从主包移到 packageGroup/utils/
const groupUtils = [
  'chat-store.js',
  'group-room-store.js',
  'player-trust-store.js',
  'task-hall-store.js',
  'execution-progress.js',
  'player-matcher.js',
  'quick-match-engine.js',
  'player-matcher.test-data.js',  // 检查一下
];

// 检查 player-matcher
try {
  const content = fs.readFileSync(path.join(base, 'utils/player-matcher.js'), 'utf-8');
  console.log('player-matcher.js 前 200 字符:');
  console.log(content.substring(0, 300));
  console.log('...');
} catch(e) {}

// 列出主包 utils/ 下的所有文件
console.log('\n主包 utils/ 下的文件:');
fs.readdirSync(path.join(base, 'utils')).forEach(f => {
  const stat = fs.statSync(path.join(base, 'utils', f));
  console.log('  ' + (stat.size/1024).toFixed(1).padStart(7) + ' KB  ' + f);
});