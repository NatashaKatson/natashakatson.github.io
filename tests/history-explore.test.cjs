const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const core = require('../static/historyallaround/atlas/explore-core.js');
const html = fs.readFileSync('static/historyallaround/atlas/index.html', 'utf8');
const sandbox = vm.createContext({});
vm.runInContext(html.match(/const EVENTS = \[[\s\S]*?\n\];/)[0] + '\nglobalThis.records=EVENTS;', sandbox);
const events = Array.from(sandbox.records, (r, id) => ({ id, start: r[0], end: r[1] ?? r[0], approx: !!r[2], title: r[3], blurb: r[4], region: r[7], cat: r[8], wiki: r[9], source: r[10] }));

test('1942 introduces the recorded war interval and different regional contexts', () => {
  const scene = core.context(events, 1942);
  assert.equal(scene.mode, 'current');
  assert.equal(scene.records[0].wiki, 'World_War_II');
  assert.equal(new Set(scene.records.map(r => r.region)).size, 3);
  for (const r of scene.records) assert(r.start <= 1942 && r.end >= 1942);
  assert(!scene.records.some(r => r.start === 1945));
});

test('every supported sampled year uses bounded source records and truthful temporal scope', () => {
  for (const year of [-252000000, -228000000, -150000000, -67000000, -50000000, -300000, -10000, -6000, -3000, -501, -50, -1, 1, 499, 500, 1011, 1492, 1600, 1789, 1928, 1942, 2026]) {
    const scene = core.context(events, year);
    assert(scene.records.length <= 3);
    for (const r of scene.records) {
      assert(events.includes(r));
      if (scene.mode === 'current') assert(r.start <= year && r.end >= year);
      else assert(r.start >= scene.period.from && r.start <= scene.period.to);
      assert.equal(r.cat === 'dinosaurs', year < -1000000);
    }
    assert.deepEqual(scene, core.context(events, year));
  }
  const gap = core.context([], 1011);
  assert.equal(gap.mode, 'period'); assert.equal(gap.period.name, 'Medieval period');
  assert.deepEqual(gap.records, []);
  const nearby = core.context([{ ...events[0], start: 1005, end: 1005, cat: 'culture' }], 1011);
  assert.equal(nearby.mode, 'period');
});

test('list scope uses recorded regions or a geometry predicate, never inferred citizenship', () => {
  const r = { region: 'eu', lon: 2, lat: 48 };
  assert(core.matches(r, 'world')); assert(core.matches(r, 'eu')); assert(!core.matches(r, 'as'));
  assert(core.matches(r, 'selected', ([lon, lat]) => lon === 2 && lat === 48));
  assert(!core.matches(r, 'selected', () => false));
  assert(!core.matches({ region: 'eu' }, 'selected', () => true));
});

test('large steps cross BC/AD without year zero and clamp to supported endpoints', () => {
  assert.equal(core.stepYear(-1, 1, 1), 1);
  assert.equal(core.stepYear(1, -1, 1), -1);
  assert.equal(core.stepYear(-5, 1, 10), 6);
  assert.equal(core.stepYear(6, -1, 10), -5);
  assert.equal(core.stepYear(2020, 1, 100), 2026);
  assert.equal(core.stepYear(-252000000, -1, 1000000), -252000000);
});

test('topic journeys have distinct chronological sourced stops with exact dates', () => {
  for (const category of ['technology', 'ideas', 'womens-rights']) {
    const route = core.journey(events, category);
    assert.equal(route.length, 5);
    assert.equal(new Set(route.map(r => r.start)).size, 5);
    for (const [index, r] of route.entries()) {
      assert(r.cat === category && r.source && !r.approx && events.includes(r));
      if (index) assert(r.start > route[index - 1].start);
    }
  }
});
