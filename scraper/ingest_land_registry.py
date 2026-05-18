"""
Ingests HM Land Registry Price Paid Data, filtered to London postcodes.

Source: https://www.gov.uk/government/statistical-data-sets/price-paid-data-downloads
Year files at: http://prod1.publicdata.landregistry.gov.uk.s3-website-eu-west-1.amazonaws.com/pp-YYYY.csv

Run:
    python ingest_land_registry.py

What it does:
    1. Downloads pp-2025.csv and pp-2026.csv (latest data) from Land Registry
    2. Filters rows to London postcodes (E, EC, N, NW, SE, SW, W, WC)
    3. Filters to transactions within the last 12 months
    4. Upserts into sold_prices table (idempotent — transaction_id is the PK)

Idempotent: re-running just refreshes data; transaction_ids that already exist
are silently updated. Land Registry sometimes revises previous months
(adds late-registered sales, corrects errors), so re-running is normal.

Cost: each year file is ~150MB, ~700k rows. We stream-parse so memory stays low.
"""
import csv
import io
import os
import sys
import urllib.request
from datetime import datetime, timedelta, date
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()
supabase = create_client(os.getenv('SUPABASE_URL'), os.getenv('SUPABASE_KEY'))

# Land Registry yearly file URLs. These are updated monthly by HM Land Registry.
LR_YEAR_URL_TEMPLATE = 'http://prod.publicdata.landregistry.gov.uk.s3-website-eu-west-1.amazonaws.com/pp-{}.csv'

# London postcode area prefixes. The "outward code" (first part of postcode) starts
# with one of these for London proper. We filter by full postcode match here.
LONDON_AREAS = ('E', 'EC', 'N', 'NW', 'SE', 'SW', 'W', 'WC')

# CSV columns in order, per Land Registry spec (no header row in the file)
COLUMNS = [
    'transaction_id',   # 0
    'price',            # 1
    'date_of_transfer', # 2 — "YYYY-MM-DD HH:MM" format
    'postcode',         # 3 — full postcode
    'property_type',    # 4 — D/S/T/F/O
    'new_build',        # 5 — Y/N
    'tenure',           # 6 — F/L
    'paon',             # 7 — primary addressable object name
    'saon',             # 8 — secondary
    'street',           # 9
    'locality',         # 10
    'town_city',        # 11
    'district',         # 12
    'county',           # 13
    'ppd_category',     # 14 — A/B
    'record_status',    # 15 — A/C/D (added/changed/deleted)
]

BATCH_SIZE = 1000  # rows per Supabase upsert call

def postcode_district(pc):
    """Extract the outward code from a UK postcode. 'SW7 4XP' -> 'SW7'.
    Returns None if the postcode looks malformed."""
    if not pc or not pc.strip():
        return None
    parts = pc.strip().split(' ', 1)
    return parts[0].upper() if parts and parts[0] else None

def is_london_postcode(pc):
    """True if the postcode's outward code starts with one of our London area prefixes.
    We compare the area letters (before any digit)."""
    pcd = postcode_district(pc)
    if not pcd:
        return False
    # Extract the area letters (everything before the first digit)
    area = ''
    for ch in pcd:
        if ch.isalpha():
            area += ch
        else:
            break
    return area in LONDON_AREAS

def parse_date(s):
    """Land Registry uses 'YYYY-MM-DD HH:MM' or 'YYYY-MM-DD 00:00'. Return YYYY-MM-DD."""
    try:
        return datetime.strptime(s.strip()[:10], '%Y-%m-%d').date()
    except (ValueError, AttributeError):
        return None

def stream_csv(url):
    """Download and yield rows from a Land Registry CSV. Streams to keep memory low."""
    print(f'  Downloading {url}...')
    req = urllib.request.Request(url, headers={'User-Agent': 'NestLondon/1.0'})
    with urllib.request.urlopen(req, timeout=300) as response:
        # The file is ~150MB; we wrap in a TextIOWrapper to decode lazily
        reader = csv.reader(io.TextIOWrapper(response, encoding='utf-8'))
        for row in reader:
            yield row

def main():
    # Cutoff: last 12 months from today. Any sale before this is skipped.
    cutoff = date.today() - timedelta(days=365)
    print(f'Cutoff date: {cutoff} (skipping sales before this)')

    current_year = datetime.now().year
    years = [current_year - 1, current_year]  # 2025 + 2026 if running in 2026
    print(f'Years to process: {years}')

    batch = []
    stats = {'total_seen': 0, 'london': 0, 'in_window': 0, 'skipped_invalid': 0, 'upserted': 0}

    for year in years:
        url = LR_YEAR_URL_TEMPLATE.format(year)
        try:
            for raw in stream_csv(url):
                stats['total_seen'] += 1

                if len(raw) < len(COLUMNS):
                    stats['skipped_invalid'] += 1
                    continue

                row = dict(zip(COLUMNS, raw))

                # Strip the { } that wraps Land Registry transaction_ids
                txid = row['transaction_id'].strip().lstrip('{').rstrip('}')

                # London filter
                if not is_london_postcode(row['postcode']):
                    continue
                stats['london'] += 1

                # Date filter
                tx_date = parse_date(row['date_of_transfer'])
                if not tx_date or tx_date < cutoff:
                    continue
                stats['in_window'] += 1

                # Validate enums
                ptype = row['property_type'].strip()
                tenure = row['tenure'].strip()
                ppd_cat = row['ppd_category'].strip() or 'A'
                if ptype not in ('D', 'S', 'T', 'F', 'O') or tenure not in ('F', 'L') or ppd_cat not in ('A', 'B'):
                    stats['skipped_invalid'] += 1
                    continue

                # Build the record
                try:
                    price_num = int(row['price'])
                except (ValueError, TypeError):
                    stats['skipped_invalid'] += 1
                    continue

                batch.append({
                    'transaction_id': txid,
                    'price': price_num,
                    'date_of_transfer': tx_date.isoformat(),
                    'postcode': row['postcode'].strip(),
                    'postcode_district': postcode_district(row['postcode']),
                    'property_type': ptype,
                    'new_build': row['new_build'].strip() == 'Y',
                    'tenure': tenure,
                    'paon': (row['paon'] or None) if row['paon'].strip() else None,
                    'saon': (row['saon'] or None) if row['saon'].strip() else None,
                    'street': (row['street'] or None) if row['street'].strip() else None,
                    'ppd_category': ppd_cat,
                })

                # Flush in batches to keep API calls reasonable
                if len(batch) >= BATCH_SIZE:
                    supabase.table('sold_prices').upsert(batch, on_conflict='transaction_id').execute()
                    stats['upserted'] += len(batch)
                    print(f'  Upserted batch (running total: {stats["upserted"]})')
                    batch = []
        except Exception as e:
            print(f'  Error processing {year}: {e}')
            continue

    # Final flush
    if batch:
        supabase.table('sold_prices').upsert(batch, on_conflict='transaction_id').execute()
        stats['upserted'] += len(batch)

    print()
    print('=== Done ===')
    for k, v in stats.items():
        print(f'  {k}: {v:,}')

if __name__ == '__main__':
    main()
