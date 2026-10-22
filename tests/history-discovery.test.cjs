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
