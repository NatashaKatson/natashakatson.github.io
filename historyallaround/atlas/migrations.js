/* Migration browsing has its own menu; map visibility stays in the atlas category state. */
(() => {
  const records = ev.filter(event => event.cat === 'migrations');
  const searchable = DiscoveryCore.prepareSearch(records.map(event => ({
    kind: 'event', title: event.title, aliases: [...event.aliases,
      ...(/\b(world war ii|ww2)\b/i.test([event.title,...event.aliases].join(' ')) ? ['WWII','WW2'] : []),
      ...(/\bworld war i\b/i.test([event.title,...event.aliases].join(' ')) ? ['WWI','WW1'] : []),
    ],
    description: event.blurb, recordId: event.id,
  })));
  const panel = document.getElementById('migrationsPanel');
  const trigger = document.querySelector('[data-atlas-menu="migrationsPanel"]');
  panel.innerHTML = `<div class="migrations-heading"><h2 id="migrationsTitle">Migrations</h2><button type="button" class="migrations-close" aria-label="Close migrations">×</button></div>
    <div class="journey-time-filter"><select id="migrationTimeScope" aria-label="Migration histories time period"><option value="all">All years</option><option value="selected">Selected period</option></select><label class="migrations-visibility"><span>Show on map</span><input type="checkbox" id="migrationVisibility" checked></label></div>
    <label class="migrations-search-label" for="migrationSearch">Find a history</label>
    <input type="search" id="migrationSearch" aria-label="Search migrations" placeholder="Belarus, WWII, Pale of Settlement…" autocomplete="off" maxlength="160" aria-controls="migrationResults">
    <p class="migrations-status" id="migrationStatus" role="status" aria-live="polite"></p>
    <div class="migrations-results" id="migrationResults" aria-label="Migration histories"></div>
    <p class="migrations-hint">Choose a history to open its map and sources.</p>`;
  const visibility = panel.querySelector('#migrationVisibility');
  const timeScope = panel.querySelector('#migrationTimeScope');
  const search = panel.querySelector('#migrationSearch');
  const status = panel.querySelector('#migrationStatus');
  const results = panel.querySelector('#migrationResults');
  let lastKey = '';

  panel.querySelector('.migrations-close').onclick = () => {
    if (trigger.getAttribute('aria-expanded') === 'true') trigger.click();
    trigger.focus({preventScroll:true});
  };
  visibility.onchange = () => {
    if (visibility.checked) state.cats.add('migrations');
    else state.cats.delete('migrations');
    buildMarks();update();
  };
  search.addEventListener('input', () => HistoryMigrations.render());
  timeScope.addEventListener('change', () => HistoryMigrations.render());
  results.addEventListener('click', async event => {
    const button = event.target.closest('[data-migration-record]');
    if (!button) return;
    const record = byId[button.dataset.migrationRecord];
    // Keep the chosen year when it is already inside the record's interval.
    const year = [state.year, ...HistoryDiscovery.displayedYears()].find(year => year >= record.start && year <= record.end) ?? record.start;
    if (trigger.getAttribute('aria-expanded') === 'true') trigger.click();
    await HistoryDiscovery.jumpSearch({kind:'event',recordId:record.id,start:year,lon:record.lon,lat:record.lat});
  });

  function group(title, events) {
    if (!events.length) return '';
    return `<section class="migration-group"><h3>${esc(title)} <span>${events.length}</span></h3>${events.map(event => `<button type="button" class="migration-result" data-migration-record="${event.id}" aria-current="${state.sel === event.id}"><span>${esc(event.title)}</span><small>${esc(fmtEvent(event))}</small></button>`).join('')}</section>`;
  }
  window.HistoryMigrations = { setScope(scope, reset = false) {
    timeScope.value = scope;
    if (reset) search.value = '';
    this.render();
  }, render() {
    const years = HistoryDiscovery.displayedYears();
    const enabled = state.cats.has('migrations');
    const query = search.value.trim();
    const key = `${years.join('/')}/${enabled}/${query}/${timeScope.value}/${state.sel}`;
    if (key === lastKey) return;
    lastKey = key;
    visibility.checked = enabled;
    const inPeriod = event => years.some(year => DiscoveryCore.yearGap(event.start,event.end,year) <= halfWin(year));
    const current = records.filter(inPeriod);
    const filtered = query ? DiscoveryCore.search(searchable,query,'event',records.length).map(result => byId[result.recordId]) : records;
    const selectedPeriod = timeScope.value === 'selected';
    const matches = selectedPeriod ? filtered.filter(inPeriod) : filtered;
    const near = matches.filter(inPeriod).sort((a,b) => a.start-b.start);
    const other = matches.filter(event => !inPeriod(event)).sort((a,b) => b.start-a.start);
    const periodLabel = years.length > 1 ? `${fmt(years[0])} & ${fmt(years[1])}` : fmt(years[0]);
    status.textContent = selectedPeriod ? `${near.length} ${near.length === 1 ? 'history' : 'histories'} near ${periodLabel} · ±${SAME_TIME_YEARS} years` : query
      ? `${matches.length} ${matches.length === 1 ? 'match' : 'matches'} · ${records.length} histories total`
      : `${current.length} near ${periodLabel} · ${records.length} histories total`;
    const focusedId = results.contains(document.activeElement) ? document.activeElement.dataset.migrationRecord : null;
    results.innerHTML = group(years.length > 1 ? 'Displayed periods' : `Around ${periodLabel}`,near) + (selectedPeriod ? '' : group('Other periods',other))
      || (selectedPeriod ? `<p class="migrations-empty">No matching histories near ${esc(periodLabel)}. Choose All years to browse the full timeline.</p>` : '<p class="migrations-empty">No matching histories. Try a place, people or event.</p>');
    if (focusedId) (results.querySelector(`[data-migration-record="${focusedId}"]`) || search).focus({preventScroll:true});
    results.scrollTop = 0;
  } };
  HistoryMigrations.render();
})();
