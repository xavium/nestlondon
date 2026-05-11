"""
Backfill raw_data.photo_tags for listings that don't have them yet.
Calls the deployed /api/listing-tags endpoint, which uses Haiku 4.5 and caches the result.

Usage:
  source venv/bin/activate
  python3 backfill_photo_tags.py [--dry-run] [--limit N] [--base-url URL]

Defaults: base-url = http://localhost:3000 (run dev server first)
Production: pass --base-url https://nestlondon.vercel.app (or wherever)
"""
import os, json, time, argparse, urllib.request, urllib.error
from supabase import create_client
from dotenv import load_dotenv

load_dotenv('../.env.local')
sb = create_client(os.environ['NEXT_PUBLIC_SUPABASE_URL'], os.environ['SUPABASE_SERVICE_ROLE_KEY'])

DELAY_SECONDS = 1.0  # gentle pacing — the route hits Anthropic 3x per listing


def has_tags(raw):
    if isinstance(raw, str):
        try: raw = json.loads(raw)
        except: return False
    pt = (raw or {}).get('photo_tags') or {}
    return bool(pt.get('style') or pt.get('features'))


def main(dry_run: bool, limit: int, base_url: str):
    result = sb.table('listings').select('id, address, raw_data, images').execute()
    candidates = []
    for row in result.data:
        if has_tags(row.get('raw_data')):
            continue
        # Must have at least one image
        imgs = row.get('images') or '[]'
        try:
            imgs_list = json.loads(imgs) if isinstance(imgs, str) else imgs
        except:
            imgs_list = []
        if not imgs_list:
            continue
        candidates.append((row['id'], row['address']))

    print(f'Found {len(candidates)} listings missing photo_tags (with images)')
    if limit:
        candidates = candidates[:limit]
        print(f'Limiting to first {limit}')

    if dry_run:
        for cid, addr in candidates[:20]:
            print(f'  [DRY RUN] would tag {cid}  {addr}')
        if len(candidates) > 20:
            print(f'  ...and {len(candidates) - 20} more')
        return

    successes = 0
    failures = 0
    for i, (cid, addr) in enumerate(candidates):
        print(f'[{i+1}/{len(candidates)}] {cid}  {addr[:60]}')
        try:
            req = urllib.request.Request(
                base_url.rstrip('/') + '/api/listing-tags?listing_id=' + cid,
                method='GET',
            )
            with urllib.request.urlopen(req, timeout=60) as r:
                body = r.read().decode()
                data = json.loads(body)
                if data.get('tags'):
                    tags = data['tags']
                    feat_count = len((tags.get('features') or []))
                    print(f'  ✓ style={tags.get("style")} condition={tags.get("condition")} features={feat_count}')
                    successes += 1
                else:
                    print(f'  - No tags returned')
                    failures += 1
        except urllib.error.HTTPError as e:
            print(f'  ✗ HTTP {e.code}: {e.reason}')
            failures += 1
        except Exception as e:
            print(f'  ✗ Error: {e}')
            failures += 1
        if i < len(candidates) - 1:
            time.sleep(DELAY_SECONDS)

    print(f'\nDone. {successes} updated, {failures} failed.')


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--dry-run', action='store_true')
    parser.add_argument('--limit', type=int, default=0)
    parser.add_argument('--base-url', default='http://localhost:3000')
    args = parser.parse_args()
    main(args.dry_run, args.limit, args.base_url)
