// Shared types and helpers for multi-location commute filtering.
// Up to 3 locations per user. Each may override the global travel mode.

export type CommuteMode = 'public' | 'walk' | 'bike'

export interface CommuteLocation {
  id: string
  address: string
  label: string
  timeLimit: number | null   // minutes; null = display only, no filter
  mode?: CommuteMode          // optional override; falls back to global commute_mode
}

export const MAX_COMMUTE_LOCATIONS = 3

// Generate a stable id. crypto.randomUUID is available in node 18+ and modern browsers.
export function newLocationId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return 'loc_' + Math.random().toString(36).slice(2) + Date.now().toString(36)
}

// ---------- URL encoding ----------
// Format: "label|address|timeLimit|mode" per location, comma-separated.
// Each field is individually URI-encoded so commas/pipes inside addresses don't break parsing.
// Empty timeLimit or mode renders as empty string.
// Example: "Work|EC1A%201BB|45|public,Mum%E2%80%99s|N1%202AA|30|"

export function serializeCommuteLocations(locs: CommuteLocation[]): string {
  return locs
    .filter(l => l.address)
    .slice(0, MAX_COMMUTE_LOCATIONS)
    .map(l => [
      encodeURIComponent(l.label || ''),
      encodeURIComponent(l.address),
      l.timeLimit != null ? String(l.timeLimit) : '',
      l.mode || '',
    ].join('|'))
    .join(',')
}

export function parseCommuteLocations(s: string | null | undefined): CommuteLocation[] {
  if (!s) return []
  return s.split(',').slice(0, MAX_COMMUTE_LOCATIONS).map((part): CommuteLocation => {
    const [label, address, timeLimit, mode] = part.split('|')
    const validMode: CommuteMode | undefined =
      mode === 'public' || mode === 'walk' || mode === 'bike' ? mode : undefined
    return {
      id: newLocationId(),
      label: safeDecode(label || ''),
      address: safeDecode(address || ''),
      timeLimit: timeLimit ? parseInt(timeLimit, 10) : null,
      mode: validMode,
    }
  }).filter(l => l.address)
}

function safeDecode(s: string): string {
  try { return decodeURIComponent(s) } catch { return s }
}

// ---------- Validation ----------
// Trim, clamp count, drop blanks. Used before persisting to user_metadata.
export function normalizeCommuteLocations(input: unknown): CommuteLocation[] {
  if (!Array.isArray(input)) return []
  const out: CommuteLocation[] = []
  for (const item of input) {
    if (!item || typeof item !== 'object') continue
    const address = typeof (item as any).address === 'string' ? (item as any).address.trim() : ''
    if (!address) continue
    const label = typeof (item as any).label === 'string' ? (item as any).label.trim().slice(0, 40) : ''
    const tlRaw = (item as any).timeLimit
    const timeLimit = (typeof tlRaw === 'number' && tlRaw > 0 && tlRaw <= 240) ? Math.round(tlRaw) : null
    const modeRaw = (item as any).mode
    const mode = (modeRaw === 'public' || modeRaw === 'walk' || modeRaw === 'bike') ? modeRaw : undefined
    const id = typeof (item as any).id === 'string' && (item as any).id ? (item as any).id : newLocationId()
    out.push({ id, address, label, timeLimit, mode })
    if (out.length >= MAX_COMMUTE_LOCATIONS) break
  }
  return out
}

// ---------- Legacy migration ----------
// If user has the old singular commute_address but no commute_locations yet,
// surface it as a single virtual location so existing users see no regression.
export function migrateLegacyCommute(
  locations: unknown,
  legacyAddress: string | null | undefined,
  legacyMode: string | null | undefined
): CommuteLocation[] {
  const normalized = normalizeCommuteLocations(locations)
  if (normalized.length > 0) return normalized
  if (legacyAddress && legacyAddress.trim()) {
    return [{
      id: newLocationId(),
      label: 'Commute',
      address: legacyAddress.trim(),
      timeLimit: null,
      mode: (legacyMode === 'public' || legacyMode === 'walk' || legacyMode === 'bike') ? legacyMode : undefined,
    }]
  }
  return []
}
