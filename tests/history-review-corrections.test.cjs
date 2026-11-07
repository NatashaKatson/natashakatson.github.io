const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const core = require('../static/historyallaround/atlas/discovery-core.js');
const root = 'static/historyallaround/atlas/';
const geometries = chunk => JSON.parse(fs.readFileSync(root + `borders/c${chunk}.json`)).objects.p.geometries;
const features = chunk => geometries(chunk).map(g => ({
  name: g.properties.n, member: g.properties.m, from: g.properties.f,
  to: g.properties.t, area: g.properties.a, properties: g.properties,
}));
const search = JSON.parse(fs.readFileSync(root + 'search-states.json')).rows;

test('unverified Berg geometry is retained for provenance and excluded from dated coverage and search', () => {
  const originals = [1800,1825].flatMap(geometries).filter(g => g.properties.n === 'Grand Duchy of Berg');
  assert.equal(originals.length, 8);
  for (const g of originals) {
    assert.equal(g.properties.quarantined, true);
    assert(g.arcs.length, 'source geometry is preserved');
    assert.match(g.properties.source, /rheinische-geschichte\.lvr\.de/);
    assert.match(g.properties.status, /Düsseldorf/);
  }
  for (const year of [1806,1813,1814,1820,1827])
    assert(!core.active(features(year < 1825 ? 1800 : 1825), year).some(f => f.name === 'Grand Duchy of Berg'));
  assert(!search.some(r => r[0] === 'Grand Duchy of Berg'));
});

test('Romania changes its dated identity in 1881 without bridging source coverage gaps', () => {
  const before = core.active(features(1875), 1880), after = core.active(features(1875), 1881);
  assert(before.some(f => f.name === 'United Principalities of Moldavia and Wallachia'));
  assert(!before.some(f => f.name === 'Kingdom of Romania'));
  const kingdom = after.find(f => f.name === 'Kingdom of Romania');
  assert(kingdom);
  assert.match(kingdom.properties.source, /history\.state\.gov\/countries\/romania/);
  assert(!after.some(f => f.name === 'United Principalities of Moldavia and Wallachia'));
  assert(core.active(features(1900), 1916).some(f => f.name === 'Kingdom of Romania'));
  assert(!core.active(features(1900), 1917).some(f => /Romania|Moldavia and Wallachia/.test(f.name)));
  assert(search.filter(r => r[0] === 'United Principalities of Moldavia and Wallachia').every(r => r[2] <= 1880));
  assert(search.some(r => r[0] === 'Kingdom of Romania' && r[1] === 1881 && r[2] === 1916));
});

test('Cyprus control and recognition are qualified and the 1983 declaration is not backdated', () => {
  const before = core.active(features(1975), 1982);
  const earlier = before.find(f => f.name === 'Turkish Cypriot-administered area');
  assert(earlier);
  assert.equal(core.politicalStatus(earlier), 'De facto administration');
  assert(!before.some(f => f.name === 'Turkish Republic of Northern Cyprus'));
  for (const [chunk, year] of [[1975,1983],[2000,2024]]) {
    const f = core.active(features(chunk), year).find(f => f.name === 'Turkish Republic of Northern Cyprus');
    assert(f);
    assert.equal(core.politicalStatus(f), 'Recognition disputed');
    assert.match(f.properties.status, /resolution 541/);
    assert.match(f.properties.status, /does not establish sovereignty/);
    assert.match(f.properties.source, /resolution-541-1983/);
  }
  assert(search.filter(r => r[0] === 'Turkish Republic of Northern Cyprus').every(r => r[1] >= 1983));
});

test('political status does not infer independence from absent membership or confuse association with dependency', () => {
  assert.equal(core.politicalStatus({name:'Unknown polity',member:''}), 'Mapped polity');
  assert.equal(core.politicalStatus({name:'United Kingdom',member:'Commonwealth of Nations'}), 'Commonwealth member');
  assert.equal(core.politicalStatus({name:'Commonwealth of Nations',member:''}), 'Association of countries');
  assert.equal(core.politicalStatus({name:'Transnistria',member:'Republic of Moldova'}), 'Part of Republic of Moldova');
  const territories = core.active(features(2000), 2024).find(f => f.name === 'British Overseas Territories');
  assert.equal(territories.member, 'United Kingdom');
  assert.equal(core.politicalStatus(territories), 'UK overseas territories');
  assert(search.filter(r => r[0] === 'British Overseas Territories').every(r => r[7] === 'United Kingdom'));
});
