const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const core = require('../static/historyallaround/atlas/discovery-core.js');
const { records } = require('../scripts/audit-history-accuracy.cjs');
const { html, events } = records();
const context = vm.createContext({});
vm.runInContext(html.match(/const EVENTS = \[[\s\S]*?\n\];/)[0] + '\n' +
  html.match(/^const ev=EVENTS.map.*$/m)[0] + '\nglobalThis.events=ev;', context);

test('medical and pandemic aliases reach real event destinations through the search adapter', () => {
  // Execute the actual browser adapter so a lost aliases field cannot silently pass.
  const script = fs.readFileSync('static/historyallaround/atlas/search.js', 'utf8');
  const prepare = script.slice(script.indexOf('const localRecords ='), script.indexOf('  const datasets ='));
  const sandbox = vm.createContext({ DiscoveryCore: core, core, ev: context.events, ppl: [], lo: { countries: [] } });
  vm.runInContext(prepare + '\nglobalThis.searchRecords=localRecords;', sandbox);
  for (const [query, wiki, year] of [
    ['vaccines', 'Smallpox_vaccine', 1796],
    ['polio vaccine', 'Inactivated_polio_vaccine', 1955],
    ['medical inventions', 'Stethoscope', 1816],
    ['anesthesia', 'Ether_Dome', 1846],
    ['MRI', 'Magnetic_resonance_imaging', 1973],
    ['pandemics', 'Spanish_flu', 1918],
    ['pandemics', 'Black_Death', 1347],
    ['pandemics', 'Plague_of_Justinian', 541],
    ['pandemics', 'COVID-19_pandemic', 2020],
    ['medical inventions', 'Penicillin', 1928],
    ['swine flu', '2009_swine_flu_pandemic', 2009],
    ['HIV', 'HIV/AIDS', 1981],
  ]) {
    const row = context.events.find((e) => e.wiki === wiki);
    const results = core.search(sandbox.searchRecords, query, 'event', 100);
    const found = results.find((r) => r.recordId === row.id);
    assert(found, `${query} reaches ${wiki}`);
    assert.equal(found.start, year);
    assert.equal(found.lon, row.lon);
    assert.equal(found.lat, row.lat);
  }
});

test('pandemic wave windows remain active between endpoints while onset events stay single-year', () => {
  const get = (wiki) => context.events.find((e) => e.wiki === wiki);
  for (const [wiki, during, after] of [
    ['Spanish_flu', 1919, 1920],
    ['1957–1958_influenza_pandemic', 1958, 1959],
    ['1968_influenza_pandemic', 1969, 1971],
    ['2009_swine_flu_pandemic', 2010, 2011],
  ]) {
    const event = get(wiki);
    assert(event.start <= during && event.end >= during);
    assert(event.end < after);
  }
  for (const wiki of ['First_cholera_pandemic', 'Seventh_cholera_pandemic', 'HIV/AIDS']) {
    const event = get(wiki);
    assert.equal(event.start, event.end, `${wiki} marks onset/recognition, not an invented full interval`);
    assert.match(event.blurb, /onset|recognition/);
  }
  assert.match(get('Spanish_flu').blurb, /origin remains uncertain/);
  assert.match(get('HIV/AIDS').blurb, /circulated before/);
  assert.match(get('2009_swine_flu_pandemic').blurb, /seasonal influenza/);
});

test('medical additions have unique story keys and keep generic aliases separate from Indigenous context', () => {
  assert.equal(new Set(events.map((e) => e[9])).size, events.length);
  const added = events.slice(248);
  assert.equal(added.length, 34);
  for (const e of added) {
    assert.equal(e[13], null);
    assert(e[14].length && e[14].every((alias) => typeof alias === 'string'));
    assert(e[10].startsWith('https://'));
    assert(['ideas', 'nature'].includes(e[8]));
  }
  const covid = context.events.find((e) => e.wiki === 'COVID-19_pandemic');
  assert.equal(covid.region, 'eu', 'WHO’s Geneva decision appears in Europe');
});
