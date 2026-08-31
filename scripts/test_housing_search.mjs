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
  }

  addEventListener(type, handler) {
    if (!this.listeners[type]) this.listeners[type] = [];
    this.listeners[type].push(handler);
  }

  dispatch(type) {
    const event = { preventDefault() {} };
    for (const handler of this.listeners[type] || []) handler(event);
  }

  getAttribute(name) {
    return this.attributes[name] || null;
  }

  setCustomValidity(message) {
    this.validationMessage = message;
  }

  scrollIntoView() {}
}

function createHarness(lang = "zh-Hant") {
  const elements = {};
  const add = (id, options) => {
    elements[id] = new FakeElement(options);
    return elements[id];
  };
  const housingTool = add("housing-search-tool", { hidden: true });
  const housingForm = add("housing-search-form");
  const housingLocation = add("housing-location");
  add("housing-checkin");
  add("housing-stay-length", { value: "14" });
  add("housing-guests", { value: "1" });
  add("housing-search-results", { hidden: true });
  add("housing-search-summary");
  add("housing-search-status");
  add("housing-copy-location");

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
    getElementById(id) { return elements[id] || null; }
  };
  const context = vm.createContext({
    URL,
    Date,
    Event,
    Promise,
    navigator: {},
    document,
    window: { matchMedia: () => ({ matches: false }) },
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

housingLocation.value = "123 Hay St, Perth WA 6000, Australia";
elements["housing-checkin"].value = "2026-12-28";
elements["housing-stay-length"].value = "14";
elements["housing-guests"].value = "2";
housingForm.requestSubmit();

assert.equal(elements["housing-search-summary"].textContent, "已為 Perth WA 6000 建立五個平台入口。");
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
assert.equal(elements["housing-search-summary"].textContent, "已為 Darwin NT 0800 建立五個平台入口。");
assert.equal(elements["housing-domain-link"].href, "https://www.domain.com.au/rent/darwin-nt-0800/");

housingForm.reset();
await new Promise((resolve) => setTimeout(resolve, 1));
assert.equal(elements["housing-search-results"].hidden, true, "reset must hide generated routes");
assert.equal(elements["housing-location"].value, "");
assert.equal(elements["housing-checkin"].value, "");
assert.equal(elements["housing-stay-length"].value, "14");
assert.equal(elements["housing-guests"].value, "1");

const englishHarness = createHarness("en");
englishHarness.housingLocation.value = "Brisbane QLD 4000";
englishHarness.housingForm.requestSubmit();
assert.equal(
  englishHarness.elements["housing-search-summary"].textContent,
  "Five platform routes prepared for Brisbane QLD 4000."
);

console.log("HOUSING SEARCH TESTS PASSED (10 cases)");
