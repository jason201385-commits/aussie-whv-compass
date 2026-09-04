import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

class FakeElement {
  constructor(options = {}) {
    this.value = options.value || "";
    this.defaultValue = this.value;
    this.textContent = options.textContent || "";
    this.href = options.href || "";
    this.hidden = options.hidden === true;
    this.validationMessage = "";
    this.listeners = {};
    this.attributes = options.attributes || {};
    this.children = [];
    this.className = "";
    this.target = "";
    this.rel = "";
  }

  addEventListener(type, handler) {
    if (!this.listeners[type]) this.listeners[type] = [];
    this.listeners[type].push(handler);
  }

  dispatch(type, eventOptions = {}) {
    const event = { preventDefault() {}, ...eventOptions };
    for (const handler of this.listeners[type] || []) handler(event);
  }

  getAttribute(name) {
    return this.attributes[name] || null;
  }

  setCustomValidity(message) {
    this.validationMessage = message;
  }

  scrollIntoView() {}

  closest(selector) {
    // 只有入口容器會用到：回一個可寫 scrollLeft 的替身，代表外層滑動列。
    return selector === ".housing-route-strip" ? this.fakeStrip || (this.fakeStrip = { scrollLeft: 0 }) : null;
  }

  focus() {
    this.focused = true;
  }

  appendChild(child) {
    this.children.push(child);
    return child;
  }

  replaceChildren(...children) {
    this.children = children;
  }
}

function createHarness(lang = "zh-Hant", options = {}) {
  const elements = {};
  const add = (id, options) => {
    elements[id] = new FakeElement(options);
    return elements[id];
  };
  const housingTool = add("housing-search-tool", { hidden: true });
  const housingForm = add("housing-search-form");
  add("housing-intent", { value: "short" });
  add("housing-intent-help");
  const housingLocation = add("housing-location");
  add("housing-checkin");
  add("housing-stay-length", { value: "14" });
  add("housing-guests", { value: "1" });
  add("housing-search-results", { hidden: true });
  add("housing-search-summary");
  add("housing-search-status");
  add("housing-copy-location");
  add("housing-search-privacy");
  add("housing-intent-advice");
  add("housing-risk-note");
  add("housing-fallback-note");
  add("housing-route-title");
  add("housing-primary-routes");
  add("housing-live-panel", { hidden: true });
  add("housing-live-status");
  add("housing-live-list", { hidden: true });

  for (const platform of ["hostelworld", "booking", "flatmates", "rea", "domain"]) {
    add(`housing-${platform}-link`);
    add(`housing-${platform}-note`);
  }

  const chips = [
    new FakeElement({ attributes: { "data-housing-location": "Perth WA 6000" } }),
    new FakeElement({ attributes: { "data-housing-location": "Darwin NT 0800" } })
  ];
  housingTool.querySelectorAll = () => chips;
  housingForm.checkValidity = () => housingLocation.value.trim() !== "" && housingLocation.validationMessage === "";
  housingForm.reportValidity = () => housingForm.checkValidity();
  housingForm.requestSubmit = () => housingForm.dispatch("submit");
  housingForm.reset = () => {
    housingForm.dispatch("reset");
    for (const element of Object.values(elements)) element.value = element.defaultValue;
  };

  const document = {
    documentElement: { lang },
    getElementById(id) { return elements[id] || null; },
    createElement() { return new FakeElement(); }
  };
  const windowObject = {
    matchMedia: () => ({ matches: false }),
    WHV_API_CONFIG: options.apiConfig,
    fetch: options.fetch
  };
  const context = vm.createContext({
    URL,
    Date,
    Event,
    Promise,
    AbortController,
    navigator: {},
    document,
    location: { hostname: options.hostname || "www.aussiewhvcompass.com" },
    window: windowObject,
    setTimeout,
    clearTimeout,
    console
  });
  const source = fs.readFileSync(new URL("../assets/tools.js", import.meta.url), "utf8");
  vm.runInContext(source, context, { filename: "assets/tools.js" });
  return { elements, chips, housingForm, housingLocation };
}

const harness = createHarness();
const { elements, chips, housingForm, housingLocation } = harness;

assert.equal(elements["housing-search-tool"].hidden, false, "tool should reveal only after JavaScript runs");

housingLocation.value = "Perth WA 6000";
housingLocation.dispatch("keydown", { key: "Enter" });
assert.equal(elements["housing-search-results"].hidden, false, "Enter in the location field should submit");

housingLocation.value = "123 Hay St, Perth WA 6000, Australia";
elements["housing-checkin"].value = "2026-12-28";
elements["housing-stay-length"].value = "14";
elements["housing-guests"].value = "2";
housingForm.requestSubmit();

assert.equal(elements["housing-search-summary"].textContent, "已為「短住／Perth WA 6000」排好適合的入口。");
assert.equal(elements["housing-primary-routes"].children[0], elements["housing-booking-link"]);
assert.equal(elements["housing-primary-routes"].children[1], elements["housing-hostelworld-link"]);
assert.equal(elements["housing-live-panel"].hidden, true, "disabled provider search must not show an empty live-results panel");
assert.match(elements["housing-booking-link"].href, /ss=Perth%2C\+Western\+Australia%2C\+Australia/);
assert.match(elements["housing-booking-link"].href, /checkout=2027-01-11/);
assert.equal(elements["housing-flatmates-link"].href, "https://flatmates.com.au/rooms/perth");
assert.equal(elements["housing-rea-link"].href, "https://www.realestate.com.au/rent/in-perth,+wa+6000/list-1");
assert.equal(elements["housing-domain-link"].href, "https://www.domain.com.au/rent/perth-wa-6000/");
assert.equal(elements["housing-search-results"].hidden, false);

elements["housing-copy-location"].dispatch("click");
assert.match(elements["housing-search-status"].textContent, /Perth WA 6000/);
assert.doesNotMatch(elements["housing-search-status"].textContent, /123 Hay St/);

housingLocation.value = "https://example.com/listing";
housingForm.requestSubmit();
assert.equal(elements["housing-search-results"].hidden, true, "invalid input must hide stale routes");
assert.match(housingLocation.validationMessage, /不要貼網址/);

housingLocation.value = "ftp://evil.example";
housingForm.requestSubmit();
assert.equal(elements["housing-search-results"].hidden, true, "any URL scheme must fail closed");
assert.match(housingLocation.validationMessage, /不要貼網址/);

housingLocation.value = "Perth NSW 6000";
housingForm.requestSubmit();
assert.equal(elements["housing-search-results"].hidden, true, "a mismatched state and postcode must fail closed");
assert.match(housingLocation.validationMessage, /不相符/);

housingLocation.value = "0800";
housingForm.requestSubmit();
assert.equal(elements["housing-search-results"].hidden, true, "postcode-only input must not claim success");
assert.match(housingLocation.validationMessage, /suburb/);

chips[1].dispatch("click");
assert.equal(elements["housing-search-summary"].textContent, "已為「短住／Darwin NT 0800」排好適合的入口。");
assert.equal(elements["housing-domain-link"].href, "https://www.domain.com.au/rent/darwin-nt-0800/");

// 五個入口在同一條滑動列裡：最符合這次住宿類型的排前面並標成 housing-route-primary，
// 其餘接在後面標成 housing-route-secondary。順序是建議，不是價格或付費排名。
const routeOrder = () =>
  elements["housing-primary-routes"].children.map(
    (child) => Object.keys(elements).find((id) => elements[id] === child).replace(/^housing-|-link$/g, ""),
  );
const routeClasses = () => elements["housing-primary-routes"].children.map((child) => child.className);

elements["housing-intent"].value = "share";
elements["housing-intent"].dispatch("change");
assert.equal(elements["housing-primary-routes"].children.length, 5, "五個平台都要留在同一條列裡");
assert.deepEqual(routeOrder(), ["flatmates", "booking", "hostelworld", "rea", "domain"]);
assert.deepEqual(routeClasses(), [
  "support-link housing-route-primary",
  "support-link housing-route-secondary",
  "support-link housing-route-secondary",
  "support-link housing-route-secondary",
  "support-link housing-route-secondary",
]);
assert.match(elements["housing-search-summary"].textContent, /Share House 單房/);

elements["housing-intent"].value = "whole";
elements["housing-intent"].dispatch("change");
assert.equal(elements["housing-primary-routes"].children.length, 5);
assert.deepEqual(routeOrder(), ["rea", "domain", "booking", "hostelworld", "flatmates"]);
assert.equal(elements["housing-primary-routes"].children[0].className, "support-link housing-route-primary");
assert.equal(elements["housing-primary-routes"].children[1].className, "support-link housing-route-primary");
assert.equal(elements["housing-primary-routes"].children[2].className, "support-link housing-route-secondary");

elements["housing-intent"].value = "rural";
elements["housing-intent"].dispatch("change");
assert.match(elements["housing-fallback-note"].textContent, /最近城鎮/);
assert.match(elements["housing-risk-note"].textContent, /薪資扣款/);

housingForm.reset();
await new Promise((resolve) => setTimeout(resolve, 1));
assert.equal(elements["housing-search-results"].hidden, true, "reset must hide generated routes");
assert.equal(elements["housing-location"].value, "");
assert.equal(elements["housing-checkin"].value, "");
assert.equal(elements["housing-stay-length"].value, "14");
assert.equal(elements["housing-guests"].value, "1");
assert.equal(elements["housing-intent"].value, "short");

const englishHarness = createHarness("en");
englishHarness.housingLocation.value = "Brisbane QLD 4000";
englishHarness.housingForm.requestSubmit();
assert.equal(
  englishHarness.elements["housing-search-summary"].textContent,
  "For temporary stay in Brisbane QLD 4000, the most relevant routes are ready."
);

const liveCalls = [];
const liveHarness = createHarness("zh-Hant", {
  apiConfig: {
    apiBaseUrl: "https://api.aussiewhvcompass.com",
    accommodationSearchEnabled: true
  },
  async fetch(url, init) {
    liveCalls.push({ url, init });
    return {
      ok: true,
      async json() {
        return {
          ok: true,
          mode: "licensed-api-plus-external-links",
          coverage: { connectedProviders: 1, listedPlatforms: 5, allMarket: false, combinedRanking: false },
          groups: [{
            provider: "booking",
            providerName: "Booking.com",
            commercialRelationship: "affiliate",
            displayAuthorization: {
              approvedPurpose: "Temporary-stay display on aussiewhvcompass.com",
              reviewedAt: "2026-08-30",
              validUntil: "2027-08-30"
            },
            listings: [{
              name: "Authorised Perth stay",
              area: "Perth WA 6000",
              priceDisplay: "A$210 total",
              stayType: "2 nights",
              url: "https://www.booking.com/hotel/au/authorised-perth.html"
            }, {
              name: "Unsafe result",
              area: "Perth",
              priceDisplay: "A$1",
              stayType: "2 nights",
              url: "https://attacker.example/fake"
            }]
          }]
        };
      }
    };
  }
});
liveHarness.housingLocation.value = "123 Hay St, Perth WA 6000";
liveHarness.elements["housing-checkin"].value = "2026-09-12";
liveHarness.elements["housing-guests"].value = "2";
liveHarness.housingForm.requestSubmit();
await new Promise((resolve) => setTimeout(resolve, 5));

assert.equal(liveCalls.length, 1, "enabled licensed search should make one request");
assert.equal(liveCalls[0].url, "https://api.aussiewhvcompass.com/api/accommodation/search");
assert.equal(liveCalls[0].init.credentials, "omit");
assert.equal(liveCalls[0].init.referrerPolicy, "no-referrer");
assert.deepEqual(JSON.parse(liveCalls[0].init.body), {
  location: "Perth WA 6000",
  checkin: "2026-09-12",
  stayLength: 14,
  guests: 2
}, "the Worker must receive only the parsed area and selected filters");
assert.equal(liveHarness.elements["housing-live-list"].hidden, false);
assert.match(liveHarness.elements["housing-live-status"].textContent, /1 個已連接平台列出 1 筆/);
const liveGroup = liveHarness.elements["housing-live-list"].children[0];
assert.equal(liveGroup.children[0].textContent, "Booking.com（聯盟合作）");
assert.match(liveGroup.children[1].textContent, /核准用途：Temporary-stay display/);
assert.equal(liveGroup.children[2].children.length, 1, "unsafe provider URLs must be discarded");
assert.equal(
  liveGroup.children[2].children[0].href,
  "https://www.booking.com/hotel/au/authorised-perth.html"
);

console.log("HOUSING SEARCH TESTS PASSED (17 cases)");
