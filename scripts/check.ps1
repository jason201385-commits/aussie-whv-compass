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
  foreach ($asset in [regex]::Matches($t, '(?:href|src)="assets/(?:style\.css|main\.js|i18n\.js|tools\.js|simulator\.js|postcodes\.js|seasons\.js|analytics-config\.js|analytics\.js|api-config\.js)(?:\?v=([^"]+))?"')) {
    if (-not $asset.Groups[1].Success) { Write-Output "FAIL [$p] 本機資產缺 ?v= 版本"; $errors++ }
    else { $assetVersions += $asset.Groups[1].Value }
  }

  # 導覽：單一 nav、12 連結
  $navBlocks = [regex]::Matches($t, '<div class="nav-links">')
  if ($navBlocks.Count -ne 1) { Write-Output "FAIL [$p] nav-links 區塊數=$($navBlocks.Count)"; $errors++ }
  else {
    $nav = [regex]::Matches($t, 'class="nav-links"[\s\S]*?</div>')[0].Value
    $links = ($nav -split '<a ').Count - 1
    $expectedNavLinks = if ($p -eq 'simulator.html') { 13 } else { 12 }
    if ($links -ne $expectedNavLinks) { Write-Output "FAIL [$p] nav 連結數=$links（應為 $expectedNavLinks）"; $errors++ }
  }
  $currentPageNeedle = if ($p -eq 'index.html') {
    '<a class="brand" aria-current="page" href="index.html">'
  } else {
    '<a class="active" aria-current="page" href="{0}">' -f $p
  }
  if (-not $t.Contains($currentPageNeedle) -or [regex]::Matches($t, 'aria-current="page"').Count -ne 1) {
    Write-Output "FAIL [$p] 靜態目前頁標記缺失或不唯一：$currentPageNeedle"; $errors++
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
$evidencePages = @('visa.html', 'cost.html', 'housing.html', 'work.html', 'health.html', 'scam.html', 'leave.html', 'pr.html')
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
$evidenceCss = [System.IO.File]::ReadAllText((Join-Path $dir 'assets\style.css'), [System.Text.Encoding]::UTF8)
if (-not $evidenceCss.Contains('.evidence-card[data-evidence-status="stale"]')) {
  Write-Output 'FAIL [style.css] 證據卡缺待重新確認狀態樣式'
  $errors++
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
    'top_result_page:'
  )) {
    if (-not $analyticsScript.Contains($analyticsNeedle)) { Write-Output "FAIL [analytics.js] 缺同意／最小化界線：$analyticsNeedle"; $errors++ }
  }
  foreach ($analyticsForbidden in @('search_term', 'event.detail.query', 'user_id:', 'briefText', 'worksheet')) {
    if ($analyticsScript.Contains($analyticsForbidden)) { Write-Output "FAIL [analytics.js] 不得傳送輸入內容或 User-ID：$analyticsForbidden"; $errors++ }
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
    'https://www.aldi.com.au/store-finder/',
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
    if ($commercialLink.Count -ne 1 -or $commercialLink[0].Value -notmatch 'rel="[^"]*nofollow[^"]*"') {
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
    'topPage:'
  )) {
    if (-not $searchScript.Value.Contains($searchNeedle)) { Write-Output "FAIL [main.js] 搜尋缺安全／鍵盤／量測界面：$searchNeedle"; $errors++ }
  }
  foreach ($forbidden in @('localStorage', 'sessionStorage', 'fetch(', 'XMLHttpRequest')) {
    if ($searchScript.Value.Contains($forbidden)) { Write-Output "FAIL [main.js] 搜尋不得保存或送出查詢：$forbidden"; $errors++ }
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
    if (@($contentStatus.primaryPages).Count -ne 14) { Write-Output "FAIL content-status.json 繁中主頁數=$(@($contentStatus.primaryPages).Count)（應為 14）"; $errors++ }
    if (@($contentStatus.fullEnglishGuides).Count -ne 7) { Write-Output "FAIL content-status.json 完整英文頁數=$(@($contentStatus.fullEnglishGuides).Count)（應為 7）"; $errors++ }
    if (@($contentStatus.quickStartLocales).Count -ne 37) { Write-Output "FAIL content-status.json Quick Start 語言數=$(@($contentStatus.quickStartLocales).Count)（應為 37）"; $errors++ }
    $checkedEvidence = @($contentStatus.primaryPages | Where-Object { $_.evidenceCardStatus -eq 'checked' })
    if ($checkedEvidence.Count -ne 8 -or @($checkedEvidence | Where-Object { -not $_.evidenceCardCheckedAt -or $_.evidenceCardScope -ne 'first-action-only' }).Count -gt 0) { Write-Output 'FAIL content-status.json 已查核證據卡數量、日期或範圍錯誤'; $errors++ }
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
  if ($supportLinks -ne 4) { Write-Output "FAIL [index.html] 緊急安全出口數=$supportLinks（應為 4）"; $errors++ }
}
$problemCategories = [regex]::Matches($indexText, 'class="problem-category"').Count
$problemActions = [regex]::Matches($indexText, 'class="card-action"').Count
if ($problemCategories -ne 12 -or $problemActions -ne 12) {
  Write-Output "FAIL [index.html] 問題卡必須有 12 組類別與第一步（category=$problemCategories action=$problemActions）"
  $errors++
}
$homeRouteOrder = @(
  'class="support-hub"',
  'id="journey-map"',
  'class="site-search-home"',
  'class="route-guide"',
  'class="community-callout"'
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
    if ($thirdPartyRegister.schemaVersion -ne 1 -or $thirdPartyRegister.generatedAt -ne '2026-08-30') {
      Write-Output 'FAIL [third-party-register.json] schemaVersion／generatedAt 錯誤'; $errors++
    }
    foreach ($inactiveField in @('paidPlacementActive', 'affiliateLinksActive', 'commercialReferralActive', 'sponsoredRankingAllowed')) {
      if ($thirdPartyRegister.currentState.$inactiveField -ne $false) { Write-Output "FAIL [third-party-register.json] P1-11 現況不得冒充已啟用：$inactiveField"; $errors++ }
    }
    $registerIds = @($thirdPartyRegister.entries | ForEach-Object { $_.id })
    foreach ($requiredRegisterId in @('perth-line-community', 'commercial-navigation-platforms', 'omara-official-register')) {
      if ($registerIds -notcontains $requiredRegisterId) { Write-Output "FAIL [third-party-register.json] 缺現行第三方關係：$requiredRegisterId"; $errors++ }
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
  foreach ($apiConfigNeedle in @('apiBaseUrl: ""', 'turnstileSiteKey: ""', 'Public values only', 'P0-4')) {
    if (-not $apiConfigText.Contains($apiConfigNeedle)) { Write-Output "FAIL [api-config.js] P0-4 前必須 fail closed：$apiConfigNeedle"; $errors++ }
  }
  foreach ($apiSecretName in @('TURNSTILE_SECRET_KEY', 'RATE_LIMIT_HMAC_KEY', 'API_KEY')) {
    if ($apiConfigText.Contains($apiSecretName)) { Write-Output "FAIL [api-config.js] 前端不得出現 secret 名稱或值：$apiSecretName"; $errors++ }
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
foreach ($indexSourceNeedle in @('id="source-model-title"', 'about.html#editorial-method', '官方資料整理・工具化・可回報修正', '不把未親歷的內容寫成親身經驗', '回報與修正', 'about.html#maintain', '資料性質說清楚')) {
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
foreach ($entryNeedle in @('我們想成為對打工度假者', '不替你草率做決定', '用快思看見準備輪廓', '快思測驗＋慢想工作表', '這些資料怎麼來？')) {
  if (-not $indexText.Contains($entryNeedle)) { Write-Output "FAIL [index.html] 首頁入口文案未同步最新功能：$entryNeedle"; $errors++ }
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
  'test\http.test.ts',
  'test\contact.test.ts',
  'test\metrics.test.ts',
  'test\security.test.ts',
  'test\repository.test.ts',
  'test\mail.test.ts'
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
    '"TURNSTILE_EXPECTED_ACTION": "turnstile-spin-v2"'
  )) {
    if (-not $workerConfig.Contains($workerConfigNeedle)) {
      Write-Output "FAIL [worker/wrangler.jsonc] 缺本機安全界線：$workerConfigNeedle"
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
