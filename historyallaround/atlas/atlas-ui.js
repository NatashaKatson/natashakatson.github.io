/* Compact map controls. Existing atlas state and navigation remain the source of truth. */
(() => {
  const triggers = [...document.querySelectorAll('[data-atlas-menu]')];
  const options = document.querySelector('.dock-options');
  const optionsContent = options.querySelector('.dock-options-content');
  optionsContent.append(document.querySelector('.discovery-tools'));

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
  }
  for (const trigger of triggers) trigger.onclick = () => {
    if (trigger.getAttribute('aria-expanded') === 'true') closeMenus();
    else openMenu(trigger);
  };
  options.addEventListener('toggle', () => { if (options.open) closeMenus(); });
  document.addEventListener('pointerdown', (event) => {
    if (!event.target.closest('.atlas-menu')) closeMenus();
    if (!options.contains(event.target)) options.open = false;
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeMenus(true);
      if (options.open) { options.open = false; options.querySelector('summary').focus(); }
    }
  });
  document.addEventListener('focusin', (event) => {
    if (!event.target.closest('.atlas-menu')) closeMenus();
    if (!options.contains(event.target)) options.open = false;
  });

  document.getElementById('editDate').onclick = () => {
    const input = document.getElementById('gotoInput');
    input.value = state.year <= -1000000 ? `${Math.abs(state.year) / 1000000} Ma` : fmt(state.year);
    input.focus(); input.select();
  };

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
  cv.setAttribute('aria-describedby', 'mapContext');

  // Guidance disappears after the first map interaction, and respects reduced motion.
  const hint = document.querySelector('.stage-hint');
  function dismissHint() { hint.hidden = true; }
  cv.addEventListener('pointerdown', dismissHint, { once: true });
  cv.addEventListener('wheel', dismissHint, { once: true, passive: true });
  setTimeout(dismissHint, 7000);

  let lastKey = '';
  window.AtlasUI = { render() {
    const years = HistoryDiscovery.displayedYears();
    const deep = years.some((year) => year < -1000000);
    const human = years.some((year) => year >= -1000000);
    const key = `${deep}/${human}/${state.borders}/${[...state.cats].sort().join(',')}/${HistoryDiscovery.isComparing()}`;
    if (key === lastKey) return;
    lastKey = key;
    const relevant = Object.keys(CATS).filter((cat) => cat === 'dinosaurs' ? deep : human);
    for (const chip of document.querySelectorAll('#legend [data-k]')) {
      chip.hidden = !relevant.includes(chip.dataset.k);
      chip.setAttribute('aria-pressed', String(state.cats.has(chip.dataset.k)));
    }
    document.getElementById('filterCount').textContent = relevant.filter((cat) => state.cats.has(cat)).length;
    document.getElementById('filterContext').textContent = deep && human ? 'Categories for both displayed periods.' : deep ? 'Fossil records for this period.' : 'Event categories for this period.';
    const dinosaursEnabled = state.cats.has('dinosaurs');
    browse.hidden = !deep || !dinosaursEnabled;
    for (const button of choices.querySelectorAll('[data-dinosaur-destination]')) button.hidden = !dinosaursEnabled;
    historyNote.hidden = !human || state.borders !== 'history';
    document.querySelector('.population-strip').hidden = deep && !human;
    stage.classList.toggle('deep-time-only', deep && !human);
  } };
  AtlasUI.render();
})();
