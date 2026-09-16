"""One-shot integration; feature branch only, removed before merge."""
from pathlib import Path
import re
ROOT=Path(__file__).resolve().parent.parent
p=ROOT/'scripts/build_seo.py'
s=p.read_text()
assert 'from ai_reading import' not in s
s=s.replace('from pathlib import Path\n','from pathlib import Path\nfrom ai_reading import build_assets, build_robots, decorate_page, reading_path\n',1)
marker='def page_url(page: str) -> str:'
s=s.replace(marker,'def page_modified(page: str) -> str:\n    return "2026-09-16" if page in {"free.html", "index.html", "market.html", "leave.html", "about.html"} else LAST_MODIFIED\n\n\n'+marker,1)
old='"2026-09-16" if page in {"free.html", "index.html", "market.html", "leave.html", "about.html"} else LAST_MODIFIED'
# Leave only the helper as date authority.
first=s.index(old)+len(old)
s=s[:first]+s[first:].replace(old,'page_modified(page)')
s=s.replace('    for url in urls:\n        rows.extend(', '    modified = {page_url(p): page_modified(p) for p in PAGES}\n    for url in urls:\n        rows.extend(',1)
s=s.replace('f"    <lastmod>{LAST_MODIFIED}</lastmod>"','f"    <lastmod>{modified.get(url, LAST_MODIFIED)}</lastmod>"',1)
s=s.replace('            lines.append(f"- [{title}]({page_url(page)}): {description}")','            lines.append(f"- [{title}]({page_url(page)}): {description}")\n            lines.append(f"  - [本頁 Markdown]({ORIGIN}/{reading_path(page)})")',1)
needle='    return "\\n".join(lines)\n\n\ndef build_content_status'
assert needle in s
s=s.replace(needle,'''    lines.extend(["", "## 純文字閱讀與機器索引", "",
        f"- [首頁 Markdown]({ORIGIN}/ai/index.md): 主頁公開內容的靜態閱讀版本。",
        f"- [逐頁與段落索引 JSON]({ORIGIN}/ai-index.json): 原頁、語言、段落連結、來源連結、審校範圍與內容雜湊。",
        f"- [公開攻略合併文字]({ORIGIN}/llms-full.txt): 繁中主頁與完整英文攻略的閱讀摘錄；建議先讀單頁，避免載入不相關內容。",
        "- 純文字由公開 HTML 自動產生，不是另一套改寫內容；沒有表單、個資、動態二手刊登或試算結果。",
        "- 來源查核日期沿用原頁，匯出不代表重新查核；Markdown 只是補充格式，不保證任何 AI 收錄或引用。",
        "", "### Full English reading copies", ""])
    for slug in FULL_TRANSLATION_SLUGS:
        lines.append(f"- [{slug} (Markdown)]({ORIGIN}/ai/en/{slug}.md): static reading copy; original English guide and official sources govern.")
    return "\\n".join(lines)


def build_content_status''',1)
s=s.replace('            "## Non-content and personal-data boundaries",','''            "## Reading copies and discovery",
            "",
            f"Per-page Markdown: {ORIGIN}/ai-index.json (explicit public-page allowlist).",
            f"Combined public reading collection: {ORIGIN}/llms-full.txt; prefer relevant single-page copies.",
            "Reading copies are generated from the same public HTML, not AI rewrites or privileged bot-only answers. They retain sources, original dates and review scope.",
            "Forms, private data, live giveaway listings and interactive-tool results are not exported. A listing-free export is not an empty-stock claim.",
            "Claude-SearchBot and Claude-User have explicit robots groups with the same private-route exclusions as the wildcard group. Training preferences are separate; this change does not grant a new training licence.",
            "Readability is not a promise of crawling, indexing, ranking or citation by any AI service.",
            "",
            "## Non-content and personal-data boundaries",''',1)
s=s.replace('output = {ROOT / page: update_page(page, sources[page]) for page in PAGES}', 'output = {ROOT / page: decorate_page(page, update_page(page, sources[page]), ORIGIN) for page in PAGES}',1)
a=s.index('    output[ROOT / "robots.txt"] = (');b=s.index('    output[ROOT / "llms.txt"]',a)
s=s[:a]+'    output[ROOT / "robots.txt"] = build_robots(ORIGIN)\n'+s[b:]
needle='    output[ROOT / "crawler-policy.txt"] = build_crawler_policy()\n    return output'
assert needle in s
s=s.replace(needle,'''    output[ROOT / "crawler-policy.txt"] = build_crawler_policy()
    reading_sources = {page: output[ROOT / page] for page in PAGES}
    for slug in FULL_TRANSLATION_SLUGS:
        page = f"lang/en/{slug}/index.html"
        output[ROOT / page] = decorate_page(page, (ROOT / page).read_text(encoding="utf-8"), ORIGIN)
        reading_sources[page] = output[ROOT / page]
    for relative, text in build_assets(reading_sources, json.loads(output[ROOT / "content-status.json"]), ORIGIN).items():
        output[ROOT / relative] = text
    return output''',1)
s=s.replace('        if not args.check:\n            path.write_text','        if not args.check:\n            path.parent.mkdir(parents=True, exist_ok=True)\n            path.write_text',1)
p.write_text(s)
# Register the feature and exact contract without claiming a new policy review.
p=ROOT/'docs/ROADMAP.md';s=p.read_text();line='| P1-26 | AI／Claude 公開內容探索、純文字閱讀與抓取驗收 | 程式完成／本機驗證 | Cloudflare 真實爬蟲事件需站長帳號驗收；不保證收錄 | SPEC §8 | scripts/test_ai_reading.py |\n'
s=s.replace('| P1-25 |',line+'| P1-25 |',1);p.write_text(s)
p=ROOT/'docs/SPEC.md';p.write_text(p.read_text()+'''

## 8. AI／Claude 公開內容探索（P1-26）

`build_seo.py` 與 `ai_reading.py` 同源產生 `ai/*.md`、`ai/en/*.md`、`ai-index.json` 與 `llms-full.txt`。只取 `PAGES` 與完整英文攻略的 main；不匯出 form、script、hidden、動態刊登、試算結果、API、CRM、測試或交接文件。不是為爬蟲另寫不同答案，也不抓取外部內容。

原頁是 canonical；保留原始查核日期、來源連結、證據卡範圍、未經專業審校狀態。新格式產生不升級政策或查核日期。sitemap 的根層 lastmod 與既有 content-status 記錄一致，不再把新增頁標成共同舊日期。

各匯出頁原生 head alternate 與 footer 提供逐頁純文字及索引；無 JS 可用。`llms.txt` 仍保留所有原頁，另連單頁 Markdown 與合併文字。Markdown 不包括即時二手庫存，不讀 GitHub 刊登、不繞過載入同意。

Claude-SearchBot、Claude-User 的 robots group 明示允許公開內容，逐組重複私人端點排除；wildcard 的既有權限不放寬，訓練授權不另變更。robots 不是安全防護；Cloudflare 規則及驗證爬蟲存取為獨立層。

驗收：`python scripts/build_seo.py --check`、`python scripts/test_ai_reading.py`、`build_i18n.py --check`、`build_search.py --check`。正式 GET 需比對檔案 bytes 與 UA 相容性；模擬 UA 不等於真實 Anthropic 爬蟲，HTTP 200 也不是收錄或引用證據。操作手冊見 AI_DISCOVERY.md。
''')
p=ROOT/'docs/SDD.md';p.write_text(p.read_text()+'''

## AI 閱讀衍生格式（P1-26）

靜態 HTML 仍為唯一內容來源，既有 SEO 產生器同時匯出明列白名單頁面的閱讀副本，不引入網站執行時建置、RAG、外部模型或資料庫。`scripts/ai_reading.py` 使用 Python 標準庫；`scripts/test_ai_reading.py` 驗證同源、來源與隱私排除。`ai-index.json` 提供來源網址、語言、段落與 SHA-256，不增加第三方追蹤。
''')
p=ROOT/'docs/DECISIONS.md';p.write_text(p.read_text()+'''

## D-2026-09-17-02 — P1-26 AI／Claude 可讀性

站長要求改善 AISEO，特別是 Claude。採公開 HTML 同源純文字、明確搜尋／使用者爬蟲指令與只讀線上驗收；不改醫師／Supabase、不放寬安全層、不新增模型訓練授權、不製造收錄或引用保證。改版前 run 35125014325 的 20 組 UA／核心路徑 GET 皆 200，robots 沒有全面禁止 Claude；此為 GitHub runner 的模擬 UA，不是真實爬蟲事件，截圖中的失敗原因仍待 Cloudflare 狀態碼與規則查核。工程驗收及正式部署證據記錄於本次 PR，不把純文字生成日當成事實查核日。
''')
p=ROOT/'docs/README.md';s=p.read_text();s=s.replace('| [`SDD.md`]', '| [`AI_DISCOVERY.md`](AI_DISCOVERY.md) | AI／Claude 探索格式、Cloudflare 只讀排查與驗收邊界 | 爬取或機器閱讀格式變動 |\n| [`SDD.md`]',1);p.write_text(s)
p=ROOT/'README.md';p.write_text(p.read_text()+'''

## AI／Claude 可讀性（P1-26）

公開 HTML 為 canonical，`llms.txt` 列出原頁及同源 Markdown，`ai-index.json` 提供逐頁／段落／来源連結與原始審校範圍，`llms-full.txt` 合併公開閱讀文字。不含表單、私人資料、動態二手刊登或互動結果。修改攻略後請跑 `python scripts/build_seo.py` 與 `python scripts/test_ai_reading.py`，避免閱讀副本漂移。Cloudflare 排查見 [AI_DISCOVERY](docs/AI_DISCOVERY.md)；爬取成功不保證 AI 收錄或引用。
''')
for name in ['SDD.md','SPEC.md','ROADMAP.md','DECISIONS.md','README.md']:
 p=ROOT/'docs'/name;p.write_text(re.sub(r'最後更新 \d{4}-\d{2}-\d{2}','最後更新 2026-09-17',p.read_text(),count=1))
print('P1-26 integration prepared; run builders and tests before branch commit.')
