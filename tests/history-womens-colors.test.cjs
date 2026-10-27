const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const crypto = require('node:crypto');
const core = require('../static/historyallaround/atlas/womens-empowerment-core.js');
const data = require('../static/historyallaround/atlas/womens-empowerment.json');
const model = core.create(data);
const score = (name,year) => model.score({name},year);

test('pinned empowerment data preserves observations, precision, source and license', () => {
  assert.equal(data.entities.length,197);
  assert.equal(data.entities.reduce((n,u)=>n+u.values.filter(v=>v!==null).length,0),27190);
  assert.equal(data.sourceSha256,crypto.createHash('sha256').update(fs.readFileSync('scripts/sources/womens-empowerment/vdem-v16-owid.csv')).digest('hex'));
  assert.equal(data.firstYear,1789);assert.equal(data.lastYear,2025);
  assert.equal(data.license,'CC BY-SA 4.0');assert.match(data.citation,/V-Dem.*2026/);
  assert(!data.entities.some(u=>['World','Europe','Asia','Africa'].includes(u.name)||u.name.includes('population-weighted')));
  for(const u of data.entities)for(const v of u.values)assert(v===null||(Number.isInteger(v)&&v>=0&&v<=1000));
});

test('Canada and Afghanistan change color with the published annual scores', () => {
  assert.equal(score('Canada',1900).value,.368);assert.equal(score('Canada',2025).value,.872);
  assert.equal(core.color(score('Canada',2025)),'#398565');
  assert.equal(score('Afghanistan',2020).value,.494);assert.equal(score('Afghanistan',2021).value,.047);
  assert.equal(score('Afghanistan',2025).value,.028);
  assert.equal(core.color(score('Afghanistan',2025)),'#b83d46');
  assert.notEqual(core.color(score('Afghanistan',2020)),core.color(score('Afghanistan',2021)));
});

test('ancient dates and missing years remain unknown; 2026 identifies its latest observation', () => {
  for(const year of [-10000,1,1788,1899])assert.equal(score('Canada',year),null);
  assert.equal(score('France',1852),null,'An internal gap is not carried forward');
  assert.equal(core.color(null),core.missing);
  assert.deepEqual(score('Canada',2026),{value:.872,year:2025,requestedYear:2026,entity:'Canada',code:'CAN'});
  assert.equal(score('Canada',2027),null);
  const fixture=core.create({...data,entities:[{name:'Test',code:'',first:2000,values:[0,null,500]}]});
  assert.equal(fixture.score({name:'Test'},2000).value,0);
  assert.equal(fixture.score({name:'Test'},2001),null);
});

test('historical identities preserve divided Germany and the China/Taiwan distinction', () => {
  assert.equal(score('Federal Republic of Germany',1950).entity,'West Germany');
  assert.equal(score('German Democratic Republic',1950).entity,'East Germany');
  assert.notEqual(score('Federal Republic of Germany',1950).value,score('German Democratic Republic',1950).value);
  assert.equal(score('Federal Republic of Germany',2025).entity,'Germany');
  assert.equal(score('Republic of China',1930).entity,'China');
  assert.equal(score('Republic of China',2025).entity,'Taiwan');
  assert.equal(score('Kingdom of Afghanistan',1950).entity,'Afghanistan');
});

test('colonial envelopes and unmapped territories do not inherit parent-country scores', () => {
  for(const f of [{name:'French Africa',member:'French Third Republic'},{name:'British Colonial Empire',member:'British Empire'},{name:'Greenland',member:'Kingdom of Denmark',territoryOverlay:true},{name:'Crimea (occupied by Russia)',member:'Ukraine'},{name:'Gagauzia',member:'Republic of Moldova'}])assert.equal(model.score(f,2024),null,f.name);
  const features=[{name:'French Third Republic',member:''},{name:'French Third Republic',member:'French Third Republic'}];
  const aggregates=core.aggregates(features);
  assert.equal(model.score(features[0],1900,aggregates),null);
  assert.equal(model.score(features[1],1900,aggregates).entity,'France');
});

test('modern basemap aliases match exactly without fuzzy or parent matching', () => {
  assert.equal(model.score({properties:{name:'United States of America'}},2025).entity,'United States');
  assert.equal(model.score({wiki:'North_Macedonia',name:'Republic of North Macedonia'},2025).entity,'North Macedonia');
  assert.equal(score('Republic of the Congo',2025).entity,'Congo');
  assert.equal(score('Democratic Republic of the Congo',2025).entity,'Democratic Republic of Congo');
  assert.equal(score('Canada invented province',2025),null);
});

test('country colors round-trip in shared views; older views work and malformed flags are rejected', () => {
  const discovery = require('../static/historyallaround/atlas/discovery-core.js');
  const view={v:1,year:2026,left:1900,mode:'flat',borders:'history',rot:[0,0,0],pan:[0,0],zoom:1,split:.5,compare:true,changed:false,selectedYear:null,cats:[],record:null,polity:null,point:null,story:null};
  const parse=v=>discovery.parseView('#'+new URLSearchParams({view:JSON.stringify(v)}),2026,[]);
  assert.deepEqual(parse(view),view);
  assert.deepEqual(parse({...view,rightsColors:true}),{...view,rightsColors:true});
  assert.equal(parse({...view,rightsColors:'true'}),null);
});
