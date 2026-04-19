#!/usr/bin/env python3
"""
Fetch Wikipedia images for landmarks and hidden gems of a given borough.

Usage:
  python scripts/fetch_place_images.py camden
  python scripts/fetch_place_images.py camden --dry-run   # only search, don't download

Reads data/boroughGuides.ts, finds the matching borough, queries Wikipedia's
REST API for each landmark and hidden gem, downloads the page's main image to
public/boroughs/places/<borough>-<slug>.jpg, and prints a summary you can use
to update boroughGuides.ts manually.
"""
import argparse, json, os, re, sys, time, urllib.parse, urllib.request

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
DATA_FILE = os.path.join(ROOT, 'data', 'boroughGuides.ts')
OUT_DIR = os.path.join(ROOT, 'public', 'boroughs', 'places')
UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) NestLondon/1.0 Chrome/120.0.0.0 Safari/537.36'

def slugify(s):
    return re.sub(r'[^a-z0-9]+', '-', s.lower()).strip('-')

def to_thumb_url(original_url, width=1280):
    """Convert Wikimedia original URL to a cached thumbnail URL.
    Cached sizes (250/330/500/960/1280/1920/3840) bypass the rate limit
    that hits original-image requests."""
    if '/thumb/' in original_url:
        return original_url
    parts = original_url.rsplit('/', 1)
    if len(parts) != 2: return original_url
    base, filename = parts
    marker = '/commons/'
    thumb_base = base.replace(marker, marker + 'thumb/') if marker in base else base
    if filename.lower().endswith('.svg'):
        return f"{thumb_base}/{filename}/{width}px-{filename}.png"
    return f"{thumb_base}/{filename}/{width}px-{filename}"


def parse_borough(slug):
    """Naive TS parser — locate the object with matching slug and extract
    landmark/hiddenGem names. Assumes current file formatting."""
    with open(DATA_FILE) as f: src = f.read()
    # Find the object for this slug
    needle = f'slug: "{slug}"'
    idx = src.find(needle)
    if idx < 0:
        sys.exit(f"Borough slug not found: {slug}")
    # Walk forward to the next "slug:" or end of array to scope
    next_idx = src.find('\n  {', idx + 1)
    if next_idx < 0: next_idx = len(src)
    block = src[idx:next_idx]

    def extract(section):
        m = re.search(section + r':\s*\[(.*?)\]', block, re.DOTALL)
        if not m: return []
        names = re.findall(r'\{\s*name:\s*"([^"]+)"', m.group(1))
        return names

    return extract('landmarks'), extract('hiddenGems')

def fetch_json(url):
    req = urllib.request.Request(url, headers={'User-Agent': UA})
    with urllib.request.urlopen(req, timeout=15) as r:
        return json.loads(r.read())

def find_image(query):
    """Try Wikipedia REST summary API — returns (image_url, page_title) or (None, None)."""
    # Step 1: search for the page
    search_url = f'https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch={urllib.parse.quote(query + " London")}&format=json&srlimit=3'
    data = fetch_json(search_url)
    hits = data.get('query', {}).get('search', [])
    if not hits: return None, None
    for hit in hits:
        title = hit['title']
        # Step 2: get page summary (includes thumbnail/originalimage)
        sum_url = f'https://en.wikipedia.org/api/rest_v1/page/summary/{urllib.parse.quote(title)}'
        try:
            s = fetch_json(sum_url)
        except Exception:
            continue
        img = s.get('originalimage') or s.get('thumbnail')
        if img and img.get('source'):
            return img['source'], title
    return None, None

def download(url, dest, max_retries=4):
    import urllib.error
    for attempt in range(max_retries):
        req = urllib.request.Request(url, headers={'User-Agent': UA})
        try:
            with urllib.request.urlopen(req, timeout=30) as r, open(dest, 'wb') as f:
                f.write(r.read())
            return
        except urllib.error.HTTPError as e:
            if e.code == 429 and attempt < max_retries - 1:
                wait = int(e.headers.get('Retry-After', '0')) or (10 * (2 ** attempt))
                print(f"    [429] backing off {wait}s (attempt {attempt+1}/{max_retries})")
                time.sleep(wait)
                continue
            raise

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('borough_slug')
    ap.add_argument('--dry-run', action='store_true')
    ap.add_argument('--apply', action='store_true', help='Write image fields back to data/boroughGuides.ts')
    args = ap.parse_args()

    landmarks, gems = parse_borough(args.borough_slug)
    os.makedirs(OUT_DIR, exist_ok=True)

    print(f"\n=== {args.borough_slug} ===")
    print(f"{len(landmarks)} landmarks, {len(gems)} hidden gems\n")

    results = {'landmarks': [], 'hiddenGems': []}

    for section, names in [('landmarks', landmarks), ('hiddenGems', gems)]:
        for name in names:
            img_url, page = find_image(name)
            if not img_url:
                print(f"  ✗ {name}  (no image found)")
                results[section].append({'name': name, 'image': None, 'page': None})
                continue
            thumb_url = to_thumb_url(img_url, 1280)
            ext = os.path.splitext(urllib.parse.urlparse(img_url).path)[1].lower() or '.jpg'
            if ext == '.svg': ext = '.png'
            if ext not in ('.jpg', '.jpeg', '.png', '.webp'): ext = '.jpg'
            filename = f"{args.borough_slug}-{slugify(name)}{ext}"
            dest = os.path.join(OUT_DIR, filename)
            public_path = f"/boroughs/places/{filename}"
            if args.dry_run:
                print(f"  ✓ {name}  ←  {page}  ({img_url[:60]}...)")
            elif os.path.exists(dest):
                print(f"  = {name}  (already downloaded)")
            else:
                try:
                    download(thumb_url, dest)
                    print(f"  ✓ {name}  ←  {page}")
                    time.sleep(3)
                except Exception as e:
                    print(f"  ✗ {name}  (download failed: {e})")
                    continue
            results[section].append({'name': name, 'image': public_path, 'page': page})

    if args.apply:
        apply_images(args.borough_slug, results)
    else:
        print("\n--- Snippet for boroughGuides.ts ---")
        for section in ('landmarks', 'hiddenGems'):
            print(f"\n// {section}")
            for r in results[section]:
                if r['image']:
                    print(f'  // {r["name"]}: add image: "{r["image"]}"')
                else:
                    print(f'  // {r["name"]}: NO IMAGE FOUND — source manually')
        print("\nRun again with --apply to write these into data/boroughGuides.ts")


def apply_images(slug, results):
    """Add `image: "..."` fields to the landmarks and hiddenGems entries for this borough."""
    with open(DATA_FILE) as f: src = f.read()
    needle = f'slug: "{slug}"'
    start = src.find(needle)
    if start < 0:
        print(f"Borough not found in data file: {slug}"); return
    end = src.find('\n  {', start + 1)
    if end < 0: end = len(src)
    block = src[start:end]

    applied = 0
    for section in ('landmarks', 'hiddenGems'):
        for r in results[section]:
            if not r['image']: continue
            name = r['name']
            # Match only entries without an image field yet
            pattern = re.compile(
                r'(\{\s*name:\s*"' + re.escape(name) + r'",\s*description:\s*"[^"]*")(\s*\})'
            )
            m = pattern.search(block)
            if not m:
                print(f"  ! could not locate entry: {name}"); continue
            replacement = m.group(1) + f', image: "{r["image"]}"' + m.group(2)
            block = block[:m.start()] + replacement + block[m.end():]
            applied += 1

    src = src[:start] + block + src[end:]
    with open(DATA_FILE, 'w') as f: f.write(src)
    print(f"\n✓ Applied {applied} image fields to data/boroughGuides.ts")

if __name__ == '__main__':
    main()
