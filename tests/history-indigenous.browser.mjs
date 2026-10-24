// Dedicated Chrome/static server: see docs/history-discovery.md.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
const cdp=process.env.ATLAS_CDP_URL||'http://127.0.0.1:9242';
const url=process.env.ATLAS_TEST_URL||'http://127.0.0.1:8876/atlas/';
const page=await(await fetch(cdp+'/json/new?about:blank',{method:'PUT'})).json();
const ws=new WebSocket(page.webSocketDebuggerUrl);
await new Promise((resolve,reject)=>{ws.addEventListener('open',resolve,{once:true});ws.addEventListener('error',reject,{once:true});});
let id=0;const pending=new Map(),errors=[];
ws.addEventListener('message',({data})=>{
  const msg=JSON.parse(data);if(msg.method==='Runtime.exceptionThrown')errors.push(msg.params.exceptionDetails);
  const call=pending.get(msg.id);if(!call)return;pending.delete(msg.id);clearTimeout(call.timer);
  msg.error?call.reject(Error(JSON.stringify(msg.error))):call.resolve(msg.result);
});
const send=(method,params={})=>new Promise((resolve,reject)=>{
  const call=++id,timer=setTimeout(()=>{pending.delete(call);reject(Error('CDP timeout: '+method));},20000);
  pending.set(call,{resolve,reject,timer});ws.send(JSON.stringify({id:call,method,params}));
});
const evaluate=async(expression)=>{
  const r=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});
  if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);
  return r.result.value;
};
const waitFor=async(expression)=>{for(let i=0;i<100;i++){if(await evaluate(expression))return;await new Promise(r=>setTimeout(r,100));}throw Error('Not ready: '+expression);};
try{
  await send('Runtime.enable');await send('Network.enable');await send('Network.setCacheDisabled',{cacheDisabled:true});
  await send('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
  await send('Page.navigate',{url:url+'#1700'});await waitFor('!!window.HistoryDiscovery&&!!window.PopulationTimeline');
  console.log(await evaluate(`(async()=>{
    const assert=(v,m)=>{if(!v)throw Error(m)};
    stopSpin();userMoved=true;flyToken++;
    for(const id of ['indigenous-north-america','indigenous-world','beringia-evidence'])assert(document.querySelector('[data-discovery="'+id+'"]'),'visible discovery '+id);
    await loadChunk(chunkOf(500));setYear(500);rot=[123.196,-49.228,0];zoomK=2.5;
    const drawn=[],original=ctx.fillText;
    try{ctx.fillText=function(t,...a){drawn.push(t);return original.call(this,t,...a)};render();}finally{ctx.fillText=original;}
    const musqueam=ev.find(r=>r.wiki==='Musqueam_Indian_Band');
    assert(drawn.includes('Musqueam')&&hits.some(h=>h.id===musqueam.id),'Musqueam movement visible at its approximate event date');
    select(musqueam.id,false);render();
    assert(document.querySelector('.indigenous-context a[href*="musqueam.bc.ca"]'),'own territory reference');
    const cherokee=ev.find(r=>r.wiki==='Cherokee_Nation');
    setYear(1956);render();
    assert(!activeEvents().some(({e})=>e===cherokee||e===musqueam),'old milestones are absent in 1956');
    assert(!document.querySelector('#regions [data-id="'+cherokee.id+'"]'),'unrelated Cherokee record absent from sidebar');
    assert(activeEvents().some(({e})=>e.wiki==='Saami_Council'),'1956 Saami Council founding remains relevant');
    select(cherokee.id,false);render();
    assert(state.year===1839&&document.querySelector('#detail .kicker').textContent.includes('1839'),'selecting Cherokee from another date visits 1839');
    assert(!document.querySelector('.timeline-context-note'),'constitution is a dated event, not continuing context');
    document.querySelector('#detail .close').click();
    setYear(1956);render();
    assert(!activeEvents().some(({e})=>e===cherokee),'moving the slider leaves the constitution behind');
    const shelf=document.querySelector('.curated-discoveries');
    shelf.querySelector('[data-discovery="indigenous-world"]').click();
    const story=CuratedDiscoveries.find(s=>s.id==='indigenous-world');
    for(let i=0;i<story.stops.length;i++){
      shelf.querySelector('[data-curated-stop="'+i+'"]').click();render();
      const stop=story.stops[i],record=ev.find(r=>r.title===stop.title);
      assert(state.year===stop.year&&hits.some(h=>h.id===record.id),'dated world marker '+stop.id);
      assert(shelf.querySelector('.curated-stop a').href===record.source,'source for '+stop.id);
    }
    shelf.querySelector('[data-curated-close]').click();
    document.dispatchEvent(new KeyboardEvent('keydown',{key:'k',ctrlKey:true,bubbles:true}));
    const input=document.getElementById('historySearchInput');input.value='Indigenous Russia';input.dispatchEvent(new Event('input',{bubbles:true}));
    return 'Indigenous world tours, dated map markers and community source links passed';
  })()`));
  await waitFor("document.getElementById('historySearchResults').textContent.includes('Sakha')");
  assert((await evaluate("document.getElementById('historySearchResults').textContent")).includes('Chukchi'));
  await evaluate("document.querySelector('[data-search-close]').click();document.querySelector('[data-discovery=\"beringia-evidence\"]').click();render()");
  console.log(await evaluate(`(()=>{
    const assert=(v,m)=>{if(!v)throw Error(m)};
    assert(HistoryDiscovery.evidenceView()&&!document.querySelector('.beringia-key').hidden,'evidence legend visible');
    assert(hits.filter(h=>h.label.includes('dated evidence; route unknown')).length===4,'four dated evidence sites in globe overview');
    assert(document.querySelector('.curated-reader').textContent.includes('White Sands is older'),'chronology limitation visible');
    window.indigenousSaved=HistoryDiscovery.urlHash();
    setMode('flat');makeProj();render();
    assert(HistoryDiscovery.evidenceView(),'evidence view works in flat projection');
    setYear(1700);render();assert(!HistoryDiscovery.evidenceView()&&document.querySelector('.beringia-key').hidden,'moving to a different year hides research overlay');
    return 'Beringia evidence sites, globe/flat views and time boundaries passed';
  })()`));
  await evaluate('HistoryDiscovery.openView(indigenousSaved)');
  const desktop=await send('Page.captureScreenshot',{format:'png'});
  fs.writeFileSync(path.join(os.tmpdir(),'history-beringia-desktop.png'),Buffer.from(desktop.data,'base64'));
  const saved=await evaluate('HistoryDiscovery.urlHash()');
  await send('Page.navigate',{url:url+saved});await waitFor('!!window.HistoryDiscovery&&HistoryDiscovery.evidenceView()');
  await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
  await evaluate('resize();render()');
  assert(await evaluate('document.documentElement.scrollWidth<=innerWidth+1'),'mobile page fits viewport');
  assert(await evaluate("!document.querySelector('.beringia-key').hidden"),'mobile evidence legend visible');
  const mobile=await send('Page.captureScreenshot',{format:'png'});
  fs.writeFileSync(path.join(os.tmpdir(),'history-beringia-mobile.png'),Buffer.from(mobile.data,'base64'));
  assert.equal(errors.length,0,JSON.stringify(errors));
  console.log('Search, exact-view reload and 390px mobile layout passed; screenshots: '+os.tmpdir());
}finally{await send('Target.closeTarget',{targetId:page.id});ws.close();}
