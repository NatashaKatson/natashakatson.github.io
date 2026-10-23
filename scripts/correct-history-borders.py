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


if __name__ == '__main__':
    for name in ('c1975.json', 'c2000.json'):
        path = ROOT / name
        topo = json.loads(path.read_text())
        if correct(topo):
            path.write_text(json.dumps(topo, ensure_ascii=False, separators=(',', ':')) + '\n')
            print(f'{name}: corrected regional names, membership and Russia envelope')
