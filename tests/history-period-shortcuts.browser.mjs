import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
const testURL = process.env.ATLAS_TEST_URL || 'http://127.0.0.1:8769/historyallaround/atlas/';
const screenshotDir = process.env.ATLAS_SCREENSHOT_DIR || path.join(os.tmpdir(), 'history-period-shortcuts');
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
const check=(value,message)=>{if(!value)throw Error(message)};
try{
  await send('Page.enable');await send('Runtime.enable');await send('Network.enable');
  await send('Network.setCacheDisabled',{cacheDisabled:true});
  await send('Network.setBlockedURLs',{urls:['https://fonts.googleapis.com/*','https://fonts.gstatic.com/*']});
  await send('Page.navigate',{url:testURL+'#1986'});await waitFor('!!window.AtlasUI');await evaluate('stopSpin()');
  for(const width of [1440,390]){
    await send('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:width<=860});
    console.log(await evaluate(`(()=>{
      const check=(value,message)=>{if(!value)throw Error(message)};
      const topics=[['womensRightsPanel','womens-rights','rightsTimeScope','[data-rights-record]','rightsSearch','HistoryWomensRights'],['migrationsPanel','migrations','migrationTimeScope','[data-migration-record]','migrationSearch','HistoryMigrations']];
      for(const year of [1300,1928,1950,1986,2022])for(const [panel,category,scope,rowSelector,search,api] of topics){
        setYear(year);AtlasUI.goToEvents();render();
        document.getElementById(search).value='unrelated old search';
        if(category==='womens-rights'){document.getElementById('rightsTopic').value='reproductive';document.getElementById('rightsRegion').value='af';}
        const before=[...state.cats].join();
        const shortcut=document.querySelector('[data-journey-shortcut="'+panel+'"]');
        const expected=ev.filter(record=>record.cat===category&&DiscoveryCore.yearGap(record.start,record.end,state.year)<=halfWin(state.year));
        check(shortcut.textContent.includes(expected.length+' '+(expected.length===1?'record':'records')),'Shortcut count follows the year');
        shortcut.click();
        check(state.year===year&&document.getElementById(scope).value==='selected','Shortcut selects period without changing the date');
        const rows=[...document.querySelectorAll(rowSelector)],ids=rows.map(row=>row.dataset.rightsRecord||row.dataset.migrationRecord);
        check(ids.length===expected.length&&expected.every(record=>ids.includes(record.id)),'Only records around the chosen year are shown');
        check(document.getElementById(search).value===''&&[...state.cats].join()===before,'Shortcut clears stale search without changing marker visibility');
        if(!expected.length)check(document.getElementById(panel).textContent.includes('No matching')&&document.getElementById(panel).textContent.includes('All years'),'No unrelated fallback records in an empty period');
        setYear(year===1300?1950:1300);render();
        check([...document.querySelectorAll(rowSelector)].every(row=>{const record=byId[row.dataset.rightsRecord||row.dataset.migrationRecord];return DiscoveryCore.yearGap(record.start,record.end,state.year)<=halfWin(state.year)}),'Open period list tracks subsequent year changes');
        document.querySelector('button[data-workspace="journeys"]').click();
        document.querySelector('[data-atlas-menu="'+panel+'"]').click();
        check(document.getElementById(scope).value==='all'&&document.querySelectorAll(rowSelector).length===ev.filter(record=>record.cat===category).length,'Journeys retains the complete catalogue');
      }
      if(!HistoryDiscovery.isComparing())document.getElementById('compareToggle').click();
      const form=document.getElementById('compareYears');form.elements.left.value='1920';form.elements.right.value='2022';form.requestSubmit();
      for(const [panel,category,scope,rowSelector] of topics){
        AtlasUI.goToEvents();document.querySelector('[data-journey-shortcut="'+panel+'"]').click();
        const expected=ev.filter(record=>record.cat===category&&[1920,2022].some(year=>DiscoveryCore.yearGap(record.start,record.end,year)<=halfWin(year)));
        check(document.querySelectorAll(rowSelector).length===expected.length,'Comparison shortcut includes both displayed years');
      }
      document.getElementById('compareToggle').click();
      return 'PASS scoped shortcuts, counts, empty years, live dates, comparison and full catalogues at '+innerWidth+'px';
    })()`));
    await evaluate(`setYear(1986);AtlasUI.goToEvents();document.querySelector('[data-journey-shortcut="womensRightsPanel"]').click()`);await screenshot('selected-period-'+width);
  }
  check(!errors.length,errors.join('\n'));console.log('No browser runtime errors.');
}finally{await send('Page.close').catch(()=>{});ws.close();}
