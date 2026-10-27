// Rendered route direction, clipping and selection, including Korea at world zoom.
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
  fs.writeFileSync(path.join(os.tmpdir(), 'history-migration-arrows-' + name + '.png'), Buffer.from(shot.data, 'base64'));
};
try {
  await send('Runtime.enable'); await send('Network.enable');
  await send('Network.setCacheDisabled',{cacheDisabled:true});
  await send('Network.setBlockedURLs',{urls:url.startsWith('file:')?['http://*','https://*']:['https://fonts.googleapis.com/*','https://fonts.gstatic.com/*']});
  await send('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
  await send('Page.navigate',{url:url+'#1950'});
  await waitFor('!!window.HistoryLayers && !!window.AtlasUI');
  await evaluate(`(() => {
    stopSpin(); flyToken++; state.cats=new Set(['migrations']);
    window.captureRoute = (route,year) => {
      const canvas=document.createElement('canvas');canvas.width=W;canvas.height=H;
      const context=canvas.getContext('2d'),heads=[],rotate=context.rotate;
      context.rotate=function(angle){const m=this.getTransform();heads.push({x:m.e,y:m.f,angle});return rotate.call(this,angle)};
      const active=HistoricalLayersCore.active;
      HistoricalLayersCore.active=(...args)=>active(...args).filter(item=>item.route===route);
      try { return {heads,hits:HistoryLayers.drawRoutes(context,d3.geoPath(proj,context),proj,visible,year)}; }
      finally { HistoricalLayersCore.active=active; }
    };
    window.checkDirection = (route,heads) => {
      // Compare canvas heads with densely sampled geographic forward tangents,
      // independently of the renderer's screen-distance placement algorithm.
      const samples=[];
      for(const line of route.paths)for(let i=1;i<line.length;i++){
        const interpolate=d3.geoInterpolate(line[i-1],line[i]);
        const steps=Math.max(100,Math.ceil(d3.geoDistance(line[i-1],line[i])*180/Math.PI*30));
        for(let j=1;j<=steps;j++){
          const a=interpolate((j-1)/steps),b=interpolate(j/steps);
          if(!visible(...a)||!visible(...b))continue;
          const p=proj(a),q=proj(b);
          if(Math.hypot(q[0]-p[0],q[1]-p[1])>W/3)continue;
          samples.push({p,q});
        }
      }
      for(const h of heads){
        if(![h.x,h.y,h.angle].every(Number.isFinite)||h.x<0||h.x>W||h.y<0||h.y>H)throw Error('Offscreen or invalid arrow');
        let closest=null,distance=Infinity;
        for(const sample of samples){
          const {p,q}=sample,dx=q[0]-p[0],dy=q[1]-p[1],length=dx*dx+dy*dy;
          const t=length?Math.max(0,Math.min(1,((h.x-p[0])*dx+(h.y-p[1])*dy)/length)):0;
          const d=Math.hypot(h.x-p[0]-dx*t,h.y-p[1]-dy*t);
          if(d<distance){distance=d;closest=sample;}
        }
        if(distance>1)throw Error('Arrow leaves its drawn route: '+distance);
        const {p,q}=closest,dx=q[0]-p[0],dy=q[1]-p[1];
        if((Math.cos(h.angle)*dx+Math.sin(h.angle)*dy)/Math.hypot(dx,dy)<.7)throw Error('Arrow points against '+route.wiki+' at '+JSON.stringify(h)+' (cosine '+((Math.cos(h.angle)*dx+Math.sin(h.angle)*dy)/Math.hypot(dx,dy))+')');
      }
    };
  })()`);
  for(const [width,height] of [[1440,1000],[390,844],[320,568]]){
    await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<=860});
    await evaluate('resize()');
    for(const mode of ['globe','flat'])for(const zoom of [1,3,6]){
      const result=await evaluate(`(()=>{
        setMode('${mode}');stopSpin();flyToken++;rot=[-129,-37,0];zoomK=${zoom};flatT={x:0,y:0};makeProj();
        if(state.mode==='flat'&&zoomK>1){const p=proj([129,37]);flatT={x:W/2-p[0],y:H/2-p[1]};}
        setYear(1950);render();
        const route=HistoricalLayersCore.routes.find(r=>r.wiki==='Hungnam_evacuation');
        const result=captureRoute(route,1950);checkDirection(route,result.heads);
        return {heads:result.heads.length,hits:result.hits.length};
      })()`);
      assert(result.heads>=1&&result.heads<=3,`Korea has readable, spaced arrows at ${width}px ${mode} zoom ${zoom}: ${JSON.stringify(result)}`);
      assert(result.hits>1,'Korea route remains selectable');
      if(zoom===1||zoom===3)await screenshot(`${width}-${mode}-${zoom}`);
    }
  }
  console.log('Korea arrow direction and density pass on desktop and phones in globe/map modes at zoom 1, 3 and 6');
  await send('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
  const target=await evaluate(`(()=>{
    resize();setMode('globe');stopSpin();flyToken++;rot=[-129,-37,0];zoomK=3;setYear(1950);render();
    const record=ev.find(e=>e.wiki==='Hungnam_evacuation'),route=HistoricalLayersCore.routes.find(r=>r.wiki===record.wiki);
    for(const year of [1949,1954]){
      const result=captureRoute(route,year);
      if(result.heads.length||result.hits.length)throw Error('Korea route outside its recorded interval');
    }
    if(!captureRoute(route,1953).heads.length)throw Error('Korea route missing in its final year');
    state.cats.delete('migrations');
    const hidden=captureRoute(route,1950);state.cats.add('migrations');
    if(hidden.heads.length||hidden.hits.length)throw Error('Hidden migrations remain interactive');
    const rect=cv.getBoundingClientRect(),origin=proj([record.lon,record.lat]);
    const hit=hits.find(h=>h.id===record.id&&h.radius===7&&Math.hypot(h.x-origin[0],h.y-origin[1])>25&&nearest(h.x,h.y)?.id===record.id&&document.elementFromPoint(rect.left+h.x,rect.top+h.y)===cv);
    if(!hit)throw Error('Korea line has no reachable hit away from its marker');
    return {x:rect.left+hit.x,y:rect.top+hit.y};
  })()`);
  await send('Input.dispatchMouseEvent',{type:'mousePressed',...target,button:'left',clickCount:1});
  await send('Input.dispatchMouseEvent',{type:'mouseReleased',...target,button:'left',clickCount:1});
  assert(await evaluate(`state.year===1950&&byId[state.sel]?.wiki==='Hungnam_evacuation'&&!!document.querySelector('#detail a[href*="history.navy.mil"]')`),'Clicking Korea route opens its dated history and source');
  console.log(await evaluate(`(()=>{
    const check=(v,m)=>{if(!v)throw Error(m)};resize();
    // Every migration path is checked at a regional view of its own start.
    setMode('globe');stopSpin();flyToken++;
    for(const route of HistoricalLayersCore.routes.filter(r=>r.kind==='migrations')){
      const record=ev.find(e=>e.wiki===route.wiki),[lon,lat]=route.paths[0][0];
      setYear(record.start);rot=[-lon,-lat,0];zoomK=3;makeProj();
      const result=captureRoute(route,record.start);checkDirection(route,result.heads);
      check(result.hits.length>0,'Route hit coverage: '+route.wiki);
    }
    // Test a route crossing the actual flat-map seam, not a straight chord
    // between the two projected sides of the antimeridian.
    const route=HistoricalLayersCore.routes.find(r=>r.wiki==='Hungnam_evacuation'),paths=route.paths;
    try{
      route.paths=[[[160,10],[-140,10]]];setMode('flat');stopSpin();makeProj();
      const result=captureRoute(route,1950);checkDirection(route,result.heads);
      check(result.heads.length>=2,'Both visible seam pieces have directions');
      const middle=proj([10,10]);
      check(!result.hits.some(h=>Math.hypot(h.x-middle[0],h.y-middle[1])<100),'No selectable chord across the map seam');
      // A route whose endpoints lie outside a zoomed viewport still crosses
      // its centre and must remain selectable there.
      route.paths=[[[-70,0],[70,0]]];zoomK=6;flatT={x:0,y:0};makeProj();
      const crossing=captureRoute(route,1950),middlePoint=proj([10,0]);
      check(crossing.hits.some(h=>Math.hypot(h.x-middlePoint[0],h.y-middlePoint[1])<7),'Clipped crossing remains selectable');
      // Nothing on the hidden hemisphere may create an arrow or a hit.
      route.paths=[[[120,10],[150,10]]];setMode('globe');stopSpin();rot=[0,0,0];makeProj();
      const hidden=captureRoute(route,1950);
      check(!hidden.heads.length&&!hidden.hits.length,'Hidden hemisphere has no arrows or hits');
    }finally{route.paths=paths;}
    return 'All migration directions, seam clipping, zoomed viewport crossings and hidden hemisphere passed';
  })()`));
  assert.deepEqual(errors,[],'No browser exceptions');
} finally {ws.close();await fetch(cdp+'/json/close/'+tab.id);}
