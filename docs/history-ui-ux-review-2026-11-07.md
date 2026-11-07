# History All Around UI and UX review — 7 November 2026

Reviewed the atlas at commit `71e977ab`, with particular attention to year introductions, list filters, country context, suggested years and five-stop topic journeys. The original findings below are retained as the record of the review; the authorized follow-up implements the improvements described here.

## Implementation follow-up

- Mobile readers now extend to the bottom navigation, have a compact sticky header and an explicit Back to map control. Covered map/timeline controls leave the keyboard order until the reader closes. Compact layouts now include screens up to 620px high.
- Phone introductions start collapsed, and changing years preserves the user's expanded/collapsed choice on every screen size.
- Guided journeys appear first as full-width choices, followed by a separately labeled Browse collections group.
- Next and Previous preserve keyboard direction. Endpoint focus moves to the current stop heading, and a status region announces the new stop.
- Timeline buttons visibly distinguish Event jumps from year steps and display the configured increment. The year chooser uses a disclosure indicator and a shorter Years label on narrow phones.
- List filters explicitly name their scope and selected region/type. Hidden categories have a direct action to reveal their map markers and list records; map settings label them Visible event types.
- **Buy me a coffee is unchanged**, as requested: its link, text, colors, size and footer placement are preserved. The recommendation to change its visual emphasis is withdrawn.

Validation: all **113 Node tests**, the **Hugo 0.110.0 production build** and **eight browser suites** pass: UX improvements, Explore, final review/safe areas, date layout, visible population, UX, footer and people tabs. The new regressions cover reader space, real keyboard navigation through every journey stop, filter recovery, preserved introduction state and the unchanged Buy me a coffee button. Updated screenshots are `/private/tmp/atlas-ux-updated-{1440,768,390,320}-{map,events,journeys,topic}.png`. The standalone preview is rebuilt from the same production source and passes **47 offline checks** with external HTTP(S) requests blocked.

## Verdict

The desktop experience is visually balanced and has a recognizable editorial identity. The warm paper palette, serif headings, fine rules and restrained rust accent suit a historical atlas. It feels contemporary without needing a different visual style.

The new features improve orientation, but their discoverability is uneven. The year introduction explains why a date matters; suggested moments offer a useful starting point; country records connect the map to its content. On phones, persistent controls and repeated headings consume the reading area. The highest-value improvements are layout and interaction changes, rather than a visual redesign.

## Original findings, ordered by priority

### 1. P2 — Mobile reading and map space are squeezed by persistent UI

At **390×844**, the open Events sheet occupies approximately **458px**, from y=72 to y=530. Its sticky handle occupies 70px, followed by roughly 173px of heading, counts, scope text and tabs. The first event row begins around **y=785**, outside the sheet's visible area. Users opening Events initially see introductory text and must scroll before reaching either filters or event rows.

At **320×570**, the collapsed-sheet map is only about **106px tall**. The year, Map settings, map notices and zoom controls crowd that area. The 193px timeline, 82px collapsed reader, 60px navigation and approximately 67px footer leave little space for the main activity. The existing compact-height layout begins at 550px, so this viewport misses it.

**Recommendation:** Give an open reader most of the screen and reduce its sticky header. Compress secondary controls on short screens. Keep Buy me a coffee in its existing footer position. Apply compact behavior according to remaining map space, including 570px-high screens.

**Implementation references:** `static/historyallaround/atlas/workspace.css:197`, `:242`, `:243`, `:266`; `static/historyallaround/atlas/explore.js:126`.

**Evidence:** `/private/tmp/atlas-ux-390-fresh-events.png`, `/private/tmp/atlas-ux-320-map.png`.

### 2. P2 — Advancing a topic journey moves keyboard focus to Previous

Open Journeys → Technology. The first stop focuses **Next stop**. Activating it advances to stop 2 but moves focus to **Previous stop**. Pressing Enter then returns to stop 1; pressing Enter again advances to stop 2. This was reproduced with browser keyboard input after the first activation.

`showStop()` recreates the controls and focuses Previous whenever the stop index is nonzero. The sequence interrupts a user who expects to keep moving forward.

**Recommendation:** Preserve the activated direction when rebuilding the reader. Keep Next focused after advancing, and Previous after going back. At an endpoint, focus the stop heading or a clearly useful enabled control. Announce the changed stop title and position.

**Implementation reference:** `static/historyallaround/atlas/explore.js:77`.

### 3. P2 — The new guided journeys are less discoverable than the catalogues

On a **390×844** phone, Journeys initially shows the women's-rights and migration cards and part of the dinosaur card. The five-stop section starts around **y=565**, below the sheet's approximately **y=530** bottom edge. Its topic buttons begin still farther down. A visitor can enter Journeys without seeing the new guided paths.

The same page uses large colored cards for catalogues and smaller outlined buttons for guided paths. Women's rights appears in both places without explaining the distinction at the choice point.

**Recommendation:** Put a clearly labeled **Guided journeys · 5 stops** group first, followed by **Browse collections**. Give the guided options comparable visual weight and distinguish the two women's-rights choices by purpose.

**Implementation references:** `static/historyallaround/atlas/atlas-ui.js:63`; `static/historyallaround/atlas/explore.js:59`; `static/historyallaround/atlas/explore.css:48`.

**Evidence:** `/private/tmp/atlas-ux-390-journeys.png`, `/private/tmp/atlas-ux-1440-journeys.png`.

### 4. P2 — Changing the year overrides the user's collapsed introduction

Collapse the year introduction at 1942, then change the year to 1943. The introduction opens again. The date update explicitly assigns `intro.open = true`.

This makes a useful explanation repetitive during year-by-year browsing and pushes the list and filters downward again. It is especially disruptive in the small phone reader.

**Recommendation:** Open the introduction initially, then preserve the user's expanded/collapsed preference across year changes. Continue updating its compact heading and the mobile preview.

**Implementation reference:** `static/historyallaround/atlas/explore.js:133`.

### 5. P3 — Timeline controls require too much interpretation

The timeline presents Play, previous/next recorded event, previous/next year, the editable date, the era chooser and Explore years. Desktop tooltips and accessible labels explain these, but on phones the visible icon groups do not clearly convey the difference between event jumps and year steps. The configured year-step size is inside Explore years.

**Recommendation:** Keep a visibly labeled year-step group and show its increment when it differs from one year. Group event jumps separately, with a compact visible label. Use consistent disclosure indicators for controls that open panels; the arrow on Explore years currently resembles a link to another destination.

**Implementation references:** `static/historyallaround/atlas/index.html:454`; `static/historyallaround/atlas/workspace.css:28`; `static/historyallaround/atlas/explore.js:39`.

### 6. P3 — List filters and map filters create two competing scopes

Region and Event type filter the sidebar, while category controls in Map settings affect map visibility. The status sentence explains that filters apply to the list, but the distinction is easy to overlook, particularly when the map continues showing markers excluded from the list.

**Recommendation:** Label the controls **Filter this list** and keep an active-filter summary visible. Explicitly label map category settings as map visibility. Provide a nearby action to reveal a category if a list choice has no results because that map category is hidden.

**Implementation references:** `static/historyallaround/atlas/explore.js:9`; `static/historyallaround/atlas/explore.js:150`; `static/historyallaround/atlas/atlas-ui.js:28`.

### 7. P3 — The Buy me a coffee button dominates the mobile visual hierarchy

The saturated yellow Buy me a coffee button is one of the strongest visual elements on every phone screen, including while reading a journey. Its contrast and persistent placement compete with the quieter primary navigation and discovery actions.

**Owner decision:** Keep Buy me a coffee unchanged. No change to this button is included in the implementation.

**Implementation reference:** `static/historyallaround/atlas/index.html:502`.

## What works well

- The desktop map/sidebar proportion and restrained typography create a clear, coherent composition.
- Suggested years pair dates with concrete records, making an unfamiliar timeline easier to enter.
- Year introductions provide context and retain sources and geographic examples.
- Country context creates a useful bridge from a geographic selection to events and people, with qualifications about what the location means.
- Bounded lists, Events/People tabs and expandable sources reduce initial clutter while retaining access to detail.

## Verification and limits

- Inspected fresh browser screenshots at **1440×900**, **768×1024**, **390×844** and **320×570**, covering map, Events, Journeys, topic reader and year chooser states.
- Ran `tests/history-explore.browser.mjs` against the locally served production atlas. All checks passed at **1440, 1024, 768, 390 and 320px**, including additional short/landscape viewport checks, country context, focus restoration, timeline navigation and topic paths. No runtime exceptions were recorded.
- Used additional browser probes to reproduce collapsed-introduction reset and journey focus reversal. Passing existing tests does not cover those interaction expectations.
- Optional external requests were blocked, so screenshots use fallback fonts. Findings concern hierarchy, measured layout and behavior; loaded web fonts may change wrapping slightly.
- Viewports and keyboard input were emulated in Chrome. This review does not establish physical-device behavior, screen-reader usability or results from user testing.

Implemented priorities: mobile space and reading hierarchy; journey focus; guided-path discovery; collapse-state persistence; timeline/filter clarity. Buy me a coffee remains unchanged.
