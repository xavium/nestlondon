"""
Scrape NEW listings only (added in last 24h).
Run once or twice daily.
"""
import asyncio
import os
from playwright.async_api import async_playwright
from scraper import get_full_description, save_to_supabase, accept_cookies, scrape_page
from dotenv import load_dotenv

load_dotenv()

RENT_NEW_URL = 'https://www.rightmove.co.uk/property-to-rent/find.html?locationIdentifier=REGION%5E87490&propertyTypes=&includeLetAgreed=false&maxDaysSinceAdded=1'
BUY_NEW_URL = 'https://www.rightmove.co.uk/property-for-sale/find.html?locationIdentifier=REGION%5E87490&propertyTypes=&includeSSTC=false&maxDaysSinceAdded=1'


async def scrape_new(listing_type='rent', pages=3):
    url = BUY_NEW_URL if listing_type == 'buy' else RENT_NEW_URL
    print(f'Scraping NEW {listing_type} listings (last 24h)...')

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            user_agent='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            viewport={'width': 1280, 'height': 800},
        )
        page = await context.new_page()
        await page.goto(url, wait_until='domcontentloaded', timeout=30000)
        await page.wait_for_timeout(3000)
        await accept_cookies(page)
        await page.wait_for_timeout(2000)

        all_listings = []
        for page_num in range(pages):
            offset = page_num * 24
            page_url = url + '&index=' + str(offset) if page_num > 0 else url
            print(f'Page {page_num + 1}/{pages}')
            listings = await scrape_page(page, page_url, page_num)
            print(f'  Got {len(listings)} listings - fetching details...')

            for i, listing in enumerate(listings):
                if listing.get('source_url'):
                    full_data = await get_full_description(context, listing['source_url'])
                    if full_data and isinstance(full_data, dict):
                        for key in ['description', 'key_features', 'size_text', 'letting_details',
                                    'additional', 'latitude', 'longitude', 'listed_at', 'floorplans',
                                    'postcode', 'images']:
                            if full_data.get(key):
                                listing[key if key != 'images' else 'image_urls'] = full_data[key]
                    if (i + 1) % 5 == 0:
                        print(f'  Details: {i+1}/{len(listings)}')
                    await asyncio.sleep(0.5)

            all_listings.extend(listings)
            if page_num < pages - 1:
                await asyncio.sleep(2)

        await browser.close()

    print(f'Total new {listing_type} listings: {len(all_listings)}')
    if all_listings:
        saved, skipped, _ = await save_to_supabase(all_listings, 'Rightmove', listing_type=listing_type)
        print(f'Saved: {saved} | Skipped (already exist): {skipped}')

    return all_listings


async def main():
    await scrape_new('rent', pages=3)
    await asyncio.sleep(5)
    await scrape_new('buy', pages=2)


if __name__ == '__main__':
    asyncio.run(main())
