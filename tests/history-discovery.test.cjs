const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const core = require("../static/historyallaround/atlas/discovery-core.js");

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
  for (const invalid of [{year: 0}, {year: 2027}, {zoom: 100}, {pan: [0, null]},
    {point: [0, 91]}, {cats: ["bogus"]}, {record: {wiki: "A", kind: "script", date: 1}},
    {pin: {wiki: "A", date: 1, year: 0}}, {story: 3}, {v: 2}])
    assert.equal(core.parseView(hash({...view, ...invalid}), 2026, ["war"]), null);
  assert.equal(core.parseView("#view=%7Bbroken", 2026, ["war"]), null);
  assert.equal(core.parseView("#1903", 2026, ["war"]), null);
});
