# Atlas accuracy review — 23 October 2026

The review covers the dates and principal claims of all **221 event summaries**
(213 human-history entries and eight dinosaur entries). Every entry now has a
source link and an entry in the [review ledger](history-event-corrections.json).
**67 entries received a correction or qualification**; the remaining entries
received source checks. Representative coordinates locate a site, city, region,
launch facility or institution, rather than every place affected by an event.

The complete border archive was also scanned: **217 files, 22,142 feature
instances, 13,331 distinct dated versions and 2,096 historical search records**.
The [machine-readable inventory](history-accuracy-audit.json) reports no integrity
errors. It checks date ranges, coordinates, polygon closure, arc references,
manifest consistency and whether each search destination selects a rendered
record with the correct political membership. The 66 person records passed
date/coordinate integrity checks; this review does not claim a new independent
biographical review of each person.

These checks do **not** certify every historical frontier. The source archive
contains simplified shapes, uncertain reconstructions and political claims.
Known limitations are listed below rather than treated as verified geography.

## Corrections visible on the map

### Canada–US border

The source reduces the western 49th-parallel boundary to two distant vertices.
D3 interprets their connection as a great-circle arc, which bows north into
Canada. At 110° W, a point at 49.2° N incorrectly selected the United States.

`DiscoveryCore.resampleParallels()` inserts intermediate vertices on long
constant-latitude segments before projection, preserving the source endpoints.
It is applied to historical polygons and to present-day country polygons and
border meshes, so drawing, selection and hover use the same geometry. Dateline
crossings are left untouched. The raw archive is not redrawn or requantized.

Browser checks cover both globe and flat projections in 1950, 1980, 2014, 2024
and 2026, sampling both sides of the boundary at 120°, 110° and 100° W. The
49.2° N point now belongs to Canada. A visual preview was also inspected.

Sources: [International Boundary Commission, western boundary section](https://www.internationalboundarycommission.org/en/maps-coordinates/maps/section-e.php)
and [D3's spherical geometry documentation](https://d3js.org/d3-geo).

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
