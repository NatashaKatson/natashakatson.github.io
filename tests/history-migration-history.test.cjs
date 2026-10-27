const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const core=require('../static/historyallaround/atlas/discovery-core.js');
const layers=require('../static/historyallaround/atlas/historical-layers-core.js');
const {html,events:rows}=require('../scripts/audit-history-accuracy.cjs').records();
const context=vm.createContext({});
vm.runInContext(html.match(/const EVENTS = \[[\s\S]*?\n\];/)[0]+'\n'+html.match(/^const ev=EVENTS.map.*$/m)[0]+'\nglobalThis.events=ev;',context);
const events=Array.from(context.events),added=events.slice(322);
const byWiki=wiki=>events.find(e=>e.wiki===wiki);

test('war and revolution coverage expands the migration catalogue without duplicate stories',()=>{
  assert.equal(added.length,24);
  assert.equal(events.filter(e=>e.cat==='migrations').length,30);
  assert.equal(new Set(events.map(e=>e.wiki)).size,events.length);
  for(const event of added){
    assert.equal(event.cat,'migrations');
    assert(event.source.startsWith('https://'));
    if(event.wiki==='Pale_of_Settlement'){assert(!layers.routes.some(r=>r.wiki===event.wiki));continue;}
    assert(layers.routes.some(r=>r.wiki===event.wiki));
    assert(event.aliases.includes('refugees')||event.aliases.includes('forced deportation'));
    assert.equal(event.indigenous,null);
    assert.match(event.blurb,/schematic/);
  }
  for(const wiki of ['French_emigration_(1789–1815)','Haitian_Americans','Mexican_immigration_to_the_United_States','White_émigré','Hungarian_Revolution_of_1956','Belgian_refugees_in_the_First_World_War','Armenian_genocide','Displaced_persons_camps_in_post–World_War_II_Europe','Vietnamese_boat_people','Afghan_refugees','Bosnian_War','Great_Lakes_refugee_crisis','Refugees_of_the_Syrian_civil_war','Ukrainian_refugee_crisis'])assert(byWiki(wiki),wiki);
});

test('specific war and revolution searches navigate the actual event adapter',()=>{
  const source=fs.readFileSync('static/historyallaround/atlas/search.js','utf8');
  const prepare=source.slice(source.indexOf('const localRecords ='),source.indexOf('  const datasets ='));
  const sandbox=vm.createContext({core,ev:events,ppl:[],HistoryCountries:{rows:[]}});
  vm.runInContext(prepare+'\nglobalThis.searchRecords=localRecords;',sandbox);
  for(const [query,wiki] of [
    ['American Revolution','Expulsion_of_the_Loyalists'],
    ['French Revolution','French_emigration_(1789–1815)'],
    ['Haitian Revolution','Haitian_Americans'],
    ['Mexican Revolution','Mexican_immigration_to_the_United_States'],
    ['Russian Revolution','White_émigré'],
    ['World War I','Belgian_refugees_in_the_First_World_War'],
    ['World War II','Displaced_persons_camps_in_post–World_War_II_Europe'],
    ['Hungarian Revolution','Hungarian_Revolution_of_1956'],
    ['Ukraine refugees','Ukrainian_refugee_crisis'],
    ['Russian Revolution 1917','White_émigré'],
    ['Russian Ukraine war 2023','Ukrainian_refugee_crisis'],
    ['Belarussian Poland 2020','Belarusian_diaspora'],
    ['Jews WW2','Holocaust_trains'],
    ['Pale of Settlement','Pale_of_Settlement'],
  ])assert(core.search(sandbox.searchRecords,query,'event',100).some(r=>r.recordId===byWiki(wiki).id),query);
});

test('Pale of Settlement is dated residency context, without an invented migration route',()=>{
  const event=byWiki('Pale_of_Settlement');
  assert.equal(event.start,1791);assert.equal(event.end,1917);
  assert.equal(event.source,'https://encyclopedia.yivo.org/article/246');
  assert(core.isHistoricalContext(event,1850));
  assert.match(event.blurb,/Boundaries, exemptions/);
  assert.match(event.blurb,/Mogilev marker/);
  assert(!layers.routes.some(route=>route.wiki===event.wiki));
  assert(!layers.active(events,1850,new Set(['migrations'])).some(({record})=>record===event));
});

test('requested Belarusian, Russian and Jewish histories appear in their stated years with distinct contexts',()=>{
  for(const [wiki,year] of [['Belarusian_diaspora',2020],['White_émigré',1917],['Ukrainian_refugee_crisis',2023],['Jewish_refugees_from_Nazi_Germany_and_German-occupied_Europe',1943],['Kindertransport',1939],['Holocaust_trains',1943],['Displaced_persons_camps_in_post–World_War_II_Europe',1948]]){
    assert(layers.active(events,year,new Set(['migrations'])).some(({record})=>record.wiki===wiki),`${wiki} in ${year}`);
  }
  assert.equal(byWiki('Belarusian_diaspora').ongoing,true);
  assert.match(byWiki('Belarusian_diaspora').blurb,/Not every/);
  assert.match(byWiki('Kindertransport').blurb,/without their parents/);
  assert.match(byWiki('Holocaust_trains').blurb,/not refugee escape/);
  assert.match(byWiki('Jewish_refugees_from_Nazi_Germany_and_German-occupied_Europe').blurb,/postwar resettlement have separate records/);
});

test('ongoing displacement uses the coverage cutoff while historical war windows remain bounded',()=>{
  for(const wiki of ['Refugees_of_the_Syrian_civil_war','Ukrainian_refugee_crisis']){
    const event=byWiki(wiki);assert.equal(event.ongoing,true);assert.equal(event.end,2026);assert.match(event.blurb,/2026/);
    assert(layers.active(events,2026,new Set(['migrations'])).some(r=>r.record===event));
  }
  for(const [wiki,during,after] of [['White_émigré',1920,1924],['Bosnian_War',1993,1996],['Armenian_genocide',1915,1917]]){
    const event=byWiki(wiki);assert.equal(event.ongoing,false);
    assert(layers.active(events,during,new Set(['migrations'])).some(r=>r.record===event));
    assert(!layers.active(events,after,new Set(['migrations'])).some(r=>r.record===event));
  }
  assert.match(byWiki('Armenian_genocide').blurb,/forced displacement/);
  assert.match(byWiki('Hungnam_evacuation').blurb,/displacement does not end/);
  assert.match(byWiki('Vietnamese_boat_people').blurb,/not the end/);
});
