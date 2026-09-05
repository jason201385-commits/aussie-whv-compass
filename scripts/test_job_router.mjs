/* 公開求職篩選導流：只組公開入口，不列雇主。 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = fs.readFileSync(path.join(root, "assets", "job-router.js"), "utf8");
const mapHtml = fs.readFileSync(path.join(root, "map.html"), "utf8");

assert.match(mapHtml, /assets\/map-transparency\.js\?v=/);
assert.match(mapHtml, /assets\/job-router\.js\?v=/);
assert.match(mapHtml, /id="job-router-form"/);
assert.match(mapHtml, /id="job-router-results"/);
assert.match(mapHtml, /aria-live="polite"/);
assert.match(mapHtml, /id="open-job-portals"/);
assert.doesNotMatch(mapHtml, /harvesttrail\.gov\.au/);
assert.match(mapHtml, /https:\/\/www\.dewr\.gov\.au\/harvest-trail/);
assert.match(mapHtml, /https:\/\/www\.workforceaustralia\.gov\.au\/individuals\/jobs\/search/);
assert.doesNotMatch(mapHtml, /jobsearch\.gov\.au/);

const styleVersion = mapHtml.match(/assets\/style\.css\?v=([^"]+)/);
const mapJsVersion = mapHtml.match(/assets\/map-transparency\.js\?v=([^"]+)/);
const routerJsVersion = mapHtml.match(/assets\/job-router\.js\?v=([^"]+)/);
assert.ok(styleVersion && mapJsVersion && routerJsVersion);
assert.equal(mapJsVersion[1], styleVersion[1]);
assert.equal(routerJsVersion[1], styleVersion[1]);
assert.match(mapHtml, /assets\/analytics-config\.js\?v=/);
assert.match(mapHtml, /assets\/i18n\.js\?v=/);

const sandbox = {
  window: {},
  document: {
    getElementById() {
      return null;
    }
  }
};
sandbox.window = sandbox;
vm.createContext(sandbox);
vm.runInContext(source, sandbox);

const api = sandbox.WHV_JOB_ROUTER;
assert.ok(api && typeof api.buildLinks === "function");

const missing = api.buildLinks({ industry: "agriculture" });
assert.equal(missing.ok, false);
assert.equal(missing.links.length, 0);

const qldFarm = api.buildLinks({
  state: "QLD",
  place: "Cairns",
  industry: "agriculture",
  preferSpecified: true
});
assert.equal(qldFarm.ok, true);
const ids = qldFarm.links.map((link) => String(link.id)).join("|");
assert.equal(
  ids,
  "workforce|fairwork-industry|fairwork-pay|seek|work-guide|scam-guide|specified-work|postcode-tool"
);
assert.ok(!qldFarm.links.some((link) => link.id === "harvest-trail"));

const hrefs = qldFarm.links.map((link) => link.href);
assert.ok(hrefs.every((href) => typeof href === "string" && href.length > 0));
assert.ok(!hrefs.some((href) => /whvcompass\.com|jobpilot|harvesttrail\.gov\.au|jobsearch\.gov\.au/i.test(href)));
assert.ok(!hrefs.some((href) => /dewr\.gov\.au\/harvest-trail/i.test(href)));
assert.ok(hrefs.includes("https://www.workforceaustralia.gov.au/individuals/jobs/search"));
assert.ok(hrefs.includes("https://horticulture.fairwork.gov.au/working-the-harvest-trail"));
assert.ok(hrefs.includes("work.html"));
assert.ok(hrefs.includes("scam.html"));
assert.ok(hrefs.includes("visa.html#postcode-tool"));
assert.ok(
  hrefs.every((href) =>
    /^(https:\/\/www\.(workforceaustralia|fairwork|seek)\.|https:\/\/horticulture\.fairwork\.|https:\/\/immi\.homeaffairs\.|work\.html|scam\.html|visa\.html#postcode-tool)/.test(href)
  )
);

const seek = qldFarm.links.find((link) => link.id === "seek");
assert.equal(seek.kind, "commercial");
assert.equal(seek.disclaimer, "第三方、非本站職缺庫");
assert.equal(
  seek.href,
  "https://www.seek.com.au/jobs?keywords=fruit%20picker&where=Cairns%20QLD"
);

const pc = api.buildLinks({ state: "WA", place: "6450", industry: "hospitality" });
assert.equal(pc.ok, true);
assert.ok(!pc.links.some((link) => link.id === "specified-work"));
const seekWa = pc.links.find((link) => link.id === "seek");
assert.equal(
  seekWa.href,
  "https://www.seek.com.au/jobs?keywords=hospitality&where=6450%20WA%20Australia"
);
assert.equal(
  pc.links.find((link) => link.id === "fairwork-industry").href,
  "https://www.fairwork.gov.au/employment-conditions/awards/awards-summary/ma000009-summary"
);

const construction = api.buildLinks({ state: "NSW", industry: "construction" });
assert.equal(
  construction.links.find((link) => link.id === "fairwork-industry").href,
  "https://www.fairwork.gov.au/find-help-for/building-and-construction-sector"
);

console.log("test_job_router.mjs PASSED");
