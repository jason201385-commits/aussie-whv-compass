# 澳打指南針 — 驗收腳本（SPEC §6 第 1、2 項）
# 用法：powershell -File scripts/check.ps1（在 repo 根目錄執行）
# 全部通過輸出 ALL CHECKS PASSED 並以 0 結束；任何錯誤以 1 結束。

$ErrorActionPreference = 'Stop'
$dir = Split-Path -Parent $PSScriptRoot
if (-not (Test-Path (Join-Path $dir 'index.html'))) { $dir = (Get-Location).Path }
$errors = 0

$pages = Get-ChildItem (Join-Path $dir '*.html') | Select-Object -ExpandProperty Name
$anchors = @{}
foreach ($p in $pages) {
  $t = [System.IO.File]::ReadAllText((Join-Path $dir $p), [System.Text.Encoding]::UTF8)
  $anchors[$p] = [regex]::Matches($t, 'id="([^"]+)"') | ForEach-Object { $_.Groups[1].Value }
}

foreach ($p in $pages) {
  $t = [System.IO.File]::ReadAllText((Join-Path $dir $p), [System.Text.Encoding]::UTF8)

  # 結構
  if ($t -notmatch '<title>.+</title>') { Write-Output "FAIL [$p] 缺 <title>"; $errors++ }
  if (-not $t.Contains('</html>'))      { Write-Output "FAIL [$p] 缺 </html>"; $errors++ }
  if (-not $t.Contains('site-footer'))  { Write-Output "FAIL [$p] 缺 footer"; $errors++ }
  if (-not $t.Contains('assets/main.js')) { Write-Output "FAIL [$p] 未掛 main.js"; $errors++ }

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

# 資料檔存在且非空
foreach ($a in @('assets\style.css', 'assets\main.js', 'assets\tools.js', 'assets\postcodes.js', 'assets\seasons.js')) {
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
if (-not $mainJs.Contains('template=thanks.yml')) {
  Write-Output 'FAIL [main.js] 全站回饋列缺感謝入口'
  $errors++
}
foreach ($resumeNeedle in @('whv-last-page-v1', 'JOURNEY_PAGES', 'hasOwnProperty.call(JOURNEY_PAGES', 'JSON.parse(localStorage.getItem(LAST_PAGE_KEY)', 'localStorage.removeItem(LAST_PAGE_KEY)')) {
  if (-not $mainJs.Contains($resumeNeedle)) {
    Write-Output "FAIL [main.js] 最近閱讀缺安全條件：$resumeNeedle"
    $errors++
  }
}
$indexText = [System.IO.File]::ReadAllText((Join-Path $dir 'index.html'), [System.Text.Encoding]::UTF8)
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
