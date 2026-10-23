# History map audit — October 22, 2026

Audited the working tree after the Quebec changes: all 241 entries in the detailed
Natural Earth map, all 2,084 historical search rows, and 13,316 distinct historical
feature versions across all 217 border files. These are dataset entries, including
territories and disputed areas, rather than a count of sovereign countries.

The audit found additional navigation defects and substantial content gaps.
It does not establish that historical borders, dates, or political labels are
historically correct. This pass adds diagnostic files; it makes no further changes
to the Atlas application or its source datasets.

## Findings, in priority order

### 1. Some historical search results display a different territorial record

`loadChunk()` removes the parentheses that distinguish aggregate realms from
constituent records. Both `polities()` and `DiscoveryCore.active()` then retain
only one feature per normalized name, even when membership and geometry differ.
Search navigation selects by name **and membership**, so its chosen feature can
be absent from the map that is actually drawn.

This affects 21 indexed search rows across 17 names. Geometry differences vary
from small boundary differences to a completely different geographic focus.
Three destinations also lose their own map label:

| Search row | Year | Search focus | Record actually retained for that name |
| --- | ---: | --- | --- |
| Netherlands, aggregate realm | 1917 | 113.92° E, 0.28° S | Mainland Netherlands, anchor 5.47° E, 52.27° N |
| Dutch Republic, constituent record | 1769 | 110.42° E, 7.31° S | Aggregate record anchored at 19.69° E, 32.72° S |
| Spanish Empire, aggregate realm | 1877 | 3.61° W, 40.40° N | Small constituent record anchored at 125.69° E, 7.01° N |

Other affected names include Portuguese Empire, Kingdom of France, multiple
French republics/empires, Holy Roman Empire, Kingdom of England, Mahajanapadas, Merovingian Empire, and Vichy France. The same source
geometries can have legitimate parent/child overlap; blindly drawing every
duplicate is not a sufficient correction. Preserve record identity and explicitly
resolve aggregate versus constituent rendering, selection, comparison and sharing.

### 2. Country search omits 64 detailed-map entries

`search.js` constructs country results exclusively from `lo.countries`, the 177
entries in the embedded 1:110m map. Loading the 241-entry 1:50m map does not update
that search catalog. Missing country/territory results include Singapore, Bahrain,
Malta, Monaco, Andorra, Liechtenstein, Vatican, Barbados, Mauritius, Maldives,
Seychelles, Samoa, Tonga, Palau and several Caribbean and Pacific territories.

Some names still return cities or historical states. This is specifically a gap
in present-day country/territory results, not proof that all searches for those
names return nothing. A catalog based on the detailed map would address this
independently of inventing historical border coverage for small countries.

### 3. Thirteen current country-search points lie outside their own map geometry

The full multipolygon centroid is not necessarily a usable point inside a
country. The actual coarse-map search anchors fail that containment check for:
France, Indonesia, Japan, Philippines, Malaysia, Vietnam, Norway, Croatia, Israel,
Haiti, Bahamas, Fiji and Solomon Islands.

The clearest example is **France**: searching the present-day country focuses
6.80° W, 43.14° N, outside France. Its overseas components shift the centroid
away from metropolitan France. Other failures include points in coastal waters
or between islands; their practical severity varies. A verified interior point
on an appropriate component would improve navigation and subsequent place history.

Separately, 753 of the 13,316 historical feature versions have a source anchor
outside their own polygon. These are review flags, not 753 independently proven
historical errors: a centroid of disconnected land can legitimately lie offshore.
The three source versions covering 2024 that fail containment are Chile, Somalia
and Vietnam. Do not silently rewrite source geometry to move a label.

### 4. Belgium still has a historical label collision

At desktop historical-search zoom, **Kingdom of Belgium in 1885** loses its
selected-state label because nearby person/event markers obstruct every one of
the five candidate positions. Together with the three identity failures above,
this makes four missing selected labels across the 2,084 historical search rows.

All **191 features in the current historical layer** passed the same selected-label
check at desktop search zoom. That is a focused-label test, not a guarantee that
every country is labeled simultaneously or that every historical year was rendered.
Mobile and arbitrary camera positions were not exhaustively audited in this pass.

### 5. Many places genuinely have no authored human-history markers

After excluding dinosaur records, **182 of the 241 detailed-map entries have no
event or person marker assigned to them**. Examples include Brazil, Argentina,
Vietnam, Thailand, Philippines, Netherlands, Portugal and Sweden. Their border
records can still exist, but the event/person experience is empty, much as Quebec
was before its new records were added. Iran has one person marker and no event
markers under this geographic assignment.

Counts use the present-day detailed-map polygons. A point outside all polygons is
assigned to the nearest boundary within 25 km to accommodate simplified coastlines;
otherwise it is left unassigned. This is an approximate inventory of marker
locations across all recorded dates, not a measure of a country's historical
importance or an attribution of ancient people to present-day nationalities.
Records located abroad can also discuss a country. Indigenous and regional history
coverage requires separate editorial review. These counts do not measure city
search coverage or the historical border archive.

The [complete geographic inventory](history-map-country-coverage.csv) lists all
241 entries with event/person counts and country-search availability.

## Reproducing the audit

Use a dedicated test browser, as for the other Atlas browser checks:

```sh
python3 -m http.server 8891 --bind 127.0.0.1 --directory static/historyallaround
# Launch an isolated headless Chrome with:
# --remote-debugging-port=9231 --user-data-dir=/tmp/history-country-audit-qa about:blank
node scripts/audit-history-map.mjs
```

The script creates and closes its own page. It reads the local map and indexes,
renders historical search destinations at 1440 × 1000 and zoom 1.6, and writes
full JSON findings to the OS temporary directory. It does not mutate application
data. Rendering every destination can take a few minutes. `--skip-render` performs
the data and geographic inventory without the label sweep. `ATLAS_TEST_URL`,
`ATLAS_CDP_URL`, and `ATLAS_AUDIT_OUTPUT` override the URL, browser and output file.

This diagnostic reports findings rather than treating all source-data flags as
test failures. The full desktop sweep and coast-tolerant inventory
were run against the updated border corrections for this report; no external historical fact-check was performed.
