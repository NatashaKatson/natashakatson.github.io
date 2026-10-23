#!/usr/bin/env python3
"""Bundle GPlates PALEOMAP snapshots and matching fossil points for offline use.

Run manually when updating the reconstruction data; Hugo needs no network access.
Raw responses are cached outside the repository so interrupted builds can resume.
"""
import concurrent.futures
import datetime
import json
import math
from pathlib import Path
import re
import subprocess
import tempfile
from urllib.parse import urlencode

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'static/historyallaround/atlas/paleogeography'
CACHE = Path(tempfile.gettempdir()) / 'atlas-paleogeography-source'
AGES = sorted(set([1, 66, 67, 72, 96, 124, 148.5, 150, 228, 252] + list(range(10, 251, 10))))
MODEL = 'PALEOMAP'
BASE = 'https://gws.gplates.org/reconstruct/'


def fetch(endpoint, age, **params):
    path = CACHE / f'{endpoint}-{age}.json'
    if not path.exists():
        url = BASE + endpoint + '/?' + urlencode(dict(time=age, model=MODEL, **params))
        subprocess.run(['curl', '--silent', '--show-error', '--fail', '--retry', '2',
                        '--max-time', '90', '-o', str(path.with_suffix('.tmp')), url], check=True)
        # Validate before caching; never keep an error page as data.
        json.loads(path.with_suffix('.tmp').read_text())
        path.with_suffix('.tmp').replace(path)
    return json.loads(path.read_text())


def vector(point):
    lon, lat = map(math.radians, point)
    return (math.cos(lat) * math.cos(lon), math.cos(lat) * math.sin(lon), math.sin(lat))


def simplify(points, tolerance=.002):
    """RDP in 3D unit-sphere coordinates, avoiding longitude-wrap artifacts."""
    if len(points) <= 2:
        return points
    a, b = vector(points[0]), vector(points[-1])
    ab = [y - x for x, y in zip(a, b)]
    length = sum(x * x for x in ab)
    greatest, index = 0, 0
    for i, point in enumerate(points[1:-1], 1):
        p = vector(point)
        t = max(0, min(1, sum((p[j] - a[j]) * ab[j] for j in range(3)) / length)) if length else 0
        distance = sum((p[j] - a[j] - t * ab[j]) ** 2 for j in range(3))
        if distance > greatest:
            greatest, index = distance, i
    if greatest > tolerance ** 2:
        return simplify(points[:index + 1], tolerance)[:-1] + simplify(points[index:], tolerance)
    return [points[0], points[-1]]


def spherical_area(points):
    """Spherical excess in D3's winding convention (steradians)."""
    terms = []
    for a, b in zip(points, points[1:]):
        lon_a, lat_a = map(math.radians, a)
        lon_b, lat_b = map(math.radians, b)
        phi_a, phi_b = lat_a / 2 + math.pi / 4, lat_b / 2 + math.pi / 4
        k = math.sin(phi_a) * math.sin(phi_b)
        delta = lon_b - lon_a
        terms.append(math.atan2(k * math.sin(delta), math.cos(phi_a) * math.cos(phi_b) + k * math.cos(delta)))
    return (2 * math.fsum(terms)) % (4 * math.pi)


def ring(points, hole=False):
    # Split a closed ring so RDP has two distinct endpoints. Retain small islands.
    while len(points) > 2 and points[-1] == points[-2]:
        points = points[:-1]
    middle = len(points) // 2
    result = simplify(points[:middle + 1])[:-1] + simplify(points[middle:])
    if len(result) < 4:
        result = points
    result = [[round(v, 3) for v in p] for p in result]
    # GWS polygons have mixed winding. D3 otherwise fills the entire globe for
    # some islands. Exterior rings must enclose the smaller spherical area;
    # holes use the opposite direction.
    if (spherical_area(result) > 2 * math.pi) != hole:
        result.reverse()
    return result


def build(age, fossils):
    source = fetch('coastlines', age)
    features = []
    for feature in source['features']:
        geometry = feature['geometry']
        if geometry['type'] != 'Polygon':
            raise ValueError('Unexpected coastline geometry')
        features.append({'type': 'Feature', 'properties': {}, 'geometry': {
            'type': 'Polygon', 'coordinates': [ring(r, i > 0) for i, r in enumerate(geometry['coordinates'])]}})
    land = {'type': 'FeatureCollection', 'features': features}
    (OUT / f'{age}.json').write_text(json.dumps(land, separators=(',', ':')) + '\n')
    points = fetch('reconstruct_points', age,
                   lons=','.join(str(r[6]) for r in fossils),
                   lats=','.join(str(r[5]) for r in fossils), return_null_points='')
    coordinates = points['coordinates']
    if len(coordinates) != len(fossils) or any(p is None or abs(p[0]) > 180 or abs(p[1]) > 90 for p in coordinates):
        raise ValueError(f'Incomplete fossil reconstruction at {age} Ma')
    print(f'{age} Ma: {len(features)} polygons', flush=True)
    return {'age': age, 'points': {r[9]: p for r, p in zip(fossils, coordinates)}}


def main():
    html = (ROOT / 'static/historyallaround/atlas/index.html').read_text()
    rows = re.findall(r'^\[.*"dinosaurs".*\],?$', html, re.M)
    fossils = [json.loads(r.rstrip(',')) for r in rows]
    if len(fossils) != 8:
        raise ValueError('Expected eight fossil records; review reconstruction inputs')
    CACHE.mkdir(exist_ok=True)
    OUT.mkdir(exist_ok=True)
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        snapshots = list(pool.map(lambda age: build(age, fossils), AGES))
    metadata = {'model': MODEL, 'retrieved': datetime.date.today().isoformat(),
                'source': 'https://gwsdoc.gplates.org/models/#paleomap',
                'reference': 'Scotese, C.R. (2016). PALEOMAP PaleoAtlas for GPlates.',
                'snapshots': snapshots}
    (OUT / 'snapshots.js').write_text('/* Generated by scripts/build-history-paleogeography.py. */\n'
                                     'window.HISTORY_PALEOGEOGRAPHY=' + json.dumps(metadata, separators=(',', ':')) + ';\n')


if __name__ == '__main__':
    main()
