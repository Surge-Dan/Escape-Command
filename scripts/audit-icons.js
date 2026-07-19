// 对抗式审查：检查代码中所有引用的图标文件是否存在
const fs = require('fs');
const path = require('path');

const projectRoot = 'd:/TRAEWork/Projects/出逃指令/escape-command';
const iconsDir = path.join(projectRoot, 'assets', 'icons');

// 获取所有存在的 SVG 文件
const existingIcons = new Set(
  fs.readdirSync(iconsDir)
    .filter(f => f.endsWith('.svg'))
    .map(f => f)
);

// 递归扫描所有 .js, .wxml, .wxss, .json 文件
const codeExtensions = ['.js', '.wxml', '.wxss', '.json', '.wxs'];
const referencedIcons = new Map(); // filename -> [files that reference it]

function scanDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    // 跳过 node_modules, .git, docs, assets/icons-v3
    if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'docs' || entry.name === 'scripts') continue;
    if (entry.isDirectory()) {
      scanDir(fullPath);
    } else if (codeExtensions.some(ext => entry.name.endsWith(ext))) {
      scanFile(fullPath);
    }
  }
}

function scanFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  // 匹配 /assets/icons/xxx.svg
  const regex = /\/assets\/icons\/([\w-]+\.svg)/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    const iconName = match[1];
    if (!referencedIcons.has(iconName)) {
      referencedIcons.set(iconName, []);
    }
    referencedIcons.get(iconName).push(filePath);
  }
}

scanDir(projectRoot);

// 分析结果
console.log('=== 图标引用审查报告 ===\n');
console.log('存在的 SVG 文件数:', existingIcons.size);
console.log('代码中引用的图标数:', referencedIcons.size);
console.log('');

const missing = [];
const present = [];

for (const [iconName, files] of referencedIcons) {
  if (existingIcons.has(iconName)) {
    present.push({ name: iconName, files });
  } else {
    missing.push({ name: iconName, files });
  }
}

console.log('✅ 存在的引用 (' + present.length + '):');
present.forEach(({ name, files }) => {
  console.log('  ' + name);
});

console.log('\n❌ 缺失的引用 (' + missing.length + '):');
missing.forEach(({ name, files }) => {
  console.log('  ' + name);
  files.forEach(f => {
    const rel = path.relative(projectRoot, f);
    console.log('    ← ' + rel);
  });
});
