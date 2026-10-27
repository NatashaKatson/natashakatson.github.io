const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const core = require("../static/historyallaround/atlas/discovery-core.js");
const discoveries = require("../static/historyallaround/atlas/curated-discoveries.js");

test("contemporaries require inclusive lifespan overlap and different regions", () => {
  const a = { wiki: "A", born: -10, died: 10, region: "eu" };
  const b = { wiki: "B", born: -5, died: 5, region: "as" };
  const local = { wiki: "Local", born: -100, died: 100, region: "eu" };
  const uncertain = { wiki: "Uncertain", born: -200, died: 200, region: "am", approx: true };
  assert.deepEqual(core.contemporaryPair([a, b, local, uncertain], -5, "A").people, [a, b]);
  assert.equal(core.contemporaryPair([a, b], 5).to, 5);
  assert.equal(core.contemporaryPair([a, b], 6), null);
  assert.equal(core.contemporaryPair([a, local], 1), null);
  assert.equal(core.contemporaryPair([], 1), null);
  assert.equal(core.yearsBetween(-1, 1), 1);
  assert.equal(core.yearsBetween(-10, -5), 5);
  assert.equal(core.yearsBetween(-10, 10), 19);
  new vm.Script(fs.readFileSync("static/historyallaround/atlas/contemporaries.js", "utf8"));
});

test("Cleopatra's period has sourced records across regions and cross-cultural contemporaries", () => {
  const html = fs.readFileSync("static/historyallaround/atlas/index.html", "utf8");
  const context = vm.createContext({});
  vm.runInContext(html.match(/const EVENTS = \[[\s\S]*?\n\];/)[0] + "\n" +
    html.match(/const PEOPLE = \[[\s\S]*?\n\];/)[0] + "\nglobalThis.data={EVENTS,PEOPLE};", context);
  const active = Array.from(context.data.EVENTS).filter((e) => e[0] <= -50 && (e[1] ?? e[0]) >= -50);
  for (const region of ["me", "as", "am"]) assert(active.some((e) => e[7] === region && e[10]?.startsWith("https:")));
  const people = Array.from(context.data.PEOPLE, (p) => ({ wiki: p[8], born: p[1], died: p[2], region: p[7], approx: !!p[3] }));
  const pair = core.contemporaryPair(people.filter((p) => discoveries[0].contemporaries.includes(p.wiki)), -50, "Cleopatra");
  assert.deepEqual(pair.people.map((p) => p.wiki), ["Cleopatra", "Emperor_Yuan_of_Han"]);
});

test("curated discoveries have stable IDs, sourced stops and map years within their lifetime", () => {
  assert.equal(new Set(discoveries.map((s) => s.id)).size, discoveries.length);
  const html = fs.readFileSync("static/historyallaround/atlas/index.html", "utf8");
  assert(html.indexOf('src="curated-discoveries.js"') < html.indexOf('src="discovery.js"'));
  for (const story of discoveries) {
    assert.match(story.id, /^[a-z0-9-]{1,80}$/);
    assert(story.title && story.introduction && story.start <= story.end);
    assert.equal(new Set(story.stops.map((s) => s.id)).size, story.stops.length);
    for (const stop of story.stops) {
      assert.match(stop.id, /^[a-z0-9-]{1,80}$/);
      assert(Number.isInteger(stop.year) && stop.year !== 0 && stop.year >= story.start && stop.year <= story.end);
      assert(stop.point.length === 2 && Number.isFinite(stop.point[0]) && Math.abs(stop.point[0]) <= 180 &&
        Number.isFinite(stop.point[1]) && Math.abs(stop.point[1]) <= 90);
      assert(["event", "context"].includes(stop.kind));
      assert(stop.title && stop.location && stop.text && stop.sources.length);
      for (const [label, url] of [...story.sources, ...stop.sources]) {
        assert(label);
        assert.equal(new URL(url).protocol, "https:");
      }
    }
  }
  new vm.Script(fs.readFileSync("static/historyallaround/atlas/discovery.js", "utf8"));
});

test("same-year discoveries compare sourced places with local, labeled illustrations", () => {
  const pairs = discoveries.filter((s) => s.format === "same-year");
  assert(pairs.length >= 2);
  for (const story of pairs) {
    assert(story.topic);
    assert.equal(story.start, story.end);
    assert.equal(story.stops.length, 2);
    assert.equal(new Set(story.stops.map((s) => s.location)).size, 2);
    for (const stop of story.stops) {
      assert.equal(stop.year, story.start);
      assert(stop.mapNote && stop.imageAlt.startsWith("Illustration"));
      assert.match(stop.image, /^images\/meanwhile\/[a-z-]+\.svg$/);
      assert(fs.existsSync("static/historyallaround/atlas/" + stop.image));
    }
  }
  const diapers = pairs.find((s) => s.id === "diaper-care-1961");
  assert.match(diapers.stops[1].text, /1959/);
  assert.match(diapers.context, /1986/);
  assert.equal(diapers.stops[1].kind, "context");
  const periods = pairs.find((s) => s.id === "period-care-1980");
  assert(periods.stops.every((s) => s.kind === "context"));
  assert.match(periods.context, /viewing year/);
});

test("dated features use inclusive intervals and latest version per polity", () => {
  const old = { name: "A", from: -10, to: 20, area: 2 };
  const newer = { ...old, from: 10 };
  assert.deepEqual(core.active([old, newer], -10), [old]);
  assert.deepEqual(core.active([old, newer], 20), [newer]);
  assert.deepEqual(core.active([old, newer], 21), []);
});
test("local events handle antimeridian and exclude far-away records", () => {
  const near = { lon: -179.9, lat: 0, start: 20 },
    far = { lon: 0, lat: 0, start: 1 };
  assert.deepEqual(core.nearby([far, near], [179.9, 0]), [near]);
  assert.equal(core.distance([0, 0], [0, 0]), 0);
});
test("coverage merges adjacent records without bridging gaps or political relationships", () => {
  const r = { name: "A", member: "B", wiki: "A" };
  assert.deepEqual(
    core
      .coverage([
        { ...r, start: 10, end: 20 },
        { ...r, start: 1, end: 9 },
        { ...r, start: 30, end: 40 },
        { ...r, member: "C", start: 10, end: 20 },
      ])
      .map((r) => [r.start, r.end, r.member]),
    [
      [1, 20, "B"],
      [10, 20, "C"],
      [30, 40, "B"],
    ],
  );
});
test("coverage normalizes year-zero endpoints and joins adjacent BC and AD intervals", () => {
  const record = { name: "Polity", member: "", wiki: "Polity" };
  assert.deepEqual(core.coverage([{ ...record, start: -77, end: 0 }]),
    [{ ...record, start: -77, end: -1 }]);
  assert.deepEqual(core.coverage([
    { ...record, start: -5, end: 0 }, { ...record, start: 0, end: 5 },
  ]), [{ ...record, start: -5, end: 5 }]);
  assert.deepEqual(core.coverage([{ ...record, start: 0, end: 0 }]), []);
  assert.deepEqual(core.historicalInterval(0, 24), { start: 1, end: 24 });
});
test("connections distinguish source associations, geographic associations and missing evidence", () => {
  const a = { wiki: "A", lon: 0, lat: 0 };
  const shared = { wiki: "A", lon: 90, lat: 0 };
  const local = { wiki: "B", lon: 0.001, lat: 0 };
  const thematic = { wiki: "C", lon: 50, lat: 0 };
  const c = core.connections(a, [a, shared, local, thematic]);
  assert.equal(c.length, 2);
  assert.equal(c[0].reason, "Shared source article");
  assert.match(c[1].reason, /not a causal link/);
  assert.deepEqual(core.connections({ lon: 0, lat: 0 }, [shared]), []);
});
test("story context offers sourced nearby records, then the same period, without inventing links", () => {
  const anchor = { id: "anchor", wiki: "Anchor", start: 1900, lon: 0, lat: 0 };
  const near = { id: "near", wiki: "Nearby", start: -500, lon: 1, lat: 0,
    source: "https://example.org/nearby" };
  const contemporary = { id: "person", wiki: "Person", born: 1880, died: 1920, lon: 90, lat: 0 };
  const unrelated = { wiki: "Other", start: 1700, lon: 90, lat: 0 };
  const unsourced = { start: 1900, lon: 0.1, lat: 0 };
  const records = [anchor, { ...anchor }, contemporary, near, unrelated, unsourced];
  const nearby = core.storyContext(anchor, records, 1900);
  assert.equal(nearby.title, "Explore nearby history");
  assert.deepEqual(nearby.connections.map((c) => c.record.id), ["near"]);
  assert.equal(nearby.connections[0].source, near.source);
  assert.match(nearby.connections[0].reason, /111 km/);
  assert.match(nearby.description, /does not establish a historical connection/);
  // Territory suggestions use the viewed year without treating a centroid as a place.
  const period = core.storyContext({ name: "Empire" }, records, 1900);
  assert.equal(period.title, "Explore the same period");
  assert(period.connections.some((c) => c.record === anchor));
  assert(!period.connections.some((c) => c.record === contemporary));
  assert(!period.connections.some((c) => c.record === near || c.record === unrelated));
  assert.equal(core.storyContext(anchor, [anchor, unrelated, unsourced], 1900), null);
  assert.equal(core.storyContext(anchor, records, 0), null);
  assert.equal(core.storyContext({}, [{ wiki: "CE", start: 1 }], -2).connections.length, 1);
  assert.equal(core.storyContext({}, [{ wiki: "CE", start: 1 }], -3), null);
});
test("inline atlas scripts remain syntactically valid after integration", () => {
  const html = fs.readFileSync(
    "static/historyallaround/atlas/index.html",
    "utf8",
  );
  for (const m of html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g))
    if (!/application\/json|src=/.test(m[1])) new vm.Script(m[2]);
  assert.match(html, /discovery-core\.js/);
  assert.match(html, /discovery\.js/);
});

// The formatter is also used to populate the comparison year inputs.
test("year inputs accept formatted years and reject contradictory eras", () => {
  const html = fs.readFileSync("static/historyallaround/atlas/index.html", "utf8");
  const parse = html.match(/^function parseYear\(s\)\{[\s\S]*?^\}/m)[0];
  const format = html.match(/^function fmt\(y,approx\).*$/m)[0];
  const context = vm.createContext({ NOW: 2026 });
  vm.runInContext(parse + "\n" + format, context);
  for (const year of [-300000, -500, -1, 1, 500, 999, 1000, 2026]) {
    context.year = year;
    assert.equal(vm.runInContext("parseYear(fmt(year))", context), year);
  }
  for (const [input, expected] of [["AD 1", 1], ["500 BCE", -500], ["BCE 500", -500], ["CE 500", 500], ["-500", -500], ["1,492", 1492]]) {
    context.input = input;
    assert.equal(vm.runInContext("parseYear(input)", context), expected);
  }
  for (const input of ["0", "AD 0", "0 BC", "-500 CE", "AD 500 BC", "1492junk", "9".repeat(400)]) {
    context.input = input;
    assert.equal(vm.runInContext("parseYear(input)", context), null);
  }
});

test("border snapshots continue through today without changing historical dates", () => {
  const html = fs.readFileSync("static/historyallaround/atlas/index.html", "utf8");
  const index = JSON.parse(html.match(/<script type="application\/json" id="bordersIndex">(.*?)<\/script>/s)[1]);
  const context = vm.createContext({
    NOW: 2026, BTO: index.to, BFROM: index.chunks[0],
    BCS: index.chunkSize, BSET: new Set(index.chunks),
  });
  for (const name of ["borderYear", "chunkOf"])
    vm.runInContext(html.match(new RegExp("^function " + name + "\\(y\\).*?}$", "m"))[0], context);
  for (const year of [2024, 2025, 2026]) {
    context.year = year;
    assert.equal(vm.runInContext("borderYear(year)", context), 2024);
    assert.equal(vm.runInContext("chunkOf(year)", context), 2000);
  }
  assert.equal(vm.runInContext("borderYear(2012)", context), 2012);
  assert.equal(vm.runInContext("chunkOf(2027)", context), null);
  assert.equal(vm.runInContext("chunkOf(BFROM - 1)", context), null);
  const active = {name: "Current", from: 2000, to: 2024, area: 1};
  const ended = {name: "Ended", from: 2000, to: 2020, area: 1};
  assert.deepEqual(core.active([active, ended], vm.runInContext("borderYear(2026)", context)), [active]);
});

test("recent years contain sourced events visible to the timeline", () => {
  const html = fs.readFileSync("static/historyallaround/atlas/index.html", "utf8");
  const events = html.slice(html.indexOf("const EVENTS ="), html.indexOf("const PEOPLE ="));
  const mapping = html.match(/^const ev=EVENTS.map.*$/m)[0];
  const active = html.slice(html.indexOf("function relevance("), html.indexOf("function alivePeople("));
  const context = vm.createContext({
    state: { year: 2026 },
    DiscoveryCore: core,
    halfWin: () => core.sameTimeYears,
  });
  vm.runInContext(html.match(/^const CATS=.*$/m)[0] + "\nstate.cats = new Set(Object.keys(CATS));", context);
  vm.runInContext(events + "\n" + mapping + "\n" + active, context);
  for (const year of [2023, 2024, 2025, 2026]) {
    context.state.year = year;
    assert.equal(vm.runInContext("activeEvents().some(({e}) => e.start === state.year && e.source?.startsWith('https://'))", context), true);
  }
  context.state.year = 2026;
  assert.equal(vm.runInContext("activeEvents().some(({e}) => e.wiki === 'Artemis_II')", context), true);
  context.state.cats.clear();
  assert.equal(vm.runInContext("activeEvents().length", context), 0);
});

test("meanwhile uses inclusive two-year dates, other regions, and preserves sparse coverage", () => {
  const anchor = { wiki: "Anchor", region: "am" };
  const ongoing = { wiki: "Ongoing", region: "as", start: 1810, end: 1820, approx: false };
  const exact = { wiki: "Exact", region: "eu", start: 1815, end: 1815, approx: false };
  const nearbyYear = { wiki: "Next", region: "af", start: 1817, end: 1817, approx: false };
  const sameRegion = { wiki: "Local", region: "am", start: 1815, end: 1815 };
  const events = [ongoing, exact, nearbyYear, sameRegion, { ...exact, wiki: "Duplicate region" }];
  assert.deepEqual(core.meanwhile(anchor, events, 1815), [ongoing, exact, nearbyYear]);
  assert.deepEqual(core.meanwhile(anchor, [{ ...nearbyYear, start: 1818, end: 1818 }], 1815), []);
  assert.deepEqual(core.meanwhile(anchor, events, 1850), []);
});

test("shared views reject malformed or unbounded camera and date values", () => {
  const view = { v: 1, year: -500, left: 1903, mode: "flat", borders: "history",
    rot: [-25, -22, 0], pan: [.2, -.4], zoom: 2, split: .52, compare: true,
    changed: false, selectedYear: -500, cats: ["war"], record: null,
    polity: null, point: [179, -90], story: 1, pin: null };
  const hash = (v) => "#" + new URLSearchParams({ view: JSON.stringify(v) });
  assert.deepEqual(core.parseView(hash(view), 2026, ["war"]), view);
  const discovery = { id: "cleopatra-world", stop: "monte-alban" };
  assert.deepEqual(core.parseView(hash({...view, discovery}), 2026, ["war"]).discovery, discovery);
  const contemporaries = ["Cleopatra", "Emperor_Yuan_of_Han"];
  assert.deepEqual(core.parseView(hash({...view, contemporaries}), 2026, ["war"]).contemporaries, contemporaries);
  for (const invalid of [{year: 0}, {year: 2027}, {zoom: 100}, {pan: [0, null]},
    {point: [0, 91]}, {cats: ["bogus"]}, {record: {wiki: "A", kind: "script", date: 1}},
    {pin: {wiki: "A", date: 1, year: 0}}, {story: 3}, {v: 2},
    {discovery: {id: "<script>", stop: "rome"}}, {discovery: {id: "cleopatra-world", stop: 4}},
    {discovery: {id: "x".repeat(81), stop: "rome"}}, {contemporaries: ["A"]},
    {contemporaries: ["A", "A"]}, {contemporaries: ["A", 3]}])
    assert.equal(core.parseView(hash({...view, ...invalid}), 2026, ["war"]), null);
  assert.equal(core.parseView("#view=%7Bbroken", 2026, ["war"]), null);
  assert.equal(core.parseView("#1903", 2026, ["war"]), null);
});

test("search ranks names before mentions, supports aliases and accents, and filters by type", () => {
  const records = core.prepareSearch([
    {kind:"event",title:"A voyage",description:"Leaving São Paulo for Rome"},
    {kind:"place",title:"São Paulo, Brazil",aliases:["São Paulo"]},
    {kind:"state",title:"Eastern Roman Empire",aliases:["Byzantine Empire"]},
    {kind:"person",title:"Cleopatra",description:"Ruler of Egypt"},
  ]);
  assert.equal(core.search(records, "SAO PAULO")[0].kind, "place");
  assert.equal(core.search(records, "byzantine empire")[0].title, "Eastern Roman Empire");
  assert.equal(core.search(records, "ruler egypt", "person")[0].title, "Cleopatra");
  assert.deepEqual(core.search(records, "Egypt", "event"), []);
  assert.deepEqual(core.search(records, "x"), []);
  assert.deepEqual(core.search(records, "!!!"), []);
  assert.deepEqual(core.search(records, "<script>no match</script>"), []);
});

test("every indexed state can open an available dated snapshot with matching membership", () => {
  const d3 = require('../prototypes/atlas-ui/vendor/d3.min.js');
  const topojson = require('../prototypes/atlas-ui/vendor/topojson-client.min.js');
  const dir = "static/historyallaround/atlas/";
  const manifest = JSON.parse(fs.readFileSync(dir + "borders/index.json"));
  const data = JSON.parse(fs.readFileSync(dir + "search-states.json"));
  const chunks = new Map();
  const unparen = (s) => s.replace(/^\((.*)\)$/, "$1");
  assert(data.rows.length > 1000);
  for (const [name, start, end, year, lon, lat, wiki, member] of data.rows) {
    assert(start <= year && year <= end && start !== 0 && end !== 0 && year !== 0, name);
    assert(Number.isFinite(lon) && Math.abs(lon) <= 180 && Math.abs(lat) <= 90, name);
    const chunk = manifest.chunks[0] + Math.floor((year - manifest.chunks[0]) / manifest.chunkSize) * manifest.chunkSize;
    if (!chunks.has(chunk)) {
      const topology = JSON.parse(fs.readFileSync(dir + `borders/c${chunk}.json`));
      chunks.set(chunk, topojson.feature(topology, topology.objects.p).features.map((f) => ({
        ...f, geometry: core.resampleParallels(f.geometry), name: unparen(f.properties.n),
        member: unparen(f.properties.m || ''), from: f.properties.f, to: f.properties.t,
        area: f.properties.a,
      })));
    }
    const target = core.active(chunks.get(chunk), year).find((f) => f.name === name &&
      f.member === member && (f.properties.w || '') === wiki);
    assert(target, name + " " + year);
    assert(d3.geoContains(target, [lon, lat]), name + " " + year + ' search point is inside the rendered geometry');
  }
});

test("same-name state search prefers sustained coverage over a short early segment", () => {
  const data = JSON.parse(fs.readFileSync("static/historyallaround/atlas/search-states.json"));
  const records = core.prepareSearch(data.rows.map(([title, start, end, year]) =>
    ({ kind: "state", title, start, end, year })));
  assert.equal(core.search(records, "New France", "state")[0].year, 1757);
});

test("Quebec history has sourced events and a period overview visible between event years", () => {
  const html = fs.readFileSync("static/historyallaround/atlas/index.html", "utf8");
  const context = vm.createContext({});
  vm.runInContext(html.match(/const EVENTS = \[[\s\S]*?\n\];/)[0] + "\nglobalThis.events=EVENTS;", context);
  const records = Array.from(context.events).filter((e) => e[5] > 45 && e[5] < 47 && e[6] > -74 && e[6] < -71);
  for (const year of [1608, 1642, 1701, 1759, 1763, 1774, 1867, 1977]) {
    assert(records.some((e) => e[0] === year && e[1] === null && e[10]?.startsWith("https://")), String(year));
  }
  const period = records.find((e) => e[9] === "Canada_(New_France)");
  assert(period[0] <= 1650 && period[1] >= 1750);
  assert.match(period[4], /not uninterrupted French control/);
});

test("city search includes source attribution, distinct duplicate names, and valid coordinates", () => {
  const data = JSON.parse(fs.readFileSync("static/historyallaround/atlas/search-places.json"));
  assert.match(data.source, /GeoNames/);
  assert.match(data.license, /creativecommons.org\/licenses\/by/);
  assert(data.rows.length > 30000);
  const vancouvers = data.rows.filter(([name]) => name === "Vancouver");
  assert(vancouvers.some((r) => r[1] === "CA"));
  assert(vancouvers.some((r) => r[1] === "US"));
  for (const [name, country, lon, lat, population, id, aliases] of data.rows) {
    assert(name && /^[A-Z]{2}$/.test(country), name);
    assert(Number.isFinite(lon) && Math.abs(lon) <= 180 && Number.isFinite(lat) && Math.abs(lat) <= 90, name);
    assert(Number.isSafeInteger(id) && id > 0 && population >= 0 && Array.isArray(aliases), name);
  }
  new vm.Script(fs.readFileSync("static/historyallaround/atlas/search.js", "utf8"));
});

test("city search retains common exonyms and names across scripts", () => {
  const data = JSON.parse(fs.readFileSync("static/historyallaround/atlas/search-places.json"));
  const records = core.prepareSearch(data.rows.map(([title, country, lon, lat, population, id, aliases]) =>
    ({ kind: "place", title, population, aliases })));
  for (const [query, expected] of [["Kiev", "Kyiv"], ["Москва", "Moscow"],
    ["東京", "Tokyo"], ["Peking", "Beijing"], ["Лондон", "London"]])
    assert.equal(core.search(records, query, "place")[0]?.title, expected, query);
});
test("same-period suggestions use displayed dates within two years, not overlapping lifespans", () => {
  const anchor = { wiki: "Anchor", start: 1819 };
  const records = [
    { wiki: "Before", start: 1817 }, { wiki: "After", start: 1821 },
    { wiki: "TooEarly", start: 1816 }, { wiki: "TooLate", start: 1822 },
    { wiki: "Simon_Bolivar", born: 1783, died: 1830 },
    { wiki: "Napoleon", born: 1769, died: 1821 },
    { wiki: "OlderPeriod", start: 1800, end: 1830 },
    { wiki: "Newborn", born: 1819, died: 1900 },
  ];
  const context = core.storyContext(anchor, records, 1819);
  assert.deepEqual(context.connections.map((c) => c.record.wiki), ["Newborn", "Before", "After"]);
  assert.match(context.description, /within 2 years/);
  assert.equal(core.storyContext(anchor, records.slice(2, 7), 1819), null);
});
