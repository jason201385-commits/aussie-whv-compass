"use strict";
/* Test for assets/analytics.js sensitive-page exclusion.
   Part 1 evaluates the SENSITIVE_PATHS + normalisePath + isSensitivePath block
   extracted verbatim from the file source at test time (not a hand copy).
   Part 2 runs the whole IIFE in a vm sandbox with a minimal window/document/location
   stub and asserts what the loader does on sensitive vs. normal pages. */
const fs = require("fs");
const vm = require("vm");
const assert = require("assert");

const path = require("path");
const FILE = path.join(__dirname, "..", "assets", "analytics.js");
const source = fs.readFileSync(FILE, "utf8");
const CONSENT_KEY = "whv-analytics-consent-v1";
let passed = 0;
function ok(cond, label) { assert.ok(cond, label); passed += 1; console.log("PASS " + label); }

/* ---------- Part 1: unit test isSensitivePath on the extracted source segment ---------- */
const segStart = source.indexOf("  var SENSITIVE_PATHS = [");
const fnStart = source.indexOf("  var isSensitivePath = function (pathname) {", segStart);
const fnEnd = source.indexOf("\n  };", fnStart);
assert.ok(segStart > 0 && fnStart > segStart && fnEnd > fnStart, "could not locate SENSITIVE_PATHS/isSensitivePath in source");
const segment = source.slice(segStart, fnEnd + "\n  };".length);
const unit = vm.runInNewContext(segment + "\n({ SENSITIVE_PATHS: SENSITIVE_PATHS, isSensitivePath: isSensitivePath });", {}, { filename: "analytics.js#segment" });

ok(Array.isArray(unit.SENSITIVE_PATHS), "SENSITIVE_PATHS is an array");
["/scam.html", "/health.html", "/lang/en/scam/", "/lang/en/health/"].forEach(function (p) {
  ok(unit.SENSITIVE_PATHS.indexOf(p) !== -1, "SENSITIVE_PATHS contains " + JSON.stringify(p));
});

const mustBeTrue = [
  "/scam.html", "/Health.html", "/lang/en/scam/", "/lang/en/scam/index.html", "/aussie/scam.html",
  /* extra robustness cases */
  "/scam", "/scam/", "/scam.html/", "/SCAM.HTML", "/health", "/lang/en/health", "/lang/en/health/index.html",
  "/LANG/EN/SCAM/INDEX.HTML", "/aussie/lang/en/scam/", "/aussie/lang/en/health/index.html", "/scam.html?utm=1#x",
  "/C:/site/scam.html"
];
const mustBeFalse = [
  "/index.html", "/cost.html", "/lang/en/visa/",
  /* extra robustness cases */
  "/", "", "/notscam.html", "/healthy.html", "/about.html", "/work.html", "/lang/en/", "/lang/en/scamx/",
  "/lang/en/visa/index.html", "/simulator.html", "/lang/en/health-insurance.html"
];
mustBeTrue.forEach(function (p) { ok(unit.isSensitivePath(p) === true, "isSensitivePath(" + JSON.stringify(p) + ") === true"); });
mustBeFalse.forEach(function (p) { ok(unit.isSensitivePath(p) === false, "isSensitivePath(" + JSON.stringify(p) + ") === false"); });
ok(unit.isSensitivePath(undefined) === false && unit.isSensitivePath(null) === false, "isSensitivePath(undefined/null) === false");

/* ---------- Part 2: behavioural test of the whole IIFE ---------- */
function makeEl(tag) {
  return {
    tagName: tag, attrs: {}, children: [], listeners: {}, hidden: false, textContent: "", innerHTML: "", className: "",
    setAttribute: function (k, v) { this.attrs[k] = v; },
    appendChild: function (c) { this.children.push(c); return c; },
    addEventListener: function (t, fn) { (this.listeners[t] = this.listeners[t] || []).push(fn); },
    focus: function () {}
  };
}
function runPage(pathname, opts) {
  opts = opts || {};
  const storage = Object.assign({}, opts.storage || {});
  const html = makeEl("html"), head = makeEl("head"), body = makeEl("body"), footer = makeEl("div");
  const status = makeEl("p");
  const byId = { "analytics-status": opts.withStatus ? status : null };
  const document = {
    title: "Test page", documentElement: html, head: head, body: body,
    getElementById: function (id) {
      if (id in byId) return byId[id];
      if (id === "analytics-allow" || id === "analytics-deny") { byId[id] = makeEl("button"); return byId[id]; }
      return null;
    },
    createElement: function (tag) { return makeEl(tag); },
    querySelector: function (sel) { return sel === ".site-footer .foot-inner" ? footer : null; }
  };
  const sandbox = {
    document: document,
    location: { origin: "https://www.aussiewhvcompass.com", pathname: pathname },
    localStorage: {
      getItem: function (k) { return Object.prototype.hasOwnProperty.call(storage, k) ? storage[k] : null; },
      setItem: function (k, v) { storage[k] = String(v); }
    },
    setTimeout: function (fn) { fn(); },
    WHV_ANALYTICS_CONFIG: { measurementId: "measurementId" in opts ? opts.measurementId : "G-TEST123" },
    __listeners: {},
    console: console
  };
  sandbox.window = sandbox;
  sandbox.addEventListener = function (t, fn) { (sandbox.__listeners[t] = sandbox.__listeners[t] || []).push(fn); };
  vm.createContext(sandbox);
  new vm.Script(source, { filename: "analytics.js" }).runInContext(sandbox);
  const banner = body.children.filter(function (c) { return c.className === "analytics-consent"; })[0] || null;
  const settingsButton = footer.children.filter(function (c) { return c.className === "analytics-settings"; })[0] || null;
  return {
    sandbox: sandbox, storage: storage, html: html, head: head, banner: banner, settingsButton: settingsButton,
    byId: byId, status: status,
    tagScripts: function () { return head.children.filter(function (c) { return c.tagName === "script"; }); },
    click: function (id) { byId[id].listeners.click[0](); },
    clickSettings: function () { settingsButton.listeners.click[0](); }
  };
}

function assertNoTagLoaded(r, label) {
  ok(r.tagScripts().length === 0, label + ": no gtag <script> appended to head");
  ok(r.sandbox.dataLayer === undefined, label + ": window.dataLayer not created");
  ok(r.sandbox.gtag === undefined, label + ": window.gtag not created");
}
function assertNoTracking(r, label) {
  assertNoTagLoaded(r, label);
  ok(!r.sandbox.__listeners["whv:search"], label + ": whv:search listener not registered");
}
/* Pre-existing behaviour on normal pages: the whv:search listener is registered up front
   but is inert until consent is granted and gtag exists. */
function assertInertSearchListener(r, label) {
  ok(r.sandbox.__listeners["whv:search"] && r.sandbox.__listeners["whv:search"].length === 1, label + ": whv:search listener registered (pre-existing behaviour)");
  r.sandbox.__listeners["whv:search"][0]({ detail: { resultCount: 1, topPage: "index.html" } });
  ok(r.sandbox.dataLayer === undefined && r.sandbox.gtag === undefined, label + ": whv:search without consent sends nothing");
}

/* Sensitive page, consent already granted, valid ID: nothing loads, UI still present */
["/scam.html", "/health.html", "/lang/en/scam/", "/lang/en/scam/index.html", "/lang/en/health/index.html", "/Health.html", "/aussie/scam.html"].forEach(function (p) {
  const granted = {}; granted[CONSENT_KEY] = "granted";
  const r = runPage(p, { storage: granted });
  assertNoTracking(r, "sensitive " + p + " (granted)");
  ok(r.html.attrs["data-analytics"] === "excluded", "sensitive " + p + ": data-analytics=excluded");
  ok(r.banner !== null && r.banner.hidden === true, "sensitive " + p + ": banner exists and stays hidden when a choice exists");
  ok(r.settingsButton !== null, "sensitive " + p + ": footer settings button present");
  r.clickSettings();
  ok(r.banner.hidden === false, "sensitive " + p + ": footer control reopens the banner");
  r.click("analytics-deny");
  ok(r.storage[CONSENT_KEY] === "denied" && r.banner.hidden === true, "sensitive " + p + ": deny stores 'denied' and hides banner");
  r.click("analytics-allow");
  ok(r.storage[CONSENT_KEY] === "granted" && r.banner.hidden === true, "sensitive " + p + ": allow stores 'granted' and hides banner");
  assertNoTracking(r, "sensitive " + p + " (after allow click)");
});

/* Sensitive page, no prior choice: banner shown, choice can be stored, still nothing loads */
{
  const r = runPage("/scam.html", { storage: {} });
  ok(r.banner !== null && r.banner.hidden === false, "sensitive /scam.html (no choice): banner shown");
  assertNoTracking(r, "sensitive /scam.html (no choice)");
  r.click("analytics-allow");
  ok(r.storage[CONSENT_KEY] === "granted", "sensitive /scam.html (no choice): allow click stores granted");
  assertNoTracking(r, "sensitive /scam.html (no choice, after allow)");
}

/* Sensitive page, denied: banner hidden, nothing loads */
{
  const denied = {}; denied[CONSENT_KEY] = "denied";
  const r = runPage("/lang/en/health/", { storage: denied });
  ok(r.banner !== null && r.banner.hidden === true, "sensitive /lang/en/health/ (denied): banner hidden");
  assertNoTracking(r, "sensitive /lang/en/health/ (denied)");
}

/* Normal page, granted: loads tag, page view has no query/hash, ad storage denied, search event works */
{
  const granted = {}; granted[CONSENT_KEY] = "granted";
  const r = runPage("/cost.html", { storage: granted, withStatus: true });
  ok(r.html.attrs["data-analytics"] === "available", "normal /cost.html: data-analytics=available");
  const scripts = r.tagScripts();
  ok(scripts.length === 1 && scripts[0].src === "https://www.googletagmanager.com/gtag/js?id=G-TEST123", "normal /cost.html (granted): gtag script appended");
  const dl = r.sandbox.dataLayer;
  ok(Array.isArray(dl) && dl.length === 4, "normal /cost.html (granted): dataLayer has consent default, consent update, js, config");
  ok(dl[0][0] === "consent" && dl[0][1] === "default" && dl[0][2].analytics_storage === "denied" && dl[0][2].ad_storage === "denied", "normal: consent default all denied");
  ok(dl[1][0] === "consent" && dl[1][1] === "update" && dl[1][2].analytics_storage === "granted" && dl[1][2].ad_storage === "denied" && dl[1][2].ad_user_data === "denied" && dl[1][2].ad_personalization === "denied", "normal: consent update analytics only");
  ok(dl[3][0] === "config" && dl[3][1] === "G-TEST123" && dl[3][2].page_location === "https://www.aussiewhvcompass.com/cost.html" && dl[3][2].page_path === "/cost.html" && dl[3][2].allow_google_signals === false && dl[3][2].allow_ad_personalization_signals === false, "normal: config page_location has no query/hash, signals off");
  ok(r.sandbox.__listeners["whv:search"] && r.sandbox.__listeners["whv:search"].length === 1, "normal: whv:search listener registered");
  r.sandbox.__listeners["whv:search"][0]({ detail: { resultCount: 3, topPage: "scam.html", query: "should not be sent" } });
  ok(dl.length === 5 && dl[4][0] === "event" && dl[4][1] === "site_search_used" && dl[4][2].result_count === 3 && dl[4][2].top_result_page === "scam.html" && !("search_term" in dl[4][2]) && !("query" in dl[4][2]), "normal: site_search_used sends only result_count and top_result_page");
  ok(r.status.textContent.indexOf("允許") !== -1, "normal: status text reflects granted");
  ok(r.banner.hidden === true, "normal (granted): banner hidden");
}

/* Normal page, no choice: banner shown, no tag until allow is clicked */
{
  const r = runPage("/index.html", { storage: {} });
  ok(r.banner !== null && r.banner.hidden === false, "normal /index.html (no choice): banner shown");
  assertNoTagLoaded(r, "normal /index.html (no choice)");
  assertInertSearchListener(r, "normal /index.html (no choice)");
  r.click("analytics-allow");
  ok(r.storage[CONSENT_KEY] === "granted" && r.sandbox.dataLayer && r.sandbox.dataLayer.length === 4, "normal /index.html: allow click creates dataLayer with 4 entries");
  ok(r.tagScripts().length === 1, "normal /index.html: allow click appends gtag script");
  ok(r.banner.hidden === true, "normal /index.html: allow click hides banner");
}

/* Normal page, denied: banner hidden, no tag */
{
  const denied = {}; denied[CONSENT_KEY] = "denied";
  const r = runPage("/lang/en/visa/", { storage: denied });
  ok(r.banner !== null && r.banner.hidden === true, "normal /lang/en/visa/ (denied): banner hidden");
  assertNoTagLoaded(r, "normal /lang/en/visa/ (denied)");
  assertInertSearchListener(r, "normal /lang/en/visa/ (denied)");
}

/* Empty measurement ID: fully disabled everywhere, no UI */
["/index.html", "/scam.html"].forEach(function (p) {
  const granted = {}; granted[CONSENT_KEY] = "granted";
  const r = runPage(p, { storage: granted, measurementId: "" });
  ok(r.html.attrs["data-analytics"] === "disabled", "empty ID " + p + ": data-analytics=disabled");
  ok(r.banner === null && r.settingsButton === null, "empty ID " + p + ": no banner, no footer button");
  assertNoTracking(r, "empty ID " + p);
});

console.log("ANALYTICS TESTS PASSED (" + passed + " assertions)");
