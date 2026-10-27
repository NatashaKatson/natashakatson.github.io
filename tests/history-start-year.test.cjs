const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const html = fs.readFileSync('static/historyallaround/atlas/index.html', 'utf8');
const startup = html.slice(html.indexOf('const NOW='), html.indexOf('// piecewise scale:'));
const state = html.match(/^const state=.*$/m)[0];
const yearLink = html.match(/\/\/ initial state from link[^\n]*\n([^\n]+)/)[1];
function visit(storage, hash = '') {
  const context = vm.createContext({ localStorage: storage, location: { hash }, CATS: {} });
  vm.runInContext(startup + '\n' + state + '\n' + yearLink, context);
  return { year: vm.runInContext('state.year', context), context };
}

test('fresh visits and invalid remembered years open at the supported current year', () => {
  for (const value of [null, '', '0', 'NaN', 'Infinity', 'bad', '2027', '-252000001', '1453.5']) {
    assert.equal(visit({ getItem: () => value }).year, 2026, String(value));
  }
});

test('return visits restore human-history, BC and deep-time years', () => {
  const data = new Map();
  const storage = { getItem: (key) => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) };
  for (const year of [1789, -500, -67000000, -252000000, -1, 1, 2026]) {
    const { context } = visit(storage);
    vm.runInContext(`rememberAtlasYear(${year})`, context);
    assert.equal(visit(storage).year, year);
  }
});

test('explicit year links override a remembered year', () => {
  const storage = { getItem: () => '1789' };
  assert.equal(visit(storage, '#1903').year, 1903);
  assert.equal(visit(storage, '#500bc').year, -500);
  assert.equal(visit(storage, '#67000000bc').year, -67000000);
  for (const hash of ['#0', '#2027', '#252000001bc', '#invalid']) {
    assert.equal(visit(storage, hash).year, 1789);
  }
});

test('blocked storage falls back safely and does not break year changes', () => {
  const storage = {
    getItem() { throw Error('Storage blocked'); },
    setItem() { throw Error('Storage full'); },
  };
  const { year, context } = visit(storage);
  assert.equal(year, 2026);
  assert.doesNotThrow(() => vm.runInContext('rememberAtlasYear(1789)', context));
  assert.equal(visit(storage, '#1903').year, 1903);
});
