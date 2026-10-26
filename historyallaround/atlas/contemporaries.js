/* Lifespan overlap is evidence of contemporaneity, never of contact or whereabouts. */
(() => {
  const core = DiscoveryCore;
  const card = document.createElement("section");
  card.className = "contemporaries-card comparison-stories";
  card.setAttribute("aria-label", "Contemporaries across cultures");
  document.getElementById("people").after(card);
  const examples = [
    { year: 1610, person: "William_Shakespeare", text: "Shakespeare & Tokugawa Ieyasu" },
    { year: 1690, person: "Isaac_Newton", text: "Newton & the Kangxi Emperor" },
    { year: -50, person: "Cleopatra", partner: "Emperor_Yuan_of_Han", text: "Cleopatra & Emperor Yuan of Han" },
  ];
  let renderedKey = "";
  async function show(person, year, pair = core.contemporaryPair(ppl, year, person.wiki)) {
    await HistoryDiscovery.jumpSearch({ kind: "person", recordId: person.id,
      start: year, lon: person.lon, lat: person.lat, contemporaries: pair?.people.map((p) => p.wiki) });
    if (innerWidth <= 860) stage.scrollIntoView({ block: "center", behavior: "auto" });
  }
  function render() {
    // Comparison's right year is the global year used by the people ledger.
    const selected = byId[state.sel];
    const anchor = selected?.kind === "person" ? selected.wiki : HistoryDiscovery.contemporaryAnchor();
    const savedPair = HistoryDiscovery.contemporaryPair();
    const key = [state.year, anchor, savedPair?.people.map((p) => p.wiki).join("/"), HistoryDiscovery.isComparing()].join("/");
    if (key === renderedKey) return;
    renderedKey = key;
    const pair = savedPair || core.contemporaryPair(ppl, state.year, anchor);
    card.innerHTML = `<div class="kicker">Same time, different worlds</div><h3>They were alive together.</h3>${pair ? (() => {
      const approximate = pair.people.some((p) => p.approx);
      const min = Math.min(...pair.people.map((p) => p.born));
      const max = Math.max(...pair.people.map((p) => p.died));
      const span = core.yearsBetween(min, max) || 1;
      const left = core.yearsBetween(min, pair.from) / span * 100;
      const width = core.yearsBetween(pair.from, pair.to) / span * 100;
      return `<p class="contemporary-year">${esc(fmt(state.year))}${HistoryDiscovery.isComparing() ? " · right-hand map" : ""}</p>${pair.people.map((p, i) => `<div class="contemporary-person"><button type="button" data-contemporary="${i}"><strong>${esc(p.name)}</strong><small>${esc(p.role)} · ${esc(REGIONS[p.region])}</small><span>${esc(fmtSpan(p.born, p.died, p.approx))}</span></button><div class="lifespan-track" aria-hidden="true"><i style="left:${core.yearsBetween(min, p.born) / span * 100}%;width:${core.yearsBetween(p.born, p.died) / span * 100}%"></i><b style="left:${left}%;width:${Math.max(.5, width)}%"></b></div><a href="${esc(p.source || wikiUrl(p.wiki))}" target="_blank" rel="noopener">Lifespan source ↗</a></div>`).join("")}<p class="contemporary-overlap"><span aria-hidden="true">━</span> ${approximate ? "Approximate recorded overlap" : "Recorded lifespan overlap"}: <strong>${esc(fmtSpan(pair.from, pair.to, approximate))}</strong></p><p>Shared years do not imply they met. Markers show associated places, not their whereabouts that year.${approximate ? " At least one lifespan has approximate dates." : ""}</p>`;
    })() : `<p>No cross-region pair is recorded for ${esc(fmt(state.year))} yet.</p>`}<details class="contemporary-examples"><summary>Explore another moment · changes the year</summary>${examples.map((e, i) => `<button class="story-card" type="button" data-contemporary-example="${i}">${esc(e.text)}<small>${esc(fmt(e.year))}</small></button>`).join("")}</details>`;
    card.querySelectorAll("[data-contemporary]").forEach((b) => b.onclick = () => show(pair.people[+b.dataset.contemporary], pair.year, pair));
    card.querySelectorAll("[data-contemporary-example]").forEach((b) => b.onclick = () => {
      const example = examples[+b.dataset.contemporaryExample];
      const pair = example.partner ? core.contemporaryPair(ppl.filter((p) =>
        p.wiki === example.person || p.wiki === example.partner), example.year) : undefined;
      show(ppl.find((p) => p.wiki === example.person), example.year, pair);
    });
  }
  function openLink(hash) {
    const params = new URLSearchParams(hash.slice(1));
    const year = parseYear(params.get("people") || "");
    const person = ppl.find((p) => p.wiki === params.get("person"));
    if (person && year !== null && person.born <= year && person.died >= year) show(person, year);
  }
  window.HistoryContemporaries = { render };
  render();
  openLink(initialAtlasHash);
  window.addEventListener("hashchange", () => openLink(location.hash));
})();
