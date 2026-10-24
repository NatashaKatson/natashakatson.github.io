/* Build authored routes from the same sourced records used by the map and search.
 * Stable stop IDs are stored in shared views. No article text is downloaded. */
(function (root, build) {
  if (typeof module === "object") module.exports = build;
  else root.CuratedDiscoveries.push(...build(ev, root.BeringiaEvidence));
})(typeof window === "object" ? window : globalThis, function (records, beringia) {
  function stop(id, wiki, year, location) {
    const r=records.find((r)=>r.wiki===wiki);
    if(!r)throw Error("Missing sourced discovery record: "+wiki);
    return {id,year,location,title:r.title,point:[r.lon,r.lat],text:r.blurb,
      kind:r.start===r.end?"event":"context",sources:[["Evidence & context",r.source]]};
  }
  const note="These stops visit different periods and distinct peoples. Markers locate documented communities or sites, not territorial boundaries. Overview dates do not mark the origins or disappearance of a people. This is a selection, not complete coverage.";
  return [{
    id:"indigenous-north-america",title:"Indigenous North America",subtitle:"Cities, diplomacy, languages and continuing communities.",
    start:-1700,end:2026,note,
    introduction:"North America's history includes many distinct Indigenous nations and communities before, during and after European colonization. Visit documented places and histories across several periods, including communities that continue today. Colonial fills do not delimit Indigenous homelands.",
    sources:[["Musqueam · territory and place names","https://www.musqueam.bc.ca/our-story/our-territory/"],["Haudenosaunee Confederacy · who we are","https://www.haudenosauneeconfederacy.com/who-we-are/"]],
    stops:[
      stop("poverty-point","Poverty_Point",-1500,"Lower Mississippi Valley · North America"),
      stop("chaco","Chaco_Culture",1100,"Chaco Canyon · Southwest North America"),
      stop("musqueam","Musqueam_Indian_Band",1700,"Fraser River estuary · Musqueam territory"),
      stop("haudenosaunee","Haudenosaunee",1700,"Onondaga · Haudenosaunee homelands"),
      stop("pueblo-revolt","Pueblo_Revolt",1680,"Santa Fe region · Pueblo homelands"),
      stop("tlingit","Battle_of_Sitka",1804,"Sitka · Tlingit homelands"),
      stop("haida","SGang_Gwaay",1850,"SG̱ang Gwaay · Haida Gwaii"),
      stop("cherokee-publishing","Cherokee_Advocate",1844,"Tahlequah · Cherokee Nation"),
      stop("red-river","Red_River_Resistance",1870,"Red River · Métis homeland"),
      stop("nunavut","Nunavut",1999,"Iqaluit · Nunavut"),
    ],
  },{
    id:"indigenous-world",title:"Indigenous histories around the world",subtitle:"Siberia, Sápmi, the Pacific, Africa and South America.",
    start:-4500,end:2026,note,
    introduction:"Indigenous histories cross today's state borders. Explore a checked selection of cultural practices, community institutions and places. Several modern overview dates begin with a documented recognition or institution, not with the much older histories of the peoples concerned.",
    sources:[["UNESCO · living heritage","https://ich.unesco.org/en/lists"],["Saami Council · cross-border cooperation","https://www.saamicouncil.net/en/home/"]],
    stops:[
      stop("nenets","Nenets_people",1700,"Yamal · West Siberia"),
      stop("sakha","Olonkho",2008,"Yakutsk region · Sakha"),
      stop("chukchi-yupik","Beringia_National_Park",2013,"Eastern Chukotka · Bering Strait"),
      stop("sapmi","Saami_Council",1956,"Sápmi · northern Europe"),
      stop("ainu","Ainu_culture",2009,"Hokkaido · Japan"),
      stop("gunditjmara","Budj_Bim_heritage_areas",1700,"Budj Bim · Gunditjmara Country"),
      stop("aotearoa","History_of_New_Zealand",1280,"Aotearoa · New Zealand"),
      stop("tsodilo","Tsodilo",2001,"Tsodilo · Botswana"),
      stop("wajapi","Wayampi",2003,"Amapá · Amazonia"),
      stop("quechua","Queshuachaca",2013,"Q’eswachaka · Peru"),
      stop("maya","Tikal",250,"Tikal · Maya lowlands"),
      stop("mexica","Tenochtitlan",1325,"Tenochtitlan · central Mexico"),
      stop("rapa-nui","Moai",1400,"Rapa Nui · Pacific"),
    ],
  },{
    id:beringia.id,title:"Beringia: evidence for the peopling of the Americas",subtitle:"Explore dated sites and the limits of proposed migration routes.",
    start:-29650,end:-9550,
    introduction:"During the Ice Age, Beringia connected northeast Asia and Alaska across land now partly submerged. Archaeology and population research support ancient connections, but the exact timing and routes into the Americas remain debated. This predates modern Russia and the United States and does not identify ancient migrants as today's Chukchi, Yupik, Sakha or another named people.",
    note:"Dots are dated evidence at separate places and times, not successive stops made by one group. Dashed corridors are schematic hypotheses, not observed tracks. White Sands is older than the Alaska sites shown here: the sequence is incomplete and must not be read as a single established journey. Ages in cal BP use AD 1950 as present; BC map dates are rounded.",
    mapNote:"Evidence overview · sites from different dates. Dots: dated evidence. Dashed lines: proposed corridors, not a dated journey. Modern coastlines are reference only; Ice Age shorelines and ice sheets are not reconstructed.",
    sources:beringia.sources,
    stops:[{
      id:"overview",title:"A connected region, several possible pathways",location:"Beringia · northeast Asia and Alaska",year:-18000,point:[180,55],zoom:1.1,kind:"context",
      text:"Lower seas exposed land between northeast Asia and Alaska. The dashed guides summarize a Beringia connection and proposed coastal and interior pathways south; their drawn coordinates are illustrative. The corridors were not necessarily usable at the same time, and these lines do not explain a specific group's journey. Open each dated site to distinguish evidence from interpretation.",sources:beringia.sources,
    },
      stop("yana","Yana_RHS",-29650,"Yana · Arctic Siberia"),
      stop("white-sands","White_Sands_fossil_footprints",-21000,"White Sands · New Mexico"),
      stop("swan-point","Swan_Point_Archaeological_Site",-12250,"Swan Point · interior Alaska"),
      stop("upward-sun-river","Upward_Sun_River_site",-9550,"Upward Sun River · Alaska"),
    ],
  }];
});
