/**
 * Price-per-square-foot comparables. Uses ACTIVE LISTINGS (not sold prices —
 * Land Registry has no size data), comparing the target listing's £/sqft to
 * other live asking prices in the same postcode district + property type.
 *
 * This is a different signal from the sold-price percentile rank:
 *   - Percentile rank says: "Is this listing priced above/below recent SOLD prices?"
 *   - £/sqft says: "Is the seller pricing per-square-foot in line with COMPETITORS?"
 *
 * Both are useful and complementary.
 */
import type { SupabaseClient } from '@supabase/supabase-js'

export interface PricePerSqftComparison {
  // The target listing's own £/sqft
  listingPricePerSqft: number
  // Market median across comparables
  medianPricePerSqft: number
  // Quartiles for context
  p25: number
  p75: number
  // Lowest and highest £/sqft in the area (for the visual gauge — show range)
  minPricePerSqft: number
  maxPricePerSqft: number
  // Sample size of comparable listings with size data
  sampleSize: number
  confidence: 'high' | 'medium' | 'low'
  // Where the target sits in the distribution (1-100)
  percentile: number
  // 'above' | 'within' | 'below' the local IQR
  signal: 'above' | 'within' | 'below'
  postcodeDistrict: string
  propertyTypeLabel: string
  // For display: "X% above" / "X% below" / "in line with" the market median
  deltaPercent: number  // signed: positive = listing more expensive per-sqft
}

const TYPE_LABELS: Record<string, string> = {
  flat: 'flats',
  house: 'houses',
}

function broadType(t: string | null | undefined): 'flat' | 'house' | null {
  const s = (t || '').toLowerCase()
  if (/flat|apartment|maisonette|studio/.test(s)) return 'flat'
  if (/house|detached|terrace|semi|bungalow|cottage|mews/.test(s)) return 'house'
  return null
}

function extractDistrict(input: string | null | undefined): string | null {
  if (!input) return null
  const s = input.trim().toUpperCase()
  const m = s.match(/(?:^|[\s,])([A-Z]{1,2}\d{1,2}[A-Z]?)(?:\s|,|$)/)
  return m ? m[1] : null
}

/** Extract square footage from raw_data.size_text. Handles "1,206 sq ft" and "112 sq m". */
function extractSqft(rawData: any): number | null {
  if (!rawData) return null
  const rd = typeof rawData === 'string' ? JSON.parse(rawData) : rawData
  const sizeText = (rd.size_text || '').toString()
  if (!sizeText) return null

  // Try sq ft first
  const ftMatch = sizeText.match(/([\d,]+(?:\.\d+)?)\s*sq\s*ft/i)
  if (ftMatch) return Math.round(parseFloat(ftMatch[1].replace(/,/g, '')))

  // Fall back to sq m, convert
  const smMatch = sizeText.match(/([\d,]+(?:\.\d+)?)\s*sq\s*m/i)
  if (smMatch) {
    const sqm = parseFloat(smMatch[1].replace(/,/g, ''))
    return Math.round(sqm * 10.7639)
  }
  return null
}

function median(values: number[]): number {
  if (!values.length) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

function percentile(values: number[], pct: number): number {
  if (!values.length) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const idx = Math.floor(sorted.length * pct)
  return sorted[Math.min(idx, sorted.length - 1)]
}

export async function getPricePerSqftComparison(
  supabase: SupabaseClient,
  listing: {
    id?: string
    postcode?: string | null
    address?: string | null
    property_type?: string | null
    price?: number | null
    listing_type?: string | null
    raw_data?: any
  }
): Promise<PricePerSqftComparison | null> {
  if (listing.listing_type !== 'buy') return null
  if (!listing.price || listing.price <= 0) return null

  // Extract target's £/sqft
  const targetSqft = extractSqft(listing.raw_data)
  if (!targetSqft) return null

  const targetPpsft = listing.price / targetSqft

  // Resolve district and broad type
  const district = extractDistrict(listing.postcode) || extractDistrict(listing.address || null)
  if (!district) return null

  const ptype = broadType(listing.property_type)
  if (!ptype) return null

  // Pull all active buy listings matching district + property type. We use ilike
  // because postcode might be in either the postcode field OR the address.
  // Same district = active in this market right now.
  // Different property type families = excluded (flat vs house = different markets).
  const { data, error } = await supabase
    .from('listings')
    .select('id, postcode, address, property_type, price, raw_data')
    .eq('listing_type', 'buy')
    .eq('is_active', true)
    .is('canonical_listing_id', null)
    .neq('id', listing.id || '')

  if (error || !data) return null

  // Filter and compute £/sqft for each
  const comps: number[] = []
  for (const c of data) {
    const cDistrict = extractDistrict(c.postcode) || extractDistrict(c.address || null)
    if (cDistrict !== district) continue
    if (broadType(c.property_type) !== ptype) continue
    if (!c.price || c.price <= 0) continue
    const cSqft = extractSqft(c.raw_data)
    if (!cSqft) continue
    const cPpsft = c.price / cSqft
    // Sanity: drop obviously bogus £/sqft values (data quality)
    if (cPpsft < 100 || cPpsft > 10000) continue
    comps.push(cPpsft)
  }

  if (comps.length < 3) return null   // not enough data, return null

  // Compute stats
  const med = median(comps)
  const p25 = percentile(comps, 0.25)
  const p75 = percentile(comps, 0.75)

  // Target percentile within distribution
  const belowOrEqual = comps.filter(v => v <= targetPpsft).length
  const targetPercentile = Math.round((belowOrEqual / comps.length) * 100)

  let signal: 'above' | 'within' | 'below'
  if (targetPpsft < p25) signal = 'below'
  else if (targetPpsft > p75) signal = 'above'
  else signal = 'within'

  const n = comps.length
  const confidence: 'high' | 'medium' | 'low' =
    n >= 20 ? 'high' : n >= 7 ? 'medium' : 'low'

  const deltaPercent = ((targetPpsft - med) / med) * 100

  const minVal = Math.min(...comps)
  const maxVal = Math.max(...comps)

  return {
    listingPricePerSqft: Math.round(targetPpsft),
    medianPricePerSqft: Math.round(med),
    p25: Math.round(p25),
    p75: Math.round(p75),
    minPricePerSqft: Math.round(minVal),
    maxPricePerSqft: Math.round(maxVal),
    sampleSize: n,
    confidence,
    percentile: targetPercentile,
    signal,
    postcodeDistrict: district,
    propertyTypeLabel: TYPE_LABELS[ptype],
    deltaPercent: Math.round(deltaPercent),
  }
}
