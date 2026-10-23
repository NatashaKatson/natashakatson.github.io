const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const core = require('../static/historyallaround/atlas/discovery-core.js');
const html = fs.readFileSync('static/historyallaround/atlas/index.html', 'utf8');
const context = vm.createContext({ state: { year: -67000000 } });
const declarations = [html.match(/^const NOW=.*$/m)[0], html.match(/^const SEG=.*$/m)[0],
  'const SAME_TIME_YEARS=1;', ...['yearAt', 'tAt', 'fmt', 'fmtSpan', 'halfWin'].map((name) =>
    html.match(new RegExp('^function ' + name + '\\(.*$', 'm'))[0]),
  html.match(/^function parseYear\(s\)\{[\s\S]*?^\}/m)[0]];
vm.runInContext(declarations.join('\n'), context);

test('deep time and historic dates share a bounded, reversible timeline', () => {
  for (const year of [-252000000, -228000000, -150000000, -93500000, -67000000, -300000, -500, -1, 1, 2026]) {
    context.year = year;
    assert(Math.abs(vm.runInContext('yearAt(tAt(year))', context) - year) < .000001);
    assert.equal(vm.runInContext('parseYear(fmt(year))', context), year);
  }
  for (const [input, expected] of [['67 Ma', -67000000], ['93.5 mya', -93500000],
    ['150 million years ago', -150000000], ['500 BC', -500], ['2026', 2026]]) {
    context.input = input;
    assert.equal(vm.runInContext('parseYear(input)', context), expected);
  }
  for (const input of ['0 Ma', '-67 Ma', '253 Ma', '67 Ma CE', 'Infinity Ma', '0']) {
    context.input = input;
    assert.equal(vm.runInContext('parseYear(input)', context), null);
  }
  assert.equal(vm.runInContext('halfWin(-67000000)', context), 1000000);
  assert.equal(vm.runInContext('halfWin(1903)', context), 1);
  assert.equal(vm.runInContext('fmtSpan(-99000000,-93500000,true)', context), 'c. 99–93.5 million years ago');
});

test('dinosaur records have approximate ages, modern fossil regions and source links', () => {
  const data = vm.createContext({});
  vm.runInContext(html.match(/const EVENTS = \[[\s\S]*?\n\];/)[0] + '\nglobalThis.rows=EVENTS;', data);
  const fossils = Array.from(data.rows).filter((r) => r[8] === 'dinosaurs');
  assert.equal(fossils.length, 8);
  assert.equal(new Set(fossils.map((r) => r[9])).size, fossils.length);
  assert(fossils.some((r) => r[9] === 'Tyrannosaurus'));
  assert(fossils.some((r) => r[9] === 'Triceratops'));
  for (const r of fossils) {
    assert(r[0] >= -252000000 && r[0] <= (r[1] ?? r[0]) && (r[1] ?? r[0]) <= -66000000);
    assert.equal(r[2], 1);
    assert(Number.isFinite(r[5]) && Math.abs(r[5]) <= 90 && Number.isFinite(r[6]) && Math.abs(r[6]) <= 180);
    assert(r[11].includes('region'));
    for (const url of [r[10], r[12]]) assert.equal(new URL(url).protocol, 'https:');
  }
  for (const name of ['dinosaurs.js', 'search.js', 'discovery.js'])
    new vm.Script(fs.readFileSync('static/historyallaround/atlas/' + name, 'utf8'));
});

test('deep-time shared views restore fossil records without allowing unbounded dates', () => {
  const view = { v: 1, year: -67000000, left: -150000000, mode: 'globe', borders: 'history',
    rot: [102, -45, 0], pan: [0, 0], zoom: 2, split: .5, compare: false,
    changed: false, selectedYear: null, cats: ['dinosaurs'],
    record: { wiki: 'Tyrannosaurus', kind: 'event', date: -68000000 }, polity: null,
    point: null, story: null };
  const hash = (v) => '#' + new URLSearchParams({ view: JSON.stringify(v) });
  assert.deepEqual(core.parseView(hash(view), 2026, ['dinosaurs']), view);
  assert.equal(core.parseView(hash({ ...view, year: -252000001 }), 2026, ['dinosaurs']), null);
});
