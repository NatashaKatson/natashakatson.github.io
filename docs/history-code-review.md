# Atlas code review — 26 October 2026

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

- 82 Node unit/data tests pass.
- Both Python geometry-builder tests pass.
- All 15 browser suites pass, covering source/data integrity, quizzes, curated
  stories, dinosaurs, discoveries, Indigenous histories, thematic layers,
  same-need comparisons, pandemics, population, search, sidebar reading,
  timeline gestures, general UI and inland water.
- The standalone preview passes 46 checks offline, including all eight dinosaur
  images and real map/timeline interactions.
- The production build passes with CI's Hugo 0.110.0.
- The accuracy audit reports zero integrity errors for 322 events, 66 people,
  217 border chunks and 2,100 historical search records.

No unresolved blocker was found in the reviewed paths. Historical source
qualifications and schematic route coverage remain documented in the event
descriptions and [layer inventory](history-layers.md).
