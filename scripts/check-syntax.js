// 语法检查：递归检查所有 .js 文件
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const root = path.join(__dirname, '..');
let ok = 0, fail = 0;
const errs = [];

function scan(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    if (['node_modules', '.git', 'miniprogram_npm'].includes(e.name)) continue;
    const fp = path.join(dir, e.name);
    if (e.isDirectory()) {
      scan(fp);
    } else if (e.name.endsWith('.js')) {
      try {
        execSync('node --check "' + fp + '"', { stdio: 'pipe' });
        ok++;
      } catch (err) {
        fail++;
        const msg = err.stderr ? err.stderr.toString().split('\n').filter(Boolean).slice(0, 2).join(' | ') : err.message;
        errs.push(path.relative(root, fp) + ' -> ' + msg);
      }
    }
  }
}

scan(root);
console.log('JS Syntax Check: OK=' + ok + ' FAIL=' + fail);
errs.forEach(e => console.log('  ❌ ' + e));
