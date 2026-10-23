/* Explore sourced dinosaur records using the Atlas's existing map and navigation. */
(() => {
  const fossils = ev.filter((e) => e.cat === "dinosaurs");
  const avatarUrl = (record) => `images/dinosaurs/${record.wiki.toLowerCase()}.webp`;
  const images = new Map();
  function avatar(record) {
    if (!images.has(record.wiki)) {
      const image = new Image();
      image.onload = draw;
      image.onerror = draw;
      image.src = avatarUrl(record);
      images.set(record.wiki, image);
    }
    return images.get(record.wiki);
  }
  const eras = [
    { name: "Triassic", wiki: "Herrerasaurus", year: -228000000 },
    { name: "Jurassic", wiki: "Stegosaurus", year: -150000000 },
    { name: "Cretaceous", wiki: "Tyrannosaurus", year: -67000000 },
  ];
  const card = document.createElement("section");
  card.className = "dinosaur-discovery comparison-stories";
  card.setAttribute("aria-label", "Explore dinosaurs");
  card.innerHTML = `<details><summary><span aria-hidden="true">🦖</span> Explore dinosaurs</summary><p>Eight fossil records, millions of years before human history.</p><div class="dinosaur-eras">${eras.map((e, i) => `<button type="button" data-dinosaur-era="${i}">${e.name}<small>${esc(fmt(e.year))}</small></button>`).join("")}</div><p>Watch the continents change from the Triassic to the Cretaceous. Dinosaur avatars follow representative fossil regions reconstructed on those ancient continents. Fossil ages and positions are approximate.</p><div class="dinosaur-list">${fossils.map((e) => `<button type="button" class="story-card dinosaur-list-card" data-dinosaur-id="${e.id}"><img src="${avatarUrl(e)}" width="56" height="56" alt="" loading="lazy"><span><b>${esc(e.title)}</b><small>${esc(fmtSpan(e.start, e.end, true))} · ${esc(e.fossilRegion)}</small></span></button>`).join("")}</div><p class="dinosaur-art-note">Illustrated reconstructions; colours and appearance are speculative.</p></details>`;
  document.getElementById("detail").after(card);
  const trigger = document.createElement("button");
  trigger.type = "button";
  trigger.className = "dinosaur-trigger";
  trigger.textContent = "Explore dinosaurs";
  trigger.setAttribute("aria-label", "Explore dinosaurs on the map");
  document.querySelector(".discovery-tools").append(trigger);
  const controls = document.createElement("div");
  controls.className = "dinosaur-map-controls";
  controls.innerHTML = `<button type="button" class="dinosaur-toggle" aria-label="Dinosaurs in the timeline and on the map" aria-pressed="true"><img src="images/dinosaurs/tyrannosaurus.webp" width="38" height="38" alt=""><span>Dinosaurs</span><strong data-dinosaur-state>On</strong><i aria-hidden="true"></i></button><button type="button" class="dinosaur-jump">Explore dinosaur eras →</button>`;
  document.querySelector(".borders-control").prepend(controls);
  const toggle = controls.querySelector(".dinosaur-toggle");
  function setEnabled(enabled) {
    stopPlay();
    if (enabled) state.cats.add("dinosaurs");
    else state.cats.delete("dinosaurs");
    update(); buildMarks();
  }
  toggle.onclick = () => setEnabled(!state.cats.has("dinosaurs"));
  controls.querySelector(".dinosaur-jump").onclick = () => trigger.click();
  const note = document.createElement("details");
  note.className = "deep-time-note";
  note.id = "ancientGeography";
  note.hidden = true;
  note.innerHTML = '<summary><span data-paleo-label>Reconstructed continents</span> <span aria-hidden="true">ⓘ</span></summary><div class="paleo-description"><p data-paleo-status role="status"></p><p>Continents and fossil regions move together using the nearest dated PALEOMAP reconstruction. Political borders and modern ocean labels are hidden in deep time. Continental outlines are approximate and do not resolve local shorelines, inland seas or sea levels.</p><a href="https://gwsdoc.gplates.org/models/#paleomap" target="_blank" rel="noopener">Scotese (2016) · PALEOMAP / GPlates ↗</a><button type="button" data-paleo-retry hidden>Retry ancient map</button></div>';
  document.getElementById("mapContext").append(note);
  cv.setAttribute("aria-describedby", `${cv.getAttribute("aria-describedby") || ""} ancientGeography`.trim());
  note.querySelector('[data-paleo-retry]').onclick = () => {
    for (const year of HistoryDiscovery.displayedYears()) HistoryPaleogeography.load(year, true);
    render();
  };
  async function open(record, year = Math.round((record.start + record.end) / 2)) {
    await HistoryDiscovery.jumpSearch({ kind: "dinosaur", recordId: record.id,
      start: year, lon: record.lon, lat: record.lat });
    if (innerWidth <= 860) stage.scrollIntoView({ block: "center", behavior: "instant" });
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
    const enabled = state.cats.has("dinosaurs");
    card.hidden = !enabled;
    trigger.hidden = !enabled;
    controls.querySelector(".dinosaur-jump").hidden = !enabled;
    toggle.setAttribute("aria-pressed", String(enabled));
    toggle.title = enabled ? "Hide dinosaur eras and avatars" : "Show dinosaur eras and avatars";
    controls.querySelector("[data-dinosaur-state]").textContent = enabled ? "On" : "Off";
    document.querySelector('#legend [data-k="dinosaurs"]').setAttribute("aria-pressed", String(enabled));
    note.hidden = !deep;
    if (deep) {
      const years = HistoryDiscovery.displayedYears();
      const maps = years.map((year, index) => {
        const map = HistoryPaleogeography.status(year);
        if (!map) return null;
        const side = years.length > 1 ? `${index ? "Right" : "Left"}: ` : "";
        return { ...map, label: `${side}${map.age} Ma` };
      }).filter(Boolean);
      note.querySelector('[data-paleo-label]').textContent = `Ancient continents · ${maps.map((map) => map.label + (map.state === "ready" ? "" : " overview")).join(" · ")}`;
      note.querySelector('[data-paleo-status]').textContent = maps.map((map) => `${map.label}: ${map.state === "ready" ? "approximate reconstruction" : map.state === "error" ? "overview shown; detailed coastlines unavailable, retry below" : "overview shown; detailed coastlines loading…"}`).join(" · ");
      note.querySelector('[data-paleo-retry]').hidden = !maps.some((map) => map.state === "error");
    }
    if (deep && !wasDeep) card.querySelector("details").open = true;
    wasDeep = deep;
  }
  function portrait(record) {
    return `<figure class="dinosaur-portrait"><img src="${avatarUrl(record)}" width="240" height="240" alt="Illustrated reconstruction of ${esc(record.title)}"><figcaption>Illustrated reconstruction · colours speculative</figcaption></figure>`;
  }
  function drawMarker(record, origin, occupied) {
    const size = W < 600 ? 68 : 80, radius = size / 2;
    let x = Math.max(radius + 10, Math.min(W - radius - 10, origin[0]));
    let y = Math.max(radius + 10, origin[1] - radius - 18);
    for(let attempt=0;attempt<8&&occupied.some((p)=>Math.hypot(p.x-x,p.y-y)<size+20);attempt++){
      const next=x+size+24;
      if(next<W-radius-10)x=next;
      else if(x-size-24>radius+10)x-=size+24;
      else y+=size+32;
    }
    const selected = state.sel === record.id;
    const image = avatar(record);
    ctx.save();
    ctx.beginPath();ctx.moveTo(...origin);ctx.lineTo(x,y+radius-3);
    ctx.strokeStyle=selected?C.accent:C.muted;ctx.lineWidth=1.2;ctx.stroke();
    ctx.beginPath();ctx.arc(...origin,3,0,Math.PI*2);ctx.fillStyle=C.accent;ctx.fill();
    ctx.shadowColor="rgba(45,36,32,.2)";ctx.shadowBlur=9;ctx.shadowOffsetY=3;
    ctx.beginPath();ctx.arc(x,y,radius-3,0,Math.PI*2);ctx.fillStyle=C.paper;ctx.fill();
    ctx.shadowBlur=0;ctx.shadowOffsetY=0;
    ctx.strokeStyle=selected?C.accent:"#847865";ctx.lineWidth=selected?2.5:1;ctx.stroke();
    if(image.complete&&image.naturalWidth)ctx.drawImage(image,x-radius,y-radius,size,size);
    else {ctx.font=`600 13px ${C.display}`;ctx.fillStyle=C.ink;ctx.textAlign="center";ctx.fillText(record.title.slice(0,2),x,y+4)}
    const label=record.title.replace("Tyrannosaurus rex","T. rex").replace(" bernissartensis","");
    ctx.font=`600 ${W<600?11:12}px ${C.display}`;ctx.textAlign="center";ctx.textBaseline="middle";
    const width=ctx.measureText(label).width+14, labelY=y+radius+10;
    ctx.fillStyle=C.paper;ctx.fillRect(x-width/2,labelY-9,width,18);
    ctx.fillStyle=C.ink;ctx.fillText(label,x,labelY);ctx.restore();
    return {x,y,radius};
  }
  function openLink(hash) {
    const key = new URLSearchParams(hash.slice(1)).get("dinosaur");
    const record = fossils.find((e) => e.wiki === key);
    if (hash === "#dinosaurs") trigger.click();
    else if (record) open(record);
  }
  window.HistoryDinosaurs = { render, portrait, drawMarker };
  render(); openLink(initialAtlasHash);
  renderDetail();
  window.addEventListener("hashchange", () => openLink(location.hash));
})();
