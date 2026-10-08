/* 站內找答案替代模式：完整 main.js 的無網路 DOM 回放。
   覆蓋 local 零外送、真實索引路由、過期答案、模糊拒選、remote 契約與取消晚回覆。
   共用既有 DOM 替身，不增加瀏覽器或套件相依；真實畫面另做瀏覽器驗收。 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const contract = read("scripts/clarifier-contract.mjs");
const fixtureStart = contract.indexOf("const VOID_TAGS =");
const fixtureEnd = contract.indexOf("/* ==================== 測試框架");
const harnessStart = contract.indexOf("function createHarness(");
const harnessEnd = contract.indexOf("const visibleText =", harnessStart);
assert(fixtureStart >= 0 && fixtureEnd > fixtureStart && harnessStart >= 0 && harnessEnd > harnessStart);
const host = vm.createContext({
  read, vm, indexHtml: read("index.html"), mainJs: read("assets/main.js"),
  STAGES: ["considering", "committed", "in-australia", "next-step"],
  URL, URLSearchParams, AbortController, console, setTimeout, clearTimeout
});
vm.runInContext(contract.slice(fixtureStart, fixtureEnd) + contract.slice(harnessStart, harnessEnd) + "\nthis.makeHarness = createHarness;", host);

function harness(options = {}) {
  const timers = new Map();
  let nextTimer = 0;
  const h = host.makeHarness({
    setTimeout(fn, ms) { const id = ++nextTimer; timers.set(id, { fn, ms }); return id; },
    clearTimeout(id) { timers.delete(id); },
    ...options
  });
  h.timers = timers;
  h.open = () => h.click(h.byId("assist-open"));
  h.submit = (question) => {
    h.byId("assist-input").value = question;
    h.byId("assist-form").dispatchEvent(new h.Event("submit", { bubbles: true, cancelable: true }));
  };
  h.result = () => h.byId("assist-answer").textContent;
  h.answerLinks = () => h.byId("assist-answer").querySelectorAll("a").map((a) => a.href);
  h.stubFetch = (reply) => {
    h.window.fetch = (url, init) => {
      h.fetchCalls.push({ url: String(url), init });
      return typeof reply === "function" ? reply(url, init) : Promise.resolve(reply);
    };
  };
  h.verify = (token = "test-turnstile-token") => {
    h.window.turnstile = {
      render(_slot, options) { options.callback(token); return "test-widget"; },
      reset() {}
    };
  };
  return h;
}

const localConfig = { assistMode: "local", assistEnabled: true, apiBaseUrl: "", turnstileSiteKey: "" };
const remoteConfig = { assistMode: "remote", assistEnabled: true, assistProvider: "minimax", apiBaseUrl: "https://api.example.test", turnstileSiteKey: "1x00000000000000000000AA" };
const flush = async () => { for (let i = 0; i < 20; i += 1) await Promise.resolve(); };
const response = (status, body) => ({ status, ok: status >= 200 && status < 300, json: () => Promise.resolve(body) });
const noExternalCalls = (h) => {
  assert.equal(h.fetchCalls.length, 0, "本機查找不可發出 fetch");
  assert.equal(h.document.getElementById("turnstile-api-script"), null, "本機查找不可載入 Turnstile");
  assert.equal(h.byId("assist-turnstile").hidden, true);
};
const failures = [];
let cases = 0;
async function test(name, run) {
  cases += 1;
  try { await run(); }
  catch (error) { failures.push(name + ": " + error.message); }
}

await test("local 沒有 API origin／site key 仍可找省錢答案，零外送且不冒充 AI", async () => {
  const h = harness({ config: localConfig });
  assert.equal(h.byId("assist-box").hidden, false);
  assert.equal(h.byId("assist-open").textContent, "站內找答案");
  assert.match(h.byId("assist-disclosure").textContent, /只在這台裝置處理/);
  h.open();
  h.submit("到澳洲怎麼省錢比較好?");
  await flush();
  const cards = h.byId("assist-answer").querySelectorAll(".task-search-answer a").map((a) => a.href);
  assert.deepEqual(Array.from(cards), ["cost.html#food", "cost.html#math", "housing.html"]);
  assert(!cards.some((href) => href.startsWith("english.html")));
  assert.match(h.result(), /本站編輯整理/);
  assert.equal(h.byId("assist-submit").disabled, false);
  assert.equal(h.document.activeElement, h.byId("assist-answer"));
  assert(!JSON.stringify(h.stored).includes("省錢比較好"));
  noExternalCalls(h);
});

await test("兩字主題可查，太短或超長不送出", async () => {
  const h = harness({ config: localConfig }); h.open();
  h.submit("省錢"); await flush();
  assert(h.answerLinks().includes("cost.html#food"));
  h.submit("錢");
  assert.match(h.byId("assist-status").textContent, /2 到 200/);
  h.submit("錢".repeat(201));
  assert.match(h.byId("assist-status").textContent, /2 到 200/);
  noExternalCalls(h);
});

await test("整題答案保留來源、適用條件與複核日；過期不顯示舊摘要", async () => {
  const h = harness({ config: localConfig }); h.open();
  h.submit("第一站去哪？"); await flush();
  assert.match(h.result(), /先挑兩個候選城市/);
  assert.match(h.result(), /適用：/);
  assert.match(h.result(), /下次複核/);
  assert(h.answerLinks().some((href) => href.startsWith("https://")));
  const task = h.window.WHV_SEARCH_INDEX.entries.find((entry) => entry.answer && entry.answer.id === "first-city");
  assert(task);
  task.answer.reviewDue = "2000-01-01";
  h.submit("第一站去哪？"); await flush();
  assert.match(h.result(), /已到複核日或待查證/);
  assert(!h.result().includes("先挑兩個候選城市"));
  noExternalCalls(h);
});

await test("不把無關查詢／泛稱／二字詞錯配當成答案", async () => {
  const h = harness({ config: localConfig }); h.open();
  for (const query of ["qzxv 不存在的詞", "太空貓咪的午餐菜單", "澳洲", "到澳洲天氣怎麼樣"]) {
    h.submit(query); await flush();
    assert.match(h.result(), /沒有足夠明確的站內答案/, query);
    assert.equal(h.byId("assist-answer").querySelectorAll(".task-search-answer").length, 0, query);
    assert(!h.answerLinks().includes("english.html#quick-answers"), query);
  }
  noExternalCalls(h);
});

await test("本機常見找工意圖導向已有的三個入口", async () => {
  const h = harness({ config: localConfig }); h.open();
  h.submit("我想知道要怎麼開始找工作"); await flush();
  assert(h.answerLinks().includes("work.html#channels"));
  assert(h.answerLinks().includes("work.html#commute"));
  noExternalCalls(h);
});

for (const mode of ["local", "remote"]) {
  await test(mode + " 安全及個人判定題留在前端，不呼叫模型", async () => {
    const h = harness({ config: mode === "local" ? localConfig : remoteConfig });
    if (mode === "remote") h.verify();
    h.open(); await flush();
    for (const [query, href] of [
      ["老闆扣護照不讓我離開", "scam.html#help"],
      ["我能不能申請462簽證", "visa.html#apply"],
      ["我應該要繳多少稅", "cost.html#tax"],
      ["我該不該看醫生", "health.html#doctor"],
      ["老闆給的薪水合法嗎", "work.html#verify"]
    ]) {
      h.submit(query); await flush();
      assert(h.answerLinks().includes(href), query);
      assert.equal(h.fetchCalls.length, 0, query);
    }
    if (mode === "local") noExternalCalls(h);
  });
}

await test("索引載入失敗仍提供固定主題；可重試且不改用模型", async () => {
  const h = harness({ config: localConfig, preload: false }); h.open();
  h.submit("到澳洲怎麼省錢比較好?");
  const script = h.document.head.querySelector('script[src^="assets/search-index.js"]');
  assert(script && script.onerror);
  script.onerror(); await flush();
  assert.match(h.result(), /搜尋資料暫時無法載入/);
  assert(h.answerLinks().includes("cost.html"));
  assert.equal(h.byId("assist-submit").disabled, false);
  assert.equal(h.timers.size, 0);
  h.submit("省錢");
  const retry = h.document.head.querySelector('script[src^="assets/search-index.js"]');
  assert(retry && retry !== script);
  vm.runInContext(read("assets/search-index.js"), h.context);
  retry.onload(); await flush();
  assert(h.answerLinks().includes("cost.html#food"));
  noExternalCalls(h);
});

await test("取消後索引晚回覆不重新顯示內容或搶焦點", async () => {
  const h = harness({ config: localConfig, preload: false }); h.open();
  h.submit("省錢");
  const script = h.document.head.querySelector('script[src^="assets/search-index.js"]');
  h.click(h.byId("assist-cancel"));
  vm.runInContext(read("assets/search-index.js"), h.context);
  script.onload(); await flush();
  assert.equal(h.byId("assist-form").hidden, true);
  assert.equal(h.byId("assist-answer").hidden, true);
  assert.equal(h.byId("assist-input").value, "");
  assert.equal(h.result(), "");
  assert.equal(h.document.activeElement, h.byId("assist-open"));
  noExternalCalls(h);
});

await test("非首頁由 #assist 開啟同一個本機 dialog，fallback 連回首頁", async () => {
  const h = harness({ config: localConfig, page: "cost.html", hash: "#assist" });
  assert.equal(h.byId("assist-dialog").open, true);
  h.submit("qzxv不存在的詞"); await flush();
  assert(h.answerLinks().includes("index.html#search"));
  assert(h.answerLinks().includes("index.html#communities"));
  h.click(h.byId("assist-dialog-close"));
  assert.equal(h.byId("assist-dialog").open, false);
  assert.equal(h.byId("assist-input").value, "");
  noExternalCalls(h);
});

await test("總開關關閉／未知模式／remote 設定不完整均不開入口、不發 request", async () => {
  for (const config of [
    { ...localConfig, assistEnabled: false },
    { ...remoteConfig, assistMode: "unknown" },
    { ...remoteConfig, apiBaseUrl: "" },
    { ...remoteConfig, turnstileSiteKey: "" },
    { ...remoteConfig, assistProvider: "unknown" }
  ]) {
    const h = harness({ config });
    assert.equal(h.byId("assist-nav-open"), null);
    assert.equal(h.byId("assist-box").hidden, true);
    h.open(); h.submit("測試未啟用狀態"); await flush();
    assert.equal(h.byId("assist-form").hidden, true);
    noExternalCalls(h);
  }
});

await test("沒有 assistMode 的舊設定保留 MiniMax remote 行為", async () => {
  const h = harness({ config: { ...remoteConfig, assistMode: undefined, assistProvider: undefined } });
  h.open(); await flush();
  assert.match(h.byId("assist-disclosure").textContent, /MiniMax/);
  assert(h.document.getElementById("turnstile-api-script"));
  assert.equal(h.fetchCalls.length, 0);
});

await test("remote 本機命中時不必等驗證，也不呼叫模型", async () => {
  const h = harness({ config: remoteConfig }); h.open();
  h.submit("到澳洲怎麼省錢比較好?"); await flush();
  assert.match(h.result(), /問題未送給模型/);
  assert(h.answerLinks().includes("cost.html#food"));
  assert.equal(h.fetchCalls.length, 0);
});

await test("remote 未命中但少於四字或未驗證仍不送模型", async () => {
  const h = harness({ config: remoteConfig }); h.open();
  h.submit("量子"); await flush();
  assert.match(h.result(), /請多寫一點情況/);
  h.submit("qzxv 不存在的詞"); await flush();
  assert.match(h.result(), /完成驗證後可再送出/);
  assert.equal(h.fetchCalls.length, 0);
});

for (const provider of ["minimax", "cloudflare"]) {
  await test(provider + " remote 揭露供應商，未命中才送兩欄位且過濾外站回覆", async () => {
    const h = harness({ config: { ...remoteConfig, assistProvider: provider } });
    h.verify(); h.open(); await flush();
    assert.match(h.byId("assist-disclosure").textContent, provider === "minimax" ? /MiniMax/ : /Cloudflare Workers AI/);
    h.stubFetch(response(200, { ok: true, kind: "answer", answer: "AI 只做路標，請看本站頁面。", links: [{ title: "本站資料", href: "cost.html" }, { title: "外站", href: "https://evil.test/" }] }));
    h.submit("qzxv 不存在的詞"); await flush();
    assert.equal(h.fetchCalls.length, 1);
    const call = h.fetchCalls[0];
    assert.equal(call.url, "https://api.example.test/api/assist");
    assert.deepEqual(Object.keys(JSON.parse(call.init.body)).sort(), ["question", "turnstileToken"]);
    assert.equal(call.init.credentials, "omit");
    assert.equal(call.init.referrerPolicy, "no-referrer");
    assert(h.answerLinks().includes("cost.html"));
    assert(!h.answerLinks().some((href) => href.includes("evil.test")));
    assert.equal(h.timers.size, 0);
  });
}

await test("remote 錯誤依安全代碼分類，不渲染上游訊息，保留本機入口", async () => {
  for (const [status, code, expected] of [
    [429, "rate_limited", /一分鐘內問太多次/],
    [429, "assist_daily_cap", /今天的 AI 額度已用完/],
    [400, "turnstile_failed", /驗證失敗或已逾時/],
    [503, "turnstile_unavailable", /驗證服務暫時無法使用/],
    [503, "assist_not_configured", /線上導覽尚未就緒/],
    [502, "assist_unavailable", /AI 暫時無法回覆/]
  ]) {
    const h = harness({ config: remoteConfig }); h.verify(); h.open(); await flush();
    h.stubFetch(response(status, { ok: false, error: { code, message: "PRIVATE_UPSTREAM_RESPONSE" } }));
    h.submit("qzxv 不存在的詞"); await flush();
    assert.match(h.result(), expected, code);
    assert(h.answerLinks().includes("cost.html"), code);
    assert(!h.result().includes("PRIVATE_UPSTREAM_RESPONSE"), code);
    assert.equal(h.byId("assist-submit").disabled, false, code);
    assert.equal(h.timers.size, 0, code);
  }
});

await test("remote 連線失敗或非 JSON 回覆能復原", async () => {
  for (const reply of [() => Promise.reject(new Error("offline")), { ok: false, status: 502, json: () => Promise.reject(new Error("invalid JSON")) }]) {
    const h = harness({ config: remoteConfig }); h.verify(); h.open(); await flush(); h.stubFetch(reply);
    h.submit("qzxv 不存在的詞"); await flush();
    assert.match(h.result(), /AI 暫時無法回覆/);
    assert.equal(h.byId("assist-submit").disabled, false);
    assert.equal(h.timers.size, 0);
  }
});

await test("取消 remote request 會 abort，晚回覆不能覆蓋下一次本機答案", async () => {
  const h = harness({ config: remoteConfig }); h.verify(); h.open(); await flush();
  let resolve;
  h.stubFetch(() => new Promise((done) => { resolve = done; }));
  h.submit("qzxv 不存在的詞"); await flush();
  assert.equal(h.fetchCalls.length, 1);
  h.click(h.byId("assist-cancel"));
  assert.equal(h.fetchCalls[0].init.signal.aborted, true);
  assert.equal(h.timers.size, 0);
  h.open(); h.submit("省錢"); await flush();
  const current = h.result();
  resolve(response(200, { ok: true, kind: "answer", answer: "STALE_REMOTE_ANSWER", links: [] }));
  await flush();
  assert.equal(h.result(), current);
  assert(!h.result().includes("STALE_REMOTE_ANSWER"));
});

await test("個人判定正規式與 Worker 一致", () => {
  const frontend = read("assets/main.js");
  const backend = read("worker/src/assist.ts");
  for (const name of ["ASSIST_DETERMINATION", "ASSIST_TOPIC_VISA", "ASSIST_TOPIC_MEDICAL", "ASSIST_TOPIC_TAX", "ASSIST_TOPIC_WORK"]) {
    const pattern = new RegExp("(?:export const|var) " + name + " =\\s*([\\s\\S]*?);\\n");
    const left = frontend.match(pattern), right = backend.match(pattern);
    assert(left && right, name);
    const a = vm.runInNewContext(left[1]), b = vm.runInNewContext(right[1]);
    assert.equal(a.source, b.source, name);
    assert.equal(a.flags, b.flags, name);
  }
});

if (failures.length) {
  failures.forEach((failure) => console.error("FAIL " + failure));
  console.error("LOCAL ASSIST TESTS FAILED (" + failures.length + " of " + cases + " cases)");
  process.exit(1);
}
console.log("LOCAL ASSIST TESTS PASSED (" + cases + " cases)");
