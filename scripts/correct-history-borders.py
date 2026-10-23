#!/usr/bin/env python3
"""Correct a mislabeled Cliopatria aggregate without drawing new boundaries.

See docs/history-border-corrections.md for scope and sources. This is idempotent;
run it after importing the original border files, then rebuild history search.
"""
import copy
import json
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1] / 'static/historyallaround/atlas/borders'


def ring_points(topo, ring):
    points = []
    for index in ring:
        x = y = 0
        arc = []
        for dx, dy in topo['arcs'][index if index >= 0 else ~index]:
            x += dx
            y += dy
            arc.append(tuple(v * scale + offset for v, scale, offset in zip(
                (x, y), topo['transform']['scale'], topo['transform']['translate'])))
        points.extend(arc if index >= 0 else reversed(arc))
    return points


def ring_area(points):
    # Spherical excess of a triangle fan, in steradians (the atlas's area units).
    vectors = []
    for lon, lat in points:
        lon, lat = math.radians(lon), math.radians(lat)
        vectors.append((math.cos(lat) * math.cos(lon), math.cos(lat) * math.sin(lon), math.sin(lat)))
    dot = lambda a, b: sum(x * y for x, y in zip(a, b))
    a = vectors[0]
    area = 0
    for b, c in zip(vectors[1:], vectors[2:]):
        cross = (b[1]*c[2] - b[2]*c[1], b[2]*c[0] - b[0]*c[2], b[0]*c[1] - b[1]*c[0])
        area += 2 * math.atan2(dot(a, cross), 1 + dot(a, b) + dot(b, c) + dot(c, a))
    return abs(area)


def correct(topo):
    geometries = topo['objects']['p']['geometries']
    if not any(g['properties']['n'] == 'Russian-occupied territories' for g in geometries):
        return False
    corrected = []
    for geometry in geometries:
        p = geometry['properties']
        if p['n'] == 'Russian-occupied territories':
            assert geometry['type'] == 'MultiPolygon' and len(geometry['arcs']) == 3
            for polygon in geometry['arcs']:
                points = ring_points(topo, polygon[0])
                west, south = min(x for x, y in points), min(y for x, y in points)
                if 43 < west < 45 and 42 < south < 43:
                    name, member, center = 'South Ossetia', 'Georgia', (44.1, 42.45)
                elif 28 < west < 30 and 46 < south < 46.5:
                    name, member, center = 'Gagauzia', 'Republic of Moldova', (28.65, 46.25)
                elif 28 < west < 30 and 46.5 < south < 47:
                    name, member, center = 'Transnistria', 'Republic of Moldova', (29.2, 47.41)
                else:
                    raise ValueError('Unexpected occupied-territories polygon')
                replacement = copy.deepcopy(geometry)
                replacement['type'] = 'Polygon'
                replacement['arcs'] = polygon
                replacement['properties'].update(n=name, m=member, w=name,
                    a=float(f'{ring_area(points):.5g}'), lx=center[0], ly=center[1])
                corrected.append(replacement)
        elif p['n'] == '(Russian Federation)':
            # The source's realm envelope also unions in the three regions.
            # Use its corresponding Russia feature so it cannot repaint them.
            russia = next(g for g in geometries if g['properties']['n'] == 'Russian Federation'
                          and g['properties']['f'] == p['f'] and g['properties']['t'] == p['t'])
            replacement = copy.deepcopy(geometry)
            replacement['type'] = russia['type']
            replacement['arcs'] = copy.deepcopy(russia['arcs'])
            for key in ('a', 'lx', 'ly'):
                replacement['properties'][key] = russia['properties'][key]
            corrected.append(replacement)
        else:
            corrected.append(geometry)
    topo['objects']['p']['geometries'] = corrected
    return True


def polygons(geometry):
    return [geometry['arcs']] if geometry['type'] == 'Polygon' else geometry['arcs']


def polygon_bounds(topo, polygon):
    points = ring_points(topo, polygon[0])
    return min(x for x, y in points), min(y for x, y in points), max(x for x, y in points), max(y for x, y in points)


def within(bounds, box):
    w, s, e, n = bounds
    return box[0] <= w <= e <= box[2] and box[1] <= s <= n <= box[3]


def set_polygons(topo, geometry, parts):
    if not parts:
        raise ValueError('Correction would erase an entire polity')
    geometry['type'] = 'Polygon' if len(parts) == 1 else 'MultiPolygon'
    geometry['arcs'] = parts[0] if len(parts) == 1 else parts
    geometry['properties']['a'] = float(f'{sum(ring_area(ring_points(topo, poly[0])) for poly in parts):.6g}')


def verified_corrections(topo, chunk):
    """Source-backed corrections, reusing existing arcs; see the audit report.

    Split only on documented changes; do not infer a frontier by moving labels.
    The short transition year remains annual, not a claim of day-level precision.
    """
    result = []
    for original in topo['objects']['p']['geometries']:
        p = original['properties']
        name = p['n']
        if name not in {'French Fifth Republic', 'Netherlands Antilles', 'Estado Novo',
                        "People's Republic of Angola", 'Mali Federation', 'Denmark-Norway',
                        'Republic of Suriname', 'Kingdom of Great Britain', '(Kingdom of Great Britain)',
                        'Former Yugoslav Republic of Macedonia', 'Federated Republic of Germany'}:
            result.append(original)
            continue
        cuts = []
        if name == 'French Fifth Republic':
            cuts = [1962, 1977]
        elif name == 'Netherlands Antilles':
            cuts = [1954, 1975, 2010]
        elif name == 'Estado Novo':
            cuts = [1974, 1979, 1992]
        elif name == "People's Republic of Angola":
            cuts = [1992]
        elif name in {'Kingdom of Great Britain', '(Kingdom of Great Britain)'}:
            cuts = [1801]
        elif name == 'Former Yugoslav Republic of Macedonia':
            cuts = [2019]
        edges = [p['f'], *[y for y in cuts if p['f'] < y <= p['t']], p['t'] + 1]
        for start, stop in zip(edges, edges[1:]):
            if stop <= chunk or start > chunk + 24:
                continue
            g = copy.deepcopy(original)
            q = g['properties']
            q.update(f=start, t=stop - 1)
            if name == 'Mali Federation' and start >= 1961:
                q.update(n='Republic of Mali', w='Mali')
            elif name in {'Kingdom of Great Britain', '(Kingdom of Great Britain)'} and start >= 1801:
                q.update(n='(United Kingdom)' if name.startswith('(') else 'United Kingdom', w='United_Kingdom')
            elif name == 'Former Yugoslav Republic of Macedonia' and start >= 2019:
                q.update(n='Republic of North Macedonia', w='North_Macedonia')
            elif name == 'Federated Republic of Germany':
                q.update(n='Federal Republic of Germany', w='Germany')
            elif name == 'Denmark-Norway' and start >= 1815:
                q.update(n='Denmark', w='Denmark')
            elif name == "People's Republic of Angola" and start >= 1992:
                q.update(n='Republic of Angola', w='Angola')
            elif name == 'Estado Novo' and start >= 1979:
                # These source versions contain only the Cabinda enclave.
                if not all(within(polygon_bounds(topo, part), (11, -6, 14, -4)) for part in polygons(g)):
                    raise ValueError('Unexpected post-1979 Estado Novo geometry')
                q.update(n='Cabinda', m="People's Republic of Angola" if start < 1992 else 'Republic of Angola', w='Cabinda_Province')
            elif name == 'Estado Novo' and start >= 1974:
                q.update(n='Portuguese Republic', w='Portugal')
            elif name == 'French Fifth Republic' and start >= 1962:
                parts = []
                for part in polygons(g):
                    bounds = polygon_bounds(topo, part)
                    if within(bounds, (-9, 18, 13, 38)):
                        continue  # Algeria: independence in 1962.
                    if start >= 1977 and within(bounds, (41, 10, 44, 14)):
                        continue  # Djibouti: independence in 1977.
                    parts.append(part)
                set_polygons(topo, g, parts)
                q.update(lx=2.39, ly=46.63)
            elif name == 'Netherlands Antilles':
                caribbean, guiana = [], []
                for part in polygons(g):
                    (guiana if within(polygon_bounds(topo, part), (-59, 1, -53, 7)) else caribbean).append(part)
                if guiana and start < 1975:
                    colony = copy.deepcopy(g)
                    colony['properties'].update(n='Suriname (Dutch colony)', m='Netherlands', w='Surinam_(Dutch_colony)', lx=-56.02, ly=4.06)
                    set_polygons(topo, colony, guiana)
                    result.append(colony)
                set_polygons(topo, g, caribbean)
                q.update(lx=-68.91, ly=12.16)
                if start < 1954:
                    q.update(n='Dutch Caribbean colonies', m='Netherlands', w='Dutch_Caribbean')
                elif start >= 2010:
                    q.update(n='Dutch Caribbean territories', m='Kingdom of the Netherlands', w='Dutch_Caribbean')
            elif name == 'Republic of Suriname' and start == 1976:
                q['f'] = 1975
            result.append(g)
    topo['objects']['p']['geometries'] = result


if __name__ == '__main__':
    changed = []
    for path in sorted(ROOT.glob('c*.json')):
        before = path.read_text()
        topo = json.loads(before)
        original = copy.deepcopy(topo)
        correct(topo)
        verified_corrections(topo, int(path.stem[1:]))
        after = json.dumps(topo, ensure_ascii=False, separators=(',', ':')) + '\n'
        if original != topo:
            path.write_text(after)
            changed.append(path.name)
    print(f'Corrected {len(changed)} border chunks: {", ".join(changed)}')
