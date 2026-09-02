/* 澳打指南針 — 互動工具固定案例回放（docs/SPEC.md §4 原人工步驟；ROADMAP §3）
   用 node 直接驅動 assets/tools.js（DOM stub，無第三方依賴），載入真實 assets/postcodes.js：
   1. 集簽郵遞區號初篩測試組（7 案例）＋輸入邊界；
   2. 存錢試算器基準（33.05 x 38h、住宿 250、其他 240）＋ 0 工時負餘額。
   顯示值與數值對應：畫面文字經 fmt() = "$" + Math.round(n).toLocaleString("en-AU")；
   本檔同時斷言畫面文字（SPEC 基準字面）與 tools.js 寫入 whv-save-calc-v1 的原始數值。 */
import fs from "node:fs";
import vm from "node:vm";

const stripTags = (html) => String(html).replace(/<[^>]*>/g, "");

class FakeElement {
  constructor(options = {}) {
    this.id = options.id || "";
    this.value = options.value === undefined ? "" : String(options.value);
    this.defaultValue = this.value;
    this.min = options.min === undefined ? "" : String(options.min);
    this.max = options.max === undefined ? "" : String(options.max);
    this.textContent = options.textContent || "";
    this.className = "";
    this.disabled = false;
    this.hidden = options.hidden === true;
    this.style = {};
    this.attributes = options.attributes || {};
    this.options = options.options || [];
    this.listeners = {};
    this.children = [];
    this.innerHTMLValue = "";
  }

  get innerHTML() {
    return this.innerHTMLValue;
  }

  set innerHTML(html) {
    this.innerHTMLValue = String(html);
    this.textContent = stripTags(html);
  }

  get selectedOptions() {
    const selected = this.options.filter((option) => option.value === this.value);
    return selected.length ? selected : this.options.slice(0, 1);
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

  querySelectorAll() {
    return [];
  }

  setCustomValidity(message) {
    this.validationMessage = message;
  }

  scrollIntoView() {}

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

const OPTION_TEXT = {
  "zh-Hant": {
    plant: "動植物栽培／漁業採珠／植林伐木／採礦／營建",
    tourism: "觀光與餐旅",
    bushfire: "火災復原",
    disaster: "天災復原",
    city: { 180: "$180／週", 250: "$250／週", 350: "$350／週", 500: "$500／週" },
    life: { 160: "省到極致（伙食雜支 $160/週）", 240: "一般規劃（$240／週）", 340: "社交與移動較多（$340／週）" }
  },
  en: {
    plant: "Cultivation, fishing, forestry, mining or construction",
    tourism: "Tourism and hospitality",
    bushfire: "Bushfire recovery",
    disaster: "Natural-disaster recovery",
    city: { 180: "AUD 180 per week", 250: "AUD 250 per week", 350: "AUD 350 per week", 500: "AUD 500 per week" },
    life: { 160: "AUD 160 — very lean", 240: "AUD 240 — moderate planning case", 340: "AUD 340 — more travel and social spending" }
  }
};

function createHarness(lang = "zh-Hant", options = {}) {
  const text = OPTION_TEXT[lang];
  const elements = {};
  const add = (id, elementOptions = {}) => {
    elements[id] = new FakeElement({ ...elementOptions, id });
    return elements[id];
  };

  /* visa.html #postcode-tool */
  const pcTool = add("postcode-tool");
  add("pc-status");
  add("pc-input");
  add("pc-cat", {
    value: "plant",
    options: ["plant", "tourism", "bushfire", "disaster"].map((value) => ({ value, textContent: text[value] }))
  });
  add("pc-result");
  add("pc-check");
  const chips = ["4870", "4670", "3630", "2680", "0800", "7000"].map(
    (pc) => new FakeElement({ attributes: { "data-pc": pc } })
  );
  const pcControls = [elements["pc-input"], elements["pc-cat"], elements["pc-check"], ...chips];
  pcTool.querySelectorAll = (selector) => {
    if (selector === ".chip[data-pc]") return chips;
    if (selector === "input, select, button") return pcControls;
    return [];
  };

  /* cost.html #save-calc */
  add("save-calc");
  add("calc-rate", { value: "33.05", min: "20", max: "60" });
  add("calc-hours", { value: "38", min: "0", max: "50" });
  add("calc-city", {
    value: "250",
    options: Object.keys(text.city).map((value) => ({ value, textContent: text.city[value] }))
  });
  add("calc-life", {
    value: "240",
    options: Object.keys(text.life).map((value) => ({ value, textContent: text.life[value] }))
  });
  for (const id of [
    "calc-rate-out", "calc-hours-out", "calc-gross", "calc-net", "calc-exp", "calc-save",
    "calc-super", "calc-year", "calc-tax", "calc-twd", "calc-verdict"
  ]) add(id);

  const stored = {};
  const localStorage = {
    getItem(key) { return Object.prototype.hasOwnProperty.call(stored, key) ? stored[key] : null; },
    setItem(key, value) { stored[key] = String(value); },
    removeItem(key) { delete stored[key]; }
  };
  const document = {
    documentElement: { lang },
    getElementById(id) { return elements[id] || null; },
    createElement() { return new FakeElement(); },
    querySelectorAll() { return []; }
  };
  const windowObject = {
    matchMedia: () => ({ matches: false })
  };
  const context = vm.createContext({
    URL,
    Date,
    Event,
    Promise,
    AbortController,
    navigator: {},
    document,
    location: { hostname: "www.aussiewhvcompass.com" },
    window: windowObject,
    localStorage,
    setTimeout,
    clearTimeout,
    console
  });
  if (options.loadPostcodes !== false) {
    const postcodeSource = fs.readFileSync(new URL("../assets/postcodes.js", import.meta.url), "utf8");
    vm.runInContext(postcodeSource, context, { filename: "assets/postcodes.js" });
  }
  const toolSource = fs.readFileSync(new URL("../assets/tools.js", import.meta.url), "utf8");
  vm.runInContext(toolSource, context, { filename: "assets/tools.js" });
  return { elements, chips, stored, windowObject };
}

const failures = [];
let cases = 0;

function runCase(name, fn) {
  cases += 1;
  try {
    fn();
  } catch (error) {
    failures.push(`${name}: ${error && error.message ? error.message : error}`);
  }
}

function expect(condition, message) {
  if (!condition) throw new Error(message);
}

function verdictOf(out) {
  const ok = /class="result-verdict result-ok"/.test(out.innerHTML);
  const no = /class="result-verdict result-no"/.test(out.innerHTML);
  if (ok && !no) return "YES";
  if (no && !ok) return "NO";
  return "NONE";
}

function checkPostcode(harness, postcode, category, trigger = "click") {
  const { elements } = harness;
  elements["pc-input"].value = postcode;
  elements["pc-cat"].value = category;
  if (trigger === "enter") elements["pc-input"].dispatch("keydown", { key: "Enter" });
  else elements["pc-check"].dispatch("click");
  return elements["pc-result"];
}

function toNumber(display) {
  return Number(String(display).replace(/[^0-9.-]/g, ""));
}

let harness;
try {
  harness = createHarness();
} catch (error) {
  console.error(`FAIL harness: tools.js could not be evaluated: ${error && error.stack ? error.stack : error}`);
  process.exit(1);
}

/* ---------- 集簽郵遞區號初篩：SPEC §4 測試組（7 案例） ---------- */
const POSTCODE_SET = [
  { pc: "4880", cat: "plant", expected: "YES", state: "QLD" },
  { pc: "2000", cat: "plant", expected: "NO", state: "NSW" },
  { pc: "0870", cat: "tourism", expected: "YES", state: "NT" },
  { pc: "7215", cat: "tourism", expected: "YES", state: "TAS" },
  { pc: "3000", cat: "tourism", expected: "NO", state: "VIC" },
  { pc: "5000", cat: "plant", expected: "YES", state: "SA" },
  { pc: "2615", cat: "bushfire", expected: "YES", state: "ACT" }
];
for (const item of POSTCODE_SET) {
  runCase(`postcode ${item.pc}/${item.cat}=${item.expected}`, () => {
    const out = checkPostcode(harness, item.pc, item.cat);
    const actual = verdictOf(out);
    expect(actual === item.expected, `expected ${item.expected} but tools.js rendered ${actual}: ${out.textContent}`);
    expect(out.style.display === "block", "result card must be shown");
    expect(out.textContent.includes(`郵遞區號 ${item.pc}（${item.state}）`), `state should be ${item.state}: ${out.textContent}`);
    expect(out.textContent.includes(`「${OPTION_TEXT["zh-Hant"][item.cat]}」`), "category label must be echoed");
    expect(out.textContent.includes("2026-08-29"), "result must cite the archived list date");
    expect(out.innerHTML.includes('href="https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/work-holiday-417/specified-work"'), "result must link the current Home Affairs page");
    expect(harness.elements["pc-status"].textContent === out.textContent, "live region must announce the result");
    if (item.expected === "NO") {
      expect(out.textContent.includes("這不是簽證資格判定"), "a NO must disclaim visa eligibility judgement");
    }
  });
}

/* ---------- 集簽：輸入邊界與觸發路徑 ---------- */
runCase("postcode non-numeric input asks for 4 digits", () => {
  const out = checkPostcode(harness, "abc", "plant");
  expect(verdictOf(out) === "NONE", `no verdict class expected: ${out.innerHTML}`);
  expect(out.textContent.includes("請輸入 4 位數郵遞區號"), out.textContent);
});
runCase("postcode outside Australian ranges is rejected", () => {
  const out = checkPostcode(harness, "1234", "plant");
  expect(verdictOf(out) === "NO", `expected NO: ${out.innerHTML}`);
  expect(out.textContent.includes("這不像是澳洲的郵遞區號"), out.textContent);
});
runCase("postcode Enter key triggers the same check", () => {
  const out = checkPostcode(harness, "4880", "plant", "enter");
  expect(verdictOf(out) === "YES", `expected YES via Enter: ${out.textContent}`);
});
runCase("postcode chip 0800 fills the input and checks tourism as NT", () => {
  harness.elements["pc-cat"].value = "tourism";
  harness.chips[4].dispatch("click");
  expect(harness.elements["pc-input"].value === "0800", "chip must keep the leading zero");
  const out = harness.elements["pc-result"];
  expect(verdictOf(out) === "YES", `expected YES for 0800/tourism: ${out.textContent}`);
  expect(out.textContent.includes("郵遞區號 0800（NT）"), out.textContent);
});
runCase("postcode tool fails closed when postcodes.js is missing", () => {
  const bare = createHarness("zh-Hant", { loadPostcodes: false });
  const out = bare.elements["pc-result"];
  expect(out.style.display === "block" && out.textContent.includes("郵遞區號資料未能載入"), out.textContent);
  expect(bare.elements["pc-check"].disabled === true && bare.elements["pc-input"].disabled === true, "controls must be disabled");
  expect(bare.elements["pc-status"].textContent === out.textContent, "live region must announce the outage");
});
runCase("postcode English page 4880/plant=YES", () => {
  const english = createHarness("en");
  const out = checkPostcode(english, "4880", "plant");
  expect(verdictOf(out) === "YES", `expected YES: ${out.textContent}`);
  expect(out.textContent.includes("Postcode 4880 (QLD)"), out.textContent);
  expect(out.textContent.includes("matches the archived subclass 417 postcode table retrieved on 29 August 2026"), out.textContent);
});

/* ---------- 存錢試算器：SPEC §4 基準 ---------- */
const CALC_KEY = "whv-save-calc-v1";
const near = (actual, expected, tolerance = 0.005) => Math.abs(actual - expected) < tolerance;
const readStoredCalc = (h) => JSON.parse(h.stored[CALC_KEY] || "null");

const calcHarness = createHarness();
const calcText = (h, id) => h.elements[id].textContent;

runCase("calculator baseline gross week $1,256", () => {
  expect(calcText(calcHarness, "calc-rate-out") === "$33.05", calcText(calcHarness, "calc-rate-out"));
  expect(calcText(calcHarness, "calc-hours-out") === "38 小時", calcText(calcHarness, "calc-hours-out"));
  expect(calcText(calcHarness, "calc-gross") === "$1,256", `calc-gross rendered ${calcText(calcHarness, "calc-gross")}`);
});
runCase("calculator baseline annual tax $10,581", () => {
  expect(calcText(calcHarness, "calc-tax") === "$10,581", `calc-tax rendered ${calcText(calcHarness, "calc-tax")}`);
});
runCase("calculator baseline after-tax work week $1,026", () => {
  expect(calcText(calcHarness, "calc-net") === "$1,026", `calc-net rendered ${calcText(calcHarness, "calc-net")}`);
});
runCase("calculator baseline annual remainder $21,710", () => {
  expect(calcText(calcHarness, "calc-year") === "$21,710", `calc-year rendered ${calcText(calcHarness, "calc-year")}`);
});
runCase("calculator baseline derived weekly figures", () => {
  expect(calcText(calcHarness, "calc-exp") === "$490", `calc-exp rendered ${calcText(calcHarness, "calc-exp")}`);
  expect(calcText(calcHarness, "calc-save") === "$536", `calc-save rendered ${calcText(calcHarness, "calc-save")}`);
  expect(calcText(calcHarness, "calc-super") === "$151", `calc-super rendered ${calcText(calcHarness, "calc-super")}`);
  expect(calcText(calcHarness, "calc-twd") === "約 NT$49.5 萬", `calc-twd rendered ${calcText(calcHarness, "calc-twd")}`);
  const verdict = calcHarness.elements["calc-verdict"];
  expect(verdict.className === "result-verdict result-ok", `verdict class ${verdict.className}`);
  expect(verdict.textContent.includes("規劃上可行"), verdict.textContent);
});
runCase("calculator baseline raw numbers stored in whv-save-calc-v1", () => {
  const saved = readStoredCalc(calcHarness);
  expect(saved !== null, "tools.js must persist the latest result locally");
  expect(saved.rate === 33.05 && saved.hours === 38, `inputs ${saved.rate} x ${saved.hours}`);
  expect(near(saved.gross, 1255.9), `gross ${saved.gross}`);
  expect(near(saved.annualGross, 57771.4), `annualGross ${saved.annualGross}`);
  expect(near(saved.annualTax, 10581.42), `annualTax ${saved.annualTax}`);
  expect(near(saved.net, 1025.87), `net ${saved.net}`);
  expect(saved.expenses === 490, `expenses ${saved.expenses}`);
  expect(near(saved.yearlySave, 21709.98), `yearlySave ${saved.yearlySave}`);
  expect(saved.incomeWeeks === 46 && saved.expenseWeeks === 52, "46 income weeks and 52 expense weeks");
  expect(saved.cityLabel === "$250／週" && saved.lifeLabel === "一般規劃（$240／週）", "selected option labels");
});
runCase("calculator 0 hours gives a negative annual remainder and the shortfall warning", () => {
  calcHarness.elements["calc-hours"].value = "0";
  calcHarness.elements["calc-hours"].dispatch("input");
  const year = calcText(calcHarness, "calc-year");
  expect(toNumber(year) === -25480, `calc-year rendered ${year}`);
  expect(calcText(calcHarness, "calc-gross") === "$0" && calcText(calcHarness, "calc-tax") === "$0", "no income means no gross or tax");
  const verdict = calcHarness.elements["calc-verdict"];
  expect(verdict.className === "result-verdict result-no", `verdict class ${verdict.className}`);
  expect(verdict.textContent.includes("入不敷出"), verdict.textContent);
  const saved = readStoredCalc(calcHarness);
  expect(saved.hours === 0 && saved.yearlySave === -25480, `stored yearlySave ${saved.yearlySave}`);
});
runCase("calculator English page shows covered weeks for the baseline", () => {
  const english = createHarness("en");
  expect(calcText(english, "calc-hours-out") === "38 hours", calcText(english, "calc-hours-out"));
  expect(calcText(english, "calc-gross") === "$1,256" && calcText(english, "calc-year") === "$21,710", "English figures must match");
  expect(calcText(english, "calc-twd") === "96.3 weeks", `calc-twd rendered ${calcText(english, "calc-twd")}`);
  expect(english.elements["calc-verdict"].textContent.includes("A workable planning range"), english.elements["calc-verdict"].textContent);
});

if (failures.length) {
  for (const failure of failures) console.error(`FAIL ${failure}`);
  console.error(`TOOL TESTS FAILED (${failures.length} of ${cases} cases)`);
  process.exit(1);
}
console.log(`TOOL TESTS PASSED (${cases} cases)`);
