# 住宿平台授權接入清單

本清單是 `housing.html` 站內房源結果的發布 gate。目的不是抓更多資料，而是只在平台正式允許的範圍內，讓 WHV 使用者少重複輸入一次條件。它不是法律意見；平台合約與當下官方文件優先。

## 現行產品邊界

- 公開站預設 `accommodationSearchEnabled: false`，五個平台都只提供原始搜尋入口。
- 禁止 screen scraping、database scraping、繞過登入、模擬私人帳號、轉貼未授權照片或長期快取即時價格／空房。
- 只有合約或書面許可明確涵蓋「在 aussiewhvcompass.com 向一般使用者顯示搜尋結果」的平台，才可加入 Worker provider adapter。
- 每個平台分組維持平台自己的回傳順序，不做跨平台「最便宜」「最佳」或「全市場」排名。
- 搜尋只送 suburb／州別／郵遞區號、日期、晚數與人數；不送完整街道地址，不寫 D1，不寫 application log。
- API token、affiliate ID、client secret 只放 Cloudflare 受保護設定，不進前端、repo、commit 或 issue。

## 平台 gate

| 平台 | 目前可做 | 站內顯示前必須取得 | 官方起點 |
|---|---|---|---|
| Booking.com | 原始搜尋入口 | Managed Affiliate Partner 合約、Partner Centre 權限、可用 token 與 affiliate ID；確認合約允許本站預定的搜尋／導回方式 | [Demand API prerequisites](https://developers.booking.com/demand/docs/getting-started/prerequisites) |
| Hostelworld | 原始搜尋入口 | Affiliate Programme 核准，以及 Hostelworld 實際提供的 XSAPI／其他適用整合方式；依最新 Developer Guide 實作 | [Affiliate Programme terms](https://partners.hostelworld.com/wp-content/uploads/2020/05/hostelworld-affiliate-programme-tcs.pdf) |
| Domain | 原始搜尋入口 | Developer project 與所需 API package 的正式使用核准；確認公開顯示、欄位、流量、保存與 attribution 條款 | [Domain Developer Portal](https://developer.domain.com.au/docs/v1/) |
| realestate.com.au | 原始搜尋入口 | 目前 Partner Platform 主要供 REA 客戶授權的 partner／服務商；若要做本站消費者聚合，必須先取得針對此用途的書面許可與可用 scope | [REA Partner Platform](https://partner.realestate.com.au/) |
| Flatmates | 原始搜尋入口 | 明確書面許可或正式 API／feed 合約；現行 Terms 禁止 screen scraping、database scraping 與為取得使用者或其他資料所做的類似行為 | [Flatmates Terms](https://flatmates.com.au/info/terms) |

## 每個 provider 上線順序

1. 站長本人申請帳號、閱讀並接受合約；agent 不代替站長同意條款。
2. 保存平台核准範圍、可顯示欄位、圖片權利、快取期限、attribution、導回 URL 與商業關係證據；不要把 secret 放進證據檔。
3. 依核准文件新增單一 provider adapter，將上游不可信 JSON 白名單化成 `name`、`area`、`priceDisplay`、`stayType`、`url`。
4. 用 sandbox／平台測試環境驗證，確認 timeout、429、401／403、零結果、錯誤 payload 與不安全 URL 都會安全降級。
5. 更新 `third-party-register.json` 的 relationship、compensation、affiliateTracking、coverage 與查核日期。
6. 跑 `scripts/check.ps1`，再做桌機、390px 手機、鍵盤與 API 失敗 E2E；最後才把 `accommodationSearchEnabled` 改成 `true`。

## 發布文案最低要求

- 清楚列出本次連接的平台數與未連接的平台。
- 商業關係顯示在相應平台名稱旁，不能只藏在頁尾。
- 說明結果按平台分組、沒有跨平台統一排序，也沒有全市場覆蓋。
- 最終總價、空房、取消與租約條款必須回到平台確認。

比較型服務的覆蓋、排序與商業關係揭露，另參考 [ACCC 的線上比較提醒](https://www.accc.gov.au/consumers/buying-products-and-services/buying-online)。
