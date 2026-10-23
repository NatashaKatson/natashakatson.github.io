/* Explore sourced dinosaur records using the Atlas's existing map and navigation. */
(() => {
  const fossils = ev.filter((e) => e.cat === "dinosaurs");
  const eras = [
    { name: "Triassic", wiki: "Herrerasaurus", year: -228000000 },
    { name: "Jurassic", wiki: "Stegosaurus", year: -150000000 },
    { name: "Cretaceous", wiki: "Tyrannosaurus", year: -67000000 },
  ];
  const card = document.createElement("section");
  card.className = "dinosaur-discovery comparison-stories";
  card.setAttribute("aria-label", "Explore dinosaurs");
  card.innerHTML = `<details><summary><span aria-hidden="true">🦖</span> Explore dinosaurs</summary><p>Eight fossil records, millions of years before human history.</p><div class="dinosaur-eras">${eras.map((e, i) => `<button type="button" data-dinosaur-era="${i}">${e.name}<small>${esc(fmt(e.year))}</small></button>`).join("")}</div><p>Footprint symbols locate representative fossil regions on today's continents. These are approximate age ranges, not a reconstruction of ancient habitats or coastlines.</p><div class="dinosaur-list">${fossils.map((e) => `<button type="button" class="story-card" data-dinosaur-id="${e.id}"><b>${esc(e.title)}</b><small>${esc(fmtSpan(e.start, e.end, true))} · ${esc(e.fossilRegion)}</small></button>`).join("")}</div></details>`;
  document.getElementById("detail").after(card);
  const trigger = document.createElement("button");
  trigger.type = "button";
  trigger.className = "dinosaur-trigger";
  trigger.textContent = "Dinosaurs";
  trigger.setAttribute("aria-label", "Explore dinosaurs on the map");
  document.querySelector(".discovery-tools").append(trigger);
  const note = document.createElement("p");
  note.className = "deep-time-note";
  note.hidden = true;
  note.innerHTML = '<strong>Fossil regions · modern geography</strong><br>Continents and coastlines were different. Ages are approximate.';
  document.querySelector(".borders-control").append(note);
  async function open(record, year = Math.round((record.start + record.end) / 2)) {
    await HistoryDiscovery.jumpSearch({ kind: "dinosaur", recordId: record.id,
      start: year, lon: record.lon, lat: record.lat });
    if (innerWidth <= 860) stage.scrollIntoView({ block: "center", behavior: "auto" });
    else document.querySelector(".side").scrollTo({ top: 0 });
  }
  trigger.onclick = () => open(fossils.find((e) => e.wiki === "Tyrannosaurus"));
  card.querySelectorAll("[data-dinosaur-era]").forEach((b) => b.onclick = () => {
    const era = eras[+b.dataset.dinosaurEra];
    open(fossils.find((e) => e.wiki === era.wiki), era.year);
  });
  card.querySelectorAll("[data-dinosaur-id]").forEach((b) => b.onclick = () => open(byId[b.dataset.dinosaurId]));
  let wasDeep = false;
  function render() {
    const deep = HistoryDiscovery.displayedYears().some((year) => year < -1000000);
    note.hidden = !deep;
    if (deep && !wasDeep) card.querySelector("details").open = true;
    wasDeep = deep;
    trigger.setAttribute("aria-pressed", String(deep));
  }
  function openLink(hash) {
    const key = new URLSearchParams(hash.slice(1)).get("dinosaur");
    const record = fossils.find((e) => e.wiki === key);
    if (hash === "#dinosaurs") trigger.click();
    else if (record) open(record);
  }
  window.HistoryDinosaurs = { render };
  render(); openLink(initialAtlasHash);
  window.addEventListener("hashchange", () => openLink(location.hash));
})();
