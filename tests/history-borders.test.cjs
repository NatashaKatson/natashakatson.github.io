const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const core = require('../static/historyallaround/atlas/discovery-core.js');

const dir = 'static/historyallaround/atlas/';
const expected = {
  Transnistria: { member: 'Republic of Moldova', bounds: [28, 46.5, 30, 48.5] },
  Gagauzia: { member: 'Republic of Moldova', bounds: [28, 46, 29, 46.6] },
  'South Ossetia': { member: 'Georgia', bounds: [43, 42, 45, 43] },
};

function ringPoints(topo, ring) {
  return ring.flatMap((index) => {
    let x = 0, y = 0;
    const points = topo.arcs[index < 0 ? ~index : index].map(([dx, dy]) => {
      x += dx; y += dy;
      return [x * topo.transform.scale[0] + topo.transform.translate[0],
        y * topo.transform.scale[1] + topo.transform.translate[1]];
    });
    return index < 0 ? points.reverse() : points;
  });
}

test('the western US–Canada border uses 49° even in quantized archive snapshots', () => {
  for (const chunk of [1950, 1975, 2000]) {
    const topo = JSON.parse(fs.readFileSync(dir + `borders/c${chunk}.json`));
    for (const name of ['Canada', 'United States of America']) {
      const states = topo.objects.p.geometries.filter((g) => g.properties.n === name);
      assert(states.length, name);
      for (const state of states) {
        const polygons = state.type === 'Polygon' ? [state.arcs] : state.arcs;
        const source = { type: 'MultiPolygon', coordinates: polygons.map((p) => p.map((r) => ringPoints(topo, r))) };
        const original = JSON.stringify(source);
        const fixed = core.resampleParallels(source);
        const parallel = fixed.coordinates.flat(2).filter(([x, y]) => x > -122 && x < -96 && Math.abs(y - 49) < .03);
        assert(parallel.length > 40, `${name}/${state.properties.f}: parallel is sampled densely`);
        assert(parallel.every(([, y]) => y === 49), `${name}/${state.properties.f}: parallel is at 49°`);
        assert.equal(JSON.stringify(source), original, 'source geometry stays unchanged');
        for (const polygon of fixed.coordinates) for (const ring of polygon) assert.deepEqual(ring[0], ring.at(-1));
      }
    }
  }
});

test('parallel correction preserves other boundaries and dateline crossings', () => {
  for (const coordinates of [
    [[-120, 40], [-100, 40]],
    [[10, 48.986], [30, 48.986]],
    [[-120, 48.986], [-100, 49.1]],
    [[170, 49], [-170, 49]],
  ]) {
    const fixed = core.resampleParallels({ type: 'LineString', coordinates }).coordinates;
    assert.deepEqual(fixed[0], coordinates[0]);
    assert.deepEqual(fixed.at(-1), coordinates.at(-1));
    if (coordinates[0][1] !== coordinates[1][1] || Math.abs(coordinates[1][0] - coordinates[0][0]) >= 180) {
      assert.deepEqual(fixed, coordinates);
    } else {
      assert(fixed.every(([, lat]) => lat === coordinates[0][1]));
    }
  }
});

test('Moldovan and Georgian regions have separate identities and stay in their source locations', () => {
  for (const chunk of [1975, 2000]) {
    const topo = JSON.parse(fs.readFileSync(dir + `borders/c${chunk}.json`));
    const geometries = topo.objects.p.geometries;
    assert(!geometries.some((g) => g.properties.n === 'Russian-occupied territories'));
    for (const [name, { member, bounds: [west, south, east, north] }] of Object.entries(expected)) {
      const regions = geometries.filter((g) => g.properties.n === name);
      assert.equal(regions.length, chunk === 1975 ? 1 : 2, name);
      for (const region of regions) {
        const p = region.properties;
        assert.equal(region.type, 'Polygon');
        assert.equal(p.m, member);
        assert.equal(p.w, name);
        assert(p.a > 0 && p.a < 0.0001653);
        assert(p.lx > west && p.lx < east && p.ly > south && p.ly < north);
        for (const [lon, lat] of ringPoints(topo, region.arcs[0])) {
          assert(lon > west && lon < east && lat >= south && lat < north, name);
        }
      }
    }
  }
});

test('Russia realm envelopes exclude the mislabeled regions in every affected snapshot', () => {
  for (const chunk of [1975, 2000]) {
    const geometries = JSON.parse(fs.readFileSync(dir + `borders/c${chunk}.json`)).objects.p.geometries;
    for (const envelope of geometries.filter((g) => g.properties.n === '(Russian Federation)')) {
      const p = envelope.properties;
      const russia = geometries.find((g) => g.properties.n === 'Russian Federation' &&
        g.properties.f === p.f && g.properties.t === p.t);
      assert(russia);
      assert.deepEqual(envelope.arcs, russia.arcs);
      assert.equal(p.a, russia.properties.a);
    }
  }
});

test('state search exposes regional names and recognized country relationships', () => {
  const { rows } = JSON.parse(fs.readFileSync(dir + 'search-states.json'));
  assert(!rows.some((r) => r[0] === 'Russian-occupied territories'));
  for (const [name, { member }] of Object.entries(expected)) {
    const records = rows.filter((r) => r[0] === name);
    assert.equal(records.length, 1);
    assert.equal(records[0][1], 1992);
    assert.equal(records[0][2], 2024);
    assert.equal(records[0][6], name);
    assert.equal(records[0][7], member);
  }
});

test('Crimea is Ukrainian territory with an occupation label from 2014, outside Russia geometry', () => {
  const topo = JSON.parse(fs.readFileSync(dir + 'borders/c2000.json'));
  const geometries = topo.objects.p.geometries;
  const region = geometries.find((g) => g.properties.n === 'Crimea (occupied by Russia)');
  assert(region);
  assert.equal(region.properties.m, 'Ukraine');
  assert.equal(region.properties.f, 2014);
  assert.equal(region.properties.t, 2024);
  assert.match(region.properties.status, /Ukrainian territory occupied by Russia/);
  assert.match(region.properties.source, /mandates\.un\.org/);
  const isCrimea = (part) => ringPoints(topo, part[0]).every(([lon, lat]) => lon > 32 && lon < 37 && lat > 44 && lat < 46.5);
  const parts = (g) => g.type === 'Polygon' ? [g.arcs] : g.arcs;
  assert(isCrimea(region.arcs));
  for (const year of [2013, 2014, 2023, 2024]) {
    const active = geometries.filter((g) => g.properties.f <= year && g.properties.t >= year);
    assert(active.filter((g) => g.properties.n === 'Ukraine').every((g) => parts(g).some(isCrimea)), 'Crimea stays within recognized Ukraine geometry');
    assert(active.filter((g) => /Russian Federation/.test(g.properties.n)).every((g) => !parts(g).some(isCrimea)), 'Russia excludes Crimea');
    assert.equal(active.includes(region), year >= 2014, 'occupation starts in 2014');
  }
  const { rows } = JSON.parse(fs.readFileSync(dir + 'search-states.json'));
  const results = rows.filter((r) => r[0] === region.properties.n);
  assert.equal(results.length, 1);
  assert.deepEqual([results[0][1], results[0][2], results[0][7]], [2014, 2024, 'Ukraine']);
});
