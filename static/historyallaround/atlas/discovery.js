/* Atlas discovery integration. Reuses the existing projection, canvas, timeline and ledger. */
(() => {
  const core = DiscoveryCore;
  let place = null,
    placeToken = 0,
    lastPoint = null,
    pendingPoint = null,
    placeReturn = null;
  const trail = [];
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
    const section = document.createElement("section");
    const connections = storyConnections(x);
    section.className = "near";
    section.innerHTML = `<b>Follow the story</b>${connections.length ? connections.map((c, i) => `<div><button type="button" class="story-card" data-story="${i}"><b>${esc(c.record.title || c.record.name)}</b><small>${esc(fmt(c.record.start ?? c.record.born, c.record.approx))} · ${esc(c.reason)}</small></button><a target="_blank" rel="noopener" href="${esc(c.source)}">Source ↗</a></div>`).join("") : "<p>No supported connections recorded yet.</p>"}`;
    el.append(section);
    section.querySelectorAll("[data-story]").forEach(
      (b) =>
        (b.onclick = () => {
          trail.push(snapshot());
          if (trail.length > 30) trail.shift();
          const r = connections[+b.dataset.story].record;
          place = null;
          placePanel.hidden = true;
          lastPoint = null;
          stopPlay();
          setYear(r.start ?? r.born);
          if (r.cat) state.cats.add(r.cat);
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
      placeState: place,
      placeReturn,
    };
  }
  function restore(s) {
    flyToken++;
    place = s.placeState;
    placeReturn = s.placeReturn;
    placePanel.hidden = !place;
    if (place) renderPlace();
    lastPoint = null;
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
    state.borders = s.borders;
    setMode(s.mode);
    rot = s.rot;
    flatT = s.flatT;
    zoomK = s.zoom;
    if (compare.on !== s.compare)
      document.getElementById("compareToggle").click();
    compare.left = s.left;
    form.elements.left.value = fmt(s.left);
    document.getElementById("changedOutlines").checked = s.changed;
    setSplit(s.split);
    compare.selectedYear = s.selectedYear;
    slider.value = Math.round(tAt(s.year) * SLIDER_STEPS);
    syncBordersUI();
    update();
  }
  function pointLabel(point) {
    return `${Math.abs(point[1]).toFixed(2)}°${point[1] < 0 ? "S" : "N"}, ${Math.abs(point[0]).toFixed(2)}°${point[0] < 0 ? "W" : "E"}`;
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
    placePanel.innerHTML = `<button type="button" data-return>Return to global timeline</button><h3>History of this place</h3><p>${pointLabel(p.point)} · selected point stays fixed</p><p>Political coverage from Cliopatria, ${fmt(BFROM)}–${fmt(BTO)}. Mapped extents may include claims; they do not establish effective control, settlement, or absence of Indigenous peoples. Nearby events are within 50 km of their recorded marker, not necessarily at this point.</p><p role="status">${p.done ? "Search complete" : `Searching border files: ${p.checked}/${BIDX.chunks.length}`} ${p.failed ? "Some files could not be loaded; this history is incomplete." : ""}</p><div class="place-entries">${
      rows.length
        ? rows
            .slice(0, p.limit)
            .map(
              (r, i) =>
                `<button class="place-entry" type="button" data-place-row="${i}"><b>${esc(fmtSpan(r.start, r.end, r.approx))} · ${esc(r.title)}</b><small>${r.type === "coverage" ? "Mapped coverage · " : ""}${esc(r.description)}</small></button>`,
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
    const token = ++placeToken;
    place = {
      point: point.slice(),
      coverage: [],
      events: core.nearby(ev, point),
      checked: 0,
      failed: 0,
      done: false,
      limit: 20,
    };
    focusPoint(point);
    renderPlace();
    placePanel.scrollIntoView({ block: "nearest", behavior: "smooth" });
    // Two fetches at a time, only after an explicit exploration request. Retain the atlas's bounded cache.
    const chunks = BIDX.chunks.slice();
    let next = 0;
    const p = place;
    async function worker() {
      while (next < chunks.length && token === placeToken) {
        const c = chunks[next++];
        const fs = await loadChunk(c);
        if (token !== placeToken) return;
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
    b.textContent = "Explore this place's history";
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
  tools.append(status);
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
    compare.selectedYear = null;
    stopPlay();
    setYear(vals[1]);
    draw();
  };
  form.addEventListener("input", (e) => e.target.setCustomValidity(""));
  document.getElementById("changedOutlines").onchange = draw;
  setSplit(0.5);
  window.HistoryDiscovery = {
    render(scene) {
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
                core.active(ofs, other).map((f) => [f.name, f]),
              );
              ctx.beginPath();
              for (const f of core.active(fs, year)) {
                const peer = peers.get(f.name);
                if (
                  !peer ||
                  peer.member !== f.member ||
                  peer.shapeKey !== f.shapeKey
                )
                  path(f);
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
                  .map(borderStatus)
                  .filter(Boolean),
              ),
            ]
          : [];
      if (place && visible(...place.point)) {
        const p = proj(place.point);
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
    },
    mapAt(x, y, lookup) {
      compare.hoverYear =
        compare.on && x < W * compare.split ? compare.left : state.year;
      const hit = withYear(compare.hoverYear, () => lookup(x, y));
      return hit ? { ...hit, year: compare.hoverYear } : null;
    },
    selectPolityYear(year) {
      lastPoint = null;
      compare.selectedYear = year;
    },
    selectedRecord(year) {
      lastPoint = null;
      compare.selectedYear = year;
    },
    isComparing() {
      return compare.on;
    },
    detail() {
      if ((selectedPolity || state.sel) && compare.selectedYear !== null)
        withYear(compare.selectedYear, renderDetailBase);
      const x = state.sel && byId[state.sel];
      const point = Array.isArray(lastPoint)
        ? lastPoint
        : x
          ? [x.lon, x.lat]
          : selectedPolity
            ? selectedPolity.cen
            : null;
      if (point)
        addPlaceAction(
          document.querySelector("#detail .detail") ||
            document.getElementById("detail"),
          point,
        );
      if (x) addStories(document.querySelector("#detail .detail"), x);
      else if (selectedPolity) {
        const f = selectedPolity;
        addStories(document.querySelector("#detail .detail"), {
          ...f,
          lon: f.cen[0],
          lat: f.cen[1],
        });
      }
    },
    keepChunk(c) {
      return compare.on && c === chunkOf(compare.left);
    },
    explore,
  };
})();
