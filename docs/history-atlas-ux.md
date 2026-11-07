# Atlas discovery and year context

The review found that useful features already existed—search, era jumps, category
filters, sourced discoveries and map selection—but users had little context before
interpreting the map. Country cards also lacked a direct list of contemporary
records, and flat-map story selection could leave the selected marker offscreen.

## Updated experience

- **Explore years** combines seven suggested moments, the existing era jumps and
  a choice of 1, 10, 100 or 1,000 years for the year arrows. The exact-year field
  remains available. Deep-time arrows use one million years. Endpoint buttons are
  disabled, and event-navigation tooltips name their next destination. Playback
  keeps its existing timing; **How time moves** explains the unequal time scale,
  pause/replay and the two sets of arrows.
- **Year introduction** appears above the worldwide records, with a compact
  preview in the mobile sheet handle. It can be collapsed. For 1942 it introduces
  World War II and points to recorded intervals in Asia and the Americas. Source
  dates and links remain available; following a record opens its existing reader.
- **Browse records** offers region and event-type filters for the list, leaving
  map-wide category settings intact. People use the same region selector. Event
  groups initially show four records; people initially show eight. Expanding a
  group preserves access to every record and keyboard focus on returning from a
  biography or event.
- **Country context** lists events near the selected year and people whose
  recorded lifespans include it, using marker containment in the selected shape.
  It includes hidden event types and reveals a type when its record is opened.
  Comparison selections use the selected side's year. Present-day country clicks
  provide explicitly qualified geographic context and an outline highlight.
- **Map connection** retains selection rings and globe movement, and centers a
  selected story on a panned or zoomed flat map.
- **New to the atlas?** provides optional guidance about years, map gestures,
  Globe/Map, approximate historical coverage and modern reference borders.
- **A few stops through time** adds chronological topic paths for technology,
  science/exploration and women's rights, reusing five existing sourced records
  per topic and the normal timeline and story readers.

## How introductions are assembled

`explore-core.js` contains pure, deterministic helpers. `explore.js` presents them
through the existing workspace. There is no runtime AI, API key, extra download or
backend. Camera-only redraws reuse the current introduction.

An introduction uses records whose inclusive intervals contain the selected year,
independent of map category filters. Recorded conflicts can anchor their interval;
otherwise shorter intervals take priority, with source order breaking ties.
Additional examples favour other regions and topics, up to three records total.
The text reuses the existing description and titles rather than inventing a
narrative or causal connection. The WWII description was clarified against its
[existing National WWII Museum source](https://www.nationalww2museum.org/students-teachers/student-resources/explore-wwii-history).

When no interval contains the year, the introduction explicitly labels broader
period context and shows dated examples from that period. Clicking these examples
changes the year to the record's date. If there are no suitable records, the
interface states the coverage gap. Approximate dates and broad intervals retain
their labels. A record spanning decades is not evidence of a discrete event in
every year of that interval.

The topic paths sample exact, sourced event start dates across each category.
They are browseable selections, not causal histories or exhaustive accounts.
Country matches describe representative recorded locations, never citizenship,
residence in the selected year, effective control, or an event's entire extent.
Geographic selections and list filters are local UI state. Existing URL encoding,
sharing controls and link restoration were not extended or changed.

## Verification

```sh
node --test tests/*.test.cjs
ATLAS_TEST_URL=http://127.0.0.1:8891/atlas/ node tests/history-explore.browser.mjs
```

The browser suite uses the existing CDP harness (`ATLAS_CDP_URL`, default port
9231). It covers 320, 390, 768, 1024 and 1440px layouts, a real country click,
1942 context, arbitrary-year entry, sparse and deep-time records, region filters,
century steps across BC/AD, replay, flat-map recentering, country events/people,
comparison-side dates, expandable-list focus, topic journeys and short viewports.
It blocks external requests and saves desktop/mobile screenshots in the system
temporary directory.

Existing UI, UX, context, slider, search and discovery browser suites also passed,
including keyboard navigation, direct links, remembered dates, touch gestures,
source links, retries and comparison. Production output was built successfully
with the CI-pinned **Hugo 0.110.0**. The installed Hugo 0.162.1 remains incompatible
with the existing configuration/theme; that is outside this UX change.

Remaining limits: introductions and geographic matches are only as broad as the
existing records and approximate geometry. They do not constitute a complete
global history. Responsive checks emulate viewports and touch; physical-device
and screen-reader testing remain outstanding.
