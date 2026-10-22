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
await send('Page.enable');
await send('Page.addScriptToEvaluateOnNewDocument',{source:`{const D=Date;window.Date=class extends D{constructor(...args){super(...(args.length?args:['2035-06-01T12:00:00Z']));}};}`});
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
assert(NOW===2026&&yearAt(1)===2026&&new Date().getFullYear()===2035,'fixed endpoint independent of browser clock');
assert(document.querySelector('#ticks .timeline-end').textContent==='2026','endpoint labeled on ruler');
for(let i=0;i<80&&document.querySelector('.population-values').textContent.includes('Loading');i++)await new Promise(r=>setTimeout(r,100));
stopSpin();setYear(2026);render();
assert(stage.getBoundingClientRect().height>=innerHeight*.7,'desktop globe receives most of the viewport height');
assert(document.querySelector('.time').getBoundingClientRect().height<=240,'desktop timeline stays compact, including coverage notices');
assert(document.getElementById('ruler').getBoundingClientRect().bottom<=innerHeight,'full timeline remains visible with the larger globe');
assert(document.querySelector('.population-values').textContent.includes('8.3 billion'),'2026 world population');
assert(document.querySelector('.population-values').textContent.includes('UN projection'),'2026 explicitly projected');
setYear(2035);render();assert(state.year===2026,'future year clamped to endpoint');
setYear(1453);render();assert(document.querySelector('.population-values').textContent.includes('Interpolated estimate'),'sparse history interpolated visibly');
setYear(-10000);render();assert(document.querySelector('.population-values').textContent.includes('4.5 million'),'earliest source sample');
setYear(-300000);render();assert(document.querySelector('.population-values').textContent.includes('No estimate'),'no prehistory extrapolation');
document.getElementById('compareToggle').click();const form=document.getElementById('compareYears');form.elements.left.value='1800';form.elements.right.value='2026';form.requestSubmit();render();
const entries=document.querySelectorAll('.population-value');
assert(entries.length===2&&entries[0].textContent.includes('Left · 1800')&&entries[1].textContent.includes('Right · 2026'),'both comparison years explicit');
assert(entries[0].textContent.includes('Historical estimate')&&entries[1].textContent.includes('UN projection'),'estimate and projection remain distinct');
setYear(2023);render();assert(document.querySelectorAll('.population-value')[1].textContent.includes('Historical estimate'),'scrubbing clears projection label');
const details=document.querySelector('.population-heading details');details.open=true;
assert(details.textContent.includes('linear interpolation')&&details.querySelector('a[href*="ourworldindata"]'),'source/method disclosure');
assert(stage.getBoundingClientRect().height>=innerHeight*.7,'expanded comparison and sources preserve globe space');
details.open=false;
return 'Population: fixed 2026 endpoint under a 2035 clock, year updates, estimates/projections, interpolation, coverage and comparison passed';
})()`));
await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:2,mobile:true});
await new Promise(r=>setTimeout(r,300));
console.log(await evaluate(`(()=>{
const assert=(v,m)=>{if(!v)throw Error(m)};
document.getElementById('compareToggle').click();
window.scrollTo({top:0,behavior:'instant'});
const time=document.querySelector('.time').getBoundingClientRect();
assert(stage.getBoundingClientRect().height>=innerHeight*.7,'mobile globe has a generous viewport height');
assert(time.top>=stage.getBoundingClientRect().bottom,'ordinary mobile timeline stays below map');
for(const selector of ['.borders-control button','.legend button','.zoom button']){
 const button=document.querySelector(selector),r=button.getBoundingClientRect();
 assert(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)?.closest('button')===button,'mobile map control is reachable: '+selector);
}
const style=getComputedStyle(document.getElementById('play'));
const luminance=color=>{const c=color.match(/[0-9.]+/g).slice(0,3).map(n=>{const v=+n/255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4});return c[0]*.2126+c[1]*.7152+c[2]*.0722};
const a=luminance(style.color),b=luminance(style.backgroundColor);
assert((Math.max(a,b)+.05)/(Math.min(a,b)+.05)>=4.5,'Play text contrast meets 4.5:1');
document.getElementById('compareToggle').click();
return 'Mobile map controls remain reachable and Play text has sufficient contrast';
})()`));
console.log(await evaluate(`(()=>{
render();const s=document.querySelector('.population-strip'),r=s.getBoundingClientRect();
if(document.documentElement.scrollWidth>innerWidth||r.right>innerWidth||s.scrollWidth>s.clientWidth)throw Error('Population overflows mobile');
s.scrollIntoView({block:'center'});
return 'Mobile population comparison fits 390px';
})()`));
const shot=await send('Page.captureScreenshot',{format:'png'});
(await import('node:fs')).writeFileSync((await import('node:path')).join((await import('node:os')).tmpdir(),'history-population-mobile.png'),Buffer.from(shot.data,'base64'));
await send('Page.addScriptToEvaluateOnNewDocument',{source:`{const original=fetch;window.__restorePopulationFetch=()=>{window.fetch=original};window.fetch=(url,...args)=>url==='population.json'?Promise.reject(new Error('Test missing population data')):original(url,...args);}`});
await send('Page.reload',{ignoreCache:true});await new Promise(r=>setTimeout(r,1500));
console.log(await evaluate(`(async()=>{
const assert=(v,m)=>{if(!v)throw Error(m)};
assert(document.querySelector('.population-values').textContent.includes('unavailable'),'failure state');
assert(!document.querySelector('.population-retry').hidden,'retry available');
setYear(1903);assert(state.year===1903,'Atlas navigation works after population failure');
window.__restorePopulationFetch();document.querySelector('.population-retry').click();
for(let i=0;i<80&&document.querySelector('.population-values').textContent.includes('Loading');i++)await new Promise(r=>setTimeout(r,100));
assert(document.querySelector('.population-value')&&document.querySelector('.population-retry').hidden,'population retry succeeds');
return 'Population failure is nonblocking and retry recovers';
})()`));
console.log('Browser exceptions:',errors);
await send('Target.closeTarget',{targetId:page.id});ws.close();
if(errors.length)throw Error(JSON.stringify(errors));
