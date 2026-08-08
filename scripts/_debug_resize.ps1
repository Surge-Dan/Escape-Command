Add-Type -AssemblyName System.Drawing
$inputPath = 'D:/TRAEWork/Projects/出逃指令/escape-command/assets/images/dice-red-3d.png'
$outputPath = 'D:/TRAEWork/Projects/出逃指令/escape-command/assets/images/_test_output.png'
$img = [System.Drawing.Image]::FromFile($inputPath)
Write-Output "Input: $($img.Width)x$($img.Height), PixelFormat: $($img.PixelFormat)"
$hasAlpha = ($img.PixelFormat -band [System.Drawing.Imaging.PixelFormat]::Alpha) -ne 0
Write-Output "HasAlpha: $hasAlpha"
$newW = [int]($img.Width * 0.70)
$newH = [int]($img.Height * 0.70)
Write-Output "New size: ${newW}x${newH}"
$bmp = New-Object System.Drawing.Bitmap($newW, $newH, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.DrawImage($img, 0, 0, $newW, $newH)
$img.Dispose()
$bmp.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose(); $bmp.Dispose()
$origSize = (Get-Item $inputPath).Length
$newSize = (Get-Item $outputPath).Length
Write-Output "Orig: $origSize bytes, New: $newSize bytes, Ratio: $([math]::Round((1 - $newSize/$origSize)*100))%"
