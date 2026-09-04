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
  // 熱門 chip 直接綁錨點，不經過搜尋；首頁 #search 的 chip-row 與這裡必須一致（check.ps1 比對）。
  var SEARCH_HOT_LINKS = [
    ["work.html#verify", "這工合法嗎"],
    ["visa.html#counting", "88天怎麼算"],
    ["housing.html#bond", "押金先給嗎"],
    ["prep.html#first-week", "三大號順序"],
    ["english.html#reality", "英文很爛"],
    ["cost.html#budget", "要帶多少錢"],
    ["lang/en/visa/#choose", "462抽籤"],
    ["health.html#insurance", "保險買哪邊"]
  ];
  // 零結果時的出口，依序：4 個階段 chip（id 與 JOURNEY_ORDER 同源）、安全列 5 個入口（與 index.html nav#support-hub 同序）。
  var SEARCH_STAGE_LINKS = [
    ["index.html#considering", "還在考慮"],
    ["index.html#committed", "決定要去"],
    ["index.html#in-australia", "已在澳洲"],
    ["index.html#next-step", "回程或留下"]
  ];
  var SEARCH_SAFETY_LINKS = [
    ["health.html#emergency", "受傷"],
    ["scam.html#help", "剛匯款"],
    ["scam.html#help", "被威脅或扣證件"],
    ["visa.html#apply", "簽證到期"],
    ["housing.html#housing-search-tool", "今晚沒地方住"]
  ];
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
    + '<div class="site-search-quick" aria-label="熱門問題">'
    + '<span>直接跳到：</span>'
    + SEARCH_HOT_LINKS.map(function (item) { return '<a class="chip" href="' + item[0] + '">' + item[1] + '</a>'; }).join("")
    + '</div>'
    + '<p class="site-search-privacy">搜尋在這台裝置內完成，不會把查詢送到本站或搜尋引擎，也不會保存搜尋紀錄。</p>'
    + '<p class="site-search-status" id="site-search-status" role="status" aria-live="polite">輸入一個主題，或先點熱門問題。</p>'
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
  // ==== search-core:start ====
  // 純函式、不碰 DOM。scripts/test_search.mjs 以這兩個標記把這段抽出來在 Node 執行，
  // 瀏覽器與驗收測試因此永遠用同一份演算法（OPTIMIZATION_PLAN P0-9 實作 1–3）。
  // 疑問詞／語助詞：正規化後由長到短移除；移除後才跑 AND 比對，仍零結果才降級到二字詞 OR。
  var SEARCH_STOP_WORDS = ["要注意什麼", "要怎麼辦", "怎麼辦", "要幾天", "要多久", "注意什麼", "可以嗎", "是什麼", "什麼", "怎麼", "如何", "哪裡", "哪些", "多少", "幾天", "多久", "可以", "應該", "需要", "注意", "很爛", "很差", "不好", "太", "了", "嗎", "呢", "要", "我", "的"];
  // 權重 provenance：原詞（標題／頁名／內文）1.0；同義詞（索引 synonyms／keywords 欄位）0.7；
  // 入口段（quick-answers、evidence-card、首頁出口卡，索引 hub=1）的標題與內文只算導引語，純同義詞命中再乘 0.5。
  var SEARCH_SYNONYM_WEIGHT = 0.7;
  var SEARCH_HUB_SYNONYM_WEIGHT = 0.5;

  var normalizeSearch = function (value) {
    var normalized = String(value || "").toLowerCase();
    try { normalized = normalized.normalize("NFKC"); } catch (e) {}
    return normalized.replace(/[\s\-_.,，。！？!?、/\\()（）:：;；'"“”‘’]+/g, "");
  };

  var splitSearchTokens = function (query) {
    return String(query || "").trim().toLowerCase().split(/\s+/).map(normalizeSearch).filter(Boolean);
  };

  var rewriteSearchQuery = function (query) {
    var original = splitSearchTokens(query);
    var rewritten = [];
    original.forEach(function (token) {
      var value = token;
      SEARCH_STOP_WORDS.forEach(function (word) { value = value.split(word).join(" "); });
      value.split(" ").forEach(function (part) { if (part) rewritten.push(part); });
    });
    return { original: original, rewritten: rewritten, changed: rewritten.join(" ") !== original.join(" ") };
  };

  var searchFields = function (entry) {
    return {
      title: normalizeSearch(entry.title),
      pageTitle: normalizeSearch(entry.pageTitle),
      text: normalizeSearch(entry.text),
      keywords: normalizeSearch(entry.keywords),
      synonyms: normalizeSearch(entry.synonyms),
      overview: entry.title === "本頁總覽",
      hub: entry.hub === 1
    };
  };

  var searchTokenScore = function (fields, needle) {
    var original = 0;
    var synonym = 0;
    if (fields.title === needle) original = 140;
    else if (fields.title.indexOf(needle) >= 0) original = 95;
    if (fields.overview) {
      if (fields.pageTitle === needle) original = Math.max(original, 110);
      else if (fields.pageTitle.indexOf(needle) >= 0) original = Math.max(original, 72);
    }
    if (fields.text.indexOf(needle) >= 0) original = Math.max(original, 24);
    if (fields.hub && original) original = original >= 95 ? 49 : 17;
    if (fields.synonyms.indexOf(needle) >= 0) synonym = 80;
    if (fields.keywords.indexOf(needle) >= 0) synonym = Math.max(synonym, 42);
    synonym = synonym * SEARCH_SYNONYM_WEIGHT;
    return { original: original, synonym: synonym };
  };

  // wholes：整句加分的候選（使用者原句、改寫後的串接），取最高者；tokens 已正規化。
  var searchEntries = function (entries, tokens, wholes) {
    var candidates = (wholes || []).concat([tokens.join("")]).filter(function (value, index, list) {
      return value && list.indexOf(value) === index;
    });
    var wholeBonus = function (fields) {
      var bonus = 0;
      var expanded = fields.synonyms + " " + fields.keywords;
      candidates.forEach(function (whole) {
        var value = 0;
        if (fields.hub) {
          if ((fields.title + fields.text + expanded).indexOf(whole) >= 0) value = 14;
        } else if (fields.title.indexOf(whole) >= 0) value = 80;
        else if (fields.overview && fields.pageTitle.indexOf(whole) >= 0) value = 55;
        else if (fields.text.indexOf(whole) >= 0) value = 20;
        else if (expanded.indexOf(whole) >= 0) value = 14;
        bonus = Math.max(bonus, value);
      });
      return bonus;
    };
    return entries.map(function (entry, order) {
      var fields = searchFields(entry);
      var score = 0;
      var originalHits = 0;
      for (var i = 0; i < tokens.length; i++) {
        var hit = searchTokenScore(fields, tokens[i]);
        var best = Math.max(hit.original, hit.synonym);
        if (!best) return null;
        if (hit.original) originalHits += 1;
        score += best;
      }
      if (fields.hub && !originalHits) score = score * SEARCH_HUB_SYNONYM_WEIGHT;
      score += wholeBonus(fields);
      return { entry: entry, score: score, order: order };
    }).filter(Boolean).sort(function (a, b) {
      return b.score - a.score || a.order - b.order;
    });
  };

  // 降級：二字詞 OR 比對，命中過半才算；只在 AND 比對零結果時使用（原型 search-fallback-proto.js 驗證 5/5）。
  var searchApproximate = function (entries, tokens) {
    var grams = [];
    var seen = {};
    var add = function (gram) { if (!seen[gram]) { seen[gram] = true; grams.push(gram); } };
    tokens.forEach(function (token) {
      if (token.length <= 2) add(token);
      for (var i = 0; i + 2 <= token.length; i++) add(token.slice(i, i + 2));
    });
    var needed = Math.max(1, Math.ceil(grams.length / 2));
    return entries.map(function (entry, order) {
      var fields = searchFields(entry);
      var score = 0;
      var hits = 0;
      grams.forEach(function (gram) {
        var best = 0;
        if (fields.title.indexOf(gram) >= 0) best = fields.hub ? 5 : 9;
        else if (fields.overview && fields.pageTitle.indexOf(gram) >= 0) best = 6;
        if (fields.synonyms.indexOf(gram) >= 0 || fields.keywords.indexOf(gram) >= 0) best = Math.max(best, 5);
        if (fields.text.indexOf(gram) >= 0) best = Math.max(best, 2);
        if (best) { hits += 1; score += best; }
      });
      return hits >= needed ? { entry: entry, score: score, order: order } : null;
    }).filter(Boolean).sort(function (a, b) {
      return b.score - a.score || a.order - b.order;
    });
  };

  // mode：exact（原詞 AND）、rewritten（去疑問詞後 AND）、approximate（二字詞 OR 降級）、none。
  var runSiteSearch = function (entries, query) {
    var plan = rewriteSearchQuery(query);
    var tokens = plan.rewritten.length ? plan.rewritten : plan.original;
    if (!tokens.length) return { matches: [], mode: "none", tokens: [] };
    var wholes = [plan.original.join("")];
    var matches = searchEntries(entries, tokens, wholes);
    if (matches.length) return { matches: matches, mode: plan.changed && plan.rewritten.length ? "rewritten" : "exact", tokens: tokens };
    if (plan.changed && plan.rewritten.length) {
      matches = searchEntries(entries, plan.original, wholes);
      if (matches.length) return { matches: matches, mode: "exact", tokens: plan.original };
    }
    matches = searchApproximate(entries, tokens);
    return { matches: matches, mode: matches.length ? "approximate" : "none", tokens: tokens };
  };

  var makeSnippet = function (entry, token) {
    var source = String(entry.text || "").replace(/\s+/g, " ").trim();
    if (!source) return "開啟這一節查看整理內容與官方來源。";
    var at = token ? source.toLowerCase().indexOf(token) : -1;
    var start = at > 48 ? at - 48 : 0;
    var snippet = source.slice(start, start + 150);
    return (start ? "…" : "") + snippet + (start + 150 < source.length ? "…" : "");
  };
  // ==== search-core:end ====

  var loadSearchIndex = function () {
    if (window.WHV_SEARCH_INDEX && Array.isArray(window.WHV_SEARCH_INDEX.entries)) {
      return Promise.resolve(window.WHV_SEARCH_INDEX.entries);
    }
    if (searchLoadPromise) return searchLoadPromise;
    searchLoadPromise = new Promise(function (resolve, reject) {
      var script = document.createElement("script");
      script.src = "assets/search-index.js?v=20260904-51";
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

  var appendSearchLinks = function (parent, className, label, items) {
    var row = document.createElement("div");
    row.className = "site-search-quick " + className;
    row.setAttribute("aria-label", label);
    var lead = document.createElement("span");
    lead.textContent = label;
    row.appendChild(lead);
    items.forEach(function (item) {
      var link = document.createElement("a");
      link.className = "chip";
      link.href = item[0];
      link.textContent = item[1];
      row.appendChild(link);
    });
    parent.appendChild(row);
  };

  var renderSearch = function (entries, query) {
    var cleaned = String(query || "").trim();
    searchResults.textContent = "";
    if (!cleaned) {
      searchStatus.textContent = "輸入一個主題，或先點熱門問題。";
      return;
    }
    var result = runSiteSearch(entries, cleaned);
    var matches = result.matches;
    if (!matches.length) {
      searchStatus.textContent = "找不到符合「" + cleaned + "」的內容。";
      // 零結果狀態順序（P0-9 實作 5）：階段 chip → 安全列 → 問一次 AI（僅在啟用且使用者點擊後）→ GitHub 回報。
      var empty = document.createElement("div");
      empty.className = "site-search-empty";
      var emptyTitle = document.createElement("strong");
      emptyTitle.textContent = "先選你現在的階段，或換一個比較短的關鍵詞";
      var emptyCopy = document.createElement("p");
      emptyCopy.textContent = "例如把「我被老闆拖欠薪水」縮成「欠薪」。很急的事直接走安全出口。";
      empty.appendChild(emptyTitle);
      empty.appendChild(emptyCopy);
      appendSearchLinks(empty, "site-search-stages", "你的階段：", SEARCH_STAGE_LINKS);
      appendSearchLinks(empty, "site-search-safety", "很急？", SEARCH_SAFETY_LINKS);
      var aiSlot = document.createElement("p");
      aiSlot.className = "site-search-ai";
      aiSlot.id = "site-search-ai";
      aiSlot.hidden = true;
      var aiLink = document.createElement("a");
      aiLink.className = "btn secondary";
      aiLink.href = "#assist";
      aiLink.textContent = "問一次 AI";
      aiSlot.appendChild(aiLink);
      empty.appendChild(aiSlot);
      var emptyLink = document.createElement("a");
      emptyLink.className = "btn ghost";
      emptyLink.href = "https://github.com/jason201385-commits/aussie-whv-compass/issues/new?template=idea.yml";
      emptyLink.target = "_blank";
      emptyLink.rel = "noopener noreferrer";
      emptyLink.textContent = "告訴我們缺哪一題";
      empty.appendChild(emptyLink);
      searchResults.appendChild(empty);
    } else {
      var shown = Math.min(matches.length, 8);
      if (result.mode === "approximate") {
        searchStatus.textContent = "沒有完全符合的段落，已用相近詞找到 " + matches.length + " 個，先顯示最接近的 " + shown + " 個。";
      } else if (result.mode === "rewritten") {
        searchStatus.textContent = "已略過「要、嗎、怎麼」這類字，以「" + result.tokens.join(" ") + "」找到 " + matches.length + " 個段落，先顯示最接近的 " + shown + " 個。";
      } else {
        searchStatus.textContent = "找到 " + matches.length + " 個相關段落，先顯示最接近的 " + shown + " 個。";
      }
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
        snippet.textContent = makeSnippet(match.entry, result.tokens[0]);
        link.appendChild(context);
        link.appendChild(title);
        link.appendChild(snippet);
        item.appendChild(link);
        list.appendChild(item);
      });
      searchResults.appendChild(list);
    }
    window.dispatchEvent(new CustomEvent("whv:search", {
      detail: { resultCount: matches.length, topPage: matches.length ? matches[0].entry.page : "none", mode: result.mode }
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
  // 熱門 chip、結果、階段與安全出口都是 <a href>；點了就關閉 dialog，讓瀏覽器照常導向（同頁錨點也適用）。
  searchDialog.addEventListener("click", function (event) {
    var link = event.target.closest ? event.target.closest("a[href]") : null;
    if (link && searchDialog.contains(link)) closeSiteSearch();
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
  }

  // 釐清器底部固定搜尋鈕（P0-8）：有 JS 就開既有搜尋 dialog；無 JS 時是 #search 錨點
  var clarifierSearchOpen = document.getElementById("clarifier-search-open");
  if (clarifierSearchOpen) {
    clarifierSearchOpen.addEventListener("click", function (event) {
      event.preventDefault();
      openSiteSearch("");
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

  // 首頁「續讀／收藏」入口卡（P0-8）：只在最近閱讀或收藏有資料時顯示；顯示規則沿用兩個區塊本身，不另讀儲存空間
  var homeEntryResume = document.getElementById("home-entry-resume");
  var syncHomeEntryResume = function () {
    if (!homeEntryResume) return;
    var resumeSection = document.getElementById("journey-resume");
    var savedSection = document.getElementById("saved-pages");
    var hasResume = !!(resumeSection && !resumeSection.hidden);
    var hasSaved = !!(savedSection && !savedSection.hidden);
    homeEntryResume.hidden = !hasResume && !hasSaved;
    homeEntryResume.setAttribute("href", hasResume ? "#journey-resume" : "#saved-pages");
  };

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
      syncHomeEntryResume();
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
        syncHomeEntryResume();
        resumeClear.addEventListener("click", function () {
          try { localStorage.removeItem(LAST_PAGE_KEY); } catch (e) {}
          resume.hidden = true;
          syncHomeEntryResume();
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
        return;
      }
      var offset = Math.min(window.scrollY || 0, 650);
      hero.style.setProperty("--hero-gold-y", (offset * 0.08).toFixed(1) + "px");
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
      + '<a class="btn ghost" target="_blank" rel="noopener noreferrer" aria-label="留下一句感謝（公開於 GitHub）；另開新頁" href="' + thanksUrl + '">留下一句感謝（公開於 GitHub）</a>'
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

  // ---------- 首頁釐清器：hash 驅動、零儲存 ----------
  // 狀態只存在網址片段與 DOM 屬性；不寫瀏覽器儲存空間、不送出任何選擇。
  var clarifierRoot = document.querySelector("[data-clarifier]");
  if (clarifierRoot) {
    var clarifierPanels = Array.prototype.slice.call(clarifierRoot.querySelectorAll("[data-clarifier-panel]"));
    var clarifierStageLinks = Array.prototype.slice.call(document.querySelectorAll("#journey-map a"));
    var clarifierExits = Array.prototype.slice.call(clarifierRoot.querySelectorAll(".clarifier-exit"));
    var jobQuizSection = document.getElementById("job-quiz");
    var jobQuizApp = document.getElementById("job-quiz-app");
    var jobFamilyItems = Array.prototype.slice.call(document.querySelectorAll("#job-families li[data-job-family]"));
    var clarifierTitle = document.getElementById("clarifier-title");

    var JOB_FAMILY_ORDER = ["farm", "hospitality", "cleaning", "factory", "retail", "office"];
    var JOB_QUIZ = [
      { q: "你想在哪裡工作？", c: [["戶外", ["farm"]], ["店裡或室內", ["hospitality", "cleaning", "factory", "retail"]], ["辦公桌", ["office"]]] },
      { q: "體力活可以嗎？", c: [["很可以", ["farm", "factory", "cleaning"]], ["一點點", ["hospitality", "retail"]], ["盡量少", ["office"]]] },
      { q: "英文口說目前？", c: [["能聊天", ["office", "retail", "hospitality"]], ["簡單句", ["hospitality", "cleaning", "retail"]], ["還在練", ["farm", "factory", "cleaning"]]] },
      { q: "想跟人互動多少？", c: [["很多", ["hospitality", "retail"]], ["一點", ["office", "farm"]], ["越少越好", ["cleaning", "factory"]]] },
      { q: "願意先考證照嗎？", c: [["願意", ["factory", "hospitality"]], ["看情況", ["retail", "office"]], ["不想", ["farm", "cleaning"]]] },
      { q: "願意去偏遠地區嗎？", c: [["願意", ["farm", "farm", "factory"]], ["看情況", ["farm", "hospitality"]], ["想留城市", ["hospitality", "retail", "office", "cleaning"]]] }
    ];
    var quizStep = 0;
    var quizScores = {};

    function setClarifierCurrent(links, href, value) {
      links.forEach(function (a) {
        if (a.getAttribute("href") === href) a.setAttribute("aria-current", value);
        else a.removeAttribute("aria-current");
      });
    }

    function resetClarifierStage() {
      clarifierPanels.forEach(function (panel) { panel.hidden = true; });
      clarifierRoot.dataset.stage = "";
      clarifierStageLinks.forEach(function (a) { a.removeAttribute("aria-current"); });
    }

    function focusClarifierHome() {
      var home = clarifierTitle || clarifierStageLinks[0];
      if (home && typeof home.focus === "function") home.focus();
    }

    function applyHash(hash, focus) {
      var id = (hash || "").slice(1);
      var target = id ? document.getElementById(id) : null;
      var panel = target && target.closest ? target.closest("[data-clarifier-panel]") : null;
      if (!panel) {
        if (target && id === "job-quiz") { openQuiz(focus); return; }
        // 站內其他區塊（#search、#communities、#support-hub…）與小測驗內部的錨點不歸釐清器管，維持現狀。
        if (target && (!clarifierRoot.contains(target) || (jobQuizSection && jobQuizSection.contains(target)))) return;
        // 空片段、#journey-map、#clarifier 與不存在的舊錨點（#self-assessment、#common-problems…）都回到階段問題。
        // 原本有面板開著（例如按上一頁）時，焦點移到標題，鍵盤使用者不會停在被隱藏的元素上。
        var hadStage = clarifierRoot.dataset.stage !== "";
        resetClarifierStage();
        if (focus && (hadStage || target)) focusClarifierHome();
        return;
      }
      clarifierRoot.dataset.stage = panel.dataset.clarifierPanel || "";
      clarifierPanels.forEach(function (p) { p.hidden = p !== panel; });
      setClarifierCurrent(clarifierStageLinks, "#" + panel.id, "step");
      var exits = Array.prototype.slice.call(panel.querySelectorAll(".clarifier-exit"));
      if (target === panel) exits.forEach(function (exit) { exit.hidden = true; });
      else if (target.classList.contains("clarifier-exits")) exits.forEach(function (exit) { exit.hidden = false; });
      else if (target.classList.contains("clarifier-exit")) exits.forEach(function (exit) { exit.hidden = exit !== target; });
      setClarifierCurrent(Array.prototype.slice.call(panel.querySelectorAll(".clarifier-chips a")), "#" + id, "true");
      if (focus) {
        var focusTarget = target === panel ? panel.querySelector("h2") : target;
        if (focusTarget && typeof focusTarget.focus === "function") focusTarget.focus();
      }
    }

    // 只換元素最後一個非空白文字節點：階段 chips 內含 <span>01</span> 編號，不能整個 textContent 覆寫。
    function swapLabel(el, value) {
      if (!el.hasAttribute("data-label-default")) {
        var textNode = null;
        for (var i = el.childNodes.length - 1; i >= 0; i -= 1) {
          if (el.childNodes[i].nodeType === 3 && el.childNodes[i].nodeValue.trim() !== "") { textNode = el.childNodes[i]; break; }
        }
        el.setAttribute("data-label-default", textNode ? textNode.nodeValue : el.textContent);
      }
      var label = value === "462" ? el.getAttribute("data-label-462") : el.getAttribute("data-label-default");
      if (label === null) return;
      for (var j = el.childNodes.length - 1; j >= 0; j -= 1) {
        if (el.childNodes[j].nodeType === 3 && el.childNodes[j].nodeValue.trim() !== "") { el.childNodes[j].nodeValue = label; return; }
      }
      el.textContent = label;
    }

    function applyPassport(value) {
      clarifierRoot.dataset.passport = value;
      clarifierRoot.querySelectorAll("[data-clarifier-passport]").forEach(function (group) {
        var radios = Array.prototype.slice.call(group.querySelectorAll('[role="radio"][data-passport]'));
        var checkedIndex = -1;
        radios.forEach(function (radio, index) {
          var checked = radio.dataset.passport === value;
          radio.setAttribute("aria-checked", String(checked));
          if (checked) checkedIndex = index;
        });
        // 漫遊 tabindex：只有選中的（沒選則第一顆）可用 Tab 到達，方向鍵在群組內移動。
        radios.forEach(function (radio, index) {
          radio.setAttribute("tabindex", index === (checkedIndex < 0 ? 0 : checkedIndex) ? "0" : "-1");
        });
      });
      clarifierRoot.querySelectorAll("[data-passport-note]").forEach(function (note) {
        note.hidden = note.dataset.passportNote !== value;
      });
      // 462 摘要卡雙態：HTML 初始不帶 hidden（無 JS 常駐可讀），JS 只在選 462 時顯示。
      clarifierRoot.querySelectorAll("[data-passport-summary]").forEach(function (card) {
        card.hidden = value !== "462";
      });
      // 階段 chips（#journey-map）、需求 chips 與 21 個出口標題都在 [data-clarifier] 內，一次換字；切回非 462 還原台灣版。
      clarifierRoot.querySelectorAll("[data-label-462]").forEach(function (el) { swapLabel(el, value); });
      clarifierRoot.querySelectorAll("a[data-href-462]").forEach(function (a) {
        // data-href-462 的 dataset 鍵是 href-462（連字號後接數字不轉駝峰），所以直接讀屬性。
        if (!a.hasAttribute("data-href-default")) a.setAttribute("data-href-default", a.getAttribute("href") || "");
        var swapped = value === "462" ? a.getAttribute("data-href-462") : a.getAttribute("data-href-default");
        if (swapped) a.setAttribute("href", swapped);
      });
    }

    function familyLink(family) {
      for (var i = 0; i < jobFamilyItems.length; i += 1) {
        if (jobFamilyItems[i].dataset.jobFamily === family) return jobFamilyItems[i].querySelector("a");
      }
      return null;
    }

    function rankFamilies() {
      var ranked = JOB_FAMILY_ORDER.slice();
      ranked.sort(function (a, b) {
        var diff = (quizScores[b] || 0) - (quizScores[a] || 0);
        return diff !== 0 ? diff : JOB_FAMILY_ORDER.indexOf(a) - JOB_FAMILY_ORDER.indexOf(b);
      });
      return ranked;
    }

    function makeQuizLink(family) {
      var source = familyLink(family);
      var a = document.createElement("a");
      a.setAttribute("href", source ? source.getAttribute("href") : "work.html#channels");
      a.textContent = source ? source.textContent : "全部管道";
      return a;
    }

    function renderQuizResult() {
      var ranked = rankFamilies();
      var top = ranked[0];
      var second = ranked[1];
      jobQuizApp.textContent = "";
      var result = document.createElement("div");
      result.className = "job-quiz-result";
      result.setAttribute("role", "status");
      result.setAttribute("tabindex", "-1");
      var topLine = document.createElement("p");
      topLine.textContent = "比較像你的方向：";
      topLine.appendChild(makeQuizLink(top));
      result.appendChild(topLine);
      var secondLine = document.createElement("p");
      secondLine.textContent = "也可以看：";
      secondLine.appendChild(makeQuizLink(second));
      result.appendChild(secondLine);
      var all = document.createElement("a");
      all.setAttribute("href", "work.html#channels");
      all.textContent = "全部管道";
      result.appendChild(all);
      var again = document.createElement("button");
      again.type = "button";
      again.className = "btn ghost";
      again.textContent = "再做一次";
      again.addEventListener("click", function () { startQuiz(); });
      result.appendChild(again);
      jobQuizApp.appendChild(result);
      jobFamilyItems.forEach(function (item) {
        var isTop = item.dataset.jobFamily === top;
        item.classList.toggle("is-top", isTop);
        if (isTop) item.setAttribute("aria-current", "true");
        else item.removeAttribute("aria-current");
      });
      result.focus();
    }

    function renderQuizStep() {
      var item = JOB_QUIZ[quizStep];
      jobQuizApp.textContent = "";
      var progress = document.createElement("p");
      progress.className = "job-quiz-progress";
      progress.setAttribute("aria-live", "polite");
      progress.textContent = "第 " + (quizStep + 1) + "／" + JOB_QUIZ.length + " 題";
      jobQuizApp.appendChild(progress);
      var question = document.createElement("p");
      question.className = "clarifier-q";
      question.textContent = item.q;
      jobQuizApp.appendChild(question);
      var group = document.createElement("div");
      group.className = "clarifier-chips";
      group.setAttribute("role", "group");
      group.setAttribute("aria-label", item.q);
      var firstChip = null;
      item.c.forEach(function (choice) {
        var chip = document.createElement("button");
        chip.type = "button";
        chip.className = "chip";
        chip.textContent = choice[0];
        chip.addEventListener("click", function () {
          choice[1].forEach(function (family) { quizScores[family] = (quizScores[family] || 0) + 1; });
          quizStep += 1;
          if (quizStep < JOB_QUIZ.length) renderQuizStep();
          else renderQuizResult();
        });
        group.appendChild(chip);
        if (!firstChip) firstChip = chip;
      });
      jobQuizApp.appendChild(group);
      if (firstChip) firstChip.focus();
    }

    function startQuiz() {
      quizStep = 0;
      quizScores = {};
      jobFamilyItems.forEach(function (item) {
        item.classList.remove("is-top");
        item.removeAttribute("aria-current");
      });
      renderQuizStep();
    }

    function openQuiz(focus) {
      if (!jobQuizSection || !jobQuizApp) return;
      jobQuizSection.hidden = false;
      jobQuizApp.hidden = false;
      startQuiz();
      if (focus) jobQuizSection.focus();
    }

    clarifierRoot.dataset.enhanced = "true";
    clarifierRoot.querySelectorAll("[data-clarifier-passport]").forEach(function (el) { el.hidden = false; });
    clarifierRoot.querySelectorAll("[data-clarifier-passport-static]").forEach(function (el) { el.hidden = true; });
    clarifierPanels.forEach(function (panel) {
      panel.hidden = true;
      var heading = panel.querySelector("h2");
      if (heading) heading.setAttribute("tabindex", "-1");
    });
    clarifierExits.forEach(function (exit) { exit.hidden = true; });
    if (jobQuizSection) jobQuizSection.hidden = true;
    if (clarifierTitle) clarifierTitle.setAttribute("tabindex", "-1");

    applyHash(location.hash, false);
    window.addEventListener("hashchange", function () { applyHash(location.hash, true); });

    // 再點一次目前的籤：瀏覽器不會觸發 hashchange，這裡補做同樣的顯示與聚焦。
    document.addEventListener("click", function (event) {
      var a = event.target.closest ? event.target.closest('a[href^="#"]') : null;
      if (!a) return;
      var href = a.getAttribute("href");
      if (href.length < 2 || href !== location.hash) return;
      var hashTarget = document.getElementById(href.slice(1));
      if (!hashTarget || !clarifierRoot.contains(hashTarget)) return;
      event.preventDefault();
      applyHash(location.hash, true);
    });

    // 初始狀態：沒選護照 -> 462 摘要卡收起、三顆 radio 都未選、第一顆可 Tab 到達。
    applyPassport(clarifierRoot.dataset.passport || "");

    clarifierRoot.addEventListener("click", function (event) {
      var button = event.target.closest ? event.target.closest("button[data-passport]") : null;
      if (!button || !clarifierRoot.contains(button)) return;
      applyPassport(button.dataset.passport || "");
    });

    // radiogroup 鍵盤：左右上下在同一群組內循環移動並選取；空白鍵與 Enter 由原生 button click 處理。
    clarifierRoot.addEventListener("keydown", function (event) {
      var radio = event.target.closest ? event.target.closest('[role="radio"][data-passport]') : null;
      if (!radio) return;
      var step = (event.key === "ArrowRight" || event.key === "ArrowDown") ? 1 : (event.key === "ArrowLeft" || event.key === "ArrowUp") ? -1 : 0;
      if (step === 0) return;
      var group = radio.closest("[data-clarifier-passport]");
      var radios = group ? Array.prototype.slice.call(group.querySelectorAll('[role="radio"][data-passport]')) : [];
      if (radios.length < 2) return;
      event.preventDefault();
      var next = radios[(radios.indexOf(radio) + step + radios.length) % radios.length];
      applyPassport(next.dataset.passport || "");
      next.focus();
    });
  }

  // ---------- 首頁 AI 兜底（apiBaseUrl 與 turnstileSiteKey 都設定時才啟用） ----------
  var assistSection = document.querySelector("[data-assist]");
  if (assistSection) {
    var assistOff = document.getElementById("assist-off");
    var assistBox = document.getElementById("assist-box");
    var assistOpen = document.getElementById("assist-open");
    var assistForm = document.getElementById("assist-form");
    var assistInput = document.getElementById("assist-input");
    var assistTurnstile = document.getElementById("assist-turnstile");
    var assistSubmit = document.getElementById("assist-submit");
    var assistCancel = document.getElementById("assist-cancel");
    var assistStatus = document.getElementById("assist-status");
    var assistAnswer = document.getElementById("assist-answer");
    var ASSIST_SAME_SITE = /^(?:[a-z0-9-]+\.html|lang\/[a-z]{2}(?:-[A-Za-z]{2,4})?\/(?:[a-z-]+\/)?)?(?:#[A-Za-z0-9_-]{1,80})?$/;
    // 送出前的敏感題攔截：命中就直接在瀏覽器裡顯示固定安全出口，問題文字完全不離開這一頁。
    // 這幾組樣式必須與 worker/src/assist.ts 的 ASSIST_SENSITIVE 逐字相同（check.ps1 會比對），
    // 否則客戶端漏接的題目雖然伺服端仍會攔下，文字卻已經送出去了。
    var SENSITIVE_SELF_HARM =
      "自殺|自傷|自殘|想死|不想活|活不下去|撐不下去|輕生|想不開|傷害自己|了結自己";
    var SENSITIVE_VIOLENCE =
      "被打|毆打|被毆|揍我|打我|動手打|對我動手|家暴|暴力|強暴|性侵|性騷擾|騷擾我|猥褻|下藥|迷昏";
    var SENSITIVE_COERCION =
      "威脅|恐嚇|勒索|不讓我走|不讓我離開|不准我離開|不肯放我走|把我關|軟禁|限制我的自由";
    var SENSITIVE_DOCUMENTS =
      "扣護照|扣證件|" +
      "(?:護照|證件|居留證)[^。？?!！]{0,10}(?:被扣|扣住|收走|拿走|沒收|不還|不肯還|還我)|" +
      "(?:被扣|扣住|收走|拿走|沒收|不還|不肯還|不給我)[^。？?!！]{0,10}(?:護照|證件|居留證)";
    var SENSITIVE_MONEY =
      "剛匯款|匯款了|轉帳了|匯錢|把錢匯|匯給對方|轉給對方|付了訂金|被騙|被詐|詐騙|遭詐";
    var SENSITIVE_INJURY =
      "受傷|流血|出血|骨折|燙傷|灼傷|割傷|夾到|昏倒|救護車|送醫|急診";
    var SENSITIVE_EN_SELF_HARM =
      "suicid|kill myself|self[- ]?harm|want to die|end my life|hurt myself";
    var SENSITIVE_EN_VIOLENCE =
      "assault|violen|\\brape|harass|molest|beat me|hit me|punch|drugged";
    var SENSITIVE_EN_COERCION =
      "threat|blackmail|extort|won'?t let me (?:leave|go)|not allowed to leave|held against my will|locked me in";
    var SENSITIVE_EN_DOCUMENTS =
      "passport[^.?!]{0,24}(?:taken|confiscated|withheld|kept|back|returned)|(?:took|taken|confiscat|withh|keeping|holding|has|refus)[a-z]*[^.?!]{0,16}passport";
    var SENSITIVE_EN_MONEY =
      "(?:just |already )?(?:wired|transferred|sent|paid)[^.?!]{0,16}money|scammed|defrauded|\\bfraud";
    var SENSITIVE_EN_INJURY =
      "bleeding|broken (?:arm|leg|bone|rib|finger)|ambulance|emergency room";

    var ASSIST_SENSITIVE = new RegExp(
      [
        SENSITIVE_SELF_HARM,
        SENSITIVE_VIOLENCE,
        SENSITIVE_COERCION,
        SENSITIVE_DOCUMENTS,
        SENSITIVE_MONEY,
        SENSITIVE_INJURY,
        // Australia's emergency number, guarded so it cannot fire inside other digits.
        "(?:^|[^0-9])000(?:[^0-9]|$)",
        SENSITIVE_EN_SELF_HARM,
        SENSITIVE_EN_VIOLENCE,
        SENSITIVE_EN_COERCION,
        SENSITIVE_EN_DOCUMENTS,
        SENSITIVE_EN_MONEY,
        SENSITIVE_EN_INJURY,
      ].join("|"),
      "i",
    );
    var ASSIST_FALLBACK_LINKS = [["用站內搜尋", "#search"], ["到各地社團問人", "#communities"]];
    var assistToken = "";
    var assistWidgetId = null;
    var assistInFlight = false;

    function isSameSiteHref(h) {
      return typeof h === "string" && h.length > 0 && h.length <= 120 && h.indexOf("..") === -1 && ASSIST_SAME_SITE.test(h);
    }

    function assistSettings() {
      var config = window.WHV_API_CONFIG;
      var apiBaseUrl = getPublicApiBaseUrl();
      if (!config || config.assistEnabled !== true) return null;
      if (!apiBaseUrl || typeof config.turnstileSiteKey !== "string") return null;
      if (!config.turnstileSiteKey || config.turnstileSiteKey.length > 100) return null;
      return { baseUrl: apiBaseUrl, siteKey: config.turnstileSiteKey };
    }

    function loadTurnstileApi() {
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

    function setAssistStatus(message) {
      if (assistStatus) assistStatus.textContent = message;
    }

    function appendAssistLinks(pairs) {
      var list = document.createElement("ul");
      pairs.forEach(function (pair) {
        var item = document.createElement("li");
        var a = document.createElement("a");
        a.setAttribute("href", pair[1]);
        a.textContent = pair[0];
        item.appendChild(a);
        list.appendChild(item);
      });
      assistAnswer.appendChild(list);
    }

    function filterAssistLinks(links) {
      var kept = [];
      if (!Array.isArray(links)) return kept;
      links.forEach(function (link) {
        if (kept.length >= 5 || !link || typeof link !== "object") return;
        if (!isSameSiteHref(link.href)) return;
        var title = String(link.title || "").slice(0, 80).trim();
        kept.push([title || link.href, link.href]);
      });
      return kept;
    }

    function renderAssistAnswer(text, pairs) {
      assistAnswer.textContent = "";
      var p = document.createElement("p");
      p.textContent = text;
      assistAnswer.appendChild(p);
      appendAssistLinks(pairs.length ? pairs : ASSIST_FALLBACK_LINKS);
      assistAnswer.hidden = false;
      assistAnswer.focus();
    }

    function renderAssistResult(result) {
      if (result && result.kind === "rate_limited") {
        renderAssistAnswer("一分鐘內問太多次，稍等再試。", ASSIST_FALLBACK_LINKS);
        return;
      }
      if (result && result.kind === "over_cap") {
        renderAssistAnswer("今天的 AI 額度已用完。", ASSIST_FALLBACK_LINKS);
        return;
      }
      if (result && result.ok === true && result.kind === "refused") {
        renderAssistAnswer("這題 AI 不能答，請看官方入口。", filterAssistLinks(result.links));
        return;
      }
      if (result && result.ok === true && (result.kind === "answer" || result.kind === "official_exit")) {
        var answer = String(result.answer || "").slice(0, 600).trim();
        renderAssistAnswer(answer || "AI 暫時無法回覆。", filterAssistLinks(result.links));
        return;
      }
      renderAssistAnswer("AI 暫時無法回覆。", ASSIST_FALLBACK_LINKS);
    }

    function renderTurnstile(settings) {
      assistTurnstile.hidden = false;
      loadTurnstileApi().then(function (turnstile) {
        if (assistWidgetId !== null) { turnstile.reset(assistWidgetId); return; }
        assistWidgetId = turnstile.render(assistTurnstile, {
          sitekey: settings.siteKey,
          action: "turnstile-spin-v2",
          callback: function (token) { assistToken = token; },
          "error-callback": function () { assistToken = ""; },
          "expired-callback": function () { assistToken = ""; }
        });
      }).catch(function () {
        setAssistStatus("驗證載入失敗，稍後再試。");
      });
    }

    function openAssist() {
      var settings = assistSettings();
      if (!settings) return;
      assistBox.hidden = false;
      assistForm.hidden = false;
      assistOpen.setAttribute("aria-expanded", "true");
      renderTurnstile(settings);
      assistInput.focus();
    }

    function cancelAssist() {
      assistForm.hidden = true;
      assistInput.value = "";
      assistToken = "";
      assistOpen.setAttribute("aria-expanded", "false");
      assistOpen.focus();
    }

    function finishAssist() {
      setAssistStatus("");
      assistSubmit.disabled = false;
      if (window.turnstile && assistWidgetId !== null) window.turnstile.reset(assistWidgetId);
      assistToken = "";
      assistInFlight = false;
    }

    function submitAssist() {
      if (assistInFlight) return;
      var question = assistInput.value.trim();
      if (question.length < 4 || question.length > 200) {
        setAssistStatus("先寫一句話，最多 200 字。");
        assistInput.focus();
        return;
      }
      if (ASSIST_SENSITIVE.test(question)) {
        renderAssistAnswer("這種情況不要等 AI。", [["有人受傷或有立即危險", "health.html#emergency"], ["剛匯款、被威脅或扣證件", "scam.html#help"]]);
        return;
      }
      var settings = assistSettings();
      if (!settings) {
        assistOff.hidden = false;
        assistBox.hidden = true;
        return;
      }
      if (assistToken === "") {
        setAssistStatus("先完成驗證再送出。");
        return;
      }
      assistInFlight = true;
      assistSubmit.disabled = true;
      setAssistStatus("正在問 AI…");
      fetch(settings.baseUrl + "/api/assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: question, turnstileToken: assistToken }),
        credentials: "omit",
        referrerPolicy: "no-referrer"
      }).then(function (response) {
        if (response.status === 429) {
          // Two different 429s: per-source rate limit vs. the site-wide daily cap (D-2026-09-02-06).
          return response.json().then(function (body) {
            var code = body && body.error && typeof body.error.code === "string" ? body.error.code : "";
            return { ok: true, kind: code === "rate_limited" ? "rate_limited" : "over_cap" };
          }, function () { return { ok: true, kind: "over_cap" }; });
        }
        if (!response.ok) throw new Error("assist_http_" + response.status);
        return response.json();
      }).then(function (result) {
        renderAssistResult(result);
      }).catch(function () {
        renderAssistResult(null);
      }).then(finishAssist);
    }

    assistSection.hidden = false;
    if (assistSettings()) {
      if (assistBox) assistBox.hidden = false;
    } else if (assistOff) {
      assistOff.hidden = false;
    }

    if (assistOpen && assistForm && assistInput && assistBox && assistAnswer && assistSubmit) {
      assistOpen.addEventListener("click", openAssist);
      if (assistCancel) assistCancel.addEventListener("click", cancelAssist);
      assistForm.addEventListener("keydown", function (event) {
        if (event.key === "Escape") { event.preventDefault(); cancelAssist(); }
      });
      assistForm.addEventListener("submit", function (event) {
        event.preventDefault();
        submitAssist();
      });
      // 零結果只揭露搜尋 dialog 裡的「問一次 AI」按鈕（連到 #assist）；不自動開啟、不移焦點、不載入 Turnstile，
      // 使用者明確點擊後才由 hashchange 進入 openAssist（P0-9 實作 5）。
      window.addEventListener("whv:search", function (event) {
        if (!(event.detail && event.detail.resultCount === 0 && assistSettings())) return;
        var searchAiSlot = document.getElementById("site-search-ai");
        if (searchAiSlot) searchAiSlot.hidden = false;
      });
      if ("#assist" === location.hash) openAssist();
      window.addEventListener("hashchange", function () {
        if ("#assist" === location.hash) openAssist();
      });
    }
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
    var dplusConfig = window.WHV_API_CONFIG;
    if (!dplusConfig || dplusConfig.dplusMetricsEnabled !== true) return Promise.resolve(false);
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
      if (!config || config.contactSubmitEnabled !== true) return null;
      if (!apiBaseUrl || typeof config.turnstileSiteKey !== "string") return null;
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
