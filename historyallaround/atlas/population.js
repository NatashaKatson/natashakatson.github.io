/* Sourced world-population readout. Helpers are also exported for regression tests. */
(function (root) {
  const api = {
    at(rows, year) {
      if (!Number.isFinite(year) || year === 0 || !rows.length || year < rows[0][0] || year > rows.at(-1)[0]) return null;
      let lo = 0, hi = rows.length - 1;
      while (lo < hi) {
        const mid = (lo + hi) >>> 1;
        if (rows[mid][0] < year) lo = mid + 1; else hi = mid;
      }
      const upper = rows[lo];
      if (upper[0] === year) return { value: upper[1], projected: !!upper[2], interpolated: false };
      const lower = rows[lo - 1];
      return {
        value: lower[1] + (upper[1] - lower[1]) * (year - lower[0]) / (upper[0] - lower[0]),
        projected: !!upper[2], interpolated: true,
      };
    },
    format(value, year) {
      const scale = value >= 1e9 ? 1e9 : value >= 1e6 ? 1e6 : 1e3;
      const unit = scale === 1e9 ? 'billion' : scale === 1e6 ? 'million' : 'thousand';
      const precision = year < 1800 ? 2 : 3;
      return '≈ ' + (value / scale).toLocaleString('en-US', {
        maximumSignificantDigits: precision,
      }) + ' ' + unit;
    },
  };
  if (typeof module === 'object') { module.exports = api; return; }
  root.PopulationTimeline = api;
  const strip = document.createElement('section');
  strip.className = 'population-strip';
  strip.setAttribute('aria-label', 'Estimated world population at the selected time');
  strip.innerHTML = `<div class="population-heading"><b>World population</b><details><summary>Sources &amp; method</summary><div class="population-method"><p>Approximate world totals, not counts for a selected territory. Historical figures are estimates. Between published samples, the readout uses linear interpolation; ancient estimates are especially uncertain.</p><p>Sources: HYDE 3.3 (before 1800), Gapminder v7 (1800–1949), and UN World Population Prospects 2024 (1950 onward), processed by <a href="https://ourworldindata.org/grapher/population-long-run-with-projections" target="_blank" rel="noopener">Our World in Data ↗</a>. From 2024, values are UN medium-variant <strong>projections</strong>.</p><p>Figures are rounded to two significant digits before 1800 and three afterward. No values are extrapolated outside the published range. <a href="https://ourworldindata.org/population-sources" target="_blank" rel="noopener">About the sources ↗</a></p></div></details></div><div class="population-values">Loading population estimates…</div><button type="button" class="population-retry" hidden>Retry population data</button>`;
  document.querySelector('.controls').after(strip);
  const values = strip.querySelector('.population-values');
  const retry = strip.querySelector('.population-retry');
  let data = null, failed = false, loading = false, lastKey = '', selectedYear = state.year, leftYear = null;
  api.render = function (year, left = null) {
    selectedYear = year; leftYear = left;
    const key = `${year}/${left}/${data ? 'ready' : failed ? 'failed' : 'loading'}`;
    if (key === lastKey) return;
    lastKey = key;
    if (!data) {
      values.textContent = failed ? 'Population estimates unavailable.' : 'Loading population estimates…';
      retry.hidden = !failed;
      return;
    }
    retry.hidden = true;
    const years = left === null ? [[null, year]] : [['Left', left], ['Right', year]];
    values.innerHTML = years.map(([side, y]) => {
      const estimate = api.at(data.rows, y);
      const label = estimate ? estimate.projected ? 'UN projection' : estimate.interpolated ? 'Interpolated estimate' : 'Historical estimate' : 'Outside source coverage';
      return `<div class="population-value"><span>${side ? side + ' · ' : ''}${esc(fmt(y))}</span><strong>${estimate ? api.format(estimate.value, y) : 'No estimate'}</strong><small>${label}</small></div>`;
    }).join('');
  };
  async function load() {
    if (loading) return;
    loading = true; failed = false; lastKey = ''; api.render(selectedYear, leftYear);
    try {
      const response = await fetch('population.json');
      if (!response.ok) throw new Error('Population data unavailable');
      const value = await response.json();
      if (value.version !== 1 || value.entity !== 'World' || !Array.isArray(value.rows) || !value.rows.length ||
        !value.rows.every((r, i, rows) => Array.isArray(r) && r.length === 3 && Number.isInteger(r[0]) &&
          Number.isFinite(r[1]) && r[1] > 0 && [0, 1].includes(r[2]) && (i === 0 || r[0] > rows[i - 1][0]))) throw new Error('Invalid population series');
      data = value;
    } catch (_) { failed = true; }
    finally { loading = false; lastKey = ''; api.render(selectedYear, leftYear); }
  }
  retry.onclick = load;
  api.render(state.year);
  load();
})(typeof window === 'object' ? window : globalThis);
