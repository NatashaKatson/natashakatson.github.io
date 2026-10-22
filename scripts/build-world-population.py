#!/usr/bin/env python3
"""Extract World from OWID's long-run population CSV and retain its source metadata.

Usage: python3 scripts/build-world-population.py source.csv source.metadata.json
No network access or third-party packages are required by this builder.
"""
import argparse
import csv
import json
from pathlib import Path

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('csv', type=Path)
parser.add_argument('metadata', type=Path)
args = parser.parse_args()
metadata = json.loads(args.metadata.read_text())
rows = []
with args.csv.open(newline='') as f:
    reader = csv.DictReader(f)
    projected = next(c for c in reader.fieldnames if c.startswith('Population (projections)'))
    for record in reader:
        if record['Entity'] != 'World' or record['Code'] != 'OWID_WRL' or int(record['Year']) > 2026:
            continue
        historical = record['Population']
        projection = record[projected]
        if not historical and not projection:
            continue
        rows.append([int(record['Year']), int(historical or projection), int(not historical)])
rows.sort()
assert rows and len({r[0] for r in rows}) == len(rows)
assert all(r[1] > 0 for r in rows)
assert all((r[0] <= 2023 and r[2] == 0) or (r[0] >= 2024 and r[2] == 1) for r in rows)
columns = metadata['columns']
data = {
    'version': 1,
    'entity': 'World',
    'unit': 'people',
    'sourceUrl': metadata['chart']['originalChartUrl'],
    'downloaded': metadata['dateDownloaded'],
    'updated': columns['Population (historical)']['lastUpdated'],
    'historicalSource': columns['Population (historical)']['citationShort'],
    'projectionSource': columns['Population (projections)']['citationShort'],
    'projectionScenario': 'UN WPP 2024 medium variant',
    'projectionFrom': 2024,
    'fields': ['year', 'population', 'projection'],
    'rows': rows,
}
output = Path(__file__).resolve().parents[1] / 'static/historyallaround/atlas/population.json'
output.write_text(json.dumps(data, ensure_ascii=False, separators=(',', ':')) + '\n')
print(f'{len(rows)} world-population samples, {rows[0][0]} to {rows[-1][0]}; {output.stat().st_size} bytes')
