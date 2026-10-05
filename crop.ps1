Add-Type -AssemblyName System.Drawing
$src = Join-Path (Get-Location) "public\images\_src.png"
$outDir = Join-Path (Get-Location) "public\images"
if (-not (Test-Path $outDir)) { New-Item -ItemType Directory -Path $outDir -Force | Out-Null }
$img = [System.Drawing.Image]::FromFile($src)

function Crop($name, $x, $y, $w, $h) {
  $bmp = New-Object System.Drawing.Bitmap $w, $h
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $destRect = New-Object System.Drawing.Rectangle 0, 0, $w, $h
  $srcRect = New-Object System.Drawing.Rectangle $x, $y, $w, $h
  $g.DrawImage($img, $destRect, $srcRect, [System.Drawing.GraphicsUnit]::Pixel)
  $g.Dispose()
  $out = Join-Path $outDir ($name + ".png")
  $bmp.Save($out, [System.Drawing.Imaging.ImageFormat]::Png)
  $bmp.Dispose()
  Write-Output ("saved " + $name + " " + $w + "x" + $h)
}

# Large photoreal regions (source 850x1850)
Crop "d_hero"      0    0    850 372
Crop "d_tech"      0    430  850 340
Crop "d_lab"       0    1130 850 272
Crop "d_cases"     0    1402 850 243
Crop "d_whyus"     0    1645 850 127

# Solutions card image band split into 5
Crop "d_sol1" 40  855 140 95
Crop "d_sol2" 196 855 140 95
Crop "d_sol3" 352 855 140 95
Crop "d_sol4" 508 855 140 95
Crop "d_sol5" 664 855 140 95

# Cases sub-crops (text-free visuals)
Crop "d_map"       285 1447 152 172
Crop "d_casephoto" 440 1440 220 82

# Dark lab section: isometric render only (with baked annotations)
Crop "d_labiso"    300 1112 550 288

# University list thumbnails
Crop "d_u1" 688 1422 34 24
Crop "d_u2" 688 1452 34 24
Crop "d_u3" 688 1482 34 24
Crop "d_u4" 688 1512 34 24

$img.Dispose()
Write-Output "DONE"
