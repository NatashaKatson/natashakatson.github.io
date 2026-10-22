const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const population=require('../static/historyallaround/atlas/population.js');
const data=JSON.parse(fs.readFileSync('static/historyallaround/atlas/population.json'));

test('population data preserves historical observations and explicitly marks projections through 2026',()=>{
  assert.equal(data.entity,'World');
  assert.equal(data.rows[0][0],-10000);assert.equal(data.rows.at(-1)[0],2026);
  assert(data.rows.every((r,i)=>r[1]>0&&(!i||r[0]>data.rows[i-1][0])));
  assert.equal(population.at(data.rows,2023).value,8091734933);
  assert.equal(population.at(data.rows,2023).projected,false);
  assert.equal(population.at(data.rows,2026).value,8300678396);
  assert.equal(population.at(data.rows,2026).projected,true);
  assert(data.rows.every(([year,,flag])=>flag===Number(year>=2024)));
});
test('population interpolates between samples without extrapolating or exposing year zero',()=>{
  const rows=[[-100,100,0],[0,200,0],[100,300,0],[200,500,1]];
  assert.deepEqual(population.at(rows,50),{value:250,projected:false,interpolated:true});
  assert.deepEqual(population.at(rows,-50),{value:150,projected:false,interpolated:true});
  assert.equal(population.at(rows,150).projected,true);
  for(const y of [-101,201,0,NaN,Infinity])assert.equal(population.at(rows,y),null);
  assert.equal(population.at([],50),null);
  assert.match(population.format(4501152,-10000),/4\.5 million/);
  assert.match(population.format(8300678396,2026),/8\.3 billion/);
});
test('timeline endpoint stays 2026 even when the browser clock is in another year',()=>{
  const html=fs.readFileSync('static/historyallaround/atlas/index.html','utf8');
  const declaration=html.match(/^const NOW=.*$/m)[0];
  const segments=html.match(/^const SEG=.*$/m)[0];
  const yearAt=html.match(/^function yearAt\(.*$/m)[0];
  for(const fakeYear of [2020,2026,2035]){
    const context=vm.createContext({Date:class{getFullYear(){return fakeYear;}}});
    vm.runInContext(declaration+'\n'+segments+'\n'+yearAt+'\nglobalThis.result=[NOW,yearAt(1)];',context);
    assert.deepEqual(Array.from(context.result),[2026,2026]);
  }
});
