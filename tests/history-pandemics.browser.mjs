// Pandemic filter, map markers, ongoing labels, search and share regression checks.
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
  fs.writeFileSync(path.join(os.tmpdir(), 'history-pandemics-' + name + '.png'), Buffer.from(shot.data, 'base64'));
};
try {
  await send('Runtime.enable'); await send('Network.enable');
  await send('Network.setBlockedURLs', { urls: url.startsWith('file:') ? ['http://*', 'https://*'] : ['https://fonts.googleapis.com/*', 'https://fonts.gstatic.com/*', 'https://cdnjs.buymeacoffee.com/*'] });
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: url + '#1918' });
  await waitFor('!!window.AtlasUI && !!window.HistoryDiscovery');
  console.log(await evaluate(`(async()=>{
    const check=(v,m)=>{if(!v)throw Error(m)};
    stopSpin();flyToken++;
    const trigger=document.querySelector('[data-atlas-menu="filtersPanel"]');trigger.click();
    const chip=document.querySelector('#legend [data-k="pandemics"]');
    check(chip&&!chip.hidden&&chip.textContent.includes('Pandemics'),'Pandemics is a human-history filter');
    check(getComputedStyle(chip).getPropertyValue('--c-pandemics').trim()==='#317d83','Pandemic swatch has a real color');
    check(document.getElementById('filterCount').textContent==='7','All seven human filters counted');
    for(const b of document.querySelectorAll('#legend [data-k]'))if(b!==chip&&b.getAttribute('aria-pressed')==='true')b.click();
    render();check(state.cats.size===1&&state.cats.has('pandemics'),'Pandemics can be isolated');
    check(document.getElementById('filterCount').textContent==='1','Isolated category count is one');
    for(const [wiki,year] of [['Antonine_Plague',170],['Plague_of_Justinian',650],['Second_plague_pandemic',1600],['Second_cholera_pandemic',1834],['Third_plague_pandemic',1900],['Spanish_flu',1918],['HIV/AIDS',2000],['COVID-19',2026]]){
      const e=ev.find(e=>e.wiki===wiki);
      await HistoryDiscovery.jumpSearch({kind:'event',recordId:e.id,start:e.start,lon:e.lon,lat:e.lat});flyToken++;
      setYear(year);render();
      check(activeEvents().some(({e:a})=>a===e),'Active interval '+wiki+' in '+year);
      check(hits.some(h=>h.id===e.id),'Selectable map marker '+wiki+' in '+year);
      check(document.querySelector('#regions [data-id="'+e.id+'"]'),'Sidebar interval '+wiki);
      const hit=hits.find(h=>h.id===e.id);
      check(nearest(hit.x,hit.y)?.id===e.id,'Marker hit testing '+wiki);
      select(e.id,false);flyToken++;
      check(document.querySelector('#detail h3').textContent.includes(e.title),'Reader opens '+wiki);
      if(e.ongoing)check(document.querySelector('#detail .kicker').textContent.includes('present'),'Ongoing reader label '+wiki);
      document.querySelector('#detail .close').click();
    }
    const covid=ev.find(e=>e.wiki==='COVID-19');
    check(hits.find(h=>h.id===covid.id).label.includes('present'),'Map tooltip uses present');
    check(document.querySelector('#regions [data-id="'+covid.id+'"] .y').textContent==='2019–present','Sidebar uses present');
    document.querySelector('[data-atlas-menu="filtersPanel"]').click();
    chip.click();check(state.cats.has('pandemics'),'At least one category remains enabled');
    const nature=document.querySelector('#legend [data-k="nature"]');nature.click();chip.click();render();
    check(!activeEvents().some(({e})=>e.cat==='pandemics')&&!hits.some(h=>byId[h.id]?.cat==='pandemics'),'Disabling pandemics removes their map markers');
    check(nature.getAttribute('aria-pressed')==='true'&&chip.getAttribute('aria-pressed')==='false','Filters are independent');
    document.querySelector('.history-search-trigger').click();
    const input=document.getElementById('historySearchInput');input.value='COVID-19 pandemic';input.dispatchEvent(new Event('input',{bubbles:true}));
    await new Promise(r=>setTimeout(r,180));
    const result=[...document.querySelectorAll('[data-search-result]')].find(b=>b.querySelector('strong').textContent==='COVID-19 pandemic');
    check(result&&result.querySelector('.search-result-date').textContent==='2019–present','Search retains ongoing labels');
    result.click();await new Promise(r=>setTimeout(r,180));
    check(state.cats.has('pandemics')&&state.sel===covid.id,'Search re-enables hidden pandemic category');
    document.querySelector('#detail .close').click();setYear(2026);
    nature.click();
    check(state.cats.size===1&&state.cats.has('pandemics'),'Share a pandemic-only view');
    return 'Pandemic-only filtering, interval markers, actual map clicks, reader, continuing labels and search passed';
  })()`));
  const point = await evaluate(`(()=>{const t=document.querySelector('[data-atlas-menu="filtersPanel"]');if(t.getAttribute('aria-expanded')==='true')t.click();flyToken++;render();const e=ev.find(e=>e.wiki==='COVID-19'),h=hits.find(h=>h.id===e.id),r=cv.getBoundingClientRect();return {x:r.left+h.x,y:r.top+h.y}})()`);
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', ...point, button: 'left', clickCount: 1 });
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', ...point, button: 'left', clickCount: 1 });
  assert(await evaluate(`byId[state.sel]?.wiki==='COVID-19'`), 'Real map click selects pandemic marker');
  await evaluate(`document.querySelector('#detail .close').click()`);
  const shared = await evaluate('location.hash');
  assert(shared.includes('view='), 'Share state includes category settings');
  await send('Page.navigate', { url: url + shared });
  await waitFor('!!window.AtlasUI && state.cats.size===1 && state.cats.has("pandemics")');
  assert(await evaluate('state.year===2026'), 'Shared pandemic view restores year');
  for (const width of [1440, 390, 320]) {
    await send('Emulation.setDeviceMetricsOverride', { width, height: 844, deviceScaleFactor: 1, mobile: width <= 860 });
    await evaluate(`{window.scrollTo({top:0,behavior:'instant'});const t=document.querySelector('[data-atlas-menu="filtersPanel"]');if(t.getAttribute('aria-expanded')!=='true')t.click();}`);
    assert(await evaluate(`(()=>{const b=document.querySelector('#legend [data-k="pandemics"]');b.scrollIntoView({block:'nearest'});const r=b.getBoundingClientRect();return r.width>0&&r.height>=40&&r.left>=0&&r.right<=innerWidth&&document.documentElement.scrollWidth<=innerWidth})()`), `Pandemic filter reachable at ${width}px`);
    await screenshot(String(width));
  }
  assert.deepEqual(errors, [], 'No browser runtime errors');
  console.log('Shared view restoration and 1440/390/320px filter layouts passed');
} finally {
  ws.close();
  await fetch(cdp + '/json/close/' + tab.id);
}
