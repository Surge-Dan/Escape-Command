#!/usr/bin/env node
// 将 3D 骰子 PNG 转为 WebP（保留透明通道，体积小）
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const os = require('os');

const imgDir = path.join(__dirname, '..', 'packageDice', 'images');
const tempDir = path.join(os.tmpdir(), 'escape_dice2webp');

const psScript = `
param([string]$InputFile, [string]$OutputFile, [int]$Quality)
Add-Type -AssemblyName System.Drawing
$img = [System.Drawing.Image]::FromFile($InputFile)
$codecs = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders()
$webp = $codecs | Where-Object { $_.MimeType -eq 'image/webp' }
if ($webp) {
  $params = New-Object System.Drawing.Imaging.EncoderParameters(1)
  $param = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, [int64]$Quality)
  $params.Param[0] = $param
  $img.Save($OutputFile, $webp, $params)
  Write-Host 'webp'
} else {
  # GDI+ 不支持 webp，回退为带 alpha 的 PNG 但进一步缩放
  $img.Dispose()
  Write-Host 'no-webp-support'
}
`;

const psPath = path.join(tempDir, 'convert.ps1');
fs.mkdirSync(tempDir, { recursive: true });
fs.writeFileSync(psPath, Buffer.from(psScript, 'utf-8'));

const targets = ['红色.png', '紫色.png', '绿色.png', '红色骰子3d.png', '紫色骰子3d.png', '绿色骰子3d.png'];
const quality = 85;

let origTotal = 0, newTotal = 0;

targets.forEach((name, i) => {
  const pngPath = path.join(imgDir, name);
  if (!fs.existsSync(pngPath)) {
    console.log('  Skip:', name);
    return;
  }
  const origSize = fs.statSync(pngPath).size;
  const tempInput = path.join(tempDir, 'in_' + i + '.png');
  const tempOutput = path.join(tempDir, 'out_' + i + '.webp');
  fs.copyFileSync(pngPath, tempInput);

  try {
    const result = execSync('powershell -NoProfile -ExecutionPolicy Bypass -File "' + psPath + '" -InputFile "' + tempInput + '" -OutputFile "' + tempOutput + '" -Quality ' + quality, {
      timeout: 30000,
      encoding: 'utf-8',
      stdio: 'pipe'
    });

    const outputText = (result || '').toString().trim();
    if (outputText === 'webp' && fs.existsSync(tempOutput)) {
      const newSize = fs.statSync(tempOutput).size;
      const newName = name.replace('.png', '.webp');
      const finalPath = path.join(imgDir, newName);
      fs.unlinkSync(pngPath);
      fs.copyFileSync(tempOutput, finalPath);

      const savings = ((1 - newSize / origSize) * 100).toFixed(0);
      origTotal += origSize;
      newTotal += newSize;
      console.log('  ' + name.padEnd(20) + (origSize/1024).toFixed(1).padStart(8) + ' -> ' + (newSize/1024).toFixed(1).padStart(7) + ' KB  (-' + savings + '%)  ' + newName);
    } else {
      console.log('  WebP unsupported for ' + name);
    }
  } catch (e) {
    console.error('  ERROR ' + name + ': ' + e.message.substring(0, 200));
  } finally {
    try { fs.unlinkSync(tempInput); } catch(e){}
    try { fs.unlinkSync(tempOutput); } catch(e){}
  }
});

console.log('\nTotal: ' + (origTotal/1024/1024).toFixed(2) + ' -> ' + (newTotal/1024/1024).toFixed(2) + ' MB');
try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch(e){}