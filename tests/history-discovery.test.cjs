const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const core = require("../static/historyallaround/atlas/discovery-core.js");
const discoveries = require("../static/historyallaround/atlas/curated-discoveries.js");

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
    state: { year: 2026, cats: new Set(["ideas", "culture", "nature", "war", "power", "fashion"]) },
    halfWin: () => 1,
  });
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

test("meanwhile uses inclusive same-year dates, other regions, and preserves sparse coverage", () => {
  const anchor = { wiki: "Anchor", region: "am" };
  const ongoing = { wiki: "Ongoing", region: "as", start: 1810, end: 1820, approx: false };
  const exact = { wiki: "Exact", region: "eu", start: 1815, end: 1815, approx: false };
  const nearbyYear = { wiki: "Next", region: "af", start: 1816, end: 1816 };
  const sameRegion = { wiki: "Local", region: "am", start: 1815, end: 1815 };
  const events = [ongoing, exact, nearbyYear, sameRegion, { ...exact, wiki: "Duplicate region" }];
  assert.deepEqual(core.meanwhile(anchor, events, 1815), [ongoing, exact]);
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
  for (const invalid of [{year: 0}, {year: 2027}, {zoom: 100}, {pan: [0, null]},
    {point: [0, 91]}, {cats: ["bogus"]}, {record: {wiki: "A", kind: "script", date: 1}},
    {pin: {wiki: "A", date: 1, year: 0}}, {story: 3}, {v: 2},
    {discovery: {id: "<script>", stop: "rome"}}, {discovery: {id: "cleopatra-world", stop: 4}},
    {discovery: {id: "x".repeat(81), stop: "rome"}}])
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
    if (!chunks.has(chunk)) chunks.set(chunk, JSON.parse(fs.readFileSync(dir + `borders/c${chunk}.json`)).objects.p.geometries);
    assert(chunks.get(chunk).some(({properties:p}) => unparen(p.n) === name &&
      unparen(p.m || "") === member && (p.w || "") === wiki && p.f <= year && p.t >= year &&
      p.lx === lon && p.ly === lat), name + " " + year);
  }
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
