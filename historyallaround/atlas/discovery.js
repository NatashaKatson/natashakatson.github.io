/* Atlas discovery integration. Reuses the existing projection, canvas, timeline and ledger. */
(() => {
  const core = DiscoveryCore;
  let place = null,
    searchPlace = null,
    placeToken = 0,
    lastPoint = null,
    pendingPoint = null,
    placeReturn = null;
  const trail = [];
  let activeDiscovery = null;
  let activeContemporaries = null;
  const discoveries = window.CuratedDiscoveries || [];
  function curatedSelection(value) {
    const story = discoveries.find((s) => s.id === value?.id);
    const index = story?.stops.findIndex((s) => s.id === value?.stop) ?? -1;
    return index >= 0 ? { story, index, stop: story.stops[index] } : null;
  }
  const trailPanel = document.createElement("div");
  trailPanel.className = "story-trail";
  trailPanel.hidden = true;
  document.getElementById("detail").before(trailPanel);
  const storyEdges = [
    {
      a: "Oregon_Treaty",
      b: "Pig_War_(1859)",
      reason: "An unresolved treaty boundary led to the San Juan dispute",
      source:
        "https://www.sos.wa.gov/archives/explore-our-collection/national-history-day-topic-guide/pig-war-pig-and-international-boundary-dispute",
    },
    {
      a: "Ukase_of_1821",
      b: "Alaska_boundary_dispute",
      reason: "The Alaska boundary case includes the earlier Russian ukases",
      source: "https://www.loc.gov/item/04004083/",
    },
  ];
  function renderTrail() {
    trailPanel.hidden = !trail.length;
    trailPanel.innerHTML = trail.length
      ? `<button type="button">← Back (${trail.length})</button> <span>Exploration trail</span>`
      : "";
    trailPanel.querySelector("button")?.addEventListener("click", () => {
      restore(trail.pop());
      renderTrail();
    });
  }
  function storyConnections(x) {
    const curated = storyEdges
      .filter((e) => e.a === x.wiki || e.b === x.wiki)
      .flatMap((edge) => {
        const target = [...ev, ...ppl].find(
          (r) => r.wiki === (edge.a === x.wiki ? edge.b : edge.a),
        );
        return target
          ? [{ record: target, reason: edge.reason, source: edge.source }]
          : [];
      });
    return [
      ...curated,
      ...core
        .connections(x, [...ev, ...ppl])
        .filter((c) => !curated.some((o) => o.record.id === c.record.id)),
    ].slice(0, 4);
  }
  function addStories(el, x) {
    let connections = storyConnections(x);
    const context = connections.length ? null : core.storyContext(
      x, [...ev, ...ppl], x.start ?? x.born ?? compare.selectedYear ?? state.year,
    );
    if (context) connections = context.connections;
    if (!connections.length) return;
    const section = document.createElement("section");
    section.className = "near";
    section.innerHTML = `<b>${context ? esc(context.title) : "Follow the story"}</b>${context ? `<p>${esc(context.description)}</p>` : ""}${connections.map((c, i) => `<div><button type="button" class="story-card" data-story="${i}"><b>${esc(c.record.title || c.record.name)}</b><small>${esc(fmt(c.record.start ?? c.record.born, c.record.approx))} · ${esc(c.reason)}</small></button><a target="_blank" rel="noopener" href="${esc(c.source)}">Source ↗</a></div>`).join("")}`;
    el.append(section);
    section.querySelectorAll("[data-story]").forEach(
      (b) =>
        (b.onclick = () => {
          trail.push(snapshot());
          if (trail.length > 30) trail.shift();
          const r = connections[+b.dataset.story].record;
          placeToken++;
          place = null;
          placeReturn = null;
          placePanel.hidden = true;
          lastPoint = null;
          searchPlace = null;
          stopPlay();
          if (r.cat) state.cats.add(r.cat);
          buildMarks();
          setYear(r.start ?? r.born);
          document
            .querySelectorAll("#legend [data-k]")
            .forEach((c) =>
              c.setAttribute("aria-pressed", state.cats.has(c.dataset.k)),
            );
          select(r.id, false);
          focusPoint([r.lon, r.lat]);
          renderTrail();
        }),
    );
  }
  const placePanel = document.createElement("section");
  placePanel.className = "discovery-panel";
  placePanel.hidden = true;
  placePanel.setAttribute("aria-label", "History of this place");
  document.querySelector(".side-content").prepend(placePanel);
  function snapshot() {
    return {
      pinned,
      activeComparisonStory,
      activeDiscovery,
      activeContemporaries,
      year: state.year,
      sel: state.sel,
      polity: selectedPolity,
      rot: rot.slice(),
      flatT: { ...flatT },
      zoom: zoomK,
      mode: state.mode,
      borders: state.borders,
      left: compare.left,
      split: compare.split,
      changed: document.getElementById("changedOutlines").checked,
      compare: compare.on,
      selectedYear: compare.selectedYear,
      cats: [...state.cats],
      lastPoint,
      searchPlace,
      placeState: place,
      placeReturn,
    };
  }
  function restore(s) {
    flyToken++;
    placeToken++;
    pinned = s.pinned ?? null;
    activeComparisonStory = s.activeComparisonStory ?? null;
    activeDiscovery = curatedSelection(s.activeDiscovery) ? s.activeDiscovery : null;
    activeContemporaries = s.activeContemporaries ?? null;
    place = s.placeState;
    placeReturn = s.placeReturn;
    placePanel.hidden = !place;
    if (place) renderPlace();
    lastPoint = s.lastPoint ?? null;
    searchPlace = s.searchPlace ?? null;
    stopPlay();
    stopSpin();
    state.cats = new Set(s.cats);
    document
      .querySelectorAll("#legend [data-k]")
      .forEach((c) =>
        c.setAttribute("aria-pressed", state.cats.has(c.dataset.k)),
      );
    buildMarks();
    state.year = s.year;
    state.sel = s.sel;
    selectedPolity = s.polity;
    setMode(s.mode);
    rot = s.rot;
    flatT = s.flatT;
    zoomK = s.zoom;
    if (compare.on !== s.compare)
      document.getElementById("compareToggle").click();
    // Enabling comparison selects historical borders; restore the saved layer afterward.
    state.borders = s.borders;
    compare.left = s.left;
    form.elements.left.value = fmt(s.left);
    document.getElementById("changedOutlines").checked = s.changed;
    setSplit(s.split);
    compare.selectedYear = s.selectedYear;
    slider.value = Math.round(tAt(s.year) * SLIDER_STEPS);
    syncBordersUI();
    update();
    if (place && !place.done) scanPlace(place);
  }
  function pointLabel(point) {
    return `${Math.abs(point[1]).toFixed(2)}°${point[1] < 0 ? "S" : "N"}, ${Math.abs(point[0]).toFixed(2)}°${point[0] < 0 ? "W" : "E"}`;
  }
  function locationName(point) {
    const water = waterAtYear(point);
    if (water) return water.water.properties.name;
    const country = (hi || lo).countries.find(
      (f) => inBox(f.bbox, point) && d3.geoContains(f, point),
    );
    return country ? country.properties.name : "Open water or unmapped land";
  }
  function focusPoint(point) {
    flyToken++;
    stopSpin();
    userMoved = true;
    if (state.mode === "globe") {
      rot = [-point[0], -point[1], 0];
    } else {
      makeProj();
      const p = proj(point);
      flatT.x += W / 2 - p[0];
      flatT.y += H / 2 - p[1];
    }
    draw();
  }
  function renderPlace() {
    if (!place) return;
    const p = place;
    placePanel.hidden = false;
    const rows = [
      ...core.coverage(p.coverage).map((r) => ({
        ...r,
        type: "coverage",
        title: r.name,
        description:
          r.member && r.member !== r.name
            ? "Mapped as part of " + r.member
            : "Mapped political coverage",
      })),
      ...p.events.map((e) => ({ ...e, type: "event", description: e.blurb })),
    ].sort((a, b) => a.start - b.start);
    placePanel.innerHTML = `<button type="button" data-return>Return to global timeline</button><h3>Location history: ${esc(locationName(p.point))}</h3><p><strong>Present-day location: ${esc(locationName(p.point))}</strong><br>${pointLabel(p.point)} · orange circle on the map</p><p>This timeline follows that exact location through time, not the whole highlighted state or empire. Historical borders may include several present-day countries.</p><p>Political coverage from Cliopatria, ${fmt(BFROM)}–${fmt(BTO)}. Mapped extents may include claims; they do not establish effective control, settlement, or absence of Indigenous peoples. Nearby events are within 50 km of their recorded marker, not necessarily at this point.</p><p role="status">${p.done ? "Search complete" : `Searching border files: ${p.checked}/${BIDX.chunks.length}`} ${p.failed ? "Some files could not be loaded; this history is incomplete." : ""}</p><div class="place-entries">${
      rows.length
        ? rows
            .slice(0, p.limit)
            .map(
              (r, i) =>
                `<button class="place-entry" type="button" data-place-row="${i}"><b>${esc(fmtSpan(r.start, r.end, r.approx))} · ${esc(r.title)}</b><small>${r.type === "coverage" ? "Mapped coverage · " : ""}${esc(r.description)}${r.basis ? " · " + esc(r.basis) : ""}</small></button>`,
            )
            .join("")
        : "<p>No records found here so far. Missing records do not imply this place was uninhabited.</p>"
    }</div>${rows.length > p.limit ? '<button type="button" data-more>Show more periods</button>' : ""}<p>Names and cultural or settlement history appear only where existing records describe them. This is not a complete local history.</p>`;
    placePanel.querySelector("[data-return]").onclick = () => {
      placeToken++;
      place = null;
      placePanel.hidden = true;
      const s = placeReturn;
      placeReturn = null;
      restore(s);
    };
    placePanel.querySelector("[data-more]")?.addEventListener("click", () => {
      p.limit += 20;
      renderPlace();
    });
    placePanel.querySelectorAll("[data-place-row]").forEach(
      (b) =>
        (b.onclick = () => {
          const r = rows[+b.dataset.placeRow];
          stopPlay();
          setYear(r.start === 0 ? 1 : r.start);
          state.borders = "history";
          syncBordersUI();
          if (r.type === "event") {
            state.sel = r.id;
            selectedPolity = null;
            renderDetail();
          }
          focusPoint(p.point);
        }),
    );
  }
  async function explore(point) {
    if (!point) return;
    if (!place) placeReturn = snapshot();
    place = {
      point: point.slice(),
      coverage: [],
      events: core.nearby(ev, point),
      checked: 0,
      completedChunks: new Set(),
      failed: 0,
      done: false,
      limit: 20,
    };
    focusPoint(point);
    renderPlace();
    placePanel.scrollIntoView({ block: "nearest", behavior: "smooth" });
    await scanPlace(place);
  }
  async function scanPlace(p) {
    const token = ++placeToken;
    const point = p.point;
    // Two fetches at a time, only after an explicit exploration request. Retain the atlas's bounded cache.
    const chunks = BIDX.chunks.filter((c) => !p.completedChunks.has(c));
    let next = 0;
    async function worker() {
      while (next < chunks.length && token === placeToken) {
        const c = chunks[next++];
        const fs = await loadChunk(c);
        if (token !== placeToken) return;
        p.completedChunks.add(c);
        p.checked++;
        if (!fs) p.failed++;
        else {
          for (const f of fs)
            if (inBox(f.bbox, point) && d3.geoContains(f, point)) {
              const start = Math.max(f.from, c),
                end = Math.min(f.to, c + BCS - 1, BTO);
              if (start <= end)
                p.coverage.push({
                  start,
                  end,
                  name: f.name,
                  member: f.member,
                  wiki: f.wiki,
                  basis: f.basis,
                });
            }
          if (
            bCache.size > 14 &&
            c !== currentChunk() &&
            c !== chunkOf(compare.left)
          )
            bCache.delete(c);
        }
        if (p.checked % 10 === 0) renderPlace();
      }
    }
    await Promise.all([worker(), worker()]);
    if (token === placeToken) {
      p.done = true;
      renderPlace();
      draw();
    }
  }
  cv.addEventListener(
    "pointerdown",
    (e) => {
      flyToken++;
      const r = cv.getBoundingClientRect();
      pendingPoint = {
        x: e.clientX,
        y: e.clientY,
        point: proj.invert([e.clientX - r.left, e.clientY - r.top]),
      };
    },
    true,
  );
  cv.addEventListener("pointerup", (e) => {
    if (
      !pendingPoint ||
      Math.hypot(e.clientX - pendingPoint.x, e.clientY - pendingPoint.y) > 3 ||
      !pendingPoint.point
    )
      return;
    const p = pendingPoint.point;
    pendingPoint = null;
    searchPlace = null;
    if (
      !Number.isFinite(p[0]) ||
      !Number.isFinite(p[1]) ||
      Math.abs(p[1]) > 90 ||
      !visible(p[0], p[1])
    )
      return;
    const r = cv.getBoundingClientRect();
    if (
      state.mode === "globe" &&
      Math.hypot(
        e.clientX - r.left - proj.translate()[0],
        e.clientY - r.top - proj.translate()[1],
      ) > proj.scale()
    )
      return;
    if (byId[state.sel]?.cat === "dinosaurs" || state.year < -1000000) return;
    lastPoint = p.slice();
    queueMicrotask(() => {
      renderDetail();
      if (!document.querySelector("#detail .discovery-action"))
        addPlaceAction(document.getElementById("detail"), p);
    });
  });
  function addPlaceAction(el, point) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "discovery-action";
    b.textContent = "Explore this location: " + locationName(point);
    b.onclick = () => explore(point);
    el.append(b);
  }

  const compare = {
    on: false,
    left: 1453,
    split: 0.5,
    hoverYear: null,
    selectedYear: null,
  };
  const tools = document.createElement("div");
  tools.className = "discovery-tools";
  tools.innerHTML = `<button id="compareToggle" aria-pressed="false" type="button">Compare</button><form id="compareYears" hidden><label>Left year <input name="left" aria-label="Left comparison year" required value="1453"></label><label>Right year <input name="right" aria-label="Right comparison year" required value="${state.year}"></label><button>Apply years</button></form><label id="changeOption" hidden><input type="checkbox" id="changedOutlines"> Outline changed map records</label><span class="discovery-note" id="compareNote" hidden>The global timeline controls the right year. Enter BCE or CE; no year zero. Outlines mark changed geometry or political membership, not precise gains or losses; source borders are approximate.</span>`;
  document.querySelector(".time").prepend(tools);
  const divider = document.createElement("button");
  divider.type = "button";
  divider.className = "compare-divider";
  divider.hidden = true;
  divider.setAttribute("role", "slider");
  divider.setAttribute("aria-label", "Comparison divider");
  divider.setAttribute("aria-valuemin", "5");
  divider.setAttribute("aria-valuemax", "95");
  divider.innerHTML = '<span aria-hidden="true">↔</span>';
  stage.append(divider);
  const labels = ["left", "right"].map((side) => {
    const el = document.createElement("div");
    el.className = "compare-label " + side;
    el.hidden = true;
    stage.append(el);
    return el;
  });
  const status = document.createElement("div");
  status.className = "discovery-status";
  status.setAttribute("role", "status");
  document.querySelector(".time").append(status);
  const borderConfidence = document.createElement("details");
  borderConfidence.id = "borderConfidence";
  borderConfidence.className = "border-confidence";
  borderConfidence.innerHTML = '<summary><span aria-hidden="true" class="border-swatch"></span><span data-border-confidence>Approximate historical borders</span></summary><p>Dashed outlines show simplified historical reconstructions. Source extents can combine political claims, military control and administration; they do not define sovereign borders. Frontiers could be fluid or disputed, and effective control could vary within an outline. The source provides no confidence score for individual boundaries. Gaps mean missing coverage, not uninhabited land.</p><a href="https://github.com/Seshat-Global-History-Databank/cliopatria" target="_blank" rel="noopener">Cliopatria / Seshat source ↗</a>';
  document.querySelector(".borders-control").append(borderConfidence);
  const waterKey = document.createElement("p");
  waterKey.className = "water-key";
  waterKey.innerHTML = '<i aria-hidden="true"></i> Inland water · hover or tap for country context';
  document.querySelector(".borders-control").append(waterKey);
  cv.setAttribute("aria-describedby", "borderConfidence");
  function renderBorderConfidence() {
    const years = compare.on ? [compare.left, state.year] : [state.year];
    borderConfidence.hidden = state.borders !== "history" || years.every((year) => year < -1000000);
    waterKey.hidden = years.every((year) => year < -1000000);
    const available = years.filter((year) => !borderStatus(year)).length;
    borderConfidence.querySelector("[data-border-confidence]").textContent = available === years.length
      ? "Approximate historical borders" : available ? "Approximate borders · incomplete coverage" : "Historical borders · coverage unavailable";
  }
  function withYear(year, fn) {
    const saved = state.year;
    state.year = year;
    try {
      return fn();
    } finally {
      state.year = saved;
    }
  }
  function borderStatus(year) {
    const c = chunkOf(year);
    if (c === null)
      return `${fmt(year)}: no historical border coverage (available ${fmt(BFROM)}–${fmt(BTO)}).`;
    if (bErrors.has(c)) return `${fmt(year)}: historical borders unavailable`;
    if (!Array.isArray(bCache.get(c)))
      return `${fmt(year)}: loading historical borders`;
    return "";
  }
  function setSplit(value) {
    compare.split = Math.max(0.05, Math.min(0.95, value));
    divider.style.left = compare.split * 100 + "%";
    divider.setAttribute("aria-valuenow", Math.round(compare.split * 100));
    divider.setAttribute(
      "aria-valuetext",
      `${Math.round(compare.split * 100)} percent left map`,
    );
    draw();
  }
  divider.addEventListener("pointerdown", (e) => {
    divider.setPointerCapture(e.pointerId);
    stopSpin();
    e.preventDefault();
  });
  divider.addEventListener("pointermove", (e) => {
    if (divider.hasPointerCapture(e.pointerId)) {
      const r = stage.getBoundingClientRect();
      setSplit((e.clientX - r.left) / r.width);
    }
  });
  divider.addEventListener("keydown", (e) => {
    if (["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) {
      e.preventDefault();
      setSplit(
        e.key === "Home"
          ? 0.05
          : e.key === "End"
            ? 0.95
            : compare.split + (e.key === "ArrowLeft" ? -0.02 : 0.02),
      );
    }
  });
  document.getElementById("compareToggle").onclick = () => {
    compare.on = !compare.on;
    stopPlay();
    stopSpin();
    userMoved = true;
    compare.selectedYear = null;
    stage.classList.toggle("comparing", compare.on);
    divider.hidden = !compare.on;
    labels.forEach((el) => (el.hidden = !compare.on));
    document.getElementById("compareYears").hidden = !compare.on;
    document.getElementById("compareNote").hidden = !compare.on;
    document.getElementById("changeOption").hidden = !compare.on;
    document
      .getElementById("compareToggle")
      .setAttribute("aria-pressed", compare.on);
    if (compare.on) {
      state.borders = "history";
      syncBordersUI();
    }
    renderDetail();
    draw();
  };
  const form = document.getElementById("compareYears");
  form.onsubmit = (e) => {
    e.preventDefault();
    const vals = ["left", "right"].map((name) =>
      parseYear(form.elements[name].value),
    );
    for (let i = 0; i < 2; i++) {
      const input = form.elements[i];
      input.setCustomValidity(
        vals[i] === null ? "Enter a BCE or CE year, excluding zero." : "",
      );
      if (vals[i] === null) {
        input.reportValidity();
        return;
      }
    }
    compare.left = vals[0];
    if(vals.some((year)=>year<-300000))state.cats.add("dinosaurs");
    compare.selectedYear = null;
    stopPlay();
    setYear(vals[1]);
    draw();
  };
  form.addEventListener("input", (e) => e.target.setCustomValidity(""));
  document.getElementById("changedOutlines").onchange = draw;
  setSplit(0.5);
  // Discovery cards and exact-view links use stable source keys rather than array IDs.
  let pinned = null;
  let activeComparisonStory = null;
  const curatedShelf = document.createElement("section");
  curatedShelf.className = "curated-discoveries comparison-stories";
  curatedShelf.setAttribute("aria-label", "Curated discoveries");
  function discoveryCover(s) {
    const sameYear = s.format === "same-year";
    return `<button type="button" class="story-card curated-cover" data-discovery="${esc(s.id)}">${sameYear ? `<span class="same-year-preview" aria-hidden="true">${s.stops.map((stop) => `<img src="${esc(stop.image)}" alt="" width="120" height="80" loading="lazy">`).join("")}</span>` : ""}<b>${esc(s.title)}</b><span>${esc(s.subtitle)}</span><small>${esc(sameYear ? fmt(s.start) : fmtSpan(s.start, s.end))} · ${sameYear ? "Two places, one year" : `${s.stops.length} stops`} <span aria-hidden="true">↗</span></small></button>`;
  }
  curatedShelf.innerHTML = `<div class="kicker">Curated discoveries</div><div class="curated-catalog">${discoveries.filter((s) => s.format !== "same-year").map(discoveryCover).join("")}<h3>Meanwhile, elsewhere</h3><p>The same everyday need, in different countries. What supplies did people have?</p>${discoveries.filter((s) => s.format === "same-year").map(discoveryCover).join("")}</div><div class="curated-reader" hidden></div>`;
  document.getElementById("regions").before(curatedShelf);
  const curatedReader = curatedShelf.querySelector(".curated-reader");
  function sourceLinks(sources) {
    return sources.map(([label, url]) => `<a href="${esc(url)}" target="_blank" rel="noopener">${esc(label)} ↗</a>`).join(" · ");
  }
  function sameYearContent(story, index) {
    return `<div class="same-year-heading"><span>${esc(fmt(story.start))}</span><p>Same need · same year · two places</p></div><div class="same-year-pair">${story.stops.map((s, i) => `<article class="same-year-place"><figure><img src="${esc(s.image)}" alt="${esc(s.imageAlt)}" width="360" height="240"><figcaption>Illustration · not an archival photograph</figcaption></figure><div class="kicker">${esc(s.location)} · ${esc(s.evidenceLabel || (s.kind === "event" ? "Dated event" : "Period snapshot"))}</div><h4>${esc(s.title)}</h4><p>${esc(s.text)}</p><p class="curated-sources">${sourceLinks(s.sources)}</p><button type="button" data-curated-stop="${i}" ${i === index ? 'aria-current="location"' : ""}>Show on map · ${esc(s.location)}</button><p class="curated-context-note">${esc(s.mapNote)}</p></article>`).join("")}</div>${story.context ? `<aside class="same-year-context"><strong>${esc(story.contextTitle || "About this comparison")}</strong><p>${esc(story.context)}</p><p class="curated-sources">${sourceLinks(story.sources)}</p></aside>` : ""}`;
  }
  const evidenceLegend = document.createElement("div");
  evidenceLegend.className = "beringia-key";
  evidenceLegend.hidden = true;
  evidenceLegend.textContent = "Dated sites from different times; dashed corridors are hypotheses. Modern coastlines only, without reconstructed Ice Age land or ice.";
  const corridorKey = document.createElement("div");
  corridorKey.className = "beringia-corridors";
  for (const route of window.BeringiaEvidence?.routes || []) {
    const item = document.createElement("span");
    item.style.setProperty("--corridor-color", route.color);
    item.textContent = route.name;
    corridorKey.appendChild(item);
  }
  evidenceLegend.appendChild(corridorKey);
  stage.appendChild(evidenceLegend);
  function isEvidenceView() {
    const selected = curatedSelection(activeDiscovery);
    return !!selected && selected.story.id === "beringia-evidence" &&
      selected.stop.year === state.year && !compare.on;
  }
  function renderCurated() {
    evidenceLegend.hidden = !isEvidenceView();
    const selected = curatedSelection(activeDiscovery);
    const key = selected ? `${selected.story.id}/${selected.stop.id}` : "";
    const contemporariesCard = document.querySelector(".contemporaries-card");
    if (selected && curatedShelf.previousElementSibling === contemporariesCard) curatedShelf.after(contemporariesCard);
    else if (!selected && curatedShelf.nextElementSibling === contemporariesCard) curatedShelf.before(contemporariesCard);
    curatedReader.hidden = !selected;
    curatedShelf.querySelector(".curated-catalog").hidden = !!selected;
    if (!selected) { curatedReader.dataset.selection = ""; return; }
    const { story, stop, index } = selected;
    if (curatedReader.dataset.selection !== key) {
      curatedReader.dataset.selection = key;
      curatedReader.innerHTML = `<button type="button" data-curated-close>← All discoveries</button><h3 tabindex="-1" data-curated-heading>${esc(story.title)}</h3><p>${esc(story.introduction)}</p><p class="curated-sources">${sourceLinks(story.sources)}</p><nav class="curated-stops" aria-label="Discovery stops">${story.stops.map((s, i) => `<button type="button" data-curated-stop="${i}" ${i === index ? 'aria-current="step"' : ""}><span>${i + 1}</span> ${esc(s.location)}</button>`).join("")}</nav><div class="curated-stop"><div class="kicker">Stop ${index + 1} of ${story.stops.length} · ${stop.kind === "context" ? "Period snapshot" : "Dated event"} · ${esc(fmt(stop.year))}</div><h4>${esc(stop.title)}</h4><p>${esc(stop.text)}</p>${stop.kind === "context" ? "<p class=\"curated-context-note\">The map year is a window into this period, not an exact date for everything described here.</p>" : ""}<p class="curated-sources">${sourceLinks(stop.sources)}</p></div><p class="curated-map-status" role="status"></p><button type="button" data-curated-return hidden>Show this stop on the map</button><div class="curated-navigation"><button type="button" data-curated-prev ${index === 0 ? "disabled" : ""}>← Previous</button><button type="button" data-curated-next ${index === story.stops.length - 1 ? "disabled" : ""}>Next stop →</button></div><p class="curated-context-note">${esc(story.note || "A selection of contemporary histories, not a complete world survey or a claim that these places were connected. The circle locates a city or site; borders follow the Atlas's available coverage.")}</p>`;
      if (story.format === "same-year") {
        curatedReader.querySelector(".curated-stops").remove();
        curatedReader.querySelector(".curated-stop").outerHTML = sameYearContent(story, index);
        curatedReader.querySelector(".curated-navigation").hidden = true;
        curatedReader.querySelector(":scope > .curated-sources").hidden = true;
      }
      curatedReader.querySelectorAll("[data-curated-stop]").forEach((b) => b.onclick = () => openCurated(story.id, +b.dataset.curatedStop));
      curatedReader.querySelector("[data-curated-prev]").onclick = () => openCurated(story.id, index - 1);
      curatedReader.querySelector("[data-curated-next]").onclick = () => openCurated(story.id, index + 1);
      curatedReader.querySelector("[data-curated-return]").onclick = () => openCurated(story.id, index);
      curatedReader.querySelector("[data-curated-close]").onclick = () => {
        activeDiscovery = null;
        renderCurated(); update();
        curatedShelf.querySelector(`[data-discovery="${story.id}"]`).focus({ preventScroll: true });
      };
    }
    const atYear = state.year === stop.year && !compare.on;
    curatedReader.querySelector(".curated-map-status").textContent = atYear
      ? `Map · ${fmt(stop.year)} · ${stop.location}`
      : `You’re exploring ${fmt(state.year)}${compare.on ? " in comparison mode" : ""}. This stop opens ${fmt(stop.year)}.`;
    curatedReader.querySelector("[data-curated-return]").hidden = atYear;
  }
  function openCurated(id, index = 0) {
    const story = discoveries.find((s) => s.id === id);
    const stop = story?.stops[index];
    if (!stop) return;
    window.HistoryChallenge?.cancelPick();
    trail.push(snapshot());
    if (trail.length > 30) trail.shift();
    placeToken++; linkToken++;
    place = null; placeReturn = null; lastPoint = null; searchPlace = null;
    placePanel.hidden = true;
    pinned = null; activeComparisonStory = null;
    stopPlay(); stopSpin(); flyToken++; userMoved = true;
    if (compare.on) document.getElementById("compareToggle").click();
    activeDiscovery = { id, stop: stop.id };
    activeContemporaries = story.contemporaries || null;
    compare.selectedYear = null;
    state.borders = "history";
    state.sel = null;
    selectedPolity = null;
    syncBordersUI();
    setYear(stop.year);
    zoomK = stop.zoom || 1.8;
    focusPoint(stop.point);
    update(); renderTrail();
    curatedReader.querySelector("[data-curated-heading]").focus({ preventScroll: true });
    if (window.innerWidth <= 860) stage.scrollIntoView({ block: "center", behavior: "auto" });
  }
  curatedShelf.querySelectorAll("[data-discovery]").forEach((b) => b.onclick = () => openCurated(b.dataset.discovery));
  renderCurated();
  const comparisonStories = [
    {
      title: "From Nootka to the 49th parallel", left: 1789, right: 1846,
      wiki: "Oregon_Treaty", point: [-125, 49],
      text: "In 1789, Spain and Britain confronted one another at Nootka Sound. By 1846, Britain and the United States agreed a boundary at the 49th parallel, keeping Vancouver Island British. Compare two moments in imperial claims, not a continuous account of local sovereignty.",
      sources: [["Nootka Crisis", "https://en.wikipedia.org/wiki/Nootka_Crisis"], ["Oregon boundary", "https://sos.oregon.gov/blue-book/explore/pages/american.aspx"]],
    },
    {
      title: "A treaty, a channel, and a pig", left: 1846, right: 1859,
      wiki: "Pig_War_(1859)", point: [-123.09, 48.53],
      text: "The Oregon Treaty settled much of the boundary in 1846 but left the channel through the San Juan Islands unclear. In 1859, a shot pig triggered a military confrontation. The 1859 map is a moment in the dispute, not its final settlement.",
      sources: [["Washington State Archives", "https://www.sos.wa.gov/archives/explore-our-collection/national-history-day-topic-guide/pig-war-pig-and-international-boundary-dispute"]],
    },
    {
      title: "A Russian claim, an Alaska boundary case", left: 1821, right: 1903,
      wiki: "Alaska_boundary_dispute", point: [-135.31, 59.46],
      text: "The Russian ukase of 1821 asserted coastal and trading claims reaching south to 51°N. Russian ukases later appeared among the documents in the 1903 Alaska boundary case. This is a documentary connection across two dates, not evidence that the decree directly caused the later ruling.",
      sources: [["Russian decree", "https://en.wikipedia.org/wiki/Ukase_of_1821"], ["Library of Congress: boundary case", "https://www.loc.gov/item/04004083/"]],
    },
  ];
  const discoveryShelf = document.createElement("section");
  discoveryShelf.className = "comparison-stories";
  discoveryShelf.setAttribute("aria-label", "Curated comparison stories");
  discoveryShelf.innerHTML = `<details><summary>Three stories to explore</summary><p>Follow changing claims and boundaries in the Pacific Northwest.</p>${comparisonStories.map((s, i) => `<button type="button" class="story-card" data-comparison-story="${i}"><b>${esc(s.title)}</b><small>${fmt(s.left)} → ${fmt(s.right)}</small></button>`).join("")}</details><div class="comparison-explanation" hidden></div>`;
  document.getElementById("regions").before(discoveryShelf);
  const storyExplanation = discoveryShelf.querySelector(".comparison-explanation");
  function renderComparisonStory() {
    const s = comparisonStories[activeComparisonStory];
    const showing = s && compare.on && s.left === compare.left && s.right === state.year;
    const key = showing ? String(activeComparisonStory) : "none";
    if (storyExplanation.dataset.story === key) return;
    storyExplanation.dataset.story = key;
    storyExplanation.hidden = !showing;
    storyExplanation.innerHTML = showing ? `<h3>${esc(s.title)}</h3><p>${esc(s.text)}</p><p>These maps show approximate source coverage. They do not establish effective control or describe Indigenous sovereignty.</p><p>${s.sources.map(([label, url]) => `<a target="_blank" rel="noopener" href="${esc(url)}">${esc(label)} ↗</a>`).join(" · ")}</p><button type="button" data-story-close>Close story</button>` : "";
    storyExplanation.querySelector("[data-story-close]")?.addEventListener("click", () => {
      activeComparisonStory = null;
      renderComparisonStory();
    });
  }
  function openComparisonStory(index) {
    trail.push(snapshot());
    if (trail.length > 30) trail.shift();
    activeComparisonStory = index;
    activeDiscovery = null;
    activeContemporaries = null;
    pinned = null;
    placeToken++;
    place = null;
    placeReturn = null;
    placePanel.hidden = true;
    lastPoint = null;
    searchPlace = null;
    if (!compare.on) document.getElementById("compareToggle").click();
    const s = comparisonStories[index];
    compare.left = s.left;
    form.elements.left.value = fmt(s.left);
    state.borders = "history";
    syncBordersUI();
    setYear(s.right);
    const r = ev.find((r) => r.wiki === s.wiki);
    state.cats.add(r.cat);
    buildMarks();
    document.querySelectorAll("#legend [data-k]").forEach((b) =>
      b.setAttribute("aria-pressed", state.cats.has(b.dataset.k)));
    select(r.id, false, s.right);
    zoomK = 2.4;
    focusPoint(s.point);
    update();
    renderTrail();
  }
  discoveryShelf.querySelectorAll("[data-comparison-story]").forEach((b) =>
    b.onclick = () => openComparisonStory(+b.dataset.comparisonStory));
  function addMeanwhile(el, record) {
    if (record.kind !== "event") return;
    const year = compare.selectedYear ?? state.year;
    const others = core.meanwhile(record, ev, year);
    const section = el.querySelector(".meanwhile-slot");
    if (!section) return;
    section.className = "near meanwhile-slot";
    section.innerHTML = `<b>Meanwhile… in ${esc(fmt(year))}</b><p>Records elsewhere in this year, including continuing histories and dated events. Coincidence in time does not imply a causal connection; approximate dates remain approximate.</p>${pinned && pinned.id !== record.id ? `<button type="button" class="pinned-event">← Return to ${esc(pinned.title)} · ${esc(fmt(pinned.year))}</button>` : ""}${others.length ? others.map((r, i) => `<div class="meanwhile-card"><button type="button" class="story-card" data-meanwhile="${i}"><b>${esc(r.title)}</b><small>${esc(REGIONS[r.region])} · ${esc(fmtSpan(r.start, r.end !== r.start ? r.end : null, r.approx))}${core.isHistoricalContext(r, year) ? " · historical context" : ""}</small><span>${esc(r.blurb)}</span></button><a href="${esc(r.source || wikiUrl(r.wiki))}" target="_blank" rel="noopener">Source ↗</a></div>`).join("") : "<p>No records in other regions are available for this year.</p>"}`;
    section.querySelector(".pinned-event")?.addEventListener("click", () => {
      const anchor = pinned;
      trail.push(snapshot());
      if (trail.length > 30) trail.shift();
      setYear(anchor.year);
      select(anchor.id, false, anchor.year);
      focusPoint([anchor.lon, anchor.lat]);
      renderTrail();
    });
    section.querySelectorAll("[data-meanwhile]").forEach((b) => b.onclick = () => {
      trail.push(snapshot());
      if (trail.length > 30) trail.shift();
      if (!pinned) pinned = { ...record, year };
      const target = others[+b.dataset.meanwhile];
      state.cats.add(target.cat);
      buildMarks();
      document.querySelectorAll("#legend [data-k]").forEach((c) =>
        c.setAttribute("aria-pressed", state.cats.has(c.dataset.k)));
      setYear(year);
      select(target.id, false, year);
      focusPoint([target.lon, target.lat]);
      renderTrail();
    });
  }
  function viewData() {
    const r = byId[state.sel];
    return {
      v: 1, year: state.year, left: compare.left, mode: state.mode,
      borders: state.borders, rot: rot.slice(), pan: [flatT.x / W, flatT.y / H],
      zoom: zoomK, split: compare.split, compare: compare.on,
      changed: document.getElementById("changedOutlines").checked,
      selectedYear: compare.selectedYear, cats: [...state.cats],
      record: r ? { wiki: r.wiki, kind: r.kind, date: r.start ?? r.born } : null,
      polity: selectedPolity?.name || null,
      polityMember: selectedPolity?.member ?? null,
      point: place?.point || lastPoint || null,
      location: searchPlace,
      story: activeComparisonStory,
      discovery: activeDiscovery,
      contemporaries: activeContemporaries,
      pin: pinned ? { wiki: pinned.wiki, date: pinned.start, year: pinned.year } : null,
    };
  }
  function urlHash() {
    return challengeReturnHash || "#" + new URLSearchParams({ view: JSON.stringify(viewData()) });
  }
  const share = document.createElement("button");
  share.type = "button";
  share.className = "share-view";
  share.textContent = "Share this view";
  tools.append(share);
  const sharePanel = document.createElement("div");
  sharePanel.className = "share-panel";
  sharePanel.hidden = true;
  sharePanel.innerHTML = '<label>Link to this exact view <input readonly aria-label="Shareable atlas link"></label><button type="button">Close</button><p role="status"></p>';
  tools.append(sharePanel);
  sharePanel.querySelector("button").onclick = () => { sharePanel.hidden = true; share.focus(); };
  share.onclick = async () => {
    stopPlay(); stopSpin(); flyToken++;
    const url = new URL(location.href);
    url.hash = urlHash();
    history.replaceState(null, "", url);
    sharePanel.hidden = false;
    const input = sharePanel.querySelector("input");
    input.value = url.href;
    input.focus(); input.select();
    try {
      await navigator.clipboard.writeText(url.href);
      sharePanel.querySelector("p").textContent = "Link copied. It includes the years, map view, filters, and selection.";
    } catch (_) {
      sharePanel.querySelector("p").textContent = "Copy the selected link to share this view.";
    }
  };
  let linkToken = 0;
  async function openView(hash) {
    const v = core.parseView(hash, NOW, Object.keys(CATS));
    if (!v) return false;
    const token = ++linkToken;
    const r = v.record && [...ev, ...ppl].find((r) =>
      r.wiki === v.record.wiki && r.kind === v.record.kind && (r.start ?? r.born) === v.record.date);
    const anchor = v.pin && ev.find((r) => r.wiki === v.pin.wiki && r.start === v.pin.date);
    pinned = anchor ? { ...anchor, year: v.pin.year } : null;
    activeComparisonStory = v.story;
    activeDiscovery = curatedSelection(v.discovery) ? v.discovery : null;
    const saved = { ...snapshot(), ...v, sel: r?.id || null, polity: null,
      activeComparisonStory: v.story, activeDiscovery, activeContemporaries: v.contemporaries || null, pinned,
      flatT: { x: v.pan[0] * W, y: v.pan[1] * H }, searchPlace: v.location || null,
      lastPoint: v.point, placeState: null, placeReturn: null };
    placeToken++;
    restore(saved);
    userMoved = true;
    lastPoint = v.point;
    renderDetail();
    if (v.polity) {
      const year = v.selectedYear ?? v.year;
      const chunk = chunkOf(year);
      const fs = chunk === null ? null : await loadChunk(chunk);
      if (token !== linkToken) return true;
      // Do not overwrite a selection the visitor made while the border file loaded.
      if (state.year === v.year && !state.sel && !selectedPolity) {
        const f = core.active(fs || [], borderYear(year)).find((f) => f.name === v.polity &&
          (v.polityMember == null || f.member === v.polityMember));
        if (f) {
          selectPolity(f, year);
          lastPoint = v.point;
          renderDetail();
        }
      }
    }
    return true;
  }

  let challengeReturn = null, challengeReturnHash = "";
  function startChallengeMap(year) {
    if (challengeReturn) finishChallengeMap();
    const savedHash = urlHash();
    challengeReturn = snapshot();
    challengeReturnHash = savedHash;
    placeToken++;
    linkToken++;
    place = null; placeReturn = null; searchPlace = null; lastPoint = null;
    placePanel.hidden = true;
    pinned = null; activeComparisonStory = null; activeDiscovery = null; activeContemporaries = null;
    stopPlay(); stopSpin(); flyToken++; userMoved = true;
    if (compare.on) document.getElementById("compareToggle").click();
    state.sel = null; selectedPolity = null; compare.selectedYear = null;
    state.cats = new Set();
    buildMarks();
    document.querySelectorAll("#legend [data-k]").forEach((b) => b.setAttribute("aria-pressed", "false"));
    state.borders = "history";
    syncBordersUI();
    setMode("flat");
    setYear(year);
  }
  function finishChallengeMap() {
    const saved = challengeReturn;
    challengeReturn = null;
    challengeReturnHash = "";
    if (saved) restore(saved);
  }
  async function jumpSearch(result, isCurrent = () => true) {
    window.HistoryChallenge?.cancelPick();
    let polity = null;
    if (result.kind === "state") {
      const chunk = chunkOf(result.year);
      const features = chunk === null ? null : await loadChunk(chunk);
      if (!isCurrent()) return false;
      if (!features) throw new Error("Historical borders could not load. Try this result again.");
      polity = core.active(features, borderYear(result.year)).find((f) =>
        f.name === result.title && f.member === result.member);
      if (!polity) throw new Error("This historical record is unavailable in that year.");
    }
    if (!isCurrent()) return false;
    trail.push(snapshot());
    if (trail.length > 30) trail.shift();
    placeToken++;
    linkToken++;
    place = null;
    placeReturn = null;
    placePanel.hidden = true;
    pinned = null;
    searchPlace = null;
    activeComparisonStory = null;
    activeDiscovery = null;
    activeContemporaries = result.contemporaries || null;
    lastPoint = null;
    stopPlay();
    stopSpin();
    userMoved = true;
    if (compare.on) document.getElementById("compareToggle").click();
    compare.selectedYear = null;
    state.sel = null;
    selectedPolity = null;
    if (result.kind === "event" || result.kind === "person" || result.kind === "dinosaur") {
      const r = byId[result.recordId];
      if (r.cat) state.cats.add(r.cat);
      buildMarks();
      document.querySelectorAll("#legend [data-k]").forEach((c) =>
        c.setAttribute("aria-pressed", state.cats.has(c.dataset.k)));
      setYear(result.start);
      select(r.id, false);
    } else if (polity) {
      state.borders = "history";
      syncBordersUI();
      setYear(result.year);
      selectPolity(polity, result.year);
    } else {
      lastPoint = [result.lon, result.lat];
      searchPlace = { title: result.title, geonameId: result.geonameId || null };
    }
    zoomK = result.kind === "state" ? 1.6 : 2.6;
    needHi();
    const record = byId[result.recordId];
    focusPoint(record && window.HistoryPaleogeography ? HistoryPaleogeography.point(record, state.year) || [result.lon, result.lat] : [result.lon, result.lat]);
    update();
    renderTrail();
    return true;
  }
  window.HistoryDiscovery = {
    evidenceView: isEvidenceView,
    limitYearsToHistory(year) {
      if(compare.left<-300000){compare.left=year;form.elements.left.value=fmt(year)}
      if(compare.selectedYear!==null&&compare.selectedYear<-300000){compare.selectedYear=null;state.sel=null;selectedPolity=null}
    },
    contemporaryPair() {
      if (!activeContemporaries) return null;
      const people = activeContemporaries.map((key) => ppl.find((p) => p.wiki === key));
      if (people.some((p) => !p) || people[0].region === people[1].region) return null;
      const from = Math.max(...people.map((p) => p.born)), to = Math.min(...people.map((p) => p.died));
      return from <= state.year && to >= state.year ? { people, from, to, year: state.year } : null;
    },
    contemporaryAnchor() {
      return curatedSelection(activeDiscovery)?.story.person;
    },
    startChallengeMap,
    finishChallengeMap,
    jumpSearch,
    urlHash,
    openView,
    render(scene) {
      window.HistoryPaleogeography?.prepare(compare.on ? [compare.left, state.year] : [state.year]);
      window.PopulationTimeline?.render(state.year, compare.on ? compare.left : null);
      renderComparisonStory();
      renderCurated();
      renderBorderConfidence();
      window.HistoryContemporaries?.render();
      window.HistoryDinosaurs?.render();
      window.AtlasUI?.render();
      const right = state.year;
      let allHits = [];
      if (compare.on) {
        for (const [year, x, width] of [
          [compare.left, 0, W * compare.split],
          [right, W * compare.split, W * (1 - compare.split)],
        ]) {
          ctx.save();
          ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
          ctx.beginPath();
          ctx.rect(x, 0, width, H);
          ctx.clip();
          withYear(year, scene);
          if (
            document.getElementById("changedOutlines").checked &&
            state.borders === "history"
          ) {
            const other = year === compare.left ? right : compare.left,
              fs = bCache.get(chunkOf(year)),
              ofs = bCache.get(chunkOf(other));
            if (Array.isArray(fs) && Array.isArray(ofs)) {
              const peers = new Map(
                core.active(ofs, borderYear(other)).map((f) => [core.polityKey(f), f]),
              );
              ctx.beginPath();
              for (const f of core.active(fs, borderYear(year))) {
                const peer = peers.get(core.polityKey(f));
                if (
                  !peer ||
                  peer.member !== f.member ||
                  peer.shapeKey !== f.shapeKey
                )
                  path(HistoryWater.outline(f));
              }
              ctx.strokeStyle = C.accent;
              ctx.lineWidth = 2;
              ctx.stroke();
            }
          }
          allHits.push(
            ...hits
              .filter((h) => h.x >= x && h.x <= x + width)
              .map((h) => ({ ...h, year })),
          );
          ctx.restore();
        }
        hits = allHits;
        labels[0].textContent = "Left · " + fmt(compare.left);
        labels[1].textContent = "Right · " + fmt(right);
        if (document.activeElement !== form.elements.right)
          form.elements.right.value = fmt(right);
      } else scene();
      const messages =
        state.borders === "history"
          ? [
              ...new Set(
                (compare.on ? [compare.left, right] : [right])
                  .filter((year) => year >= -1000000)
                  .map((year) => borderStatus(year) ||
                    (year > BTO ? `${fmt(year)}: showing latest available borders (${fmt(BTO)}).` : ""))
                  .filter(Boolean),
              ),
            ]
          : [];
      const curated = curatedSelection(activeDiscovery);
      const curatedPoint = curated && state.year === curated.stop.year && !compare.on && !state.sel && !selectedPolity
        ? curated.stop.point : null;
      const markedPoint = place?.point || (searchPlace && lastPoint) || curatedPoint;
      if (markedPoint && visible(...markedPoint)) {
        const p = proj(markedPoint);
        ctx.save();
        ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
        ctx.beginPath();
        ctx.arc(p[0], p[1], 10, 0, Math.PI * 2);
        ctx.strokeStyle = C.accent;
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.restore();
      }
      const outlines = document.getElementById("changedOutlines");
      outlines.disabled = state.borders !== "history" ||
        [compare.left, right].some((year) => borderStatus(year) !== "");
      outlines.title = outlines.disabled
        ? "Changed outlines require loaded historical borders for both years."
        : "";
      status.textContent = messages.join(" · ");
      status.hidden = !messages.length;
      window.HistoryChallenge?.render();
    },
    mapAt(x, y, lookup) {
      compare.hoverYear =
        compare.on && x < W * compare.split ? compare.left : state.year;
      const hit = withYear(compare.hoverYear, () => lookup(x, y));
      return hit ? { ...hit, year: compare.hoverYear } : null;
    },
    selectPolityYear(year) {
      lastPoint = null;
      searchPlace = null;
      compare.selectedYear = year;
    },
    selectWater(point, year, polity) {
      lastPoint = point;
      searchPlace = null;
      state.sel = null;
      selectedPolity = polity;
      compare.selectedYear = year;
      stopPlay(); stopSpin();
      renderDetail(); draw();
      if (innerWidth <= 860) document.getElementById('detail').scrollIntoView({ block: 'start', behavior: 'smooth' });
    },
    selectedRecord(year) {
      lastPoint = null;
      searchPlace = null;
      compare.selectedYear = year;
    },
    isComparing() {
      return compare.on;
    },
    displayedYears() {
      return compare.on ? [compare.left, state.year] : [state.year];
    },
    detail() {
      renderCurated();
      renderBorderConfidence();
      window.HistoryContemporaries?.render();
      window.HistoryDinosaurs?.render();
      if ((selectedPolity || state.sel) && compare.selectedYear !== null)
        withYear(compare.selectedYear, renderDetailBase);
      const x = state.sel && byId[state.sel];
      if(x?.cat==="dinosaurs"&&window.HistoryDinosaurs){
        const detail=document.querySelector("#detail .dinosaur-detail");
        if(detail&&!detail.querySelector(".dinosaur-portrait"))detail.querySelector("h3").insertAdjacentHTML("afterend",HistoryDinosaurs.portrait(x));
      }
      if (!x && !selectedPolity && searchPlace && lastPoint) {
        document.getElementById("detail").innerHTML = `<div class="detail search-place-detail"><button type="button" class="iconbtn close" aria-label="Close">×</button><div class="kicker">Present-day place · exploring ${esc(fmt(state.year))}</div><h3>${esc(searchPlace.title)}</h3><p>${pointLabel(lastPoint)}</p><p>This name locates a point on today's map. It does not establish the name, settlement, or political control here in ${esc(fmt(state.year))}.</p><a target="_blank" rel="noopener" href="${searchPlace.geonameId ? `https://www.geonames.org/${searchPlace.geonameId}/` : "https://www.naturalearthdata.com/"}">${searchPlace.geonameId ? "GeoNames" : "Natural Earth"} source ↗</a></div>`;
        document.querySelector("#detail .close").onclick = () => {
          searchPlace = null; lastPoint = null; closeSelection();
        };
      }
      const point = Array.isArray(lastPoint)
        ? lastPoint
        : x
          ? [x.lon, x.lat]
          : null;
      const waterYear = compare.on && [compare.left, state.year].includes(compare.selectedYear)
        ? compare.selectedYear : state.year;
      const waterHit = !x && !searchPlace && point
        ? withYear(waterYear, () => waterAtYear(point)) : null;
      if (waterHit) {
        const year = waterYear;
        const content = `<div class="kicker">Inland water · ${esc(fmt(year))}</div><h4>${esc(waterHit.water.properties.name)}</h4><p><strong>${esc(waterHit.relationship)}</strong></p><p>Blue marks water. Country context follows the selected year.</p><details><summary>Shoreline &amp; source</summary><p>${waterHit.water.properties.historical ? "Generalized lake outline from the historical map; not a dated shoreline survey." : "Modern reference shoreline; historical water levels may differ."} Names are present-day references.</p><a href="${esc(HistoryWater.source)}" target="_blank" rel="noopener">Natural Earth water reference ↗</a></details>`;
        const detail = document.querySelector('#detail .detail');
        if (detail) detail.insertAdjacentHTML('afterbegin', `<section class="water-context">${content}</section>`);
        else document.getElementById('detail').innerHTML = `<div class="detail water-context"><button type="button" class="iconbtn close" aria-label="Close">×</button>${content}</div>`;
        document.querySelector('#detail .close').onclick = () => { lastPoint = null; selectedPolity = null; update(); };
      }
      if (point && x?.cat !== "dinosaurs")
        addPlaceAction(
          document.querySelector("#detail .detail") ||
            document.getElementById("detail"),
          point,
        );
      if (selectedPolity && !point) {
        const hint = document.createElement("p");
        hint.className = "discovery-location-hint";
        hint.textContent = "Click a specific location on the map to explore its history. A state or empire can span several present-day countries.";
        document.querySelector("#detail .detail").append(hint);
      }
      if (x && x.cat !== "dinosaurs") {
        const el = document.querySelector("#detail .detail");
        addMeanwhile(el, x);
        addStories(el, x);
      }
      else if (selectedPolity) {
        addStories(document.querySelector("#detail .detail"), selectedPolity);
      }
    },
    keepChunk(c) {
      return compare.on && c === chunkOf(compare.left);
    },
    explore,
  };
  function openHash(hash) {
    if (hash.includes("view=")) openView(hash);
    else {
      const id = new URLSearchParams(hash.slice(1)).get("discover");
      if (discoveries.some((s) => s.id === id)) openCurated(id);
      else {
        const year = parseYear(hash.slice(1));
        if (year !== null) { stopPlay(); setYear(year); }
      }
    }
  }
  // Preserve old numeric hashes as well as exact views and short discovery links.
  if (initialAtlasHash.includes("view=") || initialAtlasHash.includes("discover=")) openHash(initialAtlasHash);
  window.addEventListener("hashchange", () => openHash(location.hash));
})();
