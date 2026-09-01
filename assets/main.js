/* 澳打指南針 — 共用腳本 */
(function () {
  "use strict";

  // ---------- SVG 圖示庫（一次注入，全站以 <use href="#i-xxx"> 引用） ----------
  var SPRITE = '<svg xmlns="http://www.w3.org/2000/svg" style="display:none" aria-hidden="true">'
    + '<symbol id="i-compass" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></symbol>'
    + '<symbol id="i-user" viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></symbol>'
    + '<symbol id="i-idcard" viewBox="0 0 24 24"><rect x="2" y="4" width="20" height="16" rx="2"/><circle cx="8" cy="11" r="2.5"/><path d="M14 9h5M14 13h5M5 17h14"/></symbol>'
    + '<symbol id="i-luggage" viewBox="0 0 24 24"><rect x="6" y="7" width="12" height="13" rx="2"/><path d="M9 7V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3M9.5 20v1.5M14.5 20v1.5"/></symbol>'
    + '<symbol id="i-dollar" viewBox="0 0 24 24"><path d="M12 2v20M17 5.5H9.5a3.25 3.25 0 0 0 0 6.5h5a3.25 3.25 0 0 1 0 6.5H6"/></symbol>'
    + '<symbol id="i-home" viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></symbol>'
    + '<symbol id="i-briefcase" viewBox="0 0 24 24"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></symbol>'
    + '<symbol id="i-alert" viewBox="0 0 24 24"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></symbol>'
    + '<symbol id="i-chat" viewBox="0 0 24 24"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></symbol>'
    + '<symbol id="i-health" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></symbol>'
    + '<symbol id="i-plane" viewBox="0 0 24 24"><path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4 20-7z"/></symbol>'
    + '<symbol id="i-key" viewBox="0 0 24 24"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></symbol>'
    + '<symbol id="i-heart" viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></symbol>'
    + '<symbol id="i-check" viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></symbol>'
    + '<symbol id="i-x" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></symbol>'
    + '<symbol id="i-search" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></symbol>'
    + '<symbol id="i-flag" viewBox="0 0 24 24"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></symbol>'
    + '<symbol id="i-lifebuoy" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="4"/><line x1="4.93" y1="4.93" x2="9.17" y2="9.17"/><line x1="14.83" y1="14.83" x2="19.07" y2="19.07"/><line x1="14.83" y1="9.17" x2="19.07" y2="4.93"/><line x1="4.93" y1="19.07" x2="9.17" y2="14.83"/></symbol>'
    + '<symbol id="i-coffee" viewBox="0 0 24 24"><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/></symbol>'
    + '<symbol id="i-tool" viewBox="0 0 24 24"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></symbol>'
    + '<symbol id="i-file" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></symbol>'
    + '<symbol id="i-shield" viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></symbol>'
    + '<symbol id="i-star" viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></symbol>'
    + '<symbol id="i-zap" viewBox="0 0 24 24"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></symbol>'
    + '<symbol id="i-pin" viewBox="0 0 24 24"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></symbol>'
    + '<symbol id="i-bookmark" viewBox="0 0 24 24"><path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4-7 4V4a1 1 0 0 1 1-1z"/></symbol>'
    + '</svg>';
  var mount = document.createElement("div");
  mount.innerHTML = SPRITE;
  document.body.insertBefore(mount.firstChild, document.body.firstChild);

  // ---------- 鍵盤使用者可略過重複導覽 ----------
  var main = document.querySelector("main");
  if (main) {
    if (!main.id) main.id = "main-content";
    if (!main.hasAttribute("tabindex")) main.setAttribute("tabindex", "-1");
    if (!document.querySelector(".skip-link")) {
      var skip = document.createElement("a");
      skip.className = "skip-link";
      skip.href = "#" + main.id;
      skip.textContent = "跳到主要內容";
      document.body.insertBefore(skip, document.body.firstChild);
    }
  }

  // 導覽列目前頁面標示
  var path = location.pathname.split("/").pop() || "index.html";
  if (path === "index.html") {
    var brand = document.querySelector(".brand");
    if (brand) brand.setAttribute("aria-current", "page");
  }
  var activeNavLink = null;
  document.querySelectorAll(".nav-links a").forEach(function (a) {
    if (a.getAttribute("href") === path) {
      a.classList.add("active");
      a.setAttribute("aria-current", "page");
      activeNavLink = a;
    }
  });

  // ---------- 全站搜尋：同站索引、查詢不離開裝置、不保存輸入 ----------
  var navInner = document.querySelector(".nav-inner");
  var searchDialog = document.createElement("dialog");
  searchDialog.className = "site-search-dialog";
  searchDialog.id = "site-search-dialog";
  searchDialog.setAttribute("aria-labelledby", "site-search-title");
  searchDialog.innerHTML = '<div class="site-search-head">'
    + '<div><span class="section-eyebrow">SEARCH</span><h2 id="site-search-title">搜尋全部攻略</h2></div>'
    + '<button class="site-search-close" type="button" aria-label="關閉搜尋"><svg class="icon" aria-hidden="true"><use href="#i-x"/></svg></button>'
    + '</div>'
    + '<div class="site-search-body">'
    + '<form class="site-search-form" id="site-search-form" role="search">'
    + '<label class="sr-only" for="site-search-input">輸入要搜尋的主題</label>'
    + '<input id="site-search-input" type="search" inputmode="search" autocomplete="off" maxlength="80" placeholder="例如：二簽、找房、欠薪、看醫生" required>'
    + '<button class="btn" type="submit">搜尋</button>'
    + '</form>'
    + '<div class="site-search-quick" aria-label="熱門搜尋">'
    + '<span>可以先點：</span>'
    + '<button class="chip" type="button" data-search-query="二簽 88 天">二簽 88 天</button>'
    + '<button class="chip" type="button" data-search-query="找房">找房</button>'
    + '<button class="chip" type="button" data-search-query="欠薪">欠薪</button>'
    + '<button class="chip" type="button" data-search-query="看醫生">看醫生</button>'
    + '</div>'
    + '<p class="site-search-privacy">搜尋在這台裝置內完成，不會把查詢送到本站或搜尋引擎，也不會保存搜尋紀錄。</p>'
    + '<p class="site-search-status" id="site-search-status" role="status" aria-live="polite">輸入一個主題，或先點熱門搜尋。</p>'
    + '<div id="site-search-results"></div>'
    + '</div>';
  document.body.appendChild(searchDialog);

  var searchOpen = document.createElement("button");
  searchOpen.className = "site-search-open";
  searchOpen.type = "button";
  searchOpen.setAttribute("aria-haspopup", "dialog");
  searchOpen.setAttribute("aria-controls", "site-search-dialog");
  searchOpen.setAttribute("aria-label", "搜尋全部攻略；鍵盤可按斜線開啟");
  searchOpen.innerHTML = '<svg class="icon" aria-hidden="true"><use href="#i-search"/></svg><span>搜尋</span>';
  if (navInner) {
    var navLinks = navInner.querySelector(".nav-links");
    navInner.insertBefore(searchOpen, navLinks || null);
    if (navLinks) {
      var mobileNavQuery = window.matchMedia("(max-width: 768px)");
      var positionCurrentNavLink = function () {
        navLinks.setAttribute("aria-label", mobileNavQuery.matches ? "主題導覽，可左右滑動" : "主題導覽");
        if (!mobileNavQuery.matches || !activeNavLink) return;
        window.requestAnimationFrame(function () {
          var targetLeft = activeNavLink.offsetLeft - ((navLinks.clientWidth - activeNavLink.offsetWidth) / 2);
          navLinks.scrollLeft = Math.max(0, targetLeft);
        });
      };
      positionCurrentNavLink();
      if (typeof mobileNavQuery.addEventListener === "function") {
        mobileNavQuery.addEventListener("change", positionCurrentNavLink);
      }
    }
  }

  var searchInput = document.getElementById("site-search-input");
  var searchForm = document.getElementById("site-search-form");
  var searchStatus = document.getElementById("site-search-status");
  var searchResults = document.getElementById("site-search-results");
  var searchLoadPromise = null;
  var SEARCH_SYNONYMS = {
    "租房": ["找房", "租屋", "住宿", "房租", "sharehouse"],
    "找房": ["租房", "租屋", "住宿", "房租", "sharehouse"],
    "二簽": ["集簽", "88天", "指定工作"],
    "三簽": ["集簽", "179天", "指定工作"],
    "欠薪": ["薪資", "fairwork", "追薪", "工資"],
    "醫生": ["看醫生", "gp", "診所", "急診"],
    "看醫生": ["醫生", "gp", "診所", "急診"],
    "買車": ["二手車", "ppsr", "過戶", "車輛"],
    "買二手車": ["買車", "二手車", "ppsr", "過戶", "車輛"],
    "英文": ["英語", "面試", "口說"],
    "回台": ["離澳", "dasp", "退休金", "報稅"],
    "移民": ["pr", "永居", "雇主擔保", "技術移民"]
  };

  var normalizeSearch = function (value) {
    var normalized = String(value || "").toLowerCase();
    try { normalized = normalized.normalize("NFKC"); } catch (e) {}
    return normalized.replace(/[\s\-_.,，。！？!?、/\\()（）:：;；'"“”‘’]+/g, "");
  };

  var loadSearchIndex = function () {
    if (window.WHV_SEARCH_INDEX && Array.isArray(window.WHV_SEARCH_INDEX.entries)) {
      return Promise.resolve(window.WHV_SEARCH_INDEX.entries);
    }
    if (searchLoadPromise) return searchLoadPromise;
    searchLoadPromise = new Promise(function (resolve, reject) {
      var script = document.createElement("script");
      script.src = "assets/search-index.js?v=20260901-43";
      script.async = true;
      script.onload = function () {
        if (window.WHV_SEARCH_INDEX && Array.isArray(window.WHV_SEARCH_INDEX.entries)) {
          resolve(window.WHV_SEARCH_INDEX.entries);
        } else {
          reject(new Error("invalid search index"));
        }
      };
      script.onerror = function () { reject(new Error("search index unavailable")); };
      document.head.appendChild(script);
    });
    return searchLoadPromise;
  };

  var tokenScore = function (entry, token) {
    var options = [token].concat(SEARCH_SYNONYMS[token] || []);
    var title = normalizeSearch(entry.title);
    var pageTitle = normalizeSearch(entry.pageTitle);
    var text = normalizeSearch(entry.text);
    var keywords = normalizeSearch(entry.keywords);
    var best = 0;
    options.forEach(function (option) {
      var needle = normalizeSearch(option);
      if (!needle) return;
      if (title === needle) best = Math.max(best, 140);
      else if (title.indexOf(needle) >= 0) best = Math.max(best, 95);
      if (entry.title === "本頁總覽" && pageTitle === needle) best = Math.max(best, 110);
      else if (entry.title === "本頁總覽" && pageTitle.indexOf(needle) >= 0) best = Math.max(best, 72);
      if (keywords.indexOf(needle) >= 0) best = Math.max(best, 42);
      if (text.indexOf(needle) >= 0) best = Math.max(best, 24);
    });
    return best;
  };

  var searchEntries = function (entries, query) {
    var originalTokens = String(query || "").trim().toLowerCase().split(/\s+/).filter(Boolean);
    var whole = normalizeSearch(query);
    return entries.map(function (entry, order) {
      var score = 0;
      for (var i = 0; i < originalTokens.length; i++) {
        var matched = tokenScore(entry, normalizeSearch(originalTokens[i]));
        if (!matched) return null;
        score += matched;
      }
      var title = normalizeSearch(entry.title);
      var pageTitle = normalizeSearch(entry.pageTitle);
      var combined = normalizeSearch(entry.text + " " + entry.keywords);
      if (title.indexOf(whole) >= 0) score += 80;
      else if (entry.title === "本頁總覽" && pageTitle.indexOf(whole) >= 0) score += 55;
      else if (combined.indexOf(whole) >= 0) score += 20;
      return { entry: entry, score: score, order: order };
    }).filter(Boolean).sort(function (a, b) {
      return b.score - a.score || a.order - b.order;
    });
  };

  var makeSnippet = function (entry, query) {
    var source = String(entry.text || "").replace(/\s+/g, " ").trim();
    if (!source) return "開啟這一節查看整理內容與官方來源。";
    var direct = String(query || "").trim().toLowerCase().split(/\s+/).filter(Boolean)[0] || "";
    var at = source.toLowerCase().indexOf(direct);
    var start = at > 48 ? at - 48 : 0;
    var snippet = source.slice(start, start + 150);
    return (start ? "…" : "") + snippet + (start + 150 < source.length ? "…" : "");
  };

  var renderSearch = function (entries, query) {
    var cleaned = String(query || "").trim();
    searchResults.textContent = "";
    if (!cleaned) {
      searchStatus.textContent = "輸入一個主題，或先點熱門搜尋。";
      return;
    }
    var matches = searchEntries(entries, cleaned);
    if (!matches.length) {
      searchStatus.textContent = "找不到符合「" + cleaned + "」的內容。";
      var empty = document.createElement("div");
      empty.className = "site-search-empty";
      var emptyTitle = document.createElement("strong");
      emptyTitle.textContent = "換一個比較短的關鍵詞試試看";
      var emptyCopy = document.createElement("p");
      emptyCopy.textContent = "例如把「我被老闆拖欠薪水」縮成「欠薪」。如果網站真的缺這題，也可以回報建議。";
      var emptyLink = document.createElement("a");
      emptyLink.className = "btn ghost";
      emptyLink.href = "https://github.com/jason201385-commits/aussie-whv-compass/issues/new?template=idea.yml";
      emptyLink.target = "_blank";
      emptyLink.rel = "noopener noreferrer";
      emptyLink.textContent = "告訴我們缺哪一題";
      empty.appendChild(emptyTitle);
      empty.appendChild(emptyCopy);
      empty.appendChild(emptyLink);
      searchResults.appendChild(empty);
    } else {
      searchStatus.textContent = "找到 " + matches.length + " 個相關段落，先顯示最接近的 " + Math.min(matches.length, 8) + " 個。";
      var list = document.createElement("ol");
      list.className = "site-search-results-list";
      matches.slice(0, 8).forEach(function (match) {
        var item = document.createElement("li");
        var link = document.createElement("a");
        link.href = match.entry.href;
        var context = document.createElement("span");
        context.className = "site-search-result-page";
        context.textContent = match.entry.pageTitle;
        var title = document.createElement("strong");
        title.textContent = match.entry.title;
        var snippet = document.createElement("span");
        snippet.className = "site-search-result-snippet";
        snippet.textContent = makeSnippet(match.entry, cleaned);
        link.appendChild(context);
        link.appendChild(title);
        link.appendChild(snippet);
        item.appendChild(link);
        list.appendChild(item);
      });
      searchResults.appendChild(list);
    }
    window.dispatchEvent(new CustomEvent("whv:search", {
      detail: { resultCount: matches.length, topPage: matches.length ? matches[0].entry.page : "none" }
    }));
  };

  var closeSiteSearch = function () {
    if (typeof searchDialog.close === "function") searchDialog.close();
    else {
      searchDialog.removeAttribute("open");
      searchDialog.hidden = true;
      searchOpen.focus();
    }
  };

  var openSiteSearch = function (initialQuery) {
    searchDialog.hidden = false;
    if (typeof searchDialog.showModal === "function") {
      if (!searchDialog.open) searchDialog.showModal();
    } else {
      searchDialog.setAttribute("open", "");
    }
    if (typeof initialQuery === "string") searchInput.value = initialQuery;
    searchStatus.textContent = "正在準備本機搜尋索引…";
    searchResults.textContent = "";
    loadSearchIndex().then(function (entries) {
      renderSearch(entries, searchInput.value);
      window.setTimeout(function () { searchInput.focus(); searchInput.select(); }, 0);
    }, function () {
      searchStatus.textContent = "搜尋索引目前無法載入。你仍可使用上方導覽，或稍後重新整理再試。";
      searchResults.textContent = "";
    });
  };
  window.openWhvSearch = openSiteSearch;

  searchOpen.addEventListener("click", function () { openSiteSearch(""); });
  searchDialog.querySelector(".site-search-close").addEventListener("click", closeSiteSearch);
  searchDialog.addEventListener("click", function (event) {
    if (event.target === searchDialog) closeSiteSearch();
  });
  searchDialog.addEventListener("keydown", function (event) {
    if (event.key !== "Escape") return;
    event.preventDefault();
    closeSiteSearch();
  });
  searchForm.addEventListener("submit", function (event) {
    event.preventDefault();
    if (!searchForm.checkValidity()) { searchForm.reportValidity(); return; }
    loadSearchIndex().then(function (entries) { renderSearch(entries, searchInput.value); });
  });
  searchInput.addEventListener("input", function () {
    loadSearchIndex().then(function (entries) { renderSearch(entries, searchInput.value); });
  });
  searchDialog.addEventListener("click", function (event) {
    var quick = event.target.closest ? event.target.closest("[data-search-query]") : null;
    if (!quick) return;
    searchInput.value = quick.getAttribute("data-search-query");
    loadSearchIndex().then(function (entries) { renderSearch(entries, searchInput.value); searchInput.focus(); });
  });
  document.addEventListener("keydown", function (event) {
    if (event.key !== "/" || event.ctrlKey || event.metaKey || event.altKey) return;
    var target = event.target;
    var tag = target && target.tagName ? target.tagName.toLowerCase() : "";
    if (tag === "input" || tag === "textarea" || tag === "select" || (target && target.isContentEditable)) return;
    event.preventDefault();
    openSiteSearch("");
  });

  var homeSearchForm = document.getElementById("site-search-home-form");
  if (homeSearchForm) {
    var homeSearchInput = document.getElementById("site-search-home-input");
    homeSearchForm.addEventListener("submit", function (event) {
      event.preventDefault();
      var query = homeSearchInput.value.trim();
      if (!query) { homeSearchInput.focus(); return; }
      openSiteSearch(query);
    });
    document.addEventListener("click", function (event) {
      var homeQuick = event.target.closest ? event.target.closest("[data-home-search-query]") : null;
      if (!homeQuick) return;
      var query = homeQuick.getAttribute("data-home-search-query");
      homeSearchInput.value = query;
      openSiteSearch(query);
    });
  }

  // ---------- 各地社群：只篩選頁面上的公開入口；輸入不上傳 ----------
  var communityList = document.getElementById("community-list");
  if (communityList) {
    var communityInput = document.getElementById("community-search-input");
    var communityPlatform = document.getElementById("community-platform-filter");
    var communityClear = document.getElementById("community-filter-clear");
    var communityStatus = document.getElementById("community-list-status");
    var communityEmpty = document.getElementById("community-empty");
    var communityFacebook = document.getElementById("community-facebook-search");
    var communityReddit = document.getElementById("community-reddit-search");
    var communityEntries = Array.prototype.slice.call(communityList.querySelectorAll("[data-community-platform][data-community-region]"));
    var communityRegions = Array.prototype.slice.call(document.querySelectorAll(".map-region[data-community-region]"));
    var selectedCommunityRegion = "all";
    var communityRegionNames = {
      WA: "Western Australia", NT: "Northern Territory", QLD: "Queensland", SA: "South Australia",
      NSW: "New South Wales", ACT: "Canberra ACT", VIC: "Victoria", TAS: "Tasmania"
    };

    var normalizeCommunityQuery = function (value) {
      var normalized = String(value || "").toLowerCase();
      try { normalized = normalized.normalize("NFKC"); } catch (e) {}
      return normalized.replace(/\s+/g, " ").trim();
    };

    var updateCommunityPlatformLinks = function () {
      var typed = communityInput.value.trim();
      var locationHint = typed || communityRegionNames[selectedCommunityRegion] || "Australia";
      var platformQuery = locationHint + " working holiday";
      communityFacebook.href = "https://www.facebook.com/search/groups/?q=" + encodeURIComponent(platformQuery);
      communityReddit.href = "https://www.reddit.com/search/?q=" + encodeURIComponent(platformQuery) + "&type=communities";
    };

    var renderCommunityEntries = function () {
      var query = normalizeCommunityQuery(communityInput.value);
      var platform = communityPlatform.value;
      var visibleCount = 0;
      communityEntries.forEach(function (entry) {
        var searchText = normalizeCommunityQuery(entry.getAttribute("data-community-search") || entry.textContent);
        var regionMatch = selectedCommunityRegion === "all" || entry.getAttribute("data-community-region") === selectedCommunityRegion;
        var platformMatch = platform === "all" || entry.getAttribute("data-community-platform") === platform;
        var queryMatch = !query || searchText.indexOf(query) >= 0;
        var visible = regionMatch && platformMatch && queryMatch;
        entry.hidden = !visible;
        if (visible) visibleCount += 1;
      });
      communityStatus.textContent = visibleCount
        ? "目前顯示 " + visibleCount + " 個公開入口。"
        : "目前名單裡沒有符合的公開入口。";
      communityEmpty.hidden = visibleCount !== 0;
      updateCommunityPlatformLinks();
    };

    communityInput.addEventListener("input", renderCommunityEntries);
    communityPlatform.addEventListener("change", renderCommunityEntries);
    communityRegions.forEach(function (button) {
      button.addEventListener("click", function () {
        selectedCommunityRegion = button.getAttribute("data-community-region") || "all";
        communityRegions.forEach(function (regionButton) {
          var active = regionButton === button;
          regionButton.classList.toggle("active", active);
          regionButton.setAttribute("aria-pressed", active ? "true" : "false");
        });
        renderCommunityEntries();
        communityStatus.focus({ preventScroll: true });
      });
    });
    communityClear.addEventListener("click", function () {
      communityInput.value = "";
      communityPlatform.value = "all";
      selectedCommunityRegion = "all";
      communityRegions.forEach(function (button) {
        var active = button.getAttribute("data-community-region") === "all";
        button.classList.toggle("active", active);
        button.setAttribute("aria-pressed", active ? "true" : "false");
      });
      renderCommunityEntries();
      communityInput.focus();
    });
    renderCommunityEntries();
  }

  // ---------- 最近閱讀：只記錄白名單頁名，作為首頁的回訪續接 ----------
  var LAST_PAGE_KEY = "whv-last-page-v1";
  var JOURNEY_ORDER = [
    { path: "why.html", title: "自我釐清", phase: "01", stage: "還在考慮", remember: true },
    { path: "cost.html", title: "物價與薪水", phase: "01", stage: "還在考慮", remember: true },
    { path: "visa.html", title: "簽證與集簽", phase: "01", stage: "還在考慮", remember: true },
    { path: "prep.html", title: "行前準備與落地", phase: "02", stage: "決定要去", remember: true },
    { path: "health.html", title: "健康與安全", phase: "02", stage: "決定要去", remember: true },
    { path: "english.html", title: "英文資源與策略", phase: "02", stage: "決定要去", remember: true },
    { path: "housing.html", title: "住宿與租屋", phase: "03", stage: "已在澳洲", remember: true },
    { path: "work.html", title: "找工作", phase: "03", stage: "已在澳洲", remember: true },
    { path: "scam.html", title: "防詐騙", phase: "03", stage: "已在澳洲", remember: true },
    { path: "pr.html", title: "PR 路徑總覽", phase: "03", stage: "已在澳洲", remember: true },
    { path: "leave.html", title: "報稅、退休金與離澳", phase: "04", stage: "回程與延續", remember: true },
    { path: "about.html", title: "留下感謝・關於本站", phase: "04", stage: "回程與延續", remember: false }
  ];
  var JOURNEY_PAGES = {};
  JOURNEY_ORDER.forEach(function (item) {
    if (item.remember) JOURNEY_PAGES[item.path] = { title: item.title, stage: item.stage };
  });

  // ---------- 我的收藏：只接受白名單頁名，不保存標題、網址或使用者輸入 ----------
  var SAVED_PAGES_KEY = "whv-saved-pages-v1";
  var readSavedPages = function () {
    try {
      var parsed = JSON.parse(localStorage.getItem(SAVED_PAGES_KEY) || "[]");
      if (!Array.isArray(parsed)) return [];
      return parsed.filter(function (savedPath, index, all) {
        return typeof savedPath === "string"
          && Object.prototype.hasOwnProperty.call(JOURNEY_PAGES, savedPath)
          && all.indexOf(savedPath) === index;
      });
    } catch (e) { return []; }
  };
  var writeSavedPages = function (savedPaths) {
    try {
      localStorage.setItem(SAVED_PAGES_KEY, JSON.stringify(savedPaths));
      return true;
    } catch (e) { return false; }
  };

  var savedPagesSection = document.getElementById("saved-pages");
  if (savedPagesSection) {
    var savedPagesList = document.getElementById("saved-pages-list");
    var savedPagesClear = document.getElementById("saved-pages-clear");
    var renderSavedPages = function () {
      var savedPaths = readSavedPages();
      savedPagesList.textContent = "";
      savedPagesSection.hidden = savedPaths.length === 0;
      if (!savedPaths.length) return;

      savedPaths.forEach(function (savedPath) {
        var savedMeta = JOURNEY_PAGES[savedPath];
        var item = document.createElement("div");
        item.className = "saved-page-item";
        var link = document.createElement("a");
        link.href = savedPath;
        var stage = document.createElement("span");
        stage.textContent = savedMeta.stage;
        var title = document.createElement("strong");
        title.textContent = savedMeta.title;
        link.appendChild(stage);
        link.appendChild(title);

        var remove = document.createElement("button");
        remove.type = "button";
        remove.className = "saved-page-remove";
        remove.setAttribute("data-path", savedPath);
        remove.setAttribute("aria-label", "從我的收藏移除「" + savedMeta.title + "」");
        remove.textContent = "移除";
        remove.addEventListener("click", function () {
          var current = readSavedPages();
          var removeIndex = current.indexOf(savedPath);
          if (removeIndex < 0) return;
          var nextFocus = current[removeIndex + 1] || current[removeIndex - 1] || null;
          current.splice(removeIndex, 1);
          if (!writeSavedPages(current)) return;
          renderSavedPages();
          if (nextFocus) {
            Array.prototype.some.call(savedPagesList.querySelectorAll(".saved-page-remove"), function (button) {
              if (button.getAttribute("data-path") !== nextFocus) return false;
              button.focus();
              return true;
            });
          } else {
            var journeyStart = document.querySelector("#journey-map a");
            if (journeyStart) journeyStart.focus();
          }
        });
        item.appendChild(link);
        item.appendChild(remove);
        savedPagesList.appendChild(item);
      });
    };

    renderSavedPages();
    savedPagesClear.addEventListener("click", function () {
      if (!confirm("清除全部收藏頁面？之後仍可在各頁重新收藏。")) return;
      if (!writeSavedPages([])) return;
      renderSavedPages();
      var journeyStart = document.querySelector("#journey-map a");
      if (journeyStart) journeyStart.focus();
    });
    window.addEventListener("storage", function (event) {
      if (event.key === SAVED_PAGES_KEY) renderSavedPages();
    });
  }

  var resume = document.getElementById("journey-resume");
  if (resume) {
    try {
      var lastPage = JSON.parse(localStorage.getItem(LAST_PAGE_KEY) || "null");
      if (lastPage && Object.prototype.hasOwnProperty.call(JOURNEY_PAGES, lastPage.path)) {
        var lastMeta = JOURNEY_PAGES[lastPage.path];
        var resumeLink = document.getElementById("journey-resume-link");
        var resumeSummary = document.getElementById("journey-resume-summary");
        var resumeClear = document.getElementById("journey-resume-clear");
        resumeLink.href = lastPage.path;
        resumeLink.textContent = "回到「" + lastMeta.title + "」";
        resumeSummary.textContent = "你上次停在「" + lastMeta.title + "」，目前屬於「" + lastMeta.stage + "」階段。";
        resume.hidden = false;
        resumeClear.addEventListener("click", function () {
          try { localStorage.removeItem(LAST_PAGE_KEY); } catch (e) {}
          resume.hidden = true;
          var journeyStart = document.querySelector(".journey-directory a");
          if (journeyStart) journeyStart.focus();
        });
      }
    } catch (e) {
      try { localStorage.removeItem(LAST_PAGE_KEY); } catch (storageError) {}
    }
  } else if (Object.prototype.hasOwnProperty.call(JOURNEY_PAGES, path)) {
    try { localStorage.setItem(LAST_PAGE_KEY, JSON.stringify({ path: path })); } catch (e) {}
  }

  // ---------- 內容頁旅程導覽：讀完後仍知道上一站、全貌與下一站 ----------
  var journeyIndex = JOURNEY_ORDER.findIndex(function (item) { return item.path === path; });
  if (main && journeyIndex >= 0) {
    var currentJourney = JOURNEY_ORDER[journeyIndex];
    var previousJourney = journeyIndex > 0 ? JOURNEY_ORDER[journeyIndex - 1] : null;
    var nextJourney = journeyIndex < JOURNEY_ORDER.length - 1 ? JOURNEY_ORDER[journeyIndex + 1] : null;
    var pageJourneyNav = document.createElement("nav");
    pageJourneyNav.className = "page-journey-nav";
    pageJourneyNav.setAttribute("aria-label", "本頁在打工度假旅程中的位置");

    var journeyHead = document.createElement("div");
    journeyHead.className = "page-journey-head";
    var journeyEyebrow = document.createElement("span");
    journeyEyebrow.className = "section-eyebrow";
    journeyEyebrow.textContent = "JOURNEY " + currentJourney.phase;
    var journeyPosition = document.createElement("strong");
    journeyPosition.textContent = currentJourney.stage + "・第 " + (journeyIndex + 1) + " / " + JOURNEY_ORDER.length + " 頁";
    var journeyHint = document.createElement("small");
    journeyHint.textContent = "可以跳著讀；想順著走時，從這裡接下去。";
    journeyHead.appendChild(journeyEyebrow);
    journeyHead.appendChild(journeyPosition);
    journeyHead.appendChild(journeyHint);

    var makeJourneyStep = function (label, item, fallbackTitle, extraClass) {
      var link = document.createElement("a");
      link.className = "page-journey-step " + extraClass;
      link.href = item ? item.path : "index.html#journey-map";
      var direction = document.createElement("span");
      direction.textContent = label;
      var title = document.createElement("strong");
      title.textContent = item ? item.title : fallbackTitle;
      link.appendChild(direction);
      link.appendChild(title);
      return link;
    };

    var journeyLinks = document.createElement("div");
    journeyLinks.className = "page-journey-links";
    journeyLinks.appendChild(makeJourneyStep("上一站", previousJourney, "旅程首頁", "previous"));
    var overview = document.createElement("a");
    overview.className = "page-journey-overview";
    overview.href = "index.html#journey-map";
    overview.textContent = "查看完整旅程";
    journeyLinks.appendChild(overview);
    journeyLinks.appendChild(makeJourneyStep("下一站", nextJourney, "重新選階段", "next"));

    pageJourneyNav.appendChild(journeyHead);
    pageJourneyNav.appendChild(journeyLinks);
    main.appendChild(pageJourneyNav);
  }

  // ---------- 首頁 SVG 剪紙視差（減少動態與行動版停用） ----------
  var hero = document.querySelector(".hero");
  if (hero && window.matchMedia) {
    var heroMotion = window.matchMedia("(prefers-reduced-motion: no-preference)");
    var heroWide = window.matchMedia("(min-width: 641px)");
    var heroTicking = false;
    var updateHeroParallax = function () {
      heroTicking = false;
      if (!heroMotion.matches || !heroWide.matches) {
        hero.style.removeProperty("--hero-gold-y");
        hero.style.removeProperty("--hero-green-y");
        hero.style.removeProperty("--hero-accent-y");
        return;
      }
      var offset = Math.min(window.scrollY || 0, 650);
      hero.style.setProperty("--hero-gold-y", (offset * 0.08).toFixed(1) + "px");
      hero.style.setProperty("--hero-green-y", (offset * 0.14).toFixed(1) + "px");
      hero.style.setProperty("--hero-accent-y", (offset * 0.2).toFixed(1) + "px");
    };
    var queueHeroParallax = function () {
      if (heroTicking) return;
      heroTicking = true;
      window.requestAnimationFrame(updateHeroParallax);
    };
    window.addEventListener("scroll", queueHeroParallax, { passive: true });
    window.addEventListener("resize", queueHeroParallax);
    updateHeroParallax();
  }

  // ---------- 回饋列（全站注入，讓這套系統有進步的可能） ----------
  var footer = document.querySelector(".site-footer");
  if (footer) {
    var pageName = (document.title.split("｜")[0] || document.title).trim();
    var issueUrl = "https://github.com/jason201385-commits/aussie-whv-compass/issues/new"
      + "?template=report.yml"
      + "&title=" + encodeURIComponent("[" + pageName + "] ")
      + "&page=" + encodeURIComponent(pageName + "（" + (location.pathname.split("/").pop() || "index.html") + "）");
    var thanksUrl = "https://github.com/jason201385-commits/aussie-whv-compass/issues/new"
      + "?template=thanks.yml"
      + "&page=" + encodeURIComponent(pageName + "（" + (location.pathname.split("/").pop() || "index.html") + "）");
    var saveButtonHtml = Object.prototype.hasOwnProperty.call(JOURNEY_PAGES, path)
      ? '<button type="button" class="btn ghost" id="fb-save" aria-pressed="false">收藏這頁</button>'
      : '';
    var bar = document.createElement("div");
    bar.className = "feedback-bar";
    bar.innerHTML = '<span class="fb-q">這一頁有幫助嗎？</span>'
      + '<div class="feedback-actions">'
      + saveButtonHtml
      + '<button type="button" class="btn secondary" id="fb-share">有幫助，複製網址分享</button>'
      + '<a class="btn" target="_blank" rel="noopener noreferrer" href="' + issueUrl + '">回報問題／提建議</a>'
      + '<a class="btn ghost" target="_blank" rel="noopener noreferrer" aria-label="前往 GitHub 公開留下一句感謝（另開新頁）" href="' + thanksUrl + '">留下一句感謝（公開於 GitHub）</a>'
      + '</div>'
      + '<p class="feedback-note">回報與感謝會開啟公開的 GitHub Issue，需要登入並會顯示 GitHub 帳號；請勿留下個資或可識別第三人的資訊。</p>';
    footer.parentNode.insertBefore(bar, footer);
    var shareBtn = document.getElementById("fb-share");
    var saveBtn = document.getElementById("fb-save");
    if (saveBtn) {
      var refreshSaveButton = function () {
        var isSaved = readSavedPages().indexOf(path) >= 0;
        saveBtn.setAttribute("aria-pressed", String(isSaved));
        saveBtn.textContent = isSaved ? "已收藏" : "收藏這頁";
        saveBtn.setAttribute("aria-label", isSaved ? "已收藏這頁；按一下從收藏移除" : "收藏這頁到首頁的我的收藏");
      };
      refreshSaveButton();
      saveBtn.addEventListener("click", function () {
        var savedPaths = readSavedPages();
        var savedIndex = savedPaths.indexOf(path);
        var isRemoving = savedIndex >= 0;
        if (isRemoving) savedPaths.splice(savedIndex, 1);
        else savedPaths.unshift(path);
        if (!writeSavedPages(savedPaths)) {
          bar.querySelector(".fb-q").textContent = "這個瀏覽器目前無法保存收藏；仍可使用書籤或複製網址。";
          return;
        }
        refreshSaveButton();
        bar.querySelector(".fb-q").textContent = isRemoving
          ? "已從收藏移除；之後仍可再收藏。"
          : "已收藏；回首頁就能從「我的收藏」繼續。";
      });
      window.addEventListener("storage", function (event) {
        if (event.key === SAVED_PAGES_KEY) refreshSaveButton();
      });
    }
    shareBtn.addEventListener("click", function () {
      var copied = function () {
        bar.querySelector(".fb-q").innerHTML = '<span class="fb-thanks">已複製連結——分享給下一個要出發的人，就是最好的回饋。</span>';
        shareBtn.style.display = "none";
      };
      var copyFailed = function () {
        bar.querySelector(".fb-q").textContent = "無法自動複製，請使用瀏覽器的分享或複製網址功能。";
      };
      try {
        navigator.clipboard.writeText(location.href).then(copied, copyFailed);
      } catch (e) { copyFailed(); }
    });
  }

  // ---------- 快選籤：點一下代替打字（data-fill → 填入指定 textarea） ----------
  document.addEventListener("click", function (e) {
    var chip = e.target.closest ? e.target.closest(".chip[data-fill]") : null;
    if (!chip) return;
    var ta = document.getElementById(chip.getAttribute("data-target"));
    if (!ta) return;
    var text = chip.getAttribute("data-fill");
    ta.value = ta.value.trim() ? ta.value.replace(/[、\s]+$/, "") + "、" + text : text;
    ta.dispatchEvent(new Event("input"));
    ta.focus();
  });

  // ---------- 自我釐清快思版（只在 why.html 生效） ----------
  var quickExportLines = function () { return []; };
  var quickForm = document.getElementById("quick-form");
  if (quickForm) {
    var QUICK_KEY = "whv-why-quick-v1";
    var quickLabels = ["完全不像我", "比較不像我", "還不確定", "大致像我", "很像我"];
    var quickQuestions = Array.prototype.slice.call(quickForm.querySelectorAll(".quick-question"));
    var quickStatus = document.getElementById("quick-status");
    var quickProgress = document.getElementById("quick-progress");
    var quickProgressBar = document.getElementById("quick-progress-bar");
    var quickProgressLabel = document.getElementById("quick-progress-label");
    var quickResult = document.getElementById("quick-result");
    var quickNextTitle = document.getElementById("quick-next-title");
    var quickNextCopy = document.getElementById("quick-next-copy");
    var quickNextLink = document.getElementById("quick-next-link");
    var quickAxes = [
      { id: "autonomy", title: "自主動機", questions: ["qq1", "qq2"], href: "#q1", link: "去寫慢想第 1、2 題", copy: "分開寫下你想離開與想靠近的生活，再拿掉別人的期待，看看這仍是不是你願意選的方向。" },
      { id: "values", title: "價值取捨", questions: ["qq3", "qq4"], href: "#q4", link: "去寫慢想第 4、5 題", copy: "先排前三名，再明寫願意少拿什麼。沒有完美路線，排序會比把全部願望塞進同一趟旅程更有用。" },
      { id: "reality", title: "現實準備", questions: ["qq5", "qq6"], href: "#q6", link: "去寫慢想第 6 題", copy: "先回官方來源查一項規則，再設計一個 14 天低成本實驗，用真實行動檢查想像與現實的落差。" },
      { id: "support", title: "支持底線", questions: ["qq7", "qq8"], href: "#q7", link: "去寫慢想第 7 題", copy: "先列出兩個可求助的人或正式管道，再寫清楚遇到哪些紅旗時要換工作、換住處、求助或回家。" }
    ];

    quickQuestions.forEach(function (question) {
      var name = question.getAttribute("data-name");
      var scale = question.querySelector(".quick-scale");
      if (!scale || !/^qq[1-8]$/.test(name)) return;
      quickLabels.forEach(function (labelText, index) {
        var value = String(index + 1);
        var id = name + "-" + value;
        var label = document.createElement("label");
        label.className = "quick-option";
        label.setAttribute("for", id);
        var input = document.createElement("input");
        input.type = "radio";
        input.name = name;
        input.id = id;
        input.value = value;
        var number = document.createElement("b");
        number.textContent = value;
        var words = document.createElement("span");
        words.textContent = labelText;
        label.appendChild(input);
        label.appendChild(number);
        label.appendChild(words);
        scale.appendChild(label);
      });
    });

    var quickInputs = Array.prototype.slice.call(quickForm.querySelectorAll('input[type="radio"]'));

    function setQuickStatus(message) {
      if (quickStatus) quickStatus.textContent = message;
    }

    function getQuickData() {
      var data = {};
      quickQuestions.forEach(function (question) {
        var name = question.getAttribute("data-name");
        var checked = question.querySelector('input[type="radio"]:checked');
        if (checked && /^[1-5]$/.test(checked.value)) data[name] = Number(checked.value);
      });
      return data;
    }

    function saveQuick() {
      try { localStorage.setItem(QUICK_KEY, JSON.stringify(getQuickData())); }
      catch (e) { /* 私密視窗或封鎖儲存時略過 */ }
    }

    function refreshQuickProgress() {
      var answered = Object.keys(getQuickData()).length;
      var total = quickQuestions.length;
      var percent = total ? Math.round(answered / total * 100) : 0;
      if (quickProgressBar) quickProgressBar.style.width = percent + "%";
      if (quickProgressLabel) quickProgressLabel.textContent = answered + " / " + total + " 題完成";
      if (quickProgress) quickProgress.setAttribute("aria-valuenow", String(answered));
      return answered;
    }

    function quickScores() {
      var data = getQuickData();
      if (Object.keys(data).length !== quickQuestions.length) return null;
      var scores = {};
      quickAxes.forEach(function (axis) {
        scores[axis.id] = axis.questions.reduce(function (sum, name) { return sum + data[name]; }, 0);
      });
      return scores;
    }

    function quickLevel(score) {
      if (score >= 8) return "目前較具體";
      if (score >= 5) return "值得再寫";
      return "優先補強";
    }

    function renderQuickResult(shouldFocus) {
      var scores = quickScores();
      if (!scores) return false;
      var lowestScore = 11;
      quickAxes.forEach(function (axis) {
        var score = scores[axis.id];
        lowestScore = Math.min(lowestScore, score);
        var scoreEl = document.getElementById("quick-score-" + axis.id);
        var levelEl = document.getElementById("quick-level-" + axis.id);
        var barEl = document.getElementById("quick-bar-" + axis.id);
        var barWrap = barEl ? barEl.parentElement : null;
        if (scoreEl) scoreEl.textContent = score + " / 10";
        if (levelEl) levelEl.textContent = quickLevel(score);
        if (barEl) barEl.style.width = (score * 10) + "%";
        if (barWrap) barWrap.setAttribute("aria-valuenow", String(score));
      });
      var lowestAxes = quickAxes.filter(function (axis) { return scores[axis.id] === lowestScore; });
      var first = lowestAxes[0];
      if (quickNextTitle) quickNextTitle.textContent = "優先釐清：" + lowestAxes.map(function (axis) { return axis.title; }).join("、");
      if (quickNextCopy) quickNextCopy.textContent = first.copy + (lowestAxes.length > 1 ? " 其他同分面向也可以接著處理。" : "");
      if (quickNextLink) {
        quickNextLink.href = first.href;
        quickNextLink.textContent = first.link;
      }
      if (quickResult) {
        quickResult.hidden = false;
        if (shouldFocus) quickResult.focus();
      }
      return true;
    }

    try {
      var quickSaved = JSON.parse(localStorage.getItem(QUICK_KEY) || "{}");
      if (quickSaved && typeof quickSaved === "object" && !Array.isArray(quickSaved)) {
        quickQuestions.forEach(function (question) {
          var name = question.getAttribute("data-name");
          var value = quickSaved[name];
          if (!Number.isInteger(value) || value < 1 || value > 5) return;
          var input = question.querySelector('input[value="' + value + '"]');
          if (input) input.checked = true;
        });
      }
    } catch (e) { /* 無效或無法讀取的資料不套用 */ }

    quickInputs.forEach(function (input) {
      input.addEventListener("change", function () {
        saveQuick();
        refreshQuickProgress();
        setQuickStatus("已存在這台裝置，不會上傳");
        if (quickScores()) renderQuickResult(false);
      });
    });

    quickForm.addEventListener("submit", function (event) {
      event.preventDefault();
      var answered = refreshQuickProgress();
      if (answered !== quickQuestions.length) {
        setQuickStatus("還有 " + (quickQuestions.length - answered) + " 題未作答");
        var firstMissing = quickQuestions.find(function (question) { return !question.querySelector('input[type="radio"]:checked'); });
        var firstInput = firstMissing ? firstMissing.querySelector('input[type="radio"]') : null;
        if (firstInput) firstInput.focus();
        return;
      }
      setQuickStatus("結果只供自我反思，不是心理診斷");
      renderQuickResult(true);
    });

    var quickClear = document.getElementById("quick-clear");
    if (quickClear) quickClear.addEventListener("click", function () {
      if (!confirm("清除快思版的 8 題答案？此動作無法復原。")) return;
      quickInputs.forEach(function (input) { input.checked = false; });
      try { localStorage.removeItem(QUICK_KEY); } catch (e) {}
      if (quickResult) quickResult.hidden = true;
      refreshQuickProgress();
      setQuickStatus("快思答案已清除");
      quickClear.focus();
    });

    quickExportLines = function () {
      var scores = quickScores();
      var lines = ["快思版四面向（自我反思，非心理診斷）"];
      if (!scores) {
        lines.push("尚未完成（" + refreshQuickProgress() + " / " + quickQuestions.length + " 題）", "");
        return lines;
      }
      quickAxes.forEach(function (axis) { lines.push(axis.title + "：" + scores[axis.id] + " / 10（" + quickLevel(scores[axis.id]) + "）"); });
      lines.push(quickNextTitle ? quickNextTitle.textContent : "", "");
      return lines;
    };

    refreshQuickProgress();
    renderQuickResult(false);
  }

  // ---------- D+ 匿名彙總量測（固定類別，不送頁面、識別碼或自由文字） ----------
  var DPLUS_METRIC_KEYS = [
    "route_opened",
    "official_source_opened",
    "task_test_started",
    "task_find_route_success_30s",
    "task_evidence_understood",
    "task_help_route_correct",
    "task_test_completed"
  ];

  function getPublicApiBaseUrl() {
    var config = window.WHV_API_CONFIG;
    if (!config || typeof config.apiBaseUrl !== "string" || !config.apiBaseUrl) return "";
    try {
      var url = new URL(config.apiBaseUrl);
      var loopback = (url.hostname === "127.0.0.1" || url.hostname === "localhost") && location.hostname === url.hostname;
      if (url.protocol !== "https:" && !(url.protocol === "http:" && loopback)) return "";
      if (url.username || url.password || url.search || url.hash || (url.pathname && url.pathname !== "/")) return "";
      return url.origin;
    } catch (e) { return ""; }
  }

  function sendDplusMetric(metricKey) {
    if (DPLUS_METRIC_KEYS.indexOf(metricKey) === -1) return Promise.resolve(false);
    var apiBaseUrl = getPublicApiBaseUrl();
    if (!apiBaseUrl) return Promise.resolve(false);
    return fetch(apiBaseUrl + "/api/metrics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ metricKey: metricKey }),
      credentials: "omit",
      referrerPolicy: "no-referrer",
      keepalive: true
    }).then(function (response) {
      if (!response.ok) return false;
      return response.json().then(function (result) {
        return !!(result && result.ok === true && result.accepted === true);
      }, function () { return false; });
    }, function () { return false; });
  }

  document.addEventListener("click", function (event) {
    var clicked = event.target instanceof Element ? event.target : null;
    if (!clicked) return;
    var routeLink = clicked.closest("a.support-link, .home-page a.card");
    if (routeLink) {
      sendDplusMetric("route_opened");
      return;
    }
    var sourceLink = clicked.closest(".fact-meta a, .evidence-card__meta a, .evidence-card__basis a");
    if (sourceLink) sendDplusMetric("official_source_opened");
  });

  var dplusTaskStart = document.getElementById("dplus-task-start");
  var dplusTaskQuestions = document.getElementById("dplus-task-questions");
  var dplusTaskFinish = document.getElementById("dplus-task-finish");
  var dplusTaskStatus = document.getElementById("dplus-task-status");
  var dplusTaskResult = document.getElementById("dplus-task-result");
  var dplusResultRoute = document.getElementById("dplus-result-route");
  var dplusResultEvidence = document.getElementById("dplus-result-evidence");
  var dplusResultHelp = document.getElementById("dplus-result-help");
  var dplusTaskStartedAt = null;

  if (dplusTaskStart && dplusTaskQuestions && dplusTaskFinish && dplusTaskStatus && dplusTaskResult) {
    dplusTaskStart.hidden = false;
    dplusTaskStart.addEventListener("click", function () {
      if (dplusTaskStartedAt !== null) return;
      dplusTaskStartedAt = performance.now();
      dplusTaskQuestions.hidden = false;
      dplusTaskStart.disabled = true;
      dplusTaskStatus.textContent = "測試進行中；答案與計時只存在這個頁面。";
      sendDplusMetric("task_test_started");
      var firstChoice = dplusTaskQuestions.querySelector('input[type="radio"]');
      if (firstChoice) firstChoice.focus();
    });

    dplusTaskFinish.addEventListener("click", function () {
      var routeAnswer = dplusTaskQuestions.querySelector('input[name="dplus-route"]:checked');
      var evidenceAnswer = dplusTaskQuestions.querySelector('input[name="dplus-evidence"]:checked');
      var helpAnswer = dplusTaskQuestions.querySelector('input[name="dplus-help"]:checked');
      if (!routeAnswer || !evidenceAnswer || !helpAnswer) {
        dplusTaskStatus.textContent = "請先完成三題；不想繼續也可以直接離開。";
        var firstMissing = !routeAnswer ? 'input[name="dplus-route"]' : (!evidenceAnswer ? 'input[name="dplus-evidence"]' : 'input[name="dplus-help"]');
        var missingChoice = dplusTaskQuestions.querySelector(firstMissing);
        if (missingChoice) missingChoice.focus();
        return;
      }

      var elapsedMilliseconds = dplusTaskStartedAt === null ? Number.POSITIVE_INFINITY : performance.now() - dplusTaskStartedAt;
      var routeCorrect = routeAnswer.value === "urgent-housing";
      var routeWithinThirtySeconds = routeCorrect && elapsedMilliseconds <= 30000;
      var evidenceCorrect = evidenceAnswer.value === "source-date-status";
      var helpCorrect = helpAnswer.value === "omara";
      dplusTaskFinish.disabled = true;

      dplusResultRoute.textContent = routeCorrect
        ? "找路：正確；你選到首頁的緊急住宿安全出口（本頁計時 " + (elapsedMilliseconds / 1000).toFixed(1) + " 秒）。"
        : "找路：先回首頁選「今晚沒地方住」的安全出口，不要只等陌生人私訊。";
      dplusResultEvidence.textContent = evidenceCorrect
        ? "依據：正確；官方來源、查核日期與編輯狀態都應該能回查。"
        : "依據：高風險內容不能只看語氣或分享數，要回查來源、日期與編輯狀態。";
      dplusResultHelp.textContent = helpCorrect
        ? "求助：正確；個人移民建議應從 OMARA 名冊查驗合格專業人士。"
        : "求助：本站不替你選個人簽證方案；請從 OMARA 名冊查驗合格專業人士。";
      dplusTaskResult.hidden = false;

      var metricRequests = [];
      if (routeWithinThirtySeconds) metricRequests.push(sendDplusMetric("task_find_route_success_30s"));
      if (evidenceCorrect) metricRequests.push(sendDplusMetric("task_evidence_understood"));
      if (helpCorrect) metricRequests.push(sendDplusMetric("task_help_route_correct"));
      metricRequests.push(sendDplusMetric("task_test_completed"));

      if (!getPublicApiBaseUrl()) {
        dplusTaskStatus.textContent = "本機結果已完成；D+ 尚未啟用，沒有送出計數。";
      } else {
        dplusTaskStatus.textContent = "本機結果已完成；正在確認匿名彙總計數是否被後端接受。";
        Promise.all(metricRequests).then(function (accepted) {
          dplusTaskStatus.textContent = accepted.every(Boolean)
            ? "本機結果已完成；後端已接受固定類別的匿名彙總計數。"
            : "本機結果已完成；部分匿名彙總計數未確認，不影響你的結果或網站使用。";
        });
      }
    });
  }

  // ---------- 私人合作需求單（只在 about.html 生效） ----------
  var briefForm = document.getElementById("contact-brief");
  if (briefForm) {
    var briefEmail = document.getElementById("brief-email");
    var briefType = document.getElementById("brief-type");
    var briefName = document.getElementById("brief-name");
    var briefOrganization = document.getElementById("brief-organization");
    var briefTiming = document.getElementById("brief-timing");
    var briefBudget = document.getElementById("brief-budget");
    var briefProblem = document.getElementById("brief-problem");
    var briefOutcome = document.getElementById("brief-outcome");
    var briefOutput = document.getElementById("brief-output");
    var briefPreview = document.getElementById("brief-preview");
    var briefGmailLink = document.getElementById("brief-gmail-link");
    var briefEmailLink = document.getElementById("brief-email-link");
    var briefCopy = document.getElementById("brief-copy");
    var briefStatus = document.getElementById("brief-status");
    var briefSubmitOnline = document.getElementById("brief-submit-online");
    var contactServiceState = document.getElementById("contact-service-state");
    var briefStorageBoundary = document.getElementById("brief-storage-boundary");
    var contactReceipt = document.getElementById("contact-receipt");
    var contactReceiptId = document.getElementById("contact-receipt-id");
    var contactReceiptTime = document.getElementById("contact-receipt-time");
    var contactReceiptEmail = document.getElementById("contact-receipt-email");
    var contactManageLink = document.getElementById("contact-manage-link");
    var contactManageCase = document.getElementById("contact-manage-case");
    var contactManageToken = document.getElementById("contact-manage-token");
    var contactManageView = document.getElementById("contact-manage-view");
    var contactManageUpdate = document.getElementById("contact-manage-update");
    var contactManageDelete = document.getElementById("contact-manage-delete");
    var contactManageStatus = document.getElementById("contact-manage-status");
    var briefTurnstile = document.getElementById("brief-turnstile");
    var manageTurnstile = document.getElementById("manage-turnstile");

    var REQUEST_TYPE_CODES = {
      "客製課程、講座或工作坊": "course-workshop",
      "網站與數位工具": "website-digital-tool",
      "內容、資料或社群合作": "content-data-community",
      "其他合作": "other-collaboration"
    };
    var REQUEST_TYPE_LABELS = {
      "course-workshop": "客製課程、講座或工作坊",
      "website-digital-tool": "網站與數位工具",
      "content-data-community": "內容、資料或社群合作",
      "other-collaboration": "其他合作"
    };
    var BUDGET_LABELS = {
      "": "未提供",
      "not-sure": "還不確定，想先談範圍",
      "under-1000-aud": "AUD 1,000 以下",
      "1000-3000-aud": "AUD 1,000–3,000",
      "3000-10000-aud": "AUD 3,000–10,000",
      "over-10000-aud": "AUD 10,000 以上"
    };

    function setBriefStatus(message) {
      if (briefStatus) briefStatus.textContent = message;
    }

    function makeBrief() {
      var type = briefType.value.trim();
      var timing = briefTiming.value.trim() || "未特別指定";
      var name = briefName.value.trim() || "未提供";
      var organization = briefOrganization.value.trim() || "未提供";
      var budget = BUDGET_LABELS[briefBudget.value] || "未提供";
      var problem = briefProblem.value.trim();
      var outcome = briefOutcome.value.trim();
      return [
        "Jason 您好：",
        "",
        "聯絡 Email：" + briefEmail.value.trim(),
        "姓名或稱呼：" + name,
        "組織／團隊：" + organization,
        "需求類型：" + type,
        "希望時間：" + timing,
        "預算區間：" + budget,
        "",
        "目前卡點：",
        problem,
        "",
        "希望結果：",
        outcome,
        "",
        "我知道本站不提供簽證或移民代辦；這只是初步需求，是否承接、工作範圍、費用與交付都要另行確認，送出不代表委託成立或保證處理。"
      ].join("\n");
    }

    function makeDescription() {
      return [
        "目前卡點：",
        briefProblem.value.trim(),
        "",
        "希望結果：",
        briefOutcome.value.trim()
      ].join("\n");
    }

    function makeContactPayload(turnstileToken) {
      return {
        email: briefEmail.value.trim(),
        requestType: REQUEST_TYPE_CODES[briefType.value.trim()] || "",
        description: makeDescription(),
        contactName: briefName.value.trim() || null,
        organization: briefOrganization.value.trim() || null,
        timeline: briefTiming.value.trim() || null,
        budgetRange: briefBudget.value || null,
        locale: "zh-Hant",
        turnstileToken: turnstileToken,
        boundaryAccepted: document.getElementById("brief-boundary").checked
      };
    }

    briefForm.addEventListener("submit", function (event) {
      event.preventDefault();
      if (!briefForm.checkValidity()) {
        briefForm.reportValidity();
        setBriefStatus("請先完成必填欄位與服務邊界確認");
        return;
      }
      var briefText = makeBrief();
      var subject = "[合作詢問] " + briefType.value.trim();
      briefPreview.value = briefText;
      briefGmailLink.href = "https://mail.google.com/mail/?view=cm&fs=1&to=" + encodeURIComponent("chunaenqiu6@gmail.com") + "&su=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(briefText);
      briefEmailLink.href = "mailto:chunaenqiu6@gmail.com?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(briefText);
      briefOutput.hidden = false;
      setBriefStatus("需求單已整理好；請再次確認未放入簽證、移民或其他敏感個案資料，再由你選擇方式寄出");
      briefGmailLink.focus();
    });

    if (briefCopy) briefCopy.addEventListener("click", function () {
      if (!briefPreview.value) {
        setBriefStatus("請先產生需求單");
        return;
      }
      var copied = function () { setBriefStatus("需求單已複製，可以貼到任何信箱"); };
      var copyFailed = function () {
        briefPreview.focus();
        briefPreview.select();
        setBriefStatus("無法自動複製，已替你選取文字，請手動複製");
      };
      try {
        if (!navigator.clipboard || !navigator.clipboard.writeText) { copyFailed(); return; }
        navigator.clipboard.writeText(briefPreview.value).then(copied, copyFailed);
      } catch (e) { copyFailed(); }
    });

    function getApiSettings() {
      var config = window.WHV_API_CONFIG;
      var apiBaseUrl = getPublicApiBaseUrl();
      if (!apiBaseUrl || !config || typeof config.turnstileSiteKey !== "string") return null;
      if (!config.turnstileSiteKey || config.turnstileSiteKey.length > 100) return null;
      return { baseUrl: apiBaseUrl, siteKey: config.turnstileSiteKey };
    }

    function loadTurnstile() {
      if (window.turnstile && window.turnstile.render) return Promise.resolve(window.turnstile);
      return new Promise(function (resolve, reject) {
        var existing = document.getElementById("turnstile-api-script");
        var script = existing || document.createElement("script");
        function loaded() {
          if (window.turnstile && window.turnstile.render) resolve(window.turnstile);
          else reject(new Error("turnstile_not_ready"));
        }
        script.addEventListener("load", loaded, { once: true });
        script.addEventListener("error", function () { reject(new Error("turnstile_load_failed")); }, { once: true });
        if (!existing) {
          script.id = "turnstile-api-script";
          script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
          script.async = true;
          script.defer = true;
          script.referrerPolicy = "no-referrer";
          document.head.appendChild(script);
        }
      });
    }

    function setManageStatus(message) {
      if (contactManageStatus) contactManageStatus.textContent = message;
    }

    function safeErrorMessage(result, fallback) {
      if (result && result.error && typeof result.error.message === "string" && result.error.message.length <= 160) return result.error.message;
      return fallback;
    }

    function readJsonResponse(response) {
      return response.json().catch(function () { return null; }).then(function (result) {
        if (!response.ok || !result || result.ok !== true) {
          throw new Error(safeErrorMessage(result, "服務暫時無法處理，請使用 Email／複製備援。"));
        }
        return result;
      });
    }

    function apiPost(settings, path, payload) {
      return fetch(settings.baseUrl + path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        credentials: "omit",
        referrerPolicy: "no-referrer"
      }).then(readJsonResponse);
    }

    function parseManagementFragment(fragment) {
      var prefix = "#contact-management?";
      if (fragment.indexOf(prefix) !== 0) return null;
      var params = new URLSearchParams(fragment.slice(prefix.length));
      var caseId = params.get("case") || "";
      var token = params.get("token") || "";
      if (!/^WHV-[0-9A-F]{32}$/.test(caseId) || !/^[A-Za-z0-9_-]{40,100}$/.test(token)) return null;
      return { caseId: caseId, token: token };
    }

    function fillManagementCredentials(credentials) {
      contactManageCase.value = credentials.caseId;
      contactManageToken.value = credentials.token;
    }

    var fragmentCredentials = parseManagementFragment(location.hash);
    if (fragmentCredentials) {
      fillManagementCredentials(fragmentCredentials);
      history.replaceState(null, "", location.pathname + location.search + "#contact-management");
    }

    var apiSettings = getApiSettings();
    var submitWidgetId = null;
    var manageWidgetId = null;
    if (apiSettings) {
      loadTurnstile().then(function (turnstile) {
        briefTurnstile.hidden = false;
        manageTurnstile.hidden = false;
        submitWidgetId = turnstile.render(briefTurnstile, {
          sitekey: apiSettings.siteKey,
          action: "turnstile-spin-v2",
          appearance: "interaction-only"
        });
        manageWidgetId = turnstile.render(manageTurnstile, {
          sitekey: apiSettings.siteKey,
          action: "turnstile-spin-v2",
          appearance: "interaction-only"
        });
        briefSubmitOnline.hidden = false;
        contactManageView.disabled = false;
        contactManageUpdate.disabled = false;
        contactManageDelete.disabled = false;
        contactServiceState.textContent = "站內安全送出已啟用：資料會送到本站 Worker，儲存在私人 CRM；一般詢問於結案或最後聯絡後 24 個月刪除。";
        briefStorageBoundary.textContent = "選擇站內安全送出時，表單內容會送到本站 Worker 並儲存在私人 CRM；選擇 Email／複製備援時，本站不接收內容。";
        setManageStatus("可使用案件編號與管理憑證查閱、更正或永久刪除；每次操作都需要重新驗證。");
      }).catch(function () {
        setBriefStatus("防濫用驗證載入失敗；站內送出未啟用，仍可使用 Email／複製備援");
      });
    }

    function getWidgetToken(widgetId) {
      if (!window.turnstile || widgetId === null) return "";
      return window.turnstile.getResponse(widgetId) || "";
    }

    function resetWidget(widgetId) {
      if (window.turnstile && widgetId !== null) window.turnstile.reset(widgetId);
    }

    if (briefSubmitOnline) briefSubmitOnline.addEventListener("click", function () {
      if (!apiSettings || submitWidgetId === null) {
        setBriefStatus("站內安全送出尚未啟用，請使用 Email／複製備援");
        return;
      }
      if (!briefForm.checkValidity()) {
        briefForm.reportValidity();
        setBriefStatus("請先完成必填欄位與服務邊界確認");
        return;
      }
      var token = getWidgetToken(submitWidgetId);
      if (!token) {
        setBriefStatus("請先完成防濫用驗證");
        return;
      }
      briefSubmitOnline.disabled = true;
      setBriefStatus("正在安全送出；收到後端回執前不會顯示完成");
      apiPost(apiSettings, "/api/contact", makeContactPayload(token)).then(function (result) {
        contactReceiptId.textContent = result.caseId;
        contactReceiptTime.textContent = new Date(result.receivedAt).toLocaleString("zh-TW");
        contactReceiptEmail.textContent = result.emailStatus === "sent" ? "確認信已由寄信介面接受" : "需求已收件；確認信排程等待重試";
        var credentials = parseManagementFragment(new URL(result.managementUrl).hash);
        if (credentials) {
          fillManagementCredentials(credentials);
          contactManageLink.href = result.managementUrl;
        } else {
          contactManageLink.removeAttribute("href");
        }
        contactReceipt.hidden = false;
        contactReceipt.focus();
        setBriefStatus("後端已回傳案件編號；請保存回執，通常 3–5 個工作天回覆");
      }).catch(function (error) {
        setBriefStatus(error.message + " 需求預覽仍留在本頁，可改用 Email 或複製。");
      }).then(function () {
        briefSubmitOnline.disabled = false;
        resetWidget(submitWidgetId);
      });
    });

    function managementPayload(token) {
      return {
        caseId: contactManageCase.value.trim(),
        managementToken: contactManageToken.value.trim(),
        turnstileToken: token
      };
    }

    function requireManagementToken() {
      var token = getWidgetToken(manageWidgetId);
      if (!contactManageCase.value.trim() || !contactManageToken.value.trim()) {
        setManageStatus("請提供案件編號與管理憑證");
        return "";
      }
      if (!token) {
        setManageStatus("請先完成防濫用驗證");
        return "";
      }
      return token;
    }

    function fillContactForm(contactCase) {
      briefEmail.value = contactCase.email || "";
      briefType.value = REQUEST_TYPE_LABELS[contactCase.requestType] || "";
      briefName.value = contactCase.contactName || "";
      briefOrganization.value = contactCase.organization || "";
      briefTiming.value = contactCase.timeline || "";
      briefBudget.value = contactCase.budgetRange || "";
      var parts = String(contactCase.description || "").split("\n\n希望結果：\n");
      briefProblem.value = parts[0].replace(/^目前卡點：\n/, "");
      briefOutcome.value = parts.length > 1 ? parts.slice(1).join("\n\n希望結果：\n") : "請在這裡補上希望結果";
    }

    if (contactManageView) contactManageView.addEventListener("click", function () {
      if (!apiSettings) return;
      var token = requireManagementToken();
      if (!token) return;
      contactManageView.disabled = true;
      setManageStatus("正在查閱；資料只會顯示在本頁，不會寫入瀏覽器儲存空間");
      apiPost(apiSettings, "/api/contact/manage", managementPayload(token)).then(function (result) {
        fillContactForm(result.case);
        setManageStatus("已載入需求內容到上方表單；修改後可選擇「用上方內容更正」");
      }).catch(function (error) {
        setManageStatus(error.message);
      }).then(function () {
        contactManageView.disabled = false;
        resetWidget(manageWidgetId);
      });
    });

    if (contactManageUpdate) contactManageUpdate.addEventListener("click", function () {
      if (!apiSettings) return;
      if (!briefForm.checkValidity()) {
        briefForm.reportValidity();
        setManageStatus("請先完成上方必填欄位與服務邊界確認");
        return;
      }
      var token = requireManagementToken();
      if (!token) return;
      var payload = makeContactPayload(token);
      payload.caseId = contactManageCase.value.trim();
      payload.managementToken = contactManageToken.value.trim();
      contactManageUpdate.disabled = true;
      setManageStatus("正在更正；收到後端回執前不會顯示完成");
      apiPost(apiSettings, "/api/contact/update", payload).then(function (result) {
        setManageStatus("需求已更正；後端更新時間：" + new Date(result.updatedAt).toLocaleString("zh-TW"));
      }).catch(function (error) {
        setManageStatus(error.message);
      }).then(function () {
        contactManageUpdate.disabled = false;
        resetWidget(manageWidgetId);
      });
    });

    if (contactManageDelete) contactManageDelete.addEventListener("click", function () {
      if (!apiSettings) return;
      var token = requireManagementToken();
      if (!token) return;
      if (!confirm("確定永久刪除這筆需求嗎？刪除後無法復原，Jason 也無法再從 CRM 查閱。")) return;
      contactManageDelete.disabled = true;
      setManageStatus("正在刪除；收到後端回執前不會顯示完成");
      apiPost(apiSettings, "/api/contact/delete", managementPayload(token)).then(function () {
        contactManageCase.value = "";
        contactManageToken.value = "";
        setManageStatus("後端已確認永久刪除這筆需求");
      }).catch(function (error) {
        setManageStatus(error.message);
      }).then(function () {
        contactManageDelete.disabled = false;
        resetWidget(manageWidgetId);
      });
    });
  }

  // ---------- 自我釐清工作表（只在 why.html 生效） ----------
  var form = document.getElementById("worksheet");
  if (!form) return;

  var KEY = "whv-worksheet-v1";
  var statusEl = document.getElementById("ws-status");
  var fields = Array.prototype.slice.call(form.querySelectorAll("textarea"));

  function setStatus(msg) {
    if (!statusEl) return;
    statusEl.textContent = msg;
    clearTimeout(setStatus._t);
    setStatus._t = setTimeout(function () { statusEl.textContent = ""; }, 3000);
  }

  // 讀回上次的答案（localStorage 只存在你自己的瀏覽器，不會上傳）
  try {
    var saved = JSON.parse(localStorage.getItem(KEY) || "{}");
    fields.forEach(function (f) {
      if (saved[f.id]) f.value = saved[f.id];
    });
  } catch (e) { /* 私密視窗或封鎖儲存時略過 */ }

  var saveTimer;
  function save() {
    try {
      var data = {};
      fields.forEach(function (f) { data[f.id] = f.value; });
      localStorage.setItem(KEY, JSON.stringify(data));
    } catch (e) { /* 儲存被封鎖時忽略 */ }
  }
  fields.forEach(function (f) {
    f.addEventListener("input", function () {
      clearTimeout(saveTimer);
      saveTimer = setTimeout(function () { save(); setStatus("已自動儲存在你的瀏覽器"); }, 600);
    });
  });

  // 匯出成純文字檔
  var exportBtn = document.getElementById("ws-export");
  if (exportBtn) {
    exportBtn.addEventListener("click", function () {
      var lines = ["我的澳洲打工度假自我釐清表", "產生日期：" + new Date().toLocaleDateString("zh-TW"), ""];
      lines = lines.concat(quickExportLines());
      lines.push("慢想版工作表", "");
      form.querySelectorAll(".worksheet-q").forEach(function (q) {
        var label = q.querySelector("label");
        var ta = q.querySelector("textarea");
        if (!label || !ta) return;
        lines.push("■ " + label.textContent.trim());
        lines.push(ta.value.trim() ? ta.value.trim() : "（尚未填寫）");
        lines.push("");
      });
      var blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
      var a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "我的打工度假自我釐清表.txt";
      document.body.appendChild(a);
      a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
      setStatus("已匯出 .txt 檔");
    });
  }

  // 清空
  var clearBtn = document.getElementById("ws-clear");
  if (clearBtn) {
    clearBtn.addEventListener("click", function () {
      if (!confirm("確定要清空所有答案嗎？此動作無法復原。")) return;
      fields.forEach(function (f) { f.value = ""; });
      try { localStorage.removeItem(KEY); } catch (e) {}
      setStatus("已清空");
    });
  }
})();
