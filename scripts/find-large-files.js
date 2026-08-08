#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const aj = JSON.parse(fs.readFileSync('app.json', 'utf-8'));
const pc = JSON.parse(fs.readFileSync('project.config.json', 'utf-8'));

const ignoreFolders = new Set();
const ignoreFiles = new Set();
for (const item of (pc.packOptions?.ignore || [])) {
  if (item.type === 'folder') ignoreFolders.add(item.value);
  else if (item.type === 'file') ignoreFiles.add(item.value);
}

function isIgnored(rel) {
  if (ignoreFiles.has(rel)) return true;
  const parts = rel.split('/');
  for (let i = 1; i <= parts.length; i++) {
    if (ignoreFolders.has(parts.slice(0, i).join('/'))) return true;
  }
  return false;
}

function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['.git', 'node_modules', 'miniprogram_npm'].includes(e.name)) continue;
    const fp = path.join(dir, e.name);
    const rel = fp.split(path.sep).join('/').replace(/^\.\//, '');
    if (isIgnored(rel)) continue;
    if (e.isDirectory()) walk(fp);
    else {
      const stat = fs.statSync(fp);
      if (stat.size > 100 * 1024) {
        const pkg = (aj.subPackages || []).find(sp => rel.startsWith(sp.root + '/'));
        const loc = pkg ? pkg.name : 'main';
        console.log('  ' + (stat.size/1024).toFixed(1).padStart(8) + ' KB  [' + loc + ']  ' + rel);
      }
    }
  }
}
walk('.');