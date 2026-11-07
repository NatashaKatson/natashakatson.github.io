#!/usr/bin/env node
// Exhaustive display-policy audit. Existing source reviews are evidence, not a fresh source certification.
const fs=require('node:fs');
const {records}=require('./audit-history-accuracy.cjs');
const core=require('../static/historyallaround/atlas/discovery-core.js');
function audit() {
  const {events}=records(),ledger=require('../docs/history-event-corrections.json');
  const reviews=new Map(ledger.events.map(r=>[r.wiki,r])),errors=[],counts={};
  const entries=events.map(row=>{
    const r={kind:'event',start:row[0],end:row[1]??row[0],approx:!!row[2],title:row[3],cat:row[8],wiki:row[9],source:row[10],ongoing:!!row[15]};
    const type=core.temporalKind(r);counts[type]=(counts[type]||0)+1;
    const review=reviews.get(r.wiki);
    if(!review||review.source!==r.source)errors.push(r.wiki+': missing or mismatched source-review provenance');
    if(r.cat!=='dinosaurs'){
      for(const y of new Set([r.start,r.end,Math.floor((r.start+r.end)/2)||1]))if(y>=r.start&&y<=r.end&&!core.inYear(r,y))errors.push(r.wiki+': missing supported year '+y);
      for(const y of [r.start-1||-1,r.end+1||1])if(core.inYear(r,y))errors.push(r.wiki+': leaks into unsupported year '+y);
      if(r.ongoing&&r.end!==2026)errors.push(r.wiki+': ongoing coverage is not bounded at atlas cutoff');
    }
    return {wiki:r.wiki,title:r.title,start:r.start,end:r.end,approximate:r.approx,temporalKind:type,
      source:r.source,sourceReview:review?.reason||null,rechecked:review?.rechecked||null,
      activeIn2024:core.inYear(r,2024),ongoingEndIsCoverageLimit:r.ongoing};
  });
  return {reviewed:'2026-11-07',scope:'All 422 event records scanned for temporal classification, inclusive endpoints, adjacent-year leakage, ongoing cutoff semantics and linkage to the existing source-review ledger. Recent space milestones, ongoing Ukraine conflict and emergency/pandemic distinctions rechecked against primary sources. This does not independently reverify all historical facts in the older ledger.',
    policy:'Human milestones use their recorded year only. Intervals use inclusive documented years; ongoing 2026 endpoints are coverage limits. Approximate point dates remain approximate, without invented uncertainty intervals. Fossils retain their explicitly disclosed million-year age window.',
    counts:{events:entries.length,...counts},errors,events:entries};
}
module.exports={audit};
if(require.main===module){const result=audit();if(process.argv[2])fs.writeFileSync(process.argv[2],JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({counts:result.counts,errors:result.errors},null,2));process.exitCode=result.errors.length?1:0;}
