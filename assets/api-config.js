(function () {
  "use strict";

  // Public values only. Private keys live in Worker bindings and never in this file.
  // Each feature has its own flag so that filling apiBaseUrl in turns on exactly one
  // thing, not every API-backed feature at once.
  window.WHV_API_CONFIG = Object.freeze({
    apiBaseUrl: "https://api.aussiewhvcompass.com",
    turnstileSiteKey: "0x4AAAAAAEmuk46PqxhDT4nB",
    // P0-4 / P0-7：預設使用本站資料找路，不呼叫模型、不需要驗證或後端。
    assistEnabled: true,
    assistMode: "local",
    // 只有 assistMode: "remote" 才使用；須與 Worker 的供應商設定及公開揭露一致。
    assistProvider: "minimax",
    // 站內聯絡送出仍未啟用：交易信資源尚未建立，about.html 也仍寫「站內安全送出尚未啟用」。
    contactSubmitEnabled: false,
    // D+ 匿名彙總量測仍未啟用（P1-22）。
    dplusMetricsEnabled: false,
    accommodationSearchEnabled: false,
    // 新聞只讀 API：正式部署必須與 0004_verified_news migration 和 Worker 排程同批上線。
    newsEnabled: true
  });
})();
