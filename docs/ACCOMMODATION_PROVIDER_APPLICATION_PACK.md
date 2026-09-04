# 住宿平台申請資料包

本檔把可以立即準備的申請資料，和只有站長本人能完成的帳號、合約與身分步驟分開。它不是授權證明，也不代表任何平台已核准 `aussiewhvcompass.com` 顯示房源。

## 共用網站說明（可貼入申請表）

### English

> Aussie WHV Compass is an independent, source-linked planning and navigation website for people considering or using an Australian Working Holiday visa. The accommodation section helps readers distinguish temporary stays, share houses, formal rentals and work-linked accommodation, then opens the original provider route that best fits their situation. We do not scrape, republish or claim live availability from third-party platforms. Any future integration would display only contractually authorised fields, preserve required attribution and provider ordering, send the user to the provider to confirm availability and terms, and disclose any commercial relationship beside the provider name.

### 繁中內部對照

> 澳洲打工度假指南針是獨立、附來源的規劃與導覽網站，服務正在考慮或持澳洲打工度假簽證的人。住宿區先協助讀者分清短住、合租、正式整租與工作綁住宿，再前往最符合情境的平台原始入口。本站不抓取、轉載或宣稱擁有第三方即時空房。日後若整合，只顯示合約明確允許的欄位、保留規定的 attribution 與平台順序、導回平台確認空房與條款，並在平台名稱旁揭露商業關係。

## 申請狀態與下一步

| 平台 | 現在可完成 | 仍須站長本人處理 | 取得後仍不能直接做 |
|---|---|---|---|
| Booking.com | 由官方 Affiliate Program 轉往 CJ，申請 publisher／affiliate 資格 | 登入或建立 CJ 帳號、填真實 business／tax residence、網站、聯絡資料、完成 email／CAPTCHA、接受條款；核准後另向 Booking.com 詢問 Managed Affiliate Partner 與 Demand API | CJ 核准只代表可用核准的推廣素材或連結，不代表可在本站展示 Demand API inventory，也不代表可和競爭平台做 comparison |
| Hostelworld | 透過 Partnerize 申請 affiliate，另附下方 API／feed 用途詢問 | 建立或登入 Partnerize、填真實聯絡／地址／付款資料、接受條款與完成審核 | affiliate／tracked link 核准不等於 XSAPI、feed 或多平台展示授權；必須取得針對本站 use case 的書面回覆 |
| Domain | 建立 Developer account／project，提出 Agents & Listings 的 Approved Purpose | 本人登入、建立 project／OAuth client，接受 API Terms，向 Account Manager 或支援說明用途 | API key 不等於 production 上線：尚須澳洲境內資料處理、attribution、no-index、view events、導回 Domain 與公開畫面 review |
| realestate.com.au | 目前只保留一般租屋入口 | 只有已受至少一個 REA Customer 正式委任時，才適合由受權實體申請 Partner Platform | 不得把 Listing Export 當成一般消費者聚合 inventory；沒有 REA Customer 委任時不要送件或暗示符合資格 |
| Flatmates | 保留一般房間搜尋入口；可準備正式合作詢問 | 由站長寄信要求書面 data／feed／API permission | 一般帳號、刊登資格或客服回覆不等於資料授權；無書面許可不得 scraping、複製或在本站列出內容 |

## 各平台用途文字

### Booking.com／CJ

> We publish source-linked Australian Working Holiday planning information. Our accommodation flow asks whether a reader needs a temporary arrival stay, a share-house room, a formal rental or work-linked accommodation. Booking.com would be presented only as an original short-stay route, with any affiliate relationship clearly labelled. We will not scrape Booking.com, claim all-market coverage or present a cross-provider price ranking. We are also seeking written guidance on whether this use case is eligible for Managed Affiliate Partner / Demand API access and whether authorised Booking.com results may appear in a provider-grouped, non-price-ranked navigation flow alongside links to other accommodation categories.

申請後必問：

1. CJ／affiliate 核准涵蓋哪些 link、creative 與 deep-link 使用方式？
2. 本站是否符合 Managed Affiliate Partner／Demand API 的資格？
3. Booking.com 結果能否出現在「依住宿需求分組、無跨平台價格排名」的流程？若可，允許欄位、快取、attribution 與導回規則是什麼？

### Hostelworld／Partnerize

> Aussie WHV Compass helps Working Holiday Makers find a recoverable first stay before inspecting longer-term accommodation. Hostelworld would be shown as an original hostel / temporary-stay route, never as proof of live availability. We would like to confirm whether our provider-grouped, non-price-ranked navigation use case is permitted and whether Hostelworld can approve a feed, XSAPI or another documented integration for the fields shown to users. Until written approval is received, we will use only the links and creatives explicitly supplied through the approved affiliate programme.

申請後必問：

1. 核准是否只限 Partnerize link／creative，還是另提供 feed／XSAPI？
2. 非 price ranking 的多住宿類型導覽，是否仍被視為 meta／travel search？
3. 若允許，哪些欄位、圖片、快取、attribution 與導回 URL 可公開使用？

### Domain Developer

> Proposed Approved Purpose: help Australian Working Holiday Makers who have selected “formal whole-property rental” search an Australian locality and then continue to the original Domain property page. The site would not combine or rank Domain listings against competitor inventory. We can implement required Powered by Domain Insight attribution, no-index property detail, permitted engagement events, data minimisation and Australian-only data access/storage before public launch. Please confirm the approved endpoints, fields, display review process, attribution, event reporting, retention and geographic processing requirements for this purpose.

送出前必須補齊：

- 申請人／實體的真實法定名稱與聯絡資料。
- 資料將在哪個 Cloudflare region／service boundary 被 access、use、store；若不能證明全程在澳洲，不得聲稱已符合。
- property detail 的 `noindex`、Powered by Domain Insight、view event 與 only-link-to-Domain 實作方案。

### Flatmates 書面合作詢問

Subject: Permission enquiry for a WHV accommodation navigation use case

> Hello Flatmates team,
>
> I operate Aussie WHV Compass, an independent source-linked guide for Australian Working Holiday Makers. The site currently sends readers to the original Flatmates room-search page and does not scrape, copy or display Flatmates listings.
>
> We are exploring a user-initiated flow where a reader selects “share house”, enters an Australian locality and then sees either an original Flatmates search route or, only if formally licensed, a small provider-labelled set of authorised results that links back to Flatmates. There would be no cross-platform price ranking and any commercial relationship would be disclosed beside the platform name.
>
> Does Flatmates offer an API, data feed, affiliate programme or written licence for this use case? If so, could you provide the permitted fields, display and attribution requirements, caching/retention limits, commercial terms and review process? We will keep the implementation external-link-only unless written permission is granted.

## 人工送件 gate

送件前必須由站長逐項確認：

- 申請主體是本人／sole trader／registered entity 中哪一種；不能代猜 ABN、ACN、稅務居住地或公司名稱。
- 申請表中的 email、電話、地址、流量、收入與受眾數字都是真實資料；沒有證據就留白或寫平台允許的實況描述。
- 站長本人處理 password、email verification、CAPTCHA、tax／banking 與接受條款。
- 每次送件、接受條款、建立 API credential 或寄出合作信前，都要再次取得 action-time confirmation。
- 核准通知要保存「核准的實際 scope」，但不得把 token、client secret 或完整帳務資料存入 repo。

## 授權證據清單

只有同時具備下列證據，才能把某個 provider 從 external-link-only 移到 adapter 實作：

1. 核准平台、申請主體、網域與 use case 可對應。
2. 明確允許 `aussiewhvcompass.com` 向一般使用者顯示哪些 inventory 欄位。
3. 明確規定圖片、attribution、排序、快取、保存、地理處理、導回與商業揭露。
4. 確認可否和其他住宿類型／平台入口同頁出現；affiliate approval 本身不能替代這一項。
5. 測試 credential 與 production credential 分開保管。
6. 公開頁、privacy／recommendation policy、`third-party-register.json` 與實際畫面一致。


## Domain 申請作業單（2026-09-04 讀過官方條款後補寫）

依據：`https://www.domain.com.au/group/api-terms-and-conditions/`（2026-09-04 讀取）第 17.1 條與定義章，
以及 `https://developer.domain.com.au/docs/latest/apis/pkg_agents_listings` 的端點清單。

### 一、註冊本身（只有站長能做）

- 入口：`https://developer.domain.com.au/account/login`，可用 GitHub、Google 或 email 建立帳號。
- 官方流程是四步：建立帳號 → 選 API package → 建 project 並在 sandbox 測試（有 Live API Browser）→ 上 production。
- **agent 不代辦**：註冊、接受 API Terms、建立 OAuth client、任何輸入密碼或收驗證信的步驟。
- 我們要的 package 是 **Agents & Listings**；租屋搜尋端點是 `POST /v1/listings/residential/_search`。

### 二、貼上去的文字（已備好，不必重寫）

用本檔上方「共用網站說明（English）」＋「各平台用途文字 → Domain Developer」那兩段。
兩段都已經寫成 Approved Purpose 的形狀：說明用途、承諾不與競品混排、列出可實作的合規項目、請對方確認範圍。

### 三、第 17.1 條的五項義務，逐條對照本站

| 條款 | 要求 | 本站現況 |
|---|---|---|
| 17.1(a) | 再刊登房源且含物件詳情頁時，該頁要對 Google／Bing 設 `no-index`，並顯示 Powered by Domain Insight 標示 | 本站**不打算做物件詳情頁**（只顯示摘要卡並導回 Domain），所以 no-index 不觸發；**但標示一定要放** |
| 17.1(b) | 對仲介的詢問必須透過 Domain 的機制回饋（`POST /v1/enquiries`），不得繞開平台 | 本站目前**沒有詢問功能**，不觸發。日後若要做「聯絡仲介」就必須走這條 |
| 17.1(c) | **必須回報房源互動事件**：listing view、image view、map view、video view（`POST /v1/statistics/{event}`） | **與本站資料最小化立場衝突，需站長拍板**（見下節） |
| 17.1(d) | 只能顯示 Approved Purpose 指定的欄位子集、不得修改房源內容、須標示來源 | 相容：Worker 的白名單本來就只取 `name`／`area`／`priceDisplay`／`stayType`／`url` |
| 17.1(e) | 只能導回 Domain 的物件詳情頁，可能被要求加 UTM 標記 | 相容：本站本來就只導回平台 |

另外第 16.5 條：終止時要停用、刪除所有暫存資料、銷毀已取得的資料，Domain 可稽核並要求簽署證明。
**本站不寫 D1、不保存房源快照的設計在這裡反而是優勢**，申請時可以直接說明，因為沒有留存就沒有銷毀爭議。

### 四、上線前站長必須拍板的一件事

**17.1(c) 要求把使用者的瀏覽行為送回 Domain**——看了哪個房源、看了圖、看了地圖、看了影片。

這是本站目前沒有的一條**對第三方的出站資料流**，和 SDD §1.1 第 5 條的資料最小化、
以及「敏感頁不做個人層級量測」的立場直接相關。三個選項：

1. **接受**：在 `about.html` 新增揭露（作法比照 `#ai-assist` 那一段：送出什麼、不送什麼、為什麼），
   Worker 增加一條出站路徑，只送 Domain 規定的事件類型，不附加本站自己的識別資訊。
2. **先問清楚再決定**：在申請時直接問 Domain，這些事件的最小必要範圍是什麼、能不能只送聚合值。
   條款寫的是「listing view、image view、map view、video view」，沒說要附帶使用者識別，值得問。
3. **放棄 Domain 房源顯示**：維持現在的入口卡。整租本來就不是 WHV 最痛的一塊（合租才是），
   而合租那家（Flatmates）條款直接擋住，所以整租單獨接通的邊際價值有限。

**我的建議是 2 → 再依回覆決定 1 或 3。** 註冊與 sandbox 不受這題影響，可以先做。

### 五、還沒確定的一件事（不要當成已知）

條款把 API Product 分成 Free 與 Paid。**Paid 要簽 Product Schedule，而 Approved Purpose 寫在 Schedule 的 Item 4**；
定義另有「或以其他方式通知你」的但書，所以 Free 路線可能不必簽。
Agents & Listings 屬於哪一種、正式顯示房源需不需要簽 schedule，**登入 portal 看到 plan 才知道**。
這一點修正本檔先前「Domain 最自助」的說法：**帳號與 sandbox 是自助的，正式對外顯示不一定是。**

### 六、站長註冊完之後，我可以立刻接手的

1. 依實際 plan 與核准欄位寫 Domain provider adapter（介面與 `displayAuthorization` 已備妥）。
2. 把 Powered by Domain Insight 標示與來源標註做進 `housing.html` 的結果卡。
3. 若拍板接受事件回報，寫出站路徑與 `about.html` 的揭露段落。
4. 更新 `third-party-register.json` 的關係、報酬、追蹤與查核日期。
5. sandbox E2E：timeout、429、401／403、零結果、壞 payload、不安全 URL 的降級路徑。

**站長要交給我的只有兩樣**：核准範圍的書面內容（可顯示欄位、attribution、事件要求、快取限制），
以及 client id／secret **放進 Cloudflare 受保護設定**——不要貼進對話、issue 或檔案。
