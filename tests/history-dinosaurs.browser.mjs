// Use the isolated Chrome and static server described in docs/history-discovery.md.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
const cdp = process.env.ATLAS_CDP_URL || 'http://127.0.0.1:9231';
const url = process.env.ATLAS_TEST_URL || 'http://127.0.0.1:8891/atlas/';
const page = await (await fetch(cdp + '/json/new?about:blank', { method: 'PUT' })).json();
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((resolve, reject) => { ws.addEventListener('open', resolve, { once: true }); ws.addEventListener('error', reject, { once: true }); });
let id = 0;
const pending = new Map(), errors = [];
const keepAlive = setInterval(() => {}, 1000);
ws.addEventListener('message', ({ data }) => {
  const msg = JSON.parse(data);
  if (msg.method === 'Runtime.exceptionThrown') errors.push(msg.params.exceptionDetails);
  if (!pending.has(msg.id)) return;
  const { resolve, reject } = pending.get(msg.id); pending.delete(msg.id);
  msg.error ? reject(Error(JSON.stringify(msg.error))) : resolve(msg.result);
});
const send = (method, params = {}) => new Promise((resolve, reject) => { const call = ++id; pending.set(call, { resolve, reject }); ws.send(JSON.stringify({ id: call, method, params })); });
const evaluate = async (expression) => {
  const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (result.exceptionDetails) throw Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
  return result.result.value;
};
async function navigate(hash) {
  await send('Page.navigate', { url: 'about:blank' });
  await send('Page.navigate', { url: url + hash });
  for (let i = 0; i < 100; i++) {
    if (await evaluate('!!window.HistoryDinosaurs')) return;
    await new Promise(r => setTimeout(r, 100));
  }
  throw Error('Atlas failed to load');
}
try {
  await send('Runtime.enable'); await send('Network.enable'); await send('Network.setCacheDisabled', { cacheDisabled: true });
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await navigate('#1903');
  console.log(await evaluate(`(async()=>{
    const assert=(v,m)=>{if(!v)throw Error(m)};stopSpin();
    const toggle=document.querySelector('.dinosaur-toggle');
    assert(toggle&&toggle.getAttribute('aria-pressed')==='true','Era toggle is initially on');
    assert(toggle.closest('#eraPanel')&&!document.querySelector('#layersPanel .dinosaur-map-controls'),'dinosaur controls belong to Choose era, not Layers');
    assert(document.getElementById('layersPanel').hidden&&document.getElementById('filtersPanel').hidden,'map menus start collapsed');
    document.querySelector('[data-atlas-menu="filtersPanel"]').click();
    assert(document.querySelectorAll('#legend .chip:not([hidden])').length===6&&document.getElementById('filterCount').textContent==='6','human history shows six relevant filters');
    document.querySelector('#legend .chip').focus();
    document.activeElement.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
    assert(document.getElementById('filtersPanel').hidden&&document.activeElement.dataset.atlasMenu==='filtersPanel','Escape closes the menu and restores focus');
    const camera=JSON.stringify(rot);toggle.click();render();
    assert(!state.cats.has('dinosaurs')&&!dinosaurTimeline&&yearAt(0)===-300000,'off removes the deep-time timeline range');
    assert(!document.getElementById('eras').textContent.includes('Dinosaurs')&&!document.getElementById('ticks').textContent.includes('Ma'),'off removes ancient era labels and ticks');
    assert(state.year===1903&&JSON.stringify(rot)===camera,'human-year toggling keeps the view');
    assert(toggle.textContent.includes('Off')&&toggle.getAttribute('aria-pressed')==='false','off state is visible and accessible');
    for(const selector of ['.dinosaur-discovery','.dinosaur-trigger','.dinosaur-jump','.browse-dinosaurs','[data-dinosaur-destination]'])
      assert([...document.querySelectorAll(selector)].every(el=>el.hidden),'off hides dinosaur exploration: '+selector);
    window.dinosaurOffHash=HistoryDiscovery.urlHash();
    toggle.click();render();assert(yearAt(0)===-252000000&&document.getElementById('eras').textContent.includes('Dinosaurs'),'on restores the dinosaur timeline');
    assert(!document.querySelector('.dinosaur-discovery').hidden&&!document.querySelector('.dinosaur-jump').hidden&&!document.querySelector('[data-dinosaur-destination]').hidden,'on restores dinosaur exploration');
    document.querySelector('.dinosaur-trigger').click();render();
    assert(document.querySelectorAll('#legend .chip:not([hidden])').length===1&&document.getElementById('filterCount').textContent==='1','deep time shows the fossil filter');
    toggle.click();render();assert(state.year===1903&&!dinosaurTimeline&&!hits.some(h=>byId[h.id]?.cat==='dinosaurs'),'turning off during deep time returns to the last human year');
    toggle.click();await HistoryDiscovery.openView(dinosaurOffHash);render();assert(!dinosaurTimeline&&toggle.getAttribute('aria-pressed')==='false','shared off state restores the human timeline');
    toggle.click();
    return 'Dinosaur toggle: On/Off, era/tick removal, human-year return and shared state passed';
  })()`));
  console.log(await evaluate(`(async()=>{
    const assert=(v,m)=>{if(!v)throw Error(m)};stopSpin();
    document.querySelector('.dinosaur-trigger').click();render();
    assert(state.year===-67000000&&byId[state.sel]?.wiki==='Tyrannosaurus','dinosaur jump');
    assert(document.getElementById('yr').textContent.includes('million years ago'),'readable deep-time date');
    assert(document.querySelector('.dinosaur-discovery').getBoundingClientRect().height>0,'dinosaur browser remains visible during deep time');
    assert(document.querySelector('.dinosaur-detail').textContent.includes('Representative fossil region'),'fossil location context');
    await document.querySelector('.dinosaur-portrait img').decode();
    assert(document.querySelector('.dinosaur-portrait img').naturalWidth===512,'real illustrated avatar loads');
    assert(!document.querySelector('.deep-time-note').hidden,'modern geography note visible on map');
    assert(!document.querySelector('.dinosaur-detail .discovery-action'),'fossils do not imply human place history');
    assert(activeEvents().some(({e})=>e.wiki==='Triceratops')&&activeEvents().every(({e})=>e.cat==='dinosaurs'),'contemporary fossils without human records');
    assert(polities().length===0,'ancient years do not use historical political borders');
    document.querySelector('.story-trail button').click();assert(state.year===1903,'Back restores human history');
    document.querySelector('[data-dinosaur-era="1"]').click();render();
    assert(state.year===-150000000&&activeEvents().some(({e})=>e.wiki==='Diplodocus'),'Jurassic records');
    const points=hits.filter(h=>byId[h.id]?.cat==='dinosaurs');
    assert(points.length===2&&Math.hypot(points[0].x-points[1].x,points[0].y-points[1].y)>=100,'large nearby avatars remain individually clickable');
    assert(points.every(p=>p.radius>=34),'avatars have large pointer targets');
    document.querySelector('[data-dinosaur-era="0"]').click();assert(state.year===-228000000&&byId[state.sel]?.wiki==='Herrerasaurus','Triassic jump');
    document.getElementById('next').click();assert(state.year===-227000000,'deep-time next advances a million years');
    setYear(-65000000);assert(!activeEvents().some(({e})=>e.cat==='dinosaurs'),'no non-avian dinosaurs after extinction boundary');
    document.querySelector('.history-search-trigger').click();
    document.querySelector('[data-search-kind="dinosaur"]').click();
    const input=document.getElementById('historySearchInput');input.value='T. rex';input.dispatchEvent(new Event('input',{bubbles:true}));
    await new Promise(r=>setTimeout(r,160));
    assert(document.querySelector('[data-search-result] strong')?.textContent==='Tyrannosaurus rex','dinosaur alias search');
    state.cats.delete('dinosaurs');document.querySelector('[data-search-result]').click();await new Promise(r=>setTimeout(r,20));render();
    assert(state.cats.has('dinosaurs')&&state.year===-68000000&&byId[state.sel]?.wiki==='Tyrannosaurus','search enables dinosaur category');
    window.dinosaurHash=HistoryDiscovery.urlHash();
    setYear(2026);await HistoryDiscovery.openView(dinosaurHash);render();
    assert(state.year===-68000000&&byId[state.sel]?.wiki==='Tyrannosaurus','deep-time exact-view restoration');
    document.getElementById('compareToggle').click();
    const form=document.getElementById('compareYears');form.elements.left.value='150 Ma';form.elements.right.value='1903';form.requestSubmit();render();
    assert(state.year===1903&&!document.querySelector('.deep-time-note').hidden,'deep-time note follows either comparison side');
    assert(document.querySelectorAll('#legend .chip:not([hidden])').length===7,'mixed comparison shows categories for both periods');
    await HistoryDiscovery.openView(dinosaurHash);render();
    return 'Dinosaurs: ages, source context, eras, clickable markers, category search, Back, sharing and comparison passed';
  })()`));
  console.log(await evaluate(`(async()=>{
    const assert=(v,m)=>{if(!v)throw Error(m)};
    const saved=HistoryDiscovery.urlHash();
    const areas=[];
    for(const [index,age,wiki] of [[0,228,'Herrerasaurus'],[1,150,'Stegosaurus'],[2,67,'Tyrannosaurus']]){
      document.querySelector('[data-dinosaur-era="'+index+'"]').click();
      await HistoryPaleogeography.load(state.year);render();
      const geography=geo(),point=HistoryPaleogeography.point(byId[state.sel],state.year);
      assert(geography.ancient&&geography.land.features.length>100,'era uses reconstructed continents');
      assert(HistoryPaleogeography.status(state.year).age===age,'era snapshot matches');
      assert(Math.abs(rot[0]+point[0])<.001&&Math.abs(rot[1]+point[1])<.001,'era camera follows ancient fossil point');
      assert(hits.some(h=>byId[h.id]?.wiki===wiki),'ancient marker remains visible');
      assert(geography.land.features.every(f=>d3.geoArea(f)<Math.PI*2),'all reconstructed polygons have D3 winding');
      const area=d3.geoArea(geography.land);assert(area>1&&area<6,'land does not fill the globe');areas.push(area);
      state.borders='today';render();
      assert(mapAtYear(W/2,H/2)===null,'ancient map never hits modern countries');
      assert(geo().ancient,'modern border setting keeps ancient land');
      document.querySelector('.deep-time-note').open=true;
      assert(document.querySelector('.paleo-description').getBoundingClientRect().height>0,'ancient map explanation opens');
      document.querySelector('.deep-time-note').open=false;
      state.borders='history';
    }
    assert(new Set(areas).size===3,'Triassic, Jurassic and Cretaceous use different land');
    setYear(1903);render();assert(!geo().ancient&&geo().land===lo.land,'human dates restore modern geography');
    document.getElementById('compareToggle').click();
    const form=document.getElementById('compareYears');form.elements.left.value='228 Ma';form.elements.right.value='67 Ma';form.requestSubmit();
    await Promise.all(HistoryDiscovery.displayedYears().map(y=>HistoryPaleogeography.load(y)));render();
    assert(document.querySelector('[data-paleo-label]').textContent.includes('Left: 228 Ma')&&document.querySelector('[data-paleo-label]').textContent.includes('Right: 67 Ma'),'comparison labels both reconstructions');
    await HistoryDiscovery.openView(saved);render();
    return 'Ancient continents: three eras, matching marker/camera positions, winding, modern return and comparison passed';
  })()`));
  const target = await evaluate(`(()=>{render();const h=hits.find(h=>byId[h.id]?.wiki==='Triceratops');const r=cv.getBoundingClientRect();return h&&{x:r.left+h.x,y:r.top+h.y}})()`);
  if (!target) throw Error('Triceratops marker not visible');
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', ...target, button: 'left', clickCount: 1 });
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', ...target, button: 'left', clickCount: 1 });
  if (!await evaluate("byId[state.sel]?.wiki==='Triceratops'")) throw Error('Real marker click failed');
  if (await evaluate("!!document.querySelector('#detail .discovery-action')")) throw Error('Fossil click offers unrelated human history');
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await evaluate("document.querySelector('.dinosaur-trigger').click();render()");
  await evaluate("new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))");
  await evaluate("document.querySelector('[data-atlas-menu=eraPanel]').scrollIntoView({block:'end',behavior:'instant'})");
  await evaluate("document.querySelector('[data-atlas-menu=eraPanel]').click()");
  console.log(await evaluate(`(()=>{
    const toggle=document.querySelector('.dinosaur-toggle'),r=toggle.getBoundingClientRect(),p=document.getElementById('eraPanel').getBoundingClientRect();
    if(r.left<0||r.right>innerWidth||r.top<p.top||r.bottom>p.bottom||r.top<0||r.bottom>innerHeight||r.height<44)throw Error('Era toggle is not visible and touch-sized on mobile');
    toggle.click();render();if(yearAt(0)!==-300000||toggle.getAttribute('aria-pressed')!=='false')throw Error('Mobile off does not hide era');
    if(toggle.hidden||document.querySelector('[data-dinosaur-destination]:not([hidden])'))throw Error('Off must keep the era toggle available while hiding dinosaur destinations');
    toggle.click();document.querySelector('.dinosaur-trigger').click();render();
    document.querySelector('[data-atlas-menu=eraPanel]').click();
    return 'Mobile Choose era menu exposes a touch-sized toggle and removes/restores the dinosaur era';
  })()`));
  await evaluate("new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))");
  await evaluate("stage.scrollIntoView({block:'center',behavior:'instant'})");
  if (!await evaluate(`(()=>{const note=document.querySelector('.deep-time-note').getBoundingClientRect();return document.documentElement.scrollWidth<=innerWidth&&note.left>=0&&note.right<=innerWidth&&document.querySelector('.dinosaur-detail').scrollWidth<=document.querySelector('.dinosaur-detail').clientWidth})()`))
    throw Error('Mobile dinosaur layout overflows');
  const screenshot = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(os.tmpdir(), 'history-dinosaurs-mobile.png'), Buffer.from(screenshot.data, 'base64'));
  console.log(await evaluate(`(()=>{
    const assert=(v,m)=>{if(!v)throw Error(m)};
    setYear(-90380000);render();
    assert(document.getElementById('yr').textContent.startsWith('≈90'),'map date is rounded and approximate');
    document.getElementById('editDate').click();
    assert(document.activeElement.id==='gotoInput'&&document.activeElement.value==='90.38 Ma','editing preserves the exact deep-time year');
    assert(state.year===-90380000,'rounding the readout does not change the selected year');
    assert(document.getElementById('ticks').children.length<=5,'mobile ruler has a readable number of ticks after resize');
    document.querySelector('[data-atlas-menu="eraPanel"]').click();
    assert(!document.getElementById('eraPanel').hidden,'Choose era opens destinations');
    document.querySelector('#eraChoices button:nth-child(2)').click();render();
    assert(state.year===-150000000&&document.getElementById('eraPanel').hidden,'era selection navigates and closes the picker');
    assert(document.activeElement.dataset.atlasMenu==='eraPanel','era selection returns focus');
    const options=document.querySelector('.dock-options');options.open=true;
    document.querySelector('[data-atlas-menu="filtersPanel"]').click();
    assert(!options.open,'map menu closes the expanded dock');
    cv.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,pointerId:1}));
    assert(document.getElementById('filtersPanel').hidden,'outside interaction closes the menu');
    cv.dispatchEvent(new PointerEvent('pointerup',{bubbles:true,pointerId:1}));
    return 'Compact workspace: precise editing, responsive ruler, era navigation, focus and outside dismissal passed';
  })()`));
  const offHash=await evaluate('dinosaurOffHash');
  await navigate('#dinosaurs');
  if (!await evaluate("state.year===-67000000&&byId[state.sel]?.wiki==='Tyrannosaurus'")) throw Error('Direct dinosaur link failed');
  console.log('Real map click, 390px layout and direct dinosaur link passed');
  await navigate(offHash);
  if(!await evaluate("!dinosaurTimeline&&yearAt(0)===-300000&&document.querySelector('.dinosaur-toggle').getAttribute('aria-pressed')==='false'"))throw Error('Off state does not survive full navigation');
  if (errors.length) throw Error(JSON.stringify(errors));
  console.log('Browser exceptions: none');
} finally {
  clearInterval(keepAlive);
  if (errors.length) console.error(JSON.stringify(errors));
  await send('Target.closeTarget', { targetId: page.id }); ws.close();
}
