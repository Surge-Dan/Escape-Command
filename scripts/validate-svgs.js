// SVG 有效性检查：验证所有 SVG 文件是合法 XML
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const iconsDir = path.join(root, 'assets', 'icons');
const files = fs.readdirSync(iconsDir).filter(f => f.endsWith('.svg'));
let ok = 0, fail = 0;
const errs = [];

for (const f of files) {
  const fp = path.join(iconsDir, f);
  const content = fs.readFileSync(fp, 'utf-8');
  // 基础 XML 检查
  const hasDecl = content.startsWith('<?xml');
  const hasSvgOpen = content.includes('<svg');
  const hasSvgClose = content.includes('</svg>');
  const balanced = (content.match(/<g\b/g) || []).length === (content.match(/<\/g>/g) || []).length;

  if (!hasDecl || !hasSvgOpen || !hasSvgClose) {
    fail++;
    errs.push(f + ': 缺少 xml 声明/svg 标签');
    continue;
  }
  if (!balanced) {
    fail++;
    errs.push(f + ': <g> 标签不匹配 (open=' + (content.match(/<g\b/g) || []).length + ', close=' + (content.match(/<\/g>/g) || []).length + ')');
    continue;
  }
  ok++;
}

console.log('SVG Validity: OK=' + ok + ' FAIL=' + fail + ' (total=' + files.length + ')');
errs.forEach(e => console.log('  ❌ ' + e));
