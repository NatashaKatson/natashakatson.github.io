/* Pure discovery helpers, shared by the browser and regression tests. */
(function (root) {
  const api = {
    active(features, year) {
      const seen = new Map();
      for (const f of features)
        if (f.from <= year && f.to >= year) {
          const old = seen.get(f.name);
          if (!old || f.from > old.from) seen.set(f.name, f);
        }
      return [...seen.values()].sort((a, b) => b.area - a.area);
    },
    distance(a, b) {
      const r = Math.PI / 180,
        lat = (b[1] - a[1]) * r,
        lon = (b[0] - a[0]) * r;
      return (
        6371 *
        2 *
        Math.asin(
          Math.min(
            1,
            Math.sqrt(
              Math.sin(lat / 2) ** 2 +
                Math.cos(a[1] * r) *
                  Math.cos(b[1] * r) *
                  Math.sin(lon / 2) ** 2,
            ),
          ),
        )
      );
    },
    nearby(events, point, km = 50) {
      return events
        .filter((e) => api.distance(point, [e.lon, e.lat]) <= km)
        .sort((a, b) => a.start - b.start);
    },
    // Same source article is an explicit association; proximity alone is not a story edge.
    connections(record, records) {
      return records
        .filter(
          (r) =>
            r !== record &&
            record.wiki &&
            (r.wiki === record.wiki ||
              api.distance([record.lon, record.lat], [r.lon, r.lat]) <= 2),
        )
        .map((r) => ({
          record: r,
          reason:
            r.wiki === record.wiki
              ? "Shared source article"
              : "Same mapped location (within 2 km); not a causal link",
          source: "https://en.wikipedia.org/wiki/" + encodeURIComponent(r.wiki),
        }))
        .slice(0, 4);
    },
    coverage(rows) {
      const groups = new Map();
      for (const r of rows) {
        const key = [r.name, r.member, r.wiki].join("|");
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push({ ...r });
      }
      const out = [];
      for (const group of groups.values()) {
        group.sort((a, b) => a.start - b.start);
        let last = null;
        for (const row of group) {
          if (last && row.start <= last.end + 1)
            last.end = Math.max(last.end, row.end);
          else {
            last = row;
            out.push(last);
          }
        }
      }
      return out.sort(
        (a, b) => a.start - b.start || a.name.localeCompare(b.name),
      );
    },
  };
  if (typeof module === "object") module.exports = api;
  else root.DiscoveryCore = api;
})(typeof window === "object" ? window : globalThis);
