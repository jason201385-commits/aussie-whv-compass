/* 澳打指南針 — consent-gated GA4（未同意前完全不載入 Google tag）
   敏感頁排除（SPEC §1.5）：詐騙、健康等敏感頁即使已同意且已設定 ID，
   也不建立 dataLayer、不載入 Google tag、不送 page view 或事件；
   只保留同意選擇的儲存與頁尾「網站統計設定」，讓訪客仍可在此改變選擇。 */
(function () {
  "use strict";

  /* 敏感頁路徑清單：以 pathname 尾段比對（大小寫不分），
     同時涵蓋 /scam.html、/scam、/scam/、/lang/en/scam/、/lang/en/scam/index.html，
     以及站台掛在子路徑下（例如 /aussie/scam.html）的情況。 */
  var SENSITIVE_PATHS = [
    "/scam.html",
    "/health.html",
    "/lang/en/scam/",
    "/lang/en/health/"
  ];

  var normalisePath = function (pathname) {
    var path = String(pathname || "").split(/[?#]/)[0].toLowerCase();
    try { path = decodeURIComponent(path); } catch (e) {}
    path = path.replace(/\/+$/, "");
    path = path.replace(/\/index(?:\.html?)?$/, "");
    path = path.replace(/\.html?$/, "");
    return path;
  };

  var isSensitivePath = function (pathname) {
    var path = normalisePath(pathname);
    if (!path) return false;
    for (var i = 0; i < SENSITIVE_PATHS.length; i += 1) {
      var pattern = normalisePath(SENSITIVE_PATHS[i]);
      if (!pattern) continue;
      if (path === pattern) return true;
      if (path.slice(-pattern.length) === pattern) return true;
      if (path.indexOf(pattern + "/") !== -1) return true;
    }
    return false;
  };

  var config = window.WHV_ANALYTICS_CONFIG || {};
  var measurementId = String(config.measurementId || "").trim();
  var isConfigured = /^G-[A-Z0-9]+$/.test(measurementId);
  var isSensitive = isSensitivePath(location.pathname);
  var CONSENT_KEY = "whv-analytics-consent-v1";
  var active = false;
  var loading = false;
  var status = document.getElementById("analytics-status");

  var readChoice = function () {
    try {
      var stored = localStorage.getItem(CONSENT_KEY);
      return stored === "granted" || stored === "denied" ? stored : null;
    } catch (e) { return null; }
  };

  var writeChoice = function (choice) {
    try { localStorage.setItem(CONSENT_KEY, choice); } catch (e) {}
  };

  var updateStatus = function (choice) {
    if (!status) return;
    if (!isConfigured) {
      status.textContent = "目前尚未設定正式 GA4 Measurement ID，因此不會載入 Google Analytics。";
    } else if (choice === "granted") {
      status.textContent = "你目前允許本站載入 Google Analytics；可用頁尾的「網站統計設定」隨時改變。";
    } else if (choice === "denied") {
      status.textContent = "你目前選擇不載入 Google Analytics；可用頁尾的「網站統計設定」隨時改變。";
    } else {
      status.textContent = "Google Analytics 只會在你明確允許後載入。";
    }
  };

  updateStatus(readChoice());
  document.documentElement.setAttribute("data-analytics", !isConfigured ? "disabled" : (isSensitive ? "excluded" : "available"));
  if (!isConfigured) return;

  var banner = document.createElement("aside");
  banner.className = "analytics-consent";
  banner.hidden = true;
  banner.setAttribute("aria-labelledby", "analytics-consent-title");
  banner.innerHTML = '<div class="analytics-consent-copy">'
    + '<strong id="analytics-consent-title">願意讓我們知道哪些頁面真正有幫助嗎？</strong>'
    + '<p>同意後才會載入 Google Analytics，可能蒐集瀏覽頁面、裝置／瀏覽器與概略地區。不送需求單、Email 內容或站內搜尋字詞。</p>'
    + '<a href="about.html#analytics">查看網站統計與隱私說明</a>'
    + '</div>'
    + '<div class="analytics-consent-actions">'
    + '<button class="btn" id="analytics-allow" type="button">允許使用統計</button>'
    + '<button class="btn ghost" id="analytics-deny" type="button">不要載入</button>'
    + '</div>';
  document.body.appendChild(banner);

  var footerInner = document.querySelector(".site-footer .foot-inner");
  var settingsButton = document.createElement("button");
  settingsButton.className = "analytics-settings";
  settingsButton.type = "button";
  settingsButton.textContent = "網站統計設定";
  if (footerInner) footerInner.appendChild(settingsButton);

  var showBanner = function (focusChoice) {
    banner.hidden = false;
    if (focusChoice) window.setTimeout(function () { document.getElementById("analytics-allow").focus(); }, 0);
  };
  var hideBanner = function () { banner.hidden = true; };

  var queueGtag = function () {
    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
  };

  var denyAll = function () {
    if (!window.gtag) return;
    window.gtag("consent", "update", {
      analytics_storage: "denied",
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied"
    });
    active = false;
  };

  var loadAnalytics = function () {
    /* 敏感頁永遠不載入：同意只寫入本機儲存，交由其他頁面生效。 */
    if (isSensitive || active || loading) return;
    loading = true;
    queueGtag();
    window.gtag("consent", "default", {
      analytics_storage: "denied",
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied"
    });
    window.gtag("consent", "update", {
      analytics_storage: "granted",
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied"
    });
    window.gtag("js", new Date());
    window.gtag("config", measurementId, {
      page_location: location.origin + location.pathname,
      page_path: location.pathname,
      page_title: document.title,
      send_page_view: true,
      allow_google_signals: false,
      allow_ad_personalization_signals: false
    });
    var script = document.createElement("script");
    script.async = true;
    script.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(measurementId);
    script.onload = function () { active = true; loading = false; };
    script.onerror = function () { active = false; loading = false; };
    document.head.appendChild(script);
  };

  document.getElementById("analytics-allow").addEventListener("click", function () {
    writeChoice("granted");
    updateStatus("granted");
    hideBanner();
    loadAnalytics();
  });
  document.getElementById("analytics-deny").addEventListener("click", function () {
    writeChoice("denied");
    denyAll();
    updateStatus("denied");
    hideBanner();
  });
  settingsButton.addEventListener("click", function () { showBanner(true); });

  if (isSensitive) {
    /* 敏感頁：到此為止。不建立 dataLayer、不載入 Google tag、不註冊 whv:search；
       只在尚未選擇時顯示同意提示，讓訪客可在此做出或改變選擇。 */
    if (readChoice() === null) showBanner(false);
    return;
  }

  window.addEventListener("whv:search", function (event) {
    if (readChoice() !== "granted" || !window.gtag) return;
    var detail = event.detail || {};
    var resultCount = Number.isInteger(detail.resultCount) ? Math.max(0, Math.min(200, detail.resultCount)) : 0;
    var topPage = /^(?:index|why|visa|prep|cost|housing|work|scam|english|health|leave|pr|about)\.html$/.test(detail.topPage)
      ? detail.topPage
      : "none";
    window.gtag("event", "site_search_used", {
      result_count: resultCount,
      top_result_page: topPage
    });
  });

  var choice = readChoice();
  if (choice === "granted") loadAnalytics();
  else if (choice !== "denied") showBanner(false);
})();
