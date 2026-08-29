# 🧭 澳打指南針 — 澳洲打工度假開源攻略

給準備去澳洲打工度假（Working Holiday, subclass 417）的中文背包客的一站式開源攻略，
依旅程階段共 12 頁：

| 階段 | 頁面 |
|---|---|
| 出發前 | 自我釐清（快思測驗＋慢想工作表）・簽證與集簽・行前準備與落地 SOP・物價與薪水・英文 |
| 在澳洲 | 住宿與租屋・找工作・防詐騙（只講手法不列黑名單）・保險就醫心理與安全 |
| 之後 | 報稅退休金與離澳・PR 之路 |
| 本站 | 關於・私人 Email／需求單・公開共編・贊助 |

**公開攻略與核心工具免費・開源維護・客製合作可另行報價。**

受邀課程、講座、工作坊、網站與數位工具或內容製作都可先提需求；是否承接、
範圍、費用與交付需另外確認。付費合作不會購買本站的推薦或改寫官方事實。本站作者不是
澳洲註冊移民代理或澳洲執業律師，不論是否收費，都不提供個人簽證選項建議、準備／代填或
代表處理簽證申請。需要個案協助時，讀者應從 OMARA 官方名冊自行選擇合格專業人士。目前
沒有指定合作代理或佣金轉介；若未來建立商業轉介，會在連結旁揭露，並在法律與稅務確認前不啟用轉介費。

## 互動工具（純前端、無後端、不上傳填寫內容）

- **集簽資格快查器**（visa.html）：郵遞區號＋工作類型 → 是否可計入二簽/三簽。
  資料檔 `assets/postcodes.js` 抓取自內政部 specified-work 官方頁（2026-08-29），
  官方更新宣告區時請同步更新此檔。
- **存錢試算器**（cost.html）、**行前互動清單**（prep.html）、
  **防詐實戰測驗**（scam.html）、**DASP 速算**（leave.html）、
  **自我釐清快思測驗＋慢想工作表**（why.html）、**私人合作需求單**（about.html）。
- Header 與首頁提供**全站搜尋**：搜尋 13 頁／109 個段落，查詢只在裝置內比對、不保存也不上傳。
- 全站圖示為內嵌 SVG（`assets/main.js` 注入 sprite），不使用 emoji。

## 多國語言 Quick Start

[語言入口](https://www.aussiewhvcompass.com/lang/)依澳洲內政部目前列出的 417／462 首簽護照
國家與地區，提供 38 種主要官方／通行語言的靜態 Quick Start 與全站語言切換。繁體中文與
英文為來源文案，其他語言標示為未校對機器翻譯或英文 fallback；簽證、法律、稅務與醫療內容
仍須以頁面所連的澳洲政府官方英文來源為準。完整 13 頁目前仍以繁體中文為主，不能把 Quick
Start 說成全站人工翻譯完成。

英文第二階段已上線[417／462 簽證與指定工作指南](https://www.aussiewhvcompass.com/lang/en/visa/)；
它會依護照分流 417／462、保留兩套 specified-work 邊界，並提供明示只適用 417 的英文郵遞區號快查器。
另有[英文找工作與職場權益指南](https://www.aussiewhvcompass.com/lang/en/work/)，涵蓋求職、雇主／薪資查核、
職場紅旗、採收月份工具與官方求助路徑，以及[英文防詐與剝削指南](https://www.aussiewhvcompass.com/lang/en/scam/)，
提供工作、簽證、租屋、金流與個資風險的辨識及正確通報分流。三頁均尚未經相應母語專業人士校對，不標示為 reviewed。

GA4 consent 架構已就緒，但 Measurement ID 目前留空，因此不會連線 Google Analytics。
站長完成 GA4 與 Search Console 人工前置後，依 [量測與收錄設定](docs/MEASUREMENT_SETUP.md) 啟用；
即使啟用，訪客未同意前仍不載入 Google tag，搜尋字詞與表單內容不會送往 GA。

## 搜尋引擎與 AI 探索

- 13 頁提供 canonical、Open Graph／Twitter 分享圖與 schema.org JSON-LD。
- `robots.txt` 開放所有公開頁，`sitemap.xml` 列出正式網址；`llms.txt` 提供 AI 可讀導覽、授權與事實界線。
- 修改頁名、description 或頁面清單後，先跑 `python scripts/build_seo.py`，再跑 `scripts/check.ps1`。
- `llms.txt` 是輔助理解的社群提案，不保證搜尋排名、收錄或任何 AI 服務採用。

## 開發者／AI agent 從這裡開始

- [docs/SDD.md](docs/SDD.md) — 系統設計文件：架構、設計系統、資料檔、重要教訓
- [docs/SPEC.md](docs/SPEC.md) — 功能規格：現況基線、待辦 backlog（P0–P2）、驗收程序、例行維護
- `scripts/check.ps1` — 驗收腳本（結構、連結、錨點、emoji 掃描），push 前必跑
- 修改內容標題或段落錨點後，先跑 `python scripts/build_search.py` 更新搜尋索引。

## 專案原則

1. **每個重要數字都要附官方來源與「最後更新」日期。** 頁面裡用
   `<span class="updated-tag">2026-08 查核</span>` 與 `.fact-meta` 標示。
2. **誠實優先於完整。** 查不到就寫「請以官方為準」，不填看起來很有自信的舊數字。
3. **簡單優於華麗。** 純靜態 HTML/CSS/JS，沒有框架、沒有建置步驟，
   不會寫程式的人也能看懂並修改內容。

## 本地預覽

直接用瀏覽器打開 `index.html` 即可，不需要任何安裝。

## 部署（GitHub Pages，免費）

1. 把整個資料夾推上 GitHub 儲存庫。
2. Settings → Pages → Source 選 `main` 分支根目錄。
3. 幾分鐘後網站就會在 `https://<帳號>.github.io/<儲存庫名>/` 上線。

## 如何貢獻

- 發現數字過時／政策變動：開 Issue 附上官方來源連結，或直接改好送 PR。
- 每年 **7 月**是澳洲的「數字變動月」（簽證費、最低薪資、所得門檻多在 7/1 調整），
  歡迎認領每年 7 月的例行更新。
- 新增內容請維持現有風格：繁體中文、短段落、官方連結；商業關係必須明示，不得用付費交換推薦、排名或有利說法。

## 最需要定期更新的數字（維護清單）

| 項目 | 官方來源 | 變動週期 |
|---|---|---|
| 417 簽證申請費 | immi.homeaffairs.gov.au | 每年 7/1 前後 |
| 國家最低時薪 | fairwork.gov.au | 每年 7/1 |
| WHM 稅率級距 | ato.gov.au | 財年變動 |
| Superannuation 提撥率 | ato.gov.au | 政策變動 |
| 雇主擔保薪資門檻（CSIT） | immi.homeaffairs.gov.au | 每年 7/1 |
| 各城市租金行情 | 民間平台（標明來源） | 隨時 |

## 授權

- 文字內容：[CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/deed.zh-hant)
- 程式碼：MIT

## 免責聲明

本專案作者不是澳洲註冊移民代理（RMA）。內容為經驗分享與公開資訊整理，
不構成移民、法律、稅務或財務建議。一切以
[澳洲內政部](https://immi.homeaffairs.gov.au/) 及各官方機構公告為準。
