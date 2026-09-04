/**
 * 外部連結健檢（手動／定期執行，不掛進 check.ps1）。
 *
 * check.ps1 必須離線、可重現，所以會走網路的檢查放在這裡單獨跑：
 *   node scripts/check_links.mjs            全部檢查
 *   node scripts/check_links.mjs --only ato 只檢查網址含 ato 的
 *
 * 政府網站改版時會靜默把「來源」變成 404，而本站的核心承諾就是可回查，
 * 所以死連結一律當失敗（結束碼 1）；bot 阻擋與限流只列出來，不判失敗——
 * 它們用真實瀏覽器打得開，機器判不了，需要人去看。
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import path, { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CONCURRENCY = 4;
const TIMEOUT_MS = 25_000;
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140 Safari/537.36";

/** 自家網域另有 check.ps1 的內部連結規則，這裡不重複檢查。 */
const OWN_HOST = "aussiewhvcompass.com";
/** 未登入就看不到內容的平台：站上已標明需登入，機器檢查沒有意義。 */
const LOGIN_WALLED = ["facebook.com", "reddit.com", "linkedin.com"];
/** preconnect 用的 origin，不是頁面。 */
const PRECONNECT_ONLY = ["https://fonts.googleapis.com", "https://fonts.gstatic.com"];

/**
 * 對非瀏覽器用戶端回 404／403 但真實瀏覽器打得開的主機（2026-09-04 逐一用瀏覽器確認）。
 * 狀態碼證明不了一個頁面死了——這幾個站的 WAF 就是這樣回的，所以列在這裡不重複報。
 * 之後若真的要改這些連結，一樣要先用瀏覽器開一次。
 */
const CONFIRMED_ALIVE = [
  "abr.business.gov.au", // ABN Lookup：對 fetch 回 404，瀏覽器正常
  "online.apps.austrac.gov.au", // AUSTRAC Remittance Sector Register：同上
  "support.google.com", // Google 說明中心：對 fetch 回 404
  "shop.redcross.org.au", // origin 很慢，常逾時
  "online.transport.wa.gov.au", // 302 到 ?0 才是查詢頁，fetch 跟不完
];

function htmlFiles(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === ".git" || name === ".claude") continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) htmlFiles(full, acc);
    else if (name.endsWith(".html")) acc.push(full);
  }
  return acc;
}

function collect() {
  const seen = new Map(); // url -> Set(檔案)
  for (const file of htmlFiles(ROOT)) {
    const text = readFileSync(file, "utf8");
    for (const match of text.matchAll(/href="(https?:\/\/[^"]+)"/g)) {
      const url = match[1].replace(/&amp;/g, "&");
      if (url.includes(OWN_HOST)) continue;
      if (LOGIN_WALLED.some((host) => url.includes(host))) continue;
      if (PRECONNECT_ONLY.includes(url)) continue;
      if (!seen.has(url)) seen.set(url, new Set());
      seen.get(url).add(relative(ROOT, file).replace(/\\/g, "/"));
    }
  }
  return seen;
}

async function status(url) {
  // HEAD 常被擋或未實作，所以失敗要換 GET 再問一次；連不上再重試一輪，
  // 免得一次網路抖動就被記成死連結。
  let lastCode = 0; // 每次呼叫各自持有，四條並行工作者不會互相污染。
  for (const method of ["HEAD", "GET", "GET"]) {
    try {
      const response = await fetch(url, {
        method,
        redirect: "follow",
        headers: { "User-Agent": UA, Accept: "text/html,*/*" },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (response.ok || response.status === 404 || response.status === 410) return response.status;
      lastCode = response.status;
    } catch {
      lastCode = 0;
    }
  }
  return lastCode;
}

async function main() {
  const onlyIndex = process.argv.indexOf("--only");
  const only = onlyIndex === -1 ? null : process.argv[onlyIndex + 1];

  const found = collect();
  const urls = [...found.keys()].filter((url) => !only || url.includes(only)).sort();
  const dead = [];
  const unclear = [];
  let checked = 0;

  const queue = [...urls];
  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      while (queue.length > 0) {
        const url = queue.shift();
        const code = await status(url);
        checked += 1;
        const where = [...found.get(url)].join(", ");
        if (code >= 200 && code < 400) continue;
        if (CONFIRMED_ALIVE.some((host) => url.includes(host))) continue;
        // 狀態碼證明不了「這一頁沒了」：2026-09-04 的掃描裡，ABN Lookup、AUSTRAC 與
        // Google 說明中心都對 fetch 回 404，瀏覽器卻正常。所以這裡只產出「待人工複驗的候選」，
        // 由人用真實瀏覽器開一次才下判斷；403／429 這種明顯是阻擋或限流的另外分堆。
        if (code === 403 || code === 429) unclear.push({ code, url, where });
        else dead.push({ code, url, where });
      }
    }),
  );

  for (const item of unclear.sort((a, b) => a.url.localeCompare(b.url))) {
    console.log(`BLOCKED ${item.code} ${item.url}  (${item.where})`);
  }
  for (const item of dead.sort((a, b) => a.url.localeCompare(b.url))) {
    console.log(`CHECK   ${item.code} ${item.url}  (${item.where})`);
  }

  if (unclear.length > 0) {
    console.log(`\n${unclear.length} 條是 bot 阻擋或限流（403／429），不算問題。`);
  }
  if (dead.length > 0) {
    console.error(
      `\nLINK CHECK：${dead.length} 條待人工複驗（共 ${checked} 條）。` +
        `\n每一條都要用真實瀏覽器開過才算數——確認真的沒了才改連結，` +
        `\n確認只是 WAF 擋機器就把主機加進 CONFIRMED_ALIVE 並註明確認日期。`,
    );
    process.exit(1);
  }
  console.log(`\nLINK CHECK PASSED (${checked} external links)`);
}

await main();
