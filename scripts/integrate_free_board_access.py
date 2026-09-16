#!/usr/bin/env python3
"""One-shot integration on the reviewed baseline; never run against unrelated branches."""
from pathlib import Path
import re
import subprocess
import sys
ROOT = Path(__file__).resolve().parent.parent

def edit(name, old, new, count=1):
    p = ROOT / name
    text = p.read_text(encoding='utf-8')
    if text.count(old) != count:
        raise RuntimeError(f'{name}: expected {count} matches, found {text.count(old)}: {old[:75]!r}')
    p.write_text(text.replace(old, new), encoding='utf-8')

# New task entry, without reusing another task's identifier.
edit('docs/ROADMAP.md', '| P2-1 |', '| P1-25 | 免費二手入口、手機操作與同城分享 | 程式完成／本機驗證 | 正式發布及實機分享仍需驗收 | SPEC §7 | scripts/test_free_board_access.cjs、test_free_board_access_browser.cjs |\n| P2-1 |')
edit('docs/ROADMAP.md', '| P1-24 | 離澳免費二手版（審核制免費贈送） | 程式完成／本機驗證 | 站長管理 GitHub 審核標籤；部署驗收見 PR |', '| P1-24 | 離澳免費二手版（審核制免費贈送） | 已上線 | 站長管理 GitHub 審核標籤；真實投稿與撤審端到端待驗收 |')

# Real HTML links work even without JavaScript. Free items is the second tab.
for p in sorted(ROOT.glob('*.html')):
    text = p.read_text(encoding='utf-8')
    if '<div class="nav-links">' not in text: continue
    pattern = r'(<div class="nav-links">\s*<a[^>]+href="why\.html"[^>]*>自我釐清</a>)'
    link = '<a class="active" aria-current="page" href="free.html">免費二手</a>' if p.name == 'free.html' else '<a href="free.html">免費二手</a>'
    text, n = re.subn(pattern, lambda m: m[1] + '\n      ' + link, text)
    if n != 1: raise RuntimeError(f'Unexpected nav in {p.name}')
    p.write_text(text, encoding='utf-8')
for p in sorted((ROOT/'lang/en').glob('*/index.html')):
    text = p.read_text(encoding='utf-8')
    anchor = '<a href="/lang/en/">English home</a>'
    if anchor not in text: raise RuntimeError(f'Unexpected English nav in {p}')
    p.write_text(text.replace(anchor, anchor + '\n      <a href="/free.html" hreflang="zh-Hant">Free items · 中文</a>'), encoding='utf-8')
edit('scripts/build_i18n.py', '    <a class="language-hub-link" href="/lang/">All languages</a>', '    <a class="language-hub-link" href="/lang/">All languages</a>\n    <a class="language-hub-link" href="/free.html" hreflang="zh-Hant">Free items · 中文</a>')

# Move, rather than duplicate, the lower homepage card next to the stages.
old_card = '''    <a class="home-entry-card" href="free.html">
      <span class="home-entry-kicker">離澳免費二手版</span>
      <strong>把好物交給下一位</strong>
      <small>同城免費贈送、找生活補給；GitHub 刊登，審核後顯示。</small>
    </a>
'''
edit('index.html', old_card, '')
home = '''    <aside class="home-free-entry" aria-labelledby="home-free-title">
      <div><h2 id="home-free-title">免費二手｜好物交給下一位</h2><p>離澳、搬家送好物；剛到澳洲找同城補給。</p></div>
      <div class="home-free-actions"><a class="btn" href="free.html#free-board">找免費物品</a><a class="btn secondary" href="free.html#publish">我要免費送</a></div>
      <small>物品免費・同城面交・瀏覽免登入；刊登需 GitHub 帳號與審核。</small>
    </aside>
'''
edit('index.html', '    <p class="clarifier-privacy clarifier-trust">', home + '    <p class="clarifier-privacy clarifier-trust">')

# Useful, contextual entry in landing and moving/household advice; no policy edits.
for name in ('prep.html', 'housing.html'):
    text = (ROOT/name).read_text(encoding='utf-8')
    match = re.search(r'(<p class="page-sub">.*?</p>)', text, re.S)
    if not match: raise RuntimeError(f'No page subtitle: {name}')
    extra = '\n  <p class="note">需要生活用品？<a href="free.html#free-board">找同城免費二手物品</a>；搬家整理也可<a href="free.html#publish">把好物免費送出</a>。瀏覽免登入，刊登需 GitHub 帳號與審核。</p>'
    (ROOT/name).write_text(text[:match.end()] + extra + text[match.end():], encoding='utf-8')

edit('free.html', 'id="free-board" aria-labelledby="browse-title"', 'id="free-board" tabindex="-1" aria-labelledby="browse-title"')
edit('free.html', 'id="publish" aria-labelledby="publish-title"', 'id="publish" tabindex="-1" aria-labelledby="publish-title"')
edit('free.html', '<div class="fb-actions"><a class="btn" href="#publish">我要免費送物</a><a class="btn secondary" href="#free-board">找同城免費物品</a></div>', '<div class="fb-actions"><a class="btn" href="#free-board">找同城免費物品</a><a class="btn secondary" href="#publish">我要免費送物</a></div>')
share = '''    <div id="fb-share-controls" hidden>
      <div class="fb-actions"><button class="btn secondary" type="button" id="fb-share-copy">複製看板連結</button><button class="btn secondary" type="button" id="fb-share-open">分享看板</button></div>
      <p class="fb-meta" id="fb-share-scope">只分享城市，不包含搜尋字詞或刊登草稿。</p>
      <p class="fb-meta" id="fb-share-message" role="status"></p>
      <div id="fb-share-fallback" hidden><label for="fb-share-url">手動複製分享連結</label><input id="fb-share-url" type="text" readonly autocomplete="off"></div>
    </div>
'''
edit('free.html', '    <p id="fb-message" role="status">', share + '    <p id="fb-message" role="status">')
mobile = '''
<nav class="fb-mobile-actions" aria-label="免費二手快捷操作">
  <a class="btn secondary" href="#free-board">找免費物品</a>
  <a class="btn" href="#publish">我要免費送</a>
</nav>
'''
edit('free.html', '</main>', '</main>\n' + mobile)
edit('free.html', '<script src="assets/free-board.js?v=20260916-01" defer></script>', '<script src="assets/free-board.js?v=20260916-01" defer></script>\n<script src="assets/free-board-navigation.js?v=20260916-01" defer></script>')

# Extend existing design tokens; no new theme, font, framework or vendor.
with (ROOT/'assets/style.css').open('a',encoding='utf-8') as f:
    f.write('''
/* P1-25: direct free-board entry, beside the stage choices. */
.home-free-entry { display:grid; grid-template-columns:minmax(0,1fr) auto; gap:8px 16px; align-items:center; margin:14px 0; padding:14px 16px; border:1px solid var(--line-soft); border-radius:14px; background:var(--surface); }
.home-free-entry h2 { font-size:1.06rem; line-height:1.5; margin:0; }
.home-free-entry h2::before { display:none; }
.home-free-entry p { margin:3px 0 0; font-size:.88rem; color:var(--ink-soft); }
.home-free-entry small { grid-column:1/-1; color:var(--ink-soft); font-size:.78rem; }
.home-free-actions { display:flex; gap:8px; }
.home-free-actions .btn { min-height:44px; white-space:normal; text-align:center; }
@media(max-width:768px) { .home-free-entry { grid-template-columns:1fr; padding:12px; } .home-free-actions { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); } .home-free-actions .btn { padding:9px 10px; font-size:.9rem; } }
@media print { .home-free-entry { display:none; } }
''')
with (ROOT/'assets/free-board.css').open('a',encoding='utf-8') as f:
    f.write('''
/* P1-25: mobile actions reserve space and hide while editing. */
.fb-mobile-actions { display:none; }
#free-board, #publish { scroll-margin-top:160px; }
#fb-share-controls { border-top:1px solid var(--line-soft); margin-top:18px; padding-top:16px; }
#fb-share-fallback input { display:block; width:100%; min-width:0; min-height:44px; padding:10px; font:inherit; color:var(--ink); background:var(--surface); border:1px solid var(--line); border-radius:8px; }
@media(max-width:768px) {
  body[data-i18n-topic="free"] { padding-bottom:calc(88px + env(safe-area-inset-bottom, 0px)); }
  html:has(body[data-i18n-topic="free"]) { scroll-padding-bottom:calc(100px + env(safe-area-inset-bottom, 0px)); }
  #free-board, #publish { scroll-margin-top:16px; }
  .fb-mobile-actions { position:fixed; z-index:40; bottom:0; left:0; right:0; display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:10px; padding:10px 16px calc(10px + env(safe-area-inset-bottom, 0px)); background:var(--surface); border-top:1px solid var(--line); box-shadow:0 -4px 16px #00000012; }
  .fb-mobile-actions .btn { min-height:46px; padding:10px; text-align:center; white-space:normal; }
  .fb-editing .fb-mobile-actions, body:has(:is(input,textarea,select,[contenteditable="true"]):focus) .fb-mobile-actions { display:none; }
}
@media print { .fb-mobile-actions, #fb-share-controls { display:none!important; } body[data-i18n-topic="free"] { padding-bottom:0; } }
''')

# Update existing assertions to the explicitly requested navigation exception.
edit('scripts/check.ps1', "(($notFoundNav[0].Value -split '<a ').Count - 1) -ne 12", "(($notFoundNav[0].Value -split '<a ').Count - 1) -ne 13")
edit('scripts/check.ps1', '主導覽必須維持 12 個連結', '主導覽必須維持 13 個連結（含免費二手）')
edit('scripts/check.ps1', '$expectedNavLinks = 12', '$expectedNavLinks = 13')
edit('scripts/check.ps1', "'communities.html', 'map.html', 'free.html'", "'communities.html', 'map.html'")
edit('scripts/check.ps1', "$entryHrefs.Count -ne 4 -or ($entryHrefs -join ',') -ne 'communities.html,free.html,#games,#journey-resume'", "$entryHrefs.Count -ne 3 -or ($entryHrefs -join ',') -ne 'communities.html,#games,#journey-resume'")
edit('scripts/check.ps1', '入口卡必須恰好四張且依序連 communities.html、free.html、#games、#journey-resume', '下方入口卡必須三張：communities.html、#games、#journey-resume；免費二手移至階段旁')
# Make new regression coverage part of the offline verifier, not only one-off CI.
edit('scripts/check.ps1', '$errors = 0', '''$errors = 0
& node (Join-Path $dir 'scripts/test_free_board_access.cjs')
if ($LASTEXITCODE -ne 0) { $errors++ }
''')
edit('scripts/test_free_board_browser.cjs', 'chromium.launch({headless:true})', 'chromium.launch({headless:true, ...(process.env.CHROMIUM_PATH ? {executablePath:process.env.CHROMIUM_PATH} : {})})')

# Contract changes are additive; preserve historical decision entries.
edit('docs/SDD.md', '**導覽**：全部 15 頁的 `.nav-links` 統一 12 連結（why→about）；', '**導覽**：根層 `.nav-links` 統一 13 連結（自我釐清之後為「免費二手」，其餘順序不變；P1-25），英文完整頁與 Quick Start 另提供標示中文的免費二手入口；')
edit('docs/SPEC.md', '`free.html` 是獨立工具頁，保留既有 12 項全站導覽，首頁新增一張入口卡並於離澳與原市集頁交叉連結。', '`free.html` 是獨立工具頁；依 P1-25 納入全站主選單，首頁入口移至階段選擇旁，並於離澳、原市集、行前與住宿頁交叉連結。')
edit('docs/SPEC.md', '### 1.1 頁面清單（根層 15 頁＋404）', '### 1.1 頁面清單（根層內容頁＋404；以本表及產生器清單為準）')
with (ROOT/'docs/SPEC.md').open('a',encoding='utf-8') as f:
    f.write('''
## 7. P1-25 免費二手可發現性與分享

- 根層所有頁面（含 404）提供第 2 個「免費二手」原生導覽連結；free.html 唯一 aria-current。其他工具頁仍不加入主選單。完整英文頁與語言 Quick Start 連至 /free.html 並標示中文，不宣稱完整翻譯。
- 首頁雙入口位於四階段選擇之後、展開面板之前，直達 free.html#free-board 與 #publish；移除原下方重複卡，不改階段或護照判斷。行前與住宿頁補情境入口。
- 免費二手頁 768px 以下提供底部找物／送物操作列，保留底部安全空間。編輯欄位時隱藏，列印不顯示；原生錨點在無 JS 時仍有效。
- 分享僅讀城市選單，產生固定正式網域的 #free-board?city=... fragment；不含自由搜尋、表單內容或其他網址參數，不寫 storage、不定位、不自動讀取 GitHub。開啟連結僅預選有效城市並捲至看板，仍須使用者按載入才讀物品。
- 分享採裝置原生 share；不可用則複製，拒絕或失敗提供可手動複製的唯讀連結，取消不謊報成功。複製按鈕永遠可獨立使用。
- 不調整 GitHub 投稿／審核契約，不新增資料庫、登入服務或分析追蹤。
- 驗證：scripts/test_free_board_access.cjs（離線契約與分享函式）；scripts/test_free_board_access_browser.cjs（桌機、手機尺寸、鍵盤、深連結、分享失敗、no-JS）；原看板與地圖測試照常。
''')
with (ROOT/'docs/DECISIONS.md').open('a',encoding='utf-8') as f:
    f.write('''
## D-2026-09-17-01 — P1-25 免費二手入口優化

站長在確認主選單與使用門檻後要求「澳洲網站繼續優化」，本次依前述方案實作主選單、首頁雙入口、手機操作列與城市分享，沿用已授權的 repo 部署流程。僅就 free.html 取代 D-2026-09-02-03 的工具页不進 nav 規則，其他工具頁不變。醫師 writing-agent 與 Supabase 未修改。
P1-24 已由 PR #2／Pages run 35111266701 成功發布，本次同步其 ROADMAP 狀態，不假定真實帳號投稿已驗收。新分享功能僅傳固定城市 fragment，不傳草稿、搜尋字詞或聯絡資料，不代表已完成 OS 分享或使用者改善量測。執行測試與正式發布證據以本次 PR／Actions 為準，既有試算器 2/21 個測試失敗另行保留。
''')
for name in ('docs/SDD.md','docs/SPEC.md','docs/ROADMAP.md','docs/DECISIONS.md'):
    p=ROOT/name
    p.write_text(re.sub(r'最後更新 \d{4}-\d{2}-\d{2}', '最後更新 2026-09-17', p.read_text(encoding='utf-8'), count=1),encoding='utf-8')

# Common asset version: generated outputs are rebuilt, not hand-maintained.
for p in ROOT.rglob('*'):
    if '.git' in p.parts or p.suffix not in ('.html','.js','.py') or p.name == Path(__file__).name: continue
    text=p.read_text(encoding='utf-8')
    if '20260916-01' in text:
        p.write_text(text.replace('20260916-01','20260917-01'),encoding='utf-8')
for script in ('build_i18n.py','build_seo.py','build_search.py'):
    subprocess.run([sys.executable,str(ROOT/'scripts'/script)],cwd=ROOT,check=True)
print('P1-25 integration complete. Test and review before merge.')
