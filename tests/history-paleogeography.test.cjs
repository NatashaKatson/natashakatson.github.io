const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const create = require('../static/historyallaround/atlas/paleogeography.js');
const root = 'static/historyallaround/atlas/paleogeography/';
const context = { window: {} };
vm.runInNewContext(fs.readFileSync(root + 'snapshots.js', 'utf8'), context);
const data = context.window.HISTORY_PALEOGEOGRAPHY;

test('all bundled snapshots have valid closed land rings and matching fossil coordinates', () => {
  assert.equal(data.model, 'PALEOMAP');
  assert.equal(data.snapshots[0].age, 1);
  assert.equal(data.snapshots.at(-1).age, 252);
  let previous = 0;
  for (const snapshot of data.snapshots) {
    assert(snapshot.age > previous && snapshot.age - previous <= 10);
    previous = snapshot.age;
    const land = JSON.parse(fs.readFileSync(root + snapshot.age + '.json'));
    assert.equal(land.type, 'FeatureCollection');
    assert(land.features.length > 100);
    for (const feature of land.features) {
      assert.equal(feature.geometry.type, 'Polygon');
      for (const ring of feature.geometry.coordinates) {
        assert(ring.length >= 4);
        assert.deepEqual(ring[0], ring.at(-1));
        for (const [lon, lat] of ring) assert(Number.isFinite(lon) && Math.abs(lon) <= 180 && Number.isFinite(lat) && Math.abs(lat) <= 90);
      }
    }
    assert.equal(Object.keys(snapshot.points).length, 8);
    for (const [lon, lat] of Object.values(snapshot.points)) assert(Number.isFinite(lon) && Math.abs(lon) <= 180 && Number.isFinite(lat) && Math.abs(lat) <= 90);
  }
});

test('era destinations and intermediate dates select the nearest matching land and point snapshot', () => {
  const map = create(data, () => { throw Error('No request needed for coordinate lookup'); });
  const fossil = { cat: 'dinosaurs', wiki: 'Tyrannosaurus', lon: -102.03, lat: 45.05 };
  for (const age of [228, 150, 67, 72, 124, 96]) assert.equal(map.snapshot(-age * 1000000).age, age);
  assert.equal(map.snapshot(-90380000).age, 90);
  assert.equal(map.snapshot(-148500000).age, 148.5);
  const triassic = map.point(fossil, -228000000), cretaceous = map.point(fossil, -67000000);
  assert.notDeepEqual(triassic, cretaceous);
  assert(Math.abs(triassic[0] - fossil.lon) > 20);
  assert.deepEqual(map.point(fossil, 1903), [fossil.lon, fossil.lat]);
  assert.equal(map.snapshot(1903), null);
  assert.equal(map.geography(1903), null);
});

test('independent comparison snapshots load once and never show modern or stale geography', async () => {
  const requests = new Map(), calls = [];
  const map = create(data, (path) => {
    calls.push(path);
    return new Promise((resolve) => requests.set(path, resolve));
  });
  assert.equal(map.geography(-228000000).land.features.length, 0);
  assert.equal(map.geography(-67000000).land.features.length, 0);
  const waiting = map.load(-67000000);
  assert.equal(calls.length, 2, 'pending requests are shared');
  const cretaceous = JSON.parse(fs.readFileSync(root + '67.json'));
  requests.get('paleogeography/67.json')({ ok: true, json: async () => cretaceous });
  await waiting;
  assert.equal(map.geography(-67000000).land, cretaceous);
  assert.equal(map.geography(-228000000).land.features.length, 0, 'another age never inherits the loaded land');
  const triassic = JSON.parse(fs.readFileSync(root + '228.json'));
  const earlier = map.load(-228000000);
  requests.get('paleogeography/228.json')({ ok: true, json: async () => triassic });
  await earlier;
  assert.equal(map.geography(-228000000).land, triassic);
  assert.equal(map.geography(-67000000).land, cretaceous);
});

test('failed reconstructions remain empty, report failure and can be retried', async () => {
  let fail = true, count = 0;
  const land = JSON.parse(fs.readFileSync(root + '150.json'));
  const map = create(data, async () => {
    count++;
    return { ok: !fail, status: 503, json: async () => land };
  });
  await map.load(-150000000);
  assert.equal(map.status(-150000000).state, 'error');
  assert.equal(map.geography(-150000000).land.features.length, 0);
  await map.load(-150000000);
  assert.equal(count, 1, 'rendering a failed map does not continuously retry');
  fail = false;
  await map.load(-150000000, true);
  assert.equal(map.status(-150000000).state, 'ready');
  assert.equal(map.geography(-150000000).land, land);
});
