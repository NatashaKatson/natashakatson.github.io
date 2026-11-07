# History All Around: code, UI and map review — 7 November 2026

All four findings below have been addressed in the subsequent fix pass. The
original reproductions are retained for reference; validation does not establish
the historical correctness of every source boundary.

## Fixes applied

- Romania changes to Kingdom of Romania in 1881. All eight misidentified Berg
  geometries are retained for provenance and excluded from map/search/local-history
  results. They require a verified replacement before they can be shown again.
- Unclassified political records no longer become “Independent”. Northern Cyprus
  has explicit control/recognition qualifications, with its 1983 name change
  dated correctly. Commonwealth membership and UK territory relationships differ.
- Migration updates preserve a visible result and keyboard focus across date and
  visibility changes; new searches/scopes still start at the top.
- Selected map labels use bounded callouts and leader lines when needed, with
  wrapping on narrow maps. Crowded event markers cannot suppress the selection.
- The standalone preview is rebuilt, including the previously omitted Explore CSS.

See [the correction provenance](history-border-corrections.md) and the new
`history-review-corrections.test.cjs`, `history_border_corrections_test.py`, and
expanded accuracy/migration browser suites.

## Fix validation

- **113 Node tests, four Python tests and all 30 served browser suites pass**.
  The migration regression uses real Shift+Left input with its final result
  focused, at desktop and phone widths; it also checks reading-position
  preservation, new-search reset and focus recovery when a result leaves scope.
- The selected-label regression covers Belgium in 1885 and Germany, Poland and
  Austria in 2026 on globe and flat maps at desktop and phone widths.
- The exhaustive sweep now reports **zero missing historical selected labels**
  across **2,101 search destinations**, **zero missing current selected labels**,
  zero shadowed historical identities, zero missing country-search entries and
  zero outside-country search anchors.
- Integrity validation reports zero errors for **22,193 archived border feature
  instances**, **13,374 distinct source versions**, and **eight explicitly
  quarantined versions**. All original TopoJSON arcs and transforms in the six
  affected chunks are unchanged.
- Regenerating the identity corrections makes no further changes. The pinned
  **Hugo 0.110.0 production build passes**, and its changed runtime/data assets
  are byte-for-byte identical to the checked source.
- The expanded accuracy and migration suites also pass against the standalone
  preview. Its verifier passes **47 checks with all external HTTP(S) requests
  blocked**, including the bundled Explore styles. The verifier now reads record
  counts from the current source rather than assuming the old 66-person catalogue.
- Final desktop/phone screenshots were inspected for the selected Austria label,
  the Northern Cyprus qualification and the final migration result after a dated
  keyboard jump. No browser runtime errors were recorded in that visual pass.

Fix-pass logs are in `/private/tmp/history-fixed-browser-results/`,
`history-fixed-final-unit.log`, `history-fixed-offline-verify.log`, and
`history-fixed-map-audit.json`.
Final screenshots are `/private/tmp/history-fixed-austria-{1440,390}.png`,
`history-fixed-cyprus.png`, and `history-fixed-migration-focus.png`.

## Original findings

### P2 — Historical polity identities extend beyond their documented existence

Locations: `static/historyallaround/atlas/borders/c1800.json`,
`borders/c1825.json`, `borders/c1875.json`, `borders/c1900.json`, and
`search-states.json` (JSON files have one line).

- **Grand Duchy of Berg** is indexed for **1806–1827**, with a search destination
  in **1814**. Selecting its mapped feature in **1820** displays “Grand Duchy of
  Berg”, coverage “1820–1824”, and political status “Independent”. The
  [LVR regional history institute](https://rheinische-geschichte.lvr.de/Orte-und-Raeume/grossherzogtum-berg/DE-2086/lido/57d11981116210.76405013)
  dates the duchy's end to the aftermath of Leipzig in **1813**. This affects
  dated map inspection as well as search; it is not just an imprecise label anchor.
- **United Principalities of Moldavia and Wallachia** is indexed for
  **1859–1916**, with a search destination in **1916**. The same name appears
  when that mapped feature is selected in 1916. Romania had become a kingdom
  in **1881**, as recorded by the
  [US Office of the Historian](https://history.state.gov/countries/romania).

The existing correction pipeline does not address these identities. Correct or
explicitly quarantine the affected dated versions using sourced identities and
geometry, then regenerate the search index. Do not merely shorten the index's
dates while leaving the bad map versions selectable. Berg's post-1813 geometry
also needs investigation; renaming it to a guessed successor is insufficient.

### P2 — Missing membership is presented as verified independence

Location: `static/historyallaround/atlas/discovery-core.js:128–134`;
rendered by `index.html:1556–1557`.

`politicalStatus()` returns “Independent” for almost every feature with no
`member`. Absence of a parent in this source is not evidence of recognized
sovereignty. Reproduction: select **Turkish Republic of Northern Cyprus** in
**2024**. Its reader states “Political status: Independent”, with no specific
recognition qualification. The
[UN Security Council's resolution 541](https://digitallibrary.un.org/record/58970?v=pdf)
deems the declaration legally invalid and calls on states not to recognize a
Cypriot state other than the Republic of Cyprus. A general approximation note
does not resolve the reader's explicit status claim.

Use qualified status metadata where available and a neutral description for
unclassified source records. Distinguish source political membership, effective
control and recognized sovereignty. Association membership needs its own wording
too: the UK currently receives “Part of Commonwealth of Nations”, using the
same template as dependent territories.

### P2 — Migration updates scroll away from the focused result

Location: `static/historyallaround/atlas/migrations.js:75–79`.

At **1440×1000**, open Journeys → Human migrations → All years at **2026**.
Scroll to and focus the final record, **Expansion of Bantu-speaking communities**
(`e21`). Change to **2025** without closing the catalogue, for example with the
global Shift+Left event shortcut while the result is focused.

The catalogue replaces all result buttons, restores focus with
`preventScroll: true`, and unconditionally resets `scrollTop` to zero. In the
browser reproduction the scroll position changed from **1325 to 0**; keyboard
focus remained on `e21`, whose top moved from **857 px to 2182 px**. The scrolling
list ended at approximately **918 px**, leaving the active result invisible.
The same reset also discards a mouse user's reading position on date updates.

Preserve the result list's scroll and a visible focus target for date, selection
and visibility updates. Reset the list when search or scope changes warrant it.
The women's-rights browser already has a related preservation approach.

### P3 — A selected territory can still have no map label

Location: `static/historyallaround/atlas/index.html:1363–1364`.

Selection wins label ordering, but all five candidate positions can still be
rejected because of nearby event/person markers. There is no selected-label
fallback after those candidates fail.

Confirmed at **1440×1000**, globe projection, zoom **1.6**, with the camera
centered on the selected feature's anchor:

- Kingdom of Belgium, **1885**.
- Federal Republic of Germany, **2026**.
- Republic of Poland, **2026**.
- Second Republic of Austria, **2026**.

The independent sweep flagged **31 of 2,100 historical search destinations**
and **three current selected features** without their name being drawn. Those
31 are diagnostic flags, not a claim that every actual search navigation was
individually reproduced. The four cases above were confirmed through the real
renderer and selected-state reader. Reserve a fallback label or use a leader
line for the selected territory; ordinary collision suppression can remain.

## Verification performed

- **109 Node tests passed**: dates, data integrity, geometry, search, migrations,
  Indigenous records, pandemics, women's rights, dinosaurs and discovery helpers.
- **Two Python builder tests passed**; generated country data check passed.
- **All 30 browser suites passed**, covering responsive UI, keyboard navigation,
  comparison maps, route clicks and arrowheads, category/date gating, search,
  readers, local history, population, themed catalogues and saved views.
  Additional probes reproduced the findings above outside those assertions.
- **Hugo 0.110.0 production build passed**. The installed Hugo 0.162.1 fails
  on the older theme/configuration; CI pins 0.110.0, so that is not a failure of
  the configured deployment build.
- Integrity audit: **422 events**, **123 people**, **217 border chunks**,
  **22,190 border feature instances**, **13,372 distinct historical versions**,
  **134,438 decoded arcs** and **2,100 historical search records**; zero integrity
  errors.
- Exhaustive map/search diagnostic: **241 country/territory entries**, zero
  missing country-search entries, zero country-search anchors outside their
  polygons, and zero historical search identities shadowed by another record.
- Reviewed all **31 migration records** and their associated **30 schematic
  movement networks**. The Pale of Settlement intentionally has no route.
  Coordinates, direction, inclusive viewing intervals, category gating and
  source-linked readers were checked through data inspection and the migration
  browser/arrow suites. No reversed or out-of-range route was identified.
- Inspected desktop and emulated phone screenshots. Landing page checks at
  **1440, 768, 390 and 320 px** found no horizontal overflow or broken images.
  The browser suites also exercise short screens, tablets and phone landscape.
  Screenshots used fallback fonts with Google Fonts blocked, matching the tests.

## Historical accuracy and coverage limits

Migration arrows represent selected connections over their full viewing interval,
not surveyed journeys, movement counts, annual flows or proof that a corridor
was continuously open. Source spot-checks included the
[Greek–Turkish exchange convention](https://www.mfa.gov.tr/lausanne-peace-treaty-vi_-convention-concerning-the-exchange-of-greek-and-turkish-populations-signed-at-lausanne_.en.mfa),
[Hungnam evacuation](https://www.history.navy.mil/content/history/nhhc/about-us/leadership/director/directors-corner/h-grams/h-gram-056/h-056-1.html),
and [Kindertransport chronology](https://kindertransport.org/history/historical-timeline/).
The migration text qualifies compulsory movement, selected war windows and the
1940 final Kindertransport. Not every claim across all 422 events and 123
people was independently reverified against external sources in this pass.
Some source fetches were blocked or rate-limited; those were not counted as
evidence of broken visitor links.

The historical border source ends in **2024**; **2025–2026 reuse that snapshot**,
with a visible notice. It is not a current conflict/front-line reconstruction.
The map diagnostic flagged **750 historical label anchors outside their own
geometry**, including modern Chile, Somalia and Viet Nam versions. These require
review, not blanket geometry edits: disconnected land and simplified coasts can
produce outside centroids without proving the territorial outline wrong.

Under the diagnostic's approximate present-day-country marker assignment,
**152 of 241 entries have no authored human event/person marker**. That is a
coverage limitation, not evidence that those places have no history. None of the
automated checks certifies every boundary segment or historical political claim.

## Reproduction artifacts

Artifacts for this session are under `/private/tmp/`:

- `history-full-review-results/summary.json` and per-suite logs.
- `history-full-review-map.json` and `history-full-review-map.log`.
- `history-review-confirm.mjs`, `history-review-cdp.mjs`, and
  `history-review-confirm.log` for the additional reproductions.
- `history-review-migrations-before.png`, `history-review-migrations-after.png`,
  and `history-review-selected-austria-confirmed.png`.
- `history-review-landing.log` and `history-review-landing-{width}.png`.

The source server used port **8876** and an isolated Chrome profile/CDP port
**9247**. These temporary artifacts are diagnostic outputs, not deployed assets.
