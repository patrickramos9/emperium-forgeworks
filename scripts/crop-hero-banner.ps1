Add-Type -AssemblyName System.Drawing

$srcPath = Join-Path $PSScriptRoot "..\legacy\stitch_export\home_forged_in_shadow\screen.png"
$outDir = Join-Path $PSScriptRoot "..\public\images"
$outPath = Join-Path $outDir "emperium-forgeworks-hero-banner.png"

New-Item -ItemType Directory -Force -Path $outDir | Out-Null

$src = [System.Drawing.Image]::FromFile((Resolve-Path $srcPath))
$cropY = 72
$cropH = 420

$bmp = New-Object System.Drawing.Bitmap $src.Width, $cropH
$g = [System.Drawing.Graphics]::FromImage($bmp)
$srcRect = New-Object System.Drawing.Rectangle 0, $cropY, $src.Width, $cropH
$destRect = New-Object System.Drawing.Rectangle 0, 0, $src.Width, $cropH
$g.DrawImage($src, $destRect, $srcRect, [System.Drawing.GraphicsUnit]::Pixel)
$bmp.Save((Resolve-Path $outDir).Path + "\emperium-forgeworks-hero-banner.png", [System.Drawing.Imaging.ImageFormat]::Png)

$g.Dispose()
$bmp.Dispose()
$src.Dispose()

Write-Host "Saved $outPath ($($src.Width)x$cropH)"
