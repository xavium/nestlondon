// Inline SVG strings for use in HTML template strings (e.g. Leaflet popups)
// Uses same paths as Lucide icons via the TileIcon component.

const SVG_OPEN = '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:-1px;margin-right:3px;">'
const SVG_CLOSE = '</svg>'

export const ICON_BED_SVG = SVG_OPEN + '<path d="M2 4v16"/><path d="M2 8h18a2 2 0 0 1 2 2v10"/><path d="M2 17h20"/><path d="M6 8v9"/>' + SVG_CLOSE
export const ICON_BATH_SVG = SVG_OPEN + '<path d="M9 6 6.5 3.5a1.5 1.5 0 0 0-1-.5C4.683 3 4 3.683 4 4.5V17a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5"/><line x1="10" x2="8" y1="5" y2="7"/><line x1="2" x2="22" y1="12" y2="12"/><line x1="7" x2="7" y1="19" y2="21"/><line x1="17" x2="17" y1="19" y2="21"/>' + SVG_CLOSE
export const ICON_SIZE_SVG = SVG_OPEN + '<path d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5"/>' + SVG_CLOSE
// Aligned with TileIcon's 'Outside Space' entry — tree-style icon (Lucide-derived),
// not the previous sprout. Keep these two in sync; they appear side-by-side via
// the listing-page tiles and the map popup pill.
export const ICON_OUTSIDE_SVG = SVG_OPEN + '<path d="M10 10v.2A3 3 0 0 1 8.9 16H5a3 3 0 0 1-1-5.8V10a3 3 0 0 1 6 0Z"/><path d="M7 16v6"/><path d="M13 19v3"/><path d="M12 19h8.3a1 1 0 0 0 .7-1.7L18 14h.3a1 1 0 0 0 .7-1.7L16 9h.2a1 1 0 0 0 .8-1.7L13 3l-1.4 1.5"/>' + SVG_CLOSE

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
  if (rd?.size_from_floorplan && rd.size_from_floorplan !== 'none') sources.push(rd.size_from_floorplan)
  if (Array.isArray(listing.key_features)) sources.push(...listing.key_features)
  if (Array.isArray(rd?.key_features)) sources.push(...rd.key_features)
  // Skip description fallback — too unreliable (matches sizes of nearby buildings)

  for (const text of sources) {
    if (!text) continue
    // Prefer sqm match first — usually the native measurement on UK listings
    const sqmM = text.match(/([\d,]+\.?\d*)\s*sq\.?\s*m(?!ft)/i)
    if (sqmM) {
      const v = parseFloat(sqmM[1].replace(',', ''))
      if (v >= 15 && v <= 1000) return Math.round(v).toLocaleString() + ' sq m'
    }
    const sqftM = text.match(/([\d,]+\.?\d*)\s*sq\.?(?:uare)?\s*f(?:ee|oo)?t/i)
    if (sqftM) {
      const v = parseFloat(sqftM[1].replace(',', ''))
      if (v >= 160 && v <= 10750) return Math.round(v / 10.764).toLocaleString() + ' sq m'
    }
  }
  return null
}

// Detect outdoor space from raw_data.photo_tags.features, key_features, description
// Thin wrapper around the shared detector. Returns the joined types as a
// single label when outside space is *confirmed* — never returns "Ask agent"
// or similar placeholder; falsy means "don't render a pill".
// Previously returned 'Garden' for any \bgarden\b match, which over-fired
// on locations like 'Hatton Garden' in the description.
import { detectOutsideSpace } from './outsideSpace'

export function hasOutsideSpace(listing: { raw_data?: any, description?: string | null, key_features?: string[] | null }): string | null {
  const r = detectOutsideSpace(listing)
  return r.kind === 'confirmed' ? r.types.join(', ') : null
}


// Build a small photo-carousel HTML block for use inside Leaflet popups.
// Returns HTML string with placeholder ids; call attachCarousel after popupopen
// to wire up the prev/next click handlers.
export function buildCarouselHtml(images: string[], id: string, height = 120): string {
  if (!images.length) {
    return `<div style="width:100%;height:80px;background:#f5f5f0;border-radius:6px;margin-bottom:8px;"></div>`
  }
  if (images.length === 1) {
    return `<img src="${images[0]}" referrerpolicy="no-referrer" style="width:100%;height:${height}px;object-fit:cover;border-radius:6px;margin-bottom:8px;"/>`
  }
  const ARROW_L = '<svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M7 1L3 5l4 4" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>'
  const ARROW_R = '<svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M3 1l4 4-4 4" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>'
  const dots = images.map((_, i) => `<span data-dot="${i}" style="width:4px;height:4px;border-radius:50%;background:${i === 0 ? 'white' : 'rgba(255,255,255,0.5)'};"></span>`).join('')
  return `
    <div data-carousel="${id}" data-index="0" style="position:relative;width:100%;height:${height}px;border-radius:6px;overflow:hidden;margin-bottom:8px;">
      <img data-carousel-img src="${images[0]}" referrerpolicy="no-referrer" style="width:100%;height:100%;object-fit:cover;"/>
      <button data-carousel-prev style="position:absolute;left:4px;top:50%;transform:translateY(-50%);background:rgba(0,0,0,0.4);border:0;border-radius:50%;width:20px;height:20px;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0;">${ARROW_L}</button>
      <button data-carousel-next style="position:absolute;right:4px;top:50%;transform:translateY(-50%);background:rgba(0,0,0,0.4);border:0;border-radius:50%;width:20px;height:20px;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0;">${ARROW_R}</button>
      <div data-carousel-dots style="position:absolute;bottom:5px;left:50%;transform:translateX(-50%);display:flex;gap:3px;">${dots}</div>
    </div>`
}

// After a popup opens, call this with the popup element + the same image array
// to wire up prev/next behaviour.
export function attachCarousel(popupEl: Element | null, images: string[]) {
  if (!popupEl || images.length < 2) return
  const container = popupEl.querySelector('[data-carousel]') as HTMLElement | null
  if (!container) return
  const img = container.querySelector('[data-carousel-img]') as HTMLImageElement | null
  const prev = container.querySelector('[data-carousel-prev]') as HTMLButtonElement | null
  const next = container.querySelector('[data-carousel-next]') as HTMLButtonElement | null
  const dotEls = Array.from(container.querySelectorAll('[data-dot]')) as HTMLElement[]
  if (!img || !prev || !next) return

  function update(i: number) {
    container!.setAttribute('data-index', String(i))
    img!.src = images[i]
    dotEls.forEach((d, j) => { d.style.background = j === i ? 'white' : 'rgba(255,255,255,0.5)' })
  }

  prev.addEventListener('click', (e) => {
    e.preventDefault()
    e.stopPropagation()
    const i = parseInt(container.getAttribute('data-index') || '0', 10)
    update((i - 1 + images.length) % images.length)
  })
  next.addEventListener('click', (e) => {
    e.preventDefault()
    e.stopPropagation()
    const i = parseInt(container.getAttribute('data-index') || '0', 10)
    update((i + 1) % images.length)
  })
}
