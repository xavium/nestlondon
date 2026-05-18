/**
 * Listing duplicate detection. Pure functions, no I/O.
 *
 * Cross-source dedupe matters when: (a) the same property is scraped from multiple
 * portals (Rightmove + Zoopla + OnTheMarket would all list it), or (b) a direct
 * listing collides with a scraped one for the same property.
 *
 * Distinguish carefully: 4 different flats in the Mandarin Oriental are NOT
 * duplicates — they have different prices, bedrooms, and sizes. Only treat as
 * duplicate if all dimensions agree.
 *
 * Two-phase approach:
 * 1. Blocking: hash listings into groups by `fingerprint()`. Only compare pairs
 *    within a group. Cheap O(n) preprocess; reduces O(n²) comparisons to O(n).
 * 2. Pairwise scoring: `pairScore(a, b)` returns 0-1 similarity.
 *
 * Thresholds set at the call site (see scripts/find_potential_duplicates.mjs):
 *   >= 0.80: confident duplicate, suggest merge
 *   0.60-0.80: possible duplicate, queue for review
 *   < 0.60: distinct
 */

export interface ListingForDedupe {
  id: string
  address: string | null
  postcode: string | null
  latitude: number | null
  longitude: number | null
  bedrooms: number | null
  bathrooms: number | null
  property_type: string | null
  price: number | null
  listing_type: string | null
  raw_data: any   // for size_text extraction
}

// ---- Helpers ----

function lower(s: string | null | undefined): string {
  return (s || '').toLowerCase()
}

/** Postcode district = "SW1X" from "SW1X 7LY". Returns empty string if no postcode. */
function postcodeDistrict(postcode: string | null): string {
  if (!postcode) return ''
  // UK postcode pattern: outward code is the bit before the space.
  // "SW1X 7LY" -> "SW1X"; "E1 6AN" -> "E1"
  const m = postcode.trim().match(/^([A-Z]{1,2}\d{1,2}[A-Z]?)\s*\d/i)
  return m ? m[1].toUpperCase() : ''
}

/** Normalise property type to a coarse category for blocking.
 *  Rightmove uses many variants ("Detached", "Link Detached House", "End Terrace") that
 *  effectively mean the same thing for dedupe purposes. Collapse them so we don't fail
 *  to block on cosmetic differences. */
function normalisePropertyType(ptype: string | null | undefined): string {
  const s = lower(ptype)
  if (!s) return '?'
  if (s.includes('flat') || s.includes('apartment') || s.includes('maisonette') || s.includes('studio')) return 'flat'
  if (s.includes('house') || s.includes('detached') || s.includes('terrace') || s.includes('semi') || s.includes('bungalow') || s.includes('cottage')) return 'house'
  if (s.includes('land') || s.includes('plot')) return 'land'
  if (s.includes('commercial')) return 'commercial'
  return s.split(/\s+/)[0]
}

/** Bucket size into rough categories so we don't fail to block on tiny variance. */
function sizeBucket(sqft: number | null): string {
  if (sqft == null) return 'unknown'
  if (sqft < 400) return 'studio'
  if (sqft < 700) return 'small'
  if (sqft < 1100) return 'medium'
  if (sqft < 1800) return 'large'
  return 'xl'
}

/** Pull sqft from raw_data.size_text (e.g. "1,876 sq ft\n\n174 sq m"). Returns null if absent. */
function extractSqft(rawData: any): number | null {
  if (!rawData) return null
  const rd = typeof rawData === 'string' ? (() => { try { return JSON.parse(rawData) } catch { return {} } })() : rawData
  const text: string = rd?.size_text || ''
  if (!text) return null
  const m = text.match(/([\d,]+)\s*sq\s*ft/i)
  if (!m) return null
  const n = parseInt(m[1].replace(/,/g, ''), 10)
  return Number.isFinite(n) ? n : null
}

// ---- Address normalisation ----

/** Aggressive normalisation: lowercase, strip postcode, common abbreviations, punctuation. */
export function normaliseAddress(addr: string | null): string {
  let s = lower(addr).trim()
  // Strip postcodes (one or two parts)
  s = s.replace(/\b[a-z]{1,2}\d{1,2}[a-z]?\s*\d[a-z]{2}\b/gi, '')
  s = s.replace(/\b[a-z]{1,2}\d{1,2}[a-z]?\b/gi, '')  // partial postcode like "SW1X"
  // Strip punctuation, collapse whitespace
  s = s.replace(/[,\.\-\/]/g, ' ').replace(/\s+/g, ' ').trim()
  // Common abbreviation normalisations
  s = s.replace(/\bapartment\b/g, 'flat')
       .replace(/\bapt\b/g, 'flat')
       .replace(/\bst\b/g, 'street')
       .replace(/\brd\b/g, 'road')
       .replace(/\bave\b/g, 'avenue')
       .replace(/\bln\b/g, 'lane')
       .replace(/\bpl\b/g, 'place')
       .replace(/\bsq\b/g, 'square')
       .replace(/\bgdns\b/g, 'gardens')
       .replace(/\bln\b/g, 'lane')
  return s
}

/** Trigram set for fuzzy comparison. "knightsbridge" -> ["kni", "nig", "igh", ...] */
function trigrams(s: string): Set<string> {
  const padded = '  ' + s + '  '
  const set = new Set<string>()
  for (let i = 0; i < padded.length - 2; i++) {
    set.add(padded.slice(i, i + 3))
  }
  return set
}

/** Jaccard similarity between two trigram sets. */
function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 0
  let inter = 0
  for (const t of a) if (b.has(t)) inter++
  const uni = a.size + b.size - inter
  return uni === 0 ? 0 : inter / uni
}

/**
 * 0-1 address similarity. Smarter than plain Jaccard:
 *
 * The challenge: "Willow Road, London" and "Willow Road, Hampstead, London, NW3"
 * are the same property but one has more context tokens. Plain Jaccard penalises
 * this (only 3/6 tokens shared = 0.5). The right model is "are all of the smaller
 * side's tokens present in the bigger side?" — i.e. subset compatibility.
 *
 * Strategy:
 *   1. Tokenise both addresses (after normalisation: lowercased, no postcodes,
 *      no punctuation, abbreviations expanded).
 *   2. If either side has < 2 tokens, fall back to trigram Jaccard (too few
 *      tokens for the subset rule to work without false positives).
 *   3. Otherwise: |intersection| / min(|A|, |B|).
 *      - "Willow Road, London" vs "Willow Road, Hampstead, London, NW3"
 *          → tokens {willow, road, london} ∩ {willow, road, hampstead, london} = 3
 *          → min = 3 → score = 1.00 ✓
 *      - "31 Test Lane" vs "32 Test Lane"
 *          → {31, test, lane} ∩ {32, test, lane} = 2
 *          → min = 3 → score = 0.67 ✗ correctly demoted below 0.70 gate
 *      - "Queen's Gate, London, SW7" vs "Queen's Gate, South Kensington, London, SW7"
 *          → {queens, gate, london} ∩ {queens, gate, south, kensington, london} = 3
 *          → min = 3 → score = 1.00 ✓
 */
export function addressSimilarity(a: string | null, b: string | null): number {
  const na = normaliseAddress(a)
  const nb = normaliseAddress(b)
  if (!na || !nb) return 0
  if (na === nb) return 1.0

  const tokensA = na.split(/\s+/).filter(Boolean)
  const tokensB = nb.split(/\s+/).filter(Boolean)

  // Too few tokens for subset rule to be reliable — fall back to trigrams.
  if (tokensA.length < 2 || tokensB.length < 2) {
    return jaccard(trigrams(na), trigrams(nb))
  }

  const setA = new Set(tokensA)
  const setB = new Set(tokensB)
  let intersection = 0
  for (const t of setA) if (setB.has(t)) intersection++

  return intersection / Math.min(setA.size, setB.size)
}

// ---- Numeric similarity ----

/** Ratio-based: 1 - |a-b|/max(a,b). 0 if either is null. */
function ratioSimilarity(a: number | null, b: number | null, capPct = 0.5): number {
  if (a == null || b == null || a <= 0 || b <= 0) return 0
  const diff = Math.abs(a - b) / Math.max(a, b)
  if (diff >= capPct) return 0
  return 1 - (diff / capPct)
}

function bedroomSimilarity(a: number | null, b: number | null): number {
  if (a == null || b == null) return 0
  if (a === b) return 1
  if (Math.abs(a - b) === 1) return 0.5
  return 0
}

/** Haversine in metres. */
function haversineM(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

/** 1.0 at 0m, 0.5 at 50m, 0.0 at 200m+. Skipped (returns null) if either has no coords. */
function geoSimilarity(a: ListingForDedupe, b: ListingForDedupe): number | null {
  if (a.latitude == null || a.longitude == null || b.latitude == null || b.longitude == null) return null
  const d = haversineM(a.latitude, a.longitude, b.latitude, b.longitude)
  if (d >= 200) return 0
  return 1 - (d / 200)
}

// ---- Fingerprint (blocking key) ----

/**
 * Returns a fingerprint string that groups listings likely to be the same property.
 * Listings with the same fingerprint will be pairwise compared. Listings with
 * different fingerprints will never be compared (avoids n² blowup).
 *
 * Components: postcode district (or lat coarse) + bedrooms + property type + size bucket.
 * Tuned so the 4 Mandarin Oriental units (different bedrooms, different sizes) end up
 * in DIFFERENT fingerprints and are correctly NOT compared.
 */
export function fingerprint(listing: ListingForDedupe): string {
  // Geographic anchor: prefer postcode district; fall back to lat/lng to 3dp (~110m grid).
  const pcd = postcodeDistrict(listing.postcode)
  const geoKey = pcd || (
    listing.latitude != null && listing.longitude != null
      ? `geo:${listing.latitude.toFixed(3)}:${listing.longitude.toFixed(3)}`
      : 'unknown'
  )
  const beds = listing.bedrooms != null ? String(listing.bedrooms) : '?'
  const ptype = normalisePropertyType(listing.property_type)
  const sqft = extractSqft(listing.raw_data)
  const sb = sizeBucket(sqft)
  const lt = listing.listing_type || '?'
  return `${lt}|${geoKey}|${beds}|${ptype}|${sb}`
}

// ---- Pair scoring ----

const WEIGHTS = {
  address: 0.35,
  price: 0.25,
  bedrooms: 0.15,
  size: 0.15,
  geo: 0.10,
}

export interface PairScoreResult {
  score: number          // 0-1 overall
  breakdown: {
    address: number
    price: number
    bedrooms: number
    size: number
    geo: number | null   // null if either has no coords (not penalised)
  }
}

// Hard gates: requirements that must be true for a pair to be considered AT ALL.
// If any gate fails, the overall score is forced to 0. Bedrooms must match exactly
// (different bed count = different property). Address similarity must be high
// (different street = different property; "31 Test Lane" vs "32 Test Lane" is NOT
// the same property even though jaccard might score them ~0.85).
const ADDRESS_GATE_THRESHOLD = 0.70   // below this = different property
const BEDROOMS_HARD_GATE = true        // exact match required when both have data

export function pairScore(a: ListingForDedupe, b: ListingForDedupe): PairScoreResult {
  const addrSim = addressSimilarity(a.address, b.address)
  const priceSim = ratioSimilarity(a.price, b.price, 0.20)
  const bedSim = bedroomSimilarity(a.bedrooms, b.bedrooms)
  const sqftA = extractSqft(a.raw_data)
  const sqftB = extractSqft(b.raw_data)
  const sizeSim = ratioSimilarity(sqftA, sqftB, 0.20)
  const geoSim = geoSimilarity(a, b)

  // Gate 1: bedrooms. If both have a value and they differ → 0. Off-by-one is NOT
  // a fuzzy match here; different bed count means different unit.
  const bothHaveBeds = a.bedrooms != null && b.bedrooms != null
  if (BEDROOMS_HARD_GATE && bothHaveBeds && a.bedrooms !== b.bedrooms) {
    return { score: 0, breakdown: { address: addrSim, price: priceSim, bedrooms: 0, size: sizeSim, geo: geoSim } }
  }

  // Gate 2: address. Different street number = different property. The trigram
  // similarity catches major differences ("Drayton" vs "Notting" → ~0.1) but can
  // be high for same-street-different-house-number ("31 Test Lane" vs "32 Test Lane")
  // — that's fine because the strict threshold is high enough to reject them as a
  // confident duplicate. Set to 0.70 (tunable).
  if (addrSim < ADDRESS_GATE_THRESHOLD) {
    return { score: 0, breakdown: { address: addrSim, price: priceSim, bedrooms: bedSim, size: sizeSim, geo: geoSim } }
  }

  // Past the gates: score normally. Gates are non-negotiable; the score reflects
  // the soft dimensions only (size, price, geo are the "are these the same unit
  // in the same building" signal).
  let total = 0
  let weightSum = 0
  total += WEIGHTS.address * addrSim;   weightSum += WEIGHTS.address
  total += WEIGHTS.price * priceSim;    weightSum += WEIGHTS.price
  total += WEIGHTS.bedrooms * bedSim;   weightSum += WEIGHTS.bedrooms
  total += WEIGHTS.size * sizeSim;      weightSum += WEIGHTS.size
  if (geoSim !== null) {
    total += WEIGHTS.geo * geoSim
    weightSum += WEIGHTS.geo
  }

  return {
    score: weightSum > 0 ? total / weightSum : 0,
    breakdown: { address: addrSim, price: priceSim, bedrooms: bedSim, size: sizeSim, geo: geoSim },
  }
}

// ---- Self-test ----

/**
 * Sanity tests. Run with: node -e "(async () => { const m = await import('./lib/listingFingerprint.ts'); m.runSelfTests() })()"
 * (Won't work in Next because of .ts imports — see scripts/test_fingerprint.mjs for runnable version.)
 */
export function runSelfTests(): { passed: number; failed: number } {
  const cases: Array<{ label: string; a: ListingForDedupe; b: ListingForDedupe; expectScore: 'high' | 'mid' | 'low' }> = [
    {
      label: 'Mandarin Oriental: 1bed vs 3bed in same building (NOT duplicates)',
      a: { id: 'a', address: 'The Residences at Mandarin Oriental, Mayfair W1', postcode: 'W1', latitude: 51.51, longitude: -0.15, bedrooms: 1, bathrooms: 2, property_type: 'flat', price: 3600000, listing_type: 'buy', raw_data: { size_text: '616 sq ft' } },
      b: { id: 'b', address: 'The Residences at Mandarin Oriental, Mayfair W1', postcode: 'W1', latitude: 51.51, longitude: -0.15, bedrooms: 3, bathrooms: 4, property_type: 'flat', price: 11950000, listing_type: 'buy', raw_data: { size_text: '1,876 sq ft' } },
      expectScore: 'low',
    },
    {
      label: 'Identical listing from two sources (TRUE duplicate)',
      a: { id: 'a', address: '12 Cromwell Road, Kensington, SW7 4XP', postcode: 'SW7 4XP', latitude: 51.498, longitude: -0.180, bedrooms: 2, bathrooms: 2, property_type: 'flat', price: 1200000, listing_type: 'buy', raw_data: { size_text: '850 sq ft' } },
      b: { id: 'b', address: 'Flat 12, Cromwell Rd, London SW7', postcode: 'SW7', latitude: 51.498, longitude: -0.180, bedrooms: 2, bathrooms: 2, property_type: 'flat', price: 1200000, listing_type: 'buy', raw_data: { size_text: '850 sq ft' } },
      expectScore: 'high',
    },
    {
      label: 'Same building, same beds, similar price — POSSIBLE duplicate',
      a: { id: 'a', address: 'One Hyde Park, Knightsbridge SW1X', postcode: 'SW1X', latitude: 51.502, longitude: -0.160, bedrooms: 2, bathrooms: 2, property_type: 'flat', price: 8500000, listing_type: 'buy', raw_data: { size_text: '1,200 sq ft' } },
      b: { id: 'b', address: 'One Hyde Park, Knightsbridge SW1X', postcode: 'SW1X', latitude: 51.502, longitude: -0.160, bedrooms: 2, bathrooms: 2, property_type: 'flat', price: 8600000, listing_type: 'buy', raw_data: { size_text: '1,210 sq ft' } },
      expectScore: 'high',
    },
    {
      label: 'Completely different properties — clearly distinct',
      a: { id: 'a', address: 'Notting Hill', postcode: 'W11', latitude: 51.513, longitude: -0.207, bedrooms: 2, bathrooms: 1, property_type: 'flat', price: 800000, listing_type: 'buy', raw_data: {} },
      b: { id: 'b', address: 'Greenwich', postcode: 'SE10', latitude: 51.480, longitude: 0.005, bedrooms: 4, bathrooms: 3, property_type: 'house', price: 1500000, listing_type: 'buy', raw_data: {} },
      expectScore: 'low',
    },
  ]

  let passed = 0, failed = 0
  for (const c of cases) {
    const result = pairScore(c.a, c.b)
    const cat = result.score >= 0.8 ? 'high' : result.score >= 0.6 ? 'mid' : 'low'
    const ok = cat === c.expectScore
    if (ok) { console.log(`  ok    ${c.label}  (score=${result.score.toFixed(3)})`); passed++ }
    else    { console.log(`  FAIL  ${c.label}  (score=${result.score.toFixed(3)} cat=${cat} expected=${c.expectScore})`); console.log('         breakdown:', JSON.stringify(result.breakdown)); failed++ }
  }
  console.log(`\n${passed} passed, ${failed} failed`)
  return { passed, failed }
}
