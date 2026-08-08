#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const os = require('os');

const imgDir = path.join(__dirname, '..', 'packageAssets', 'images');
const tempDir = path.join(os.tmpdir(), 'escape_dicefaces');

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

const targets = fs.readdirSync(imgDir).filter(f => /^dice-(red|green|purple)-\d+\.png$/.test(f));
const scale = 0.50;
let origTotal = 0, newTotal = 0;

targets.forEach((name, i) => {
  const pngPath = path.join(imgDir, name);
  if (!fs.existsSync(pngPath)) return;
  const origSize = fs.statSync(pngPath).size;
  const tempInput = path.join(tempDir, 'in_' + i + '.png');
  const tempOutput = path.join(tempDir, 'out_' + i + '.png');
  fs.copyFileSync(pngPath, tempInput);

  try {
    execSync(`powershell -NoProfile -ExecutionPolicy Bypass -File "${psPath}" -InputFile "${tempInput}" -OutputFile "${tempOutput}" -Scale ${scale}`, {
      timeout: 30000,
      stdio: 'pipe'
    });
    const newSize = fs.statSync(tempOutput).size;
    fs.unlinkSync(pngPath);
    fs.copyFileSync(tempOutput, pngPath);
    origTotal += origSize;
    newTotal += newSize;
    console.log(`  ${name.padEnd(25)} ${(origSize/1024).toFixed(1).padStart(7)} -> ${(newSize/1024).toFixed(1).padStart(7)} KB`);
  } catch (e) {
    console.error(`  ERROR ${name}: ${e.message.substring(0, 100)}`);
  } finally {
    try { fs.unlinkSync(tempInput); } catch(e){}
    try { fs.unlinkSync(tempOutput); } catch(e){}
  }
});

console.log(`\nTotal: ${(origTotal/1024/1024).toFixed(2)} -> ${(newTotal/1024/1024).toFixed(2)} MB`);
try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch(e){}