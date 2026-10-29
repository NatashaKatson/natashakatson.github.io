import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
const testURL = process.env.ATLAS_TEST_URL || 'http://127.0.0.1:8769/historyallaround/atlas/';
const screenshotDir = process.env.ATLAS_SCREENSHOT_DIR || path.join(os.tmpdir(), 'history-date-layout');
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
  await send('Page.enable');await send('Runtime.enable');await send('Network.enable');
  await send('Network.setBlockedURLs',{urls:['https://fonts.googleapis.com/*','https://fonts.gstatic.com/*']});
  await send('Emulation.setDeviceMetricsOverride',{width:1594,height:900,deviceScaleFactor:1,mobile:false});
  await send('Page.navigate',{url:testURL+'#201578000bc'});
  await waitFor('!!window.AtlasUI');await evaluate('stopSpin();document.fonts.ready');
  for(const [width,height] of [[1594,900],[1440,1000],[1024,768],[861,700],[768,1024],[390,844],[320,650],[844,390]]){
    await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<=860});
    for(const year of [-201578000,-201578999,-252000000,-67000000,-1000000,-999999,-500,1,2026]){
      await evaluate(`(()=>{setYear(${year});stopSpin();AtlasUI.goToMap();const input=document.getElementById('gotoInput');input.value=fmt(${year});input.focus();document.getElementById('goto').requestSubmit();input.blur();})()`);
      await pause(50);
      const result=await evaluate(`(()=>{
        const input=document.getElementById('gotoInput'),style=getComputedStyle(input),measure=document.createElement('canvas').getContext('2d');measure.font=style.font;
        const text=measure.measureText(input.value).width,available=input.clientWidth-parseFloat(style.paddingLeft)-parseFloat(style.paddingRight);
        const rects=['.controls','.timeline-date','.dock-actions'].map(selector=>document.querySelector('.time '+selector).getBoundingClientRect());
        const overlap=rects.some((a,i)=>rects.slice(i+1).some(b=>a.left<b.right-.5&&a.right>b.left+.5&&a.top<b.bottom-.5&&a.bottom>b.top+.5));
        const field=input.getBoundingClientRect(),date=rects[1],centered=Math.abs((field.left+field.right-date.left-date.right)/2)<1;
        return{value:input.value,expected:fmtInputYear(state.year),roundTrip:parseYear(input.value)===state.year,text,available,centered,overlap,overflow:document.documentElement.scrollWidth>innerWidth||document.documentElement.scrollHeight>innerHeight,border:getComputedStyle(document.getElementById('prev')).borderWidth};
      })()`);
      if(result.value!==result.expected||!result.roundTrip||!result.centered||result.text>result.available+1||result.overlap||result.overflow||result.border!=='0px')throw Error(JSON.stringify({width,height,year,...result}));
    }
    console.log(`PASS Dates, precision, arrow styling and layout fit at ${width}×${height}`);
  }
  await send('Emulation.setDeviceMetricsOverride',{width:1594,height:900,deviceScaleFactor:1,mobile:false});
  await evaluate(`setYear(-201578000);stopSpin()`);await pause(100);
  await screenshot('date-fixed-desktop');
  await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});await pause(100);
  await screenshot('date-fixed-mobile');
  if(errors.length)throw Error(errors.join('\n'));
  console.log('No runtime errors. Date submission preserves exact values.');
}finally{await send('Page.close').catch(()=>{});ws.close();}
