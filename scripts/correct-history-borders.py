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


def polygon_anchor(topo, parts):
    """Choose an interior point of the largest retained regional polygon."""
    part = max(parts, key=lambda poly: ring_area(ring_points(topo, poly[0])))
    rings = [ring_points(topo, ring) for ring in part]
    _, south, _, north = polygon_bounds(topo, part)
    y = (south + north) / 2
    crossings = sorted(a[0] + (y - a[1]) * (b[0] - a[0]) / (b[1] - a[1])
                       for ring in rings for a, b in zip(ring, ring[1:])
                       if (a[1] > y) != (b[1] > y))
    intervals = list(zip(crossings[::2], crossings[1::2]))
    if not intervals:
        raise ValueError('Cannot locate a colonial polygon interior')
    west, east = max(intervals, key=lambda pair: pair[1] - pair[0])
    return round((west + east) / 2, 6), round(y, 6)


def colonial_identities(topo):
    """Separate the source's worldwide New France aggregate, reusing its rings.

    The regional boxes classify disjoint polygons; they never clip an edge.
    Coverage remains source coverage, not a new reconstruction of local control.
    """
    result = []
    source = 'https://www.historymuseum.ca/virtual-museum-of-new-france/colonies-and-empires/'
    aggregate = 'French colonial possessions (source aggregate)'
    for original in topo['objects']['p']['geometries']:
        p = original['properties']
        # Already separated northern records must not be classified again.
        if p['n'] != 'New France' or p.get('source') == source + 'wars-and-imperial-rivalries/':
            result.append(original)
            continue
        groups = {}
        for part in polygons(original):
            bounds = polygon_bounds(topo, part)
            name = aggregate
            if p['t'] < 1763:
                if within(bounds, (-100, 40, -45, 85)):
                    name = 'New France'
                elif within(bounds, (-100, 25, -75, 40)):
                    name = 'French Louisiana'
            groups.setdefault(name, []).append(part)
        for name, parts in groups.items():
            g = copy.deepcopy(original)
            set_polygons(topo, g, parts)
            q = g['properties']
            q.update(n=name)
            if name == 'New France':
                q.update(w='New_France',
                         status='Northern North American coverage of New France. Canada, Acadia and Louisiana had distinct histories; the Louisiana components are shown separately. France ceded Canada to Britain in 1763. These simplified source extents do not establish continuous French control or Indigenous sovereignty.',
                         source=source + 'wars-and-imperial-rivalries/')
            elif name == 'French Louisiana':
                q.update(w='Louisiana_(New_France)',
                         status='Louisiana was a distinct part of New France. These source polygons show selected settlements and claims, not its full extent or continuous effective control.',
                         source=source + 'wars-and-imperial-rivalries/')
            else:
                q.update(w='French_colonial_empire',
                         status='This source aggregates distinct French colonial possessions outside the northern New France records. From 1763 it must not be read as French Canada. Some components retain outdated colonial extents; local control and transfer dates are not independently verified by this aggregate.',
                         source=source + 'other-virtual-museum-of-new-frances/')
            q['lx'], q['ly'] = polygon_anchor(topo, parts)
            result.append(g)
    topo['objects']['p']['geometries'] = result


def historical_extent_notes(topo):
    """Explain source extents using historical records, without redrawing them."""
    for g in topo['objects']['p']['geometries']:
        p = g['properties']
        if p['n'] == 'State of Israel' and p['f'] >= 1967:
            p.update(basis='Control and sovereignty differ',
                     status='In June 1967, Israel captured the West Bank, East Jerusalem, Gaza, Sinai and the Golan Heights. This source combines Israel with some areas brought under military control; its changing outlines do not distinguish military control, civil administration and sovereignty. They do not reconstruct later local administrative arrangements or establish agreed borders. The linked historical documents concern 1967, not conditions in every later year.',
                     source='https://history.state.gov/historicaldocuments/frus1964-68v19')


def crimea_occupation(topo, chunk):
    """Keep sovereignty and occupation distinct, using the source's Crimea ring.

    UNGA 68/262 affirms Ukraine's territorial integrity; 76/70 identifies Russia
    as the occupying power. Annual snapshots cannot express the day in 2014.
    This is a Crimea correction, not a reconstruction of the wider front line.
    """
    if not chunk <= 2014 <= chunk + 24:
        return
    geometries = topo['objects']['p']['geometries']
    russia = [g for g in geometries if g['properties']['n'] in
              {'Russian Federation', '(Russian Federation)'} and g['properties']['f'] >= 2014]
    box = (32, 44, 37, 46.5)
    crimea = next((part for g in russia for part in polygons(g)
                   if within(polygon_bounds(topo, part), box)), None)
    # On a second run the ring has already been removed from Russia.
    if crimea is None:
        return
    for g in russia:
        set_polygons(topo, g, [part for part in polygons(g)
                              if not within(polygon_bounds(topo, part), box)])
    for g in geometries:
        if g['properties']['n'] == 'Ukraine' and g['properties']['t'] >= 2014:
            if not any(within(polygon_bounds(topo, part), box) for part in polygons(g)):
                set_polygons(topo, g, [*polygons(g), copy.deepcopy(crimea)])
    if not any(g['properties']['n'] == 'Crimea (occupied by Russia)' for g in geometries):
        region = {'type': 'Polygon', 'arcs': copy.deepcopy(crimea), 'properties': {
            'n': 'Crimea (occupied by Russia)', 'm': 'Ukraine', 'f': 2014, 't': 2024,
            'w': 'Crimea', 'lx': 34.1, 'ly': 45.3,
            'status': 'Ukrainian territory occupied by Russia since 2014. The UN General Assembly affirms Ukraine\u2019s territorial integrity and does not recognize Russia\u2019s annexation.',
            'source': 'https://mandates.un.org/mandate/A/RES/76/70',
        }}
        set_polygons(topo, region, [crimea])
        geometries.append(region)


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
                        'United Kingdom', '(United Kingdom)', 'Mujahideen',
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
            cuts = [1801, 1971]
        elif name in {'United Kingdom', '(United Kingdom)'}:
            cuts = [1971]
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
            elif name == 'Mujahideen':
                q.update(n='Mujahideen (source identity unverified)',
                         status='This source uses a generic term, not a verified group identity. Its static outlines do not establish which armed group controlled these areas in a given year and must not be read as current front lines.',
                         source='https://github.com/Seshat-Global-History-Databank/cliopatria')
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
            if q['n'] in {'United Kingdom', '(United Kingdom)'} and start >= 1971:
                # The 1969–2023 source version still unions in the Gulf states.
                # Bahrain, Qatar and the UAE became independent in 1971.
                set_polygons(topo, g, [part for part in polygons(g)
                                      if not within(polygon_bounds(topo, part), (49, 15, 61, 28))])
                q.update(lx=-2.59, ly=53.91)
                if q['m'] == '(British Empire)':
                    q['m'] = ''
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
        crimea_occupation(topo, int(path.stem[1:]))
        colonial_identities(topo)
        historical_extent_notes(topo)
        after = json.dumps(topo, ensure_ascii=False, separators=(',', ':')) + '\n'
        if original != topo:
            path.write_text(after)
            changed.append(path.name)
    print(f'Corrected {len(changed)} border chunks: {", ".join(changed)}')
