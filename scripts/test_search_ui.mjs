/* 搜尋 UI 恢復契約：直接回放 main.js 搜尋區塊，無網路、無新增相依。
   重用 clarifier-contract.mjs 的 DOM 替身；此測試控制 script 的 load/error 與計時器，
   可重現載入失敗、重試、逾時、關閉後晚回應及中文 IME 組字。
   原生 dialog、真實 Tab 順序與手機鍵盤仍需瀏覽器驗證。 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const fixtureSource = read("scripts/clarifier-contract.mjs");
const fixtureStart = fixtureSource.indexOf("const VOID_TAGS =");
const fixtureEnd = fixtureSource.indexOf("/* ==================== 測試框架");
assert(fixtureStart >= 0 && fixtureEnd > fixtureStart, "缺少共用 DOM 替身邊界");
const fixtureContext = vm.createContext({});
vm.runInContext(fixtureSource.slice(fixtureStart, fixtureEnd) + "\nthis.fixture = { parseDocument, DomNode };", fixtureContext);
const { parseDocument, DomNode } = fixtureContext.fixture;

const mainSource = read("assets/main.js");
const searchStart = mainSource.indexOf("// ---------- 全站搜尋");
const searchEnd = mainSource.indexOf("// ---------- 各地社群", searchStart);
assert(searchStart >= 0 && searchEnd > searchStart, "缺少 main.js 搜尋區塊邊界");
const searchSource = "var activeNavLink = null;\n" + mainSource.slice(searchStart, searchEnd);
const indexSource = read("assets/search-index.js");

function createHarness({ preload = false, appendThrows = false } = {}) {
  const document = parseDocument(read("index.html"));
  const timers = new Map();
  let timerId = 0;
  class Event {
    constructor(type, init = {}) {
      this.type = type;
      this.bubbles = true;
      this.cancelable = true;
      this.defaultPrevented = false;
      this.target = null;
      this.currentTarget = null;
      Object.assign(this, init);
    }
    preventDefault() { this.defaultPrevented = true; }
  }
  class CustomEvent extends Event {
    constructor(type, init = {}) { super(type, init); this.detail = init.detail; }
  }
  const window = {
    document, Event, CustomEvent, console,
    matchMedia: () => ({ matches: false, addEventListener() {}, addListener() {} }),
    requestAnimationFrame: (fn) => fn(),
    setTimeout(fn, ms) { const id = ++timerId; timers.set(id, { fn, ms }); return id; },
    clearTimeout(id) { timers.delete(id); },
    listeners: new Map(),
    addEventListener: DomNode.prototype.addEventListener,
    removeEventListener: DomNode.prototype.removeEventListener,
    invokeListeners: DomNode.prototype.invokeListeners,
    dispatchEvent(event) { event.target = window; window.invokeListeners(event); return !event.defaultPrevented; },
    parentNode: null
  };
  window.window = window;
  document.defaultView = window;
  const context = vm.createContext(window);
  if (preload) vm.runInContext(indexSource, context);
  vm.runInContext(searchSource, context, { filename: "assets/main.js (search UI)" });
  const append = document.head.appendChild.bind(document.head);
  if (appendThrows) document.head.appendChild = () => { throw new Error("script append blocked"); };
  const byId = (id) => document.getElementById(id);
  const emit = (target, type, init = {}) => target.dispatchEvent(new Event(type, init));
  const pendingScripts = () => document.head.querySelectorAll("script").filter((script) => String(script.src || "").startsWith("assets/search-index.js"));
  const finishLoad = (script = pendingScripts()[0]) => {
    assert(script && typeof script.onload === "function", "缺少 pending script.onload");
    vm.runInContext(indexSource, context);
    script.onload();
  };
  const open = (query = "退稅", source = byId("clarifier-search-open")) => {
    source.focus();
    window.openWhvSearch(query, source);
  };
  const close = () => emit(byId("site-search-dialog").querySelector(".site-search-close"), "click");
  return { window, document, timers, byId, emit, open, close, pendingScripts, finishLoad,
    restoreAppend() { document.head.appendChild = append; } };
}

const flush = async () => { for (let i = 0; i < 8; i += 1) await Promise.resolve(); };
const failures = [];
let cases = 0;
async function test(name, run) {
  cases += 1;
  try { await run(); }
  catch (error) { failures.push(name + ": " + error.message); }
}
const unhandled = [];
const onUnhandled = (error) => unhandled.push(error);
process.on("unhandledRejection", onUnhandled);

await test("failure → retry → success，清理 script、handler、timer，保留查詢", async () => {
  const h = createHarness();
  h.open();
  assert.equal(h.document.activeElement, h.byId("site-search-input"), "開啟立即聚焦搜尋框");
  const failed = h.pendingScripts()[0];
  failed.onerror();
  await flush();
  assert.equal(h.pendingScripts().length, 0);
  assert.equal(h.timers.size, 0);
  assert.equal(failed.onload, null);
  assert.equal(failed.onerror, null);
  assert.equal(h.byId("site-search-retry").hidden, false);
  assert.match(h.byId("site-search-status").textContent, /無法載入/);
  h.byId("site-search-retry").focus();
  h.emit(h.byId("site-search-retry"), "click");
  assert.equal(h.document.activeElement, h.byId("site-search-input"));
  assert.equal(h.byId("site-search-retry").hidden, true);
  assert.equal(h.pendingScripts().length, 1, "重試必須建立新 script");
  assert.notEqual(h.pendingScripts()[0], failed);
  h.finishLoad();
  await flush();
  assert.equal(h.byId("site-search-input").value, "退稅");
  assert(h.byId("site-search-results").querySelector('a[href="leave.html#tax"]'));
  assert.equal(h.byId("site-search-results").getAttribute("aria-busy"), "false");
  assert.equal(h.pendingScripts().length, 0);
  assert.equal(h.timers.size, 0);
});

await test("載入完成不搶已移到熱門問題的焦點", async () => {
  const h = createHarness();
  h.open();
  const hot = h.byId("site-search-dialog").querySelector(".site-search-quick a");
  hot.focus();
  h.finishLoad();
  await flush();
  assert.equal(h.document.activeElement, hot);
});

await test("pending 中關閉，回到原入口，晚回應不重繪，立即重開可再載入", async () => {
  const h = createHarness();
  const source = h.byId("clarifier-search-open");
  h.open("退稅", source);
  const oldScript = h.pendingScripts()[0];
  const lateOnload = oldScript.onload;
  const status = h.byId("site-search-status").textContent;
  h.close();
  assert.equal(h.document.activeElement, source);
  assert.equal(h.pendingScripts().length, 0);
  assert.equal(h.timers.size, 0);
  lateOnload();
  await flush();
  assert.equal(h.document.activeElement, source);
  assert.equal(h.byId("site-search-status").textContent, status);
  assert.equal(h.byId("site-search-results").children.length, 0);
  assert.equal(h.byId("site-search-retry").hidden, true);
  h.open("英文很爛");
  assert.equal(h.pendingScripts().length, 1);
  h.finishLoad();
  await flush();
  assert(h.byId("site-search-results").querySelector('a[href^="english.html"]'));
});

await test("已 resolve 但回呼未執行時關閉，同樣不重繪或搶焦點", async () => {
  const h = createHarness();
  const source = h.byId("site-search-home-input");
  h.open("退稅", source);
  h.finishLoad();
  h.close();
  await flush();
  assert.equal(h.document.activeElement, source);
  assert.equal(h.byId("site-search-results").children.length, 0);
});

await test("關閉後不等待舊 Promise，立即重開由新請求接手", async () => {
  const h = createHarness();
  h.open("退稅");
  const first = h.pendingScripts()[0];
  h.close();
  h.open("英文很爛");
  assert.equal(h.pendingScripts().length, 1);
  assert.notEqual(h.pendingScripts()[0], first);
  h.finishLoad();
  await flush();
  assert.equal(h.byId("site-search-retry").hidden, true);
  assert.equal(h.document.activeElement, h.byId("site-search-input"));
  assert(h.byId("site-search-results").querySelector('a[href^="english.html"]'));
});

await test("10 秒逾時會清理資源且可重試", async () => {
  const h = createHarness();
  h.open();
  const timeout = [...h.timers.values()].find((timer) => timer.ms === 10000);
  assert(timeout, "搜尋資源必須有載入期限");
  timeout.fn();
  await flush();
  assert.equal(h.timers.size, 0);
  assert.equal(h.pendingScripts().length, 0);
  assert.equal(h.byId("site-search-retry").hidden, false);
  h.emit(h.byId("site-search-retry"), "click");
  h.finishLoad();
  await flush();
  assert(h.byId("site-search-results").querySelector("li a"));
});

await test("invalid onload 與 append 失敗均收斂成可恢復的 UI", async () => {
  const h = createHarness();
  h.open();
  h.pendingScripts()[0].onload();
  await flush();
  assert.equal(h.byId("site-search-retry").hidden, false);
  assert.equal(h.pendingScripts().length, 0);
  const blocked = createHarness({ appendThrows: true });
  blocked.open();
  await flush();
  assert.equal(blocked.timers.size, 0);
  assert.equal(blocked.byId("site-search-retry").hidden, false);
  blocked.restoreAppend();
  blocked.emit(blocked.byId("site-search-retry"), "click");
  blocked.finishLoad();
  await flush();
  assert(blocked.byId("site-search-results").querySelector("li a"));
});

await test("input／submit 的失敗有 UI 回應，pending 共享且最新查詢為準", async () => {
  const h = createHarness();
  h.open();
  const input = h.byId("site-search-input");
  input.value = "英文很爛";
  h.emit(input, "input");
  h.emit(h.byId("site-search-form"), "submit");
  assert.equal(h.pendingScripts().length, 1);
  h.pendingScripts()[0].onerror();
  await flush();
  assert.equal(h.byId("site-search-retry").hidden, false);
  h.emit(h.byId("site-search-form"), "submit");
  h.finishLoad();
  await flush();
  assert(h.byId("site-search-results").querySelector('a[href^="english.html"]'));
});

await test("IME 組字期間不重繪，完成才搜尋，組字 Enter 不送出", async () => {
  const h = createHarness({ preload: true });
  h.open();
  await flush();
  const input = h.byId("site-search-input");
  const before = h.byId("site-search-results").innerHTML;
  h.emit(input, "compositionstart");
  input.value = "英";
  h.emit(input, "input", { isComposing: true });
  h.emit(h.byId("site-search-form"), "submit", { isComposing: true });
  await flush();
  assert.equal(h.byId("site-search-results").innerHTML, before);
  input.value = "英文很爛";
  h.emit(input, "compositionend");
  await flush();
  assert(h.byId("site-search-results").querySelector('a[href^="english.html"]'));
  const dialog = h.byId("site-search-dialog");
  h.close();
  h.emit(h.document.body, "keydown", { key: "/", isComposing: true });
  assert.equal(dialog.open, false, "組字中的斜線不得開搜尋");
  h.emit(input, "compositionend");
  await flush();
  assert.equal(dialog.open, false);
  assert.equal(h.pendingScripts().length, 0, "關閉後 compositionend 不載入資源");
});

await test("Escape／原生 cancel 回到來源，隱藏或移除的來源回到 header 搜尋", async () => {
  const h = createHarness({ preload: true });
  const source = h.byId("clarifier-search-open");
  h.open("退稅", source);
  const event = new h.window.Event("cancel");
  h.byId("site-search-dialog").dispatchEvent(event);
  assert.equal(event.defaultPrevented, true);
  assert.equal(h.document.activeElement, source);
  h.open("退稅", source);
  source.hidden = true;
  h.emit(h.byId("site-search-input"), "keydown", { key: "Escape" });
  assert.equal(h.document.activeElement, h.document.querySelector(".site-search-open"));
  source.hidden = false;
  h.open("退稅", source);
  source.remove();
  h.close();
  assert.equal(h.document.activeElement, h.document.querySelector(".site-search-open"));
  await flush();
});

await test("CSS 隱藏的手機來源或 disabled 來源，關閉時回到可見 header 搜尋", async () => {
  const h = createHarness({ preload: true });
  const source = h.byId("clarifier-search-open");
  // DOM 替身沒有版面引擎：用幾何結果模擬手機入口原先可見，切桌機後祖先 display:none。
  // 不加 hidden，確保這個案例不能被既有 [hidden] 檢查誤判為通過。
  let sourceVisible = true;
  source.getClientRects = () => sourceVisible ? [source.getBoundingClientRect()] : [];
  h.open("退稅", source);
  assert.equal(source.closest("[hidden]"), null);
  sourceVisible = false;
  h.close();
  assert.equal(h.document.activeElement, h.document.querySelector(".site-search-open"));

  sourceVisible = true;
  h.open("退稅", source);
  h.close();
  assert.equal(h.document.activeElement, source, "幾何可見的原入口仍應接回焦點");

  const disabledSource = h.document.createElement("button");
  disabledSource.getClientRects = () => [disabledSource.getBoundingClientRect()];
  h.document.body.appendChild(disabledSource);
  h.open("退稅", disabledSource);
  disabledSource.disabled = true;
  h.close();
  assert.equal(h.document.activeElement, h.document.querySelector(".site-search-open"));
  await flush();
});

await test("IME Escape 先取消候選；組字完成後 Escape 才關閉搜尋", async () => {
  const h = createHarness({ preload: true });
  h.open();
  await flush();
  const input = h.byId("site-search-input");
  const dialog = h.byId("site-search-dialog");
  h.emit(input, "compositionstart");
  const candidateEscape = new h.window.Event("keydown", { key: "Escape" });
  input.dispatchEvent(candidateEscape);
  assert.equal(dialog.open, true);
  assert.equal(candidateEscape.defaultPrevented, false, "組字中的 Escape 留給 IME");
  assert.equal(h.document.activeElement, input);
  const candidateCancel = new h.window.Event("cancel");
  dialog.dispatchEvent(candidateCancel);
  assert.equal(candidateCancel.defaultPrevented, true, "原生 cancel 不得繞過 IME 保護");
  assert.equal(dialog.open, true);
  h.emit(input, "compositionend");
  await flush();
  h.emit(input, "keydown", { key: "Escape", isComposing: true });
  assert.equal(dialog.open, true, "事件標示 isComposing 時仍不關閉");
  h.emit(input, "keydown", { key: "Escape", keyCode: 229 });
  assert.equal(dialog.open, true, "IME keyCode 229 時仍不關閉");
  const finalEscape = new h.window.Event("keydown", { key: "Escape" });
  input.dispatchEvent(finalEscape);
  assert.equal(finalEscape.defaultPrevented, true);
  assert.equal(dialog.open, false);
  assert.equal(h.document.activeElement, h.byId("clarifier-search-open"));
});

await new Promise((resolve) => setImmediate(resolve));
process.removeListener("unhandledRejection", onUnhandled);
assert.equal(unhandled.length, 0, "搜尋事件不得產生 unhandled rejection");
if (failures.length) {
  failures.forEach((failure) => console.error("FAIL " + failure));
  process.exit(1);
}
console.log(`SEARCH UI TESTS PASSED (${cases} cases)`);
