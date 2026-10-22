// Run against a dedicated QA Chrome instance. Each run owns a fresh page.
const cdpURL = process.env.ATLAS_CDP_URL || "http://127.0.0.1:9231";
const page = await (
  await fetch(cdpURL + "/json/new?about:blank", { method: "PUT" })
).json();
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  ws.addEventListener("open", resolve, { once: true });
  ws.addEventListener("error", reject, { once: true });
});

let id = 0;
const pending = new Map();
ws.addEventListener("message", (event) => {
  const msg = JSON.parse(event.data);
  if (!msg.id || !pending.has(msg.id)) return;
  const { resolve, reject } = pending.get(msg.id);
  pending.delete(msg.id);
  msg.error
    ? reject(new Error(JSON.stringify(msg.error)))
    : resolve(msg.result);
});
const send = (method, params = {}) =>
  new Promise((resolve, reject) => {
    const callId = ++id;
    pending.set(callId, { resolve, reject });
    ws.send(JSON.stringify({ id: callId, method, params }));
  });
const evaluate = async (expression) => {
  const result = await send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  if (result.exceptionDetails)
    throw new Error(
      result.exceptionDetails.exception?.description ||
        result.exceptionDetails.text,
    );
  return result.result.value;
};

await send("Runtime.enable");
const errors = [];
ws.addEventListener("message", (e) => {
  const m = JSON.parse(e.data);
  if (m.method === "Runtime.exceptionThrown")
    errors.push(m.params.exceptionDetails);
});
await send("Emulation.setDeviceMetricsOverride", {
  width: 1440,
  height: 1000,
  deviceScaleFactor: 1,
  mobile: false,
});
await send("Page.navigate", { url: "about:blank" });
await new Promise((r) => setTimeout(r, 100));
await send("Page.navigate", {
  url: (process.env.ATLAS_TEST_URL || "http://127.0.0.1:8891/atlas/") + "#1903",
});
await new Promise((r) => setTimeout(r, 2500));
console.log(
  await evaluate(`(async()=>{
const assert=(v,m)=>{if(!v)throw Error(m)};
assert(window.HistoryDiscovery,'loaded');stopSpin();
document.getElementById('compareToggle').click();
const form=document.getElementById('compareYears');form.elements.left.value='500 BCE';form.elements.right.value='1903 CE';form.requestSubmit();
await loadChunk(chunkOf(-500));await loadChunk(chunkOf(1903));
assert(state.year===1903,'right year');render();assert(hits.every(h=>h.year===-500||h.year===1903),'hits belong to displayed years');
assert(polities().every(f=>f.from<=1903&&f.to>=1903),'dated borders');
const saved=rot.slice();setZoom(1.5);render();assert(zoomK===1.5&&rot[0]===saved[0],'shared camera');
const div=document.querySelector('.compare-divider');div.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true}));assert(div.getAttribute('aria-valuenow')==='52','keyboard divider');
setYear(-1);nudgeYear(1);assert(state.year===1,'no year zero');
await loadChunk(chunkOf(NOW));setYear(NOW);render();
assert(state.year===NOW&&polities().length>0,'current year displays latest borders');
assert(polities().filter(f=>!f.territoryOverlay).every(f=>f.from<=BTO&&f.to>=BTO),'current borders use latest snapshot');
assert(!document.getElementById('changedOutlines').disabled,'latest snapshot supports comparison outlines');
assert(document.querySelector('.discovery-status').textContent.includes('latest available borders'),'latest snapshot date disclosed');
const snapshotPolity=polities().find(f=>!f.territoryOverlay);selectPolity(snapshotPolity,NOW);assert(document.getElementById('detail').textContent.includes(snapshotPolity.name),'current territory inspection');
setYear(BFROM-1);render();
assert(document.getElementById('changedOutlines').disabled,'missing coverage disables outlines');
assert(document.querySelector('.discovery-tools .discovery-status'),'coverage status stays below map');
setYear(500);render();form.requestSubmit();assert(form.elements.right.validity.valid&&state.year===500,'formatted AD input can be resubmitted');
return 'Phase 1: comparison, BCE/CE, dated borders, shared navigation, keyboard divider and data gaps passed';})()`),
);
console.log(
  await evaluate(`(async()=>{const assert=(v,m)=>{if(!v)throw Error(m)};
setYear(1453);state.borders='today';syncBordersUI();const before={year:state.year,rot:rot.slice(),zoom:zoomK};
await HistoryDiscovery.explore([12.49,41.89]);
const panel=document.querySelector('[aria-label="History of this place"]');
assert(panel.textContent.includes('Search complete'),'search finished');assert(panel.querySelectorAll('[data-place-row]').length>0,'Rome history found');assert(panel.textContent.includes('Indigenous'),'coverage caveat');
panel.querySelector('[data-place-row]').click();assert(state.year!==0,'valid jump year');assert(rot[0]===-12.49&&rot[1]===-41.89,'fixed coordinate');
document.getElementById('compareToggle').click();panel.querySelector('[data-return]').click();assert(HistoryDiscovery.isComparing()&&state.borders==='today','return restores saved comparison and border layer');assert(state.year===before.year&&zoomK===before.zoom&&rot[0]===before.rot[0],'return restores timeline and camera');
await HistoryDiscovery.explore([0,-50]);assert(panel.textContent.includes('No records found'),'empty ocean history');panel.querySelector('[data-return]').click();
return 'Phase 2: Rome coverage/events, fixed point, jumps, return and empty history passed';})()`),
);
console.log(
  await evaluate(`(async()=>{const assert=(v,m)=>{if(!v)throw Error(m)};
const e=ev.find(e=>e.wiki==='Oregon_Treaty');setYear(e.start);select(e.id,false);const initial={year:state.year,sel:state.sel,rot:rot.slice(),zoom:zoomK};
state.cats.delete('war');buildMarks();const marksBefore=marks.children.length;const card=[...document.querySelectorAll('[data-story]')].find(b=>b.textContent.includes('Pig War'));assert(card,'verified Oregon/Pig War edge');card.click();assert(state.cats.has('war')&&marks.children.length>marksBefore,'story navigation restores category marks');assert(document.querySelector('#regions')?.textContent.includes('Pig War')||document.querySelector('.side-content').textContent.includes('The Pig War'),'story target remains visible');assert(state.sel===ev.find(e=>e.wiki==='Pig_War_(1859)').id&&state.year===1859,'story navigation');
document.querySelector('.story-trail button').click();assert(state.sel===initial.sel&&state.year===initial.year&&rot[0]===initial.rot[0]&&zoomK===initial.zoom,'back restores full camera/selection');
select(ev.find(e=>e.wiki==='Charlemagne').id,false);assert(document.querySelectorAll('[data-story]').length>=1,'person/event association');document.querySelector('[data-story]').click();assert(byId[state.sel].kind==='person','event to person');document.querySelector('[data-story]').click();document.querySelector('.story-trail button').click();assert(byId[state.sel].kind==='person','multi-step back');
select(ev.find(e=>e.wiki==='COVID-19_pandemic').id,false);assert(document.getElementById('detail').textContent.includes('No supported connections'),'empty relationships');
setMode('flat');setYear(1453);document.getElementById('changedOutlines').checked=true;await loadChunk(chunkOf(1453));render();
return 'Phase 3: sourced cards, people/events, multiple hops, Back, empty relationships and comparison integration passed';})()`),
);
console.log(
  await evaluate(`(()=>{
  const measure=()=>{const times=[];for(let i=0;i<20;i++){const t=performance.now();render();times.push(performance.now()-t)}return times.sort((a,b)=>a-b)[10]};
  const compareMs=measure();document.getElementById('compareToggle').click();const singleMs=measure();document.getElementById('compareToggle').click();
  return {renderMedianMs:{single:Math.round(singleMs*100)/100,compare:Math.round(compareMs*100)/100}};
})()`),
);
console.log(
  await evaluate(`(async()=>{const assert=(v,m)=>{if(!v)throw Error(m)};
  const right=state.year,e=ev.find(e=>e.wiki==='Founding_of_Rome');select(e.id,false,-753);assert(state.year===right,'left event does not change right year');
  const p=ppl.find(p=>p.wiki==='Charlemagne');select(p.id,false,800);assert(document.getElementById('detail').textContent.includes('about 52 years old'),'left person uses corresponding year');
  const fs=await loadChunk(chunkOf(1453));const f=DiscoveryCore.active(fs,1453)[0];selectPolity(f,1453);assert(document.getElementById('detail').textContent.includes(fmt(1453)),'territory detail uses clicked year');
  bErrors.add(currentChunk());assert(mapAtYear(W/2,H/2)===null,'failed historical load never offers modern territory');bErrors.clear();
  setYear(1453);return 'Year-specific event/person/territory inspection and failed-border hit testing passed';})()`),
);
await send("Emulation.setDeviceMetricsOverride", {
  width: 390,
  height: 844,
  deviceScaleFactor: 2,
  mobile: true,
});
await new Promise((r) => setTimeout(r, 300));
console.log(
  await evaluate(
    `(()=>{const assert=(v,m)=>{if(!v)throw Error(m)};assert(document.documentElement.scrollWidth<=390,'no mobile horizontal overflow');const d=document.querySelector('.compare-divider');assert(d.getBoundingClientRect().width>=36,'touch handle');assert(document.getElementById('compareToggle').getBoundingClientRect().height>=36,'touch control');return 'Mobile: 390px layout, accessible controls, and divider passed'})()`,
  ),
);
await evaluate("window.scrollTo(0,0)");
await send("Page.bringToFront");
await send("Emulation.setPageScaleFactor", { pageScaleFactor: 1 });
await send("Emulation.setTouchEmulationEnabled", { enabled: false });
await send("Emulation.setTouchEmulationEnabled", {
  enabled: true,
  maxTouchPoints: 2,
});
await evaluate('window.scrollTo({top:0,behavior:"instant"})');
await new Promise((r) => setTimeout(r, 200));
const d = await evaluate(
  `(()=>{const r=document.querySelector('.compare-divider').getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2,value:+document.querySelector('.compare-divider').getAttribute('aria-valuenow')}})()`,
);
await send("Input.dispatchTouchEvent", {
  type: "touchStart",
  touchPoints: [{ x: d.x, y: d.y }],
});
await send("Input.dispatchTouchEvent", {
  type: "touchMove",
  touchPoints: [{ x: d.x + 30, y: d.y }],
});
await send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
if (
  !(await evaluate(
    `+document.querySelector('.compare-divider').getAttribute('aria-valuenow')>${d.value}`,
  ))
)
  throw Error("Touch divider did not move");
const camera = await evaluate(
  `({x:flatT.x,y:document.getElementById('stage').getBoundingClientRect().y+150,zoom:zoomK})`,
);
await send("Input.dispatchTouchEvent", {
  type: "touchStart",
  touchPoints: [{ x: 60, y: camera.y }],
});
await send("Input.dispatchTouchEvent", {
  type: "touchMove",
  touchPoints: [{ x: 90, y: camera.y }],
});
await send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
if (!(await evaluate(`flatT.x>${camera.x}`)))
  throw Error("Touch map pan failed");
await send("Input.dispatchTouchEvent", {
  type: "touchStart",
  touchPoints: [
    { x: 100, y: camera.y, id: 1 },
    { x: 150, y: camera.y, id: 2 },
  ],
});
await send("Input.dispatchTouchEvent", {
  type: "touchMove",
  touchPoints: [
    { x: 80, y: camera.y, id: 1 },
    { x: 170, y: camera.y, id: 2 },
  ],
});
await send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
if (!(await evaluate(`zoomK>${camera.zoom}`))) throw Error("Pinch zoom failed");
console.log("Touch: divider drag, shared map pan, and pinch zoom passed");
console.log(
  await evaluate(
    `(()=>{const assert=(v,m)=>{if(!v)throw Error(m)};const r=stage.getBoundingClientRect(),t=document.querySelector('.time').getBoundingClientRect();assert(t.top>=r.bottom,'comparison controls do not obscure map');return 'Mobile comparison controls remain below the map'})()`,
  ),
);
const shot = await send("Page.captureScreenshot", {
  format: "png",
  captureBeyondViewport: true,
});
(await import("node:fs")).writeFileSync(
  (await import("node:path")).join(
    (await import("node:os")).tmpdir(),
    "history-discovery-mobile.png",
  ),
  Buffer.from(shot.data, "base64"),
);
console.log("Browser exceptions:", errors);
if (errors.length) throw Error(JSON.stringify(errors));
await send("Target.closeTarget", { targetId: page.id });
ws.close();
