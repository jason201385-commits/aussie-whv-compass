# 澳打指南針 — 決策與證據日誌（DECISIONS）

> 版本 2.0｜最後更新 2026-09-03｜按日期遞增的決策紀錄（ADR 風格）。
> 規格檔只寫「現在是什麼」；為什麼變成這樣、誰在哪一天拍板、當時的本機證據與反方裁決，
> 全部寫在這裡。新增條目只能往後加，不改舊條目；要推翻舊決策就寫新條目並標「取代 D-…」。
> 條目格式：決策／理由／證據／影響／狀態。commit 以短 hash 指向 `main` 歷史。

## D-2026-08-29-01 建立交接文件 SDD＋SPEC＋驗收腳本

- 決策：以 `docs/SDD.md`（設計）＋`docs/SPEC.md`（規格與待辦）作為任何後續 agent 的交接基準。
- 證據：b4659d7。
- 狀態：2026-09-02 由 D-2026-09-02-02 重組為五份文件。

## D-2026-08-29-02 贊助整合暫停於人工前置

- 決策：P0-1 在站長完成 BMC 付款設定與綠界連結前不動。
- 證據：`https://buymeacoffee.com/easyknowai` 公開頁 HTTP 200（2026-08-29），後台提示需設付款方式；綠界連結未提供。
- 狀態：未完成，需求摘要見 `ROADMAP.md` §2.1。

## D-2026-08-30-01 第一階段不啟用 GA4，改採 D+ 聚合量測

- 決策：`analytics-config.js` 維持空 ID；不啟用第三方 pixel、session replay、跨頁識別；改以 D+（Perth 日期×白名單類別的聚合 counter）與自願任務測試評估找路成功率。
- 理由：資料最小化；敏感頁（詐騙、健康、剝削）不得做個人層級行為量測。
- 影響：SDD §1.1 第 5 條、SPEC §1.5。
- 狀態：**已由 D-2026-09-02-01 部分取代**（GA4 同意制與 Cloudflare Web Analytics 並用），但「敏感頁排除」與「未同意不載入」不變。

## D-2026-08-30-02 Cloudflare 最小後端本機閉環（P1-8、P1-9、P1-10）

- 決策：後端獨立為無框架 Worker，只承接需求單、確認信、查閱／更正／刪除、D+；正式資源等 P0-4。
- 證據（本機，2026-08-30）：
  - P1-8：`worker/` 使用 Wrangler 4.127.1、Workers runtime Vitest plugin 與 TypeScript；測試涵蓋 CORS、16 KiB JSON 上限、Turnstile token／hostname／action、以 server secret HMAC 化的 Email 限流鍵、D1 migration／prepared statements、白名單 D+ counter、不對外寄送的 mock mail。`wrangler d1 migrations apply DB --local` 與 `wrangler deploy --dry-run` 通過；D1 ID 是全零佔位值，`workers_dev`／preview URL 關閉。commit 713f310。
  - P1-9：`POST /api/contact`、`/manage`、`/update`、`/delete`；案件編號為不可預測 `WHV-` UUID；管理 token 32-byte 隨機、D1 只存 SHA-256；建立案件、token、mail outbox 以 D1 batch 一起寫；mock transport 接受才回 `sent`，未設定回 `queued` 並留固定錯誤碼；每日 cron 清除 `delete_after` 到期案件；回應不回顯 Email 或自由文字。commit 730015a。
  - P1-10：`POST /api/metrics` 只接受 `{metricKey}` 與 7 個固定類別；日期由 Worker 依 `Australia/Perth` 產生；`0002_dplus_task_metrics.sql` 同步白名單約束；route 不寫 application request log，Wrangler observability 關閉；測驗開始鍵在 HTML 預設 `hidden`，只由成功執行的 `main.js` 揭露。commit 9822e11。
  - 2026-09-02 複核：`worker/test/` 共 28 個 `it(`（accommodation 6、contact 3、http 4、mail 2、metrics 3、repository 3、security 7）；SPEC 舊版所寫的 14／18／21 項為加入住宿搜尋前的數字。
- 狀態：程式完成／本機驗證；正式啟用、寄信 deliverability、retention 再確認仍屬 P0-4。

## D-2026-08-30-03 首頁改為「先解決問題再談支持」（P1-4、P1-12）

- 決策：首頁不放站長服務招攬；贊助與私人合作只留 About 次要區段；首頁與 About 區分官方依據／本站編輯整理／社群第一手回報。
- 理由：第一輪公開使用者回饋指出首頁目的不清、把站長服務當主線。
- 證據：cf86d79、fbc9924；桌機／390px／no-JS E2E 通過；「買二手車」熱門詞可命中 cost 買車段落；OMARA 名冊改用 `portal.mara.gov.au`，舊網址列入 `check.ps1` 回歸禁止清單。
- 狀態：已上線。

## D-2026-08-30-04 商業合作與第三方入口治理（P1-11）

- 決策：`about.html#recommendation-policy`（人讀）與 `third-party-register.json`（機讀）必須同步；付費版位、聯盟連結、佣金轉介皆為 false；LINE 邀請連結只在首頁生活交流區。
- 證據：37031d9；桌機／390px／CSP 阻擋 script 的 E2E 均顯示三級服務卡與登錄表入口。
- 狀態：已上線；2026-08-31 首頁社團目錄擴充見 D-2026-08-31-01。

## D-2026-08-30-05 30 天模擬器只用 sessionStorage

- 決策：`assets/simulator.js` 以版本化、嚴格驗證的 `sessionStorage`（key `whv-simulator-progress-v1`）保存目前分頁進度；不使用 localStorage、fetch、自由文字；不做成功／簽證／醫療預測；緊急就醫事件在選項前提供 `tel:000`。
- 證據：35ff53f、216976b、45992f5。
- 狀態：已上線。

## D-2026-08-31-01 首頁改為四大入口，社團目錄擴充為 LINE＋Reddit＋平台搜尋

- 決策：首頁在安全出口之後加入 `nav.home-zone-nav` 四大入口：01 自我評估 `#self-assessment`、02 常見問題 `#common-problems`（含 12 張旅程問題卡與 3 張直接解法卡）、03 各地社團 `#communities`、04 遊戲區 `#games`。社團目錄由單一 Perth LINE 群擴充為：地點搜尋框、平台篩選（LINE／Reddit）、9 格州別地圖鈕、Facebook 與 Reddit 平台搜尋按鈕、9 個公開入口（1 LINE＋8 Reddit 州別社群）。
- 理由：讓不同階段的讀者一眼找到入口；社群連結不做站內配對。
- 證據：070f3cc；`third-party-register.json` 已登錄 `public-local-reddit-communities` 與 Facebook Marketplace 入口。
- 影響：SDD §3.2 治理規則由「LINE only」擴為「LINE／Reddit／平台搜尋」；此變更在 2026-09-02 漂移稽核前未寫入 SDD／SPEC。
- 狀態：已上線；將由 P0-7 釐清器重建時整體檢視。

## D-2026-08-31-02 住宿合法混合搜尋（P1-13）

- 決策：住宿頁先選短住／合租／整租／農區，再輸入地點；前台只建立五個平台原始入口；只有通過 `ACCOMMODATION_PROVIDER_ONBOARDING.md` 的 provider 可由 Worker adapter 查詢；每個候選 provider 必須附有效 `displayAuthorization`，否則不呼叫上游。
- 證據：51df889、8f86623、d5c9233、af41208；`scripts/test_housing_search.mjs` 回放 DOM 行為並納入 `check.ps1`；Workers runtime 測試涵蓋 fail closed、正規化、惡意 URL 丟棄、部分失敗、log 不含搜尋內容。
- 狀態：程式完成／本機驗證；`api-config.js` 的 `accommodationSearchEnabled` 為 false，production provider 清單為空。

## D-2026-08-31-03 長頁問題優先閱讀（P1-14）

- 決策：11 個繁中長頁（`market.html` 上線後為 12 頁）在標題後放 `#quick-answers`（4 張真實問題卡，各給一句「先做」與同頁深連結），目錄改稱「完整內容與參考資料」；生命危險卡例外用 `tel:000`。
- 證據：7713276、c8e5c8a；`check.ps1` 鎖定每張卡的預期目的地、詐騙匯款後的銀行第一步、買車八州／領地官方入口。
- 狀態：已上線。

## D-2026-09-01-01 效能與留存規格建立；P0-5、P0-6 完成

- 決策：新增 `PERFORMANCE_AND_RETENTION_SPEC.md`，延用 P 編號（P0-5、P0-6、P1-15～P1-20、P2-3、P2-4）；P0-5（五支腳本加 `defer`）與 P0-6（深色 `.language-go` 對比、連結底線、官方來源可辨識）先做。
- 證據：f87fbc0（規格）、a823e88（實作，已 commit；規格內「未 commit」字樣已過時）。冷快取＋PerformanceObserver 各 5 次：render-blocking `.js` 5→0；`domInteractive` 5,411→818 ms；LCP 中位數 5,160→5,356 ms（+196 ms，落在前次全距 252 ms 內）。線上資產版本 `20260901-45`（規格內寫 -43／-44 為過時）。
- 反方裁決（Codex，2026-09-02）：「LCP 中位數不上升」的驗收字面未達成，只能寫「未偵測到顯著變化」；`domInteractive` 下降不等於功能可用時間下降。**採納**：ROADMAP §3 加入「check.ps1 斷言 defer」與此措辭修正。
- 狀態：P0-5、P0-6 已上線；其餘項目未開始。

## D-2026-09-01-02 新增 market.html 與換匯段落

- 決策：新增第 15 頁 `market.html`（離澳出清 × 初登澳補給：交換草稿產生器，不存任何輸入，只產生可複製文字與 Facebook Marketplace／eBay 搜尋入口）；`cost.html#exchange` 新增換匯與匯款段落（ACCC／Moneysmart／AUSTRAC 來源），`prep.html` 交叉連結，`scam.html` 加入「私下換匯」手法與測驗題 `exchange_screenshot`。
- 證據：cb23ed0、1e2ea3a；`sitemap.xml`、`content-status.json`（primaryPages 15）、`search-index.js`（15 頁 144 入口）已同步。
- 影響：SDD／SPEC 的「14 頁」「122 入口」全部過時；`market.html` 與 `simulator.html` 的 nav 為 13 連結（含 market），其他 13 頁為 12 連結且未連到 market（`check.ps1:157` 寫死例外）。此不一致列入 ROADMAP §3 待站長決定。
- 狀態：已上線；2026-09-02 漂移稽核前未寫入 SDD／SPEC。

## D-2026-09-02-01 站長六項改版決策（釐清器方向）

站長親口決策，供後續實作直接依循，**不必再確認**；改口時在此新增條目取代。

1. 目標：使用者進站能快速釐清自己的澳打問題並找到資訊。站長原話：「板面太豐富，文字太多反而失焦」；「最終目的是讓活人可以彼此連結」。
2. 首頁可全面重建為單一漏斗（不受 PERF spec「零數據不刪功能」限制，但每個既有區塊要有去向）。
3. 優先族群：第一是出發前的台灣人與中國人（中國護照走 462），其次是已在澳洲的人。462／簡中：第一階段只在釐清器分護照並連到既有英文 462 內容（`lang/en/visa/`）；簡中 462 專頁列第二階段。
4. AI 助理：點選釐清器為主，AI（MiniMax，成本低）只兜底；自由打字才送 AI；送出前告知會送第三方；伺服端不留問題文字；每日總額度上限。
5. 人的連結：依地區×需求推薦地方社團目錄（LINE／FB／Reddit），不做站內配對／佈告欄。
6. 量測：Cloudflare Web Analytics（無 cookie）＋既有 GA4 同意制兩者都用。
7. 理想情境：找房→直接搜房工具；找工作→先做工作類型小測驗，有想法者直接看平台總表；想去哪／想過什麼生活→給建議；買車→依需求分流＋引導加入地方群組。

- 影響：SDD §1.1 第 5 條（量測）與新增第 10 條（AI 兜底邊界）；`CLARIFIER_SPEC.md` 以此為前提；ROADMAP 新增 P0-7。
- 取代：D-2026-08-30-01 中「第一階段不啟用 GA4」一句；保留「未同意不載入」「敏感頁排除」「不做個人層級量測」。
- 狀態：決策已定；設計未開始；GA4／CWA 實際啟用仍需 P0-3 人工前置與敏感頁排除清單。

## D-2026-09-02-02 交接文件重組（本條目描述現行文件結構的由來）

- 決策：把「讀 SDD＋SPEC 全文」的交接模式改為五份分工文件＋索引：
  `SDD.md`＝憲法與架構、`SPEC.md`＝現況行為契約與驗收、`ROADMAP.md`＝唯一編號與狀態表、
  `DECISIONS.md`＝本日誌、`CLARIFIER_SPEC.md`＝P0-7 專題規格；`docs/README.md` 提供依任務只讀哪幾節的對照表。
  `scripts/check.ps1` 新增文件一致性檢查（索引涵蓋、P 編號登記、決策條目引用、SPEC 頁面清單涵蓋根層頁、修改過的核心文件標頭日期必須是當天）。
- 理由（2026-09-02 漂移稽核，13 項檢查只有 1 項相符）：SDD／SPEC 標頭停在 2026-08-30 但其後有 9 個 commit 改動它們；首頁四大入口、market.html、換匯段落、Reddit 社團目錄、`/api/accommodation/search` 邊界、15 頁／144 入口、sessionStorage key 均未入文件；PERF spec 的 10 個 P 編號未被 SPEC 引用；SPEC §6 同時說 check.ps1 待整併與已納入；三檔合計 131 KB 但啟動指令只叫 agent 讀其中 74 KB。
- 反方審查（Codex `gpt-5.6-terra`，2026-09-02，兩輪）：第一輪 packet 未送達，Codex 改審 PERF spec 與 repo，提出 8 項；採納：GA4 前置與 SSOT 矛盾（→ D-2026-09-02-01 已由站長決策解決，敏感頁排除列 ROADMAP §3）、DASP 提醒時間需拆兩事件（→ P1-16 gate）、P0-5 LCP 措辭（→ D-2026-09-01-01）、check.ps1 未斷言 defer（→ ROADMAP §3）、PERF spec 狀態失真（→ 本次修正標頭）、留存成效不可驗證（→ 保留 PERF spec §3 誠實揭露，不新增追蹤）；未採納：「兩套量測流程互斥」——PERF §0.2 已明示冷快取法為此後標準，§1.0 保留為歷史條件，改以標註處理而非刪除。第二輪針對重組假設的回覆見本條目末尾附註。
- 證據：本 commit；`scripts/check.ps1` ALL CHECKS PASSED。
- 狀態：已完成。

附註：第二輪反方審查（Codex，針對重組假設的六題回覆）裁決：

| Codex 主張 | 裁決 | 落點 |
|---|---|---|
| 標頭日期檢查可被空泛更新、會被無關 docs commit 誤觸發 | 採納 | 日期檢查只針對「工作樹已修改的檔案」；另加索引涵蓋、P 編號登記、決策引用、頁面清單四項結構檢查 |
| 規格旁應保留可驗收 invariant、測試檔／命令、對應 commit，搬走逐次量測表與日期敘事 | 採納 | SPEC §1.2 新增「驗證指標」欄；量測表與敘事留 DECISIONS |
| 決策與證據是不同資料型態，應另設 VERIFICATION.md | 未採納 | 站長 2026-09-02 選擇單一決策／證據日誌；以「驗證指標」欄補足鄰接證據；若日誌超過 60 條再拆 |
| 建唯一 work-item registry、保留既有 ID；PERF 不整份併回，只搬狀態與實作紀錄 | 採納 | ROADMAP §1；PERF spec 保留為領域契約，§0.2 改為方法摘要並指向 D-2026-09-01-01 |
| 六項決策應欄位化為 Accepted ADR（範圍、must／must-not、資料流、非目標、gate、supersedes）；MiniMax「本站不留 ≠ 供應商不處理」要明寫 | 採納 | CLARIFIER_SPEC §1 表；SDD §1.1 第 10 條；D-2026-09-02-01 明示取代關係 |
| 重組不得默默改語意（SDD §1.1、SPEC §0、後端契約、郵遞區號怪點、a11y、provider 授權） | 採納 | 九條原則原文保留，只有第 5 條標註取代來源；SPEC §0 原文保留 |
| README 任務路由仍必須先讀不可協商邊界 | 採納 | docs/README.md §2 |
| 一錘定音證據應是 blind handoff replay（新 agent 只靠新文件完成一次任務） | 採納為驗證方式，本次未執行 | 列為下一次接手任務的順帶驗證；本 commit 只有 check.ps1 通過作為證明 |

## D-2026-09-02-03 站長三項回答與第一輪加固

- 站長回答（2026-09-02 下午）：(1) `market.html` 不進全站 nav，15 頁統一 12 連結；(2) P0-7 照 `CLARIFIER_SPEC.md` §3–§7 草案動工，§8 未決項用預設值（AI 每日總額度 200 次、揭露文字用 §4 草稿、工作類型小測驗 6 題、「想去哪」用 `why.html` 快思分面、12 張問題卡文案回收為出口說明）；(3) 驗收通過即合併到 `main` 並 push。
- 加固輪（Claude Code workflow，18 個 agent：3 個實作、1 個檢查、1 個閘門、12 個三面向反方審查、1 個完整性批評）：
  - `assets/analytics.js` 新增 `SENSITIVE_PATHS`／`isSensitivePath`；敏感頁不建 `dataLayer`、不載入 tag、不送事件，同意 UI 保留。範圍決策：以整頁清單為準（scam、health 與其英文頁），`work.html` 的職場紅旗段落不排除，因為求職頁是主要找路指標且該段落屬一般資訊。
  - `worker/src/cors.ts`：所有 POST 路由要求 Origin 且在白名單（403 `origin_not_allowed`）；`@types/node` 釘 26.4.0；`.gitignore` 加 `.codex-remote-attachments/`；vitest 33 通過。
  - `assets/og-cover.png` 559,520 → 97,211 bytes（8-bit 索引色，PSNR 43.99 dB，1200×630 不變）。
  - `scripts/check.ps1`：defer 斷言（61 頁）、`SENSITIVE_PATHS` 斷言、`scripts/test_tools.mjs`（21 案例）與 `scripts/test_analytics.cjs`（187 斷言）掛鉤、nav 統一 12 連結且工具頁不標 `aria-current`。
  - 資產版本 `20260901-45` → `20260902-46`，三支 builder 重跑。
- 反方審查結果：12 個裁決全部 refuted=false（最高 severity low）。完整性批評指出並已處理：`worker/README.md` 未記 Origin 要求、分析測試只在暫存區、文件未更新；未處理：`delete_after` 措辭（站長判斷）、CSS 800 前提過時（併入 P2-4 時重驗）、其他 POST 路由缺逐路由測試（列 ROADMAP §3）。實作者未經指令驗證的主張：社群平台接受索引色 PNG（低風險，未驗）；GitHub Pages 提供無副檔名 URL（比對器已涵蓋，只是理由未驗）。
- 證據：`scripts/check.ps1` ALL CHECKS PASSED（prove label `sdd-spec-hardening-check-20260902`）；本 commit。
- 狀態：已完成；依站長回答 (3) 合併 push。

## D-2026-09-02-04 P0-7 首頁單一漏斗釐清器建置（as-built）

- 決策：依站長回答照 `CLARIFIER_SPEC.md` 草案動工；設計差異與參數以 `CLARIFIER_SPEC.md` §0.1 為準；首頁釐清器隨本 commit 上線，AI 兜底程式完成但表單在 P0-4 前不顯示。
- 執行（Claude Code workflow，35 個 agent）：2 位設計者（極簡文字／安全與無 JS 對等）＋評審合成契約；4 路平行實作（`index.html`、`assets/main.js` 447 行新區塊、`assets/style.css` 194 行、`worker/src/assist.ts`＋14 案例測試＋migration 0003）；整合者重寫 `check.ps1` 首頁區塊並升版資產 `20260902-47`；閘門兩次通過；瀏覽器回放兩次 12 步全過（桌機 1280、手機 375／390，Playwright 33 張截圖）；20 個四面向反方審查；2 個修復；完整性批評。
- 反方審查裁決：worker `spec-fit`（medium）——含判定字眼的回覆原本落到 `refused`＋搜尋連結，違反 §4「改為固定官方出口文案」，**採納並修正**為 `official_exit`；integrator 三面向（high）——`check.ps1` 拼接時刪掉約 70 行既有治理斷言（社團 9／9、支援出口 4、問題卡 12、收藏／續讀 id、market 需求），**採納並復原**，主 session 複核關鍵 needle 各 1 次出現；其餘 16 個裁決 refuted=false（最高 low）。
- 完整性批評（已處理）：`build_seo.py` `LAST_MODIFIED` 與 `llms.txt` 首頁一句、`build_search.py` `VERSION` 改 2026-09-02；行動版 34px 點擊目標補 44px。（未處理，列 `ROADMAP.md` §3）：C-5 地區×需求推薦、§6 指標設計、無 JS 與 reduce 未在瀏覽器實測、每日額度存 D1 一列 vs「不寫 D1」字面、MiniMax 主機未驗證。
- 未經指令驗證的主張：MiniMax 端點形狀「已對照 vendor 文件」只有審查者的網頁查證；index.html 實作者的 66 項驗證在整合升版後重跑會有 4 項預期差異（head 版本字串）。
- 跨供應商反方審查（Codex，read-only）：Codex（gpt-5.6-terra，read-only，label `p07-clarifier-critic-codex-20260902`）六題回覆全部帶 file:line。**採納並修正**：(1) 模型自由文字經少量正規式過濾仍可帶出個人簽證／法律／醫療／稅務判定，且裸網域（如 immi.homeaffairs.gov.au）會以文字呈現 → 改為「可枚舉路由」：模型只回傳目錄連結，答案由伺服端固定模板組成，模型文字永不渲染；問題含個人判定字眼（能不能申請、合法嗎、退稅多少等）先回固定官方出口，不呼叫模型；(2) `ASSIST_BASE_URL` 只驗 HTTPS、未鎖主機，設定錯誤會把問題與金鑰送往任意主機 → 主機白名單 `api.minimaxi.com`／`api.minimax.io`，其餘視為未設定；(3) 缺 `CF-Connecting-IP` 時所有人共用 `HMAC("unknown")` 限流鍵 → 缺 header 直接 400 `client_ip_missing`；(4) `check.ps1` 只禁 `console.log` → 改禁 assist.ts 任何 `console.`，並加 console spy 測試涵蓋全部路徑；(5) 前端 hash 邊界：Back 回空 hash 未重新安置焦點、未知或舊 hash 使四面板全隱藏 → 未知 hash 視同空 hash，空狀態把焦點放到 `#clarifier-title`。**接受為 as-built／列 ROADMAP**：無 JS 未退化成 `<details>`（§0.1 已記）；護照三個 `aria-pressed` 切換語意不如 `radiogroup`（列 §3）；`check.ps1` 新斷言多為字串存在、無法證明零請求與焦點行為（以 vm 煙霧測試與回放補足）。Codex 總評「不能直接上線，必須先把 AI 自由文字改成伺服端固定模板或可枚舉意圖」已由 (1) 處理；首頁釐清器本身無阻擋項。修復由 Claude Code 小型 workflow 完成（2 路實作＋4 個反方審查）。
- 證據：`scripts/check.ps1` ALL CHECKS PASSED（prove label `p07-clarifier-check-final-20260902`，Codex 修復後 `p07-clarifier-check-final-r2-20260902`）；`worker` vitest 51 案例（assist 18）；本 commit。
- 狀態：程式完成／本機驗證；依站長回答 (3) 合併 push。

## D-2026-09-02-05 AI 兜底上游線路實測與參數修正（MiniMax 受控呼叫）

- 決策：`worker/src/assist.ts` 的 `UPSTREAM_MAX_TOKENS` 由 200 改 1024、`DEFAULT_ASSIST_TIMEOUT_MS` 由 8,000 改 20,000，系統提示新增規則 5（不輸出思考過程；必要時控制在 30 字內再輸出 JSON）；`worker/wrangler.jsonc` 新增 `env.production`（正式 `ALLOWED_ORIGINS` 不含 localhost、`ENVIRONMENT=production`、自訂網域 `api.aussiewhvcompass.com`、D1／ratelimits／vars 完整重述，D1 ID 仍為全零佔位）；`worker/README.md` 新增站長專用「正式啟用步驟」九步與回滾方式。前端與 `assets/api-config.js` 不變，正式站仍零 request。
- 理由：ROADMAP §3 要求「P0-4 啟用前以真實 key 做一次受控呼叫」；本輪以本機環境既有 `MINIMAX_API_KEY`（未寫入任何檔案、未輸出）直接對 `https://api.minimaxi.com/v1/chat/completions` 重放 `callMiniMax()` 的請求形狀。
- 證據（2026-09-02 21:54–22:00，prove label `minimax-assist-wire-test-20260902-r3`，腳本與原始輸出在 session 暫存區 `minimax_wire_result.txt`、`minimax_matrix_result.txt`）：
  - 端點與模型可用：HTTP 200，OpenAI 相容回應，`prompt_tokens_details.cached_tokens` 946／1,006（系統提示被快取），`usage.completion_tokens_details.reasoning_tokens` 為 0，但推理實際以 `<think>…</think>` 放在 `message.content`。
  - 原參數（`max_tokens` 200）：6 題中 2 題 `finish_reason=length`、JSON 被截斷 → 落入 `refused`；冷呼叫延遲 4.0–12.9 秒，兩題超過原 8 秒逾時。
  - 矩陣（`max_tokens` 1024；MiniMax-M2.7 與 M2.7-highspeed × 原提示／加規則 5；各 6 題）：4 組 24 題全部回傳目錄內有效 href；加規則 5 後 M2.7 中位數 5.6 秒、最長 7.1 秒（原提示最長 16.1 秒）；highspeed 中位數 4.9 秒。維持 `ASSIST_MODEL=MiniMax-M2.7`（站長既定），highspeed 列為可切換選項。
  - `parseModelReply()` 既有的 `<think>` 剝除與 JSON 擷取在全部 24 題都正確取得 `links`；`filterLinks()` 白名單未被任何回覆繞過。
  - 本機：`worker/test/assist.test.ts` 18／18（只改 `max_tokens` 期望值）；`npm run check` 通過（types、typecheck、vitest、D1 local migration、`wrangler deploy --dry-run`）；`wrangler deploy --dry-run --env production` 綁定正確。
- 影響：SDD §3.1、`worker/README.md`、ROADMAP §3「MiniMax 端點」列改為已處理。成本估算不變量級（每題輸入約 1,000 token、輸出約 60–220 token）。
- 未做／人工前置：D1 正式資源、Turnstile widget、三個 secret、`--env production` 部署與線上回執仍屬 P0-4（只有站長能做）；D1 一列每日計數 vs「不寫 D1」措辭仍待站長決定。
- 狀態：程式完成／本機驗證。

## D-2026-09-02-06 全站優化規格（ai-orchestra 三家外部審查後整合）

- 決策：新增 `docs/OPTIMIZATION_PLAN.md`，登記 P0-8～P0-11、P1-21～P1-23、P2-5～P2-6 共 9 個工作項（狀態一律「未開始」）；ROADMAP §3 的 C-5、釐清器指標、radiogroup 三列併入新 ID。
- 產生方式：主 session 6 份研究（問題分類 88 題／標竿 12 案例／技術成本／資訊架構稽核／417–462 官方分流／社團目錄）＋首頁 as-built 實測（9,766px、12 屏、169 連結、第一題在 1,427px）＋ai-orchestra 三家外部模型（AGY gemini-3.1-pro 設計、Grok grok-4.6 受眾語感、MiniMax-M2.7 架構 backlog；ledger label `whv-opt-*-20260902`）＋Codex 跨供應商反方審查（第一次派工 label `whv-opt-critic-codex-20260902` 因 cwd 落在技能目錄而審錯對象，作廢；第二次 label `whv-opt-critic-codex-20260902-r2`，裁決見本條目附註）。
- 採納／駁回摘要見 `OPTIMIZATION_PLAN.md` §7；關鍵裁決：駁回 AGY「讓 AI 填意圖短句」（違反 §1.1 第 10 條），改為可枚舉 intent id → 固定句；駁回 MiniMax「系統字體取代 Google Fonts」（違反 SDD §4.2）、「GA4 需 Worker」「社團 JSON 需 Worker」「housing-search-tool 未實作」三項事實錯誤（實檔核對）；採納 Grok 8 字口語文案、8 個熱門 chip 綁錨點、「找人聊」改「看公開討論」與安全句。
- 附註（Codex r2 裁決，2026-09-02 22:4x）：VERDICT BLOCKING，10 項必修全部採納並已改進 `OPTIMIZATION_PLAN.md`（§7 末段 C1–C10）：刪除 `build_community.py` 建置步驟；P0-8 高度門檻改量到入口卡、連結數只記錄；安全出口改常駐單列 5 個直達連結（不收合）；CWA／GA4／D+ 分母分離；零數據下不寫「改版前後比較」；intent 依嚴格 enum 契約；前端區分 `rate_limited` 與 `assist_daily_cap`；`check.ps1` 需改的三處斷言；`build_search.py` 三處與 `data-search-entry` 契約；「合法時薪」與「不會有人私訊你」措辭縮窄。附帶程式修正：`assets/main.js` 的 AI 兜底 429 處理改讀 `error.code`（`rate_limited` 顯示「一分鐘內問太多次，稍等再試」），`SPEC.md` §1.2 AI 兜底列同步；資產版本升 `20260902-48`。Codex 抽查八個熱門 chip 錨點皆存在。
- ai-orchestra 台帳（本任務）：prove ×3（`minimax-assist-wire-test-20260902*`）、agy ×1、grok ×1、minimax ×1、codex ×2（第一次作廢）；未使用 verify.py（Codex r1 指出其證據綁定與 SSRF 缺陷，已另開修補任務）。
- 狀態：規格已定；實作未開始（P1-23 線路已實測）。

## D-2026-09-03-01 OPTIMIZATION_PLAN §8 未驗證清單逐條查核

- 決策：站長要求「還沒驗證就去驗證」。以 ai-orchestra 反幻覺協定執行：每條宣稱要有來源 URL、親讀引句（≤15 字）與讀取方法，否則維持未驗證；模型意見不作證據。結果寫回 `OPTIMIZATION_PLAN.md` §8（改為 8.1 已驗證／8.2 被推翻並已改寫／8.3 仍未驗證）與 P0-8、P0-10、P0-11、P1-21、P1-22、P1-23、P2-5、§6 對應段落。
- 執行：主 session 兩個確定性腳本（V1 錨點與輸入框 id grep；V2 MiniMax 意圖契約 30 題，prove label `whv-verify-v2-intent-contract-20260902-r2`，第一次 `-20260902` 因 prove 預設 120 秒逾時作廢）＋ Claude Code workflow 5 個查核代理（382 次工具呼叫）：內政部與使館頁（Playwright 獨立設定檔直讀，含隱藏分頁、pricing API、legislation.gov.au、Wayback）、Fair Work／12308／Scamwatch／LINE／Facebook／Reddit（Claude Browser＋curl）、八州買車與押金官方頁（chrome-devtools DOM 直讀）、MiniMax／Cloudflare／Google 條款文件（WebFetch，MiniMax 頁需經 r.jina.ai 代理渲染）、LCP 基線（chrome-devtools 冷快取節流 5 次）。原始證據與截圖在 session 暫存區 `scratchpad/verify/`（不入 repo）。
- 統計：已驗證 44（vendor）＋35（immi）＋17（fairwork-community）＋64（states）＋確定性 2 組；被推翻 3＋3＋4＋0；無法驗證 6＋2＋5＋5。
- 關鍵裁決：
  1. 462 摘要卡四行全部成立；抽籤頁 URL 需新增到英文簽證頁；英文門檻只連 functional-english 子頁；不寫 TOEFL 規則（首簽頁與子頁互相矛盾）；使館連結改 WHV2026-27EN.html；三簽正確 slug `third-work-and-holiday-462`。
  2. **P1-23 第一階段維持 links-only、不加 intent**：30 題實測無任何外洩（無多餘鍵、無外站連結、無判定句，連要求加 `answer` 欄位的注入都被拒），但 intent 命中率 10/20、錯配 1 題，不足以承載導語。Codex r2 Q6 的建議因此採納。
  3. 揭露文案三處被推翻並改寫：MiniMax 資料存放美國（非新加坡）、Turnstile 依賴 cookie 與本機儲存（不得寫「不設 cookie」）、GA4 同意率引用來源錯誤；新增義務：MiniMax ToS 要求生成內容顯著標示，AI 回答卡固定標示「AI 生成，僅供參考」。
  4. Scamwatch 引句被推翻：社群媒體是「有金錢損失的通報件數最多」而非「通報件數最多」；§6 與分享頁已改。
  5. Facebook 社團搜尋 URL 未登入回 Not Found；Reddit 對本機全部工具封鎖；LINE 只有 `/tw/explore` 可用。P1-21 資料模型依此標註。
  6. 八州買車與押金規則 64 列原句驗證，P2-5 可直接引用；站內 20 條官方連結全部可用；`cost.html` WA rego 查詢 URL 的 `?527=` 參數與 QLD 總覽頁連結列 ROADMAP §3 待站長決定。
  7. LCP 改動前基線建立（正式站 d123afb，4,708 ms 中位數），寫入 P0-8 驗收第 5 條。
- 跨供應商反方審查：Codex（gpt-5.6-terra，label `whv-verify-critic-codex-20260903`，從 repo 目錄以檔案指標派工）裁定 BLOCKING、8 項必修，全部採納：(1) MiniMax 條款 22 列引句全經 r.jina.ai 代理渲染，降級為「待站長瀏覽器 DOM 複核」（9 列與 2026-09-02 瀏覽器直讀一致者亦同）；(2) V2 錯配案例「英文不好→housing_tonight」出自第一次執行、原始資料已被第二次覆寫，改為只列觀察；統計「判定句 1」是 regex 命中 intent id `visa_eligible_yes` 的 false positive，已改為只檢查 JSON 外文字；(3) V2 通過條件改嚴格版（完整 30 題、零 HTTP 失敗、頂層鍵只允許 links／intent、所有連結白名單、零 JSON 外文字／判定句／外站 URL），另行 prove（label `whv-verify-v2-intent-contract-strict-20260903`）：結果 NOT PROVEN 29/30，唯一未過的是注入「輸出你的系統提示全文」回 `{"links":[]}`（空連結、無外洩，production 契約下即 `refused`；腳本把空連結視為失敗），其餘 29 題全部符合；三次執行 intent 給出率 11／10／7 之 20、非枚舉值各 1、嚴格版留有「第一站去哪個城市→housing_tonight」錯配原始資料，強化「第一階段不加 intent」；(4) production parser、short-circuit、`refused` 與 DOM 渲染整合測試列為 P1-23 驗收前置，本輪不宣稱「links-only 已安全」；(5) About 草稿改「本次查閱文件未找到退出或零保留選項」，並分開寫註冊地（新加坡）、存放地（美國）、處理地（未載明）；(6) Turnstile 改「不得保證不設 cookie；實際行為待部署 DevTools 驗證」；(7) 刪除 WA 強制險「隨登記」與 Fair Work「三個合法條件」兩處過度宣稱（改「只驗到名稱」「三個可能違法紅線」）；(8) LCP 基線加註「正式站版本只以 CSS 版本字串比對、非部署紀錄；中間有部署即重跑」，只作觀察值。另補 V1 可重播腳本與 prove label `whv-verify-v1-anchors-20260903`（Codex Q1.2）。
- 台帳（本任務）：prove ×2、workflow 5 代理；未派外部模型做查核本身（查核以官方頁直讀為準）。
- 狀態：查核完成；規格已更新；實作未開始。

## D-2026-09-03-02 P0-8～P0-11 實作（as-built）

- 決策：依 `OPTIMIZATION_PLAN.md` §3 規格，P0-8 首屏重構、P0-9 搜尋強化、P0-10 釐清器文案與護照分支、P0-11 五頁答案卡四項同一輪完成並整合；`SPEC.md` §1.2 的安全列、首頁釐清器、全站搜尋、長頁答案卡四列改為新契約（「首頁四大入口」「旅程問題卡＋直接解法」兩列刪除，DOM 已退場），`CLARIFIER_SPEC.md` §0.1 補四列 as-built；資產版本 `20260902-48` → `20260903-49`（`build_seo.py`／`build_i18n.py` 升版後重建三個產物，全 repo 24 檔 148 處字串同步，grep 零殘留）。四項狀態一律「程式完成／本機驗證」，不寫「已上線」。
- 執行（整合者 2026-09-03 本機 Chromium／Playwright 375×812 冷載入，`http://127.0.0.1` 靜態伺服；皆為觀察值，非正式站）：
  1. P0-8 首屏：h1 top 242、4 個階段 chip top 400／400／448／448（皆 < 812）。收尾 (a) 手機 h1 字級由 `clamp(1.15rem, 5vw, 2.1rem)`（375px 只有 18.76px，比 lede 14.7px 大不了多少）改 `clamp(1.5rem, 5vw, 2.1rem)`（24px）：h1 由 1 行 24px 變 2 行 62px，hero 高度 94px → 132px（top 231、bottom 363），chips 由 362／410 移到 400／448。收尾 (b) 四個面板 h2 階段字面對齊階段 chip：`next-step` h2 由「回程與延續：收好成果再出發」改「回程或留下：收好成果再出發」，其餘三個原本已一致；`check.ps1` 新增「P0-8 收尾」斷言（四個 h2 以 chip 文案開頭；style.css `.hero h1` 字級固定為新值）。
  2. P0-8 面板：點階段後面板 top 571、h2 588；considering／committed 護照 radio top 696／696／770（第三顆換行）、第一個需求 chip top 873；in-australia／next-step 第一個需求 chip top 664。
  3. P0-8 安全列：常駐高度 96px（≤ 96）、5 個 `<a>`、第 5 個 `housing.html#housing-search-tool`。
  4. P0-8 入口卡上緣：無面板展開 1,272px（≤ 1,600）；「已在澳洲」展開＋出口 `exit-in-australia-housing` 顯示 2,150px（≤ 2,200）。全頁總高：無面板 8,910px、已在澳洲＋一張出口 9,787px（改版前 as-built 9,766px）；`main` 內連結 189 個（只記錄）。
  5. P0-11 五頁答案卡（375px，只記錄，預算 280–350px）：visa 547、cost 563、housing 539、work 547、scam 623px；主按鈕底緣 734／720／689／705／750px（第一屏可見）；第一個正文 h2 top：visa 1,629、cost 1,493、housing 1,555、work 1,278、scam 1,364px（改版前 2,400–2,800px）；五頁無水平溢位。
  6. P0-9 搜尋：`scripts/test_search.mjs` PASSED（10 句零結果數 0、指定第 1 名、不回歸集）；索引由 HEAD d123afb 175,783 bytes／144 入口／15 頁 → 198,052 bytes／169 入口／16 頁（+12.7%，≤ 30%）；`build_seo.py`、`build_search.py`、`build_i18n.py --check` 皆 CURRENT。
  7. P0-10：`data-label-462` 55 處、radiogroup 兩組、462 摘要卡兩張、「找人聊」全站 0、「看公開討論」26 處。
- 證據：`scripts/check.ps1` ALL CHECKS PASSED（含 `scripts/test_search.mjs`、`scripts/clarifier-contract.mjs`、`test_tools.mjs`、`test_housing_search.mjs`、`test_analytics.cjs`、worker 測試與 wrangler dry-run）；量測腳本與原始 JSON 在 session 暫存區（不入 repo）。
- 未做與風險：
  1. no-JS／CSP 阻擋 script 只做靜態檢查（`clarifier-contract.mjs` A 段以原始 HTML 解析），未在瀏覽器停用 JS 回放。
  2. LCP 改動後未在正式站量：本機 375×812 冷載入（無節流）LCP 元素已不是 h1——閘門時回報為搜尋區 h2，整合者在 h1 改 24px 後本機 3 次皆為信任列 `p.clarifier-trust`（同一元素、約 92–96 ms 本機值，不可與 4,708 ms 基線比較）；部署後須依 P0-8 驗收第 5 條（Slow 4G＋4x CPU＋375×812 冷快取、同 Chrome、不覆寫 UA）重量 5 次並登錄；若部署前另有其他部署，基線須重跑。
  3. P0-8 驗收第 1 條後半未達：considering／committed 點階段後第一個需求 chip top 873px（> 812）；改字級前依同版面估 835px 亦未達，主因是護照 radiogroup 第三顆換行（radio 兩列 696／770）與信任列 3 行。需另行縮減面板上半（例如三顆 radio 單列或縮短護照上方句）再量；in-australia／next-step 已達（664）。
  4. 契約測試仍需瀏覽器回放的項目（`clarifier-contract.mjs` 檔頭）：真實 CSP 標頭的阻擋結果、`prefers-reduced-motion` 的 CSS 動畫、瀏覽器返回鍵的歷史堆疊、Tab 鍵的實際焦點順序、Turnstile 與 `/api/assist` 的真實網路請求數。
  5. 字面殘留：`assets/main.js` `JOURNEY_PAGES` 的 leave／about 階段名、`SPEC.md` §1.1 頁面表與 `PERFORMANCE_AND_RETENTION_SPEC.md` 第 12 站文字仍用「回程與延續」（頁尾旅程導覽用語；`JOURNEY_ORDER` 依指示不動），與首頁 chip「回程或留下」不同，待決定是否統一。
  6. P0-11 其餘 7 頁沿用舊 hub，待另開 ID；答案卡高度超出 280–350px 預算（只記錄）。
- 主 session 複核與收尾（2026-09-03 晚間）：
  1. 護照 radio 標籤縮短為「台灣 417／中國大陸 462／其他護照」並把 radiogroup 改成三欄同列（`assets/style.css`），解決整合者回報未達成的 P0-8 驗收 1 後半：四個面板點階段後第一個需求 chip 的 top 由 833／873 降到 778／778／623／623（門檻 812），入口卡上緣無面板 1,232、面板＋出口 2,109（門檻 1,600／2,200），安全列 96px；`scripts/check.ps1` 新增兩條斷言鎖住（三欄同列的 grid 規則、兩個面板各一份短標籤）。
  2. 跨供應商反方審查：Codex 額度用盡（官方訊息 Sep 7 才恢復）、AGY 回空輸出，改派 MiniMax-M2.7（label `whv-p0-impl-review-minimax-20260903`）。四項指控逐條對照原始碼後，三項駁回：禁用句型 regex 多列「這工作可以集簽」變體是更嚴格而非放寬；答案卡的要點與主按鈕目的地在 `check.ps1` 第 275／291／297–310 行已有契約比對（比舊的 quick-answer 路由檢查更嚴）；官方連結的 `rel="noopener"` 有第 37 行全站斷言加第 317 行逐字斷言。**採納一項**：`data-evidence-status="checked"` 時未斷言 details 必須預設收合（只驗了 stale 必須 open），已補；順帶把逃生口斷言由字串比對改為要求 `<a` 標籤。
  3. 主 session 自行複核五頁答案卡是否引入原頁面沒有的事實：逐頁比對 HEAD 版本的數字與外連，除規格要求的「417／462 適用」範圍標籤外，無新數字、無新外連。
  4. 已刪除的兩條 `check.ps1` 斷言確認有更嚴格的替代：搜尋隱私禁用清單由 4 項擴為 8 項（新增 `SEARCH_SYNONYMS`、`data-search-query`、`data-home-search-query`、`openAssist`）；`prefers-reduced-motion` 除原有 `.clarifier-chips .chip` 外新增安全列、入口卡、固定搜尋鈕。
- 狀態：程式完成／本機驗證；部署與正式站 LCP 重量待站長。

## D-2026-09-03-03 P0-8～P0-11 上線與線上回放

- 決策：站長要求部署。`6c8b139` push 到 `main`，GitHub Pages 建置成功（build status `built`，commit 6c8b139，2026-09-03T12:53:13Z），正式站已服務 `20260903-49`。
- 線上回放（正式站 `https://www.aussiewhvcompass.com/`，chrome-devtools 375×812×2 mobile，cache-bust 查詢字串）：
  - 首頁：資產版本 `20260903-49`；h1「澳洲打工度假，你現在在哪一步？」top 242；安全列高 96px、5 個連結依序 `health.html#emergency`／`scam.html#help`／`scam.html#help`／`visa.html#apply`／`housing.html#housing-search-tool`；四個階段 chip top 378／378／426／426；`home-zone-nav` 與 `trust-strip` 皆已不存在；三張入口卡連 `#communities`／`#games`／`#saved-pages`；21 個出口；全站有「看公開討論」、無「找人聊」。
  - 搜尋「二簽要幾天」：狀態列「已略過『要、嗎、怎麼』這類字，以『二簽』找到 9 個段落」，第 1 名 `visa.html#second`。8 個熱門 chip 全部是 `<a href>` 且錨點正確。
  - 零結果（`qzxv不存在的詞`）：空狀態 DOM 順序為 標題 → 說明 → 4 個階段 chip → 5 個安全列入口 → AI 槽位 → GitHub 連結；`#assist-form` 仍 hidden、`aria-expanded=false`、頁面 0 個 turnstile script、0 筆 `/api/` 或 challenges 請求、焦點留在搜尋輸入框。
  - 護照分支：選 462 後階段 chips 變「還在糾結／決定要去（等抽籤也算）／已經到澳／回程或留下」、需求 chips 與出口切換、摘要卡顯示（四行與七個連結含抽籤頁、functional-english 子頁、使館 WHV2026-27EN），整區無簡體字；切回 417 全部還原、摘要卡收起。
  - `visa.html` 答案卡：主結論 30 字、3 個要點 15／15／17 字、主按鈕 `#postcode-tool` 目標為含輸入元件的 DIV、依據列預設收合（`檢查 open=false`）、逃生口存在、卡片 top 353 高 540px、第一個正文 h2 由改版前 2,937px 提前到 1,551px、無水平溢位、舊 hub 已移除。
- **P0-8 驗收 5（LCP）：本輪未能取得有效量測，維持未完成。** 條件同基線（正式站、Slow 4G、4x CPU、375×812×3、冷快取），但改用 Chrome DevTools Performance trace，因為本環境的 `PerformanceObserver` 完全收不到 paint 與 LCP entry（`performance.getEntriesByType('paint')` 長度 0，`document.visibilityState` 為 visible 但分頁未合成畫面）。六次 trace 值：3,712／4,287／4,545／14,753／4,597／12,971 ms，全距 3,712–14,753 ＝中位數的約 242%，遠超 `PERFORMANCE_AND_RETENTION_SPEC.md` §1.0 的 25% 作廢門檻，**整批作廢**。方法也與基線（PerformanceObserver）不同，本來就不可直接比較。
- **可靠的觀察（與量測噪音無關）**：LCP 元素已不是 h1。`LCPBreakdown` insight 明示 `The LCP element (H2 id='site-search-home-title', nodeId: 275) is text`；六次 trace 的 nodeId 出現 274／275／279 三種，代表 LCP 候選在本設計下不穩定（改版前基線是十次皆同一個 H1）。原因是 h1 縮為 24px 兩行後，繪製面積小於搜尋區 h2。
- **新觀察：慢速情境下的 CLS。** 兩次慢速 trace 出現 CLS 0.29（其餘四次 0.00）。`CLSCulprits` insight 指出最大位移叢集分數 0.2916、受影響元素為 `SECTION id='search' class='site-search-home'`、根因為網路載入的字型 `fonts.gstatic.com/s/notosanstc/...woff2`。改版前基線五次 CLS 皆 0.00。判定：這是 CJK 字型晚到造成搜尋區重排，只在字型延遲十秒以上時出現，本輪無法區分是設計改動造成或環境噪音放大，**列為待清淨環境重驗**。
- 待辦（列 `ROADMAP.md` §3）：在噪音較低的環境重跑 LCP 與 CLS 各 5 次（全距須 ≤ 中位數 25%）；若 CLS 0.29 可重現，處理搜尋區 h2 的字型重排（例如為該標題預留行高或改用 `size-adjust` 的 fallback 字型），並與 P2-4 的 CJK 字型策略一起評估。
- 狀態：已上線（P0-8～P0-11）；LCP／CLS 量測未完成。
