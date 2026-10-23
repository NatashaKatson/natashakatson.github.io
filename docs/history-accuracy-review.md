# Atlas accuracy review — 23 October 2026

The review covers the dates and principal claims of all **221 event summaries**
(213 human-history entries and eight dinosaur entries). Every entry now has a
source link and an entry in the [review ledger](history-event-corrections.json).
**68 entries received a correction or qualification**; the remaining entries
received source checks. Representative coordinates locate a site, city, region,
launch facility or institution, rather than every place affected by an event.

The complete border archive was also scanned: **217 files, 22,190 feature
instances, 13,372 distinct dated versions and 2,100 historical search records**.
The [machine-readable inventory](history-accuracy-audit.json) reports no integrity
errors. It checks date ranges, coordinates, polygon closure, arc references,
manifest consistency and whether each search destination selects a rendered
record with the correct political membership. The 66 person records passed
date/coordinate integrity checks. A follow-up marks Ibn Battuta’s uncertain death
year as approximate and links the BnF authority record; this review does not claim
a new independent biographical review of each person.

These checks do **not** certify every historical frontier. The source archive
contains simplified shapes, uncertain reconstructions and political claims.
Known limitations are listed below rather than treated as verified geography.

## Corrections visible on the map

### Canada–US border

The source reduces the western 49th-parallel boundary to two distant vertices.
D3 interprets their connection as a great-circle arc, which bows north into
Canada. At 110° W, a point at 49.2° N incorrectly selected the United States.

`DiscoveryCore.resampleParallels()` inserts intermediate vertices on long
constant-latitude segments before projection. A follow-up found that the
archive's quantization also puts the recent western border at 48.986° N, about
1.5 km south of the parallel. Long horizontal segments within the western
border's coordinate range and 0.03° of 49° are now aligned to 49° before
resampling, including repeated ring endpoints. All other source endpoints remain
unchanged.
It is applied to historical polygons and to present-day country polygons and
border meshes, so drawing, selection and hover use the same geometry. Dateline
crossings are left untouched. The raw archive is not redrawn or requantized.

Canada also receives a distinct colour: its previous name hash collided with
the US, making both countries appear as one continuous territory.

Browser checks cover both globe and flat projections in 1950, 1980, 2014, 2024
and 2026, sampling seven longitudes on both sides within 600 m of the parallel.
They check containment, hover and contrasting rendered fills. Archive regression
checks cover every US and Canada feature in the 1950, 1975 and 2000 chunks,
including ring closure and preservation of unrelated boundaries.

Sources: [International Boundary Commission, western boundary section](https://www.internationalboundarycommission.org/en/maps-coordinates/maps/section-e.php)
and [D3's spherical geometry documentation](https://d3js.org/d3-geo).

### Great Lakes border and shorelines

The western parallel fix did not address the Great Lakes. Cliopatria's country
exteriors detour along the lake shores, omit the water from both countries, and
also exclude shore locations including Chicago, Toronto and Buffalo. Stroking
those exteriors incorrectly made the shorelines look like international borders.

When both Canada and the US are present from 1932, the atlas replaces only that
regional stretch of their mainland exteriors with the same shared Natural Earth
1:50m boundary. Other polygon components and the raw archive remain unchanged.
The correction now runs when border files load, so location-history scans,
comparison outlines, search and restored shared selections use the same geometry
as drawing and hover. Records spanning 1932 are split at that year in memory;
earlier views retain the earlier geometry.

Lake Michigan is entirely US territory; the international boundary crosses
Superior, Huron, Erie and Ontario and their connecting rivers. Containment,
hover, selection and drawing use the corrected polygons. Earlier historical
records retain their source geometry.

Six independently sourced Natural Earth lake polygons, including Saint Clair,
provide water fills and solid shorelines in human-history views, whether borders
are historical, Today or Off. Political boundaries are drawn across the water.
Deep-time maps do not use these modern lakes. Both sources remain cartographic
approximations, not navigation or survey data.

`great-lakes.js` bundles the shared boundary and water separately. Regenerate it
with `scripts/build-history-great-lakes.py` and a local copy of Natural Earth's
`ne_50m_lakes.geojson`; boundary coordinates come from the existing
`land-50m.json`. Browser regressions check shore cities, both sides of the shared
lakes, water rendering and hover in both projections from 1932 through 2026.

Sources: [International Boundary Commission, St. Lawrence River and Great Lakes](https://www.internationalboundarycommission.org/en/maps-coordinates/maps/section-c.php),
[Natural Earth country boundaries](https://www.naturalearthdata.com/downloads/50m-cultural-vectors/50m-admin-0-countries-2/)
and [Natural Earth lake polygons](https://github.com/nvkelso/natural-earth-vector/blob/master/geojson/ne_50m_lakes.geojson).

### Crimea

From the annual 2014 snapshot, the feature is **Crimea (occupied by Russia)**,
with **Ukraine** as its country relationship. Its detail explains occupation and
links to the UN. The Crimea ring is removed from both Russian state and realm
polygons and retained in Ukraine, including the source's otherwise incomplete
2024 Ukraine polygon. No new frontier coordinates are invented.

Hover, search, selection and shared views were checked before occupation
(2013), from 2014, and through 2026. Searching a territory in 2025–2026 now uses
the same carried-forward 2024 snapshot as rendering, fixing an availability
error.

Sources: [UNGA 68/262](https://digitallibrary.un.org/record/767883) and
[UNGA 76/70](https://mandates.un.org/mandate/A/RES/76/70).

### Other border and identity corrections

The correction script reuses source arcs and adjusts dated names, components,
areas and label anchors. Search data is rebuilt from those corrected files.

| Problem | Correction |
| --- | --- |
| Aggregate realms and constituents collapse into one normalized name | Identity includes political membership in rendering, comparison, selection and shared views |
| Larger states repaint smaller states because fills are grouped by colour | Fill in descending area order, matching hover identity |
| France retains independent Algeria and Djibouti | Remove their disjoint components from the relevant independence years |
| UK retains Bahrain, Qatar and a UAE/Oman component through 2023 | Remove the Gulf components from 1971 and move the label anchor back to Britain |
| Great Britain label survives the 1801 union | Use United Kingdom from 1801 |
| Netherlands Antilles contains Suriname | Separate continental Suriname; remove it after independence in 1975 |
| Netherlands Antilles label survives dissolution | Use Dutch Caribbean territories from 2010 |
| Mali Federation label survives 1960 | Use Republic of Mali for later records |
| Denmark–Norway label survives the union | Use Denmark for the source's post-1814 records |
| Estado Novo label survives 1974; later versions contain only Cabinda | Use Portuguese Republic for the transition and identify later Cabinda records under Angola |
| Angola, North Macedonia and Germany retain outdated or incorrect names | Apply their documented names and transitions |
| A generic “Russian-occupied territories” feature combines Georgian/Moldovan regions | Separate South Ossetia, Gagauzia and Transnistria with their recognized country relationships |

The dates are annual transitions, not claims about conditions on every day of
a transition year. See [border correction notes](history-border-corrections.md)
for methods and sources.

## Event review

The ledger records each article key, source, reason and any replacement fields.
`scripts/apply-history-event-reviews.py` applies those fields without changing
event order or numeric IDs. The audit distinguishes source-only checks from
corrections and qualifications.

Examples include:

- Blombos engravings distinguished from the separate dated drawing; debated
  archaeology and first-arrival claims qualified rather than presented as exact.
- Han chronology aligned to the conventional 206 BC date. Zhang Qian's 138 BC
  departure replaces the claim that the entire Silk Road opened in one year.
- The Mongol founding marker moved from the later capital at Karakorum to the
  Onon region, explicitly without claiming an exact meeting site.
- Gutenberg's dated printed Bible replaces an overly broad invention marker.
- Xinhai Revolution extends into 1912, when the emperor abdicated.
- The Holocaust period uses the museum's 1933–1945 framing. The COVID interval
  explicitly concerns WHO emergency status, not the end of the disease.
- The Human Genome Project's 2003 result is distinguished from a gapless genome.
- Clothing entries qualify uncertain origins, material identifications and
  legends; the Denisova needle date follows the cited 2024 review.
- Distributed events and space missions explain what their Earth marker means.
  Recent events were checked against mission, government and observatory sources.

The [per-event inventory](history-accuracy-audit.json) and
[review ledger](history-event-corrections.json) provide the complete record.

## Remaining source limitations

1. **Historical frontier segments are not independently certified.** The
   [Cliopatria project](https://github.com/Seshat-Global-History-Databank/cliopatria)
   and its issue tracker remain the provenance for the archive. Historical
   claims, colonial aggregates, tiny states and simplified coastlines still
   require specialist, period-specific review. Correcting a documented disjoint
   component does not validate every other edge of that state.
2. **The Syrian source feature “Mujahideen” does not identify a verifiable
   political entity.** It is now explicitly labeled as an unverified source
   identity, and its detail warns that these static shapes cannot establish
   armed-group control. It has not been relabeled as a particular organization
   by guessing from its outline.
3. **2025–2026 carry the 2024 border snapshot forward.** Crimea's occupation label
   continues, but this is not a live map of the wider Ukraine front line or
   other conflicts. Claims and effective control remain distinct.
4. **Navigation and coverage gaps remain separate from factual corrections.**
   The [earlier map audit](history-map-audit.md) records missing small-country
   search entries, some offshore anchors, label collisions and sparse authored
   history in many regions. Its original counts describe that earlier baseline.

## Validation

- All 47 atlas unit tests passed after the event and border corrections.
- The accuracy browser regression passed, including Crimea, the Canada–US
  parallel, independent Gulf states, Algeria, record identity and shared views.
- Slider checks passed at 41 cold dates, during real desktop/mobile dragging,
  failed downloads and comparison mode. Discovery navigation and the dinosaur
  toggle/geography browser regressions also passed. Run these browser scripts
  sequentially: an initial concurrent dinosaur run had a timing failure, while
  both isolated reruns passed.
- Border, search and event-review generators are byte-for-byte idempotent.
- Hugo 0.110.0 production build passed. Its existing `google_news` deprecation
  warnings are unrelated to this change.

Reproduce the data checks with:

```sh
python3 -B scripts/correct-history-borders.py
python3 scripts/build-history-search.py
python3 scripts/apply-history-event-reviews.py
node scripts/audit-history-accuracy.cjs docs/history-accuracy-audit.json
node --test tests/history-*.test.cjs
```

Browser checks use the dedicated local Chrome and server described in
[history-discovery.md](history-discovery.md).

## Follow-up review: source meaning and chronology

- **Israel:** the first follow-up finding was too categorical about the meaning
  of a source polygon. Geometry is unchanged. Records from 1967 explain that the
  archive combines Israel with some areas brought under military control, and
  distinguish control, civil administration and sovereignty. Hover, state search
  and location history retain the qualification. Search and coverage merging
  keep the pre-1967 period separate. Evidence is the archival
  [FRUS 1967 collection](https://history.state.gov/historicaldocuments/frus1964-68v19)
  and [12 December 1967 telegram](https://history.state.gov/historicaldocuments/frus1964-68v20/d17).
  These documents do not independently verify every later year's administration,
  precise border or local control. No contemporary political or legal ruling was
  used to redraw this geometry.
- **French colonies:** the source’s worldwide “New France” record is separated
  into northern New France, French Louisiana, and a clearly qualified French
  colonial aggregate. No ring is clipped or redrawn. New France no longer labels
  Brazil, Caribbean islands or African possessions, and the name ends before
  1763 in the available coverage. French Canada aliases apply to the northern
  records. Search anchors are interior points of the largest retained component.
  The remaining aggregate still has unverified local control/transfer dates,
  explicitly stated in its details; relabeling it does not certify its borders.
  Sources: Canadian Museum of History on
  [distinct colonies](https://www.historymuseum.ca/virtual-museum-of-new-france/colonies-and-empires/other-virtual-museum-of-new-frances/)
  and [the 1763 cessions](https://www.historymuseum.ca/virtual-museum-of-new-france/colonies-and-empires/wars-and-imperial-rivalries/).
- **Nok:** the record and description now consistently use an approximate
  900 BC viewing date for the terracotta tradition, distinguishing it from the
  older archaeological culture and from an invention date for ironworking.
  [Champion et al. (2023)](https://doi.org/10.1007/s00334-022-00902-0), Introduction
  and regional chronology, support this distinction.
- **Mansa Musa:** the summary refers to a fall in gold’s value rather than a
  general fall in goods prices, following the
  [Met’s account](https://www.metmuseum.org/de/essays/the-trans-saharan-gold-trade-7th-14th-century).
- **Ibn Battuta:** the
  [BnF authority record](https://catalogue.bnf.fr/ark:/12148/cb11908143b)
  gives an uncertain death year. The approximate flag now keeps this lifespan
  out of exact-date challenge questions and qualifies the contemporaries display.

Follow-up validation passed: all 52 unit tests, the full structural audit, and
the accuracy, search and discovery browser suites. Browser coverage includes
Toronto/Chicago/Lake Michigan location history and search/shared selections,
the 1932 geometry transition, French colonial identities, Israel's dated
historical notes, comparisons and mobile navigation. All three data generators
are idempotent. The Hugo 0.110.0 production build also passed, with the existing
`google_news` deprecation warnings. These checks do not newly certify every
historical frontier or biography.
