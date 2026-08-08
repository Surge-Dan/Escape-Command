#!/usr/bin/env node
// 智能图片压缩 v3 - 使用临时ASCII目录绕过中文路径问题
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const os = require('os');

const imgDir = path.join(__dirname, '..', 'assets', 'images');
const rootDir = path.join(__dirname, '..');
const tempDir = path.join(os.tmpdir(), 'escape_img_work');

// 生成带BOM的PS1脚本 - param在最前
const psTemplate = `param([string]$InputFile, [string]$OutputFile, [int]$Quality, [double]$Scale)
Add-Type -AssemblyName System.Drawing
$img = [System.Drawing.Image]::FromFile($InputFile)
$origW = $img.Width; $origH = $img.Height
$hasAlpha = ($img.PixelFormat -band [System.Drawing.Imaging.PixelFormat]::Alpha) -ne 0
$newW = [int]($origW * $Scale)
$newH = [int]($origH * $Scale)
if ($hasAlpha) {
    $bmp = New-Object System.Drawing.Bitmap($newW, $newH, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
} else {
    $bmp = New-Object System.Drawing.Bitmap($newW, $newH, [System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
}
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
$g.DrawImage($img, 0, 0, $newW, $newH)
$img.Dispose()
$outPath = Join-Path (Get-Location) $OutputFile
if ($Quality -gt 0) {
    $codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
    $encoder = [System.Drawing.Imaging.Encoder]::Quality
    $params = New-Object System.Drawing.Imaging.EncoderParameters(1)
    $params.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter($encoder, [int64]$Quality)
    $bmp.Save($outPath, $codec, $params)
} else {
    $bmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
}
$g.Dispose(); $bmp.Dispose()
`;

// 直接写PS1模板（固定到tempDir）
const psPath = path.join(tempDir, 'process.ps1');
fs.mkdirSync(tempDir, { recursive: true });
const bom = Buffer.from([0xEF, 0xBB, 0xBF]);
fs.writeFileSync(psPath, Buffer.concat([bom, Buffer.from(psTemplate, 'utf-8')]));

function processImage(pngPath, index) {
  const name = path.basename(pngPath, '.png');
  const origSize = fs.statSync(pngPath).size;

  // 判断alpha
  let hasAlpha = false;
  try {
    const buf = fs.readFileSync(pngPath);
    if (buf.length > 25) {
      const colorType = buf[25];
      hasAlpha = colorType === 4 || colorType === 6;
    }
  } catch (e) {}

  // 步骤1: 复制到临时ASCII目录
  const tempPng = path.join(tempDir, 'input_' + index + '.png');
  fs.copyFileSync(pngPath, tempPng);

  let outputName;
  if (hasAlpha) {
    outputName = 'output_' + index + '.png';
  } else {
    outputName = 'output_' + index + '.jpg';
  }

  try {
    const quality = hasAlpha ? 0 : 75;
    const scale = hasAlpha ? 0.70 : 1.0;

    execSync(`powershell -NoProfile -ExecutionPolicy Bypass -File "${psPath}" -InputFile "${tempPng}" -OutputFile "${outputName}" -Quality ${quality} -Scale ${scale}`, {
      timeout: 60000,
      stdio: 'pipe',
      cwd: tempDir
    });

    const tempOutput = path.join(tempDir, outputName);
    if (!fs.existsSync(tempOutput)) {
      throw new Error('输出文件未生成');
    }

    const newSize = fs.statSync(tempOutput).size;

    // 复制回原位置
    if (hasAlpha) {
      fs.unlinkSync(pngPath);
      fs.copyFileSync(tempOutput, pngPath);
    } else {
      const jpgPath = pngPath.replace(/\.png$/i, '.jpg');
      fs.copyFileSync(tempOutput, jpgPath);
      fs.unlinkSync(pngPath);
    }

    const savings = ((1 - newSize / origSize) * 100).toFixed(0);
    const tag = hasAlpha ? 'ALPHA→PNG 70%' : '→JPG q75';
    console.log(`  ${name.padEnd(30)} ${(origSize/1024).toFixed(1).padStart(8)} → ${(newSize/1024).toFixed(1).padStart(8)} KB  (-${savings}%)  ${tag}`);
    return { origSize, newSize, hasAlpha };
  } catch (e) {
    console.error(`  ❌ ${name}: ${e.message.substring(0, 80)}`);
    return null;
  } finally {
    // 清理临时文件
    try { fs.unlinkSync(tempPng); } catch (e) {}
    try { fs.unlinkSync(path.join(tempDir, outputName)); } catch (e) {}
  }
}

// ---------- 主流程 ----------
console.log('===== 智能图片压缩 v3 (ASCII临时目录) =====');
console.log(`  临时工作目录: ${tempDir}`);
console.log('  策略: 透明PNG→缩放到70% | 不透明PNG→JPG quality 75\n');

const pngFiles = fs.readdirSync(imgDir)
  .filter(f => f.toLowerCase().endsWith('.png'))
  .map(f => path.join(imgDir, f))
  .sort((a, b) => fs.statSync(b).size - fs.statSync(a).size);

console.log(`共 ${pngFiles.length} 个PNG文件\n`);

let origTotal = 0, newTotal = 0, success = 0, fail = 0;

for (let i = 0; i < pngFiles.length; i++) {
  const result = processImage(pngFiles[i], i);
  if (result) {
    origTotal += result.origSize;
    newTotal += result.newSize;
    success++;
  } else {
    fail++;
  }
}

// 清理临时目录
try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch (e) {}

console.log(`\n===== 汇总 =====`);
console.log(`  原始: ${(origTotal/1024/1024).toFixed(2)} MB`);
console.log(`  压缩: ${(newTotal/1024/1024).toFixed(2)} MB`);
console.log(`  节省: ${((origTotal-newTotal)/1024/1024).toFixed(2)} MB  (${((1-newTotal/origTotal)*100).toFixed(0)}%)`);
console.log(`  成功: ${success}  失败: ${fail}`);
