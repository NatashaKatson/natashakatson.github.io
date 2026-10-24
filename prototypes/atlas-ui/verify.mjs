import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const root = path.dirname(fileURLToPath(import.meta.url));
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
  fs.mkdirSync(path.join(root, 'previews'), { recursive: true });
  const result = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  fs.writeFileSync(path.join(root, 'previews', name + '.png'), Buffer.from(result.data, 'base64'));
};
try {
  await send('Page.enable'); await send('Runtime.enable'); await send('Network.enable');
  await send('Network.setBlockedURLs', { urls: ['http://*', 'https://*'] });
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: pathToFileURL(path.join(root, 'preview.html')).href + '#1928' });
  await waitFor(`!!window.AtlasUI && !!window.HistoryDinosaurs && !!window.AtlasEventEmojis`);
  await evaluate('stopSpin();');
  await check(`ev.length===282 && ppl.length===66`, 'All original events, dinosaurs, and people are retained');
  await check(`document.querySelector('.side-intro h2').textContent==='Around the world' && !!document.querySelector('#fact') && !!document.querySelector('.curated-discoveries') && !!document.querySelector('#people')`, 'Original right panel, stories, people, and discovery cards are retained');
  await check(`slider.max==='3000000' && slider.min==='0' && !!document.querySelector('#play') && !!document.querySelector('#eraChoices') && !!document.querySelector('.dock-options')`, 'Original slider, playback, eras, and More controls are retained');
  await check(`AtlasEventEmojis.get(ev.find(e=>e.wiki==='Penicillin'))==='💊' && AtlasEventEmojis.get(ev.find(e=>e.wiki==='Smallpox_vaccine'))==='💉' && AtlasEventEmojis.get(ev.find(e=>e.wiki==='Stethoscope'))==='🩺' && AtlasEventEmojis.get(ev.find(e=>e.wiki==='Spanish_flu'))==='🦠'`, 'Medical discoveries, vaccines, diagnostics, and pandemics have specific emojis');
  await check(`ev.filter(e=>e.cat==='dinosaurs').every(e=>AtlasEventEmojis.get(e)==='')`, 'Dinosaur portraits and markers retain their original rendering');
  await check(`[...document.querySelectorAll('#regions .item')].some(b=>b.textContent.includes('Penicillin discovered') && b.querySelector('.event-emoji')?.textContent==='💊')`, 'Event list adds emojis while keeping original event text');
  await evaluate(`select(ev.find(e=>e.wiki==='Penicillin').id,false);`);
  await check(`document.querySelector('#detail h3 .event-emoji').textContent==='💊' && !!document.querySelector('#detail .close')`, 'Original detail card shows the new event emoji');
  await screenshot('desktop');
  await evaluate(`document.querySelector('#detail .close').click();setMode('flat');globalThis.drawnEmoji=[];const originalFillText=ctx.fillText;ctx.fillText=function(text,...args){drawnEmoji.push(text);return originalFillText.call(this,text,...args)};render();ctx.fillText=originalFillText;`);
  await check(`drawnEmoji.includes('💊') && hits.some(h=>h.id===ev.find(e=>e.wiki==='Penicillin').id)`, 'Map draws the emoji and preserves the original selectable event');
  await waitFor(`Array.isArray(bCache.get(currentChunk()))`);
  await check(`polities().length>0`, 'Historical borders load from the embedded original datasets offline');
  await evaluate(`setYear(1992);stopSpin();globalThis.musqueam=ev.find(e=>e.wiki==='Musqueam_Indian_Band');`);
  await check(`musqueam.start===500 && musqueam.end===2026 && activeEvents().some(({e})=>e===musqueam)`, 'Musqueam retains its original AD 500–2026 context interval');
  await check(`document.getElementById('sideSub').textContent==='1 dated event within one year of 1992 · 6 historical context records'`, '1992 distinguishes one nearby dated event from six continuing histories');
  await check(`!document.querySelector('#regions > .region [data-id="'+musqueam.id+'"]') && !!document.querySelector('.timeline-context-list [data-id="'+musqueam.id+'"]') && !!document.querySelector('#regions > .region [data-id="'+ev.find(e=>e.wiki==='Dissolution_of_the_Soviet_Union').id+'"]')`, 'Continuing histories are grouped separately from the 1991 dated event');
  await check(`!activeEvents().some(({e})=>['Black_Death','COVID-19_pandemic','Inactivated_polio_vaccine'].includes(e.wiki))`, 'Unrelated past and future events do not appear in 1992');
  await evaluate(`select(musqueam.id,false);`);
  await check(`state.year===1992 && document.querySelector('.timeline-context-note').textContent.includes('Historical context for 1992') && document.querySelector('.timeline-context-note').textContent.includes('AD 500–2026')`, 'Selected context card explains its date range without changing the viewing year');
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await screenshot('context-1992');
  await evaluate(`document.querySelector('#detail .close').click();setYear(300);`);
  await check(`!activeEvents().some(({e})=>e===musqueam) && !document.querySelector('#regions [data-id="'+musqueam.id+'"]')`, 'A context record is absent before its recorded interval');
  await evaluate(`setYear(1928);`);
  await check(`document.querySelector('#regions > .region [data-id="'+ev.find(e=>e.wiki==='Penicillin').id+'"]') && document.querySelector('.timeline-context-list [data-id="'+musqueam.id+'"]')`, 'Medical discoveries remain dated events while older histories remain context');
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
  await check(`errors.length===0`.replace('errors.length', String(errors.length)), 'No browser runtime errors');
  console.log(`Validated ${checks} checks against the standalone atlas prototype.`);
} finally {
  await send('Page.close').catch(() => {}); ws.close();
}
