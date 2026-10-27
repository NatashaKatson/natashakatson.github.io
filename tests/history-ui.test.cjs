const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const core = require('../static/historyallaround/atlas/discovery-core.js');
const countries = require('../static/historyallaround/atlas/search-countries.js');
const { events } = require('../scripts/audit-history-accuracy.cjs').records();
const records = Array.from(events, (r) => ({ kind: 'event', cat: r[8], start: r[0], end: r[1] ?? r[0], wiki: r[9], indigenous: r[13] }));

test('1992 contains nearby dated events without unrelated Indigenous community overviews', () => {
  const active = records.filter((r) => core.yearGap(r.start, r.end, 1992) <= core.sameTimeYears);
  const context = active.filter((r) => core.isHistoricalContext(r, 1992));
  const dated = active.filter((r) => !core.isHistoricalContext(r, 1992));
  assert.deepEqual(context.map((r) => r.wiki), ['Seventh_cholera_pandemic', 'HIV/AIDS', 'Vietnamese_boat_people']);
  assert.deepEqual(dated.map((r) => r.wiki), ['Dissolution_of_the_Soviet_Union', '1994_South_African_general_election', 'Bosnian_War', 'Great_Lakes_refugee_crisis', 'Belém_do_Pará_Convention', 'Planned_Parenthood_v._Casey', 'Freedom_of_Access_to_Clinic_Entrances_Act']);
  assert(!active.some((r) => r.indigenous));
  assert.equal(core.isHistoricalContext(records.find((r) => r.wiki === 'Penicillin'), 1928), false);
  assert.equal(core.isHistoricalContext(records.find((r) => r.wiki === 'Tyrannosaurus'), -67000000), false);
  assert.equal(core.isHistoricalContext(records.find((r) => r.wiki === 'Treaty_of_Waitangi'), 1840), false);
});

test('country catalog includes every detailed-map destination with finite coordinates', () => {
  const topology = require('../static/historyallaround/atlas/land-50m.json');
  const names = topology.objects.countries.geometries.map((f) => f.properties.name).sort();
  assert.deepEqual(countries.rows.map((r) => r[0]).sort(), names);
  assert.equal(new Set(names).size, countries.rows.length);
  for (const name of ['Singapore', 'Bahrain', 'Malta', 'France', 'Japan', 'Indonesia']) assert(names.includes(name));
  for (const [name, lon, lat] of countries.rows) {
    assert(Number.isFinite(lon) && Math.abs(lon) <= 180, name);
    assert(Number.isFinite(lat) && Math.abs(lat) <= 90, name);
  }
});

test('timeline includes dates exactly two years away and excludes dates three years away', () => {
  const html = fs.readFileSync('static/historyallaround/atlas/index.html', 'utf8');
  const context = vm.createContext({ DiscoveryCore: core, state: { year: 1819 } });
  vm.runInContext([
    html.match(/^const SAME_TIME_YEARS=.*$/m)[0],
    html.match(/^function halfWin.*$/m)[0],
    html.match(/^function relevance.*$/m)[0],
  ].join('\n'), context);
  const relevance = (start, end = start, year = 1819) => {
    context.record = { start, end };
    context.year = year;
    return vm.runInContext('relevance(record, year, halfWin(year))', context);
  };
  for (const date of [1817, 1819, 1821]) assert(relevance(date) > 0);
  for (const date of [1816, 1822]) assert.equal(relevance(date), 0);
  assert(relevance(-2, -2, 1) > 0, 'BC/AD dates skip year zero');
  assert.equal(relevance(-3, -3, 1), 0);
  assert(relevance(1800, 1820) > 0, 'recorded periods retain their intervals');
  assert(relevance(-150000000, -150000000, -149000000) > 0, 'fossil window stays one million years');
  assert.match(html, /within 2 years of/);
});
