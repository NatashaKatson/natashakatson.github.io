const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const layout=require('../static/historyallaround/atlas/cartography.js');
const dates=require('../static/historyallaround/atlas/discovery-core.js');
const periods=require('../static/historyallaround/atlas/explore-core.js');
const {html,events}=require('../scripts/audit-history-accuracy.cjs').records();
const records=events.map((r,i)=>({id:'e'+i,kind:'event',start:r[0],end:r[1]??r[0],approx:!!r[2],title:r[3],wiki:r[9],cat:r[8],ongoing:!!r[15]}));
const byWiki=wiki=>records.find(r=>r.wiki===wiki);
test('all source records have inclusive map years and no adjacent human-year leakage',()=>{
  const context=vm.createContext({DiscoveryCore:dates,state:{year:2024,cats:new Set(records.map(r=>r.cat))},ev:records});
  vm.runInContext([html.match(/^const SAME_TIME_YEARS=.*$/m)[0],...['halfWin','relevance'].map(n=>html.match(new RegExp('^function '+n+'.*$','m'))[0]),'let actMemo={};',html.match(/^function activeEvents\(\)[\s\S]*?return actMemo.v\}/m)[0]].join('\n'),context);
  for(const r of records.filter(r=>r.cat!=='dinosaurs'))for(const y of new Set([r.start,r.end,r.start-1||-1,r.end+1||1])){
    context.state.year=y;
    const ids=Array.from(vm.runInContext('activeEvents()',context),r=>r.e.id);
    assert.equal(ids.includes(r.id),y>=r.start&&y<=r.end,r.wiki+' at '+y);
  }
  assert.equal(records.length,422,'No event records removed');
  assert.deepEqual(require('../scripts/audit-history-time.cjs').audit().errors,[]);
});
test('2024 contains continuing developments and the Olympics, without neighbouring space milestones',()=>{
  for(const [wiki,year]of [['Artemis_II',2026],['James_Webb_Space_Telescope',2022],['Chandrayaan-3',2023],['Vera_C._Rubin_Observatory',2025]]){
    const r=byWiki(wiki);assert(r,wiki);assert(dates.inYear(r,year));assert(!dates.inYear(r,2024),wiki);
  }
  const invasion=byWiki('Russian_invasion_of_Ukraine');
  assert(dates.inYear(invasion,2022));assert(dates.inYear(invasion,2024));assert(!dates.inYear(invasion,2021));
  assert.equal(dates.temporalStatus(invasion,2022),'Begins in this year');
  assert.equal(dates.temporalStatus(invasion,2024),'Ongoing in this year');
  assert(!dates.inYear(byWiki('COVID-19_pandemic'),2024),'The ended global emergency is not the continuing pandemic');
  assert(dates.inYear(byWiki('COVID-19'),2024));
});
test('dense event titles avoid one another, reserved controls and other markers without truncation',()=>{
  const measure=s=>s.length*6,reserved=[[0,0,150,100],[560,0,80,60],[540,300,100,100]],markers=[];
  const rows=Array.from({length:30},(_,i)=>({id:'event'+i,x:190+i%6*45,y:130+Math.floor(i/6)*40,text:'Historical event with a complete title '+i}));
  for(const r of rows)markers.push({id:r.id,box:[r.x-9,r.y-9,18,18]});
  const options={width:640,height:400,measure,reserved,markers,limit:30},placed=layout.placeLabels(rows,options);
  assert(placed.length>0&&placed.length<rows.length);
  for(const [i,p]of placed.entries()){
    assert.equal(p.lines.join(' '),p.text);
    assert(reserved.every(b=>!layout.overlaps(p.box,b)));
    assert(markers.every(m=>!layout.overlaps(p.box,m.box)));
    assert(placed.slice(i+1).every(q=>!layout.overlaps(p.box,q.box)));
  }
  assert.deepEqual(layout.placeLabels(rows,options),placed);
});
test('selection, hover and major events win scarce label space independently of dataset order',()=>{
  const common={x:160,y:120,text:'A historical event'},options={width:360,height:240,measure:s=>s.length*6,limit:1};
  const secondary={...common,id:'a',wiki:'secondary'},major={...common,id:'z',wiki:'World_War_II'};
  assert.equal(layout.placeLabels([secondary,major],options)[0].id,'z');
  assert.equal(layout.placeLabels([major,{...secondary,selected:true}],options)[0].id,'a');
  assert.equal(layout.placeLabels([major,{...secondary,hovered:true}],options)[0].id,'a');
});
test('period labels agree across controls and use calendar-correct century boundaries',()=>{
  const context=vm.createContext({});vm.runInContext(html.match(/^const ERAS=.*$/m)[0]+'\n'+html.match(/^function eraOf.*$/m)[0],context);
  for(const [year,name]of [[1800,'Early modern period'],[1801,'19th century'],[1900,'19th century'],[1901,'20th century'],[2000,'20th century'],[2001,'21st century'],[2024,'21st century']]){
    context.year=year;assert.equal(vm.runInContext('eraOf(year)',context),name);assert.equal(periods.period(year).name,name);
  }
});
test('map category icons use consistent vector paths independent of emoji fonts',()=>{
  for(const wiki of layout.major)assert(byWiki(wiki),'Priority metadata references an existing record: '+wiki);
  for(const cat of new Set(records.map(r=>r.cat).filter(c=>c!=='dinosaurs'))){assert.match(layout.svg(cat),/<svg/);assert.match(layout.svg(cat),/stroke-width="1.4"/);assert.match(layout.svg(cat),/<path/);}
  assert.equal(layout.symbolKey({cat:'ideas',wiki:'Penicillin'}),'medicine');
});
