Add-Type -AssemblyName System.Drawing

$dir = 'C:\Users\admin\Desktop\과제'
$files = 1..7 | ForEach-Object { Join-Path $dir "$_.png" } | Where-Object { Test-Path $_ }

$imgs = @()
foreach ($f in $files) { $imgs += [System.Drawing.Image]::FromFile($f) }

# 공통 너비 = 가장 넓은 이미지 기준
$targetW = ($imgs | Measure-Object -Property Width -Maximum).Maximum

# 각 이미지를 targetW 로 스케일했을 때 높이 계산
$heights = @()
$totalH = 0
foreach ($im in $imgs) {
  $h = [int]([double]$im.Height * $targetW / $im.Width)
  $heights += $h
  $totalH += $h
}

$bmp = New-Object System.Drawing.Bitmap ([int]$targetW), ([int]$totalH)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.Clear([System.Drawing.Color]::White)

$y = 0
for ($i = 0; $i -lt $imgs.Count; $i++) {
  $g.DrawImage($imgs[$i], 0, $y, [int]$targetW, [int]$heights[$i])
  $y += $heights[$i]
}

$out = Join-Path $dir '과제_합본.png'
$bmp.Save($out, [System.Drawing.Imaging.ImageFormat]::Png)

$g.Dispose(); $bmp.Dispose()
foreach ($im in $imgs) { $im.Dispose() }
Write-Output ("saved: " + $out + "  (" + [int]$targetW + " x " + [int]$totalH + ")")
