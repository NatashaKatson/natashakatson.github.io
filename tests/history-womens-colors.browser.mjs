// Dedicated women’s rights chronology, trusted readers, reproductive history and responsive controls.
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
  fs.writeFileSync(path.join(os.tmpdir(), 'history-womens-colors-' + name + '.png'), Buffer.from(shot.data, 'base64'));
};
try {
  await send('Runtime.enable');await send('Network.enable');
  await send('Network.setCacheDisabled',{cacheDisabled:true});
  await send('Network.setBlockedURLs',{urls:url.startsWith('file:')?['http://*','https://*']:['https://fonts.googleapis.com/*','https://fonts.gstatic.com/*']});
  await send('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
  await send('Page.navigate',{url:url+'#2026'});
  await waitFor('!!window.HistoryWomensColors && !!window.AtlasUI');
  await evaluate(`stopSpin();flyToken++;`);
  assert(await evaluate(`!state.rightsColors&&document.querySelector('.rights-map-legend').hidden`),'Colors default off');
  await evaluate(`globalThis.colorsTestFetch=fetch;window.fetch=(...args)=>String(args[0]).endsWith('womens-empowerment.json')?Promise.reject(Error('Test unavailable scores')):colorsTestFetch(...args);document.querySelector('[data-atlas-menu="womensRightsPanel"]').click();document.getElementById('rightsColorsTab').click();`);
  await waitFor('HistoryWomensColors.failed');
  await evaluate(`document.getElementById('rightsColorToggle').click()`);
  await waitFor('HistoryWomensColors.failed');
  assert(await evaluate(`state.rightsColors&&!document.getElementById('rightsColorRetry').hidden&&HistoryWomensColors.fillFor([],2026)({name:'Canada'})===WomensEmpowermentCore.missing`),'Load failure stays grey and exposes retry');
  await evaluate(`window.fetch=colorsTestFetch;document.getElementById('rightsColorRetry').click()`);
  await waitFor('HistoryWomensColors.ready');
  assert(await evaluate(`document.getElementById('rightsColorStatus').textContent.includes('latest scores: 2025')`),'2026 explicitly labels latest 2025 data');
  await evaluate(`state.cats.clear();buildMarks();setMode('flat');flatT={x:0,y:0};zoomK=1;document.querySelector('.rights-close').click();update();render();`);
  await waitFor(`polities().some(f=>f.name==='Canada')`);
  console.log(await evaluate(`(()=>{
    const check=(v,m)=>{if(!v)throw Error(m)};render();
    const pixel=point=>{const p=proj(point);return Array.from(ctx.getImageData(Math.round(p[0]*DPR),Math.round(p[1]*DPR),1,1).data).slice(0,3)};
    check(JSON.stringify(pixel([-106,56]))===JSON.stringify([57,133,101]),'Canada is painted green on the canvas');
    check(JSON.stringify(pixel([67,33]))===JSON.stringify([184,61,70]),'Afghanistan is painted red on the canvas');
    check(mapAtYear(...proj([67,33])).label.includes('0.028/1 (2025; latest available)'),'Hover identifies the observed score year');
    const canada=polities().find(f=>f.name==='Canada');selectPolity(canada);renderDetail();
    check(document.querySelector('.rights-score-card').textContent.includes('0.872 / 1'),'Country reader shows numeric score');
    check(!!document.querySelector('.rights-score-card a[href^="https://ourworldindata.org/"]'),'Country reader links its source');
    return 'Failure/retry, latest-year disclosure, actual country fills, hover and sourced reader passed';
  })()`));
  await screenshot('world-2026');
  await evaluate(`document.querySelector('#detail .close').click();document.querySelector('[data-atlas-menu="womensRightsPanel"]').click();document.getElementById('rightsMilestonesTab').click();document.getElementById('rightsVisibility').click();`);
  assert(await evaluate('state.rightsColors'),'Milestone visibility is independent of country colors');
  await evaluate(`document.getElementById('rightsColorsTab').click();document.getElementById('rightsCountrySearch').value='Afghanistan';document.getElementById('rightsCountrySearch').dispatchEvent(new Event('input'));document.getElementById('compareToggle').click();const f=document.getElementById('compareYears');f.elements.left.value='2020';f.elements.right.value='2025';f.requestSubmit();render();`);
  await waitFor(`document.querySelectorAll('#rightsCountryResults tbody td').length===2`);
  assert.deepEqual(await evaluate(`[...document.querySelectorAll('#rightsCountryResults tbody td')].map(td=>td.textContent)`),['0.494','0.028'],'Comparison uses the score for each side');
  await evaluate(`document.querySelector('.rights-close').click();state.cats.clear();buildMarks();flatT.x-=proj([67.5,33])[0]-W/2;render();`);
  console.log(await evaluate(`(()=>{
    const check=(v,m)=>{if(!v)throw Error(m)};
    const pixel=point=>{const p=proj(point);return Array.from(ctx.getImageData(Math.round(p[0]*DPR),Math.round(p[1]*DPR),1,1).data).slice(0,3)};
    const afghan=polities().find(f=>f.name==='Afghanistan');
    const visibleColor=(rgb,left)=>{for(let lon=62;lon<72;lon+=.5)for(let lat=30;lat<37;lat+=.5){const point=[lon,lat],p=proj(point);if((p[0]<W/2)===left&&d3.geoContains(afghan,point)&&JSON.stringify(pixel(point))===JSON.stringify(rgb))return true;}return false;};
    check(visibleColor([225,196,103],true),'Comparison left paints Afghanistan’s 2020 score');
    check(visibleColor([184,61,70],false),'Comparison right paints Afghanistan’s 2025 score');
    return 'Independent milestone filters and both comparison canvas colors passed';
  })()`));
  await screenshot('afghanistan-comparison');
  const shared=await evaluate('HistoryDiscovery.urlHash()');
  await send('Page.navigate',{url:url+shared});await waitFor('!!window.HistoryWomensColors && HistoryWomensColors.ready');
  assert(await evaluate(`state.rightsColors&&HistoryDiscovery.isComparing()&&document.getElementById('rightsColorToggle').checked`),'Shared views restore color mode and comparison');
  await evaluate(`document.getElementById('compareToggle').click();setYear(1500);render();`);
  assert(await evaluate(`document.querySelector('.rights-map-years').textContent.includes('no score data')&&HistoryWomensColors.fillFor([],1500)({name:'Canada'})===WomensEmpowermentCore.missing`),'Earlier history is labelled unknown');
  await evaluate(`state.borders='today';setYear(2025);render();`);
  assert(await evaluate(`HistoryWomensColors.fillFor([],2025)({properties:{name:'Canada'}})==='#398565'`),'Today-border mode resolves basemap countries');
  await evaluate(`setYear(1950);document.getElementById('play').click();`);
  await waitFor('state.playing&&state.year>1950');
  assert(await evaluate(`state.rightsColors&&document.querySelector('.rights-map-years').textContent.includes(String(state.year))`),'Playback keeps the country-color year synchronized');
  await evaluate(`stopPlay();setYear(2025);`);
  await evaluate(`document.querySelector('[data-atlas-menu="womensRightsPanel"]').click();document.getElementById('rightsColorsTab').click();document.getElementById('rightsCountrySearch').value='';HistoryWomensColors.render();`);
  for(const [width,height] of [[1440,1000],[1440,400],[900,400],[768,1024],[390,844],[320,500],[844,390]]){
    await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<=860});
    await evaluate(`(()=>{resize();AtlasUI.render();const trigger=document.querySelector('[data-atlas-menu="womensRightsPanel"]');if(trigger.getAttribute('aria-expanded')!=='true')trigger.click();document.getElementById('rightsColorsPane').scrollTop=0;})()`);
    assert(await evaluate(`(()=>{const p=document.getElementById('womensRightsPanel').getBoundingClientRect(),t=document.getElementById('rightsColorToggle').getBoundingClientRect();return p.left>=0&&p.right<=innerWidth&&p.top>=0&&p.bottom<=innerHeight&&t.top>=p.top&&t.bottom<=p.bottom&&document.documentElement.scrollWidth<=innerWidth})()`),'Color controls fit '+width+'×'+height);
    await screenshot(width+'x'+height);
    assert(await evaluate(`(()=>{const pane=document.getElementById('rightsColorsPane'),row=pane.querySelector('tbody tr:last-child');row.scrollIntoView({block:'nearest'});const r=row.getBoundingClientRect(),p=pane.getBoundingClientRect();return r.top>=p.top&&r.bottom<=p.bottom+1})()`),'Last numeric score is reachable at '+width+'×'+height);
  }
  await evaluate(`document.getElementById('rightsColorToggle').click();`);
  assert(await evaluate(`!state.rightsColors&&document.querySelector('.rights-map-legend').hidden&&HistoryWomensColors.fillFor([],2025)===null`),'Turning colors off restores the original palette');
  assert.deepEqual(errors,[],'No browser exceptions');
  console.log('Ancient gaps, saved views, present-day outlines, responsive lookup and disabling colors passed');
} finally {ws.close();await fetch(cdp+'/json/close/'+tab.id);}
