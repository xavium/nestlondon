'use client'

import { useEffect } from 'react'
import { markAsViewed } from '@/lib/viewed'

export default function MarkViewed({ id }: { id: string }) {
  useEffect(() => {
    markAsViewed(id)
    // Also log server-side for owner analytics
    fetch('/api/listings/event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ listing_id: id, event_type: 'view' })
    }).catch(() => {})
  }, [id])
  return null
}
