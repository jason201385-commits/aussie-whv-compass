'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const {CITIES} = require('../assets/free-board.js');
const {buildShareUrl, readSharedCity} = require('../assets/free-board-navigation.js');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
test('every root page has the same 13-link nav and free items is second', () => {
  let expected;
  for (const file of fs.readdirSync(root).filter(f => f.endsWith('.html'))) {
    const nav = read(file).match(/<div class="nav-links">([\s\S]*?)<\/div>/)?.[1];
    assert.ok(nav, file);
    const links = [...nav.matchAll(/<a\b[^>]*href="([^"]+)"/g)].map(m => m[1]);
    assert.equal(links.length, 13, file);
    assert.equal(links[1], 'free.html', file);
    expected ??= links;
    assert.deepEqual(links, expected, file);
  }
});
test('free page has a unique static current-page link; 404 has none', () => {
  assert.match(read('free.html'), /<a class="active" aria-current="page" href="free.html">免費二手<\/a>/);
  assert.equal((read('free.html').match(/aria-current="page"/g) || []).length, 1);
  assert.doesNotMatch(read('404.html'), /aria-current="page"/);
});
test('homepage entry is beside stages, before panels; the old duplicate is removed', () => {
  const html = read('index.html');
  const start = html.indexOf('class="home-free-entry"');
  assert.ok(start > html.indexOf('id="journey-map"') && start < html.indexOf('id="common-problems"'));
  const entry = html.match(/<aside class="home-free-entry"[\s\S]*?<\/aside>/)[0];
  assert.match(entry, /href="free.html#free-board"/);
  assert.match(entry, /href="free.html#publish"/);
  assert.doesNotMatch(html, /<a class="home-entry-card" href="free.html">/);
});
test('all language quick starts and full English pages have explicit Chinese-board links', () => {
  const walk = dir => fs.readdirSync(dir, {withFileTypes:true}).flatMap(e => e.isDirectory() ? walk(path.join(dir,e.name)) : e.name.endsWith('.html') ? [path.join(dir,e.name)] : []);
  for (const file of walk(path.join(root,'lang'))) {
    assert.match(fs.readFileSync(file,'utf8'), /href="\/free.html" hreflang="zh-Hant">Free items \(Chinese\)<\/a>/, file);
  }
});
test('context entry and both mobile targets exist without JS', () => {
  for (const file of ['prep.html','housing.html']) {
    assert.match(read(file), /href="free.html#free-board"/);
    assert.match(read(file), /href="free.html#publish"/);
  }
  const html=read('free.html');
  assert.match(html, /<nav class="fb-mobile-actions"/);
  assert.match(html, /id="free-board" tabindex="-1"/);
  assert.match(html, /id="publish" tabindex="-1"/);
  assert.match(html, /src="assets\/free-board-navigation.js\?v=20260917-01" defer/);
});
test('every allowed city round-trips without a query string', () => {
  for(const city of CITIES){const u=new URL(buildShareUrl(city,CITIES));assert.equal(u.origin,'https://www.aussiewhvcompass.com');assert.equal(u.pathname,'/free.html');assert.equal(u.search,'');assert.equal(readSharedCity(u.hash,CITIES),city);}
});
test('unknown or malicious cities fall back to the canonical board', () => {
  for(const city of ['https://evil.invalid','<script>alert(1)</script>',null,undefined,'Perth WA&body=private','Sydney NSW#publish']){
    assert.equal(buildShareUrl(city,CITIES),'https://www.aussiewhvcompass.com/free.html#free-board');
  }
});
test('malformed, duplicated, oversize or non-board fragments are ignored', () => {
  for(const hash of ['#publish?city=Perth%20WA','#free-board?city=%E0%A4%A','#free-board?city=Perth%20WA&city=Sydney%20NSW','#free-board?city='+'A'.repeat(600),null,'#free-board','?city=Perth%20WA']) assert.equal(readSharedCity(hash,CITIES),'');
});
test('only allowlisted city is restored; other parameters never enter shared URL', () => {
  const city=readSharedCity('#free-board?city=Perth%20WA&q=private&body=secret&url=https://evil.invalid',CITIES);
  const url=buildShareUrl(city,CITIES);
  assert.equal(url,'https://www.aussiewhvcompass.com/free.html#free-board?city=Perth%20WA');
});
test('new module cannot initiate API calls, storage, location capture or HTML injection', () => {
  const source=read('assets/free-board-navigation.js');
  for(const pattern of [/\bfetch\s*\(/,/XMLHttpRequest/,/sendBeacon/,/localStorage/,/sessionStorage/,/\.geolocation\b/,/innerHTML\s*=/,/document\.write/,/location\.search/]) assert.doesNotMatch(source,pattern);
});
test('mobile bar has safe-area, editing and print protections', () => {
  const css=read('assets/free-board.css');
  assert.match(css,/safe-area-inset-bottom/);assert.match(css,/\.fb-editing \.fb-mobile-actions/);assert.match(css,/@media print/);assert.match(css,/padding-bottom:calc\(88px/);
});
test('static HTML has no duplicate IDs or broken local anchors', () => {
  for (const file of fs.readdirSync(root).filter(f=>f.endsWith('.html'))) {
    const html=read(file);const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);assert.equal(new Set(ids).size,ids.length,file);
    for(const m of html.matchAll(/<a\b[^>]*href="((?:[a-z0-9-]+\.html)?#[a-zA-Z0-9_-]+)"/g)){
      const [target,fragment]=m[1].split('#');const destination=target||file;
      assert.ok(read(destination).includes('id="'+fragment+'"'),`${file} -> ${m[1]}`);
    }
  }
});
