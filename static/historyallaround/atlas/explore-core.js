/* Deterministic introductions and browsing helpers. No service or generated facts. */
(function (root) {
  const elapsed = (a, b) => b - a - (a < 0 && b > 0 ? 1 : 0);
  const gap = (r, year) => year < r.start ? elapsed(year, r.start)
    : year > r.end ? elapsed(r.end, year) : 0;
  const span = r => elapsed(r.start, r.end);
  const order = (a, b) => span(a) - span(b) || a.start - b.start;
  function diverse(records, limit) {
    const pool = records.slice(), chosen = [], regions = new Set(), categories = new Set();
    while (pool.length && chosen.length < limit) {
      pool.sort((a, b) => Number(regions.has(a.region)) - Number(regions.has(b.region)) ||
        Number(categories.has(a.cat)) - Number(categories.has(b.cat)) || order(a, b));
      const record = pool.shift(); chosen.push(record); regions.add(record.region); categories.add(record.cat);
    }
    return chosen;
  }
  const api = {
    diverse,
    context(events, year) {
      const records = events.filter(r => r.title && r.blurb && r.wiki &&
        (year < -1000000 ? r.cat === 'dinosaurs' : r.cat !== 'dinosaurs'));
      const current = records.filter(r => gap(r, year) === 0);
      // A dated conflict can anchor its full recorded interval. Shorter intervals
      // win over broad eras; alternatives then favour different regions and topics.
      const wars = current.filter(r => r.cat === 'war').sort(order);
      const lead = wars[0] || current.slice().sort(order)[0];
      if (lead) return { mode: 'current', records: [lead, ...diverse(current.filter(r => r !== lead && r.region !== lead.region), 2)], year };
      // Broader context is explicitly retrospective, never a claim that a nearby
      // event happened in the selected year. Do not bridge into another named era.
      const period = api.period(year);
      const nearby = records.filter(r => r.start >= period.from && r.start <= period.to)
        .sort((a, b) => gap(a, year) - gap(b, year) || order(a, b));
      return { mode: 'period', period, year, records: nearby.length ? [nearby[0], ...diverse(nearby.slice(1), 1)] : [] };
    },
    period(year) {
      const periods = [
        [-252000000, -201000001, 'Triassic'], [-201000000, -145000001, 'Jurassic'],
        [-145000000, -66000001, 'Cretaceous'], [-66000000, -10001, 'Prehistory'],
        [-10000, -3001, 'Early farming societies'], [-3000, -501, 'Ancient history'],
        [-500, 499, 'Classical period'], [500, 1499, 'Medieval period'],
        [1500, 1800, 'Early modern period'], [1801, 1900, '19th century'],
        [1901, 2000, '20th century'], [2001, 2026, '21st century'],
      ];
      const [from, to, name] = periods.find(([a, b]) => year >= a && year <= b) || periods.at(-1);
      return { from, to, name };
    },
    matches(record, region, contains) {
      if (region === 'selected') return Number.isFinite(record.lon) && Number.isFinite(record.lat) && !!contains?.([record.lon, record.lat]);
      return region === 'world' || record.region === region;
    },
    stepYear(year, direction, size, min = -252000000, max = 2026) {
      // Step in elapsed years, omitting the non-existent calendar year zero.
      const index = year > 0 ? year - 1 : year;
      const next = index + direction * size;
      return Math.max(min, Math.min(max, next >= 0 ? next + 1 : next));
    },
    journey(events, category, limit = 5) {
      const dates = new Set();
      const candidates = events.filter(r => r.cat === category && !r.approx && r.source &&
        r.start >= -300000 && !dates.has(r.start) && dates.add(r.start)).sort((a, b) => a.start - b.start);
      if (candidates.length <= limit) return candidates;
      return Array.from({ length: limit }, (_, i) => candidates[Math.round(i * (candidates.length - 1) / (limit - 1))]);
    },
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.AtlasExploreCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
