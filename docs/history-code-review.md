# Atlas code review — 27 October 2026

Reviewed the Atlas runtime and data flow after adding the thematic layers:
date parsing and filtering, geographic rendering and hit testing, category
controls, search and saved views, historical borders and water, comparison maps,
stories and local history, quizzes, population, dinosaur reconstruction,
responsive controls, exports and the standalone preview.

## Findings fixed

**P2 — Selection decorations used geographic coordinates after symbols moved.**
Collision avoidance displaced event symbols while labels and selection rings
continued using the original projected location. A ring could surround a nearby
event, or remain visible after the selected event's category was hidden. Labels
and rings now use the actual rendered marker hit. Invisible records have no
selection ring. Pandemic browser checks verify ring alignment during overlapping
outbreaks and absence after filtering.

**P2 — Offline bundling renamed image-manifest keys.**
The preview builder replaced image paths across the complete HTML after
inserting its embedded asset manifest. This rewrote the manifest's keys to data
URLs, while dynamic dinosaur avatars still looked up the original paths. Path
replacement now happens before manifest insertion. All eight avatar images
decode successfully with external network requests blocked.

**P3 — Browser tests could fail after all assertions passed.**
Several suites awaited `Target.closeTarget` through the same page WebSocket
being destroyed. Chrome could close that connection before replying, leaving an
unsettled top-level await and Node exit code 13. Cleanup now uses Chrome's HTTP
tab-close endpoint, whose response does not depend on the destroyed page.
The three reproduced failures pass after this change; the same cleanup is
applied throughout the browser suite.

The data audit also now rejects duplicate event story keys. The original Bantu
record retains its approximate 3000 BC start and ID, preserving dated shared
references while extending its qualified viewing interval. The Partition record
also retains its original ID and start year.

## Verification

- 87 Node unit/data tests pass.
- Both Python geometry-builder tests pass.
- All 16 browser suites pass, covering source/data integrity, quizzes, curated
  stories, dinosaurs, discoveries, Indigenous histories, thematic layers,
  migration browsing, same-need comparisons, pandemics, population, search, sidebar reading,
  timeline gestures, general UI and inland water.
- The standalone preview passes 46 checks offline, including all eight dinosaur
  images and real map/timeline interactions.
- The production build passes with CI's Hugo 0.110.0.
- The accuracy audit reports zero integrity errors for 346 events, 66 people,
  217 border chunks and 2,100 historical search records.

No unresolved blocker was found in the reviewed paths. Historical source
qualifications and schematic route coverage remain documented in the event
descriptions and [layer inventory](history-layers.md).

## Migration expansion follow-up

The catalogue now includes 30 migration-layer histories: 29 movement records
and the Pale of Settlement residency context, backed by 33 trade/migration
networks. Counts distinguish the displayed period from the total catalogue, and
all stories are discoverable outside their own period through the dedicated
Migrations browser. Existing shared IDs are preserved.

Regression cases explicitly visit Belarusian exile in 2020, Russian Revolution
flight in 1917, Ukrainian displacement in 2023, Jewish escape and forced Nazi
deportations in 1943, Kindertransport in 1939, and the Pale of Settlement in
1850. Legal residency context has a marker and source-linked reader without a
fabricated migration arrow or a route-method caption. Desktop and mobile checks
scroll to the final catalogue item and verify focus after dated navigation.

## Separate migration UI review

Migrations now has its own toolbar button, a Show on map checkbox, search and
all 30 histories grouped by the displayed period and other periods. This removes
the catalogue from Layers while retaining shared category and saved-view state.

**P2 — Toolbar dropdowns could be clipped or leave the viewport.** Adding a third
button exposed a negative left position at 900 pixels, while the map's overflow
also clipped long popovers. Toolbar menus now use fixed positioning aligned to
the toolbar's right edge, with height limited to the available viewport. Open
menus rise above the timeline; resize and scroll update their anchors. Mobile
migrations use a bottom sheet with a scrolling results region.

**P3 — Search and navigation needed stable context.** The panel keeps search and
visibility in place as results change, explains empty searches, and supports
common WWII aliases. Opening a record whose interval contains the selected year
preserves that year. The visibility checkbox can hide migrations even when it is
the final enabled category, and synchronises Filters and saved views. Close and
Escape restore trigger focus; selecting a story focuses its reader.

The dedicated browser suite checks these paths at 1440×1000, 1024×768, 900×700,
768×1024, 390×844, 320×568, 320×500 and 844×390, including actual hit testing of
the final scrollable result. The layer suite also covers dated routes, comparison
counts and saved categories after the separation.
The dedicated migration suite passes against both the served atlas and the
standalone offline preview. All 16 browser suites, 87 Node tests, 46 offline
preview checks and the Hugo 0.110.0 production build pass after the UI changes.

## Migration arrow rendering review

**P2 — Short migration legs lost their direction at world zoom.** Each
geographic leg had an independent eight-pixel arrowhead, suppressed when two
nearby projected samples were less than two pixels apart. Korea's Hungnam
evacuation consequently had no arrowheads at default globe zoom, then several
crowded heads at regional zoom. Heads now follow the full visible projected
path, scale down for short paths and repeat at 90-pixel intervals on long paths.
They follow the local forward tangent at bends. Korea's recorded coordinates
and historical interval remain unchanged.

**P2 — Route interaction did not use the drawing's clipping and resampling.**
Hit positions came from independent geographic samples, discarding offscreen
points. A segment crossing a zoomed viewport could therefore be drawn without
selectable samples. Route hits and arrowheads now use D3's projected line stream,
including horizon, antimeridian and viewport clipping, so separate visible pieces
stay separate and visible crossings remain selectable.

The new `tests/history-migration-arrows.browser.mjs` checks Korea at 1440, 390
and 320 pixels in globe and flat projections at zoom levels 1, 3 and 6. It
checks rendered arrow positions and forward tangents against independent dense
geographic samples, tests the other migration routes, verifies date and category
gating, and clicks Korea's line away from its marker to open the source-linked
reader. Synthetic paths exercise a map-seam crossing, a viewport crossing with
offscreen endpoints and a hidden-hemisphere route. Screenshots were inspected
at world and regional zoom on desktop and emulated phones.

Validation after the fixes: all 17 browser suites pass against the served atlas;
the new arrow suite also passes in the offline preview. All 87 Node tests, both
Python tests, the country-data check and all 46 offline preview checks pass.
The integrity audit reports no errors, and the complete bilingual site builds
with CI's Hugo 0.110.0. No additional blocker was found in the reviewed paths.

## Women’s rights code review

Reviewed the dedicated browser, map/category state, global search adapter,
source-link rendering, exports, standalone bundling and responsive controls.
The 76 milestones and their recorded sources are preserved.

**P2 — Timeline updates reset the catalogue’s scroll and keyboard focus.**
Changing the year rebuilt every result, restored focus without scrolling, then
reset the list to its beginning. A focused final result moved from the visible
list to thousands of pixels below it. Non-filter updates now retain the result
buttons and update their date annotations and selection state in place. Search,
topic and region changes still rebuild the matching list and start at its top.

**P2 — Short desktop windows made the results inaccessible.** At 1440×400 and
900×400, anchoring below the toolbar left the fixed controls using all available
height; the scrolling list collapsed to two pixels. In short desktop viewports,
the panel now uses the viewport height with twelve-pixel margins. The regression
suite checks complete, clickable final results at those sizes and 1280×450,
alongside the existing phone, tablet and desktop cases.

**P2 — Global search omitted rights country labels and abortion aliases.**
The dedicated browser indexed these fields, but global search did not.
“United States abortion” and “United Kingdom suffrage” returned no event results,
and the plural “abortions” found only the Soviet restriction entry. Global search
now indexes the rights country/context and reproductive-topic aliases. A test
uses the actual search adapter to verify both country queries and discovery of
all 19 reproductive milestones with the plural query.

Each issue was reproduced before its fix. The expanded browser checks preserve
chronology, source-linked readers, keyboard dismissal, saved visibility, map
markers, comparison dates and separation from Layers.

Validation: all 95 Node tests, both Python tests, the country-data check and all
18 browser suites pass. The updated women’s rights suite
also passes against the offline preview, whose full verifier passes all 46 checks.
The integrity audit reports no errors, exports agree with all 422 source records,
and the production build passes with Hugo 0.110.0. No unresolved blocker was
found in the reviewed code paths.

The US abortion expansion adds 22 entries after the existing catalogue, keeping
all prior story IDs. Its 24 US milestones cover eight federal milestones and
sixteen state milestones across twelve states. The dedicated Topic shortcut
combines with search and region filters; both search adapters accept USA, US,
U.S. and state names. Browser checks verify the federal/state scope, Texas and
Florida result sets, the failed Florida amendment’s qualified reader and its
official result link. Descriptions distinguish passage, commencement and voter
approval, and keep historical legal changes separate from present-day access.

## Women’s rights country colors review

A separate Country colors view uses a pinned V-Dem v16 / OWID annual series,
with no ratings derived from the event catalogue. Country fills, source-linked
readers and hover labels use the same score lookup. Each comparison half uses
its own year; the optional flag is preserved in saved views and navigation
returns. Missing years and unmatched territories stay grey. The 2026 map
explicitly labels its latest observation as 2025. The source, license,
processing and mapping rules are recorded in
[the country-color documentation](history-womens-country-colors.md).

The extra view controls exposed insufficient list height in short and narrow
windows. The panel now uses its available viewport space, with compact spacing
in short windows and independently scrollable views. The existing milestone
suite verifies the complete final result remains reachable at all fourteen
sizes. Color controls have 44-pixel view buttons and a scrollable score table.

Validation: 102 Node tests and all 19 served browser suites pass, including
actual canvas color checks, Canada and Afghanistan, two-year comparison,
playback, saved views, missing data, retry behavior, source links and responsive
controls. Both Python geometry tests, the source-data rebuild check and country
data check pass. Hugo 0.110.0 builds both language sites.

The standalone preview also passes all 46 verifier checks and both women’s
rights browser suites with external requests blocked. The 133 KB score JSON
and both modules are included in its bundle. The event catalogue and its
existing shared record identities are unchanged by the color filter.
