/* Research overview, not a reconstruction of an observed journey or Ice Age coastline.
 * Corridor coordinates are hand-drawn schematic guides, not source GIS tracks. */
(function (root) {
  const api = {
    id: "beringia-evidence",
    sources: [
      ["NPS · Beringia and the land bridge", "https://www.nps.gov/subjects/beringia/about.htm"],
      ["Steffen, 2024 · coastal and interior route constraints", "https://doi.org/10.1038/s41598-024-54592-x"],
    ],
    routes: [
      { name: "Beringia connection", color: "#a6563a", point: [179, 67], coordinates: [[155, 66], [175, 65], [-165, 65]] },
      { name: "Coastal hypothesis", color: "#3f6f86", point: [-139, 53], coordinates: [[-165, 65], [-155, 59], [-141, 58], [-132, 53], [-125, 47]] },
      { name: "Interior hypothesis", color: "#476d52", point: [-116, 58], coordinates: [[-165, 65], [-148, 65], [-132, 62], [-122, 57], [-114, 49]] },
    ],
    sites: [
      { wiki: "Yana_RHS", name: "Yana", age: "c. 31,600 cal BP" },
      { wiki: "White_Sands_fossil_footprints", name: "White Sands", age: "c. 23,000–21,000 years ago" },
      { wiki: "Swan_Point_Archaeological_Site", name: "Swan Point", age: "c. 14,200 cal BP" },
      { wiki: "Upward_Sun_River_site", name: "Upward Sun River", age: "c. 11,500 cal BP" },
    ],
    drawRoutes(ctx, path, colors) {
      ctx.save();ctx.lineWidth=2;ctx.setLineDash([6,5]);
      for (const route of api.routes) {
        ctx.strokeStyle=route.color;ctx.beginPath();path({type:"LineString",coordinates:route.coordinates});ctx.stroke();
      }
      ctx.restore();
    },
    drawSites(ctx, projection, records, visible, width, height, colors, hits) {
      ctx.save();ctx.font=`500 ${width<600?10:11}px ${colors.display}`;ctx.textAlign="left";ctx.textBaseline="middle";
      const boxes=[];
      for (const site of api.sites) {
        const record=records.find((r)=>r.wiki===site.wiki);
        if (!record || !visible(record.lon,record.lat)) continue;
        const [x,y]=projection([record.lon,record.lat]);
        if (x<8||x>width-8||y<8||y>height-8) continue;
        ctx.beginPath();ctx.arc(x,y,6,0,Math.PI*2);ctx.fillStyle=colors.ink;ctx.fill();
        ctx.strokeStyle=colors.paper;ctx.lineWidth=2;ctx.stroke();
        hits.push({x,y,id:record.id,label:site.name+" · "+site.age+" · dated evidence; route unknown",year:record.start});
        const mobile=width<600,lines=mobile?[site.name,site.age]:[site.name+" · "+site.age];
        const tw=Math.max(...lines.map(t=>ctx.measureText(t).width)),bh=mobile?30:16;
        const lx=x+12+tw<width-8?x+12:Math.max(4,x-12-tw);
        for (const dy of mobile?[0,34,-34,68,-68]:[0,24,-24,48,-48]) {
          const ly=y+dy,box=[lx-3,ly-8,tw+6,bh];
          if (ly<12||ly+bh>height-12||boxes.some(([a,b,w,h])=>box[0]<a+w&&box[0]+box[2]>a&&box[1]<b+h&&box[1]+box[3]>b)) continue;
          boxes.push(box);
          ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(lx,ly);ctx.strokeStyle=colors.ink;ctx.lineWidth=.7;ctx.stroke();
          for (let i=0;i<lines.length;i++) {
            ctx.lineWidth=3;ctx.strokeStyle=colors.halo;ctx.strokeText(lines[i],lx,ly+i*13);ctx.fillStyle=colors.ink;ctx.fillText(lines[i],lx,ly+i*13);
          }
          break;
        }
      }
      ctx.font=`italic ${width<600?9:10}px ${colors.display}`;ctx.textAlign="center";
      for (const route of api.routes) {
        if (width<600) continue; // The colour key leaves room for two-line site labels on small maps.
        if (!visible(...route.point)) continue;
        const [x,y]=projection(route.point);
        if(x<10||x>width-10||y<12||y>height-12)continue;
        ctx.lineWidth=3;ctx.strokeStyle=colors.halo;ctx.strokeText(route.name,x,y);ctx.fillStyle=route.color;ctx.fillText(route.name,x,y);
      }
      ctx.restore();
    },
  };
  if (typeof module === "object") module.exports = api;
  else root.BeringiaEvidence = api;
})(typeof window === "object" ? window : globalThis);
