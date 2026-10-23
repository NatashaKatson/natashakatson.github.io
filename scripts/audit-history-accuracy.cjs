#!/usr/bin/env node
// Exhaustive local integrity audit. Passing it does not certify historical truth.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const core = require('../static/historyallaround/atlas/discovery-core.js');
const root = path.resolve(__dirname, '../static/historyallaround/atlas');
const read = (file) => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
const unparen = (value) => (value || '').replace(/^\((.*)\)$/, '$1');

function records() {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const context = {};
  for (const name of ['EVENTS', 'PEOPLE']) vm.runInNewContext(
    html.match(new RegExp('const ' + name + ' = \\[[\\s\\S]*?\\n\\];'))[0] + '\nglobalThis.' + name.toLowerCase() + '=' + name, context);
  return { html, events: context.events, people: context.people };
}

function audit() {
  const { html, events, people } = records();
  const errors = [], warnings = [];
  const check = (condition, message) => { if (!condition) errors.push(message); };
  const reviews = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../docs/history-event-corrections.json'))).events;
  const evidence = new Map(reviews.map((r) => [r.wiki, r]));
  const eventRows = events.map((row, i) => {
    const [start, end, approximate, title, blurb, lat, lon, region, category, wiki, source] = row;
    check(Number.isInteger(start) && start !== 0 && start >= -252000000 && start <= 2026, `e${i}: invalid start`);
    check(end == null || (Number.isInteger(end) && end !== 0 && end >= start && end <= 2026), `e${i}: invalid end`);
    check([0, 1].includes(approximate) && !!title && !!blurb && !!wiki, `e${i}: incomplete record`);
    check(Number.isFinite(lat) && Math.abs(lat) <= 90 && Number.isFinite(lon) && Math.abs(lon) <= 180, `e${i}: invalid point`);
    check(['eu', 'me', 'af', 'as', 'am', 'oc'].includes(region), `e${i}: unknown region`);
    check(['power', 'war', 'ideas', 'culture', 'nature', 'fashion', 'dinosaurs'].includes(category), `e${i}: unknown category`);
    check(!source || source.startsWith('https://'), `e${i}: invalid source URL`);
    return { id: 'e' + i, title, start, end: end ?? start, approximate: !!approximate, point: [lon, lat], wiki,
      evidence: evidence.has(wiki) ? 'date and principal claim source-reviewed; see review ledger for qualifications' : source ? 'linked source; not independently reverified in this pass' : 'Wikipedia background only; independent verification outstanding',
      review: evidence.get(wiki)?.change || null,
      source: source || null };
  });
  for (const [i, row] of people.entries()) {
    check(Number.isInteger(row[1]) && row[1] !== 0 && Number.isInteger(row[2]) && row[2] !== 0 && row[1] <= row[2], `p${i}: invalid lifespan`);
    check(Math.abs(row[5]) <= 90 && Math.abs(row[6]) <= 180, `p${i}: invalid point`);
  }
  const index = read('borders/index.json');
  check(JSON.stringify(index) === html.match(/id="bordersIndex">(.*?)<\/script>/s)[1], 'Embedded border manifest differs from disk');
  const versions = new Map(), byChunk = new Map();
  let featureInstances = 0, arcCount = 0;
  for (const chunk of index.chunks) {
    const topology = read(`borders/c${chunk}.json`);
    const scale = topology.transform.scale, offset = topology.transform.translate;
    const decoded = new Map();
    function arc(id) {
      const number = id < 0 ? ~id : id;
      check(number >= 0 && number < topology.arcs.length, `${chunk}: invalid arc ${id}`);
      if (!decoded.has(number)) {
        let x = 0, y = 0;
        decoded.set(number, (topology.arcs[number] || []).map(([dx, dy]) => {
          x += dx; y += dy;
          const point = [x * scale[0] + offset[0], y * scale[1] + offset[1]];
          check(Number.isFinite(point[0]) && Math.abs(point[0]) <= 180.01 && Number.isFinite(point[1]) && Math.abs(point[1]) <= 90.01, `${chunk}: invalid coordinate`);
          return point;
        }));
      }
      const points = decoded.get(number);
      return id < 0 ? points.toReversed() : points;
    }
    const features = [];
    for (const geometry of topology.objects.p.geometries) {
      const p = geometry.properties;
      featureInstances++;
      check(!!p.n && Number.isInteger(p.f) && Number.isInteger(p.t) && p.f <= p.t, `${chunk}: invalid dates/name ${p.n}`);
      check(Number.isFinite(p.a) && p.a > 0 && p.a < 4 * Math.PI, `${chunk}: invalid area ${p.n}`);
      check(['Polygon', 'MultiPolygon'].includes(geometry.type), `${chunk}: invalid geometry ${p.n}`);
      const polygons = geometry.type === 'Polygon' ? [geometry.arcs] : geometry.arcs;
      for (const polygon of polygons) for (const ring of polygon) {
        const points = ring.flatMap(arc);
        check(points.length >= 4, `${chunk}: short ring ${p.n}`);
        if (points.length) check(Math.hypot(points[0][0] - points.at(-1)[0], points[0][1] - points.at(-1)[1]) < .02, `${chunk}: open ring ${p.n}`);
      }
      const feature = { name: unparen(p.n), member: unparen(p.m), from: p.f, to: p.t, area: p.a };
      features.push(feature);
      versions.set(JSON.stringify([p.n, p.m, p.f, p.t]), feature);
    }
    arcCount += decoded.size;
    byChunk.set(chunk, features);
  }
  const search = read('search-states.json');
  for (const row of search.rows) {
    const [name, from, to, year, lon, lat, wiki, member] = row;
    const chunk = index.chunks[0] + Math.floor((year - index.chunks[0]) / index.chunkSize) * index.chunkSize;
    const matches = core.active(byChunk.get(chunk) || [], year).filter((f) => f.name === name && f.member === member);
    check(matches.length === 1, `Search record is not uniquely rendered: ${name} / ${member} in ${year}`);
    check(year >= from && year <= to && Number.isFinite(lon) && Number.isFinite(lat), `Invalid search destination: ${name}`);
  }
  const linked = eventRows.filter((row) => row.source).length;
  if (eventRows.length !== linked) warnings.push(`${eventRows.length - linked} events still lack an independent source link.`);
  if (eventRows.length !== evidence.size) warnings.push(`${eventRows.length - evidence.size} events remain outside the source review.`);
  warnings.push('An independent source link and a valid year/point do not certify every detail. Ancient dates, representative locations and interpretive claims retain the qualifications in each entry.');
  warnings.push('Border geometries remain approximate source reconstructions; overlapping historical claims and all frontier segments have not been independently certified.');
  warnings.push('2025–2026 display the 2024 border snapshot; it is not a current conflict or occupation map.');
  return { scope: 'Every event summary and principal date reviewed against sources; all border files scanned for integrity. This is not an independent certification of every historical frontier.',
    counts: { events: events.length, people: people.length, eventsWithSourceLinks: linked,
      sourceReviewedEvents: evidence.size,
      correctedOrClarifiedEvents: reviews.filter((r) => ['start','end','approx','title','blurb','lat','lon'].some((key) => key in r)).length,
      borderChunks: index.chunks.length, borderFeatureInstances: featureInstances,
      distinctBorderVersions: versions.size, decodedArcs: arcCount, historicalSearchRecords: search.rows.length },
    errors, warnings, events: eventRows };
}

module.exports = { audit, records };
if (require.main === module) {
  const result = audit();
  if (process.argv[2]) fs.writeFileSync(process.argv[2], JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify({ counts: result.counts, errors: result.errors, warnings: result.warnings }, null, 2));
  process.exitCode = result.errors.length ? 1 : 0;
}
