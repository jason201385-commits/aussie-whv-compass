# 澳洲打工度假常見問題研究與情境模型

> 版本 1.0｜最後更新 2026-09-12｜對應 ROADMAP P1-24。
> 本文件回答「使用者常卡在哪裡、網站應先幫他做什麼」；不是人口統計、法律意見或個案成功預測。

## 1. 研究方法與證據邊界

本輪把證據分成兩層，不混用：

1. **需求訊號**：2026-08-30 站長轉述的第一輪網站回饋，以及公開 Reddit 討論。用途只限於發現問題與排序設計，不代表所有 WHV 使用者，也不拿來證明法規或費用。
2. **答案依據**：澳洲聯邦或州政府、法定機關與 healthdirect 的官方頁。用途是核對安全出口與一般規則；個案仍回原主管機關處理。

目前沒有足以計算母體比例的站內分析資料，因此本文件只寫「高優先級／次優先級」，不寫「幾成使用者」或虛構排名。待 P1-22 匿名事件量測啟用後，才可用真實點擊與搜尋詞調整排序。

公開討論的共同訊號包括：找工作比預期久、工時不穩、住宿昂貴或難找、區域交通依賴車、現金消耗快、獨自處理落地手續與孤單壓力。這些是探索性訊號，來源如下：

- [Know Before You Go: Working Holiday in Australia](https://www.reddit.com/r/backpacking/comments/1d3zrvt/know_before_you_go_working_holiday_in_australia/)
- [What is the hardest thing about backpacking around Australia?](https://www.reddit.com/r/backpacking/comments/1bstkh9/what_is_the_hardest_thing_about_backpacking/)
- [People who’ve done an Australia working holiday: travel first or settle somewhere?](https://www.reddit.com/r/workingholiday/comments/1u7ebsz/people_whove_done_an_australia_working_holiday/)
- [Going to Australia alone on a Working Holiday Visa](https://www.reddit.com/r/solofemaletravel/comments/1w88d2w/going_to_australia_alone_on_a_working_holiday/)

## 2. 優先問題矩陣

| 優先 | 使用者真正想解決的問題 | 常見壓力或誤判 | 網站應先給的動作 | 官方核對入口 | 現有承接 | 缺口 |
|---|---|---|---|---|---|---|
| 高 | 我能不能去、417／462 怎麼分？ | 把不同護照、首簽、集簽與同雇主限制混成一條規則 | 先選護照與旅程階段，再開正確官方頁 | [Home Affairs WHM work conditions](https://immi.homeaffairs.gov.au/what-we-do/whm-program/specified-work-conditions) | 首頁釐清器、`visa.html` | 模擬器尚未碰到簽證條件與證據保存的取捨 |
| 高 | 落地要先住哪裡，現在能不能付 bond？ | 疲勞、低價與限時催款使人跳過看房、出租者與文件查核 | 先保住可取消短住，再看房、核對出租者、agreement、bond 與收據 | [WA 租屋找房指南](https://www.consumerprotection.wa.gov.au/publications/looking-rental-home-tenants-guide-1)、[WA rental bonds](https://www.consumerprotection.wa.gov.au/rental-bonds) | `housing.html`、模擬器 DAY 01／04 | 需讓地點與交通條件影響住宿選擇 |
| 高 | 工作去哪找，多久找不到要換策略？ | 把「很多職缺」理解成保證錄取，或把全部希望押在一個平台／仲介 | 先算現金跑道，並行使用可查證平台、直接雇主與公開資訊管道；設定重新評估日 | [Workforce Australia：visas and working](https://www.workforceaustralia.gov.au/individuals/coaching/visas-and-working-in-australia) | `work.html`、`map.html`、首頁工作出口 | 模擬器只有詐騙與減班，缺「投遞沒回音」與改策略事件 |
| 高 | 這個職缺會不會是詐騙？ | 高薪、免面試、通訊軟體聯絡與先付款被包裝成快速上工 | 停止付款與交付敏感資料；改用自己找到的聯絡方式獨立查核 | [Scamwatch jobs and employment scams](https://www.scamwatch.gov.au/types-of-scams/jobs-and-employment-scams) | `scam.html`、模擬器 DAY 08 | 已承接；維持安全出口優先 |
| 高 | 薪水、payslip、工時和 super 怎麼留證據？ | 怕得罪雇主而不問、不記錄，或把現金支付等同沒有權利 | 從第一天保存 roster、工時、payslip、付款與書面訊息 | [Fair Work：visa holders and migrants](https://www.fairwork.gov.au/find-help-for/visa-holders-migrants)、[Fair Work：pay slips](https://www.fairwork.gov.au/pay-and-wages/paying-wages/pay-slips) | `work.html`、模擬器 DAY 12 | 缺少 TFN、銀行與 super 的落地順序演練 |
| 高 | 錢能撐多久，工時突然減少怎麼辦？ | 只看時薪，不把無收入週、住宿、交通與移動成本算進去 | 算 14 天必要支出與止損線；用收入週／支出週做壓力測試 | [MoneySmart budget planner](https://moneysmart.gov.au/budgeting/budget-planner) | `cost.html`、模擬器 DAY 24 | 需把找工等待期、地點與交通成本放進同一輪 |
| 高 | 生病、受傷到底去哪裡？ | 把「不是危及生命」誤解成不用處理，或把所有狀況都送急診 | 嚴重且緊急撥 000；非緊急可找 GP、藥師、urgent care 或打 healthdirect | [healthdirect：what healthcare do I need](https://www.healthdirect.gov.au/amp/article/what-care-do-i-need)、[calling triple zero](https://www.healthdirect.gov.au/calling-triple-zero) | `health.html`、模擬器 DAY 18 | 模擬器缺非緊急就醫與費用／保險查核情境 |
| 中 | TFN、銀行、myGov、super 先辦哪一個？ | 文件互相等待、收到假連結或把 TFN 交給不需要的人 | 用官方入口建立一張落地手續順序表；敏感資料只交必要對象 | [ATO：Working in Australia](https://www.ato.gov.au/api/public/content/0-e74c5f17-c293-45b0-b033-f5d5a3aee760) | `prep.html`、`leave.html` | 模擬器尚未演練；首頁的「出發先做啥」較泛 |
| 中 | 沒車能不能工作、該先買車嗎？ | 看到區域工作才發現早班無公共運輸，或為了工作急買未查車況的車 | 先以實際班次與地址驗證通勤，再比較公共運輸、共乘、住宿綁工作與買車總成本 | 各州交通與車籍官方入口由 `cost.html`／`work.html` 依州承接 | `cost.html`、`work.html`、季節月曆 | 模擬器沒有地點／交通設定，無法讓同一職缺呈現不同後果 |
| 中 | 哪個月份、哪個地點比較容易找到適合的工作？ | 把採收月份當成即時缺額或保證工作，忽略天氣、住宿與交通 | 月份只做「可能性提示」；真正上工仍回即時職缺、雇主與簽證條件查核 | [Workforce Australia job search](https://www.workforceaustralia.gov.au/for-jobseekers) | `work.html` 採收月份、`map.html` | 模擬器沒有月份與城市／區域差異 |
| 中 | 英文不夠、孤單或壓力很大怎麼辦？ | 因怕問錯而延誤就醫、工作查核或求助；只依賴單一同語社群 | 先準備情境句與翻譯服務，至少留一位可信任聯絡人和一個正式求助入口 | [healthdirect：GP 與口譯資訊](https://www.healthdirect.gov.au/the-role-of-a-gp) | `english.html`、`communities.html`、`health.html` | 模擬器只有初始支持分數，缺少真實社交／溝通事件 |
| 中 | 我有沒有 Medicare、保險要補什麼？ | 把別人的國籍或保單經驗套到自己身上 | 先按國籍查 RHCA，再逐項看保單保障、除外與自付額 | [Services Australia：RHCA](https://www.servicesaustralia.gov.au/reciprocal-health-care-agreements) | `health.html` | 可放進非緊急就醫事件，不替玩家判定保障資格 |
| 中 | 離澳前後稅務與 super 什麼時候做？ | 把「先整理資料」誤寫成「人在澳洲即可提交 DASP」 | 離澳前整理 income statement、super 帳戶與聯絡資料；符合資格後才提交 | [ATO DASP application](https://www.applicant.tr.super.ato.gov.au/applicants/default.aspx?pid=1) | `leave.html` | 30 天模擬器不必硬塞；完結頁可提醒長期旅程仍有離澳階段 |

## 3. 採納到網站的順序

### 第一批：模擬器 v2（P1-24）

- 角色設定新增「抵達月份」「落腳地類型」「交通方式」，原有預算、住宿、準備、支持與目標保留。
- 固定核心事件保留；新增或改寫成會依角色條件顯示差異的事件：求職沒回音、TFN／銀行／super、通勤、非緊急就醫、英文／孤單。
- 月份與地點只能改變情境提示與取捨，**不得輸出職缺預測、成功率、推薦城市或個人簽證判定**。
- 採收季資訊必須稱為可能性訊號，不得把月曆當成現有 vacancy。
- 保持可重播、白名單選項、零自由文字、只用 sessionStorage、不送出玩家答案。

### 第二批：首頁與搜尋

- 首頁四階段與現有問題出口已涵蓋本輪主題，不再新增另一套大分類。
- 優先把出口文案改成「現在先做什麼」並連到工具或同頁答案；完整背景留在第二層。
- 待 P1-22 啟用後，以匿名出口點擊、站內搜尋與「沒找到」訊號決定順序；在有資料前不宣稱熱門排行。

### 第三批：持續研究

- 只記錄匿名問題類別，不保存自由文字、姓名、簽證號碼、健康資料或個別爭議內容。
- 每次更新高風險答案，先開官方原頁確認更新日期與適用範圍，再更新 `content-status.json`。
- 社群經驗可補充「可能遇到什麼」，不得取代官方規則或變成成功保證。

## 4. 本輪不做

- 不抓取封閉社團、私人對話或住宿平台房源。
- 不用四篇公開討論推算發生率。
- 不把某月份、城市、工作或住宿評為普遍「最好」。
- 不讓模擬器診斷心理狀態、財務能力、醫療需求或簽證資格。
- 不因遊戲化隱藏 000、Fair Work、Scamwatch、Home Affairs 等安全出口。
