# History All Around discovery

The implementation is local to `static/historyallaround/atlas/`. It adds no runtime dependencies and does not change the historical datasets. The original D3 projection, canvas, timeline, filters, globe, and ledger remain in use. Integration hooks in `index.html` delegate to `discovery.js`; pure date/coverage/distance/association helpers live in `discovery-core.js`. `discovery.css` styles only the new controls and panels, plus the timeline space they require.

## Compare

Choose **Compare**, enter the left and right years, and apply. BC/BCE, AD/CE, and signed years use the existing parser; year zero is rejected. The existing global timeline drives the right year. Both sides share the same geographic projection, pan, rotation and zoom. The divider supports pointer/touch dragging, arrow keys, Home and End. Clicked territories and people use the year of the clicked side. Clicking a left-side event does not replace the right-side year.

Optional changed-record outlines compare source geometry and political membership by polity name. They are **not** geometric gain/loss polygons, an assessment of significance, or proof of effective control. No comparison is highlighted unless both requested historical files are available. Existing border-layer choices remain available; **Today** is explicitly a modern overlay.

Historical border coverage is 3400 BCE–2024, subject to missing regions and periods. Missing or failed historical loads leave the base coastline with an unavailable/loading message. They do not draw the previous year's borders, freeze the last available year, or fall back to today's borders. Modern borders remain accessible through the explicit Today control. The underlying coastline basemap is still Natural Earth, not a reconstruction of ancient coastlines.

## History of a place

Click a map location, or open an event/person/territory, and choose **Explore this place's history**. The coordinate is retained independently of changing political boundaries. The scrollable panel contains:

- Cliopatria feature coverage at that coordinate, intersected with each file's 25-year storage window and the feature's own validity interval. Adjacent records with the same name, relationship and source are merged; gaps remain gaps.
- Existing events whose recorded marker is within 50 km. This is geographic proximity, not evidence that an event affected every location in that radius.

Twenty entries appear initially; Show more adds twenty. Dates and records are source-derived, and coverage can overlap. Jumping to a period focuses the original coordinate. Return restores the original year, camera, selection, map mode, border layer, comparison and category filters.

The scan is on demand, progressive and limited to two concurrent requests. It can read the full border archive (about 14 MB uncompressed across 217 files); decoded feature caching stays bounded. Returning or selecting a new place cancels remaining work for the previous scan. Failed files are explicitly reported as incomplete coverage. No scan runs during ordinary map browsing.

The dataset does not systematically distinguish claims from control, contain Indigenous territories, or provide historical place names, settlement records, and cultural histories. The panel explains those limitations. Missing entries never mean a place was uninhabited. Adding these dimensions requires dated, licensed, appropriately attributed sources, ideally developed with relevant communities.

## Connections

Up to four cards appear under **Follow the story**, with fewer or an empty state when evidence is limited. There are two kinds of discovery:

- Explicit, source-backed links between existing records: Oregon Treaty ↔ Pig War, and the Russian ukase ↔ Alaska boundary case. The latter is a documentary association, not a claim of direct causation.
- Clearly labeled shared-source or same-location associations. The latter requires markers within 2 km and explicitly says it is not a causal link. A shared source article likewise does not assert causality.

No thematic or causal links are inferred from category, nationality, temporal proximity, or modern borders. Each card has a source link. Navigation focuses the record's coordinate and year. Back restores up to thirty exploration steps, including camera, selection, filters and comparison state. A place panel is retained in the trail when navigating away from it.

Sources for the explicit links:

- [Washington State Archives: Pig War](https://www.sos.wa.gov/archives/explore-our-collection/national-history-day-topic-guide/pig-war-pig-and-international-boundary-dispute), documenting the unresolved Oregon Treaty boundary and the later incident.
- [Library of Congress: Alaskan boundary tribunal case and appendix](https://www.loc.gov/item/04004083/), listing Russian ukases among the documentary material for the boundary case.

## Validation

Run pure regression and inline-script syntax checks from the repository root:

```sh
node --test tests/history-discovery.test.cjs
```

Browser regressions use Node 22's built-in WebSocket client and an isolated headless Chrome debugging session; no npm install is needed. Start a static server and a **dedicated test browser profile** (the script creates and closes its own test page):

```sh
python3 -m http.server 8891 --bind 127.0.0.1 --directory static/historyallaround
# In a second terminal, launch your Chrome binary with:
# --headless --remote-debugging-port=9231 --user-data-dir=/tmp/history-discovery-qa about:blank
node tests/history-discovery.browser.mjs
```

`ATLAS_CDP_URL` and `ATLAS_TEST_URL` override the defaults. The script checks comparison years, border validity, data gaps, keyboard divider controls, place history, return navigation, supported/empty story cards, multi-step Back, corresponding-year info panels, mobile overflow, real touch divider movement, map panning and pinch zoom. It reports median synchronous render times and writes a mobile screenshot to the OS temporary directory. This is emulated mobile testing, not physical-device coverage.

Build with the CI version, **Hugo 0.110.0**, using `hugo --minify`. The locally installed Hugo 0.162.1 cannot build the existing configuration/theme; these unrelated migration issues were not changed.

## Most valuable next work

1. Precompute a compact spatial/temporal coverage index to avoid scanning every border file for each place. Keep the original source geometries authoritative.
2. Add community-reviewed Indigenous presence, settlement and place-name histories with explicit validity dates, provenance, uncertainty and distinctions between claims and control.
3. Grow the curated story graph with stable entity IDs, typed relationships and citation-level evidence. Existing array-index record IDs should not be used in a long-lived public graph.
4. Add shareable URLs for comparison years, selected coordinates and story trails, followed by physical-device and network-throttling checks.
