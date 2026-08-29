# 澳打指南針 — 功能規格與待辦（SPEC）

> 版本 1.0｜2026-08-29｜搭配 `docs/SDD.md` 閱讀。
> 本文件是交給任何後續執行者（codex／其他 agent／人類貢獻者）的工作規格：
> §1–§3 描述現況（已完成、驗收過），§4–§5 是待辦 backlog（含驗收標準），
> §6 是每次改動後必跑的驗收程序，§7 是例行維護。

## 0. 執行者邊界（先讀這段）

- 遵守 SDD §1.1 六原則；違反任一條的 PR 不收。
- **只有站長本人**能做的事（agent 不得代辦，規格上視為人工前置條件）：
  註冊任何帳號、輸入身分證件／銀行帳戶／密碼／OTP、金流設定、發布社群貼文。
- Agent 可以做：讀寫此 repo、commit、push（站長已授權此 repo 的部署流程）、
  跑驗收腳本、開 draft 內容。對外部服務的任何寫入操作都要先問站長。
- 內容修改必須維持來源標註格式：`<span class="updated-tag">YYYY-MM 查核</span>`
  與 `<p class="fact-meta">來源：<a ...>名稱</a>｜YYYY-MM-DD 查核</p>`。

## 1. 已完成功能總表（現況＝驗收基線）

### 1.1 內容頁（13 頁）

依旅程排序：why → visa → prep → cost → housing → work → scam → english →
health → leave → pr → about（+index）。每頁：toc、來源標註、頁尾免責、回饋列。
內容基準日 2026-08-28/29，重大事實均經官方頁一手查證與反方審查。

### 1.2 互動工具規格（現行為準）

| 工具 | 位置 | 輸入 | 邏輯 | 輸出 |
|---|---|---|---|---|
| 集簽資格快查器 | visa.html `#postcode-tool` | 4 碼郵遞區號（字串，保留前導零）＋類型（plant/tourism/bushfire/disaster）＋6 個熱門點 chips | 州判定（NT 0800-0999、ACT 2600-2618∪2900-2920、Norfolk 2899…）→ 對應表查 `ALL` 或範圍；tourism＝三表聯集；跨州碼全清單兜底掃描 | 合格/不合格判定＋類型日期條件＋三前提提醒＋官方連結 |
| 存錢試算器 | cost.html `#save-calc` | 時薪滑桿 24–45（預設 33.05）、工時 0–50（38）、城市房租 select、生活型態 select | gross=r×h；net=gross×0.85（WHM 15%）；super=×0.12（僅顯示）；save=net−rent−living；year=save×46 週 | 六格數據＋台幣換算（×22.8）＋四級評語（≤0/／<250／<550／≥550） |
| 行前互動清單 | prep.html `#prep-checklist` | 21 項勾選（3 組，JS 產生） | localStorage `whv-prep-check-v1`、進度條、100% 彩蛋文案、清空需 confirm | 進度 x/21（%） |
| 離澳收尾清單 | leave.html `#leave-checklist-tool` | 9 項零打字勾選（無 JS 仍可閱讀） | localStorage `whv-leave-check-v1`、進度條、清空需 confirm；100% 時顯示非強迫的感謝銜接 | 進度 x/9（%）＋完成提示 |
| 防詐測驗 | scam.html `#scam-quiz` | 8 情境 ×（接受/快跑） | 正解：2、5 題為「接受」其餘「快跑」；逐題回饋含紅旗解說 | 計分＋三級稱號（≥7 大師／≥5 有 sense／其餘肥羊） |
| DASP 速算 | leave.html `#dasp-calc` | 金額 number＋4 個金額 chips | take=×0.35、tax=×0.65 | 兩格數據＋台幣評語 |
| 自我釐清工作表 | why.html `#worksheet` | 8 題 textarea＋Q4/Q5 快選 chips | 600ms 防抖存 `whv-worksheet-v1`；chips 以頓號接續填入 | 匯出 .txt／列印／清空 |
| 回饋列 | 全站（main.js 注入） | — | 分享鈕→clipboard 複製網址＋致謝文案；回報鈕→`report.yml`；感謝鈕→`thanks.yml`，兩者都自動帶入頁名 | — |
| 繼續上次閱讀 | 首頁 `#journey-resume` | 自動記錄最近開啟的白名單內容頁 | localStorage `whv-last-page-v1` 只存 `{path}`；首頁以固定頁名／階段 map 顯示，拒絕未知 path | 續讀連結＋清除紀錄；首次訪問或無效資料時隱藏 |
| 我的收藏 | 首頁 `#saved-pages`＋內容頁回饋列 | 內容頁單鍵收藏；首頁可開啟、個別移除或確認後清空 | localStorage `whv-saved-pages-v1` 只存白名單 path 陣列；標題／階段由固定 `JOURNEY_PAGES` 產生，拒絕未知與重複 path | 無收藏時首頁隱藏；有收藏時依收藏順序顯示 |
| 當下需求快導 | 首頁 `#support-hub` | 6 個情境式零打字入口 | 只連向既有內容錨點：找房、工作查核、詐騙救濟、就醫、心理支援、離澳清單；另列緊急聯絡總表 | 直接跳到處理步驟，不複製可能過時的電話或政策數字 |
| 頁尾旅程導覽 | 12 個內容頁（main.js 注入） | — | 依首頁四階段的 `JOURNEY_ORDER` 單一排序產生上一站／完整旅程／下一站；首頁不注入，首末頁以首頁旅程圖收邊 | 顯示目前階段與第 x/12 頁，不強迫線性閱讀 |

### 1.3 回饋機制

`.github/ISSUE_TEMPLATE/report.yml`（回報過時/錯誤：頁面自動帶入、類型下拉、
描述、官方來源選填；label「需要查證」）＋ `idea.yml`（許願池）＋ `thanks.yml`
（公開感謝：旅程階段、受幫助頁面、給後來者的話、隱私確認、摘錄同意）。

- 修正閉環：網站回饋列 → 結構化 issue → 查證修正 → push 部署。
- 感謝閉環：點擊前與表單頂端明示 GitHub 登入、帳號／內容公開與個資風險 →
  公開 Issue → 人工確認無敏感／第三人資料 → **只有明確勾選同意**才可
  去識別化摘錄至本站；使用者可在原 Issue 要求移除。不得自動發布、不得虛構留言。

## 2. 內容規範

1. 事實三級標示（SDD §7）；社群經驗必標「社群通報模式／非官方」。
2. 防詐內容：只描述手法、紅旗、自保、救濟管道；**不點名**任何具體對象。
3. 語氣：短段落、講人話、誠實優先（「查不到」比假自信好）；比喻與幽默可以，
   但嚴肅主題（心理健康、性騷擾、死亡風險）不開玩笑。
4. 金流用語一律「贊助／支持」，不用「募款／捐款」（台灣公益勸募條例考量）。
5. 新數字必附：官方連結＋查核日期；並評估是否列入 §7 年度更新清單。

## 3. 相依與整合點

- GitHub Pages（部署）、Google Fonts（唯一外部資產）、GitHub Issues（回饋）。
- 無任何 API key／secret；repo 內不得出現憑證。

## 4. 待辦 Backlog — P0（下一步就做）

### P0-1 贊助整合（人工前置：站長提供連結後才可執行）

前置條件：站長本人完成 Buy Me a Coffee 與綠界帳號註冊，提供
`https://buymeacoffee.com/<帳號>` 與 `https://p.ecpay.com.tw/<代碼>`。

執行內容：
1. `about.html`：移除「籌備中」段落與 TODO 註解，換成兩顆按鈕
   （台灣讀者→綠界、海外讀者→BMC），沿用 `.btn` 樣式、無 emoji。
2. 新增 `.github/FUNDING.yml`：`custom: [<兩個連結>]`。
3. （選配）回饋列加第三顆低調贊助入口——需站長同意，預設不做。

驗收：兩連結 HTTP 200；about.html 無「籌備中」字樣；repo 首頁出現 Sponsor 鈕；
§6 全套通過。

### P0-2 自訂網域（人工前置：站長購得網域並告知）

執行：repo 加 `CNAME` 檔＋DNS 指引給站長（CNAME→`jason201385-commits.github.io`）；
Pages 設定 enforce HTTPS；全站絕對連結（og、issue 連結）換新網域。

## 5. 待辦 Backlog — P1/P2（規格草案，動工前與站長確認優先序）

### P1-1 採收季節月曆工具（work.html）

- 資料：各州官方農業廳季節表（VIC 已有官方來源；其餘州需逐一查證，
  查不到的州標「無官方資料」——不得用非官方湊滿）。
- UI：月份 × 州 grid 或「選月份→亮起有採收的州＋作物」；行動版優先；零打字。
- 資料檔獨立 `assets/seasons.js`，附來源與抓取日期，比照 postcodes.js 管理。
- 驗收：至少 3 個州有官方來源；每筆資料可追溯；§6 通過。

### P1-2 「我的行前海報」一鍵輸出（評審提案 B 精簡版）

- 匯集使用者的工作表答案＋清單進度＋試算結果（皆在 localStorage），
  以 Canvas 排版成 A4 直式海報（站內設計語言），輸出 PNG 下載。
- 隱私：全程本地生成，不上傳。
- 驗收：iPhone Safari 與 Android Chrome 實測可下載；空資料時有引導文案。

### P1-3 視覺升級：動態剪紙（評審提案 A 完整版）

- hero blobs 改 SVG path＋`@keyframes` 頂點微變形；滾動視差。
- 必須包在 `prefers-reduced-motion` 保護內；行動版可停用。

### P2-1 雙主題「Red Centre／Coast」切換（評審提案 C，不含音效）

- 手動主題切換（localStorage 記憶）疊加在現有深淺色之上；
  實作前先解 token 三態複雜度，附設計稿再動工。

### P2-2 英文版（i18n）

- 目錄式（`/en/`）而非 JS 切換；先譯 scam／visa／work 三頁試水溫。
- 台灣特定內容（健保核退、台幣、駐外館處）需在地化改寫而非直譯。

## 6. 驗收程序（每次 push 前必跑）

```powershell
# 1) 結構＋內部連結＋錨點＋nav 數量（0 錯誤才過）
#    逐頁檢查：<title>、</html>、單一 nav 12 連結、footer、assets 掛載
#    href="*.html#anchor" 的檔案存在且錨點 id 存在
#    本機 CSS／JS／資料檔皆有且共用同一個 ?v= 資產版本
# 2) emoji 掃描（0 命中才過）：regex [\uD83C-\uD83E][\uDC00-\uDFFF]|️ 於 *.html 與 assets/*.js
# 3) 集簽快查器測試組（線上或本地開頁跑 JS）：
#    4880/plant=YES  2000/plant=NO  0870/tourism=YES  7215/tourism=YES
#    3000/tourism=NO 5000/plant=YES 2615/bushfire=YES
# 4) 試算器基準：33.05×38h → gross $1,256、net $1,068；0 工時 → 負存款＋警語
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
