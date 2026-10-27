/* Thematic controls share the atlas categories, dates, search and saved views. */
(() => {
  const kinds = ['trade', 'migrations', 'pandemics', 'climate', 'technology'];
  const section = document.createElement('section');
  section.className = 'thematic-layers';
  section.setAttribute('aria-label', 'Thematic map layers');
  section.innerHTML = `<h3>Explore a layer</h3><p>Follow the selected year. Explore jumps to a recorded period.</p>${kinds.map(cat => `<div class="thematic-layer" data-layer="${cat}"><button type="button" class="layer-toggle" data-layer-toggle="${cat}" aria-pressed="true" style="--c:var(--c-${cat})"><i aria-hidden="true"></i><span>${cat === 'pandemics' ? 'Plagues & pandemics' : CATS[cat]}<small data-layer-count="${cat}"></small></span><b aria-hidden="true">✓</b></button><button type="button" class="layer-explore" data-layer-explore="${cat}" aria-label="Explore ${cat === 'pandemics' ? 'plagues and pandemics' : CATS[cat].toLowerCase()}">Explore <span aria-hidden="true">→</span></button></div>`).join('')}<p class="layer-route-key"><span>― Trade connections</span><span>⇢ Migration directions</span></p><p>Lines and arrows are schematic. Markers locate associated places, not an event’s full reach.</p>`;
  document.getElementById('layersPanel').append(section);
  for (const button of section.querySelectorAll('[data-layer-toggle]')) button.onclick = () => {
    document.querySelector(`#legend [data-k="${button.dataset.layerToggle}"]`).click();
  };
  for (const button of section.querySelectorAll('[data-layer-explore]')) button.onclick = async () => {
    const cat = button.dataset.layerExplore;
    const event = HistoricalLayersCore.nearest(ev, cat, state.year);
    if (!event) return;
    const year = Math.max(event.start, Math.min(event.end, state.year));
    document.querySelector('[data-atlas-menu="layersPanel"]').click();
    await HistoryDiscovery.jumpSearch({kind:'event',recordId:event.id,start:year,lon:event.lon,lat:event.lat});
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
        const count = years.map(year => ev.filter(e => e.cat === cat && DiscoveryCore.yearGap(e.start,e.end,year) <= halfWin(year)).length);
        section.querySelector(`[data-layer-count="${cat}"]`).textContent = years.length > 1
          ? `${count[0]} left · ${count[1]} right${enabled ? '' : ' · hidden'}`
          : `${count[0]} in this period${enabled ? '' : ' · hidden'}`;
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
        for (const line of route.paths) {
          for (let i=1;i<line.length;i++) {
            const interpolate = d3.geoInterpolate(line[i-1],line[i]);
            const steps = Math.max(2,Math.ceil(d3.geoDistance(line[i-1],line[i])*180/Math.PI));
            let last = null;
            for(let j=0;j<=steps;j++) {
              const point = interpolate(j/steps);
              if(!isVisible(...point)){last=null;continue;}
              const p = projection(point);
              if(!p || !p.every(Number.isFinite) || p[0]<0 || p[0]>W || p[1]<0 || p[1]>H){last=null;continue;}
              // Subdivide visible projected segments so narrow routes remain selectable when zoomed.
              const gap = last ? Math.hypot(p[0]-last[0],p[1]-last[1]) : 0;
              const subdivisions = gap < Math.max(W,H)/2 ? Math.max(1,Math.ceil(gap/9)) : 1;
              for(let k=1;k<=subdivisions;k++) hits.push({x:last?last[0]+(p[0]-last[0])*k/subdivisions:p[0],y:last?last[1]+(p[1]-last[1])*k/subdivisions:p[1],id:record.id,radius:7,label:record.title+' · '+fmtEvent(record)+' · schematic '+(migration?'migration':'trade connection')});
              last=p;
            }
          }
          // Arrowheads are placed on each leg only where both nearby points are visible.
          if(migration) for(let i=1;i<line.length;i++) {
            const interpolate=d3.geoInterpolate(line[i-1],line[i]);
            const a=interpolate(.68),b=interpolate(.78);
            if(!isVisible(...a)||!isVisible(...b))continue;
            const p=projection(a),q=projection(b);
            if(!p||!q||Math.hypot(q[0]-p[0],q[1]-p[1])<2||Math.hypot(q[0]-p[0],q[1]-p[1])>W/3)continue;
            context.save();context.translate(...q);context.rotate(Math.atan2(q[1]-p[1],q[0]-p[0]));context.beginPath();context.moveTo(0,0);context.lineTo(-8,-4);context.lineTo(-8,4);context.closePath();context.fill();context.restore();
          }
        }
        context.restore();
      }
      return hits;
    },
  };
})();
