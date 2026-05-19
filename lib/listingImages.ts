// lib/listingImages.ts
//
// Single source of truth for parsing the listing.images field into a clean
// string[]. Handles three quirks:
//
//   1. `images` is sometimes stored as a JSON-encoded string (in a jsonb
//      column at top-level type 'string') and sometimes as a real array.
//      We normalise to array.
//   2. The scraper occasionally appends garbage to a URL when it parses it
//      out of a CSS `background-image: url(\"...\")` attribute and forgets
//      to unescape `&quot;` or strip the trailing `)`. We trim that here.
//   3. Some entries are non-https junk (data: URLs, broken refs) which we
//      filter out.
//
// SCRAPER TODO: the upstream fix should unescape HTML entities and trim
// quote/paren wrappers at scrape time so `images[0]` is clean on insert.
// This UI-side cleanup is defensive — once scraping is fixed it becomes
// a no-op for new rows, and a one-off migration can clean existing rows.

export function parseListingImages(raw: unknown): string[] {
  let arr: unknown[]
  try {
    if (typeof raw === 'string') {
      arr = JSON.parse(raw)
    } else if (Array.isArray(raw)) {
      arr = raw
    } else {
      return []
    }
  } catch {
    return []
  }
  if (!Array.isArray(arr)) return []
  return arr
    .filter((u): u is string => typeof u === 'string' && u.startsWith('https'))
    .map(cleanImageUrl)
}

// Trim known junk that occasionally leaks through:
//   - `&quot;...` and anything after (HTML-encoded quote)
//   - trailing `"`, `'`, `)`, whitespace
function cleanImageUrl(u: string): string {
  return u.replace(/&quot;.*$/i, '').replace(/["')\s]+$/, '')
}
