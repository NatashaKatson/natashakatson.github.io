import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
const testURL = process.env.ATLAS_TEST_URL || 'http://127.0.0.1:8769/historyallaround/atlas/';
const screenshotDir = process.env.ATLAS_SCREENSHOT_DIR || path.join(os.tmpdir(), 'history-final-review');
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
const key=async(key,shift=false)=>{await send('Input.dispatchKeyEvent',{type:'keyDown',key,code:key,windowsVirtualKeyCode:key==='Tab'?9:27,modifiers:shift?8:0});await send('Input.dispatchKeyEvent',{type:'keyUp',key,code:key,windowsVirtualKeyCode:key==='Tab'?9:27,modifiers:shift?8:0});await pause(40)};
try{
  await send('Page.enable');await send('Runtime.enable');await send('Network.enable');await send('Network.setCacheDisabled',{cacheDisabled:true});
  await send('Network.setBlockedURLs',{urls:['https://fonts.googleapis.com/*','https://fonts.gstatic.com/*']});
  await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
  await send('Page.navigate',{url:testURL+'#1300'});await waitFor('!!window.AtlasUI&&!!document.querySelector(".population-value")');await evaluate('stopSpin()');
  console.log(await evaluate(`(()=>{
    const check=(v,m)=>{if(!v)throw Error(m)};
    for(const year of [-1200000,-1000001,-1000000,-172,1300,1986,2022]){
      setYear(year);
      for(const [api,selector] of [[HistoryWomensRights,'[data-rights-record]'],[HistoryMigrations,'[data-migration-record]']]){
        api.setScope('selected',true);
        const rows=[...document.querySelectorAll(selector)];
        check(rows.every(row=>{const record=byId[row.dataset.rightsRecord||row.dataset.migrationRecord];return DiscoveryCore.yearGap(record.start,record.end,year)<=SAME_TIME_YEARS}),'Selected human histories stay within two years, including deep time');
        if(year<-1000000)check(!rows.length,'No ancient human histories appear a million years ago');
        api.setScope('all');check(document.querySelectorAll(selector).length===(api===HistoryWomensRights?76:31),'Full catalogs are retained');
      }
    }
    return 'PASS historical relevance and all 107 thematic records';
  })()`));
  for(const [width,height,inset] of [[390,844,34],[320,568,34],[568,320,0],[844,320,0],[1440,320,0]]){
    await send('Emulation.setSafeAreaInsetsOverride',{insets:{bottom:inset,top:0,left:0,right:0}});
    await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<=860});
    await evaluate(`AtlasUI.goToMap();setYear(2026);stopSpin();render()`);await pause(120);
    const layout=await evaluate(`(()=>{const f=document.getElementById('atlasFooter').getBoundingClientRect(),c=document.querySelector('.atlas-support-link').getBoundingClientRect(),time=document.getElementById('timeControls').getBoundingClientRect(),map=cv.getBoundingClientRect();return {footerTop:f.top,footerBottom:f.bottom,coffeeBottom:c.bottom,coffeeTop:c.top,mapHeight:map.height,timeTop:time.top,timeBottom:time.bottom,overflow:document.documentElement.scrollWidth>innerWidth}})()`);
    check(layout.footerBottom<=height+1&&layout.coffeeBottom<=height-inset+1&&layout.coffeeTop>=0,'Footer and coffee remain visible outside the safe area: '+JSON.stringify({width,height,inset,layout}));
    check(layout.mapHeight>=40&&!layout.overflow,'Short screens retain a usable map without horizontal overflow: '+JSON.stringify({width,height,layout}));
    await screenshot('layout-'+width+'x'+height);
    await evaluate(`document.querySelector('[data-atlas-menu="eraPanel"]').click()`);await pause(40);
    check(await evaluate(`(()=>{const panel=document.getElementById('eraPanel'),last=panel.querySelector('#eraChoices button:last-child');last.scrollIntoView({block:'nearest',behavior:'instant'});const r=last.getBoundingClientRect();return !panel.hidden&&r.top>=0&&r.bottom<=innerHeight&&last.contains(document.elementFromPoint(r.left+r.width/2,r.top+r.height/2))})()`),'Era choices remain reachable in the compact timeline');
    await key('Escape');
    await evaluate(`setYear(1300);AtlasUI.goToEvents();document.querySelector('[data-journey-shortcut="womensRightsPanel"]').click();document.getElementById('rightsRegion').focus()`);await pause(50);
    await key('Tab');
    check(await evaluate(`(()=>{const node=document.activeElement;if(node===document.body)return true;const r=node.getBoundingClientRect();return node.contains(document.elementFromPoint(r.left+r.width/2,r.top+r.height/2))&&!node.closest('[inert]')})()`),'Tab cannot focus a control covered by the topic panel');
    await evaluate(`document.querySelector('.rights-close').focus()`);await key('Tab',true);
    check(await evaluate(`(()=>{const node=document.activeElement,r=node.getBoundingClientRect();return node.contains(document.elementFromPoint(r.left+r.width/2,r.top+r.height/2))&&!node.closest('[inert]')})()`),'Shift+Tab stays on a visible control');
    await key('Escape');
    check(await evaluate(`!document.querySelector('[data-atlas-menu="womensRightsPanel"]').getAttribute('aria-expanded').includes('true')&&!stage.inert&&!document.getElementById('timeControls').inert&&!document.getElementById('atlasFooter').inert`),'Closing restores background controls');
    console.log('PASS safe footer, usable short-screen map and visible keyboard focus at '+width+'×'+height);
  }
  await send('Emulation.setSafeAreaInsetsOverride',{insets:{bottom:0,top:0,left:0,right:0}});
  await send('Emulation.setDeviceMetricsOverride',{width:320,height:650,deviceScaleFactor:1,mobile:true});await evaluate('AtlasUI.goToMap();setYear(2026);render()');await pause(100);
  check(await evaluate(`(()=>{const before=document.getElementById('previousEvent'),year=document.getElementById('prev'),r=year.getBoundingClientRect();return before.querySelector('svg')&&!year.querySelector('svg')&&r.width>=36&&r.height>=40&&parseFloat(getComputedStyle(document.querySelector('.ticks span')).fontSize)>=11&&parseFloat(getComputedStyle(document.querySelector('.timeline-help summary')).fontSize)>=11})()`),'Record jumps have distinct icons, year targets are larger, and mobile timeline text is readable');
  check(!errors.length,errors.join('\n'));console.log('No browser runtime errors.');
}finally{await send('Page.close').catch(()=>{});ws.close();}
