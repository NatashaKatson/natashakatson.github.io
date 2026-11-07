// Discovery regressions: year context, geographic records, timeline, focus and responsive popovers.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
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
  const call = ++id, timer = setTimeout(() => { pending.delete(call); reject(Error('CDP timeout: ' + method)); }, 40000);
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

const shot=async name=>{const s=await send('Page.captureScreenshot',{format:'png'});fs.writeFileSync('/private/tmp/atlas-cartography-'+name+'.png',Buffer.from(s.data,'base64'))};
const click=async selector=>{const p=await evaluate(`(()=>{const r=document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect();return{x:r.left+r.width/2,y:r.top+r.height/2}})()`);for(const type of ['mousePressed','mouseReleased'])await send('Input.dispatchMouseEvent',{type,...p,button:'left',clickCount:1})};
try{
 await send('Page.enable');await send('Runtime.enable');await send('Network.enable');await send('Network.setCacheDisabled',{cacheDisabled:true});await send('Network.setBlockedURLs',{urls:['https://*']});
 await send('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});await send('Page.navigate',{url:url+'#2024'});await waitFor('!!window.AtlasExplore');
 for(const [width,height] of [[1440,900],[1024,768],[768,1024],[390,844],[320,570]]){
  await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<=860});
  console.log(await evaluate(`(async()=>{
   const check=(v,m)=>{if(!v)throw Error(m)};
   for(const mode of ['globe','flat'])for(const year of [2024,1942])for(const zoom of [1,2.5]){
    AtlasUI.goToMap();setYear(year);await loadChunk(chunkOf(year));setMode(mode);stopSpin();zoomK=zoom;rot=[-25,-22,0];render();
    const visible=activeEvents().map(a=>a.e);
    check(visible.every(e=>DiscoveryCore.inYear(e,year)),'Strict event years '+year);
    if(year===2024){check(!visible.some(e=>['Artemis_II','James_Webb_Space_Telescope','Chandrayaan-3','Vera_C._Rubin_Observatory'].includes(e.wiki)),'No neighbouring milestones in 2024');check(visible.some(e=>e.wiki==='Russian_invasion_of_Ukraine'&&e.start===2022&&e.ongoing),'Continuing war is distinct from its onset')}
    const l=AtlasCartography.lastLayout;
    for(const [i,p]of l.placements.entries()){
     check(l.placements.slice(i+1).every(q=>!AtlasCartography.overlaps(p.box,q.box)),'Label collision '+year+' '+mode);
     check(l.controls.every(b=>!AtlasCartography.overlaps(p.box,b)),'Label under control '+year+' '+mode);
     check(l.countries.every(c=>!AtlasCartography.overlaps(p.box,c.box)),'Country/event overlap');
     check(p.lines.join(' ')===p.text,'Full event title preserved');
     check(l.markers.every(m=>!AtlasCartography.overlaps(p.box,m.box)),'Label covers a marker');
    }
    check(hits.filter(h=>!h.radius).every(h=>h.id.startsWith('p')||visible.some(e=>e.id===h.id)),'Hidden-label event markers remain dated');
    rot[0]+=50;render();check(AtlasCartography.lastLayout!==l,'Rotation recalculates labels');
   }
   AtlasUI.goToMap();setYear(2024);setMode('globe');stopSpin();zoomK=1;rot=[-25,-22,0];render();
   check(document.getElementById('readoutEra').textContent==='Era · 21st century','Era independent of border data');
   check(document.documentElement.scrollWidth<=innerWidth,'No page overflow');
   return 'PASS exact years and nonoverlapping full labels in globe/map at '+innerWidth+'px across current/conflict dates and two zooms';
  })()`));
  await shot(width+'-2024');
  await click('#editDate');
  assert(await evaluate('!document.getElementById("eraPanel").hidden&&document.activeElement.id==="exploreYearInput"'),'Entire year opens a focused chooser');
  assert(await evaluate('document.getElementById("editDate").getAttribute("aria-expanded")==="true"'),'Expanded state is announced');
  await shot(width+'-year-chooser');
  await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
  assert(await evaluate('document.getElementById("eraPanel").hidden&&document.activeElement.id==="editDate"'),'Escape restores the year trigger');
  await click('#editDate');await click(width>860?'#editDate':'.era-close');assert(await evaluate('document.getElementById("eraPanel").hidden'),'Visible dismissal closes chooser');
  await click('#editDate');await evaluate('document.getElementById("exploreYearInput").value="2022";document.querySelector(".explore-exact-year").requestSubmit()');
  assert(await evaluate('state.year===2022&&document.getElementById("eraPanel").hidden'),'Chooser visits the exact submitted year');
  await evaluate('setYear(2024);render();AtlasUI.goToEvents()');await shot(width+'-records');
 }
 await send('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});
 await evaluate('AtlasUI.goToMap();setYear(1942);setMode("globe");stopSpin();rot=[-25,-22,0];zoomK=1;render()');
 const hidden=await evaluate(`(()=>{const id=AtlasCartography.lastLayout.hidden.find(id=>hits.some(h=>h.id===id&&!h.radius));if(!id)return null;const h=hits.find(h=>h.id===id&&!h.radius),r=cv.getBoundingClientRect();return{id,x:h.x+r.left,y:h.y+r.top,title:byId[id].title}})()`);
 if(hidden){await send('Input.dispatchMouseEvent',{type:'mouseMoved',x:hidden.x,y:hidden.y});await new Promise(r=>setTimeout(r,100));assert(await evaluate(`document.getElementById('tip').textContent.includes(${JSON.stringify(hidden.title)})&&!document.getElementById('tip').hidden`),'Hover exposes the full hidden label');for(const type of ['mousePressed','mouseReleased'])await send('Input.dispatchMouseEvent',{type,x:hidden.x,y:hidden.y,button:'left',clickCount:1});assert.equal(await evaluate('state.sel'),hidden.id,'Hidden label marker opens its reader')}
 assert.equal(errors.length,0,JSON.stringify(errors));console.log('PASS real year clicks, keyboard focus, exact entry, hidden-label hover and selection; no browser errors.');
}finally{await send('Page.close').catch(()=>{});ws.close();}
