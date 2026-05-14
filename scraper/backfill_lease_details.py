"""
Backfill lease-detail columns (lease_years_remaining, service_charge_annual,
ground_rent_annual) for all existing listings.

Also cleans the mashed-in "Lease Years Remaining: N" suffix from the Tenure
field of raw_data.letting_details, so the existing tenure-string filter keeps
working consistently after this run.

Idempotent — re-running produces the same end state.

Usage:
  cd scraper && source venv/bin/activate
  python backfill_lease_details.py               # full run
  python backfill_lease_details.py --dry-run     # report only, no writes
  python backfill_lease_details.py --limit 20    # process first 20 only
"""
import argparse
import json
import os
import sys
from collections import Counter

from supabase import create_client

# Local import — same directory
from lease_extractor import extract_lease_details


def load_env():
    """Read .env in the scraper dir, fall back to project .env.local if needed."""
    # The scraper has its own .env (we saw it earlier)
    for path in ['.env', '../.env.local']:
        if not os.path.exists(path):
            continue
        with open(path) as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith('#') or '=' not in line:
                    continue
                k, _, v = line.partition('=')
                k, v = k.strip(), v.strip().strip('"').strip("'")
                if k and v and k not in os.environ:
                    os.environ[k] = v


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--dry-run', action='store_true', help='Report changes without writing')
    parser.add_argument('--limit', type=int, default=None, help='Process only N listings')
    args = parser.parse_args()

    load_env()
    url = os.environ.get('NEXT_PUBLIC_SUPABASE_URL') or os.environ.get('SUPABASE_URL')
    key = os.environ.get('SUPABASE_SERVICE_ROLE_KEY')
    if not url or not key:
        print('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env')
        sys.exit(1)

    supabase = create_client(url, key)

    # Pull all active listings. We need raw_data + description.
    # Supabase JS client paginates; the Python client does too — fetch in chunks of 1000.
    rows = []
    offset = 0
    chunk = 1000
    while True:
        q = (supabase.table('listings')
             .select('id, description, raw_data, lease_years_remaining, service_charge_annual, ground_rent_annual')
             .eq('is_active', True)
             .range(offset, offset + chunk - 1)
             .execute())
        batch = q.data or []
        rows.extend(batch)
        if len(batch) < chunk:
            break
        offset += chunk

    if args.limit:
        rows = rows[:args.limit]

    print(f'Loaded {len(rows)} active listings')

    stats = Counter()
    updates_planned = []

    for row in rows:
        rd = row.get('raw_data')
        if isinstance(rd, str):
            try:
                rd = json.loads(rd)
            except Exception:
                rd = {}
        rd = rd or {}

        letting_details = rd.get('letting_details') or {}
        key_features = rd.get('key_features') or []
        description = row.get('description') or ''

        result = extract_lease_details(letting_details, key_features, description)

        update = {}
        # Numeric columns — write if different from current (None vs None is no-op).
        for col, key in [
            ('lease_years_remaining', 'lease_years_remaining'),
            ('service_charge_annual', 'service_charge_annual'),
            ('ground_rent_annual', 'ground_rent_annual'),
        ]:
            new_val = result[key]
            cur_val = row.get(col)
            if new_val != cur_val:
                update[col] = new_val
                if new_val is not None:
                    stats[f'set_{col}'] += 1

        # Tenure cleanup — only update raw_data if the cleaned value differs.
        new_tenure = result['tenure_cleaned']
        old_tenure = letting_details.get('Tenure')
        if new_tenure and old_tenure and new_tenure != old_tenure:
            new_ld = dict(letting_details)
            new_ld['Tenure'] = new_tenure
            new_rd = dict(rd)
            new_rd['letting_details'] = new_ld
            update['raw_data'] = json.dumps(new_rd)
            stats['cleaned_tenure'] += 1

        if update:
            stats['rows_with_changes'] += 1
            updates_planned.append((row['id'], update))

    print('\n--- Planned changes ---')
    for k, v in sorted(stats.items()):
        print(f'  {k}: {v}')

    if args.dry_run:
        print('\n--dry-run: not writing. Re-run without --dry-run to apply.')
        return

    if not updates_planned:
        print('\nNothing to update.')
        return

    print(f'\nApplying {len(updates_planned)} updates...')
    applied = 0
    failed = 0
    for listing_id, update in updates_planned:
        try:
            supabase.table('listings').update(update).eq('id', listing_id).execute()
            applied += 1
        except Exception as e:
            failed += 1
            print(f'  FAIL {listing_id}: {e}')
    print(f'\nApplied: {applied}, failed: {failed}')


if __name__ == '__main__':
    main()
