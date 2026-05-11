#!/usr/bin/env python3
"""Backfill listings.borough from lat/lng using point-in-polygon against public/boundaries/boroughs.json"""

import json
import os
import sys
import requests
from pathlib import Path

# Load env
env_path = Path(__file__).parent.parent / '.env.local'
env = {}
if env_path.exists():
    for line in env_path.read_text().splitlines():
        if '=' in line and not line.startswith('#'):
            k, v = line.split('=', 1)
            env[k.strip()] = v.strip()

SUPABASE_URL = env.get('NEXT_PUBLIC_SUPABASE_URL')
SUPABASE_KEY = env.get('SUPABASE_SERVICE_ROLE_KEY')
if not SUPABASE_URL or not SUPABASE_KEY:
    print('Missing env vars'); sys.exit(1)

HEADERS = {
    'apikey': SUPABASE_KEY,
    'Authorization': f'Bearer {SUPABASE_KEY}',
    'Content-Type': 'application/json',
}

# Load borough polygons
boundaries_path = Path(__file__).parent.parent / 'public' / 'boundaries' / 'boroughs.json'
boundaries = json.loads(boundaries_path.read_text())
print(f'Loaded {len(boundaries["features"])} borough polygons')


def point_in_ring(lng, lat, ring):
    """Standard ray-casting point-in-polygon for a single ring."""
    n = len(ring)
    inside = False
    j = n - 1
    for i in range(n):
        xi, yi = ring[i][0], ring[i][1]
        xj, yj = ring[j][0], ring[j][1]
        if ((yi > lat) != (yj > lat)) and (lng < (xj - xi) * (lat - yi) / (yj - yi) + xi):
            inside = not inside
        j = i
    return inside


def find_borough(lat, lng):
    """Test a single point against all borough polygons."""
    for feature in boundaries['features']:
        name = feature['properties']['LAD23NM']
        geom = feature['geometry']
        gtype = geom['type']
        coords = geom['coordinates']
        if gtype == 'Polygon':
            # First ring is exterior; subsequent rings are holes (ignore for our purposes)
            if point_in_ring(lng, lat, coords[0]):
                return name
        elif gtype == 'MultiPolygon':
            for polygon in coords:
                if point_in_ring(lng, lat, polygon[0]):
                    return name
    return None


# Fetch all listings with lat/lng but no borough (or with junk borough)
JUNK_BOROUGHS = {None, 'T', 'Test', 'test', 'E1', 'E8'}
url = f'{SUPABASE_URL}/rest/v1/listings?select=id,latitude,longitude,borough&latitude=not.is.null&longitude=not.is.null&limit=1000'
r = requests.get(url, headers=HEADERS)
r.raise_for_status()
listings = r.json()
print(f'{len(listings)} listings to evaluate')

updated = 0
unmatched = 0
for l in listings:
    current = l.get('borough')
    # Skip if borough already looks valid (not in junk set, not a postcode-ish string)
    if current and current not in JUNK_BOROUGHS and not current.isupper():
        continue
    lat, lng = l['latitude'], l['longitude']
    if lat is None or lng is None:
        continue
    name = find_borough(float(lat), float(lng))
    if not name:
        unmatched += 1
        continue
    if name == current:
        continue
    # Update
    patch_url = f'{SUPABASE_URL}/rest/v1/listings?id=eq.{l["id"]}'
    pr = requests.patch(patch_url, headers=HEADERS, json={'borough': name})
    pr.raise_for_status()
    updated += 1
    if updated % 50 == 0:
        print(f'  ... {updated} updated')

print(f'\nDone. Updated: {updated}, unmatched: {unmatched}')
