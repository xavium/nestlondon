"""
Batch backfill floorplans for listings where raw_data.floorplans is empty.

Usage:
  source venv/bin/activate
  python3 backfill_floorplans.py [--dry-run] [--limit N]
"""
import asyncio, os, sys, json, re, argparse
from playwright.async_api import async_playwright
from supabase import create_client
from dotenv import load_dotenv

load_dotenv('../.env.local')
sb = create_client(os.environ['NEXT_PUBLIC_SUPABASE_URL'], os.environ['SUPABASE_SERVICE_ROLE_KEY'])

DELAY_SECONDS = 5  # rate limit between Rightmove requests


async def extract_floorplans(page, url):
    await page.goto(url, wait_until='domcontentloaded', timeout=30000)
    await page.wait_for_timeout(3000)
    html_content = await page.content()
    html_fp_raw = re.findall(r'https://media\.rightmove\.co\.uk/[^\s"\'\\<>]+property-floorplan[^\s"\'\\<>]+', html_content)
    dom_fp = await page.evaluate('''() => {
        const imgs = Array.from(document.querySelectorAll('img'))
        return imgs.map(img => img.src).filter(src => src && (src.includes('floorplan') || src.includes('floor_plan') || src.includes('floor-plan')))
    }''')
    floorplan_imgs = list(html_fp_raw) + list(dom_fp)
    seen = set()
    full_res_fp = []
    for u in floorplan_imgs:
        if not u or not u.startswith('http'): continue
        u = u.rstrip('\\<>\'"')
        upgraded = re.sub(r'_max_\d+x\d+(?=\.[a-zA-Z]{3,4}$)', '', u)
        h = upgraded.rsplit('/', 1)[-1].rsplit('.', 1)[0]
        if h in seen: continue
        seen.add(h)
        full_res_fp.append(upgraded)
    return full_res_fp


async def main(dry_run: bool, limit: int):
    # Fetch every listing where floorplans is empty AND we have a source_url
    result = sb.table('listings').select('id, source_url, raw_data').not_.is_('source_url', 'null').execute()
    candidates = []
    for row in result.data:
        raw = row.get('raw_data') or {}
        if isinstance(raw, str):
            try: raw = json.loads(raw)
            except: raw = {}
        floorplans = raw.get('floorplans', [])
        if not floorplans and row.get('source_url') and 'rightmove' in row['source_url'].lower():
            candidates.append((row['id'], row['source_url'], raw))

    print(f'Found {len(candidates)} listings missing floorplans (with Rightmove source_url)')
    if limit:
        candidates = candidates[:limit]
        print(f'Limiting to first {limit}')

    if dry_run:
        for cid, curl, _ in candidates:
            print(f'  [DRY RUN] would rescrape {cid} -> {curl}')
        return

    successes = 0
    failures = 0
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        try:
            for i, (cid, curl, raw) in enumerate(candidates):
                print(f'[{i+1}/{len(candidates)}] {cid}')
                print(f'  URL: {curl}')
                try:
                    page = await browser.new_page()
                    floorplans = await extract_floorplans(page, curl)
                    await page.close()
                    if floorplans:
                        raw['floorplans'] = floorplans
                        sb.table('listings').update({'raw_data': raw}).eq('id', cid).execute()
                        print(f'  ✓ Saved {len(floorplans)} floorplan(s)')
                        successes += 1
                    else:
                        print(f'  - No floorplans found (Rightmove listing has none)')
                except Exception as e:
                    print(f'  ✗ Error: {e}')
                    failures += 1
                if i < len(candidates) - 1:
                    await asyncio.sleep(DELAY_SECONDS)
        finally:
            await browser.close()

    print(f'\nDone. {successes} updated, {failures} errored, {len(candidates) - successes - failures} had no floorplans on source.')


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--dry-run', action='store_true', help='List candidates without rescraping')
    parser.add_argument('--limit', type=int, default=0, help='Cap number of listings (0 = all)')
    args = parser.parse_args()
    asyncio.run(main(args.dry_run, args.limit))
