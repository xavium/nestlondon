/**
 * Estimate a property's market value from comparable listings.
 * Returns null if we have fewer than 5 meaningful comparables — we'd rather
 * say nothing than give misleading numbers.
 */

export interface PropertySpec {
  listing_type: 'rent' | 'buy'
  bedrooms: number | null
  square_feet: number | null
  property_type?: string | null
  borough?: string | null
  postcode?: string | null
  epc_rating?: string | null
  features?: string[]   // e.g. ['Garden', 'Parking', 'Lift']
  tenure?: string | null // 'Freehold' | 'Leasehold' etc.
  new_build?: boolean
}

export interface Comparable {
  id: string
  listing_type?: string | null
  price: number
  bedrooms: number | null
  square_feet: number | null
  property_type?: string | null
  borough?: string | null
  postcode?: string | null
  epc_rating?: string | null
  raw_data?: any
}

export interface ValuationResult {
  low: number
  mid: number
  high: number
  basis_psqm: number          // median £/sqm before adjustments
  adjusted_psqm: number       // after feature adjustments
  n_comparables: number
  adjustments: { label: string; pct: number }[]
  area_label: string          // e.g. 'E14' or 'Hackney'
}

const EPC_ADJUST: Record<string, number> = {
  A: 0.03, B: 0.01, C: 0, D: -0.01, E: -0.03, F: -0.05, G: -0.07
}

function median(nums: number[]): number {
  const sorted = [...nums].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]
}

/**
 * Filter a comparable pool to the best matches for `target`.
 * Starts strict (same borough, same beds, same property_type) and relaxes
 * step-by-step until we have at least 5 or we've exhausted the pool.
 */
export function selectComparables(target: PropertySpec, pool: Comparable[]): { comps: Comparable[], area_label: string } {
  // Always filter to same listing_type and properties with usable size + price
  const base = pool.filter(c =>
    c.listing_type === target.listing_type &&
    c.square_feet && c.square_feet > 0 &&
    c.price && c.price > 0
  )

  const postcodeDistrict = target.postcode?.split(' ')[0]?.toUpperCase() || null

  // Strategy: try borough+type+exact-beds, then borough+type+beds±1,
  // then borough+type, then postcode-district+type, then postcode-district
  const tiers: Array<{ filter: (c: Comparable) => boolean, label: string }> = []

  if (target.borough) {
    if (target.property_type && target.bedrooms != null) {
      tiers.push({
        filter: c => c.borough === target.borough && c.property_type === target.property_type && c.bedrooms === target.bedrooms,
        label: target.borough
      })
      tiers.push({
        filter: c => c.borough === target.borough && c.property_type === target.property_type && Math.abs((c.bedrooms ?? 0) - (target.bedrooms ?? 0)) <= 1,
        label: target.borough
      })
    }
    tiers.push({
      filter: c => c.borough === target.borough,
      label: target.borough
    })
  }

  if (postcodeDistrict) {
    if (target.property_type) {
      tiers.push({
        filter: c => c.postcode?.toUpperCase().startsWith(postcodeDistrict) === true && c.property_type === target.property_type,
        label: postcodeDistrict
      })
    }
    tiers.push({
      filter: c => c.postcode?.toUpperCase().startsWith(postcodeDistrict) === true,
      label: postcodeDistrict
    })
  }

  for (const tier of tiers) {
    const matches = base.filter(tier.filter)
    if (matches.length >= 5) return { comps: matches, area_label: tier.label }
  }

  // No tier reached 5 — return the best we have (still might be <5)
  for (const tier of tiers) {
    const matches = base.filter(tier.filter)
    if (matches.length > 0) return { comps: matches, area_label: tier.label }
  }
  return { comps: [], area_label: target.borough || postcodeDistrict || 'London' }
}

export function valuate(target: PropertySpec, pool: Comparable[]): ValuationResult | null {
  if (!target.square_feet || !target.bedrooms == null) return null
  if (!target.square_feet) return null

  const { comps, area_label } = selectComparables(target, pool)
  if (comps.length < 5) return null

  // Base £/sqm — median is more robust to outliers than mean
  const psqms = comps.map(c => c.price / (c.square_feet! * 0.0929))
  const basis_psqm = median(psqms)

  // Apply multiplicative adjustments for known feature premiums
  const adjustments: { label: string; pct: number }[] = []
  let multiplier = 1

  if (target.epc_rating && EPC_ADJUST[target.epc_rating.toUpperCase()] !== undefined) {
    const pct = EPC_ADJUST[target.epc_rating.toUpperCase()]
    if (pct !== 0) {
      multiplier *= (1 + pct)
      adjustments.push({ label: `EPC ${target.epc_rating.toUpperCase()}`, pct: Math.round(pct * 100) })
    }
  }

  if (target.new_build) {
    multiplier *= 1.08
    adjustments.push({ label: 'New build', pct: 8 })
  }

  if (target.tenure?.toLowerCase().includes('freehold') && target.listing_type === 'buy') {
    multiplier *= 1.05
    adjustments.push({ label: 'Freehold', pct: 5 })
  }

  if (target.features?.includes('Garden')) {
    multiplier *= 1.03
    adjustments.push({ label: 'Garden', pct: 3 })
  }
  if (target.features?.includes('Parking')) {
    multiplier *= 1.03
    adjustments.push({ label: 'Parking', pct: 3 })
  }
  if (target.features?.includes('Lift')) {
    multiplier *= 1.02
    adjustments.push({ label: 'Lift', pct: 2 })
  }

  const adjusted_psqm = basis_psqm * multiplier
  const sqm = target.square_feet * 0.0929
  const mid = Math.round(adjusted_psqm * sqm)

  // ±8% range on the point estimate
  const low = Math.round(mid * 0.92)
  const high = Math.round(mid * 1.08)

  return {
    low, mid, high,
    basis_psqm: Math.round(basis_psqm * 100) / 100,
    adjusted_psqm: Math.round(adjusted_psqm * 100) / 100,
    n_comparables: comps.length,
    adjustments,
    area_label,
  }
}
