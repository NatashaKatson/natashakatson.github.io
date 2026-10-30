import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
const testURL = process.env.ATLAS_TEST_URL || 'http://127.0.0.1:8769/historyallaround/atlas/';
const screenshotDir = process.env.ATLAS_SCREENSHOT_DIR || path.join(os.tmpdir(), 'history-context');
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
  await send('Page.navigate',{url:testURL+'#1986'});await waitFor('!!window.AtlasUI');
  await evaluate('stopSpin();document.fonts.ready');
  for(const [width,height] of [[1440,1000],[390,844]]){
    await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<=860});
    console.log(await evaluate(`(async()=>{
      const check=(value,message)=>{if(!value)throw Error(message)};
      const visible=node=>{node.scrollIntoView({block:'center',behavior:'instant'});const r=node.getBoundingClientRect();return r.height>0&&document.elementFromPoint(r.left+r.width/2,r.top+r.height/2)?.closest('button,a')===node};
      setYear(1986);await loadChunk(chunkOf(1986));
      const soviet=polities().find(feature=>feature.name==='Union of Soviet Socialist Republics');
      selectPolity(soviet);render();
      const context=document.querySelector('#detail .story-context');
      check(context&&!context.open,'Context starts collapsed');
      context.querySelector(':scope > summary').click();
      check(context.open&&!context.querySelector('.near > details'),'One expansion exposes the related records');
      const links=[...context.querySelectorAll('[data-story]')],sources=[...context.querySelectorAll('a[href]')];
      check(links.length>0&&links.length===sources.length,'Every related record retains its source');
      check(context.textContent.includes('suggestions for exploration, not documented story links'),'Same-period qualification is preserved');
      check(links.every(visible)&&sources.every(visible),'Related records and sources are actually visible and clickable');
      const first=links[0],title=first.querySelector('b').textContent,year=state.year;
      first.click();render();
      check(state.sel&&document.querySelector('#detail h3').textContent===title,'Related record opens its reader');
      check(state.year===year,'Same-year related record retains the date');
      return 'PASS single-click context, visible source links and related navigation at '+innerWidth+'px';
    })()`));
    await evaluate(`setYear(1986);selectPolity(polities().find(f=>f.name==='Union of Soviet Socialist Republics'));render();document.querySelector('.story-context > summary').click();document.querySelector('.story-context').scrollIntoView({block:'center',behavior:'instant'})`);
    await screenshot('context-'+width);
    console.log(await evaluate(`(()=>{
      const check=(value,message)=>{if(!value)throw Error(message)};
      const person=ppl.find(person=>person.wiki==='Albert_Einstein');
      setYear(1928);select(person.id,false);render();
      const context=document.querySelector('.story-context');
      check(context&&!context.open,'Person context starts collapsed');
      context.querySelector('summary').click();
      check(!context.querySelector('.near > details')&&context.querySelectorAll('[data-story]').length>0,'Person links also need only one expansion');
      select(ev.find(event=>event.wiki==='Penicillin').id,false);render();
      const eventContext=document.querySelector('.story-context');
      eventContext.querySelector('summary').click();
      check(eventContext.querySelector('.meanwhile-slot')&&eventContext.querySelector('[data-meanwhile]')&&eventContext.querySelector('[data-story]'),'Event context preserves both meanwhile and related history');
      check(!eventContext.querySelector('.near > details'),'No redundant event disclosure');
      select(ev.find(event=>event.cat==='dinosaurs').id,false);render();
      check(!document.querySelector('.story-context'),'Readers without related content have no empty context disclosure');
      return 'PASS people, events, same-time records and empty-context handling';
    })()`));
  }
  check(!errors.length,errors.join('\n'));console.log('No browser runtime errors.');
}finally{await send('Page.close').catch(()=>{});ws.close();}
