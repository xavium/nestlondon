"""
Update existing active listings - price changes, description updates, tenure, images.
Run once daily.
"""
import asyncio
import json
import os
from playwright.async_api import async_playwright
from supabase import create_client
from scraper import get_full_description
from dotenv import load_dotenv
from datetime import datetime

load_dotenv()
supabase = create_client(os.getenv('SUPABASE_URL'), os.getenv('SUPABASE_KEY'))


async def update_listing(context, listing):
    source_url = listing.get('source_url')
    if not source_url:
        return None

    full_data = await get_full_description(context, source_url)
    if not full_data or not isinstance(full_data, dict):
        return None

    updates = {}
    changed = []

    # Price change detection
    # (price comes from search page not detail page - skip for now)

    # Description
    if full_data.get('description') and full_data['description'] != listing.get('description'):
        updates['description'] = full_data['description']
        changed.append('description')

    # Images - update if we now have more
    if full_data.get('images'):
        existing = json.loads(listing['images']) if isinstance(listing.get('images'), str) else (listing.get('images') or [])
        if len(full_data['images']) > len(existing):
            updates['images'] = json.dumps(full_data['images'])
            changed.append(f'images ({len(existing)}→{len(full_data["images"])})')

    # Letting details / tenure
    if full_data.get('letting_details'):
        rd = json.loads(listing['raw_data']) if isinstance(listing.get('raw_data'), str) else (listing.get('raw_data') or {})
        existing_ld = rd.get('letting_details') or {}
        new_ld = {**existing_ld, **full_data['letting_details']}
        if new_ld != existing_ld:
            rd['letting_details'] = new_ld
            updates['raw_data'] = json.dumps(rd)
            changed.append('letting_details')

    # Size
    if full_data.get('size_text'):
        rd = json.loads(listing['raw_data']) if isinstance(listing.get('raw_data'), str) else (listing.get('raw_data') or {})
        if not rd.get('size_text'):
            rd['size_text'] = full_data['size_text']
            updates['raw_data'] = json.dumps(rd)
            changed.append('size')

    # Postcode
    if full_data.get('postcode') and not listing.get('postcode'):
        updates['postcode'] = full_data['postcode']
        changed.append('postcode')

    # Coordinates
    if full_data.get('latitude') and not listing.get('latitude'):
        updates['latitude'] = full_data['latitude']
        updates['longitude'] = full_data['longitude']
        changed.append('coords')

    if updates:
        updates['scraped_at'] = datetime.utcnow().isoformat()
        supabase.table('listings').update(updates).eq('id', listing['id']).execute()

    return changed


async def main(batch_size=30):
    print('Fetching active listings to update...')
    result = supabase.table('listings') \
        .select('id,source_url,description,images,raw_data,postcode,latitude,longitude,listing_type') \
        .eq('is_active', True) \
        .filter('source_url', 'neq', 'null') \
        .order('scraped_at') \
        .limit(batch_size) \
        .execute()

    listings = result.data or []
    print(f'Updating {len(listings)} listings...')

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            user_agent='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            viewport={'width': 1280, 'height': 800},
        )

        updated = 0
        for i, listing in enumerate(listings):
            changed = await update_listing(context, listing)
            if changed:
                print(f'  [{i+1}/{len(listings)}] Updated {listing["id"][:8]}... → {", ".join(changed)}')
                updated += 1
            else:
                print(f'  [{i+1}/{len(listings)}] No changes {listing["id"][:8]}...')
            await asyncio.sleep(1)

        await browser.close()

    print(f'Updated {updated}/{len(listings)} listings')


if __name__ == '__main__':
    asyncio.run(main())
