// Read-only map audit. Run with the isolated browser/server described in docs/history-map-audit.md.
const cdpURL = process.env.ATLAS_CDP_URL || "http://127.0.0.1:9231";
const page = await (
  await fetch(cdpURL + "/json/new?about:blank", { method: "PUT" })
).json();
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  ws.addEventListener("open", resolve, { once: true });
  ws.addEventListener("error", reject, { once: true });
});

let id = 0;
const pending = new Map();
ws.addEventListener("message", (event) => {
  const msg = JSON.parse(event.data);
  if (!msg.id || !pending.has(msg.id)) return;
  const { resolve, reject } = pending.get(msg.id);
  pending.delete(msg.id);
  msg.error
    ? reject(new Error(JSON.stringify(msg.error)))
    : resolve(msg.result);
});
ws.addEventListener("close", () => {
  for (const { reject } of pending.values()) reject(new Error("The audit browser disconnected."));
  pending.clear();
});
const send = (method, params = {}) =>
  new Promise((resolve, reject) => {
    const callId = ++id;
    pending.set(callId, { resolve, reject });
    ws.send(JSON.stringify({ id: callId, method, params }));
  });
const evaluate = async (expression) => {
  const result = await send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  if (result.exceptionDetails)
    throw new Error(
      result.exceptionDetails.exception?.description ||
        result.exceptionDetails.text,
    );
  return result.result.value;
};


import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
const output = process.env.ATLAS_AUDIT_OUTPUT || path.join(os.tmpdir(), 'history-country-audit.json');
const skipRender = process.argv.includes('--skip-render');
try {
await send('Runtime.enable');
await send('Network.enable');
await send('Network.setCacheDisabled',{cacheDisabled:true});
await send('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
await send('Page.navigate',{url:(process.env.ATLAS_TEST_URL || 'http://127.0.0.1:8891/atlas/')+'#2026'});
for(let i=0;i<100;i++){if(await evaluate('!!window.HistoryDiscovery && !!window.PopulationTimeline'))break;await new Promise(r=>setTimeout(r,100));}
console.log('Auditing map data'+(skipRender?'':' and rendering all historical search destinations')+'…');
const audit=await evaluate(`(async()=>{
stopSpin();
const high=world(await(await fetch('land-50m.json')).json());
const states=(await(await fetch('search-states.json')).json()).rows;
const results={stateRows:states.length,chunks:BIDX.chunks.length,countries:[],missingCountrySearch:high.countries.filter(f=>!lo.countries.some(g=>g.properties.name===f.properties.name)).map(f=>f.properties.name),badStateAnchors:[],shadowedStateRows:[],modernLabels:[],versions:0,historicalLabels:[],coarseCountryAnchors:[]};
const allFeatures=new Map();
for(const chunk of BIDX.chunks){
 const t=await(await fetch('borders/c'+chunk+'.json')).json();
 const fs=topojson.feature(t,t.objects.p).features;
 for(const f of fs){const p=f.properties;f.name=unparen(p.n);f.member=unparen(p.m);f.from=p.f;f.to=p.t;f.area=p.a;f.cen=[p.lx,p.ly];f.bbox=d3.geoBounds(f);f.hue=hueOf(f.name);f.shapeKey=JSON.stringify(f.geometry);}
 allFeatures.set(chunk,fs);
}
const unique=new Map();for(const fs of allFeatures.values())for(const f of fs)unique.set([f.properties.n,f.member,f.from,f.to].join('|'),f);
results.versions=unique.size;
for(const f of unique.values())if(!d3.geoContains(f,f.cen))results.badStateAnchors.push({name:f.name,from:f.from,to:f.to,point:f.cen,area:f.area,member:f.member});
for(const [name,from,to,year,lon,lat,wiki,member] of states){
 const active=DiscoveryCore.active(allFeatures.get(chunkOf(year)),year);
 const shown=active.find(f=>f.name===name),target=allFeatures.get(chunkOf(year)).find(f=>f.name===name&&f.member===member&&f.from<=year&&f.to>=year);
 if(shown&&target&&shown!==target&&JSON.stringify(shown.geometry)!==JSON.stringify(target.geometry))results.shadowedStateRows.push({name,year,point:[lon,lat],member,shownMember:shown.member,shownArea:shown.area,targetArea:target.area});
}
for(const f of lo.countries){const point=d3.geoCentroid(f);if(!d3.geoContains(f,point))results.coarseCountryAnchors.push({name:f.properties.name,point});}
if(!${skipRender}) for(const [name,from,to,year,lon,lat,wiki,member] of states){
 const fs=allFeatures.get(chunkOf(year)),target=fs.find(f=>f.name===name&&f.member===member&&f.from<=year&&f.to>=year);
 bCache.set(chunkOf(year),fs);polCache={y:null,list:[]};state.year=year;selectedPolity=target;rot=[-lon,-lat,0];zoomK=1.6;
 const names=[],old=ctx.fillText;
 try{ctx.fillText=function(t,...a){names.push(t);return old.call(this,t,...a)};render();}finally{ctx.fillText=old;}
 if(!names.includes(name))results.historicalLabels.push({name,year,point:[lon,lat],member,visibleSameName:polities().filter(f=>f.name===name).map(f=>({member:f.member,point:f.cen}))});
}
const boundaryDistance=(f,point)=>{
 const rings=f.geometry.type==='Polygon'?f.geometry.coordinates:f.geometry.coordinates.flat();
 let min=Infinity;const cos=Math.cos(point[1]*Math.PI/180),wrap=x=>((x+540)%360)-180;
 for(const ring of rings)for(let i=1;i<ring.length;i++){
  const a=ring[i-1],b=ring[i],ax=wrap(a[0]-point[0])*cos,ay=a[1]-point[1],dx=wrap(b[0]-a[0])*cos,dy=b[1]-a[1];
  const t=Math.max(0,Math.min(1,-(ax*dx+ay*dy)/(dx*dx+dy*dy||1)));
  min=Math.min(min,Math.hypot(ax+t*dx,ay+t*dy)*111.195);
 }return min;
};
const assignRecord=r=>{
 const point=[r.lon,r.lat],inside=high.countries.find(f=>d3.geoContains(f,point));
 if(inside)return inside.properties.name;
 let near=null,km=25;
 for(const f of high.countries){const distance=boundaryDistance(f,point);if(distance<km){km=distance;near=f.properties.name;}}
 return near;
};
const eventCountries=ev.filter(e=>e.cat!=='dinosaurs').map(assignRecord),peopleCountries=ppl.map(assignRecord);
for(const f of high.countries){
 const name=f.properties.name,point=d3.geoCentroid(f);
 results.countries.push({name,point,centroidInside:d3.geoContains(f,point),events:eventCountries.filter(n=>n===name).length,people:peopleCountries.filter(n=>n===name).length,searchableCountry:lo.countries.some(g=>g.properties.name===name)});
}
await loadChunk(2000);setYear(2026);
const original=ctx.fillText;
if(!${skipRender}) for(const f of polities()){
 const names=[];rot=[-f.cen[0],-f.cen[1],0];zoomK=1.6;selectedPolity=f;
 try{ctx.fillText=function(t,...a){names.push(t);return original.call(this,t,...a)};render();}finally{ctx.fillText=original;}
 results.modernLabels.push({name:f.name,shown:names.includes(f.name),area:f.area,point:f.cen});
}
return results;
})()`);
fs.writeFileSync(output,JSON.stringify(audit,null,2)+'\n');
console.log(JSON.stringify({
  countriesAndTerritories: audit.countries.length,
  historicalSearchRows: audit.stateRows,
  historicalChunks: audit.chunks,
  missingCountrySearchEntries: audit.missingCountrySearch.length,
  countrySearchAnchorsOutsideGeometry: audit.coarseCountryAnchors.length,
  historicalVersions: audit.versions,
  historicalAnchorsOutsideGeometry: audit.badStateAnchors.length,
  shadowedHistoricalSearchRows: audit.shadowedStateRows.length,
  missingHistoricalSearchLabels: skipRender ? null : audit.historicalLabels.length,
  missingCurrentSelectedLabels: skipRender ? null : audit.modernLabels.filter(r=>!r.shown).length,
  entriesWithoutHumanMarkers: audit.countries.filter(r=>!r.events&&!r.people).length,
  output,
}, null, 2));
} finally {
  await send('Target.closeTarget',{targetId:page.id});
  ws.close();
}
