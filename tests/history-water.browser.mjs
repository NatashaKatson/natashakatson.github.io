// Run with the isolated Chrome/static server documented in docs/history-discovery.md.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const cdp = process.env.ATLAS_CDP_URL || 'http://127.0.0.1:9231';
const url = process.env.ATLAS_TEST_URL || 'http://127.0.0.1:8891/atlas/';
const page = await (await fetch(cdp + '/json/new?about:blank', { method: 'PUT' })).json();
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((resolve, reject) => { ws.addEventListener('open', resolve, { once: true }); ws.addEventListener('error', reject, { once: true }); });
let id = 0;
const pending = new Map(), paused = new Map(), errors = [];
const keepAlive = setInterval(() => {}, 1000);
ws.addEventListener('message', ({ data }) => {
  const msg = JSON.parse(data);
  if (msg.method === 'Runtime.exceptionThrown') errors.push(msg.params.exceptionDetails);
  if (msg.method === 'Fetch.requestPaused') paused.set(msg.params.requestId, msg.params.request.url);
  const call = pending.get(msg.id);
  if (!call) return;
  pending.delete(msg.id); clearTimeout(call.timeout);
  msg.error ? call.reject(Error(JSON.stringify(msg.error))) : call.resolve(msg.result);
});
const send = (method, params = {}) => new Promise((resolve, reject) => {
  const call = ++id;
  const timeout = setTimeout(() => { pending.delete(call); reject(Error('CDP timed out: ' + method)); }, 20000);
  pending.set(call, { resolve, reject, timeout });
  ws.send(JSON.stringify({ id: call, method, params }));
});
const evaluate = async (expression) => {
  const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (result.exceptionDetails) throw Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
  return result.result.value;
};
const waitFor = async (check, message) => {
  for (let i = 0; i < 100; i++) {
    if (await check()) return;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw Error(message);
};


try {
  await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
  await send('Page.navigate',{url:url+'#1950'});
  await waitFor(()=>evaluate('!!window.HistoryDiscovery && !!window.AtlasUI && W===stage.clientWidth && H===stage.clientHeight'),'Atlas workspace did not settle');
  await evaluate('document.fonts.ready');
  console.log(await evaluate(`(async()=>{
    const assert=(v,m)=>{if(!v)throw Error(m)};
    stopSpin();flyToken++;await loadChunk(1950);setYear(1950);setMode('globe');
    const soviet=polities().find(f=>f.name==='Union of Soviet Socialist Republics');
    const original=JSON.stringify(soviet.geometry);
    const holes=HistoryWater.scene(polities()).holes.filter(h=>h.polity===soviet);
    for(const name of ['Aral Sea','Lake Balkhash','Issyk-Kul','Lake Baikal']){
      const lake=holes.find(h=>h.properties.name===name);assert(lake,'recognized historical water hole: '+name);
      const point=lake.point;
      assert(!d3.geoContains(soviet,point),'source water cutout is preserved: '+name);
      assert(d3.geoContains(HistoryWater.outline(soviet),point),'water shore omitted from political strokes: '+name);
      for(const mode of ['globe','flat']){
        setMode(mode);rot=[-point[0],-point[1],0];zoomK=6;makeProj();render();
        if(mode==='flat'){const p=proj(point);flatT.x+=W/2-p[0];flatT.y+=H/2-p[1];makeProj();render();}
        const hit=mapAtYear(...proj(point));
        assert(hit?.water&&hit.polity===soviet&&hit.label.includes(name)&&hit.label.includes('Surrounded by mapped'),
          'lake hover keeps the enclosing political context: '+name+'/'+mode);
        HistoryDiscovery.selectWater(point,1950,soviet);render();
        const textMethods=[ctx.fillText,ctx.strokeText],labels=[];
        ctx.fillText=function(text,...args){labels.push(text);return textMethods[0].call(this,text,...args)};render();
        assert(labels.includes(name),'lake name is visible at regional zoom: '+name+'/'+mode);
        try{
          ctx.fillText=()=>{};ctx.strokeText=()=>{};render();
          const p=proj(point),pixel=ctx.getImageData(Math.round(p[0]*DPR),Math.round(p[1]*DPR),1,1).data;
          assert(pixel[2]-pixel[0]>20,'lake interior is blue: '+name+'/'+mode);
        }finally{[ctx.fillText,ctx.strokeText]=textMethods;render();}
        const detail=document.querySelector('.water-context');
        assert(detail.textContent.includes(name)&&detail.textContent.includes(soviet.name),'lake and country shown in details');
        detail.querySelector('details').open=true;
        assert(detail.textContent.includes('not a dated shoreline survey'),'generalized shoreline is disclosed');
      }
    }
    assert(JSON.stringify(soviet.geometry)===original,'display helpers never change country containment geometry');
    const lake=holes.find(h=>h.properties.name==='Lake Balkhash');
    HistoryDiscovery.selectWater(lake.point,1950,soviet);
    const shared=HistoryDiscovery.urlHash();setYear(2024);await HistoryDiscovery.openView(shared);
    assert(document.querySelector('.water-context')?.textContent.includes('Lake Balkhash'),'shared lake retains its card');
    await loadChunk(2000);setYear(2024);renderDetail();
    assert(!document.querySelector('.water-context')?.textContent.includes('Soviet'),'changing year does not retain stale country context');
    await HistoryDiscovery.openView(shared);
    document.querySelector('#detail .close').click();assert(!document.querySelector('.water-context'),'close clears lake selection');
    await loadChunk(2000);setYear(2024);render();
    for(const [point,name] of [[[-87,44],'United States of America'],[[-87,48],'Canada']]){
      const hit=waterAtYear(point);assert(hit?.polity?.name===name,'shared-lake boundaries retain their actual mapped side');
      assert(hit.relationship.startsWith('Within mapped'),'explicit political water coverage is distinguished from enclosure');
    }
    assert(!waterAtYear([28.3,-29.6]),'Lesotho is land, not an inferred lake');
    const southAfrica=polities().find(f=>/South Africa/.test(f.name));
    assert(southAfrica&&!d3.geoContains(HistoryWater.outline(southAfrica),[28.3,-29.6]),'enclave boundary is preserved');
    assert(!HistoryWater.scene().features.some(f=>f.properties.reservoir),'undated reservoirs are absent from reference views');
    for(const borders of ['today','off']){
      state.borders=borders;setMode('flat');render();
      const hit=waterAtYear([77.56,42.45]);assert(hit?.water,'water remains identifiable with borders '+borders);
      assert(!hit.polity||!hit.polity.name,'no historical ownership inferred from a modern boundary or hidden layer');
    }
    state.borders='history';await loadChunk(1950);setYear(1950);
    document.getElementById('compareToggle').click();document.getElementById('compareYears').elements.left.value='2024';
    document.getElementById('compareYears').requestSubmit();await loadChunk(2000);render();
    setMode('globe');rot=[-75,-46,0];zoomK=6;makeProj();render();
    const point=HistoryWater.scene(polities()).holes.find(h=>h.properties.name==='Lake Balkhash').point;
    const p=proj(point);window.waterTestPoint=point;
    const right=HistoryDiscovery.mapAt(W*.75,p[1],()=>waterAtYear(point));
    const left=HistoryDiscovery.mapAt(W*.25,p[1],()=>waterAtYear(point));
    assert(right?.year===1950&&right.label.includes('Soviet'),'right comparison uses its historical country');
    assert(left?.year===2024&&!left.label.includes('Soviet'),'left comparison does not reuse the right country');
    document.getElementById('compareToggle').click();
    setYear(-148500000);render();
    assert(!waterAtYear(point)&&document.querySelector('.water-key').hidden,'deep time excludes modern inland water');
    setYear(1950);await loadChunk(1950);setMode('globe');rot=[-67,-47,0];zoomK=6;makeProj();render();
    const f=polities().find(f=>f.name==='Union of Soviet Socialist Republics');
    const l=HistoryWater.scene(polities()).holes.find(h=>h.properties.name==='Lake Balkhash');
    HistoryDiscovery.selectWater(l.point,1950,f);render();
    return 'Water: blue fills, named historical cutouts, enclosing-country context, unchanged geography, shared views, cross-border lakes, enclaves, comparison and deep-time checks passed';
  })()`));
  let shot=await send('Page.captureScreenshot',{format:'png'});
  fs.writeFileSync(path.join(os.tmpdir(),'history-water-ui-desktop.png'),Buffer.from(shot.data,'base64'));
  await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
  await evaluate('AtlasUI.goToMap()');
  await waitFor(()=>evaluate('W===stage.clientWidth && H===stage.clientHeight'),'Mobile canvas did not settle');
  const point=await evaluate(`(()=>{document.querySelector('#detail .close').click();setMode('globe');rot=[-74.05,-45.93,0];zoomK=6;makeProj();render();stage.scrollIntoView({block:'start',behavior:'instant'});const r=cv.getBoundingClientRect(),p=proj(waterTestPoint);return [r.left+p[0],r.top+p[1]]})()`);
  await send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:point[0],y:point[1]}]});
  await send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await waitFor(()=>evaluate(`document.querySelector('.water-context')?.textContent.includes('Lake Balkhash')`),'touch lake selection failed');
  console.log(await evaluate(`(()=>{if(document.documentElement.scrollWidth>innerWidth+1)throw Error('mobile overflow');const card=document.querySelector('.water-context');card.scrollIntoView({block:'center',behavior:'instant'});return 'Water: touch lake selection, readable country card and 390px layout passed'})()`));
  shot=await send('Page.captureScreenshot',{format:'png'});
  fs.writeFileSync(path.join(os.tmpdir(),'history-water-ui-mobile.png'),Buffer.from(shot.data,'base64'));
  assert.equal(errors.length,0,JSON.stringify(errors));
} finally {
  clearInterval(keepAlive);await fetch(cdp+'/json/close/'+page.id);ws.close();
}
