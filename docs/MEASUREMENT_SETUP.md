# 澳打指南針 — GA4 與搜尋收錄人工設定

> 版本 1.0｜2026-08-29。這份文件只列站長本人才能完成的外部服務步驟；
> repo 內不放 Google 帳號、權限、憑證或其他私密資訊。

## 目前狀態

- SEO、canonical、JSON-LD、`robots.txt`、`sitemap.xml`、`llms.txt` 已在 repo 完成。
- GA4 consent 架構已完成，但 `assets/analytics-config.js` 的 `measurementId` 目前為空字串，
  因此網站不會連線 Google Analytics，也不會顯示同意提示。
- Google Analytics 帳戶／property／data stream 註冊與 Search Console 網域驗證屬 SPEC §0
  的人工前置，agent 不得代替站長註冊帳號、輸入密碼或驗證碼。

## A. 站長建立 GA4（人工）

1. 登入 Google Analytics，由站長本人建立或選擇 Account 與 GA4 Property。
2. 新增 Web data stream，網址填 `https://www.aussiewhvcompass.com/`。
3. 在 Data streams 的 Stream details 複製 `G-...` Measurement ID。它是公開標籤識別碼，
   不是密碼；仍不要分享 Google 登入資訊、OTP 或任何帳戶憑證。
4. 建議先不要連結 Google Ads、不要設定 User-ID，並先關閉不需要的 Enhanced Measurement，
   等實際確認資料需求與隱私揭露後再逐項開啟。
5. 把 Measurement ID 交給 repo 維護者，只改 `assets/analytics-config.js` 的空字串；
   跑 `scripts/check.ps1`、commit、push，部署後由站長同意統計，再到 Realtime 確認收到自己的測試瀏覽。

官方操作：

- [找到 GA4 Google tag ID](https://support.google.com/analytics/answer/9539598)
- [Google Analytics 預設蒐集資料](https://support.google.com/analytics/answer/11593727)
- [Consent Mode 網站設定](https://developers.google.com/tag-platform/security/guides/consent)
- [避免傳送個人識別資訊](https://support.google.com/analytics/answer/6366371)

## B. 站長連接 Google Search Console（人工）

1. 由站長本人在 Search Console 新增 Domain property `aussiewhvcompass.com`。
2. 依 Google 畫面要求在 Cloudflare DNS 加入驗證 TXT；驗證碼不寫進 repo。
3. 驗證成功後，在 Sitemaps 提交 `https://www.aussiewhvcompass.com/sitemap.xml`。
4. 以 URL Inspection 抽查首頁、`visa.html`、`housing.html`、`work.html`，確認可索引；
   收錄與排名需要 Google 重新 crawl，不得宣稱提交後立刻生效。

官方操作：

- [建立與提交 sitemap](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap)
- [robots.txt 說明](https://developers.google.com/search/docs/crawling-indexing/robots/intro)
- [結構化資料入門與驗證](https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data)

## C. 上線驗收

1. 未同意：DevTools Network 不得出現 `googletagmanager.com` 或 `google-analytics.com`。
2. 選「不要載入」再重新整理：同意提示不重複出現，仍無 Google Analytics 請求。
3. 從頁尾重開設定、選「允許使用統計」：才可載入 `gtag/js?id=G-...`。
4. Realtime 應看到 page view；站內搜尋自訂事件只含 `result_count` 與
   `top_result_page`，不得含查詢字詞、Email、需求單或工作表答案。
5. 390px 寬度下，同意提示不得溢出，兩個決定按鈕都至少 44px 高且可用鍵盤操作。
