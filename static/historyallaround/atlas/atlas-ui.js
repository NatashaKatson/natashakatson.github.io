/* Compact map controls. Existing atlas state and navigation remain the source of truth. */
(() => {
  const triggers = [...document.querySelectorAll('[data-atlas-menu]')];
  const options = document.querySelector('.dock-options');
  const optionsContent = options.querySelector('.dock-options-content');
  optionsContent.append(document.querySelector('.discovery-tools'));
  document.querySelector('.comparison-controls').append(
    ...['compareYears', 'changeOption', 'compareNote'].map(id => document.getElementById(id))
  );
  const mobile = matchMedia('(max-width: 860px)');
  const toolsToggle = document.getElementById('mapToolsToggle');
  function showMapTools(open) {
    stage.classList.toggle('tools-open', open);
    toolsToggle.setAttribute('aria-expanded', String(open));
    if (!open) closeMenus();
  }
  toolsToggle.onclick = () => showMapTools(!stage.classList.contains('tools-open'));
  function goToMap() {
    showMapTools(false);
    stage.scrollIntoView({ block: 'start', behavior: 'instant' });
    cv.focus({ preventScroll: true });
  }
  function goToEvents() {
    showMapTools(false);
    const heading = document.getElementById('sideTitle');
    heading.scrollIntoView({ block: 'start', behavior: 'instant' });
    heading.focus({ preventScroll: true });
  }
  document.querySelectorAll('[data-atlas-jump]').forEach(button => {
    button.onclick = button.dataset.atlasJump === 'map' ? goToMap : goToEvents;
  });
  const editYear = () => {
    const input = document.getElementById('gotoInput');
    input.value = state.year <= -1000000 ? `${Math.abs(state.year) / 1000000} Ma` : fmt(state.year);
    input.scrollIntoView({ block: 'center', behavior: 'instant' });
    input.focus({ preventScroll: true }); input.select();
  };
  document.getElementById('mobileDate').onclick = editYear;
  document.getElementById('previousEvent').onclick = () => stepEvent(-1);
  document.getElementById('nextEvent').onclick = () => stepEvent(1);
  document.getElementById('resetFilters').onclick = () => {
    for (const cat of Object.keys(CATS)) if (cat !== 'migrations') state.cats.add(cat);
    buildMarks(); update();
  };
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
  // The map receives the space left by the actual header and time dock.
  const measureLayout = () => {
    const root = document.documentElement;
    root.style.setProperty('--atlas-header-height', `${document.querySelector('.app > header').offsetHeight}px`);
    root.style.setProperty('--atlas-dock-height', `${document.querySelector('.time').offsetHeight}px`);
  };
  const layoutObserver = new ResizeObserver(measureLayout);
  layoutObserver.observe(document.querySelector('.app > header'));
  layoutObserver.observe(document.querySelector('.time'));
  measureLayout();

  function positionOptions() {
    if (!options.open) return;
    const anchor = options.getBoundingClientRect();
    const above = anchor.top - 28;
    const below = innerHeight - anchor.bottom - 28;
    const openBelow = above < Math.min(optionsContent.scrollHeight, 220) && below > above;
    optionsContent.classList.toggle('opens-below', openBelow);
    optionsContent.style.setProperty('--options-space', `${Math.max(0, openBelow ? below : above)}px`);
  }
  window.addEventListener('resize', positionOptions);
  window.addEventListener('scroll', positionOptions, { passive: true });
  options.addEventListener('click', () => requestAnimationFrame(positionOptions));
  const notes = [...document.querySelectorAll('.population-heading details, .timeline-help')];
  function positionNotes() {
    for (const note of notes) {
      if (!note.open) continue;
      const content = note.querySelector('.population-method, p');
      const anchor = note.getBoundingClientRect();
      const above = anchor.top - 72, below = innerHeight - anchor.bottom - 20;
      const openBelow = above < Math.min(content.scrollHeight, 260) && below > above;
      note.classList.toggle('opens-below', openBelow);
      note.style.setProperty('--note-space', `${Math.max(0, openBelow ? below : above)}px`);
    }
  }
  notes.forEach(note => note.addEventListener('toggle', positionNotes));
  window.addEventListener('resize', positionNotes);
  window.addEventListener('scroll', positionNotes, { passive: true });

  function closeMenus(restoreFocus = false) {
    for (const trigger of triggers) {
      const panel = document.getElementById(trigger.dataset.atlasMenu);
      if (restoreFocus && panel.contains(document.activeElement)) trigger.focus();
      panel.hidden = true;
      trigger.setAttribute('aria-expanded', 'false');
    }
  }
  function openMenu(trigger) {
    closeMenus();
    options.open = false;
    document.getElementById(trigger.dataset.atlasMenu).hidden = false;
    trigger.setAttribute('aria-expanded', 'true');
    positionMenus();
  }
  function positionMenus() {
    for (const trigger of triggers) {
      const panel = document.getElementById(trigger.dataset.atlasMenu);
      if (panel.hidden) continue;
      const toolbar = trigger.closest('.atlas-toolbar');
      if (toolbar) {
        const anchor = toolbar.getBoundingClientRect();
        // Long catalogues need enough room for a complete result below their controls.
        const top = panel.id === 'womensRightsPanel' && innerWidth > 860
          ? Math.min(anchor.bottom + 10, innerHeight - 560) : anchor.bottom + 10;
        panel.style.setProperty('--atlas-menu-top', `${Math.max(12, top)}px`);
        panel.style.setProperty('--atlas-menu-right', `${Math.max(12, innerWidth - anchor.right)}px`);
      }
      panel.style.setProperty('--atlas-menu-space', `${Math.max(0, innerHeight - panel.getBoundingClientRect().top - 12)}px`);
    }
  }
  window.addEventListener('resize', positionMenus);
  window.addEventListener('scroll', positionMenus, { passive: true });
  for (const trigger of triggers) trigger.onclick = () => {
    if (trigger.getAttribute('aria-expanded') === 'true') closeMenus();
    else openMenu(trigger);
  };
  options.addEventListener('toggle', () => { if (options.open) { closeMenus(); positionOptions(); } });
  document.addEventListener('pointerdown', (event) => {
    if (!event.target.closest('.atlas-menu')) closeMenus();
    if (!options.contains(event.target)) options.open = false;
    if (!event.target.closest('#mapTools') && !toolsToggle.contains(event.target)) showMapTools(false);
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeMenus(true);
      if (options.open) { options.open = false; options.querySelector('summary').focus(); }
      if (mobile.matches && stage.classList.contains('tools-open')) { showMapTools(false); toolsToggle.focus(); }
    }
  });
  document.addEventListener('focusin', (event) => {
    if (!event.target.closest('.atlas-menu')) closeMenus();
    if (!options.contains(event.target)) options.open = false;
  });

  document.getElementById('editDate').onclick = editYear;

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
  historyNote.innerHTML = '<summary>Approximate historical borders <span aria-hidden="true">ⓘ</span></summary><p>Dashed lines are simplified reconstructions. Frontiers could be fluid or disputed. Coverage gaps do not mean uninhabited land. Open Layers for coverage and sources.</p>';
  document.getElementById('mapContext').append(historyNote);
  cv.setAttribute('aria-describedby', 'mapKeyboardHelp mapContext');

  // Guidance disappears after the first map interaction, and respects reduced motion.
  const hint = document.querySelector('.stage-hint');
  function dismissHint() { hint.hidden = true; }
  cv.addEventListener('pointerdown', dismissHint, { once: true });
  cv.addEventListener('wheel', dismissHint, { once: true, passive: true });
  setTimeout(dismissHint, 7000);

  let lastKey = '', lastPeriodKey = '';
  window.AtlasUI = { goToMap, goToEvents, render() {
    window.HistoryLayers?.render();
    window.HistoryMigrations?.render();
    window.HistoryWomensRights?.render();
    window.HistoryWomensColors?.render();
    const years = HistoryDiscovery.displayedYears();
    const periodKey = `${years}/${state.sel}/${state.borders}/${[...state.cats]}/${HistoryDiscovery.isComparing()}`;
    if (periodKey === lastPeriodKey) return;
    lastPeriodKey = periodKey;
    document.getElementById('mobileDate').textContent = fmt(state.year);
    const available = ev.filter(event => state.cats.has(event.cat));
    document.getElementById('previousEvent').disabled = !available.some(event => event.start < state.year);
    document.getElementById('nextEvent').disabled = !available.some(event => event.start > state.year);
    const emptyPair = !HistoryDiscovery.contemporaryPair() && !DiscoveryCore.contemporaryPair(ppl, state.year);
    const pairCard = document.querySelector('.contemporaries-card');
    if (pairCard) pairCard.hidden = emptyPair;
    const deep = years.some((year) => year < -1000000);
    const human = years.some((year) => year >= -1000000);
    const key = `${deep}/${human}/${state.borders}/${[...state.cats].sort().join(',')}/${HistoryDiscovery.isComparing()}`;
    if (key === lastKey) return;
    lastKey = key;
    const relevant = Object.keys(CATS).filter((cat) => cat !== 'migrations' && (cat === 'dinosaurs' ? deep : human));
    for (const chip of document.querySelectorAll('#legend [data-k]')) {
      chip.hidden = !relevant.includes(chip.dataset.k);
      chip.setAttribute('aria-pressed', String(state.cats.has(chip.dataset.k)));
    }
    const hiddenCount = relevant.filter(cat => !state.cats.has(cat)).length;
    document.getElementById('filterCount').textContent = hiddenCount ? `${hiddenCount} hidden` : 'All';
    document.getElementById('resetFilters').disabled = !hiddenCount;
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
