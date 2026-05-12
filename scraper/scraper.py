import asyncio
import json
import os
import re
import hashlib
import urllib.request
from datetime import datetime

# Borough resolution from lat/lng using ONS GeoJSON
_BOROUGH_POLYGONS = None
def _load_borough_polygons():
    global _BOROUGH_POLYGONS
    if _BOROUGH_POLYGONS is not None:
        return _BOROUGH_POLYGONS
    import json
    from pathlib import Path
    boundaries_path = Path(__file__).parent.parent / 'public' / 'boundaries' / 'boroughs.json'
    if not boundaries_path.exists():
        _BOROUGH_POLYGONS = []
        return _BOROUGH_POLYGONS
    data = json.loads(boundaries_path.read_text())
    _BOROUGH_POLYGONS = data.get('features', [])
    return _BOROUGH_POLYGONS

def _point_in_ring(lng, lat, ring):
    n = len(ring)
    inside = False
    j = n - 1
    for i in range(n):
        xi, yi = ring[i][0], ring[i][1]
        xj, yj = ring[j][0], ring[j][1]
        if ((yi > lat) != (yj > lat)) and (lng < (xj - xi) * (lat - yi) / (yj - yi) + xi):
            inside = not inside
        j = i
    return inside

def resolve_borough(lat, lng):
    if lat is None or lng is None:
        return None
    try:
        lat_f, lng_f = float(lat), float(lng)
    except (TypeError, ValueError):
        return None
    for feature in _load_borough_polygons():
        name = feature['properties'].get('LAD23NM')
        geom = feature.get('geometry') or {}
        gtype = geom.get('type')
        coords = geom.get('coordinates') or []
        if gtype == 'Polygon':
            if _point_in_ring(lng_f, lat_f, coords[0]):
                return name
        elif gtype == 'MultiPolygon':
            for polygon in coords:
                if _point_in_ring(lng_f, lat_f, polygon[0]):
                    return name
    return None

_POSTCODE_POLYGONS = None
def _load_postcode_polygons():
    global _POSTCODE_POLYGONS
    if _POSTCODE_POLYGONS is not None:
        return _POSTCODE_POLYGONS
    import json
    from pathlib import Path
    p = Path(__file__).parent.parent / 'public' / 'boundaries' / 'postcodes.json'
    if not p.exists():
        _POSTCODE_POLYGONS = []
        return _POSTCODE_POLYGONS
    _POSTCODE_POLYGONS = json.loads(p.read_text()).get('features', [])
    return _POSTCODE_POLYGONS

def resolve_postcode_district(lat, lng):
    if lat is None or lng is None:
        return None
    try:
        lat_f, lng_f = float(lat), float(lng)
    except (TypeError, ValueError):
        return None
    for feature in _load_postcode_polygons():
        name = feature['properties'].get('name')
        geom = feature.get('geometry') or {}
        gtype = geom.get('type')
        coords = geom.get('coordinates') or []
        if gtype == 'Polygon':
            if _point_in_ring(lng_f, lat_f, coords[0]):
                return name
        elif gtype == 'MultiPolygon':
            for polygon in coords:
                if _point_in_ring(lng_f, lat_f, polygon[0]):
                    return name
    return None
from playwright.async_api import async_playwright
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_KEY')
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

SEARCH_URL = 'https://www.rightmove.co.uk/property-to-rent/find.html?locationIdentifier=REGION%5E87490&propertyTypes=&includeLetAgreed=false'
BUY_SEARCH_URL = 'https://www.rightmove.co.uk/property-for-sale/find.html?locationIdentifier=REGION%5E87490&propertyTypes=&includeSSTC=false'

IMAGE_DIR = 'images'
os.makedirs(IMAGE_DIR, exist_ok=True)


def normalise_address(address: str) -> str:
    import re
    a = address.lower().strip()
    a = re.sub(r'\bflat\s+[\w/]+,?\s*', '', a)
    a = re.sub(r'\bapartment\s+[\w/]+,?\s*', '', a)
    a = re.sub(r',?\s*london\s*', '', a)
    a = re.sub(r'\s+', ' ', a).strip()
    return a

def make_fingerprint(address: str, bedrooms, price) -> str:
    key = f"{normalise_address(address)}|{bedrooms or 0}|{price or 0}"
    return hashlib.md5(key.encode()).hexdigest()

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


def normalise_studio(listing):
    """If key_features indicate a studio, override property_type=Studio and bedrooms=0.
    Only applies when bedrooms is null/0/1 (avoids flagging multi-bed flats with a 'separate studio')."""
    import re
    pt = (listing.get('property_type') or '').lower()
    if pt == 'studio':
        return  # already correct
    beds = listing.get('bedrooms')
    if beds is not None and beds >= 2:
        return  # multi-bed properties may have a separate studio room; not a studio property
    key_features = listing.get('key_features') or []
    for kf in key_features:
        if not kf:
            continue
        kf_lower = kf.lower()
        if 'separate studio' in kf_lower:
            continue
        if re.search(r'\bstudio\b', kf_lower):
            listing['property_type'] = 'Studio'
            listing['bedrooms'] = 0
            return


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



        # Postcode - extract from page URL or address
        lt = ''
        try:
            page_url = page.url
            pc_match = re.search(r'[A-Z]{1,2}[0-9][0-9A-Z]?\s*[0-9][A-Z]{2}', page_url.upper())
            if not pc_match:
                page_text = await page.evaluate('() => document.title + " " + (document.querySelector("h1") ? document.querySelector("h1").innerText : "")')
                pc_match = re.search(r'[A-Z]{1,2}[0-9][0-9A-Z]?\s*[0-9][A-Z]{2}', page_text.upper())
            if not pc_match:
                # Try full body text - postcodes often appear near the top
                body_start = lt[:2000] if lt else ''
                if not body_start:
                    body_start = await page.evaluate('() => document.body.innerText.slice(0, 2000)')
                pc_match = re.search(r'[A-Z]{1,2}[0-9][0-9A-Z]?\s*[0-9][A-Z]{2}', body_start.upper())
            if pc_match:
                result['postcode'] = pc_match.group(0).strip()
        except Exception as pce:
            print('  Postcode parse error: ' + str(pce))

        # Letting details - parse from full page text
        letting = {}
        lt = ''
        try:
            lt = await page.evaluate('() => document.body.innerText')
            letting_fields = ['Let available date', 'Deposit', 'Min. Tenancy', 'Let type', 'Furnish type', 'Council Tax', 'Tenure', 'Council tax band', 'Service charge', 'Ground rent']
            for line_txt in lt.split('\n'):
                for field in letting_fields:
                    if line_txt.strip().startswith(field + ':'):
                        val = line_txt.strip()[len(field)+1:].strip()
                        if val:
                            letting[field] = val
        except Exception as le:
            print('  Letting parse error: ' + str(le))

        # Also find tenure/council tax from various patterns (runs always)
        import re as _re
        if 'Tenure' not in letting:
            m = _re.search(r'Tenure:\s*([^\n]+)', lt)
            if m:
                letting['Tenure'] = m.group(1).strip()
            else:
                m2 = _re.search(r'TENURE\s*\n+\s*([^\n]+)', lt)
                if m2:
                    letting['Tenure'] = m2.group(1).strip()
        if 'Council Tax Band' not in letting and 'Council Tax' not in letting:
            m = _re.search(r'Council Tax Band:\s*([A-H])', lt)
            if m:
                letting['Council Tax Band'] = 'Band ' + m.group(1)
        if 'EPC' not in letting:
            m = _re.search(r'EPC:\s*([A-G])', lt)
            if m:
                letting['EPC'] = m.group(1)
        result['letting_details'] = letting

        # Listed date from Rightmove
        try:
            import re as _re2
            from datetime import date as _date, timedelta as _td
            for line_txt in lt.split('\n'):
                line_s = line_txt.strip()
                if line_s == 'Added today' or line_s == 'Reduced today':
                    result['listed_at'] = _date.today().isoformat()
                    break
                elif line_s == 'Added yesterday' or line_s == 'Reduced yesterday':
                    result['listed_at'] = (_date.today() - _td(days=1)).isoformat()
                    break
                else:
                    m = _re2.search(r'(?:Added|Reduced) on (\d{2}/\d{2}/\d{4})', line_s)
                    if m:
                        d, mo, y = m.group(1).split('/')
                        result['listed_at'] = y + '-' + mo + '-' + d
                        break
        except:
            pass

        # Full resolution images from detail page
        try:
            # Scroll to trigger lazy loading
            try:
                _height = await page.evaluate('() => document.body.scrollHeight')
                for _i in range(20):
                    await page.evaluate(f'window.scrollTo(0, {_i * _height // 20})')
                    await page.wait_for_timeout(150)
                await page.evaluate('document.querySelectorAll("img[data-src]").forEach(img => { img.src = img.dataset.src })')
                await page.wait_for_timeout(500)
                await page.evaluate('window.scrollTo(0, 0)')
            except:
                pass

            # Open the media viewer to force all gallery photos into the DOM.
            # Rightmove uses a hash-based route; pushing it via History API triggers the gallery.
            try:
                channel = 'RES_BUY' if '/property-for-sale/' in (source_url or '') or 'channel=RES_BUY' in (source_url or '') else 'RES_LET'
                await page.evaluate(f"window.location.hash = '#/media?channel={channel}'")
                await page.wait_for_timeout(1200)
                # Scroll again inside the modal to trigger any remaining lazy loads
                try:
                    await page.evaluate('document.querySelectorAll("img[data-src]").forEach(img => { img.src = img.dataset.src })')
                    await page.wait_for_timeout(400)
                except:
                    pass
            except Exception as me:
                print('  Media viewer open failed: ' + str(me))
            # Extract from page HTML source (catches lazy-loaded images too)
            html_content = await page.content()
            import re as _imgre2
            # Extract property ID from URL to only get images for this listing
            import re as _urlre
            _prop_id_m = _urlre.search(r'/properties/(\d+)', source_url) if source_url else None
            _prop_id = _prop_id_m.group(1) if _prop_id_m else ''
            all_imgs_raw = _imgre2.findall("https://media.rightmove.co.uk/[^ \t\n\r\f\v\"]+property-photo[^ \t\n\r\f\v\"]+", html_content)
            all_imgs = [u for u in all_imgs_raw if 'floorplan' not in u and 'floor_plan' not in u and 'floor-plan' not in u and (_prop_id in u if _prop_id else True)]
            if all_imgs:
                import re as _imre
                def upgrade_url(u):
                    # Remove any size suffix to get original quality
                    u = _imre.sub(r'_max_\d+x\d+\.(jpeg|jpg)', r'.\1', u)
                    # Remove /dir/ prefix variation  
                    u = u.replace('/dir/', '/')
                    return u
                # Filter out tiny thumbnails (135x100) and deduplicate
                seen_ids = set()
                full_res = []
                for u in all_imgs:
                    if not u.startswith('http'):
                        continue
                    if '_max_135x100' in u:
                        continue
                    upgraded = upgrade_url(u)
                    # Use the filename hash as dedup key
                    img_id = upgraded.split('/')[-1].split('.')[0]
                    if img_id not in seen_ids:
                        seen_ids.add(img_id)
                        full_res.append(upgraded)
                result['images'] = full_res
        except Exception as ie:
            print('  Image error: ' + str(ie))

        # Floorplans — extract from raw HTML (more reliable than DOM scraping
        # since lazy-loaded imgs may not be rendered yet) AND fall back to DOM.
        try:
            import re as _fpre
            # Raw-HTML regex covers media.rightmove.co.uk/.../property-floorplan/... URLs
            html_fp_raw = _fpre.findall(r'https://media\.rightmove\.co\.uk/[^\s"\'\\<>]+property-floorplan[^\s"\'\\<>]+', html_content)
            # Also try DOM as a fallback in case the regex misses anything
            dom_fp = await page.evaluate('''() => {
                const imgs = Array.from(document.querySelectorAll('img'))
                return imgs.map(img => img.src).filter(src => src && (src.includes('floorplan') || src.includes('floor_plan') || src.includes('floor-plan')))
            }''')
            floorplan_imgs = list(html_fp_raw) + list(dom_fp)
            if floorplan_imgs:
                # Strip _max_WxH size suffix for full-resolution; dedupe by filename hash
                seen_fp = set()
                full_res_fp = []
                for u in floorplan_imgs:
                    if not u or not u.startswith('http'):
                        continue
                    # Strip any trailing junk (backslashes, control chars) that may have leaked through the regex
                    u = u.rstrip('\\<>\'"')
                    # Strip _max_WxH size suffix to get full-resolution
                    upgraded = re.sub(r'_max_\d+x\d+(?=\.[a-zA-Z]{3,4}$)', '', u)
                    img_hash = upgraded.rsplit('/', 1)[-1].rsplit('.', 1)[0]
                    if img_hash in seen_fp:
                        continue
                    seen_fp.add(img_hash)
                    full_res_fp.append(upgraded)
                result['floorplans'] = full_res_fp
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


async def save_to_supabase(listings, source_name='Rightmove', listing_type='rent'):
    saved = 0
    skipped = 0
    updated = 0
    new_ids = []
    for listing in listings:
        try:
            address = listing.get('address', '')
            price = listing.get('price')
            bedrooms = listing.get('bedrooms')
            fp = make_fingerprint(address, bedrooms, price)

            image_urls = listing.get('image_urls') or []
            if not image_urls and listing.get('image_url'):
                image_urls = [listing.get('image_url')]
            # Strip _max_WxH size suffix to get full-resolution image; dedupe by filename hash
            images = []
            seen_hashes = set()
            for u in image_urls:
                if not u or not u.startswith('http'):
                    continue
                upgraded = re.sub(r'_max_\d+x\d+(?=\.(jpe?g|png|webp)$)', '', u)
                img_hash = upgraded.rsplit('/', 1)[-1].rsplit('.', 1)[0]
                if img_hash in seen_hashes:
                    continue
                seen_hashes.add(img_hash)
                images.append(upgraded)

            postcode = None
            match = re.search(r'[A-Z]{1,2}[0-9][0-9A-Z]?\s*[0-9][A-Z]{2}', address)
            if match:
                postcode = match.group(0)

            source_url = listing.get('source_url')

            # Check for existing listing by fingerprint
            existing = supabase.table('listings').select('id,is_direct,source,source_urls').eq('fingerprint', fp).execute()

            if existing.data:
                ex = existing.data[0]
                # Never overwrite direct listings
                if ex.get('is_direct'):
                    skipped += 1
                    continue
                # Update source_urls to add this portal
                existing_urls = ex.get('source_urls') or {}
                if isinstance(existing_urls, str):
                    import json as _json
                    existing_urls = _json.loads(existing_urls)
                if source_url:
                    existing_urls[source_name] = source_url
                supabase.table('listings').update({
                    'source_urls': existing_urls,
                    'scraped_at': datetime.utcnow().isoformat(),
                }).eq('id', ex['id']).execute()
                updated += 1
                continue

            # Also check by source_id for backwards compat
            source_id = listing.get('source_id') or hashlib.md5(
                (address + str(price or '')).encode()
            ).hexdigest()[:12]
            existing2 = supabase.table('listings').select('id').eq('source_id', source_id).execute()
            if existing2.data:
                skipped += 1
                continue

            source_urls = {source_name: source_url} if source_url else {}
            # Lift EPC rating from letting_details (Rightmove text scrape) into top-level column
            scraped_epc = (listing.get('letting_details') or {}).get('EPC')
            record = {
                'source': source_name,
                'source_url': source_url,
                'source_urls': source_urls,
                'source_id': source_id,
                'fingerprint': fp,
                'address': address,
                'postcode': postcode,
                'price': price,
                'price_period': 'month' if listing_type == 'rent' else None,
                'bedrooms': bedrooms,
                'bathrooms': listing.get('bathrooms'),
                'property_type': listing.get('property_type'),
                'listing_type': listing_type,
                'description': listing.get('description'),
                'features': json.dumps(listing.get('features') or []),
                'furnished': listing.get('furnished'),
                'latitude': listing.get('latitude'),
                'listed_at': listing.get('listed_at'),
                'longitude': listing.get('longitude'),
                'borough': resolve_borough(listing.get('latitude'), listing.get('longitude')),
                'postcode_district': resolve_postcode_district(listing.get('latitude'), listing.get('longitude')),
                'images': json.dumps(images),
                'is_active': True,
                'is_direct': False,
                'epc_rating': scraped_epc if scraped_epc else None,
                'raw_data': json.dumps({'key_features': listing.get('key_features'), 'size_text': listing.get('size_text'), 'letting_details': listing.get('letting_details'), 'additional': listing.get('additional'), 'floorplans': listing.get('floorplans') or []}),
                'scraped_at': datetime.utcnow().isoformat(),
            }
            result = supabase.table('listings').insert(record).execute()
            if result.data:
                new_ids.append(result.data[0]['id'])
            saved += 1
        except Exception as e:
            print('  Save error: ' + str(e))
            continue
    print(f'  Saved: {saved}, Updated: {updated}, Skipped: {skipped}')
    return saved, skipped, new_ids


async def scrape_buy(pages=5):
    """Scrape Rightmove for-sale listings in London."""
    print('Starting Rightmove scraper - London sales')
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            user_agent='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            viewport={'width': 1280, 'height': 800},
        )
        page = await context.new_page()
        print('Loading buy first page...')
        await page.goto(BUY_SEARCH_URL, wait_until='domcontentloaded', timeout=30000)
        await page.wait_for_timeout(3000)
        await accept_cookies(page)
        await page.wait_for_timeout(2000)
        all_listings = []
        for page_num in range(pages):
            offset = page_num * 24
            url = BUY_SEARCH_URL + '&index=' + str(offset) if page_num > 0 else BUY_SEARCH_URL
            print('Buy page ' + str(page_num + 1) + '/' + str(pages))
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
                        if full_data.get('listed_at'):
                            listing['listed_at'] = full_data['listed_at']
                        if full_data.get('floorplans'):
                            listing['floorplans'] = full_data['floorplans']
                        if full_data.get('postcode'):
                            listing['postcode'] = full_data['postcode']
                        if full_data.get('images'):
                            listing['image_urls'] = full_data['images']
                    normalise_studio(listing)
                    if (i+1) % 5 == 0:
                        print('  Descriptions: ' + str(i+1) + '/' + str(len(listings)))
                    await asyncio.sleep(0.5)
            all_listings.extend(listings)
            if page_num < pages - 1:
                await asyncio.sleep(2)
        await browser.close()
    print('Total buy listings: ' + str(len(all_listings)))
    if all_listings:
        print('Saving to Supabase...')
        saved, skipped, new_ids = await save_to_supabase(all_listings, 'Rightmove', listing_type='buy')
        print('Done. Saved: ' + str(saved) + ' | Skipped: ' + str(skipped))
    return all_listings


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
                        if full_data.get('listed_at'):
                            listing['listed_at'] = full_data['listed_at']
                        if full_data.get('floorplans'):
                            listing['floorplans'] = full_data['floorplans']
                        if full_data.get('postcode'):
                            listing['postcode'] = full_data['postcode']
                        if full_data.get('images'):
                            listing['image_urls'] = full_data['images']
                    normalise_studio(listing)
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
        saved, skipped, new_ids = await save_to_supabase(all_listings, 'Rightmove')
        print('Done. Saved: ' + str(saved) + ' | Skipped: ' + str(skipped))
        if new_ids:
            try:
                import urllib.request as _ur
                import json as _json
                site_url = os.getenv('NEXT_PUBLIC_SITE_URL', 'http://localhost:3000')
                alerts_secret = os.getenv('ALERTS_SECRET', 'nestlondon-alerts')
                req = _ur.Request(
                    site_url + '/api/alerts/trigger',
                    data=_json.dumps({'secret': alerts_secret, 'listing_ids': new_ids}).encode(),
                    headers={'Content-Type': 'application/json'},
                    method='POST'
                )
                with _ur.urlopen(req, timeout=15) as r:
                    print('Alerts triggered: ' + r.read().decode())
            except Exception as e:
                print('Alert trigger failed: ' + str(e))
    else:
        print('No listings found')


if __name__ == '__main__':
    asyncio.run(main())
