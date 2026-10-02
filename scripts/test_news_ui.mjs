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

function createHarness(fetchImplementation) {
  const ids = {
    "news-status": new FakeElement(),
    "news-lead": new FakeElement(),
    "news-list": new FakeElement(),
    "news-source-status": new FakeElement(),
  };
  const resultSection = new FakeElement({ "aria-busy": "true" });
  const windowButtons = ["day", "week", "month"].map((value) => new FakeElement({ "data-news-window": value }));
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
  const location = { href: "https://www.aussiewhvcompass.com/news.html", pathname: "/news.html", search: "", hash: "" };
  const windowObject = {
    WHV_API_CONFIG: { apiBaseUrl: "https://api.aussiewhvcompass.com", newsEnabled: true },
    location,
    history: { replaceState() {} },
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
  return { ids, resultSection, windowButtons, topicButtons };
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
assert.match(requested[0], /\/api\/news\?window=day&topic=all$/);

success.windowButtons[1].dispatch("click");
await settle();
assert.match(requested.at(-1), /window=week&topic=all$/);
assert.equal(success.windowButtons[1].getAttribute("aria-pressed"), "true");

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

console.log("NEWS UI TESTS PASSED (render, filters, degraded fallback, DOM-safe output)");
