"""
Mark stale/removed listings as inactive.
Run once daily.
"""
import asyncio
import os
from playwright.async_api import async_playwright
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()
supabase = create_client(os.getenv('SUPABASE_URL'), os.getenv('SUPABASE_KEY'))

REMOVED_PATTERNS = [
    'this property is no longer available',
    'property no longer available',
    'this listing is no longer',
    'has been removed',
    'no longer on the market',
]


async def check_listing(context, listing):
    source_url = listing.get('source_url')
    if not source_url:
        return 'no_url'
    try:
        page = await context.new_page()
        response = await page.goto(source_url, wait_until='domcontentloaded', timeout=15000)
        
        if response and response.status == 404:
            await page.close()
            return 'removed'
        
        text = (await page.evaluate('() => document.body.innerText')).lower()
        await page.close()
        
        for pattern in REMOVED_PATTERNS:
            if pattern in text:
                return 'removed'
        
        # If page is very short or has no property details, likely redirected to homepage
        if len(text) < 500 or 'bedroom' not in text and 'bath' not in text and 'property' not in text[:1000]:
            return 'removed'
        
        return 'active'
    except Exception as e:
        return f'error: {str(e)[:50]}'


async def main():
    from datetime import datetime, timezone
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
    print(f'Checking for stale listings (not scraped since {today_start})...')
    result = supabase.table('listings') \
        .select('id,source_url,address') \
        .eq('is_active', True) \
        .filter('source_url', 'neq', 'null') \
        .lt('scraped_at', today_start) \
        .order('scraped_at') \
        .execute()

    listings = result.data or []
    print(f'Checking {len(listings)} listings...')

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            user_agent='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            viewport={'width': 1280, 'height': 800},
        )

        removed = 0
        for i, listing in enumerate(listings):
            status = await check_listing(context, listing)
            if status == 'removed':
                supabase.table('listings').update({'is_active': False}).eq('id', listing['id']).execute()
                print(f'  [{i+1}] REMOVED: {listing["address"][:50]}')
                removed += 1
            else:
                print(f'  [{i+1}] {status}: {listing["address"][:40]}')
            await asyncio.sleep(0.5)

        await browser.close()

    print(f'Marked {removed}/{len(listings)} listings as inactive')


if __name__ == '__main__':
    asyncio.run(main())
