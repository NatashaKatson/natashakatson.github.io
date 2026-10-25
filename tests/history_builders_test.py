"""Offline regressions for parameter-sensitive reconstruction caches."""
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
from unittest import mock
from urllib.parse import parse_qs, urlsplit


SCRIPT = Path(__file__).resolve().parents[1] / 'scripts/build-history-paleogeography.py'
spec = importlib.util.spec_from_file_location('paleogeography_builder', SCRIPT)
paleo = importlib.util.module_from_spec(spec)
spec.loader.exec_module(paleo)


class ReconstructionCacheTests(unittest.TestCase):
    def test_coordinates_order_and_model_are_part_of_cache_identity(self):
        calls = []

        def download(command, **kwargs):
            query = parse_qs(urlsplit(command[-1]).query)
            points = list(zip(map(float, query['lons'][0].split(',')),
                              map(float, query['lats'][0].split(','))))
            Path(command[command.index('-o') + 1]).write_text(json.dumps({'coordinates': points}))
            calls.append(query)

        with tempfile.TemporaryDirectory() as directory, mock.patch.object(paleo, 'CACHE', Path(directory)), \
                mock.patch.object(paleo.subprocess, 'run', side_effect=download):
            # Older caches cannot prove which input coordinates they contain.
            (paleo.CACHE / 'reconstruct_points-150.json').write_text('{"coordinates":[[99,99]]}')
            first = paleo.fetch('reconstruct_points', 150, lons='10,30', lats='20,40')
            self.assertEqual(first['coordinates'], [[10, 20], [30, 40]])
            self.assertEqual(paleo.fetch('reconstruct_points', 150, lats='20,40', lons='10,30'), first)
            self.assertEqual(len(calls), 1, 'argument ordering does not cause duplicate downloads')
            changed = paleo.fetch('reconstruct_points', 150, lons='80,30', lats='40,40')
            self.assertEqual(changed['coordinates'][0], [80, 40])
            reordered = paleo.fetch('reconstruct_points', 150, lons='30,10', lats='40,20')
            self.assertEqual(reordered['coordinates'], [[30, 40], [10, 20]])
            with mock.patch.object(paleo, 'MODEL', 'another-model'):
                paleo.fetch('reconstruct_points', 150, lons='10,30', lats='20,40')
            self.assertEqual(len(calls), 4)

    def test_invalid_download_is_not_cached_and_can_be_retried(self):
        def download(command, **kwargs):
            Path(command[command.index('-o') + 1]).write_text('not JSON')

        with tempfile.TemporaryDirectory() as directory, mock.patch.object(paleo, 'CACHE', Path(directory)), \
                mock.patch.object(paleo.subprocess, 'run', side_effect=download):
            with self.assertRaises(json.JSONDecodeError):
                paleo.fetch('coastlines', 150)
            self.assertEqual(list(paleo.CACHE.iterdir()), [])


if __name__ == '__main__':
    unittest.main()
