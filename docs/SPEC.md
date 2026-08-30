# 澳打指南針 — 功能規格與待辦（SPEC）

> 版本 1.1｜2026-08-30｜搭配 `docs/SDD.md` 閱讀。
> 本文件是交給任何後續執行者（codex／其他 agent／人類貢獻者）的工作規格：
> §1–§3 描述現況（已完成、驗收過），§4 是 P0 人工前置與待辦，§5 記錄 P1 實作狀態與 P2 backlog，
> §6 是每次改動後必跑的驗收程序，§7 是例行維護。

## 0. 執行者邊界（先讀這段）

- 遵守 SDD §1.1 不可協商原則；違反任一條的 PR 不收。
- **只有站長本人**能做的事（agent 不得代辦，規格上視為人工前置條件）：
  註冊任何帳號、輸入身分證件／銀行帳戶／密碼／OTP、金流設定、發布社群貼文。
- Cloudflare Worker／D1／Turnstile／Email Sending 的帳號啟用、方案或付款、網域驗證、
  secret 輸入與正式資源建立同樣屬人工前置；agent 只能在 repo 內準備程式、migration、
  設定範本與本機測試，不得把憑證寫入檔案、log 或 commit。
- Agent 可以做：讀寫此 repo、commit、push（站長已授權此 repo 的部署流程）、
  跑驗收腳本、開 draft 內容。對外部服務的任何寫入操作都要先問站長。
- 內容修改必須維持語言一致的來源標註格式：根層繁中頁使用
  `<span class="updated-tag">YYYY-MM 查核</span>` 與
  `<p class="fact-meta">來源：<a ...>名稱</a>｜YYYY-MM-DD 查核</p>`；`lang/en/**`
  使用等義的 `Sources checked YYYY-MM` 與 `Source: ... | checked YYYY-MM-DD`。

## 1. 已完成功能總表（現況＝驗收基線）

### 1.1 內容頁（14 頁）

依旅程排序：why → visa → prep → cost → housing → work → scam → english →
health → leave → pr → about（+index）。每頁：toc、來源標註、頁尾免責、回饋列。
內容基準日 2026-08-28/29，重大事實均經官方頁一手查證與反方審查。

### 1.2 互動工具規格（現行為準）

| 工具 | 位置 | 輸入 | 邏輯 | 輸出 |
|---|---|---|---|---|
| 集簽郵遞區號初篩 | visa.html `#postcode-tool` | 4 碼郵遞區號（字串，保留前導零）＋類型（plant/tourism/bushfire/disaster）＋6 個熱門點 chips | 州判定（NT 0800-0999、ACT 2600-2618∪2900-2920、Norfolk 2899…）→ 對應表查 `ALL` 或範圍；tourism＝三表聯集；跨州碼全清單兜底掃描 | 顯示是否符合 2026-08-29 留存清單的郵遞區號＋類型日期條件＋適用限制＋官方現行頁面；不得表述為個人簽證資格判定 |
| 存錢試算器 | cost.html／`lang/en/cost/` `#save-calc` | 時薪滑桿 20–60（預設 33.05）、工時 0–50（38）、每週住宿預算 select、其他生活支出 select | weeklyGross=r×h；annualGross=weeklyGross×46；annualTax 依 2026–27 WHM 15%／30%／37%／45% 累進級距；afterTaxWeek=(annualGross−annualTax)÷46；year=(annualGross−annualTax)−weeklyExpenses×52；super=weeklyGross×0.12（僅為 OTE 粗估） | 六格數據＋全年稅／super 邊界；繁中顯示台幣示意、英文顯示稅後收入可覆蓋幾個支出週；依全年餘額分四級壓力測試警語 |
| 行前互動清單 | prep.html `#prep-checklist` | 21 項勾選（3 組，JS 產生） | localStorage `whv-prep-check-v1`、進度條、100% 彩蛋文案、清空需 confirm | 進度 x/21（%） |
| 抵澳 30 天模擬器 | simulator.html `#simulator-profile-form`＋`#simulator-stage` | 5 組固定單選：預算、短住緩衝、工作準備、支持網、優先目標；6 個固定事件各 3 個白名單選項 | cash／housing／work／wellbeing／evidence、關卡與固定選項只寫入目前分頁的 `sessionStorage`，讀取時嚴格驗證版本、型別與範圍；不使用 `localStorage`、fetch 或自由文字；固定 delta 可重播且恢復後不得重複套用；緊急就醫事件一律顯示 000 安全中斷；分數不得描述為成功率、適合度、診斷或簽證判定 | 角色快照＋逐關取捨／官方出口＋第 30 天三項弱點行動地圖；從攻略返回或重新整理可繼續，關閉分頁或重新開始即清除 |
| 離澳收尾清單 | leave.html `#leave-checklist-tool` | 9 項零打字勾選（無 JS 仍可閱讀） | localStorage `whv-leave-check-v1`、進度條、清空需 confirm；100% 時顯示非強迫的感謝銜接 | 進度 x/9（%）＋完成提示 |
| 防詐測驗 | scam.html `#scam-quiz` | 8 情境 ×（接受/快跑） | 正解：2、5 題為「接受」其餘「快跑」；逐題回饋含紅旗解說 | 計分＋三級稱號（≥7 大師／≥5 有 sense／其餘肥羊） |
| DASP 扣繳粗估 | leave.html `#dasp-calc` | 估計總額 number＋tax-free component number＋4 個總額 chips | taxFree=clamp(input, 0, total)；taxable=total−taxFree；withholding=taxable×0.65；payment=total−withholding | 估算 payment after withholding＋估算 withholding＋component／個案限制警語；不得表述為實際可領款 |
| 自我釐清雙模式 | why.html `#quick-quiz`＋`#worksheet` | 快思 8 題 × 5 點自評；慢想 8 題 textarea＋價值／取捨 chips | 快思分成自主動機、價值取捨、現實準備、支持底線四面向，各 2 題且不合計總適合度，白名單存 `whv-why-quick-v1`；慢想沿用 600ms 防抖與 `whv-worksheet-v1`，保留舊答案及行前海報相容 | 快思分面結果＋最低面向下一步；慢想匯出 .txt／列印／清空 |
| 私人合作需求單 | about.html `#private-contact`＋`#contact-brief`＋`#contact-management` | 必填 Email、需求類型、目前卡點、希望結果與邊界確認；姓名／組織、時程、預算選填 | P0-4 前 `api-config.js` 空值，維持不寫 localStorage、不上傳的 Gmail／mailto／複製備援；日後啟用後需 Turnstile、後端 `{ok:true}` 回執，管理 token 只經 fragment 傳遞 | 現況產生 Email／複製備援；程式已支援案件編號、Email sent／queued、查閱、更正、永久刪除 |
| 回饋列 | 全站（main.js 注入） | — | 分享鈕→clipboard 複製網址＋致謝文案；回報鈕→`report.yml`；感謝鈕→`thanks.yml`，兩者都自動帶入頁名 | — |
| 繼續上次閱讀 | 首頁 `#journey-resume` | 自動記錄最近開啟的白名單內容頁 | localStorage `whv-last-page-v1` 只存 `{path}`；首頁以固定頁名／階段 map 顯示，拒絕未知 path | 續讀連結＋清除紀錄；首次訪問或無效資料時隱藏 |
| 我的收藏 | 首頁 `#saved-pages`＋內容頁回饋列 | 內容頁單鍵收藏；首頁可開啟、個別移除或確認後清空 | localStorage `whv-saved-pages-v1` 只存白名單 path 陣列；標題／階段由固定 `JOURNEY_PAGES` 產生，拒絕未知與重複 path | 無收藏時首頁隱藏；有收藏時依收藏順序顯示 |
| 緊急安全出口 | 首頁 `#support-hub` | 4 個高風險零打字入口 | 只連向既有內容錨點：立即危險、剛匯款／帳號風險、威脅／剝削／扣證件、簽證到期／官方通知 | 先做降低傷害的第一步，不複製可能過時的電話或政策數字 |
| 旅程問題卡 | 首頁 `#journey-map`＋4 個 `.journey-phase` | 12 張「類別＋真實情境」卡 | 每卡顯示情境、白話說明與第一步；依考慮／準備／在澳／離澳與延續分組 | 直接進入對應完整攻略，不強迫線性閱讀 |
| 可選兩題引導 | 首頁 `.route-guide` | 階段＋最怕的損失 | 原生 `details`，即使無 JavaScript 仍可用；只連固定同站頁面／錨點 | 在問題卡與搜尋仍無法判斷時縮小範圍，高風險時回到安全出口 |
| 全站搜尋 | header 搜尋鈕＋首頁 `#search`＋JS dialog | 關鍵詞、5 個熱門詞、鍵盤 `/` | 首次使用才載入 14 頁／126 個頁面與段落入口的靜態索引；NFKC 正規化、固定同義詞、標題／段落加權；不保存、不送出查詢，動態文字只用 `textContent` | 最多 8 個同站深連結結果；零結果提供縮短關鍵詞與許願入口 |
| 多國語言 Quick Start | 全站語言 select＋`lang/` | 38 種主要官方／通行語言 | 49 個現行 417／462 首簽護照國家／地區映射到靜態 locale；`hreflang`、canonical、RTL、reviewStatus；不保存選擇 | 每語言一頁快速入口＋官方 417／462 連結；完整 14 頁仍以繁中為主 |
| 頁尾旅程導覽 | 12 個內容頁（main.js 注入） | — | 依首頁四階段的 `JOURNEY_ORDER` 單一排序產生上一站／完整旅程／下一站；首頁不注入，首末頁以首頁旅程圖收邊 | 顯示目前階段與第 x/12 頁，不強迫線性閱讀 |

### 1.3 回饋機制

`.github/ISSUE_TEMPLATE/report.yml`（回報過時/錯誤：頁面自動帶入、類型下拉、
描述、官方來源選填；label「需要查證」）＋ `idea.yml`（許願池）＋ `thanks.yml`
（公開感謝：旅程階段、受幫助頁面、給後來者的話、隱私確認、摘錄同意）＋
`collaborate.yml`（公開的合作／協助需求摘要；必填隱私與服務邊界確認，不接收文件或聯絡資料）。

- 修正閉環：網站回饋列 → 結構化 issue → 查證修正 → push 部署。
- 感謝閉環：點擊前與表單頂端明示 GitHub 登入、帳號／內容公開與個資風險 →
  公開 Issue → 人工確認無敏感／第三人資料 → **只有明確勾選同意**才可
  去識別化摘錄至本站；使用者可在原 Issue 要求移除。不得自動發布、不得虛構留言。
- 合作閉環：about → 公開 Issue 說明需求與預期結果 → 站長人工評估 →
  只在確認適合後另議下一步。送出不等於委託成立、保證處理或免費服務；不在公開表單
  收集聯絡資料、報價、合約、公司內部資訊，且不處理緊急或專業個案建議。
- 私人合作：about 可直接寄至站長公開合作信箱，或在頁面本地產生需求單後交給使用者選擇的
  Gmail／郵件 App；本站不接收、儲存或自動寄出內容。使用者點寄信入口後，內容才會交給所選
  Email 服務建立草稿。第一封明示不附證件、帳密、第三人個資、
  未公開客戶資料及簽證／醫療／法律／稅務個案，且最後寄出動作由使用者本人完成。
- 商業合作：公開攻略與核心工具維持免費；受邀課程、講座、工作坊、網站與數位工具或內容製作
  可另行報價。是否承接、工作範圍、時程、費用、交付與取消方式
  必須另外確認，提出需求不代表委託成立。付費不得購買本站推薦、排名或有利說法，商業關係需明示。
- 受管制服務界線：站長目前不是澳洲註冊移民代理或澳洲執業律師；不論是否收費，都不得提供
  個人簽證選項建議、準備或代填簽證申請、代表申請人處理簽證事項。本站可提供 OMARA 官方
  名冊入口與中立轉介；目前沒有指定合作代理或佣金轉介。未來若有特定商業轉介，必須在每個
  連結旁明示關係，不得保證結果；是否收取轉介費須先完成法律與稅務確認，確認前不得啟用。
  未經使用者明確同意不得轉交其聯絡方式或個案內容，且使用者直接與該專業人士簽約、付款並自行決定是否採用。

### 1.4 搜尋引擎與 AI 探索

- 14 個內容頁各有唯一 title、description、canonical、Open Graph／Twitter 分享資訊，
  並以 JSON-LD 描述 `WebSite`、`WebPage`；內容頁另含 `BreadcrumbList`。
- `robots.txt` 對 `User-agent: *` 開放，並指向含 14 個繁中內容頁的 `sitemap.xml`；404 維持
  `noindex,follow`，不放 canonical 或結構化資料。
- `llms.txt` 提供繁體中文站點導覽、正式頁面、授權與事實界線。這是方便 AI 工具理解的
  社群提案，不是 crawler 存取控制，也不保證被任何模型採用或提高排名。
- 分享圖固定使用 1200×630 `assets/og-cover.png`；可編輯來源為 SVG，不公開使用者提供的生活照片。
- `scripts/build_seo.py --check` 驗證所有產物與頁面同步；修改 title、description 或頁面清單後
  先重跑 builder，再跑本文件 §6。

### 1.5 量測架構（GA4 程式保留停用；第一階段改採 D+）

- `analytics-config.js` 的 Measurement ID 目前為空字串，正式站不會載入 Google Analytics。
- 2026-08-30 決策：第一階段不啟用 GA4、第三方 pixel、session replay 或跨頁識別碼；
  改採 D+ 聚合量測＋自願任務測試。D+ 只允許 Perth 日期、固定出口／結果類別與聚合計數；
  應用程式與 D1 不讀取或保存 IP、User-Agent、referrer、搜尋原文、表單內容或可連結個人的事件列。
- 詐騙、健康、剝削等敏感頁面即使未來啟用 GA4，也不得做個人層級行為量測。
- 設定有效 `G-...` ID 後，仍採 Basic Consent：未選擇或拒絕時不建立 Google tag request；
  同意後才載入。選擇只存 `whv-analytics-consent-v1`，頁尾可重開設定。
- 不設定 User-ID；停用廣告儲存／個人化與 Google Signals；page view 移除 URL query／hash。
  站內搜尋只送 `result_count` 與白名單 `top_result_page`，不送原始查詢。
- GA 帳戶／Property／Web data stream、Search Console 網域驗證與 sitemap 提交都屬 §0 人工前置；
  步驟見 `docs/MEASUREMENT_SETUP.md`，不得把帳密、OTP 或驗證碼寫進 repo。

## 2. 內容規範

1. 事實三級標示（SDD §7）；社群經驗必標「社群通報模式／非官方」。
2. 網站定位句固定為：「我們想成為對打工度假者最友善的網站——不替你草率做決定，
   而是幫你看懂選項、查到依據，找到適合自己的下一步。」這是維護目標，不得改寫成
   已被證明的自我宣稱。
3. 重要內容採「下一步 → 為什麼 → 官方依據」分層證據卡；顯示來源機構、查核日期、
   翻譯／編輯狀態與官方連結。圖片只輔助流程、選項與風險，關鍵資訊不得只靠圖片傳達。
4. 防詐內容：只描述手法、紅旗、自保、救濟管道；**不點名**任何具體對象。
5. 語氣：短段落、講人話、誠實優先（「查不到」比假自信好）；比喻與幽默可以，
   但嚴肅主題（心理健康、性騷擾、死亡風險）不開玩笑。
6. 金流用語一律「贊助／支持」，不用「募款／捐款」（台灣公益勸募條例考量）。
7. 商業內容一律明示關係；不得讓付費影響官方事實、風險揭露、推薦排序或負面資訊的保留。
8. 新數字必附：官方連結＋查核日期；並評估是否列入 §7 年度更新清單。

## 3. 相依與整合點

- 現況：GitHub Pages（公開前端部署）、Google Fonts（唯一前端外部資產）、GitHub Issues（公開回饋）。
- 已批准的最小後端目標：Cloudflare Worker（API）、D1（CRM 與聚合計數）、Turnstile
  （表單防濫用）與可替換的交易信服務。Email Sending 正式可用前必須通過 P0-4。
- repo 內不得出現 API key／secret；前端不得包含 D1、Turnstile secret 或寄信憑證。

## 4. 待辦 Backlog — P0（下一步就做）

### P0-1 贊助整合（人工前置：站長提供連結後才可執行）

前置條件：站長本人完成 Buy Me a Coffee 與綠界帳號註冊，提供
`https://buymeacoffee.com/<帳號>` 與 `https://p.ecpay.com.tw/<代碼>`。

2026-08-29 現況：`https://buymeacoffee.com/easyknowai` 公開頁已驗證 HTTP 200，但後台仍提示
需設定付款方式才能開始接收支持；綠界公開連結尚未提供。因此雙管道前置尚未完成，下列 repo
改動不得先以單一網址冒充完整 P0-1。

執行內容：
1. `about.html`：移除「籌備中」段落與 TODO 註解，換成兩顆按鈕
   （台灣讀者→綠界、海外讀者→BMC），沿用 `.btn` 樣式、無 emoji。
2. 新增 `.github/FUNDING.yml`：`custom: [<兩個連結>]`。
3. （選配）回饋列加第三顆低調贊助入口——需站長同意，預設不做。

驗收：兩連結 HTTP 200；about.html 無「籌備中」字樣；repo 首頁出現 Sponsor 鈕；
§6 全套通過。

### P0-2 自訂網域（網域已購得：`aussiewhvcompass.com`）

正式主機名使用 `www.aussiewhvcompass.com`，裸網域自動導向 `www`。repo 的 `CNAME`
固定為正式主機名；Cloudflare DNS 依 GitHub Pages 官方配置加入裸網域 A／AAAA，
`www` CNAME 直接指向 `jason201385-commits.github.io`，不得使用 wildcard DNS。
Pages 設定 enforce HTTPS；每頁 canonical／`og:url` 與 Issue Template 首頁連結使用正式網域。

### P0-3 Search Console（GA4 第一階段暫不啟用）

前置條件：站長本人完成 Search Console Domain property 的 DNS 驗證與 sitemap 提交。
GA4 Property／Web data stream 不再是第一階段必要條件；除非未來重新通過資料用途、維護能力、
流量與敏感頁排除等 gate，`analytics-config.js` 必須維持空 ID。

Agent 不得代辦帳號註冊、密碼／OTP、Google 權限或 DNS 驗證碼。Search Console 完成必須有
正式 property 與 sitemap 成功狀態證據；只有 repo 內文件或 meta 不算完成。

### P0-4 Cloudflare 最小後端（人工前置）

前置條件：站長本人啟用或建立 Worker、D1、Turnstile 與寄信所需方案／網域資格，並在
Cloudflare 受保護設定中輸入 secrets。Email Sending 若仍為 Beta 或方案不符，不得假設可用；
Worker 的寄信介面必須可替換，正式採用前需以受控地址完成 deliverability 與退信測試。

Agent 可先完成本機 Worker、D1 migrations、Turnstile server-side validation、mock mail transport
與測試；沒有正式資源、綁定與成功回執前只能標為「程式完成／本機驗證」，不得標為已上線。

## 5. P1 實作狀態／P2 Backlog

### P1-1 採收季節月曆工具（work.html）— 實作完成

- 資料：各州官方農業廳季節表（VIC 已有官方來源；其餘州需逐一查證，
  查不到的州標「無官方資料」——不得用非官方湊滿）。
- UI：月份 × 州 grid 或「選月份→亮起有採收的州＋作物」；行動版優先；零打字。
- 資料檔獨立 `assets/seasons.js`，附來源與抓取日期，比照 postcodes.js 管理。
- 驗收：至少 3 個州有官方來源；每筆資料可追溯；§6 通過。

現況：`assets/seasons.js` 已收錄 VIC、TAS、NT 三個官方來源；其他州／領地明示查無可直接
轉成月份的同級官方表，不以民間資料補空白。月份按鈕、行動版 grid 與來源回鏈均已上線。

### P1-2 「我的行前海報」一鍵輸出（評審提案 B 精簡版）— 程式完成、實機待驗

- 匯集使用者的工作表答案＋清單進度＋試算結果（皆在 localStorage），
  以 Canvas 排版成 A4 直式海報（站內設計語言），輸出 PNG 下載。
- 隱私：全程本地生成，不上傳。
- 驗收：iPhone Safari 與 Android Chrome 實測可下載；空資料時有引導文案。

現況：Canvas A4 直式 PNG、本機預覽、下載／長按儲存備援與空資料引導都已完成；桌機與 390px
瀏覽器 E2E 已通過。真正的 iPhone Safari、Android Chrome 實機下載仍屬人工驗收，不得只用
模擬 viewport 冒充。

### P1-3 視覺升級：動態剪紙（評審提案 A 完整版）— 實作完成

- hero blobs 改 SVG path＋`@keyframes` 頂點微變形；滾動視差。
- 必須包在 `prefers-reduced-motion` 保護內；行動版可停用。

現況：首頁檸檬／切片 SVG 形變與捲動視差已上線；`prefers-reduced-motion` 或 640px 以下停用，
桌機載入動畫不循環。

### P1-4 友善首頁快速分流 — 實作完成

- hero 緊接定位句；先顯示緊急／安全／期限出口，再以旅程階段分組呈現所有主要問題卡。
- 問題卡採「類別＋真實情境」；站內搜尋是第二入口，輕量引導問題是第三入口，AI 只可作 fallback。
- 一般情境先給立即安全行動；只有路徑或風險會改變時才先問 1–2 個必要問題。
- 主要驗收：新訪客可在 30 秒內找到正確情境與第一個安全下一步；桌機／390px／no-JS 可用。

現況：首頁已依序呈現使命句、4 個緊急安全出口、12 張旅程問題卡、全站搜尋、原生兩題引導與
第三方生活社群；LINE 入口移到一般導覽之後。桌機／390px／no-JS E2E 已通過；「買二手車」
熱門詞已驗證可命中 cost 買車段落，不再提供會導向零結果的入口。

### P1-5 分層證據卡與內容狀態 — 第一批實作完成

- 元件固定呈現白話下一步、理由、來源機構、查核日期、翻譯／編輯狀態與官方連結。
- 先套用簽證、薪資稅務、健康、安全、詐騙；過期時明示「待重新確認」且保留官方出口。
- 不大量複製官方原文；來源連結必須直接支撐相鄰主張。

現況：`visa.html`、`cost.html`、`work.html`、`health.html`、`scam.html` 已在目錄前提供唯一證據卡，
依序呈現安全下一步、理由、官方來源、查核日期、繁中編輯狀態與可展開依據。元件已保留
`data-evidence-status="stale"` 樣式與驗收規則；任何改為過期狀態的卡片都必須明示「待重新確認」。

### P1-6 簡約檸檬圖文系統 — 第一批實作完成

- 延續淡藍條紋、檸檬黃、灰綠葉與簡單手繪感，優先使用流程圖、選項圖與風險提示圖。
- 實景照片只用於辨識地點、環境或物品；所有資訊圖需有等義文字與適當替代文字。

現況：`why.html` 提供快思／慢想選項圖，`visa.html` 提供四節點申請流程，`health.html` 提供
保險三問檢核，`scam.html` 提供停／查／護風險圖。四者皆以語意化清單與原生連結承載完整文字，
檸檬與葉片只由 CSS 作裝飾；桌機、手機與 no-JS 皆不會遺失資訊。

### P1-7 SEO、AI 探索與內容權利 — 實作完成

- 開放搜尋引擎與 AI 發現、索引及合理引用；提供 sitemap、JSON-LD、來源與內容狀態。
- 保留網站內容權利，要求引用標示出處；不允許爬取表單、CRM、個資、管理端或冒名整站重製。

現況：`sitemap.xml` 列出完整繁中、Quick Start 與完整英文頁；每個繁中主頁提供 canonical、Open Graph、
JSON-LD、`llms.txt` 與帶版本的 `content-status.json` discovery link。`content-status.json` 誠實揭露
13 個繁中主頁、7 個完整英文頁、37 個 Quick Start locale 的風險、編輯與審校狀態；
`crawler-policy.txt` 與 `robots.txt` 開放公開內容，同時排除表單 API、CRM、確認、收據與刪除端點。

### P1-8 Cloudflare Worker／D1 基礎 — 程式完成／本機驗證，正式仍待 P0-4

- 前端仍由 GitHub Pages 提供；後端獨立為無框架 Worker，僅承接需求單、確認信、刪除申請與 D+。
- D1 migrations、prepared statements、CORS 白名單、輸入長度限制、Turnstile server-side validation、
  rate limit 與 mock transport 必須有自動測試；secret 不得進 repo。

2026-08-30 本機證據：獨立 `worker/` 使用 Wrangler 4.127.1、Workers runtime Vitest plugin 與
TypeScript；14 項測試涵蓋 CORS、16 KiB JSON 上限、Turnstile token／hostname／action、以 server secret
HMAC 化的 Email 限流鍵、D1 migration／prepared statements、白名單 D+ counter 與不對外寄送的
mock mail。`wrangler d1 migrations apply DB --local` 與 `wrangler deploy --dry-run` 通過；設定中的
D1 ID 是不可部署的全零佔位值，`workers_dev`／preview URL 關閉，沒有建立遠端資源、輸入 secret、
寄信或部署。P1-9 與 P1-10 已在後續任務完成本機閉環；正式站仍維持 Email／複製備援與零 D+ request。

### P1-9 私人需求單與 CRM — 程式完成／本機驗證，正式仍待 P0-4

- 必填聯絡 Email、需求類型、需求說明；姓名／組織、時程、預算區間選填。
- 明示不得提交護照、簽證、健康、金融、帳密、第三人或未公開客戶資料。
- 成功時顯示案件編號與時間，寄出不含行銷的需求摘要確認信，並提供複製備援；
  通常 3–5 個工作天回覆，但不代表接受委託或契約成立。
- 一般詢問與未成交需求於結案或最後聯絡後 24 個月刪除；提供查閱、更正、刪除申請。
  正式合約、付款或依法另需保存的資料使用不同分類與規則。

2026-08-30 本機證據：Worker 端建立、管理、更新、刪除四條 POST route；案件編號使用不可預測 UUID，
管理 token 以 32-byte 隨機值產生且 D1 只存 SHA-256。D1 batch 同時建立案件、管理 token 與 mail outbox；
mock transport 接受後才回 `sent`，未設定 transport 時案件仍安全建立但回 `queued` 並標記 retry。
18 項 Workers runtime 測試涵蓋完整建立→查閱→更正→永久刪除、token 不存明文、回應不回顯 Email／
自由文字、24 個月 purge 與無寄信資源的排隊狀態。前端已具 Turnstile 漸進增強、後端回執判斷、
管理 fragment 清除、桌機／手機／no-JS 備援；但公開 API origin 與 site key 刻意留空，未建立正式資源、
未真實寄信或部署。P0-4 完成並通過收件／退信與正式 E2E 前，只能稱程式完成／本機驗證。

### P1-10 D+ 聚合量測 — 程式完成／本機驗證，正式仍待 P0-4

- 不建立 client ID、cookie、fingerprint 或跨頁識別；只累加日期＋白名單類別的聚合 counter。
- endpoint 拒絕 query 與額外欄位；應用程式不讀取或保存自由文字、表單內容、IP、User-Agent、
  referrer、精細地理位置或精確作答時間。基礎設施仍會為傳輸與防濫用處理必要的網路連線資料，
  不得把「應用程式不保存」寫成供應商完全不處理。
- 搭配自願任務測試評估 30 秒找路、理解依據與正確求助；答案與精確計時只存在當頁記憶體，
  後端只收到成功與完成的固定類別，沒有研究逐筆資料集。

2026-08-30 本機證據：`POST /api/metrics` 只接受單欄位 `{metricKey}` 與 7 個白名單類別，
由伺服器依 `Australia/Perth` 產生日期，再以 prepared statement 增加 `daily_counters`；D1 schema
只有日期、類別、總數與更新時間。固定類別 edge-local rate limit 只作防濫用，不作人數或完成證據；
該 route 不寫 application request log，Wrangler observability 預設關閉。21 項 Workers runtime 測試包含
日期邊界、重複累加、額外欄位／query／未知類別拒絕、schema 欄位與無 application log。
繁中頁先載入公開 API 設定再載入 `main.js`；設定仍為空，所以正式頁不會發出 D+ request。
自願測試可在本機完成並明示沒有送出計數；公開 API 啟用與正式收據仍待 P0-4。
桌機、390px 手機與 CSP 阻擋 script 的 E2E 皆無水平溢位；正常模式會顯示測驗控制項，script 未執行時
控制項保持隱藏而隱私說明仍可讀，不會把未執行誤報為完成。

### P1-11 商業合作與第三方入口治理 — 程式／內容完成並通過本機驗收

- 一般服務與受監管／高風險服務分級；自然排序依公開標準，贊助版位獨立標示且不能購買第一推薦。
- 上架前公開查核公司／資格、服務費用、投訴管道、商業關係與查核日期；通過不等於保證品質。
- 一般爭議標示複查中並暫停推薦；涉及安全、詐騙或資格失效立即下架，保留更正紀錄。
- LINE 群只出現在生活交流區，標為第三方社群；本站沒有管理權，不作高風險支援或專業轉介。

2026-08-30 實作：`about.html#recommendation-policy` 公開三級服務分流、自然排序標準、付費版位隔離、
上架必要欄位與爭議處理；`third-party-register.json` 機器可讀列出 LINE 生活群、一般平台入口群與
OMARA 官方名冊，並明示目前付費版位、聯盟連結、商業轉介與付費排序皆未啟用。
LINE 邀請 URL 在完整繁中頁只保留首頁一處；找工作頁不再把該群列為求職入口。`llms.txt` 與
`crawler-policy.txt` 將登錄表列為可索引、可引用的公開治理資料。
桌機、390px 手機與 CSP 阻擋 script 的 E2E 均顯示 3 級服務卡、目前商業狀態與登錄表入口，
沒有水平溢位；首頁實際只顯示 1 個 LINE 邀請與無付費／無佣金／非本站管理邊界。

### P1-12 第一輪公開使用者回饋修正 — 實作完成並通過本機驗收

- 首頁目的必須一眼看出是「找答案、查依據、取得下一步」，不得把站長課程、網站或數位工具服務
  當成旅程主線；服務與私人合作只留在 About 的次要區段。
- 首頁與 About 必須區分「官方依據／本站編輯整理／社群第一手回報」，不得把未親歷內容包裝成
  個人經驗；查不到來源標「待查證」。
- OMARA 名冊連結使用目前可開啟的 `portal.mara.gov.au` 官方入口，舊網址列入回歸禁止清單。
- 768px 以下 header 不固定在 viewport；四段旅程使用不同內容表面，長頁一級段落標題使用交替色帶，
  降低同背景長文疲勞。功能圖表優先於純裝飾照片，照片需有資訊用途、來源與授權。

### P2-1 雙主題「Red Centre／Coast」切換（評審提案 C，不含音效）

- 手動主題切換（localStorage 記憶）疊加在現有深淺色之上；
  實作前先解 token 三態複雜度，附設計稿再動工。

### P2-2 英文版（i18n）

- 2026-08-29 已完成第一階段：目錄式 `/lang/<locale>/` Quick Start、38 種主要語言切換、
  49 個現行 417／462 護照國家／地區覆蓋表、SEO `hreflang` 與 RTL；繁中／英文為來源文案，
  其餘明示未校對機器翻譯或英文 fallback。
- 第二階段現況：`/lang/en/visa/`、`/lang/en/prep/`、`/lang/en/cost/`、`/lang/en/housing/`、`/lang/en/work/`、`/lang/en/scam/` 與 `/lang/en/health/` 已完成可索引的完整英文 editorial beta。
  visa 將台灣限定 417 內容改寫為護照中立的 417／462 分流，郵遞區號快查器明示只適用 417；
  prep 以護照中立方式重寫簽證核准後的文件、RHCA／保險、現金申報、藥品與生物安全、各州駕照、
  落地住宿、TFN／銀行／myGov／super，並提供獨立本機 key `whv-prep-check-en-v1` 的 21 項英文清單，
  避免英中項目語意不完全相同時誤沿用勾選；
  cost 以 2026–27 WHM 累進稅率重算 46 個收入週與 52 個支出週，提供跨護照的薪資、食衣交通、
  二手車 PPSR／八州領地過戶與免費支援入口，不把台幣、Perth 價格或台灣稅務邊界直譯成全球通則；
  housing 以護照中立方式提供不含聯盟參數的短住、合租與整租入口，將看房、合約、bond、condition report、
  工作綁住宿與離場處理拆成可執行步驟，並逐一連到八州領地的官方租屋機關，不把 WA 規則誤寫成全澳通則；
  work 以跨護照適用的求職、薪資、職場紅旗與求助路徑重寫，並提供完整英文採收月份工具；
  scam 不直譯華人限定敘事，改為跨護照的工作、簽證、租屋、金流、個資與通報分流，測驗亦完整英文；
  health 以跨護照 Medicare／RHCA 分流重寫，不沿用台灣健保核退與易過期價目表，改提供訪客保險查核、
  就醫層級、藥品、職災、心理健康、家庭／性暴力支援、偏遠工作安全與可直接撥打的緊急聯絡入口。
  已重查 Home Affairs／Fair Work／ATO／Scamwatch／ACSC／AFP 等一手來源，但尚未經相應母語專業人士
  校對，不得標為 reviewed。
- 第二階段 backlog：替 visa／prep／cost／housing／work／scam／health 找母語或合格專業人士校對，再依使用量擴充其他語言與頁面。
  台灣特定內容（健保核退、台幣、駐外館處）需在地化改寫而非直譯；未經母語者校對不得標為 reviewed。

## 6. 驗收程序（每次 push 前必跑）

```powershell
# 1) 結構＋內部連結＋錨點＋nav 數量（0 錯誤才過）
#    逐頁檢查：<title>、</html>、單一 nav 12 連結、footer、assets 掛載
#    href="*.html#anchor" 的檔案存在且錨點 id 存在
#    本機 CSS／JS／資料檔皆有且共用同一個 ?v= 資產版本
#    CNAME、每頁 canonical/og:url、sitemap.xml、robots.txt 全部鎖定正式網域且頁數一致
#    404.html 必須 noindex、保留 12 項導覽，並提供首頁與四階段旅程復原入口
#    每頁唯一 h1/main、zh-Hant、viewport、ID 不重複；新分頁連結需 noopener；button 必須宣告 type
# 2) emoji 掃描（0 命中才過）：regex [\uD83C-\uD83E][\uDC00-\uDFFF]|️ 於 *.html 與 assets/*.js
# 3) 集簽快查器測試組（線上或本地開頁跑 JS）：
#    4880/plant=YES  2000/plant=NO  0870/tourism=YES  7215/tourism=YES
#    3000/tourism=NO 5000/plant=YES 2615/bushfire=YES
# 4) 試算器基準：33.05×38h、住宿 250、其他 240 → gross week $1,256、annual tax $10,581、after-tax work week $1,026、annual remainder $21,710；0 工時 → 負全年餘額＋警語
# 5) 部署後：cache-bust 開線上站，抽測一個工具＋回饋列存在
```

（1、2 已有現成 PowerShell 片段散在 commit 歷史，建議整併成 `scripts/check.ps1`
—— 這本身可以當第一個小任務。）

## 7. 例行維護

| 週期 | 工作 |
|---|---|
| **每年 7 月**（最重要） | 全站數字年檢：417 簽證費、NMW/casual 時薪、WHM 稅級距、super 率、CSIT/SSIT、Opal 上限；逐項開官方頁核對、更新 updated-tag |
| 每季 | 交通票價政策優惠（myki 半價 2027-01 到期、QLD 50c、Perth $2.80）、手機方案、匯率係數（tools.js 的 22.8） |
| 官方公告時 | postcodes.js 重抽（SDD §5 程序）；WHM 制度變動（88 天檢討、Workplace Justice 試辦狀態） |
| 隨時 | Issue triage：「需要查證」→查官方→修→關單附證據 |

## 8. 給接手 agent 的啟動指令建議

> 讀 `docs/SDD.md` 與 `docs/SPEC.md` 全文 → 跑 SPEC §6 驗收確認基線乾淨 →
> 從 P0 依序執行；P0-1/P0-2 沒拿到人工前置就跳過，不要自行註冊任何帳號 →
> 每個任務完成後跑 §6 再 commit，訊息寫清楚改了什麼與為什麼。
