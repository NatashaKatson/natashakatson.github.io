# Original atlas + event emojis and clear date context

Open **[preview.html](preview.html)** directly in your browser. This prototype keeps the original atlas layout and behavior: globe/map, timeline slider, Play/Pause, era navigation, filters, right panel, stories, people, search, comparisons, challenges, and dinosaur portraits.

**Event emojis** appear on map markers, event-list titles, and selected event titles. Examples: vaccines 💉, medicines 💊, stethoscope 🩺, X-rays 🩻, blood groups 🩸, MRI 🧲, DNA 🧬, heart procedures 🫀, hygiene 🧼, and pandemics 🦠. Other events have category or subject icons. Source text and dinosaur art are unchanged.

**Date clarity:** continuing community histories and older multi-year periods appear under “Historical context,” separate from events dated near the selected year. Counts distinguish these groups, selected context cards explain their range, and “Meanwhile” cards identify historical context. The original date filtering and source intervals are preserved. For example, the Musqueam record covers approximately AD 500–2026 and is valid context for 1992; it is not counted as an event dated 1992. AD includes modern years as well as earlier positive years.

Try years **1928**, **1955**, **1816**, or **1918** to see the medical icons. The original slider and year controls work as before.

`preview.html` is generated from the current files in `static/historyallaround/atlas/` and includes production bug fixes. It adds the proposed event emojis without publishing a deployment. The earlier redesigned browser is no longer used.

## Rebuild

From the repository root:

```sh
node prototypes/atlas-ui/build-preview.cjs
```

Edit `event-emojis.js` for prototype icon mappings. Date-context presentation now lives in the production renderer and `DiscoveryCore.isHistoricalContext`, so the preview inherits it directly. Scripts, styles, images, and compressed copies of the original map/search datasets are bundled so the preview can open from disk without a server. Optional fonts and the existing support button use their original external services.

The bundled D3 7.8.5 and TopoJSON client 3.1.0 are the same versions as the atlas. Licenses are retained in `vendor/` and embedded in the preview. All event sources and map attribution remain in the original UI.

## Browser verification

With an isolated Chrome debugging instance on port 9231:

```sh
node prototypes/atlas-ui/verify.mjs
```

The check opens the standalone file with external network requests blocked and verifies original features, medical icons, map selection, historical-context separation in 1992, date boundaries, desktop/mobile slider dragging, BC/AD stepping, playback, historical borders, and ancient geography. Screenshots are saved in `previews/`.
