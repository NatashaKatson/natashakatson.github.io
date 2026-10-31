/* Explore, Journeys and settings share the atlas's existing state and records. */
(() => {
  const app = document.getElementById('atlasMain');
  const side = document.getElementById('side');
  const settings = document.getElementById('mapSettings');
  const settingsContents = document.getElementById('settingsContents');
  const toolsToggle = document.getElementById('mapToolsToggle');
  const mobile = matchMedia('(max-width: 860px)');
  let restoreSettingsFocus = true;
  let workspace = 'explore', context = byId[state.sel]?.kind === 'person' || HistoryDiscovery.contemporaryPair() ? 'people' : 'events', sheetOpen = false;

  // Relocate real controls so their existing state, handlers and IDs survive.
  document.getElementById('timelineDateSlot').append(document.getElementById('goto'));
  for (const id of ['prev', 'next']) {
    const button = document.getElementById(id);
    button.type = 'button';
    button.classList.add('year-step');
    if (id === 'prev') document.getElementById('timelineDateSlot').prepend(button);
    else document.getElementById('timelineDateSlot').append(button);
  }
  document.querySelector('.year-steppers').remove();
  const layers = document.getElementById('layersPanel');
  layers.hidden = false;
  layers.querySelector('h2').remove();
  settingsContents.append(layers);
  const thematicDetails = document.createElement('details');
  thematicDetails.className = 'settings-section';
  thematicDetails.innerHTML = '<summary>Thematic layers</summary>';
  thematicDetails.append(layers.querySelector('.thematic-layers'));
  layers.append(thematicDetails);
  const filters = document.getElementById('filtersPanel');
  filters.hidden = false;
  filters.querySelector('h2').append(document.getElementById('filterCount'));
  const categoryDetails = document.createElement('details');
  categoryDetails.className = 'settings-section';
  categoryDetails.innerHTML = '<summary>Event categories <span id="categoryStatus"></span></summary>';
  categoryDetails.append(filters);
  settingsContents.append(categoryDetails);
  const comparison = document.createElement('details');
  comparison.className = 'settings-section';
  comparison.innerHTML = '<summary>Compare years</summary>';
  comparison.append(document.getElementById('compareToggle'), document.querySelector('.comparison-controls'));
  comparison.querySelector('.comparison-controls').append(...['compareYears', 'changeOption', 'compareNote'].map(id => document.getElementById(id)));
  settingsContents.append(comparison);
  const options = document.querySelector('.dock-options');
  const optionsContent = options.querySelector('.dock-options-content');
  optionsContent.append(document.querySelector('.discovery-tools'));
  options.classList.add('settings-section');
  options.querySelector('summary').textContent = 'Share & other tools';
  settingsContents.append(options);
  const population = document.querySelector('.population-strip');
  document.getElementById('timeControls').prepend(population);
  // Reserve the readout's actual height, including wrapped comparison values.
  const fitPopulation = () => {
    app.style.setProperty('--population-space', `${population.hidden ? 0 : population.offsetHeight + 2}px`);
    population.style.setProperty('--population-note-space', `${Math.max(0, population.getBoundingClientRect().top - 20)}px`);
  };
  const populationLayout = new ResizeObserver(fitPopulation);
  populationLayout.observe(population);
  populationLayout.observe(document.getElementById('timeControls'));
  population.querySelector('details').addEventListener('toggle', fitPopulation);
  window.addEventListener('resize', fitPopulation);
  fitPopulation();

  const topics = document.getElementById('journeyTopics');
  const panels = document.getElementById('journeyPanels');
  for (const [id, title, description] of [
    ['womensRightsPanel', 'Women’s rights', 'Rights, struggles and milestones across the world.'],
    ['migrationsPanel', 'Human migrations', 'Follow movements of people through time.'],
  ]) {
    const trigger = document.querySelector(`[data-atlas-menu="${id}"]`);
    const panel = document.getElementById(id);
    trigger.className = 'journey-topic';
    trigger.innerHTML = `<span><strong>${id === 'womensRightsPanel' ? '<span aria-hidden="true">👩</span> ' : ''}${title}</strong><small>${description}</small></span><span aria-hidden="true">→</span>`;
    topics.append(trigger);
    panels.append(panel);
  }
  const dinosaurs = document.querySelector('.dinosaur-discovery');
  const dinoTopic = document.createElement('button');
  dinoTopic.type = 'button';
  dinoTopic.className = 'journey-topic';
  dinoTopic.innerHTML = '<img src="images/dinosaurs/tyrannosaurus.webp" width="56" height="56" alt=""><span><strong>Life before humans</strong><small>Fossil records on ancient continents.</small></span><span aria-hidden="true">→</span>';
  dinoTopic.onclick = () => {
    if (!state.cats.has('dinosaurs')) { state.cats.add('dinosaurs'); update(); buildMarks(); }
    dinosaurs.querySelector('details').open = true;
    dinosaurs.scrollIntoView({ block: 'nearest', behavior: 'instant' });
    dinosaurs.querySelector('summary').focus({ preventScroll: true });
  };
  topics.append(dinoTopic);
  const collections = document.getElementById('journeyCollections');
  const eventList = document.createElement('details');
  eventList.className = 'event-list-disclosure';
  eventList.innerHTML = '<summary>More around this time</summary>';
  const regions = document.getElementById('regions');
  regions.before(eventList);
  eventList.append(regions);
  let hadSelection = null;
  // The modules retain references to these elements after they move.
  for (const node of [...document.querySelector('.sidebar-extras').children]) {
    if (!node.matches('.sidebar-extras-intro, #journeyTopics, #journeyPanels, #journeyCollections')) collections.append(node);
  }
  collections.prepend(dinosaurs);
  document.getElementById('mapTools').remove();
  // Layer navigation uses this trigger to close settings before opening a record.
  toolsToggle.dataset.atlasMenu = 'layersPanel';

  function openSettings() {
    closeMenus();
    if (settings.open) { settings.close(); return; }
    restoreSettingsFocus = true;
    settings.showModal();
    toolsToggle.setAttribute('aria-expanded', 'true');
  }
  toolsToggle.onclick = openSettings;
  settings.querySelectorAll('[data-close-dialog]').forEach(button => button.onclick = () => settings.close());
  settings.addEventListener('close', () => {
    toolsToggle.setAttribute('aria-expanded', 'false');
    if (restoreSettingsFocus) toolsToggle.focus({ preventScroll: true });
  });
  settings.addEventListener('keydown', event => {
    if (event.key === 'Escape') { event.preventDefault(); settings.close(); }
  });
  settings.addEventListener('click', event => {
    if (event.target !== settings) return;
    const rect = settings.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) settings.close();
  });
  document.querySelectorAll('[data-layer-explore]').forEach(button => button.addEventListener('click', closeSettingsForNavigation));
  function closeSettingsForNavigation() { restoreSettingsFocus = false; settings.close(); }

  const body = document.getElementById('sideBody');
  const sheetToggle = document.getElementById('eventSheetToggle');
  function setSheet(open) {
    sheetOpen = open;
    side.classList.toggle('sheet-open', open);
    sheetToggle.setAttribute('aria-expanded', String(open));
    body.inert = mobile.matches && !open;
    body.setAttribute('aria-hidden', String(mobile.matches && !open));
  }
  sheetToggle.onclick = () => setSheet(!sheetOpen);
  mobile.addEventListener('change', () => { setSheet(sheetOpen); renderWorkspace(); });
  function setWorkspace(next) {
    window.scrollTo({ top: 0, behavior: 'instant' });
    workspace = next;
    app.dataset.workspace = next;
    document.querySelectorAll('[data-workspace]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.workspace === next)));
    if (next === 'journeys') { setSheet(true); closeMenus(); }
    else { closeMenus(); if (mobile.matches) setSheet(false); }
    renderWorkspace();
    side.scrollTop = 0;
  }
  document.querySelectorAll('[data-workspace]').forEach(button => button.onclick = () => setWorkspace(button.dataset.workspace));
  document.querySelectorAll('[data-context]').forEach(button => button.onclick = () => {
    context = button.dataset.context;
    document.querySelectorAll('[data-context]').forEach(tab => tab.setAttribute('aria-pressed', String(tab === button)));
    renderWorkspace();
    side.scrollTop = 0;
  });
  document.querySelectorAll('[data-journey-shortcut]').forEach(button => button.onclick = () => {
    setWorkspace('journeys');
    const id = button.dataset.journeyShortcut;
    if (id === 'dinosaurs') dinoTopic.click();
    else {
      (id === 'womensRightsPanel' ? HistoryWomensRights : HistoryMigrations).setScope('selected', true);
      openMenu(document.querySelector(`[data-atlas-menu="${id}"]`));
    }
  });
  const searchTrigger = document.querySelector('.history-search-trigger');
  searchTrigger.innerHTML = '<span aria-hidden="true">⌕</span><span class="search-label">Search places, people, events</span>';
  document.getElementById('mobileSearch').onclick = () => searchTrigger.click();
  const footer = document.getElementById('atlasFooter');
  const fitFooter = () => {
    const style = getComputedStyle(footer);
    const rowHeight = Math.max(...[...footer.querySelectorAll('.atlas-footer-identity, .atlas-footer-support, .atlas-footer-sources > summary')].map(node => node.offsetHeight));
    document.documentElement.style.setProperty('--footer-space', `${Math.ceil(rowHeight + parseFloat(style.paddingTop) + parseFloat(style.paddingBottom))}px`);
  };
  const footerLayout = new ResizeObserver(fitFooter);
  footerLayout.observe(footer.querySelector('.atlas-footer-main'));
  const footerSources = footer.querySelector('.atlas-footer-sources');
  footerSources.addEventListener('toggle', () => {
    fitFooter();
    if (footerSources.open) footerSources.scrollIntoView({ block: 'nearest', behavior: 'instant' });
  });
  window.addEventListener('resize', fitFooter);
  fitFooter();
  document.querySelector('[data-atlas-footer]').onclick = () => {
    closeMenus(); setSheet(false);
    footer.scrollIntoView({ block: 'start', behavior: 'instant' });
    footer.focus({ preventScroll: true });
  };
  footer.querySelector('[data-return-atlas]').onclick = () => {
    footerSources.open = false;
    window.scrollTo({ top: 0, behavior: 'instant' });
    goToMap();
  };
  window.addEventListener('scroll', () => {
    if (window.scrollY > 0) { closeMenus(); if (mobile.matches && sheetOpen) setSheet(false); }
  }, { passive: true });
  function goToMap() {
    if (settings.open) closeSettingsForNavigation();
    setWorkspace('explore');
    setSheet(false);
    cv.focus({ preventScroll: true });
  }
  function goToEvents() {
    setWorkspace('explore');
    setSheet(true);
    document.getElementById('sideTitle').focus({ preventScroll: true });
  }
  document.querySelector('.skip-links a[href="#sideTitle"]').onclick = event => { event.preventDefault(); goToEvents(); };
  document.querySelector('.skip-links a[href="#cv"]').onclick = event => { event.preventDefault(); goToMap(); };
  function reveal(element) {
    window.scrollTo({ top: 0, behavior: 'instant' });
    if (settings.open) closeSettingsForNavigation();
    const inJourneys = !!element.closest('.sidebar-extras');
    if (inJourneys) {
      if (workspace !== 'journeys') setWorkspace('journeys');
    } else if (workspace !== 'explore') setWorkspace('explore');
    if (element.closest('.contemporaries-card')) context = 'people';
    else if (element.id === 'detail') context = byId[state.sel]?.kind === 'person' ? 'people' : 'events';
    else if (element.classList.contains('discovery-panel')) context = 'events';
    setSheet(true);
    renderWorkspace();
  }
  const editYear = () => {
    const input = document.getElementById('gotoInput');
    input.value = fmtInputYear(state.year);
    input.focus({ preventScroll: true }); input.select();
  };
  document.getElementById('editDate').onclick = editYear;
  document.getElementById('previousEvent').onclick = () => stepEvent(-1);
  document.getElementById('nextEvent').onclick = () => stepEvent(1);
  document.getElementById('resetFilters').onclick = resetEventFilters;
  const scopeButton = document.getElementById('timelineScope');
  scopeButton.onclick = () => {
    openMenu(document.querySelector('[data-atlas-menu="eraPanel"]'));
    document.getElementById('eraChoices').querySelector('button:not([hidden])')?.focus({ preventScroll: true });
  };
  const dateInput = document.getElementById('gotoInput');
  const dateForm = document.getElementById('goto');
  const fitDateField = () => dateInput.classList.toggle('is-wide-date', dateInput.value.length > 7 || /[a-z]/i.test(dateInput.value));
  dateInput.addEventListener('input', fitDateField);
  dateForm.addEventListener('submit', fitDateField);
  dateForm.addEventListener('focusout', event => {
    if (dateForm.contains(event.relatedTarget)) return;
    dateInput.value = fmtInputYear(state.year);
    dateInput.setCustomValidity('');
    fitDateField();
  });
  dateInput.addEventListener('keydown', event => { if (event.key === 'Escape') { dateInput.blur(); cv.focus({ preventScroll: true }); } });

  const menuTriggers = [...document.querySelectorAll('[data-atlas-menu]')].filter(button => button !== toolsToggle);
  function closeMenus(restoreFocus = false) {
    let returnTrigger;
    for (const trigger of menuTriggers) {
      const panel = document.getElementById(trigger.dataset.atlasMenu);
      if (restoreFocus && panel.contains(document.activeElement)) returnTrigger = trigger;
      panel.hidden = true;
      trigger.setAttribute('aria-expanded', 'false');
    }
    side.classList.remove('journey-panel-open');
    returnTrigger?.focus({ preventScroll: true });
    scopeButton.setAttribute('aria-expanded', 'false');
  }
  function openMenu(trigger) {
    closeMenus();
    const panel = document.getElementById(trigger.dataset.atlasMenu);
    if (panel.closest('#journeyPanels') && settings.open) closeSettingsForNavigation();
    panel.hidden = false;
    trigger.setAttribute('aria-expanded', 'true');
    if (panel.id === 'eraPanel') scopeButton.setAttribute('aria-expanded', 'true');
    if (panel.closest('#journeyPanels')) {
      if (workspace !== 'journeys') setWorkspace('journeys');
      panel.hidden = false;
      trigger.setAttribute('aria-expanded', 'true');
      side.classList.add('journey-panel-open');
      setSheet(true);
      panel.querySelector('input, button')?.focus({ preventScroll: true });
    }
  }
  for (const trigger of menuTriggers) trigger.onclick = () => {
    if (trigger.getAttribute('aria-expanded') === 'true') closeMenus();
    else {
      if (trigger.dataset.atlasMenu === 'womensRightsPanel') HistoryWomensRights.setScope('all');
      if (trigger.dataset.atlasMenu === 'migrationsPanel') HistoryMigrations.setScope('all');
      openMenu(trigger);
    }
  };
  document.addEventListener('pointerdown', event => {
    // Journey panels remain open while the map is explored. Era selection is transient.
    if (!event.target.closest('.atlas-menu')) {
      const eraTrigger = document.querySelector('[data-atlas-menu="eraPanel"]');
      document.getElementById('eraPanel').hidden = true;
      eraTrigger.setAttribute('aria-expanded', 'false');
      scopeButton.setAttribute('aria-expanded', 'false');
    }
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !document.querySelector('dialog[open]')) {
      closeMenus(true);
      if (mobile.matches && sheetOpen && !event.target.closest('input, select')) { setSheet(false); sheetToggle.focus(); }
    }
  });

  const peopleNodes = ['peopleTitle', 'peopleSub', 'people'].map(id => document.getElementById(id));
  const peopleSummary = document.createElement('div');
  peopleSummary.className = 'sub';
  peopleSummary.hidden = true;
  document.getElementById('sideSub').after(peopleSummary);
  let lastWorkspaceKey = '', lastWorkspaceDetail = null, lastWorkspacePeople = null, lastJourneySelection = '', lastChallengeView = '', lastPresentedRecord = '';
  function renderWorkspace() {
    const presentedRecord = state.sel || selectedPolity?.name || document.querySelector('#detail .search-place-detail h3')?.textContent || '';
    if (presentedRecord && presentedRecord !== lastPresentedRecord) {
      workspace = 'explore'; app.dataset.workspace = workspace;
      context = byId[state.sel]?.kind === 'person' ? 'people' : 'events';
      setSheet(true);
    }
    lastPresentedRecord = presentedRecord;
    const reader = document.querySelector('.curated-reader');
    const comparisonStory = document.querySelector('.comparison-explanation');
    const journeySelection = reader?.dataset.selection || (comparisonStory && !comparisonStory.hidden ? `comparison/${comparisonStory.dataset.story}` : '');
    const banner = document.querySelector('.challenge-map-banner');
    const challengeView = banner && !banner.hidden ? banner.textContent : '';
    const picking = !!window.HistoryChallenge?.isPicking();
    if (picking || (challengeView && challengeView !== lastChallengeView)) {
      workspace = 'explore'; app.dataset.workspace = workspace; setSheet(false);
    } else if (journeySelection && journeySelection !== lastJourneySelection) {
      workspace = 'journeys'; app.dataset.workspace = workspace; setSheet(true);
    }
    lastJourneySelection = journeySelection; lastChallengeView = challengeView;
    app.dataset.sidebarContext = context;
    document.querySelectorAll('[data-workspace]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.workspace === workspace)));
    const detailNode = document.getElementById('detail').firstElementChild;
    const key = `${workspace}/${context}/${state.year}/${state.sel}/${selectedPolity?.name || ''}/${journeySelection}/${challengeView}`;
    const peopleNode = document.getElementById('people').firstElementChild;
    if (key === lastWorkspaceKey && detailNode === lastWorkspaceDetail && peopleNode === lastWorkspacePeople) return;
    lastWorkspaceKey = key; lastWorkspaceDetail = detailNode; lastWorkspacePeople = peopleNode;
    const journeys = workspace === 'journeys';
    document.querySelector('.side-intro .kicker').textContent = journeys ? 'Follow your curiosity' : 'At the same time';
    document.getElementById('sideTitle').textContent = journeys ? 'Journeys through time' : 'Around this time';
    document.querySelector('.context-tabs').hidden = journeys;
    document.querySelectorAll('[data-context]').forEach(tab => tab.setAttribute('aria-pressed', String(tab.dataset.context === context)));
    document.getElementById('sideSub').hidden = journeys || context === 'people';
    peopleSummary.hidden = journeys || context !== 'people';
    const peopleCount = alivePeople().filter(person => person.born <= state.year && person.died >= state.year).length;
    peopleSummary.textContent = `${peopleCount} ${peopleCount === 1 ? 'person' : 'people'} in this atlas alive in ${fmt(state.year)}`;
    document.getElementById('sideScope').hidden = journeys;
    document.querySelector('.sidebar-extras').hidden = !journeys;
    document.querySelector('.journey-shortcuts').hidden = journeys;
    document.getElementById('regions').hidden = journeys || context !== 'events';
    eventList.hidden = journeys || context !== 'events';
    document.getElementById('detail').hidden = journeys || context !== (byId[state.sel]?.kind === 'person' ? 'people' : 'events');
    const hasSelection = !document.getElementById('detail').hidden && !!document.querySelector('#detail .detail');
    if (hasSelection !== hadSelection) { eventList.open = !hasSelection; hadSelection = hasSelection; }
    eventList.classList.toggle('has-selection', hasSelection);
    peopleNodes.forEach(node => node.hidden = journeys || context !== 'people');
    const pair = document.querySelector('.contemporaries-card');
    if (pair) pair.hidden = journeys || context !== 'people' || (!HistoryDiscovery.contemporaryPair() && !DiscoveryCore.contemporaryPair(ppl, state.year));
    const heading = !document.getElementById('detail').hidden && document.querySelector('#detail h3')?.textContent;
    document.getElementById('sheetPreview').textContent = journeys ? 'Browse journeys ↑' : (heading || (context === 'people' ? 'Browse people ↑' : document.querySelector('#regions .t')?.textContent || 'Browse events ↑'));
    sheetToggle.querySelector('span:nth-child(2)').textContent = journeys ? 'Journeys' : 'Around this time';
    document.getElementById('currentEraLabel').textContent = document.getElementById('era').textContent;
    document.getElementById('readoutEra').textContent = document.getElementById('era').textContent;
    if (document.activeElement !== dateInput) dateInput.value = fmtInputYear(state.year);
    fitDateField();
    // Keep the reading card brief; preserve every source and related record.
    if (detailNode && !detailNode.dataset.compact && !detailNode.classList.contains('dinosaur-detail')) {
      const sources = document.createElement('details');
      sources.className = 'story-sources';
      sources.innerHTML = '<summary>View sources ↗</summary>';
      for (const child of [...detailNode.children]) {
        if (child.tagName === 'A' || (child.tagName === 'P' && child.children.length === 1 && child.firstElementChild.tagName === 'A' && child.textContent.trim() === child.firstElementChild.textContent.trim())) sources.append(child);
      }
      if (sources.children.length > 1) detailNode.append(sources);
      const action = detailNode.querySelector(':scope > .discovery-action');
      if (action) {
        action.setAttribute('aria-label', action.textContent);
        action.textContent = 'Explore this place →';
        detailNode.append(action);
      }
      const sections = [...detailNode.querySelectorAll('.near')].filter(section => section.textContent.trim());
      if (sections.length) {
        // The outer disclosure already collapses related history. Keep each
        // section's heading and links visible after that single expansion.
        for (const section of sections) {
          const disclosure = section.querySelector(':scope > details');
          if (!disclosure) continue;
          disclosure.querySelector(':scope > summary')?.remove();
          disclosure.replaceWith(...disclosure.childNodes);
        }
        const related = document.createElement('details');
        related.className = 'story-context';
        related.innerHTML = '<summary>Context & related history</summary>';
        related.append(...sections);
        detailNode.after(related);
      }
      detailNode.dataset.compact = 'true';
    }
  }
  setSheet(false);
  app.dataset.workspace = workspace;
  const resetView = () => {
    stopSpin(); flyToken++; userMoved = true;
    rot = [-25, -22, 0]; zoomK = 1; flatT = { x: 0, y: 0 };
    moved(); draw();
  };
  document.getElementById('resetView').onclick = resetView;
  cv.addEventListener('keydown', event => {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', '+', '=', '-', '_', 'Home'].includes(event.key)) return;
    if (event.ctrlKey || event.metaKey || event.altKey || event.shiftKey && event.key.startsWith('Arrow')) return;
    event.preventDefault();
    stopSpin(); flyToken++; userMoved = true;
    if (event.key === 'Home') { resetView(); return; }
    if (['+', '=', '-', '_'].includes(event.key)) { setZoom(zoomK * (['+', '='].includes(event.key) ? 1.2 : 1 / 1.2)); return; }
    const dx = event.key === 'ArrowLeft' ? 1 : event.key === 'ArrowRight' ? -1 : 0;
    const dy = event.key === 'ArrowUp' ? 1 : event.key === 'ArrowDown' ? -1 : 0;
    if (state.mode === 'globe') {
      rot[0] += dx * 8 / zoomK;
      rot[1] = Math.max(-90, Math.min(90, rot[1] + dy * 8 / zoomK));
    } else {
      flatT.x += dx * 40; flatT.y += dy * 40;
    }
    moved(); draw();
  });
  const choices = document.getElementById('eraChoices');
  const destinations = [
    ['Triassic', '≈228 million years ago', -228000000, 0],
    ['Jurassic', '≈150 million years ago', -150000000, 1],
    ['Cretaceous', '≈67 million years ago', -67000000, 2],
    ['Prehistory', '10,000 BC', -10000], ['Ancient', '3000 BC', -3000],
    ['Classical', '500 BC', -500], ['Medieval', '1000', 1000],
    ['Early modern', '1600', 1600], ['Modern', '1903', 1903],
  ];
  for (const [name, date, year, dinosaurEra] of destinations) {
    const button = document.createElement('button');
    button.type = 'button';
    if (dinosaurEra !== undefined) button.dataset.dinosaurDestination = dinosaurEra;
    button.innerHTML = `<span>${name}</span><small>${date}</small>`;
    button.onclick = () => {
      closeMenus();
      if (dinosaurEra !== undefined) document.querySelector(`[data-dinosaur-era="${dinosaurEra}"]`).click();
      else { stopPlay(); setYear(year); }
      document.querySelector('[data-atlas-menu="eraPanel"]').focus({ preventScroll: true });
    };
    choices.append(button);
  }
  const browse = document.querySelector('.browse-dinosaurs');
  browse.onclick = () => {
    openMenu(document.querySelector('[data-atlas-menu="eraPanel"]'));
    choices.querySelector('button').focus({ preventScroll: true });
  };


  const historyNote = document.createElement('details');
  historyNote.className = 'historical-map-note';
  historyNote.innerHTML = '<summary>Approximate historical borders <span aria-hidden="true">ⓘ</span></summary><p>Dashed lines are simplified reconstructions. Frontiers could be fluid or disputed. Coverage gaps do not mean uninhabited land. Open Map settings for coverage and sources.</p>';
  document.getElementById('mapContext').append(historyNote);
  cv.setAttribute('aria-describedby', 'mapKeyboardHelp mapContext ancientGeography');
  const hint = document.querySelector('.stage-hint');
  const dismissHint = () => { hint.hidden = true; };
  cv.addEventListener('pointerdown', dismissHint, { once: true });
  cv.addEventListener('wheel', dismissHint, { once: true, passive: true });
  setTimeout(dismissHint, 7000);
  let lastKey = '', lastPeriodKey = '';
  window.AtlasUI = { goToMap, goToEvents, reveal, revealList(saved) {
    context = byId[saved?.id]?.kind === 'person' ? 'people' : 'events';
    goToEvents(); renderWorkspace();
  }, render() {
    renderWorkspace();
    window.HistoryLayers?.render();
    window.HistoryMigrations?.render();
    window.HistoryWomensRights?.render();
    const years = HistoryDiscovery.displayedYears();
    const periodKey = `${years}/${state.sel}/${state.borders}/${[...state.cats]}/${HistoryDiscovery.isComparing()}`;
    if (periodKey === lastPeriodKey) return;
    lastPeriodKey = periodKey;

    const available = ev.filter(event => state.cats.has(event.cat));
    document.getElementById('previousEvent').disabled = !available.some(event => event.start < state.year);
    document.getElementById('nextEvent').disabled = !available.some(event => event.start > state.year);
    const deep = years.some((year) => year < -1000000);
    const human = years.some((year) => year >= -1000000);
    document.querySelector('.journey-shortcuts h3').textContent = `Explore near ${years.map(year => fmt(year)).join(' & ')}`;
    for (const [id, category] of [['womensRightsPanel', 'womens-rights'], ['migrationsPanel', 'migrations']]) {
      const button = document.querySelector(`[data-journey-shortcut="${id}"]`);
      const count = ev.filter(record => record.cat === category && years.some(year => DiscoveryCore.yearGap(record.start, record.end, year) <= halfWin(year))).length;
      button.hidden = !human;
      button.querySelector('[data-journey-count]').textContent = `${count} ${count === 1 ? 'record' : 'records'} near the selected ${years.length === 1 ? 'year' : 'years'}`;
    }
    document.querySelector('[data-journey-shortcut="dinosaurs"]').hidden = !deep;
    const key = `${deep}/${human}/${state.borders}/${[...state.cats].sort().join(',')}/${HistoryDiscovery.isComparing()}`;
    if (key === lastKey) return;
    lastKey = key;
    const relevant = Object.keys(CATS).filter((cat) => cat !== 'migrations' && (cat === 'dinosaurs' ? deep : human));
    for (const chip of document.querySelectorAll('#legend [data-k]')) {
      chip.hidden = !relevant.includes(chip.dataset.k);
      chip.setAttribute('aria-pressed', String(state.cats.has(chip.dataset.k)));
    }
    const hiddenCount = relevant.filter(cat => !state.cats.has(cat)).length;
    const defaultView = relevant.every(cat => state.cats.has(cat) === (cat !== 'womens-rights'));
    document.getElementById('categoryStatus').textContent = defaultView && human ? 'Default view' : hiddenCount ? `${hiddenCount} hidden` : 'All shown';
    document.getElementById('filterCount').textContent = defaultView && human ? 'Default' : hiddenCount ? `${hiddenCount} hidden` : 'All';
    document.getElementById('resetFilters').disabled = defaultView;
    document.getElementById('filterContext').textContent = 'Filters apply to the map and worldwide event list. ' + (deep && human ? 'Showing types for both displayed periods.' : deep ? 'Fossil records for this period.' : `Dated events within ${SAME_TIME_YEARS} years; longer periods are historical context.`);
    const dinosaursEnabled = state.cats.has('dinosaurs');
    browse.hidden = !deep || !dinosaursEnabled;
    for (const button of choices.querySelectorAll('[data-dinosaur-destination]')) button.hidden = !dinosaursEnabled;
    historyNote.hidden = !human || state.borders !== 'history';
    document.querySelector('.population-strip').hidden = deep && !human;
    stage.classList.toggle('deep-time-only', deep && !human);
  } };
  AtlasUI.render();
  window.AtlasLoadState?.ready();
})();
