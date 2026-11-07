/* Small discovery affordances over the existing Atlas records and controls. */
(() => {
  const core = AtlasExploreCore;
  let region = 'world', category = 'all', country = null, countryYear = null;
  let lastYear = null, lastIntro = '', lastBrowse = '', lastNavigation = '', lastDetail = null, preview = '';
  const intro = document.createElement('details');
  intro.id = 'yearIntroduction'; intro.className = 'year-introduction'; intro.open = !matchMedia('(max-width: 860px)').matches;
  document.querySelector('.side-content').prepend(intro);
  const browse = document.createElement('div');
  browse.className = 'browse-controls';
  browse.innerHTML = `<strong class="browse-label">Filter this list</strong><div class="browse-fields"><label>Region<select id="browseRegion"><option value="world">Worldwide</option>${REGION_ORDER.map(r => `<option value="${r}">${esc(REGIONS[r])}</option>`).join('')}</select></label><label class="browse-type">Event type<select id="browseCategory"><option value="all">All visible</option>${Object.entries(CATS).map(([key, name]) => `<option value="${key}">${esc(name)}</option>`).join('')}</select></label></div><p id="browseStatus" role="status"></p><button type="button" data-reveal-category hidden></button><button type="button" data-clear-browse hidden>Clear list filters</button>`;
  intro.after(browse);
  const regionInput = document.getElementById('browseRegion');
  const categoryInput = document.getElementById('browseCategory');
  const resetBrowse = browse.querySelector('[data-clear-browse]');
  const revealCategory = browse.querySelector('[data-reveal-category]');
  const refreshBrowse = () => { lastBrowse = ''; update(); };
  regionInput.onchange = () => { region = regionInput.value; refreshBrowse(); };
  categoryInput.onchange = () => { category = categoryInput.value; refreshBrowse(); };
  resetBrowse.onclick = () => { region = 'world'; category = 'all'; regionInput.value = 'world'; categoryInput.value = 'all'; refreshBrowse(); };
  revealCategory.onclick = () => {
    if (category === 'all') return;
    state.cats.add(category); buildMarks(); refreshBrowse();
  };

  const panel = document.getElementById('eraPanel');
  panel.querySelector('h2').textContent = 'Explore years';
  const closeYears = document.createElement('button'); closeYears.type = 'button'; closeYears.className = 'era-close'; closeYears.setAttribute('aria-label','Close year chooser'); closeYears.textContent = '×';
  closeYears.onclick = () => document.getElementById('timelineScope').click(); panel.prepend(closeYears);
  const exactYear = document.createElement('form'); exactYear.className = 'explore-exact-year';
  exactYear.innerHTML = '<label for="exploreYearInput">Enter a year</label><div><input id="exploreYearInput" autocomplete="off" spellcheck="false" placeholder="2024, 500 BC or 150 Ma"><button type="submit">Go</button></div>';
  panel.querySelector('h2').after(exactYear);
  exactYear.onsubmit = event => {
    event.preventDefault(); const input = document.getElementById('exploreYearInput'), year = parseYear(input.value);
    if (year === null) { input.setCustomValidity('Enter a year from 252 Ma to 2026. There is no year zero.'); input.reportValidity(); return; }
    input.setCustomValidity(''); document.getElementById('timelineScope').click(); stopPlay(); setYear(year); AtlasUI.goToMap();
  };
  exactYear.querySelector('input').oninput = event => event.target.setCustomValidity('');
  const suggested = document.createElement('section');
  suggested.className = 'suggested-years';
  suggested.innerHTML = '<h3>Start with a moment</h3><p>Choose a year, then discover what else was happening.</p>';
  for (const year of [-50, 1300, 1492, 1789, 1928, 1942, 1969]) {
    const scene = core.context(ev, year), lead = scene.records[0];
    if (!lead) continue;
    const button = document.createElement('button'); button.type = 'button'; button.dataset.suggestedYear = year;
    button.innerHTML = `<b>${esc(fmt(year))}</b><span>${esc(lead.title)}</span>`;
    button.onclick = () => {
      document.getElementById('timelineScope').click();
      stopPlay(); setYear(year); AtlasUI.goToEvents();
      document.getElementById('side').scrollTop = 0; intro.focus({ preventScroll: true });
    };
    suggested.append(button);
  }
  const eraHeading = document.createElement('h3'); eraHeading.textContent = 'Jump to an era'; suggested.append(eraHeading);
  exactYear.after(suggested);
  const stepChoice = document.createElement('label');
  stepChoice.className = 'year-step-choice';
  stepChoice.innerHTML = 'Year arrows move by <select id="yearStep"><option value="1">1 year</option><option value="10">10 years</option><option value="100">100 years</option><option value="1000">1,000 years</option></select><small>Deep time always steps by 1 million years. You can enter any year directly.</small>';
  panel.append(stepChoice);
  document.getElementById('yearStep').onchange = () => update();
  document.getElementById('gotoInput').title = 'Enter any year, for example 1942, 500 BC or 150 Ma';
  document.querySelector('.timeline-help summary').textContent = 'How time moves';
  document.querySelector('.timeline-help p').textContent = 'Play moves forward along the timeline; a full sweep takes about 30 seconds. Recent history has more space, so years pass at different speeds. At 2026, Replay starts from the beginning. The buttons beside Play jump to the previous or next recorded event in the visible categories (Shift + arrow). The arrows beside the year step by 1 year, or by your choice under Explore years; deep time steps by 1 million years. Explore years also offers suggested moments and era jumps. Enter any year in the date field. There is no year zero.';

  const help = document.createElement('details'); help.className = 'atlas-quick-help';
  help.innerHTML = '<summary>New to the atlas?</summary><p>Choose a year or try <button type="button" data-help-years>a suggested moment</button>. Select an event to find its marker, or select a country to see records in its mapped area.</p><p>Drag to move; scroll or pinch to zoom. <strong>Globe</strong> rotates the Earth; <strong>Map</strong> shows a flat view. In Map settings, <strong>Historical</strong> shows approximate dated coverage, <strong>Today</strong> uses present-day geography, and <strong>Off</strong> hides borders. Modern outlines are a reference, not historical sovereignty.</p><p>People’s markers locate associated places, not their whereabouts in the selected year. Journeys offers short paths through existing records.</p>';
  document.getElementById('mapContext').append(help);
  new ResizeObserver(() => help.style.setProperty('--atlas-help-height', `${Math.max(60, stage.clientHeight - 90)}px`)).observe(stage);
  help.querySelector('[data-help-years]').onclick = () => { help.open = false; document.getElementById('timelineScope').click(); };
  help.addEventListener('toggle', () => {
    if (help.open) document.querySelector('.historical-map-note').open = false;
  });

  // Topic paths use dated, sourced records already in the Atlas. Sampling is
  // chronological; it makes no claim that each stop caused the following one.
  const journey = document.createElement('section'); journey.className = 'topic-journeys';
  journey.innerHTML = '<h3>Guided journeys</h3><p>Five stops through a topic. Choose a journey to begin.</p><div class="topic-choices"></div><div class="topic-reader" hidden></div>';
  const topics = document.getElementById('journeyTopics');
  topics.before(journey);
  const collectionHeading = document.createElement('h3'); collectionHeading.className = 'collection-heading'; collectionHeading.textContent = 'Browse collections';
  topics.before(collectionHeading);
  const journeyStatus = document.createElement('p'); journeyStatus.className = 'sr-only'; journeyStatus.setAttribute('role', 'status');
  journey.append(journeyStatus);
  let route = [], stop = 0, routeTitle = '';
  function showStop(direction = 'next') {
    const record = route[stop];
    if (!record) return;
    stopPlay();
    if (!state.cats.has(record.cat)) { state.cats.add(record.cat); buildMarks(); }
    setYear(record.start); select(record.id);
    const reader = journey.querySelector('.topic-reader'); reader.hidden = false;
    reader.innerHTML = `<h4 tabindex="-1">${esc(routeTitle)} · stop ${stop + 1} of ${route.length}</h4><p><strong>${esc(fmt(record.start))}</strong> · ${esc(record.title)}</p><div><button type="button" data-route-prev ${stop === 0 ? 'disabled' : ''}>← Previous stop</button><button type="button" data-route-map>Read &amp; locate →</button><button type="button" data-route-next ${stop === route.length - 1 ? 'disabled' : ''}>Next stop →</button></div>`;
    reader.querySelector('[data-route-prev]').onclick = () => { stop--; showStop('prev'); };
    reader.querySelector('[data-route-next]').onclick = () => { stop++; showStop('next'); };
    reader.querySelector('[data-route-map]').onclick = () => select(record.id);
    document.querySelector('button[data-workspace="journeys"]').click();
    journeyStatus.textContent = `${routeTitle}, stop ${stop + 1} of ${route.length}: ${fmt(record.start)}, ${record.title}`;
    const activeButton = reader.querySelector(`[data-route-${direction}]`);
    const focusTarget = activeButton.disabled ? reader.querySelector('h4') : activeButton;
    focusTarget.focus({ preventScroll: true });
    reader.scrollIntoView({ block: 'nearest', behavior: 'instant' });
  }
  for (const cat of ['technology', 'ideas', 'womens-rights']) {
    const records = core.journey(ev, cat);
    if (records.length < 2) continue;
    const button = document.createElement('button'); button.type = 'button'; button.dataset.topicJourney = cat;
    button.innerHTML = `<span><strong>${esc(CATS[cat])}</strong><small>${records.length} stops · Start journey</small></span><span aria-hidden="true">→</span>`;
    button.onclick = () => { route = records; routeTitle = CATS[cat]; stop = 0; showStop(); };
    journey.querySelector('.topic-choices').append(button);
  }

  function recordLink(record, year) {
    const isPerson = record.kind === 'person';
    return `<button type="button" class="area-record" data-id="${esc(record.id)}" data-record-year="${year}"><strong>${esc(isPerson ? record.name : record.title)}</strong><small>${esc(isPerson ? record.role : fmtEvent(record))}</small></button>`;
  }
  function boundedRecords(records, year) {
    return records.slice(0, 4).map(r => recordLink(r, year)).join('') + (records.length > 4
      ? `<details class="more-records"><summary>Show ${records.length - 4} more</summary>${records.slice(4).map(r => recordLink(r, year)).join('')}</details>` : '');
  }
  function detail() {
    if (state.sel || selectedPolity || (country && (!HistoryDiscovery.displayedYears().includes(countryYear) || state.borders !== 'today'))) country = null;
    const container = document.getElementById('detail');
    if (country) {
      container.innerHTML = `<div class="detail modern-geography"><button type="button" class="iconbtn close" aria-label="Close">×</button><div class="kicker">Present-day geography · exploring ${esc(fmt(countryYear))}</div><h3>${esc(country.properties.name)}</h3><p>Today’s outline is a geographic reference. It does not establish this country’s borders or sovereignty in ${esc(fmt(countryYear))}.</p><a href="https://www.naturalearthdata.com/" target="_blank" rel="noopener">Natural Earth source ↗</a></div>`;
      container.querySelector('.close').onclick = () => { country = null; closeSelection(); };
    }
    const feature = selectedPolity || country;
    const card = container.querySelector('.detail');
    if (!feature || !card || card.querySelector('.mapped-records')) return;
    const year = country ? countryYear : HistoryDiscovery.selectionYear();
    const inside = r => core.matches(r, 'selected', point => inBox(feature.bbox, point) && d3.geoContains(feature, point));
    const events = ev.filter(r => inside(r) && DiscoveryCore.inYear(r,year)).sort((a, b) => a.start - b.start);
    const people = ppl.filter(r => inside(r) && r.born <= year && r.died >= year);
    const section = document.createElement('section'); section.className = 'mapped-records';
    section.innerHTML = `<h4>In this mapped area · ${esc(fmt(year))}</h4><p>Matches use representative marker locations, not nationality, residency or the full extent of an event. Includes all event types.</p><h5>${events.length} event${events.length === 1 ? '' : 's'} in this year</h5>${boundedRecords(events, year) || '<p>No event markers recorded here in this year.</p>'}<h5>${people.length} ${people.length === 1 ? 'person' : 'people'} alive</h5>${boundedRecords(people, year) || '<p>No associated people recorded here for this year.</p>'}`;
    card.append(section);
  }

  function filterEvents(records) { return records.filter(({ e }) => core.matches(e, region) && (category === 'all' || e.cat === category)); }
  function filterPeople(records) { return records.filter(r => core.matches(r, region)); }
  function render() {
    const years = HistoryDiscovery.displayedYears();
    const key = years.join('/');
    if (country && (!HistoryDiscovery.displayedYears().includes(countryYear) || state.borders !== 'today' || state.sel || selectedPolity)) country = null;
    if (lastYear !== state.year) {
      lastYear = state.year;
      // A fossil-only list filter should not strand visitors after a human-era jump.
      if (category === 'dinosaurs' && state.year >= -1000000 || category !== 'all' && category !== 'dinosaurs' && state.year < -1000000) { category = 'all'; categoryInput.value = 'all'; renderSide(); }
    }
    if (lastIntro !== key) {
      lastIntro = key;
      const scene = core.context(ev, state.year), lead = scene.records[0];
      const period = scene.mode === 'period';
      const continuing = lead && !period && DiscoveryCore.isHistoricalContext(lead, state.year);
      const title = lead && !period ? (continuing ? 'Continuing: ' : '') + lead.title : scene.period?.name || 'A moment in history';
      preview = `${fmt(state.year)} — ${title}${lead && !period ? ' · ' + DiscoveryCore.summary(lead.blurb, 100) : ' · Explore the surrounding period'}`;
      const leadSummary = continuing ? `${DiscoveryCore.temporalStatus(lead,state.year)}; began ${fmt(lead.start,lead.approx)}. ${DiscoveryCore.summary(lead.blurb,240)}` : lead && DiscoveryCore.summary(lead.blurb,240);
      intro.innerHTML = `<summary><small>${years.length > 1 ? 'WORLD CONTEXT · RIGHT-HAND MAP' : 'THE WORLD IN THIS MOMENT'}</small><span>${esc(fmt(state.year))} — ${esc(title)}</span></summary><div class="year-introduction-body"><p>${period ? `Records are sparse for this exact year. Explore the wider ${esc(scene.period.name.toLowerCase())} through dated examples below; they did not necessarily happen in ${esc(fmt(state.year))}.` : esc(leadSummary)}</p>${!period && scene.records.length > 1 ? `<p class="intro-elsewhere">Elsewhere in this year: ${scene.records.slice(1).map(r => `${esc(r.title)} (${esc(REGIONS[r.region])})`).join('; ')}.</p>` : ''}${lead && !period ? `<p class="intro-source">${esc(fmtEvent(lead))}${lead.approx ? ' · approximate dates' : ''} · <a href="${esc(lead.source || wikiUrl(lead.wiki))}" target="_blank" rel="noopener">Source ↗</a></p>` : ''}<p class="intro-invitation">${period ? 'What can the surrounding period tell us?' : 'What else was happening? Explore simultaneous histories on the map.'}</p>${scene.records.length ? `<details class="intro-records"><summary>${period ? 'Explore period context' : 'Explore this moment & elsewhere'} · ${scene.records.length} records</summary>${scene.records.map(r => `<button type="button" data-intro-record="${r.id}"><strong>${esc(r.title)}</strong><small>${esc(REGIONS[r.region])} · ${esc(fmtEvent(r))}${r.approx ? ' · approximate' : ''}</small></button>`).join('')}</details>` : '<p>No sourced overview is available for this period in the atlas yet. Try Explore years.</p>'}</div>`;
      intro.tabIndex = -1;
      intro.querySelectorAll('[data-intro-record]').forEach(button => button.onclick = () => {
        const r = byId[button.dataset.introRecord];
        if (!state.cats.has(r.cat)) { state.cats.add(r.cat); buildMarks(); }
        if (period) setYear(r.start);
        select(r.id);
      });
      suggested.querySelectorAll('[data-suggested-year]').forEach(button => button.setAttribute('aria-current', Number(button.dataset.suggestedYear) === state.year ? 'date' : 'false'));
    }
    const context = document.getElementById('atlasMain').dataset.sidebarContext;
    intro.hidden = context === 'people';
    const browseKey = `${state.year}/${region}/${category}/${context}/${[...state.cats]}`;
    if (lastBrowse !== browseKey) {
      lastBrowse = browseKey;
      const peopleTab = context === 'people';
      const count = peopleTab ? filterPeople(alivePeople().filter(p => p.born <= state.year && p.died >= state.year)).length : filterEvents(activeEvents()).length;
      document.getElementById('browseStatus').textContent = `${count} ${peopleTab ? 'people alive' : 'records'} · ${region === 'world' ? 'worldwide' : REGIONS[region]}${!peopleTab && category !== 'all' ? ' · ' + CATS[category] : ''}. Map unchanged.`;
      resetBrowse.hidden = region === 'world' && (category === 'all' || peopleTab);
      revealCategory.hidden = peopleTab || category === 'all' || state.cats.has(category);
      if (!revealCategory.hidden) revealCategory.textContent = `Show ${CATS[category]} on the map and in this list`;
      browse.querySelector('.browse-type').hidden = peopleTab;
      for (const option of categoryInput.options) {
        option.hidden = option.value !== 'all' && (state.year < -1000000 ? option.value !== 'dinosaurs' : option.value === 'dinosaurs');
        if (option.value !== 'all') option.textContent = CATS[option.value] + (state.cats.has(option.value) ? '' : ' (hidden)');
      }
    }
    const step = state.year < -1000000 ? 1000000 : Number(document.getElementById('yearStep').value);
    const navigationKey = `${state.year}/${state.playing}/${[...state.cats]}/${step}`;
    if (lastNavigation !== navigationKey) {
      lastNavigation = navigationKey;
      document.querySelectorAll('.year-step-size').forEach(label => { label.textContent = step === 1000000 ? '1 Myr' : `${step.toLocaleString('en')}y`; });
      for (const [id, direction] of [['previousEvent', -1], ['nextEvent', 1]]) {
        const records = ev.filter(r => state.cats.has(r.cat) && (direction < 0 ? r.start < state.year : r.start > state.year)).sort((a, b) => direction < 0 ? b.start - a.start : a.start - b.start);
        const button = document.getElementById(id);
        const label = `${direction < 0 ? 'Previous' : 'Next'} recorded event${records[0] ? ': ' + fmt(records[0].start) + ' · ' + records[0].title : ' unavailable'} (visible categories)`;
        button.title = label; button.setAttribute('aria-label', label);
      }
      document.getElementById('play').title = state.playing ? 'Pause the timeline' : state.year >= NOW ? 'Replay the full timeline in about 30 seconds' : 'Play forward on the timeline · full sweep about 30 seconds';
    }
    if (lastDetail !== document.getElementById('detail').firstElementChild) {
      detail(); lastDetail = document.getElementById('detail').firstElementChild;
    }
  }
  window.AtlasExplore = {
    filterEvents, filterPeople, detail, render, preview: () => preview, hasRegionFilter: () => region !== 'world',
    clearCountry() { country = null; countryYear = null; },
    selectCountry(feature, year = state.year) {
      stopPlay(); stopSpin(); HistoryDiscovery.selectedRecord(year); state.sel = null; selectedPolity = null;
      country = feature; countryYear = year;
      update(); document.querySelector('[data-context="events"]').click(); revealDetail();
    },
    drawCountry() {
      if (!country || state.borders !== 'today' || state.year !== countryYear) return;
      ctx.save(); ctx.beginPath(); path(country); ctx.strokeStyle = C.accent; ctx.lineWidth = 2.4; ctx.stroke(); ctx.restore();
    },
  };
  render();
})();
