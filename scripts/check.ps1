# 澳打指南針 — 驗收腳本（涵蓋範圍見 docs/SPEC.md §4；文件一致性規則見 docs/README.md §4）
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
  if ([regex]::Matches($t, '<a class="skip-link" href="#main-content">跳到主要內容</a>').Count -ne 1) {
    Write-Output "FAIL [$p] 必須在靜態 HTML 提供唯一 skip link"; $errors++
  }
  if ([regex]::Matches($t, '<main id="main-content" tabindex="-1">').Count -ne 1) {
    Write-Output "FAIL [$p] 必須在靜態 HTML 提供可聚焦的 main#main-content"; $errors++
  }

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
    '<main id="main-content" tabindex="-1">',
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
  if ($notFoundText.Contains('aria-current="page"')) {
    Write-Output 'FAIL [404.html] 未知路徑不得誤標任何目前頁'
    $errors++
  }
  foreach ($asset in [regex]::Matches($notFoundText, '(?:href|src)="assets/(?:style\.css|main\.js|i18n\.js|analytics-config\.js|analytics\.js|api-config\.js)(?:\?v=([^"]+))?"')) {
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
  if (-not $t.Contains('assets/i18n.js')) { Write-Output "FAIL [$p] 未掛多國語言切換"; $errors++ }

  # 搜尋引擎與 AI 探索：每頁描述自身的 Open Graph 分享圖、crawler 指令與 JSON-LD
  foreach ($seoNeedle in @(
    '<meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1">',
    '<meta property="og:site_name" content="澳打指南針">',
    '<meta property="og:image" content="https://www.aussiewhvcompass.com/assets/og-cover.png">',
    '<meta property="og:image:width" content="1200">',
    '<meta property="og:image:height" content="630">',
    '<meta name="twitter:card" content="summary_large_image">',
    '<link rel="license" href="https://creativecommons.org/licenses/by-sa/4.0/deed.zh-hant">',
    '<link rel="alternate" type="text/markdown" href="https://www.aussiewhvcompass.com/llms.txt"',
    '<link rel="alternate" type="application/json" href="https://www.aussiewhvcompass.com/content-status.json?v=',
    '"publishingPrinciples": "https://www.aussiewhvcompass.com/crawler-policy.txt"',
    '"subjectOf": "https://www.aussiewhvcompass.com/content-status.json"',
    '<script type="application/ld+json">'
  )) {
    if (-not $t.Contains($seoNeedle)) { Write-Output "FAIL [$p] 缺 SEO／AI 探索資訊：$seoNeedle"; $errors++ }
  }
  if ([regex]::Matches($t, '<script type="application/ld\+json">').Count -ne 1) {
    Write-Output "FAIL [$p] JSON-LD 數量必須為 1"
    $errors++
  } else {
    $jsonLdText = [regex]::Match($t, '(?s)<script type="application/ld\+json">\s*(.*?)\s*</script>').Groups[1].Value
    try {
      $jsonLd = $jsonLdText | ConvertFrom-Json
      if ($jsonLd.'@context' -ne 'https://schema.org' -or -not $jsonLd.'@graph') {
        Write-Output "FAIL [$p] JSON-LD 缺 schema.org context 或 graph"
        $errors++
      }
    } catch {
      Write-Output "FAIL [$p] JSON-LD 不是合法 JSON"
      $errors++
    }
  }

  # 正式網址：每頁 canonical 與 og:url 必須一致，首頁使用網域根路徑
  $pageUrl = if ($p -eq 'index.html') { "$canonicalOrigin/" } else { "$canonicalOrigin/$p" }
  $canonicalTag = '<link rel="canonical" href="{0}">' -f $pageUrl
  $ogUrlTag = '<meta property="og:url" content="{0}">' -f $pageUrl
  if (-not $t.Contains($canonicalTag)) { Write-Output "FAIL [$p] canonical 錯誤或缺少：$pageUrl"; $errors++ }
  if (-not $t.Contains($ogUrlTag)) { Write-Output "FAIL [$p] og:url 錯誤或缺少：$pageUrl"; $errors++ }

  # 本機資產必須共用版本查詢碼，避免 Pages 的 10 分鐘舊快取混版
  foreach ($asset in [regex]::Matches($t, '(?:href|src)="assets/(?:style\.css|main\.js|i18n\.js|tools\.js|simulator\.js|postcodes\.js|seasons\.js|map-transparency\.js|job-router\.js|analytics-config\.js|analytics\.js|api-config\.js)(?:\?v=([^"]+))?"')) {
    if (-not $asset.Groups[1].Success) { Write-Output "FAIL [$p] 本機資產缺 ?v= 版本"; $errors++ }
    else { $assetVersions += $asset.Groups[1].Value }
  }

  # 導覽：單一 nav、12 連結
  $navBlocks = [regex]::Matches($t, '<div class="nav-links">')
  if ($navBlocks.Count -ne 1) { Write-Output "FAIL [$p] nav-links 區塊數=$($navBlocks.Count)"; $errors++ }
  else {
    $nav = [regex]::Matches($t, 'class="nav-links"[\s\S]*?</div>')[0].Value
    $links = ($nav -split '<a ').Count - 1
    $expectedNavLinks = 12
    if ($links -ne $expectedNavLinks) { Write-Output "FAIL [$p] nav 連結數=$links（應為 $expectedNavLinks；工具頁不進全站 nav，見 docs/SPEC.md §1.1）"; $errors++ }
    if ($nav -match 'href="(?:simulator|market|communities|map)\.html"') { Write-Output "FAIL [$p] 全站 nav 不得含 simulator.html、market.html、communities.html 或 map.html（站長 2026-09-02 決定；工具頁不進 nav）"; $errors++ }
  }
  $offNavPages = @('simulator.html', 'market.html', 'communities.html', 'map.html')
  if ($p -in $offNavPages) {
    if ([regex]::Matches($t, 'aria-current="page"').Count -ne 0) {
      Write-Output "FAIL [$p] 不在全站 nav 的工具頁不得標 aria-current=page"; $errors++
    }
  } else {
    $currentPageNeedle = if ($p -eq 'index.html') {
      '<a class="brand" aria-current="page" href="index.html">'
    } else {
      '<a class="active" aria-current="page" href="{0}">' -f $p
    }
    if (-not $t.Contains($currentPageNeedle) -or [regex]::Matches($t, 'aria-current="page"').Count -ne 1) {
      Write-Output "FAIL [$p] 靜態目前頁標記缺失或不唯一：$currentPageNeedle"; $errors++
    }
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
$contentStatusVersions = @()
foreach ($p in $pages) {
  $statusLinkText = [System.IO.File]::ReadAllText((Join-Path $dir $p), [System.Text.Encoding]::UTF8)
  $statusLink = [regex]::Match($statusLinkText, 'href="https://www\.aussiewhvcompass\.com/content-status\.json\?v=([^"]+)"')
  if (-not $statusLink.Success) { Write-Output "FAIL [$p] 缺帶版本的內容狀態 discovery link"; $errors++ }
  else { $contentStatusVersions += $statusLink.Groups[1].Value }
}
if ($uniqueAssetVersions.Count -eq 1 -and @($contentStatusVersions | Where-Object { $_ -ne $uniqueAssetVersions[0] }).Count -gt 0) {
  Write-Output "FAIL content-status.json discovery 版本必須與全站資產一致：$($uniqueAssetVersions[0])"
  $errors++
}

# 高風險主題必須先給安全下一步，再常駐揭露來源、查核日與編輯狀態。
# P0-11：visa／cost／housing／work／scam 五頁改用一張答案卡（answer-card）取代 quick-answer-hub 與 evidence-card；
# 其餘 7 頁沿用舊 hub，market／health／leave／pr 沿用分層證據卡（health 的 tel:000 卡不動）。
$answerCardPages = @('visa.html', 'cost.html', 'housing.html', 'work.html', 'scam.html')
$answerCardContract = @{
  'visa.html'    = @{ Id = 'visa-first-action';    Points = @('#first', '#apply', '#evidence');    Tool = '#postcode-tool';       TocQuestion = '#where';             Official = 'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/work-holiday-417' }
  'cost.html'    = @{ Id = 'cost-first-action';    Points = @('#math', '#food', '#car-checklist'); Tool = '#save-calc';           TocQuestion = '#cost-first-action'; Official = 'https://www.fairwork.gov.au/pay-and-wages/minimum-wages' }
  'housing.html' = @{ Id = 'housing-first-action'; Points = @('#find', '#bond', '#contract');      Tool = '#housing-search-tool'; TocQuestion = '#book';              Official = 'https://www.consumerprotection.wa.gov.au/publications/looking-rental-home-tenants-guide-1' }
  'work.html'    = @{ Id = 'work-first-action';    Points = @('#channels', '#seasons', '#injury'); Tool = '#verify-steps';        TocQuestion = '#verify';            Official = 'https://abr.business.gov.au/' }
  'scam.html'    = @{ Id = 'scam-first-action';    Points = @('#help', '#job', '#rent');           Tool = '#help-kit';            TocQuestion = '#scam-first-action'; Official = 'https://www.scamwatch.gov.au/stop-check-protect/help-to-spot-and-avoid-scams' }
}
# 縮寫黑名單只允許出現在全形或半形括號內（例：雇主登記（ABN））。
$answerCardAbbreviationPattern = 'subclass|P\.A\.C\.T\.|PPSR|ABN|ImmiAccount|DASP'
# 字數單位：一個 CJK 字、標點或符號算 1；一段連續英數（含 P.A.C.T. 這類縮寫）算 1，空白不計。
$answerCardUnitPattern = '[A-Za-z0-9.]+|[^\sA-Za-z0-9.]'
foreach ($answerCardPage in $answerCardPages) {
  $contract = $answerCardContract[$answerCardPage]
  $answerText = [System.IO.File]::ReadAllText((Join-Path $dir $answerCardPage), [System.Text.Encoding]::UTF8)
  if ($answerText.Contains('class="quick-answer-hub"') -or $answerText.Contains('class="evidence-card"')) {
    Write-Output "FAIL [$answerCardPage] 答案卡頁不得殘留 quick-answer-hub 或 evidence-card 首屏版面"
    $errors++
  }
  $answerCards = [regex]::Matches($answerText, '(?s)<section class="answer-card" data-evidence-status="(checked|stale)" data-evidence-scope="first-action-only" aria-labelledby="' + [regex]::Escape($contract.Id) + '">.*?</section>')
  if ($answerCards.Count -ne 1) {
    Write-Output "FAIL [$answerCardPage] 必須有唯一答案卡（answer-card，aria-labelledby=$($contract.Id)）"
    $errors++
    continue
  }
  $answerCard = $answerCards[0].Value
  $answerStatus = $answerCards[0].Groups[1].Value
  # 類別標籤＋「417／462 適用」＋「2026-MM 查核」；查核月份必須對得上四列 meta 的查核日期，不得補新日期。
  $answerDate = [regex]::Match($answerCard, '<span>查核日期</span><time datetime="(\d{4}-\d{2})-\d{2}">')
  $answerDateTag = [regex]::Match($answerCard, '<span class="answer-card-tag answer-card-tag-date">(\d{4}-\d{2}) 查核</span>')
  if ([regex]::Matches($answerCard, '<span class="answer-card-tag">').Count -lt 2 -or -not $answerCard.Contains('<span class="answer-card-tag">417／462 適用</span>') -or -not $answerDateTag.Success) {
    Write-Output "FAIL [$answerCardPage] 答案卡缺類別標籤、417／462 適用或 YYYY-MM 查核標籤"
    $errors++
  }
  if (-not $answerDate.Success) {
    Write-Output "FAIL [$answerCardPage] 答案卡缺查核日期 meta"
    $errors++
  } elseif ($answerDateTag.Success -and $answerDateTag.Groups[1].Value -ne $answerDate.Groups[1].Value) {
    Write-Output "FAIL [$answerCardPage] 答案卡查核月份標籤與 meta 查核日期不一致"
    $errors++
  }
  # 主結論：≤ 35 字、單句（無「，」「；」）、縮寫只在括號內。
  $answerHeading = [regex]::Match($answerCard, '(?s)<h2 id="' + [regex]::Escape($contract.Id) + '">(.*?)</h2>')
  if (-not $answerHeading.Success) {
    Write-Output "FAIL [$answerCardPage] 答案卡缺主結論 h2#$($contract.Id)"
    $errors++
  } else {
    $headingText = [regex]::Replace($answerHeading.Groups[1].Value, '<[^>]+>', '').Trim()
    $headingUnits = [regex]::Matches($headingText, $answerCardUnitPattern).Count
    if ($headingUnits -gt 35 -or $headingText -match '[，；]') {
      Write-Output "FAIL [$answerCardPage] 主結論必須 ≤ 35 字且為單句（無「，」「；」）：$headingUnits 字「$headingText」"
      $errors++
    }
    if (([regex]::Replace($headingText, '（[^）]*）|\([^)]*\)', '')) -match $answerCardAbbreviationPattern) {
      Write-Output "FAIL [$answerCardPage] 主結論的英文縮寫只能放在括號內：$headingText"
      $errors++
    }
  }
  # 3 個要點：各 ≤ 25 字、各自 <a> 到同頁錨點（回收原 4 題中的 3 題）、縮寫只在括號內。
  $answerPointsList = [regex]::Match($answerCard, '(?s)<ul class="answer-card-points">(.*?)</ul>')
  $answerPoints = @()
  if ($answerPointsList.Success) { $answerPoints = @([regex]::Matches($answerPointsList.Groups[1].Value, '<li><a href="([^"]+)">([^<]+)</a></li>')) }
  if ($answerPoints.Count -ne 3) {
    Write-Output "FAIL [$answerCardPage] 答案卡必須有 3 個要點連結"
    $errors++
  } else {
    $actualPointRoutes = @($answerPoints | ForEach-Object { $_.Groups[1].Value })
    if (($actualPointRoutes -join '|') -ne ($contract.Points -join '|')) {
      Write-Output "FAIL [$answerCardPage] 要點導路與驗收契約不符：$($actualPointRoutes -join ', ')"
      $errors++
    }
    foreach ($answerPoint in $answerPoints) {
      $pointRoute = $answerPoint.Groups[1].Value
      $pointText = $answerPoint.Groups[2].Value.Trim()
      $pointUnits = [regex]::Matches($pointText, $answerCardUnitPattern).Count
      if ($pointUnits -gt 25) {
        Write-Output "FAIL [$answerCardPage] 要點必須 ≤ 25 字：$pointUnits 字「$pointText」"
        $errors++
      }
      if (([regex]::Replace($pointText, '（[^）]*）|\([^)]*\)', '')) -match $answerCardAbbreviationPattern) {
        Write-Output "FAIL [$answerCardPage] 要點的英文縮寫只能放在括號內：$pointText"
        $errors++
      }
      if (-not $pointRoute.StartsWith('#') -or -not [regex]::IsMatch($answerText, 'id="' + [regex]::Escape($pointRoute.Substring(1)) + '"')) {
        Write-Output "FAIL [$answerCardPage] 要點找不到同頁目標：$pointRoute"
        $errors++
      }
    }
  }
  # 主按鈕直達工具輸入區：目標必須是 input|select|button|form，或標有 data-answer-target="tool" 的容器，不能是標題。
  $answerPrimary = [regex]::Match($answerCard, '<a class="btn answer-card-primary" href="(#[^"]+)">')
  if (-not $answerPrimary.Success -or $answerPrimary.Groups[1].Value -ne $contract.Tool) {
    Write-Output "FAIL [$answerCardPage] 主按鈕必須直達 $($contract.Tool)"
    $errors++
  } else {
    $toolId = $contract.Tool.Substring(1)
    $toolTag = [regex]::Match($answerText, '<([a-z0-9]+)\b[^>]*\bid="' + [regex]::Escape($toolId) + '"[^>]*>')
    $toolIsInput = $toolTag.Success -and $toolTag.Groups[1].Value -match '^(input|select|button|form)$'
    $toolIsContainer = $toolTag.Success -and $toolTag.Groups[1].Value -notmatch '^h[1-6]$' -and $toolTag.Value.Contains('data-answer-target="tool"')
    if (-not ($toolIsInput -or $toolIsContainer)) {
      Write-Output "FAIL [$answerCardPage] 主按鈕目標 $($contract.Tool) 必須是表單元素或含工具的容器（data-answer-target=""tool""），不能是標題"
      $errors++
    }
    $answerReturn = $answerText.IndexOf('<p class="answer-card-return"><a href="#' + $contract.Id + '">回到答案卡</a></p>')
    if ($answerReturn -lt 0 -or -not $toolTag.Success -or $answerReturn -gt $toolTag.Index) {
      Write-Output "FAIL [$answerCardPage] 工具上方必須放「回到答案卡」錨點"
      $errors++
    }
  }
  # 次要官方連結沿用原證據卡的來源機構，附外連 SVG。
  if (-not $answerCard.Contains('class="answer-card-official" href="' + $contract.Official + '" rel="noopener"') -or -not $answerCard.Contains('<svg class="answer-card-ext"')) {
    Write-Output "FAIL [$answerCardPage] 答案卡缺官方主管機關次要連結或外連圖示：$($contract.Official)"
    $errors++
  }
  # 官方依據 details：summary「官方依據：機構名（YYYY-MM 查核）」，展開為原四列 meta 與依據；無 JS 可展開；stale 預設 open。
  $answerDetails = [regex]::Match($answerCard, '(?s)<details class="answer-card-evidence"( open)?>.*?</details>')
  if (-not $answerDetails.Success) {
    Write-Output "FAIL [$answerCardPage] 答案卡缺 details.answer-card-evidence"
    $errors++
  } else {
    $detailsSummary = [regex]::Match($answerDetails.Value, '<summary>官方依據：[^<（]+（(\d{4}-\d{2}) 查核）</summary>')
    if (-not $detailsSummary.Success -or ($answerDate.Success -and $detailsSummary.Groups[1].Value -ne $answerDate.Groups[1].Value)) {
      Write-Output "FAIL [$answerCardPage] details summary 必須是「官方依據：機構名（YYYY-MM 查核）」且月份與 meta 一致"
      $errors++
    }
    foreach ($evidenceNeedle in @(
      'class="evidence-card__meta"',
      '<span>來源機構</span><a href="https://',
      '<span>查核日期</span><time datetime="',
      '<span>編輯狀態</span>繁中人工整理・未經',
      '<span>查核範圍</span>只查核本卡的第一步；不代表整頁已由專業人士審校',
      'class="answer-card-basis"'
    )) {
      if (-not $answerDetails.Value.Contains($evidenceNeedle)) {
        Write-Output "FAIL [$answerCardPage] 答案卡依據缺欄位：$evidenceNeedle"
        $errors++
      }
    }
    if ($answerStatus -eq 'stale' -and (-not $answerDetails.Groups[1].Success -or -not $answerCard.Contains('待重新確認'))) {
      Write-Output "FAIL [$answerCardPage] 過期答案卡必須預設展開依據並明示待重新確認"
      $errors++
    }
    # checked 狀態必須預設收合（依據列 36px 一行）；只有 stale 才預設展開
    if ($answerStatus -eq 'checked' -and $answerDetails.Groups[1].Success) {
      Write-Output "FAIL [$answerCardPage] 已查核的答案卡依據列必須預設收合，不得帶 open"
      $errors++
    }
  }
  # 逃生口與版面順序：答案卡在目錄前；「以上都不是」直達 #full-contents；原第 4 題進頁內目錄並保留錨點。
  if (-not $answerCard.Contains('<a class="answer-card-skip" href="#full-contents">') -or -not $answerText.Contains('id="full-contents"')) {
    Write-Output "FAIL [$answerCardPage] 答案卡必須提供「以上都不是」的完整內容捷徑"
    $errors++
  }
  if ($answerText.IndexOf('class="answer-card"') -gt $answerText.IndexOf('class="toc"')) {
    Write-Output "FAIL [$answerCardPage] 答案卡必須在完整目錄前"
    $errors++
  }
  $answerToc = [regex]::Match($answerText, '(?s)<div class="toc" id="full-contents">.*?</div>')
  if (-not $answerToc.Success -or -not $answerToc.Value.Contains('<strong>完整內容與參考資料</strong>') -or -not $answerToc.Value.Contains('<a class="toc-question" href="' + $contract.TocQuestion + '">')) {
    Write-Output "FAIL [$answerCardPage] 完整目錄必須保留原第 4 題（$($contract.TocQuestion)）並與答案卡分層"
    $errors++
  }
  if ($contract.TocQuestion.StartsWith('#') -and -not [regex]::IsMatch($answerText, 'id="' + [regex]::Escape($contract.TocQuestion.Substring(1)) + '"')) {
    Write-Output "FAIL [$answerCardPage] 目錄第 4 題找不到同頁目標：$($contract.TocQuestion)"
    $errors++
  }
}
$evidenceCss = [System.IO.File]::ReadAllText((Join-Path $dir 'assets\style.css'), [System.Text.Encoding]::UTF8)
foreach ($answerCardCssNeedle in @('.answer-card {', '.answer-card-tag {', '.answer-card-points {', '.answer-card-primary {', '.answer-card-evidence summary {', '.answer-card-skip {', '.answer-card[data-evidence-status="stale"] {', '.answer-card-return {', '.toc .toc-question {')) {
  if (-not $evidenceCss.Contains($answerCardCssNeedle)) {
    Write-Output "FAIL [style.css] 答案卡缺樣式：$answerCardCssNeedle"
    $errors++
  }
}
if (-not [regex]::IsMatch($evidenceCss, '(?s)\.answer-card-evidence summary \{[^}]*min-height: 36px;')) {
  Write-Output 'FAIL [style.css] 答案卡 details summary 必須是 36px 目標'
  $errors++
}

$evidencePages = @('market.html', 'health.html', 'leave.html', 'pr.html')
foreach ($evidencePage in $evidencePages) {
  $evidenceText = [System.IO.File]::ReadAllText((Join-Path $dir $evidencePage), [System.Text.Encoding]::UTF8)
  $evidenceCards = [regex]::Matches($evidenceText, '(?s)<section class="evidence-card" data-evidence-status="(checked|stale)".*?</section>')
  if ($evidenceCards.Count -ne 1) {
    Write-Output "FAIL [$evidencePage] 必須有唯一分層證據卡"
    $errors++
    continue
  }
  $evidenceCard = $evidenceCards[0].Value
  foreach ($evidenceNeedle in @(
    'class="evidence-card__label">先做這一步',
    'data-evidence-scope="first-action-only"',
    'class="evidence-card__reason"><strong>為什麼：</strong>',
    'class="evidence-card__meta"',
    '<span>來源機構</span><a href="https://',
    '<span>查核日期</span><time datetime="',
    '<span>編輯狀態</span>繁中人工整理・未經',
    '<span>查核範圍</span>只查核本卡的第一步；不代表整頁已由專業人士審校',
    'class="evidence-card__basis"',
    '<summary>查看本卡依據與官方'
  )) {
    if (-not $evidenceCard.Contains($evidenceNeedle)) {
      Write-Output "FAIL [$evidencePage] 證據卡缺欄位：$evidenceNeedle"
      $errors++
    }
  }
  if ($evidenceCards[0].Groups[1].Value -eq 'stale' -and -not $evidenceCard.Contains('待重新確認')) {
    Write-Output "FAIL [$evidencePage] 過期證據卡必須明示待重新確認"
    $errors++
  }
  if ($evidenceText.IndexOf('class="evidence-card"') -gt $evidenceText.IndexOf('class="toc"')) {
    Write-Output "FAIL [$evidencePage] 證據卡必須在目錄前先提供安全下一步"
    $errors++
  }
}
if (-not $evidenceCss.Contains('.evidence-card[data-evidence-status="stale"]')) {
  Write-Output 'FAIL [style.css] 證據卡缺待重新確認狀態樣式'
  $errors++
}

# 長篇攻略先列真實問題與一句可執行下一步；完整解釋與來源保留在下方（P0-11 五頁改用答案卡，見上）。
$quickAnswerPages = @('why.html', 'prep.html', 'market.html', 'english.html', 'health.html', 'leave.html', 'pr.html')
$quickAnswerExpectedRoutes = @{
  'why.html' = @('#quick-quiz', '#worksheet', '#worksheet', '#after-reflection')
  'prep.html' = @('#timeline', '#72h', '#first-week', '#checklist')
  'market.html' = @('#market-tool', '#market-tool', '#platforms', '#safety')
  'english.html' = @('#reality', '#before', '#work-english', '#after')
  'health.html' = @('tel:000', '#health-first-action', '#doctor', '#mental')
  'leave.html' = @('#tax', '#super', '#dasp', '#checklist')
  'pr.html' = @('#overview', '#employer', '#points', '#reality')
}
foreach ($quickAnswerPage in $quickAnswerPages) {
  $quickAnswerText = [System.IO.File]::ReadAllText((Join-Path $dir $quickAnswerPage), [System.Text.Encoding]::UTF8)
  $quickAnswerSections = [regex]::Matches($quickAnswerText, '(?s)<section class="quick-answer-hub" aria-labelledby="quick-answers">.*?</section>')
  if ($quickAnswerSections.Count -ne 1) {
    Write-Output "FAIL [$quickAnswerPage] 必須有唯一問題優先入口"
    $errors++
    continue
  }
  $quickAnswerSection = $quickAnswerSections[0].Value
  if (-not $quickAnswerSection.Contains('<h2 id="quick-answers">')) {
    Write-Output "FAIL [$quickAnswerPage] 問題入口缺 quick-answers 標題"
    $errors++
  }
  if ([regex]::Matches($quickAnswerSection, 'class="quick-answer-card"').Count -ne 4 -or
      [regex]::Matches($quickAnswerSection, '<strong>先做：</strong>').Count -ne 4 -or
      [regex]::Matches($quickAnswerSection, 'class="quick-answer-action"').Count -ne 4) {
    Write-Output "FAIL [$quickAnswerPage] 必須有 4 張問題卡、4 個先做與 4 個直接入口"
    $errors++
  }
  $quickAnswerLinks = [regex]::Matches($quickAnswerSection, '<a class="quick-answer-card" href="([^"]+)"')
  $actualQuickAnswerRoutes = @($quickAnswerLinks | ForEach-Object { $_.Groups[1].Value })
  if (($actualQuickAnswerRoutes -join '|') -ne ($quickAnswerExpectedRoutes[$quickAnswerPage] -join '|')) {
    Write-Output "FAIL [$quickAnswerPage] 問題卡導路與驗收契約不符：$($actualQuickAnswerRoutes -join ', ')"
    $errors++
  }
  foreach ($quickAnswerRoute in $actualQuickAnswerRoutes) {
    if ($quickAnswerRoute.StartsWith('#')) {
      $quickAnswerTarget = $quickAnswerRoute.Substring(1)
      if (-not [regex]::IsMatch($quickAnswerText, 'id="' + [regex]::Escape($quickAnswerTarget) + '"')) {
        Write-Output "FAIL [$quickAnswerPage] 問題卡找不到同頁目標：$quickAnswerRoute"
        $errors++
      }
    } elseif ($quickAnswerRoute -ne 'tel:000' -or $quickAnswerPage -ne 'health.html') {
      Write-Output "FAIL [$quickAnswerPage] 問題卡不得導向未允許的外部或通訊入口：$quickAnswerRoute"
      $errors++
    }
  }
  if (-not $quickAnswerSection.Contains('class="quick-answer-skip" href="#full-contents"') -or
      -not $quickAnswerText.Contains('id="full-contents"')) {
    Write-Output "FAIL [$quickAnswerPage] 必須提供未命中四題時的完整內容捷徑"
    $errors++
  }
  if ($quickAnswerText.IndexOf('class="quick-answer-hub"') -gt $quickAnswerText.IndexOf('class="toc"')) {
    Write-Output "FAIL [$quickAnswerPage] 問題入口必須在完整目錄前"
    $errors++
  }
  if (-not $quickAnswerText.Contains('<strong>完整內容與參考資料</strong>')) {
    Write-Output "FAIL [$quickAnswerPage] 完整目錄必須與快速解法分層"
    $errors++
  }
}
foreach ($quickAnswerCssNeedle in @('.quick-answer-hub {', '.quick-answer-grid {', '.quick-answer-card {', '.quick-answer-action {')) {
  if (-not $evidenceCss.Contains($quickAnswerCssNeedle)) {
    Write-Output "FAIL [style.css] 問題優先元件缺樣式：$quickAnswerCssNeedle"
    $errors++
  }
}
if (-not $evidenceCss.Contains('.quick-answer-skip {') -or
    -not $evidenceCss.Contains('html { scroll-behavior: auto; }')) {
  Write-Output 'FAIL [style.css] 問題入口缺完整內容捷徑或手機即時錨點跳轉'
  $errors++
}

# 高風險語意路徑不能只靠「href 存在」通過。
$healthQuickAnswerText = [System.IO.File]::ReadAllText((Join-Path $dir 'health.html'), [System.Text.Encoding]::UTF8)
if (-not $healthQuickAnswerText.Contains('class="quick-answer-card" href="tel:000"') -or
    -not $healthQuickAnswerText.Contains('href="#emergency">緊急聯絡總表</a>')) {
  Write-Output 'FAIL [health.html] 生命危險入口必須可直接撥 000 並保留緊急聯絡說明'
  $errors++
}
$scamQuickAnswerText = [System.IO.File]::ReadAllText((Join-Path $dir 'scam.html'), [System.Text.Encoding]::UTF8)
if (-not $scamQuickAnswerText.Contains('已匯款、信用卡或網銀帳號可能被控制') -or
    -not $scamQuickAnswerText.Contains('你自己查到的銀行／發卡機構')) {
  Write-Output 'FAIL [scam.html] 已匯款救濟包必須先提供銀行／發卡機構出口'
  $errors++
}
$costQuickAnswerText = [System.IO.File]::ReadAllText((Join-Path $dir 'cost.html'), [System.Text.Encoding]::UTF8)
foreach ($vehicleAuthorityNeedle in @('id="car-authorities"', 'service.nsw.gov.au/transaction/transfer-a-vehicle-registration', 'vicroads.vic.gov.au/buy-sell-transfer', 'qld.gov.au/transport/registration', 'transport.wa.gov.au/licensing/vehicle/buy-sell-transfer/buy', 'sa.gov.au/topics/driving-and-transport/registration', 'service.tas.gov.au/services/transport/vehicle-registration', 'accesscanberra.act.gov.au/driving-transport-and-parking/registration', 'nt.gov.au/driving/rego/existing-nt-registration')) {
  if (-not $costQuickAnswerText.Contains($vehicleAuthorityNeedle)) {
    Write-Output "FAIL [cost.html] 買車州別邊界缺官方入口：$vehicleAuthorityNeedle"
    $errors++
  }
}

# 檸檬圖文必須保留等義文字與原生連結，不能只剩裝飾圖案或 JavaScript 畫面。
$lemonDiagrams = @(
  @{ Page = 'why.html'; Class = 'lemon-choice-map'; Items = 2 },
  @{ Page = 'visa.html'; Class = 'lemon-flow'; Items = 4 },
  @{ Page = 'health.html'; Class = 'lemon-check-map'; Items = 3 },
  @{ Page = 'scam.html'; Class = 'lemon-risk-map'; Items = 3 }
)
foreach ($lemonDiagram in $lemonDiagrams) {
  $lemonText = [System.IO.File]::ReadAllText((Join-Path $dir $lemonDiagram.Page), [System.Text.Encoding]::UTF8)
  $lemonList = [regex]::Match($lemonText, '(?s)<(?:ul|ol) class="' + [regex]::Escape($lemonDiagram.Class) + '">(.*?)</(?:ul|ol)>')
  if (-not $lemonList.Success) {
    Write-Output "FAIL [$($lemonDiagram.Page)] 缺檸檬圖文：$($lemonDiagram.Class)"
    $errors++
    continue
  }
  $lemonItems = [regex]::Matches($lemonList.Groups[1].Value, '<li\b')
  if ($lemonItems.Count -ne $lemonDiagram.Items) {
    Write-Output "FAIL [$($lemonDiagram.Page)] $($lemonDiagram.Class) 項目數=$($lemonItems.Count)（應為 $($lemonDiagram.Items)）"
    $errors++
  }
  if ([regex]::Matches($lemonList.Groups[1].Value, '<strong>').Count -ne $lemonDiagram.Items) {
    Write-Output "FAIL [$($lemonDiagram.Page)] 檸檬圖文每項都必須有可讀文字標題"
    $errors++
  }
}
foreach ($lemonCssNeedle in @('.lemon-diagram {', '.lemon-flow {', '.lemon-risk-map,', '.lemon-check-map {', '.lemon-choice-map a::before')) {
  if (-not $evidenceCss.Contains($lemonCssNeedle)) { Write-Output "FAIL [style.css] 缺檸檬圖文樣式：$lemonCssNeedle"; $errors++ }
}

# 所有語言頁的靜態 skip target 都必須可被片段導航聚焦，不能只靠繁中 main.js 補救
$allSiteHtmlFiles = Get-ChildItem $dir -Recurse -Filter '*.html' | Where-Object { $_.FullName -notmatch '[\\/]\.git[\\/]' }
foreach ($siteHtmlFile in $allSiteHtmlFiles) {
  $siteHtmlText = [System.IO.File]::ReadAllText($siteHtmlFile.FullName, [System.Text.Encoding]::UTF8)
  if ($siteHtmlText.Contains('class="skip-link"')) {
    $relativeHtmlPath = $siteHtmlFile.FullName.Substring($dir.Length).TrimStart('\', '/')
    if ([regex]::Matches($siteHtmlText, '<main id="main-content" tabindex="-1">').Count -ne 1) {
      Write-Output "FAIL [$relativeHtmlPath] skip link 目標必須是唯一且可聚焦的 main#main-content"; $errors++
    }
  }
}

# GA4：空 ID 必須完全停用；有效 ID 也只能在訪客同意後載入，且不得傳搜尋字詞或表單內容
$analyticsConfigPath = Join-Path $dir 'assets\analytics-config.js'
$analyticsScriptPath = Join-Path $dir 'assets\analytics.js'
if (-not (Test-Path $analyticsConfigPath) -or -not (Test-Path $analyticsScriptPath)) {
  Write-Output 'FAIL 缺 GA4 config 或 consent loader'
  $errors++
} else {
  $analyticsConfig = [System.IO.File]::ReadAllText($analyticsConfigPath, [System.Text.Encoding]::UTF8)
  $analyticsScript = [System.IO.File]::ReadAllText($analyticsScriptPath, [System.Text.Encoding]::UTF8)
  $measurementMatch = [regex]::Match($analyticsConfig, 'measurementId:\s*"([^"]*)"')
  if (-not $measurementMatch.Success) {
    Write-Output 'FAIL [analytics-config.js] 缺 measurementId'
    $errors++
  } else {
    $measurementId = $measurementMatch.Groups[1].Value
    if ($measurementId -and $measurementId -notmatch '^G-[A-Z0-9]+$') {
      Write-Output 'FAIL [analytics-config.js] Measurement ID 必須留空或為合法 G-... 格式'
      $errors++
    }
  }
  foreach ($analyticsNeedle in @(
    'whv-analytics-consent-v1',
    'if (!isConfigured) return;',
    'showBanner(false)',
    'analytics_storage: "denied"',
    'analytics_storage: "granted"',
    'ad_storage: "denied"',
    'ad_user_data: "denied"',
    'ad_personalization: "denied"',
    'allow_google_signals: false',
    'allow_ad_personalization_signals: false',
    'page_location: location.origin + location.pathname',
    'https://www.googletagmanager.com/gtag/js?id=',
    'window.addEventListener("whv:search"',
    'result_count:',
    'top_result_page:',
    '/^(?:index|why|visa|prep|simulator|cost|housing|market|work|scam|english|health|leave|pr|about)\.html$/'
  )) {
    if (-not $analyticsScript.Contains($analyticsNeedle)) { Write-Output "FAIL [analytics.js] 缺同意／最小化界線：$analyticsNeedle"; $errors++ }
  }
  foreach ($analyticsForbidden in @('search_term', 'event.detail.query', 'user_id:', 'briefText', 'worksheet')) {
    if ($analyticsScript.Contains($analyticsForbidden)) { Write-Output "FAIL [analytics.js] 不得傳送輸入內容或 User-ID：$analyticsForbidden"; $errors++ }
  }
  # 敏感頁排除（SPEC §1.5、ROADMAP §3）：詐騙／健康頁必須列在 SENSITIVE_PATHS，且 loader 在建立 dataLayer／載入 gtag 前先查此清單
  $sensitiveListMatch = [regex]::Match($analyticsScript, 'var SENSITIVE_PATHS = \[(.*?)\];', [System.Text.RegularExpressions.RegexOptions]::Singleline)
  if (-not $sensitiveListMatch.Success) {
    Write-Output 'FAIL [analytics.js] 缺敏感頁排除清單：var SENSITIVE_PATHS = ['
    $errors++
  } else {
    foreach ($sensitivePath in @('"/scam.html"', '"/health.html"', '"/lang/en/scam/"', '"/lang/en/health/"')) {
      if (-not $sensitiveListMatch.Groups[1].Value.Contains($sensitivePath)) { Write-Output "FAIL [analytics.js] 敏感頁排除清單缺：$sensitivePath"; $errors++ }
    }
  }
  foreach ($sensitiveNeedle in @(
    'var isSensitivePath = function (pathname) {',
    'var isSensitive = isSensitivePath(location.pathname);',
    'if (isSensitive || active || loading) return;',
    'document.documentElement.setAttribute("data-analytics", !isConfigured ? "disabled" : (isSensitive ? "excluded" : "available"));',
    'if (isSensitive) {'
  )) {
    if (-not $analyticsScript.Contains($sensitiveNeedle)) { Write-Output "FAIL [analytics.js] 缺敏感頁排除界線：$sensitiveNeedle"; $errors++ }
  }
  $sensitiveFlagAt = $analyticsScript.IndexOf('var isSensitive = isSensitivePath(location.pathname);')
  $sensitiveGuardAt = $analyticsScript.IndexOf('if (isSensitive || active || loading) return;')
  $sensitiveReturnAt = $analyticsScript.IndexOf('if (isSensitive) {')
  $dataLayerAt = $analyticsScript.IndexOf('window.dataLayer = window.dataLayer || [];')
  $queueGtagCallAt = $analyticsScript.IndexOf('queueGtag();')
  $gtagLoadAt = $analyticsScript.IndexOf('https://www.googletagmanager.com/gtag/js?id=')
  $searchListenerAt = $analyticsScript.IndexOf('window.addEventListener("whv:search"')
  if ($sensitiveFlagAt -lt 0 -or $dataLayerAt -lt 0 -or $sensitiveFlagAt -gt $dataLayerAt) {
    Write-Output 'FAIL [analytics.js] 敏感頁判斷必須在建立 dataLayer 之前完成'
    $errors++
  }
  if ($sensitiveGuardAt -lt 0 -or $queueGtagCallAt -lt 0 -or $gtagLoadAt -lt 0 -or $sensitiveGuardAt -gt $queueGtagCallAt -or $sensitiveGuardAt -gt $gtagLoadAt) {
    Write-Output 'FAIL [analytics.js] loadAnalytics 必須先查敏感頁旗標再建立 dataLayer／載入 gtag'
    $errors++
  }
  if ($sensitiveReturnAt -lt 0 -or $searchListenerAt -lt 0 -or $sensitiveReturnAt -gt $searchListenerAt) {
    Write-Output 'FAIL [analytics.js] 敏感頁必須在註冊 whv:search 前結束'
    $errors++
  }
}

foreach ($p in $allPages) {
  $analyticsPageText = [System.IO.File]::ReadAllText((Join-Path $dir $p), [System.Text.Encoding]::UTF8)
  $configAt = $analyticsPageText.IndexOf('<script src="assets/analytics-config.js?v=')
  $loaderAt = $analyticsPageText.IndexOf('<script src="assets/analytics.js?v=')
  $i18nAt = $analyticsPageText.IndexOf('<script src="assets/i18n.js?v=')
  $mainAt = $analyticsPageText.IndexOf('<script src="assets/main.js?v=')
  if ($configAt -lt 0 -or $loaderAt -lt 0 -or $i18nAt -lt 0 -or $mainAt -lt 0 -or -not ($configAt -lt $loaderAt -and $loaderAt -lt $i18nAt -and $i18nAt -lt $mainAt)) {
    Write-Output "FAIL [$p] GA4 config／loader／i18n／main.js 缺少或順序錯誤"
    $errors++
  }
}

# 字體策略（ROADMAP §3）：中日韓字體很大，用 swap 會在字體晚到時整段重排（實測 CLS 0.29）。
# 一律 display=optional——沒能在極短的阻擋期內就緒就整頁沿用備援，結構上不會有換字位移。
# 這是刻意的取捨：第一次到訪的人可能看到系統字體，換得的是不會跳版。
$fontTargets = @(Get-ChildItem (Join-Path $dir '*.html')) + @(Get-ChildItem (Join-Path $dir 'lang') -Recurse -Filter '*.html')
foreach ($fontFile in $fontTargets) {
  $fontText = [System.IO.File]::ReadAllText($fontFile.FullName, [System.Text.Encoding]::UTF8)
  $fontRelativePath = $fontFile.FullName.Substring($dir.Length).TrimStart([char]92, [char]47)
  if ($fontText.Contains('display=swap')) {
    Write-Output "FAIL [$fontRelativePath] 字體不得用 display=swap（會造成中日韓字體晚到時的重排）"
    $errors++
  }
  if ($fontText.Contains('fonts.googleapis.com/css2') -and -not $fontText.Contains('display=optional')) {
    Write-Output "FAIL [$fontRelativePath] 載入 Google Fonts 就必須帶 display=optional"
    $errors++
  }
}
if ((Get-Content -Raw -Encoding UTF8 (Join-Path $dir 'scripts/build_i18n.py')).Contains('display=swap')) {
  Write-Output 'FAIL [scripts/build_i18n.py] 產生器仍會輸出 display=swap'
  $errors++
}
# optional 代表多數首次到訪者看到的是備援，所以兩條堆疊都必須自己指定到中日韓字體。
$fontStackText = [System.IO.File]::ReadAllText((Join-Path $dir 'assets/style.css'), [System.Text.Encoding]::UTF8)
foreach ($fontFallback in @('"PingFang TC"', '"Microsoft JhengHei"', '"Songti TC"', '"PMingLiU"')) {
  if (-not $fontStackText.Contains($fontFallback)) {
    Write-Output "FAIL [assets/style.css] 字體備援缺中日韓字體：$fontFallback"
    $errors++
  }
}

# defer 斷言（ROADMAP §3、P0-5）：根目錄（含 404）與 lang/ 每一頁的本機 <script src> 都必須帶 defer，避免修復被回歸
$deferTargets = @(Get-ChildItem (Join-Path $dir '*.html')) + @(Get-ChildItem (Join-Path $dir 'lang') -Recurse -Filter '*.html')
foreach ($deferFile in $deferTargets) {
  $deferText = [System.IO.File]::ReadAllText($deferFile.FullName, [System.Text.Encoding]::UTF8)
  $deferRelativePath = $deferFile.FullName.Substring($dir.Length).TrimStart('\', '/')
  $deferScripts = [regex]::Matches($deferText, '<script\b[^>]*\bsrc="(?:(?:\.\./)+|/)?assets/[^"]+\.js(?:\?[^"]*)?"[^>]*>')
  if ($deferScripts.Count -eq 0) {
    Write-Output "FAIL [$deferRelativePath] 找不到任何本機 <script src>，defer 斷言無從成立"
    $errors++
  }
  foreach ($deferScript in $deferScripts) {
    if ($deferScript.Value -notmatch '\sdefer(?=[\s/>=])') {
      Write-Output "FAIL [$deferRelativePath] 本機 script 缺 defer：$($deferScript.Value)"
      $errors++
    }
  }
}

# 多國語言 Quick Start：來源名單、產物、RTL 與 fallback 狀態必須可重建且誠實標示
$i18nBuilder = Join-Path $dir 'scripts\build_i18n.py'
$i18nDataPath = Join-Path $dir 'assets\i18n-locales.json'
if (-not (Test-Path $i18nBuilder) -or -not (Test-Path $i18nDataPath)) {
  Write-Output 'FAIL 缺多國語言 builder 或 locale registry'
  $errors++
} else {
  & python $i18nBuilder --check
  if ($LASTEXITCODE -ne 0) { Write-Output 'FAIL 多國語言產物過期'; $errors++ }
  $i18nData = Get-Content -Raw $i18nDataPath | ConvertFrom-Json
  $localeCount = @($i18nData.locales.PSObject.Properties).Count
  if ($localeCount -ne 38) { Write-Output "FAIL 多國語言數=$localeCount（應為 38）"; $errors++ }
  if (@($i18nData.countries).Count -ne 49) { Write-Output "FAIL WHM 護照國家／地區數=$(@($i18nData.countries).Count)（應為 49）"; $errors++ }
  foreach ($locale in $i18nData.locales.PSObject.Properties) {
    if ($locale.Value.reviewStatus -notin @('source', 'machine-unreviewed', 'english-fallback')) {
      Write-Output "FAIL locale $($locale.Name) 缺誠實 reviewStatus"
      $errors++
    }
    if ($locale.Name -ne 'zh-Hant') {
      $localePage = Join-Path $dir "lang\$($locale.Name)\index.html"
      if (-not (Test-Path $localePage)) { Write-Output "FAIL 缺 locale 頁：$($locale.Name)"; $errors++ }
      elseif ($locale.Value.reviewStatus -eq 'english-fallback') {
        $fallbackText = [System.IO.File]::ReadAllText($localePage, [System.Text.Encoding]::UTF8)
        foreach ($fallbackNeedle in @(
          '<html lang="en" dir="ltr">',
          '<meta name="robots" content="noindex,follow">',
          'English safety fallback — translation unavailable',
          'This page intentionally shows the English source until a reviewed translation is available.',
          'If life is in danger in Australia, call 000 for police, fire or ambulance.'
        )) {
          if (-not $fallbackText.Contains($fallbackNeedle)) {
            Write-Output "FAIL locale $($locale.Name) 的 English fallback 未隔離高風險翻譯：$fallbackNeedle"; $errors++
          }
        }
      }
    }
  }
  foreach ($quarantinedCode in @('vi', 'ta')) {
    $quarantinedLocale = $i18nData.locales.$quarantinedCode
    if ($quarantinedLocale.reviewStatus -ne 'english-fallback' -or $quarantinedLocale.fallbackReason -ne 'known-broken-machine-translation') {
      Write-Output "FAIL locale $quarantinedCode 的已知破損翻譯必須維持 English fallback"; $errors++
    }
    $quarantinedPage = [System.IO.File]::ReadAllText((Join-Path $dir "lang\$quarantinedCode\index.html"), [System.Text.Encoding]::UTF8)
    if (-not $quarantinedPage.Contains("The previous $($quarantinedLocale.englishName) machine translation was removed because it contained mixed-language or unsafe-to-rely-on text.")) {
      Write-Output "FAIL locale $quarantinedCode 缺已知破損翻譯隔離原因"; $errors++
    }
  }
  $baseI18nText = [System.IO.File]::ReadAllText((Join-Path $dir 'index.html'), [System.Text.Encoding]::UTF8)
  foreach ($fallbackLocale in $i18nData.locales.PSObject.Properties | Where-Object { $_.Value.reviewStatus -eq 'english-fallback' }) {
    if ($baseI18nText.Contains("hreflang=`"$($fallbackLocale.Name)`"")) {
      Write-Output "FAIL English fallback locale $($fallbackLocale.Name) 不得宣告為已完成 hreflang 翻譯"; $errors++
    }
  }
  $hebrewPage = Join-Path $dir 'lang\he\index.html'
  if (-not (Test-Path $hebrewPage) -or -not ([System.IO.File]::ReadAllText($hebrewPage, [System.Text.Encoding]::UTF8)).Contains('<html lang="he" dir="rtl">')) {
    Write-Output 'FAIL 希伯來文頁缺 RTL'
    $errors++
  }
}

# 完整英文簽證頁：不得把台灣 417 規則直譯成全球通則，且 417 工具邊界與英文輸出不可遺失
$englishVisaPath = Join-Path $dir 'lang\en\visa\index.html'
if (-not (Test-Path $englishVisaPath)) {
  Write-Output 'FAIL 缺完整英文簽證頁：lang/en/visa/'
  $errors++
} else {
  $englishVisaText = [System.IO.File]::ReadAllText($englishVisaPath, [System.Text.Encoding]::UTF8)
  foreach ($needle in @(
    '<html lang="en">',
    'data-i18n-topic="visa"',
    '<svg class="svg-sprite" style="display:none" aria-hidden="true"',
    '<link rel="canonical" href="https://www.aussiewhvcompass.com/lang/en/visa/">',
    '<link rel="alternate" hreflang="zh-Hant" href="https://www.aussiewhvcompass.com/visa.html">',
    'class="warn"><strong>Editorial status:',
    'complete English editorial draft',
    'not yet reviewed by a native-speaking immigration professional',
    'id="choose"',
    'id="postcode-tool"',
    'SUBCLASS 417 TOOL',
    'It does <strong>not</strong> decide',
    'specified-462-work',
    'status-of-country-caps',
    'visa-pricing-estimator',
    'id="pc-status" class="sr-only" role="status" aria-live="polite" aria-atomic="true"',
    '/assets/tools.js?v='
  )) {
    if (-not $englishVisaText.Contains($needle)) { Write-Output "FAIL [lang/en/visa/] 缺內容、來源或工具邊界：$needle"; $errors++ }
  }
  if ([regex]::Matches($englishVisaText, '<h1\b').Count -ne 1 -or [regex]::Matches($englishVisaText, '<main\b').Count -ne 1) {
    Write-Output 'FAIL [lang/en/visa/] 必須只有一個 h1 與 main'
    $errors++
  }
  foreach ($anchor in [regex]::Matches($englishVisaText, '<a href="#([^"]+)"')) {
    if (-not $englishVisaText.Contains("id=`"$($anchor.Groups[1].Value)`"")) {
      Write-Output "FAIL [lang/en/visa/] TOC 錨點不存在：$($anchor.Groups[1].Value)"
      $errors++
    }
  }
  $englishIds = [regex]::Matches($englishVisaText, '\bid="([^"]+)"') | ForEach-Object { $_.Groups[1].Value }
  if ($englishIds | Group-Object | Where-Object { $_.Count -gt 1 }) {
    Write-Output 'FAIL [lang/en/visa/] 含重複 id'
    $errors++
  }
  $englishAssetVersions = @([regex]::Matches($englishVisaText, '(?:href|src)="/assets/(?:style\.css|i18n\.js|tools\.js|postcodes\.js|analytics-config\.js|analytics\.js)\?v=([^"]+)"') | ForEach-Object { $_.Groups[1].Value } | Select-Object -Unique)
  if ($englishAssetVersions.Count -ne 1 -or ($uniqueAssetVersions.Count -eq 1 -and $englishAssetVersions[0] -ne $uniqueAssetVersions[0])) {
    Write-Output "FAIL [lang/en/visa/] 資產版本與全站不一致：$(($englishAssetVersions) -join ', ')"
    $errors++
  }
  $englishExternalBlanks = [regex]::Matches($englishVisaText, '<a\b[^>]*target="_blank"[^>]*>')
  foreach ($link in $englishExternalBlanks) {
    if ($link.Value -notmatch 'rel="[^"]*noopener[^"]*"') { Write-Output 'FAIL [lang/en/visa/] 新分頁連結缺 noopener'; $errors++ }
  }
  $traditionalVisaText = [System.IO.File]::ReadAllText((Join-Path $dir 'visa.html'), [System.Text.Encoding]::UTF8)
  if (-not $traditionalVisaText.Contains('<link rel="alternate" hreflang="en" href="https://www.aussiewhvcompass.com/lang/en/visa/">')) {
    Write-Output 'FAIL [visa.html] 缺英文簽證頁 reciprocal hreflang'
    $errors++
  }
  if (-not $traditionalVisaText.Contains('<body data-i18n-topic="visa">')) {
    Write-Output 'FAIL [visa.html] 缺語言切換的簽證主題標記'
    $errors++
  }
  $englishQuickText = [System.IO.File]::ReadAllText((Join-Path $dir 'lang\en\index.html'), [System.Text.Encoding]::UTF8)
  if (-not $englishQuickText.Contains('<a class="card i18n-guide-card" href="/lang/en/visa/">')) {
    Write-Output 'FAIL [lang/en/] 簽證卡未連到完整英文頁'
    $errors++
  }
  $toolsI18nText = [System.IO.File]::ReadAllText((Join-Path $dir 'assets\tools.js'), [System.Text.Encoding]::UTF8)
  foreach ($needle in @('var pcEnglish =', 'This result does not apply to subclass 462.', 'This comparison uses a local copy of the official subclass 417 tables', 'if (pcTool && !window.WHV_POSTCODES)', 'pcStatus.textContent =')) {
    if (-not $toolsI18nText.Contains($needle)) { Write-Output "FAIL [tools.js] 郵遞區號工具缺英文安全文案：$needle"; $errors++ }
  }
  $i18nSwitcherText = [System.IO.File]::ReadAllText((Join-Path $dir 'assets\i18n.js'), [System.Text.Encoding]::UTF8)
  foreach ($needle in @('var topicRoutes =', '"visa":{"zh-Hant":"/visa.html","en":"/lang/en/visa/"}', 'data-i18n-topic', 'document.body.getAttribute("data-locale")', 'go.type = "submit"', 'event.preventDefault()')) {
    if (-not $i18nSwitcherText.Contains($needle)) { Write-Output "FAIL [i18n.js] 缺主題保留切換：$needle"; $errors++ }
  }
  if ($i18nSwitcherText.Contains('select.addEventListener("change"')) {
    Write-Output 'FAIL [i18n.js] 選擇語言不得在 change 時立即切頁，需由明確按鈕確認'
    $errors++
  }
  $postcodeScriptAt = $englishVisaText.IndexOf('<script src="/assets/postcodes.js?v=')
  $toolsScriptAt = $englishVisaText.IndexOf('<script src="/assets/tools.js?v=')
  if ($postcodeScriptAt -lt 0 -or $toolsScriptAt -lt 0 -or $postcodeScriptAt -gt $toolsScriptAt) {
    Write-Output 'FAIL [lang/en/visa/] postcodes.js 必須在 tools.js 前載入'
    $errors++
  }
}

# 完整英文行前頁：跨護照適用、官方來源、私密清單與無 JavaScript 內容不得遺失
$englishPrepPath = Join-Path $dir 'lang\en\prep\index.html'
if (-not (Test-Path $englishPrepPath)) {
  Write-Output 'FAIL 缺完整英文行前頁：lang/en/prep/'
  $errors++
} else {
  $englishPrepText = [System.IO.File]::ReadAllText($englishPrepPath, [System.Text.Encoding]::UTF8)
  foreach ($needle in @(
    '<html lang="en">',
    '<meta name="viewport"',
    'data-i18n-topic="prep"',
    '<link rel="canonical" href="https://www.aussiewhvcompass.com/lang/en/prep/">',
    '<link rel="alternate" hreflang="zh-Hant" href="https://www.aussiewhvcompass.com/prep.html">',
    'complete English editorial draft',
    'not yet reviewed by a native-speaking Australian settlement or consumer-services professional',
    'Do not accidentally replace your WHM visa',
    'eVisitor (subclass 651)',
    'Transit visa (subclass 771)',
    'An ETA (subclass 601) is treated differently and does not cease the WHM visa',
    'do not apply for any other Australian visa while holding a WHM unless you first check',
    'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/electronic-travel-authority-601',
    'Check your current visa and conditions in VEVO before travel',
    'Australia has Reciprocal Health Care Agreements with 11 countries',
    'Ordinary visitors covered through New Zealand or Ireland do not enrol in Medicare or receive a Medicare card',
    'https://www.servicesaustralia.gov.au/reciprocal-health-care-agreements-visiting-from-new-zealand?context=22481',
    'https://www.servicesaustralia.gov.au/reciprocal-health-care-agreements-visiting-from-ireland?context=22481',
    'Product Disclosure Statement',
    'AUD10,000 or more',
    'three-month supply',
    'Driving rules change by state or territory',
    'id="prep-checklist"',
    'role="progressbar" aria-label="Preparation checklist progress" aria-valuemin="0" aria-valuemax="21" aria-valuenow="0"',
    'This site does not collect your checklist choices',
    'https://immi.homeaffairs.gov.au/what-we-do/whm-program/latest-news',
    'https://www.servicesaustralia.gov.au/reciprocal-health-care-agreements',
    'https://www.agriculture.gov.au/travelling/to-australia',
    'https://www.tga.gov.au/resources/consumer-information-and-resources/travelling-medicines-and-medical-devices/entering-australia',
    'https://www.ato.gov.au/individuals-and-families/tax-file-number/apply-for-a-tfn',
    '<noscript><p class="warn">JavaScript is required for the private checklist.',
    '/assets/tools.js?v='
  )) {
    if (-not $englishPrepText.Contains($needle)) { Write-Output "FAIL [lang/en/prep/] 缺內容、來源或隱私邊界：$needle"; $errors++ }
  }
  if ([regex]::Matches($englishPrepText, '<h1\b').Count -ne 1 -or [regex]::Matches($englishPrepText, '<main\b').Count -ne 1) {
    Write-Output 'FAIL [lang/en/prep/] 必須只有一個 h1 與 main'; $errors++
  }
  foreach ($anchor in [regex]::Matches($englishPrepText, '<a href="#([^"]+)"')) {
    if (-not $englishPrepText.Contains("id=`"$($anchor.Groups[1].Value)`"")) {
      Write-Output "FAIL [lang/en/prep/] TOC 錨點不存在：$($anchor.Groups[1].Value)"; $errors++
    }
  }
  $englishPrepIds = [regex]::Matches($englishPrepText, '\bid="([^"]+)"') | ForEach-Object { $_.Groups[1].Value }
  if ($englishPrepIds | Group-Object | Where-Object { $_.Count -gt 1 }) {
    Write-Output 'FAIL [lang/en/prep/] 含重複 id'; $errors++
  }
  if ($englishPrepText -match '[\u3400-\u9fff]') {
    Write-Output 'FAIL [lang/en/prep/] 完整英文頁仍含 CJK 文字'; $errors++
  }
  if ($englishPrepText.Contains('/assets/main.js?v=')) {
    Write-Output 'FAIL [lang/en/prep/] 不得載入會注入中文搜尋、回饋列與 skip link 的 main.js'; $errors++
  }
  $englishPrepAssetVersions = @([regex]::Matches($englishPrepText, '(?:href|src)="/assets/(?:style\.css|i18n\.js|main\.js|tools\.js|analytics-config\.js|analytics\.js)\?v=([^"]+)"') | ForEach-Object { $_.Groups[1].Value } | Select-Object -Unique)
  if ($englishPrepAssetVersions.Count -ne 1 -or ($uniqueAssetVersions.Count -eq 1 -and $englishPrepAssetVersions[0] -ne $uniqueAssetVersions[0])) {
    Write-Output "FAIL [lang/en/prep/] 資產版本與全站不一致：$(($englishPrepAssetVersions) -join ', ')"; $errors++
  }
  foreach ($link in [regex]::Matches($englishPrepText, '<a\b[^>]*target="_blank"[^>]*>')) {
    if ($link.Value -notmatch 'rel="[^"]*noopener[^"]*"') { Write-Output 'FAIL [lang/en/prep/] 新分頁連結缺 noopener'; $errors++ }
  }
  $englishPrepJsonText = [regex]::Match($englishPrepText, '(?s)<script type="application/ld\+json">\s*(.*?)\s*</script>').Groups[1].Value
  try {
    $englishPrepJson = $englishPrepJsonText | ConvertFrom-Json
    if ($englishPrepJson.'@context' -ne 'https://schema.org' -or -not $englishPrepJson.'@graph') {
      Write-Output 'FAIL [lang/en/prep/] JSON-LD 缺 schema.org context 或 graph'; $errors++
    }
  } catch { Write-Output 'FAIL [lang/en/prep/] JSON-LD 不是合法 JSON'; $errors++ }

  $traditionalPrepText = [System.IO.File]::ReadAllText((Join-Path $dir 'prep.html'), [System.Text.Encoding]::UTF8)
  foreach ($needle in @(
    '<link rel="alternate" hreflang="en" href="https://www.aussiewhvcompass.com/lang/en/prep/">',
    '<body data-i18n-topic="prep">'
  )) {
    if (-not $traditionalPrepText.Contains($needle)) { Write-Output "FAIL [prep.html] 缺英文 reciprocal hreflang 或主題標記：$needle"; $errors++ }
  }
  $englishQuickText = [System.IO.File]::ReadAllText((Join-Path $dir 'lang\en\index.html'), [System.Text.Encoding]::UTF8)
  if (-not $englishQuickText.Contains('<a class="card i18n-guide-card" href="/lang/en/prep/">')) {
    Write-Output 'FAIL [lang/en/] 行前卡未連到完整英文頁'; $errors++
  }
  $prepToolsText = [System.IO.File]::ReadAllText((Join-Path $dir 'assets\tools.js'), [System.Text.Encoding]::UTF8)
  foreach ($needle in @(
    'var prepEnglish =',
    'After the visa grant',
    'One week before departure',
    'First week in Australia',
    'whv-prep-check-en-v1',
    'Exact medicine and permit requirements checked',
    'current VEVO record',
    'prep-check-group',
    "role='group' aria-labelledby='prep-group-",
    'done + " of " + total + " complete',
    'progress.setAttribute("aria-valuenow"'
  )) {
    if (-not $prepToolsText.Contains($needle)) { Write-Output "FAIL [tools.js] 行前清單缺英文輸出或相容儲存：$needle"; $errors++ }
  }
  $i18nPrepText = [System.IO.File]::ReadAllText((Join-Path $dir 'assets\i18n.js'), [System.Text.Encoding]::UTF8)
  if (-not $i18nPrepText.Contains('"prep":{"zh-Hant":"/prep.html","en":"/lang/en/prep/"}')) {
    Write-Output 'FAIL [i18n.js] 缺行前主題中英文路由'; $errors++
  }
  $englishTraditionalCards = [regex]::Matches($englishQuickText, '<a class="card i18n-guide-card" href="(?:/why\.html|/english\.html|/leave\.html|/pr\.html|/about\.html#collaborate)" hreflang="zh-Hant">')
  if ($englishTraditionalCards.Count -ne 5 -or [regex]::Matches($englishQuickText, '<small>Traditional Chinese guide</small>').Count -ne 5) {
    Write-Output 'FAIL [lang/en/] 5 張繁中目的卡必須逐張顯示語言並標 hreflang'; $errors++
  }
}

# 完整英文生活成本頁：累進 WHM 稅、52 週支出、食衣交通與二手車官方分流不得遺失
$englishCostPath = Join-Path $dir 'lang\en\cost\index.html'
if (-not (Test-Path $englishCostPath)) {
  Write-Output 'FAIL 缺完整英文生活成本頁：lang/en/cost/'
  $errors++
} else {
  $englishCostText = [System.IO.File]::ReadAllText($englishCostPath, [System.Text.Encoding]::UTF8)
  foreach ($needle in @(
    '<html lang="en">',
    '<meta name="viewport"',
    'data-i18n-topic="cost"',
    '<link rel="canonical" href="https://www.aussiewhvcompass.com/lang/en/cost/">',
    '<link rel="alternate" hreflang="zh-Hant" href="https://www.aussiewhvcompass.com/cost.html">',
    'complete English editorial draft',
    'not yet reviewed by a native-speaking Australian tax, financial-counselling or consumer-services professional',
    '46 income weeks and 52 expense weeks',
    'AUD 26.44 per hour',
    'AUD 33.05 per hour',
    '15% to 45,000; 30% to 135,000; 37% to 190,000; 45% above',
    'id="save-calc"',
    'id="calc-tax"',
    'This site does not receive your planner choices',
    'https://www.legislation.gov.au/F2026L00716/latest/text',
    'https://www.accc.gov.au/consumers/pricing/unit-prices-for-groceries',
    'https://www.foodstandards.gov.au/consumer/prevention-of-foodborne-illness/food-safety-basics',
    'https://www.safeworkaustralia.gov.au/safety-topic/managing-health-and-safety/personal-protective-equipment-ppe/whs-duties',
    'https://www.ppsr.gov.au/carcheck',
    'PPSR does not prove',
    'does not accept vehicle listings, deposits, identity documents or payments',
    'https://www.service.nsw.gov.au/transaction/transfer-a-vehicle-registration',
    'https://www.vicroads.vic.gov.au/buy-sell-transfer/buying-car/buying-vehicle',
    'https://www.qld.gov.au/transport/registration',
    'https://www.transport.wa.gov.au/licensing/vehicle/buy-sell-transfer/buy',
    'https://www.sa.gov.au/topics/driving-and-transport/registration/vehicle-registration/transfers/transfer-registration',
    'https://www.service.tas.gov.au/services/transport/vehicle-registration/transfer-a-vehicle-registration/',
    'https://www.accesscanberra.act.gov.au/driving-transport-and-parking/registration/vehicle-registration-and-transfer',
    'https://nt.gov.au/driving/rego/existing-nt-registration/buying-selling-a-used-vehicle-registration',
    '<noscript><p class="warn">JavaScript is required for the planner.',
    '/assets/tools.js?v='
  )) {
    if (-not $englishCostText.Contains($needle)) { Write-Output "FAIL [lang/en/cost/] 缺內容、來源或服務邊界：$needle"; $errors++ }
  }
  if ([regex]::Matches($englishCostText, '<h1\b').Count -ne 1 -or [regex]::Matches($englishCostText, '<main\b').Count -ne 1) {
    Write-Output 'FAIL [lang/en/cost/] 必須只有一個 h1 與 main'; $errors++
  }
  foreach ($anchor in [regex]::Matches($englishCostText, '<a href="#([^"]+)"')) {
    if (-not $englishCostText.Contains("id=`"$($anchor.Groups[1].Value)`"")) {
      Write-Output "FAIL [lang/en/cost/] TOC 錨點不存在：$($anchor.Groups[1].Value)"; $errors++
    }
  }
  $englishCostIds = [regex]::Matches($englishCostText, '\bid="([^"]+)"') | ForEach-Object { $_.Groups[1].Value }
  if ($englishCostIds | Group-Object | Where-Object { $_.Count -gt 1 }) {
    Write-Output 'FAIL [lang/en/cost/] 含重複 id'; $errors++
  }
  if ($englishCostText -match '[\u3400-\u9fff]') {
    Write-Output 'FAIL [lang/en/cost/] 完整英文頁仍含 CJK 文字'; $errors++
  }
  if ($englishCostText.Contains('/assets/main.js?v=')) {
    Write-Output 'FAIL [lang/en/cost/] 不得載入會注入中文搜尋、回饋列與 skip link 的 main.js'; $errors++
  }
  $englishCostAssetVersions = @([regex]::Matches($englishCostText, '(?:href|src)="/assets/(?:style\.css|i18n\.js|main\.js|tools\.js|analytics-config\.js|analytics\.js)\?v=([^"]+)"') | ForEach-Object { $_.Groups[1].Value } | Select-Object -Unique)
  if ($englishCostAssetVersions.Count -ne 1 -or ($uniqueAssetVersions.Count -eq 1 -and $englishCostAssetVersions[0] -ne $uniqueAssetVersions[0])) {
    Write-Output "FAIL [lang/en/cost/] 資產版本與全站不一致：$(($englishCostAssetVersions) -join ', ')"; $errors++
  }
  foreach ($link in [regex]::Matches($englishCostText, '<a\b[^>]*target="_blank"[^>]*>')) {
    if ($link.Value -notmatch 'rel="[^"]*noopener[^"]*"') { Write-Output 'FAIL [lang/en/cost/] 新分頁連結缺 noopener'; $errors++ }
  }
  foreach ($commercialUrl in @(
    'https://www.aldi.com.au/storelocator',
    'https://www.coles.com.au/on-special',
    'https://www.woolworths.com.au/shop/browse/specials',
    'https://www.salvosstores.com.au/stores',
    'https://www.vinnies.org.au/shops',
    'https://shop.redcross.org.au/store-locator',
    'https://www.kmart.com.au/',
    'https://www.bigw.com.au/',
    'https://www.carsales.com.au/cars/used/',
    'https://www.gumtree.com.au/s-cars-vans-utes/c18320',
    'https://www.facebook.com/marketplace/category/vehicles',
    'https://www.carsales.com.au/sell-my-car/',
    'https://www.gumtree.com.au/cars/sell-my-car',
    'https://www.facebook.com/marketplace/create/vehicle'
  )) {
    $commercialLink = @([regex]::Matches($englishCostText, '<a\b[^>]*target="_blank"[^>]*>') | Where-Object { $_.Value.Contains($commercialUrl) })
    if ($commercialLink.Count -ne 1 -or $commercialLink[0].Value -notmatch 'rel="[^"]*nofollow[^"]*"') {
      Write-Output "FAIL [lang/en/cost/] 商業平台連結缺 nofollow 或不存在：$commercialUrl"; $errors++
    }
  }
  if ($englishCostText -match '(?i)href="[^"]*(utm_|affiliate|aff_id=)') {
    Write-Output 'FAIL [lang/en/cost/] 商業平台連結不得含追蹤或聯盟參數'; $errors++
  }
  $englishCostJsonText = [regex]::Match($englishCostText, '(?s)<script type="application/ld\+json">\s*(.*?)\s*</script>').Groups[1].Value
  try {
    $englishCostJson = $englishCostJsonText | ConvertFrom-Json
    if ($englishCostJson.'@context' -ne 'https://schema.org' -or -not $englishCostJson.'@graph') {
      Write-Output 'FAIL [lang/en/cost/] JSON-LD 缺 schema.org context 或 graph'; $errors++
    }
  } catch { Write-Output 'FAIL [lang/en/cost/] JSON-LD 不是合法 JSON'; $errors++ }

  $traditionalCostText = [System.IO.File]::ReadAllText((Join-Path $dir 'cost.html'), [System.Text.Encoding]::UTF8)
  foreach ($needle in @(
    '<link rel="alternate" hreflang="en" href="https://www.aussiewhvcompass.com/lang/en/cost/">',
    '<body data-i18n-topic="cost">',
    'id="calc-tax"',
    '46 個收入週、52 個支出週'
  )) {
    if (-not $traditionalCostText.Contains($needle)) { Write-Output "FAIL [cost.html] 缺英文 reciprocal hreflang、主題標記或新公式邊界：$needle"; $errors++ }
  }
  $englishQuickText = [System.IO.File]::ReadAllText((Join-Path $dir 'lang\en\index.html'), [System.Text.Encoding]::UTF8)
  if (-not $englishQuickText.Contains('<a class="card i18n-guide-card" href="/lang/en/cost/">')) {
    Write-Output 'FAIL [lang/en/] 生活成本卡未連到完整英文頁'; $errors++
  }
  $i18nCostText = [System.IO.File]::ReadAllText((Join-Path $dir 'assets\i18n.js'), [System.Text.Encoding]::UTF8)
  if (-not $i18nCostText.Contains('"cost":{"zh-Hant":"/cost.html","en":"/lang/en/cost/"}')) {
    Write-Output 'FAIL [i18n.js] 缺生活成本主題中英文路由'; $errors++
  }
  $costToolsText = [System.IO.File]::ReadAllText((Join-Path $dir 'assets\tools.js'), [System.Text.Encoding]::UTF8)
  foreach ($needle in @(
    'var calcEnglish =',
    'var incomeWeeks = 46;',
    'var expenseWeeks = 52;',
    'if (income <= 45000)',
    'if (income <= 135000)',
    'if (income <= 190000)',
    'annualAfterTax - (rent + living) * expenseWeeks',
    'annualTax: annualTax',
    'expenseWeeks: expenseWeeks'
  )) {
    if (-not $costToolsText.Contains($needle)) { Write-Output "FAIL [tools.js] 存錢試算器缺累進稅或 52 週支出邏輯：$needle"; $errors++ }
  }
}

# 完整英文住宿頁：跨州規則邊界、平台透明、看房／押金／condition report 與八州領地官方分流不得遺失
$englishHousingPath = Join-Path $dir 'lang\en\housing\index.html'
if (-not (Test-Path $englishHousingPath)) {
  Write-Output 'FAIL 缺完整英文住宿頁：lang/en/housing/'
  $errors++
} else {
  $englishHousingText = [System.IO.File]::ReadAllText($englishHousingPath, [System.Text.Encoding]::UTF8)
  foreach ($needle in @(
    '<html lang="en">',
    '<meta name="viewport"',
    'data-i18n-topic="housing"',
    '<link rel="canonical" href="https://www.aussiewhvcompass.com/lang/en/housing/">',
    '<link rel="alternate" hreflang="zh-Hant" href="https://www.aussiewhvcompass.com/housing.html">',
    'complete English editorial draft',
    'not yet reviewed by a native-speaking Australian tenancy, housing or homelessness-services professional',
    'Rental law, bond processes and the legal status of a room differ by state or territory and by agreement type',
    'Book a short, recoverable stay first',
    'Do not wire a long-term deposit from overseas',
    'https://askizzy.org.au/',
    'Aussie WHV Compass has no affiliate relationship with them',
    'does not receive your dates, budget, account details or search history',
    'The label in an advertisement is not the legal test',
    'A price far below comparable current listings is a scam warning',
    'Leave first if fire escape looks unsafe',
    'https://www.fire.qld.gov.au/compliance-and-planning/budget-accommodation-buildings',
    'Confirm the official bond process for your state or territory',
    'Condition-report deadlines are not the same across Australia',
    'Separate your job decision from your housing decision',
    'Fair Work pay deductions',
    'https://1800respect.org.au/',
    'https://www.tisnational.gov.au/en/Contact-us',
    'https://www.nsw.gov.au/housing-and-construction/renting-a-place-to-live',
    'https://www.consumer.vic.gov.au/housing/renting',
    'https://www.rta.qld.gov.au/starting-a-tenancy',
    'https://www.consumerprotection.wa.gov.au/publications/looking-rental-home-tenants-guide-1',
    'https://www.sa.gov.au/topics/housing/renting-and-letting/renting-privately',
    'https://cbos.tas.gov.au/topics/housing/renting',
    'https://www.act.gov.au/housing-planning-and-property/renting',
    'https://consumeraffairs.nt.gov.au/for-consumers/residential-tenancies',
    'This site does not receive your accommodation searches or applications',
    '/assets/i18n.js?v='
  )) {
    if (-not $englishHousingText.Contains($needle)) { Write-Output "FAIL [lang/en/housing/] 缺內容、來源或服務邊界：$needle"; $errors++ }
  }
  if ([regex]::Matches($englishHousingText, '<h1\b').Count -ne 1 -or [regex]::Matches($englishHousingText, '<main\b').Count -ne 1) {
    Write-Output 'FAIL [lang/en/housing/] 必須只有一個 h1 與 main'; $errors++
  }
  foreach ($anchor in [regex]::Matches($englishHousingText, '<a href="#([^"]+)"')) {
    if (-not $englishHousingText.Contains("id=`"$($anchor.Groups[1].Value)`"")) {
      Write-Output "FAIL [lang/en/housing/] TOC 錨點不存在：$($anchor.Groups[1].Value)"; $errors++
    }
  }
  $englishHousingIds = [regex]::Matches($englishHousingText, '\bid="([^"]+)"') | ForEach-Object { $_.Groups[1].Value }
  if ($englishHousingIds | Group-Object | Where-Object { $_.Count -gt 1 }) {
    Write-Output 'FAIL [lang/en/housing/] 含重複 id'; $errors++
  }
  if ($englishHousingText -match '[\u3400-\u9fff]') {
    Write-Output 'FAIL [lang/en/housing/] 完整英文頁仍含 CJK 文字'; $errors++
  }
  if ($englishHousingText.Contains('/assets/main.js?v=')) {
    Write-Output 'FAIL [lang/en/housing/] 不得載入會注入中文搜尋、回饋列與 skip link 的 main.js'; $errors++
  }
  $englishHousingAssetVersions = @([regex]::Matches($englishHousingText, '(?:href|src)="/assets/(?:style\.css|i18n\.js|main\.js|tools\.js|analytics-config\.js|analytics\.js)\?v=([^"]+)"') | ForEach-Object { $_.Groups[1].Value } | Select-Object -Unique)
  if ($englishHousingAssetVersions.Count -ne 1 -or ($uniqueAssetVersions.Count -eq 1 -and $englishHousingAssetVersions[0] -ne $uniqueAssetVersions[0])) {
    Write-Output "FAIL [lang/en/housing/] 資產版本與全站不一致：$(($englishHousingAssetVersions) -join ', ')"; $errors++
  }
  foreach ($link in [regex]::Matches($englishHousingText, '<a\b[^>]*target="_blank"[^>]*>')) {
    if ($link.Value -notmatch 'rel="[^"]*noopener[^"]*"') { Write-Output 'FAIL [lang/en/housing/] 新分頁連結缺 noopener'; $errors++ }
  }
  foreach ($commercialHost in @('hostelworld.com', 'booking.com', 'flatmates.com.au', 'realestate.com.au', 'domain.com.au')) {
    $commercialLink = @([regex]::Matches($englishHousingText, '<a\b[^>]*target="_blank"[^>]*>') | Where-Object { $_.Value.Contains($commercialHost) })
    if ($commercialLink.Count -lt 1 -or @($commercialLink | Where-Object { $_.Value -notmatch 'rel="[^"]*nofollow[^"]*"' }).Count -gt 0) {
      Write-Output "FAIL [lang/en/housing/] 商業平台連結缺 nofollow 或不存在：$commercialHost"; $errors++
    }
  }
  if ($englishHousingText -match '(?i)href="[^"]*(utm_|affiliate|aff_id=)') {
    Write-Output 'FAIL [lang/en/housing/] 住宿平台連結不得含追蹤或聯盟參數'; $errors++
  }
  $englishHousingJsonText = [regex]::Match($englishHousingText, '(?s)<script type="application/ld\+json">\s*(.*?)\s*</script>').Groups[1].Value
  try {
    $englishHousingJson = $englishHousingJsonText | ConvertFrom-Json
    if ($englishHousingJson.'@context' -ne 'https://schema.org' -or -not $englishHousingJson.'@graph') {
      Write-Output 'FAIL [lang/en/housing/] JSON-LD 缺 schema.org context 或 graph'; $errors++
    }
  } catch { Write-Output 'FAIL [lang/en/housing/] JSON-LD 不是合法 JSON'; $errors++ }

  $traditionalHousingText = [System.IO.File]::ReadAllText((Join-Path $dir 'housing.html'), [System.Text.Encoding]::UTF8)
  foreach ($needle in @(
    '<link rel="alternate" hreflang="en" href="https://www.aussiewhvcompass.com/lang/en/housing/">',
    '<body data-i18n-topic="housing">'
  )) {
    if (-not $traditionalHousingText.Contains($needle)) { Write-Output "FAIL [housing.html] 缺英文 reciprocal hreflang 或主題標記：$needle"; $errors++ }
  }
  $englishQuickText = [System.IO.File]::ReadAllText((Join-Path $dir 'lang\en\index.html'), [System.Text.Encoding]::UTF8)
  if (-not $englishQuickText.Contains('<a class="card i18n-guide-card" href="/lang/en/housing/">')) {
    Write-Output 'FAIL [lang/en/] 住宿卡未連到完整英文頁'; $errors++
  }
  $i18nHousingText = [System.IO.File]::ReadAllText((Join-Path $dir 'assets\i18n.js'), [System.Text.Encoding]::UTF8)
  if (-not $i18nHousingText.Contains('"housing":{"zh-Hant":"/housing.html","en":"/lang/en/housing/"}')) {
    Write-Output 'FAIL [i18n.js] 缺住宿主題中英文路由'; $errors++
  }
  foreach ($fullGuidePath in @('lang\en\visa\index.html', 'lang\en\prep\index.html', 'lang\en\cost\index.html', 'lang\en\housing\index.html', 'lang\en\work\index.html', 'lang\en\scam\index.html', 'lang\en\health\index.html')) {
    $fullGuideNavText = [System.IO.File]::ReadAllText((Join-Path $dir $fullGuidePath), [System.Text.Encoding]::UTF8)
    foreach ($route in @('/lang/en/visa/', '/lang/en/prep/', '/lang/en/cost/', '/lang/en/housing/', '/lang/en/work/', '/lang/en/scam/', '/lang/en/health/')) {
      if (-not $fullGuideNavText.Contains("href=`"$route`"")) { Write-Output "FAIL [$fullGuidePath] 英文旅程導覽缺 $route"; $errors++ }
    }
    foreach ($crossPageAnchor in [regex]::Matches($fullGuideNavText, 'href="/lang/en/([^/#"]+)/#([^"?]+)"')) {
      $targetSlug = $crossPageAnchor.Groups[1].Value
      $targetId = [System.Uri]::UnescapeDataString($crossPageAnchor.Groups[2].Value)
      $targetPath = Join-Path $dir "lang\en\$targetSlug\index.html"
      if (-not (Test-Path $targetPath)) {
        Write-Output "FAIL [$fullGuidePath] 英文跨頁連結目標不存在：/lang/en/$targetSlug/#$targetId"; $errors++
        continue
      }
      $targetText = [System.IO.File]::ReadAllText($targetPath, [System.Text.Encoding]::UTF8)
      if (-not $targetText.Contains("id=`"$targetId`"")) {
        Write-Output "FAIL [$fullGuidePath] 英文跨頁錨點不存在：/lang/en/$targetSlug/#$targetId"; $errors++
      }
    }
  }
  foreach ($fullGuideSlug in @('visa', 'prep', 'cost', 'housing', 'work', 'scam', 'health')) {
    $traditionalGuidePath = Join-Path $dir "$fullGuideSlug.html"
    $englishGuidePath = Join-Path $dir "lang\en\$fullGuideSlug\index.html"
    $traditionalGuideText = [System.IO.File]::ReadAllText($traditionalGuidePath, [System.Text.Encoding]::UTF8)
    $englishGuideText = [System.IO.File]::ReadAllText($englishGuidePath, [System.Text.Encoding]::UTF8)
    foreach ($needle in @(
      "<link rel=`"alternate`" hreflang=`"zh-Hant`" href=`"https://www.aussiewhvcompass.com/$fullGuideSlug.html`">",
      "<link rel=`"alternate`" hreflang=`"en`" href=`"https://www.aussiewhvcompass.com/lang/en/$fullGuideSlug/`">",
      "<link rel=`"alternate`" hreflang=`"x-default`" href=`"https://www.aussiewhvcompass.com/lang/en/$fullGuideSlug/`">"
    )) {
      if (-not $traditionalGuideText.Contains($needle)) { Write-Output "FAIL [$fullGuideSlug.html] 雙語 hreflang 叢集不完整：$needle"; $errors++ }
    }
    foreach ($needle in @(
      "<link rel=`"alternate`" hreflang=`"zh-Hant`" href=`"https://www.aussiewhvcompass.com/$fullGuideSlug.html`">",
      "<link rel=`"alternate`" hreflang=`"en`" href=`"https://www.aussiewhvcompass.com/lang/en/$fullGuideSlug/`">",
      "<link rel=`"alternate`" hreflang=`"x-default`" href=`"https://www.aussiewhvcompass.com/lang/en/$fullGuideSlug/`">"
    )) {
      if (-not $englishGuideText.Contains($needle)) { Write-Output "FAIL [lang/en/$fullGuideSlug/] 雙語 hreflang 叢集不完整：$needle"; $errors++ }
    }
  }
}

# 完整英文工作頁：跨護照適用、工資與雇傭邊界、英文採收工具及官方求助路徑不得遺失
$englishWorkPath = Join-Path $dir 'lang\en\work\index.html'
if (-not (Test-Path $englishWorkPath)) {
  Write-Output 'FAIL 缺完整英文工作頁：lang/en/work/'
  $errors++
} else {
  $englishWorkText = [System.IO.File]::ReadAllText($englishWorkPath, [System.Text.Encoding]::UTF8)
  foreach ($needle in @(
    '<html lang="en">',
    '<meta name="viewport"',
    'data-i18n-topic="work"',
    '<link rel="canonical" href="https://www.aussiewhvcompass.com/lang/en/work/">',
    '<link rel="alternate" hreflang="zh-Hant" href="https://www.aussiewhvcompass.com/work.html">',
    'complete English editorial draft',
    'not yet reviewed by a native-speaking Australian workplace-relations professional',
    'AUD 26.44 per hour',
    'AUD 33.05 per hour',
    'within <strong>one working day</strong> of payday',
    'An active ABN proves registration details only',
    'sham contracting',
    'id="season-calendar"',
    'aria-label="Choose a month"',
    'id="season-summary" class="season-summary" aria-live="polite" aria-atomic="true"',
    'visa-protections-pilot-programs',
    'site-footer',
    '/assets/seasons.js?v=',
    '/assets/tools.js?v='
  )) {
    if (-not $englishWorkText.Contains($needle)) { Write-Output "FAIL [lang/en/work/] 缺內容、來源或安全邊界：$needle"; $errors++ }
  }
  if ([regex]::Matches($englishWorkText, '<h1\b').Count -ne 1 -or [regex]::Matches($englishWorkText, '<main\b').Count -ne 1) {
    Write-Output 'FAIL [lang/en/work/] 必須只有一個 h1 與 main'
    $errors++
  }
  foreach ($anchor in [regex]::Matches($englishWorkText, '<a href="#([^"]+)"')) {
    if (-not $englishWorkText.Contains("id=`"$($anchor.Groups[1].Value)`"")) {
      Write-Output "FAIL [lang/en/work/] TOC 錨點不存在：$($anchor.Groups[1].Value)"
      $errors++
    }
  }
  $englishWorkIds = [regex]::Matches($englishWorkText, '\bid="([^"]+)"') | ForEach-Object { $_.Groups[1].Value }
  if ($englishWorkIds | Group-Object | Where-Object { $_.Count -gt 1 }) {
    Write-Output 'FAIL [lang/en/work/] 含重複 id'
    $errors++
  }
  $englishWorkAssetVersions = @([regex]::Matches($englishWorkText, '(?:href|src)="/assets/(?:style\.css|i18n\.js|tools\.js|seasons\.js|analytics-config\.js|analytics\.js)\?v=([^"]+)"') | ForEach-Object { $_.Groups[1].Value } | Select-Object -Unique)
  if ($englishWorkAssetVersions.Count -ne 1 -or ($uniqueAssetVersions.Count -eq 1 -and $englishWorkAssetVersions[0] -ne $uniqueAssetVersions[0])) {
    Write-Output "FAIL [lang/en/work/] 資產版本與全站不一致：$(($englishWorkAssetVersions) -join ', ')"
    $errors++
  }
  foreach ($link in [regex]::Matches($englishWorkText, '<a\b[^>]*target="_blank"[^>]*>')) {
    if ($link.Value -notmatch 'rel="[^"]*noopener[^"]*"') { Write-Output 'FAIL [lang/en/work/] 新分頁連結缺 noopener'; $errors++ }
  }
  $englishWorkJsonText = [regex]::Match($englishWorkText, '(?s)<script type="application/ld\+json">\s*(.*?)\s*</script>').Groups[1].Value
  try {
    $englishWorkJson = $englishWorkJsonText | ConvertFrom-Json
    if ($englishWorkJson.'@context' -ne 'https://schema.org' -or -not $englishWorkJson.'@graph') {
      Write-Output 'FAIL [lang/en/work/] JSON-LD 缺 schema.org context 或 graph'; $errors++
    }
  } catch { Write-Output 'FAIL [lang/en/work/] JSON-LD 不是合法 JSON'; $errors++ }

  $traditionalWorkText = [System.IO.File]::ReadAllText((Join-Path $dir 'work.html'), [System.Text.Encoding]::UTF8)
  foreach ($needle in @(
    '<link rel="alternate" hreflang="en" href="https://www.aussiewhvcompass.com/lang/en/work/">',
    '<body data-i18n-topic="work">'
  )) {
    if (-not $traditionalWorkText.Contains($needle)) { Write-Output "FAIL [work.html] 缺英文 reciprocal hreflang 或主題標記：$needle"; $errors++ }
  }
  $englishQuickText = [System.IO.File]::ReadAllText((Join-Path $dir 'lang\en\index.html'), [System.Text.Encoding]::UTF8)
  if (-not $englishQuickText.Contains('<a class="card i18n-guide-card" href="/lang/en/work/">')) {
    Write-Output 'FAIL [lang/en/] 工作卡未連到完整英文頁'; $errors++
  }
  $seasonToolsText = [System.IO.File]::ReadAllText((Join-Path $dir 'assets\tools.js'), [System.Text.Encoding]::UTF8)
  foreach ($needle in @('var seasonEnglish =', 'var seasonCropEn =', 'var seasonChallengesZh =', 'var seasonChallengesEn =', 'Possible difficulties in month ', 'Government produce-availability table', 'Government harvest-jobs table', 'No state or territory government table')) {
    if (-not $seasonToolsText.Contains($needle)) { Write-Output "FAIL [tools.js] 採收工具缺英文輸出或誠實 fallback：$needle"; $errors++ }
  }
  foreach ($needle in @('Possible jobs by season and when arrival is higher risk', 'There is no single best or worst month across Australia', 'arriving unprepared in December may leave fewer options', 'reaching a snow town in June without an offer or accommodation is higher risk', 'Possible difficulties:', 'BOM fire-weather seasons')) {
    if (-not $englishWorkText.Contains($needle)) { Write-Output "FAIL [lang/en/work/] 缺四季職類或條件式抵達邊界：$needle"; $errors++ }
  }
  $i18nWorkText = [System.IO.File]::ReadAllText((Join-Path $dir 'assets\i18n.js'), [System.Text.Encoding]::UTF8)
  if (-not $i18nWorkText.Contains('"work":{"zh-Hant":"/work.html","en":"/lang/en/work/"}')) {
    Write-Output 'FAIL [i18n.js] 缺工作主題中英文路由'; $errors++
  }
  $seasonScriptAt = $englishWorkText.IndexOf('<script src="/assets/seasons.js?v=')
  $workToolsScriptAt = $englishWorkText.IndexOf('<script src="/assets/tools.js?v=')
  if ($seasonScriptAt -lt 0 -or $workToolsScriptAt -lt 0 -or $seasonScriptAt -gt $workToolsScriptAt) {
    Write-Output 'FAIL [lang/en/work/] seasons.js 必須在 tools.js 前載入'; $errors++
  }
}

# 完整英文防詐頁：跨護照風險辨識、英文測驗、事後處置與正確官方分流不得遺失
$englishScamPath = Join-Path $dir 'lang\en\scam\index.html'
if (-not (Test-Path $englishScamPath)) {
  Write-Output 'FAIL 缺完整英文防詐頁：lang/en/scam/'
  $errors++
} else {
  $englishScamText = [System.IO.File]::ReadAllText($englishScamPath, [System.Text.Encoding]::UTF8)
  foreach ($needle in @(
    '<html lang="en">',
    '<meta name="viewport"',
    'data-i18n-topic="scam"',
    '<link rel="canonical" href="https://www.aussiewhvcompass.com/lang/en/scam/">',
    '<link rel="alternate" hreflang="zh-Hant" href="https://www.aussiewhvcompass.com/scam.html">',
    'complete English editorial draft',
    'not yet reviewed by a native-speaking Australian consumer-protection or victim-support professional',
    'This page names methods, not alleged offenders',
    'If money, identity details or account access have already been lost',
    '<strong>Immediate danger:</strong> call 000',
    '<strong>Money:</strong> call your bank or card provider now using the number in its official app',
    '<strong>Identity:</strong> if a passport, driver licence, TFN or other identity detail was shared, contact IDCARE',
    'Scamwatch helps disrupt scams; ReportCyber is the online police-report route for cybercrime',
    'Helps disruption and warnings; it is not a police report',
    'ABN Lookup only confirms registration data',
    'only an OMARA-registered migration agent, an Australian legal practitioner or a legally exempt person may provide immigration assistance',
    'Your employer cannot cancel your visa',
    'id="scam-quiz"',
    'id="quiz-scenario" tabindex="-1" aria-live="polite" aria-atomic="true"',
    '<div class="quiz-btns" hidden>',
    'id="quiz-feedback" role="status" aria-live="polite"',
    '<noscript><p class="warn">The practice quiz needs JavaScript',
    'https://www.scamwatch.gov.au/report-a-scam',
    'https://www.cyber.gov.au/report-and-recover/report',
    'https://www.homeaffairs.gov.au/help-and-support/departmental-forms/online-forms/border-watch',
    'https://forms.afp.gov.au/online_forms/report-commonwealth-crime',
    'https://www.tisnational.gov.au/en/Contact-us',
    'PPSR search using the VIN',
    'This site does not collect quiz answers or reports',
    '/assets/tools.js?v='
  )) {
    if (-not $englishScamText.Contains($needle)) { Write-Output "FAIL [lang/en/scam/] 缺內容、來源或安全邊界：$needle"; $errors++ }
  }
  if ([regex]::Matches($englishScamText, '<h1\b').Count -ne 1 -or [regex]::Matches($englishScamText, '<main\b').Count -ne 1) {
    Write-Output 'FAIL [lang/en/scam/] 必須只有一個 h1 與 main'
    $errors++
  }
  foreach ($anchor in [regex]::Matches($englishScamText, '<a href="#([^"]+)"')) {
    if (-not $englishScamText.Contains("id=`"$($anchor.Groups[1].Value)`"")) {
      Write-Output "FAIL [lang/en/scam/] TOC 錨點不存在：$($anchor.Groups[1].Value)"
      $errors++
    }
  }
  $englishScamIds = [regex]::Matches($englishScamText, '\bid="([^"]+)"') | ForEach-Object { $_.Groups[1].Value }
  if ($englishScamIds | Group-Object | Where-Object { $_.Count -gt 1 }) {
    Write-Output 'FAIL [lang/en/scam/] 含重複 id'
    $errors++
  }
  if ($englishScamText -match '[\u3400-\u9fff]') {
    Write-Output 'FAIL [lang/en/scam/] 完整英文頁仍含 CJK 文字'
    $errors++
  }
  if ($englishScamText.Contains('/assets/main.js?v=')) {
    Write-Output 'FAIL [lang/en/scam/] 不得載入會注入中文搜尋、回饋列與 skip link 的 main.js'
    $errors++
  }
  $englishScamAssetVersions = @([regex]::Matches($englishScamText, '(?:href|src)="/assets/(?:style\.css|i18n\.js|main\.js|tools\.js|analytics-config\.js|analytics\.js)\?v=([^"]+)"') | ForEach-Object { $_.Groups[1].Value } | Select-Object -Unique)
  if ($englishScamAssetVersions.Count -ne 1 -or ($uniqueAssetVersions.Count -eq 1 -and $englishScamAssetVersions[0] -ne $uniqueAssetVersions[0])) {
    Write-Output "FAIL [lang/en/scam/] 資產版本與全站不一致：$(($englishScamAssetVersions) -join ', ')"
    $errors++
  }
  foreach ($link in [regex]::Matches($englishScamText, '<a\b[^>]*target="_blank"[^>]*>')) {
    if ($link.Value -notmatch 'rel="[^"]*noopener[^"]*"') { Write-Output 'FAIL [lang/en/scam/] 新分頁連結缺 noopener'; $errors++ }
  }
  $englishScamJsonText = [regex]::Match($englishScamText, '(?s)<script type="application/ld\+json">\s*(.*?)\s*</script>').Groups[1].Value
  try {
    $englishScamJson = $englishScamJsonText | ConvertFrom-Json
    if ($englishScamJson.'@context' -ne 'https://schema.org' -or -not $englishScamJson.'@graph') {
      Write-Output 'FAIL [lang/en/scam/] JSON-LD 缺 schema.org context 或 graph'; $errors++
    }
  } catch { Write-Output 'FAIL [lang/en/scam/] JSON-LD 不是合法 JSON'; $errors++ }

  $traditionalScamText = [System.IO.File]::ReadAllText((Join-Path $dir 'scam.html'), [System.Text.Encoding]::UTF8)
  foreach ($needle in @(
    '<link rel="alternate" hreflang="en" href="https://www.aussiewhvcompass.com/lang/en/scam/">',
    '<body data-i18n-topic="scam">',
    'https://forms.afp.gov.au/online_forms/report-commonwealth-crime'
  )) {
    if (-not $traditionalScamText.Contains($needle)) { Write-Output "FAIL [scam.html] 缺英文 reciprocal hreflang、主題標記或現行 AFP 通報：$needle"; $errors++ }
  }
  if ($traditionalScamText.Contains('afp-warns-domestic-and-overseas-workers-forced-labour-indicators-amid')) {
    Write-Output 'FAIL [scam.html] 仍使用已失效的 AFP 強迫勞動連結'
    $errors++
  }
  $englishQuickText = [System.IO.File]::ReadAllText((Join-Path $dir 'lang\en\index.html'), [System.Text.Encoding]::UTF8)
  if (-not $englishQuickText.Contains('<a class="card i18n-guide-card" href="/lang/en/scam/">')) {
    Write-Output 'FAIL [lang/en/] 防詐卡未連到完整英文頁'
    $errors++
  }
  $scamToolsText = [System.IO.File]::ReadAllText((Join-Path $dir 'assets\tools.js'), [System.Text.Encoding]::UTF8)
  foreach ($needle in @('var quizEnglish =', 'Situation " + (qi + 1)', 'All " + Q.length + " situations reviewed.', 'This exercise does not certify that a person or offer is safe.', 'Q[qi].both === true', 'btnNext.focus()', 'sEl.focus()')) {
    if (-not $scamToolsText.Contains($needle)) { Write-Output "FAIL [tools.js] 防詐測驗缺英文輸出：$needle"; $errors++ }
  }
  $englishQuizBlock = [regex]::Match($scamToolsText, '(?s)var Q = quizEnglish \? \[(.*?)\] : \[').Groups[1].Value
  if ([regex]::Matches($englishQuizBlock, '\{ id:').Count -ne 8 -or
      [regex]::Matches($englishQuizBlock, 'run: true').Count -ne 6 -or
      [regex]::Matches($englishQuizBlock, 'run: false').Count -ne 2 -or
      [regex]::Matches($englishQuizBlock, 'both: true').Count -ne 1) {
    Write-Output 'FAIL [tools.js] 英文防詐測驗必須維持 8 題、6 個明確紅旗、2 個非自動紅旗與 1 題雙安全答案'
    $errors++
  }
  $englishQuizExpected = @(
    @{ Id = 'upfront_job_fee'; Run = 'true'; Both = $false },
    @{ Id = 'short_supervised_trial'; Run = 'false'; Both = $true },
    @{ Id = 'hostel_leverage'; Run = 'true'; Both = $false },
    @{ Id = 'exchange_screenshot'; Run = 'true'; Both = $false },
    @{ Id = 'written_onboarding'; Run = 'false'; Both = $false },
    @{ Id = 'visa_payment_call'; Run = 'true'; Both = $false },
    @{ Id = 'rental_deposit'; Run = 'true'; Both = $false },
    @{ Id = 'sham_contracting'; Run = 'true'; Both = $false }
  )
  foreach ($expectedQuiz in $englishQuizExpected) {
    $entryPattern = '(?s)\{ id: "' + [regex]::Escape($expectedQuiz.Id) + '",(.*?)\}'
    $entryMatch = [regex]::Match($englishQuizBlock, $entryPattern)
    if (-not $entryMatch.Success) {
      Write-Output "FAIL [tools.js] 英文防詐測驗缺固定情境：$($expectedQuiz.Id)"
      $errors++
      continue
    }
    $entryText = $entryMatch.Value
    $actualRun = [regex]::Match($entryText, 'run: (true|false)').Groups[1].Value
    $actualBoth = $entryText.Contains('both: true')
    if ($actualRun -ne $expectedQuiz.Run -or $actualBoth -ne $expectedQuiz.Both) {
      Write-Output "FAIL [tools.js] 英文防詐測驗答案被改壞：$($expectedQuiz.Id) run=$actualRun both=$actualBoth"
      $errors++
    }
  }
  $i18nScamText = [System.IO.File]::ReadAllText((Join-Path $dir 'assets\i18n.js'), [System.Text.Encoding]::UTF8)
  if (-not $i18nScamText.Contains('"scam":{"zh-Hant":"/scam.html","en":"/lang/en/scam/"}')) {
    Write-Output 'FAIL [i18n.js] 缺防詐主題中英文路由'
    $errors++
  }
  $scamToolsScriptAt = $englishScamText.IndexOf('<script src="/assets/tools.js?v=')
  if ($scamToolsScriptAt -lt 0) {
    Write-Output 'FAIL [lang/en/scam/] 缺英文測驗 tools.js'
    $errors++
  }
}

# 完整英文健康安全頁：跨護照 Medicare 分流、保險查核、就醫層級與緊急求助不得遺失
$englishHealthPath = Join-Path $dir 'lang\en\health\index.html'
if (-not (Test-Path $englishHealthPath)) {
  Write-Output 'FAIL 缺完整英文健康安全頁：lang/en/health/'
  $errors++
} else {
  $englishHealthText = [System.IO.File]::ReadAllText($englishHealthPath, [System.Text.Encoding]::UTF8)
  foreach ($needle in @(
    '<html lang="en">',
    '<meta name="viewport"',
    'data-i18n-topic="health"',
    '<link rel="canonical" href="https://www.aussiewhvcompass.com/lang/en/health/">',
    '<link rel="alternate" hreflang="zh-Hant" href="https://www.aussiewhvcompass.com/health.html">',
    'complete English editorial draft',
    'not yet reviewed by a native-speaking Australian healthcare, insurance, mental-health, violence-support or workplace-safety professional',
    'If you need help now',
    'Call 000',
    'healthdirect 1800 022 222',
    'Lifeline 13 11 14',
    '1800RESPECT 1800 737 732',
    'TIS National 131 450',
    'Poisons Information Centre',
    'Most temporary visitors do not have Medicare',
    'New Zealand and Ireland have different visitor arrangements',
    'Medicare does not cover ambulance services',
    'paid manual-work injuries',
    '"Covered" does not necessarily mean zero out-of-pocket cost',
    'Do not delay emergency care to check a bill',
    'The traveller''s exemption commonly limits eligible medicines to a three-month supply',
    'An employer cannot cancel a visa; only Home Affairs can grant, refuse or cancel one',
    '1800RESPECT warns that its call or text numbers may appear on an itemised phone bill',
    'This site does not collect or store it',
    'https://www.servicesaustralia.gov.au/reciprocal-health-care-agreements',
    'https://www.privatehealth.gov.au/health_insurance/overseas/overseas_visitors_health_cover.htm',
    'https://www.healthdirect.gov.au/calling-triple-zero',
    'https://www.tga.gov.au/resources/consumer-information-and-resources/travelling-medicines-and-medical-devices/entering-australia',
    'https://www.safeworkaustralia.gov.au/law-and-regulation/whs-regulators-and-workers-compensation-authorities-contact-information',
    'https://www.fairwork.gov.au/employment-conditions/workplace-sexual-harassment/rules-about-workplace-sexual-harassment',
    'https://www.lifeline.org.au/chat',
    'https://www.beyondblue.org.au/get-support/talk-to-a-counsellor',
    'https://www.1800respect.org.au/accessibility',
    'https://www.tisnational.gov.au/en/Contact-us'
  )) {
    if (-not $englishHealthText.Contains($needle)) { Write-Output "FAIL [lang/en/health/] 缺內容、來源或安全邊界：$needle"; $errors++ }
  }
  if ([regex]::Matches($englishHealthText, '<h1\b').Count -ne 1 -or [regex]::Matches($englishHealthText, '<main\b').Count -ne 1) {
    Write-Output 'FAIL [lang/en/health/] 必須只有一個 h1 與 main'; $errors++
  }
  foreach ($anchor in [regex]::Matches($englishHealthText, '<a href="#([^"]+)"')) {
    if (-not $englishHealthText.Contains("id=`"$($anchor.Groups[1].Value)`"")) {
      Write-Output "FAIL [lang/en/health/] TOC 錨點不存在：$($anchor.Groups[1].Value)"; $errors++
    }
  }
  $englishHealthIds = [regex]::Matches($englishHealthText, '\bid="([^"]+)"') | ForEach-Object { $_.Groups[1].Value }
  if ($englishHealthIds | Group-Object | Where-Object { $_.Count -gt 1 }) {
    Write-Output 'FAIL [lang/en/health/] 含重複 id'; $errors++
  }
  if ($englishHealthText -match '[\u3400-\u9fff]') {
    Write-Output 'FAIL [lang/en/health/] 完整英文頁仍含 CJK 文字'; $errors++
  }
  if ($englishHealthText.Contains('/assets/main.js?v=')) {
    Write-Output 'FAIL [lang/en/health/] 不得載入會注入中文搜尋、回饋列與 skip link 的 main.js'; $errors++
  }
  $englishHealthAssetVersions = @([regex]::Matches($englishHealthText, '(?:href|src)="/assets/(?:style\.css|i18n\.js|main\.js|tools\.js|analytics-config\.js|analytics\.js)\?v=([^"]+)"') | ForEach-Object { $_.Groups[1].Value } | Select-Object -Unique)
  if ($englishHealthAssetVersions.Count -ne 1 -or ($uniqueAssetVersions.Count -eq 1 -and $englishHealthAssetVersions[0] -ne $uniqueAssetVersions[0])) {
    Write-Output "FAIL [lang/en/health/] 資產版本與全站不一致：$(($englishHealthAssetVersions) -join ', ')"; $errors++
  }
  foreach ($link in [regex]::Matches($englishHealthText, '<a\b[^>]*target="_blank"[^>]*>')) {
    if ($link.Value -notmatch 'rel="[^"]*noopener[^"]*"') { Write-Output 'FAIL [lang/en/health/] 新分頁連結缺 noopener'; $errors++ }
  }
  $englishHealthMobileTables = [regex]::Matches($englishHealthText, '(?s)<div class="table-wrap mobile-stack"><table>(.*?)</table></div>')
  if ($englishHealthMobileTables.Count -ne 3) {
    Write-Output "FAIL [lang/en/health/] 手機卡片表格數=$($englishHealthMobileTables.Count)（應為 3）"; $errors++
  }
  foreach ($mobileTable in $englishHealthMobileTables) {
    foreach ($cell in [regex]::Matches($mobileTable.Groups[1].Value, '<td(?:\s+[^>]*)?>')) {
      if ($cell.Value -notmatch '\sdata-label="[^"]+"') {
        Write-Output 'FAIL [lang/en/health/] 手機卡片表格 td 缺 data-label'; $errors++
      }
    }
  }
  $styleTextForHealth = [System.IO.File]::ReadAllText((Join-Path $dir 'assets\style.css'), [System.Text.Encoding]::UTF8)
  foreach ($needle in @('.mobile-stack td::before', 'content: attr(data-label)')) {
    if (-not $styleTextForHealth.Contains($needle)) { Write-Output "FAIL [assets/style.css] 缺手機表格標籤樣式：$needle"; $errors++ }
  }
  $englishHealthJsonText = [regex]::Match($englishHealthText, '(?s)<script type="application/ld\+json">\s*(.*?)\s*</script>').Groups[1].Value
  try {
    $englishHealthJson = $englishHealthJsonText | ConvertFrom-Json
    if ($englishHealthJson.'@context' -ne 'https://schema.org' -or -not $englishHealthJson.'@graph') {
      Write-Output 'FAIL [lang/en/health/] JSON-LD 缺 schema.org context 或 graph'; $errors++
    }
  } catch { Write-Output 'FAIL [lang/en/health/] JSON-LD 不是合法 JSON'; $errors++ }

  $traditionalHealthText = [System.IO.File]::ReadAllText((Join-Path $dir 'health.html'), [System.Text.Encoding]::UTF8)
  foreach ($needle in @(
    '<link rel="alternate" hreflang="en" href="https://www.aussiewhvcompass.com/lang/en/health/">',
    '<body data-i18n-topic="health">'
  )) {
    if (-not $traditionalHealthText.Contains($needle)) { Write-Output "FAIL [health.html] 缺英文 reciprocal hreflang 或主題標記：$needle"; $errors++ }
  }
  $englishQuickText = [System.IO.File]::ReadAllText((Join-Path $dir 'lang\en\index.html'), [System.Text.Encoding]::UTF8)
  if (-not $englishQuickText.Contains('<a class="card i18n-guide-card" href="/lang/en/health/">')) {
    Write-Output 'FAIL [lang/en/] 健康安全卡未連到完整英文頁'; $errors++
  }
  $i18nHealthText = [System.IO.File]::ReadAllText((Join-Path $dir 'assets\i18n.js'), [System.Text.Encoding]::UTF8)
  if (-not $i18nHealthText.Contains('"health":{"zh-Hant":"/health.html","en":"/lang/en/health/"}')) {
    Write-Output 'FAIL [i18n.js] 缺健康主題中英文路由'; $errors++
  }
}

# 站內搜尋：靜態索引需與全部內容頁同步，查詢不得送出、保存或以 innerHTML 呈現使用者字串
$mainJs = [System.IO.File]::ReadAllText((Join-Path $dir 'assets\main.js'), [System.Text.Encoding]::UTF8)
$skipFallbackNeedle = 'if (!document.querySelector(".skip-link"))'
if (-not $mainJs.Contains($skipFallbackNeedle)) {
  Write-Output 'FAIL [main.js] skip link fallback 必須先檢查靜態連結，避免重複注入'; $errors++
}
$mainFocusFallbackNeedle = 'main.setAttribute("tabindex", "-1")'
if (-not $mainJs.Contains($mainFocusFallbackNeedle)) {
  Write-Output 'FAIL [main.js] 舊頁 fallback 必須補可聚焦的 main 目標'; $errors++
}
$searchBuilder = Join-Path $dir 'scripts\build_search.py'
$searchIndex = Join-Path $dir 'assets\search-index.js'
if (-not (Test-Path $searchBuilder) -or -not (Test-Path $searchIndex)) {
  Write-Output 'FAIL 缺站內搜尋 builder 或索引'
  $errors++
} else {
  & python $searchBuilder --check
  if ($LASTEXITCODE -ne 0) { Write-Output 'FAIL 站內搜尋索引過期或覆蓋不足'; $errors++ }
  # P0-9 驗收 3：索引檔不得超過改版前 178,908 bytes 的 130%（build_search.py MAX_INDEX_BYTES 同值）
  $searchIndexBytes = (Get-Item $searchIndex).Length
  if ($searchIndexBytes -gt 232580) { Write-Output "FAIL 站內搜尋索引 $searchIndexBytes bytes 超過上限 232580"; $errors++ }
}
$searchScript = [regex]::Match($mainJs, '(?s)// ---------- 全站搜尋.*?// ---------- 最近閱讀')
if (-not $searchScript.Success) {
  Write-Output 'FAIL [main.js] 缺全站搜尋功能塊'
  $errors++
} else {
  foreach ($searchNeedle in @(
    'site-search-dialog',
    'aria-haspopup',
    'assets/search-index.js?v=',
    'textContent = match.entry.title',
    'textContent = makeSnippet',
    'CustomEvent("whv:search"',
    'event.key !== "/"',
    'resultCount:',
    'topPage:',
    '// ==== search-core:start ====',
    '// ==== search-core:end ====',
    'var SEARCH_STOP_WORDS = [',
    'var SEARCH_SYNONYM_WEIGHT = 0.7;',
    'var SEARCH_HUB_SYNONYM_WEIGHT = 0.5;',
    'var rewriteSearchQuery = function',
    'var searchApproximate = function',
    'var runSiteSearch = function',
    'synonyms: normalizeSearch(entry.synonyms)',
    'hub: entry.hub === 1',
    'result.mode === "approximate"',
    '已用相近詞找到',
    'result.mode === "rewritten"',
    'mode: result.mode'
  )) {
    if (-not $searchScript.Value.Contains($searchNeedle)) { Write-Output "FAIL [main.js] 搜尋缺安全／鍵盤／量測界面：$searchNeedle"; $errors++ }
  }
  foreach ($forbidden in @('localStorage', 'sessionStorage', 'fetch(', 'XMLHttpRequest', 'SEARCH_SYNONYMS', 'data-search-query', 'data-home-search-query', 'openAssist')) {
    if ($searchScript.Value.Contains($forbidden)) { Write-Output "FAIL [main.js] 搜尋不得保存或送出查詢、不得保留死同義詞表或查詢字串 chip、不得自行開啟 AI：$forbidden"; $errors++ }
  }
  # P0-9 驗收 4：零結果狀態 DOM 順序：階段 chips → 安全列 → 問一次 AI（預設 hidden）→ GitHub 連結
  $zeroStagesAt = $searchScript.Value.IndexOf('"site-search-stages"')
  $zeroSafetyAt = $searchScript.Value.IndexOf('"site-search-safety"')
  $zeroAiAt = $searchScript.Value.IndexOf('aiSlot.id = "site-search-ai"')
  $zeroGithubAt = $searchScript.Value.IndexOf('issues/new?template=idea.yml')
  if ($zeroStagesAt -lt 0 -or $zeroSafetyAt -le $zeroStagesAt -or $zeroAiAt -le $zeroSafetyAt -or $zeroGithubAt -le $zeroAiAt -or -not $searchScript.Value.Contains('aiSlot.hidden = true;')) {
    Write-Output 'FAIL [main.js] 零結果狀態順序必須是階段 chips → 安全列 → 問一次 AI（預設 hidden）→ GitHub 連結'
    $errors++
  }
  $searchVersion = [regex]::Match($searchScript.Value, 'assets/search-index\.js\?v=([0-9-]+)').Groups[1].Value
  if ($uniqueAssetVersions.Count -eq 1 -and $searchVersion -ne $uniqueAssetVersions[0]) {
    Write-Output "FAIL [main.js] 搜尋索引版本=$searchVersion，與全站資產版本=$($uniqueAssetVersions[0]) 不一致"
    $errors++
  }
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

# 住宿搜尋轉接器：繁中／英文共用、預設隱藏、不保存或抓取使用者輸入
$englishHousingToolText = [System.IO.File]::ReadAllText((Join-Path $dir 'lang\en\housing\index.html'), [System.Text.Encoding]::UTF8)
foreach ($housingToolPage in @(
  @{ Name = 'housing.html'; Text = $housingText; Script = 'assets/tools.js?v=' },
  @{ Name = 'lang/en/housing/'; Text = $englishHousingToolText; Script = '/assets/tools.js?v=' }
)) {
  foreach ($housingToolNeedle in @(
    'id="housing-search-tool"',
    'id="housing-search-form"',
    'id="housing-search-results"',
    'id="housing-search-privacy"',
    'id="housing-live-panel"',
    'id="housing-live-status"',
    'id="housing-live-list"',
    'id="housing-hostelworld-link"',
    'id="housing-booking-link"',
    'id="housing-flatmates-link"',
    'id="housing-rea-link"',
    'id="housing-domain-link"',
    'class="housing-route-strip" role="group"',
    '<div class="housing-route-track" id="housing-primary-routes">',
    'id="housing-route-order-note"',
    'id="housing-route-swipe-hint"',
    $housingToolPage.Script
  )) {
    if (-not $housingToolPage.Text.Contains($housingToolNeedle)) {
      Write-Output "FAIL [$($housingToolPage.Name)] 住宿五平台搜尋缺標記或程式：$housingToolNeedle"
      $errors++
    }
  }
  # 五個入口必須都在同一條滑動列裡，不得再收進 <details>。
  if ($housingToolPage.Text.Contains('housing-other-routes')) {
    Write-Output "FAIL [$($housingToolPage.Name)] 住宿入口不得再有收合面板，五個平台要在同一條滑動列"
    $errors++
  }
  $housingRouteTrack = [regex]::Match($housingToolPage.Text, '(?s)<div class="housing-route-track" id="housing-primary-routes">.*?</div>\s*</div>')
  if (-not $housingRouteTrack.Success) {
    Write-Output "FAIL [$($housingToolPage.Name)] 找不到住宿入口滑動列的內容"
    $errors++
  } elseif ([regex]::Matches($housingRouteTrack.Value, 'data-housing-platform="').Count -ne 5) {
    Write-Output "FAIL [$($housingToolPage.Name)] 滑動列裡必須是五個平台入口（no-JS 也要看得到全部）"
    $errors++
  }
  if (-not $housingToolPage.Text.Contains('id="housing-search-tool" aria-labelledby="housing-search-title" hidden')) {
    Write-Output "FAIL [$($housingToolPage.Name)] 住宿工具必須預設隱藏，只在 JavaScript 成功後揭露"
    $errors++
  }
}
$housingToolsText = [System.IO.File]::ReadAllText((Join-Path $dir 'assets\tools.js'), [System.Text.Encoding]::UTF8)
$housingToolScript = [regex]::Match($housingToolsText, '(?s)/\* ================= 住宿五平台快速搜尋.*?/\* ================= 離澳收尾清單')
if (-not $housingToolScript.Success) {
  Write-Output 'FAIL [tools.js] 缺住宿五平台搜尋功能塊'
  $errors++
} else {
  foreach ($housingToolNeedle in @(
    'housingTool.hidden = false',
    'new URL("https://www.booking.com/searchresults.html")',
    'WA: "Western Australia"',
    'bookingUrl.searchParams.set("ss", bookingLocation)',
    'https://www.hostelworld.com/hostels/oceania/australia/',
    'https://flatmates.com.au/rooms/',
    'https://www.realestate.com.au/rent/',
    'https://www.domain.com.au/rent/',
    'housingSummary.textContent',
    'housingForm.checkValidity()',
    'event.key !== "Enter"',
    'accommodationSearchEnabled !== true',
    'window.fetch(housingApiSettings.baseUrl + "/api/accommodation/search"',
    'credentials: "omit"',
    'referrerPolicy: "no-referrer"',
    'licensed-api-plus-external-links',
    'housing-route-primary',
    'housing-route-secondary',
    'housingLiveList.replaceChildren()',
    'prefers-reduced-motion'
  )) {
    if (-not $housingToolScript.Value.Contains($housingToolNeedle)) {
      Write-Output "FAIL [tools.js] 住宿搜尋缺安全轉接行為：$housingToolNeedle"
      $errors++
    }
  }
  foreach ($housingToolForbidden in @('localStorage', 'sessionStorage', 'XMLHttpRequest', 'sendBeacon', 'window.open', 'innerHTML')) {
    if ($housingToolScript.Value.Contains($housingToolForbidden)) {
      Write-Output "FAIL [tools.js] 住宿搜尋不得保存、上傳、抓取或自動多開平台：$housingToolForbidden"
      $errors++
    }
  }
}
& node (Join-Path $dir 'scripts\test_housing_search.mjs')
if ($LASTEXITCODE -ne 0) {
  Write-Output 'FAIL 住宿五平台搜尋行為測試失敗'
  $errors++
}
& node (Join-Path $dir 'scripts\test_analytics.cjs')
if ($LASTEXITCODE -ne 0) {
  Write-Output 'FAIL GA4 敏感頁排除行為測試失敗（scripts/test_analytics.cjs）'
  $errors++
}
& node (Join-Path $dir 'scripts\test_tools.mjs')
if ($LASTEXITCODE -ne 0) {
  Write-Output 'FAIL 集簽快查器與存錢試算器固定案例測試失敗（scripts/test_tools.mjs）'
  $errors++
}
& node (Join-Path $dir 'scripts\test_job_router.mjs')
if ($LASTEXITCODE -ne 0) {
  Write-Output 'FAIL 公開求職篩選導流測試失敗（scripts/test_job_router.mjs）'
  $errors++
}
& node (Join-Path $dir 'scripts\test_search.mjs')
if ($LASTEXITCODE -ne 0) {
  Write-Output 'FAIL 站內搜尋驗收失敗（scripts/test_search.mjs；OPTIMIZATION_PLAN P0-9 驗收 1–2）'
  $errors++
}
& node (Join-Path $dir 'scripts\clarifier-contract.mjs')
if ($LASTEXITCODE -ne 0) {
  Write-Output 'FAIL 首頁釐清器契約測試失敗（scripts/clarifier-contract.mjs；OPTIMIZATION_PLAN P0-8 驗收 6）'
  $errors++
}

$costText = [System.IO.File]::ReadAllText((Join-Path $dir 'cost.html'), [System.Text.Encoding]::UTF8)
foreach ($carNeedle in @(
  'id="car"',
  'https://www.carsales.com.au/cars/used/western-australia-state/perth-region/',
  'https://www.gumtree.com.au/s-cars-vans-utes/perth/c18320l3008303',
  'https://www.facebook.com/marketplace/perth/vehicles',
  'https://www.ppsr.gov.au/carcheck',
  'https://online.transport.wa.gov.au/webExternal/registration/',
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

# 自我釐清必須同時提供快思／慢想，且不得包裝成心理診斷或總適合度
$whyText = [System.IO.File]::ReadAllText((Join-Path $dir 'why.html'), [System.Text.Encoding]::UTF8)
foreach ($whyId in @('quick-quiz', 'quick-form', 'quick-progress', 'quick-result', 'quick-next-link', 'worksheet', 'framework', 'after-reflection')) {
  if (-not $whyText.Contains("id=`"$whyId`"")) { Write-Output "FAIL [why.html] 缺自我釐清雙模式元件：$whyId"; $errors++ }
}
$quickNames = @([regex]::Matches($whyText, 'data-name="(qq[1-8])"') | ForEach-Object { $_.Groups[1].Value })
if ($quickNames.Count -ne 8 -or @($quickNames | Select-Object -Unique).Count -ne 8) {
  Write-Output "FAIL [why.html] 快思題號必須是 qq1..qq8 且各出現一次"
  $errors++
}
foreach ($axis in @('autonomy', 'values', 'reality', 'support')) {
  $axisCount = [regex]::Matches($whyText, "data-axis=`"$axis`"").Count
  if ($axisCount -ne 2) { Write-Output "FAIL [why.html] 快思面向 $axis 題數=$axisCount（應為 2）"; $errors++ }
}
foreach ($slowId in 1..8) {
  if (-not $whyText.Contains("id=`"q$slowId`"")) { Write-Output "FAIL [why.html] 慢想版缺舊資料欄位：q$slowId"; $errors++ }
}
foreach ($whyNeedle in @(
  '不是心理測驗或出發許可證',
  '不是經驗證的心理量表',
  '不比較別人、不合計總分',
  'https://selfdeterminationtheory.org/the-theory/',
  'https://doi.org/10.9707/2307-0919.1116',
  'https://doi.org/10.1007/s11031-012-9288-3'
)) {
  if (-not $whyText.Contains($whyNeedle)) { Write-Output "FAIL [why.html] 缺研究來源或非診斷界線：$whyNeedle"; $errors++ }
}
$whyMainJs = [System.IO.File]::ReadAllText((Join-Path $dir 'assets\main.js'), [System.Text.Encoding]::UTF8)
foreach ($quickNeedle in @('whv-why-quick-v1', 'quickScores', 'lowestAxes', 'whv-worksheet-v1', 'lines.concat(quickExportLines())')) {
  if (-not $whyMainJs.Contains($quickNeedle)) { Write-Output "FAIL [main.js] 自我釐清儲存／分面／匯出缺必要行為：$quickNeedle"; $errors++ }
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

# 搜尋探索：sitemap 必須列出全部完整繁中頁、語言 hub、Quick Start 與完整翻譯頁
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
  if (Test-Path (Join-Path $dir 'assets\i18n-locales.json')) {
    $sitemapI18nData = Get-Content -Raw (Join-Path $dir 'assets\i18n-locales.json') | ConvertFrom-Json
    $expectedUrls += "$canonicalOrigin/lang/"
    $expectedUrls += @($sitemapI18nData.locales.PSObject.Properties | Where-Object { $_.Name -ne 'zh-Hant' -and $_.Value.reviewStatus -ne 'english-fallback' } | ForEach-Object { "$canonicalOrigin/lang/$($_.Name)/" })
    $expectedUrls += "$canonicalOrigin/lang/en/visa/"
    $expectedUrls += "$canonicalOrigin/lang/en/prep/"
    $expectedUrls += "$canonicalOrigin/lang/en/cost/"
    $expectedUrls += "$canonicalOrigin/lang/en/housing/"
    $expectedUrls += "$canonicalOrigin/lang/en/work/"
    $expectedUrls += "$canonicalOrigin/lang/en/scam/"
    $expectedUrls += "$canonicalOrigin/lang/en/health/"
  }
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
  if (-not $robotsText.Contains("User-agent: *") -or -not $robotsText.Contains("Allow: /") -or $robotsText -match '(?im)^\s*Disallow:\s*/\s*$') {
    Write-Output 'FAIL robots.txt 必須允許公開內容，且不得封鎖整站'
    $errors++
  }
  foreach ($privateRoute in @('/api/', '/admin/', '/crm/', '/contact/confirmation/', '/contact/receipt/', '/contact/delete/')) {
    if (-not $robotsText.Contains("Disallow: $privateRoute")) { Write-Output "FAIL robots.txt 未保護非內容／個資路徑：$privateRoute"; $errors++ }
  }
  if (-not $robotsText.Contains("Sitemap: $canonicalOrigin/sitemap.xml")) {
    Write-Output 'FAIL robots.txt 未宣告正式 sitemap'
    $errors++
  }
}

# llms.txt 是輔助 AI 理解的社群提案，不取代 sitemap／robots；需列出完整頁、語言入口與事實邊界
$llmsPath = Join-Path $dir 'llms.txt'
if (-not (Test-Path $llmsPath)) {
  Write-Output 'FAIL 缺 llms.txt'
  $errors++
} else {
  $llmsText = [System.IO.File]::ReadAllText($llmsPath, [System.Text.Encoding]::UTF8)
  $llmsExpectedUrls = @($pages | ForEach-Object {
    if ($_ -eq 'index.html') { "$canonicalOrigin/" } else { "$canonicalOrigin/$_" }
  }) + "$canonicalOrigin/lang/" + "$canonicalOrigin/lang/en/visa/" + "$canonicalOrigin/lang/en/prep/" + "$canonicalOrigin/lang/en/cost/" + "$canonicalOrigin/lang/en/housing/" + "$canonicalOrigin/lang/en/work/" + "$canonicalOrigin/lang/en/scam/" + "$canonicalOrigin/lang/en/health/"
  foreach ($url in $llmsExpectedUrls) {
    if (-not $llmsText.Contains("($url)")) { Write-Output "FAIL llms.txt 缺頁面：$url"; $errors++ }
  }
  foreach ($llmsNeedle in @('CC BY-SA 4.0', '不是澳洲政府、移民代理、法律或醫療服務', '不要把社群經驗、估算值或互動工具輸出描述成官方判定', "$canonicalOrigin/content-status.json", "$canonicalOrigin/crawler-policy.txt")) {
    if (-not $llmsText.Contains($llmsNeedle)) { Write-Output "FAIL llms.txt 缺授權或事實邊界：$llmsNeedle"; $errors++ }
  }
}

$contentStatusPath = Join-Path $dir 'content-status.json'
if (-not (Test-Path $contentStatusPath)) {
  Write-Output 'FAIL 缺 content-status.json'
  $errors++
} else {
  try {
    $contentStatus = Get-Content -Raw $contentStatusPath | ConvertFrom-Json
    if ($contentStatus.schemaVersion -ne 2 -or $contentStatus.canonicalOrigin -ne $canonicalOrigin) { Write-Output 'FAIL content-status.json schema 或 canonical 錯誤'; $errors++ }
    if ($contentStatus.isOfficialGovernmentService -ne $false -or $contentStatus.providesMigrationLegalMedicalOrTaxAdvice -ne $false) { Write-Output 'FAIL content-status.json 未守住非官方／非專業服務界線'; $errors++ }
    if ($contentStatus.publicContentCrawlable -ne $true -or $contentStatus.formsApiCrmAndPersonalDataCrawlable -ne $false) { Write-Output 'FAIL content-status.json crawler 公私界線錯誤'; $errors++ }
    if (@($contentStatus.primaryPages).Count -ne 17) { Write-Output "FAIL content-status.json 繁中主頁數=$(@($contentStatus.primaryPages).Count)（應為 17）"; $errors++ }
    if (@($contentStatus.fullEnglishGuides).Count -ne 7) { Write-Output "FAIL content-status.json 完整英文頁數=$(@($contentStatus.fullEnglishGuides).Count)（應為 7）"; $errors++ }
    if (@($contentStatus.quickStartLocales).Count -ne 37) { Write-Output "FAIL content-status.json Quick Start 語言數=$(@($contentStatus.quickStartLocales).Count)（應為 37）"; $errors++ }
    $checkedEvidence = @($contentStatus.primaryPages | Where-Object { $_.evidenceCardStatus -eq 'checked' })
    if ($checkedEvidence.Count -ne 9 -or @($checkedEvidence | Where-Object { -not $_.evidenceCardCheckedAt -or $_.evidenceCardScope -ne 'first-action-only' }).Count -gt 0) { Write-Output 'FAIL content-status.json 已查核證據卡數量、日期或範圍錯誤'; $errors++ }
    if (@($contentStatus.primaryPages | Where-Object { -not $_.pageReviewStatus }).Count -gt 0 -or @($contentStatus.fullEnglishGuides | Where-Object { $_.pageReviewStatus -ne 'editorial-draft-unreviewed-by-native-domain-professional' }).Count -gt 0) { Write-Output 'FAIL content-status.json 缺整頁 review 狀態或英文草稿誤稱完整'; $errors++ }
    if (-not $contentStatus.legacyFieldPolicy.Contains('retained for compatibility')) { Write-Output 'FAIL content-status.json 缺舊欄位相容界線'; $errors++ }
    if (@($contentStatus.primaryPages | Where-Object { $_.reviewedByDomainProfessional -eq $true }).Count -gt 0 -or @($contentStatus.fullEnglishGuides | Where-Object { $_.reviewedByDomainProfessional -eq $true }).Count -gt 0) { Write-Output 'FAIL content-status.json 不得假稱已有專業審校'; $errors++ }
  } catch {
    Write-Output 'FAIL content-status.json 不是合法 JSON'
    $errors++
  }
}

# SEO 標題與描述不得使用無邊界的「最新／完整／全攻略」行銷字眼；內文可在具體語境使用普通詞義。
foreach ($seoClaimPage in $pages) {
  $seoClaimText = [System.IO.File]::ReadAllText((Join-Path $dir $seoClaimPage), [System.Text.Encoding]::UTF8)
  $seoClaimTitle = [regex]::Match($seoClaimText, '(?s)<title>(.*?)</title>').Groups[1].Value
  $seoClaimDescription = [regex]::Match($seoClaimText, '<meta name="description" content="([^"]*)">').Groups[1].Value
  if (($seoClaimTitle + $seoClaimDescription) -match '最新|最完整|完整規則|完整官方|全攻略|終極攻略') {
    Write-Output "FAIL [$seoClaimPage] SEO 標題／描述含無邊界行銷字眼"; $errors++
  }
}
$highRiskCopy = (($pages | ForEach-Object { [System.IO.File]::ReadAllText((Join-Path $dir $_), [System.Text.Encoding]::UTF8) }) -join "`n") + "`n" + ([System.IO.File]::ReadAllText((Join-Path $dir 'assets\tools.js'), [System.Text.Encoding]::UTF8))
foreach ($forbiddenHighRiskClaim in @('危及生命才去', '查不到＝無照＝違法', '背包客最常走的路', '做滿 2 年轉 PR', '達所得門檻後轉 191', '肥羊體質', '這筆錢別省', '馬上知道能不能算二簽三簽', '馬上知道能不能計入二簽', '離澳實際能領回多少', '在官方合格清單內', '不在官方合格清單內', '幾乎都是詐騙或違法行為', '依 2026-08-29 抓取的官方清單判定')) {
  if ($highRiskCopy.Contains($forbiddenHighRiskClaim)) { Write-Output "FAIL 高風險絕對語氣回歸：$forbiddenHighRiskClaim"; $errors++ }
}

# 模擬器：只做固定教育情境，不保存或傳送回答，也不把遊戲資源描述成現實判定。
$simulatorPath = Join-Path $dir 'simulator.html'
$simulatorScriptPath = Join-Path $dir 'assets\simulator.js'
if (-not (Test-Path $simulatorPath) -or -not (Test-Path $simulatorScriptPath)) {
  Write-Output 'FAIL 缺 simulator.html 或 assets/simulator.js'
  $errors++
} else {
  $simulatorText = [System.IO.File]::ReadAllText($simulatorPath, [System.Text.Encoding]::UTF8)
  $simulatorScript = [System.IO.File]::ReadAllText($simulatorScriptPath, [System.Text.Encoding]::UTF8)
  foreach ($simulatorNeedle in @(
    'id="simulator-profile-form"',
    'id="simulator-stage"',
    'id="simulator-finish"',
    'id="simulator-progress"',
    'id="simulator-profile-note"',
    '不傳送答案',
    '不判定簽證資格',
    '遊戲分數只表示你在這段模擬中保留了多少資源',
    '若現實中有人嚴重受傷、呼吸困難、失去意識或處於立即危險',
    '請停止模擬並撥 <strong>000</strong>',
    'Consumer Protection WA 租屋指南',
    'Scamwatch 求職詐騙',
    'Fair Work payslips',
    'healthdirect 000',
    'MoneySmart budget planner'
  )) {
    if (-not $simulatorText.Contains($simulatorNeedle)) { Write-Output "FAIL [simulator.html] 缺情境、隱私或來源邊界：$simulatorNeedle"; $errors++ }
  }
  $simulatorForm = [regex]::Match($simulatorText, '(?s)<form id="simulator-profile-form">(.*?)</form>').Groups[1].Value
  if (-not $simulatorForm -or [regex]::Matches($simulatorForm, '<fieldset class="simulator-question">').Count -ne 5) {
    Write-Output 'FAIL [simulator.html] 角色設定必須是 5 組固定題'
    $errors++
  }
  if ([regex]::Matches($simulatorForm, '<input\s+type="(?!radio")').Count -gt 0 -or $simulatorForm.Contains('<textarea') -or $simulatorForm.Contains('type="email"')) {
    Write-Output 'FAIL [simulator.html] 角色設定不得收自由文字、Email 或非白名單輸入'
    $errors++
  }
  if ([regex]::Matches($simulatorScript, 'day:\s*"DAY').Count -ne 6) {
    Write-Output 'FAIL [simulator.js] 必須維持 6 個固定事件'
    $errors++
  }
  if ([regex]::Matches($simulatorText, '<noscript>').Count -ne 1) {
    Write-Output 'FAIL [simulator.html] 必須只有一份 no-JS 替代入口'
    $errors++
  }
  if (-not [regex]::IsMatch($simulatorScript, 'updateStats\(\);\s*updateProfileNote\(\);\s*showFeedback')) {
    Write-Output 'FAIL [simulator.js] 作答後必須同步更新角色快照'
    $errors++
  }
  foreach ($simulatorScriptNeedle in @('var EVENTS = [', 'critical: true', 'href="tel:000"', 'criticalAction.hidden = !event.critical', 'prefers-reduced-motion: reduce', '確定要放棄本輪嗎', 'simulator-profile-form { display: none; }', '模擬器需要 JavaScript', 'state.riskChoices', 'goalKeys[state.goal]', 'slice(0, 3)', 'new FormData(form)', 'whv-simulator-progress-v1', 'sessionStorage.setItem(progressKey', 'sessionStorage.removeItem(progressKey)', 'isValidState(saved.state)', 'state.selectedChoice !== null', 'showFeedback(event, event.choices[state.selectedChoice], false)', '遊戲進度只在目前分頁暫存', '從攻略回來或重新整理可繼續')) {
    if (-not ($simulatorScript + "`n" + $simulatorText).Contains($simulatorScriptNeedle)) { Write-Output "FAIL [simulator.js] 缺固定事件或結果邊界：$simulatorScriptNeedle"; $errors++ }
  }
  foreach ($simulatorForbidden in @('localStorage', 'fetch(', 'XMLHttpRequest', 'navigator.sendBeacon', '成功率：', '簽證資格：')) {
    if ($simulatorScript.Contains($simulatorForbidden)) { Write-Output "FAIL [simulator.js] 不得保存、傳送或輸出現實判定：$simulatorForbidden"; $errors++ }
  }
  if (-not $i18nSwitcherText.Contains('"simulator":{"zh-Hant":"/simulator.html"}')) {
    Write-Output 'FAIL [i18n.js] 模擬器繁中語言路由未保留原主題'
    $errors++
  }
}

$crawlerPolicyPath = Join-Path $dir 'crawler-policy.txt'
if (-not (Test-Path $crawlerPolicyPath)) {
  Write-Output 'FAIL 缺 crawler-policy.txt'
  $errors++
} else {
  $crawlerPolicy = [System.IO.File]::ReadAllText($crawlerPolicyPath, [System.Text.Encoding]::UTF8)
  foreach ($crawlerNeedle in @('may be discovered, indexed, summarised and reasonably cited', 'Do not submit or automate forms', 'Do not collect form-submitted email addresses', 'CC BY-SA 4.0', 'content-status.json')) {
    if (-not $crawlerPolicy.Contains($crawlerNeedle)) { Write-Output "FAIL crawler-policy.txt 缺公開／個資／授權邊界：$crawlerNeedle"; $errors++ }
  }
}

$seoBuilder = Join-Path $dir 'scripts\build_seo.py'
if (-not (Test-Path $seoBuilder)) {
  Write-Output 'FAIL 缺 scripts/build_seo.py'
  $errors++
} else {
  & python $seoBuilder --check
  if ($LASTEXITCODE -ne 0) { Write-Output 'FAIL SEO 產物過期或分享圖錯誤'; $errors++ }
}

# emoji 掃描（HTML + JS；SDD §4.4 禁用 emoji）
$scanTargets = (Get-ChildItem (Join-Path $dir '*.html')) + (Get-ChildItem (Join-Path $dir 'lang\*.html') -Recurse) + (Get-ChildItem (Join-Path $dir 'assets\*.js'))
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
foreach ($a in @('assets\style.css', 'assets\main.js', 'assets\i18n.js', 'assets\i18n-locales.json', 'assets\tools.js', 'assets\postcodes.js', 'assets\seasons.js', 'assets\lemon-pattern.svg')) {
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
if (-not $styleText.Contains('main [id] { scroll-margin-top: 170px; }') -or -not $styleText.Contains('.site-header { position: static; }') -or -not $styleText.Contains('main [id] { scroll-margin-top: 24px; }')) {
  Write-Output 'FAIL [style.css] 桌機錨點安全距離或手機 static header 修正缺失'
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
# 首頁首屏（docs/OPTIMIZATION_PLAN.md P0-8）：安全列 → 緊湊 hero（問句 h1）→ 釐清器；四格入口與承諾列退場；直接解法出口仍在
foreach ($homeZoneNeedle in @(
  'href="#search"',
  'href="#communities"',
  'href="#games"',
  'id="clarifier"',
  'id="common-problems"',
  'id="communities"',
  'id="games"',
  'href="housing.html#book"',
  'href="work.html#channels"',
  'href="market.html#market-tool"',
  '開始多平台找房',
  '打開多平台求職入口',
  '開啟二手交換工具',
  '開始澳打模擬器'
)) {
  if (-not $indexText.Contains($homeZoneNeedle)) { Write-Output "FAIL [index.html] 缺首頁分區或直接解法：$homeZoneNeedle"; $errors++ }
}
# P0-8 安全列：<nav id="support-hub" class="safety-bar">，恰好 5 個 <a>、依序五個目的地、不收合（無 <details>）、只留短文案
$safetyBar = [regex]::Match($indexText, '(?s)<nav id="support-hub" class="safety-bar" aria-label="很急？先走這裡">.*?</nav>')
$safetyBarHrefs = @('health.html#emergency', 'scam.html#help', 'scam.html#help', 'visa.html#apply', 'housing.html#housing-search-tool')
if (-not $safetyBar.Success) {
  Write-Output 'FAIL [index.html] 缺常駐安全列 nav#support-hub.safety-bar'
  $errors++
} else {
  $safetyLinks = @([regex]::Matches($safetyBar.Value, '<a\b[^>]*href="([^"]+)"') | ForEach-Object { $_.Groups[1].Value })
  if ($safetyLinks.Count -ne 5 -or ($safetyLinks -join ',') -ne ($safetyBarHrefs -join ',')) {
    Write-Output "FAIL [index.html] 安全列必須恰好 5 個 <a> 且依序為 $($safetyBarHrefs -join ', ')；目前：$($safetyLinks -join ', ')"
    $errors++
  }
  if ($safetyBar.Value.Contains('<details') -or -not $safetyBar.Value.Contains('<span class="safety-bar-label">很急？</span>')) {
    Write-Output 'FAIL [index.html] 安全列不得收合，且必須以「很急？」開頭'
    $errors++
  }
  foreach ($safetyLabel in @('>受傷</a>', '>剛匯款</a>', '>被威脅或扣證件</a>', '>簽證到期</a>', '>今晚沒地方住</a>')) {
    if (-not $safetyBar.Value.Contains($safetyLabel)) { Write-Output "FAIL [index.html] 安全列缺出口文案：$safetyLabel"; $errors++ }
  }
  if ($safetyBar.Value.Contains('<small') -or $safetyBar.Value.Contains('support-link') -or $safetyBar.Value.Contains('<svg')) {
    Write-Output 'FAIL [index.html] 安全列連結只留短文案（說明文字已移到各目的頁），不放圖示或 small'
    $errors++
  }
}
# P0-9 搜尋強化（docs/OPTIMIZATION_PLAN.md）：8 個熱門 chip 都是 <a href>、首頁與 header dialog 一致；21 個出口卡進索引；零結果出口與階段／安全列同源
$searchHotLinks = @(
  @('work.html#verify', '這工合法嗎'),
  @('visa.html#counting', '88天怎麼算'),
  @('housing.html#bond', '押金先給嗎'),
  @('prep.html#first-week', '三大號順序'),
  @('english.html#reality', '英文很爛'),
  @('cost.html#budget', '要帶多少錢'),
  @('lang/en/visa/#choose', '462抽籤'),
  @('health.html#insurance', '保險買哪邊')
)
$expectedHotChips = ($searchHotLinks | ForEach-Object { $_[0] + '|' + $_[1] }) -join ','
$homeChipRow = [regex]::Match($indexText, '(?s)<div class="chip-row" aria-label="熱門問題" data-search-ui>.*?</div>')
if (-not $homeChipRow.Success) {
  Write-Output 'FAIL [index.html] 搜尋區缺熱門問題 chip-row（aria-label="熱門問題"，data-search-ui）'
  $errors++
} else {
  $homeChips = @([regex]::Matches($homeChipRow.Value, '<a class="chip" href="([^"]+)">([^<]+)</a>') | ForEach-Object { $_.Groups[1].Value + '|' + $_.Groups[2].Value })
  if ($homeChips.Count -ne 8 -or ($homeChips -join ',') -ne $expectedHotChips -or $homeChipRow.Value.Contains('<button')) {
    Write-Output "FAIL [index.html] 熱門 chip 必須恰好 8 個 <a href> 且依序為 $expectedHotChips；目前：$($homeChips -join ',')"
    $errors++
  }
}
$dialogHotBlock = [regex]::Match($mainJs, '(?s)var SEARCH_HOT_LINKS = \[(.*?)\];')
$dialogChips = @()
if ($dialogHotBlock.Success) {
  $dialogChips = @([regex]::Matches($dialogHotBlock.Groups[1].Value, '\["([^"]+)", "([^"]+)"\]') | ForEach-Object { $_.Groups[1].Value + '|' + $_.Groups[2].Value })
}
if (-not $dialogHotBlock.Success -or ($dialogChips -join ',') -ne $expectedHotChips -or -not $mainJs.Contains('SEARCH_HOT_LINKS.map(function (item) { return ''<a class="chip" href="'' + item[0] + ''">'' + item[1] + ''</a>''; })')) {
  Write-Output "FAIL [main.js] header 搜尋 dialog 的 SEARCH_HOT_LINKS 必須與首頁 8 個 chip 一致並渲染為 <a class=\"chip\" href>；目前：$($dialogChips -join ',')"
  $errors++
}
$exitSearchEntries = [regex]::Matches($indexText, '<div class="clarifier-exit(?: clarifier-exit-lite)?" id="(exit-[a-z-]+)" tabindex="-1" data-search-entry="[^"|]+\|#\1">').Count
if ($exitSearchEntries -ne 21) {
  Write-Output "FAIL [index.html] 21 個出口卡都必須帶 data-search-entry=`"標題|#自身 id`"（build_search.py 抽取契約）；目前 $exitSearchEntries"
  $errors++
}
$zeroStageBlock = [regex]::Match($mainJs, '(?s)var SEARCH_STAGE_LINKS = \[(.*?)\];')
$zeroStageHrefs = @()
if ($zeroStageBlock.Success) { $zeroStageHrefs = @([regex]::Matches($zeroStageBlock.Groups[1].Value, '\["([^"]+)"') | ForEach-Object { $_.Groups[1].Value }) }
if (($zeroStageHrefs -join ',') -ne 'index.html#considering,index.html#committed,index.html#in-australia,index.html#next-step') {
  Write-Output "FAIL [main.js] 零結果階段 chips 必須依序連到四個階段面板；目前：$($zeroStageHrefs -join ',')"
  $errors++
}
$zeroSafetyBlock = [regex]::Match($mainJs, '(?s)var SEARCH_SAFETY_LINKS = \[(.*?)\];')
$zeroSafetyHrefs = @()
if ($zeroSafetyBlock.Success) { $zeroSafetyHrefs = @([regex]::Matches($zeroSafetyBlock.Groups[1].Value, '\["([^"]+)"') | ForEach-Object { $_.Groups[1].Value }) }
if (($zeroSafetyHrefs -join ',') -ne ($safetyBarHrefs -join ',')) {
  Write-Output "FAIL [main.js] 零結果安全列必須與 index.html nav#support-hub 同序；目前：$($zeroSafetyHrefs -join ',')"
  $errors++
}
$heroBlock = [regex]::Match($indexText, '(?s)<section class="hero hero-compact">.*?</section>')
if (-not $heroBlock.Success -or [regex]::Matches($heroBlock.Value, '<h1>[^<]*哪一步[^<]*</h1>').Count -ne 1 -or -not $heroBlock.Value.Contains('<p class="lede">先講你現在卡哪一步，再給你對得上的資料。</p>')) {
  Write-Output 'FAIL [index.html] 緊湊 hero 必須恰好一個含「哪一步」問句的 h1 與固定 lede'
  $errors++
}
if ($heroBlock.Success -and ([regex]::Matches($heroBlock.Value, '<svg\b').Count -gt 1 -or $heroBlock.Value.Contains('free-badge') -or $heroBlock.Value.Contains('最友善'))) {
  Write-Output 'FAIL [index.html] hero 只留單顆裝飾 SVG；badge 與使命句已移到 about.html'
  $errors++
}
$mainOpenAt = $indexText.IndexOf('<main id="main-content"')
$safetyBarAt = $indexText.IndexOf('<nav id="support-hub" class="safety-bar"')
$heroAt = $indexText.IndexOf('<section class="hero hero-compact">')
$clarifierAt = $indexText.IndexOf('id="clarifier"')
if ($mainOpenAt -lt 0 -or $safetyBarAt -le $mainOpenAt -or $heroAt -le $safetyBarAt -or $clarifierAt -le $heroAt) {
  Write-Output 'FAIL [index.html] 首屏順序必須是 main → 安全列 → hero → 釐清器'
  $errors++
}
# P0-8 信任列（階段 chips 下方一句）、護照上方一句（兩組）、搜尋標題與固定搜尋鈕、三張入口卡
$clarifierTrustLine = '公開內容免費，不代辦。本站沒有會員、配對或私訊功能，也不會由本站主動私訊。選項只在這一頁，不會送出。'
$journeyMapAt = $indexText.IndexOf('id="journey-map"')
$trustLineAt = $indexText.IndexOf($clarifierTrustLine)
$panelsAt = $indexText.IndexOf('id="common-problems"')
if ([regex]::Matches($indexText, [regex]::Escape($clarifierTrustLine)).Count -ne 1 -or $trustLineAt -le $journeyMapAt -or $panelsAt -le $trustLineAt) {
  Write-Output 'FAIL [index.html] 信任列必須恰好一句且位於階段 chips 與面板之間'
  $errors++
}
if ([regex]::Matches($indexText, '<p class="clarifier-passport-lead">台灣 417 跟中國 462 不是同一條路。</p>').Count -ne 2) {
  Write-Output 'FAIL [index.html] 護照 chips 上方一句「台灣 417 跟中國 462 不是同一條路。」應恰好兩處'
  $errors++
}
if (-not $indexText.Contains('<h2 id="site-search-home-title">卡片裡沒有你的說法？直接搜尋</h2>') -or -not $indexText.Contains('<p>只在這台裝置搜尋，不送出。</p>')) {
  Write-Output 'FAIL [index.html] 搜尋區標題或本機搜尋聲明文案不符'
  $errors++
}
$searchJump = [regex]::Match($indexText, '<p class="clarifier-search-jump"><a class="btn" id="clarifier-search-open" href="#search">.*?</a></p>')
$searchSectionOpenAt = $indexText.IndexOf('<section class="site-search-home"')
if (-not $searchJump.Success -or $searchJump.Index -le $indexText.IndexOf('<section class="job-quiz" id="job-quiz"') -or $searchJump.Index -ge $searchSectionOpenAt) {
  Write-Output 'FAIL [index.html] 釐清器底部缺固定搜尋鈕（a#clarifier-search-open → #search，位於小測驗之後、搜尋區之前）'
  $errors++
}
$entryCards = [regex]::Match($indexText, '(?s)<nav class="home-entry-cards" aria-label="接下來可以去">.*?</nav>')
if (-not $entryCards.Success) {
  Write-Output 'FAIL [index.html] 缺三張入口卡 nav.home-entry-cards'
  $errors++
} else {
  $entryHrefs = @([regex]::Matches($entryCards.Value, '<a class="home-entry-card"[^>]*href="([^"]+)"') | ForEach-Object { $_.Groups[1].Value })
  if ($entryHrefs.Count -ne 3 -or ($entryHrefs -join ',') -ne 'communities.html,#games,#journey-resume') {
    Write-Output "FAIL [index.html] 入口卡必須恰好三張且依序連 communities.html、#games、#journey-resume；目前：$($entryHrefs -join ', ')"
    $errors++
  }
  foreach ($entryCardNeedle in @('找在地公開討論', '不配對、不代聊', '先在安全的地方試一次', '只在你的裝置上跑', '<a class="home-entry-card" id="home-entry-resume" href="#journey-resume" hidden>')) {
    if (-not $entryCards.Value.Contains($entryCardNeedle)) { Write-Output "FAIL [index.html] 入口卡文案或續讀卡預設 hidden 缺失：$entryCardNeedle"; $errors++ }
  }
  if ($entryCards.Index -le $indexText.IndexOf('id="assist"') -or $entryCards.Index -ge $indexText.IndexOf('id="communities"')) {
    Write-Output 'FAIL [index.html] 入口卡必須在 AI 兜底之後、社團目錄之前'
    $errors++
  }
}
# P0-8 頁尾：承諾一行、「資料怎麼來」一句連 about.html#editorial-method、三原則恰好一個連結
$footerBlock = [regex]::Match($indexText, '(?s)<footer class="site-footer">.*?</footer>')
if (-not $footerBlock.Success) {
  Write-Output 'FAIL [index.html] 缺頁尾'
  $errors++
} else {
  foreach ($footerNeedle in @(
    '<p class="foot-promise">官方來源可回查・風險先揭露・公開內容免費・資料性質說清楚</p>',
    '<p class="source-model"><strong id="source-model-title">這些資料怎麼來？</strong>',
    '<a href="about.html#editorial-method">看資料來源與編輯方法</a></p>',
    '<p class="foot-principles">三個原則：'
  )) {
    if (-not $footerBlock.Value.Contains($footerNeedle)) { Write-Output "FAIL [index.html] 頁尾缺承諾列、資料來源句或三原則連結：$footerNeedle"; $errors++ }
  }
  if ([regex]::Matches($footerBlock.Value, '<p class="foot-principles">[^<]*<a href="about.html#editorial-method">[^<]+</a></p>').Count -ne 1) {
    Write-Output 'FAIL [index.html] 三原則必須是頁尾一句加恰好一個 about.html#editorial-method 連結'
    $errors++
  }
}
foreach ($homeStyleNeedle in @('.safety-bar {', '.safety-bar a {', '.hero-cut-gold {', '.home-entry-cards {', '.home-entry-card[hidden] { display: none; }', '.clarifier-search-jump { display: none; }', '.clarifier-search-jump { display: block; position: sticky;', '.clarifier-passport-lead {', '.foot-promise {', '.foot-principles {')) {
  if (-not $styleText.Contains($homeStyleNeedle)) { Write-Output "FAIL [style.css] 缺 P0-8 首屏樣式：$homeStyleNeedle"; $errors++ }
}
# P0-8 收尾：手機版 hero h1 最小 1.5rem（375px 時 24px，不得比內文小），上限維持 2.1rem
$heroTitleRule = [regex]::Match($styleText, '(?s)\.hero h1 \{.*?\}')
if (-not $heroTitleRule.Success -or -not $heroTitleRule.Value.Contains('font-size: clamp(1.5rem, 5vw, 2.1rem);')) {
  Write-Output 'FAIL [style.css] hero h1 字級必須是 clamp(1.5rem, 5vw, 2.1rem)（手機最小 24px）'
  $errors++
}
# P0-8 驗收 1：護照三顆 radio 必須同一列（第三顆換行會把需求 chips 推出第一屏）
$passportChipsRule = [regex]::Match($styleText, '(?s)\.clarifier-passport \.clarifier-chips \{\s*display: grid;.*?\}')
if (-not $passportChipsRule.Success -or -not $passportChipsRule.Value.Contains('grid-template-columns: repeat(3, minmax(0, 1fr));')) {
  Write-Output 'FAIL [style.css] 護照 radiogroup 必須是三欄同列（grid-template-columns: repeat(3, minmax(0, 1fr))）'
  $errors++
}
foreach ($passportLabel in @('tabindex="0">台灣 417</button>', 'tabindex="-1">中國大陸 462</button>', 'tabindex="-1">其他護照</button>')) {
  if ([regex]::Matches($indexText, [regex]::Escape($passportLabel)).Count -ne 2) {
    Write-Output "FAIL [index.html] 護照 radio 文案必須在兩個面板各一份（短標籤以維持單列）：$passportLabel"
    $errors++
  }
}
$safetyBarLinkRule = [regex]::Match($styleText, '(?s)\.safety-bar a \{.*?\}')
if (-not $safetyBarLinkRule.Success -or -not $safetyBarLinkRule.Value.Contains('min-height: 44px;')) {
  Write-Output 'FAIL [style.css] 安全列連結必須維持 44px 可點高度'
  $errors++
}
foreach ($retiredStyleNeedle in @('.home-zone-nav', '.trust-strip', '.free-badge', '.hero-cut-green', '.hero-cut-accent', '.support-hub')) {
  if ($styleText.Contains($retiredStyleNeedle)) { Write-Output "FAIL [style.css] 已退場的首頁樣式不得留下：$retiredStyleNeedle"; $errors++ }
}
foreach ($homeScriptNeedle in @('getElementById("clarifier-search-open")', 'openSiteSearch("")', 'getElementById("home-entry-resume")', 'homeEntryResume.hidden = !hasResume && !hasSaved')) {
  if (-not $mainJs.Contains($homeScriptNeedle)) { Write-Output "FAIL [main.js] 固定搜尋鈕或續讀入口卡行為缺失：$homeScriptNeedle"; $errors++ }
}
# 既有首頁守門（contract §4.1 keep）：社群目錄 9/9 與第三方邊界、二手交換法律邊界與零後端草稿、收藏／最近閱讀、12 張回收卡（安全出口見上方 P0-8 安全列契約）
$communityEntries = [regex]::Matches($indexText, 'data-community-platform="(?:line|reddit)"').Count
$communityRegions = [regex]::Matches($indexText, 'class="map-region[^\"]*"[^>]*data-community-region=').Count
if ($communityEntries -ne 9 -or $communityRegions -ne 9) {
  Write-Output "FAIL [index.html] 社群清單或全澳簡化地圖不完整（entries=$communityEntries regions=$communityRegions）"
  $errors++
}
foreach ($communityUiNeedle in @('id="community-search-input"', 'id="community-platform-filter"', 'id="community-filter-clear"', 'id="community-list-status"', 'id="community-facebook-search"', 'id="community-reddit-search"', '簡化區域圖・不按比例', '非 WHV 專屬・無合作關係', '本站只建立搜尋連結，不抓取、不複製平台貼文或成員資料')) {
  if (-not $indexText.Contains($communityUiNeedle)) { Write-Output "FAIL [index.html] 社群篩選、地圖或第三方邊界缺失：$communityUiNeedle"; $errors++ }
}
foreach ($communityScriptNeedle in @('renderCommunityEntries', 'encodeURIComponent(platformQuery)', 'entry.hidden = !visible', 'communityEmpty.hidden = visibleCount !== 0')) {
  if (-not $mainJs.Contains($communityScriptNeedle)) { Write-Output "FAIL [main.js] 社群本機篩選或安全平台搜尋缺失：$communityScriptNeedle"; $errors++ }
}
$marketText = [System.IO.File]::ReadAllText((Join-Path $dir 'market.html'), [System.Text.Encoding]::UTF8)
foreach ($marketNeedle in @(
  'id="market-draft-form"',
  'data-market-mode="sell"',
  'data-market-mode="buy"',
  'id="market-safety-confirm"',
  'id="market-draft-output"',
  'id="market-facebook-link"',
  'id="market-ebay-link"',
  '本站目前不收刊登、不保存聯絡資料，也不介入付款',
  '不保存刊登內容、不驗證身分、不檢驗商品',
  '多數 consumer guarantees 不適用',
  '商品所有權、買方不受干擾持有，以及沒有未揭露債務／權利負擔'
)) {
  if (-not $marketText.Contains($marketNeedle)) { Write-Output "FAIL [market.html] 二手交換工具或法律邊界缺失：$marketNeedle"; $errors++ }
}
foreach ($marketScriptNeedle in @(
  'var marketMode = "sell"',
  'marketForm.checkValidity()',
  'marketForm.reportValidity()',
  'marketOutput.value = lines.join("\n")',
  '尚未刊登或送出',
  'encodeURIComponent(searchQuery)',
  'navigator.clipboard.writeText(marketOutput.value)',
  'marketForm.reset()'
)) {
  if (-not $toolsJs.Contains($marketScriptNeedle)) { Write-Output "FAIL [tools.js] 二手交換本機草稿行為缺失：$marketScriptNeedle"; $errors++ }
}
if ([regex]::Match($toolsJs, '(?s)/\* ================= 離澳出清.*?\n  \}').Value.Contains('fetch(')) {
  Write-Output 'FAIL [tools.js] 二手交換第一版不得把草稿送到後端'
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
$problemCategories = [regex]::Matches($indexText, 'class="problem-category"').Count
$problemActions = [regex]::Matches($indexText, 'class="card-action"').Count
if ($problemCategories -ne 12 -or $problemActions -ne 12) {
  Write-Output "FAIL [index.html] 問題卡必須有 12 組類別與第一步（category=$problemCategories action=$problemActions）"
  $errors++
}
# 釐清器入口與第 1 層：四個旅程階段依 main.js JOURNEY_ORDER（404.html 依賴四個 id）
foreach ($clarifierNeedle in @(
  '<section class="home-zone-section clarifier" id="clarifier" aria-labelledby="clarifier-title" data-clarifier data-stage="" data-passport="">',
  'id="clarifier-title"',
  '你現在在哪一步？',
  '選項只在這一頁，不會送出。'
)) {
  if (-not $indexText.Contains($clarifierNeedle)) { Write-Output "FAIL [index.html] 釐清器入口或零儲存聲明缺失：$clarifierNeedle"; $errors++ }
}
$clarifierStages = @('considering', 'committed', 'in-australia', 'next-step')
$journeyDirectory = [regex]::Match($indexText, '(?s)<nav class="journey-directory" id="journey-map".*?</nav>')
if (-not $journeyDirectory.Success) {
  Write-Output 'FAIL [index.html] 缺釐清器階段導覽 nav.journey-directory#journey-map'
  $errors++
} else {
  $stageLinks = @([regex]::Matches($journeyDirectory.Value, '<a\b[^>]*href="#([^"]+)"') | ForEach-Object { $_.Groups[1].Value })
  if ([regex]::Matches($journeyDirectory.Value, '<a\b').Count -ne 4 -or ($stageLinks -join ',') -ne ($clarifierStages -join ',')) {
    Write-Output "FAIL [index.html] 釐清器階段 chips 必須依序恰好四個（$($clarifierStages -join ', ')）；目前：$($stageLinks -join ', ')"
    $errors++
  }
}
$clarifierPanels = [regex]::Matches($indexText, '<section class="journey-phase clarifier-panel" id="([a-z-]+)"[^>]*data-clarifier-panel="([a-z-]+)"')
$clarifierPanelIds = @($clarifierPanels | ForEach-Object { $_.Groups[1].Value })
$clarifierPanelMismatch = @($clarifierPanels | Where-Object { $_.Groups[1].Value -ne $_.Groups[2].Value }).Count
if ([regex]::Matches($indexText, 'data-clarifier-panel="').Count -ne 4 -or ($clarifierPanelIds -join ',') -ne ($clarifierStages -join ',') -or $clarifierPanelMismatch -ne 0) {
  Write-Output "FAIL [index.html] 釐清器階段面板必須恰好四個且 id 與 data-clarifier-panel 一致；目前：$($clarifierPanelIds -join ', ')"
  $errors++
}
$clarifierExitCounts = @{ 'considering' = 3; 'committed' = 6; 'in-australia' = 8; 'next-step' = 4 }
$clarifierPassportCounts = @{ 'considering' = 1; 'committed' = 1; 'in-australia' = 0; 'next-step' = 0 }
# P0-10 固定句：G5 安全句（每個出口「看公開討論」下方）與 passport.md §10 短版邊界句（出口 3、11、12 與 462 摘要卡）
$clarifierPublicSafety = '不配對、不代聊。這裡只放公開入口；找房找工請走平台搜尋，不要先傳護照或匯款。'
$clarifierBoundary = '本站不判定個案資格；以內政部官方頁、ImmiAccount 與核准信為準。'
foreach ($stage in $clarifierStages) {
  $clarifierPanel = [regex]::Match($indexText, "(?s)<section class=`"journey-phase clarifier-panel`" id=`"$stage`".*?</section>")
  if (-not $clarifierPanel.Success) {
    Write-Output "FAIL [index.html] 缺釐清器階段面板：$stage"
    $errors++
    continue
  }
  $clarifierPanelText = $clarifierPanel.Value
  $clarifierExitCount = [regex]::Matches($clarifierPanelText, '<div class="clarifier-exit(?: clarifier-exit-lite)?" id="exit-').Count
  if ($clarifierExitCount -ne $clarifierExitCounts[$stage]) {
    Write-Output "FAIL [index.html] 階段 $stage 出口數=$clarifierExitCount（應為 $($clarifierExitCounts[$stage])）"
    $errors++
  }
  $clarifierChipNav = [regex]::Match($clarifierPanelText, '(?s)<nav class="clarifier-chips"[^>]*>.*?</nav>')
  if (-not $clarifierChipNav.Success) {
    Write-Output "FAIL [index.html] 階段 $stage 缺需求 chips（nav.clarifier-chips）"
    $errors++
  } else {
    foreach ($exitChip in [regex]::Matches($clarifierChipNav.Value, 'href="#(exit-[^"]+)"')) {
      if (-not $clarifierPanelText.Contains("id=`"$($exitChip.Groups[1].Value)`"")) {
        Write-Output "FAIL [index.html] 階段 $stage 需求 chip 沒有同面板出口：#$($exitChip.Groups[1].Value)"
        $errors++
      }
    }
    if ([regex]::Matches($clarifierChipNav.Value, "href=`"#$stage-exits`" data-label-462=`"全部看`">全部看</a>").Count -ne 1) {
      Write-Output "FAIL [index.html] 階段 $stage 必須有一個「全部看」chip 指向 #$stage-exits"
      $errors++
    }
    if (-not $clarifierChipNav.Value.Contains('href="#communities" data-label-462="看公開討論">看公開討論</a>')) {
      Write-Output "FAIL [index.html] 階段 $stage 需求 chips 缺「看公開討論」公開入口"
      $errors++
    }
    # P0-10：每個需求 chip 都要有 data-label-462（462 換字用；無 JS 顯示台灣版）
    $needChips = [regex]::Matches($clarifierChipNav.Value, '<a class="chip"[^>]*>')
    $needChipsMissing = @($needChips | Where-Object { $_.Value -notmatch 'data-label-462="[^"]+"' }).Count
    if ($needChips.Count -eq 0 -or $needChipsMissing -ne 0) {
      Write-Output "FAIL [index.html] 階段 $stage 需求 chips 每顆都要有 data-label-462；缺 $needChipsMissing 顆"
      $errors++
    }
  }
  # P0-10：每個出口都要有 8 字標題（h3 帶 data-label-462）、「看公開討論」連結與其下方安全句
  foreach ($clarifierExitBlock in [regex]::Matches($clarifierPanelText, '(?s)<div class="clarifier-exit(?: clarifier-exit-lite)?" id="(exit-[^"]+)".*?<p class="clarifier-exit-safety">[^<]*</p>')) {
    $clarifierExitId = $clarifierExitBlock.Groups[1].Value
    if ([regex]::Matches($clarifierExitBlock.Value, '<h3 data-label-462="[^"]+">[^<]+</h3>').Count -ne 1) {
      Write-Output "FAIL [index.html] 出口 $clarifierExitId 必須恰好一個帶 data-label-462 的 h3 標題"
      $errors++
    }
    if (-not [regex]::IsMatch($clarifierExitBlock.Value, '<a href="communities[.]html[?]need=[a-z-]+">看公開討論</a></p>')) {
      Write-Output "FAIL [index.html] 出口 $clarifierExitId 缺「看公開討論」連結"
      $errors++
    }
    if ([regex]::Matches($clarifierExitBlock.Value, [regex]::Escape($clarifierPublicSafety)).Count -ne 1) {
      Write-Output "FAIL [index.html] 出口 $clarifierExitId 「看公開討論」下方缺固定安全句"
      $errors++
    }
  }
  if ([regex]::Matches($clarifierPanelText, '<p class="clarifier-exit-safety">').Count -ne $clarifierExitCounts[$stage]) {
    Write-Output "FAIL [index.html] 階段 $stage 安全句數必須等於出口數 $($clarifierExitCounts[$stage])"
    $errors++
  }
  if (-not $clarifierPanelText.Contains("<div class=`"clarifier-exits`" id=`"$stage-exits`"")) {
    Write-Output "FAIL [index.html] 階段 $stage 缺出口容器 #$stage-exits"
    $errors++
  }
  if ([regex]::Matches($clarifierPanelText, [regex]::Escape('最想先解決哪件事？')).Count -ne 1) {
    Write-Output "FAIL [index.html] 階段 $stage 需求問題必須恰好出現一次"
    $errors++
  }
  if ([regex]::Matches($clarifierPanelText, [regex]::Escape('href="#support-hub">安全出口</a>')).Count -ne 1) {
    Write-Output "FAIL [index.html] 階段 $stage 必須有一句安全出口連結"
    $errors++
  }
  $clarifierPassportCount = [regex]::Matches($clarifierPanelText, '<div class="clarifier-passport"[^>]*\bhidden\b').Count
  if ($clarifierPassportCount -ne $clarifierPassportCounts[$stage] -or ($clarifierPassportCounts[$stage] -eq 0 -and $clarifierPanelText.Contains('data-passport='))) {
    Write-Output "FAIL [index.html] 護照分層只能在 considering／committed 各一組且預設 hidden；階段 $stage 目前 $clarifierPassportCount 組"
    $errors++
  }
}
# 第 2 層護照：只在頁面記憶體；462 改連 lang/en/visa/ 既有錨點；no-JS 用靜態兩連結句
foreach ($passportNeedle in @('data-passport="417"', 'data-passport="462"', 'data-passport="other"', 'data-clarifier-passport-static')) {
  if ([regex]::Matches($indexText, [regex]::Escape($passportNeedle)).Count -ne 2) { Write-Output "FAIL [index.html] 護照分層元件應恰好出現兩次：$passportNeedle"; $errors++ }
}
foreach ($passportLink in @('href="lang/en/visa/"', 'href="lang/"')) {
  if (-not $indexText.Contains($passportLink)) { Write-Output "FAIL [index.html] 護照分層缺 462／其他語言出口：$passportLink"; $errors++ }
}
$englishVisaIdText = if (Test-Path $englishVisaPath) { [System.IO.File]::ReadAllText($englishVisaPath, [System.Text.Encoding]::UTF8) } else { '' }
# P0-10 護照 radiogroup：容器 role="radiogroup" aria-labelledby；三顆 role="radio" aria-checked；不再用 aria-pressed
$passportGroups = [regex]::Matches($indexText, '(?s)<div class="clarifier-passport"[^>]*>.*?<p class="clarifier-passport-static"')
if ($passportGroups.Count -ne 2) {
  Write-Output "FAIL [index.html] 護照 radiogroup 應恰好兩組；目前 $($passportGroups.Count)"
  $errors++
}
foreach ($passportGroup in $passportGroups) {
  if ($passportGroup.Value -notmatch '<div class="clarifier-passport" role="radiogroup" aria-labelledby="(considering|committed)-passport-q" data-clarifier-passport hidden>') {
    Write-Output 'FAIL [index.html] 護照容器必須是 role="radiogroup" 且 aria-labelledby 指向問題句'
    $errors++
  }
  if ([regex]::Matches($passportGroup.Value, '<button class="chip" type="button" role="radio" data-passport="(417|462|other)" aria-checked="false" tabindex="(0|-1)">').Count -ne 3) {
    Write-Output 'FAIL [index.html] 護照 radiogroup 必須恰好三顆 role="radio" aria-checked="false" 的 button'
    $errors++
  }
  if ($passportGroup.Value.Contains('aria-pressed')) {
    Write-Output 'FAIL [index.html] 護照 radiogroup 不得再用 aria-pressed（改 aria-checked）'
    $errors++
  }
}
# P0-10 462 摘要卡（G6）：兩張（considering／committed）、HTML 初始不帶 hidden、四行、一句、按鈕、次要連結、邊界句、來源列；不寫 TOEFL
$passportSummaries = [regex]::Matches($indexText, '(?s)<aside class="clarifier-passport-summary" id="(considering|committed)-passport-462" aria-labelledby="\1-passport-462-title" data-passport-summary>.*?</aside>')
if ($passportSummaries.Count -ne 2) {
  Write-Output "FAIL [index.html] 462 摘要卡應恰好兩張且初始不帶 hidden；目前 $($passportSummaries.Count)"
  $errors++
}
foreach ($passportSummary in $passportSummaries) {
  foreach ($summaryNeedle in @(
    '中國大陸護照走 462，和台灣的 417 不同',
    '<li>每年 5,000 個首簽名額。</li>',
    '<li>首簽必須先在 ImmiAccount 登記抽籤（A$25，不退）並被抽中。</li>',
    '<li>需要高等教育學歷或完成 2 年大學本科，並具 Functional English。</li>',
    '<li>不需要政府支持信。</li>',
    '住宿、找工作、防詐等繁中主題頁中國護照同樣適用；只有簽證細節請看英文版。',
    'href="lang/en/visa/#choose">看英文版 417／462 分流與 462 重點</a>',
    'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/work-holiday-462/first-work-holiday-462',
    'https://immi.homeaffairs.gov.au/what-we-do/whm-program/latest-news/new-work-and-holiday-subclass-462-visa-pre-application-process',
    'https://immi.homeaffairs.gov.au/help-support/meeting-our-requirements/english-language/functional-english',
    'https://china.embassy.gov.au/bjng/WHV2026-27EN.html',
    'https://immi.homeaffairs.gov.au/what-we-do/whm-program/status-of-country-caps',
    'href="lang/zh-Hans/#official-title"',
    $clarifierBoundary,
    '來源：內政部 462 首簽頁（官方更新 2026-08-27）、抽籤頁（官方更新 2026-08-26）、名額頁（官方更新 2026-09-02）｜2026-09 查核'
  )) {
    if (-not $passportSummary.Value.Contains($summaryNeedle)) { Write-Output "FAIL [index.html] 462 摘要卡缺：$summaryNeedle"; $errors++ }
  }
  if ([regex]::Matches($passportSummary.Value, '<li>').Count -ne 4) { Write-Output 'FAIL [index.html] 462 摘要卡必須恰好四行'; $errors++ }
  if ($passportSummary.Value -match 'TOEFL|toefl') { Write-Output 'FAIL [index.html] 462 摘要卡不得寫 TOEFL 規則（官方頁互相矛盾）'; $errors++ }
}
if (-not $indexText.Contains('href="lang/en/visa/#choose"') -or -not $englishVisaIdText.Contains('id="choose"')) {
  Write-Output 'FAIL [index.html] 462 摘要卡按鈕錨點 lang/en/visa/#choose 不存在'
  $errors++
}
# P0-10 換字契約：階段 chips 4、需求 chips 30、出口標題 21 = 55 個 data-label-462；出口 3、11、12 含邊界句；462 文案為繁體字
if ([regex]::Matches($indexText, 'data-label-462="').Count -ne 55) {
  Write-Output "FAIL [index.html] data-label-462 應恰好 55 個（階段 4＋需求 30＋出口 21）；目前 $([regex]::Matches($indexText, 'data-label-462=`"').Count)"
  $errors++
}
if ($journeyDirectory.Success -and [regex]::Matches($journeyDirectory.Value, '<a href="#[a-z-]+" data-label-462="[^"]+"><span>0[1-4]</span>[^<]+</a>').Count -ne 4) {
  Write-Output 'FAIL [index.html] 四個階段 chips 都要有 data-label-462'
  $errors++
}
foreach ($stageLabel in @('還在考慮', '決定要去', '已在澳洲', '回程或留下')) {
  if (-not $journeyDirectory.Value.Contains("</span>$stageLabel</a>")) { Write-Output "FAIL [index.html] 階段 chip 台灣版文案缺：$stageLabel"; $errors++ }
}
# P0-8 收尾：四個面板 h2 的階段字面必須與階段 chip 台灣版文案一致（chip「回程或留下」對應 h2「回程或留下：…」）
$stagePanelLabels = @{ 'considering' = '還在考慮'; 'committed' = '決定要去'; 'in-australia' = '已在澳洲'; 'next-step' = '回程或留下' }
foreach ($stageId in $clarifierStages) {
  if (-not $indexText.Contains("<h2 id=`"$stageId-title`">$($stagePanelLabels[$stageId])：")) { Write-Output "FAIL [index.html] 面板 $stageId 的 h2 必須以階段 chip 文案「$($stagePanelLabels[$stageId])：」開頭"; $errors++ }
}
foreach ($stageLabel462 in @('還在糾結', '決定要去（等抽籤也算）', '已經到澳', '回程或留下')) {
  if (-not $journeyDirectory.Value.Contains("data-label-462=`"$stageLabel462`"")) { Write-Output "FAIL [index.html] 階段 chip 462 版文案缺：$stageLabel462"; $errors++ }
}
foreach ($boundaryExit in @('exit-considering-visa', 'exit-in-australia-work', 'exit-in-australia-visa')) {
  $boundaryBlock = [regex]::Match($indexText, "(?s)<div class=`"clarifier-exit(?: clarifier-exit-lite)?`" id=`"$boundaryExit`".*?<p class=`"clarifier-exit-safety`">")
  if (-not $boundaryBlock.Success -or -not $boundaryBlock.Value.Contains($clarifierBoundary)) {
    Write-Output "FAIL [index.html] 出口 $boundaryExit 卡片內文缺短版邊界句"
    $errors++
  }
}
$simplifiedChars = '签|货|进|机|资|们|这|么|个|证|发|时|间|对|该|会|从|还|开|关|应|办|区|钱|请|问|离|买|卖|车|见|说|职|则|难|马|来|经|听|习|学'
foreach ($label462 in [regex]::Matches($indexText, 'data-label-462="([^"]*)"')) {
  if ($label462.Groups[1].Value -match $simplifiedChars) {
    Write-Output "FAIL [index.html] data-label-462 必須以繁體字書寫（C-3）：$($label462.Groups[1].Value)"
    $errors++
  }
}
# P0-10 全站不得再出現「找人聊」，也不得出現個案判定句型（SDD §1.1 第 7 條）
foreach ($siteFile in (Get-ChildItem (Join-Path $dir '*.html')) + (Get-ChildItem (Join-Path $dir 'lang\*.html') -Recurse) + (Get-ChildItem (Join-Path $dir 'assets\*.js')) + (Get-ChildItem (Join-Path $dir 'assets\*.css'))) {
  $siteFileText = [System.IO.File]::ReadAllText($siteFile.FullName, [System.Text.Encoding]::UTF8)
  if ($siteFileText.Contains('找人聊')) { Write-Output "FAIL [$($siteFile.Name)] 「找人聊」已全站改為「看公開討論」（G5）"; $errors++ }
  if ($siteFileText -match '你符合(資格|條件|申請)|你可以申請|這份工作可以集簽|這工作可以集簽') {
    Write-Output "FAIL [$($siteFile.Name)] 不得出現個案判定句型（你符合／你可以申請／這份工作可以集簽）"
    $errors++
  }
}
foreach ($href462 in [regex]::Matches($indexText, 'data-href-462="([^"]+)"')) {
  $href462Value = $href462.Groups[1].Value
  if (-not $href462Value.StartsWith('lang/en/visa/')) {
    Write-Output "FAIL [index.html] 462 替代連結必須指向 lang/en/visa/：$href462Value"
    $errors++
    continue
  }
  $href462FragmentAt = $href462Value.IndexOf('#')
  if ($href462FragmentAt -ge 0) {
    $href462Fragment = $href462Value.Substring($href462FragmentAt + 1)
    if (-not $englishVisaIdText.Contains("id=`"$href462Fragment`"")) { Write-Output "FAIL [index.html] 462 替代連結錨點不存在於 lang/en/visa/：#$href462Fragment"; $errors++ }
  }
}
# 頁內錨點完整性：釐清器與 AI 兜底內每個 href="#…" 都要有對應 id
$clarifierStart = $indexText.IndexOf('<section class="home-zone-section clarifier" id="clarifier"')
$clarifierEnd = $indexText.IndexOf('<section class="site-search-home"')
$assistSection = [regex]::Match($indexText, '(?s)<section class="clarifier-assist" id="assist" aria-labelledby="assist-title" data-assist hidden>.*?</section>')
if ($clarifierStart -lt 0 -or $clarifierEnd -le $clarifierStart -or -not $assistSection.Success) {
  Write-Output 'FAIL [index.html] 釐清器或 AI 兜底區塊邊界缺失（#clarifier 必須在搜尋之前；#assist 必須預設 hidden）'
  $errors++
} else {
  $funnelText = $indexText.Substring($clarifierStart, $clarifierEnd - $clarifierStart) + $assistSection.Value
  foreach ($inPageAnchor in @([regex]::Matches($funnelText, '<a\b[^>]*href="#([^"]+)"') | ForEach-Object { $_.Groups[1].Value } | Select-Object -Unique)) {
    if (-not $indexText.Contains("id=`"$inPageAnchor`"")) { Write-Output "FAIL [index.html] 釐清器頁內錨點不存在：#$inPageAnchor"; $errors++ }
  }
}
if ([regex]::Matches($indexText, '<section class="clarifier-assist" id="assist" aria-labelledby="assist-title" data-assist hidden>').Count -ne 1) {
  Write-Output 'FAIL [index.html] AI 兜底區塊必須恰好一個且預設 hidden'
  $errors++
}
# 工作類型小測驗：題目在 main.js；HTML 只放容器與六大類靜態連結
foreach ($jobQuizNeedle in @('<section class="job-quiz" id="job-quiz"', 'id="job-quiz-title"', 'id="job-quiz-app" data-job-quiz hidden', 'id="job-families"', '只是入口，不是評估')) {
  if (-not $indexText.Contains($jobQuizNeedle)) { Write-Output "FAIL [index.html] 缺工作類型小測驗入口：$jobQuizNeedle"; $errors++ }
}
$jobFamilyIds = @('farm', 'hospitality', 'cleaning', 'factory', 'retail', 'office')
if ([regex]::Matches($indexText, 'data-job-family="').Count -ne $jobFamilyIds.Count) {
  Write-Output "FAIL [index.html] 六大職類必須恰好 $($jobFamilyIds.Count) 筆"
  $errors++
}
foreach ($jobFamily in $jobFamilyIds) {
  if (-not $indexText.Contains("<li data-job-family=`"$jobFamily`"><a href=`"work.html#")) { Write-Output "FAIL [index.html] 職類 $jobFamily 缺 work.html 錨點連結"; $errors++ }
}
# AI 兜底：未設定時只顯示固定句；打字框、揭露句與 Turnstile 全部預設 hidden
$assistOff = [regex]::Match($indexText, '<p class="clarifier-assist-off" id="assist-off" hidden>(.*?)</p>')
if (-not $assistOff.Success -or ([regex]::Replace($assistOff.Groups[1].Value, '<[^>]+>', '') -ne '站內 AI 兜底尚未啟用；可用上方搜尋，或到各地社團問人。')) {
  Write-Output 'FAIL [index.html] AI 兜底未啟用句必須預設 hidden 且文案固定'
  $errors++
}
foreach ($assistNeedle in @(
  '<div class="clarifier-assist-box" id="assist-box" hidden>',
  '<form class="clarifier-assist-form" id="assist-form" novalidate hidden>',
  'id="assist-disclosure"',
  '你的問題會送到第三方模型（MiniMax）產生回覆；本站伺服器不保存問題文字，但供應商可能依其條款處理。請不要輸入姓名、護照、帳號或他人資料。',
  '<textarea id="assist-input" rows="2" maxlength="200"',
  'id="assist-open"',
  'id="assist-turnstile" hidden',
  'id="assist-submit"',
  'id="assist-cancel"',
  'id="assist-status"',
  'id="assist-answer"',
  '不做簽證、法律、醫療、稅務判定'
)) {
  if (-not $indexText.Contains($assistNeedle)) { Write-Output "FAIL [index.html] AI 兜底區塊缺失或未預設隱藏：$assistNeedle"; $errors++ }
}
# 零打字：搜尋層之前不得出現任何打字框
$supportHubAt = $indexText.IndexOf('id="support-hub"')
$searchSectionAt = $indexText.IndexOf('id="search"')
if ($supportHubAt -lt 0 -or $searchSectionAt -le $supportHubAt) {
  Write-Output 'FAIL [index.html] 安全出口與搜尋層順序錯誤'
  $errors++
} else {
  $preSearchText = $indexText.Substring($supportHubAt, $searchSectionAt - $supportHubAt)
  if ($preSearchText.Contains('<input') -or $preSearchText.Contains('<textarea')) {
    Write-Output 'FAIL [index.html] 釐清器前三層不得出現打字框（input／textarea 只能在搜尋層之後）'
    $errors++
  }
}
foreach ($retiredHomeNeedle in @('aria-current="step"', 'aria-current="true"', 'class="route-guide"', 'class="direct-solution-grid"', 'id="self-assessment"', 'href="#self-assessment"', 'href="#common-problems"', 'id="problem-directory-title"', '上方 12 張問題卡或下方兩題引導', 'class="home-zone-nav"', 'class="trust-strip"', 'class="free-badge"', '<section class="support-hub"', 'id="principles"', 'hero-cut-green', 'hero-cut-accent')) {
  if ($indexText.Contains($retiredHomeNeedle)) { Write-Output "FAIL [index.html] 已退場的首頁區塊或執行期屬性不得留在靜態 HTML：$retiredHomeNeedle"; $errors++ }
}
# CLARIFIER_SPEC §3.2：每個既有區塊的去向錨點都必須存在
foreach ($clarifierDestination in @(
  'why.html#quick-quiz',
  'simulator.html',
  'housing.html#book',
  'housing.html#housing-search-tool',
  'work.html#channels',
  'work.html#seasons',
  'visa.html#apply',
  'visa.html#postcode-tool',
  'cost.html#save-calc',
  'cost.html#exchange',
  'cost.html#car',
  'health.html#doctor',
  'scam.html#help',
  'leave.html#leave-checklist-tool',
  'leave.html#dasp-calc',
  'market.html#market-tool',
  'pr.html#overview',
  'lang/en/visa/',
  '#job-quiz',
  '#communities',
  '#games'
)) {
  if (-not $indexText.Contains("href=`"$clarifierDestination`"")) { Write-Output "FAIL [index.html] CLARIFIER_SPEC §3.2 去向缺失：$clarifierDestination"; $errors++ }
}
$indexMainBlock = [regex]::Match($indexText, '(?s)<main\b.*?</main>')
if (-not $indexMainBlock.Success -or [regex]::Matches($indexMainBlock.Value, '<h2\b(?![^>]*\bid=")').Count -ne 0) {
  Write-Output 'FAIL [index.html] 首頁 main 內每個 h2 都必須有 id（站內搜尋索引依賴）'
  $errors++
}
# AI 兜底只會回 SITE_CATALOGUE 與 OFFICIAL_EXIT_LINKS 裡的 href，所以每個目標都必須真的存在。
# 頁面改版把某個區塊 id 改掉時，模型會把人送到空白處，而且不會有任何錯誤訊息。
$assistCatalogueSource = [System.IO.File]::ReadAllText((Join-Path $dir 'worker/src/assist.ts'), [System.Text.Encoding]::UTF8)
$catalogueTargets = New-Object System.Collections.Generic.HashSet[string]
foreach ($catalogueMatch in [regex]::Matches($assistCatalogueSource, 'href: "([^"]+)"')) {
  [void]$catalogueTargets.Add($catalogueMatch.Groups[1].Value)
}
$officialExitBlock = [regex]::Match($assistCatalogueSource, '(?s)OFFICIAL_EXIT_LINKS = \{.*?\} as const;')
if ($officialExitBlock.Success) {
  foreach ($exitMatch in [regex]::Matches($officialExitBlock.Value, '"([a-z0-9-]+\.html(?:#[A-Za-z0-9_-]+)?)"')) {
    [void]$catalogueTargets.Add($exitMatch.Groups[1].Value)
  }
}
if ($catalogueTargets.Count -lt 30) {
  Write-Output "FAIL [worker/src/assist.ts] AI 目錄目標只抓到 $($catalogueTargets.Count) 個，應為 30 個以上"
  $errors++
}
foreach ($catalogueTarget in $catalogueTargets) {
  $targetParts = $catalogueTarget -split '#', 2
  $targetPage = if ($targetParts[0]) { $targetParts[0] } else { 'index.html' }
  $targetPath = Join-Path $dir $targetPage
  if (-not (Test-Path $targetPath)) {
    Write-Output "FAIL [assist.ts] AI 目錄指向不存在的頁面：$catalogueTarget"
    $errors++
    continue
  }
  if ($targetParts.Count -eq 2 -and $targetParts[1]) {
    $targetText = [System.IO.File]::ReadAllText($targetPath, [System.Text.Encoding]::UTF8)
    if (-not $targetText.Contains("id=`"$($targetParts[1])`"")) {
      Write-Output "FAIL [assist.ts] AI 目錄指向不存在的錨點：$catalogueTarget"
      $errors++
    }
  }
}

# 全域 AI 入口：首頁把助理寫在漏斗裡，其餘頁面由 main.js 注入同一份標記到 dialog。
# 注入版裡的站內連結必須是 index.html#... 的形式——寫成裸錨點在非首頁會指到不存在的位置。
# 這裡刻意用字串比對而非正規表達式，避免跨行樣式在維護時被改壞。
$assistInjectedStart = $mainJs.IndexOf('assistDialog = assistEl("dialog"')
$assistInjectedStop = $mainJs.IndexOf('document.body.appendChild(assistDialog)')
if ($assistInjectedStart -lt 0 -or $assistInjectedStop -le $assistInjectedStart) {
  Write-Output 'FAIL [main.js] 找不到全域 AI 兜底的注入區塊'
  $errors++
} else {
  $assistInjectedText = $mainJs.Substring($assistInjectedStart, $assistInjectedStop - $assistInjectedStart)
  foreach ($assistInjectedId in @('id: "assist"', '"data-assist"', '"assist-off"', 'id: "assist-box"', 'id: "assist-open"', 'id: "assist-form"', 'id: "assist-input"', 'id: "assist-turnstile"', 'id: "assist-submit"', 'id: "assist-cancel"', 'id: "assist-status"', 'id: "assist-answer"', 'id: "assist-dialog-close"')) {
    if (-not $assistInjectedText.Contains($assistInjectedId)) {
      Write-Output "FAIL [main.js] 注入版 AI 兜底缺元素，與首頁內嵌版不一致：$assistInjectedId"
      $errors++
    }
  }
  foreach ($assistInjectedHref in @('"index.html#communities"', '"index.html#support-hub"')) {
    if (-not $assistInjectedText.Contains($assistInjectedHref)) {
      Write-Output "FAIL [main.js] 注入版 AI 兜底的站內連結必須帶 index.html：$assistInjectedHref"
      $errors++
    }
  }
  # 注入區塊不得改用 HTML 字串：那會繞過釐清器「不寫入 HTML 字串」的既有規則。
  foreach ($assistInjectedForbidden in @('innerHTML', 'insertAdjacentHTML', 'outerHTML')) {
    if ($assistInjectedText.Contains($assistInjectedForbidden)) {
      Write-Output "FAIL [main.js] 注入版 AI 兜底必須用 DOM API 建構，不得用：$assistInjectedForbidden"
      $errors++
    }
  }
}
# 導覽列的 AI 入口只有在 AI 真的啟用時才建立，且排在搜尋鈕之後（AI 是兜底，不是主要動作）。
$assistNavStart = $mainJs.IndexOf('if (navInner && assistSettings())')
if ($assistNavStart -lt 0) {
  Write-Output 'FAIL [main.js] 導覽列 AI 入口必須以 assistSettings() 為條件，未啟用時不得出現'
  $errors++
} else {
  $assistNavText = $mainJs.Substring($assistNavStart, [Math]::Min(2600, $mainJs.Length - $assistNavStart))
  foreach ($assistNavNeedle in @('assist-nav-open', 'navInner.querySelector(".site-search-open")', 'assistDialog.showModal()')) {
    if (-not $assistNavText.Contains($assistNavNeedle)) {
      Write-Output "FAIL [main.js] 導覽列 AI 入口缺必要行為：$assistNavNeedle"
      $errors++
    }
  }
}

# 敏感題攔截：客戶端（送出前）與伺服端（fail closed）必須是同一組樣式。
# 客戶端漏接時伺服端雖然仍會擋下模型，但問題文字已經離開瀏覽器，about.html 的揭露就不成立。
$assistTsPath = Join-Path $dir 'worker/src/assist.ts'
if (-not (Test-Path $assistTsPath)) {
  Write-Output 'FAIL 缺 worker/src/assist.ts'
  $errors++
} else {
  $assistTs = [System.IO.File]::ReadAllText($assistTsPath, [System.Text.Encoding]::UTF8)
  $sensitiveGroups = [regex]::Matches($assistTs, '(?s)const (SENSITIVE_[A-Z_]+) =(.*?);?
')
  if ($sensitiveGroups.Count -lt 10) {
    Write-Output "FAIL [worker/src/assist.ts] 敏感題分組樣式只有 $($sensitiveGroups.Count) 組，應為 12 組以上"
    $errors++
  }
  foreach ($sensitiveGroup in $sensitiveGroups) {
    $groupName = $sensitiveGroup.Groups[1].Value
    foreach ($groupLiteral in [regex]::Matches($sensitiveGroup.Groups[2].Value, '"([^"]*)"')) {
      if (-not $mainJs.Contains($groupLiteral.Groups[1].Value)) {
        Write-Output "FAIL [assets/main.js] 敏感題樣式未與 assist.ts 同步：$groupName"
        $errors++
      }
    }
  }
  if (-not $mainJs.Contains('var ASSIST_SENSITIVE = new RegExp(')) {
    Write-Output 'FAIL [assets/main.js] 客戶端敏感題樣式必須由同一組具名字串組出，不得寫成單一字面值'
    $errors++
  }
  # 000 只在不與其他數字相連時才算緊急電話，否則「準備 30000 台幣」會誤觸急難文案。
  foreach ($emergencyGuard in @('(?:^|[^0-9])000(?:[^0-9]|$)')) {
    if (-not $mainJs.Contains($emergencyGuard) -or -not $assistTs.Contains($emergencyGuard)) {
      Write-Output 'FAIL 緊急電話 000 必須加數字邊界，兩端都要有'
      $errors++
    }
  }
}

# main.js 釐清器：hash 驅動、零儲存；AI 兜底只有一個 fetch，且雙設定齊全才啟用
$clarifierScript = [regex]::Match($mainJs, '(?s)// ---------- 首頁釐清器.*?// ---------- D\+ 匿名彙總量測')
if (-not $clarifierScript.Success -or -not $clarifierScript.Value.Contains('// ---------- 站內 AI 兜底')) {
  Write-Output 'FAIL [main.js] 缺首頁釐清器／AI 兜底功能塊或標記順序錯誤'
  $errors++
} else {
  foreach ($clarifierScriptNeedle in @(
    '"/api/assist"',
    'turnstileToken',
    'credentials: "omit"',
    'referrerPolicy: "no-referrer"',
    'getPublicApiBaseUrl()',
    'turnstileSiteKey',
    'turnstile-spin-v2',
    'ASSIST_SAME_SITE',
    'ASSIST_SENSITIVE',
    'over_cap',
    'resultCount === 0',
    'hashchange',
    'JOB_QUIZ',
    'JOB_FAMILY_ORDER',
    'aria-checked',
    'data-passport-summary',
    'assist-dialog',
    'assist-nav-open',
    'if (!document.querySelector("[data-assist]"))',
    'data-label-462',
    'data-label-default',
    '"ArrowRight"',
    'card.hidden = value !== "462"'
  )) {
    if (-not $clarifierScript.Value.Contains($clarifierScriptNeedle)) { Write-Output "FAIL [main.js] 釐清器或 AI 兜底缺安全界線：$clarifierScriptNeedle"; $errors++ }
  }
  if ([regex]::Matches($clarifierScript.Value, [regex]::Escape('"/api/assist"')).Count -ne 1 -or [regex]::Matches($clarifierScript.Value, 'fetch\(').Count -ne 1) {
    Write-Output 'FAIL [main.js] AI 兜底只能有一個 fetch 與一個 /api/assist 路由'
    $errors++
  }
  # P0-9 實作 5：零結果只揭露「問一次 AI」按鈕，不自動 openAssist、不移焦點、不載入 Turnstile
  $assistSearchListener = [regex]::Match($clarifierScript.Value, '(?s)window\.addEventListener\("whv:search", function \(event\) \{.*?\}\);')
  if (-not $assistSearchListener.Success -or $assistSearchListener.Value.Contains('openAssist(') -or $assistSearchListener.Value.Contains('renderTurnstile(') -or $assistSearchListener.Value.Contains('.focus(') -or -not $assistSearchListener.Value.Contains('getElementById("site-search-ai")') -or -not $assistSearchListener.Value.Contains('searchAiSlot.hidden = false')) {
    Write-Output 'FAIL [main.js] whv:search 零結果監聽只能揭露 #site-search-ai 按鈕，不得自動開啟 AI、移焦點或載入 Turnstile'
    $errors++
  }
  if ([regex]::Matches($clarifierScript.Value, '\bq:').Count -ne 6) {
    Write-Output 'FAIL [main.js] 工作類型小測驗必須恰好 6 題'
    $errors++
  }
  foreach ($clarifierForbidden in @('localStorage', 'sessionStorage', 'innerHTML', 'insertAdjacentHTML', 'document.write', 'document.cookie', 'location.hash =', 'history.', 'scrollIntoView', 'navigator.userAgent', 'XMLHttpRequest')) {
    if ($clarifierScript.Value.Contains($clarifierForbidden)) { Write-Output "FAIL [main.js] 釐清器不得保存狀態、寫入 HTML 字串或改寫網址：$clarifierForbidden"; $errors++ }
  }
}
foreach ($clarifierStyleNeedle in @('.clarifier-panel[hidden]', '.clarifier-exit[hidden]', '.clarifier-passport[hidden]', '.clarifier-passport-summary[hidden]', '.clarifier-chips .chip[aria-checked="true"]', '.job-quiz[hidden]', '.clarifier-assist[hidden]', '.clarifier-assist-box[hidden]')) {
  if (-not $styleText.Contains($clarifierStyleNeedle)) { Write-Output "FAIL [style.css] 釐清器 hidden 後援缺失：$clarifierStyleNeedle"; $errors++ }
}
$reducedMotionBlock = [regex]::Match($styleText, '(?s)@media \(prefers-reduced-motion: reduce\) \{.*?\n\}')
if (-not $reducedMotionBlock.Success -or -not $reducedMotionBlock.Value.Contains('.clarifier-chips .chip') -or -not $reducedMotionBlock.Value.Contains('.safety-bar a, .home-entry-card, .clarifier-search-jump .btn { transition: none; transform: none; }')) {
  Write-Output 'FAIL [style.css] 釐清器 chips、安全列、入口卡或固定搜尋鈕未納入 prefers-reduced-motion'
  $errors++
}
$printBlock = [regex]::Match($styleText, '(?s)@media print \{.*?\n\}')
if (-not $printBlock.Success -or -not $printBlock.Value.Contains('.clarifier-assist')) {
  Write-Output 'FAIL [style.css] AI 兜底未納入列印隱藏'
  $errors++
}
$homeRouteOrder = @(
  'class="safety-bar"',
  'class="hero hero-compact"',
  'id="clarifier"',
  'id="journey-map"',
  'id="considering"',
  'id="committed"',
  'id="in-australia"',
  'id="next-step"',
  'id="job-quiz"',
  'id="clarifier-search-open"',
  'class="site-search-home"',
  'id="assist"',
  'class="home-entry-cards"',
  'id="communities"',
  'id="journey-resume"',
  'id="saved-pages"',
  'id="games"',
  'class="site-footer"',
  'class="foot-promise"',
  'id="source-model-title"',
  'class="foot-principles"',
  'class="disclaimer"'
)
$previousHomeRouteIndex = -1
foreach ($homeRouteNeedle in $homeRouteOrder) {
  $homeRouteIndex = $indexText.IndexOf($homeRouteNeedle)
  if ($homeRouteIndex -lt 0 -or $homeRouteIndex -le $previousHomeRouteIndex) {
    Write-Output "FAIL [index.html] 首頁分流順序錯誤或缺少：$homeRouteNeedle"
    $errors++
  }
  $previousHomeRouteIndex = $homeRouteIndex
}
foreach ($formName in @('report.yml', 'idea.yml', 'thanks.yml', 'collaborate.yml')) {
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
$collabFormPath = Join-Path $dir '.github\ISSUE_TEMPLATE\collaborate.yml'
$collabFormText = ''
if (Test-Path $collabFormPath) {
  $collabFormText = [System.IO.File]::ReadAllText($collabFormPath, [System.Text.Encoding]::UTF8)
  foreach ($collabNeedle in @('id: problem', 'id: outcome', 'id: privacy', 'id: boundary', '不代表已接受委託')) {
    if (-not $collabFormText.Contains($collabNeedle)) { Write-Output "FAIL [collaborate.yml] 缺合作需求安全欄位：$collabNeedle"; $errors++ }
  }
  foreach ($requiredId in @('privacy', 'boundary')) {
    if ($collabFormText -notmatch "(?s)id: $requiredId.*?required: true") {
      Write-Output "FAIL [collaborate.yml] $requiredId 確認未設為必填"
      $errors++
    }
  }
  if ($collabFormText.Contains('type: upload')) { Write-Output 'FAIL [collaborate.yml] 不得提供檔案上傳欄位'; $errors++ }
}
foreach ($collabNeedle in @('id="collaborate"', 'template=collaborate.yml', '提出需求不代表我已接受委託')) {
  $aboutText = [System.IO.File]::ReadAllText((Join-Path $dir 'about.html'), [System.Text.Encoding]::UTF8)
  if (-not $aboutText.Contains($collabNeedle)) { Write-Output "FAIL [about.html] 缺合作入口或邊界：$collabNeedle"; $errors++ }
}
$aboutText = [System.IO.File]::ReadAllText((Join-Path $dir 'about.html'), [System.Text.Encoding]::UTF8)
foreach ($privateId in @('private-contact', 'private-email-direct', 'contact-brief', 'brief-email', 'brief-type', 'brief-name', 'brief-organization', 'brief-timing', 'brief-budget', 'brief-problem', 'brief-outcome', 'brief-boundary', 'brief-status', 'brief-output', 'brief-preview', 'brief-gmail-link', 'brief-email-link', 'brief-copy', 'brief-submit-online', 'brief-turnstile', 'contact-receipt', 'contact-receipt-id', 'contact-receipt-time', 'contact-receipt-email', 'contact-manage-link', 'contact-management', 'contact-manage-case', 'contact-manage-token', 'manage-turnstile', 'contact-manage-view', 'contact-manage-update', 'contact-manage-delete', 'contact-manage-status')) {
  if (-not $aboutText.Contains("id=`"$privateId`"")) { Write-Output "FAIL [about.html] 缺私人合作需求單元件：$privateId"; $errors++ }
}
foreach ($privateNeedle in @(
  'mailto:chunaenqiu6@gmail.com',
  'https://mail.google.com/mail/?view=cm&amp;fs=1&amp;to=chunaenqiu6%40gmail.com',
  '內容不會送到本站或儲存',
  '最後仍由你確認並寄出',
  '是否承接、工作範圍、費用與交付都要另行確認',
  '不要填入護照、簽證文件、健康／醫療、銀行／卡號、帳密、第三人個資或未公開客戶資料',
  '通常 3–5 個工作天回覆，但不代表已接受委託或契約成立',
  '一般詢問於結案或最後聯絡後 24 個月刪除',
  '管理憑證只放在管理連結的 <code>#</code> 片段',
  '頁面讀取後會立刻從網址移除',
  'aria-describedby="brief-privacy"',
  'id="private-email-boundary"',
  'aria-describedby="private-email-boundary"'
)) {
  if (-not $aboutText.Contains($privateNeedle)) { Write-Output "FAIL [about.html] 缺私人 Email 或資料邊界：$privateNeedle"; $errors++ }
}
foreach ($businessNeedle in @(
  '公開攻略免費',
  'id="editorial-method"',
  '澳打指南針不是個人遊記，也不把未親歷的內容寫成親身經驗',
  '1. 官方依據',
  '2. 本站編輯整理',
  '3. 社群第一手回報',
  '查不到來源就標「待查證」',
  '工作範圍、時程、費用、交付方式與取消條件',
  '本站不提供任何形式的簽證或移民代辦',
  '不論是否收費都一樣',
  '目前先提供 OMARA 官方名冊',
  '目前沒有指定合作代理，也沒有啟用佣金轉介',
  '若未來與特定專業人士建立商業轉介關係',
  '是否收取轉介費會先完成法律與稅務確認，確認前不啟用',
  '未經你明確同意，不會把你的聯絡方式或個案內容交給任何人',
  '你仍直接與該專業人士簽約、付款並自行決定是否採用',
  'https://immi.homeaffairs.gov.au/help-support/who-can-help-with-your-application/overview',
  'https://portal.mara.gov.au/search-the-register-of-migration-agents/',
  '2026-08-30 查核'
)) {
  if (-not $aboutText.Contains($businessNeedle)) { Write-Output "FAIL [about.html] 缺免費／付費合作或受管制服務邊界：$businessNeedle"; $errors++ }
}
foreach ($businessOption in @('客製課程、講座或工作坊', '網站與數位工具', '內容、資料或社群合作')) {
  if (-not $aboutText.Contains("<option value=`"$businessOption`">$businessOption</option>")) {
    Write-Output "FAIL [about.html] 私人需求單缺合作類型：$businessOption"
    $errors++
  }
  if (-not $collabFormText.Contains("- $businessOption")) {
    Write-Output "FAIL [collaborate.yml] 公開需求單缺合作類型：$businessOption"
    $errors++
  }
}

# 商業合作與第三方入口必須公開分級、關係、排序與爭議處理，LINE 邀請只留在首頁生活交流區。
foreach ($governanceNeedle in @(
  'id="recommendation-policy"',
  '錢不能買到第一推薦，也不能改寫風險',
  '沒有付費版位、聯盟連結或佣金轉介',
  '一般商業服務與平台',
  '受監管或高風險服務',
  '法定名稱或營運者',
  '費用／佣金',
  'rel="sponsored nofollow"',
  '一般服務爭議先標示「複查中」並暫停推薦位置',
  '涉及人身安全、疑似詐騙、資格失效或官方處分時，先下架外部入口',
  'third-party-register.json?v=',
  'template=report.yml'
)) {
  if (-not $aboutText.Contains($governanceNeedle)) { Write-Output "FAIL [about.html] 缺商業／第三方治理規則：$governanceNeedle"; $errors++ }
}
$lineInvitePattern = 'https://line\.me/ti/g2/JKYRJbgvE3vz4oXBazHqRhm67iWO5g3NI7Z0Wg'
$lineInviteLocations = @()
foreach ($rootPage in $pages + '404.html') {
  $rootText = [System.IO.File]::ReadAllText((Join-Path $dir $rootPage), [System.Text.Encoding]::UTF8)
  if ($rootText -match $lineInvitePattern) { $lineInviteLocations += $rootPage }
}
if ($lineInviteLocations.Count -ne 1 -or $lineInviteLocations[0] -ne 'index.html') {
  Write-Output "FAIL LINE 邀請只能出現在首頁生活交流區；目前：$(($lineInviteLocations) -join ', ')"
  $errors++
}
# ---- 社團目錄（P1-21）：community-directory.json 是單一事實來源，communities.html 是手寫鏡像 ----
$directoryPath = Join-Path $dir 'community-directory.json'
$directoryHtmlPath = Join-Path $dir 'communities.html'
if (-not (Test-Path $directoryPath) -or -not (Test-Path $directoryHtmlPath)) {
  Write-Output 'FAIL 缺 community-directory.json 或 communities.html'
  $errors++
} else {
  $directory = Get-Content -Raw -Encoding UTF8 $directoryPath | ConvertFrom-Json
  $directoryRegister = Get-Content -Raw -Encoding UTF8 (Join-Path $dir 'third-party-register.json') | ConvertFrom-Json
  $directoryHtml = [System.IO.File]::ReadAllText($directoryHtmlPath, [System.Text.Encoding]::UTF8)
  $directoryToday = Get-Date
  $allowedTypes = @{
    'general' = @('direct-link', 'directory-page', 'platform-search', 'explain-only')
    'transactional' = @('directory-page', 'platform-search', 'explain-only')
    'high-risk-intermediary' = @('platform-search', 'explain-only')
  }
  $registerIds = @($directoryRegister.entries | ForEach-Object { $_.id })
  $lineLinkCount = 0
  foreach ($entry in $directory.entries) {
    # 1. 需求值域，且不得出現禁用需求（緊急、心理、簽證個案、詐騙受害等一律不導向社群）
    foreach ($entryNeed in $entry.needs) {
      if ($directory.needs -notcontains $entryNeed) {
        Write-Output "FAIL [community-directory.json] $($entry.id) 的需求值不在值域：$entryNeed"
        $errors++
      }
      if ($directory.forbiddenNeeds -contains $entryNeed) {
        Write-Output "FAIL [community-directory.json] $($entry.id) 使用了禁用需求值：$entryNeed"
        $errors++
      }
    }
    # 2. entryType 與 riskClass 的相容矩陣：高風險永遠不得直連
    if ($allowedTypes[$entry.riskClass] -notcontains $entry.entryType) {
      Write-Output "FAIL [community-directory.json] $($entry.id) 的 $($entry.riskClass) 不允許 entryType=$($entry.entryType)"
      $errors++
    }
    # 3. 直連必須在第三方關係登錄表裡有對應
    if ($entry.entryType -eq 'direct-link' -and $registerIds -notcontains $entry.registerId) {
      Write-Output "FAIL [community-directory.json] $($entry.id) 是直連，但 registerId 不在 third-party-register.json：$($entry.registerId)"
      $errors++
    }
    # 4. 逾期的直連不得繼續在頁面上給出入口
    if ($entry.entryType -eq 'direct-link' -and [datetime]::Parse($entry.expiresAt) -lt $directoryToday) {
      if ($directoryHtml.Contains($entry.entryUrl)) {
        Write-Output "FAIL [communities.html] $($entry.id) 查核已於 $($entry.expiresAt) 逾期，頁面不得再出現 entryUrl；請改為平台搜尋轉接"
        $errors++
      }
    }
    # 5. 風險提示下限：每筆至少兩句，且句子必須在 riskNoteText 裡有定義
    if ($entry.riskNotes.Count -lt 2) {
      Write-Output "FAIL [community-directory.json] $($entry.id) 的 riskNotes 少於 2 句"
      $errors++
    }
    foreach ($noteId in $entry.riskNotes) {
      if (-not $directory.riskNoteText.PSObject.Properties.Name.Contains($noteId)) {
        Write-Output "FAIL [community-directory.json] $($entry.id) 引用了沒有文字的風險提示：$noteId"
        $errors++
      }
    }
    # 6. JSON 與 HTML 必須同步：id、entryType、到期日、入口網址
    if (-not $directoryHtml.Contains('id="' + $entry.id + '"')) {
      Write-Output "FAIL [communities.html] 缺少 JSON 裡的登錄：$($entry.id)"
      $errors++
    }
    if (-not $directoryHtml.Contains('data-community-type="' + $entry.entryType + '"')) {
      Write-Output "FAIL [communities.html] 缺少 entryType 標記：$($entry.entryType)"
      $errors++
    }
    if (-not $directoryHtml.Contains($entry.expiresAt)) {
      Write-Output "FAIL [communities.html] $($entry.id) 的到期日未顯示在頁面上：$($entry.expiresAt)"
      $errors++
    }
    if ($entry.entryUrl -and -not $directoryHtml.Replace('&amp;', '&').Contains($entry.entryUrl)) {
      Write-Output "FAIL [communities.html] $($entry.id) 的入口網址與 JSON 不一致"
      $errors++
    }
    if ($entry.entryUrl -and $entry.entryUrl.Contains('line.me/ti/')) { $lineLinkCount++ }
    # 7. 每張卡都要有邊界句
    if (-not $directoryHtml.Contains('不是本站客服・不是緊急支援・不是專業轉介')) {
      Write-Output 'FAIL [communities.html] 卡片缺少「不是本站客服・不是緊急支援・不是專業轉介」邊界句'
      $errors++
    }
  }
  # LINE 邀請連結全站唯一（既有規則，這裡確認目錄沒有再增加）
  if ($lineLinkCount -gt 1) {
    Write-Output "FAIL [community-directory.json] LINE 邀請連結只能有一筆，目前 $lineLinkCount 筆"
    $errors++
  }
  # 高風險需求在頁面上永遠不得出現直連卡
  foreach ($highRiskNeed in @('job', 'housing', 'farm-visa-intel')) {
    foreach ($entry in $directory.entries) {
      if ($entry.needs -contains $highRiskNeed -and $entry.entryType -eq 'direct-link') {
        Write-Output "FAIL [community-directory.json] 高風險需求 $highRiskNeed 不得有直連：$($entry.id)"
        $errors++
      }
    }
  }
  # 頁面固定聲明
  foreach ($directoryNeedle in @(
    '高風險需求只提供平台搜尋轉接',
    '本站不經營、不管理、不背書任何社群',
    'id="community-grid"',
    'id="community-filter-status"',
    'community.yml',
    '沒有 JavaScript 時下方會列出全部入口'
  )) {
    if (-not $directoryHtml.Contains($directoryNeedle)) {
      Write-Output "FAIL [communities.html] 缺固定聲明或元件：$directoryNeedle"
      $errors++
    }
  }
  # Facebook 的搜尋轉接一定要標明需先登入（未登入會顯示找不到頁面）
  if ($directoryHtml.Contains('facebook.com/search/groups') -and -not $directoryHtml.Contains('Facebook 的社團搜尋需要先登入')) {
    Write-Output 'FAIL [communities.html] Facebook 搜尋轉接必須標明需先登入'
    $errors++
  }
  # 回報表單只收公開入口
  $communityTemplatePath = Join-Path $dir '.github/ISSUE_TEMPLATE/community.yml'
  if (-not (Test-Path $communityTemplatePath)) {
    Write-Output 'FAIL 缺 .github/ISSUE_TEMPLATE/community.yml'
    $errors++
  } else {
    $communityTemplate = Get-Content -Raw -Encoding UTF8 $communityTemplatePath
    foreach ($templateNeedle in @('只收', '邀請連結', '微信', '截圖')) {
      if (-not $communityTemplate.Contains($templateNeedle)) {
        Write-Output "FAIL [.github/ISSUE_TEMPLATE/community.yml] 缺公開入口界線說明：$templateNeedle"
        $errors++
      }
    }
  }
}

foreach ($communityNeedle in @('id="perth-community"', '群組非本站營運', '也不是工作、租屋、交易、緊急支援', '簽證、法律、醫療等專業轉介管道', '無付費、無佣金，本站不管理群組')) {
  if (-not $indexText.Contains($communityNeedle)) { Write-Output "FAIL [index.html] LINE 第三方生活社群缺邊界：$communityNeedle"; $errors++ }
}
$workText = [System.IO.File]::ReadAllText((Join-Path $dir 'work.html'), [System.Text.Encoding]::UTF8)
foreach ($workCommunityNeedle in @('第三方 Perth 生活社群入口只放在首頁的一般生活交流區', '不列為求職來源')) {
  if (-not $workText.Contains($workCommunityNeedle)) { Write-Output "FAIL [work.html] 缺生活社群非求職入口邊界：$workCommunityNeedle"; $errors++ }
}
foreach ($seasonGuideNeedle in @('四季可能職缺與抵達時機', '沒有全澳通用的最好／最差月份', '10–11 月開始看職缺與投遞', '6 月才無 offer、無住宿直接到雪鎮，風險較高', 'NT 來源只是果品供應月份', '可能遇到的困境', 'BOM 各地火災天氣季節')) {
  if (-not ($workText + "`n" + $toolsJs).Contains($seasonGuideNeedle)) { Write-Output "FAIL [work season guide] 缺季節職類、抵達判斷或 NT 證據邊界：$seasonGuideNeedle"; $errors++ }
}
$seasonDataText = [System.IO.File]::ReadAllText((Join-Path $dir 'assets\seasons.js'), [System.Text.Encoding]::UTF8)
foreach ($seasonDataNeedle in @('evidenceType: "harvest-jobs"', 'evidenceType: "produce-availability"')) {
  if (-not $seasonDataText.Contains($seasonDataNeedle)) { Write-Output "FAIL [seasons.js] 缺來源類型邊界：$seasonDataNeedle"; $errors++ }
}

$thirdPartyRegisterPath = Join-Path $dir 'third-party-register.json'
if (-not (Test-Path $thirdPartyRegisterPath)) {
  Write-Output 'FAIL 缺 third-party-register.json'
  $errors++
} else {
  try {
    $thirdPartyRegister = [System.IO.File]::ReadAllText($thirdPartyRegisterPath, [System.Text.Encoding]::UTF8) | ConvertFrom-Json
    if ($thirdPartyRegister.schemaVersion -ne 1 -or $thirdPartyRegister.generatedAt -ne '2026-09-04') {
      Write-Output 'FAIL [third-party-register.json] schemaVersion／generatedAt 錯誤'; $errors++
    }
    foreach ($inactiveField in @('paidPlacementActive', 'affiliateLinksActive', 'commercialReferralActive', 'sponsoredRankingAllowed')) {
      if ($thirdPartyRegister.currentState.$inactiveField -ne $false) { Write-Output "FAIL [third-party-register.json] P1-11 現況不得冒充已啟用：$inactiveField"; $errors++ }
    }
    $registerIds = @($directoryRegister.entries | ForEach-Object { $_.id })
    foreach ($requiredRegisterId in @('perth-line-community', 'public-local-reddit-communities', 'second-hand-marketplace-navigation', 'commercial-navigation-platforms', 'omara-official-register')) {
      if ($registerIds -notcontains $requiredRegisterId) { Write-Output "FAIL [third-party-register.json] 缺現行第三方關係：$requiredRegisterId"; $errors++ }
    }
    $publicLocalCommunities = @($thirdPartyRegister.entries | Where-Object { $_.id -eq 'public-local-reddit-communities' })[0]
    if ($publicLocalCommunities.relationship -ne 'none' -or $publicLocalCommunities.compensation -ne 'none' -or $publicLocalCommunities.workingHolidaySpecific -ne $false -or @($publicLocalCommunities.destinations).Count -ne 8) {
      Write-Output 'FAIL [third-party-register.json] 公開在地社群的非合作／非 WHV 邊界未同步'
      $errors++
    }
    $secondHandNavigation = @($thirdPartyRegister.entries | Where-Object { $_.id -eq 'second-hand-marketplace-navigation' })[0]
    if ($secondHandNavigation.relationship -ne 'none' -or $secondHandNavigation.compensation -ne 'none' -or $secondHandNavigation.siteHostedListings -ne $false -or $secondHandNavigation.sitePaymentOrEscrow -ne $false -or $secondHandNavigation.combinedRanking -ne $false -or @($secondHandNavigation.destinations).Count -ne 3) {
      Write-Output 'FAIL [third-party-register.json] 二手交換平台的外部入口／無收款／無排名邊界未同步'
      $errors++
    }
    $commercialNavigation = @($thirdPartyRegister.entries | Where-Object { $_.id -eq 'commercial-navigation-platforms' })[0]
    if ($commercialNavigation.onSiteListingDisplayActive -ne $false -or $commercialNavigation.aggregationMode -ne 'licensed-api-only-plus-external-links' -or $commercialNavigation.marketCoverageClaim -ne 'none' -or $commercialNavigation.combinedRanking -ne $false -or @($commercialNavigation.platformAccess).Count -ne 5) {
      Write-Output 'FAIL [third-party-register.json] 住宿平台授權、覆蓋或排序邊界未同步'; $errors++
    }
    $omaraRegister = @($thirdPartyRegister.entries | Where-Object { $_.id -eq 'omara-official-register' })[0]
    if ($omaraRegister.destinationHost -ne 'portal.mara.gov.au' -or $omaraRegister.destinationUrl -ne 'https://portal.mara.gov.au/search-the-register-of-migration-agents/' -or $omaraRegister.checkedAt -ne '2026-08-30') {
      Write-Output 'FAIL [third-party-register.json] OMARA 名冊入口或查核日期未同步目前有效官方網址'; $errors++
    }
    if (@($thirdPartyRegister.requiredReviewFields).Count -ne 7) { Write-Output 'FAIL [third-party-register.json] 上架前公開欄位數量錯誤'; $errors++ }
    if ($null -eq $thirdPartyRegister.correctionLog -or $thirdPartyRegister.correctionPolicy.changeHistoryRetained -ne $true) {
      Write-Output 'FAIL [third-party-register.json] 缺更正紀錄機制'; $errors++
    }
  } catch {
    Write-Output "FAIL [third-party-register.json] 不是有效 JSON：$($_.Exception.Message)"
    $errors++
  }
}
$thirdPartyLinkVersions = @([regex]::Matches($aboutText + $indexText, 'third-party-register\.json\?v=([0-9-]+)') | ForEach-Object { $_.Groups[1].Value } | Select-Object -Unique)
if ($thirdPartyLinkVersions.Count -ne 1 -or $uniqueAssetVersions.Count -ne 1 -or $thirdPartyLinkVersions[0] -ne $uniqueAssetVersions[0]) {
  Write-Output "FAIL 第三方登錄表版本必須與全站資產一致：$(($thirdPartyLinkVersions) -join ', ')"
  $errors++
}
$llmsText = [System.IO.File]::ReadAllText((Join-Path $dir 'llms.txt'), [System.Text.Encoding]::UTF8)
$crawlerPolicyText = [System.IO.File]::ReadAllText((Join-Path $dir 'crawler-policy.txt'), [System.Text.Encoding]::UTF8)
if (-not $llmsText.Contains('/third-party-register.json') -or -not $crawlerPolicyText.Contains('third-party-register.json')) {
  Write-Output 'FAIL llms.txt／crawler-policy.txt 未公開第三方關係登錄表'
  $errors++
}
foreach ($forbiddenServiceOption in @('一般行政', '資訊指路', '簽證', '移民', '代辦')) {
  $briefTypeBlock = [regex]::Match($aboutText, '(?s)<select id="brief-type".*?</select>')
  if (-not $briefTypeBlock.Success -or $briefTypeBlock.Value.Contains($forbiddenServiceOption)) {
    Write-Output "FAIL [about.html] 私人需求類型不得招攬可能誤解為代辦的服務：$forbiddenServiceOption"
    $errors++
  }
  $collabOptionsBlock = [regex]::Match($collabFormText, '(?s)label: 你想談哪一類？.*?validations:')
  if (-not $collabOptionsBlock.Success -or $collabOptionsBlock.Value.Contains($forbiddenServiceOption)) {
    Write-Output "FAIL [collaborate.yml] 公開合作類型不得招攬可能誤解為代辦的服務：$forbiddenServiceOption"
    $errors++
  }
}
foreach ($forbiddenPromisePattern in @('不賣課', '不接代辦業配', '唯一(?:的)?收入來源', '只(?:能|接受).{0,8}贊助', '整站.{0,4}永久免費')) {
  foreach ($promiseFile in @('index.html', 'about.html', 'README.md', 'docs\SDD.md', 'docs\SPEC.md')) {
    $promiseText = [System.IO.File]::ReadAllText((Join-Path $dir $promiseFile), [System.Text.Encoding]::UTF8)
    if ($promiseText -match $forbiddenPromisePattern) {
      Write-Output "FAIL [$promiseFile] 仍含已撤回的絕對商業承諾：$forbiddenPromisePattern"
      $errors++
    }
  }
}
foreach ($rootPage in $pages + '404.html') {
  $rootPageText = [System.IO.File]::ReadAllText((Join-Path $dir $rootPage), [System.Text.Encoding]::UTF8)
  if (-not $rootPageText.Contains('澳打指南針 — 公開攻略免費・開源維護・')) {
    Write-Output "FAIL [$rootPage] 頁尾未同步公開內容免費定位"
    $errors++
  }
  if (-not $rootPageText.Contains('>關於本站</a>')) {
    Write-Output "FAIL [$rootPage] 主導覽未同步關於本站定位"
    $errors++
  }
}
$issueConfigText = [System.IO.File]::ReadAllText((Join-Path $dir '.github\ISSUE_TEMPLATE\config.yml'), [System.Text.Encoding]::UTF8)
foreach ($issueConfigNeedle in @('blank_issues_enabled: false', 'https://www.aussiewhvcompass.com/about.html#private-contact', 'https://portal.mara.gov.au/search-the-register-of-migration-agents/')) {
  if (-not $issueConfigText.Contains($issueConfigNeedle)) { Write-Output "FAIL [config.yml] Issue 分流缺安全入口：$issueConfigNeedle"; $errors++ }
}
$briefScript = [regex]::Match($mainJs, '(?s)// ---------- 私人合作需求單.*?// ---------- 自我釐清工作表')
if (-not $briefScript.Success) {
  Write-Output 'FAIL [main.js] 缺私人合作需求單功能塊'
  $errors++
} else {
  foreach ($briefNeedle in @('briefForm.checkValidity()', 'briefForm.reportValidity()', 'briefGmailLink.href = "https://mail.google.com/mail/?view=cm', 'encodeURIComponent("chunaenqiu6@gmail.com")', 'encodeURIComponent(subject)', 'encodeURIComponent(briefText)', 'navigator.clipboard.writeText(briefPreview.value)', 'briefPreview.select()')) {
    if (-not $briefScript.Value.Contains($briefNeedle)) { Write-Output "FAIL [main.js] 私人需求單缺驗證／編碼／複製備援：$briefNeedle"; $errors++ }
  }
  if (-not $briefScript.Value.Contains('本站不提供簽證或移民代辦；這只是初步需求') -or -not $briefScript.Value.Contains('請再次確認未放入簽證、移民或其他敏感個案資料')) {
    Write-Output 'FAIL [main.js] 私人需求單預覽未同步收費合作界線'
    $errors++
  }
  foreach ($onlineNeedle in @('window.WHV_API_CONFIG', 'turnstile-spin-v2', 'credentials: "omit"', 'referrerPolicy: "no-referrer"', 'response.ok', 'result.ok !== true', 'emailStatus === "sent"', '收到後端回執前不會顯示完成', 'history.replaceState')) {
    if (-not $briefScript.Value.Contains($onlineNeedle)) { Write-Output "FAIL [main.js] 站內需求單缺後端回執／隱私界線：$onlineNeedle"; $errors++ }
  }
  foreach ($forbidden in @('localStorage', 'sessionStorage', 'XMLHttpRequest')) {
    if ($briefScript.Value.Contains($forbidden)) { Write-Output "FAIL [main.js] 私人需求單不得寫入瀏覽器儲存空間或使用舊式上傳：$forbidden"; $errors++ }
  }
}
$apiConfigPath = Join-Path $dir 'assets\api-config.js'
if (-not (Test-Path $apiConfigPath)) {
  Write-Output 'FAIL 缺公開 API 設定檔'
  $errors++
} else {
  $apiConfigText = [System.IO.File]::ReadAllText($apiConfigPath, [System.Text.Encoding]::UTF8)
  # 只放公開值：apiBaseUrl 必須是空字串或純 https origin，turnstileSiteKey 必須是空字串或公開 site key。
  $apiBaseMatch = [regex]::Match($apiConfigText, 'apiBaseUrl: "([^"]*)"')
  if (-not $apiBaseMatch.Success -or ($apiBaseMatch.Groups[1].Value -ne '' -and $apiBaseMatch.Groups[1].Value -notmatch '^https://[a-z0-9.-]+$')) {
    Write-Output 'FAIL [api-config.js] apiBaseUrl 必須是空字串或純 https origin（不得帶路徑、查詢、雜湊或帳密）'
    $errors++
  }
  $siteKeyMatch = [regex]::Match($apiConfigText, 'turnstileSiteKey: "([^"]*)"')
  if (-not $siteKeyMatch.Success -or ($siteKeyMatch.Groups[1].Value -ne '' -and $siteKeyMatch.Groups[1].Value -notmatch '^0x[A-Za-z0-9_-]{10,30}$')) {
    Write-Output 'FAIL [api-config.js] turnstileSiteKey 必須是空字串或公開 site key 格式'
    $errors++
  }
  if ($apiConfigText -match '(?i)secret') {
    Write-Output 'FAIL [api-config.js] 前端設定檔不得出現 secret 字樣'
    $errors++
  }
  # 每個 API 功能各有旗標：填 apiBaseUrl 不得順手打開別的功能。
  foreach ($apiConfigNeedle in @('assistEnabled:', 'contactSubmitEnabled:', 'dplusMetricsEnabled:', 'accommodationSearchEnabled:', 'Public values only', 'P0-4')) {
    if (-not $apiConfigText.Contains($apiConfigNeedle)) { Write-Output "FAIL [api-config.js] 缺功能旗標或來源註記：$apiConfigNeedle"; $errors++ }
  }
  # 尚未備妥正式資源的功能必須維持關閉（交易信、D+ 部署、住宿平台授權）。
  foreach ($apiConfigOff in @('contactSubmitEnabled: false', 'dplusMetricsEnabled: false', 'accommodationSearchEnabled: false')) {
    if (-not $apiConfigText.Contains($apiConfigOff)) { Write-Output "FAIL [api-config.js] 尚未備妥資源的功能必須維持關閉：$apiConfigOff"; $errors++ }
  }
  foreach ($apiSecretName in @('TURNSTILE_SECRET_KEY', 'RATE_LIMIT_HMAC_KEY', 'API_KEY')) {
    if ($apiConfigText.Contains($apiSecretName)) { Write-Output "FAIL [api-config.js] 前端不得出現 secret 名稱或值：$apiSecretName"; $errors++ }
  }
}
# 每個功能只讀自己的旗標，不得共用 apiBaseUrl 當總開關
foreach ($gatePair in @(
  @('function assistSettings()', 'config.assistEnabled !== true'),
  @('function getApiSettings()', 'config.contactSubmitEnabled !== true'),
  @('function sendDplusMetric(', 'dplusConfig.dplusMetricsEnabled !== true')
)) {
  $gateBody = [regex]::Match($mainJs, '(?s)' + [regex]::Escape($gatePair[0]) + '.{0,600}')
  if (-not $gateBody.Success -or -not $gateBody.Value.Contains($gatePair[1])) {
    Write-Output ("FAIL [main.js] {0} 必須自行檢查旗標 {1}" -f $gatePair[0], $gatePair[1])
    $errors++
  }
}
foreach ($rootPage in $pages + '404.html') {
  $rootPageText = [System.IO.File]::ReadAllText((Join-Path $dir $rootPage), [System.Text.Encoding]::UTF8)
  if (-not $rootPageText.Contains('<script src="assets/api-config.js?v=') -or $rootPageText.IndexOf('assets/api-config.js?v=') -gt $rootPageText.IndexOf('assets/main.js?v=')) {
    Write-Output "FAIL [$rootPage] API 公開設定必須帶版本並在 main.js 前載入"
    $errors++
  }
}

# D+ 只接受固定類別的每日彙總；答案、精確秒數、頁面、查詢與識別資訊不得送出或持久化。
foreach ($dplusId in @('dplus-task-test', 'dplus-task-start', 'dplus-task-questions', 'dplus-task-finish', 'dplus-task-status', 'dplus-task-result', 'dplus-result-route', 'dplus-result-evidence', 'dplus-result-help')) {
  if (-not $aboutText.Contains("id=`"$dplusId`"")) { Write-Output "FAIL [about.html] 缺 D+ 自願任務測試元件：$dplusId"; $errors++ }
}
foreach ($dplusDisclosure in @('全程不要求姓名、Email 或自由文字', '答案與精確秒數只留在本頁', '日期＋固定結果類別', '不建立事件明細、cookie、client ID 或跨頁紀錄', '是否參加完全自願')) {
  if (-not $aboutText.Contains($dplusDisclosure)) { Write-Output "FAIL [about.html] 缺 D+ 資料界線：$dplusDisclosure"; $errors++ }
}
if (-not $aboutText.Contains('id="dplus-task-start" hidden')) {
  Write-Output 'FAIL [about.html] D+ 開始鍵必須預設隱藏，避免 no-JS 顯示無作用按鈕'
  $errors++
}
$dplusScript = [regex]::Match($mainJs, '(?s)// ---------- D\+ 匿名彙總量測.*?// ---------- 私人合作需求單')
if (-not $dplusScript.Success) {
  Write-Output 'FAIL [main.js] 缺 D+ 匿名彙總量測功能塊'
  $errors++
} else {
  foreach ($dplusNeedle in @(
    '"route_opened"',
    '"official_source_opened"',
    '"task_test_started"',
    '"task_find_route_success_30s"',
    '"task_evidence_understood"',
    '"task_help_route_correct"',
    '"task_test_completed"',
    'apiBaseUrl + "/api/metrics"',
    'body: JSON.stringify({ metricKey: metricKey })',
    'credentials: "omit"',
    'referrerPolicy: "no-referrer"',
    'keepalive: true',
    'performance.now()',
    'dplusTaskStart.hidden = false',
    'D+ 尚未啟用，沒有送出計數',
    'dplusTaskFinish.disabled = true'
  )) {
    if (-not $dplusScript.Value.Contains($dplusNeedle)) { Write-Output "FAIL [main.js] D+ 缺固定類別／本機測驗／fail-closed 行為：$dplusNeedle"; $errors++ }
  }
  foreach ($dplusForbidden in @('localStorage', 'sessionStorage', 'navigator.userAgent', 'document.referrer', 'clientId', 'userId', 'elapsedMilliseconds:')) {
    if ($dplusScript.Value.Contains($dplusForbidden)) { Write-Output "FAIL [main.js] D+ 不得持久化或送出識別／精確計時資料：$dplusForbidden"; $errors++ }
  }
  if ([regex]::Matches($dplusScript.Value, 'body:\s*JSON\.stringify').Count -ne 1) {
    Write-Output 'FAIL [main.js] D+ 只能有一種固定 JSON request body'
    $errors++
  }
}
foreach ($indexSourceNeedle in @('id="source-model-title"', 'about.html#editorial-method', '官方來源可回查・風險先揭露・公開內容免費・資料性質說清楚', '不把未親歷的內容寫成親身經驗', '回報與修正', 'about.html#maintain', '資料性質說清楚')) {
  if (-not $indexText.Contains($indexSourceNeedle)) { Write-Output "FAIL [index.html] 首頁缺資料來源模型或修正入口：$indexSourceNeedle"; $errors++ }
}
foreach ($indexSalesNeedle in @('id="collab-home-title"', '想找 Jason', '私人合作可以直接寄 Email', '公開內容免費，客製合作可收費')) {
  if ($indexText.Contains($indexSalesNeedle)) { Write-Output "FAIL [index.html] 首頁不應以站長服務或商業合作作為旅程主線：$indexSalesNeedle"; $errors++ }
}
if (-not $aboutText.Contains('<nav class="support-grid" aria-label="回報與聯絡類型">') -or $aboutText.Contains('class="warning"')) {
  Write-Output 'FAIL [about.html] 回報與聯絡類型語意或 noscript 警示樣式未修正'
  $errors++
}
foreach ($docBoundary in @(
  @{ File = 'docs\SDD.md'; Text = '**不做簽證或移民代辦**' },
  @{ File = 'docs\SPEC.md'; Text = '不論是否收費，都不得提供' },
  @{ File = 'README.md'; Text = '不論是否收費，都不提供' }
)) {
  $docText = [System.IO.File]::ReadAllText((Join-Path $dir $docBoundary.File), [System.Text.Encoding]::UTF8)
  if (-not $docText.Contains($docBoundary.Text)) { Write-Output "FAIL [$($docBoundary.File)] 缺移民代辦不可協商邊界"; $errors++ }
}
if (-not $toolsJs.Contains('澳打指南針 ・ 公開攻略免費 ・ 資料只留在本機')) {
  Write-Output 'FAIL [tools.js] 行前海報未同步公開攻略免費定位'
  $errors++
}
foreach ($entryNeedle in @('澳洲打工度假，你現在在哪一步？', '先講你現在卡哪一步', '用快思看見準備輪廓', '快思測驗＋慢想工作表', '這些資料怎麼來？')) {
  if (-not $indexText.Contains($entryNeedle)) { Write-Output "FAIL [index.html] 首頁入口文案未同步最新功能：$entryNeedle"; $errors++ }
}
# P0-8：使命句自首頁 hero 移到 about.html 開頭，且只在 about 出現
if (-not $aboutText.Contains('我們想成為對打工度假者最友善的網站') -or $indexText.Contains('我們想成為對打工度假者')) {
  Write-Output 'FAIL [about.html] 使命句「我們想成為對打工度假者最友善的網站」必須在 about.html 開頭且不再留在首頁'
  $errors++
}

$legacyOmaraUrl = 'https://www.mara.gov.au/' + 'search-the-register-of-migration-agents/'
foreach ($legacyOmaraFile in Get-ChildItem $dir -Recurse -File -Include '*.html','*.md','*.yml','*.yaml','*.json','*.js','*.ps1','*.py','*.txt' | Where-Object { $_.FullName -notmatch '[\\/]\.git[\\/]' -and $_.FullName -notmatch '[\\/]\.codex-remote-attachments[\\/]' -and $_.FullName -notmatch '[\\/]node_modules[\\/]' }) {
  if ([System.IO.File]::ReadAllText($legacyOmaraFile.FullName, [System.Text.Encoding]::UTF8).Contains($legacyOmaraUrl)) {
    Write-Output "FAIL [$($legacyOmaraFile.FullName.Substring($dir.Length + 1))] 仍含已失效 OMARA 名冊網址"
    $errors++
  }
}
foreach ($mobileUxNeedle in @('.site-header { position: static; }', 'main [id] { scroll-margin-top: 24px; }', '.source-model {', '.source-method-grid {', '#considering {', '#committed {', '#in-australia {')) {
  if (-not $styleText.Contains($mobileUxNeedle)) { Write-Output "FAIL [style.css] 缺行動版遮擋或長文分段修正：$mobileUxNeedle"; $errors++ }
}
if (-not $mainJs.Contains('.then(copied, copyFailed)') -or -not $mainJs.Contains('catch (e) { copyFailed(); }')) {
  Write-Output 'FAIL [main.js] clipboard 失敗分支不得誤報已複製'
  $errors++
}

# 交接文件一致性（docs/README.md §4）：索引涵蓋、P 編號登記、決策引用、頁面清單、修改過的核心文件標頭日期。
$docsDir = Join-Path $dir 'docs'
$docsIndexText = [System.IO.File]::ReadAllText((Join-Path $docsDir 'README.md'), [System.Text.Encoding]::UTF8)
foreach ($docFile in (Get-ChildItem $docsDir -Filter '*.md' | Where-Object { $_.Name -ne 'README.md' })) {
  $indexNeedle = '[`' + $docFile.Name + '`](' + $docFile.Name + ')'
  if (-not $docsIndexText.Contains($indexNeedle)) { Write-Output "FAIL [docs/README.md] 索引 §1 未列出 $($docFile.Name)"; $errors++ }
}
$roadmapText = [System.IO.File]::ReadAllText((Join-Path $docsDir 'ROADMAP.md'), [System.Text.Encoding]::UTF8)
$roadmapIds = @([regex]::Matches($roadmapText, '(?m)^\|\s*(P[0-2]-\d+)\s*\|') | ForEach-Object { $_.Groups[1].Value })
if ($roadmapIds.Count -lt 10) { Write-Output "FAIL [docs/ROADMAP.md] §1 總表只解析到 $($roadmapIds.Count) 個編號"; $errors++ }
$decisionsText = [System.IO.File]::ReadAllText((Join-Path $docsDir 'DECISIONS.md'), [System.Text.Encoding]::UTF8)
$decisionIds = @([regex]::Matches($decisionsText, '(?m)^## (D-\d{4}-\d{2}-\d{2}-\d{2})\b') | ForEach-Object { $_.Groups[1].Value })
foreach ($docFile in (Get-ChildItem $docsDir -Filter '*.md')) {
  $docText = [System.IO.File]::ReadAllText($docFile.FullName, [System.Text.Encoding]::UTF8)
  foreach ($workItemId in ([regex]::Matches($docText, '\bP[0-2]-\d+\b') | ForEach-Object { $_.Value } | Sort-Object -Unique)) {
    if ($roadmapIds -notcontains $workItemId) { Write-Output "FAIL [docs/$($docFile.Name)] 使用了未在 ROADMAP.md §1 登記的編號：$workItemId"; $errors++ }
  }
  foreach ($decisionRef in ([regex]::Matches($docText, '\bD-\d{4}-\d{2}-\d{2}-\d{2}\b') | ForEach-Object { $_.Value } | Sort-Object -Unique)) {
    if ($decisionIds -notcontains $decisionRef) { Write-Output "FAIL [docs/$($docFile.Name)] 引用了不存在的決策條目：$decisionRef"; $errors++ }
  }
}
$specText = [System.IO.File]::ReadAllText((Join-Path $docsDir 'SPEC.md'), [System.Text.Encoding]::UTF8)
foreach ($rootPage in $pages) {
  if (-not $specText.Contains('`' + $rootPage + '`')) { Write-Output "FAIL [docs/SPEC.md] §1.1 頁面清單缺 $rootPage"; $errors++ }
}
$gitCommand = Get-Command git -ErrorAction SilentlyContinue
$todayStamp = (Get-Date).ToString('yyyy-MM-dd')
foreach ($coreDoc in @('README.md', 'SDD.md', 'SPEC.md', 'ROADMAP.md', 'DECISIONS.md', 'CLARIFIER_SPEC.md')) {
  $coreDocText = [System.IO.File]::ReadAllText((Join-Path $docsDir $coreDoc), [System.Text.Encoding]::UTF8)
  $updatedMatch = [regex]::Match($coreDocText, '最後更新 (\d{4}-\d{2}-\d{2})')
  if (-not $updatedMatch.Success) { Write-Output "FAIL [docs/$coreDoc] 標頭缺「最後更新 YYYY-MM-DD」"; $errors++; continue }
  if ($null -eq $gitCommand) { Write-Output "WARN [docs/$coreDoc] 找不到 git，略過標頭日期新鮮度檢查"; continue }
  $docStatus = & $gitCommand.Source -C $dir status --porcelain -- ('docs/' + $coreDoc)
  if ($LASTEXITCODE -eq 0 -and $docStatus -and $updatedMatch.Groups[1].Value -ne $todayStamp) {
    Write-Output "FAIL [docs/$coreDoc] 檔案已修改但標頭「最後更新」不是今天（$todayStamp）"
    $errors++
  }
}

# Cloudflare 後端必須維持獨立、本機可重播，而且遠端 P0-4 未完成時要以不可部署佔位值 fail closed。
$workerDir = Join-Path $dir 'worker'
$workerRequired = @(
  'package.json',
  'package-lock.json',
  'wrangler.jsonc',
  'migrations\0001_initial.sql',
  'migrations\0002_dplus_task_metrics.sql',
  'src\index.ts',
  'src\body.ts',
  'src\cors.ts',
  'src\turnstile.ts',
  'src\rate-limit.ts',
  'src\repository.ts',
  'src\mail.ts',
  'src\contact.ts',
  'src\contact-validation.ts',
  'src\tokens.ts',
  'src\metrics.ts',
  'src\accommodation.ts',
  'src\assist.ts',
  'migrations\0003_assist_daily_usage.sql',
  'test\http.test.ts',
  'test\contact.test.ts',
  'test\metrics.test.ts',
  'test\accommodation.test.ts',
  'test\security.test.ts',
  'test\repository.test.ts',
  'test\mail.test.ts',
  'test\assist.test.ts'
)
foreach ($workerFile in $workerRequired) {
  if (-not (Test-Path (Join-Path $workerDir $workerFile))) {
    Write-Output "FAIL [worker] 缺本機後端檔案：$workerFile"
    $errors++
  }
}
if (Test-Path (Join-Path $workerDir 'wrangler.jsonc')) {
  $workerConfig = [System.IO.File]::ReadAllText((Join-Path $workerDir 'wrangler.jsonc'), [System.Text.Encoding]::UTF8)
  foreach ($workerConfigNeedle in @(
    '"workers_dev": false',
    '"preview_urls": false',
    '"observability": {',
    '"enabled": false',
    '"database_id": "00000000-0000-0000-0000-000000000000"',
    '"name": "CONTACT_RATE_LIMITER"',
    '"name": "DPLUS_RATE_LIMITER"',
    '"name": "ACCOMMODATION_RATE_LIMITER"',
    '"name": "ASSIST_RATE_LIMITER"',
    '"ASSIST_DAILY_CAP": "200"',
    '"TURNSTILE_EXPECTED_ACTION": "turnstile-spin-v2"'
  )) {
    if (-not $workerConfig.Contains($workerConfigNeedle)) {
      Write-Output "FAIL [worker/wrangler.jsonc] 缺本機安全界線：$workerConfigNeedle"
      $errors++
    }
  }
}
# AI 兜底 Worker：fail closed、只回站內連結、不記錄問題文字；每日 counter 不進 /api/metrics 白名單
$assistWorkerPath = Join-Path $workerDir 'src\assist.ts'
if (Test-Path $assistWorkerPath) {
  $assistWorkerText = [System.IO.File]::ReadAllText($assistWorkerPath, [System.Text.Encoding]::UTF8)
  foreach ($assistWorkerNeedle in @('over_cap', 'official_exit', 'ASSIST_SAME_SITE', 'perthDate', 'verifyTurnstile', 'ASSIST_DETERMINATION', 'client_ip_missing', 'composeAnswerText')) {
    if (-not $assistWorkerText.Contains($assistWorkerNeedle)) { Write-Output "FAIL [worker/src/assist.ts] AI 兜底缺 fail-closed 界線：$assistWorkerNeedle"; $errors++ }
  }
  if (-not [regex]::IsMatch($assistWorkerText, 'ASSIST_ALLOWED_HOSTS(?:: readonly string\[\])? = \["api\.minimaxi\.com", "api\.minimax\.io"\]')) {
    Write-Output 'FAIL [worker/src/assist.ts] ASSIST_ALLOWED_HOSTS 必須固定為 api.minimaxi.com 與 api.minimax.io'
    $errors++
  }
  if ([regex]::IsMatch($assistWorkerText, 'console\s*\.')) {
    Write-Output 'FAIL [worker/src/assist.ts] 不得使用任何 console 方法（問題文字、回覆與 token 不得進 log）'
    $errors++
  }
  if ([regex]::IsMatch($assistWorkerText, '(?:parsed|reply|payload|message)\.answer\b|sanitizeAnswer')) {
    Write-Output 'FAIL [worker/src/assist.ts] 不得讀取模型回覆的 answer 欄位；回覆文字只能由伺服器模板組成'
    $errors++
  }
  $repositoryPath = Join-Path $workerDir 'src\repository.ts'
  $metricsPath = Join-Path $workerDir 'src\metrics.ts'
  if ((Test-Path $repositoryPath) -and (Test-Path $metricsPath)) {
    $repositoryText = [System.IO.File]::ReadAllText($repositoryPath, [System.Text.Encoding]::UTF8)
    $metricsText = [System.IO.File]::ReadAllText($metricsPath, [System.Text.Encoding]::UTF8)
    $metricKeysBlock = [regex]::Match($repositoryText, '(?s)METRIC_KEYS = \[.*?\]')
    if (-not $metricKeysBlock.Success -or $metricKeysBlock.Value.Contains('assist_requests') -or -not $metricsText.Contains('METRIC_KEYS.includes(')) {
      Write-Output 'FAIL [worker] AI 兜底每日 counter 不得進入 D+ 量測白名單（METRIC_KEYS／metrics.ts）'
      $errors++
    }
  }
}
$trackedSecretFiles = Get-ChildItem $workerDir -Recurse -File | Where-Object {
  $_.FullName -notmatch '[\\/](node_modules|\.wrangler|dist)[\\/]' -and
  $_.Name -notin @('.dev.vars.example', 'package-lock.json', 'worker-configuration.d.ts')
}
foreach ($trackedSecretFile in $trackedSecretFiles) {
  $trackedSecretText = [System.IO.File]::ReadAllText($trackedSecretFile.FullName, [System.Text.Encoding]::UTF8)
  if ($trackedSecretText -match '(?im)^\s*(TURNSTILE_SECRET_KEY|RATE_LIMIT_HMAC_KEY)\s*=\s*\S+') {
    Write-Output "FAIL [worker] secret 不得寫入 repo：$($trackedSecretFile.Name)"
    $errors++
  }
}
$workerNodeModules = Join-Path $workerDir 'node_modules'
if (-not (Test-Path $workerNodeModules)) {
  Write-Output 'FAIL [worker] 尚未安裝鎖定依賴；請先在 worker 執行 npm ci'
  $errors++
} else {
  Push-Location $workerDir
  try {
    & npm.cmd run check
    if ($LASTEXITCODE -ne 0) {
      Write-Output 'FAIL [worker] TypeScript／Vitest／D1 local migration／Wrangler dry-run 未通過'
      $errors++
    }
  } finally {
    Pop-Location
  }
}

Write-Output ("-" * 40)
if ($errors -eq 0) { Write-Output "ALL CHECKS PASSED ($($pages.Count) pages)"; exit 0 }
else { Write-Output "$errors ERROR(S)"; exit 1 }
