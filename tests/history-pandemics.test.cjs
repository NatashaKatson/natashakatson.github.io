const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const core = require('../static/historyallaround/atlas/discovery-core.js');
const { html, events } = require('../scripts/audit-history-accuracy.cjs').records();
const context = vm.createContext({ DiscoveryCore: core, window: {} });
vm.runInContext([
  html.match(/const EVENTS = \[[\s\S]*?\n\];/)[0],
  html.match(/^const ev=EVENTS.map.*$/m)[0],
  html.match(/^const CATS=.*$/m)[0],
  html.match(/^const SAME_TIME_YEARS=.*$/m)[0],
  ...['fmt', 'fmtSpan', 'fmtEvent', 'halfWin', 'relevance'].map(name => html.match(new RegExp('^function ' + name + '\\(.*$', 'm'))[0]),
  'const state={year:2026,cats:new Set(Object.keys(CATS))};let actMemo={};',
  html.match(/^function activeEvents\(\)[\s\S]*?return actMemo.v\}/m)[0],
  'globalThis.events=ev;globalThis.categories=CATS;globalThis.state=state;',
].join('\n'), context);
const pandemics = Array.from(context.events).filter(e => e.cat === 'pandemics');
const byWiki = wiki => pandemics.find(e => e.wiki === wiki);
const active = year => {
  context.state.year = year;
  return Array.from(vm.runInContext('activeEvents()', context), ({ e }) => e.wiki);
};

test('dedicated category covers seven cholera pandemics, plague eras, early influenza and modern pandemics', () => {
  assert.equal(context.categories.pandemics, 'Pandemics');
  assert.equal(pandemics.length, 32);
  for (const prefix of ['First','Second','Third','Fourth','Fifth','Sixth','Seventh']) assert(byWiki(prefix + '_cholera_pandemic'));
  for (const wiki of [
    'Antonine_Plague', 'Plague_of_Cyprian', 'Plague_of_Justinian', 'Black_Death', 'Second_plague_pandemic', 'Third_plague_pandemic',
    '1510_influenza_pandemic', '1557_influenza_pandemic', '1580_influenza_pandemic', '1729_influenza_pandemic',
    '1761_influenza_pandemic', '1781_influenza_pandemic', '1788_influenza_pandemic', '1830_influenza_pandemic',
    '1847_influenza_pandemic', '1889–1890_pandemic', 'Spanish_flu', '1957–1958_influenza_pandemic',
    '1968_influenza_pandemic', '1977_Russian_flu', '2009_swine_flu_pandemic', 'History_of_smallpox', 'HIV/AIDS', 'COVID-19',
  ]) assert(byWiki(wiki), wiki);
  assert(!byWiki('Smallpox_vaccine'));
  assert(!byWiki('Eradication_of_smallpox'), 'eradication remains a separate milestone');
});

test('actual map filtering includes pandemic interiors and endpoints and removes only their category', () => {
  context.state.cats = new Set(['pandemics']);
  for (const e of pandemics) {
    for (const year of new Set([e.start, e.end, Math.floor((e.start + e.end) / 2)])) assert(active(year).includes(e.wiki), `${e.wiki} at ${year}`);
    assert(!active(e.start - 3).includes(e.wiki), `${e.wiki} is absent before the two-year proximity window`);
    assert(!active(e.end + 3).includes(e.wiki), `${e.wiki} is absent after the two-year proximity window`);
  }
  context.state.cats = new Set(['nature']);
  assert(!active(1918).includes('Spanish_flu'));
  context.state.cats.add('pandemics');
  assert(active(1918).includes('Spanish_flu'));
  context.state.cats.delete('pandemics');
  assert(!active(1918).includes('Spanish_flu'));
});

test('ongoing labels distinguish the atlas cutoff from historical endings on every date surface', () => {
  for (const [wiki, label] of [['Seventh_cholera_pandemic','1961–present'], ['HIV/AIDS','1981–present'], ['COVID-19','2019–present']]) {
    const e = byWiki(wiki);
    assert.equal(e.ongoing, true);
    assert.equal(e.end, 2026);
    context.record = e;
    assert.equal(vm.runInContext('fmtEvent(record)', context), label);
    assert.match(e.blurb, /2026/);
  }
  const emergency = byWiki('COVID-19_pandemic');
  assert.equal(emergency.ongoing, false);
  context.record = emergency;
  assert.equal(vm.runInContext('fmtEvent(record)', context), '2020–2023');
  assert.match(emergency.title, /emergency/);
});

test('pandemic search aliases and shared views retain their real event destinations and category', () => {
  const script = fs.readFileSync('static/historyallaround/atlas/search.js', 'utf8');
  const prepare = script.slice(script.indexOf('const localRecords ='), script.indexOf('  const datasets ='));
  const sandbox = vm.createContext({ core, ev: context.events, ppl: [], HistoryCountries: { rows: [] } });
  vm.runInContext(prepare + '\nglobalThis.searchRecords=localRecords;', sandbox);
  const all = core.search(sandbox.searchRecords, 'pandemics', 'event', 100);
  for (const event of pandemics) assert(all.some(r => r.recordId === event.id), event.wiki);
  for (const [query, wiki] of [['1836 flu','1830_influenza_pandemic'], ['1732 flu','1729_influenza_pandemic'], ['second cholera','Second_cholera_pandemic']]) {
    assert(core.search(sandbox.searchRecords, query, 'event', 100).some(r => r.recordId === byWiki(wiki).id));
  }
  assert.equal(all.find(r => r.recordId === byWiki('COVID-19').id).ongoing, true);
  const view = { v: 1, year: 1918, left: 1347, mode: 'flat', borders: 'history', rot: [0,0,0], pan: [0,0], zoom: 1,
    split: .5, compare: true, changed: false, selectedYear: 1918, cats: ['pandemics'],
    record: { wiki: 'Spanish_flu', kind: 'event', date: 1918 }, polity: null, point: null, story: null };
  assert.deepEqual(core.parseView('#' + new URLSearchParams({ view: JSON.stringify(view) }), 2026, Object.keys(context.categories)), view);
});

test('historical uncertainty, source links and independent marker meanings are retained', () => {
  assert.match(byWiki('Antonine_Plague').blurb, /uncertain/);
  assert.match(byWiki('Plague_of_Cyprian').blurb, /disputed/);
  assert.match(byWiki('1847_influenza_pandemic').title, /debated/);
  assert.match(byWiki('1889–1890_pandemic').blurb, /unconfirmed/);
  assert.match(byWiki('1977_Russian_flu').title, /age-restricted/);
  assert.equal(new Set(events.map(r => r[9])).size, events.length);
  vm.runInContext(fs.readFileSync('static/historyallaround/atlas/event-emojis.js', 'utf8'), context);
  for (const e of pandemics) {
    assert(e.source.startsWith('https://'), e.wiki);
    assert(Number.isFinite(e.lon) && Number.isFinite(e.lat));
    assert.equal(context.window.AtlasEventEmojis.get(e), '🦠');
  }
});
