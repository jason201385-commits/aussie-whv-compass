# 澳打指南針 — 路線圖與待辦狀態（ROADMAP）

> 版本 2.0｜最後更新 2026-09-03｜這是全部 P0／P1／P2 編號的**唯一來源**。
> 任何規格檔（`SPEC.md`、`PERFORMANCE_AND_RETENTION_SPEC.md`、`CLARIFIER_SPEC.md`）
> 只能引用這裡已存在的 ID；新增 ID 先在本表登記，`scripts/check.ps1` 會檢查。
> 狀態敘述與證據不寫在這裡，寫在 `DECISIONS.md`，本表只留一行狀態與指標。

## 0. 狀態詞彙（只准用這幾個）

| 狀態 | 意義 |
|---|---|
| 已上線 | 已 push 到 `main`，線上站點回放通過 |
| 程式完成／本機驗證 | repo 內程式與測試完成，正式啟用仍卡人工 gate |
| 部分完成 | 第一批已上線，範圍未全部完成 |
| 人工前置未完成 | 只有站長能做的事尚未完成（帳號、付款、DNS、secret） |
| 決策已定／設計未開始 | 站長已拍板方向，規格設計章節尚未寫 |
| 未開始 | 規格存在，尚無程式 |
| 不排期／先量測 | 未取得隔離量測前不得動工 |

## 1. 總表

| ID | 標題 | 狀態 | 人工 gate／相依 | 規格所在 | 證據指標 |
|---|---|---|---|---|---|
| P0-1 | 贊助整合（BMC＋綠界） | 人工前置未完成 | 站長完成 BMC 付款設定與綠界公開連結 | ROADMAP §2.1 | DECISIONS D-2026-08-29-02 |
| P0-2 | 自訂網域 `www.aussiewhvcompass.com` | 已上線 | — | SDD §2 | f563578、02d7e01 |
| P0-3 | Search Console 與量測人工前置 | 人工前置未完成 | 站長 DNS 驗證、sitemap 提交；GA4／CWA 依 D-2026-09-02-01 | MEASUREMENT_SETUP.md、SPEC §1.5 | — |
| P0-4 | Cloudflare 最小後端正式資源 | 人工前置未完成 | 站長建立 Worker／D1／Turnstile／寄信並輸入 secrets | SDD §3.1、worker/README.md | 713f310（本機骨架） |
| P0-5 | 五支腳本 render-blocking | 已上線 | — | PERFORMANCE_AND_RETENTION_SPEC P0-5 | a823e88；D-2026-09-01-01 |
| P0-6 | 無障礙倒退三項 | 已上線 | — | PERFORMANCE_AND_RETENTION_SPEC P0-6 | a823e88；D-2026-09-01-01 |
| P0-7 | 首頁單一漏斗釐清器 | 程式完成／本機驗證（首頁釐清器可上線；AI 兜底待 P0-4） | P0-4 與 `MINIMAX_API_KEY`（線路已實測，D-2026-09-02-05）；C-5 併入 P1-21、§6 指標併入 P1-22、radiogroup 併入 P0-10 | CLARIFIER_SPEC.md（as-built §0.1） | D-2026-09-02-04；SPEC §1.2 三列 |
| P0-8 | 首屏重構（問題句 hero、階段 chips 進第一屏、安全出口單列、四格入口刪除） | 已上線 | 驗收第 5 條 LCP 須部署後在正式站重量；驗收第 1 條後半（前兩階段第一個需求 chip 進 812px）本機未達，見 D-2026-09-03-02 | OPTIMIZATION_PLAN.md | D-2026-09-02-06；D-2026-09-03-02、D-2026-09-03-03 |
| P0-9 | 搜尋強化（查詢改寫、意圖同義詞表、熱門 chip 綁錨點、462 英文頁進索引） | 已上線 | — | OPTIMIZATION_PLAN.md | D-2026-09-02-06；D-2026-09-03-02、D-2026-09-03-03 |
| P0-10 | 釐清器口語文案與護照分支（台灣／中國護照用語切換、462 摘要卡、radiogroup、「看公開討論」） | 已上線 | — | OPTIMIZATION_PLAN.md | D-2026-09-02-06；D-2026-09-03-02、D-2026-09-03-03 |
| P0-11 | 內容頁答案卡（取代 quick-answer hub 與證據卡的首屏版面，先做五個高風險頁） | 已上線 | 其餘 7 頁待另開 ID | OPTIMIZATION_PLAN.md | D-2026-09-02-06；D-2026-09-03-02、D-2026-09-03-03 |
| P1-1 | 採收季節月曆（work.html） | 已上線 | — | SPEC §1.2 | 3375363、eacc868 |
| P1-2 | 我的行前海報 PNG 輸出 | 程式完成／本機驗證 | iPhone Safari 與 Android Chrome 實機下載 | SPEC §1.2 | 063f966 |
| P1-3 | 動態剪紙 hero | 已上線 | — | SDD §4.3 | c720dec |
| P1-4 | 友善首頁快速分流 | 已上線（將由 P0-7 重建） | — | SPEC §1.2 | 5add4e6、294fe2a、070f3cc |
| P1-5 | 分層證據卡與內容狀態 | 部分完成（9 頁） | — | SDD §4.3 | 9647d89 |
| P1-6 | 簡約檸檬圖文系統 | 部分完成（4 頁） | — | SDD §4.3 | d89fc60 |
| P1-7 | SEO、AI 探索與內容權利 | 已上線 | — | SPEC §1.4 | 2ddf0f5、1902cca |
| P1-8 | Cloudflare Worker／D1 基礎 | 程式完成／本機驗證 | P0-4 | SDD §3.1 | 713f310；D-2026-08-30-02 |
| P1-9 | 私人需求單與 CRM | 程式完成／本機驗證 | P0-4 | SPEC §1.2 | 730015a；D-2026-08-30-02 |
| P1-10 | D+ 聚合量測 | 程式完成／本機驗證 | P0-4 | SPEC §1.5 | 9822e11；D-2026-08-30-02 |
| P1-11 | 商業合作與第三方入口治理 | 已上線 | — | SDD §3.2 | 37031d9 |
| P1-12 | 第一輪公開使用者回饋修正 | 已上線 | — | DECISIONS D-2026-08-30-03 | cf86d79、fbc9924 |
| P1-13 | 住宿合法混合搜尋 | 程式完成／本機驗證（公開開關 false） | provider 書面授權（ACCOMMODATION_PROVIDER_ONBOARDING.md） | SPEC §1.2 | 51df889、8f86623、d5c9233、af41208 |
| P1-14 | 長頁問題優先閱讀 | 已上線（12 頁） | — | SDD §4.3、SPEC §1.2 | 7713276、c8e5c8a |
| P1-15 | iOS ITP 儲存壽命限制 | 未開始 | — | PERFORMANCE_AND_RETENTION_SPEC P1-15 | — |
| P1-16 | `.ics` 行事曆匯出 | 未開始 | iOS Safari 下載機制實機驗證；DASP 提醒須拆成「離澳前整理」與「符合資格後提交」兩件事（D-2026-09-02-02） | PERFORMANCE_AND_RETENTION_SPEC P1-16 | — |
| P1-17 | 加入主畫面引導 | 未開始 | 相依 P1-15 | PERFORMANCE_AND_RETENTION_SPEC P1-17 | — |
| P1-18 | 危機優先開頭（五個恐慌頁） | 未開始 | 驗收改用實測 time-to-first-action（D-2026-09-02-02） | PERFORMANCE_AND_RETENTION_SPEC P1-18 | — |
| P1-19 | 「網傳 vs 官網」對照塊 | 未開始 | — | PERFORMANCE_AND_RETENTION_SPEC P1-19 | — |
| P1-20 | 「你上次看過之後改了什麼」 | 未開始 | 相依 `build_seo.py` 產出 freshness 資料 | PERFORMANCE_AND_RETENTION_SPEC P1-20 | — |
| P1-21 | 社團目錄 JSON 與 communities.html 子頁（C-5 地區×需求推薦） | 未開始 | 相依 P0-10 | OPTIMIZATION_PLAN.md | D-2026-09-02-06 |
| P1-22 | 釐清器與 AI 兜底指標（D+ 白名單擴充、GA4 事件表、判讀規則） | 未開始 | P0-3（CWA token、GA4 ID）與 P0-4（D+ 部署） | OPTIMIZATION_PLAN.md | D-2026-09-02-06 |
| P1-23 | AI 兜底正式啟用（P0-4 啟用步驟、第一階段 links-only、red-team 驗收；intent 待命中率達標再重啟） | 程式完成／本機驗證（線路已實測，啟用待 P0-4） | P0-4（D1、Turnstile、secrets、`--env production` 部署） | OPTIMIZATION_PLAN.md、worker/README.md | D-2026-09-02-05、D-2026-09-02-06 |
| P2-1 | 雙主題「Red Centre／Coast」切換 | 未開始 | 先解 token 三態、附設計稿 | ROADMAP §2.2 | — |
| P2-2 | 英文版（i18n） | 部分完成（Quick Start 38 語言＋7 頁完整英文 beta） | 母語或合格專業人士校對後才可標 reviewed | SPEC §1.2 | ab6dbbf、6cc0450、30b7902 |
| P2-3 | 手機捲動繪製成本 | 不排期／先量測 | 兩變體各 5 次隔離量測 | PERFORMANCE_AND_RETENTION_SPEC P2-3 | — |
| P2-4 | CJK 網頁字型載入策略 | 不排期／先量測 | 確認 LCP 元素是否受字型 swap 影響 | PERFORMANCE_AND_RETENTION_SPEC P2-4 | — |
| P2-5 | 「想去哪／過什麼生活」與買車需求分流內容 | 未開始 | 內容需官方查證；不排名城市 | OPTIMIZATION_PLAN.md | D-2026-09-02-06 |
| P2-6 | 工具子頁 tools.html（遊戲區移出首頁） | 未開始 | 相依 P0-8 | OPTIMIZATION_PLAN.md | D-2026-09-02-06 |

## 2. 未完成項目的需求摘要

只寫還沒做完的項目。已上線項目的行為契約在 `SPEC.md` §1，不重複。

### 2.1 P0-1 贊助整合

前置：站長本人完成 Buy Me a Coffee 付款方式設定，並提供綠界公開連結
`https://p.ecpay.com.tw/<代碼>`。2026-08-29 查核：`https://buymeacoffee.com/easyknowai`
公開頁 HTTP 200，但後台仍提示需設定付款方式；綠界連結未提供。

執行：`about.html` 移除「籌備中」與 TODO，換成兩顆 `.btn`（台灣讀者→綠界、海外→BMC）；
新增 `.github/FUNDING.yml`（`custom: [<兩個連結>]`）；回饋列第三顆贊助入口需站長同意，預設不做。

驗收：兩連結 HTTP 200；about.html 無「籌備中」；repo 首頁出現 Sponsor 鈕；`scripts/check.ps1` 通過。
不得以單一網址冒充完整 P0-1。

### 2.2 P2-1 雙主題切換

手動主題切換（localStorage 記憶）疊在既有深淺色之上；動工前先解 token 三態複雜度並附設計稿。

### 2.3 P2-2 英文版第二階段 backlog

替 visa／prep／cost／housing／work／scam／health 找母語或合格專業人士校對；再依使用量擴充其他語言與頁面。
台灣特定內容（健保核退、台幣、駐外館處）需在地化改寫而非直譯。

### 2.4 P0-3、P0-4 的人工前置清單

見 `SPEC.md` §0 執行者邊界與 `MEASUREMENT_SETUP.md`、`worker/README.md`。agent 不得代辦帳號、付款、DNS 驗證碼、secret。

## 3. 已知漂移與小型加固（未編號，先到先做）

| 項目 | 位置 | 來源 | 狀態（2026-09-02） |
|---|---|---|---|
| 全站 nav 不一致（`market.html`、`simulator.html` 曾自加第 13 個連結） | `scripts/check.ps1` nav 規則 | 2026-09-02 漂移稽核 | 已處理：站長決定工具頁不進 nav，15 頁統一 12 連結，`check.ps1` 改為強制（D-2026-09-02-03） |
| GA4 填入 ID 前必須排除詐騙、健康頁的 page view | `assets/analytics.js` | Codex 反方審查 2026-09-02 | 已處理：`SENSITIVE_PATHS`＋`scripts/test_analytics.cjs`；範圍為整頁清單，見 SPEC §1.5 |
| `check.ps1` 未斷言 `defer` | `scripts/check.ps1` | Codex 反方審查 2026-09-02 | 已處理：根層＋`lang/` 全部頁面的本機 script 必須含 `defer` |
| SPEC §4 的集簽快查器測試組與試算器基準仍是人工步驟 | `scripts/test_tools.mjs` | 2026-09-02 漂移稽核 | 已處理：21 案例回放，納入 `check.ps1` |
| `/api/metrics` 無 Origin 即放行 | `worker/src/cors.ts` | PERF spec §4 | 已處理：所有 POST 路由要求 Origin 在白名單；測試涵蓋 metrics、contact，其餘 POST 路由靠同一入口 |
| `assets/og-cover.png` 559 KB | `assets/og-cover.png` | PERF spec §4 | 已處理：8-bit 索引色 97 KB，1200×630 不變 |
| `@types/node: "latest"` | `worker/package.json` | PERF spec §4 | 已處理：釘 26.4.0 |
| `.codex-remote-attachments/` 未忽略 | `.gitignore` | PERF spec §4 | 已處理 |
| 更正案件時 `delete_after` 重推 24 個月 | `worker/src/repository.ts` | PERF spec §4 | 待站長決定對外措辭（建立後 24 個月，或最後聯絡後 24 個月） |
| CSS 宣告未被請求的字重 800 | `assets/style.css` | PERF spec P2-4 | 前提可能已過時（P0-6 已把 34 處 800 改 900），併入 P2-4 時先重新確認 |
| `worker/` 其他 POST 路由缺逐路由 Origin 測試 | `worker/test/` | 2026-09-02 完整性批評 | 未處理：目前靠 `index.ts` 單一入口保證；新增路由時補測試 |
| 首頁重建後 `check.ps1` 首頁區塊需同步 | `scripts/check.ps1` 首頁區塊 | P0-7 | 已處理：首頁區塊重寫為釐清器契約（D-2026-09-02-04） |
| 首頁 34px 點擊目標（熱門搜尋 chips、六大職類連結） | `assets/style.css` 640px 區塊 | 2026-09-02 瀏覽器回放 | 已處理：行動版 `min-height: 44px` |
| `cost.html` WA rego 免費查詢 URL 帶 `?527=` 參數，伺服器 302 改寫為 `?0`（瀏覽器可用、非瀏覽器工具進入重導） | `cost.html` 買車表 WA 列 | 2026-09-03 查核（states.md） | 待站長決定：改連不帶參數的 `https://online.transport.wa.gov.au/webExternal/registration/`（實作時瀏覽器開一次確認） |
| `cost.html` QLD 列連總覽頁，14 天過戶與 safety certificate 規則在 `/transport/registration/transfer` 與 `/roadworthy` 子頁 | `cost.html` 買車表 QLD 列 | 2026-09-03 查核（states.md） | 待站長決定：改連 `/transfer`（八州表其他列皆為過戶頁） |
| 首頁社團區 Facebook 搜尋轉接未登入回 Not Found | `index.html#communities` 兩個平台搜尋鈕 | 2026-09-02 查核（fairwork-community.md） | 未處理：按鈕旁加「需先登入 Facebook」並顯示查詢字串；併入 P1-21 |
| `about.html` 隱私段落尚無 MiniMax 與 Turnstile 揭露 | `about.html#analytics` | D-2026-09-03-01 | 未處理：依 OPTIMIZATION_PLAN P1-23 揭露段落撰寫；填入 `MINIMAX_API_KEY` 前完成 |
| 千問 UX 建議增補（`docs/UX-SUGGESTIONS.md`，UX-1～UX-10 與文案 D-1～D-3） | `docs/UX-SUGGESTIONS.md` | 2026-09-03 外部建議 | 待站長裁決：主 session 評估見該檔 §F（建議採納：麵包屑、其餘 7 頁的「30 秒版」一句、updated-tag 徽章化與柔化 CSS；不採納：新手一鍵開始（重複釐清器）、安全出口 FAB（P0-8 安全列已常駐）、漢堡選單（SDD §6 教訓 3）、section 預設折疊、閱讀進度條、信任數字列） |
| P0-8 驗收 5：正式站 LCP／CLS 未取得有效量測 | 正式站首頁 | D-2026-09-03-03 | 未處理：本環境 PerformanceObserver 收不到 paint、trace 全距達中位數 242%（3,712–14,753 ms）整批作廢；需在噪音較低的環境重跑各 5 次 |
| LCP 元素已由 h1 變成 `H2#site-search-home-title`，且候選不穩定（nodeId 274／275／279） | `index.html` hero 與搜尋區 | D-2026-09-03-03 | 未處理：h1 縮為 24px 兩行後繪製面積小於搜尋區 h2；先重量再決定是否調整 hero 版面 |
| 慢速情境 CLS 0.29（字型晚到造成 `SECTION#search` 重排） | `assets/style.css` 搜尋區、Google Fonts | D-2026-09-03-03 CLSCulprits | 未處理：改版前基線 5 次皆 0.00；待清淨環境重驗，若可重現則與 P2-4 CJK 字型策略一起處理 |
| C-5 依地區×需求推薦社團 | 首頁 `#communities` | CLARIFIER_SPEC §5 | 併入 P1-21（`OPTIMIZATION_PLAN.md`）；現況出口只連 `#communities` 不帶需求 |
| CLARIFIER_SPEC §6 釐清器專屬指標（各層完成率、出口點擊、AI 觸發率、超額次數） | `assets/main.js` D+ 鍵、`worker/src/repository.ts` | CLARIFIER_SPEC §6 | 併入 P1-22（`OPTIMIZATION_PLAN.md`）；受 P0-3／P0-4 gate |
| 無 JS 與 `prefers-reduced-motion` 只做靜態檢查，未在瀏覽器實測 | `index.html`、`assets/style.css` | 2026-09-02 完整性批評 | 未處理：下一次回放加 JS 停用與 reduce 模擬 |
| AI 每日額度存 D1 一列聚合 vs CLARIFIER_SPEC §4「不寫 D1」字面 | `worker/src/assist.ts`、`migrations/0003` | 2026-09-02 完整性批評 | 待站長決定：接受「每日一列聚合計數」（不含任何問題文字）或改用 KV |
| MiniMax 端點主機 `api.minimaxi.com` 與國際文件差異未驗證 | `worker/wrangler.jsonc` `ASSIST_BASE_URL` | 2026-09-02 完整性批評 | 已處理：2026-09-02 晚間以本機環境既有 key 對 `api.minimaxi.com/v1/chat/completions` 做受控呼叫（D-2026-09-02-05）；發現推理 `<think>` 放在 `content`、`max_tokens` 200 會截斷成零連結，已改 1024 與 20 秒逾時並加提示規則 5；矩陣 4 組 24 題全部回傳有效站內連結 |
| 釐清器護照選擇用三個 `aria-pressed` 切換，語意不如 `radiogroup`／`radio` | `index.html` 護照區、`assets/main.js` | Codex 審查 2026-09-02 | 併入 P0-10（`OPTIMIZATION_PLAN.md`） |
| `check.ps1` 釐清器斷言多為字串存在，無法證明零請求與焦點行為 | `scripts/check.ps1`、vm 煙霧測試（暫存區） | Codex 審查 2026-09-02 | 未處理：把 `clarifier-smoke.js` 收進 `scripts/` 並掛進 `check.ps1` |
