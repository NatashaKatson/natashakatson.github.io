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
