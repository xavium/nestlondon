/**
 * Nearby amenities helpers. Uses Overpass API (OpenStreetMap) for free POI lookups.
 *
 * Data flow:
 *   1. Listing page renders, calls getAmenitiesOrRefresh(supabase, listingId).
 *   2. If cached rows exist and are fresh (<30 days), return them.
 *   3. Otherwise, fetch from Overpass, write rows to listing_amenities, return.
 *
 * Failure mode: if Overpass is unreachable or rate-limits us, we return whatever
 * cached rows we have (even if stale) rather than blocking the page. Never throws.
 *
 * Cache lives in DB. Each row = one POI. We keep top 3 per category by distance,
 * so per-listing storage is ~18 rows max (6 categories × 3).
 */
import type { SupabaseClient } from '@supabase/supabase-js'

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter'
const RADIUS_M = 1000           // 1km for all categories
const TOP_PER_CATEGORY = 3      // keep nearest 3 per category
const STALE_DAYS = 30
const FETCH_TIMEOUT_MS = 15000

export type AmenityCategory = 'cafe' | 'supermarket' | 'restaurant' | 'park' | 'gym' | 'gp'

export interface AmenityRow {
  id?: string
  listing_id: string
  category: AmenityCategory
  name: string
  latitude: number
  longitude: number
  distance_meters: number
  fetched_at?: string
}

export interface CategorisedAmenities {
  cafe: AmenityRow[]
  supermarket: AmenityRow[]
  restaurant: AmenityRow[]
  park: AmenityRow[]
  gym: AmenityRow[]
  gp: AmenityRow[]
}

// Display info per category (label, slug, OSM filter)
export const CATEGORY_META: Record<AmenityCategory, { label: string }> = {
  cafe: { label: 'Cafés' },
  supermarket: { label: 'Supermarkets' },
  restaurant: { label: 'Restaurants' },
  park: { label: 'Parks' },
  gym: { label: 'Gyms' },
  gp: { label: 'GP surgeries' },
}

/** Haversine distance in metres. lat/lng in decimal degrees. */
function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000  // earth radius in metres
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return Math.round(2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)))
}

/** Build the Overpass query string. */
function buildOverpassQuery(lat: number, lng: number, radius: number): string {
  // We union queries for each category. node, way, and relation can all carry
  // these tags (e.g. parks are usually `way`, cafés are usually `node`).
  // `out center` gives a representative lat/lng for non-node geometries (their centroid).
  const around = `(around:${radius},${lat},${lng})`
  return `
[out:json][timeout:25];
(
  nwr["amenity"="cafe"]${around};
  nwr["shop"="supermarket"]${around};
  nwr["amenity"="restaurant"]${around};
  nwr["leisure"="park"]${around};
  nwr["leisure"="fitness_centre"]${around};
  nwr["amenity"="gym"]${around};
  nwr["amenity"="doctors"]${around};
);
out center tags;
`.trim()
}

/** Map an OSM element's tags to one of our categories, or null if none match. */
function categorise(tags: Record<string, string> | undefined): AmenityCategory | null {
  if (!tags) return null
  if (tags.amenity === 'cafe') return 'cafe'
  if (tags.shop === 'supermarket') return 'supermarket'
  if (tags.amenity === 'restaurant') return 'restaurant'
  if (tags.leisure === 'park') return 'park'
  if (tags.leisure === 'fitness_centre' || tags.amenity === 'gym') return 'gym'
  if (tags.amenity === 'doctors') return 'gp'
  return null
}

interface OverpassElement {
  type: 'node' | 'way' | 'relation'
  id: number
  lat?: number
  lon?: number
  center?: { lat: number; lon: number }
  tags?: Record<string, string>
}

/**
 * Fetch from Overpass and parse into AmenityRow shape (without listing_id).
 * Returns top N per category by distance from the centre point.
 *
 * Returns empty array on any failure (network, parse, rate-limit).
 */
async function fetchFromOverpass(
  centreLat: number,
  centreLng: number,
  topN: number = TOP_PER_CATEGORY,
): Promise<Omit<AmenityRow, 'listing_id'>[]> {
  const query = buildOverpassQuery(centreLat, centreLng, RADIUS_M)

  let json: { elements?: OverpassElement[] }
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
    // Overpass requires a User-Agent + Accept header set. Node's fetch handles these
    // conservatively, so we send them explicitly. Body is form-encoded per Overpass docs.
    const formBody = 'data=' + encodeURIComponent(query)
    const res = await fetch(OVERPASS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
        'User-Agent': 'NestLondon/1.0 (https://nestlondon.co.uk; contact: hello@nestlondon.co.uk)',
      },
      body: formBody,
      signal: controller.signal,
    })
    if (!res.ok) {
      const responseText = await res.text().catch(() => '(unreadable)')
      console.error('[amenities] Overpass HTTP', res.status, 'body:', responseText.slice(0, 400))
      return []
    }
    clearTimeout(timeoutId)
    json = await res.json()
  } catch (e: any) {
    console.error('[amenities] Overpass fetch error:', e?.message || e)
    return []
  }

  if (!Array.isArray(json.elements)) return []

  // Bucket elements by category, then trim to topN by distance.
  const byCategory: Record<AmenityCategory, Omit<AmenityRow, 'listing_id'>[]> = {
    cafe: [], supermarket: [], restaurant: [], park: [], gym: [], gp: [],
  }

  for (const el of json.elements) {
    const cat = categorise(el.tags)
    if (!cat) continue
    const lat = el.lat ?? el.center?.lat
    const lng = el.lon ?? el.center?.lon
    if (lat == null || lng == null) continue
    const name = el.tags?.name?.trim()
    if (!name) continue   // unnamed POIs aren't useful to surface

    const distance = haversineMeters(centreLat, centreLng, lat, lng)
    byCategory[cat].push({
      category: cat,
      name,
      latitude: lat,
      longitude: lng,
      distance_meters: distance,
    })
  }

  // Sort each bucket and keep top N
  const result: Omit<AmenityRow, 'listing_id'>[] = []
  for (const cat of Object.keys(byCategory) as AmenityCategory[]) {
    byCategory[cat].sort((a, b) => a.distance_meters - b.distance_meters)
    result.push(...byCategory[cat].slice(0, topN))
  }
  return result
}

/**
 * Read cached amenities for a listing. Returns null if no rows exist;
 * otherwise returns the rows (which may be stale — caller checks `fetched_at`).
 */
async function readCachedAmenities(
  supabase: SupabaseClient,
  listingId: string,
): Promise<AmenityRow[] | null> {
  const { data, error } = await supabase
    .from('listing_amenities')
    .select('*')
    .eq('listing_id', listingId)
    .order('distance_meters', { ascending: true })

  if (error) {
    console.error('[amenities] cache read error:', error.message)
    return null
  }
  return (data && data.length > 0) ? (data as AmenityRow[]) : null
}

/** True if any row was fetched more than STALE_DAYS ago, or rows are empty. */
function isStale(rows: AmenityRow[] | null): boolean {
  if (!rows || rows.length === 0) return true
  const oldest = rows.reduce((min, r) => {
    if (!r.fetched_at) return min
    return r.fetched_at < min ? r.fetched_at : min
  }, rows[0].fetched_at || new Date().toISOString())
  const ageMs = Date.now() - new Date(oldest).getTime()
  return ageMs > STALE_DAYS * 24 * 60 * 60 * 1000
}

/**
 * Refresh amenities for a listing from Overpass. Deletes old rows, inserts new.
 * Uses a service-role client (RLS bypass). Caller must guarantee that.
 *
 * Returns true on success. Returns false on failure (and DB rows are left alone).
 */
export async function refreshAmenitiesForListing(
  supabaseService: SupabaseClient,
  listingId: string,
  lat: number,
  lng: number,
): Promise<boolean> {
  const rows = await fetchFromOverpass(lat, lng)
  if (rows.length === 0) {
    // Don't blow away existing cache on transient failure; leave stale data in place.
    return false
  }

  // Replace strategy: delete then insert. We do this in two steps because
  // Supabase doesn't have an atomic "upsert by listing_id+name". Brief window
  // where a viewer might see zero rows, but acceptable for this UI.
  const { error: delErr } = await supabaseService
    .from('listing_amenities')
    .delete()
    .eq('listing_id', listingId)
  if (delErr) {
    console.error('[amenities] delete error:', delErr.message)
    return false
  }

  const toInsert = rows.map(r => ({ ...r, listing_id: listingId }))
  const { error: insErr } = await supabaseService
    .from('listing_amenities')
    .insert(toInsert)
  if (insErr) {
    console.error('[amenities] insert error:', insErr.message)
    return false
  }
  return true
}

/**
 * Top-level helper for the listing page.
 *
 * - Reads cache.
 * - If empty OR stale, fires a refresh (synchronously).
 * - Returns categorised result. If everything fails, returns empty categories.
 *
 * `supabaseService` is required for writes; `supabaseRead` is used for the initial
 * cached-read (could be the anon client since the table is service-only by default —
 * but the caller will typically pass the service client for both).
 */
export async function getAmenitiesOrRefresh(
  supabaseService: SupabaseClient,
  listingId: string,
  lat: number | null | undefined,
  lng: number | null | undefined,
): Promise<CategorisedAmenities> {
  const empty: CategorisedAmenities = {
    cafe: [], supermarket: [], restaurant: [], park: [], gym: [], gp: [],
  }

  if (lat == null || lng == null) return empty

  const cached = await readCachedAmenities(supabaseService, listingId)

  if (cached && !isStale(cached)) {
    return categoriseRows(cached)
  }

  // Stale or empty — refresh. On failure, return whatever cached data we have (even stale).
  const refreshed = await refreshAmenitiesForListing(supabaseService, listingId, lat, lng)
  if (refreshed) {
    const fresh = await readCachedAmenities(supabaseService, listingId)
    if (fresh) return categoriseRows(fresh)
  }
  // Fallback: stale cached data is better than nothing.
  if (cached) return categoriseRows(cached)
  return empty
}

function categoriseRows(rows: AmenityRow[]): CategorisedAmenities {
  const out: CategorisedAmenities = {
    cafe: [], supermarket: [], restaurant: [], park: [], gym: [], gp: [],
  }
  for (const r of rows) {
    if (r.category in out) {
      out[r.category as AmenityCategory].push(r)
    }
  }
  // Belt-and-braces: ensure each category sorted by distance even if DB read order shifts.
  for (const k of Object.keys(out) as AmenityCategory[]) {
    out[k].sort((a, b) => a.distance_meters - b.distance_meters)
  }
  return out
}

/** Friendly distance formatter for the UI. */
export function formatDistance(meters: number): string {
  if (meters < 1000) return `${meters}m`
  return `${(meters / 1000).toFixed(1)}km`
}

/** Walk time at 5km/h. Returns minutes. */
export function walkMinutes(meters: number): number {
  return Math.round(meters / 1000 / 5 * 60)
}
