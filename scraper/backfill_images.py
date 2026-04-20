"""
Backfill existing Rightmove listings with full gallery by opening the #/media viewer.
Run with --limit N for a test batch, --threshold N to skip listings with >= N images already.
"""
import asyncio, json, sys, argparse, re, os
from dotenv import load_dotenv
load_dotenv('.env')
from supabase import create_client
from playwright.async_api import async_playwright

sb = create_client(os.getenv('SUPABASE_URL'), os.getenv('SUPABASE_KEY'))

async def scrape_one(page, url):
    try:
        await page.goto(url, wait_until='domcontentloaded', timeout=30000)
        await page.wait_for_timeout(1500)
        try:
            _height = await page.evaluate('() => document.body.scrollHeight')
            for _i in range(10):
                await page.evaluate(f'window.scrollTo(0, {_i * _height // 10})')
                await page.wait_for_timeout(100)
            await page.evaluate('window.scrollTo(0, 0)')
        except: pass
        channel = 'RES_BUY' if ('RES_BUY' in url or '/property-for-sale/' in url) else 'RES_LET'
        await page.evaluate(f"window.location.hash = '#/media?channel={channel}'")
        await page.wait_for_timeout(1200)
        html = await page.content()
        prop_id_m = re.search(r'/properties/(\d+)', url)
        prop_id = prop_id_m.group(1) if prop_id_m else ''
        raw = re.findall(r'https://media\.rightmove\.co\.uk/[^ \t\n\r\f\v"]+property-photo[^ \t\n\r\f\v"]+', html)
        raw = [u for u in raw if 'floorplan' not in u and (prop_id in u)]
        seen = set(); clean = []
        for u in raw:
            u2 = re.sub(r'_max_\d+x\d+(?=\.(jpe?g|png|webp)$)', '', u)
            h = u2.rsplit('/', 1)[-1].rsplit('.', 1)[0]
            if h in seen: continue
            seen.add(h); clean.append(u2)
        return clean
    except Exception as e:
        print(f"  ✗ scrape error: {e}")
        return None

async def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--limit', type=int, default=None, help='Max listings to process')
    ap.add_argument('--threshold', type=int, default=0, help='Skip listings with >= this many images already')
    ap.add_argument('--apply', action='store_true', help='Actually write to DB')
    args = ap.parse_args()

    # Fetch all Rightmove listings
    all_rows = []
    page_n = 0
    while True:
        r = sb.table('listings').select('id, source_url, images').in_('source', ['Rightmove', 'rightmove']).range(page_n*1000, page_n*1000 + 999).execute()
        if not r.data: break
        all_rows.extend(r.data)
        if len(r.data) < 1000: break
        page_n += 1

    print(f"Total Rightmove listings: {len(all_rows)}")

    # Filter by threshold
    targets = []
    for row in all_rows:
        try:
            imgs = json.loads(row['images']) if isinstance(row['images'], str) else (row['images'] or [])
        except: imgs = []
        if args.threshold and len(imgs) >= args.threshold:
            continue
        if not row.get('source_url'): continue
        targets.append(row)

    if args.limit: targets = targets[:args.limit]
    print(f"Will process: {len(targets)}")
    if not args.apply:
        print("Dry run. Pass --apply to actually update.")
        return

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        ctx = await browser.new_context(user_agent='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')
        page = await ctx.new_page()

        updated = 0
        unchanged = 0
        errors = 0
        for i, row in enumerate(targets):
            try:
                imgs = json.loads(row['images']) if isinstance(row['images'], str) else (row['images'] or [])
            except: imgs = []
            old_count = len(imgs)
            new_imgs = await scrape_one(page, row['source_url'])
            if new_imgs is None:
                errors += 1
                print(f"  [{i+1}/{len(targets)}] ✗ error {row['id'][:8]}")
                continue
            if len(new_imgs) > old_count:
                sb.table('listings').update({'images': json.dumps(new_imgs)}).eq('id', row['id']).execute()
                updated += 1
                print(f"  [{i+1}/{len(targets)}] ✓ {row['id'][:8]} {old_count} -> {len(new_imgs)}")
            else:
                unchanged += 1
                print(f"  [{i+1}/{len(targets)}] = {row['id'][:8]} {old_count} (no improvement)")
            await asyncio.sleep(2)  # be polite

        await browser.close()
        print(f"\nDone. Updated: {updated}, unchanged: {unchanged}, errors: {errors}")

if __name__ == '__main__':
    asyncio.run(main())
