# 澳打指南針 — 系統設計文件（SDD）

> 版本 2.0｜最後更新 2026-09-02｜本文件是「憲法與架構」：只寫不可協商的原則、系統邊界、
> 資料契約、設計 token 與教訓。功能行為在 `SPEC.md`，待辦狀態在 `ROADMAP.md`，
> 決策與證據在 `DECISIONS.md`，閱讀路線在 `README.md`。改動本文件的任一條原則都必須先在
> `DECISIONS.md` 新增站長條目。

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
5. **資料最小化、敏感行為不追蹤**：工作表、清單、試算與搜尋維持只在本機；不用第三方
   pixel、session replay 或跨頁識別。量測只允許 Cloudflare Web Analytics（無 cookie）與
   訪客同意後才載入的 GA4（`DECISIONS.md` D-2026-09-02-01 取代 2026-08-30「第一階段不啟用 GA4」
   的決定）；詐騙、健康、剝削等敏感頁不做個人層級量測，GA4 ID 填入前必須完成敏感頁排除。
   獲准的最小後端只可處理私人需求單、確認信、刪除申請、無個人識別的 D+ 聚合計數與
   已授權住宿搜尋轉發，不得把 CRM 與瀏覽行為連結。
6. **能點選就不打字**：互動工具優先提供快選籤（chips）、滑桿、下拉選單。
7. **不做簽證或移民代辦**：站長不是澳洲註冊移民代理或澳洲執業律師；不論是否收費，
   都不得提供個人簽證選項建議、準備或代填申請、代表申請人處理簽證事項。可連到 OMARA
   官方名冊與中立轉介；目前沒有指定合作代理或佣金轉介。若未來有特定商業轉介，必須在連結
   旁明示關係；是否收取轉介費須先完成法律與稅務確認，確認前不得啟用，且未經使用者同意不得傳送其資料。
8. **先解決問題再談支持**：首頁不放站長服務招攬；贊助與私人合作只在 About 的次要區段，
   不影響內容完整度、官方出口、排序或風險揭露。
9. **資料性質要能辨認**：官方依據、本站編輯整理與社群第一手回報必須分開標示。本站不是
   個人遊記，不得把未親歷內容寫成親身經驗；查不到來源就標「待查證」。
10. **AI 只兜底、不留痕**（D-2026-09-02-01）：站內釐清以點選為主；只有使用者自由打字且釐清器
    未命中時才送 AI；送出前明示會送第三方模型，並說明供應商可能依其條款處理；本站伺服端不保存
    問題文字；每日總額度上限，超額 fail closed 回到站內搜尋與社團目錄；AI 回答不得提供個人簽證、
    法律、醫療、稅務判定，只能導向站內頁面與官方出口。細節見 `CLARIFIER_SPEC.md` §4。

## 2. 系統架構

- **公開前端形態**：純靜態 HTML/CSS/JS，**零框架、零建置步驟**——刻意選擇，讓不會寫程式的
  貢獻者也能改內容。已批准的 Worker 必須放在獨立目錄、保持無框架，不得迫使內容頁經過 bundler。
- **部署**：GitHub Pages（main 分支根目錄，legacy build），`CNAME` 固定為
  `www.aussiewhvcompass.com`。Cloudflare DNS 的 `www` CNAME 直接指向
  `jason201385-commits.github.io`，裸網域以 GitHub Pages 官方 A／AAAA 記錄接入並
  由 Pages 導向 `www`；不得使用 wildcard DNS。改檔 → commit → push 即自動部署（1–2 分鐘）。
- **快取**：GitHub Pages 資產 `max-age=600`（10 分鐘）。全站本機 CSS／JS／資料檔
  共用同一個 `?v=` 版本查詢碼（`ASSET_VERSION`）；任何這些資產異動時，push 前必須全站同步升版。
  驗證剛部署的 HTML 時仍加獨立 cache-bust，否則可能看到舊版並誤判失敗。
- **外部依賴**：現行前端只有 Google Fonts。GA4 程式保留但 ID 為空；Cloudflare Web Analytics
  尚未加入，啟用時必須同步登錄於本節與 `SPEC.md` §3。
- **後端邊界**：GitHub Pages 提供全部內容；Cloudflare Worker 只提供五種能力：私人需求單、
  查閱／更正／刪除申請、交易信、D+ 聚合計數、已授權住宿搜尋轉發（§3.1）。正式資源尚未完成
  P0-4 前，不得把本機 mock 或設定範本描述成已上線。

### 2.1 檔案地圖

只列「路徑＋一句話角色」。行為細節在 `SPEC.md` §1.2，該處才是契約。

| 路徑 | 角色 |
|---|---|
| `index.html` | 首頁：安全出口、四大入口（自我評估／常見問題／各地社團／遊戲區）、旅程問題卡、搜尋、續讀與收藏；將由 P0-7 重建 |
| `why.html` | 自我釐清雙模式（快思測驗＋慢想工作表） |
| `visa.html` | 簽證與集簽＋集簽郵遞區號初篩 |
| `prep.html` | 行前準備與落地 SOP＋互動清單＋行前海報 |
| `simulator.html` | 抵澳 30 天模擬器（固定情境、sessionStorage） |
| `cost.html` | 物價薪水稅務、換匯與匯款、採買、買車＋存錢試算器 |
| `housing.html` | 住宿與租屋＋合法混合搜尋 |
| `work.html` | 找工作、查核、證照、採收季節月曆、職災 |
| `scam.html` | 防詐騙（手法、紅旗、救濟）＋防詐測驗 |
| `english.html` | 英文資源與策略 |
| `health.html` | 保險就醫心理安全 |
| `leave.html` | 報稅退休金離澳＋DASP 粗估＋離澳收尾清單 |
| `market.html` | 離澳出清 × 初登澳補給：交換草稿產生器與平台入口 |
| `pr.html` | PR 路徑總覽 |
| `about.html` | 關於、資料分層、回報、私人需求單、共編、合作治理、贊助、授權、免責 |
| `404.html` | 錯誤復原頁（noindex，保留導覽與旅程復原入口） |
| `assets/style.css` | 全站唯一樣式表（設計 token 見 §4） |
| `assets/lemon-pattern.svg`、`og-cover.svg`、`og-cover.png` | 本地裝飾圖樣與 1200×630 分享圖 |
| `assets/main.js` | 全站共用：sprite、導覽、搜尋、續讀／收藏、回饋列、社團目錄篩選、需求單、D+ |
| `assets/tools.js` | 工具頁專用：快查器、試算器、清單、測驗、DASP、住宿搜尋、市集草稿（特徵偵測按頁啟用） |
| `assets/simulator.js` | 模擬器狀態機 |
| `assets/api-config.js` | 公開 API origin、Turnstile site key、住宿搜尋公開開關；留空即 fail closed；不得放 secret |
| `assets/search-index.js` | 由 `build_search.py` 產生的靜態搜尋索引；產物不得手改 |
| `assets/i18n-locales.json`、`i18n.js` | 護照國家／語言 registry 與語言切換；`i18n.js` 為產物 |
| `assets/analytics-config.js`、`analytics.js` | GA4 Measurement ID（空＝停用）與 Basic Consent loader |
| `assets/postcodes.js` | 官方集簽郵遞區號資料（§5） |
| `assets/seasons.js` | 各州官方採收季節資料（§5 同規則） |
| `lang/` | 語言 hub、37 個非繁中 Quick Start、`lang/en/<topic>/` 7 頁完整英文 beta；產物由 `build_i18n.py` 產生 |
| `.github/ISSUE_TEMPLATE/` | report／idea／thanks／collaborate 結構化表單 |
| `CNAME`、`sitemap.xml`、`robots.txt`、`llms.txt` | 正式網域、搜尋探索、crawler 開放與 AI 導覽 |
| `content-status.json`、`crawler-policy.txt` | 機器可讀的頁面狀態與爬取政策 |
| `third-party-register.json` | 第三方入口、關係、補償、查核狀態與更正紀錄（§3.2） |
| `scripts/build_seo.py`、`build_search.py`、`build_i18n.py` | 產物產生器，皆有 `--check` |
| `scripts/check.ps1` | 驗收腳本（`SPEC.md` §4） |
| `scripts/test_housing_search.mjs` | 住宿搜尋 DOM 行為回放 |
| `worker/` | 獨立無框架 Cloudflare Worker：`src/`（http、cors、body、turnstile、rate-limit、tokens、repository、mail、contact、contact-validation、metrics、accommodation、index）、`migrations/`、`test/`、`wrangler.jsonc`（D1 ID 為全零佔位、無 `env`）、`README.md` |
| `docs/` | 交接文件；分工見 `docs/README.md` |

### 2.2 頁面共同結構

每頁：`<head>`（description＋canonical＋OG／Twitter 分享圖＋WebSite／WebPage／Breadcrumb JSON-LD＋fonts＋style＋SVG favicon）
→ 桌機 sticky／手機 static header（brand＋`.nav-links`）→ `<main>`（page-title → 長頁的問題優先
quick-answer hub → 高風險證據卡 → 完整內容與參考資料目錄 → 內容）→ 回饋列（JS 注入）→
footer（免責聲明）→ 五支 `<script src defer>`。

**導覽現況**：13 頁的 `.nav-links` 為 12 連結（why→about）；`market.html` 與 `simulator.html` 為
13 連結（多 `market.html`），`check.ps1` 把此例外寫死。統一與否列 `ROADMAP.md` §3 待站長決定。
**新增頁面時**：複製既有頁骨架；16 個根層 HTML（含 404）與 7 個 `lang/en/**` 頁的 nav 都要改
（用腳本批次替換，別手改）；`build_seo.py`、`build_search.py` 的頁面清單加項並重跑；
`SPEC.md` §1.1 加列。

## 3. JavaScript 架構

- 兩個 IIFE（`main.js` 全站、`tools.js` 工具頁）＋`simulator.js`，無模組系統。
- **特徵偵測模式**：每個功能塊以 `document.getElementById(...)` 判斷是否在該頁，不存在就跳過。
- **API 呼叫不變量**：`api-config.js` 的 origin 留空時任何遠端功能都不建立 request；啟用後一律
  `credentials: omit`、`referrerPolicy: no-referrer`、固定 JSON body、白名單欄位；成功必須同時滿足
  HTTP success 與後端 `{ok:true}`；管理 token 只走同站 URL fragment，讀入後立刻 `history.replaceState` 清除，不寫 storage。
- **站內搜尋**：首次開啟才載入 `search-index.js`；查詢不寫 storage、不 fetch、不送搜尋引擎；
  結果 URL 只能是 builder 的固定同站頁面／錨點；動態文字只用 `textContent`。
- **多國語言**：繁中 15 頁是唯一完整內容集；`lang/<locale>/` 為靜態 Quick Start，`lang/en/<topic>/`
  漸進完整翻譯；語言切換不保存、不送出。機器翻譯不得移除風險聲明；`english-fallback` 直接顯示英文。
  台灣限定內容改寫成護照中立分流；單一 subclass 工具必須在輸入前、結果中、來源旁重複明示限制。
- **GA4 邊界**：ID 不符 `G-[A-Z0-9]+` 立即停用；符合時也先等 `whv-analytics-consent-v1=granted`
  才建立 `dataLayer`；廣告儲存、廣告個人化、Google Signals 一律關閉；page location 移除 query／hash；
  `whv:search` 只送白名單頁名與 0–200 結果數。敏感頁排除清單見 `SPEC.md` §1.5。
- **旅程順序單一來源**：`main.js` 的 `JOURNEY_ORDER` 與首頁四階段一致，負責內容頁的上一站／下一站。
- **Storage keys**（改動＝使用者資料遺失，不得更名）：
  - localStorage：`whv-worksheet-v1`（慢想 q1..q8）、`whv-why-quick-v1`（快思 qq1..qq8，1..5）、
    `whv-prep-check-v1`、`whv-prep-check-en-v1`、`whv-leave-check-v1`、`whv-save-calc-v1`、
    `whv-last-page-v1`（`{path}` 白名單）、`whv-saved-pages-v1`（白名單 path 陣列）、
    `whv-analytics-consent-v1`（`granted`／`denied`）。
  - sessionStorage：`whv-simulator-progress-v1`（版本化、嚴格驗證；只在目前分頁）。
  - 名稱或語意變更需同步隱私說明。
- SVG sprite 由 `main.js` 注入 `<body>` 開頭；頁面以 `<svg class="icon"><use href="#i-名稱"/></svg>` 引用。
  JS 未載入時圖示不顯示，屬已接受的取捨。

### 3.1 最小後端資料契約

- **路由**（`worker/src/index.ts`）：`GET /api/health`、`POST /api/contact`、`/api/contact/manage`、
  `/api/contact/update`、`/api/contact/delete`、`POST /api/metrics`、`POST /api/accommodation/search`。
- **CRM 必填**：聯絡 Email、需求類型、需求說明；姓名／組織、希望時程、預算區間選填。
  **禁止欄位**：護照、簽證文件、健康／醫療、銀行／卡號、帳密、第三人個資、未公開客戶資料。
- **保存**：一般詢問與未成交需求以結案或最後聯絡時間為基準，24 個月後由排程刪除；
  正式合約、付款或依法另需保存的資料不得混用同一 retention class。
- **確認**：成功回應包含不可推測的案件編號與伺服器時間；自動信只做交易通知，不訂閱行銷。
  案件編號為 `WHV-` UUID；管理 token 只以 SHA-256 存 D1；回應不回顯 Email 或需求內容。
- **D+**：只接受白名單 counter key，由伺服器依 Perth 日期彙總；不得建立事件列、client ID、cookie、
  fingerprint，不得在應用程式或 D1 保存 IP、User-Agent、referrer、query、自由文字或精細地理位置。
  固定類別的 edge-local rate limit 只作防濫用，不作人數或完成證據。
- **住宿搜尋**：只接受四個固定欄位、2 KiB body、固定類別限流、provider timeout、每平台最多 8 筆、
  目的網域與顯示欄位白名單；每個候選 provider 必須附有效 `displayAuthorization`（本站 origin、核准用途、
  查核日、有效期限），過期或缺漏不呼叫上游；不寫 D1、不記錄搜尋內容。
- **安全**：Turnstile token server-side 驗證；輸入長度、CORS origin、rate limit 與 SQL 皆白名單／prepared statement；
  限流鍵以只存在 Worker secret 的 HMAC 產生，原始 Email 或 IP 不作 binding key。
  Cloudflare Rate Limiting 是 edge-local、最終一致，只作防濫用。基礎設施仍會為傳輸與防濫用處理必要連線資料，
  隱私文案不得寫成供應商完全看不到。
- **狀態**：以上為程式完成／本機驗證；正式 D1 ID 是全零阻擋值，health route 明示 `local-scaffold`，
  正式啟用屬 P0-4。證據見 `DECISIONS.md` D-2026-08-30-02、D-2026-08-31-02。

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
- **社團目錄**：LINE／Reddit 公開入口與 Facebook／Reddit 平台搜尋只出現在首頁 `#communities`；
  每個入口須登錄於 `third-party-register.json`；無付費、無佣金、無本站管理權；不作求職／租屋查核、
  緊急支援或簽證、法律、醫療專業轉介；其他頁只能說明社群資訊也要查證，不得重放邀請連結。
  依地區×需求推薦是 P0-7 的範圍，不做站內配對或佈告欄（D-2026-09-02-01）。
- 住宿 provider 的授權、secret、商業關係與公開開關 gate 見 `ACCOMMODATION_PROVIDER_ONBOARDING.md`；
  未經授權不得以 scraping、模擬登入、iframe 或快取繞過。

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
| `--on-accent`/`--on-gold`/`--on-green` | 前景色語意 token | dark 時翻轉 | **禁止硬編碼前景色**（P0-6 教訓：`.language-go` 曾硬編 `--ink`） |
| `--shadow-pop` | ink 14% 的柔和擴散陰影 | 黑色 30% 的柔和擴散陰影 | 紙張層次，不製造厚重硬框 |

### 4.2 字型

`--font-serif`（Georgia→Noto Serif TC，900）：h1/h2/卡片標題/品牌/數據大字。
`--font-sans`（系統西文→Noto Sans TC）：內文。西文字型排在中文前（評審要求，
西文 glyph 品質）。`font-feature-settings: "palt","kern"`。只請求 400/500/700/900；
CSS 不得宣告未請求的字重（P0-6 已把 800 改為 900）。Google Fonts stylesheet 是目前最大的
render-blocking 資源，處理策略見 `PERFORMANCE_AND_RETENTION_SPEC.md` P2-4。

### 4.3 元件語彙

- **卡片**：1px 柔和線＋擴散陰影＋黃綠頂邊布標；hover 只上移，**本體不旋轉**。
- **長頁問題入口**：`quick-answer-hub` 固定放在繁中攻略頁標題後，以 4 個真實問題呈現
  「先做」的一句可執行動作與同頁深連結；生命危險卡例外使用明確的 `tel:000` 主動作，並另保留
  同頁緊急聯絡說明。入口不是另一份摘要文章；完整解釋、例外、查核日期與官方來源保留在下方，
  目錄標為「完整內容與參考資料」。四題未命中時須在卡片前提供直達完整目錄的捷徑；手機端對長距離
  錨點使用即時跳轉。高風險問題不得因簡化而移除 000、官方系統、州別／簽證類別邊界或專業協助出口。
- **按鈕**：彈簧曲線 `cubic-bezier(.34,1.56,.64,1)`，active 全壓平（陰影歸零）。
- **分層證據卡**：先顯示白話下一步，再顯示理由；來源機構、查核日期、翻譯／編輯狀態常駐，
  完整依據可展開。過期高風險內容標「待重新確認」並保留官方出口，不得只隱藏舊內容。
  根節點使用 `data-evidence-status="checked|stale"`，展開依據使用原生 `<details>`，不依賴 JavaScript。
- **圖文**：流程圖、選項圖與風險圖延續檸檬布紋；圖像不能成為唯一資訊來源，裝飾圖使用空 alt，
  資訊圖提供等義文字。元件為 `.lemon-choice-map`、`.lemon-flow`、`.lemon-check-map`、`.lemon-risk-map`；
  內容以 `<ul>`／`<ol>`、標題與說明文字構成，CSS `::before`／`::after` 只畫檸檬與葉片。
- **h2**：flex 對齊＋檸檬黃有機色塊 `::before`（以 `nth-of-type(3n)` 微調形狀）。
- **select**：`appearance:none`＋自訂 SVG 箭頭（深淺色各一組 data-URI）。
- **布紋與圖樣**：`body` 以 CSS 直條紋疊本地 `lemon-pattern.svg`；內容頁再覆一層
  高不透明 paper surface；`body::after` 微噪點 opacity .025（print 隱藏）。
- **首頁承諾列**：`.trust-strip` 靜態呈現，不做無法暫停的循環動畫。
- **首頁資訊架構**：首頁可放寬至 1160px，內容頁維持 880px；問題卡依旅程分成四個有標題的
  `<section>`，不可退回無分組的等權重卡片牆。P0-7 重建時每個既有區塊都要有去向（`CLARIFIER_SPEC.md` §3.2）。
- **首頁動態**：hero 的檸檬與切片 SVG 形變僅在桌面載入時播放一次且每段不超過 5 秒；
  捲動視差由使用者捲動直接控制。行動版與 `prefers-reduced-motion` 停用。
- **自我釐清雙模式**：快思版用 8 題固定敘述呈現四個自評面向，只提示最低面向的慢想題目，
  不做總分、人格分類、心理健康診斷或出發許可；慢想版保留 q1..q8 語意與舊資料相容。
  理論只作題目設計鏡頭，頁面必須標示非正式心理量表、列研究來源與專業協助界線。

### 4.4 SVG 圖示系統

26 個 symbol 定義於 `main.js` 的 `SPRITE` 字串（24×24、stroke 2、round cap）。
新增圖示＝在 SPRITE 加 symbol。favicon 為 data-URI 線繪羅盤。**全站禁 emoji**
（含 HTML 註解與 JS 字串）；驗收有 emoji 掃描（`SPEC.md` §4）。

### 4.5 無障礙基線（不得倒退）

`:focus-visible` 焦點環全站可見；主色與文字連結過 AA（含深色模式，P0-6 曾倒退至 1.43:1）；
inline link 持續顯示底線，不只靠顏色辨識；官方來源連結必須看得出可點；全域 `prefers-reduced-motion`；
全站頁面在靜態 HTML 直接提供「跳到主要內容」skip link、可接受片段跳轉焦點的
`main#main-content[tabindex="-1"]` 與 `aria-current="page"`，不得依賴 JavaScript 才成立。
一般觸控目標 ≥34px，行動版 nav 目標 ≥44px 且維持單列橫向捲動；所有內容錨點保留 sticky header
安全距離，跳轉後標題不得被導覽遮住（見 §6）。

## 5. 資料檔：`assets/postcodes.js` 與 `assets/seasons.js`

**`postcodes.js` 是最高風險資產**——直接影響讀者的簽證申請。

- 內容：內政部 specified-work 官方頁 6 張表的完整郵遞區號
  （regional／remote+very remote／northern australia／追加碼／火災區／天災區），
  2026-08-29 以瀏覽器直讀 DOM 抽出、雙方法交叉核對。
- 結構：`window.WHV_POSTCODES`，範圍為字串 `"X-Y"`（inclusive）或單碼；
  州值 `"ALL"` 表全境。**NT 有前導零（0800），一律以字串儲存**。
- 已知官方怪點（刻意保留，勿「修正」）：跨州號段照官方原表歸屬
  （查詢邏輯已用全清單掃描兜底）；Table 5 VIC 兩處亂序為官方原始順序。
- **更新程序**：官方頁更新（尤其火災/天災宣告區）→ 用瀏覽器重抽（一般 fetch 被
  403）→ 更新檔頭 retrieved 日期 → 跑 `SPEC.md` §4 的快查器測試組。

`seasons.js` 比照管理：只收各州官方農業廳可直接轉成月份的表（現有 VIC、TAS、NT），
附來源與抓取日期；查不到的州標「無官方資料」，不以民間資料補空白。

## 6. 重要教訓（後續開發者請直接繼承，別重踩）

1. **immi.homeaffairs.gov.au／ato.gov.au／fairwork.gov.au 擋爬蟲**（403）——
   要資料就用真瀏覽器載入讀 DOM，不要用 fetch 然後推斷。
2. **GitHub Pages 10 分鐘快取**：部署後驗證必 cache-bust，否則誤判。
3. **行動版導覽**曾因 12 項 pill 疊 3 行＋sticky 佔掉 60% 視窗——已改單列捲動；
   新增 nav 項目前先想清楚要不要合併頁面。
4. **Windows 命令列 32K 字元上限**：對外派工（CLI agent）傳大 prompt 會炸
   （WinError 206），證據包要切塊；Codex 甚至會在更小的多段 prompt 下只讀到第一段，
   長 packet 改寫成檔案再叫它讀。
5. **每年 7 月 1 日**是澳洲數字變動月（簽證費/最低薪資/移民門檻/交通票價），
   年度維護窗見 `SPEC.md` §5。
6. **文件漂移比程式漂移快**：規格與狀態混寫、同一數字多處手寫，4 天內 13 項稽核 12 項漂移
   （D-2026-09-02-02）。守則見 `docs/README.md` §4，`check.ps1` 會擋。
7. **效能量測要冷快取、取中位數**：Performance trace 在快取狀態不定時全距達 35%，任何結論都不成立；
   標準流程見 `PERFORMANCE_AND_RETENTION_SPEC.md` §0.2。

## 7. 品質協議（本專案的開發文化）

- **事實三級標示**：官方（附 .gov.au 連結）／統計媒體／「社群通報模式・非官方」。
- **反方審查**：重大內容或設計變更後，找一個非同族 AI 或人類以「推翻它」立場審一輪，
  逐條裁決（採納要修、駁回要附一手證據），裁決寫進 `DECISIONS.md`。本專案歷史：內容審查 13 條裁決 9 採納、
  設計審查 12 條採納 11——駁回靠的都是官方頁一手讀取。
- **回放驗證**：宣稱完成前，實際打開線上站點測功能（不是看 code 覺得對）；
  狀態只能用 `ROADMAP.md` §0 的詞彙。
- **驗收腳本**：`scripts/check.ps1`（`SPEC.md` §4）push 前必跑。
