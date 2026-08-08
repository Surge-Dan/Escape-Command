
Add-Type -AssemblyName System.Drawing
$img = [System.Drawing.Image]::FromFile('D:/TRAEWork/Projects/出逃指令/escape-command/assets/images/bt-street-1.png')
$bmp = New-Object System.Drawing.Bitmap($img.Width, $img.Height)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.DrawImage($img, 0, 0, $img.Width, $img.Height)
$codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
$encoder = [System.Drawing.Imaging.Encoder]::Quality
$params = New-Object System.Drawing.Imaging.EncoderParameters(1)
$params.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter($encoder, 75L)
$bmp.Save('D:/TRAEWork/Projects/出逃指令/escape-command/assets/images/bt-street-1.jpg', $codec, $params)
$g.Dispose(); $bmp.Dispose(); $img.Dispose()
