"""Dated corrections must preserve source arcs and be safe to regenerate."""
import copy
import importlib.util
import json
from pathlib import Path
import sys
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts'))
spec = importlib.util.spec_from_file_location('border_corrections', ROOT / 'scripts/correct-history-borders.py')
corrections = importlib.util.module_from_spec(spec)
spec.loader.exec_module(corrections)


class IdentityCorrectionTests(unittest.TestCase):
    def test_identity_corrections_are_idempotent_and_preserve_geometry(self):
        for name, start, end, expected in [
            ('Grand Duchy of Berg', 1806, 1827, [(1806, 1827)]),
            ('United Principalities of Moldavia and Wallachia', 1880, 1899, [(1880, 1880), (1881, 1899)]),
            ('Turkish Republic of Northern Cyprus', 1976, 2023, [(1976, 1982), (1983, 2023)]),
        ]:
            with self.subTest(name=name):
                geometry = {'type': 'Polygon', 'arcs': [[0]], 'properties': {
                    'n': name, 'm': '', 'f': start, 't': end,
                }}
                topo = {'arcs': [[[0, 0], [1, 0], [0, 1], [-1, -1]]],
                        'objects': {'p': {'geometries': [geometry]}}}
                arcs = copy.deepcopy(topo['arcs'])
                corrections.reviewed_identities(topo)
                rows = topo['objects']['p']['geometries']
                self.assertEqual([(r['properties']['f'], r['properties']['t']) for r in rows], expected)
                self.assertTrue(all(r['arcs'] == [[0]] for r in rows))
                self.assertEqual(topo['arcs'], arcs)
                once = copy.deepcopy(topo)
                corrections.reviewed_identities(topo)
                self.assertEqual(topo, once)

    def test_checked_in_corrections_need_no_further_changes(self):
        for chunk in [1800, 1825, 1875, 1900, 1975, 2000]:
            with self.subTest(chunk=chunk):
                topo = json.loads((ROOT / f'static/historyallaround/atlas/borders/c{chunk}.json').read_text())
                before = copy.deepcopy(topo)
                corrections.reviewed_identities(topo)
                self.assertEqual(topo, before)


if __name__ == '__main__':
    unittest.main()
