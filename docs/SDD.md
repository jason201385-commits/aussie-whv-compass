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
8. **先解決問題再談支持**：贊助、Buy Me a Coffee 與合作入口放在使用者取得下一步之後，
   不影響內容完整度、官方出口、排序或風險揭露。

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
| `index.html` | 首頁：使命 hero、靜態承諾列、4 個緊急安全出口、4 段旅程／12 張真實情境問題卡、全站搜尋、原生兩題引導、第三方 Perth 生活社群、最近閱讀、收藏、工具與合作入口 |
| `why.html` | 自我釐清雙模式：8 題快思四面向＋8 題慢想工作表、研究／非診斷邊界、localStorage、匯出 txt |
| `visa.html` | 簽證與集簽＋**集簽資格快查器** |
| `prep.html` | 行前準備與落地 SOP＋**互動檢查清單** |
| `cost.html` | 物價薪水稅務＋Perth 採買、簡易食譜、二手衣／平價新品＋主要找車／自行刊登平台與官方查核＋**存錢試算器** |
| `housing.html` | 住宿與租屋：短住訂房、合租／整租原始平台入口、WA 官方租屋權益與安全清單 |
| `work.html` | 找工作（管道、查核、證照、履歷、季節、工傷） |
| `scam.html` | 防詐騙（三道防線、16 手法、救濟包）＋**防詐測驗** |
| `english.html` | 英文資源與策略 |
| `health.html` | 保險就醫心理安全 |
| `leave.html` | 報稅退休金離澳＋**DASP 速算**＋**本機離澳收尾清單** |
| `pr.html` | PR 路徑總覽 |
| `about.html` | 關於、免費公開內容與付費合作界線、私人 Email／需求單、公開 GitHub 合作入口、贊助（按鈕待站長提供連結）、授權、免責 |
| `404.html` | 自訂錯誤復原頁：保留 noindex，導回最近閱讀、卡關捷徑與四階段旅程 |
| `assets/style.css` | 全站唯一樣式表（含設計 token，見 §4） |
| `assets/lemon-pattern.svg` | 參考生活照片重畫的本地裝飾圖樣；淡藍奶油條紋由 CSS 產生，SVG 只含不規則檸檬與灰綠葉 |
| `assets/og-cover.svg`／`og-cover.png` | 1200×630 社群分享圖的可編輯來源與正式點陣資產；延伸既有檸檬布紋，不使用使用者照片 |
| `assets/main.js` | 全站共用：SVG sprite 注入、導覽標示、本機站內搜尋、回訪續接、頁尾旅程導覽、回饋列注入、chip 填字、自我釐清雙模式、私人需求單 |
| `assets/search-index.js` | 13 頁、109 個頁面／段落的靜態搜尋索引；首次開啟搜尋才同站載入，不含使用者輸入 |
| `assets/i18n-locales.json`／`i18n.js` | 49 個目前可申請 417／462 的護照國家／地區、38 種主要語言 registry 與全站語言切換；每個 locale 必須標示 source／machine-unreviewed／english-fallback |
| `assets/analytics-config.js` | 公開 GA4 Measurement ID 設定；空字串代表停用，不得放帳號或憑證 |
| `assets/analytics.js` | Basic Consent GA4 loader：未同意不載入 Google tag；同意後只送 page view 與固定搜尋摘要 |
| `assets/tools.js` | 工具頁專用：快查器、試算器、清單、測驗、DASP（特徵偵測按頁啟用） |
| `assets/postcodes.js` | **官方集簽郵遞區號資料**（見 §5，更新程序必讀） |
| `.github/ISSUE_TEMPLATE/` | 結構化公開表單（report.yml／idea.yml／thanks.yml／collaborate.yml／config.yml） |
| `CNAME`／`sitemap.xml`／`robots.txt`／`llms.txt` | 正式網域、13 個完整繁中頁＋語言 Quick Start 搜尋探索、公開內容 crawler 開放與 AI 導覽；`llms.txt` 是社群提案，不取代 robots／sitemap |
| `content-status.json`／`crawler-policy.txt` | 機器可讀的頁面風險、編輯／翻譯／審校狀態，以及允許索引引用但禁止表單、API、CRM 與個資爬取的政策 |
| `scripts/build_seo.py` | 從頁面 title／description 重建 JSON-LD、分享 meta、sitemap、robots、llms、內容狀態與 crawler policy；`--check` 防止產物過期 |
| `scripts/build_search.py` | 從 13 頁 `<main>` 的 h1／h2、段落與固定別名重建搜尋索引；所有段落 h2 必須有 id，`--check` 驗證涵蓋與深連結 |
| `scripts/build_i18n.py`／`lang/` | 從 locale registry 重建語言 hub、37 個非繁中 Quick Start、`hreflang` 與語言切換 JS；產物不得手改 |
| `lang/en/visa/index.html` | 第一個完整英文 editorial beta：護照中立的 417／462 分流、官方來源、指定工作與 417-only 郵遞區號快查；未經母語移民專業人士校對前不得標為 reviewed |
| `lang/en/prep/index.html` | 完整英文行前與落地 editorial beta：護照中立的 RHCA／保險、入境申報、藥品、各州駕照、落地住宿、TFN／銀行／myGov／super 與獨立本機進度的 21 項清單；未經母語澳洲 settlement 或 consumer-services 專業人士校對前不得標為 reviewed |
| `lang/en/cost/index.html` | 完整英文生活成本 editorial beta：2026–27 薪資／WHM 稅／super 邊界、46 收入週／52 支出週本機試算、食衣交通、PPSR 與八州領地車輛過戶；未經母語澳洲 tax、financial-counselling 或 consumer-services 專業人士校對前不得標為 reviewed |
| `lang/en/housing/index.html` | 完整英文住宿與租屋 editorial beta：護照中立的短住／長租分流、平台與身分查證、合約／bond／condition report、八州領地官方入口、工作綁住宿與離場處理；未經母語澳洲 tenancy、housing 或 homelessness-services 專業人士校對前不得標為 reviewed |
| `lang/en/work/index.html` | 完整英文工作 editorial beta：求職分流、雇主與薪資查核、職場紅旗、採收月份工具與官方求助路徑；未經母語澳洲職場關係專業人士校對前不得標為 reviewed |
| `lang/en/scam/index.html` | 完整英文防詐 editorial beta：工作、簽證、租屋、金流、個資與二手車風險，英文互動測驗、證據包及官方通報分流；未經母語消保或被害支援專業人士校對前不得標為 reviewed |
| `lang/en/health/index.html` | 完整英文健康安全 editorial beta：跨護照 Medicare／RHCA 分流、訪客保險查核、就醫層級、藥品、職災、心理健康、暴力支援、偏遠工作與緊急聯絡；未經母語澳洲 healthcare、insurance、mental-health、violence-support 或 workplace-safety 專業人士校對前不得標為 reviewed |
| `docs/` | 本文件與 SPEC |
| `worker/`（規劃中） | 獨立無框架 Worker、D1 migrations、Turnstile server-side validation、交易信介面與自動測試；不得包含正式 secret |

### 2.2 頁面共同結構

每頁：`<head>`（description＋canonical＋OG／Twitter 分享圖＋WebSite／WebPage／Breadcrumb JSON-LD＋fonts＋style＋SVG favicon）→ sticky header
（brand＋12 項 nav）→ `<main>`（page-title → toc → 內容）→ 回饋列（JS 注入）→
footer（免責聲明）→ scripts。**新增頁面時**：複製既有頁骨架、nav 全站同步加項
（13 個檔案都要改——用腳本批次替換，別手改）、index 加卡片。

## 3. JavaScript 架構

- 兩個 IIFE（`main.js` 全站、`tools.js` 工具頁），無模組系統。
- **特徵偵測模式**：每個功能塊以 `document.getElementById(...)` 判斷是否在該頁，
  不存在就跳過——tools.js 可安全掛在任何頁。
- **現行私人需求單**：`about.html #contact-brief` 只在 DOM 內組合純文字；使用者可選 Gmail web compose、
  `mailto:` 或複製文字，不建立 localStorage key、不呼叫 fetch、不自動寄信。產生預覽時內容仍只在本頁，
  使用者主動點寄信入口後才交給所選服務；所有收件者、主旨與內文參數必須 `encodeURIComponent`。
  clipboard 不可用時只選取預覽文字，不得誤報已複製。
- **目標私人需求單**：P1-8／P1-9 完成後改由同站表單送至 Worker；成功必須以後端回執為準，
  顯示案件編號並寄交易型確認信，同時保留「複製需求單」備援。不得只因前端 `fetch` resolve
  就誤報寄信成功；寄信、D1 寫入與重試的狀態需可分辨。
- **站內搜尋**：`main.js` 注入全站 dialog 與 header 入口，首次開啟才載入
  `search-index.js`；查詢不寫 localStorage、不呼叫 fetch、不送往搜尋引擎。結果 URL 只能來自
  builder 的固定同站頁面／錨點，標題、摘要與使用者查詢一律以 `textContent` 呈現。
  `/` 開啟、Escape／關閉鈕離開，行動版入口與結果維持至少 44px 可操作高度。
- **多國語言**：繁中 13 頁仍是唯一完整內容集與維護基準；`lang/<locale>/` 是靜態、可索引的
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

### 3.1 已批准的最小後端資料契約（尚未實作）

- **邊界**：GitHub Pages 繼續提供內容；Worker 只提供表單、查閱／更正／刪除申請、交易信與 D+。
- **CRM 必填**：聯絡 Email、需求類型、需求說明；姓名／組織、希望時程、預算區間選填。
- **禁止欄位**：護照、簽證文件、健康／醫療、銀行／卡號、帳密、第三人個資、未公開客戶資料。
- **保存**：一般詢問與未成交需求以結案或最後聯絡時間為基準，24 個月後由排程刪除；
  正式合約、付款或依法另需保存的資料不得混用同一 retention class。
- **確認**：成功回應包含不可推測的案件編號與伺服器時間；自動信只做交易通知，不訂閱行銷。
- **D+**：只接受白名單 counter key，以日期彙總；不得建立事件列、client ID、cookie、fingerprint，
  不得保存 IP、User-Agent、referrer、query、自由文字或精細地理位置。
- **安全**：Turnstile token 必須 server-side 驗證；輸入長度、CORS origin、rate limit 與 SQL 皆採白名單／prepared statement。

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
