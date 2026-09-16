/* Free-board navigation and city sharing. No API calls, geolocation or storage. */
(function (root) {
  'use strict';
  var BOARD_URL = 'https://www.aussiewhvcompass.com/free.html';
  function allowedCity(city, cities) {
    return typeof city === 'string' && Array.isArray(cities) && cities.indexOf(city) >= 0 ? city : '';
  }
  function buildShareUrl(city, cities) {
    var selected = allowedCity(city, cities);
    return BOARD_URL + '#free-board' + (selected ? '?city=' + encodeURIComponent(selected) : '');
  }
  function readSharedCity(hash, cities) {
    if (typeof hash !== 'string' || hash.length > 512 || hash.indexOf('#free-board?') !== 0) return '';
    var params = new URLSearchParams(hash.slice('#free-board?'.length));
    if (params.getAll('city').length !== 1) return '';
    return allowedCity(params.get('city'), cities);
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { buildShareUrl: buildShareUrl, readSharedCity: readSharedCity };
  }
  var document = root.document;
  if (!document || !document.getElementById('fb-share-controls')) return;
  var city = document.getElementById('fb-city');
  var controls = document.getElementById('fb-share-controls');
  var copy = document.getElementById('fb-share-copy');
  var share = document.getElementById('fb-share-open');
  var message = document.getElementById('fb-share-message');
  var fallback = document.getElementById('fb-share-fallback');
  var field = document.getElementById('fb-share-url');
  if (!city || !copy || !share || !message || !fallback || !field) return;
  var cities = Array.from(city.options).map(function (o) { return o.value; }).filter(Boolean);
  // The existing board script owns the city list; do not create a second list.
  if (!cities.length) return;
  var sharing = false;
  controls.hidden = false;
  function url() { return buildShareUrl(city.value, cities); }
  function updateScope() {
    var selected = allowedCity(city.value, cities);
    copy.textContent = selected ? '複製同城連結' : '複製看板連結';
    share.textContent = selected ? '分享同城看板' : '分享看板';
    document.getElementById('fb-share-scope').textContent = '分享範圍：' + (selected || '全部地區') + '。只帶城市，不包含搜尋字詞、刊登草稿或聯絡資料。';
    fallback.hidden = true;
    field.value = '';
    message.textContent = '';
  }
  function showManual(link) {
    fallback.hidden = false;
    field.value = link;
    field.focus();
    field.select();
    message.textContent = '未能自動複製，請長按或選取下方連結複製。';
  }
  async function copyLink(link) {
    try {
      if (!root.navigator.clipboard || typeof root.navigator.clipboard.writeText !== 'function') {
        showManual(link); return;
      }
      await root.navigator.clipboard.writeText(link);
      message.textContent = '連結已複製；可貼到你熟悉的聊天或社團。';
    } catch (_) { showManual(link); }
  }
  function setBusy(value) { sharing = value; copy.disabled = value; share.disabled = value; }
  copy.addEventListener('click', async function () {
    if (sharing) return;
    setBusy(true);
    try { await copyLink(url()); } finally { setBusy(false); }
  });
  share.addEventListener('click', async function () {
    if (sharing) return;
    var data = { title: '澳打指南針｜免費二手', url: url() };
    setBusy(true);
    try {
      if (typeof root.navigator.share === 'function') {
        await root.navigator.share(data);
        message.textContent = '已開啟裝置分享功能；是否送出請以所選 App 為準。';
      } else {
        await copyLink(data.url);
      }
    } catch (error) {
      if (error && error.name === 'AbortError') message.textContent = '已取消分享。';
      else showManual(data.url);
    } finally { setBusy(false); }
  });
  function applySharedCity() {
    var selected = readSharedCity(root.location.hash, cities);
    if (!selected) return;
    city.value = selected;
    city.dispatchEvent(new root.Event('change', { bubbles: true }));
    updateScope();
    // Restoring a link never consents to GitHub reads and never fills a draft.
    root.requestAnimationFrame(function () {
      document.getElementById('free-board').scrollIntoView({ block: 'start', behavior: 'instant' });
    });
  }
  city.addEventListener('change', updateScope);
  document.getElementById('fb-reset').addEventListener('click', updateScope);
  root.addEventListener('hashchange', applySharedCity);
  updateScope();
  applySharedCity();
  // Keep the mobile action bar away from focused fields and the virtual keyboard.
  function updateEditing() {
    var active = document.activeElement;
    document.body.classList.toggle('fb-editing', !!(active && active.matches('input, textarea, select, [contenteditable="true"]')));
  }
  document.addEventListener('focusin', updateEditing);
  document.addEventListener('focusout', function () { root.setTimeout(updateEditing, 0); });
  document.querySelectorAll('.fb-mobile-actions a, .fb-hero a[href="#publish"], .fb-hero a[href="#free-board"]').forEach(function (link) {
    link.addEventListener('click', function () {
      var target = document.getElementById(link.hash.slice(1));
      if (target) root.requestAnimationFrame(function () { target.focus({ preventScroll: true }); });
    });
  });
})(typeof window !== 'undefined' ? window : globalThis);
