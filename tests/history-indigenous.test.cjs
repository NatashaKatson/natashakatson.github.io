const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const core=require('../static/historyallaround/atlas/discovery-core.js');
const challenge=require('../static/historyallaround/atlas/challenge-core.js');
const beringia=require('../static/historyallaround/atlas/beringia.js');
const buildTours=require('../static/historyallaround/atlas/indigenous-tours.js');
const rows=Array.from(require('../scripts/audit-history-accuracy.cjs').records().events,r=>Array.from(r));
const records=rows.map((r,i)=>({id:'e'+i,kind:'event',cat:r[8],start:r[0],end:r[1]??r[0],title:r[3],blurb:r[4],lat:r[5],lon:r[6],region:r[7],wiki:r[9],source:r[10],indigenous:r[13]}));
const tours=buildTours(records,beringia);
const row=(wiki)=>rows.find(r=>r[9]===wiki);

test('Indigenous map and search coverage includes multiple world regions and reviewed sources',()=>{
  const contexts=records.filter(r=>r.indigenous&&!r.indigenous.evidence);
  assert(contexts.length>=30);
  for(const region of ['am','as','eu','af','oc'])assert(contexts.some(r=>r.region===region),region);
  const reviews=JSON.parse(fs.readFileSync('docs/history-event-corrections.json')).events;
  for(const r of contexts){
    assert.equal(new URL(r.source).protocol,'https:');
    assert(!new URL(r.source).hostname.endsWith('wikipedia.org'));
    assert(r.indigenous.mapLabel&&r.indigenous.aliases.length);
    assert.equal(reviews.find(x=>x.wiki===r.wiki)?.source,r.source);
  }
  const searchable=core.prepareSearch(contexts.map(r=>({kind:'event',title:r.title,description:r.blurb,aliases:r.indigenous.aliases})));
  for(const query of ['Indigenous Russia','Iroquois','Coast Salish','Maori','Ainu','Nenets','Quechua','Wajapi','Rapa Nui'])assert(core.search(searchable,query).length,query);
  assert(core.search(searchable,'Indigenous Russia').length>=3);
});

test('Indigenous milestones use event dates rather than continuing-community windows',()=>{
  const milestones={
    Musqueam_Indian_Band:500,Haudenosaunee:1794,Lenape:1614,SGang_Gwaay:1981,
    New_Echota:1825,Cherokee_Nation:1839,Nunavut:1999,Nenets_people:2009,
    Olonkho:2005,Beringia_National_Park:2013,Saami_Council:1956,Ainu_culture:2009,
    Budj_Bim_heritage_areas:-4500,Tsodilo:2001,Wayampi:2003,Queshuachaca:2013,
  };
  for(const [wiki,year] of Object.entries(milestones)){
    assert.deepEqual(row(wiki).slice(0,2),[year,null],wiki);
    assert.equal(core.isHistoricalContext(records.find(r=>r.wiki===wiki),year),false,wiki);
  }
  assert.equal(records.filter(r=>r.indigenous&&r.end===2026).length,0);
  assert.match(row('Cherokee_Nation')[3],/constitution/);
  assert.match(row('Haudenosaunee')[3],/Treaty of Canandaigua/);
  assert.match(row('Nenets_people')[4],/publication/);
  assert.equal(row('Musqueam_Indian_Band')[2],1,'rounded archaeological date remains approximate');
  assert.equal(row('Budj_Bim_heritage_areas')[2],1,'early aquaculture date remains approximate');
  assert(row('New_Echota')[6]>-90&&row('Cherokee_Nation')[6]<-90);
  assert(row('Lenape')[5]>42,'Fort Nassau is on the upper Hudson, not Manhattan');
});

test('genuine archaeological periods and dating uncertainty are preserved',()=>{
  assert.deepEqual(row('Poverty_Point').slice(0,2),[-1700,-1100]);
  assert.deepEqual(row('Chaco_Culture').slice(0,2),[850,1250]);
  assert.deepEqual(row('History_of_New_Zealand').slice(0,2),[1250,1300]);
  assert.equal(rows.filter(r=>r[9]==='History_of_New_Zealand').length,1);
  assert(!rows.some(r=>r[9]==='Māori_history'),'settlement is not duplicated as a new event');
});

test('same-year suggestions exclude unrelated community histories and treat short events consistently',()=>{
  const anchor={id:'anchor',kind:'event',region:'af',start:1956,end:1956};
  const contemporary=core.meanwhile(anchor,records,1956);
  const saami=records.find(r=>r.wiki==='Saami_Council');
  assert.deepEqual(core.meanwhile(anchor,[saami],1956),[saami]);
  for(const wiki of ['Cherokee_Nation','Musqueam_Indian_Band','Haudenosaunee','Nenets_people','Budj_Bim_heritage_areas']){
    assert(!contemporary.some(r=>r.wiki===wiki),wiki);
    assert.deepEqual(core.meanwhile(anchor,[records.find(r=>r.wiki===wiki)],1956),[],wiki);
  }
  const resistance=records.find(r=>r.wiki==='Red_River_Resistance');
  assert.equal(core.isHistoricalContext(resistance,1870),false,'a two-year Indigenous event is dated like any other event');
  assert.equal(core.isHistoricalContext({...resistance,indigenous:undefined},1870),false);
});

test('all discovery stops reuse dated records and their primary source links',()=>{
  assert.equal(new Set(tours.map(t=>t.id)).size,3);
  for(const tour of tours){
    assert(tour.introduction&&tour.note);
    assert.equal(new Set(tour.stops.map(s=>s.id)).size,tour.stops.length);
    for(const s of tour.stops){
      assert(s.year>=tour.start&&s.year<=tour.end);
      assert(s.point.length===2&&s.sources.length&&s.text);
      if(s.id==='overview')continue;
      const record=records.find(r=>r.title===s.title);
      assert(record&&s.year>=record.start&&s.year<=record.end,s.id);
      assert.deepEqual(s.point,[record.lon,record.lat]);
      assert.equal(s.sources[0][1],record.source);
    }
  }
});

test('Beringia evidence does not become a single migration chronology or modern ethnic identity',()=>{
  assert.equal(beringia.sites.length,4);
  for(const site of beringia.sites)assert(row(site.wiki)[13].evidence);
  assert.equal(row('Yana_RHS')[0],-29650);
  assert.equal(row('Swan_Point_Archaeological_Site')[0],-12250);
  assert.equal(row('Upward_Sun_River_site')[0],-9550);
  assert(row('White_Sands_fossil_footprints')[1]<row('Swan_Point_Archaeological_Site')[0]);
  const tour=tours.find(t=>t.id===beringia.id);
  assert.match(tour.note,/not successive stops/);
  assert.match(tour.mapNote,/Modern coastlines/);
  assert(beringia.sources.some(s=>s[1].includes('s41598-024-54592-x')));
  assert(beringia.routes.some(r=>r.coordinates.some(p=>p[0]>170)&&r.coordinates.some(p=>p[0]<-160)), 'Beringia crosses the dateline');
  for(const file of ['beringia.js','indigenous-tours.js','discovery.js','search.js'])new vm.Script(fs.readFileSync('static/historyallaround/atlas/'+file,'utf8'));
});

test('overview start years cannot be used as exact event dates in daily quizzes',()=>{
  const events=[1600,1700,1800].map((start,i)=>({wiki:'dated-'+i,start,end:start,approx:false}));
  const overview={wiki:'nation-overview',start:1500,end:2026,approx:false};
  const puzzles=challenge.daily([...events,overview],[],'2026-10-23');
  const order=puzzles.find(p=>p.kind==='order');
  assert(order);
  assert(!order.options.includes(overview));
  assert.deepEqual(order.correct.map(r=>r.start),[1600,1700,1800]);
});
