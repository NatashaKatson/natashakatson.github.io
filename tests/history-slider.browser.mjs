// Run with the isolated Chrome/static server documented in docs/history-discovery.md.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const cdp = process.env.ATLAS_CDP_URL || 'http://127.0.0.1:9231';
const url = process.env.ATLAS_TEST_URL || 'http://127.0.0.1:8891/atlas/';
const page = await (await fetch(cdp + '/json/new?about:blank', { method: 'PUT' })).json();
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((resolve, reject) => { ws.addEventListener('open', resolve, { once: true }); ws.addEventListener('error', reject, { once: true }); });
let id = 0;
const pending = new Map(), paused = new Map(), errors = [];
const keepAlive = setInterval(() => {}, 1000);
ws.addEventListener('message', ({ data }) => {
  const msg = JSON.parse(data);
  if (msg.method === 'Runtime.exceptionThrown') errors.push(msg.params.exceptionDetails);
  if (msg.method === 'Fetch.requestPaused') paused.set(msg.params.requestId, msg.params.request.url);
  const call = pending.get(msg.id);
  if (!call) return;
  pending.delete(msg.id); clearTimeout(call.timeout);
  msg.error ? call.reject(Error(JSON.stringify(msg.error))) : call.resolve(msg.result);
});
const send = (method, params = {}) => new Promise((resolve, reject) => {
  const call = ++id;
  const timeout = setTimeout(() => { pending.delete(call); reject(Error('CDP timed out: ' + method)); }, 20000);
  pending.set(call, { resolve, reject, timeout });
  ws.send(JSON.stringify({ id: call, method, params }));
});
const evaluate = async (expression) => {
  const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (result.exceptionDetails) throw Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
  return result.result.value;
};
const waitFor = async (check, message) => {
  for (let i = 0; i < 100; i++) {
    if (await check()) return;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw Error(message);
};
const checkMap = `(() => {
  const g=geo(),age=HistoryPaleogeography.snapshot(state.year)?.age;
  const area=d3.geoArea(g.land);
  if(!(area>1&&area<6))throw Error('Land disappeared or filled the world at '+state.year+' (area '+area+')');
  if(state.year < -1000000 && !g.ancient)throw Error('Modern continents substituted at '+state.year);
  if(state.mode==='flat'){
    const pixels=ctx.getImageData(0,0,cv.width,cv.height).data;
    let land=0;
    for(let i=0;i<pixels.length;i+=64)if(pixels[i]<190&&pixels[i+1]>pixels[i]+5&&pixels[i+2]<190&&pixels[i+3]===255)land++;
    if(land<100)throw Error('Canvas has no visible land at '+state.year);
  }
  return {year:state.year,age,area};
})()`;

try {
  await send('Runtime.enable'); await send('Network.enable');
  await send('Network.setCacheDisabled', { cacheDisabled: true });
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: url + '#1903' });
  await waitFor(() => evaluate('!!window.HistoryDinosaurs'), 'Atlas did not load');
  // Hold detailed maps indefinitely: every cold date still needs visible land.
  await send('Fetch.enable', { patterns: [{ urlPattern: '*/paleogeography/*.json', requestStage: 'Request' }] });
  await evaluate(`stopSpin();flyToken++;document.getElementById('vFlat').click();`);
  console.log(await evaluate(`(() => {
    const samples=[];
    const years=[...HISTORY_PALEOGEOGRAPHY.snapshots.map(s=>-s.age*1000000).reverse(),-1000001,-1000000,-300000,-3000,1453,1903,2026];
    for(const year of years){
      slider.value=Math.round(tAt(year)*SLIDER_STEPS);slider.dispatchEvent(new Event('input',{bubbles:true}));render();
      samples.push(${checkMap});
    }
    return 'Slider input: '+samples.length+' cold dates retain visible land, including the deep-time boundary';
  })()`));

  // Exercise real pointer dragging in both directions, leaving downloads paused.
  for (const [width, height] of [[1440, 1000], [390, 844]]) {
    await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: width < 600 });
    await evaluate(`setYear(-228000000);setMode('flat');slider.scrollIntoView({block:'center',behavior:'instant'});`);
    await evaluate('new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))');
    const rect = await evaluate(`(()=>{const r=slider.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height}})()`);
    const y = rect.y + rect.height / 2;
    const positions = [.01,.025,.04,.065,.09,.12,.15,.19,.24,.3,.5,.8,.99,.8,.3,.15,.07,.01];
    const xAt = (part) => rect.x + 10 + (rect.width - 20) * part;
    await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: xAt(positions[0]), y, button: 'left', clickCount: 1 });
    for (const part of positions) {
      await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: xAt(part), y, button: 'left', buttons: 1 });
      await evaluate('new Promise(r=>requestAnimationFrame(r))');
      await evaluate(checkMap);
    }
    await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: xAt(positions.at(-1)), y, button: 'left', clickCount: 1 });
    console.log(`Real slider drag at ${width}px: no blank frames`);
  }

  // Failed detailed downloads must leave the overview visible and retry usable.
  await evaluate(`setYear(-228000000);render();`);
  await waitFor(() => Promise.resolve([...paused.values()].some((u) => u.endsWith('/228.json'))), 'Settled snapshot did not request detail');
  for (const [requestId] of paused) await send('Fetch.failRequest', { requestId, errorReason: 'Failed' });
  paused.clear();
  await waitFor(() => evaluate(`HistoryPaleogeography.status(-228000000).state==='error'`), 'Failed detail did not report failure');
  await evaluate(`render();${checkMap};if(document.querySelector('[data-paleo-retry]').hidden)throw Error('No retry for detailed map');`);
  await evaluate(`document.querySelector('[data-paleo-retry]').click();render();${checkMap}`);
  await waitFor(() => Promise.resolve(paused.size > 0), 'Retry did not request detail');
  await send('Fetch.disable');
  await waitFor(() => evaluate(`HistoryPaleogeography.status(-228000000).state==='ready'`), 'Retry did not finish');
  await evaluate(`render();${checkMap};document.getElementById('vGlobe').click();stopSpin();render();${checkMap}`);
  console.log('Failed download, retry and globe switch retain land');

  await evaluate(`document.getElementById('compareToggle').click();const f=document.getElementById('compareYears');f.elements.left.value='150 Ma';f.elements.right.value='67 Ma';f.requestSubmit();render();`);
  await evaluate(`for(const year of HistoryDiscovery.displayedYears()){const g=HistoryPaleogeography.geography(year);if(d3.geoArea(g.land)<1)throw Error('Comparison side lost land')}`);
  const shot = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(os.tmpdir(), 'history-slider-mobile.png'), Buffer.from(shot.data, 'base64'));
  assert.equal(errors.length, 0, JSON.stringify(errors));
  console.log('Independent comparison snapshots and browser exceptions: passed');
} finally {
  clearInterval(keepAlive);
  await fetch(cdp+'/json/close/'+page.id);
  ws.close();
}
