// User-facing regressions from the November UI review: reading space and journey continuity.
import assert from 'node:assert/strict';
import fs from 'node:fs';
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
const evaluate = async expression => {
  const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (result.exceptionDetails) throw Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
  return result.result.value;
};
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const waitFor = async expression => {
  for (let i = 0; i < 150; i++) { if (await evaluate(expression)) return; await pause(70); }
  throw Error('Not ready: ' + expression);
};
const enter = async () => {
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, text: '\r', unmodifiedText: '\r' });
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
  await pause(30);
};
const screenshot = async name => {
  const shot = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('/private/tmp/atlas-ux-updated-' + name + '.png', Buffer.from(shot.data, 'base64'));
};
try {
  await send('Page.enable'); await send('Runtime.enable'); await send('Network.enable');
  await send('Network.setCacheDisabled', { cacheDisabled: true });
  await send('Network.setBlockedURLs', { urls: ['https://*'] });
  for (const [width, height] of [[1440, 900], [768, 1024], [390, 844], [320, 570]]) {
    await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: width <= 860 });
    await send('Page.navigate', { url: 'about:blank' });
    await waitFor('location.href === "about:blank"');
    await send('Page.navigate', { url: url + '#1942' });
    await waitFor('!!window.AtlasExplore && !!window.AtlasUI');
    await evaluate('stopSpin();stopPlay()'); await pause(100);
    const coffee = await evaluate(`(()=>{const a=document.querySelector('.atlas-support-link'),r=a.getBoundingClientRect(),s=getComputedStyle(a);return {href:a.href,text:a.textContent,background:s.backgroundColor,width:r.width,height:r.height,top:r.top,bottom:r.bottom}})()`);
    assert.equal(coffee.href, 'https://www.buymeacoffee.com/natashakatson');
    assert(coffee.text.includes('Buy me a coffee') && coffee.height >= 44 && coffee.bottom <= height + 1);
    if (width === 320) assert(await evaluate('cv.getBoundingClientRect().height>=180'), 'Short phone keeps enough map space');
    await screenshot(width + '-map');
    assert.equal(await evaluate('document.getElementById("yearIntroduction").open'), width > 860, 'Compact initial introduction on phones');
    await evaluate('AtlasUI.goToEvents()'); await pause(50);
    if (width <= 860) {
      assert(await evaluate(`(()=>{const row=document.querySelector('#regions .item'),r=row.getBoundingClientRect(),s=side.getBoundingClientRect();return r.top>=s.top&&r.top<s.bottom-30})()`), 'First event is discoverable without scrolling');
      assert(await evaluate('stage.inert && document.getElementById("timeControls").inert'), 'Covered controls leave keyboard order');
      const readingCoffee = await evaluate(`(()=>{const a=document.querySelector('.atlas-support-link'),r=a.getBoundingClientRect(),s=getComputedStyle(a);return {href:a.href,text:a.textContent,background:s.backgroundColor,width:r.width,height:r.height,top:r.top,bottom:r.bottom}})()`);
      assert.deepEqual(readingCoffee, coffee, 'Buy me a coffee keeps its appearance and position while reading');
      assert(await evaluate(`(()=>{const a=document.querySelector('.atlas-support-link'),r=a.getBoundingClientRect();return a.contains(document.elementFromPoint(r.left+r.width/2,r.top+r.height/2))})()`), 'Buy me a coffee remains clickable');
    }
    await screenshot(width + '-events');
    await evaluate('document.getElementById("yearIntroduction").open=false;setYear(1943)');
    assert.equal(await evaluate('document.getElementById("yearIntroduction").open'), false, 'Year changes preserve a collapsed introduction');
    await evaluate('document.getElementById("yearIntroduction").open=true;setYear(1942)');
    assert.equal(await evaluate('document.getElementById("yearIntroduction").open'), true, 'Year changes preserve an expanded introduction');
    await evaluate(`document.querySelector('[data-workspace="journeys"]').click()`); await pause(50);
    if (width <= 860) assert(await evaluate(`(()=>{const b=document.querySelector('[data-topic-journey="technology"]'),r=b.getBoundingClientRect(),s=side.getBoundingClientRect();return r.top>=s.top&&r.bottom<=s.bottom})()`), 'Guided journey is visible when Journeys opens');
    await screenshot(width + '-journeys');
    await evaluate(`document.querySelector('[data-topic-journey="technology"]').click()`);
    for (let stop = 2; stop <= 5; stop++) {
      await enter();
      assert(await evaluate(`document.querySelector('.topic-reader h4').textContent.includes('stop ${stop} of 5')`), 'Enter advances to stop ' + stop);
      assert(await evaluate(stop < 5 ? 'document.activeElement.hasAttribute("data-route-next")' : 'document.activeElement.matches(".topic-reader h4")'), 'Forward focus remains predictable');
    }
    await evaluate('document.querySelector("[data-route-prev]").focus()');
    for (let stop = 4; stop >= 1; stop--) {
      await enter();
      assert(await evaluate(`document.querySelector('.topic-reader h4').textContent.includes('stop ${stop} of 5')`), 'Enter goes back to stop ' + stop);
      assert(await evaluate(stop > 1 ? 'document.activeElement.hasAttribute("data-route-prev")' : 'document.activeElement.matches(".topic-reader h4")'), 'Backward focus remains predictable');
    }
    await screenshot(width + '-topic');
    await evaluate(`(()=>{AtlasUI.goToEvents();setYear(1942);state.cats.delete('womens-rights');buildMarks();update();const categorySelect=document.getElementById('browseCategory');categorySelect.value='womens-rights';categorySelect.dispatchEvent(new Event('change'))})()`);
    assert(await evaluate('!document.querySelector("[data-reveal-category]").hidden'), 'Hidden category has an explicit recovery action');
    await evaluate('document.querySelector("[data-reveal-category]").click()');
    assert(await evaluate('state.cats.has("womens-rights") && document.querySelector("[data-reveal-category]").hidden'), 'Recovery reveals the selected category');
    await evaluate('document.querySelector("[data-clear-browse]").click();document.getElementById("yearStep").value="100";update()');
    assert(await evaluate('[...document.querySelectorAll(".year-step-size")].every(n=>n.textContent==="100y")'), 'Configured step is visible');
    await evaluate('AtlasUI.goToMap()');
    assert(await evaluate('!stage.inert && !document.getElementById("timeControls").inert'), 'Map controls recover after closing the reader');
    assert(await evaluate('document.documentElement.scrollWidth<=innerWidth'), 'No horizontal overflow');
    console.log('PASS reading space, guided journeys, keyboard continuity, filter recovery and unchanged coffee button at ' + width + '×' + height);
  }
  assert.equal(errors.length, 0, JSON.stringify(errors));
  console.log('No browser runtime errors.');
} finally { await send('Page.close').catch(() => {}); ws.close(); }
