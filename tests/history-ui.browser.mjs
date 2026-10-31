import { workspaceSetup } from './atlas-workspace-helpers.mjs';
// Regression checks for search access, interior country points, reading focus and period context.
import assert from 'node:assert/strict';
const cdp = process.env.ATLAS_CDP_URL || 'http://127.0.0.1:9231';
const url = process.env.ATLAS_TEST_URL || 'http://127.0.0.1:8891/atlas/';
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
  const call = ++id, timer = setTimeout(() => { pending.delete(call); reject(Error('CDP timeout: ' + method)); }, 20000);
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
try {
  await send('Page.enable');
  await send('Page.addScriptToEvaluateOnNewDocument', { source: workspaceSetup });
  await send('Runtime.enable'); await send('Network.enable');
  await send('Network.setCacheDisabled', { cacheDisabled: true });
  await send('Network.setBlockedURLs', { urls: ['https://cdnjs.buymeacoffee.com/*'] });
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: url + '#1992' });
  await waitFor('!!window.AtlasUI && !!window.HistoryCountries');
  assert(await evaluate(`document.getElementById('yr').textContent==='1992'`), 'Atlas starts with the support service blocked');
  await evaluate(`document.querySelector('[data-atlas-footer]').click()`);
  assert(await evaluate(`(()=>{const a=document.querySelector('.atlas-support-link');return a?.href==='https://www.buymeacoffee.com/natashakatson'&&a.getBoundingClientRect().height>=44&&a.textContent.includes('Buy me a coffee')})()`), 'Support link stays visible with the support service blocked');
  await evaluate(`document.querySelector('[data-return-atlas]').click()`);
  console.log('Atlas and support link work independently of the support service');
  const bad = await evaluate(`(async()=>{
    stopSpin();flyToken++;
    const high=world(await(await fetch('land-50m.json')).json());
    if(HistoryCountries.rows.length!==high.countries.length)throw Error('Incomplete country catalog');
    return HistoryCountries.rows.filter(([name,lon,lat])=>!d3.geoContains(high.countries.find(f=>f.properties.name===name),[lon,lat]));
  })()`);
  assert.deepEqual(bad, [], 'Every country destination is inside its detailed map polygon');
  console.log('All 241 country and territory search destinations are on their own land');
  console.log(await evaluate(`(async()=>{
    const assert=(v,m)=>{if(!v)throw Error(m)};
    const trigger=document.querySelector('.history-search-trigger');
    assert(trigger.getBoundingClientRect().height>=40,'Search is visibly available');
    trigger.focus();trigger.click();assert(document.getElementById('historySearch').open,'Search button opens dialog');
    const input=document.getElementById('historySearchInput');
    for(const name of ['France','Singapore','Malta','Bahrain']){
      document.querySelector('[data-search-kind="place"]').click();input.value=name;input.dispatchEvent(new Event('input',{bubbles:true}));
      await new Promise(r=>setTimeout(r,160));
      assert([...document.querySelectorAll('[data-search-result]')].some(b=>b.querySelector('strong').textContent===name&&b.textContent.includes('Present-day country or territory')),'Country result '+name);
    }
    document.querySelector('[data-search-close]').click();
    assert(document.activeElement===trigger,'Search close restores trigger focus');
    setYear(1928);const event=ev.find(e=>e.wiki==='Penicillin');
    const row=document.querySelector('#regions [data-id="'+event.id+'"]');
    row.scrollIntoView({block:'center',behavior:'instant'});row.focus();
    const side=document.getElementById('side'),saved=side.scrollTop;
    row.click();const detail=document.getElementById('detail'),r=detail.getBoundingClientRect(),s=side.getBoundingClientRect();
    assert(r.top>=s.top&&r.top<s.bottom,'Selected detail is visible within sidebar');
    assert(document.activeElement===detail,'Selected reader receives keyboard focus');
    detail.querySelector('.close').click();
    assert(document.activeElement.dataset.id===event.id&&Math.abs(side.scrollTop-saved)<2,'Close restores list focus and scroll');
    for(const [year,visible] of [[1926,true],[1930,true],[1925,false],[1931,false]]){
      setYear(year);
      assert(!!document.querySelector('#regions [data-id="'+event.id+'"]')===visible,'Penicillin follows the inclusive two-year window in '+year);
    }
    setYear(1992);const musqueam=ev.find(e=>e.wiki==='Musqueam_Indian_Band');
    assert(document.getElementById('sideSub').textContent==='4 dated events within 2 years of 1992 · 3 historical context records','1992 contains dated events and continuing periods with women’s-rights markers off by default');
    for(const wiki of ['Dissolution_of_the_Soviet_Union','1994_South_African_general_election']){
      assert(document.querySelector('#regions [data-id="'+ev.find(e=>e.wiki===wiki).id+'"]'),'1992 includes '+wiki);
    }
    assert(!activeEvents().some(({e})=>e.indigenous),'No unrelated continuing Indigenous overviews');
    select(musqueam.id,false);
    assert(state.year===500&&!document.querySelector('.timeline-context-note'),'Selecting Musqueam visits its approximate movement date');
    document.querySelector('#detail .close').click();setYear(1100);
    const chaco=ev.find(e=>e.wiki==='Chaco_Culture');
    document.querySelector('.timeline-context-list [data-id="'+chaco.id+'"]').click();
    assert(state.year===1100&&document.querySelector('.timeline-context-note').textContent.includes('850–1250'),'Genuine archaeological period remains contextual');
    document.querySelector('#detail .close').click();
    return 'Visible search, missing countries, sidebar reading/restoration and corrected Indigenous dates passed';
  })()`));
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await evaluate(`window.scrollTo({top:0,behavior:'instant'});`);
  await new Promise((r) => setTimeout(r, 100));
  assert(await evaluate(`(()=>{const b=document.querySelector('.history-search-trigger'),r=b.getBoundingClientRect();return r.height>=44&&document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)?.closest('button')===b&&document.documentElement.scrollWidth<=innerWidth})()`), 'Mobile search is reachable with no horizontal overflow');
  await evaluate(`document.querySelector('.history-search-trigger').click()`);
  assert(await evaluate(`document.getElementById('historySearch').open`), 'Mobile search opens by touch/click');
  await evaluate(`localStorage.removeItem('atlas.last-year.v1')`);
  const visitYear = async (suffix, year) => {
    await send('Page.navigate', { url: url + suffix });
    await waitFor(`!!window.AtlasUI && !!window.HistoryCountries && state.year===${year}`);
  };
  await visitYear('?startup=first', 2026);
  await evaluate(`setYear(1789)`);
  assert.equal(await evaluate(`localStorage.getItem('atlas.last-year.v1')`), '1789');
  await visitYear('?startup=return', 1789);
  await evaluate(`slider.value=Math.round(tAt(-500)*SLIDER_STEPS);slider.dispatchEvent(new Event('input',{bubbles:true}))`);
  assert.equal(await evaluate(`localStorage.getItem('atlas.last-year.v1')`), '-500', 'Scrubbing saves immediately');
  await visitYear('?startup=bc', -500);
  await visitYear('#1903', 1903);
  const exactView = await evaluate(`HistoryDiscovery.urlHash()`);
  await evaluate(`setYear(1453)`);
  await visitYear(exactView, 1903);
  await visitYear('#67000000bc', -67000000);
  await visitYear('?startup=deep', -67000000);
  await evaluate(`localStorage.setItem('atlas.last-year.v1','0')`);
  await visitYear('?startup=invalid', 2026);
  const blockedStorage = await send('Page.addScriptToEvaluateOnNewDocument', { source: `Object.defineProperty(window,'localStorage',{get(){throw Error('Storage blocked')}})` });
  try {
    await visitYear('?startup=blocked', 2026);
    await evaluate(`setYear(1789)`);
    assert.equal(await evaluate(`state.year`), 1789, 'Atlas remains usable with blocked storage');
    await visitYear('#500bc', -500);
  } finally {
    await send('Page.removeScriptToEvaluateOnNewDocument', { identifier: blockedStorage.identifier });
  }
  console.log('Fresh visits, remembered years, immediate slider persistence, explicit links, exact views, deep time and blocked storage passed');
  assert.equal(errors.length, 0, JSON.stringify(errors));
  console.log('Mobile Search is visible and reachable at 390px; no runtime errors');
} finally {
  await fetch(cdp+'/json/close/'+tab.id); ws.close();
}
