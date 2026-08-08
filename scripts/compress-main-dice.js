#!/usr/bin/env node
// 把首页 3D 骰子（assets/dice/）缩放到 25%
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const os = require('os');

const imgDir = path.join(__dirname, '..', 'assets', 'dice');
const tempDir = path.join(os.tmpdir(), 'escape_dice_main_25');

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

const targets = ['红色骰子3d.png', '紫色骰子3d.png', '绿色骰子3d.png'];
const scale = 0.40;  // 40% 缩放：300x430 像素，文件约 30-40KB

let origTotal = 0, newTotal = 0;

targets.forEach((name, i) => {
  const pngPath = path.join(imgDir, name);
  if (!fs.existsSync(pngPath)) {
    console.log('  Skip:', name);
    return;
  }
  const origSize = fs.statSync(pngPath).size;
  const tempInput = path.join(tempDir, 'in_' + i + '.png');
  const tempOutput = path.join(tempDir, 'out_' + i + '.png');
  fs.copyFileSync(pngPath, tempInput);

  try {
    execSync('powershell -NoProfile -ExecutionPolicy Bypass -File "' + psPath + '" -InputFile "' + tempInput + '" -OutputFile "' + tempOutput + '" -Scale ' + scale, {
      timeout: 60000,
      stdio: 'pipe'
    });

    const newSize = fs.statSync(tempOutput).size;
    fs.unlinkSync(pngPath);
    fs.copyFileSync(tempOutput, pngPath);

    const savings = ((1 - newSize / origSize) * 100).toFixed(0);
    origTotal += origSize;
    newTotal += newSize;
    console.log('  ' + name.padEnd(20) + (origSize/1024).toFixed(1).padStart(8) + ' -> ' + (newSize/1024).toFixed(1).padStart(7) + ' KB  (' + (origSize/1024).toFixed(1) + ' -> ' + (newSize/1024).toFixed(1) + ' KB)');
  } catch (e) {
    console.error('  ERROR ' + name + ': ' + e.message.substring(0, 120));
  } finally {
    try { fs.unlinkSync(tempInput); } catch(e){}
    try { fs.unlinkSync(tempOutput); } catch(e){}
  }
});

console.log('\nTotal: ' + (origTotal/1024).toFixed(1) + ' -> ' + (newTotal/1024).toFixed(1) + ' KB');
try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch(e){}