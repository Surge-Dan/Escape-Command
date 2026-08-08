#!/usr/bin/env node
// 批量 PNG → JPG 转换脚本 (Node.js)
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const imgDir = path.join(__dirname, '..', 'assets', 'images');

// 使用 PowerShell + System.Drawing (GDI+) 转换
// 脚本写入临时文件避免路径/引号转义问题
function convertPngToJpg(pngPath) {
  const jpgPath = pngPath.replace(/\.png$/i, '.jpg');
  const psScriptPath = path.join(__dirname, '_convert_temp.ps1');
  const pngAbs = pngPath.replace(/\\/g, '/');
  const jpgAbs = jpgPath.replace(/\\/g, '/');

  const psScript = `
Add-Type -AssemblyName System.Drawing
$img = [System.Drawing.Image]::FromFile('${pngAbs}')
$bmp = New-Object System.Drawing.Bitmap($img.Width, $img.Height)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.DrawImage($img, 0, 0, $img.Width, $img.Height)
$codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
$encoder = [System.Drawing.Imaging.Encoder]::Quality
$params = New-Object System.Drawing.Imaging.EncoderParameters(1)
$params.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter($encoder, 75L)
$bmp.Save('${jpgAbs}', $codec, $params)
$g.Dispose(); $bmp.Dispose(); $img.Dispose()
`;

  try {
    fs.writeFileSync(psScriptPath, psScript, 'utf-8');
    const origSize = fs.statSync(pngPath).size;
    execSync(`powershell -NoProfile -File "${psScriptPath}"`, { timeout: 30000, stdio: 'pipe' });
    const jpgSize = fs.statSync(jpgPath).size;
    console.log(`  ${path.basename(pngPath).padEnd(20)} ${(origSize/1024).toFixed(1).padStart(8)} KB → ${(jpgSize/1024).toFixed(1).padStart(8)} KB  (-${(100-jpgSize/origSize*100).toFixed(0)}%)`);
    fs.unlinkSync(pngPath);
    return { origSize, jpgSize };
  } catch (e) {
    console.error(`  ❌ 转换失败: ${path.basename(pngPath)}`);
    return null;
  }
}

// ---------- 主流程 ----------
console.log('===== PNG → JPG 转换 =====\n');

const pngFiles = fs.readdirSync(imgDir)
  .filter(f => f.toLowerCase().endsWith('.png'))
  .map(f => path.join(imgDir, f))
  .sort((a, b) => fs.statSync(b).size - fs.statSync(a).size);

console.log(`共 ${pngFiles.length} 个 PNG 文件待转换\n`);

let origTotal = 0, jpgTotal = 0, success = 0, fail = 0;

for (const png of pngFiles) {
  const result = convertPngToJpg(png);
  if (result) { origTotal += result.origSize; jpgTotal += result.jpgSize; success++; }
  else fail++;
}

// 清理临时脚本
const tempScript = path.join(__dirname, '_convert_temp.ps1');
if (fs.existsSync(tempScript)) fs.unlinkSync(tempScript);

console.log(`\n===== 汇总 =====`);
console.log(`  原始: ${(origTotal/1024/1024).toFixed(2)} MB`);
console.log(`  压缩: ${(jpgTotal/1024/1024).toFixed(2)} MB`);
console.log(`  节省: ${((origTotal-jpgTotal)/1024/1024).toFixed(2)} MB  (${(100-jpgTotal/origTotal*100).toFixed(0)}%)`);
console.log(`  成功: ${success}  失败: ${fail}`);
