/* Local search across the Atlas's records, historical coverage, and modern places. */
(() => {
  const core = DiscoveryCore;
  const kinds = { all: "All", event: "Events", dinosaur: "Dinosaurs", person: "People", state: "States & empires", place: "Places" };
  const regionNames = typeof Intl.DisplayNames === "function"
    ? new Intl.DisplayNames(["en"], { type: "region" }) : null;
  const countryName = (code) => {
    try { return regionNames?.of(code) || code; } catch (_) { return code; }
  };
  const localRecords = core.prepareSearch([
    ...ev.map((r) => ({ kind: r.cat === "dinosaurs" ? "dinosaur" : "event", title: r.title, aliases: [r.wiki.replaceAll("_", " "), ...(r.aliases || []), ...(r.indigenous?.aliases || []), ...(r.cat === "dinosaurs" ? ["dinosaur", "dinosaurs"] : []), ...(r.wiki === "Tyrannosaurus" ? ["T. rex", "T rex", "Tyrannosaurus rex"] : [])],
      description: r.blurb, start: r.start, end: r.end, approx: r.approx,
      lon: r.lon, lat: r.lat, recordId: r.id })),
    ...ppl.map((r) => ({ kind: "person", title: r.name, aliases: [r.wiki.replaceAll("_", " ")],
      description: r.role, start: r.born, end: r.died, approx: r.approx,
      lon: r.lon, lat: r.lat, recordId: r.id })),
    ...lo.countries.map((f) => {
      const [lon, lat] = d3.geoCentroid(f);
      return { kind: "place", title: f.properties.name, aliases: [],
        description: "Present-day country or territory", lon, lat };
    }),
  ]);
  const datasets = [
    { url: "search-states.json", label: "states and empires", records: [], loaded: false, error: false },
    { url: "search-places.json", label: "cities", records: [], loaded: false, error: false },
  ];
  const dialog = document.createElement("dialog");
  dialog.id = "historySearch";
  dialog.className = "history-search";
  dialog.setAttribute("aria-labelledby", "historySearchTitle");
  dialog.innerHTML = `<div class="history-search-heading"><h2 id="historySearchTitle">Search across history</h2><button type="button" data-search-close aria-label="Close search">×</button></div>
    <form role="search"><label for="historySearchInput">A dinosaur, place, person, event, or empire</label><input id="historySearchInput" type="search" autocomplete="off" placeholder="T. rex, Rome, Cleopatra…" maxlength="160" aria-describedby="historySearchHelp" aria-controls="historySearchResults"><button type="submit" class="search-submit">Search</button></form>
    <div class="history-search-filters" role="group" aria-label="Result type">${Object.entries(kinds).map(([kind, label]) => `<button type="button" data-search-kind="${kind}" aria-pressed="${kind === "all"}">${label}</button>`).join("")}</div>
    <p id="historySearchStatus" role="status" aria-live="polite"></p><button type="button" data-search-retry hidden>Retry loading missing results</button>
    <div id="historySearchResults" aria-label="Search results"></div>
    <p id="historySearchHelp">Search the Atlas's recorded history. Present-day place names locate a point at your chosen year; they do not establish when a settlement existed.</p>
    <p class="history-search-credits">Places: <a href="https://www.geonames.org/" target="_blank" rel="noopener">GeoNames</a> and Natural Earth. Historical coverage: Cliopatria / Seshat. GeoNames and Cliopatria: <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener">CC BY 4.0</a>.</p>`;
  document.body.append(dialog);
  const input = dialog.querySelector("input");
  const results = dialog.querySelector("#historySearchResults");
  const status = dialog.querySelector("#historySearchStatus");
  const retry = dialog.querySelector("[data-search-retry]");
  let filter = "all", matches = [], requestToken = 0, timer, navigating = false;
  let returnFocus;

  function dateLabel(r) {
    if (r.kind === "place") return `Present-day place · explore ${fmt(state.year)}`;
    const span = fmtSpan(r.start, r.end === r.start ? null : r.end, r.approx);
    return r.kind === "state" ? `Mapped ${span} · open ${fmt(r.year)}` : span;
  }
  function renderResults() {
    if (!dialog.open) return;
    const focusedButton = document.activeElement;
    const focusedRecord = results.contains(focusedButton) && focusedButton.matches("[data-search-result]")
      ? matches[+focusedButton.dataset.searchResult] : null;
    const query = input.value.trim();
    const loading = datasets.filter((d) => !d.loaded && !d.error);
    const failed = datasets.filter((d) => d.error);
    retry.hidden = !failed.length;
    matches = core.search([...localRecords, ...datasets.flatMap((d) => d.records)], query, filter);
    if (core.searchText(query).length < 2) {
      status.textContent = "Type at least two characters to search.";
      results.innerHTML = `<div class="search-examples"><span>Try</span>${["Roman Empire", "Cleopatra", "Vancouver", "Pig War"].map((q) => `<button type="button" data-search-example="${q}">${q}</button>`).join("")}</div>`;
      results.querySelectorAll("[data-search-example]").forEach((b) => b.onclick = () => {
        input.value = b.dataset.searchExample;
        requestToken++;
        input.focus();
        renderResults();
      });
    } else {
      status.textContent = `${matches.length ? `${matches.length === 16 ? "Top " : ""}${matches.length} result${matches.length === 1 ? "" : "s"}` : "No matching records yet. Try a shorter name or another spelling."}${loading.length ? ` Loading ${loading.map((d) => d.label).join(" and ")}…` : ""}${failed.length ? ` Could not load ${failed.map((d) => d.label).join(" and ")}; results are incomplete.` : ""}`;
      results.innerHTML = matches.map((r, i) => `<button type="button" class="history-search-result" data-search-result="${i}"><span class="search-result-kind">${esc(kinds[r.kind])}</span><strong>${esc(r.title)}</strong><span class="search-result-date">${esc(dateLabel(r))}</span>${r.description ? `<small>${esc(r.description)}</small>` : ""}</button>`).join("");
      results.querySelectorAll("[data-search-result]").forEach((b) => b.onclick = () => navigate(+b.dataset.searchResult));
    }
    results.setAttribute("aria-busy", String(navigating));
    // Index downloads can insert or reorder results while a visitor uses the keyboard.
    if (focusedRecord) {
      const index = matches.indexOf(focusedRecord);
      (results.querySelector(`[data-search-result="${index}"]`) || input).focus();
    }
  }
  async function loadDataset(d) {
    if (d.loaded || d.pending) return;
    d.error = false;
    d.pending = true;
    try {
      const response = await fetch(d.url);
      if (!response.ok) throw new Error("Search data unavailable");
      const data = await response.json();
      if (data.version !== 1 || !Array.isArray(data.rows)) throw new Error("Unsupported search index");
      d.records = core.prepareSearch(d.url === "search-states.json"
        ? data.rows.map(([title, start, end, year, lon, lat, wiki, member, basis]) => ({
          kind: "state", title, start, end, year, lon, lat, wiki, member,
          aliases: [wiki.replaceAll("_", " "), ...(title === "New France" ? ["Nouvelle-France", "French Canada"] : [])],
          description: [member && member !== title ? `Mapped as part of ${member}` : "Historical political coverage", basis].filter(Boolean).join(" · "),
        }))
        : data.rows.map(([name, country, lon, lat, population, geonameId, aliases, region]) => ({
          kind: "place", title: [...new Set([name, region, countryName(country)].filter(Boolean))].join(", "), aliases: [name, ...aliases],
          description: "Present-day populated place", lon, lat, population, geonameId,
        })));
      d.loaded = true;
    } catch (_) { d.error = true; }
    finally { d.pending = false; renderResults(); }
  }
  function openSearch() {
    if (dialog.open) { input.focus(); return; }
    returnFocus = document.activeElement;
    stopPlay();
    dialog.showModal();
    input.focus();
    input.select();
    datasets.forEach(loadDataset);
    renderResults();
  }
  function closeSearch() {
    requestToken++;
    navigating = false;
    clearTimeout(timer);
    dialog.close();
    returnFocus?.focus({ preventScroll: true });
  }
  async function navigate(index) {
    const record = matches[index];
    if (!record) return;
    const token = ++requestToken;
    navigating = true;
    results.setAttribute("aria-busy", "true");
    status.textContent = `Opening ${record.title}…`;
    try {
      const opened = await HistoryDiscovery.jumpSearch(record, () => token === requestToken && dialog.open);
      if (opened && token === requestToken) {
        closeSearch();
        // Map navigation finishes before moving keyboard focus out of the dialog.
        document.getElementById("detail").setAttribute("tabindex", "-1");
        document.getElementById("detail").focus({ preventScroll: true });
        if (innerWidth <= 860) document.getElementById("detail").scrollIntoView({ block: "start", behavior: "smooth" });
      }
    } catch (error) {
      if (token === requestToken) status.textContent = error.message;
    } finally {
      if (token === requestToken) { navigating = false; results.setAttribute("aria-busy", "false"); }
    }
  }
  dialog.querySelector("[data-search-close]").onclick = closeSearch;
  dialog.addEventListener("cancel", (e) => { e.preventDefault(); closeSearch(); });
  dialog.addEventListener("click", (e) => { if (e.target === dialog) {
    const r = dialog.getBoundingClientRect();
    if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) closeSearch();
  } });
  input.addEventListener("input", () => {
    requestToken++; navigating = false;
    clearTimeout(timer);
    timer = setTimeout(renderResults, 100);
  });
  dialog.querySelector("form").onsubmit = (e) => {
    e.preventDefault(); clearTimeout(timer); renderResults(); if (matches.length) navigate(0);
  };
  dialog.querySelectorAll("[data-search-kind]").forEach((b) => b.onclick = () => {
    requestToken++; navigating = false;
    filter = b.dataset.searchKind;
    dialog.querySelectorAll("[data-search-kind]").forEach((c) => c.setAttribute("aria-pressed", c === b));
    renderResults();
  });
  retry.onclick = () => { datasets.filter((d) => d.error).forEach(loadDataset); renderResults(); };
  dialog.addEventListener("keydown", (e) => {
    if (!["ArrowDown", "ArrowUp"].includes(e.key) ||
      !(e.target === input || e.target.matches("[data-search-result]"))) return;
    const buttons = [...results.querySelectorAll("[data-search-result]")];
    if (!buttons.length) return;
    e.preventDefault();
    const index = buttons.indexOf(document.activeElement);
    const next = index < 0 ? (e.key === "ArrowDown" ? 0 : buttons.length - 1)
      : index + (e.key === "ArrowDown" ? 1 : -1);
    if (next < 0 || next >= buttons.length) input.focus(); else buttons[next].focus();
  });
  document.addEventListener("keydown", (e) => {
    const editing = e.target.closest?.("input, textarea, select, [contenteditable=true]");
    if (((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") ||
      (e.key === "/" && !editing && !e.metaKey && !e.ctrlKey && !e.altKey)) {
      e.preventDefault(); openSearch();
    }
  });
})();
