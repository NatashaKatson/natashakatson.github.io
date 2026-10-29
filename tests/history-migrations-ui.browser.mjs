import { workspaceSetup } from './atlas-workspace-helpers.mjs';
// Dedicated migration browsing, keyboard navigation, visibility and responsive layout.
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
  fs.writeFileSync(path.join(os.tmpdir(), 'history-migrations-ui-' + name + '.png'), Buffer.from(shot.data, 'base64'));
};
try {
  await send('Page.enable');
  await send('Page.addScriptToEvaluateOnNewDocument', { source: workspaceSetup });
  await send('Runtime.enable');await send('Network.enable');
  await send('Network.setCacheDisabled',{cacheDisabled:true});
  await send('Network.setBlockedURLs',{urls:url.startsWith('file:')?['http://*','https://*']:['https://fonts.googleapis.com/*','https://fonts.gstatic.com/*']});
  await send('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
  await send('Page.navigate',{url:url+'#2023'});
  await waitFor('!!window.HistoryMigrations && !!window.AtlasUI');
  console.log(await evaluate(`(()=>{
    const check=(v,m)=>{if(!v)throw Error(m)};stopSpin();flyToken++;
    check(!document.querySelector('#layersPanel [data-layer="migrations"]')&&!document.querySelector('#layersPanel [data-migration-record]'),'Migrations are removed from Layers');
    const trigger=document.querySelector('[data-atlas-menu="migrationsPanel"]');trigger.click();
    check(trigger.getAttribute('aria-expanded')==='true','Direct access to Migrations');
    check(document.querySelectorAll('#migrationResults [data-migration-record]').length===31,'Every history is available without expanding another menu');
    const near=document.querySelector('.migration-group');
    check(near.querySelector('h3').textContent.includes('2023')&&near.querySelectorAll('[data-migration-record]').length===4,'Histories in the displayed period appear first');
    const search=document.getElementById('migrationSearch');search.focus();const top=search.getBoundingClientRect().top;
    search.value='Belarussian';search.dispatchEvent(new Event('input',{bubbles:true}));
    check(document.querySelectorAll('[data-migration-record]').length===1&&document.getElementById('migrationResults').textContent.includes('Belarus'),'Aliases work in the dedicated search');
    check(Math.abs(search.getBoundingClientRect().top-top)<1,'Search stays in place as results change');
    search.value='WWII';search.dispatchEvent(new Event('input',{bubbles:true}));
    check(document.querySelectorAll('[data-migration-record]').length===4,'Common WWII abbreviation finds wartime and postwar histories');
    search.value='no-such-history-xyz';search.dispatchEvent(new Event('input',{bubbles:true}));
    check(document.querySelector('.migrations-empty')&&state.year===2023,'Empty search is clear and keeps the map year');
    search.value='Ukraine';search.dispatchEvent(new Event('input',{bubbles:true}));
    document.querySelector('#migrationResults [data-migration-record]').click();
    check(state.year===2023&&byId[state.sel].wiki==='Ukrainian_refugee_crisis','Opening a current-period history preserves the selected year');
    check(document.getElementById('migrationsPanel').hidden&&document.activeElement===document.getElementById('detail'),'Navigation closes the menu and focuses the reader');
    return 'Dedicated access, period grouping, search aliases, stable controls and dated navigation passed';
  })()`));
  await evaluate(`document.querySelector('#detail .close').click();AtlasTestUI.journeys();document.querySelector('[data-atlas-menu="migrationsPanel"]').focus()`);
  await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Enter',code:'Enter',windowsVirtualKeyCode:13,text:'\r'});
  await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Enter',code:'Enter',windowsVirtualKeyCode:13});
  assert(await evaluate(`!document.getElementById('migrationsPanel').hidden`),'Keyboard opens Migrations');
  await evaluate(`document.getElementById('migrationSearch').focus()`);
  await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
  await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
  assert(await evaluate(`document.getElementById('migrationsPanel').hidden&&document.activeElement.dataset.atlasMenu==='migrationsPanel'`),'Escape closes and restores trigger focus');
  console.log(await evaluate(`(()=>{
    const check=(v,m)=>{if(!v)throw Error(m)};
    state.cats=new Set(['migrations']);buildMarks();update();render();
    document.querySelector('[data-atlas-menu="migrationsPanel"]').click();
    document.getElementById('migrationVisibility').click();render();
    check(state.cats.size===0&&!activeEvents().length,'Show on map can turn off the last event category');
    check(!document.querySelector('#legend [data-k="migrations"]'),'Migrations use their dedicated visibility control instead of a global filter');
    document.querySelector('[data-atlas-menu="layersPanel"]').click();
    check(document.getElementById('migrationsPanel').hidden&&!document.getElementById('layersPanel').hidden,'Opening another control closes Migrations');
    return 'Keyboard dismissal, independent visibility and exclusive menu handling passed';
  })()`));
  const shared=await evaluate('HistoryDiscovery.urlHash()');
  await send('Page.navigate',{url:url+shared});
  await waitFor('!!window.HistoryMigrations && !!window.AtlasUI');
  assert(await evaluate(`state.cats.size===0&&!document.getElementById('migrationVisibility').checked`),'Saved views retain hidden migrations');
  await evaluate(`stopSpin();flyToken++;const s=document.getElementById('migrationSearch');s.value='';s.dispatchEvent(new Event('input',{bubbles:true}));`);
  for(const [width,height] of [[1440,1000],[1024,768],[900,700],[768,1024],[390,844],[320,568],[320,500],[844,390]]){
    await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<=860});
    await evaluate(`window.scrollTo({top:0,behavior:'instant'});`);
    await evaluate(`AtlasTestUI.journeys()`);
    assert(await evaluate(`(()=>{const r=document.getElementById('mapToolsToggle').getBoundingClientRect();return r.width>=40&&r.left>=0&&r.right<=innerWidth&&document.documentElement.scrollWidth<=innerWidth})()`),`Workspace navigation fits at ${width}×${height}`);
    await evaluate(`(()=>{const t=document.querySelector('[data-atlas-menu="migrationsPanel"]');if(t.getAttribute('aria-expanded')!=='true')t.click()})()`);
    assert(await evaluate(`(()=>{const panel=document.getElementById('migrationsPanel'),p=panel.getBoundingClientRect(),s=document.getElementById('migrationSearch').getBoundingClientRect();return p.left>=0&&p.right<=innerWidth&&p.top>=0&&p.bottom<=innerHeight&&s.top>=p.top&&s.bottom<=p.bottom})()`),`Panel and search fit at ${width}×${height}`);
    assert(await evaluate(`(()=>{const list=document.getElementById('migrationResults'),b=[...list.querySelectorAll('[data-migration-record]')].at(-1);b.scrollIntoView({block:'nearest'});const r=b.getBoundingClientRect(),p=list.getBoundingClientRect();return r.height>=44&&r.top>=p.top-1&&r.bottom<=p.bottom+1&&document.elementFromPoint(r.left+15,r.top+r.height/2)?.closest('[data-migration-record]')===b})()`),`Last result is visible and clickable at ${width}×${height}`);
    await screenshot(width+'x'+height);
    await evaluate(`document.querySelector('.migrations-close').click()`);
    assert(await evaluate(`document.getElementById('migrationsPanel').hidden&&document.activeElement.dataset.atlasMenu==='migrationsPanel'`),'Close button returns focus');
  }
  assert.deepEqual(errors,[],'No browser exceptions');
  console.log('Saved visibility and desktop, tablet, phone and landscape layouts passed');
} finally {ws.close();await fetch(cdp+'/json/close/'+tab.id);}
