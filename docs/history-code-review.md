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
