# Original atlas + event emojis and clear date context

Open **[preview.html](preview.html)** directly in your browser. This prototype keeps the original atlas layout and behavior: globe/map, timeline slider, Play/Pause, era navigation, filters, right panel, stories, people, search, comparisons, challenges, and dinosaur portraits.

**Event emojis** appear on map markers, event-list titles, and selected event titles. Examples: vaccines 💉, medicines 💊, stethoscope 🩺, X-rays 🩻, blood groups 🩸, MRI 🧲, DNA 🧬, heart procedures 🫀, hygiene 🧼, and pandemics 🦠. Other events have category or subject icons. Source text and dinosaur art are unchanged.

**Event dates:** Indigenous entries use specific sourced milestones, rather than extending community histories to the present. Examples: the Cherokee constitution in 1839, the Saami Council's founding in 1956, and the approximate Musqueam movement around AD 500. These events appear near their dates, not in every later year. Genuine archaeological periods retain their source-supported ranges and appear under “Historical context” when appropriate. Indigenous events follow the same date rules as other events.

Try years **1928**, **1955**, **1816**, or **1918** to see the medical icons. The original slider and year controls work as before.

`preview.html` is generated from the current files in `static/historyallaround/atlas/` and includes production bug fixes. Event emojis are rendered by the shared production code. Rebuilding the preview does not publish a deployment. The earlier redesigned browser is no longer used.

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
