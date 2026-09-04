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
| Booking.com | 原始搜尋入口；可申請 CJ affiliate | `CJ affiliate link approval` 與 `Managed Affiliate Demand API approval` 是兩個 gate。站內 inventory 另須 Managed Affiliate Partner 合約、Partner Centre、token、affiliate ID，以及允許本站多類型導覽畫面的書面 scope | [Demand API prerequisites](https://developers.booking.com/demand/docs/getting-started/prerequisites) |
| Hostelworld | 原始搜尋入口；可申請 Partnerize affiliate | `Partnerize affiliate approval` 與 case-by-case `feed／XSAPI approval` 是兩個 gate。站內 inventory 另須確認本流程不違反 meta／travel search 限制，並取得允許欄位與顯示方式的書面 scope | [Affiliate Programme terms](https://partners.hostelworld.com/wp-content/uploads/2020/05/hostelworld-affiliate-programme-tcs.pdf) |
| Domain | 原始搜尋入口；可建立 Developer project | Agents & Listings 的 Approved Purpose、公開畫面 review、澳洲境內資料處理、no-index、Powered by Domain Insight、engagement events 與 only-link-to-Domain 都完成後才可上線 | [Domain Developer Portal](https://developer.domain.com.au/docs/v1/) |
| realestate.com.au | 原始搜尋入口 | 目前 Partner Platform 主要供 REA 客戶授權的 partner／服務商；若要做本站消費者聚合，必須先取得針對此用途的書面許可與可用 scope | [REA Partner Platform](https://partner.realestate.com.au/) |
| Flatmates | 原始搜尋入口 | 明確書面許可或正式 API／feed 合約；現行 Terms 禁止 screen scraping、database scraping 與為取得使用者或其他資料所做的類似行為 | [Flatmates Terms](https://flatmates.com.au/info/terms) |

## 每個 provider 上線順序

1. 站長本人申請帳號、閱讀並接受合約；agent 不代替站長同意條款。
2. 保存平台核准範圍、可顯示欄位、圖片權利、快取期限、attribution、導回 URL 與商業關係證據；不要把 secret 放進證據檔。
3. 依核准文件新增單一 provider adapter，並提供非 secret 的 `displayAuthorization`：固定本站 origin、內部 evidence reference、核准用途、查核日與有效期限；任一欄缺漏或過期時 Worker 不會呼叫 provider。上游不可信 JSON 仍只白名單化成 `name`、`area`、`priceDisplay`、`stayType`、`url`。
4. 用 sandbox／平台測試環境驗證，確認 timeout、429、401／403、零結果、錯誤 payload 與不安全 URL 都會安全降級。
5. 更新 `third-party-register.json` 的 relationship、compensation、affiliateTracking、coverage 與查核日期。
6. 跑 `scripts/check.ps1`，再做桌機、390px 手機、鍵盤與 API 失敗 E2E；最後才把 `accommodationSearchEnabled` 改成 `true`。

## 發布文案最低要求

- 清楚列出本次連接的平台數與未連接的平台。
- 商業關係顯示在相應平台名稱旁，不能只藏在頁尾。
- 說明結果按平台分組、沒有跨平台統一排序，也沒有全市場覆蓋。
- 最終總價、空房、取消與租約條款必須回到平台確認。

比較型服務的覆蓋、排序與商業關係揭露，另參考 [ACCC 的線上比較提醒](https://www.accc.gov.au/consumers/buying-products-and-services/buying-online)。

## 2026-09-01 申請決策

- **現在值得申請**：Booking.com／CJ affiliate、Hostelworld／Partnerize affiliate、Domain Developer account／Approved Purpose。
- **現在不送件**：realestate.com.au Partner Platform；本站尚無 REA Customer 委任，不能把一般消費者聚合用途包裝成受權 partner 用途。
- **只詢問書面合作**：Flatmates；沒有公開 listing API／feed 路徑，普通帳號不會產生資料權利。
- **公開功能不變**：五平台仍是 external-link-only，`accommodationSearchEnabled` 維持 false。任何 affiliate 核准都不會自動解除 inventory display gate。
- **程式 gate**：只有 Hostelworld、Booking.com、Domain 可成為目前的授權 adapter candidate；realestate.com.au 與 Flatmates 固定為 external-link-only。若未來真的取得足以改變此判斷的正式書面授權，必須經 code review 才能新增 candidate，不接受只塞 key 或 runtime adapter。

可貼入表單的網站說明、用途文字、人工欄位與授權證據清單見 `docs/ACCOMMODATION_PROVIDER_APPLICATION_PACK.md`。


## 申請執行順序與現實評估（2026-09-04 查核）

上面的表寫「要過哪些關」，這一節寫「先做哪一個、要準備什麼、值不值得花時間」。
每個入口都在 2026-09-04 用瀏覽器開過。**簽約與註冊帳號一律由站長本人做，agent 不代辦。**

### 建議順序

**1. Domain（最可行，先做這個）**
- 起點：`https://developer.domain.com.au/account/login`（GitHub／Google／email 皆可）。
  要的 package 是 **Agents & Listings**，租屋端點是 `POST /v1/listings/residential/_search`。
- 為什麼先做：五家裡唯一**帳號與 sandbox 可以自助完成**、不必先有業務窗口的。
- **但不要以為全程自助**（2026-09-04 讀條款後更正）：API Product 分 Free 與 Paid，
  Paid 要簽 Product Schedule，而 Approved Purpose 就寫在 Schedule 的 Item 4；
  定義另有「或以其他方式通知你」的但書。屬於哪一種要登入看到 plan 才知道。
- 心理準備：拿到 key 不等於可以公開顯示。第 17.1 條有五項義務，
  其中**回報 listing／image／map／video view 事件**這條與本站資料最小化立場衝突，需站長拍板。
  逐條對照與作業單見 `ACCOMMODATION_PROVIDER_APPLICATION_PACK.md` §Domain 申請作業單。

**2. Hostelworld（次可行）**
- 起點：`https://partners.hostelworld.com/`——先申請 Partnerize affiliate。
- 兩關：affiliate 核准是第一關，**feed／XSAPI 是逐案核准的第二關**。
  第一關過了只代表可以放推薦連結，不代表可以在站內顯示房源。
- 心理準備：第二關要說明本站不是 meta search／比價站，因為他們的條款對這類用途有限制。

**3. Booking.com（門檻最高，但不是不可能）**
- 起點：`https://developers.booking.com/demand/docs/getting-started/prerequisites`。
  該頁的檢查表第一項就是註冊成為 Managed Affiliate Partner，
  Partner Centre 的存取權是「簽約後由你的 Booking.com 客戶經理提供」。
- 也就是說：**這不是自助註冊，是要有業務窗口願意接你**。通常會看流量規模。
- 平行路線：CJ affiliate（`https://public.cj.com/signup/publisher`）可以先申請，
  但那只給推薦連結與分潤，**不會給你站內顯示 inventory 的權利**。兩件事不要混為一談。

**4. realestate.com.au（預期會被拒，最後再試）**
- 起點：`https://partner.realestate.com.au/`。
- 問題在於他們的 Partner Platform 主要服務 REA 自己的客戶與其授權的服務商，
  不是給第三方做消費者聚合。要走這條得針對本站用途另外談書面許可。
- 建議：等前三家至少有一家成功、手上有實際流量數字之後再談，成功率會高一點。

**5. Flatmates（現行條款直接擋住，不要花時間）**
- 起點：`https://flatmates.com.au/info/terms`。
- 現行條款明文禁止 screen scraping、database scraping 與類似行為。
  沒有公開的 API 或 feed 方案，等於**只能靠一對一談出書面許可或正式合約**。
- 建議：先不投入。合租房源正是 WHV 最需要的一塊，但這一家的成本效益最差。

### 每次申請前先準備好這幾樣

- 網站定位一句話：免費開源的澳洲打工度假指南，不做代辦、不做比價排名、不收房源刊登費。
- 流量與受眾數字（**目前沒有**——P0-3 的 Cloudflare Web Analytics 與 GA4 還沒啟用，
  這會直接影響 Booking 與 REA 的意願，所以 P0-3 其實是這件事的前置）。
- 打算怎麼顯示：按平台分組、不做跨平台排名、不宣稱全市場覆蓋、總價與空房一律導回平台確認。
- 商業關係怎麼揭露：目前五個都是無分潤外連；日後有分潤會標在平台名稱旁，不藏在頁尾。
- 技術面已備妥：Worker adapter 介面、`displayAuthorization` 欄位、白名單化的顯示欄位、
  不寫 D1、不記錄搜尋內容——這些在申請時是加分項，可以直接說明。

### 判斷停損

如果三個月內沒有任何一家給出「可以在 aussiewhvcompass.com 顯示搜尋結果」的書面許可，
就把 `accommodationSearchEnabled` 這條路線收起來，把力氣放回入口體驗本身
（現在的滑動列已經把五家的條件都預先帶好，這本來就是使用者最有感的部分）。
**不要為了做出「站內看得到房源」而去繞過任何一家的條款——那會同時毀掉本站的可信度與 P0-4 的整套治理設計。**
