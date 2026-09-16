"""One-time, scoped integration; executed on the feature branch before review.
The assembly workflow and this helper are removed before the generated commit.
No network calls, account creation or secrets. Existing sections are preserved.
"""
from pathlib import Path
import re
import subprocess

ROOT = Path(__file__).resolve().parent.parent
VERSION = '20260916-01'

def read(name):
    return (ROOT / name).read_text(encoding='utf-8')

def write(name, text):
    (ROOT / name).parent.mkdir(parents=True, exist_ok=True)
    (ROOT / name).write_text(text, encoding='utf-8')

def replace(name, old, new, count=1):
    text = read(name)
    if text.count(old) != count:
        raise RuntimeError(f'{name}: expected {count} occurrences of {old[:65]!r}, found {text.count(old)}')
    write(name, text.replace(old, new))

if (ROOT / 'free.html').exists():
    raise RuntimeError('free.html already exists; do not overwrite concurrent work')

market = read('market.html')
head = market.split('<main id="main-content" tabindex="-1">')[0]
head = head.replace('market.html', 'free.html').replace('data-i18n-topic="market"', 'data-i18n-topic="free"')
head = head.replace('離澳出清 × 初登澳補給站', '離澳免費二手版')
head = re.sub(r'(<meta (?:name="description"|property="og:description") content=")[^"]*(">)', r'\1離澳免費贈送看板：依城市與分類找生活用品，預覽刊登草稿，再到 GitHub 公開送出。本站顯示須經審核，不收訂金或運費。\2', head)
head = head.replace('</head>', '<link rel="stylesheet" href="assets/free-board.css?v=20260905-03">\n</head>')
foot = market.split('</main>', 1)[1]
foot = re.sub(r'<p class="disclaimer">.*?</p>', '<p class="disclaimer">免費贈送社群看板・GitHub 公開刊登・站內展示須經版規審核。本站不提供付款、寄送、身分或商品安全保證。</p>', foot)
foot = re.sub(r'<script src="assets/tools.js[^\n]+\n', '', foot)
foot = foot.replace('</body>', '<script src="assets/free-board.js?v=20260905-03" defer></script>\n</body>')
write('free.html', head + read('scripts/free-board-fragment.html') + foot)

card = '''    <a class="home-entry-card" href="free.html">
      <span class="home-entry-kicker">離澳免費二手版</span>
      <strong>把好物交給下一位</strong>
      <small>同城免費贈送、找生活補給；GitHub 刊登，審核後顯示。</small>
    </a>
'''
replace('index.html', '    <a class="home-entry-card" href="#games">', card + '    <a class="home-entry-card" href="#games">')
replace('index.html', '<a href="market.html#market-tool">開啟二手交換工具</a>', '<a href="free.html">離澳免費二手版</a><a href="market.html#market-tool">開啟二手交換工具</a>')
entry = '<div class="note"><strong>離澳免費二手版：</strong>把用得上的生活用品留給下一位，或找同城免費補給。<a class="btn secondary" href="free.html">瀏覽／免費送物</a>　GitHub 刊登，原貼公開，本站顯示須經審核。</div>\n\n  '
for page in ('leave.html', 'market.html'):
    replace(page, '<section class="quick-answer-hub"', entry + '<section class="quick-answer-hub"')
replace('market.html', '本站目前不收刊登、不保存聯絡資料，也不介入付款', '本頁草稿工具不收刊登、不保存聯絡資料，也不介入付款')
replace('market.html', '不保存刊登內容、不驗證身分、不檢驗商品', '本頁不保存草稿內容、不驗證身分、不檢驗商品')
replace('about.html', '</main>', '<section id="free-board-privacy"><h2 id="free-board-privacy-title">離澳免費二手版：公開刊登與隱私</h2><p><a href="free.html">免費二手版</a>使用 GitHub 公開 Issue；送出即公開，本站展示須經版規審核，不代表商品或身分認證。表單不要求電話或住址，請勿自行填入。原貼與留言可能被搜尋引擎收錄，關閉 Issue 不是刪除內容。涉及個資請透過本頁私人聯絡入口通知站長。</p><p>僅在你按載入後讀取 GitHub 公開資料；篩選字詞不傳送，不串接 CRM，看板不啟用 GA4。規則與移除方式見<a href="free.html#rules">看板說明</a>。</p></section>\n</main>')
replace('assets/analytics.js', '    "/scam.html",', '    "/free.html",\n    "/scam.html",')
for builder in ('scripts/build_seo.py', 'scripts/build_search.py'):
    replace(builder, '    "market.html",', '    "market.html",\n    "free.html",')
replace('scripts/build_search.py', 'ALIASES = {', 'ALIASES = {\n    "free.html": "離澳免費二手版 免費二手板 免費贈送 送物 搬家 出清 同城 面交 二手 生活補給 giveaway free stuff",')
replace('scripts/build_seo.py', '    "market.html": "high",', '    "market.html": "high",\n    "free.html": "medium",')
replace('scripts/build_seo.py', '"housing.html", "market.html", "work.html"', '"housing.html", "market.html", "free.html", "work.html"')
replace('scripts/build_seo.py', '"dateModified": LAST_MODIFIED,', '"dateModified": "2026-09-16" if page in {"free.html", "index.html", "market.html", "leave.html", "about.html"} else LAST_MODIFIED,')
# New page metadata is not a claim that existing policy evidence was rechecked.
replace('scripts/build_seo.py', '"generatedAt": LAST_MODIFIED,', '"generatedAt": "2026-09-16",')
text = read('scripts/build_seo.py')
pos = text.index('"lastModified": LAST_MODIFIED,')
text = text[:pos] + text[pos:].replace('"lastModified": LAST_MODIFIED,', '"lastModified": "2026-09-16" if page in {"free.html", "index.html", "market.html", "leave.html", "about.html"} else LAST_MODIFIED,', 1)
write('scripts/build_seo.py', text)

replace('scripts/check.ps1', "'communities.html', 'map.html')", "'communities.html', 'map.html', 'free.html')")
replace('scripts/check.ps1', "$entryHrefs.Count -ne 3", "$entryHrefs.Count -ne 4")
replace('scripts/check.ps1', "'communities.html,#games,#journey-resume'", "'communities.html,free.html,#games,#journey-resume'")
replace('scripts/check.ps1', '入口卡必須恰好三張且依序連 communities.html、#games、#journey-resume', '入口卡必須恰好四張且依序連 communities.html、free.html、#games、#journey-resume')
replace('scripts/check.ps1', '本站目前不收刊登、不保存聯絡資料，也不介入付款', '本頁草稿工具不收刊登、不保存聯絡資料，也不介入付款')
replace('scripts/check.ps1', '不保存刊登內容、不驗證身分、不檢驗商品', '本頁不保存草稿內容、不驗證身分、不檢驗商品')
replace('scripts/check.ps1', 'if ($errors -eq 0) { Write-Output "ALL CHECKS PASSED', '& node --test (Join-Path $dir "scripts/test_free_board.cjs")\nif ($LASTEXITCODE -ne 0) { $errors++ }\nif ($errors -eq 0) { Write-Output "ALL CHECKS PASSED')

for name in ('docs/SDD.md', 'docs/SPEC.md', 'docs/ROADMAP.md', 'docs/DECISIONS.md'):
    write(name, re.sub(r'最後更新 \d{4}-\d{2}-\d{2}', '最後更新 2026-09-16', read(name), count=1))
replace('docs/SPEC.md', '| `market.html` |', '| `free.html` | 回程與延續／初登澳（工具頁） | 離澳免費二手版；GitHub 公開 Issue＋審核標籤、同城篩選、刊登草稿 | 有 | — |\n| `market.html` |')
write('docs/SPEC.md', read('docs/SPEC.md') + '''
## 6. P1-24 離澳免費二手版

`free.html` 是獨立工具頁，保留既有 12 項全站導覽，首頁新增一張入口卡並於離澳與原市集頁交叉連結。
只收一般生活用品免費贈送，不做付款、運送、保管或身分認證。原市集付費買賣草稿保持獨立。

- 輸入：固定城市／分類／狀況、50 字品名、90 字面交區域、300 字說明、今天至 90 天內截止日。日期統一用 Australia/Perth（UTC+8）。無聯絡資料欄位，不寫 storage。
- 送出：先產生本機預覽，明示尚未刊登。經使用者同意，僅以標題與 body URL 參數前往 GitHub Markdown Issue template；不用 labels query（一般訪客不需標籤權限）。仍需登入 GitHub 自行 Submit。URL 含草稿並可能進入瀏覽紀錄。
- 資料：只在按載入後讀 GitHub 公開 issues API，credentials omit／no-referrer；只列帶 `free-board-approved` 的 open、非 locked、非 PR、格式有效且未過期的 AUD 0 刊登。每批 50 筆，依 Link 判斷是否可載入更多，去除重複；API 失敗與空結果明確區分。
- 顯示：城市、分類、關鍵字、狀態皆在記憶體篩選；截止或最新排序。用 textContent，連結依 issue number 組固定 repo URL，不採使用者 HTML 或圖片 URL。
- 狀態：`free-board-reserved` 顯示已預約；關閉或本文已送出不顯示。修改原文由 `free-board-moderation.yml` 撤下 approved，須重審。到期只隱藏，不自動刪除 GitHub 原貼。
- 審核：站長確認免費、允收範圍、格式、照片與文字沒有敏感個資，再手動加 approved；不是商品安全認證。預約加 reserved；不當刊登移除 approved 或關閉，涉及個資需另外處理原貼刪除。
- 無 JavaScript／API 限流：原生 GitHub 瀏覽與模板連結仍可用；不虛構刊登或成功狀態。GA4 排除 free.html；公開刊登不連接私人需求資料。
- 驗證：`node --test scripts/test_free_board.cjs`；`NODE_PATH=<playwright install>/node_modules node scripts/test_free_board_browser.cjs`；全站 `scripts/check.ps1`。
''')
replace('docs/ROADMAP.md', '| P2-1 |', '| P1-24 | 離澳免費二手版（審核制免費贈送） | 程式完成／本機驗證 | 站長管理 GitHub 審核標籤；部署驗收見 PR | SPEC §6 | scripts/test_free_board.cjs、test_free_board_browser.cjs |\n| P2-1 |')
write('docs/SDD.md', read('docs/SDD.md') + '''
## 7. 公開贈送看板增補（P1-24）

站長在 2026-09-16 明確要求新增「離澳免費二手版」，沿用已授權 repo 部署。此功能例外允許使用者在明示同意後自行向 GitHub 公開刊登，不擴張 Worker／CRM 資料範圍；表單未確認前仍只在本機。新增 `free.html`、`assets/free-board.js`、`assets/free-board.css` 與 GitHub Issue template。GitHub 公開 API 是由使用者按鈕啟動的第三方連線，不傳送篩選字詞或憑證，GA4 排除此頁。行為見 SPEC §6，站長決策見 DECISIONS D-2026-09-16-01。
''')
write('docs/DECISIONS.md', read('docs/DECISIONS.md') + '''
## D-2026-09-16-01 — P1-24 離澳免費二手版

站長要求新增「離澳免費二手版」，並已在本次對話授權直接部署。第一版採免費贈送、同城自取，站內預覽後由刊登者自行到 GitHub 公開送出，站長審核後才顯示本站。這不是免帳號的原生論壇，不新增付費服務、匿名寫入 API、聯絡個資資料庫或金流。
首頁、離澳頁與原市集互相連結；原市集仍保留買賣草稿。資料未載入、真正空清單、讀取失敗及載入更多分別處理。不建立虛構真實刊登。測試使用 fixtures，不代表物品真實或完成正式帳號刊登；CI／部署證據以對應 PR 與 Actions run 為準。
''')
write('README.md', read('README.md') + '''
## 離澳免費二手版

[免費贈送看板](https://www.aussiewhvcompass.com/free.html)提供同城物品篩選與公開刊登草稿。瀏覽不用登入；刊登、留言與管理自己的原貼使用 GitHub 帳號。原貼送出即公開，本站顯示須經 `free-board-approved` 審核；用 `free-board-reserved` 標預約，送出後關閉 Issue。本文修改會移除 approved，需重審。沒有站內金流、匿名後端、電話或住址欄位，不串 CRM。此公開流程與原本 market.html 的本機買賣草稿不同，完整契約與版主操作見 docs/SPEC.md §6。
''')
# Global cache version synchronization; no source/evidence dates are advanced.
paths = list(ROOT.glob('*.html')) + list((ROOT/'lang').rglob('*.html')) + list((ROOT/'assets').glob('*.js')) + [ROOT/'scripts/build_i18n.py',ROOT/'scripts/build_seo.py']
for path in paths:
    source = path.read_text(encoding='utf-8')
    changed = re.sub(r'20260905-0[34]', VERSION, source)
    if changed != source: path.write_text(changed,encoding='utf-8')
for script in ('build_i18n.py','build_seo.py','build_search.py'):
    subprocess.run(['python', str(ROOT/'scripts'/script)],check=True,cwd=ROOT)
print('Free-board integration complete; review generated diff before merging.')
