const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const core = require('../static/historyallaround/atlas/challenge-core.js');
const {distance} = require('../static/historyallaround/atlas/discovery-core.js');
const html = fs.readFileSync('static/historyallaround/atlas/index.html','utf8');
const context = vm.createContext({});
vm.runInContext(html.match(/const EVENTS = \[[\s\S]*?\n\];/)[0] + '\n' +
  html.match(/const PEOPLE = \[[\s\S]*?\n\];/)[0] + '\nglobalThis.data={EVENTS,PEOPLE};',context);
const events = Array.from(context.data.EVENTS, (e,i)=>({id:'e'+i,kind:'event',start:e[0],end:e[1]??e[0],approx:!!e[2],title:e[3],blurb:e[4],lat:e[5],lon:e[6],region:e[7],cat:e[8],wiki:e[9]}));
const people = Array.from(context.data.PEOPLE,(p,i)=>({id:'p'+i,kind:'person',name:p[0],born:p[1],died:p[2],approx:!!p[3],role:p[4],lat:p[5],lon:p[6],region:p[7],wiki:p[8]}));

test('daily sets are deterministic, change by date, and do not depend on array order',()=>{
  const a=core.daily(events,people,'2026-10-22');
  assert.equal(core.signature(a),core.signature(core.daily(events.slice().reverse(),people.slice().reverse(),'2026-10-22')));
  assert.notEqual(core.signature(a),core.signature(core.daily(events,people,'2026-10-23')));
  assert.deepEqual(a.map(q=>q.kind),['order','place','overlap']);
});

test('a year of sets has unambiguous chronology, one overlapping pair, valid map answers and no year zero',()=>{
  for(let n=0;n<366;n++){
    const date=new Date(2026,0,n+1,12);
    const set=core.daily(events,people,core.localDay(date));
    assert.equal(set.length,3);
    const [order,place,overlap]=set;
    assert(order.correct.every((r,i)=>!r.approx&&r.start!==0&&(i===0||r.start-order.correct[i-1].start>=20)));
    assert(!order.options.every((r,i)=>r===order.correct[i]),'initial order is not already solved');
    assert(!place.record.approx&&place.record.start!==0);
    assert(overlap.from<=overlap.year&&overlap.year<=overlap.to&&overlap.year!==0);
    assert.equal(overlap.options.filter(o=>Math.max(...o.people.map(p=>p.born))<=Math.min(...o.people.map(p=>p.died))).length,1);
    assert(overlap.options.every(o=>o.people.every(p=>!p.approx)));
    assert.equal(core.grade(order,{value:order.correct.map(core.key)},distance),true);
    assert.equal(core.grade(order,{value:order.options.map(core.key)},distance),false);
    assert.equal(core.grade(place,{value:[place.record.lon,place.record.lat]},distance),true);
    assert.equal(core.grade(overlap,{value:overlap.correct},distance),true);
  }
});

test('location grading handles distant guesses, the antimeridian, skips and invalid values',()=>{
  const q={kind:'place',record:{lon:179.9,lat:0},tolerance:500};
  assert.equal(core.grade(q,{value:[-179.9,0]},distance),true);
  assert.equal(core.grade(q,{value:[0,0]},distance),false);
  assert.equal(core.grade(q,{value:null},distance),false);
  for(const value of [[0,91],[181,0],[NaN,0],[],['0',0],{lon:0,lat:0}])assert.equal(core.grade(q,{value},distance),null);
});

test('progress is validated against the local day and exact question signature',()=>{
  const day='2026-10-22', set=core.daily(events,people,day);
  const answers=[{value:set[0].correct.map(core.key)},{value:null},{value:set[2].correct}];
  const raw=JSON.stringify({day,signature:core.signature(set),answers});
  assert.deepEqual(core.readProgress(raw,day,set),answers);
  assert.deepEqual(core.readProgress(raw,'2026-10-23',set),[null,null,null]);
  assert.deepEqual(core.readProgress('{broken',day,set),[null,null,null]);
  assert.deepEqual(core.readProgress('x'.repeat(32001),day,set),[null,null,null]);
  const tampered=JSON.parse(raw);tampered.answers[0]={value:[core.key(set[0].correct[0]),core.key(set[0].correct[0]),'unknown']};
  assert.equal(core.readProgress(JSON.stringify(tampered),day,set)[0],null);
  tampered.signature+='changed';assert.deepEqual(core.readProgress(JSON.stringify(tampered),day,set),[null,null,null]);
});

test('calendar keys use browser local dates and challenge scripts remain valid JavaScript',()=>{
  assert.equal(core.localDay({getFullYear:()=>2026,getMonth:()=>0,getDate:()=>2}),'2026-01-02');
  new vm.Script(fs.readFileSync('static/historyallaround/atlas/challenge.js','utf8'));
  assert.match(html,/challenge-core\.js/);assert.match(html,/challenge\.js/);
});
