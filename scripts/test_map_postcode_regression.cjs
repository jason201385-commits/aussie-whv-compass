/* Run: node --test scripts/test_map_postcode_regression.cjs
 * Executes the actual browser script with a minimal DOM and controlled fixtures.
 * No npm packages, live network, copied matching functions or production writes.
 * Fixtures test software behaviour, not current visa eligibility or postal validity.
 */
'use strict';
const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const sourcePath = process.env.MAP_SCRIPT || path.join(__dirname, '../assets/map-transparency.js');
const source = fs.readFileSync(sourcePath, 'utf8');

function fixture() {
  return {
    source: 'https://example.invalid/417-source',
    retrieved: 'test-fixture',
    regional: {
      _source_table: 'Metadata must not be treated as postcodes',
      NSW: ['2311-2312', '2618-2739'], VIC: ['3139'], QLD: ['4124-4125'],
      WA: ['6041-6044'], SA: 'ALL', TAS: 'ALL', NT: 'ALL', NORFOLK: 'ALL'
    },
    northern_remote_tourism: {
      remote_very_remote: { NSW: ['2899'], QLD: ['4417-4420'], NT: 'ALL' },
      northern_australia: { WA: ['0872'], NT: 'ALL' },
      extra_postcodes: { QLD: ['4406'], TAS: ['7215'] }
    },
    bushfire: { postcodes: { ACT: 'ALL', NSW: ['2618-2633', '4380'], QLD: ['4380-4385'] } },
    // Deliberately synthetic entry outside the approximate state mapping.
    disaster: { postcodes: { NSW: ['2999'] } }
  };
}

function element(value = '') {
  return {
    value, innerHTML: '', listeners: {}, attributes: {},
    addEventListener(name, fn) { this.listeners[name] = fn; },
    fire(name, event = {}) {
      assert.equal(typeof this.listeners[name], 'function', `Missing ${name} listener`);
      this.listeners[name](event);
    },
    querySelectorAll() { return []; }, querySelector() { return null; },
    insertAdjacentHTML(position, html) { this.innerHTML += html; },
    setAttribute(name, value) { this.attributes[name] = value; },
    classList: { toggle() {} }, scrollIntoView() {}
  };
}

function boot(data = fixture(), options = {}) {
  const ids = {};
  for (const id of ['transparency-map', 'tm-layer', 'tm-state-select', 'tm-detail',
    'tm-postcode', 'tm-category', 'tm-check', 'tm-postcode-result', 'tm-seasons', 'jr-state']) {
    ids[id] = element();
  }
  ids['tm-layer'].value = 'regional';
  ids['tm-category'].value = 'regional';
  if (options.noRoot) delete ids['transparency-map'];
  let fetchCount = 0;
  const context = vm.createContext({
    window: { WHV_POSTCODES: data },
    document: { getElementById(id) { return ids[id] || null; } },
    // Leaflet is intentionally absent: postcode lookup must still work.
    fetch() {
      fetchCount++;
      return options.failFetch ? Promise.reject(new Error('simulated offline')) : new Promise(() => {});
    },
    console: { warn() {} }, setTimeout
  });
  vm.runInContext(source, context, { filename: sourcePath, timeout: 2000 });
  return {
    ids, get fetchCount() { return fetchCount; },
    check(postcode, category = 'regional', enter = false) {
      ids['tm-postcode'].value = postcode;
      ids['tm-category'].value = category;
      if (enter) {
        let prevented = false;
        ids['tm-postcode'].fire('keydown', { key: 'Enter', preventDefault() { prevented = true; } });
        assert.equal(prevented, true);
      } else ids['tm-check'].fire('click');
      return ids['tm-postcode-result'].innerHTML;
    }
  };
}

function assertMatch(html) { assert.match(html, /result-ok/); }
function assertNoMatch(html) { assert.match(html, /result-no/); assert.doesNotMatch(html, /result-ok/); }

test('2618 matches the explicit NSW regional range, not the approximate ACT bucket', () => {
  const app = boot();
  assertMatch(app.check('2618'));
  assert.equal(app.ids['tm-state-select'].value, 'NSW');
});

test('ranges include both endpoints and exclude adjacent postcodes', () => {
  const app = boot();
  for (const pc of ['2618', '2739', '2311', '2312']) assertMatch(app.check(pc));
  for (const pc of ['2617', '2740', '2310', '2313']) assertNoMatch(app.check(pc));
});

test('NT leading zero is preserved; invalid / HTML input is rejected', () => {
  const app = boot();
  assertMatch(app.check('0870'));
  assert.match(app.ids['tm-postcode-result'].innerHTML, /<strong>0870<\/strong>/);
  for (const pc of ['870', '', '08701', '26a8', '<script>']) {
    const html = app.check(pc);
    assertNoMatch(html);
    assert.match(html, /四位數字/);
    assert.doesNotMatch(html, /<script>/);
  }
  assertMatch(app.check(' 0870 '));
});

test('ALL remains state-scoped instead of matching every postcode', () => {
  const app = boot();
  for (const pc of ['5000', '7000', '0870']) assertMatch(app.check(pc));
  for (const pc of ['2000', '3000', '0000', '9999']) assertNoMatch(app.check(pc));
  assertMatch(app.check('2600', 'bushfire'));
  assertNoMatch(app.check('2000', 'bushfire'));
});

test('tourism unions all three tables, including leading-zero cross-state entries', () => {
  const app = boot();
  for (const pc of ['4417', '4420', '0872', '4406', '7215']) assertMatch(app.check(pc, 'tourism'));
  assertNoMatch(app.check('4416', 'tourism'));
  const html = app.check('0872', 'tourism');
  assert.match(html, /WA/);
  assert.match(html, /NT/);
  assert.match(html, /多個州/);
  assert.equal(app.ids['tm-state-select'].value, 'ALL');
});

test('explicit disaster entry is checked even when the display cannot infer a state', () => {
  const app = boot();
  assertMatch(app.check('2999', 'disaster'));
  assert.equal(app.ids['tm-state-select'].value, 'NSW');
});

test('multiple explicit state matches do not claim a unique state', () => {
  const app = boot();
  const html = app.check('4380', 'bushfire');
  assertMatch(html);
  assert.match(html, /NSW/);
  assert.match(html, /QLD/);
  assert.equal(app.ids['tm-state-select'].value, 'ALL');
});

test('unknown and inherited category names are rejected safely', () => {
  const app = boot();
  for (const cat of ['unknown', 'constructor', '__proto__', 'toString']) {
    assert.match(app.check('2618', cat), /有效的指定工作類別/);
  }
});

test('missing category data does not throw or invent NT tourism coverage', () => {
  const app = boot({});
  for (const cat of ['regional', 'tourism', 'bushfire', 'disaster']) {
    assertNoMatch(app.check('0870', cat));
  }
});

test('missing entire dataset gives a loading error without attaching lookup handlers', () => {
  const app = boot(null);
  assert.match(app.ids['transparency-map'].innerHTML, /資料載入失敗/);
  assert.equal(app.ids['tm-check'].listeners.click, undefined);
  assert.equal(app.fetchCount, 0);
});

test('417-only scope and non-boundary map warning survive state selection', () => {
  const app = boot();
  for (const run of [() => {}, () => app.check('2618')]) {
    run();
    const detail = app.ids['tm-detail'].innerHTML;
    assert.match(detail, /417/);
    assert.match(detail, /462/);
    assert.match(detail, /州別概覽，不是合資格邊界圖/);
    assert.match(detail, /部分區段列入/);
  }
  assert.match(app.check('2000'), /內政部官方清單/);
});

test('query updates displayed layer; editing postcode or category clears stale results', () => {
  const app = boot();
  assertMatch(app.check('4406', 'tourism'));
  assert.equal(app.ids['tm-layer'].value, 'tourism');
  app.ids['tm-postcode'].fire('input');
  assert.equal(app.ids['tm-postcode-result'].innerHTML, '');
  assertMatch(app.check('2618'));
  app.ids['tm-category'].fire('change');
  assert.equal(app.ids['tm-postcode-result'].innerHTML, '');
});

test('Enter and click use the same validated lookup', () => {
  const app = boot();
  assert.equal(app.check('2618', 'regional', true), app.check('2618'));
});

test('unrelated pages without the map root do not fetch or attach handlers', () => {
  const app = boot(fixture(), { noRoot: true });
  assert.equal(app.fetchCount, 0);
  assert.equal(app.ids['tm-check'].listeners.click, undefined);
});

test('postcode lookup survives missing Leaflet and failed external data requests', async () => {
  const app = boot(fixture(), { failFetch: true });
  await new Promise(setImmediate);
  assert.equal(app.fetchCount, 2);
  assert.match(app.ids['transparency-map'].innerHTML, /地圖函式庫載入失敗/);
  assertMatch(app.check('2618'));
});

test('malformed range tokens and metadata cannot accidentally match', () => {
  const data = fixture();
  data.regional = { NSW: ['2618oops', '2739-2618'], _source_table: ['2618'] };
  assertNoMatch(boot(data).check('2618'));
});
