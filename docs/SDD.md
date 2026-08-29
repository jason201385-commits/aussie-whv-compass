# 澳打指南針 — 系統設計文件（SDD）

> 版本 1.0｜2026-08-29｜本文件與 `docs/SPEC.md` 為一組交接文件，
> 供任何後續開發者（人類或 AI agent）在不遺失設計決策脈絡的前提下繼續開發。

## 1. 專案概述

**澳打指南針（Aussie WHV Compass）**：給台灣背包客的澳洲打工度假（subclass 417）
一站式開源攻略。正式網址 `https://www.aussiewhvcompass.com/`（裸網域自動導向 `www`），
儲存庫 `github.com/jason201385-commits/aussie-whv-compass`。

### 1.1 不可協商的原則（任何後續開發不得違反）

1. **永久免費**：不賣課、不接業配、不放追蹤廣告；唯一收入為自願贊助（donate）。
2. **可查證**：每個重要數字附官方來源連結與「YYYY-MM 查核」標籤；查不到寧可標
   「未查證／以官方為準」，不填看起來自信的舊數字。
3. **防詐騙頁只講手法不列黑名單**：不點名任何具體公司、農場、仲介、個人。
4. **禁用 emoji**：所有圖示一律用內嵌 SVG（見 §4.4）。站長明確指示。
5. **無後端、不收集資料**：純靜態站；使用者資料只存 localStorage；回饋走 GitHub Issues。
6. **能點選就不打字**：互動工具優先提供快選籤（chips）、滑桿、下拉選單。

## 2. 系統架構

- **形態**：純靜態 HTML/CSS/JS，**零框架、零建置步驟**——刻意選擇，讓不會寫程式的
  貢獻者也能改內容。不得引入 npm/bundler/framework，除非站長明示改變方針。
- **部署**：GitHub Pages（main 分支根目錄，legacy build），`CNAME` 固定為
  `www.aussiewhvcompass.com`。Cloudflare DNS 的 `www` CNAME 直接指向
  `jason201385-commits.github.io`，裸網域以 GitHub Pages 官方 A／AAAA 記錄接入並
  由 Pages 導向 `www`；不得使用 wildcard DNS。
  改檔 → commit → push 即自動部署（1–2 分鐘）。
- **快取**：GitHub Pages 資產 `max-age=600`（10 分鐘）。全站本機 CSS／JS／資料檔
  共用 `?v=20260829-2` 版本查詢碼；任何這些資產異動時，push 前必須全站同步升版。
  驗證剛部署的 HTML 時仍加獨立 cache-bust，否則可能看到舊版並誤判失敗。
- **外部依賴**：僅 Google Fonts（Noto Sans TC、Noto Serif TC）。其餘全部自含。

### 2.1 檔案地圖

| 檔案 | 角色 |
|---|---|
| `index.html` | 首頁：hero、靜態承諾列、最近閱讀、我的收藏、當下需求快導、4 段旅程／12 張頁面卡、主打工具、6 張工具卡、合作入口、原則 |
| `why.html` | 自我釐清互動工作表（8 題、chips、localStorage、匯出 txt） |
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
| `about.html` | 關於、合作／協助入口、贊助（按鈕待站長提供連結）、授權、免責 |
| `404.html` | 自訂錯誤復原頁：保留 noindex，導回最近閱讀、卡關捷徑與四階段旅程 |
| `assets/style.css` | 全站唯一樣式表（含設計 token，見 §4） |
| `assets/lemon-pattern.svg` | 參考生活照片重畫的本地裝飾圖樣；淡藍奶油條紋由 CSS 產生，SVG 只含不規則檸檬與灰綠葉 |
| `assets/main.js` | 全站共用：SVG sprite 注入、導覽標示、回訪續接、頁尾旅程導覽、回饋列注入、chip 填字、工作表 |
| `assets/tools.js` | 工具頁專用：快查器、試算器、清單、測驗、DASP（特徵偵測按頁啟用） |
| `assets/postcodes.js` | **官方集簽郵遞區號資料**（見 §5，更新程序必讀） |
| `.github/ISSUE_TEMPLATE/` | 結構化公開表單（report.yml／idea.yml／thanks.yml／collaborate.yml／config.yml） |
| `CNAME`／`sitemap.xml`／`robots.txt` | 正式網域、13 頁搜尋探索清單與 sitemap 宣告 |
| `docs/` | 本文件與 SPEC |

### 2.2 頁面共同結構

每頁：`<head>`（meta＋OG＋fonts＋style＋SVG favicon）→ sticky header
（brand＋12 項 nav）→ `<main>`（page-title → toc → 內容）→ 回饋列（JS 注入）→
footer（免責聲明）→ scripts。**新增頁面時**：複製既有頁骨架、nav 全站同步加項
（13 個檔案都要改——用腳本批次替換，別手改）、index 加卡片。

## 3. JavaScript 架構

- 兩個 IIFE（`main.js` 全站、`tools.js` 工具頁），無模組系統。
- **特徵偵測模式**：每個功能塊以 `document.getElementById(...)` 判斷是否在該頁，
  不存在就跳過——tools.js 可安全掛在任何頁。
- **旅程順序單一來源**：`main.js` 的 `JOURNEY_ORDER` 與首頁四階段一致，負責內容頁的
  上一站／下一站與位置顯示；首頁只提供 `#journey-map` 全貌，不注入頁尾導覽。
- **localStorage keys**（改動＝使用者資料遺失，不得更名）：
  - `whv-worksheet-v1`：工作表答案（{q1..q8: string}）
  - `whv-why-quick-v1`：快思版答案（{qq1..qq8: 1..5}）；讀取時只接受固定題號與整數範圍，不儲存或顯示自由文字
  - `whv-prep-check-v1`：行前清單勾選（{pc2-g-i: bool}）
  - `whv-leave-check-v1`：離澳收尾清單勾選（{lc-i: bool}）
  - `whv-save-calc-v1`：存錢試算器輸入與最近一次結果（行前海報使用）
  - `whv-last-page-v1`：最近閱讀的白名單頁名（`{path}`），供首頁續讀卡使用
  - `whv-saved-pages-v1`：收藏頁面的白名單 path 陣列；首頁只用固定 metadata 呈現
- SVG sprite 由 main.js 注入 `<body>` 開頭；頁面以
  `<svg class="icon"><use href="#i-名稱"/></svg>` 引用。**JS 未載入時圖示不顯示**，
  屬已接受的取捨（工具本來就需要 JS）。

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
提供「跳到主要內容」skip link 與 `aria-current="page"`；一般觸控目標 ≥34px，行動版 nav
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
