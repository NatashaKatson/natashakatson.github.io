# Design parity review

Compared the redesign with `main` at `5f3807d00f36467109c9286a644934dfdf9d2f03`. This review checks preservation of the existing atlas, rather than adding historical content or reinterpreting its data.

## Inventory

The complete `EVENTS` and `PEOPLE` arrays were compared with the baseline, including their order, titles, dates, descriptions, locations, categories, metadata, and source URLs. Both arrays are identical: **422 events and 66 people**. No map/search datasets, historical border files, route datasets, or curated-story records were edited.

| Event category | Records |
| --- | ---: |
| Power & states | 67 |
| Culture & faith | 47 |
| Science & exploration | 50 |
| War | 35 |
| People & nature | 12 |
| Fashion & dress | 29 |
| Pandemics | 32 |
| Trade routes | 4 |
| Migrations | 31 |
| Climate events | 7 |
| Technology | 24 |
| Women’s rights | 76 |
| Dinosaurs | 8 |
| **Total** | **422** |

The integrity audit also checks 241 country/territory destinations, 217 border chunks, 22,190 border-feature instances, and 2,100 historical search records.

## Regressions corrected

- **Truncated timeline:** removed the newly introduced era windows and restored the original full scale through 2026. The era chooser changes the selected date without changing the range.
- **Hidden controls:** restored mouse/touch access to single-year stepping and mobile map reset. Recorded-event stepping, date entry, Play/Pause, and Replay remain available.
- **Reading and keyboard focus:** story readers are revealed before receiving focus; Escape restores the originating control; closing an event returns to its original list row, including from a collapsed event list.
- **Hidden destinations:** shared curated stories and comparison stories reveal the appropriate reading panel. Mobile challenge map selection reveals the map instead of leaving it covered by the event sheet.
- **Map behavior:** restored the original projection/zoom calculations and checked labels, inland water, hit testing, political membership, historical borders, camera controls, and saved views.
- **Accessibility:** retained touch-sized close/search controls and readable event descriptions. Original sources and contextual qualifications remain accessible.

The two requested behavior changes are intentional: Play accumulates fractional progress without frame-rounding stalls and travels the original full scale in about 30 seconds; women’s-rights markers start off by default. All 76 milestones remain in Journeys and search, and the visibility toggle, direct milestone navigation, and explicit saved views can enable them. Reset filters returns to this quieter default. Date bounds, BC/AD stepping, event relevance, and record selection retain their original logic.

## Verification

`review-parity.mjs` opens every one of the 488 event/person records through the real navigation adapter and checks its title, description, dated list entry, and original source links. It also checks every title through the actual search dialog. Shared stories, one-year controls, mobile reset, list-focus restoration, and challenge map selection are exercised separately.

The existing browser tests retain their functional assertions. Actions that referenced the removed toolbar now use the real settings drawer, Journeys navigation, and mobile event sheet. Map tests wait for the workspace and fonts to settle before asserting painted labels or touch coordinates. The exhaustive parity review is also included in the browser test suite.

Build and test commands follow the repository's Hugo 0.110.0 and CI workflow. The standalone preview is rebuilt from the same application files.

Final verification: **105 JavaScript unit tests, 21 browser suites, two Python tests, the country-data check, and the Hugo 0.110.0 production build passed**. The historical-data integrity audit returned no errors.
