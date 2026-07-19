// 清理检查：识别未被代码引用的旧 SVG 残留文件
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const iconsDir = path.join(root, 'assets', 'icons');
const v3Dir = path.join(root, 'assets', 'icons-v3');

// v3 生成的文件清单
const v3Files = new Set(fs.readdirSync(v3Dir).filter(f => f.endsWith('.svg')));

// 代码中引用的图标
const referenced = new Set();
const codeExts = ['.js', '.wxml', '.wxss', '.json', '.wxs'];
function scan(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', '.git', 'docs', 'scripts'].includes(e.name)) continue;
    const fp = path.join(dir, e.name);
    if (e.isDirectory()) scan(fp);
    else if (codeExts.some(ext => e.name.endsWith(ext))) {
      const c = fs.readFileSync(fp, 'utf-8');
      const re = /\/assets\/icons\/([\w-]+\.svg)/g;
      let m;
      while ((m = re.exec(c)) !== null) referenced.add(m[1]);
    }
  }
}
scan(root);

// 所有 icons 目录中的文件
const allIcons = fs.readdirSync(iconsDir).filter(f => f.endsWith('.svg'));

// 分类
const orphan = [];      // 既不在 v3 也不被引用 → 可删除
const legacy = [];      // 不在 v3 但被引用 → 需关注
const v3Count = allIcons.filter(f => v3Files.has(f)).length;

for (const f of allIcons) {
  const inV3 = v3Files.has(f);
  const inRef = referenced.has(f);
  if (!inV3 && !inRef) orphan.push(f);
  else if (!inV3 && inRef) legacy.push(f);
}

console.log('=== 图标目录清理分析 ===\n');
console.log('icons/ 总文件数:', allIcons.length);
console.log('  v3 生成:', v3Count);
console.log('  旧残留（未被引用）:', orphan.length);
console.log('  旧引用（被引用但 v3 未覆盖）:', legacy.length);

if (legacy.length > 0) {
  console.log('\n⚠️ 需关注的旧引用:');
  legacy.forEach(f => console.log('  ' + f));
}

if (orphan.length > 0) {
  console.log('\n🗑️ 可删除的残留文件 (' + orphan.length + '):');
  orphan.forEach(f => console.log('  ' + f));
}
