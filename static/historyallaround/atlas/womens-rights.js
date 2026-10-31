/* A dedicated chronological browser; these histories are not map layers. */
(() => {
  const category = 'womens-rights';
  const topics = {
    voting: 'Voting & representation', education: 'Education',
    equality: 'Equality, property & family', movements: 'Movements & advocacy',
    violence: 'Freedom from violence', reproductive: 'Abortion & reproductive rights',
  };
  const records = ev.filter(event => event.cat === category).sort((a,b) => a.start-b.start || a.id.localeCompare(b.id));
  const searchable = DiscoveryCore.prepareSearch(records.map(event => ({
    kind: 'event', title: event.title, description: event.blurb, recordId: event.id,
    aliases: [...event.aliases, event.rights.country, topics[event.rights.topic], ...(event.rights.topic === 'reproductive' ? ['abortion','abortions','reproductive rights'] : [])],
  })));
  const panel = document.getElementById('womensRightsPanel');
  const trigger = document.querySelector('[data-atlas-menu="womensRightsPanel"]');
  panel.innerHTML = `<div class="rights-heading"><h2 id="womensRightsTitle"><span aria-hidden="true">👩</span> Women’s rights</h2><button type="button" class="rights-close" aria-label="Close women’s rights">×</button></div>
    <p class="rights-intro">A history of rights, struggles and reversals around the world.</p>
    <div class="journey-time-filter"><select id="rightsTimeScope" aria-label="Women’s rights time period"><option value="all">All years</option><option value="selected">Selected period</option></select><label class="rights-visibility"><span>Show on map</span><input type="checkbox" id="rightsVisibility" checked></label></div>
    <label class="rights-search-label" for="rightsSearch">Find a milestone</label>
    <input type="search" id="rightsSearch" placeholder="Suffrage, abortion, a country or state…" autocomplete="off" maxlength="160" aria-controls="rightsResults">
    <div class="rights-filters"><label>Topic<select id="rightsTopic">${Object.entries({all:'All topics',...topics,'us-abortion':'U.S. abortion history'}).map(([key,label]) => `<option value="${key}">${esc(label)}</option>`).join('')}</select></label><label>Region<select id="rightsRegion"><option value="all">All regions</option>${Object.entries(REGIONS).map(([key,label]) => `<option value="${key}">${esc(label)}</option>`).join('')}</select></label></div>
    <p class="rights-status" id="rightsStatus" role="status" aria-live="polite"></p>
    <div class="rights-results" id="rightsResults" aria-label="Women’s rights timeline"></div>
    <p class="rights-hint">Choose a milestone for its date, place and sources. Historical laws and practical access may change later.</p>`;
  const visibility = panel.querySelector('#rightsVisibility');
  const timeScope = panel.querySelector('#rightsTimeScope');
  const search = panel.querySelector('#rightsSearch');
  const topic = panel.querySelector('#rightsTopic');
  const region = panel.querySelector('#rightsRegion');
  const status = panel.querySelector('#rightsStatus');
  const results = panel.querySelector('#rightsResults');
  let lastKey = '';
  let listKey = '';
  let listPeriod = '';

  panel.querySelector('.rights-close').onclick = () => {
    if (trigger.getAttribute('aria-expanded') === 'true') trigger.click();
    trigger.focus({preventScroll:true});
  };
  visibility.onchange = () => {
    if (visibility.checked) state.cats.add(category); else state.cats.delete(category);
    buildMarks();update();
  };
  for (const control of [search,topic,region,timeScope]) control.addEventListener(control === search ? 'input' : 'change', () => HistoryWomensRights.render());
  results.addEventListener('focusout', event => {
    if (!results.contains(event.relatedTarget)) { lastKey = ''; HistoryWomensRights.render(); }
  });
  results.addEventListener('click', async event => {
    const button = event.target.closest('[data-rights-record]');
    if (!button) return;
    const record = byId[button.dataset.rightsRecord];
    if (trigger.getAttribute('aria-expanded') === 'true') trigger.click();
    await HistoryDiscovery.jumpSearch({kind:'event',recordId:record.id,start:record.start,lon:record.lon,lat:record.lat});
  });

  window.HistoryWomensRights = { topics, setScope(scope, reset = false) {
    timeScope.value = scope;
    if (reset) { search.value = ''; topic.value = 'all'; region.value = 'all'; }
    this.render();
  }, render() {
    const years = HistoryDiscovery.displayedYears();
    const enabled = state.cats.has(category);
    const query = search.value.trim();
    const key = JSON.stringify([years,enabled,query,topic.value,region.value,timeScope.value,state.sel]);
    if (key === lastKey) return;
    lastKey = key;
    visibility.checked = enabled;
    const matchedIds = query ? new Set(DiscoveryCore.search(searchable,query,'event',records.length).map(result => result.recordId)) : null;
    const matchesTopic = record => topic.value === 'all' || record.rights.topic === topic.value || (topic.value === 'us-abortion' && record.rights.topic === 'reproductive' && record.rights.country.startsWith('United States'));
    const filtered = records.filter(record => (!matchedIds || matchedIds.has(record.id)) && matchesTopic(record) && (region.value === 'all' || record.region === region.value));
    const inPeriod = record => years.some(year => DiscoveryCore.yearGap(record.start,record.end,year) <= halfWin(year));
    const selectedPeriod = timeScope.value === 'selected';
    const matches = selectedPeriod ? filtered.filter(inPeriod) : filtered;
    const description = record => `${fmtEvent(record)} · ${record.rights.country}${inPeriod(record)?' · Near displayed year':''}`;
    const periodLabel = years.map(year => fmt(year)).join(' & ');
    status.textContent = selectedPeriod ? `${matches.length} milestones near ${periodLabel} · ±${SAME_TIME_YEARS} years` : `${matches.length} of ${records.length} milestones · ${matches.filter(inPeriod).length} near ${periodLabel}`;
    const filters = JSON.stringify([query,topic.value,region.value,timeScope.value]);
    const period = years.join('/');
    // A timeline, selection or visibility update must not replace the focused
    // button or reset a reader's scroll position in the chronological list.
    if (filters === listKey && (period === listPeriod || (!selectedPeriod && results.contains(document.activeElement)))) {
      for (const button of results.querySelectorAll('[data-rights-record]')) {
        const record = byId[button.dataset.rightsRecord];
        button.setAttribute('aria-current', String(state.sel === record.id));
        button.querySelector('small').textContent = description(record);
      }
      return;
    }
    listKey = filters;
    listPeriod = period;
    const focusedId = results.contains(document.activeElement) ? document.activeElement.dataset.rightsRecord : null;
    const groups = [
      ['Before 1800',-Infinity,1799], ['1800–1899',1800,1899],
      ['1900–1949',1900,1949], ['1950–1999',1950,1999], ['2000–present',2000,Infinity],
    ];
    const near = matches.filter(inPeriod);
    const renderGroup = (label, events) => events.length ? `<section class="rights-group"><h3>${esc(label)} <span>${events.length}</span></h3>${events.map(record => `<button type="button" class="rights-result" data-rights-record="${record.id}" aria-current="${state.sel === record.id}"><span aria-hidden="true">👩</span><span><strong>${esc(record.title)}</strong><small>${esc(description(record))}</small></span></button>`).join('')}</section>` : '';
    results.innerHTML = renderGroup(`Near ${years.map(year => fmt(year)).join(' & ')}`, near) + (selectedPeriod ? [] : groups).map(([label,from,to]) => {
      const events = matches.filter(record => !inPeriod(record) && record.start >= from && record.start <= to);
      return events.length ? `<section class="rights-group"><h3>${label} <span>${events.length}</span></h3>${events.map(record => `<button type="button" class="rights-result" data-rights-record="${record.id}" aria-current="${state.sel === record.id}"><span aria-hidden="true">👩</span><span><strong>${esc(record.title)}</strong><small>${esc(description(record))}</small></span></button>`).join('')}</section>` : '';
    }).join('') || (selectedPeriod ? `<p class="rights-empty">No matching milestones near ${esc(periodLabel)}. Choose All years to browse the full timeline.</p>` : '<p class="rights-empty">No matching milestones. Try another search, topic or region.</p>');
    if (focusedId) (results.querySelector(`[data-rights-record="${focusedId}"]`) || search).focus({preventScroll:true});
    results.scrollTop = 0;
  } };
  HistoryWomensRights.render();
})();
