#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const targets = ['invite', 'member', 'about', 'help', 'photo-edit', 'data-export'];

for (const t of targets) {
  const dir = path.join('packageMe/pages', t);
  if (!fs.existsSync(dir)) continue;
  console.log('--- ' + t + ' ---');
  for (const e of fs.readdirSync(dir)) {
    const fp = path.join(dir, e);
    if (path.extname(fp) === '.js') {
      const c = fs.readFileSync(fp, 'utf-8');
      const lines = c.split('\n');
      lines.forEach((l, i) => {
        const m = l.match(/require\((['"])([^'"]+)\1/);
        if (m && m[2].startsWith('.')) {
          const fpDir = path.dirname(fp);
          const abs = path.resolve(fpDir, m[2]);
          if (!fs.existsSync(abs)) {
            console.log('  MISSING: ' + e + ':' + (i+1) + ' ' + m[2]);
          }
        }
      });
    }
  }
}
console.log('done');