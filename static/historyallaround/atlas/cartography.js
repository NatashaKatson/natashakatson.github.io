/* Font-independent map symbols and deterministic screen-space label placement. */
(function(root) {
  // Editorial emphasis for map orientation, not a historical ranking of cultures.
  const major = new Set(['World_War_I','World_War_II','The_Holocaust','Russian_invasion_of_Ukraine',
    'COVID-19','Black_Death','French_Revolution','United_States_Declaration_of_Independence','Industrial_Revolution',
    'Fall_of_Constantinople','Apollo_11','James_Webb_Space_Telescope','Artemis_II',
    'Partition_of_India','Atlantic_slave_trade','Haitian_Revolution']);
  const symbols = {
    power: 'M4 12 3 5l4 3 3-5 3 5 4-3-1 7ZM4 15h12',
    war: 'M4 3 15 14M3 4l2-2M12 15l3-3M17 3 6 14M16 2l2 2M5 12l3 3',
    ideas: 'M7 12C1 6 6 2 10 2s9 4 3 10v3H7ZM8 18h4M7 12h6',
    technology: 'M7 2h6v3l3 2 2-1 2 5-3 1-1 3 1 2-5 2-1-3-3-1-2 1-2-5 3-1 1-3ZM13 10a3 3 0 1 0-6 0 3 3 0 0 0 6 0',
    culture: 'M10 2a8 8 0 1 0 0 16h1c3 0 1-4 3-5s4-1 4-4a8 8 0 0 0-8-7ZM6 6h.1M11 5h.1M15 8h.1M5 11h.1',
    nature: 'M16 3C5 1 1 7 6 13s12-1 10-10ZM4 17 14 6M8 12l-1-4M11 9l4 1',
    fashion: 'M3 17 14 3c3-3 5 0 2 3ZM13 5l2 1M3 17c8 4 12-1 6-3',
    pandemics: 'M10 5a5 5 0 1 0 0 10 5 5 0 0 0 0-10ZM10 2v3M10 15v3M2 10h3M15 10h3M4 4l2 2M14 14l2 2M4 16l2-2M14 6l2-2M8 9h.1M12 11h.1',
    trade: 'M2 13h16l-3 5H6ZM10 2v11M10 3l6 7h-6M8 6l-5 5h5',
    migrations: 'M2 6h14l-4-4M16 6l-4 4M18 14H4l4 4M4 14l4-4',
    climate: 'M8 12V4a2 2 0 0 1 4 0v8a4 4 0 1 1-4 0ZM10 8v7M15 5h3M15 9h2',
    'womens-rights': 'M10 2a5 5 0 1 0 0 10 5 5 0 0 0 0-10ZM10 12v7M7 16h6',
    medicine: 'M7 2h6v5h5v6h-5v5H7v-5H2V7h5Z',
  };
  const medical = /medicine|medical|vaccine|penicillin|insulin|artemisinin|stethoscope|transplant|semmelweis|antiseptic|blood_group|x-ray/i;
  const symbolKey = r => medical.test([r.wiki,r.title,...(r.aliases||[])].join(' ')) && r.cat !== 'pandemics' ? 'medicine' : r.cat;
  const overlaps = (a,b,pad=0) => a[0]<b[0]+b[2]+pad && a[0]+a[2]+pad>b[0] && a[1]<b[1]+b[3]+pad && a[1]+a[3]+pad>b[1];
  const priority = r => (r.selected?10000:0)+(r.hovered?5000:0)+(major.has(r.wiki)?100:0)+(r.indigenous?15:0)+(r.start===r.year?10:0);
  function wrap(text, maxWidth, measure) {
    const lines=[];let line='';
    for (const word of String(text).split(/\s+/)) {
      if (line && measure(line+' '+word)>maxWidth) { lines.push(line);line=''; }
      // Break exceptionally long words rather than silently removing their end.
      if (measure(word)>maxWidth) {
        if (line) { lines.push(line);line=''; }
        for (const letter of word) { if (line && measure(line+letter)>maxWidth) { lines.push(line);line=''; } line+=letter; }
      } else line=line?line+' '+word:word;
    }
    if (line) lines.push(line);
    return lines;
  }
  function placeLabels(records,{width,height,measure,reserved=[],markers=[],bounds=[6,6,width-12,height-12],limit=12}) {
    const placed=[],occupied=reserved.slice();
    const ordered=records.slice().sort((a,b)=>priority(b)-priority(a)||String(a.id).localeCompare(String(b.id),undefined,{numeric:true}));
    for (const r of ordered) {
      if (placed.length>=limit && !r.selected && !r.hovered) continue;
      const maxWidth=Math.min(r.selected||r.hovered?270:200,bounds[2]-16);
      if (maxWidth<45) continue;
      const lines=wrap(r.text,maxWidth,measure);
      if (lines.length>3 && !r.selected && !r.hovered) continue;
      const w=Math.max(...lines.map(measure))+10,h=lines.length*15+6;
      const near=r.selected?24:15;
      const offsets=[[near,-h/2],[-near-w,-h/2],[-w/2,-near-h],[-w/2,near],
        [17,-h-8],[-17-w,-h-8],[17,10],[-17-w,10]];
      if (r.selected || r.hovered || major.has(r.wiki)) for (const distance of [40,64,92,124]) offsets.push([-w/2,-distance-h],[-w/2,distance],[distance,-h/2],[-distance-w,-h/2]);
      // Major/selected labels can use remaining whitespace away from dense cities.
      // Search a bounded grid in distance order; their leader line preserves location.
      if (r.selected || r.hovered || major.has(r.wiki)) {
        const free=[];
        for(let y=bounds[1];y+h<=bounds[1]+bounds[3];y+=24)for(let x=bounds[0];x+w<=bounds[0]+bounds[2];x+=24)free.push([x-r.x,y-r.y]);
        free.sort((a,b)=>Math.hypot(a[0]+w/2,a[1]+h/2)-Math.hypot(b[0]+w/2,b[1]+h/2));offsets.push(...free);
      }
      for (const [dx,dy] of offsets) {
        const box=[r.x+dx,r.y+dy,w,h];
        if (box[0]<bounds[0] || box[1]<bounds[1] || box[0]+w>bounds[0]+bounds[2] || box[1]+h>bounds[1]+bounds[3]) continue;
        if (occupied.some(b=>overlaps(box,b,3)) || markers.some(m=>overlaps(box,m.box,2))) continue;
        placed.push({...r,lines,box});occupied.push(box);break;
      }
    }
    return placed;
  }
  const api={major,overlaps,priority,wrap,placeLabels,symbolKey,
    svg(category) {
      const path=symbols[category]||symbols.nature;
      return `<svg class="map-symbol" width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${path}"/></svg>`;
    },
    drawSymbol(ctx,record,x,y,{color,paper,selected=false,hovered=false}={}) {
      const size=selected||hovered?19:16,scale=(size-4)/20;
      ctx.save();ctx.translate(x,y);ctx.fillStyle=paper;ctx.strokeStyle=color;ctx.lineWidth=selected?1.8:1.2;
      ctx.beginPath();ctx.arc(0,0,size/2,0,Math.PI*2);ctx.fill();ctx.stroke();
      ctx.scale(scale,scale);ctx.translate(-10,-10);ctx.lineWidth=1.6/scale*.6;ctx.lineCap='round';ctx.lineJoin='round';
      ctx.stroke(new Path2D(symbols[symbolKey(record)]||symbols.nature));ctx.restore();
    },
  };
  if (typeof module==='object'&&module.exports) module.exports=api;else root.AtlasCartography=api;
})(typeof globalThis!=='undefined'?globalThis:this);
