// Sidebar scope, date changes, local-history lifecycle and readable narrow layouts.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const cdp = process.env.ATLAS_CDP_URL || 'http://127.0.0.1:9231';
const url = process.env.ATLAS_TEST_URL || pathToFileURL(path.resolve('prototypes/atlas-ui/preview.html')).href;
const tab = await (await fetch(cdp + '/json/new?about:blank', { method: 'PUT' })).json();
const ws = new WebSocket(tab.webSocketDebuggerUrl);
await new Promise((resolve, reject) => { ws.addEventListener('open', resolve, { once: true }); ws.addEventListener('error', reject, { once: true }); });
let id = 0;
const pending = new Map(), errors = [];
ws.onmessage = ({ data }) => {
  const message = JSON.parse(data);
  if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails);
  const call = pending.get(message.id);
  if (!call) return;
  pending.delete(message.id); clearTimeout(call.timer);
  message.error ? call.reject(Error(JSON.stringify(message.error))) : call.resolve(message.result);
};
const send = (method, params = {}) => new Promise((resolve, reject) => {
  const call = ++id, timer = setTimeout(() => { pending.delete(call); reject(Error('CDP timeout: ' + method)); }, 30000);
  pending.set(call, { resolve, reject, timer }); ws.send(JSON.stringify({ id: call, method, params }));
});
const evaluate = async (expression) => {
  const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (result.exceptionDetails) throw Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
  return result.result.value;
};
const waitFor = async (expression) => {
  for (let i = 0; i < 150; i++) { if (await evaluate(expression)) return; await new Promise((r) => setTimeout(r, 70)); }
  throw Error('Not ready: ' + expression);
};
const screenshot = async (name) => {
  const shot = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(os.tmpdir(), 'history-sidebar-' + name + '.png'), Buffer.from(shot.data, 'base64'));
};
try {
  await send('Runtime.enable'); await send('Network.enable');
  await send('Network.setBlockedURLs', { urls: url.startsWith('file:') ? ['http://*', 'https://*']
    : ['https://fonts.googleapis.com/*', 'https://fonts.gstatic.com/*', 'https://cdnjs.buymeacoffee.com/*'] });
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: url + '#1928' });
  await waitFor('!!window.AtlasUI && !!window.HistoryContemporaries');
  console.log(await evaluate(`(async()=>{
    const check=(v,m)=>{if(!v)throw Error(m)};
    stopSpin();flyToken++;
    const before=(a,b)=>!!(a.compareDocumentPosition(b)&Node.DOCUMENT_POSITION_FOLLOWING);
    const regions=document.getElementById('regions'),people=document.getElementById('people');
    const extras=document.querySelector('.sidebar-extras'),curated=document.querySelector('.curated-discoveries');
    check(before(regions,people)&&before(people,document.querySelector('.contemporaries-card'))&&before(people,extras),'Period results precede people and optional stories');
    check(extras.lastElementChild===curated&&extras.contains(document.querySelector('.daily-challenge-card')),'Curated stories stay last, including after the daily challenge');
    check(document.getElementById('sideScope').textContent.includes('Worldwide'),'Worldwide scope is explicit');
    for(const {e} of activeEvents())check(DiscoveryCore.yearGap(e.start,e.end,state.year)<=2,'Every event overlaps the selected window');
    check([...document.querySelectorAll('#people [data-id]')].every(b=>{const p=byId[b.dataset.id];return p.born<=state.year&&p.died>=state.year}),'Listed people were alive that year');
    const event=ev.find(e=>e.wiki==='Penicillin');select(event.id,false);
    check(!document.querySelector('#detail [data-story]').closest('details').open,'Other-date exploration is collapsed');
    slider.value=Math.round(tAt(1992)*SLIDER_STEPS);slider.dispatchEvent(new Event('input',{bubbles:true}));
    await new Promise(r=>setTimeout(r,250));
    check(state.year===1992&&!state.sel&&!document.querySelector('#detail .detail'),'Scrubbing clears obsolete detail');
    setYear(1928);select(event.id,false);document.getElementById('play').click();
    await new Promise(r=>setTimeout(r,250));stopPlay();
    check(state.year>1928&&!state.sel&&!document.querySelector('#detail .detail'),'Playback clears obsolete detail');
    setYear(1);const augustus=ppl.find(p=>p.wiki==='Augustus');select(augustus.id,false);
    check(document.querySelector('#detail p').textContent.includes('63 years old'),'BC/AD detail age skips year zero');
    check(document.querySelector('#people [data-id="'+augustus.id+'"]').textContent.includes('age ≈63'),'People list age matches detail');
    setYear(1100);check(document.querySelector('.timeline-context-list'),'Long historical intervals have their own section');
    check([...document.querySelectorAll('.timeline-context-list [data-id]')].every(b=>DiscoveryCore.isHistoricalContext(byId[b.dataset.id],1100)),'Historical context follows actual intervals');
    setYear(1992);document.getElementById('compareToggle').click();
    const form=document.getElementById('compareYears');form.elements.left.value='1928';form.elements.right.value='1992';form.requestSubmit();
    select(event.id,false,1928);
    check(state.year===1992&&document.querySelector('.selection-scope').textContent.includes('left-hand map'),'Left-map detail retains its own year');
    check(document.getElementById('sideScope').textContent.includes('1992 · right-hand map'),'Worldwide list identifies the right-hand map');
    setYear(2000);check(!document.querySelector('.selection-scope'),'Changing date clears old comparison selection');
    document.getElementById('compareToggle').click();setYear(1928);document.getElementById('side').scrollTop=0;
    return 'Sidebar order, worldwide scope, interval relevance, scrub/playback resets, BC/AD ages and comparison scope passed';
  })()`));
  await screenshot('desktop');
  console.log(await evaluate(`(async()=>{
    const check=(v,m)=>{if(!v)throw Error(m)};
    const panel=document.querySelector('.discovery-panel'),originalLoad=loadChunk;
    try {
      loadChunk=async(...args)=>{await new Promise(r=>setTimeout(r,15));return originalLoad(...args)};
      const scan=HistoryDiscovery.explore([-.12,51.5]);
      const method=panel.querySelector('.place-method');method.open=true;method.querySelector('summary').focus();
      await scan;
      check(panel.textContent.includes('Search complete')&&panel.querySelector('.place-scope').textContent.includes('All recorded periods'),'Local timeline is explicitly all periods');
      check(document.activeElement.matches('.place-method summary')&&panel.querySelector('.place-method').open,'Loading preserves keyboard focus and source disclosure');
      setYear(1928);
      check(panel.querySelector('.place-current-year').textContent.includes('1928'),'Local view identifies the current map year');
      const row=[...panel.querySelectorAll('[data-place-row]')].find(b=>b.dataset.placeStart==='1928');
      if(row){row.click();check(!panel.hidden&&state.sel,'Local row can open detail while keeping its timeline');}
      select(ev.find(e=>e.wiki==='Apollo_11').id,false);
      check(panel.hidden,'Selecting another place clears stale local history');
    } finally {loadChunk=originalLoad;}
    const shelf=document.querySelector('.curated-discoveries');shelf.querySelector('[data-discovery="diaper-care-1961"]').click();
    check(shelf.parentElement.lastElementChild===shelf,'Opening a story does not reorder the sidebar');
    setYear(1992);check(!shelf.querySelector('[data-curated-return]').hidden&&shelf.querySelector('.curated-map-status').textContent.includes('1992'),'Off-year story identifies its authored date');
    shelf.querySelector('[data-curated-close]').click();check(document.activeElement.dataset.discovery==='diaper-care-1961','Closing restores story focus');
    return 'Local scope, loading focus, source disclosure, stale-location reset and curated navigation passed';
  })()`));
  for (const width of [1440, 860, 390, 320]) {
    await send('Emulation.setDeviceMetricsOverride', { width, height: 1000, deviceScaleFactor: 1, mobile: width <= 860 });
    console.log(await evaluate(`(()=>{
      const check=(v,m)=>{if(!v)throw Error(m)};
      const shelf=document.querySelector('.curated-discoveries');
      shelf.querySelector('[data-discovery="diaper-care-1961"]').scrollIntoView({block:'center',behavior:'instant'});
      shelf.querySelector('[data-discovery="diaper-care-1961"]').click();
      if(innerWidth>860){
        const h=shelf.querySelector('[data-curated-heading]').getBoundingClientRect(),s=document.getElementById('side').getBoundingClientRect(),intro=document.querySelector('.side-intro').getBoundingClientRect();
        check(h.top>=intro.bottom&&h.bottom<=s.bottom,'Opened story heading is visible below the sticky header');
      }
      const cards=[...shelf.querySelectorAll('.same-year-place')].map(el=>el.getBoundingClientRect());
      check(cards[1].top>=cards[0].bottom,'Two-place stories stack inside the sidebar');
      check(document.documentElement.scrollWidth<=innerWidth,'No page overflow');
      check([...document.querySelectorAll('.side-content, .curated-reader, .same-year-place')].every(el=>el.scrollWidth<=el.clientWidth+1),'No sidebar overflow');
      shelf.querySelector('[data-curated-close]').click();setYear(1928);stopSpin();flyToken++;
      const row=document.querySelector('#regions [data-id="'+ev.find(e=>e.wiki==='Penicillin').id+'"]');
      check(parseFloat(getComputedStyle(row.querySelector('.b')).fontSize)>=14,'Readable event body text');
      check([...document.querySelectorAll('.person')].every(el=>el.getBoundingClientRect().height>=44),'People have touch-sized targets');
      row.click();check(document.activeElement.id==='detail','Selecting a result focuses the reader');
      check(document.querySelector('#detail .close').getBoundingClientRect().width>=44,'Close has a touch-sized target');
      document.querySelector('#detail .close').click();check(document.activeElement.dataset.id===row.dataset.id,'Close returns focus to result');
      document.getElementById('side').scrollTop=0;
      if(innerWidth<=860)document.getElementById('side').scrollIntoView({block:'start',behavior:'instant'});
      else window.scrollTo(0,0);
      return 'Readable, stacked, overflow-free sidebar and reader focus at '+innerWidth+'px';
    })()`));
    if (width === 390) await screenshot('mobile');
  }
  assert.deepEqual(errors, [], 'No browser runtime exceptions');
  console.log('Browser runtime exceptions: none');
} finally {
  await send('Target.closeTarget', { targetId: tab.id }); ws.close();
}
