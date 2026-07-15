# 코드리뷰 흐름 다이어그램 → 코드리뷰.png
Add-Type -AssemblyName System.Drawing

$W = 1120; $H = 1360
$bmp = New-Object System.Drawing.Bitmap $W, $H
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = 'AntiAlias'
$g.TextRenderingHint = 'ClearTypeGridFit'
$g.Clear([System.Drawing.Color]::FromArgb(248,247,245))

# 폰트
$fTitle = New-Object System.Drawing.Font('Malgun Gothic',28,[System.Drawing.FontStyle]::Bold)
$fSub   = New-Object System.Drawing.Font('Malgun Gothic',13)
$fLayer = New-Object System.Drawing.Font('Malgun Gothic',17,[System.Drawing.FontStyle]::Bold)
$fFile  = New-Object System.Drawing.Font('Consolas',12,[System.Drawing.FontStyle]::Bold)
$fDesc  = New-Object System.Drawing.Font('Malgun Gothic',12)
$fHead  = New-Object System.Drawing.Font('Malgun Gothic',15,[System.Drawing.FontStyle]::Bold)
$fEnd   = New-Object System.Drawing.Font('Consolas',12)

# 브러시
$ink   = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(24,24,24))
$muted = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(130,130,130))
$white = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::White)
$boxBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::White)
$penBorder = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(228,226,222),1)
$penArrow  = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(160,160,160),2)

$cx = [int]($W/2)

# 제목
$g.DrawString('펜의 끝 · 코드리뷰', $fTitle, $ink, 60, 40)
$g.DrawString('요청 처리 흐름 — 계층형 백엔드 (controller → service → repository)', $fSub, $muted, 62, 88)

# 레이어 박스 데이터: 이름, 파일, 설명, 액센트색
$layers = @(
  @('브라우저',      'client',              'HTTP 요청  (예: GET /products/:id)', @(90,90,90)),
  @('server.js',    '진입점',               'API 라우팅 또는 정적 파일 서빙',       @(17,17,17)),
  @('router.js',    'backend/router.js',   'METHOD+URL → 컨트롤러 매핑 (:id 지원)', @(60,90,160)),
  @('Controller',   '*.controller.js',     '요청 파싱 · 응답 (sendJson/readBody)',  @(40,120,110)),
  @('Service',      '*.service.js',        '비즈니스 로직 · 검증 (DomainError)',    @(180,120,40)),
  @('Repository',   '*.repository.js',     'MongoDB 접근 (find/insert/update…)',   @(150,70,120)),
  @('MongoDB',      'users · products',    '데이터 저장소',                          @(20,120,70))
)

$boxW = 640; $boxX = [int](($W - $boxW)/2); $boxH = 62; $gap = 26
$y = 150
foreach ($L in $layers) {
  $rect = New-Object System.Drawing.Rectangle $boxX, $y, $boxW, $boxH
  $g.FillRectangle($boxBrush, $rect)
  $g.DrawRectangle($penBorder, $rect)
  # 왼쪽 액센트 바
  $ac = [System.Drawing.Color]::FromArgb($L[3][0],$L[3][1],$L[3][2])
  $accBrush = New-Object System.Drawing.SolidBrush $ac
  $g.FillRectangle($accBrush, $boxX, $y, 6, $boxH)
  # 텍스트
  $g.DrawString($L[0], $fLayer, $ink, $boxX+22, $y+9)
  $g.DrawString($L[1], $fFile, $muted, $boxX+22, $y+37)
  $g.DrawString($L[2], $fDesc, (New-Object System.Drawing.SolidBrush $ac), $boxX+300, $y+21)
  $accBrush.Dispose()
  # 화살표
  $ny = $y + $boxH
  if ($L -ne $layers[$layers.Count-1]) {
    $g.DrawLine($penArrow, $cx, $ny, $cx, $ny+$gap)
    $pts = New-Object 'System.Drawing.Point[]' 3
    $pts[0] = New-Object System.Drawing.Point ($cx-6),($ny+$gap-7)
    $pts[1] = New-Object System.Drawing.Point ($cx+6),($ny+$gap-7)
    $pts[2] = New-Object System.Drawing.Point $cx,($ny+$gap)
    $g.FillPolygon((New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(160,160,160))), $pts)
  }
  $y = $ny + $gap
}

# 하단 패널: 엔드포인트
$panelY = $y + 20
$g.DrawString('도메인별 엔드포인트', $fHead, $ink, 60, $panelY)
$endpoints = @(
  'auth      POST /auth/signup   /auth/login   /auth/checkId',
  'mypage    GET  /mypage    POST /mypage/edit  /changePassword  /withdraw(soft-delete)',
  'product   GET  /products   /products/:id    POST /products/register  /:id/edit  /:id/delete'
)
$ey = $panelY + 34
foreach ($e in $endpoints) {
  $g.DrawString($e, $fEnd, $muted, 66, $ey)
  $ey += 30
}

# 프론트 흐름
$g.DrawString('프론트 화면 흐름', $fHead, $ink, 60, $ey+16)
$g.DrawString('splash → intro → shop(GET /products) ─┬─ 커스텀 볼펜(3D) → 장바구니', $fEnd, $muted, 66, $ey+50)
$g.DrawString('                                      ├─ 상품 카드 → 상세(GET /products/:id) → 장바구니', $fEnd, $muted, 66, $ey+78)
$g.DrawString('                                      └─ 로그인/가입 → 내정보', $fEnd, $muted, 66, $ey+106)

# 저장
$out = 'C:\project\noona-study\final\코드리뷰.png'
$bmp.Save($out, [System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose(); $bmp.Dispose()
Write-Output "saved: $out"
