// Inline SVG strings for use in HTML template strings (e.g. Leaflet popups)
// Uses same paths as Lucide icons via the TileIcon component.

const SVG_OPEN = '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:-1px;margin-right:3px;">'
const SVG_CLOSE = '</svg>'

export const ICON_BED_SVG = SVG_OPEN + '<path d="M2 4v16"/><path d="M2 8h18a2 2 0 0 1 2 2v10"/><path d="M2 17h20"/><path d="M6 8v9"/>' + SVG_CLOSE
export const ICON_BATH_SVG = SVG_OPEN + '<path d="M9 6 6.5 3.5a1.5 1.5 0 0 0-1-.5C4.683 3 4 3.683 4 4.5V17a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5"/><line x1="10" x2="8" y1="5" y2="7"/><line x1="2" x2="22" y1="12" y2="12"/><line x1="7" x2="7" y1="19" y2="21"/><line x1="17" x2="17" y1="19" y2="21"/>' + SVG_CLOSE
export const ICON_SIZE_SVG = SVG_OPEN + '<path d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5"/>' + SVG_CLOSE
export const ICON_OUTSIDE_SVG = SVG_OPEN + '<path d="M12 22V12m0 0C12 7 7 4 7 4s1 5 5 8m0-8c0-5 5-8 5-8s-1 5-5 8"/>' + SVG_CLOSE

const ICON_BUILDING2_SVG = SVG_OPEN + '<path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/><path d="M10 6h4"/><path d="M10 10h4"/><path d="M10 14h4"/><path d="M10 18h4"/>' + SVG_CLOSE
const ICON_HOUSE_SVG = SVG_OPEN + '<path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>' + SVG_CLOSE
const ICON_HOME_SVG = SVG_OPEN + '<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>' + SVG_CLOSE
const ICON_HOTEL_SVG = SVG_OPEN + '<path d="M10 22v-6.57"/><path d="M12 11h.01"/><path d="M12 7h.01"/><path d="M14 15.43V22"/><path d="M15 16a5 5 0 0 0-6 0"/><path d="M16 11h.01"/><path d="M16 7h.01"/><path d="M8 11h.01"/><path d="M8 7h.01"/><rect x="4" y="2" width="16" height="20" rx="2"/>' + SVG_CLOSE
const ICON_LANDPLOT_SVG = SVG_OPEN + '<path d="m12 8 6-3-6-3v10"/><path d="m8 11.99-5.5 3.14a1 1 0 0 0 0 1.74l8.5 4.86a2 2 0 0 0 2 0l8.5-4.86a1 1 0 0 0 0-1.74L16 12"/><path d="m6.49 12.85 11.02 6.3"/><path d="M17.51 12.85 6.5 19.15"/>' + SVG_CLOSE

export function propertyTypeIconSvg(label: string | null | undefined): string {
  if (!label) return ICON_HOUSE_SVG
  const s = label.toLowerCase()
  if (/flat|apartment|penthouse|studio|maisonette|block of/.test(s)) return ICON_BUILDING2_SVG
  if (/semi.?detached|terrac|end of terrace|mews/.test(s)) return ICON_HOTEL_SVG
  if (/^detached|detached bungalow|link detached/.test(s)) return ICON_HOME_SVG
  if (/^plot$/.test(s)) return ICON_LANDPLOT_SVG
  return ICON_HOUSE_SVG
}

export function normalisePropertyTypeLabel(label: string | null | undefined): string {
  if (!label) return ''
  if (label.toLowerCase() === 'apartment') return 'Flat'
  return label
}

// Extract sqft from raw_data.size_text or description (matches the listing page logic, with sanity range 15-1000 sqm)
export function extractSqftFromListing(listing: { raw_data?: any, description?: string | null, key_features?: string[] | null }): string | null {
  const sources: string[] = []
  const rd = typeof listing.raw_data === 'string' ? (() => { try { return JSON.parse(listing.raw_data) } catch { return {} } })() : (listing.raw_data || {})
  if (rd?.size_text) sources.push(rd.size_text)
  if (Array.isArray(listing.key_features)) sources.push(...listing.key_features)
  if (Array.isArray(rd?.key_features)) sources.push(...rd.key_features)
  // Skip description fallback — too unreliable (matches sizes of nearby buildings)

  for (const text of sources) {
    if (!text) continue
    const sqftM = text.match(/([\d,]+\.?\d*)\s*sq\.?(?:uare)?\s*f(?:ee|oo)?t/i)
    if (sqftM) {
      const v = parseFloat(sqftM[1].replace(',', ''))
      if (v >= 160 && v <= 10750) return Math.round(v).toLocaleString() + ' sq ft'
    }
    const sqmM = text.match(/([\d,]+\.?\d*)\s*sq\.?\s*m(?!ft)/i)
    if (sqmM) {
      const v = parseFloat(sqmM[1].replace(',', ''))
      if (v >= 15 && v <= 1000) return Math.round(v * 10.764).toLocaleString() + ' sq ft'
    }
  }
  return null
}

// Detect outdoor space from raw_data.photo_tags.features, key_features, description
export function hasOutsideSpace(listing: { raw_data?: any, description?: string | null, key_features?: string[] | null }): string | null {
  const rd = typeof listing.raw_data === 'string' ? (() => { try { return JSON.parse(listing.raw_data) } catch { return {} } })() : (listing.raw_data || {})
  const haystack: string[] = []
  if (Array.isArray(rd?.photo_tags?.features)) haystack.push(...rd.photo_tags.features)
  if (Array.isArray(listing.key_features)) haystack.push(...listing.key_features)
  if (Array.isArray(rd?.key_features)) haystack.push(...rd.key_features)
  // Description is OK here — false positives ('garden flat' implies garden) are still positives
  if (listing.description) haystack.push(listing.description)

  const text = haystack.join(' ').toLowerCase()
  if (/private garden|own garden|rear garden|south.facing garden|landscaped garden/.test(text)) return 'Garden'
  if (/\bgarden\b/.test(text)) return 'Garden'
  if (/\bterrace\b/.test(text) && !/terraced house|end of terrace/.test(text)) return 'Terrace'
  if (/\bbalcony\b/.test(text)) return 'Balcony'
  if (/\bpatio\b/.test(text)) return 'Patio'
  if (/\broof terrace\b|\broof garden\b/.test(text)) return 'Roof terrace'
  return null
}
