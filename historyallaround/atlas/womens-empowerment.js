/* A separate country-color filter, independent of milestone/category visibility. */
(() => {
  const core = WomensEmpowermentCore;
  const source = 'https://ourworldindata.org/grapher/women-political-empowerment-index';
  const panel = document.getElementById('womensRightsPanel');
  const trigger = document.querySelector('[data-atlas-menu="womensRightsPanel"]');
  const milestones = document.createElement('div');
  milestones.className = 'rights-milestones-pane';milestones.id = 'rightsMilestonesPane';
  for(const child of [...panel.children])if(!child.classList.contains('rights-heading'))milestones.append(child);
  const tabs = document.createElement('div');tabs.className = 'rights-view-tabs';
  tabs.setAttribute('role','group');tabs.setAttribute('aria-label','Women’s rights view');
  tabs.innerHTML = '<button type="button" id="rightsMilestonesTab" aria-pressed="true" aria-controls="rightsMilestonesPane">Milestones</button><button type="button" id="rightsColorsTab" aria-pressed="false" aria-controls="rightsColorsPane">Country colors</button>';
  const colors = document.createElement('div');colors.id = 'rightsColorsPane';colors.className = 'rights-colors-pane';colors.hidden = true;
  const ramp = `<div class="rights-color-ramp" aria-hidden="true">${core.bands.map(band=>`<i style="background:${band.color}"></i>`).join('')}</div><div class="rights-color-extremes"><span>0 · Less empowerment</span><span>More · 1</span></div><div class="rights-color-missing"><i style="background:${core.missing}" aria-hidden="true"></i>Grey · no comparable data</div>`;
  colors.innerHTML = `<label class="rights-visibility"><span>Color countries by year</span><input type="checkbox" id="rightsColorToggle"></label>
    <p class="rights-color-explanation">Follow women’s civil liberties, civic participation and political representation through time.</p>
    ${ramp}<p class="rights-color-status" id="rightsColorStatus" role="status" aria-live="polite"></p><button type="button" id="rightsColorRetry" hidden>Retry loading scores</button>
    <div class="rights-color-years" aria-label="Explore a year">${[1900,1950,2000,2025].map(year=>`<button type="button" data-rights-year="${year}">${year}</button>`).join('')}</div>
    <p class="rights-color-instruction">Move the timeline or press Play to watch the colors change. Compare years to see both maps.</p>
    <details class="rights-color-method"><summary>What the colors mean &amp; sources</summary><p>The V-Dem Women’s Political Empowerment Index runs from 0 to 1. Colors use five equal-width bands; these are our display bands, not official country grades. Scores are country-level expert estimates, with broader coverage after 1900. They do not measure every economic right or abortion law.</p><p>Grey means no score or no reliable match to a historical map unit. A parent state’s score is not assigned to its territories. OWID’s historical series includes documented assignments from earlier ruling regimes. The latest scores are for 2025; a 2026 map explicitly uses those observations.</p><p><a href="${source}" target="_blank" rel="noopener">V-Dem v16 (2026) via Our World in Data ↗</a><br><a href="https://www.v-dem.net/documents/70/codebook_v16.pdf" target="_blank" rel="noopener">V-Dem method ↗</a> · <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noopener">Data: CC BY-SA 4.0 ↗</a></p></details>
    <label class="rights-search-label" for="rightsCountrySearch">Look up a country’s score</label><input type="search" id="rightsCountrySearch" placeholder="Afghanistan, Canada…" maxlength="100" autocomplete="off">
    <div class="rights-country-results" id="rightsCountryResults"></div>`;
  panel.append(tabs,milestones,colors);
  const toggle = colors.querySelector('#rightsColorToggle'),countrySearch = colors.querySelector('#rightsCountrySearch');
  const status = colors.querySelector('#rightsColorStatus'),retry = colors.querySelector('#rightsColorRetry');
  const countryResults = colors.querySelector('#rightsCountryResults');
  const legend = document.createElement('section');legend.className = 'rights-map-legend';legend.hidden = true;
  legend.setAttribute('aria-label','Women’s empowerment country colors');
  legend.innerHTML = `<button type="button" class="rights-legend-open">👩 Women’s empowerment <span aria-hidden="true">↗</span></button>${ramp}<div class="rights-map-years"></div>`;
  document.getElementById('mapContext').prepend(legend);
  let model = null, loading = false, failed = false, colorsOpen = false, lastKey = '';
  function showColors(on) {
    colorsOpen = on;milestones.hidden = on;colors.hidden = !on;
    tabs.querySelector('#rightsMilestonesTab').setAttribute('aria-pressed',String(!on));
    tabs.querySelector('#rightsColorsTab').setAttribute('aria-pressed',String(on));
    if(on)load();
    api.render();
  }
  tabs.querySelector('#rightsMilestonesTab').onclick = () => showColors(false);
  tabs.querySelector('#rightsColorsTab').onclick = () => showColors(true);
  legend.querySelector('button').onclick = () => {
    if(trigger.getAttribute('aria-expanded')!=='true')trigger.click();
    showColors(true);toggle.focus({preventScroll:true});
  };
  async function load() {
    if(model || loading)return;
    loading = true;failed = false;lastKey = '';api.render();
    try {
      const response = await fetch('womens-empowerment.json');
      if(!response.ok)throw Error(response.status);
      const data = await response.json();
      if(data.schemaVersion!==1 || data.indicator!=='v2x_gender' || !Array.isArray(data.entities))throw Error('Invalid score data');
      model = core.create(data);
    } catch (_) {failed = true;}
    loading = false;lastKey = '';api.render();renderDetail();draw();
  }
  toggle.onchange = () => {
    state.rightsColors = toggle.checked;
    if(state.rightsColors){load();if(state.borders==='off'){state.borders='history';syncBordersUI();}}
    lastKey = '';api.render();update();
  };
  retry.onclick = () => load();
  countrySearch.oninput = () => api.render();
  for(const button of colors.querySelectorAll('[data-rights-year]'))button.onclick = () => {stopPlay();setYear(+button.dataset.rightsYear);};
  function period(year) {
    if(year<1789)return `${fmt(year)} · no score data`;
    return year>2025?`${year} · latest scores: 2025`:`${year} scores`;
  }
  function score(feature,year,features=[]) {return model?.score(feature,year,core.aggregates(features)) || null;}
  const api = window.HistoryWomensColors = {
    get ready(){return !!model;},get failed(){return failed;},showColors,
    fillFor(features,year) {
      if(!state.rightsColors)return null;
      const aggregates = core.aggregates(features);
      return feature => core.color(model?.score(feature,year,aggregates));
    },
    score,
    label(feature,year,features) {
      if(!state.rightsColors)return '';
      const result = score(feature,year,features);
      return result?` · women’s empowerment ${result.value.toFixed(3)}/1 (${result.year}${result.year!==year?'; latest available':''})`:' · women’s empowerment: no comparable data';
    },
    detail(feature,year,features) {
      if(!state.rightsColors)return '';
      const result = score(feature,year,features);
      return `<section class="rights-score-card"><h4>👩 Women’s empowerment</h4><p>${result?`<strong>${result.value.toFixed(3)} / 1</strong> · ${result.year} observation${result.year!==year?` · latest available for the ${year} map`:''}<br>Index unit: ${esc(result.entity)}`:'No comparable score for this map unit and year.'}</p><p>Civil liberties, civic participation and political representation. A country-level estimate; local experiences and individual rights vary.</p><a href="${source}" target="_blank" rel="noopener">V-Dem / Our World in Data source ↗</a></section>`;
    },
    render() {
      if(state.rightsColors && !model && !loading && !failed)load();
      const years = HistoryDiscovery.displayedYears();
      const query = countrySearch.value.trim().toLowerCase();
      const key = JSON.stringify([years,state.rightsColors,state.borders,query,colorsOpen,!!model,loading,failed]);
      if(key===lastKey)return;lastKey = key;
      toggle.checked = !!state.rightsColors;
      trigger.classList.toggle('rights-colors-active',!!state.rightsColors);
      legend.hidden = !state.rightsColors;
      legend.querySelector('.rights-map-years').textContent = loading?'Loading scores…':failed?'Scores unavailable · open to retry':state.borders==='off'?'Borders off · enable a border map to see colors':years.map(period).join(' / ');
      status.textContent = loading?'Loading the historical scores…':failed?'Scores could not be loaded. Countries remain grey.':years.map(period).join(' · ');
      retry.hidden = !failed;
      if(!colorsOpen)return;
      if(!model){countryResults.textContent = loading?'Loading…':'Enable country colors or retry to load the scores.';return;}
      const units = model.data.entities.filter(unit=>`${unit.name} ${unit.code}`.toLowerCase().includes(query));
      // Text scores make the map usable without distinguishing red and green.
      countryResults.innerHTML = `<table><caption>Published scores · ${years.map(period).join(' / ')}</caption><thead><tr><th scope="col">Country / index unit</th>${years.map(year=>`<th scope="col">${year}</th>`).join('')}</tr></thead><tbody>${units.map(unit=>`<tr><th scope="row">${esc(unit.name)}</th>${years.map(year=>{const result=model.score({name:unit.name},year);return `<td><i aria-hidden="true" style="background:${core.color(result)}"></i>${result?result.value.toFixed(3):'No data'}</td>`;}).join('')}</tr>`).join('')}</tbody></table>${units.length?'':'<p>No matching country or historical unit.</p>'}`;
    },
  };
  if(state.rightsColors)showColors(true);else api.render();
})();
