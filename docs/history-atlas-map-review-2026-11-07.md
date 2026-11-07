# Atlas map, time and accuracy improvements — 7 November 2026

The 2024 issue was reproduced in the local production source. All 422 historical records are retained. Human milestones now appear only in their recorded calendar year, documented developments use inclusive intervals, and ongoing records distinguish their onset from continuing context. Approximate fossil ages keep their disclosed million-year window; no uncertainty intervals were invented for approximate human dates.

## Date audit

The shared `DiscoveryCore.inYear()` predicate now drives map markers, event lists, country records, thematic counts, selected-period catalogues and contemporary event suggestions. Selecting a milestone from another year changes the selected year to its actual date. Timeline shading no longer suggests a two-year human-event window.

The previous proximity filter was the cause of the three reported examples: it admitted both 2022 and 2026 milestones into 2024. The source years for Webb and Artemis were already correct.

| Record | Verified chronology and resulting behavior |
| --- | --- |
| Artemis II | NASA dates launch to **1 April 2026** and splashdown to **10 April 2026**. Its milestone appears in 2026, never in 2024. [NASA mission record](https://www.nasa.gov/mission/artemis-ii/) |
| Webb's first images | NASA places the release in **July 2022**. The milestone appears in 2022, without being carried forward as a new event. [NASA first images](https://science.nasa.gov/mission/webb/webbs-first-images/) |
| Russia's full-scale invasion of Ukraine | The UN dates the onset to **24 February 2022**; OHCHR documents subsequent hostilities and civilian consequences through 2026. The record now has a sourced ongoing interval. At the onset it is a beginning; later years explicitly say it is continuing and retain the 2022 start. The 2026 endpoint is the atlas coverage limit. [UN onset statement](https://ukraine.un.org/en/173250-statement-secretary-general-%E2%80%93-ukraine), [OHCHR follow-up](https://ukraine.ohchr.org/sites/default/files/2026-02/2026-02-16%20HRMMU_Four%20Years%20On_fact%20sheet_1.pdf) |
| Chandrayaan-3 and Rubin Observatory | ISRO records the landing on **23 August 2023**; NSF dates Rubin's first imagery release to **23 June 2025**. Neither milestone appears in 2024. [ISRO](https://www.isro.gov.in/Chandrayaan3.html), [NSF](https://www.nsf.gov/news/first-imagery-nsf-doe-vera-c-rubin-observatory) |
| COVID-19 | The ended **2020–2023 international emergency** remains distinct from the continuing pandemic record. The emergency does not appear as ongoing in 2024. [WHO emergency decision](https://www.who.int/europe/news/item/05-05-2023-statement-on-the-fifteenth-meeting-of-the-international-health-regulations-%282005%29-emergency-committee-regarding-the-coronavirus-disease-%28covid-19%29-pandemic), [WHO continuing risk assessment](https://www.who.int/publications/m/item/covid-19-global-risk-assessment--version-10) |
| Syrian displacement | UNHCR documents returns since late 2024 alongside continuing displacement. The existing interval now explains that it is not evidence of new outward movement in every year. Schematic arrows retain their existing qualification. [UNHCR March 2026 update](https://data.unhcr.org/en/documents/details/122121) |

The exhaustive scan classifies **313 dated milestones, 94 historical intervals, seven ongoing developments and eight fossil ranges**. For every human record, tests check inclusive endpoints and exclusion immediately before and after its supported interval through the real map filter. All records are matched to their existing source-review provenance. The audit reports zero errors.

This is an exhaustive audit of temporal display behavior and provenance across the dataset, with new primary-source checks of recent milestones and ongoing contexts. It is **not a fresh independent verification of every historical claim in the existing 422-record source-review ledger**. Ancient dates, representative locations, simplified historical borders and source coverage retain their stated limits. UNHCR's regional landing pages rate-limited direct retrieval; accessible UNHCR operational reports and data pages were used for the additional Syria check.

Artifacts: `docs/history-temporal-audit.json`, the updated event-review ledger and accuracy audit, and regenerated JSON/CSV exports. Reproduce with:

```sh
node scripts/audit-history-time.cjs docs/history-temporal-audit.json
node scripts/audit-history-accuracy.cjs docs/history-accuracy-audit.json
```

## Map readability

`cartography.js` implements a deterministic screen-space layout using actual canvas text measurements. Labels avoid other event text, marker footprints, country labels, map edges and the actual bounds of the year readout, settings, zoom and notes. Comparison views reserve their own visible halves. Layout runs again for rotation, projection, zoom and year changes.

Selected and hovered records receive first choice, followed by an explicit editorial set of major events. Longer titles wrap across lines rather than being cut off. Major events can search farther from their markers, with leader lines connecting displaced labels. Country names use quieter styling and fill remaining space after event labels. Selected territories retain their callouts.

Hiding a text label never removes its marker or its list/search entry. Hover exposes the complete title and date; clicking opens the sourced reader. Tooltip appearance does not displace the marker under the pointer. The regression suite exercises this sequence with real browser pointer input.

The map's human-event emojis are replaced with a consistent set of small vector symbols inside category-colored circles. These have identical paths across operating systems and use no emoji fonts. Category controls repeat the symbols with text labels; diamonds still identify people. Existing dinosaur portraits and the personality of the reading cards are retained.

## Years and eras

The entire large year is an explicit button with a Change year hint, hover/focus states and expanded-state semantics. It opens suggested moments, era jumps and an exact-year form. The form preserves full deep-time precision. A visible close button, Escape, focus restoration and covered-control handling support keyboard and touch use.

The readout now says **Era · 21st century** for 2024. Shared chronology and era controls agree, including the correct calendar boundaries: 1801–1900, 1901–2000 and 2001 onward. Earlier broad period names are conventional, vary by region and are described as independent of border-data dates. The historical-border coverage notice remains separate.

Buy me a coffee's link, text, colors, dimensions and footer placement are unchanged.

## Validation

- 119 Node tests and four Python tests pass, including exhaustive human-record year boundaries, dense label collisions, full-title preservation and priority ordering.
- The new cartography browser suite passes at 1440, 1024, 768, 390 and 320px in globe and flat-map views, with current/conflict years, multiple zooms, rotation, real year-button clicks, keyboard dismissal, exact entry and hidden-label marker selection.
- All 32 browser suites pass after the affected suites were corrected and rechecked. The standalone preview passes 47 checks with external requests blocked. The production build passes with the CI-pinned Hugo 0.110.0, and the country destination generator verifies all 241 destinations.
- Browser screenshots use fallback fonts with optional external requests blocked; physical-device and screen-reader testing remain outstanding.

Updated screenshots: `/private/tmp/atlas-cartography-{1440,1024,768,390,320}-{2024,year-chooser,records}.png`.
