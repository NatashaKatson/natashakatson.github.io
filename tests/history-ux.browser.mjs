import { workspaceSetup } from './atlas-workspace-helpers.mjs';
// UX regressions: real breakpoints, story destinations, focus, keyboard map access and recovery.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
const cdp = process.env.ATLAS_CDP_URL || 'http://127.0.0.1:9231';
const atlasURL = process.env.ATLAS_TEST_URL || 'http://127.0.0.1:8891/atlas/';
const landingURL = new URL('../', atlasURL).href;
const tab = await (await fetch(cdp + '/json/new?about:blank', { method: 'PUT' })).json();
const ws = new WebSocket(tab.webSocketDebuggerUrl);
await new Promise((resolve, reject) => { ws.addEventListener('open', resolve, { once: true }); ws.addEventListener('error', reject, { once: true }); });
let id = 0, checks = 0, inducedFailure = false;
const pending = new Map(), errors = [];
ws.onmessage = ({ data }) => {
  const message = JSON.parse(data);
  if (message.method === 'Runtime.exceptionThrown' && !inducedFailure) errors.push(message.params.exceptionDetails);
  const call = pending.get(message.id);
  if (!call) return;
  pending.delete(message.id); clearTimeout(call.timer);
  message.error ? call.reject(Error(JSON.stringify(message.error))) : call.resolve(message.result);
};
const send = (method, params = {}) => new Promise((resolve, reject) => {
  const call = ++id, timer = setTimeout(() => { pending.delete(call); reject(Error('CDP timeout: ' + method)); }, 20000);
  pending.set(call, { resolve, reject, timer }); ws.send(JSON.stringify({ id: call, method, params }));
});
const evaluate = async expression => {
  const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (result.exceptionDetails) throw Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
  return result.result.value;
};
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const waitFor = async expression => {
  for (let i = 0; i < 150; i++) { if (await evaluate(expression)) return; await pause(60); }
  throw Error('Not ready: ' + expression);
};
const check = async (expression, label) => { await waitFor(expression); assert(await evaluate(expression), label); checks++; };
const viewport = async (width, height) => {
  await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: width <= 860 });
  await pause(100);
};
const navigate = async (url, hash = '') => {
  const target = new URL(url); target.searchParams.set('ux', ++id); target.hash = hash;
  await send('Page.navigate', { url: target.href });
  await waitFor('document.readyState==="complete"');
  if (url === atlasURL) { await waitFor('!!window.AtlasUI'); await evaluate('stopSpin()'); }
  await pause(100);
};
const click = async selector => {
  await evaluate(`document.querySelector(${JSON.stringify(selector)}).scrollIntoView({block:'nearest',behavior:'instant'})`);
  await pause(70);
  const point = await evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)}),r=e.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}})()`);
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', ...point, button: 'left', clickCount: 1 });
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', ...point, button: 'left', clickCount: 1 });
  await pause(100);
};
const key = async (key, code, value, text) => {
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key, code, windowsVirtualKeyCode: value, ...(text ? { text, unmodifiedText: text } : {}) });
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key, code, windowsVirtualKeyCode: value });
  await pause(50);
};
const screenshot = async name => {
  const shot = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(os.tmpdir(), 'history-ux-' + name + '.png'), Buffer.from(shot.data, 'base64'));
};
try {
  await send('Page.enable');
  await send('Page.addScriptToEvaluateOnNewDocument', { source: workspaceSetup });
  await send('Runtime.enable'); await send('Network.enable');
  await send('Network.setBlockedURLs', { urls: ['https://*'] });
  for (const width of [320, 390, 641, 768, 860, 980, 1440]) {
    await viewport(width, 900); await navigate(landingURL);
    await check(`(()=>{const r=document.querySelector('.preview').getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&document.documentElement.scrollWidth<=innerWidth})()`, `Landing preview fits ${width}px`);
    await check(`!document.querySelector('iframe')&&document.querySelector('.preview img').naturalWidth===960`, `Landing uses a decoded static image at ${width}px`);
    if (width === 390 || width === 768) await screenshot('landing-' + width);
  }
  for (const [width, height] of [[1440,900],[1024,768],[390,844],[320,740]]) {
    await viewport(width, height); await navigate(atlasURL, '1928');
    await check(`!!document.querySelector('main')&&cv.tabIndex===0&&document.documentElement.scrollWidth<=innerWidth`, `Semantic map and no overflow at ${width}px`);
    if (width > 860) await check(`document.querySelector('.time').getBoundingClientRect().bottom<=innerHeight+1`, `Desktop dock fits ${width}×${height}`);
    else {
      await click('#eventSheetToggle');
      await check(`!document.getElementById('sideBody').inert&&document.querySelector('.mobile-atlas-nav').getBoundingClientRect().bottom<=innerHeight`, `Events sheet keeps bottom navigation visible at ${width}px`);
      await click('.mobile-atlas-nav [data-workspace="explore"]');
      await check(`!document.getElementById('side').classList.contains('sheet-open')&&cv.getBoundingClientRect().top>=50`, `Explore restores the visible map at ${width}px`);
      await evaluate(`AtlasTestUI.filters()`);
      await check(`document.getElementById('mapSettings').open&&document.getElementById('filtersPanel').parentElement.open`, `Map settings opens filters at ${width}px`);
      await key('Escape', 'Escape', 27);
      await check(`!document.getElementById('mapSettings').open&&document.activeElement.id==='mapToolsToggle'`, `Escape restores settings focus at ${width}px`);
    }
    if (width === 390) await screenshot('atlas-390');
  }
  await viewport(1440,900); await navigate(atlasURL, 'event=Pig_War_(1859)');
  await check(`byId[state.sel]?.wiki==='Pig_War_(1859)'&&state.year===1859&&Math.abs(rot[0]-123.09)<.1`, 'Pig War short link selects its event and place');
  await navigate(atlasURL, 'people=1610&person=William_Shakespeare');
  await waitFor(`document.activeElement.classList.contains('selected-pair')`);
  await check(`(()=>{const card=document.querySelector('.selected-pair'),r=card.getBoundingClientRect(),s=document.getElementById('side').getBoundingClientRect();return card.textContent.includes('William Shakespeare')&&card.textContent.includes('Tokugawa Ieyasu')&&r.top>=s.top&&r.top<innerHeight})()`, 'Contemporaries short link foregrounds both people');
  await navigate(atlasURL, '1928');
  await check(`document.getElementById('winLbl').textContent==='±'+SAME_TIME_YEARS+' years'`, 'Dock describes the implemented window');
  await evaluate(`cv.focus();globalThis.beforeRotation=rot.slice()`); await key('ArrowRight','ArrowRight',39);
  await check(`rot[0]!==beforeRotation[0]&&document.activeElement===cv`, 'Arrow keys rotate the globe');
  await evaluate(`AtlasTestUI.settings()`);await click('#vFlat'); await evaluate(`AtlasUI.goToMap();cv.focus();globalThis.beforePan=flatT.x`); await key('ArrowLeft','ArrowLeft',37);
  await check(`flatT.x!==beforePan`, 'Arrow keys pan the flat map');
  await key('Home','Home',36); await check(`zoomK===1&&flatT.x===0&&rot[0]===-25`, 'Home resets the map');
  await key('Tab','Tab',9); await check(`document.activeElement!==cv`, 'Keyboard can leave the map');
  await evaluate(`document.getElementById('gotoInput').value='3000';document.getElementById('goto').requestSubmit()`);
  await check(`state.year===1928&&!!document.getElementById('gotoInput').validationMessage`, 'Future date is rejected without changing context');
  await evaluate(`document.getElementById('gotoInput').value='1492';document.getElementById('gotoInput').dispatchEvent(new Event('input'));document.getElementById('goto').requestSubmit()`);
  await check(`state.year===1492&&document.getElementById('gotoInput').value==='1492'`, 'Valid date and input agree');
  await evaluate(`setYear(1928);AtlasTestUI.filters();document.querySelector('#legend [data-k="ideas"]').click();render()`);
  await check(`document.getElementById('filterCount').textContent==='2 hidden'&&!document.getElementById('resetFilters').disabled`, 'Filter badge explains hidden types, including women’s rights');
  await click('#resetFilters'); await check(`[...document.querySelectorAll('#legend .chip')].every(b=>state.cats.has(b.dataset.k)===(b.dataset.k!=='womens-rights'))&&document.getElementById('filterCount').textContent==='Default'`, 'Reset restores default visibility with women’s rights off');
  await key('Escape','Escape',27);
  await evaluate(`AtlasTestUI.comparison()`);await click('#compareToggle');
  await check(`HistoryDiscovery.isComparing()&&!document.getElementById('compareYears').hidden&&document.querySelector('#compareYears input').getBoundingClientRect().width>0`, 'Visible Compare action opens year editing');
  await navigate(atlasURL, '1928'); await evaluate(`setYear(-500000)`);
  await check(`document.querySelector('[data-near-event]')&&!document.querySelector('.contemporaries-card').getBoundingClientRect().height&&document.getElementById('people').hidden`, 'Empty date offers concrete recovery without empty people sections');
  await click('[data-near-event]'); await check(`!!state.sel&&state.year!==-500000`, 'Empty-state recovery opens a recorded event');
  await viewport(390,844); await navigate(atlasURL, '1928');
  await evaluate(`select(ev.find(e=>e.wiki==='Penicillin').id,false)`); await pause(500);
  await click('#detail .close');
  await check(`document.activeElement===cv&&cv.getBoundingClientRect().top>=50&&cv.getBoundingClientRect().top<innerHeight`, 'Mobile detail close restores visible map focus');
  await screenshot('return-to-map');
  await evaluate(`AtlasTestUI.journeys()`); await click('[data-atlas-menu="womensRightsPanel"]');
  await check(`[...document.querySelectorAll('#rightsResults > section:first-child [data-rights-record]')].every(b=>DiscoveryCore.yearGap(byId[b.dataset.rightsRecord].start,byId[b.dataset.rightsRecord].end,state.year)<=SAME_TIME_YEARS)&&document.querySelector('#rightsResults h3').textContent.includes('Near 1928')`, 'Thematic browser foregrounds the displayed period');
  await check(`document.getElementById('rightsResults').clientHeight>100`, 'Milestone results remain readable on mobile');
  assert.deepEqual(errors, [], 'No normal-operation runtime errors');
  inducedFailure = true;
  await send('Network.setBlockedURLs', { urls: ['https://*', '*/vendor/d3.min.js'] });
  await send('Network.setCacheDisabled', { cacheDisabled: true });
  const failedURL = new URL(atlasURL); failedURL.searchParams.set('uxFailure', Date.now());
  await send('Page.navigate', { url: failedURL.href });
  await waitFor(`document.body?.dataset.atlasLoad==='failed'`);
  await check(`!document.getElementById('atlasLoadError').hidden&&document.getElementById('atlasLoadError').textContent.includes('Try again')`, 'Missing required asset shows an explicit retry state');
  await screenshot('load-failure');
  await waitFor(`document.readyState==='complete'`);
  await send('Network.setBlockedURLs', { urls: ['https://*'] });
  inducedFailure = false;
  await click('#atlasLoadError button');
  await waitFor(`!!window.AtlasUI&&document.body?.dataset.atlasLoad!=='failed'&&!!document.getElementById('yr')?.textContent`);
  await check(`document.getElementById('atlasLoadError').hidden&&!document.querySelector('.time').inert`, 'Retry restores the atlas and its controls');
  assert.deepEqual(errors, [], 'No normal-operation or recovery runtime errors');
  console.log(`Validated ${checks} UX checks, including local-only loading, responsive layouts, keyboard movement, story destinations and failure recovery.`);
} finally { ws.close(); await fetch(cdp + '/json/close/' + tab.id); }
