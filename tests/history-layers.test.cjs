const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const layers = require('../static/historyallaround/atlas/historical-layers-core.js');
const core = require('../static/historyallaround/atlas/discovery-core.js');
const {html,events:rows} = require('../scripts/audit-history-accuracy.cjs').records();
const context = vm.createContext({});
vm.runInContext(html.match(/const EVENTS = \[[\s\S]*?\n\];/)[0]+'\n'+html.match(/^const ev=EVENTS.map.*$/m)[0]+'\n'+html.match(/^const CATS=.*$/m)[0]+'\nglobalThis.records=ev;globalThis.categories=CATS;', context);
const records=Array.from(context.records), categories=new Set(Object.keys(context.categories));
const get=wiki=>records.find(e=>e.wiki===wiki);

test('each thematic category contains source-linked records and the existing pandemic inventory',()=>{
  for(const cat of ['trade','migrations','pandemics','climate','technology']) {
    const events=records.filter(e=>e.cat===cat);
    assert(events.length>=4,cat);
    for(const e of events)assert(e.source?.startsWith('https://'),e.wiki);
  }
  assert.equal(records.filter(e=>e.cat==='trade').length,4);
  assert.equal(records.filter(e=>e.cat==='migrations').length,31);
  assert.equal(records.filter(e=>e.cat==='pandemics').length,32);
  assert.equal(records.filter(e=>e.cat==='climate').length,7);
  assert.equal(records.filter(e=>e.cat==='technology').length,24);
  assert.equal(get('Printing_press').cat,'technology');
  assert.equal(get('1815_eruption_of_Mount_Tambora').cat,'climate');
  assert.equal(get('Smallpox_vaccine').cat,'ideas','vaccine milestones keep their science category');
  assert.equal(get('Bantu_expansion').id,'e21');
  assert.equal(get('Bantu_expansion').start,-3000,'existing dated shared references stay valid');
  assert.equal(get('Partition_of_India').id,'e140');
  assert.equal(get('Partition_of_India').start,1947);
  assert.equal(new Set(rows.map(e=>e[9])).size,rows.length);
});

test('every schematic route refers to a unique dated event with valid coordinates and direction context',()=>{
  assert.equal(layers.routes.length,34);
  assert.equal(new Set(layers.routes.map(r=>r.wiki)).size,34);
  for(const route of layers.routes){
    const event=get(route.wiki);
    assert(event,route.wiki);assert.equal(route.kind,event.cat);
    assert(event.end>event.start);
    assert(route.paths.length);
    for(const line of route.paths){
      assert(line.length>=2);
      for(const point of line){assert.equal(point.length,2);assert(Number.isFinite(point[0])&&Math.abs(point[0])<=180);assert(Number.isFinite(point[1])&&Math.abs(point[1])<=90);}
    }
    assert.deepEqual(layers.geometry(route),{type:'MultiLineString',coordinates:route.paths});
    assert.match(event.blurb,/schematic|Arrows summarise/);
  }
  assert.match(get('Atlantic_slave_trade').title,/Forced/);
  assert.match(get('Trail_of_Tears').title,/forced/);
  assert.match(get('Partition_of_India').blurb,/both directions/);
});

test('trade and migration geometry follows inclusive intervals and independent category filters',()=>{
  for(const route of layers.routes){
    const event=get(route.wiki);
    const visible=year=>layers.active(records,year,new Set([event.cat])).some(r=>r.record===event);
    for(const year of [event.start,Math.floor((event.start+event.end)/2),event.end])assert(visible(year),`${event.wiki} in ${year}`);
    assert(!visible(event.start-1));assert(!visible(event.end+1));
    assert(!layers.active(records,event.start,new Set(['pandemics'])).some(r=>r.record===event));
  }
  assert.equal(layers.active(records,-67000000,categories).length,0,'human routes never appear in deep time');
  assert(layers.active(records,1300,new Set(['trade'])).every(({record})=>record.cat==='trade'));
});

test('Explore finds a recorded period for each layer from either end of the timeline',()=>{
  for(const year of [-67000000,-10000,1000,2026])for(const cat of ['trade','migrations','pandemics','climate','technology']){
    const chosen=layers.nearest(records,cat,year);assert(chosen);assert.equal(chosen.cat,cat);
    const destination=Math.max(chosen.start,Math.min(chosen.end,year));
    assert(destination>=chosen.start&&destination<=chosen.end&&destination!==0);
  }
  assert.equal(layers.nearest(records,'unknown',2026),null);
});

test('layer names and subjects search the real adapter, including existing technology milestones',()=>{
  const source=fs.readFileSync('static/historyallaround/atlas/search.js','utf8');
  const prepare=source.slice(source.indexOf('const localRecords ='),source.indexOf('  const datasets ='));
  const sandbox=vm.createContext({core,ev:records,ppl:[],HistoryCountries:{rows:[]}});
  vm.runInContext(prepare+'\nglobalThis.searchRecords=localRecords;',sandbox);
  for(const [query,wiki] of [['trade routes','Silk_Roads'],['migration','Great_Migration_(African_American)'],['forced migration','Atlantic_slave_trade'],['climate events','Younger_Dryas'],['technology milestones','Printing_press'],['microprocessor','Intel_4004']]){
    assert(core.search(sandbox.searchRecords,query,'event',100).some(r=>r.recordId===get(wiki).id),query);
  }
  const view={v:1,year:1300,left:1958,mode:'flat',borders:'history',rot:[0,0,0],pan:[0,0],zoom:1,split:.5,compare:true,changed:false,selectedYear:null,cats:['trade','migrations','climate','technology'],record:null,polity:null,point:null,story:null};
  assert.deepEqual(core.parseView('#'+new URLSearchParams({view:JSON.stringify(view)}),2026,[...categories]),view);
});
