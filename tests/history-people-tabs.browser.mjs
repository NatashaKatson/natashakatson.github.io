import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
const testURL = process.env.ATLAS_TEST_URL || 'http://127.0.0.1:8769/historyallaround/atlas/';
const screenshotDir = process.env.ATLAS_SCREENSHOT_DIR || path.join(os.tmpdir(), 'history-people-tabs');
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
  await send('Page.navigate', {url: testURL + '#2022'});
  await waitFor('!!window.AtlasUI && !!window.HistoryDiscovery');
  await evaluate('stopSpin();flyToken++');
  await evaluate('HistoryDiscovery.explore([30.52, 50.45])');
  await waitFor(`document.querySelector('.discovery-panel').textContent.includes('Search complete')`);
  for (const width of [1440, 390]) {
    await send('Emulation.setDeviceMetricsOverride', {width, height: 1000, deviceScaleFactor: 1, mobile: width <= 860});
    console.log(await evaluate(`(async () => {
      const check = (value, message) => { if (!value) throw Error(message); };
      const visible = node => !!node.getClientRects().length && getComputedStyle(node).display !== 'none';
      AtlasUI.goToEvents();
      const panel = document.querySelector('.discovery-panel');
      document.querySelector('[data-context="events"]').click();
      check(visible(panel), 'Local history visible in Events');
      const rows = panel.querySelectorAll('[data-place-row]').length;
      check(rows > 0, 'Real local history loaded');
      document.getElementById('side').scrollTop = 180;
      document.querySelector('[data-context="people"]').click();
      check(document.getElementById('atlasMain').dataset.sidebarContext === 'people', 'People context selected');
      check(!visible(panel) && !visible(document.getElementById('detail')) && !visible(document.getElementById('regions')), 'People excludes local history and event details');
      check(visible(document.getElementById('people')) && document.getElementById('sideSub').hidden, 'People content replaces event summary');
      check(document.getElementById('people').textContent.includes('None of the people in this atlas were alive in 2022'), 'Clear empty state at 2022');
      check(document.getElementById('side').scrollTop === 0, 'Tab change resets stale scroll');
      update();
      await new Promise(requestAnimationFrame);
      check(visible(document.getElementById('people')) && !visible(panel), 'Same-year redraw preserves People visibility');
      document.querySelector('[data-context="events"]').click();
      check(visible(panel) && panel.querySelectorAll('[data-place-row]').length === rows, 'Events restores all local history rows');
      document.querySelector('[data-context="people"]').click();
      return 'PASS local-history tab switching, empty state and state preservation at ' + innerWidth + 'px';
    })()`));
  }
  await screenshot('people-empty-mobile');
  console.log(await evaluate(`(async () => {
    const check = (value, message) => { if (!value) throw Error(message); };
    const visible = node => !!node.getClientRects().length && getComputedStyle(node).display !== 'none';
    setYear(1928);
    AtlasUI.goToEvents();
    const people = document.getElementById('people');
    const expected = ppl.filter(person => person.born <= 1928 && person.died >= 1928);
    check(expected.length > 0 && people.querySelectorAll('[data-id]').length === expected.length, 'All people alive in 1928 listed');
    check(visible(people) && document.getElementById('sideSub').hidden, 'Changing date retains People context');
    const event = ev.find(event => event.wiki === 'Penicillin');
    select(event.id, false);
    check(visible(document.getElementById('detail')) && !visible(people), 'Opening an event selects Events');
    document.querySelector('[data-context="people"]').click();
    check(!visible(document.getElementById('detail')) && visible(people) && state.sel === event.id, 'People hides event detail without losing selection');
    document.querySelector('[data-context="events"]').click();
    check(visible(document.getElementById('detail')) && state.sel === event.id, 'Returning restores event detail');
    document.querySelector('[data-context="people"]').click();
    people.querySelector('[data-id]').click();
    const person = byId[state.sel];
    check(person.kind === 'person' && visible(document.getElementById('detail')), 'Person opens their biography');
    document.querySelector('[data-context="events"]').click();
    check(!visible(document.getElementById('detail')) && document.querySelector('.event-list-disclosure').open, 'Events hides biography and shows event results');
    document.querySelector('[data-context="people"]').click();
    check(visible(document.getElementById('detail')) && byId[state.sel] === person, 'People restores biography');
    await HistoryDiscovery.explore([30.52, 50.45]);
    check(document.getElementById('atlasMain').dataset.sidebarContext === 'events' && visible(document.querySelector('.discovery-panel')), 'Opening local history from People selects Events');
    return 'PASS people records, date changes, event details, biographies and local-history navigation';
  })()`));
  if (errors.length) throw Error(errors.join('\n'));
  console.log('No browser runtime errors.');
} finally { await send('Page.close').catch(() => {}); ws.close(); }
