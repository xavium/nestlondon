'use client'

import { useEffect } from 'react'

export default function ListingEventTracker({ listingId }: { listingId: string }) {
  useEffect(() => {
    // Fire view event — debounced to avoid double-firing in dev
    const t = setTimeout(() => {
      fetch('/api/listings/event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listing_id: listingId, event_type: 'view' }),
      }).catch(() => {})
    }, 1500)
    return () => clearTimeout(t)
  }, [listingId])

  return null
}
