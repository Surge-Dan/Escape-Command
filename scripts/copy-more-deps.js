#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const base = __dirname + '/..';
const dstUtils = path.join(base, 'packageGroup', 'utils');
const dstData = path.join(base, 'packageGroup', 'data');

// 还要复制的 utils（依赖链）
const moreUtils = [
  'mock-user-pool.js',
  'trust-score.js',
];

for (const f of moreUtils) {
  const src = path.join(base, 'utils', f);
  const dst = path.join(dstUtils, f);
  if (fs.existsSync(src) && !fs.existsSync(dst)) {
    fs.copyFileSync(src, dst);
    console.log('  Copied utils: ' + f);
  }
}

// 复制的 data（依赖链）
const moreData = [
  'guangzhou-pois.js',
  'guangzhou-districts.js',
  'escape-master-tasks.js',
];

fs.mkdirSync(dstData, { recursive: true });
for (const f of moreData) {
  const src = path.join(base, 'data', f);
  const dst = path.join(dstData, f);
  if (fs.existsSync(src) && !fs.existsSync(dst)) {
    fs.copyFileSync(src, dst);
    console.log('  Copied data: ' + f);
  }
}