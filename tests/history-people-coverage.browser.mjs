import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
const testURL = process.env.ATLAS_TEST_URL || 'http://127.0.0.1:8769/historyallaround/atlas/';
const screenshotDir = process.env.ATLAS_SCREENSHOT_DIR || path.join(os.tmpdir(), 'history-people-coverage');
const cdp = process.env.ATLAS_CDP_URL || 'http://127.0.0.1:9231';
const tab = await (await fetch(cdp + '/json/new?about:blank', { method: 'PUT' })).json();
const ws = new WebSocket(tab.webSocketDebuggerUrl);
await new Promise((resolve, reject) => { ws.addEventListener('open', resolve, { once: true }); ws.addEventListener('error', reject, { once: true }); });
let id = 0;
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
const screenshot = async (name) => {
  fs.mkdirSync(screenshotDir, { recursive: true });
  const result = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  fs.writeFileSync(path.join(screenshotDir, name + '.png'), Buffer.from(result.data, 'base64'));
};
try {
  await send('Page.enable'); await send('Runtime.enable'); await send('Network.enable');
  await send('Network.setBlockedURLs', {urls: ['https://fonts.googleapis.com/*', 'https://fonts.gstatic.com/*']});
  await send('Emulation.setDeviceMetricsOverride', {width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false});
  await send('Page.navigate', {url: testURL + '#1900'});
  await waitFor('!!window.AtlasUI && !!window.HistoryDiscovery && !!window.AtlasExplore');
  console.log(await evaluate(`(async () => {
    const check = (value, message) => { if (!value) throw Error(message); };
    stopSpin(); flyToken++; setMode('flat');
    for (const person of ppl) {
      const year = person.born < 0 && person.died > 0 ? -1 : Math.floor((person.born + person.died) / 2);
      setYear(year); render();
      check(alivePeople().includes(person), person.name + ' alive at midpoint');
      check(document.querySelector('#people [data-id="' + person.id + '"]'), person.name + ' listed');
      check(hits.some(h => h.id === person.id), person.name + ' rendered on the flat map');
    }
    const rasputin = ppl.find(p => p.wiki === 'Grigori_Rasputin');
    for (const year of [1868,1869,1900,1916,1917]) {
      setYear(year); render();
      const expected = year >= 1869 && year <= 1916;
      check(hits.some(h => h.id === rasputin.id) === expected, 'Rasputin map boundary ' + year);
      check(!!document.querySelector('#people [data-id="' + rasputin.id + '"]') === expected, 'Rasputin list boundary ' + year);
    }
    setYear(1900); select(rasputin.id, false); render();
    const detail = document.getElementById('detail');
    check(detail.textContent.includes('Saint Petersburg') && detail.textContent.includes('associated place'), 'Rasputin location explained');
    check(detail.querySelector('a[href*="1914-1918-online.net"]'), 'Rasputin scholarly source');
    setYear(2026); select(rasputin.id, false); render();
    check(state.year === 1869 && hits.some(h => h.id === rasputin.id), 'Selecting outside lifespan opens a valid year');
    state.cats.clear(); setYear(1900); render();
    check(hits.some(h => h.id === rasputin.id), 'Event category filters do not suppress people');
    state.cats = new Set(Object.keys(CATS));
    setYear(1920); setMode('flat'); zoomK = 2; makeProj(); render();
    const lenin = ppl.find(p => p.wiki === 'Vladimir_Lenin'), stalin = ppl.find(p => p.wiki === 'Joseph_Stalin');
    const a = hits.find(h => h.id === lenin.id), b = hits.find(h => h.id === stalin.id);
    check(a && b && Math.hypot(a.x-b.x,a.y-b.y) >= 26, 'Shared Moscow markers are separated');
    check(nearest(a.x,a.y).id === lenin.id && nearest(b.x,b.y).id === stalin.id, 'Each shared-city marker is selectable');
    setYear(2026); render();
    const open = ppl.filter(p => p.living);
    check(open.length === 3 && alivePeople().length === 3, 'Three open lifespans reach the coverage cutoff');
    for (const person of open) {
      select(person.id, false); render();
      check(detail.querySelector('.kicker').textContent.includes('Born '), 'Open lifespan has a birth label');
      check(!detail.querySelector('.kicker').textContent.includes('2026'), 'Cutoff is never displayed as death');
      check(detail.textContent.includes('No death is recorded'), 'Open lifespan qualification shown');
    }
    setYear(-50); render();
    check(alivePeople().some(p => p.wiki === 'Sima_Qian') === false, 'Approximate ancient lifespan still bounded');
    setYear(-400); render();
    const plato = ppl.find(p => p.wiki === 'Plato'); select(plato.id, false); render();
    check(detail.textContent.includes('428/427') && detail.querySelector('.kicker').textContent.includes('c.'), 'Ancient uncertainty is visible');
    return 'PASS all ' + ppl.length + ' people in list/map, Rasputin boundaries, selection, filters, shared markers, living dates and BCE uncertainty';
  })()`));
  for (const query of ['Grigory Rasputin', 'Григорий Распутин', 'Tatanka Iyotanka', 'Rigoberta Menchu']) {
    await evaluate(`(() => { document.querySelector('.history-search-trigger').click(); const input=document.getElementById('historySearchInput'); input.value=${JSON.stringify(query)}; input.dispatchEvent(new Event('input',{bubbles:true})); })()`);
    await waitFor('!!document.querySelector("#historySearchResults [data-search-result]")');
    await pause(220);
    await evaluate('document.querySelector("#historySearchResults [data-search-result]").click()');
    await waitFor('!document.getElementById("historySearch").open');
    console.log(await evaluate(`(() => {
      const person=byId[state.sel];
      if (person?.kind !== 'person' || !alivePeople().includes(person)) throw Error('Search did not open an alive person');
      return 'PASS search navigation: ' + person.name;
    })()`));
  }
  await send('Emulation.setDeviceMetricsOverride', {width: 390, height: 844, deviceScaleFactor: 1, mobile: true});
  await evaluate('setYear(1900); AtlasUI.goToEvents(); document.querySelector("[data-context=people]").click(); stopSpin(); flyToken++;');
  await pause(100);
  console.log(await evaluate(`(() => {
    const people=document.getElementById('people');
    if (!people.getClientRects().length || !people.textContent.includes('Grigori Rasputin')) throw Error('Rasputin missing on mobile');
    const r=ppl.find(p=>p.wiki==='Grigori_Rasputin'); const button=people.querySelector('[data-id="'+r.id+'"]'); for(let parent=button.parentElement;parent&&parent!==people;parent=parent.parentElement) if(parent.tagName==='DETAILS') parent.open=true; if(!button.getClientRects().length) throw Error('Rasputin cannot be revealed'); button.click();
    if (!document.getElementById('detail').textContent.includes('Grigori Rasputin')) throw Error('Mobile biography missing');
    if (document.documentElement.scrollWidth > innerWidth + 1) throw Error('Mobile horizontal overflow');
    return 'PASS mobile People tab and biography';
  })()`));
  await screenshot('rasputin-mobile');
  if (errors.length) throw Error(errors.join('\n'));
  console.log('No browser runtime errors.');
} finally { await send('Page.close').catch(() => {}); ws.close(); }
