/* 澳打指南針 — P1-24 抵澳 30 天模擬器契約回放。
   零第三方相依，以最小 DOM stub 執行真實 assets/simulator.js：
   - 角色情境白名單與 v2 sessionStorage；
   - 作答只套用一次、從攻略返回可恢復；
   - v1 進度遷移、不合法資料 fail closed；
   - 十個事件可完整走到 DAY 30。 */
import fs from "node:fs";
import vm from "node:vm";

class FakeElement {
  constructor(id = "") {
    this.id = id;
    this._textContent = "";
    this.children = [];
    this.listeners = {};
    this.attributes = {};
    this.style = {};
    this.hidden = false;
    this.disabled = false;
    this.className = "";
    this.href = "";
  }

  get textContent() {
    return this._textContent + this.children.map((child) => child.textContent || "").join("");
  }

  set textContent(value) {
    this._textContent = String(value == null ? "" : value);
    this.children = [];
  }

  addEventListener(type, handler) {
    if (!this.listeners[type]) this.listeners[type] = [];
    this.listeners[type].push(handler);
  }

  dispatch(type, event = {}) {
    const payload = { preventDefault() {}, ...event };
    for (const handler of this.listeners[type] || []) handler(payload);
  }

  appendChild(child) {
    this.children.push(child);
    return child;
  }

  querySelectorAll(selector) {
    return selector === "button" ? this.children.filter((child) => child.type === "button") : [];
  }

  setAttribute(name, value) { this.attributes[name] = String(value); }
  getAttribute(name) { return Object.prototype.hasOwnProperty.call(this.attributes, name) ? this.attributes[name] : null; }
  scrollIntoView() {}
  focus() { this.focused = true; }
}

const ids = [
  "simulator-profile-form", "profile", "simulator-stage", "simulator-finish", "simulator-day",
  "simulator-progress-label", "simulator-progress", "simulator-progress-bar", "simulator-profile-note",
  "event-tag", "event-title", "event-story", "event-question", "simulator-critical-action",
  "simulator-choices", "simulator-feedback", "feedback-title", "feedback-copy", "feedback-delta",
  "feedback-guide", "feedback-source", "simulator-next", "finish-summary", "finish-dashboard",
  "finish-actions", "stat-cash", "stat-housing", "stat-work", "stat-wellbeing", "stat-evidence",
  "simulator-event", "finish-title", "profile-title", "simulator-restart", "simulator-restart-top"
];

function createStorage(initial = {}) {
  const values = { ...initial };
  return {
    values,
    getItem(key) { return Object.prototype.hasOwnProperty.call(values, key) ? values[key] : null; },
    setItem(key, value) { values[key] = String(value); },
    removeItem(key) { delete values[key]; }
  };
}

function createHarness(options = {}) {
  const elements = Object.fromEntries(ids.map((id) => [id, new FakeElement(id)]));
  const values = {
    arrivalMonth: "7",
    landing: "regional",
    transport: "public",
    cash: "5000",
    stay: "week",
    readiness: "basic",
    support: "contact",
    goal: "safety",
    ...(options.values || {})
  };
  const form = elements["simulator-profile-form"];
  form.values = values;
  form.checkValidity = () => Object.values(values).every((value) => String(value) !== "");
  form.reportValidity = () => { form.reportedInvalid = true; };
  form.reset = () => { form.wasReset = true; };
  const sessionStorage = createStorage(options.stored || {});
  const document = {
    getElementById(id) { return elements[id] || null; },
    createElement() { return new FakeElement(); },
    createElementNS() { return new FakeElement(); }
  };
  const windowObject = {
    matchMedia: () => ({ matches: false }),
    confirm: () => options.confirm !== false
  };
  class FormDataStub {
    constructor(target) { this.values = target.values; }
    get(name) { return Object.prototype.hasOwnProperty.call(this.values, name) ? this.values[name] : null; }
  }
  const context = vm.createContext({
    document,
    window: windowObject,
    sessionStorage,
    FormData: FormDataStub,
    console
  });
  const source = fs.readFileSync(new URL("../assets/simulator.js", import.meta.url), "utf8");
  vm.runInContext(source, context, { filename: "assets/simulator.js" });
  return { elements, sessionStorage, values };
}

const failures = [];
let cases = 0;
const expect = (condition, message) => { if (!condition) throw new Error(message); };
const runCase = (name, fn) => {
  cases += 1;
  try { fn(); } catch (error) { failures.push(`${name}: ${error && error.message ? error.message : error}`); }
};
const storedState = (harness) => JSON.parse(harness.sessionStorage.values["whv-simulator-progress-v1"] || "null");

runCase("source has ten deterministic events and no network or durable storage", () => {
  const source = fs.readFileSync(new URL("../assets/simulator.js", import.meta.url), "utf8");
  expect((source.match(/day:\s*"DAY/g) || []).length === 10, "event count must be 10");
  expect(source.includes("resolveCopy"), "conditional copy resolver missing");
  expect(!source.includes("localStorage") && !source.includes("fetch("), "simulator must remain session-only and offline");
});

runCase("profile context starts a v2 session and changes the first event", () => {
  const harness = createHarness();
  harness.elements["simulator-profile-form"].dispatch("submit");
  const saved = storedState(harness);
  expect(saved.version === 2, `version ${saved && saved.version}`);
  expect(saved.state.arrivalMonth === 7 && saved.state.landing === "regional" && saved.state.transport === "public", "context whitelist not stored");
  expect(harness.elements.profile.hidden === true && harness.elements["simulator-stage"].hidden === false, "stage visibility wrong");
  expect(harness.elements["event-title"].textContent.includes("區域城鎮"), harness.elements["event-title"].textContent);
  expect(harness.elements["event-story"].textContent.includes("公共運輸"), harness.elements["event-story"].textContent);
});

runCase("a choice is applied once and remains selected after return", () => {
  const first = createHarness();
  first.elements["simulator-profile-form"].dispatch("submit");
  const button = first.elements["simulator-choices"].children[0];
  button.dispatch("click");
  button.dispatch("click");
  const afterChoice = storedState(first);
  expect(afterChoice.state.cash === 4945, `cash ${afterChoice.state.cash}`);
  expect(afterChoice.state.selectedChoice === 0, "choice not persisted");

  const restored = createHarness({ stored: { "whv-simulator-progress-v1": JSON.stringify(afterChoice) } });
  const afterReturn = storedState(restored);
  expect(afterReturn.state.cash === 4945, "return replayed delta");
  expect(restored.elements["simulator-feedback"].hidden === false, "selected feedback not restored");
  restored.elements["simulator-next"].dispatch("click");
  expect(storedState(restored).state.index === 1, "next event did not advance");
});

runCase("legacy v1 progress migrates to the corresponding event", () => {
  const legacy = {
    version: 1,
    state: { cash: 4700, housing: 55, work: 45, wellbeing: 63, evidence: 40, goal: "safety", index: 1, riskChoices: 0, selectedChoice: null, finished: false }
  };
  const harness = createHarness({ stored: { "whv-simulator-progress-v1": JSON.stringify(legacy) } });
  const saved = storedState(harness);
  expect(saved.version === 2 && saved.state.index === 2, "legacy event mapping failed");
  expect(saved.state.arrivalMonth === 1 && saved.state.landing === "perth" && saved.state.transport === "public", "legacy defaults missing");
  expect(harness.elements["event-title"].textContent.includes("bond"), harness.elements["event-title"].textContent);
});

runCase("tampered context fails closed and clears the session", () => {
  const invalid = {
    version: 2,
    state: { cash: 5000, housing: 55, work: 45, wellbeing: 63, evidence: 40, arrivalMonth: 99, landing: "regional", transport: "public", goal: "safety", index: 0, riskChoices: 0, selectedChoice: null, finished: false }
  };
  const harness = createHarness({ stored: { "whv-simulator-progress-v1": JSON.stringify(invalid) } });
  expect(storedState(harness) === null, "invalid session was not removed");
  expect(harness.elements.profile.hidden === false, "profile should remain visible");
});

runCase("all ten events can be completed without losing progress", () => {
  const harness = createHarness({ values: { arrivalMonth: "12", landing: "perth", transport: "car" } });
  harness.elements["simulator-profile-form"].dispatch("submit");
  for (let index = 0; index < 10; index += 1) {
    expect(storedState(harness).state.index === index, `expected event ${index}`);
    harness.elements["simulator-choices"].children[0].dispatch("click");
    harness.elements["simulator-next"].dispatch("click");
  }
  const saved = storedState(harness);
  expect(saved.state.finished === true && saved.state.index === 9, "finish state not persisted");
  expect(harness.elements["simulator-finish"].hidden === false, "finish panel not shown");
  expect(harness.elements["finish-summary"].textContent.includes("12 月") && harness.elements["finish-summary"].textContent.includes("自己開車"), harness.elements["finish-summary"].textContent);
});

if (failures.length) {
  console.error(`SIMULATOR TEST FAIL (${failures.length}/${cases})`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}
console.log(`SIMULATOR TEST PASS (${cases} cases)`);
