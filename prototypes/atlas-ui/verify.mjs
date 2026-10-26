import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const root = path.dirname(fileURLToPath(import.meta.url));
const testURL = process.env.ATLAS_TEST_URL || pathToFileURL(path.join(root, 'preview.html')).href;
const screenshotDir = process.env.ATLAS_SCREENSHOT_DIR || path.join(root, 'previews');
const cdp = process.env.ATLAS_CDP_URL || 'http://127.0.0.1:9231';
const tab = await (await fetch(cdp + '/json/new?about:blank', { method: 'PUT' })).json();
const ws = new WebSocket(tab.webSocketDebuggerUrl);
await new Promise((resolve, reject) => { ws.addEventListener('open', resolve, { once: true }); ws.addEventListener('error', reject, { once: true }); });
let id = 0, checks = 0;
const pending = new Map(), errors = [];
ws.onmessage = ({ data }) => {
  const message = JSON.parse(data);
  if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.exception?.description || message.params.exceptionDetails.text);
  const call = pending.get(message.id);
  if (!call) return;
  pending.delete(message.id); clearTimeout(call.timeout);
  message.error ? call.reject(Error(JSON.stringify(message.error))) : call.resolve(message.result);
};
const send = (method, params = {}) => new Promise((resolve, reject) => {
  const call = ++id;
  const timeout = setTimeout(() => { pending.delete(call); reject(Error('CDP timed out: ' + method)); }, 15000);
  pending.set(call, { resolve, reject, timeout }); ws.send(JSON.stringify({ id: call, method, params }));
});
const evaluate = async (expression) => {
  const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (result.exceptionDetails) throw Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
  return result.result.value;
};
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const waitFor = async (expression) => { for (let i = 0; i < 120; i++) { if (await evaluate(expression)) return; await pause(70); } throw Error('Timed out: ' + expression); };
const check = async (expression, label) => { if (!await evaluate(expression)) throw Error(label); console.log('PASS ' + label); checks++; };
const screenshot = async (name) => {
  fs.mkdirSync(screenshotDir, { recursive: true });
  const result = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  fs.writeFileSync(path.join(screenshotDir, name + '.png'), Buffer.from(result.data, 'base64'));
};
try {
  await send('Page.enable'); await send('Runtime.enable'); await send('Network.enable');
  // The standalone preview embeds dependencies; the served atlas loads D3 and
  // TopoJSON from HTTPS CDNs. Only optional services are blocked in URL mode.
  await send('Network.setBlockedURLs', { urls: process.env.ATLAS_TEST_URL
    ? ['https://fonts.googleapis.com/*', 'https://fonts.gstatic.com/*', 'https://cdnjs.buymeacoffee.com/*']
    : ['http://*', 'https://*'] });
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: testURL + '#1928' });
  await waitFor(`!!window.AtlasUI && !!window.HistoryDinosaurs && !!window.AtlasEventEmojis`);
  await evaluate('stopSpin();');
  await check(`ev.length===282 && ppl.length===66`, 'All original events, dinosaurs, and people are retained');
  await check(`document.querySelector('.side-intro h2').textContent==='Around the world' && !!document.querySelector('#fact') && !!document.querySelector('.curated-discoveries') && !!document.querySelector('#people')`, 'Original right panel, stories, people, and discovery cards are retained');
  await check(`slider.max==='3000000' && slider.min==='0' && !!document.querySelector('#play') && !!document.querySelector('#eraChoices') && !!document.querySelector('.dock-options')`, 'Original slider, playback, eras, and More controls are retained');
  await check(`AtlasEventEmojis.get(ev.find(e=>e.wiki==='Penicillin'))==='💊' && AtlasEventEmojis.get(ev.find(e=>e.wiki==='Smallpox_vaccine'))==='💉' && AtlasEventEmojis.get(ev.find(e=>e.wiki==='Stethoscope'))==='🩺' && AtlasEventEmojis.get(ev.find(e=>e.wiki==='Spanish_flu'))==='🦠'`, 'Medical discoveries, vaccines, diagnostics, and pandemics have specific emojis');
  await check(`ev.filter(e=>e.cat==='dinosaurs').every(e=>AtlasEventEmojis.get(e)==='')`, 'Dinosaur portraits and markers retain their original rendering');
  await check(`[...document.querySelectorAll('#regions .item')].some(b=>b.textContent.includes('Penicillin discovered') && b.querySelector('.event-emoji')?.textContent==='💊')`, 'Event list adds emojis while keeping original event text');
  await check(`(()=>{const icon=document.querySelector('#regions .event-emoji'),r=icon.getBoundingClientRect(),style=getComputedStyle(icon);return r.width>=18&&r.height>=18&&style.fontFamily.includes('Apple Color Emoji')&&style.visibility==='visible'&&style.display!=='none'})()`, 'Event emojis have visible dimensions and an explicit emoji font');
  await evaluate(`select(ev.find(e=>e.wiki==='Penicillin').id,false);`);
  await check(`document.querySelector('#detail h3 .event-emoji').textContent==='💊' && !!document.querySelector('#detail .close')`, 'Original detail card shows the new event emoji');
  await check(`(()=>{const icon=document.querySelector('#detail [data-meanwhile] .event-emoji');return icon&&getComputedStyle(icon).display==='inline-block'})()`, 'Related-event cards show their event emojis inline with titles');
  await screenshot('desktop');
  await evaluate(`document.querySelector('#detail .close').click();setMode('flat');globalThis.drawnEmoji=[];const originalFillText=ctx.fillText;ctx.fillText=function(text,...args){drawnEmoji.push(text);return originalFillText.call(this,text,...args)};render();ctx.fillText=originalFillText;`);
  await check(`drawnEmoji.includes('💊') && hits.some(h=>h.id===ev.find(e=>e.wiki==='Penicillin').id)`, 'Map draws the emoji and preserves the original selectable event');
  await waitFor(`Array.isArray(bCache.get(currentChunk()))`);
  await check(`polities().length>0`, 'Historical borders load from the embedded original datasets offline');
  await evaluate(`setYear(1992);stopSpin();globalThis.musqueam=ev.find(e=>e.wiki==='Musqueam_Indian_Band');`);
  await check(`musqueam.start===500 && musqueam.end===500 && !activeEvents().some(({e})=>e===musqueam)`, 'Musqueam movement has one approximate date and is absent in 1992');
  await check(`document.getElementById('sideSub').textContent==='2 dated events within 2 years of 1992'`, '1992 shows the nearby dated event without unrelated continuing histories');
  await check(`!document.querySelector('#regions [data-id="'+musqueam.id+'"]') && !document.querySelector('.timeline-context-list') && !!document.querySelector('#regions > .region [data-id="'+ev.find(e=>e.wiki==='Dissolution_of_the_Soviet_Union').id+'"]')`, 'Only contemporary records appear in the 1992 ledger');
  await check(`!activeEvents().some(({e})=>['Black_Death','COVID-19_pandemic','Inactivated_polio_vaccine'].includes(e.wiki))`, 'Unrelated past and future events do not appear in 1992');
  await screenshot('context-1992');
  await evaluate(`select(musqueam.id,false);`);
  await check(`state.year===500 && !document.querySelector('.timeline-context-note') && document.querySelector('#detail .kicker').textContent.includes('AD 500')`, 'Selecting Musqueam visits the approximate movement date');
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await evaluate(`document.querySelector('#detail .close').click();setYear(1956);globalThis.cherokee=ev.find(e=>e.wiki==='Cherokee_Nation');`);
  await check(`!activeEvents().some(({e})=>e===cherokee||e===musqueam) && activeEvents().some(({e})=>e.wiki==='Saami_Council')`, '1956 includes the Saami Council founding without unrelated Cherokee or Musqueam histories');
  await screenshot('dated-1956');
  await evaluate(`setYear(300);`);
  await check(`!activeEvents().some(({e})=>e===musqueam) && !document.querySelector('#regions [data-id="'+musqueam.id+'"]')`, 'The Musqueam milestone is absent before its approximate date');
  await evaluate(`setYear(1928);`);
  await check(`document.querySelector('#regions > .region [data-id="'+ev.find(e=>e.wiki==='Penicillin').id+'"]') && !document.querySelector('#regions [data-id="'+musqueam.id+'"]')`, 'Medical discoveries remain dated events without unrelated community histories');
  for (const [width, height] of [[1440,1000],[390,844]]) {
    await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: width < 600 });
    await evaluate(`slider.scrollIntoView({block:'center',behavior:'instant'});globalThis.originalSlider=slider;`);
    await pause(100);
    const rect = await evaluate(`(()=>{const r=slider.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height}})()`);
    const y = rect.y + rect.height / 2, xAt = (p) => rect.x + 7 + (rect.width - 14) * p;
    await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: xAt(.88), y, button: 'left', clickCount: 1 });
    for (const p of [.89,.94,.99,.92,.86]) {
      await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: xAt(p), y, button: 'left', buttons: 1 }); await pause(50);
    }
    await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: xAt(.86), y, button: 'left', clickCount: 1 });
    await check(`state.year!==1928 && state.year!==0 && slider===originalSlider && !!geo().land`, `Original timeline drags in both directions at ${width}px`);
    await check(`document.documentElement.scrollWidth<=innerWidth`, `Original ${width}px layout has no horizontal overflow`);
  }
  await evaluate(`setYear(-1);document.getElementById('next').click();`);
  await check(`state.year===1`, 'Original one-year stepping skips year zero');
  await evaluate(`slider.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowLeft',bubbles:true,cancelable:true}));`);
  await check(`state.year===-1`, 'Original keyboard stepping crosses the BC/AD boundary');
  await evaluate(`setYear(1900);document.getElementById('play').click();`); await pause(160);
  await check(`state.playing && state.year>1900`, 'Original playback advances the timeline');
  await evaluate(`document.getElementById('play').click();`);
  await check(`!state.playing`, 'Original Pause stops playback');
  await evaluate(`setYear(-150000000);`);
  await waitFor(`HistoryPaleogeography.status(-150000000).state==='ready'`);
  await check(`geo().ancient && d3.geoArea(geo().land)>1`, 'Original dinosaur timeline and reconstructed continents work offline');
  await evaluate(`setYear(1955);stopSpin();window.scrollTo(0,0);`); await pause(200);
  await screenshot('mobile');
  await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 3 });
  const touch = async (type, touchPoints) => {
    await send('Input.dispatchTouchEvent', { type, touchPoints });
    await pause(40); // Allow compositor-delivered touch events to reach the page.
  };
  for (const mode of ['globe', 'flat']) {
    await evaluate(`setMode('${mode}');stopSpin();window.scrollTo(0,0);`); await pause(100);
    const point = await evaluate(`(()=>{const r=cv.getBoundingClientRect();return{x:r.left+r.width/2,y:r.top+r.height/2}})()`);
    const a = { id: 1, x: point.x - 45, y: point.y }, b = { id: 2, x: point.x + 45, y: point.y };
    await touch('touchStart', [a]);
    await touch('touchMove', [{ ...a, x: a.x + 20 }]);
    await touch('touchCancel', []);
    await check(`drag===null && pinch===null && pts.size===0 && !cv.classList.contains('dragging')`, `Canceled ${mode} drag clears the gesture`);
    await touch('touchStart', [a, b]);
    await touch('touchMove', [{ ...a, x: a.x - 25 }, { ...b, x: b.x + 25 }]);
    await check(`Number.isFinite(zoomK) && zoomK>1 && visualViewport.scale===1`, `${mode} pinch zooms the map without zooming the page`);
    await touch('touchEnd', [{ ...b, x: b.x + 25 }]);
    await evaluate(`globalThis.beforePan={rot:rot.slice(),flatT:{...flatT},selection:state.sel,polity:selectedPolity};`);
    await touch('touchMove', [{ ...a, x: a.x - 20 }]);
    await check(mode === 'globe'
      ? `rot[0]>beforePan.rot[0] && rot[0]-beforePan.rot[0]<3`
      : `Math.abs(flatT.x-beforePan.flatT.x-5)<1`, `${mode} pinch continues as a smooth one-finger drag`);
    await touch('touchEnd', []);
    await check(`pts.size===0 && drag===null && state.sel===beforePan.selection && selectedPolity===beforePan.polity`, `${mode} pinch release does not select a map feature`);
    await touch('touchStart', [a]);
    await touch('touchMove', [{ ...a, x: a.x + 1 }]);
    await evaluate(`cv.releasePointerCapture([...pts.keys()][0]);`);
    await touch('touchMove', [{ ...a, x: a.x + 2 }]);
    await check(`pts.size===0 && drag===null && pinch===null`, `Lost ${mode} pointer capture clears the gesture`);
    await touch('touchEnd', []);
    await touch('touchStart', [a, { ...a, id: 2 }]);
    await touch('touchMove', [a, { ...a, id: 2 }]);
    await check(`Number.isFinite(zoomK) && rot.every(Number.isFinite)`, `Coincident ${mode} touches keep valid map coordinates`);
    await touch('touchMove', [a, b]);
    await touch('touchMove', [{ ...a, x: a.x - 10 }, { ...b, x: b.x + 10 }]);
    await check(`Number.isFinite(zoomK) && zoomK>=.7 && zoomK<=6`, `${mode} zoom recovers when coincident touches separate`);
    await touch('touchCancel', []);
  }
  await evaluate(`globalThis.validZoom=zoomK;setZoom(NaN);setZoom(Infinity);setZoom(0);`);
  await check(`zoomK===validZoom`, 'Invalid zoom values cannot blank the canvas');
  await evaluate(`setMode('globe');stopSpin();globalThis.zoomRedraws=0;globalThis.savedRender=render;render=function(){zoomRedraws++;return savedRender()};`);
  await send('Emulation.setPageScaleFactor', { pageScaleFactor: 2 });
  await waitFor(`visualViewport.scale===2 && zoomRedraws>0`);
  await check(`(()=>{const p=ctx.getImageData(Math.floor(cv.width/2),Math.floor(cv.height/2),1,1).data;return p[3]>0 && Number.isFinite(zoomK)})()`, 'Browser page zoom redraws a visible globe');
  await screenshot('mobile-page-zoom');
  await send('Emulation.setPageScaleFactor', { pageScaleFactor: 1 });
  await evaluate(`render=savedRender;`);
  await check(`errors.length===0`.replace('errors.length', String(errors.length)), 'No browser runtime errors');
  console.log(`Validated ${checks} checks against ${testURL}.`);
} finally {
  await send('Page.close').catch(() => {}); ws.close();
}
