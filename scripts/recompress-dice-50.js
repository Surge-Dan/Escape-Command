#!/usr/bin/env node
// 把 3D 骰子从原始 1.6MB 缩放到 50%（比 25% 清晰 4 倍），保留 3D 立体感
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const os = require('os');

const srcDir = path.join(__dirname, '..', 'tmp_restore');
const diceDir = path.join(__dirname, '..', 'packageDice', 'images');
const mainDir = path.join(__dirname, '..', 'assets', 'dice');
const tempDir = path.join(os.tmpdir(), 'escape_dice50');

const psScript = `
param([string]$InputFile, [string]$OutputFile, [double]$Scale)
Add-Type -AssemblyName System.Drawing
$img = [System.Drawing.Image]::FromFile($InputFile)
$newW = [int]($img.Width * $Scale)
$newH = [int]($img.Height * $Scale)
$bmp = New-Object System.Drawing.Bitmap($newW, $newH, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$g.DrawImage($img, 0, 0, $newW, $newH)
$img.Dispose()
$bmp.Save($OutputFile, [System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose(); $bmp.Dispose()
`;

const psPath = path.join(tempDir, 'process.ps1');
fs.mkdirSync(tempDir, { recursive: true });
fs.writeFileSync(psPath, Buffer.from(psScript, 'utf-8'));

// 50% 缩放：1.6MB 原图 → ~500KB/张，3 张合计 ~1.5MB，packageDice 仍 < 2MB
const pkgScale = 0.50;
// 5% 缩放：主包 fallback 极致小图（仅弱网兜底，正常路径下不显示）
const mainScale = 0.05;

const targets = [
  { src: 'red.png',    pkgDst: 'dice-red-3d.png',    mainDst: 'dice-red-3d.png' },
  { src: 'green.png',  pkgDst: 'dice-green-3d.png',  mainDst: 'dice-green-3d.png' },
  { src: 'purple.png', pkgDst: 'dice-purple-3d.png', mainDst: 'dice-purple-3d.png' }
];

let pkgTotal = 0, mainTotal = 0;

targets.forEach((t, i) => {
  const srcPath = path.join(srcDir, t.src);
  if (!fs.existsSync(srcPath)) { console.log('Skip:', t.src); return; }

  // 处理 packageDice 版本（50% 缩放）
  const tempInput = path.join(tempDir, 'in_pkg_' + i + '.png');
  const tempOutput = path.join(tempDir, 'out_pkg_' + i + '.png');
  fs.copyFileSync(srcPath, tempInput);
  execSync(`powershell -NoProfile -ExecutionPolicy Bypass -File "${psPath}" -InputFile "${tempInput}" -OutputFile "${tempOutput}" -Scale ${pkgScale}`, {
    timeout: 60000, stdio: 'pipe', maxBuffer: 50*1024*1024
  });
  const pkgSize = fs.statSync(tempOutput).size;
  fs.writeFileSync(path.join(diceDir, t.pkgDst), fs.readFileSync(tempOutput));
  pkgTotal += pkgSize;
  console.log(`  [pkg] ${t.pkgDst.padEnd(20)} ${(pkgSize/1024).toFixed(1).padStart(7)} KB (scale=${pkgScale})`);
  try { fs.unlinkSync(tempInput); fs.unlinkSync(tempOutput); } catch(e){}

  // 处理主包 fallback 版本（35% 缩放）
  const tempInput2 = path.join(tempDir, 'in_main_' + i + '.png');
  const tempOutput2 = path.join(tempDir, 'out_main_' + i + '.png');
  fs.copyFileSync(srcPath, tempInput2);
  execSync(`powershell -NoProfile -ExecutionPolicy Bypass -File "${psPath}" -InputFile "${tempInput2}" -OutputFile "${tempOutput2}" -Scale ${mainScale}`, {
    timeout: 60000, stdio: 'pipe', maxBuffer: 50*1024*1024
  });
  const mainSize = fs.statSync(tempOutput2).size;
  fs.writeFileSync(path.join(mainDir, t.mainDst), fs.readFileSync(tempOutput2));
  mainTotal += mainSize;
  console.log(`  [main] ${t.mainDst.padEnd(20)} ${(mainSize/1024).toFixed(1).padStart(7)} KB (scale=${mainScale})`);
  try { fs.unlinkSync(tempInput2); fs.unlinkSync(tempOutput2); } catch(e){}
});

console.log(`\n  packageDice 合计: ${(pkgTotal/1024).toFixed(1)} KB`);
console.log(`  主包 合计:       ${(mainTotal/1024).toFixed(1)} KB`);
try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch(e){}
