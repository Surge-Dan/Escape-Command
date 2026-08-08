#!/usr/bin/env node
// 真实按开发者工具的打包规则计算主包大小
const fs = require('fs');
const path = require('path');

const base = '.';
const pc = JSON.parse(fs.readFileSync('project.config.json', 'utf-8'));
const aj = JSON.parse(fs.readFileSync('app.json', 'utf-8'));

// 收集 ignore
const ignoreFolders = new Set();
const ignoreFiles = new Set();
const ignorePatterns = [];
for (const item of (pc.packOptions?.ignore || [])) {
  if (item.type === 'folder') ignoreFolders.add(item.value);
  else if (item.type === 'file') ignoreFiles.add(item.value);
  else if (item.type === 'suffix') ignorePatterns.push(new RegExp('\\' + item.value + '$'));
  else if (item.type === 'prefix') ignorePatterns.push(new RegExp('^' + item.value));
  else if (item.type === 'regexp') ignorePatterns.push(new RegExp(item.value));
}

function isIgnored(rel) {
  if (ignoreFiles.has(rel)) return true;
  const parts = rel.split('/');
  for (let i = 1; i <= parts.length; i++) {
    if (ignoreFolders.has(parts.slice(0, i).join('/'))) return true;
  }
  for (const p of ignorePatterns) {
    if (p.test(rel) || p.test(path.basename(rel))) return true;
  }
  return false;
}

function walk(dir, cb) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['.git', 'node_modules', 'miniprogram_npm'].includes(e.name)) continue;
    const fp = path.join(dir, e.name);
    const rel = fp.split(path.sep).join('/').replace(/^\.\//, '');
    if (isIgnored(rel)) continue;
    if (e.isDirectory()) walk(fp, cb);
    else cb(fp, rel);
  }
}

function getSubpackage(rel) {
  for (const sp of (aj.subPackages || [])) {
    if (rel.startsWith(sp.root + '/')) return sp.name;
  }
  return null;
}

let mainSize = 0, mainCount = 0;
const pkgSizes = {};

walk(base, (fp, rel) => {
  const stat = fs.statSync(fp);
  const pkg = getSubpackage(rel);
  if (pkg) {
    if (!pkgSizes[pkg]) pkgSizes[pkg] = { size: 0, count: 0 };
    pkgSizes[pkg].size += stat.size;
    pkgSizes[pkg].count++;
  } else {
    mainSize += stat.size;
    mainCount++;
  }
});

console.log('===== 主包（按真实忽略规则）=====');
console.log('  文件数:', mainCount);
console.log('  体积:', (mainSize/1024).toFixed(1), 'KB (', (mainSize/1024/1024).toFixed(2), 'MB)');
console.log('  告警阈值 1.5MB');
console.log('  ' + (mainSize > 1.5*1024*1024 ? '⚠️ 超 ' + ((mainSize-1.5*1024*1024)/1024).toFixed(1) + ' KB' : '✅ 未超'));

const byDir = {};
walk(base, (fp, rel) => {
  if (getSubpackage(rel)) return;
  const top = rel.split('/')[0];
  const stat = fs.statSync(fp);
  byDir[top] = (byDir[top] || 0) + stat.size;
});
console.log('\n  主包内容:');
Object.entries(byDir).sort((a,b) => b[1]-a[1]).forEach(([d, s]) => {
  console.log('    ' + (s/1024).toFixed(1).padStart(8) + ' KB  ' + d + '/');
});

console.log('\n===== 分包 =====');
for (const [name, info] of Object.entries(pkgSizes)) {
  console.log('  ' + name + ': ' + (info.size/1024).toFixed(1) + 'KB (' + (info.size/1024/1024).toFixed(2) + 'MB)');
}

const allOk = mainSize < 1.5*1024*1024 && Object.values(pkgSizes).every(s => s.size < 2*1024*1024);
console.log('\n' + (allOk ? '🎉 全部达标！' : '⚠️ 主包仍超 1.5MB 告警阈值'));