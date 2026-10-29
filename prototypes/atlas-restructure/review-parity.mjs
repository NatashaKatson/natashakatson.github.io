import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const root = path.dirname(fileURLToPath(import.meta.url));
const testURL = process.env.ATLAS_TEST_URL || 'http://127.0.0.1:8769/historyallaround/atlas/';
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
  await send('Page.enable');await send('Runtime.enable');await send('Network.enable');
  await send('Network.setBlockedURLs',{urls:['https://fonts.googleapis.com/*','https://fonts.gstatic.com/*','https://cdnjs.buymeacoffee.com/*']});
  await send('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
  await send('Page.navigate',{url:testURL+'#1992'});
  await waitFor('!!window.AtlasUI');
  await evaluate(`stopSpin();setMode('flat');state.cats=new Set(Object.keys(CATS));update();buildMarks();globalThis.parityRecords=[...ev,...ppl];`);
  await check(`yearAt(1)===2026 && document.querySelector('#ticks .timeline-end').textContent==='2026'`, 'Timeline and visible endpoint reach 2026 from a 1992 view');
  await check(`document.getElementById('marks').children.length===ev.length`, 'Timeline retains marks for every enabled event');
  const count=await evaluate('parityRecords.length');
  // Bulk enumeration invokes hundreds of date changes in seconds. Suppress
  // address-bar writes here to avoid Chromium's IPC flood limit; real shared
  // links and navigation are exercised after restoring the native method.
  await evaluate(`globalThis.parityReplaceState=history.replaceState;history.replaceState=()=>{}`);
  const failures=[];
  for(let offset=0;offset<count;offset+=12){
    const batch=await evaluate(`(async()=>{
      const failures=[];
      for(const r of parityRecords.slice(${offset},${offset+12})){
        const year=r.start??r.born;
        const opened=await HistoryDiscovery.jumpSearch({kind:r.cat==='dinosaurs'?'dinosaur':r.kind,recordId:r.id,start:year,lon:r.lon,lat:r.lat});
        AtlasUI.render();
        const detail=document.querySelector('#detail .detail');
        const title=r.title||r.name;
        if(!opened||state.sel!==r.id||!detail||!detail.querySelector('h3').textContent.includes(title))failures.push(r.id+': detail route');
        if(document.getElementById('detail').hidden||document.getElementById('atlasMain').dataset.workspace!=='explore')failures.push(r.id+': hidden detail');
        if(r.kind==='event'&&!detail.textContent.includes(r.blurb))failures.push(r.id+': lost description');
        const links=[...document.querySelectorAll('#detail a')].map(a=>a.href);
        const expected=r.cat==='dinosaurs'?[r.source,r.locationSource]:r.source?[r.source]:[wikiUrl(r.wiki)];
        for(const link of expected.filter(Boolean))if(!links.includes(link))failures.push(r.id+': missing source '+link);
        if(r.kind==='event'&&!document.querySelector('#regions [data-id="'+r.id+'"]'))failures.push(r.id+': absent dated event row');
        if(r.kind==='person'&&!document.querySelector('#people [data-id="'+r.id+'"]'))failures.push(r.id+': absent person row');
      }
      return failures;
    })()`);
    failures.push(...batch);
    if(offset%96===0)console.log(`Reviewed ${Math.min(offset+12,count)}/${count} record routes`);
  }
  if(failures.length)throw Error(failures.join('\n'));
  console.log(`PASS All ${count} event/person routes preserve titles, descriptions, dated rows and sources`);
  // Exercise the actual search dialog's adapter for every record title.
  await evaluate(`document.querySelector('.history-search-trigger').click()`);
  await waitFor(`document.getElementById('historySearch').open`);
  for(let offset=0;offset<count;offset+=24){
    const batch=await evaluate(`(()=>{
      const failures=[],dialog=document.getElementById('historySearch'),input=document.getElementById('historySearchInput');
      for(const r of parityRecords.slice(${offset},${offset+24})){
        const kind=r.cat==='dinosaurs'?'dinosaur':r.kind;
        input.value=r.title||r.name;
        dialog.querySelector('[data-search-kind="'+kind+'"]').click();
        if(![...dialog.querySelectorAll('[data-search-result] strong')].some(el=>el.textContent===(r.title||r.name)))failures.push(r.id+': absent search result');
      }
      return failures;
    })()`);
    failures.push(...batch);
  }
  if(failures.length)throw Error(`${failures.length} failures:\n`+failures.slice(0,20).join('\n'));
  console.log(`PASS All ${count} record titles remain discoverable through the real search dialog`);
  await evaluate(`history.replaceState=parityReplaceState`);
  await evaluate(`document.querySelector('[data-search-close]').click();setYear(1928);select(ev.find(r=>r.wiki==='Penicillin').id,false);AtlasUI.render()`);
  await check(`getComputedStyle(document.getElementById('prev')).display!=='none'&&document.getElementById('prev').getBoundingClientRect().width>0`, 'One-year mouse controls remain visible');
  await evaluate(`document.getElementById('next').click()`);
  await check(`state.year===1929`, 'One-year next control changes exactly one year');
  await evaluate(`document.getElementById('prev').click();document.querySelector('.event-list-disclosure').open=true;document.querySelector('#regions [data-id="'+ev.find(r=>r.wiki==='Penicillin').id+'"]').click();AtlasUI.render();document.querySelector('#detail .close').click();AtlasUI.render()`);
  await check(`document.activeElement.dataset.id===ev.find(r=>r.wiki==='Penicillin').id`, 'Closing an event restores focus to its original list row');
  await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
  await evaluate(`AtlasUI.goToMap();setYear(1992);stopSpin()`);await pause(100);
  await check(`document.getElementById('resetView').getBoundingClientRect().height>0`, 'Mobile map reset remains available');
  await evaluate(`document.getElementById('resetView').click()`);
  await check(`zoomK===1&&rot[0]===-25`, 'Mobile map reset restores the original camera');
  await evaluate(`location.hash='discover=cleopatra-world'`);
  await waitFor(`document.querySelector('.curated-reader').dataset.selection?.startsWith('cleopatra-world') && document.getElementById('atlasMain').dataset.workspace==='journeys'`);
  await check(`!document.querySelector('.curated-reader').hidden&&!document.getElementById('sideBody').inert`, 'Shared curated story opens into a visible mobile reading panel');
  await evaluate(`document.querySelector('.curated-reader [data-curated-next]').click()`);
  await check(`document.getElementById('atlasMain').dataset.workspace==='journeys'`, 'Next story stop keeps the active journey visible');
  await evaluate(`document.querySelector('.curated-reader [data-curated-close]').click();document.querySelector('.daily-challenge-card button').click()`);
  await waitFor(`document.getElementById('dailyChallenge').open`);
  await evaluate(`document.querySelector('[data-daily-step="1"]').click()`);
  await waitFor(`!!document.querySelector('[data-pick-map]')`);
  await evaluate(`document.querySelector('[data-pick-map]').click();AtlasUI.render()`);
  await check(`HistoryChallenge.isPicking()&&!document.getElementById('side').classList.contains('sheet-open')&&document.getElementById('atlasMain').dataset.workspace==='explore'`, 'Daily challenge exposes the map instead of leaving it under the mobile sheet');
  await evaluate(`HistoryChallenge.cancelPick()`);
  if(errors.length)throw Error(errors.join('\n'));
  console.log(`No runtime errors. Exhaustive record and feature parity review passed.`);
} catch(error){console.error('Browser runtime errors:',errors);console.error(await evaluate(`({hash:location.hash,workspace:document.getElementById('atlasMain').dataset.workspace,reader:document.querySelector('.curated-reader').dataset.selection,readerHidden:document.querySelector('.curated-reader').hidden,year:state.year})`).catch(()=>null));throw error;}
finally{await send('Page.close').catch(()=>{});ws.close();}
