#!/usr/bin/env python3
"""Build a pinned, offline women’s empowerment series without interpolating gaps."""
import argparse
import csv
import hashlib
import json
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'scripts/sources/womens-empowerment/vdem-v16-owid.csv'
META = SOURCE.with_name('vdem-v16-owid.metadata.json')
OUTPUT = ROOT / 'static/historyallaround/atlas/womens-empowerment.json'
AGGREGATES = {'World', 'Africa', 'Asia', 'Europe', 'North America', 'South America', 'Oceania'}


def build():
    metadata = json.loads(META.read_text())
    groups = defaultdict(dict)
    codes = {}
    for row in csv.DictReader(SOURCE.open(newline='')):
        name = row['Entity']
        if name in AGGREGATES or name.endswith(' (population-weighted)'):
            continue
        if not row["Women's Political Empowerment Index"]:
            continue
        year = int(row['Year'])
        value = float(row["Women's Political Empowerment Index"])
        assert 1789 <= year <= 2025 and 0 <= value <= 1, row
        assert year not in groups[name], (name, year)
        scaled = round(value * 1000)
        assert abs(scaled / 1000 - value) < 1e-9, 'Do not silently round new source precision'
        groups[name][year] = scaled
        codes[name] = row['Code']
    entities = []
    for name, scores in sorted(groups.items()):
        first, last = min(scores), max(scores)
        entities.append({'name': name, 'code': codes[name], 'first': first,
                         'values': [scores.get(year) for year in range(first, last + 1)]})
    return {
        'schemaVersion': 1, 'indicator': 'v2x_gender', 'scale': 1000,
        'firstYear': 1789, 'lastYear': 2025, 'release': 'V-Dem v16 (2026)',
        'downloaded': metadata['dateDownloaded'],
        'source': 'https://ourworldindata.org/grapher/women-political-empowerment-index',
        'producer': 'https://www.v-dem.net/data/the-v-dem-dataset/',
        'codebook': 'https://www.v-dem.net/documents/70/codebook_v16.pdf',
        'license': 'CC BY-SA 4.0', 'licenseUrl': 'https://creativecommons.org/licenses/by-sa/4.0/',
        'citation': metadata['columns']["Women's political empowerment index (central estimate)"]['citationLong'],
        'sourceSha256': hashlib.sha256(SOURCE.read_bytes()).hexdigest(),
        'processing': 'Regional averages excluded. Scores stored losslessly as thousandths. Missing years stay null. OWID includes documented historical-regime assignments for some countries. No local interpolation or backfill.',
        'entities': entities,
    }


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    data = build()
    encoded = json.dumps(data, ensure_ascii=False, separators=(',', ':')) + '\n'
    if args.check:
        assert OUTPUT.read_text() == encoded, 'Regenerate with scripts/build-womens-empowerment.py'
    else:
        OUTPUT.write_text(encoded)
    count = sum(value is not None for entity in data['entities'] for value in entity['values'])
    print(f"{len(data['entities'])} country/historical-unit series; {count} annual scores; 1789–2025")
