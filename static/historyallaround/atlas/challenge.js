/* Three daily puzzles, saved locally, with answers connected to the existing map. */
(() => {
  const core = HistoryChallengeCore;
  const storageKey = "atlas.daily-challenge.v1";
  const titles = { order: "Put history in order", place: "Find this place", overlap: "Alive at the same time?" };
  let day, puzzles, answers, index = 0, order = [], picking = false, revealed = null, canPersist = true;
  const card = document.createElement("section");
  card.className = "daily-challenge-card";
  card.setAttribute("aria-label", "Daily history challenge");
  document.querySelector(".side-content").append(card);
  const dialog = document.createElement("dialog");
  dialog.className = "history-search daily-challenge-dialog";
  dialog.id = "dailyChallenge";
  dialog.setAttribute("aria-labelledby", "dailyChallengeTitle");
  dialog.innerHTML = `<div class="history-search-heading"><h2 id="dailyChallengeTitle">Daily history challenge</h2><button type="button" data-daily-close aria-label="Close daily challenge">×</button></div><p class="daily-date"></p><nav class="daily-steps" aria-label="Today's questions"></nav><div class="daily-question"></div><p class="daily-storage-note"></p>`;
  document.body.append(dialog);
  const body = dialog.querySelector(".daily-question");
  const banner = document.createElement("div");
  banner.className = "challenge-map-banner";
  banner.hidden = true;
  stage.append(banner);
  function read() {
    try { return core.readProgress(localStorage.getItem(storageKey), day, puzzles); }
    catch (_) { canPersist = false; return puzzles.map(() => null); }
  }
  function save() {
    try { localStorage.setItem(storageKey, JSON.stringify({ day, signature: core.signature(puzzles), answers })); canPersist = true; }
    catch (_) { canPersist = false; }
  }
  function score() { return answers.filter((a, i) => core.grade(puzzles[i], a, DiscoveryCore.distance) === true).length; }
  function dateLabel() {
    const [y, m, d] = day.split("-").map(Number);
    return new Date(y, m - 1, d, 12).toLocaleDateString("en", { month: "long", day: "numeric", year: "numeric" });
  }
  function renderCard() {
    const count = answers.filter(Boolean).length;
    card.innerHTML = `<div class="kicker">Daily history challenge · ${esc(dateLabel())}</div><h3>Three questions. A whole world.</h3><p>Order events, find a place, and meet two contemporaries.</p><div class="daily-card-bottom"><span>${count}/${puzzles.length} answered${count ? ` · ${score()} correct` : ""}</span><button type="button" aria-haspopup="dialog" aria-controls="dailyChallenge">${count === puzzles.length ? "Review today's answers" : count ? "Continue challenge" : "Start today's challenge"}</button></div>`;
    card.querySelector("button").onclick = () => open();
  }
  function setIndex(next) {
    index = next;
    order = puzzles[index]?.kind === "order" ? puzzles[index].options.map(core.key) : [];
  }
  function refreshDay() {
    const today = core.localDay();
    if (today === day) return true;
    cancelPick();
    day = today;
    puzzles = core.daily(ev, ppl, day);
    answers = read();
    revealed = null;
    setIndex(Math.max(0, answers.findIndex((a) => !a)));
    renderCard(); renderBanner();
    if (dialog.open) renderQuestion();
    return false;
  }
  function open(next) {
    refreshDay();
    if (!puzzles.length) return;
    if (typeof next === "number") setIndex(next);
    else setIndex(Math.max(0, answers.findIndex((a) => !a)));
    stopPlay(); stopSpin();
    if (!dialog.open) dialog.showModal();
    renderQuestion();
    dialog.querySelector("[data-daily-close]").focus();
  }
  function close() {
    dialog.close();
    card.querySelector("button").focus({ preventScroll: true });
  }
  function storageNote() {
    dialog.querySelector(".daily-storage-note").textContent = canPersist
      ? "First attempts count. Progress is saved in this browser. A new set arrives at local midnight."
      : "First attempts count. Browser storage is unavailable; progress lasts for this visit.";
  }
  function recordLink(r) {
    return `<a href="${esc(r.source || wikiUrl(r.wiki))}" target="_blank" rel="noopener">Source ↗</a>`;
  }
  function mapButton(r, year) {
    return `<button type="button" data-daily-map="${esc(r.id)}" data-year="${year}">Show ${esc(r.title || r.name)} on map</button>`;
  }
  function answerContent(q, a) {
    const correct = core.grade(q, a, DiscoveryCore.distance);
    let html = `<div class="daily-feedback" role="status"><strong>${a.value === null ? "Answer revealed." : correct ? "That's right!" : "Not quite — here's the answer."}</strong></div>`;
    if (q.kind === "order") {
      html += `<ol class="daily-answer-order">${q.correct.map((r) => `<li><b>${esc(fmtSpan(r.start, r.end === r.start ? null : r.end))}</b><p>${esc(r.title)}</p>${recordLink(r)}${mapButton(r, r.start)}</li>`).join("")}</ol>`;
    } else if (q.kind === "place") {
      const r = q.record;
      html += `<h4>${esc(r.title)} · ${esc(fmt(r.start))}</h4><p>${esc(r.blurb)}</p><p>${a.value ? `Your guess was ${Math.round(DiscoveryCore.distance(a.value, [r.lon, r.lat])).toLocaleString("en")} km from the recorded marker. Within ${q.tolerance} km counts as correct.` : "No guess submitted."} This marker represents the Atlas record, not the full extent of an event.</p>${recordLink(r)}${mapButton(r, r.start)}`;
    } else {
      const pair = q.options[q.correct].people;
      html += `<h4>${esc(pair[0].name)} and ${esc(pair[1].name)}</h4><p>Their recorded lifespans overlap from ${esc(fmt(q.from))} to ${esc(fmt(q.to))}. Being alive together does not imply they met.</p>${pair.map((r) => `<div class="daily-person-answer"><b>${esc(r.name)}</b><p>${esc(fmtSpan(r.born, r.died))} · ${esc(r.role)}</p>${recordLink(r)}${mapButton(r, q.year)}</div>`).join("")}<p>Both map links open ${esc(fmt(q.year))}, a year in their shared lifetimes. Person markers show the Atlas's associated locations, not verified whereabouts in that year.</p>`;
    }
    return html;
  }
  function renderQuestion() {
    const q = puzzles[index];
    if (!q) return;
    dialog.querySelector(".daily-date").textContent = `${dateLabel()} · ${answers.filter(Boolean).length}/${puzzles.length} answered · ${score()} correct`;
    dialog.querySelector(".daily-steps").innerHTML = puzzles.map((p, i) => `<button type="button" data-daily-step="${i}" ${i === index ? 'aria-current="step"' : ""}>${i + 1}. ${p.kind === "order" ? "Order" : p.kind === "place" ? "Locate" : "Overlap"}${answers[i] ? " ✓" : ""}</button>`).join("");
    dialog.querySelectorAll("[data-daily-step]").forEach((b) => b.onclick = () => {
      if (!refreshDay()) return;
      if (picking) cancelPick();
      setIndex(+b.dataset.dailyStep); renderQuestion();
    });
    const a = answers[index];
    let html = `<h3>${esc(titles[q.kind])}</h3>`;
    if (a) html += answerContent(q, a);
    else if (q.kind === "order") {
      html += `<p>Put these events in order by <strong>start date</strong>, earliest first. Use the arrows to move them.</p><ol class="daily-order">${order.map((key, i) => {
        const r = q.options.find((r) => core.key(r) === key);
        return `<li><span>${esc(r.title)}</span><div><button type="button" data-move="${i}" data-direction="-1" aria-label="Move ${esc(r.title)} earlier" ${i === 0 ? "disabled" : ""}>↑</button><button type="button" data-move="${i}" data-direction="1" aria-label="Move ${esc(r.title)} later" ${i === order.length - 1 ? "disabled" : ""}>↓</button></div></li>`;
      }).join("")}</ol><button type="button" class="daily-primary" data-check-order>Check order</button>`;
    } else if (q.kind === "place") {
      html += `<p>Find the recorded location of <strong>${esc(q.record.title)}</strong> in ${esc(fmt(q.record.start))}.</p><p>Click or tap the map, or enter coordinates below. A guess within ${q.tolerance} km of the recorded marker counts as correct.</p><button type="button" class="daily-primary" data-pick-map>${picking ? "Return to map" : "Pick on the map"}</button><details class="daily-coordinates"><summary>Enter coordinates instead</summary><form data-coordinate-answer><label>Latitude (−90 to 90)<input type="number" name="lat" min="-90" max="90" step="any" required></label><label>Longitude (−180 to 180)<input type="number" name="lon" min="-180" max="180" step="any" required></label><button type="submit">Check location</button></form></details>`;
    } else {
      html += `<p>Which pair's recorded lifespans overlapped?</p><form data-overlap-answer><fieldset><legend>Choose one pair</legend>${q.options.map((o, i) => `<label class="daily-pair"><input type="radio" name="pair" value="${i}" required><span>${esc(o.people.map((r) => r.name).join(" & "))}</span></label>`).join("")}</fieldset><button class="daily-primary" type="submit">Check answer</button></form>`;
    }
    html += a ? `<div class="daily-next"><button type="button" data-daily-next>${answers.every(Boolean) ? "See today's score" : "Next question"}</button></div>`
      : `<button type="button" class="daily-skip" data-daily-reveal>Reveal answer</button>`;
    body.innerHTML = html;
    body.querySelectorAll("[data-move]").forEach((b) => b.onclick = () => {
      if (!refreshDay()) return;
      const from = +b.dataset.move, to = from + +b.dataset.direction;
      [order[from], order[to]] = [order[to], order[from]];
      renderQuestion();
      const direction = to === 0 ? 1 : -1;
      body.querySelector(`[data-move="${to}"][data-direction="${direction}"]`).focus();
    });
    body.querySelector("[data-check-order]")?.addEventListener("click", () => submit(order.slice()));
    body.querySelector("[data-overlap-answer]")?.addEventListener("submit", (e) => {
      e.preventDefault(); submit(+new FormData(e.target).get("pair"));
    });
    body.querySelector("[data-coordinate-answer]")?.addEventListener("submit", (e) => {
      e.preventDefault(); const data = new FormData(e.target);
      submit([+data.get("lon"), +data.get("lat")]);
    });
    body.querySelector("[data-pick-map]")?.addEventListener("click", startPick);
    body.querySelector("[data-daily-reveal]")?.addEventListener("click", () => submit(null));
    body.querySelectorAll("[data-daily-map]").forEach((b) => b.onclick = () => showMap(b.dataset.dailyMap, +b.dataset.year));
    body.querySelector("[data-daily-next]")?.addEventListener("click", () => {
      if (!refreshDay()) return;
      const next = answers.findIndex((a, i) => !a && i > index);
      const pending = next >= 0 ? next : answers.findIndex((a) => !a);
      if (pending >= 0) { setIndex(pending); renderQuestion(); }
      else renderSummary();
    });
    storageNote();
  }
  function renderSummary() {
    body.innerHTML = `<div class="daily-summary"><div class="kicker">Today's set complete</div><h3>${score()} of ${puzzles.length} correct</h3><p>Every answer is a new place to explore. Come back tomorrow for three more questions.</p><button type="button" data-review>Review answers</button><button type="button" data-explore>Explore the atlas</button></div>`;
    body.querySelector("[data-review]").onclick = () => { setIndex(0); renderQuestion(); };
    body.querySelector("[data-explore]").onclick = close;
  }
  function submit(value) {
    if (!refreshDay() || answers[index]) return;
    const a = { value };
    if (!core.validAnswer(puzzles[index], a)) return;
    cancelPick();
    answers[index] = a;
    save(); renderCard(); renderQuestion();
    if (!dialog.open) dialog.showModal();
    body.querySelector(".daily-feedback")?.setAttribute("tabindex", "-1");
    body.querySelector(".daily-feedback")?.focus();
  }
  function setPickingUI(on) {
    document.querySelector(".time").inert = on;
    document.getElementById("goto").inert = on;
    document.getElementById("side").inert = on;
    stage.classList.toggle("challenge-picking", on);
  }
  function startPick() {
    if (!refreshDay() || answers[index]) return;
    if (!picking) {
      picking = true; revealed = null;
      HistoryDiscovery.startChallengeMap(puzzles[index].record.start);
      setPickingUI(true);
    }
    dialog.close();
    resize(); render();
    renderBanner();
    stage.scrollIntoView({ block: "center", behavior: "auto" });
    banner.querySelector("button").focus({ preventScroll: true });
  }
  function cancelPick() {
    if (!picking) return;
    picking = false;
    setPickingUI(false);
    HistoryDiscovery.finishChallengeMap();
    renderBanner();
  }
  function renderBanner() {
    banner.hidden = !picking && !revealed;
    if (picking) {
      banner.innerHTML = `<strong>Find: ${esc(puzzles[index].record.title)} · ${esc(fmt(puzzles[index].record.start))}</strong><span>Pan or zoom, then tap the map to make one guess.</span><div><button type="button" data-map-coordinates>Enter coordinates</button><button type="button" data-map-cancel>Back to questions</button></div>`;
      banner.querySelector("[data-map-coordinates]").onclick = () => {
        open(index); body.querySelector("details").open = true; body.querySelector('[name="lat"]').focus();
      };
      banner.querySelector("[data-map-cancel]").onclick = () => { cancelPick(); open(index); };
    } else if (revealed) {
      const q = puzzles[revealed.index];
      banner.innerHTML = `<strong>Daily challenge · ${esc(titles[q.kind])}</strong><span>${q.kind === "place" && answers[revealed.index]?.value ? `Your guess: ${Math.round(DiscoveryCore.distance(answers[revealed.index].value, [q.record.lon, q.record.lat])).toLocaleString("en")} km away. Dashed circle marks your guess.` : "Explore the answer on the map."}</span><div><button type="button" data-map-review>Back to challenge</button><button type="button" data-map-hide>Hide</button></div>`;
      banner.querySelector("[data-map-review]").onclick = () => open(revealed.index);
      banner.querySelector("[data-map-hide]").onclick = () => { revealed = null; renderBanner(); draw(); };
    }
  }
  async function showMap(id, year) {
    if (!refreshDay()) return;
    const r = byId[id];
    cancelPick();
    close();
    await HistoryDiscovery.jumpSearch({ kind: r.kind, recordId: id, start: year, lon: r.lon, lat: r.lat });
    revealed = { index, recordId: id, year };
    renderBanner(); draw();
    stage.scrollIntoView({ block: "center", behavior: "auto" });
    banner.querySelector("button").focus({ preventScroll: true });
  }
  dialog.querySelector("[data-daily-close]").onclick = () => {
    cancelPick(); close();
  };
  dialog.addEventListener("cancel", (e) => { e.preventDefault(); cancelPick(); close(); });
  window.HistoryChallenge = {
    isPicking: () => picking,
    cancelPick,
    pickMap(e) {
      if (!picking) return false;
      const box = cv.getBoundingClientRect(), x = e.clientX - box.left, y = e.clientY - box.top;
      const point = proj.invert([x, y]);
      if (!point || !point.every(Number.isFinite) || Math.abs(point[1]) > 90 ||
        !visible(...point) || (state.mode === "globe" && Math.hypot(x - proj.translate()[0], y - proj.translate()[1]) > proj.scale())) return true;
      // Inverse projections can repeat longitudes after panning; store canonical coordinates.
      const lon = ((point[0] + 180) % 360 + 360) % 360 - 180;
      submit([lon, point[1]]);
      return true;
    },
    render() {
      if (!revealed || state.year !== revealed.year || state.sel !== revealed.recordId) return;
      const q = puzzles[revealed.index], answer = answers[revealed.index];
      if (q.kind !== "place" || !answer?.value) return;
      const guess = answer.value, target = [q.record.lon, q.record.lat];
      ctx.save(); ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      ctx.strokeStyle = C.accent; ctx.lineWidth = 2; ctx.setLineDash([5, 4]);
      ctx.beginPath(); path({ type: "LineString", coordinates: [guess, target] }); ctx.stroke();
      if (visible(...guess)) {
        const p = proj(guess); ctx.beginPath(); ctx.arc(p[0], p[1], 11, 0, Math.PI * 2); ctx.stroke();
      }
      ctx.restore();
    },
  };
  refreshDay();
  setInterval(() => { if (!document.hidden) refreshDay(); }, 60000);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) refreshDay(); });
  window.addEventListener("storage", (e) => {
    if (e.key !== storageKey) return;
    refreshDay(); answers = read(); if (picking && answers[index]) cancelPick();
    renderCard(); if (dialog.open) renderQuestion();
  });
})();
