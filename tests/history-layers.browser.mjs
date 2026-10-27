// Thematic routes, migration arrows, dated markers, controls and shared views.
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
  fs.writeFileSync(path.join(os.tmpdir(), 'history-layers-' + name + '.png'), Buffer.from(shot.data, 'base64'));
};
try {
  await send('Runtime.enable');await send('Network.enable');
  await send('Network.setCacheDisabled',{cacheDisabled:true});
  await send('Network.setBlockedURLs',{urls:url.startsWith('file:')?['http://*','https://*']:['https://fonts.googleapis.com/*','https://fonts.gstatic.com/*']});
  await send('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
  await send('Page.navigate',{url:url+'#1300'});
  await waitFor('!!window.AtlasUI && !!window.HistoryLayers');
  console.log(await evaluate(`(async()=>{
    const check=(v,m)=>{if(!v)throw Error(m)};stopSpin();flyToken++;
    document.querySelector('[data-atlas-menu="layersPanel"]').click();
    check(document.querySelectorAll('[data-layer-toggle]').length===4,'Four overlay controls remain in Layers');
    check(document.querySelector('[data-layer-count="trade"]').textContent==='4 in this period · 4 total','Trade count follows 1300');
    const trade=document.querySelector('[data-layer-toggle="trade"]');trade.click();render();
    check(!state.cats.has('trade')&&document.querySelector('#legend [data-k="trade"]').getAttribute('aria-pressed')==='false','Layer toggle synchronises event filter');
    trade.click();render();
    for(const b of document.querySelectorAll('#legend [data-k]'))if(b.dataset.k!=='trade'&&b.getAttribute('aria-pressed')==='true')b.click();render();
    check(state.cats.size===1&&state.cats.has('trade'),'Trade layer is independent');
    check(hits.some(h=>h.radius===7&&byId[h.id]?.cat==='trade'),'Trade lines have selectable path hits');
    document.querySelector('[data-atlas-menu="layersPanel"]').click();
    return 'Layer controls, counts, category synchronisation and selectable trade paths passed';
  })()`));
  console.log(await evaluate(`(async()=>{
    const check=(v,m)=>{if(!v)throw Error(m)};
    document.querySelector('[data-atlas-menu="migrationsPanel"]').click();
    check(document.getElementById('migrationStatus').textContent==='0 near 1300 · 30 histories total','Year count is distinguished from the whole catalogue');
    const catalogue=document.getElementById('migrationResults');
    check(catalogue.querySelectorAll('[data-migration-record]').length===30&&!document.querySelector('#layersPanel [data-migration-record]'),'All migrations are available in their dedicated menu');
    const event=ev.find(e=>e.wiki==='Bosnian_War');
    const button=catalogue.querySelector('[data-migration-record="'+event.id+'"]');button.focus();button.click();
    await new Promise(r=>setTimeout(r,100));flyToken++;render();
    check(state.year===1992&&state.sel===event.id&&state.cats.has('migrations'),'Catalogue navigation enables the layer and visits its dated war displacement');
    check(document.getElementById('migrationsPanel').hidden,'Migration menu closes after navigation');
    check(document.activeElement===document.getElementById('detail'),'Migration reader receives keyboard focus');
    check(document.querySelector('#detail h3').textContent.includes('Bosnian War'),'Catalogue opens the selected migration story');
    return 'Migration totals, complete catalogue, dated navigation and keyboard focus passed';
  })()`));
  for(const [wiki,year] of [['Silk_Roads',1300],['Great_Migration_(African_American)',1950],['Belarusian_diaspora',2020],['White_émigré',1917],['Ukrainian_refugee_crisis',2023],['Jewish_refugees_from_Nazi_Germany_and_German-occupied_Europe',1943],['Kindertransport',1939],['Holocaust_trains',1943]]){
    const point=await evaluate(`(async()=>{
      const e=ev.find(e=>e.wiki===${JSON.stringify(wiki)});
      for(const cat of [...state.cats])if(cat!==e.cat&&state.cats.size>1)document.querySelector('#legend [data-k="'+cat+'"]').click();
      await HistoryDiscovery.jumpSearch({kind:'event',recordId:e.id,start:${year},lon:e.lon,lat:e.lat});
      flyToken++;setYear(${year});render();
      if(e.cat==='migrations'){
        let arrows=0;const original=ctx.rotate;ctx.rotate=function(...args){arrows++;return original.apply(this,args)};
        HistoryLayers.drawRoutes(ctx,path,proj,visible,state.year);ctx.rotate=original;
        if(!arrows)throw Error('Migration arrowheads are drawn');
      }
      const rect=cv.getBoundingClientRect();
      const hit=hits.find(h=>h.radius===7&&h.id===e.id&&nearest(h.x,h.y)?.id===e.id&&document.elementFromPoint(rect.left+h.x,rect.top+h.y)===cv);
      if(!hit)throw Error('Reachable path hit for '+e.wiki);
      return {x:rect.left+hit.x,y:rect.top+hit.y};
    })()`);
    await send('Input.dispatchMouseEvent',{type:'mousePressed',...point,button:'left',clickCount:1});
    await send('Input.dispatchMouseEvent',{type:'mouseReleased',...point,button:'left',clickCount:1});
    assert(await evaluate(`byId[state.sel]?.wiki===${JSON.stringify(wiki)}`),'Line click selects '+wiki);
    assert(await evaluate(`document.querySelector('#detail').textContent.includes('Schematic connections')&&!!document.querySelector('#detail a[href^="https://"]')`),'Reader explains routes and provides sources');
  }
  console.log(await evaluate(`(async()=>{
    const check=(v,m)=>{if(!v)throw Error(m)};flyToken++;
    const pale=ev.find(e=>e.wiki==='Pale_of_Settlement');
    await HistoryDiscovery.jumpSearch({kind:'event',recordId:pale.id,start:1850,lon:pale.lon,lat:pale.lat});flyToken++;render();
    check(state.year===1850&&hits.some(h=>h.id===pale.id&&!h.radius),'Pale of Settlement has a dated map marker');
    check(!hits.some(h=>h.id===pale.id&&h.radius===7),'Residency restrictions have no invented migration arrow');
    check(!document.querySelector('#detail .route-method'),'Pale reader does not describe a migration route');
    check(document.querySelector('#detail').textContent.includes('Jewish residency restrictions'),'Pale reader identifies the legal context');
    const choose=cat=>{state.cats=new Set([cat]);buildMarks();update();render()};
    choose('trade');setYear(1700);render();check(!hits.some(h=>h.radius===7)&&document.querySelector('.route-map-note').hidden,'Expired trade routes disappear');
    choose('migrations');setYear(1950);render();
    check(document.getElementById('migrationStatus').textContent==='5 near 1950 · 30 histories total','Migration count updates with the year: '+document.getElementById('migrationStatus').textContent);
    choose('climate');setYear(1816);render();
    check(activeEvents().some(({e})=>e.wiki==='Year_Without_a_Summer'),'Climate event follows timeline');
    check(!hits.some(h=>h.radius===7),'Climate markers do not invent affected-area tracks');
    choose('technology');setYear(1958);render();
    check(activeEvents().some(({e})=>e.wiki==='Integrated_circuit'),'Technology milestone follows timeline');
    document.querySelector('[data-atlas-menu="layersPanel"]').click();
    document.querySelector('[data-layer-explore="trade"]').click();await new Promise(r=>setTimeout(r,100));flyToken++;render();
    check(state.year===1600&&state.cats.has('trade')&&byId[state.sel]?.cat==='trade','Explore reaches a recorded trade period and enables its category');
    document.querySelector('#detail .close').click();
    state.cats=new Set(['trade','migrations','climate','technology']);buildMarks();
    document.getElementById('compareToggle').click();const form=document.getElementById('compareYears');
    form.elements.left.value='1300';form.elements.right.value='1958';form.requestSubmit();render();
    check(document.querySelector('[data-layer-count="trade"]').textContent==='4 left · 0 right · 4 total','Layer counts distinguish comparison years');
    check(hits.some(h=>h.radius===7&&h.year===1300),'Comparison has dated route hits');
    return 'Migration arrows, real line selection, interval endings, climate/technology milestones, Explore and comparison passed';
  })()`));
  const shared=await evaluate('location.hash');
  await send('Page.navigate',{url:url+shared});
  await waitFor('!!window.HistoryLayers && !!window.AtlasUI && HistoryDiscovery.isComparing()');
  assert(await evaluate(`['trade','migrations','climate','technology'].every(cat=>state.cats.has(cat))`),'Sharing restores thematic choices');
  await evaluate(`document.getElementById('compareToggle').click();setYear(1300);stopSpin();flyToken++;render()`);
  for(const width of [1440,390,320]){
    await send('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:width<=860});
    await evaluate(`(()=>{window.scrollTo({top:0,behavior:'instant'});const t=document.querySelector('[data-atlas-menu="layersPanel"]');if(t.getAttribute('aria-expanded')!=='true')t.click()})()`);
    for(const cat of ['trade','pandemics','climate','technology']){
      assert(await evaluate(`(()=>{const b=document.querySelector('[data-layer-toggle="${cat}"]');b.scrollIntoView({block:'nearest'});const r=b.getBoundingClientRect();return r.width>0&&r.height>=44&&r.left>=0&&r.right<=innerWidth&&document.documentElement.scrollWidth<=innerWidth})()`),`${cat} control reachable at ${width}px`);
    }
    await screenshot(String(width));
    await evaluate(`document.querySelector('[data-atlas-menu="migrationsPanel"]').click()`);
    assert(await evaluate(`(()=>{const list=document.getElementById('migrationResults');const buttons=[...list.querySelectorAll('[data-migration-record]')],last=buttons.at(-1);last.scrollIntoView({block:'nearest'});const r=last.getBoundingClientRect(),p=list.getBoundingClientRect();return buttons.length===30&&r.width>0&&r.height>=44&&r.left>=0&&r.right<=innerWidth&&r.top>=p.top&&r.bottom<=p.bottom+1&&r.bottom<=innerHeight&&document.documentElement.scrollWidth<=innerWidth})()`),`Last migration is reachable in its separate menu at ${width}px`);
    await screenshot('catalogue-'+width);
    await evaluate(`document.querySelector('.migrations-close').click()`);
  }
  assert.deepEqual(errors,[],'No browser exceptions');
  console.log('Shared layers, full migration catalogue and 1440/390/320px controls passed');
} finally {ws.close();await fetch(cdp+'/json/close/'+tab.id);}
