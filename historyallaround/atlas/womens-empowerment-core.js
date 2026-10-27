/* Country-level estimates: exact years and explicit identities, never parent-country fallbacks. */
(function(root) {
  const normal = value => String(value || '').normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
  const bands = [
    {from:0, color:'#b83d46', label:'0–0.2'}, {from:.2, color:'#d58252', label:'0.2–0.4'},
    {from:.4, color:'#e1c467', label:'0.4–0.6'}, {from:.6, color:'#93b981', label:'0.6–0.8'},
    {from:.8, color:'#398565', label:'0.8–1'},
  ];
  const missing = '#bcb9b3';
  // Historical names are only mapped where they identify one country/index unit.
  // Composite empires, disputed subregions and their parent states are not guessed.
  const aliases = {
    'United States of America':'United States', 'Czech Republic':'Czechia',
    'Democratic Republic of the Congo':'Democratic Republic of Congo', 'Republic of the Congo':'Congo',
    'Ivory Coast':"Cote d'Ivoire", 'The Gambia':'Gambia', 'North_Macedonia':'North Macedonia',
    'History of Austria':'Austria', 'Second Republic of Austria':'Austria',
    'Third Hellenic Republic':'Greece', 'Éire':'Ireland',
    'French Third Republic':'France', 'French Fourth Republic':'France', 'French Fifth Republic':'France',
    'Emirate of Afghanistan':'Afghanistan', 'Kingdom of Afghanistan':'Afghanistan',
    'Democratic Republic of Afghanistan':'Afghanistan', 'Islamic State of Afghanistan':'Afghanistan',
    'Islamic Republic of Afghanistan':'Afghanistan', 'Islamic Emirate of Afghanistan':'Afghanistan',
    'German Empire':'Germany', 'Weimar Republic':'Germany', 'Nazi Germany':'Germany',
    'German Democratic Republic':'East Germany', 'Democratic Republic of Vietnam':'Democratic Republic of Vietnam',
    'Russian Federation':'Russia', 'Qing dynasty':'China', 'Qing Dynasty':'China',
    'Kingdom of Italy':'Italy', 'Kingdom of Greece':'Greece', 'Kingdom of Romania':'Romania',
    'Kingdom of Bulgaria':'Bulgaria', 'Kingdom of Serbia':'Serbia', 'Kingdom of Montenegro':'Montenegro',
    'Republic of Turkey':'Turkey', 'Ottoman Turkey':'Turkey', 'Siam':'Thailand',
    'Persia':'Iran', 'Qajar Iran':'Iran', 'Pahlavi Iran':'Iran',
    'Dutch East Indies':'Indonesia', 'British Raj':'India', 'British India':'India',
    'British Ceylon':'Sri Lanka', 'Ceylon':'Sri Lanka', 'Burma':'Myanmar',
  };
  function create(data) {
    const units = new Map(data.entities.map(unit => [normal(unit.name),unit]));
    const names = new Map(Object.entries(aliases).map(([alias,name])=>[normal(alias),normal(name)]));
    const series = value => units.get(names.get(normal(value)) || normal(value)) || null;
    function entity(feature, year) {
      const name = feature.name || feature.properties?.name || '';
      const wiki = (feature.wiki || '').replaceAll('_',' ');
      if (/unverified|occupied|annexed/i.test(name) || feature.territoryOverlay) return null;
      if (normal(name)==='republic of china' || normal(wiki)==='republic of china 1912 1949') return series(year>=1949?'Taiwan':'China');
      if (normal(name)==='federal republic of germany') return series(year<=1990?'West Germany':'Germany');
      return series(wiki) || series(name);
    }
    function score(feature, year, aggregates = new Set()) {
      if (!Number.isInteger(year) || year < data.firstYear || year > 2026) return null;
      if (!feature.member && aggregates.has(feature.name)) return null;
      const unit = entity(feature,year), observedYear = Math.min(year,data.lastYear);
      if (!unit) return null;
      const raw = unit.values[observedYear-unit.first];
      if (raw == null) return null;
      return {value:raw/data.scale, year:observedYear, requestedYear:year, entity:unit.name, code:unit.code};
    }
    return {data, score, entity, series};
  }
  const api = {create, bands, missing, color(score) {
    if (!score || !Number.isFinite(score.value)) return missing;
    return bands.findLast(band=>score.value>=band.from)?.color || missing;
  }, aggregates(features) {
    return new Set(features.filter(feature=>feature.member===feature.name).map(feature=>feature.name));
  }};
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.WomensEmpowermentCore=api;
})(typeof window==='undefined'?globalThis:window);
