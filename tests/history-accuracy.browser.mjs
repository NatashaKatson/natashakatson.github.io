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
  await send('Runtime.enable');await send('Network.enable');await send('Network.setCacheDisabled',{cacheDisabled:true});
  await send('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
  await send('Page.navigate',{url:url+'#1980'});
  await waitFor(()=>evaluate('!!window.HistoryDiscovery'),'Atlas did not load');
  console.log(await evaluate(`(async()=>{
    const assert=(v,m)=>{if(!v)throw Error(m)};
    stopSpin();flyToken++;
    const rows=(await(await fetch('search-states.json')).json()).rows;
    for(const [name,year] of [['Netherlands',1917],['Dutch Republic',1769],['Spanish Empire',1877]]){
      const candidates=rows.filter(r=>r[0]===name&&r[1]<=year&&r[2]>=year);
      assert(candidates.length>=2,'expected aggregate and constituent candidates');
      for(const r of candidates){
        await HistoryDiscovery.jumpSearch({kind:'state',title:r[0],year,lon:r[4],lat:r[5],member:r[7]});
        render();
        const shown=polities().find(f=>samePolity(f,selectedPolity));
        assert(shown&&shown.member===r[7],'search selection is actually drawn: '+name+'/'+r[7]);
        const saved=HistoryDiscovery.urlHash();
        assert(JSON.parse(new URLSearchParams(saved.slice(1)).get('view')).polityMember===r[7],'share stores political membership');
        const expected=selectedPolity.member;
        setYear(1453);await HistoryDiscovery.openView(saved);render();
        assert(selectedPolity?.member===expected&&polities().some(f=>samePolity(f,selectedPolity)),'shared view restores the same territorial record');
      }
    }
    await loadChunk(chunkOf(1980));setYear(1980);setMode('flat');render();
    const algeria=polities().find(f=>f.name==="People's Democratic Republic of Algeria");
    assert(algeria,'independent Algeria is mapped');
    const point=[3,28],pixel=proj(point);
    assert(mapAtYear(...pixel)?.polity.name===algeria.name,'Algeria hover does not claim France in 1980');
    const expected=document.createElement('canvas');expected.width=expected.height=1;const ec=expected.getContext('2d');
    ec.fillStyle=C.land;ec.fillRect(0,0,1,1);
    for(const f of polities().filter(f=>d3.geoContains(f,point))){ec.fillStyle=STATE_FILLS[f.hue];ec.fillRect(0,0,1,1)}
    const a=ctx.getImageData(Math.round(pixel[0]*DPR),Math.round(pixel[1]*DPR),1,1).data,b=ec.getImageData(0,0,1,1).data;
    assert([...a].every((v,i)=>Math.abs(v-b[i])<=3),'territory fill agrees with area-ordered hover identity');
    assert(!d3.geoContains(polities().find(f=>f.name==='French Fifth Republic'),point),'France geometry excludes independent Algeria');
    for(const year of [2013,2014,2023,2024,2026]){
      await loadChunk(chunkOf(year));setYear(year);render();
      const crimeaPoint=[34.1,45.3],active=polities(),region=active.find(f=>f.name==='Crimea (occupied by Russia)');
      assert(!!region===(year>=2014),'occupation label starts in 2014');
      assert(active.filter(f=>f.name==='Russian Federation').every(f=>!d3.geoContains(f,crimeaPoint)),'Russia geometry excludes Crimea');
      assert(d3.geoContains(active.find(f=>f.name==='Ukraine'),crimeaPoint),'recognized Ukraine includes Crimea');
      assert(mapAtYear(...proj(crimeaPoint))?.polity.name===(year>=2014?'Crimea (occupied by Russia)':'Ukraine'),'Crimea hover agrees with the year');
      if(region){
        await HistoryDiscovery.jumpSearch({kind:'state',title:region.name,year,lon:34.1,lat:45.3,member:'Ukraine'});render();
        assert(selectedPolity?.name===region.name&&selectedPolity.member==='Ukraine','Crimea search selects occupation record');
        assert(document.getElementById('detail').textContent.includes('Ukrainian territory occupied by Russia'),'Crimea details explain occupation');
        assert(document.querySelector('#detail a[href*="mandates.un.org"]'),'Crimea cites the UN');
        const saved=HistoryDiscovery.urlHash();setYear(2013);await HistoryDiscovery.openView(saved);render();
        assert(selectedPolity?.name===region.name&&selectedPolity.member==='Ukraine','Crimea shared view restores occupation label');
      }
    }
    const holocaust=ev.find(e=>e.wiki==='The_Holocaust');setYear(1935);assert(activeEvents().some(a=>a.e.id===holocaust.id),'Holocaust visible before 1941');
    select(holocaust.id,false);render();assert(document.querySelector('#detail a[href*="ushmm.org"]'),'Holocaust cites museum source');
    const covid=ev.find(e=>e.wiki==='COVID-19_pandemic');setYear(2023);select(covid.id,false);render();
    assert(document.getElementById('detail').textContent.includes('emergency'),'COVID date range is labeled as emergency status');
    return 'Historical accuracy: aggregate/constituent selection and sharing, independent Algeria, paint order and corrected event details passed';
  })()`));
  assert.equal(errors.length,0,JSON.stringify(errors));
} finally {
  clearInterval(keepAlive);
  await send('Target.closeTarget',{targetId:page.id});ws.close();
}
