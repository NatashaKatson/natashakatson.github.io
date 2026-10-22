#!/usr/bin/env python3
"""Build local Atlas search data; no runtime APIs or extra Python packages.

Historical entries come from the checked-in Cliopatria snapshots. Optionally pass
--cities-zip /path/to/cities15000.zip to regenerate the GeoNames city index.
"""
import argparse
import json
from pathlib import Path
import zipfile
import unicodedata

ROOT = Path(__file__).resolve().parents[1] / 'static/historyallaround/atlas'


def write(name, data):
    path = ROOT / name
    path.write_text(json.dumps(data, ensure_ascii=False, separators=(',', ':')) + '\n')
    print(f'{name}: {len(data["rows"]):,} records; {path.stat().st_size:,} bytes')


def build_states():
    manifest = json.loads((ROOT / 'borders/index.json').read_text())
    groups = {}
    for chunk in manifest['chunks']:
        topo = json.loads((ROOT / f'borders/c{chunk}.json').read_text())
        for geometry in topo['objects']['p']['geometries']:
            p = geometry['properties']
            start = max(chunk, p['f'])
            end = min(chunk + manifest['chunkSize'] - 1, p['t'], manifest['to'])
            if start == 0:
                start = 1
            if end == 0:
                end = -1
            if start > end:
                continue
            name = p['n']
            if name.startswith('(') and name.endswith(')'):
                name = name[1:-1]
            # Keep political membership distinct, and never bridge missing coverage.
            member = p.get('m', '')
            if member.startswith('(') and member.endswith(')'):
                member = member[1:-1]
            key = (name, p.get('w', ''), member)
            groups.setdefault(key, []).append({
                'start': start, 'end': end, 'year': start,
                'lon': p['lx'], 'lat': p['ly'], 'area': p['a'],
            })
    rows = []
    for (name, wiki, member), segments in sorted(groups.items()):
        merged = []
        for segment in sorted(segments, key=lambda s: (s['start'], s['end'])):
            previous = merged[-1] if merged else None
            adjacent = previous and (segment['start'] <= previous['end'] + 1 or
                                     (previous['end'] == -1 and segment['start'] == 1))
            if adjacent:
                previous['end'] = max(previous['end'], segment['end'])
                # Land at an available snapshot with the largest recorded extent.
                if segment['area'] > previous['area']:
                    for field in ('year', 'lon', 'lat', 'area'):
                        previous[field] = segment[field]
            else:
                merged.append(dict(segment))
        for s in merged:
            rows.append([name, s['start'], s['end'], s['year'], s['lon'], s['lat'], wiki, member])
    write('search-states.json', {
        'version': 1, 'source': manifest['source'],
        'license': 'https://creativecommons.org/licenses/by/4.0/',
        'fields': ['name', 'from', 'to', 'year', 'longitude', 'latitude', 'wiki', 'member'],
        'rows': rows,
    })


def build_places(archive, admin_file):
    regions = {}
    if admin_file:
        for line in admin_file.read_text().splitlines():
            code, name, *_ = line.split('\t')
            regions[code] = name
    rows = []
    with zipfile.ZipFile(archive) as z:
        for line in z.read('cities15000.txt').decode('utf-8').splitlines():
            f = line.split('\t')
            if len(f) < 19:
                raise ValueError('Unexpected GeoNames row')
            # Keep common alternative spellings, while bounding the download size.
            aliases = []
            def normalized(value):
                return ''.join(c for c in unicodedata.normalize('NFKD', value.casefold()) if c.isalnum())
            seen = {normalized(f[1])}
            for alias in [f[2], *f[3].split(',')]:
                key = normalized(alias)
                if (alias and len(alias) <= 80 and key not in seen and
                        not alias.startswith(('Template:', 'http://', 'https://'))):
                    aliases.append(alias)
                    seen.add(key)
                if len(aliases) == 8:
                    break
            rows.append([f[1], f[8], round(float(f[5]), 4), round(float(f[4]), 4),
                         int(f[14]), int(f[0]), aliases, regions.get(f'{f[8]}.{f[10]}', f[10])])
    rows.sort(key=lambda r: (-r[4], r[0], r[5]))
    write('search-places.json', {
        'version': 1, 'source': 'GeoNames cities15000 and admin1CodesASCII',
        'url': 'https://download.geonames.org/export/dump/cities15000.zip',
        'license': 'https://creativecommons.org/licenses/by/4.0/',
        'fields': ['name', 'country', 'longitude', 'latitude', 'population', 'geonameId', 'aliases', 'region'],
        'rows': rows,
    })


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--cities-zip', type=Path)
    parser.add_argument('--admin1-file', type=Path, help='GeoNames admin1CodesASCII.txt')
    args = parser.parse_args()
    build_states()
    if args.cities_zip:
        build_places(args.cities_zip, args.admin1_file)
