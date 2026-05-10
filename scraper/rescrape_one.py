"""
Rescrape a single Rightmove listing's floorplans + images.
Uses the new raw-HTML regex extraction (matches scraper.py's logic).

Usage:
  source venv/bin/activate
  python3 rescrape_one.py <listing_id>
"""
import asyncio, os, sys, json, re
from playwright.async_api import async_playwright
from supabase import create_client
from dotenv import load_dotenv

load_dotenv('../.env.local')
sb = create_client(os.environ['NEXT_PUBLIC_SUPABASE_URL'], os.environ['SUPABASE_SERVICE_ROLE_KEY'])

async def main(listing_id: str):
    row = sb.table('listings').select('id, source_url, raw_data').eq('id', listing_id).single().execute()
    url = row.data['source_url']
    raw = row.data.get('raw_data') or {}
    if isinstance(raw, str):
        raw = json.loads(raw)
    print(f'Rescraping {url}')

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        await page.goto(url, wait_until='domcontentloaded', timeout=30000)
        await page.wait_for_timeout(3000)

        html_content = await page.content()

        # Raw-HTML regex (excludes backslashes / brackets that can appear in escaped JSON contexts)
        html_fp_raw = re.findall(r'https://media\.rightmove\.co\.uk/[^\s"\'\\<>]+property-floorplan[^\s"\'\\<>]+', html_content)
        # DOM fallback
        dom_fp = await page.evaluate('''() => {
            const imgs = Array.from(document.querySelectorAll('img'))
            return imgs.map(img => img.src).filter(src => src && (src.includes('floorplan') || src.includes('floor_plan') || src.includes('floor-plan')))
        }''')

        print(f'  Raw HTML found: {len(html_fp_raw)}')
        print(f'  DOM found: {len(dom_fp)}')

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
        print(f'  After dedupe: {len(full_res_fp)}')
        for fp in full_res_fp: print(f'    {fp}')

        await browser.close()

    raw['floorplans'] = full_res_fp
    sb.table('listings').update({'raw_data': raw}).eq('id', listing_id).execute()
    print(f'Updated listing {listing_id}')

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print('Usage: python3 rescrape_one.py <listing_id>')
        sys.exit(1)
    asyncio.run(main(sys.argv[1]))
