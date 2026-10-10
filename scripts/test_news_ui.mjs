import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

class FakeElement {
  constructor(attributes = {}) {
    this.attributes = { ...attributes };
    this.children = [];
    this.listeners = {};
    this.textContent = "";
    this.className = "";
    this.href = "";
    this.target = "";
    this.rel = "";
  }

  addEventListener(type, handler) {
    (this.listeners[type] ||= []).push(handler);
  }

  dispatch(type) {
    for (const handler of this.listeners[type] || []) handler({ preventDefault() {} });
  }

  getAttribute(name) { return this.attributes[name] ?? null; }
  setAttribute(name, value) { this.attributes[name] = String(value); }
  appendChild(child) { this.children.push(child); return child; }
  replaceChildren(...children) { this.children = children; }
}

function createHarness(fetchImplementation, search = "") {
  const ids = {
    "news-status": new FakeElement(),
    "news-lead": new FakeElement(),
    "news-list": new FakeElement(),
    "news-source-status": new FakeElement(),
  };
  const resultSection = new FakeElement({ "aria-busy": "true" });
  const windowButtons = ["recent", "day", "week", "month"].map((value) => new FakeElement({ "data-news-window": value }));
  const topicButtons = ["all", "work", "housing", "visa", "money", "safety", "health", "transport", "weather"]
    .map((value) => new FakeElement({ "data-news-topic": value }));
  const documentListeners = {};
  const document = {
    addEventListener(type, handler) { documentListeners[type] = handler; },
    createElement() { return new FakeElement(); },
    getElementById(id) { return ids[id] || null; },
    querySelector(selector) { return selector === ".news-results" ? resultSection : null; },
    querySelectorAll(selector) {
      if (selector === "[data-news-window]") return windowButtons;
      if (selector === "[data-news-topic]") return topicButtons;
      return [];
    },
  };
  const initialUrl = new URL("https://www.aussiewhvcompass.com/news.html");
  initialUrl.search = search;
  const location = { href: initialUrl.href, pathname: initialUrl.pathname, search: initialUrl.search, hash: initialUrl.hash };
  const replacedUrls = [];
  const windowObject = {
    WHV_API_CONFIG: { apiBaseUrl: "https://api.aussiewhvcompass.com", newsEnabled: true },
    location,
    history: { replaceState(_state, _title, url) { replacedUrls.push(url); } },
    setTimeout,
    clearTimeout,
  };
  const context = vm.createContext({
    AbortController,
    Date,
    Intl,
    Number,
    Promise,
    URL,
    URLSearchParams,
    console,
    document,
    fetch: fetchImplementation,
    window: windowObject,
  });
  const source = fs.readFileSync(new URL("../assets/news.js", import.meta.url), "utf8");
  vm.runInContext(source, context, { filename: "assets/news.js" });
  documentListeners.DOMContentLoaded();
  return { ids, resultSection, windowButtons, topicButtons, replacedUrls };
}

async function settle() {
  await new Promise((resolve) => setTimeout(resolve, 10));
}

const payload = {
  ok: true,
  items: [{
    id: "n1",
    title: "Job scam warning",
    summary: "Official warning for job seekers.",
    url: "https://www.scamwatch.gov.au/news-alerts/job-scam-warning",
    publishedAt: "2026-10-02T00:00:00.000Z",
    keywords: ["工作", "防詐安全", "全澳"],
    source: { name: "Scamwatch" },
    verification: { checkedAt: "2026-10-02T00:05:00.000Z" },
  }],
  sources: [{
    name: "Scamwatch",
    status: "healthy",
    publicPageUrl: "https://www.scamwatch.gov.au/about-us/news-and-alerts/browse-news-and-alerts",
    lastAttemptAt: "2026-10-02T00:05:00.000Z",
  }],
};

const requested = [];
const success = createHarness(async (url) => {
  requested.push(String(url));
  return new Response(JSON.stringify(payload), { status: 200, headers: { "Content-Type": "application/json" } });
});
await settle();

assert.equal(success.resultSection.getAttribute("aria-busy"), "false");
assert.match(success.ids["news-status"].textContent, /1 則通過核對/);
assert.equal(success.ids["news-lead"].children.length, 1, "first verified item should become the lead card");
assert.equal(success.ids["news-source-status"].children.length, 1, "source health should be visible");
assert.match(requested[0], /\/api\/news\?window=recent&topic=all$/);
assert.match(success.ids["news-status"].textContent, /^近 90 天共 1 則/);
for (const button of success.windowButtons) {
  assert.equal(button.getAttribute("aria-pressed"), button.getAttribute("data-news-window") === "recent" ? "true" : "false");
}

const weekButton = success.windowButtons.find((button) => button.getAttribute("data-news-window") === "week");
weekButton.dispatch("click");
await settle();
assert.match(requested.at(-1), /window=week&topic=all$/);
assert.equal(weekButton.getAttribute("aria-pressed"), "true");
assert.equal(success.replacedUrls.at(-1), "/news.html?window=week");

const recentButton = success.windowButtons.find((button) => button.getAttribute("data-news-window") === "recent");
recentButton.dispatch("click");
await settle();
assert.match(requested.at(-1), /window=recent&topic=all$/);
assert.equal(recentButton.getAttribute("aria-pressed"), "true");
assert.equal(weekButton.getAttribute("aria-pressed"), "false");
assert.equal(success.replacedUrls.at(-1), "/news.html?window=recent");

const scopeLabels = { day: "今天", week: "本週", month: "本月", recent: "近 90 天" };
for (const windowKey of ["day", "week", "month", "recent", "unknown"]) {
  const queryRequests = [];
  const expectedWindow = windowKey === "unknown" ? "recent" : windowKey;
  const app = createHarness(async (url) => {
    queryRequests.push(new URL(url));
    return new Response(JSON.stringify(payload), { status: 200 });
  }, "?window=" + windowKey + "&topic=housing");
  await settle();
  assert.equal(queryRequests.length, 1);
  assert.equal(queryRequests[0].searchParams.get("window"), expectedWindow);
  assert.equal(queryRequests[0].searchParams.get("topic"), "housing");
  assert.ok(app.ids["news-status"].textContent.startsWith(scopeLabels[expectedWindow] + "共 1 則"));
  for (const button of app.windowButtons) {
    assert.equal(button.getAttribute("aria-pressed"), button.getAttribute("data-news-window") === expectedWindow ? "true" : "false");
  }
  assert.equal(app.topicButtons.find((button) => button.getAttribute("data-news-topic") === "housing").getAttribute("aria-pressed"), "true");
  assert.equal(app.replacedUrls.length, 0, "initial query should not be rewritten");
}

const failure = createHarness(async () => { throw new Error("offline"); });
await settle();
assert.match(failure.ids["news-status"].textContent, /不是『沒有新聞』/);
assert.match(failure.ids["news-source-status"].children[0].textContent, /無法讀取來源狀態/);
assert.equal(failure.resultSection.getAttribute("aria-busy"), "false");

const source = fs.readFileSync(new URL("../assets/news.js", import.meta.url), "utf8");
assert.doesNotMatch(source, /innerHTML|localStorage|sessionStorage|document\.write/);
assert.match(source, /textContent/);
assert.match(source, /credentials: "omit"/);
assert.match(source, /referrerPolicy: "no-referrer"/);

const page = fs.readFileSync(new URL("../news.html", import.meta.url), "utf8");
const pageWindowButtons = [...page.matchAll(/<button\b[^>]*data-news-window="([^"]+)"[^>]*>/g)];
assert.deepEqual(pageWindowButtons.map((match) => match[1]), ["recent", "day", "week", "month"]);
for (const [tag, value] of pageWindowButtons) {
  assert.match(tag, new RegExp('aria-pressed="' + (value === "recent" ? "true" : "false") + '"'));
}
assert.match(page, /api\/news\?window=recent&amp;topic=all/);

console.log("NEWS UI TESTS PASSED (recent default, day/week/month/recent queries, unknown fallback, filters, render, degraded fallback, DOM-safe output)");
