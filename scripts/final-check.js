// 综合最终检查：WXML 标签闭合 + 页面文件完整性
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
let wxmlOk = 0, wxmlFail = 0;
const wxmlErrs = [];

// 1. WXML 标签闭合检查
// WXML 中所有标签都可以成对 <tag></tag> 或自闭合 <tag />，由是否含 / 决定
function checkWxml(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', '.git', 'miniprogram_npm'].includes(e.name)) continue;
    const fp = path.join(dir, e.name);
    if (e.isDirectory()) checkWxml(fp);
    else if (e.name.endsWith('.wxml')) {
      const c = fs.readFileSync(fp, 'utf-8');
      const stack = [];
      const re = /<(\/?)([\w-]+)([^>]*?)(\/?)>/g;
      let m;
      let lineNum = 1, lastIdx = 0;
      let hasErr = false;
      while ((m = re.exec(c)) !== null) {
        const text = c.substring(lastIdx, m.index);
        lineNum += (text.match(/\n/g) || []).length;
        lastIdx = m.index;
        const [full, closing, tag, attrs, selfClose] = m;
        if (closing === '/') {
          // 闭合标签
          const idx = stack.lastIndexOf(tag);
          if (idx === -1) {
            wxmlErrs.push(`${path.relative(root, fp)}:${lineNum} 未匹配的闭合标签 </${tag}>`);
            wxmlFail++;
            hasErr = true;
            break;
          }
          stack.splice(idx, 1);
        } else if (selfClose !== '/') {
          // 开标签（非自闭合）- 压栈
          stack.push(tag);
        }
      }
      if (!hasErr) {
        if (stack.length > 0) {
          wxmlErrs.push(`${path.relative(root, fp)}: 未闭合的标签 ${stack.join(', ')}`);
          wxmlFail++;
        } else {
          wxmlOk++;
        }
      }
    }
  }
}
checkWxml(root);

// 2. app.json 中每个 page 的文件存在性
const appJson = JSON.parse(fs.readFileSync(path.join(root, 'app.json'), 'utf-8'));
let pageOk = 0, pageFail = 0;
const pageErrs = [];
for (const page of appJson.pages) {
  for (const ext of ['.js', '.wxml', '.json']) {
    const fp = path.join(root, page + ext);
    if (!fs.existsSync(fp)) {
      pageErrs.push(`${page}${ext} 不存在`);
      pageFail++;
    } else {
      pageOk++;
    }
  }
}

// 3. custom-tab-bar 文件完整性
const tabBarPath = path.join(root, 'custom-tab-bar');
let tabBarOk = true;
const tabBarErrs = [];
for (const f of ['index.js', 'index.wxml', 'index.json', 'index.wxss']) {
  if (!fs.existsSync(path.join(tabBarPath, f))) {
    tabBarErrs.push('custom-tab-bar/' + f + ' 不存在');
    tabBarOk = false;
  }
}

console.log('=== 最终综合验证 ===\n');
console.log('1. WXML 标签闭合: OK=' + wxmlOk + ' FAIL=' + wxmlFail);
wxmlErrs.forEach(e => console.log('   ❌ ' + e));
console.log('2. 页面文件完整性: OK=' + pageOk + ' FAIL=' + pageFail + ' (共 ' + appJson.pages.length + ' 页面)');
pageErrs.forEach(e => console.log('   ❌ ' + e));
console.log('3. Custom TabBar 完整性: ' + (tabBarOk ? '✅ 完整' : '❌ 缺失'));
tabBarErrs.forEach(e => console.log('   ❌ ' + e));

const allOk = wxmlFail === 0 && pageFail === 0 && tabBarOk;
console.log('\n' + (allOk ? '🎉 全部检查通过！' : '⚠️ 存在问题需修复'));
