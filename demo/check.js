const fs = require('fs');
const html = fs.readFileSync('d:/TRAEWork/Projects/出逃指令/escape-command/demo/index.html', 'utf8');
const m = html.match(/<script>([\s\S]*)<\/script>/);
if (!m) { console.log('No script tag found'); process.exit(1); }
try {
  new Function(m[1]);
  console.log('JS syntax OK, length:', m[1].length);
} catch(e) {
  console.log('JS ERROR:', e.message);
  // Find the line
  const lines = m[1].split('\n');
  console.log('Total JS lines:', lines.length);
}
