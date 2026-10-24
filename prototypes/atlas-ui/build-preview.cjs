// Rebuild the original atlas as a portable prototype with emojis and clear interval labels.
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const atlas = path.resolve(__dirname, '../../static/historyallaround/atlas');
const read = (file) => fs.readFileSync(path.join(atlas, file), 'utf8');
const script = (source) => `<script>${source.replace(/<\/script/gi, '<\\/script')}</script>`;
function replaceOnce(source, before, after, label) {
  if (!source.includes(before) || source.indexOf(before) !== source.lastIndexOf(before)) throw Error(`Expected one ${label}`);
  return source.replace(before, () => after);
}
const json = {}, images = {};
function collect(directory = '') {
  for (const entry of fs.readdirSync(path.join(atlas, directory), { withFileTypes: true })) {
    const relative = path.posix.join(directory, entry.name);
    if (entry.isDirectory()) collect(relative);
    else if (entry.name.endsWith('.json')) json[relative] = zlib.gzipSync(fs.readFileSync(path.join(atlas, relative))).toString('base64');
    else if (/\.(webp|svg)$/.test(entry.name)) images[relative] = `data:image/${entry.name.endsWith('.svg') ? 'svg+xml' : 'webp'};base64,${fs.readFileSync(path.join(atlas, relative)).toString('base64')}`;
  }
}
collect();
const payload = JSON.stringify({ json, images }).replace(/</g, '\\u003c');
const loader = `
window.AtlasPrototypeAssets = JSON.parse(document.getElementById('prototype-assets').textContent);
const originalPrototypeFetch = window.fetch.bind(window);
window.fetch = async function(input, init) {
  const raw = typeof input === 'string' ? input : input.url;
  let key = raw;
  try { const url = new URL(raw, location.href); const root = new URL('.', location.href).pathname; key = decodeURIComponent(url.pathname.slice(root.length)); } catch (_) {}
  const packed = window.AtlasPrototypeAssets.json[key];
  if (!packed) return originalPrototypeFetch(input, init);
  const bytes = Uint8Array.from(atob(packed), c => c.charCodeAt(0));
  const body = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
  return new Response(body, {headers: {'Content-Type': 'application/json'}});
};`;
function imageURLs(source) {
  for (const [url, data] of Object.entries(images)) source = source.replaceAll(url, data);
  return source;
}
let html = read('index.html');
html = html.replace('<title>History All Around</title>', '<title>History All Around · Emoji prototype</title>');
html = html.replace('<head>', '<head>\n<meta name="robots" content="noindex">');
html = html.replace('</head>', () => `<style>.event-emoji{display:inline-block;min-width:1.3em;margin-right:5px;font-style:normal;line-height:1;vertical-align:baseline}.item .t .event-emoji{font-size:16px}.detail h3 .event-emoji{font-size:.9em}</style>\n</head>`);
html = html.replace(/<link rel="stylesheet" href="(discovery\.css|atlas-ui\.css)">/g, (_, file) => `<style>${read(file)}</style>`);
html = html.replace(/<script src="([^\"]+)"><\/script>/g, (_, file) => {
  if (file.startsWith('https://')) {
    const name = file.includes('d3.min.js') ? 'd3.min.js' : file.includes('topojson-client') ? 'topojson-client.min.js' : null;
    if (!name) throw Error(`Unrecognized dependency ${file}`);
    return script(fs.readFileSync(path.join(__dirname, 'vendor', name), 'utf8'));
  }
  let source = read(file);
  if (file === 'dinosaurs.js') source = replaceOnce(source,
    'const avatarUrl = (record) => `images/dinosaurs/${record.wiki.toLowerCase()}.webp`;',
    "const avatarUrl = (record) => window.AtlasPrototypeAssets.images['images/dinosaurs/' + record.wiki.toLowerCase() + '.webp'];", 'dinosaur asset resolver');
  return script(imageURLs(source));
});
const bootstrap = `<script type="application/json" id="prototype-assets">${payload}</script>\n${script(loader)}\n${script(fs.readFileSync(path.join(__dirname, 'event-emojis.js'), 'utf8'))}`;
html = html.replace('<script type="application/json" id="land">', () => bootstrap + '\n<script type="application/json" id="land">');
// Only the event's icon changes. All original titles, controls and interactions remain.
html = replaceOnce(html, '<span class="t"><i></i>${esc(e.title)}</span>', '<span class="t"><span class="event-emoji" aria-hidden="true">${AtlasEventEmojis.get(e)}</span>${esc(e.title)}</span>', 'event list icon');
html = replaceOnce(html, '<h3>${esc(x.title)}</h3>${historicalContextNote(x,state.year)}', '<h3><span class="event-emoji" aria-hidden="true">${AtlasEventEmojis.get(x)}</span>${esc(x.title)}</h3>${historicalContextNote(x,state.year)}', 'event detail title');
const markerStart = '    const col=C["c-"+e.cat],rad=4+3*r;ctx.globalAlpha=.4+.6*r;';
const markerEnd = 'ctx.globalAlpha=1;\n    hits.push({x,y,id:e.id';
const begin = html.indexOf(markerStart), end = html.indexOf(markerEnd, begin);
if (begin < 0 || end < 0) throw Error('Original event marker renderer was not found');
const original = html.slice(begin, end + 'ctx.globalAlpha=1;'.length);
const emojiMarker = `    const emoji=AtlasEventEmojis.get(e);
    if(emoji){ctx.save();ctx.globalAlpha=.4+.6*r;ctx.beginPath();ctx.arc(x,y,10,0,7);ctx.fillStyle=C.paper;ctx.fill();ctx.strokeStyle=C.border;ctx.lineWidth=.7;ctx.stroke();ctx.font='17px "Apple Color Emoji","Segoe UI Emoji",sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(emoji,x,y+.5);ctx.restore()}
    else{${original.trim()}}`;
html = html.slice(0, begin) + emojiMarker + html.slice(end + 'ctx.globalAlpha=1;'.length);
html = imageURLs(html);
// Preserve the original home destination when opening the prototype from its own folder.
html = html.replaceAll('href="../"', 'href="../../static/historyallaround/"');
const licenses = ['d3.LICENSE', 'topojson-client.LICENSE'].map((file) => fs.readFileSync(path.join(__dirname, 'vendor', file), 'utf8')).join('\n');
html = html.replace('</body>', () => `<!-- Bundled map library licenses:\n${licenses}\n-->\n</body>`);
fs.writeFileSync(path.join(__dirname, 'preview.html'), html);
console.log(`Built original atlas + event emojis (${Object.keys(json).length} embedded datasets, ${(Buffer.byteLength(html) / 1024 / 1024).toFixed(1)} MB).`);
