(function () {
  "use strict";

  // Public values only. Private keys live in Worker bindings and never in this file.
  // Each feature has its own flag so that filling apiBaseUrl in turns on exactly one
  // thing, not every API-backed feature at once.
  window.WHV_API_CONFIG = Object.freeze({
    apiBaseUrl: "https://api.aussiewhvcompass.com",
    turnstileSiteKey: "0x4AAAAAAEmuk46PqxhDT4nB",
    // P0-4 / P0-7：站內 AI 兜底已啟用（Worker、D1、Turnstile 與三個 Worker 端金鑰均已就緒）。
    assistEnabled: true,
    // 站內聯絡送出仍未啟用：交易信資源尚未建立，about.html 也仍寫「站內安全送出尚未啟用」。
    contactSubmitEnabled: false,
    // D+ 匿名彙總量測仍未啟用（P1-22）。
    dplusMetricsEnabled: false,
    accommodationSearchEnabled: false
  });
})();
