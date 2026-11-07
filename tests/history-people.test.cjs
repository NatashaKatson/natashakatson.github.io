const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const { records } = require('../scripts/audit-history-accuracy.cjs');
const { auditPeople } = require('../scripts/audit-history-people.cjs');
const discovery = require('../static/historyallaround/atlas/discovery-core.js');
const challenge = require('../static/historyallaround/atlas/challenge-core.js');
const { html, people } = records();
const context = vm.createContext({ PEOPLE: people, state: { year: 1900 }, pplMemo: {} });
vm.runInContext([
  html.match(/^const NOW=.*$/m)[0], html.match(/^const ppl=.*$/m)[0],
  html.match(/^function alivePeople.*$/m)[0], html.match(/^function fmt\(.*$/m)[0],
  html.match(/^function fmtSpan.*$/m)[0], html.match(/^function fmtPerson.*$/m)[0],
  'globalThis.people=ppl',
].join('\n'), context);
const alive = year => { context.state.year = year; return vm.runInContext('alivePeople()', context); };

test('all additions carry provenance, representative locations and qualified dates', () => {
  const audit = auditPeople();
  assert.deepEqual(audit.errors, []);
  assert.equal(audit.baseline.total, 66);
  assert.equal(audit.added.length, 57);
  for (const region of ['af', 'as', 'am', 'me', 'oc']) assert(audit.current.byRegion[region] > audit.baseline.byRegion[region]);
  for (const period of audit.current.periodRegion) assert(Object.keys(audit.regions).reduce((n, r) => n + period[r], 0) > 0);
  const broken = structuredClone(people);
  broken.at(-1)[5] = NaN;
  broken.at(-1)[1] = 0;
  broken.at(-1)[9] = '';
  assert(auditPeople(broken).errors.length >= 3, 'audit catches malformed records');
});

test('Rasputin appears during 1869–1916, including endpoints, without adjacent-year map ghosts', () => {
  for (const year of [1869, 1900, 1916]) assert(alive(year).some(p => p.wiki === 'Grigori_Rasputin'));
  for (const year of [1868, 1917]) assert(!alive(year).some(p => p.wiki === 'Grigori_Rasputin'));
  assert.equal(context.people.find(p => p.wiki === 'Grigori_Rasputin').region, 'eu');
  for (const year of [-500, -1, 1, 1000, 1600, 1900, 2026]) {
    assert.deepEqual(Array.from(alive(year), p => p.id),
      Array.from(context.people.filter(p => p.born <= year && p.died >= year), p => p.id));
  }
});

test('open lifespans remain alive through the cutoff and never display a fabricated death', () => {
  for (const wiki of ['Tu_Youyou', 'Wole_Soyinka', 'Rigoberta_Menchú']) {
    const person = context.people.find(p => p.wiki === wiki);
    assert(person.living && person.died === 2026);
    assert(alive(2026).includes(person));
    assert(!alive(person.born - 1).includes(person));
    context.person = person;
    assert.match(vm.runInContext('fmtPerson(person)', context), /^Born /);
    assert(!vm.runInContext('fmtPerson(person)', context).includes('2026'));
  }
  const exported = JSON.parse(fs.readFileSync('exports/historyallaround/atlas-data.json')).people;
  assert.equal(exported.length, people.length);
  for (const person of exported.filter(p => p.noRecordedDeath)) assert.equal(person.diedYear, null);
  const pair = discovery.contemporaryPair(Array.from(context.people), 2026);
  assert(pair && pair.people.every(p => p.living));
});

test('living people cannot be used as exact completed lifespans in daily puzzles', () => {
  const closed = [
    { wiki: 'a', born: 1800, died: 1900, region: 'eu' },
    { wiki: 'b', born: 1810, died: 1910, region: 'as' },
    { wiki: 'c', born: 1400, died: 1500, region: 'af' },
  ];
  for (let day = 1; day <= 15; day++) {
    const puzzles = challenge.daily([], [...closed, ...Array.from(context.people).filter(p => p.living)], `2026-11-${day}`);
    const overlap = puzzles.find(p => p.kind === 'overlap');
    assert(overlap);
    assert(overlap.options.every(option => option.people.every(p => !p.living)));
  }
});

test('search finds transliterations, Indigenous names and accent-free forms', () => {
  const searchable = discovery.prepareSearch(Array.from(context.people, p => ({
    title: p.name, aliases: p.aliases, description: p.role, kind: 'person',
  })));
  for (const [query, name] of [
    ['Grigory Rasputin', 'Grigori Rasputin'], ['Григорий Распутин', 'Grigori Rasputin'],
    ['Tatanka Iyotanka', 'Sitting Bull'], ['Rigoberta Menchu', 'Rigoberta Menchú Tum'],
    ['Te Puea Herangi', 'Te Puea Hērangi'], ['Li Po', 'Li Bai'],
  ]) assert.equal(discovery.search(searchable, query, 'person')[0]?.title, name);
});
