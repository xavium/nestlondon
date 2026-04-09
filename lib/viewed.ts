const STORAGE_KEY = 'nestlondon_viewed'

export function getViewedListings(): Set<string> {
  if (typeof window === 'undefined') return new Set()
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return new Set(stored ? JSON.parse(stored) : [])
  } catch {
    return new Set()
  }
}

export function markAsViewed(id: string) {
  if (typeof window === 'undefined') return
  try {
    const viewed = getViewedListings()
    viewed.add(id)
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...viewed]))
  } catch {}
}

export function isViewed(id: string): boolean {
  return getViewedListings().has(id)
}
