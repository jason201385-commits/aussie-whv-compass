/* 澳打指南針 — 站內搜尋驗收（docs/OPTIMIZATION_PLAN.md P0-9 驗收 1–2；由 scripts/check.ps1 呼叫）
   直接載入 assets/search-index.js，並用 assets/main.js 裡「==== search-core:start/end ====」
   兩個標記之間的純函式在 Node 執行：瀏覽器與這裡永遠是同一份演算法，不另外複製。
   驗收集：
   1. ia-audit §6.1 的 10 句口語查詢零結果數為 0；
   2. 指定查詢第 1 名落點（二簽要幾天、退稅、462、沒錢了、英文很爛、買車要注意什麼）；
   3. 不回歸集（找不到工作、簽證到期、受傷、黑工）在主演算法（未降級）下第 1 名頁面不變或改善；
   4. 零結果查詢不得產生任何結果（避免降級把雜訊當答案）。 */
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

const indexSource = read("assets/search-index.js");
const indexSandbox = { window: {} };
vm.runInNewContext(indexSource, indexSandbox);
const entries = indexSandbox.window.WHV_SEARCH_INDEX.entries;

const mainSource = read("assets/main.js");
const startMarker = "// ==== search-core:start ====";
const endMarker = "// ==== search-core:end ====";
const startAt = mainSource.indexOf(startMarker);
const endAt = mainSource.indexOf(endMarker);
if (startAt < 0 || endAt < 0 || endAt < startAt) {
  console.error("FAIL main.js 缺 search-core 標記");
  process.exit(1);
}
const core = mainSource.slice(startAt + startMarker.length, endAt);
const coreSandbox = {};
vm.runInNewContext(core, coreSandbox);
const { runSiteSearch, searchEntries, rewriteSearchQuery } = coreSandbox;
if (typeof runSiteSearch !== "function" || typeof searchEntries !== "function") {
  console.error("FAIL search-core 未定義 runSiteSearch／searchEntries");
  process.exit(1);
}

let failures = 0;
const ok = (condition, label) => {
  if (condition) return;
  failures += 1;
  console.error("FAIL " + label);
};
const describe = (result) => {
  const top = result.matches[0];
  return result.mode + " / " + result.matches.length + " 筆" + (top ? " / 第 1 名 " + top.entry.href + "（" + top.entry.title + "，" + top.score + "）" : "");
};
const search = (query) => runSiteSearch(entries, query);
const topHref = (query) => {
  const result = search(query);
  return result.matches.length ? result.matches[0].entry.href : "";
};
const topPage = (query) => {
  const result = search(query);
  return result.matches.length ? result.matches[0].entry.page : "";
};

/* 1. ia-audit §6.1 十句零結果歸零 */
const audit10 = ["二簽要幾天", "黑工", "share house 押金", "沒錢了", "英文很爛", "買車要注意什麼", "Perth 群組", "462", "退稅", "受傷"];
for (const query of audit10) {
  const result = search(query);
  ok(result.matches.length > 0, "ia-audit 十句零結果：「" + query + "」→ " + describe(result));
}

/* 2. 指定落點 */
const expectHref = (query, allowed) => {
  const href = topHref(query);
  ok(allowed.includes(href), "「" + query + "」第 1 名應為 " + allowed.join(" 或 ") + "，實際 " + describe(search(query)));
};
const expectPage = (query, page) => {
  ok(topPage(query) === page, "「" + query + "」第 1 名應在 " + page + "，實際 " + describe(search(query)));
};
expectHref("二簽要幾天", ["visa.html#second", "visa.html#counting"]);
expectHref("退稅", ["leave.html#tax"]);
ok(topHref("462").startsWith("lang/en/visa/"), "「462」第 1 名應為 lang/en/visa/…，實際 " + describe(search("462")));
expectPage("沒錢了", "cost.html");
expectPage("英文很爛", "english.html");
expectPage("買車要注意什麼", "cost.html");

/* 熱門 chip 對應的口語也要落在 chip 目的頁（P0-9 實作 6 的 8 詞） */
expectPage("這工合法嗎", "work.html");
expectPage("88天怎麼算", "visa.html");
expectPage("押金先給嗎", "housing.html");
expectPage("三大號順序", "prep.html");
expectPage("要帶多少錢", "cost.html");
expectPage("462抽籤", "lang/en/visa/index.html");
expectPage("保險買哪邊", "health.html");

/* 3. 不回歸集：主演算法（未降級）下第 1 名頁面不變或改善。
   基線（2026-09-02 舊索引＋舊演算法）：找不到工作 → 0 筆；簽證到期 → 0 筆；受傷 → work.html#injury；黑工 → scam.html。 */
const primaryOnly = (query) => {
  const plan = rewriteSearchQuery(query);
  const tokens = plan.rewritten.length ? plan.rewritten : plan.original;
  const matches = searchEntries(entries, tokens);
  return { matches, mode: "primary", tokens };
};
const expectPrimaryPage = (query, page) => {
  const result = primaryOnly(query);
  ok(result.matches.length > 0 && result.matches[0].entry.page === page, "不回歸「" + query + "」主演算法第 1 名應在 " + page + "，實際 " + describe(result));
};
expectPrimaryPage("找不到工作", "work.html");
expectPrimaryPage("簽證到期", "visa.html");
expectPrimaryPage("受傷", "work.html");
ok(primaryOnly("受傷").matches[0] && primaryOnly("受傷").matches[0].entry.href === "work.html#injury", "不回歸「受傷」第 1 名應維持 work.html#injury，實際 " + describe(primaryOnly("受傷")));
expectPrimaryPage("黑工", "scam.html");

/* 4. 改寫與降級的行為邊界 */
ok(search("二簽要幾天").mode === "rewritten", "「二簽要幾天」應由去疑問詞改寫命中（不是二字詞降級），實際 " + describe(search("二簽要幾天")));
ok(search("退稅").mode === "exact", "「退稅」應由原詞 AND 命中，實際 " + describe(search("退稅")));
ok(search("找不到工作").mode === "exact", "「找不到工作」應由原詞 AND（同義詞欄位）命中，實際 " + describe(search("找不到工作")));
ok(search("qzxv 不存在的詞").matches.length === 0 && search("qzxv 不存在的詞").mode === "none", "亂碼查詢必須零結果（降級不得把雜訊當答案），實際 " + describe(search("qzxv 不存在的詞")));
ok(search("怎麼辦").matches.length === 0 || search("怎麼辦").mode !== "rewritten", "純疑問詞查詢不得因改寫成空字串而全站命中，實際 " + describe(search("怎麼辦")));
ok(search("").matches.length === 0, "空查詢零結果");

/* 5. 權重 provenance：原詞命中高於純同義詞；入口段純同義詞命中降權（欠薪不再由 evidence-card 壓過 visa.html#protect） */
const owed = search("欠薪");
const owedHrefs = owed.matches.slice(0, 3).map((match) => match.entry.href);
ok(owedHrefs.includes("visa.html#protect"), "「欠薪」前 3 名應含 visa.html#protect，實際 " + owedHrefs.join(", "));
ok(!owedHrefs.some((href) => /-first-action$/.test(href)), "「欠薪」前 3 名不得是 evidence-card 入口段，實際 " + owedHrefs.join(", "));

/* 6. 索引契約：462 英文頁與 21 個首頁出口都在索引裡 */
ok(entries.some((entry) => entry.href === "lang/en/visa/" && entry.pageTitle === "462 Work and Holiday（英文）"), "索引缺 lang/en/visa/ 總覽（頁名 462 Work and Holiday（英文））");
ok(entries.filter((entry) => entry.href.startsWith("index.html#exit-") && entry.hub === 1).length === 21, "索引應有 21 個首頁出口 hub 項");
ok(entries.filter((entry) => typeof entry.synonyms === "string" && entry.synonyms).length >= 48, "索引 synonyms 欄位應至少覆蓋 48 題");

if (failures) {
  console.error("SEARCH TESTS FAILED: " + failures);
  process.exit(1);
}
console.log("SEARCH TESTS PASSED (" + entries.length + " entries)");
