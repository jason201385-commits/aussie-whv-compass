/* 離澳免費二手版 — public GitHub listings; no account token or browser storage. */
(function (root) {
  'use strict';
  var REPO = 'jason201385-commits/aussie-whv-compass';
  var BASE = 'https://github.com/' + REPO;
  var APPROVED = 'free-board-approved';
  var CITIES = ['Perth WA', 'Sydney NSW', 'Melbourne VIC', 'Brisbane QLD', 'Adelaide SA', 'Canberra ACT', 'Darwin NT', 'Hobart TAS', 'Gold Coast QLD', 'Cairns QLD', 'Bundaberg QLD', 'Townsville QLD', 'Sunshine Coast QLD', 'Toowoomba QLD', 'Broome WA', 'Geraldton WA', 'Bunbury WA', 'Margaret River WA', 'Alice Springs NT', 'Launceston TAS', '其他地區'];
  var CATEGORIES = ['廚房／生活用品', '家具／一般家電', '衣物／工作服', '腳踏車／非機動交通', '露營／戶外用品', '書籍／其他一般物品'];
  var CONDITIONS = ['近全新', '正常使用痕跡', '有瑕疵，已在說明揭露'];
  var FIELDS = {item: '物品名稱', city: '城市／地區', category: '物品分類', condition: '物品狀況', deadline: '領取截止日', pickup: '面交區域與時段', details: '物品說明', status: '刊登狀態', price: '價格'};
  var DAY = 86400000;
  function today(now) { return new Date((now == null ? Date.now() : now) + 8 * 3600000).toISOString().slice(0, 10); }
  function validDate(s) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s || '')) return false;
    var t = Date.parse(s + 'T00:00:00Z');
    return Number.isFinite(t) && new Date(t).toISOString().slice(0, 10) === s;
  }
  function clean(s, max, multiline) {
    if (typeof s !== 'string') return null;
    s = s.trim();
    if (!s || s.length > max || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(s)) return null;
    if ((!multiline && /[\r\n]/.test(s)) || /^#{1,6}\s/m.test(s)) return null;
    return s;
  }
  function validate(data, now) {
    var x = {}, limits = {item: 50, pickup: 90, details: 300};
    Object.keys(limits).forEach(function (k) { x[k] = clean(data[k], limits[k], k === 'details'); });
    if (!x.item || !x.pickup || !x.details) throw new Error('請完整填寫物品、面交區域與說明，並遵守各欄字數限制。');
    if (CITIES.indexOf(data.city) < 0 || CATEGORIES.indexOf(data.category) < 0 || CONDITIONS.indexOf(data.condition) < 0) throw new Error('請從選單選擇城市、分類與狀況。');
    if (!validDate(data.deadline)) throw new Error('請填寫有效的領取截止日。');
    var days = (Date.parse(data.deadline) - Date.parse(today(now))) / DAY;
    if (days < 0 || days > 90) throw new Error('領取期限須在今天至 90 天內，以澳洲伯斯時間為準。');
    ['city', 'category', 'condition', 'deadline'].forEach(function (k) { x[k] = data[k]; });
    return x;
  }
  function parseSections(body) {
    if (typeof body !== 'string' || body.length > 30000) return null;
    var out = {}, current = null, bad = false;
    body.replace(/\r\n/g, '\n').split('\n').forEach(function (line) {
      var m = /^### (.+?)\s*$/.exec(line);
      if (m) {
        current = Object.keys(FIELDS).find(function (k) { return FIELDS[k] === m[1]; }) || null;
        if (current) { if (Object.prototype.hasOwnProperty.call(out, current)) bad = true; else out[current] = ''; }
      } else if (current) out[current] += line + '\n';
    });
    Object.keys(out).forEach(function (k) { out[k] = out[k].trim(); });
    return bad ? null : out;
  }
  function labels(issue) { return (Array.isArray(issue.labels) ? issue.labels : []).map(function (x) { return typeof x === 'string' ? x : x && x.name; }); }
  function readIssue(issue, now) {
    if (!issue || issue.pull_request || issue.state !== 'open' || issue.locked || !Number.isSafeInteger(issue.number) || issue.number < 1) return null;
    var tags = labels(issue);
    if (tags.indexOf(APPROVED) < 0 || typeof issue.title !== 'string' || issue.title.indexOf('[免費贈送]') !== 0) return null;
    var data = parseSections(issue.body);
    if (!data || data.price !== '免費（AUD 0）' || ['待領取', '已預約'].indexOf(data.status) < 0) return null;
    var item;
    try { item = validate(data, now); } catch (e) { return null; }
    item.number = issue.number;
    item.status = tags.indexOf('free-board-reserved') >= 0 ? '已預約' : data.status;
    item.url = BASE + '/issues/' + issue.number;
    item.created = Number.isFinite(Date.parse(issue.created_at)) ? Date.parse(issue.created_at) : 0;
    return item;
  }
  function filterItems(items, f, now) {
    f = f || {};
    var query = String(f.query || '').trim().toLowerCase();
    return items.filter(function (x) {
      return x.deadline >= today(now) && (!f.city || x.city === f.city) && (!f.category || x.category === f.category) && (!f.status || x.status === f.status) && (!query || (x.item + ' ' + x.pickup + ' ' + x.details).toLowerCase().indexOf(query) >= 0);
    }).sort(function (a, b) { return f.sort === 'newest' ? b.created - a.created || b.number - a.number : a.deadline.localeCompare(b.deadline) || b.created - a.created || b.number - a.number; });
  }
  function draftUrl(data, consent, now) {
    if (consent !== true) throw new Error('請先確認免費贈送與公開刊登須知。');
    var d = validate(data, now);
    var all = Object.assign({}, d, {price: '免費（AUD 0）', status: '待領取'});
    var body = Object.keys(FIELDS).map(function (k) { return '### ' + FIELDS[k] + '\n\n' + all[k]; }).join('\n\n') + '\n\n### 照片（選填）\n\n請在這裡附上已遮除個資的物品照片，或刪除本行。\n\n### 刊登確認\n\n- [x] 我確認免費贈送、符合版規，並知道原貼與留言公開；不填聯絡個資。';
    var params = new URLSearchParams({template: 'free_item.md', title: '[免費贈送] ' + d.item, body: body});
    var url = BASE + '/issues/new?' + params.toString();
    if (url.length > 7500) throw new Error('草稿過長，請縮短說明後再試。');
    return {url: url, data: d};
  }
  function apiUrl(page) {
    if (!Number.isSafeInteger(page) || page < 1) throw new Error('Invalid page');
    return 'https://api.github.com/repos/' + REPO + '/issues?state=open&labels=' + APPROVED + '&sort=created&direction=desc&per_page=50&page=' + page;
  }
  var core = {CITIES: CITIES, CATEGORIES: CATEGORIES, CONDITIONS: CONDITIONS, FIELDS: FIELDS, today: today, validDate: validDate, validate: validate, parseSections: parseSections, readIssue: readIssue, filterItems: filterItems, draftUrl: draftUrl, apiUrl: apiUrl};
  if (typeof module !== 'undefined' && module.exports) module.exports = core;
  if (!root.document || !root.document.getElementById('free-board')) return;
  var document = root.document;
  function el(id) { return document.getElementById(id); }
  function node(tag, text, cls) { var n = document.createElement(tag); if (text != null) n.textContent = text; if (cls) n.className = cls; return n; }
  function options(id, values) { values.forEach(function (v) { var o = node('option', v); o.value = v; el(id).appendChild(o); }); }
  ['fb-city', 'fb-post-city'].forEach(function (id) { options(id, CITIES); });
  ['fb-category', 'fb-post-category'].forEach(function (id) { options(id, CATEGORIES); });
  options('fb-post-condition', CONDITIONS);
  el('fb-post-deadline').min = today();
  el('fb-post-deadline').max = today(Date.now() + 90 * DAY);
  el('fb-form').hidden = false;
  el('fb-filter').hidden = false;
  el('fb-load').hidden = false;
  var items = [], page = 0, more = false, busy = false, loaded = false, cooldownUntil = 0;
  function render() {
    var grid = el('fb-list');
    grid.replaceChildren();
    if (!loaded) return;
    var shown = filterItems(items, {city: el('fb-city').value, category: el('fb-category').value, status: el('fb-status-filter').value, query: el('fb-query').value, sort: el('fb-sort').value});
    el('fb-count').textContent = '目前已載入 ' + items.filter(function (x) { return x.deadline >= today(); }).length + ' 件有效物品；篩選後 ' + shown.length + ' 件。' + (more ? ' 還有下一批，可按「載入更多」。' : '');
    if (!shown.length) {
      grid.appendChild(node('p', items.length ? '目前的篩選沒有結果，試試其他城市或分類；也可清除篩選。' : '目前沒有可顯示的有效刊登。你可以送出第一件免費物品，審核後就會出現在這裡。', 'fb-empty'));
      return;
    }
    shown.forEach(function (x) {
      var card = node('article', null, 'fb-card');
      var top = node('div', null, 'fb-card-top');
      top.appendChild(node('span', 'AUD 0 · 免費', 'fb-price'));
      top.appendChild(node('span', x.status, 'fb-tag' + (x.status === '已預約' ? ' fb-reserved' : '')));
      card.appendChild(top);
      card.appendChild(node('h3', x.item));
      card.appendChild(node('p', x.city + ' · ' + x.category, 'fb-meta'));
      card.appendChild(node('p', x.condition, 'fb-meta'));
      card.appendChild(node('p', x.details, 'fb-description'));
      card.appendChild(node('p', '面交：' + x.pickup));
      var deadline = node('p', '領取截止：' + x.deadline + '（伯斯時間）', 'fb-deadline');
      if ((Date.parse(x.deadline) - Date.parse(today())) / DAY <= 3) deadline.appendChild(node('strong', ' · 即將截止'));
      card.appendChild(deadline);
      var link = node('a', '看照片／到 GitHub 原貼聯絡', 'btn secondary');
      link.href = x.url; link.target = '_blank'; link.rel = 'noopener noreferrer';
      card.appendChild(link);
      card.appendChild(node('p', '社群提供・審核不是身分或商品安全保證。留言公開，勿貼電話與住址。', 'fb-meta'));
      grid.appendChild(card);
    });
  }
  async function load(next) {
    if (busy) return;
    if (!next && Date.now() < cooldownUntil) { el('fb-message').textContent = '剛剛已更新；請稍後再試，或直接開啟 GitHub 公開刊登。'; return; }
    busy = true;
    el('fb-load').disabled = true; el('fb-more').disabled = true;
    el('fb-list').setAttribute('aria-busy', 'true');
    el('fb-message').textContent = '正在讀取 GitHub 公開刊登…';
    var controller = new AbortController(), timer = root.setTimeout(function () { controller.abort(); }, 12000);
    try {
      var current = next ? page + 1 : 1;
      var response = await root.fetch(apiUrl(current), {credentials: 'omit', referrerPolicy: 'no-referrer', cache: 'no-store', headers: {Accept: 'application/vnd.github+json'}, signal: controller.signal});
      if (!response.ok) throw new Error(response.status === 403 || response.status === 429 ? 'GitHub 暫時限制讀取，請稍後再試，或開啟 GitHub 公開刊登。' : '目前無法讀取刊登；這不代表沒有物品，請重試或開啟 GitHub 公開刊登。');
      var data = await response.json();
      if (!Array.isArray(data)) throw new Error('刊登資料格式不符，請改看 GitHub 原貼。');
      var found = data.map(function (x) { return readIssue(x); }).filter(Boolean);
      if (!next) items = [];
      var seen = new Set(items.map(function (x) { return x.number; }));
      found.forEach(function (x) { if (!seen.has(x.number)) { seen.add(x.number); items.push(x); } });
      page = current;
      more = /<[^>]+>;\s*rel="next"/.test(response.headers.get('Link') || '');
      loaded = true; cooldownUntil = Date.now() + 30000;
      el('fb-load').textContent = '重新整理物品';
      el('fb-more').hidden = !more;
      el('fb-message').textContent = '已讀取 GitHub 公開資料。已關閉、已送出、過期、待審核或格式不完整的刊登不顯示；預約狀態仍以原貼為準。';
      render();
    } catch (e) {
      el('fb-message').textContent = (e.name === 'AbortError' ? '讀取逾時，請重試或直接開啟 GitHub 公開刊登。' : e.message) + (loaded ? ' 下方保留上次載入的結果，可能已變更。' : '');
    } finally {
      root.clearTimeout(timer); busy = false;
      el('fb-load').disabled = false; el('fb-more').disabled = false;
      el('fb-list').setAttribute('aria-busy', 'false');
    }
  }
  el('fb-load').addEventListener('click', function () { load(false); });
  el('fb-more').addEventListener('click', function () { load(true); });
  el('fb-filter').addEventListener('input', render);
  el('fb-filter').addEventListener('change', render);
  el('fb-reset').addEventListener('click', function () { el('fb-filter').reset(); render(); });
  el('fb-filter').addEventListener('submit', function (e) { e.preventDefault(); render(); });
  function invalidate() { el('fb-preview').hidden = true; el('fb-open').removeAttribute('href'); el('fb-form-error').textContent = ''; }
  el('fb-form').addEventListener('input', invalidate);
  el('fb-form').addEventListener('change', invalidate);
  el('fb-form').addEventListener('submit', function (e) {
    e.preventDefault();
    invalidate();
    var data = {};
    ['item', 'city', 'category', 'condition', 'deadline', 'pickup', 'details'].forEach(function (k) { data[k] = el('fb-post-' + k).value; });
    try {
      var draft = draftUrl(data, el('fb-consent').checked);
      var lines = Object.keys(draft.data).map(function (k) { return FIELDS[k] + '：' + draft.data[k]; });
      el('fb-preview-text').textContent = '免費（AUD 0）\n' + lines.join('\n');
      el('fb-open').href = draft.url;
      el('fb-preview').hidden = false;
      el('fb-preview').focus();
    } catch (err) { el('fb-form-error').textContent = err.message; }
  });
})(typeof window !== 'undefined' ? window : globalThis);
