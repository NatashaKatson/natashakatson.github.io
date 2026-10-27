const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const core = require('../static/historyallaround/atlas/discovery-core.js');
const { audit, records } = require('../scripts/audit-history-accuracy.cjs');
const { events } = records();
const event = (wiki) => events.find((row) => row[9] === wiki);
const features = (chunk, year) => JSON.parse(fs.readFileSync(`static/historyallaround/atlas/borders/c${chunk}.json`))
  .objects.p.geometries.map((g) => g.properties).filter((p) => p.f <= year && p.t >= year);

test('every event, person, border arc and historical search destination passes integrity checks', () => {
  const result = audit();
  assert.deepEqual(result.errors, []);
  assert.equal(result.counts.events, 422);
  assert.equal(result.counts.people, 66);
  assert.equal(result.counts.sourceReviewedEvents, 422);
  assert.equal(result.counts.eventsWithSourceLinks, 422);
  assert.equal(result.counts.borderChunks, 217);
  assert(result.counts.borderFeatureInstances > 22000);
  assert(result.counts.historicalSearchRecords > 2000);
  assert(result.warnings.some((s) => s.includes('independent source')),
    'structural validation must never be reported as a historical certification');
});

test('the Holocaust period and COVID emergency designation describe their documented intervals', () => {
  const holocaust = event('The_Holocaust'), covid = event('COVID-19_pandemic');
  assert.deepEqual([holocaust[0], holocaust[1]], [1933, 1945]);
  assert.match(holocaust[10], /ushmm\.org/);
  assert.deepEqual([covid[0], covid[1]], [2020, 2023]);
  assert.match(covid[3], /emergency/);
  assert.match(covid[4], /does not mean/);
  assert.match(covid[10], /who\.int/);
  assert(covid[5] > 46 && covid[5] < 47 && covid[6] > 6 && covid[6] < 7, 'WHO decision is located in Geneva');
});

test('dated evidence is distinguished from first-arrival and complete-genome claims', () => {
  assert.equal(event("L'Anse_aux_Meadows")[0], 1021);
  assert.match(event("L'Anse_aux_Meadows")[4], /woodcutting/);
  assert.match(event('Prehistory_of_Australia')[4], /65,000/);
  assert.match(event('Human_Genome_Project')[4], /92%/);
  assert.equal(event('Blombos_Cave')[0], -75000);
  assert.equal(event('Blombos_Cave')[2], 1);
  assert.deepEqual(Array.from(event('Monte_Albán').slice(0, 3)), [-300, 200, 1]);
  assert.equal(event('Kilwa_Kisiwani')[2], 1, 'uncertain Kilwa visit dates must be excluded from exact-date quizzes');
  const buddha = records().people.find((p) => p[8] === 'The_Buddha');
  assert.equal(buddha[3], 1);
  assert.match(buddha[4], /traditional dates/);
  assert.match(event('Apollo_11')[4], /launch site/);
  assert.equal(event('Nok_culture')[0], -900);
  assert.equal(event('Nok_culture')[2], 1);
  assert.match(event('Nok_culture')[4], /around 900 BC/);
  assert.match(event('Nok_culture')[10], /10\.1007\/s00334-022-00902-0/);
  assert.match(event('Mansa_Musa')[4], /gold’s value/);
  assert.doesNotMatch(event('Mansa_Musa')[4], /prices fall/);
  const ibn = records().people.find((p) => p[8] === 'Ibn_Battuta');
  assert.equal(ibn[3], 1, 'uncertain death year must exclude Ibn Battuta from exact-date quizzes');
  assert.match(ibn[9], /catalogue\.bnf\.fr/);
});

test('historical qualifications survive coverage merging and dated state search', () => {
  const original = { name: 'State of Israel', member: '', wiki: 'Israel', start: 1948, end: 1966 };
  const qualified = { ...original, start: 1967, end: 1972, basis: 'Control and sovereignty differ' };
  const periods = core.coverage([original, qualified, { ...qualified, start: 1973, end: 2024 }]);
  assert.equal(periods.length, 2);
  assert.deepEqual(periods.map((r) => [r.start, r.end]), [[1948, 1966], [1967, 2024]]);
  const rows = JSON.parse(fs.readFileSync('static/historyallaround/atlas/search-states.json')).rows
    .filter((r) => r[0] === 'State of Israel');
  assert(rows.some((r) => r[2] === 1966 && !r[8]));
  assert(rows.some((r) => r[1] === 1967 && r[8] === qualified.basis));
  for (const chunk of [1950, 1975, 2000]) {
    const states = JSON.parse(fs.readFileSync(`static/historyallaround/atlas/borders/c${chunk}.json`))
      .objects.p.geometries.map((g) => g.properties).filter((p) => p.n === original.name);
    for (const p of states) {
      assert.equal(!!p.basis, p.f >= 1967);
      if (p.basis) {
        assert.match(p.status, /military control, civil administration and sovereignty/);
        assert.match(p.source, /history\.state\.gov\/historicaldocuments\/frus1964-68v19$/);
      }
    }
  }
});

test('aggregate realms and constituents retain separate identities at overlapping dates', () => {
  const realm = { name: 'Netherlands', member: '', from: 1917, to: 1921, area: .04614 };
  const mainland = { name: 'Netherlands', member: 'Netherlands', from: 1917, to: 1921, area: .0009561 };
  const newer = { ...mainland, from: 1919, area: .001 };
  assert.deepEqual(core.active([mainland, realm], 1917), [realm, mainland]);
  assert.deepEqual(core.active([mainland, newer, realm], 1920), [realm, newer]);
  assert.notEqual(core.polityKey(realm), core.polityKey(mainland));
});

test('post-independence names do not outlive the Mali Federation, Denmark-Norway or Estado Novo', () => {
  const current = features(2000, 2024), nineteenth = features(1825, 1840);
  assert(current.some((p) => p.n === 'Republic of Mali' && p.w === 'Mali'));
  assert(!current.some((p) => p.n === 'Mali Federation' || p.n === 'Estado Novo' || p.n === 'Netherlands Antilles'));
  assert(nineteenth.some((p) => p.n === 'Denmark'));
  assert(!nineteenth.some((p) => p.n === 'Denmark-Norway'));
  assert(current.some((p) => p.n === 'Cabinda' && p.m === 'Republic of Angola'));
  assert(current.some((p) => p.n === 'Republic of North Macedonia'));
  assert(current.some((p) => p.n === 'Federal Republic of Germany'));
  assert(!current.some((p) => p.n === 'Kingdom of Great Britain'));
  const uk = features(2000, 2000).find((p) => p.n === 'United Kingdom');
  assert(uk.a < .007 && uk.lx < 0 && uk.ly > 50, 'UK search anchor and area exclude the independent Gulf states');
  assert(current.some((p) => p.n === 'Mujahideen (source identity unverified)' && p.status.includes('not a verified group identity')));
  assert(features(1975, 1975).some((p) => p.n === 'Republic of Suriname'));
  assert(features(1975, 1980).find((p) => p.n === 'French Fifth Republic').a < .02,
    'the French source record must no longer contain independent Algeria or Djibouti');
});

test('shared territory views validate and preserve constituent membership', () => {
  const view = { v: 1, year: 1917, left: 1903, mode: 'globe', borders: 'history',
    rot: [0, 0, 0], pan: [0, 0], zoom: 1.6, split: .5, compare: false,
    changed: false, selectedYear: 1917, cats: ['power'], record: null,
    polity: 'Netherlands', polityMember: 'Netherlands', point: null, story: null };
  const hash = (v) => '#' + new URLSearchParams({ view: JSON.stringify(v) });
  assert.deepEqual(core.parseView(hash(view), 2026, ['power']), view);
  assert.equal(core.parseView(hash({ ...view, polityMember: 42 }), 2026, ['power']), null);
  assert.equal(core.parseView(hash({ ...view, polityMember: 'x'.repeat(301) }), 2026, ['power']), null);
});
