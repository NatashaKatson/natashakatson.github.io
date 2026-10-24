#!/usr/bin/env node
// Export the curated records used by the atlas without changing its runtime data.
const fs = require('node:fs');
const path = require('node:path');
const { records } = require('./audit-history-accuracy.cjs');

const { events: eventRows, people: personRows } = records();
const wikipediaUrl = (slug) => 'https://en.wikipedia.org/wiki/' +
  encodeURIComponent(slug).replace(/%2C/g, ',').replace(/%27/g, "'");
const events = eventRows.map((row, index) => {
  const [startYear, endYear, approximate, title, description, latitude, longitude,
    region, category, wikipediaSlug, sourceUrl, fossilRegion, locationSourceUrl,
    indigenousContext, aliases] = row;
  return {
    id: 'e' + index, title, description, startYear, endYear: endYear ?? null,
    approximate: !!approximate, latitude, longitude, region, category,
    wikipediaSlug, wikipediaUrl: wikipediaUrl(wikipediaSlug), sourceUrl: sourceUrl ?? null,
    fossilRegion: fossilRegion ?? null, locationSourceUrl: locationSourceUrl ?? null,
    indigenousContext: indigenousContext ?? null, aliases: aliases ?? [],
  };
});
const people = personRows.map((row, index) => {
  const [name, bornYear, diedYear, approximate, role, latitude, longitude,
    region, wikipediaSlug, sourceUrl] = row;
  return {
    id: 'p' + index, name, bornYear, diedYear, approximate: !!approximate, role,
    latitude, longitude, region, wikipediaSlug, wikipediaUrl: wikipediaUrl(wikipediaSlug),
    sourceUrl: sourceUrl ?? null,
  };
});
const data = {
  metadata: {
    schemaVersion: 1,
    sourceFile: 'static/historyallaround/atlas/index.html',
    eventCount: events.length,
    peopleCount: people.length,
    dateConvention: 'Historical years use negative numbers for BC/BCE and positive numbers for AD/CE; there is no year zero. Prehistoric entries retain the atlas numeric dates, including approximate negative ages for dinosaurs. A null event endYear means a single dated entry, not an ongoing event.',
    coordinates: 'Latitude and longitude in degrees. Points can represent a location associated with an entry rather than its full geographical extent.',
    ids: 'IDs match the current atlas array positions and may change if source records are reordered.',
    regions: {
      eu: 'Europe', me: 'Middle East & North Africa', af: 'Sub-Saharan Africa',
      as: 'Asia', am: 'Americas', oc: 'Oceania',
    },
  },
  events,
  people,
};

function csv(rows) {
  const columns = Object.keys(rows[0]);
  const cell = (value) => {
    const text = value == null ? '' : typeof value === 'object' ? JSON.stringify(value) : String(value);
    return /[",\r\n]/.test(text) ? '"' + text.replace(/"/g, '""') + '"' : text;
  };
  return [columns, ...rows.map((row) => columns.map((key) => row[key]))]
    .map((row) => row.map(cell).join(',')).join('\r\n') + '\r\n';
}

const output = path.resolve(__dirname, '../exports/historyallaround');
fs.mkdirSync(output, { recursive: true });
fs.writeFileSync(path.join(output, 'atlas-data.json'), JSON.stringify(data, null, 2) + '\n');
fs.writeFileSync(path.join(output, 'events.csv'), csv(events));
fs.writeFileSync(path.join(output, 'people.csv'), csv(people));
console.log(`Exported ${events.length} events and ${people.length} people to ${output}`);
