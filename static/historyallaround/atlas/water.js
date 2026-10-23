/* Inland water is a surface layer; a lake cutout does not mean stateless land. */
(function (root, factory) {
  if (typeof module === 'object') module.exports = factory;
  else root.HistoryWater = factory(root.d3, root.ATLAS_WATER);
})(typeof window === 'object' ? window : globalThis, function (d3, data) {
  const empty = [];
  const collection = (features) => ({ type: 'FeatureCollection', features });
  const inBox = ([[w, s], [e, n]], [x, y]) => y >= s && y <= n && (w <= e ? x >= w && x <= e : x >= w || x <= e);
  function prepare(f) {
    const geometry = f.geometry;
    const rings = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
    const largest = rings.reduce((a, b) => d3.geoArea({ type: 'Polygon', coordinates: [a[0]] }) >
      d3.geoArea({ type: 'Polygon', coordinates: [b[0]] }) ? a : b);
    let point = d3.geoCentroid({ type: 'Polygon', coordinates: largest });
    // A centroid can lie outside a curved lake. Keep labels and matching probes on water.
    if (!d3.geoContains(f, point)) {
      const ring = largest[0], ys = ring.map((p) => p[1]);
      const y = (Math.min(...ys) + Math.max(...ys)) / 2;
      const xs = largest.flatMap((r) => r.slice(1).flatMap((b, i) => {
        const a = r[i];
        return (a[1] > y) !== (b[1] > y) ? [a[0] + (y - a[1]) * (b[0] - a[0]) / (b[1] - a[1])] : [];
      })).sort((a, b) => a - b);
      const pairs = xs.flatMap((x, i) => i % 2 ? [] : [[x, xs[i + 1]]]);
      const widest = pairs.filter((p) => Number.isFinite(p[1])).sort((a, b) => (b[1] - b[0]) - (a[1] - a[0]))[0];
      point = widest ? [(widest[0] + widest[1]) / 2, y] : ring[0];
    }
    const bbox = d3.geoBounds(f), [[w, s], [e, n]] = bbox;
    const radius = Math.max(...[[w,s],[w,n],[e,s],[e,n]].map((p) => d3.geoDistance(point, p)));
    return { ...f, bbox, area: d3.geoArea(f), point, radius };
  }
  const lakes = data.features.map(prepare);
  const prepared = new WeakMap();
  function parts(f) {
    if (prepared.has(f)) return prepared.get(f);
    const holes = [], replaced = new Set();
    const polygon = (rings) => [rings[0], ...rings.slice(1).filter((ring) => {
      const water = { type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [ring.slice().reverse()] } };
      const area = d3.geoArea(water), bbox = d3.geoBounds(water);
      // Match known lakes, not arbitrary holes: enclaves remain political holes.
      const matches = lakes.filter((lake) => inBox(bbox, lake.point) && d3.geoContains(water, lake.point));
      // Sum fragments: the Aral Sea's modern remnants are much smaller than
      // its historical cutout. Reject large land enclaves with a tiny reservoir.
      if (!matches.length || area > matches.reduce((sum, lake) => sum + lake.area, 0) * 20) return true;
      const groups = new Map();
      for (const lake of matches) groups.set(lake.properties.name, (groups.get(lake.properties.name) || 0) + lake.area);
      const names = [...groups].sort((a, b) => b[1] - a[1]);
      const total = names.reduce((sum, entry) => sum + entry[1], 0);
      water.properties = { name: names[0][1] >= total * .7 ? names[0][0] : names.map((entry) => entry[0]).join(' / '), historical: true };
      water.polity = f;
      holes.push(prepare(water));
      for (const lake of matches) if (area >= lake.area * .7) replaced.add(lake);
      return false;
    })];
    const g = f.geometry;
    const coordinates = g.type === 'Polygon' ? polygon(g.coordinates)
      : g.type === 'MultiPolygon' ? g.coordinates.map(polygon) : g.coordinates;
    const outline = holes.length ? { ...f, geometry: { ...g, coordinates } } : f;
    const result = { outline, holes, replaced };
    prepared.set(f, result);
    return result;
  }
  let lastFeatures, lastScene;
  function scene(features = empty) {
    if (features === lastFeatures) return lastScene;
    const holes = [], replaced = new Set();
    for (const f of features) {
      const p = parts(f);
      holes.push(...p.holes);
      for (const lake of p.replaced) replaced.add(lake);
    }
    // Undated modern reservoirs must not appear in historical reference views.
    // They are only recognized when a dated source record already has a cutout.
    const featuresWater = [...lakes.filter((lake) => !lake.properties.reservoir && !replaced.has(lake)), ...holes];
    lastFeatures = features;
    lastScene = { features: featuresWater, water: collection(featuresWater), holes };
    return lastScene;
  }
  function hit(point, features = empty) {
    const s = scene(features);
    const candidates = s.features.filter((lake) => inBox(lake.bbox, point) && d3.geoContains(lake, point));
    const water = candidates.sort((a, b) => Number(!!b.properties.historical) - Number(!!a.properties.historical) || a.area - b.area)[0];
    if (!water) return null;
    const containing = features.filter((f) => inBox(f.bbox || d3.geoBounds(f), point) && d3.geoContains(f, point));
    const surroundings = s.holes.filter((h) => inBox(h.bbox, point) && d3.geoContains(h, point)).map((h) => h.polity);
    const polity = [...containing, ...surroundings].sort((a, b) => (a.area ?? d3.geoArea(a)) - (b.area ?? d3.geoArea(b)))[0] || null;
    const name = polity?.name || polity?.properties?.name;
    const relationship = name ? (containing.includes(polity) ? 'Within mapped ' : 'Surrounded by mapped ') + name : 'Political boundary not resolved here';
    return { water, polity, relationship, label: water.properties.name + ' · Inland water · ' + relationship };
  }
  function visible(s, project, width, height, scale, center) {
    return collection(s.features.filter((lake) => {
      if (center && d3.geoDistance(center, lake.point) > Math.PI / 2 + lake.radius) return false;
      const [x, y] = project(lake.point), margin = scale * lake.radius * (center ? 1 : 2) + 3;
      return x + margin >= 0 && x - margin <= width && y + margin >= 0 && y - margin <= height;
    }));
  }
  return { scene, hit, visible, outline: (f) => parts(f).outline, source: data.url };
});
