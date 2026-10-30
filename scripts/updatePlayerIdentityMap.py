#!/usr/bin/env python3
"""Refresh only the compact player ID crosswalk from official nflverse rosters."""
import argparse
import csv
import io
import json
from datetime import datetime, timezone
from pathlib import Path
from urllib.request import urlopen

parser = argparse.ArgumentParser()
parser.add_argument('--season', required=True, type=int)
args = parser.parse_args()
if not 2000 <= args.season <= 2100:
    parser.error('Use a valid NFL season.')
source = f'https://github.com/nflverse/nflverse-data/releases/download/rosters/roster_{args.season}.csv'
with urlopen(source, timeout=30) as response:
    rows = list(csv.DictReader(io.StringIO(response.read().decode())))
fields = ['sleeper_id', 'espn_id', 'yahoo_id', 'full_name', 'position']
if not rows or any(field not in rows[0] for field in fields):
    raise ValueError('Source lacks the expected identity columns; existing map preserved.')
def clean(value):
    return '' if value in (None, '', 'NA', 'NaN') else str(value)
entries = list(dict.fromkeys(tuple(clean(row.get(field)) for field in fields) for row in rows
    if sum(bool(clean(row.get(field))) for field in fields[:3]) >= 2))
if len(entries) < 500:
    raise ValueError('Incomplete identity source; existing map preserved.')
target = Path(__file__).resolve().parents[1] / 'src/data/playerIdentityMap.json'
payload = {'source': source, 'retrievedAt': datetime.now(timezone.utc).date().isoformat(),
    'columns': ['sleeper', 'espn', 'yahoo', 'name', 'position'], 'players': entries}
target.write_text(json.dumps(payload, separators=(',', ':')) + '\n')
print(f'Updated {len(entries)} player identities for {args.season}.')
