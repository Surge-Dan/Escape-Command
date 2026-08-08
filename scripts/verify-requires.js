#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

function walk(dir, results = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['.git', 'node_modules', '演示', '项目交接', 'packageGroup', 'packageBt', 'packageDice', 'packageAssets', 'packageBiz', 'scripts', 'tests', 'docs', 'miniprogram_npm'].includes(e.name)) continue;
    const fp = path.join(dir, e.name);
    if (e.isDirectory()) walk(fp, results);
    else {
      if (path.extname(fp) === '.js') results.push(fp);
    }
  }
  return results;
}

const files = walk('packageGroup');
let issues = 0;
for (const fp of files) {
  const c = fs.readFileSync(fp, 'utf-8');
  const lines = c.split('\n');
  lines.forEach((l, i) => {
    const m = l.match(/require\(['"]([^'"]+)['"]/);
    if (m) {
      const req = m[1];
      if (req.startsWith('.')) {
        const fpDir = path.dirname(fp);
        const abs = path.resolve(fpDir, req);
        if (!fs.existsSync(abs)) {
          console.log('MISSING: ' + fp + ':' + (i+1) + ' ' + req);
          issues++;
        }
      }
    }
  });
}
console.log('Total issues: ' + issues);