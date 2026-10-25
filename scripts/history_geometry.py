"""Interior navigation points for TopoJSON polygons, without changing geometry."""
import math


def interior_anchor(topology, geometry):
    scale = topology['transform']['scale']
    translate = topology['transform']['translate']
    decoded = {}

    def ring(indices):
        points = []
        for index in indices:
            number = index if index >= 0 else ~index
            if number not in decoded:
                x = y = 0
                arc = []
                for dx, dy in topology['arcs'][number]:
                    x += dx
                    y += dy
                    arc.append([x * scale[0] + translate[0], y * scale[1] + translate[1]])
                decoded[number] = arc
            segment = decoded[number] if index >= 0 else list(reversed(decoded[number]))
            points.extend(segment if not points else segment[1:])
        unwrapped = [points[0]]
        for x, y in points[1:]:
            previous = unwrapped[-1][0]
            while x - previous > 180:
                x -= 360
            while x - previous < -180:
                x += 360
            unwrapped.append([x, y])
        return unwrapped

    def area(polygon):
        exterior = polygon[0]
        value = abs(sum(a[0] * b[1] - b[0] * a[1] for a, b in zip(exterior, exterior[1:])))
        return value * math.cos(math.radians(sum(p[1] for p in exterior) / len(exterior)))

    source = [geometry['arcs']] if geometry['type'] == 'Polygon' else geometry['arcs']
    polygons = [[ring(indices) for indices in polygon] for polygon in source]
    polygon = max(polygons, key=area)
    # Align holes to an exterior that may cross the antimeridian.
    longitude = sum(p[0] for p in polygon[0]) / len(polygon[0])
    aligned = [polygon[0]]
    for hole in polygon[1:]:
        shift = round((longitude - sum(p[0] for p in hole) / len(hole)) / 360) * 360
        aligned.append([[x + shift, y] for x, y in hole])
    south, north = min(p[1] for p in polygon[0]), max(p[1] for p in polygon[0])
    best = None
    for fraction in [.5, .4, .6, .3, .7, .2, .8, .1, .9]:
        y = south + (north - south) * fraction
        # A vertex latitude can put the candidate on a horizontal edge rather
        # than inside it, especially after coordinate rounding and spherical rendering.
        if any(abs(point[1] - y) < 1e-7 for boundary in aligned for point in boundary):
            y += (north - south) * .001
        xs = sorted(a[0] + (y - a[1]) * (b[0] - a[0]) / (b[1] - a[1])
                    for boundary in aligned for a, b in zip(boundary, boundary[1:])
                    if (a[1] > y) != (b[1] > y))
        for left, right in zip(xs[::2], xs[1::2]):
            width = (right - left) * math.cos(math.radians(y))
            if best is None or width > best[0]:
                best = (width, (left + right) / 2, y)
    if best is None:
        raise ValueError('Could not find an interior historical navigation point')
    return [round(((best[1] + 180) % 360) - 180, 6), round(best[2], 6)]
