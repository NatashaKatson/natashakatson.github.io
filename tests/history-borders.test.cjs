const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

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
