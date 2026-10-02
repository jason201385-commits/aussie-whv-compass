(function () {
  "use strict";

  var ALLOWED_WINDOWS = ["day", "week", "month"];
  var ALLOWED_TOPICS = ["all", "work", "housing", "visa", "money", "safety", "health", "transport", "weather"];
  var windowKey = "day";
  var topicKey = "all";
  var activeRequest = null;

  function byId(id) { return document.getElementById(id); }

  function element(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function safeHttpUrl(value) {
    try {
      var parsed = new URL(String(value));
      return parsed.protocol === "https:" ? parsed.toString() : "";
    } catch (_error) {
      return "";
    }
  }

  function formatPerthTime(value) {
    var parsed = new Date(value);
    if (!Number.isFinite(parsed.getTime())) return "時間未提供";
    return new Intl.DateTimeFormat("zh-TW", {
      timeZone: "Australia/Perth",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    }).format(parsed) + "（Perth）";
  }

  function setPressed(selector, attribute, value) {
    document.querySelectorAll(selector).forEach(function (button) {
      button.setAttribute("aria-pressed", button.getAttribute(attribute) === value ? "true" : "false");
    });
  }

  function renderKeywordList(parent, keywords) {
    var row = element("p", "news-keywords");
    (Array.isArray(keywords) ? keywords : []).slice(0, 5).forEach(function (keyword) {
      row.appendChild(element("span", "news-keyword", String(keyword)));
    });
    parent.appendChild(row);
  }

  function renderItem(item, featured) {
    var card = element("article", featured ? "news-card news-card-featured" : "news-card");
    renderKeywordList(card, item.keywords);
    var title = element(featured ? "h3" : "h3", "news-card-title");
    var sourceUrl = safeHttpUrl(item.url);
    if (sourceUrl) {
      var titleLink = element("a", "", String(item.title || "未命名消息"));
      titleLink.href = sourceUrl;
      titleLink.target = "_blank";
      titleLink.rel = "noopener noreferrer";
      title.appendChild(titleLink);
    } else {
      title.textContent = String(item.title || "未命名消息");
    }
    card.appendChild(title);
    if (item.summary) card.appendChild(element("p", "news-card-summary", String(item.summary)));
    var sourceName = item.source && item.source.name ? String(item.source.name) : "官方來源";
    card.appendChild(element("p", "news-card-meta", sourceName + "｜發布 " + formatPerthTime(item.publishedAt)));
    var verification = item.verification || {};
    card.appendChild(element("p", "news-card-verified", "已核對官方 feed 與原文｜" + formatPerthTime(verification.checkedAt)));
    if (sourceUrl) {
      var action = element("p", "news-card-action");
      var link = element("a", "btn secondary", "讀官方原文");
      link.href = sourceUrl;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      action.appendChild(link);
      card.appendChild(action);
    }
    return card;
  }

  function renderItems(items) {
    var lead = byId("news-lead");
    var list = byId("news-list");
    lead.replaceChildren();
    list.replaceChildren();
    if (!items.length) return;
    lead.appendChild(renderItem(items[0], true));
    items.slice(1).forEach(function (item) { list.appendChild(renderItem(item, false)); });
  }

  function renderSources(sources) {
    var root = byId("news-source-status");
    root.replaceChildren();
    (Array.isArray(sources) ? sources : []).forEach(function (source) {
      var card = element("article", "news-source-card");
      var status = source.status === "healthy" ? "正常" : source.status === "degraded" ? "同步異常" : "尚未執行";
      var heading = element("h3", "", String(source.name || "官方來源"));
      var publicUrl = safeHttpUrl(source.publicPageUrl);
      if (publicUrl) {
        var link = element("a", "", heading.textContent);
        link.href = publicUrl;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        heading.replaceChildren(link);
      }
      card.appendChild(heading);
      card.appendChild(element("p", "news-source-state news-source-state-" + String(source.status || "not-run"), "狀態：" + status));
      card.appendChild(element("p", "fact-meta", "最近檢查：" + (source.lastAttemptAt ? formatPerthTime(source.lastAttemptAt) : "尚無紀錄")));
      root.appendChild(card);
    });
    if (!root.children.length) root.appendChild(element("p", "warn", "目前沒有可用的來源狀態。"));
  }

  function renderSourceFailure() {
    var root = byId("news-source-status");
    root.replaceChildren(element("p", "warn", "目前無法讀取來源狀態，請使用下方官方來源。"));
  }

  function updateUrl() {
    if (!window.history || !window.history.replaceState) return;
    var url = new URL(window.location.href);
    url.searchParams.set("window", windowKey);
    if (topicKey === "all") url.searchParams.delete("topic");
    else url.searchParams.set("topic", topicKey);
    window.history.replaceState(null, "", url.pathname + url.search + url.hash);
  }

  function apiSettings() {
    var config = window.WHV_API_CONFIG;
    if (!config || config.newsEnabled !== true || typeof config.apiBaseUrl !== "string") return null;
    try {
      var parsed = new URL(config.apiBaseUrl);
      if (parsed.protocol !== "https:" || parsed.pathname !== "/" || parsed.search || parsed.hash || parsed.username || parsed.password) return null;
      return { base: parsed.origin };
    } catch (_error) {
      return null;
    }
  }

  function loadNews() {
    var settings = apiSettings();
    var status = byId("news-status");
    var results = document.querySelector(".news-results");
    if (!settings) {
      status.textContent = "自動新聞服務尚未啟用；請先使用下方官方來源。";
      results.setAttribute("aria-busy", "false");
      renderItems([]);
      renderSourceFailure();
      return Promise.resolve(false);
    }
    if (activeRequest) activeRequest.abort();
    activeRequest = new AbortController();
    var controller = activeRequest;
    var timeout = window.setTimeout(function () { controller.abort(); }, 10000);
    status.textContent = "正在讀取已核對消息…";
    results.setAttribute("aria-busy", "true");
    var endpoint = settings.base + "/api/news?window=" + encodeURIComponent(windowKey) + "&topic=" + encodeURIComponent(topicKey);
    return fetch(endpoint, {
      method: "GET",
      mode: "cors",
      credentials: "omit",
      cache: "no-store",
      referrerPolicy: "no-referrer",
      signal: controller.signal
    }).then(function (response) {
      if (!response.ok) throw new Error("news_http_" + response.status);
      return response.json();
    }).then(function (payload) {
      if (!payload || payload.ok !== true || !Array.isArray(payload.items) || !Array.isArray(payload.sources)) throw new Error("news_payload_invalid");
      renderItems(payload.items);
      renderSources(payload.sources);
      var degraded = payload.sources.filter(function (source) { return source.status !== "healthy"; }).length;
      var scope = windowKey === "day" ? "今天" : windowKey === "week" ? "本週" : "本月";
      if (!payload.items.length) {
        status.textContent = scope + "尚無符合條件且通過核對的消息；這不代表沒有其他消息。";
      } else {
        status.textContent = scope + "共 " + payload.items.length + " 則通過核對的消息" + (degraded ? "；有 " + degraded + " 個來源狀態不完整" : "；所有登錄來源最近一次同步正常") + "。";
      }
      results.setAttribute("aria-busy", "false");
      return true;
    }).catch(function (error) {
      if (error && error.name === "AbortError" && controller !== activeRequest) return false;
      renderItems([]);
      renderSourceFailure();
      status.textContent = "目前無法讀取核對結果。不是『沒有新聞』；請改從下方官方來源查看。";
      results.setAttribute("aria-busy", "false");
      return false;
    }).finally(function () {
      window.clearTimeout(timeout);
      if (controller === activeRequest) activeRequest = null;
    });
  }

  function applyInitialQuery() {
    var params = new URLSearchParams(window.location.search);
    var requestedWindow = params.get("window");
    var requestedTopic = params.get("topic");
    if (ALLOWED_WINDOWS.indexOf(requestedWindow) >= 0) windowKey = requestedWindow;
    if (ALLOWED_TOPICS.indexOf(requestedTopic) >= 0) topicKey = requestedTopic;
    setPressed("[data-news-window]", "data-news-window", windowKey);
    setPressed("[data-news-topic]", "data-news-topic", topicKey);
  }

  function bindControls() {
    document.querySelectorAll("[data-news-window]").forEach(function (button) {
      button.addEventListener("click", function () {
        var value = button.getAttribute("data-news-window");
        if (ALLOWED_WINDOWS.indexOf(value) < 0 || value === windowKey) return;
        windowKey = value;
        setPressed("[data-news-window]", "data-news-window", windowKey);
        updateUrl();
        loadNews();
      });
    });
    document.querySelectorAll("[data-news-topic]").forEach(function (button) {
      button.addEventListener("click", function () {
        var value = button.getAttribute("data-news-topic");
        if (ALLOWED_TOPICS.indexOf(value) < 0 || value === topicKey) return;
        topicKey = value;
        setPressed("[data-news-topic]", "data-news-topic", topicKey);
        updateUrl();
        loadNews();
      });
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    if (!byId("news-status")) return;
    applyInitialQuery();
    bindControls();
    loadNews();
  });
})();
