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
foreach ($a in @('assets\style.css', 'assets\main.js', 'assets\tools.js', 'assets\postcodes.js')) {
  $fp = Join-Path $dir $a
  if (-not (Test-Path $fp) -or (Get-Item $fp).Length -lt 100) { Write-Output "FAIL 資產異常：$a"; $errors++ }
}

Write-Output ("-" * 40)
if ($errors -eq 0) { Write-Output "ALL CHECKS PASSED ($($pages.Count) pages)"; exit 0 }
else { Write-Output "$errors ERROR(S)"; exit 1 }
