// Single source of truth for "does this listing have outside space?".
// Used by three surfaces: the listing page detail tile, the map popup pill,
// and the search-card tags. Each surface formats the result differently —
// this module just classifies the listing.
//
// Rule (per product spec): a listing is only marked as having outside space
// when the signal is *confirmed* — i.e. structured (key_features / photo_tags)
// OR an explicitly qualified mention in the description ("private garden",
// "south-facing garden", etc). A bare \bgarden\b in a description is too
// noisy — it catches location names ("Hatton Garden") and marketing prose.

export type OutsideSpace =
  | { kind: 'none' }                       // explicitly "no garden" mentioned
  | { kind: 'unknown' }                     // no signal either way — don't display
  | { kind: 'confirmed'; types: string[] } // ['Balcony', 'Garden'] etc, deduped

type DetectInput = {
  raw_data?: any
  description?: string | null
  key_features?: string[] | null
}

// Qualifiers that, when paired with "garden(s)" in a description, give us
// confidence the listing actually has one (rather than naming a location or
// describing the neighbourhood).
const QUALIFIED_GARDEN_RE = /\b(?:private|own|rear|south.facing|north.facing|east.facing|west.facing|landscaped|communal|shared|exclusive|enclosed)\s+gardens?\b/

// Negative signals — explicit denials override everything else.
const NEGATIVE_RE = /\bno\s+(?:private\s+)?garden\b|\bwithout\s+(?:a\s+)?garden\b/

export function detectOutsideSpace(listing: DetectInput): OutsideSpace {
  const rd = typeof listing.raw_data === 'string'
    ? (() => { try { return JSON.parse(listing.raw_data) } catch { return {} } })()
    : (listing.raw_data || {})

  // Structured sources — high confidence. Free-form description — low confidence.
  const structuredText = [
    ...(Array.isArray(rd?.photo_tags?.features) ? rd.photo_tags.features : []),
    ...(Array.isArray(listing.key_features) ? listing.key_features : []),
    ...(Array.isArray(rd?.key_features) ? rd.key_features : []),
  ].join(' ').toLowerCase()

  const descText = (listing.description || '').toLowerCase()
  const allText = structuredText + ' ' + descText

  // Negative signals take priority.
  if (NEGATIVE_RE.test(allText)) return { kind: 'none' }

  const types = new Set<string>()

  // Garden: structured mention OR qualified description mention. Bare 'garden'
  // in a description alone is not enough (catches 'Hatton Garden' etc).
  if (/\bgardens?\b/.test(structuredText) || QUALIFIED_GARDEN_RE.test(descText)) {
    types.add('Garden')
  }

  // Balcony: any source.
  if (/\bbalcon(?:y|ies)\b/.test(allText)) types.add('Balcony')

  // Terrace: must not be the property type ('terraced house', 'end of terrace').
  if (/\bterrace\b/.test(allText) && !/terraced|end of terrace/.test(allText)) {
    types.add('Terrace')
  }

  // Patio: any source.
  if (/\bpatio\b/.test(allText)) types.add('Patio')

  // Roof terrace / roof garden — usually mentioned explicitly, treat as separate type.
  if (/\broof\s+(?:terrace|garden)\b/.test(allText)) types.add('Roof terrace')

  if (types.size === 0) return { kind: 'unknown' }
  return { kind: 'confirmed', types: Array.from(types) }
}
