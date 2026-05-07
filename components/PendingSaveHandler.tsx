'use client'

import { useEffect } from 'react'

export default function PendingSaveHandler() {
  useEffect(() => {
    if (typeof window === 'undefined') return
    const pendingId = window.localStorage.getItem('pendingSaveListingId')
    if (!pendingId) return

    // Verify user is logged in by hitting an authed endpoint
    fetch('/api/saved/property', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ listing_id: pendingId }),
    }).then(r => {
      if (r.ok || r.status === 200) {
        window.localStorage.removeItem('pendingSaveListingId')
      }
      // If 401, user isn't logged in yet — keep the intent for next try
    }).catch(() => {})
  }, [])

  return null
}
