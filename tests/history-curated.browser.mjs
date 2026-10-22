// Run against a dedicated QA Chrome instance, as described in docs/history-discovery.md.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
const cdpURL = process.env.ATLAS_CDP_URL || "http://127.0.0.1:9231";
const page = await (await fetch(cdpURL + "/json/new?about:blank", { method: "PUT" })).json();
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  ws.addEventListener("open", resolve, { once: true });
  ws.addEventListener("error", reject, { once: true });
});
let id = 0;
const pending = new Map(), errors = [];
ws.addEventListener("message", ({ data }) => {
  const msg = JSON.parse(data);
  if (msg.method === "Runtime.exceptionThrown") errors.push(msg.params.exceptionDetails);
  if (!pending.has(msg.id)) return;
  const { resolve, reject } = pending.get(msg.id);
  pending.delete(msg.id);
  msg.error ? reject(new Error(JSON.stringify(msg.error))) : resolve(msg.result);
});
const send = (method, params = {}) => new Promise((resolve, reject) => {
  const callId = ++id;
  pending.set(callId, { resolve, reject });
  ws.send(JSON.stringify({ id: callId, method, params }));
});
const evaluate = async (expression) => {
  const result = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
  return result.result.value;
};
try {
  await send("Runtime.enable");
  await send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await send("Page.navigate", { url: (process.env.ATLAS_TEST_URL || "http://127.0.0.1:8891/atlas/") + "#1903" });
  for (let i = 0; i < 100; i++) {
    if (await evaluate("!!window.HistoryChallenge && !!window.PopulationTimeline")) break;
    await new Promise((r) => setTimeout(r, 100));
  }
  console.log(await evaluate(`(async()=>{
    const assert=(value,message)=>{if(!value)throw Error(message)};
    stopSpin();
    const shelf=document.querySelector('.curated-discoveries');
    assert(shelf&&shelf.textContent.includes('Cleopatra'),'visible curated entry');
    document.getElementById('compareToggle').click();
    state.borders='today';state.cats=new Set(['ideas']);setYear(1903);zoomK=2.3;rot=[-120,-30,0];update();
    const before=HistoryDiscovery.urlHash();
    shelf.querySelector('[data-discovery]').click();
    assert(state.year===-51&&!HistoryDiscovery.isComparing()&&state.borders==='history','tour opens a dated historical map');
    assert(rot[0]===-29.92&&rot[1]===-31.2,'map centres Alexandria');
    assert(state.cats.size===1&&state.cats.has('ideas'),'tour works without changing category preferences');
    assert(document.activeElement.hasAttribute('data-curated-heading'),'reader receives keyboard focus: '+document.activeElement.outerHTML.slice(0,200));
    assert(shelf.querySelector('[data-curated-prev]').disabled,'no previous stop at start');
    const stories=CuratedDiscoveries[0];
    for(let i=0;i<stories.stops.length;i++){
      shelf.querySelector('[data-curated-stop="'+i+'"]').click();
      const stop=stories.stops[i];
      assert(state.year===stop.year&&rot[0]===-stop.point[0]&&rot[1]===-stop.point[1],'stop year and camera: '+stop.id);
      assert(shelf.querySelector('[aria-current="step"]').dataset.curatedStop===String(i),'selected stop indicated');
      assert(shelf.querySelector('.curated-stop a[href^="https:"]'),'source available');
      assert(!!shelf.querySelector('.curated-stop .curated-context-note')===(stop.kind==='context'),'context distinguished from event');
      await loadChunk(chunkOf(stop.year));
      assert(polities().every(f=>f.from<=stop.year&&f.to>=stop.year),'source borders match year');
    }
    assert(shelf.querySelector('[data-curated-next]').disabled,'no next stop at end');
    shelf.querySelector('[data-curated-prev]').click();
    assert(shelf.querySelector('.curated-stop h4').textContent.includes('Zapotec'),'previous stop');
    setYear(1500);
    assert(!shelf.querySelector('[data-curated-return]').hidden&&shelf.querySelector('.curated-map-status').textContent.includes(fmt(1500)),'year changes clearly labelled');
    shelf.querySelector('[data-curated-return]').click();assert(state.year===-50,'return to map year');
    window.curatedHash=HistoryDiscovery.urlHash();
    const payload=JSON.parse(new URLSearchParams(curatedHash.slice(1)).get('view'));
    assert(payload.discovery.stop==='monte-alban','share stores stable stop ID');
    shelf.querySelector('[data-curated-close]').click();
    assert(shelf.querySelector('.curated-reader').hidden&&document.activeElement.hasAttribute('data-discovery'),'close and focus return');
    await HistoryDiscovery.openView(curatedHash);
    assert(!shelf.querySelector('.curated-reader').hidden&&state.year===-50,'share restores tour');
    const target=ev.find(e=>e.wiki==='Pig_War_(1859)');
    await HistoryDiscovery.jumpSearch({kind:'event',recordId:target.id,start:target.start,lon:target.lon,lat:target.lat});
    assert(shelf.querySelector('.curated-reader').hidden,'search leaves tour');
    document.querySelector('.story-trail button').click();
    assert(!shelf.querySelector('.curated-reader').hidden&&state.year===-50,'Back restores tour after search');
    payload.discovery={id:'unknown-discovery',stop:'unknown-stop'};
    await HistoryDiscovery.openView('#'+new URLSearchParams({view:JSON.stringify(payload)}));
    assert(shelf.querySelector('.curated-reader').hidden,'unknown IDs degrade to ordinary map');
    await HistoryDiscovery.openView(before);
    shelf.querySelector('[data-discovery]').click();
    document.querySelector('.story-trail button').click();
    assert(HistoryDiscovery.isComparing()&&state.year===1903&&state.borders==='today'&&zoomK===2.3&&rot[0]===-120&&state.cats.size===1,'Back restores complete earlier view');
    await HistoryDiscovery.openView(curatedHash);
    return 'Curated discovery: five stops, dates, sources, focus, category independence, sharing, unknown IDs, search and Back passed';
  })()`));
  await send("Page.reload", { ignoreCache: true });
  for (let i = 0; i < 100; i++) {
    if (await evaluate("!!window.HistoryChallenge && !!document.querySelector('.curated-stop')")) break;
    await new Promise((r) => setTimeout(r, 100));
  }
  if (!await evaluate("state.year===-50&&document.querySelector('.curated-stop h4').textContent.includes('Zapotec')"))
    throw Error("Reload does not restore exact discovery");
  await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  console.log(await evaluate(`(()=>{
    const shelf=document.querySelector('.curated-discoveries');
    shelf.querySelector('[data-curated-next]').click();
    if(state.year!==-44||document.documentElement.scrollWidth>innerWidth||shelf.scrollWidth>shelf.clientWidth)
      throw Error('Mobile tour navigation or width');
    const r=stage.getBoundingClientRect();
    if(r.bottom<=0||r.top>=innerHeight)throw Error('Mobile jump does not reveal map');
    shelf.scrollIntoView({block:'start'});
    return 'Exact-view reload and 390px mobile navigation/layout passed';
  })()`));
  const shot = await send("Page.captureScreenshot", { format: "png" });
  fs.writeFileSync(path.join(os.tmpdir(), "history-curated-mobile.png"), Buffer.from(shot.data, "base64"));
  if (errors.length) throw Error(JSON.stringify(errors));
  console.log("Browser exceptions: none");
} finally {
  if (errors.length) console.error('Atlas exceptions:', JSON.stringify(errors));
  await send("Target.closeTarget", { targetId: page.id });
  ws.close();
}
