// Regression checks for search access, interior country points, reading focus and period context.
import assert from 'node:assert/strict';
const cdp = process.env.ATLAS_CDP_URL || 'http://127.0.0.1:9231';
const url = process.env.ATLAS_TEST_URL || 'http://127.0.0.1:8891/atlas/';
const tab = await (await fetch(cdp + '/json/new?about:blank', { method: 'PUT' })).json();
const ws = new WebSocket(tab.webSocketDebuggerUrl);
await new Promise((resolve, reject) => { ws.addEventListener('open', resolve, { once: true }); ws.addEventListener('error', reject, { once: true }); });
let id = 0, supportRequest = null;
const pending = new Map(), errors = [];
ws.onmessage = ({ data }) => {
  const message = JSON.parse(data);
  if (message.method === 'Fetch.requestPaused') supportRequest = message.params.requestId;
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
  await send('Runtime.enable'); await send('Network.enable');
  await send('Network.setCacheDisabled', { cacheDisabled: true });
  await send('Fetch.enable', { patterns: [{ urlPattern: '*cdnjs.buymeacoffee.com*', requestStage: 'Request' }] });
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: url + '#1992' });
  await waitFor('!!window.AtlasUI && !!window.HistoryCountries');
  assert(supportRequest, 'Support request is still held');
  assert(await evaluate(`document.getElementById('yr').textContent==='1992'`), 'Atlas starts while support request is stalled');
  await send('Fetch.failRequest', { requestId: supportRequest, errorReason: 'BlockedByClient' });
  await send('Fetch.disable');
  console.log('Atlas initializes independently of the optional support button');
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
    setYear(1992);const musqueam=ev.find(e=>e.wiki==='Musqueam_Indian_Band');
    assert(document.getElementById('sideSub').textContent==='1 dated event within one year of 1992','1992 contains the nearby dated event');
    assert(!activeEvents().some(({e})=>e.indigenous)&&!document.querySelector('.timeline-context-list'),'No unrelated continuing Indigenous overviews');
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
  assert.equal(errors.length, 0, JSON.stringify(errors));
  console.log('Mobile Search is visible and reachable at 390px; no runtime errors');
} finally {
  if (supportRequest) await send('Fetch.disable').catch(() => {});
  await send('Page.close').catch(() => {}); ws.close();
}
