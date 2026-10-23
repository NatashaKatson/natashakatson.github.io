/* Reconstructed continents and fossil coordinates share one PALEOMAP snapshot. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory;
  else root.HistoryPaleogeography = factory(root.HISTORY_PALEOGEOGRAPHY, root.fetch.bind(root), () => {
    root.HistoryDinosaurs?.render();
    draw();
  });
})(typeof window === 'undefined' ? globalThis : window, function (data, fetcher, changed = () => {}) {
  const cache = new Map(), pending = new Map(), errors = new Set();
  const empty = { type: 'FeatureCollection', features: [] };
  const isDeep = (year) => year < -1000000;
  function snapshot(year) {
    if (!isDeep(year)) return null;
    const age = -year / 1000000;
    return data.snapshots.reduce((best, item) =>
      Math.abs(item.age - age) < Math.abs(best.age - age) ? item : best);
  }
  function load(year, retry = false) {
    const item = snapshot(year);
    if (!item) return Promise.resolve(null);
    const age = item.age;
    if (cache.has(age)) return Promise.resolve(cache.get(age));
    if (pending.has(age)) return pending.get(age);
    if (errors.has(age) && !retry) return Promise.resolve(null);
    errors.delete(age);
    const request = fetcher(`paleogeography/${age}.json`).then((r) => {
      if (!r.ok) throw Error(r.status);
      return r.json();
    }).then((land) => {
      if (land.type !== 'FeatureCollection' || !land.features.length) throw Error('Empty reconstruction');
      cache.set(age, land);
      pending.delete(age);
      changed();
      return land;
    }).catch(() => {
      errors.add(age);
      pending.delete(age);
      changed();
      return null;
    });
    pending.set(age, request);
    return request;
  }
  function geography(year) {
    const item = snapshot(year);
    if (!item) return null;
    load(year);
    // Never substitute a modern coast or a different snapshot while loading.
    return { ancient: true, land: cache.get(item.age) || empty, borders: empty, countries: [] };
  }
  function point(record, year) {
    if (record.cat !== 'dinosaurs' || !isDeep(year)) return [record.lon, record.lat];
    return snapshot(year).points[record.wiki] || null;
  }
  function status(year) {
    const item = snapshot(year);
    if (!item) return null;
    return { age: item.age, state: cache.has(item.age) ? 'ready' : errors.has(item.age) ? 'error' : 'loading' };
  }
  return { isDeep, snapshot, load, geography, point, status };
});
