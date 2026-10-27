const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const core = require('../static/historyallaround/atlas/discovery-core.js');
const {html,events} = require('../scripts/audit-history-accuracy.cjs').records();
const rights = events.filter(row => row[8] === 'womens-rights');
const event = wiki => rights.find(row => row[9] === wiki);

test('women’s rights span every atlas region and preserve the existing New Zealand identity', () => {
  assert.equal(rights.length,76);
  assert.equal(events.length,422);
  assert.equal(events[123][9],"Women's_suffrage_in_New_Zealand");
  assert.equal(events[123][8],'womens-rights');
  assert.equal(events[345][9],'Pale_of_Settlement');
  assert.equal(new Set(events.map(row => row[9])).size,events.length);
  assert.deepEqual([...new Set(rights.map(row => row[7]))].sort(),['af','am','as','eu','me','oc']);
  assert(rights.filter(row => row[0]<1800).length>=5);
  for(const row of rights){
    assert.equal(row[1],null,'These are dated milestones, not uninterrupted legal-status periods');
    assert.equal(row[15],false);
    assert(row[16].country);
    assert(['voting','education','equality','movements','violence','reproductive'].includes(row[16].topic));
  }
});

test('every rights record cites an institutional, primary legal or scholarly source and has a review', () => {
  const hosts = new Set(['artsandculture.google.com','magnacarta.cmp.uea.ac.uk','expositions.bnf.fr','www.assemblee-nationale.fr','americanhistory.si.edu','www.ncert.nic.in','www.nps.gov','archives.libraries.london.ac.uk','www.legislation.gov.uk','nzhistory.govt.nz','www.tsuda.ac.jp','peo.gov.au','finland.fi','www.parliament.uk','www.archives.gov','data.ipu.org','www.tse.jus.br','www.tihek.gov.tr','www.archives.go.jp','knowledge.unwomen.org','www.justice.gov.tn','www.gov.za','legal.un.org','www.oas.org','www.un.org','au.int','www.kenyalaw.org','afghanistan.un.org','discovery.ucl.ac.uk','www.indiacode.nic.in','tile.loc.gov','www.legifrance.gouv.fr','www.publications.gc.ca','www.parliament.gov.za','asiapacific.unfpa.org','www.electoralcommission.ie','www.legislation.govt.nz','www.argentina.gob.ar','www.internet2.scjn.gob.mx','www1.funcionpublica.gov.co','www.supremecourt.gov','www.conseil-etat.fr','www.cambridge.org','www.jstor.org','www.justice.gov','content.leg.colorado.gov','data.capitol.hawaii.gov','nyassembly.gov','www2.sos.wa.gov','www.govinfo.gov','www.fda.gov','www.nysenate.gov','capitol.texas.gov','www.sll.texas.gov','elections.cdn.sos.ca.gov','www.kansashistory.gov','www.michigan.gov','codes.ohio.gov','apps.azsos.gov','flrules.org','results.elections.myflorida.com','historicalelectiondata.coloradosos.gov','www.sos.mo.gov']);
  const reviews = JSON.parse(fs.readFileSync('docs/history-event-corrections.json')).events;
  for(const row of rights){
    const url=new URL(row[10]);
    assert.equal(url.protocol,'https:');assert(hosts.has(url.hostname),row[9]);
    const review=reviews.find(review => review.wiki===row[9]);
    assert(review,row[9]);assert.equal(review.source,row[10]);assert.equal(review.blurb,row[4]);
  }
});

test('abortion coverage includes reforms, restrictions and reversals across regions', () => {
  const reproductive=rights.filter(row => row[16].topic==='reproductive');
  assert.equal(reproductive.length,41);
  assert.deepEqual([...new Set(reproductive.map(row => row[7]))].sort(),['af','am','as','eu','me','oc']);
  for(const [wiki,year] of [['Abortion_in_Russia',1920],['Family_in_the_Soviet_Union',1936],['Abortion_in_the_Soviet_Union',1955],['Abortion_Act_1967',1967],['Roe_v._Wade',1973],["Dobbs_v._Jackson_Women's_Health_Organization",2022],['Abortion_in_Nepal',2002],['Law_27,610',2020],['Abortion_in_Colombia',2022],['Abortion_in_France',2024]])assert.equal(event(wiki)[0],year,wiki);
  assert.match(event('Roe_v._Wade')[4],/overturns.*2022/);
  assert.match(event("Dobbs_v._Jackson_Women's_Health_Organization")[4],/does not itself enact one nationwide abortion ban/);
  assert.match(event('Law_27,610')[4],/Promulgation follows in January 2021/);
  assert.match(event('Abortion_Act_1967')[4],/does not extend to Northern Ireland/);
  assert.match(event('Abortion_in_Colombia')[4],/preserving.*exceptions/);
  assert.match(event('Maputo_Protocol')[4],/does not change every national law at once/);
});

test('US abortion history separates federal rulings, state reforms, commencement and failed votes', () => {
  const usa=rights.filter(row=>row[16].topic==='reproductive'&&row[16].country.startsWith('United States'));
  assert.equal(usa.length,24);
  assert.deepEqual([...new Set(usa.map(row=>row[16].country.split(' · ')[1]).filter(Boolean))].sort(),['Arizona','California','Colorado','Florida','Hawaii','Kansas','Michigan','Missouri','New York','Ohio','Texas','Washington']);
  assert.deepEqual(Array.from(usa.filter(row=>!row[16].country.includes(' · ')),row=>row[0]).sort((a,b)=>a-b),[1873,1973,1976,1980,1992,1994,2000,2022]);
  assert.equal(events[398][9],'Abortion_in_Tunisia');
  assert.equal(events[399][9],'Comstock_Act','New US entries append after all previous shared IDs');
  for(const [wiki,year] of [['Abortion_in_Colorado_1967',1967],['Abortion_in_Hawaii_1970',1970],['Abortion_in_New_York_1970',1970],['Washington_Referendum_20',1970],['Texas_Heartbeat_Act',2021],['Texas_Human_Life_Protection_Act',2022],['2022_Kansas_abortion_referendum',2022],['November_2023_Ohio_Issue_1',2023],['2024_Arizona_Proposition_139',2024],['2024_Missouri_Amendment_3',2024]])assert.equal(event(wiki)[0],year,wiki);
  assert.match(event('Comstock_Act')[4],/later amendments and court interpretations/i);
  assert.match(event('Abortion_in_Hawaii_1970')[4],/ninety days/);
  assert.match(event('Washington_Referendum_20')[4],/husband-consent/);
  assert.match(event('Hyde_Amendment')[4],/original version has a life-saving exception/);
  assert.match(event('Planned_Parenthood_v._Casey')[4],/overturns.*2022/);
  assert.match(event('Mifepristone_FDA_approval')[4],/seven weeks/);
  assert.match(event('Texas_Human_Life_Protection_Act')[4],/2022 commencement rather than its passage/);
  assert.match(event('2024_Florida_Amendment_4')[4],/57\.17.*sixty-percent.*not adopted/);
  assert.match(event('2022_Kansas_abortion_referendum')[4],/reject.*constitution unchanged/);
  assert.match(event('2024_Missouri_Amendment_3')[4],/does not assert that every clinic reopened immediately/);
  for(const row of usa)for(const alias of ['USA','US','U.S.','United States'])assert(row[14].includes(alias),row[9]+' · '+alias);
});

test('suffrage milestones retain exclusions and advocacy is distinguished from enacted law', () => {
  assert.match(event('Commonwealth_Franchise_Act_1902')[4],/not universal suffrage/);
  assert.match(event('Nineteenth_Amendment_to_the_United_States_Constitution')[4],/Racial discrimination, citizenship exclusions/);
  assert.match(event('Representation_of_the_People_Act_1918')[4],/30/);
  assert.match(event('Representation_of_the_People_(Equal_Franchise)_Act_1928')[4],/21/);
  assert.match(event('Declaration_of_the_Rights_of_Woman_and_of_the_Female_Citizen')[4],/not an enacted grant/);
  assert.match(event('Women_in_ancient_Egypt')[4],/not the beginning/);
  assert.match(event('Women_in_Afghanistan')[4],/restriction on education/);
});

test('all women’s rights milestones use the woman emoji and remain outside Layers', () => {
  const context={window:{}};vm.runInNewContext(fs.readFileSync('static/historyallaround/atlas/event-emojis.js','utf8'),context);
  for(const row of rights)assert.equal(context.window.AtlasEventEmojis.get({kind:'event',cat:row[8],wiki:row[9]}),'👩');
  assert.match(html,/data-atlas-menu="womensRightsPanel"/);
  assert(!fs.readFileSync('static/historyallaround/atlas/historical-layers.js','utf8').includes('womens-rights'));
  assert.match(html,/x\.rights\?"":`<a href="\$\{wikiUrl/,'Rights readers use their trusted references without a Wikipedia fallback');
  const view={v:1,year:1973,left:1920,mode:'globe',borders:'history',rot:[0,0,0],pan:[0,0],zoom:1,split:.5,compare:false,changed:false,selectedYear:null,cats:['womens-rights'],record:null,polity:null,point:null,story:null};
  assert.deepEqual(core.parseView('#'+new URLSearchParams({view:JSON.stringify(view)}),2026,['womens-rights']),view);
});

test('global search includes rights country context and plural abortion queries', () => {
  const source=fs.readFileSync('static/historyallaround/atlas/search.js','utf8');
  const context=vm.createContext({core,ppl:[],HistoryCountries:{rows:[]}});
  vm.runInContext(html.match(/const EVENTS = \[[\s\S]*?\n\];/)[0]+'\n'+html.match(/^const ev=EVENTS.map.*$/m)[0]+'\n'+source.slice(source.indexOf('const localRecords ='),source.indexOf('  const datasets ='))+'\nglobalThis.records=localRecords;',context);
  const search=query=>core.search(context.records,query,'event',events.length);
  for(const [query,wiki] of [['United States abortion','Roe_v._Wade'],['USA abortions','Hyde_Amendment'],['U.S. abortion','Roe_v._Wade'],['US abortion','Planned_Parenthood_v._Casey'],['Texas abortion','Texas_Heartbeat_Act'],['Florida abortion','2024_Florida_Amendment_4'],['United Kingdom suffrage','Representation_of_the_People_Act_1918']]) {
    const id='e'+events.findIndex(row=>row[9]===wiki);
    assert(search(query).some(record=>record.recordId===id),query);
  }
  const reproductiveIds=rights.filter(row=>row[16].topic==='reproductive').map(row=>'e'+events.indexOf(row));
  const pluralResults=new Set(search('abortions').map(record=>record.recordId));
  assert(reproductiveIds.every(id=>pluralResults.has(id)),'Every reproductive milestone is found by the plural query');
});
