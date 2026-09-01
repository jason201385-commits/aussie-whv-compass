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
