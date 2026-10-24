// Run against a dedicated QA Chrome instance. Each run owns a fresh page.
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

await send("Runtime.enable");
const errors = [];
ws.addEventListener("message", (e) => {
  const m = JSON.parse(e.data);
  if (m.method === "Runtime.exceptionThrown")
    errors.push(m.params.exceptionDetails);
});
await send("Emulation.setDeviceMetricsOverride", {
  width: 1440,
  height: 1000,
  deviceScaleFactor: 1,
  mobile: false,
});
await send("Page.navigate", { url: "about:blank" });
await new Promise((r) => setTimeout(r, 100));
await send("Page.navigate", {
  url: (process.env.ATLAS_TEST_URL || "http://127.0.0.1:8891/atlas/") + "#1789",
});
await new Promise((r) => setTimeout(r, 2500));
console.log(await evaluate(`(async()=>{
const assert=(v,m)=>{if(!v)throw Error(m)};
assert(window.HistoryDiscovery,'Atlas loaded');stopSpin();
assert(!document.querySelector('.history-search-trigger'),'header search button removed');
assert(!performance.getEntriesByType('resource').some(r=>/search-(states|places).json/.test(r.name)),'indexes are lazy');
const originalFetch=window.fetch,indexLoads=new Map();
window.fetch=(url,...args)=>/^search-/.test(url)
 ? new Promise((resolve,reject)=>indexLoads.set(url,()=>originalFetch(url,...args).then(resolve,reject)))
 : originalFetch(url,...args);
document.dispatchEvent(new KeyboardEvent('keydown',{key:'k',ctrlKey:true,bubbles:true}));
assert(document.getElementById('historySearch').open,'search opens');
assert(document.activeElement.id==='historySearchInput','search receives focus');
const input=document.getElementById('historySearchInput');
input.value='Cleopatra';input.dispatchEvent(new Event('input',{bubbles:true}));
await new Promise(r=>setTimeout(r,160));
input.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowDown',bubbles:true}));
assert(document.activeElement.querySelector('strong')?.textContent==='Cleopatra','local result focused during download');
try {
 for(const url of ['search-states.json','search-places.json']){
  indexLoads.get(url)();
  for(let i=0;i<100;i++){
   await new Promise(r=>setTimeout(r,100));
   const status=document.getElementById('historySearchStatus').textContent;
   if(url==='search-states.json'?!status.includes('Loading states'):!status.includes('Loading'))break;
  }
  assert(document.activeElement.querySelector('strong')?.textContent==='Cleopatra','index update preserves focused record');
 }
}finally{window.fetch=originalFetch;}
input.value='Roman Empire';input.dispatchEvent(new Event('input',{bubbles:true}));
await new Promise(r=>setTimeout(r,160));
for(let i=0;i<100;i++){await new Promise(r=>setTimeout(r,100));if(!document.getElementById('historySearchStatus').textContent.includes('Loading'))break;}
assert(document.querySelector('[data-search-retry]').hidden,'both indexes loaded');
window.searchQuery=async(q,kind='all')=>{
 document.dispatchEvent(new KeyboardEvent('keydown',{key:'k',ctrlKey:true,bubbles:true}));
 document.querySelector('[data-search-kind="'+kind+'"]').click();
 input.value=q;input.dispatchEvent(new Event('input',{bubbles:true}));await new Promise(r=>setTimeout(r,160));
};
await searchQuery('Roman Empire','state');
const first=document.querySelector('[data-search-result]');
assert(first?.querySelector('strong').textContent==='Roman Empire','exact empire ranked first');
assert(first.textContent.includes('Mapped')&&first.textContent.includes('open'),'state dates visible');
input.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowDown',bubbles:true}));
assert(document.activeElement===first,'arrow focuses result');
first.click();
for(let i=0;i<100&&document.getElementById('historySearch').open;i++)await new Promise(r=>setTimeout(r,50));
assert(!document.getElementById('historySearch').open,'result closes dialog');
assert(selectedPolity?.name==='Roman Empire'&&state.year===117,'empire jumps to available greatest-extent snapshot');
assert(state.borders==='history'&&!HistoryDiscovery.isComparing(),'historical state shown at a single moment');
assert(polities().some(f=>f.name==='Roman Empire'),'historical geometry loaded');
document.querySelector('.story-trail button').click();assert(state.year===1789,'Back restores original year');
await searchQuery('Cleopatra','person');document.querySelector('[data-search-result]').click();await new Promise(r=>setTimeout(r,50));
assert(byId[state.sel]?.name.includes('Cleopatra')&&state.year===byId[state.sel].born,'person jumps to birth year');
await searchQuery('Pig War','event');state.cats.delete('war');document.querySelector('[data-search-result]').click();await new Promise(r=>setTimeout(r,50));
assert(byId[state.sel]?.wiki==='Pig_War_(1859)'&&state.year===1859&&state.cats.has('war'),'event jumps and enables hidden category');
const beforeYear=state.year;
await searchQuery('Vancouver','place');
const names=[...document.querySelectorAll('[data-search-result] strong')].map(e=>e.textContent);
assert(names.includes('Vancouver, British Columbia, Canada')&&names.includes('Vancouver, Washington, United States'),'duplicate cities distinguished');
[...document.querySelectorAll('[data-search-result]')].find(b=>b.querySelector('strong').textContent==='Vancouver, British Columbia, Canada').click();await new Promise(r=>setTimeout(r,50));
assert(state.year===beforeYear,'modern place keeps chosen year');
assert(document.querySelector('.search-place-detail h3').textContent==='Vancouver, British Columbia, Canada','city selection named');
assert(document.querySelector('.search-place-detail').textContent.includes('does not establish'),'historical settlement not implied');
const view=HistoryDiscovery.urlHash();setYear(1);await HistoryDiscovery.openView(view);
assert(state.year===beforeYear&&document.querySelector('.search-place-detail h3').textContent==='Vancouver, British Columbia, Canada','place share restores name and point');
await searchQuery('sao paulo','place');
assert(document.querySelector('[data-search-result] strong').textContent.includes('São Paulo'),'accent-insensitive city query');
await searchQuery('zzzz_no_such_history_123');assert(!document.querySelector('[data-search-result]'),'empty result state');
input.value='<img src=x onerror=alert(1)>';input.dispatchEvent(new Event('input',{bubbles:true}));await new Promise(r=>setTimeout(r,150));
assert(!document.querySelector('#historySearchResults img'),'query is never interpreted as markup');
document.querySelector('[data-search-close]').click();
assert(!document.getElementById('historySearch').contains(document.activeElement),'closing returns focus outside search');
return 'Search: lazy indexes, keyboard, dated empire, person/event jumps, filter reveal, Back, cities, aliases, sharing, empty results and safe text passed';
})()`));
console.log(await evaluate(`(async()=>{
const assert=(v,m)=>{if(!v)throw Error(m)};
for(const query of ['New France','Nouvelle-France','French Canada']){
 await searchQuery(query,'state');
 const first=document.querySelector('[data-search-result]');
 assert(first?.textContent.includes('open 1757'),'French Canada opens its Canadian snapshot');
 first.click();
 for(let i=0;i<100&&document.getElementById('historySearch').open;i++)await new Promise(r=>setTimeout(r,50));
 assert(selectedPolity?.name==='New France'&&state.year===1757,'New France selected in Canada');
 assert(d3.geoContains(selectedPolity,[-71.21,46.81]),'source geometry includes Quebec City');
}
window.assertNewFranceLabel=()=>{
 const labels=[],original=ctx.fillText;
 try{ctx.fillText=function(text,...args){labels.push(text);return original.call(this,text,...args)};render();}
 finally{ctx.fillText=original;}
 assert(labels.includes('New France'),'New France label is drawn at search zoom');
};
assertNewFranceLabel();
selectedPolity=null;render();assertNewFranceLabel();
for(const [query,year] of [['Champlain establishes Quebec',1608],['Ville-Marie',1642],['Great Peace',1701],['Plains of Abraham',1759],['France cedes Canada',1763],['Quebec Act',1774],['founding province',1867],['Charter of the French Language',1977]]){
 await searchQuery(query,'event');
 assert(document.querySelector('[data-search-result]'),'Quebec event is searchable: '+query);
 document.querySelector('[data-search-result]').click();await new Promise(r=>setTimeout(r,50));
 assert(state.year===year&&byId[state.sel]?.source,'event opens dated sourced history: '+query);
}
return 'Quebec: French Canada aliases, Canadian snapshot, visible territory label and eight sourced event jumps passed';
})()`));
console.log(await evaluate(`(async()=>{
const assert=(v,m)=>{if(!v)throw Error(m)};
await searchQuery('Ottoman Empire','state');
const original=loadChunk, previous=state.year;
const row=(await(await fetch('search-states.json')).json()).rows.find(r=>r[0]==='Ottoman Empire');
const data=await original(chunkOf(row[3]));
let resolveLoad;
try{
 loadChunk=()=>new Promise(resolve=>{resolveLoad=resolve});
 document.querySelector('[data-search-result]').click();
 const input=document.getElementById('historySearchInput');input.value='Cleopatra';input.dispatchEvent(new Event('input',{bubbles:true}));
 resolveLoad(data);await new Promise(r=>setTimeout(r,160));
 assert(state.year===previous&&document.getElementById('historySearch').open,'stale navigation canceled');
}finally{loadChunk=original;}
document.querySelector('[data-search-close]').click();
return 'Changing the query cancels a pending empire jump';
})()`));
await send('Page.reload',{ignoreCache:true});
await new Promise(r=>setTimeout(r,1800));
console.log(await evaluate(`(async()=>{
const assert=(v,m)=>{if(!v)throw Error(m)};
const original=window.fetch;
window.fetch=(url,...args)=>url==='search-places.json'?Promise.reject(new Error('Test city download failure')):original(url,...args);
document.dispatchEvent(new KeyboardEvent('keydown',{key:'k',ctrlKey:true,bubbles:true}));
const input=document.getElementById('historySearchInput');
input.value='Pig War';input.dispatchEvent(new Event('input',{bubbles:true}));
for(let i=0;i<80;i++){await new Promise(r=>setTimeout(r,100));if(!document.getElementById('historySearchStatus').textContent.includes('Loading'))break;}
assert(!document.querySelector('[data-search-retry]').hidden,'retry available for failed city index');
assert(document.getElementById('historySearchStatus').textContent.includes('incomplete'),'partial coverage disclosed');
assert(document.querySelector('[data-search-result] strong').textContent==='The Pig War','local events work after index failure');
window.fetch=original;
document.querySelector('[data-search-retry]').click();
input.value='Vancouver';input.dispatchEvent(new Event('input',{bubbles:true}));
for(let i=0;i<100;i++){await new Promise(r=>setTimeout(r,100));if(!document.getElementById('historySearchStatus').textContent.includes('Loading'))break;}
assert(document.querySelector('[data-search-retry]').hidden,'city download retry succeeds');
assert(document.querySelector('[data-search-result] strong').textContent==='Vancouver, British Columbia, Canada','places recovered');
return 'Failed city download keeps local results usable and retries successfully';
})()`));
await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:2,mobile:true});
console.log(await evaluate(`(async()=>{
const input=document.getElementById('historySearchInput');input.value='Rome';input.dispatchEvent(new Event('input',{bubbles:true}));await new Promise(r=>setTimeout(r,180));
const d=document.getElementById('historySearch'),r=d.getBoundingClientRect();
if(r.left<0||r.right>innerWidth||d.scrollWidth>d.clientWidth||document.documentElement.scrollWidth>innerWidth)throw Error('Search overflows mobile');
return 'Mobile search fits 390px and scrolls inside the dialog';
})()`));
const shot=await send('Page.captureScreenshot',{format:'png'});
(await import('node:fs')).writeFileSync((await import('node:path')).join((await import('node:os')).tmpdir(),'history-search-mobile.png'),Buffer.from(shot.data,'base64'));
console.log(await evaluate(`(async()=>{
document.querySelector('[data-search-close]').click();stopSpin();
const row=(await(await fetch('search-states.json')).json()).rows.find(r=>r[0]==='New France'&&r[3]===1757);
const [title,start,end,year,lon,lat,wiki,member]=row;
await HistoryDiscovery.jumpSearch({kind:'state',title,start,end,year,lon,lat,wiki,member},()=>true);
await new Promise(r=>setTimeout(r,200));
const labels=[],original=ctx.fillText;
try{ctx.fillText=function(text,...args){labels.push(text);return original.call(this,text,...args)};render();}
finally{ctx.fillText=original;}
if(!labels.includes('New France'))throw Error('New France label missing on mobile');
if(document.documentElement.scrollWidth>innerWidth)throw Error('Quebec map overflows mobile');
stage.scrollIntoView({block:'start',behavior:'instant'});
return 'New France label remains visible on the 390px mobile map';
})()`));
const quebecShot=await send('Page.captureScreenshot',{format:'png'});
(await import('node:fs')).writeFileSync((await import('node:path')).join((await import('node:os')).tmpdir(),'history-quebec-mobile.png'),Buffer.from(quebecShot.data,'base64'));
console.log('Browser exceptions:',errors);
await send('Target.closeTarget',{targetId:page.id});ws.close();
if(errors.length)throw Error(JSON.stringify(errors));
