# Women’s political empowerment — pinned source

Downloaded 27 October 2026 from Our World in Data’s [CSV](https://ourworldindata.org/grapher/women-political-empowerment-index.csv) and [metadata](https://ourworldindata.org/grapher/women-political-empowerment-index.metadata.json).
Producer: **V-Dem v16 (2026)**, indicator `v2x_gender`; [dataset and citation](https://www.v-dem.net/data/the-v-dem-dataset/), [DOI](https://doi.org/10.23696/vdemds26), [codebook](https://www.v-dem.net/documents/70/codebook_v16.pdf).

V-Dem publishes its data under **[CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/)**. The source files and derived `womens-empowerment.json` are distributed under that license. Attribution and the OWID citation are retained in the generated JSON and visible map controls. OWID’s processing and historical-regime assignments are described in the saved metadata. These scores are expert estimates, rather than a checklist of enacted laws or a complete measure of economic and reproductive rights.

Build offline: `python3 scripts/build-womens-empowerment.py`. Verify the pinned result: `python3 scripts/build-womens-empowerment.py --check`. The builder excludes regional aggregates and preserves gaps and all published score precision; it does not infer values from the atlas’s event milestones.
