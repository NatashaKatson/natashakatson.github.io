// Discovery regressions: year context, geographic records, timeline, focus and responsive popovers.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
const cdp = process.env.ATLAS_CDP_URL || 'http://127.0.0.1:9231';
const url = process.env.ATLAS_TEST_URL || 'http://127.0.0.1:8891/atlas/';
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
  const call = ++id, timer = setTimeout(() => { pending.delete(call); reject(Error('CDP timeout: ' + method)); }, 20000);
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
try {
  await send('Page.enable'); await send('Runtime.enable'); await send('Network.enable');
  await send('Network.setCacheDisabled', { cacheDisabled: true });
  await send('Network.setBlockedURLs', { urls: ['https://*'] });
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 950, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: url + '#1942' });
  await waitFor('!!window.AtlasExplore && !!window.AtlasUI');
  await evaluate('stopSpin()');
  for (const width of [1440, 1024, 768, 390, 320]) {
    await send('Emulation.setDeviceMetricsOverride', { width, height: 950, deviceScaleFactor: 1, mobile: width <= 860 });
    console.log(await evaluate(`(async()=>{
      const check=(v,m)=>{if(!v)throw Error(m)};
      setYear(1942);AtlasUI.goToEvents();render();
      const intro=document.getElementById('yearIntroduction');
      check(intro.open&&intro.textContent.includes('1942 — Continuing: World War II'),'Year opens contextual introduction');
      check(intro.textContent.includes('fifty nations')&&intro.querySelector('a[href^="https://www.nationalww2museum.org"]'),'Introduction is drawn from sourced data');
      check(intro.querySelectorAll('[data-intro-record]').length===3,'Bounded regional entry points');
      check(!intro.textContent.includes('United Nations founded'),'No future events presented as simultaneous');
      document.getElementById('timelineScope').click();
      const suggestion=document.querySelector('[data-suggested-year="1928"]');
      check(suggestion.getBoundingClientRect().height>0,'Suggestions are visible in year chooser');
      suggestion.click();render();
      check(state.year===1928&&intro.textContent.includes('Penicillin'),'Suggestion introduces its year: '+state.year+' '+intro.textContent);
      check(document.getElementById('eraPanel').hidden,'Suggestion closes year chooser');
      const region=document.getElementById('browseRegion');region.value='as';region.dispatchEvent(new Event('change'));render();
      check([...document.querySelectorAll('#regions [data-id]')].every(b=>byId[b.dataset.id].region==='as'),'Events respect region');
      document.querySelector('[data-context="people"]').click();render();
      check(document.querySelector('.browse-type').hidden,'People has region browsing without event category selector');
      check([...document.querySelectorAll('#people [data-id]')].every(b=>byId[b.dataset.id].region==='as'),'People respect region');
      document.querySelector('[data-clear-browse]').click();document.querySelector('[data-context="events"]').click();
      document.getElementById('yearStep').value='100';setYear(-50);nudgeYear(1);render();
      check(state.year===51,'Century step omits year zero');
      check(document.getElementById('next').title==='Forward 100 years','Step size is explicit');
      document.getElementById('yearStep').value='1';setYear(2026);render();
      check(document.getElementById('next').disabled,'Upper endpoint year step disabled');
      document.getElementById('play').click();check(state.playing&&state.year<2026,'Replay advances from start');stopPlay();
      setYear(1928);state.mode='flat';zoomK=4;flatT={x:900,y:900};render();
      const event=ev.find(r=>r.wiki==='Penicillin');select(event.id);render();
      const point=proj([event.lon,event.lat]);
      check(Math.abs(point[0]-W/2)<1&&Math.abs(point[1]-H/2)<1,'List selection centers panned flat map');
      setYear(1928);await loadChunk(chunkOf(1928));
      const uk=polities().find(f=>/United Kingdom/.test(f.name));check(uk,'Country geometry exists');
      selectPolity(uk);render();
      const mapped=document.querySelector('.mapped-records');
      check(mapped&&mapped.querySelector('[data-id="'+event.id+'"]'),'Country context includes event by geographic containment');
      check(mapped.textContent.includes('not nationality')&&mapped.textContent.includes('people'),'Country context qualifies geography and includes people');
      const person=mapped.querySelector('[data-id^="p"]');check(person,'Country has an associated person');
      person.click();render();check(byId[state.sel].kind==='person','Country person opens biography');
      setYear(1942);state.borders='today';AtlasExplore.selectCountry(lo.countries.find(f=>f.properties.name==='France'));render();
      check(document.querySelector('.modern-geography')&&document.querySelector('.mapped-records'),'Modern geography provides qualified context');
      check(document.querySelector('.modern-geography').textContent.includes('does not establish'),'Modern geography does not imply historical sovereignty');
      setYear(1943);render();check(!document.querySelector('.modern-geography'),'Date change clears modern geographic selection');
      setYear(1942);AtlasExplore.selectCountry(lo.countries.find(f=>f.properties.name==='France'));render();
      document.querySelector('.history-search-trigger').click();
      document.querySelector('[data-search-kind="place"]').click();
      const searchInput=document.getElementById('historySearchInput');searchInput.value='Vancouver';
      searchInput.dispatchEvent(new Event('input',{bubbles:true}));
      let city;
      for(let i=0;i<150&&!city;i++){
        await new Promise(resolve=>setTimeout(resolve,70));
        city=[...document.querySelectorAll('[data-search-result]')].find(b=>b.querySelector('strong')?.textContent==='Vancouver, British Columbia, Canada');
      }
      check(city,'Vancouver search result loads');city.click();
      for(let i=0;i<150&&document.getElementById('historySearch').open;i++)await new Promise(resolve=>setTimeout(resolve,70));
      render();
      check(!document.getElementById('historySearch').open,'City search navigation completes');
      check(state.year===1942,'City search preserves the selected year');
      check(!document.getElementById('detail').hidden&&document.querySelector('.search-place-detail h3')?.textContent==='Vancouver, British Columbia, Canada','City search replaces the country card');
      check(!document.querySelector('.modern-geography'),'Country card clears after city search');
      const cityView=HistoryDiscovery.urlHash();
      document.querySelector('#detail .close').click();update();render();
      check(!document.querySelector('.modern-geography'),'Closing the city card does not restore the old country');
      AtlasExplore.selectCountry(lo.countries.find(f=>f.properties.name==='France'));render();
      await HistoryDiscovery.openView(cityView);render();
      check(document.querySelector('.search-place-detail h3')?.textContent==='Vancouver, British Columbia, Canada'&&!document.querySelector('.modern-geography'),'Restoring a city view replaces the country card');
      AtlasExplore.selectCountry(lo.countries.find(f=>f.properties.name==='France'));render();
      HistoryDiscovery.selectWater([77.56,42.45],state.year,null);render();
      check(document.querySelector('.water-context')?.textContent.includes('Issyk-Kul')&&!document.querySelector('.modern-geography'),'Lake selection replaces the country card');
      setYear(1942);AtlasUI.goToEvents();render();
      check(document.documentElement.scrollWidth<=innerWidth,'No page overflow at '+innerWidth);
      return 'PASS introductions, suggestions, filters, century steps, replay, map focus and country records at '+innerWidth+'px';
    })()`));
    if (width === 1440 || width === 390) {
      const shot = await send('Page.captureScreenshot', { format: 'png' });
      fs.writeFileSync(path.join(os.tmpdir(), 'atlas-explore-' + width + '.png'), Buffer.from(shot.data, 'base64'));
    }
  }
  console.log(await evaluate(`(()=>{
    const check=(v,m)=>{if(!v)throw Error(m)};
    const input=document.getElementById('gotoInput');input.value='1011';document.getElementById('goto').requestSubmit();render();
    check(state.year===1011&&document.getElementById('yearIntroduction').textContent.includes('1011'),'Arbitrary year keeps introduction');
    setYear(-50000000);render();
    check(document.getElementById('yearIntroduction').textContent.includes('Records are sparse'),'Sparse year has qualified period context');
    setYear(-150000000);render();check(document.getElementById('yearIntroduction').querySelector('[data-intro-record]'),'Deep time reuses fossil records');
    document.querySelector('button[data-workspace="journeys"]').click();
    document.querySelector('[data-topic-journey="technology"]').click();render();
    const first=state.year;check(document.querySelector('.topic-reader').textContent.includes('stop 1 of 5'),'Journey opens a dated first stop');
    document.querySelector('[data-route-next]').click();render();check(state.year>first,'Journey advances chronologically');
    document.querySelector('[data-route-map]').click();render();check(state.sel&&document.querySelector('#detail h3'),'Journey opens existing reader');
    return 'PASS exact year, sparse period, deep time and guided topic path';
  })()`));
  await send('Emulation.setDeviceMetricsOverride', {width:1440,height:950,deviceScaleFactor:1,mobile:false});
  console.log(await evaluate(`(async()=>{
    const check=(v,m)=>{if(!v)throw Error(m)};
    setYear(1928);AtlasUI.goToEvents();document.querySelector('[data-context="people"]').click();render();
    let more=document.querySelector('#people [data-browse-group="people"]');check(more&&!more.open,'Long people list starts bounded');
    more.open=true;const row=more.querySelector('[data-id]'),id=row.dataset.id;row.focus();row.click();render();
    document.querySelector('#detail .close').click();render();more=document.querySelector('#people [data-browse-group="people"]');
    check(more.open&&document.activeElement.dataset.id===id,'Closing biography restores expanded list and keyboard focus');
    setYear(1942);document.getElementById('compareToggle').click();
    const form=document.getElementById('compareYears');form.elements.left.value='1928';form.elements.right.value='1942';form.requestSubmit();
    await loadChunk(chunkOf(1928));const saved=state.year;state.year=1928;const uk=polities().find(f=>/United Kingdom/.test(f.name));state.year=saved;
    selectPolity(uk,1928);render();
    check(document.querySelector('.mapped-records h4').textContent.includes('1928'),'Country context follows the selected comparison side');
    const e=ev.find(r=>r.wiki==='Penicillin'),button=document.querySelector('.mapped-records [data-id="'+e.id+'"]');check(button,'Left-hand country has dated records');button.click();render();
    check(state.year===1942&&state.sel===e.id&&document.querySelector('.selection-scope').textContent.includes('left'),'Country event keeps comparison years and opens left-hand reader');
    document.getElementById('compareToggle').click();setYear(1942);state.borders='today';setMode('flat');zoomK=4;makeProj();
    const p=proj([1,44.5]);flatT.x+=W/2-p[0];flatT.y+=H/2-p[1];render();AtlasUI.goToMap();
    return 'PASS expandable list focus and country records on the left comparison side';
  })()`));
  const mapPoint=await evaluate(`(()=>{
    const rect=cv.getBoundingClientRect();
    for(let lon=-2;lon<=6;lon+=.5)for(let lat=43;lat<=49;lat+=.5){
      const p=proj([lon,lat]);
      if(p[0]>200&&p[0]<W-100&&p[1]>100&&p[1]<H-100&&!nearest(...p)&&mapAt(...p)?.country?.properties.name==='France')return{x:p[0]+rect.left,y:p[1]+rect.top};
    }
    throw Error('No unoccupied French map point');
  })()`);
  for(const type of ['mousePressed','mouseReleased'])await send('Input.dispatchMouseEvent',{type,...mapPoint,button:'left',clickCount:1});
  await waitFor('!!document.querySelector(".modern-geography")');
  assert(await evaluate(`document.querySelector('.modern-geography h3').textContent==='France'`),'Real map click opens country context');
  for(const [width,height] of [[320,570],[768,360],[1024,768],[980,600]]){
    await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<=860});
    await evaluate(`AtlasUI.goToMap();document.getElementById('timelineScope').click()`);
    assert(await evaluate(`(()=>{const r=document.getElementById('eraPanel').getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight&&r.left>=0&&r.right<=innerWidth})()`),'Year chooser fits short viewport '+width+'x'+height);
    await evaluate(`document.querySelector('[data-suggested-year="1942"]').click();AtlasUI.goToMap();document.querySelector('.atlas-quick-help').open=true`);
    assert(await evaluate(`(()=>{const r=document.querySelector('.atlas-quick-help').getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight&&r.left>=0&&r.right<=innerWidth})()`),'Optional guidance fits '+width+'x'+height);
    await evaluate(`document.querySelector('.atlas-quick-help').open=false`);
  }
  console.log('PASS real map click and year chooser on short phone and landscape viewports');
  assert.equal(errors.length, 0, JSON.stringify(errors));
  console.log('No browser runtime errors.');
} finally { await send('Page.close').catch(()=>{}); ws.close(); }
