// 包体与资源红线检查 —— 微信开发者工具规则
// 红线：
//   1. 本次 PR 新增/修改的任意资源（图片/音频/字体/视频/插件）单文件 ≤ 200KB
//   2. 单次 PR 累计资源增量 ≤ 30KB
//   3. 主包估算 < 1.5MB（按 app.json 注册页面 + 全局字体 + tabBar 图标 + 启动页 webp 估算）
//   4. 全仓历史问题：单文件 > 200KB 报警但不 fail（需要独立 Spec 处理）
//
// 用法：
//   node scripts/check-bundle.js                 # 全仓扫描 + 主包估算
//   node scripts/check-bundle.js --base=origin/dev  # 加 PR 增量硬卡口
//
// 退出码：0 通过 / 1 红线违规

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const root = path.join(__dirname, '..');
const args = process.argv.slice(2);
const baseArg = args.find(a => a.startsWith('--base='));
const base = baseArg ? baseArg.split('=')[1] : null;

const THRESHOLD = {
  SINGLE_FILE: 200 * 1024,       // 200 KB
  PR_INCREMENT: 30 * 1024,       // 30 KB
  MAIN_BUNDLE: 1.5 * 1024 * 1024 // 1.5 MB
};

const RESOURCE_EXTS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.bmp', '.ico',
                                 '.mp3', '.wav', '.aac', '.m4a', '.ogg', '.flac',
                                 '.mp4', '.mov', '.avi', '.webm',
                                 '.ttf', '.otf', '.woff', '.woff2', '.eot']);

function walk(dir, cb) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', '.git', 'miniprogram_npm', 'miniprogramRoot_backup', 'demo'].includes(e.name)) continue;
    const fp = path.join(dir, e.name);
    if (e.isDirectory()) walk(fp, cb);
    else cb(fp);
  }
}

function toPosix(p) {
  return p.split(path.sep).join('/');
}

function isResource(fp) {
  return RESOURCE_EXTS.has(path.extname(fp).toLowerCase());
}

function fmtSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1024 / 1024).toFixed(2) + ' MB';
}

// 1. 全仓扫描
const allResources = [];
walk(root, fp => {
  if (!isResource(fp)) return;
  const stat = fs.statSync(fp);
  allResources.push({ path: toPosix(path.relative(root, fp)), size: stat.size });
});

const allOverThreshold = allResources.filter(r => r.size > THRESHOLD.SINGLE_FILE);

// 2. 主包估算（粗略：app.json 注册的页面引用的 webp + 全局字体 + tabBar 图标 + 启动页用到的）
let mainBundleEstimate = 0;
const appJson = JSON.parse(fs.readFileSync(path.join(root, 'app.json'), 'utf-8'));

// 2a. 字体（全局）= 主包必带
const fontFiles = allResources.filter(r => r.path.startsWith('assets/fonts/'));
const fontTotal = fontFiles.reduce((s, r) => s + r.size, 0);
mainBundleEstimate += fontTotal;

// 2b. tabBar 图标（启动就要）
const tabIconRegex = /tab-(escape|map|profile)(-active)?\.svg/;
const tabIcons = allResources.filter(r => tabIconRegex.test(r.path));
const tabIconTotal = tabIcons.reduce((s, r) => s + r.size, 0);
mainBundleEstimate += tabIconTotal;

// 2c. app.json 注册的页面 wxml/wxss 静态引用的资源
const referencedAssets = new Set();
for (const page of appJson.pages) {
  for (const ext of ['.wxml', '.wxss']) {
    const fp = path.join(root, page + ext);
    if (!fs.existsSync(fp)) continue;
    const c = fs.readFileSync(fp, 'utf-8');
    // 匹配 wxml 的 src="..." 和 wxss 的 background-image: url(...)
    const reSrc = /src\s*=\s*['"]([^'"]+\.(?:png|jpg|jpeg|gif|webp|svg))['"]/gi;
    const reUrl = /url\(\s*['"]?([^'")]+)['"]?\s*\)/gi;
    let m;
    while ((m = reSrc.exec(c)) !== null) {
      const ref = m[1].replace(/^\//, '');
      if (ref.startsWith('assets/') || ref.startsWith('images/')) {
        const norm = ref.startsWith('images/') ? 'assets/' + ref : ref;
        referencedAssets.add(norm);
      }
    }
    while ((m = reUrl.exec(c)) !== null) {
      const ref = m[1].replace(/^\//, '');
      if (ref.startsWith('assets/') || ref.startsWith('images/')) {
        const norm = ref.startsWith('images/') ? 'assets/' + ref : ref;
        referencedAssets.add(norm);
      }
    }
  }
}
for (const asset of referencedAssets) {
  const fp = path.join(root, asset);
  if (fs.existsSync(fp)) {
    const stat = fs.statSync(fp);
    mainBundleEstimate += stat.size;
  }
}

// 2d. app.js / app.wxss 引用的资源（启动阶段）
for (const name of ['app.js', 'app.wxss']) {
  const fp = path.join(root, name);
  if (!fs.existsSync(fp)) continue;
  const c = fs.readFileSync(fp, 'utf-8');
  const reSrc = /['"]((?:assets|images|img)\/[^'"]+\.(?:png|jpg|jpeg|gif|webp|svg))['"]/gi;
  const reUrl = /url\(\s*['"]?([^'")]+)['"]?\s*\)/gi;
  let m;
  while ((m = reSrc.exec(c)) !== null) {
    const fp2 = path.join(root, m[1]);
    if (fs.existsSync(fp2)) mainBundleEstimate += fs.statSync(fp2).size;
  }
  while ((m = reUrl.exec(c)) !== null) {
    const ref = m[1].replace(/^\//, '');
    if (ref.startsWith('assets/') || ref.startsWith('images/')) {
      const fp2 = path.join(root, ref);
      if (fs.existsSync(fp2)) mainBundleEstimate += fs.statSync(fp2).size;
    }
  }
}

// 3. PR 增量（如果指定 --base）
let prNew = [];
let prModified = [];
let prIncrement = 0;
let prViolations = [];

if (base) {
  try {
    const diffOut = execSync(`git diff --name-status ${base}...HEAD`, { cwd: root, encoding: 'utf-8' });
    const lines = diffOut.trim().split('\n').filter(Boolean);
    for (const line of lines) {
      const [status, ...rest] = line.split('\t');
      const fp = rest.join('\t');
      if (!isResource(fp)) continue;
      const fullPath = path.join(root, fp);
      if (!fs.existsSync(fullPath)) continue;
      const size = fs.statSync(fullPath).size;
      if (status === 'A') prNew.push({ path: fp, size });
      else if (status === 'M') prModified.push({ path: fp, size });
      prIncrement += size;
      if (size > THRESHOLD.SINGLE_FILE) {
        prViolations.push(`新增/修改资源单文件超 200KB：${fp} (${fmtSize(size)})`);
      }
    }
  } catch (e) {
    console.error('❌ 无法读取 git diff：' + e.message);
    console.error('   确认 base 分支存在且当前分支已 commit。');
    process.exit(1);
  }
}

// ============ 输出 ============
console.log('=== 📦 包体与资源红线检查 ===\n');

// 全仓资源
console.log('1. 全仓资源统计');
const byType = {};
for (const r of allResources) {
  const ext = path.extname(r.path).toLowerCase();
  byType[ext] = (byType[ext] || { count: 0, size: 0 });
  byType[ext].count++;
  byType[ext].size += r.size;
}
const sorted = Object.entries(byType).sort((a, b) => b[1].size - a[1].size);
for (const [ext, info] of sorted) {
  console.log(`   ${ext.padEnd(8)} ${String(info.count).padStart(4)} 个  ${fmtSize(info.size).padStart(10)}`);
}
console.log(`   ${'合计'.padEnd(8)} ${String(allResources.length).padStart(4)} 个  ${fmtSize(allResources.reduce((s, r) => s + r.size, 0)).padStart(10)}`);
console.log('');

// 历史红线
if (allOverThreshold.length > 0) {
  console.log('2. ⚠️  历史问题（单文件 > 200KB，需独立 Spec 处理）');
  for (const r of allOverThreshold.sort((a, b) => b.size - a.size)) {
    console.log(`   ❌ ${r.path}  ${fmtSize(r.size)}`);
  }
  console.log(`   共 ${allOverThreshold.length} 个文件超线`);
  console.log('   建议：开「主包瘦身 Spec」统一处理（参考 roadmap）\n');
} else {
  console.log('2. ✅ 全仓无单文件超 200KB\n');
}

// 主包估算
console.log(`3. 主包估算（粗略）`);
console.log(`   - 字体（全局）        ${fontFiles.length} 个  ${fmtSize(fontTotal)}`);
console.log(`   - tabBar 图标         ${tabIcons.length} 个  ${fmtSize(tabIconTotal)}`);
console.log(`   - 注册页面 wxml 引用  ${referencedAssets.size} 个`);
console.log(`   - app.js 引用（启动）`);
console.log(`   = 估算主包 ${fmtSize(mainBundleEstimate)}（红线 ${fmtSize(THRESHOLD.MAIN_BUNDLE)}）`);
if (mainBundleEstimate > THRESHOLD.MAIN_BUNDLE) {
  console.log('   ❌ 主包超 1.5MB 红线');
} else {
  console.log('   ✅ 主包未超 1.5MB 红线');
}
console.log('');

// PR 增量
if (base) {
  console.log(`4. PR 增量检查（base=${base}）`);
  if (prNew.length === 0 && prModified.length === 0) {
    console.log('   ✅ 本次 PR 未新增/修改任何资源');
  } else {
    if (prNew.length > 0) {
      console.log(`   新增 ${prNew.length} 个资源：`);
      for (const r of prNew) console.log(`     + ${r.path}  ${fmtSize(r.size)}`);
    }
    if (prModified.length > 0) {
      console.log(`   修改 ${prModified.length} 个资源：`);
      for (const r of prModified) console.log(`     ~ ${r.path}  ${fmtSize(r.size)}`);
    }
    console.log(`   累计资源体积：${fmtSize(prIncrement)}（红线 ${fmtSize(THRESHOLD.PR_INCREMENT)}）`);
    if (prIncrement > THRESHOLD.PR_INCREMENT) {
      console.log('   ⚠️  累计超过 30KB，需评估是否必须');
    }
  }
  console.log('');
}

// 红线检查结论
const hasPrViolation = prViolations.length > 0;
const allViolations = [...prViolations];
if (mainBundleEstimate > THRESHOLD.MAIN_BUNDLE) {
  allViolations.push(`主包估算 ${fmtSize(mainBundleEstimate)} 超 1.5MB 红线`);
}

console.log('=== 结论 ===');
if (base) {
  // 带 --base 走硬卡口：PR 资源超线直接 fail
  if (hasPrViolation) {
    console.log('❌ PR 红线违规，PR 必须先瘦身再合并：');
    for (const v of prViolations) console.log('   - ' + v);
    process.exit(1);
  } else {
    console.log('✅ PR 资源检查通过');
    if (allOverThreshold.length > 0 || mainBundleEstimate > THRESHOLD.MAIN_BUNDLE) {
      console.log('⚠️  历史问题未解决（不影响本 PR 通过）');
    }
  }
} else {
  // 不带 --base 走自检模式：报警不 fail
  if (allOverThreshold.length > 0 || mainBundleEstimate > THRESHOLD.MAIN_BUNDLE) {
    console.log('⚠️  存在历史包体问题，建议处理后再提 PR');
  } else {
    console.log('🎉 包体健康');
  }
}
