import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
const testURL = process.env.ATLAS_TEST_URL || 'http://127.0.0.1:8769/historyallaround/atlas/';
const screenshotDir = process.env.ATLAS_SCREENSHOT_DIR || path.join(os.tmpdir(), 'history-population-visible');
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
try {
  await send('Page.enable');await send('Runtime.enable');await send('Network.enable');
  await send('Network.setBlockedURLs',{urls:['https://fonts.googleapis.com/*','https://fonts.gstatic.com/*']});
  await send('Page.navigate',{url:testURL+'#2024'});
  await waitFor('!!window.AtlasUI && !!document.querySelector(".population-value")');
  await evaluate('stopSpin();document.fonts.ready');
  for(const [width,height] of [[1440,1000],[1024,768],[861,650],[390,844],[320,568],[844,390],[568,320]]){
    await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<=860});
    for(const comparing of [false,true]){
      await evaluate(`(()=>{
        AtlasUI.goToMap();setYear(2024);stopSpin();
        if(HistoryDiscovery.isComparing()!==${comparing})document.getElementById('compareToggle').click();
        const form=document.getElementById('compareYears');form.elements.left.value='1800';form.elements.right.value='2024';
        if(${comparing})form.requestSubmit();render();
      })()`);
      await pause(120);
      const layout=await evaluate(`(()=>{
        const strip=document.querySelector('.population-strip'),s=strip.getBoundingClientRect(),t=document.querySelector('.time').getBoundingClientRect();
        const readouts=[...strip.querySelectorAll('.population-value')].map(node=>{const r=node.getBoundingClientRect();return{top:r.top,bottom:r.bottom,left:r.left,right:r.right,text:node.textContent,overflow:node.scrollWidth>node.clientWidth+1}});
        return{visible:!!s.height&&!strip.closest('dialog'),text:strip.textContent,top:s.top,bottom:s.bottom,timeTop:t.top,timeBottom:t.bottom,left:s.left,right:s.right,overflow:strip.scrollWidth>strip.clientWidth+1||document.documentElement.scrollWidth>innerWidth,readouts};
      })()`);
      check(layout.visible&&layout.text.includes('8.16 billion'),'2024 population remains visible without settings: '+JSON.stringify({width,height,comparing,layout}));
      check(layout.top>=layout.timeTop&&layout.bottom<=layout.timeBottom&&layout.timeBottom<=height+1&&!layout.overflow,'Population and dock fit: '+JSON.stringify({width,height,comparing,layout}));
      check(layout.readouts.length===(comparing?2:1)&&layout.readouts.every(row=>!row.overflow&&row.top>=layout.top&&row.bottom<=layout.bottom&&row.left>=layout.left&&row.right<=layout.right),'All comparison values fit');
      await evaluate(`document.querySelector('.population-heading details').open=true`);await pause(50);
      check(await evaluate(`(()=>{const r=document.querySelector('.population-method').getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight&&r.left>=0&&r.right<=innerWidth})()`),'Sources fit the viewport');
      await evaluate(`document.querySelector('.population-heading details').open=false`);
      if(!comparing)await screenshot('population-'+width+'x'+height);
    }
    await evaluate(`document.getElementById('compareToggle').click();setYear(-228000000);render()`);await pause(80);
    check(await evaluate(`document.querySelector('.population-strip').hidden&&getComputedStyle(document.getElementById('atlasMain')).getPropertyValue('--population-space')==='0px'`),'Deep time does not reserve an empty population row');
    console.log('PASS visible population, comparison and source notes at '+width+'×'+height);
  }
  check(!errors.length,errors.join('\n'));console.log('No browser runtime errors.');
}finally{await send('Page.close').catch(()=>{});ws.close();}
