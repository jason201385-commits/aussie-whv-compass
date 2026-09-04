/* 澳打指南針 — 首頁釐清器契約測試（docs/OPTIMIZATION_PLAN.md P0-8 驗收 6；由 scripts/check.ps1 呼叫）
   零相依：不需瀏覽器、不需第三方套件。
   A. 靜態契約：以本檔自帶的最小 HTML 解析器直接解析 index.html 原始文字（JS 未執行的狀態＝無 JS／CSP 阻擋 script 時的畫面）：
      安全列 5 個 <a>、21 個出口、需求 chips 6／8／10／6 皆為 <a>、四個階段 id 與順序、462 摘要卡初始可見、
      [data-label-462] 不含簡體字、#support-hub 在 hero 之前、無 home-zone-nav、熱門 chip 8 個 <a>、#assist 預設 hidden、
      所有同站 href 的頁面與錨點都存在。
   B. 行為契約：把同一棵樹當最小 DOM 替身，用 node:vm 載入真實 assets/search-index.js、assets/api-config.js 與完整 assets/main.js：
      applyHash（四階段／出口／全部看／未知 hash／空 hash／非釐清器錨點／同 hash 再點一次）的面板、出口、aria-current 與焦點；
      462 換字 55 處與摘要卡、切回 417 還原；radiogroup 方向鍵；搜尋零結果只揭露「問一次 AI」而不 openAssist，
      明確點擊後才進 openAssist；全程零 fetch。
   仍需瀏覽器回放（本替身無法證明）：真實 CSP 標頭的阻擋結果、prefers-reduced-motion 的 CSS 動畫、瀏覽器返回鍵的歷史堆疊、
   Tab 鍵的實際焦點順序、Turnstile 與 /api/assist 的真實網路請求數。 */
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

/* ==================== 最小 HTML 解析器與 DOM 替身 ==================== */
const VOID_TAGS = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"]);
const RAW_TEXT_TAGS = new Set(["script", "style"]);
const ENTITIES = { amp: "&", lt: "<", gt: ">", quot: "\"", apos: "'", nbsp: " " };

function decodeEntities(text) {
  if (text.indexOf("&") < 0) return text;
  return text.replace(/&(#x[0-9a-fA-F]+|#[0-9]+|[a-zA-Z]+);/g, (whole, body) => {
    if (body[0] === "#") {
      const code = body[1] === "x" || body[1] === "X" ? parseInt(body.slice(2), 16) : parseInt(body.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : whole;
    }
    return Object.prototype.hasOwnProperty.call(ENTITIES, body) ? ENTITIES[body] : whole;
  });
}

function escapeText(text) {
  return String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

class DomNode {
  constructor(ownerDocument) {
    this.ownerDocument = ownerDocument;
    this.parentNode = null;
    this.childNodes = [];
  }

  get parentElement() {
    return this.parentNode && this.parentNode.nodeType === 1 ? this.parentNode : null;
  }

  get firstChild() { return this.childNodes[0] || null; }
  get lastChild() { return this.childNodes[this.childNodes.length - 1] || null; }

  get nextSibling() {
    if (!this.parentNode) return null;
    const siblings = this.parentNode.childNodes;
    return siblings[siblings.indexOf(this) + 1] || null;
  }

  get children() {
    return this.childNodes.filter((node) => node.nodeType === 1);
  }

  contains(node) {
    let current = node;
    while (current) {
      if (current === this) return true;
      current = current.parentNode;
    }
    return false;
  }

  appendChild(child) {
    return this.insertBefore(child, null);
  }

  insertBefore(child, reference) {
    if (child.parentNode) child.parentNode.removeChild(child);
    child.parentNode = this;
    if (reference) {
      const at = this.childNodes.indexOf(reference);
      if (at < 0) throw new Error("insertBefore: reference node is not a child");
      this.childNodes.splice(at, 0, child);
    } else {
      this.childNodes.push(child);
    }
    return child;
  }

  removeChild(child) {
    const at = this.childNodes.indexOf(child);
    if (at < 0) throw new Error("removeChild: node is not a child");
    this.childNodes.splice(at, 1);
    child.parentNode = null;
    return child;
  }

  replaceChildren(...nodes) {
    this.childNodes.slice().forEach((node) => this.removeChild(node));
    nodes.forEach((node) => this.appendChild(node));
  }

  remove() {
    if (this.parentNode) this.parentNode.removeChild(this);
  }

  get textContent() {
    return this.childNodes.map((node) => node.textContent).join("");
  }

  set textContent(value) {
    this.childNodes.slice().forEach((node) => this.removeChild(node));
    const text = String(value == null ? "" : value);
    if (text !== "") this.appendChild(new TextNode(this.ownerDocument, text));
  }

  *descendants() {
    for (const child of this.childNodes) {
      yield child;
      if (child.nodeType === 1) yield* child.descendants();
    }
  }

  querySelectorAll(selector) {
    const list = parseSelectorList(selector);
    const out = [];
    for (const node of this.descendants()) {
      if (node.nodeType === 1 && matchesList(node, list)) out.push(node);
    }
    return out;
  }

  querySelector(selector) {
    const list = parseSelectorList(selector);
    for (const node of this.descendants()) {
      if (node.nodeType === 1 && matchesList(node, list)) return node;
    }
    return null;
  }

  addEventListener(type, handler, options) {
    if (!this.listeners) this.listeners = new Map();
    if (!this.listeners.has(type)) this.listeners.set(type, []);
    this.listeners.get(type).push({ handler, once: !!(options && options.once) });
  }

  removeEventListener(type, handler) {
    if (!this.listeners || !this.listeners.has(type)) return;
    this.listeners.set(type, this.listeners.get(type).filter((entry) => entry.handler !== handler));
  }

  invokeListeners(event) {
    if (!this.listeners || !this.listeners.has(type(event))) return;
    const entries = this.listeners.get(type(event)).slice();
    for (const entry of entries) {
      if (entry.once) this.removeEventListener(type(event), entry.handler);
      event.currentTarget = this;
      if (typeof entry.handler === "function") entry.handler.call(this, event);
      else if (entry.handler && typeof entry.handler.handleEvent === "function") entry.handler.handleEvent(event);
      if (event.propagationStopped) break;
    }
  }

  dispatchEvent(event) {
    if (!event.target) event.target = this;
    let current = this;
    while (current) {
      current.invokeListeners(event);
      if (event.propagationStopped || event.bubbles === false) break;
      current = current.parentNode || (current.nodeType === 9 ? current.defaultView : null);
    }
    return !event.defaultPrevented;
  }
}
const type = (event) => event.type;

class TextNode extends DomNode {
  constructor(ownerDocument, text) {
    super(ownerDocument);
    this.nodeType = 3;
    this.nodeName = "#text";
    this.nodeValue = text;
  }

  get textContent() { return this.nodeValue; }
  set textContent(value) { this.nodeValue = String(value); }
}

class Element extends DomNode {
  constructor(ownerDocument, tagName) {
    super(ownerDocument);
    this.nodeType = 1;
    this.localName = String(tagName).toLowerCase();
    this.tagName = this.localName.toUpperCase();
    this.nodeName = this.tagName;
    this.attrs = new Map();
    this.style = createStyle();
    this.internalValue = null;
    this.dataset = new Proxy({}, {
      get: (_, key) => (typeof key === "string" ? this.getAttribute("data-" + camelToKebab(key)) : undefined) ?? undefined,
      set: (_, key, value) => { this.setAttribute("data-" + camelToKebab(key), String(value)); return true; },
      has: (_, key) => typeof key === "string" && this.hasAttribute("data-" + camelToKebab(key))
    });
    this.classList = {
      add: (...names) => names.forEach((name) => { if (!this.classList.contains(name)) this.className = (this.className + " " + name).trim(); }),
      remove: (...names) => { this.className = classTokens(this).filter((token) => !names.includes(token)).join(" "); },
      contains: (name) => classTokens(this).includes(name),
      toggle: (name, force) => {
        const has = this.classList.contains(name);
        const next = force === undefined ? !has : !!force;
        if (next && !has) this.classList.add(name);
        if (!next && has) this.classList.remove(name);
        return next;
      }
    };
  }

  getAttribute(name) {
    const key = String(name).toLowerCase();
    return this.attrs.has(key) ? this.attrs.get(key) : null;
  }

  setAttribute(name, value) { this.attrs.set(String(name).toLowerCase(), String(value)); }
  removeAttribute(name) { this.attrs.delete(String(name).toLowerCase()); }
  hasAttribute(name) { return this.attrs.has(String(name).toLowerCase()); }

  get id() { return this.getAttribute("id") || ""; }
  set id(value) { this.setAttribute("id", value); }
  get className() { return this.getAttribute("class") || ""; }
  set className(value) { this.setAttribute("class", value); }
  get hidden() { return this.hasAttribute("hidden"); }
  set hidden(value) { if (value) this.setAttribute("hidden", ""); else this.removeAttribute("hidden"); }
  get disabled() { return this.hasAttribute("disabled"); }
  set disabled(value) { if (value) this.setAttribute("disabled", ""); else this.removeAttribute("disabled"); }
  get checked() { return this.hasAttribute("checked"); }
  set checked(value) { if (value) this.setAttribute("checked", ""); else this.removeAttribute("checked"); }
  get open() { return this.hasAttribute("open"); }
  set open(value) { if (value) this.setAttribute("open", ""); else this.removeAttribute("open"); }
  get href() { return this.getAttribute("href") || ""; }
  set href(value) { this.setAttribute("href", value); }
  get src() { return this.getAttribute("src") || ""; }
  set src(value) { this.setAttribute("src", value); }
  get type() { return this.getAttribute("type") || ""; }
  set type(value) { this.setAttribute("type", value); }
  get name() { return this.getAttribute("name") || ""; }
  set name(value) { this.setAttribute("name", value); }
  get rel() { return this.getAttribute("rel") || ""; }
  set rel(value) { this.setAttribute("rel", value); }
  get target() { return this.getAttribute("target") || ""; }
  set target(value) { this.setAttribute("target", value); }
  get title() { return this.getAttribute("title") || ""; }
  set title(value) { this.setAttribute("title", value); }
  get tabIndex() { return Number(this.getAttribute("tabindex") || 0); }
  set tabIndex(value) { this.setAttribute("tabindex", String(value)); }
  get isContentEditable() { return false; }
  get offsetLeft() { return 0; }
  get offsetWidth() { return 0; }
  get clientWidth() { return 0; }

  get value() {
    if (this.internalValue !== null) return this.internalValue;
    if (this.localName === "textarea") return this.textContent;
    return this.getAttribute("value") || "";
  }

  set value(value) { this.internalValue = String(value); }

  get innerHTML() { return this.childNodes.map(serialize).join(""); }

  set innerHTML(html) {
    this.childNodes.slice().forEach((node) => this.removeChild(node));
    parseInto(this, String(html), this.ownerDocument);
  }

  get outerHTML() { return serialize(this); }

  matches(selector) { return matchesList(this, parseSelectorList(selector)); }

  closest(selector) {
    const list = parseSelectorList(selector);
    let current = this;
    while (current && current.nodeType === 1) {
      if (matchesList(current, list)) return current;
      current = current.parentNode;
    }
    return null;
  }

  focus() {
    if (this.ownerDocument) {
      this.ownerDocument.activeElement = this;
      this.ownerDocument.focusLog.push(this);
    }
  }

  blur() { if (this.ownerDocument && this.ownerDocument.activeElement === this) this.ownerDocument.activeElement = null; }
  select() {}
  click() { this.dispatchEvent(new this.ownerDocument.defaultView.Event("click", { bubbles: true })); }
  scrollIntoView() {}
  getBoundingClientRect() { return { top: 0, left: 0, width: 0, height: 0, bottom: 0, right: 0 }; }
  checkValidity() { return true; }
  reportValidity() { return true; }
  setCustomValidity() {}
  showModal() { this.open = true; }
  close() { this.open = false; }
}

function camelToKebab(key) {
  return key.replace(/[A-Z]/g, (letter) => "-" + letter.toLowerCase());
}

function classTokens(el) {
  return el.className.split(/\s+/).filter(Boolean);
}

function createStyle() {
  const store = {};
  return {
    setProperty(name, value) { store[name] = String(value); },
    removeProperty(name) { delete store[name]; },
    getPropertyValue(name) { return store[name] || ""; }
  };
}

function serialize(node) {
  if (node.nodeType === 3) return escapeText(node.nodeValue);
  if (node.nodeType === 8) return "<!--" + node.nodeValue + "-->";
  let out = "<" + node.localName;
  for (const [name, value] of node.attrs) out += " " + name + "=\"" + String(value).replace(/"/g, "&quot;") + "\"";
  out += ">";
  if (VOID_TAGS.has(node.localName)) return out;
  return out + node.childNodes.map(serialize).join("") + "</" + node.localName + ">";
}

class Document extends DomNode {
  constructor() {
    super(null);
    this.ownerDocument = this;
    this.nodeType = 9;
    this.nodeName = "#document";
    this.activeElement = null;
    this.focusLog = [];
    this.defaultView = null;
    this.readyState = "complete";
  }

  createElement(tagName) { return new Element(this, tagName); }
  createTextNode(text) { return new TextNode(this, String(text)); }

  getElementById(id) {
    for (const node of this.descendants()) {
      if (node.nodeType === 1 && node.getAttribute("id") === id) return node;
    }
    return null;
  }

  get documentElement() { return this.children.find((el) => el.localName === "html") || null; }
  get head() { return this.documentElement ? this.documentElement.children.find((el) => el.localName === "head") || null : null; }
  get body() { return this.documentElement ? this.documentElement.children.find((el) => el.localName === "body") || null : null; }

  get title() {
    const el = this.querySelector("title");
    return el ? el.textContent : "";
  }

  set title(value) {
    const el = this.querySelector("title");
    if (el) el.textContent = value;
  }
}

/* 解析器：足以處理本站手寫 HTML（顯式閉合、void 元素、自閉合 SVG 標籤、註解、DOCTYPE、script／style 原始文字）。 */
function parseInto(container, html, doc) {
  const stack = [container];
  let at = 0;
  const top = () => stack[stack.length - 1];
  const pushText = (text) => {
    if (text === "") return;
    top().appendChild(new TextNode(doc, decodeEntities(text)));
  };
  while (at < html.length) {
    const lt = html.indexOf("<", at);
    if (lt < 0) { pushText(html.slice(at)); break; }
    if (lt > at) pushText(html.slice(at, lt));
    if (html.startsWith("<!--", lt)) {
      const end = html.indexOf("-->", lt + 4);
      at = end < 0 ? html.length : end + 3;
      continue;
    }
    if (html.startsWith("<!", lt) || html.startsWith("<?", lt)) {
      const end = html.indexOf(">", lt);
      at = end < 0 ? html.length : end + 1;
      continue;
    }
    if (html.startsWith("</", lt)) {
      const end = html.indexOf(">", lt);
      const name = html.slice(lt + 2, end < 0 ? html.length : end).trim().toLowerCase();
      at = end < 0 ? html.length : end + 1;
      for (let i = stack.length - 1; i > 0; i -= 1) {
        if (stack[i].localName === name) { stack.length = i; break; }
      }
      continue;
    }
    const tagMatch = /^<([a-zA-Z][a-zA-Z0-9:-]*)/.exec(html.slice(lt, lt + 64));
    if (!tagMatch) { pushText("<"); at = lt + 1; continue; }
    const name = tagMatch[1].toLowerCase();
    const el = new Element(doc, name);
    let cursor = lt + tagMatch[0].length;
    let selfClosing = false;
    for (;;) {
      const rest = html.slice(cursor);
      const ws = /^\s+/.exec(rest);
      if (ws) { cursor += ws[0].length; continue; }
      if (rest.startsWith("/>")) { selfClosing = true; cursor += 2; break; }
      if (rest.startsWith(">")) { cursor += 1; break; }
      const attr = /^([^\s"'>\/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/.exec(rest);
      if (!attr) { cursor += 1; continue; }
      const value = attr[2] !== undefined ? attr[2] : attr[3] !== undefined ? attr[3] : attr[4] !== undefined ? attr[4] : "";
      el.attrs.set(attr[1].toLowerCase(), decodeEntities(value));
      cursor += attr[0].length;
    }
    top().appendChild(el);
    at = cursor;
    if (selfClosing || VOID_TAGS.has(name)) continue;
    if (RAW_TEXT_TAGS.has(name)) {
      const close = html.toLowerCase().indexOf("</" + name, at);
      const rawEnd = close < 0 ? html.length : close;
      if (rawEnd > at) el.appendChild(new TextNode(doc, html.slice(at, rawEnd)));
      const gt = html.indexOf(">", rawEnd);
      at = gt < 0 ? html.length : gt + 1;
      continue;
    }
    stack.push(el);
  }
}

function parseDocument(html) {
  const doc = new Document();
  parseInto(doc, html, doc);
  return doc;
}

/* 選擇器：tag、#id、.class、[attr]、[attr=v]（^= $= *= ~=）、:checked、:not()、後代與子代組合子、逗號清單。 */
const selectorCache = new Map();
function parseSelectorList(selector) {
  const key = String(selector);
  if (selectorCache.has(key)) return selectorCache.get(key);
  const list = splitTopLevel(key, ",").map(parseComplex);
  selectorCache.set(key, list);
  return list;
}

function splitTopLevel(text, separator) {
  const parts = [];
  let depth = 0;
  let quote = "";
  let current = "";
  for (const ch of text) {
    if (quote) { current += ch; if (ch === quote) quote = ""; continue; }
    if (ch === "\"" || ch === "'") { quote = ch; current += ch; continue; }
    if (ch === "[" || ch === "(") depth += 1;
    if (ch === "]" || ch === ")") depth -= 1;
    if (ch === separator && depth === 0) { parts.push(current); current = ""; continue; }
    current += ch;
  }
  parts.push(current);
  return parts.map((part) => part.trim()).filter(Boolean);
}

function parseComplex(text) {
  const tokens = [];
  let depth = 0;
  let quote = "";
  let current = "";
  let combinator = " ";
  const flush = () => {
    if (current.trim()) tokens.push({ compound: parseCompound(current.trim()), combinator });
    current = "";
  };
  for (const ch of text) {
    if (quote) { current += ch; if (ch === quote) quote = ""; continue; }
    if (ch === "\"" || ch === "'") { quote = ch; current += ch; continue; }
    if (ch === "[" || ch === "(") depth += 1;
    if (ch === "]" || ch === ")") depth -= 1;
    if (depth === 0 && (ch === " " || ch === ">")) {
      if (current.trim()) { flush(); combinator = " "; }
      if (ch === ">") combinator = ">";
      continue;
    }
    current += ch;
  }
  flush();
  return tokens;
}

function parseCompound(text) {
  const parts = [];
  const re = /([a-zA-Z][a-zA-Z0-9-]*|\*)|#([^\s#.\[\]:]+)|\.([^\s#.\[\]:]+)|\[([^\]=~^$*|]+)(?:([~^$*|]?=)(?:"([^"]*)"|'([^']*)'|([^\]]*)))?\]|:not\(([^)]*)\)|:([a-zA-Z-]+)/y;
  let at = 0;
  while (at < text.length) {
    re.lastIndex = at;
    const m = re.exec(text);
    if (!m) throw new Error("unsupported selector: " + text);
    at = re.lastIndex;
    if (m[1]) parts.push({ kind: "tag", value: m[1].toLowerCase() });
    else if (m[2]) parts.push({ kind: "id", value: m[2] });
    else if (m[3]) parts.push({ kind: "class", value: m[3] });
    else if (m[4]) parts.push({ kind: "attr", name: m[4].trim().toLowerCase(), op: m[5] || "", value: m[6] ?? m[7] ?? m[8] ?? null });
    else if (m[9] !== undefined) parts.push({ kind: "not", value: parseCompound(m[9].trim()) });
    else if (m[10]) parts.push({ kind: "pseudo", value: m[10] });
  }
  return parts;
}

function matchesCompound(el, compound) {
  return compound.every((part) => {
    switch (part.kind) {
      case "tag": return part.value === "*" || el.localName === part.value;
      case "id": return el.getAttribute("id") === part.value;
      case "class": return classTokens(el).includes(part.value);
      case "attr": {
        if (!el.hasAttribute(part.name)) return false;
        if (part.value === null) return true;
        const actual = el.getAttribute(part.name);
        if (part.op === "=") return actual === part.value;
        if (part.op === "^=") return actual.startsWith(part.value);
        if (part.op === "$=") return actual.endsWith(part.value);
        if (part.op === "*=") return actual.includes(part.value);
        if (part.op === "~=") return actual.split(/\s+/).includes(part.value);
        return false;
      }
      case "not": return !matchesCompound(el, part.value);
      case "pseudo":
        if (part.value === "checked") return el.checked;
        throw new Error("unsupported pseudo-class :" + part.value);
      default: return false;
    }
  });
}

function matchesComplex(el, tokens) {
  let index = tokens.length - 1;
  if (!matchesCompound(el, tokens[index].compound)) return false;
  let current = el;
  while (index > 0) {
    const combinator = tokens[index].combinator;
    index -= 1;
    if (combinator === ">") {
      current = current.parentElement;
      if (!current || !matchesCompound(current, tokens[index].compound)) return false;
    } else {
      current = current.parentElement;
      while (current && !matchesCompound(current, tokens[index].compound)) current = current.parentElement;
      if (!current) return false;
    }
  }
  return true;
}

function matchesList(el, list) {
  return list.some((tokens) => matchesComplex(el, tokens));
}

/* ==================== 測試框架 ==================== */
const failures = [];
let cases = 0;

async function runCase(name, fn) {
  cases += 1;
  try {
    await fn();
  } catch (error) {
    failures.push(`${name}: ${error && error.stack ? error.stack.split("\n").slice(0, 3).join(" | ") : error}`);
  }
}

function expect(condition, message) {
  if (!condition) throw new Error(message);
}

const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

/* ==================== A. 靜態契約（index.html 原始文字） ==================== */
const indexHtml = read("index.html");
const mainJs = read("assets/main.js");
const STAGES = ["considering", "committed", "in-australia", "next-step"];
const EXIT_COUNTS = { considering: 3, committed: 6, "in-australia": 8, "next-step": 4 };
const CHIP_COUNTS = { considering: 6, committed: 8, "in-australia": 10, "next-step": 6 };
const SAFETY_HREFS = ["health.html#emergency", "scam.html#help", "scam.html#help", "visa.html#apply", "housing.html#housing-search-tool"];
const LABEL_462_COUNT = 55;
const HOT_CHIP_COUNT = 8;
/* 常見簡體字（只收在繁體台灣用語中不會出現的寫法，避免誤判「台」「才」「里」這類兩岸共用字） */
const SIMPLIFIED_CHARS = "们这个说会对时发国过还问题应该钱签证请资数据网络电话买卖车头学习经验关场东从没办让给见听写读书医药费计决认为记录开门张长间边条备处单双义术议论设试员观觉联组织务优价补贴账号讯询择选满严报税递检龄币换汇灾团体险亚种类销购离确实规则须际键权现况营运输业缴纳课结构护丢劳动机济总职纠纷维";
const SIMPLIFIED_SET = new Set(SIMPLIFIED_CHARS);

const anchorCache = new Map();
function pageAnchors(file) {
  if (!anchorCache.has(file)) {
    const full = path.join(root, file);
    if (!fs.existsSync(full)) { anchorCache.set(file, null); return null; }
    const ids = new Set();
    for (const m of fs.readFileSync(full, "utf8").matchAll(/\bid="([^"]+)"/g)) ids.add(m[1]);
    anchorCache.set(file, ids);
  }
  return anchorCache.get(file);
}

/* 同站 href → 檔案與錨點；回傳問題描述或 null */
function resolveSameSiteHref(href, selfIds) {
  if (/^(?:https?:|mailto:|tel:|javascript:)/i.test(href)) return null;
  const hashAt = href.indexOf("#");
  const filePart = (hashAt < 0 ? href : href.slice(0, hashAt)).replace(/\?.*$/, "");
  const anchor = hashAt < 0 ? "" : href.slice(hashAt + 1);
  if (filePart === "") {
    if (anchor === "") return "空 href";
    return selfIds.has(anchor) ? null : `index.html 缺錨點 #${anchor}`;
  }
  if (filePart.includes("..") || filePart.startsWith("/")) return `不允許的路徑 ${filePart}`;
  const file = filePart.endsWith("/") ? filePart + "index.html" : filePart;
  const ids = pageAnchors(file);
  if (!ids) return `頁面不存在 ${file}`;
  if (anchor && !ids.has(anchor)) return `${file} 缺錨點 #${anchor}`;
  return null;
}

function orderIndex(doc, el) {
  let i = 0;
  for (const node of doc.descendants()) {
    if (node === el) return i;
    i += 1;
  }
  return -1;
}

const staticDoc = parseDocument(indexHtml);
const staticIds = new Set(staticDoc.querySelectorAll("[id]").map((el) => el.getAttribute("id")));

await runCase("static: parser sanity (main, header, footer, clarifier)", () => {
  expect(staticDoc.querySelector("main#main-content"), "缺 main#main-content");
  expect(staticDoc.querySelector(".nav-inner .nav-links a"), "缺導覽列連結");
  expect(staticDoc.querySelector(".site-footer"), "缺 .site-footer");
  expect(staticDoc.querySelector("[data-clarifier]"), "缺 [data-clarifier]");
  expect(staticDoc.querySelectorAll("[id]").length === staticIds.size, "index.html 有重複 id");
});

await runCase("static: 安全列 nav#support-hub 為 5 個 <a>、依序五個目的地、不收合、位於 hero 之前", () => {
  const bar = staticDoc.querySelector("nav#support-hub.safety-bar");
  expect(bar, "缺 nav#support-hub.safety-bar");
  const links = bar.querySelectorAll("a");
  expect(links.length === 5, `安全列 <a> 數=${links.length}`);
  expect(links.every((a) => a.hasAttribute("href")), "安全列每個 <a> 都要有 href");
  expect(links.map((a) => a.getAttribute("href")).join(",") === SAFETY_HREFS.join(","), `安全列 href 順序：${links.map((a) => a.getAttribute("href")).join(",")}`);
  expect(bar.querySelectorAll("details, button").length === 0, "安全列不得收合或用 button");
  expect(bar.children.length === 6, "安全列只留一個前綴 span 與 5 個 <a>");
  for (const a of links) {
    const problem = resolveSameSiteHref(a.getAttribute("href"), staticIds);
    expect(!problem, `安全列 ${a.getAttribute("href")}：${problem}`);
    expect(a.textContent.trim().length > 0, "安全列連結文字不得為空");
  }
  const main = staticDoc.querySelector("main#main-content");
  const hero = staticDoc.querySelector("section.hero");
  const clarifier = staticDoc.getElementById("clarifier");
  expect(hero && clarifier, "缺 hero 或 #clarifier");
  expect(main.contains(bar) && main.contains(hero), "安全列與 hero 必須在 main 內");
  expect(orderIndex(staticDoc, bar) < orderIndex(staticDoc, hero), "#support-hub 必須在 hero 之前");
  expect(orderIndex(staticDoc, hero) < orderIndex(staticDoc, clarifier), "hero 必須在 #clarifier 之前");
  expect(/哪一步/.test(hero.querySelector("h1").textContent), "hero h1 必須是問句（含「哪一步」）");
});

await runCase("static: 無 home-zone-nav", () => {
  expect(!indexHtml.includes("home-zone-nav"), "index.html 不得再出現 home-zone-nav");
  expect(staticDoc.querySelectorAll(".home-zone-nav").length === 0, "不得有 .home-zone-nav 元素");
});

await runCase("static: 4 個階段 id 存在且順序固定（#journey-map 與面板一致）", () => {
  const stageLinks = staticDoc.querySelectorAll("#journey-map a");
  expect(stageLinks.length === 4, `階段 chips 數=${stageLinks.length}`);
  expect(stageLinks.map((a) => a.getAttribute("href")).join(",") === STAGES.map((s) => "#" + s).join(","), `階段 chips 順序：${stageLinks.map((a) => a.getAttribute("href")).join(",")}`);
  expect(stageLinks.every((a) => a.hasAttribute("data-label-462")), "每個階段 chip 都要有 data-label-462");
  const panels = staticDoc.querySelectorAll("[data-clarifier-panel]");
  expect(panels.length === 4, `面板數=${panels.length}`);
  expect(panels.map((p) => p.getAttribute("id")).join(",") === STAGES.join(","), `面板 id 順序：${panels.map((p) => p.getAttribute("id")).join(",")}`);
  panels.forEach((panel) => {
    expect(panel.getAttribute("data-clarifier-panel") === panel.getAttribute("id"), `面板 ${panel.id} 的 data-clarifier-panel 不一致`);
    expect(panel.localName === "section" && panel.getAttribute("tabindex") === "-1", `面板 ${panel.id} 必須是可聚焦的 section`);
    const heading = panel.querySelector("h2");
    expect(heading && heading.getAttribute("id") === panel.id + "-title", `面板 ${panel.id} 缺 h2#${panel.id}-title`);
    expect(!panel.hasAttribute("hidden"), `面板 ${panel.id} 無 JS 時必須可見（不得帶 hidden）`);
    expect(panel.querySelector('.clarifier-safety a[href="#support-hub"]'), `面板 ${panel.id} 缺「急事先走安全出口」連結`);
  });
  expect(staticDoc.getElementById("clarifier-title"), "缺 #clarifier-title");
  const stageWords = mainJs.match(/var JOURNEY_ORDER = \[([\s\S]*?)\];/);
  expect(stageWords, "main.js 缺 JOURNEY_ORDER");
});

await runCase("static: 21 個出口皆為 <a href> 直達、目標存在、無 JS 可見", () => {
  const exits = staticDoc.querySelectorAll(".clarifier-exit");
  expect(exits.length === 21, `出口數=${exits.length}`);
  const seen = new Set();
  exits.forEach((exit) => {
    const id = exit.getAttribute("id") || "";
    expect(/^exit-[a-z-]+$/.test(id) && !seen.has(id), `出口 id 不合法或重複：${id}`);
    seen.add(id);
    expect(exit.getAttribute("tabindex") === "-1", `出口 ${id} 必須 tabindex=-1（hash 聚焦）`);
    expect(!exit.hasAttribute("hidden"), `出口 ${id} 無 JS 時必須可見`);
    expect(exit.getAttribute("data-search-entry") === `${exit.querySelector("h3").textContent.trim()}|#${id}`, `出口 ${id} 的 data-search-entry 必須是「h3 標題|#自身 id」`);
    const lite = exit.classList.contains("clarifier-exit-lite");
    const card = exit.querySelector("a.card[href]");
    if (lite) expect(!card && exit.querySelector("p.clarifier-exit-lead"), `精簡出口 ${id} 應是一句話＋連結列，不放整張卡`);
    else expect(card, `問題卡出口 ${id} 缺 a.card[href]`);
    const more = exit.querySelectorAll(".clarifier-exit-more a[href]");
    expect(more.length >= 1, `出口 ${id} 缺 .clarifier-exit-more 連結`);
    exit.querySelectorAll("a[href]").forEach((a) => {
      const problem = resolveSameSiteHref(a.getAttribute("href"), staticIds);
      expect(!problem, `出口 ${id} 連結 ${a.getAttribute("href")}：${problem}`);
    });
    expect(exit.querySelectorAll("button").length === 0, `出口 ${id} 不得用 button 當出口`);
    expect(exit.querySelector(".clarifier-exit-safety"), `出口 ${id} 缺公開入口安全句`);
  });
  expect(exits.filter((exit) => exit.classList.contains("clarifier-exit-lite")).length === 9, "9 個一句話精簡出口（其餘 12 張為回收問題卡；CLARIFIER_SPEC §0.1）");
  STAGES.forEach((stage) => {
    const panel = staticDoc.getElementById(stage);
    const count = panel.querySelectorAll(".clarifier-exit").length;
    expect(count === EXIT_COUNTS[stage], `面板 ${stage} 出口數=${count}（應為 ${EXIT_COUNTS[stage]}）`);
    const wrap = staticDoc.getElementById(stage + "-exits");
    expect(wrap && wrap.classList.contains("clarifier-exits") && panel.contains(wrap) && wrap.getAttribute("tabindex") === "-1", `面板 ${stage} 缺 #${stage}-exits.clarifier-exits[tabindex=-1]`);
  });
});

await runCase("static: 需求 chips 6／8／10／6 皆為 <a>，錨點落在同面板或 #communities／#games", () => {
  STAGES.forEach((stage) => {
    const panel = staticDoc.getElementById(stage);
    const nav = panel.querySelector("nav.clarifier-chips");
    expect(nav, `面板 ${stage} 缺 nav.clarifier-chips`);
    const chips = nav.children;
    expect(chips.length === CHIP_COUNTS[stage], `面板 ${stage} chips 數=${chips.length}（應為 ${CHIP_COUNTS[stage]}）`);
    chips.forEach((chip) => {
      expect(chip.localName === "a" && chip.hasAttribute("href") && chip.classList.contains("chip"), `面板 ${stage} 有非 <a class="chip" href> 的 chip`);
      expect(chip.hasAttribute("data-label-462"), `面板 ${stage} chip「${chip.textContent.trim()}」缺 data-label-462`);
      const href = chip.getAttribute("href");
      expect(href.startsWith("#"), `面板 ${stage} chip 必須是同頁錨點：${href}`);
      const targetId = href.slice(1);
      if (targetId.startsWith("exit-")) expect(panel.querySelector(`#${targetId}`), `面板 ${stage} chip 指向不在同面板的出口 ${href}`);
      else if (targetId === stage + "-exits") expect(panel.querySelector(`#${targetId}`), `面板 ${stage} 缺全部看目標 ${href}`);
      else expect(["communities", "games"].includes(targetId), `面板 ${stage} chip 指向未列許可的錨點 ${href}`);
      expect(staticIds.has(targetId), `面板 ${stage} chip 錨點不存在：${href}`);
    });
    const exitChips = chips.filter((chip) => chip.getAttribute("href").startsWith("#exit-"));
    expect(exitChips.length === EXIT_COUNTS[stage], `面板 ${stage} 指向出口的 chips 數=${exitChips.length}`);
    expect(chips.some((chip) => chip.getAttribute("href") === "#" + stage + "-exits"), `面板 ${stage} 缺「全部看」chip`);
    expect(chips.some((chip) => chip.getAttribute("href") === "#communities"), `面板 ${stage} 缺「看公開討論」chip`);
  });
});

await runCase("static: 462 護照組與摘要卡的無 JS／有 JS 雙態", () => {
  const groups = staticDoc.querySelectorAll("[data-clarifier-passport]");
  expect(groups.length === 2, `護照 radiogroup 數=${groups.length}`);
  groups.forEach((group) => {
    expect(group.getAttribute("role") === "radiogroup" && group.hasAttribute("hidden"), "護照組必須是 role=radiogroup 且初始 hidden（JS 才顯示）");
    const radios = group.querySelectorAll('[role="radio"][data-passport]');
    expect(radios.length === 3 && radios.every((r) => r.localName === "button" && r.getAttribute("type") === "button"), "護照組必須是 3 顆 button[type=button][role=radio]");
    expect(radios.map((r) => r.getAttribute("data-passport")).join(",") === "417,462,other", "護照順序 417,462,other");
    expect(radios.every((r) => r.getAttribute("aria-checked") === "false"), "初始 aria-checked 全為 false");
    expect(radios.map((r) => r.getAttribute("tabindex")).join(",") === "0,-1,-1", "初始 tabindex 0,-1,-1");
    expect(group.querySelector('[data-passport-note="other"][hidden] a[href="lang/"]'), "其他護照 note 初始 hidden 並連到 lang/");
  });
  const statics = staticDoc.querySelectorAll("[data-clarifier-passport-static]");
  expect(statics.length === 2 && statics.every((p) => !p.hasAttribute("hidden")), "無 JS 靜態護照句必須 2 句且可見");
  const summaries = staticDoc.querySelectorAll("[data-passport-summary]");
  expect(summaries.length === 2, `462 摘要卡數=${summaries.length}`);
  summaries.forEach((card) => {
    expect(!card.hasAttribute("hidden"), `462 摘要卡 ${card.id} 初始不得帶 hidden（無 JS 常駐可讀）`);
    expect(card.closest("[data-clarifier-panel]"), "摘要卡必須在面板內");
    expect(card.querySelector('a.btn[href^="lang/en/visa/"]'), `摘要卡 ${card.id} 缺英文簽證頁主連結`);
    expect(card.querySelector(".clarifier-exit-boundary"), `摘要卡 ${card.id} 缺不判定個案的邊界句`);
  });
  expect(staticDoc.querySelectorAll("p.clarifier-passport-lead").length === 2, "護照上方一句必須 2 處");
});

await runCase(`static: [data-label-462] 共 ${LABEL_462_COUNT} 處且不含常見簡體字`, () => {
  const labelled = staticDoc.querySelectorAll("[data-label-462]");
  expect(labelled.length === LABEL_462_COUNT, `[data-label-462] 數=${labelled.length}`);
  labelled.forEach((el) => {
    const label = el.getAttribute("data-label-462");
    expect(label.trim().length > 0, `空的 data-label-462（${el.textContent.trim()}）`);
    const bad = [...label].filter((ch) => SIMPLIFIED_SET.has(ch));
    expect(bad.length === 0, `data-label-462「${label}」含簡體字：${bad.join("")}`);
    expect(staticDoc.getElementById("clarifier").contains(el), `[data-label-462]「${label}」必須在 #clarifier 內（applyPassport 只換這裡）`);
  });
  const swapped = staticDoc.querySelectorAll("a[data-href-462]");
  expect(swapped.length >= 3, `a[data-href-462] 數=${swapped.length}`);
  swapped.forEach((a) => {
    const problem = resolveSameSiteHref(a.getAttribute("data-href-462"), staticIds);
    expect(!problem, `data-href-462 ${a.getAttribute("data-href-462")}：${problem}`);
  });
});

await runCase("static: 熱門 chip 8 個 <a>，與 main.js SEARCH_HOT_LINKS 同序且目標存在", () => {
  const row = staticDoc.querySelector('#search .chip-row[data-search-ui]');
  expect(row, "缺 #search .chip-row[data-search-ui]");
  const chips = row.querySelectorAll("a.chip[href]");
  expect(chips.length === HOT_CHIP_COUNT && row.querySelectorAll("button").length === 0, `熱門 chip <a> 數=${chips.length}`);
  const block = mainJs.match(/var SEARCH_HOT_LINKS = \[([\s\S]*?)\];/);
  expect(block, "main.js 缺 SEARCH_HOT_LINKS");
  const hot = [...block[1].matchAll(/\["([^"]+)",\s*"([^"]+)"\]/g)].map((m) => m[1] + "|" + m[2]);
  expect(hot.join(",") === chips.map((a) => a.getAttribute("href") + "|" + a.textContent.trim()).join(","), `熱門 chip 與 SEARCH_HOT_LINKS 不一致：${chips.map((a) => a.getAttribute("href")).join(",")}`);
  chips.forEach((a) => {
    const problem = resolveSameSiteHref(a.getAttribute("href"), staticIds);
    expect(!problem, `熱門 chip ${a.getAttribute("href")}：${problem}`);
  });
  expect(staticDoc.querySelector('a#clarifier-search-open[href="#search"]'), "缺 a#clarifier-search-open[href=#search]");
});

await runCase("static: #assist 預設 hidden，內部表單與答案區皆 hidden", () => {
  const assist = staticDoc.querySelector("section#assist[data-assist]");
  expect(assist && assist.hasAttribute("hidden"), "#assist[data-assist] 必須預設 hidden");
  ["assist-off", "assist-box", "assist-form", "assist-turnstile", "assist-answer"].forEach((id) => {
    const el = staticDoc.getElementById(id);
    expect(el && el.hasAttribute("hidden"), `#${id} 必須預設 hidden`);
  });
  const open = staticDoc.getElementById("assist-open");
  expect(open && open.localName === "button" && open.getAttribute("aria-expanded") === "false" && open.textContent.trim() === "問一次 AI", "#assist-open 必須是 aria-expanded=false 的「問一次 AI」按鈕");
  expect(!indexHtml.includes("challenges.cloudflare.com"), "index.html 不得靜態載入 Turnstile（challenges.cloudflare.com）");
});

await runCase("static: 所有同站 <a href> 的頁面與錨點都存在", () => {
  const problems = [];
  staticDoc.querySelectorAll("a[href]").forEach((a) => {
    const href = a.getAttribute("href");
    const problem = resolveSameSiteHref(href, staticIds);
    if (problem) problems.push(`${href} → ${problem}`);
  });
  expect(problems.length === 0, `失效同站連結：${problems.join("；")}`);
});

/* ==================== B. 行為契約（node:vm 載入完整 main.js） ==================== */
function createHarness(options = {}) {
  const document = parseDocument(indexHtml);
  const hash = options.hash || "";
  const location = {
    hash,
    pathname: "/index.html",
    hostname: "www.aussiewhvcompass.com",
    search: "",
    get href() { return "https://www.aussiewhvcompass.com/index.html" + this.search + this.hash; }
  };
  const fetchCalls = [];
  const stored = {};
  const localStorage = {
    getItem(key) { return Object.prototype.hasOwnProperty.call(stored, key) ? stored[key] : null; },
    setItem(key, value) { stored[key] = String(value); },
    removeItem(key) { delete stored[key]; }
  };
  class Event {
    constructor(type, init = {}) {
      this.type = type;
      this.bubbles = init.bubbles !== false;
      this.cancelable = init.cancelable !== false;
      this.defaultPrevented = false;
      this.propagationStopped = false;
      this.target = null;
      this.currentTarget = null;
      this.key = init.key || "";
      this.ctrlKey = !!init.ctrlKey;
      this.metaKey = !!init.metaKey;
      this.altKey = !!init.altKey;
      this.shiftKey = !!init.shiftKey;
    }

    preventDefault() { this.defaultPrevented = true; }
    stopPropagation() { this.propagationStopped = true; }
  }
  class CustomEvent extends Event {
    constructor(type, init = {}) {
      super(type, init);
      this.detail = init.detail === undefined ? null : init.detail;
    }
  }
  class KeyboardEvent extends Event {}
  const window = {
    document,
    location,
    localStorage,
    navigator: { clipboard: { writeText: () => Promise.resolve() } },
    history: { replaceState() {}, pushState() {} },
    Element,
    Event,
    CustomEvent,
    KeyboardEvent,
    URL,
    URLSearchParams,
    console,
    fetch(url, init) { fetchCalls.push({ url: String(url), init }); return Promise.reject(new Error("network disabled in contract test")); },
    confirm: () => false,
    scrollY: 0,
    matchMedia: (query) => ({ matches: false, media: query, addEventListener() {}, removeEventListener() {}, addListener() {} }),
    requestAnimationFrame: (fn) => setTimeout(() => fn(0), 0),
    setTimeout,
    clearTimeout,
    listeners: new Map(),
    addEventListener: DomNode.prototype.addEventListener,
    removeEventListener: DomNode.prototype.removeEventListener,
    invokeListeners: DomNode.prototype.invokeListeners,
    dispatchEvent(event) { if (!event.target) event.target = window; window.invokeListeners(event); return !event.defaultPrevented; },
    parentNode: null
  };
  window.window = window;
  window.self = window;
  document.defaultView = window;
  const context = vm.createContext(window);
  vm.runInContext(read("assets/search-index.js"), context, { filename: "assets/search-index.js" });
  vm.runInContext(read("assets/api-config.js"), context, { filename: "assets/api-config.js" });
  if (options.config) window.WHV_API_CONFIG = Object.freeze({ ...window.WHV_API_CONFIG, ...options.config });
  vm.runInContext(mainJs, context, { filename: "assets/main.js" });

  const setHash = (next) => {
    const normalized = next && next !== "#" ? (next.startsWith("#") ? next : "#" + next) : "";
    if (normalized === location.hash) return;
    location.hash = normalized;
    window.dispatchEvent(new Event("hashchange"));
  };
  /* 模擬瀏覽器點擊 <a href="#…">：先派送 click，未被 preventDefault 才改片段並觸發 hashchange。 */
  const click = (el) => {
    const event = new Event("click", { bubbles: true, cancelable: true });
    el.dispatchEvent(event);
    const href = el.localName === "a" ? el.getAttribute("href") || "" : "";
    if (!event.defaultPrevented && href.startsWith("#")) setHash(href);
    return event;
  };
  const press = (el, key) => {
    const event = new KeyboardEvent("keydown", { bubbles: true, cancelable: true, key });
    el.dispatchEvent(event);
    return event;
  };
  const byId = (id) => document.getElementById(id);
  const panelVisibility = () => STAGES.map((stage) => (byId(stage).hidden ? "-" : stage)).filter((v) => v !== "-").join(",");
  return { document, window, location, fetchCalls, stored, setHash, click, press, byId, panelVisibility, Event };
}

const visibleText = (el) => el.textContent.replace(/\s+/g, " ").trim();
const lastTextNodeValue = (el) => {
  for (let i = el.childNodes.length - 1; i >= 0; i -= 1) {
    const node = el.childNodes[i];
    if (node.nodeType === 3 && node.nodeValue.trim() !== "") return node.nodeValue;
  }
  return el.textContent;
};

let harnessError = null;
try {
  createHarness();
} catch (error) {
  harnessError = error;
}
await runCase("behavior: main.js evaluates against the index.html DOM stand-in", () => {
  expect(!harnessError, `main.js 無法在替身上執行：${harnessError && harnessError.stack ? harnessError.stack.split("\n").slice(0, 4).join(" | ") : harnessError}`);
});

if (!harnessError) {
  await runCase("behavior: 初始狀態（空 hash，AI 旗標關閉）：面板與出口全收起、護照組顯示、靜態句隱藏、摘要卡收起、#assist 顯示為未啟用", () => {
    const h = createHarness({ config: { assistEnabled: false } });
    const rootEl = h.document.querySelector("[data-clarifier]");
    expect(rootEl.dataset.enhanced === "true" && rootEl.dataset.stage === "" && rootEl.dataset.passport === "", "data-enhanced/stage/passport 初始值");
    expect(h.panelVisibility() === "", `初始不得有面板展開：${h.panelVisibility()}`);
    expect(rootEl.querySelectorAll(".clarifier-exit").every((exit) => exit.hidden), "初始 21 個出口都要收起");
    expect(rootEl.querySelectorAll("[data-clarifier-passport]").every((g) => !g.hidden), "JS 狀態護照組必須顯示");
    expect(rootEl.querySelectorAll("[data-clarifier-passport-static]").every((p) => p.hidden), "JS 狀態靜態護照句必須隱藏");
    expect(rootEl.querySelectorAll("[data-passport-summary]").every((card) => card.hidden), "未選 462 時摘要卡必須收起");
    expect(rootEl.querySelectorAll("[data-passport-note]").every((note) => note.hidden), "未選其他護照時 note 必須收起");
    expect(h.byId("job-quiz").hidden, "小測驗初始收起");
    expect(h.byId("clarifier-title").getAttribute("tabindex") === "-1", "#clarifier-title 必須可程式聚焦");
    STAGES.forEach((stage) => expect(h.byId(stage + "-title").getAttribute("tabindex") === "-1", `#${stage}-title 必須 tabindex=-1`));
    expect(h.document.activeElement === null, "初始不得搶焦點");
    expect(!h.byId("assist").hidden && !h.byId("assist-off").hidden && h.byId("assist-box").hidden, "assistEnabled 為 false 時 #assist 只顯示未啟用一句");
    expect(h.byId("assist-form").hidden && !h.document.getElementById("turnstile-api-script"), "未啟用時不得載入 Turnstile");
    expect(h.fetchCalls.length === 0, "載入不得發出任何 fetch");
    expect(Object.keys(h.stored).length === 0, "首頁載入不得寫入任何儲存鍵");
  });

  await runCase("behavior: applyHash 四個階段 deep hash：只展開該面板、aria-current=step、出口收起、焦點在面板 h2", () => {
    const h = createHarness();
    STAGES.forEach((stage) => {
      h.setHash("#" + stage);
      const rootEl = h.document.querySelector("[data-clarifier]");
      expect(h.panelVisibility() === stage, `#${stage} 應只展開該面板：${h.panelVisibility()}`);
      expect(rootEl.dataset.stage === stage, `data-stage 應為 ${stage}`);
      const current = h.document.querySelectorAll('#journey-map a[aria-current="step"]');
      expect(current.length === 1 && current[0].getAttribute("href") === "#" + stage, `aria-current=step 應只在 #${stage}`);
      expect(h.byId(stage).querySelectorAll(".clarifier-exit").every((exit) => exit.hidden), `#${stage} 面板剛開時出口應收起`);
      expect(h.document.activeElement === h.byId(stage + "-title"), `#${stage} 焦點應在 h2#${stage}-title`);
    });
    /* 冷載入即帶 hash：不搶焦點但面板要開 */
    const cold = createHarness({ hash: "#committed" });
    expect(cold.panelVisibility() === "committed" && cold.document.activeElement === null, "冷載入 #committed 應展開面板且不搶焦點");
  });

  await runCase("behavior: applyHash 出口 hash：只顯示該出口、需求 chip aria-current=true、焦點在出口；全部看展開整組", () => {
    const h = createHarness();
    h.setHash("#exit-in-australia-housing");
    const panel = h.byId("in-australia");
    expect(h.panelVisibility() === "in-australia", `出口 hash 應展開 in-australia：${h.panelVisibility()}`);
    const shown = panel.querySelectorAll(".clarifier-exit").filter((exit) => !exit.hidden);
    expect(shown.length === 1 && shown[0].id === "exit-in-australia-housing", `應只顯示 exit-in-australia-housing：${shown.map((e) => e.id).join(",")}`);
    const currentChips = panel.querySelectorAll('.clarifier-chips a[aria-current="true"]');
    expect(currentChips.length === 1 && currentChips[0].getAttribute("href") === "#exit-in-australia-housing", "需求 chip aria-current=true 只在對應 chip");
    expect(h.document.activeElement === h.byId("exit-in-australia-housing"), "焦點應在出口卡");
    expect(h.document.querySelector('#journey-map a[aria-current="step"]').getAttribute("href") === "#in-australia", "階段 chip 仍標示目前階段");

    h.setHash("#in-australia-exits");
    expect(panel.querySelectorAll(".clarifier-exit").every((exit) => !exit.hidden), "全部看應展開 8 個出口");
    expect(h.document.activeElement === h.byId("in-australia-exits"), "焦點應在 #in-australia-exits");

    h.setHash("#exit-considering-visa");
    expect(h.panelVisibility() === "considering", "切到另一階段的出口只留該面板");
    expect(h.byId("in-australia").hidden, "離開的面板必須整個收起");
    h.setHash("#in-australia");
    expect(h.byId("in-australia").querySelectorAll(".clarifier-exit").every((exit) => exit.hidden), "回到階段 hash 時該面板出口重新收起");
    h.setHash("#exit-considering-visa");
    expect(h.byId("considering").querySelectorAll(".clarifier-exit").filter((exit) => !exit.hidden).map((e) => e.id).join(",") === "exit-considering-visa", "只顯示 exit-considering-visa");
  });

  await runCase("behavior: 空 hash／未知 hash 回到階段問題，焦點回 #clarifier-title；非釐清器錨點不動面板", () => {
    const h = createHarness();
    h.setHash("#in-australia");
    h.setHash("");
    expect(h.panelVisibility() === "" && h.document.querySelector("[data-clarifier]").dataset.stage === "", "空 hash 應收起所有面板");
    expect(h.document.querySelectorAll("#journey-map a[aria-current]").length === 0, "空 hash 後階段 chips 不得再有 aria-current");
    expect(h.document.activeElement === h.byId("clarifier-title"), "空 hash（返回鍵）焦點應回 #clarifier-title");

    h.setHash("#committed");
    h.setHash("#self-assessment");
    expect(h.panelVisibility() === "" && h.document.activeElement === h.byId("clarifier-title"), "不存在的舊錨點應回到階段問題並聚焦標題");

    h.setHash("#next-step");
    h.setHash("#journey-map");
    expect(h.panelVisibility() === "" && h.document.activeElement === h.byId("clarifier-title"), "#journey-map 應回到階段問題並聚焦標題");

    h.setHash("#in-australia");
    const beforeFocus = h.document.activeElement;
    h.setHash("#search");
    expect(h.panelVisibility() === "in-australia" && h.document.activeElement === beforeFocus, "#search 不歸釐清器管：面板與焦點不變");
    h.setHash("#communities");
    expect(h.panelVisibility() === "in-australia", "#communities 不歸釐清器管：面板不變");
    h.setHash("#support-hub");
    expect(h.panelVisibility() === "in-australia", "#support-hub 不歸釐清器管：面板不變");

    const fresh = createHarness();
    fresh.setHash("#no-such-anchor");
    expect(fresh.panelVisibility() === "" && fresh.document.activeElement === null, "沒有面板開著時未知 hash 不搶焦點");
  });

  await runCase("behavior: 同 hash 再點一次：不觸發 hashchange 也要重做顯示與聚焦（preventDefault）", () => {
    const h = createHarness();
    const stageLink = h.document.querySelector('#journey-map a[href="#considering"]');
    h.click(stageLink);
    expect(h.location.hash === "#considering" && h.document.activeElement === h.byId("considering-title"), "第一次點擊透過 hashchange 展開並聚焦");
    h.byId("site-search-home-input").focus();
    const again = h.click(stageLink);
    expect(again.defaultPrevented, "同 hash 再點一次必須 preventDefault（瀏覽器不會觸發 hashchange）");
    expect(h.location.hash === "#considering" && h.panelVisibility() === "considering", "面板維持展開");
    expect(h.document.activeElement === h.byId("considering-title"), "焦點應重新回到面板 h2");

    const exitChip = h.document.querySelector('#considering .clarifier-chips a[href="#exit-considering-cost"]');
    h.click(exitChip);
    expect(h.document.activeElement === h.byId("exit-considering-cost"), "點需求 chip 後焦點在出口");
    h.byId("site-search-home-input").focus();
    const exitAgain = h.click(exitChip);
    expect(exitAgain.defaultPrevented && h.document.activeElement === h.byId("exit-considering-cost"), "同出口再點一次也要重新聚焦");

    const outside = h.document.querySelector('.home-entry-cards a[href="#communities"]');
    h.setHash("#communities");
    const outsideAgain = h.click(outside);
    expect(!outsideAgain.defaultPrevented, "釐清器外的同 hash 連結不攔截");
  });

  await runCase("behavior: #job-quiz hash 開啟 6 題找職類並聚焦", () => {
    const h = createHarness();
    h.setHash("#job-quiz");
    expect(!h.byId("job-quiz").hidden && !h.byId("job-quiz-app").hidden, "#job-quiz 應顯示小測驗");
    expect(h.byId("job-quiz-app").querySelectorAll("button.chip").length === 3, "第一題 3 個選項");
    expect(h.document.activeElement === h.byId("job-quiz"), "焦點應在 section#job-quiz");
    expect(h.panelVisibility() === "", "小測驗不展開任何階段面板");
  });

  await runCase(`behavior: 選 462 換字 ${LABEL_462_COUNT} 處、換 href、顯示 2 張摘要卡；切回 417 全數還原`, () => {
    const h = createHarness();
    const rootEl = h.document.querySelector("[data-clarifier]");
    const labelled = rootEl.querySelectorAll("[data-label-462]");
    expect(labelled.length === LABEL_462_COUNT, `替身裡 [data-label-462] 數=${labelled.length}`);
    const original = labelled.map((el) => lastTextNodeValue(el));
    const swappedLinks = rootEl.querySelectorAll("a[data-href-462]");
    const originalHrefs = swappedLinks.map((a) => a.getAttribute("href"));
    h.setHash("#considering");
    const radio462 = h.document.querySelector('#considering [role="radio"][data-passport="462"]');
    h.click(radio462);
    expect(rootEl.dataset.passport === "462", "data-passport 應為 462");
    labelled.forEach((el, i) => {
      expect(lastTextNodeValue(el) === el.getAttribute("data-label-462"), `第 ${i + 1} 處未換成 462 文案：${visibleText(el)}`);
      expect(el.getAttribute("data-label-default") === original[i], "必須保存台灣版原文以便還原");
    });
    const stageChip = h.document.querySelector('#journey-map a[href="#considering"]');
    expect(stageChip.querySelector("span").textContent === "01" && visibleText(stageChip) === "01還在糾結", `階段 chip 編號必須保留：${visibleText(stageChip)}`);
    swappedLinks.forEach((a) => expect(a.getAttribute("href") === a.getAttribute("data-href-462"), `data-href-462 未套用：${a.getAttribute("href")}`));
    expect(rootEl.querySelectorAll("[data-passport-summary]").every((card) => !card.hidden), "選 462 後 2 張摘要卡都要顯示");
    rootEl.querySelectorAll("[data-clarifier-passport]").forEach((group) => {
      const radios = group.querySelectorAll('[role="radio"][data-passport]');
      expect(radios.map((r) => r.getAttribute("aria-checked")).join(",") === "false,true,false", "兩組 radio 同步：462 aria-checked=true");
      expect(radios.map((r) => r.getAttribute("tabindex")).join(",") === "-1,0,-1", "漫遊 tabindex 只在選中的那顆");
    });
    expect(rootEl.querySelectorAll("[data-passport-note]").every((note) => note.hidden), "462 不顯示其他護照 note");

    h.click(h.document.querySelector('#committed [role="radio"][data-passport="417"]'));
    expect(rootEl.dataset.passport === "417", "切回 417");
    labelled.forEach((el, i) => expect(lastTextNodeValue(el) === original[i], `第 ${i + 1} 處未還原：${visibleText(el)}`));
    swappedLinks.forEach((a, i) => expect(a.getAttribute("href") === originalHrefs[i], `href 未還原：${a.getAttribute("href")}`));
    expect(rootEl.querySelectorAll("[data-passport-summary]").every((card) => card.hidden), "切回 417 摘要卡收起");
    rootEl.querySelectorAll("[data-clarifier-passport]").forEach((group) => {
      const radios = group.querySelectorAll('[role="radio"][data-passport]');
      expect(radios.map((r) => r.getAttribute("aria-checked")).join(",") === "true,false,false", "417 aria-checked=true");
    });

    h.click(h.document.querySelector('#considering [role="radio"][data-passport="other"]'));
    expect(rootEl.querySelectorAll("[data-passport-note]").every((note) => !note.hidden), "其他護照顯示 note");
    expect(rootEl.querySelectorAll("[data-passport-summary]").every((card) => card.hidden), "其他護照不顯示 462 摘要卡");
    labelled.forEach((el, i) => expect(lastTextNodeValue(el) === original[i], "其他護照維持台灣版文案"));
    expect(h.fetchCalls.length === 0 && Object.keys(h.stored).length === 0, "護照選擇不得送出或保存");
  });

  await runCase("behavior: radiogroup 方向鍵：左右上下循環選取並移焦、aria-checked 同步兩組、preventDefault", () => {
    const h = createHarness();
    const rootEl = h.document.querySelector("[data-clarifier]");
    const group = h.document.querySelector("#committed [data-clarifier-passport]");
    const radios = group.querySelectorAll('[role="radio"][data-passport]');
    const checkedOf = (g) => g.querySelectorAll('[role="radio"][data-passport]').map((r) => r.getAttribute("aria-checked")).join(",");
    radios[0].focus();
    let event = h.press(radios[0], "ArrowRight");
    expect(event.defaultPrevented, "方向鍵必須 preventDefault");
    expect(rootEl.dataset.passport === "462" && h.document.activeElement === radios[1], "ArrowRight 從 417 到 462 並移焦");
    expect(checkedOf(group) === "false,true,false" && checkedOf(h.document.querySelector("#considering [data-clarifier-passport]")) === "false,true,false", "aria-checked 兩組同步");
    event = h.press(radios[1], "ArrowDown");
    expect(rootEl.dataset.passport === "other" && h.document.activeElement === radios[2], "ArrowDown 到其他護照");
    event = h.press(radios[2], "ArrowRight");
    expect(rootEl.dataset.passport === "417" && h.document.activeElement === radios[0], "末端 ArrowRight 循環回 417");
    event = h.press(radios[0], "ArrowLeft");
    expect(rootEl.dataset.passport === "other" && h.document.activeElement === radios[2], "首端 ArrowLeft 循環到其他護照");
    event = h.press(radios[2], "ArrowUp");
    expect(rootEl.dataset.passport === "462" && h.document.activeElement === radios[1], "ArrowUp 回到 462");
    expect(radios.map((r) => r.getAttribute("tabindex")).join(",") === "-1,0,-1", "漫遊 tabindex 跟著選取");
    const ignored = h.press(radios[1], "Tab");
    expect(!ignored.defaultPrevented && rootEl.dataset.passport === "462", "Tab 不攔截、不改選取");
    const outside = h.press(h.document.querySelector('#journey-map a[href="#considering"]'), "ArrowRight");
    expect(!outside.defaultPrevented, "radiogroup 之外的方向鍵不攔截");
  });

  // 出貨守門：實際 assets/api-config.js 的值必須「只打開 AI 兜底」，其餘 API 功能維持關閉。
  await runCase("behavior: 出貨設定（assets/api-config.js 原值）：AI 兜底開、聯絡送出與 D+ 與住宿搜尋皆關、載入時零請求", () => {
    const h = createHarness();
    const config = h.window.WHV_API_CONFIG;
    expect(config.assistEnabled === true, "出貨設定必須啟用 AI 兜底");
    expect(/^https:\/\/[a-z0-9.-]+$/.test(config.apiBaseUrl), `apiBaseUrl 必須是純 https origin：${config.apiBaseUrl}`);
    expect(typeof config.turnstileSiteKey === "string" && config.turnstileSiteKey.startsWith("0x"), "turnstileSiteKey 必須是公開 site key");
    expect(config.contactSubmitEnabled === false, "站內聯絡送出必須維持關閉");
    expect(config.dplusMetricsEnabled === false, "D+ 量測必須維持關閉");
    expect(config.accommodationSearchEnabled === false, "住宿搜尋必須維持關閉");
    expect(!h.byId("assist-box").hidden && h.byId("assist-off").hidden, "出貨設定下 #assist 應顯示可用");
    expect(h.fetchCalls.length === 0, `載入時不得發出任何請求：${h.fetchCalls.map((c) => c.url).join(",")}`);
    expect(!h.document.getElementById("turnstile-api-script"), "載入時不得載入 Turnstile");
  });

  await runCase("behavior: 搜尋零結果（AI 旗標關閉）：階段 4＋安全 5 皆為 <a>，問一次 AI 槽位保持 hidden，零 fetch、零 Turnstile", async () => {
    const h = createHarness({ config: { assistEnabled: false } });
    h.window.openWhvSearch("qzxv 不存在的詞");
    await tick(); await tick();
    const results = h.byId("site-search-results");
    const empty = results.querySelector(".site-search-empty");
    expect(empty, `零結果應渲染 .site-search-empty：${h.byId("site-search-status").textContent}`);
    const stages = empty.querySelectorAll(".site-search-stages a.chip");
    expect(stages.map((a) => a.getAttribute("href")).join(",") === STAGES.map((s) => "index.html#" + s).join(","), `零結果階段 chips：${stages.map((a) => a.getAttribute("href")).join(",")}`);
    const safety = empty.querySelectorAll(".site-search-safety a.chip");
    expect(safety.map((a) => a.getAttribute("href")).join(",") === SAFETY_HREFS.join(","), `零結果安全列：${safety.map((a) => a.getAttribute("href")).join(",")}`);
    const aiSlot = h.byId("site-search-ai");
    expect(aiSlot && aiSlot.hidden, "assistEnabled 為 false 時「問一次 AI」槽位必須保持 hidden");
    expect(aiSlot.querySelector('a[href="#assist"]').textContent === "問一次 AI", "槽位裡是連到 #assist 的「問一次 AI」");
    expect(empty.querySelector('a[href^="https://github.com/"][target="_blank"][rel="noopener noreferrer"]'), "GitHub 回報連結必須 noopener");
    expect(h.byId("assist-form").hidden && !h.document.getElementById("turnstile-api-script"), "零結果不得開啟 AI 表單或載入 Turnstile");
    expect(h.fetchCalls.length === 0, `零結果不得發出 fetch：${h.fetchCalls.map((c) => c.url).join(",")}`);
    expect(h.document.activeElement === h.byId("site-search-input"), "焦點應留在搜尋框");
  });

  await runCase("behavior: 搜尋零結果（AI 已啟用）：只揭露「問一次 AI」不 openAssist；明確點擊後才開表單並載入 Turnstile；仍零 /api/assist", async () => {
    const h = createHarness({ config: { apiBaseUrl: "https://api.example.test", turnstileSiteKey: "1x00000000000000000000AA", assistEnabled: true } });
    expect(!h.byId("assist-box").hidden && h.byId("assist-off").hidden, "已設定時顯示 assist-box");
    h.window.openWhvSearch("qzxv 不存在的詞");
    await tick(); await tick();
    const aiSlot = h.byId("site-search-ai");
    expect(aiSlot && !aiSlot.hidden, "AI 已啟用時零結果應揭露「問一次 AI」槽位");
    expect(h.byId("assist-form").hidden && h.byId("assist-open").getAttribute("aria-expanded") === "false", "揭露按鈕不等於 openAssist：表單仍收起");
    expect(!h.document.getElementById("turnstile-api-script") && h.byId("assist-turnstile").hidden, "未點擊前零 Turnstile 載入");
    expect(h.document.activeElement === h.byId("site-search-input"), "不移焦點");
    expect(h.location.hash === "", "不自動改 hash");

    h.click(aiSlot.querySelector('a[href="#assist"]'));
    expect(h.location.hash === "#assist", "點擊後 hash 進 #assist");
    expect(!h.byId("assist-form").hidden && h.byId("assist-open").getAttribute("aria-expanded") === "true", "明確點擊後才 openAssist");
    const turnstileScript = h.document.getElementById("turnstile-api-script");
    expect(turnstileScript && turnstileScript.getAttribute("src").startsWith("https://challenges.cloudflare.com/turnstile/v0/api.js"), "點擊後才載入 Turnstile");
    expect(h.document.head.contains(turnstileScript), "Turnstile script 應掛在 head");
    expect(h.document.activeElement === h.byId("assist-input"), "openAssist 聚焦問題框");
    expect(h.fetchCalls.filter((c) => c.url.includes("/api/assist")).length === 0, "尚未送出前零 /api/assist 請求");
    expect(h.byId("site-search-dialog").open === false, "點擊搜尋 dialog 內的連結後 dialog 關閉");

    h.byId("assist-input").value = "剛匯款給仲介";
    h.byId("assist-form").dispatchEvent(new h.Event("submit", { bubbles: true, cancelable: true }));
    expect(h.fetchCalls.length === 0, "敏感字眼在前端就攔下，不得呼叫 /api/assist");
    expect(!h.byId("assist-answer").hidden && h.byId("assist-answer").querySelector('a[href="scam.html#help"]'), "敏感字眼回固定安全出口");
  });

  // 客戶端攔截是「問題文字不離開瀏覽器」這個承諾的唯一保證（about.html #ai-assist 有寫）。
  // 2026-09-04 red-team 之前，這裡只擋得住「剛匯款」那一類，其餘 12 類與全部英文都會送出去。
  await runCase("behavior: 送出前攔截涵蓋各類人身安全題，且不誤攔含數字的預算題", async () => {
    const h = createHarness({ config: { apiBaseUrl: "https://api.example.test", turnstileSiteKey: "1x00000000000000000000AA", assistEnabled: true } });
    h.location.hash = "#assist";
    h.window.dispatchEvent(new h.Event("hashchange"));

    const submit = (text) => {
      h.byId("assist-input").value = text;
      h.byId("assist-form").dispatchEvent(new h.Event("submit", { bubbles: true, cancelable: true }));
      return h.byId("assist-answer").textContent;
    };

    for (const text of [
      "老闆打我",
      "我想不開",
      "同事一直性騷擾我",
      "護照被老闆收走",
      "雇主說不還我證件",
      "工作時手被機器夾到流很多血",
      "農場主人不讓我離開",
      "我被詐騙了",
      "my boss took my passport",
      "my employer won't let me leave the farm",
      "I got scammed by a fake landlord",
    ]) {
      const answer = submit(text);
      expect(h.fetchCalls.length === 0, `「${text}」必須在送出前攔下，不得呼叫 /api/assist`);
      expect(answer.includes("這種情況不要等 AI。"), `「${text}」必須回固定安全文案`);
      expect(h.byId("assist-answer").querySelector('a[href="scam.html#help"]'), `「${text}」必須帶救濟包連結`);
    }

    // 反向：含數字的一般問題不得被 000 的樣式掃到。
    for (const text of ["第一個月大概要準備 30000 台幣", "買車預算 8000 澳幣夠嗎", "how much does grape picking pay"]) {
      h.byId("assist-answer").textContent = "";
      h.byId("assist-answer").hidden = true;
      const answer = submit(text);
      expect(!answer.includes("這種情況不要等 AI。"), `「${text}」是一般問題，不得顯示急難文案`);
    }
  });

  await runCase("behavior: 有結果的搜尋不渲染零結果區、不揭露 AI", async () => {
    const h = createHarness({ config: { apiBaseUrl: "https://api.example.test", turnstileSiteKey: "1x00000000000000000000AA" } });
    h.window.openWhvSearch("退稅");
    await tick(); await tick();
    expect(h.byId("site-search-results").querySelector(".site-search-results-list li a[href]"), "「退稅」應有結果");
    expect(!h.byId("site-search-ai"), "有結果時不渲染 AI 槽位");
    expect(h.byId("assist-form").hidden && !h.document.getElementById("turnstile-api-script") && h.fetchCalls.length === 0, "有結果時零 AI 動作");
  });
}

if (failures.length) {
  for (const failure of failures) console.error(`FAIL ${failure}`);
  console.error(`CLARIFIER CONTRACT FAILED (${failures.length} of ${cases} cases)`);
  process.exit(1);
}
console.log(`CLARIFIER CONTRACT PASSED (${cases} cases)`);
