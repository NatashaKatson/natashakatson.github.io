# History All Around discovery

The implementation is local to `static/historyallaround/atlas/`. It adds no runtime dependencies and does not change the historical border datasets. The original D3 projection, canvas, timeline, filters, globe, and ledger remain in use. Integration hooks in `index.html` delegate to `discovery.js`; pure date/coverage/distance/association helpers live in `discovery-core.js`. `discovery.css` styles only the new controls and panels, plus the timeline space they require.

## Browser access and timeline context

The header's **Search** button opens the same local search as `/` or Ctrl/Cmd+K,
including on touch devices. Country destinations come from all 241 entries in
the detailed Natural Earth map. `scripts/build-history-countries.py` generates
`search-countries.js` with interior points on each country's largest land
component; `--check` verifies the generated file is current. Browser regressions
check every point against D3's actual polygon containment.

Selecting an event reveals its reader within the desktop sidebar and moves
keyboard focus to the reader. Closing an event opened from the list restores
the list position and focused row. The original timeline scale and controls
remain in use.

Older multi-year historical and archaeological periods appear separately under
**Historical context**. Selected cards explain the range; meanwhile cards label
contextual records. Indigenous milestones use the same date rules as other
events: the Cherokee constitution is dated 1839, the Saami Council founding
1956, and the Musqueam movement approximately AD 500. These entries no longer
extend to 2026, so none appears as context for 1992. The source review documents
which archaeological ranges retain meaningful uncertainty or period coverage.

The optional support-button script is deferred so a slow or blocked request
cannot delay atlas initialization. The deployment workflow runs unit tests,
generated-country checks, and every browser regression serially before a main
branch deployment. Pull requests run the same validation without deployment.

Additional validation: `node --test tests/history-ui.test.cjs` and
`node tests/history-ui.browser.mjs`, using the browser/server environment below.

### Sidebar scope and reading order

The sidebar starts with the selected record, then worldwide events near the
selected year, historical context whose recorded intervals overlap that window,
people alive that year, and a contemporary pair. The worldwide list is filtered
by time and event categories; selecting a country does not turn it into a local
list. In comparison mode, the list identifies the right-hand year, while a
selected record identifies which map it came from.

**Location history** is a separate timeline for an exact point across all recorded
periods, with nearby event markers within 50 km. Its rows change the map year;
source qualifications live in a disclosure. Loading preserves the source
disclosure and keyboard focus. Selecting another location closes the previous
local timeline. Scrubbing and playback clear obsolete selected-record details.

**Explore other times** groups optional facts, dinosaur browsing, comparison
stories, and the daily challenge below the current-period content. Curated
discoveries stay last even while a story is open. Other-record suggestions in a
selected reader are collapsed until requested. Two-place stories stack within
the sidebar on desktop as well as phones.

`node tests/history-sidebar.browser.mjs` checks relevance, date changes, BC/AD
ages, comparison labels, local loading/navigation, keyboard focus, and widths
from 320 to 1440 pixels. It uses the standalone prototype by default; rebuild
with `node prototypes/atlas-ui/build-preview.cjs` first. The usual `ATLAS_CDP_URL`
and `ATLAS_TEST_URL` overrides also work. Screenshots go to the OS temporary
directory. This is interaction and layout verification, not a full accessibility
conformance audit.

## Medicine, vaccination and pandemic history

The atlas includes 34 additional sourced events: 11 vaccine milestones, 14 medical
inventions and treatment milestones, eight pandemic onset/recognition or wave
records, and the 1980 smallpox eradication declaration. Search **vaccines**,
**medical inventions**, **pandemics**, or a disease/invention name, then choose
**Events** to focus the results. Medical advances appear under
**Science & exploration** and pandemic records under **People & nature**. Existing plague
and COVID emergency records remain available.

Dates distinguish development, publication, successful treatment, trial results,
licensure and recommendations. Pandemic wave intervals are summaries, not proof
that a pathogen disappeared. Cholera onset and AIDS recognition are single-year
milestones, with no invented end date. Descriptions explain representative map
locations, including regulatory or announcement locations and uncertain origins.

Records are appended to `EVENTS` to preserve existing shared IDs. Optional field
14 supplies generic search aliases, separately from field 13's Indigenous
context. Events are read directly by search; the place and state indexes need no
regeneration. Source checks are recorded in `history-event-corrections.json` and
the generated accuracy inventory. Validate with `node --test
tests/history-medicine.test.cjs tests/history-accuracy.test.cjs
tests/history-discovery.test.cjs tests/history-challenge.test.cjs`.

## Curated discoveries and focused depth

**Curated discoveries** introduces an authored Cleopatra tour with five stops:
Alexandria, Chang’an, Meroë, Monte Albán and Rome. Each stop focuses the existing
map on its coordinate and year, with source links, Previous/Next and direct stop
buttons. Dated events and broader period snapshots are explicitly distinguished;
50 BC is a viewing date for the context stops, not a precise date for their entire
description. Moving the timeline keeps the reader open and offers a return to the
stop's year. Back restores the earlier camera, selection, filters and comparison.
The active reader stays at the bottom of the sidebar while following a tour.

The period also has eight additional sourced event/period records and two people,
available to the ordinary map, ledger and search. This concentrates depth around
one discovery instead of filling every year with loosely dated events. Long
archaeological periods retain their ranges and approximate-date flags. Existing
record arrays are appended to preserve their earlier IDs. No border or place
search index needs regeneration for these additions.

Authored tours live in `curated-discoveries.js`. Each needs a permanent ID, an
introduction, a dated scope, source links, and permanent stop IDs with a coordinate,
map year, `event`/`context` kind and independently sourced text. Keep map years
inside the tour's scope. Optional `contemporaries` source keys select a featured
pair. Existing shared URLs retain the tour and stop by ID; unknown IDs open the
ordinary saved map. A short link, `atlas/#discover=cleopatra-world`, opens the tour
directly and is used on the landing page.

## Same-year comparisons

**Meanwhile, elsewhere** compares the same everyday need across countries:
1961 diaper care (a US disposable option / Soviet cloth and gauze) and menstrual
care around 1980 (US packaged disposable pads / Soviet cloth and cotton wool).
Both places stay visible together, with separate sources, evidence dates and map
buttons. The diaper comparison distinguishes the 1961 brand launch from the
invention of disposables, and uses a Soviet 1959 manual as period evidence rather
than claiming a precise survey of 1961. A later note documents Soviet diaper
production by January 1986 without inventing a first import or brand launch date.
The menstrual comparison uses 1980 as a viewing year, explicitly labels its broader
period and identifies the geographical limits of the interview evidence.

These use existing curated stop IDs, URL sharing, reload and Back restoration.
Moving the timeline leaves the comparison's authored year visible and offers a
return to that year. On narrow screens the articles stack. Original local SVG
illustrations are labeled; they do not represent archival photographs. Map
captions distinguish product test markets, publication cities and museum locations
from the extent of a nationwide practice.

Add future comparisons with `format: "same-year"`, a common `topic`, two stops
in a single viewing year, independently sourced claims, `evidenceLabel`, image
descriptions and map captions. Period evidence must state its actual dates; avoid
turning a documented routine into a claim that everyone used the same method.

Validation: `node --test tests/history-discovery.test.cjs` and
`node tests/history-meanwhile.browser.mjs` using the isolated browser setup below.

## Contemporaries across cultures

**They were alive together** appears prominently above the ordinary ledger. It
shows two people from different Atlas regions whose recorded lifespans include
the displayed year, with aligned lifespan bars, highlighted overlap and individual
source links. Approximate lifespans and overlaps are labeled. These are associated
map locations, not verified whereabouts or evidence the people met.

Selecting either person preserves the year and pair. **Share this view** retains
the exact pair in the view link, including after reload; Back restores it as well.
Without a chosen pair, the card prefers the selected person or the tour's anchor,
then exact lifespan records and longer overlaps. Years without a supported pair
show an empty state with examples instead of inventing contemporaries. Examples
include Shakespeare/Tokugawa Ieyasu, Newton/Kangxi and Cleopatra/Emperor Yuan of Han.
In comparison mode this card explicitly follows the right-hand year.

The landing-page link `atlas/#people=1610&person=William_Shakespeare` opens a
person in a year within their lifetime. Invalid person/year combinations are
ignored. No external API, extra runtime dataset or account is required.

## Uncertainty on the map

Historical boundary strokes are dashed, with a short **Approximate
historical borders** disclosure on the map and full context under **Layers**. It explains simplified
reconstructions, fluid/disputed frontiers, claims versus effective control, and
coverage gaps. It also explicitly states that the source has no confidence score
for individual boundaries. This is one visual convention for all historical
coverage; it does not assign invented certainty to particular regions or periods.
Today and Off hide the disclosure. Failed or missing historical coverage changes
its visible label, including partial comparison coverage.

Territory details label dates as mapped coverage and repeat the reconstruction
context. Event/person hover labels include dates and approximation markers;
approximate events also identify that status in their details.

Run the added browser coverage with the same server and isolated Chrome setup
described below:

```sh
node tests/history-curated.browser.mjs
```

It verifies the five tour stops, sources, focus, Back, exact-view reload, pinned
contemporary pairs, landing-page links, same-year navigation, sparse-year states,
dashed boundary strokes, missing coverage and the 390px mobile layout. Screenshots
are written to the OS temporary directory. Pure date, pair, source and data checks
remain in `tests/history-discovery.test.cjs`.

## Dinosaurs and deep time

Use **Choose era → Dinosaurs · On/Off** to include
or exclude deep time. Off removes dinosaur eras, ticks, fossil entries and avatars
from the timeline/map and restores the 300,000 BC–2026 human-history scale. If the
selected year is in deep time, Off returns to the last human-history year (2026 on
a fresh direct dinosaur visit). The setting is retained by exact-view links and
Back. An explicit dinosaur search result, era jump or deep-date entry enables the
range again. Play respects the current enabled range.
Off also hides the dinosaur browser, exploration shortcuts and dinosaur choices
in the era picker. The Choose era toggle remains available to restore them.

Choose **More → Explore dinosaurs**, use **Choose era → Explore dinosaur
eras**, select an era, or open **Dinosaurs** in the
sidebar, or visit `atlas/#dinosaurs`. Eight sourced records include Herrerasaurus,
Stegosaurus, Diplodocus, Iguanodon bernissartensis, Spinosaurus, Velociraptor,
Tyrannosaurus rex and Triceratops. Triassic/Jurassic/Cretaceous buttons focus
representative records; the scrollable list opens any dinosaur. A specific short
link such as `atlas/#dinosaur=Velociraptor` is also supported.

The shared timeline now extends from 252 million years ago to 2026, with more
space retained for human history. Deep-time dates display in millions of years
and accept `150 Ma`, `93.5 mya`, or `67 million years ago`. Previous/Next move a
million years in deep time; the fossil display window is ±1 million years around
the selected date and recorded intervals. The ordinary historical window remains
±2 years. Non-avian dinosaur records stop at the 66-million-year boundary. The
timeline's earliest section has no claim of complete fossil coverage.

Species-specific illustrated avatars mark representative fossil regions at
reconstructed ancient coordinates. Their large click/tap targets are separated with a short leader line
to the marked region. Matching artwork appears in the dinosaur list and details.
These are AI-generated reconstructions, with speculative appearance and colours,
as labeled in the interface; they are not fossil evidence. The built-in imagegen
tool produced eight transparent illustrations, packaged as 512px WebP assets
under `atlas/images/dinosaurs/` (about 590 KB total). Exact prompts and provenance
are recorded in `atlas/images/dinosaurs/prompts.json`. Images are loaded on demand
or through lazy thumbnails and remain clickable with a text fallback if unavailable.
The **Ancient continents** map note remains visible whenever either comparison
side uses deep time and labels each snapshot's age. The map uses locally bundled
GPlates PALEOMAP reconstructions, with 34 snapshots spanning 1–252 Ma at intervals
of at most 10 Ma, plus additional dinosaur destination dates. Land and fossil
coordinates share the nearest snapshot; era jumps, search and selection focus the
reconstructed point. Each comparison side chooses its own land and points.
Modern political borders, country hover targets and modern ocean names are hidden
in deep time, even when the border setting is Today. Returning to human history
restores the ordinary geography and border setting. Every snapshot includes a
bundled overview so scrubbing, slow downloads and failed downloads keep matching
land visible. Detailed coastlines load after the displayed snapshot ages settle
for 150 ms. Rapid dragging cancels scheduled requests for intermediate ages;
comparison sides settle together. Loading or failed detail requests retain the
overview, with an explicit retry after failures.
Continental outlines are approximate and do not resolve local shorelines, inland
seas or sea levels. Sources and regeneration instructions are in
`atlas/paleogeography/README.md` and `scripts/build-history-paleogeography.py`.
Source links distinguish age/taxon
information from location evidence; all ages are approximate and the location
is neither a precise quarry nor the dinosaur's full geographic range. Genus age
ranges should not be interpreted as dating every specimen at the marked location.
The map's historical political borders have no coverage at these ages.

Search has a Dinosaurs filter and supports `T. rex`. Search or era jumps enable
the dinosaur category, retain Back navigation and use the existing exact-view
sharing format. No dinosaur records are added to the daily chronology challenge:
their approximate dates exclude them from that question's exact-date pool.
No geocoding service or search-index regeneration is needed; the avatar assets are
served from the same static site.

Additional validation:

```sh
node --test tests/history-dinosaurs.test.cjs
node --test tests/history-paleogeography.test.cjs
node tests/history-dinosaurs.browser.mjs
node tests/history-slider.browser.mjs
```

These cover deep-date parsing/formatting and timeline inversion, source fields,
category/search navigation, nearby marker hit targets, real map clicks, Back,
sharing, comparison, era toggle persistence, timeline removal/restoration, avatar
loading, the 390px mobile layout and direct links.
Slider regressions also cover cold dates, real pointer dragging in both directions
at desktop/mobile widths, delayed and failed detail downloads, retry, the boundary
between deep time and human history, and independent comparison maps. They check
visible canvas land as well as geometry, with detailed map requests intercepted.

## Compact atlas workspace

`atlas-ui.js` and `atlas-ui.css` organize existing controls without duplicating
their state. The date is a compact editable readout; deep time displays rounded,
approximate millions of years, while editing and sharing retain the exact year.
**Layers** holds borders and their source disclosure. **Choose era** holds
dinosaur visibility and era destinations.
**Filters** shows human categories, fossils, or both for mixed comparisons, with
an active-category count. Hidden categories retain their settings.

Playback, the responsive ruler, **Choose era**, and the era/record summary share
one bottom dock. **More** opens an expandable panel with comparison, sharing,
dinosaur navigation and population estimates/sources. Population estimates and
human discovery cards are hidden during exclusively deep-time views. The fossil
geography caveat stays on the map with an expandable explanation; historical
views retain a short border-uncertainty disclosure. Coverage warnings for human
history remain below the ruler. Menus close on outside interaction or Escape;
Escape returns focus to the trigger. On phones, the dock's panels expand upward
and the ruler uses fewer ticks. Guidance disappears after interacting with the
map or after seven seconds.

## Compare years

Choose **Compare**, enter the left and right years, and apply. BC/BCE, AD/CE, and signed years use the existing parser; year zero is rejected. The existing global timeline drives the right year. Both sides share the same geographic projection, pan, rotation and zoom. The divider supports pointer/touch dragging, arrow keys, Home and End. Clicked territories and people use the year of the clicked side. Clicking a left-side event does not replace the right-side year.

Optional changed-record outlines compare source geometry and political membership by polity name. They are **not** geometric gain/loss polygons, an assessment of significance, or proof of effective control. No comparison is highlighted unless both requested historical files are available. Existing border-layer choices remain available; **Today** is explicitly a modern overlay.

Historical border coverage is 3400 BCE–2024, subject to missing regions and periods. Missing or failed historical loads leave the base coastline with an unavailable/loading message. They do not draw the previous year's borders, freeze the last available year, or fall back to today's borders. Modern borders remain accessible through the explicit Today control. The underlying coastline basemap is still Natural Earth, not a reconstruction of ancient coastlines.

## History of a place

Click a map location, or open an event/person/territory, and choose **Explore this place's history**. The coordinate is retained independently of changing political boundaries. The scrollable panel contains:

- Cliopatria feature coverage at that coordinate, intersected with each file's 25-year storage window and the feature's own validity interval. Adjacent records with the same name, relationship and source are merged; gaps remain gaps.
- Existing events whose recorded marker is within 50 km. This is geographic proximity, not evidence that an event affected every location in that radius.

Twenty entries appear initially; Show more adds twenty. Dates and records are source-derived, and coverage can overlap. Jumping to a period focuses the original coordinate. Return restores the original year, camera, selection, map mode, border layer, comparison and category filters.

The scan is on demand, progressive and limited to two concurrent requests. It can read the full border archive (about 14 MB uncompressed across 217 files); decoded feature caching stays bounded. Returning or selecting a new place cancels remaining work for the previous scan. Back resumes an interrupted scan from its completed files. Failed files are explicitly reported as incomplete coverage. No scan runs during ordinary map browsing.

The dataset does not systematically distinguish claims from control, contain Indigenous territories, or provide historical place names, settlement records, and cultural histories. The panel explains those limitations. Missing entries never mean a place was uninhabited. Adding these dimensions requires dated, licensed, appropriately attributed sources, ideally developed with relevant communities.

## Connections

Up to four cards appear under **Follow the story** when supported links exist. There are two kinds of discovery:

- Explicit, source-backed links between existing records: Oregon Treaty ↔ Pig War, and the Russian ukase ↔ Alaska boundary case. The latter is a documentary association, not a claim of direct causation.
- Clearly labeled shared-source or same-location associations. The latter requires markers within 2 km and explicitly says it is not a causal link. A shared source article likewise does not assert causality.

No thematic or causal links are inferred from category, nationality, temporal proximity, or modern borders. Each card has a source link. Navigation focuses the record's coordinate and year. Back restores up to thirty exploration steps, including camera, selection, filters and comparison state. A place panel is retained in the trail when navigating away from it.

When no supported link exists, **Explore nearby history** offers up to four sourced
records with markers within 250 km, ordered by distance and labeled with that
distance. These can come from different periods; the card explicitly distinguishes
geographic proximity from a historical connection. If there are no nearby markers,
**Explore the same period** offers records whose displayed event start or birth dates
fall within 2 years of the viewed year. Territory cards
also use the viewed year for period suggestions, without interpreting a territory's
centroid as a historical place. Context suggestions use the same navigation and
Back behavior as story cards. If neither kind of context is available, the section
is omitted.

Sources for the explicit links:

- [Washington State Archives: Pig War](https://www.sos.wa.gov/archives/explore-our-collection/national-history-day-topic-guide/pig-war-pig-and-international-boundary-dispute), documenting the unresolved Oregon Treaty boundary and the later incident.
- [Library of Congress: Alaskan boundary tribunal case and appendix](https://www.loc.gov/item/04004083/), listing Russian ukases among the documentary material for the boundary case.

## Validation

Run pure regression and inline-script syntax checks from the repository root:

```sh
node --test tests/history-discovery.test.cjs
```

Browser regressions use Node 22's built-in WebSocket client and an isolated headless Chrome debugging session; no npm install is needed. Start a static server and a **dedicated test browser profile** (the script creates and closes its own test page):

```sh
python3 -m http.server 8891 --bind 127.0.0.1 --directory static/historyallaround
# In a second terminal, launch your Chrome binary with:
# --headless --remote-debugging-port=9231 --user-data-dir=/tmp/history-discovery-qa about:blank
node tests/history-discovery.browser.mjs
```

`ATLAS_CDP_URL` and `ATLAS_TEST_URL` override the defaults. The script checks comparison years, border validity, data gaps, keyboard divider controls, place history, return navigation, supported/empty story cards, multi-step Back, corresponding-year info panels, mobile overflow, real touch divider movement, map panning and pinch zoom. It reports median synchronous render times and writes a mobile screenshot to the OS temporary directory. This is emulated mobile testing, not physical-device coverage.

Build with the CI version, **Hugo 0.110.0**, using `hugo --minify`. The locally installed Hugo 0.162.1 cannot build the existing configuration/theme; these unrelated migration issues were not changed.

## Most valuable next work

1. Precompute a compact spatial/temporal coverage index to avoid scanning every border file for each place. Keep the original source geometries authoritative.
2. Add community-reviewed Indigenous presence, settlement and place-name histories with explicit validity dates, provenance, uncertainty and distinctions between claims and control.
3. Grow the curated story graph with stable entity IDs, typed relationships and citation-level evidence. Existing array-index record IDs should not be used in a long-lived public graph.
4. Extend exact-view sharing with exported image cards and saved multi-step trails, followed by physical-device and network-throttling checks.

## Meanwhile, comparison stories, and sharing

Event details now show up to three **Meanwhile…** cards from other regions whose
recorded date ranges include the selected year. Each region appears at most once;
there is no adjacent-year fallback or invented connection when records are sparse.
Cards keep their source links and approximate-date labels. Following a card pins
the starting event with a return button; the exploration trail restores the earlier
view. Cards can reveal a category hidden by filters and enable that category when
followed.

**Three stories to explore**, above the regional ledger, opens sourced comparisons:
1789/1846 (Nootka and Oregon), 1846/1859 (Oregon Treaty and Pig War), and 1821/1903
(Russian claims and the Alaska boundary documents). Explanations appear only while
the story's two years are displayed. They describe selected records, not calculated
territorial gains or a complete history of Indigenous sovereignty.

**Share this view** pauses playback and copies a versioned URL, with a selectable
link if clipboard access is unavailable. It encodes both years, divider, outlines,
map mode, rotation, zoom, relative flat-map pan, category filters, selected event or
person (source key plus date), selected polity name/year, pinned event, location
coordinate, and comparison story. Opening the link restores that state. Coordinates
restore a location action; the full place-history scan is still on demand. Saved
trails and downloaded border data are not embedded. Camera framing adapts to the
recipient's viewport. Old links such as `#1903` and `#500bc` continue to work.
Malformed or unsupported view payloads are ignored. There is no account or backend.

Release verification: all 10 pure/syntax regression tests and the browser suite passed, including exact-view reload, territory sharing, copyable-link UI, three comparisons, pinned return, and emulated mobile/touch checks. The production build passed with Hugo 0.110.0; the newer installed Hugo retains the previously documented configuration/theme incompatibility.

## Search across history

Press `/` outside a text field, or use Cmd/Ctrl+K to open search. Type at least
two characters. All / Events / People / States & empires /
Places filters narrow results. Names and aliases rank above description mentions;
matching ignores case, accents and punctuation. All limits each type to six results
so common city names leave room for historical records; a specific type shows up
to sixteen results. Arrow keys move between the input and result buttons, Enter
opens a result, and Escape closes the native modal dialog.

- Events open their start year and enable their category when hidden.
- People open their birth year, with their recorded lifespan shown in results.
- Historical states show **mapped coverage**, not definitive founding/dissolution
  dates. Each result opens a verified available snapshot with the greatest area
  among its source segments. Gaps and different political memberships remain
  distinct. Border-load failures keep the current view and offer another attempt.
- Modern countries/territories and GeoNames cities/populated places focus a marked
  coordinate while retaining the selected year. Results include present-day region
  and country labels to distinguish duplicate city names. They do not assert that
  a settlement or its current name existed in the selected historical year.

Search jumps leave comparison mode, add the previous state to the exploration trail,
and cancel an in-progress place scan. Changing the query or closing search cancels
pending navigation. A modern place's label, source ID and point persist in exact-view
links and Back. Exploring its full location history remains an explicit action.

There are no geocoding requests or API keys. Events, people and country labels reuse
existing data. `search-states.json` (2,100 coverage periods, about 157 KB) and
`search-places.json` (34,179 populated places, about 7 MB before HTTP compression)
load once on opening search. Initial map loading does not request these indexes.
Local records remain usable during loading or after failure; retry loads missing
indexes. This is not a complete index of every historic place or person.

### Search data and regeneration

Quebec and French Canada have a sourced St. Lawrence period overview (1608–1763)
and eight events: Quebec's establishment, Ville-Marie/Montréal, the Great Peace,
the Plains of Abraham, the Treaty of Paris, the Quebec Act, Confederation, and the
Charter of the French Language. The overview distinguishes its broad chronology
from uninterrupted French control. These records appear in the map, ledger,
nearby history and event search. Sources are linked in each record.

State search accepts **Nouvelle-France** and **French Canada** for New France.
For equally ranked records with the same name, longer mapped coverage sorts
first: New France opens its 1757 Canadian snapshot rather than the short early
segment whose source anchor is in Brazil. Existing coverage dates and source
geometry remain unchanged. Smaller territories can receive map labels at regional
zoom, and the selected territory receives the first label slot. Collision checks
still apply. `tests/history-search.browser.mjs` covers the Canadian geometry,
aliases, event navigation and desktop/mobile label visibility.

Historical coverage derives from the checked-in Cliopatria/Seshat snapshots under
CC BY 4.0. Coordinates, names, distinct alternate spellings, and region
labels for populated places derive from GeoNames's
[cities15000.zip](https://download.geonames.org/export/dump/cities15000.zip) and
[admin1CodesASCII.txt](https://download.geonames.org/export/dump/admin1CodesASCII.txt),
imported October 22, 2026. GeoNames licenses this data under
[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/), as stated in its
[readme](https://download.geonames.org/export/dump/readme.txt). The derived index
rounds coordinates to four decimals, omits unused fields, deduplicates spellings,
and excludes URL/template artifacts and names longer than 80 characters. Aliases
are retained across scripts, including native names and common exonyms; GeoNames's
alphabetical ordering does not determine which aliases are searchable.
Natural Earth country labels are public domain.
Attribution appears in the search dialog, selected-place source links, and footer.

Regenerate historical search data from the checked-in archive:

```sh
python3 scripts/build-history-search.py
```

Historical search destinations use interior points on the largest land component
of the chosen snapshot, with holes and antimeridian crossings accounted for.
Source label coordinates and border geometry remain unchanged. The regression
suite checks every generated point against the actual D3 geometry.

To refresh cities too, download the two GeoNames files and provide their local paths:

```sh
python3 scripts/build-history-search.py --cities-zip /tmp/cities15000.zip --admin1-file /tmp/admin1CodesASCII.txt
```

Commit the derived JSON files with any dataset changes; builds require no network
or regeneration step. Source downloads change over time, so a refresh can alter
counts, names and coordinates. Run the pure checks above and the search browser suite:

```sh
node tests/history-search.browser.mjs
```

The search suite verifies lazy loading, aliases/accents, dated state navigation,
person/event jumps, category visibility, Back, duplicate place names, shared places,
keyboard controls, empty results, safe text, canceled navigation, failed download
recovery, focus retention during index loading, and the 390px mobile layout.
On mobile, the timeline stays below the map so border, category and zoom controls
remain reachable. The pure checks validate that every indexed
historical target matches an available snapshot and its political membership.

The desktop workspace reserves most of the viewport height for the map, with a
compact playback/Compare/Share row and inline population estimates below it. The
history ledger scrolls independently, and credits follow the workspace. Expanding
comparison options or population sources adds space below the map without reducing
its height. Phones use a map area of 72% of the stable viewport height.

## Daily history challenge

The sidebar's **Daily history challenge** opens a set of three questions generated
from the existing Atlas records. The set is deterministic for the browser's local
calendar date, with no service, account, API key, or extra dataset download:

- **Put history in order:** arrange three events by their recorded start dates.
  Earlier/later buttons work with a keyboard and touch. Dates appear after checking.
  Candidates exclude approximate dates and are at least twenty years apart.
- **Find this place:** guess the existing marker of one event from a bounded pool
  of landmark/location records. The neutral flat map hides event and person markers.
  Pan/zoom and click/tap to guess; dragging or pinching does not submit. A coordinate
  form provides an alternative to pointing. Guesses within 500 km count as correct;
  the answer includes the great-circle distance. This judges a recorded point, not
  the full geographic extent of an event. Invalid latitude/longitude is rejected.
- **Alive at the same time?:** choose between three pairs. Exactly one pair has a
  recorded lifespan overlap of at least twenty years, and the distractors have gaps
  of at least twenty years. Approximate lifespan records are excluded. Correct
  pairs come from different regions. Map links open a year in the shared lifespan;
  associated person markers do not establish whereabouts in that year or a meeting.

Each answer has original-record source links and **Show … on map** buttons. A map
banner returns to the answer, and ordinary exploration Back returns to the earlier
Atlas view. Geographic reveals draw a dashed circle for the guess and a connection
to the answer marker. The normal selection ring marks the actual event. Hiding the
banner removes these extra drawing marks.

Map guessing temporarily saves the year, camera, comparison, selection, categories,
and place panel. Canceling or submitting restores this state before any answer jump.
The timeline, year form, and sidebar are inert during picking; zoom, pan, map/globe
switching, coordinate entry and cancellation remain available. Guess mode uses the
original view's share hash, so refreshing does not reopen an empty-filter puzzle
map. Starting a search-result jump also cancels guess mode cleanly.

First attempts count; **Reveal answer** records an answered question with no point.
The final score is out of three, and completed questions remain available for review.
Only the current day's answers are stored under `atlas.daily-challenge.v1` in local
storage. Day and question signatures are validated before reuse; scores are derived
again from the answers, not trusted stored score flags. Missing/corrupt storage
starts a fresh set. Storage denial/quota errors keep the current visit playable and
show that progress is temporary. Changes from another tab refresh the progress.
A new local date resets the set on interaction, visibility return, or the next
minute tick while visible. An action on a previous day's prompt does not grade a
new question accidentally.

Challenge code is isolated in `challenge-core.js` and `challenge.js`; the existing
canvas selection handler delegates taps only while a location guess is active.
The drawing hook uses the same projection, including flat-map pan and globe zoom.

Validation:

```sh
node --test tests/history-challenge.test.cjs tests/history-discovery.test.cjs
node tests/history-challenge.browser.mjs
```

The pure checks validate a year of generated sets, unique correct answers, inclusive
lifespan ranges, BC/AD handling, no year zero, deterministic ordering, source-data
eligibility, the antimeridian, malformed progress and date/signature changes. The
browser suite uses an isolated profile/page and a controlled local clock to verify
ordering, sources, map reveals, real mouse/touch guessing, drag-versus-tap behavior,
coordinate entry, cancellation/restoration, reload persistence, first-attempt
scoring, a new day, storage failure and mobile layout. It writes a mobile screenshot
to the OS temporary directory. Physical-device coverage remains outside this check.

## Fixed endpoint and world population

The Atlas intentionally ends at **2026**. `NOW` is a fixed constant, so its timeline,
year inputs, playback, hashes, search navigation and comparisons cannot extend past
2026 when a visitor's browser clock advances. The landing page states this range.
Daily challenge rotation still follows the visitor's local calendar date; that is
independent of the historical timeline's endpoint.

Opening the atlas without a date in the URL restores the last year viewed in this
browser, stored as `atlas.last-year.v1` in local storage. A first visit, invalid
stored date or unavailable storage defaults to the current supported year, 2026.
Explicit year, exact-view and discovery links take priority over the remembered
date. Timeline changes, including scrubbing and playback, save the displayed year.

The timeline's **World population** strip follows the selected year, or shows the
left and right years separately during comparison. It always represents a global
total. Rounded historical estimates are distinguished from interpolated estimates
and UN projections. Values before 10,000 BCE show **No estimate**. There is no
extrapolation or assumption that missing data means zero population.

`population.json` is a 5.7 KB local extract of the **World** series from
[Our World in Data's long-run population with projections](https://ourworldindata.org/grapher/population-long-run-with-projections),
downloaded October 22, 2026 (source update July 15, 2024). Its 264 source samples
run from 10,000 BCE through 2026. Sources, as described in the dataset's metadata:
HYDE v3.3 before 1800, Gapminder v7 for 1800–1949, and UN World Population Prospects
2024 from 1950. Years 2024–2026 are the UN medium-variant **projections**, not observed
population counts. Attribution and a methodology link appear under **Sources & method**.
OWID's [population-source article](https://ourworldindata.org/population-sources)
describes the underlying sources and their limitations.

`population.js` interpolates linearly in elapsed source years between samples.
It preserves the source's year-0 anchor internally; Atlas visitors still cannot
select year zero. Estimates before 1800 are rounded to at most two significant
digits and later values to three. This display precision does not imply exact
counts or confidence intervals. Cached render keys avoid rewriting the strip during
camera-only frames. Population download/validation errors leave the Atlas usable and
provide a retry button. No third-party request runs in the browser for population.

Regenerate the checked-in extract using downloaded OWID CSV and metadata files:

```sh
python3 scripts/build-world-population.py /tmp/population-long-run-with-projections.csv /tmp/population-long-run-with-projections.metadata.json
node --test tests/history-population.test.cjs tests/history-discovery.test.cjs tests/history-challenge.test.cjs
node tests/history-population.browser.mjs
```

The builder filters `OWID_WRL` and discards years after 2026. Source snapshots change
over time; refreshing this data is an explicit maintenance task. The browser suite
checks a simulated 2035 clock, the fixed endpoint, historical samples, interpolation,
prehistory without coverage, projection labels, comparison, mobile width and failed
population-download recovery.


Follow-up accuracy changes: Great Lakes corrections are applied on border load,
including dated splits at 1932, so location history, comparison, search and shared
selections agree with the map. The state index includes an optional `basis` field;
search descriptions and location histories retain historically sourced extent
qualifications without merging them across different periods. Northern New France
and French Louisiana are separate from the source’s other French colonial
possessions. See [the accuracy review](history-accuracy-review.md#follow-up-review-source-meaning-and-chronology)
for evidence and remaining source limitations.


## Inland water and country context

Lakes use a blue surface and thin blue shoreline, with names at regional zoom.
Known lake cutouts in historical polygons are painted as water and omitted from
country-boundary, selection and comparison-change strokes. Actual land enclaves
keep their political outlines. Country containment geometry is unchanged.

Hover or tap a lake to see its name and context for that side's selected year.
An explicitly mapped water territory says **Within mapped …**; a lake cutout says
**Surrounded by mapped …** and opens the surrounding political record beneath
the water card. This distinguishes a water surface from a coverage gap without
inferring sovereignty over shared waters. If no political record resolves the
point, the card says so. A small blue swatch in Layers explains the surface key.

Lake selections retain their point, year and surrounding record in shared views.
Changing the timeline updates water context. Comparison uses each side's year,
and water remains identifiable with borders Today or Off. Modern water is excluded
from deep-time maps. The card's Shoreline & source disclosure distinguishes a
source-map cutout from a modern reference shoreline; neither is a dated survey
of water levels. Present-day names are geographic references.

`water-data.js` is a local, rounded 457 KB extract of all 412 Natural Earth 1:50m
lake/reservoir features (public domain). Undated reservoirs are excluded from the
reference layer; they can only be recognized when a dated map record already has
a matching cutout. The smaller modern Aral fragments are grouped for matching the
larger historical Aral cutout. No country names or ownership are assigned in the
water dataset. Matching and stroke geometry are cached in `water.js`.

Regenerate from a local Natural Earth file; there is no runtime data service:

```sh
python3 -B scripts/build-history-water.py /path/to/ne_50m_lakes.geojson
node tests/history-water.browser.mjs
```

Source: [Natural Earth 1:50m lakes](https://www.naturalearthdata.com/downloads/50m-physical-vectors/50m-lakes/).
The dedicated browser suite verifies blue surfaces and labels in both projections,
Aral/Balkhash/Issyk-Kul/Baikal context, unchanged political geometry, Lesotho's
land enclave, US/Canada shared-lake sides, exact-view restoration, changing years,
comparison dates, reservoir exclusion, deep time, real touch selection and the
390px layout. Screenshots are written to the OS temporary directory as
`history-water-ui-desktop.png` and `history-water-ui-mobile.png`.


## Indigenous histories and Beringia

The atlas includes sourced Indigenous events and archaeological site markers across the Americas, Siberia, Sápmi, Japan, Africa and the Pacific. Curated discoveries provide North America, world and Beringia entry points. The Beringia research overview distinguishes dated archaeological sites from schematic proposed corridors; it does not reconstruct Ice Age shorelines or claim one established journey. Event dates describe specific milestones; archaeological intervals describe evidence or site phases, not national founding or extinction dates. See [the source review and map limits](history-indigenous-sources.md) for evidence, dates, attribution and verification.
