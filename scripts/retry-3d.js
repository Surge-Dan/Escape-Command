#!/usr/bin/env node
// 针对3D骰子的重试压缩 - 缩放到60%
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const os = require('os');

const imgDir = path.join(__dirname, '..', 'assets', 'images');
const tempDir = path.join(os.tmpdir(), 'escape_img_work2');

const psTemplate = `param([string]$InputFile, [string]$OutputFile, [int]$Quality, [double]$Scale)
Add-Type -AssemblyName System.Drawing
$img = [System.Drawing.Image]::FromFile($InputFile)
$newW = [int]($img.Width * $Scale)
$newH = [int]($img.Height * $Scale)
$bmp = New-Object System.Drawing.Bitmap($newW, $newH, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.DrawImage($img, 0, 0, $newW, $newH)
$img.Dispose()
$outPath = Join-Path (Get-Location) $OutputFile
$bmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose(); $bmp.Dispose()
`;

const psPath = path.join(tempDir, 'process.ps1');
fs.mkdirSync(tempDir, { recursive: true });
const bom = Buffer.from([0xEF, 0xBB, 0xBF]);
fs.writeFileSync(psPath, Buffer.concat([bom, Buffer.from(psTemplate, 'utf-8')]));

// 目标文件：3D骰子和大图（压缩效果差的）
const targets = [
  '红色.png', '紫色.png', '绿色.png',
  '红色骰子3d.png', '绿色骰子3d.png', '紫色骰子3d.png',
  'dice-purple-3d.png', 'dice-green-3d.png', 'dice-red-3d.png',
];

let origTotal = 0, newTotal = 0;

targets.forEach((name, i) => {
  const pngPath = path.join(imgDir, name);
  if (!fs.existsSync(pngPath)) {
    console.log(`  跳过(不存在): ${name}`);
    return;
  }
  const origSize = fs.statSync(pngPath).size;
  const tempPng = path.join(tempDir, `input_${i}.png`);
  fs.copyFileSync(pngPath, tempPng);

  const scale = (name.includes('3d') || name.includes('骰子')) ? 0.60 : 0.65;
  const outputName = `output_${i}.png`;

  try {
    execSync(`powershell -NoProfile -ExecutionPolicy Bypass -File "${psPath}" -InputFile "${tempPng}" -OutputFile "${outputName}" -Quality 0 -Scale ${scale}`, {
      timeout: 60000,
      stdio: 'pipe',
      cwd: tempDir
    });

    const tempOutput = path.join(tempDir, outputName);
    const newSize = fs.statSync(tempOutput).size;
    fs.unlinkSync(pngPath);
    fs.copyFileSync(tempOutput, pngPath);

    const savings = ((1 - newSize / origSize) * 100).toFixed(0);
    origTotal += origSize;
    newTotal += newSize;
    console.log(`  ${name.padEnd(30)} ${(origSize/1024).toFixed(1).padStart(8)} → ${(newSize/1024).toFixed(1).padStart(8)} KB  (-${savings}%)  scale=${scale}`);
  } catch (e) {
    console.error(`  ❌ ${name}: ${e.message.substring(0, 80)}`);
  } finally {
    try { fs.unlinkSync(tempPng); } catch (e) {}
    try { fs.unlinkSync(path.join(tempDir, outputName)); } catch (e) {}
  }
});

console.log(`\n汇总: ${(origTotal/1024/1024).toFixed(2)} → ${(newTotal/1024/1024).toFixed(2)} MB  节省 ${((origTotal-newTotal)/1024/1024).toFixed(2)} MB`);
try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch (e) {}
