# Atlas redesign preview

Open **[preview.html](preview.html)** directly in your browser. It bundles the current atlas with Explore/Journeys navigation, a unified settings drawer, the complete timeline through 2026, Events/People tabs, and a mobile bottom sheet. Existing globe/map behavior, historical records, filters, sources, stories, search, comparisons, challenges, and dinosaur portraits remain available. See [the redesign notes](../atlas-restructure/README.md) for the concept and new browser checks. The screenshots in this folder document the earlier layout; current screenshots are in `../atlas-restructure/previews/`.

**Map symbols** use consistent vector category icons. Event labels wrap, avoid controls and markers, and take priority over quieter country names. Every event remains accessible through its marker, list and search even when its map label has no room. Reading cards retain subject emojis, and dinosaur art is unchanged.

**Event years** use exact calendar years for human milestones and inclusive documented intervals for historical developments. Ongoing records distinguish their original start from continuing context. All 422 records remain available. The large year opens an exact-year chooser; era labels identify historical chronology independently of border coverage. See [the map and time review](../../docs/history-atlas-map-review-2026-11-07.md) for the source audit and validation.

**Event dates:** Indigenous entries use specific sourced milestones, rather than extending community histories to the present. Examples: the Cherokee constitution in 1839, the Saami Council's founding in 1956, and the approximate Musqueam movement around AD 500. These milestones appear only in their recorded year. Genuine archaeological periods retain their source-supported ranges and appear under “Historical developments” when appropriate. Indigenous events follow the same date rules as other events.

Try years **1928**, **1955**, **1816**, or **1918** to see the medical icons. The original slider and year controls work as before.

`preview.html` is generated from the current files in `static/historyallaround/atlas/` and includes production bug fixes. Map symbols, labels and reading-card emojis use the shared production code. Rebuilding the preview does not publish a deployment.

## Rebuild

From the repository root:

```sh
node prototypes/atlas-ui/build-preview.cjs
```

Edit `static/historyallaround/atlas/event-emojis.js` for shared icon mappings. Date-context presentation now lives in the production renderer and `DiscoveryCore.isHistoricalContext`, so the preview inherits it directly. Scripts, styles, images, and compressed copies of the original map/search datasets are bundled so the preview can open from disk without a server. Optional fonts use an external service. The support button is a regular link and renders offline.

The bundled D3 7.8.5 and TopoJSON client 3.1.0 are the same versions as the atlas. Licenses are retained in `vendor/` and embedded in the preview. All event sources and map attribution remain in the original UI.

## Browser verification

With an isolated Chrome debugging instance on port 9231:

```sh
node prototypes/atlas-ui/verify.mjs
```

To check the served atlas instead, set `ATLAS_TEST_URL` to its local URL. Required
D3 and TopoJSON downloads are allowed in this mode; optional fonts and the support
widget remain blocked. Set `ATLAS_SCREENSHOT_DIR` to save screenshots elsewhere.

The check opens the standalone file with external network requests blocked and verifies original features, medical icons, map selection, corrected Indigenous dates in 1956 and 1992, date boundaries, desktop/mobile slider dragging, BC/AD stepping, playback, historical borders, and ancient geography. Mobile gesture checks cover pinch-to-drag transitions, canceled touches, lost pointer capture, coincident touches, and browser page zoom. Screenshots are saved in `previews/`.
