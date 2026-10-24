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
  await send("Network.enable");
  await send("Network.setCacheDisabled", { cacheDisabled: true });
  await send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await send("Page.navigate", { url: (process.env.ATLAS_TEST_URL || "http://127.0.0.1:8891/atlas/") + "#1903" });
  for (let i = 0; i < 100; i++) {
    if (await evaluate("!!window.HistoryContemporaries && !!window.AtlasUI")) break;
    await new Promise((r) => setTimeout(r, 100));
  }
  console.log(await evaluate(`(async()=>{
    const assert=(v,m)=>{if(!v)throw Error(m)};
    stopSpin();
    const shelf=document.querySelector('.curated-discoveries');
    assert(shelf.textContent.includes('Meanwhile, elsewhere'),'comparison catalog visible');
    const record=ev.find(e=>e.wiki==='Pig_War_(1859)');
    await HistoryDiscovery.jumpSearch({kind:'event',recordId:record.id,start:record.start,lon:record.lon,lat:record.lat});
    document.getElementById('compareToggle').click();
    state.borders='today';state.cats=new Set(['ideas']);setYear(1903);rot=[-120,-30,0];zoomK=2.3;update();
    shelf.querySelector('[data-discovery="diaper-care-1961"]').click();
    assert(state.year===1961&&!HistoryDiscovery.isComparing(),'opens one shared calendar year');
    assert(!state.sel&&!selectedPolity,'old selection cleared so map marker is visible');
    assert(state.cats.size===1&&state.cats.has('ideas'),'category preferences preserved');
    assert(shelf.querySelectorAll('.same-year-place').length===2,'both countries visible at once');
    assert(shelf.textContent.includes('Cloth, gauze and washing')&&shelf.textContent.includes('1959'),'Soviet practice and actual evidence year');
    assert(shelf.textContent.includes('1986'),'later production evidence');
    assert(shelf.querySelectorAll('.same-year-place a[href^="https:"]').length>=3,'independent sources');
    assert(shelf.querySelectorAll('.same-year-place figcaption').length===2,'illustration labels');
    assert(document.activeElement.hasAttribute('data-curated-heading'),'keyboard focus goes to reader');
    shelf.querySelector('[data-curated-stop="1"]').click();
    assert(state.year===1961&&rot[0]===-37.62&&rot[1]===-55.75,'second country retains year and centres map');
    assert(shelf.querySelector('[aria-current="location"]').dataset.curatedStop==='1','current place indicated');
    window.meanwhileHash=HistoryDiscovery.urlHash();
    assert(JSON.parse(new URLSearchParams(meanwhileHash.slice(1)).get('view')).discovery.stop==='soviet-cloth','share saves stable place ID');
    setYear(1800);
    assert(!shelf.querySelector('[data-curated-return]').hidden&&shelf.querySelector('.same-year-heading').textContent.includes('1961'),'timeline change keeps authored year distinct');
    shelf.querySelector('[data-curated-return]').click();assert(state.year===1961,'return restores comparison year');
    shelf.querySelector('[data-curated-close]').click();
    assert(document.activeElement.dataset.discovery==='diaper-care-1961','close restores catalog focus');
    shelf.querySelector('[data-discovery="period-care-1980"]').click();
    assert(state.year===1980&&shelf.querySelectorAll('.same-year-place').length===2,'menstrual comparison opens');
    assert(shelf.textContent.includes('cotton wool')&&shelf.textContent.includes('viewing year'),'period practice and date scope visible');
    await HistoryDiscovery.openView(meanwhileHash);
    assert(state.year===1961&&shelf.querySelector('[aria-current="location"]').dataset.curatedStop==='1','share restores exact comparison and place');
    await HistoryDiscovery.jumpSearch({kind:'event',recordId:record.id,start:record.start,lon:record.lon,lat:record.lat});
    assert(shelf.querySelector('.curated-reader').hidden,'search leaves comparison');
    document.querySelector('.story-trail button').click();
    assert(state.year===1961&&!!shelf.querySelector('.same-year-pair'),'Back restores comparison after search');
    await new Promise(resolve=>Promise.all([...shelf.querySelectorAll('.same-year-place img')].map(img=>img.decode())).then(resolve));
    assert([...shelf.querySelectorAll('.same-year-place img')].every(img=>img.naturalWidth>0),'local images loaded');
    return 'Same-need comparisons: both countries, sources, dates, images, map jumps, focus, sharing, search and Back passed';
  })()`));
  await send("Page.reload", { ignoreCache: true });
  for (let i = 0; i < 100; i++) {
    if (await evaluate("!!window.AtlasUI && !!document.querySelector('.same-year-pair')")) break;
    await new Promise((r) => setTimeout(r, 100));
  }
  if (!await evaluate("state.year===1961&&document.querySelector('[aria-current=location]').dataset.curatedStop==='1'"))
    throw Error('Reload failed to restore exact place');
  await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  console.log(await evaluate(`(()=>{
    const shelf=document.querySelector('.curated-discoveries');
    const cards=[...shelf.querySelectorAll('.same-year-place')];
    if(document.documentElement.scrollWidth>innerWidth||shelf.scrollWidth>shelf.clientWidth)throw Error('Mobile overflow');
    const a=cards[0].getBoundingClientRect(),b=cards[1].getBoundingClientRect();
    if(b.top<a.bottom)throw Error('Mobile comparisons should stack');
    shelf.querySelector('[data-curated-stop="0"]').click();
    if(state.year!==1961||rot[0]!==89.59)throw Error('Mobile same-year navigation');
    const r=stage.getBoundingClientRect();
    if(r.bottom<=0||r.top>=innerHeight)throw Error('Mobile jump does not reveal map');
    shelf.scrollIntoView({block:'start'});
    return 'Exact-view reload and 390px mobile layout/navigation passed';
  })()`));
  const shot = await send("Page.captureScreenshot", { format: "png" });
  fs.writeFileSync(path.join(os.tmpdir(), "history-meanwhile-mobile.png"), Buffer.from(shot.data, "base64"));
  await send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await evaluate("document.querySelector('.curated-discoveries').scrollIntoView({block:'start'})");
  const desktop = await send("Page.captureScreenshot", { format: "png" });
  fs.writeFileSync(path.join(os.tmpdir(), "history-meanwhile-desktop.png"), Buffer.from(desktop.data, "base64"));
  if(errors.length)throw Error(JSON.stringify(errors));
  console.log('Browser exceptions: none');
} finally {
  await send("Target.closeTarget", { targetId: page.id });
  ws.close();
}
