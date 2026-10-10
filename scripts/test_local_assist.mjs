/* 站內找答案替代模式：完整 main.js 的無網路 DOM 回放。
   覆蓋 local 零外送、真實索引路由、過期答案、模糊拒選、Cloudflare 明示操作與取消晚回覆。
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
  h.edit = (question) => {
    h.byId("assist-input").focus();
    h.byId("assist-input").value = question;
    h.byId("assist-input").dispatchEvent(new h.Event("input", { bubbles: true }));
  };
  h.result = () => h.byId("assist-answer").textContent;
  h.answerLinks = () => h.byId("assist-answer").querySelectorAll("a").map((a) => a.href);
  h.stubFetch = (reply) => {
    h.window.fetch = (url, init) => {
      h.fetchCalls.push({ url: String(url), init });
      return typeof reply === "function" ? reply(url, init) : Promise.resolve(reply);
    };
  };
  h.turnstileCalls = [];
  h.verify = (token = "test-turnstile-token") => {
    h.window.turnstile = {
      render(_slot, options) { h.turnstileCalls.push(options); if (token) options.callback(token); return "test-widget"; },
      remove() {}
    };
  };
  h.prepareAi = async (question = "qzxv 不存在的詞") => {
    h.open(); h.submit(question); await flush();
    assert.equal(h.byId("assist-ai-option").hidden, false);
    h.click(h.byId("assist-ai-open")); await flush();
    assert.equal(h.byId("assist-ai-panel").hidden, false);
  };
  return h;
}

const localConfig = { assistMode: "local", assistEnabled: true, apiBaseUrl: "", turnstileSiteKey: "" };
const cloudflareConfig = { assistMode: "cloudflare", assistEnabled: true, apiBaseUrl: "https://api.example.test", turnstileSiteKey: "1x00000000000000000000AA" };
const flush = async () => { for (let i = 0; i < 20; i += 1) await Promise.resolve(); };
const response = (status, body) => ({ status, ok: status >= 200 && status < 300, json: () => Promise.resolve(body) });
const noExternalCalls = (h) => {
  assert.equal(h.fetchCalls.length, 0, "本機查找不可發出 fetch");
  assert.equal(h.document.getElementById("turnstile-api-script"), null, "本機查找不可載入 Turnstile");
  assert.equal(h.byId("assist-turnstile").hidden, true);
  assert.equal(h.turnstileCalls.length, 0, "一般搜尋不可啟動驗證");
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

for (const mode of ["local", "cloudflare"]) {
  await test(mode + " 安全及個人判定題留在前端，不呼叫模型", async () => {
    const h = harness({ config: mode === "local" ? localConfig : cloudflareConfig });
    if (mode === "cloudflare") h.verify();
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
      assert.equal(h.byId("assist-ai-option").hidden, true, query);
    }
    noExternalCalls(h);
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

await test("總開關關閉時不開入口、不發 request", async () => {
  const h = harness({ config: { ...localConfig, assistEnabled: false } });
  assert.equal(h.byId("assist-nav-open"), null);
  assert.equal(h.byId("assist-box").hidden, true);
  h.open(); h.submit("測試未啟用狀態"); await flush();
  assert.equal(h.byId("assist-form").hidden, true);
  noExternalCalls(h);
});

await test("缺模式、舊 remote、未知模式及 Cloudflare 缺設定都保留本機搜尋，AI 停用", async () => {
  for (const config of [
    { ...cloudflareConfig, assistMode: undefined },
    { ...cloudflareConfig, assistMode: "remote" },
    { ...cloudflareConfig, assistMode: "unknown" },
    { ...cloudflareConfig, apiBaseUrl: "" },
    { ...cloudflareConfig, turnstileSiteKey: "" },
    { ...cloudflareConfig, turnstileSiteKey: "x".repeat(101) }
  ]) {
    const h = harness({ config }); h.open();
    h.submit("到澳洲怎麼省錢比較好?"); await flush();
    assert(h.answerLinks().includes("cost.html#food"));
    h.submit("qzxv 不存在的詞"); await flush();
    assert.match(h.result(), /沒有足夠明確的站內答案/);
    assert.equal(h.byId("assist-ai-option").hidden, true);
    h.click(h.byId("assist-ai-open")); h.click(h.byId("assist-ai-submit")); await flush();
    noExternalCalls(h);
  }
});

await test("Cloudflare 可用仍先本機搜尋；命中不顯示 AI，未命中也不自動驗證或外送", async () => {
  const h = harness({ config: cloudflareConfig }); h.open();
  assert.match(h.byId("assist-disclosure").textContent, /只在這台裝置處理/);
  assert.equal(h.byId("assist-submit").textContent, "找答案");
  h.submit("到澳洲怎麼省錢比較好?"); await flush();
  assert(h.answerLinks().includes("cost.html#food"));
  assert.equal(h.byId("assist-ai-option").hidden, true);
  h.submit("qzxv 不存在的詞"); await flush();
  assert.equal(h.byId("assist-ai-option").hidden, false);
  assert.equal(h.byId("assist-ai-panel").hidden, true);
  noExternalCalls(h);
});

await test("兩字未命中不提供 AI；展開與驗證均不得代替最後明示送出", async () => {
  const h = harness({ config: cloudflareConfig }); h.open();
  h.submit("量子"); await flush();
  assert.equal(h.byId("assist-ai-option").hidden, true);
  noExternalCalls(h);
  h.submit("qzxv 不存在的詞"); await flush();
  h.click(h.byId("assist-ai-submit"));
  noExternalCalls(h);
  h.click(h.byId("assist-ai-open")); await flush();
  assert.match(h.byId("assist-ai-disclosure").textContent, /只有按下「同意並送給 Cloudflare AI」/);
  assert.match(h.byId("assist-ai-disclosure").textContent, /Cloudflare Workers AI/);
  const script = h.document.getElementById("turnstile-api-script");
  assert(script && script.src.startsWith("https://challenges.cloudflare.com/"));
  h.click(h.byId("assist-ai-submit")); await flush();
  assert.equal(h.fetchCalls.length, 0);
  assert.match(h.byId("assist-status").textContent, /請先完成 Cloudflare 驗證/);
  h.verify(); script.dispatchEvent(new h.Event("load")); await flush();
  assert.equal(h.turnstileCalls.length, 1);
  assert.equal(h.fetchCalls.length, 0, "驗證 callback 不得直接送問題");
});

await test("Cloudflare 明示送出只傳兩欄位，使用新路由並過濾外站回覆", async () => {
  const h = harness({ config: cloudflareConfig }); h.verify();
  h.stubFetch(response(200, { ok: true, provider: "cloudflare", kind: "answer", answer: "AI 只做路標，請看本站頁面。", links: [{ title: "本站資料", href: "cost.html" }, { title: "外站", href: "https://evil.test/" }] }));
  await h.prepareAi();
  assert.equal(h.fetchCalls.length, 0);
  h.click(h.byId("assist-ai-submit")); await flush();
  assert.equal(h.fetchCalls.length, 1);
  const call = h.fetchCalls[0];
  assert.equal(call.url, "https://api.example.test/api/assist/cloudflare");
  assert.deepEqual(Object.keys(JSON.parse(call.init.body)).sort(), ["question", "turnstileToken"]);
  assert.equal(call.init.credentials, "omit");
  assert.equal(call.init.referrerPolicy, "no-referrer");
  assert.match(h.result(), /Cloudflare AI 站內導覽/);
  assert(h.answerLinks().includes("cost.html"));
  assert(!h.answerLinks().some((href) => href.includes("evil.test")));
  assert(!JSON.stringify(h.stored).includes("不存在的詞"));
  assert.equal(h.timers.size, 0);
  assert.equal(h.byId("assist-ai-panel").hidden, true);
});

await test("錯誤或缺失供應商的成功 body 不可顯示為 Cloudflare 回覆", async () => {
  for (const provider of [undefined, "other", ""]) {
    const h = harness({ config: cloudflareConfig }); h.verify();
    h.stubFetch(response(200, { ok: true, provider, kind: "answer", answer: "UNVERIFIED_PROVIDER_REPLY", links: [{ title: "本站資料", href: "cost.html" }] }));
    await h.prepareAi(); h.click(h.byId("assist-ai-submit")); await flush();
    assert(!h.result().includes("UNVERIFIED_PROVIDER_REPLY"));
    assert.match(h.result(), /AI 暫時無法回覆/);
  }
});

await test("Cloudflare 錯誤依安全代碼分類，不渲染上游訊息，保留本機入口", async () => {
  for (const [status, code, expected] of [
    [429, "rate_limited", /一分鐘內問太多次/],
    [429, "assist_daily_cap", /今天的 AI 額度已用完/],
    [400, "turnstile_failed", /驗證失敗或已逾時/],
    [503, "turnstile_unavailable", /驗證服務暫時無法使用/],
    [503, "assist_not_configured", /線上導覽尚未就緒/],
    [410, "assist_endpoint_retired", /AI 入口已更新/],
    [502, "assist_unavailable", /AI 暫時無法回覆/]
  ]) {
    const h = harness({ config: cloudflareConfig }); h.verify();
    h.stubFetch(response(status, { ok: false, error: { code, message: "PRIVATE_UPSTREAM_RESPONSE" } }));
    await h.prepareAi(); h.click(h.byId("assist-ai-submit")); await flush();
    assert.match(h.result(), expected, code);
    assert(h.answerLinks().includes("cost.html"), code);
    assert(!h.result().includes("PRIVATE_UPSTREAM_RESPONSE"), code);
    assert.equal(h.byId("assist-submit").disabled, false, code);
    assert.equal(h.byId("assist-ai-submit").disabled, false, code);
    assert.equal(h.byId("assist-ai-panel").hidden, true, code);
    assert.equal(h.timers.size, 0, code);
  }
});

await test("Cloudflare 連線失敗或非 JSON 回覆能復原", async () => {
  for (const reply of [() => Promise.reject(new Error("offline")), { ok: false, status: 502, json: () => Promise.reject(new Error("invalid JSON")) }]) {
    const h = harness({ config: cloudflareConfig }); h.verify(); h.stubFetch(reply);
    await h.prepareAi(); h.click(h.byId("assist-ai-submit")); await flush();
    assert.match(h.result(), /AI 暫時無法回覆/);
    assert.equal(h.byId("assist-submit").disabled, false);
    assert.equal(h.timers.size, 0);
  }
});

await test("取消 AI request 會 abort，晚回覆不能覆蓋下一次本機答案", async () => {
  const h = harness({ config: cloudflareConfig }); h.verify();
  let resolve;
  h.stubFetch(() => new Promise((done) => { resolve = done; }));
  await h.prepareAi(); h.click(h.byId("assist-ai-submit")); await flush();
  assert.equal(h.fetchCalls.length, 1);
  h.click(h.byId("assist-cancel"));
  assert.equal(h.fetchCalls[0].init.signal.aborted, true);
  assert.equal(h.timers.size, 0);
  h.open(); h.submit("省錢"); await flush();
  const current = h.result();
  resolve(response(200, { ok: true, provider: "cloudflare", kind: "answer", answer: "STALE_REMOTE_ANSWER", links: [] }));
  await flush();
  assert.equal(h.result(), current);
  assert(!h.result().includes("STALE_REMOTE_ANSWER"));
});

await test("編輯問題撤銷先前 AI 選擇、token 與 pending request，必須重新本機搜尋", async () => {
  const h = harness({ config: cloudflareConfig }); h.verify();
  let resolve;
  h.stubFetch(() => new Promise((done) => { resolve = done; }));
  await h.prepareAi(); h.click(h.byId("assist-ai-submit")); await flush();
  const oldCallback = h.turnstileCalls[0].callback;
  h.edit("新的 qzxv 問題");
  assert.equal(h.fetchCalls[0].init.signal.aborted, true);
  assert.equal(h.byId("assist-ai-option").hidden, true);
  assert.equal(h.byId("assist-ai-panel").hidden, true);
  assert.equal(h.byId("assist-answer").hidden, true);
  oldCallback("STALE_TOKEN");
  h.click(h.byId("assist-ai-submit")); await flush();
  assert.equal(h.fetchCalls.length, 1);
  resolve(response(200, { ok: true, provider: "cloudflare", kind: "answer", answer: "STALE_EDITED_ANSWER", links: [] }));
  await flush();
  assert.equal(h.result(), "");
  assert.equal(h.document.activeElement, h.byId("assist-input"));
  h.submit("新的 qzxv 問題"); await flush();
  assert.equal(h.byId("assist-ai-option").hidden, false);
  assert.equal(h.byId("assist-ai-panel").hidden, true);
  assert.equal(h.fetchCalls.length, 1);
});

await test("AI 面板取消保留本機入口；遲到驗證 script 不得重開 widget 或寫狀態", async () => {
  const h = harness({ config: cloudflareConfig });
  await h.prepareAi();
  const script = h.document.getElementById("turnstile-api-script");
  const previousResult = h.result();
  h.click(h.byId("assist-ai-cancel"));
  assert.equal(h.byId("assist-ai-panel").hidden, true);
  assert.equal(h.result(), previousResult);
  assert.equal(h.document.activeElement, h.byId("assist-input"));
  h.verify(); script.dispatchEvent(new h.Event("load")); await flush();
  assert.equal(h.turnstileCalls.length, 0);
  assert.equal(h.byId("assist-status").textContent, "");
  assert.equal(h.fetchCalls.length, 0);
});

await test("驗證 script 載入失敗可返回本機，再次展開可重試", async () => {
  const h = harness({ config: cloudflareConfig });
  await h.prepareAi();
  const script = h.document.getElementById("turnstile-api-script");
  script.dispatchEvent(new h.Event("error")); await flush();
  assert.match(h.byId("assist-status").textContent, /驗證載入失敗/);
  assert.equal(h.document.getElementById("turnstile-api-script"), null);
  h.click(h.byId("assist-ai-cancel")); h.click(h.byId("assist-ai-open")); await flush();
  const retry = h.document.getElementById("turnstile-api-script");
  assert(retry && retry !== script);
  assert.equal(h.fetchCalls.length, 0);
});

function compileAssistPattern(source, name) {
  const declaration = new RegExp("(?:export const|var) " + name + " =\\s*([\\s\\S]*?);\\r?\\n");
  const match = source.match(declaration);
  assert(match, name + " declaration missing");
  const compiled = vm.runInNewContext(match[1]);
  assert.equal(Object.prototype.toString.call(compiled), "[object RegExp]", name + " must be a RegExp");
  return compiled;
}

await test("個人判定正規式與 Worker 一致", () => {
  const frontend = read("assets/main.js");
  const backend = read("worker/src/assist.ts");
  for (const name of ["ASSIST_DETERMINATION", "ASSIST_TOPIC_VISA", "ASSIST_TOPIC_MEDICAL", "ASSIST_TOPIC_TAX", "ASSIST_TOPIC_WORK"]) {
    const a = compileAssistPattern(frontend, name), b = compileAssistPattern(backend, name);
    assert.equal(a.source, b.source, name);
    assert.equal(a.flags, b.flags, name);
  }
});

await test("規則提取支援 LF／CRLF，仍辨識真實 pattern／flags 差異", () => {
  const name = "ASSIST_DETERMINATION";
  const lf = "var " + name + " =\n  /eligible\\s+visa/i;\n";
  const crlf = lf.replaceAll("\n", "\r\n");
  const a = compileAssistPattern(lf, name), b = compileAssistPattern(crlf, name);
  assert.equal(a.source, String.raw`eligible\s+visa`);
  assert.equal(a.source, b.source);
  assert.equal(a.flags, b.flags);
  const changedPattern = compileAssistPattern(crlf.replace("eligible", "qualified"), name);
  assert.notEqual(a.source, changedPattern.source, "真實規則差異不能被換行正規化抹平");
  const changedFlags = compileAssistPattern(crlf.replace("/i;", "/im;"), name);
  assert.equal(a.source, changedFlags.source);
  assert.notEqual(a.flags, changedFlags.flags, "flags 差異必須留給一致性守門判斷");
  assert.throws(() => compileAssistPattern("var " + name + " = 42;\r\n", name), /must be a RegExp/);
});

if (failures.length) {
  failures.forEach((failure) => console.error("FAIL " + failure));
  console.error("LOCAL ASSIST TESTS FAILED (" + failures.length + " of " + cases + " cases)");
  process.exit(1);
}
console.log("LOCAL ASSIST TESTS PASSED (" + cases + " cases)");
