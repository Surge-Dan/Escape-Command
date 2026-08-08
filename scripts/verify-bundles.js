#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = '.';
const pc = JSON.parse(fs.readFileSync('project.config.json', 'utf-8'));
const aj = JSON.parse(fs.readFileSync('app.json', 'utf-8'));

const ignoreFolders = new Set((pc.packOptions?.ignore || []).filter(i => i.type === 'folder').map(i => i.value));

function walk(dir, cb) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['.git', 'node_modules', 'miniprogram_npm'].includes(e.name)) continue;
    const fp = path.join(dir, e.name);
    const rel = fp.split(path.sep).join('/').replace(/^\.\//, '');
    let ignored = false;
    const parts = rel.split('/');
    for (let i = 1; i <= parts.length; i++) {
      if (ignoreFolders.has(parts.slice(0, i).join('/'))) { ignored = true; break; }
    }
    if (ignored) continue;
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
const pkgBreakdown = {};

walk(root, (fp, rel) => {
  const stat = fs.statSync(fp);
  const pkg = getSubpackage(rel);
  if (pkg) {
    if (!pkgSizes[pkg]) pkgSizes[pkg] = { size: 0, count: 0 };
    if (!pkgBreakdown[pkg]) pkgBreakdown[pkg] = {};
    pkgSizes[pkg].size += stat.size;
    pkgSizes[pkg].count++;
    const sub = rel.replace(/^[^/]+\//, '').split('/')[0];
    if (!pkgBreakdown[pkg][sub]) pkgBreakdown[pkg][sub] = 0;
    pkgBreakdown[pkg][sub] += stat.size;
  } else {
    mainSize += stat.size;
    mainCount++;
  }
});

console.log('===== 主包 =====');
console.log('  文件数:', mainCount);
console.log('  体积:', (mainSize/1024).toFixed(1), 'KB (', (mainSize/1024/1024).toFixed(2), 'MB)');
console.log('  红线: 2.00 MB');
const mainOk = mainSize < 2*1024*1024;
console.log('  ' + (mainOk ? '✅ 未超线，余 ' + ((2*1024*1024-mainSize)/1024).toFixed(1) + ' KB' : '❌ 超 ' + ((mainSize-2*1024*1024)/1024).toFixed(1) + ' KB'));

// 主包按目录
const byDir = {};
walk(root, (fp, rel) => {
  if (getSubpackage(rel)) return;
  const top = rel.split('/')[0];
  const stat = fs.statSync(fp);
  byDir[top] = (byDir[top] || 0) + stat.size;
});
console.log('');
console.log('  主包内容:');
Object.entries(byDir).sort((a,b) => b[1]-a[1]).forEach(([d, s]) => {
  console.log('    ' + (s/1024).toFixed(1).padStart(8) + ' KB  ' + d + '/');
});

console.log('');
console.log('===== 分包 =====');
let allOk = mainOk;
for (const [name, info] of Object.entries(pkgSizes)) {
  console.log('  ' + name + ': ' + info.count + ' 文件, ' + (info.size/1024).toFixed(1) + 'KB (' + (info.size/1024/1024).toFixed(2) + 'MB)');
  const ok = info.size < 2*1024*1024;
  if (!ok) allOk = false;
  console.log('    ' + (ok ? '✅ 余 ' + ((2*1024*1024-info.size)/1024).toFixed(1) + ' KB' : '❌ 超 ' + ((info.size-2*1024*1024)/1024).toFixed(1) + ' KB'));
  if (pkgBreakdown[name]) {
    Object.entries(pkgBreakdown[name]).sort((a,b) => b[1]-a[1]).forEach(([d, s]) => {
      console.log('      ' + (s/1024).toFixed(1).padStart(8) + ' KB  ' + d + '/');
    });
  }
}

console.log('');
const totalAll = mainSize + Object.values(pkgSizes).reduce((s, i) => s + i.size, 0);
console.log('总大小:', (totalAll/1024/1024).toFixed(2), 'MB / 20MB');
console.log('');
console.log(allOk ? '🎉 全部包 < 2MB，可以预览!' : '⚠️ 仍有包超标');