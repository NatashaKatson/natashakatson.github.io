/* Pure discovery helpers, shared by the browser and regression tests. */
(function (root) {
  const api = {
    yearsBetween(from, to) {
      return to - from - (from < 0 && to > 0 ? 1 : 0);
    },
    contemporaryPair(people, year, anchorWiki) {
      const alive = people.filter((p) => p.born <= year && p.died >= year);
      const anchor = alive.find((p) => p.wiki === anchorWiki);
      const pairs = alive.flatMap((a, i) => alive.slice(i + 1).flatMap((b) => {
        if (a.region === b.region || (anchor && a !== anchor && b !== anchor)) return [];
        const from = Math.max(a.born, b.born), to = Math.min(a.died, b.died);
        return [{ people: [a, b], from, to, year }];
      }));
      return pairs.sort((a, b) =>
        a.people.filter((p) => p.approx).length - b.people.filter((p) => p.approx).length ||
        api.yearsBetween(b.from, b.to) - api.yearsBetween(a.from, a.to) ||
        a.people.map((p) => p.wiki).join("/").localeCompare(b.people.map((p) => p.wiki).join("/")))[0] || null;
    },
    searchText(value) {
      return String(value || "").normalize("NFKD").replace(/\p{M}/gu, "")
        .toLocaleLowerCase("en").replace(/[^\p{L}\p{N}]+/gu, " ").trim();
    },
    prepareSearch(records) {
      return records.map((r) => ({ ...r,
        searchName: api.searchText(r.title),
        searchAliases: (r.aliases || []).map(api.searchText).filter(Boolean),
        searchBody: api.searchText([r.title, ...(r.aliases || []), r.description].join(" ")),
      }));
    },
    search(records, query, kind = "all", limit = 16) {
      const q = api.searchText(query);
      if (q.length < 2) return [];
      const words = q.split(/\s+/);
      const counts = new Map();
      return records.flatMap((r) => {
        if (kind !== "all" && r.kind !== kind) return [];
        const names = [r.searchName, ...r.searchAliases];
        if (!words.every((word) => r.searchBody.includes(word))) return [];
        const score = r.searchName === q ? 120
          : names.slice(1).includes(q) ? 110
          : r.searchName.startsWith(q) ? 100
          : r.searchName.split(" ").includes(q) ? 90
          : names.some((name) => name.startsWith(q)) ? 80
          : r.searchName.includes(q) ? 70
          : names.some((name) => name.includes(q)) ? 60 : 30;
        return [{ record: r, score }];
      }).sort((a, b) => b.score - a.score || (b.record.population || 0) - (a.record.population || 0) ||
        a.record.title.localeCompare(b.record.title) || (a.record.start || 0) - (b.record.start || 0))
        .filter(({ record }) => {
          const count = counts.get(record.kind) || 0;
          counts.set(record.kind, count + 1);
          // A common city name must not crowd every historical record out of All.
          return kind !== "all" || count < 6;
        }).slice(0, limit).map((r) => r.record);
    },
    meanwhile(record, events, year) {
      const regions = new Set();
      return events.filter((e) => e.wiki !== record.wiki && e.region !== record.region &&
        e.start <= year && e.end >= year).sort((a, b) =>
          Number(a.approx) - Number(b.approx) || a.start - b.start
        ).filter((e) => {
          if (regions.has(e.region)) return false;
          regions.add(e.region);
          return true;
        }).slice(0, 3);
    },
    parseView(hash, maxYear, categories) {
      try {
        const encoded = new URLSearchParams(hash.replace(/^#/, "")).get("view");
        if (!encoded || encoded.length > 8000) return null;
        const v = JSON.parse(encoded);
        const year = (n) => Number.isInteger(n) && n !== 0 && n >= -300000 && n <= maxYear;
        const nums = (a, count, limit) => Array.isArray(a) && a.length === count &&
          a.every((n) => Number.isFinite(n) && Math.abs(n) <= limit);
        if (v.v !== 1 || !year(v.year) || !year(v.left) ||
          !["globe", "flat"].includes(v.mode) || !["history", "today", "off"].includes(v.borders) ||
          !nums(v.rot, 3, 36000) || !nums(v.pan, 2, 100) ||
          !Number.isFinite(v.zoom) || v.zoom < .7 || v.zoom > 6 ||
          !Number.isFinite(v.split) || v.split < .05 || v.split > .95 ||
          typeof v.compare !== "boolean" || typeof v.changed !== "boolean" ||
          !Array.isArray(v.cats) || v.cats.length > categories.length ||
          !v.cats.every((c) => categories.includes(c)) ||
          !(v.selectedYear === null || year(v.selectedYear)) ||
          !(v.record === null || (typeof v.record?.wiki === "string" &&
            v.record.wiki.length <= 300 && ["event", "person"].includes(v.record.kind) && year(v.record.date))) ||
          !(v.polity === null || (typeof v.polity === "string" && v.polity.length <= 300)) ||
          !(v.point === null || (nums(v.point, 2, 180) && Math.abs(v.point[1]) <= 90)) ||
          !(v.location == null || (v.point && typeof v.location.title === "string" &&
            v.location.title.length <= 500 && (v.location.geonameId === null ||
              (Number.isSafeInteger(v.location.geonameId) && v.location.geonameId > 0)))) ||
          !(v.pin == null || (typeof v.pin.wiki === "string" && v.pin.wiki.length <= 300 && year(v.pin.date) && year(v.pin.year))) ||
          !(v.discovery == null || (typeof v.discovery.id === "string" && /^[a-z0-9-]{1,80}$/.test(v.discovery.id) &&
            typeof v.discovery.stop === "string" && /^[a-z0-9-]{1,80}$/.test(v.discovery.stop))) ||
          !(v.story === null || (Number.isInteger(v.story) && v.story >= 0 && v.story < 3))) return null;
        return v;
      } catch (_) { return null; }
    },
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
