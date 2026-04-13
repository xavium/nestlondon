import asyncio
import json
import os
import re
import hashlib
from datetime import datetime
from playwright.async_api import async_playwright
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_KEY')
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

SEARCH_URL = 'https://www.onthemarket.com/to-rent/property/london/?view=grid'

def normalise_address(address):
    a = address.lower().strip()
    a = re.sub(r'\bflat\s+[\w/]+,?\s*', '', a)
    a = re.sub(r'\bapartment\s+[\w/]+,?\s*', '', a)
    a = re.sub(r',?\s*london\s*', '', a)
    a = re.sub(r'\s+', ' ', a).strip()
    return a

def make_fingerprint(address, bedrooms, price):
    key = f"{normalise_address(address)}|{bedrooms or 0}|{price or 0}"
    return hashlib.md5(key.encode()).hexdigest()

def clean_price(price_str):
    if not price_str:
        return None
    match = re.search(r'[\d,]+', str(price_str))
    if match:
        return int(match.group(0).replace(',', ''))
    return None

async def accept_cookies(page):
    for selector in ['button:has-text("Accept all")', 'button:has-text("Accept cookies")', '#onetrust-accept-btn-handler']:
        try:
            btn = page.locator(selector).first
            if await btn.is_visible(timeout=2000):
                await btn.click()
                await page.wait_for_timeout(1000)
                return
        except:
            pass

async def scrape_otm_page(page, url):
    listings = []
    try:
        await page.goto(url, wait_until='domcontentloaded', timeout=30000)
        await page.wait_for_timeout(3000)
        await accept_cookies(page)
        await page.wait_for_timeout(2000)

        cards = await page.query_selector_all('li.otm-PropertyCard')
        if not cards:
            cards = await page.query_selector_all('[class*="PropertyCard"]')
        print(f'  Found {len(cards)} cards')

        for card in cards:
            try:
                listing = {}

                # Address
                for sel in ['[class*="address"]', 'address', 'h2']:
                    el = await card.query_selector(sel)
                    if el:
                        text = (await el.inner_text()).strip()
                        if text and len(text) > 5:
                            listing['address'] = text
                            break

                # Price
                for sel in ['[class*="price"]', '[data-testid*="price"]']:
                    el = await card.query_selector(sel)
                    if el:
                        listing['price'] = clean_price(await el.inner_text())
                        if listing['price']:
                            break

                # Beds/type
                info_el = await card.query_selector('[class*="bedroom"]')
                if info_el:
                    txt = await info_el.inner_text()
                    bed_m = re.search(r'(\d+)', txt)
                    if bed_m:
                        listing['bedrooms'] = int(bed_m.group(1))

                type_el = await card.query_selector('[class*="property-type"]')
                if type_el:
                    listing['property_type'] = (await type_el.inner_text()).strip()

                # Source URL
                link_el = await card.query_selector('a[href*="/property/"]')
                if link_el:
                    href = await link_el.get_attribute('href')
                    if href:
                        listing['source_url'] = 'https://www.onthemarket.com' + href if href.startswith('/') else href
                        id_m = re.search(r'/property/(\d+)', href)
                        if id_m:
                            listing['source_id'] = 'otm_' + id_m.group(1)

                # Image
                img_el = await card.query_selector('img')
                if img_el:
                    src = await img_el.get_attribute('src') or await img_el.get_attribute('data-src')
                    if src and src.startswith('http'):
                        listing['image_urls'] = [src]

                if listing.get('address') and listing.get('price'):
                    listings.append(listing)
            except Exception as e:
                print('  Card error: ' + str(e))
    except Exception as e:
        print('  Page error: ' + str(e))
    return listings

async def save_listings(listings):
    saved = updated = skipped = 0
    new_ids = []
    for listing in listings:
        try:
            address = listing.get('address', '')
            price = listing.get('price')
            bedrooms = listing.get('bedrooms')
            fp = make_fingerprint(address, bedrooms, price)
            source_url = listing.get('source_url')

            existing = supabase.table('listings').select('id,is_direct,source_urls').eq('fingerprint', fp).execute()
            if existing.data:
                ex = existing.data[0]
                if ex.get('is_direct'):
                    skipped += 1
                    continue
                existing_urls = ex.get('source_urls') or {}
                if isinstance(existing_urls, str):
                    existing_urls = json.loads(existing_urls)
                if source_url:
                    existing_urls['OnTheMarket'] = source_url
                supabase.table('listings').update({
                    'source_urls': existing_urls,
                    'scraped_at': datetime.utcnow().isoformat(),
                }).eq('id', ex['id']).execute()
                updated += 1
                continue

            source_id = listing.get('source_id') or hashlib.md5((address + str(price or '')).encode()).hexdigest()[:12]
            existing2 = supabase.table('listings').select('id').eq('source_id', source_id).execute()
            if existing2.data:
                skipped += 1
                continue

            postcode = None
            m = re.search(r'[A-Z]{1,2}[0-9][0-9A-Z]?\s*[0-9][A-Z]{2}', address)
            if m:
                postcode = m.group(0)

            images = listing.get('image_urls') or []
            record = {
                'source': 'OnTheMarket',
                'source_url': source_url,
                'source_urls': {'OnTheMarket': source_url} if source_url else {},
                'source_id': source_id,
                'fingerprint': fp,
                'address': address,
                'postcode': postcode,
                'price': price,
                'price_period': 'month',
                'bedrooms': bedrooms,
                'bathrooms': listing.get('bathrooms'),
                'property_type': listing.get('property_type'),
                'listing_type': 'rent',
                'images': json.dumps([u for u in images if u.startswith('http')]),
                'is_active': True,
                'is_direct': False,
                'raw_data': json.dumps({}),
                'scraped_at': datetime.utcnow().isoformat(),
            }
            result = supabase.table('listings').insert(record).execute()
            if result.data:
                new_ids.append(result.data[0]['id'])
            saved += 1
        except Exception as e:
            print('  Save error: ' + str(e))
    print(f'  Saved: {saved}, Updated: {updated}, Skipped: {skipped}')
    return saved, skipped, new_ids

async def main():
    print('Starting OnTheMarket scraper - London rentals')
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            user_agent='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            viewport={'width': 1280, 'height': 800},
        )
        page = await context.new_page()
        print('Scraping OnTheMarket...')
        listings = await scrape_otm_page(page, SEARCH_URL)
        print(f'Got {len(listings)} listings')
        await browser.close()
    if listings:
        saved, skipped, new_ids = await save_listings(listings)
        if new_ids:
            try:
                import urllib.request as _ur
                site_url = os.getenv('NEXT_PUBLIC_SITE_URL', 'http://localhost:3000')
                secret = os.getenv('ALERTS_SECRET', 'nestlondon-alerts')
                req = _ur.Request(
                    site_url + '/api/alerts/trigger',
                    data=json.dumps({'secret': secret, 'listing_ids': new_ids}).encode(),
                    headers={'Content-Type': 'application/json'}, method='POST'
                )
                with _ur.urlopen(req, timeout=15) as r:
                    print('Alerts: ' + r.read().decode())
            except Exception as e:
                print('Alert error: ' + str(e))

if __name__ == '__main__':
    asyncio.run(main())
