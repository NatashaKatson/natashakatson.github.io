# Atlas events and people

`atlas-data.json` contains both collections, field names, and date/region metadata.
`events.csv` and `people.csv` contain the same records in UTF-8 CSV format.
The export includes 346 events (including 8 dinosaur entries) and 66 people.

These are the curated event and people records from
`static/historyallaround/atlas/index.html`. They do not include the atlas's
separate map boundaries, search places, population, water datasets or schematic
route geometry in `historical-layers-core.js`.

Historical years are signed integers: negative for BC/BCE, positive for AD/CE,
with no year zero. Prehistoric entries preserve the atlas's approximate numeric
dates; dinosaur dates represent negative ages. A null `endYear` (blank in CSV)
means a single dated entry. Ranges can describe historical or archaeological
periods. Indigenous milestones use the date of the named event rather than an
open-ended community history.

Schema version 2 adds `ongoing`. When true, `endYear: 2026` is the atlas's
coverage cutoff, and the UI labels the interval “present”. The pandemic category
contains 32 records, including historical waves and separately dated milestones;
see [coverage and sources](../../docs/history-pandemics.md).

Descriptions, roles, coordinates, Wikipedia links, and any additional source
links are preserved. Optional nested context objects and alias arrays are JSON
values in the JSON file and JSON strings inside CSV cells. Empty CSV cells
represent null values. Source links are copied as recorded; an export does not
independently verify historical claims. IDs follow source array positions.

Regenerate from the current atlas source with:

```sh
node scripts/export-history-data.cjs
```
