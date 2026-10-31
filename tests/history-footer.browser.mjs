import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
const testURL = process.env.ATLAS_TEST_URL || 'http://127.0.0.1:8769/historyallaround/atlas/';
const screenshotDir = process.env.ATLAS_SCREENSHOT_DIR || path.join(os.tmpdir(), 'history-footer');
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
  await send('Network.setBlockedURLs',{urls:['https://fonts.googleapis.com/*','https://fonts.gstatic.com/*','https://cdnjs.buymeacoffee.com/*']});
  await send('Page.navigate',{url:testURL+'#2026'});await waitFor('!!window.AtlasUI && !!document.querySelector(".population-value")');
  await evaluate('stopSpin();document.fonts.ready');
  for(const [width,height] of [[1440,1000],[861,650],[390,844],[320,568],[844,390]]){
    await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<=860});
    await evaluate(`window.scrollTo({top:0,behavior:'instant'});AtlasUI.goToMap();document.querySelector('.atlas-footer-sources').open=false`);await pause(100);
    check(await evaluate(`(()=>{const main=document.getElementById('atlasMain'),footer=document.getElementById('atlasFooter'),m=main.getBoundingClientRect(),f=footer.getBoundingClientRect();return footer.parentElement===document.body&&!footer.closest('dialog')&&f.top>=m.bottom-1&&f.bottom<=innerHeight+1&&scrollY===0&&m.height<innerHeight&&!document.getElementById('mapSettings').textContent.includes('About & sources')})()`),'Footer is visible after loading without scrolling or opening settings');
    await screenshot('footer-visible-'+width+'x'+height);
    await evaluate(`setYear(2024);render();setYear(2026);render();AtlasUI.goToEvents();document.querySelector('[data-atlas-footer]').click()`);await pause(70);
    check(await evaluate(`(()=>{const footer=document.getElementById('atlasFooter'),coffee=footer.querySelector('.atlas-support-link'),r=coffee.getBoundingClientRect();return !document.getElementById('mapSettings').open&&!document.getElementById('side').classList.contains('sheet-open')&&r.height>=44&&r.top>=0&&r.bottom<=innerHeight&&document.elementFromPoint(r.left+r.width/2,r.top+r.height/2)?.closest('a')===coffee&&coffee.href==='https://www.buymeacoffee.com/natashakatson'&&footer.textContent.includes('Made by')})()`),'Credits, support text and coffee button are visible without settings');
    await evaluate(`document.querySelector('.atlas-footer-sources summary').click()`);
    check(await evaluate(`(()=>{const footer=document.getElementById('atlasFooter'),sources=footer.querySelector('.atlas-footer-sources');return sources.open&&sources.querySelectorAll('.atlas-footer-source-grid > p').length===3&&sources.querySelector('a[href*="naturalearthdata"]')&&sources.querySelector('a[href*="geonames"]')&&sources.querySelector('a[href*="cliopatria"]')})()`),'All source attributions remain in the footer');
    check(await evaluate(`(()=>{for(const link of document.querySelectorAll('.atlas-footer-source-grid a')){link.scrollIntoView({block:'center',behavior:'instant'});const r=link.getClientRects()[0];if(!link.contains(document.elementFromPoint(r.left+r.width/2,r.top+r.height/2)))return false}return document.documentElement.scrollWidth<=innerWidth})()`),'Footer sources are reachable without horizontal overflow');
    await screenshot('footer-'+width+'x'+height);
    await evaluate(`document.querySelector('[data-return-atlas]').click()`);await pause(80);
    check(await evaluate(`scrollY===0&&document.activeElement===cv&&state.year===2026&&document.getElementById('timeControls').getBoundingClientRect().bottom<=innerHeight+1`),'Returning restores the map and visible timeline without changing the year');
    if(width<=860){
      await evaluate(`AtlasUI.goToEvents();window.scrollTo({top:document.body.scrollHeight,behavior:'instant'})`);await pause(80);
      check(await evaluate(`!document.getElementById('side').classList.contains('sheet-open')`),'An open mobile sheet does not cover the footer when scrolling down');
    }
    if(width<=860){
      await evaluate(`window.scrollTo({top:0,behavior:'instant'});setYear(1928);select(ev.find(event=>event.wiki==='Penicillin').id,false);render()`);await pause(80);
      const point=await evaluate(`(()=>{const close=document.querySelector('#detail .close');close.scrollIntoView({block:'nearest',behavior:'instant'});const r=close.getBoundingClientRect(),x=r.left+r.width/2,y=r.top+r.height/2;if(document.elementFromPoint(x,y)?.closest('button')!==close)throw Error('Reader close button is covered');return{x,y}})()`);
      await send('Input.dispatchMouseEvent',{type:'mousePressed',...point,button:'left',clickCount:1});
      await send('Input.dispatchMouseEvent',{type:'mouseReleased',...point,button:'left',clickCount:1});await pause(80);
      check(await evaluate(`!state.sel&&document.activeElement===cv&&!document.getElementById('side').classList.contains('sheet-open')`),'Reader closes back to the map while the footer stays visible');
      await evaluate(`setYear(2026);render()`);
    }
    console.log('PASS page footer, coffee link, source access and return navigation at '+width+'×'+height);
  }
  check(!errors.length,errors.join('\n'));console.log('No browser runtime errors.');
}finally{await send('Page.close').catch(()=>{});ws.close();}
