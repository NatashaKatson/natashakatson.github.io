/* Thematic controls share the atlas categories, dates, search and saved views. */
(() => {
  const kinds = ['trade', 'pandemics', 'climate', 'technology'];
  const records = Object.fromEntries(kinds.map(cat => [cat, ev.filter(e => e.cat === cat)]));
  const section = document.createElement('section');
  section.className = 'thematic-layers';
  section.setAttribute('aria-label', 'Thematic map layers');
  section.innerHTML = `<h3>Explore a layer</h3><p>Follow the selected year. Explore jumps to a recorded period.</p>${kinds.map(cat => `<div class="thematic-layer" data-layer="${cat}"><button type="button" class="layer-toggle" data-layer-toggle="${cat}" aria-pressed="true" style="--c:var(--c-${cat})"><i aria-hidden="true"></i><span>${cat === 'pandemics' ? 'Plagues & pandemics' : CATS[cat]}<small data-layer-count="${cat}"></small></span><b aria-hidden="true">✓</b></button><button type="button" class="layer-explore" data-layer-explore="${cat}" aria-label="Explore ${cat === 'pandemics' ? 'plagues and pandemics' : CATS[cat].toLowerCase()}">Explore <span aria-hidden="true">→</span></button></div>`).join('')}<p class="layer-route-key"><span>― Trade connections</span></p><p>Trade lines are schematic. Markers locate associated places, not an event’s full reach.</p>`;
  document.getElementById('layersPanel').append(section);
  async function visit(event, year) {
    document.getElementById('layersPanel').scrollTop = 0;
    const trigger = document.querySelector('[data-atlas-menu="layersPanel"]');
    if(trigger.getAttribute('aria-expanded') === 'true') trigger.click();
    await HistoryDiscovery.jumpSearch({kind:'event',recordId:event.id,start:year,lon:event.lon,lat:event.lat});
  }
  for (const button of section.querySelectorAll('[data-layer-toggle]')) button.onclick = () => {
    document.querySelector(`#legend [data-k="${button.dataset.layerToggle}"]`).click();
  };
  for (const button of section.querySelectorAll('[data-layer-explore]')) button.onclick = async () => {
    const cat = button.dataset.layerExplore;
    const event = HistoricalLayersCore.nearest(ev, cat, state.year);
    if (!event) return;
    const year = Math.max(event.start, Math.min(event.end, state.year));
    await visit(event, year);
  };
  const note = document.createElement('details');
  note.className = 'route-map-note';
  note.innerHTML = '<summary>Schematic routes <span aria-hidden="true">ⓘ</span></summary><p>Solid lines show selected trade connections; dashed arrows show directions of migration. Each route summarises its full recorded interval. Select a line or marker for dates, context and sources.</p>';
  document.getElementById('mapContext').append(note);
  let lastKey = '';
  window.HistoryLayers = {
    render() {
      const years = HistoryDiscovery.displayedYears();
      const key = years.join('/')+'|'+[...state.cats].join(',');
      if(key === lastKey) return;
      lastKey = key;
      section.hidden = years.every(year => year < -1000000);
      for (const cat of kinds) {
        const enabled = state.cats.has(cat);
        const button = section.querySelector(`[data-layer-toggle="${cat}"]`);
        button.setAttribute('aria-pressed', String(enabled));
        button.querySelector('b').textContent = enabled ? '✓' : '○';
        const count = years.map(year => records[cat].filter(e => DiscoveryCore.yearGap(e.start,e.end,year) <= halfWin(year)).length);
        const total = records[cat].length;
        section.querySelector(`[data-layer-count="${cat}"]`).textContent = years.length > 1
          ? `${count[0]} left · ${count[1]} right · ${total} total${enabled ? '' : ' · hidden'}`
          : `${count[0]} in this period · ${total} total${enabled ? '' : ' · hidden'}`;
      }
      note.hidden = !years.some(year => HistoricalLayersCore.active(ev,year,state.cats).length);
    },
    drawRoutes(context, geoPath, projection, isVisible, year) {
      const hits = [];
      for (const {record,route} of HistoricalLayersCore.active(ev,year,state.cats)) {
        const migration = route.kind === 'migrations';
        context.save();
        context.strokeStyle = C['c-'+record.cat];
        context.fillStyle = C['c-'+record.cat];
        context.lineWidth = record.id === state.sel ? 3.5 : 2;
        context.globalAlpha = record.id === state.sel ? .95 : .72;
        context.lineCap = 'round';context.lineJoin = 'round';
        context.setLineDash(migration ? [6,5] : []);
        context.beginPath();geoPath(HistoricalLayersCore.geometry(route));context.stroke();
        context.setLineDash([]);
        // Use the same resampling and horizon/antimeridian clipping as the
        // drawn path. Geographic waypoints are too sparse for short routes
        // (Korea at world zoom), and must not be joined across map seams.
        const lines = [];
        let line;
        const sink = {
          lineStart() { lines.push(line = []); },
          point(x,y) { line.push([x,y]); },
          lineEnd() {},
        };
        d3.geoStream(HistoricalLayersCore.geometry(route), projection.stream(d3.geoClipRectangle(0,0,W,H)(sink)));
        const label = record.title+' · '+fmtEvent(record)+' · schematic '+(migration?'migration':'trade connection');
        for (const points of lines) {
          const distances = [0];
          for(let i=0;i<points.length;i++) {
            const p=points[i],last=points[i-1];
            const gap=last?Math.hypot(p[0]-last[0],p[1]-last[1]):0;
            if(i)distances.push(distances[i-1]+gap);
            const subdivisions=Math.max(1,Math.ceil(gap/9));
            for(let k=1;k<=subdivisions;k++)hits.push({x:last?last[0]+(p[0]-last[0])*k/subdivisions:p[0],y:last?last[1]+(p[1]-last[1])*k/subdivisions:p[1],id:record.id,radius:7,label});
          }
          const length=distances.at(-1);
          if(!migration || length<4)continue;
          const pointAt = distance => {
            let i=1;while(i<distances.length-1&&distances[i]<distance)i++;
            const t=(distance-distances[i-1])/(distances[i]-distances[i-1]);
            return points[i-1].map((v,k)=>v+(points[i][k]-v)*t);
          };
          // One readable direction on short routes; space additional heads
          // by screen distance rather than crowding one onto every waypoint.
          const size=Math.min(8,length*.35),end=length-Math.min(2,length*.1);
          for(let distance=end;distance>=size+1;distance-=90) {
            const p=pointAt(distance-Math.min(size,1)),q=pointAt(distance);
            context.save();context.translate(...q);context.rotate(Math.atan2(q[1]-p[1],q[0]-p[0]));context.beginPath();context.moveTo(0,0);context.lineTo(-size,-size/2);context.lineTo(-size,size/2);context.closePath();context.fill();context.restore();
          }
        }
        context.restore();
      }
      return hits;
    },
  };
})();
