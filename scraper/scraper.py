import asyncio
import json
import os
import re
import hashlib
import urllib.request
from datetime import datetime
from playwright.async_api import async_playwright
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_KEY')
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

SEARCH_URL = 'https://www.rightmove.co.uk/property-to-rent/find.html?locationIdentifier=REGION%5E87490&propertyTypes=&includeLetAgreed=false'

IMAGE_DIR = 'images'
os.makedirs(IMAGE_DIR, exist_ok=True)


def clean_price(price_str):
    if not price_str:
        return None
    match = re.search(r'[\d,]+', price_str)
    if match:
        return int(match.group(0).replace(',', ''))
    return None


def parse_info(info_text):
    if not info_text:
        return None, None, None
    lines = [l.strip() for l in info_text.strip().splitlines() if l.strip()]
    property_type = lines[0] if lines else None
    bedrooms = None
    bathrooms = None
    for line in lines[1:]:
        if line.isdigit() and int(line) <= 20:
            if bedrooms is None:
                bedrooms = int(line)
            elif bathrooms is None:
                bathrooms = int(line)
    return property_type, bedrooms, bathrooms


def download_image(url, source_id):
    if not url or url.startswith('data:'):
        return None
    url_hash = hashlib.md5(url.encode()).hexdigest()
    filename = source_id + '_' + url_hash + '.jpg'
    filepath = os.path.join(IMAGE_DIR, filename)
    if os.path.exists(filepath):
        return filepath
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
            'Referer': 'https://www.rightmove.co.uk/',
        }
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=10) as response:
            with open(filepath, 'wb') as f:
                f.write(response.read())
        return filepath
    except Exception as e:
        print('  Image download failed: ' + str(e))
        return None


async def get_full_description(context, source_url):
    if not source_url:
        return None
    try:
        page = await context.new_page()
        await page.goto(source_url, wait_until='domcontentloaded', timeout=20000)
        await page.wait_for_timeout(2000)
        result = {}

        # Full description
        pl = await page.query_selector('[data-testid="primary-layout"]')
        if pl:
            full_text = await page.evaluate('el => el.innerText', pl)
            if 'Description' in full_text:
                desc = full_text.split('Description', 1)[1].strip()
                for stop in ['Letting details', 'Key features', 'Agent details', 'Map', 'Floorplan', 'Similar properties', 'More properties', 'Council tax']:
                    if stop in desc:
                        desc = desc.split(stop)[0].strip()
                result['description'] = desc if desc and len(desc) > 50 else None

        # Key features
        kf_el = await page.query_selector('[data-testid="keyFeatures"]')
        if kf_el:
            kf_items = await page.evaluate('el => Array.from(el.querySelectorAll("li")).map(li => li.innerText.trim()).filter(t => t.length > 2)', kf_el)
            kf_items = await page.evaluate('el => Array.from(el.querySelectorAll("li")).map(li => li.innerText.trim()).filter(t => t.length > 2)', kf_el)
            features = kf_items if kf_items else []
            result['key_features'] = features

            result['key_features'] = features

        # Size
        size_el = await page.query_selector('[data-testid="info-reel-SIZE-text"]')
        if size_el:
            size_text = await page.evaluate('el => el.innerText', size_el)
            if size_text and size_text not in ['Ask agent', 'None']:
                result['size_text'] = size_text.strip()

        # Letting details - parse from full page text
        letting = {}
        try:
            lt = await page.evaluate('() => document.body.innerText')
            letting_fields = ['Let available date', 'Deposit', 'Min. Tenancy', 'Let type', 'Furnish type', 'Council Tax']
            for line_txt in lt.split('\n'):
                for field in letting_fields:
                    if line_txt.strip().startswith(field + ':'):
                        val = line_txt.strip()[len(field)+1:].strip()
                        if val:
                            letting[field] = val
        except Exception as le:
            print('  Letting parse error: ' + str(le))
        if letting:
            result['letting_details'] = letting

        # Floorplans
        try:
            floorplan_imgs = await page.evaluate('''() => {
                const imgs = Array.from(document.querySelectorAll('img'))
                return imgs.map(img => img.src).filter(src => src.includes('floorplan') || src.includes('floor_plan') || src.includes('floor-plan'))
            }''')
            if floorplan_imgs:
                result['floorplans'] = floorplan_imgs
        except Exception as fe:
            print('  Floorplan error: ' + str(fe))

        # Coordinates
        try:
            coords = await page.evaluate('''() => {
                const scripts = Array.from(document.querySelectorAll('script'))
                for (const s of scripts) {
                    const text = s.textContent || ''
                    const latMatch = text.match(/"latitude"\\s*:\\s*(-?\\d+\\.\\d+)/)
                    const lngMatch = text.match(/"longitude"\\s*:\\s*(-?\\d+\\.\\d+)/)
                    if (latMatch && lngMatch) return { lat: latMatch[1], lng: lngMatch[1] }
                }
                return null
            }''')
            if coords:
                result['latitude'] = float(coords['lat'])
                result['longitude'] = float(coords['lng'])
        except Exception as ce:
            print('  Coords error: ' + str(ce))

        # Additional features (council tax, parking, garden)
        additional = await page.evaluate('''() => {
            const result = {}
            const items = document.querySelectorAll('[class*="utilities"] li, [class*="additionalFeatures"] li')
            items.forEach(item => {
                const label = item.querySelector('dt, [class*="label"]')
                const val = item.querySelector('dd, [class*="value"]')
                if (label && val) result[label.innerText.trim()] = val.innerText.trim()
            })
            return result
        }''')
        if additional:
            result['additional'] = additional

        await page.close()
        return result if result else None
    except Exception as e:
        print('  Full desc error: ' + str(e))
        try:
            await page.close()
        except:
            pass
        return None

async def accept_cookies(page):
    try:
        btn = await page.query_selector('button#onetrust-accept-btn-handler')
        if btn:
            await btn.click()
            await page.wait_for_timeout(1500)
            print('  Accepted cookies')
    except:
        pass


async def scrape_page(page, url, page_num):
    listings = []
    try:
        await page.goto(url, wait_until='domcontentloaded', timeout=30000)
        await page.wait_for_timeout(3000)
        if page_num == 0:
            await accept_cookies(page)
            await page.wait_for_timeout(2000)
        index = 0
        while True:
            card = await page.query_selector('[data-testid="propertyCard-' + str(index) + '"]')
            if not card:
                break
            try:
                listing = {}
                price_el = await card.query_selector('[data-testid="property-price"]')
                price_text = await price_el.inner_text() if price_el else None
                listing['price'] = clean_price(price_text)
                address_el = await card.query_selector('[data-testid="property-address"]')
                listing['address'] = (await address_el.inner_text()).strip() if address_el else None
                info_el = await card.query_selector('[data-testid="property-information"]')
                info_text = await info_el.inner_text() if info_el else None
                property_type, bedrooms, bathrooms = parse_info(info_text)
                listing['property_type'] = property_type
                listing['bedrooms'] = bedrooms
                listing['bathrooms'] = bathrooms
                img_els = await card.query_selector_all('[data-testid^="property-img-"]')
                image_urls = []
                for img_el in img_els:
                    src = await img_el.get_attribute('src')
                    if src and src.startswith('http') and src not in image_urls:
                        image_urls.append(src)
                listing['image_url'] = image_urls[0] if image_urls else None
                listing['image_urls'] = image_urls
                desc_el = await card.query_selector('[data-testid="property-description"]')
                listing['description'] = (await desc_el.inner_text()).strip() if desc_el else None
                listing['fetch_full_desc'] = True

                features = []
                info_text_raw = await info_el.inner_text() if info_el else ''
                info_lower = info_text_raw.lower()
                if 'furnished' in info_lower: features.append('Furnished')
                if 'unfurnished' in info_lower: features.append('Unfurnished')
                if 'part furnished' in info_lower: features.append('Part furnished')
                if 'parking' in info_lower: features.append('Parking')
                if 'garage' in info_lower: features.append('Garage')
                if 'garden' in info_lower: features.append('Garden')
                if 'balcony' in info_lower: features.append('Balcony')
                if 'terrace' in info_lower: features.append('Terrace')
                if 'pet' in info_lower: features.append('Pets allowed')
                if 'bills included' in info_lower: features.append('Bills included')
                listing['features'] = features

                furnished = None
                if 'unfurnished' in info_lower: furnished = 'unfurnished'
                elif 'part furnished' in info_lower: furnished = 'part furnished'
                elif 'furnished' in info_lower: furnished = 'furnished'
                listing['furnished'] = furnished

                link_el = await card.query_selector('a[href*="/properties/"]')
                if link_el:
                    href = await link_el.get_attribute('href')
                    listing['source_url'] = 'https://www.rightmove.co.uk' + href if href.startswith('/') else href
                    match = re.search(r'/properties/(\d+)', href)
                    listing['source_id'] = match.group(1) if match else None
                if listing.get('price') and listing.get('address'):
                    listings.append(listing)
                    print('  [' + str(index) + '] ' + str(listing['address']) + ' - ' + str(listing['price']) + '/mo - ' + str(bedrooms) + ' bed')
            except Exception as e:
                print('  Error on card ' + str(index) + ': ' + str(e))
            index += 1
    except Exception as e:
        print('  Page error: ' + str(e))
    return listings


async def save_to_supabase(listings):
    saved = 0
    skipped = 0
    for listing in listings:
        try:
            if listing.get('source_id'):
                existing = supabase.table('listings').select('id').eq('source_id', listing['source_id']).execute()
                if existing.data:
                    skipped += 1
                    continue
            source_id = listing.get('source_id') or hashlib.md5(
                (listing.get('address', '') + str(listing.get('price', ''))).encode()
            ).hexdigest()[:12]
            image_urls = listing.get('image_urls') or []
            if not image_urls and listing.get('image_url'):
                image_urls = [listing.get('image_url')]
            images = [u for u in image_urls if u and u.startswith('http')]
            postcode = None
            address = listing.get('address', '')
            match = re.search(r'[A-Z]{1,2}[0-9][0-9A-Z]?\s*[0-9][A-Z]{2}', address)
            if match:
                postcode = match.group(0)
            record = {
                'source': 'rightmove',
                'source_url': listing.get('source_url'),
                'source_id': source_id,
                'address': address,
                'postcode': postcode,
                'price': listing.get('price'),
                'price_period': 'month',
                'bedrooms': listing.get('bedrooms'),
                'bathrooms': listing.get('bathrooms'),
                'property_type': listing.get('property_type'),
                'listing_type': 'rent',
                'description': listing.get('description'),
                'features': json.dumps(listing.get('features') or []),
                'furnished': listing.get('furnished'),
                'latitude': listing.get('latitude'),
                'longitude': listing.get('longitude'),
                'images': json.dumps(images),
                'is_active': True,
                'raw_data': json.dumps({'key_features': listing.get('key_features'), 'size_text': listing.get('size_text'), 'letting_details': listing.get('letting_details'), 'additional': listing.get('additional'), 'floorplans': listing.get('floorplans') or []}),
                'scraped_at': datetime.utcnow().isoformat(),
            }
            supabase.table('listings').insert(record).execute()
            saved += 1
        except Exception as e:
            print('  Save error: ' + str(e))
            continue
    return saved, skipped


async def main():
    print('Starting Rightmove scraper - London rentals')
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            user_agent='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            viewport={'width': 1280, 'height': 800},
        )
        page = await context.new_page()
        print('Loading first page...')
        await page.goto(SEARCH_URL, wait_until='domcontentloaded', timeout=30000)
        await page.wait_for_timeout(3000)
        await accept_cookies(page)
        await page.wait_for_timeout(2000)
        all_listings = []
        for page_num in range(1):
            offset = page_num * 24
            url = SEARCH_URL + '&index=' + str(offset) if page_num > 0 else SEARCH_URL
            print('Page ' + str(page_num + 1) + '/5')
            listings = await scrape_page(page, url, page_num)
            print('  Got ' + str(len(listings)) + ' listings - fetching full descriptions...')
            for i, listing in enumerate(listings):
                if listing.get('source_url'):
                    full_data = await get_full_description(context, listing['source_url'])
                    if full_data and isinstance(full_data, dict):
                        if full_data.get('description'):
                            listing['description'] = full_data['description']
                        if full_data.get('key_features'):
                            listing['key_features'] = full_data['key_features']
                        if full_data.get('size_text'):
                            listing['size_text'] = full_data['size_text']
                        if full_data.get('letting_details'):
                            listing['letting_details'] = full_data['letting_details']
                        if full_data.get('additional'):
                            listing['additional'] = full_data['additional']
                        if full_data.get('latitude'):
                            listing['latitude'] = full_data['latitude']
                        if full_data.get('longitude'):
                            listing['longitude'] = full_data['longitude']
                        if full_data.get('floorplans'):
                            listing['floorplans'] = full_data['floorplans']
                    if (i+1) % 5 == 0:
                        print('  Descriptions: ' + str(i+1) + '/' + str(len(listings)))
                    await asyncio.sleep(0.5)
            all_listings.extend(listings)
            if page_num < 4:
                await asyncio.sleep(2)
        await browser.close()
    print('Total listings: ' + str(len(all_listings)))
    if all_listings:
        print('Saving to Supabase...')
        saved, skipped = await save_to_supabase(all_listings)
        print('Done. Saved: ' + str(saved) + ' | Skipped: ' + str(skipped))
    else:
        print('No listings found')


if __name__ == '__main__':
    asyncio.run(main())
