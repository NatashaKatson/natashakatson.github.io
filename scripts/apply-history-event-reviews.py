#!/usr/bin/env python3
"""Apply reviewed event fields without changing record order or numeric IDs."""
import json
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
path = ROOT / 'static/historyallaround/atlas/index.html'
reviews = json.loads((ROOT / 'docs/history-event-corrections.json').read_text())['events']
changes = {row['wiki']: row for row in reviews}
if len(changes) != len(reviews):
    raise ValueError('Duplicate review keys')
fields = {'start': 0, 'end': 1, 'approx': 2, 'title': 3, 'blurb': 4, 'lat': 5, 'lon': 6, 'source': 10, 'ongoing': 15}
seen = set()


def replace(match):
    row = json.loads(match.group().rstrip(','))
    review = changes.get(row[9])
    if not review:
        return match.group()
    for field, index in fields.items():
        if field in review:
            while len(row) <= index:
                row.append(None)
            row[index] = review[field]
    seen.add(row[9])
    return json.dumps(row, ensure_ascii=False, separators=(',', ':')) + ','


text = path.read_text()
end = text.index('const PEOPLE = [')
text = re.sub(r'^\[.*\],?$', replace, text[:end], flags=re.M) + text[end:]
if seen != set(changes):
    raise ValueError(f'Review records missing from the atlas: {set(changes) - seen}')
path.write_text(text)
print(f'Applied {len(seen)} reviewed event records')
