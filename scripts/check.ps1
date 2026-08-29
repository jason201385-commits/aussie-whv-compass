# 澳打指南針 — 驗收腳本（SPEC §6 第 1、2 項）
# 用法：powershell -File scripts/check.ps1（在 repo 根目錄執行）
# 全部通過輸出 ALL CHECKS PASSED 並以 0 結束；任何錯誤以 1 結束。

$ErrorActionPreference = 'Stop'
$dir = Split-Path -Parent $PSScriptRoot
if (-not (Test-Path (Join-Path $dir 'index.html'))) { $dir = (Get-Location).Path }
$errors = 0
$assetVersions = @()
$canonicalOrigin = 'https://www.aussiewhvcompass.com'

$allPages = Get-ChildItem (Join-Path $dir '*.html') | Select-Object -ExpandProperty Name
$pages = @($allPages | Where-Object { $_ -ne '404.html' })
$anchors = @{}
foreach ($p in $allPages) {
  $t = [System.IO.File]::ReadAllText((Join-Path $dir $p), [System.Text.Encoding]::UTF8)
  $anchors[$p] = [regex]::Matches($t, 'id="([^"]+)"') | ForEach-Object { $_.Groups[1].Value }

  # 全頁語意與鍵盤安全基線（內容頁與 404 都適用）
  if ([regex]::Matches($t, '<html\s+lang="zh-Hant">').Count -ne 1) { Write-Output "FAIL [$p] html lang 必須是 zh-Hant"; $errors++ }
  if ([regex]::Matches($t, '<meta name="viewport"').Count -ne 1) { Write-Output "FAIL [$p] viewport 數量錯誤"; $errors++ }
  if ([regex]::Matches($t, '<main(?:\s|>)').Count -ne 1) { Write-Output "FAIL [$p] main 數量錯誤"; $errors++ }
  if ([regex]::Matches($t, '<h1(?:\s|>)').Count -ne 1) { Write-Output "FAIL [$p] h1 數量錯誤"; $errors++ }

  $duplicateIds = @($anchors[$p] | Group-Object | Where-Object { $_.Count -gt 1 })
  foreach ($duplicate in $duplicateIds) {
    Write-Output "FAIL [$p] 重複 id：$($duplicate.Name)"
    $errors++
  }
  foreach ($link in [regex]::Matches($t, '<a\b[^>]*target="_blank"[^>]*>')) {
    if ($link.Value -notmatch 'rel="[^"]*noopener') { Write-Output "FAIL [$p] target=_blank 缺 noopener"; $errors++ }
  }
  if ([regex]::Matches($t, '<button\b(?![^>]*\btype=)[^>]*>').Count -gt 0) {
    Write-Output "FAIL [$p] button 缺 type"
    $errors++
  }
}

# 404 是錯誤復原頁，不列入 canonical 與 sitemap；仍需維持完整導航與回程入口
$notFoundPath = Join-Path $dir '404.html'
if (-not (Test-Path $notFoundPath)) {
  Write-Output 'FAIL 缺自訂 404.html'
  $errors++
} else {
  $notFoundText = [System.IO.File]::ReadAllText($notFoundPath, [System.Text.Encoding]::UTF8)
  foreach ($required in @(
    '<meta name="robots" content="noindex,follow">',
    '<main id="main-content">',
    'site-footer',
    'assets/style.css?v=',
    'assets/main.js?v=',
    'href="index.html"',
    'href="index.html#support-hub"',
    'href="index.html#considering"',
    'href="index.html#committed"',
    'href="index.html#in-australia"',
    'href="index.html#next-step"'
  )) {
    if (-not $notFoundText.Contains($required)) { Write-Output "FAIL [404.html] 缺復原要素：$required"; $errors++ }
  }
  $notFoundNav = [regex]::Matches($notFoundText, 'class="nav-links"[\s\S]*?</div>')
  if ($notFoundNav.Count -ne 1 -or (($notFoundNav[0].Value -split '<a ').Count - 1) -ne 12) {
    Write-Output 'FAIL [404.html] 主導覽必須維持 12 個連結'
    $errors++
  }
  if ($notFoundText.Contains('rel="canonical"') -or $notFoundText.Contains('property="og:url"')) {
    Write-Output 'FAIL [404.html] 錯誤頁不得宣告 canonical 或 og:url'
    $errors++
  }
  foreach ($asset in [regex]::Matches($notFoundText, '(?:href|src)="assets/(?:style\.css|main\.js)(?:\?v=([^"]+))?"')) {
    if (-not $asset.Groups[1].Success) { Write-Output 'FAIL [404.html] 本機資產缺 ?v= 版本'; $errors++ }
    else { $assetVersions += $asset.Groups[1].Value }
  }
  foreach ($m in [regex]::Matches($notFoundText, 'href="([^"#:]+\.html)(#[^"]*)?"')) {
    $file = $m.Groups[1].Value; $anc = $m.Groups[2].Value
    if (-not (Test-Path (Join-Path $dir $file))) { Write-Output "FAIL [404.html] 壞連結 → $file"; $errors++; continue }
    if ($anc -and $anchors[$file] -notcontains $anc.TrimStart('#')) {
      Write-Output "FAIL [404.html] 壞錨點 → $file$anc"
      $errors++
    }
  }
}

foreach ($p in $pages) {
  $t = [System.IO.File]::ReadAllText((Join-Path $dir $p), [System.Text.Encoding]::UTF8)

  # 結構
  if ($t -notmatch '<title>.+</title>') { Write-Output "FAIL [$p] 缺 <title>"; $errors++ }
  if (-not $t.Contains('</html>'))      { Write-Output "FAIL [$p] 缺 </html>"; $errors++ }
  if (-not $t.Contains('site-footer'))  { Write-Output "FAIL [$p] 缺 footer"; $errors++ }
  if (-not $t.Contains('assets/main.js')) { Write-Output "FAIL [$p] 未掛 main.js"; $errors++ }

  # 正式網址：每頁 canonical 與 og:url 必須一致，首頁使用網域根路徑
  $pageUrl = if ($p -eq 'index.html') { "$canonicalOrigin/" } else { "$canonicalOrigin/$p" }
  $canonicalTag = '<link rel="canonical" href="{0}">' -f $pageUrl
  $ogUrlTag = '<meta property="og:url" content="{0}">' -f $pageUrl
  if (-not $t.Contains($canonicalTag)) { Write-Output "FAIL [$p] canonical 錯誤或缺少：$pageUrl"; $errors++ }
  if (-not $t.Contains($ogUrlTag)) { Write-Output "FAIL [$p] og:url 錯誤或缺少：$pageUrl"; $errors++ }

  # 本機資產必須共用版本查詢碼，避免 Pages 的 10 分鐘舊快取混版
  foreach ($asset in [regex]::Matches($t, '(?:href|src)="assets/(?:style\.css|main\.js|tools\.js|postcodes\.js|seasons\.js)(?:\?v=([^"]+))?"')) {
    if (-not $asset.Groups[1].Success) { Write-Output "FAIL [$p] 本機資產缺 ?v= 版本"; $errors++ }
    else { $assetVersions += $asset.Groups[1].Value }
  }

  # 導覽：單一 nav、12 連結
  $navBlocks = [regex]::Matches($t, '<div class="nav-links">')
  if ($navBlocks.Count -ne 1) { Write-Output "FAIL [$p] nav-links 區塊數=$($navBlocks.Count)"; $errors++ }
  else {
    $nav = [regex]::Matches($t, 'class="nav-links"[\s\S]*?</div>')[0].Value
    $links = ($nav -split '<a ').Count - 1
    if ($links -ne 12) { Write-Output "FAIL [$p] nav 連結數=$links（應為 12）"; $errors++ }
  }

  # 內部連結與錨點
  foreach ($m in [regex]::Matches($t, 'href="([^"#:]+\.html)(#[^"]*)?"')) {
    $file = $m.Groups[1].Value; $anc = $m.Groups[2].Value
    if (-not (Test-Path (Join-Path $dir $file))) { Write-Output "FAIL [$p] 壞連結 → $file"; $errors++; continue }
    if ($anc) {
      $a = $anc.TrimStart('#')
      if ($anchors[$file] -notcontains $a) { Write-Output "FAIL [$p] 壞錨點 → $file$anc"; $errors++ }
    }
  }
}
$uniqueAssetVersions = @($assetVersions | Select-Object -Unique)
if ($uniqueAssetVersions.Count -ne 1) {
  Write-Output "FAIL 全站本機資產版本不一致：$(($uniqueAssetVersions) -join ', ')"
  $errors++
}

# 租屋頁必須提供可直接行動的平台入口；第三方連結不帶追蹤碼，本站不接收訂房資料
$housingText = [System.IO.File]::ReadAllText((Join-Path $dir 'housing.html'), [System.Text.Encoding]::UTF8)
foreach ($housingNeedle in @(
  'id="book"',
  'https://www.hostelworld.com/hostels/oceania/australia/perth/',
  'https://www.booking.com/city/au/perth.html',
  'https://flatmates.com.au/rooms/perth',
  'https://www.realestate.com.au/rent/in-perth,+wa+6000/list-1',
  'https://www.domain.com.au/rent/perth-wa-6000/',
  'https://www.consumerprotection.wa.gov.au/rental-bonds',
  '本站沒有聯盟分潤、沒有代訂'
)) {
  if (-not $housingText.Contains($housingNeedle)) { Write-Output "FAIL [housing.html] 缺租屋行動入口或邊界：$housingNeedle"; $errors++ }
}
if ($housingText -match '(?i)(utm_|affiliate|aff_id=)') {
  Write-Output 'FAIL [housing.html] 住宿平台連結不得含追蹤或聯盟參數'
  $errors++
}

$costText = [System.IO.File]::ReadAllText((Join-Path $dir 'cost.html'), [System.Text.Encoding]::UTF8)
foreach ($carNeedle in @(
  'id="car"',
  'https://www.carsales.com.au/cars/used/western-australia-state/perth-region/',
  'https://www.gumtree.com.au/s-cars-vans-utes/perth/c18320l3008303',
  'https://www.facebook.com/marketplace/perth/vehicles',
  'https://www.ppsr.gov.au/carcheck',
  'https://online.transport.wa.gov.au/webExternal/registration/?527=',
  'https://transport.wa.gov.au/licensing/vehicle/buy-sell-transfer',
  'https://www.carsales.com.au/sell-my-car/',
  'https://www.gumtree.com.au/cars/sell-my-car',
  'https://www.facebook.com/marketplace/create/vehicle',
  '本站不接收車輛刊登'
)) {
  if (-not $costText.Contains($carNeedle)) { Write-Output "FAIL [cost.html] 缺買車行動入口或執行邊界：$carNeedle"; $errors++ }
}

foreach ($livingNeedle in @(
  'id="food"',
  'https://stores.spudshed.com.au/',
  'https://www.aldi.com.au/storelocator',
  'https://www.coles.com.au/on-special',
  'https://www.woolworths.com.au/shop/browse/specials',
  'https://www.accc.gov.au/business/pricing/unit-pricing',
  'https://askizzy.org.au/',
  '4 道新手也能完成的共用食材料理',
  'https://www.foodstandards.gov.au/consumer/prevention-of-foodborne-illness/food-safety-basics',
  'id="clothes"',
  'https://goodsammy.com.au/locations/',
  'https://www.vinnies.org.au/wa/vinnies-shops',
  'https://www.salvosstores.com.au/stores',
  'https://shop.redcross.org.au/store-locator/',
  '每次穿著成本',
  'https://www.worksafe.wa.gov.au/personal-protective-equipment-ppe'
)) {
  if (-not $costText.Contains($livingNeedle)) { Write-Output "FAIL [cost.html] 缺吃穿省錢入口或安全資訊：$livingNeedle"; $errors++ }
}

# GitHub Pages 自訂網域必須鎖定正式 www 主機名
$cnamePath = Join-Path $dir 'CNAME'
if (-not (Test-Path $cnamePath)) {
  Write-Output 'FAIL 缺 GitHub Pages CNAME 檔'
  $errors++
} elseif (([System.IO.File]::ReadAllText($cnamePath, [System.Text.Encoding]::UTF8)).Trim() -ne 'www.aussiewhvcompass.com') {
  Write-Output 'FAIL CNAME 必須是 www.aussiewhvcompass.com'
  $errors++
}

# 搜尋探索：sitemap 必須完整列出 13 頁，robots 必須宣告同一份 sitemap
$sitemapPath = Join-Path $dir 'sitemap.xml'
if (-not (Test-Path $sitemapPath)) {
  Write-Output 'FAIL 缺 sitemap.xml'
  $errors++
} else {
  $sitemapText = [System.IO.File]::ReadAllText($sitemapPath, [System.Text.Encoding]::UTF8)
  $sitemapUrls = @([regex]::Matches($sitemapText, '<loc>([^<]+)</loc>') | ForEach-Object { $_.Groups[1].Value })
  $expectedUrls = @($pages | ForEach-Object {
    if ($_ -eq 'index.html') { "$canonicalOrigin/" } else { "$canonicalOrigin/$_" }
  })
  if ($sitemapUrls.Count -ne $expectedUrls.Count) {
    Write-Output "FAIL sitemap 頁數=$($sitemapUrls.Count)（應為 $($expectedUrls.Count)）"
    $errors++
  }
  foreach ($url in $expectedUrls) {
    if ($sitemapUrls -notcontains $url) { Write-Output "FAIL sitemap 缺頁面：$url"; $errors++ }
  }
  if (@($sitemapUrls | Select-Object -Unique).Count -ne $sitemapUrls.Count) {
    Write-Output 'FAIL sitemap 含重複網址'
    $errors++
  }
}

$robotsPath = Join-Path $dir 'robots.txt'
if (-not (Test-Path $robotsPath)) {
  Write-Output 'FAIL 缺 robots.txt'
  $errors++
} else {
  $robotsText = [System.IO.File]::ReadAllText($robotsPath, [System.Text.Encoding]::UTF8)
  if (-not $robotsText.Contains("Sitemap: $canonicalOrigin/sitemap.xml")) {
    Write-Output 'FAIL robots.txt 未宣告正式 sitemap'
    $errors++
  }
}

# emoji 掃描（HTML + JS；SDD §4.4 禁用 emoji）
$scanTargets = (Get-ChildItem (Join-Path $dir '*.html')) + (Get-ChildItem (Join-Path $dir 'assets\*.js'))
foreach ($f in $scanTargets) {
  $t = [System.IO.File]::ReadAllText($f.FullName, [System.Text.Encoding]::UTF8)
  $m = [regex]::Matches($t, '[\uD83C-\uD83E][\uDC00-\uDFFF]|[☀-➿]|️')
  if ($m.Count -gt 0) {
    $chars = ($m | ForEach-Object { $_.Value } | Select-Object -Unique) -join ' '
    Write-Output "FAIL [$($f.Name)] 含 emoji/符號：$chars"
    $errors++
  }
}

# 本機資產存在且非空
foreach ($a in @('assets\style.css', 'assets\main.js', 'assets\tools.js', 'assets\postcodes.js', 'assets\seasons.js', 'assets\lemon-pattern.svg')) {
  $fp = Join-Path $dir $a
  if (-not (Test-Path $fp) -or (Get-Item $fp).Length -lt 100) { Write-Output "FAIL 資產異常：$a"; $errors++ }
}

# 感謝閉環：Issue Form 與全站 JS 入口不得遺失
$thanksForm = Join-Path $dir '.github\ISSUE_TEMPLATE\thanks.yml'
if (-not (Test-Path $thanksForm)) {
  Write-Output 'FAIL 缺感謝表單：.github\ISSUE_TEMPLATE\thanks.yml'
  $errors++
} else {
  $thanksText = [System.IO.File]::ReadAllText($thanksForm, [System.Text.Encoding]::UTF8)
  foreach ($required in @('name: 留下一句感謝', 'id: message', 'id: privacy', 'id: quote_permission')) {
    if (-not $thanksText.Contains($required)) { Write-Output "FAIL [thanks.yml] 缺必要欄位：$required"; $errors++ }
  }
  if ($thanksText -notmatch '(?s)id: privacy.*?required: true') {
    Write-Output 'FAIL [thanks.yml] 公開與隱私確認未設為必填'
    $errors++
  }
  if ($thanksText -notmatch '(?s)id: message.*?validations:.*?required: true') {
    Write-Output 'FAIL [thanks.yml] 感謝內容未設為必填'
    $errors++
  }
  $fieldIds = [regex]::Matches($thanksText, '(?m)^\s+id:\s*([A-Za-z0-9_-]+)\s*$') | ForEach-Object { $_.Groups[1].Value }
  $duplicates = $fieldIds | Group-Object | Where-Object { $_.Count -gt 1 }
  if ($duplicates) { Write-Output "FAIL [thanks.yml] 欄位 id 重複：$(($duplicates.Name) -join ', ')"; $errors++ }
  if ($thanksText.Contains('type: upload')) { Write-Output 'FAIL [thanks.yml] 不得提供檔案上傳欄位'; $errors++ }
}
$mainJs = [System.IO.File]::ReadAllText((Join-Path $dir 'assets\main.js'), [System.Text.Encoding]::UTF8)
$toolsJs = [System.IO.File]::ReadAllText((Join-Path $dir 'assets\tools.js'), [System.Text.Encoding]::UTF8)
$symbolCount = [regex]::Matches($mainJs, '<symbol id=').Count
if ($symbolCount -ne 26) { Write-Output "FAIL [main.js] SVG symbol 數=$symbolCount（SDD 應為 26）"; $errors++ }
if (-not $mainJs.Contains('template=thanks.yml')) {
  Write-Output 'FAIL [main.js] 全站回饋列缺感謝入口'
  $errors++
}
$journeyMatches = [regex]::Matches($mainJs, '\{ path: "([^"]+\.html)", title:')
$journeyPaths = @($journeyMatches | ForEach-Object { $_.Groups[1].Value })
if ($journeyPaths.Count -ne 12) { Write-Output "FAIL [main.js] JOURNEY_ORDER 頁數=$($journeyPaths.Count)（應為 12）"; $errors++ }
$journeyDuplicates = @($journeyPaths | Group-Object | Where-Object Count -gt 1)
if ($journeyDuplicates.Count -gt 0) { Write-Output "FAIL [main.js] JOURNEY_ORDER 路徑重複：$(($journeyDuplicates.Name) -join ', ')"; $errors++ }
foreach ($journeyPath in $journeyPaths) {
  if (-not (Test-Path (Join-Path $dir $journeyPath))) { Write-Output "FAIL [main.js] JOURNEY_ORDER 壞路徑：$journeyPath"; $errors++ }
}
foreach ($journeyNeedle in @('className = "page-journey-nav"', 'index.html#journey-map', '上一站', '查看完整旅程', '下一站')) {
  if (-not $mainJs.Contains($journeyNeedle)) { Write-Output "FAIL [main.js] 缺頁尾旅程導覽：$journeyNeedle"; $errors++ }
}
foreach ($resumeNeedle in @('whv-last-page-v1', 'JOURNEY_PAGES', 'hasOwnProperty.call(JOURNEY_PAGES', 'JSON.parse(localStorage.getItem(LAST_PAGE_KEY)', 'localStorage.removeItem(LAST_PAGE_KEY)')) {
  if (-not $mainJs.Contains($resumeNeedle)) {
    Write-Output "FAIL [main.js] 最近閱讀缺安全條件：$resumeNeedle"
    $errors++
  }
}
foreach ($savedNeedle in @('whv-saved-pages-v1', 'Array.isArray(parsed)', 'hasOwnProperty.call(JOURNEY_PAGES, savedPath)', 'all.indexOf(savedPath) === index', 'aria-pressed', 'confirm("清除全部收藏頁面？之後仍可在各頁重新收藏。")')) {
  if (-not $mainJs.Contains($savedNeedle)) {
    Write-Output "FAIL [main.js] 我的收藏缺安全條件：$savedNeedle"
    $errors++
  }
}
$leaveText = [System.IO.File]::ReadAllText((Join-Path $dir 'leave.html'), [System.Text.Encoding]::UTF8)
foreach ($leaveId in @('leave-checklist-tool', 'leave-checklist', 'leave-progress-bar', 'leave-progress-label', 'leave-checklist-complete', 'leave-reset')) {
  if (-not $leaveText.Contains("id=`"$leaveId`"")) {
    Write-Output "FAIL [leave.html] 缺離澳清單元件：$leaveId"
    $errors++
  }
}
$leaveChecks = [regex]::Matches($leaveText, 'id="lc-[0-9]+"').Count
if ($leaveChecks -ne 9) { Write-Output "FAIL [leave.html] 離澳清單項目數=$leaveChecks（應為 9）"; $errors++ }
foreach ($leaveNeedle in @('whv-leave-check-v1', 'leaveSaved[box.id] === true', 'leaveComplete.hidden = done !== total', 'confirm("清除所有離澳清單勾選？")')) {
  if (-not $toolsJs.Contains($leaveNeedle)) {
    Write-Output "FAIL [tools.js] 離澳清單缺必要行為：$leaveNeedle"
    $errors++
  }
}
$styleText = [System.IO.File]::ReadAllText((Join-Path $dir 'assets\style.css'), [System.Text.Encoding]::UTF8)
foreach ($lemonNeedle in @('url("lemon-pattern.svg")', '--stripe:', '--on-green:', '.hero-lemon-shape', 'body:not(.home-page) main', '@media (prefers-reduced-motion: reduce)', '.hero-cut path { animation: none !important; }')) {
  if (-not $styleText.Contains($lemonNeedle)) {
    Write-Output "FAIL [style.css] 檸檬布紋主題缺必要設計：$lemonNeedle"
    $errors++
  }
}
if ($styleText -notmatch '(?s)\.tool \.tool-tag\s*\{[^}]*color:\s*var\(--on-accent\)') {
  Write-Output 'FAIL [style.css] accent 元件必須使用語意前景色，避免深色模式對比不足'
  $errors++
}
$lemonSvg = [System.IO.File]::ReadAllText((Join-Path $dir 'assets\lemon-pattern.svg'), [System.Text.Encoding]::UTF8)
if ([regex]::Matches($lemonSvg, '<path\b').Count -lt 10 -or -not $lemonSvg.Contains('fill="#efc84c"')) {
  Write-Output 'FAIL [lemon-pattern.svg] 檸檬與葉片圖樣不完整'
  $errors++
}
if (-not $styleText.Contains('main [id] { scroll-margin-top: 170px; }') -or -not $styleText.Contains('main [id] { scroll-margin-top: 82px; }')) {
  Write-Output 'FAIL [style.css] 內容錨點缺 sticky header 安全距離'
  $errors++
}
if ($styleText -notmatch '(?s)\.tool select \{.*?min-width: 0;.*?max-width: 100%;') {
  Write-Output 'FAIL [style.css] 工具 select 缺行動版防溢出限制'
  $errors++
}
$indexText = [System.IO.File]::ReadAllText((Join-Path $dir 'index.html'), [System.Text.Encoding]::UTF8)
if (-not $indexText.Contains('id="journey-map"')) {
  Write-Output 'FAIL [index.html] 缺完整旅程錨點：journey-map'
  $errors++
}
foreach ($savedId in @('saved-pages', 'saved-pages-title', 'saved-pages-list', 'saved-pages-clear')) {
  if (-not $indexText.Contains("id=`"$savedId`"")) {
    Write-Output "FAIL [index.html] 缺我的收藏元件：$savedId"
    $errors++
  }
}
foreach ($resumeId in @('journey-resume', 'journey-resume-link', 'journey-resume-clear')) {
  if (-not $indexText.Contains("id=`"$resumeId`"")) {
    Write-Output "FAIL [index.html] 缺最近閱讀元件：$resumeId"
    $errors++
  }
}
$supportBlock = [regex]::Match($indexText, '(?s)<section class="support-hub".*?</section>')
if (-not $supportBlock.Success) {
  Write-Output 'FAIL [index.html] 缺當下需求快導'
  $errors++
} else {
  $supportLinks = [regex]::Matches($supportBlock.Value, 'class="support-link"').Count
  if ($supportLinks -ne 6) { Write-Output "FAIL [index.html] 當下需求入口數=$supportLinks（應為 6）"; $errors++ }
}
foreach ($formName in @('report.yml', 'idea.yml', 'thanks.yml')) {
  $formPath = Join-Path $dir ".github\ISSUE_TEMPLATE\$formName"
  if (-not (Test-Path $formPath)) {
    Write-Output "FAIL 缺 Issue Form：$formName"
    $errors++
  } else {
    $formText = [System.IO.File]::ReadAllText($formPath, [System.Text.Encoding]::UTF8)
    if (-not $formText.Contains('公開') -or -not $formText.Contains('個資')) {
      Write-Output "FAIL [$formName] 缺公開／個資警示"
      $errors++
    }
  }
}
if (-not $mainJs.Contains('.then(copied, copyFailed)') -or -not $mainJs.Contains('catch (e) { copyFailed(); }')) {
  Write-Output 'FAIL [main.js] clipboard 失敗分支不得誤報已複製'
  $errors++
}

Write-Output ("-" * 40)
if ($errors -eq 0) { Write-Output "ALL CHECKS PASSED ($($pages.Count) pages)"; exit 0 }
else { Write-Output "$errors ERROR(S)"; exit 1 }
