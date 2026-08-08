Add-Type -AssemblyName System.Drawing

# Test 1: 大图缩放 (透明PNG)
$testFile = 'assets/images/红色.png'
$img = [System.Drawing.Image]::FromFile($testFile)
$origW = $img.Width; $origH = $img.Height
$hasAlpha = ($img.PixelFormat -band [System.Drawing.Imaging.PixelFormat]::Alpha) -ne 0
Write-Output "Test 1 - $testFile : ${origW}x${origH}, HasAlpha: $hasAlpha, OrigSize: $((Get-Item $testFile).Length) bytes"

# 缩放到70%
$newW = [int]($origW * 0.70)
$newH = [int]($origH * 0.70)
$bmp = New-Object System.Drawing.Bitmap($newW, $newH, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
$g.DrawImage($img, 0, 0, $newW, $newH)
$tempOut = 'assets/images/_red_test.png'
$bmp.Save($tempOut, [System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose(); $bmp.Dispose(); $img.Dispose()
Write-Output "  Scaled to 70%: ${newW}x${newH}, NewSize: $((Get-Item $tempOut).Length) bytes"
$origSize = (Get-Item $testFile).Length
$newSize = (Get-Item $tempOut).Length
Write-Output "  Savings: $([math]::Round((1 - $newSize/$origSize)*100))%"
Remove-Item $tempOut

# Test 2: 不透明PNG转JPG
$btFile = 'assets/images/bt-role-3.png'
if (Test-Path $btFile) {
  $img2 = [System.Drawing.Image]::FromFile($btFile)
  $hasAlpha2 = ($img2.PixelFormat -band [System.Drawing.Imaging.PixelFormat]::Alpha) -ne 0
  Write-Output "`nTest 2 - $btFile : $($img2.Width)x$($img2.Height), HasAlpha: $hasAlpha2, OrigSize: $((Get-Item $btFile).Length) bytes"
  
  $codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
  $encoder = [System.Drawing.Imaging.Encoder]::Quality
  $params = New-Object System.Drawing.Imaging.EncoderParameters(1)
  $params.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter($encoder, 75L)
  $tempJpg = 'assets/images/_bt_test.jpg'
  $img2.Save($tempJpg, $codec, $params)
  $img2.Dispose()
  Write-Output "  JPG q75: NewSize: $((Get-Item $tempJpg).Length) bytes"
  $origSize2 = (Get-Item $btFile).Length
  $newSize2 = (Get-Item $tempJpg).Length
  Write-Output "  Savings: $([math]::Round((1 - $newSize2/$origSize2)*100))%"
  Remove-Item $tempJpg
}

Write-Output "`nAll tests passed!"
