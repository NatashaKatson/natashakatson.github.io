# Thematic layers — 26 October 2026

The atlas has **346 events** and 66 people. The initial layer pass adds 19 events, extends the
existing Bantu and Partition records to qualified movement intervals, and gives
19 existing technology milestones and Tambora their own categories. Existing
event IDs retain their positions. The pandemic inventory remains unchanged.

The migration follow-up adds 24 sourced histories, taking the migration
catalogue from six to **30** and the schematic networks from ten to **33**.
This includes 29 movement records and the Pale of Settlement residency context.
Wars, revolutions, forced deportations and postwar resettlement now have
representative coverage across Europe, Asia, Africa and the Americas.

| Layer | Records | Initial coverage |
| --- | ---: | --- |
| Trade routes | 4 | Silk Roads, trans-Saharan networks, Swahili/Indian Ocean connections, Hanseatic links |
| Migrations | 30 | Ancient dispersals, forced Atlantic crossings, Cherokee removal, Great Migration, Partition, revolutionary exile and wartime displacement; see the [full catalogue](history-migrations.md) |
| Plagues & pandemics | 32 | Existing pandemic inventory, waves and milestones |
| Climate events | 7 | Younger Dryas, 8.2 ka cooling, Late Antique Little Ice Age, Little Ice Age, Tambora, Year Without a Summer, Dust Bowl |
| Technology | 24 | Writing, paper, printing, glassblowing, industrial transport and communications, spaceflight, computing and semiconductors |

The Layers menu contains Trade routes, Plagues & pandemics, Climate events and
Technology. Migrations has a dedicated button with search and the complete
catalogue. These controls and the event filters operate on the same category set.
Each category can be enabled independently. The active-record count follows the
normal two-year proximity window and records' full intervals. Counts distinguish
the selected period from the total catalogue, including in comparisons.
**Migrations** lists all 30 histories across the timeline, with the displayed
period first. Choosing a story keeps an applicable displayed year or visits its
start year, enabling migrations if hidden. Explore in Layers visits
the nearest recorded interval and enables its category. In comparison mode,
counts identify the left and right periods separately; saving a view preserves
the category choices.

Trade lines and migration arrows appear during their inclusive recorded
intervals. They summarise connections over the full interval, without assigning
a dated arrival to every waypoint. Geometry is hand-drawn between representative
places and uses the map's geodesic projection and clipping. The Great Migration
and Partition include selected corridors; forced removal and enslavement are
labelled explicitly. Lines have selectable hit targets and open the same
source-linked reader as their associated event marker.

Climate and technology use the standard dated markers. Climate points locate
associated archive regions or affected places. Regional effects, time-boundary
uncertainty and rounded BC conversions remain qualified in descriptions. The
8.2 ka Greenland interval uses c. 8250–8090 BP (BP epoch AD 1950), rounded to
c. 6300–6140 BC. Ancient migration intervals are broad viewing summaries.

Sources include [UNESCO's Silk Roads corridor](https://whc.unesco.org/en/list/1442/),
[Kilwa](https://whc.unesco.org/en/list/144/) and
[Lübeck](https://whc.unesco.org/en/list/272/), the
[Met's trans-Saharan history](https://www.metmuseum.org/essays/the-trans-saharan-gold-trade-7th-14th-century),
[Bantu genomic research](https://www.nature.com/articles/s41586-023-06770-6),
[Philippine NCCA's Austronesian discussion](https://ncca.gov.ph/about-culture-and-arts/in-focus/the-austronesian-expansion-a-reaction-to-paths-of-origin/),
[SlaveVoyages estimates](https://legacy.slavevoyages.org/assessment/estimates),
the [US National Archives](https://www.archives.gov/research/african-americans/migrations/great-migration),
[UK National Archives](https://www.nationalarchives.gov.uk/education/teaching-resources/partition-of-british-india/),
and [Smithsonian removal evidence](https://americanindian.si.edu/nk360/removal-reflections).
Climate sources include [USGS](https://www.usgs.gov/publications/stratigraphy-younger-dryas-chronozone-and-paleoenvironmental-implications-central-and),
[British Antarctic Survey](https://www.bas.ac.uk/data/our-data/publication/the-8-2-ka-event-from-greenland-ice-cores/),
[tree-ring research](https://www.nature.com/articles/ngeo2652), the
[AMS glossary](https://glossary.ametsoc.org/wiki/little-ice-age/) and NPS.
Technology additions use the [Library of Congress](https://www.loc.gov/collections/samuel-morse-papers/articles-and-essays/invention-of-the-telegraph/),
[Computer History Museum](https://www.computerhistory.org/siliconengine/timeline/)
and [DARPA](https://www.darpa.mil/about/innovation-timeline/arpanet).
Each event retains its individual source and review-ledger entry.

`historical-layers-core.js` holds the schematic geometry and pure date/category
selection. `historical-layers.js` draws paths and provides Layers controls;
`migrations.js` provides the separate migration browser. The existing
discovery renderer supplies each comparison year's state and clipping. Event
exports contain the category and descriptions; geometry remains a separate
dataset. Rebuild the standalone preview after source changes.

Verify data and interval behaviour with `node --test tests/history-layers.test.cjs`.
With the existing isolated Chrome setup, run
`node tests/history-layers.browser.mjs` for real line clicks, migration
arrowheads, category independence, interval endings, Explore, comparisons,
shared views, and controls at 1440, 390 and 320 pixels.
