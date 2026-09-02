# 澳打指南針 — 路線圖與待辦狀態（ROADMAP）

> 版本 2.0｜最後更新 2026-09-02｜這是全部 P0／P1／P2 編號的**唯一來源**。
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
| P0-7 | 首頁單一漏斗釐清器 | 決策已定／設計未開始 | 站長審核 CLARIFIER_SPEC §3–§7 設計後才可動工 | CLARIFIER_SPEC.md | D-2026-09-02-01 |
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
| P2-1 | 雙主題「Red Centre／Coast」切換 | 未開始 | 先解 token 三態、附設計稿 | ROADMAP §2.2 | — |
| P2-2 | 英文版（i18n） | 部分完成（Quick Start 38 語言＋7 頁完整英文 beta） | 母語或合格專業人士校對後才可標 reviewed | SPEC §1.2 | ab6dbbf、6cc0450、30b7902 |
| P2-3 | 手機捲動繪製成本 | 不排期／先量測 | 兩變體各 5 次隔離量測 | PERFORMANCE_AND_RETENTION_SPEC P2-3 | — |
| P2-4 | CJK 網頁字型載入策略 | 不排期／先量測 | 確認 LCP 元素是否受字型 swap 影響 | PERFORMANCE_AND_RETENTION_SPEC P2-4 | — |

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

| 項目 | 位置 | 來源 | 處理方式 |
|---|---|---|---|
| 全站 nav 不一致：`market.html`、`simulator.html` 的 nav 有 13 連結（含 market），其餘 13 頁 12 連結、未連到 market | `scripts/check.ps1:157` 已把例外寫死 | 2026-09-02 漂移稽核 | 站長決定 market 是否進全站 nav；決定後統一 15 頁並改 check.ps1 |
| GA4 填入 ID 前，`assets/analytics.js` 會在所有頁面送 page view，未排除詐騙、健康、剝削頁 | `assets/analytics.js` | Codex 反方審查 2026-09-02 | 在 P0-3 前加入敏感頁排除清單並寫入 SPEC §1.5 驗收；未完成不得填 ID |
| `scripts/check.ps1` 未斷言 `defer`，P0-5 修復可被回歸而不被發現 | `scripts/check.ps1` script-order 區塊 | Codex 反方審查 2026-09-02 | 加一條「15 頁 5 支 `<script src>` 皆含 `defer`」斷言 |
| SPEC §4 驗收第 3、4 項（集簽快查器測試組、試算器基準）仍是人工步驟 | `scripts/check.ps1` | 2026-09-02 漂移稽核 | 以 node 或 PowerShell 回放兩組固定案例；完成前在 SPEC §4 標為人工 |
| `/api/metrics` 無 Origin 即放行 | `worker/src/cors.ts`、`worker/src/index.ts` | PERF spec §4 | 部署前要求 Origin 存在且在白名單 |
| `assets/og-cover.png` 559 KB | `assets/og-cover.png` | PERF spec §4 | 壓至 200 KB 以下 |
| `@types/node: "latest"` | `worker/package.json` | PERF spec §4 | 釘住版本 |
| `.codex-remote-attachments/` 未忽略 | `.gitignore` | PERF spec §4 | 加入忽略清單 |
| 更正案件時 `delete_after` 重推 24 個月 | `worker/src/repository.ts` | PERF spec §4 | 對外措辭與行為對齊後決定 |
| CSS 宣告未被請求的字重 800 | `assets/style.css` | PERF spec P2-4 | 併入 P2-4 |
