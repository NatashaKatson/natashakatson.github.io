# Women’s rights country colors

Open **👩 Women’s rights → Country colors → Color countries by year**. The
filter is separate from Layers and from milestone/event visibility. Drag the
timeline, press Play, use the year shortcuts, or compare two dates. Each side
uses its own year. Country tooltips and readers give the observed score and
source; the searchable table provides numeric values alongside the colors.
Saved views preserve the setting. It is off on a fresh visit.

## What is measured

The map uses **V-Dem’s Women’s Political Empowerment Index** (`v2x_gender`),
v16, published in 2026 and processed by Our World in Data. It measures civil
liberties, civic participation and political representation, with three equally
weighted components. It is a country-level expert estimate, not a complete
assessment of every economic, social or reproductive right. The sourced
milestones remain available for particular laws, exclusions, reforms and reversals.

The pinned source covers **1789–2025**, with broader country coverage after
1900. There are **27,190 observations in 197 country and historical-unit series**,
after excluding regional and world averages. Some units are historical rather
than present-day countries. Local annual gaps stay missing. Dates before the
source coverage stay unknown. For a 2026 map, the interface explicitly labels
the latest available observation as **2025**. It never presents that as a 2026
measurement.

Five equal-width display bands cover 0–0.2 (red), 0.2–0.4 (orange), 0.4–0.6
(yellow), 0.6–0.8 (light green), and 0.8–1 (green). These bands are a display
choice, not official V-Dem grades or a claim that a country is uniformly good
or bad for all women. Numeric scores and grey unknowns make interpretation
possible without relying on red/green perception alone.

Examples from this release: Canada scores 0.368 in 1900 and 0.872 in 2025;
Afghanistan scores 0.494 in 2020, 0.047 in 2021 and 0.028 in 2025. The modern
examples therefore appear green and red respectively. These are values of
this indicator, not medical or current-law guidance.

## Geography and historical matching

The Historical border mode retains the atlas’s dated geometries. Names and
story keys are matched exactly to index units, with explicit historical aliases.
West and East Germany retain separate series; Republic of China resolves to
China before 1949 and Taiwan thereafter. Current border mode uses the same
annual series on present-day reference areas.

The atlas does not assign a sovereign’s score to an unmatched dependent region.
Composite colonial envelopes remain grey while explicitly identified constituent
units can be colored. Unknown, occupied or unverified subregions remain grey.
No modern score is extrapolated backward to an ancient empire. Some early
countries in the data cannot be matched to a reliable historical map unit; their
values remain accessible in the table. This creates more grey areas on early
historical maps than on present-day reference outlines.

OWID’s published processing includes historical-regime assignments to extend
some country series before independence. That upstream processing is retained,
documented in the saved source metadata and explained in the filter. An index
estimate does not establish equal experiences across a territory or certify the
atlas’s approximate borders.

## Sources and reproducibility

- [V-Dem dataset v16 and suggested citation](https://www.v-dem.net/data/the-v-dem-dataset/)
- [V-Dem codebook](https://www.v-dem.net/documents/70/codebook_v16.pdf)
- [OWID indicator, methodology and download](https://ourworldindata.org/grapher/women-political-empowerment-index)
- [Pinned CSV, metadata and attribution](../scripts/sources/womens-empowerment/README.md)

The source files and derived score JSON are distributed under
[CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/). Original values
are stored losslessly as integer thousandths with explicit null gaps. The
generated JSON includes the CSV’s SHA-256, source URLs, release, retrieval date,
citation, license and processing summary. The browser fetches a local copy; no
live external data service is needed, including in the standalone preview.

Build: `python3 scripts/build-womens-empowerment.py`.
Check: `python3 scripts/build-womens-empowerment.py --check`.

## Verification

The Node tests cover provenance, source precision, annual changes, missing
years, latest-year labeling, historical identities, colonial envelopes,
territorial exclusions, modern names and saved-view validation. Browser tests
sample actual canvas colors for Canada and Afghanistan and both comparison
halves; check source-linked readers, load failure and retry, independence from
event visibility, shared views, ancient unknowns, both border modes, and phone
and short-window layouts. The existing milestone browser still checks that its
last result remains reachable across fourteen viewport sizes.

Final validation: all 102 Node tests, both Python geometry tests, the pinned
source rebuild check and generated country-data check pass. All 19 served
browser suites pass, including the existing border and Korea migration-arrow
checks. The offline preview passes all 46 verifier checks plus both women’s
rights browser suites with external requests blocked. Hugo 0.110.0 builds
the bilingual site successfully.
