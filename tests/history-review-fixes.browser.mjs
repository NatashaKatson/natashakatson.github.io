import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
const testURL = process.env.ATLAS_TEST_URL || 'http://127.0.0.1:8769/historyallaround/atlas/';
const screenshotDir = process.env.ATLAS_SCREENSHOT_DIR || path.join(os.tmpdir(), 'history-review-fixes');
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
const check = (condition, message) => { if (!condition) throw Error(message); };
const click = async (selector) => {
  const point = await evaluate(`(()=>{const r=document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2}})()`);
  await send('Input.dispatchMouseEvent', {type:'mousePressed',...point,button:'left',clickCount:1});
  await send('Input.dispatchMouseEvent', {type:'mouseReleased',...point,button:'left',clickCount:1});
};
try {
  await send('Page.enable'); await send('Runtime.enable'); await send('Network.enable');
  await send('Network.setBlockedURLs', {urls:['https://fonts.googleapis.com/*','https://fonts.gstatic.com/*']});
  await send('Emulation.setDeviceMetricsOverride', {width:1440,height:1000,deviceScaleFactor:1,mobile:false});
  await send('Page.navigate', {url:testURL+'#1928'});
  await waitFor('!!window.AtlasUI'); await evaluate('stopSpin();document.fonts.ready');
  for (const width of [1440,390]) {
    await send('Emulation.setDeviceMetricsOverride', {width,height:844,deviceScaleFactor:1,mobile:width<=860});
    await evaluate(`setYear(1928);AtlasUI.goToMap();stopSpin()`);
    await evaluate(`(()=>{const input=document.getElementById('gotoInput');input.focus();input.value='201.578 Ma';input.dispatchEvent(new Event('input',{bubbles:true}));input.setCustomValidity('Invalid draft')})()`);
    await send('Input.dispatchKeyEvent', {type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
    await send('Input.dispatchKeyEvent', {type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
    check(await evaluate(`(()=>{const input=document.getElementById('gotoInput');return state.year===1928&&input.value==='1928'&&!input.classList.contains('is-wide-date')&&!input.validationMessage&&document.activeElement===cv})()`), 'Escape restores the selected date, field width and validation');
    await evaluate(`(()=>{const input=document.getElementById('gotoInput');input.focus();input.value='1492';input.dispatchEvent(new Event('input',{bubbles:true}));cv.focus()})()`);
    check(await evaluate(`state.year===1928&&document.getElementById('gotoInput').value==='1928'`), 'Leaving an unsubmitted date restores the selected year');
    await evaluate(`(()=>{const input=document.getElementById('gotoInput');input.focus();input.value='1492';input.dispatchEvent(new Event('input',{bubbles:true}))})()`);
    await send('Input.dispatchKeyEvent', {type:'keyDown',key:'Enter',code:'Enter',windowsVirtualKeyCode:13,text:'\r'});
    await send('Input.dispatchKeyEvent', {type:'keyUp',key:'Enter',code:'Enter',windowsVirtualKeyCode:13});
    check(await evaluate(`state.year===1492&&document.getElementById('gotoInput').value==='1492'`), 'Enter still submits the edited date');
    if (width>860) {
      await evaluate(`(()=>{const input=document.getElementById('gotoInput');input.focus();input.value='1610';input.dispatchEvent(new Event('input',{bubbles:true}))})()`);
      await click('#goto button');
      check(await evaluate(`state.year===1610&&document.getElementById('gotoInput').value==='1610'`), 'Mouse submit retains the draft during focus transfer to Go');
    }
    console.log('PASS date cancellation, blur and submission at '+width+'px');
  }
  console.log(await evaluate(`(()=>{
    const check=(value,message)=>{if(!value)throw Error(message)};
    for(const migrations of [false,true]){
      state.cats=new Set(migrations?['migrations']:[]);setYear(1928);render();
      document.querySelector('[data-reset-empty]').click();render();
      const recovered=[...state.cats].sort().join();
      check(!state.cats.has('womens-rights')&&state.cats.has('migrations')===migrations,'Recovery respects women’s-rights default and migration preference');
      check(ev.filter(event=>event.cat==='womens-rights').length===76,'All 76 milestones retained');
      state.cats=new Set(migrations?['migrations']:[]);update();render();
      document.getElementById('resetFilters').click();render();
      check([...state.cats].sort().join()===recovered,'Both reset buttons restore identical categories');
    }
    return 'PASS shared reset defaults and all 76 women’s-rights records';
  })()`));
  for(const [width,height] of [[844,390],[667,375],[568,320],[320,500]]) {
    await send('Emulation.setDeviceMetricsOverride', {width,height,deviceScaleFactor:1,mobile:true});
    for(const year of [1928,-500]) {
      await evaluate(`setYear(${year});AtlasUI.goToMap();document.getElementById('timelineScope').click()`);
      await pause(80);
      check(await evaluate(`(()=>{const r=document.getElementById('eraPanel').getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight&&r.height>=140})()`), 'Era chooser stays within the short viewport');
      for(const [edge,year] of [['first',-228000000],['last',1903]]) {
        const point=await evaluate(`(()=>{
          const panel=document.getElementById('eraPanel');
          const buttons=[...panel.querySelectorAll('#eraChoices button')].filter(button=>!button.hidden);
          const button=${JSON.stringify(edge)}==='first'?buttons[0]:buttons.at(-1);
          button.scrollIntoView({block:'nearest',behavior:'instant'});
          const r=button.getBoundingClientRect(),p=panel.getBoundingClientRect();
          const x=r.left+r.width/2,y=r.top+r.height/2;
          if(r.top<p.top||r.bottom>p.bottom||document.elementFromPoint(x,y)?.closest('button')!==button)throw Error('Era option is clipped or covered');
          return {x,y};
        })()`);
        await send('Input.dispatchMouseEvent',{type:'mousePressed',...point,button:'left',clickCount:1});
        await send('Input.dispatchMouseEvent',{type:'mouseReleased',...point,button:'left',clickCount:1});
        await waitFor(`state.year===${year}&&document.getElementById('eraPanel').hidden`);
        await evaluate(`document.getElementById('timelineScope').click()`);
      }
      await screenshot('era-'+width+'x'+height+(year<0?'-bc':''));
    }
    console.log('PASS first and last era options clickable at '+width+'×'+height);
  }
  check(!errors.length,errors.join('\n'));
  console.log('No browser runtime errors.');
} finally {await send('Page.close').catch(()=>{});ws.close();}
