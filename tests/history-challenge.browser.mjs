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
await send("Page.enable");
await send("Page.bringToFront");
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
await send('Emulation.setTimezoneOverride',{timezoneId:'America/Vancouver'});
await send('Page.addScriptToEvaluateOnNewDocument',{source:`{
 const OriginalDate=Date;
 window.__dailyClock=OriginalDate.parse('2026-10-22T12:00:00-07:00');
 window.Date=class extends OriginalDate {constructor(...args){super(...(args.length?args:[window.__dailyClock]));}static now(){return window.__dailyClock;}};
}`});
await send("Page.navigate", { url: "about:blank" });
await new Promise((r) => setTimeout(r, 100));
await send("Page.navigate", {
  url: (process.env.ATLAS_TEST_URL || "http://127.0.0.1:8891/atlas/") + "#1789",
});
await new Promise((r) => setTimeout(r, 2500));
await evaluate(`localStorage.removeItem('atlas.daily-challenge.v1')`);
await send('Page.reload',{ignoreCache:true});
await new Promise(r=>setTimeout(r,1800));
console.log(await evaluate(`(async()=>{
const assert=(v,m)=>{if(!v)throw Error(m)};
assert(window.HistoryChallenge,'challenge loaded');stopSpin();
const set=HistoryChallengeCore.daily(ev,ppl,HistoryChallengeCore.localDay());
assert(set.length===3,'three daily types');
assert(document.querySelector('.daily-challenge-card').textContent.includes('0/3 answered'),'fresh progress');
document.querySelector('.daily-challenge-card button').click();
assert(document.getElementById('dailyChallenge').open,'challenge dialog opens');
assert(document.querySelectorAll('[data-move]').length===6,'accessible order controls');
document.querySelector('[data-check-order]').click();
assert(document.querySelector('.daily-feedback').textContent.includes('Not quite'),'unsolved initial order is incorrect');
assert(document.querySelectorAll('.daily-answer-order a').length===3,'order sources revealed');
assert(document.querySelectorAll('[data-daily-map]').length===3,'each chronological answer opens map');
assert(document.querySelector('.daily-challenge-card').textContent.includes('1/3 answered'),'first attempt saved');
const stored=JSON.parse(localStorage.getItem('atlas.daily-challenge.v1'));
assert(stored.answers[0]&&stored.answers[1]===null,'partial progress');
document.querySelector('[data-daily-step="2"]').click();
document.querySelector('input[name="pair"][value="'+set[2].correct+'"]').checked=true;
document.querySelector('[data-overlap-answer]').requestSubmit();
assert(document.querySelector('.daily-feedback').textContent.includes("That's right"),'correct overlapping pair');
assert(document.querySelector('.daily-question').textContent.includes('does not imply they met'),'overlap claim precise');
const mapButton=document.querySelector('[data-daily-map]');const personId=mapButton.dataset.dailyMap;
mapButton.click();await new Promise(r=>setTimeout(r,80));
assert(state.year===set[2].year&&state.sel===personId,'person reveal opens a shared lifetime year');
assert(set[2].options[set[2].correct].people.every(p=>alivePeople().some(r=>r.id===p.id)),'both people alive in revealed year');
document.querySelector('[data-map-review]').click();
document.querySelector('[data-daily-step="1"]').click();
if(!HistoryDiscovery.isComparing())document.getElementById('compareToggle').click();
setYear(1789);setMode('globe');setZoom(1.4);rot=[-30,-25,0];
window.__beforePick={hash:HistoryDiscovery.urlHash(),year:state.year,mode:state.mode,zoom:zoomK,cats:[...state.cats]};
document.querySelector('[data-pick-map]').click();render();
assert(HistoryChallenge.isPicking()&&!document.getElementById('dailyChallenge').open,'map guessing starts');
assert(state.mode==='flat'&&state.year===set[1].record.start&&hits.length===0,'neutral map hides answer markers');
assert(HistoryDiscovery.urlHash()===__beforePick.hash,'reload link keeps original view during guessing');
assert(document.querySelector('.time').inert&&document.getElementById('side').inert,'other timeline and sidebar actions suspended');
document.querySelector('[data-map-cancel]').click();
assert(!HistoryChallenge.isPicking()&&HistoryDiscovery.isComparing()&&state.year===__beforePick.year&&state.mode===__beforePick.mode&&zoomK===__beforePick.zoom,'cancel restores comparison, year and camera');
assert(!document.querySelector('.time').inert&&!document.getElementById('side').inert,'cancel restores controls');
document.querySelector('[data-pick-map]').click();render();
return 'Daily puzzles: chronology feedback, source links, lifespan overlap, map reveal, hidden markers and cancel restoration passed';
})()`));
// Wait for the map layout and its ResizeObserver before aiming a real pointer.
await new Promise(r=>setTimeout(r,150));
// Real pointer dispatch, rather than invoking the grading callback directly.
let target=await evaluate(`(()=>{const q=HistoryChallengeCore.daily(ev,ppl,HistoryChallengeCore.localDay())[1],p=proj([q.record.lon,q.record.lat]),r=cv.getBoundingClientRect();return {x:r.left+p[0],y:r.top+p[1]}})()`);
await send('Input.dispatchMouseEvent',{type:'mouseMoved',...target});
await send('Input.dispatchMouseEvent',{type:'mousePressed',...target,button:'left',buttons:1,clickCount:1});
await send('Input.dispatchMouseEvent',{type:'mouseReleased',...target,button:'left',buttons:0,clickCount:1});
await new Promise(r=>setTimeout(r,200));
console.log(await evaluate(`(async()=>{
const assert=(v,m)=>{if(!v)throw Error(m)};
assert(!HistoryChallenge.isPicking()&&document.getElementById('dailyChallenge').open,'mouse guess restores question');
assert(document.querySelector('.daily-feedback').textContent.includes("That's right"),'target guess correct');
assert(document.querySelector('.daily-question').textContent.includes('recorded marker'),'distance and scope feedback');
assert(document.querySelector('.daily-challenge-card').textContent.includes('3/3 answered'),'set complete');
assert(document.querySelector('.daily-challenge-card').textContent.includes('2 correct'),'first attempt scoring');
document.querySelector('[data-daily-map]').click();await new Promise(r=>setTimeout(r,80));render();
const q=HistoryChallengeCore.daily(ev,ppl,HistoryChallengeCore.localDay())[1];
assert(state.sel===q.record.id&&state.year===q.record.start,'location answer on map');
assert(document.querySelector('.challenge-map-banner').textContent.includes('km away'),'map shows guess distance');
return 'Real mouse guess, distance feedback, 2/3 score and geographic reveal passed';
})()`));
await send('Page.reload',{ignoreCache:true});
await new Promise(r=>setTimeout(r,1800));
console.log(await evaluate(`(()=>{
const assert=(v,m)=>{if(!v)throw Error(m)};
assert(document.querySelector('.daily-challenge-card').textContent.includes('3/3 answered'),'completion survives reload');
assert(document.querySelector('.daily-challenge-card').textContent.includes('2 correct'),'score survives reload');
document.querySelector('.daily-challenge-card button').click();
assert(!document.querySelector('[data-check-order]'),'cannot resubmit an answered question');
window.__dailyClock+=86400000;document.querySelector('.daily-challenge-card button').click();
assert(document.querySelector('.daily-challenge-card').textContent.includes('0/3 answered'),'local midnight resets progress');
assert(document.querySelector('[data-check-order]'),'new day has fresh questions');
const original=Storage.prototype.setItem;
Storage.prototype.setItem=()=>{throw new Error('Test storage unavailable')};
document.querySelector('[data-daily-reveal]').click();Storage.prototype.setItem=original;
assert(document.querySelector('.daily-storage-note').textContent.includes('lasts for this visit'),'storage failure remains playable');
return 'Reload persistence, immutable first attempt, next local day and unavailable storage passed';
})()`));
await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:2,mobile:true});
await send('Emulation.setTouchEmulationEnabled',{enabled:true});
console.log(await evaluate(`(()=>{
const assert=(v,m)=>{if(!v)throw Error(m)};
document.querySelector('[data-daily-step="1"]').click();
const d=document.getElementById('dailyChallenge'),r=d.getBoundingClientRect();
assert(r.left>=0&&r.right<=innerWidth&&d.scrollWidth<=d.clientWidth,'mobile dialog fits');
document.querySelector('[data-pick-map]').click();render();
return 'Mobile challenge layout and map pick started';
})()`));
await new Promise(r=>setTimeout(r,700));
// A real drag pans the map without submitting; a subsequent real touch tap answers.
let pan=await evaluate(`(()=>{const r=cv.getBoundingClientRect();return{x:r.left+100,y:r.top+r.height*.65}})()`);
await send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[pan]});
await send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:pan.x+20,y:pan.y}]});
await send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
if(!await evaluate('HistoryChallenge.isPicking()'))throw Error('Map drag submitted a guess');
// Recenter the flat map after verifying drag, then tap the source point.
await evaluate('flatT={x:0,y:0};render()');
target=await evaluate(`(()=>{const q=HistoryChallengeCore.daily(ev,ppl,HistoryChallengeCore.localDay())[1],p=proj([q.record.lon,q.record.lat]),r=cv.getBoundingClientRect();return {x:r.left+p[0],y:r.top+p[1]}})()`);
await send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[target]});
await send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
await new Promise(r=>setTimeout(r,150));
console.log(await evaluate(`(()=>{
if(HistoryChallenge.isPicking()||!document.getElementById('dailyChallenge').open||!document.querySelector('.daily-feedback').textContent.includes("That's right"))throw Error('Touch target guess failed');
if(document.documentElement.scrollWidth>innerWidth)throw Error('Mobile page overflow');
return 'Real touch drag and tap guessing passed';
})()`));
console.log(await evaluate(`(()=>{
const assert=(v,m)=>{if(!v)throw Error(m)};
window.__dailyClock+=86400000;document.querySelector('.daily-challenge-card button').click();
document.querySelector('[data-daily-step="1"]').click();
const q=HistoryChallengeCore.daily(ev,ppl,HistoryChallengeCore.localDay());
const form=document.querySelector('[data-coordinate-answer]');form.closest('details').open=true;
form.elements.lat.value='91';form.elements.lon.value='0';assert(!form.checkValidity(),'latitude bounds enforced');
form.elements.lat.value=q[1].record.lat;form.elements.lon.value=q[1].record.lon;form.requestSubmit();
assert(document.querySelector('.daily-feedback').textContent.includes("That's right"),'coordinate alternative grades correctly');
document.querySelector('[data-daily-step="0"]').click();
for(let i=0;i<q[0].correct.length;i++){
 let at=[...document.querySelectorAll('.daily-order li > span')].findIndex(e=>e.textContent===q[0].correct[i].title);
 while(at>i){document.querySelector('[data-move="'+at+'"][data-direction="-1"]').click();at--;}
}
document.querySelector('[data-check-order]').click();
assert(document.querySelector('.daily-feedback').textContent.includes("That's right"),'ordering controls produce correct answer');
document.querySelector('[data-daily-step="2"]').click();document.querySelector('[data-daily-reveal]').click();
document.querySelector('[data-daily-next]').click();
assert(document.querySelector('.daily-summary').textContent.includes('2 of 3 correct'),'final score includes skipped answer');
return 'Coordinate entry, validation, correct reordering, skips and final summary passed';
})()`));
const shot=await send('Page.captureScreenshot',{format:'png'});
(await import('node:fs')).writeFileSync((await import('node:path')).join((await import('node:os')).tmpdir(),'history-challenge-mobile.png'),Buffer.from(shot.data,'base64'));
console.log('Browser exceptions:',errors);
await send('Target.closeTarget',{targetId:page.id});ws.close();
if(errors.length)throw Error(JSON.stringify(errors));
