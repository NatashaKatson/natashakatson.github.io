const test = require('node:test');
const assert = require('node:assert/strict');
const core = require('../static/historyallaround/atlas/discovery-core.js');
const countries = require('../static/historyallaround/atlas/search-countries.js');
const { events } = require('../scripts/audit-history-accuracy.cjs').records();
const records = Array.from(events, (r) => ({ kind: 'event', cat: r[8], start: r[0], end: r[1] ?? r[0], wiki: r[9], indigenous: r[13] }));

test('1992 contains nearby dated events without unrelated Indigenous community overviews', () => {
  const active = records.filter((r) => r.start <= 1993 && r.end >= 1991);
  const context = active.filter((r) => core.isHistoricalContext(r, 1992));
  const dated = active.filter((r) => !core.isHistoricalContext(r, 1992));
  assert.equal(context.length, 0);
  assert.deepEqual(dated.map((r) => r.wiki), ['Dissolution_of_the_Soviet_Union']);
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
