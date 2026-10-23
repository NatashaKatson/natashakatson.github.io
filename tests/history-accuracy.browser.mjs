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
    await loadChunk(2000);setYear(2000);render();
    const uk=polities().find(f=>f.name==='United Kingdom');
    assert(uk&&!d3.geoContains(uk,[54.5,24.4])&&!d3.geoContains(uk,[51.3,25.3])&&!d3.geoContains(uk,[50.55,26.1]),'UK excludes the independent UAE, Qatar and Bahrain');
    for(const mode of ['globe','flat']){
      setMode(mode);stopSpin();rot=[110,-49,0];zoomK=2.5;
      for(const year of [1950,1980,2014,2024,2026]){
        await loadChunk(chunkOf(year));setYear(year);render();
        const active=polities(),us=active.find(f=>f.name==='United States of America'),canada=active.find(f=>f.name==='Canada');
        assert(us&&canada,'North American states available in '+year);
        assert(us.hue!==canada.hue,'neighbouring US and Canada have distinct territory colours');
        for(const lon of [-122,-120,-115,-110,-105,-100,-96]){
          for(const [lat,own,other] of [[49.005,canada,us],[48.995,us,canada]]){
            assert(d3.geoContains(own,[lon,lat])&&!d3.geoContains(other,[lon,lat]),'correct territory within 600 m of the parallel: '+year+'/'+mode+'/'+lon+'/'+lat);
            assert(mapAtYear(...proj([lon,lat]))?.polity.name===own.name,'hover agrees with the corrected parallel: '+year+'/'+mode+'/'+lon+'/'+lat);
          }
        }
        if(mode==='globe'){
          const pixel=lat=>{const [x,y]=proj([-110,lat]);return ctx.getImageData(Math.round(x*DPR),Math.round(y*DPR),1,1).data};
          const north=pixel(49.5),south=pixel(48.5);
          assert(north.slice(0,3).some((v,i)=>Math.abs(v-south[i])>20),'rendered fills visibly distinguish Canada from the US');
        }
      }
    }
    // Lake shorelines are water outlines, not international boundaries.
    // The former archive polygons missed these shore cities and all lake water.
    const lakePoints=[
      ['Chicago',-87.63,41.88,'United States of America'],['Detroit',-83.05,42.33,'United States of America'],
      ['Windsor',-83.02,42.3,'Canada'],['Toronto',-79.38,43.65,'Canada'],['Buffalo',-78.88,42.89,'United States of America'],
      ['Lake Michigan',-87,44,'United States of America'],
      ['Lake Superior south',-88.5,47.5,'United States of America'],['Lake Superior north',-87,48,'Canada'],
      ['Lake Huron west',-82.6,44.5,'United States of America'],['Lake Huron east',-81.5,44.8,'Canada'],
      ['Lake Erie south',-81,42,'United States of America'],['Lake Erie north',-81,42.4,'Canada'],
      ['Lake Ontario south',-77.8,43.5,'United States of America'],['Lake Ontario north',-78,43.7,'Canada'],
    ];
    for(const mode of ['globe','flat']){
      setMode(mode);stopSpin();rot=[84,-44,0];zoomK=6;
      for(const year of [1932,1950,1980,2024,2026]){
        await loadChunk(chunkOf(year));setYear(year);render();
        const active=polities();
        for(const [name,lon,lat,country] of lakePoints){
          const owners=active.filter(f=>d3.geoContains(f,[lon,lat]));
          assert(owners.length===1&&owners[0].name===country,'Great Lakes ownership: '+year+'/'+mode+'/'+name);
          assert(mapAtYear(...proj([lon,lat]))?.polity.name===country,'Great Lakes hover: '+year+'/'+mode+'/'+name);
        }
      }
    }
    setMode('globe');stopSpin();rot=[84,-44,0];zoomK=6;render();
    const paint=point=>{const [x,y]=proj(point);return [...ctx.getImageData(Math.round(x*DPR),Math.round(y*DPR),1,1).data]};
    for(const point of [[-87,44],[-88.5,47.5],[-87,48],[-82.6,44.5],[-81.5,44.8],[-81,42],[-81,42.4],[-77.8,43.5],[-78,43.7]]){
      assert(d3.geoContains(HistoryGreatLakes.lakes,point),'sample lies in a water polygon: '+point);
      const water=paint(point),land=paint([-85,43]);
      assert(water.slice(0,3).some((v,i)=>Math.abs(v-land[i])>30),'lake is painted as water on both sides of the border: '+point);
    }
    const modern=ctx.getImageData(0,0,cv.width,cv.height).data.slice();
    const prior=state.borders;state.borders='off';render();
    for(const point of [[-87,44],[-88.5,47.5],[-81,42],[-78,43.7]]){
      const [x,y]=proj(point),offset=(Math.round(y*DPR)*cv.width+Math.round(x*DPR))*4,off=paint(point);
      assert(off.slice(0,3).every((v,i)=>Math.abs(v-modern[offset+i])<=2),'water stays water when borders are hidden');
    }
    state.borders=prior;render();
    setMode('flat');
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
    return 'Historical accuracy: US–Canada parallel within 600 m, distinct rendered fills and hover in both projections (1950–2026), Crimea occupation (2014–2026), aggregate selection/sharing, Algeria paint order and sourced event details passed';
  })()`));
  assert.equal(errors.length,0,JSON.stringify(errors));
  await evaluate(`(async()=>{await loadChunk(2000);setYear(2026);setMode('globe');stopSpin();rot=[84,-44,0];zoomK=6;render()})()`);
  const screenshot=await send('Page.captureScreenshot',{format:'png'});
  const screenshotPath=path.join(os.tmpdir(),'history-great-lakes-border.png');
  fs.writeFileSync(screenshotPath,Buffer.from(screenshot.data,'base64'));
  console.log('Great Lakes boundary, lake water and shore-city regressions passed; screenshot: '+screenshotPath);
} finally {
  clearInterval(keepAlive);
  await send('Target.closeTarget',{targetId:page.id});ws.close();
}
