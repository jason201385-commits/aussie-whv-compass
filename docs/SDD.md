# 澳打指南針 — 系統設計文件（SDD）

> 版本 1.1｜2026-08-30｜本文件與 `docs/SPEC.md` 為一組交接文件，
> 供任何後續開發者（人類或 AI agent）在不遺失設計決策脈絡的前提下繼續開發。

## 1. 專案概述

**澳打指南針（Aussie WHV Compass）**：以台灣打工度假者為繁中維護基準，逐步擴充至
所有目前可申請澳洲 Working Holiday／Work and Holiday 的護照使用者的一站式開源攻略。
核心定位是：「我們想成為對打工度假者最友善的網站——不替你草率做決定，而是幫你
看懂選項、查到依據，找到適合自己的下一步。」正式網址 `https://www.aussiewhvcompass.com/`（裸網域自動導向 `www`），
儲存庫 `github.com/jason201385-commits/aussie-whv-compass`。

### 1.1 不可協商的原則（任何後續開發不得違反）

1. **公開內容免費、合作透明**：本站公開攻略與核心工具不設付費牆；受邀課程、講座、
   客製工作坊、網站與數位工具或內容製作可以另行報價。
   付費不得購買推薦、排名或有利說法，任何商業關係必須明示；不放追蹤廣告。
2. **可查證**：每個重要數字附官方來源連結與「YYYY-MM 查核」標籤；查不到寧可標
   「未查證／以官方為準」，不填看起來自信的舊數字。
3. **防詐騙頁只講手法不列黑名單**：不點名任何具體公司、農場、仲介、個人。
4. **禁用 emoji**：所有圖示一律用內嵌 SVG（見 §4.4）。站長明確指示。
5. **資料最小化、敏感行為不追蹤**：工作表、清單、試算與搜尋維持只在本機；第一階段
   不啟用 GA4、第三方 pixel、session replay 或跨頁識別。獲准的最小後端只可處理私人需求單、
   確認信、刪除申請與無個人識別的 D+ 聚合計數，不得把 CRM 與瀏覽行為連結。
6. **能點選就不打字**：互動工具優先提供快選籤（chips）、滑桿、下拉選單。
7. **不做簽證或移民代辦**：站長不是澳洲註冊移民代理或澳洲執業律師；不論是否收費，
   都不得提供個人簽證選項建議、準備或代填申請、代表申請人處理簽證事項。可連到 OMARA
   官方名冊與中立轉介；目前沒有指定合作代理或佣金轉介。若未來有特定商業轉介，必須在連結
   旁明示關係；是否收取轉介費須先完成法律與稅務確認，確認前不得啟用，且未經使用者同意不得傳送其資料。
8. **先解決問題再談支持**：首頁不放站長服務招攬；贊助與私人合作只在 About 的次要區段，
   不影響內容完整度、官方出口、排序或風險揭露。
9. **資料性質要能辨認**：官方依據、本站編輯整理與社群第一手回報必須分開標示。本站不是
   個人遊記，不得把未親歷內容寫成親身經驗；查不到來源就標「待查證」。

## 2. 系統架構

- **公開前端形態**：純靜態 HTML/CSS/JS，**零框架、零建置步驟**——刻意選擇，讓不會寫程式的
  貢獻者也能改內容。已批准的 Worker 必須放在獨立目錄、保持無框架，不得迫使內容頁經過 bundler。
- **部署**：GitHub Pages（main 分支根目錄，legacy build），`CNAME` 固定為
  `www.aussiewhvcompass.com`。Cloudflare DNS 的 `www` CNAME 直接指向
  `jason201385-commits.github.io`，裸網域以 GitHub Pages 官方 A／AAAA 記錄接入並
  由 Pages 導向 `www`；不得使用 wildcard DNS。
  改檔 → commit → push 即自動部署（1–2 分鐘）。
- **快取**：GitHub Pages 資產 `max-age=600`（10 分鐘）。全站本機 CSS／JS／資料檔
  共用同一個 `?v=` 版本查詢碼；任何這些資產異動時，push 前必須全站同步升版。
  驗證剛部署的 HTML 時仍加獨立 cache-bust，否則可能看到舊版並誤判失敗。
- **外部依賴**：現行前端只有 Google Fonts。GA4 程式保留但 ID 為空，第一階段不得啟用。
  目標後端使用 Cloudflare Worker、D1、Turnstile 與可替換交易信服務；正式資源尚未完成 P0 前，
  不得把本機 mock 或設定範本描述成已上線。

### 2.1 檔案地圖

| 檔案 | 角色 |
|---|---|
| `index.html` | 首頁：使命 hero、4 個緊急安全出口、4 段旅程／12 張真實情境問題卡、後移但不隱藏的資料來源模型、全站搜尋、原生兩題引導、第三方 Perth 生活社群、最近閱讀、收藏、工具與回報修正入口；不放站長服務招攬 |
| `why.html` | 自我釐清雙模式：8 題快思四面向＋8 題慢想工作表、研究／非診斷邊界、localStorage、匯出 txt |
| `visa.html` | 簽證與集簽＋**集簽郵遞區號初篩** |
| `prep.html` | 行前準備與落地 SOP＋**互動檢查清單** |
| `simulator.html` | **5 分鐘角色設定＋抵澳 30 天模擬器**：固定六情境、同分頁 session 暫存、緊急關卡在選項前提供 `tel:000` 安全中斷、官方出口與第 30 天行動地圖；從攻略返回或重新整理可繼續，重開需確認，不做成功／簽證／醫療預測；無 JavaScript 時隱藏不可操作表單並提供靜態替代入口 |
| `cost.html` | 物價薪水稅務＋Perth 採買、簡易食譜、二手衣／平價新品＋主要找車／自行刊登平台與官方查核＋**存錢試算器** |
| `housing.html` | 住宿與租屋：一次輸入地點的五平台搜尋轉接器、短住訂房、合租／整租原始平台入口、WA 官方租屋權益與安全清單 |
| `work.html` | 找工作（管道、查核、證照、履歷、官方月份工具、四季職類與條件式抵達建議、工傷） |
| `scam.html` | 防詐騙（三道防線、16 手法、救濟包）＋**防詐測驗** |
| `english.html` | 英文資源與策略 |
| `health.html` | 保險就醫心理安全 |
| `leave.html` | 報稅退休金離澳＋**DASP 扣繳粗估**＋**本機離澳收尾清單** |
| `pr.html` | PR 路徑總覽 |
| `about.html` | 關於、官方／編輯／社群資料分層、回報修正、私人 Email／需求單、公開 GitHub 共編、合作治理、贊助、授權、免責 |
| `404.html` | 自訂錯誤復原頁：保留 noindex，導回最近閱讀、卡關捷徑與四階段旅程 |
| `assets/style.css` | 全站唯一樣式表（含設計 token，見 §4） |
| `assets/lemon-pattern.svg` | 參考生活照片重畫的本地裝飾圖樣；淡藍奶油條紋由 CSS 產生，SVG 只含不規則檸檬與灰綠葉 |
| `assets/og-cover.svg`／`og-cover.png` | 1200×630 社群分享圖的可編輯來源與正式點陣資產；延伸既有檸檬布紋，不使用使用者照片 |
| `assets/main.js` | 全站共用：SVG sprite 注入、導覽標示、本機站內搜尋、回訪續接、頁尾旅程導覽、回饋列注入、chip 填字、自我釐清雙模式、D+ 固定類別彙總、私人需求單的 Email／複製備援與受控 Worker 漸進增強 |
| `assets/simulator.js` | 模擬器固定情境與狀態機；只處理白名單選項，使用版本化且嚴格驗證的 `sessionStorage` 保存目前分頁進度；不使用 `localStorage`、網路請求或自由文字，恢復已選關卡時不重複套用 delta |
| `assets/api-config.js` | 只含共用公開 API origin 與 Turnstile site key；P0-4 未完成時兩者必須留空，使 D+、站內送出與 CRM 管理 fail closed；不得放 secret |
| `assets/search-index.js` | 14 頁、122 個頁面／段落入口的靜態搜尋索引；首次開啟搜尋才同站載入，不含使用者輸入或隱藏／未啟用 UI 狀態 |
| `assets/i18n-locales.json`／`i18n.js` | 49 個目前可申請 417／462 的護照國家／地區、38 種主要語言 registry 與全站語言切換；每個 locale 必須標示 source／machine-unreviewed／english-fallback |
| `assets/analytics-config.js` | 公開 GA4 Measurement ID 設定；空字串代表停用，不得放帳號或憑證 |
| `assets/analytics.js` | Basic Consent GA4 loader：未同意不載入 Google tag；同意後只送 page view 與固定搜尋摘要 |
| `assets/tools.js` | 工具頁專用：快查器、試算器、清單、測驗、DASP 與住宿五平台搜尋轉接器（特徵偵測按頁啟用） |
| `assets/postcodes.js` | **官方集簽郵遞區號資料**（見 §5，更新程序必讀） |
| `.github/ISSUE_TEMPLATE/` | 結構化公開表單（report.yml／idea.yml／thanks.yml／collaborate.yml／config.yml） |
| `CNAME`／`sitemap.xml`／`robots.txt`／`llms.txt` | 正式網域、14 個完整繁中頁＋語言 Quick Start 搜尋探索、公開內容 crawler 開放與 AI 導覽；`llms.txt` 是社群提案，不取代 robots／sitemap |
| `content-status.json`／`crawler-policy.txt` | 機器可讀的頁面風險、編輯／翻譯／審校狀態，以及允許索引引用但禁止表單、API、CRM 與個資爬取的政策 |
| `third-party-register.json` | 公開第三方入口、關係、補償、查核狀態與更正紀錄；現行付費版位、聯盟連結與佣金轉介皆為 false |
| `scripts/build_seo.py` | 從頁面 title／description 重建 JSON-LD、分享 meta、sitemap、robots、llms、內容狀態與 crawler policy；`--check` 防止產物過期 |
| `scripts/build_search.py` | 從 14 頁 `<main>` 的 h1／h2、段落與固定別名重建搜尋索引；所有段落 h2 必須有 id，`--check` 驗證涵蓋與深連結 |
| `scripts/build_i18n.py`／`lang/` | 從 locale registry 重建語言 hub、37 個非繁中 Quick Start、`hreflang` 與語言切換 JS；產物不得手改 |
| `scripts/test_housing_search.mjs` | 無第三方相依的住宿搜尋 DOM 行為回放：尾端國名、完整地址、跨年日期、前導零、錯誤輸入、reset、英文與五平台 URL |
| `lang/en/visa/index.html` | 第一個完整英文 editorial beta：護照中立的 417／462 分流、官方來源、指定工作與 417-only 郵遞區號快查；未經母語移民專業人士校對前不得標為 reviewed |
| `lang/en/prep/index.html` | 完整英文行前與落地 editorial beta：護照中立的 RHCA／保險、入境申報、藥品、各州駕照、落地住宿、TFN／銀行／myGov／super 與獨立本機進度的 21 項清單；未經母語澳洲 settlement 或 consumer-services 專業人士校對前不得標為 reviewed |
| `lang/en/cost/index.html` | 完整英文生活成本 editorial beta：2026–27 薪資／WHM 稅／super 邊界、46 收入週／52 支出週本機試算、食衣交通、PPSR 與八州領地車輛過戶；未經母語澳洲 tax、financial-counselling 或 consumer-services 專業人士校對前不得標為 reviewed |
| `lang/en/housing/index.html` | 完整英文住宿與租屋 editorial beta：護照中立的短住／長租分流、平台與身分查證、合約／bond／condition report、八州領地官方入口、工作綁住宿與離場處理；未經母語澳洲 tenancy、housing 或 homelessness-services 專業人士校對前不得標為 reviewed |
| `lang/en/work/index.html` | 完整英文工作 editorial beta：求職分流、雇主與薪資查核、職場紅旗、採收月份工具、四季職類與條件式抵達建議、官方求助路徑；未經母語澳洲職場關係專業人士校對前不得標為 reviewed |
| `lang/en/scam/index.html` | 完整英文防詐 editorial beta：工作、簽證、租屋、金流、個資與二手車風險，英文互動測驗、證據包及官方通報分流；未經母語消保或被害支援專業人士校對前不得標為 reviewed |
| `lang/en/health/index.html` | 完整英文健康安全 editorial beta：跨護照 Medicare／RHCA 分流、訪客保險查核、就醫層級、藥品、職災、心理健康、暴力支援、偏遠工作與緊急聯絡；未經母語澳洲 healthcare、insurance、mental-health、violence-support 或 workplace-safety 專業人士校對前不得標為 reviewed |
| `docs/` | 本文件與 SPEC |
| `worker/` | 獨立無框架 Worker 本機骨架：D1 migrations、CORS／body 上限、Turnstile server-side validation、HMAC 限流鍵、prepared-statement repositories、可替換交易信介面與 Workers runtime 測試；正式資源與 secret 仍待 P0-4 |

### 2.2 頁面共同結構

每頁：`<head>`（description＋canonical＋OG／Twitter 分享圖＋WebSite／WebPage／Breadcrumb JSON-LD＋fonts＋style＋SVG favicon）→ 桌機 sticky／手機 static header
（brand＋12 項 nav）→ `<main>`（page-title → 長頁的問題優先 quick-answer hub → 高風險證據卡 → 完整內容與參考資料目錄 → 內容）→ 回饋列（JS 注入）→
footer（免責聲明）→ scripts。**新增頁面時**：複製既有頁骨架、nav 全站同步加項
（13 個檔案都要改——用腳本批次替換，別手改）、index 加卡片。

## 3. JavaScript 架構

- 兩個 IIFE（`main.js` 全站、`tools.js` 工具頁），無模組系統。
- **特徵偵測模式**：每個功能塊以 `document.getElementById(...)` 判斷是否在該頁，
  不存在就跳過——tools.js 可安全掛在任何頁。
- **現行私人需求單**：`about.html #contact-brief` 保留 Gmail web compose、`mailto:` 與複製文字；
  所有收件者、主旨與內文參數皆 `encodeURIComponent`，clipboard 不可用時只選取預覽，不誤報已複製。
  `assets/api-config.js` 目前兩值為空，因此不載入 Turnstile、不呼叫 API，頁面明示站內安全送出尚未啟用。
- **P1-9 漸進增強**：公開 API origin 與 Turnstile site key 日後完成 P0-4 才填入。啟用後，前端只在
  原生驗證與 Turnstile 完成後用 `credentials: omit`、`referrerPolicy: no-referrer` POST；成功必須同時
  滿足 HTTP success 與後端 `{ok:true}`，再顯示案件編號、伺服器時間與 `sent`／`queued` Email 狀態。
  管理 token 只放同站 URL 的 fragment，讀入欄位後立刻由 `history.replaceState` 清除，不寫 localStorage。
- **P1-10 D+ 漸進增強**：每個繁中頁在 `main.js` 前載入同一份 `api-config.js`；公開 API origin 留空時
  `sendDplusMetric()` 直接回傳 `false`，不建立 request。啟用後，首頁安全出口／問題卡與證據卡官方來源
  只送白名單 metric key，request body 固定為 `{metricKey}`，使用 `credentials: omit`、
  `referrerPolicy: no-referrer`。自願任務的答案與 `performance.now()` 計時只留在當頁變數，不寫 storage，
  後端只收到成功／完成類別；完成畫面會區分本機結果與後端是否接受計數。
- **站內搜尋**：`main.js` 注入全站 dialog 與 header 入口，首次開啟才載入
  `search-index.js`；查詢不寫 localStorage、不呼叫 fetch、不送往搜尋引擎。結果 URL 只能來自
  builder 的固定同站頁面／錨點，標題、摘要與使用者查詢一律以 `textContent` 呈現。
  `/` 開啟、Escape／關閉鈕離開，行動版入口與結果維持至少 44px 可操作高度。
- **住宿搜尋轉接器**：`housing.html` 與完整英文住宿頁共用 `tools.js`；地點、日期與人數
  只存在當頁記憶體，不寫 storage、不呼叫本站 API。工具只建立 Hostelworld、Booking.com、
  Flatmates、realestate.com.au 與 Domain 的平台入口；沒有穩定深連結時必須明示要求使用者
  進站再貼上地點，不得聲稱已抓回、比價或篩出即時房源。使用者點某個平台後，該連結的
  地點與可支援條件才交給該平台；不使用地址 autocomplete API、抓取或聯盟參數。
- **多國語言**：繁中 14 頁仍是唯一完整內容集與維護基準；`lang/<locale>/` 是靜態、可索引的
  Quick Start，另以 `lang/<locale>/<topic>/` 漸進增加完整翻譯。語言切換不保存選擇、不送出資料，
  只依使用者選擇導向固定同站 URL。機器翻譯不得移除風險聲明或冒充人工／官方翻譯；
  `english-fallback` 必須直接顯示英文，不可為了湊數生成不可信低資源語言。完整英文頁採
  `lang/en/<topic>/`；台灣限定內容必須改寫成護照中立分流，且互動工具若只支援單一 subclass，
  必須在輸入前、結果中與官方來源旁重複明示限制。
- **GA4 保留邊界**：第一階段 `analytics-config.js` 必須維持空 ID。若未來重新批准，ID 未符合
  `G-[A-Z0-9]+` 時立即停用；符合時也先等
  `whv-analytics-consent-v1=granted`，才建立 `dataLayer` 與載入 Google tag。廣告儲存、廣告
  使用者資料、廣告個人化與 Google Signals 一律關閉。page location 主動移除 query／hash；
  `whv:search` 事件只接收白名單頁名與 0–200 結果數，不得加入原始查詢字詞。
- **旅程順序單一來源**：`main.js` 的 `JOURNEY_ORDER` 與首頁四階段一致，負責內容頁的
  上一站／下一站與位置顯示；首頁只提供 `#journey-map` 全貌，不注入頁尾導覽。
- **localStorage keys**（改動＝使用者資料遺失，不得更名）：
  - `whv-worksheet-v1`：工作表答案（{q1..q8: string}）
  - `whv-why-quick-v1`：快思版答案（{qq1..qq8: 1..5}）；讀取時只接受固定題號與整數範圍，不儲存或顯示自由文字
  - `whv-prep-check-v1`：行前清單勾選（{pc2-g-i: bool}）
  - `whv-prep-check-en-v1`：英文行前清單勾選（與繁中分開，避免不同語意的位置式 ID 互相污染）
  - `whv-leave-check-v1`：離澳收尾清單勾選（{lc-i: bool}）
  - `whv-save-calc-v1`：存錢試算器輸入與最近一次結果（行前海報使用）
  - `whv-last-page-v1`：最近閱讀的白名單頁名（`{path}`），供首頁續讀卡使用
  - `whv-saved-pages-v1`：收藏頁面的白名單 path 陣列；首頁只用固定 metadata 呈現
  - `whv-analytics-consent-v1`：僅 `granted`／`denied`；不存使用者內容。名稱或語意變更需同步隱私說明
- SVG sprite 由 main.js 注入 `<body>` 開頭；頁面以
  `<svg class="icon"><use href="#i-名稱"/></svg>` 引用。**JS 未載入時圖示不顯示**，
  屬已接受的取捨（工具本來就需要 JS）。

### 3.1 已批准的最小後端資料契約（基礎已本機實作）

- **邊界**：GitHub Pages 繼續提供內容；Worker 只提供表單、查閱／更正／刪除申請、交易信與 D+。
- **CRM 必填**：聯絡 Email、需求類型、需求說明；姓名／組織、希望時程、預算區間選填。
- **禁止欄位**：護照、簽證文件、健康／醫療、銀行／卡號、帳密、第三人個資、未公開客戶資料。
- **保存**：一般詢問與未成交需求以結案或最後聯絡時間為基準，24 個月後由排程刪除；
  正式合約、付款或依法另需保存的資料不得混用同一 retention class。
- **確認**：成功回應包含不可推測的案件編號與伺服器時間；自動信只做交易通知，不訂閱行銷。
- **D+**：只接受白名單 counter key，由伺服器依 Perth 日期彙總；不得建立事件列、client ID、cookie、
  fingerprint，不得在應用程式或 D1 保存 IP、User-Agent、referrer、query、自由文字或精細地理位置。
- **安全**：Turnstile token 必須 server-side 驗證；輸入長度、CORS origin、rate limit 與 SQL 皆採白名單／prepared statement。

2026-08-30 的 P1-8 本機基礎：`worker/src/` 已拆分 HTTP/CORS、bounded JSON、Turnstile、
HMAC rate-limit key、D1 repository 與 mail transport；`0001_initial.sql` 建立一般詢問、管理 token、
mail outbox 與日期聚合 counter。原始 IP 不寫入 D1；原始 Email 不拿來當 rate-limit binding key，
而由只存在 Worker secret 的 HMAC 產生不透明 key。Cloudflare Rate Limiting 是 edge-local、最終一致，
只作防濫用，不作帳務或完成證據。正式 D1 ID 仍是全零阻擋值；health route 會明示
`local-scaffold`，需求單路由雖已由 P1-9 實作，也要等 P0-4 才能正式啟用與驗證寄信。

P1-9 本機閉環加入：`POST /api/contact`、`/api/contact/manage`、`/api/contact/update`、
`/api/contact/delete`。建立時以不可預測的 `WHV-` UUID 作案件編號，管理 token 只以 SHA-256 hash
存入 D1；回應不回傳 Email 或需求內容，只回傳回執、Email 狀態與 fragment 管理連結。建立案件、
管理 token 與 mail outbox 以 D1 batch 一起寫入；寄信介面接受才標 `sent`，未設定或失敗只標 `queued`
並留下固定錯誤碼等待重試，不把 provider 錯誤或使用者內容寫入 log。管理 token 與 Turnstile 同時
通過才可查閱／更正／永久刪除；每日 cron 以 prepared statement 清除 `delete_after` 到期案件。
目前預設 mail transport 是 disabled、公開 API 設定為空，因此只證明程式與本機 mock 閉環，沒有真實寄信或部署。

P1-10 本機閉環加入：`POST /api/metrics` 只接受單欄位 `{metricKey}` 與 7 個固定類別，拒絕 query、
額外欄位及未知 key；`0002_dplus_task_metrics.sql` 將 D1 約束同步為相同白名單。日期由 Worker 依
`Australia/Perth` 產生，rate limit 使用每個類別共用的固定 key，因此不是人數估算，也不能當完成證據。
metrics route 不建立 application request log，Wrangler observability 預設關閉；Cloudflare 作為傳輸與
防濫用基礎設施仍可能處理必要連線資料，隱私文案不得過度宣稱供應商完全看不到。正式 API origin 留空時，
所有繁中頁都維持零 D+ request；正式啟用、retention／platform logging 再確認與端到端收據仍屬 P0-4 gate。
測驗開始鍵在 HTML 預設 `hidden`，只由成功執行的 `main.js` 揭露；因此 script 被 CSP 阻擋時不會留下
無作用控制項，題目、結果與完成狀態也維持隱藏，目的與資料界線仍保留為可讀文字。

### 3.2 商業合作與第三方入口治理

- `about.html#recommendation-policy` 是人類可讀政策，`third-party-register.json` 是機器可讀現況；
  兩者必須同步。登錄表的 `currentState` 不得在未完成實際合約、揭露與查核前改成 active。
- 自然排序依任務相關性、官方／可回查依據、安全、費用與條款透明度、申訴出口、涵蓋範圍與更新狀態；
  商業關係不得改變緊急安全出口、官方依據、風險揭露或第一順位。
- 第三方分三級：官方／公共出口、一般商業服務與平台、受監管／高風險服務。後兩級上架前至少公開
  營運者、適用資格、費用／佣金、申訴管道、本站關係、查核日期與編輯狀態；通過不等於品質保證。
- 未來付費版位只能在獨立區塊顯示「廣告／贊助」、付款方、關係與查核日期，連結加
  `rel="sponsored nofollow"`；不得混進自然排序。特定專業轉介須另過法律／稅務 gate，且未經使用者
  明確同意不得傳送聯絡資料或個案內容。
- 一般爭議標示複查中並暫停推薦；安全、疑似詐騙、資格失效或官方處分先下架。所有恢復、修正與
  永久移除追加到公開 `correctionLog`，不公開個資或未查證指控。
- LINE 邀請連結只能出現在首頁一般生活交流區；無付費、無佣金、無本站管理權，不作求職／租屋
  查核、緊急支援，或簽證、法律、醫療等專業轉介。其他頁只能說明社群資訊也要查證，不得重放邀請連結。

## 4. 設計系統：「簡約檸檬布紋」

生活照片中的淡藍／奶油直條布紋 × 手繪黃檸檬 × 灰綠葉。圖樣以本地 SVG 重畫，
不直接使用照片、不新增外部圖片依賴；內容放在高不透明奶油紙張表面，圖案只留在
頁面底層與 hero 邊緣，不能犧牲長文可讀性。先前紅點標準審查的資訊架構、可及性與
互動裁決仍保留。

### 4.1 色彩 token（全部定義在 `:root` 與 dark 覆寫層）

| Token | Light | Dark | 用途 |
|---|---|---|---|
| `--bg` | `#e8f0f3` 淡藍布底 | `#172329` | 頁面底 |
| `--surface` | `#fffdf5` | `#223138` | 奶油紙張／卡片面 |
| `--ink` | `#27342e` | `#f3f1e7` | 文字／線條 |
| `--accent` | `#75520b` | `#edc65a` | 主按鈕與焦點；前景由 `--on-accent` 保持 AA |
| `--link` | `#315e50` | `#f0cf70` | 內文連結；持續保留底線 |
| `--green`/`--gold`/`--blue` | 灰綠葉/檸檬黃/布紋藍 | 提亮版 | 輔色與狀態面 |
| `--stripe`/`--stripe-soft` | 淡藍/奶油 | 深藍灰雙色 | 背景直條紋 |
| `--on-accent`/`--on-gold`/`--on-green` | 前景色語意 token | dark 時翻轉 | **禁止硬編碼前景色** |
| `--shadow-pop` | ink 14% 的柔和擴散陰影 | 黑色 30% 的柔和擴散陰影 | 紙張層次，不製造厚重硬框 |

### 4.2 字型

`--font-serif`（Georgia→Noto Serif TC，900）：h1/h2/卡片標題/品牌/數據大字。
`--font-sans`（系統西文→Noto Sans TC）：內文。西文字型排在中文前（評審要求，
西文 glyph 品質）。`font-feature-settings: "palt","kern"`。

### 4.3 元件語彙

- **卡片**：1px 柔和線＋擴散陰影＋黃綠頂邊布標；hover 只上移，**本體不旋轉**。
- **長頁問題入口**：`quick-answer-hub` 固定放在繁中攻略頁標題後，以 3–4 個真實問題呈現
  「先做」的一句可執行動作與同頁深連結；不是另一份摘要文章。完整解釋、例外、查核日期與
  官方來源保留在下方，目錄標為「完整內容與參考資料」。高風險問題不得因簡化而移除 000、
  官方系統、州別／簽證類別邊界或專業協助出口。
- **按鈕**：彈簧曲線 `cubic-bezier(.34,1.56,.64,1)`，active 全壓平（陰影歸零）。
- **分層證據卡**：先顯示白話下一步，再顯示理由；來源機構、查核日期、翻譯／編輯狀態常駐，
  完整依據可展開。過期高風險內容標「待重新確認」並保留官方出口，不得只隱藏舊內容。
  第一批實作位於 `visa.html`、`cost.html`、`work.html`、`health.html`、`scam.html`；根節點使用
  `data-evidence-status="checked|stale"`，展開依據使用原生 `<details>`，不依賴 JavaScript。
- **圖文**：流程圖、選項圖與風險圖延續檸檬布紋；圖像不能成為唯一資訊來源，裝飾圖使用空 alt，
  資訊圖提供等義文字或可理解的替代文字。
  第一批元件為 `.lemon-choice-map`、`.lemon-flow`、`.lemon-check-map`、`.lemon-risk-map`；內容以
  `<ul>`／`<ol>`、標題與說明文字構成，CSS `::before`／`::after` 只畫檸檬與葉片。
- **h2**：flex 對齊＋檸檬黃有機色塊 `::before`（以 `nth-of-type(3n)` 微調形狀）。
- **select**：`appearance:none`＋自訂 SVG 箭頭（深淺色各一組 data-URI）。
- **布紋與圖樣**：`body` 以 CSS 直條紋疊本地 `lemon-pattern.svg`；內容頁再覆一層
  高不透明 paper surface；`body::after` 微噪點 opacity .025（print 隱藏）。
- **首頁承諾列**：`.trust-strip` 靜態呈現，不做無法暫停的循環動畫。
- **首頁資訊架構**：首頁可放寬至 1160px，內容頁維持 880px；12 張入口卡依旅程
  分成四個有標題的 `<section>`，不可退回無分組的等權重卡片牆。
- **首頁動態**：hero 的檸檬與切片 SVG 形變僅在桌面載入時播放一次且每段不超過 5 秒；
  捲動視差由使用者捲動直接控制。行動版與 `prefers-reduced-motion` 停用。
- **自我釐清雙模式**：快思版用 8 題固定敘述呈現四個自評面向，只提示最低面向的慢想題目，
  不做總分、人格分類、心理健康診斷或出發許可；慢想版保留 q1..q8 語意與舊資料相容，匯出時可附快思分面。
  理論只作題目設計鏡頭，頁面必須標示非正式心理量表、列研究來源與專業協助界線。

### 4.4 SVG 圖示系統

26 個 symbol 定義於 main.js 的 `SPRITE` 字串（24×24、stroke 2、round cap）。
新增圖示＝在 SPRITE 加 symbol。favicon 為 data-URI 線繪羅盤。**全站禁 emoji**
（含 HTML 註解與 JS 字串）；驗收有 emoji 掃描（見 SPEC §6）。

### 4.5 無障礙基線（不得倒退）

`:focus-visible` 焦點環全站可見；主色與文字連結過 AA；inline link 持續顯示底線，
不只靠顏色辨識；全域 `prefers-reduced-motion`；
全站頁面在靜態 HTML 直接提供「跳到主要內容」skip link、可接受片段跳轉焦點的
`main#main-content[tabindex="-1"]` 與
`aria-current="page"`，不得依賴 JavaScript 才成立；`main.js` 只保留舊頁／異常頁的冪等 fallback。
一般觸控目標 ≥34px，行動版 nav
目標 ≥44px 且維持單列橫向捲動；所有內容錨點保留 sticky header 安全距離，跳轉後標題
不得被導覽遮住（見 §6 教訓）。

## 5. 資料：`assets/postcodes.js`

**這是全站唯一的「資料檔」，也是最高風險資產**——直接影響讀者的簽證申請。

- 內容：內政部 specified-work 官方頁 6 張表的完整郵遞區號
  （regional／remote+very remote／northern australia／追加碼／火災區／天災區），
  2026-08-29 以瀏覽器直讀 DOM 抽出、雙方法交叉核對。
- 結構：`window.WHV_POSTCODES`，範圍為字串 `"X-Y"`（inclusive）或單碼；
  州值 `"ALL"` 表全境。**NT 有前導零（0800），一律以字串儲存**。
- 已知官方怪點（刻意保留，勿「修正」）：跨州號段照官方原表歸屬
  （查詢邏輯已用全清單掃描兜底）；Table 5 VIC 兩處亂序為官方原始順序。
- **更新程序**：官方頁更新（尤其火災/天災宣告區）→ 用瀏覽器重抽（一般 fetch 被
  403）→ 更新檔頭 retrieved 日期 → 跑 SPEC §6 的快查器測試組。

## 6. 重要教訓（後續開發者請直接繼承，別重踩）

1. **immi.homeaffairs.gov.au／ato.gov.au／fairwork.gov.au 擋爬蟲**（403）——
   要資料就用真瀏覽器載入讀 DOM，不要用 fetch 然後推斷。
2. **GitHub Pages 10 分鐘快取**：部署後驗證必 cache-bust，否則誤判。
3. **行動版導覽**曾因 12 項 pill 疊 3 行＋sticky 佔掉 60% 視窗——已改單列捲動；
   新增 nav 項目前先想清楚要不要合併頁面。
4. **Windows 命令列 32K 字元上限**：對外派工（CLI agent）傳大 prompt 會炸
   （WinError 206），證據包要切塊。
5. **每年 7 月 1 日**是澳洲數字變動月（簽證費/最低薪資/移民門檻/交通票價），
   年度維護窗見 SPEC §7。

## 7. 品質協議（本專案的開發文化）

- **事實三級標示**：官方（附 .gov.au 連結）／統計媒體／「社群通報模式・非官方」。
- **反方審查**：重大內容或設計變更後，找一個非同族 AI 或人類以「推翻它」立場審一輪，
  逐條裁決（採納要修、駁回要附一手證據）。本專案歷史：內容審查 13 條裁決 9 採納、
  設計審查 12 條採納 11——駁回靠的都是官方頁一手讀取。
- **回放驗證**：宣稱完成前，實際打開線上站點測功能（不是看 code 覺得對）。
- 內部連結/錨點/導覽數量/emoji 掃描腳本見 SPEC §6。
