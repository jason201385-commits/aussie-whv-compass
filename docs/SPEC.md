# 澳打指南針 — 現況行為契約（SPEC）

> 版本 2.0｜最後更新 2026-09-02｜本文件只寫「現在的行為是什麼、怎麼驗證」。
> 待辦與狀態在 `ROADMAP.md`，為什麼與證據在 `DECISIONS.md`，原則與架構在 `SDD.md`，
> 閱讀路線在 `README.md`。改動任何功能行為時，必須在同一個 commit 更新本文件對應列並更新標頭日期。

## 0. 執行者邊界（先讀這段）

- 遵守 SDD §1.1 不可協商原則；違反任一條的 PR 不收。
- **只有站長本人**能做的事（agent 不得代辦，規格上視為人工前置條件）：
  註冊任何帳號、輸入身分證件／銀行帳戶／密碼／OTP、金流設定、發布社群貼文。
- Cloudflare Worker／D1／Turnstile／Email Sending 的帳號啟用、方案或付款、網域驗證、
  secret 輸入與正式資源建立同樣屬人工前置；agent 只能在 repo 內準備程式、migration、
  設定範本與本機測試，不得把憑證寫入檔案、log 或 commit。
- Agent 可以做：讀寫此 repo、commit、push（站長已授權此 repo 的部署流程）、
  跑驗收腳本、開 draft 內容。對外部服務的任何寫入操作都要先問站長。
- 受管制服務界線：站長目前不是澳洲註冊移民代理或澳洲執業律師；不論是否收費，都不得提供
  個人簽證選項建議、準備或代填簽證申請、代表申請人處理簽證事項。
- 內容修改必須維持語言一致的來源標註格式：根層繁中頁使用
  `<span class="updated-tag">YYYY-MM 查核</span>` 與
  `<p class="fact-meta">來源：<a ...>名稱</a>｜YYYY-MM-DD 查核</p>`；`lang/en/**`
  使用等義的 `Sources checked YYYY-MM` 與 `Source: ... | checked YYYY-MM-DD`。

## 1. 現況基線（＝驗收基線）

### 1.1 頁面清單（根層 15 頁＋404）

| 檔案 | 旅程階段 | 內容 | 問題入口 | 證據卡 |
|---|---|---|---|---|
| `index.html` | 入口 | 安全出口、釐清器（4 階段 × 護照 × 需求 → 21 個出口）、6 題找職類、搜尋、AI 兜底（未啟用）、社團目錄、續讀／收藏、遊戲區 | — | — |
| `why.html` | 還在考慮 | 自我釐清快思測驗＋慢想工作表 | 有 | — |
| `visa.html` | 還在考慮 | 簽證與集簽＋郵遞區號初篩 | 有 | 有 |
| `prep.html` | 決定要去 | 行前準備與落地 SOP＋互動清單＋行前海報 | 有 | — |
| `cost.html` | 還在考慮 | 物價薪水稅務、換匯與匯款（`#exchange`）、採買、買車＋存錢試算器 | 有 | 有 |
| `simulator.html` | 遊戲區 | 抵澳 30 天模擬器 | — | — |
| `housing.html` | 已在澳洲 | 住宿與租屋＋合法混合搜尋 | 有 | 有 |
| `work.html` | 已在澳洲 | 找工作、查核、證照、採收月曆、四季職類、職災 | 有 | 有 |
| `scam.html` | 已在澳洲 | 防詐騙 16 手法（含私下換匯）、三道防線、救濟包＋測驗 | 有 | 有 |
| `english.html` | 決定要去 | 英文資源與策略 | 有 | — |
| `health.html` | 決定要去 | 保險就醫心理安全 | 有 | 有 |
| `leave.html` | 回程與延續 | 報稅退休金離澳＋DASP 粗估＋離澳收尾清單 | 有 | 有 |
| `market.html` | 回程與延續／初登澳 | 離澳出清 × 初登澳補給：交換草稿產生器與平台入口 | 有 | 有 |
| `pr.html` | 已在澳洲 | PR 路徑總覽 | 有 | 有 |
| `about.html` | 回程與延續（旅程第 12 站） | 關於、資料分層、回報、私人需求單、自願找路測試、共編、合作治理、贊助、授權、免責 | — | — |
| `404.html` | 復原 | noindex；保留導覽與四階段旅程復原入口 | — | — |

- 旅程順序（`main.js` `JOURNEY_ORDER`，12 站，單一來源）：why → cost → visa（還在考慮）→ prep → health → english（決定要去）→
  housing → work → scam → pr（已在澳洲）→ leave → about（回程與延續）；`index`、`simulator`、`market` 不在線性順序內。
  上表「旅程階段」欄以此為準。
- 每頁：toc（長頁為「完整內容與參考資料」）、來源標註、頁尾免責、回饋列。
- 導覽：全部 15 頁的 `.nav-links` 統一 12 連結（why→about）。`simulator.html` 與 `market.html` 是工具頁，不進全站 nav、頁內不標 `aria-current`，只從首頁、`prep.html`、`leave.html` 與內文連結進入（站長 2026-09-02 決定，`check.ps1` 強制）。
- 內容基準日 2026-08-28／29；換匯段落 2026-09-01 查核。

### 1.2 互動工具契約

「驗證指標」指向 `scripts/check.ps1` 的區塊註解、獨立測試檔或人工步驟；列「人工」者尚無自動化。

| 工具 | 位置 | 輸入 | 邏輯與隱私邊界 | 輸出 | 驗證指標 |
|---|---|---|---|---|---|
| 集簽郵遞區號初篩 | `visa.html` `#postcode-tool`；`lang/en/visa/`（417-only） | 4 碼郵遞區號（字串，保留前導零）＋類型（plant/tourism/bushfire/disaster）＋6 個熱門點 chips | 州判定（NT 0800-0999、ACT 2600-2618∪2900-2920、Norfolk 2899…）→ 對應表查 `ALL` 或範圍；tourism＝三表聯集；跨州碼全清單兜底掃描；不寫 storage | 是否符合 2026-08-29 留存清單＋類型日期條件＋適用限制＋官方頁；不得表述為個人簽證資格判定 | `scripts/test_tools.mjs`（check.ps1 執行；7 案例）；check.ps1「完整英文簽證頁」鎖 417 邊界 |
| 存錢試算器 | `cost.html`／`lang/en/cost/` `#save-calc` | 時薪滑桿 20–60（預設 33.05）、工時 0–50（38）、每週住宿 select、其他支出 select | weeklyGross=r×h；annualGross=×46；annualTax 依 2026–27 WHM 15／30／37／45% 級距；afterTaxWeek=(annualGross−annualTax)÷46；year=(annualGross−annualTax)−weeklyExpenses×52；super=weeklyGross×0.12（OTE 粗估）；輸入與最近結果存 `whv-save-calc-v1` | 六格數據＋稅／super 邊界；繁中台幣示意（係數 22.8 在 tools.js）、英文顯示可覆蓋幾個支出週；四級壓力警語 | `scripts/test_tools.mjs`（check.ps1 執行；基準四值與 0 工時）；check.ps1「完整英文生活成本頁」 |
| 行前互動清單 | `prep.html` `#prep-checklist`；`lang/en/prep/`（獨立 key） | 21 項勾選（3 組，JS 產生） | `whv-prep-check-v1`／`whv-prep-check-en-v1`、進度條、100% 文案、清空需 confirm | 進度 x/21 | check.ps1 頁面基線；「完整英文行前頁」 |
| 我的行前海報 | `prep.html` | 工作表答案＋清單進度＋試算結果（皆 localStorage） | Canvas A4 直式 PNG 本機生成；下載／長按儲存備援；空資料引導 | PNG | 桌機／390px E2E 通過；iPhone Safari／Android Chrome 實機為人工 gate（P1-2） |
| 抵澳 30 天模擬器 | `simulator.html` `#simulator-profile-form`＋`#simulator-stage` | 5 組固定單選；6 個固定事件各 3 個白名單選項 | 資源與關卡只寫 `sessionStorage` `whv-simulator-progress-v1`（版本、型別、範圍嚴格驗證）；不用 localStorage、fetch、自由文字；delta 可重播且恢復不重複套用；緊急就醫事件選項前顯示 `tel:000`；重開需確認；分數不得描述為成功率、適合度、診斷或簽證判定 | 角色快照＋逐關取捨／官方出口＋第 30 天行動地圖；no-JS 只顯示靜態入口 | check.ps1「模擬器」區塊 |
| 住宿合法混合搜尋 | `housing.html`／`lang/en/housing/` `#housing-search-tool` | 先選短住／Share House／整租／農區，再輸入地址或地區；入住日、7／14／28 晚、1–4 人；8 個城市 chips | 依類型把 1–2 個入口置頂、其餘折疊（入口適配度，非價格排名）；預設不呼叫 API；完整地址只取 suburb／州／郵遞區號；公開開關 `accommodationSearchEnabled` 為 true 時才以 `credentials:omit`、`no-referrer` 呼叫 Worker；後端只查有 `displayAuthorization` 的 provider、限流、4 秒 timeout、欄位／網域白名單、不寫 D1／不記錄搜尋內容；失敗保留原始入口；不寫 storage | 情境摘要＋風險提醒＋降級方案；五個原始入口（Hostelworld、Booking.com、Flatmates、realestate.com.au、Domain）；已授權結果按平台分組並揭露關係，不合併排名 | `scripts/test_housing_search.mjs`（check.ps1 執行）；`worker/test/accommodation.test.ts`；check.ps1「住宿搜尋轉接器」；現況公開開關 false、production provider 空 |
| 離澳收尾清單 | `leave.html` `#leave-checklist-tool` | 9 項零打字勾選（無 JS 可閱讀） | `whv-leave-check-v1`、進度條、清空需 confirm；100% 顯示非強迫感謝銜接 | 進度 x/9 | check.ps1 頁面基線 |
| 防詐測驗 | `scam.html` `#scam-quiz`；`lang/en/scam/` | 8 情境 ×（接受／快跑） | 正解以 `tools.js` 資料的 `run` 旗標為準（目前第 2、5 題為接受）；逐題回饋含紅旗解說；不寫 storage | 計分＋三級稱號（≥7／≥5／其餘） | check.ps1「完整英文防詐頁」 |
| DASP 扣繳粗估 | `leave.html` `#dasp-calc` | 估計總額＋tax-free component＋4 個總額 chips | taxFree=clamp(input,0,total)；taxable=total−taxFree；withholding=taxable×0.65；payment=total−withholding | 估算金額＋component／個案限制警語；不得表述為實際可領款 | 人工（§4） |
| 自我釐清雙模式 | `why.html` `#quick-quiz`＋`#worksheet` | 快思 8 題 × 5 點；慢想 8 題 textarea＋價值／取捨 chips | 快思分四面向各 2 題、不合計總適合度、白名單存 `whv-why-quick-v1`；慢想 600ms 防抖存 `whv-worksheet-v1`，相容舊答案與海報 | 快思分面＋最低面向下一步；慢想匯出 .txt／列印／清空 | check.ps1「自我釐清」區塊 |
| 私人合作需求單 | `about.html` `#private-contact`＋`#contact-brief`＋`#contact-management` | 必填 Email、需求類型、目前卡點、希望結果與邊界確認；姓名／組織、時程、預算選填 | `api-config.js` 空值時不寫 localStorage、不上傳，只產生 Gmail／mailto／複製備援（所有參數 `encodeURIComponent`；clipboard 不可用時只選取預覽）；啟用後需 Turnstile、後端 `{ok:true}` 回執，管理 token 只經 fragment | 現況：Email／複製備援；程式已支援案件編號、sent／queued、查閱、更正、永久刪除 | `worker/test/contact.test.ts`、`security.test.ts`；check.ps1 about.html 需求類型禁招攬檢查；正式啟用屬 P0-4 |
| 自願找路測試（D+） | `about.html` | 固定題目，零打字 | 答案與 `performance.now()` 只留當頁記憶體；origin 留空時 `sendDplusMetric()` 回 `false` 不建 request；啟用後只送 7 個白名單 metricKey；開始鍵 HTML 預設 `hidden`，由 `main.js` 揭露 | 本機結果＋後端是否接受計數的區分 | check.ps1「D+」區塊；`worker/test/metrics.test.ts` |
| 離澳出清 × 初登澳補給草稿 | `market.html` `#market-tool` | 模式（賣出／徵求）、分類、物品、城市、狀況、價格、面交方式、備註、安全確認 | 只在當頁記憶體，不寫 storage、不呼叫 API；產生可複製刊登草稿；Facebook Marketplace／eBay 搜尋連結由分類關鍵字與城市組成；不代刊登、不支援受限物品（頁面 `#restricted-title` 列出） | 草稿文字＋複製＋兩個平台入口＋安全五件事 | check.ps1 對 `market.html` 的 nav／問題入口／證據卡斷言 |
| 回饋列 | 全站（`main.js` 注入） | — | 分享→clipboard 複製網址；回報→`report.yml`；感謝→`thanks.yml`；自動帶入頁名 | — | check.ps1「感謝閉環」區塊 |
| 繼續上次閱讀 | 首頁 `#journey-resume` | 自動記錄最近開啟的白名單內容頁 | `whv-last-page-v1` 只存 `{path}`；固定頁名／階段 map；拒絕未知 path | 續讀連結＋清除；無資料時隱藏 | check.ps1 首頁入口文案 |
| 我的收藏 | 首頁 `#saved-pages`＋內容頁回饋列 | 單鍵收藏；首頁個別移除或確認後清空 | `whv-saved-pages-v1` 白名單 path 陣列；標題／階段由 `JOURNEY_PAGES` 產生 | 依收藏順序顯示；無收藏隱藏 | check.ps1 首頁入口文案 |
| 緊急安全出口 | 首頁 `#support-hub` | 4 個零打字入口 | 只連既有內容錨點：立即危險、剛匯款／帳號風險、威脅／剝削／扣證件、簽證到期／官方通知 | 先做降低傷害的第一步，不複製可能過時的電話或政策數字 | check.ps1「高風險語意路徑」區塊 |
| 首頁四大入口 | 首頁 `nav.home-zone-nav` | — | 四個同頁錨點：`#clarifier`、`#search`、`#communities`、`#games` | — | check.ps1「首頁釐清器」區塊 |
| 首頁釐清器（P0-7） | 首頁 `#clarifier`：`nav#journey-map`（4 階段）→ 4 個 `.clarifier-panel`（`#considering`、`#committed`、`#in-australia`、`#next-step`）→ 需求 chips → `.clarifier-exit` | 階段 chips 4；護照 chips（台灣 417／中國大陸 462／其他，只在前兩個面板，JS 才顯示，無 JS 顯示一句靜態連結）；需求 chips 6／8／10／6（含「找人聊」「全部顯示」） | hash 驅動、零儲存：`#<stage>` 只顯示該面板並把焦點移到標題；`#exit-*` 只顯示該出口；`#<stage>-exits` 全部顯示；`aria-current="step"`／`aria-pressed` 只在執行期；護照只寫 `data-passport` 屬性並改寫 `data-href-462` 連結；不寫 storage、不 fetch；無 JS 時 4 面板與 21 個出口全部可見、chips 皆為錨點；每個面板附「急事先走安全出口」 | 21 個出口（3／6／8／4）：12 張回收的問題卡（保留 `problem-category`／`card-action`）＋9 個一句話精簡出口，各附深連結與「找人聊」 | check.ps1「首頁釐清器」區塊（階段數、面板 id、出口數、護照區預設 hidden、順序、無打字）；2026-09-02 Playwright 回放 12 步全過（桌機 1280、手機 375／390，截圖 33 張，暫存區） |
| 6 題找職類 | 首頁 `#job-quiz`（由 `#job-quiz` hash 開啟；靜態六大類清單無 JS 可用） | 6 題各 3 個 chips：工作地點、體力、英文口說、互動程度、證照意願、偏遠意願 | 純前端計分到六大職類（採收與農場／餐飲與服務／清潔與房務／工廠倉儲與物流／零售與門市／辦公與專業）；答案不保存 | 職類結果＋`work.html` 錨點連結 | check.ps1 首頁區塊；vm 煙霧測試 78 斷言（暫存區，未入 repo） |
| 旅程問題卡＋直接解法 | 首頁 `#journey-map`（4 個 `.journey-phase`）＋`.direct-solution-grid` | — | 12 張「類別＋真實情境」卡依考慮／準備／在澳／離澳與延續分組；3 張直接解法卡（含 `market.html#market-tool`） | 直接進入對應完整攻略 | check.ps1 首頁入口文案；style.css 分段 needles |
| 各地社團目錄 | 首頁 `#communities` | 地點搜尋框（60 字）、平台 select（全部／LINE／Reddit）、9 格州別地圖鈕、清除 | `main.js` 只在當頁過濾 `data-community-*` 條目；Facebook／Reddit 平台搜尋 href 由輸入或州名 `encodeURIComponent` 組成；不寫 storage、不 fetch；9 個公開入口（1 LINE＋8 Reddit）皆登錄 `third-party-register.json` | 過濾後清單＋狀態文字＋空結果提示＋兩個平台搜尋鈕 | check.ps1「商業合作與第三方入口」區塊（LINE 只在首頁）；篩選邏輯無自動測試（人工） |
| AI 兜底（C-4） | 首頁 `#assist`（釐清器與搜尋之後） | 一句話 4–200 字＋Turnstile | 只在 `apiBaseUrl` 與 `turnstileSiteKey` 都非空時渲染表單，否則只顯示「站內 AI 兜底尚未啟用」；送出前顯示第三方揭露（MiniMax、本站不保存、供應商可能依其條款處理）；`POST /api/assist` `{question, turnstileToken}`，`credentials: omit`、`no-referrer`；模型只回傳站內目錄連結，答案由伺服端固定模板組成（模型文字永不渲染）；回覆以 `textContent` 渲染，連結只接受同站白名單；任何錯誤 fail closed 顯示固定文案 | kind：`answer`（固定模板＋目錄連結）／`official_exit`（敏感輸入或個人判定類問題）／`over_cap`／`refused` | check.ps1 首頁區塊（`#assist` 預設 hidden、origin 空時無 fetch）與 worker 區塊（assist.ts 禁 `console.`）；`worker/test/assist.test.ts` 18 案例（含 console spy、主機白名單、缺 IP）；現況 P0-4 未完成，表單不顯示 |
| 全站搜尋 | header 搜尋鈕＋首頁 `#search`＋JS dialog | 關鍵詞、5 個熱門詞、鍵盤 `/` | 首次使用才載入 `search-index.js`（頁數與入口數以 `scripts/build_search.py` 的 `PAGES` 與產物 `entries` 為準，2026-09-02 為 15 頁／144 入口）；排除 `hidden`、`data-search-ui` 與未啟用 UI；NFKC、固定同義詞、標題／段落加權；不保存、不送出；動態文字只用 `textContent` | 最多 8 個同站深連結；零結果提供縮短關鍵詞與許願入口 | `python scripts/build_search.py --check`（check.ps1 執行）；check.ps1「站內搜尋」區塊 |
| 多國語言 Quick Start | 全站語言 select＋`lang/` | 38 種語言 | 49 個現行 417／462 首簽護照國家／地區映射到靜態 locale；`hreflang`、canonical、RTL、reviewStatus；不保存選擇 | 每語言一頁快速入口＋官方 417／462 連結；7 個完整英文頁為 editorial beta，未經母語專業校對不得標 reviewed | `python scripts/build_i18n.py --check`；check.ps1 七個「完整英文…頁」區塊 |
| 頁尾旅程導覽 | 12 個線性內容頁（`main.js` 注入） | — | 依 `JOURNEY_ORDER` 產生上一站／完整旅程／下一站；首頁、模擬器與市集不注入 | 目前階段與第 x/12 頁 | check.ps1 頁面基線 |
| 長頁問題入口 | 12 頁 `#quick-answers` | — | 4 張真實問題卡各一句「先做」＋同頁深連結；未命中提供 `#full-contents` 捷徑；生命危險卡用 `tel:000`；手機長距離錨點即時跳轉 | 直達段落 | check.ps1「長篇攻略先列真實問題」區塊鎖定每卡目的地 |
| 分層證據卡 | 9 頁（visa、cost、work、health、scam、housing、leave、market、pr） | — | 白話下一步 → 理由 → 來源機構、查核日期、編輯狀態常駐；`data-evidence-status="checked|stale"`；`<details>` 展開，不依賴 JS | 過期標「待重新確認」並保留官方出口 | check.ps1「高風險主題必須先給安全下一步」區塊 |
| 採收季節月曆 | `work.html`；`lang/en/work/` | 月份按鈕 | 資料 `assets/seasons.js`（VIC、TAS、NT 官方來源；其他州標無官方資料）；VIC／TAS 為採收規劃表、NT 只作產季訊號，不得混稱職缺表 | 月份 × 州別作物＋來源回鏈；四季職類與條件式抵達建議 | check.ps1「完整英文工作頁」；`seasons.js` 納入共用資產版本 |

### 1.3 回饋機制

`.github/ISSUE_TEMPLATE/report.yml`（回報過時／錯誤：頁面自動帶入、類型下拉、描述、官方來源選填；
label「需要查證」）＋`idea.yml`（許願池）＋`thanks.yml`（公開感謝：旅程階段、受幫助頁面、給後來者的話、
隱私確認、摘錄同意）＋`collaborate.yml`（公開合作／協助需求摘要；必填隱私與服務邊界確認，不接收文件或聯絡資料）。

- 修正閉環：網站回饋列 → 結構化 issue → 查證修正 → push 部署。
- 感謝閉環：點擊前與表單頂端明示 GitHub 登入、帳號／內容公開與個資風險 → 公開 Issue →
  人工確認無敏感／第三人資料 → **只有明確勾選同意**才可去識別化摘錄至本站；使用者可在原 Issue 要求移除。
  不得自動發布、不得虛構留言。
- 合作閉環：about → 公開 Issue 說明需求與預期結果 → 站長人工評估 → 只在確認適合後另議下一步。
  送出不等於委託成立、保證處理或免費服務；不在公開表單收集聯絡資料、報價、合約、公司內部資訊，
  且不處理緊急或專業個案建議。
- 私人合作：about 可直接寄至站長公開合作信箱，或在頁面本地產生需求單後交給使用者選擇的 Gmail／郵件 App；
  本站不接收、儲存或自動寄出內容。第一封明示不附證件、帳密、第三人個資、未公開客戶資料及簽證／醫療／
  法律／稅務個案，且最後寄出動作由使用者本人完成。
- 商業合作：公開攻略與核心工具維持免費；受邀課程、講座、工作坊、網站與數位工具或內容製作可另行報價。
  是否承接、範圍、時程、費用、交付與取消方式必須另外確認。付費不得購買本站推薦、排名或有利說法，
  商業關係需明示。
- 受管制服務界線：本站可提供 OMARA 官方名冊入口（`portal.mara.gov.au`）與中立轉介；目前沒有指定合作代理
  或佣金轉介。未來若有特定商業轉介，必須在每個連結旁明示關係，不得保證結果；是否收取轉介費須先完成
  法律與稅務確認，確認前不得啟用。未經使用者明確同意不得轉交其聯絡方式或個案內容。

### 1.4 搜尋引擎與 AI 探索

- 15 個根層內容頁各有唯一 title、description、canonical、Open Graph／Twitter 分享資訊，
  並以 JSON-LD 描述 `WebSite`、`WebPage`；內容頁另含 `BreadcrumbList`。
- `robots.txt` 對 `User-agent: *` 開放，指向 `sitemap.xml`（完整繁中頁、語言 hub、Quick Start、完整英文頁）；
  404 維持 `noindex,follow`，不放 canonical 或結構化資料。
- `llms.txt` 提供繁體中文站點導覽、正式頁面、授權與事實界線；是社群提案，不是 crawler 存取控制。
- `content-status.json` 揭露 primaryPages、完整英文頁與 Quick Start locale 的風險、編輯與審校狀態；
  `crawler-policy.txt` 與 `robots.txt` 開放公開內容，排除表單 API、CRM、確認、收據與刪除端點。
- 分享圖固定 1200×630 `assets/og-cover.png`；可編輯來源為 SVG，不公開使用者照片。
- `python scripts/build_seo.py --check` 驗證所有產物與頁面同步；修改 title、description 或頁面清單後
  先重跑 builder，再跑 §4。

### 1.5 量測（依 D-2026-09-02-01）

- 允許：Cloudflare Web Analytics（無 cookie、不需同意；尚未加入）；GA4 Basic Consent（ID 目前空字串）；
  D+ 聚合計數（7 個白名單類別，P0-4 前零 request）。
- GA4 契約：設定有效 `G-...` 後仍未選擇或拒絕時不建立 Google tag request；同意後才載入；選擇只存
  `whv-analytics-consent-v1`，頁尾可重開設定；不設 User-ID；停用廣告儲存／個人化與 Google Signals；
  page view 移除 URL query／hash；站內搜尋只送 `result_count` 與白名單 `top_result_page`。
- **敏感頁排除（已實作）**：`assets/analytics.js` 的 `SENSITIVE_PATHS` 固定為 `/scam.html`、`/health.html`、
  `/lang/en/scam/`、`/lang/en/health/`（比對 pathname 尾段，不分大小寫，含無副檔名與子路徑部署）；這些頁即使 ID 有效且已同意，
  也不建立 `dataLayer`、不載入 Google tag、不送 page view 或事件，只保留同意設定 UI。排除以整頁為單位；
  `work.html` 的職場紅旗段落不另行排除（D-2026-09-02-03）。驗證：`scripts/test_analytics.cjs`（check.ps1 執行）與 check.ps1 GA4 區塊斷言。
- 敏感頁面即使量測上線，也不得做個人層級行為量測。
- GA 帳戶／Property／Web data stream、Search Console 網域驗證與 sitemap 提交都屬 §0 人工前置；
  步驟見 `MEASUREMENT_SETUP.md`。

## 2. 內容規範

1. 事實三級標示（SDD §7）；社群經驗必標「社群通報模式／非官方」。
2. 網站定位句固定為：「我們想成為對打工度假者最友善的網站——不替你草率做決定，
   而是幫你看懂選項、查到依據，找到適合自己的下一步。」這是維護目標，不得改寫成已被證明的自我宣稱。
3. 重要內容採「下一步 → 為什麼 → 官方依據」分層證據卡；顯示來源機構、查核日期、翻譯／編輯狀態與官方連結。
   圖片只輔助流程、選項與風險，關鍵資訊不得只靠圖片傳達。
4. 防詐內容：只描述手法、紅旗、自保、救濟管道；**不點名**任何具體對象。
5. 語氣：短段落、講人話、誠實優先（「查不到」比假自信好）；比喻與幽默可以，
   但嚴肅主題（心理健康、性騷擾、死亡風險）不開玩笑。
6. 金流用語一律「贊助／支持」，不用「募款／捐款」（台灣公益勸募條例考量）。
7. 商業內容一律明示關係；不得讓付費影響官方事實、風險揭露、推薦排序或負面資訊的保留。
8. 新數字必附：官方連結＋查核日期；並評估是否列入 §5 年度更新清單。
9. 交接文件的狀態詞只用 `ROADMAP.md` §0 的詞彙。

## 3. 相依與整合點

- 現況：GitHub Pages（公開前端部署）、Google Fonts（唯一前端外部資產）、GitHub Issues（公開回饋）。
- 已批准但未啟用：Cloudflare Web Analytics（啟用時登錄此處與 SDD §2）；Cloudflare Worker、D1、Turnstile
  與可替換交易信服務（P0-4）；GA4（P0-3 與 §1.5 前置）。
- repo 內不得出現 API key／secret；前端不得包含 D1、Turnstile secret 或寄信憑證。

## 4. 驗收程序（每次 push 前必跑）

```powershell
# 前置：python、node 在 PATH；worker/ 已執行 npm ci
powershell -File scripts/check.ps1
```

`scripts/check.ps1` 全部通過輸出 `ALL CHECKS PASSED (15 pages)` 並以 0 結束。它涵蓋：

1. 結構＋內部連結＋錨點＋nav 數量（12／13 例外寫死）、canonical／og:url／sitemap／robots 鎖定正式網域、
   404 契約、唯一 h1／main、`zh-Hant`、viewport、ID 不重複、`noopener`、`button type`、skip link、
   `aria-current`、共用 `?v=` 資產版本、JSON-LD 可解析。
2. emoji 掃描（`*.html`、`lang/**/*.html`、`assets/*.js`；0 命中才過）。
3. `defer` 斷言：根層與 `lang/` 全部 HTML 的每個本機 `<script src>` 都必須含 `defer`；沒有本機 script 的頁面也算失敗。
4. 主題契約：證據卡、問題入口目的地、高風險語意路徑、檸檬圖文、GA4 空 ID、同意與 `SENSITIVE_PATHS`、多國語言產物、
   七個完整英文頁、站內搜尋索引、自我釐清、模擬器、商業治理與 LINE 位置、D+ 邊界、已撤回的絕對商業承諾、失效 OMARA 網址。
5. 固定案例回放：`scripts/test_housing_search.mjs`（17 案例）、`scripts/test_tools.mjs`（集簽快查器 7 案例＋試算器基準，21 案例）、
   `scripts/test_analytics.cjs`（GA4 敏感頁排除，187 斷言）。
6. 產物同步：`build_seo.py --check`、`build_search.py --check`、`build_i18n.py --check`。
7. 交接文件一致性：`docs/README.md` §4 標「[檢查]」的規則。
8. Worker：secret 不進 repo、`npm run check`（TypeScript、Vitest、D1 local migration、Wrangler dry-run）。

**仍是人工步驟**（尚未自動化，列 `ROADMAP.md` §3）：

- DASP 粗估與市集草稿的輸出抽測。
- 線上站抽測集簽快查器與試算器各一組案例（固定案例已由 `test_tools.mjs` 回放：4880/plant=YES、2000/plant=NO、0870/tourism=YES、
  7215/tourism=YES、3000/tourism=NO、5000/plant=YES、2615/bushfire=YES；33.05×38h、住宿 250、其他 240 → $1,256／$10,581／$1,026／$21,710）。
- 部署後：cache-bust 開線上站，抽測一個工具＋回饋列存在。
- 實機手機（iPhone Safari、Android Chrome）下載與外部 App 開啟行為。

## 5. 例行維護

| 週期 | 工作 |
|---|---|
| **每年 7 月**（最重要） | 全站數字年檢：417 簽證費、NMW/casual 時薪、WHM 稅級距、super 率、CSIT/SSIT、Opal 上限；逐項開官方頁核對、更新 updated-tag |
| 每季 | 交通票價政策優惠（myki 半價 2027-01 到期、QLD 50c、Perth $2.80）、手機方案、匯率係數（tools.js 的 22.8）、換匯段落來源（ACCC／Moneysmart／AUSTRAC） |
| 官方公告時 | `postcodes.js` 重抽（SDD §5 程序）；`seasons.js` 各州官方表；WHM 制度變動（88 天檢討、Workplace Justice 試辦狀態） |
| 隨時 | Issue triage：「需要查證」→查官方→修→關單附證據；`third-party-register.json` 查核日期 |
