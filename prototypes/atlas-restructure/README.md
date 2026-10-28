# Atlas redesign

Implemented in `static/historyallaround/atlas/` on the `redesign` branch. The original visual proposal is [concept.png](concept.png). Open the [standalone working preview](../atlas-ui/preview.html) directly in a browser, or serve `static/` and visit `/historyallaround/atlas/`.

## Main experience

- **Explore:** a large map, one time navigator, and a concise contextual panel.
- **Journeys:** guided explorations such as women's rights, migrations, and life before humans. Starting a journey opens its relevant dates, places, and contextual controls.
- **Search:** one entry point for places, people, and events.

## Controls on demand

**Map settings** holds Globe/Map, border display, event categories, and year comparison. A selected event opens its detail and sources. Location exploration opens a separate focused view instead of adding a long nearby-history list to every event.

The timeline shows a useful era range, with **All eras** for moving between deep time and human history. Exact date entry belongs to this navigator. Its focused scale is linear; the overview retains the original expanded scale for recent history. Playback accumulates fractional progress so it advances smoothly even within short eras. Existing dates, sources, records, and shareable views are preserved.

On mobile, retain the map and compact time navigator. Put events in an expandable bottom sheet. Explore, Journeys, and Search form the primary navigation.

## Verification

With an isolated Chromium debugging session on port 9231 and a static server for `static/` on port 8769:

```sh
node prototypes/atlas-restructure/verify.mjs
node --test tests/history-*.test.cjs
```

Set `ATLAS_TEST_URL` to test another local URL or the standalone preview. `ATLAS_CDP_URL` changes the browser endpoint and `ATLAS_SCREENSHOT_DIR` changes the screenshot directory. Browser checks cover navigation, category reset, year comparison, search, chronological browsing, ancient geography, playback, BC/AD stepping, timeline dragging, keyboard dismissal, and seven viewport sizes. Screenshots are in [previews/](previews/).

Production verification uses Hugo 0.110.0, matching CI. There are no new runtime dependencies. No deployment or push is required to review the changes locally.

## Visual generation

Created with the built-in imagegen tool. Prompt direction: draw a polished editorial UX design board for History All Around, with a dominant desktop Explore screen, a Map settings drawer inset, a mobile adaptation, and three short hierarchy notes. Use warm paper, charcoal, terra-cotta, muted sage land, and pale blue oceans. Replace scattered control rows with map/time exploration, guided journeys, and settings on demand. Preserve event sources, historical-border context, and access to advanced controls.
