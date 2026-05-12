#!/usr/bin/env python3
"""Backfill listings.postcode_district from lat/lng using public/boundaries/postcodes.json"""

import json
import sys
import requests
from pathlib import Path

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

# Load postcode district polygons
boundaries_path = Path(__file__).parent.parent / 'public' / 'boundaries' / 'postcodes.json'
boundaries = json.loads(boundaries_path.read_text())
print(f'Loaded {len(boundaries["features"])} postcode district polygons')


def point_in_ring(lng, lat, ring):
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


def find_postcode_district(lat, lng):
    for feature in boundaries['features']:
        name = feature['properties'].get('name')
        geom = feature['geometry']
        gtype = geom['type']
        coords = geom['coordinates']
        if gtype == 'Polygon':
            if point_in_ring(lng, lat, coords[0]):
                return name
        elif gtype == 'MultiPolygon':
            for polygon in coords:
                if point_in_ring(lng, lat, polygon[0]):
                    return name
    return None


# Fetch all listings with lat/lng
url = f'{SUPABASE_URL}/rest/v1/listings?select=id,latitude,longitude,postcode_district&latitude=not.is.null&longitude=not.is.null&limit=1000'
r = requests.get(url, headers=HEADERS)
r.raise_for_status()
listings = r.json()
print(f'{len(listings)} listings to evaluate')

updated = 0
unmatched = 0
for l in listings:
    if l.get('postcode_district'):
        continue
    lat, lng = l['latitude'], l['longitude']
    if lat is None or lng is None:
        continue
    district = find_postcode_district(float(lat), float(lng))
    if not district:
        unmatched += 1
        continue
    patch_url = f'{SUPABASE_URL}/rest/v1/listings?id=eq.{l["id"]}'
    pr = requests.patch(patch_url, headers=HEADERS, json={'postcode_district': district})
    pr.raise_for_status()
    updated += 1
    if updated % 50 == 0:
        print(f'  ... {updated} updated')

print(f'\nDone. Updated: {updated}, unmatched: {unmatched}')
