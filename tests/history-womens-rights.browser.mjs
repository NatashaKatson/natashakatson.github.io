// Dedicated women’s rights chronology, trusted readers, reproductive history and responsive controls.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const cdp = process.env.ATLAS_CDP_URL || 'http://127.0.0.1:9231';
const url = process.env.ATLAS_TEST_URL || pathToFileURL(path.resolve('prototypes/atlas-ui/preview.html')).href;
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
  const call = ++id, timer = setTimeout(() => { pending.delete(call); reject(Error('CDP timeout: ' + method)); }, 30000);
  pending.set(call, { resolve, reject, timer }); ws.send(JSON.stringify({ id: call, method, params }));
});
const evaluate = async (expression) => {
  const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (result.exceptionDetails) throw Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
  return result.result.value;
};
const waitFor = async (expression) => {
  for (let i = 0; i < 150; i++) { if (await evaluate(expression)) return; await new Promise((r) => setTimeout(r, 70)); }
  throw Error('Not ready: ' + expression);
};
const screenshot = async (name) => {
  const shot = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(os.tmpdir(), 'history-womens-rights-' + name + '.png'), Buffer.from(shot.data, 'base64'));
};
try {
  await send('Runtime.enable');await send('Network.enable');
  await send('Network.setCacheDisabled',{cacheDisabled:true});
  await send('Network.setBlockedURLs',{urls:url.startsWith('file:')?['http://*','https://*']:['https://fonts.googleapis.com/*','https://fonts.gstatic.com/*']});
  await send('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
  await send('Page.navigate',{url:url+'#1950'});
  await waitFor('!!window.HistoryWomensRights && !!window.AtlasUI');
  console.log(await evaluate(`(()=>{
    const check=(v,m)=>{if(!v)throw Error(m)};stopSpin();flyToken++;
    const trigger=document.querySelector('[data-atlas-menu="womensRightsPanel"]');trigger.click();
    check(trigger.textContent.includes('👩')&&trigger.getAttribute('aria-expanded')==='true','Woman emoji and dedicated entry point');
    check(!document.querySelector('#layersPanel [data-rights-record]')&&!document.querySelector('#layersPanel [data-layer="womens-rights"]'),'Women’s rights are separate from Layers');
    const buttons=[...document.querySelectorAll('[data-rights-record]')];
    check(buttons.length===76,'Every milestone is discoverable outside its date');
    check(buttons.every((b,i)=>!i||byId[buttons[i-1].dataset.rightsRecord].start<=byId[b.dataset.rightsRecord].start),'Chronological ordering across history');
    check(byId[buttons[0].dataset.rightsRecord].start===-172,'Ancient history is included');
    const list=document.getElementById('rightsResults'),last=buttons.at(-1);
    last.focus();last.scrollIntoView({block:'nearest'});
    const scroll=list.scrollTop;
    setYear(1951);render();
    check(document.activeElement===last&&list.scrollTop>scroll-100,'Timeline updates preserve the focused result and browsing position');
    setYear(1950);render();
    const topic=document.getElementById('rightsTopic');topic.value='reproductive';topic.dispatchEvent(new Event('change',{bubbles:true}));
    check(list.scrollTop===0,'Changing the catalogue filter starts at the first result');
    check(document.querySelectorAll('[data-rights-record]').length===41,'Dedicated abortion and reproductive topic includes reforms and reversals');
    const region=document.getElementById('rightsRegion');region.value='af';region.dispatchEvent(new Event('change',{bubbles:true}));
    check(document.querySelectorAll('[data-rights-record]').length===2,'Regional filtering combines with reproductive topic');
    region.value='all';region.dispatchEvent(new Event('change',{bubbles:true}));
    const search=document.getElementById('rightsSearch');search.value='abortions';search.dispatchEvent(new Event('input',{bubbles:true}));
    check(document.querySelectorAll('[data-rights-record]').length===41,'Plural abortion query finds the full reproductive catalogue');
    search.value='not-a-real-milestone-xyz';search.dispatchEvent(new Event('input',{bubbles:true}));
    check(!!document.querySelector('.rights-empty')&&state.year===1950,'Empty search keeps map context');
    search.value='Roe';search.dispatchEvent(new Event('input',{bubbles:true}));
    const roe=ev.find(e=>e.wiki==='Roe_v._Wade');document.querySelector('[data-rights-record="'+roe.id+'"]').click();
    check(state.year===1973&&state.sel===roe.id&&state.cats.has('womens-rights'),'Dated navigation opens the recorded year');
    check(document.getElementById('womensRightsPanel').hidden&&document.activeElement===document.getElementById('detail'),'Reader receives focus');
    check(document.querySelector('#detail h3 .event-emoji').textContent==='👩','Reader uses the woman emoji');
    check(!!document.querySelector('#detail a[href^="https://tile.loc.gov/"]')&&!document.querySelector('#detail a[href*="wikipedia.org"]'),'Rights reader cites the trusted primary source');
    check(document.getElementById('detail').textContent.includes('2022'),'Roe reader explains its reversal');
    return 'Separate chronology, worldwide topic/region search, abortion history and source-linked dated reader passed';
  })()`));
  console.log(await evaluate(`(()=>{
    const check=(v,m)=>{if(!v)throw Error(m)};
    document.querySelector('#detail .close').click();
    document.querySelector('[data-atlas-menu="womensRightsPanel"]').click();
    const topic=document.getElementById('rightsTopic'),search=document.getElementById('rightsSearch'),region=document.getElementById('rightsRegion');
    topic.value='us-abortion';search.value='USA';HistoryWomensRights.render();
    const matches=()=>[...document.querySelectorAll('[data-rights-record]')].map(button=>byId[button.dataset.rightsRecord]);
    check(matches().length===24&&matches().every(record=>record.rights.topic==='reproductive'&&record.rights.country.startsWith('United States')),'US shortcut includes only federal and state abortion milestones');
    check(matches().some(record=>record.wiki==='Roe_v._Wade')&&matches().some(record=>record.wiki==='Comstock_Act'),'USA alias includes original federal records and early restrictions');
    region.value='as';HistoryWomensRights.render();check(matches().length===0,'US shortcut respects the region filter');
    region.value='am';search.value='Texas';HistoryWomensRights.render();
    check(matches().length===2&&matches().every(record=>record.rights.country==='United States · Texas'),'State search isolates Texas milestones');
    search.value='Florida';HistoryWomensRights.render();check(matches().length===2,'Florida includes the restriction and the failed amendment');
    const vote=matches().find(record=>record.wiki==='2024_Florida_Amendment_4');
    document.querySelector('[data-rights-record="'+vote.id+'"]').click();
    check(state.year===2024&&state.sel===vote.id,'A state milestone navigates to its recorded year');
    const detail=document.getElementById('detail');
    check(detail.textContent.includes('United States · Florida')&&detail.textContent.includes('57.17')&&detail.textContent.includes('not adopted'),'State reader preserves jurisdiction and failed-vote qualification');
    check(!!detail.querySelector('a[href^="https://results.elections.myflorida.com/"]')&&!detail.querySelector('a[href*="wikipedia.org"]'),'State reader links official results');
    return 'US abortion shortcut, USA aliases, combined regions, state searches and official state reader passed';
  })()`));
  await evaluate(`document.querySelector('#detail .close').click();document.querySelector('[data-atlas-menu="womensRightsPanel"]').focus()`);
  await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Enter',code:'Enter',windowsVirtualKeyCode:13,text:'\r'});
  await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Enter',code:'Enter',windowsVirtualKeyCode:13});
  assert(await evaluate(`!document.getElementById('womensRightsPanel').hidden`),'Keyboard opens Women’s rights');
  await evaluate(`document.getElementById('rightsSearch').focus()`);
  await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
  await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
  assert(await evaluate(`document.getElementById('womensRightsPanel').hidden&&document.activeElement.dataset.atlasMenu==='womensRightsPanel'`),'Escape closes and restores focus');
  await evaluate(`state.cats=new Set(['womens-rights']);buildMarks();update();render();document.querySelector('[data-atlas-menu="womensRightsPanel"]').click();document.getElementById('rightsVisibility').click();render()`);
  assert(await evaluate(`!state.cats.size&&!activeEvents().length&&document.querySelector('#legend [data-k="womens-rights"]').getAttribute('aria-pressed')==='false'`),'Show on map can hide the final category and synchronizes Filters');
  const shared=await evaluate('HistoryDiscovery.urlHash()');
  await send('Page.navigate',{url:url+shared});
  await waitFor('!!window.HistoryWomensRights && !!window.AtlasUI');
  assert(await evaluate(`!state.cats.size&&!document.getElementById('rightsVisibility').checked`),'Saved view preserves hidden women’s rights');
  await evaluate(`stopSpin();flyToken++;document.getElementById('rightsSearch').value='';document.getElementById('rightsTopic').value='all';document.getElementById('rightsRegion').value='all';HistoryWomensRights.render();`);
  for(const [width,height] of [[1440,1000],[1440,400],[900,400],[1280,450],[1100,800],[1024,768],[900,700],[861,700],[768,1024],[560,700],[390,844],[320,568],[320,500],[844,390]]){
    await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<=860});
    await evaluate(`window.scrollTo({top:0,behavior:'instant'});resize();`);
    assert(await evaluate(`(()=>{const r=[...document.querySelectorAll('.atlas-toolbar > .atlas-menu > button')].map(b=>b.getBoundingClientRect());return r.length===4&&r.every((a,i)=>a.left>=0&&a.right<=innerWidth&&a.height>=40&&r.slice(i+1).every(b=>a.right<=b.left||b.right<=a.left||a.bottom<=b.top||b.bottom<=a.top))&&document.documentElement.scrollWidth<=innerWidth})()`),`Four controls fit at ${width}×${height}`);
    await evaluate(`(()=>{const trigger=document.querySelector('[data-atlas-menu="womensRightsPanel"]');if(trigger.getAttribute('aria-expanded')!=='true')trigger.click()})()`);
    assert(await evaluate(`(()=>{const p=document.getElementById('womensRightsPanel').getBoundingClientRect();return p.height>0&&p.left>=0&&p.right<=innerWidth&&p.top>=0&&p.bottom<=innerHeight})()`),`Women’s rights panel fits at ${width}×${height}`);
    assert(await evaluate(`(()=>{const list=document.getElementById('rightsResults'),button=[...list.querySelectorAll('[data-rights-record]')].at(-1);button.scrollIntoView({block:'nearest'});const r=button.getBoundingClientRect(),p=list.getBoundingClientRect();return r.height>=44&&r.top>=p.top-1&&r.bottom<=p.bottom+1&&document.elementFromPoint(r.left+20,r.top+r.height/2)?.closest('[data-rights-record]')===button})()`),`Last milestone is reachable at ${width}×${height}`);
    for(const id of ['rightsSearch','rightsTopic','rightsRegion'])assert(await evaluate(`(()=>{const r=document.getElementById('${id}').getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight})()`),`${id} stays reachable`);
    await screenshot(width+'x'+height);
    await evaluate(`document.querySelector('.rights-close').click()`);
    assert(await evaluate(`document.activeElement.dataset.atlasMenu==='womensRightsPanel'`),'Close returns focus');
  }
  await send('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
  console.log(await evaluate(`(async()=>{
    const check=(v,m)=>{if(!v)throw Error(m)};
    const record=ev.find(e=>e.wiki==='Abortion_in_Colombia');
    await HistoryDiscovery.jumpSearch({kind:'event',recordId:record.id,start:record.start,lon:record.lon,lat:record.lat});
    flyToken++;rot=[-record.lon,-record.lat,0];render();
    check(hits.some(h=>h.id===record.id&&!h.radius),'Woman event has a selectable map marker');
    document.getElementById('compareToggle').click();const form=document.getElementById('compareYears');form.elements.left.value='1920';form.elements.right.value='2022';form.requestSubmit();render();
    check(hits.some(h=>h.year===1920&&byId[h.id]?.cat==='womens-rights')||hits.some(h=>h.year===2022&&byId[h.id]?.cat==='womens-rights'),'Comparison retains dated women’s rights markers');
    check(document.getElementById('rightsStatus').textContent.includes('1920 & 2022'),'Catalogue follows both displayed years');
    return 'Saved visibility, keyboard access, responsive catalogue, map markers and comparison passed';
  })()`));
  for(const [width,height] of [[1440,1000],[390,844]]){
    await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<=860});
    await evaluate(`(()=>{resize();document.getElementById('rightsSearch').value='';document.getElementById('rightsTopic').value='us-abortion';document.getElementById('rightsRegion').value='all';HistoryWomensRights.render();const trigger=document.querySelector('[data-atlas-menu="womensRightsPanel"]');if(trigger.getAttribute('aria-expanded')!=='true')trigger.click()})()`);
    assert(await evaluate(`document.querySelectorAll('[data-rights-record]').length===24&&document.getElementById('rightsResults').clientHeight>100`),`US abortion catalogue is readable at ${width}×${height}`);
    await screenshot('us-abortion-'+width+'x'+height);
  }
  assert.deepEqual(errors,[],'No browser exceptions');
} finally {ws.close();await fetch(cdp+'/json/close/'+tab.id);}
