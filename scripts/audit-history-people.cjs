#!/usr/bin/env node
// Repeatable coverage and integrity audit of the atlas's curated people.
const fs = require('node:fs');
const { records } = require('./audit-history-accuracy.cjs');
const baselineCount = 66, cutoff = 2026;
const regions = {
  eu: 'Europe', me: 'Middle East & North Africa', af: 'Sub-Saharan Africa',
  as: 'Asia', am: 'Americas', oc: 'Oceania',
};
const periods = [
  ['Ancient', -10000, 499], ['Medieval', 500, 1399],
  ['Renaissance & early modern', 1400, 1699], ['18th & 19th centuries', 1700, 1899],
  ['20th & 21st centuries', 1900, cutoff],
];

function auditPeople(rows = records().people) {
  const errors = [], check = (condition, message) => { if (!condition) errors.push(message); };
  const keys = new Set();
  for (const [i, r] of rows.entries()) {
    const [name, born, died, approx, role, lat, lon, region, wiki, source, review] = r;
    check(typeof name === 'string' && !!name && typeof role === 'string' && !!role && !!wiki, `p${i}: incomplete identity`);
    check(!keys.has(wiki), `p${i}: duplicate identity ${wiki}`); keys.add(wiki);
    check(Number.isInteger(born) && born !== 0 && born <= cutoff &&
      (died === null || (Number.isInteger(died) && died !== 0 && died >= born && died <= cutoff)), `${name}: invalid lifespan`);
    check([0, 1].includes(approx), `${name}: missing uncertainty flag`);
    check(Object.hasOwn(regions, region), `${name}: unknown region`);
    check(Number.isFinite(lat) && Math.abs(lat) <= 90 && Number.isFinite(lon) && Math.abs(lon) <= 180, `${name}: invalid coordinates`);
    check(!source || /^https:\/\//.test(source), `${name}: invalid source`);
    if (i >= baselineCount) {
      check(!!source && !source.includes('wikipedia.org'), `${name}: missing independent source`);
      check(!!review?.location && review?.fields?.length > 0 && review.reviewedOn === '2026-11-06', `${name}: missing review metadata`);
      check(!approx || !!review?.dateNote, `${name}: unexplained approximate dates`);
    }
    for (const [field, year] of [['birthDate', born], ['deathDate', died]]) if (review?.[field]) {
      const date = review[field], parsed = new Date(`${date}T00:00:00Z`);
      check(/^\d{4}-\d{2}-\d{2}$/.test(date) && Number.isFinite(+parsed) &&
        parsed.toISOString().slice(0, 10) === date && parsed.getUTCFullYear() === year, `${name}: invalid ${field}`);
    }
    check(died !== null || (!approx && !!review?.birthDate && !review?.deathDate), `${name}: incomplete open lifespan`);
  }
  const coverage = (people) => ({
    total: people.length,
    byRegion: Object.fromEntries(Object.keys(regions).map(region => [region, people.filter(r => r[7] === region).length])),
    periodRegion: periods.map(([period, start, end]) => ({ period, start, end,
      ...Object.fromEntries(Object.keys(regions).map(region => [region,
        people.filter(r => r[7] === region && r[1] <= end && (r[2] ?? cutoff) >= start).length])),
    })),
    sourceLinks: people.filter(r => r[9]).length,
    noRecordedDeath: people.filter(r => r[2] === null).length,
  });
  return {
    reviewedOn: '2026-11-06', cutoff, regions,
    method: 'Counts describe a curated selection, not all historical people. Period-region cells count recorded lifespans overlapping each period, so a person can appear in several periods. Regions group associated marker locations, not nationality or ethnicity; North Africa is included in me. Fields are documented for the additions only.',
    baseline: coverage(rows.slice(0, baselineCount)), current: coverage(rows),
    added: rows.slice(baselineCount).map(r => ({ name: r[0], wiki: r[8], source: r[9], ...r[10] })),
    errors,
  };
}
module.exports = { auditPeople };
if (require.main === module) {
  const result = auditPeople();
  if (process.argv[2]) fs.writeFileSync(process.argv[2], JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify({ baseline: result.baseline, current: result.current, errors: result.errors }, null, 2));
  process.exitCode = result.errors.length ? 1 : 0;
}
