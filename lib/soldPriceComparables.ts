/**
 * Sold-price comparables. Uses HM Land Registry data to estimate market value
 * for a listing based on recent sales in the same postcode district + property type.
 *
 * Returns a comparison object with:
 *   - sample size + confidence tier
 *   - median, p25, p75 of sold prices
 *   - this listing's percentile within the comparable distribution
 *   - "above/below market" signal
 *
 * Land Registry data has NO bedrooms or square footage, so we match on:
 *   - postcode district (e.g. SW7)
 *   - property type (D/S/T/F/O — mapped from listing's free-text property_type)
 *   - last 12 months
 *   - standard transactions only (ppd_category = 'A')
 *
 * Time decay: a sale from last month gets weight ~1.0; from 12 months ago, ~0.5.
 * Outliers: top 5% and bottom 5% excluded before computing stats.
 */
import type { SupabaseClient } from '@supabase/supabase-js'

// LR property type codes
type LRPropertyType = 'D' | 'S' | 'T' | 'F' | 'O'

export interface SoldPriceComparison {
  sampleSize: number
  confidence: 'high' | 'medium' | 'low'  // n>=30 / n>=10 / n>=3
  median: number
  p25: number
  p75: number
  min: number
  max: number
  // Where the listing sits in the distribution (0-100)
  listingPercentile: number | null
  // 'below' | 'within' | 'above' market range (p25–p75 = within)
  signal: 'below' | 'within' | 'above' | null
  // Display strings
  postcodeDistrict: string
  propertyTypeLabel: string
}

/** Map listing's free-text property_type to LR's single-letter codes. */
export function mapPropertyType(ptype: string | null | undefined): LRPropertyType | null {
  const s = (ptype || '').toLowerCase()
  if (!s) return null
  if (s.includes('flat') || s.includes('apartment') || s.includes('maisonette') || s.includes('studio')) return 'F'
  if (s.includes('detached') && !s.includes('semi')) return 'D'
  if (s.includes('semi')) return 'S'
  if (s.includes('terrace') || s.includes('end of terrace') || s.includes('mews')) return 'T'
  if (s.includes('house') || s.includes('bungalow') || s.includes('cottage')) {
    // Generic "House" without detached/semi/terrace specifier — default to terraced
    // (most common in London) rather than "Other" which would miss matches.
    return 'T'
  }
  return 'O'
}

const TYPE_LABELS: Record<LRPropertyType, string> = {
  F: 'flats',
  D: 'detached houses',
  S: 'semi-detached houses',
  T: 'terraced houses',
  O: 'other property types',
}

/**
 * Extract the postcode district (outward code) from either a full postcode
 * ("SW7 4XP") or an address that contains one ("32 Some Road, London, NW3 5XQ"
 * or "32 Some Road, London, NW3").
 */
function postcodeDistrict(input: string | null | undefined): string | null {
  if (!input) return null
  const s = input.trim().toUpperCase()
  // Match a UK postcode district: 1-2 letters + 1-2 digits + optional letter
  // (W1, SW7, NW10, EC1A, etc). Anchored by either start-of-string or whitespace/comma.
  // The match must be followed by either end-of-string or a non-letter (to avoid matching
  // partial street words).
  const m = s.match(/(?:^|[\s,])([A-Z]{1,2}\d{1,2}[A-Z]?)(?:\s|,|$)/)
  return m ? m[1] : null
}

/** Exponential time-decay weight. Sale from today = 1.0, from 1 year ago = ~0.5. */
function timeWeight(saleDate: string): number {
  const sale = new Date(saleDate).getTime()
  const now = Date.now()
  const ageMonths = (now - sale) / (1000 * 60 * 60 * 24 * 30.44)
  // half-life of 12 months: weight = 0.5^(months/12)
  return Math.pow(0.5, ageMonths / 12)
}

/** Weighted percentile. Items must be sorted by value ascending. */
function weightedPercentile(items: { value: number; weight: number }[], pct: number): number {
  const totalWeight = items.reduce((s, x) => s + x.weight, 0)
  const target = totalWeight * pct
  let acc = 0
  for (const it of items) {
    acc += it.weight
    if (acc >= target) return it.value
  }
  return items[items.length - 1].value
}

/**
 * Main entry: given a listing, return comparables stats or null if no usable data.
 */
export async function getSoldPriceComparison(
  supabase: SupabaseClient,
  listing: {
    postcode?: string | null
    address?: string | null   // fallback for district extraction when postcode is null
    property_type?: string | null
    price?: number | null
    listing_type?: string | null
  }
): Promise<SoldPriceComparison | null> {
  // Buy listings only — rent comparables would need rental data, not LR
  if (listing.listing_type !== 'buy') return null

  const district = postcodeDistrict(listing.postcode) || postcodeDistrict(listing.address || null)
  if (!district) return null

  const lrType = mapPropertyType(listing.property_type)
  if (!lrType) return null

  // Pull all comparable sold prices for this district + property type, last 12 months
  // (we already filtered to last 12 months at ingestion, so the date filter is redundant
  // but acts as a safety net if rows linger).
  const cutoff = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  const { data, error } = await supabase
    .from('sold_prices')
    .select('price, date_of_transfer')
    .eq('postcode_district', district)
    .eq('property_type', lrType)
    .gte('date_of_transfer', cutoff)
    .eq('ppd_category', 'A')   // exclude repossessions/buy-to-lets

  if (error) {
    console.error('[sold-comparables] query error:', error.message)
    return null
  }
  if (!data || data.length < 3) return null

  // Compute weighted distribution. Apply outlier trimming (top + bottom 5%) before weighting.
  const sorted = data
    .map(r => ({ value: Number(r.price), date: r.date_of_transfer as string }))
    .filter(r => r.value > 0)
    .sort((a, b) => a.value - b.value)

  const trimCount = Math.max(0, Math.floor(sorted.length * 0.05))
  const trimmed = sorted.slice(trimCount, sorted.length - trimCount)
  if (trimmed.length < 3) return null

  // Time-weight after trimming
  const weighted = trimmed.map(r => ({ value: r.value, weight: timeWeight(r.date) }))

  // Sample stats
  const median = weightedPercentile(weighted, 0.5)
  const p25 = weightedPercentile(weighted, 0.25)
  const p75 = weightedPercentile(weighted, 0.75)
  const min = trimmed[0].value
  const max = trimmed[trimmed.length - 1].value

  // Listing's percentile
  let listingPercentile: number | null = null
  let signal: 'below' | 'within' | 'above' | null = null
  if (listing.price && listing.price > 0) {
    const belowOrEqual = trimmed.filter(r => r.value <= listing.price!).length
    listingPercentile = Math.round((belowOrEqual / trimmed.length) * 100)
    if (listing.price < p25) signal = 'below'
    else if (listing.price > p75) signal = 'above'
    else signal = 'within'
  }

  const n = trimmed.length
  const confidence: 'high' | 'medium' | 'low' =
    n >= 30 ? 'high' : n >= 10 ? 'medium' : 'low'

  return {
    sampleSize: n,
    confidence,
    median: Math.round(median),
    p25: Math.round(p25),
    p75: Math.round(p75),
    min: Math.round(min),
    max: Math.round(max),
    listingPercentile,
    signal,
    postcodeDistrict: district,
    propertyTypeLabel: TYPE_LABELS[lrType],
  }
}
