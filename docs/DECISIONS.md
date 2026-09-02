# 澳打指南針 — 決策與證據日誌（DECISIONS）

> 版本 2.0｜最後更新 2026-09-02｜按日期遞增的決策紀錄（ADR 風格）。
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
